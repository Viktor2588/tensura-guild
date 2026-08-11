/* js/audio.js — Klang. Synthetisierte Effekte statt Audiodateien.

   Das Spiel hat keine einzige Sounddatei und soll auch keine bekommen: es
   laeuft offline, hat keinen Bauschritt, und Musik-/SFX-Bibliotheken sind
   genau die Art Abhaengigkeit, die dieses Projekt vermeidet. Die Web Audio
   API erzeugt jeden Ton zur Laufzeit aus Oszillatoren und Rauschpuffern —
   keine Datei, kein Download, kein Lizenztext in ASSETS.md noetig.

   Die Hookstelle ist dieselbe wie bei `Brett3D`: `js/ui.js` speist aus dem
   Kampflog (`zeige(l, beat)`), `beat` kommt aus `js/regie.js` und sagt, ob ein
   Eintrag ein Hoehepunkt ist — dieselbe Information, die dort schon die
   Zeitlupe ausloest, loest hier ein groesseres Sample aus.

   Kein DOM-Zugriff noetig, aber `AudioContext` fehlt in jsdom und muss vor
   der ersten Nutzergeste stumm bleiben (Autoplay-Policy) — beides macht
   `verfuegbar()`/`entsperren()` explizit, statt es zu verschweigen.        */
