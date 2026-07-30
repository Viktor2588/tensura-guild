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
  /* Kein Händler-Knoten mehr: nach JEDEM gewonnenen Kampf geht der Markt auf,
     ein eigener Knoten dafür wäre doppelt. Die drei Slots sind Kämpfe geworden. */
  var STEPS = [
    ['kampf', 'kampf', 'event'],
    ['kampf', 'event', 'pruefung'],
    ['kampf', 'pruefung', 'elite'],
    ['kampf', 'elite', 'lager'],
    ['lager', 'event', 'pruefung'],
    ['kampf', 'kampf', 'elite'],
    ['elite', 'pruefung', 'lager'],
    ['boss']
  ];

  /* ---- Kampfherausforderung ----------------------------------------------
     Ein normaler Kampf mit einer angesagten Auflage. Erfüllt gibt es die
     doppelte Belohnung, sonst die normale — das Risiko ist die Entscheidung,
     nicht die Kenntnis des Gegners. `pruef(res, run)` bekommt das Kampfergebnis
     und sagt, ob die Auflage stand.                                          */
  /* Der Kampf selbst ist härter als ein gewöhnlicher — sonst wäre die Auflage
     ein Geschenk. Gemessen wurden die ersten Auflagen zu 92–100 % gehalten. */
  var PRUEFUNG_HAERTE = 1.9;
  var PRUEFUNG_BONUS = 0.6;        // gehaltene Auflage: so viel Magicule obendrauf
  var PRUEFUNGEN = [
    { id: 'ohne_verlust', name: 'Ohne einen Verlust',
      text: 'Keine deiner Einheiten darf fallen.',
      pruef: function (res) {
        return !res.fallen.some(function (f) { return f.side === 'player'; });
      } },
    { id: 'schnell', name: 'Kurzer Prozess',
      text: 'Der Kampf muss in höchstens 22 Zügen entschieden sein.',
      pruef: function (res) { return res.ticks <= 22; } },
    { id: 'unversehrt', name: 'Unversehrt',
      text: 'Deine vorderste Einheit muss über drei Vierteln ihres Lebens bleiben.',
      pruef: function (res) {
        var vorn = res.survivors.filter(function (u) { return u.side === 'player'; })[0];
        return !!vorn && vorn.hp > vorn.maxHp * 0.75;
      } },
    { id: 'unterzahl', name: 'In Unterzahl',
      text: 'Nur deine ersten zwei Einheiten treten an — der Rest sieht zu.',
      vorher: function (run) { return { team: run.team.slice(0, 2) }; },
      pruef: function () { return true; } }
  ];
  var TYP_NAME = { kampf: 'Kampf', elite: 'Elite-Kampf', pruefung: 'Kampfherausforderung',
                   event: 'Ereignis', shop: 'Händler', lager: 'Lager', boss: 'Boss' };

  function pruefung(id) {
    for (var i = 0; i < PRUEFUNGEN.length; i++) if (PRUEFUNGEN[i].id === id) return PRUEFUNGEN[i];
    return null;
  }
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

  var START_UNITS = ['rimuru', 'gobta', 'gobkyu', 'sturmwolf',
    'rigurd', 'rigur', 'gobwa', 'kurobe', 'souka',
    'daemonengarde', 'gruftwaechter', 'drachenknecht', 'quellenpriesterin',
    'ranga', 'shion', 'gabiru', 'wightkoenig',
    /* Der Orkkrieger ist der billigste Frontkämpfer im Spiel und gehört damit
       in den Startbestand; Phobio bringt die neue Bestien-Art gleich mit. */
    'orkkrieger', 'phobio'];
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
  var GRUNDHAERTE = 1.01;   // S bleibt auch im Endspiel selten (Phase 53); gemessen 51 %

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
  var PREIS_EINHEIT = 130, PREIS_ITEM = 3, PREIS_RELIKT = 340;
  /* Anteil am regulären Rangpreis (140/300/560) — die Weihe bleibt günstiger. */

  /* Der Start bleibt bescheiden: höchstens ungewöhnliche Relikte. Ein
     legendäres in der ersten Wahl nimmt dem Run seine Kurve — das Starke soll
     erspielt werden, nicht ausgewürfelt. */
  var START_MAX_RARITAET = 2;
  function ertrag(x) { return Math.round(x * WACHSTUM); }

  /* Gegnerhärte je Stufe — greift auf denselben mult wie die Begegnung selbst. */
  function bedrohungsFaktor(run, node) {
    var t = run.threat || 0;
    /* Klein halten: die Kurve ist steil, 20 % mehr Gegnerwerte kippen fast jeden
       Run. Gemessen mit `node dev/balance.js 500 --stufe N`. */
    /* Nur noch ein leiser Anstieg: die Regeln oben tragen die Härte. */
    var f = GRUNDHAERTE + 0.012 * Math.min(t, 5);
    if (node && node.type === 'pruefung') f *= PRUEFUNG_HAERTE;
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

    d.itemZahl = m.items.length;              // Kurobes Linie rechnet damit
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
    /* Kein Relikt zweimal: zwei Anfänge mit demselben Relikt sind zwei Mal
       dieselbe halbe Entscheidung. Vergeben wird über alle vier hinweg. */
    var vergeben = {};
    run.startwahl = {
      offers: einheiten.map(function (u) {
        /* Ein Relikt, das die Schlüsselwörter der Einheit trifft — sonst ist
           das Paar zufällig statt eine Ansage. */
        var sig = AB.get(u.signature);
        var kw = (sig ? sig.keywords : []).concat();
        var preset = presetLinePassive(run, u.id, rng);
        if (preset && preset.id) {
          var ab = AB.get(preset.id);
          if (ab) kw = kw.concat(ab.keywords || [], ab.amplifies || []);
        } else {
          (u.passives || []).forEach(function (pid) {
            var ab = AB.get(pid);
            if (ab) kw = kw.concat(ab.keywords || [], ab.amplifies || []);
          });
        }
        var offen = relPool.filter(function (r) {
          return !r.bedingung && !vergeben[r.id] && (r.rarity || 1) <= START_MAX_RARITAET;
        });
        /* Sollte der Topf je zu klein werden, lieber ein selteneres Relikt als
           gar keins — mit den jetzigen Daten tritt das nicht ein. */
        if (!offen.length) offen = relPool.filter(function (r) { return !r.bedingung && !vergeben[r.id]; });
        var passend = offen.filter(function (r) {
          return (r.keywords || []).concat(r.amplifies || []).some(function (k) { return kw.indexOf(k) >= 0; });
        });
        var r = waehle(rng, passend.length ? passend : offen, 1, 1)[0];
        if (r) vergeben[r.id] = 1;
        return { unit: u.id, relic: r ? r.id : null, passive: preset ? preset.id : null };
      })
    };
    commit(run, rng);
  }

  function chooseStart(run, i) {
    if (!run.startwahl) return false;
    var o = run.startwahl.offers[i];
    if (!o || !addUnit(run, o.unit, o.passive)) return false;
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

  /* Die vorausgewählte Start-Passive zieht aus der Haupt-RNG des Runs: zwei
     Angebote derselben Einheit sollen nicht dieselbe Passive tragen. Wer keine
     RNG mitbringt (Ereignis-Belohnung), bekommt einen eigenen Zug samt commit.
     Das Ergebnis wandert ins Angebot, damit Anzeige und Anwerbung übereinstimmen. */
  function presetLinePassive(run, unitId, rng) {
    if (!AB.linien[unitId]) return null;
    /* Der mitgebrachte Start trägt keinen Preis: eine geänderte Regel samt
       Nachteil aufgedrängt zu bekommen, bevor man die Einheit überhaupt
       gespielt hat, ist keine Entscheidung. */
    var offers = AB.linienAngebot(unitId).filter(function (o) { return !o.preis; });
    if (!offers.length) return null;
    var eigen = !rng;
    if (eigen) rng = rngOf(run);
    var p = root.RNG.pick(rng, offers);
    if (eigen) commit(run, rng);
    return p;
  }

  /* ---- Einheiten kommen fertig aus dem Markt ------------------------------
     Vorher gab es zwei Wege zu einem starken Trupp: Einheiten anwerben und sie
     danach einzeln aufwerten (plus die Namensweihe als verbilligter Aufstieg auf
     ein ausgelostes Ziel). Das waren drei Posten fuer eine Frage, und die
     Namensweihe war nur ein Rabatt mit Wuerfel davor.

     Jetzt ist es EIN Posten: eine Einheit steht im Markt schon auf ihrem Rang,
     mit den Passiven, die zu diesem Rang gehoeren. Man kauft ein fertiges
     Paket und sieht vorher genau, was drin ist.

     Passive je Rang — dieselbe Zahl, die `PASSIV_SLOTS` ohnehin freischaltet:
       C = 1, B = 2, A = 3, S = 4                                               */
  /* Der Rang ist eine ACHSE, nicht ein Lostopf: auf ihr steht ein Fenster aus
     zwei Nachbarraengen, und der gebrochene Anteil der Position IST die
     Wahrscheinlichkeit fuer den oberen der beiden.

     Die Positionen stehen als Tabelle da und nicht als Formel, weil sie eine
     ABSICHT ausdruecken und keine Rechnung: C ist nach kurzer Zeit durch, die
     Mitte gehoert B und A, und **S bleibt auch im Endspiel selten** — es soll
     etwas sein, worueber man sich freut, kein Normalfall. Eine lineare Formel
     kann das nicht, weil sie am Anfang und am Ende dieselbe Steigung haette.

       Stufe 1   0,30    70 % C / 30 % B      der Anfang
       Stufe 2   1,05    95 % B /  5 % A      C ist durch
       Stufe 3   1,55    45 % B / 55 % A      die Mitte
       Stufe 4   1,90    10 % B / 90 % A
       Stufe 5   2,15    85 % A / 15 % S      das Endspiel — S ist der Glueckstreffer
       Stufe 6   2,30    70 % A / 30 % S      nur nach Elite und Boss

     Stufe 6 gibt es nur durch den Elite- und Bossbonus. Damit ist der beste Ort
     fuer ein S der Markt nach einem schweren Kampf — die Freude haengt an einer
     Leistung statt an der Rundenzahl. */
  var RANG_POSITION = [0.30, 1.05, 1.55, 1.90, 2.15, 2.30];

  function rangFenster(stufe) {
    var st = Math.max(1, Math.min(RANG_POSITION.length, stufe || 1));
    return RANG_POSITION[st - 1];
  }

  /* Der hoechste Rang, den das Fenster ueberhaupt hergibt. Zwei Stellen brauchen
     ihn: der Wurf selbst und — wichtiger — die AUFWERTUNG. Ohne diese Grenze
     umging sie das Fenster vollstaendig: `vorhanden.rank + 1` machte aus jeder
     A-Einheit im Trupp ein S-Angebot, egal was die Stufe sagt. Ein Trupp aus
     A-Einheiten haette im Endspiel also dauernd S-Posten gesehen, und die
     Seltenheit waere genau dort verschwunden, wo sie zaehlt. */
  function rangObergrenze(stufe) {
    return Math.min(3, Math.floor(rangFenster(stufe)) + 1);
  }

  function wuerfleRang(rng, stufe) {
    var t = rangFenster(stufe);
    var unten = Math.floor(t);
    return (rng() < t - unten) ? Math.min(3, unten + 1) : unten;
  }

  /* `anzahl` Passive aus dem eigenen Topf der Einheit, ohne Wiederholung.
     Passive MIT Preis (die Keystones, die eine Regel gegen einen Nachteil
     tauschen) bleiben draussen: sie sind eine Entscheidung, und aufgedraengt
     bekommt man sie schon beim Startzustand bewusst nicht. */
  function wuerfleLinienPassive(unitId, anzahl, rng) {
    var topf = AB.linienAngebot(unitId).filter(function (o) { return !o.preis; });
    var out = [];
    while (out.length < anzahl && topf.length) {
      out.push(topf.splice(Math.floor(rng() * topf.length), 1)[0].id);
    }
    return out;
  }

  /* Was eine fertige Einheit kostet: der Anwerbepreis plus genau die Aufstiege,
     die man sonst bezahlt haette. Kein Rabatt und kein Zuschlag — der Markt
     nimmt einem die Arbeit ab, nicht das Geld. */
  function rangPreis(u, rang) {
    var p = PREIS_EINHEIT + u.cost * 45;
    for (var r = 0; r < rang; r++) p += RANK_COST[r];
    return p;
  }

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
    /* Auf gültige Akte begrenzen: ein Speicherstand hinter dem letzten Akt gab
       sonst `undefined` zurück und ließ roll() abstürzen. */
    var a = Math.max(1, Math.min(akt || run.act, AKTE));
    var id = (run.bosse || [])[a - 1];
    return (id && EN.bossById(id)) || EN.bossPool(a)[0];
  }

  function roll(run) {
    var rng = rngOf(run);
    var st = inhaltsStufe(run);
    /* Nach dem letzten Akt gibt es keine Begegnungen mehr — dann nicht würfeln. */
    if (!EN.forAct(st).length) { run.options = []; return; }
    var types = STEPS[run.step];
    run.options = types.map(function (type) {
      if (type === 'kampf' || type === 'elite' || type === 'pruefung') {
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
        /* Kein Gegnername im Knoten: die Wahl ist die Art des Knotens, nicht die
           Kenntnis der Gegner. Vorher versprach die Vorschau vier Gegner und es
           traten während des Einstiegs tatsächlich ein bis zwei an. */
        var pool = type === 'elite' ? EN.elitesForAct(st) : EN.forAct(st);
        var e = root.RNG.pick(rng, pool);
        var knoten = { type: type, name: TYP_NAME[type], encounter: e, belagert: belagert };
        if (type === 'pruefung') knoten.pruefung = root.RNG.pick(rng, PRUEFUNGEN).id;
        return knoten;
      }
      if (type === 'boss') {
        var b = bossOf(run);
        return { type: 'boss', name: 'BOSS: ' + b.name, encounter: b };
      }
      if (type === 'event') {
        return { type: 'event', name: TYP_NAME.event, event: root.RNG.pick(rng, EN.eventsForAct(st)) };
      }
      if (type === 'shop') return { type: 'shop', name: TYP_NAME.shop };
      return { type: 'lager', name: TYP_NAME.lager };
    });
    commit(run, rng);
  }

  /* ---- Knoten betreten --------------------------------------------------- */

  function choose(run, i) {
    if (run.phase !== 'karte' || run.over) return null;
    var node = run.options[i];
    if (!node) return null;
    run.node = node;
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
    /* Eine Auflage darf auch den Trupp beschneiden, der antritt. */
    var p = node.pruefung ? pruefung(node.pruefung) : null;
    var antritt = (p && p.vorher ? p.vorher(run).team : run.team);
    var res = C.simulate(antritt.map(resolve), foes, seed, { relics: run.relics.map(GD.relic) });
    run.phase = 'kampf';
    /* Die Bilanz getrennt vom Log: der Ergebnisbildschirm braucht sie auch nach
       einem Neuladen, und das ganze Kampflog wandert nicht in den Speicherstand. */
    var meine = function (l) { return l.filter(function (u) { return u.side === 'player'; }); };
    run.pending = {
      result: res, node: node, devour: null,
      bilanz: {
        ticks: res.ticks,
        lebend: meine(res.survivors).length,
        gefallen: meine(res.fallen).map(function (u) { return u.name; })
      }
    };

    if (res.winner === 'player') {
      /* Eine Währung. Gold und Magicule waren dieselbe Zahl in zwei Beuteln:
         beide kamen aus Kämpfen, beide gingen in Truppstärke. */
      var beute = ertrag(node.encounter.beute * (node.belagert ? 0.75 : 1)) +
        ertrag(MAG_JE_KAMPF + inhaltsStufe(run) * 15);
      run.magicules += beute;
      /* Auflage erfüllt: mehr Magicule und ein Posten mehr im Markt. */
      if (p) {
        run.pending.bestanden = p.pruef(res, run);
        if (run.pending.bestanden) {
          var bonus = Math.round(beute * PRUEFUNG_BONUS);
          run.magicules += bonus;
          beute += bonus;
        }
      }
      run.pending.gold = beute;
      /* Der Markt statt einer Belohnungskarte: was der Kampf einbringt, wird
         hier ausgegeben — Einheiten, Ausrüstung, Relikte. */
      run.pending.markt = marktOffers(run, node, run.pending.bestanden);
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

  /* Belegte Arten waren hier ausgeschlossen — richtig, solange eine Einheit
     nur EINMAL in den Trupp konnte. Seit Phase 51 ist der Markt aber der
     Aufwertungsweg: eine belegte Art darf angeboten werden, wenn der Rang des
     Angebots ueber dem liegt, was schon da steht. Ohne diese Ausnahme erschien
     nie ein Aufstieg, und der Trupp blieb auf seinen Startraengen sitzen —
     gemessen 2 % Siege und 3,3 Rangstufen statt 14. */
  function unitPool(run, hoechsterRang) {
    var st = inhaltsStufe(run);
    var maxCost = st <= 2 ? 3 : st === 3 ? 4 : 5;
    var belegt = belegteArten(run);
    var raenge = {};
    run.team.concat(run.bank).forEach(function (m) {
      var a = GD.unit(m.id).art;
      if (raenge[a] === undefined || m.rank < raenge[a]) raenge[a] = m.rank;
    });
    return run.meta.unlockedUnits.map(GD.unit).filter(function (u) {
      if (!u || u.cost > maxCost) return false;
      if (belegt.indexOf(u.art) < 0) return true;
      /* Belegt: nur, wenn ueberhaupt ein besserer Rang gezogen werden KANN. */
      return (hoechsterRang || 0) > raenge[u.art];
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

  /* Wen ersetzt dieses Angebot? Seit Phase 51 ist der Markt der Aufwertungsweg:
     Raenge werden nicht mehr einzeln gekauft, also muss eine bessere Fassung
     derselben Art die alte ERSETZEN koennen. Ohne das war der Rang bei vollem
     Trupp fuer immer eingefroren — gemessen fiel die Siegquote damit auf 2 %,
     weil `addUnit` an der belegten Art scheiterte und niemand je aufstieg.

     Nur nach oben: eine schwaechere Fassung zu kaufen ist kein Aufstieg, sondern
     ein Versehen. Der Einsatz der alten Einheit kommt als Anrechnung zurueck,
     wie beim Entlassen — sonst zahlt man denselben Weg zweimal. */
  function ersetzbar(run, u, rang) {
    if (freieArt(run, u.art)) return null;
    var alt = run.team.concat(run.bank).filter(function (m) {
      return GD.unit(m.id).art === u.art;
    })[0];
    return (alt && rang > alt.rank) ? alt : null;
  }

  function addUnit(run, id, startPassiveId, rang, passiveListe) {
    var u = GD.unit(id);
    if (!u) return false;
    if (!freieArt(run, u.art)) {
      /* Aufwertung derselben Art: die alte Einheit macht Platz und ihr Einsatz
         wird angerechnet. Die Ausruestung wandert zurueck in den Beutel. */
      var weg = ersetzbar(run, u, rang || 0);
      if (!weg) return false;
      var platz = run.team.map(function (x) { return x.uid; }).indexOf(weg.uid);
      weg.items.slice().forEach(function (iid) { unequip(run, weg.uid, iid); });
      /* Der GANZE Einsatz zurueck, nicht ein Viertel wie beim Entlassen: das
         hier ist kein Verkauf, sondern derselbe Weg ein Stueck weiter. Mit nur
         einem Viertel kostete eine Aufwertung gemessen das Zweieinhalbfache
         eines alten Rangschritts, und die Siegquote blieb bei 15 %. Netto zahlt
         man jetzt die Differenz — genau das, was „aufwerten" hiess. */
      run.magicules += investiert(weg);
      run.chronik.push('Aufwertung: ' + GD.unit(weg.id).name + ' (Rang ' + rankName(weg) +
        ') weicht ' + u.name + ' (Rang ' + RANK_NAME[rang || 0] + ')');
      if (platz >= 0) run.team.splice(platz, 1);
      else run.bank.splice(run.bank.map(function (x) { return x.uid; }).indexOf(weg.uid), 1);
    }
    var m = member(id);
    if (rang) m.rank = Math.max(0, Math.min(3, rang));
    /* ponytail: Frontlinie rückt beim Anwerben direkt auf Platz 1 — Abkürzung
       aus TODO.md, damit man zum Testen nicht jedes Mal von Hand umstellt.
       Wieder auf `push` setzen, sobald die Aufstellung Spielerentscheidung ist. */
    if (run.team.length < TEAM_MAX) {
      if (u.tags[1] === 'front') run.team.unshift(m); else run.team.push(m);
    }
    else if (run.bank.length < BANK_MAX) run.bank.push(m);
    else return false;

    /* Task 3: Startzustand ist zufällig — die erste Linien-Passive wird
       vorausgewählt, damit beim Anwerben keine Auswahl-Karten erscheinen. */
    if (hatLinien(m)) {
      /* Eine gekaufte Einheit bringt ihr Paket schon mit — dann wird hier nichts
         mehr gezogen und danach keine Wahl geoeffnet. Der Spieler hat am
         Marktposten entschieden, ein zweiter Bildschirm waere ein Klick ohne
         Inhalt (dasselbe Argument wie bei der alten Namensweihe). */
      if (passiveListe && passiveListe.length) m.passives = passiveListe.slice();
      else if (startPassiveId) m.passives = [startPassiveId];
      else {
        var preset = presetLinePassive(run, id);
        if (preset) m.passives = [preset.id];
      }
    }
    if (!(passiveListe && passiveListe.length)) passivAngebot(run, m, true);
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
  /* Wiederverkauf zum selben Satz wie beim Entlassen: ein Viertel. Sonst wird
     der Markt zur Drehtür, in der man Fehlkäufe folgenlos rückgängig macht. */
  function itemWert(id) {
    var it = GD.item(id);
    return it ? Math.round(it.cost * PREIS_ITEM * RUECKGABE) : 0;
  }
  function reliktWert(id) { return Math.round(PREIS_RELIKT * RUECKGABE); }

  function verkaufeItem(run, id) {
    if (!darfEntlassen(run)) return false;
    var bag = run.bag || [];
    var i = bag.indexOf(id);
    if (i < 0) return false;
    bag.splice(i, 1);
    run.magicules += itemWert(id);
    return true;
  }
  function verkaufeRelikt(run, id) {
    if (!darfEntlassen(run)) return false;
    var i = run.relics.indexOf(id);
    if (i < 0) return false;
    run.relics.splice(i, 1);
    run.magicules += reliktWert(id);
    return true;
  }
  function entlassenWert(m) { return Math.round(investiert(m) * RUECKGABE); }

  /* Nicht während der Kampfauflösung — da wäre der Trupp ein anderer als der,
     der gerade kämpft. Der Markt NACH dem Kampf zählt schon zur Truppenpflege:
     dort wird gekauft und verkauft. */
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

  /* Rang steigt seit Phase 51 nicht mehr gegen Geld: Einheiten kommen fertig aus
     dem Markt. Uebrig bleibt der GRATIS-Aufstieg aus dem Lager — eine Belohnung,
     kein Kaufposten. Der Parameter `festePassive` ist mit der Namensweihe weg. */
  function rankUp(run, uid, gratis, egal) {
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

  var KATEGORIEN = ['angriff', 'mechanik', 'unterstuetzung', 'defensive'];
  var PASSIV_ANGEBOTE = 4;

  /* Bis zu `n` Passive aus der geteilten Bibliothek, höchstens eine je
     Kategorie. Innerhalb der Kategorie zieht das Thema der Einheit vor: eine
     Gift-Einheit sieht eher Gift. Die Kategorie selbst steht fest, damit das
     Angebot nicht vier Mal dieselbe Rolle zeigt. */
  function bibliotheksAngebot(run, m, hab, n) {
    var rng = rngOf(run);
    var kw = AB.keywords(abilities(m));
    var frei = AB.passives.filter(function (p) {
      return !AB.linien_ids[p.id] && hab.indexOf(p.id) < 0;
    });
    var katen = KATEGORIEN.concat();
    if (n < katen.length) katen = waehle(rng, katen.map(function (k) { return { id: k }; }), 1, n)
      .map(function (x) { return x.id; });
    var offers = [];
    katen.forEach(function (kat) {
      var inKat = frei.filter(function (p) { return AB.kategorie(p.id) === kat; });
      if (!inKat.length) return;
      var passend = inKat.filter(function (p) {
        return (p.keywords || []).concat(p.amplifies || []).some(function (k) { return kw[k]; });
      });
      var p = waehle(rng, passend.length && rng() < 0.7 ? passend : inKat,
                     inhaltsStufe(run) + m.rank - 1, 1)[0];
      if (p) offers.push({ linie: kat, linieName: AB.LINIEN_NAME[kat], id: p.id, bibliothek: true });
    });
    commit(run, rng);
    return offers;
  }

  function passivAngebot(run, m, beiAnwerbung) {
    var hab = m.passives || [];
    var offers;
    if (hatLinien(m)) {
      /* Der Startzustand ist bereits vorausgewählt. */
      if (beiAnwerbung && hab.length >= 1) return;
      /* Keine Stufen und keine Quote je Linie: die eigenen Passiven einer Einheit
         sind ein Topf, aus dem vier gezogen werden — egal aus welcher Linie.
         Dass es heute sechzehn sind und vier je Linie, ist Inhalt, keine Regel;
         wächst der Topf, zieht diese Stelle unverändert weiter. */
      var rng = rngOf(run);
      var topf = AB.linienAngebot(m.id).filter(function (o) { return hab.indexOf(o.id) < 0; });
      offers = [];
      while (offers.length < PASSIV_ANGEBOTE && topf.length) {
        offers.push(topf.splice(Math.floor(rng() * topf.length), 1)[0]);
      }
      commit(run, rng);
      if (!offers.length) return;
      /* Wer eine Regel ändert, kostet dafür etwas — halbe Rüstung, kein Heilen,
         gedrosselter Angriff. Solche Passiven müssen ablehnbar sein, sonst sind
         sie ein Zwang. Daneben steht die geteilte Bibliothek: schwächer, aber
         ohne Preis. Das ist zugleich der einzige Weg, auf dem die 34
         Bibliotheks-Passiven überhaupt noch zum Spieler kommen — seit alle 40
         Einheiten Linien haben, greift `passivIds` nie mehr auf die feste Liste
         aus data.js zu. */
      if (offers.some(function (o) { return o.preis; })) {
        offers = offers.concat(bibliotheksAngebot(run, m, hab, 2));
        offers.push({ linieName: 'Verzicht', verzicht: true, id: null });
      }
      (run.pwahlen = run.pwahlen || []).push({ uid: m.uid, offers: offers });
      return;
    }
    /* Ohne eigene Linien: eine Passive aus JEDER Kategorie, zufällig gezogen.
       Vorher stand die feste nächste Passive der Einheit im Angebot — dieselbe
       Einheit entwickelte sich damit in jedem Run gleich. Bei der Anwerbung
       gibt es nichts zu wählen: Rang C hat keinen Passiv-Slot. */
    if (beiAnwerbung || m.rank < 1) return;
    m.durfteWaehlen = 1;
    offers = bibliotheksAngebot(run, m, hab, 4);
    if (offers.length) (run.pwahlen = run.pwahlen || []).push({ uid: m.uid, offers: offers });
  }

  function passivWahl(run) { return (run.pwahlen || [])[0] || null; }

  function choosePassive(run, i) {
    var w = passivWahl(run);
    if (!w) return false;
    var o = w.offers[i];
    var m = find(run, w.uid);
    if (!o || !m) return false;
    run.pwahlen.shift();
    if (o.verzicht) {
      run.chronik.push('Passive: ' + GD.unit(m.id).name + ' lehnt den Keystone ab');
      return true;
    }
    m.passives = (m.passives || []).concat(o.id);
    run.chronik.push('Passive: ' + GD.unit(m.id).name + ' wählt ' + AB.get(o.id).name);
    return true;
  }


  /* ---- Shop ---------------------------------------------------------------- */

  /* Der Markt nach dem Kampf. Elite und Boss zahlen sich auch hier aus: sie
     würfeln eine Inhaltsstufe höher, eine gehaltene Auflage gibt einen Posten
     mehr. */
  function marktOffers(run, node, bestanden) {
    var stark = node && (node.type === 'elite' || node.type === 'boss');
    return shopOffers(run, stark ? 1 : 0, bestanden ? 1 : 0);
  }

  function shopOffers(run, stufenBonus, extra) {
    var rng = rngOf(run);
    var offers = [];
    var st = inhaltsStufe(run) + (stufenBonus || 0);
    /* Kriegsrecht: EIN Angebot statt drei. Ganz ohne Einheiten war die Stufe
       gemessen härter als die nächsthöhere (13 gegen 20 % Siege) — die Kurve lief
       rückwärts, weil ein Trupp, dem eine Rolle fehlt, gar nicht mehr aufholt. */
    /* Vier Einheiten, jede auf einem gewuerfelten Rang. Das ist der Markt: die
       Frage ist nicht mehr „anwerben oder aufwerten", sondern welches der vier
       fertigen Pakete zum Trupp passt. */
    /* Der Pool kennt dieselbe Obergrenze wie der Wurf — sonst stehen Arten im
       Angebot, deren Aufwertung das Fenster gar nicht hergibt. */
    var obergrenze = rangObergrenze(st);
    themenWahl(run, rng, unitPool(run, obergrenze), st,
               (regel(run, 'kriegsrecht') ? 2 : 4) + (extra || 0))
      .forEach(function (u) {
        var rang = wuerfleRang(rng, st);
        /* Steht die Art schon im Trupp, ist das Angebot eine Aufwertung — dann
           muss der Rang darueber liegen, sonst waere der Posten unkaufbar. */
        var vorhanden = run.team.concat(run.bank).filter(function (m) {
          return GD.unit(m.id).art === u.art;
        })[0];
        if (vorhanden) rang = Math.max(rang, Math.min(obergrenze, vorhanden.rank + 1));
        var pas = wuerfleLinienPassive(u.id, rang + 1, rng);
        offers.push({ kind: 'unit', id: u.id, name: u.name,
                      rang: rang, rangName: RANK_NAME[rang],
                      price: rangPreis(u, rang),
                      text: unitText(u), rarity: u.rarity,
                      passive: pas[0] || null,
                      passives: pas,
                      passiveNamen: pas.map(function (pid) {
                        var ab = AB.get(pid);
                        return ab ? ab.name : pid;
                      }) });
      });
    themenWahl(run, rng, GD.items, st, 1 + (extra || 0)).forEach(function (it) {
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
    commit(run, rng);
    return offers;
  }

  function buy(run, i, uid) {
    var liste = run.pending && (run.pending.markt || run.pending.offers);
    var o = liste && liste[i];
    if (!o || o.sold || run.magicules < o.price) return false;
    if (o.kind === 'unit' &&
        !addUnit(run, o.id, o.passive, o.rang, o.passives)) return false;
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

  /* Drei Bildschirme statt zweier: Kampf -> Ergebnis -> Verwaltung. Der Markt
     hing vorher am Ergebnis, also lief beides auf einer Seite. */
  function zumMarkt(run) {
    if (run.phase !== 'kampf' || !run.pending || !run.pending.markt) return false;
    run.phase = 'markt';
    return true;
  }

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
    if (!p || !p.markt || (run.phase !== 'kampf' && run.phase !== 'markt')) return null;
    return {
      markt: p.markt, bestanden: p.bestanden, devour: p.devour, gold: p.gold,
      bilanz: p.bilanz, node: { name: p.node.name }, result: { winner: p.result.winner }
    };
  }

  function serialize(run) {
    return JSON.stringify({
      seed: run.seed, rngState: run.rngState, act: run.act, step: run.step, threat: run.threat,
      magicules: run.magicules, lives: run.lives, relics: run.relics,
      bag: run.bag || [], chronik: run.chronik, meta: run.meta, bosse: run.bosse, phase: run.phase,
      over: run.over, won: run.won,
      pwahlen: run.pwahlen || [],
      team: run.team, bank: run.bank, uidSeq: uidSeq, startwahl: run.startwahl,
      pending: schlankesPending(run)
    });
  }
  function deserialize(raw) {
    var d = JSON.parse(raw);
    /* Die Meta ist GLOBALER Fortschritt und gehört nicht dem Run. Sie stand
       trotzdem mit im Speicherstand, und das Laden baute sie daraus neu — also
       auf dem Stand von Rundenbeginn. Jede folgende Aktion schrieb diese alte
       Kopie über den echten Fortschritt: gewonnene Bedrohungsstufen und
       freigeschaltete Einheiten verschwanden wieder. Der Speicher hat Vorrang,
       die eingebettete Kopie ist nur noch der Notnagel für Stände ohne eigenen
       Meta-Eintrag. */
    var meta = loadMeta();
    if (d.meta && !gespeicherteMeta()) meta = d.meta;
    var run = create(d.seed, meta);
    run.team = []; run.bank = [];
    ['rngState', 'act', 'step', 'threat', 'magicules', 'lives', 'relics', 'bag', 'chronik', 'team', 'bank', 'bosse']
      .forEach(function (k) { if (d[k] !== undefined) run[k] = d[k]; });
    uidSeq = Math.max(uidSeq, d.uidSeq || 0);
    run.pending = null;
    run.pwahlen = d.pwahlen || [];
    /* Ein beendeter Run bleibt beendet. Ohne das kam er als unfertiger zurück —
       mit einer Aktnummer hinter dem letzten Akt, und der nächste Wurf der Karte
       suchte einen Boss, den es nicht gibt. */
    if (d.over) {
      run.over = true; run.won = !!d.won; run.phase = 'ende'; run.options = [];
      return run;
    }
    run.startwahl = d.startwahl || null;
    if (run.startwahl) { run.phase = 'start'; return run; }
    if (d.pending) {
      /* Offener Markt: zurück in den Bildschirm, in dem gespeichert wurde, ohne
         Kampfwiederholung. Gewürfelt wird erst wieder in advance(). */
      run.phase = d.phase === 'markt' ? 'markt' : 'kampf';
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
      if (!raw) return newMeta();
      var meta = JSON.parse(raw);
      /* Ohne ausdrückliche Wahl gilt die höchste freigeschaltete Stufe. Sonst
         bleibt `threatGewaehlt` auf 0 stehen und jeder Run läuft still auf der
         niedrigsten Stufe weiter, obwohl längst eine höhere offen ist. */
      if (meta.threatGewaehlt === undefined || meta.threatGewaehlt === null) {
        meta.threatGewaehlt = meta.threat || 0;
      }
      /* Gestrichene Einheiten und Relikte aus alten Ständen entfernen — sonst
         zeigt der Fortschritt „40 / 38" und die Freischaltung glaubt, sie sei
         fertig, obwohl noch etwas fehlt. */
      meta.unlockedUnits = (meta.unlockedUnits || []).filter(function (id) { return !!GD.unit(id); });
      meta.unlockedRelics = (meta.unlockedRelics || []).filter(function (id) { return !!GD.relic(id); });
      /* Und der weiteste Weg kann nicht länger sein, als der Lauf überhaupt ist:
         frühere Fassungen hatten fünf Akte. */
      meta.best = Math.min(meta.best || 0, AKTE * STEPS.length);
      /* Siege ohne Bedrohungsstufe kann es nicht geben — der erste Sieg hebt sie
         immer. Wer beides hat, hat den Fortschritt an den Meta-Bug oben verloren
         (der Speicherstand des Runs trug eine alte Kopie und überschrieb ihn).
         Eng gefasst nachholen, statt jemanden fünfzehn Siege noch einmal
         spielen zu lassen. */
      if ((meta.wins || 0) > 0 && !(meta.threat || 0)) {
        meta.threat = Math.min(5, meta.wins);
        meta.threatGewaehlt = meta.threat;
      }
      return meta;
    } catch (e) { return newMeta(); }
  }
  /* Alle Zugriffe auf den Speicher liegen hinter try/catch: der UI-Test läuft
     ohne localStorage, und ein privates Browserfenster wirft ebenfalls. */
  function gespeicherteMeta() {
    try { return localStorage.getItem(META_KEY); } catch (e) { return null; }
  }
  function saveMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {}
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  root.Run = {
    create: create, newMeta: newMeta, resolve: resolve, member: member, abilities: abilities,
    choose: choose, advance: advance, devour: devour, zumMarkt: zumMarkt,
    rankUp: rankUp,
    passivWahl: passivWahl, choosePassive: choosePassive,
    passivIds: passivIds, hatLinien: hatLinien,
    chooseStart: chooseStart,
    rankName: rankName, rankCost: rankCost,
    BEDROHUNG: BEDROHUNG, bedrohung: bedrohung, bedrohungsFaktor: bedrohungsFaktor, regel: regel,
    regelnTest: regeln, rollTest: roll, EINSTIEG: EINSTIEG, EINSTIEG_HAERTE: EINSTIEG_HAERTE,
    START_MAX_RARITAET: START_MAX_RARITAET,
    itemSlots: itemSlots, aktivSlots: aktivSlots, passivSlots: passivSlots, praedatorSlots: praedatorSlots,
    buy: buy, eventChoose: eventChoose, camp: camp, marktOffers: marktOffers,
    equip: equip, unequip: unequip, move: move, bench: bench, deploy: deploy, entlassen: entlassen,
    find: find, addUnit: addUnit, swap: swap, unitPool: unitPool, relicPool: relicPool,
    entlassenWert: entlassenWert, darfEntlassen: darfEntlassen,
    verkaufeItem: verkaufeItem, verkaufeRelikt: verkaufeRelikt,
    itemWert: itemWert, reliktWert: reliktWert,
    belegteArten: belegteArten, freieArt: freieArt, waehle: waehle, gewicht: gewicht,
    inhaltsStufe: inhaltsStufe, boss: bossOf, STUFEN: STUFEN, ertrag: ertrag,
    PRUEFUNGEN: PRUEFUNGEN, pruefung: pruefung, TYP_NAME: TYP_NAME,
    RANK_COST: RANK_COST, wuerfleRang: wuerfleRang, rangPreis: rangPreis,
    rangObergrenze: rangObergrenze,
    ersetzbar: ersetzbar,
    buildTeile: buildTeile, resonanzen: resonanzen, analyse: analyse,
    save: save, load: load, clear: clear, loadMeta: loadMeta, saveMeta: saveMeta,
    serialize: serialize, deserialize: deserialize,
    TEAM_MAX: TEAM_MAX, BANK_MAX: BANK_MAX, STEPS: STEPS, RANK_NAME: RANK_NAME, AKTE: AKTE
  };
})(globalThis);
