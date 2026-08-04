/* js/audio.js — Klangkulisse. Synthetisch statt Sample: keine Lizenzfrage,
   kein neuer Asset-Ordner, keine ASSETS.md-Zeile pro Klang, kein Netzzugriff.
   Jeder Ton entsteht zur Laufzeit aus der Web Audio API — ein paar Zeilen
   Oszillator und Rauschen, statt fünfzehn Dateien mit Herkunftsnachweis.

   `bereit()` legt den `AudioContext` erst beim ersten Klick an. Browser
   sperren Ton vor der ersten Nutzerinteraktion, und jsdom (dev/uitest.js)
   kennt `AudioContext` gar nicht — `Ctx` ist dort `undefined`, jede Funktion
   hier wird zum stillen No-Op.                                             */
'use strict';
(function (root) {

  var Ctx = root.AudioContext || root.webkitAudioContext;
  var ctx = null, meister = null;
  var an = true;
  try { an = localStorage.getItem('tensura-ton') !== 'aus'; } catch (e) {}

  function bereit() {
    if (!Ctx) return null;
    if (!ctx) {
      ctx = new Ctx();
      meister = ctx.createGain();
      meister.gain.value = 0.35;
      meister.connect(ctx.destination);
    }
    return ctx;
  }

  /* Vom ersten Klick aufgerufen (js/ui.js, `klick()`) — hebt die
     Autoplay-Sperre auf, lange bevor der erste Kampfton fällig wird. */
  function entsperren() {
    var c = bereit();
    if (c && c.state === 'suspended') c.resume();
  }

  /* Ein Oszillatorton mit kurzer Huellkurve: exponentiell rein, exponentiell
     raus. Linear klickt beim An- und Aussetzen, exponentiell nicht. */
  function ton(opt) {
    if (!an) return;
    var c = bereit();
    if (!c || c.state === 'suspended') return;
    var dauer = opt.dauer || 0.12;
    var t0 = c.currentTime;
    var osc = c.createOscillator();
    osc.type = opt.form || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, opt.von), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.bis || opt.von), t0 + dauer);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, opt.lautstaerke || 0.3), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    osc.connect(g); g.connect(meister);
    osc.start(t0);
    osc.stop(t0 + dauer + 0.02);
  }

  /* Gefiltertes Rauschen fuer Treffer und Einschlaege — ein Oszillator klingt
     dafuer zu sauber, ein Sample bräuchte eine Datei. */
  function knall(opt) {
    if (!an) return;
    var c = bereit();
    if (!c || c.state === 'suspended') return;
    var dauer = opt.dauer || 0.14;
    var n = Math.max(1, Math.round(c.sampleRate * dauer));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var src = c.createBufferSource();
    src.buffer = buf;
    var filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opt.frequenz || 1800;
    var g = c.createGain();
    g.gain.value = Math.max(0.001, opt.lautstaerke || 0.3);
    src.connect(filter); filter.connect(g); g.connect(meister);
    src.start(c.currentTime);
  }

  /* Ein Eintrag je Logtyp aus `js/combat.js`, dieselben Namen wie in
     `zeile()`/`zeige()` (js/ui.js) und `GEWICHT` (js/regie.js). `beat` sagt,
     ob die Regie diesen Moment als Hoehepunkt behandelt — grosse und
     toedliche Treffer bekommen zusaetzlich Gewicht im Ton, nicht nur im Bild. */
  function spiele(l, beat) {
    if (!an || !l) return;
    switch (l.type) {
      case 'hit': {
        var anteil = l.maxHp ? Math.min(1, l.dmg / l.maxHp) : 0.05;
        var schwer = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
        knall({ frequenz: 2200 - anteil * 1200, lautstaerke: 0.22 + anteil * 0.35,
                dauer: schwer ? 0.22 : 0.12 });
        if (schwer) ton({ form: 'sawtooth', von: 160, bis: 55,
                          dauer: beat === 'finale' ? 0.5 : 0.28, lautstaerke: 0.3 });
        break;
      }
      case 'heal':
        ton({ form: 'sine', von: 440, bis: 660, dauer: 0.22, lautstaerke: 0.24 });
        break;
      case 'death':
        ton({ form: 'triangle', von: 220, bis: 50, dauer: beat === 'finale' ? 0.9 : 0.4,
              lautstaerke: 0.4 });
        break;
      case 'revive':
        ton({ form: 'sine', von: 300, bis: 900, dauer: 0.45, lautstaerke: 0.3 });
        break;
      case 'aktiv':
        ton({ form: 'sawtooth', von: 220, bis: 520, dauer: 0.26, lautstaerke: 0.26 });
        break;
      case 'schild':
        ton({ form: 'square', von: 720, bis: 680, dauer: 0.08, lautstaerke: 0.2 });
        break;
      case 'status':
        ton({ form: 'sine', von: 520, bis: 420, dauer: 0.07, lautstaerke: 0.13 });
        break;
      case 'chaos':
        knall({ frequenz: 3200, lautstaerke: 0.12, dauer: 0.05 });
        break;
      case 'fehlschlag':
        ton({ form: 'square', von: 150, bis: 85, dauer: 0.18, lautstaerke: 0.24 });
        break;
      case 'ausweichen':
        ton({ form: 'sine', von: 900, bis: 1500, dauer: 0.14, lautstaerke: 0.18 });
        break;
      case 'wut':
        ton({ form: 'sawtooth', von: 100, bis: 220, dauer: 0.32, lautstaerke: 0.3 });
        break;
      case 'kombi':
      case 'entladung':
        knall({ frequenz: 2600, lautstaerke: 0.35, dauer: 0.28 });
        break;
      case 'verwandlung':
        ton({ form: 'sine', von: 180, bis: 1000, dauer: 0.75, lautstaerke: 0.35 });
        break;
    }
  }

  /* Vom Menü aufgerufen (`data-a="ton"`, js/ui.js) — spiegelbildlich zu
     `Brett3D.stufe()`. Gibt den neuen Zustand als String zurueck, damit die
     Anzeige (wie bei `effekte`) direkt aus dem Rueckgabewert lebt. */
  function stufe(v) {
    an = v !== 'aus';
    if (an) entsperren();
    return an ? 'an' : 'aus';
  }

  function aktiv() { return an; }

  root.Ton = { spiele: spiele, entsperren: entsperren, stufe: stufe, aktiv: aktiv };

})(typeof globalThis !== 'undefined' ? globalThis : this);
