/* js/data.js — Einheiten, Relikte, Ausrüstung.
   Keine Arten-Synergien mehr: pro Art darf nur eine Einheit im Trupp stehen.
   Die Kombos entstehen zwischen Fähigkeiten (siehe js/abilities.js).

   Einheit:  tags = [Art, Rolle]  ·  signature = eine einzigartige aktive
             Fähigkeit  ·  passives = drei, die mit Rang B/A/S freischalten.  */
'use strict';
(function (root) {

  function eff(hook, name, fn) { return { hook: hook, name: name, fn: fn }; }
  function chance(p, fn) { return function (c) { if (c.rng() < p) fn(c); }; }
  function inflict(status, stacks) {
    return function (c) { if (c.target) c.applyStatus(c.target, status, stacks); };
  }
  function buff(u, s) {
    if (s.hp) { u.maxHp += s.hp; u.hp += s.hp; }
    if (s.atk) u.atk += s.atk;
    if (s.def) u.def += s.def;
    if (s.spd) u.spd += s.spd;
  }
  function scale(u, s) {
    if (s.hp) { var add = Math.round(u.maxHp * s.hp); u.maxHp += add; u.hp += add; }
    if (s.atk) u.atk = Math.round(u.atk * (1 + s.atk));
    if (s.def) u.def = Math.round(u.def * (1 + s.def));
    if (s.spd) u.spd = Math.round(u.spd * (1 + s.spd));
  }

  var ARTEN = ['slime', 'goblin', 'oger', 'direwolf', 'echsenmensch', 'insektoid',
    'daemon', 'drache', 'untot'];
  var ART_NAME = {
    slime: 'Slime', goblin: 'Goblin', oger: 'Oger', direwolf: 'Sturmwolf',
    echsenmensch: 'Echsenmensch', insektoid: 'Insektoid', daemon: 'Dämon',
    drache: 'Drache', untot: 'Untot', bestie: 'Bestie', ork: 'Ork', mensch: 'Mensch'
  };
  var ROLLE_NAME = {
    front: 'Frontlinie', fernkampf: 'Fernkampf', magier: 'Magier',
    unterstuetzer: 'Unterstützer', verstaerker: 'Verstärker'
  };

  /* ---- Glossar: Quelle für alle Tooltips und den Menü-Eintrag -------------
     Jede Spielmechanik wird genau hier erklärt, nicht in der UI verstreut.   */

  var GLOSSAR = {
    arten: {
      slime: 'Rimurus Art. Formlos, lernt durch Verschlingen — der einzige Held, der nie den Trupp verlässt.',
      goblin: 'Schwach geboren, billig zu haben, wächst über seine Fähigkeiten hinaus.',
      oger: 'Kriegervolk aus dem Jura-Wald. Hoher Schaden, wird im Verlauf eines Kampfes stärker.',
      direwolf: 'Sturmwölfe. Schnellste Züge im Spiel, dafür dünnes Fell.',
      echsenmensch: 'Sumpfbewohner. Zäh, regeneriert, hält die Front über lange Kämpfe.',
      insektoid: 'Schwarmwesen. Gift und Konterschaden statt roher Kraft.',
      daemon: 'Urdämonen. Teuer, brechen Rüstung, tragen Verderbnis.',
      drache: 'Selten und roh stark. Kaum Fähigkeiten nötig — die Werte reichen.',
      untot: 'Kommen zurück. Wiederkehr und Lebensraub statt Ausweichen.'
    },
    /* Die Rolle steuert die Zielwahl im Kampf — die einzige taktische Ansage,
       die der Spieler über die Aufstellung noch trifft. */
    rollen: {
      front: 'Greift die vorderste gegnerische Einheit an. Steht selbst vorn und wird zuerst getroffen.',
      fernkampf: 'Greift die HINTERSTE gegnerische Einheit an — geht an der Front vorbei auf Magier und Heiler.',
      magier: 'Greift das Ziel mit dem WENIGSTEN Leben an und ignoriert 60 % der Rüstung. Exekutiert Angeschlagene.',
      unterstuetzer: 'Heilt den am stärksten verwundeten Verbündeten, statt anzugreifen — außer eine aktive Fähigkeit ist bereit.',
      verstaerker: 'Kämpft normal, bringt seine Stärke über Fähigkeiten ins Team statt über die Zielwahl.'
    },
    zustaende: {
      gift: 'Verursacht 2 Schaden je Stapel, jedes Mal wenn das Ziel am Zug ist, und baut sich dabei um 1 ab. Geht durch Schilde. Höchstens 12 Stapel.',
      brand: 'Verursacht 2 Schaden je Stapel pro Zug des Ziels und HALBIERT jede Heilung an ihm. Baut sich um 1 pro Zug ab. Höchstens 8 Stapel.',
      erstarrung: 'Das Ziel setzt seinen nächsten Zug komplett aus. Höchstens 2 Stapel — mehr wäre eine Dauersperre. Bosse schütteln Erstarrung zu 60 % ab.',
      verderbnis: 'Der Fluch: das Ziel erleidet +10 % Schaden je Stapel, aus jeder Quelle. Baut sich um 1 pro Zug ab. Höchstens 5 Stapel (also +50 %).',
      schild: 'Fängt Schaden ab, bevor Leben verloren geht, und baut sich NICHT von selbst ab. Gift und Brand gehen hindurch.'
    },
    keywords: {
      gift: 'Schaden über Zeit, der sich stapelt. Stark gegen Gegner mit viel Leben und Rüstung.',
      brand: 'Schaden über Zeit plus halbierte Heilung. Die Antwort auf Gegner, die sich selbst hochheilen.',
      frost: 'Erstarrung: geraubte Züge. Stark gegen Gruppen und Elite — Bosse widerstehen ihr allerdings meistens.',
      verderbnis: 'Erhöht allen Schaden am Ziel. Wirkt als Verstärker für jeden anderen Build.',
      schild: 'Vorgezogene Lebenspunkte. Hält die Front so lange, bis der Schaden durchkommt.',
      heilung: 'Regeneration, Lebensraub und Wiederbelebung. Gewinnt lange Kämpfe.',
      konter: 'Schaden zurück an den Angreifer. Skaliert mit der Zahl der Treffer, die man einsteckt.',
      exekution: 'Quellen sind Fähigkeiten, die gezielt auf schwache Ziele gehen; Verstärker schlagen extra hart gegen Angeschlagene zu. Zusammen räumen sie ab, sobald der erste Gegner wackelt.',
      flaeche: 'Trifft mehrere Gegner gleichzeitig. Stark gegen Gruppen, schwach gegen Bosse.',
      tempo: 'Mehr Züge. Jeder zusätzliche Zug ist ein zusätzlicher Angriff und eine schnellere Abklingzeit.'
    },
    raritaeten: {
      1: 'Üblich. Grundsolide Werte ohne Eigenheit — das Rückgrat der ersten Akte.',
      2: 'Ungewöhnlich. Ein klarer Effekt, der schon einen Build tragen kann.',
      3: 'Selten. Deutlich stärker oder mit einer Bedingung, die man erfüllen muss.',
      4: 'Episch. Verändert, wie der Trupp kämpft. Ab Akt 2 spürbar häufiger im Angebot.',
      5: 'Legendär. Run-definierend und entsprechend selten — am ehesten bei Elite, Boss und hohem Rang.'
    },
    begriffe: {
      gold: 'Wird beim Händler ausgegeben: Einheiten, Ausrüstung, gelegentlich ein Relikt. Kämpfe und Ereignisse bringen Gold.',
      magicule: 'Die Währung der Ränge. Nur damit steigen Einheiten von C auf B, A und S auf.',
      leben: 'Verlorene Kämpfe. Beim dritten verlorenen Kampf endet der Run — der Kampf selbst kostet keine dauerhaften Werte.',
      rang: 'C → B → A → S. Jeder Aufstieg gibt +30 % Leben und Angriff, einen Item-Slot (S: zwei), eine aktive Fähigkeit zur Wahl, die nächste eigene Passive und einen Prädator-Slot.',
      signatur: 'Die einzigartige aktive Fähigkeit dieser Einheit. Gibt es bei keiner anderen und ist nie im Aufstiegs-Angebot.',
      aktiv: 'Feuert im Kampf, sobald die Abklingzeit abgelaufen ist, und ERSETZT in dem Zug den normalen Angriff. Sind mehrere bereit, wird die mit der längsten Abklingzeit gewählt.',
      passiv: 'Wirkt dauerhaft im Hintergrund, ohne Abklingzeit. Schaltet mit dem Rang frei.',
      abklingzeit: 'Zahl der eigenen Züge, die zwischen zwei Einsätzen dieser Fähigkeit liegen müssen.',
      praedator: 'Nach jedem gewonnenen Kampf darf ein besiegter Gegner verschlungen werden: seine Fähigkeit wandert dauerhaft in eine Einheit. Slots gibt es erst ab Rang B.',
      itemslot: 'Wie viele Ausrüstungsstücke diese Einheit tragen kann. Hängt am Rang: C 1, B 2, A 3, S 5.',
      quelle: 'Eine Fähigkeit, die diesen Zustand erzeugt.',
      verstaerker: 'Eine Fähigkeit, die diesen Zustand ausnutzt — mehr Schaden gegen Ziele, die ihn tragen.',
      art: 'Volk der Einheit. Gibt KEINE Boni: Arten regeln nur, dass von jeder genau eine Einheit im Trupp stehen darf.',
      rolle: 'Bestimmt, wen die Einheit im Kampf angreift.',
      aufstellung: 'Die Reihenfolge ist die Frontlinie: vorn steht, wer von gegnerischen Nahkämpfern zuerst getroffen wird.',
      bank: 'Abgestellte Einheiten. Sie kämpfen nicht, belegen ihre Art aber weiterhin.',
      raritaet: 'Üblich → ungewöhnlich → selten → episch → legendär. Die Stufe steuert nicht nur die Farbe, sondern wie wahrscheinlich etwas überhaupt angeboten wird: In Akt 1 dominiert Übliches, in Akt 3 tauchen Episches und Legendäres deutlich öfter auf. Elite- und Bosskämpfe würfeln eine Stufe besser, und je höher der Rang einer Einheit, desto besser das Angebot beim Aufstieg.'
    }
  };

  function u(id, name, art, rolle, cost, hp, atk, def, spd, sig, passives, extra) {
    var d = {
      id: id, name: name, art: art, tags: [art, rolle], cost: cost,
      hp: hp, atk: atk, def: def, spd: spd,
      signature: sig, passives: passives
    };
    if (extra) for (var k in extra) d[k] = extra[k];
    return d;
  }

  /* ---- Einheiten: eine je Art im Trupp, also zählt jede für sich ---------- */

  var units = [
    u('rimuru', 'Rimuru', 'slime', 'magier', 0, 100, 16, 4, 28,
      'sig_rimuru', ['panzerbrecher', 'zaeh', 'kettenschlag'], { hero: true }),

    u('gobta', 'Gobta', 'goblin', 'front', 1, 65, 8, 3, 24,
      'sig_gobta', ['zaeh', 'windschritt', 'konterstoss']),
    u('gobkyu', 'Gobkyu', 'goblin', 'fernkampf', 1, 50, 11, 1, 28,
      'sig_gobkyu', ['erstschlag', 'windschritt', 'henkersblick']),
    u('rigurd', 'Rigurd', 'goblin', 'front', 2, 100, 10, 5, 18,
      'sig_rigurd', ['schildwall', 'bannerherz', 'kriegsherz']),
    u('rigur', 'Rigur', 'goblin', 'verstaerker', 2, 75, 13, 3, 26,
      'sig_rigur', ['rachegeist', 'konterstoss', 'kriegsherz']),
    u('gobwa', 'Gobwa', 'goblin', 'unterstuetzer', 2, 70, 9, 2, 25,
      'sig_gobwa', ['quelle', 'seelenband', 'regenerator']),

    u('benimaru', 'Benimaru', 'oger', 'verstaerker', 4, 120, 22, 5, 28,
      'sig_benimaru', ['aschehaut', 'glutkern', 'kriegsherz']),
    u('shion', 'Shion', 'oger', 'front', 3, 130, 18, 6, 16,
      'sig_shion', ['zaeh', 'kriegsherz', 'konterstoss']),
    u('souei', 'Souei', 'oger', 'fernkampf', 3, 80, 19, 2, 34,
      'sig_souei', ['windschritt', 'erstschlag', 'henkersblick']),
    u('shuna', 'Shuna', 'oger', 'unterstuetzer', 3, 85, 14, 3, 26,
      'sig_shuna', ['bannerherz', 'seelenband', 'quelle']),
    u('hakuro', 'Hakuro', 'oger', 'front', 4, 110, 21, 6, 30,
      'sig_hakuro', ['panzerbrecher', 'erstschlag', 'scharfrichter']),
    u('kurobe', 'Kurobe', 'oger', 'verstaerker', 2, 90, 13, 4, 22,
      'sig_kurobe', ['kriegsherz', 'schildwall', 'rachegeist']),

    u('ranga', 'Ranga', 'direwolf', 'fernkampf', 3, 85, 17, 3, 36,
      'sig_ranga', ['windschritt', 'jagdruf', 'erstschlag']),
    u('sturmwolf', 'Sturmwolf', 'direwolf', 'front', 1, 60, 9, 2, 30,
      'sig_sturmwolf', ['henkersblick', 'scharfrichter', 'windschritt']),
    u('schattenwolf', 'Schattenwolf', 'direwolf', 'magier', 2, 60, 14, 1, 30,
      'sig_schattenwolf', ['frostschneide', 'frostkern', 'windschritt']),
    u('rudelalpha', 'Rudelalpha', 'direwolf', 'verstaerker', 3, 100, 15, 4, 28,
      'sig_rudelalpha', ['jagdruf', 'kriegsherz', 'rachegeist']),

    u('gabiru', 'Gabiru', 'echsenmensch', 'front', 3, 120, 16, 6, 22,
      'sig_gabiru', ['kriegsherz', 'zaeh', 'kettenschlag']),
    u('souka', 'Souka', 'echsenmensch', 'fernkampf', 2, 70, 13, 2, 30,
      'sig_souka', ['windschritt', 'henkersblick', 'erstschlag']),
    u('echsenfuerst', 'Echsenfürst', 'echsenmensch', 'front', 4, 145, 18, 8, 18,
      'sig_echsenfuerst', ['regenerator', 'schildwall', 'zaeh']),
    u('drachenknecht', 'Drachenknecht', 'echsenmensch', 'verstaerker', 2, 85, 12, 4, 24,
      'sig_drachenknecht', ['dornenhaut', 'konterstoss', 'kriegsherz']),
    u('quellenpriesterin', 'Quellenpriesterin', 'echsenmensch', 'unterstuetzer', 2, 75, 11, 3, 26,
      'sig_quellenpriesterin', ['quelle', 'regenerator', 'seelenband']),

    u('zegion', 'Zegion', 'insektoid', 'front', 5, 150, 26, 8, 30,
      'sig_zegion', ['konterstoss', 'dornenhaut', 'panzerbrecher']),
    u('apito', 'Apito', 'insektoid', 'fernkampf', 4, 90, 21, 3, 34,
      'sig_apito', ['giftzahn', 'giftbrut', 'windschritt']),
    u('riesenameise', 'Riesenameise', 'insektoid', 'front', 1, 70, 7, 4, 20,
      'sig_riesenameise', ['schildwall', 'dornenhaut', 'zaeh']),
    u('kaefergarde', 'Käfergarde', 'insektoid', 'front', 2, 95, 11, 6, 20,
      'sig_kaefergarde', ['schildwall', 'dornenhaut', 'kriegsherz']),
    u('giftfalter', 'Giftfalter', 'insektoid', 'magier', 2, 55, 15, 1, 28,
      'sig_giftfalter', ['giftzahn', 'giftbrut', 'kettenschlag']),

    u('diablo', 'Diablo', 'daemon', 'magier', 5, 110, 30, 4, 32,
      'sig_diablo', ['fluchweber', 'verderber', 'panzerbrecher']),
    u('testarossa', 'Testarossa', 'daemon', 'magier', 4, 95, 24, 3, 30,
      'sig_testarossa', ['henkersblick', 'scharfrichter', 'panzerbrecher']),
    u('ultima', 'Ultima', 'daemon', 'fernkampf', 4, 90, 23, 3, 32,
      'sig_ultima', ['fluchweber', 'giftbrut', 'verderber']),
    u('carrera', 'Carrera', 'daemon', 'verstaerker', 4, 105, 22, 4, 28,
      'sig_carrera', ['aschehaut', 'glutkern', 'kettenschlag']),
    u('daemonengarde', 'Dämonengarde', 'daemon', 'front', 2, 90, 13, 5, 24,
      'sig_daemonengarde', ['panzerbrecher', 'kriegsherz', 'dornenhaut']),

    u('veldora', 'Veldora', 'drache', 'magier', 5, 140, 32, 6, 28,
      'sig_veldora', ['kettenschlag', 'kriegsherz', 'panzerbrecher']),
    u('milim', 'Milim', 'drache', 'verstaerker', 5, 145, 34, 6, 34,
      'sig_milim', ['erstschlag', 'panzerbrecher', 'kriegsherz']),
    u('drachenwelpe', 'Drachenwelpe', 'drache', 'front', 3, 110, 16, 6, 22,
      'sig_drachenwelpe', ['aschehaut', 'glutkern', 'zaeh']),
    u('windrache', 'Windrache', 'drache', 'fernkampf', 4, 100, 22, 4, 32,
      'sig_windrache', ['windschritt', 'kettenschlag', 'erstschlag']),

    u('adalmann', 'Adalmann', 'untot', 'magier', 4, 100, 22, 4, 26,
      'sig_adalmann', ['fluchweber', 'verderber', 'wiederkehr']),
    u('wightkoenig', 'Wight-König', 'untot', 'front', 3, 115, 15, 6, 20,
      'sig_wightkoenig', ['lebensraub', 'wiederkehr', 'kriegsherz']),
    u('skelettritter', 'Skelettritter', 'untot', 'front', 1, 65, 8, 4, 22,
      'sig_skelettritter', ['wiederkehr', 'dornenhaut', 'erstschlag']),
    u('gruftwaechter', 'Gruftwächter', 'untot', 'verstaerker', 2, 85, 12, 4, 22,
      'sig_gruftwaechter', ['schildwall', 'wiederkehr', 'bannerherz']),
    u('seelenhexe', 'Seelenhexe', 'untot', 'unterstuetzer', 3, 80, 14, 2, 28,
      'sig_seelenhexe', ['seelenband', 'quelle', 'wiederkehr'])
  ];

  /* ---- Relikte: greifen an Schlüsselwörtern, Rollen und Rängen an --------- */

  /* kw = was das Relikt erzeugt, amp = was es verstärkt. Ohne diese Angabe
     taucht der halbe Build in der Synergie-Anzeige gar nicht auf. */
  function relic(id, name, rar, text, apply, kw, amp) {
    return { id: id, name: name, rarity: rar, text: text, apply: apply,
             keywords: kw || [], amplifies: amp || [] };
  }
  function jeder(fn) { return function (m) { m.forEach(fn); }; }
  /* Zählt, wie oft ein Schlüsselwort im Trupp vorkommt — daran hängen die
     Relikte, die einen Build belohnen statt eines Volkes. */
  function zaehle(m, kw) {
    var n = 0;
    m.forEach(function (unit) { (unit.keywords || []).forEach(function (k) { if (k === kw) n++; }); });
    return n;
  }
  function proKeyword(kw, prozent) {
    return function (m) {
      var n = zaehle(m, kw);
      if (n) m.forEach(function (unit) { scale(unit, { atk: n * prozent }); });
    };
  }
  function anhaengen(hook, name, fn) {
    return function (m, api) { m.forEach(function (unit) { api.addEffect(unit, eff(hook, name, fn)); }); };
  }

  var relics = [
    relic('kern_des_zorns', 'Kern des Zorns', 1, 'Alle Einheiten +12 % Angriff',
      jeder(function (x) { scale(x, { atk: 0.12 }); })),
    relic('schuppenpanzer', 'Schuppenpanzer', 1, 'Alle Einheiten +3 Rüstung',
      jeder(function (x) { buff(x, { def: 3 }); })),
    relic('lebensquell', 'Lebensquell', 1, 'Alle Einheiten +15 % Leben',
      jeder(function (x) { scale(x, { hp: 0.15 }); })),
    relic('windschuhe', 'Windschuhe', 1, 'Alle Einheiten +10 % Tempo',
      jeder(function (x) { scale(x, { spd: 0.1 }); })),

    relic('giftdorn', 'Giftdorn', 2, 'Jeder Treffer legt 1 Gift an',
      anhaengen('onHit', 'Giftdorn', function (c) { c.applyStatus(c.target, 'gift', 1); }), ['gift']),
    relic('gifttraeger', 'Giftträger', 3, '+30 % Schaden gegen vergiftete Ziele',
      anhaengen('onHit', 'Giftträger', function (c) { if (c.target.status.gift > 0) c.dmg *= 1.3; }), [], ['gift']),
    relic('brandmal', 'Brandmal', 2, '20 % Chance auf 2 Brand je Treffer',
      anhaengen('onHit', 'Brandmal', chance(0.2, inflict('brand', 2))), ['brand']),
    relic('aschewind', 'Aschewind', 3, '+40 % Schaden gegen brennende Ziele',
      anhaengen('onHit', 'Aschewind', function (c) { if (c.target.status.brand > 0) c.dmg *= 1.4; }), [], ['brand']),
    relic('frostsiegel', 'Frostsiegel', 2, '12 % Chance, das Ziel erstarren zu lassen',
      anhaengen('onHit', 'Frostsiegel', chance(0.12, inflict('erstarrung', 1))), ['frost']),
    relic('frostbrecher', 'Frostbrecher', 4, '+35 % Schaden gegen erstarrte Ziele',
      anhaengen('onHit', 'Frostbrecher', function (c) { if (c.target.status.erstarrung > 0) c.dmg *= 1.35; }), [], ['frost']),
    relic('verderbnismal', 'Verderbnismal', 3, 'Jeder Treffer legt 1 Verderbnis an',
      anhaengen('onHit', 'Verderbnismal', inflict('verderbnis', 1)), ['verderbnis']),
    relic('fluchspiegel', 'Fluchspiegel', 4, '+25 % Schaden gegen verderbte Ziele',
      anhaengen('onHit', 'Fluchspiegel', function (c) { if (c.target.status.verderbnis > 0) c.dmg *= 1.25; }), [], ['verderbnis']),

    relic('giftmeister', 'Zeichen der Brutmutter', 4, 'Je Gift-Fähigkeit im Trupp erhalten alle +7 % Angriff',
      proKeyword('gift', 0.07), [], ['gift']),
    relic('brandmeister', 'Zeichen der Flamme', 4, 'Je Brand-Fähigkeit im Trupp erhalten alle +7 % Angriff',
      proKeyword('brand', 0.07), [], ['brand']),
    relic('frostmeister', 'Zeichen des Frosts', 4, 'Je Frost-Fähigkeit im Trupp erhalten alle +8 % Angriff',
      proKeyword('frost', 0.08), [], ['frost']),
    relic('kontermeister', 'Zeichen der Dornen', 4, 'Je Konter-Fähigkeit im Trupp erhalten alle +8 % Angriff',
      proKeyword('konter', 0.08), [], ['konter']),
    relic('heilmeister', 'Zeichen der Quelle', 4, 'Je Heilungs-Fähigkeit im Trupp erhalten alle +6 % Leben',
      function (m) {
        var n = zaehle(m, 'heilung');
        if (n) m.forEach(function (x) { scale(x, { hp: n * 0.06 }); });
      }),

    relic('barriere_stein', 'Barrierestein', 2, 'Alle starten mit Schild 25',
      anhaengen('onStart', 'Barriere', function (c) { c.applyStatus(c.self, 'schild', 25); }), ['schild']),
    relic('blutkelch', 'Blutkelch', 3, 'Alle heilen 15 % des verursachten Schadens',
      jeder(function (x) { x.lifesteal += 0.15; }), ['heilung']),
    relic('heilsegen', 'Heilsegen', 2, 'Alle Einheiten +4 Regeneration',
      jeder(function (x) { x.regen += 4; }), ['heilung']),
    relic('dornenhaut_relikt', 'Dornenkranz', 2, 'Angreifer erleiden 8 Schaden zurück',
      anhaengen('onDamaged', 'Dornen', function (c) { var f = c.foes()[0]; if (f) c.deal(f, 8, 'Dornen'); }), ['konter']),
    relic('rachegeist_relikt', 'Rachegeist', 2, 'Stirbt ein Verbündeter: alle +4 Angriff',
      anhaengen('onAllyDeath', 'Rachegeist', function (c) { c.self.atk += 4; })),
    relic('letzter_wille', 'Letzter Wille', 3, 'Stirbt ein Verbündeter: alle heilen 25 Leben',
      anhaengen('onAllyDeath', 'Letzter Wille', function (c) { c.heal(c.self, 25, 'Letzter Wille'); }), ['heilung']),
    relic('erstschlag_relikt', 'Erstschlagsstein', 2, 'Der erste Angriff jeder Einheit verursacht +80 % Schaden',
      anhaengen('onHit', 'Erstschlag', function (c) {
        if (!c.self._esr) { c.self._esr = 1; c.dmg *= 1.8; }
      })),
    relic('scharfrichter_relikt', 'Scharfrichterbeil', 4, 'Doppelter Schaden gegen Ziele unter 30 % Leben',
      anhaengen('onHit', 'Scharfrichter', function (c) {
        if (c.target.hp < c.target.maxHp * 0.3) c.dmg *= 2;
      }), [], ['exekution']),

    relic('turmschild', 'Turmschild', 2, 'Frontlinie +30 % Leben',
      jeder(function (x) { if (x.role === 'front') scale(x, { hp: 0.3 }); })),
    relic('magiestein', 'Magiestein', 2, 'Magier und Fernkämpfer +20 % Angriff',
      jeder(function (x) { if (x.role === 'magier' || x.role === 'fernkampf') scale(x, { atk: 0.2 }); })),
    relic('taktstock', 'Taktstock', 2, 'Unterstützer und Verstärker +25 % Angriff und Tempo',
      jeder(function (x) {
        if (x.role === 'unterstuetzer' || x.role === 'verstaerker') scale(x, { atk: 0.25, spd: 0.25 });
      })),

    relic('namenlose_macht', 'Namenlose Macht', 4, 'Einheiten ab Rang A: +30 % Angriff',
      jeder(function (x) { if ((x.rank || 0) >= 2) scale(x, { atk: 0.3 }); })),
    relic('siegel_des_aufstiegs', 'Siegel des Aufstiegs', 3, 'Je Rangstufe im Trupp erhalten alle +4 % Leben',
      function (m) {
        var n = 0;
        m.forEach(function (x) { n += x.rank || 0; });
        if (n) m.forEach(function (x) { scale(x, { hp: n * 0.04 }); });
      }),
    relic('praedator_zahn', 'Prädatorzahn', 5, 'Rimuru erhält +50 % Angriff und Leben',
      jeder(function (x) { if (x.id === 'rimuru') scale(x, { hp: 0.5, atk: 0.5 }); })),
    relic('kleines_team', 'Einsamer Pfad', 5, 'Bei höchstens 3 Einheiten: +45 % auf alle Werte',
      function (m) {
        if (m.length <= 3) m.forEach(function (x) { scale(x, { hp: 0.45, atk: 0.45, def: 0.45, spd: 0.45 }); });
      }),
    relic('grosses_team', 'Heerschar', 4, 'Ab 6 Einheiten: +25 % Angriff und Leben',
      function (m) {
        if (m.length >= 6) m.forEach(function (x) { scale(x, { hp: 0.25, atk: 0.25 }); });
      }),
    relic('anfuehrerkrone', 'Anführerkrone', 5, 'Die vorderste Einheit erhält +60 % auf alle Werte',
      function (m) { if (m[0]) scale(m[0], { hp: 0.6, atk: 0.6, def: 0.6, spd: 0.6 }); }),
    relic('sturmauge', 'Sturmauge', 3, 'Einheiten über 30 Tempo erhalten +25 % Angriff',
      jeder(function (x) { if (x.spd > 30) scale(x, { atk: 0.25 }); })),
    relic('schwerer_stand', 'Schwerer Stand', 2, 'Einheiten unter 22 Tempo: +35 % Leben, +4 Rüstung',
      jeder(function (x) { if (x.spd < 22) { scale(x, { hp: 0.35 }); buff(x, { def: 4 }); } })),
    relic('kalte_berechnung', 'Kalte Berechnung', 4,
      'Trägt ein Ziel zwei verschiedene Zustände, verursachen alle +35 % Schaden gegen es',
      anhaengen('onHit', 'Kalte Berechnung', function (c) {
        var n = 0, s2 = c.target.status;
        ['gift', 'brand', 'erstarrung', 'verderbnis'].forEach(function (k) { if (s2[k] > 0) n++; });
        if (n >= 2) c.dmg *= 1.35;
      }), [], ['gift', 'brand', 'frost', 'verderbnis']),
    relic('kodex_passiv', 'Kodex der Stillen Künste', 4, 'Einheiten mit mindestens zwei Passiven +18 % Angriff',
      function (m) {
        m.forEach(function (x) {
          var passive = x.effects.filter(function (e) { return e.art === 'passiv'; }).length;
          if (passive >= 2) scale(x, { atk: 0.18 });
        });
      }),
    relic('zwillingsseele', 'Zwillingsseele', 4, 'Einheiten mit zwei oder mehr aktiven Fähigkeiten +22 % Angriff',
      jeder(function (x) { if ((x.actives || []).length >= 2) scale(x, { atk: 0.22 }); })),
    relic('rangbanner', 'Rangbanner', 4, 'Je Einheit ab Rang A erhalten alle +8 % Leben',
      function (m) {
        var n = m.filter(function (x) { return (x.rank || 0) >= 2; }).length;
        if (n) m.forEach(function (x) { scale(x, { hp: n * 0.08 }); });
      }),
    relic('sammlerstueck', 'Sammlung des Weisen', 5,
      'Je verschiedenem Schlüsselwort im Trupp erhalten alle +3 % Angriff und Leben',
      function (m) {
        var gesehen = {}, n = 0;
        m.forEach(function (x) {
          (x.keywords || []).forEach(function (k) { if (!gesehen[k]) { gesehen[k] = 1; n++; } });
        });
        if (n) m.forEach(function (x) { scale(x, { atk: n * 0.03, hp: n * 0.03 }); });
      }),
    relic('erbe_der_ahnen', 'Erbe der Ahnen', 5,
      'Die Einheit mit den meisten Fähigkeiten erhält +45 % auf alle Werte',
      function (m) {
        if (!m.length) return;
        var best = m.reduce(function (a, b) {
          var za = a.actives.length + a.effects.length, zb = b.actives.length + b.effects.length;
          return zb > za ? b : a;
        });
        scale(best, { hp: 0.45, atk: 0.45, def: 0.45, spd: 0.45 });
      }),
    relic('lehrmeister', 'Lehrmeister', 3, 'Einheiten auf Rang C erhalten +35 % Leben und Angriff',
      jeder(function (x) { if (!(x.rank || 0)) scale(x, { hp: 0.35, atk: 0.35 }); })),

    relic('taktgeber', 'Taktgeber', 5, 'Alle aktiven Fähigkeiten kühlen einen Zug schneller ab',
      jeder(function (x) {
        (x.actives || []).forEach(function (a) { a.cd = Math.max(1, a.cd - 1); });
      }))
  ];

  /* ---- Ausrüstung ---------------------------------------------------------- */

  var items = [
    { id: 'kurzschwert', rarity: 1, name: 'Kurzschwert', cost: 35, stats: { atk: 5 },
      text: 'Schlichte Klinge. +5 Angriff.' },
    { id: 'langschwert', rarity: 2, name: 'Langschwert', cost: 60, stats: { atk: 10 },
      text: 'Schwere Klinge. +10 Angriff.' },
    { id: 'lederpanzer', rarity: 1, name: 'Lederpanzer', cost: 35, stats: { hp: 30, def: 2 },
      text: '+30 Leben und +2 Rüstung. Rüstung senkt jeden eingehenden Treffer.' },
    { id: 'plattenpanzer', rarity: 2, name: 'Plattenpanzer', cost: 70, stats: { hp: 55, def: 5 },
      text: '+55 Leben und +5 Rüstung. Für die vorderste Einheit gedacht.' },
    { id: 'stiefel', rarity: 1, name: 'Windstiefel', cost: 40, stats: { spd: 6 },
      text: '+6 Tempo. Mehr Tempo heißt mehr Züge und schnellere Abklingzeiten.' },
    { id: 'amulett', rarity: 2, name: 'Magicule-Amulett', cost: 55, stats: { atk: 6, spd: 3 },
      text: '+6 Angriff und +3 Tempo.' },
    { id: 'giftklinge', rarity: 3, name: 'Giftklinge', cost: 60, stats: { atk: 4 },
      effects: [eff('onHit', 'Gift', inflict('gift', 2))], keywords: ['gift'],
      text: '+4 Angriff. Jeder Treffer legt 2 Gift an (2 Schaden je Stapel pro gegnerischem Zug).' },
    { id: 'flammenklinge', rarity: 3, name: 'Flammenklinge', cost: 60, stats: { atk: 4 },
      effects: [eff('onHit', 'Flamme', chance(0.35, inflict('brand', 2)))], keywords: ['brand'],
      text: '+4 Angriff. 35 % Chance auf 2 Brand — Schaden über Zeit, halbiert die Heilung des Ziels.' },
    { id: 'frostklinge', rarity: 4, name: 'Frostklinge', cost: 70, stats: { atk: 3 },
      effects: [eff('onHit', 'Frost', chance(0.15, inflict('erstarrung', 1)))], keywords: ['frost'],
      text: '+3 Angriff. 15 % Chance, dem Ziel einen ganzen Zug zu rauben.' },
    { id: 'vampirring', rarity: 4, name: 'Vampirring', cost: 75, stats: { atk: 3 },
      effects: [eff('onStart', 'Vampirring', function (c) { c.self.lifesteal += 0.25; })], keywords: ['heilung'],
      text: '+3 Angriff. Die Einheit heilt 25 % des Schadens, den sie verursacht.' },
    { id: 'regenerationsmal', rarity: 3, name: 'Regenerationsmal', cost: 55, stats: { hp: 20 },
      effects: [eff('onStart', 'Regeneration', function (c) { c.self.regen += 6; })], keywords: ['heilung'],
      text: '+20 Leben. Heilt zusätzlich 6 Leben in jedem eigenen Zug.' },
    { id: 'dornenschild', rarity: 4, name: 'Dornenschild', cost: 60, stats: { hp: 25, def: 3 },
      effects: [eff('onDamaged', 'Dornen', function (c) { var f = c.foes()[0]; if (f) c.deal(f, 10, 'Dornen'); })],
      keywords: ['konter'],
      text: '+25 Leben, +3 Rüstung. Jeder Angreifer erleidet 10 Schaden zurück.' },
    { id: 'schutzstein', rarity: 2, name: 'Schutzstein', cost: 45, stats: { def: 3 },
      effects: [eff('onStart', 'Schild', function (c) { c.applyStatus(c.self, 'schild', 40); })], keywords: ['schild'],
      text: '+3 Rüstung. Startet jeden Kampf mit Schild 40, der nicht verfällt.' },
    { id: 'zorngurt', rarity: 3, name: 'Zorngurt', cost: 70, stats: {},
      effects: [eff('onDamaged', 'Zorn', function (c) { c.self.atk += 2; })],
      text: 'Jeder erlittene Treffer gibt dauerhaft +2 Angriff für den Rest des Kampfes.' },
    { id: 'ruestungsbrecher', rarity: 4, name: 'Rüstungsbrecher', cost: 75, stats: { atk: 3 },
      effects: [eff('onStart', 'Rüstungsbruch', function (c) { c.self.pierce = Math.max(c.self.pierce || 0, 0.75); })],
      keywords: [],
      text: '+3 Angriff. Ignoriert 75 % der gegnerischen Rüstung.' },
    { id: 'heldenmal', rarity: 5, name: 'Heldenmal', cost: 95, stats: { hp: 40, atk: 8, def: 3, spd: 4 },
      text: 'Auf alles etwas: +40 Leben, +8 Angriff, +3 Rüstung, +4 Tempo.' },

    /* Ausrüstung, die auf die Fähigkeiten ihrer Trägerin schaut. Erst dadurch
       wird der Kauf eine Frage von „passt das zu wem?" statt „mehr Angriff". */
    { id: 'giftmeisterhandschuh', rarity: 3, name: 'Handschuh der Brutmutter', cost: 70, stats: { atk: 4 },
      keywords: ['gift'],
      text: '+4 Angriff. Erzeugt die Trägerin selbst Gift, legt jeder ihrer Treffer 2 Gift zusätzlich an.',
      effects: [eff('onHit', 'Brutmutter', function (c) {
        if (c.self.keywords.indexOf('gift') >= 0) c.applyStatus(c.target, 'gift', 2);
      })] },
    { id: 'aschemantel', rarity: 3, name: 'Aschemantel', cost: 70, stats: { hp: 25 },
      amplifies: ['brand'],
      text: '+25 Leben. Erzeugt die Trägerin selbst Brand, verursacht sie +35 % Schaden gegen brennende Ziele.',
      effects: [eff('onHit', 'Aschemantel', function (c) {
        if (c.self.keywords.indexOf('brand') >= 0 && c.target.status.brand > 0) c.dmg *= 1.35;
      })] },
    { id: 'frostkette', rarity: 4, name: 'Frostkette', cost: 75, stats: { atk: 3 },
      amplifies: ['frost'],
      text: '+3 Angriff. Gegen erstarrte Ziele verursacht die Trägerin +35 % Schaden.',
      effects: [eff('onHit', 'Frostkette', function (c) {
        if (c.target.status.erstarrung > 0) c.dmg *= 1.35;
      })] },
    { id: 'spiegelpanzer', rarity: 4, name: 'Spiegelpanzer', cost: 80, stats: { hp: 30, def: 2 },
      keywords: ['konter'],
      text: '+30 Leben, +2 Rüstung. Hat die Trägerin eine Konter-Fähigkeit, schlägt sie zusätzlich 14 Schaden zurück.',
      effects: [eff('onDamaged', 'Spiegelpanzer', function (c) {
        if (c.self.keywords.indexOf('konter') < 0) return;
        var f = c.foes()[0]; if (f) c.deal(f, 14, 'Spiegelpanzer');
      })] },
    { id: 'lebensrune', rarity: 3, name: 'Lebensrune', cost: 60, stats: {},
      text: 'Heilt die Trägerin bereits selbst, gibt die Rune +8 Regeneration — sonst +35 Leben.',
      effects: [eff('onStart', 'Lebensrune', function (c) {
        if (c.self.keywords.indexOf('heilung') >= 0) c.self.regen += 8;
        else { c.self.maxHp += 35; c.self.hp += 35; }
      })] },
    { id: 'rangabzeichen', rarity: 4, name: 'Rangabzeichen', cost: 80, stats: {},
      text: 'Je Rangstufe der Trägerin +7 Angriff und +15 Leben. Auf Rang C wirkungslos.',
      effects: [eff('onStart', 'Rangabzeichen', function (c) {
        var r = c.self.rank || 0;
        c.self.atk += 7 * r;
        c.self.maxHp += 15 * r;
        c.self.hp += 15 * r;
      })] },
    { id: 'zwillingsklinge', rarity: 4, name: 'Zwillingsklinge', cost: 80, stats: {},
      text: 'Je aktiver Fähigkeit der Trägerin +6 Angriff und +2 Tempo — lohnt sich erst ab Rang B.',
      effects: [eff('onStart', 'Zwillingsklinge', function (c) {
        var n = c.self.actives.length;
        c.self.atk += 6 * n;
        c.self.spd += 2 * n;
      })] },
    { id: 'schwaechenfinder', rarity: 4, name: 'Auge für Schwächen', cost: 65, stats: { atk: 3 },
      amplifies: ['gift', 'brand', 'frost', 'verderbnis'],
      text: '+3 Angriff. +25 % Schaden gegen jedes Ziel, das irgendeinen Zustand trägt — passt zu jedem Zustands-Build.',
      effects: [eff('onHit', 'Schwächen', function (c) {
        var s2 = c.target.status;
        if (s2.gift > 0 || s2.brand > 0 || s2.erstarrung > 0 || s2.verderbnis > 0) c.dmg *= 1.25;
      })] },
    { id: 'schildbrecher', rarity: 5, name: 'Schildbrecher', cost: 100, stats: { atk: 4 },
      text: '+4 Angriff. Alle Angriffe der Trägerin gehen durch Schilde hindurch.',
      effects: [eff('onStart', 'Schildbrecher', function (c) { c.self.durchschlag = 1; })] }
  ];

  /* Die Signatur ist so selten wie ihre Einheit teuer ist — eine Zahl weniger,
     die auseinanderlaufen kann. Rimuru (Kosten 0) ist der Held: legendär. */
  var KOSTEN_ZU_RARITAET = { 0: 5, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  units.forEach(function (unit) {
    unit.rarity = KOSTEN_ZU_RARITAET[unit.cost];
    var sig = root.Abilities.get(unit.signature);
    if (sig) sig.rarity = unit.rarity;
  });

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  root.GameData = {
    units: units, relics: relics, items: items, ARTEN: ARTEN, GLOSSAR: GLOSSAR,
    unit: function (id) { return byId(units, id); },
    relic: function (id) { return byId(relics, id); },
    item: function (id) { return byId(items, id); },
    artName: function (a) { return ART_NAME[a] || a; },
    rolleName: function (r) { return ROLLE_NAME[r] || r; },
    eff: eff, chance: chance, inflict: inflict, buff: buff, scale: scale
  };
})(globalThis);
