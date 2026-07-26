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

  /* Knotenangebot je Schritt eines Akts. Drei Wege statt zwei: die Wahl
     zwischen sicherem Kampf, Elite mit besserer Beute und Laden ist die
     eigentliche Routenplanung. */
  var STEPS = [
    ['kampf', 'kampf', 'event'],
    ['kampf', 'event', 'shop'],
    ['shop', 'event', 'kampf'],
    ['kampf', 'elite', 'lager'],
    ['lager', 'event', 'kampf'],
    ['kampf', 'shop', 'elite'],
    ['elite', 'kampf', 'lager'],
    ['boss']
  ];
  var TEAM_MAX = 6, BANK_MAX = 3;
  /* Zwei Akte, je ein Boss. Der Inhalt bleibt fünfstufig — Jura-Wald, Höhlen und
     Orks, Falmuth, die Westliche Heilige Kirche, Ruberios —, aber die Stufe
     steigt jetzt INNERHALB des Akts mit dem Schritt statt mit der Aktnummer.
     Ohne diese Trennung wären mit zwei Akten drei Fünftel aller Gegner,
     Ereignisse und Elite-Begegnungen tot. */
  var AKTE = 2;
  var STUFEN = [[1, 2], [3, 4, 5]];

  /* Inhaltsstufe 1–5: steuert Gegner, Ereignisse, Raritätsgewichte und
     Einheitenkosten. Überall dort, wo früher `run.act` stand. */
  function inhaltsStufe(run, step) {
    var s = STUFEN[Math.min(Math.max(run.act, 1), AKTE) - 1];
    var i = Math.floor((step === undefined ? run.step : step) * s.length / STEPS.length);
    return s[Math.min(i, s.length - 1)];
  }

  /* Rang C=0, B=1, A=2, S=3 */
  var RANK_NAME = ['C', 'B', 'A', 'S'];
  var RANK_COST = [140, 300, 560];                // C->B, B->A, A->S
  var ITEM_SLOTS = [1, 2, 3, 5];                  // S gibt zwei statt einem
  var AKTIV_SLOTS = [1, 1, 1, 1];                 // genau eine: die Signatur, jede Runde
  var PASSIV_SLOTS = [0, 1, 2, 3];                // schalten automatisch frei
  var PRAEDATOR_SLOTS = [0, 1, 2, 3];             // verschlungene Gegnerfähigkeiten

  var START_UNITS = ['rimuru', 'gobta', 'gobkyu', 'sturmwolf', 'riesenameise', 'skelettritter',
    'rigurd', 'rigur', 'gobwa', 'kurobe', 'schattenwolf', 'souka', 'kaefergarde',
    'giftfalter', 'daemonengarde', 'gruftwaechter', 'drachenknecht', 'quellenpriesterin',
    'ranga', 'shion', 'gabiru', 'wightkoenig'];
  var START_RELICS = ['kern_des_zorns', 'schuppenpanzer', 'lebensquell', 'windschuhe',
    'giftdorn', 'blutkelch', 'rachegeist_relikt', 'erstschlag_relikt', 'turmschild',
    'magiestein', 'heilsegen', 'barriere_stein', 'dornenhaut_relikt', 'schwerer_stand'];

  /* ---- Bedrohungsstufen ---------------------------------------------------
     Der Grund, nach dem ersten Sieg weiterzuspielen: jede Stufe verschärft eine
     andere Schraube, nicht nur die Gegnerwerte. Freigeschaltet wird sie, indem
     man auf der aktuellen Stufe gewinnt.                                      */

  /* Jede Stufe schaltet EINE Regel frei, die das Spiel verändert — nicht bloß
     eine Prozentzahl. Prozentzahlen verlangen einen stärkeren Trupp; Regeln
     verlangen einen anderen. Die Regeln sind kumulativ, die Werteschraube läuft
     nur noch leise nebenher. */
  var BEDROHUNG = [
    { stufe: 0, name: 'Jura-Wald', regel: null,
      text: 'Der normale Weg.' },
    { stufe: 1, name: 'Überzahl', regel: 'ueberzahl',
      text: 'Jede Begegnung bringt einen Gegner mehr mit. Fläche und Konter gewinnen dadurch, ' +
            'reiner Einzelzielschaden verliert.' },
    { stufe: 2, name: 'Nachschub', regel: 'nachschub',
      text: 'Jeder normale Gegner steht einmal mit 30 % Leben wieder auf — Bosse nicht. ' +
            'Wer nur exekutiert, räumt nicht mehr ab; Gift, Brand und Blutung tragen weiter.' },
    { stufe: 3, name: 'Kriegsrecht', regel: 'kriegsrecht',
      text: 'Der Händler bietet nur noch EINE Einheit an statt drei, und Rangaufstiege kosten ' +
            '15 % mehr Magicule. Du gewinnst weitgehend mit dem Trupp, den du gedraftet hast.' },
    { stufe: 4, name: 'Belagerung', regel: 'belagerung',
      text: 'Im zweiten Akt steht auf jedem zweiten Kampfknoten eine Elite — zur Beute ' +
            'eines normalen Kampfes. Dazu gibt das Lager 15 % weniger.' },
    { stufe: 5, name: 'Sturmgott', regel: 'sturmgott',
      text: 'Nur drei Leben statt fünf, und Bosse eskalieren doppelt so schnell. Jetzt zählt Tempo.' }
  ];
  function bedrohung(i) { return BEDROHUNG[Math.max(0, Math.min(BEDROHUNG.length - 1, i || 0))]; }
  /* Gilt die Regel auf der Stufe dieses Runs? Kumulativ: Stufe 4 hat auch 1–3. */
  function regel(run, name) {
    var t = run.threat || 0;
    for (var i = 1; i < BEDROHUNG.length; i++) {
      if (BEDROHUNG[i].regel === name) return t >= i;
    }
    return false;
  }

  /* Grundhärte aller Gegner. Der Regler, mit dem neue Spielerstärke bezahlt
     wird: die Resonanz war gemessen 8 Punkte Siegquote wert, hier kommen sie
     zurück. Gemessen mit `node dev/balance.js 500`. */
  var GRUNDHAERTE = 0.98;   // ohne Abklingzeiten schlagen beide Seiten haerter zu

  /* Ein Run hat mit zwei Akten 16 Knoten statt 40, die Gegnerkurve laeuft aber
     weiter ueber alle fuenf Inhaltsstufen. Also muss jeder Knoten entsprechend
     mehr Gold und Magicule abwerfen, sonst steht auf Stufe 5 ein Trupp auf Rang
     C. Ein Knopf statt dreissig nachgezogener Zahlen — gemessen mit
     `node dev/balance.js 400`. */
  var WACHSTUM = 14.5;    // eine Waehrung statt zwei; gemessen 50 % Siege (frisch)
  /* Grundstock Magicule je gewonnenem Kampf, oben auf die Beute der Begegnung.
     Beides zusammen ersetzt die früheren zwei Währungen — beim Zusammenlegen
     fiel der Ertrag sonst auf ein Drittel. */
  var MAG_JE_KAMPF = 25;
  /* Bezugsgröße 5 Einheiten: dort ist der Faktor 1. */
  var TRUPP_BEZUG = 0.70, TRUPP_STEIGUNG = 0.06;

  /* Preise in derselben Liga wie die Rangkosten (140/300/560). Mit nur einer
     Währung ist jeder Kauf ein verzichteter Aufstieg — vorher waren die Läden
     mit Gold bezahlt und damit fast gratis. */
  var PREIS_EINHEIT = 130, PREIS_ITEM = 3, PREIS_RELIKT = 340, PREIS_RANG = 260;
  function ertrag(x) { return Math.round(x * WACHSTUM); }

  /* Gegnerhärte je Stufe — greift auf denselben mult wie die Begegnung selbst. */
  function bedrohungsFaktor(run, node) {
    var t = run.threat || 0;
    /* Klein halten: die Kurve ist steil, 20 % mehr Gegnerwerte kippen fast jeden
       Run. Gemessen mit `node dev/balance.js 500 --stufe N`. */
    /* Nur noch ein leiser Anstieg: die Regeln oben tragen die Härte. */
    var f = GRUNDHAERTE + 0.012 * Math.min(t, 5);
    if (run.act === 1 && node && node.type !== 'boss' && EINSTIEG_HAERTE[run.step]) {
      f *= EINSTIEG_HAERTE[run.step];
    }
    /* Die Welt wächst mit dem Trupp. Seit der Run mit EINER Einheit beginnt,
       kann er die Truppgröße nicht mehr erreichen, für die Akt 2 kalibriert war
       — gemessen 7 % Siegquote. Der Anstieg ist flacher als der Zugewinn einer
       zusätzlichen Einheit, wachsen lohnt sich also weiterhin. */
    f *= TRUPP_BEZUG + TRUPP_STEIGUNG * (run.team ? run.team.length : 5);
    /* Eine Elite mit vier Körpern ist gegen einen Flächen-Trupp keine Strafe,
       sondern ein Angebot — deshalb bekommt der belagerte Knoten zusätzlich
       Werte. Ohne das lag Stufe 4 gemessen ÜBER Stufe 3. */
    if (node && node.belagert) f *= 1.0;
    return f;
  }

  /* ---- Meta (überlebt den Tod) ------------------------------------------- */

  function newMeta() {
    return { unlockedUnits: START_UNITS.slice(), unlockedRelics: START_RELICS.slice(),
             runs: 0, wins: 0, best: 0, threat: 0, threatGewaehlt: 0 };
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
    return { uid: 'm' + (++uidSeq), id: id, rank: 0, items: [], actives: [], devoured: [], passives: [] };
  }

  /* Welche Passiven trägt das Mitglied? Einheiten mit eigenen Linien tragen
     genau das, was der Spieler gewählt hat; alle anderen weiter die drei festen
     aus data.js, die mit dem Rang aufschalten. */
  function passivIds(m) {
    var gewaehlt = m.passives || [];
    if (AB.linien[m.id]) return gewaehlt.slice();
    /* Wer noch nie vor einer Wahl stand, trägt die feste Liste aus data.js —
       das hält alte Speicherstände und die Testhelfer am Leben, die einer
       Einheit einfach einen Rang setzen. Sobald einmal gewählt werden durfte,
       zählt nur noch die Wahl; sonst wäre Verzichten folgenlos. */
    if (!m.durfteWaehlen) return GD.unit(m.id).passives.slice(0, PASSIV_SLOTS[m.rank]);
    return gewaehlt.slice(0, PASSIV_SLOTS[m.rank]);
  }
  function hatLinien(m) { return !!AB.linien[m.id]; }

  function itemSlots(m) { return ITEM_SLOTS[m.rank]; }
  function aktivSlots(m) { return AKTIV_SLOTS[m.rank]; }
  function passivSlots(m) { return PASSIV_SLOTS[m.rank]; }
  function praedatorSlots(m) { return PRAEDATOR_SLOTS[m.rank]; }
  function rankName(m) { return RANK_NAME[m.rank]; }
  function rankCost(m, run) {
    if (m.rank >= 3) return 0;
    var k = RANK_COST[m.rank];
    if (run && regel(run, 'kriegsrecht')) k = Math.round(k * 1.15);
    return k;
  }

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

    /* Genau eine Aktive: die Signatur. Sie feuert in jedem Zug und ersetzt den
       Normalangriff — alles andere, was eine Einheit lernt, ist passiv. */
    [base.signature].forEach(function (id) {
      var a = AB.get(id);
      if (a) { d.actives.push(a); d.keywords = d.keywords.concat(a.keywords || []); }
    });

    /* Passive: bei Einheiten mit eigenen Linien die selbst gewählten, sonst die
       ersten N der festen Liste, N = Rang. */
    passivIds(m).forEach(function (id) {
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
      d.keywords = d.keywords.concat(it.keywords || [], it.amplifies || []);
    });

    if (m.devoured.slice(0, PRAEDATOR_SLOTS[r]).length) d.verschlungen = 1;
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
    [base.signature].forEach(function (id) {
      var a = AB.get(id); if (a) out.push(a);
    });
    passivIds(m).forEach(function (id) {
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

  /* ---- Debug-Übersicht ----------------------------------------------------
     Woher kommt welcher Punkt? Vier Stufen, jede eine echte Zwischenrechnung:
       basis   Rohwerte aus data.js
       rang    + Rangbonus
       aus     + Ausrüstung und dauerhafte Ereignis-Boni  (= resolve)
       kampf   + Relikte, Resonanz und alle onStart-Passiven
     Die letzte Stufe kommt aus combat.js selbst, nicht aus einer Kopie davon.  */

  var PUPPE = { id: 'puppe', name: 'Trainingspuppe', tags: ['bestie', 'front'],
                hp: 1, atk: 1, def: 0, spd: 1, actives: [], effects: [], keywords: [] };

  function analyse(run) {
    var defs = run.team.map(resolve);
    var auf = C.simulate(defs, [PUPPE], 1,
      { relics: run.relics.map(GD.relic), nurAufbau: true });
    var kampf = auf.einheiten.filter(function (u) { return u.side === 'player'; });
    return run.team.map(function (m, i) {
      return {
        m: m,
        basis: GD.unit(m.id),
        rang: resolve({ uid: m.uid, id: m.id, rank: m.rank, items: [], actives: m.actives,
                        devoured: [], passives: m.passives }),
        aus: defs[i],
        kampf: kampf[i],
        resonanz: auf.resonanz.player
      };
    });
  }

  /* Welche Resonanzen der Trupp gerade hätte — dieselbe Zählung wie im Kampf,
     damit die Anzeige nicht etwas anderes verspricht als der Kampf einlöst. */
  function resonanzen(run) {
    var ks = [];
    buildTeile(run).forEach(function (t) { ks = ks.concat(t.keywords || [], t.amplifies || []); });
    return root.Combat.resonanz(ks);
  }

  /* ---- Run anlegen ------------------------------------------------------- */

  function create(seed, meta) {
    meta = meta || newMeta();
    var t = Math.min(meta.threatGewaehlt || 0, meta.threat || 0);
    var run = {
      seed: seed >>> 0, rngState: seed >>> 0, meta: meta, threat: t,
      act: 1, step: 0, phase: 'karte', over: false, won: false,
      magicules: 120, lives: t >= 5 ? 3 : 5,
      team: [], bank: [], relics: [],
      options: null, node: null, pending: null, wahl: null, chronik: []
    };
    /* Je Akt ein Boss, gezogen aus seinem Pool. Steht von Anfang an fest, damit
       die Vorschau ab dem ersten Knoten den echten Gegner zeigt. */
    var brng = rngOf(run);
    run.bosse = [1, 2].map(function (p) { return root.RNG.pick(brng, EN.bossPool(p)).id; });
    commit(run, brng);
    /* Der Run ist ein Aufbau: EINE Einheit mit EINEM Relikt, aus vier Paaren
       gewählt. Vorher standen drei Einheiten am Start und der erste Kampf war
       ein Massenkampf — es fehlte das Gefühl, aus dem Nichts etwas zu bauen. */
    run.phase = 'start';
    startAngebot(run);
    return run;
  }

  /* Vier Anfänge zur Wahl: je eine billige Einheit und ein Relikt, das zu ihr
     passt. Das Paar ist die erste Build-Ansage des Runs. */
  function startAngebot(run) {
    var rng = rngOf(run);
    var pool = unitPool(run).filter(function (u) { return u.cost <= 3; });
    var relPool = relicPool(run);
    var einheiten = waehle(rng, pool, 1, 4);
    run.startwahl = {
      offers: einheiten.map(function (u) {
        /* Ein Relikt, das die Schlüsselwörter der Einheit trifft — sonst ist
           das Paar zufällig statt eine Ansage. */
        var sig = AB.get(u.signature);
        var kw = (sig ? sig.keywords : []).concat();
        (u.passives || []).forEach(function (pid) {
          var ab = AB.get(pid);
          if (ab) kw = kw.concat(ab.keywords || [], ab.amplifies || []);
        });
        var passend = relPool.filter(function (r) {
          if (r.bedingung) return false;
          return (r.keywords || []).concat(r.amplifies || []).some(function (k) { return kw.indexOf(k) >= 0; });
        });
        var offen = relPool.filter(function (r) { return !r.bedingung; });
        var r = waehle(rng, passend.length ? passend : offen, 1, 1)[0];
        return { unit: u.id, relic: r ? r.id : null };
      })
    };
    commit(run, rng);
  }

  function chooseStart(run, i) {
    if (!run.startwahl) return false;
    var o = run.startwahl.offers[i];
    if (!o || !addUnit(run, o.unit)) return false;
    if (o.relic) run.relics.push(o.relic);
    run.startwahl = null;
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
    /* Was gerade nichts tun kann, gehört nicht ins Angebot: ein Relikt mit
       unerfüllter Bedingung ist für den Spieler ein toter Slot. Je mehr
       freigeschaltet ist, desto häufiger passierte genau das. */
    var brauchbar = pool.filter(function (x) { return !x.bedingung || x.bedingung(run); });
    if (brauchbar.length >= n) pool = brauchbar;
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

  /* Der Boss dieses Akts — feststehend, nicht je Aufruf neu gewürfelt. */
  function bossOf(run, akt) {
    var id = (run.bosse || [])[(akt || run.act) - 1];
    return (id && EN.bossById(id)) || EN.bossPool(akt || run.act)[0];
  }

  function roll(run) {
    var rng = rngOf(run);
    var st = inhaltsStufe(run);
    /* Nach dem letzten Akt gibt es keine Begegnungen mehr — dann nicht würfeln. */
    if (!EN.forAct(st).length) { run.options = []; return; }
    var types = STEPS[run.step];
    run.options = types.map(function (type) {
      if (type === 'kampf' || type === 'elite') {
        /* Belagerung: Elite-Gegner an einem normalen Knoten — aber zu normaler
           Beute. Mit der Elite-Belohnung war die Stufe gemessen LEICHTER als die
           darunter (23 gegen 17 % Siege): die bessere Beute zahlte die härteren
           Gegner mehr als zurück. */
        /* Nicht während des Einstiegs: dort werden Begegnungen ohnehin auf
           ein bis zwei Gegner gestutzt, und eine gestutzte Elite ist leichter
           als die volle normale Begegnung — gemessen lag Stufe 4 damit ÜBER
           Stufe 3. */
        /* Nur der zweite Akt. Auf beide Akte angewandt kostete die Regel
           gemessen 14 Punkte Siegquote statt der gewollten 6 — ein erzwungener
           Elite-Kampf wiegt deutlich schwerer als er aussieht. */
        var belagert = type === 'kampf' && regel(run, 'belagerung') && run.act >= AKTE &&
          run.step % 2 === 1;
        if (belagert) type = 'elite';
        var pool = type === 'elite' ? EN.elitesForAct(st) : EN.forAct(st);
        var e = root.RNG.pick(rng, pool);
        return { type: type, name: (belagert ? 'Belagerung: ' : '') + e.name,
                 encounter: e, belagert: belagert };
      }
      if (type === 'boss') {
        var b = bossOf(run);
        return { type: 'boss', name: 'BOSS: ' + b.name, encounter: b };
      }
      if (type === 'event') {
        return { type: 'event', name: 'Ereignis', event: root.RNG.pick(rng, EN.eventsForAct(st)) };
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

  /* Nachschub: normale Gegner stehen einmal wieder auf. Als Effekt an der
     Kampfdefinition, nicht als Sonderfall in combat.js — die Engine soll von
     Bedrohungsstufen nichts wissen. */
  var NACHZUEGLER = 0.5;
  var NACHSCHUB_LEBEN = 0.3;

  var NACHSCHUB = { hook: 'onDeath', name: 'Nachschub',
    text: 'Steht einmal mit 30 % Leben wieder auf.', keywords: ['heilung'],
    fn: function (c) {
      if (c.self._auf) return;
      c.self._auf = 1;
      c.self.hp = Math.round(c.self.maxHp * NACHSCHUB_LEBEN);
      c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                   side: c.self.side, hp: c.self.hp });
    } };

  /* Was die Bedrohungsstufe am fertigen Gegnerfeld ändert. */
  /* Die ersten Knoten sind der Einstieg: ein Gegner, dann zwei. Wer mit einer
     einzigen Einheit startet, soll nicht sofort gegen vier stehen. */
  var EINSTIEG = [1, 2, 2, 3, 3, 4, 4];
  /* Und sie sind zusätzlich schwächer: mit einer einzigen Einheit ist selbst ein
     1-gegen-1 zur vollen Härte ein Münzwurf — gemessen 4 % Siegquote über den
     ganzen Run. */
  var EINSTIEG_HAERTE = [0.55, 0.65, 0.72, 0.78, 0.84, 0.9, 0.95];

  function regeln(run, node, foes) {
    if (run.act === 1 && node.type !== 'boss' && EINSTIEG[run.step]) {
      foes = foes.slice(0, EINSTIEG[run.step]);
    }
    if (regel(run, 'ueberzahl') && node.type !== 'boss') {
      /* Ein Nachzügler, keine zweite Begegnung: ein voller Extragegner halbierte
         gemessen die Siegquote (46 -> 14 %). Bei NACHZUEGLER = 0.5 bleibt die
         Wirkung — mehr Ziele, also zählen Fläche und Konter — ohne die Stufe zu
         einer Wand zu machen. */
      var letzter = foes[foes.length - 1], nach = {};
      for (var x in letzter) nach[x] = letzter[x];
      nach.name = letzter.name + ' (Nachzügler)';
      nach.hp = Math.max(1, Math.round(letzter.hp * NACHZUEGLER));
      nach.atk = Math.max(1, Math.round(letzter.atk * NACHZUEGLER));
      nach.def = Math.round(letzter.def * NACHZUEGLER);
      foes = foes.concat([nach]);
    }
    if (regel(run, 'nachschub') && node.type !== 'boss') {
      /* Nur der vorderste Gegner kommt zurück. Auf alle angewandt kostete die
         Regel gemessen 17 Punkte Siegquote statt der gewollten 7 — die Zahl der
         zusätzlichen Körper wiegt schwerer als deren Leben. */
      foes = foes.map(function (f, i) {
        if (i) return f;
        var k = {};
        for (var x in f) k[x] = f[x];
        k.effects = (f.effects || []).concat([NACHSCHUB]);
        return k;
      });
    }
    if (regel(run, 'sturmgott') && node.type === 'boss') {
      foes = foes.map(function (f) {
        var k = {};
        for (var x in f) k[x] = f[x];
        k.enrage = (f.enrage || 0) * 2;
        return k;
      });
    }
    return foes;
  }

  function fight(run, node) {
    var rng = rngOf(run);
    var seed = Math.floor(rng() * 0xffffffff);
    commit(run, rng);
    var foes = regeln(run, node, EN.build(node.encounter, bedrohungsFaktor(run, node)));
    var res = C.simulate(run.team.map(resolve), foes, seed, { relics: run.relics.map(GD.relic) });
    run.phase = 'kampf';
    run.pending = { result: res, node: node, rewards: null, devour: null };

    if (res.winner === 'player') {
      /* Eine Währung. Gold und Magicule waren dieselbe Zahl in zwei Beuteln:
         beide kamen aus Kämpfen, beide gingen in Truppstärke. */
      var beute = ertrag(node.encounter.beute * (node.belagert ? 0.75 : 1)) +
        ertrag(MAG_JE_KAMPF + inhaltsStufe(run) * 15);
      run.magicules += beute;
      run.pending.gold = beute;
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
    var st = inhaltsStufe(run);
    var maxCost = st <= 2 ? 3 : st === 3 ? 4 : 5;
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
    var stark = (node.type === 'elite' || node.type === 'boss') && !node.belagert;
    /* Elite und Boss würfeln eine Stufe höher — dafür geht man das Risiko ein. */
    var akt = inhaltsStufe(run) + (stark ? 1 : 0);
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
    out.push({ kind: 'gold', name: ertrag(stark ? 160 : 100) + ' Magicule',
               mag: ertrag(stark ? 160 : 100) });
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
    else run.magicules += r.mag;
    p.rewards = null;
    return true;
  }

  function addUnit(run, id) {
    var u = GD.unit(id);
    if (!u || !freieArt(run, u.art)) return false;      // eine Einheit je Art
    var m = member(id);
    /* ponytail: Frontlinie rückt beim Anwerben direkt auf Platz 1 — Abkürzung
       aus TODO.md, damit man zum Testen nicht jedes Mal von Hand umstellt.
       Wieder auf `push` setzen, sobald die Aufstellung Spielerentscheidung ist. */
    if (run.team.length < TEAM_MAX) {
      if (u.tags[1] === 'front') run.team.unshift(m); else run.team.push(m);
    }
    else if (run.bank.length < BANK_MAX) run.bank.push(m);
    else return false;
    passivAngebot(run, m, true);
    return true;
  }

  /* Was in dieser Einheit steckt: die Rangaufstiege plus der Ladenpreis, den sie
     gekostet hätte. Ausrüstung nicht — die wandert zurück in den Beutel. */
  function investiert(m) {
    var summe = PREIS_EINHEIT + GD.unit(m.id).cost * 45;
    for (var r = 0; r < m.rank; r++) summe += RANK_COST[r];
    return summe;
  }
  var RUECKGABE = 0.25;
  function entlassenWert(m) { return Math.round(investiert(m) * RUECKGABE); }

  /* Nur außerhalb des Kampfes: mitten in einer laufenden Auflösung wäre der
     Trupp ein anderer als der, der gerade kämpft. */
  function darfEntlassen(run) {
    return !run.over && run.phase !== 'kampf';
  }

  function entlassen(run, uid) {
    if (!darfEntlassen(run)) return false;
    var m = find(run, uid);
    if (!m) return false;
    var i = run.team.map(function (x) { return x.uid; }).indexOf(uid);
    if (i >= 0 && run.team.length <= 1) return false;   // ohne Trupp kein Kampf
    /* Ausrüstung zurück in den Beutel, ein Viertel des Einsatzes zurück. */
    m.items.slice().forEach(function (iid) { unequip(run, uid, iid); });
    run.magicules += entlassenWert(m);
    if (i >= 0) run.team.splice(i, 1);
    else run.bank.splice(run.bank.map(function (x) { return x.uid; }).indexOf(uid), 1);
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
    if (!m || m.rank >= 3 || passivWahl(run)) return false;
    var cost = gratis ? 0 : rankCost(m, run);
    if (run.magicules < cost) return false;
    run.magicules -= cost;
    m.rank++;
    run.chronik.push('Aufstieg: ' + GD.unit(m.id).name + ' auf Rang ' + rankName(m));
    passivAngebot(run, m);

    return true;
  }

  /* ---- Wählbare Passive ---------------------------------------------------
     Einheiten mit eigenen Linien (AB.linien) bekommen bei der Anwerbung und bei
     jedem Aufstieg vier Angebote — eines je Linie: Angriff, Mechanik,
     Unterstützung, Defensive. Damit ist die Passive eine Entscheidung statt
     einer Folge des Rangs.

     Warteschlange statt Einzelfeld: der Startdraft wirbt drei Einheiten
     hintereinander an, da liegen sofort mehrere Wahlen offen.                 */

  function passivAngebot(run, m, beiAnwerbung) {
    var hab = m.passives || [];
    var offers;
    if (hatLinien(m)) {
      var stufe = hab.length + 1;
      offers = AB.linienAngebot(m.id, stufe)
        .filter(function (o) { return hab.indexOf(o.id) < 0; });
      if (!offers.length) return;
      (run.pwahlen = run.pwahlen || []).push({ uid: m.uid, stufe: stufe, offers: offers });
      return;
    }
    /* Ohne eigene Linien: die nächste feste Passive der Einheit plus zwei aus
       der geteilten Bibliothek. Seit die Aktive nicht mehr gewählt wird, wäre
       der Aufstieg sonst gar keine Entscheidung mehr. Bei der Anwerbung gibt es
       nichts zu wählen — Rang C hat keinen Passiv-Slot. */
    if (beiAnwerbung || m.rank < 1) return;
    m.durfteWaehlen = 1;
    var eigen = GD.unit(m.id).passives[m.rank - 1];
    offers = [];
    if (eigen && hab.indexOf(eigen) < 0) offers.push({ linie: 'eigen', linieName: 'Eigene Linie', id: eigen });
    var rng = rngOf(run);
    var kw = AB.keywords(abilities(m));
    var frei = AB.passives.filter(function (p) {
      return !AB.linien_ids[p.id] && hab.indexOf(p.id) < 0 && p.id !== eigen;
    });
    var passend = frei.filter(function (p) {
      return (p.keywords || []).concat(p.amplifies || []).some(function (k) { return kw[k]; });
    });
    waehle(rng, passend.length >= 2 ? passend : frei, inhaltsStufe(run) + m.rank - 1, 3 - offers.length)
      .forEach(function (p) { offers.push({ linie: 'bibliothek', linieName: 'Bibliothek', id: p.id }); });
    commit(run, rng);
    if (offers.length) (run.pwahlen = run.pwahlen || []).push({ uid: m.uid, stufe: m.rank, offers: offers });
  }

  function passivWahl(run) { return (run.pwahlen || [])[0] || null; }

  function choosePassive(run, i) {
    var w = passivWahl(run);
    if (!w) return false;
    var o = w.offers[i];
    var m = find(run, w.uid);
    if (!o || !m) return false;
    m.passives = (m.passives || []).concat(o.id);
    run.pwahlen.shift();
    run.chronik.push('Passive: ' + GD.unit(m.id).name + ' wählt ' + AB.get(o.id).name);
    return true;
  }


  /* ---- Shop ---------------------------------------------------------------- */

  function shopOffers(run) {
    var rng = rngOf(run);
    var offers = [];
    var st = inhaltsStufe(run);
    /* Kriegsrecht: EIN Angebot statt drei. Ganz ohne Einheiten war die Stufe
       gemessen härter als die nächsthöhere (13 gegen 20 % Siege) — die Kurve lief
       rückwärts, weil ein Trupp, dem eine Rolle fehlt, gar nicht mehr aufholt. */
    themenWahl(run, rng, unitPool(run), st, regel(run, 'kriegsrecht') ? 1 : 3)
      .forEach(function (u) {
        offers.push({ kind: 'unit', id: u.id, name: u.name, price: PREIS_EINHEIT + u.cost * 45,
                      text: unitText(u), rarity: u.rarity });
      });
    themenWahl(run, rng, GD.items, st, 2).forEach(function (it) {
      offers.push({ kind: 'item', id: it.id, name: it.name, price: Math.round(it.cost * PREIS_ITEM),
                    text: itemText(it), rarity: it.rarity });
    });
    var rels = relicPool(run);
    if (rels.length) {
      var r = themenWahl(run, rng, rels, st, 1)[0];
      /* Fester Preis. Die Seltenheit sagt, wie stark etwas ist, nicht wie teuer:
         sonst wird jede Freischaltung zur Geldstrafe — gemessen kaufte ein
         Veteran ein Achtel weniger Relikte als ein Anfänger und verlor dadurch
         15 Punkte Siegquote. */
      offers.push({ kind: 'relic', id: r.id, name: r.name, price: PREIS_RELIKT,
                    text: r.text, rarity: r.rarity });
    }
    /* Dritte Goldsenke neben Einheit und Ausrüstung: ein Rang, sonst nur für
       Magicule zu haben. Damit ist jeder Kauf ein Verzicht auf zwei andere. */
    if (run.team.some(function (m) { return m.rank < 3; })) {
      offers.push({ kind: 'rang', name: 'Namensweihe', price: PREIS_RANG,
                    text: 'Hebt eine Einheit deiner Wahl einen Rang, ohne Magicule' });
    }
    commit(run, rng);
    return offers;
  }

  function buy(run, i, uid) {
    var o = run.pending && run.pending.offers && run.pending.offers[i];
    if (!o || o.sold || run.magicules < o.price) return false;
    if (o.kind === 'unit' && !addUnit(run, o.id)) return false;
    if (o.kind === 'rang') {
      var ziel = uid ? find(run, uid)
        : run.team.filter(function (m) { return m.rank < 3; })[0];
      if (!ziel || !rankUp(run, ziel.uid, true)) return false;
    }
    if (o.kind === 'relic') run.relics.push(o.id);
    if (o.kind === 'item') (run.bag = run.bag || []).push(o.id);
    run.magicules -= o.price;
    o.sold = true;
    return true;
  }

  /* ---- Ereignis + Lager ---------------------------------------------------- */

  var api = {
    grantRelic: function (run) {
      var rng = rngOf(run), pool = relicPool(run);
      if (pool.length) run.relics.push(waehle(rng, pool, inhaltsStufe(run), 1)[0].id);
      commit(run, rng);
    },
    grantItem: function (run) {
      var rng = rngOf(run);
      (run.bag = run.bag || []).push(waehle(rng, GD.items, inhaltsStufe(run), 1)[0].id);
      commit(run, rng);
    },
    grantUnit: function (run) {
      var rng = rngOf(run), pool = unitPool(run);
      if (pool.length) addUnit(run, waehle(rng, pool, inhaltsStufe(run), 1)[0].id);
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
    /* Belagerung nimmt auch die Erholung — sonst ist der Schritt von Stufe 3
       auf 4 gemessen nur zwei Punkte wert. */
    var f = regel(run, 'belagerung') ? 0.85 : 1;
    /* Drei verschiedene Antworten, nicht dreimal dieselbe Währung: Magicule
       jetzt, ein Ausrüstungsstück, oder dauerhafte Werte. */
    if (i === 0) run.magicules += Math.round(ertrag(140) * f);
    else if (i === 1) api.grantItem(run);
    else api.buffRandom(run, { hp: Math.round(30 * f), atk: Math.round(4 * f) });
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

  /* Zwei Einheiten direkt tauschen — mit `move` allein braucht ein Weg von
     Platz 5 nach 1 vier Klicks und vier Neuzeichnungen. */
  function swap(run, uidA, uidB) {
    var ids = run.team.map(function (m) { return m.uid; });
    var i = ids.indexOf(uidA), j = ids.indexOf(uidB);
    if (i < 0 || j < 0 || i === j) return false;
    var tmp = run.team[i]; run.team[i] = run.team[j]; run.team[j] = tmp;
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
      if (run.act > AKTE) { finish(run, true); return true; }
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
    if (won) {
      run.meta.wins++;
      /* Gewonnen auf der höchsten offenen Stufe: die nächste geht auf. */
      if ((run.threat || 0) >= (run.meta.threat || 0) && run.meta.threat < 5) {
        run.meta.threat = (run.meta.threat || 0) + 1;
        run.meta.threatGewaehlt = run.meta.threat;
        run.neueStufe = bedrohung(run.meta.threat);
      }
    }
    var score = (run.act - 1) * STEPS.length + run.step;
    run.meta.best = Math.max(run.meta.best || 0, won ? AKTE * STEPS.length : score);
    run.unlocked = unlock(run.meta, rng);
    commit(run, rng);
  }

  /* ---- Speichern ----------------------------------------------------------- */

  /* Version im Schlüssel: Phase 11 hat das Format unvereinbar geändert (Gold
     entfällt, der Startdraft ist ein Paar aus Einheit und Relikt, Passive werden
     gewählt). Ein alter Stand ließ die Startansicht abstürzen — der Spieler sah
     die neue Fassung nie. Beim Anheben verfällt der laufende Run — die Meta
     bleibt, sie hängt an einem eigenen, versionslosen Schlüssel. */
  var KEY = 'tensura-guild-v3';
  var ALTE_KEYS = ['tensura-guild', 'tensura-guild-v2'];
  /* Die Meta hängt bewusst NICHT an der Version: Freischaltungen und
     Bedrohungsstufe sind über Runs hinweg verdient und dürfen bei einem
     Formatwechsel nicht verfallen. */
  var META_KEY = 'tensura-guild-meta';
  var ALTE_META = ['tensura-guild-v2-meta', 'tensura-guild-meta-v2'];

  /* Der Belohnungsbildschirm muss ein Neuladen überleben — sonst ist die
     Belohnung weg, obwohl das Gold schon gutgeschrieben war. Vom Kampf wird
     nur das Nötige gespeichert, nicht das ganze Log. */
  function schlankesPending(run) {
    var p = run.pending;
    if (run.phase !== 'kampf' || !p || !p.rewards) return null;
    return {
      rewards: p.rewards, devour: p.devour, gold: p.gold,
      node: { name: p.node.name }, result: { winner: p.result.winner }
    };
  }

  function serialize(run) {
    return JSON.stringify({
      seed: run.seed, rngState: run.rngState, act: run.act, step: run.step, threat: run.threat,
      magicules: run.magicules, lives: run.lives, relics: run.relics,
      bag: run.bag || [], chronik: run.chronik, meta: run.meta, bosse: run.bosse,
      pwahlen: run.pwahlen || [],
      team: run.team, bank: run.bank, uidSeq: uidSeq, startwahl: run.startwahl,
      pending: schlankesPending(run)
    });
  }
  function deserialize(raw) {
    var d = JSON.parse(raw);
    var run = create(d.seed, d.meta);
    run.team = []; run.bank = [];
    ['rngState', 'act', 'step', 'threat', 'magicules', 'lives', 'relics', 'bag', 'chronik', 'team', 'bank', 'bosse']
      .forEach(function (k) { if (d[k] !== undefined) run[k] = d[k]; });
    uidSeq = Math.max(uidSeq, d.uidSeq || 0);
    run.pending = null;
    run.pwahlen = d.pwahlen || [];
    run.startwahl = d.startwahl || null;
    if (run.startwahl) { run.phase = 'start'; return run; }
    if (d.pending) {
      /* Offene Belohnung: zurück in den Ergebnisbildschirm, ohne Kampfwiederholung.
         Gewürfelt wird erst wieder in advance(). */
      run.phase = 'kampf';
      run.pending = d.pending;
      return run;
    }
    run.phase = 'karte';
    roll(run);
    return run;
  }
  function save(run) {
    try { localStorage.setItem(KEY, serialize(run)); return true; } catch (e) { return false; }
  }
  function load() {
    try {
      ALTE_KEYS.forEach(function (k) { localStorage.removeItem(k); });
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var run = deserialize(raw);
      /* Letzte Sicherung: was sich nicht sauber auflösen lässt, wird verworfen
         statt halb angezeigt. */
      if (run.startwahl && !(run.startwahl.offers || []).every(function (o) {
        return o && GD.unit(o.unit);
      })) return null;
      return run;
    } catch (e) { return null; }
  }
  function loadMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      /* Einmalige Übernahme aus der alten Fassung. */
      for (var i = 0; !raw && i < ALTE_META.length; i++) raw = localStorage.getItem(ALTE_META[i]);
      return raw ? JSON.parse(raw) : newMeta();
    } catch (e) { return newMeta(); }
  }
  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  root.Run = {
    create: create, newMeta: newMeta, resolve: resolve, member: member, abilities: abilities,
    choose: choose, advance: advance, takeReward: takeReward, devour: devour,
    rankUp: rankUp,
    passivWahl: passivWahl, choosePassive: choosePassive,
    passivIds: passivIds, hatLinien: hatLinien,
    chooseStart: chooseStart,
    rankName: rankName, rankCost: rankCost,
    BEDROHUNG: BEDROHUNG, bedrohung: bedrohung, bedrohungsFaktor: bedrohungsFaktor, regel: regel,
    regelnTest: regeln, rollTest: roll, EINSTIEG: EINSTIEG, EINSTIEG_HAERTE: EINSTIEG_HAERTE,
    itemSlots: itemSlots, aktivSlots: aktivSlots, passivSlots: passivSlots, praedatorSlots: praedatorSlots,
    buy: buy, eventChoose: eventChoose, camp: camp,
    equip: equip, unequip: unequip, move: move, bench: bench, deploy: deploy, entlassen: entlassen,
    find: find, addUnit: addUnit, swap: swap, unitPool: unitPool, relicPool: relicPool,
    entlassenWert: entlassenWert, darfEntlassen: darfEntlassen,
    belegteArten: belegteArten, freieArt: freieArt, waehle: waehle, gewicht: gewicht,
    inhaltsStufe: inhaltsStufe, boss: bossOf, STUFEN: STUFEN, ertrag: ertrag,
    buildTeile: buildTeile, resonanzen: resonanzen, analyse: analyse,
    save: save, load: load, clear: clear, loadMeta: loadMeta, saveMeta: saveMeta,
    serialize: serialize, deserialize: deserialize,
    TEAM_MAX: TEAM_MAX, BANK_MAX: BANK_MAX, STEPS: STEPS, RANK_NAME: RANK_NAME, AKTE: AKTE
  };
})(globalThis);
