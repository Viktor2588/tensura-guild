/* js/ton.js — prozedurales Sound-Design. Keine einzige Sample-Datei: jeder
   Klang entsteht zur Laufzeit aus Oszillatoren und gefiltertem Rauschen über
   die Web Audio API. Das ist dieselbe Linie, die ASSETS.md für das Brett
   zieht (Platzhalter-Silhouetten, Himmel aus dem Code statt aus einer Datei)
   — hier stellt sich die Herkunftsfrage aus ASSETS.md deshalb gar nicht erst.

   Ohne Web Audio (jsdom, sehr alte Browser) passiert nichts: `verfuegbar()`
   sagt nein, jeder Aufruf wird zum No-Op. Genau das Muster, das js/brett3d.js
   für WebGL fährt — und aus demselben Grund: dev/uitest.js läuft in jsdom
   und darf daran nicht scheitern.

   Autoplay-Sperren: Browser verlangen eine Nutzergeste, bevor Ton beginnt.
   Der erste Kampfzug fällt oft schon in die rAF-Schleife und nicht mehr in
   den Klick, der sie gestartet hat — darum entsperrt schon die allererste
   Berührung der Seite den Kontext, nicht erst der erste Ton-Aufruf.        */
'use strict';
(function (root) {

  var Ctx = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master = null;
  var an = true;
  try { an = localStorage.getItem('tensura-ton') !== 'aus'; } catch (e) {}

  function verfuegbar() { return !!Ctx; }

  function kontext() {
    if (!Ctx || !an) return null;
    if (!ctx) {
      ctx = new Ctx();
      /* Ein Kompressor am Ausgang statt an jeder Quelle: mehrere Treffer
         gleichzeitig (Fläche, Entladung) sollen sich ducken, nicht clippen. */
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -20;
      master.ratio.value = 6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  if (root.document) {
    ['pointerdown', 'keydown'].forEach(function (ev) {
      root.document.addEventListener(ev, function () { kontext(); }, { capture: true, once: true });
    });
  }

  /* Wie `Brett3D.stufe`: An/Aus wird am Gerät gemerkt, nicht im Spielstand. */
  function stufe(s) {
    if (s === 'an' || s === 'aus') an = s === 'an';
    try { localStorage.setItem('tensura-ton', an ? 'an' : 'aus'); } catch (e) {}
    return an ? 'an' : 'aus';
  }

  /* -------------------------------------------------------- Bausteine */

  /* Ein Puffer weißes Rauschen, einmal erzeugt und wiederverwendet — die
     eigentliche Farbe kommt erst vom Filter in `knall()`. */
  var rauschpuffer = null;
  function puffer(c) {
    if (rauschpuffer) return rauschpuffer;
    var n = c.sampleRate * 2;
    rauschpuffer = c.createBuffer(1, n, c.sampleRate);
    var d = rauschpuffer.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return rauschpuffer;
  }

  /* Ein Oszillatorton mit Frequenzrampe und Hüllkurve (kurzer Anstieg, dann
     exponentieller Abfall — linear klingt bei kurzen Tönen wie abgeschnitten). */
  function ton(opt) {
    var c = kontext(); if (!c) return;
    var t0 = c.currentTime + (opt.verzoegerung || 0);
    var dauer = opt.dauer || 0.2;
    var osz = c.createOscillator();
    osz.type = opt.typ || 'sine';
    osz.frequency.setValueAtTime(Math.max(1, opt.von), t0);
    if (opt.bis !== undefined && opt.bis !== opt.von) {
      osz.frequency.exponentialRampToValueAtTime(Math.max(1, opt.bis), t0 + dauer);
    }
    var g = c.createGain();
    var spitze = opt.lautst === undefined ? 0.3 : opt.lautst;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(spitze, t0 + (opt.anstieg || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    osz.connect(g); g.connect(master);
    osz.start(t0);
    osz.stop(t0 + dauer + 0.03);
    osz.onended = function () { osz.disconnect(); g.disconnect(); };
  }

  /* Gefiltertes Rauschen — für Einschläge, Whoosh und Klicks, alles, was
     keine Tonhöhe braucht, sondern eine Farbe und eine Hüllkurve. */
  function knall(opt) {
    var c = kontext(); if (!c) return;
    var t0 = c.currentTime + (opt.verzoegerung || 0);
    var dauer = opt.dauer || 0.15;
    var quelle = c.createBufferSource();
    quelle.buffer = puffer(c);
    quelle.loop = true;
    var filter = c.createBiquadFilter();
    filter.type = opt.filterTyp || 'bandpass';
    filter.Q.value = opt.q === undefined ? 0.9 : opt.q;
    filter.frequency.setValueAtTime(Math.max(1, opt.von || 800), t0);
    if (opt.bis !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(1, opt.bis), t0 + dauer);
    var g = c.createGain();
    var spitze = opt.lautst === undefined ? 0.25 : opt.lautst;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(spitze, t0 + (opt.anstieg || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    quelle.connect(filter); filter.connect(g); g.connect(master);
    quelle.start(t0);
    quelle.stop(t0 + dauer + 0.03);
    quelle.onended = function () { quelle.disconnect(); filter.disconnect(); g.disconnect(); };
  }

  /* -------------------------------------------------------------- SFX */

  function klick() {
    ton({ typ: 'sine', von: 1100, bis: 700, dauer: 0.05, lautst: 0.12, anstieg: 0.002 });
  }

  /* `anteil` ist Schaden geteilt durch Maximal-HP (0..~0,4), `beat` kommt
     unveraendert aus der Regie: null, 'gross', 'toedlich' oder 'finale'. */
  function treffer(anteil, beat) {
    anteil = Math.max(0, Math.min(0.5, anteil || 0));
    var schwer = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
    var laut = Math.min(0.5, 0.16 + anteil * 0.7);
    knall({ von: schwer ? 260 : 550, bis: schwer ? 90 : 220, dauer: schwer ? 0.22 : 0.11,
            filterTyp: 'lowpass', q: 0.6, lautst: laut });
    ton({ typ: 'sine', von: schwer ? 170 : 260, bis: schwer ? 65 : 130,
          dauer: schwer ? 0.22 : 0.1, lautst: Math.min(0.4, 0.1 + anteil * 0.6) });
    if (beat === 'finale') {
      knall({ von: 140, bis: 45, dauer: 0.4, filterTyp: 'lowpass', q: 0.5, lautst: 0.35, verzoegerung: 0.05 });
    }
  }

  function heilung() {
    ton({ typ: 'triangle', von: 523, bis: 523, dauer: 0.16, lautst: 0.14 });
    ton({ typ: 'triangle', von: 784, bis: 784, dauer: 0.22, lautst: 0.12, verzoegerung: 0.07 });
  }

  function schild() {
    ton({ typ: 'triangle', von: 900, bis: 1500, dauer: 0.09, lautst: 0.14 });
    knall({ von: 3000, bis: 5000, dauer: 0.07, filterTyp: 'highpass', q: 0.7, lautst: 0.06 });
  }

  function status() {
    ton({ typ: 'sine', von: 700, bis: 640, dauer: 0.05, lautst: 0.05 });
  }

  function ausweichen() {
    knall({ von: 2600, bis: 900, dauer: 0.08, filterTyp: 'highpass', q: 1.2, lautst: 0.1 });
  }

  function fehlschlag() {
    ton({ typ: 'sawtooth', von: 180, bis: 110, dauer: 0.12, lautst: 0.08 });
  }

  /* `beat` ist 'finale' beim letzten Fall eines Kampfes oder 'wende' beim
     Kipppunkt — beide sollen schwerer wiegen als ein gewöhnlicher Tod. */
  function tod(beat) {
    var gross = beat === 'finale' || beat === 'wende';
    ton({ typ: 'sine', von: gross ? 260 : 220, bis: gross ? 55 : 80,
          dauer: gross ? 0.55 : 0.3, lautst: gross ? 0.3 : 0.18 });
    knall({ von: gross ? 500 : 400, bis: gross ? 60 : 90, dauer: gross ? 0.5 : 0.25,
            filterTyp: 'lowpass', q: 0.5, lautst: gross ? 0.28 : 0.15 });
    if (beat === 'finale') {
      ton({ typ: 'sine', von: 130, bis: 40, dauer: 0.7, lautst: 0.2, verzoegerung: 0.1 });
    }
  }

  function revive() {
    ton({ typ: 'triangle', von: 220, bis: 520, dauer: 0.3, lautst: 0.16 });
    knall({ von: 1200, bis: 2400, dauer: 0.2, filterTyp: 'highpass', q: 0.8, lautst: 0.08, verzoegerung: 0.08 });
  }

  /* Einsatz einer aktiven Fähigkeit — ein Whoosh. `beat === 'flaeche'` heisst
     mehrere Treffer folgen, das darf grösser klingen als ein Einzelziel. */
  function aktiv(beat) {
    var gross = beat === 'flaeche';
    knall({ von: gross ? 2600 : 1800, bis: 300, dauer: gross ? 0.3 : 0.2,
            filterTyp: 'bandpass', q: 0.8, lautst: gross ? 0.22 : 0.15 });
    ton({ typ: 'sine', von: 300, bis: gross ? 620 : 480, dauer: gross ? 0.22 : 0.15, lautst: 0.1 });
  }

  /* Wut, Kombination, Entladung — seltene Verstärker-Momente, alle mit
     demselben kurzen Doppelschlag statt drei eigenen Rezepten. */
  function spezial() {
    knall({ von: 1400, bis: 500, dauer: 0.12, filterTyp: 'bandpass', q: 1.0, lautst: 0.18 });
    ton({ typ: 'square', von: 200, bis: 340, dauer: 0.1, lautst: 0.08, verzoegerung: 0.05 });
  }

  /* Eine Verwandlung ist laut Kommentar in js/ui.js der seltenste Moment im
     Kampf — ein kleiner Aufstieg aus drei Toenen ist dafuer angemessen. */
  function verwandlung() {
    [261.6, 329.6, 392.0, 523.3].forEach(function (f, i) {
      ton({ typ: 'triangle', von: f, bis: f, dauer: 0.35, lautst: 0.14, verzoegerung: i * 0.09 });
    });
    knall({ von: 4000, bis: 2000, dauer: 0.4, filterTyp: 'highpass', q: 0.6, lautst: 0.08 });
  }

  function sieg() {
    [523.3, 659.3, 784.0, 1046.5].forEach(function (f, i) {
      ton({ typ: 'triangle', von: f, bis: f, dauer: 0.3, lautst: 0.16, verzoegerung: i * 0.08 });
    });
  }

  function niederlage() {
    [392.0, 349.2, 293.7].forEach(function (f, i) {
      ton({ typ: 'sine', von: f, bis: f * 0.85, dauer: 0.4, lautst: 0.16, verzoegerung: i * 0.14 });
    });
  }

  root.Ton = {
    verfuegbar: verfuegbar, stufe: stufe,
    klick: klick, treffer: treffer, heilung: heilung, schild: schild, status: status,
    ausweichen: ausweichen, fehlschlag: fehlschlag, tod: tod, revive: revive,
    aktiv: aktiv, spezial: spezial, verwandlung: verwandlung, sieg: sieg, niederlage: niederlage
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
