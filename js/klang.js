/* js/klang.js — prozedurales Sounddesign, Web Audio API, keine Audiodateien.

   Bis hierher war jeder Kampf stumm: ein Zeitplan mit Gewicht und
   Vorausschau (Regie), ein Brett mit Rueckstoss und Bloom — aber kein einziger
   Ton. Genau wie bei den Figuren (ASSETS.md) fehlt eine Quelle fuer
   Audiodateien; anders als bei den Figuren braucht ein Ton aber keine. Ein
   Oszillator und ein Rauschgenerator reichen fuer Whoosh, Zap, Wums und
   Klirren — sechs Grundformen, dieselbe Kategorisierung wie `FORM` in
   `js/brett3d.js`, damit ein Blitz genauso klingt wie er blitzt.

   Name bewusst `Klang`, nicht `Audio` — das kollidiert sonst mit dem
   eingebauten `window.Audio`-Konstruktor.

   Kein Ton entsteht ohne eine Nutzergeste: Browser sperren den
   AudioContext, bis der erste Klick oder Tipp kommt. `wecken()` legt ihn bei
   Bedarf an und setzt ihn fort; ohne Web Audio API (oder in jsdom, wo es sie
   nicht gibt) bleibt `verfuegbar()` bei false, und das Spiel bleibt stumm,
   nicht kaputt. */
