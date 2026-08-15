/* js/ton.js — Sound-Design, ohne eine einzige Audio-Datei.

   Wie `js/fx.js` das Bloom aus eigenem Shadercode baut statt aus einem
   Asset-Paket, baut diese Datei jeden Ton zur Laufzeit aus der Web Audio
   API: Oszillatoren und gefiltertes Rauschen statt Samples. Das Spiel bleibt
   offline und ohne neue Abhängigkeit — es gibt schlicht nichts zu laden.

   Browser sperren den `AudioContext`, bis eine Nutzergeste ihn freigibt.
   `entsperren()` wird deshalb synchron aus dem ersten Klick-Handler in
   `js/ui.js` aufgerufen, nicht erst beim ersten Ton — sonst bliebe der
   allererste Kampf stumm.

   Rein prozedural, kein DOM-Zugriff außer `document` für die Geste: passt
   zum Rest des Projekts, das Anzeige und Zustand ohnehin trennt.            */
'use strict';
(function (root) {

  var ctx = null, meister = null;
  var stufe = 'voll'; /* 'voll' | 'leise' | 'aus' */

  function lautstaerke() {
    return stufe === 'voll' ? 0.85 : stufe === 'leise' ? 0.32 : 0;
  }

  function stufeSetzen(s) {
    if (s !== 'voll' && s !== 'leise' && s !== 'aus') return stufe;
    stufe = s;
    if (meister) meister.gain.value = lautstaerke();
    return stufe;
  }

  /* Ein einziger Kompressor vor dem Ausgang: bei schnellem Kampftempo (4×)
     können mehrere Treffer im selben Bild ausgelöst werden, und ohne ihn
     würde das übersteuern statt nur lauter zu werden. */
  function sicherstellen() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { return null; }
    var kompressor = ctx.createDynamicsCompressor();
    kompressor.threshold.value = -20; kompressor.ratio.value = 6;
    kompressor.connect(ctx.destination);
    meister = ctx.createGain();
    meister.gain.value = lautstaerke();
    meister.connect(kompressor);
    return ctx;
  }

  function entsperren() { sicherstellen(); }

  /* -------------------------------------------------------------- Bausteine */

  /* Ein weißes Rauschen je Aufruf frisch erzeugt statt gecacht: die Dauern
     sind kurz (< 0,3 s) und der Kampf löst höchstens ein paar Töne je Bild
     aus — der Puffer ist billiger als das Bündel, das ihn verwalten würde. */
  function rauschPuffer(dauer) {
    var n = Math.max(1, Math.round(ctx.sampleRate * dauer));
    var puffer = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = puffer.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return puffer;
  }

  function osz(typ, freq, start, dauer, spitze, opts) {
    opts = opts || {};
    var o = ctx.createOscillator();
    o.type = typ;
    o.frequency.setValueAtTime(freq, start);
    if (opts.bis) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.bis), start + dauer);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(spitze, start + (opts.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    var ziel = meister;
    if (opts.filterFreq) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filterTyp || 'lowpass';
      f.frequency.value = opts.filterFreq;
      o.connect(f); f.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(ziel);
    o.start(start); o.stop(start + dauer + 0.03);
  }

  function stoss(start, dauer, spitze, opts) {
    opts = opts || {};
    var n = ctx.createBufferSource();
    n.buffer = rauschPuffer(dauer);
    var f = ctx.createBiquadFilter();
    f.type = opts.filterTyp || 'bandpass';
    f.frequency.setValueAtTime(opts.filterFreq || 1400, start);
    if (opts.filterBis) f.frequency.exponentialRampToValueAtTime(Math.max(1, opts.filterBis), start + dauer);
    f.Q.value = opts.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(spitze, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    n.connect(f); f.connect(g); g.connect(meister);
    n.start(start); n.stop(start + dauer + 0.03);
  }

  /* -------------------------------------------------------------- Ereignisse */

  /* Treffer: ein kurzer Rauschstoß als Einschlag plus ein tiefer Klick als
     Wucht. `anteil` (Schaden / maximales Leben) hebt beide an — ein Kratzer
     klingt anders als ein Achtel Leben. */
  function treffer(anteil, schwer) {
    if (!sicherstellen() || stufe === 'aus') return;
    var t = ctx.currentTime, a = Math.max(0, Math.min(1, anteil || 0));
    stoss(t, 0.07 + a * 0.05, 0.22 + a * 0.4, { filterFreq: 2200 - a * 1200, filterBis: 700, q: 0.9 });
    osz('square', 110 - a * 40, t, 0.05, 0.14 + a * 0.16, { bis: 45 });
    if (schwer) osz('sine', 90, t + 0.01, 0.26, 0.4, { bis: 32 });
  }

  /* Heilung: zwei helle Töne im Terzabstand, statt eines einzelnen Pieps —
     das liest sich als „gut", nicht als Benachrichtigung. */
  function heilung() {
    if (!sicherstellen() || stufe === 'aus') return;
    var t = ctx.currentTime;
    osz('triangle', 540, t, 0.22, 0.22, { bis: 620 });
    osz('triangle', 680, t + 0.07, 0.24, 0.2, { bis: 760 });
  }

  /* Tod: ein absackender Ton statt eines Knalls — ein Kampf hat viele
     Treffer, aber jeder Tod soll sich vom Getümmel abheben. Der letzte Tod
     des Kampfes (`finale`) bekommt einen zweiten, tieferen Layer. */
  function tod(finale) {
    if (!sicherstellen() || stufe === 'aus') return;
    var t = ctx.currentTime;
    osz('sawtooth', 180, t, finale ? 0.75 : 0.4, 0.3, { bis: 42, filterFreq: 900, filterTyp: 'lowpass' });
    if (finale) {
      stoss(t + 0.03, 0.5, 0.28, { filterFreq: 500, filterBis: 90, q: 0.7 });
      osz('sine', 70, t + 0.05, 0.6, 0.32, { bis: 28 });
    }
  }

  /* Signatureinsatz: die Klangfarbe folgt derselben Schlüsselwort-Kategorie,
     die auch die Marken und Tooltips einfärbt (style.css, `.kw-*`) — wer die
     Farbe schon kennt, erkennt den Ton wieder. */
  var FAMILIE = {
    brand: 'feuer',
    frost: 'eis',
    gift: 'gift', verderbnis: 'gift', blutung: 'gift',
    schild: 'schild',
    heilung: 'heilung',
    donner: 'blitz',
    licht: 'licht',
    schatten: 'dunkel', dunkelheit: 'dunkel', chaos: 'dunkel'
  };

  function aktiv(kw) {
    if (!sicherstellen() || stufe === 'aus') return;
    var t = ctx.currentTime, fam = FAMILIE[kw] || null;
    if (fam === 'feuer') {
      stoss(t, 0.22, 0.3, { filterTyp: 'highpass', filterFreq: 900, filterBis: 2400, q: 0.6 });
      osz('sawtooth', 160, t, 0.2, 0.16, { bis: 320 });
    } else if (fam === 'eis') {
      osz('sine', 1400, t, 0.4, 0.16, { bis: 2000 });
      osz('triangle', 900, t + 0.03, 0.35, 0.12, { bis: 1300 });
    } else if (fam === 'gift') {
      osz('square', 90, t, 0.3, 0.14, { bis: 70, filterFreq: 500, filterTyp: 'lowpass' });
      osz('square', 96, t + 0.05, 0.25, 0.1, { bis: 74, filterFreq: 500, filterTyp: 'lowpass' });
    } else if (fam === 'schild') {
      osz('square', 700, t, 0.09, 0.14, { bis: 640 });
      stoss(t, 0.12, 0.18, { filterFreq: 3200, q: 1.4 });
    } else if (fam === 'heilung') {
      heilung();
    } else if (fam === 'blitz') {
      stoss(t, 0.09, 0.32, { filterTyp: 'highpass', filterFreq: 2000, q: 0.8 });
      osz('sawtooth', 1200, t, 0.12, 0.18, { bis: 220 });
    } else if (fam === 'licht') {
      osz('sine', 780, t, 0.3, 0.16, { bis: 1300 });
      osz('sine', 1170, t + 0.05, 0.28, 0.1, { bis: 1560 });
    } else if (fam === 'dunkel') {
      osz('sawtooth', 110, t, 0.4, 0.14, { bis: 70, filterFreq: 400, filterTyp: 'lowpass' });
      osz('sawtooth', 113, t, 0.4, 0.1, { bis: 72, filterFreq: 400, filterTyp: 'lowpass' });
    } else {
      /* Standard: ein Wusch aus fallendem Rauschen — für Konter, Tempo,
         Fläche, Exekution und alles ohne eigene Kategorie. */
      stoss(t, 0.16, 0.22, { filterFreq: 2600, filterBis: 500, q: 0.5 });
      osz('sine', 260, t, 0.14, 0.12, { bis: 160 });
    }
  }

  /* Sieg und Niederlage: keine Fläche im Log, sondern eine eigene Ansage —
     die drei Töne einer Fanfare oder ein absackendes Trio, im selben Moment
     wie die „Sieg"/„Niederlage"-Überschrift erscheint. */
  function sieg() {
    if (!sicherstellen() || stufe === 'aus') return;
    var t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach(function (f, i) {
      osz('triangle', f, t + i * 0.1, 0.5, 0.22);
    });
  }

  function niederlage() {
    if (!sicherstellen() || stufe === 'aus') return;
    var t = ctx.currentTime;
    [392, 349.23, 293.66].forEach(function (f, i) {
      osz('sawtooth', f, t + i * 0.13, 0.55, 0.16, { bis: f * 0.75, filterFreq: 900, filterTyp: 'lowpass' });
    });
  }

  root.Ton = {
    stufe: stufeSetzen, entsperren: entsperren,
    treffer: treffer, heilung: heilung, tod: tod, aktiv: aktiv,
    sieg: sieg, niederlage: niederlage
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
