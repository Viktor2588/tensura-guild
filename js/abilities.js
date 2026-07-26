/* js/abilities.js — Fähigkeiten. Hier liegt jetzt die Spieltiefe, nicht mehr
   bei Arten-Synergien.

   AKTIV   feuert im Kampf, sobald die Abklingzeit (cd) abgelaufen ist, und
           ersetzt in diesem Zug den normalen Angriff.
           ctx: self, target, attack(mult, ziel), deal, heal, applyStatus,
                allies(), foes(), rng()
   PASSIV  hängt an einem Hook und wirkt dauerhaft.

   keywords  = was die Fähigkeit erzeugt   (Gift, Brand, …)
   amplifies = was sie verstärkt
   Daraus baut die UI die Synergie-Anzeige: Quellen gegen Verstärker.         */
'use strict';
(function (root) {

  /* `wenn` ist optional: die Fähigkeit wird nur eingesetzt, wenn die Lage passt
     (c: self, target, allies, foes). Ohne sie feuert immer die mit der längsten
     Abklingzeit — dann ist die Auswahl beim Aufstieg keine Entscheidung mehr,
     sondern eine Zahl. */
  function aktiv(id, name, cd, keywords, text, fn, wenn) {
    return { id: id, name: name, art: 'aktiv', cd: cd, keywords: keywords, text: text,
             fn: fn, wenn: wenn || null };
  }
  var verwundet = function (c) { return c.allies.some(function (u) { return u.hp < u.maxHp * 0.85; }); };
  var mehrereGegner = function (c) { return c.foes.length >= 2; };
  function passiv(id, name, hook, keywords, amplifies, text, fn) {
    return { id: id, name: name, art: 'passiv', hook: hook, keywords: keywords,
             amplifies: amplifies, text: text, fn: fn };
  }
  function chance(p, fn) { return function (c) { if (c.rng() < p) fn(c); }; }

  /* Entwicklungsstufen: C Oger, B Teufel, A Verdorbener Teufel, S Ultimativer
     Teufel. Die Zahl der Chaos-Stapel ist die eine Stelle, an der das hängt. */
  var CHAOS_JE_RANG = [1, 2, 3, 5];

  /* ---- Passive Bibliothek: geteilt, jede Einheit trägt drei davon --------- */

  var passives = [
    passiv('giftbrut', 'Giftnebel', 'onHit', ['gift'], [], 'Jeder Treffer legt 1 Gift an',
      function (c) { c.applyStatus(c.target, 'gift', 1); }),
    passiv('giftzahn', 'Giftverstärkung', 'onHit', [], ['gift'], '+30 % Schaden gegen vergiftete Ziele',
      function (c) { if (c.target.status.gift > 0) c.dmg *= 1.3; }),
    passiv('glutkern', 'Flammenaura', 'onHit', ['brand'], [], '25 % Chance auf 2 Brand',
      chance(0.25, function (c) { c.applyStatus(c.target, 'brand', 2); })),
    passiv('aschehaut', 'Aschehaut', 'onHit', [], ['brand'], '+35 % Schaden gegen brennende Ziele',
      function (c) { if (c.target.status.brand > 0) c.dmg *= 1.35; }),
    passiv('frostkern', 'Frostschauer', 'onHit', ['frost'], [], '10 % Chance, das Ziel erstarren zu lassen',
      chance(0.1, function (c) { c.applyStatus(c.target, 'erstarrung', 1); })),
    passiv('frostschneide', 'Frostschneide', 'onHit', [], ['frost'], '+30 % Schaden gegen erstarrte Ziele',
      function (c) { if (c.target.status.erstarrung > 0) c.dmg *= 1.3; }),
    passiv('verderber', 'Fluchhauch', 'onHit', ['verderbnis'], [], 'Jeder Treffer legt 1 Verderbnis an',
      function (c) { c.applyStatus(c.target, 'verderbnis', 1); }),
    passiv('fluchweber', 'Fluchweber', 'onHit', [], ['verderbnis'], '+25 % Schaden gegen verderbte Ziele',
      function (c) { if (c.target.status.verderbnis > 0) c.dmg *= 1.25; }),
    passiv('schildwall', 'Barriere', 'onStart', ['schild'], [], 'Startet mit Schild 25',
      function (c) { c.applyStatus(c.self, 'schild', 25); }),
    passiv('bannerherz', 'Heiliges Banner', 'onStart', ['schild'], [], 'Gibt allen Verbündeten Schild 15',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 15); }); }),
    passiv('regenerator', 'Selbstregeneration', 'onStart', ['heilung'], [], 'Regeneration 6 pro Zug',
      function (c) { c.self.regen += 6; }),
    passiv('lebensraub', 'Lebensraub', 'onStart', ['heilung'], [], 'Heilt 20 % des verursachten Schadens',
      function (c) { c.self.lifesteal += 0.2; }),
    passiv('quelle', 'Quelle des Waldes', 'onStart', ['heilung'], [], 'Gibt allen Verbündeten Regeneration 3',
      function (c) { c.allies().forEach(function (u) { u.regen += 3; }); }),
    passiv('dornenhaut', 'Stachelhaut', 'onDamaged', ['konter'], [],
      'Angreifer erleiden 10 Schaden plus ein Drittel des eigenen Angriffs zurück',
      function (c) { var f = c.foes()[0]; if (f) c.deal(f, 10 + c.self.atk * 0.35, 'Dornen'); }),
    passiv('konterstoss', 'Reflexkonter', 'onDamaged', ['konter'], [], '40 % Chance auf einen Gegenangriff',
      chance(0.4, function (c) { var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.7, 'Konterstoß'); })),
    passiv('windschritt', 'Gedankenbeschleunigung', 'onStart', ['tempo'], [], '+15 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.15); }),
    passiv('jagdruf', 'Jagdruf', 'onStart', ['tempo'], [], 'Gibt allen Verbündeten +10 % Tempo',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.1); }); }),
    passiv('erstschlag', 'Erstschlag', 'onHit', [], [], 'Der erste Angriff verursacht +80 % Schaden',
      function (c) { if (!c.self._es) { c.self._es = 1; c.dmg *= 1.8; } }),
    passiv('scharfrichter', 'Scharfrichter', 'onHit', [], ['exekution'], 'Doppelter Schaden gegen Ziele unter 30 % Leben',
      function (c) { if (c.target.hp < c.target.maxHp * 0.3) c.dmg *= 2; }),
    passiv('henkersblick', 'Henkersblick', 'onHit', [], ['exekution'], '+50 % Schaden gegen Ziele unter 50 % Leben',
      function (c) { if (c.target.hp < c.target.maxHp * 0.5) c.dmg *= 1.5; }),
    passiv('panzerbrecher', 'Magiedurchdringung', 'onStart', [], [], 'Ignoriert 60 % Rüstung',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.6); }),
    passiv('zaeh', 'Ultraregeneration', 'onDamaged', ['heilung'], [], 'Heilt einmalig 30 % Leben unter einem Viertel',
      function (c) {
        if (c.self.hp <= 0 || c.self._zaeh || c.self.hp >= c.self.maxHp * 0.25) return;
        c.self._zaeh = 1; c.heal(c.self, c.self.maxHp * 0.3, 'Ultraregeneration');
      }),
    passiv('rachegeist', 'Rachegeist', 'onAllyDeath', [], [], 'Stirbt ein Verbündeter: +5 Angriff',
      function (c) { c.self.atk += 5; }),
    passiv('seelenband', 'Seelenband', 'onAllyDeath', ['heilung'], [], 'Stirbt ein Verbündeter: heilt 25 Leben',
      function (c) { c.heal(c.self, 25, 'Seelenband'); }),
    passiv('kettenschlag', 'Mehrfachangriff', 'onHit', ['flaeche'], [], '25 % Chance, ein zweites Ziel für 40 % zu treffen',
      chance(0.25, function (c) {
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) c.deal(f, c.attacker.atk * 0.4, 'Kettenschlag');
      })),
    passiv('wiederkehr', 'Untotenkörper', 'onDeath', ['heilung'], [], 'Steht einmal mit 40 % Leben wieder auf',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    /* Verstärker für die Schlüsselwörter, die bisher nur Quellen hatten —
       ohne sie konnten Heilungs-, Schild-, Flächen- und Tempo-Builds nach der
       Definition (zwei Quellen + ein Verstärker) nie zustande kommen. */
    passiv('lebenskraft', 'Lebenskraft', 'onStart', [], ['heilung'],
      'Jede Heilung an dieser Einheit wirkt um 45 % stärker',
      function (c) { c.self.heilfaktor += 0.45; }),
    passiv('bollwerkmeister', 'Bollwerkmeister', 'onStart', [], ['schild'],
      'Jeder Schild auf dieser Einheit ist um 25 % stärker',
      function (c) { c.self.schildfaktor += 0.25; }),
    passiv('massenschlaechter', 'Massenschlächter', 'onHit', [], ['flaeche'],
      '+10 % Schaden je lebendem Gegner — lohnt sich, solange die Reihen voll sind',
      function (c) { c.dmg *= 1 + 0.1 * c.foes().length; }),
    passiv('schwungmeister', 'Schwungmeister', 'onHit', [], ['tempo'],
      '+3 % Schaden je Punkt Tempo über 26',
      function (c) { c.dmg *= 1 + Math.max(0, c.self.spd - 26) * 0.03; }),
    passiv('rachsucht', 'Rachsucht', 'onHit', [], ['konter'],
      '+50 % Schaden, sobald die Einheit in diesem Kampf selbst getroffen wurde',
      function (c) { if (c.self.dmgTaken > 0) c.dmg *= 1.5; }),

    passiv('blutrausch', 'Blutrausch', 'onKill', ['exekution'], [],
      'Jeder erlegte Gegner gibt dauerhaft +14 % Angriff',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.14); }),
    passiv('trophaenjaeger', 'Trophäenjäger', 'onKill', ['exekution'], [],
      'Jeder erlegte Gegner heilt die Einheit um 20 % ihres maximalen Lebens',
      function (c) { c.heal(c.self, c.self.maxHp * 0.2, 'Trophäenjäger'); }),

    passiv('kriegsherz', 'Kampfgeist', 'onStart', [], [], '+5 Angriff, +3 Rüstung',
      function (c) { c.self.atk += 5; c.self.def += 3; }),

    /* ---- Shions Linien ----------------------------------------------------
       Vier Linien, vier Stufen: Angriff (Chaos in Werte), Mechanik (das Chaos
       selbst), Unterstützung (Antichaos für den Trupp), Defensive (Oger-Fleisch).
       Beim Anwerben und bei jedem Aufstieg wählt der Spieler eine aus vier —
       eine je Linie, auf der Stufe, die dem Rang entspricht.

       Der Hook `onChaos` feuert, sobald Shion Chaos anlegt; `c.stapel` ist die
       Menge NACH der Meisterschaft.                                           */

    passiv('shion_ang1', 'Chaosrausch', 'onChaos', ['chaos'], [],
      'Jeder angelegte Chaos-Stapel gibt Shion für den Rest des Kampfes +3 % Angriff und +2 % Tempo',
      function (c) {
        c.self.atk = Math.round(c.self.atk * (1 + 0.03 * c.stapel));
        c.self.spd = Math.round(c.self.spd * (1 + 0.02 * c.stapel));
      }),
    passiv('shion_ang2', 'Wutspirale', 'onChaos', ['chaos'], [],
      'Wie Chaosrausch, aber +5 % Angriff je Stapel — unter der Hälfte ihres Lebens +10 %',
      function (c) {
        var p = c.self.hp < c.self.maxHp * 0.5 ? 0.1 : 0.05;
        c.self.atk = Math.round(c.self.atk * (1 + p * c.stapel));
      }),
    passiv('shion_ang3', 'Schlachtruf des Chaos', 'onChaos', ['chaos'], [],
      'Jeder angelegte Chaos-Stapel gibt dem ganzen Trupp +2 % Angriff',
      function (c) {
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * (1 + 0.02 * c.stapel)); });
      }),
    passiv('shion_ang4', 'Verzerrter Titan', 'onHit', [], ['chaos'],
      '+4 % Schaden je Chaos-Stapel, den das Ziel gerade trägt',
      function (c) { c.dmg *= 1 + 0.04 * (c.target.status.chaos || 0); }),

    passiv('shion_mec1', 'Chaosmeisterschaft', 'onStart', [], ['chaos'],
      'Shion legt 50 % mehr Chaos-Stapel an, als die Fähigkeit angibt',
      function (c) { c.self.chaosmeister = Math.max(c.self.chaosmeister || 1, 1.5); }),
    passiv('shion_mec2', 'Instabile Klinge', 'onChaos', ['chaos'], [],
      'Dieselbe Menge Chaos geht zusätzlich auf einen zweiten Gegner',
      function (c) {
        var f = c.foes().filter(function (x) { return x !== c.ziel; })[0];
        if (f) c.applyStatus(f, 'chaos', c.stapel);
      }),
    /* Der Verstärker gehört dem ganzen Trupp, nicht nur Shion: gemessen war die
       Mechanik-Linie als Einzelbonus exakt so stark wie gar keine Passive. */
    passiv('shion_mec3', 'Entropiebruch', 'onStart', [], ['chaos'],
      'Der ganze Trupp verursacht +6 % Schaden je Chaos-Stapel, den das Ziel trägt',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Entropiebruch', fn: function (k) {
            k.dmg *= 1 + 0.06 * (k.target.status.chaos || 0);
          } });
        });
      }),
    passiv('shion_mec4', 'Gesetzlosigkeit', 'onStart', ['chaos'], [],
      'Chaos, das Shion anlegt, baut sich nicht mehr ab — es bleibt bis zum Ende des Kampfes liegen',
      function (c) { c.self.gesetzlos = 1; }),

    passiv('shion_unt1', 'Realitätswarp', 'onStart', ['chaos'], [],
      'Jeder von Shion angelegte Chaos-Stapel legt dem eigenen Trupp ebenso viel Antichaos an — dieselbe Streuung, aber nur nach oben',
      function (c) { c.self.antichaosWarp = Math.max(c.self.antichaosWarp || 0, 1); }),
    passiv('shion_unt2', 'Ordnung aus Unordnung', 'onChaos', ['chaos', 'heilung'], [],
      'Jeder angelegte Stapel gibt allen Verbündeten +1 Regeneration',
      function (c) { c.allies().forEach(function (u) { u.regen += Math.max(1, Math.round(c.stapel)); }); }),
    passiv('shion_unt3', 'Geteilte Wut', 'onStart', ['chaos'], [],
      'Der Realitätswarp legt doppelt so viel Antichaos an',
      function (c) { c.self.antichaosWarp = (c.self.antichaosWarp || 0) + 1; }),
    passiv('shion_unt4', 'Wille der Herrin', 'onStart', ['chaos', 'schild'], [],
      'Der ganze Trupp startet mit 3 Antichaos und Schild 30',
      function (c) {
        c.allies().forEach(function (u) {
          c.applyStatus(u, 'antichaos', 3);
          c.applyStatus(u, 'schild', 30);
        });
      }),

    passiv('shion_def1', 'Ogerschild', 'onStart', [], [],
      '+20 % maximales Leben, je Oger im Trupp weitere +2 %',
      function (c) {
        var oger = c.allies().filter(function (u) { return u.tags.indexOf('oger') >= 0; }).length;
        var add = Math.round(c.self.maxHp * (0.2 + 0.02 * oger));
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('shion_def2', 'Fleisch des Kriegers', 'onStart', ['schild'], [],
      '+6 Rüstung und Schild 40',
      function (c) { c.self.def += 6; c.applyStatus(c.self, 'schild', 40); }),
    passiv('shion_def3', 'Unsterblicher Zorn', 'onDeath', ['chaos', 'heilung'], [],
      'Shion steht einmal mit 35 % Leben wieder auf und legt allen Gegnern 3 Chaos an',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.35);
        c.foes().forEach(function (f) { c.applyStatus(f, 'chaos', 3); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('shion_def4', 'Chaosbollwerk', 'onStart', [], [],
      'Kein einzelner Treffer nimmt Shion mehr als 12 % ihres maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.12); })
  ];

  /* Vier Linien à vier Stufen. Die Stufe entspricht dem Rang: bei der Anwerbung
     Stufe 1, dann je Aufstieg die nächste. Wer hier nicht steht, bekommt weiter
     die drei festen Passiven aus data.js. */
  var linien = {
    shion: {
      angriff: ['shion_ang1', 'shion_ang2', 'shion_ang3', 'shion_ang4'],
      mechanik: ['shion_mec1', 'shion_mec2', 'shion_mec3', 'shion_mec4'],
      unterstuetzung: ['shion_unt1', 'shion_unt2', 'shion_unt3', 'shion_unt4'],
      defensive: ['shion_def1', 'shion_def2', 'shion_def3', 'shion_def4']
    }
  };
  var LINIEN_NAME = { angriff: 'Angriff', mechanik: 'Chaos-Mechanik',
                      unterstuetzung: 'Unterstützung', defensive: 'Defensive' };

  /* Die vier Angebote einer Stufe — eines je Linie. */
  function linienAngebot(unitId, stufe) {
    var l = linien[unitId];
    if (!l) return [];
    return Object.keys(l).map(function (k) {
      return { linie: k, linieName: LINIEN_NAME[k], id: l[k][Math.min(stufe, l[k].length) - 1] };
    });
  }

  /* ---- Aktive Fähigkeiten zur Auswahl beim Aufstieg ----------------------- */

  var pool = [
    aktiv('wuchtschlag', 'Kraftschlag', 3, [], 'Angriff mit 200 % Schaden',
      function (c) { c.attack(2); }),
    aktiv('doppelhieb', 'Doppelklinge', 3, [], 'Zwei Angriffe mit je 95 %',
      function (c) { c.attack(0.95); c.attack(0.95); }),
    aktiv('giftstoss', 'Giftnadel', 3, ['gift'], '120 % Schaden und 4 Gift',
      function (c) { c.attack(1.2); c.applyStatus(c.target, 'gift', 4); }),
    aktiv('flammenstoss', 'Flammenschlag', 3, ['brand'], '120 % Schaden und 3 Brand',
      function (c) { c.attack(1.2); c.applyStatus(c.target, 'brand', 3); }),
    aktiv('froststoss', 'Eisklinge', 4, ['frost'], '100 % Schaden, 60 % Chance auf Erstarrung',
      function (c) { c.attack(1); if (c.rng() < 0.6) c.applyStatus(c.target, 'erstarrung', 1); }),
    aktiv('fluchstoss', 'Fluchklinge', 3, ['verderbnis'], '110 % Schaden und 2 Verderbnis',
      function (c) { c.attack(1.1); c.applyStatus(c.target, 'verderbnis', 2); }),
    aktiv('rundumschlag', 'Klingensturm', 4, ['flaeche'],
      '80 % Schaden auf alle Gegner. Wird nur eingesetzt, wenn mindestens zwei Gegner stehen.',
      function (c) { c.foes().forEach(function (f) { c.attack(0.8, f); }); }, mehrereGegner),
    aktiv('heilwelle', 'Heiliger Segen', 4, ['heilung'],
      'Heilt alle Verbündeten um 120 % des Angriffs. Wird nur eingesetzt, wenn jemand verwundet ist.',
      function (c) { c.allies().forEach(function (u) { c.heal(u, c.self.atk * 1.2, 'Heiliger Segen'); }); },
      verwundet),
    aktiv('schildruf', 'Schutzfeld', 4, ['schild'],
      'Schild in Höhe von 150 % des Angriffs für alle. Wird erst eingesetzt, wenn die Schilde dünn geworden sind.',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 1.5)); }); },
      function (c) { return c.allies.some(function (u) { return (u.status.schild || 0) < c.self.atk; }); }),
    aktiv('hinrichtung', 'Todesurteil', 4, ['exekution'],
      '300 % Schaden gegen Ziele unter der Hälfte ihres Lebens — auf ein volles Ziel wartet sie.',
      function (c) { c.attack(c.target.hp < c.target.maxHp * 0.35 ? 3 : 1.4); },
      function (c) { return c.target.hp < c.target.maxHp * 0.5; }),
    aktiv('aderlass', 'Blutschnitt', 3, ['heilung'], '150 % Schaden, heilt die Hälfte davon',
      function (c) { var d = c.attack(1.5); c.heal(c.self, d * 0.5, 'Aderlass'); }),
    aktiv('hetzjagd', 'Blutspur', 3, ['exekution'], '150 % Schaden auf das schwächste Ziel',
      function (c) {
        var f = c.foes().reduce(function (a, b) { return b.hp < a.hp ? b : a; });
        c.attack(1.5, f);
      }),
    aktiv('panzerbruch', 'Panzerbruch', 3, [], '160 % Schaden, ignoriert Rüstung',
      function (c) { c.attack(1.6, c.target, { pierce: 1 }); }),
    aktiv('seelenschlag', 'Seelenschnitt', 4, [], '120 % Schaden, geht durch Schilde',
      function (c) { c.deal(c.target, c.self.atk * 1.2, 'Seelenschlag', { pure: true }); }),
    aktiv('ansporn', 'Anführerbefehl', 5, ['tempo'], 'Alle Verbündeten dauerhaft +15 % Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.15); }); }),
    aktiv('betaeubung', 'Lähmender Atem', 4, ['frost'],
      '80 % Schaden, 70 % Chance auf Erstarrung. Ein bereits erstarrtes Ziel lässt sie in Ruhe.',
      function (c) { c.attack(0.8); if (c.rng() < 0.7) c.applyStatus(c.target, 'erstarrung', 1); },
      function (c) { return !(c.target.status.erstarrung > 0); }),

    /* Ab hier: Tiefe je Thema. Der Aufstieg bietet vorrangig an, was zur Einheit
       passt (Run.rankUp) — dafür braucht jedes Thema mehr als einen Eintrag,
       sonst sieht dieselbe Einheit immer dieselbe Fähigkeit. */
    aktiv('giftwolke', 'Giftschwaden', 4, ['gift', 'flaeche'], '70 % Schaden auf alle Gegner und je 2 Gift',
      function (c) { c.foes().forEach(function (f) { c.attack(0.7, f); c.applyStatus(f, 'gift', 2); }); },
      mehrereGegner),
    aktiv('feuersbrunst', 'Feuersbrunst', 4, ['brand', 'flaeche'], '70 % Schaden auf alle Gegner und je 2 Brand',
      function (c) { c.foes().forEach(function (f) { c.attack(0.7, f); c.applyStatus(f, 'brand', 2); }); },
      mehrereGegner),
    aktiv('frostnova', 'Frostnova', 5, ['frost', 'flaeche'],
      '60 % Schaden auf alle Gegner, jedes Ziel mit 30 % Chance erstarrt',
      function (c) {
        c.foes().forEach(function (f) { c.attack(0.6, f); if (c.rng() < 0.3) c.applyStatus(f, 'erstarrung', 1); });
      }, mehrereGegner),
    aktiv('fluchmal', 'Fluchmal', 4, ['verderbnis'],
      '90 % Schaden und 4 Verderbnis. Auf ein voll verfluchtes Ziel wird sie nicht verschwendet.',
      function (c) { c.attack(0.9); c.applyStatus(c.target, 'verderbnis', 4); },
      function (c) { return (c.target.status.verderbnis || 0) < 4; }),
    aktiv('schildstoss', 'Schildstoß', 3, ['schild'],
      '110 % Schaden plus die Hälfte des eigenen Schilds obendrauf, danach Schild 20',
      function (c) {
        var s = c.self.status.schild || 0;
        c.attack(1.1);
        if (s >= 2) c.deal(c.target, s * 0.5, 'Schildstoß');
        c.applyStatus(c.self, 'schild', 20);
      }),
    aktiv('trutzwall', 'Trutzwall', 5, ['schild'],
      'Schild in Höhe von 250 % des Angriffs und Regeneration 8. Wartet, bis der eigene Schild dünn ist.',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.atk * 2.5)); c.self.regen += 8; },
      function (c) { return (c.self.status.schild || 0) < c.self.atk; }),
    aktiv('lebensbund', 'Lebensbund', 4, ['heilung'],
      'Heilt die am schwersten verwundete Verbündete um 220 % des Angriffs',
      function (c) {
        var u = c.allies().reduce(function (a, b) { return (b.maxHp - b.hp) > (a.maxHp - a.hp) ? b : a; });
        c.heal(u, c.self.atk * 2.2, 'Lebensbund');
      }, verwundet),
    aktiv('vergeltung', 'Vergeltung', 3, ['konter'],
      '100 % Schaden, und je fehlendem Zehntel Leben 15 % mehr — bei einem Rest von 10 % also mehr als das Doppelte',
      function (c) { c.attack(1 + 1.35 * (1 - c.self.hp / c.self.maxHp)); }),
    aktiv('dornenstoss', 'Dornenmantel', 4, ['konter'],
      '90 % Schaden und bis zum Kampfende erleiden Angreifer die Hälfte des eigenen Angriffs zurück',
      function (c) {
        c.attack(0.9);
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Dornenmantel',
          fn: function (k) { var f = k.foes()[0]; if (f) k.deal(f, k.self.atk * 0.5, 'Dornenmantel'); } });
      },
      /* Ein zweiter Mantel stapelt sich sonst über den ganzen Kampf hoch. */
      function (c) { return !c.self.effects.some(function (e) { return e.name === 'Dornenmantel'; }); }),
    aktiv('sturmlauf', 'Sturmlauf', 4, ['tempo'], '120 % Schaden und dauerhaft +25 % eigenes Tempo',
      function (c) { c.attack(1.2); c.self.spd = Math.round(c.self.spd * 1.25); }),
    aktiv('blitzfolge', 'Blitzfolge', 4, ['tempo'], 'Drei Angriffe mit je 65 %',
      function (c) { c.attack(0.65); c.attack(0.65); c.attack(0.65); }),
    aktiv('spiegelhieb', 'Spiegelhieb', 3, ['konter'],
      '90 % Schaden plus ein Drittel dessen, was die Trägerin bisher selbst eingesteckt hat',
      function (c) { c.attack(0.9); c.deal(c.target, (c.self.dmgTaken || 0) / 3, 'Spiegelhieb'); }),
    aktiv('seuchenstoss', 'Seuchenstoß', 3, ['gift', 'verderbnis'], '100 % Schaden, 3 Gift und 1 Verderbnis',
      function (c) {
        c.attack(1);
        c.applyStatus(c.target, 'gift', 3);
        c.applyStatus(c.target, 'verderbnis', 1);
      }),
    aktiv('brandmal', 'Brandmal', 3, ['brand'], '90 % Schaden und 2 Brand — gegen brennende Ziele stattdessen 200 %',
      function (c) { c.attack(c.target.status.brand > 0 ? 2 : 0.9); c.applyStatus(c.target, 'brand', 2); }),
    aktiv('kopfgeld', 'Kopfgeld', 4, ['exekution'],
      '130 % Schaden. Stirbt das Ziel, ist die Fähigkeit sofort wieder bereit.',
      function (c) { c.attack(1.3); if (c.target.hp <= 0) c.aktive.bereit = 0; }),

    /* Chaos im Pool: ohne diese drei hätte die Linie nur Shions Signatur, und
       ihr Aufstiegsangebot fiele auf beliebige Fähigkeiten zurück. */
    aktiv('wirrsal', 'Wirrsal', 3, ['chaos'], '110 % Schaden und 2 Chaos',
      function (c) { c.attack(1.1); c.chaos(c.target, 2); }),
    aktiv('entropiewelle', 'Entropiewelle', 5, ['chaos', 'flaeche'],
      '60 % Schaden und je 2 Chaos auf alle Gegner',
      function (c) { c.foes().forEach(function (f) { c.attack(0.6, f); c.chaos(f, 2); }); },
      mehrereGegner),
    aktiv('gesetzlos', 'Gesetzloser Schnitt', 4, [], null,
      function (c) { c.attack(1.2 + 0.15 * (c.target.status.chaos || 0)); },
      function (c) { return (c.target.status.chaos || 0) > 0; })
  ];
  /* Verstärker-Angabe getrennt, weil `aktiv()` sie nicht kennt. */
  pool[pool.length - 1].amplifies = ['chaos'];
  pool[pool.length - 1].text = '120 % Schaden, plus 15 % je Chaos-Stapel auf dem Ziel. ' +
    'Wartet, bis überhaupt Chaos liegt.';

  /* ---- Signaturen: genau eine je Einheit, nicht im Pool -------------------
     Jede hat zwei Teile: eine Grundwirkung und eine Bedingung, die sich lohnt.
     Namen und Wirkung sind an die Vorlage angelehnt.                         */

  var signatures = [
    /* Rimuru: Wasserklinge schneidet durch alles; jeder Kill macht ihn stärker (Prädator). */
    aktiv('sig_rimuru', 'Wasserklinge', 3, ['exekution'],
      '170 % Schaden und ignoriert Rüstung vollständig. Tötet der Schlag, wächst Rimurus Angriff dauerhaft um 12 %.',
      function (c) {
        c.attack(1.7, c.target, { pierce: 1 });
        if (c.target.hp <= 0) c.self.atk = Math.round(c.self.atk * 1.12);
      }),

    /* --- Goblins --- */
    aktiv('sig_gobta', 'Gobtas Glück', 3, ['schild'],
      '150 % Schaden und Schild 20. Steht Gobta unter der Hälfte seines Lebens, ist der Schild doppelt so stark.',
      function (c) {
        c.attack(1.5);
        c.applyStatus(c.self, 'schild', c.self.hp < c.self.maxHp * 0.5 ? 40 : 20);
      }),
    aktiv('sig_gobkyu', 'Windpfeil', 2, [],
      '120 % Schaden auf die Hinterreihe. Trägt das Ziel bereits einen Zustand, sind es 170 %.',
      function (c) {
        var f = c.foes(), ziel = f[f.length - 1];
        var belastet = ziel.status.gift || ziel.status.brand || ziel.status.erstarrung || ziel.status.verderbnis;
        c.attack(belastet ? 1.7 : 1.2, ziel);
      }),
    aktiv('sig_rigurd', 'Häuptlingsruf', 4, ['schild'],
      'Alle Verbündeten erhalten Schild 25 und +3 Rüstung, die vorderste Einheit zusätzlich +15 % Angriff.',
      function (c) {
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 25); u.def += 3; });
        var vorn = c.allies()[0];
        if (vorn) vorn.atk = Math.round(vorn.atk * 1.15);
      }),
    aktiv('sig_rigur', 'Wachkommando', 3, ['konter'],
      '130 % Schaden und Schild 20. Ist bereits ein Verbündeter gefallen, verdoppelt sich der Schaden.',
      function (c) {
        c.attack(c.self._gefallen ? 2.6 : 1.3);
        c.applyStatus(c.self, 'schild', 20);
      }),
    aktiv('sig_gobwa', 'Feldverband', 3, ['heilung'],
      'Heilt den schwächsten Verbündeten um 200 % des Angriffs. Liegt er unter 40 % Leben, gibt es zusätzlich Schild 25.',
      function (c) {
        var u = c.allies().reduce(function (a, b) { return (b.hp / b.maxHp) < (a.hp / a.maxHp) ? b : a; });
        c.heal(u, c.self.atk * 2, 'Feldverband');
        if (u.hp < u.maxHp * 0.4) c.applyStatus(u, 'schild', 25);
      }),

    /* --- Oger --- */
    aktiv('sig_benimaru', 'Kurenai', 3, ['brand', 'flaeche'],
      '150 % Schaden und 4 Brand. Brannte das Ziel schon, springt die Flamme für 60 % auf alle anderen Gegner über.',
      function (c) {
        var brannte = c.target.status.brand > 0;
        var haupt = c.target;
        c.attack(1.5);
        c.applyStatus(haupt, 'brand', 4);
        if (brannte) {
          c.foes().forEach(function (f) {
            if (f !== haupt) { c.attack(0.6, f); c.applyStatus(f, 'brand', 2); }
          });
        }
      }),
    /* Shions Signatur skaliert nicht über eine Zahl, sondern über den Rang:
       Oger → Teufel → Verdorbener Teufel → Ultimativer Teufel. */
    aktiv('sig_shion', 'Chaosschlag', 3, ['chaos'],
      '160 % Schaden und legt Chaos an — 1 Stapel auf Rang C, 2 auf B, 3 auf A, 5 auf S. ' +
      'Jeder Stapel würfelt Angriff, Rüstung und Tempo des Ziels in jeder Runde neu aus ' +
      'und lässt seine Fähigkeiten zu 5 % je Stapel verpuffen.',
      function (c) {
        c.attack(1.6);
        c.chaos(c.target, CHAOS_JE_RANG[c.self.rank || 0]);
      }),
    aktiv('sig_souei', 'Stahlfaden', 3, ['frost'],
      'Drei Angriffe mit je 70 %. Der letzte fesselt das Ziel zu 40 % und lässt es aussetzen.',
      function (c) {
        c.attack(0.7); c.attack(0.7); c.attack(0.7);
        if (c.rng() < 0.4) c.applyStatus(c.target, 'erstarrung', 1);
      }),
    aktiv('sig_shuna', 'Heiliges Feld', 4, ['heilung', 'schild'],
      'Heilt alle Verbündeten um 100 % des Angriffs, gibt Schild 20 und löscht Brand vom ganzen Trupp.',
      function (c) {
        c.allies().forEach(function (u) {
          u.status.brand = 0;
          c.heal(u, c.self.atk, 'Heiliges Feld');
          c.applyStatus(u, 'schild', 20);
        });
      }),
    aktiv('sig_hakuro', 'Fliegender Hieb', 3, [],
      '180 % Schaden und ignoriert Rüstung. Gegen ein noch unverletztes Ziel (über 70 % Leben) sind es 230 %.',
      function (c) {
        c.attack(c.target.hp > c.target.maxHp * 0.7 ? 2.3 : 1.8, c.target, { pierce: 1 });
      }),
    aktiv('sig_kurobe', 'Geschmiedete Klinge', 5, [],
      'Alle Verbündeten erhalten dauerhaft +6 Angriff. Ist Kurobe unverletzt, zusätzlich +2 Rüstung.',
      function (c) {
        var voll = c.self.hp >= c.self.maxHp;
        c.allies().forEach(function (u) { u.atk += 6; if (voll) u.def += 2; });
      }),

    /* --- Sturmwölfe --- */
    aktiv('sig_ranga', 'Schwarzer Blitz', 2, ['flaeche', 'frost'],
      '140 % Schaden, der für 60 % auf ein zweites Ziel überspringt. Der Blitzschlag lähmt dieses zweite Ziel zu 25 %.',
      function (c) {
        c.attack(1.4);
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) {
          c.attack(0.6, f);
          if (c.rng() < 0.25) c.applyStatus(f, 'erstarrung', 1);
        }
      }),
    aktiv('sig_sturmwolf', 'Hetzbiss', 3, ['exekution'],
      '120 % Schaden auf das schwächste Ziel. Stirbt es dabei, folgt sofort ein zweiter Biss.',
      function (c) {
        var schwach = c.foes().reduce(function (a, b) { return b.hp < a.hp ? b : a; });
        c.attack(1.2, schwach);
        if (schwach.hp <= 0) {
          var naechstes = c.foes()[0];
          if (naechstes) c.attack(1.2, naechstes);
        }
      }),
    aktiv('sig_schattenwolf', 'Frostbiss', 3, ['frost'],
      '110 % Schaden und 35 % Chance auf Erstarrung. Gegen ein bereits erstarrtes Ziel doppelter Schaden.',
      function (c) {
        c.attack(c.target.status.erstarrung > 0 ? 2.2 : 1.1);
        if (c.rng() < 0.35) c.applyStatus(c.target, 'erstarrung', 1);
      }),
    aktiv('sig_rudelalpha', 'Rudelbefehl', 4, ['tempo'],
      'Alle Verbündeten dauerhaft +20 % Tempo, die schnellste Einheit zusätzlich +10 % Angriff.',
      function (c) {
        var alle2 = c.allies();
        alle2.forEach(function (u) { u.spd = Math.round(u.spd * 1.2); });
        var schnellste = alle2.reduce(function (a, b) { return b.spd > a.spd ? b : a; });
        schnellste.atk = Math.round(schnellste.atk * 1.1);
      }),

    /* --- Echsenmenschen --- */
    aktiv('sig_gabiru', 'Wirbelspeer', 3, ['flaeche'],
      '90 % Schaden auf alle Gegner. Stehen noch drei oder mehr, sind es 120 % — Gabiru läuft zur Hochform auf.',
      function (c) {
        var viele = c.foes().length >= 3;
        c.foes().forEach(function (f) { c.attack(viele ? 1.2 : 0.9, f); });
      }),
    aktiv('sig_souka', 'Zielschuss', 3, [],
      '160 % Schaden auf die Hinterreihe und ignoriert die Hälfte der Rüstung.',
      function (c) {
        var f = c.foes();
        c.attack(1.6, f[f.length - 1], { pierce: 0.5 });
      }),
    aktiv('sig_echsenfuerst', 'Bollwerk', 4, ['schild', 'heilung'],
      'Schild 60 auf sich, +4 Rüstung für alle. Unter der Hälfte des Lebens heilt er sich zusätzlich um 15 %.',
      function (c) {
        c.applyStatus(c.self, 'schild', 60);
        c.allies().forEach(function (u) { u.def += 4; });
        if (c.self.hp < c.self.maxHp * 0.5) c.heal(c.self, c.self.maxHp * 0.15, 'Bollwerk');
      }),
    aktiv('sig_drachenknecht', 'Speerwall', 3, ['konter'],
      '120 % Schaden. Danach erleidet jeder Angreifer dauerhaft 12 Schaden zurück.',
      function (c) {
        c.attack(1.2);
        if (c.self._wall) return;
        c.self._wall = 1;
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Speerwall', fn: function (x) {
          var f = x.foes()[0]; if (f) x.deal(f, 12, 'Speerwall');
        } });
      }),
    aktiv('sig_quellenpriesterin', 'Heilquelle', 4, ['heilung'],
      'Heilt sofort alle Verbündeten um 100 % des Angriffs und gibt ihnen dauerhaft +4 Regeneration.',
      function (c) {
        c.allies().forEach(function (u) { u.regen += 4; c.heal(u, c.self.atk, 'Heilquelle'); });
      }),

    /* --- Insektoide --- */
    aktiv('sig_zegion', 'Raumfaust', 3, [],
      '190 % Schaden, der durch Schilde hindurchgeht — und den Schild des Ziels vollständig zerschlägt.',
      function (c) {
        c.target.status.schild = 0;
        c.deal(c.target, c.self.atk * 1.9, 'Raumfaust', { pure: true });
      }),
    aktiv('sig_apito', 'Giftstachel', 3, ['gift'],
      '130 % Schaden und 5 Gift. Trägt das Ziel schon 6 Gift, geht der Stich durch jeden Schild.',
      function (c) {
        if (c.target.status.gift >= 6) c.deal(c.target, c.self.atk * 1.3, 'Giftstachel', { pure: true });
        else c.attack(1.3);
        c.applyStatus(c.target, 'gift', 5);
      }),
    aktiv('sig_riesenameise', 'Zangengriff', 3, [],
      '140 % Schaden, gegen die vorderste gegnerische Einheit sogar 190 %. Die Zangen halten das Ziel fest: dauerhaft −3 Tempo.',
      function (c) {
        var vorn = c.foes()[0];
        c.attack(c.target === vorn ? 1.9 : 1.4);
        if (c.target.hp > 0) c.target.spd = Math.max(6, c.target.spd - 3);
      }),
    aktiv('sig_kaefergarde', 'Panzerstoß', 4, ['schild'],
      '100 % Schaden und Schild 40 auf sich. Die Einheit dahinter erhält Schild 25.',
      function (c) {
        c.attack(1);
        c.applyStatus(c.self, 'schild', 40);
        var reihe = c.allies();
        var hinter = reihe[reihe.indexOf(c.self) + 1];
        if (hinter) c.applyStatus(hinter, 'schild', 25);
      }),
    aktiv('sig_giftfalter', 'Sporenwolke', 4, ['gift', 'flaeche'],
      '60 % Schaden und 2 Gift auf alle Gegner. Gegen bereits vergiftete Ziele 90 %.',
      function (c) {
        c.foes().forEach(function (f) {
          c.attack(f.status.gift > 0 ? 0.9 : 0.6, f);
          c.applyStatus(f, 'gift', 2);
        });
      }),

    /* --- Dämonen --- */
    aktiv('sig_diablo', 'Verderbnis', 3, ['verderbnis'],
      '140 % Schaden und 3 Verderbnis. Ist das Ziel bereits vollständig verderbt, reißt der Fluch zusätzlich 12 % seines maximalen Lebens heraus.',
      function (c) {
        var voll = (c.target.status.verderbnis || 0) >= 5;
        c.attack(1.4);
        if (voll) c.deal(c.target, c.target.maxHp * 0.12, 'Verderbnis', { pure: true });
        c.applyStatus(c.target, 'verderbnis', 3);
      }),
    aktiv('sig_testarossa', 'Todesstreich', 4, ['exekution'],
      '120 % Schaden plus 15 % des maximalen Lebens. Unter 30 % Leben wird daraus die doppelte Portion.',
      function (c) {
        var schwach = c.target.hp < c.target.maxHp * 0.3;
        c.attack(schwach ? 2.4 : 1.2);
        c.deal(c.target, c.target.maxHp * (schwach ? 0.3 : 0.15), 'Todesstreich', { pure: true });
      }),
    aktiv('sig_ultima', 'Seelenzehrung', 3, ['gift', 'verderbnis', 'heilung'],
      '120 % Schaden, 3 Gift und 2 Verderbnis. Ultima heilt 15 Leben für jeden Zustand, den das Ziel bereits trug.',
      function (c) {
        var zaehler = 0;
        ['gift', 'brand', 'erstarrung', 'verderbnis'].forEach(function (k) { if (c.target.status[k] > 0) zaehler++; });
        c.attack(1.2);
        c.applyStatus(c.target, 'gift', 3);
        c.applyStatus(c.target, 'verderbnis', 2);
        if (zaehler) c.heal(c.self, zaehler * 15, 'Seelenzehrung');
      }),
    aktiv('sig_carrera', 'Sprengung', 4, ['flaeche', 'brand'],
      '80 % Schaden und 2 Brand auf alle Gegner. Gegen brennende Ziele 120 %.',
      function (c) {
        c.foes().forEach(function (f) {
          c.attack(f.status.brand > 0 ? 1.2 : 0.8, f);
          c.applyStatus(f, 'brand', 2);
        });
      }),
    aktiv('sig_daemonengarde', 'Klingenschritt', 3, [],
      '150 % Schaden und ignoriert 60 % der Rüstung. Gegen schwer gepanzerte Ziele (6+ Rüstung) ignoriert er sie ganz.',
      function (c) {
        c.attack(1.5, c.target, { pierce: c.target.def >= 6 ? 1 : 0.6 });
      }),

    /* --- Drachen --- */
    aktiv('sig_veldora', 'Sturmwut', 4, ['flaeche'],
      '110 % auf das Ziel, 60 % auf alle anderen. Jeder Einsatz lädt Veldora auf: dauerhaft +8 % Angriff.',
      function (c) {
        var haupt = c.target;
        c.attack(1.1, haupt);
        c.foes().forEach(function (f) { if (f !== haupt) c.attack(0.6, f); });
        c.self.atk = Math.round(c.self.atk * 1.08);
      }),
    aktiv('sig_milim', 'Drachenfaust', 3, ['exekution'],
      '260 % Schaden. Stirbt das Ziel, ist die Faust sofort wieder bereit — Milim hört nicht auf.',
      function (c) {
        c.attack(2.6);
        if (c.target.hp <= 0 && c.aktive) c.aktive.bereit = 0;
      }),
    aktiv('sig_drachenwelpe', 'Glutatem', 3, ['brand'],
      '130 % Schaden und 3 Brand, gegen ein bereits brennendes Ziel 170 %. Brannte es schon, greift das Feuer mit 1 Brand auf ein zweites Ziel über.',
      function (c) {
        var brannte = c.target.status.brand > 0;
        var haupt = c.target;
        c.attack(brannte ? 1.7 : 1.3);
        c.applyStatus(haupt, 'brand', 3);
        if (brannte) {
          var f = c.foes().filter(function (x) { return x !== haupt; })[0];
          if (f) c.applyStatus(f, 'brand', 1);
        }
      }),
    aktiv('sig_windrache', 'Sturmschwinge', 3, ['tempo'],
      '150 % Schaden und danach dauerhaft +10 % Tempo. Ab 40 Tempo trifft der Angriff mit 190 %.',
      function (c) {
        c.attack(c.self.spd >= 40 ? 1.9 : 1.5);
        c.self.spd = Math.round(c.self.spd * 1.1);
      }),

    /* --- Untote --- */
    aktiv('sig_adalmann', 'Todesbann', 3, ['verderbnis', 'heilung'],
      '130 % Schaden und 4 Verderbnis. Stirbt das Ziel dabei, zieht Adalmann 40 Leben aus ihm.',
      function (c) {
        c.attack(1.3);
        c.applyStatus(c.target, 'verderbnis', 4);
        if (c.target.hp <= 0) c.heal(c.self, 40, 'Todesbann');
      }),
    aktiv('sig_wightkoenig', 'Grabesgriff', 3, ['heilung'],
      '140 % Schaden und heilt 60 % davon. Unter der Hälfte seines Lebens heilt er die volle Summe.',
      function (c) {
        var knapp = c.self.hp < c.self.maxHp * 0.5;
        var d = c.attack(1.4);
        c.heal(c.self, d * (knapp ? 1 : 0.6), 'Grabesgriff');
      }),
    aktiv('sig_skelettritter', 'Knochenhieb', 2, [],
      '130 % Schaden. Ist der Ritter bereits einmal gefallen und wiederauferstanden, sind es 190 %.',
      function (c) { c.attack(c.self._auf ? 1.9 : 1.3); }),
    aktiv('sig_gruftwaechter', 'Grabwache', 4, ['schild'],
      'Schild 35 auf sich und die vorderste Einheit. Liegt diese unter der Hälfte, bekommt sie das Doppelte.',
      function (c) {
        c.applyStatus(c.self, 'schild', 35);
        var vorn = c.allies()[0];
        if (vorn) c.applyStatus(vorn, 'schild', vorn.hp < vorn.maxHp * 0.5 ? 70 : 35);
      }),
    aktiv('sig_seelenhexe', 'Seelenernte', 4, ['heilung'],
      'Heilt alle Verbündeten um 90 % des Angriffs — je gefallenem Verbündeten um die Hälfte mehr.',
      function (c) {
        var tote = c.self._tote || 0;
        c.allies().forEach(function (u) { c.heal(u, c.self.atk * 0.9 * (1 + tote * 0.5), 'Seelenernte'); });
      })
  ];

  /* ---- Raritätsstufen ----------------------------------------------------
     1 üblich · 2 ungewöhnlich · 3 selten · 4 episch · 5 legendär
     Eine Tabelle statt eines weiteren Parameters an 83 Definitionen.
     Die Stufe steuert, wie oft etwas überhaupt angeboten wird — nicht nur die
     Farbe. Signaturen bekommen ihre Stufe in data.js aus den Kosten der Einheit. */

  var RARITAET = {
    /* Pool-Aktive */
    doppelhieb: 1,
    wuchtschlag: 2, giftstoss: 2, flammenstoss: 2, betaeubung: 2, aderlass: 2,
    froststoss: 3, fluchstoss: 3, hetzjagd: 3, panzerbruch: 3, schildruf: 3,
    rundumschlag: 4, heilwelle: 4, seelenschlag: 4, hinrichtung: 4,
    ansporn: 5,
    schildstoss: 1, brandmal: 1, vergeltung: 2, blitzfolge: 2, sturmlauf: 2,
    spiegelhieb: 2, seuchenstoss: 3, fluchmal: 3,
    giftwolke: 3, feuersbrunst: 3, dornenstoss: 3, lebensbund: 4, kopfgeld: 4,
    frostnova: 4, trutzwall: 5,
    /* Passive */
    kriegsherz: 1, windschritt: 1, erstschlag: 1, giftbrut: 1, glutkern: 1, schildwall: 1,
    lebenskraft: 3, bollwerkmeister: 3, massenschlaechter: 4, schwungmeister: 3, rachsucht: 3,
    blutrausch: 4, trophaenjaeger: 3,
    dornenhaut: 2, regenerator: 2, rachegeist: 2, henkersblick: 2, frostkern: 2,
    verderber: 2, quelle: 2,
    giftzahn: 3, aschehaut: 3, konterstoss: 3, lebensraub: 3, bannerherz: 3,
    zaeh: 3, jagdruf: 3, seelenband: 3,
    fluchweber: 4, frostschneide: 4, scharfrichter: 4, panzerbrecher: 4, kettenschlag: 4,
    wiederkehr: 5,
    wirrsal: 2, entropiewelle: 4, gesetzlos: 3,
    /* Shions Linien: die Stufe ist die Raritaet — Stufe 1 ungewoehnlich, Stufe 4 legendaer. */
    shion_ang1: 2, shion_mec1: 2, shion_unt1: 2, shion_def1: 2,
    shion_ang2: 3, shion_mec2: 3, shion_unt2: 3, shion_def2: 3,
    shion_ang3: 4, shion_mec3: 4, shion_unt3: 4, shion_def3: 4,
    shion_ang4: 5, shion_mec4: 5, shion_unt4: 5, shion_def4: 5
  };

  var RARITAET_NAME = ['', 'üblich', 'ungewöhnlich', 'selten', 'episch', 'legendär'];
  /* Grundgewicht für zufällige Angebote. Später im Run verschiebt sich das nach
     oben — siehe Run.gewichteteWahl. */
  var RARITAET_GEWICHT = [0, 100, 62, 34, 15, 5];

  var alle = passives.concat(pool, signatures);
  alle.forEach(function (a) { a.rarity = RARITAET[a.id] || 0; });
  function byId(id) {
    for (var i = 0; i < alle.length; i++) if (alle[i].id === id) return alle[i];
    return null;
  }

  root.Abilities = {
    passives: passives, pool: pool, signatures: signatures, alle: alle,
    linien: linien, LINIEN_NAME: LINIEN_NAME, linienAngebot: linienAngebot,
    CHAOS_JE_RANG: CHAOS_JE_RANG,
    get: byId,
    RARITAET_NAME: RARITAET_NAME, RARITAET_GEWICHT: RARITAET_GEWICHT,
    rarName: function (r) { return RARITAET_NAME[r] || ''; },
    aktiv: aktiv, passiv: passiv, chance: chance,
    /* Keyword-Übersicht für die UI: was erzeugt das Team, was verstärkt es? */
    keywords: function (abilities) {
      var out = {};
      abilities.forEach(function (a) {
        (a.keywords || []).forEach(function (k) {
          out[k] = out[k] || { quellen: 0, verstaerker: 0 };
          out[k].quellen++;
        });
        (a.amplifies || []).forEach(function (k) {
          out[k] = out[k] || { quellen: 0, verstaerker: 0 };
          out[k].verstaerker++;
        });
      });
      return out;
    }
  };
})(globalThis);
