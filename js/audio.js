/* js/audio.js — Sound-Effekte, synthetisiert zur Laufzeit per Web Audio API.

   Genau wie js/brett3d.js keine Bilddatei nutzt, nutzt diese Datei keine
   Audiodatei: jeder Klang entsteht aus Oszillatoren und Rauschen im Moment
   des Abspielens — kein Bauschritt, keine Abhängigkeit, keine Lizenzfrage.
   Die Zuordnung folgt demselben Prinzip wie FARBE in brett3d.js: am
   SCHLÜSSELWORT, nicht am Namen der Fähigkeit. Wer Gift spielt, soll Gift
   auch HÖREN, gleich von welcher Einheit.

   Ohne Web Audio API passiert hier nichts — verfuegbar() sagt nein, und der
   Rest des Spiels läuft unverändert weiter. Das hält dev/uitest.js lauffähig,
   der in jsdom ohne AudioContext läuft. */
(function (root) {
  'use strict';

  var STUMM_KEY = 'tensura-stumm';
  var ctx = null;
  var puffer = null;               // ein Rauschpuffer, wiederverwendet für alle Klänge
  var stumm = false;
  try { stumm = localStorage.getItem(STUMM_KEY) === '1'; } catch (e) { /* ignore */ }

  function verfuegbar() { return !!(root.AudioContext || root.webkitAudioContext); }

  /* Der Kontext entsteht erst beim ersten Klang — Browser verweigern Audio vor
     einer Nutzergeste, und ein leerer Kontext beim Laden würde nur eine
     Warnung in die Konsole schreiben, ohne dass je etwas zu hören wäre.

     Konstruktor und resume() können laut Spezifikation werfen (Ressourcen
     erschöpft, Dokument nicht aktiv, ungültige Optionen) — das darf nie den
     Aufrufer treffen, denn Ton ist ein Extra, kein Muss. Deshalb hier
     abgefangen statt erst in spielen(), das diesen Aufruf gar nicht sieht. */
  function kontext() {
    if (!verfuegbar()) return null;
    try {
      if (!ctx) {
        var Ctx = root.AudioContext || root.webkitAudioContext;
        ctx = new Ctx();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function stummgeschaltet() { return stumm; }
  function schalteStumm() {
    stumm = !stumm;
    try { localStorage.setItem(STUMM_KEY, stumm ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!stumm) kontext();          // gleich freischalten, sonst erst beim nächsten Klang
    return stumm;
  }

  /* ---- Bausteine ------------------------------------------------------------
     Zwei Klangquellen reichen für alles: ein Ton (Oszillator, ggf. gleitend)
     und Rauschen durch ein Bandfilter. Alles andere ist Frequenz, Hüllkurve
     und Dauer — dieselbe Idee wie bei den Partikeln in brett3d.js: wenige
     Bausteine, viele Kombinationen. */

  function huelle(g, t0, an, dauer, spitze) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(spitze, t0 + an);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  }

  function ton(c, t0, freq, gleitZu, dauer, form, lautstaerke) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = form || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (gleitZu) o.frequency.exponentialRampToValueAtTime(gleitZu, t0 + dauer);
    huelle(g, t0, Math.min(0.03, dauer * 0.25), dauer, lautstaerke);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dauer + 0.05);
  }

  function rauschpuffer(c) {
    if (puffer && puffer.sampleRate === c.sampleRate) return puffer;
    var len = c.sampleRate * 0.5;
    puffer = c.createBuffer(1, len, c.sampleRate);
    var d = puffer.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return puffer;
  }

  function rauschen(c, t0, dauer, filterHz, lautstaerke) {
    var quelle = c.createBufferSource();
    quelle.buffer = rauschpuffer(c);
    quelle.loop = true;
    var filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    var g = c.createGain();
    huelle(g, t0, 0.008, dauer, lautstaerke);
    quelle.connect(filter); filter.connect(g); g.connect(c.destination);
    quelle.start(t0); quelle.stop(t0 + dauer + 0.05);
  }

  /* Ein "Klang" ist eine kleine Rezeptur aus Ton und optional Rauschen. Sie
     läuft geschützt in try/catch: ein Audiofehler (z.B. ein ausgelaufener
     Kontext nach Tab-Wechsel) darf nie den Kampf selbst stören. */
  function spielen(bauen) {
    if (stumm) return;
    var c = kontext();
    if (!c) return;
    try { bauen(c, c.currentTime); } catch (e) { /* Audio ist ein Extra, kein Muss */ }
  }

  /* ---- Klänge je Schlüsselwort ----------------------------------------------
     Dieselben Schlüssel wie FARBE in brett3d.js — wer beide Module nebeneinander
     benutzt, sieht und hört dasselbe Element. */
  var SCHLUESSEL = {
    brand:      function (c, t) { ton(c, t, 190, 70, 0.3, 'sawtooth', 0.15); rauschen(c, t, 0.22, 2200, 0.08); },
    gift:       function (c, t) { ton(c, t, 300, 190, 0.4, 'sine', 0.12); },
    frost:      function (c, t) { ton(c, t, 1250, 1600, 0.5, 'triangle', 0.1); },
    donner:     function (c, t) { ton(c, t, 90, 40, 0.22, 'square', 0.18); rauschen(c, t, 0.18, 3200, 0.14); },
    blutung:    function (c, t) { ton(c, t, 150, 95, 0.28, 'sine', 0.13); },
    verderbnis: function (c, t) { ton(c, t, 230, 140, 0.45, 'sawtooth', 0.1); },
    chaos:      function (c, t) { ton(c, t, 320, 620, 0.3, 'square', 0.09); },
    schatten:   function (c, t) { ton(c, t, 210, 100, 0.35, 'sine', 0.1); },
    dunkelheit: function (c, t) { ton(c, t, 160, 80, 0.4, 'sine', 0.12); },
    licht:      function (c, t) { ton(c, t, 900, 1300, 0.4, 'triangle', 0.13); },
    heilung:    function (c, t) { ton(c, t, 520, 780, 0.45, 'sine', 0.13); },
    schild:     function (c, t) { ton(c, t, 700, 900, 0.28, 'triangle', 0.12); },
    konter:     function (c, t) { ton(c, t, 520, 340, 0.16, 'square', 0.14); },
    exekution:  function (c, t) { ton(c, t, 420, 55, 0.55, 'sawtooth', 0.2); },
    verwundbar: function (c, t) { ton(c, t, 260, 180, 0.22, 'sine', 0.1); },
    tempo:      function (c, t) { ton(c, t, 700, 1050, 0.14, 'square', 0.1); },
    flaeche:    function (c, t) { ton(c, t, 260, 150, 0.35, 'sawtooth', 0.14); rauschen(c, t, 0.3, 1500, 0.09); }
  };

  /* Aktive Fähigkeit — ein Zeilentyp aus dem Kampflog, wie in Brett3D.effekt. */
  function effekt(kw) {
    var bauen = SCHLUESSEL[kw];
    spielen(bauen || function (c, t) { ton(c, t, 380, 260, 0.25, 'sine', 0.1); });
  }

  /* ---- Klänge für den Rest des Kampfs und der Oberfläche --------------------
     Kein Schlüsselwort dahinter — das sind Ereignisse, keine Effekte. */

  function treffer() {
    spielen(function (c, t) {
      ton(c, t, 130, 60, 0.1, 'square', 0.12);
      rauschen(c, t, 0.07, 900, 0.1);
    });
  }

  function tod() {
    spielen(function (c, t) {
      ton(c, t, 220, 60, 0.55, 'sawtooth', 0.16);
      rauschen(c, t, 0.3, 300, 0.08);
    });
  }

  function wiederbelebung() {
    spielen(function (c, t) {
      ton(c, t, 420, 840, 0.4, 'triangle', 0.14);
    });
  }

  /* Eine kleine Melodie: drei Töne mit Versatz statt ein einzelner Klang.
     Das ist der Moment, den ein Run über Minuten aufbaut — er verdient mehr
     als einen Piepton. */
  function jingle(c, t0, noten, form, lautstaerke) {
    noten.forEach(function (freq, i) {
      ton(c, t0 + i * 0.13, freq, 0, 0.35, form, lautstaerke);
    });
  }

  function sieg() {
    spielen(function (c, t) { jingle(c, t, [523, 659, 784, 1047], 'triangle', 0.14); });
  }

  function niederlage() {
    spielen(function (c, t) { jingle(c, t, [392, 349, 293], 'sawtooth', 0.14); });
  }

  function rang() {
    spielen(function (c, t) { jingle(c, t, [440, 660, 880], 'square', 0.1); });
  }

  function kauf() {
    spielen(function (c, t) {
      ton(c, t, 880, 0, 0.06, 'sine', 0.09);
      ton(c, t + 0.06, 1320, 0, 0.12, 'sine', 0.09);
    });
  }

  function fehler() {
    spielen(function (c, t) { ton(c, t, 140, 100, 0.18, 'square', 0.1); });
  }

  /* Generischer Klick — bewusst leise und kurz, sonst nervt er beim zehnten
     Klick im Markt. Läuft über jeden Knopf mit data-a, siehe ui.js. */
  function klick() {
    spielen(function (c, t) { ton(c, t, 1000, 0, 0.035, 'sine', 0.05); });
  }

  root.Sound = {
    verfuegbar: verfuegbar, stummgeschaltet: stummgeschaltet, schalteStumm: schalteStumm,
    effekt: effekt, treffer: treffer, tod: tod, wiederbelebung: wiederbelebung,
    sieg: sieg, niederlage: niederlage, rang: rang, kauf: kauf, fehler: fehler, klick: klick
  };
})(globalThis);
