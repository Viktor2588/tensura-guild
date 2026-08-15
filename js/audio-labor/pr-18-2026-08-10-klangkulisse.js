/* Variante aus PR #18 — Prozedurale Klangkulisse fuer Kampf und Menue
   Quelle: Branch `routine/2026-08-10-klangkulisse`, Datei `js/audio.js`.
   Der Inhalt darunter ist unveraendert; neu ist nur diese Klammer.

   Warum die Klammer: alle 21 Varianten schreiben ihre Schnittstelle unter
   demselben Handvoll Namen (`Klang`, `Ton`, `Sound`, `SFX`) an das globale
   Objekt. Nebeneinander geladen ueberschriebe die letzte alle vorherigen.
   Statt des echten `globalThis` bekommt jede Variante deshalb einen eigenen
   Schirm gereicht (`js/audio-labor/labor.js`): Lesen faellt auf das echte
   globale Objekt durch, Schreiben landet im Schirm. So bleiben 21 `Klang`
   nebeneinander stehen, ohne voneinander zu wissen. */
AudioLabor.registriere('pr-18', function (globalThis) {
/* js/audio.js — die Klangkulisse. Keine Audiodateien: jeder Ton entsteht aus
   Oszillatoren, gefiltertem Rauschen und Hüllkurven in der WebAudio-API, zur
   Laufzeit im Browser. Das passt zum Rest des Projekts (keine neue
   Abhängigkeit, kein Bauschritt) — und weil nichts von irgendwoher stammt,
   braucht es auch keine Herkunftszeile in ASSETS.md.

   Ohne AudioContext passiert hier gar nichts, genau wie bei
   `Brett3D.verfuegbar()` fuer WebGL: jsdom (der UI-Test) kennt keine
   WebAudio-API, und `sicherstellen()` gibt dann still `null` zurueck statt zu
   werfen. Ein AudioContext darf zudem nicht mehrfach angelegt werden — er
   startet in vielen Browsern zusaetzlich `suspended`, bis eine Nutzergeste
   ihn freigibt, und genau das liefert der erste Klick auf einen Button.

   Drei Stufen wie bei den Bildeffekten: „voll" spielt jedes Ereignis
   inklusive der kleinen (Status, Chaos, Schild, Erstarrung), „sparsam" nur
   die grossen (Treffer, Tod, Heilung, Signatur, Wiederbelebung), „aus" ist
   stumm. Die Stufe merkt sich `js/ui.js`, so wie es das bei den Effekten
   bereits fuer `Brett3D.stufe` tut. */
'use strict';
(function (root) {

  var ctx = null, meister = null, kannAudio = null;
  var stufe = 'voll';

  function setzeStufe(s) {
    if (s !== 'voll' && s !== 'sparsam' && s !== 'aus') return stufe;
    stufe = s;
    return stufe;
  }

  /* Einmal fragen, danach merken — wie bei Brett3D.verfuegbar(). */
  function sicherstellen() {
    if (stufe === 'aus') return null;
    if (kannAudio === false) return null;
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var K = root.AudioContext || root.webkitAudioContext;
    if (!K) { kannAudio = false; return null; }
    try {
      ctx = new K();
      meister = ctx.createGain();
      meister.gain.value = 0.5;
      meister.connect(ctx.destination);
      kannAudio = true;
    } catch (e) { kannAudio = false; ctx = null; }
    return ctx;
  }

  /* Ein Rauschpuffer fuer alle Treffer und Wusch-Toene, einmal erzeugt und
     mit zufaelligem Versatz wiederverwendet — billiger als je einen neuen
     Puffer pro Ereignis zu fuellen. */
  var rauschPuffer = null;
  function rauschen() {
    var n = Math.round(ctx.sampleRate * 1.5);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0), i;
    for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (rauschPuffer = buf);
  }

  /* Attack-Decay-Huellkurve. `spitze + 0.0001` haelt den Startwert ungleich
     null, sonst bricht der exponentielle Ausklang. */
  function huelle(gain, jetzt, attack, decay, spitze) {
    gain.gain.cancelScheduledValues(jetzt);
    gain.gain.setValueAtTime(0.0001, jetzt);
    gain.gain.linearRampToValueAtTime(spitze + 0.0001, jetzt + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, jetzt + attack + decay);
  }

  /* Ein Oszillatorton mit optionaler Tonhoehen-Gleitung (`gleit` = Verhaeltnis
     Ende zu Anfang, z. B. 0.6 faellt, 1.6 steigt). */
  function ton(freq, dauer, opts) {
    opts = opts || {};
    var c = sicherstellen(); if (!c) return;
    var jetzt = c.currentTime;
    var osc = c.createOscillator();
    osc.type = opts.typ || 'sine';
    osc.frequency.setValueAtTime(freq, jetzt);
    if (opts.gleit) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.gleit), jetzt + dauer);
    var g = c.createGain();
    huelle(g, jetzt, opts.attack === undefined ? 0.005 : opts.attack, dauer,
           opts.lautstaerke === undefined ? 0.3 : opts.lautstaerke);
    osc.connect(g); g.connect(meister);
    osc.start(jetzt); osc.stop(jetzt + dauer + 0.05);
  }

  /* Gefiltertes Rauschen — Treffer, Einschlaege, Wusch. */
  function stoss(dauer, opts) {
    opts = opts || {};
    var c = sicherstellen(); if (!c) return;
    var jetzt = c.currentTime;
    var puffer = rauschPuffer || rauschen();
    var quelle = c.createBufferSource();
    quelle.buffer = puffer;
    var versatz = Math.random() * Math.max(0.01, puffer.duration - dauer - 0.05);
    var filt = c.createBiquadFilter();
    filt.type = opts.typ || 'lowpass';
    var f0 = opts.frequenz || 1200;
    filt.frequency.setValueAtTime(f0, jetzt);
    if (opts.gleit) filt.frequency.exponentialRampToValueAtTime(Math.max(80, f0 * opts.gleit), jetzt + dauer);
    var g = c.createGain();
    huelle(g, jetzt, opts.attack === undefined ? 0.002 : opts.attack, dauer,
           opts.lautstaerke === undefined ? 0.35 : opts.lautstaerke);
    quelle.connect(filt); filt.connect(g); g.connect(meister);
    quelle.start(jetzt, versatz, dauer + 0.05);
  }

  /* Deterministische Streuung aus einem String — fuer Tonhoehen, die je
     Zustand oder Schluesselwort variieren, ohne eine Tabelle zu pflegen. */
  function streu(s) {
    var h = 0, i;
    s = s || '';
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /* Drossel je Kategorie: bei Tempo x4 oder nach einem Tabwechsel laeuft
     `schritt()` in `js/ui.js` viele Eintraege in einem Bild ab. Ohne diese
     Bremse wuerde daraus eine Rauschwand aus uebereinandergelegten Toenen
     statt einzelner Akzente. */
  var letzte = {};
  function drosselt(art, minAbstand) {
    if (!ctx) return false;
    var jetzt = ctx.currentTime;
    if (letzte[art] !== undefined && jetzt - letzte[art] < minAbstand) return true;
    letzte[art] = jetzt;
    return false;
  }

  var KLEIN = { chaos: 1, status: 1, schild: 1, skip: 1, widersteht: 1 };

  /* Ein Logeintrag aus der Kampfwiedergabe. `beat` kommt aus `Regie.zeitplan`
     und sagt, ob dieser Eintrag ein Hoehepunkt ist — dieselbe Information,
     die `js/ui.js` fuer die Kamera nutzt, hebt hier Tod und Wendepunkt
     zusaetzlich an. */
  function ereignis(l, beat) {
    if (stufe === 'aus') return;
    if (stufe === 'sparsam' && KLEIN[l.type]) return;
    var c = sicherstellen(); if (!c) return;
    var wucht = beat === 'finale' ? 1.5 : (beat === 'toedlich' || beat === 'wende') ? 1.2 : 1;

    if (l.type === 'hit') {
      if (drosselt('hit', 0.02)) return;
      var anteil = Math.max(0, Math.min(1, (l.dmg || 0) / (l.maxHp || 1)));
      stoss(0.08 + anteil * 0.12, { frequenz: 1800 - anteil * 1200, gleit: 0.35,
                                     lautstaerke: (0.2 + anteil * 0.35) * wucht });
      ton(160 - anteil * 60, 0.09 + anteil * 0.08, { typ: 'triangle', gleit: 0.6,
                                                      lautstaerke: 0.16 * wucht });
    } else if (l.type === 'heal') {
      if (drosselt('heal', 0.05)) return;
      ton(660, 0.18, { typ: 'sine', gleit: 1.25, lautstaerke: 0.14 });
      ton(880, 0.16, { typ: 'sine', gleit: 1.15, attack: 0.03, lautstaerke: 0.1 });
    } else if (l.type === 'death') {
      stoss(0.3 * wucht, { frequenz: 500, gleit: 0.15, attack: 0.01, lautstaerke: 0.38 * wucht });
      ton(140, 0.4 * wucht, { typ: 'sine', gleit: 0.4, lautstaerke: 0.2 * wucht });
    } else if (l.type === 'revive') {
      [523, 659, 784].forEach(function (freq, i) {
        var c2 = sicherstellen(); if (!c2) return;
        var t0 = c2.currentTime + i * 0.06;
        var osc = c2.createOscillator();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t0);
        var g = c2.createGain();
        huelle(g, t0, 0.005, 0.12, 0.16);
        osc.connect(g); g.connect(meister);
        osc.start(t0); osc.stop(t0 + 0.2);
      });
    } else if (l.type === 'aktiv') {
      if (drosselt('aktiv', 0.03)) return;
      var basis = 260 + (streu(l.kw || l.key) % 9) * 60;
      stoss(0.16, { frequenz: 500, gleit: 3.2, lautstaerke: 0.15 });
      ton(basis, 0.22, { typ: 'sawtooth', gleit: 1.6, attack: 0.02, lautstaerke: 0.11 });
    } else if (l.type === 'schild') {
      if (drosselt('schild', 0.05)) return;
      ton(1200, 0.12, { typ: 'triangle', gleit: 0.9, lautstaerke: 0.11 });
    } else if (l.type === 'status') {
      if (drosselt('status', 0.06)) return;
      ton(300 + (streu(l.status) % 12) * 40, 0.07, { typ: 'square', gleit: 0.7, lautstaerke: 0.05 });
    } else if (l.type === 'skip' || l.type === 'widersteht') {
      if (drosselt('neg', 0.05)) return;
      ton(120, 0.12, { typ: 'square', gleit: 0.6, lautstaerke: 0.07 });
    } else if (l.type === 'chaos') {
      if (drosselt('chaos', 0.08)) return;
      ton(200 + Math.random() * 400, 0.05, { typ: 'square', lautstaerke: 0.045 });
    }
  }

  /* Ein leiser Klick fuer Menue- und Marktbedienung — nicht fuer jeden Klick
     im Fenster, nur fuer erkannte Aktionen (siehe `klick()` in js/ui.js). */
  function klick() {
    if (stufe === 'aus') return;
    var c = sicherstellen(); if (!c) return;
    if (drosselt('klick', 0.02)) return;
    ton(700, 0.045, { typ: 'sine', gleit: 0.75, attack: 0.001, lautstaerke: 0.07 });
  }

  root.Klang = { stufe: setzeStufe, ereignis: ereignis, klick: klick };

})(typeof globalThis !== 'undefined' ? globalThis : this);

});
