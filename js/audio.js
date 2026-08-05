/* js/audio.js — Der Klang. Kein Sample im ganzen Spiel, nur Web-Audio-Synthese:
   dieselbe Haltung wie bei den Formen in js/brett3d.js — sechs Grundformen
   statt siebzehn Klänge, aus Oszillatoren und gefiltertem Rauschen gebaut,
   damit kein Asset mit Lizenzfrage ins Repo muss (siehe ASSETS.md, Abschnitt
   „Klang").

   Rein: kein DOM außer dem AudioContext selbst, kein three.js. `Ton.spiele`
   liest nur, was ohnehin im Kampflog steht (`l.type`, `l.kw`, `l.dmg`, …) —
   dieselben Felder, die js/ui.js schon an Brett3D reicht. Deshalb hängt der
   Aufruf in js/ui.js direkt neben `zeige(l, p.beat)`, nicht daran.

   Browser sperren Ton, bis eine echte Nutzergeste ihn freigibt — der erste
   Klick im Spiel holt das nach (`entsperren`, aus dem Klick-Dispatch in
   js/ui.js). Vorher schedulen die Funktionen unten trotzdem; sie laufen nur
   lautlos, bis der Kontext freigegeben ist.                                 */
'use strict';
(function (root) {

  /* Merken ist js/ui.js' Aufgabe, wie bei `Brett3D.stufe` auch — hier zählt
     nur der Zustand seit dem letzten Aufruf von `stufe`. */
  var ctx = null, master = null, an = true, rauschPuffer = null;

  function start() {
    if (ctx || !an) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function entsperren() {
    if (an && !ctx) start();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
  }

  function verfuegbar() { return an && !!ctx; }

  function stufe(v) {
    an = v !== 'aus';
    if (an) entsperren(); else if (ctx) ctx.suspend().catch(function () {});
    return an ? 'an' : 'aus';
  }

  /* Ein Sekunde Rauschen, einmal gebaut und für jeden Knall wiederverwendet
     — dieselbe Textur, nur mit anderem Bandpass und Hüllkurve angesprochen. */
  function rauschen() {
    if (rauschPuffer) return rauschPuffer;
    var n = ctx.sampleRate;
    rauschPuffer = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = rauschPuffer.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return rauschPuffer;
  }

  /* Ein Oszillatorton mit exponentieller Hüllkurve — `bis` gleitet die
     Tonhöhe, `0` lässt sie stehen. Exponentiell statt linear, weil ein
     linearer Abfall wie ein Klick am Ende klingt, kein Ausklingen. */
  function ton(t, freq, dauer, typ, gain, bis) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = typ;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (bis) o.frequency.exponentialRampToValueAtTime(Math.max(20, bis), t + dauer);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dauer + 0.03);
  }

  /* Gefiltertes Rauschen — der Knall, das Zischen, die Klinge. `hz`/`q`
     setzen den Bandpass, `gain` und `dauer` die Hüllkurve. */
  function knall(t, dauer, gain, hz, q) {
    var quelle = ctx.createBufferSource();
    quelle.buffer = rauschen();
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(hz, t);
    filter.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    quelle.connect(filter); filter.connect(g); g.connect(master);
    quelle.start(t); quelle.stop(t + dauer + 0.03);
  }

  /* -------------------------------------------------------------- Formen
     Dieselbe Zuordnung wie `FORM` in js/brett3d.js — absichtlich hier noch
     einmal hingeschrieben statt importiert: Ton kennt kein Brett und soll
     auch ohne eins (Textmodus, `Brett3D.verfuegbar() === false`) spielen. */
  var KW_FORM = {
    brand: 'geschoss', gift: 'geschoss', frost: 'geschoss',
    donner: 'strahl', licht: 'strahl', dunkelheit: 'strahl',
    exekution: 'klinge', blutung: 'klinge', konter: 'klinge', verwundbar: 'klinge',
    flaeche: 'welle',
    heilung: 'saeule', schild: 'saeule', tempo: 'saeule',
    schatten: 'schleier', verderbnis: 'schleier', chaos: 'schleier'
  };

  var FORM_KLANG = {
    /* Wurf, dann Einschlag — derselbe zweigeteilte Ablauf wie im Bild. */
    geschoss: function (t) { ton(t, 340, 0.12, 'sawtooth', 0.07, 140); knall(t + 0.10, 0.07, 0.16, 1100, 4); },
    /* Ein gestrecktes Glissando, so lang wie das Quad im Bild steht. */
    strahl: function (t) { ton(t, 220, 0.26, 'sawtooth', 0.08, 1400); },
    /* Ein einzelner scharfer Schnitt, kein Ausklingen. */
    klinge: function (t) { knall(t, 0.06, 0.20, 2800, 7); },
    /* Tiefer Bodenstoß statt Höhe — die Welle drückt, sie klingt nicht. */
    welle: function (t) { knall(t, 0.28, 0.16, 200, 0.6); ton(t, 85, 0.28, 'sine', 0.13, 55); },
    /* Aufsteigender Zweiklang, wie der Ring, der an der eigenen Figur hochsteigt. */
    saeule: function (t) { ton(t, 460, 0.34, 'sine', 0.08, 720); ton(t + 0.05, 600, 0.30, 'sine', 0.05, 860); },
    /* Kreisende Funken werden zu einem leisen, langsam schwebenden Klirren. */
    schleier: function (t) { knall(t, 0.32, 0.07, 1500, 1.1); }
  };

  /* ---------------------------------------------------------- Kampfzüge */

  function hit(t, l, beat) {
    var rel = l.maxHp ? l.dmg / l.maxHp : 0;
    var schwer = beat === 'toedlich' || beat === 'finale' || beat === 'gross';
    knall(t, schwer ? 0.16 : 0.08, Math.min(0.30, 0.09 + rel * 0.55), schwer ? 220 : 520, schwer ? 1.3 : 2.4);
    ton(t + 0.005, schwer ? 90 : 150, 0.10, 'triangle', 0.11);
  }

  function spiele(l, beat) {
    if (!verfuegbar()) return;
    var t = ctx.currentTime;
    if (l.type === 'aktiv') (FORM_KLANG[KW_FORM[l.kw]] || FORM_KLANG.geschoss)(t);
    else if (l.type === 'hit') hit(t, l, beat);
    else if (l.type === 'heal') { ton(t, 660, 0.22, 'sine', 0.07, 880); ton(t + 0.05, 880, 0.20, 'sine', 0.05, 1046); }
    else if (l.type === 'schild') ton(t, 420, 0.12, 'triangle', 0.07, 640);
    else if (l.type === 'ausweichen') knall(t, 0.05, 0.06, 1900, 2.5);
    else if (l.type === 'skip') ton(t, 160, 0.10, 'sine', 0.04, 120);
    else if (l.type === 'widersteht') knall(t, 0.10, 0.10, 800, 1.5);
    else if (l.type === 'fehlschlag') { knall(t, 0.14, 0.10, 300, 0.8); ton(t, 200, 0.14, 'sawtooth', 0.05, 90); }
    else if (l.type === 'revive') { ton(t, 340, 0.30, 'sine', 0.09, 760); ton(t + 0.08, 500, 0.26, 'sine', 0.07, 900); }
    else if (l.type === 'wut' || l.type === 'kombi' || l.type === 'entladung') { knall(t, 0.20, 0.15, 650, 1); ton(t, 130, 0.20, 'sawtooth', 0.08, 260); }
    else if (l.type === 'verwandlung') { knall(t, 0.42, 0.16, 500, 0.7); ton(t, 140, 0.55, 'sawtooth', 0.10, 560); }
    else if (l.type === 'death') ton(t, beat === 'finale' ? 70 : 110, beat === 'finale' ? 0.9 : 0.45, 'sine', 0.15, 32);
    else if (l.type === 'end') { if (l.winner === 'player') sieg(t); else niederlage(t); }
  }

  function sieg(t) {
    [0, 0.10, 0.20].forEach(function (dt, i) { ton(t + dt, 440 * Math.pow(1.26, i), 0.30, 'triangle', 0.10); });
  }
  function niederlage(t) {
    ton(t, 220, 0.7, 'sawtooth', 0.10, 110);
    ton(t + 0.10, 180, 0.8, 'sawtooth', 0.08, 90);
  }

  root.Ton = { stufe: stufe, verfuegbar: verfuegbar, entsperren: entsperren, spiele: spiele };

})(typeof globalThis !== 'undefined' ? globalThis : this);
