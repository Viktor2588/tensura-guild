/* js/enemies.js — Gegner, Begegnungen pro Akt, Bosse, Ereignisse.
   Gegner tragen dieselben Tags wie Spielereinheiten, also greifen bei ihnen
   dieselben Synergien — ein Wolfsrudel ist wirklich schnell.                 */
'use strict';
(function (root) {
  var GD = root.GameData, eff = GD.eff, chance = GD.chance, inflict = GD.inflict, buff = GD.buff, scale = GD.scale;

  /* Gegnerfähigkeiten brauchen Text und Schlüsselwörter wie eigene: der Prädator
     übernimmt sie, und dann müssen sie sich erklären und im Build mitzählen. */
  function faehigkeit(hook, name, text, keywords, fn) {
    return { hook: hook, name: name, text: text, keywords: keywords || [], fn: fn };
  }

  var enemies = [
    /* --- Akt 1: Jura-Wald --- */
    { id: 'wolfsjunges', name: 'Wolfsjunges', tags: ['direwolf', 'front'], hp: 50, atk: 10, def: 1, spd: 30 },
    { id: 'giftspinne', name: 'Giftspinne', tags: ['insektoid', 'fernkampf'], hp: 48, atk: 7, def: 0, spd: 28,
      effects: [faehigkeit('onHit', 'Giftbiss', 'Jeder Treffer legt 2 Gift an.', ['gift'],
        inflict('gift', 2))] },
    { id: 'riesenspinne', name: 'Riesenspinne', tags: ['insektoid', 'front'], hp: 65, atk: 9, def: 3, spd: 22 },
    { id: 'goblinraeuber', name: 'Goblinräuber', tags: ['goblin', 'front'], hp: 55, atk: 8, def: 2, spd: 24 },
    { id: 'goblinschamane', name: 'Goblinschamane', tags: ['goblin', 'magier'], hp: 45, atk: 12, def: 1, spd: 26 },
    { id: 'hornhase', name: 'Hornhase', tags: ['bestie', 'fernkampf'], hp: 40, atk: 9, def: 1, spd: 32 },
    { id: 'waldschlange', name: 'Waldschlange', tags: ['bestie', 'front'], hp: 60, atk: 10, def: 2, spd: 24,
      effects: [faehigkeit('onHit', 'Natternbiss', '40 % Chance, bei einem Treffer 1 Gift anzulegen.', ['gift'],
        chance(0.4, inflict('gift', 1)))] },
    { id: 'tollwuetiger_baer', name: 'Tollwütiger Bär', tags: ['bestie', 'front'], hp: 95, atk: 14, def: 3, spd: 18 },
    { id: 'rudelfuehrer', name: 'Rudelführer', tags: ['direwolf', 'verstaerker'], hp: 85, atk: 13, def: 2, spd: 20,
      effects: [faehigkeit('onDeath', 'Letztes Heulen',
        'Stirbt der Träger, erhalten alle Verbündeten dauerhaft +4 Angriff.', [],
        function (c) { c.allies().forEach(function (u) { buff(u, { atk: 4 }); }); })] },
    { id: 'dryade', name: 'Rankendryade', tags: ['bestie', 'unterstuetzer'], hp: 70, atk: 9, def: 2, spd: 24 },

    { id: 'riesenfledermaus', name: 'Riesenfledermaus', tags: ['bestie', 'fernkampf'], hp: 45, atk: 9, def: 1, spd: 34,
      effects: [faehigkeit('onHit', 'Schallstoß', '20 % Chance, dem Ziel einen Zug zu rauben.', ['frost'],
        chance(0.2, inflict('erstarrung', 1)))] },
    { id: 'tausendfuessler', name: 'Übler Tausendfüßler', tags: ['insektoid', 'front'], hp: 80, atk: 11, def: 5, spd: 20,
      effects: [faehigkeit('onDamaged', 'Panzerschale', 'Fügt jedem Angreifer 6 Schaden zu.', ['konter'],
        function (c) { var f = c.foes()[0]; if (f) c.deal(f, 6, 'Panzerschale'); })] },
    { id: 'klingentiger', name: 'Klingentiger', tags: ['bestie', 'front'], hp: 85, atk: 15, def: 2, spd: 28 },
    { id: 'eberrammler', name: 'Eberrammler', tags: ['bestie', 'front'], hp: 105, atk: 13, def: 4, spd: 16,
      effects: [faehigkeit('onStart', 'Sturmlauf', 'Der erste Angriff verursacht doppelten Schaden.', [],
        function (c) {
          c.addEffect(c.self, { hook: 'onHit', name: 'Sturmlauf', fn: function (x) {
            if (!x.self._sturm) { x.self._sturm = 1; x.dmg *= 2; }
          } });
        })] },
    { id: 'goblinjaeger', name: 'Goblinjäger', tags: ['goblin', 'fernkampf'], hp: 55, atk: 12, def: 1, spd: 30 },
    { id: 'sumpfkriecher', name: 'Sumpfkriecher', tags: ['bestie', 'front'], hp: 70, atk: 9, def: 3, spd: 20,
      effects: [faehigkeit('onStart', 'Schlammhaut', 'Heilt 4 Leben in jedem eigenen Zug.', ['heilung'],
        function (c) { c.self.regen += 4; })] },
    { id: 'orkspaeher', name: 'Orkspäher', tags: ['ork', 'fernkampf'], hp: 75, atk: 13, def: 2, spd: 26 },
    { id: 'irrlicht', name: 'Irrlicht', tags: ['bestie', 'magier'], hp: 40, atk: 14, def: 0, spd: 30,
      effects: [faehigkeit('onHit', 'Fahles Feuer', '30 % Chance auf 2 Brand.', ['brand'],
        chance(0.3, inflict('brand', 2)))] },

    /* --- Akt 2: Höhlen & Ruinen --- */
    { id: 'skelett', name: 'Skelett', tags: ['untot', 'front'], hp: 70, atk: 13, def: 3, spd: 22 },
    { id: 'gruftghul', name: 'Gruftghul', tags: ['untot', 'front'], hp: 85, atk: 15, def: 3, spd: 24 },
    { id: 'knochenmagier', name: 'Knochenmagier', tags: ['untot', 'magier'], hp: 70, atk: 20, def: 2, spd: 26 },
    { id: 'hoehlentroll', name: 'Höhlentroll', tags: ['bestie', 'front'], hp: 140, atk: 20, def: 5, spd: 18,
      effects: [faehigkeit('onStart', 'Trollhaut', 'Heilt 6 Leben in jedem eigenen Zug.', ['heilung'],
        function (c) { c.self.regen += 6; })] },
    { id: 'felsgolem', name: 'Felsgolem', tags: ['bestie', 'front'], hp: 160, atk: 18, def: 9, spd: 14 },
    { id: 'minenkobold', name: 'Minenkobold', tags: ['goblin', 'fernkampf'], hp: 65, atk: 17, def: 2, spd: 30 },
    { id: 'orkkrieger', name: 'Orkkrieger', tags: ['ork', 'front'], hp: 100, atk: 18, def: 4, spd: 22 },
    { id: 'orkhaeuptling', name: 'Orkhäuptling', tags: ['ork', 'verstaerker'], hp: 130, atk: 22, def: 5, spd: 22,
      effects: [faehigkeit('onStart', 'Kriegsruf', 'Gibt zu Kampfbeginn allen Verbündeten +4 Angriff.', [],
        function (c) { c.allies().forEach(function (u) { buff(u, { atk: 4 }); }); })] },
    { id: 'schattenfalter', name: 'Schattenfalter', tags: ['insektoid', 'magier'], hp: 70, atk: 21, def: 1, spd: 32,
      effects: [faehigkeit('onHit', 'Lähmstaub', '15 % Chance, dem Ziel einen ganzen Zug zu rauben.', ['frost'],
        chance(0.15, inflict('erstarrung', 1)))] },
    { id: 'hoehlenspinne', name: 'Höhlenspinne', tags: ['insektoid', 'fernkampf'], hp: 80, atk: 18, def: 2, spd: 28,
      effects: [faehigkeit('onHit', 'Würgefaden', 'Jeder Treffer legt 3 Gift an.', ['gift'],
        inflict('gift', 3))] },

    { id: 'orkschamane', name: 'Orkschamane', tags: ['ork', 'magier'], hp: 85, atk: 22, def: 2, spd: 26,
      effects: [faehigkeit('onStart', 'Schlachtgesang', 'Gibt allen Verbündeten zu Kampfbeginn +3 Rüstung.', ['schild'],
        function (c) { c.allies().forEach(function (u) { u.def += 3; }); })] },
    { id: 'grubenwurm', name: 'Grubenwurm', tags: ['bestie', 'front'], hp: 175, atk: 19, def: 6, spd: 12,
      effects: [faehigkeit('onDamaged', 'Häutung', '15 % Chance, bei einem Treffer 25 Leben zurückzugewinnen.', ['heilung'],
        chance(0.15, function (c) { c.heal(c.self, 25, 'Häutung'); }))] },
    { id: 'minenaufseher', name: 'Minenaufseher', tags: ['goblin', 'verstaerker'], hp: 95, atk: 19, def: 3, spd: 24 },
    { id: 'gruftfledermaus', name: 'Gruftfledermaus', tags: ['untot', 'fernkampf'], hp: 70, atk: 19, def: 1, spd: 32,
      effects: [faehigkeit('onStart', 'Blutdurst', 'Heilt 25 % des verursachten Schadens.', ['heilung'],
        function (c) { c.self.lifesteal += 0.25; })] },

    /* --- Akt 3: Falmuth & die Dämonen --- */
    { id: 'ritter', name: 'Ritter von Falmuth', tags: ['mensch', 'front'], hp: 150, atk: 24, def: 8, spd: 24 },
    { id: 'bogenschuetze', name: 'Bogenschütze', tags: ['mensch', 'fernkampf'], hp: 110, atk: 26, def: 4, spd: 30 },
    { id: 'hofmagier', name: 'Hofmagier', tags: ['mensch', 'magier'], hp: 100, atk: 30, def: 3, spd: 28 },
    { id: 'paladin', name: 'Paladin', tags: ['mensch', 'front'], hp: 190, atk: 26, def: 10, spd: 22,
      effects: [faehigkeit('onStart', 'Heilige Aura', 'Gibt zu Kampfbeginn allen Verbündeten Schild 30.', ['schild'],
        function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 30); }); })] },
    { id: 'heilige_klinge', name: 'Heilige Klinge', tags: ['mensch', 'verstaerker'], hp: 160, atk: 30, def: 7, spd: 30,
      effects: [faehigkeit('onStart', 'Gottesschwur', 'Ignoriert die Rüstung des Ziels vollständig.', [],
        function (c) { c.self.pierce = 1; })] },
    { id: 'verderbte_seele', name: 'Verderbte Seele', tags: ['untot', 'magier'], hp: 120, atk: 28, def: 4, spd: 28,
      effects: [faehigkeit('onHit', 'Fluch', 'Jeder Treffer legt 2 Verderbnis an — das Ziel nimmt je Stapel +10 % Schaden.',
        ['verderbnis'], inflict('verderbnis', 2))] },
    { id: 'daemonenbrut', name: 'Dämonenbrut', tags: ['daemon', 'front'], hp: 140, atk: 26, def: 6, spd: 26 },
    { id: 'hoellenhund', name: 'Höllenhund', tags: ['daemon', 'fernkampf'], hp: 120, atk: 30, def: 4, spd: 34,
      effects: [faehigkeit('onHit', 'Glutbiss', '30 % Chance auf 3 Brand — Schaden über Zeit, halbiert die Heilung des Ziels.',
        ['brand'], chance(0.3, inflict('brand', 3)))] },
    { id: 'blutritter', name: 'Blutritter', tags: ['untot', 'front'], hp: 170, atk: 28, def: 8, spd: 24,
      effects: [faehigkeit('onStart', 'Blutdurst', 'Heilt 30 % des verursachten Schadens.', ['heilung'],
        function (c) { c.self.lifesteal += 0.3; })] },
    { id: 'erzdaemon', name: 'Erzdämon', tags: ['daemon', 'magier'], hp: 130, atk: 34, def: 5, spd: 30 },

    { id: 'kreuzritter', name: 'Kreuzritter', tags: ['mensch', 'front'], hp: 165, atk: 27, def: 9, spd: 26 },
    { id: 'inquisitor', name: 'Inquisitor', tags: ['mensch', 'magier'], hp: 115, atk: 32, def: 4, spd: 28,
      effects: [faehigkeit('onHit', 'Bannspruch', 'Jeder Treffer legt 2 Verderbnis an.', ['verderbnis'],
        inflict('verderbnis', 2))] },
    { id: 'gefallener_engel', name: 'Gefallener Engel', tags: ['daemon', 'verstaerker'], hp: 150, atk: 30, def: 6, spd: 30,
      effects: [faehigkeit('onAllyDeath', 'Schwarze Schwingen', 'Stirbt ein Verbündeter, erhält er dauerhaft +8 Angriff.', [],
        function (c) { c.self.atk += 8; })] },

    /* --- Akt 4: die Westliche Heilige Kirche (Anime-Staffel 3) --- */
    { id: 'tempelritter', name: 'Tempelritter', tags: ['mensch', 'front'], hp: 230, atk: 34, def: 12, spd: 28,
      effects: [faehigkeit('onStart', 'Geweihte Rüstung', 'Startet mit Schild 60.', ['schild'],
        function (c) { c.applyStatus(c.self, 'schild', 60); })] },
    { id: 'heilige_schuetzin', name: 'Heilige Schützin', tags: ['mensch', 'fernkampf'], hp: 175, atk: 40, def: 6, spd: 34,
      effects: [faehigkeit('onHit', 'Läuterungspfeil', '35 % Chance auf 3 Brand — Brand halbiert zusätzlich die Heilung des Ziels.',
        ['brand'], chance(0.35, inflict('brand', 3)))] },
    { id: 'exorzist', name: 'Exorzist', tags: ['mensch', 'unterstuetzer'], hp: 190, atk: 33, def: 7, spd: 30,
      effects: [faehigkeit('onStart', 'Gebetskreis', 'Gibt allen Verbündeten Regeneration 12.', ['heilung'],
        function (c) { c.allies().forEach(function (u) { u.regen += 12; }); })] },
    { id: 'bussritter', name: 'Bußritter', tags: ['mensch', 'front'], hp: 245, atk: 32, def: 11, spd: 26,
      effects: [faehigkeit('onDamaged', 'Selbstgeißelung', 'Wirft jedem Angreifer 14 plus 30 % des eigenen Angriffs zurück.',
        ['konter'], function (c) { var f = c.foes()[0]; if (f) c.deal(f, 14 + c.self.atk * 0.3, 'Selbstgeißelung'); })] },
    { id: 'kantor', name: 'Kantor des Lichts', tags: ['mensch', 'verstaerker'], hp: 185, atk: 38, def: 7, spd: 32,
      effects: [faehigkeit('onStart', 'Choral', 'Gibt allen Verbündeten dauerhaft +12 % Angriff und Tempo.', ['tempo'],
        function (c) { c.allies().forEach(function (u) { scale(u, { atk: 0.12, spd: 0.12 }); }); })] },
    { id: 'reliquienwaechter', name: 'Reliquienwächter', tags: ['untot', 'front'], hp: 300, atk: 30, def: 14, spd: 20,
      effects: [faehigkeit('onDeath', 'Zerbrochenes Siegel', 'Zerbricht er, erleiden alle Gegner 45 Schaden.', ['flaeche'],
        function (c) { c.foes().forEach(function (f) { c.deal(f, 45, 'Zerbrochenes Siegel'); }); })] },
    { id: 'geweihter_greif', name: 'Geweihter Greif', tags: ['bestie', 'fernkampf'], hp: 195, atk: 42, def: 6, spd: 40,
      effects: [faehigkeit('onHit', 'Sturzflug', 'Der erste Angriff verursacht doppelten Schaden.', [],
        function (c) { if (!c.self._sf) { c.self._sf = 1; c.dmg *= 2; } })] },
    { id: 'glaubenswaechter', name: 'Glaubenswächter', tags: ['mensch', 'front'], hp: 265, atk: 31, def: 13, spd: 24,
      effects: [faehigkeit('onStart', 'Schildmauer', 'Gibt allen Verbündeten Schild 40.', ['schild'],
        function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schild', 40); }); })] },
    { id: 'ketzerjaeger', name: 'Ketzerjäger', tags: ['mensch', 'magier'], hp: 170, atk: 44, def: 5, spd: 33,
      effects: [faehigkeit('onHit', 'Urteilsspruch', '+60 % Schaden gegen Ziele unter der Hälfte ihres Lebens.',
        ['exekution'], function (c) { if (c.target.hp < c.target.maxHp * 0.5) c.dmg *= 1.6; })] },
    { id: 'lichtkleriker', name: 'Lichtkleriker', tags: ['mensch', 'unterstuetzer'], hp: 180, atk: 35, def: 6, spd: 31,
      effects: [faehigkeit('onAllyDeath', 'Letzte Ölung', 'Stirbt ein Verbündeter, heilen alle anderen 60 Leben.',
        ['heilung'], function (c) { c.allies().forEach(function (u) { c.heal(u, 60, 'Letzte Ölung'); }); })] },

    /* --- Akt 5: Nacht über Ruberios --- */
    { id: 'blutdiener', name: 'Blutdiener', tags: ['untot', 'front'], hp: 300, atk: 44, def: 12, spd: 30,
      effects: [faehigkeit('onStart', 'Blutzoll', 'Heilt 35 % des verursachten Schadens.', ['heilung'],
        function (c) { c.self.lifesteal += 0.35; })] },
    { id: 'nachtzehrer', name: 'Nachtzehrer', tags: ['untot', 'fernkampf'], hp: 250, atk: 50, def: 8, spd: 38,
      effects: [faehigkeit('onHit', 'Zehrender Biss', 'Jeder Treffer legt 3 Verderbnis an.', ['verderbnis'],
        inflict('verderbnis', 3))] },
    { id: 'gargoyle', name: 'Kathedralen-Gargoyle', tags: ['daemon', 'front'], hp: 340, atk: 42, def: 16, spd: 22,
      effects: [faehigkeit('onDamaged', 'Steinhaut', 'Fügt jedem Angreifer 25 Schaden zu.', ['konter'],
        function (c) { var f = c.foes()[0]; if (f) c.deal(f, 25, 'Steinhaut'); })] },
    { id: 'blutmagier', name: 'Blutmagier', tags: ['untot', 'magier'], hp: 230, atk: 54, def: 7, spd: 34,
      effects: [faehigkeit('onHit', 'Aderlass', '30 % Chance, zusätzlich 4 Gift anzulegen.', ['gift'],
        chance(0.3, inflict('gift', 4)))] },
    { id: 'vampirfuerstin', name: 'Vampirfürstin', tags: ['untot', 'verstaerker'], hp: 280, atk: 52, def: 9, spd: 36,
      effects: [faehigkeit('onKill', 'Erbe der Nacht', 'Jeder erledigte Gegner gibt ihr dauerhaft +12 % Angriff.', [],
        function (c) { scale(c.self, { atk: 0.12 }); })] },
    { id: 'nachtwache', name: 'Nachtwache', tags: ['mensch', 'front'], hp: 320, atk: 43, def: 15, spd: 26,
      effects: [faehigkeit('onStart', 'Wachtturm', 'Startet mit Schild 90.', ['schild'],
        function (c) { c.applyStatus(c.self, 'schild', 90); })] },
    { id: 'saare', name: 'Saare, Klinge des Siebten', tags: ['mensch', 'front'], hp: 360, atk: 50, def: 13, spd: 34,
      effects: [faehigkeit('onStart', 'Rüstungsbrecher', 'Ignoriert die Rüstung des Ziels vollständig.', [],
        function (c) { c.self.pierce = 1; })] },
    { id: 'glenda', name: 'Glenda, Auge des Siebten', tags: ['mensch', 'fernkampf'], hp: 270, atk: 56, def: 8, spd: 42,
      effects: [faehigkeit('onHit', 'Kettenschuss', '30 % Chance, ein zweites Ziel für 50 % zu treffen.', ['flaeche'],
        chance(0.3, function (c) {
          var f = c.foes().filter(function (x) { return x !== c.target; })[0];
          if (f) c.deal(f, c.attacker.atk * 0.5, 'Kettenschuss');
        }))] },
    { id: 'roy_valentine', name: 'Roy Valentine', tags: ['untot', 'verstaerker'], hp: 420, atk: 54, def: 12, spd: 38,
      effects: [
        faehigkeit('onStart', 'Falscher Fürst', 'Gibt allen Verbündeten dauerhaft +18 % Angriff.', [],
          function (c) { c.allies().forEach(function (u) { scale(u, { atk: 0.18 }); }); }),
        faehigkeit('onDeath', 'Blutspiegel', 'Fällt er, heilen alle Verbündeten 120 Leben.', ['heilung'],
          function (c) { c.allies().forEach(function (u) { c.heal(u, 120, 'Blutspiegel'); }); })
      ] },
    { id: 'blutgolem', name: 'Blutgolem', tags: ['untot', 'front'], hp: 400, atk: 40, def: 18, spd: 18,
      effects: [faehigkeit('onDamaged', 'Gerinnung', 'Heilt sich bei jedem erlittenen Treffer um 18 Leben.', ['heilung'],
        function (c) { c.heal(c.self, 18, 'Gerinnung'); })] },

    /* --- Bosse --- */
    { id: 'charybdis', name: 'Charybdis', tags: ['drache', 'front'], boss: true, resistenz: 0.6, hp: 400, atk: 24, def: 6, spd: 26,
      effects: [
        faehigkeit('onHit', 'Windsturm', '30 % Chance, zusätzlich alle anderen Gegner für 60 % zu treffen.',
          ['flaeche'], chance(0.3, function (c) {
            c.foes().forEach(function (f) { if (f !== c.target) c.deal(f, c.attacker.atk * 0.6, 'Windsturm'); });
          })),
        faehigkeit('onDamaged', 'Insektenschwarm', '25 % Chance, dem Angreifer bei jedem erlittenen Treffer 2 Gift anzulegen.',
          ['gift', 'konter'], chance(0.25, function (c) {
            var f = c.foes()[0]; if (f) c.applyStatus(f, 'gift', 2);
          }))
      ] },
    { id: 'clayman', name: 'Clayman', tags: ['daemon', 'magier'], boss: true, resistenz: 0.6, hp: 560, atk: 26, def: 6, spd: 30,
      effects: [
        faehigkeit('onHit', 'Marionettenfäden', 'Jeder Treffer legt 2 Verderbnis an.', ['verderbnis'],
          inflict('verderbnis', 2)),
        faehigkeit('onDamaged', 'Puppenspiel', '10 % Chance, bei einem erlittenen Treffer alle Verbündeten um 18 zu heilen.',
          ['heilung'], chance(0.1, function (c) {
            c.allies().forEach(function (u) { c.heal(u, 18, 'Puppenspiel'); });
          }))
      ] },
    { id: 'hinata', name: 'Hinata Sakaguchi', tags: ['mensch', 'magier'], boss: true, resistenz: 0.6,
      hp: 1150, atk: 52, def: 12, spd: 44,
      effects: [
        faehigkeit('onStart', 'Schmelzklinge', 'Ignoriert die Rüstung des Ziels vollständig.', [],
          function (c) { c.self.pierce = 1; }),
        faehigkeit('onDamaged', 'Reflexion', '40 % Chance, die Hälfte des erlittenen Schadens zurückzuwerfen.',
          ['konter'], chance(0.4, function (c) {
            var f = c.foes()[0]; if (f) c.deal(f, (c.amount || 0) * 0.5, 'Reflexion');
          })),
        faehigkeit('onHit', 'Göttlicher Zorn', '+70 % Schaden gegen Ziele unter der Hälfte ihres Lebens.',
          ['exekution'], function (c) { if (c.target.hp < c.target.maxHp * 0.5) c.dmg *= 1.7; })
      ] },
    { id: 'luminous', name: 'Luminous Valentine', tags: ['untot', 'verstaerker'], boss: true, resistenz: 0.6,
      hp: 1500, atk: 62, def: 14, spd: 42,
      effects: [
        faehigkeit('onStart', 'Blutorden', 'Heilt 40 % des verursachten Schadens.', ['heilung'],
          function (c) { c.self.lifesteal += 0.4; }),
        faehigkeit('onHit', 'Nachtherrschaft', '30 % Chance, zusätzlich alle Gegner für 75 % zu treffen.',
          ['flaeche'], chance(0.3, function (c) {
            c.foes().forEach(function (f) { c.deal(f, c.attacker.atk * 0.75, 'Nachtherrschaft'); });
          })),
        faehigkeit('onDeath', 'Königin der Nacht', 'Steht einmal mit 45 % Leben wieder auf.', ['heilung'],
          function (c) {
            if (c.self._auf) return;
            c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.45);
            c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
          })
      ] },
    { id: 'orklord', name: 'Geld, der Orklord', tags: ['ork', 'front'], boss: true, resistenz: 0.6,
      hp: 700, atk: 30, def: 11, spd: 22,
      effects: [
        faehigkeit('onStart', 'Sternenwolfshunger', 'Beginnt mit Schild 120 und heilt 25 % des verursachten Schadens.',
          ['schild', 'heilung'], function (c) {
            c.applyStatus(c.self, 'schild', 120);
            c.self.lifesteal += 0.25;
          }),
        faehigkeit('onDamaged', 'Fleischwall', 'Heilt sich bei jedem erlittenen Treffer um 2 % seines maximalen Lebens.',
          ['heilung'], function (c) { c.heal(c.self, c.self.maxHp * 0.02, 'Fleischwall'); }),
        faehigkeit('onKill', 'Verschlinger', 'Jeder erlegte Gegner gibt ihm dauerhaft +18 % Angriff.',
          ['exekution'], function (c) { scale(c.self, { atk: 0.18 }); })
      ] },
    { id: 'razen', name: 'Razen der Hofmagier', tags: ['mensch', 'magier'], boss: true, resistenz: 0.6,
      hp: 980, atk: 46, def: 8, spd: 40,
      effects: [
        faehigkeit('onStart', 'Elementarbeherrschung', 'Ignoriert Rüstung vollständig.', [],
          function (c) { c.self.pierce = 1; }),
        faehigkeit('onHit', 'Flammensturm', '35 % Chance, zusätzlich alle Gegner für 65 % zu treffen und 2 Brand anzulegen.',
          ['flaeche', 'brand'], chance(0.35, function (c) {
            c.foes().forEach(function (f) {
              c.deal(f, c.attacker.atk * 0.65, 'Flammensturm');
              c.applyStatus(f, 'brand', 2);
            });
          })),
        faehigkeit('onDeath', 'Seelenübertragung', 'Steht einmal mit 40 % Leben und +25 % Tempo wieder auf.',
          ['heilung'], function (c) {
            if (c.self._auf) return;
            c.self._auf = 1;
            c.self.hp = Math.round(c.self.maxHp * 0.4);
            c.self.spd = Math.round(c.self.spd * 1.25);
            c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
          })
      ] },
    { id: 'milim_boss', name: 'Milim Nava', tags: ['drache', 'verstaerker'], boss: true, resistenz: 0.6, hp: 820, atk: 38, def: 9, spd: 38,
      effects: [
        faehigkeit('onStart', 'Drachenzorn', 'Ignoriert die Rüstung des Ziels vollständig.', [],
          function (c) { c.self.pierce = 1; }),
        faehigkeit('onHit', 'Drachennova', '25 % Chance, zusätzlich alle Gegner für 70 % zu treffen.', ['flaeche'],
          chance(0.25, function (c) {
            c.foes().forEach(function (f) { c.deal(f, c.attacker.atk * 0.7, 'Drachennova'); });
          })),
        faehigkeit('onDamaged', 'Drachenhaut', 'Unter der Hälfte des Lebens einmalig +30 % Angriff und 200 Leben zurück.',
          ['heilung'], function (c) {
            if (!c.self._haut && c.self.hp < c.self.maxHp * 0.5) { c.self._haut = 1; scale(c.self, { atk: 0.3 }); c.heal(c.self, 200, 'Drachenhaut'); }
          })
      ] }
  ];

  /* ---- Begegnungen: was auf einem Kampfknoten wartet ---------------------- */

  /* mult ist der Kalibrierknopf: dieselben Gegner, andere Härte. Ohne ihn müsste
     man 30 Statblöcke einzeln nachziehen, sobald sich die Machtkurve verschiebt.
     dev/balance.js misst, hier wird gedreht. */
  function enc(act, name, units, gold, elite, mult) {
    return { act: act, name: name, units: units, gold: gold, elite: !!elite, mult: mult || 1 };
  }

  var encounters = [
    enc(1, 'Wolfsrudel', ['wolfsjunges', 'wolfsjunges', 'rudelfuehrer'], 18, false, 1.18),
    enc(1, 'Spinnennest', ['giftspinne', 'riesenspinne', 'giftspinne'], 18, false, 1.18),
    enc(1, 'Räuberbande', ['goblinraeuber', 'goblinraeuber', 'goblinschamane'], 16, false, 1.18),
    enc(1, 'Lichtung', ['hornhase', 'hornhase', 'waldschlange'], 16, false, 1.18),
    enc(1, 'Dickicht', ['waldschlange', 'tollwuetiger_baer', 'dryade'], 19, false, 1.18),
    enc(1, 'Alter Hain', ['dryade', 'riesenspinne', 'hornhase', 'goblinraeuber'], 19, false, 1.18),
    enc(1, 'Überfall auf das Goblindorf', ['wolfsjunges', 'wolfsjunges', 'wolfsjunges', 'rudelfuehrer'], 19, false, 1.18),
    enc(1, 'Hornhasen-Lichtung', ['hornhase', 'hornhase', 'hornhase', 'klingentiger'], 18, false, 1.18),
    enc(1, 'Fledermausschlucht', ['riesenfledermaus', 'riesenfledermaus', 'irrlicht'], 18, false, 1.18),
    enc(1, 'Tausendfüßler-Bau', ['tausendfuessler', 'giftspinne', 'tausendfuessler'], 19, false, 1.18),
    enc(1, 'Späher am Waldrand', ['orkspaeher', 'orkspaeher', 'goblinjaeger'], 19, false, 1.18),
    enc(1, 'Der schlammige Pfad', ['sumpfkriecher', 'sumpfkriecher', 'eberrammler'], 19, false, 1.18),
    enc(1, 'Irrlichter im Nebel', ['irrlicht', 'irrlicht', 'waldschlange', 'hornhase'], 19, false, 1.18),
    enc(1, 'Jagdrevier des Klingentigers', ['klingentiger', 'klingentiger', 'dryade'], 21, false, 1.18),

    enc(1, 'Elite: Der Bärenkönig', ['tollwuetiger_baer', 'tollwuetiger_baer', 'rudelfuehrer', 'wolfsjunges'], 36, true, 1.55),
    enc(1, 'Elite: Brutmutter', ['giftspinne', 'giftspinne', 'riesenspinne', 'riesenspinne'], 36, true, 1.55),
    enc(1, 'Elite: Das gestreifte Paar', ['klingentiger', 'klingentiger', 'eberrammler', 'klingentiger'], 38, true, 1.55),
    enc(1, 'Elite: Orkvorhut', ['orkspaeher', 'orkspaeher', 'orkspaeher', 'eberrammler'], 38, true, 1.55),

    enc(2, 'Knochenkammer', ['skelett', 'skelett', 'knochenmagier'], 27, false, 1.85),
    enc(2, 'Einsturzstollen', ['minenkobold', 'minenkobold', 'hoehlentroll'], 27, false, 1.85),
    enc(2, 'Orkvorhut', ['orkkrieger', 'orkkrieger', 'orkhaeuptling'], 29, false, 1.85),
    enc(2, 'Tiefe Nische', ['hoehlenspinne', 'schattenfalter', 'hoehlenspinne'], 27, false, 1.85),
    enc(2, 'Wächterhalle', ['felsgolem', 'skelett', 'knochenmagier'], 29, false, 1.85),
    enc(2, 'Gruft', ['gruftghul', 'gruftghul', 'knochenmagier', 'skelett'], 30, false, 1.85),
    enc(2, 'Die Orkstraße', ['orkkrieger', 'orkkrieger', 'orkschamane', 'orkspaeher'], 29, false, 1.85),
    enc(2, 'Die Grube', ['grubenwurm', 'hoehlenspinne', 'hoehlenspinne'], 29, false, 1.85),
    enc(2, 'Verlassene Zwergenmine', ['minenkobold', 'minenaufseher', 'felsgolem'], 29, false, 1.85),
    enc(2, 'Der brennende Weiler', ['orkkrieger', 'orkschamane', 'orkspaeher'], 27, false, 1.85),
    enc(2, 'Gruft der Bergkönige', ['gruftfledermaus', 'gruftghul', 'knochenmagier', 'skelett'], 30, false, 1.85),
    enc(2, 'Späher des Orklords', ['orkspaeher', 'orkspaeher', 'orkhaeuptling'], 29, false, 1.85),

    enc(2, 'Elite: Vorhut des Orklords', ['orkhaeuptling', 'orkkrieger', 'orkkrieger', 'orkschamane'], 52, true, 2.0),
    enc(2, 'Elite: Der Grubenwurm', ['grubenwurm', 'grubenwurm', 'hoehlentroll'], 52, true, 2.0),
    enc(2, 'Elite: Trollpaar', ['hoehlentroll', 'hoehlentroll', 'felsgolem'], 52, true, 2.0),
    enc(2, 'Elite: Orkhorde', ['orkkrieger', 'orkkrieger', 'orkkrieger', 'orkhaeuptling'], 52, true, 2.0),

    enc(3, 'Vorhut Falmuths', ['ritter', 'ritter', 'bogenschuetze'], 40, false, 1.68),
    enc(3, 'Hofstaat', ['hofmagier', 'hofmagier', 'ritter'], 40, false, 1.68),
    enc(3, 'Heilige Kompanie', ['paladin', 'bogenschuetze', 'heilige_klinge'], 44, false, 1.68),
    enc(3, 'Dämonenpforte', ['daemonenbrut', 'hoellenhund', 'erzdaemon'], 44, false, 1.68),
    enc(3, 'Verfluchtes Feld', ['verderbte_seele', 'blutritter', 'verderbte_seele'], 42, false, 1.68),
    enc(3, 'Letzte Bastion', ['paladin', 'ritter', 'hofmagier', 'bogenschuetze'], 46, false, 1.68),
    enc(3, 'Der Zug der Kreuzritter', ['kreuzritter', 'kreuzritter', 'inquisitor'], 42, false, 1.68),
    enc(3, 'Vor den Toren Falmuths', ['ritter', 'ritter', 'bogenschuetze', 'hofmagier'], 44, false, 1.68),
    enc(3, 'Die weiße Kapelle', ['paladin', 'inquisitor', 'kreuzritter'], 44, false, 1.68),
    enc(3, 'Blutmond', ['gefallener_engel', 'daemonenbrut', 'hoellenhund'], 44, false, 1.68),
    enc(3, 'Das Feld der Verräter', ['verderbte_seele', 'gefallener_engel', 'blutritter'], 42, false, 1.68),
    enc(3, 'Dämonenpakt', ['erzdaemon', 'daemonenbrut', 'gefallener_engel'], 44, false, 1.68),

    enc(3, 'Elite: Heilige Inquisition', ['inquisitor', 'inquisitor', 'paladin', 'kreuzritter'], 72, true, 1.85),
    enc(3, 'Elite: Der gefallene Chor', ['gefallener_engel', 'gefallener_engel', 'erzdaemon', 'blutritter'], 72, true, 1.85),
    enc(3, 'Elite: Kreuzzug', ['paladin', 'paladin', 'heilige_klinge', 'hofmagier'], 72, true, 1.85),
    enc(3, 'Elite: Dämonenrat', ['erzdaemon', 'erzdaemon', 'blutritter', 'hoellenhund'], 72, true, 1.85),

    enc(4, 'Vorposten der Kirche', ['tempelritter', 'tempelritter', 'heilige_schuetzin'], 58, false, 1.8),
    enc(4, 'Prozession', ['lichtkleriker', 'tempelritter', 'kantor'], 58, false, 1.8),
    enc(4, 'Das geweihte Tor', ['glaubenswaechter', 'reliquienwaechter', 'exorzist'], 60, false, 1.8),
    enc(4, 'Jagd auf Ketzer', ['ketzerjaeger', 'ketzerjaeger', 'heilige_schuetzin'], 58, false, 1.8),
    enc(4, 'Bußkapelle', ['bussritter', 'bussritter', 'lichtkleriker'], 58, false, 1.8),
    enc(4, 'Greifenhorst', ['geweihter_greif', 'geweihter_greif', 'heilige_schuetzin'], 60, false, 1.8),
    enc(4, 'Die weiße Straße', ['tempelritter', 'glaubenswaechter', 'kantor', 'heilige_schuetzin'], 62, false, 1.8),
    enc(4, 'Reliquienzug', ['reliquienwaechter', 'reliquienwaechter', 'exorzist'], 60, false, 1.8),
    enc(4, 'Chor der Läuterung', ['kantor', 'lichtkleriker', 'ketzerjaeger'], 58, false, 1.8),
    enc(4, 'Wachablösung', ['glaubenswaechter', 'tempelritter', 'bussritter'], 60, false, 1.8),
    enc(4, 'Der Kreuzgang', ['exorzist', 'ketzerjaeger', 'tempelritter', 'geweihter_greif'], 62, false, 1.8),
    enc(4, 'Vor dem Konzil', ['ketzerjaeger', 'kantor', 'glaubenswaechter', 'lichtkleriker'], 62, false, 1.8),

    enc(4, 'Elite: Die Heiligen Ritter', ['tempelritter', 'tempelritter', 'glaubenswaechter', 'kantor'], 95, true, 1.95),
    enc(4, 'Elite: Inquisitionsgericht', ['ketzerjaeger', 'ketzerjaeger', 'exorzist', 'bussritter'], 95, true, 1.95),
    enc(4, 'Elite: Der Reliquienschrein', ['reliquienwaechter', 'reliquienwaechter', 'glaubenswaechter', 'lichtkleriker'], 95, true, 1.95),
    enc(4, 'Elite: Greifenschwarm', ['geweihter_greif', 'geweihter_greif', 'geweihter_greif', 'heilige_schuetzin'], 98, true, 1.95),

    enc(5, 'Blutzoll am Stadttor', ['blutdiener', 'blutdiener', 'nachtzehrer'], 78, false, 1.75),
    enc(5, 'Gargoyle-Terrasse', ['gargoyle', 'gargoyle', 'blutmagier'], 78, false, 1.75),
    enc(5, 'Die Krypta', ['blutgolem', 'nachtzehrer', 'blutmagier'], 80, false, 1.75),
    enc(5, 'Nachtwache am Wall', ['nachtwache', 'nachtwache', 'glenda'], 80, false, 1.75),
    enc(5, 'Hof der Fürstin', ['vampirfuerstin', 'blutdiener', 'nachtzehrer'], 80, false, 1.75),
    enc(5, 'Klinge des Siebten', ['saare', 'nachtwache', 'blutmagier'], 82, false, 1.75),
    enc(5, 'Blutmesse', ['blutmagier', 'blutmagier', 'blutdiener', 'nachtzehrer'], 82, false, 1.75),
    enc(5, 'Der steinerne Chor', ['gargoyle', 'blutgolem', 'nachtwache'], 80, false, 1.75),
    enc(5, 'Auge des Siebten', ['glenda', 'nachtzehrer', 'nachtwache'], 80, false, 1.75),
    enc(5, 'Die lange Treppe', ['blutdiener', 'gargoyle', 'vampirfuerstin'], 82, false, 1.75),
    enc(5, 'Thronvorhalle', ['nachtwache', 'saare', 'blutgolem'], 84, false, 1.75),
    enc(5, 'Schattenkabinett', ['vampirfuerstin', 'blutmagier', 'glenda'], 84, false, 1.75),

    enc(5, 'Elite: Die Sieben Tage', ['saare', 'glenda', 'nachtwache', 'blutmagier'], 130, true, 1.9),
    enc(5, 'Elite: Roys Hofstaat', ['roy_valentine', 'vampirfuerstin', 'blutdiener', 'nachtzehrer'], 130, true, 1.9),
    enc(5, 'Elite: Steinerne Wacht', ['gargoyle', 'gargoyle', 'blutgolem', 'blutgolem'], 130, true, 1.9),
    enc(5, 'Elite: Blutmond über Ruberios', ['vampirfuerstin', 'vampirfuerstin', 'blutmagier', 'saare'], 135, true, 1.9)
  ];

  /* Gemeinsamer Regler für alle Bosse. Getunt wurde zuerst gegen einen von Hand
     gebauten Referenztrupp — der war stärker als das, womit ein Spieler beim
     Boss wirklich ankommt, und die Siegquote fiel gemessen von 49 auf 14 %.
     Nachgezogen wird deshalb hier, gegen `node dev/balance.js`. */
  var BOSS_HAERTE = 0.6;      // gemessen: 49 % Siege (frisch)

  /* Bosse treten allein an — kein Gefolge, das den Schaden verteilt. Dafür ist
     `hpMult` da: das Leben ersetzt die weggefallenen Begleiter, der Angriff
     nicht. Ein Boss mit dreifachem Angriff wäre kein Boss, sondern ein Würfel.

     Zwei Pools statt fünf fester Bosse: pro Run wird je einer gezogen, also
     sieht kein Run dieselbe Paarung zweimal. */
  var bosses = [
    { id: 'b_charybdis', pool: 1, name: 'Charybdis', units: ['charybdis'], gold: 140, mult: 1.5, hpMult: 3 },
    { id: 'b_clayman', pool: 1, name: 'Clayman', units: ['clayman'], gold: 150, mult: 1.44, hpMult: 2.73 },
    { id: 'b_milim', pool: 1, name: 'Milim Nava', units: ['milim_boss'], gold: 170, mult: 0.71, hpMult: 1.25 },
    { id: 'b_orklord', pool: 1, name: 'Geld, der Orklord', units: ['orklord'], gold: 150, mult: 1.37, hpMult: 2.46 },
    { id: 'b_hinata', pool: 2, name: 'Hinata Sakaguchi', units: ['hinata'], gold: 340, mult: 1.62, hpMult: 3.08 },
    { id: 'b_luminous', pool: 2, name: 'Luminous Valentine', units: ['luminous'], gold: 400, mult: 1.19, hpMult: 2.13 },
    { id: 'b_razen', pool: 2, name: 'Razen der Hofmagier', units: ['razen'], gold: 320, mult: 1.28, hpMult: 2.43 },
    { id: 'b_roy', pool: 2, name: 'Roy Valentine', units: ['roy_valentine'], gold: 330, mult: 2.66, hpMult: 5.32 }
  ];

  /* ---- Ereignisse: api liefert run.js, damit die Daten dumm bleiben ------- */

  /* Ereignisse ohne akt-Feld können überall auftauchen. Die Akt-1-Ereignisse
     erzählen den Anfang: Jura-Wald, das versiegelte Höhlengrab, die ersten
     Verbündeten. */
  var events = [
    { id: 'wandernder_haendler', name: 'Wandernder Händler',
      text: 'Ein Kobold zieht einen Karren voller Krempel hinter sich her. „Alles echt, alles günstig!"',
      options: [
        { text: '80 Gold zahlen für ein zufälliges Relikt (wirkt auf den ganzen Trupp)', can: function (r) { return r.gold >= 80; },
          fn: function (r, api) { r.gold -= 80; api.grantRelic(); } },
        { text: 'Weiterziehen (+30 Gold gespart bleibt gespart)', fn: function (r) { r.gold += 30; } }
      ] },
    { id: 'heisse_quelle', name: 'Heiße Quelle',
      text: 'Dampf steigt aus dem Fels. Die Truppe schaut dich erwartungsvoll an.',
      options: [
        { text: 'Rasten — eine zufällige Einheit erhält dauerhaft +25 Leben', fn: function (r, api) { api.buffRandom({ hp: 25 }); } },
        { text: 'Weitermarschieren — +50 Gold', fn: function (r) { r.gold += 50; } }
      ] },
    { id: 'magicule_ader', name: 'Magicule-Ader',
      text: 'Der Boden glimmt. Rohe Magie sammelt sich in der Senke.',
      options: [
        { text: '+60 Magicule', fn: function (r) { r.magicules += 60; } },
        { text: 'Anzapfen: +120 Magicule, dafür verliert eine zufällige Einheit dauerhaft 20 Leben',
          fn: function (r, api) { r.magicules += 120; api.buffRandom({ hp: -20 }); } }
      ] },
    { id: 'gefallener_krieger', name: 'Gefallener Krieger',
      text: 'Ein Sterbender bittet um ein Ende — und bietet dir seine Waffe an.',
      options: [
        { text: 'Waffe nehmen — zufällige Ausrüstung in den Beutel', fn: function (r, api) { api.grantItem(); } },
        { text: 'Ihn heilen — eine zufällige Einheit einer noch freien Art schließt sich an', fn: function (r, api) { api.grantUnit(); } }
      ] },
    { id: 'verlassenes_lager', name: 'Verlassenes Lager',
      text: 'Erloschene Feuerstelle, umgeworfene Kisten. Jemand ist in Eile aufgebrochen.',
      options: [
        { text: 'Durchsuchen: +70 Gold', fn: function (r) { r.gold += 70; } },
        { text: 'Vorräte mitnehmen: +40 Magicule und dauerhaft +15 Leben für den ganzen Trupp',
          fn: function (r, api) { r.magicules += 40; r.team.forEach(function (m) { api.buffUnit(m, { hp: 15 }); }); } }
      ] },
    { id: 'schrein', name: 'Verfallener Schrein',
      text: 'Ein Altar aus der Zeit vor dem Wald. Er verlangt etwas.',
      options: [
        { text: '100 Magicule opfern für ein zufälliges Relikt', can: function (r) { return r.magicules >= 100; },
          fn: function (r, api) { r.magicules -= 100; api.grantRelic(); } },
        { text: '60 Gold opfern: eine zufällige Einheit erhält dauerhaft +6 Angriff', can: function (r) { return r.gold >= 60; },
          fn: function (r, api) { r.gold -= 60; api.buffRandom({ atk: 6 }); } },
        { text: 'Nichts anrühren', fn: function () {} }
      ] },
    { id: 'sklavenkarawane', name: 'Karawane in Not',
      text: 'Räuber haben eine Karawane überfallen. Die Überlebenden brauchen Hilfe.',
      options: [
        { text: 'Helfen — eine zufällige Einheit einer noch freien Art schließt sich an', fn: function (r, api) { api.grantUnit(); } },
        { text: 'Die Ladung nehmen: +90 Gold', fn: function (r) { r.gold += 90; } }
      ] },
    { id: 'sturm', name: 'Magiesturm',
      text: 'Wilde Magicule fegen über die Ebene. Wer sich hineinstellt, verändert sich.',
      options: [
        { text: 'Hindurchgehen: eine zufällige Einheit dauerhaft +8 Angriff, aber −15 Leben',
          fn: function (r, api) { api.buffRandom({ atk: 8, hp: -15 }); } },
        { text: 'Umgehen: +30 Magicule', fn: function (r) { r.magicules += 30; } }
      ] },
    { id: 'schmiede', name: 'Zwergenschmiede',
      text: 'Ein Zwerg hämmert auf glühenden Stahl ein und sieht kaum auf.',
      options: [
        { text: '50 Gold: zufällige Ausrüstung in den Beutel', can: function (r) { return r.gold >= 50; },
          fn: function (r, api) { r.gold -= 50; api.grantItem(); } },
        { text: '25 Gold: eine zufällige Einheit dauerhaft +3 Rüstung', can: function (r) { return r.gold >= 25; },
          fn: function (r, api) { r.gold -= 25; api.buffRandom({ def: 3 }); } }
      ] },
    /* --- Akt 1: der Jura-Wald --- */
    { id: 'versiegelte_hoehle', act: 1, name: 'Die versiegelte Höhle',
      text: 'Tief im Fels liegt ein Sturm hinter einem Siegel. Etwas darin lacht — seit dreihundert Jahren.',
      options: [
        { text: 'Mit dem Gefangenen reden: +150 Magicule', fn: function (r) { r.magicules += 150; } },
        { text: 'Am Siegel zerren: ein zufälliges Relikt, aber eine zufällige Einheit verliert dauerhaft 25 Leben',
          fn: function (r, api) { api.grantRelic(); api.buffRandom({ hp: -25 }); } },
        { text: 'Die Höhle in Ruhe lassen: +70 Gold', fn: function (r) { r.gold += 70; } }
      ] },
    { id: 'namensgebung', act: 1, name: 'Ein Volk ohne Namen',
      text: 'Ein Goblindorf hat die Nacht überlebt. Der Älteste kniet nieder: „Gebt uns Namen, Meister."',
      options: [
        { text: 'Namen geben: eine zufällige Einheit einer freien Art schließt sich an, kostet 60 Magicule',
          can: function (r) { return r.magicules >= 60; },
          fn: function (r, api) { r.magicules -= 60; api.grantUnit(); } },
        { text: 'Nur Vorräte annehmen: +80 Gold', fn: function (r) { r.gold += 80; } }
      ] },
    { id: 'sturmwolf_rudel', act: 1, name: 'Das Rudel vor der Höhle',
      text: 'Ein Sturmwolf-Rudel hat euch eingekreist. Der Anführer knurrt, greift aber nicht an.',
      options: [
        { text: 'Den Anführer niederstarren: eine zufällige Einheit erhält dauerhaft +5 Angriff und +3 Tempo',
          fn: function (r, api) { api.buffRandom({ atk: 5, spd: 3 }); } },
        { text: 'Fleisch opfern: −40 Gold, dafür +90 Magicule', can: function (r) { return r.gold >= 40; },
          fn: function (r) { r.gold -= 40; r.magicules += 90; } }
      ] },
    { id: 'zwergenschmied', act: 1, name: 'Ein Zwerg im Exil',
      text: 'Ein verbannter Schmied aus Dwargon hämmert an einem Wanderofen. Er mustert eure Ausrüstung mit Verachtung.',
      options: [
        { text: 'Ihn arbeiten lassen: zufällige Ausrüstung in den Beutel', fn: function (r, api) { api.grantItem(); } },
        { text: 'Ihm 40 Gold für eine Lehre zahlen: eine zufällige Einheit erhält dauerhaft +4 Rüstung',
          can: function (r) { return r.gold >= 40; },
          fn: function (r, api) { r.gold -= 40; api.buffRandom({ def: 4 }); } }
      ] },
    { id: 'echsenboten', act: 1, name: 'Boten vom Sumpf',
      text: 'Echsenmenschen mit Federschmuck bringen eine Warnung: Orks marschieren nach Norden. Zehntausende.',
      options: [
        { text: 'Die Warnung ernst nehmen: +100 Gold für Vorbereitungen', fn: function (r) { r.gold += 100; } },
        { text: 'Ein Bündnis schließen: eine zufällige Einheit einer freien Art schließt sich an',
          fn: function (r, api) { api.grantUnit(); } }
      ] },
    { id: 'ogerdorf', act: 1, name: 'Asche eines Ogerdorfs',
      text: 'Verbrannte Pfähle, kein Überlebender. In der Glut steckt eine Klinge, die noch warm ist.',
      options: [
        { text: 'Die Klinge nehmen: zufällige Ausrüstung', fn: function (r, api) { api.grantItem(); } },
        { text: 'Die Toten bestatten: +120 Magicule', fn: function (r) { r.magicules += 120; } },
        { text: 'Der Spur folgen: +60 Gold und +60 Magicule',
          fn: function (r) { r.gold += 60; r.magicules += 60; } }
      ] },
    { id: 'hornhasen_jagd', act: 1, name: 'Hornhasen-Jagd',
      text: 'Ein ganzer Schwarm Hornhasen. Zäh, schnell — und ausgezeichnetes Fleisch.',
      options: [
        { text: 'Jagen: +70 Gold', fn: function (r) { r.gold += 70; } },
        { text: 'Den Trupp durchfüttern: dauerhaft +20 Leben für den ganzen Trupp',
          fn: function (r, api) { r.team.forEach(function (m) { api.buffUnit(m, { hp: 20 }); }); } }
      ] },

    { id: 'ritus_der_namen', act: 1, name: 'Der Ritus der Namensgebung',
      text: 'Ein Schrein aus der Zeit vor dem Wald. Wer hier einen Namen empfängt, wird ein anderer — Namensgebung kostet den Gebenden Kraft, nicht den Empfänger.',
      options: [
        { text: 'Den Ritus vollziehen: die schwächste Einheit steigt gratis einen Rang auf',
          fn: function (r, api) { api.freierRang(); } },
        { text: 'Die Kraft für sich behalten: +160 Magicule', fn: function (r) { r.magicules += 160; } }
      ] },
    { id: 'segen_des_sturms', name: 'Segen des Sturms',
      text: 'Über euch bricht ein Magiesturm los. Wer sich hineinstellt, kommt verändert heraus — oder gar nicht.',
      options: [
        { text: 'Hineingehen: die schwächste Einheit steigt gratis einen Rang auf, verliert aber dauerhaft 20 Leben',
          fn: function (r, api) { api.freierRang(); api.buffRandom({ hp: -20 }); } },
        { text: 'Abwarten: +90 Gold', fn: function (r) { r.gold += 90; } }
      ] },
    { id: 'lehrmeister_ereignis', name: 'Ein alter Lehrmeister',
      text: 'Ein grauhaariger Schwertkämpfer sitzt am Weg und beobachtet euren Trupp mit schmalen Augen. „Ihr kämpft schlampig."',
      options: [
        { text: '80 Gold für eine Lektion: die schwächste Einheit steigt gratis einen Rang auf',
          can: function (r) { return r.gold >= 80; },
          fn: function (r, api) { r.gold -= 80; api.freierRang(); } },
        { text: 'Nur zuhören: zufällige Ausrüstung', fn: function (r, api) { api.grantItem(); } }
      ] },

    /* --- Akt 2: die Orkarmee --- */
    { id: 'orkarmee', act: 2, name: 'Zehntausend Schritte',
      text: 'Vom Höhenzug aus seht ihr sie: eine Orkarmee ohne Ende, die alles frisst, was ihr begegnet. Ihr Anführer trägt eine Krone aus Knochen.',
      options: [
        { text: 'Der Armee ausweichen: +140 Gold für den Umweg', fn: function (r) { r.gold += 140; } },
        { text: 'Die Nachhut abfangen: +180 Magicule, eine zufällige Einheit verliert dauerhaft 25 Leben',
          fn: function (r, api) { r.magicules += 180; api.buffRandom({ hp: -25 }); } }
      ] },
    { id: 'zwergenmine', act: 2, name: 'Die stillgelegte Mine',
      text: 'Dwargons alte Stollen. In der Tiefe glimmt Erz, das noch nie ein Hammer berührt hat.',
      options: [
        { text: 'Tief graben: zufällige Ausrüstung und +60 Magicule',
          fn: function (r, api) { api.grantItem(); r.magicules += 60; } },
        { text: 'Nur die Oberfläche abtragen: +130 Gold', fn: function (r) { r.gold += 130; } }
      ] },
    { id: 'gefangener', act: 2, name: 'Ein Gefangener der Orks',
      text: 'In einem umgestürzten Käfig hockt jemand, der seit Tagen nichts getrunken hat — und trotzdem grinst.',
      options: [
        { text: 'Befreien: eine zufällige Einheit einer freien Art schließt sich an',
          fn: function (r, api) { api.grantUnit(); } },
        { text: 'Ausfragen und weiterziehen: +110 Magicule', fn: function (r) { r.magicules += 110; } }
      ] },

    /* --- Akt 3: Falmuth und die Dämonen --- */
    { id: 'daemonenangebot', act: 3, name: 'Ein Angebot aus dem Schatten',
      text: 'Eine Gestalt im Frack verbeugt sich tief. „Ich diene dem Stärkeren. Zeigt mir, dass Ihr das seid — oder nehmt einfach, was ich biete."',
      options: [
        { text: 'Den Pakt annehmen: die schwächste Einheit steigt gratis einen Rang auf, der Trupp verliert 60 Gold',
          can: function (r) { return r.gold >= 60; },
          fn: function (r, api) { r.gold -= 60; api.freierRang(); } },
        { text: 'Ablehnen und die Klinge nehmen: zufällige Ausrüstung', fn: function (r, api) { api.grantItem(); } },
        { text: 'Ihn fortschicken: +200 Magicule', fn: function (r) { r.magicules += 200; } }
      ] },
    { id: 'botschafterin', act: 3, name: 'Die Botschafterin',
      text: 'Eine Frau in weißer Rüstung wartet allein auf der Straße. Sie zieht nicht. Sie sagt nur: „Kehrt um."',
      options: [
        { text: 'Umkehren und einen Umweg nehmen: +150 Gold', fn: function (r) { r.gold += 150; } },
        { text: 'An ihr vorbeigehen: +100 Magicule und ein zufälliges Relikt',
          fn: function (r, api) { r.magicules += 100; api.grantRelic(); } }
      ] },
    { id: 'nachtlager', act: 3, name: 'Nachtlager vor der Hauptstadt',
      text: 'Morgen fällt die Entscheidung. Heute Nacht kann noch geschliffen, geschmiedet oder geschlafen werden.',
      options: [
        { text: 'Schleifen: eine zufällige Einheit erhält dauerhaft +8 Angriff',
          fn: function (r, api) { api.buffRandom({ atk: 8 }); } },
        { text: 'Schmieden: zufällige Ausrüstung', fn: function (r, api) { api.grantItem(); } },
        { text: 'Schlafen: dauerhaft +25 Leben für den ganzen Trupp',
          fn: function (r, api) { r.team.forEach(function (m) { api.buffUnit(m, { hp: 25 }); }); } }
      ] },

    /* --- Akt 4: die Westliche Heilige Kirche --- */
    { id: 'weisse_botin', act: 4, name: 'Die Botin in Weiß',
      text: 'Eine Ordensschwester wartet an der Wegkreuzung. „Kehrt um, und niemand muss sterben. Geht weiter, und die Heiligen Ritter erwarten euch."',
      options: [
        { text: 'Umkehren und den langen Weg nehmen: +260 Gold', fn: function (r) { r.gold += 260; } },
        { text: 'Die Warnung mitnehmen: +240 Magicule', fn: function (r) { r.magicules += 240; } },
        { text: 'Ihr das Schwert abnehmen: zufällige Ausrüstung, eine zufällige Einheit verliert dauerhaft 30 Leben',
          fn: function (r, api) { api.grantItem(); api.buffRandom({ hp: -30 }); } }
      ] },
    { id: 'gruendungsfest', act: 4, name: 'Das Gründungsfest',
      text: 'In Tempest wird gefeiert, während im Westen die Glocken läuten. Zwischen zwei Kriegen liegt ein einziger ruhiger Abend.',
      options: [
        { text: 'Mitfeiern: dauerhaft +35 Leben für den ganzen Trupp',
          fn: function (r, api) { r.team.forEach(function (m) { api.buffUnit(m, { hp: 35 }); }); } },
        { text: 'Die Schmiede öffnen lassen: zufällige Ausrüstung', fn: function (r, api) { api.grantItem(); } },
        { text: 'Die Nacht durcharbeiten: die schwächste Einheit steigt gratis einen Rang auf',
          fn: function (r, api) { api.freierRang(); } }
      ] },
    { id: 'beichtstuhl', act: 4, name: 'Ein leerer Beichtstuhl',
      text: 'Die Kapelle ist verlassen, das Gitter offen. Jemand hat hier etwas hinterlassen, das nicht für Menschen gedacht war.',
      options: [
        { text: 'Die Reliquie nehmen: ein zufälliges Relikt', fn: function (r, api) { api.grantRelic(); } },
        { text: 'Den Opferstock leeren: +200 Gold', fn: function (r) { r.gold += 200; } },
        { text: 'Beten und weitergehen: eine zufällige Einheit dauerhaft +10 Angriff und +4 Rüstung',
          fn: function (r, api) { api.buffRandom({ atk: 10, def: 4 }); } }
      ] },
    { id: 'gefallener_ritter', act: 4, name: 'Der gefallene Ritter',
      text: 'Ein Tempelritter liegt im Straßengraben, die Rüstung aufgerissen. Er lebt noch. „Nicht … die Kirche. Etwas anderes war das."',
      options: [
        { text: 'Ihn heilen und ausfragen: +280 Magicule', fn: function (r) { r.magicules += 280; } },
        { text: 'Seine Rüstung nehmen: zufällige Ausrüstung', fn: function (r, api) { api.grantItem(); } }
      ] },

    /* --- Akt 5: Nacht über Ruberios --- */
    { id: 'blutpakt', act: 5, name: 'Ein Pakt bei Kerzenlicht',
      text: 'Eine Fürstin der Nacht schenkt zwei Gläser ein. „Ihr wollt zu Ihr? Dann trinkt. Was danach kommt, ist Verhandlung."',
      options: [
        { text: 'Trinken: die schwächste Einheit steigt gratis einen Rang auf, der Trupp verliert 40 Leben je Einheit',
          fn: function (r, api) { api.freierRang(); r.team.forEach(function (m) { api.buffUnit(m, { hp: -40 }); }); } },
        { text: 'Höflich ablehnen: ein zufälliges Relikt', fn: function (r, api) { api.grantRelic(); } },
        { text: 'Das Glas umstoßen: +350 Magicule', fn: function (r) { r.magicules += 350; } }
      ] },
    { id: 'siebte_nacht', act: 5, name: 'Die Sieben Tage',
      text: 'Sieben Namen stehen an der Kathedralenwand, sechs davon durchgestrichen. Der siebte ist frisch geschrieben.',
      options: [
        { text: 'Den Namen lesen und sich vorbereiten: eine zufällige Einheit dauerhaft +14 Angriff',
          fn: function (r, api) { api.buffRandom({ atk: 14 }); } },
        { text: 'Die Wand einreißen: ein zufälliges Relikt und −80 Gold',
          can: function (r) { return r.gold >= 80; },
          fn: function (r, api) { r.gold -= 80; api.grantRelic(); } },
        { text: 'Weitergehen, ohne stehenzubleiben: +300 Gold', fn: function (r) { r.gold += 300; } }
      ] },
    { id: 'kathedralendach', act: 5, name: 'Auf dem Kathedralendach',
      text: 'Von hier oben sieht man die ganze Stadt — und dass in jedem Fenster jemand zurückschaut.',
      options: [
        { text: 'Die Wachen zählen: der ganze Trupp dauerhaft +6 Tempo',
          fn: function (r, api) { r.team.forEach(function (m) { api.buffUnit(m, { spd: 6 }); }); } },
        { text: 'Rasten, solange es geht: dauerhaft +45 Leben für den ganzen Trupp',
          fn: function (r, api) { r.team.forEach(function (m) { api.buffUnit(m, { hp: 45 }); }); } },
        { text: 'Sofort hinunter: +250 Gold und +150 Magicule',
          fn: function (r) { r.gold += 250; r.magicules += 150; } }
      ] },
    { id: 'letztes_licht', act: 5, name: 'Das letzte Licht',
      text: 'Vor dem Thronsaal brennt eine einzige Kerze. Wer sie löscht, geht im Dunkeln weiter — wer sie brennen lässt, wird gesehen.',
      options: [
        { text: 'Löschen: eine zufällige Einheit dauerhaft +12 Angriff und +6 Tempo',
          fn: function (r, api) { api.buffRandom({ atk: 12, spd: 6 }); } },
        { text: 'Brennen lassen: zufällige Ausrüstung und +200 Magicule',
          fn: function (r, api) { api.grantItem(); r.magicules += 200; } }
      ] },

    { id: 'alter_baum', name: 'Baum der Namen',
      text: 'In die Rinde sind Namen geritzt, die niemand mehr kennt.',
      options: [
        { text: 'Einen Namen lesen: +80 Magicule', fn: function (r) { r.magicules += 80; } },
        { text: 'Einen Namen einritzen: eine zufällige Einheit dauerhaft +20 Leben und +3 Angriff',
          fn: function (r, api) { api.buffRandom({ hp: 20, atk: 3 }); } }
      ] }
  ];

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* Auch Gegner setzen aktive Fähigkeiten ein — sonst schlägt der Spieler mit
     Fähigkeiten gegen Gegner, die nur normal zuschlagen. Eine Tabelle statt
     eines Feldes an 33 Objekten. */
  var AKTIV = {
    wolfsjunges: 'hetzjagd', giftspinne: 'giftstoss', riesenspinne: 'wuchtschlag',
    goblinraeuber: 'doppelhieb', goblinschamane: 'fluchstoss', hornhase: 'hetzjagd',
    waldschlange: 'giftstoss', tollwuetiger_baer: 'wuchtschlag', rudelfuehrer: 'ansporn',
    dryade: 'heilwelle',
    skelett: 'wuchtschlag', gruftghul: 'aderlass', knochenmagier: 'fluchstoss',
    hoehlentroll: 'wuchtschlag', felsgolem: 'panzerbruch', minenkobold: 'doppelhieb',
    orkkrieger: 'wuchtschlag', orkhaeuptling: 'ansporn', schattenfalter: 'betaeubung',
    hoehlenspinne: 'giftstoss',
    ritter: 'panzerbruch', bogenschuetze: 'hetzjagd', hofmagier: 'fluchstoss',
    paladin: 'schildruf', heilige_klinge: 'hinrichtung', verderbte_seele: 'fluchstoss',
    daemonenbrut: 'wuchtschlag', hoellenhund: 'flammenstoss', blutritter: 'aderlass',
    erzdaemon: 'seelenschlag',
    riesenfledermaus: 'hetzjagd', tausendfuessler: 'wuchtschlag', klingentiger: 'doppelhieb',
    eberrammler: 'wuchtschlag', goblinjaeger: 'hetzjagd', sumpfkriecher: 'aderlass',
    orkspaeher: 'hetzjagd', irrlicht: 'flammenstoss',
    orkschamane: 'ansporn', grubenwurm: 'wuchtschlag', minenaufseher: 'doppelhieb',
    gruftfledermaus: 'aderlass',
    kreuzritter: 'panzerbruch', inquisitor: 'fluchstoss', gefallener_engel: 'rundumschlag',
    tempelritter: 'schildstoss', heilige_schuetzin: 'brandmal', exorzist: 'lebensbund',
    bussritter: 'vergeltung', kantor: 'ansporn', reliquienwaechter: 'trutzwall',
    geweihter_greif: 'blitzfolge', glaubenswaechter: 'schildruf', ketzerjaeger: 'hinrichtung',
    lichtkleriker: 'heilwelle',
    blutdiener: 'aderlass', nachtzehrer: 'fluchmal', gargoyle: 'dornenstoss',
    blutmagier: 'seuchenstoss', vampirfuerstin: 'kopfgeld', nachtwache: 'schildstoss',
    saare: 'panzerbruch', glenda: 'rundumschlag', roy_valentine: 'sturmlauf',
    blutgolem: 'wuchtschlag',
    charybdis: ['rundumschlag', 'wuchtschlag'],
    clayman: ['fluchstoss', 'seelenschlag'],
    milim_boss: ['wuchtschlag', 'rundumschlag'],
    orklord: ['wuchtschlag', 'schildstoss', 'trutzwall'],
    razen: ['feuersbrunst', 'frostnova', 'seelenschlag'],
    hinata: ['hinrichtung', 'blitzfolge', 'panzerbruch'],
    luminous: ['rundumschlag', 'aderlass', 'frostnova']
  };
  function aktiveVon(id) {
    var v = AKTIV[id];
    if (!v) return [];
    return (typeof v === 'string' ? [v] : v).map(function (a) { return root.Abilities.get(a); })
      .filter(Boolean);
  }

  /* Begegnung -> fertige Kampfdefinitionen, mit mult skaliert. */
  function build(e, zusatz) {
    return e.units.map(function (id) {
      var d = byId(enemies, id);
      var m = (e.mult || 1) * (zusatz || 1);
      return {
        id: d.id, name: d.name, tags: d.tags, effects: d.effects, actives: aktiveVon(id),
        resistenz: d.resistenz || 0, enrage: d.boss ? (e.enrage || 0.06) : 0,
        hp: Math.round(d.hp * m * (e.hpMult || 1) * (d.boss ? BOSS_HAERTE : 1)),
        atk: Math.round(d.atk * m * (d.boss ? BOSS_HAERTE : 1)),
        def: Math.round(d.def * m), spd: d.spd
      };
    });
  }

  root.Enemies = {
    all: enemies, encounters: encounters, bosses: bosses, events: events,
    build: build,
    get: function (id) { return byId(enemies, id); },
    forAct: function (a) { return encounters.filter(function (e) { return e.act === a && !e.elite; }); },
    /* Aktgebundene Ereignisse plus die aktübergreifenden. */
    eventsForAct: function (a) { return events.filter(function (e) { return !e.act || e.act === a; }); },
    elitesForAct: function (a) { return encounters.filter(function (e) { return e.act === a && e.elite; }); },
    BOSS_HAERTE: BOSS_HAERTE,
    bossPool: function (n) { return bosses.filter(function (b) { return b.pool === n; }); },
    bossById: function (id) { return byId(bosses, id); }
  };
})(globalThis);
