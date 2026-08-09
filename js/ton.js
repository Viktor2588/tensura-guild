/* js/ton.js — Sound-Kulisse, rein synthetisch per Web Audio API.

   Keine Audiodateien: das Spiel läuft offline und soll keinen Asset-Ordner
   für Klänge brauchen, so wie ASSETS.md das für Bilder schon vorsieht.
   Jeder Ton ist eine kleine Funktion aus Oszillator oder Rauschpuffer plus
   Hüllkurve — dieselbe Idee wie `js/fx.js` für Bild, nur für Ton.

   Wie `Brett3D.verfuegbar()` fällt `verfuegbar()` still auf `false`, wenn es
   keinen AudioContext gibt (jsdom im UI-Test kennt keinen). Der AudioContext
   startet in den meisten Browsern gesperrt, bis eine Nutzeraktion ihn
   freigibt — dafür `entsperren()`, aufgerufen aus dem ersten Klick.          */
'use strict';
(function (root) {

  var ctx = null, meister = null, an = true;
  try { an = (localStorage.getItem('tensura-ton') || 'an') !== 'aus'; } catch (e) {}

  function unterstuetzt() {
    return typeof AudioContext !== 'undefined' || typeof root.webkitAudioContext !== 'undefined';
  }

  function kontext() {
    if (ctx || !unterstuetzt()) return ctx;
    var K = typeof AudioContext !== 'undefined' ? AudioContext : root.webkitAudioContext;
    ctx = new K();
    meister = ctx.createGain();
    meister.gain.value = an ? 0.5 : 0;
    meister.connect(ctx.destination);
    return ctx;
  }

  function verfuegbar() { return unterstuetzt(); }

  function entsperren() {
    var c = kontext();
    if (c && c.state === 'suspended') c.resume();
  }

  function stufe(v) {
    an = v !== 'aus';
    try { localStorage.setItem('tensura-ton', an ? 'an' : 'aus'); } catch (e) {}
    if (meister) meister.gain.setTargetAtTime(an ? 0.5 : 0, kontext().currentTime, 0.05);
    return an ? 'an' : 'aus';
  }

  /* ---- Bausteine -------------------------------------------------------
     Zwei Grundformen decken alles ab: ein Oszillatorton mit Hüllkurve fürs
     Tonale (Treffer-Punch, Chimes), ein gefiltertes Rauschen fürs Perkussive
     (Klicks, Whoosh, Krachen). Beide teilen sich denselben Meister-Gain. */

  function jit(basis, spanne) { return basis + (Math.random() * 2 - 1) * spanne; }

  function piep(form, freq, dauer, opt) {
    var c = kontext();
    if (!c || !an) return;
    opt = opt || {};
    var t0 = c.currentTime + (opt.verzoegerung || 0);
    var osc = c.createOscillator(), gain = c.createGain();
    osc.type = form;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (opt.gleitZu) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.gleitZu), t0 + dauer);
    var spitze = opt.lautstaerke === undefined ? 0.3 : opt.lautstaerke;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(spitze, t0 + (opt.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    osc.connect(gain).connect(meister);
    osc.start(t0);
    osc.stop(t0 + dauer + 0.02);
  }

  /* Ein Sekunden-Puffer weissen Rauschens, wiederverwendet statt je Ton neu
     berechnet — nur die Quelle wird pro Aufruf neu erzeugt, Puffer sind in
     Web Audio nicht mehrfach gleichzeitig abspielbar sonst schon. */
  var rauschPuffer = null;
  function rauschQuelle(c) {
    if (!rauschPuffer || rauschPuffer.sampleRate !== c.sampleRate) {
      var n = c.sampleRate;
      rauschPuffer = c.createBuffer(1, n, c.sampleRate);
      var d = rauschPuffer.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = c.createBufferSource();
    src.buffer = rauschPuffer;
    src.loop = true;
    return src;
  }

  function rauschen(dauer, opt) {
    var c = kontext();
    if (!c || !an) return;
    opt = opt || {};
    var t0 = c.currentTime + (opt.verzoegerung || 0);
    var src = rauschQuelle(c);
    var filter = c.createBiquadFilter();
    filter.type = opt.filterTyp || 'bandpass';
    filter.frequency.setValueAtTime(opt.frequenz || 1200, t0);
    if (opt.frequenzZu) filter.frequency.exponentialRampToValueAtTime(Math.max(1, opt.frequenzZu), t0 + dauer);
    filter.Q.value = opt.guete === undefined ? 0.8 : opt.guete;
    var gain = c.createGain();
    var spitze = opt.lautstaerke === undefined ? 0.25 : opt.lautstaerke;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(spitze, t0 + (opt.attack || 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    src.connect(filter).connect(gain).connect(meister);
    src.start(t0);
    src.stop(t0 + dauer + 0.02);
  }

  /* ---- Kampf ------------------------------------------------------------
     Eine Funktion je Log-Typ aus `combat.js`, dieselbe Unterscheidung, die
     `Regie.beats()` schon trifft: `beat` (gross/toedlich/finale/wende/
     flaeche) skaliert Lautstärke und Tonhöhe, statt jeden Treffer gleich
     klingen zu lassen. */

  var GROSS_FAKTOR = { gross: 1.4, toedlich: 1.7, finale: 2.2, wende: 1.3, flaeche: 1.15 };

  function treffer(l, f) {
    var anteil = l.maxHp ? Math.min(1, l.dmg / l.maxHp) : 0.15;
    var staerke = Math.min(2, f * (0.55 + anteil * 2));
    rauschen(0.045 + anteil * 0.07, {
      frequenz: jit(1500, 250), frequenzZu: jit(500, 80), guete: 1.1,
      lautstaerke: 0.2 * staerke, attack: 0.002
    });
    piep('sine', jit(95, 10), 0.1 * (f > 1 ? 1.3 : 1), {
      gleitZu: jit(55, 8), lautstaerke: 0.28 * staerke, attack: 0.002
    });
  }

  function heilung(f) {
    piep('triangle', jit(520, 15), 0.16, { lautstaerke: 0.18 * f, attack: 0.01 });
    piep('triangle', jit(700, 15), 0.22, { lautstaerke: 0.16 * f, attack: 0.01, verzoegerung: 0.07 });
  }

  function tod(f) {
    piep('sine', jit(210, 10), 0.28 * f, { gleitZu: jit(50, 5), lautstaerke: 0.24 * Math.min(f, 1.6), attack: 0.004 });
    rauschen(0.1 * f, { frequenz: 500, frequenzZu: 140, guete: 0.7, lautstaerke: 0.15 * f });
  }

  function einsatz(f) {
    piep('triangle', jit(320, 20), 0.16, { gleitZu: jit(640, 50), lautstaerke: 0.22 * f, attack: 0.005 });
    rauschen(0.08, { frequenz: 2000, frequenzZu: 3200, guete: 0.6, lautstaerke: 0.09 * f });
  }

  function wuerfel() {
    for (var i = 0; i < 3; i++) {
      rauschen(0.03, { verzoegerung: i * 0.035, frequenz: jit(2200, 400), guete: 3, lautstaerke: 0.09 });
    }
  }

  function fehlschlag() {
    rauschen(0.05, { frequenz: 300, guete: 1.5, lautstaerke: 0.12 });
  }

  function ausweichen() {
    rauschen(0.12, { frequenz: 500, frequenzZu: 2200, guete: 0.5, lautstaerke: 0.13 });
  }

  function widersteht() {
    rauschen(0.07, { frequenz: 1200, frequenzZu: 1800, guete: 1, lautstaerke: 0.13 });
  }

  function erhebung() {
    [440, 660, 880].forEach(function (freq, i) {
      piep('triangle', freq, 0.16 + i * 0.04, { lautstaerke: 0.22, attack: 0.008, verzoegerung: i * 0.08 });
    });
  }

  function wut() {
    piep('sawtooth', 85, 0.28, { lautstaerke: 0.16, attack: 0.02 });
    piep('sawtooth', jit(88, 3), 0.28, { lautstaerke: 0.12, attack: 0.02, verzoegerung: 0.01 });
  }

  function entladung(f) {
    rauschen(0.14 * f, { frequenz: 1800, frequenzZu: 600, guete: 0.8, lautstaerke: 0.22 * f });
    piep('square', jit(200, 20), 0.1, { lautstaerke: 0.12 * f, attack: 0.002 });
  }

  function verwandlung() {
    [440, 554, 659, 880].forEach(function (freq, i) {
      piep('triangle', freq, 0.22, { lautstaerke: 0.18, attack: 0.01, verzoegerung: i * 0.09 });
    });
  }

  function resonanz() {
    piep('sine', 523, 0.5, { lautstaerke: 0.15, attack: 0.02 });
    piep('sine', 784, 0.45, { lautstaerke: 0.11, attack: 0.02, verzoegerung: 0.03 });
  }

  function schild() {
    piep('sine', jit(900, 40), 0.09, { gleitZu: jit(700, 30), lautstaerke: 0.13, attack: 0.002 });
  }

  /* `l` ist der Log-Eintrag aus `combat.js`, `beat` der Höhepunkt-Typ aus
     `Regie.beats()` — dieselben zwei Werte, die `js/ui.js` schon an
     `zeige()` reicht. Unbekannte Typen (`zug`, `setup`) bleiben stumm. */
  function kampf(l, beat) {
    if (!an || !unterstuetzt()) return;
    var f = GROSS_FAKTOR[beat] || 1;
    switch (l.type) {
      case 'hit': treffer(l, f); break;
      case 'heal': heilung(f); break;
      case 'death': tod(f); break;
      case 'aktiv': einsatz(f); break;
      case 'chaos': wuerfel(); break;
      case 'fehlschlag': fehlschlag(); break;
      case 'ausweichen': ausweichen(); break;
      case 'widersteht': widersteht(); break;
      case 'revive': erhebung(); break;
      case 'wut': wut(); break;
      case 'kombi': case 'entladung': entladung(f); break;
      case 'verwandlung': verwandlung(); break;
      case 'resonanz': resonanz(); break;
      case 'schild': schild(); break;
    }
  }

  /* ---- UI und Rundenende ------------------------------------------------ */

  function klick() {
    rauschen(0.025, { frequenz: 2600, guete: 2, lautstaerke: 0.07, attack: 0.001 });
  }

  function sieg() {
    [523, 659, 784, 1047].forEach(function (freq, i) {
      piep('triangle', freq, 0.3, { lautstaerke: 0.22, attack: 0.01, verzoegerung: i * 0.11 });
    });
  }

  function niederlage() {
    piep('sine', 220, 0.4, { gleitZu: 160, lautstaerke: 0.2, attack: 0.01 });
    piep('sine', 175, 0.5, { gleitZu: 120, lautstaerke: 0.16, attack: 0.01, verzoegerung: 0.18 });
  }

  root.Ton = {
    verfuegbar: verfuegbar, entsperren: entsperren, stufe: stufe,
    kampf: kampf, klick: klick, sieg: sieg, niederlage: niederlage
  };

})(globalThis);
