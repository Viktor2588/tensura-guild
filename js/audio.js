/* js/audio.js — Klang: Treffer, Tod, Heilung, Sieg, UI-Klick.

   Warum synthetisiert und keine Audiodatei: dieselbe Haltung wie js/fx.js —
   kein Bauschritt, keine Abhaengigkeit, keine Lizenzfrage. Web Audio kann
   Rauschen, Sinus und Huellkurven von Haus aus; fuer Treffer, Tod und ein
   paar Klicks reicht das, ganz ohne eine Datei ins Repo zu legen.

   Der AudioContext startet erst nach der ersten Klickgeste (`entsperren`) —
   Browser verweigern jeden Ton davor. `js/ui.js` ruft das im zentralen
   Klick-Dispatcher auf, noch bevor irgendein anderer Sound faellig wird.

   Rein: kein DOM ausser AudioContext selbst, kein Zustand, der das Spiel
   beeinflusst. Fehlt Web Audio (Node/jsdom bei den Tests), bleibt jede
   Funktion hier ein stilles No-Op — `dev/uitest.js` laedt diese Datei mit,
   ohne dass ein Ton faellig wird oder ein Fehler geworfen wird.            */
'use strict';
(function (root) {

  var ctx = null, meister = null, rauschPuffer = null;
  var an = true;
  try { an = (localStorage.getItem('tensura-klang') || 'an') !== 'aus'; } catch (e) {}

  function entsperren() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    meister = ctx.createGain();
    meister.gain.value = an ? 0.6 : 0;
    meister.connect(ctx.destination);
    rauschPuffer = weissesRauschen();
  }

  /* Zwei Sekunden Rauschen, einmal erzeugt und fuer jeden Treffer wiederverwendet —
     ein Trefferklang ist ein kurzer, gefilterter Ausschnitt daraus. */
  function weissesRauschen() {
    var laenge = ctx.sampleRate * 2;
    var puffer = ctx.createBuffer(1, laenge, ctx.sampleRate);
    var daten = puffer.getChannelData(0);
    for (var i = 0; i < laenge; i++) daten[i] = Math.random() * 2 - 1;
    return puffer;
  }

  function stufe(v) {
    an = v !== 'aus';
    try { localStorage.setItem('tensura-klang', an ? 'an' : 'aus'); } catch (e) {}
    if (meister) meister.gain.setTargetAtTime(an ? 0.6 : 0, ctx.currentTime, 0.05);
    return an ? 'an' : 'aus';
  }

  function bereit() { return !!(ctx && an); }

  function ton(freq, dauer, typ, lautstaerke, verzoegerung) {
    if (!bereit()) return;
    var t0 = ctx.currentTime + (verzoegerung || 0);
    var osc = ctx.createOscillator();
    osc.type = typ || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(lautstaerke || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    osc.connect(g); g.connect(meister);
    osc.start(t0); osc.stop(t0 + dauer + 0.02);
  }

  function gleiten(von, bis, dauer, typ, lautstaerke, verzoegerung) {
    if (!bereit()) return;
    var t0 = ctx.currentTime + (verzoegerung || 0);
    var osc = ctx.createOscillator();
    osc.type = typ || 'sine';
    osc.frequency.setValueAtTime(von, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, bis), t0 + dauer);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(lautstaerke || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    osc.connect(g); g.connect(meister);
    osc.start(t0); osc.stop(t0 + dauer + 0.02);
  }

  /* Gefiltertes Rauschen mit fallender Grenzfrequenz — klingt nach Anschlag
     (Aufprall, Knacken), nicht nach reinem Ton. Fuer Treffer und Entladung. */
  function rauschStoss(dauer, tiefpass, lautstaerke, verzoegerung) {
    if (!bereit()) return;
    var t0 = ctx.currentTime + (verzoegerung || 0);
    var quelle = ctx.createBufferSource();
    quelle.buffer = rauschPuffer;
    quelle.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(tiefpass, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, tiefpass * 0.3), t0 + dauer);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(lautstaerke || 0.3, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    quelle.connect(filter); filter.connect(g); g.connect(meister);
    quelle.start(t0); quelle.stop(t0 + dauer + 0.02);
  }

  /* ---------------------------------------------------------- Kampf */

  /* `l` ist ein Logeintrag aus combat.js, `beat` der Regie-Hoehepunkt
     (js/regie.js) — dieselben zwei Werte, mit denen js/ui.js auch das
     Brett steuert (Zeitlupe, Kameraschwenk). */
  function spiele(l, beat) {
    if (!bereit()) return;
    var gross = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
    switch (l.type) {
      case 'hit':
        rauschStoss(gross ? 0.22 : 0.1, gross ? 1800 : 2600, gross ? 0.5 : 0.22);
        if (gross) ton(70, 0.18, 'sine', 0.35);
        break;
      case 'heal':
        gleiten(520, 780, 0.22, 'triangle', 0.18);
        break;
      case 'schild':
        ton(1100, 0.08, 'triangle', 0.15);
        break;
      case 'status':
        ton(320, 0.05, 'square', 0.06);
        break;
      case 'aktiv':
        gleiten(220, 660, 0.3, 'sawtooth', 0.14);
        break;
      case 'entladung':
        rauschStoss(0.3, 3000, 0.35);
        break;
      case 'wut':
        gleiten(140, 260, 0.2, 'sawtooth', 0.2);
        break;
      case 'revive':
        gleiten(300, 900, 0.4, 'sine', 0.2);
        break;
      case 'verwandlung':
        gleiten(160, 640, 0.55, 'sawtooth', 0.25);
        break;
      case 'death':
        gleiten(320, 60, beat === 'finale' ? 0.7 : 0.4, 'sawtooth', beat === 'finale' ? 0.4 : 0.25);
        break;
    }
  }

  /* ------------------------------------------------------------- UI */

  function taste() {
    ton(700, 0.05, 'square', 0.05);
  }

  /* Sieg: kleiner Dreiklang aufwaerts. Niederlage: ein einzelnes Gleiten
     abwaerts. `sieger` ist `res.winner` aus combat.js ('player'/'enemy'/'draw'). */
  function ende(sieger) {
    if (sieger === 'player') {
      [523, 659, 784].forEach(function (freq, i) {
        ton(freq, 0.22, 'triangle', 0.22, i * 0.09);
      });
    } else if (sieger === 'enemy') {
      gleiten(220, 90, 0.6, 'sawtooth', 0.22);
    }
  }

  root.Klang = { entsperren: entsperren, stufe: stufe, spiele: spiele, taste: taste, ende: ende };

})(typeof globalThis !== 'undefined' ? globalThis : this);
