/* js/ton.js — Ton. Kurze Klaenge, synthetisiert statt aus einer Datei geladen.

   Warum synthetisch: ASSETS.md verlangt fuer jede Datei eine Herkunftszeile
   mit Lizenz — das gilt fuer die KI-generierten Figurenbilder, und fuer
   lizenzfreie Audiosamples gaelte dieselbe Pflicht, Datei fuer Datei. Web
   Audio baut jeden Klang aus Oszillatoren und gefiltertem Rauschen zur
   Laufzeit — keine Datei, keine Lizenzfrage, kein Bauschritt, und das Spiel
   bleibt ohne Netz spielbar.

   Rein: keine Abhaengigkeit ausser der `AudioContext` des Browsers selbst.
   Fehlt sie (jsdom im UI-Test, alte Browser, `stufe('aus')`), ist jede
   Funktion ein No-Op — dasselbe Muster wie `Brett3D.verfuegbar()`.          */
'use strict';
(function (root) {

  var stufe = 'an';

  /* Wie `Brett3D.kannWebGL`: einmal fragen, dann merken. Ein AudioContext ist
     zudem teuer genug, dass man ihn nicht pro Klang neu anlegen will. */
  var kannAudio = null;
  var ctx = null, meister = null, rauschPuffer = null;

  function verfuegbar() {
    if (stufe === 'aus') return false;
    if (kannAudio !== null) return kannAudio;
    var Ctor = root.AudioContext || root.webkitAudioContext;
    kannAudio = !!Ctor;
    return kannAudio;
  }

  /* Erst beim ersten Klang angelegt, nicht beim Laden des Skripts: Chrome und
     Safari verweigern einen AudioContext ohne vorherige Nutzergeste, und das
     Skript laedt vor dem ersten Klick. Bis dahin bleibt `ctx` `null` und
     jede Funktion tut nichts — kein Fehler, nur Stille. */
  function kontext() {
    if (ctx) return ctx;
    var Ctor = root.AudioContext || root.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      meister = ctx.createGain();
      meister.gain.value = 0.5;
      meister.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function wecken() {
    var c = kontext();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    return c;
  }

  /* Drei Stufen wie bei den Effekten waeren hier eine Ueberzeichnung — Ton ist
     entweder da oder nicht, nichts davon kostet Bildrate. Die Funktion heisst
     trotzdem `stufe`, damit sie sich in `ui.js` genauso anfuehlt wie
     `Brett3D.stufe`. */
  function setzeStufe(s) {
    if (s !== 'an' && s !== 'aus') return stufe;
    stufe = s;
    if (stufe === 'an') wecken();
    return stufe;
  }

  /* Ein Puffer weisses Rauschen, einmal gebaut und fuer jeden perkussiven
     Klang wiederverwendet (Treffer, Tod, Klick) — nur die Filterung dahinter
     unterscheidet sie. */
  function rauschen(c) {
    if (rauschPuffer) return rauschPuffer;
    var len = Math.max(1, Math.round(c.sampleRate * 0.3));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    rauschPuffer = buf;
    return buf;
  }

  /* Ein Oszillatorton mit Huellkurve: schneller Attack, exponentieller Abfall
     — linear klaenge klickt am Ende hoerbar, exponentiell nicht. */
  function ton(opt) {
    var c = wecken();
    if (!c) return;
    var jetzt = c.currentTime;
    var osc = c.createOscillator();
    osc.type = opt.typ || 'sine';
    osc.frequency.setValueAtTime(opt.von, jetzt);
    if (opt.bis) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opt.bis), jetzt + opt.dauer);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, jetzt);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, opt.lautstaerke || 0.25), jetzt + (opt.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, jetzt + opt.dauer);
    osc.connect(g); g.connect(meister);
    osc.start(jetzt); osc.stop(jetzt + opt.dauer + 0.02);
  }

  /* Ein gefilterter Rauschstoss: Treffer, Einschlaege, Klicks. Der Bandpass
     macht aus reinem Rauschen ein "Wummern" oder "Knacken", je nach Frequenz. */
  function knall(opt) {
    var c = wecken();
    if (!c) return;
    var jetzt = c.currentTime;
    var quelle = c.createBufferSource();
    quelle.buffer = rauschen(c);
    var filt = c.createBiquadFilter();
    filt.type = opt.filterTyp || 'bandpass';
    filt.frequency.setValueAtTime(opt.frequenz || 900, jetzt);
    if (opt.frequenzBis) filt.frequency.exponentialRampToValueAtTime(Math.max(20, opt.frequenzBis), jetzt + opt.dauer);
    filt.Q.value = opt.q === undefined ? 1 : opt.q;
    var g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.001, opt.lautstaerke || 0.25), jetzt);
    g.gain.exponentialRampToValueAtTime(0.0001, jetzt + opt.dauer);
    quelle.connect(filt); filt.connect(g); g.connect(meister);
    quelle.start(jetzt); quelle.stop(jetzt + opt.dauer + 0.02);
  }

  /* Mehrere Toene in Folge, mit Versatz — fuer Sieg/Niederlage-Jingles und den
     Verwandlungsklang, die eine kleine Melodie statt eines Einzeltons
     brauchen. `verzoegerung` ist relativ zum Aufruf von `folge`. */
  function folge(schritte) {
    schritte.forEach(function (s) {
      root.setTimeout ? root.setTimeout(function () { ton(s.opt); }, s.verzoegerung * 1000)
                       : ton(s.opt);
    });
  }

  /* ---------------------------------------------------------- Klangbank */

  /* Ein Treffer ist der haeufigste Klang im Spiel — er darf nicht ermueden.
     Tonhoehe und Lautstaerke folgen dem Schadensanteil, ein tiefes Wummern
     kommt oben drauf, wenn die Regie den Treffer ohnehin als `gross`,
     `toedlich` oder `finale` markiert hat. */
  function treffer(anteil, beat) {
    var a = Math.max(0, Math.min(1, anteil || 0));
    var schwer = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
    knall({ frequenz: 1400 - a * 700, frequenzBis: 300, q: 0.7,
            dauer: 0.10 + a * 0.08, lautstaerke: 0.16 + a * 0.18 });
    if (schwer) knall({ filterTyp: 'lowpass', frequenz: 220, frequenzBis: 70,
                         dauer: 0.22, lautstaerke: 0.22, q: 0.5 });
  }

  var PRESETS = {
    /* Sanftes, tickendes Feedback fuer jeden Klick auf eine Aktion — der
       kleinste, aber haeufigste AAA-Handgriff: eine Oberflaeche, die auf
       jeden Antippen antwortet. */
    klick: function () { ton({ typ: 'triangle', von: 900, bis: 500, dauer: 0.045, lautstaerke: 0.09, attack: 0.001 }); },
    heilung: function () { ton({ typ: 'sine', von: 440, bis: 880, dauer: 0.26, lautstaerke: 0.16, attack: 0.02 }); },
    schild: function () { knall({ frequenz: 2400, frequenzBis: 1600, q: 4, dauer: 0.08, lautstaerke: 0.14 }); },
    ausweichen: function () { ton({ typ: 'sawtooth', von: 260, bis: 900, dauer: 0.09, lautstaerke: 0.1 }); },
    fehlschlag: function () { ton({ typ: 'square', von: 180, bis: 90, dauer: 0.14, lautstaerke: 0.12 }); },
    einsatz: function (spieler) {
      ton({ typ: 'sawtooth', von: spieler ? 300 : 220, bis: spieler ? 900 : 660, dauer: 0.16, lautstaerke: 0.14 });
    },
    tod: function () {
      ton({ typ: 'sine', von: 300, bis: 60, dauer: 0.4, lautstaerke: 0.2, attack: 0.01 });
      knall({ filterTyp: 'lowpass', frequenz: 180, frequenzBis: 50, dauer: 0.3, lautstaerke: 0.18 });
    },
    wiederbelebung: function () {
      folge([
        { verzoegerung: 0, opt: { typ: 'sine', von: 440, bis: 660, dauer: 0.16, lautstaerke: 0.16 } },
        { verzoegerung: 0.1, opt: { typ: 'sine', von: 660, bis: 990, dauer: 0.2, lautstaerke: 0.18 } }
      ]);
    },
    kombi: function () { ton({ typ: 'square', von: 500, bis: 780, dauer: 0.14, lautstaerke: 0.15 }); },
    wut: function () { ton({ typ: 'sawtooth', von: 140, bis: 320, dauer: 0.22, lautstaerke: 0.18 }); },
    entladung: function () {
      knall({ frequenz: 3200, frequenzBis: 500, q: 0.6, dauer: 0.3, lautstaerke: 0.2 });
    },
    verwandlung: function () {
      folge([
        { verzoegerung: 0, opt: { typ: 'sine', von: 220, bis: 220, dauer: 0.3, lautstaerke: 0.14 } },
        { verzoegerung: 0.18, opt: { typ: 'sine', von: 440, bis: 880, dauer: 0.5, lautstaerke: 0.2 } },
        { verzoegerung: 0.3, opt: { typ: 'triangle', von: 660, bis: 1320, dauer: 0.5, lautstaerke: 0.14 } }
      ]);
    },
    resonanz: function () {
      folge([
        { verzoegerung: 0, opt: { typ: 'sine', von: 330, dauer: 0.35, lautstaerke: 0.14 } },
        { verzoegerung: 0.05, opt: { typ: 'sine', von: 495, dauer: 0.35, lautstaerke: 0.12 } }
      ]);
    },
    sieg: function () {
      folge([
        { verzoegerung: 0, opt: { typ: 'triangle', von: 523, dauer: 0.18, lautstaerke: 0.2 } },
        { verzoegerung: 0.14, opt: { typ: 'triangle', von: 659, dauer: 0.18, lautstaerke: 0.2 } },
        { verzoegerung: 0.28, opt: { typ: 'triangle', von: 784, dauer: 0.36, lautstaerke: 0.22 } }
      ]);
    },
    niederlage: function () {
      folge([
        { verzoegerung: 0, opt: { typ: 'sawtooth', von: 392, dauer: 0.22, lautstaerke: 0.16 } },
        { verzoegerung: 0.18, opt: { typ: 'sawtooth', von: 330, dauer: 0.22, lautstaerke: 0.16 } },
        { verzoegerung: 0.36, opt: { typ: 'sawtooth', von: 262, dauer: 0.5, lautstaerke: 0.18 } }
      ]);
    }
  };

  /* Der einzige Aufruf von aussen: ein Name, optional ein paar Zahlen. Fehlt
     die Stufe oder der Kontext, ist das ein stiller No-Op — kein `if
     (Ton.verfuegbar())` an jeder Aufrufstelle noetig. */
  function spiele(name, a, b) {
    if (!verfuegbar()) return;
    if (name === 'treffer') { treffer(a, b); return; }
    if (name === 'einsatz') { PRESETS.einsatz(!!a); return; }
    var f = PRESETS[name];
    if (f) f();
  }

  root.Ton = { spiele: spiele, verfuegbar: verfuegbar, stufe: setzeStufe };

})(typeof globalThis !== 'undefined' ? globalThis : this);
