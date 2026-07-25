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
    enc(1, 'Wolfsrudel', ['wolfsjunges', 'wolfsjunges', 'rudelfuehrer'], 18, false, 1.08),
    enc(1, 'Spinnennest', ['giftspinne', 'riesenspinne', 'giftspinne'], 18, false, 1.08),
    enc(1, 'Räuberbande', ['goblinraeuber', 'goblinraeuber', 'goblinschamane'], 16, false, 1.08),
    enc(1, 'Lichtung', ['hornhase', 'hornhase', 'waldschlange'], 16, false, 1.08),
    enc(1, 'Dickicht', ['waldschlange', 'tollwuetiger_baer', 'dryade'], 19, false, 1.08),
    enc(1, 'Alter Hain', ['dryade', 'riesenspinne', 'hornhase', 'goblinraeuber'], 19, false, 1.08),
    enc(1, 'Überfall auf das Goblindorf', ['wolfsjunges', 'wolfsjunges', 'wolfsjunges', 'rudelfuehrer'], 19, false, 1.08),
    enc(1, 'Hornhasen-Lichtung', ['hornhase', 'hornhase', 'hornhase', 'klingentiger'], 18, false, 1.08),
    enc(1, 'Fledermausschlucht', ['riesenfledermaus', 'riesenfledermaus', 'irrlicht'], 18, false, 1.08),
    enc(1, 'Tausendfüßler-Bau', ['tausendfuessler', 'giftspinne', 'tausendfuessler'], 19, false, 1.08),
    enc(1, 'Späher am Waldrand', ['orkspaeher', 'orkspaeher', 'goblinjaeger'], 19, false, 1.08),
    enc(1, 'Der schlammige Pfad', ['sumpfkriecher', 'sumpfkriecher', 'eberrammler'], 19, false, 1.08),
    enc(1, 'Irrlichter im Nebel', ['irrlicht', 'irrlicht', 'waldschlange', 'hornhase'], 19, false, 1.08),
    enc(1, 'Jagdrevier des Klingentigers', ['klingentiger', 'klingentiger', 'dryade'], 21, false, 1.08),

    enc(1, 'Elite: Der Bärenkönig', ['tollwuetiger_baer', 'tollwuetiger_baer', 'rudelfuehrer', 'wolfsjunges'], 36, true, 1.45),
    enc(1, 'Elite: Brutmutter', ['giftspinne', 'giftspinne', 'riesenspinne', 'riesenspinne'], 36, true, 1.45),
    enc(1, 'Elite: Das gestreifte Paar', ['klingentiger', 'klingentiger', 'eberrammler', 'klingentiger'], 38, true, 1.45),
    enc(1, 'Elite: Orkvorhut', ['orkspaeher', 'orkspaeher', 'orkspaeher', 'eberrammler'], 38, true, 1.45),

    enc(2, 'Knochenkammer', ['skelett', 'skelett', 'knochenmagier'], 27, false, 1.6),
    enc(2, 'Einsturzstollen', ['minenkobold', 'minenkobold', 'hoehlentroll'], 27, false, 1.6),
    enc(2, 'Orkvorhut', ['orkkrieger', 'orkkrieger', 'orkhaeuptling'], 29, false, 1.6),
    enc(2, 'Tiefe Nische', ['hoehlenspinne', 'schattenfalter', 'hoehlenspinne'], 27, false, 1.6),
    enc(2, 'Wächterhalle', ['felsgolem', 'skelett', 'knochenmagier'], 29, false, 1.6),
    enc(2, 'Gruft', ['gruftghul', 'gruftghul', 'knochenmagier', 'skelett'], 30, false, 1.6),
    enc(2, 'Die Orkstraße', ['orkkrieger', 'orkkrieger', 'orkschamane', 'orkspaeher'], 29, false, 1.6),
    enc(2, 'Die Grube', ['grubenwurm', 'hoehlenspinne', 'hoehlenspinne'], 29, false, 1.6),
    enc(2, 'Verlassene Zwergenmine', ['minenkobold', 'minenaufseher', 'felsgolem'], 29, false, 1.6),
    enc(2, 'Der brennende Weiler', ['orkkrieger', 'orkschamane', 'orkspaeher'], 27, false, 1.6),
    enc(2, 'Gruft der Bergkönige', ['gruftfledermaus', 'gruftghul', 'knochenmagier', 'skelett'], 30, false, 1.6),
    enc(2, 'Späher des Orklords', ['orkspaeher', 'orkspaeher', 'orkhaeuptling'], 29, false, 1.6),

    enc(2, 'Elite: Vorhut des Orklords', ['orkhaeuptling', 'orkkrieger', 'orkkrieger', 'orkschamane'], 52, true, 1.9),
    enc(2, 'Elite: Der Grubenwurm', ['grubenwurm', 'grubenwurm', 'hoehlentroll'], 52, true, 1.9),
    enc(2, 'Elite: Trollpaar', ['hoehlentroll', 'hoehlentroll', 'felsgolem'], 52, true, 1.9),
    enc(2, 'Elite: Orkhorde', ['orkkrieger', 'orkkrieger', 'orkkrieger', 'orkhaeuptling'], 52, true, 1.9),

    enc(3, 'Vorhut Falmuths', ['ritter', 'ritter', 'bogenschuetze'], 40, false, 1.8),
    enc(3, 'Hofstaat', ['hofmagier', 'hofmagier', 'ritter'], 40, false, 1.8),
    enc(3, 'Heilige Kompanie', ['paladin', 'bogenschuetze', 'heilige_klinge'], 44, false, 1.8),
    enc(3, 'Dämonenpforte', ['daemonenbrut', 'hoellenhund', 'erzdaemon'], 44, false, 1.8),
    enc(3, 'Verfluchtes Feld', ['verderbte_seele', 'blutritter', 'verderbte_seele'], 42, false, 1.8),
    enc(3, 'Letzte Bastion', ['paladin', 'ritter', 'hofmagier', 'bogenschuetze'], 46, false, 1.8),
    enc(3, 'Der Zug der Kreuzritter', ['kreuzritter', 'kreuzritter', 'inquisitor'], 42, false, 1.8),
    enc(3, 'Vor den Toren Falmuths', ['ritter', 'ritter', 'bogenschuetze', 'hofmagier'], 44, false, 1.8),
    enc(3, 'Die weiße Kapelle', ['paladin', 'inquisitor', 'kreuzritter'], 44, false, 1.8),
    enc(3, 'Blutmond', ['gefallener_engel', 'daemonenbrut', 'hoellenhund'], 44, false, 1.8),
    enc(3, 'Das Feld der Verräter', ['verderbte_seele', 'gefallener_engel', 'blutritter'], 42, false, 1.8),
    enc(3, 'Dämonenpakt', ['erzdaemon', 'daemonenbrut', 'gefallener_engel'], 44, false, 1.8),

    enc(3, 'Elite: Heilige Inquisition', ['inquisitor', 'inquisitor', 'paladin', 'kreuzritter'], 72, true, 1.85),
    enc(3, 'Elite: Der gefallene Chor', ['gefallener_engel', 'gefallener_engel', 'erzdaemon', 'blutritter'], 72, true, 1.85),
    enc(3, 'Elite: Kreuzzug', ['paladin', 'paladin', 'heilige_klinge', 'hofmagier'], 72, true, 1.85),
    enc(3, 'Elite: Dämonenrat', ['erzdaemon', 'erzdaemon', 'blutritter', 'hoellenhund'], 72, true, 1.85)
  ];

  var bosses = [
    { act: 1, name: 'Charybdis', units: ['charybdis', 'giftspinne', 'giftspinne'], gold: 80, mult: 1 },
    { act: 2, name: 'Clayman', units: ['clayman', 'gruftghul', 'knochenmagier'], gold: 120, mult: 1.1 },
    { act: 3, name: 'Milim Nava', units: ['milim_boss', 'daemonenbrut', 'erzdaemon'], gold: 200, mult: 1.2 }
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
    charybdis: ['rundumschlag', 'wuchtschlag'],
    clayman: ['fluchstoss', 'seelenschlag'],
    milim_boss: ['wuchtschlag', 'rundumschlag']
  };
  function aktiveVon(id) {
    var v = AKTIV[id];
    if (!v) return [];
    return (typeof v === 'string' ? [v] : v).map(function (a) { return root.Abilities.get(a); })
      .filter(Boolean);
  }

  /* Begegnung -> fertige Kampfdefinitionen, mit mult skaliert. */
  function build(e) {
    return e.units.map(function (id) {
      var d = byId(enemies, id);
      var m = e.mult || 1;
      return {
        id: d.id, name: d.name, tags: d.tags, effects: d.effects, actives: aktiveVon(id),
        resistenz: d.resistenz || 0,
        hp: Math.round(d.hp * m), atk: Math.round(d.atk * m),
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
    boss: function (a) { return bosses.filter(function (b) { return b.act === a; })[0]; }
  };
})(globalThis);
