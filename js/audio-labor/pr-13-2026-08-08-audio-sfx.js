/* js/klang.js — Tonabnahme: kurze, synthetische Effekte ueber die Web-Audio-API.

   Keine Audiodateien, keine neue Abhaengigkeit: jeder Ton entsteht aus
   Oszillatoren und einem einzigen Rauschpuffer, zur Laufzeit. Das passt zum
   Rest des Projekts (kein Bauschritt, keine Fremdressourcen) und erspart eine
   eigene Herkunftszeile in ASSETS.md — synthetischer Ton hat keine Provenienz
   zu klaeren.

   `verfuegbar()` spiegelt `Brett3D.verfuegbar()`: jsdom (dev/uitest.js) kennt
   kein AudioContext, also muss jede oeffentliche Funktion klaglos nichts tun,
   wenn es fehlt. Der AudioContext selbst entsteht erst beim ersten Ton, nicht
   beim Laden — Browser verweigern sonst den Start, weil noch keine
   Nutzergeste stattgefunden hat.                                            */
'use strict';
(function (root) {

  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, meister = null, rauschpuffer = null;
  var stufeWert = 'voll';
  var PEGEL = { voll: 0.5, sparsam: 0.22, aus: 0 };

  function verfuegbar() { return !!AC; }

  function stufe(s) {
    if (PEGEL[s] === undefined) s = 'voll';
    stufeWert = s;
    if (meister) meister.gain.value = PEGEL[stufeWert];
    return stufeWert;
  }

  /* Der Kontext entsteht erst hier, ausgeloest vom ersten Klick — genau das
     ist die Nutzergeste, die Browser dafuer verlangen. */
  function kontext() {
    if (!verfuegbar()) return null;
    if (!ctx) {
      ctx = new AC();
      meister = ctx.createGain();
      meister.gain.value = PEGEL[stufeWert];
      meister.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* Ein Sekunde weisses Rauschen, einmal gebaut und fuer jeden Treffer wieder
     ausgeschnitten — billiger als je einen eigenen Puffer zu fuellen. */
  function rauschen() {
    if (!rauschpuffer) {
      var c = kontext();
      var n = c.sampleRate;
      rauschpuffer = c.createBuffer(1, n, c.sampleRate);
      var d = rauschpuffer.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return rauschpuffer;
  }

  /* Ein Ton: Oszillator mit linearer Frequenzrampe und einer kurzen
     Lautstaerkehuelle (schneller Anstieg, exponentieller Abfall). */
  function ton(opt) {
    var c = kontext();
    if (!c || !PEGEL[stufeWert]) return;
    var t0 = c.currentTime;
    var osc = c.createOscillator();
    osc.type = opt.form || 'sine';
    osc.frequency.setValueAtTime(opt.von, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.bis || opt.von), t0 + (opt.dauer || 0.2));
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opt.laut || 0.9, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opt.dauer || 0.2));
    osc.connect(g); g.connect(meister);
    osc.start(t0); osc.stop(t0 + (opt.dauer || 0.2) + 0.02);
  }

  /* Ein perkussiver Knall aus gefiltertem Rauschen — fuer Einschlaege, bei
     denen ein reiner Sinus zu weich klingt. */
  function knall(opt) {
    var c = kontext();
    if (!c || !PEGEL[stufeWert]) return;
    var t0 = c.currentTime;
    var src = c.createBufferSource();
    src.buffer = rauschen();
    var filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(opt.frequenz || 900, t0);
    filt.Q.value = opt.guete || 0.9;
    var g = c.createGain();
    var dauer = opt.dauer || 0.09;
    g.gain.setValueAtTime(opt.laut || 0.7, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    src.connect(filt); filt.connect(g); g.connect(meister);
    src.start(t0); src.stop(t0 + dauer + 0.02);
  }

  /* Treffer: Knall skaliert mit dem Schaden. `anteil` ist der Schaden als
     Bruchteil der Maximal-HP — dieselbe Zahl, die das Brett fuer die
     Wucht des Ruecktosses benutzt (`Brett3D.treffer`). */
  function treffer(anteil) {
    if (!kontext()) return;
    var a = Math.max(0, Math.min(1, anteil || 0));
    knall({ frequenz: 260 + a * 260, laut: 0.35 + a * 0.45, dauer: 0.07 + a * 0.1, guete: 1.1 });
  }

  function heilung() {
    if (!kontext()) return;
    ton({ form: 'sine', von: 520, bis: 780, dauer: 0.28, laut: 0.35 });
  }

  function tod() {
    if (!kontext()) return;
    ton({ form: 'triangle', von: 300, bis: 60, dauer: 0.5, laut: 0.4 });
    knall({ frequenz: 180, laut: 0.3, dauer: 0.18, guete: 0.6 });
  }

  /* Aktive Faehigkeit / Signatur: ein kurzer Aufschwung. `beat === 'finale'`
     bekommt mehr Nachdruck, weil dann ohnehin die Zeitlupe greift. */
  function aktiv(beat) {
    if (!kontext()) return;
    var gross = beat === 'finale' || beat === 'toedlich';
    ton({ form: 'sawtooth', von: 180, bis: gross ? 900 : 620, dauer: gross ? 0.4 : 0.24, laut: gross ? 0.4 : 0.28 });
  }

  function sieg() {
    if (!kontext()) return;
    var c = kontext();
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
      root.setTimeout(function () { ton({ form: 'triangle', von: f, bis: f, dauer: 0.5, laut: 0.35 }); }, i * 90);
    });
  }

  function niederlage() {
    if (!kontext()) return;
    [220, 196, 174.61].forEach(function (f, i) {
      root.setTimeout(function () { ton({ form: 'sine', von: f, bis: f * 0.9, dauer: 0.55, laut: 0.3 }); }, i * 140);
    });
  }

  function rang() {
    if (!kontext()) return;
    [659.25, 987.77].forEach(function (f, i) {
      root.setTimeout(function () { ton({ form: 'sine', von: f, bis: f * 1.02, dauer: 0.35, laut: 0.32 }); }, i * 70);
    });
  }

  function kauf() {
    if (!kontext()) return;
    ton({ form: 'square', von: 440, bis: 660, dauer: 0.09, laut: 0.18 });
  }

  function klick() {
    if (!kontext()) return;
    ton({ form: 'square', von: 900, bis: 900, dauer: 0.035, laut: 0.12 });
  }

  root.Klang = {
    verfuegbar: verfuegbar, stufe: stufe, treffer: treffer, heilung: heilung,
    tod: tod, aktiv: aktiv, sieg: sieg, niederlage: niederlage, rang: rang,
    kauf: kauf, klick: klick
  };

})(globalThis);
