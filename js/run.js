/* js/run.js — Run-Struktur: Karte, Knoten, Belohnungen, Shop, Prädator,
   Rangaufstieg, Speicherstand, Meta-Freischaltungen.
   Kein DOM — dev/balance.js spielt damit komplette Runs headless durch.

   Ablauf:  phase 'karte' -> choose(i) -> 'kampf'|'shop'|'event'|'lager'
            -> Aktion -> advance() -> wieder 'karte'

   Zwei Regeln bestimmen den Trupp:
     · Pro Art (Goblin, Oger, …) darf nur EINE Einheit dabei sein.
     · Rang C->B->A->S gibt Item-Slots, aktive und passive Fähigkeiten.        */
'use strict';
(function (root) {
  var GD = root.GameData, EN = root.Enemies, C = root.Combat, AB = root.Abilities;

  var STEPS = [                                   // Knotenangebot je Schritt eines Akts
    ['kampf', 'kampf'],
    ['kampf', 'event'],
    ['shop', 'event'],
    ['kampf', 'elite'],
    ['lager', 'event'],
    ['kampf', 'shop'],
    ['elite', 'kampf'],
    ['boss']
  ];
  var TEAM_MAX = 6, BANK_MAX = 3;

  /* Rang C=0, B=1, A=2, S=3 */
  var RANK_NAME = ['C', 'B', 'A', 'S'];
  var RANK_COST = [140, 300, 560];                // C->B, B->A, A->S
  var ITEM_SLOTS = [1, 2, 3, 5];                  // S gibt zwei statt einem
  var AKTIV_SLOTS = [1, 2, 3, 4];                 // Slot 1 ist immer die Signatur
  var PASSIV_SLOTS = [0, 1, 2, 3];                // schalten automatisch frei
  var PRAEDATOR_SLOTS = [0, 1, 2, 3];             // verschlungene Gegnerfähigkeiten

  var START_UNITS = ['gobta', 'gobkyu', 'sturmwolf', 'riesenameise', 'skelettritter',
    'rigurd', 'rigur', 'gobwa', 'kurobe', 'schattenwolf', 'souka', 'kaefergarde',
    'giftfalter', 'daemonengarde', 'gruftwaechter', 'drachenknecht', 'quellenpriesterin',
    'ranga', 'shion', 'gabiru', 'wightkoenig'];
  var START_RELICS = ['kern_des_zorns', 'schuppenpanzer', 'lebensquell', 'windschuhe',
    'giftdorn', 'blutkelch', 'rachegeist_relikt', 'erstschlag_relikt', 'turmschild',
    'magiestein', 'heilsegen', 'barriere_stein', 'dornenhaut_relikt', 'schwerer_stand'];

  /* ---- Meta (überlebt den Tod) ------------------------------------------- */

  function newMeta() {
    return { unlockedUnits: START_UNITS.slice(), unlockedRelics: START_RELICS.slice(), runs: 0, wins: 0, best: 0 };
  }

  function unlock(meta, rng) {
    var out = [];
    var lockedU = GD.units.filter(function (u) { return !u.hero && meta.unlockedUnits.indexOf(u.id) < 0; });
    var lockedR = GD.relics.filter(function (r) { return meta.unlockedRelics.indexOf(r.id) < 0; });
    if (lockedU.length) { var u = root.RNG.pick(rng, lockedU); meta.unlockedUnits.push(u.id); out.push(u.name); }
    if (lockedR.length) { var r = root.RNG.pick(rng, lockedR); meta.unlockedRelics.push(r.id); out.push(r.name); }
    return out;
  }

  /* ---- Mitglieder: Rohdaten -> Kampfeinheit ------------------------------ */

  var uidSeq = 0;
  function addStats(d, s) {
    ['hp', 'atk', 'def', 'spd'].forEach(function (k) { if (s[k]) d[k] += s[k]; });
    if (d.hp < 1) d.hp = 1;
  }
  function member(id) {
    return { uid: 'm' + (++uidSeq), id: id, rank: 0, items: [], actives: [], devoured: [] };
  }

  function itemSlots(m) { return ITEM_SLOTS[m.rank]; }
  function aktivSlots(m) { return AKTIV_SLOTS[m.rank]; }
  function passivSlots(m) { return PASSIV_SLOTS[m.rank]; }
  function praedatorSlots(m) { return PRAEDATOR_SLOTS[m.rank]; }
  function rankName(m) { return RANK_NAME[m.rank]; }
  function rankCost(m) { return m.rank < 3 ? RANK_COST[m.rank] : 0; }

  /* Baut aus dem Mitglied die Kampfdefinition: Werte, aktive und passive
     Fähigkeiten, Ausrüstung, verschlungene Gegnerfähigkeiten. */
  function resolve(m) {
    var base = GD.unit(m.id);
    var r = m.rank;
    var d = {
      id: base.id, name: base.name, tags: base.tags.slice(), rank: r,
      hp: Math.round(base.hp * (1 + 0.3 * r)), atk: Math.round(base.atk * (1 + 0.3 * r)),
      def: base.def + r, spd: base.spd + r,
      actives: [], effects: [], keywords: []
    };

    /* Aktive: Signatur zuerst, dann die beim Aufstieg gewählten. */
    var aktiv = [base.signature].concat(m.actives).slice(0, AKTIV_SLOTS[r]);
    aktiv.forEach(function (id) {
      var a = AB.get(id);
      if (a) { d.actives.push(a); d.keywords = d.keywords.concat(a.keywords || []); }
    });

    /* Passive: die ersten N der eigenen Liste, N = Rang. */
    base.passives.slice(0, PASSIV_SLOTS[r]).forEach(function (id) {
      var p = AB.get(id);
      if (p) {
        d.effects.push(p);
        d.keywords = d.keywords.concat(p.keywords || [], p.amplifies || []);
      }
    });

    m.items.forEach(function (iid) {
      var it = GD.item(iid);
      if (!it) return;
      addStats(d, it.stats || {});
      (it.effects || []).forEach(function (e) { d.effects.push(e); });
      d.keywords = d.keywords.concat(it.keywords || []);
    });

    m.devoured.slice(0, PRAEDATOR_SLOTS[r]).forEach(function (eid) {
      var e = EN.get(eid);
      (e && e.effects || []).forEach(function (ef) {
        d.effects.push(ef);
        d.keywords = d.keywords.concat(ef.keywords || []);
      });
    });

    if (m.bonus) addStats(d, m.bonus);         // dauerhafte Ereignis-Boni
    return d;
  }

  /* Welche Fähigkeiten hat das Mitglied gerade wirklich? (für die Anzeige) */
  function abilities(m) {
    var base = GD.unit(m.id);
    var out = [];
    [base.signature].concat(m.actives).slice(0, AKTIV_SLOTS[m.rank]).forEach(function (id) {
      var a = AB.get(id); if (a) out.push(a);
    });
    base.passives.slice(0, PASSIV_SLOTS[m.rank]).forEach(function (id) {
      var p = AB.get(id); if (p) out.push(p);
    });
    m.devoured.slice(0, PRAEDATOR_SLOTS[m.rank]).forEach(function (eid) {
      var e = EN.get(eid);
      (e && e.effects || []).forEach(function (ef) { out.push(ef); });
    });
    return out;
  }

  /* Alles, was Schlüsselwörter zum Build beisteuert: Fähigkeiten, Ausrüstung
     und Relikte. Eine Quelle für UI und Balance-Auswertung. */
  function buildTeile(run) {
    var out = [];
    run.team.forEach(function (m) {
      out = out.concat(abilities(m));
      m.items.forEach(function (iid) {
        var it = GD.item(iid);
        if (it && ((it.keywords || []).length || (it.amplifies || []).length)) out.push(it);
      });
    });
    run.relics.forEach(function (rid) {
      var r = GD.relic(rid);
      if (r && ((r.keywords || []).length || (r.amplifies || []).length)) out.push(r);
    });
    return out;
  }

  /* ---- Run anlegen ------------------------------------------------------- */

  function create(seed, meta) {
    meta = meta || newMeta();
    var run = {
      seed: seed >>> 0, rngState: seed >>> 0, meta: meta,
      act: 1, step: 0, phase: 'karte', over: false, won: false,
      gold: 60, magicules: 0, lives: 3,
      team: [member('rimuru')], bank: [], relics: [],
      options: null, node: null, pending: null, wahl: null, chronik: []
    };
    /* Rimuru allein gegen drei verliert immer — zwei Begleiter kommen dazu,
       aber der Spieler wählt sie: zweimal eine aus drei. */
    run.phase = 'start';
    startAngebot(run, 2);
    return run;
  }

  /* Draft am Anfang: drei Einheiten zur Wahl, Arten ohne Dopplung. */
  function startAngebot(run, verbleibend) {
    var rng = rngOf(run);
    var pool = unitPool(run).filter(function (u) { return u.cost <= 3; });
    run.startwahl = {
      verbleibend: verbleibend,
      offers: waehle(rng, pool, 1, 3).map(function (u) { return u.id; })
    };
    commit(run, rng);
  }

  function chooseStart(run, i) {
    if (!run.startwahl) return false;
    var id = run.startwahl.offers[i];
    if (!id || !addUnit(run, id)) return false;
    var rest = run.startwahl.verbleibend - 1;
    run.startwahl = null;
    if (rest > 0) { startAngebot(run, rest); return true; }
    run.phase = 'karte';
    roll(run);
    return true;
  }

  function rngOf(run) {
    var f = root.RNG(run.seed);
    f.state(run.rngState);
    return f;
  }
  function commit(run, rng) { run.rngState = rng.state(); }

  /* ---- Rarität: steuert, was überhaupt angeboten wird ---------------------
     Seltenes ist von Anfang an möglich, wird aber erst in den späteren Akten
     wahrscheinlich. Ohne diese Verschiebung wäre die Stufe nur eine Farbe.    */

  function gewicht(x, akt) {
    var r = x.rarity || 1;
    return AB.RARITAET_GEWICHT[r] * Math.pow(1 + 0.3 * ((akt || 1) - 1), r - 1);
  }
  function waehle(rng, liste, akt, n) {
    var pool = liste.slice(), out = [];
    while (out.length < n && pool.length) {
      var summe = 0;
      pool.forEach(function (x) { summe += gewicht(x, akt); });
      var wurf = rng() * summe, i = 0;
      while (i < pool.length - 1 && (wurf -= gewicht(pool[i], akt)) > 0) i++;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  /* Zwei von drei Angeboten bleiben im Thema des Trupps. Ohne diese Neigung
     kommt ein Build rechnerisch fast nie zustande — gemessen mit dev/balance.js. */
  function themenWahl(run, rng, pool, akt, n) {
    if (rng() < 0.35) return waehle(rng, pool, akt, n);
    var kw = {};
    buildTeile(run).forEach(function (t) {
      (t.keywords || []).concat(t.amplifies || []).forEach(function (k) { kw[k] = 1; });
    });
    var passend = pool.filter(function (x) {
      var eigene = (x.keywords || []).concat(x.amplifies || []);
      if (x.signature) {                       // Einheiten über ihre Fähigkeiten prüfen
        var sig = AB.get(x.signature);
        eigene = eigene.concat(sig ? sig.keywords : []);
        (x.passives || []).forEach(function (pid) {
          var ab = AB.get(pid);
          if (ab) eigene = eigene.concat(ab.keywords || [], ab.amplifies || []);
        });
      }
      return eigene.some(function (k) { return kw[k]; });
    });
    return waehle(rng, passend.length >= n ? passend : pool, akt, n);
  }

  /* ---- Eine Einheit je Art ------------------------------------------------ */

  function belegteArten(run) {
    return run.team.concat(run.bank).map(function (m) { return GD.unit(m.id).art; });
  }
  function freieArt(run, art) { return belegteArten(run).indexOf(art) < 0; }

  function roll(run) {
    var rng = rngOf(run);
    var types = STEPS[run.step];
    run.options = types.map(function (type) {
      if (type === 'kampf' || type === 'elite') {
        var pool = type === 'elite' ? EN.elitesForAct(run.act) : EN.forAct(run.act);
        var e = root.RNG.pick(rng, pool);
        return { type: type, name: e.name, encounter: e };
      }
      if (type === 'boss') {
        var b = EN.boss(run.act);
        return { type: 'boss', name: 'BOSS: ' + b.name, encounter: b };
      }
      if (type === 'event') {
        return { type: 'event', name: 'Ereignis', event: root.RNG.pick(rng, EN.eventsForAct(run.act)) };
      }
      if (type === 'shop') return { type: 'shop', name: 'Händler' };
      return { type: 'lager', name: 'Lager' };
    });
    commit(run, rng);
  }

  /* ---- Knoten betreten --------------------------------------------------- */

  function choose(run, i) {
    if (run.phase !== 'karte' || run.over) return null;
    var node = run.options[i];
    if (!node) return null;
    run.node = node;
    if (node.type === 'shop') { run.phase = 'shop'; run.pending = { offers: shopOffers(run) }; return run.pending; }
    if (node.type === 'event') { run.phase = 'event'; run.pending = { event: node.event }; return run.pending; }
    if (node.type === 'lager') { run.phase = 'lager'; run.pending = { done: false }; return run.pending; }
    return fight(run, node);
  }

  function fight(run, node) {
    var rng = rngOf(run);
    var seed = Math.floor(rng() * 0xffffffff);
    commit(run, rng);
    var foes = EN.build(node.encounter);
    var res = C.simulate(run.team.map(resolve), foes, seed, { relics: run.relics.map(GD.relic) });
    run.phase = 'kampf';
    run.pending = { result: res, node: node, rewards: null, devour: null };

    if (res.winner === 'player') {
      var gold = node.encounter.gold;
      run.gold += gold;
      run.magicules += 25 + run.act * 15;
      run.pending.gold = gold;
      run.pending.rewards = rollRewards(run, node);
      run.pending.devour = res.fallen.filter(function (f) { return f.side === 'enemy'; })
        .filter(function (f) { return (EN.get(f.id).effects || []).length; })
        .map(function (f) {
          var e = EN.get(f.id);
          return { id: f.id, name: e.name, abilities: e.effects.map(function (ab) {
            return { name: ab.name, text: ab.text || '' };
          }) };
        });
      run.chronik.push('Akt ' + run.act + '.' + (run.step + 1) + ': ' + node.name + ' bezwungen');
    } else {
      run.lives--;
      run.chronik.push('Akt ' + run.act + '.' + (run.step + 1) + ': Niederlage bei ' + node.name);
      if (run.lives <= 0) finish(run, false);
    }
    return run.pending;
  }

  /* ---- Belohnungen -------------------------------------------------------- */

  function unitPool(run) {
    var maxCost = run.act === 1 ? 3 : run.act === 2 ? 4 : 5;
    var belegt = belegteArten(run);
    return run.meta.unlockedUnits.map(GD.unit).filter(function (u) {
      return u && u.cost <= maxCost && belegt.indexOf(u.art) < 0;
    });
  }
  function relicPool(run) {
    return run.meta.unlockedRelics.map(GD.relic).filter(function (r) { return r && run.relics.indexOf(r.id) < 0; });
  }

  var STAT_NAME = { hp: '❤', atk: '⚔', def: '🛡', spd: '⚡' };
  function itemText(it) {
    var teile = Object.keys(it.stats || {}).map(function (k) { return '+' + it.stats[k] + ' ' + STAT_NAME[k]; });
    (it.effects || []).forEach(function (e) { if (e.name !== it.name) teile.push(e.name); });
    return teile.join(' · ') || 'Ausrüstung';
  }
  function unitText(u) {
    var sig = AB.get(u.signature);
    return GD.artName(u.art) + ' · ' + GD.rolleName(u.tags[1]) + ' · ' + (sig ? sig.name : '');
  }

  function rollRewards(run, node) {
    var rng = rngOf(run);
    var out = [];
    var stark = node.type === 'elite' || node.type === 'boss';
    /* Elite und Boss würfeln eine Stufe höher — dafür geht man das Risiko ein. */
    var akt = run.act + (stark ? 1 : 0);
    themenWahl(run, rng, unitPool(run), akt, 2).forEach(function (u) {
      out.push({ kind: 'unit', id: u.id, name: u.name, text: unitText(u), rarity: u.rarity });
    });
    var rels = relicPool(run);
    if (rels.length && (stark || out.length < 2 || rng() < 0.5)) {
      var r = themenWahl(run, rng, rels, akt, 1)[0];
      out.push({ kind: 'relic', id: r.id, name: r.name, text: r.text, rarity: r.rarity });
    }
    var it = themenWahl(run, rng, GD.items, akt, 1)[0];
    out.push({ kind: 'item', id: it.id, name: it.name, text: itemText(it), rarity: it.rarity });
    out.push({ kind: 'gold', name: (stark ? 70 : 40) + ' Gold + ' + (stark ? 90 : 60) + ' Magicule',
               gold: stark ? 70 : 40, mag: stark ? 90 : 60 });
    commit(run, rng);
    return out;
  }

  function takeReward(run, i) {
    var p = run.pending;
    if (!p || !p.rewards) return false;
    var r = p.rewards[i];
    if (!r) return false;
    if (r.kind === 'unit') { if (!addUnit(run, r.id)) return false; }
    else if (r.kind === 'relic') run.relics.push(r.id);
    else if (r.kind === 'item') (run.bag = run.bag || []).push(r.id);
    else { run.gold += r.gold; run.magicules += r.mag; }
    p.rewards = null;
    return true;
  }

  function addUnit(run, id) {
    var u = GD.unit(id);
    if (!u || !freieArt(run, u.art)) return false;      // eine Einheit je Art
    var m = member(id);
    if (run.team.length < TEAM_MAX) run.team.push(m);
    else if (run.bank.length < BANK_MAX) run.bank.push(m);
    else return false;
    return true;
  }

  function entlassen(run, uid) {
    var i = run.team.map(function (m) { return m.uid; }).indexOf(uid);
    if (i >= 0) {
      if (run.team[i].id === 'rimuru') return false;
      run.team.splice(i, 1);
      return true;
    }
    var j = run.bank.map(function (m) { return m.uid; }).indexOf(uid);
    if (j < 0) return false;
    run.bank.splice(j, 1);
    return true;
  }

  /* ---- Prädator ----------------------------------------------------------- */

  function devour(run, enemyId, uid) {
    var p = run.pending;
    if (!p || !p.devour) return false;
    if (p.devour.filter(function (f) { return f.id === enemyId; }).length === 0) return false;
    var m = find(run, uid);
    if (!m) return false;
    if (m.devoured.length >= praedatorSlots(m)) return false;
    m.devoured.push(enemyId);
    p.devour = null;
    run.chronik.push('Prädator: ' + EN.get(enemyId).name + ' -> ' + GD.unit(m.id).name);
    return true;
  }

  /* ---- Rangaufstieg ------------------------------------------------------- */

  function rankUp(run, uid, gratis) {
    var m = find(run, uid);
    if (!m || m.rank >= 3 || run.wahl) return false;
    var cost = gratis ? 0 : rankCost(m);
    if (run.magicules < cost) return false;
    run.magicules -= cost;
    m.rank++;
    run.chronik.push('Aufstieg: ' + GD.unit(m.id).name + ' auf Rang ' + rankName(m));

    /* Der neue aktive Slot will gefüllt werden — drei Angebote zur Wahl. */
    var rng = rngOf(run);
    var frei = AB.pool.filter(function (a) { return m.actives.indexOf(a.id) < 0; });
    /* Höherer Rang würfelt aus einem besseren Topf — Rang S sieht öfter Legendäres. */
    run.wahl = { uid: uid, offers: themenWahl(run, rng, frei, run.act + m.rank - 1, 3)
      .map(function (a) { return a.id; }) };
    commit(run, rng);
    return true;
  }

  function chooseActive(run, i) {
    if (!run.wahl) return false;
    var m = find(run, run.wahl.uid);
    var id = run.wahl.offers[i];
    if (!m || !id) return false;
    if (1 + m.actives.length >= aktivSlots(m)) { run.wahl = null; return false; }   // Signatur belegt Slot 1
    m.actives.push(id);
    run.wahl = null;
    return true;
  }
  /* Slot freilassen: dann kann ihn später der Prädator füllen. */
  function skipActive(run) {
    if (!run.wahl) return false;
    run.wahl = null;
    return true;
  }

  /* ---- Shop ---------------------------------------------------------------- */

  function shopOffers(run) {
    var rng = rngOf(run);
    var offers = [];
    themenWahl(run, rng, unitPool(run), run.act, 3).forEach(function (u) {
      offers.push({ kind: 'unit', id: u.id, name: u.name, price: 40 + u.cost * 28,
                    text: unitText(u), rarity: u.rarity });
    });
    themenWahl(run, rng, GD.items, run.act, 2).forEach(function (it) {
      offers.push({ kind: 'item', id: it.id, name: it.name, price: it.cost,
                    text: itemText(it), rarity: it.rarity });
    });
    var rels = relicPool(run);
    if (rels.length) {
      var r = themenWahl(run, rng, rels, run.act, 1)[0];
      offers.push({ kind: 'relic', id: r.id, name: r.name, price: 60 + r.rarity * 40,
                    text: r.text, rarity: r.rarity });
    }
    /* Dritte Goldsenke neben Einheit und Ausrüstung: ein Rang, sonst nur für
       Magicule zu haben. Damit ist jeder Kauf ein Verzicht auf zwei andere. */
    if (run.team.some(function (m) { return m.rank < 3; })) {
      offers.push({ kind: 'rang', name: 'Namensweihe', price: 130,
                    text: 'Hebt eine Einheit deiner Wahl einen Rang, ohne Magicule' });
    }
    commit(run, rng);
    return offers;
  }

  function buy(run, i, uid) {
    var o = run.pending && run.pending.offers && run.pending.offers[i];
    if (!o || o.sold || run.gold < o.price) return false;
    if (o.kind === 'unit' && !addUnit(run, o.id)) return false;
    if (o.kind === 'rang') {
      var ziel = uid ? find(run, uid)
        : run.team.filter(function (m) { return m.rank < 3; })[0];
      if (!ziel || !rankUp(run, ziel.uid, true)) return false;
    }
    if (o.kind === 'relic') run.relics.push(o.id);
    if (o.kind === 'item') (run.bag = run.bag || []).push(o.id);
    run.gold -= o.price;
    o.sold = true;
    return true;
  }

  /* ---- Ereignis + Lager ---------------------------------------------------- */

  var api = {
    grantRelic: function (run) {
      var rng = rngOf(run), pool = relicPool(run);
      if (pool.length) run.relics.push(waehle(rng, pool, run.act, 1)[0].id);
      commit(run, rng);
    },
    grantItem: function (run) {
      var rng = rngOf(run);
      (run.bag = run.bag || []).push(waehle(rng, GD.items, run.act, 1)[0].id);
      commit(run, rng);
    },
    grantUnit: function (run) {
      var rng = rngOf(run), pool = unitPool(run);
      if (pool.length) addUnit(run, waehle(rng, pool, run.act, 1)[0].id);
      commit(run, rng);
    },
    /* Gratisaufstieg: trifft die niedrigste Einheit, damit es sich immer lohnt. */
    freierRang: function (run) {
      var kandidaten = run.team.filter(function (m) { return m.rank < 3; });
      if (!kandidaten.length) return false;
      var ziel = kandidaten.reduce(function (a, b) { return b.rank < a.rank ? b : a; });
      return rankUp(run, ziel.uid, true);
    },
    buffRandom: function (run, stats) {
      var rng = rngOf(run);
      var m = root.RNG.pick(rng, run.team);
      commit(run, rng);
      if (m) api.buffUnit(run, m, stats);
    },
    /* Dauerhafte Werte liegen am Mitglied, nicht an der Basisdefinition. */
    buffUnit: function (run, m, stats) {
      m.bonus = m.bonus || { hp: 0, atk: 0, def: 0, spd: 0 };
      ['hp', 'atk', 'def', 'spd'].forEach(function (k) { if (stats[k]) m.bonus[k] += stats[k]; });
    }
  };

  function eventChoose(run, i) {
    var ev = run.pending && run.pending.event;
    if (!ev) return false;
    var opt = ev.options[i];
    if (!opt || (opt.can && !opt.can(run))) return false;
    opt.fn(run, {
      grantRelic: function () { api.grantRelic(run); },
      grantItem: function () { api.grantItem(run); },
      grantUnit: function () { api.grantUnit(run); },
      buffRandom: function (s) { api.buffRandom(run, s); },
      buffUnit: function (m, s) { api.buffUnit(run, m, s); },
      freierRang: function () { return api.freierRang(run); }
    });
    run.pending.event = null;
    run.pending.text = opt.text;
    return true;
  }

  function camp(run, i) {
    if (run.phase !== 'lager' || run.pending.done) return false;
    if (i === 0) run.gold += 60;
    else if (i === 1) run.magicules += 120;
    else api.buffRandom(run, { hp: 30, atk: 4 });
    run.pending.done = true;
    return true;
  }

  /* ---- Ausrüstung und Aufstellung ------------------------------------------ */

  function find(run, uid) {
    var all = run.team.concat(run.bank);
    for (var i = 0; i < all.length; i++) if (all[i].uid === uid) return all[i];
    return null;
  }

  function equip(run, uid, itemId) {
    var m = find(run, uid);
    var bag = run.bag || [];
    var idx = bag.indexOf(itemId);
    if (!m || idx < 0 || m.items.length >= itemSlots(m)) return false;
    bag.splice(idx, 1);
    m.items.push(itemId);
    return true;
  }
  function unequip(run, uid, itemId) {
    var m = find(run, uid);
    if (!m) return false;
    var idx = m.items.indexOf(itemId);
    if (idx < 0) return false;
    m.items.splice(idx, 1);
    (run.bag = run.bag || []).push(itemId);
    return true;
  }

  function move(run, uid, dir) {
    var i = run.team.map(function (m) { return m.uid; }).indexOf(uid);
    if (i < 0) return false;
    var j = i + dir;
    if (j < 0 || j >= run.team.length) return false;
    var tmp = run.team[i]; run.team[i] = run.team[j]; run.team[j] = tmp;
    return true;
  }
  function bench(run, uid) {
    var i = run.team.map(function (m) { return m.uid; }).indexOf(uid);
    if (i < 0 || run.team.length <= 1 || run.bank.length >= BANK_MAX) return false;
    if (run.team[i].id === 'rimuru') return false;
    run.bank.push(run.team.splice(i, 1)[0]);
    return true;
  }
  function deploy(run, uid) {
    var i = run.bank.map(function (m) { return m.uid; }).indexOf(uid);
    if (i < 0 || run.team.length >= TEAM_MAX) return false;
    run.team.push(run.bank.splice(i, 1)[0]);
    return true;
  }

  /* ---- Weiter ------------------------------------------------------------- */

  function advance(run) {
    if (run.over) return false;
    if (run.phase === 'kampf' && run.pending && run.pending.result.winner !== 'player' && run.lives > 0) {
      run.phase = 'karte'; run.pending = null; roll(run); return true;   // Niederlage: Schritt wiederholen
    }
    run.step++;
    if (run.step >= STEPS.length) {
      run.step = 0;
      run.act++;
      if (run.act > 3) { finish(run, true); return true; }
      run.chronik.push('— Akt ' + run.act + ' —');
    }
    run.phase = 'karte';
    run.pending = null;
    roll(run);
    return true;
  }

  function finish(run, won) {
    run.over = true;
    run.won = won;
    run.phase = 'ende';
    var rng = rngOf(run);
    run.meta.runs++;
    if (won) run.meta.wins++;
    var score = (run.act - 1) * 8 + run.step;
    run.meta.best = Math.max(run.meta.best || 0, won ? 24 : score);
    run.unlocked = unlock(run.meta, rng);
    commit(run, rng);
  }

  /* ---- Speichern ----------------------------------------------------------- */

  var KEY = 'tensura-guild-v2';
  function serialize(run) {
    return JSON.stringify({
      seed: run.seed, rngState: run.rngState, act: run.act, step: run.step,
      gold: run.gold, magicules: run.magicules, lives: run.lives, relics: run.relics,
      bag: run.bag || [], chronik: run.chronik, meta: run.meta,
      team: run.team, bank: run.bank, uidSeq: uidSeq, startwahl: run.startwahl
    });
  }
  function deserialize(raw) {
    var d = JSON.parse(raw);
    var run = create(d.seed, d.meta);
    run.team = []; run.bank = [];
    ['rngState', 'act', 'step', 'gold', 'magicules', 'lives', 'relics', 'bag', 'chronik', 'team', 'bank']
      .forEach(function (k) { if (d[k] !== undefined) run[k] = d[k]; });
    uidSeq = Math.max(uidSeq, d.uidSeq || 0);
    run.pending = null; run.wahl = null;
    run.startwahl = d.startwahl || null;
    run.phase = run.startwahl ? 'start' : 'karte';
    if (!run.startwahl) roll(run);
    return run;
  }
  function save(run) {
    try { localStorage.setItem(KEY, serialize(run)); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? deserialize(raw) : null;
    } catch (e) { return null; }
  }
  function loadMeta() {
    try {
      var raw = localStorage.getItem(KEY + '-meta');
      return raw ? JSON.parse(raw) : newMeta();
    } catch (e) { return newMeta(); }
  }
  function saveMeta(meta) {
    try { localStorage.setItem(KEY + '-meta', JSON.stringify(meta)); } catch (e) {}
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  root.Run = {
    create: create, newMeta: newMeta, resolve: resolve, member: member, abilities: abilities,
    choose: choose, advance: advance, takeReward: takeReward, devour: devour,
    rankUp: rankUp, chooseActive: chooseActive, skipActive: skipActive,
    chooseStart: chooseStart,
    rankName: rankName, rankCost: rankCost,
    itemSlots: itemSlots, aktivSlots: aktivSlots, passivSlots: passivSlots, praedatorSlots: praedatorSlots,
    buy: buy, eventChoose: eventChoose, camp: camp,
    equip: equip, unequip: unequip, move: move, bench: bench, deploy: deploy, entlassen: entlassen,
    find: find, addUnit: addUnit, unitPool: unitPool, relicPool: relicPool,
    belegteArten: belegteArten, freieArt: freieArt, waehle: waehle, gewicht: gewicht,
    buildTeile: buildTeile,
    save: save, load: load, clear: clear, loadMeta: loadMeta, saveMeta: saveMeta,
    serialize: serialize, deserialize: deserialize,
    TEAM_MAX: TEAM_MAX, BANK_MAX: BANK_MAX, STEPS: STEPS, RANK_NAME: RANK_NAME
  };
})(globalThis);
