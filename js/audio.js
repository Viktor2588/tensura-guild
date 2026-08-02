/* js/audio.js — Klangkulisse fürs Kampf-Replay, komplett prozedural.

   Keine Audiodatei im Projekt, keine neue Abhängigkeit: jeder Ton entsteht
   zur Laufzeit aus Oszillatoren und gefiltertem Rauschen (Web Audio API) —
   derselbe Grundgedanke wie `platzhalter()` in js/brett3d.js, nur für Ohren
   statt Augen. Ohne Web Audio (oder ohne Nutzerinteraktion, die der Browser
   für den ersten Ton verlangt) bleibt das Spiel einfach stumm; nichts hängt
   an SFX, es ist reine Zugabe.

   Vierzig Signaturen, aber KEINE vierzig Klänge — wie bei den Effekten in
   brett3d.js hängt der Klang an der Kategorie des Schlüsselworts, nicht am
   Namen der Fähigkeit. */
(function (root) {
  'use strict';

  var STUMM_KEY = 'tensura-stumm';
  var stumm = false;
  try { stumm = localStorage.getItem(STUMM_KEY) === '1'; } catch (e) {}

  var ctx = null;
  function kontext() {
    var A = root.AudioContext || root.webkitAudioContext;
    if (!A) return null;
    if (!ctx) ctx = new A();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Ein einzelner Ton: Frequenz, Dauer, optional ein Gleiten zu einer
     Zielfrequenz. Die Lautstärke fährt exponentiell an und ab, das klingt
     weicher als ein harter Ein/Aus-Schnitt. */
  function ton(freq, dauer, opts) {
    if (stumm) return;
    var c = kontext();
    if (!c) return;
    opts = opts || {};
    var osc = c.createOscillator();
    osc.type = opts.typ || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (opts.gleiteZu) osc.frequency.exponentialRampToValueAtTime(opts.gleiteZu, c.currentTime + dauer);
    var gain = c.createGain();
    var vol = opts.vol == null ? 0.16 : opts.vol;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + (opts.anstieg || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dauer);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dauer + 0.02);
  }

  /* Gefiltertes weißes Rauschen mit abklingender Hüllkurve — für Einschläge,
     Knirschen, alles, was kein reiner Ton ist. */
  function rauschen(dauer, opts) {
    if (stumm) return;
    var c = kontext();
    if (!c) return;
    opts = opts || {};
    var n = Math.max(1, Math.round(c.sampleRate * dauer));
    var buffer = c.createBuffer(1, n, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var src = c.createBufferSource();
    src.buffer = buffer;
    var filter = c.createBiquadFilter();
    filter.type = opts.filterTyp || 'lowpass';
    filter.frequency.value = opts.frequenz || 1000;
    var gain = c.createGain();
    gain.gain.value = opts.vol == null ? 0.2 : opts.vol;
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start();
  }

  function akkord(freqs, dauer, opts) {
    freqs.forEach(function (f) { ton(f, dauer, opts); });
  }

  /* ---- Die vier Klangfarben, an denen sich alle Schlüsselwörter orientieren:
     Schlag (roher Schaden), zehrend (Gift/Verfall), kalt (Kontrolle/Illusion),
     Segen (alles, was hilft). Dieselbe Idee wie FARBE in brett3d.js, nur mit
     vier statt sechzehn Einträgen — fürs Ohr reichen vier klar unterscheidbare
     Texturen, sechzehn wären nur noch Rauschen im Rauschen. */
  var KATEGORIE = {
    brand: 'schlag', donner: 'schlag', blutung: 'schlag', exekution: 'schlag', flaeche: 'schlag',
    gift: 'zehrend', verderbnis: 'zehrend', verwundbar: 'zehrend',
    frost: 'kalt', schatten: 'kalt', dunkelheit: 'kalt', chaos: 'kalt',
    heilung: 'segen', schild: 'segen', konter: 'segen', tempo: 'segen', licht: 'segen'
  };

  var KLANG = {
    schlag: function () { rauschen(0.14, { frequenz: 1600, vol: 0.22 }); ton(140, 0.16, { typ: 'sawtooth', gleiteZu: 70, vol: 0.12 }); },
    zehrend: function () { ton(480, 0.3, { typ: 'triangle', gleiteZu: 320, vol: 0.13 }); },
    kalt: function () { ton(1300, 0.32, { typ: 'sine', gleiteZu: 750, vol: 0.11 }); },
    segen: function () { akkord([660, 880], 0.3, { typ: 'sine', vol: 0.1 }); }
  };

  function signatur(kw) { (KLANG[KATEGORIE[kw]] || KLANG.schlag)(); }

  function treffer() { rauschen(0.09, { frequenz: 1100, vol: 0.16 }); }
  function heilung() { akkord([660, 880, 1100], 0.32, { typ: 'sine', vol: 0.1 }); }
  function tod() { ton(220, 0.4, { typ: 'sawtooth', gleiteZu: 55, vol: 0.14 }); }
  function wiederbelebt() { akkord([440, 660, 880], 0.35, { typ: 'triangle', vol: 0.12 }); }
  function schildFang() { ton(750, 0.1, { typ: 'square', vol: 0.13 }); ton(950, 0.08, { typ: 'square', vol: 0.1, anstieg: 0.03 }); }
  function kombi() { rauschen(0.22, { frequenz: 2000, vol: 0.24 }); akkord([300, 450], 0.3, { typ: 'sawtooth', vol: 0.12 }); }
  function entladung() { rauschen(0.16, { frequenz: 2600, vol: 0.26 }); ton(90, 0.22, { typ: 'square', vol: 0.14 }); }
  function verwandlung() { akkord([440, 550, 660, 880], 0.5, { typ: 'triangle', vol: 0.12, anstieg: 0.04 }); }
  function sieg() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      root.setTimeout(function () { ton(f, 0.35, { typ: 'triangle', vol: 0.14 }); }, i * 110);
    });
  }
  function niederlage() { ton(220, 0.6, { typ: 'sine', gleiteZu: 110, vol: 0.13, anstieg: 0.05 }); }
  function klick() { ton(1000, 0.05, { typ: 'square', vol: 0.06 }); }

  function istStumm() { return stumm; }
  function stummSchalten() {
    stumm = !stumm;
    try { localStorage.setItem(STUMM_KEY, stumm ? '1' : '0'); } catch (e) {}
    return stumm;
  }

  root.SFX = {
    signatur: signatur, treffer: treffer, heilung: heilung, tod: tod,
    wiederbelebt: wiederbelebt, schildFang: schildFang, kombi: kombi,
    entladung: entladung, verwandlung: verwandlung, sieg: sieg,
    niederlage: niederlage, klick: klick,
    istStumm: istStumm, stummSchalten: stummSchalten
  };
})(globalThis);
