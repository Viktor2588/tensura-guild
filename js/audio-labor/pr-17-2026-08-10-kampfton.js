/* Variante aus PR #17 — Kampfton: prozedurales Audio-Feedback fuer den Kampf
   Quelle: Branch `routine/2026-08-10-kampfton`, Datei `js/ton.js`.
   Der Inhalt darunter ist unveraendert; neu ist nur diese Klammer.

   Warum die Klammer: alle 21 Varianten schreiben ihre Schnittstelle unter
   demselben Handvoll Namen (`Klang`, `Ton`, `Sound`, `SFX`) an das globale
   Objekt. Nebeneinander geladen ueberschriebe die letzte alle vorherigen.
   Statt des echten `globalThis` bekommt jede Variante deshalb einen eigenen
   Schirm gereicht (`js/audio-labor/labor.js`): Lesen faellt auf das echte
   globale Objekt durch, Schreiben landet im Schirm. So bleiben 21 `Klang`
   nebeneinander stehen, ohne voneinander zu wissen. */
AudioLabor.registriere('pr-17', function (globalThis) {
/* js/ton.js — Ton fuer den Kampf. Alles hier ist synthetisiert, keine einzige
   Datei: dieselbe Haltung wie `platzhalter()` in brett3d.js (die Figur, bevor
   es ein Bild gibt) und `fx.js` (Bloom ohne Fremdcode) — kein Bauschritt, kein
   Asset-Ordner, keine Lizenzfrage. Die Web Audio API reicht fuer vier, fuenf
   kurze Huellkurven, und mehr braucht ein Log aus Zahlen und Schluesselwoertern
   nicht.

   Name bewusst `Ton`, nicht `Audio`: `Audio` ist im Browser bereits der
   HTML5-Konstruktor (`new Audio(...)`), und `root.Audio = {...}` haette ihn
   ueberschrieben.

   Angebunden an dieselbe Stelle wie das Brett: `zeige()` in `js/ui.js` ruft
   `Brett3D.*` und `Ton.*` nebeneinander fuer denselben Logeintrag auf. Die
   Regie (`js/regie.js`) hat die Gewichtung schon gebaut — `beat` sagt, ob ein
   Treffer nur ein Treffer ist oder ein Wendepunkt, und genau das nutzt auch
   der Ton statt einer eigenen zweiten Einstufung.

   Ohne AudioContext (jsdom im UI-Test hat keinen) passiert gar nichts —
   `verfuegbar()` sagt nein, wie `Brett3D.verfuegbar()` bei fehlendem WebGL.
   Jede oeffentliche Funktion faengt zusaetzlich alles ab: ein Ton, der den
   Kampf zum Stehen bringt, waere schlimmer als keiner.                       */
'use strict';
(function (root) {

  var stufe = 'an';
  function setzeStufe(s) {
    if (s !== 'an' && s !== 'aus') return stufe;
    stufe = s;
    return stufe;
  }

  var ac = null;               // AudioContext, erst bei der ersten Nutzergeste
  var meister = null;          // ein Gain-Knoten, an dem alles haengt
  var rauschPuffer = null;     // eine Sekunde weisses Rauschen, wiederverwendet

  /* AudioContext-Konstruktoren gibt es unter zwei Namen (Safari alt), und
     Autoplay-Regeln verbieten Ton VOR einer Nutzergeste — genauer: der
     Browser will `resume()` INNERHALB desselben synchronen Aufrufstapels wie
     die Geste sehen, nicht irgendwann danach. Ein `requestAnimationFrame`
     zaehlt nicht mehr dazu, auch wenn es aus einem Klick heraus geplant
     wurde. Deshalb reicht es nicht, hier einfach zu warten, bis der erste
     Logeintrag ankommt (der laeuft laengst im rAF-Takt) — `wecken()` muss
     synchron aus dem Klick heraus gerufen werden, siehe `starteReplay` in
     `js/ui.js`. */
  function kontext() {
    if (ac) { if (ac.state === 'suspended') sicherResume(ac); return ac; }
    var K = root.AudioContext || root.webkitAudioContext;
    if (!K) return null;
    ac = new K();
    meister = ac.createGain();
    meister.gain.value = 0.34;
    meister.connect(ac.destination);
    if (ac.state === 'suspended') sicherResume(ac);
    return ac;
  }

  /* `resume()` liefert ein Promise. Ohne Abfangen wuerde ein abgelehntes
     Promise (etwa: Geste war doch nicht "echt" genug) als unbehandelte
     Ablehnung in der Konsole auftauchen — harmlos fuers Spiel, aber Laerm. */
  function sicherResume(c) {
    try { var p = c.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  /* Oeffentlich, damit `js/ui.js` sie SYNCHRON aus einem Klick-Handler rufen
     kann — noch bevor der erste Logeintrag im rAF-Takt ankommt. */
  function wecken() {
    if (!verfuegbar()) return;
    try { kontext(); } catch (e) {}
  }

  function verfuegbar() {
    return stufe === 'an' && !!(root.AudioContext || root.webkitAudioContext);
  }

  function rauschen() {
    var c = kontext();
    if (!rauschPuffer) {
      rauschPuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = rauschPuffer.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return rauschPuffer;
  }

  /* Eine Huellkurve, linear rauf, exponentiell runter — exponentiell fuer den
     Abklang, weil ein linearer Abklang bei kurzen Toenen als Klicken endet
     (die Steigung reisst am Nullpunkt ab). `expRampToValueAtTime` darf nie 0
     erreichen, deshalb 0.0001 statt 0 als Ziel. */
  function huelle(gain, t0, an, halten, ab, gipfel) {
    var g = gain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(gipfel, t0 + an);
    g.setValueAtTime(gipfel, t0 + an + halten);
    g.exponentialRampToValueAtTime(0.0001, t0 + an + halten + ab);
  }

  /* Ein Oszillator mit Frequenzrampe und eigener Huellkurve, direkt an den
     Meister gehaengt. `bis` fehlt bei einem Dauerton — dann bleibt die
     Frequenz stehen. */
  function ton(typ, t0, von, bis, an, halten, ab, gipfel) {
    var c = kontext(), o = c.createOscillator(), g = c.createGain();
    o.type = typ;
    o.frequency.setValueAtTime(von, t0);
    if (bis) o.frequency.exponentialRampToValueAtTime(Math.max(1, bis), t0 + an + halten + ab);
    o.connect(g); g.connect(meister);
    huelle(g, t0, an, halten, ab, gipfel);
    o.start(t0); o.stop(t0 + an + halten + ab + 0.05);
  }

  /* Gefiltertes Rauschen: das Material fuer jeden Einschlag. `art` waehlt den
     Filtertyp — Bandpass klingt hohl (Treffer), Tiefpass dumpf (Einsturz). */
  function knall(t0, art, freq, q, an, halten, ab, gipfel) {
    var c = kontext(), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = rauschen(); s.loop = true;
    f.type = art; f.frequency.value = freq; f.Q.value = q || 1;
    s.connect(f); f.connect(g); g.connect(meister);
    huelle(g, t0, an, halten, ab, gipfel);
    s.start(t0); s.stop(t0 + an + halten + ab + 0.05);
  }

  /* Jede Funktion faengt sich selbst ab: ein WebGL-Kontextverlust darf das
     Brett anhalten, ein Audio-Fehler nie das Spiel. */
  function sicher(fn) {
    return function () {
      if (!verfuegbar()) return;
      try { fn.apply(null, arguments); } catch (e) { /* Ton ist Zugabe, kein Vertrag */ }
    };
  }

  var GROSS = { gross: 1, toedlich: 1, finale: 1 };

  /* ---- Treffer ---------------------------------------------------------
     `anteil` ist derselbe Bruchteil der Lebenspunkte, den auch das Brett fuer
     Rueckstoss und Erschuetterung nimmt (siehe `Brett3D.treffer`) — ein
     Kratzer klickt, ein Achtel der Lebenspunkte dröhnt. */
  var treffer = sicher(function (anteil, beat) {
    var t0 = kontext().currentTime, gross = !!GROSS[beat];
    anteil = Math.max(0, Math.min(1, anteil || 0));
    knall(t0, 'bandpass', 2200 - anteil * 1500, 2.2, 0.002, 0, 0.09 + anteil * 0.1, 0.5 + anteil * 0.4);
    ton('triangle', t0, 260 - anteil * 90, 90, 0.001, 0, 0.11 + anteil * 0.09, 0.22 + anteil * 0.18);
    if (gross) knall(t0 + 0.02, 'lowpass', 140, 0.9, 0.005, 0.02, 0.28, 0.5);
  });

  /* ---- Heilung -----------------------------------------------------------
     Zwei Toene im Terzabstand, weich — das einzige Signal im Kampf, das nach
     oben steigt statt einzuschlagen. */
  var heilung = sicher(function () {
    var t0 = kontext().currentTime;
    ton('sine', t0, 420, 0, 0.02, 0.05, 0.22, 0.18);
    ton('sine', t0 + 0.06, 520, 0, 0.02, 0.05, 0.26, 0.15);
  });

  /* ---- Tod ---------------------------------------------------------------
     Eine fallende Sinuslinie plus ein dumpfer Rauschstoss — auf `finale`
     laenger und eine Terz tiefer, das ist der letzte Fall des Kampfes. */
  var tod = sicher(function (beat) {
    var t0 = kontext().currentTime, letzter = beat === 'finale';
    ton('sine', t0, letzter ? 180 : 220, letzter ? 45 : 70, 0.005, 0.03, letzter ? 0.6 : 0.32, letzter ? 0.4 : 0.28);
    knall(t0 + 0.01, 'lowpass', letzter ? 260 : 380, 0.7, 0.005, 0.02, letzter ? 0.5 : 0.3, 0.4);
  });

  /* ---- Signatur ------------------------------------------------------------
     Kein Effekt je Name, wie bei den Funken auf dem Brett — eine Handvoll
     Klangfamilien je nach Schluesselwort, plus eine kleine, aus dem Namen
     abgeleitete Verstimmung, damit nicht jede Signatur derselben Familie
     identisch klingt. */
  var FAMILIE = {
    brand: 'attacke', gift: 'attacke', frost: 'attacke', donner: 'attacke',
    licht: 'attacke', exekution: 'attacke', blutung: 'attacke',
    konter: 'attacke', verwundbar: 'attacke',
    flaeche: 'wucht',
    heilung: 'segen', schild: 'segen', tempo: 'segen', antichaos: 'segen',
    schatten: 'unheimlich', dunkelheit: 'unheimlich', verderbnis: 'unheimlich', chaos: 'unheimlich'
  };

  function verstimmung(kw) {
    var h = 0;
    for (var i = 0; i < String(kw).length; i++) h = (h * 31 + String(kw).charCodeAt(i)) % 100;
    return 1 + (h / 100 - 0.5) * 0.16;            // ±8 %, hoerbar aber nicht falsch
  }

  var aktiv = sicher(function (kw, beat) {
    var t0 = kontext().currentTime, v = verstimmung(kw);
    var fam = FAMILIE[kw] || 'attacke';
    if (fam === 'segen') {
      ton('triangle', t0, 480 * v, 640 * v, 0.03, 0.06, 0.24, 0.16);
    } else if (fam === 'unheimlich') {
      ton('sawtooth', t0, 300 * v, 140 * v, 0.02, 0.04, 0.3, 0.1);
      knall(t0, 'bandpass', 700 * v, 4, 0.02, 0.03, 0.22, 0.14);
    } else if (fam === 'wucht' || beat === 'flaeche') {
      knall(t0, 'lowpass', 500 * v, 0.8, 0.005, 0.04, 0.34, 0.42);
      ton('sine', t0, 130 * v, 55 * v, 0.005, 0.03, 0.3, 0.24);
    } else {
      knall(t0, 'bandpass', 1600 * v, 3, 0.001, 0, 0.14, 0.28);
      ton('sawtooth', t0, 620 * v, 180 * v, 0.002, 0, 0.16, 0.16);
    }
  });

  root.Ton = { stufe: setzeStufe, verfuegbar: verfuegbar, wecken: wecken,
               treffer: treffer, heilung: heilung, tod: tod, aktiv: aktiv };

})(typeof globalThis !== 'undefined' ? globalThis : this);

});
