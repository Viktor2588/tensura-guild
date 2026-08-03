/* js/audio.js — Klang: prozedurale Toneffekte per Web Audio API.

   Kein einziges Sample im Repo: jeder Ton entsteht zur Laufzeit aus
   Oszillatoren und einem geteilten Rauschpuffer, genau wie die Platzhalter in
   `js/brett3d.js` und der Aktverlauf in Phase 60 zur Laufzeit auf ein Canvas
   gezeichnet werden statt aus einer Datei zu kommen. Keine Lizenzfrage, kein
   Bauschritt, keine fuenfzig weiteren Dateien im Repo.

   Ohne Web Audio API passiert hier gar nichts — `verfuegbar()` sagt nein, und
   jeder Aufruf von `spiele()` ist dann ein no-op. Das haelt `dev/uitest.js`
   (jsdom kennt kein AudioContext) unveraendert gruen, ohne dass diese Datei
   von der Testumgebung weiss.

   Ein Zaehler aktiver Stimmen begrenzt, was gleichzeitig klingt: bei Tempo
   x4 laeuft `schritt()` in js/ui.js bis zu 500 mal in einer einzigen Bildzeit
   (siehe `pumpe()`), und ohne Deckel waeren das ebenso viele ueberlappende
   Toene — ein Rauschen statt eines Kampfes. */
