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
    passiv('shion_ang5', 'Verdorbener Teufel', 'onHit', ['chaos'], ['chaos'],
      'Triffst du ein Ziel mit 10 Chaos, während du selbst 10 Antichaos hältst, ' +
      'wirst du zum Verdorbenen Teufel: +45 % Angriff, +25 % Leben, +20 % Tempo — ' +
      'und die Signatur wird zur Chaosklinge des Verdorbenen (230 % Schaden, doppeltes Chaos). ' +
      'Einmal je Kampf.',
      function (c) {
        if (c.self._verdorben) return;
        if ((c.target.status.chaos || 0) < 10 || (c.self.status.antichaos || 0) < 10) return;
        c.self._verdorben = 1;
        c.self.atk = Math.round(c.self.atk * 1.45);
        c.self.spd = Math.round(c.self.spd * 1.2);
        var mehr = Math.round(c.self.maxHp * 0.25);
        c.self.maxHp += mehr;
        c.self.hp += mehr;
        var sig = byId('sig_shion_verdorben');
        if (sig) c.self.actives = [sig];
        c.log.push({ t: 0, type: 'verwandlung', key: c.self.key, unit: c.self.name,
                     side: c.self.side, form: 'Verdorbener Teufel' });
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
    passiv('rimuru_ang4', 'Belial', 'onStart', ['chaos'], [],
      'Rimurus Antichaos zählt doppelt für alles, was daran hängt — dafür verliert er in jedem Zug einen Stapel obendrein',
      function (c) {
        c.self.antichaosDoppelt = 1;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Belial', fn: function (k) {
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

    passiv('rimuru_def1', 'Schleimleib', 'onStart', ['schild'], [],
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
    passiv('souei_def2', 'Fadenschild', 'onDamaged', ['schild'], [],
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

    passiv('ben_def1', 'Flammenhaut', 'onStart', ['brand', 'schild'], [],
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

    passiv('hak_def1', 'Ausweichschritt', 'onStart', ['schild', 'tempo'], [],
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

    passiv('kur_def1', 'Amboss', 'onStart', ['schild'], [],
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

    passiv('rigur_def1', 'Wachsamkeit', 'onStart', ['schild'], [],
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

    passiv('sturm_def1', 'Flinkes Fell', 'onStart', ['schild', 'tempo'], [],
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

    /* ---- Schattenwölfe: Dunkelheit ----------------------------------------
       Der Schattenwolf nimmt dem Gegner die Wucht, statt selbst zuzuschlagen.
       Dunkelheit senkt fremden Schaden, Schatten lässt Treffer danebengehen.  */

    passiv('schatten_ang1', 'Aus dem Dunkel', 'onHit', ['dunkelheit'], [],
      'Der erste Schlag des Kampfes trifft 130 % härter und hüllt alle Gegner in 3 Dunkelheit',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2.3;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
      }),
    passiv('schatten_ang2', 'Blindschlag', 'onHit', ['dunkelheit'], [],
      'Jeder dritte Schlag trifft 80 % härter und legt 3 Dunkelheit nach',
      function (c) {
        if (!zaehler(c.self, 'schatten_ang2', 3)) return;
        c.dmg *= 1.8;
        c.applyStatus(c.target, 'dunkelheit', 3);
      }),
    passiv('schatten_ang3', 'Nachtklinge', 'onHit', [], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, trifft der Wolf umnachtete Ziele 32 % härter — sonst 10 %',
      function (c) {
        if ((c.target.status.dunkelheit || 0) > 0) {
          c.dmg *= truppFuehrt(c, 'dunkelheit') ? 1.32 : 1.1;
        }
      }),
    passiv('schatten_ang4', 'Herz der Finsternis', 'onStart', ['dunkelheit'], [],
      'Im Schatten schlägt der Wolf doppelt — außerhalb nur noch halb',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Herz der Finsternis', fn: function (k) {
          k.dmg *= (k.self.status.schatten || 0) > 0 ? 2 : 0.5;
        } });
      }),

    passiv('schatten_mec1', 'Schattenmantel', 'onStart', ['schatten'], [],
      'Beginnt den Kampf tief im Schatten',
      function (c) { c.applyStatus(c.self, 'schatten', 6); }),
    passiv('schatten_mec2', 'Verdunkeln', 'onDamaged', ['dunkelheit'], [],
      'Jeder dritte erlittene Treffer hüllt alle Gegner in 3 Dunkelheit',
      function (c) {
        if (!zaehler(c.self, 'schatten_mec2', 3)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
      }),
    passiv('schatten_mec3', 'Tiefer Schatten', 'onStart', ['schatten'], [],
      'Führt ein Verbündeter Schatten, legt jeder Zug 3 Schatten nach — sonst 1',
      function (c) {
        var n = truppFuehrt(c, 'schatten') ? 3 : 1;
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Tiefer Schatten', fn: function (k) {
          k.applyStatus(k.self, 'schatten', n);
        } });
      }),
    passiv('schatten_mec4', 'Neumond', 'onStart', ['dunkelheit'], [],
      'Jeder Zug hüllt alle Gegner in 4 Dunkelheit — dafür schlägt der Wolf nur noch mit einem Drittel',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.34);
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Neumond', fn: function (k) {
          k.foes().forEach(function (f) { k.applyStatus(f, 'dunkelheit', 4); });
        } });
      }),

    passiv('schatten_unt1', 'Schattenwurf', 'onStart', ['schatten'], [],
      'Zu Kampfbeginn 3 Schatten für den ganzen Trupp',
      function (c) { c.allies().forEach(function (u) { c.applyStatus(u, 'schatten', 3); }); }),
    passiv('schatten_unt2', 'Blendung', 'onDamaged', ['dunkelheit'], [],
      'Jeder vierte Treffer auf den Trupp hüllt alle Gegner in 3 Dunkelheit',
      function (c) {
        if (!zaehler(c.self, 'schatten_unt2', 4)) return;
        c.foes().forEach(function (f) { c.applyStatus(f, 'dunkelheit', 3); });
      }),
    passiv('schatten_unt3', 'Nachtjagd', 'onStart', [], ['dunkelheit'],
      'Führt ein Verbündeter Dunkelheit, legt jeder Treffer des Trupps 2 nach — sonst 1',
      function (c) {
        var n = truppFuehrt(c, 'dunkelheit') ? 2 : 1;
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onHit', name: 'Nachtjagd', fn: function (k) {
            k.applyStatus(k.target, 'dunkelheit', n);
          } });
        });
      }),
    passiv('schatten_unt4', 'Mondlose Nacht', 'onStart', ['schatten'], [],
      'Der ganze Trupp bleibt im Schatten — der Wolf selbst schlägt nur noch mit einem Viertel',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        c.self.atk = Math.round(c.self.atk * 0.25);
        c.allies().forEach(function (u) {
          c.addEffect(u, { hook: 'onTurnStart', name: 'Mondlose Nacht', fn: function (k) {
            k.applyStatus(k.self, 'schatten', 2);
          } });
        });
      }),

    passiv('schatten_def1', 'Schattenhaut', 'onStart', ['schatten', 'schild'], [],
      'Beginnt im Schatten und mit einem Schild über 25 % seines Lebens',
      function (c) {
        c.applyStatus(c.self, 'schatten', 4);
        c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.25));
      }),
    passiv('schatten_def2', 'Schattengestalt', 'onDamaged', ['schatten'], [],
      'Jeder dritte erlittene Treffer wirft den Wolf zurück in den Schatten',
      function (c) {
        if (!zaehler(c.self, 'schatten_def2', 3)) return;
        c.applyStatus(c.self, 'schatten', 5);
      }),
    passiv('schatten_def3', 'Umkehrschatten', 'onDamaged', ['konter'], [],
      'Führt ein Verbündeter Konter, zahlt der Wolf 40 % des Angriffs zurück — sonst 15 %',
      function (c) {
        var f = c.foes()[0];
        if (f) c.deal(f, c.self.atk * (truppFuehrt(c, 'konter') ? 0.4 : 0.15), 'Umkehrschatten');
      }),
    passiv('schatten_def4', 'Nebelwolf', 'onStart', ['schatten'], [],
      'Kein Treffer kostet mehr als 14 % seines Lebens — dafür heilt den Wolf nichts mehr',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.135);
        c.self.heilfaktor = -1;
        c.self.regen = 0;
      }),

    /* ---- Rudelalpha: das Rudel ---------------------------------------------
       Der Alpha ist nur so stark wie die Wölfe um ihn herum. Fast alles zählt,
       wie viele noch stehen.                                                  */

    passiv('alpha_ang1', 'Leitwolf', 'onHit', [], [],
      'Der erste Schlag des Kampfes trifft 100 % härter, je Verbündetem weitere 20 %',
      function (c) {
        if (c.self._auftakt) return;
        c.self._auftakt = 1;
        c.dmg *= 2 + 0.2 * (c.allies().length - 1);
      }),
    passiv('alpha_ang2', 'Erster Biss', 'onHit', [], [],
      'Jeder dritte Schlag trifft doppelt und gibt dem Trupp +4 Angriff',
      function (c) {
        if (!zaehler(c.self, 'alpha_ang2', 3)) return;
        c.dmg *= 2;
        c.allies().forEach(function (u) { u.atk += 4; });
      }),
    passiv('alpha_ang3', 'Alphaschlag', 'onHit', [], ['tempo'],
      'Führt ein Verbündeter Tempo, schlägt der Alpha 30 % härter — sonst 10 %',
      function (c) { c.dmg *= truppFuehrt(c, 'tempo') ? 1.3 : 1.1; }),
    passiv('alpha_ang4', 'Rudelführer', 'onStart', [], [],
      'Der Alpha schlägt 12 % härter je stehendem Verbündeten — allein nur noch halb so hart',
      function (c) {
        c.addEffect(c.self, { hook: 'onHit', name: 'Rudelführer', fn: function (k) {
          var n = k.allies().length - 1;
          k.dmg *= n > 0 ? 1 + 0.12 * n : 0.5;
        } });
      }),

    passiv('alpha_mec1', 'Hetze', 'onStart', ['tempo'], [],
      'Beginnt den Kampf mit +28 % Tempo',
      function (c) { c.self.spd = Math.round(c.self.spd * 1.28); }),
    passiv('alpha_mec2', 'Zweiter Wind', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 10 % und gibt +10 % Tempo',
      function (c) {
        if (!zaehler(c.self, 'alpha_mec2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.07, 'Zweiter Wind');
        c.self.spd = Math.round(c.self.spd * 1.1);
      }),
    passiv('alpha_mec3', 'Sturmlauf', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, bekommt der ganze Trupp +18 % Tempo — sonst +6 %',
      function (c) {
        var f = truppFuehrt(c, 'tempo') ? 1.18 : 1.06;
        c.allies().forEach(function (u) { u.spd = Math.round(u.spd * f); });
      }),
    passiv('alpha_mec4', 'Rudelrausch', 'onStart', ['tempo'], [],
      'Jeder gefallene Verbündete gibt dem Alpha +35 % Angriff — dafür heilt ihn nichts mehr',
      function (c) {
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.addEffect(c.self, { hook: 'onAllyDeath', name: 'Rudelrausch', fn: function (k) {
          k.self.atk = Math.round(k.self.atk * 1.35);
        } });
      }),

    passiv('alpha_unt1', 'Rudelbefehl', 'onStart', [], [],
      'Zu Kampfbeginn +12 % Angriff und +10 % Tempo für den ganzen Trupp',
      function (c) {
        c.allies().forEach(function (u) {
          u.atk = Math.round(u.atk * 1.12);
          u.spd = Math.round(u.spd * 1.1);
        });
      }),
    passiv('alpha_unt2', 'Beschützer', 'onDamaged', ['schild'], [],
      'Jeder vierte Treffer auf den Trupp legt allen ein Schild an',
      function (c) {
        if (!zaehler(c.self, 'alpha_unt2', 4)) return;
        c.allies().forEach(function (u) { c.applyStatus(u, 'schild', Math.round(c.self.atk * 0.6)); });
      }),
    passiv('alpha_unt3', 'Gemeinsam stark', 'onStart', [], ['tempo'],
      'Führt ein Verbündeter Tempo, schlägt der Trupp 6 % härter je Mitglied — sonst 2 %',
      function (c) {
        var f = (truppFuehrt(c, 'tempo') ? 0.06 : 0.02) * c.allies().length;
        c.allies().forEach(function (u) { u.atk = Math.round(u.atk * (1 + f)); });
      }),
    passiv('alpha_unt4', 'Das Rudel', 'onStart', [], [],
      'Die Verbündeten bekommen +30 % Angriff und Leben — der Alpha selbst greift kaum noch an',
      function (c) {
        var andere = c.allies().filter(function (u) { return u !== c.self; });
        if (!andere.length) return;
        andere.forEach(function (u) {
          u.atk = Math.round(u.atk * 1.3);
          var add = Math.round(u.maxHp * 0.3);
          u.maxHp += add; u.hp += add;
        });
        c.self.atk = Math.round(c.self.atk * 0.2);
      }),

    passiv('alpha_def1', 'Dickes Winterfell', 'onStart', ['schild'], [],
      'Beginnt mit einem Schild über 34 % seines Lebens',
      function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.34)); }),
    passiv('alpha_def2', 'Wachsam', 'onDamaged', [], [],
      'Jeder dritte erlittene Treffer heilt 8 % seines Lebens',
      function (c) {
        if (!zaehler(c.self, 'alpha_def2', 3)) return;
        c.heal(c.self, c.self.maxHp * 0.08, 'Wachsam');
      }),
    passiv('alpha_def3', 'Nie allein', 'onStart', [], ['schild'],
      'Führt ein Verbündeter Schild, kostet kein Treffer mehr als 17 % seines Lebens — sonst 23 %',
      function (c) {
        var d = truppFuehrt(c, 'schild') ? 0.17 : 0.23;
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
      }),
    passiv('alpha_def4', 'Alter Alpha', 'onStart', [], [],
      'Der Alpha erleidet 12 % weniger Schaden je Verbündetem — allein 30 % mehr',
      function (c) {
        c.addEffect(c.self, { hook: 'onTurnStart', name: 'Alter Alpha', fn: function (k) {
          var n = k.allies().length - 1;
          k.self.minderung = n > 0 ? Math.min(0.5, 0.12 * n) : -0.3;
        } });
        var n0 = c.allies().length - 1;
        c.self.minderung = n0 > 0 ? Math.min(0.5, 0.12 * n0) : -0.3;
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

    passiv('gab_def1', 'Schuppenpanzer', 'onStart', ['schild'], [],
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

    passiv('souka_def1', 'Fluchtinstinkt', 'onStart', ['schild', 'tempo'], [],
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

    passiv('prie_def1', 'Flink', 'onStart', ['schild', 'tempo'], [],
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

  var LINE_UNITS = [
    'zegion', 'apito', 'riesenameise', 'kaefergarde', 'giftfalter',
    'diablo', 'testarossa', 'ultima', 'carrera', 'daemonengarde',
    'veldora', 'milim', 'drachenwelpe', 'windrache',
    'wightkoenig', 'skelettritter', 'gruftwaechter', 'seelenhexe'
  ];

  var LINE_UNIT_NAME = {
    zegion: 'Zegion',
    apito: 'Apito',
    riesenameise: 'Riesenameise',
    kaefergarde: 'Käfergarde',
    giftfalter: 'Giftfalter',
    diablo: 'Diablo',
    testarossa: 'Testarossa',
    ultima: 'Ultima',
    carrera: 'Carrera',
    daemonengarde: 'Dämonengarde',
    veldora: 'Veldora',
    milim: 'Milim',
    drachenwelpe: 'Drachenwelpe',
    windrache: 'Windrache',
    wightkoenig: 'Wight-König',
    skelettritter: 'Skelettritter',
    gruftwaechter: 'Gruftwächter',
    seelenhexe: 'Seelenhexe'
  };

  var LINE_THEME = {
    zegion: { kind: 'konter', defRevive: false },
    apito: { kind: 'status', statusKey: 'gift', defRevive: false },
    riesenameise: { kind: 'konter', defRevive: false },
    kaefergarde: { kind: 'shield', defRevive: false },
    giftfalter: { kind: 'status', statusKey: 'gift', defRevive: false },

    diablo: { kind: 'status', statusKey: 'verderbnis', defRevive: false },
    testarossa: { kind: 'exekution', defRevive: false },
    ultima: { kind: 'status', statusKey: 'verderbnis', defRevive: false },
    carrera: { kind: 'status', statusKey: 'brand', defRevive: false },
    daemonengarde: { kind: 'status', statusKey: 'verderbnis', defRevive: false },

    veldora: { kind: 'flaeche', defRevive: false },
    milim: { kind: 'exekution', defRevive: false },
    drachenwelpe: { kind: 'status', statusKey: 'brand', defRevive: false },
    windrache: { kind: 'tempo', defRevive: false },

    wightkoenig: { kind: 'heal', defRevive: true },
    skelettritter: { kind: 'konter', defRevive: true },
    gruftwaechter: { kind: 'shield', defRevive: true },
    seelenhexe: { kind: 'heal', defRevive: true }
  };

  function lineId(unitId, kat, n) { return unitId + '_' + kat + n; }
  function lineLabel(kat) {
    if (kat === 'ang') return 'Angriff';
    if (kat === 'mec') return 'Mechanik';
    if (kat === 'unt') return 'Unterstützung';
    return 'Defensive';
  }

  /* ---- Vier Stufen, vier geliehene RPG-Konzepte (PLAN.md, Phase 21) -------
     Der alte Generator schrieb dieselbe Wirkung vier Mal größer: Stufe 4 war
     Stufe 1 mit einer anderen Zahl, und dem Kampf sah man nicht an, welche
     Linie jemand gewählt hatte. Jetzt hat jede Stufe eine eigene Aufgabe:

       1  Auftakt        Nova/Alpha-Strike — einmal je Kampf, dafür wuchtig.
       2  Manöverzähler  D&D Battle Master — füllt sich, wird ausgegeben.
       3  Voraussetzung  Pathfinder Feat-Chain — fordert ein Schlüsselwort vom
                         TRUPP und zahlt dafür ein Vielfaches.
       4  Keystone       Path of Exile — ändert eine Regel und kostet dafür.

     WAS eine Stufe tut, liefert das Thema der Einheit (`LINE_THEME`). WORAUF
     sie wirkt, entscheidet die Linie: Angriff auf den eigenen Schlag,
     Mechanik auf den Themeneffekt, Unterstützung auf den Trupp, Defensive
     auf das Überleben.                                                        */

  var THEMA = {
    exekution: { kw: 'exekution', wort: 'Hinrichtung' },
    konter:    { kw: 'konter',    wort: 'Konter' },
    shield:    { kw: 'schild',    wort: 'Schild' },
    heal:      { kw: 'heilung',   wort: 'Heilung' },
    tempo:     { kw: 'tempo',     wort: 'Tempo' },
    flaeche:   { kw: 'flaeche',   wort: 'Fläche' }
  };
  var STATUS_WORT = { gift: 'Gift', brand: 'Brand', verderbnis: 'Verderbnis',
                      frost: 'Frost', donner: 'Donner' };

  function themaKw(t) { return t.kind === 'status' ? t.statusKey : THEMA[t.kind].kw; }
  function themaWort(t) {
    return t.kind === 'status' ? (STATUS_WORT[t.statusKey] || t.statusKey) : THEMA[t.kind].wort;
  }

  /* Der Ausbruch ist die eine Stelle, an der ein Thema „losgeht". Auftakt,
     Manöverzähler und Voraussetzung zünden denselben Effekt — sie unterscheiden
     sich nur darin, WANN. Ohne diese eine Stelle stünde jede Wirkung vier Mal
     leicht anders im Code und driftete beim ersten Balance-Durchlauf auseinander. */
  function ausbruch(c, t, staerke) {
    var f = c.foes(), ziel = c.target && f.indexOf(c.target) >= 0 ? c.target : f[0];
    if (t.kind === 'status') {
      f.forEach(function (x) { c.applyStatus(x, t.statusKey, Math.max(1, Math.round(2 * staerke))); });
    } else if (t.kind === 'exekution') {
      if (ziel) c.deal(ziel, c.self.atk * 0.9 * staerke * (ziel.hp < ziel.maxHp * 0.4 ? 2 : 1), 'Hinrichtung');
    } else if (t.kind === 'konter') {
      f.forEach(function (x) { c.deal(x, c.self.atk * 0.35 * staerke, 'Konter'); });
    } else if (t.kind === 'shield') {
      c.allies().forEach(function (a) { c.applyStatus(a, 'schild', Math.round(c.self.atk * 0.8 * staerke)); });
    } else if (t.kind === 'heal') {
      c.allies().forEach(function (a) { c.heal(a, a.maxHp * 0.08 * staerke, 'Heilung'); });
    } else if (t.kind === 'tempo') {
      /* Tempo als dauerhafter Aufschlag würde sich bei jedem Ausbruch selbst
         verstärken — deshalb ist der Ausbruch ein Nachsetzen, kein Bonus. */
      if (ziel) c.deal(ziel, c.self.atk * 0.75 * staerke, 'Nachsetzen');
    } else if (t.kind === 'flaeche') {
      f.forEach(function (x) { c.deal(x, c.self.atk * 0.4 * staerke, 'Fläche'); });
    }
  }
  function ausbruchText(t) {
    if (t.kind === 'status') return '2 ' + themaWort(t) + ' auf alle Gegner';
    if (t.kind === 'exekution') return 'ein Hinrichtungsschlag (doppelt unter 40 % Leben)';
    if (t.kind === 'konter') return 'Konterschaden auf alle Gegner';
    if (t.kind === 'shield') return 'Schild für den ganzen Trupp';
    if (t.kind === 'heal') return 'Heilung für den ganzen Trupp';
    if (t.kind === 'tempo') return 'ein sofortiges Nachsetzen';
    return 'Flächenschaden auf alle Gegner';
  }

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

  var LINIEN_TITEL = {
    ang: ['Auftakt', 'Schwungmasse', 'Gleichschritt', 'Glaskanone'],
    mec: ['Zündung', 'Rückstoß', 'Verstärkerkette', 'Einseitigkeit'],
    unt: ['Schlachtruf', 'Inspiration', 'Wahlverwandtschaft', 'Geteiltes Los'],
    def: ['Bollwerk', 'Standhaft', 'Rückendeckung', 'Unbeugsam']
  };
  function lineName(unitId, kat, n) {
    return (LINE_UNIT_NAME[unitId] || unitId) + ': ' + LINIEN_TITEL[kat][n - 1];
  }

  /* ---- Angriff: der eigene Schlag ---------------------------------------- */
  function angPassive(unitId, stage) {
    var t = LINE_THEME[unitId], id = lineId(unitId, 'ang', stage), kw = themaKw(t);
    var nm = lineName(unitId, 'ang', stage);

    if (stage === 1) {
      return passiv(id, nm, 'onHit', [], [kw],
        'Der erste Schlag des Kampfes trifft 70 % härter und löst ' + ausbruchText(t) + ' aus.',
        function (c) {
          if (c.self._auftakt) return;
          c.self._auftakt = 1;
          c.dmg *= 1.7;
          ausbruch(c, t, 0.4);
        });
    }
    if (stage === 2) {
      return passiv(id, nm, 'onHit', [], [kw],
        'Jeder Angriff sammelt Schwung. Der dritte schlägt mit 190 % durch und löst ' +
        ausbruchText(t) + ' aus.',
        function (c) {
          if (!zaehler(c.self, id, 3)) return;
          c.dmg *= 1.9;
          ausbruch(c, t, 0.35);
        });
    }
    if (stage === 3) {
      return passiv(id, nm, 'onHit', [], [kw],
        'Führt ein Verbündeter ' + themaWort(t) + ', schlägst du 18 % härter — sonst nur 5 %.',
        function (c) { c.dmg *= truppFuehrt(c, kw) ? 1.18 : 1.05; });
    }
    return passiv(id, nm, 'onStart', [], [kw],
      '35 % mehr Angriff, dafür bleiben von deiner Rüstung noch 40 %.',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 1.35);
        c.self.def = Math.round(c.self.def * 0.4);
      });
  }

  /* ---- Mechanik: der Themeneffekt selbst --------------------------------- */
  function mecPassive(unitId, stage) {
    var t = LINE_THEME[unitId], id = lineId(unitId, 'mec', stage), kw = themaKw(t);
    var nm = lineName(unitId, 'mec', stage);

    if (stage === 1) {
      return passiv(id, nm, 'onStart', [kw], [],
        'Zu Kampfbeginn sofort ' + ausbruchText(t) + '.',
        function (c) { ausbruch(c, t, 0.7); });
    }
    if (stage === 2) {
      return passiv(id, nm, 'onDamaged', [kw], [],
        'Jeder erlittene Treffer lädt nach. Der dritte zündet ' + ausbruchText(t) + '.',
        function (c) { if (zaehler(c.self, id, 3)) ausbruch(c, t, 0.9); });
    }
    if (stage === 3) {
      return passiv(id, nm, 'onTurnStart', [kw], [],
        'Zu Beginn deines Zuges ' + ausbruchText(t) + ' — halb so stark, wenn niemand im Trupp ' +
        themaWort(t) + ' führt.',
        function (c) { ausbruch(c, t, truppFuehrt(c, kw) ? 0.3 : 0.2); });
    }
    return passiv(id, nm, 'onStart', [kw], [kw],
      'Jeder Abschuss zündet ' + ausbruchText(t) + ' — dafür schlägst du selbst ein Viertel schwächer.',
      function (c) {
        c.self.atk = Math.round(c.self.atk * 0.75);
        c.addEffect(c.self, { hook: 'onKill', name: nm, fn: function (k) { ausbruch(k, t, 1); } });
      });
  }

  /* ---- Unterstützung: der Trupp ------------------------------------------ */
  function untPassive(unitId, stage) {
    var t = LINE_THEME[unitId], id = lineId(unitId, 'unt', stage), kw = themaKw(t);
    var nm = lineName(unitId, 'unt', stage);

    if (stage === 1) {
      return passiv(id, nm, 'onStart', [kw], [],
        'Zu Kampfbeginn 8 % Angriff für den ganzen Trupp und ' + ausbruchText(t) + '.',
        function (c) {
          c.allies().forEach(function (a) { a.atk = Math.round(a.atk * 1.08); });
          ausbruch(c, t, 0.35);
        });
    }
    if (stage === 2) {
      return passiv(id, nm, 'onDamaged', [kw], [],
        'Jeder Treffer auf den Trupp sammelt Inspiration. Der vierte zündet ' + ausbruchText(t) + '.',
        function (c) {
          /* Der Zähler steht auf DIESER Einheit, obwohl der Effekt an allen
             Verbündeten hängt — sonst hätte jeder seinen eigenen Vorrat und
             der Ausbruch käme vier Mal so oft. */
          if (zaehler(c.self, id, 4)) ausbruch(c, t, 0.7);
        });
    }
    if (stage === 3) {
      return passiv(id, nm, 'onStart', [kw], [kw],
        'Führt ein Verbündeter ' + themaWort(t) + ', bekommt der Trupp 10 % Angriff und 6 % Rüstung — sonst je 3 %.',
        function (c) {
          var passt = truppFuehrt(c, kw);
          c.allies().forEach(function (a) {
            a.atk = Math.round(a.atk * (passt ? 1.1 : 1.03));
            a.def = Math.round(a.def * (passt ? 1.06 : 1.03));
          });
        });
    }
    return passiv(id, nm, 'onStart', [kw], [],
      'Die Verbündeten schlagen 22 % härter — du selbst nur noch mit einem Drittel.',
      function (c) {
        var andere = c.allies().filter(function (a) { return a !== c.self; });
        /* Ohne Verbündete wäre der Keystone reiner Verlust — ein Preis ohne
           Gegenleistung ist keine Entscheidung, sondern eine Falle. */
        if (!andere.length) return;
        andere.forEach(function (a) { a.atk = Math.round(a.atk * 1.22); });
        c.self.atk = Math.round(c.self.atk * 0.35);
      });
  }

  /* ---- Defensive: das Überleben ------------------------------------------ */
  function defPassive(unitId, stage) {
    var t = LINE_THEME[unitId], id = lineId(unitId, 'def', stage), kw = themaKw(t);
    var nm = lineName(unitId, 'def', stage);

    if (stage === 1) {
      return passiv(id, nm, 'onStart', ['schild'], [],
        'Beginnt den Kampf mit einem Schild über 25 % des eigenen Lebens.',
        function (c) { c.applyStatus(c.self, 'schild', Math.round(c.self.maxHp * 0.25)); });
    }
    if (stage === 2) {
      return passiv(id, nm, 'onDamaged', [], [kw],
        'Jeder dritte erlittene Treffer heilt 8 % Leben und löst ' + ausbruchText(t) + ' aus.',
        function (c) {
          if (!zaehler(c.self, id, 3)) return;
          c.heal(c.self, c.self.maxHp * 0.08, 'Standhaft');
          ausbruch(c, t, 0.35);
        });
    }
    if (stage === 3) {
      return passiv(id, nm, 'onStart', [], [kw],
        'Führt ein Verbündeter ' + themaWort(t) + ', kostet dich kein Treffer mehr als 17 % deines Lebens — sonst 22 %.',
        function (c) {
          var d = truppFuehrt(c, kw) ? 0.17 : 0.22;
          c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, d);
        });
    }
    /* Untote stehen wieder auf — das ist ihr Keystone, mit demselben Preis:
       eine Regel gewonnen, eine verloren. */
    if (t.defRevive) {
      return passiv(id, nm, 'onDeath', ['heilung'], [],
        'Steht einmal je Kampf mit 45 % Leben wieder auf und ' + ausbruchText(t) +
        ' — danach heilt dich nichts mehr.',
        function (c) {
          if (c.self._auf) return;
          c.self._auf = 1;
          c.self.hp = Math.round(c.self.maxHp * 0.45);
          c.self.heilfaktor = -1;
          ausbruch(c, t, 1);
          c.log.push({ t: 0, type: 'revive', key: c.self.key, unit: c.self.name,
                       side: c.self.side, hp: c.self.hp });
        });
    }
    return passiv(id, nm, 'onStart', [], [],
      'Kein Treffer kostet dich mehr als 16 % deines Lebens — dafür heilt dich nichts mehr.',
      function (c) {
        c.self.schadensdeckel = Math.min(c.self.schadensdeckel || 1, 0.155);
        c.self.heilfaktor = -1;
        c.self.regen = 0;
        c.self.lifesteal = 0;
      });
  }

  var LINE_PASSIVES = [];
  LINE_UNITS.forEach(function (unitId) {
    for (var s = 1; s <= 4; s++) {
      LINE_PASSIVES.push(angPassive(unitId, s));
      LINE_PASSIVES.push(mecPassive(unitId, s));
      LINE_PASSIVES.push(untPassive(unitId, s));
      LINE_PASSIVES.push(defPassive(unitId, s));
    }
  });
  passives = passives.concat(LINE_PASSIVES);

  /* Vier Linien à vier Stufen. Die Stufe entspricht dem Rang: bei der Anwerbung
     Stufe 1, dann je Aufstieg die nächste. Wer hier nicht steht, bekommt weiter
     die drei festen Passiven aus data.js. */
  var linien = {
    shion: {
      angriff: ['shion_ang1', 'shion_ang2', 'shion_ang3', 'shion_ang4', 'shion_ang5'],
      mechanik: ['shion_mec1', 'shion_mec2', 'shion_mec3', 'shion_mec4', 'shion_mec5'],
      unterstuetzung: ['shion_unt1', 'shion_unt2', 'shion_unt3', 'shion_unt4', 'shion_unt5'],
      defensive: ['shion_def1', 'shion_def2', 'shion_def3', 'shion_def4', 'shion_def5']
    },
    /* Rimuru und Adalmann standen im Generator, bis ihre Kits eigene Linien
       verlangten: Rimuru liest fremde Zustände statt eigene anzulegen, und der
       Priester in Adalmann führt Licht neben der Totenmagie. */
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

  /* Restliche 20 Einheiten bekommen das ID-Muster für Linien (TODO.md). */
  [
    'rimuru',
    'zegion', 'apito', 'riesenameise', 'kaefergarde', 'giftfalter',
    'diablo', 'testarossa', 'ultima', 'carrera', 'daemonengarde',
    'veldora', 'milim', 'drachenwelpe', 'windrache',
    'wightkoenig', 'skelettritter', 'gruftwaechter', 'seelenhexe'
  ].forEach(function (unitId) {
    linien[unitId] = {
      angriff: [unitId + '_ang1', unitId + '_ang2', unitId + '_ang3', unitId + '_ang4'],
      mechanik: [unitId + '_mec1', unitId + '_mec2', unitId + '_mec3', unitId + '_mec4'],
      unterstuetzung: [unitId + '_unt1', unitId + '_unt2', unitId + '_unt3', unitId + '_unt4'],
      defensive: [unitId + '_def1', unitId + '_def2', unitId + '_def3', unitId + '_def4']
    };
  });
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
    aktiv('sig_schattenwolf', 'Schattenbiss', 3, ['schatten', 'dunkelheit'],
      '120 % Schaden, legt 2 Dunkelheit auf das Ziel und hüllt sich selbst in 2 Schatten. ' +
      'Gegen ein bereits verdunkeltes Ziel sind es 190 %.',
      function (c) {
        c.attack(c.target.status.dunkelheit > 0 ? 1.9 : 1.2);
        c.applyStatus(c.target, 'dunkelheit', 2);
        c.applyStatus(c.self, 'schatten', 2);
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
    lineUnitsGeneriert: LINE_UNITS.slice(), lineTheme: LINE_THEME,
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