(function (root) {
  'use strict';

  var ctx = null;
  var master = null;
  var rauschPuffer = null;

  var an = true;
  try { an = localStorage.getItem('tensura-klang') !== 'aus'; } catch (e) {}

  function verfuegbar() {
    return typeof (root.AudioContext || root.webkitAudioContext) !== 'undefined';
  }

  /* Legt den Kontext einmalig an (stumm, wenn `an` gerade false ist) und holt
     ihn aus dem Sperrzustand, den jede Nutzergeste aufloest. Idempotent —
     `spiele()` ruft das vor jedem Ton auf, ohne dass es etwas kostet. */
  function wecken() {
    if (!verfuegbar()) return;
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = an ? 0.35 : 0;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setzeAn(wert) {
    an = !!wert;
    try { localStorage.setItem('tensura-klang', an ? 'an' : 'aus'); } catch (e) {}
    wecken();
    if (master) master.gain.value = an ? 0.35 : 0;
    return an;
  }

  function istAn() { return an; }

  /* Ein Sekunden-Puffer aus weissem Rauschen, einmal gebaut und wiederverwendet
     — die Quelle fuer alles Perkussive (Einschlag, Zerbersten, Klirren). */
  function rauschen() {
    if (!rauschPuffer || rauschPuffer.sampleRate !== ctx.sampleRate) {
      var n = ctx.sampleRate;
      rauschPuffer = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = rauschPuffer.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return rauschPuffer;
  }

  /* Attack-Hold-Release direkt auf einen GainNode, exponentiell aus statt
     linear — ein linearer Ausklang klickt hoerbar am Ende. */
  function huelle(gain, t0, attack, hold, release, peak) {
    var g = gain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + attack);
    g.setValueAtTime(peak, t0 + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  }

  /* Ein Oszillator mit Frequenzrampe — der Grundbaustein fuer Zap, Chime und
     Whoosh, je nach Wellenform und Richtung der Rampe. */
  function ton(freqA, freqB, dauer, form, peak, t0) {
    var osc = ctx.createOscillator();
    osc.type = form || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, freqA), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), t0 + dauer);
    var g = ctx.createGain();
    huelle(g, t0, Math.min(0.02, dauer * 0.15), dauer * 0.1, dauer * 0.75, peak);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dauer + 0.05);
  }

  /* Gefiltertes Rauschen — der Grundbaustein fuer Einschlag, Wums und
     Klirren, je nach Filtertyp und Frequenz. */
  function stoss(dauer, filterHz, peak, t0, filterTyp) {
    var quelle = ctx.createBufferSource();
    quelle.buffer = rauschen();
    var filter = ctx.createBiquadFilter();
    filter.type = filterTyp || 'bandpass';
    filter.frequency.value = filterHz;
    var g = ctx.createGain();
    huelle(g, t0, 0.002, dauer * 0.1, dauer * 0.85, peak);
    quelle.connect(filter); filter.connect(g); g.connect(master);
    quelle.start(t0); quelle.stop(t0 + dauer + 0.05);
  }

  /* Dieselbe Zuordnung Schluesselwort -> Grundform wie `FORM` in
     `js/brett3d.js` (dort nicht exportiert, deshalb hier dupliziert statt
     importiert — sechs Werte, die sich mit dem Vorbild aendern muessten). */
  var FORM = {
    brand: 'geschoss', gift: 'geschoss', frost: 'geschoss',
    donner: 'strahl', licht: 'strahl', dunkelheit: 'strahl',
    exekution: 'klinge', blutung: 'klinge', konter: 'klinge', verwundbar: 'klinge',
    flaeche: 'welle',
    heilung: 'saeule', schild: 'saeule', tempo: 'saeule',
    schatten: 'schleier', verderbnis: 'schleier', chaos: 'schleier'
  };

  function formKlang(form, t0) {
    if (form === 'geschoss') {
      stoss(0.22, 2200, 0.45, t0, 'bandpass');
      ton(900, 220, 0.18, 'sawtooth', 0.14, t0);
    } else if (form === 'strahl') {
      ton(1500, 1900, 0.12, 'square', 0.16, t0);
      stoss(0.08, 5200, 0.22, t0, 'highpass');
    } else if (form === 'klinge') {
      stoss(0.09, 3800, 0.38, t0, 'highpass');
      ton(2600, 1200, 0.14, 'triangle', 0.12, t0 + 0.02);
    } else if (form === 'welle') {
      ton(140, 55, 0.5, 'sine', 0.5, t0);
      stoss(0.4, 400, 0.28, t0, 'lowpass');
    } else if (form === 'saeule') {
      [0, 1, 2].forEach(function (i) {
        var f = 520 * Math.pow(1.2, i);
        ton(f, f * 1.35, 0.28, 'sine', 0.15, t0 + i * 0.045);
      });
    } else if (form === 'schleier') {
      ton(1200, 1500, 0.5, 'sine', 0.07, t0);
      ton(1206, 1520, 0.5, 'sine', 0.07, t0 + 0.01);
    } else {
      stoss(0.12, 1800, 0.22, t0, 'bandpass');
    }
  }

  /* Die eine Schnittstelle, die `js/ui.js` braucht: Ereignistyp rein, Ton
     raus. `kw` waehlt die Grundform bei `aktiv`, `staerke` (0..1) skaliert
     Lautstaerke und Tonhoehe eines Treffers, `beat` kommt unveraendert aus
     `Regie.zeitplan` — dieselbe Vorausschau, die dem Brett schon sagt, wann
     ein Treffer toedlich wird, sagt hier, wann er lauter werden soll. */
  function spiele(typ, kw, staerke, beat) {
    if (!verfuegbar()) return;
    wecken();
    if (!ctx || !master) return;
    var t0 = ctx.currentTime;
    var hart = beat === 'toedlich' || beat === 'finale' || beat === 'gross';
    if (typ === 'aktiv') {
      formKlang(FORM[kw] || 'strahl', t0);
    } else if (typ === 'hit') {
      var s = staerke == null ? 0.3 : staerke;
      stoss(hart ? 0.28 : 0.14, hart ? 260 : 900, Math.min(0.55, 0.16 + s * 0.4), t0, 'lowpass');
      if (hart) ton(180, 70, 0.3, 'sawtooth', 0.2, t0);
    } else if (typ === 'heal') {
      ton(700, 1100, 0.35, 'sine', 0.17, t0);
      ton(880, 1320, 0.32, 'sine', 0.13, t0 + 0.05);
    } else if (typ === 'death') {
      ton(300, 60, 0.7, 'sawtooth', 0.26, t0);
      stoss(0.5, 300, 0.18, t0, 'lowpass');
    } else if (typ === 'revive') {
      [0, 1, 2, 3].forEach(function (i) {
        ton(440 * Math.pow(1.26, i), 440 * Math.pow(1.26, i), 0.2, 'triangle', 0.13, t0 + i * 0.06);
      });
    } else if (typ === 'entladung') {
      formKlang('strahl', t0);
      stoss(0.35, 200, 0.35, t0, 'lowpass');
    } else if (typ === 'verwandlung') {
      ton(220, 880, 0.9, 'sawtooth', 0.2, t0);
      formKlang('schleier', t0 + 0.1);
    } else if (typ === 'kombi') {
      stoss(0.18, 4200, 0.32, t0, 'highpass');
      ton(1600, 400, 0.2, 'square', 0.14, t0);
    } else if (typ === 'ausweichen') {
      ton(1800, 2600, 0.1, 'sine', 0.09, t0);
    } else if (typ === 'fehlschlag') {
      ton(500, 180, 0.3, 'square', 0.11, t0);
    } else if (typ === 'ui') {
      ton(700, 700, 0.05, 'sine', 0.05, t0);
    }
  }

  root.Klang = { verfuegbar: verfuegbar, wecken: wecken, setzeAn: setzeAn, istAn: istAn, spiele: spiele };
})(typeof globalThis !== 'undefined' ? globalThis : this);