'use strict';
(function (root) {

  var ctx = null, meister = null, rauschPuffer = null;
  var stufe = 'voll';
  try { stufe = (root.localStorage && localStorage.getItem('tensura-klang')) || 'voll'; } catch (e) {}
  if (stufe !== 'voll' && stufe !== 'sparsam' && stufe !== 'aus') stufe = 'voll';

  var stimmenAktiv = 0, STIMMEN_MAX = 14;

  function verfuegbar() {
    if (stufe === 'aus') return false;
    return !!(root.AudioContext || root.webkitAudioContext);
  }

  function kontext() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      meister = ctx.createGain();
      meister.gain.value = stufe === 'sparsam' ? 0.32 : 0.65;
      meister.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  /* Ein gemeinsamer Rauschpuffer fuer alle Perkussion — Erstellen ist teurer
     als Wiederverwenden, und bei vielen Treffern je Sekunde zaehlt das. */
  function puffer(c) {
    if (rauschPuffer) return rauschPuffer;
    var n = c.sampleRate * 0.3;
    rauschPuffer = c.createBuffer(1, n, c.sampleRate);
    var d = rauschPuffer.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return rauschPuffer;
  }

  /* Jede Quelle zaehlt sich selbst: `stimmeAn` beim Start, `stimmeAus` an
     ihrem eigenen `onended` — nicht an einem geschaetzten Timeout. Ein
     Rezept wie `heal` oder `end` startet mehrere Oszillatoren mit
     unterschiedlicher Laufzeit; ein fester Timer haette den Schlitz
     freigegeben, bevor die eigentliche Quelle verklungen ist. */
  function stimmeAn() { stimmenAktiv++; }
  function stimmeAus() { stimmenAktiv = Math.max(0, stimmenAktiv - 1); }

  /* Ein Ton: Sinus/Dreieck/Rechteck mit exponentieller Gleitkurve und
     Huellkurve. `bis` laesst die Frequenz waehrend des Tons wandern — das ist
     der Unterschied zwischen einem Blip und einem Einschlag. */
  function ton(c, opts) {
    var t0 = c.currentTime + (opts.verzoegerung || 0);
    var dauer = opts.dauer || 0.2;
    var o = c.createOscillator();
    o.type = opts.form || 'sine';
    o.frequency.setValueAtTime(Math.max(1, opts.frequenz || 440), t0);
    if (opts.bis) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.bis), t0 + dauer);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, opts.lautstaerke || 0.5), t0 + (opts.anstieg || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    o.connect(g); g.connect(meister);
    stimmeAn();
    o.onended = stimmeAus;
    o.start(t0); o.stop(t0 + dauer + 0.05);
  }

  /* Perkussion aus dem geteilten Rauschpuffer, gefiltert und schnell
     ausklingend — ein Einschlag, kein Zischen. */
  function schlag(c, opts) {
    var t0 = c.currentTime + (opts.verzoegerung || 0);
    var dauer = opts.dauer || 0.12;
    var src = c.createBufferSource();
    src.buffer = puffer(c);
    var filt = c.createBiquadFilter();
    filt.type = opts.filterTyp || 'lowpass';
    filt.frequency.value = opts.frequenz || 1200;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, opts.lautstaerke || 0.4), t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    src.connect(filt); filt.connect(g); g.connect(meister);
    stimmeAn();
    src.onended = stimmeAus;
    src.start(t0); src.stop(t0 + dauer + 0.05);
  }

  /* -------------------------------------------------------------- Rezepte */

  var GROSS_BEATS = { gross: 1, toedlich: 1, finale: 1 };

  var REZEPTE = {
    hit: function (c, info) {
      var frac = Math.min(1, (info.dmg || 0) / Math.max(1, info.maxHp || 1) / 0.12);
      var gross = !!GROSS_BEATS[info.beat];
      schlag(c, { frequenz: 900 - frac * 500, dauer: gross ? 0.22 : 0.11,
                  lautstaerke: 0.28 + frac * 0.22 });
      ton(c, { form: 'triangle', frequenz: gross ? 160 : 220, bis: gross ? 70 : 110,
               dauer: gross ? 0.26 : 0.13, lautstaerke: 0.22 + frac * 0.18 });
    },
    heal: function (c) {
      ton(c, { form: 'sine', frequenz: 520, bis: 660, dauer: 0.22, lautstaerke: 0.22 });
      ton(c, { form: 'sine', frequenz: 660, bis: 780, dauer: 0.24, verzoegerung: 0.05, lautstaerke: 0.16 });
    },
    schild: function (c) {
      ton(c, { form: 'triangle', frequenz: 900, bis: 1100, dauer: 0.12, lautstaerke: 0.18 });
    },
    revive: function (c) {
      [440, 554, 659].forEach(function (f, i) {
        ton(c, { form: 'sine', frequenz: f, dauer: 0.2, verzoegerung: i * 0.08, lautstaerke: 0.2 });
      });
    },
    death: function (c, info) {
      var gross = info.beat === 'finale';
      schlag(c, { frequenz: 500, dauer: 0.3, lautstaerke: 0.3, filterTyp: 'lowpass' });
      ton(c, { form: 'sawtooth', frequenz: gross ? 260 : 220, bis: 55, dauer: gross ? 0.7 : 0.45,
               lautstaerke: gross ? 0.26 : 0.2 });
    },
    skip: function (c) {
      schlag(c, { frequenz: 300, dauer: 0.1, lautstaerke: 0.18 });
    },
    widersteht: function (c) {
      ton(c, { form: 'square', frequenz: 700, bis: 900, dauer: 0.09, lautstaerke: 0.12 });
    },
    ausweichen: function (c) {
      schlag(c, { frequenz: 2200, dauer: 0.08, lautstaerke: 0.14, filterTyp: 'highpass' });
    },
    fehlschlag: function (c) {
      ton(c, { form: 'square', frequenz: 300, bis: 140, dauer: 0.18, lautstaerke: 0.16 });
    },
    wut: function (c) {
      ton(c, { form: 'square', frequenz: 110, dauer: 0.22, lautstaerke: 0.2 });
      ton(c, { form: 'sawtooth', frequenz: 165, bis: 130, dauer: 0.3, verzoegerung: 0.03, lautstaerke: 0.14 });
    },
    kombi: function (c) {
      ton(c, { form: 'triangle', frequenz: 660, dauer: 0.2, lautstaerke: 0.22 });
      ton(c, { form: 'triangle', frequenz: 880, dauer: 0.24, verzoegerung: 0.04, lautstaerke: 0.18 });
    },
    entladung: function (c) {
      schlag(c, { frequenz: 3000, dauer: 0.35, lautstaerke: 0.26, filterTyp: 'highpass' });
      ton(c, { form: 'sawtooth', frequenz: 200, bis: 60, dauer: 0.3, lautstaerke: 0.2 });
    },
    verwandlung: function (c) {
      [220, 277, 330, 440].forEach(function (f, i) {
        ton(c, { form: 'sine', frequenz: f, dauer: 1.1, verzoegerung: i * 0.05, anstieg: 0.3, lautstaerke: 0.16 });
      });
    },
    aktiv: function (c, info) {
      var gross = !!GROSS_BEATS[info.beat];
      ton(c, { form: 'sawtooth', frequenz: 180, bis: gross ? 640 : 460, dauer: gross ? 0.42 : 0.28,
               anstieg: 0.05, lautstaerke: gross ? 0.22 : 0.16 });
    },
    end: function (c, info) {
      if (info.winner === 'player') {
        [523, 659, 784, 1046].forEach(function (f, i) {
          ton(c, { form: 'triangle', frequenz: f, dauer: 0.5, verzoegerung: i * 0.11, lautstaerke: 0.22 });
        });
      } else if (info.winner === 'enemy') {
        [392, 349, 293, 261].forEach(function (f, i) {
          ton(c, { form: 'sine', frequenz: f, dauer: 0.6, verzoegerung: i * 0.16, lautstaerke: 0.18 });
        });
      }
    },
    klick: function (c) {
      ton(c, { form: 'square', frequenz: 1200, dauer: 0.03, anstieg: 0.002, lautstaerke: 0.06 });
    }
  };

  /* Wird je Logeintrag aus `js/ui.js` aufgerufen; unbekannte oder stumme Typen
     (z. B. `status`, `zug`, `setup`, `chaos`) haben absichtlich kein Rezept. */
  function spiele(typ, info) {
    if (!verfuegbar()) return;
    var rezept = REZEPTE[typ];
    if (!rezept) return;
    var c = kontext();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (stimmenAktiv >= STIMMEN_MAX) return;
    rezept(c, info || {});
  }

  function klick() { spiele('klick'); }

  function setzeStufe(s) {
    if (s !== 'voll' && s !== 'sparsam' && s !== 'aus') return stufe;
    stufe = s;
    try { localStorage.setItem('tensura-klang', stufe); } catch (e) {}
    if (meister) meister.gain.value = stufe === 'sparsam' ? 0.32 : 0.65;
    return stufe;
  }

  root.Klang = { spiele: spiele, klick: klick, stufe: setzeStufe, verfuegbar: verfuegbar };

})(typeof globalThis !== 'undefined' ? globalThis : this);