'use strict';
(function (root) {

  var stufe = 'voll';
  var LAUTSTAERKE = { voll: 1, leise: 0.35, aus: 0 };

  var ctx = null, master = null;
  var startVersucht = false;

  function setzeStufe(s) {
    if (s !== 'voll' && s !== 'leise' && s !== 'aus') return stufe;
    stufe = s;
    if (master) master.gain.value = LAUTSTAERKE[stufe];
    return stufe;
  }

  function unterstuetzt() {
    return !!(root.AudioContext || root.webkitAudioContext);
  }

  /* Wird erst beim ersten tatsaechlichen Ton angelegt — ein AudioContext, der
     vor jeder Nutzergeste entsteht, startet ohnehin `suspended` und in
     manchen Browsern bleibt er das dauerhaft, wenn man ihn nie anfasst. */
  function hole() {
    if (ctx || !unterstuetzt()) return ctx;
    var C = root.AudioContext || root.webkitAudioContext;
    try { ctx = new C(); } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = LAUTSTAERKE[stufe];
    master.connect(ctx.destination);
    return ctx;
  }

  /* Browser verweigern Ton, bis eine echte Nutzergeste den Kontext freigibt.
     `ui.js` ruft das aus dem globalen Klick-Handler auf — billig genug, um
     bei jedem Klick zu fragen, `resume()` auf einem laufenden Kontext ist
     ein No-Op. */
  function entsperren() {
    var c = hole();
    if (c && c.state === 'suspended') c.resume();
  }

  function verfuegbar() { return stufe !== 'aus' && unterstuetzt(); }

  /* Eine Kanalsperre gegen Maschinengewehrfeuer: die Wiedergabe kann mehrere
     Logeintraege in einem einzigen Bild abarbeiten (hohes Tempo, `schritt()`
     in einer while-Schleife), und ohne Sperre faellt daraus ein Klangbrei aus
     zehn ueberlagerten Toenen. `performance.now()` statt `ctx.currentTime`,
     weil Letzteres sich innerhalb desselben synchronen Durchlaufs nicht
     bewegt. */
  var zuletzt = {};
  function darf(kanal, minMs) {
    var jetzt = (root.performance && root.performance.now) ? root.performance.now() : Date.now();
    if (zuletzt[kanal] !== undefined && jetzt - zuletzt[kanal] < minMs) return false;
    zuletzt[kanal] = jetzt;
    return true;
  }

  /* ---------------------------------------------------------- Bausteine */

  function knoten() {
    var g = ctx.createGain();
    g.gain.value = 0;
    g.connect(master);
    return g;
  }

  /* Kurze Huellkurve: linearer Attack, exponentieller Decay/Release. Ein
     Gain-Knoten kann nie exponentiell auf 0 fahren (Web-Audio-Regel), daher
     das winzige Bodenniveau von 0.0001 statt echt Null. */
  function huelle(g, t0, peak, attack, decay) {
    var p = g.gain;
    p.cancelScheduledValues(t0);
    p.setValueAtTime(0.0001, t0);
    p.linearRampToValueAtTime(peak, t0 + attack);
    p.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  /* Ein Oszillatorton mit eigener Huellkurve und optionaler Tonhoehengleitung
     (fuer Whoosh-artige Signaturen und den Chaos-Wackler). */
  function ton(opt) {
    var t0 = ctx.currentTime + (opt.verzoegerung || 0);
    var osc = ctx.createOscillator();
    osc.type = opt.form || 'sine';
    osc.frequency.setValueAtTime(opt.freq, t0);
    if (opt.freqZiel) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.freqZiel), t0 + (opt.dauer || 0.2));
    var g = knoten();
    huelle(g, t0, opt.peak === undefined ? 0.5 : opt.peak, opt.attack || 0.005, opt.decay || (opt.dauer || 0.2));
    osc.connect(g);
    osc.start(t0);
    osc.stop(t0 + (opt.attack || 0.005) + (opt.decay || opt.dauer || 0.2) + 0.05);
    return osc;
  }

  /* Weisses Rauschen aus einem einmalig erzeugten Puffer (klein, wird
     wiederverwendet) durch einen Filter — Grundlage fuer Einschlaege,
     Ausweichen-Whoosh und das Knistern von Brand/Entladung. */
  var rauschPuffer = null;
  function holeRauschen() {
    if (rauschPuffer) return rauschPuffer;
    var n = ctx.sampleRate * 1; // 1 Sekunde reicht fuer jeden Ausschnitt hier
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    rauschPuffer = buf;
    return buf;
  }

  function rauschen(opt) {
    var t0 = ctx.currentTime + (opt.verzoegerung || 0);
    var src = ctx.createBufferSource();
    src.buffer = holeRauschen();
    src.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = opt.filterTyp || 'bandpass';
    filter.frequency.setValueAtTime(opt.freq || 800, t0);
    if (opt.freqZiel) filter.frequency.exponentialRampToValueAtTime(Math.max(1, opt.freqZiel), t0 + (opt.dauer || 0.15));
    filter.Q.value = opt.q === undefined ? 1 : opt.q;
    var g = knoten();
    huelle(g, t0, opt.peak === undefined ? 0.4 : opt.peak, opt.attack || 0.002, opt.decay || (opt.dauer || 0.15));
    src.connect(filter);
    filter.connect(g);
    src.start(t0);
    src.stop(t0 + (opt.attack || 0.002) + (opt.decay || opt.dauer || 0.15) + 0.05);
  }

  /* --------------------------------------------------------- Kampfklang */

  /* Elemente bekommen eine Tonfarbe, dieselbe Gruppierung wie GAMEGUIDE.md
     unter "Was du bei einer Signatur siehst": Bogenwurf, Soforttreffer,
     Selbstverstaerkung. Frequenzen sind grobe Analogien (tief = schwer,
     hoch = fein), keine musikalische Aussage. */
  var ELEMENT = {
    gift: 320, brand: 210, frost: 1100, verderbnis: 260, blutung: 240,
    chaos: 500, flaeche: 300, donner: 90, licht: 1400, dunkelheit: 180,
    schatten: 700, exekution: 460, konter: 380, tempo: 900, heilung: 760,
    schild: 640
  };
  var BOGEN = { gift: 1, brand: 1, frost: 1, blutung: 1, verderbnis: 1, chaos: 1, flaeche: 1 };
  var SELBST = { heilung: 1, schild: 1, tempo: 1, schatten: 1, konter: 1 };

  function aktivKlang(l, beat) {
    if (!darf('aktiv', 30)) return;
    var kw = (l.kw || [])[0];
    var freq = ELEMENT[kw] || 440;
    var gross = beat === 'finale' || beat === 'toedlich' || beat === 'gross';
    if (SELBST[kw]) {
      /* steigt an der eigenen Figur auf: sanfter Aufschwung */
      ton({ freq: freq * 0.6, freqZiel: freq * 1.4, form: 'sine', dauer: 0.28, peak: 0.35 });
    } else if (BOGEN[kw]) {
      /* fliegt im Bogen: Whoosh (Rauschen faellt) gefolgt vom Einschlag */
      rauschen({ freq: 2200, freqZiel: 300, filterTyp: 'bandpass', dauer: 0.18, peak: 0.3 });
      ton({ freq: freq, form: 'triangle', dauer: 0.16, peak: gross ? 0.6 : 0.4, verzoegerung: 0.1 });
    } else {
      /* schlaegt sofort ein: kurzer, harter Stoss */
      ton({ freq: freq, form: 'square', dauer: 0.1, peak: gross ? 0.55 : 0.35 });
      rauschen({ freq: freq * 2, filterTyp: 'highpass', dauer: 0.06, peak: 0.2 });
    }
  }

  function hitKlang(l, beat) {
    if (!darf('hit', 25)) return;
    var anteil = l.maxHp ? Math.min(1, l.dmg / l.maxHp) : 0.1;
    var gross = beat === 'finale' || beat === 'toedlich' || beat === 'gross';
    var peak = 0.25 + anteil * 0.35 + (gross ? 0.2 : 0);
    var freq = 260 - anteil * 140; // ein schwerer Treffer klingt tiefer
    rauschen({ freq: freq * 3, filterTyp: 'lowpass', dauer: 0.09 + anteil * 0.1, peak: peak * 0.8, q: 0.7 });
    ton({ freq: freq, form: 'triangle', dauer: 0.12 + anteil * 0.12, peak: peak, attack: 0.002 });
  }

  function healKlang() {
    if (!darf('heal', 60)) return;
    ton({ freq: 500, freqZiel: 780, form: 'sine', dauer: 0.3, peak: 0.3, attack: 0.02 });
  }

  function deathKlang(beat) {
    if (!darf('death', 40)) return;
    var finale = beat === 'finale';
    ton({ freq: finale ? 180 : 140, freqZiel: 40, form: 'sawtooth', dauer: finale ? 0.7 : 0.4, peak: finale ? 0.6 : 0.4 });
    rauschen({ freq: 400, freqZiel: 60, filterTyp: 'lowpass', dauer: finale ? 0.6 : 0.3, peak: 0.3 });
  }

  function schildKlang() {
    if (!darf('schild', 80)) return;
    ton({ freq: 640, freqZiel: 900, form: 'sine', dauer: 0.18, peak: 0.22 });
    ton({ freq: 960, freqZiel: 1300, form: 'sine', dauer: 0.15, peak: 0.12, verzoegerung: 0.02 });
  }

  function statusKlang(l) {
    if (!darf('status:' + l.status, 220)) return;
    var freq = ELEMENT[l.status] || 400;
    ton({ freq: freq, form: 'sine', dauer: 0.06, peak: 0.1, attack: 0.001 });
  }

  function resonanzKlang() {
    if (!darf('resonanz', 200)) return;
    ton({ freq: 523, form: 'triangle', dauer: 0.16, peak: 0.35 });
    ton({ freq: 659, form: 'triangle', dauer: 0.22, peak: 0.3, verzoegerung: 0.09 });
  }

  function verwandlungKlang() {
    if (!darf('verwandlung', 300)) return;
    ton({ freq: 130, freqZiel: 520, form: 'sawtooth', dauer: 0.8, peak: 0.4 });
    rauschen({ freq: 200, freqZiel: 2000, filterTyp: 'bandpass', dauer: 0.7, peak: 0.25 });
  }

  function reviveKlang() {
    if (!darf('revive', 200)) return;
    [440, 554, 659].forEach(function (f, i) {
      ton({ freq: f, form: 'sine', dauer: 0.18, peak: 0.28, verzoegerung: i * 0.07 });
    });
  }

  function wutKlang() {
    if (!darf('wut', 150)) return;
    ton({ freq: 90, freqZiel: 220, form: 'sawtooth', dauer: 0.25, peak: 0.35 });
  }

  function kombiKlang() {
    if (!darf('kombi', 100)) return;
    rauschen({ freq: 1500, freqZiel: 250, filterTyp: 'bandpass', dauer: 0.22, peak: 0.35 });
    ton({ freq: 200, form: 'square', dauer: 0.14, peak: 0.3 });
  }

  function entladungKlang() {
    if (!darf('entladung', 150)) return;
    ton({ freq: 900, freqZiel: 60, form: 'square', dauer: 0.22, peak: 0.4 });
    rauschen({ freq: 3000, filterTyp: 'highpass', dauer: 0.12, peak: 0.25 });
  }

  function ausweichenKlang() {
    if (!darf('ausweichen', 80)) return;
    rauschen({ freq: 1800, freqZiel: 500, filterTyp: 'bandpass', dauer: 0.12, peak: 0.2 });
  }

  function widerstehtKlang() {
    if (!darf('widersteht', 150)) return;
    rauschen({ freq: 600, freqZiel: 1400, filterTyp: 'bandpass', dauer: 0.12, peak: 0.18 });
  }

  function fehlschlagKlang() {
    if (!darf('fehlschlag', 100)) return;
    ton({ freq: 220, freqZiel: 90, form: 'square', dauer: 0.14, peak: 0.2 });
  }

  function skipKlang() {
    if (!darf('skip', 150)) return;
    ton({ freq: 130, form: 'sine', dauer: 0.1, peak: 0.12 });
  }

  function setupKlang() {
    if (!darf('setup', 500)) return;
    ton({ freq: 90, freqZiel: 180, form: 'sine', dauer: 0.9, peak: 0.22, attack: 0.2 });
  }

  /* Ein Logeintrag aus `simulate()` samt Regie-Beat — dieselben zwei
     Argumente, mit denen `js/ui.js` auch `Brett3D.treffer`/`Brett3D.effekt`
     fuettert. `chaos` und `zug` bleiben stumm: beide feuern zu oft (jeder
     eigene Zug bzw. jeder Schritt aufs Feld), um einzeln einen Ton zu
     verdienen — das sagt schon ihr Gewicht in `Regie.GEWICHT`. */
  function spiele(l, beat) {
    if (!verfuegbar() || !hole()) return;
    switch (l.type) {
      case 'setup': return setupKlang();
      case 'aktiv': return aktivKlang(l, beat);
      case 'hit': return hitKlang(l, beat);
      case 'heal': return healKlang();
      case 'death': return deathKlang(beat);
      case 'schild': return schildKlang();
      case 'status': return statusKlang(l);
      case 'resonanz': return resonanzKlang();
      case 'verwandlung': return verwandlungKlang();
      case 'revive': return reviveKlang();
      case 'wut': return wutKlang();
      case 'kombi': return kombiKlang();
      case 'entladung': return entladungKlang();
      case 'ausweichen': return ausweichenKlang();
      case 'widersteht': return widerstehtKlang();
      case 'fehlschlag': return fehlschlagKlang();
      case 'skip': return skipKlang();
      default: return;
    }
  }

  /* ------------------------------------------------------------- UI-Klang */

  function ui(name) {
    if (!verfuegbar() || !hole()) return;
    if (name === 'klick') {
      if (!darf('ui-klick', 40)) return;
      ton({ freq: 700, form: 'square', dauer: 0.03, peak: 0.08 });
    } else if (name === 'kaufen') {
      if (!darf('ui-kaufen', 60)) return;
      ton({ freq: 880, form: 'triangle', dauer: 0.08, peak: 0.25 });
      ton({ freq: 1320, form: 'triangle', dauer: 0.1, peak: 0.18, verzoegerung: 0.05 });
    } else if (name === 'sieg') {
      [523, 659, 784, 1047].forEach(function (f, i) {
        ton({ freq: f, form: 'triangle', dauer: 0.3, peak: 0.35, verzoegerung: i * 0.1 });
      });
    } else if (name === 'niederlage') {
      [392, 349, 294].forEach(function (f, i) {
        ton({ freq: f, form: 'sine', dauer: 0.45, peak: 0.3, verzoegerung: i * 0.16 });
      });
    }
  }

  root.Klang = { verfuegbar: verfuegbar, unterstuetzt: unterstuetzt, stufe: setzeStufe,
                 entsperren: entsperren, spiele: spiele, ui: ui };

})(typeof globalThis !== 'undefined' ? globalThis : this);
