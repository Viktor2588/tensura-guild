/* js/klang.js — Klang. Kein Sample, kein Fremdcode: alles hier ist ein
   Oszillator oder ein Rauschpuffer, in Echtzeit zu Toenen verrechnet.

   Warum synthetisch statt Dateien: das Spiel hat keine einzige Binaerdatei
   fuer Ton, und Aufnahmen brauchen ein Werkzeug, eine Lizenzfrage und einen
   Ordner in ASSETS.md. Ein Sinus mit Attack/Decay ist in zehn Zeilen fertig
   und braucht keine Herkunftszeile.

   Name bewusst nicht `Audio` — das ist der Konstruktor fuer <audio>-Elemente
   auf `window`, ein zweites globales `Audio` wuerde ihn verdecken.

   Ohne Web Audio API (jsdom im Test, sehr alte Browser) wird jede Funktion
   ein No-Op — dieselbe Rueckfallebene wie `Brett3D.verfuegbar()` fuer three.js. */
'use strict';
(function (root) {

  var Ctx = root.AudioContext || root.webkitAudioContext;
  if (!Ctx) {
    root.Klang = {
      entsperren: function () {}, verfuegbar: function () { return false; },
      lautstaerke: function () { return 0; }, istStumm: function () { return true; },
      setzeLautstaerke: function () {}, setzeStumm: function () {},
      treffer: function () {}, heilung: function () {}, tod: function () {},
      wiederbelebung: function () {}, aktiv: function () {},
      sieg: function () {}, niederlage: function () {}, klick: function () {}
    };
    return;
  }

  var lautstaerke = 0.6, stumm = false, ctx = null, meister = null, rauschPuffer = null;
  try {
    var v = parseFloat(localStorage.getItem('tensura-lautstaerke'));
    if (!isNaN(v)) lautstaerke = Math.min(1, Math.max(0, v));
  } catch (e) {}
  try { stumm = localStorage.getItem('tensura-stumm') === '1'; } catch (e) {}

  /* Der Kontext entsteht erst bei der ersten echten Nutzung — Browser
     verweigern AudioContext sonst, solange keine Nutzergeste geschah. */
  function context() {
    if (!ctx) {
      ctx = new Ctx();
      meister = ctx.createGain();
      meister.gain.value = stumm ? 0 : lautstaerke;
      meister.connect(ctx.destination);
    }
    return ctx;
  }

  /* Von einem beliebigen Klick aus aufgerufen (`ui.js`, `klick()`) — genau die
     Nutzergeste, die Browser fuer `resume()` verlangen. */
  function entsperren() {
    var c = context();
    if (c.state === 'suspended') c.resume().catch(function () {});
  }

  function setzeLautstaerke(w) {
    lautstaerke = Math.min(1, Math.max(0, w));
    try { localStorage.setItem('tensura-lautstaerke', String(lautstaerke)); } catch (e) {}
    if (meister) meister.gain.value = stumm ? 0 : lautstaerke;
  }

  function setzeStumm(b) {
    stumm = !!b;
    try { localStorage.setItem('tensura-stumm', stumm ? '1' : '0'); } catch (e) {}
    if (meister) meister.gain.value = stumm ? 0 : lautstaerke;
  }

  function jetzt() { return context().currentTime; }

  /* Zwei Sekunden weisses Rauschen, einmal erzeugt und fuer jeden Stoss
     wiederverwendet (Treffer, Zischen) — kein Grund, das jedes Mal neu
     zu wuerfeln. */
  function puffer() {
    if (rauschPuffer) return rauschPuffer;
    var c = context();
    var n = c.sampleRate * 2;
    rauschPuffer = c.createBuffer(1, n, c.sampleRate);
    var d = rauschPuffer.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return rauschPuffer;
  }

  /* Ein Ton: Oszillator mit kurzem Attack, exponentiellem Ausklang und einer
     optionalen Gleitfahrt von f0 nach f1 — das ist der ganze Werkzeugkasten. */
  function ton(f0, f1, dauer, opt) {
    opt = opt || {};
    var c = context(), t = jetzt() + (opt.verz || 0);
    var o = c.createOscillator();
    o.type = opt.typ || 'sine';
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 === undefined ? f0 : f1), t + dauer);
    var g = c.createGain();
    var vol = opt.vol === undefined ? 0.2 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g); g.connect(meister);
    o.start(t); o.stop(t + dauer + 0.02);
  }

  /* Ein gefilterter Rauschstoss — der Kern jedes Treffers, jedes Zischens. */
  function stoss(dauer, opt) {
    opt = opt || {};
    var c = context(), t = jetzt() + (opt.verz || 0);
    var quelle = c.createBufferSource();
    quelle.buffer = puffer();
    quelle.loop = true;
    var filt = c.createBiquadFilter();
    filt.type = opt.typ || 'lowpass';
    filt.frequency.setValueAtTime(opt.freq || 900, t);
    if (opt.freqBis) filt.frequency.exponentialRampToValueAtTime(opt.freqBis, t + dauer);
    var g = c.createGain();
    var vol = opt.vol === undefined ? 0.25 : opt.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    quelle.connect(filt); filt.connect(g); g.connect(meister);
    quelle.start(t); quelle.stop(t + dauer + 0.02);
  }

  /* Welche Signatur wie aussieht, steht schon in GAMEGUIDE.md: Bogen (fliegt
     hinueber), Sofort (schlaegt ohne Flug ein), Steigt (an der eigenen
     Figur) — dieselbe Einteilung trifft jetzt auch den Klang. */
  var BOGEN = { gift: 1, brand: 1, frost: 1, blutung: 1, verderbnis: 1, chaos: 1, flaeche: 1 };
  var SOFORT = { donner: 1, licht: 1, dunkelheit: 1, exekution: 1 };

  function treffer(anteil, beat, dmg) {
    if (dmg !== undefined && dmg < 0) { heilung(); return; }
    var gross = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
    var lautFaktor = Math.min(1.4, 0.4 + (anteil || 0) * 1.4) * (gross ? 1.3 : 1);
    stoss(gross ? 0.16 : 0.08, { freq: gross ? 260 : 750, freqBis: gross ? 90 : 220, vol: 0.22 * lautFaktor });
    ton(gross ? 140 : 200, gross ? 55 : 110, gross ? 0.22 : 0.09, { typ: 'triangle', vol: 0.14 * lautFaktor });
  }

  function heilung() {
    ton(520, 660, 0.16, { typ: 'sine', vol: 0.13 });
    ton(660, 900, 0.2, { typ: 'sine', vol: 0.11, verz: 0.06 });
  }

  function tod(beat) {
    var finale = beat === 'finale';
    ton(220, finale ? 55 : 95, finale ? 0.9 : 0.45, { typ: 'sawtooth', vol: finale ? 0.2 : 0.14 });
    stoss(finale ? 0.5 : 0.26, { freq: 500, freqBis: 110, vol: 0.12 });
  }

  function wiederbelebung() {
    ton(300, 480, 0.12, { typ: 'sine', vol: 0.13 });
    ton(480, 720, 0.14, { typ: 'sine', vol: 0.12, verz: 0.07 });
    ton(720, 1000, 0.16, { typ: 'sine', vol: 0.11, verz: 0.14 });
  }

  function aktiv(kw) {
    if (BOGEN[kw]) {
      stoss(0.22, { typ: 'bandpass', freq: 320, freqBis: 2100, vol: 0.14 });
      ton(230, 600, 0.2, { typ: 'sawtooth', vol: 0.08 });
    } else if (SOFORT[kw]) {
      ton(1300, 280, 0.09, { typ: 'square', vol: 0.11 });
      stoss(0.05, { freq: 3000, vol: 0.1 });
    } else {
      ton(430, 740, 0.2, { typ: 'sine', vol: 0.1 });
    }
  }

  function sieg() {
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
      ton(f, f * 1.02, 0.3, { typ: 'triangle', vol: 0.15, verz: i * 0.09 });
    });
  }

  function niederlage() {
    ton(300, 140, 0.9, { typ: 'sawtooth', vol: 0.13 });
    ton(220, 90, 1.1, { typ: 'sine', vol: 0.09, verz: 0.15 });
  }

  function klick() {
    ton(700, 500, 0.05, { typ: 'square', vol: 0.05 });
  }

  root.Klang = {
    entsperren: entsperren, verfuegbar: function () { return true; },
    lautstaerke: function () { return lautstaerke; }, istStumm: function () { return stumm; },
    setzeLautstaerke: setzeLautstaerke, setzeStumm: setzeStumm,
    treffer: treffer, heilung: heilung, tod: tod, wiederbelebung: wiederbelebung,
    aktiv: aktiv, sieg: sieg, niederlage: niederlage, klick: klick
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
