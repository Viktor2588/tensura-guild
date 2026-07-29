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
  /* Das Gegenstück zu `verwundet` für Schild-Signaturen: schon gelegte Schilde
     noch einmal zu legen ist verschwendet — dann schlägt die Einheit lieber zu. */
  var schildeDuenn = function (c) {
    return c.allies.some(function (u) { return (u.status.schild || 0) < u.maxHp * 0.15; });
  };
  /* Und für reine Verstärker-Signaturen: sie lohnen sich einmal, danach nicht
     mehr. `_gerufen` merkt sich das je Einheit. */
  var nochNichtGerufen = function (c) { return !c.self._gerufen; };
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

    /* ---- Zweite Bibliotheksschicht: Lage statt Prozent ----------------------
       Die ersten 34 geteilten Passiven sind fast alle „+X % gegen Y". Das ist
       für eine Bibliothek richtig — sie muss auf JEDER Einheit funktionieren,
       darf also kein Thema voraussetzen. Aber themenfrei heißt nicht ideenfrei:
       diese hier lesen die LAGE. Wo steht die Einheit, wie viele Gegner stehen
       noch, wie oft wurde sie getroffen, wie viel Leben fehlt ihr. Das
       funktioniert bei jeder Einheit und ist trotzdem eine Entscheidung.
       Manche tragen einen Preis — sie stehen dann neben den Linien-Keystones
       und sind nicht mehr nur die brave Alternative.                           */

    /* -- Angriff -- */
    passiv('vorhut', 'Vorhut', 'onHit', [], [],
      '+28 % Schaden, solange die Einheit ganz vorn steht',
      /* `pos` ist 0-basiert: vorn ist 0. */
      function (c) { if (c.self.pos === 0) c.dmg *= 1.28; }),
    passiv('hinterhalt', 'Hinterhalt', 'onHit', [], [],
      '+32 % Schaden, solange die Einheit NICHT vorn steht',
      function (c) { if (c.self.pos > 0) c.dmg *= 1.32; }),
    passiv('duellant', 'Duellant', 'onHit', [], [],
      '+45 % Schaden, solange nur noch ein Gegner steht — die Antwort auf Bosse',
      function (c) { if (c.foes().length === 1) c.dmg *= 1.45; }),
    passiv('anlauf', 'Anlauf', 'onHit', [], [],
      'Jeder Schlag auf dasselbe Ziel trifft 9 % härter als der davor — höchstens +54 %, ein Zielwechsel setzt zurück',
      function (c) {
        if (c.self._anlauf_ziel !== c.target.key) { c.self._anlauf_ziel = c.target.key; c.self._anlauf = 0; }
        c.self._anlauf = Math.min(6, (c.self._anlauf || 0) + 1);
        c.dmg *= 1 + 0.09 * (c.self._anlauf - 1);
      }),
    passiv('zweitschlag', 'Zweitschlag', 'onHit', [], [],
      'Jeder dritte Angriff schlägt sofort ein zweites Mal für 65 %',
      function (c) {
        if (!zaehler(c.self, 'zweitschlag', 3)) return;
        c.deal(c.target, c.self.atk * 0.65, 'Zweitschlag');
      }),
    passiv('grenzgang', 'Grenzgang', 'onStart', [], [],
      '+55 % Angriff, aber die Einheit hält nur noch zwei Drittel aus',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 1.55);
        c.self.maxHp = Math.round(c.self.maxHp * 0.67);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    /* -- Mechanik -- */
    passiv('markierer', 'Markierer', 'onHit', ['verwundbar'], [],
      'Jeder dritte Treffer markiert das Ziel mit 3 Verwundbar — die Marke gilt für JEDEN Angreifer',
      function (c) {
        if (!zaehler(c.self, 'markierer', 3)) return;
        c.markiere(c.target, 3);
      }),
    passiv('panzerknacker', 'Panzerknacker', 'onHit', [], [],
      'Trägt das Ziel ein Schild, ignoriert der Treffer die Rüstung vollständig',
      function (c) {
        if ((c.target.status.schild || 0) > 0) c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('zuendschnur', 'Zündschnur', 'onHit', [], [],
      '+20 % Schaden gegen jedes Ziel, das irgendeinen Zustand trägt — egal welchen',
      function (c) { if (gelesen(c.target) > 0) c.dmg *= 1.2; }),
    passiv('nachhall', 'Nachhall', 'onTurnStart', [], [],
      'Zu Beginn jedes Zuges ein Schlag für 45 % auf das schwächste Ziel',
      function (c) {
        var f = schwaechstes(c.foes(), function (x) { return x.hp; });
        if (f) c.deal(f, c.self.atk * 0.45, 'Nachhall');
      }),
    passiv('tempoanker', 'Tempoanker', 'onStart', ['tempo'], [],
      'Mit jedem eigenen Zug +7 % Tempo — höchstens +70 %',
      function (c) {
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Tempoanker', fn: function (k) {
          k.self._anker = (k.self._anker || 0) + 1;
          if (k.self._anker <= 8) k.self.spd = Math.round(k.self.spd * 1.07);
        } });
      }),
    passiv('brennglas', 'Brennglas', 'onStart', [], [],
      'Alle Zustände, die diese Einheit anlegt, fallen 50 % größer aus — dafür schlägt sie ein Drittel schwächer',
      function (c) {
        c.self.fluchmeister = (c.self.fluchmeister || 1) * 1.5;
        c.self.atk = Math.round(c.self.atk * 0.67);
      }),

    /* -- Unterstützung -- */
    passiv('schlachtplan', 'Schlachtplan', 'onStart', [], [],
      'Der ganze Trupp schlägt 6 % härter je Mitglied — eine volle Reihe lohnt sich',
      function (c) {
        var n = c.allies().length;
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * (1 + 0.06 * n)); });
      }),
    passiv('vorbild', 'Vorbild', 'onStart', [], [],
      'Der stärkste Verbündete bekommt +20 % Angriff — auch die Einheit selbst, wenn sie es ist',
      function (c) {
        var best = c.allies().reduce(function (a, b) { return b.atk > a.atk ? b : a; }, c.allies()[0]);
        if (best) best.atk = Math.round(best.atk * 1.2);
      }),
    passiv('feldsanitaeter', 'Feldsanitäter', 'onDamaged', ['heilung'], [],
      'Jeder vierte Treffer auf den Trupp heilt den am schwersten Verwundeten um 14 %',
      function (c) {
        if (!zaehler(c.self, 'feldsanitaeter', 4)) return;
        var u = schwaechstes(c.allies(), function (x) { return x.hp / x.maxHp; });
        if (u) c.heal(u, u.maxHp * 0.14, 'Feldsanitäter');
      }),
    passiv('wachabloesung', 'Wachablösung', 'onAllyDeath', ['schild'], [],
      'Fällt ein Verbündeter, bekommt der neue Vorderste ein Schild über 30 % seines Lebens',
      function (c) {
        var vorn = c.allies()[0];
        if (vorn) c.applyStatus(vorn, 'schild', Math.round(vorn.maxHp * 0.3));
      }),
    passiv('letztes_aufgebot', 'Letztes Aufgebot', 'onTurnStart', [], [],
      'Steht die Einheit als letzte, schlägt sie 55 % härter und ist 30 % schneller',
      function (c) {
        if (c.allies().length > 1 || c.self._aufgebot) return;
        c.self._aufgebot = 1;
        c.self.atk = Math.round(c.self.atk * 1.55);
        c.self.spd = Math.round(c.self.spd * 1.3);
      }),
    passiv('opfergang', 'Opfergang', 'onStart', [], [],
      'Die Verbündeten schlagen 22 % härter — die Einheit selbst nur noch mit der Hälfte',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.atk = Math.round(u.atk * 1.22); });
        c.self.atk = Math.round(c.self.atk * 0.5);
      }),

    /* -- Defensive -- */
    passiv('standfest', 'Standfest', 'onDamaged', [], [],
      'Je 10 % fehlendem Leben erleidet die Einheit 5 % weniger Schaden — höchstens 40 %',
      function (c) {
        var fehlt = 1 - c.self.hp / c.self.maxHp;
        c.self.minderung = Math.max(c.self.minderung || 0, Math.min(0.4, fehlt * 0.5));
      }),
    passiv('todesverachtung', 'Todesverachtung', 'onDamaged', [], [],
      'Unter einem Viertel Leben schlägt die Einheit 45 % härter und ist 25 % schneller — einmal je Kampf',
      function (c) {
        if (c.self._verachtung || c.self.hp > c.self.maxHp * 0.25) return;
        c.self._verachtung = 1;
        c.self.atk = Math.round(c.self.atk * 1.45);
        c.self.spd = Math.round(c.self.spd * 1.25);
      }),
    passiv('trotz', 'Trotz', 'onDamaged', [], [],
      'Jeder erlittene Treffer gibt dauerhaft +3 Rüstung',
      function (c) { c.self.def += 3; }),
    passiv('rueckendeckung', 'Rückendeckung', 'onStart', [], [],
      'Solange ein Verbündeter weniger Leben hat als die Einheit, erleidet sie 22 % weniger Schaden',
      function (c) {
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Rückendeckung', fn: function (k) {
          var schwaecher = k.allies().some(function (u) {
            return u !== k.self && u.hp / u.maxHp < k.self.hp / k.self.maxHp;
          });
          k.self.minderung = schwaecher ? Math.max(k.self.minderung || 0, 0.22) : 0;
        } });
      }),
    passiv('zaehe_haut', 'Zähe Haut', 'onStart', [], [],
      'Kein Treffer kostet mehr als 18 % des maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.18); }),
    passiv('festgewachsen', 'Festgewachsen', 'onStart', [], [],
      'Kein Treffer kostet mehr als 11 % des maximalen Lebens — dafür ist die Einheit halb so schnell',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.11);
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
      }),

    /* ---- Shions Linien ----------------------------------------------------
       Vier Linien, vier Stufen: Angriff (Chaos in Werte), Mechanik (das Chaos
       selbst), Unterstützung (Antichaos für den Trupp), Defensive (Oger-Fleisch).
       Beim Anwerben und bei jedem Aufstieg wählt der Spieler eine aus vier —
       eine je Linie, auf der Stufe, die dem Rang entspricht.

       Der Hook `onChaos` feuert, sobald Shion Chaos anlegt; `c.stapel` ist die
       Menge NACH der Meisterschaft.                                           */

    passiv('shion_ang1', 'Chaosrausch', 'onChaos', ['chaos'], [],
      'Jeder angelegte Chaos-Stapel gibt Shion für den Rest des Kampfes +1,8 % Angriff und +1,2 % Tempo',
      function (c) {
        c.self.atk = Math.round(c.self.atk * (1 + 0.018 * c.stapel));
        c.self.spd = Math.round(c.self.spd * (1 + 0.012 * c.stapel));
      }),
    passiv('shion_ang2', 'Wutspirale', 'onChaos', ['chaos'], [],
      'Wie Chaosrausch, aber +2,8 % Angriff je Stapel — unter der Hälfte ihres Lebens +5,5 %',
      function (c) {
        var p = c.self.hp < c.self.maxHp * 0.5 ? 0.055 : 0.028;
        c.self.atk = Math.round(c.self.atk * (1 + p * c.stapel));
      }),
    passiv('shion_ang3', 'Schlachtruf des Chaos', 'onChaos', ['chaos'], [],
      'Jeder angelegte Chaos-Stapel gibt dem ganzen Trupp +1,1 % Angriff',
      function (c) {
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * (1 + 0.011 * c.stapel)); });
      }),
    passiv('shion_ang4', 'Verzerrter Titan', 'onHit', [], ['chaos'],
      '+2 % Schaden je Chaos-Stapel, den das Ziel trägt — höchstens +50 %',
      function (c) { c.dmg *= 1 + Math.min(0.5, 0.02 * (c.target.status.chaos || 0)); }),

    /* Shions Rangleiter heißt C Oger, B Teufel, A Verdorbener Teufel,
       S Ultimativer Teufel. Diese Passive macht die dritte Stufe im Kampf
       sichtbar: Sie ist keine Zahl, sondern eine Schwelle, die ein Chaos-Bau
       überhaupt erst erreicht — zehn Chaos auf dem Ziel bekommt nur, wer
       stapelt, und zehn Antichaos auf sich selbst nur, wer den Realitätswarp
       trägt. Deshalb kostet sie nichts: die Bedingung IST der Preis. */
    passiv('shion_ang5', 'Ordnungsteufel', 'onHit', ['chaos'], ['chaos'],
      'Ab 10 Antichaos auf dir selbst wirst du zum Ordnungsteufel: je Stapel ' +
      '+3 % Angriff, +1,5 % Tempo und +1,8 % Leben — höchstens +90 %. Deine Signatur ' +
      'wird zur Klinge der Ordnung, die den ganzen Trupp mit Antichaos versorgt. Einmal je Kampf.',
      function (c) {
        if (c.self._ordnung) return;
        var anti = c.self.status.antichaos || 0;
        if (anti < 10) return;
        c.self._ordnung = 1;
        verwandle(c, 'Ordnungsteufel', 'sig_shion_ordnung', anti, 10, 0.03, 0.9);
      }),
    passiv('shion_ang6', 'Verdorbener Teufel', 'onHit', ['chaos'], ['chaos'],
      'Liegen zusammen 20 Chaos auf den Gegnern, wirst du zum Verdorbenen Teufel: ' +
      'je Stapel +2 % Angriff, +1 % Tempo und +1,2 % Leben — höchstens +90 %. Deine Signatur ' +
      'wird zur Chaosklinge des Verdorbenen (230 % Schaden, doppeltes Chaos). Einmal je Kampf.',
      function (c) {
        if (c.self._verdorben) return;
        var chaos = 0;
        c.foes().forEach(function (f) { chaos += f.status.chaos || 0; });
        if (chaos < 20) return;
        c.self._verdorben = 1;
        verwandle(c, 'Verdorbener Teufel', 'sig_shion_verdorben', chaos, 20, 0.02, 0.9);
      }),

    /* Chaos und Antichaos sind dasselbe Rad, einmal nach unten und einmal nach
       oben. Diese drei Passiven drehen daran, statt Zahlen zu erhöhen:
       ernten, umleiten, verbrauchen. */
    passiv('shion_mec5', 'Chaosernte', 'onKill', ['chaos'], ['chaos'],
      'Fällt ein Ziel mit mindestens 5 Chaos, erntet Shion die Ladung: je Stapel +2 % Angriff dauerhaft, und der ganze Trupp bekommt ein Drittel davon als Antichaos',
      function (c) {
        var geerntet = Math.floor(c.getoetet.status.chaos || 0);
        if (geerntet < 5) return;
        c.self.atk = Math.round(c.self.atk * (1 + 0.02 * geerntet));
        var anti = Math.max(1, Math.round(geerntet / 3));
        c.allies().forEach(function (u) { c.applyStatus(u, 'antichaos', anti); });
      }),
    passiv('shion_unt5', 'Umkehr der Ordnung', 'onTurnStart', ['chaos'], ['chaos'],
      'Zu Beginn jedes Zuges zieht Shion 2 Chaos vom am stärksten belasteten Gegner ab und gibt sie dem schwächsten Verbündeten als Antichaos — Unordnung wird zu Ordnung',
      function (c) {
        var quelle = c.foes().reduce(function (a, b) {
          return (b.status.chaos || 0) > (a.status.chaos || 0) ? b : a;
        }, c.foes()[0]);
        if (!quelle || (quelle.status.chaos || 0) < 2) return;
        quelle.status.chaos -= 2;
        var ziel = schwaechstes(c.allies(), function (u) { return u.hp / u.maxHp; });
        if (ziel) c.applyStatus(ziel, 'antichaos', 2);
      }),
    passiv('shion_def5', 'Ordnungspanzer', 'onDamaged', ['chaos'], ['chaos'],
      'Je Antichaos-Stapel erleidet Shion 3 % weniger Schaden — höchstens 45 %. Jeder abgefangene Treffer verbraucht dafür einen Stapel',
      function (c) {
        var anti = Math.floor(c.self.status.antichaos || 0);
        c.self.minderung = Math.min(0.45, 0.03 * anti);
        if (anti > 0) c.self.status.antichaos--;
      }),

    passiv('shion_mec1', 'Chaosmeisterschaft', 'onStart', [], ['chaos'],
      'Shion legt 30 % mehr Chaos-Stapel an, als die Fähigkeit angibt',
      function (c) { c.self.chaosmeister = Math.max(c.self.chaosmeister || 1, 1.3); }),
    passiv('shion_mec2', 'Instabile Klinge', 'onChaos', ['chaos'], [],
      'Dieselbe Menge Chaos geht zusätzlich auf einen zweiten Gegner',
      function (c) {
        var f = c.foes().filter(function (x) { return x !== c.ziel; })[0];
        if (f) c.applyStatus(f, 'chaos', c.stapel);
      }),
    /* Der Verstärker gehört dem ganzen Trupp, nicht nur Shion: gemessen war die
       Mechanik-Linie als Einzelbonus exakt so stark wie gar keine Passive. */
    passiv('shion_mec3', 'Entropiebruch', 'onStart', [], ['chaos'],
      'Der ganze Trupp verursacht +2,2 % Schaden je Chaos-Stapel, höchstens +45 %',
      function (c) {
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Entropiebruch', fn: function (k) {
            k.dmg *= 1 + Math.min(0.45, 0.022 * (k.target.status.chaos || 0));
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
      'Der Realitätswarp legt 50 % mehr Antichaos an',
      function (c) { c.self.antichaosWarp = (c.self.antichaosWarp || 0) + 0.5; }),
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
      'Kein einzelner Treffer nimmt Shion mehr als 16 % ihres maximalen Lebens',
      function (c) { c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.155); }),

    /* ---- Zegion: der Raum ---------------------------------------------------
       Der Insektenkaiser greift nicht den Körper an, sondern die Deckung davor.
       Als einziger im Spiel zerschlägt er Schilde, statt sie zu durchdringen —
       gegen einen Schild-Trupp ist er die Antwort, gegen einen nackten nur ein
       harter Schläger. Das macht ihn zur ersten Einheit, deren Wert am GEGNER
       hängt statt am eigenen Trupp.                                            */

    passiv('zegion_ang1', 'Raumbruch', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 140 % härter und zerschlägt den Schild des Ziels vollständig',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.4;
        c.target.status.schild = 0;
      }),
    passiv('zegion_ang2', 'Dimensionsriss', 'onHit', [], [],
      'Jeder dritte Schlag geht durch jeden Schild hindurch und trifft 90 % härter',
      function (c) {
        if (!zaehler(c.self, 'zegion_ang2', 3)) return;
        c.dmg *= 1.9;
        c.self.durchschlag = 1;
      }),
    passiv('zegion_ang3', 'Leerer Raum', 'onHit', [], ['konter'],
      'Führt ein Verbündeter Konter, trifft Zegion ungeschützte Ziele 35 % härter — sonst 12 %',
      function (c) {
        if ((c.target.status.schild || 0) > 0) return;
        c.dmg *= truppFuehrt(c, 'konter') ? 1.35 : 1.12;
      }),
    passiv('zegion_ang4', 'Raumzerschmetterung', 'onStart', [], [],
      'Jeder Schlag zerschlägt zuerst den Schild des Ziels — dafür trifft Zegion 25 % schwächer',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Raumzerschmetterung', fn: function (k) {
          k.dmg *= 0.75;
          k.target.status.schild = 0;
        } });
      }),

    passiv('zegion_mec1', 'Kaiserpanzer', 'onStart', [], [],
      'Beginnt den Kampf mit 60 % Rüstungsdurchschlag und +10 Rüstung',
      function (c) {
        c.self.pierce = Math.max(c.self.pierce || 0, 0.6);
        c.self.def += 10;
      }),
    passiv('zegion_mec2', 'Zangengriff', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer zahlt mit 80 % des Angriffs zurück und nimmt dem Angreifer seinen Schild',
      function (c) {
        if (!zaehler(c.self, 'zegion_mec2', 3)) return;
        var f = c.foes()[0];
        if (!f) return;
        f.status.schild = 0;
        c.deal(f, c.self.atk * 0.8, 'Zangengriff');
      }),
    passiv('zegion_mec3', 'Raumfestung', 'onStart', ['konter'], ['konter'],
      'Führt ein Verbündeter Konter, zahlt Zegion jeden Treffer mit 32 % zurück — sonst mit 14 %',
      function (c) {
        var m = truppFuehrt(c, 'konter') ? 0.32 : 0.14;
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Raumfestung', fn: function (k) {
          var f = k.foes()[0];
          if (f) k.deal(f, k.self.atk * m, 'Raumfestung');
        } });
      }),
    passiv('zegion_mec4', 'Absolute Verteidigung', 'onStart', [], [],
      'Kein Treffer kostet Zegion mehr als 8 % seines Lebens — dafür schlägt er nur noch mit einem Drittel',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.08);
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('zegion_unt1', 'Kaiserbefehl', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Angriff und +12 % Rüstung für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          u.def = Math.round(u.def * 1.12);
        });
      }),
    passiv('zegion_unt2', 'Bresche', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp zerschlägt die Schilde ALLER Gegner',
      function (c) {
        if (!zaehler(c.self, 'zegion_unt2', 4)) return;
        c.foes().forEach(function (f) { f.status.schild = 0; });
      }),
    passiv('zegion_unt3', 'Durchbruchsbefehl', 'onStart', [], ['konter'],
      'Führt ein Verbündeter Konter, bekommt der Trupp 40 % Durchschlag — sonst 15 %',
      function (c) {
        var p = truppFuehrt(c, 'konter') ? 0.4 : 0.15;
        c.allies().forEach(function (u) { u.pierce = Math.max(u.pierce || 0, p); });
      }),
    passiv('zegion_unt4', 'Insektenkaiser', 'onStart', [], [],
      'Der Trupp geht durch jeden Schild hindurch — Zegion selbst schlägt nur noch mit einem Viertel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.durchschlag = 1; });
        c.self.atk = Math.round(c.self.atk * 0.25);
      }),

    passiv('zegion_def1', 'Chitinpanzer', 'onStart', [], [],
      'Beginnt mit einem Schild über 32 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.32)); }),
    passiv('zegion_def2', 'Nachwachsend', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'zegion_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Nachwachsend');
      }),
    passiv('zegion_def3', 'Raumschild', 'onStart', [], ['konter'],
      'Führt ein Verbündeter Konter, kostet kein Treffer mehr als 12 % seines Lebens — sonst 18 %',
      function (c) {
        var d = truppFuehrt(c, 'konter') ? 0.12 : 0.18;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('zegion_def4', 'Unbewegter Kaiser', 'onStart', [], [],
      'Zegion erleidet 35 % weniger Schaden — dafür ist er nur noch halb so schnell',
      function (c) {
        c.self.minderung = Math.max(c.self.minderung || 0, 0.35);
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
      }),


    /* ---- Metamorphose: die Identität der Insektoiden ------------------------
       Sie waren zu dritt mechanisch verschieden, aber die ART hatte nichts
       Eigenes — Gift, Schild und Rüstungsbruch gibt es überall. Jetzt haben
       alle drei eine Häutung: eine Schwelle mitten im Kampf, hinter der eine
       andere Form steht. Keine andere Art kann das, und es ist genau das, was
       Insekten tun. `verwandle()` ist dieselbe Stelle wie bei Shion und Ranga. */

    passiv('zegion_ang5', 'Perfekte Form', 'onHit', [], [],
      'Ab dem sechsten eigenen Treffer häutet sich Zegion: je bisherigem Treffer +6 % Angriff, ' +
      '+3 % Tempo und +3,6 % Leben — höchstens +90 %. Seine Signatur wird zur Raumzerreißung.',
      function (c) {
        if (c.self._meta) return;
        c.self._treffer = (c.self._treffer || 0) + 1;
        if (c.self._treffer < 6) return;
        c.self._meta = 1;
        verwandle(c, 'Perfekte Form', 'sig_zegion_perfekt', c.self._treffer, 6, 0.06, 0.9);
      }),
    passiv('apito_ang5', 'Ausgewachsene Königin', 'onHit', ['gift'], ['gift'],
      'Liegen zusammen 25 Gift auf den Gegnern, wächst Apito aus: je Stapel +2 % Angriff, ' +
      '+1 % Tempo und +1,2 % Leben — höchstens +90 %. Ihre Signatur wird zum Königinnenstachel.',
      function (c) {
        if (c.self._meta) return;
        var gift = 0;
        c.foes().forEach(function (f) { gift += f.status.gift || 0; });
        if (gift < 25) return;
        c.self._meta = 1;
        verwandle(c, 'Ausgewachsene Königin', 'sig_apito_koenigin', gift, 25, 0.02, 0.9);
      }),
    passiv('kaefergarde_ang5', 'Panzerform', 'onDamaged', ['schild'], ['schild'],
      'Sobald die Garde 30 % ihres Lebens verloren hat, klappt der Panzer auf: je 10 % fehlendem ' +
      'Leben +12 % Angriff, +6 % Tempo und +7 % Leben — höchstens +90 %. Ihre Signatur wird zum Panzerwall.',
      function (c) {
        if (c.self._meta) return;
        var fehlt = (1 - c.self.hp / c.self.maxHp) * 10;
        if (fehlt < 3) return;
        c.self._meta = 1;
        verwandle(c, 'Panzerform', 'sig_kaefergarde_panzer', fehlt, 3, 0.12, 0.9);
      }),

    /* ---- Apito: die Brutmutter ----------------------------------------------
       Gift, aber nicht als Marke — als Brut. Ihre Stapel wachsen von selbst
       nach, statt nur angelegt zu werden, und der Schwarm zahlt für jeden
       Gegner, der schon vergiftet ist.                                         */

    passiv('apito_ang1', 'Giftstachel', 'onHit', ['gift'], [],
      'Der erste Schlag des Kampfes trifft 120 % härter und vergiftet jeden Gegner mit 5',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.2;
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 5); });
      }),
    passiv('apito_ang2', 'Zehrender Stich', 'onHit', ['gift'], ['gift'],
      'Jeder dritte Schlag trifft 6 % härter je Gift-Stapel auf dem Ziel — höchstens doppelt',
      function (c) {
        if (!zaehler(c.self, 'apito_ang2', 3)) return;
        c.dmg *= 1 + Math.min(1, 0.06 * (c.target.status.gift || 0));
      }),
    passiv('apito_ang3', 'Brutstich', 'onHit', ['gift'], ['gift'],
      'Führt ein Verbündeter Gift, legt jeder Schlag 4 Gift an und vergiftet einen zweiten Gegner mit 2 — sonst nur 2 auf das Ziel',
      function (c) {
        var mit = truppFuehrt(c, 'gift');
        c.applyStatus(c.target, 'gift', mit ? 4 : 2);
        if (!mit) return;
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) c.applyStatus(f, 'gift', 2);
      }),
    passiv('apito_ang4', 'Königin der Brut', 'onKill', ['gift'], [],
      'Jeder Abschuss vergiftet alle übrigen Gegner mit 8 — und kostet Apito 10 % ihres Lebens',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 8); });
        c.deal(c.self, c.self.maxHp * 0.1, 'Königin der Brut', { pure: true });
      }),

    passiv('apito_mec1', 'Brutnest', 'onStart', ['gift'], [],
      'Vergiftet zu Kampfbeginn jeden Gegner mit 6',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 6); }); }),
    passiv('apito_mec2', 'Nachschub', 'onHit', ['gift'], [],
      'Jeder dritte Schlag vergiftet alle Gegner mit 4 nach',
      function (c) {
        if (!zaehler(c.self, 'apito_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 4); });
      }),
    passiv('apito_mec3', 'Wucherndes Gift', 'onTurnStart', ['gift'], ['gift'],
      'Führt ein Verbündeter Gift, wächst jedes bestehende Gift jeden Zug um 2 nach — sonst um 1',
      function (c) {
        var n = truppFuehrt(c, 'gift') ? 2 : 1;
        c.foes().forEach(function (f) {
          if ((f.status.gift || 0) > 0) c.applyStatus(f, 'gift', n);
        });
      }),
    passiv('apito_mec4', 'Brutmutter', 'onStart', ['gift'], [],
      'Jeder Zug vergiftet alle Gegner mit 5 — dafür schlägt Apito nur noch mit einem Drittel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Brutmutter', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'gift', 5); });
        } });
      }),

    passiv('apito_unt1', 'Schwarmruf', 'onStart', ['gift'], [],
      'Zu Kampfbeginn 4 Gift auf jeden Gegner und +10 % Angriff für den Trupp',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 4); });
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.1); });
      }),
    passiv('apito_unt2', 'Wehrhafter Schwarm', 'onDamaged', ['gift'], [],
      'Jeder vierte Treffer auf den Trupp vergiftet alle Gegner mit 4',
      function (c) {
        if (!zaehler(c.self, 'apito_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 4); });
      }),
    passiv('apito_unt3', 'Giftzähne', 'onStart', ['gift'], ['gift'],
      'Führt ein Verbündeter Gift, vergiftet jeder Treffer des Trupps mit 2 — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'gift') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Giftzähne', fn: function (k) {
            k.applyStatus(k.target, 'gift', n);
          } });
        });
      }),
    passiv('apito_unt4', 'Herrin des Nests', 'onStart', ['gift'], [],
      'Der Trupp trifft vergiftete Ziele 32 % härter — Apito selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Herrin des Nests', fn: function (k) {
            if ((k.target.status.gift || 0) > 0) k.dmg *= 1.32;
          } });
        });
      }),

    passiv('apito_def1', 'Chitinschale', 'onStart', [], [],
      'Beginnt mit einem Schild über 28 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.28)); }),
    passiv('apito_def2', 'Giftblut', 'onDamaged', ['gift'], [],
      'Jeder dritte erlittene Treffer vergiftet den Angreifer mit 5 und heilt 8 %',
      function (c) {
        if (!zaehler(c.self, 'apito_def2', 3)) return;
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'gift', 5);
        c.heal(c.self, c.self.maxHp * 0.08, 'Giftblut');
      }),
    passiv('apito_def3', 'Panzerwachs', 'onStart', [], ['gift'],
      'Führt ein Verbündeter Gift, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'gift') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('apito_def4', 'Letzte Brut', 'onDeath', ['gift'], [],
      'Steht einmal mit 40 % Leben wieder auf und vergiftet alle Gegner mit 12 — danach heilt sie nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 12); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Käfergarde: die Formation ------------------------------------------
       Die billigste Schild-Einheit, und die einzige, deren Schilde MIT der
       Truppgröße wachsen. Sie ist kein Bollwerk für sich, sondern der Grund,
       warum eine volle Reihe zusammenhält.                                     */

    passiv('kaefergarde_ang1', 'Panzerstoß', 'onHit', ['schild'], [],
      'Der erste Schlag des Kampfes trifft 100 % härter und legt dem Trupp ein Schild an',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.6)); });
      }),
    passiv('kaefergarde_ang2', 'Schildstoß', 'onHit', ['schild'], [],
      'Jeder dritte Schlag schlägt zusätzlich mit dem halben eigenen Schildwert zu',
      function (c) {
        if (!zaehler(c.self, 'kaefergarde_ang2', 3)) return;
        c.deal(c.target, (c.self.status.schild || 0) * 0.5 + c.self.def, 'Schildstoß');
      }),
    passiv('kaefergarde_ang3', 'Gedeckter Vorstoß', 'onHit', [], ['schild'],
      'Führt ein Verbündeter Schild, schlägt die Garde 28 % härter, solange sie selbst ein Schild trägt — sonst 10 %',
      function (c) {
        if ((c.self.status.schild || 0) <= 0) return;
        c.dmg *= truppFuehrt(c, 'schild') ? 1.28 : 1.1;
      }),
    passiv('kaefergarde_ang4', 'Rammbock', 'onStart', ['schild'], [],
      'Der Schaden der Garde wächst mit ihrem Schild (bis +80 %) — dafür heilt sie nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onHit', name: 'Rammbock', fn: function (k) {
          k.dmg *= 1 + Math.min(0.8, (k.self.status.schild || 0) / Math.max(1, k.self.maxHp));
        } });
      }),

    passiv('kaefergarde_mec1', 'Formation', 'onStart', ['schild'], [],
      'Legt zu Kampfbeginn dem Trupp ein Schild an — je Mitglied 15 % größer',
      function (c) {
        var n = c.allies().length;
        c.allies().forEach(function (u) {
          c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.7 * (1 + 0.15 * n)));
        });
      }),
    passiv('kaefergarde_mec2', 'Nachrücken', 'onDamaged', ['schild'], [],
      'Jeder dritte Treffer legt dem ganzen Trupp Schild nach',
      function (c) {
        if (!zaehler(c.self, 'kaefergarde_mec2', 3)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.6)); });
      }),
    passiv('kaefergarde_mec3', 'Verzahnte Panzer', 'onStart', ['schild'], ['schild'],
      'Führt ein Verbündeter Schild, wirken alle Schilde im Trupp 40 % stärker — sonst 15 %',
      function (c) {
        var f = truppFuehrt(c, 'schild') ? 0.4 : 0.15;
        c.allies().forEach(function (u) { u.schildfaktor += f; });
      }),
    passiv('kaefergarde_mec4', 'Unverrückbar', 'onStart', ['schild'], [],
      'Jeder Zug baut die Schilde des ganzen Trupps wieder auf — dafür ist die Garde nur halb so schnell',
      function (c) {
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Unverrückbar', fn: function (k) {
          k.allies().forEach(function (u) { k.applyStatus(u, 'schild', Math.round(u.maxHp * 0.06)); });
        } });
      }),

    passiv('kaefergarde_unt1', 'Gardebefehl', 'onStart', [], [],
      'Zu Kampfbeginn +14 % Rüstung für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.def = Math.round(u.def * 1.14); }); }),
    passiv('kaefergarde_unt2', 'Deckung halten', 'onDamaged', ['schild'], [],
      'Jeder vierte Treffer auf den Trupp legt allen ein Schild an — je Mitglied größer',
      function (c) {
        if (!zaehler(c.self, 'kaefergarde_unt2', 4)) return;
        var n = c.allies().length;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.4 * n)); });
      }),
    passiv('kaefergarde_unt3', 'Geschlossene Reihe', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, erleidet der Trupp 18 % weniger Schaden — sonst 7 %',
      function (c) {
        var m = truppFuehrt(c, 'schild') ? 0.18 : 0.07;
        c.allies().forEach(function (u) { u.minderung = Math.max(u.minderung || 0, m); });
      }),
    passiv('kaefergarde_unt4', 'Lebender Wall', 'onStart', ['schild'], [],
      'Die Verbündeten erleiden 25 % weniger Schaden — die Garde selbst greift nicht mehr an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.minderung = Math.max(u.minderung || 0, 0.25); });
        c.self.atk = 1;
      }),

    passiv('kaefergarde_def1', 'Hartschale', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 40 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.4)); }),
    passiv('kaefergarde_def2', 'Ausgehalten', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % und legt Schild nach',
      function (c) {
        if (!zaehler(c.self, 'kaefergarde_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Ausgehalten');
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.12));
      }),
    passiv('kaefergarde_def3', 'Panzerwand', 'onStart', ['schild'], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 11 % ihres Lebens — sonst 17 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.11 : 0.17;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('kaefergarde_def4', 'Nie durchbrochen', 'onStart', ['schild'], [],
      'Solange die Garde ein Schild trägt, erleidet sie halben Schaden — dafür schlägt sie nur noch mit einem Drittel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Nie durchbrochen', fn: function (k) {
          k.self.minderung = (k.self.status.schild || 0) > 0 ? 0.5 : 0;
        } });
        c.self.minderung = 0.5;
      }),
    /* ---- Testarossa: der Blutschatten ---------------------------------------
       Die Urtümliche Weiße. Exekution gibt es schon, aber niemand macht daraus
       eine Kette: bei ihr zahlt jeder Abschuss den nächsten. Sie wird im Kampf
       stärker, ohne dafür Zeit zu brauchen — nur Leichen.                      */

    passiv('testarossa_ang1', 'Todesstreich', 'onHit', ['exekution'], [],
      'Der erste Schlag des Kampfes trifft 150 % härter — gegen ein Ziel unter der Hälfte doppelt so viel',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= c.target.hp < c.target.maxHp * 0.5 ? 5 : 2.5;
      }),
    passiv('testarossa_ang2', 'Blutspur', 'onHit', ['blutung'], [],
      'Jeder dritte Schlag trifft 80 % härter und lässt das Ziel mit 5 bluten',
      function (c) {
        if (!zaehler(c.self, 'testarossa_ang2', 3)) return;
        c.dmg *= 1.8;
        c.applyStatus(c.target, 'blutung', 5);
      }),
    passiv('testarossa_ang3', 'Urteil', 'onHit', ['exekution'], ['exekution'],
      'Führt ein Verbündeter Exekution, richtet sie Ziele unter 45 % Leben dreifach hin — sonst doppelt',
      function (c) {
        if (c.target.hp >= c.target.maxHp * 0.45) return;
        c.dmg *= truppFuehrt(c, 'exekution') ? 3 : 2;
      }),
    passiv('testarossa_ang4', 'Todeskette', 'onKill', ['exekution'], [],
      'Jeder Abschuss gibt dauerhaft +30 % Angriff und einen weiteren Zug — dafür hält sie nur 45 % aus',
      function (c) {
        if (!c.self._kette) {
          c.self._kette = 1;
          c.self.maxHp = Math.round(c.self.maxHp * 0.45);
          c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        }
        c.self.atk = Math.round(c.self.atk * 1.3);
        c.self.gauge = (c.self.gauge || 0) + 100;
      }),

    passiv('testarossa_mec1', 'Kalter Blick', 'onStart', ['exekution'], [],
      'Beginnt den Kampf mit 65 % Rüstungsdurchschlag',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.65); }),
    passiv('testarossa_mec2', 'Gnadenlos', 'onHit', ['exekution'], [],
      'Jeder dritte Schlag nimmt dem Ziel zusätzlich 9 % seines maximalen Lebens',
      function (c) {
        if (!zaehler(c.self, 'testarossa_mec2', 3)) return;
        c.deal(c.target, c.target.maxHp * 0.09, 'Gnadenlos', { pure: true });
      }),
    passiv('testarossa_mec3', 'Ausbluten', 'onHit', ['blutung'], ['blutung'],
      'Führt ein Verbündeter Blutung, lässt jeder Schlag mit 3 bluten und trifft Blutende 22 % härter — sonst 1 Blutung',
      function (c) {
        var mit = truppFuehrt(c, 'blutung');
        if (mit && (c.target.status.blutung || 0) > 0) c.dmg *= 1.22;
        c.applyStatus(c.target, 'blutung', mit ? 3 : 1);
      }),
    passiv('testarossa_mec4', 'Blutschatten', 'onStart', ['exekution'], [],
      'Gegen Ziele unter der Hälfte trifft sie doppelt — gegen volle nur noch halb',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Blutschatten', fn: function (k) {
          k.dmg *= k.target.hp < k.target.maxHp * 0.5 ? 2 : 0.5;
        } });
      }),

    passiv('testarossa_unt1', 'Weiße Herrin', 'onStart', [], [],
      'Zu Kampfbeginn +14 % Angriff für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.14); }); }),
    passiv('testarossa_unt2', 'Hinrichtungsbefehl', 'onDamaged', ['blutung'], [],
      'Jeder vierte Treffer auf den Trupp lässt alle Gegner mit 4 bluten',
      function (c) {
        if (!zaehler(c.self, 'testarossa_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'blutung', 4); });
      }),
    passiv('testarossa_unt3', 'Kein Entkommen', 'onStart', [], ['exekution'],
      'Führt ein Verbündeter Exekution, trifft der Trupp angeschlagene Ziele 32 % härter — sonst 12 %',
      function (c) {
        var m = truppFuehrt(c, 'exekution') ? 1.32 : 1.12;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Kein Entkommen', fn: function (k) {
            if (k.target.hp < k.target.maxHp * 0.5) k.dmg *= m;
          } });
        });
      }),
    passiv('testarossa_unt4', 'Urtümliche Weiße', 'onStart', ['exekution'], [],
      'Der Trupp bekommt 50 % Durchschlag und +20 % Angriff — Testarossa selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.pierce = Math.max(u.pierce || 0, 0.5);
          u.atk = Math.round(u.atk * 1.2);
        });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('testarossa_def1', 'Dämonenhaut', 'onStart', [], [],
      'Beginnt mit einem Schild über 26 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.26)); }),
    passiv('testarossa_def2', 'Blutrausch', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % und gibt dauerhaft +7 Angriff',
      function (c) {
        if (!zaehler(c.self, 'testarossa_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.08, 'Blutrausch');
        c.self.atk += 7;
      }),
    passiv('testarossa_def3', 'Kalte Ruhe', 'onStart', [], ['exekution'],
      'Führt ein Verbündeter Exekution, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'exekution') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('testarossa_def4', 'Letzter Streich', 'onDeath', ['exekution'], [],
      'Fällt Testarossa, richtet sie jeden Gegner unter der Hälfte sofort mit 150 % ihres Angriffs hin',
      function (c) {
        if (c.self._letzter) return;
        c.self._letzter = 1;
        c.foes().forEach(function (f) {
          if (f.hp < f.maxHp * 0.5) c.deal(f, c.self.atk * 1.5, 'Letzter Streich', { pure: true });
        });
      }),

    /* ---- Ultima: die Folter -------------------------------------------------
       Verderbnis erhöht, was beim Ziel ANKOMMT — Ultima ist die einzige, die
       daraus direkt Schaden zieht statt nur zu verstärken. Ihre Linien zahlen
       für jeden Stapel, den irgendjemand angelegt hat.                         */

    passiv('ultima_ang1', 'Seelenzehrung', 'onHit', ['verderbnis'], [],
      'Der erste Schlag des Kampfes trifft 130 % härter und verdirbt jeden Gegner mit 5',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.3;
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 5); });
      }),
    passiv('ultima_ang2', 'Qual', 'onHit', ['verderbnis'], ['verderbnis'],
      'Jeder dritte Schlag nimmt dem Ziel 1,5 % seines maximalen Lebens je Verderbnis-Stapel',
      function (c) {
        if (!zaehler(c.self, 'ultima_ang2', 3)) return;
        var n = c.target.status.verderbnis || 0;
        if (n) c.deal(c.target, c.target.maxHp * Math.min(0.3, 0.015 * n), 'Qual', { pure: true });
      }),
    passiv('ultima_ang3', 'Folterknecht', 'onHit', ['verderbnis'], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, legt jeder Schlag 4 an und trifft Verdorbene 25 % härter — sonst 1',
      function (c) {
        var mit = truppFuehrt(c, 'verderbnis');
        if (mit && (c.target.status.verderbnis || 0) > 0) c.dmg *= 1.25;
        c.applyStatus(c.target, 'verderbnis', mit ? 4 : 1);
      }),
    passiv('ultima_ang4', 'Endlose Pein', 'onStart', ['verderbnis'], [],
      'Jeder Zug verdirbt alle Gegner mit 4 — dafür heilt Ultima nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Endlose Pein', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'verderbnis', 4); });
        } });
      }),

    passiv('ultima_mec1', 'Fluchmal', 'onStart', ['verderbnis'], [],
      'Verdirbt zu Kampfbeginn jeden Gegner mit 6',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 6); }); }),
    passiv('ultima_mec2', 'Vertiefte Wunde', 'onHit', ['verderbnis'], [],
      'Jeder dritte Schlag verdirbt alle Gegner mit 4 nach',
      function (c) {
        if (!zaehler(c.self, 'ultima_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 4); });
      }),
    passiv('ultima_mec3', 'Kein Vergessen', 'onStart', ['verderbnis'], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, baut sich Verderbnis auf Ultimas Zielen nicht mehr ab — sonst legt jeder Treffer 2 nach',
      function (c) {
        var haelt = truppFuehrt(c, 'verderbnis');
        c.addEffect(c.self, { hook: 'onHit', name: 'Kein Vergessen', fn: function (k) {
          if (haelt) k.target.verderbnisBleibt = 1;
          else k.applyStatus(k.target, 'verderbnis', 2);
        } });
      }),
    passiv('ultima_mec4', 'Meisterin der Folter', 'onStart', ['verderbnis'], [],
      'Verderbnis, die Ultima anlegt, fällt doppelt aus — dafür schlägt sie nur noch mit einem Drittel',
      function (c) {
        c.self.fluchmeister = (c.self.fluchmeister || 1) * 2;
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('ultima_unt1', 'Schwarze Herrin', 'onStart', ['verderbnis'], [],
      'Zu Kampfbeginn 4 Verderbnis auf jeden Gegner und +10 % Angriff für den Trupp',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 4); });
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.1); });
      }),
    passiv('ultima_unt2', 'Vergeltung', 'onDamaged', ['verderbnis'], [],
      'Jeder vierte Treffer auf den Trupp verdirbt alle Gegner mit 5',
      function (c) {
        if (!zaehler(c.self, 'ultima_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 5); });
      }),
    passiv('ultima_unt3', 'Gezeichnet', 'onStart', ['verderbnis'], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, verdirbt jeder Treffer des Trupps mit 2 — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'verderbnis') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gezeichnet', fn: function (k) {
            k.applyStatus(k.target, 'verderbnis', n);
          } });
        });
      }),
    passiv('ultima_unt4', 'Urtümliche Schwarze', 'onStart', ['verderbnis'], [],
      'Der Trupp trifft verdorbene Ziele 35 % härter — Ultima selbst greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.2);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Urtümliche Schwarze', fn: function (k) {
            if ((k.target.status.verderbnis || 0) > 0) k.dmg *= 1.35;
          } });
        });
      }),

    passiv('ultima_def1', 'Fluchhaut', 'onStart', [], [],
      'Beginnt mit einem Schild über 28 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.28)); }),
    passiv('ultima_def2', 'Seelenzoll', 'onDamaged', ['heilung'], [],
      'Jeder dritte erlittene Treffer heilt 9 % und verdirbt den Angreifer mit 4',
      function (c) {
        if (!zaehler(c.self, 'ultima_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Seelenzoll');
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'verderbnis', 4);
      }),
    passiv('ultima_def3', 'Unberührbar', 'onStart', [], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'verderbnis') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('ultima_def4', 'Ewige Folter', 'onDeath', ['verderbnis'], [],
      'Steht einmal mit 45 % Leben wieder auf und verdirbt alle Gegner mit 10 — danach heilt sie nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 10); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),
    /* ---- Carrera: die Sprengung ---------------------------------------------
       Brand gibt es zweimal, aber Benimaru und die Drachenwelpe LEGEN Feuer.
       Carrera zündet es: sie wandelt liegende Stapel in einen Schlag um und
       räumt sie dabei ab. Ein Bau, der von der Arbeit anderer lebt.            */

    passiv('carrera_ang1', 'Sprengung', 'onHit', ['brand'], ['brand'],
      'Der erste Schlag des Kampfes zündet jeden brennenden Gegner: 12 Schaden je Brand-Stapel, und das Feuer erlischt dabei',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.foes().forEach(function (f) {
          var b = f.status.brand || 0;
          if (!b) return;
          f.status.brand = 0;
          c.deal(f, b * 12, 'Sprengung', { pure: true });
        });
      }),
    passiv('carrera_ang2', 'Zündschnur', 'onHit', ['brand'], [],
      'Jeder dritte Schlag setzt alle Gegner mit 5 Brand in Flammen und trifft 70 % härter',
      function (c) {
        if (!zaehler(c.self, 'carrera_ang2', 3)) return;
        c.dmg *= 1.7;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 5); });
      }),
    passiv('carrera_ang3', 'Kettendetonation', 'onHit', ['brand'], ['brand'],
      'Führt ein Verbündeter Brand, trifft Carrera brennende Ziele 8 % härter je Stapel — sonst 3 %',
      function (c) {
        var f = truppFuehrt(c, 'brand') ? 0.08 : 0.03;
        c.dmg *= 1 + Math.min(1, f * (c.target.status.brand || 0));
      }),
    passiv('carrera_ang4', 'Alles in die Luft', 'onStart', ['brand'], [],
      'Jeder Zug zündet alle brennenden Gegner für 8 Schaden je Stapel und löscht das Feuer — dafür legt Carrera selbst keins mehr an',
      function (c) {
        c.self.fluchmeister = 0.0001;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Alles in die Luft', fn: function (k) {
          k.foes().forEach(function (f) {
            var b = f.status.brand || 0;
            if (!b) return;
            f.status.brand = 0;
            k.deal(f, b * 8, 'Alles in die Luft', { pure: true });
          });
        } });
      }),

    passiv('carrera_mec1', 'Brandsatz', 'onStart', ['brand'], [],
      'Setzt zu Kampfbeginn jeden Gegner mit 5 Brand in Flammen',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 5); }); }),
    passiv('carrera_mec2', 'Nachlegen', 'onDamaged', ['brand'], [],
      'Jeder dritte erlittene Treffer setzt alle Gegner mit 4 Brand in Flammen',
      function (c) {
        if (!zaehler(c.self, 'carrera_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 4); });
      }),
    passiv('carrera_mec3', 'Verstärkte Ladung', 'onStart', ['brand'], ['brand'],
      'Führt ein Verbündeter Brand, richtet Brand im ganzen Kampf 60 % mehr Schaden an — sonst 25 %',
      function (c) {
        var f = truppFuehrt(c, 'brand') ? 1.6 : 1.25;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Verstärkte Ladung', fn: function (k) {
          k.foes().forEach(function (x) { x.brandFaktor = Math.max(x.brandFaktor || 1, f); });
        } });
        c.foes().forEach(function (x) { x.brandFaktor = Math.max(x.brandFaktor || 1, f); });
      }),
    passiv('carrera_mec4', 'Urtümliche Gelbe', 'onStart', ['brand'], [],
      'Brand richtet auf Carreras Zielen doppelten Schaden an — dafür hält sie nur 55 % aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.55);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onHit', name: 'Urtümliche Gelbe', fn: function (k) {
          k.target.brandFaktor = Math.max(k.target.brandFaktor || 1, 2);
        } });
      }),

    passiv('carrera_unt1', 'Feuerbefehl', 'onStart', ['brand'], [],
      'Zu Kampfbeginn 3 Brand auf jeden Gegner und +12 % Angriff für den Trupp',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 3); });
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.12); });
      }),
    passiv('carrera_unt2', 'Streufeuer', 'onDamaged', ['brand'], [],
      'Jeder vierte Treffer auf den Trupp setzt alle Gegner mit 4 Brand in Flammen',
      function (c) {
        if (!zaehler(c.self, 'carrera_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 4); });
      }),
    passiv('carrera_unt3', 'Gezielte Sprengung', 'onStart', ['brand'], ['brand'],
      'Führt ein Verbündeter Brand, entzündet jeder Treffer des Trupps mit 2 — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'brand') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gezielte Sprengung', fn: function (k) {
            k.applyStatus(k.target, 'brand', n);
          } });
        });
      }),
    passiv('carrera_unt4', 'Flächenbrand', 'onStart', ['brand', 'flaeche'], [],
      'Der Trupp trifft brennende Ziele 30 % härter — Carrera selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Flächenbrand', fn: function (k) {
            if ((k.target.status.brand || 0) > 0) k.dmg *= 1.3;
          } });
        });
      }),

    passiv('carrera_def1', 'Aschehaut', 'onStart', [], [],
      'Beginnt mit einem Schild über 28 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.28)); }),
    passiv('carrera_def2', 'Rückstoß', 'onDamaged', ['brand'], [],
      'Jeder dritte erlittene Treffer heilt 8 % und setzt den Angreifer mit 5 Brand in Flammen',
      function (c) {
        if (!zaehler(c.self, 'carrera_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.08, 'Rückstoß');
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'brand', 5);
      }),
    passiv('carrera_def3', 'Hitzeschild', 'onStart', [], ['brand'],
      'Führt ein Verbündeter Brand, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'brand') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('carrera_def4', 'Selbstzerstörung', 'onDeath', ['brand', 'flaeche'], [],
      'Fällt Carrera, sprengt sie das Feld: 200 % ihres Angriffs auf jeden Gegner, dazu 10 Brand',
      function (c) {
        if (c.self._sprengt) return;
        c.self._sprengt = 1;
        c.foes().forEach(function (f) {
          c.deal(f, c.self.atk * 2, 'Selbstzerstörung', { pure: true });
          c.applyStatus(f, 'brand', 10);
        });
      }),

    /* ---- Dämonengarde: der Klingenschritt -----------------------------------
       Die billige Dämonin. Konter gibt es oft, aber sie kontert nicht als
       Reaktion, sondern im Voraus: sie schlägt zurück, BEVOR der Treffer
       ankommt, und wird mit jedem Austausch schneller.                         */

    passiv('daemonengarde_ang1', 'Klingenschritt', 'onHit', ['konter'], [],
      'Der erste Schlag des Kampfes trifft 110 % härter und gibt dauerhaft +20 % Tempo',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.self.spd = Math.round(c.self.spd * 1.2);
      }),
    passiv('daemonengarde_ang2', 'Doppelschritt', 'onHit', ['konter'], [],
      'Jeder dritte Schlag schlägt sofort ein zweites Mal für 90 %',
      function (c) {
        if (!zaehler(c.self, 'daemonengarde_ang2', 3)) return;
        c.deal(c.target, c.self.atk * 0.9, 'Doppelschritt');
      }),
    passiv('daemonengarde_ang3', 'Vorwegnahme', 'onHit', [], ['konter'],
      'Führt ein Verbündeter Konter, schlägt die Garde 6 % härter je erlittenem Treffer — höchstens doppelt, sonst die Hälfte davon',
      function (c) {
        var f = truppFuehrt(c, 'konter') ? 0.06 : 0.03;
        c.dmg *= 1 + Math.min(1, f * (c.self._treffer || 0));
      }),
    passiv('daemonengarde_ang4', 'Klingentanz', 'onStart', ['konter'], [],
      'Jeder erlittene Treffer gibt dauerhaft +6 % Tempo und Angriff — dafür hält die Garde nur die Hälfte aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Klingentanz', fn: function (k) {
          k.self.spd = Math.round(k.self.spd * 1.06);
          k.self.atk = Math.round(k.self.atk * 1.06);
        } });
      }),

    passiv('daemonengarde_mec1', 'Gegenklinge', 'onDamaged', ['konter'], [],
      'Jeder Treffer wird mit 26 % des Angriffs beantwortet',
      function (c) {
        c.self._treffer = (c.self._treffer || 0) + 1;
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * 0.26, 'Gegenklinge');
      }),
    passiv('daemonengarde_mec2', 'Wirbel', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer kontert ALLE Gegner',
      function (c) {
        if (!zaehler(c.self, 'daemonengarde_mec2', 3)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.5, 'Wirbel'); });
      }),
    passiv('daemonengarde_mec3', 'Schnellere Klinge', 'onStart', ['tempo'], ['konter'],
      'Führt ein Verbündeter Konter, bekommt die Garde +35 % Tempo — sonst +12 %',
      function (c) {
        c.self.spd = Math.round(c.self.spd * (truppFuehrt(c, 'konter') ? 1.35 : 1.12));
      }),
    passiv('daemonengarde_mec4', 'Klingensturm', 'onStart', ['konter'], [],
      'Die Garde kontert jeden Treffer mit 70 % ihres Angriffs — dafür schlägt sie selbst nur halb so hart',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.5);
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Klingensturm', fn: function (k) {
          var f = k.foes()[0];
          if (f) k.deal(f, k.self.atk * 1.4, 'Klingensturm');
        } });
      }),

    passiv('daemonengarde_unt1', 'Gardeschritt', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +14 % Tempo für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.14); }); }),
    passiv('daemonengarde_unt2', 'Deckungsklinge', 'onDamaged', ['konter'], [],
      'Jeder vierte Treffer auf den Trupp lässt alle Verbündeten zurückschlagen',
      function (c) {
        if (!zaehler(c.self, 'daemonengarde_unt2', 4)) return;
        var f = c.foes()[0];
        if (!f) return;
        c.allies().forEach(function (u) { c.deal(f, u.atk * 0.35, 'Deckungsklinge'); });
      }),
    passiv('daemonengarde_unt3', 'Gleicher Schritt', 'onStart', ['konter'], ['konter'],
      'Führt ein Verbündeter Konter, schlägt der ganze Trupp mit 20 % zurück — sonst mit 8 %',
      function (c) {
        var m = truppFuehrt(c, 'konter') ? 0.2 : 0.08;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onDamaged', name: 'Gleicher Schritt', fn: function (k) {
            var f = k.foes()[0];
            if (f) k.deal(f, k.self.atk * m, 'Gleicher Schritt');
          } });
        });
      }),
    passiv('daemonengarde_unt4', 'Leibgarde der Urtümlichen', 'onStart', ['konter'], [],
      'Die Verbündeten bekommen +25 % Tempo und Angriff — die Garde selbst greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.spd = Math.round(u.spd * 1.25);
          u.atk = Math.round(u.atk * 1.25);
        });
        c.self.atk = Math.round(c.self.atk * 0.2);
      }),

    passiv('daemonengarde_def1', 'Gardepanzer', 'onStart', [], [],
      'Beginnt mit einem Schild über 30 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3)); }),
    passiv('daemonengarde_def2', 'Ausweichschritt', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % und gibt +6 % Tempo',
      function (c) {
        if (!zaehler(c.self, 'daemonengarde_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Ausweichschritt');
        c.self.spd = Math.round(c.self.spd * 1.06);
      }),
    passiv('daemonengarde_def3', 'Klingenwall', 'onStart', [], ['konter'],
      'Führt ein Verbündeter Konter, kostet kein Treffer mehr als 13 % ihres Lebens — sonst 19 %',
      function (c) {
        var d = truppFuehrt(c, 'konter') ? 0.13 : 0.19;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('daemonengarde_def4', 'Unaufhaltsam', 'onStart', ['tempo'], [],
      'Die Garde erleidet 3 % weniger Schaden je erlittenem Treffer — höchstens 45 %, dafür heilt sie nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Unaufhaltsam', fn: function (k) {
          k.self._treffer = (k.self._treffer || 0) + 1;
          k.self.minderung = Math.min(0.45, 0.03 * k.self._treffer);
        } });
      }),
    /* ---- Drachenwelpe: der junge Drache -------------------------------------
       Brand als Wachstum statt als Werkzeug: der Welpe wird mit jedem
       entzündeten Gegner stärker und behält es. Wo Carrera Feuer verbraucht und
       Benimaru es beherrscht, FRISST der Welpe es und wächst.                  */

    passiv('drachenwelpe_ang1', 'Glutatem', 'onHit', ['brand'], [],
      'Der erste Schlag des Kampfes trifft 110 % härter und setzt alle Gegner mit 4 Brand in Flammen',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 4); });
      }),
    passiv('drachenwelpe_ang2', 'Wachsende Glut', 'onHit', ['brand'], [],
      'Jeder dritte Schlag gegen ein brennendes Ziel gibt dauerhaft +10 % Angriff',
      function (c) {
        if ((c.target.status.brand || 0) <= 0) return;
        if (!zaehler(c.self, 'drachenwelpe_ang2', 3)) return;
        c.self.atk = Math.round(c.self.atk * 1.1);
      }),
    passiv('drachenwelpe_ang3', 'Junger Zorn', 'onHit', [], ['brand'],
      'Führt ein Verbündeter Brand, trifft der Welpe brennende Ziele 30 % härter — sonst 12 %',
      function (c) {
        if ((c.target.status.brand || 0) <= 0) return;
        c.dmg *= truppFuehrt(c, 'brand') ? 1.3 : 1.12;
      }),
    passiv('drachenwelpe_ang4', 'Ausgewachsen', 'onStart', ['brand'], [],
      'Der Welpe wächst mit jedem eigenen Zug um 7 % Angriff und Leben — dafür beginnt er mit halbem Leben',
      function (c) {
        c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Ausgewachsen', fn: function (k) {
          k.self.atk = Math.round(k.self.atk * 1.07);
          var mehr = Math.round(k.self.maxHp * 0.07);
          k.self.maxHp += mehr; k.self.hp += mehr;
        } });
      }),

    passiv('drachenwelpe_mec1', 'Feueratem', 'onStart', ['brand'], [],
      'Setzt zu Kampfbeginn jeden Gegner mit 5 Brand in Flammen',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 5); }); }),
    passiv('drachenwelpe_mec2', 'Übergreifendes Feuer', 'onHit', ['brand'], [],
      'Jeder dritte Schlag trägt 4 Brand auf alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'drachenwelpe_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 4); });
      }),
    passiv('drachenwelpe_mec3', 'Gefräßig', 'onTurnStart', ['heilung'], ['brand'],
      'Führt ein Verbündeter Brand, heilt der Welpe jeden Zug 1 % je Brand-Stapel auf dem Feld — sonst halb so viel',
      function (c) {
        var n = 0;
        c.foes().forEach(function (f) { n += f.status.brand || 0; });
        if (!n) return;
        var f = Math.min(0.12, 0.01 * n) * (truppFuehrt(c, 'brand') ? 1 : 0.5);
        c.heal(c.self, c.self.maxHp * f, 'Gefräßig');
      }),
    passiv('drachenwelpe_mec4', 'Drachenwuchs', 'onKill', ['brand'], [],
      'Jeder Abschuss gibt dauerhaft +25 % Angriff und Leben — dafür schlägt der Welpe zu Beginn nur mit der Hälfte',
      function (c) {
        if (!c.self._wuchs) { c.self._wuchs = 1; c.self.atk = Math.round(c.self.atk * 0.5); }
        c.self.atk = Math.round(c.self.atk * 1.25);
        var mehr = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += mehr; c.self.hp += mehr;
      }),

    passiv('drachenwelpe_unt1', 'Nestwärme', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Angriff und +8 % Leben für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          var mehr = Math.round(u.maxHp * 0.08);
          u.maxHp += mehr; u.hp += mehr;
        });
      }),
    passiv('drachenwelpe_unt2', 'Zorniges Fauchen', 'onDamaged', ['brand'], [],
      'Jeder vierte Treffer auf den Trupp setzt alle Gegner mit 4 Brand in Flammen',
      function (c) {
        if (!zaehler(c.self, 'drachenwelpe_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 4); });
      }),
    passiv('drachenwelpe_unt3', 'Geteilte Glut', 'onStart', [], ['brand'],
      'Führt ein Verbündeter Brand, entzündet jeder Treffer des Trupps mit 2 — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'brand') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Geteilte Glut', fn: function (k) {
            k.applyStatus(k.target, 'brand', n);
          } });
        });
      }),
    passiv('drachenwelpe_unt4', 'Drachenblut für alle', 'onStart', [], [],
      'Der Trupp wächst mit jedem Zug des Welpen um 4 % Angriff — er selbst greift nur noch mit einem Drittel an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Drachenblut für alle', fn: function (k) {
          k.allies().forEach(function (u) {
            if (u !== k.self) u.atk = Math.round(u.atk * 1.04);
          });
        } });
      }),

    passiv('drachenwelpe_def1', 'Weiche Schuppen', 'onStart', [], [],
      'Beginnt mit einem Schild über 30 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3)); }),
    passiv('drachenwelpe_def2', 'Zäher Wurf', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'drachenwelpe_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Zäher Wurf');
      }),
    passiv('drachenwelpe_def3', 'Härtende Haut', 'onStart', [], ['brand'],
      'Führt ein Verbündeter Brand, kostet kein Treffer mehr als 14 % seines Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'brand') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('drachenwelpe_def4', 'Häutung', 'onDeath', ['brand'], [],
      'Steht einmal mit 50 % Leben und doppeltem Angriff wieder auf — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.self.atk = Math.round(c.self.atk * 2);
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Wight-König: das Grabesheer ----------------------------------------
       Untote heilen, aber der Wight-König ist der einzige, dessen Heilung an
       GEFALLENEN hängt statt an Verwundeten. Je mehr der Trupp verliert, desto
       stärker wird er — der einzige Bau, für den ein Toter kein reiner Verlust
       ist.                                                                     */

    passiv('wightkoenig_ang1', 'Grabesgriff', 'onHit', ['heilung'], [],
      'Der erste Schlag des Kampfes trifft 120 % härter und heilt den König um die Hälfte des Schadens',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.2;
        c.self.lifesteal = Math.max(c.self.lifesteal || 0, 0.5);
      }),
    passiv('wightkoenig_ang2', 'Totenzorn', 'onHit', [], [],
      'Jeder dritte Schlag trifft 60 % härter, plus 25 % je gefallenem Verbündeten',
      function (c) {
        if (!zaehler(c.self, 'wightkoenig_ang2', 3)) return;
        c.dmg *= 1.6 + 0.25 * (c.self._tote || 0);
      }),
    passiv('wightkoenig_ang3', 'Herr der Toten', 'onHit', [], ['heilung'],
      'Führt ein Verbündeter Heilung, schlägt der König 8 % härter je fehlendem Zehntel seines Lebens — sonst 3 %',
      function (c) {
        var fehlt = 1 - c.self.hp / c.self.maxHp;
        c.dmg *= 1 + (truppFuehrt(c, 'heilung') ? 0.8 : 0.3) * fehlt;
      }),
    passiv('wightkoenig_ang4', 'Totenheer', 'onAllyDeath', ['heilung'], [],
      'Jeder gefallene Verbündete gibt dem König dauerhaft +40 % Angriff und heilt ihn voll — dafür heilt ihn sonst nichts mehr',
      function (c) {
        if (!c.self._heer) { c.self._heer = 1; c.self.heilfaktor = -1; c.self.regen = 0; }
        c.self.atk = Math.round(c.self.atk * 1.4);
        c.self.hp = c.self.maxHp;
      }),

    passiv('wightkoenig_mec1', 'Grabesmacht', 'onStart', ['heilung'], [],
      'Beginnt den Kampf mit +8 Regeneration und 25 % Lebensraub',
      function (c) {
        c.self.regen += 8;
        c.self.lifesteal = Math.max(c.self.lifesteal || 0, 0.25);
      }),
    passiv('wightkoenig_mec2', 'Seelenzoll', 'onDamaged', ['heilung'], [],
      'Jeder dritte erlittene Treffer heilt den König um 12 %',
      function (c) {
        if (!zaehler(c.self, 'wightkoenig_mec2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.12, 'Seelenzoll');
      }),
    passiv('wightkoenig_mec3', 'Unlebendig', 'onStart', ['heilung'], ['heilung'],
      'Führt ein Verbündeter Heilung, wirkt jede Heilung am König 60 % stärker — sonst 20 %',
      function (c) { c.self.heilfaktor += truppFuehrt(c, 'heilung') ? 0.6 : 0.2; }),
    passiv('wightkoenig_mec4', 'Unsterblich', 'onStart', [], [],
      'Kein Treffer kostet den König mehr als 9 % seines Lebens — dafür schlägt er nur noch mit einem Drittel',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.09);
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('wightkoenig_unt1', 'Königsgebot', 'onStart', ['heilung'], [],
      'Zu Kampfbeginn +10 % Angriff und +5 Regeneration für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.1); u.regen += 5; });
      }),
    passiv('wightkoenig_unt2', 'Aus dem Grab', 'onAllyDeath', ['heilung'], [],
      'Fällt ein Verbündeter, heilt der ganze übrige Trupp um 20 % und schlägt dauerhaft 10 % härter',
      function (c) {
        c.allies().forEach(function (u) {
          c.heal(u, u.maxHp * 0.2, 'Aus dem Grab');
          u.atk = Math.round(u.atk * 1.1);
        });
      }),
    passiv('wightkoenig_unt3', 'Totenwache', 'onStart', [], ['heilung'],
      'Führt ein Verbündeter Heilung, regeneriert der Trupp +8 — sonst +3',
      function (c) {
        var n = truppFuehrt(c, 'heilung') ? 8 : 3;
        c.allies().forEach(function (u) { u.regen += n; });
      }),
    passiv('wightkoenig_unt4', 'Grabesheer', 'onStart', ['heilung'], [],
      'Der Trupp heilt 45 % stärker und bekommt +15 % Leben — der König greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.heilfaktor += 0.45;
          var mehr = Math.round(u.maxHp * 0.15);
          u.maxHp += mehr; u.hp += mehr;
        });
        c.self.atk = Math.round(c.self.atk * 0.2);
      }),

    passiv('wightkoenig_def1', 'Königsmantel', 'onStart', [], [],
      'Beginnt mit einem Schild über 34 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.34)); }),
    passiv('wightkoenig_def2', 'Knochenmark', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 11 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'wightkoenig_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.11, 'Knochenmark');
      }),
    passiv('wightkoenig_def3', 'Grabesschild', 'onStart', ['schild'], ['heilung'],
      'Führt ein Verbündeter Heilung, kostet kein Treffer mehr als 13 % seines Lebens — sonst 19 %',
      function (c) {
        var d = truppFuehrt(c, 'heilung') ? 0.13 : 0.19;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('wightkoenig_def4', 'Der König kehrt zurück', 'onDeath', ['heilung'], [],
      'Steht einmal mit 50 % Leben wieder auf und heilt den Trupp um 25 % — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.25, 'Der König kehrt zurück'); });
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),


    /* ---- Geld, der Orkkönig: die Deckung ------------------------------------
       Er hat sein eigenes Volk gefressen und trägt seitdem dessen Hunger. Als
       König richtet er ihn nach innen: er zieht den Schaden seiner Reihe auf
       sich — die einzige Einheit im Spiel, die das UNABHÄNGIG von der
       Aufstellung tut. Die Deckung des Kampfsystems hängt an Platz 3; Geld
       nimmt jedem etwas ab, egal wo er steht. Dafür ist er allein nichts wert.  */

    passiv('geld_ang1', 'Hungrige Faust', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 110 % härter und heilt Geld um ein Drittel des Schadens',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.self.lifesteal = Math.max(c.self.lifesteal || 0, 0.33);
      }),
    passiv('geld_ang2', 'Vergolten', 'onHit', [], [],
      'Jeder dritte Schlag trifft 8 % härter je erlittenem Treffer — höchstens doppelt',
      function (c) {
        if (!zaehler(c.self, 'geld_ang2', 3)) return;
        c.dmg *= 1 + Math.min(1, 0.08 * (c.self._genommen || 0));
      }),
    passiv('geld_ang3', 'Königsfaust', 'onHit', [], ['schild'],
      'Führt ein Verbündeter Schild, schlägt Geld 30 % härter — sonst 10 %',
      function (c) { c.dmg *= truppFuehrt(c, 'schild') ? 1.3 : 1.1; }),
    passiv('geld_ang4', 'Ausgehungert', 'onStart', [], [],
      'Geld schlägt 6 % härter je 10 % fehlendem Leben — dafür heilt ihn nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onHit', name: 'Ausgehungert', fn: function (k) {
          k.dmg *= 1 + 0.6 * (1 - k.self.hp / k.self.maxHp);
        } });
      }),

    passiv('geld_mec1', 'Schild des Königs', 'onStart', ['schild'], [],
      'Nimmt jedem Verbündeten 22 % jedes Treffers ab — unabhängig von der Aufstellung',
      function (c) { koenigsdeckung(c, 0.22); }),
    passiv('geld_mec2', 'Sattgefressen', 'onDamaged', ['heilung'], [],
      'Jeder dritte erlittene Treffer heilt Geld um 12 % seines Lebens',
      function (c) {
        c.self._genommen = (c.self._genommen || 0) + 1;
        if (!zaehler(c.self, 'geld_mec2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.12, 'Sattgefressen');
      }),
    passiv('geld_mec3', 'Lastenträger', 'onStart', ['schild'], ['schild'],
      'Führt ein Verbündeter Schild, nimmt Geld 35 % jedes Treffers ab — sonst 15 %',
      function (c) { koenigsdeckung(c, truppFuehrt(c, 'schild') ? 0.35 : 0.15); }),
    passiv('geld_mec4', 'Alles auf mich', 'onStart', ['schild'], [],
      'Geld nimmt jedem Verbündeten die Hälfte jedes Treffers ab — dafür schlägt er nur noch mit einem Viertel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.25);
        koenigsdeckung(c, 0.5);
      }),

    passiv('geld_unt1', 'Königswort', 'onStart', [], [],
      'Zu Kampfbeginn +14 % Leben für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          var mehr = Math.round(u.maxHp * 0.14);
          u.maxHp += mehr; u.hp += mehr;
        });
      }),
    passiv('geld_unt2', 'Sammelt euch', 'onDamaged', ['schild'], [],
      'Jeder vierte Treffer auf den Trupp legt allen ein Schild über 12 % ihres Lebens an',
      function (c) {
        c.self._genommen = (c.self._genommen || 0) + 1;
        if (!zaehler(c.self, 'geld_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(u.maxHp * 0.12)); });
      }),
    passiv('geld_unt3', 'Schutzherr', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, erleidet der Trupp 16 % weniger Schaden — sonst 6 %',
      function (c) {
        var m = truppFuehrt(c, 'schild') ? 0.16 : 0.06;
        c.allies().forEach(function (u) { if (u !== c.self) u.minderung = Math.max(u.minderung || 0, m); });
      }),
    passiv('geld_unt4', 'Orkkönig', 'onStart', [], [],
      'Der Trupp bekommt +30 % Leben — Geld selbst greift nicht mehr an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          var mehr = Math.round(u.maxHp * 0.3);
          u.maxHp += mehr; u.hp += mehr;
        });
        c.self.atk = 1;
      }),

    passiv('geld_def1', 'Fettpanzer', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 38 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.38)); }),
    passiv('geld_def2', 'Zäher Wanst', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 11 % seines Lebens',
      function (c) {
        c.self._genommen = (c.self._genommen || 0) + 1;
        if (!zaehler(c.self, 'geld_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.11, 'Zäher Wanst');
      }),
    passiv('geld_def3', 'Unverdaulich', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 12 % seines Lebens — sonst 18 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.12 : 0.18;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('geld_def4', 'Der König steht', 'onDeath', ['schild'], [],
      'Fällt Geld, bekommt jeder Verbündete ein Schild über 40 % seines Lebens — sein letzter Dienst',
      function (c) {
        if (c.self._letzter) return;
        c.self._letzter = 1;
        c.allies().forEach(function (u) {
          if (u !== c.self) c.applyStatus(u, 'schild', Math.round(u.maxHp * 0.4));
        });
      }),

    /* ---- Orkkrieger: die Masse ----------------------------------------------
       Der billigste Frontkämpfer im Spiel und das genaue Gegenteil seines
       Königs: er nimmt niemandem etwas ab, er teilt aus und fällt. Seine Linien
       zahlen für Wunden, nicht für Deckung.                                    */

    passiv('orkkrieger_ang1', 'Ansturm', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 130 % härter',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.3;
      }),
    passiv('orkkrieger_ang2', 'Wundwut', 'onHit', [], [],
      'Jeder dritte Schlag trifft 10 % härter je 10 % fehlendem Leben',
      function (c) {
        if (!zaehler(c.self, 'orkkrieger_ang2', 3)) return;
        c.dmg *= 1 + (1 - c.self.hp / c.self.maxHp);
      }),
    passiv('orkkrieger_ang3', 'Schlachtruf', 'onHit', [], ['tempo'],
      'Führt ein Verbündeter Tempo, schlägt der Krieger 28 % härter — sonst 10 %',
      function (c) { c.dmg *= truppFuehrt(c, 'tempo') ? 1.28 : 1.1; }),
    passiv('orkkrieger_ang4', 'Blutgier', 'onStart', ['exekution'], [],
      'Jeder Abschuss gibt dauerhaft +35 % Angriff — dafür hält der Krieger nur die Hälfte aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onKill', name: 'Blutgier', fn: function (k) {
          k.self.atk = Math.round(k.self.atk * 1.35);
        } });
      }),

    passiv('orkkrieger_mec1', 'Grobschlächtig', 'onStart', [], [],
      'Beginnt den Kampf mit +10 Angriff und 40 % Rüstungsdurchschlag',
      function (c) {
        c.self.atk += 10;
        c.self.pierce = Math.max(c.self.pierce || 0, 0.4);
      }),
    passiv('orkkrieger_mec2', 'Nachsetzen', 'onHit', [], [],
      'Jeder dritte Schlag schlägt sofort ein zweites Mal für 80 %',
      function (c) {
        if (!zaehler(c.self, 'orkkrieger_mec2', 3)) return;
        c.deal(c.target, c.self.atk * 0.8, 'Nachsetzen');
      }),
    passiv('orkkrieger_mec3', 'Keine Deckung', 'onStart', [], ['exekution'],
      'Führt ein Verbündeter Exekution, ignoriert der Krieger jede Rüstung — sonst die Hälfte',
      function (c) {
        c.self.pierce = Math.max(c.self.pierce || 0, truppFuehrt(c, 'exekution') ? 1 : 0.5);
      }),
    passiv('orkkrieger_mec4', 'Berserker', 'onStart', [], [],
      'Der Krieger schlägt doppelt so hart — und erleidet 40 % mehr Schaden',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 2);
        c.self.minderung = -0.4;
      }),

    passiv('orkkrieger_unt1', 'Kriegsgeschrei', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Angriff für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.12); }); }),
    passiv('orkkrieger_unt2', 'Angestachelt', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen dauerhaft +7 Angriff',
      function (c) {
        if (!zaehler(c.self, 'orkkrieger_unt2', 4)) return;
        c.allies().forEach(function (u) { u.atk += 7; });
      }),
    passiv('orkkrieger_unt3', 'Vorwärts', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, bekommt der Trupp +18 % Tempo — sonst +7 %',
      function (c) {
        var f = truppFuehrt(c, 'tempo') ? 1.18 : 1.07;
        c.allies().forEach(function (u) { u.spd = Math.round(u.spd * f); });
      }),
    passiv('orkkrieger_unt4', 'Sturmspitze', 'onStart', [], [],
      'Die Verbündeten schlagen 25 % härter — der Krieger hält nur noch ein Drittel aus',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.atk = Math.round(u.atk * 1.25); });
        c.self.maxHp = Math.round(c.self.maxHp * 0.34);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('orkkrieger_def1', 'Grobe Haut', 'onStart', [], [],
      'Beginnt mit einem Schild über 26 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.26)); }),
    passiv('orkkrieger_def2', 'Weggesteckt', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % und gibt dauerhaft +5 Angriff',
      function (c) {
        if (!zaehler(c.self, 'orkkrieger_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Weggesteckt');
        c.self.atk += 5;
      }),
    passiv('orkkrieger_def3', 'Dickschädel', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 15 % seines Lebens — sonst 21 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.15 : 0.21;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('orkkrieger_def4', 'Letzter Ansturm', 'onDeath', [], [],
      'Fällt der Krieger, schlägt er jeden Gegner ein letztes Mal für 180 % seines Angriffs',
      function (c) {
        if (c.self._letzter) return;
        c.self._letzter = 1;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 1.8, 'Letzter Ansturm'); });
      }),

    /* ---- Bestienkrieger: Instinkt -------------------------------------------
       Eurazanias Drei. Sie tragen keine Magie und legen keinen Zustand an — was
       sie ausmacht, ist die REAKTION auf den Kampfverlauf. Phobio reagiert auf
       erlittenen Schaden, Albis auf gefallene Gegner, Suphia auf verwundete
       Verbündete. Das ist die Art-Identität: nicht was sie tun, sondern worauf. */

    passiv('phobio_ang1', 'Aufgebracht', 'onDamaged', [], [],
      'Der erste erlittene Treffer bringt Phobio auf: dauerhaft +35 % Angriff und +25 % Tempo',
      function (c) {
        if (c.self._auf1) return;
        c.self._auf1 = 1;
        c.self.atk = Math.round(c.self.atk * 1.35);
        c.self.spd = Math.round(c.self.spd * 1.25);
      }),
    passiv('phobio_ang2', 'Ungestüm', 'onHit', [], [],
      'Jeder Schlag schwankt wild: zwischen 55 % und 175 % — im Mittel etwas mehr, aber nie verlässlich',
      function (c) { c.dmg *= 0.55 + c.rng() * 1.2; }),
    passiv('phobio_ang3', 'Raubtiersprung', 'onHit', ['exekution'], ['exekution'],
      'Führt ein Verbündeter Exekution, springt Phobio zusätzlich für 80 % auf das schwächste Ziel — sonst für 30 %',
      function (c) {
        var f = schwaechstes(c.foes(), function (x) { return x.hp; });
        if (f && f !== c.target) c.deal(f, c.self.atk * (truppFuehrt(c, 'exekution') ? 0.8 : 0.3), 'Raubtiersprung');
      }),
    passiv('phobio_ang4', 'Blinde Raserei', 'onStart', [], [],
      'Phobio schlägt 70 % härter, weicht aber keinem Schlag mehr aus und erleidet 30 % mehr Schaden',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 1.7);
        c.self.minderung = -0.3;
      }),

    passiv('phobio_mec1', 'Panthersinne', 'onStart', ['tempo'], [],
      'Beginnt den Kampf mit +30 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.3); }),
    passiv('phobio_mec2', 'Angestachelt', 'onDamaged', ['tempo'], [],
      'Jeder dritte erlittene Treffer gibt dauerhaft +12 % Tempo und +8 % Angriff',
      function (c) {
        if (!zaehler(c.self, 'phobio_mec2', 3)) return;
        c.self.spd = Math.round(c.self.spd * 1.12);
        c.self.atk = Math.round(c.self.atk * 1.08);
      }),
    passiv('phobio_mec3', 'Reißzahn', 'onHit', ['blutung'], ['blutung'],
      'Führt ein Verbündeter Blutung, lässt jeder Schlag mit 3 bluten — sonst mit 1',
      function (c) { c.applyStatus(c.target, 'blutung', truppFuehrt(c, 'blutung') ? 3 : 1); }),
    passiv('phobio_mec4', 'Ausser Kontrolle', 'onStart', [], [],
      'Phobio greift in jedem Zug ein zweites Mal an — dafür trifft er nur noch mit 60 % Schaden',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Ausser Kontrolle', fn: function (k) {
          if (k.self._doppelt) return;
          k.self._doppelt = 1;
          k.dmg *= 0.6;
          k.deal(k.target, k.dmg, 'Ausser Kontrolle');
          k.self._doppelt = 0;
        } });
      }),

    passiv('phobio_unt1', 'Jagdruf des Panthers', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +13 % Tempo für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.13); }); }),
    passiv('phobio_unt2', 'Wut im Rudel', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen dauerhaft +8 % Angriff',
      function (c) {
        if (!zaehler(c.self, 'phobio_unt2', 4)) return;
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.08); });
      }),
    passiv('phobio_unt3', 'Hetze', 'onStart', [], ['exekution'],
      'Führt ein Verbündeter Exekution, trifft der Trupp angeschlagene Ziele 30 % härter — sonst 12 %',
      function (c) {
        var m = truppFuehrt(c, 'exekution') ? 1.3 : 1.12;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Hetze', fn: function (k) {
            if (k.target.hp < k.target.maxHp * 0.5) k.dmg *= m;
          } });
        });
      }),
    passiv('phobio_unt4', 'Voran, alle!', 'onStart', ['tempo'], [],
      'Der Trupp bekommt +30 % Tempo — Phobio selbst erleidet 40 % mehr Schaden',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.spd = Math.round(u.spd * 1.3); });
        c.self.minderung = -0.4;
      }),

    passiv('phobio_def1', 'Geschmeidig', 'onStart', ['schild', 'tempo'], [],
      'Beginnt mit Schild über 24 % seines Lebens und +15 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.24));
        c.self.spd = Math.round(c.self.spd * 1.15);
      }),
    passiv('phobio_def2', 'Zäher Kater', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'phobio_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Zäher Kater');
      }),
    passiv('phobio_def3', 'Instinkt', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 14 % seines Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('phobio_def4', 'Nie am Boden', 'onDeath', [], [],
      'Steht einmal mit 35 % Leben und doppeltem Tempo wieder auf — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.35);
        c.self.spd = Math.round(c.self.spd * 2);
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* -- Albis: die kalte Schlange. Sie reagiert auf gefallene Gegner. -- */

    passiv('albis_ang1', 'Kaltblütig', 'onKill', [], [],
      'Jeder gefallene Gegner gibt Albis dauerhaft +20 % Angriff und 15 % Durchschlag',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 1.2);
        c.self.pierce = Math.min(1, (c.self.pierce || 0) + 0.15);
      }),
    passiv('albis_ang2', 'Präzise', 'onHit', [], [],
      'Jeder dritte Schuss ignoriert die Rüstung vollständig und trifft 70 % härter',
      function (c) {
        if (!zaehler(c.self, 'albis_ang2', 3)) return;
        c.dmg *= 1.7;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('albis_ang3', 'Schlangenblick', 'onHit', ['verwundbar'], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, markiert jeder dritte Schuss mit 4 — sonst mit 1',
      function (c) {
        if (!zaehler(c.self, 'albis_ang3', 3)) return;
        c.markiere(c.target, truppFuehrt(c, 'verwundbar') ? 4 : 1);
      }),
    passiv('albis_ang4', 'Ohne Regung', 'onStart', ['exekution'], [],
      'Albis ignoriert jede Rüstung — dafür hält sie nur die Hälfte aus',
      function (c) {
        c.self.pierce = 1;
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('albis_mec1', 'Gift der Weißen', 'onStart', ['gift'], [],
      'Vergiftet zu Kampfbeginn jeden Gegner mit 5',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 5); }); }),
    passiv('albis_mec2', 'Nachgesetzt', 'onKill', ['gift'], [],
      'Jeder gefallene Gegner vergiftet alle übrigen mit 6',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 6); }); }),
    passiv('albis_mec3', 'Umklammerung', 'onHit', ['gift'], ['gift'],
      'Führt ein Verbündeter Gift, vergiftet jeder Schuss mit 3 — sonst mit 1',
      function (c) { c.applyStatus(c.target, 'gift', truppFuehrt(c, 'gift') ? 3 : 1); }),
    passiv('albis_mec4', 'Berechnend', 'onStart', ['exekution'], [],
      'Albis trifft angeschlagene Ziele doppelt — volle nur noch halb',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Berechnend', fn: function (k) {
          k.dmg *= k.target.hp < k.target.maxHp * 0.5 ? 2 : 0.5;
        } });
      }),

    passiv('albis_unt1', 'Kühler Kopf', 'onStart', [], [],
      'Zu Kampfbeginn +20 % Durchschlag und +8 % Angriff für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.pierce = Math.max(u.pierce || 0, 0.2);
          u.atk = Math.round(u.atk * 1.08);
        });
      }),
    passiv('albis_unt2', 'Aasgeruch', 'onKill', [], [],
      'Jeder gefallene Gegner gibt dem ganzen Trupp dauerhaft +8 % Angriff',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.08); }); }),
    passiv('albis_unt3', 'Gezeichnete Beute', 'onStart', [], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, trifft der Trupp markierte Ziele 30 % härter — sonst 12 %',
      function (c) {
        var m = truppFuehrt(c, 'verwundbar') ? 1.3 : 1.12;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gezeichnete Beute', fn: function (k) {
            if ((k.target.status.verwundbar || 0) > 0) k.dmg *= m;
          } });
        });
      }),
    passiv('albis_unt4', 'Weiße Herrin', 'onStart', ['exekution'], [],
      'Der Trupp bekommt 45 % Durchschlag — Albis selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.pierce = Math.max(u.pierce || 0, 0.45); });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('albis_def1', 'Schuppenkleid', 'onStart', [], [],
      'Beginnt mit einem Schild über 26 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.26)); }),
    passiv('albis_def2', 'Häutung', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % ihres Lebens',
      function (c) {
        if (!zaehler(c.self, 'albis_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Häutung');
      }),
    passiv('albis_def3', 'Auf Distanz', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('albis_def4', 'Totstellen', 'onDeath', [], [],
      'Steht einmal mit 30 % Leben und doppeltem Angriff wieder auf — danach heilt sie nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.3);
        c.self.atk = Math.round(c.self.atk * 2);
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* -- Suphia: der wachsame Tiger. Sie reagiert auf verwundete Verbündete. -- */

    passiv('suphia_ang1', 'Wachsamer Schlag', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 100 % härter, plus 20 % je verwundetem Verbündeten',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        var wund = c.allies().filter(function (u) { return u.hp < u.maxHp * 0.9; }).length;
        c.dmg *= 2 + 0.2 * wund;
      }),
    passiv('suphia_ang2', 'Beschützerzorn', 'onHit', [], [],
      'Jeder dritte Schlag trifft 15 % härter je verwundetem Verbündeten',
      function (c) {
        if (!zaehler(c.self, 'suphia_ang2', 3)) return;
        var wund = c.allies().filter(function (u) { return u.hp < u.maxHp * 0.9; }).length;
        c.dmg *= 1 + 0.15 * wund;
      }),
    passiv('suphia_ang3', 'Vergeltung', 'onStart', ['konter'], ['konter'],
      'Führt ein Verbündeter Konter, schlägt Suphia für jeden Treffer auf den Trupp mit 30 % zurück — sonst mit 12 %',
      function (c) {
        var m = truppFuehrt(c, 'konter') ? 0.3 : 0.12;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onDamaged', name: 'Vergeltung', fn: function (k) {
            var f = k.foes()[0];
            if (f) k.deal(f, c.self.atk * m, 'Vergeltung');
          } });
        });
      }),
    passiv('suphia_ang4', 'Goldener Zorn', 'onAllyDeath', [], [],
      'Jeder gefallene Verbündete gibt Suphia dauerhaft +45 % Angriff — dafür heilt sie nichts mehr',
      function (c) {
        if (!c.self._zorn) { c.self._zorn = 1; c.self.heilfaktor = -1; c.self.regen = 0; }
        c.self.atk = Math.round(c.self.atk * 1.45);
      }),

    passiv('suphia_mec1', 'Tigerpranke', 'onStart', [], [],
      'Beginnt den Kampf mit +9 Angriff und +5 Rüstung',
      function (c) { c.self.atk += 9; c.self.def += 5; }),
    passiv('suphia_mec2', 'Aufgepasst', 'onDamaged', ['schild'], [],
      'Jeder dritte Treffer auf den Trupp legt dem am schwersten Verwundeten ein Schild an',
      function (c) {
        if (!zaehler(c.self, 'suphia_mec2', 3)) return;
        var u = schwaechstes(c.allies(), function (x) { return x.hp / x.maxHp; });
        if (u) c.applyStatus(u, 'schild', Math.round(u.maxHp * 0.18));
      }),
    passiv('suphia_mec3', 'Nie unaufmerksam', 'onTurnStart', ['heilung'], ['heilung'],
      'Führt ein Verbündeter Heilung, heilt Suphia jeden Zug den Schwächsten um 6 % — sonst um 2,5 %',
      function (c) {
        var f = truppFuehrt(c, 'heilung') ? 0.06 : 0.025;
        var u = schwaechstes(c.allies(), function (x) { return x.hp / x.maxHp; });
        if (u) c.heal(u, u.maxHp * f, 'Nie unaufmerksam');
      }),
    passiv('suphia_mec4', 'Wächterin', 'onStart', [], [],
      'Suphia nimmt jedem Verbündeten 30 % jedes Treffers ab — dafür schlägt sie nur noch halb so hart',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.5);
        koenigsdeckung(c, 0.3);
      }),

    passiv('suphia_unt1', 'Wachkommando', 'onStart', [], [],
      'Zu Kampfbeginn +10 % Angriff und +10 % Rüstung für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.1);
          u.def = Math.round(u.def * 1.1);
        });
      }),
    passiv('suphia_unt2', 'Zusammenhalten', 'onAllyDeath', [], [],
      'Fällt ein Verbündeter, bekommt der übrige Trupp dauerhaft +15 % Angriff und Rüstung',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.15);
          u.def = Math.round(u.def * 1.15);
        });
      }),
    passiv('suphia_unt3', 'Rückhalt', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, erleidet der Trupp 15 % weniger Schaden — sonst 6 %',
      function (c) {
        var m = truppFuehrt(c, 'schild') ? 0.15 : 0.06;
        c.allies().forEach(function (u) { u.minderung = Math.max(u.minderung || 0, m); });
      }),
    passiv('suphia_unt4', 'Goldene Wacht', 'onStart', [], [],
      'Die Verbündeten bekommen +25 % Leben und Rüstung — Suphia selbst greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.def = Math.round(u.def * 1.25);
          var mehr = Math.round(u.maxHp * 0.25);
          u.maxHp += mehr; u.hp += mehr;
        });
        c.self.atk = Math.round(c.self.atk * 0.2);
      }),

    passiv('suphia_def1', 'Goldenes Fell', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 32 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.32)); }),
    passiv('suphia_def2', 'Standhaft', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 11 % ihres Lebens',
      function (c) {
        if (!zaehler(c.self, 'suphia_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.11, 'Standhaft');
      }),
    passiv('suphia_def3', 'Aufmerksam', 'onStart', [], ['konter'],
      'Führt ein Verbündeter Konter, kostet kein Treffer mehr als 13 % ihres Lebens — sonst 19 %',
      function (c) {
        var d = truppFuehrt(c, 'konter') ? 0.13 : 0.19;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('suphia_def4', 'Bis zuletzt', 'onDeath', ['heilung'], [],
      'Fällt Suphia, heilt der übrige Trupp um 30 % und schlägt dauerhaft 20 % härter',
      function (c) {
        if (c.self._letzter) return;
        c.self._letzter = 1;
        c.allies().forEach(function (u) {
          if (u === c.self) return;
          c.heal(u, u.maxHp * 0.3, 'Bis zuletzt');
          u.atk = Math.round(u.atk * 1.2);
        });
      }),

    /* ---- Wolf und Reiter ----------------------------------------------------
       Die erste Truppbedingung, die nicht an einem Schlüsselwort hängt, sondern
       an einer ART. Goblins reiten Sturmwölfe — das ist im Roster bisher nur
       Fluff gewesen. Diese Passiven machen daraus eine Bau-Entscheidung: der
       billigste Anfang (Goblin) und der billigste Wolf werten sich gegenseitig
       auf, und wer beide führt, bekommt bei Ranga und Gobta die Fusion.        */

    passiv('sturm_ang5', 'Wolfsreiter', 'onStart', ['tempo'], [],
      'Sitzt ein Goblin im Trupp, trägt der Wolf ihn: beide bekommen +25 % Angriff und +15 % Tempo',
      function (c) {
        var reiter = c.allies().filter(function (u) { return u.tags[0] === 'goblin'; });
        if (!reiter.length) return;
        [c.self].concat(reiter).forEach(function (u) {
          u.atk = Math.round(u.atk * 1.25);
          u.spd = Math.round(u.spd * 1.15);
        });
      }),
    passiv('sturm_unt5', 'Reiterei', 'onStart', ['tempo'], [],
      'Je Goblin im Trupp bekommt der ganze Trupp +7 % Tempo — und der Wolf selbst +10 % Angriff',
      function (c) {
        var n = c.allies().filter(function (u) { return u.tags[0] === 'goblin'; }).length;
        if (!n) return;
        c.allies().forEach(function (u) { u.spd = Math.round(u.spd * (1 + 0.07 * n)); });
        c.self.atk = Math.round(c.self.atk * (1 + 0.1 * n));
      }),
    passiv('sturm_def5', 'Aufgesessen', 'onDamaged', [], [],
      'Sitzt ein Goblin im Trupp, pariert der Reiter mit: der Wolf erleidet 22 % weniger Schaden',
      function (c) {
        var hat = c.allies().some(function (u) { return u.tags[0] === 'goblin'; });
        c.self.minderung = hat ? Math.max(c.self.minderung || 0, 0.22) : (c.self.minderung || 0);
      }),

    passiv('ranga_ang5', 'Schattenfusion', 'onStart', ['schatten'], [],
      'Ist Gobta im Trupp, verschmelzen Reiter und Wolf: Ranga bekommt +45 % Angriff, +35 % Tempo und 6 Schatten, ' +
      'Gobta +25 % Leben — und Rangas Signatur wird zum Schwarzen Blitz der Fusion.',
      function (c) {
        if (c.self._fusion) return;
        var gobta = c.allies().filter(function (u) { return u.id === 'gobta'; })[0];
        if (!gobta) return;
        c.self._fusion = 1;
        c.self.atk = Math.round(c.self.atk * 1.45);
        c.self.spd = Math.round(c.self.spd * 1.35);
        c.applyStatus(c.self, 'schatten', 6);
        var mehr = Math.round(gobta.maxHp * 0.25);
        gobta.maxHp += mehr; gobta.hp += mehr;
        var sig = byId('sig_ranga_fusion');
        if (sig) c.self.actives = [sig];
        c.log.push({ t: 0, type: 'verwandlung', key: c.self.key, unit: c.self.name,
                     side: c.self.side, form: 'Schattenfusion mit Gobta' });
      }),
    passiv('ranga_unt5', 'Rudel und Stamm', 'onStart', ['tempo'], [],
      'Je Goblin im Trupp schlägt der ganze Trupp 9 % härter',
      function (c) {
        var n = c.allies().filter(function (u) { return u.tags[0] === 'goblin'; }).length;
        if (!n) return;
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * (1 + 0.09 * n)); });
      }),
    passiv('ranga_def5', 'Schattenreiter', 'onStart', ['schatten'], [],
      'Ist ein Goblin im Trupp, legt jeder Zug 2 Schatten auf Ranga UND auf den Reiter',
      function (c) {
        var reiter = c.allies().filter(function (u) { return u.tags[0] === 'goblin'; });
        if (!reiter.length) return;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Schattenreiter', fn: function (k) {
          k.applyStatus(k.self, 'schatten', 2);
          k.allies().forEach(function (u) {
            if (u.tags[0] === 'goblin') k.applyStatus(u, 'schatten', 2);
          });
        } });
      }),

    /* ---- Windrache: der zweite Donnerträger ---------------------------------
       Donner lädt und entlädt sich ab der Schwelle in die ganze Reihe — Ranga
       lädt einen nach dem anderen auf, der Windrache lädt breit und schnell.
       Tempo bleibt sein zweites Standbein: er ist öfter am Zug, also lädt er
       öfter nach, und genau darin liegt der Unterschied zwischen den beiden.   */

    passiv('wind_ang1', 'Sturmstoß', 'onHit', ['donner'], [],
      'Der erste Schlag des Kampfes trifft 120 % härter und lädt jeden Gegner mit 3 Donner auf',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.2;
        c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 3); });
      }),
    passiv('wind_ang2', 'Blitzschwinge', 'onHit', ['donner'], ['tempo'],
      'Jeder dritte Schlag trifft 70 % härter, plus 3 % je Punkt Tempo über 35',
      function (c) {
        if (!zaehler(c.self, 'wind_ang2', 3)) return;
        c.dmg *= 1.7 + Math.max(0, c.self.spd - 35) * 0.03;
      }),
    passiv('wind_ang3', 'Geladene Böe', 'onHit', [], ['donner'],
      'Führt ein Verbündeter Donner, trifft der Windrache geladene Ziele 30 % härter — sonst 10 %',
      function (c) {
        if ((c.target.status.donner || 0) > 0) {
          c.dmg *= truppFuehrt(c, 'donner') ? 1.3 : 1.1;
        }
      }),
    passiv('wind_ang4', 'Blitzschlag ohne Ende', 'onStart', ['donner'], [],
      'Jeder Schlag lädt die ganze Reihe mit 2 Donner auf — dafür trifft der Windrache 30 % schwächer',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Blitzschlag ohne Ende', fn: function (k) {
          k.dmg *= 0.7;
          k.foes().forEach(function (f) { k.applyStatus(f, 'donner', 2); });
        } });
      }),

    passiv('wind_mec1', 'Aufziehendes Gewitter', 'onStart', ['donner'], [],
      'Lädt zu Kampfbeginn jeden Gegner mit 4 Donner auf',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 4); }); }),
    passiv('wind_mec2', 'Nachladen', 'onHit', ['donner'], [],
      'Jeder dritte Schlag lädt alle Gegner mit 3 Donner nach',
      function (c) {
        if (!zaehler(c.self, 'wind_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 3); });
      }),
    passiv('wind_mec3', 'Tiefdruck', 'onStart', ['donner'], ['donner'],
      'Führt ein Verbündeter Donner, entlädt sich der Blitz zwei Stapel früher — sonst einen',
      function (c) { c.self.donnerFrueh = truppFuehrt(c, 'donner') ? 2 : 1; }),
    passiv('wind_mec4', 'Dauergewitter', 'onStart', ['donner', 'tempo'], [],
      'Jeder Zug lädt alle Gegner mit 3 Donner auf — dafür ist der Windrache 30 % langsamer',
      function (c) {
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.7));
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Dauergewitter', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'donner', 3); });
        } });
      }),

    passiv('wind_unt1', 'Rückenwind', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +15 % Tempo für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.15); }); }),
    passiv('wind_unt2', 'Gewitterfront', 'onDamaged', ['donner'], [],
      'Jeder vierte Treffer auf den Trupp lädt alle Gegner mit 3 Donner auf',
      function (c) {
        if (!zaehler(c.self, 'wind_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 3); });
      }),
    passiv('wind_unt3', 'Leitwind', 'onStart', [], ['donner'],
      'Führt ein Verbündeter Donner, lädt jeder Treffer des Trupps mit 2 auf — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'donner') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Leitwind', fn: function (k) {
            k.applyStatus(k.target, 'donner', n);
          } });
        });
      }),
    passiv('wind_unt4', 'Sturmgeleit', 'onStart', ['tempo'], [],
      'Der Trupp bekommt +30 % Tempo — der Windrache selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.spd = Math.round(u.spd * 1.3); });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('wind_def1', 'Windschild', 'onStart', ['tempo'], [],
      'Beginnt mit Schild über 28 % seines Lebens und +18 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.28));
        c.self.spd = Math.round(c.self.spd * 1.18);
      }),
    passiv('wind_def2', 'Aufwind', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % und gibt +8 % Tempo',
      function (c) {
        if (!zaehler(c.self, 'wind_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Aufwind');
        c.self.spd = Math.round(c.self.spd * 1.08);
      }),
    passiv('wind_def3', 'Wolkendecke', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 14 % seines Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('wind_def4', 'Im Auge des Sturms', 'onStart', ['donner'], [],
      'Jede Entladung auf dem Feld heilt den Windrachen um 7 % — dafür heilt ihn sonst nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Im Auge des Sturms', fn: function (k) {
          var geladen = k.foes().filter(function (f) { return (f.status.donner || 0) > 0; }).length;
          if (geladen) k.heal(k.self, k.self.maxHp * 0.07 * 2, 'Im Auge des Sturms');
        } });
      }),

    /* ---- Gruftwächter: der zweite Frostträger -------------------------------
       Grabeskälte. Frost heißt hier nicht Sturm wie bei Veldora, sondern
       Stillstand: Erstarrung nimmt dem Gegner den Zug, und weil sie auf EINEN
       Stapel gedeckelt ist, zählt nicht die Menge, sondern wie oft sie fällt.
       Der Wächter friert am Ort ein, wer ihm zu nahe kommt.                    */

    passiv('gruft_ang1', 'Grabesgriff', 'onHit', ['frost'], [],
      'Der erste Schlag des Kampfes trifft 110 % härter und lässt das Ziel erstarren',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.applyStatus(c.target, 'erstarrung', 1);
      }),
    passiv('gruft_ang2', 'Eisenkalte Faust', 'onHit', ['frost'], [],
      'Jeder dritte Schlag trifft erstarrte Ziele doppelt — und alle anderen 60 % härter',
      function (c) {
        if (!zaehler(c.self, 'gruft_ang2', 3)) return;
        c.dmg *= (c.target.status.erstarrung || 0) > 0 ? 2 : 1.6;
      }),
    passiv('gruft_ang3', 'Totenstarre', 'onHit', ['frost'], ['frost'],
      'Führt ein Verbündeter Frost, lässt jeder Schlag zu 30 % erstarren — sonst zu 10 %',
      function (c) {
        if (c.rng() >= (truppFuehrt(c, 'frost') ? 0.3 : 0.1)) return;
        c.applyStatus(c.target, 'erstarrung', 1);
      }),
    passiv('gruft_ang4', 'Kalter Zorn', 'onStart', ['frost'], [],
      'Der Wächter schlägt 50 % härter, solange irgendein Gegner erstarrt ist — dafür ist er selbst halb so schnell',
      function (c) {
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
        c.addEffect(c.self, { hook: 'onHit', name: 'Kalter Zorn', fn: function (k) {
          if (k.foes().some(function (f) { return (f.status.erstarrung || 0) > 0; })) k.dmg *= 1.5;
        } });
      }),

    passiv('gruft_mec1', 'Grabeskälte', 'onStart', ['frost'], [],
      'Lässt zu Kampfbeginn jeden Gegner erstarren',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'erstarrung', 1); }); }),
    passiv('gruft_mec2', 'Frostwache', 'onDamaged', ['frost'], [],
      'Jeder dritte erlittene Treffer lässt den Angreifer erstarren',
      function (c) {
        if (!zaehler(c.self, 'gruft_mec2', 3)) return;
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'erstarrung', 1);
      }),
    passiv('gruft_mec3', 'Ewiges Eis', 'onTurnStart', ['frost'], ['frost'],
      'Führt ein Verbündeter Frost, lässt der Wächter jeden Zug einen Gegner erstarren — sonst jeden zweiten',
      function (c) {
        if (!truppFuehrt(c, 'frost') && c.rng() < 0.5) return;
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'erstarrung', 1);
      }),
    passiv('gruft_mec4', 'Mausoleum', 'onStart', ['frost'], [],
      'Jeder Zug lässt ALLE Gegner erstarren — dafür schlägt der Wächter nur noch mit einem Viertel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.25);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Mausoleum', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'erstarrung', 1); });
        } });
      }),

    passiv('gruft_unt1', 'Grabwache', 'onStart', ['schild'], [],
      'Legt zu Kampfbeginn dem ganzen Trupp ein Schild an',
      function (c) {
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.9)); });
      }),
    passiv('gruft_unt2', 'Kalter Hauch', 'onDamaged', ['frost'], [],
      'Jeder vierte Treffer auf den Trupp lässt alle Gegner erstarren',
      function (c) {
        if (!zaehler(c.self, 'gruft_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'erstarrung', 1); });
      }),
    passiv('gruft_unt3', 'Starrer Boden', 'onStart', ['frost'], ['frost'],
      'Führt ein Verbündeter Frost, lässt jeder Treffer des Trupps zu 20 % erstarren — sonst zu 7 %',
      function (c) {
        var p = truppFuehrt(c, 'frost') ? 0.2 : 0.07;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Starrer Boden', fn: function (k) {
            if (k.rng() < p) k.applyStatus(k.target, 'erstarrung', 1);
          } });
        });
      }),
    passiv('gruft_unt4', 'Herr der Gruft', 'onStart', ['schild'], [],
      'Der Trupp trifft erstarrte Ziele 40 % härter — der Wächter selbst greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.2);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Herr der Gruft', fn: function (k) {
            if ((k.target.status.erstarrung || 0) > 0) k.dmg *= 1.4;
          } });
        });
      }),

    passiv('gruft_def1', 'Steinsarg', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 42 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.42)); }),
    passiv('gruft_def2', 'Grabesruhe', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'gruft_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Grabesruhe');
      }),
    passiv('gruft_def3', 'Kalte Schuppen', 'onStart', [], ['frost'],
      'Führt ein Verbündeter Frost, kostet kein Treffer mehr als 13 % seines Lebens — sonst 19 %',
      function (c) {
        var d = truppFuehrt(c, 'frost') ? 0.13 : 0.19;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('gruft_def4', 'Aus dem Grab zurück', 'onDeath', ['frost'], [],
      'Steht einmal mit 45 % Leben wieder auf und lässt alle Gegner erstarren — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'erstarrung', 1); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Seelenhexe: die zweite Dunkelheitsträgerin --------------------------
       Diablo umnachtet und verschwindet dabei selbst; die Hexe umnachtet und
       ZIEHT daraus. Jeder Stapel Dunkelheit auf einem Gegner ist für sie eine
       Seele, aus der sie Leben für den Trupp holt — der einzige Bau im Spiel,
       der eine Gegnermarke in Heilung umrechnet.                              */

    passiv('hexe_ang1', 'Seelenriss', 'onHit', ['dunkelheit'], [],
      'Der erste Schlag des Kampfes trifft 110 % härter und hüllt alle Gegner in 4 Dunkelheit',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 4); });
      }),
    passiv('hexe_ang2', 'Zehrender Blick', 'onHit', ['dunkelheit'], ['dunkelheit'],
      'Jeder dritte Schlag trifft 7 % härter je Stapel Dunkelheit auf dem Ziel — höchstens doppelt',
      function (c) {
        if (!zaehler(c.self, 'hexe_ang2', 3)) return;
        c.dmg *= 1 + Math.min(1, 0.07 * (c.target.status.dunkelheit || 0));
      }),
    passiv('hexe_ang3', 'Seelenzoll', 'onHit', ['heilung'], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, heilt jeder Schlag gegen ein umnachtetes Ziel den Trupp um 4 % — sonst um 1,5 %',
      function (c) {
        if ((c.target.status.dunkelheit || 0) <= 0) return;
        var f = truppFuehrt(c, 'dunkelheit') ? 0.04 : 0.015;
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * f, 'Seelenzoll'); });
      }),
    passiv('hexe_ang4', 'Seelenfresserin', 'onKill', ['dunkelheit'], [],
      'Jeder Abschuss hüllt alle übrigen Gegner in 6 Dunkelheit und heilt den Trupp um 12 % — dafür hält die Hexe nur die Hälfte aus',
      function (c) {
        if (!c.self._zoll) {
          c.self._zoll = 1;
          c.self.maxHp = Math.round(c.self.maxHp * 0.5);
          c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        }
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 6); });
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.12, 'Seelenfresserin'); });
      }),

    passiv('hexe_mec1', 'Fluch der Finsternis', 'onStart', ['dunkelheit'], [],
      'Hüllt zu Kampfbeginn jeden Gegner in 5 Dunkelheit',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 5); }); }),
    passiv('hexe_mec2', 'Schwarzes Ritual', 'onHit', ['dunkelheit'], [],
      'Jeder dritte Schlag legt 4 Dunkelheit auf alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'hexe_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 4); });
      }),
    passiv('hexe_mec3', 'Seelenband', 'onTurnStart', ['heilung'], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, heilt der Trupp jeden Zug 1 % je Stapel Dunkelheit auf dem Feld — sonst halb so viel',
      function (c) {
        var n = 0;
        c.foes().forEach(function (f) { n += f.status.dunkelheit || 0; });
        if (!n) return;
        var f = Math.min(0.1, 0.01 * n) * (truppFuehrt(c, 'dunkelheit') ? 1 : 0.5);
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * f, 'Seelenband'); });
      }),
    passiv('hexe_mec4', 'Nachtschleier', 'onStart', ['dunkelheit'], [],
      'Dunkelheit auf den Zielen der Hexe baut sich nicht mehr ab — dafür legt sie nur noch halb so viel an',
      function (c) {
        c.self.fluchmeister = (c.self.fluchmeister || 1) * 0.5;
        c.addEffect(c.self, { hook: 'onHit', name: 'Nachtschleier', fn: function (k) {
          k.target.dunkelheitBleibt = 1;
          k.applyStatus(k.target, 'dunkelheit', 2);
        } });
      }),

    passiv('hexe_unt1', 'Seelenernte', 'onStart', ['heilung', 'dunkelheit'], [],
      'Zu Kampfbeginn 3 Dunkelheit auf jeden Gegner und +6 Regeneration für den Trupp',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
        c.allies().forEach(function (u) { u.regen += 6; });
      }),
    passiv('hexe_unt2', 'Totenklage', 'onDamaged', ['heilung'], [],
      'Jeder vierte Treffer auf den Trupp heilt alle um 7 % und hüllt alle Gegner in 3 Dunkelheit',
      function (c) {
        if (!zaehler(c.self, 'hexe_unt2', 4)) return;
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.07, 'Totenklage'); });
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
      }),
    passiv('hexe_unt3', 'Schwarzes Gebet', 'onStart', ['dunkelheit'], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, blendet jeder Treffer des Trupps mit 2 — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'dunkelheit') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Schwarzes Gebet', fn: function (k) {
            k.applyStatus(k.target, 'dunkelheit', n);
          } });
        });
      }),
    passiv('hexe_unt4', 'Herrin der Seelen', 'onStart', ['heilung'], [],
      'Der Trupp heilt 40 % stärker und bekommt +12 % Leben — die Hexe greift nur noch mit einem Viertel an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.heilfaktor += 0.4;
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = Math.round(c.self.atk * 0.25);
      }),

    passiv('hexe_def1', 'Knochenschleier', 'onStart', [], [],
      'Beginnt mit einem Schild über 30 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3)); }),
    passiv('hexe_def2', 'Zehrung', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % ihres Lebens',
      function (c) {
        if (!zaehler(c.self, 'hexe_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.1, 'Zehrung');
      }),
    passiv('hexe_def3', 'Nachtsicht', 'onStart', [], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'dunkelheit') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('hexe_def4', 'Rückkehr aus der Nacht', 'onDeath', ['dunkelheit', 'heilung'], [],
      'Steht einmal mit 45 % Leben wieder auf, hüllt alle Gegner in 8 Dunkelheit und heilt den Trupp um 20 % — danach heilt sie nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 8); });
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.2, 'Rückkehr aus der Nacht'); });
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Diablos Linien: der Urtümliche Schwarze ---------------------------
       Zwei Finsternisse, die verschiedene Enden derselben Rechnung anfassen:
       Dunkelheit senkt, was der GEGNER austeilt, Schatten lässt Treffer an
       Diablo ganz danebengehen. Der perfekte Diener wird nicht getroffen und
       schlägt zurück, während niemand ihn sieht. Verderbnis hat er abgegeben —
       vier andere Einheiten führen sie ohnehin.                                */

    passiv('diablo_ang1', 'Zeitgleiche Verachtung', 'onHit', ['dunkelheit'], [],
      'Der erste Schlag des Kampfes trifft 140 % härter, hüllt jeden Gegner in 4 Dunkelheit — und Diablo tritt in den Schatten zurück',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.4;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 4); });
        c.applyStatus(c.self, 'schatten', 4);
      }),
    passiv('diablo_ang2', 'Aus dem Schatten', 'onHit', ['schatten'], ['schatten'],
      'Jeder dritte Schlag trifft 8 % härter je eigenem Schatten-Stapel — höchstens doppelt',
      function (c) {
        if (!zaehler(c.self, 'diablo_ang2', 3)) return;
        c.dmg *= 1 + Math.min(1, 0.08 * (c.self.status.schatten || 0));
      }),
    passiv('diablo_ang3', 'Höllenflamme', 'onHit', ['dunkelheit'], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, trifft Diablo umnachtete Ziele 30 % härter und legt 3 nach — sonst 10 % und 1',
      function (c) {
        var mit = truppFuehrt(c, 'dunkelheit');
        if ((c.target.status.dunkelheit || 0) > 0) c.dmg *= mit ? 1.3 : 1.1;
        c.applyStatus(c.target, 'dunkelheit', mit ? 3 : 1);
      }),
    passiv('diablo_ang4', 'Zeitstopp', 'onStart', ['schatten'], [],
      'Diablo schlägt in jedem Zug ein zweites Mal für 70 % — dafür bleibt von seiner Rüstung nichts',
      function (c) {
        c.self.def = 0;
        c.addEffect(c.self, { hook: 'onHit', name: 'Zeitstopp', fn: function (k) {
          if (k.self._zeitstopp) return;
          k.self._zeitstopp = 1;
          k.deal(k.target, k.self.atk * 0.7, 'Zeitstopp');
          k.self._zeitstopp = 0;
        } });
      }),

    passiv('diablo_mec1', 'Umnachtung', 'onStart', ['dunkelheit'], [],
      'Hüllt zu Kampfbeginn jeden Gegner in 5 Dunkelheit — sie schlagen fühlbar schwächer zu',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 5); }); }),
    passiv('diablo_mec2', 'Schattenschritt', 'onHit', ['schatten', 'dunkelheit'], [],
      'Jeder dritte Schlag legt 3 Dunkelheit auf alle Gegner und zieht Diablo 4 Schatten',
      function (c) {
        if (!zaehler(c.self, 'diablo_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
        c.applyStatus(c.self, 'schatten', 4);
      }),
    passiv('diablo_mec3', 'Vollendete Zange', 'onTurnStart', ['dunkelheit'], ['schatten'],
      'Führt ein Verbündeter Schatten, legt Diablo jeden Zug 2 Dunkelheit auf alle Gegner nach und zieht sich 2 Schatten — sonst je 1',
      function (c) {
        var n = truppFuehrt(c, 'schatten') ? 2 : 1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', n); });
        c.applyStatus(c.self, 'schatten', n);
      }),
    passiv('diablo_mec4', 'Ewige Nacht', 'onStart', ['dunkelheit'], [],
      'Dunkelheit auf Diablos Zielen baut sich nicht mehr ab — dafür legt er nur noch halb so viel an',
      function (c) {
        c.self.fluchmeister = (c.self.fluchmeister || 1) * 0.5;
        c.addEffect(c.self, { hook: 'onHit', name: 'Ewige Nacht', fn: function (k) {
          k.target.dunkelheitBleibt = 1;
          k.applyStatus(k.target, 'dunkelheit', 2);
        } });
      }),

    passiv('diablo_unt1', 'Diener des Herrn', 'onStart', ['schatten'], [],
      'Zu Kampfbeginn +12 % Angriff und 3 Schatten für den Trupp, dazu 3 Dunkelheit auf jeden Gegner',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          c.applyStatus(u, 'schatten', 3);
        });
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
      }),
    passiv('diablo_unt2', 'Rückzug in die Nacht', 'onDamaged', ['schatten'], [],
      'Jeder vierte Treffer auf den Trupp zieht den ganzen Trupp in 3 Schatten',
      function (c) {
        if (!zaehler(c.self, 'diablo_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schatten', 3); });
      }),
    passiv('diablo_unt3', 'Schleier des Noir', 'onStart', ['dunkelheit'], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, blendet jeder Treffer des Trupps mit 2 — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'dunkelheit') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Schleier des Noir', fn: function (k) {
            k.applyStatus(k.target, 'dunkelheit', n);
          } });
        });
      }),
    passiv('diablo_unt4', 'Perfekter Diener', 'onStart', ['dunkelheit'], [],
      'Der Trupp trifft umnachtete Ziele 30 % härter — Diablo selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Perfekter Diener', fn: function (k) {
            if ((k.target.status.dunkelheit || 0) > 0) k.dmg *= 1.3;
          } });
        });
      }),

    passiv('diablo_def1', 'Dämonenleib', 'onStart', ['schatten'], [],
      'Beginnt mit einem Schild über 30 % seines Lebens und im Schatten',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3));
        c.applyStatus(c.self, 'schatten', 4);
      }),
    passiv('diablo_def2', 'Blendwerk', 'onDamaged', ['dunkelheit'], [],
      'Jeder dritte erlittene Treffer hüllt den Angreifer in 4 Dunkelheit',
      function (c) {
        if (!zaehler(c.self, 'diablo_def2', 3)) return;
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'dunkelheit', 4);
      }),
    passiv('diablo_def3', 'Unantastbar', 'onStart', [], ['schatten'],
      'Führt ein Verbündeter Schatten, kostet kein Treffer mehr als 14 % seines Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'schatten') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('diablo_def4', 'Ultimative Hingabe', 'onDeath', ['dunkelheit', 'schatten'], [],
      'Steht einmal mit 45 % Leben wieder auf, hüllt alle Gegner in 8 Dunkelheit und sich selbst in 8 Schatten — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 8); });
        c.applyStatus(c.self, 'schatten', 8);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Milims Linien: rohe Zerstörung ------------------------------------
       Als einzige Einheit im Spiel trägt sie GAR KEINEN Zustand — kein Gift,
       kein Brand, keine Marke. Ihre Linien sind reine Zahlen, die sich
       gegenseitig aufschaukeln: je länger sie draufhält, desto härter trifft
       sie. Das ist ihr Charakter und zugleich die Nische, die im Roster fehlte.  */

    passiv('milim_ang1', 'Drachenfaust', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft dreifach und ignoriert die Rüstung',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 3;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('milim_ang2', 'Drachenzorn', 'onHit', [], [],
      'Jeder Schlag auf dasselbe Ziel trifft 12 % härter als der davor — ein Zielwechsel setzt zurück',
      function (c) {
        if (c.self._zorn_ziel !== c.target.key) { c.self._zorn_ziel = c.target.key; c.self._zorn = 0; }
        c.self._zorn = Math.min(10, (c.self._zorn || 0) + 1);
        c.dmg *= 1 + 0.12 * (c.self._zorn - 1);
      }),
    passiv('milim_ang3', 'Zerstörerin', 'onHit', ['exekution'], ['exekution'],
      'Führt ein Verbündeter Exekution, trifft Milim Ziele unter 50 % Leben doppelt — sonst 30 % härter',
      function (c) {
        if (c.target.hp >= c.target.maxHp * 0.5) return;
        c.dmg *= truppFuehrt(c, 'exekution') ? 2 : 1.3;
      }),
    passiv('milim_ang4', 'Drakonische Wut', 'onStart', [], [],
      'Milim wird mit jedem eigenen Zug 8 % stärker, ohne Grenze — dafür heilt sie nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Drakonische Wut', fn: function (k) {
          k.self.atk = Math.round(k.self.atk * 1.08);
        } });
      }),

    passiv('milim_mec1', 'Drachenpanzer', 'onStart', [], [],
      'Beginnt den Kampf mit 60 % Rüstungsdurchschlag und +8 Rüstung',
      function (c) {
        c.self.pierce = Math.max(c.self.pierce || 0, 0.6);
        c.self.def += 8;
      }),
    passiv('milim_mec2', 'Nachschlag', 'onHit', [], [],
      'Jeder dritte Schlag schlägt sofort ein zweites Mal für 110 %',
      function (c) {
        if (!zaehler(c.self, 'milim_mec2', 3)) return;
        c.deal(c.target, c.self.atk * 1.1, 'Nachschlag');
      }),
    passiv('milim_mec3', 'Übermacht', 'onHit', [], ['exekution'],
      'Führt ein Verbündeter Exekution, ignoriert Milim jede Rüstung — sonst die Hälfte',
      function (c) {
        c.self.pierce = Math.max(c.self.pierce || 0, truppFuehrt(c, 'exekution') ? 1 : 0.5);
      }),
    passiv('milim_mec4', 'Drachenbrecher', 'onStart', ['flaeche'], [],
      'Jeder Schlag trifft alle übrigen Gegner für 60 % mit — dafür hält Milim nur noch 60 % aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.6);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onHit', name: 'Drachenbrecher', fn: function (k) {
          k.foes().forEach(function (f) {
            if (f !== k.target) k.deal(f, k.self.atk * 0.6, 'Drachenbrecher');
          });
        } });
      }),

    passiv('milim_unt1', 'Kraft der Demonlord', 'onStart', [], [],
      'Zu Kampfbeginn +16 % Angriff für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.16); }); }),
    passiv('milim_unt2', 'Mitreißen', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen dauerhaft +8 Angriff',
      function (c) {
        if (!zaehler(c.self, 'milim_unt2', 4)) return;
        c.allies().forEach(function (u) { u.atk += 8; });
      }),
    passiv('milim_unt3', 'Angriffsbefehl', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, bekommt der Trupp +25 % Durchschlag und +10 % Tempo — sonst nur den Durchschlag',
      function (c) {
        var mit = truppFuehrt(c, 'tempo');
        c.allies().forEach(function (u) {
          u.pierce = Math.max(u.pierce || 0, 0.25);
          if (mit) u.spd = Math.round(u.spd * 1.1);
        });
      }),
    passiv('milim_unt4', 'Bezwingerin der Drachen', 'onStart', [], [],
      'Der Trupp schlägt 35 % härter — Milim selbst hält nur noch die Hälfte aus',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.atk = Math.round(u.atk * 1.35); });
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('milim_def1', 'Drachenhaut', 'onStart', [], [],
      'Beginnt mit einem Schild über 36 % ihres Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.36)); }),
    passiv('milim_def2', 'Unbeirrt', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % und gibt dauerhaft +6 Angriff',
      function (c) {
        if (!zaehler(c.self, 'milim_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Unbeirrt');
        c.self.atk += 6;
      }),
    passiv('milim_def3', 'Drachenblut', 'onStart', [], ['heilung'],
      'Führt ein Verbündeter Heilung, kostet kein Treffer mehr als 14 % ihres Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'heilung') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('milim_def4', 'Unsterbliche Drachin', 'onDeath', [], [],
      'Steht einmal mit 50 % Leben und doppeltem Angriff wieder auf — danach heilt sie nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.self.atk = Math.round(c.self.atk * 2);
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Veldoras Linien: der Sturmdrache -----------------------------------
       Sturm heißt hier Fläche plus Frost: Böen, die die ganze Reihe treffen und
       Gegner erstarren lassen. Frost hatte seit Phase 20 gar keinen Träger mehr
       im Roster — Veldora holt ihn zurück, und Donner bleibt bei Ranga, damit
       sich die beiden Wetterlagen nicht doppeln.                              */

    passiv('veldora_ang1', 'Sturmbö', 'onHit', ['flaeche'], [],
      'Der erste Schlag des Kampfes fährt in die ganze Reihe: 130 % härter, und jeder andere Gegner nimmt 70 %',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.3;
        c.foes().forEach(function (f) {
          if (f !== c.target) c.deal(f, c.self.atk * 0.7, 'Sturmbö');
        });
      }),
    passiv('veldora_ang2', 'Eissturm', 'onHit', ['frost'], [],
      'Jeder dritte Schlag trifft 80 % härter und lässt das Ziel erstarren',
      function (c) {
        if (!zaehler(c.self, 'veldora_ang2', 3)) return;
        c.dmg *= 1.8;
        c.applyStatus(c.target, 'erstarrung', 1);
      }),
    passiv('veldora_ang3', 'Wirbel', 'onHit', ['flaeche'], ['flaeche'],
      'Führt ein Verbündeter Fläche, schlägt Veldora 12 % härter je Gegner — sonst 5 %',
      function (c) {
        c.dmg *= 1 + (truppFuehrt(c, 'flaeche') ? 0.12 : 0.05) * c.foes().length;
      }),
    passiv('veldora_ang4', 'Ungezähmt', 'onStart', ['flaeche'], [],
      'Jeder Schlag trifft die ganze Reihe voll — dafür nur noch mit 50 % Schaden',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Ungezähmt', fn: function (k) {
          k.dmg *= 0.5;
          k.foes().forEach(function (f) {
            if (f !== k.target) k.deal(f, k.dmg, 'Ungezähmt');
          });
        } });
      }),

    passiv('veldora_mec1', 'Frostatem', 'onStart', ['frost'], [],
      'Lässt zu Kampfbeginn jeden Gegner erstarren',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'erstarrung', 1); }); }),
    passiv('veldora_mec2', 'Wetterwechsel', 'onDamaged', ['frost'], [],
      'Jeder dritte erlittene Treffer lässt den Angreifer erstarren',
      function (c) {
        if (!zaehler(c.self, 'veldora_mec2', 3)) return;
        var f = c.foes()[0];
        if (f) c.applyStatus(f, 'erstarrung', 1);
      }),
    passiv('veldora_mec3', 'Bitterkälte', 'onHit', ['frost'], ['frost'],
      'Führt ein Verbündeter Frost, lässt jeder Schlag zu 35 % erstarren — sonst zu 12 %',
      function (c) {
        if (c.rng() >= (truppFuehrt(c, 'frost') ? 0.35 : 0.12)) return;
        c.applyStatus(c.target, 'erstarrung', 1);
      }),
    passiv('veldora_mec4', 'Sturmherr', 'onStart', ['flaeche', 'frost'], [],
      'Jeder Zug fegt für 55 % über alle Gegner und lässt einen erstarren — dafür schlägt Veldora selbst 35 % schwächer',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.65);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Sturmherr', fn: function (k) {
          var f = k.foes();
          f.forEach(function (x) { k.deal(x, k.self.atk * 0.55, 'Sturmherr'); });
          if (f[0]) k.applyStatus(f[0], 'erstarrung', 1);
        } });
      }),

    passiv('veldora_unt1', 'Sturmfront', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +14 % Tempo für den Trupp und 60 % Schaden auf jeden Gegner',
      function (c) {
        c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.14); });
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.6, 'Sturmfront'); });
      }),
    passiv('veldora_unt2', 'Gewitterwand', 'onDamaged', ['flaeche'], [],
      'Jeder vierte Treffer auf den Trupp fegt für 50 % über alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'veldora_unt2', 4)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.5, 'Gewitterwand'); });
      }),
    passiv('veldora_unt3', 'Auge des Sturms', 'onStart', [], ['flaeche'],
      'Führt ein Verbündeter Fläche, trifft der Trupp gegen mehrere Gegner 26 % härter — sonst 10 %',
      function (c) {
        var m = truppFuehrt(c, 'flaeche') ? 1.26 : 1.1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Auge des Sturms', fn: function (k) {
            if (k.foes().length >= 2) k.dmg *= m;
          } });
        });
      }),
    passiv('veldora_unt4', 'Sturm der Vernichtung', 'onStart', ['flaeche'], [],
      'Jeder Treffer des Trupps fegt für 25 % über alle übrigen Gegner — Veldora selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Sturm der Vernichtung', fn: function (k) {
            k.foes().forEach(function (f) {
              if (f !== k.target) k.deal(f, k.self.atk * 0.25, 'Sturm der Vernichtung');
            });
          } });
        });
      }),

    passiv('veldora_def1', 'Drachenschuppen', 'onStart', [], [],
      'Beginnt mit einem Schild über 34 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.34)); }),
    passiv('veldora_def2', 'Sturmauge', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'veldora_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Sturmauge');
      }),
    passiv('veldora_def3', 'Eispanzer', 'onStart', [], ['frost'],
      'Führt ein Verbündeter Frost, kostet kein Treffer mehr als 14 % seines Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'frost') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('veldora_def4', 'Wiederkehr des Sturms', 'onDeath', ['flaeche', 'frost'], [],
      'Steht einmal mit 45 % Leben wieder auf, fegt für 120 % über alle Gegner und lässt sie erstarren — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) {
          c.deal(f, c.self.atk * 1.2, 'Wiederkehr des Sturms');
          c.applyStatus(f, 'erstarrung', 1);
        });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Rimurus Linien: Prädator, Analyse und Ordnung ----------------------
       Er hat als einziger keine eigene Marke, die er anlegt — er LIEST, was
       andere angelegt haben. Jeder verschiedene Zustand auf einem Gegner ist
       für ihn ein Datenpunkt und wird zu Antichaos: dem Aufwärts-Rad, das
       Angriff, Rüstung und Tempo in jedem Zug neu nach oben würfelt. Damit ist
       er die Gegenfigur zu Shion — sie sät Unordnung, er erntet daraus Ordnung
       — und der einzige Trupp-Baustein, der von FREMDEN Schlüsselwörtern lebt. */

    passiv('rimuru_ang1', 'Wasserklinge', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 140 % härter und ignoriert die Rüstung vollständig',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.4;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('rimuru_ang2', 'Große Weisheit', 'onHit', ['chaos'], [],
      'Jeder dritte Schlag wertet aus: +20 % Schaden je verschiedenem Zustand auf dem Ziel, und Rimuru legt sich ebenso viel Antichaos an',
      function (c) {
        if (!zaehler(c.self, 'rimuru_ang2', 3)) return;
        var n = gelesen(c.target);
        if (!n) return;
        c.dmg *= 1 + 0.2 * n;
        c.applyStatus(c.self, 'antichaos', n);
      }),
    passiv('rimuru_ang3', 'Angepasst', 'onHit', [], ['chaos'],
      'Führt ein Verbündeter Chaos, schlägt Rimuru 3 % härter je eigenem Antichaos-Stapel — sonst 1 %',
      function (c) {
        var f = truppFuehrt(c, 'chaos') ? 0.03 : 0.01;
        c.dmg *= 1 + Math.min(0.6, f * (c.self.status.antichaos || 0));
      }),
    passiv('rimuru_ang4', 'Azathoth', 'onStart', ['chaos'], [],
      'Rimurus Antichaos zählt doppelt für alles, was daran hängt — dafür verliert er in jedem Zug einen Stapel obendrein',
      function (c) {
        c.self.antichaosDoppelt = 1;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Azathoth', fn: function (k) {
          if ((k.self.status.antichaos || 0) > 0) k.self.status.antichaos--;
        } });
      }),

    passiv('rimuru_mec1', 'Prädator', 'onStart', ['chaos'], [],
      'Verschlingt zu Kampfbeginn das Wissen über das Feld: je verschiedenem Zustand auf allen Gegnern 1 Antichaos für Rimuru',
      function (c) {
        var n = 0;
        c.foes().forEach(function (f) { n += gelesen(f); });
        if (n) c.applyStatus(c.self, 'antichaos', Math.min(8, n));
      }),
    passiv('rimuru_mec2', 'Magen der Unendlichkeit', 'onHit', ['chaos'], [],
      'Jeder dritte Schlag verschlingt einen Stapel jedes Zustands auf dem Ziel — und macht daraus je 2 Antichaos für Rimuru',
      function (c) {
        var geerntet = 0;
        ZUSTAENDE_FEIND.forEach(function (k) {
          if ((c.target.status[k] || 0) > 0) { c.target.status[k]--; geerntet++; }
        });
        if (!geerntet) return;
        if (!zaehler(c.self, 'rimuru_mec2', 3)) {
          /* Der Zähler läuft nur, wenn es etwas zu verschlingen gab — sonst
             würde ein Kampf ohne Zustände den Magen trotzdem füllen. */
          return;
        }
        c.applyStatus(c.self, 'antichaos', geerntet * 2);
      }),
    passiv('rimuru_mec3', 'Analyse teilen', 'onTurnStart', ['chaos'], ['chaos'],
      'Führt ein Verbündeter Chaos, gibt Rimuru jeden Zug 2 seiner Antichaos-Stapel an den ganzen Trupp weiter — sonst 1',
      function (c) {
        var n = truppFuehrt(c, 'chaos') ? 2 : 1;
        if ((c.self.status.antichaos || 0) < n) return;
        c.allies().forEach(function (u) { if (u !== c.self) c.applyStatus(u, 'antichaos', n); });
      }),
    passiv('rimuru_mec4', 'Unendlicher Kerker', 'onStart', ['chaos'], [],
      'Zustände auf Rimurus Zielen bauen sich nicht mehr ab — dafür legt er selbst nie welche an',
      function (c) {
        c.self.fluchmeister = 0.0001;
        c.addEffect(c.self, { hook: 'onHit', name: 'Unendlicher Kerker', fn: function (k) {
          k.target.brandBleibt = 1;
          k.target.verderbnisBleibt = 1;
          k.target.offeneWunde = 1;
          k.target.zaehesChaos = 1;
        } });
      }),

    passiv('rimuru_unt1', 'Bund der Monster', 'onStart', ['chaos'], [],
      'Zu Kampfbeginn 4 Antichaos für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'antichaos', 4); }); }),
    passiv('rimuru_unt2', 'Namensgebung', 'onDamaged', ['chaos'], [],
      'Jeder vierte Treffer auf den Trupp gibt allen 2 Antichaos und dauerhaft +4 Angriff',
      function (c) {
        if (!zaehler(c.self, 'rimuru_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'antichaos', 2); u.atk += 4; });
      }),
    passiv('rimuru_unt3', 'Ordnung aus Analyse', 'onStart', ['chaos'], ['chaos'],
      'Führt ein Verbündeter Chaos, legt jeder Treffer des Trupps dem Schlagenden 1 Antichaos an — sonst nur Rimuru selbst',
      function (c) {
        var alle = truppFuehrt(c, 'chaos');
        (alle ? c.allies() : [c.self]).forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Ordnung aus Analyse', fn: function (k) {
            k.applyStatus(k.self, 'antichaos', 1);
          } });
        });
      }),
    passiv('rimuru_unt4', 'Herr der Monster', 'onStart', ['chaos'], [],
      'Antichaos des Trupps wirkt doppelt — Rimuru selbst greift nur noch mit einem Viertel an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.25);
        c.allies().forEach(function (u) { u.antichaosDoppelt = 1; });
      }),

    passiv('rimuru_def1', 'Schleimleib', 'onStart', [], [],
      'Beginnt mit einem Schild über 34 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.34)); }),
    passiv('rimuru_def2', 'Selbstregeneration', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'rimuru_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Selbstregeneration');
      }),
    passiv('rimuru_def3', 'Vielfraß-Barriere', 'onStart', ['chaos'], ['chaos'],
      'Führt ein Verbündeter Chaos, kostet kein Treffer mehr als 14 % seines Lebens — sonst 20 %',
      function (c) {
        var d = truppFuehrt(c, 'chaos') ? 0.14 : 0.2;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('rimuru_def4', 'Ultimative Fähigkeit', 'onDeath', ['chaos'], [],
      'Steht einmal je Kampf mit 40 % Leben wieder auf und verschlingt dabei das ganze Feld: 1 Antichaos je Zustand auf jedem Gegner — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.4);
        c.self.heilfaktor = -1;
        var n = 0;
        c.foes().forEach(function (f) { n += gelesen(f); });
        if (n) c.applyStatus(c.self, 'antichaos', Math.min(10, n));
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                     side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Soueis Linien: der Assassine --------------------------------------
       Fäden, Doppelgänger und Wurfklingen aus der Verstohlenheit. Souei baut
       nicht sich selbst auf, sondern reißt das Ziel für die anderen auf: die
       Marke gilt für JEDEN Angreifer. Deshalb liegt hier die stärkste
       Unterstützungslinie und die schwächste Angriffslinie.                   */

    passiv('souei_ang1', 'Aus dem Nichts', 'onHit', ['schatten'], ['verwundbar'],
      'Der erste Schnitt kommt aus der Verstohlenheit: 130 % härter, 4 Verwundbar, danach taucht Souei wieder ab',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.3;
        c.markiere(c.target, 4);
        c.applyStatus(c.self, 'schatten', 4);
      }),
    passiv('souei_ang2', 'Wurfklingen', 'onHit', ['flaeche'], [],
      'Jeder dritte Angriff wirft Klingen: 55 % auf jeden Gegner, auch in die Hinterreihe',
      function (c) {
        if (!zaehler(c.self, 'souei_ang2', 3)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.55, 'Wurfklingen'); });
      }),
    passiv('souei_ang3', 'Meuchelschnitt', 'onHit', ['exekution'], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, richtet Souei markierte Ziele unter 40 % Leben hin — sonst trifft er sie nur 12 % härter',
      function (c) {
        if ((c.target.status.verwundbar || 0) <= 0) return;
        if (truppFuehrt(c, 'verwundbar') && c.target.hp < c.target.maxHp * 0.4) c.dmg *= 2.6;
        else c.dmg *= 1.12;
      }),
    passiv('souei_ang4', 'Todesmal', 'onKill', ['exekution'], ['verwundbar'],
      'Jeder Abschuss markiert alle übrigen Gegner mit 5 Verwundbar — und kostet Souei 12 % seines Lebens',
      function (c) {
        c.foes().forEach(function (f) { c.markiere(f, 5); });
        c.deal(c.self, c.self.maxHp * 0.12, 'Todesmal', { pure: true });
      }),

    passiv('souei_mec1', 'Stahlfäden', 'onStart', ['verwundbar', 'blutung'], [],
      'Spannt zu Kampfbeginn die Fäden: 4 Verwundbar und 2 Blutung auf jeden Gegner',
      function (c) {
        c.foes().forEach(function (f) { c.markiere(f, 4); c.applyStatus(f, 'blutung', 2); });
      }),
    passiv('souei_mec2', 'Aufgerissene Wunde', 'onHit', ['verwundbar', 'blutung'], [],
      'Jeder dritte Schnitt legt 4 Verwundbar nach und lässt das Ziel mit 4 bluten',
      function (c) {
        if (!zaehler(c.self, 'souei_mec2', 3)) return;
        c.markiere(c.target, 4);
        c.applyStatus(c.target, 'blutung', 4);
      }),
    passiv('souei_mec3', 'Schattendoppel', 'onStart', ['schatten'], [],
      'Ein Doppelgänger schlägt mit: 55 % je Treffer, wenn ein Verbündeter Schatten führt — sonst 22 %',
      function (c) {
        var m = truppFuehrt(c, 'schatten') ? 0.55 : 0.22;
        c.addEffect(c.self, { hook: 'onHit', name: 'Schattendoppel', fn: function (k) {
          k.deal(k.target, k.self.atk * m, 'Schattendoppel');
        } });
      }),
    passiv('souei_mec4', 'Schwarmmal', 'onMarke', ['verwundbar'], [],
      'Jede Marke springt in voller Höhe auf alle Gegner über — dafür schlägt Souei 40 % schwächer',
      function (c) {
        if (c.self._schwarm) return;
        c.self._schwarm = 1;
        c.self.atk = Math.round(c.self.atk * 0.6);
        c.foes().forEach(function (f) {
          if (f !== c.ziel) c.applyStatus(f, 'verwundbar', c.stapel || 1);
        });
        c.self._schwarm = 0;
      }),

    passiv('souei_unt1', 'Gezeichnetes Ziel', 'onStart', ['verwundbar'], [],
      'Zu Kampfbeginn 3 Verwundbar auf jeden Gegner und +8 % Angriff für den Trupp',
      function (c) {
        c.foes().forEach(function (f) { c.markiere(f, 3); });
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.08); });
      }),
    passiv('souei_unt2', 'Blutspur', 'onDamaged', ['blutung'], [],
      'Jeder vierte Treffer auf den Trupp lässt alle Gegner mit 3 bluten',
      function (c) {
        if (!zaehler(c.self, 'souei_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'blutung', 3); });
      }),
    /* Gift lag hier einmal — Souei trug damit Marke, Blutung, Schatten,
       Doppelgänger UND Gift. Eine Mechanik zu viel: die Fäden machen dieselbe
       Arbeit und gehören ihm. Gift lebt in der Bibliothek und bei Apito und
       dem Giftfalter weiter. */
    passiv('souei_unt3', 'Fadennetz', 'onStart', ['verwundbar'], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, schneiden die Fäden bei jedem Treffer des Trupps auf markierte Ziele für 35 % nach — sonst für 14 %',
      function (c) {
        var m = truppFuehrt(c, 'verwundbar') ? 0.35 : 0.14;
        var atk = c.self.atk;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Fadennetz', fn: function (k) {
            if ((k.target.status.verwundbar || 0) > 0) k.deal(k.target, atk * m, 'Fadennetz');
          } });
        });
      }),
    passiv('souei_unt4', 'Jagdbefehl', 'onStart', ['verwundbar'], [],
      'Der Trupp trifft markierte Ziele 35 % härter — Souei selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Jagdbefehl', fn: function (k) {
            if ((k.target.status.verwundbar || 0) > 0) k.dmg *= 1.35;
          } });
        });
      }),

    passiv('souei_def1', 'Schattenschritt', 'onStart', ['schatten'], [],
      'Beginnt den Kampf verborgen und mit +20 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schatten', 4);
        c.self.spd = Math.round(c.self.spd * 1.2);
      }),
    passiv('souei_def2', 'Fadenschild', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer spannt ein Fadennetz: Schild über 20 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'souei_def2', 3)) return;
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.2));
      }),
    passiv('souei_def3', 'Gegenfaden', 'onDamaged', ['konter'], [],
      'Führt ein Verbündeter Konter, schneiden die Fäden mit 45 % des Angriffs zurück — sonst mit 18 %',
      function (c) {
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * (truppFuehrt(c, 'konter') ? 0.45 : 0.18), 'Gegenfaden');
      }),
    passiv('souei_def4', 'Nebelform', 'onStart', ['schatten'], [],
      'Souei verschwindet jeden Zug aufs Neue — dafür hält er nur noch die Hälfte aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Nebelform', fn: function (k) {
          k.applyStatus(k.self, 'schatten', 3);
        } });
      }),

    /* ---- Benimarus Linien: Flammenmagie und Feldherrschaft -----------------
       Sein Feuer ist Magie, keine Klinge: es fragt nicht nach Rüstung. Und er
       ist Heerführer — die Unterstützungslinie befehligt den Trupp, statt ihn
       nur zu verstärken.                                                      */

    passiv('ben_ang1', 'Glutzorn', 'onHit', ['brand'], [],
      'Der erste Schlag des Kampfes trifft 120 % härter, ignoriert als Magie die Rüstung und setzt alle Gegner mit 3 Brand in Flammen',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.2;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 3); });
      }),
    passiv('ben_ang2', 'Schwarze Flamme', 'onHit', ['brand'], [],
      'Jeder dritte Schlag entzündet reine Flamme: 90 % Schaden, den weder Rüstung noch Schild aufhalten',
      function (c) {
        if (!zaehler(c.self, 'ben_ang2', 3)) return;
        c.deal(c.target, c.self.atk * 0.9, 'Schwarze Flamme', { pure: true });
      }),
    passiv('ben_ang3', 'Aschesturm', 'onHit', ['flaeche'], ['brand'],
      'Führt ein Verbündeter Brand, trifft Benimaru jeden brennenden Gegner für 50 % mit — sonst für 20 %',
      function (c) {
        var m = truppFuehrt(c, 'brand') ? 0.5 : 0.2;
        c.foes().forEach(function (f) {
          if (f !== c.target && (f.status.brand || 0) > 0) c.deal(f, c.self.atk * m, 'Aschesturm');
        });
      }),
    passiv('ben_ang4', 'Entfesseltes Kurenai', 'onStart', ['brand'], [],
      'Benimarus Flamme fragt nie nach Rüstung, und jeder Abschuss entzündet alle übrigen — dafür verbrennt er selbst jeden Zug 3 % seines Lebens',
      function (c) {
        c.self.pierce = 1;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Entfesseltes Kurenai', fn: function (k) {
          k.deal(k.self, k.self.maxHp * 0.03, 'Entfesseltes Kurenai', { pure: true });
        } });
        c.addEffect(c.self, { hook: 'onKill', name: 'Entfesseltes Kurenai', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'brand', 5); });
          k.self.atk = Math.round(k.self.atk * 1.15);
        } });
      }),

    passiv('ben_mec1', 'Flammenmeister', 'onStart', ['brand'], [],
      'Setzt zu Kampfbeginn jeden Gegner mit 4 Brand in Flammen',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 4); }); }),
    passiv('ben_mec2', 'Zunder', 'onHit', ['brand'], [],
      'Jeder dritte Schlag trägt das Feuer mit 3 Brand auf alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'ben_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 3); });
      }),
    passiv('ben_mec3', 'Dauerbrand', 'onStart', ['brand'], [],
      'Führt ein Verbündeter Brand, baut sich Feuer auf Benimarus Zielen nicht mehr ab — sonst legt er jeden Zug 1 nach',
      function (c) {
        var haelt = truppFuehrt(c, 'brand');
        c.addEffect(c.self, { hook: 'onHit', name: 'Dauerbrand', fn: function (k) {
          if (haelt) k.target.brandBleibt = 1;
          else if ((k.target.status.brand || 0) > 0) k.applyStatus(k.target, 'brand', 1);
        } });
      }),
    passiv('ben_mec4', 'Höllenlohe', 'onStart', ['brand'], [],
      'Brand richtet doppelten Schaden an — dafür heilt Benimaru nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Höllenlohe', fn: function (k) {
          k.foes().forEach(function (f) {
            var b = f.status.brand || 0;
            if (b > 0) k.deal(f, b * 2, 'Höllenlohe', { pure: true });
          });
        } });
      }),

    passiv('ben_unt1', 'Feldherr', 'onStart', [], [],
      'Zu Kampfbeginn +14 % Angriff für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.14); }); }),
    passiv('ben_unt2', 'Angriffsbefehl', 'onDamaged', ['brand'], [],
      'Jeder vierte Treffer auf den Trupp löst einen Befehl aus: alle Gegner brennen mit 3, alle Verbündeten schlagen dauerhaft +5 Angriff',
      function (c) {
        if (!zaehler(c.self, 'ben_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 3); });
        c.allies().forEach(function (u) { u.atk += 5; });
      }),
    passiv('ben_unt3', 'Sengende Reihen', 'onStart', [], ['brand'],
      'Führt ein Verbündeter Brand, schlägt der Trupp gegen brennende Ziele 28 % härter — sonst 10 %',
      function (c) {
        var m = truppFuehrt(c, 'brand') ? 1.28 : 1.1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Sengende Reihen', fn: function (k) {
            if ((k.target.status.brand || 0) > 0) k.dmg *= m;
          } });
        });
      }),
    passiv('ben_unt4', 'Kriegsherr', 'onStart', [], [],
      'Benimaru führt statt zu kämpfen: der Trupp bekommt +28 % Angriff und +12 % Tempo, er selbst schlägt nur noch halb so hart',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.atk = Math.round(u.atk * 1.28);
          u.spd = Math.round(u.spd * 1.12);
        });
        c.self.atk = Math.round(c.self.atk * 0.5);
      }),

    passiv('ben_def1', 'Flammenhaut', 'onStart', ['brand'], [],
      'Beginnt mit Schild über 30 % seines Lebens; wer ihn trifft, fängt mit 2 Brand Feuer',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3));
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Flammenhaut', fn: function (k) {
          var f = k.foes()[0];
          if (f) k.applyStatus(f, 'brand', 2);
        } });
      }),
    passiv('ben_def2', 'Glutpanzer', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens und setzt alle Gegner mit 2 Brand in Flammen',
      function (c) {
        if (!zaehler(c.self, 'ben_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.08, 'Glutpanzer');
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 2); });
      }),
    passiv('ben_def3', 'Ascheleib', 'onStart', [], ['brand'],
      'Führt ein Verbündeter Brand, kostet kein Treffer mehr als 17 % seines Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'brand') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('ben_def4', 'Wiedergeburt aus Asche', 'onDeath', ['brand'], [],
      'Steht einmal mit 45 % Leben wieder auf und setzt alle Gegner mit 6 Brand in Flammen — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 6); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Shunas Linien: Heilung, Schutz und göttliche Angriffsmagie --------
       Die Priesterin führt drei Arten von Magie. Ihre Angriffslinie schlägt
       nicht mit der Klinge, sondern mit Licht: Schaden, den weder Rüstung noch
       Schild aufhält — dafür in kleinen Anteilen.                             */

    passiv('shu_ang1', 'Heiliger Strahl', 'onHit', ['licht'], [],
      'Der erste Schlag des Kampfes ruft Licht herab: 45 % auf jeden Gegner, ungehindert von Rüstung und Schild',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.foes().forEach(function (f) { heiligerSchlag(c, f, 0.45, 'Heiliger Strahl'); });
      }),
    passiv('shu_ang2', 'Läuterung', 'onHit', ['licht'], [],
      'Jeder dritte Schlag brennt mit 70 % göttlichem Licht durch alles hindurch und hüllt Shuna selbst darin ein',
      function (c) {
        if (!zaehler(c.self, 'shu_ang2', 3)) return;
        heiligerSchlag(c, c.target, 0.7, 'Läuterung');
        c.applyStatus(c.self, 'licht', 2);
      }),
    passiv('shu_ang3', 'Gericht', 'onHit', ['licht'], ['licht'],
      'Führt ein Verbündeter Licht, richtet jeder Schlag zusätzlich 55 % göttlichen Schaden an — sonst 18 %',
      function (c) {
        heiligerSchlag(c, c.target, truppFuehrt(c, 'licht') ? 0.55 : 0.18, 'Gericht');
      }),
    passiv('shu_ang4', 'Heiliger Zorn', 'onStart', [], ['licht'],
      'Shunas Licht wächst mit ihrem eigenen Leben (bis +60 %) — dafür heilt jede Heilung sie nur halb',
      function (c) {
        c.self.heilfaktor = -0.5;
        c.addEffect(c.self, { hook: 'onHit', name: 'Heiliger Zorn', fn: function (k) {
          k.dmg *= 1 + 0.6 * (k.self.hp / k.self.maxHp);
        } });
      }),

    passiv('shu_mec1', 'Gnadenquelle', 'onStart', ['heilung'], [],
      'Heilt den Trupp zu Kampfbeginn um 12 % und gibt allen +5 Regeneration',
      function (c) {
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.12, 'Gnadenquelle'); u.regen += 5; });
      }),
    passiv('shu_mec2', 'Bollwerk des Glaubens', 'onDamaged', ['schild'], [],
      'Jeder dritte erlittene Treffer legt dem ganzen Trupp Schild an',
      function (c) {
        if (!zaehler(c.self, 'shu_mec2', 3)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.8)); });
      }),
    passiv('shu_mec3', 'Überfluss', 'onStart', ['heilung'], [],
      'Führt ein Verbündeter Heilung, wirkt jede Heilung im Trupp 28 % stärker — sonst 10 %',
      function (c) {
        var f = truppFuehrt(c, 'heilung') ? 0.28 : 0.1;
        c.allies().forEach(function (u) { u.heilfaktor += f; });
      }),
    passiv('shu_mec4', 'Ewige Quelle', 'onStart', ['heilung'], [],
      'Jeder Zug heilt den ganzen Trupp um 5 % — dafür schlägt Shuna nur noch mit einem Viertel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.25);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Ewige Quelle', fn: function (k) {
          k.allies().forEach(function (u) { k.heal(u, u.maxHp * 0.05, 'Ewige Quelle'); });
        } });
      }),

    passiv('shu_unt1', 'Schutzkreis', 'onStart', ['schild', 'licht'], [],
      'Legt zu Kampfbeginn dem ganzen Trupp ein Schild an und stellt ihn ins göttliche Licht',
      function (c) {
        c.allies().forEach(function (u) {
          c.applyStatus(u, 'schild', Math.round(c.self.atk * 1.1));
          c.applyStatus(u, 'licht', 2);
        });
      }),
    passiv('shu_unt2', 'Reinigung', 'onDamaged', ['licht'], [],
      'Jeder vierte Treffer auf den Trupp legt allen göttliches Licht an',
      function (c) {
        if (!zaehler(c.self, 'shu_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'licht', 2); });
      }),
    passiv('shu_unt3', 'Lebensband', 'onStart', [], ['heilung'],
      'Führt ein Verbündeter Heilung, regeneriert der ganze Trupp +8 — sonst +3',
      function (c) {
        var n = truppFuehrt(c, 'heilung') ? 8 : 3;
        c.allies().forEach(function (u) { u.regen += n; });
      }),
    passiv('shu_unt4', 'Göttlicher Segen', 'onStart', ['heilung', 'schild'], [],
      'Der Trupp bekommt +14 % Leben und 30 % stärkere Heilung — Shuna greift überhaupt nicht mehr an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.heilfaktor += 0.3;
          var add = Math.round(u.maxHp * 0.14);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = 1;
      }),

    passiv('shu_def1', 'Gebetsschild', 'onStart', ['schild', 'licht'], [],
      'Beginnt mit einem Schild über 28 % ihres Lebens und im göttlichen Licht',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.28));
        c.applyStatus(c.self, 'licht', 6);
      }),
    passiv('shu_def2', 'Unantastbar', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 9 % ihres Lebens',
      function (c) {
        if (!zaehler(c.self, 'shu_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.09, 'Unantastbar');
      }),
    passiv('shu_def3', 'Letzte Bitte', 'onDeath', ['heilung'], [],
      'Führt ein Verbündeter Heilung, steht Shuna mit 40 % Leben wieder auf — sonst mit 22 %',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * (truppFuehrt(c, 'heilung') ? 0.4 : 0.22));
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('shu_def4', 'Heiliger Hain', 'onStart', ['licht'], [],
      'Kein Treffer kostet mehr als 15 % ihres Lebens — dafür ist Shuna nur noch halb so schnell',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.15);
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
      }),

    /* ---- Adalmanns Linien: Totenmagie und ein Priesterleben ----------------
       Vor dem Wight-Dasein war er Priester. Deshalb führt er beides: Verderbnis
       aus dem Grab und göttliche Angriffsmagie aus der alten Ausbildung — das
       Licht, das weder Rüstung noch Schild kennt. Dass ausgerechnet ein Untoter
       es noch rufen kann, ist sein ganzer Charakter.                          */

    passiv('adal_ang1', 'Totengebet', 'onHit', ['licht', 'verderbnis'], [],
      'Der erste Schlag des Kampfes ruft das alte Gebet: 45 % göttlicher Schaden auf jeden Gegner, ungehindert von Rüstung und Schild, dazu 3 Verderbnis',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.foes().forEach(function (f) {
          heiligerSchlag(c, f, 0.45, 'Totengebet');
          c.applyStatus(f, 'verderbnis', 3);
        });
      }),
    passiv('adal_ang2', 'Bannstrahl', 'onHit', ['licht'], [],
      'Jeder dritte Schlag richtet 75 % göttlichen Schaden an, den nichts aufhält',
      function (c) {
        if (!zaehler(c.self, 'adal_ang2', 3)) return;
        heiligerSchlag(c, c.target, 0.75, 'Bannstrahl');
      }),
    passiv('adal_ang3', 'Letzte Ölung', 'onHit', ['licht'], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, verbrennt Adalmann verdorbene Ziele mit 60 % göttlichem Schaden — sonst mit 20 %',
      function (c) {
        if ((c.target.status.verderbnis || 0) <= 0) return;
        heiligerSchlag(c, c.target, truppFuehrt(c, 'verderbnis') ? 0.6 : 0.2, 'Letzte Ölung');
      }),
    passiv('adal_ang4', 'Abgefallener Priester', 'onStart', ['licht'], [],
      'Jeder Zug schleudert 40 % göttliches Licht auf alle Gegner — dafür heilt Adalmann nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Abgefallener Priester', fn: function (k) {
          k.foes().forEach(function (f) { heiligerSchlag(k, f, 0.4, 'Abgefallener Priester'); });
        } });
      }),

    passiv('adal_mec1', 'Todesbann', 'onStart', ['verderbnis'], [],
      'Legt zu Kampfbeginn 4 Verderbnis auf jeden Gegner',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 4); }); }),
    passiv('adal_mec2', 'Grabesatem', 'onHit', ['verderbnis'], [],
      'Jeder dritte Schlag legt 4 Verderbnis auf alle Gegner nach',
      function (c) {
        if (!zaehler(c.self, 'adal_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'verderbnis', 4); });
      }),
    passiv('adal_mec3', 'Seelenzehrer', 'onHit', ['heilung'], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, zieht jeder Schlag 8 % Leben aus verdorbenen Zielen — sonst 3 %',
      function (c) {
        if ((c.target.status.verderbnis || 0) <= 0) return;
        c.heal(c.self, c.self.maxHp * (truppFuehrt(c, 'verderbnis') ? 0.08 : 0.03), 'Seelenzehrer');
      }),
    passiv('adal_mec4', 'Verfluchtes Wort', 'onStart', ['verderbnis'], [],
      'Verderbnis auf Adalmanns Zielen baut sich nicht mehr ab — dafür schlägt er 35 % schwächer',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.65);
        c.addEffect(c.self, { hook: 'onHit', name: 'Verfluchtes Wort', fn: function (k) {
          k.target.verderbnisBleibt = 1;
          k.applyStatus(k.target, 'verderbnis', 2);
        } });
      }),

    passiv('adal_unt1', 'Weihe', 'onStart', ['licht', 'schild'], [],
      'Stellt den Trupp zu Kampfbeginn ins göttliche Licht und legt allen ein Schild an',
      function (c) {
        c.allies().forEach(function (u) {
          c.applyStatus(u, 'licht', 2);
          c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.7));
        });
      }),
    passiv('adal_unt2', 'Sterbesakrament', 'onDamaged', ['licht'], [],
      'Jeder vierte Treffer auf den Trupp ruft Licht: 35 % göttlicher Schaden auf alle Gegner und Licht für alle Verbündeten',
      function (c) {
        if (!zaehler(c.self, 'adal_unt2', 4)) return;
        c.foes().forEach(function (f) { heiligerSchlag(c, f, 0.35, 'Sterbesakrament'); });
        c.allies().forEach(function (u) { c.applyStatus(u, 'licht', 1); });
      }),
    passiv('adal_unt3', 'Predigt', 'onStart', [], ['verderbnis'],
      'Führt ein Verbündeter Verderbnis, legt jeder Treffer des Trupps 2 Verderbnis an — sonst 1',
      function (c) {
        var n = truppFuehrt(c, 'verderbnis') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Predigt', fn: function (k) {
            k.applyStatus(k.target, 'verderbnis', n);
          } });
        });
      }),
    passiv('adal_unt4', 'Totenmesse', 'onStart', ['licht'], [],
      'Der Trupp schlägt mit 25 % göttlichem Licht nach — Adalmann selbst greift nur noch mit einem Drittel an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.34);
        andere.forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Totenmesse', fn: function (k) {
            heiligerSchlag(k, k.target, 0.25, 'Totenmesse');
          } });
        });
      }),

    passiv('adal_def1', 'Knochenkutte', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 32 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.32)); }),
    passiv('adal_def2', 'Grabesruhe', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'adal_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.08, 'Grabesruhe');
      }),
    passiv('adal_def3', 'Geweihter Boden', 'onStart', [], ['licht'],
      'Führt ein Verbündeter Licht, kostet kein Treffer mehr als 15 % seines Lebens — sonst 21 %',
      function (c) {
        var d = truppFuehrt(c, 'licht') ? 0.15 : 0.21;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('adal_def4', 'Wiederkehr des Wight', 'onDeath', ['licht', 'verderbnis'], [],
      'Steht einmal mit 45 % Leben wieder auf und verbrennt dabei jeden Gegner mit 80 % göttlichem Licht — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.foes().forEach(function (f) { heiligerSchlag(c, f, 0.8, 'Wiederkehr des Wight'); });
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Hakuros Linien: Klinge und Exekution -----------------------------
       Der alte Schwertmeister. Er räumt Angeschlagenes ab und gibt sein Können
       an den Trupp weiter.                                                    */

    passiv('hak_ang1', 'Klingengeist', 'onHit', ['exekution'], [],
      'Der erste Schnitt des Kampfes trifft 140 % härter und ignoriert die Rüstung',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.4;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('hak_ang2', 'Schwertmeister', 'onHit', [], [],
      'Jeder dritte Schnitt trifft ein zweites Mal für 80 %',
      function (c) {
        if (!zaehler(c.self, 'hak_ang2', 3)) return;
        c.deal(c.target, c.self.atk * 0.8, 'Schwertmeister');
      }),
    passiv('hak_ang3', 'Todeshieb', 'onHit', ['exekution'], [],
      'Führt ein Verbündeter Exekution, trifft Hakuro Ziele unter 40 % Leben dreifach — sonst doppelt',
      function (c) {
        if (c.target.hp >= c.target.maxHp * 0.4) return;
        c.dmg *= truppFuehrt(c, 'exekution') ? 3 : 2;
      }),
    passiv('hak_ang4', 'Hundert Schnitte', 'onStart', ['exekution'], [],
      'Jeder Abschuss gibt einen weiteren Zug und +10 % Angriff — dafür hält Hakuro nur die Hälfte aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onKill', name: 'Hundert Schnitte', fn: function (k) {
          k.self.atk = Math.round(k.self.atk * 1.1);
          k.self.gauge = (k.self.gauge || 0) + 100;
        } });
      }),

    passiv('hak_mec1', 'Auge des Meisters', 'onStart', ['exekution'], [],
      'Beginnt den Kampf mit 45 % Rüstungsdurchschlag',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.45); }),
    passiv('hak_mec2', 'Gnadenstoß', 'onHit', ['exekution'], [],
      'Jeder dritte Schnitt nimmt dem Ziel zusätzlich 8 % seines maximalen Lebens',
      function (c) {
        if (!zaehler(c.self, 'hak_mec2', 3)) return;
        c.deal(c.target, c.target.maxHp * 0.08, 'Gnadenstoß', { pure: true });
      }),
    passiv('hak_mec3', 'Blutspur', 'onHit', ['blutung'], ['blutung'],
      'Führt ein Verbündeter Blutung, lässt jeder Schnitt mit 3 bluten und trifft blutende Ziele 20 % härter — sonst nur 1 Blutung',
      function (c) {
        var mit = truppFuehrt(c, 'blutung');
        if (mit && (c.target.status.blutung || 0) > 0) c.dmg *= 1.2;
        c.applyStatus(c.target, 'blutung', mit ? 3 : 1);
      }),
    passiv('hak_mec4', 'Schnitter', 'onStart', ['exekution'], [],
      'Gegen Ziele unter der Hälfte trifft Hakuro doppelt — gegen volle nur noch halb',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Schnitter', fn: function (k) {
          k.dmg *= k.target.hp < k.target.maxHp * 0.5 ? 2 : 0.5;
        } });
      }),

    passiv('hak_unt1', 'Lehrmeister', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Angriff und +8 % Tempo für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          u.spd = Math.round(u.spd * 1.08);
        });
      }),
    passiv('hak_unt2', 'Schule des Schwertes', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen 25 % Rüstungsdurchschlag',
      function (c) {
        if (!zaehler(c.self, 'hak_unt2', 4)) return;
        c.allies().forEach(function (u) { u.pierce = Math.max(u.pierce || 0, 0.25); });
      }),
    passiv('hak_unt3', 'Gemeinsamer Schnitt', 'onStart', [], ['exekution'],
      'Führt ein Verbündeter Exekution, trifft der Trupp angeschlagene Ziele 30 % härter — sonst 12 %',
      function (c) {
        var m = truppFuehrt(c, 'exekution') ? 1.3 : 1.12;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gemeinsamer Schnitt', fn: function (k) {
            if (k.target.hp < k.target.maxHp * 0.5) k.dmg *= m;
          } });
        });
      }),
    passiv('hak_unt4', 'Vermächtnis', 'onStart', ['exekution'], [],
      'Der Trupp bekommt 40 % Rüstungsdurchschlag — Hakuro selbst verliert die halbe Rüstung und ein Drittel Leben',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.pierce = Math.max(u.pierce || 0, 0.4); });
        c.self.def = Math.round(c.self.def * 0.5);
        c.self.maxHp = Math.round(c.self.maxHp * 0.67);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('hak_def1', 'Ausweichschritt', 'onStart', ['tempo'], [],
      'Beginnt mit Schild über 26 % seines Lebens und +18 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.26));
        c.self.spd = Math.round(c.self.spd * 1.18);
      }),
    passiv('hak_def2', 'Parade', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer wird mit 70 % des Angriffs pariert',
      function (c) {
        if (!zaehler(c.self, 'hak_def2', 3)) return;
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * 0.7, 'Parade');
      }),
    passiv('hak_def3', 'Alter Fuchs', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 16 % seines Lebens — sonst 22 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.16 : 0.22;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('hak_def4', 'Unbeugsam', 'onStart', [], [],
      'Der erste tödliche Treffer lässt ihm 1 Leben — dafür heilt ihn nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onDeath', name: 'Unbeugsam', fn: function (k) {
          if (k.self._auf) return;
          k.self._auf = 1; k.self.hp = 1;
          k.log.push({ t: 0, type: 'revive', key: k.self.key, unit: k.self.name, side: k.self.side, hp: 1 });
        } });
      }),

    /* ---- Kurobes Linien: die Schmiede -------------------------------------
       Der Waffenschmied zieht seine Stärke aus der Ausrüstung — der eigenen und
       der des Trupps. `itemZahl` ist die Zahl der getragenen Stücke.          */

    passiv('kur_ang1', 'Scharfschliff', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 100 % härter, je Ausrüstungsstück weitere 25 %',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2 + 0.25 * c.self.itemZahl;
      }),
    passiv('kur_ang2', 'Meisterklinge', 'onHit', [], [],
      'Jeder dritte Schlag trifft doppelt und ignoriert Rüstung je Ausrüstungsstück ein Stück mehr',
      function (c) {
        if (!zaehler(c.self, 'kur_ang2', 3)) return;
        c.dmg *= 2;
        c.self.pierce = Math.max(c.self.pierce || 0, Math.min(1, 0.25 * c.self.itemZahl));
      }),
    passiv('kur_ang3', 'Gehärtet', 'onHit', [], ['schild'],
      'Führt ein Verbündeter Schild, schlägt Kurobe 8 % härter je Ausrüstungsstück — sonst 3 %',
      function (c) {
        c.dmg *= 1 + (truppFuehrt(c, 'schild') ? 0.08 : 0.03) * c.self.itemZahl;
      }),
    passiv('kur_ang4', 'Legierung', 'onStart', [], [],
      'Jedes Ausrüstungsstück gibt +18 % Angriff — ohne Ausrüstung schlägt Kurobe nur mit einem Drittel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * (c.self.itemZahl ? 1 + 0.18 * c.self.itemZahl : 0.34));
      }),

    passiv('kur_mec1', 'Schmiedefeuer', 'onStart', ['brand'], [],
      'Setzt zu Kampfbeginn jeden Gegner mit 3 Brand in Flammen und gibt sich +4 Rüstung je Ausrüstungsstück',
      function (c) {
        c.foes().forEach(function (f) { c.applyStatus(f, 'brand', 3); });
        c.self.def += 4 * c.self.itemZahl;
      }),
    passiv('kur_mec2', 'Nachschärfen', 'onHit', [], [],
      'Jeder dritte Schlag gibt dauerhaft +6 Angriff',
      function (c) {
        if (!zaehler(c.self, 'kur_mec2', 3)) return;
        c.self.atk += 6;
      }),
    passiv('kur_mec3', 'Zweitklinge', 'onHit', [], ['tempo'],
      'Führt ein Verbündeter Tempo, schlägt Kurobe zu 40 % ein zweites Mal — sonst zu 18 %',
      function (c) {
        if (c.rng() >= (truppFuehrt(c, 'tempo') ? 0.4 : 0.18)) return;
        c.deal(c.target, c.self.atk * 0.65, 'Zweitklinge');
      }),
    passiv('kur_mec4', 'Waffenmeister', 'onStart', [], [],
      'Kurobe trägt seine Ausrüstung doppelt — dafür ist er nur noch halb so schnell',
      function (c) {
        c.self.atk = Math.round(c.self.atk * (1 + 0.12 * c.self.itemZahl));
        c.self.def = Math.round(c.self.def * (1 + 0.12 * c.self.itemZahl));
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
      }),

    passiv('kur_unt1', 'Rüstmeister', 'onStart', [], [],
      'Zu Kampfbeginn +8 % Angriff und +8 % Rüstung für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.08);
          u.def = Math.round(u.def * 1.08);
        });
      }),
    passiv('kur_unt2', 'Kriegsschmiede', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen +5 Angriff und +5 Rüstung',
      function (c) {
        if (!zaehler(c.self, 'kur_unt2', 4)) return;
        c.allies().forEach(function (u) { u.atk += 5; u.def += 5; });
      }),
    passiv('kur_unt3', 'Bannerträger', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, bekommt der Trupp Schild je Ausrüstungsstück Kurobes — sonst die Hälfte',
      function (c) {
        var f = truppFuehrt(c, 'schild') ? 1 : 0.5;
        var amt = Math.round((20 + 22 * c.self.itemZahl) * f);
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', amt); });
      }),
    passiv('kur_unt4', 'Schmied der Legenden', 'onStart', [], [],
      'Die Verbündeten schlagen und halten 25 % besser — Kurobe legt seine eigene Ausrüstung ab',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.atk = Math.round(u.atk * 1.25);
          u.def = Math.round(u.def * 1.25);
        });
        c.self.atk = Math.round(c.self.atk * 0.6);
        c.self.def = Math.round(c.self.def * 0.6);
      }),

    passiv('kur_def1', 'Amboss', 'onStart', [], [],
      'Beginnt mit Schild über 30 % seines Lebens, plus 6 % je Ausrüstungsstück',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * (0.3 + 0.06 * c.self.itemZahl)));
      }),
    passiv('kur_def2', 'Gehärteter Leib', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % und gibt +3 Rüstung',
      function (c) {
        if (!zaehler(c.self, 'kur_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.07, 'Gehärteter Leib');
        c.self.def += 3;
      }),
    passiv('kur_def3', 'Werkstattschild', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 16 % seines Lebens — sonst 22 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.16 : 0.22;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('kur_def4', 'Unzerbrechlich', 'onStart', [], [],
      'Kein Treffer kostet mehr als 14 % seines Lebens — dafür schlägt Kurobe nur noch halb so hart',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.135);
        c.self.atk = Math.round(c.self.atk * 0.5);
      }),
    /* ---- Die vier Stufen gelten auch für die handgeschriebenen Linien ------
       Auftakt (1), Manöverzähler (2), Voraussetzung an den Trupp (3), Keystone
       mit Preis (4) — siehe PLAN.md, Phase 21. Das Thema bleibt das der
       Einheit; nur der Aufbau ist überall derselbe. `zaehler` und
       `truppFuehrt` stehen weiter unten und sind hochgezogen.                 */

    /* ---- Gobtas Linien: Glück ---------------------------------------------
       Der billigste Anfang im Spiel. Seine Mechanik ist der Würfel: fast alles
       hängt an einer Probe, die auch danebengehen darf.                       */

    passiv('gobta_ang1', 'Anfängerglück', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft dreifach',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 3;
      }),
    passiv('gobta_ang2', 'Glückssträhne', 'onHit', [], [],
      'Jeder dritte Schlag trifft doppelt, und die Rüstung zählt dann nicht',
      function (c) {
        if (!zaehler(c.self, 'gobta_ang2', 3)) return;
        c.dmg *= 2;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('gobta_ang3', 'Volltreffer', 'onHit', [], ['exekution'],
      'Führt ein Verbündeter Exekution, hat jeder Treffer 35 % Chance auf doppelten Schaden — sonst 12 %',
      function (c) {
        if (c.rng() < (truppFuehrt(c, 'exekution') ? 0.35 : 0.12)) c.dmg *= 2;
      }),
    passiv('gobta_ang4', 'Unverschämtes Glück', 'onHit', ['exekution'], [],
      'Jeder Treffer wird gewürfelt: 30 % dreifacher Schaden, 30 % fast keiner',
      function (c) {
        var w = c.rng();
        if (w < 0.3) c.dmg *= 3;
        else if (w > 0.7) c.dmg *= 0.15;
      }),

    passiv('gobta_mec1', 'Würfelglück', 'onStart', [], [],
      'Ein Wurf zu Kampfbeginn: +10 Angriff, +10 Rüstung oder +25 % Tempo',
      function (c) {
        var w = c.rng();
        if (w < 0.34) c.self.atk += 10;
        else if (w < 0.67) c.self.def += 10;
        else c.self.spd = Math.round(c.self.spd * 1.25);
      }),
    passiv('gobta_mec2', 'Zweite Chance', 'onDamaged', ['heilung'], [],
      'Jeder dritte erlittene Treffer wird vollständig zurückgeheilt',
      function (c) {
        if (!zaehler(c.self, 'gobta_mec2', 3)) return;
        c.heal(c.self, c.amount || 0, 'Zweite Chance');
      }),
    passiv('gobta_mec3', 'Immer wieder', 'onDeath', ['heilung'], [],
      'Führt ein Verbündeter Heilung, steht Gobta sicher wieder auf — sonst nur mit 40 % Wahrscheinlichkeit',
      function (c) {
        if (c.self._auf) return;
        if (!truppFuehrt(c, 'heilung') && c.rng() >= 0.4) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.35);
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('gobta_mec4', 'Schicksalswende', 'onStart', ['verderbnis'], [],
      'Jeder Zug legt allen Gegnern 2 Verderbnis an — dafür schlägt Gobta ein Drittel schwächer',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.67);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Schicksalswende', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'verderbnis', 2); });
        } });
      }),

    passiv('gobta_unt1', 'Ansteckender Frohsinn', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +12 % Tempo für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.12); }); }),
    passiv('gobta_unt2', 'Kameradschaft', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen +6 Angriff',
      function (c) {
        if (!zaehler(c.self, 'gobta_unt2', 4)) return;
        c.allies().forEach(function (u) { u.atk += 6; });
      }),
    passiv('gobta_unt3', 'Glücksbringer', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, hat jeder Treffer des Trupps 18 % Chance auf doppelten Schaden — sonst 8 %',
      function (c) {
        var p = truppFuehrt(c, 'tempo') ? 0.18 : 0.08;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Glücksbringer', fn: function (k) {
            if (k.rng() < p) k.dmg *= 2;
          } });
        });
      }),
    passiv('gobta_unt4', 'Gobtas Truppe', 'onStart', [], [],
      'Die Verbündeten bekommen +25 % Angriff und Leben — Gobta gibt ein Drittel seines Lebens dafür',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.atk = Math.round(u.atk * 1.25);
          var add = Math.round(u.maxHp * 0.25);
          u.maxHp += add; u.hp += add;
        });
        c.self.maxHp = Math.round(c.self.maxHp * 0.67);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('gobta_def1', 'Ausweichen', 'onStart', ['schild', 'tempo'], [],
      'Beginnt mit Schild über 30 % seines Lebens und +20 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3));
        c.self.spd = Math.round(c.self.spd * 1.2);
      }),
    passiv('gobta_def2', 'Zäher Bursche', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 7 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'gobta_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.07, 'Zäher Bursche');
      }),
    passiv('gobta_def3', 'Glücksschild', 'onStart', ['schild'], [],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 18 % seines Lebens — sonst 25 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.18 : 0.25;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('gobta_def4', 'Unsterblicher Gobta', 'onStart', [], [],
      'Der erste tödliche Treffer lässt ihm 1 Leben — dafür heilt ihn nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onDeath', name: 'Unsterblicher Gobta', fn: function (k) {
          if (k.self._auf) return;
          k.self._auf = 1; k.self.hp = 1;
          k.log.push({ t: 0, type: 'revive', key: k.self.key, unit: k.self.name, side: k.self.side, hp: 1 });
        } });
      }),

    /* ---- Gobkyus Linien: Präzision ----------------------------------------
       Der Bogenschütze arbeitet mit der Marke: Verwundbar gilt für den ganzen
       Trupp, deshalb ist seine Stärke das Vorbereiten fremder Treffer.        */

    passiv('gobkyu_ang1', 'Scharfschütze', 'onHit', [], ['verwundbar'],
      'Der erste Schuss des Kampfes trifft 150 % härter und markiert das Ziel mit 3 Verwundbar',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.5;
        c.markiere(c.target, 3);
      }),
    passiv('gobkyu_ang2', 'Schwachstelle', 'onHit', [], [],
      'Jeder dritte Schuss ignoriert die Rüstung vollständig und trifft 80 % härter',
      function (c) {
        if (!zaehler(c.self, 'gobkyu_ang2', 3)) return;
        c.dmg *= 1.8;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('gobkyu_ang3', 'Kopfschuss', 'onHit', [], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, trifft Gobkyu markierte Ziele 35 % härter — sonst 10 %',
      function (c) {
        if ((c.target.status.verwundbar || 0) > 0) {
          c.dmg *= truppFuehrt(c, 'verwundbar') ? 1.35 : 1.1;
        }
      }),
    passiv('gobkyu_ang4', 'Pfeilhagel', 'onHit', ['flaeche'], [],
      'Jeder Schuss trifft alle Gegner für 55 % mit — dafür 30 % weniger Schaden auf dem Hauptziel',
      function (c) {
        c.dmg *= 0.7;
        c.foes().forEach(function (f) {
          if (f !== c.target) c.deal(f, c.self.atk * 0.55, 'Pfeilhagel');
        });
      }),

    passiv('gobkyu_mec1', 'Zielwasser', 'onStart', ['verwundbar'], [],
      'Markiert zu Kampfbeginn jeden Gegner mit 3 Verwundbar',
      function (c) { c.foes().forEach(function (f) { c.markiere(f, 3); }); }),
    passiv('gobkyu_mec2', 'Markierter Schuss', 'onHit', ['verwundbar'], [],
      'Jeder dritte Schuss legt 3 Verwundbar nach',
      function (c) {
        if (!zaehler(c.self, 'gobkyu_mec2', 3)) return;
        c.markiere(c.target, 3);
      }),
    passiv('gobkyu_mec3', 'Doppelschuss', 'onHit', [], ['tempo'],
      'Führt ein Verbündeter Tempo, schießt Gobkyu zu 45 % ein zweites Mal — sonst zu 20 %',
      function (c) {
        if (c.rng() >= (truppFuehrt(c, 'tempo') ? 0.45 : 0.2)) return;
        c.deal(c.target, c.self.atk * 0.7, 'Doppelschuss');
      }),
    passiv('gobkyu_mec4', 'Giftpfeile', 'onHit', ['gift'], [],
      'Jeder Schuss legt 3 Gift an — dafür trifft Gobkyu selbst 30 % schwächer',
      function (c) {
        c.dmg *= 0.7;
        c.applyStatus(c.target, 'gift', 3);
      }),

    passiv('gobkyu_unt1', 'Feuerleitung', 'onStart', ['verwundbar'], [],
      'Zu Kampfbeginn +10 % Angriff für den Trupp und 2 Verwundbar auf jeden Gegner',
      function (c) {
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.1); });
        c.foes().forEach(function (f) { c.markiere(f, 2); });
      }),
    passiv('gobkyu_unt2', 'Deckungsfeuer', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp beantwortet Gobkyu mit einem Schuss auf alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'gobkyu_unt2', 4)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.45, 'Deckungsfeuer'); });
      }),
    passiv('gobkyu_unt3', 'Späherauge', 'onStart', ['verwundbar'], [],
      'Führt ein Verbündeter Verwundbar, setzt Gobkyu 60 % größere Marken — sonst 20 %',
      function (c) {
        c.self.markenmeister = Math.max(c.self.markenmeister || 1,
          truppFuehrt(c, 'verwundbar') ? 1.6 : 1.2);
      }),
    passiv('gobkyu_unt4', 'Salve', 'onStart', ['verwundbar'], [],
      'Der Trupp trifft markierte Ziele 30 % härter — Gobkyu selbst verliert die halbe Rüstung',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.def = Math.round(c.self.def * 0.5);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Salve', fn: function (k) {
            if ((k.target.status.verwundbar || 0) > 0) k.dmg *= 1.3;
          } });
        });
      }),

    passiv('gobkyu_def1', 'Rückzugsgefecht', 'onStart', ['schild'], [],
      'Beginnt mit Schild über 25 % seines Lebens und +4 Rüstung',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.25));
        c.self.def += 4;
      }),
    passiv('gobkyu_def2', 'Tarnung', 'onDamaged', ['schild'], [],
      'Jeder dritte erlittene Treffer legt ein Schild über 18 % seines Lebens an',
      function (c) {
        if (!zaehler(c.self, 'gobkyu_def2', 3)) return;
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.18));
      }),
    passiv('gobkyu_def3', 'Distanz halten', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 17 % seines Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('gobkyu_def4', 'Windschritt', 'onStart', ['tempo'], [],
      '+60 % Tempo — dafür bleibt von seiner Rüstung nur ein Viertel',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 1.6);
        c.self.def = Math.round(c.self.def * 0.25);
      }),

    /* ---- Rigurds Linien: Schildwall ---------------------------------------
       Der Häuptling hält die Reihe. Seine Linien drehen sich um Schild und
       darum, was der Trupp aushält — nicht darum, was Rigurd austeilt.        */

    passiv('rigurd_ang1', 'Häuptlingszorn', 'onHit', ['schild'], [],
      'Der erste Schlag des Kampfes trifft 120 % härter und legt dem Trupp ein Schild an',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.2;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.6)); });
      }),
    passiv('rigurd_ang2', 'Schildschlag', 'onHit', ['schild'], [],
      'Jeder dritte Schlag schlägt zusätzlich mit dem eigenen Schildwert zu',
      function (c) {
        if (!zaehler(c.self, 'rigurd_ang2', 3)) return;
        c.deal(c.target, (c.self.status.schild || 0) * 0.6 + c.self.def * 2, 'Schildschlag');
      }),
    passiv('rigurd_ang3', 'Erster in der Schlacht', 'onHit', [], ['schild'],
      'Führt ein Verbündeter Schild, schlägt Rigurd 30 % härter — sonst 8 %',
      function (c) { c.dmg *= truppFuehrt(c, 'schild') ? 1.3 : 1.08; }),
    passiv('rigurd_ang4', 'Sammelt euch', 'onStart', [], [],
      'Der Trupp schlägt 22 % härter — Rigurd selbst nur noch mit 40 %',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.atk = Math.round(u.atk * 1.22); });
        c.self.atk = Math.round(c.self.atk * 0.4);
      }),

    passiv('rigurd_mec1', 'Schildwall', 'onStart', ['schild'], [],
      'Legt zu Kampfbeginn dem ganzen Trupp ein Schild an',
      function (c) {
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.9)); });
      }),
    passiv('rigurd_mec2', 'Bollwerk', 'onDamaged', ['schild'], [],
      'Jeder dritte erlittene Treffer legt dem ganzen Trupp Schild nach',
      function (c) {
        if (!zaehler(c.self, 'rigurd_mec2', 3)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.7)); });
      }),
    passiv('rigurd_mec3', 'Stehende Mauer', 'onStart', ['schild'], [],
      'Führt ein Verbündeter Schild, wirken alle Schilde im Trupp 35 % stärker — sonst 12 %',
      function (c) {
        var f = truppFuehrt(c, 'schild') ? 0.35 : 0.12;
        c.allies().forEach(function (u) { u.schildfaktor += f; });
      }),
    passiv('rigurd_mec4', 'Unerschütterlich', 'onStart', ['schild'], [],
      'Jeder Zug baut das eigene Schild wieder auf — dafür ist Rigurd halb so schnell',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 0.5);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Unerschütterlich', fn: function (k) {
          k.applyStatus(k.self, 'schild', Math.round(k.self.maxHp * 0.08));
        } });
      }),

    passiv('rigurd_unt1', 'Häuptling', 'onStart', [], [],
      'Zu Kampfbeginn +10 % Angriff und +10 % Rüstung für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.1);
          u.def = Math.round(u.def * 1.1);
        });
      }),
    passiv('rigurd_unt2', 'Schutzbefehl', 'onDamaged', ['schild'], [],
      'Jeder vierte Treffer auf den Trupp legt allen ein Schild an',
      function (c) {
        if (!zaehler(c.self, 'rigurd_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.5)); });
      }),
    passiv('rigurd_unt3', 'Formation', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, bekommt der Trupp +18 % Rüstung — sonst +6 %',
      function (c) {
        var f = truppFuehrt(c, 'schild') ? 1.18 : 1.06;
        c.allies().forEach(function (u) { u.def = Math.round(u.def * f); });
      }),
    passiv('rigurd_unt4', 'Dorfältester', 'onStart', [], [],
      'Der Trupp bekommt +25 % Leben — Rigurd greift nur noch mit einem Viertel an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          var add = Math.round(u.maxHp * 0.25);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = Math.round(c.self.atk * 0.25);
      }),

    passiv('rigurd_def1', 'Dickes Fell', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 40 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.4)); }),
    passiv('rigurd_def2', 'Standhaft', 'onDamaged', ['heilung', 'schild'], [],
      'Jeder dritte erlittene Treffer heilt 10 % und legt Schild nach',
      function (c) {
        if (!zaehler(c.self, 'rigurd_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.07, 'Standhaft');
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.12));
      }),
    passiv('rigurd_def3', 'Dornenschild', 'onDamaged', ['konter'], [],
      'Führt ein Verbündeter Konter, zahlt Rigurd 25 % des Treffers zurück — sonst 8 %',
      function (c) {
        var f = c.foes()[0];
        if (!f) return;
        c.deal(f, (c.amount || 0) * (truppFuehrt(c, 'konter') ? 0.25 : 0.08), 'Dornenschild');
      }),
    passiv('rigurd_def4', 'Letzter Wall', 'onStart', [], [],
      'Kein Treffer kostet mehr als 14 % seines Lebens — dafür ist Rigurd nur noch ein Drittel so schnell',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.135);
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.34));
      }),

    /* ---- Rigurs Linien: Wache und Konter -----------------------------------
       Die Leibwache schlägt zurück, statt vorzupreschen. Alles hängt daran,
       getroffen zu werden.                                                    */

    passiv('rigur_ang1', 'Wachsam', 'onHit', ['konter'], [],
      'Der erste Schlag des Kampfes trifft 100 % härter und kontert jeden Gegner',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.4, 'Wachsam'); });
      }),
    passiv('rigur_ang2', 'Vergeltung', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer lädt den nächsten Angriff auf 120 % mehr Schaden auf',
      function (c) {
        if (!zaehler(c.self, 'rigur_ang2', 3)) return;
        c.self._vergeltung = 1;
        c.addEffect(c.self, { hook: 'onHit', name: 'Vergeltung', fn: function (k) {
          if (!k.self._vergeltung) return;
          k.self._vergeltung = 0;
          k.dmg *= 2.2;
        } });
      }),
    passiv('rigur_ang3', 'Rachefeldzug', 'onHit', [], ['konter'],
      'Führt ein Verbündeter Konter, schlägt der verwundete Rigur 35 % härter — sonst 12 %',
      function (c) {
        if (c.self.hp >= c.self.maxHp * 0.6) return;
        c.dmg *= truppFuehrt(c, 'konter') ? 1.35 : 1.12;
      }),
    passiv('rigur_ang4', 'Blutzoll', 'onStart', [], [],
      'Je 2 % fehlendes Leben geben 1 % Schaden — dafür heilt Rigur nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onHit', name: 'Blutzoll', fn: function (k) {
          k.dmg *= 1 + (1 - k.self.hp / k.self.maxHp) * 0.5;
        } });
      }),

    passiv('rigur_mec1', 'Gegenschlag', 'onDamaged', ['konter'], [],
      'Jeder Treffer wird mit 30 % des Angriffs beantwortet',
      function (c) {
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * 0.3, 'Gegenschlag');
      }),
    passiv('rigur_mec2', 'Dornenwache', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer kontert alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'rigur_mec2', 3)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.5, 'Dornenwache'); });
      }),
    passiv('rigur_mec3', 'Reflex', 'onDamaged', ['konter'], [],
      'Führt ein Verbündeter Konter, zahlt Rigur mit 55 % des Angriffs zurück — sonst 22 %',
      function (c) {
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * (truppFuehrt(c, 'konter') ? 0.55 : 0.22), 'Reflex');
      }),
    passiv('rigur_mec4', 'Wachturm', 'onStart', ['konter'], [],
      'Rigur kontert jeden Treffer mit vollem Angriff — dafür schlägt er selbst nur halb so hart',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.5);
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Wachturm', fn: function (k) {
          var f = k.foes()[0];
          if (f) k.deal(f, k.self.atk * 2, 'Wachturm');
        } });
      }),

    passiv('rigur_unt1', 'Wachkommando', 'onStart', ['konter'], [],
      'Zu Kampfbeginn +10 % Rüstung für den Trupp, und jeder kontert schwach zurück',
      function (c) {
        c.allies().forEach(function (u) {
          u.def = Math.round(u.def * 1.1);
          c.addEffect(u, { hook: 'onDamaged', name: 'Wachkommando', fn: function (k) {
            var f = k.foes()[0];
            if (f) k.deal(f, k.self.atk * 0.12, 'Wachkommando');
          } });
        });
      }),
    passiv('rigur_unt2', 'Alarm', 'onDamaged', ['konter'], [],
      'Jeder vierte Treffer auf den Trupp lässt alle Verbündeten zurückschlagen',
      function (c) {
        if (!zaehler(c.self, 'rigur_unt2', 4)) return;
        var f = c.foes()[0];
        if (!f) return;
        c.allies().forEach(function (u) { c.deal(f, u.atk * 0.35, 'Alarm'); });
      }),
    passiv('rigur_unt3', 'Rückendeckung', 'onStart', ['konter'], [],
      'Führt ein Verbündeter Konter, schlägt der ganze Trupp mit 30 % zurück — sonst 12 %',
      function (c) {
        var m = truppFuehrt(c, 'konter') ? 0.3 : 0.12;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onDamaged', name: 'Rückendeckung', fn: function (k) {
            var f = k.foes()[0];
            if (f) k.deal(f, k.self.atk * m, 'Rückendeckung');
          } });
        });
      }),
    passiv('rigur_unt4', 'Leibgarde', 'onStart', [], [],
      'Die Verbündeten erleiden 20 % weniger Schaden — Rigur selbst hat 40 % weniger Leben',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.minderung = Math.max(u.minderung || 0, 0.2); });
        c.self.maxHp = Math.round(c.self.maxHp * 0.6);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('rigur_def1', 'Wachsamkeit', 'onStart', [], [],
      'Beginnt mit einem Schild über 30 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.3)); }),
    passiv('rigur_def2', 'Panzerung', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'rigur_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.075, 'Panzerung');
      }),
    passiv('rigur_def3', 'Zäher Hund', 'onStart', [], ['konter'],
      'Führt ein Verbündeter Konter, kostet kein Treffer mehr als 17 % seines Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'konter') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('rigur_def4', 'Nie allein', 'onStart', ['konter'], [],
      'Solange ein Verbündeter steht, erleidet Rigur 35 % weniger Schaden — allein dafür 25 % mehr',
      function (c) {
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Nie allein', fn: function (k) {
          var allein = k.allies().length <= 1;
          k.self.minderung = allein ? -0.25 : 0.35;
        } });
        c.self.minderung = c.allies().length > 1 ? 0.35 : -0.25;
      }),

    /* ---- Gobwas Linien: Feldverband ---------------------------------------
       Die Sanitäterin hält den Trupp am Leben. Ihre Linien zahlen sich erst
       aus, wenn jemand da ist, der sie braucht.                               */

    passiv('gobwa_ang1', 'Kampfsanitäterin', 'onHit', ['heilung'], [],
      'Der erste Schlag des Kampfes trifft 80 % härter und heilt den Trupp um 8 %',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 1.8;
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.08, 'Kampfsanitäterin'); });
      }),
    passiv('gobwa_ang2', 'Aderlass', 'onHit', ['heilung'], [],
      'Jeder dritte Schlag heilt Gobwa um die Hälfte des angerichteten Schadens',
      function (c) {
        if (!zaehler(c.self, 'gobwa_ang2', 3)) return;
        c.self.lifesteal = Math.max(c.self.lifesteal || 0, 0.5);
      }),
    passiv('gobwa_ang3', 'Schmerzgrenze', 'onHit', [], ['heilung'],
      'Führt ein Verbündeter Heilung, trifft Gobwa verwundete Ziele 30 % härter — sonst 10 %',
      function (c) {
        if (c.target.hp >= c.target.maxHp * 0.5) return;
        c.dmg *= truppFuehrt(c, 'heilung') ? 1.3 : 1.1;
      }),
    passiv('gobwa_ang4', 'Letzte Reserve', 'onStart', [], [],
      'Unter halbem Leben schlägt Gobwa 50 % härter — dafür beginnt sie mit 60 % Leben',
      function (c) {
        c.self.hp = Math.round(c.self.maxHp * 0.6);
        c.addEffect(c.self, { hook: 'onHit', name: 'Letzte Reserve', fn: function (k) {
          if (k.self.hp < k.self.maxHp * 0.5) k.dmg *= 1.5;
        } });
      }),

    passiv('gobwa_mec1', 'Feldverband', 'onStart', ['heilung'], [],
      'Heilt den Trupp zu Kampfbeginn um 10 % und gibt allen +4 Regeneration',
      function (c) {
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.1, 'Feldverband'); u.regen += 4; });
      }),
    passiv('gobwa_mec2', 'Notration', 'onDamaged', ['heilung'], [],
      'Jeder dritte erlittene Treffer heilt den ganzen Trupp um 6 %',
      function (c) {
        if (!zaehler(c.self, 'gobwa_mec2', 3)) return;
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.06, 'Notration'); });
      }),
    passiv('gobwa_mec3', 'Triage', 'onStart', ['heilung'], [],
      'Führt ein Verbündeter Heilung, wirkt jede Heilung im Trupp 22 % stärker — sonst 8 %',
      function (c) {
        var f = truppFuehrt(c, 'heilung') ? 0.22 : 0.08;
        c.allies().forEach(function (u) { u.heilfaktor += f; });
      }),
    passiv('gobwa_mec4', 'Überfluss', 'onStart', ['heilung'], [],
      'Jede Heilung im Trupp wirkt 50 % stärker — Gobwa selbst heilt nichts mehr',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.heilfaktor += 0.5; });
        c.self.heilfaktor = -1;
        c.self.regen = 0;
      }),

    passiv('gobwa_unt1', 'Verbandskasten', 'onStart', ['heilung', 'schild'], [],
      'Zu Kampfbeginn +6 Regeneration und ein Schild für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.regen += 6;
          c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.5));
        });
      }),
    passiv('gobwa_unt2', 'Aufopferung', 'onDamaged', ['heilung'], [],
      'Jeder vierte Treffer auf den Trupp heilt den am schwersten Verwundeten um 15 %',
      function (c) {
        if (!zaehler(c.self, 'gobwa_unt2', 4)) return;
        var schwach = schwaechstes(c.allies(), function (u) { return u.hp / u.maxHp; });
        if (schwach) c.heal(schwach, schwach.maxHp * 0.15, 'Aufopferung');
      }),
    passiv('gobwa_unt3', 'Nicht auf meiner Wache', 'onStart', [], ['heilung'],
      'Führt ein Verbündeter Heilung, kostet im ganzen Trupp kein Treffer mehr als 19 % — sonst 25 %',
      function (c) {
        var d = truppFuehrt(c, 'heilung') ? 0.19 : 0.25;
        c.allies().forEach(function (u) {
          u.schadensdeckel = Math.min(u.schadensdeckel || 1, d);
        });
      }),
    passiv('gobwa_unt4', 'Mutter der Truppe', 'onStart', ['heilung'], [],
      'Der Trupp bekommt +10 % Leben und heilt 22 % stärker — Gobwa greift nur noch mit einem Drittel an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.heilfaktor += 0.22;
          var add = Math.round(u.maxHp * 0.1);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('gobwa_def1', 'Flink', 'onStart', ['schild', 'tempo'], [],
      'Beginnt mit Schild über 28 % ihres Lebens und +15 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.28));
        c.self.spd = Math.round(c.self.spd * 1.15);
      }),
    passiv('gobwa_def2', 'Selbstversorgung', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % ihres Lebens',
      function (c) {
        if (!zaehler(c.self, 'gobwa_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.08, 'Selbstversorgung');
      }),
    passiv('gobwa_def3', 'Schutzengel', 'onDeath', ['heilung'], [],
      'Führt ein Verbündeter Heilung, steht Gobwa mit 50 % Leben wieder auf — sonst mit 30 %',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * (truppFuehrt(c, 'heilung') ? 0.5 : 0.3));
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),
    passiv('gobwa_def4', 'Unentbehrlich', 'onStart', [], [],
      'Gobwa erleidet 30 % weniger Schaden — dafür schlägt sie nur noch halb so hart',
      function (c) {
        c.self.minderung = Math.max(c.self.minderung || 0, 0.3);
        c.self.atk = Math.round(c.self.atk * 0.5);
      }),

    /* ---- Rangas Linien: Donner und Schatten -------------------------------
       Der Sturmwolf-Lord lädt seine Ziele auf, bis der Blitz in die ganze Reihe
       fährt — und steht dabei selbst im Schatten. Frost bleibt der Bibliothek
       und den Gegnern.                                                        */

    passiv('ranga_ang1', 'Blitzschlag', 'onHit', ['donner'], [],
      'Der erste Schlag des Kampfes trifft 130 % härter und lädt alle Gegner mit 3 Donner auf',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.3;
        c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 3); });
      }),
    passiv('ranga_ang2', 'Sturmgewalt', 'onHit', [], ['tempo'],
      'Jeder dritte Schlag trifft doppelt, plus 4 % je Punkt Tempo über 30',
      function (c) {
        if (!zaehler(c.self, 'ranga_ang2', 3)) return;
        c.dmg *= 2 + Math.max(0, c.self.spd - 30) * 0.04;
      }),
    passiv('ranga_ang3', 'Geladene Klaue', 'onHit', [], ['donner'],
      'Führt ein Verbündeter Donner, schlägt Ranga gegen geladene Ziele 32 % härter — sonst 10 %',
      function (c) {
        if ((c.target.status.donner || 0) > 0) {
          c.dmg *= truppFuehrt(c, 'donner') ? 1.32 : 1.1;
        }
      }),
    passiv('ranga_ang4', 'Gewitterfront', 'onStart', ['donner'], [],
      'Jeder Schlag lädt die ganze Reihe mit 2 Donner auf — dafür trifft Ranga 30 % schwächer',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Gewitterfront', fn: function (k) {
          k.dmg *= 0.7;
          k.foes().forEach(function (f) { k.applyStatus(f, 'donner', 2); });
        } });
      }),

    passiv('ranga_mec1', 'Statische Ladung', 'onStart', ['donner'], [],
      'Lädt zu Kampfbeginn jeden Gegner mit 4 Donner auf',
      function (c) { c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 4); }); }),
    passiv('ranga_mec2', 'Überschlag', 'onHit', ['donner'], [],
      'Jeder dritte Schlag lädt das Ziel mit 4 Donner nach',
      function (c) {
        if (!zaehler(c.self, 'ranga_mec2', 3)) return;
        c.applyStatus(c.target, 'donner', 4);
      }),
    passiv('ranga_mec3', 'Entladung', 'onStart', ['donner'], [],
      'Führt ein Verbündeter Donner, entlädt sich der Blitz zwei Stapel früher — sonst einen',
      function (c) { c.self.donnerFrueh = truppFuehrt(c, 'donner') ? 2 : 1; }),
    passiv('ranga_mec4', 'Sturmherr', 'onStart', ['donner'], [],
      'Jeder Zug lädt alle Gegner mit 3 Donner auf — dafür hält Ranga nur noch die Hälfte aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Sturmherr', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'donner', 3); });
        } });
      }),

    passiv('ranga_unt1', 'Sturmwind', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +14 % Tempo für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.14); }); }),
    passiv('ranga_unt2', 'Leitblitz', 'onDamaged', ['donner'], [],
      'Jeder vierte Treffer auf den Trupp lädt alle Gegner mit 3 Donner auf',
      function (c) {
        if (!zaehler(c.self, 'ranga_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'donner', 3); });
      }),
    passiv('ranga_unt3', 'Wolfsruf', 'onStart', [], ['donner'],
      'Führt ein Verbündeter Donner, lädt jeder Treffer des Trupps mit 2 auf — sonst mit 1',
      function (c) {
        var n = truppFuehrt(c, 'donner') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Wolfsruf', fn: function (k) {
            k.applyStatus(k.target, 'donner', n);
          } });
        });
      }),
    passiv('ranga_unt4', 'Auge des Sturms', 'onStart', ['tempo'], [],
      'Der Trupp bekommt +30 % Tempo und +15 % Angriff — Ranga selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.spd = Math.round(u.spd * 1.3);
          u.atk = Math.round(u.atk * 1.15);
        });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('ranga_def1', 'Windfell', 'onStart', ['schatten', 'tempo'], [],
      'Beginnt den Kampf im Schatten und mit +22 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schatten', 5);
        c.self.spd = Math.round(c.self.spd * 1.22);
      }),
    passiv('ranga_def2', 'Blitzreflexe', 'onDamaged', ['schatten'], [],
      'Jeder dritte erlittene Treffer wirft Ranga zurück in den Schatten',
      function (c) {
        if (!zaehler(c.self, 'ranga_def2', 3)) return;
        c.applyStatus(c.self, 'schatten', 4);
      }),
    passiv('ranga_def3', 'Schattenschritt', 'onStart', [], ['schatten'],
      'Führt ein Verbündeter Schatten, kostet kein Treffer mehr als 16 % seines Lebens — sonst 22 %',
      function (c) {
        var d = truppFuehrt(c, 'schatten') ? 0.16 : 0.22;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('ranga_def4', 'Herr der Stürme', 'onStart', ['donner'], [],
      'Jede Entladung heilt Ranga um 8 % — dafür schlägt er nur noch halb so hart',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.5);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Herr der Stürme', fn: function (k) {
          var geladen = k.foes().filter(function (f) { return (f.status.donner || 0) > 0; }).length;
          if (geladen) k.heal(k.self, k.self.maxHp * 0.08, 'Herr der Stürme');
        } });
      }),

    /* ---- Sturmwölfe: die Hetzjagd ------------------------------------------
       Der einfache Wolf jagt Angeschlagenes. Seine Linien belohnen es, ein Ziel
       zu Ende zu bringen, statt Schaden zu streuen.                           */

    passiv('sturm_ang1', 'Hetzjagd', 'onHit', ['exekution'], [],
      'Der erste Biss des Kampfes trifft 120 % härter und geht auf das schwächste Ziel',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.2;
        var schwach = schwaechstes(c.foes(), function (f) { return f.hp; });
        if (schwach && schwach !== c.target) c.deal(schwach, c.self.atk * 1.2, 'Hetzjagd');
      }),
    passiv('sturm_ang2', 'Reißzahn', 'onHit', ['blutung'], [],
      'Jeder dritte Biss trifft 90 % härter und lässt das Ziel mit 4 bluten',
      function (c) {
        if (!zaehler(c.self, 'sturm_ang2', 3)) return;
        c.dmg *= 1.9;
        c.applyStatus(c.target, 'blutung', 4);
      }),
    passiv('sturm_ang3', 'Todesbiss', 'onHit', ['exekution'], [],
      'Führt ein Verbündeter Exekution, reißt der Wolf Ziele unter 40 % dreifach — sonst doppelt',
      function (c) {
        if (c.target.hp >= c.target.maxHp * 0.4) return;
        c.dmg *= truppFuehrt(c, 'exekution') ? 3 : 2;
      }),
    passiv('sturm_ang4', 'Blutrausch', 'onKill', ['exekution'], [],
      'Jeder Abschuss gibt dauerhaft +25 % Angriff und Tempo — und kostet den Wolf 10 % seines Lebens',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 1.25);
        c.self.spd = Math.round(c.self.spd * 1.25);
        c.deal(c.self, c.self.maxHp * 0.1, 'Blutrausch', { pure: true });
      }),

    passiv('sturm_mec1', 'Witterung', 'onStart', ['tempo'], [],
      'Beginnt den Kampf mit +25 % Tempo und 30 % Rüstungsdurchschlag',
      function (c) {
        c.self.spd = Math.round(c.self.spd * 1.25);
        c.self.pierce = Math.max(c.self.pierce || 0, 0.3);
      }),
    passiv('sturm_mec2', 'Nachsetzen', 'onHit', [], [],
      'Jeder dritte Biss setzt sofort mit einem zweiten für 70 % nach',
      function (c) {
        if (!zaehler(c.self, 'sturm_mec2', 3)) return;
        c.deal(c.target, c.self.atk * 0.7, 'Nachsetzen');
      }),
    passiv('sturm_mec3', 'Verwundetes Wild', 'onHit', [], ['blutung'],
      'Führt ein Verbündeter Blutung, trifft der Wolf blutende Ziele 30 % härter — sonst 12 %',
      function (c) {
        if ((c.target.status.blutung || 0) > 0) {
          c.dmg *= truppFuehrt(c, 'blutung') ? 1.3 : 1.12;
        }
      }),
    passiv('sturm_mec4', 'Kein Entkommen', 'onStart', ['exekution'], [],
      'Der Wolf beißt immer das schwächste Ziel — dafür hält er nur noch 60 % aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.6);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onHit', name: 'Kein Entkommen', fn: function (k) {
          var schwach = schwaechstes(k.foes(), function (f) { return f.hp; });
          if (schwach && schwach !== k.target) k.deal(schwach, k.dmg * 0.9, 'Kein Entkommen');
        } });
      }),

    passiv('sturm_unt1', 'Rudeljagd', 'onStart', ['tempo'], [],
      'Zu Kampfbeginn +12 % Tempo und +8 % Angriff für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.spd = Math.round(u.spd * 1.12);
          u.atk = Math.round(u.atk * 1.08);
        });
      }),
    passiv('sturm_unt2', 'Beutezug', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp hetzt alle auf das schwächste Ziel',
      function (c) {
        if (!zaehler(c.self, 'sturm_unt2', 4)) return;
        var schwach = schwaechstes(c.foes(), function (f) { return f.hp; });
        if (!schwach) return;
        c.allies().forEach(function (u) { c.deal(schwach, u.atk * 0.3, 'Beutezug'); });
      }),
    passiv('sturm_unt3', 'Gemeinsame Hetze', 'onStart', [], ['exekution'],
      'Führt ein Verbündeter Exekution, trifft der Trupp angeschlagene Ziele 28 % härter — sonst 10 %',
      function (c) {
        var m = truppFuehrt(c, 'exekution') ? 1.28 : 1.1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gemeinsame Hetze', fn: function (k) {
            if (k.target.hp < k.target.maxHp * 0.5) k.dmg *= m;
          } });
        });
      }),
    passiv('sturm_unt4', 'Alpha im Werden', 'onStart', ['tempo'], [],
      'Der Trupp bekommt +25 % Tempo — der Wolf selbst wird auf ein Drittel Angriff gedrosselt',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.spd = Math.round(u.spd * 1.25); });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('sturm_def1', 'Flinkes Fell', 'onStart', ['tempo'], [],
      'Beginnt mit Schild über 26 % seines Lebens und +18 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.26));
        c.self.spd = Math.round(c.self.spd * 1.18);
      }),
    passiv('sturm_def2', 'Zäher Streuner', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'sturm_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.075, 'Zäher Streuner');
      }),
    passiv('sturm_def3', 'Ausweichen', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 17 % seines Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('sturm_def4', 'Überlebenskünstler', 'onStart', ['heilung'], [],
      'Jeder Zug heilt 6 % — dafür schlägt der Wolf nur noch halb so hart',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.5);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Überlebenskünstler', fn: function (k) {
          k.heal(k.self, k.self.maxHp * 0.06, 'Überlebenskünstler');
        } });
      }),

    /* ---- Gabiru: der Wirbelspeer -------------------------------------------
       Der selbsternannte Held trifft breit statt tief. Seine Linien zahlen für
       jeden zusätzlichen Gegner.                                              */

    passiv('gab_ang1', 'Speerwirbel', 'onHit', ['flaeche'], [],
      'Der erste Stoß des Kampfes trifft 100 % härter und alle anderen Gegner für 60 % mit',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2;
        c.foes().forEach(function (f) {
          if (f !== c.target) c.deal(f, c.self.atk * 0.6, 'Speerwirbel');
        });
      }),
    passiv('gab_ang2', 'Prahlerei', 'onHit', [], [],
      'Jeder dritte Stoß trifft doppelt und gibt dauerhaft +8 Angriff',
      function (c) {
        if (!zaehler(c.self, 'gab_ang2', 3)) return;
        c.dmg *= 2;
        c.self.atk += 8;
      }),
    passiv('gab_ang3', 'Held von Gabiru', 'onHit', [], ['flaeche'],
      'Führt ein Verbündeter Fläche, schlägt Gabiru 12 % härter je Gegner — sonst 4 %',
      function (c) {
        c.dmg *= 1 + (truppFuehrt(c, 'flaeche') ? 0.12 : 0.04) * c.foes().length;
      }),
    passiv('gab_ang4', 'Sturmangriff', 'onStart', ['flaeche'], [],
      'Jeder Stoß trifft alle Gegner voll — dafür nur noch mit 45 % Schaden',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Sturmangriff', fn: function (k) {
          k.dmg *= 0.45;
          k.foes().forEach(function (f) {
            if (f !== k.target) k.deal(f, k.dmg, 'Sturmangriff');
          });
        } });
      }),

    passiv('gab_mec1', 'Weiter Ausfall', 'onStart', ['flaeche'], [],
      'Trifft zu Kampfbeginn jeden Gegner für 80 % des Angriffs',
      function (c) { c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.8, 'Weiter Ausfall'); }); }),
    passiv('gab_mec2', 'Durchbohren', 'onHit', [], [],
      'Jeder dritte Stoß ignoriert die Rüstung vollständig',
      function (c) {
        if (!zaehler(c.self, 'gab_mec2', 3)) return;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('gab_mec3', 'Massenschlächter', 'onHit', ['flaeche'], [],
      'Führt ein Verbündeter Fläche, trifft jeder Stoß einen zweiten Gegner für 50 % — sonst für 20 %',
      function (c) {
        var m = truppFuehrt(c, 'flaeche') ? 0.5 : 0.2;
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) c.deal(f, c.self.atk * m, 'Massenschlächter');
      }),
    passiv('gab_mec4', 'Wirbelsturm', 'onStart', ['flaeche'], [],
      'Jeder Zug trifft alle Gegner für 45 % — dafür hält Gabiru nur noch 60 % aus',
      function (c) {
        c.self.maxHp = Math.round(c.self.maxHp * 0.6);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Wirbelsturm', fn: function (k) {
          k.foes().forEach(function (f) { k.deal(f, k.self.atk * 0.45, 'Wirbelsturm'); });
        } });
      }),

    passiv('gab_unt1', 'Vorbild', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Angriff für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.atk = Math.round(u.atk * 1.12); }); }),
    passiv('gab_unt2', 'Schlachtruf', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp gibt allen +7 Angriff',
      function (c) {
        if (!zaehler(c.self, 'gab_unt2', 4)) return;
        c.allies().forEach(function (u) { u.atk += 7; });
      }),
    passiv('gab_unt3', 'Gemeinsamer Sturm', 'onStart', [], ['flaeche'],
      'Führt ein Verbündeter Fläche, trifft der Trupp gegen mehrere Gegner 25 % härter — sonst 8 %',
      function (c) {
        var m = truppFuehrt(c, 'flaeche') ? 1.25 : 1.08;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Gemeinsamer Sturm', fn: function (k) {
            if (k.foes().length >= 2) k.dmg *= m;
          } });
        });
      }),
    passiv('gab_unt4', 'Der große Gabiru', 'onStart', [], [],
      'Der Trupp bekommt +26 % Angriff — Gabiru selbst schlägt nur noch mit einem Drittel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.atk = Math.round(u.atk * 1.26); });
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    passiv('gab_def1', 'Schuppenpanzer', 'onStart', [], [],
      'Beginnt mit einem Schild über 32 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.32)); }),
    passiv('gab_def2', 'Zäher Held', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'gab_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.075, 'Zäher Held');
      }),
    passiv('gab_def3', 'Unverwüstlich', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 17 % seines Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('gab_def4', 'Niemals aufgeben', 'onDeath', ['heilung'], [],
      'Steht einmal mit 45 % Leben wieder auf — danach heilt ihn nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1;
        c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      }),

    /* ---- Souka: die Späherin ------------------------------------------------
       Sie schießt aus der Distanz und liest Schwachstellen. Verwundbar und
       Durchschlag sind ihre Währung.                                          */

    passiv('souka_ang1', 'Ruhige Hand', 'onHit', ['verwundbar'], [],
      'Der erste Schuss des Kampfes trifft 140 % härter und markiert das Ziel mit 3 Verwundbar',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.4;
        c.markiere(c.target, 3);
      }),
    passiv('souka_ang2', 'Schwachpunkt', 'onHit', [], [],
      'Jeder dritte Schuss trifft 90 % härter und ignoriert die Rüstung',
      function (c) {
        if (!zaehler(c.self, 'souka_ang2', 3)) return;
        c.dmg *= 1.9;
        c.self.pierce = Math.max(c.self.pierce || 0, 1);
      }),
    passiv('souka_ang3', 'Doppelschuss', 'onHit', [], ['tempo'],
      'Führt ein Verbündeter Tempo, schießt Souka zu 45 % ein zweites Mal — sonst zu 18 %',
      function (c) {
        if (c.rng() >= (truppFuehrt(c, 'tempo') ? 0.45 : 0.18)) return;
        c.deal(c.target, c.self.atk * 0.75, 'Doppelschuss');
      }),
    passiv('souka_ang4', 'Meisterschützin', 'onStart', ['verwundbar'], [],
      'Souka ignoriert jede Rüstung — dafür hält sie nur noch die Hälfte aus',
      function (c) {
        c.self.pierce = 1;
        c.self.maxHp = Math.round(c.self.maxHp * 0.5);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('souka_mec1', 'Panzerbrecher', 'onStart', [], [],
      'Beginnt den Kampf mit 50 % Rüstungsdurchschlag',
      function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.5); }),
    passiv('souka_mec2', 'Anvisiert', 'onHit', ['verwundbar'], [],
      'Jeder dritte Schuss legt 4 Verwundbar nach',
      function (c) {
        if (!zaehler(c.self, 'souka_mec2', 3)) return;
        c.markiere(c.target, 4);
      }),
    passiv('souka_mec3', 'Blattschuss', 'onHit', [], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, trifft Souka markierte Ziele 30 % härter — sonst 10 %',
      function (c) {
        if ((c.target.status.verwundbar || 0) > 0) {
          c.dmg *= truppFuehrt(c, 'verwundbar') ? 1.3 : 1.1;
        }
      }),
    passiv('souka_mec4', 'Kein Versteck', 'onStart', ['verwundbar'], [],
      'Jeder Zug markiert alle Gegner mit 3 Verwundbar — dafür schlägt Souka 35 % schwächer',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.65);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Kein Versteck', fn: function (k) {
          k.foes().forEach(function (f) { k.markiere(f, 3); });
        } });
      }),

    passiv('souka_unt1', 'Aufklärung', 'onStart', ['verwundbar'], [],
      'Zu Kampfbeginn 3 Verwundbar auf jeden Gegner und +8 % Tempo für den Trupp',
      function (c) {
        c.foes().forEach(function (f) { c.markiere(f, 3); });
        c.allies().forEach(function (u) { u.spd = Math.round(u.spd * 1.08); });
      }),
    passiv('souka_unt2', 'Feuerleitung', 'onDamaged', [], [],
      'Jeder vierte Treffer auf den Trupp beantwortet Souka mit einem Schuss auf alle Gegner',
      function (c) {
        if (!zaehler(c.self, 'souka_unt2', 4)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.45, 'Feuerleitung'); });
      }),
    passiv('souka_unt3', 'Schwachstellen melden', 'onStart', [], ['verwundbar'],
      'Führt ein Verbündeter Verwundbar, bekommt der Trupp 35 % Durchschlag — sonst 12 %',
      function (c) {
        var p = truppFuehrt(c, 'verwundbar') ? 0.35 : 0.12;
        c.allies().forEach(function (u) { u.pierce = Math.max(u.pierce || 0, p); });
      }),
    passiv('souka_unt4', 'Späherin der Sümpfe', 'onStart', ['verwundbar'], [],
      'Marken des Trupps wirken doppelt — Souka selbst schlägt nur noch mit einem Viertel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.markenmeister = Math.max(u.markenmeister || 1, 2); });
        c.self.atk = Math.round(c.self.atk * 0.25);
      }),

    passiv('souka_def1', 'Fluchtinstinkt', 'onStart', ['tempo'], [],
      'Beginnt mit Schild über 24 % ihres Lebens und +20 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.24));
        c.self.spd = Math.round(c.self.spd * 1.2);
      }),
    passiv('souka_def2', 'Sumpfschleier', 'onDamaged', ['schatten'], [],
      'Jeder dritte erlittene Treffer zieht Souka in den Schatten',
      function (c) {
        if (!zaehler(c.self, 'souka_def2', 3)) return;
        c.applyStatus(c.self, 'schatten', 4);
      }),
    passiv('souka_def3', 'Rückzug', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, kostet kein Treffer mehr als 16 % ihres Lebens — sonst 22 %',
      function (c) {
        var d = truppFuehrt(c, 'tempo') ? 0.16 : 0.22;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('souka_def4', 'Unsichtbar', 'onStart', ['schatten'], [],
      'Jeder zweite Zug legt frischen Schatten an — dafür schlägt Souka nur noch halb so hart',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.5);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Unsichtbar', fn: function (k) {
          if (k.rng() < 0.5) k.applyStatus(k.self, 'schatten', 2);
        } });
      }),

    /* ---- Echsenfürst: Ausdauer ---------------------------------------------
       Der Fürst gewinnt lange Kämpfe. Alles an ihm ist darauf gebaut, noch zu
       stehen, wenn andere längst gefallen sind.                               */

    passiv('fuerst_ang1', 'Fürstenschlag', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 110 % härter und legt dem Trupp ein Schild an',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.7)); });
      }),
    passiv('fuerst_ang2', 'Wucht', 'onHit', [], [],
      'Jeder dritte Schlag trifft doppelt, plus 1 % je fehlendem Prozent seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'fuerst_ang2', 3)) return;
        c.dmg *= 2 + (1 - c.self.hp / c.self.maxHp);
      }),
    passiv('fuerst_ang3', 'Langer Atem', 'onHit', [], ['schild'],
      'Führt ein Verbündeter Schild, schlägt der Fürst 28 % härter — sonst 10 %',
      function (c) { c.dmg *= truppFuehrt(c, 'schild') ? 1.28 : 1.1; }),
    passiv('fuerst_ang4', 'Zorn des Fürsten', 'onStart', [], [],
      'Der Fürst schlägt 80 % härter, je weniger Leben er hat — dafür beginnt er mit der Hälfte',
      function (c) {
        c.self.hp = Math.round(c.self.maxHp * 0.5);
        c.addEffect(c.self, { hook: 'onHit', name: 'Zorn des Fürsten', fn: function (k) {
          k.dmg *= 1 + 0.8 * (1 - k.self.hp / k.self.maxHp);
        } });
      }),

    passiv('fuerst_mec1', 'Bollwerk', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 45 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.45)); }),
    passiv('fuerst_mec2', 'Stetiger Wall', 'onDamaged', ['schild'], [],
      'Jeder dritte erlittene Treffer legt Schild über 18 % seines Lebens nach',
      function (c) {
        if (!zaehler(c.self, 'fuerst_mec2', 3)) return;
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.18));
      }),
    passiv('fuerst_mec3', 'Unerschöpflich', 'onStart', ['heilung'], ['schild'],
      'Führt ein Verbündeter Schild, regeneriert der Fürst jeden Zug 5 % — sonst 2 %',
      function (c) {
        var f = truppFuehrt(c, 'schild') ? 0.05 : 0.02;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Unerschöpflich', fn: function (k) {
          k.heal(k.self, k.self.maxHp * f, 'Unerschöpflich');
        } });
      }),
    passiv('fuerst_mec4', 'Sumpfkraft', 'onStart', ['schild'], [],
      'Schilde wirken doppelt — dafür ist der Fürst nur noch halb so schnell',
      function (c) {
        c.self.schildfaktor += 1;
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
      }),

    passiv('fuerst_unt1', 'Fürstenwort', 'onStart', [], [],
      'Zu Kampfbeginn +10 % Angriff und +12 % Rüstung für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.1);
          u.def = Math.round(u.def * 1.12);
        });
      }),
    passiv('fuerst_unt2', 'Schutz des Volkes', 'onDamaged', ['schild'], [],
      'Jeder vierte Treffer auf den Trupp legt allen ein Schild an',
      function (c) {
        if (!zaehler(c.self, 'fuerst_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.7)); });
      }),
    passiv('fuerst_unt3', 'Ausdauer lehren', 'onStart', ['heilung'], ['schild'],
      'Führt ein Verbündeter Schild, regeneriert der Trupp +7 — sonst +3',
      function (c) {
        var n = truppFuehrt(c, 'schild') ? 7 : 3;
        c.allies().forEach(function (u) { u.regen += n; });
      }),
    passiv('fuerst_unt4', 'Herr der Sümpfe', 'onStart', [], [],
      'Der Trupp bekommt +30 % Leben — der Fürst selbst greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          var add = Math.round(u.maxHp * 0.3);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = Math.round(c.self.atk * 0.2);
      }),

    passiv('fuerst_def1', 'Schuppenwall', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 40 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.4)); }),
    passiv('fuerst_def2', 'Riesenleib', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'fuerst_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.085, 'Riesenleib');
      }),
    passiv('fuerst_def3', 'Standhaft', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 15 % seines Lebens — sonst 21 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.15 : 0.21;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('fuerst_def4', 'Der letzte Wall', 'onStart', [], [],
      'Kein Treffer kostet mehr als 13 % seines Lebens — dafür schlägt der Fürst nur noch mit einem Drittel',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.125);
        c.self.atk = Math.round(c.self.atk * 0.34);
      }),

    /* ---- Drachenknecht: der Speerwall --------------------------------------
       Die einfache Wache der Echsenmenschen. Sie hält die Reihe und sticht
       zurück, wenn jemand hineinläuft.                                        */

    passiv('knecht_ang1', 'Speerstoß', 'onHit', ['konter'], [],
      'Der erste Stoß des Kampfes trifft 110 % härter und sticht jeden Gegner an',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.1;
        c.foes().forEach(function (f) { if (f !== c.target) c.deal(f, c.self.atk * 0.4, 'Speerstoß'); });
      }),
    passiv('knecht_ang2', 'Gegenstoß', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer lädt den nächsten Stoß auf 110 % mehr Schaden auf',
      function (c) {
        if (!zaehler(c.self, 'knecht_ang2', 3)) return;
        c.self._gegenstoss = 1;
        c.addEffect(c.self, { hook: 'onHit', name: 'Gegenstoß', fn: function (k) {
          if (!k.self._gegenstoss) return;
          k.self._gegenstoss = 0;
          k.dmg *= 2.1;
        } });
      }),
    passiv('knecht_ang3', 'Lanzenritt', 'onHit', [], ['konter'],
      'Führt ein Verbündeter Konter, sticht der Knecht 28 % härter — sonst 10 %',
      function (c) { c.dmg *= truppFuehrt(c, 'konter') ? 1.28 : 1.1; }),
    passiv('knecht_ang4', 'Drachenspeer', 'onStart', ['konter'], [],
      'Jeder erlittene Treffer wird mit vollem Angriff beantwortet — dafür sticht der Knecht selbst nur noch halb',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.5);
        c.addEffect(c.self, { hook: 'onDamaged', name: 'Drachenspeer', fn: function (k) {
          var f = k.foes()[0];
          if (f) k.deal(f, k.self.atk * 2, 'Drachenspeer');
        } });
      }),

    passiv('knecht_mec1', 'Speerwall', 'onStart', ['schild'], [],
      'Legt zu Kampfbeginn dem ganzen Trupp ein Schild an',
      function (c) {
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.8)); });
      }),
    passiv('knecht_mec2', 'Stachelreihe', 'onDamaged', ['konter'], [],
      'Jeder dritte erlittene Treffer sticht alle Gegner an',
      function (c) {
        if (!zaehler(c.self, 'knecht_mec2', 3)) return;
        c.foes().forEach(function (f) { c.deal(f, c.self.atk * 0.5, 'Stachelreihe'); });
      }),
    passiv('knecht_mec3', 'Vergeltungswall', 'onDamaged', ['konter'], [],
      'Führt ein Verbündeter Konter, zahlt der Knecht 50 % des Angriffs zurück — sonst 20 %',
      function (c) {
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * (truppFuehrt(c, 'konter') ? 0.5 : 0.2), 'Vergeltungswall');
      }),
    passiv('knecht_mec4', 'Unbrechbare Reihe', 'onStart', ['schild'], [],
      'Jeder Zug baut das eigene Schild auf — dafür ist der Knecht nur noch halb so schnell',
      function (c) {
        c.self.spd = Math.max(1, Math.round(c.self.spd * 0.5));
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Unbrechbare Reihe', fn: function (k) {
          k.applyStatus(k.self, 'schild', Math.round(k.self.maxHp * 0.09));
        } });
      }),

    passiv('knecht_unt1', 'Reihenschluss', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Rüstung für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { u.def = Math.round(u.def * 1.12); }); }),
    passiv('knecht_unt2', 'Gemeinsamer Wall', 'onDamaged', ['schild'], [],
      'Jeder vierte Treffer auf den Trupp legt allen ein Schild an',
      function (c) {
        if (!zaehler(c.self, 'knecht_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.55)); });
      }),
    passiv('knecht_unt3', 'Deckung geben', 'onStart', ['konter'], [],
      'Führt ein Verbündeter Konter, sticht der ganze Trupp mit 28 % zurück — sonst mit 10 %',
      function (c) {
        var m = truppFuehrt(c, 'konter') ? 0.28 : 0.1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onDamaged', name: 'Deckung geben', fn: function (k) {
            var f = k.foes()[0];
            if (f) k.deal(f, k.self.atk * m, 'Deckung geben');
          } });
        });
      }),
    passiv('knecht_unt4', 'Drachengarde', 'onStart', [], [],
      'Die Verbündeten erleiden 22 % weniger Schaden — der Knecht selbst hat 40 % weniger Leben',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) { u.minderung = Math.max(u.minderung || 0, 0.22); });
        c.self.maxHp = Math.round(c.self.maxHp * 0.6);
        c.self.hp = Math.min(c.self.hp, c.self.maxHp);
      }),

    passiv('knecht_def1', 'Panzerechse', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 34 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.34)); }),
    passiv('knecht_def2', 'Zäh', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'knecht_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.075, 'Zäh');
      }),
    passiv('knecht_def3', 'Widerhaken', 'onStart', [], ['konter'],
      'Führt ein Verbündeter Konter, kostet kein Treffer mehr als 16 % seines Lebens — sonst 22 %',
      function (c) {
        var d = truppFuehrt(c, 'konter') ? 0.16 : 0.22;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('knecht_def4', 'Standhalten', 'onStart', [], [],
      'Kein Treffer kostet mehr als 14 % seines Lebens — dafür heilt den Knecht nichts mehr',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.135);
        c.self.heilfaktor = -1;
        c.self.regen = 0;
      }),

    /* ---- Quellenpriesterin: die Regeneration -------------------------------
       Sie heilt stetig statt in Schüben. Ihre Linien zahlen sich über die Länge
       eines Kampfes aus, nicht in einer Runde.                                */

    passiv('prie_ang1', 'Segen der Quelle', 'onHit', ['heilung'], [],
      'Der erste Schlag des Kampfes trifft 80 % härter und heilt den Trupp um 12 %',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 1.8;
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.12, 'Segen der Quelle'); });
      }),
    passiv('prie_ang2', 'Wasserklinge', 'onHit', ['heilung'], [],
      'Jeder dritte Schlag trifft 80 % härter und heilt sie um die Hälfte des Schadens',
      function (c) {
        if (!zaehler(c.self, 'prie_ang2', 3)) return;
        c.dmg *= 1.8;
        c.self.lifesteal = Math.max(c.self.lifesteal || 0, 0.5);
      }),
    passiv('prie_ang3', 'Lebensraub', 'onHit', [], ['heilung'],
      'Führt ein Verbündeter Heilung, schlägt die Priesterin 26 % härter — sonst 8 %',
      function (c) { c.dmg *= truppFuehrt(c, 'heilung') ? 1.26 : 1.08; }),
    passiv('prie_ang4', 'Fließende Kraft', 'onStart', ['heilung'], [],
      'Ihr Schaden wächst mit ihrer Regeneration — dafür heilt jede Heilung sie nur halb',
      function (c) {
        c.self.heilfaktor = -0.5;
        c.addEffect(c.self, { hook: 'onHit', name: 'Fließende Kraft', fn: function (k) {
          k.dmg *= 1 + Math.min(0.9, (k.self.regen || 0) * 0.04);
        } });
      }),

    passiv('prie_mec1', 'Heilquelle', 'onStart', ['heilung'], [],
      'Gibt dem ganzen Trupp zu Kampfbeginn +7 Regeneration',
      function (c) { c.allies().forEach(function (u) { u.regen += 7; }); }),
    passiv('prie_mec2', 'Tiefer Brunnen', 'onDamaged', ['heilung'], [],
      'Jeder dritte erlittene Treffer gibt dem ganzen Trupp +3 Regeneration',
      function (c) {
        if (!zaehler(c.self, 'prie_mec2', 3)) return;
        c.allies().forEach(function (u) { u.regen += 3; });
      }),
    passiv('prie_mec3', 'Ewiger Fluss', 'onStart', ['heilung'], [],
      'Führt ein Verbündeter Heilung, wirkt jede Heilung im Trupp 28 % stärker — sonst 10 %',
      function (c) {
        var f = truppFuehrt(c, 'heilung') ? 0.28 : 0.1;
        c.allies().forEach(function (u) { u.heilfaktor += f; });
      }),
    passiv('prie_mec4', 'Überfluss', 'onStart', ['heilung'], [],
      'Die Regeneration des Trupps wirkt 50 % stärker — dafür schlägt die Priesterin nur noch mit einem Viertel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.25);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Überfluss', fn: function (k) {
          k.allies().forEach(function (u) { k.heal(u, (u.regen || 0) * 0.5, 'Überfluss'); });
        } });
      }),

    passiv('prie_unt1', 'Quellwasser', 'onStart', ['heilung'], [],
      'Heilt den Trupp zu Kampfbeginn um 12 % und gibt allen +4 Regeneration',
      function (c) {
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.12, 'Quellwasser'); u.regen += 4; });
      }),
    passiv('prie_unt2', 'Reinigung', 'onDamaged', ['licht'], [],
      'Jeder vierte Treffer auf den Trupp legt allen göttliches Licht an',
      function (c) {
        if (!zaehler(c.self, 'prie_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'licht', 2); });
      }),
    passiv('prie_unt3', 'Segen', 'onStart', [], ['heilung'],
      'Führt ein Verbündeter Heilung, regeneriert der ganze Trupp +7 — sonst +3',
      function (c) {
        var n = truppFuehrt(c, 'heilung') ? 7 : 3;
        c.allies().forEach(function (u) { u.regen += n; });
      }),
    passiv('prie_unt4', 'Herrin der Quelle', 'onStart', ['heilung'], [],
      'Der Trupp bekommt +12 % Leben und 28 % stärkere Heilung — die Priesterin greift nicht mehr an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.heilfaktor += 0.28;
          var add = Math.round(u.maxHp * 0.12);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = 1;
      }),

    passiv('prie_def1', 'Flink', 'onStart', ['tempo'], [],
      'Beginnt mit Schild über 26 % ihres Lebens und +15 % Tempo',
      function (c) {
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.26));
        c.self.spd = Math.round(c.self.spd * 1.15);
      }),
    passiv('prie_def2', 'Selbstquell', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % ihres Lebens',
      function (c) {
        if (!zaehler(c.self, 'prie_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.085, 'Selbstquell');
      }),
    passiv('prie_def3', 'Wasserschild', 'onStart', [], ['heilung'],
      'Führt ein Verbündeter Heilung, kostet kein Treffer mehr als 17 % ihres Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'heilung') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('prie_def4', 'Unversiegbar', 'onDeath', ['heilung'], [],
      'Steht einmal mit 45 % Leben wieder auf und heilt den Trupp um 25 % — danach heilt sie nichts mehr',
      function (c) {
        if (c.self._auf) return;
        c.self._auf = 1; c.self.hp = Math.round(c.self.maxHp * 0.45);
        c.allies().forEach(function (u) { c.heal(u, u.maxHp * 0.25, 'Unversiegbar'); });
        c.self.heilfaktor = -1;
        c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name, side: c.self.side, hp: c.self.hp });
      })
  ];

  /* ---- Linien: restliche Einheiten (TODO.md: 20/20) ---------------------
     Die vier Linien sind pro Einheit 4×4 Stufen-IDs (angriff/mechanik/
     unterstuetzung/defensive). Damit alle Einheiten wählbar sind, erzeugen
     wir die fehlenden Passiven programmgesteuert, die dann in `linien` per
     ID referenziert werden.                                                   */

  /* ---- Werkzeug, das die Linien gemeinsam benutzen -------------------------
     Hier stand einmal ein Generator: er hat 20 Einheiten Linien gegeben, als
     noch die Hälfte des Rosters keine hatte, und wurde in Phase 21 auf die vier
     RPG-Rungs umgebaut. Seit alle 35 Einheiten von Hand geschrieben sind, hatte
     er keine Kundschaft mehr — rund 340 Zeilen, die niemand mehr aufrief. Diese
     vier Helfer sind geblieben, weil die handgeschriebenen Linien sie
     weiterbenutzen.                                                            */

  /* Feat-Chain: das Schlüsselwort muss vom TRUPP kommen, nicht von der Einheit
     selbst — sonst wäre es ein verkappter Eigenbonus statt einer Bedingung. */
  function truppFuehrt(c, kw) {
    return c.allies().some(function (a) {
      return a !== c.self && (a.keywords || []).indexOf(kw) >= 0;
    });
  }

  /* Wie viele VERSCHIEDENE Zustände trägt ein Ziel? Rimurus ganze Linie hängt
     daran: er legt selbst keine Marke an, er liest, was andere angelegt haben.
     Deshalb ist er der einzige Baustein, der von fremden Schlüsselwörtern lebt. */
  var ZUSTAENDE_FEIND = ['gift', 'brand', 'blutung', 'verderbnis', 'verwundbar',
                         'chaos', 'dunkelheit', 'donner', 'erstarrung'];
  function gelesen(ziel) {
    if (!ziel) return 0;
    var n = 0;
    ZUSTAENDE_FEIND.forEach(function (k) { if ((ziel.status[k] || 0) > 0) n++; });
    return n;
  }

  /* Zwei Verwandlungen an denselben zwei Rädern, aber an verschiedenen
   Enden: Ordnung zählt, was Shion SELBST trägt, Verderbnis, was auf dem
   FELD liegt. Beide sind Schwellen, keine Zahlen — und was sie geben, hängt
   daran, wie weit man über die Schwelle hinaus gestapelt hat. Wer nur
   knapp hinkommt, bekommt wenig; wer den Bau wirklich fährt, viel.
   `verwandle` ist die eine Stelle dafür, damit die beiden nicht mit der
   Zeit auseinanderlaufen.                                                  */
  function verwandle(c, form, sigId, stapel, schwelle, proStapel, deckel) {
    var f = Math.min(deckel, proStapel * stapel);
    c.self.atk = Math.round(c.self.atk * (1 + f));
    c.self.spd = Math.round(c.self.spd * (1 + f * 0.5));
    var mehr = Math.round(c.self.maxHp * f * 0.6);
    c.self.maxHp += mehr;
    c.self.hp += mehr;
    var sig = byId(sigId);
    if (sig) c.self.actives = [sig];
    c.log.push({ t: 0, type: 'verwandlung', key: c.self.key, unit: c.self.name,
                 side: c.self.side, form: form,
                 stapel: Math.round(stapel), bonus: Math.round(f * 100) });
  }


  /* Geld und Suphia nehmen ihrer Reihe Schaden ab — die Deckung des
     Kampfsystems hängt dagegen an Platz 3. Gebaut aus vorhandenen Mitteln: der
     Verbündete bekommt seinen Anteil zurückgeheilt, der Beschützer bekommt ihn
     roh. Ein Anteil über 0.5 wäre ein Perpetuum mobile, deshalb der Deckel. */
  function koenigsdeckung(c, anteil) {
    var schutz = c.self;
    anteil = Math.min(0.5, anteil);
    c.allies().forEach(function (u) {
      if (u === schutz) return;
      c.addEffect(u, { hook: 'onDamaged', name: 'Deckung des Königs', fn: function (k) {
        if (!schutz.hp || schutz.hp <= 0) return;
        var teil = (k.amount || 0) * anteil;
        if (teil < 1) return;
        k.heal(k.self, teil, 'Deckung des Königs');
        k.deal(schutz, teil, 'Deckung des Königs', { pure: true });
      } });
    });
  }

  /* Göttliche Angriffsmagie: Schaden, der weder Rüstung noch Schild kennt.
     Genau deshalb müssen die Anteile klein bleiben. Eine Stelle, damit Shuna
     und Adalmann dasselbe Licht führen und nicht zwei leicht verschiedene. */
  function heiligerSchlag(c, ziel, teil, quelle) {
    if (!ziel) return 0;
    return c.deal(ziel, c.self.atk * teil, quelle || 'Göttliches Licht', { pure: true });
  }

  /* Das schwächste Ziel einer Liste — oder null. Passive an `onDamaged` feuern
     auch, wenn eine Gift- oder Brandmarke den letzten Gegner gerade erledigt
     hat; ein blankes `reduce` wirft dort über eine leere Liste. */
  function schwaechstes(liste, wert) {
    if (!liste.length) return null;
    return liste.reduce(function (a, b) { return wert(b) < wert(a) ? b : a; });
  }

  /* Ein Zähler je Passive und Einheit. Der Schlüssel hängt an der ID, damit
     zwei Manöver-Passiven nicht denselben Vorrat leerräumen. */
  function zaehler(self, id, ziel) {
    self._man = self._man || {};
    self._man[id] = (self._man[id] || 0) + 1;
    if (self._man[id] < ziel) return false;
    self._man[id] = 0;
    return true;
  }


  /* Vier Linien à vier Stufen. Die Stufe entspricht dem Rang: bei der Anwerbung
     Stufe 1, dann je Aufstieg die nächste. Wer hier nicht steht, bekommt weiter
     die drei festen Passiven aus data.js. */
  var linien = {
    shion: {
      angriff: ['shion_ang1', 'shion_ang2', 'shion_ang3', 'shion_ang4', 'shion_ang5', 'shion_ang6'],
      mechanik: ['shion_mec1', 'shion_mec2', 'shion_mec3', 'shion_mec4', 'shion_mec5'],
      unterstuetzung: ['shion_unt1', 'shion_unt2', 'shion_unt3', 'shion_unt4', 'shion_unt5'],
      defensive: ['shion_def1', 'shion_def2', 'shion_def3', 'shion_def4', 'shion_def5']
    },
    /* Rimuru und Adalmann standen im Generator, bis ihre Kits eigene Linien
       verlangten: Rimuru liest fremde Zustände statt eigene anzulegen, und der
       Priester in Adalmann führt Licht neben der Totenmagie. */
    geld: {
      angriff: ['geld_ang1', 'geld_ang2', 'geld_ang3', 'geld_ang4'],
      mechanik: ['geld_mec1', 'geld_mec2', 'geld_mec3', 'geld_mec4'],
      unterstuetzung: ['geld_unt1', 'geld_unt2', 'geld_unt3', 'geld_unt4'],
      defensive: ['geld_def1', 'geld_def2', 'geld_def3', 'geld_def4']
    },
    orkkrieger: {
      angriff: ['orkkrieger_ang1', 'orkkrieger_ang2', 'orkkrieger_ang3', 'orkkrieger_ang4'],
      mechanik: ['orkkrieger_mec1', 'orkkrieger_mec2', 'orkkrieger_mec3', 'orkkrieger_mec4'],
      unterstuetzung: ['orkkrieger_unt1', 'orkkrieger_unt2', 'orkkrieger_unt3', 'orkkrieger_unt4'],
      defensive: ['orkkrieger_def1', 'orkkrieger_def2', 'orkkrieger_def3', 'orkkrieger_def4']
    },
    phobio: {
      angriff: ['phobio_ang1', 'phobio_ang2', 'phobio_ang3', 'phobio_ang4'],
      mechanik: ['phobio_mec1', 'phobio_mec2', 'phobio_mec3', 'phobio_mec4'],
      unterstuetzung: ['phobio_unt1', 'phobio_unt2', 'phobio_unt3', 'phobio_unt4'],
      defensive: ['phobio_def1', 'phobio_def2', 'phobio_def3', 'phobio_def4']
    },
    albis: {
      angriff: ['albis_ang1', 'albis_ang2', 'albis_ang3', 'albis_ang4'],
      mechanik: ['albis_mec1', 'albis_mec2', 'albis_mec3', 'albis_mec4'],
      unterstuetzung: ['albis_unt1', 'albis_unt2', 'albis_unt3', 'albis_unt4'],
      defensive: ['albis_def1', 'albis_def2', 'albis_def3', 'albis_def4']
    },
    suphia: {
      angriff: ['suphia_ang1', 'suphia_ang2', 'suphia_ang3', 'suphia_ang4'],
      mechanik: ['suphia_mec1', 'suphia_mec2', 'suphia_mec3', 'suphia_mec4'],
      unterstuetzung: ['suphia_unt1', 'suphia_unt2', 'suphia_unt3', 'suphia_unt4'],
      defensive: ['suphia_def1', 'suphia_def2', 'suphia_def3', 'suphia_def4']
    },
    zegion: {
      angriff: ['zegion_ang1', 'zegion_ang2', 'zegion_ang3', 'zegion_ang4', 'zegion_ang5'],
      mechanik: ['zegion_mec1', 'zegion_mec2', 'zegion_mec3', 'zegion_mec4'],
      unterstuetzung: ['zegion_unt1', 'zegion_unt2', 'zegion_unt3', 'zegion_unt4'],
      defensive: ['zegion_def1', 'zegion_def2', 'zegion_def3', 'zegion_def4']
    },
    apito: {
      angriff: ['apito_ang1', 'apito_ang2', 'apito_ang3', 'apito_ang4', 'apito_ang5'],
      mechanik: ['apito_mec1', 'apito_mec2', 'apito_mec3', 'apito_mec4'],
      unterstuetzung: ['apito_unt1', 'apito_unt2', 'apito_unt3', 'apito_unt4'],
      defensive: ['apito_def1', 'apito_def2', 'apito_def3', 'apito_def4']
    },
    kaefergarde: {
      angriff: ['kaefergarde_ang1', 'kaefergarde_ang2', 'kaefergarde_ang3', 'kaefergarde_ang4', 'kaefergarde_ang5'],
      mechanik: ['kaefergarde_mec1', 'kaefergarde_mec2', 'kaefergarde_mec3', 'kaefergarde_mec4'],
      unterstuetzung: ['kaefergarde_unt1', 'kaefergarde_unt2', 'kaefergarde_unt3', 'kaefergarde_unt4'],
      defensive: ['kaefergarde_def1', 'kaefergarde_def2', 'kaefergarde_def3', 'kaefergarde_def4']
    },
    testarossa: {
      angriff: ['testarossa_ang1', 'testarossa_ang2', 'testarossa_ang3', 'testarossa_ang4'],
      mechanik: ['testarossa_mec1', 'testarossa_mec2', 'testarossa_mec3', 'testarossa_mec4'],
      unterstuetzung: ['testarossa_unt1', 'testarossa_unt2', 'testarossa_unt3', 'testarossa_unt4'],
      defensive: ['testarossa_def1', 'testarossa_def2', 'testarossa_def3', 'testarossa_def4']
    },
    ultima: {
      angriff: ['ultima_ang1', 'ultima_ang2', 'ultima_ang3', 'ultima_ang4'],
      mechanik: ['ultima_mec1', 'ultima_mec2', 'ultima_mec3', 'ultima_mec4'],
      unterstuetzung: ['ultima_unt1', 'ultima_unt2', 'ultima_unt3', 'ultima_unt4'],
      defensive: ['ultima_def1', 'ultima_def2', 'ultima_def3', 'ultima_def4']
    },
    carrera: {
      angriff: ['carrera_ang1', 'carrera_ang2', 'carrera_ang3', 'carrera_ang4'],
      mechanik: ['carrera_mec1', 'carrera_mec2', 'carrera_mec3', 'carrera_mec4'],
      unterstuetzung: ['carrera_unt1', 'carrera_unt2', 'carrera_unt3', 'carrera_unt4'],
      defensive: ['carrera_def1', 'carrera_def2', 'carrera_def3', 'carrera_def4']
    },
    daemonengarde: {
      angriff: ['daemonengarde_ang1', 'daemonengarde_ang2', 'daemonengarde_ang3', 'daemonengarde_ang4'],
      mechanik: ['daemonengarde_mec1', 'daemonengarde_mec2', 'daemonengarde_mec3', 'daemonengarde_mec4'],
      unterstuetzung: ['daemonengarde_unt1', 'daemonengarde_unt2', 'daemonengarde_unt3', 'daemonengarde_unt4'],
      defensive: ['daemonengarde_def1', 'daemonengarde_def2', 'daemonengarde_def3', 'daemonengarde_def4']
    },
    drachenwelpe: {
      angriff: ['drachenwelpe_ang1', 'drachenwelpe_ang2', 'drachenwelpe_ang3', 'drachenwelpe_ang4'],
      mechanik: ['drachenwelpe_mec1', 'drachenwelpe_mec2', 'drachenwelpe_mec3', 'drachenwelpe_mec4'],
      unterstuetzung: ['drachenwelpe_unt1', 'drachenwelpe_unt2', 'drachenwelpe_unt3', 'drachenwelpe_unt4'],
      defensive: ['drachenwelpe_def1', 'drachenwelpe_def2', 'drachenwelpe_def3', 'drachenwelpe_def4']
    },
    wightkoenig: {
      angriff: ['wightkoenig_ang1', 'wightkoenig_ang2', 'wightkoenig_ang3', 'wightkoenig_ang4'],
      mechanik: ['wightkoenig_mec1', 'wightkoenig_mec2', 'wightkoenig_mec3', 'wightkoenig_mec4'],
      unterstuetzung: ['wightkoenig_unt1', 'wightkoenig_unt2', 'wightkoenig_unt3', 'wightkoenig_unt4'],
      defensive: ['wightkoenig_def1', 'wightkoenig_def2', 'wightkoenig_def3', 'wightkoenig_def4']
    },
    windrache: {
      angriff: ['wind_ang1', 'wind_ang2', 'wind_ang3', 'wind_ang4'],
      mechanik: ['wind_mec1', 'wind_mec2', 'wind_mec3', 'wind_mec4'],
      unterstuetzung: ['wind_unt1', 'wind_unt2', 'wind_unt3', 'wind_unt4'],
      defensive: ['wind_def1', 'wind_def2', 'wind_def3', 'wind_def4']
    },
    gruftwaechter: {
      angriff: ['gruft_ang1', 'gruft_ang2', 'gruft_ang3', 'gruft_ang4'],
      mechanik: ['gruft_mec1', 'gruft_mec2', 'gruft_mec3', 'gruft_mec4'],
      unterstuetzung: ['gruft_unt1', 'gruft_unt2', 'gruft_unt3', 'gruft_unt4'],
      defensive: ['gruft_def1', 'gruft_def2', 'gruft_def3', 'gruft_def4']
    },
    seelenhexe: {
      angriff: ['hexe_ang1', 'hexe_ang2', 'hexe_ang3', 'hexe_ang4'],
      mechanik: ['hexe_mec1', 'hexe_mec2', 'hexe_mec3', 'hexe_mec4'],
      unterstuetzung: ['hexe_unt1', 'hexe_unt2', 'hexe_unt3', 'hexe_unt4'],
      defensive: ['hexe_def1', 'hexe_def2', 'hexe_def3', 'hexe_def4']
    },
    diablo: {
      angriff: ['diablo_ang1', 'diablo_ang2', 'diablo_ang3', 'diablo_ang4'],
      mechanik: ['diablo_mec1', 'diablo_mec2', 'diablo_mec3', 'diablo_mec4'],
      unterstuetzung: ['diablo_unt1', 'diablo_unt2', 'diablo_unt3', 'diablo_unt4'],
      defensive: ['diablo_def1', 'diablo_def2', 'diablo_def3', 'diablo_def4']
    },
    milim: {
      angriff: ['milim_ang1', 'milim_ang2', 'milim_ang3', 'milim_ang4'],
      mechanik: ['milim_mec1', 'milim_mec2', 'milim_mec3', 'milim_mec4'],
      unterstuetzung: ['milim_unt1', 'milim_unt2', 'milim_unt3', 'milim_unt4'],
      defensive: ['milim_def1', 'milim_def2', 'milim_def3', 'milim_def4']
    },
    veldora: {
      angriff: ['veldora_ang1', 'veldora_ang2', 'veldora_ang3', 'veldora_ang4'],
      mechanik: ['veldora_mec1', 'veldora_mec2', 'veldora_mec3', 'veldora_mec4'],
      unterstuetzung: ['veldora_unt1', 'veldora_unt2', 'veldora_unt3', 'veldora_unt4'],
      defensive: ['veldora_def1', 'veldora_def2', 'veldora_def3', 'veldora_def4']
    },
    rimuru: {
      angriff: ['rimuru_ang1', 'rimuru_ang2', 'rimuru_ang3', 'rimuru_ang4'],
      mechanik: ['rimuru_mec1', 'rimuru_mec2', 'rimuru_mec3', 'rimuru_mec4'],
      unterstuetzung: ['rimuru_unt1', 'rimuru_unt2', 'rimuru_unt3', 'rimuru_unt4'],
      defensive: ['rimuru_def1', 'rimuru_def2', 'rimuru_def3', 'rimuru_def4']
    },
    adalmann: {
      angriff: ['adal_ang1', 'adal_ang2', 'adal_ang3', 'adal_ang4'],
      mechanik: ['adal_mec1', 'adal_mec2', 'adal_mec3', 'adal_mec4'],
      unterstuetzung: ['adal_unt1', 'adal_unt2', 'adal_unt3', 'adal_unt4'],
      defensive: ['adal_def1', 'adal_def2', 'adal_def3', 'adal_def4']
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
      angriff: ['ranga_ang1', 'ranga_ang2', 'ranga_ang3', 'ranga_ang4', 'ranga_ang5'],
      mechanik: ['ranga_mec1', 'ranga_mec2', 'ranga_mec3', 'ranga_mec4'],
      unterstuetzung: ['ranga_unt1', 'ranga_unt2', 'ranga_unt3', 'ranga_unt4', 'ranga_unt5'],
      defensive: ['ranga_def1', 'ranga_def2', 'ranga_def3', 'ranga_def4', 'ranga_def5']
    },
    sturmwolf: {
      angriff: ['sturm_ang1', 'sturm_ang2', 'sturm_ang3', 'sturm_ang4', 'sturm_ang5'],
      mechanik: ['sturm_mec1', 'sturm_mec2', 'sturm_mec3', 'sturm_mec4'],
      unterstuetzung: ['sturm_unt1', 'sturm_unt2', 'sturm_unt3', 'sturm_unt4', 'sturm_unt5'],
      defensive: ['sturm_def1', 'sturm_def2', 'sturm_def3', 'sturm_def4', 'sturm_def5']
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
    dornenhaut: 'defensive', konterstoss: 'defensive', windschritt: 'defensive',

    /* Zweite Schicht: Lage statt Prozent. */
    vorhut: 'angriff', hinterhalt: 'angriff', duellant: 'angriff', anlauf: 'angriff',
    zweitschlag: 'angriff', grenzgang: 'angriff',
    markierer: 'mechanik', panzerknacker: 'mechanik', zuendschnur: 'mechanik',
    nachhall: 'mechanik', tempoanker: 'mechanik', brennglas: 'mechanik',
    schlachtplan: 'unterstuetzung', vorbild: 'unterstuetzung',
    feldsanitaeter: 'unterstuetzung', wachabloesung: 'unterstuetzung',
    letztes_aufgebot: 'unterstuetzung', opfergang: 'unterstuetzung',
    standfest: 'defensive', todesverachtung: 'defensive', trotz: 'defensive',
    rueckendeckung: 'defensive', zaehe_haut: 'defensive', festgewachsen: 'defensive'
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

  /* Alle sechzehn Passiven einer Einheit, vier je Linie. Es gibt keine Stufen
     mehr: jede Passive kann jederzeit und in jeder Kombination auftreten. Wer
     zieht, filtert selbst, was die Einheit schon trägt.

     `preis` markiert die, die eine Regel ändern und dafür etwas kosten (halbe
     Rüstung, keine Heilung, gedrosselter Angriff). Sie steht an vierter Stelle
     jeder Linie — nicht als Stufe, sondern weil die Linien so geschrieben sind.
     Feste Position statt „die letzte": sonst wanderte die Markierung mit, sobald
     eine Linie wächst. Das Angebot braucht sie, um „nichts nehmen" daneben
     stellen zu können — einen Preis, den man nicht ablehnen kann, ist ein
     Zwang.                                                                     */
  var PREIS_INDEX = 3;
  function linienAngebot(unitId) {
    var l = linien[unitId];
    if (!l) return [];
    var out = [];
    Object.keys(l).forEach(function (k) {
      l[k].forEach(function (id, i) {
        out.push({ linie: k, linieName: LINIEN_NAME[k], id: id, preis: i === PREIS_INDEX });
      });
    });
    return out;
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
    /* Rimuru legt als einziger keine eigene Marke an — er liest das Feld. Jeder
       VERSCHIEDENE Zustand auf dem Ziel ist ein Datenpunkt und wird zu Antichaos.
       Damit hängt seine Stärke daran, was der Rest des Trupps anrichtet, und er
       ist die Gegenfigur zu Shion: sie sät Chaos, er erntet Ordnung. */
    aktiv('sig_rimuru', 'Prädator', 3, ['chaos'],
      '170 % Schaden und ignoriert Rüstung vollständig. Für jeden VERSCHIEDENEN ' +
      'Zustand auf dem Ziel legt Rimuru sich 1 Antichaos an — und je Antichaos-Stapel ' +
      'trifft er 2 % härter. Tötet der Schlag, wächst sein Angriff dauerhaft um 12 %.',
      function (c) {
        var anti = c.self.status.antichaos || 0;
        c.attack(1.7 * (1 + Math.min(0.5, 0.02 * anti)), c.target, { pierce: 1 });
        var n = gelesen(c.target);
        if (n) c.applyStatus(c.self, 'antichaos', n);
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
      }, schildeDuenn),
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
      }, verwundet),

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
    /* ---- Orks und Bestienkrieger ---------------------------------------- */
    aktiv('sig_geld', 'Hungriger König', 3, ['schild', 'heilung'],
      '120 % Schaden und heilt Geld um die Hälfte davon. Zusätzlich Schild 30 für die ' +
      'am schwersten verwundete Verbündete.',
      function (c) {
        var d = c.attack(1.2);
        c.heal(c.self, d * 0.5, 'Hungriger König');
        var u = schwaechstes(c.allies(), function (x) { return x.hp / x.maxHp; });
        if (u) c.applyStatus(u, 'schild', 30);
      }),
    aktiv('sig_orkkrieger', 'Grobe Axt', 3, [],
      '150 % Schaden. Fehlt dem Krieger selbst mehr als die Hälfte seines Lebens, werden daraus 210 %.',
      function (c) { c.attack(c.self.hp < c.self.maxHp * 0.5 ? 2.1 : 1.5); }),
    aktiv('sig_phobio', 'Schwarzer Sprung', 3, ['tempo'],
      '160 % Schaden auf das schwächste Ziel — und der Schaden schwankt stark: zwischen 60 und 190 %.',
      function (c) {
        var f = schwaechstes(c.foes(), function (x) { return x.hp; }) || c.target;
        c.attack(1.6 * (0.6 + c.rng() * 1.3), f);
      }),
    aktiv('sig_albis', 'Weißer Biss', 3, ['gift'],
      '140 % Schaden, ignoriert die Rüstung, und 4 Gift. Ist das Ziel bereits vergiftet, ' +
      'wächst Albis dauerhaft um 6 % Angriff.',
      function (c) {
        var schon = (c.target.status.gift || 0) > 0;
        c.attack(1.4, c.target, { pierce: 1 });
        c.applyStatus(c.target, 'gift', 4);
        if (schon) c.self.atk = Math.round(c.self.atk * 1.06);
      }),
    aktiv('sig_suphia', 'Goldene Wacht', 3, ['schild'],
      '130 % Schaden. Ist ein Verbündeter unter der Hälfte, bekommt er zusätzlich Schild 45 ' +
      'und Suphia +10 % Angriff für den Rest des Kampfes.',
      function (c) {
        c.attack(1.3);
        var u = schwaechstes(c.allies(), function (x) { return x.hp / x.maxHp; });
        if (u && u.hp < u.maxHp * 0.5) {
          c.applyStatus(u, 'schild', 45);
          c.self.atk = Math.round(c.self.atk * 1.1);
        }
      }),
    /* Die drei Häutungsformen der Insektoiden. Sie gehören keiner Einheit fest —
       sie ersetzen erst im Kampf, wenn die Metamorphose greift. */
    aktiv('sig_zegion_perfekt', 'Raumzerreißung', 4, [],
      '230 % Schaden, der durch Schilde hindurchgeht und den Schild des Ziels zerschlägt — ' +
      'dazu 60 % auf jeden anderen Gegner. Die Form des vollendeten Zegion.',
      function (c) {
        c.target.status.schild = 0;
        c.attack(2.3, c.target, { pure: true });
        c.foes().forEach(function (f) { if (f !== c.target) c.deal(f, c.self.atk * 0.6, 'Raumzerreißung'); });
      }),
    aktiv('sig_apito_koenigin', 'Königinnenstachel', 4, ['gift'],
      '190 % Schaden und 8 Gift auf jeden Gegner. Die Form der ausgewachsenen Königin.',
      function (c) {
        c.attack(1.9);
        c.foes().forEach(function (f) { c.applyStatus(f, 'gift', 8); });
      }),
    aktiv('sig_kaefergarde_panzer', 'Panzerwall', 4, ['schild'],
      '170 % Schaden und ein Schild über 20 % des eigenen Lebens für jeden Verbündeten. ' +
      'Die aufgeklappte Form der Garde.',
      function (c) {
        c.attack(1.7);
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.maxHp * 0.2)); });
      }),
    /* Die Signatur des Ordnungsteufels — das Gegenstück zur Chaosklinge:
       sie verteilt Ordnung, statt Unordnung zu säen. */
    aktiv('sig_shion_ordnung', 'Klinge der Ordnung', 4, ['chaos'],
      '190 % Schaden. Danach bekommt der ganze Trupp Antichaos in Höhe des Rangs — ' +
      '1 auf C, 2 auf B, 3 auf A, 5 auf S. Die Signatur des Ordnungsteufels.',
      function (c) {
        c.attack(1.9);
        var n = CHAOS_JE_RANG[c.self.rank || 0];
        c.allies().forEach(function (u) { c.applyStatus(u, 'antichaos', n); });
      }),
    /* Die Signatur der Schattenfusion — Ranga trägt sie erst, wenn Gobta im
       Trupp sitzt und die Verschmelzung greift. */
    aktiv('sig_ranga_fusion', 'Schwarzer Blitz der Fusion', 4, ['donner', 'schatten'],
      '210 % Schaden auf die ganze gegnerische Reihe und 4 Donner auf jeden. ' +
      'Die Signatur von Ranga und Gobta als eins.',
      function (c) {
        c.foes().forEach(function (f) {
          c.attack(2.1, f);
          c.applyStatus(f, 'donner', 4);
        });
      }),
    /* Die Signatur des Verdorbenen Teufels. Sie ersetzt den Chaosschlag erst,
       wenn die Verwandlung greift — vorher trägt sie niemand. `sig_`-Präfix
       heißt: einheitenspezifisch, also keine Raritätsstufe und kein Pool. */
    aktiv('sig_shion_verdorben', 'Chaosklinge des Verdorbenen', 4, ['chaos'],
      '230 % Schaden und die doppelte Menge Chaos — 2 Stapel auf Rang C, 4 auf B, ' +
      '6 auf A, 10 auf S. Die Signatur des Verdorbenen Teufels.',
      function (c) {
        c.attack(2.3);
        c.chaos(c.target, CHAOS_JE_RANG[c.self.rank || 0] * 2);
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
      }, verwundet),
    aktiv('sig_hakuro', 'Fliegender Hieb', 3, [],
      '180 % Schaden und ignoriert Rüstung. Gegen ein noch unverletztes Ziel (über 70 % Leben) sind es 230 %.',
      function (c) {
        c.attack(c.target.hp > c.target.maxHp * 0.7 ? 2.3 : 1.8, c.target, { pierce: 1 });
      }),
    aktiv('sig_kurobe', 'Geschmiedete Klinge', 5, [],
      'Alle Verbündeten erhalten dauerhaft +6 Angriff. Ist Kurobe unverletzt, zusätzlich +2 Rüstung.',
      function (c) {
        c.self._gerufen = 1;
        var voll = c.self.hp >= c.self.maxHp;
        c.allies().forEach(function (u) { u.atk += 6; if (voll) u.def += 2; });
      }, nochNichtGerufen),

    /* --- Sturmwölfe --- */
    aktiv('sig_ranga', 'Schwarzer Blitz', 2, ['donner', 'schatten', 'flaeche'],
      '140 % Schaden und 2 Donner, der für 60 % auf ein zweites Ziel überspringt und dort ' +
      '1 Donner lädt. Ranga selbst hüllt sich dabei in 1 Schatten.',
      function (c) {
        c.attack(1.4);
        c.applyStatus(c.target, 'donner', 2);
        var f = c.foes().filter(function (x) { return x !== c.target; })[0];
        if (f) { c.attack(0.6, f); c.applyStatus(f, 'donner', 1); }
        c.applyStatus(c.self, 'schatten', 1);
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
      }, schildeDuenn),
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
      }, verwundet),

    /* --- Insektoide --- */
    aktiv('sig_zegion', 'Raumfaust', 3, [],
      '190 % Schaden, der durch Schilde hindurchgeht — und den Schild des Ziels vollständig zerschlägt.',
      /* `attack` statt `deal`: nur der Angriffsweg feuert `onHit`. Mit `deal`
         war Zegions gesamte Angriffslinie tot — die Passiven hingen an einem
         Haken, den seine Signatur nie zog. */
      function (c) {
        c.target.status.schild = 0;
        c.attack(1.9, c.target, { pure: true });
      }),
    aktiv('sig_apito', 'Giftstachel', 3, ['gift'],
      '130 % Schaden und 5 Gift. Trägt das Ziel schon 6 Gift, geht der Stich durch jeden Schild.',
      function (c) {
        /* `attack` in beiden Zweigen: `deal` umgeht `angriff()` und damit den
           onHit-Haken. Vorher schaltete Apitos eigenes Gift ihre gesamte
           Angriffslinie ab, sobald sechs Stapel lagen. */
        c.attack(1.3, c.target, { pure: c.target.status.gift >= 6 });
        c.applyStatus(c.target, 'gift', 5);
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

    /* --- Dämonen --- */
    aktiv('sig_diablo', 'Belial', 3, ['dunkelheit', 'schatten'],
      '140 % Schaden und 3 Dunkelheit. Diablo tritt danach in 2 Schatten zurück; ' +
      'ist das Ziel bereits völlig umnachtet, reißt der Griff zusätzlich 12 % seines maximalen Lebens heraus.',
      function (c) {
        var blind = (c.target.status.dunkelheit || 0) >= 5;
        c.attack(1.4);
        if (blind) c.deal(c.target, c.target.maxHp * 0.12, 'Belial', { pure: true });
        c.applyStatus(c.target, 'dunkelheit', 3);
        c.applyStatus(c.self, 'schatten', 2);
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
    aktiv('sig_gruftwaechter', 'Grabwache', 4, ['schild'],
      'Schild 35 auf sich und die vorderste Einheit. Liegt diese unter der Hälfte, bekommt sie das Doppelte.',
      function (c) {
        c.applyStatus(c.self, 'schild', 35);
        var vorn = c.allies()[0];
        if (vorn) c.applyStatus(vorn, 'schild', vorn.hp < vorn.maxHp * 0.5 ? 70 : 35);
      }, schildeDuenn),
    aktiv('sig_seelenhexe', 'Seelenernte', 4, ['heilung'],
      'Heilt alle Verbündeten um 90 % des Angriffs — je gefallenem Verbündeten um die Hälfte mehr.',
      function (c) {
        var tote = c.self._tote || 0;
        c.allies().forEach(function (u) { c.heal(u, c.self.atk * 0.9 * (1 + tote * 0.5), 'Seelenernte'); });
      }, verwundet)
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
    /* Zweite Bibliotheksschicht: die Stufe sagt, wie eng die Lage ist, in der
       die Passive zahlt. Eine, die immer wirkt, ist üblich; eine, die einen
       Preis trägt oder eine seltene Lage braucht, ist episch. */
    vorhut: 2, hinterhalt: 2, duellant: 3, anlauf: 3, zweitschlag: 3, grenzgang: 4,
    markierer: 3, panzerknacker: 2, zuendschnur: 2, nachhall: 3, tempoanker: 3, brennglas: 4,
    schlachtplan: 3, vorbild: 2, feldsanitaeter: 3, wachabloesung: 2,
    letztes_aufgebot: 4, opfergang: 4,
    standfest: 2, todesverachtung: 3, trotz: 2, rueckendeckung: 3,
    zaehe_haut: 3, festgewachsen: 4,

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
