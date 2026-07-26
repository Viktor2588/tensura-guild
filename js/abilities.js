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
  var MARKE_JE_RANG = [1, 2, 3, 5];

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
      'Angreifer erleiden 8 Schaden plus ein Viertel des eigenen Angriffs zurück',
      function (c) { var f = c.foes()[0]; if (f) c.deal(f, 8 + c.self.atk * 0.25, 'Dornen'); }),
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
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.12); }),

    /* ---- Soueis Linien ----------------------------------------------------
       Der Assassine baut nicht sich selbst auf, sondern reißt das Ziel für die
       anderen auf. Deshalb liegt hier die stärkste Unterstützungslinie im Spiel
       — und die schwächste Angriffslinie. `onMarke` feuert, sobald Souei
       markiert; `c.stapel` ist die Menge nach der Zielsicherheit.             */

    passiv('souei_ang1', 'Schattenschnitt', 'onHit', [], ['verwundbar'],
      '+7 % Schaden je Verwundbar-Stapel auf dem Ziel',
      function (c) { c.dmg *= 1 + 0.07 * (c.target.status.verwundbar || 0); }),
    passiv('souei_ang2', 'Meuchler', 'onHit', [], ['verwundbar'],
      'Gegen verwundbare Ziele +30 % Schaden, und die Rüstung zählt gar nicht mehr',
      function (c) {
        if (!(c.target.status.verwundbar > 0)) return;
        c.dmg *= 1.3;
        c.self.pierce = 1;
      }),
    passiv('souei_ang3', 'Klingentanz', 'onHit', ['flaeche'], ['verwundbar'],
      '35 % Chance auf einen zweiten Schlag für 50 %, wenn das Ziel verwundbar ist',
      function (c) {
        if (!(c.target.status.verwundbar > 0) || c.rng() >= 0.35) return;
        c.deal(c.target, c.self.atk * 0.5, 'Klingentanz');
      }),
    passiv('souei_ang4', 'Todesmal', 'onHit', [], ['verwundbar', 'exekution'],
      'Doppelter Schaden gegen verwundbare Ziele unter 40 % ihres Lebens',
      function (c) {
        if (c.target.status.verwundbar > 0 && c.target.hp < c.target.maxHp * 0.4) c.dmg *= 2;
      }),

    passiv('souei_mec1', 'Zielsicherheit', 'onStart', [], ['verwundbar'],
      'Souei setzt 50 % mehr Verwundbar-Stapel, als die Fähigkeit angibt',
      function (c) { c.self.markenmeister = Math.max(c.self.markenmeister || 1, 1.5); }),
    passiv('souei_mec2', 'Aufgerissene Wunde', 'onMarke', ['blutung'], [],
      'Jede Markierung legt zusätzlich 3 Blutung an — Schaden je Zug nach dem Leben des Ziels',
      function (c) { c.applyStatus(c.ziel, 'blutung', 3); }),
    passiv('souei_mec3', 'Offene Wunde', 'onStart', ['verwundbar'], [],
      'Verwundbar, das Souei setzt, baut sich nicht mehr ab',
      function (c) { c.self.offeneWunde = 1; }),
    passiv('souei_mec4', 'Schwarmmal', 'onKill', ['verwundbar'], [],
      'Stirbt ein markiertes Ziel, geht die Marke auf alle übrigen Gegner über',
      function (c) {
        var n = (c.getoetet && c.getoetet.status.verwundbar) || 0;
        if (n) c.foes().forEach(function (f) { c.applyStatus(f, 'verwundbar', n); });
      }),

    passiv('souei_unt1', 'Gezeichnetes Ziel', 'onStart', [], ['verwundbar'],
      'Der ganze Trupp verursacht +6 % Schaden je Verwundbar-Stapel auf dem Ziel',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gezeichnetes Ziel', fn: function (k) {
            k.dmg *= 1 + 0.06 * (k.target.status.verwundbar || 0);
          } });
        });
      }),
    passiv('souei_unt2', 'Blutspur', 'onStart', ['blutung'], ['verwundbar'],
      'Treffer des ganzen Trupps auf verwundbare Ziele legen 1 Blutung an',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Blutspur', fn: function (k) {
            if (k.target.status.verwundbar > 0) k.applyStatus(k.target, 'blutung', 1);
          } });
        });
      }),
    passiv('souei_unt3', 'Giftmal', 'onStart', ['gift'], ['verwundbar'],
      'Treffer des ganzen Trupps auf verwundbare Ziele legen 2 Gift an',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Giftmal', fn: function (k) {
            if (k.target.status.verwundbar > 0) k.applyStatus(k.target, 'gift', 2);
          } });
        });
      }),
    passiv('souei_unt4', 'Jagdbefehl', 'onStart', [], ['verwundbar'],
      'Der ganze Trupp greift bevorzugt das am stärksten markierte Ziel an, statt der eigenen Rolle zu folgen',
      function (c) { c.allies().forEach(function (u) { u.jagdbefehl = 1; }); }),

    passiv('souei_def1', 'Schattenschritt', 'onStart', ['tempo'], [],
      '+25 % Tempo und +4 Rüstung',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.25); c.self.def += 4; }),
    passiv('souei_def2', 'Fadenschild', 'onStart', ['schild'], [],
      'Schild 35, plus 15 je verwundbarem Gegner',
      function (c) {
        var n = c.foes().filter(function (f) { return f.status.verwundbar > 0; }).length;
        c.applyStatus(c.self, 'schild', 35 + 15 * n);
      }),
    passiv('souei_def3', 'Gegenfaden', 'onDamaged', ['verwundbar', 'konter'], [],
      'Wer Souei trifft, wird selbst verwundbar',
      function (c) { var f = c.foes()[0]; if (f) c.applyStatus(f, 'verwundbar', 1); }),
    passiv('souei_def4', 'Nebelform', 'onStart', [], ['verwundbar'],
      'Souei erleidet 30 % weniger Schaden, solange er in Deckung der Marke kämpft',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.3); }),

    /* ---- Benimarus Linien: Brand und Fläche -------------------------------
       Der Feldherr. Er setzt das Feld in Brand und schlägt Kapital daraus — für
       sich und für den Trupp.                                                 */

    passiv('ben_ang1', 'Glutzorn', 'onHit', [], ['brand'],
      '+7 % Schaden je Brand-Stapel auf dem Ziel',
      function (c) { c.dmg *= 1 + 0.07 * (c.target.status.brand || 0); }),
    passiv('ben_ang2', 'Feuertaufe', 'onHit', [], ['brand'],
      'Gegen brennende Ziele +30 % Schaden, und die halbe Rüstung zählt nicht',
      function (c) {
        if (!(c.target.status.brand > 0)) return;
        c.dmg *= 1.3;
        c.self.pierce = Math.max(c.self.pierce || 0, 0.5);
      }),
    passiv('ben_ang3', 'Aschesturm', 'onHit', ['flaeche'], ['brand'],
      '30 % Chance, zusätzlich jeden brennenden Gegner für 45 % zu treffen',
      chance(0.3, function (c) {
        c.foes().forEach(function (f) {
          if (f !== c.target && f.status.brand > 0) c.deal(f, c.self.atk * 0.45, 'Aschesturm');
        });
      })),
    passiv('ben_ang4', 'Entfesseltes Kurenai', 'onKill', ['brand', 'flaeche'], [],
      'Jeder erlegte Gegner setzt allen übrigen 3 Brand und gibt Benimaru +12 % Angriff',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 3); });
        c.self.atk = Math.round(c.self.atk * 1.12);
      }),

    passiv('ben_mec1', 'Flammenmeister', 'onHit', ['brand'], [],
      'Brennt das Ziel bereits, legt jeder Treffer 2 Brand nach',
      function (c) { if (c.target.status.brand > 0) c.applyStatus(c.target, 'brand', 2); }),
    passiv('ben_mec2', 'Zunder', 'onHit', ['brand', 'flaeche'], [],
      '40 % Chance, das Feuer mit 2 Brand auf einen zweiten Gegner zu tragen',
      chance(0.4, function (c) {
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) c.applyStatus(f, 'brand', 2);
      })),
    passiv('ben_mec3', 'Dauerbrand', 'onHit', ['brand'], [],
      'Brand auf Benimarus Zielen baut sich nicht mehr ab',
      function (c) { c.target.brandBleibt = 1; }),
    passiv('ben_mec4', 'Höllenlohe', 'onHit', [], ['brand'],
      'Brand richtet auf Benimarus Zielen doppelten Schaden an',
      function (c) { c.target.brandFaktor = Math.max(c.target.brandFaktor || 1, 2); }),

    passiv('ben_unt1', 'Feldherr', 'onStart', [], [],
      'Alle Verbündeten erhalten +12 % Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.12); }); }),
    passiv('ben_unt2', 'Brandzeichen', 'onStart', ['brand'], [],
      'Jeder Treffer des ganzen Trupps legt 1 Brand an',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Brandzeichen', fn: function (k) {
            k.applyStatus(k.target, 'brand', 1);
          } });
        });
      }),
    passiv('ben_unt3', 'Sengende Reihen', 'onStart', [], ['brand'],
      'Der ganze Trupp verursacht +5 % Schaden je Brand-Stapel auf dem Ziel',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Sengende Reihen', fn: function (k) {
            k.dmg *= 1 + 0.05 * (k.target.status.brand || 0);
          } });
        });
      }),
    passiv('ben_unt4', 'Kriegsherr', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +18 % Angriff und +10 % Tempo',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.18);
          u.spd = Math.round(u.spd * 1.1);
        });
      }),

    passiv('ben_def1', 'Flammenhaut', 'onDamaged', ['brand', 'konter'], [],
      'Wer Benimaru trifft, fängt mit 2 Brand Feuer',
      function (c) { var f = c.foes()[0]; if (f) c.applyStatus(f, 'brand', 2); }),
    passiv('ben_def2', 'Glutpanzer', 'onStart', ['schild'], [],
      '+5 Rüstung und Schild 40',
      function (c) { c.self.def += 5; c.applyStatus(c.self, 'schild', 40); }),
    passiv('ben_def3', 'Ascheleib', 'onDamaged', ['heilung'], ['brand'],
      'Brennt der Angreifer, heilt Benimaru sich um 3 % seines maximalen Lebens',
      function (c) {
        var f = c.foes()[0];
        if (f && f.status.brand > 0) c.heal(c.self, c.self.maxHp * 0.03, 'Ascheleib');
      }),
    passiv('ben_def4', 'Wiedergeburt aus Asche', 'onDeath', ['brand', 'heilung'], [],
      'Steht einmal mit 40 % Leben wieder auf und setzt alle Gegner mit 5 Brand in Flammen',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 5); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Shunas Linien: Heilung und Schild --------------------------------
       Die Priesterin hält den Trupp am Leben. Ihre Angriffslinie ist bewusst
       die schwächste — dafür ist keine Unterstützung dichter.                 */

    passiv('shu_ang1', 'Segensklinge', 'onHit', [], [],
      '+25 % Schaden, solange Shuna über 80 % ihres Lebens steht',
      function (c) { if (c.self.hp > c.self.maxHp * 0.8) c.dmg *= 1.25; }),
    passiv('shu_ang2', 'Läuterung', 'onHit', [], ['gift', 'brand', 'frost', 'verderbnis'],
      '+35 % Schaden gegen Ziele, die irgendeinen Zustand tragen',
      function (c) {
        var s2 = c.target.status;
        if (s2.gift > 0 || s2.brand > 0 || s2.erstarrung > 0 || s2.verderbnis > 0) c.dmg *= 1.35;
      }),
    passiv('shu_ang3', 'Zorn der Priesterin', 'onHit', [], ['heilung'],
      '+40 % Schaden, solange kein Verbündeter unter 70 % Leben steht',
      function (c) {
        if (c.allies().every(function (u) { return u.hp > u.maxHp * 0.7; })) c.dmg *= 1.4;
      }),
    passiv('shu_ang4', 'Heiliger Zorn', 'onHit', [], [],
      '+9 % Schaden je lebendem Verbündeten',
      function (c) { c.dmg *= 1 + 0.09 * c.allies().length; }),

    passiv('shu_mec1', 'Gnadenquelle', 'onStart', [], ['heilung'],
      'Jede Heilung im Trupp wirkt um 50 % stärker',
      function (c) { c.allies().forEach(function (u) { u.heilfaktor += 0.5; }); }),
    passiv('shu_mec2', 'Bollwerk des Glaubens', 'onStart', [], ['schild'],
      'Jeder Schild im Trupp ist um 40 % stärker',
      function (c) { c.allies().forEach(function (u) { u.schildfaktor += 0.4; }); }),
    passiv('shu_mec3', 'Überfluss', 'onStart', ['schild'], ['heilung'],
      'Heilung über das Maximum hinaus wird beim ganzen Trupp zu Schild',
      function (c) { c.allies().forEach(function (u) { u.ueberheilung = Math.max(u.ueberheilung || 0, 1); }); }),
    passiv('shu_mec4', 'Ewige Quelle', 'onStart', ['heilung'], [],
      'Alle Verbündeten erhalten +8 Regeneration',
      function (c) { c.allies().forEach(function (u) { u.regen += 8; }); }),

    passiv('shu_unt1', 'Schutzkreis', 'onStart', ['schild'], [],
      'Alle Verbündeten starten mit Schild 30',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 30); }); }),
    passiv('shu_unt2', 'Reinigung', 'onTurnStart', ['heilung'], [],
      'Nimmt dem ganzen Trupp in jedem Zug einen Stapel Gift und einen Brand',
      function (c) {
        c.allies().forEach(function (u) {
          if (u.status.gift > 0) u.status.gift--;
          if (u.status.brand > 0) u.status.brand--;
        });
      }),
    passiv('shu_unt3', 'Lebensband', 'onAllyDeath', ['heilung'], [],
      'Stirbt ein Verbündeter, heilen alle übrigen 25 % ihres maximalen Lebens',
      function (c) { c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.25, 'Lebensband'); }); }),
    passiv('shu_unt4', 'Göttlicher Segen', 'onStart', ['heilung'], [],
      'Alle Verbündeten erhalten +20 % maximales Leben',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.2);
          u.maxHp += add; u.hp += add;
        });
      }),

    passiv('shu_def1', 'Gebetsschild', 'onStart', ['schild'], [],
      'Shuna startet mit Schild 50',
      function (c) { c.applyStatus(c.self, 'schild', 50); }),
    passiv('shu_def2', 'Unantastbar', 'onStart', [], [],
      'Shuna erleidet 22 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.22); }),
    passiv('shu_def3', 'Letzte Bitte', 'onDeath', ['heilung'], [],
      'Steht einmal mit 50 % Leben wieder auf und heilt den Trupp um 20 %',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.2, 'Letzte Bitte'); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('shu_def4', 'Heiliger Hain', 'onTurnStart', ['heilung'], [],
      'Heilt sich in jedem Zug um 5 % ihres maximalen Lebens',
      function (c) { c.heal(c.self, c.self.maxHp * 0.05, 'Heiliger Hain'); }),

    /* ---- Hakuros Linien: Klinge und Exekution -----------------------------
       Der alte Schwertmeister. Er räumt Angeschlagene ab und bringt dem Trupp
       bei, dasselbe zu tun.                                                   */

    passiv('hak_ang1', 'Klingengeist', 'onStart', ['tempo'], [],
      '+8 Angriff und +3 Tempo',
      function (c) { c.self.atk += 8; c.self.spd += 3; }),
    passiv('hak_ang2', 'Schwertmeister', 'onHit', [], [],
      '+20 % Schaden, und zusätzliche 40 % der Rüstung zählen nicht',
      function (c) {
        c.dmg *= 1.2;
        c.self.pierce = Math.max(c.self.pierce || 0, 0.4);
      }),
    passiv('hak_ang3', 'Todeshieb', 'onHit', [], ['exekution'],
      '+80 % Schaden gegen Ziele unter 40 % ihres Lebens',
      function (c) { if (c.target.hp < c.target.maxHp * 0.4) c.dmg *= 1.8; }),
    passiv('hak_ang4', 'Hundert Schnitte', 'onHit', ['flaeche'], [],
      '30 % Chance auf einen zweiten Schnitt für 60 %',
      chance(0.3, function (c) { c.deal(c.target, c.self.atk * 0.6, 'Hundert Schnitte'); })),

    passiv('hak_mec1', 'Auge des Meisters', 'onStart', [], [],
      'Ignoriert 75 % der gegnerischen Rüstung',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.75); }),
    passiv('hak_mec2', 'Gnadenstoß', 'onKill', ['exekution'], [],
      'Nach jedem erlegten Gegner folgt sofort ein Schlag mit 120 % auf den nächsten',
      function (c) {
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * 1.2, 'Gnadenstoß');
      }),
    passiv('hak_mec3', 'Blutspur', 'onKill', ['exekution'], [],
      'Jeder erlegte Gegner gibt dauerhaft +20 % Angriff',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.2); }),
    passiv('hak_mec4', 'Schnitter', 'onHit', ['exekution'], [],
      'Ziele unter 20 % Leben verlieren zusätzlich 10 % ihres maximalen Lebens',
      function (c) {
        if (c.target.hp < c.target.maxHp * 0.2) {
          c.deal(c.target, c.target.maxHp * 0.1, 'Schnitter', { pure: true });
        }
      }),

    passiv('hak_unt1', 'Lehrmeister', 'onStart', [], [],
      'Alle Verbündeten erhalten +5 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 5; }); }),
    passiv('hak_unt2', 'Schule des Schwertes', 'onStart', [], [],
      'Der ganze Trupp ignoriert 30 % der gegnerischen Rüstung',
      function (c) {
        c.allies().forEach(function (u) { u.pierce = Math.max(u.pierce || 0, 0.3); });
      }),
    passiv('hak_unt3', 'Gemeinsamer Schnitt', 'onStart', [], ['exekution'],
      'Der ganze Trupp verursacht +25 % Schaden gegen Ziele unter 40 % Leben',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gemeinsamer Schnitt', fn: function (k) {
            if (k.target.hp < k.target.maxHp * 0.4) k.dmg *= 1.25;
          } });
        });
      }),
    passiv('hak_unt4', 'Vermächtnis', 'onDeath', [], [],
      'Fällt Hakuro, erhalten alle Verbündeten +25 % Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.25); }); }),

    passiv('hak_def1', 'Ausweichschritt', 'onStart', ['tempo'], [],
      '+25 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.25); }),
    passiv('hak_def2', 'Parade', 'onDamaged', ['konter'], [],
      '35 % Chance auf einen Gegenangriff mit 80 %',
      chance(0.35, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.8, 'Parade');
      })),
    passiv('hak_def3', 'Alter Fuchs', 'onStart', [], [],
      'Kein einzelner Treffer nimmt Hakuro mehr als 15 % seines maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.15); }),
    passiv('hak_def4', 'Unbeugsam', 'onDeath', [], [],
      'Steht einmal mit 30 % Leben wieder auf und schlägt danach 40 % härter zu',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.3);
        c.self.atk = Math.round(c.self.atk * 1.4);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Kurobes Linien: die Schmiede -------------------------------------
       Die einzige Linie, die an der AUSRÜSTUNG hängt: was der Trupp trägt,
       macht Kurobe stärker und umgekehrt. Damit bekommt der Beutel endlich
       eine eigene Build-Achse.                                               */

    passiv('kur_ang1', 'Scharfschliff', 'onStart', [], [],
      '+5 Angriff je eigenem Ausrüstungsstück',
      function (c) { c.self.atk += 5 * c.self.itemZahl; }),
    passiv('kur_ang2', 'Meisterklinge', 'onHit', [], [],
      '+8 % Schaden je eigenem Ausrüstungsstück',
      function (c) { c.dmg *= 1 + 0.08 * c.self.itemZahl; }),
    passiv('kur_ang3', 'Gehärtet', 'onStart', [], [],
      '+12 % Angriff je eigenem Ausrüstungsstück',
      function (c) { c.self.atk = Math.round(c.self.atk * (1 + 0.12 * c.self.itemZahl)); }),
    passiv('kur_ang4', 'Legierung', 'onHit', [], [],
      '+35 % Schaden, sobald Kurobe mindestens drei Ausrüstungsstücke trägt',
      function (c) { if (c.self.itemZahl >= 3) c.dmg *= 1.35; }),

    passiv('kur_mec1', 'Schmiedefeuer', 'onStart', [], [],
      'Jeder Verbündete erhält +4 Angriff je eigenem Ausrüstungsstück',
      function (c) { c.allies().forEach(function (u) { u.atk += 4 * (u.itemZahl || 0); }); }),
    passiv('kur_mec2', 'Nachschärfen', 'onStart', [], [],
      'Jeder Verbündete erhält +14 Leben je eigenem Ausrüstungsstück',
      function (c) {
        c.allies().forEach(function (u) {
          var add = 14 * (u.itemZahl || 0);
          u.maxHp += add; u.hp += add;
        });
      }),
    passiv('kur_mec3', 'Zweitklinge', 'onStart', [], [],
      'Kurobes Ausrüstung zählt für alle Schmiede-Boni doppelt',
      function (c) { c.self.itemZahl *= 2; }),
    passiv('kur_mec4', 'Waffenmeister', 'onStart', [], [],
      'Jeder Verbündete erhält +2 Rüstung und +6 % Angriff je eigenem Ausrüstungsstück',
      function (c) {
        c.allies().forEach(function (u) {
          u.def += 2 * (u.itemZahl || 0);
          u.atk = Math.round(u.atk * (1 + 0.06 * (u.itemZahl || 0)));
        });
      }),

    passiv('kur_unt1', 'Rüstmeister', 'onStart', [], [],
      'Alle Verbündeten erhalten +4 Rüstung',
      function (c) { c.allies().forEach(function (u) { u.def += 4; }); }),
    passiv('kur_unt2', 'Kriegsschmiede', 'onStart', [], [],
      'Alle Verbündeten erhalten +10 % Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.1); }); }),
    passiv('kur_unt3', 'Bannerträger', 'onStart', [], [],
      'Alle Verbündeten erhalten +15 % maximales Leben',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.15);
          u.maxHp += add; u.hp += add;
        });
      }),
    passiv('kur_unt4', 'Schmied der Legenden', 'onStart', ['schild'], [],
      'Alle Verbündeten erhalten +12 % Angriff, +12 % Leben und Schild 20',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
          c.applyStatus(u, 'schild', 20);
        });
      }),

    passiv('kur_def1', 'Amboss', 'onStart', [], [],
      '+7 Rüstung — jeder eingehende Treffer wird um so viel kleiner',
      function (c) { c.self.def += 7; }),
    passiv('kur_def2', 'Gehärteter Leib', 'onStart', [], [],
      '+25 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('kur_def3', 'Werkstattschild', 'onStart', ['schild'], [],
      'Schild 30, plus 18 je eigenem Ausrüstungsstück',
      function (c) { c.applyStatus(c.self, 'schild', 30 + 18 * c.self.itemZahl); }),
    passiv('kur_def4', 'Unzerbrechlich', 'onStart', [], [],
      'Kein einzelner Treffer nimmt Kurobe mehr als 14 % seines maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.14); }),

    /* ---- Gobtas Linien: Glück ---------------------------------------------
       Der billigste Anfang im Spiel. Seine Mechanik ist der Würfel: fast alles
       hängt an einer Probe, die auch danebengehen darf.                       */

    passiv('gobta_ang1', 'Anfängerglück', 'onHit', [], [],
      '20 % Chance auf doppelten Schaden',
      chance(0.2, function (c) { c.dmg *= 2; })),
    passiv('gobta_ang2', 'Glückssträhne', 'onKill', ['exekution'], [],
      'Jeder erlegte Gegner gibt dauerhaft +25 % Angriff',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.25); }),
    passiv('gobta_ang3', 'Volltreffer', 'onHit', [], [],
      '25 % Chance auf mehr als doppelten Schaden — und die Rüstung zählt dann nicht',
      chance(0.25, function (c) {
        c.dmg *= 2.2;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      })),
    passiv('gobta_ang4', 'Unverschämtes Glück', 'onHit', ['exekution'], [],
      '12 % Chance, dem Ziel zusätzlich 15 % seines maximalen Lebens zu nehmen',
      chance(0.12, function (c) {
        c.deal(c.target, c.target.maxHp * 0.15, 'Unverschämtes Glück', { pure: true });
      })),

    passiv('gobta_mec1', 'Würfelglück', 'onTurnStart', [], [],
      'In jedem Zug 25 % Chance auf dauerhaft +4 Angriff',
      chance(0.25, function (c) { c.self.atk += 4; })),
    passiv('gobta_mec2', 'Zweite Chance', 'onDamaged', ['heilung'], [],
      '25 % Chance, die Hälfte eines erlittenen Treffers sofort zurückzuheilen',
      chance(0.25, function (c) { c.heal(c.self, (c.amount || 0) * 0.5, 'Zweite Chance'); })),
    passiv('gobta_mec3', 'Immer wieder', 'onDeath', ['heilung'], [],
      'Fällt Gobta, steht er mit halber Wahrscheinlichkeit mit 35 % Leben wieder auf',
      function (c) {
        if (c.self._auf || c.rng() >= 0.5) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.35);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('gobta_mec4', 'Schicksalswende', 'onTurnStart', ['verderbnis'], [],
      'In jedem Zug 20 % Chance, allen Gegnern 2 Verderbnis anzuhängen',
      chance(0.2, function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 2); });
      })),

    passiv('gobta_unt1', 'Ansteckender Frohsinn', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +10 % Tempo',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.1); }); }),
    passiv('gobta_unt2', 'Kameradschaft', 'onAllyDeath', [], [],
      'Stirbt ein Verbündeter, erhalten alle übrigen +8 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 8; }); }),
    passiv('gobta_unt3', 'Glücksbringer', 'onStart', [], [],
      'Jeder Treffer des ganzen Trupps hat 15 % Chance auf doppelten Schaden',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Glücksbringer', fn: function (k) {
            if (k.rng() < 0.15) k.dmg *= 2;
          } });
        });
      }),
    passiv('gobta_unt4', 'Gobtas Truppe', 'onStart', [], [],
      'Alle Verbündeten erhalten +10 % Angriff und +10 % Leben',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.1);
          var add = Math.round(u.maxHp * 0.1);
          u.maxHp += add; u.hp += add;
        });
      }),

    passiv('gobta_def1', 'Ausweichen', 'onStart', ['tempo'], [],
      '+20 % Tempo und +3 Rüstung',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.2); c.self.def += 3; }),
    passiv('gobta_def2', 'Zäher Bursche', 'onDamaged', ['heilung'], [],
      'Heilt einmalig 35 % seines Lebens, sobald er unter ein Viertel fällt',
      function (c) {
        if (c.self.hp <= 0 || c.self._zaeh2 || c.self.hp >= c.self.maxHp * 0.25) return;
        c.self._zaeh2 = 1; c.heal(c.self, c.self.maxHp * 0.35, 'Zäher Bursche');
      }),
    passiv('gobta_def3', 'Glücksschild', 'onDamaged', ['schild'], [],
      '25 % Chance auf Schild 25 bei jedem erlittenen Treffer',
      chance(0.25, function (c) { c.applyStatus(c.self, 'schild', 25); })),
    passiv('gobta_def4', 'Unsterblicher Gobta', 'onStart', [], [],
      'Kein einzelner Treffer nimmt Gobta mehr als 16 % seines maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.16); }),

    /* ---- Gobkyus Linien: Präzision ----------------------------------------
       Der Schütze zielt auf die Hinterreihe und auf Schwachstellen.           */

    passiv('gobkyu_ang1', 'Scharfschütze', 'onHit', [], [],
      '+18 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.18; }),
    passiv('gobkyu_ang2', 'Schwachstelle', 'onHit', [], ['gift', 'brand', 'frost', 'verderbnis'],
      '+35 % Schaden gegen Ziele, die irgendeinen Zustand tragen',
      function (c) {
        var s2 = c.target.status;
        if (s2.gift > 0 || s2.brand > 0 || s2.erstarrung > 0 || s2.verderbnis > 0) c.dmg *= 1.35;
      }),
    passiv('gobkyu_ang3', 'Kopfschuss', 'onHit', [], [],
      '25 % Chance auf +60 % Schaden, der die Rüstung ganz ignoriert',
      chance(0.25, function (c) {
        c.dmg *= 1.6;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      })),
    passiv('gobkyu_ang4', 'Pfeilhagel', 'onHit', ['flaeche'], [],
      '30 % Chance, zusätzlich alle anderen Gegner für 40 % zu treffen',
      chance(0.3, function (c) {
        c.foes().forEach(function (f) {
          if (f !== c.target) c.deal(f, c.self.atk * 0.4, 'Pfeilhagel');
        });
      })),

    passiv('gobkyu_mec1', 'Zielwasser', 'onStart', [], [],
      'Ignoriert die Hälfte der gegnerischen Rüstung',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.5); }),
    passiv('gobkyu_mec2', 'Markierter Schuss', 'onHit', ['verwundbar'], [],
      'Jeder Treffer macht das Ziel für den ganzen Trupp um 1 Stapel verwundbarer',
      function (c) { c.applyStatus(c.target, 'verwundbar', 1); }),
    passiv('gobkyu_mec3', 'Doppelschuss', 'onHit', [], [],
      '30 % Chance auf einen zweiten Pfeil mit 55 %',
      chance(0.3, function (c) { c.deal(c.target, c.self.atk * 0.55, 'Doppelschuss'); })),
    passiv('gobkyu_mec4', 'Giftpfeile', 'onHit', ['gift'], ['gift'],
      'Jeder Treffer legt 2 Gift an, und gegen vergiftete Ziele +25 % Schaden',
      function (c) {
        if (c.target.status.gift > 0) c.dmg *= 1.25;
        c.applyStatus(c.target, 'gift', 2);
      }),

    passiv('gobkyu_unt1', 'Feuerleitung', 'onStart', [], [],
      'Alle Verbündeten erhalten +6 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 6; }); }),
    passiv('gobkyu_unt2', 'Deckungsfeuer', 'onAllyDeath', ['tempo'], [],
      'Stirbt ein Verbündeter, werden alle übrigen 12 % schneller',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.12); }); }),
    passiv('gobkyu_unt3', 'Späherauge', 'onStart', [], [],
      'Der ganze Trupp ignoriert 25 % der gegnerischen Rüstung',
      function (c) {
        c.allies().forEach(function (u) { u.pierce = Math.max(u.pierce || 0, 0.25); });
      }),
    passiv('gobkyu_unt4', 'Salve', 'onStart', ['flaeche'], [],
      'Jeder Treffer des Trupps hat 18 % Chance auf einen Zusatzschuss mit 45 %',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Salve', fn: function (k) {
            if (k.rng() < 0.18) k.deal(k.target, k.self.atk * 0.45, 'Salve');
          } });
        });
      }),

    passiv('gobkyu_def1', 'Rückzugsgefecht', 'onStart', ['tempo'], [],
      '+25 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.25); }),
    passiv('gobkyu_def2', 'Tarnung', 'onStart', [], [],
      'Gobkyu erleidet 18 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.18); }),
    passiv('gobkyu_def3', 'Distanz halten', 'onDamaged', ['konter'], [],
      '30 % Chance, einen Angreifer sofort für 70 % zu beschießen',
      chance(0.3, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.7, 'Distanz halten');
      })),
    passiv('gobkyu_def4', 'Windschritt', 'onStart', ['tempo', 'schild'], [],
      '+35 % Tempo und Schild 25',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 1.35);
        c.applyStatus(c.self, 'schild', 25);
      }),

    /* ---- Rigurds Linien: Häuptling und Schild ------------------------------
       Der Dorfälteste hält die Reihe. Seine Mechanik ist der Schild — und zwar
       nicht nur seiner.                                                        */

    passiv('rigurd_ang1', 'Häuptlingszorn', 'onStart', [], [],
      '+5 Angriff je lebendem Verbündeten',
      function (c) { c.self.atk += 5 * c.allies().length; }),
    passiv('rigurd_ang2', 'Schildschlag', 'onHit', [], ['schild'],
      '+30 % Schaden, solange Rigurd selbst einen Schild trägt',
      function (c) { if (c.self.status.schild > 0) c.dmg *= 1.3; }),
    passiv('rigurd_ang3', 'Erster in der Schlacht', 'onHit', [], [],
      '+30 % Schaden, solange Rigurd auf dem vordersten Platz steht',
      function (c) { if (c.self.pos === 0) c.dmg *= 1.3; }),
    passiv('rigurd_ang4', 'Sammelt euch', 'onAllyDeath', ['schild'], [],
      'Stirbt ein Verbündeter: +12 Angriff und Schild 40 für Rigurd',
      function (c) { c.self.atk += 12; c.applyStatus(c.self, 'schild', 40); }),

    passiv('rigurd_mec1', 'Schildwall', 'onStart', ['schild'], [],
      'Rigurd startet mit Schild 60',
      function (c) { c.applyStatus(c.self, 'schild', 60); }),
    passiv('rigurd_mec2', 'Bollwerk', 'onStart', [], ['schild'],
      'Jeder Schild im ganzen Trupp ist um 35 % stärker',
      function (c) { c.allies().forEach(function (u) { u.schildfaktor += 0.35; }); }),
    passiv('rigurd_mec3', 'Stehende Mauer', 'onTurnStart', ['schild'], [],
      'Rigurd baut in jedem Zug 14 Schild nach',
      function (c) { c.applyStatus(c.self, 'schild', 14); }),
    passiv('rigurd_mec4', 'Unerschütterlich', 'onStart', ['schild'], ['heilung'],
      'Heilung über das Maximum hinaus wird beim ganzen Trupp zu Schild',
      function (c) {
        c.allies().forEach(function (u) { u.ueberheilung = Math.max(u.ueberheilung || 0, 1); });
      }),

    passiv('rigurd_unt1', 'Häuptling', 'onStart', [], [],
      'Alle Verbündeten erhalten +3 Rüstung',
      function (c) { c.allies().forEach(function (u) { u.def += 3; }); }),
    passiv('rigurd_unt2', 'Schutzbefehl', 'onStart', ['schild'], [],
      'Alle Verbündeten starten mit Schild 25',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 25); }); }),
    passiv('rigurd_unt3', 'Formation', 'onStart', [], [],
      'Die vorderste Einheit erhält +40 % maximales Leben',
      function (c) {
        var vorn = c.allies()[0];
        if (!vorn) return;
        var add = Math.round(vorn.maxHp * 0.4);
        vorn.maxHp += add; vorn.hp += add;
      }),
    passiv('rigurd_unt4', 'Dorfältester', 'onStart', [], [],
      'Alle Verbündeten erhalten +15 % Leben und +2 Rüstung',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.15);
          u.maxHp += add; u.hp += add; u.def += 2;
        });
      }),

    passiv('rigurd_def1', 'Dickes Fell', 'onStart', [], [],
      '+25 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('rigurd_def2', 'Standhaft', 'onStart', [], [],
      'Kein einzelner Treffer nimmt Rigurd mehr als 15 % seines maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.15); }),
    passiv('rigurd_def3', 'Dornenschild', 'onDamaged', ['konter'], [],
      'Angreifer erleiden 12 Schaden plus ein Fünftel seines Angriffs zurück',
      function (c) { var f = c.foes()[0]; if (f) c.deal(f, 12 + c.self.atk * 0.2, 'Dornenschild'); }),
    passiv('rigurd_def4', 'Letzter Wall', 'onDeath', ['schild', 'heilung'], [],
      'Steht einmal mit 40 % Leben wieder auf und gibt dem Trupp Schild 40',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 40); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Rigurs Linien: Wache und Konter ------------------------------------
       Er zahlt zurück. Je mehr er einsteckt und je mehr fällt, desto härter.    */

    passiv('rigur_ang1', 'Wachsam', 'onHit', ['konter'], [],
      '+25 % Schaden, sobald Rigur in diesem Kampf selbst getroffen wurde',
      function (c) { if (c.self.dmgTaken > 0) c.dmg *= 1.25; }),
    passiv('rigur_ang2', 'Vergeltung', 'onHit', ['konter'], [],
      '+45 % Schaden, solange Rigur unter der Hälfte seines Lebens steht',
      function (c) { if (c.self.hp < c.self.maxHp * 0.5) c.dmg *= 1.45; }),
    passiv('rigur_ang3', 'Rachefeldzug', 'onAllyDeath', [], [],
      'Stirbt ein Verbündeter: dauerhaft +20 % Angriff',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.2); }),
    passiv('rigur_ang4', 'Blutzoll', 'onHit', [], [],
      '+50 % Schaden, sobald ein Verbündeter gefallen ist',
      function (c) { if (c.self._gefallen) c.dmg *= 1.5; }),

    passiv('rigur_mec1', 'Gegenschlag', 'onDamaged', ['konter'], [],
      '45 % Chance auf einen Gegenangriff mit 75 %',
      chance(0.45, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.75, 'Gegenschlag');
      })),
    passiv('rigur_mec2', 'Dornenwache', 'onDamaged', ['konter'], [],
      'Angreifer erleiden 12 Schaden plus 30 % seines Angriffs zurück',
      function (c) { var f = c.foes()[0]; if (f) c.deal(f, 12 + c.self.atk * 0.3, 'Dornenwache'); }),
    passiv('rigur_mec3', 'Reflex', 'onDamaged', ['konter'], [],
      '25 % Chance auf einen zweiten, härteren Konter mit 110 %',
      chance(0.25, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 1.1, 'Reflex');
      })),
    passiv('rigur_mec4', 'Wachturm', 'onDamaged', ['verwundbar', 'konter'], [],
      'Wer Rigur trifft, wird für den ganzen Trupp um 2 Stapel verwundbarer',
      function (c) { var f = c.foes()[0]; if (f) c.applyStatus(f, 'verwundbar', 2); }),

    passiv('rigur_unt1', 'Wachkommando', 'onStart', ['schild'], [],
      'Alle Verbündeten erhalten +2 Rüstung und Schild 15',
      function (c) {
        c.allies().forEach(function (u) { u.def += 2; c.applyStatus(u, 'schild', 15); });
      }),
    passiv('rigur_unt2', 'Alarm', 'onAllyDeath', ['schild'], [],
      'Stirbt ein Verbündeter, erhalten alle übrigen Schild 30',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 30); }); }),
    passiv('rigur_unt3', 'Rückendeckung', 'onStart', ['konter'], [],
      'Der ganze Trupp wirft 6 plus 8 % seines Angriffs auf Angreifer zurück',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onDamaged', name: 'Rückendeckung', fn: function (k) {
            var f = k.foes()[0]; if (f) k.deal(f, 6 + k.self.atk * 0.08, 'Rückendeckung');
          } });
        });
      }),
    passiv('rigur_unt4', 'Leibgarde', 'onStart', [], [],
      'Die vorderste Einheit erleidet 20 % weniger Schaden',
      function (c) {
        var vorn = c.allies()[0];
        if (vorn) vorn.minderung = Math.max(vorn.minderung || 0, 0.2);
      }),

    passiv('rigur_def1', 'Wachsamkeit', 'onStart', ['tempo'], [],
      '+4 Rüstung und +10 % Tempo',
      function (c) { c.self.def += 4; c.self.spd = Math.round(c.self.spd * 1.1); }),
    passiv('rigur_def2', 'Panzerung', 'onStart', [], [],
      '+30 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.3);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('rigur_def3', 'Zäher Hund', 'onDamaged', ['heilung'], [],
      'Heilt einmalig 40 % seines Lebens, sobald er unter 30 % fällt',
      function (c) {
        if (c.self.hp <= 0 || c.self._zaeh3 || c.self.hp >= c.self.maxHp * 0.3) return;
        c.self._zaeh3 = 1; c.heal(c.self, c.self.maxHp * 0.4, 'Zäher Hund');
      }),
    passiv('rigur_def4', 'Nie allein', 'onDeath', [], [],
      'Steht einmal mit 35 % Leben wieder auf und gibt allen Verbündeten +10 Angriff',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.35);
        c.allies().forEach(function (u) { u.atk += 10; });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Gobwas Linien: Feldverband ----------------------------------------
       Die Sanitäterin. Ihre Mechanik ist die Heilung, und sie wird stärker, je
       schlechter es dem Trupp geht.                                            */

    passiv('gobwa_ang1', 'Kampfsanitäterin', 'onHit', [], [],
      '+20 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.2; }),
    passiv('gobwa_ang2', 'Aderlass', 'onStart', ['heilung'], [],
      'Heilt 30 % des verursachten Schadens',
      function (c) { c.self.lifesteal += 0.3; }),
    passiv('gobwa_ang3', 'Schmerzgrenze', 'onHit', [], ['exekution'],
      '+35 % Schaden gegen Ziele unter der Hälfte ihres Lebens',
      function (c) { if (c.target.hp < c.target.maxHp * 0.5) c.dmg *= 1.35; }),
    passiv('gobwa_ang4', 'Letzte Reserve', 'onHit', [], [],
      '+45 % Schaden, solange Gobwa selbst unter 40 % Leben steht',
      function (c) { if (c.self.hp < c.self.maxHp * 0.4) c.dmg *= 1.45; }),

    passiv('gobwa_mec1', 'Feldverband', 'onStart', [], ['heilung'],
      'Jede Heilung im Trupp wirkt um 50 % stärker',
      function (c) { c.allies().forEach(function (u) { u.heilfaktor += 0.5; }); }),
    passiv('gobwa_mec2', 'Notration', 'onTurnStart', ['heilung'], [],
      'Heilt in jedem Zug die schwächste Einheit um 6 % ihres maximalen Lebens',
      function (c) {
        var alle = c.allies();
        if (!alle.length) return;
        var schwach = alle.reduce(function (a, b) { return (b.hp / b.maxHp) < (a.hp / a.maxHp) ? b : a; });
        c.heal(schwach, schwach.maxHp * 0.06, 'Notration');
      }),
    passiv('gobwa_mec3', 'Triage', 'onAllyDeath', ['heilung'], [],
      'Stirbt ein Verbündeter, heilen alle übrigen 30 % ihres maximalen Lebens',
      function (c) { c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.3, 'Triage'); }); }),
    passiv('gobwa_mec4', 'Überfluss', 'onStart', ['schild'], ['heilung'],
      'Heilung über das Maximum hinaus wird beim ganzen Trupp zu Schild',
      function (c) {
        c.allies().forEach(function (u) { u.ueberheilung = Math.max(u.ueberheilung || 0, 1); });
      }),

    passiv('gobwa_unt1', 'Verbandskasten', 'onStart', ['heilung'], [],
      'Alle Verbündeten erhalten +5 Regeneration',
      function (c) { c.allies().forEach(function (u) { u.regen += 5; }); }),
    passiv('gobwa_unt2', 'Aufopferung', 'onStart', [], [],
      'Alle Verbündeten erhalten +12 % maximales Leben',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
        });
      }),
    passiv('gobwa_unt3', 'Nicht auf meiner Wache', 'onAllyDeath', ['heilung'], [],
      'Stirbt ein Verbündeter, heilen alle übrigen 25 % und erhalten +6 Angriff',
      function (c) {
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.25, 'Nicht auf meiner Wache'); u.atk += 6; });
      }),
    passiv('gobwa_unt4', 'Mutter der Truppe', 'onStart', ['heilung'], ['heilung'],
      'Alle Verbündeten erhalten +8 Regeneration, und jede Heilung wirkt 30 % stärker',
      function (c) {
        c.allies().forEach(function (u) { u.regen += 8; u.heilfaktor += 0.3; });
      }),

    passiv('gobwa_def1', 'Flink', 'onStart', ['tempo'], [],
      '+20 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.2); }),
    passiv('gobwa_def2', 'Selbstversorgung', 'onTurnStart', ['heilung'], [],
      'Heilt sich in jedem Zug um 5 % ihres maximalen Lebens',
      function (c) { c.heal(c.self, c.self.maxHp * 0.05, 'Selbstversorgung'); }),
    passiv('gobwa_def3', 'Schutzengel', 'onDeath', ['heilung'], [],
      'Steht einmal mit 45 % Leben wieder auf',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('gobwa_def4', 'Unentbehrlich', 'onStart', [], [],
      'Gobwa erleidet 25 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.25); }),

    /* ---- Rangas Linien: der Schwarze Blitz ---------------------------------
       Der Sturmwolf-Lord. Sein Blitz springt weiter und lähmt, was er trifft.  */

    passiv('ranga_ang1', 'Blitzschlag', 'onHit', [], [],
      '+22 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.22; }),
    passiv('ranga_ang2', 'Sturmgewalt', 'onHit', [], ['tempo'],
      '+4 % Schaden je Punkt Tempo über 30',
      function (c) { c.dmg *= 1 + Math.max(0, c.self.spd - 30) * 0.04; }),
    passiv('ranga_ang3', 'Kettenblitz', 'onHit', ['flaeche'], [],
      '35 % Chance, dass der Blitz für 55 % auf ein zweites Ziel überspringt',
      chance(0.35, function (c) {
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) c.deal(f, c.self.atk * 0.55, 'Kettenblitz');
      })),
    passiv('ranga_ang4', 'Gewitterfront', 'onHit', ['flaeche'], [],
      '25 % Chance, zusätzlich alle anderen Gegner für 50 % zu treffen',
      chance(0.25, function (c) {
        c.foes().forEach(function (f) {
          if (f !== c.target) c.deal(f, c.self.atk * 0.5, 'Gewitterfront');
        });
      })),

    passiv('ranga_mec1', 'Statische Ladung', 'onHit', ['frost'], [],
      '18 % Chance, das Ziel für einen Zug zu lähmen',
      chance(0.18, function (c) { c.applyStatus(c.target, 'erstarrung', 1); })),
    passiv('ranga_mec2', 'Überschlag', 'onHit', [], ['frost'],
      '+50 % Schaden gegen gelähmte Ziele',
      function (c) { if (c.target.status.erstarrung > 0) c.dmg *= 1.5; }),
    passiv('ranga_mec3', 'Entladung', 'onKill', ['frost', 'flaeche'], [],
      'Jeder erlegte Gegner lähmt alle übrigen mit 30 % Chance',
      function (c) {
        c.foes().forEach(function (f) {
          if (c.rng() < 0.3) c.applyStatus(f, 'erstarrung', 1);
        });
      }),
    passiv('ranga_mec4', 'Sturmherr', 'onTurnStart', ['frost'], [],
      'In jedem Zug 22 % Chance, den vordersten Gegner zu lähmen',
      chance(0.22, function (c) {
        var f = c.foes()[0]; if (f) c.applyStatus(f, 'erstarrung', 1);
      })),

    passiv('ranga_unt1', 'Sturmwind', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +12 % Tempo',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.12); }); }),
    passiv('ranga_unt2', 'Leitblitz', 'onStart', [], ['frost'],
      'Der ganze Trupp verursacht +30 % Schaden gegen gelähmte Ziele',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Leitblitz', fn: function (k) {
            if (k.target.status.erstarrung > 0) k.dmg *= 1.3;
          } });
        });
      }),
    passiv('ranga_unt3', 'Wolfsruf', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +8 Angriff und +8 % Tempo',
      function (c) {
        c.allies().forEach(function (u) { u.atk += 8; u.spd = Math.round(u.spd * 1.08); });
      }),
    passiv('ranga_unt4', 'Auge des Sturms', 'onStart', ['frost'], [],
      'Jeder Treffer des Trupps lähmt mit 12 % Chance',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Auge des Sturms', fn: function (k) {
            if (k.rng() < 0.12) k.applyStatus(k.target, 'erstarrung', 1);
          } });
        });
      }),

    passiv('ranga_def1', 'Windfell', 'onStart', ['tempo'], [],
      '+20 % Tempo und +3 Rüstung',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.2); c.self.def += 3; }),
    passiv('ranga_def2', 'Blitzreflexe', 'onDamaged', ['konter'], [],
      '30 % Chance auf einen Gegenangriff mit 80 %',
      chance(0.3, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.8, 'Blitzreflexe');
      })),
    passiv('ranga_def3', 'Schattenschritt', 'onStart', [], [],
      'Ranga erleidet 20 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.2); }),
    passiv('ranga_def4', 'Herr der Stürme', 'onStart', ['tempo', 'schild'], [],
      '+40 % Tempo und Schild 30',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 1.4);
        c.applyStatus(c.self, 'schild', 30);
      }),

    /* ---- Sturmwolfs Linien: die Jagd ---------------------------------------
       Der billigste Anfang neben Gobta. Er räumt ab, was schon wankt.         */

    passiv('sturm_ang1', 'Hetzjagd', 'onHit', [], ['exekution'],
      '+7 Schaden gegen Ziele unter der Hälfte ihres Lebens, zusätzlich +28 %',
      function (c) {
        if (c.target.hp < c.target.maxHp * 0.5) { c.dmg = c.dmg * 1.28 + 7; }
      }),
    /* Prozente auf 9 Grundangriff bewegen nichts — gemessen verschob die ganze
       Angriffslinie den Bruchpunkt um 0.00. Der billigste Wolf bekommt deshalb
       feste Zahlen statt Anteile. */
    passiv('sturm_ang2', 'Reißzahn', 'onStart', [], [],
      '+9 Angriff — eine feste Zahl, weil ein Anteil an seinem kleinen Grundwert nichts wäre',
      function (c) { c.self.atk += 9; }),
    passiv('sturm_ang3', 'Todesbiss', 'onHit', [], ['exekution'],
      'Doppelter Schaden gegen Ziele unter 30 % ihres Lebens',
      function (c) { if (c.target.hp < c.target.maxHp * 0.3) c.dmg *= 2; }),
    passiv('sturm_ang4', 'Blutrausch', 'onKill', ['exekution'], [],
      'Jeder erlegte Gegner gibt dauerhaft +30 % Angriff',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.3); }),

    passiv('sturm_mec1', 'Witterung', 'onStart', [], [],
      'Ignoriert die Hälfte der gegnerischen Rüstung und +5 Angriff',
      function (c) {
        c.self.pierce = Math.max(c.self.pierce || 0, 0.5);
        c.self.atk += 5;
      }),
    passiv('sturm_mec2', 'Nachsetzen', 'onKill', ['exekution'], [],
      'Nach jedem erlegten Gegner folgt sofort ein Biss mit 120 % auf den nächsten',
      function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 1.2, 'Nachsetzen');
      }),
    passiv('sturm_mec3', 'Verwundetes Wild', 'onHit', [], ['exekution'],
      '+5 % Schaden je fehlendem Zehntel Leben des Ziels',
      function (c) { c.dmg *= 1 + 0.5 * (1 - c.target.hp / c.target.maxHp); }),
    passiv('sturm_mec4', 'Kein Entkommen', 'onHit', ['exekution'], [],
      'Ziele unter einem Viertel Leben verlieren zusätzlich 9 % ihres maximalen Lebens',
      function (c) {
        if (c.target.hp < c.target.maxHp * 0.25) {
          c.deal(c.target, c.target.maxHp * 0.09, 'Kein Entkommen', { pure: true });
        }
      }),

    passiv('sturm_unt1', 'Rudeljagd', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +8 % Tempo',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.08); }); }),
    passiv('sturm_unt2', 'Beutezug', 'onKill', [], [],
      'Jeder erlegte Gegner gibt allen Verbündeten +6 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 6; }); }),
    passiv('sturm_unt3', 'Gemeinsame Hetze', 'onStart', [], ['exekution'],
      'Der ganze Trupp verursacht +22 % Schaden gegen Ziele unter 40 % Leben',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gemeinsame Hetze', fn: function (k) {
            if (k.target.hp < k.target.maxHp * 0.4) k.dmg *= 1.22;
          } });
        });
      }),
    passiv('sturm_unt4', 'Alpha im Werden', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +10 % Angriff und +10 % Tempo',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.1);
          u.spd = Math.round(u.spd * 1.1);
        });
      }),

    passiv('sturm_def1', 'Flinkes Fell', 'onStart', ['tempo'], [],
      '+25 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.25); }),
    passiv('sturm_def2', 'Zäher Streuner', 'onDamaged', ['heilung'], [],
      'Heilt einmalig 35 % seines Lebens, sobald er unter ein Viertel fällt',
      function (c) {
        if (c.self.hp <= 0 || c.self._zaeh4 || c.self.hp >= c.self.maxHp * 0.25) return;
        c.self._zaeh4 = 1; c.heal(c.self, c.self.maxHp * 0.35, 'Zäher Streuner');
      }),
    passiv('sturm_def3', 'Ausweichen', 'onStart', [], [],
      'Der Sturmwolf erleidet 18 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.18); }),
    passiv('sturm_def4', 'Überlebenskünstler', 'onDeath', ['tempo', 'heilung'], [],
      'Steht einmal mit 35 % Leben wieder auf und wird danach 25 % schneller',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.35);
        c.self.spd = Math.round(c.self.spd * 1.25);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Schattenwolfs Linien: Frost ---------------------------------------
       Er nimmt Züge statt Leben. Gegen Bosse, die Erstarrung abschütteln, ist
       das die schwächste Linie im Spiel — gegen Gruppen die stärkste.          */

    passiv('schatten_ang1', 'Frostbiss', 'onHit', [], ['frost'],
      '+28 % Schaden gegen erstarrte Ziele',
      function (c) { if (c.target.status.erstarrung > 0) c.dmg *= 1.28; }),
    passiv('schatten_ang2', 'Eisklinge', 'onHit', [], [],
      '+20 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.2; }),
    passiv('schatten_ang3', 'Kältetod', 'onHit', [], ['frost'],
      'Doppelter Schaden gegen erstarrte Ziele',
      function (c) { if (c.target.status.erstarrung > 0) c.dmg *= 2; }),
    passiv('schatten_ang4', 'Frostherz', 'onHit', [], ['gift', 'brand', 'frost', 'verderbnis'],
      '+40 % Schaden gegen Ziele, die irgendeinen Zustand tragen',
      function (c) {
        var s2 = c.target.status;
        if (s2.gift > 0 || s2.brand > 0 || s2.erstarrung > 0 || s2.verderbnis > 0) c.dmg *= 1.4;
      }),

    passiv('schatten_mec1', 'Frostaura', 'onHit', ['frost'], [],
      '22 % Chance, das Ziel erstarren zu lassen',
      chance(0.22, function (c) { c.applyStatus(c.target, 'erstarrung', 1); })),
    passiv('schatten_mec2', 'Eisiger Hauch', 'onHit', ['frost', 'flaeche'], [],
      '14 % Chance, ALLE Gegner erstarren zu lassen',
      chance(0.14, function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'erstarrung', 1); });
      })),
    passiv('schatten_mec3', 'Dauerfrost', 'onTurnStart', ['frost'], [],
      'In jedem Zug 28 % Chance, den vordersten Gegner erstarren zu lassen',
      chance(0.28, function (c) {
        var f = c.foes()[0]; if (f) c.applyStatus(f, 'erstarrung', 1);
      })),
    passiv('schatten_mec4', 'Absoluter Nullpunkt', 'onHit', [], ['frost'],
      'Erstarrte Ziele verlieren zusätzlich 10 % ihres maximalen Lebens',
      function (c) {
        if (c.target.status.erstarrung > 0) {
          c.deal(c.target, c.target.maxHp * 0.1, 'Absoluter Nullpunkt', { pure: true });
        }
      }),

    passiv('schatten_unt1', 'Kälteschleier', 'onStart', ['frost'], [],
      'Jeder Treffer des Trupps lässt mit 10 % Chance erstarren',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Kälteschleier', fn: function (k) {
            if (k.rng() < 0.1) k.applyStatus(k.target, 'erstarrung', 1);
          } });
        });
      }),
    passiv('schatten_unt2', 'Frostschneide', 'onStart', [], ['frost'],
      'Der ganze Trupp verursacht +32 % Schaden gegen erstarrte Ziele',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Frostschneide', fn: function (k) {
            if (k.target.status.erstarrung > 0) k.dmg *= 1.32;
          } });
        });
      }),
    passiv('schatten_unt3', 'Winterluft', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +10 % Tempo',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.1); }); }),
    passiv('schatten_unt4', 'Ewiger Winter', 'onStart', ['frost'], [],
      'Alle Gegner beginnen den Kampf erstarrt',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'erstarrung', 1); }); }),

    passiv('schatten_def1', 'Frostpanzer', 'onStart', ['schild'], [],
      'Startet mit Schild 35',
      function (c) { c.applyStatus(c.self, 'schild', 35); }),
    passiv('schatten_def2', 'Schattengestalt', 'onStart', [], [],
      'Der Schattenwolf erleidet 14 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.14); }),
    passiv('schatten_def3', 'Eisdornen', 'onDamaged', ['frost', 'konter'], [],
      '25 % Chance, einen Angreifer erstarren zu lassen',
      chance(0.25, function (c) {
        var f = c.foes()[0]; if (f) c.applyStatus(f, 'erstarrung', 1);
      })),
    /* Gemessen war die Defensivlinie mit Deckel UND Minderung UND Schild fast
       unsterblich (Bruchpunkt +1.94 gegen +0.30 der nächstbesten Linie). Der
       Deckel ist raus — Tempo und Schild bleiben. */
    passiv('schatten_def4', 'Nebelwolf', 'onStart', ['tempo', 'schild'], [],
      '+30 % Tempo und Schild 45',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 1.3);
        c.applyStatus(c.self, 'schild', 45);
      }),

    /* ---- Rudelalphas Linien: das Rudel -------------------------------------
       Tempo ist die Art der Sturmwölfe, und der Alpha macht daraus eine
       Trupp-Achse: mehr Züge für alle.                                        */

    passiv('alpha_ang1', 'Leitwolf', 'onHit', [], ['tempo'],
      '+4 % Schaden je Punkt Tempo über 28',
      function (c) { c.dmg *= 1 + Math.max(0, c.self.spd - 28) * 0.04; }),
    passiv('alpha_ang2', 'Erster Biss', 'onHit', [], [],
      'Der erste Angriff im Kampf verursacht doppelten Schaden',
      function (c) { if (!c.self._eb) { c.self._eb = 1; c.dmg *= 2; } }),
    passiv('alpha_ang3', 'Alphaschlag', 'onHit', [], [],
      '+25 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.25; }),
    passiv('alpha_ang4', 'Rudelführer', 'onStart', [], [],
      '+6 Angriff je lebendem Verbündeten',
      function (c) { c.self.atk += 6 * c.allies().length; }),

    passiv('alpha_mec1', 'Hetze', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +18 % Tempo',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.18); }); }),
    passiv('alpha_mec2', 'Zweiter Wind', 'onTurnStart', ['tempo'], [],
      'Wird in jedem eigenen Zug dauerhaft 3 % schneller',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.03); }),
    passiv('alpha_mec3', 'Sturmlauf', 'onKill', ['tempo'], [],
      'Jeder erlegte Gegner macht den ganzen Trupp 10 % schneller',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.1); }); }),
    passiv('alpha_mec4', 'Rudelrausch', 'onStart', [], ['tempo'],
      'Der ganze Trupp verursacht +3 % Schaden je Punkt Tempo über 30',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Rudelrausch', fn: function (k) {
            k.dmg *= 1 + Math.max(0, k.self.spd - 30) * 0.03;
          } });
        });
      }),

    passiv('alpha_unt1', 'Rudelbefehl', 'onStart', [], [],
      'Alle Verbündeten erhalten +8 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 8; }); }),
    passiv('alpha_unt2', 'Beschützer', 'onStart', [], [],
      'Alle Verbündeten erhalten +12 % maximales Leben',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
        });
      }),
    passiv('alpha_unt3', 'Gemeinsam stark', 'onStart', [], [],
      'Alle Verbündeten erhalten +4 % Angriff je lebendem Verbündeten',
      function (c) {
        var n = c.allies().length;
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * (1 + 0.04 * n)); });
      }),
    passiv('alpha_unt4', 'Das Rudel', 'onStart', ['tempo'], [],
      'Alle Verbündeten erhalten +15 % Angriff und +15 % Tempo',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.15);
          u.spd = Math.round(u.spd * 1.15);
        });
      }),

    passiv('alpha_def1', 'Dickes Winterfell', 'onStart', [], [],
      '+25 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('alpha_def2', 'Wachsam', 'onStart', ['tempo'], [],
      '+4 Rüstung und +12 % Tempo',
      function (c) { c.self.def += 4; c.self.spd = Math.round(c.self.spd * 1.12); }),
    passiv('alpha_def3', 'Nie allein', 'onAllyDeath', ['heilung'], [],
      'Stirbt ein Verbündeter: heilt 30 % und erhält +10 Angriff',
      function (c) { c.heal(c.self, c.self.maxHp * 0.3, 'Nie allein'); c.self.atk += 10; }),
    passiv('alpha_def4', 'Alter Alpha', 'onDeath', ['tempo', 'heilung'], [],
      'Steht einmal mit 40 % Leben wieder auf und macht den Trupp 20 % schneller',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.2); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Gabirus Linien: der Wirbelspeer -----------------------------------
       Je voller die gegnerische Reihe, desto besser für ihn.                   */

    passiv('gab_ang1', 'Speerwirbel', 'onHit', [], ['flaeche'],
      '+7 % Schaden je lebendem Gegner',
      function (c) { c.dmg *= 1 + 0.07 * c.foes().length; }),
    passiv('gab_ang2', 'Prahlerei', 'onHit', [], [],
      '+30 % Schaden, solange noch kein Verbündeter gefallen ist',
      function (c) { if (!c.self._gefallen) c.dmg *= 1.3; }),
    passiv('gab_ang3', 'Held von Gabiru', 'onKill', ['exekution'], [],
      'Jeder erlegte Gegner gibt dauerhaft +18 % Angriff',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.18); }),
    passiv('gab_ang4', 'Sturmangriff', 'onHit', ['flaeche'], [],
      '30 % Chance, zusätzlich alle anderen Gegner für 50 % zu treffen',
      chance(0.3, function (c) {
        c.foes().forEach(function (f) {
          if (f !== c.target) c.deal(f, c.self.atk * 0.5, 'Sturmangriff');
        });
      })),

    passiv('gab_mec1', 'Weiter Ausfall', 'onHit', ['flaeche'], [],
      '30 % Chance, ein zweites Ziel für 45 % zu treffen',
      chance(0.3, function (c) {
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) c.deal(f, c.self.atk * 0.45, 'Weiter Ausfall');
      })),
    passiv('gab_mec2', 'Durchbohren', 'onHit', ['flaeche'], [],
      'Der Speer trifft die Einheit hinter dem Ziel für 45 %',
      function (c) {
        var f = c.foes();
        var hinter = f[f.indexOf(c.target) + 1];
        if (hinter) c.deal(hinter, c.self.atk * 0.45, 'Durchbohren');
      }),
    passiv('gab_mec3', 'Massenschlächter', 'onHit', [], ['flaeche'],
      '+11 % Schaden je lebendem Gegner',
      function (c) { c.dmg *= 1 + 0.11 * c.foes().length; }),
    passiv('gab_mec4', 'Wirbelsturm', 'onTurnStart', ['flaeche'], [],
      'In jedem Zug 25 % Chance, alle Gegner für 60 % zu treffen',
      chance(0.25, function (c) {
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.6, 'Wirbelsturm'); });
      })),

    passiv('gab_unt1', 'Vorbild', 'onStart', [], [],
      'Alle Verbündeten erhalten +6 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 6; }); }),
    passiv('gab_unt2', 'Schlachtruf', 'onStart', [], [],
      'Alle Verbündeten erhalten +10 % Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.1); }); }),
    passiv('gab_unt3', 'Gemeinsamer Sturm', 'onStart', [], ['flaeche'],
      'Der ganze Trupp verursacht +6 % Schaden je lebendem Gegner',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gemeinsamer Sturm', fn: function (k) {
            k.dmg *= 1 + 0.06 * k.foes().length;
          } });
        });
      }),
    passiv('gab_unt4', 'Der große Gabiru', 'onStart', [], [],
      'Alle Verbündeten erhalten +12 % Angriff und +12 % maximales Leben',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
        });
      }),

    passiv('gab_def1', 'Schuppenpanzer', 'onStart', [], [],
      '+5 Rüstung gegen jeden eingehenden Treffer',
      function (c) { c.self.def += 5; }),
    passiv('gab_def2', 'Zäher Held', 'onStart', [], [],
      '+25 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('gab_def3', 'Unverwüstlich', 'onDamaged', ['heilung'], [],
      'Heilt einmalig 40 % seines Lebens, sobald er unter 30 % fällt',
      function (c) {
        if (c.self.hp <= 0 || c.self._zaeh5 || c.self.hp >= c.self.maxHp * 0.3) return;
        c.self._zaeh5 = 1; c.heal(c.self, c.self.maxHp * 0.4, 'Unverwüstlich');
      }),
    passiv('gab_def4', 'Niemals aufgeben', 'onDeath', ['heilung'], [],
      'Steht einmal mit 40 % Leben wieder auf und schlägt danach 30 % härter zu',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.self.atk = Math.round(c.self.atk * 1.3);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Soukas Linien: die Späherin ---------------------------------------
       Sie schießt an der Front vorbei. Kleiner Grundangriff, deshalb feste
       Zahlen statt Anteile — die Lehre aus dem Sturmwolf.                      */

    passiv('souka_ang1', 'Ruhige Hand', 'onStart', [], [],
      '+8 Angriff — eine feste Zahl, weil ihr Grundwert klein ist',
      function (c) { c.self.atk += 8; }),
    passiv('souka_ang2', 'Schwachpunkt', 'onHit', [], ['gift', 'brand', 'frost', 'verderbnis'],
      '+30 % Schaden gegen Ziele, die irgendeinen Zustand tragen',
      function (c) {
        var s2 = c.target.status;
        if (s2.gift > 0 || s2.brand > 0 || s2.erstarrung > 0 || s2.verderbnis > 0) c.dmg *= 1.3;
      }),
    passiv('souka_ang3', 'Doppelschuss', 'onHit', [], [],
      '30 % Chance auf einen zweiten Schuss mit 60 %',
      chance(0.3, function (c) { c.deal(c.target, c.self.atk * 0.6, 'Doppelschuss'); })),
    passiv('souka_ang4', 'Meisterschützin', 'onStart', [], [],
      '+12 Angriff auf einen Schlag',
      function (c) { c.self.atk += 12; }),

    passiv('souka_mec1', 'Panzerbrecher', 'onStart', [], [],
      'Ignoriert 70 % der gegnerischen Rüstung',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.7); }),
    passiv('souka_mec2', 'Anvisiert', 'onHit', ['verwundbar'], [],
      'Jeder Treffer macht das Ziel für den ganzen Trupp um 1 Stapel verwundbarer',
      function (c) { c.applyStatus(c.target, 'verwundbar', 1); }),
    passiv('souka_mec3', 'Blattschuss', 'onHit', [], [],
      '20 % Chance auf +60 % Schaden, der die Rüstung ganz ignoriert',
      chance(0.2, function (c) {
        c.dmg *= 1.6;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      })),
    passiv('souka_mec4', 'Kein Versteck', 'onHit', [], [],
      '+45 % Schaden gegen die hinterste gegnerische Einheit',
      function (c) {
        var f = c.foes();
        if (f.length && c.target === f[f.length - 1]) c.dmg *= 1.45;
      }),

    passiv('souka_unt1', 'Aufklärung', 'onStart', [], [],
      'Der ganze Trupp ignoriert 20 % der gegnerischen Rüstung',
      function (c) {
        c.allies().forEach(function (u) { u.pierce = Math.max(u.pierce || 0, 0.2); });
      }),
    passiv('souka_unt2', 'Feuerleitung', 'onStart', [], [],
      'Alle Verbündeten erhalten +6 Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk += 6; }); }),
    passiv('souka_unt3', 'Schwachstellen melden', 'onStart', [], ['gift', 'brand', 'frost', 'verderbnis'],
      'Der ganze Trupp verursacht +25 % Schaden gegen Ziele mit einem Zustand',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Schwachstellen melden', fn: function (k) {
            var s3 = k.target.status;
            if (s3.gift > 0 || s3.brand > 0 || s3.erstarrung > 0 || s3.verderbnis > 0) k.dmg *= 1.25;
          } });
        });
      }),
    passiv('souka_unt4', 'Späherin der Sümpfe', 'onStart', [], [],
      'Der ganze Trupp ignoriert 35 % Rüstung und erhält +8 Angriff',
      function (c) {
        c.allies().forEach(function (u) {
          u.pierce = Math.max(u.pierce || 0, 0.35);
          u.atk += 8;
        });
      }),

    passiv('souka_def1', 'Fluchtinstinkt', 'onStart', ['tempo'], [],
      '+25 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.25); }),
    passiv('souka_def2', 'Sumpfschleier', 'onStart', [], [],
      'Souka erleidet 18 % weniger Schaden',
      function (c) { c.self.minderung = Math.max(c.self.minderung || 0, 0.18); }),
    passiv('souka_def3', 'Rückzug', 'onDamaged', ['konter'], [],
      '30 % Chance, einen Angreifer sofort für 70 % zu beschießen',
      chance(0.3, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.7, 'Rückzug');
      })),
    passiv('souka_def4', 'Unsichtbar', 'onStart', ['tempo', 'schild'], [],
      '+30 % Tempo und Schild 30',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 1.3);
        c.applyStatus(c.self, 'schild', 30);
      }),

    /* ---- Echsenfürsts Linien: Ausdauer -------------------------------------
       Der zäheste Körper im Spiel. Seine Mechanik ist nicht der Schild, sondern
       die LANGE Bank: er wächst, solange der Kampf dauert.                     */

    passiv('fuerst_ang1', 'Fürstenschlag', 'onHit', [], [],
      '+22 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.22; }),
    passiv('fuerst_ang2', 'Wucht', 'onStart', [], [],
      '+10 Angriff auf einen Schlag',
      function (c) { c.self.atk += 10; }),
    passiv('fuerst_ang3', 'Langer Atem', 'onTurnStart', [], [],
      'Wird in jedem eigenen Zug dauerhaft 4 % stärker',
      function (c) { c.self.atk = Math.round(c.self.atk * 1.04); }),
    passiv('fuerst_ang4', 'Zorn des Fürsten', 'onHit', [], ['konter'],
      '+40 % Schaden, solange er unter der Hälfte seines Lebens steht',
      function (c) { if (c.self.hp < c.self.maxHp * 0.5) c.dmg *= 1.4; }),

    passiv('fuerst_mec1', 'Bollwerk', 'onStart', ['schild'], [],
      'Startet mit Schild 70',
      function (c) { c.applyStatus(c.self, 'schild', 70); }),
    passiv('fuerst_mec2', 'Stetiger Wall', 'onTurnStart', ['schild'], [],
      'Baut in jedem Zug 16 Schild nach',
      function (c) { c.applyStatus(c.self, 'schild', 16); }),
    passiv('fuerst_mec3', 'Unerschöpflich', 'onStart', ['heilung'], [],
      '+12 Regeneration in jedem eigenen Zug',
      function (c) { c.self.regen += 12; }),
    passiv('fuerst_mec4', 'Sumpfkraft', 'onTurnStart', ['heilung'], [],
      'Sein maximales Leben wächst in jedem Zug um 2 %',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.02);
        c.self.maxHp += add; c.self.hp += add;
      }),

    passiv('fuerst_unt1', 'Fürstenwort', 'onStart', [], [],
      'Alle Verbündeten erhalten +4 Rüstung',
      function (c) { c.allies().forEach(function (u) { u.def += 4; }); }),
    passiv('fuerst_unt2', 'Schutz des Volkes', 'onStart', ['schild'], [],
      'Alle Verbündeten starten mit Schild 30',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 30); }); }),
    passiv('fuerst_unt3', 'Ausdauer lehren', 'onStart', ['heilung'], [],
      'Alle Verbündeten erhalten +6 Regeneration',
      function (c) { c.allies().forEach(function (u) { u.regen += 6; }); }),
    passiv('fuerst_unt4', 'Herr der Sümpfe', 'onStart', [], [],
      'Alle Verbündeten erhalten +18 % maximales Leben und +3 Rüstung',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.18);
          u.maxHp += add; u.hp += add; u.def += 3;
        });
      }),

    passiv('fuerst_def1', 'Schuppenwall', 'onStart', [], [],
      '+8 Rüstung gegen jeden eingehenden Treffer',
      function (c) { c.self.def += 8; }),
    passiv('fuerst_def2', 'Riesenleib', 'onStart', [], [],
      '+30 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.3);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('fuerst_def3', 'Standhaft', 'onStart', [], [],
      'Kein einzelner Treffer nimmt ihm mehr als 13 % seines maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.13); }),
    passiv('fuerst_def4', 'Der letzte Wall', 'onDeath', ['schild', 'heilung'], [],
      'Steht einmal mit 50 % Leben wieder auf und gibt dem Trupp Schild 50',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 50); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Drachenknechts Linien: der Speerwall ------------------------------
       Er hält die Reihe und zahlt zurück — und lehrt es dem Trupp.             */

    passiv('knecht_ang1', 'Speerstoß', 'onStart', [], [],
      '+9 Angriff — eine feste Zahl statt eines Anteils',
      function (c) { c.self.atk += 9; }),
    passiv('knecht_ang2', 'Gegenstoß', 'onHit', ['konter'], [],
      '+25 % Schaden, sobald er in diesem Kampf selbst getroffen wurde',
      function (c) { if (c.self.dmgTaken > 0) c.dmg *= 1.25; }),
    passiv('knecht_ang3', 'Lanzenritt', 'onHit', [], [],
      'Der erste Angriff im Kampf verursacht doppelten Schaden',
      function (c) { if (!c.self._lr) { c.self._lr = 1; c.dmg *= 2; } }),
    passiv('knecht_ang4', 'Drachenspeer', 'onStart', [], [],
      '+13 Angriff und ignoriert 40 % der Rüstung',
      function (c) {
        c.self.atk += 13;
        c.self.pierce = Math.max(c.self.pierce || 0, 0.4);
      }),

    passiv('knecht_mec1', 'Speerwall', 'onDamaged', ['konter'], [],
      'Angreifer erleiden 14 Schaden plus ein Viertel seines Angriffs zurück',
      function (c) { var f = c.foes()[0]; if (f) c.deal(f, 14 + c.self.atk * 0.25, 'Speerwall'); }),
    passiv('knecht_mec2', 'Stachelreihe', 'onDamaged', ['konter'], [],
      '40 % Chance auf einen Gegenangriff mit 80 %',
      chance(0.4, function (c) {
        var f = c.foes()[0]; if (f) c.deal(f, c.self.atk * 0.8, 'Stachelreihe');
      })),
    passiv('knecht_mec3', 'Vergeltungswall', 'onDamaged', ['konter', 'flaeche'], [],
      '20 % Chance, ALLE Gegner für 45 % zu treffen',
      chance(0.2, function (c) {
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.45, 'Vergeltungswall'); });
      })),
    passiv('knecht_mec4', 'Unbrechbare Reihe', 'onDamaged', ['verwundbar', 'konter'], [],
      'Wer ihn trifft, wird um 2 Stapel verwundbarer und erleidet 10 Schaden',
      function (c) {
        var f = c.foes()[0];
        if (f) { c.applyStatus(f, 'verwundbar', 2); c.deal(f, 10, 'Unbrechbare Reihe'); }
      }),

    passiv('knecht_unt1', 'Reihenschluss', 'onStart', [], [],
      'Alle Verbündeten erhalten +3 Rüstung',
      function (c) { c.allies().forEach(function (u) { u.def += 3; }); }),
    passiv('knecht_unt2', 'Gemeinsamer Wall', 'onStart', ['konter'], [],
      'Der ganze Trupp wirft 8 plus 10 % seines Angriffs auf Angreifer zurück',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onDamaged', name: 'Gemeinsamer Wall', fn: function (k) {
            var f = k.foes()[0]; if (f) k.deal(f, 8 + k.self.atk * 0.1, 'Gemeinsamer Wall');
          } });
        });
      }),
    passiv('knecht_unt3', 'Deckung geben', 'onStart', [], [],
      'Die vorderste Einheit erleidet 20 % weniger Schaden',
      function (c) {
        var vorn = c.allies()[0];
        if (vorn) vorn.minderung = Math.max(vorn.minderung || 0, 0.2);
      }),
    passiv('knecht_unt4', 'Drachengarde', 'onStart', ['konter'], [],
      'Alle Verbündeten erhalten +10 % Leben und werfen 10 plus 12 % ihres Angriffs zurück',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.1);
          u.maxHp += add; u.hp += add;
          c.addEffect(u, { hook: 'onDamaged', name: 'Drachengarde', fn: function (k) {
            var f = k.foes()[0]; if (f) k.deal(f, 10 + k.self.atk * 0.12, 'Drachengarde');
          } });
        });
      }),

    passiv('knecht_def1', 'Panzerechse', 'onStart', [], [],
      '+6 Rüstung gegen jeden eingehenden Treffer',
      function (c) { c.self.def += 6; }),
    passiv('knecht_def2', 'Zäh', 'onStart', [], [],
      '+25 % maximales Leben',
      function (c) {
        var add = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += add; c.self.hp += add;
      }),
    passiv('knecht_def3', 'Widerhaken', 'onDamaged', ['heilung'], [],
      'Heilt sich bei jedem erlittenen Treffer um 9 Leben',
      function (c) { c.heal(c.self, 9, 'Widerhaken'); }),
    passiv('knecht_def4', 'Standhalten', 'onStart', [], [],
      'Kein einzelner Treffer nimmt ihm mehr als 15 % seines maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.15); }),

    /* ---- Quellenpriesterins Linien: Regeneration ---------------------------
       Nicht Stoßheilung wie Gobwa oder Shuna, sondern der stetige Fluss: sie
       gewinnt lange Kämpfe, keine kurzen.                                      */

    passiv('prie_ang1', 'Segen der Quelle', 'onStart', [], [],
      '+8 Angriff aus der Quelle',
      function (c) { c.self.atk += 8; }),
    passiv('prie_ang2', 'Wasserklinge', 'onHit', [], [],
      '+25 % Schaden auf jeden Treffer',
      function (c) { c.dmg *= 1.25; }),
    passiv('prie_ang3', 'Lebensraub', 'onStart', ['heilung'], [],
      'Heilt 35 % des verursachten Schadens',
      function (c) { c.self.lifesteal += 0.35; }),
    passiv('prie_ang4', 'Fließende Kraft', 'onHit', [], ['heilung'],
      '+3 % Schaden je Punkt eigener Regeneration',
      function (c) { c.dmg *= 1 + 0.03 * (c.self.regen || 0); }),

    passiv('prie_mec1', 'Heilquelle', 'onStart', ['heilung'], [],
      'Alle Verbündeten erhalten +7 Regeneration',
      function (c) { c.allies().forEach(function (u) { u.regen += 7; }); }),
    passiv('prie_mec2', 'Tiefer Brunnen', 'onStart', [], ['heilung'],
      'Jede Heilung im Trupp wirkt um 50 % stärker',
      function (c) { c.allies().forEach(function (u) { u.heilfaktor += 0.5; }); }),
    passiv('prie_mec3', 'Ewiger Fluss', 'onTurnStart', ['heilung'], [],
      'In jedem Zug wächst die Regeneration des ganzen Trupps um 1',
      function (c) { c.allies().forEach(function (u) { u.regen += 1; }); }),
    passiv('prie_mec4', 'Überfluss', 'onStart', ['schild'], ['heilung'],
      'Heilung über das Maximum hinaus wird beim ganzen Trupp zu Schild',
      function (c) {
        c.allies().forEach(function (u) { u.ueberheilung = Math.max(u.ueberheilung || 0, 1); });
      }),

    passiv('prie_unt1', 'Quellwasser', 'onStart', [], [],
      'Alle Verbündeten erhalten +12 % maximales Leben',
      function (c) {
        c.allies().forEach(function (u) {
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
        });
      }),
    passiv('prie_unt2', 'Reinigung', 'onTurnStart', ['heilung'], [],
      'Nimmt dem ganzen Trupp in jedem Zug einen Stapel Gift und einen Brand',
      function (c) {
        c.allies().forEach(function (u) {
          if (u.status.gift > 0) u.status.gift--;
          if (u.status.brand > 0) u.status.brand--;
        });
      }),
    passiv('prie_unt3', 'Segen', 'onAllyDeath', ['heilung'], [],
      'Stirbt ein Verbündeter, heilen alle übrigen 30 % ihres maximalen Lebens',
      function (c) { c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.3, 'Segen'); }); }),
    passiv('prie_unt4', 'Herrin der Quelle', 'onStart', ['heilung'], ['heilung'],
      'Alle Verbündeten erhalten +10 Regeneration, und jede Heilung wirkt 30 % stärker',
      function (c) {
        c.allies().forEach(function (u) { u.regen += 10; u.heilfaktor += 0.3; });
      }),

    passiv('prie_def1', 'Flink', 'onStart', ['tempo'], [],
      '+20 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.2); }),
    passiv('prie_def2', 'Selbstquell', 'onTurnStart', ['heilung'], [],
      'Heilt sich in jedem Zug um 5 % ihres maximalen Lebens',
      function (c) { c.heal(c.self, c.self.maxHp * 0.05, 'Selbstquell'); }),
    passiv('prie_def3', 'Wasserschild', 'onStart', ['schild'], [],
      'Startet mit Schild 35',
      function (c) { c.applyStatus(c.self, 'schild', 35); }),
    passiv('prie_def4', 'Unversiegbar', 'onDeath', ['heilung'], [],
      'Steht einmal mit 45 % Leben wieder auf und heilt den Trupp um 25 %',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.25, 'Unversiegbar'); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      })
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
    },
    souei: {
      angriff: ['souei_ang1', 'souei_ang2', 'souei_ang3', 'souei_ang4'],
      mechanik: ['souei_mec1', 'souei_mec2', 'souei_mec3', 'souei_mec4'],
      unterstuetzung: ['souei_unt1', 'souei_unt2', 'souei_unt3', 'souei_unt4'],
      defensive: ['souei_def1', 'souei_def2', 'souei_def3', 'souei_def4']
    },
    benimaru: {
      angriff: ['ben_ang1', 'ben_ang2', 'ben_ang3', 'ben_ang4'],
      mechanik: ['ben_mec1', 'ben_mec2', 'ben_mec3', 'ben_mec4'],
      unterstuetzung: ['ben_unt1', 'ben_unt2', 'ben_unt3', 'ben_unt4'],
      defensive: ['ben_def1', 'ben_def2', 'ben_def3', 'ben_def4']
    },
    shuna: {
      angriff: ['shu_ang1', 'shu_ang2', 'shu_ang3', 'shu_ang4'],
      mechanik: ['shu_mec1', 'shu_mec2', 'shu_mec3', 'shu_mec4'],
      unterstuetzung: ['shu_unt1', 'shu_unt2', 'shu_unt3', 'shu_unt4'],
      defensive: ['shu_def1', 'shu_def2', 'shu_def3', 'shu_def4']
    },
    hakuro: {
      angriff: ['hak_ang1', 'hak_ang2', 'hak_ang3', 'hak_ang4'],
      mechanik: ['hak_mec1', 'hak_mec2', 'hak_mec3', 'hak_mec4'],
      unterstuetzung: ['hak_unt1', 'hak_unt2', 'hak_unt3', 'hak_unt4'],
      defensive: ['hak_def1', 'hak_def2', 'hak_def3', 'hak_def4']
    },
    kurobe: {
      angriff: ['kur_ang1', 'kur_ang2', 'kur_ang3', 'kur_ang4'],
      mechanik: ['kur_mec1', 'kur_mec2', 'kur_mec3', 'kur_mec4'],
      unterstuetzung: ['kur_unt1', 'kur_unt2', 'kur_unt3', 'kur_unt4'],
      defensive: ['kur_def1', 'kur_def2', 'kur_def3', 'kur_def4']
    },
    gobta: {
      angriff: ['gobta_ang1', 'gobta_ang2', 'gobta_ang3', 'gobta_ang4'],
      mechanik: ['gobta_mec1', 'gobta_mec2', 'gobta_mec3', 'gobta_mec4'],
      unterstuetzung: ['gobta_unt1', 'gobta_unt2', 'gobta_unt3', 'gobta_unt4'],
      defensive: ['gobta_def1', 'gobta_def2', 'gobta_def3', 'gobta_def4']
    },
    gobkyu: {
      angriff: ['gobkyu_ang1', 'gobkyu_ang2', 'gobkyu_ang3', 'gobkyu_ang4'],
      mechanik: ['gobkyu_mec1', 'gobkyu_mec2', 'gobkyu_mec3', 'gobkyu_mec4'],
      unterstuetzung: ['gobkyu_unt1', 'gobkyu_unt2', 'gobkyu_unt3', 'gobkyu_unt4'],
      defensive: ['gobkyu_def1', 'gobkyu_def2', 'gobkyu_def3', 'gobkyu_def4']
    },
    rigurd: {
      angriff: ['rigurd_ang1', 'rigurd_ang2', 'rigurd_ang3', 'rigurd_ang4'],
      mechanik: ['rigurd_mec1', 'rigurd_mec2', 'rigurd_mec3', 'rigurd_mec4'],
      unterstuetzung: ['rigurd_unt1', 'rigurd_unt2', 'rigurd_unt3', 'rigurd_unt4'],
      defensive: ['rigurd_def1', 'rigurd_def2', 'rigurd_def3', 'rigurd_def4']
    },
    rigur: {
      angriff: ['rigur_ang1', 'rigur_ang2', 'rigur_ang3', 'rigur_ang4'],
      mechanik: ['rigur_mec1', 'rigur_mec2', 'rigur_mec3', 'rigur_mec4'],
      unterstuetzung: ['rigur_unt1', 'rigur_unt2', 'rigur_unt3', 'rigur_unt4'],
      defensive: ['rigur_def1', 'rigur_def2', 'rigur_def3', 'rigur_def4']
    },
    gobwa: {
      angriff: ['gobwa_ang1', 'gobwa_ang2', 'gobwa_ang3', 'gobwa_ang4'],
      mechanik: ['gobwa_mec1', 'gobwa_mec2', 'gobwa_mec3', 'gobwa_mec4'],
      unterstuetzung: ['gobwa_unt1', 'gobwa_unt2', 'gobwa_unt3', 'gobwa_unt4'],
      defensive: ['gobwa_def1', 'gobwa_def2', 'gobwa_def3', 'gobwa_def4']
    },
    ranga: {
      angriff: ['ranga_ang1', 'ranga_ang2', 'ranga_ang3', 'ranga_ang4'],
      mechanik: ['ranga_mec1', 'ranga_mec2', 'ranga_mec3', 'ranga_mec4'],
      unterstuetzung: ['ranga_unt1', 'ranga_unt2', 'ranga_unt3', 'ranga_unt4'],
      defensive: ['ranga_def1', 'ranga_def2', 'ranga_def3', 'ranga_def4']
    },
    sturmwolf: {
      angriff: ['sturm_ang1', 'sturm_ang2', 'sturm_ang3', 'sturm_ang4'],
      mechanik: ['sturm_mec1', 'sturm_mec2', 'sturm_mec3', 'sturm_mec4'],
      unterstuetzung: ['sturm_unt1', 'sturm_unt2', 'sturm_unt3', 'sturm_unt4'],
      defensive: ['sturm_def1', 'sturm_def2', 'sturm_def3', 'sturm_def4']
    },
    schattenwolf: {
      angriff: ['schatten_ang1', 'schatten_ang2', 'schatten_ang3', 'schatten_ang4'],
      mechanik: ['schatten_mec1', 'schatten_mec2', 'schatten_mec3', 'schatten_mec4'],
      unterstuetzung: ['schatten_unt1', 'schatten_unt2', 'schatten_unt3', 'schatten_unt4'],
      defensive: ['schatten_def1', 'schatten_def2', 'schatten_def3', 'schatten_def4']
    },
    rudelalpha: {
      angriff: ['alpha_ang1', 'alpha_ang2', 'alpha_ang3', 'alpha_ang4'],
      mechanik: ['alpha_mec1', 'alpha_mec2', 'alpha_mec3', 'alpha_mec4'],
      unterstuetzung: ['alpha_unt1', 'alpha_unt2', 'alpha_unt3', 'alpha_unt4'],
      defensive: ['alpha_def1', 'alpha_def2', 'alpha_def3', 'alpha_def4']
    },
    gabiru: {
      angriff: ['gab_ang1', 'gab_ang2', 'gab_ang3', 'gab_ang4'],
      mechanik: ['gab_mec1', 'gab_mec2', 'gab_mec3', 'gab_mec4'],
      unterstuetzung: ['gab_unt1', 'gab_unt2', 'gab_unt3', 'gab_unt4'],
      defensive: ['gab_def1', 'gab_def2', 'gab_def3', 'gab_def4']
    },
    souka: {
      angriff: ['souka_ang1', 'souka_ang2', 'souka_ang3', 'souka_ang4'],
      mechanik: ['souka_mec1', 'souka_mec2', 'souka_mec3', 'souka_mec4'],
      unterstuetzung: ['souka_unt1', 'souka_unt2', 'souka_unt3', 'souka_unt4'],
      defensive: ['souka_def1', 'souka_def2', 'souka_def3', 'souka_def4']
    },
    echsenfuerst: {
      angriff: ['fuerst_ang1', 'fuerst_ang2', 'fuerst_ang3', 'fuerst_ang4'],
      mechanik: ['fuerst_mec1', 'fuerst_mec2', 'fuerst_mec3', 'fuerst_mec4'],
      unterstuetzung: ['fuerst_unt1', 'fuerst_unt2', 'fuerst_unt3', 'fuerst_unt4'],
      defensive: ['fuerst_def1', 'fuerst_def2', 'fuerst_def3', 'fuerst_def4']
    },
    drachenknecht: {
      angriff: ['knecht_ang1', 'knecht_ang2', 'knecht_ang3', 'knecht_ang4'],
      mechanik: ['knecht_mec1', 'knecht_mec2', 'knecht_mec3', 'knecht_mec4'],
      unterstuetzung: ['knecht_unt1', 'knecht_unt2', 'knecht_unt3', 'knecht_unt4'],
      defensive: ['knecht_def1', 'knecht_def2', 'knecht_def3', 'knecht_def4']
    },
    quellenpriesterin: {
      angriff: ['prie_ang1', 'prie_ang2', 'prie_ang3', 'prie_ang4'],
      mechanik: ['prie_mec1', 'prie_mec2', 'prie_mec3', 'prie_mec4'],
      unterstuetzung: ['prie_unt1', 'prie_unt2', 'prie_unt3', 'prie_unt4'],
      defensive: ['prie_def1', 'prie_def2', 'prie_def3', 'prie_def4']
    }
  };
  /* ---- Kategorien der Bibliothek ------------------------------------------
     Dieselben vier Arten wie in den Linien: Angriff (Werte und Schaden),
     Mechanik (erzeugt oder nutzt einen Zustand), Unterstützung (wirkt auf den
     Trupp), Defensive (hält die eigene Einheit am Leben). Der Aufstieg bietet
     eine aus JEDER Art an — sonst ist die Wahl nur „welche Zahl ist größer".  */
  var KATEGORIE = {
    /* Angriff: mehr Schaden, ohne Umweg über einen Zustand. */
    erstschlag: 'angriff', panzerbrecher: 'angriff', kriegsherz: 'angriff',
    scharfrichter: 'angriff', henkersblick: 'angriff', blutrausch: 'angriff',
    massenschlaechter: 'angriff', schwungmeister: 'angriff', rachsucht: 'angriff',
    /* Mechanik: legt einen Zustand an oder schlägt daraus Kapital. */
    giftbrut: 'mechanik', giftzahn: 'mechanik', glutkern: 'mechanik', aschehaut: 'mechanik',
    frostkern: 'mechanik', frostschneide: 'mechanik', verderber: 'mechanik',
    fluchweber: 'mechanik', kettenschlag: 'mechanik',
    /* Unterstützung: wirkt auf Verbündete, nicht nur auf einen selbst. */
    bannerherz: 'unterstuetzung', quelle: 'unterstuetzung', jagdruf: 'unterstuetzung',
    rachegeist: 'unterstuetzung', seelenband: 'unterstuetzung', trophaenjaeger: 'unterstuetzung',
    lebenskraft: 'unterstuetzung',
    /* Defensive: hält die eigene Einheit stehen. */
    schildwall: 'defensive', bollwerkmeister: 'defensive', regenerator: 'defensive',
    lebensraub: 'defensive', zaeh: 'defensive', wiederkehr: 'defensive',
    dornenhaut: 'defensive', konterstoss: 'defensive', windschritt: 'defensive'
  };
  function kategorie(id) { return KATEGORIE[id] || null; }

  /* Nachschlagwerk: welche Passive gehört zur Linie einer Einheit? Damit sie
     nicht als Bibliotheks-Angebot bei einer anderen Einheit auftaucht. */
  var linien_ids = {};
  Object.keys(linien).forEach(function (u) {
    Object.keys(linien[u]).forEach(function (l) {
      linien[u][l].forEach(function (id) { linien_ids[id] = u; });
    });
  });

  var LINIEN_NAME = { angriff: 'Angriff', mechanik: 'Mechanik',
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
      '130 % Schaden. Stirbt das Ziel, folgt sofort ein zweiter Schlag auf den nächsten Gegner.',
      function (c) {
        c.attack(1.3);
        if (c.target.hp <= 0) { var f = c.foes()[0]; if (f) c.attack(1.3, f); }
      }),

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
    /* Souei markiert, statt selbst abzuräumen: die Marke ist für den Trupp da.
       Entwicklungsstufe wie bei Shion — Oger, Teufel, Verdorbener, Ultimativer. */
    aktiv('sig_souei', 'Stahlfaden', 3, ['verwundbar'],
      'Drei Angriffe mit je 65 % und macht das Ziel verwundbar — 1 Stapel auf Rang C, ' +
      '2 auf B, 3 auf A, 5 auf S. Jeder Stapel lässt JEDEN Angreifer 15 % mehr Rüstung ' +
      'durchschlagen, nicht nur Souei.',
      function (c) {
        c.attack(0.65); c.attack(0.65); c.attack(0.65);
        c.markiere(c.target, MARKE_JE_RANG[c.self.rank || 0]);
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
      '260 % Schaden. Stirbt das Ziel, schlägt Milim sofort auf den nächsten ein — sie hört nicht auf.',
      function (c) {
        c.attack(2.6);
        if (c.target.hp <= 0) { var f = c.foes()[0]; if (f) c.attack(2.6, f); }
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
    shion_ang4: 5, shion_mec4: 5, shion_unt4: 5, shion_def4: 5,
    souei_ang1: 2, souei_mec1: 2, souei_unt1: 2, souei_def1: 2,
    souei_ang2: 3, souei_mec2: 3, souei_unt2: 3, souei_def2: 3,
    souei_ang3: 4, souei_mec3: 4, souei_unt3: 4, souei_def3: 4,
    souei_ang4: 5, souei_mec4: 5, souei_unt4: 5, souei_def4: 5
  };

  var RARITAET_NAME = ['', 'üblich', 'ungewöhnlich', 'selten', 'episch', 'legendär'];
  /* Grundgewicht für zufällige Angebote. Später im Run verschiebt sich das nach
     oben — siehe Run.gewichteteWahl. */
  var RARITAET_GEWICHT = [0, 100, 62, 34, 15, 5];

  var alle = passives.concat(pool, signatures);
  alle.forEach(function (a) { a.rarity = RARITAET[a.id] || 0; });
  /* Einheitenspezifisches trägt keine Raritätsstufe: Signaturen und Linien-
     Passive stehen nie in einem gewichteten Angebot, die Stufe wäre nur Farbe
     ohne Bedeutung. */
  function istEigen(id) { return !!linien_ids[id] || String(id).indexOf('sig_') === 0; }
  alle.forEach(function (a) { if (istEigen(a.id)) a.rarity = 0; });
  function byId(id) {
    for (var i = 0; i < alle.length; i++) if (alle[i].id === id) return alle[i];
    return null;
  }

  root.Abilities = {
    passives: passives, pool: pool, signatures: signatures, alle: alle,
    linien: linien, linien_ids: linien_ids, istEigen: istEigen,
    KATEGORIE: KATEGORIE, kategorie: kategorie,
    LINIEN_NAME: LINIEN_NAME, linienAngebot: linienAngebot,
    CHAOS_JE_RANG: CHAOS_JE_RANG, MARKE_JE_RANG: MARKE_JE_RANG,
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
