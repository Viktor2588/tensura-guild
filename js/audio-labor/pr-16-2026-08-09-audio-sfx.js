/* Variante aus PR #16 — Erster Ton im Spiel: synthetisierte Kampf- und UI-Sounds
   Quelle: Branch `routine/2026-08-09-audio-sfx`, Datei `js/klang.js`.
   Der Inhalt darunter ist unveraendert; neu ist nur diese Klammer.

   Warum die Klammer: alle 21 Varianten schreiben ihre Schnittstelle unter
   demselben Handvoll Namen (`Klang`, `Ton`, `Sound`, `SFX`) an das globale
   Objekt. Nebeneinander geladen ueberschriebe die letzte alle vorherigen.
   Statt des echten `globalThis` bekommt jede Variante deshalb einen eigenen
   Schirm gereicht (`js/audio-labor/labor.js`): Lesen faellt auf das echte
   globale Objekt durch, Schreiben landet im Schirm. So bleiben 21 `Klang`
   nebeneinander stehen, ohne voneinander zu wissen. */
AudioLabor.registriere('pr-16', function (globalThis) {
/* js/klang.js — Ton: kurze synthetisierte Effekte per Web Audio API.

   Warum synthetisiert statt Audiodateien: das Spiel hat keinen Bauschritt und
   soll keinen bekommen (README.md), und eine Sounddatei wäre die erste
   Ressource ohne eigene Herkunftszeile in ASSETS.md — Lizenzfrage inklusive.
   Ein Oszillator plus ein Rauschgenerator reichen für Treffer, Zauber und
   Fanfare, genau wie `js/fx.js` für Bloom eigenen Shader-Code statt eines
   fertigen Post-Processing-Pakets gewählt hat.

   Jedes Schlüsselwort bekommt eine eigene, aber WIEDERHOLBARE Stimme: ein
   simpler Hash aus dem Namen wählt Tonhöhe und Wellenform, ohne eine zweite
   Zuordnungstabelle neben `FARBE`/`FORM` aus `js/brett3d.js` zu führen — die
   gäbe es doppelt zu pflegen, und dieses Modul soll auch OHNE three.js und
   ohne Brett funktionieren (siehe dev/sim.js, das in Node ohne Browser läuft
   und trotzdem jede Funktion hier gefahrlos aufrufen kann).                */
'use strict';
(function (root) {

  var ctx = null, master = null, an = true;

  function verfuegbar() { return !!ctx && an; }

  /* Browser verweigern einen AudioContext ohne Nutzergeste, und `main.js`
     startet lange davor. `ui.js` ruft das hier bei der ersten Berührung auf
     (Klick, Touch, Taste); jeder weitere Aufruf ist ein No-Op. */
  function init() {
    if (ctx || !an) return;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  /* An/Aus wie die Effektstufe: im Browser gemerkt, nicht im Spielstand —
     das Menü ruft das mit 'an'/'aus' auf und speichert den Rückgabewert. */
  function stufe(v) {
    an = v !== 'aus';
    if (ctx) {
      try { an ? ctx.resume().catch(function () {}) : ctx.suspend().catch(function () {}); }
      catch (e) {}
    }
    return an ? 'an' : 'aus';
  }

  function ton(freq, dauer, opt) {
    if (!ctx || !an) return;
    opt = opt || {};
    var t0 = ctx.currentTime + (opt.verzoegerung || 0);
    var o = ctx.createOscillator();
    o.type = opt.typ || 'sine';
    o.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (opt.bis) o.frequency.exponentialRampToValueAtTime(Math.max(1, opt.bis), t0 + dauer);
    var g = ctx.createGain();
    var vol = opt.vol === undefined ? 0.18 : opt.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (opt.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dauer + 0.02);
  }

  /* Weißes Rauschen aus einem Puffer statt eines zweiten Oszillatortyps —
     für Einschläge und Wind ist das der einzige Weg zu echtem Krach statt
     einem bloß tonalen Zischen. */
  function rauschen(dauer, opt) {
    if (!ctx || !an) return;
    opt = opt || {};
    var t0 = ctx.currentTime + (opt.verzoegerung || 0);
    var len = Math.max(1, Math.round(ctx.sampleRate * dauer));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var quelle = ctx.createBufferSource();
    quelle.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = opt.hoch ? 'highpass' : 'lowpass';
    filter.frequency.value = opt.freq || 1200;
    var g = ctx.createGain();
    var vol = opt.vol === undefined ? 0.2 : opt.vol;
    g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    quelle.connect(filter); filter.connect(g); g.connect(master);
    quelle.start(t0); quelle.stop(t0 + dauer + 0.02);
  }

  /* Ein Schlüsselwort bekommt eine eigene, aber reproduzierbare Stimme: der
     Hash aus dem Namen wählt Tonhöhe und Wellenform. Gift klingt also immer
     wie Gift, ohne dass hier eine Kopie von FARBE/FORM stehen muss. */
  var TYPEN = ['sine', 'triangle', 'square', 'sawtooth'];
  function stimme(kw) {
    var s = kw || '', h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return { freq: 300 + (h % 9) * 65, typ: TYPEN[(h >> 3) % TYPEN.length] };
  }

  /* -------------------------------------------------------- Kampfmomente */

  function klick() { ton(1500, 0.045, { typ: 'square', vol: 0.05, attack: 0.001 }); }

  function aktiv(kw) {
    var s = stimme(kw);
    ton(s.freq, 0.16, { typ: s.typ, vol: 0.14, bis: s.freq * 1.5, attack: 0.004 });
  }

  /* `anteil` ist der Schaden relativ zum maximalen Leben — daraus werden
     Lautstärke und Tiefe des Einschlags, genau wie das Brett seine Zeitlupe
     an denselben Höhepunkten (`beat`) festmacht. */
  function treffer(anteil, beat) {
    var a = Math.min(1, Math.max(0.06, anteil || 0.06));
    rauschen(0.09 + a * 0.08, { freq: 1000 - a * 500, vol: 0.12 + a * 0.22 });
    ton(140 - a * 50, 0.12, { typ: 'sine', vol: 0.08 + a * 0.16, bis: 40, attack: 0.001 });
    if (beat === 'toedlich' || beat === 'finale') rauschen(0.24, { freq: 450, vol: 0.22 });
  }

  function heilung() { ton(520, 0.28, { typ: 'sine', vol: 0.11, bis: 760 }); }

  function tod() {
    ton(170, 0.35, { typ: 'sine', vol: 0.15, bis: 50 });
    rauschen(0.2, { freq: 380, vol: 0.12 });
  }

  function resonanz() {
    [660, 880, 1100].forEach(function (f, i) {
      ton(f, 0.22, { typ: 'triangle', vol: 0.1, verzoegerung: i * 0.07 });
    });
  }

  function kombi() {
    ton(1400, 0.1, { typ: 'square', vol: 0.09 });
    ton(2100, 0.08, { typ: 'sine', vol: 0.07, verzoegerung: 0.03 });
  }

  function verwandlung() {
    ton(180, 0.9, { typ: 'sawtooth', vol: 0.13, bis: 520, attack: 0.25 });
    rauschen(0.5, { freq: 2200, vol: 0.09, verzoegerung: 0.35 });
  }

  function entladung() {
    rauschen(0.32, { freq: 220, vol: 0.24 });
    ton(70, 0.4, { typ: 'sine', vol: 0.2 });
  }

  function ausweichen() { rauschen(0.1, { freq: 3400, hoch: true, vol: 0.09 }); }

  function fehlschlag() { ton(200, 0.1, { typ: 'square', vol: 0.07, bis: 120 }); }

  function sieg() {
    [523, 659, 784, 1046].forEach(function (f, i) {
      ton(f, 0.3, { typ: 'triangle', vol: 0.13, verzoegerung: i * 0.12 });
    });
  }

  function niederlage() {
    [392, 349, 293].forEach(function (f, i) {
      ton(f, 0.5, { typ: 'sine', vol: 0.13, bis: f * 0.8, verzoegerung: i * 0.18 });
    });
  }

  root.Klang = {
    verfuegbar: verfuegbar, init: init, stufe: stufe,
    klick: klick, aktiv: aktiv, treffer: treffer, heilung: heilung, tod: tod,
    resonanz: resonanz, kombi: kombi, verwandlung: verwandlung,
    entladung: entladung, ausweichen: ausweichen, fehlschlag: fehlschlag,
    sieg: sieg, niederlage: niederlage
  };

})(globalThis);

});
