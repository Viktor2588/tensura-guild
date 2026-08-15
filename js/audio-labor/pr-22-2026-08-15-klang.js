/* Variante aus PR #22 — Prozedurale Kampf-Audio: das Spiel hat jetzt einen Ton
   Quelle: Branch `routine/2026-08-15-klang`, Datei `js/audio.js`.
   Der Inhalt darunter ist unveraendert; neu ist nur diese Klammer.

   Warum die Klammer: alle 21 Varianten schreiben ihre Schnittstelle unter
   demselben Handvoll Namen (`Klang`, `Ton`, `Sound`, `SFX`) an das globale
   Objekt. Nebeneinander geladen ueberschriebe die letzte alle vorherigen.
   Statt des echten `globalThis` bekommt jede Variante deshalb einen eigenen
   Schirm gereicht (`js/audio-labor/labor.js`): Lesen faellt auf das echte
   globale Objekt durch, Schreiben landet im Schirm. So bleiben 21 `Klang`
   nebeneinander stehen, ohne voneinander zu wissen. */
AudioLabor.registriere('pr-22', function (globalThis) {
/* js/audio.js — Klang: Kampfgeraeusche ohne eine einzige Audiodatei.

   Bis hierher war das Spiel stumm. Ein echtes Sample-Set fuer knapp zwanzig
   Ereignistypen liesse sich nicht ohne Lizenzfrage und ohne Bauschritt
   beschaffen (ASSETS.md verlangt fuer jede Datei eine Herkunftszeile) — also
   synthetisiert dieses Modul jeden Ton selbst: Oszillatoren fuer Tonhoehen,
   gefiltertes Rauschen fuer Wumms und Zischen. Keine neue Abhaengigkeit, kein
   Byte im Repo, genau wie `js/fx.js` seine Shader von Hand schreibt statt ein
   Postprocessing-Addon einzubinden.

   Der Haken sitzt an derselben Stelle wie die Kamera: `js/ui.js` ruft in
   `zeige(l, beat)` fuer JEDEN Logeintrag `Klang.spiele(l, beat)` — `l.type`
   entscheidet den Klang, `beat` (aus `js/regie.js`) ob er ein Hoehepunkt ist.
   Anders als die 2.5D-Ansicht braucht Klang kein WebGL und funktioniert daher
   auch bei „Effekte: Aus" und im SVG-Rueckfall.

   Ohne Web Audio API (etwa jsdom im UI-Test) passiert hier nichts —
   `verfuegbar()` sagt nein, wie `Brett3D.verfuegbar()` es fuer WebGL tut.    */
'use strict';
(function (root) {

  var ctx = null, meister = null, kannAudio = null, rauschPuffer = null;
  var stufe = 'an';
  var letzte = {};

  /* Wie nah zwei Ereignisse desselben Typs beieinander liegen duerfen, bevor
     das zweite verschluckt wird. Ohne das wird ein Zug voller Statusticks
     (Gewicht 0.4 in der Regie, oft mehrere je Bild bei hohem Tempo) zu
     einem einzigen Rauschen. Ereignisse ohne Eintrag bekommen 0.03s. */
  var ABSTAND = { hit: 0.02, status: 0.05, chaos: 0.06, schild: 0.05,
                   kombi: 0.03, zug: 0.2 };

  function verfuegbar() {
    if (stufe === 'aus') return false;
    if (kannAudio !== null) return kannAudio;
    kannAudio = !!(root.AudioContext || root.webkitAudioContext);
    return kannAudio;
  }

  function setzeStufe(s) {
    if (s !== 'an' && s !== 'aus') return stufe;
    stufe = s;
    return stufe;
  }

  function kontext() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    meister = ctx.createGain();
    meister.gain.value = 0.5;
    meister.connect(ctx.destination);
    return ctx;
  }

  /* Browser sperren `AudioContext`, bis eine Nutzeraktion auf der Seite war.
     `js/ui.js` ruft das aus dem zentralen Klick-Dispatcher bei jedem Klick —
     billig genug, um es nicht gesondert zu verdrahten. */
  function entsperren() {
    if (!verfuegbar()) return;
    var c = kontext();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
  }

  function bereit() {
    if (!verfuegbar()) return null;
    var c = kontext();
    if (!c) return null;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    return c;
  }

  /* Einmal erzeugtes weisses Rauschen, wiederverwendet fuer jeden Wumms und
     jedes Zischen — eine Sekunde reicht fuer jede Huellkurve, die wir bauen. */
  function puffer(c) {
    if (rauschPuffer) return rauschPuffer;
    rauschPuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    var daten = rauschPuffer.getChannelData(0), i;
    for (i = 0; i < daten.length; i++) daten[i] = Math.random() * 2 - 1;
    return rauschPuffer;
  }

  /* Ein Ton: Oszillator mit exponentieller Ein-/Ausblendung, optional eine
     Gleitfahrt der Tonhoehe (`zu`) fuer Wumms, Zischen und Fanfaren. */
  function ton(freq, dauer, opts) {
    var c = bereit();
    if (!c) return;
    opts = opts || {};
    var start = c.currentTime + (opts.verzoegerung || 0);
    var osc = c.createOscillator();
    osc.type = opts.typ || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, freq), start);
    if (opts.zu) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.zu), start + dauer);
    var gain = c.createGain();
    var vol = opts.vol != null ? opts.vol : 0.15;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + (opts.attack || 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    osc.connect(gain);
    gain.connect(meister);
    osc.start(start);
    osc.stop(start + dauer + 0.02);
  }

  /* Gefiltertes Rauschen: Tiefpass fuer Wumms und Schlag, Hochpass fuer
     Zischen und Funken, Bandpass fuer die Anlauf-Whoosh einer Signatur. */
  function stoss(dauer, opts) {
    var c = bereit();
    if (!c) return;
    opts = opts || {};
    var start = c.currentTime + (opts.verzoegerung || 0);
    var quelle = c.createBufferSource();
    quelle.buffer = puffer(c);
    quelle.loop = true;
    var filter = c.createBiquadFilter();
    filter.type = opts.filterTyp || 'lowpass';
    filter.frequency.setValueAtTime(opts.frequenz || 800, start);
    if (opts.filterZu) filter.frequency.exponentialRampToValueAtTime(opts.filterZu, start + dauer);
    if (opts.q) filter.Q.value = opts.q;
    var gain = c.createGain();
    var vol = opts.vol != null ? opts.vol : 0.2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + (opts.attack || 0.005));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    quelle.connect(filter);
    filter.connect(gain);
    gain.connect(meister);
    quelle.start(start);
    quelle.stop(start + dauer + 0.02);
  }

  /* ------------------------------------------------------- Klangbilder */

  function treffer(l, beat) {
    var frac = l.maxHp ? Math.min(1, (l.dmg || 0) / l.maxHp) : 0.08;
    var gross = beat === 'gross' || beat === 'toedlich' || beat === 'finale';
    stoss(gross ? 0.26 : 0.13, { frequenz: gross ? 240 : 500, vol: 0.16 + frac * 0.3 });
    ton(gross ? 110 : 220, gross ? 0.2 : 0.09, { typ: 'triangle', zu: gross ? 55 : 110, vol: 0.1 + frac * 0.15 });
  }

  function heilung(l) {
    ton(440, 0.14, { typ: 'sine', zu: 520, vol: 0.12 });
    ton(660, 0.16, { typ: 'sine', zu: 760, vol: 0.09, verzoegerung: 0.06 });
  }

  function wiederbelebung(l) {
    ton(500, 0.1, { typ: 'sine', vol: 0.1 });
    ton(650, 0.1, { typ: 'sine', vol: 0.09, verzoegerung: 0.08 });
    ton(820, 0.16, { typ: 'sine', vol: 0.08, verzoegerung: 0.16 });
  }

  function tod(l, beat) {
    ton(180, 0.32, { typ: 'sawtooth', zu: 45, vol: 0.15 });
    stoss(0.28, { frequenz: 200, vol: 0.2 });
    if (beat === 'finale') {
      ton(90, 0.55, { typ: 'sine', zu: 30, vol: 0.18, verzoegerung: 0.1 });
      stoss(0.45, { frequenz: 150, vol: 0.22, verzoegerung: 0.1 });
    }
  }

  /* Grob nach Namen des Zustands eingefaerbt — kein Anspruch auf Praezision,
     nur genug Streuung, dass Brand nicht wie Erstarrung klingt. */
  function hash(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function status(l) {
    var basis = 280 + (hash(l.status || '') % 6) * 35;
    ton(basis, 0.08, { typ: 'square', zu: basis * 1.25, vol: 0.05 });
  }

  function schild(l) {
    ton(950, 0.05, { typ: 'sine', vol: 0.07 });
    ton(1250, 0.06, { typ: 'sine', vol: 0.05, verzoegerung: 0.03 });
  }

  function chaos(l) {
    ton(230, 0.12, { typ: 'sawtooth', zu: 170, vol: 0.05 });
  }

  function verwandlung(l) {
    ton(200, 0.5, { typ: 'sawtooth', zu: 520, vol: 0.16 });
    ton(300, 0.5, { typ: 'triangle', zu: 720, vol: 0.12, verzoegerung: 0.05 });
    stoss(0.35, { frequenz: 1400, filterTyp: 'highpass', vol: 0.1, verzoegerung: 0.12 });
  }

  function wut(l) {
    ton(150, 0.2, { typ: 'sawtooth', zu: 85, vol: 0.13 });
    stoss(0.14, { frequenz: 400, vol: 0.1 });
  }

  function kombi(l) {
    ton(520, 0.06, { typ: 'triangle', zu: 340, vol: 0.07 });
    stoss(0.05, { frequenz: 900, vol: 0.07 });
  }

  function entladung(l) {
    stoss(0.12, { frequenz: 2600, filterTyp: 'highpass', vol: 0.13 });
    ton(1000, 0.08, { typ: 'square', zu: 200, vol: 0.07 });
  }

  function aktiv(l) {
    ton(150, 0.22, { typ: 'sine', zu: 380, vol: 0.05 });
    stoss(0.2, { frequenz: 400, filterZu: 2200, filterTyp: 'bandpass', vol: 0.09 });
  }

  function ausweichen(l) {
    stoss(0.1, { frequenz: 2400, filterTyp: 'highpass', vol: 0.05 });
  }

  function widersteht(l) {
    stoss(0.08, { frequenz: 240, vol: 0.07 });
  }

  function fehlschlag(l) {
    ton(120, 0.12, { typ: 'sine', zu: 80, vol: 0.05 });
  }

  function start(l) {
    ton(220, 0.3, { typ: 'sawtooth', zu: 440, vol: 0.09 });
    stoss(0.24, { frequenz: 150, vol: 0.11 });
  }

  function ende(l) {
    if (l.winner === 'player') {
      ton(330, 0.16, { typ: 'triangle', vol: 0.12 });
      ton(415, 0.16, { typ: 'triangle', vol: 0.12, verzoegerung: 0.1 });
      ton(660, 0.3, { typ: 'triangle', vol: 0.14, verzoegerung: 0.2 });
      stoss(0.3, { frequenz: 1800, filterTyp: 'highpass', vol: 0.06, verzoegerung: 0.2 });
    } else {
      ton(330, 0.22, { typ: 'sawtooth', zu: 280, vol: 0.1 });
      ton(240, 0.24, { typ: 'sawtooth', zu: 190, vol: 0.1, verzoegerung: 0.16 });
      ton(160, 0.4, { typ: 'sawtooth', zu: 90, vol: 0.12, verzoegerung: 0.32 });
    }
  }

  var KLANG = {
    setup: start, hit: treffer, heal: heilung, revive: wiederbelebung,
    death: tod, status: status, schild: schild, chaos: chaos,
    verwandlung: verwandlung, wut: wut, kombi: kombi, entladung: entladung,
    aktiv: aktiv, ausweichen: ausweichen, widersteht: widersteht,
    fehlschlag: fehlschlag, end: ende
  };

  function spiele(l, beat) {
    if (!l || !l.type) return;
    var fn = KLANG[l.type];
    if (!fn) return;
    var c = bereit();
    if (!c) return;
    var jetzt = c.currentTime;
    var mindestabstand = ABSTAND[l.type] != null ? ABSTAND[l.type] : 0.03;
    if (letzte[l.type] != null && jetzt - letzte[l.type] < mindestabstand) return;
    letzte[l.type] = jetzt;
    fn(l, beat);
  }

  root.Klang = { verfuegbar: verfuegbar, stufe: setzeStufe, entsperren: entsperren, spiele: spiele };

})(typeof globalThis !== 'undefined' ? globalThis : this);

});
