/* js/combat.js — Kampfauflösung. Reine Funktion, kein DOM, kein Math.random.
   simulate(teamA, teamB, seed, opts) -> { winner, ticks, log, survivors, roster }

   Ablauf eines Zuges: Statusschaden -> Abklingzeiten -> stärkste bereite aktive
   Fähigkeit einsetzen, sonst normaler Angriff.

   Einheiten kommen fertig aufgelöst rein (Rang, Items, Passive, Prädator hat
   run.js schon eingerechnet):
     { id, name, tags, hp, atk, def, spd, actives:[], effects:[], keywords:[] }

   Hooks der Passiven: onStart onTurnStart onHit onDamaged onKill onDeath onAllyDeath */
'use strict';
(function (root) {

  var TICK_CAP = 3000;                                   // Patt-Bremse
  /* Ohne Obergrenzen läuft alles davon, was pro Treffer stapelt. */
  /* Stapel sind unbegrenzt — wer eine Linie zu Ende baut, soll das auch sehen.
     Gedeckelt wird stattdessen die WIRKUNG, dort wo sie sonst unsinnig würde:
     ein Angriffsfaktor unter null, eine Fehlschlagchance von 100 %. Erstarrung
     ist kein Stapel, sondern ein Schalter (ein Zug fällt aus) und bleibt bei 1. */
  var STATUS_CAP = { erstarrung: 1 };

  /* ---- Schatten, Dunkelheit, Licht ---------------------------------------
     Drei Elemente, die etwas tun, das es bisher nicht gab:

       schatten     auf sich selbst — je Stapel eine Chance, einem Treffer ganz
                    auszuweichen. Ausweichen gab es im Spiel noch nicht.
       dunkelheit   auf dem Gegner — senkt seinen AUSGETEILTEN Schaden. Alle
                    bisherigen Marken erhöhen den eingehenden.
       licht        auf sich selbst — löscht Dunkelheit, heilt stetig, und die
                    eigenen Angriffe gehen durch fremde Schatten hindurch.
                    Das göttliche Licht ist die Antwort auf beide Schatten.    */
  /* Donner lädt sich auf und ENTLÄDT sich dann: ab der Schwelle schlägt der
     Blitz in die ganze gegnerische Reihe und die Ladung ist weg. Kein anderer
     Zustand arbeitet mit einem Schwellenwert — Gift und Brand ticken stetig,
     Verwundbar und Verderbnis wirken dauerhaft. */
  var DONNER_SCHWELLE = 6, DONNER_SCHADEN = 0.012;

  var SCHATTEN_PRO_STAPEL = 0.07, SCHATTEN_MAX = 0.6;
  var DUNKELHEIT_PRO_STAPEL = 0.07, DUNKELHEIT_MAX = 0.6;
  var LICHT_HEILUNG = 0.015;

  function ausweichrate(u) {
    return Math.min(SCHATTEN_MAX,
      (SCHATTEN_PRO_STAPEL + (u.schattenPlus || 0)) * (u.status.schatten || 0));
  }
  function dunkelFaktor(u) {
    return 1 - Math.min(DUNKELHEIT_MAX,
      (DUNKELHEIT_PRO_STAPEL + (u.dunkelPlus || 0)) * (u.status.dunkelheit || 0));
  }
  /* Untergrenze für den Chaos-Faktor: bei 0 stünde die Einheit still. */
  var CHAOS_MIN = 0.15;
  /* Und nach oben? Bis hierher gab es keine Grenze — Chaos zieht nur nach unten,
     also fiel niemandem auf, dass Antichaos unbegrenzt wächst. Sobald eine
     Einheit es aus fremden Zuständen ERNTET (Rimuru), stapeln sich in einem
     langen Kampf dreistellige Mengen und der Wurf verlässt jede Skala. */
  var CHAOS_MAX = 2.2;
  /* Auch bei sehr vielen Stapeln bleibt ein Rest Verlässlichkeit. */
  var FEHLSCHLAG_MAX = 0.75;

  /* ---- Verwundbar --------------------------------------------------------
     Die Marke des Assassinen. Für sich genommen bricht sie nur Rüstung — ihr
     Wert liegt darin, dass der GANZE Trupp daran andocken kann. Verderbnis
     erhöht den Schaden direkt; verwundbar öffnet die Deckung und ist der Haken,
     an dem die Unterstützungslinien der anderen hängen.                       */
  /* Eskalation eines allein stehenden Bosses: linear auf den Grundangriff und
     gedeckelt. Multiplikativ auf u.atk potenziert sie sich über einen langen
     Kampf ins Absurde — gemessen kippte Clayman damit von 100 auf 0 %. */
  var ENRAGE_CAP = 1.0;

  var VERWUNDBAR_PIERCE = 0.15;   // je Stapel 15 % der Rüstung ignoriert
  /* Blutung skaliert am maximalen Leben statt an einer festen Zahl — die eine
     Antwort auf Gegner, die einfach zu viel Leben haben. */
  var BLUTUNG_PRO_STAPEL = 0.012;

  /* ---- Chaos --------------------------------------------------------------
     Kein Schaden über Zeit, sondern Unberechenbarkeit: wer Chaos trägt, würfelt
     zu Beginn jedes eigenen Zuges Angriff, Rüstung und Tempo neu aus, und seine
     Fähigkeiten können schlicht verpuffen. Antichaos ist dasselbe Rad, aber nur
     nach oben — die invertierte, positive Seite derselben Mechanik.            */
  var CHAOS_STREUUNG = 0.06;      // je Stapel ±6 % auf Angriff, Rüstung, Tempo
  var CHAOS_FEHLSCHLAG = 0.05;    // je Stapel 5 % Chance, dass eine Aktive verpufft
  function chaosF(u, k) { return (u.chaos && u.chaos[k]) || 1; }

  /* ---- Resonanz ----------------------------------------------------------
     Drei Teile mit demselben Schlüsselwort im Trupp — Fähigkeiten, Ausrüstung,
     Relikte — und der Trupp kippt von „hat auch Gift dabei" zu „ist ein
     Gift-Build". Vorher war ein Build nur eine Zahl in der Auswertung: die
     einzelnen Teile wirkten, aber nichts belohnte das Bündeln. Die Schwelle
     ist der Grund, eine Linie zu Ende zu bauen statt überall etwas
     mitzunehmen. Gilt für beide Seiten. */
  var RESONANZ_SCHWELLE = 3;
  var RESONANZ = {
    gift: 'Gift richtet 20 % mehr Schaden an',
    brand: 'Brand richtet 20 % mehr Schaden an',
    frost: 'Gegnerischer Widerstand gegen Erstarrung sinkt um 30 %',
    verderbnis: 'Jeder Verderbnis-Stapel erhöht den Schaden um 13 % statt 10 %',
    schild: 'Alle Schilde sind 15 % stärker',
    heilung: 'Alle Heilung wirkt 15 % stärker',
    tempo: 'Der ganze Trupp ist 6 % schneller',
    konter: 'Jede Einheit wirft 3 plus 7 % ihres Angriffs auf Angreifer zurück',
    exekution: '+15 % Schaden gegen Ziele unter 35 % Leben',
    flaeche: '+8 % Schaden, solange mindestens zwei Gegner stehen',
    chaos: 'Chaos und Antichaos streuen die Werte um ein Viertel weiter',
    blutung: 'Blutung reißt ein Viertel mehr Leben heraus',
    schatten: 'Jeder Schatten-Stapel weicht 9 % statt 7 % der Treffer aus',
    dunkelheit: 'Dunkelheit nimmt 9 % statt 7 % des gegnerischen Schadens',
    licht: 'Licht heilt doppelt und löscht zwei Stapel Dunkelheit je Zug',
    donner: 'Die Entladung schlägt schon ab vier Stapeln statt ab sechs zu'
  };
  /* Eine Stelle, die zählt — Kampf und Anzeige dürfen nicht auseinanderlaufen.
     Es resoniert nur die STÄRKSTE Linie: sonst sammelt ein Trupp mit neun
     Relikten nebenbei vier Resonanzen ein, und aus der Entscheidung „worauf
     baue ich" wird wieder „nimm alles mit". Gemessen: alle Resonanzen zugleich
     hoben die Siegquote von 58 auf 82 %. */
  function resonanz(keywords) {
    var n = {}, best = null;
    keywords.forEach(function (k) { if (RESONANZ[k]) n[k] = (n[k] || 0) + 1; });
    Object.keys(RESONANZ).forEach(function (k) {
      if (n[k] >= RESONANZ_SCHWELLE && (!best || n[k] > n[best])) best = k;
    });
    var out = {};
    if (best) out[best] = n[best];
    return out;
  }
  var ROLES = ['front', 'fernkampf', 'magier', 'unterstuetzer', 'verstaerker'];

  function roleOf(u) {
    for (var i = 0; i < ROLES.length; i++) if (u.tags.indexOf(ROLES[i]) >= 0) return ROLES[i];
    return 'front';
  }

  function spawn(def, side, pos) {
    return {
      id: def.id, name: def.name, tags: def.tags.slice(), rank: def.rank || 0,
      key: (side === 'player' ? 'p' : 'e') + pos,
      hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def || 0, spd: def.spd,
      role: roleOf(def), effects: (def.effects || []).slice(),
      /* Kopie, weil `wucht` je Kampf gelesen wird. `wucht` ist die alte
         Abklingzeit: Fähigkeiten kühlen nicht mehr ab, aber die Zahl war schon
         immer ein Maß für ihre Wucht und dient jetzt als Reihenfolge. */
      actives: (def.actives || []).map(function (a) {
        return { id: a.id, name: a.name, wucht: a.cd, fn: a.fn, wenn: a.wenn };
      }),
      keywords: (def.keywords || []).slice(), resistenz: def.resistenz || 0,
      side: side, pos: pos, gauge: 0, status: {}, regen: 0, lifesteal: 0,
      heilfaktor: 0, schildfaktor: 0, fluchmeister: 1, segenmeister: 1,
      chaos: null, enrage: def.enrage || 0, wut: 1, verschlungen: def.verschlungen || 0,
      schattenPlus: 0, dunkelPlus: 0, lichtPlus: 0,
      itemZahl: def.itemZahl || 0,
      dmgTaken: 0, dmgDealt: 0
    };
  }

  function simulate(teamA, teamB, seed, opts) {
    opts = opts || {};
    var rng = root.RNG(seed);
    var log = [];
    var t = 0;
    var units = teamA.map(function (d, i) { return spawn(d, 'player', i); })
      .concat(teamB.map(function (d, i) { return spawn(d, 'enemy', i); }));

    function alive(u) { return u.hp > 0; }
    function living(s) { return units.filter(function (u) { return u.side === s && alive(u); }); }
    function team(s) { return units.filter(function (u) { return u.side === s; }); }
    function other(s) { return s === 'player' ? 'enemy' : 'player'; }

    var res = { player: null, enemy: null };
    ['player', 'enemy'].forEach(function (s) {
      var ks = [];
      team(s).forEach(function (u) { ks = ks.concat(u.keywords || []); });
      if (s === 'player') (opts.relics || []).forEach(function (r) {
        if (r) ks = ks.concat(r.keywords || [], r.amplifies || []);
      });
      res[s] = resonanz(ks);
    });
    /* „Hat die Gegenseite von u diese Resonanz?" — Gift und Frost wirken auf
       den, der sie abbekommt, also zählt immer die andere Seite. */
    function gegen(u, k) { return !!res[other(u.side)][k]; }

    /* ---- Grundoperationen ------------------------------------------------ */

    function deal(target, amount, source, opt) {
      if (!target || !alive(target)) return 0;
      opt = opt || {};
      /* Schatten: ganz danebengegangen. Göttliches Licht des Angreifers hebt
         die Deckung auf, sonst wäre die Antwort darauf reine Statistik. */
      if (!opt.umgeleitet && !opt.durchLicht && target.status.schatten > 0 &&
          rng() < ausweichrate(target)) {
        log.push({ t: t, type: 'ausweichen', key: target.key, target: target.name,
                   side: target.side, source: source });
        return 0;
      }
      var v = target.status.verderbnis || 0;
      amount = amount * (1 + v * (gegen(target, 'verderbnis') ? 0.13 : 0.1));

      /* Deckung: wer hinten steht, gibt ein Drittel des Schadens an die vorderste
         lebende Einheit ab. Damit ist die Frontlinie mehr als Reihenfolge —
         ein zäher Körper vorn schützt die Reihe dahinter wirklich. */
      if (!opt.umgeleitet && !opt.pure && target.pos >= 2) {
        var vorn = living(target.side)[0];
        if (vorn && vorn !== target) {
          var abgabe = amount / 3;
          amount -= abgabe;
          deal(vorn, abgabe, 'Deckung', { umgeleitet: true });
        }
      }
      if (!opt.pure && target.status.schild > 0) {
        var absorbed = Math.min(target.status.schild, amount);
        target.status.schild -= absorbed;
        amount -= absorbed;
        if (absorbed >= 1) log.push({ t: t, type: 'schild', key: target.key, target: target.name, amount: Math.round(absorbed) });
        if (amount < 1) return 0;
      }
      /* Deckel je Treffer — für Passive, die einen Körper unzerstörbar machen,
         ohne ihm einfach mehr Leben zu geben. */
      if (target.minderung) amount *= 1 - target.minderung;
      if (target.schadensdeckel) amount = Math.min(amount, target.maxHp * target.schadensdeckel);
      amount = Math.max(1, Math.round(amount));
      target.hp = Math.max(0, target.hp - amount);
      target.dmgTaken += amount;
      log.push({ t: t, type: 'hit', key: target.key, target: target.name, side: target.side,
                 dmg: amount, source: source, hp: target.hp, maxHp: target.maxHp });
      if (alive(target)) fire(target, 'onDamaged', ctx(target, { amount: amount }));
      else die(target);
      return amount;
    }

    function die(u) {
      fire(u, 'onDeath', ctx(u, {}));
      if (alive(u)) return;                              // Wiederbelebung hat gegriffen
      log.push({ t: t, type: 'death', key: u.key, unit: u.name, side: u.side });
      /* Gefallene Verbündete sind Zustand, den Fähigkeiten abfragen dürfen. */
      living(u.side).forEach(function (a) {
        a._gefallen = 1;
        a._tote = (a._tote || 0) + 1;
        fire(a, 'onAllyDeath', ctx(a, { dead: u }));
      });
    }

    function heal(u, amount, source) {
      if (!u || !alive(u)) return 0;
      amount *= 1 + (u.heilfaktor || 0);                 // Verstärker für Heilungs-Builds
      if (u.status.brand > 0) amount *= 0.5;             // Brand halbiert Heilung
      amount = Math.round(amount);
      var zuviel = Math.max(0, amount - (u.maxHp - u.hp));
      amount = Math.max(0, Math.min(amount, u.maxHp - u.hp));
      /* Was über das Maximum hinausgeht, kann zu Schild werden — sonst
         verpufft jede Heilung an einem vollen Trupp. */
      if (zuviel > 0 && u.ueberheilung) applyStatus(u, 'schild', zuviel * u.ueberheilung);
      if (!amount) return 0;
      u.hp += amount;
      log.push({ t: t, type: 'heal', key: u.key, target: u.name, side: u.side,
                 amount: amount, source: source, hp: u.hp, maxHp: u.maxHp });
      return amount;
    }

    /* ---- Zustände, die aufeinander reagieren --------------------------------
       Dreizehn Zustände, und sie ignorierten sich fast alle: nur Licht löschte
       Dunkelheit, nur Donner hatte eine Schwelle. Ein sauber gestapeltes
       EINZELNES Schlüsselwort war damit immer besser als zwei gemischte — die
       Hybridbauten, die das Spiel anbietet, bestrafte es.

       Drei Kombinationen ändern das. Alle drei lösen beim ANLEGEN des zweiten
       Zustands aus, stehen also an einer Stelle, und alle drei haben eine
       Schwelle: Mono-Bauten treffen sie nie, weil ihnen der Partner fehlt.

         Verpuffung   Brand trifft Gift, zusammen mindestens 8 Stapel.
                      Beide verbrennen und richten je Stapel 3 reinen Schaden an.
         Splitter     Erstarrung trifft einen mit Donner geladenen Gegner —
                      die Ladung entlädt sich sofort, statt auf die Schwelle
                      zu warten.
         Aufgerissen  Blutung auf ein markiertes Ziel (3+ Verwundbar) fällt
                      50 % größer aus. Die Marke reißt die Wunde weiter auf.     */
    var kombiniert = 0;
    function kombination(target, key) {
      if (kombiniert || !alive(target)) return;
      kombiniert = 1;
      try {
        var gift = target.status.gift || 0, brand = target.status.brand || 0;
        if ((key === 'brand' || key === 'gift') && gift > 0 && brand > 0 && gift + brand >= 8) {
          var summe = gift + brand;
          target.status.gift = 0;
          target.status.brand = 0;
          log.push({ t: t, type: 'kombi', key: target.key, target: target.name,
                     side: target.side, name: 'Verpuffung', stapel: Math.round(summe) });
          deal(target, summe * 3, 'Verpuffung', { pure: true });
          return;
        }
        if (key === 'erstarrung' && (target.status.donner || 0) > 0) {
          var ladung = target.status.donner;
          target.status.donner = 0;
          log.push({ t: t, type: 'kombi', key: target.key, target: target.name,
                     side: target.side, name: 'Splitter', stapel: Math.round(ladung) });
          living(target.side).forEach(function (u) {
            deal(u, u.maxHp * DONNER_SCHADEN * ladung, 'Splitter', { pure: true });
          });
          return;
        }
        if (key === 'blutung' && (target.status.verwundbar || 0) >= 3) {
          var dazu = Math.round(stacksVon(target, 'blutung') * 0.5);
          if (dazu > 0) {
            target.status.blutung += dazu;
            log.push({ t: t, type: 'kombi', key: target.key, target: target.name,
                       side: target.side, name: 'Aufgerissen', stapel: Math.round(target.status.blutung) });
          }
        }
      } finally { kombiniert = 0; }
    }
    function stacksVon(u, k) { return u.status[k] || 0; }

    var entlaedt = 0;
    function applyStatus(target, key, stacks, von) {
      if (!target || !alive(target) || stacks <= 0) return;
      /* Bosse schütteln Erstarrung meist ab — sonst gewinnt Frost jeden
         Einzelkampf, indem er dem Gegner schlicht die Züge nimmt. */
      if (key === 'erstarrung' && target.resistenz &&
          rng() < target.resistenz * (gegen(target, 'frost') ? 0.7 : 1)) {
        log.push({ t: t, type: 'widersteht', key: target.key, target: target.name,
                   side: target.side, status: key });
        return;
      }
      /* Zwei generische Stellschrauben für Ausrüstung und Relikte: wer Stapel
         auf GEGNER legt, skaliert über `fluchmeister`, wer sie auf die eigene
         Reihe legt, über `segenmeister`. Beide sitzen am Anleger, nicht am Ziel
         — sonst könnte ein Relikt versehentlich auch fremde Marken verstärken.
         `chaosmeister` und `markenmeister` bleiben die spezifischen Varianten
         und multiplizieren obendrauf. */
      if (von) {
        stacks *= (von.side === target.side ? von.segenmeister : von.fluchmeister) || 1;
      }
      if (key === 'schild') stacks *= 1 + (target.schildfaktor || 0);
      target.status[key] = (target.status[key] || 0) + stacks;
      if (STATUS_CAP[key]) target.status[key] = Math.min(target.status[key], STATUS_CAP[key]);
      /* Schild verfällt nicht — ohne Deckel stapelt ein Schild-Trupp sich eine
         zweite Lebensleiste an und wird unkaputtbar. */
      if (key === 'schild') target.status.schild = Math.min(target.status.schild, target.maxHp * 0.6);
      log.push({ t: t, type: 'status', key: target.key, target: target.name, side: target.side,
                 status: key, stacks: Math.round(target.status[key]) });
      kombination(target, key);
      /* Entladung: der Blitz springt auf die ganze Reihe des Trägers über. Das
         Sperrflag verhindert, dass eine Entladung die nächste auslöst. */
      var schwelle = DONNER_SCHWELLE - (gegen(target, 'donner') ? 2 : 0);
      if (key === 'donner' && target.status.donner >= schwelle && !entlaedt) {
        entlaedt = 1;
        var ladung = target.status.donner;
        target.status.donner = 0;
        log.push({ t: t, type: 'entladung', key: target.key, unit: target.name,
                   side: target.side, stapel: Math.round(ladung) });
        living(target.side).forEach(function (u) {
          deal(u, u.maxHp * DONNER_SCHADEN * ladung, 'Entladung', { pure: true });
        });
        entlaedt = 0;
      }
    }

    function ctx(self, extra) {
      var c = {
        rng: rng, log: log, self: self, deal: deal, heal: heal,
        applyStatus: function (ziel, key, stapel) { return applyStatus(ziel, key, stapel, self); },
        allies: function () { return living(self.side); },
        foes: function () { return living(other(self.side)); },
        addEffect: function (u, e) { u.effects.push(e); },
        /* Chaos anlegen — eine Stelle, damit Meisterschaft, Realitätswarp und
           der onChaos-Hook nicht an jeder einzelnen Fähigkeit hängen. */
        /* Marke setzen — eine Stelle, damit Zielsicherheit und der onMarke-Hook
           nicht an jeder Fähigkeit einzeln hängen. */
        markiere: function (ziel, stapel) {
          var n = stapel * (self.markenmeister || 1);
          applyStatus(ziel, 'verwundbar', n, self);
          if (self.offeneWunde) ziel.offeneWunde = 1;      // baut sich nicht mehr ab
          fire(self, 'onMarke', ctx(self, { ziel: ziel, stapel: n }));
          return n;
        },
        chaos: function (ziel, stapel) {
          var n = stapel * (self.chaosmeister || 1);
          applyStatus(ziel, 'chaos', n, self);
          if (self.gesetzlos) ziel.zaehesChaos = 1;      // baut sich nicht mehr ab
          if (self.antichaosWarp) {
            living(self.side).forEach(function (a) {
              applyStatus(a, 'antichaos', n * self.antichaosWarp, self);
            });
          }
          fire(self, 'onChaos', ctx(self, { ziel: ziel, stapel: n }));
          return n;
        }
      };
      for (var k in extra) c[k] = extra[k];
      return c;
    }

    function fire(u, hook, c) {
      for (var i = 0; i < u.effects.length; i++) {
        if (u.effects[i].hook === hook) u.effects[i].fn(c);
      }
    }

    /* ---- Angriff: eine Stelle für normalen Schlag und Fähigkeitsschaden ---- */

    function angriff(u, target, mult, quelle, opt) {
      if (!target || !alive(target)) return 0;
      opt = opt || {};
      var pierce = Math.max(u.pierce || 0, opt.pierce || 0, u.role === 'magier' ? 0.6 : 0);
      /* Die Marke gilt für jeden Angreifer, nicht nur für den, der sie gesetzt
         hat — genau das macht sie zur Trupp-Fähigkeit. */
      pierce = Math.min(1, pierce + VERWUNDBAR_PIERCE * (target.status.verwundbar || 0));
      var base = u.atk * chaosF(u, 'atk') * (u.wut || 1) * dunkelFaktor(u) * (mult || 1)
        - target.def * chaosF(target, 'def') * (1 - pierce);
      var c = ctx(u, { attacker: u, target: target, dmg: base * (0.9 + rng() * 0.2) });
      fire(u, 'onHit', c);
      if (res[u.side].exekution && target.hp < target.maxHp * 0.35) c.dmg *= 1.15;
      if (res[u.side].flaeche && living(other(u.side)).length >= 2) c.dmg *= 1.08;
      if (!alive(target)) return 0;
      var done = deal(target, c.dmg, quelle || u.name,
        { pure: !!u.durchschlag || !!opt.pure, durchLicht: u.status.licht > 0 });
      u.dmgDealt += done;
      if (u.lifesteal > 0 && done) heal(u, done * u.lifesteal, 'Lebensraub');
      /* Wer den Gegner umlegt, darf das merken — Grundlage für Exekutions-Builds,
         die sich über den Kampf hinweg aufschaukeln. */
      if (target.hp <= 0) fire(u, 'onKill', ctx(u, { getoetet: target }));
      return done;
    }

    /* ---- Aufbau: nur noch Relikte, keine Arten-Synergien ------------------- */

    function setup(side) {
      var mine = team(side);
      var api = {
        rng: rng, log: log, units: mine,
        addEffect: function (u, e) { u.effects.push(e); }, ctx: ctx
      };
      if (side === 'player') {
        (opts.relics || []).forEach(function (r) { if (r && r.apply) r.apply(mine, api); });
      }
      /* Resonanz vor onStart: Schild- und Heilfaktor müssen stehen, bevor die
         erste Barriere gelegt wird. */
      var r = res[side];
      mine.forEach(function (u) {
        if (r.donner) u.donnerFrueh = 2;
        if (r.schatten) u.schattenPlus = 0.02;
        if (r.dunkelheit) u.dunkelPlus = 0.02;
        if (r.licht) u.lichtPlus = 1;
        if (r.tempo) u.spd = Math.round(u.spd * 1.06);
        if (r.schild) u.schildfaktor += 0.15;
        if (r.heilung) u.heilfaktor += 0.15;
        if (r.konter) u.effects.push({ hook: 'onDamaged', name: 'Resonanz: Konter',
          fn: function (c) { var f = c.foes()[0]; if (f) c.deal(f, 3 + c.self.atk * 0.07, 'Konter-Resonanz'); } });
      });
      mine.forEach(function (u) { fire(u, 'onStart', ctx(u, {})); });
    }
    setup('player');
    setup('enemy');

    var roster = units.map(function (u) {
      return { key: u.key, id: u.id, name: u.name, side: u.side, pos: u.pos,
               maxHp: u.maxHp, atk: u.atk, def: u.def, spd: u.spd, role: u.role,
               tags: u.tags.slice(), actives: u.actives.map(function (a) { return a.name; }) };
    });
    log.push({ t: 0, type: 'setup', roster: roster });

    /* Nur aufbauen, nicht kämpfen: die Debug-Übersicht liest damit exakt die
       Einheiten, mit denen der Kampf auch wirklich beginnt — Relikte, Resonanz
       und alle onStart-Passiven schon eingerechnet. Ein zweiter Rechenweg für
       die Anzeige würde früher oder später etwas anderes behaupten als der
       Kampf. */
    if (opts.nurAufbau) return { roster: roster, einheiten: units, resonanz: res, log: log };

    /* ---- Zug -------------------------------------------------------------- */

    function pickTarget(u) {
      var foes = living(other(u.side));
      if (!foes.length) return null;
      /* Jagdbefehl: der Trupp geht auf das, was der Assassine aufgerissen hat. */
      if (u.jagdbefehl) {
        var markiert = foes.filter(function (f) { return f.status.verwundbar > 0; });
        if (markiert.length) {
          return markiert.reduce(function (a, b) {
            return (b.status.verwundbar || 0) > (a.status.verwundbar || 0) ? b : a;
          });
        }
      }
      if (u.role === 'fernkampf') return foes[foes.length - 1];               // Hinterreihe
      if (u.role === 'magier') {
        return foes.reduce(function (a, b) { return b.hp < a.hp ? b : a; });  // schwächstes Ziel
      }
      return foes[0];                                                         // Front
    }

    /* Es gibt keine Abklingzeiten mehr: die Aktive feuert JEDE Runde und ersetzt
       den Normalangriff. Spielereinheiten tragen genau eine (ihre Signatur),
       Gegner dürfen mehrere haben — dann gewinnt die wuchtigste, deren
       Lagebedingung gerade passt. Ohne `wenn` heilte der Segen einen
       unverletzten Trupp und das Todesurteil träfe volles Leben. */
    function waehleAktive(u, target) {
      var best = null;
      u.actives.forEach(function (a) {
        if (a.wenn && !a.wenn({ self: u, target: target, allies: living(u.side), foes: living(other(u.side)) })) return;
        if (!best || a.wucht > best.wucht) best = a;
      });
      return best;
    }

    function act(u) {
      fire(u, 'onTurnStart', ctx(u, {}));
      if (!alive(u)) return;
      /* Eskalation. Ohne sie ist ein allein stehender Boss eine Ja/Nein-Frage:
         beide Seiten schlagen mit fast konstantem Schaden, also entscheidet
         sich alles in der ersten Runde und die Siegquote springt gemessen von
         100 % auf 0 %, sobald der Boss 10 % stärker wird. Mit ihr wird daraus
         ein Tempo-Check — wer zu langsam abräumt, verliert allmählich. */
      if (u.enrage) {
        u._zuege = (u._zuege || 0) + 1;
        var neu = 1 + Math.min(u.enrage * u._zuege, ENRAGE_CAP);
        if (neu > u.wut) {
          u.wut = neu;
          if (u._zuege % 4 === 0) {
            log.push({ t: t, type: 'wut', key: u.key, unit: u.name, side: u.side,
                       prozent: Math.round((u.wut - 1) * 100) });
          }
        }
      }

      /* ---- Wann tickt ein Zustand, und wann hört er auf? -------------------
         WICHTIG: Zustände ticken NICHT pro Runde, sondern **einmal je Zug ihres
         Trägers** — hier, am Anfang von `act(u)`. Eine schnelle Einheit brennt
         und blutet in derselben Zeit also öfter als eine langsame, und ein
         Tempo-Bonus verstärkt jeden Schaden über Zeit, den sie trägt. Umgekehrt
         verlängert Erstarrung nichts: der ausgesetzte Zug tickt trotzdem.

         Reihenfolge in genau dieser Schleife (sie ist beobachtbar, also fest):
           Gift → Brand → Blutung → Verderbnis → Licht → Schatten → Dunkelheit
           → Verwundbar → Chaos/Antichaos → Regeneration → Erstarrung

         Je Stapel und Tick (Resonanz des Trägers in Klammern):
           Gift        1,7 Schaden (×1,2), geht durch Schilde
           Brand       2 Schaden (×1,2), halbiert zusätzlich jede Heilung
           Blutung     1,2 % des MAXIMALEN Lebens (×1,25), geht durch Schilde
           Licht       heilt 1,5 % des maximalen Lebens, löscht ebenso viel Dunkelheit
           Verderbnis  kein Tick-Schaden — +10 % (13 %) erlittener Schaden, dauernd
           Verwundbar  kein Tick-Schaden — 15 % Rüstung ignoriert, für JEDEN Angreifer
           Donner      kein Tick — lädt, bis 6 (4) Stapel liegen, dann Entladung

         Abbau: jeder Zustand verliert je Trägerzug 1 Stapel. Fünf Fähigkeiten
         dürfen das aussetzen — dann bleibt der Stapel liegen und tickt weiter,
         was den Schaden über Zeit vervielfacht statt ihn nur zu erhöhen:
           brandBleibt        auf dem Ziel   (Benimaru: Dauerbrand)
           verderbnisBleibt   auf dem Ziel   (Adalmann: Verfluchtes Wort)
           dunkelheitBleibt   auf dem Ziel   (Diablo: Ewige Nacht)
           offeneWunde        auf dem Ziel   (Souei: Offene Wunde)
           zaehesChaos        auf dem Ziel   (Shion: Gesetzlosigkeit)
         Gemessen ist der Unterschied gewaltig: 6 Brand-Ticks ohne Flag gegen
         150 mit. Die Flags gehören deshalb auf das ZIEL, nicht auf den Anleger
         — genau daran ist `zaeherBrand` zwei Phasen lang wirkungslos gewesen.

         Nicht in dieser Schleife: Schild baut sich gar nicht ab (nur Absorption,
         gedeckelt auf 60 % des maximalen Lebens), Erstarrung verbraucht den Zug
         und zählt danach herunter.                                             */
      if (u.status.gift > 0) {
        deal(u, u.status.gift * 1.7 * (gegen(u, 'gift') ? 1.2 : 1), 'Gift', { pure: true });
        u.status.gift--; if (!alive(u)) return;
      }
      if (u.status.brand > 0) {
        deal(u, u.status.brand * 2 * (u.brandFaktor || 1) * (gegen(u, 'brand') ? 1.2 : 1),
             'Brand', { pure: true });
        if (!u.brandBleibt) u.status.brand--;
        if (!alive(u)) return;
      }
      if (u.status.blutung > 0) {
        deal(u, u.maxHp * BLUTUNG_PRO_STAPEL * u.status.blutung *
             (gegen(u, 'blutung') ? 1.25 : 1), 'Blutung', { pure: true });
        u.status.blutung--; if (!alive(u)) return;
      }
      /* Wie `brandBleibt` und `offeneWunde`: eine Fähigkeit darf den Abbau
         aussetzen, statt nur mehr Stapel nachzulegen. */
      if (u.status.verderbnis > 0 && !u.verderbnisBleibt) u.status.verderbnis--;
      /* Licht zuerst: es löscht Dunkelheit, bevor die den Zug verdirbt. */
      if (u.status.licht > 0) {
        var lf = 1 + (u.lichtPlus || 0);
        heal(u, u.maxHp * LICHT_HEILUNG * lf * u.status.licht, 'Licht');
        if (u.status.dunkelheit > 0) {
          u.status.dunkelheit = Math.max(0, u.status.dunkelheit - u.status.licht * lf);
        }
        u.status.licht--;
        if (!alive(u)) return;
      }
      if (u.status.schatten > 0) u.status.schatten--;
      if (u.status.dunkelheit > 0 && !u.dunkelheitBleibt) u.status.dunkelheit--;
      if (u.status.verwundbar > 0 && !u.offeneWunde) u.status.verwundbar--;
      /* Der Würfelwurf der Runde: neue Werte, solange Chaos oder Antichaos liegt. */
      var negC = u.status.chaos || 0;
      /* `antichaosDoppelt` (Rimurus Azathoth und Herr der Monster): das
         Aufwärts-Rad zählt doppelt, ohne dass mehr Stapel liegen. */
      var posC = (u.status.antichaos || 0) * (u.antichaosDoppelt ? 2 : 1);
      if (negC || posC) {
        var streu = CHAOS_STREUUNG * (gegen(u, 'chaos') ? 1.25 : 1);
        u.chaos = { stapel: negC };
        /* Chaos zieht nur nach unten, Antichaos nur nach oben. Symmetrisch
           gewürfelt konnte Chaos den Gegner ebenso gut STÄRKEN — als Debuff
           gedacht, als Glücksspiel gespielt. Unvorhersehbar bleibt es: die Höhe
           der Einbuße wird in jeder Runde neu gewürfelt. */
        ['atk', 'def', 'spd'].forEach(function (k) {
          u.chaos[k] = Math.min(CHAOS_MAX,
            Math.max(CHAOS_MIN, 1 + rng() * streu * posC - rng() * streu * negC));
        });
        log.push({ t: t, type: 'chaos', key: u.key, unit: u.name, side: u.side,
                   stapel: Math.round(negC), anti: Math.round(posC),
                   atk: Math.round(u.chaos.atk * 100), def: Math.round(u.chaos.def * 100),
                   spd: Math.round(u.chaos.spd * 100) });
        if (negC && !u.zaehesChaos) u.status.chaos--;
        if (u.status.antichaos > 0) u.status.antichaos--;
      } else u.chaos = null;
      if (u.regen > 0) heal(u, u.regen, 'Regeneration');

      if (u.status.erstarrung > 0) {
        u.status.erstarrung--;
        log.push({ t: t, type: 'skip', key: u.key, unit: u.name, side: u.side });
        return;
      }

      var target = pickTarget(u);
      if (!target) return;
      var aktive = waehleAktive(u, target);

      /* Unterstützer heilen, wenn gerade keine Fähigkeit bereit ist. */
      if (u.role === 'unterstuetzer' && !aktive) {
        var hurt = living(u.side).filter(function (a) { return a.hp < a.maxHp; });
        if (hurt.length) {
          var worst = hurt.reduce(function (a, b) { return (b.hp / b.maxHp) < (a.hp / a.maxHp) ? b : a; });
          heal(worst, u.atk * 1.5, u.name);
          return;
        }
      }

      /* Chaos lässt das Wirken misslingen: der Zug ist weg, die Abklingzeit läuft. */
      if (aktive && u.chaos && u.chaos.stapel &&
          rng() < Math.min(FEHLSCHLAG_MAX, CHAOS_FEHLSCHLAG * u.chaos.stapel)) {
        log.push({ t: t, type: 'fehlschlag', key: u.key, unit: u.name, side: u.side, name: aktive.name });
        return;
      }

      if (aktive) {
        log.push({ t: t, type: 'aktiv', key: u.key, unit: u.name, side: u.side, name: aktive.name });
        aktive.fn(ctx(u, {
          attacker: u, target: target,
          /* aktive liegt im ctx, damit eine Fähigkeit ihre eigene Abklingzeit
             zurücksetzen kann (Milims Amoklauf). */
          aktive: aktive,
          attack: function (mult, tgt, opt) { return angriff(u, tgt || target, mult, aktive.name, opt); }
        }));
        return;
      }
      angriff(u, target, 1);
    }

    /* ---- Schleife --------------------------------------------------------- */

    while (t < TICK_CAP && living('player').length && living('enemy').length) {
      t++;
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (!alive(u)) continue;
        u.gauge += Math.max(1, u.spd * chaosF(u, 'spd'));
        if (u.gauge < 100) continue;
        u.gauge -= 100;
        act(u);
        if (!living('player').length || !living('enemy').length) break;
      }
    }

    var p = living('player').length, e = living('enemy').length;
    var winner = p && !e ? 'player' : e && !p ? 'enemy' : 'draw';
    log.push({ t: t, type: 'end', winner: winner });
    return {
      winner: winner, ticks: t, log: log, roster: roster,
      survivors: units.filter(alive).map(function (u) {
        return { id: u.id, name: u.name, hp: u.hp, maxHp: u.maxHp, side: u.side };
      }),
      fallen: units.filter(function (u) { return !alive(u); })
        .map(function (u) { return { id: u.id, name: u.name, side: u.side }; })
    };
  }

  root.Combat = { simulate: simulate, TICK_CAP: TICK_CAP, ROLES: ROLES, roleOf: roleOf,
                  STATUS_CAP: STATUS_CAP, CHAOS_MIN: CHAOS_MIN, CHAOS_MAX: CHAOS_MAX,
                  FEHLSCHLAG_MAX: FEHLSCHLAG_MAX,
                  RESONANZ: RESONANZ,
                  CHAOS_STREUUNG: CHAOS_STREUUNG, CHAOS_FEHLSCHLAG: CHAOS_FEHLSCHLAG,
                  VERWUNDBAR_PIERCE: VERWUNDBAR_PIERCE, BLUTUNG_PRO_STAPEL: BLUTUNG_PRO_STAPEL,
                  ENRAGE_CAP: ENRAGE_CAP,
                  DONNER_SCHWELLE: DONNER_SCHWELLE, DONNER_SCHADEN: DONNER_SCHADEN,
                  SCHATTEN_PRO_STAPEL: SCHATTEN_PRO_STAPEL, SCHATTEN_MAX: SCHATTEN_MAX,
                  DUNKELHEIT_PRO_STAPEL: DUNKELHEIT_PRO_STAPEL, LICHT_HEILUNG: LICHT_HEILUNG,
                  RESONANZ_SCHWELLE: RESONANZ_SCHWELLE, resonanz: resonanz };
})(globalThis);
