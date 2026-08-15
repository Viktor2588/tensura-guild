/* js/klang.js — Klang: prozedurale Soundeffekte über die Web Audio API.

   Kein Audiofile im Repo, aus demselben Grund wie js/fx.js keinen Fremdcode
   für Bloom lädt: das Spiel soll offline laufen und ohne Bauschritt bleiben.
   Jeder Ton entsteht zur Laufzeit aus Oszillatoren und gefiltertem Rauschen —
   keine Lizenzfrage, keine Ladezeit, keine zusätzliche Datei in ASSETS.md.

   Die Zuordnung Ereignis → Klangfarbe folgt derselben Achse wie die Marken
   auf dem Brett: Schlüsselwort-FAMILIEN statt Einzelfälle (Feuer, Eis, Blitz,
   Dunkel, Metall, Segen, Chaos) — sonst bräuchte jede der 18 Marken einen
   eigenen Klang gegen jede der anderen 17.

   Name bewusst nicht `Audio`: das ist im Browser schon der Konstruktor des
   `<audio>`-Elements, ein zweiter globaler `Audio` würde ihn verdecken.

   Ohne AudioContext (jsdom im UI-Test, sehr alte Browser) passiert hier
   nichts — `verfuegbar()` sagt nein, genau wie bei `Brett3D.verfuegbar()`,
   und jeder Aufruf wird zum No-op statt zum Fehler.                        */
