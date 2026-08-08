/* js/audio.js — Prozedurale Sound-Engine fuer Kampf-Feedback.

   Keine Audiodateien: jeder Ton entsteht zur Laufzeit aus Oszillatoren und
   einem Rauschpuffer der Web Audio API. Dasselbe Prinzip, das ASSETS.md fuer
   three.js begruendet — offline, kein Bauschritt — nur ohne Fremdcode
   ueberhaupt.

   Browser verlangen eine Nutzergeste, bevor ein AudioContext Ton ausgibt;
   der erste Klick oder Tastendruck im Dokument weckt ihn. Fehlt die API
   ganz (jsdom in `dev/uitest.js`), bleiben alle Funktionen stillschweigend
   no-ops — genau wie `Brett3D.verfuegbar()` es fuer die 3D-Ansicht vormacht.

   Der globale Name ist `Klang`, nicht `Audio` — `window.Audio` ist der
   eingebaute Konstruktor fuer `<audio>`-Elemente, und den ueberschreibt hier
   niemand.                                                                   */
'use strict';
(function (root) {

  var Ctx = root.AudioContext || root.webkitAudioContext;
  var ctx = null, meister = null, an = true, rauschPuffer = null;

  function stelle() {
    if (!Ctx) return null;
    if (!ctx) {
      ctx = new Ctx();
      meister = ctx.createGain();
      meister.gain.value = an ? 0.5 : 0;
      meister.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  if (root.document) {
    ['pointerdown', 'keydown'].forEach(function (ev) {
      root.document.addEventListener(ev, stelle, { once: true, passive: true });
    });
  }

  function schalte(einAus) {
    an = !!einAus;
    if (meister) meister.gain.value = an ? 0.5 : 0;
  }

  function aktiv() { return an; }

  /* Ein Ton: Sinus/Dreieck/Rechteck/Saege mit exponentieller Huelle, damit
     nichts knackt. `gleiteZu` laesst die Frequenz waehrend der Dauer
     wandern — Aufschwung fuer Heilung, Absturz fuer einen Tod. */
  function ton(freq, dauer, opt) {
    var c = stelle();
    if (!c || !an) return;
    opt = opt || {};
    var jetzt = c.currentTime + (opt.verzoegerung || 0);
    var osc = c.createOscillator(), gain = c.createGain();
    osc.type = opt.form || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, freq), jetzt);
    if (opt.gleiteZu) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.gleiteZu), jetzt + dauer);
    var spitze = opt.lautstaerke === undefined ? 0.2 : opt.lautstaerke;
    gain.gain.setValueAtTime(0.0001, jetzt);
    gain.gain.exponentialRampToValueAtTime(spitze, jetzt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    osc.connect(gain);
    gain.connect(meister);
    osc.start(jetzt);
    osc.stop(jetzt + dauer + 0.02);
  }

  /* Ein Rauschstoss durch ein Tiefpass- oder Hochpassfilter: der Krach eines
     Treffers, das Zischen eines Ausweichens. Der Puffer wird einmal gefuellt
     und immer wieder abgespielt, nicht neu gewuerfelt — eine Sekunde weisses
     Rauschen reicht fuer jede Dauer, die hier vorkommt. */
  function rauschen(dauer, opt) {
    var c = stelle();
    if (!c || !an) return;
    opt = opt || {};
    if (!rauschPuffer || rauschPuffer.sampleRate !== c.sampleRate) {
      var len = c.sampleRate;
      rauschPuffer = c.createBuffer(1, len, c.sampleRate);
      var d = rauschPuffer.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    var jetzt = c.currentTime + (opt.verzoegerung || 0);
    var src = c.createBufferSource();
    src.buffer = rauschPuffer;
    var filt = c.createBiquadFilter();
    filt.type = opt.filterTyp || 'lowpass';
    filt.frequency.value = opt.filterFreq === undefined ? 2000 : opt.filterFreq;
    var gain = c.createGain();
    var spitze = opt.lautstaerke === undefined ? 0.2 : opt.lautstaerke;
    gain.gain.setValueAtTime(spitze, jetzt);
    gain.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(meister);
    src.start(jetzt);
    src.stop(jetzt + dauer + 0.02);
  }

  /* Ein Schluesselwort auf eine Tonhoehe: keine Tabelle zu pflegen, nur ein
     Streuwert auf eine kleine Auswahl — genug, damit Feuer anders klingt als
     Frost, ohne dass jedes der ueber vierzig Schluesselwoerter einen eigenen
     Eintrag braucht. */
  var TONLEITER = [392.0, 440.0, 493.9, 587.3, 659.3, 698.5, 784.0, 880.0];
  function streuTon(s) {
    s = s || '';
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return TONLEITER[h % TONLEITER.length];
  }

  /* ---------------------------------------------------------- Ereignisse */

  function treffer(l, beat) {
    var frac = l.dmg && l.maxHp ? l.dmg / l.maxHp : 0.05;
    var schwer = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
    rauschen(0.08 + frac * 0.06, { filterFreq: 3200 - frac * 2200, lautstaerke: 0.16 + Math.min(0.22, frac * 0.5) });
    ton(210 - frac * 70, 0.11, { form: 'triangle', gleiteZu: 90, lautstaerke: 0.14 + frac * 0.25 });
    if (schwer) ton(90, beat === 'finale' ? 0.5 : 0.32, { form: 'sine', gleiteZu: 45, lautstaerke: 0.3 });
  }

  function heilung() { ton(440, 0.22, { form: 'sine', gleiteZu: 660, lautstaerke: 0.16 }); }

  function tod(beat) {
    var gross = beat === 'finale';
    ton(280, gross ? 0.7 : 0.45, { form: 'sawtooth', gleiteZu: 55, lautstaerke: gross ? 0.32 : 0.24 });
    rauschen(gross ? 0.55 : 0.35, { filterFreq: 700, lautstaerke: 0.16 });
  }

  function einsatz(l) {
    var freq = streuTon(l.kw || l.name || l.unit);
    rauschen(0.22, { filterTyp: 'highpass', filterFreq: 1500, lautstaerke: 0.08 });
    ton(freq * 0.5, 0.09, { form: 'square', lautstaerke: 0.1 });
    ton(freq, 0.3, { form: 'sine', gleiteZu: freq * 1.5, lautstaerke: 0.18, verzoegerung: 0.05 });
  }

  function schild() {
    ton(1200, 0.08, { form: 'square', lautstaerke: 0.1 });
    ton(900, 0.12, { form: 'triangle', gleiteZu: 650, lautstaerke: 0.09 });
  }

  function status(l) { ton(streuTon(l.status) * 0.6, 0.12, { form: 'sine', lautstaerke: 0.09 }); }

  function ausweichen() { rauschen(0.11, { filterTyp: 'highpass', filterFreq: 2200, lautstaerke: 0.11 }); }

  function skip() { ton(120, 0.15, { form: 'square', gleiteZu: 85, lautstaerke: 0.1 }); }

  function widersteht() { ton(900, 0.14, { form: 'sine', gleiteZu: 1500, lautstaerke: 0.11 }); }

  function revive() {
    ton(300, 0.4, { form: 'sine', gleiteZu: 700, lautstaerke: 0.2 });
    ton(450, 0.4, { form: 'sine', gleiteZu: 900, lautstaerke: 0.13, verzoegerung: 0.03 });
  }

  function entladung() {
    rauschen(0.3, { filterFreq: 4000, lautstaerke: 0.18 });
    ton(600, 0.18, { form: 'square', gleiteZu: 1200, lautstaerke: 0.14 });
  }

  function kombi() {
    ton(659.3, 0.28, { form: 'sine', lautstaerke: 0.16 });
    ton(988, 0.28, { form: 'sine', lautstaerke: 0.11, verzoegerung: 0.02 });
  }

  function verwandlung() {
    [523, 659, 784].forEach(function (f, i) {
      ton(f, 0.35, { form: 'sine', lautstaerke: 0.2, verzoegerung: i * 0.11 });
    });
    ton(392, 0.6, { form: 'sine', lautstaerke: 0.15, verzoegerung: 0.34 });
  }

  function wut() {
    rauschen(0.25, { filterFreq: 220, lautstaerke: 0.15 });
    ton(75, 0.3, { form: 'sawtooth', lautstaerke: 0.2 });
  }

  function fehlschlag() { ton(220, 0.13, { form: 'square', gleiteZu: 100, lautstaerke: 0.1 }); }

  /* Ein Logeintrag, derselbe Beat, den `Regie.zeitplan` schon berechnet hat —
     die Vertonung braucht keine eigene Vorausschau. `zug` und `chaos` bleiben
     absichtlich stumm: reine Positions- bzw. Anzeigeinformation, kein Ereignis. */
  function spiele(l, beat) {
    if (l.type === 'hit') treffer(l, beat);
    else if (l.type === 'heal') heilung();
    else if (l.type === 'death') tod(beat);
    else if (l.type === 'aktiv') einsatz(l);
    else if (l.type === 'schild') schild();
    else if (l.type === 'status') status(l);
    else if (l.type === 'ausweichen') ausweichen();
    else if (l.type === 'skip') skip();
    else if (l.type === 'widersteht') widersteht();
    else if (l.type === 'revive') revive();
    else if (l.type === 'entladung') entladung();
    else if (l.type === 'kombi') kombi();
    else if (l.type === 'verwandlung') verwandlung();
    else if (l.type === 'wut') wut();
    else if (l.type === 'fehlschlag') fehlschlag();
  }

  /* Sieg oder Niederlage schliesst die Wiedergabe ab — auch wenn ueber
     "Ueberspringen" kein einziger Zwischenton lief. */
  function ergebnis(gewonnen) {
    if (gewonnen) [523, 659, 784, 1047].forEach(function (f, i) {
      ton(f, 0.3, { form: 'sine', lautstaerke: 0.18, verzoegerung: i * 0.1 });
    });
    else [330, 294, 262].forEach(function (f, i) {
      ton(f, 0.45, { form: 'sine', lautstaerke: 0.16, verzoegerung: i * 0.16 });
    });
  }

  root.Klang = { schalte: schalte, aktiv: aktiv, spiele: spiele, ergebnis: ergebnis };

})(typeof globalThis !== 'undefined' ? globalThis : this);