'use strict';
(function (root) {

  var ctx = null, master = null, rauschpuffer = null, kannAudio = null;
  var stufe = 'voll';

  function zielLautstaerke() {
    return stufe === 'aus' ? 0 : stufe === 'leise' ? 0.32 : 0.85;
  }

  function verfuegbar() {
    if (stufe === 'aus') return false;
    if (kannAudio === null) kannAudio = !!(root.AudioContext || root.webkitAudioContext);
    return kannAudio;
  }

  /* Der Kontext entsteht erst beim ersten Ton: Autoplay-Regeln verlangen eine
     Nutzergeste, `init()` wird deshalb aus dem globalen Klick-Handler in
     ui.js aufgerufen — vor jeder Aktion, nicht nur vor dem ersten Kampf. */
  function kontext() {
    if (ctx) return ctx;
    var K = root.AudioContext || root.webkitAudioContext;
    if (!K) return null;
    ctx = new K();
    master = ctx.createGain();
    master.gain.value = zielLautstaerke();
    master.connect(ctx.destination);
    return ctx;
  }

  function init() {
    if (!verfuegbar()) return;
    var c = kontext();
    if (c && c.state === 'suspended') c.resume().catch(function () {});
  }

  function setzeStufe(s) {
    if (s !== 'voll' && s !== 'leise' && s !== 'aus') return stufe;
    stufe = s;
    if (master) master.gain.value = zielLautstaerke();
    if (s !== 'aus') init();
    return stufe;
  }

  /* Ein Sekundenpuffer weißes Rauschen, einmal erzeugt und für jeden Krach
     wiederverwendet — neu würfeln bräuchte es nicht, der Bandpassfilter
     macht aus demselben Rauschen ohnehin jedes Mal etwas anderes. */
  function rauschen() {
    if (rauschpuffer) return rauschpuffer;
    var c = kontext();
    if (!c) return null;
    var n = Math.round(c.sampleRate * 0.5);
    var puffer = c.createBuffer(1, n, c.sampleRate);
    var daten = puffer.getChannelData(0);
    for (var i = 0; i < n; i++) daten[i] = Math.random() * 2 - 1;
    rauschpuffer = puffer;
    return rauschpuffer;
  }

  /* Tonschwenk mit exponentieller Hüllkurve: schneller Anstieg, Ausklang
     Richtung `f1`. Ein fallender Schwenk gibt einem Treffer Gewicht, ein
     steigender einer Heilung Leichtigkeit — dieselbe Funktion für beide. */
  function ton(o) {
    var c = kontext();
    if (!c) return;
    var jetzt = c.currentTime + (o.verzoegerung || 0);
    var dauer = o.dauer || 0.2;
    var osz = c.createOscillator();
    osz.type = o.typ || 'sine';
    osz.frequency.setValueAtTime(Math.max(1, o.f0), jetzt);
    osz.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 || o.f0), jetzt + dauer);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, jetzt);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, o.vol || 0.3), jetzt + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    osz.connect(g);
    g.connect(master);
    osz.start(jetzt);
    osz.stop(jetzt + dauer + 0.02);
  }

  /* Gefiltertes Rauschen für alles, was nicht tonal ist: Einschläge, Zischen,
     Knistern, das Klirren eines Schilds. */
  function krach(o) {
    var c = kontext();
    var puffer = rauschen();
    if (!c || !puffer) return;
    var jetzt = c.currentTime + (o.verzoegerung || 0);
    var dauer = o.dauer || 0.15;
    var quelle = c.createBufferSource();
    quelle.buffer = puffer;
    var filter = c.createBiquadFilter();
    filter.type = o.filterTyp || 'bandpass';
    filter.frequency.value = o.filter || 1200;
    filter.Q.value = o.q || 0.9;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, jetzt);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, o.vol || 0.3), jetzt + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    quelle.connect(filter);
    filter.connect(g);
    g.connect(master);
    var start = Math.random() * (rauschpuffer.duration - dauer - 0.05);
    quelle.start(jetzt, Math.max(0, start));
    quelle.stop(jetzt + dauer + 0.02);
  }

  /* Schlüsselwörter bündeln sich zu sieben Klangfamilien — dieselbe Anzahl,
     mit der `js/brett3d.js` schon Marken auf dem Brett vergibt (Kap. 76). */
  var FAMILIEN = {
    brand: 'feuer',
    frost: 'eis',
    donner: 'blitz', licht: 'blitz',
    gift: 'dunkel', verderbnis: 'dunkel', schatten: 'dunkel',
    dunkelheit: 'dunkel', blutung: 'dunkel', verwundbar: 'dunkel',
    schild: 'metall', konter: 'metall',
    heilung: 'segen',
    chaos: 'chaos', antichaos: 'chaos'
  };
  function familie(kw) { return FAMILIEN[kw] || 'arkan'; }

  function castKlang(fam) {
    switch (fam) {
      case 'feuer':
        krach({ filter: 1800, filterTyp: 'bandpass', dauer: .3, vol: .5 });
        ton({ typ: 'sawtooth', f0: 180, f1: 70, dauer: .25, vol: .22 });
        break;
      case 'eis':
        ton({ typ: 'sine', f0: 1500, f1: 2300, dauer: .35, vol: .28, attack: .02 });
        ton({ typ: 'triangle', f0: 2300, f1: 3100, dauer: .3, vol: .14, verzoegerung: .04 });
        break;
      case 'blitz':
        krach({ filter: 4200, filterTyp: 'highpass', dauer: .1, vol: .45 });
        ton({ typ: 'square', f0: 2200, f1: 180, dauer: .1, vol: .2 });
        break;
      case 'dunkel':
        ton({ typ: 'sawtooth', f0: 130, f1: 65, dauer: .4, vol: .28 });
        krach({ filter: 400, filterTyp: 'lowpass', dauer: .3, vol: .25 });
        break;
      case 'metall':
        ton({ typ: 'triangle', f0: 1300, f1: 950, dauer: .3, vol: .28 });
        ton({ typ: 'sine', f0: 2500, f1: 1900, dauer: .4, vol: .14, verzoegerung: .02 });
        break;
      case 'segen':
        ton({ typ: 'sine', f0: 680, f1: 1080, dauer: .4, vol: .28 });
        ton({ typ: 'sine', f0: 1020, f1: 1420, dauer: .45, vol: .18, verzoegerung: .05 });
        break;
      case 'chaos':
        ton({ typ: 'square', f0: 300 + Math.random() * 400, f1: 150 + Math.random() * 300, dauer: .2, vol: .22 });
        break;
      default:
        ton({ typ: 'sine', f0: 600, f1: 420, dauer: .22, vol: .28 });
        krach({ filter: 1500, dauer: .15, vol: .18 });
    }
  }

  /* Ein Eintrag je Logtyp aus `combat.js`, dieselbe Liste, die `zeile()` und
     `zeige()` in ui.js schon kennen. `beat` kommt aus `Regie.zeitplan` und
     macht große Treffer auch hörbar größer — dieselbe Information, die dem
     Brett schon die Zeitlupe gibt. */
  function spiele(l, beat) {
    if (!verfuegbar() || !l) return;
    var gross = beat === 'gross' || beat === 'toedlich' || beat === 'finale' || beat === 'wende';
    switch (l.type) {
      case 'hit': {
        var anteil = l.maxHp ? l.dmg / l.maxHp : 0.1;
        var staerke = Math.min(1, 0.25 + anteil * 2);
        krach({ filter: 900 - staerke * 400, filterTyp: 'lowpass', dauer: .1 + staerke * .15, vol: .32 + staerke * .35 });
        ton({ typ: 'sine', f0: 220 - staerke * 90, f1: 90 - staerke * 40, dauer: .12 + staerke * .1, vol: .22 + staerke * .25 });
        break;
      }
      case 'death':
        ton({ typ: 'sawtooth', f0: 260, f1: 40, dauer: .6, vol: .38 });
        krach({ filter: 500, filterTyp: 'lowpass', dauer: .5, vol: .3, verzoegerung: .04 });
        break;
      case 'heal':
        ton({ typ: 'sine', f0: 500, f1: 900, dauer: .35, vol: .28 });
        ton({ typ: 'sine', f0: 750, f1: 1150, dauer: .4, vol: .16, verzoegerung: .06 });
        break;
      case 'revive':
        ton({ typ: 'sine', f0: 300, f1: 1200, dauer: .6, vol: .32 });
        break;
      case 'schild':
        ton({ typ: 'triangle', f0: 1000, f1: 700, dauer: .18, vol: .2 });
        break;
      case 'status':
        ton({ typ: 'sine', f0: 500, f1: 620, dauer: .1, vol: .1 });
        break;
      case 'ausweichen':
        krach({ filter: 2600, filterTyp: 'highpass', dauer: .12, vol: .18 });
        break;
      case 'widersteht':
        ton({ typ: 'square', f0: 700, f1: 500, dauer: .1, vol: .13 });
        break;
      case 'fehlschlag':
        ton({ typ: 'sawtooth', f0: 200, f1: 90, dauer: .25, vol: .22 });
        break;
      case 'skip':
        ton({ typ: 'sine', f0: 300, f1: 260, dauer: .12, vol: .1 });
        break;
      case 'wut':
        ton({ typ: 'sawtooth', f0: 100, f1: 220, dauer: .35, vol: .28 });
        krach({ filter: 700, dauer: .3, vol: .18 });
        break;
      case 'kombi':
        krach({ filter: 2200, filterTyp: 'bandpass', dauer: .3, vol: .38 });
        ton({ typ: 'square', f0: 400, f1: 120, dauer: .25, vol: .22 });
        break;
      case 'entladung':
        krach({ filter: 5000, filterTyp: 'highpass', dauer: .25, vol: .38 });
        ton({ typ: 'square', f0: 2400, f1: 300, dauer: .2, vol: .18 });
        break;
      case 'verwandlung':
        ton({ typ: 'sine', f0: 200, f1: 1600, dauer: 1.1, vol: .32 });
        ton({ typ: 'triangle', f0: 400, f1: 2000, dauer: 1.0, vol: .18, verzoegerung: .1 });
        break;
      case 'resonanz':
        ton({ typ: 'sine', f0: 300, f1: 1000, dauer: .5, vol: .28 });
        ton({ typ: 'sine', f0: 450, f1: 1400, dauer: .55, vol: .18, verzoegerung: .06 });
        break;
      case 'aktiv':
        castKlang(familie(l.kw));
        break;
      case 'end':
        if (l.winner === 'player') {
          ton({ typ: 'sine', f0: 520, f1: 780, dauer: .5, vol: .34 });
          ton({ typ: 'sine', f0: 780, f1: 1040, dauer: .5, vol: .26, verzoegerung: .12 });
          ton({ typ: 'sine', f0: 1040, f1: 1560, dauer: .6, vol: .2, verzoegerung: .24 });
        } else if (l.winner === 'enemy') {
          ton({ typ: 'sawtooth', f0: 300, f1: 70, dauer: .9, vol: .3 });
        }
        break;
      default:
        return;
    }
    if (gross && (l.type === 'hit' || l.type === 'aktiv')) {
      krach({ filter: 300, filterTyp: 'lowpass', dauer: .3, vol: .22, verzoegerung: .02 });
    }
  }

  /* Ein einzelner, günstiger Klick — für Menü und Käufe, nicht an ein
     Kampfereignis gebunden. */
  function klick() {
    if (!verfuegbar()) return;
    ton({ typ: 'sine', f0: 720, f1: 520, dauer: .06, vol: .14 });
  }

  root.Klang = {
    verfuegbar: verfuegbar, init: init, stufe: setzeStufe,
    spiele: spiele, klick: klick, familie: familie
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);
