/* dev/audiolabor.js — prüft den Umschalter aus `js/audio-labor/labor.js`.
   NICHT Teil des Spiels.   Aufruf:  node dev/audiolabor.js

   Dieser Branch ist ein Prüfstand für die 21 Audio-Varianten aus den offenen
   PRs (siehe `AUDIO-LABOR.md`). Ohne dieses Skript wüsste man von einer
   Variante nur, dass sie nicht kracht — nicht, dass sie tatsächlich Töne
   erzeugt und dass eine abgewählte wirklich schweigt.

   Ein Stub für die Web Audio API schreibt jeden Aufruf mit. Damit sind vier
   Fragen beantwortbar, die im Browser nur mit dem Ohr zu prüfen wären:

     1. Registriert sich jede der 21 Varianten überhaupt?
     2. Baut jede ohne Ausnahme, und exportiert sie unter dem Namen, den
        `KATALOG` in `labor.js` erwartet? (Ein Tippfehler dort führte sonst zu
        einer stummen Auswahl, die aussieht, als klänge die Variante nicht.)
     3. Erzeugt jede auf einen Kampf-Log Oszillatoren — hört man also etwas?
     4. Schweigt eine abgewählte Variante wirklich, und klingen zwei
        angehakte zusammen? Beides ist der Punkt der Mehrfachwahl. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var wurzel = path.join(__dirname, '..');
var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } }

/* ------------------------------------------------------- Web-Audio-Attrappe

   Nur so viel, wie die Varianten anfassen. Jeder erzeugte Oszillator und jede
   Rauschquelle wird gezählt — die Zahl ist das Messergebnis: 0 heißt stumm. */
function baueStub(zaehler, uhr) {
  function param() {
    return { value: 0, setValueAtTime: function () { return this; },
             linearRampToValueAtTime: function () { return this; },
             exponentialRampToValueAtTime: function () { return this; },
             setTargetAtTime: function () { return this; },
             cancelScheduledValues: function () { return this; } };
  }
  /* `stop()` loest `onended` sofort aus. Das ist keine Kosmetik: mehrere
     Varianten zaehlen gleichzeitig klingende Stimmen mit und steigen ueber
     einem Deckel aus (`if (stimmenAktiv >= STIMMEN_MAX) return;`).
     Gaebe die Attrappe die Stimmen nie frei, liefe der Zaehler voll und die
     Variante waere ab dem zweiten Kampf stumm — ein Fehler der Attrappe, der
     wie ein Fehler der Variante aussieht. */
  function knoten(extra) {
    var n = { connect: function (z) { return z; }, disconnect: function () {},
              start: function () {},
              stop: function () { if (typeof n.onended === 'function') n.onended(); },
              gain: param(), frequency: param(), Q: param(), detune: param(),
              type: 'sine', buffer: null, loop: false, playbackRate: param(),
              onended: null };
    if (extra) Object.keys(extra).forEach(function (k) { n[k] = extra[k]; });
    return n;
  }
  function Ctx() {
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = knoten();
  }
  /* `currentTime` liest eine Uhr, die der Test weiterstellt. Ohne das laegen
     alle acht Logeintraege auf derselben Sekunde, und jede Variante mit einem
     Mindestabstand je Ereignisart (PR #22: 30 ms) verwuerfe sieben davon —
     im Browser vergehen zwischen zwei Eintraegen die Millisekunden, die
     `Regie.zeitplan` zuteilt. */
  Object.defineProperty(Ctx.prototype, 'currentTime', {
    get: function () { return uhr.t; }
  });
  Ctx.prototype.createOscillator = function () { zaehler.osz++; return knoten(); };
  Ctx.prototype.createBufferSource = function () { zaehler.rausch++; return knoten(); };
  Ctx.prototype.createGain = function () { return knoten(); };
  Ctx.prototype.createBiquadFilter = function () { return knoten(); };
  Ctx.prototype.createDynamicsCompressor = function () {
    return knoten({ threshold: param(), knee: param(), ratio: param(),
                    attack: param(), release: param() });
  };
  Ctx.prototype.createStereoPanner = function () { return knoten({ pan: param() }); };
  Ctx.prototype.createWaveShaper = function () { return knoten({ curve: null, oversample: 'none' }); };
  Ctx.prototype.createConvolver = function () { return knoten({ normalize: true }); };
  Ctx.prototype.createDelay = function () { return knoten({ delayTime: param() }); };
  Ctx.prototype.createBuffer = function (kanaele, laenge) {
    return { length: laenge, numberOfChannels: kanaele, sampleRate: 44100,
             getChannelData: function () { return new Float32Array(laenge); } };
  };
  Ctx.prototype.createPeriodicWave = function () { return {}; };
  Ctx.prototype.resume = function () { this.state = 'running'; return Promise.resolve(); };
  Ctx.prototype.suspend = function () { this.state = 'suspended'; return Promise.resolve(); };
  Ctx.prototype.close = function () { return Promise.resolve(); };
  return Ctx;
}

/* Ein localStorage-Ersatz: mehrere Varianten merken sich ihre Stufe darin. */
function speicherStub() {
  var d = {};
  return { getItem: function (k) { return k in d ? d[k] : null; },
           setItem: function (k, v) { d[k] = String(v); },
           removeItem: function (k) { delete d[k]; } };
}

/* --------------------------------------------------------------- Aufbau */

var zaehler = { osz: 0, rausch: 0 };
/* Die Kampfuhr. Ein Logeintrag kostet laut `Regie` zwischen 40 und 400 ms;
   0,15 s je Eintrag liegt mitten drin. */
var uhr = { t: 0 };
var TAKT = 0.15;
var sandkasten = {
  console: console, Math: Math, Date: Date, Promise: Promise,
  Float32Array: Float32Array, Uint8Array: Uint8Array, Object: Object,
  Array: Array, JSON: JSON, Proxy: Proxy, Reflect: Reflect, String: String,
  Number: Number, Boolean: Boolean, Error: Error, isNaN: isNaN, parseInt: parseInt,
  parseFloat: parseFloat, setTimeout: setTimeout, clearTimeout: clearTimeout,
  AudioContext: baueStub(zaehler, uhr), localStorage: speicherStub(),
  /* PR #20 drosselt nicht ueber `ctx.currentTime`, sondern ueber
     `performance.now()` — mit der Begruendung, dass sich Ersteres innerhalb
     eines synchronen Durchlaufs nicht bewegt. Beide Uhren muessen deshalb
     dieselbe sein, sonst misst der Test die Laufzeit des Tests. */
  performance: { now: function () { return uhr.t * 1000; } }
};
sandkasten.globalThis = sandkasten;
sandkasten.window = sandkasten;
vm.createContext(sandkasten);

function lade(rel) {
  vm.runInContext(fs.readFileSync(path.join(wurzel, rel), 'utf8'), sandkasten, { filename: rel });
}

lade('js/audio-labor/labor.js');
var dateien = fs.readdirSync(path.join(wurzel, 'js/audio-labor'))
  .filter(function (f) { return /^pr-\d\d-.*\.js$/.test(f); }).sort();
dateien.forEach(function (f) { lade('js/audio-labor/' + f); });

var Labor = sandkasten.AudioLabor;

/* Ein Kampf-Log, das jede Ereignisart einmal trägt — dieselben Felder, die
   `js/combat.js` schreibt und `js/ui.js` an `AudioLabor.spiele` weiterreicht. */
var LOG = [
  { type: 'aktiv', key: 'a1', ziel: 'e1', kw: 'feuer', side: 'player' },
  { type: 'hit', key: 'e1', von: 'a1', dmg: 34, maxHp: 120, hp: 86 },
  { type: 'heal', key: 'a1', amount: 18, hp: 100 },
  { type: 'schild', key: 'a1', amount: 12 },
  { type: 'status', key: 'e1', status: 'blutung', stacks: 2 },
  { type: 'death', key: 'e1' },
  { type: 'revive', key: 'e1', hp: 30 },
  { type: 'end', winner: 'player' }
];
var BEATS = [null, 'toedlich', null, null, null, 'finale', null, 'finale'];

/* --------------------------------------------------------------- Prüfung */

console.log('--- Registrierung ---');
var liste = Labor.liste();
ok(liste.length === 21, 'Katalog führt 21 Varianten, gefunden: ' + liste.length);
ok(dateien.length === 21, '21 Varianten-Dateien auf der Platte, gefunden: ' + dateien.length);
liste.forEach(function (v) {
  ok(v.bereit, 'PR #' + v.pr + ' (' + v.id + ') hat sich registriert');
});

console.log('--- Bauen, Klingen, Umschalten ---');
var stumm = [], abdeckung = [];
liste.forEach(function (v, i) {
  var vorher = zaehler.osz + zaehler.rausch;
  var gewaehlt = Labor.waehle([v.id]);
  ok(gewaehlt.length === 1 && gewaehlt[0] === v.id,
     v.id + ': Auswahl greift (zurueck kam "' + gewaehlt.join(',') + '")');

  var nachBau = Labor.liste()[i];
  ok(!nachBau.fehler, v.id + ': baut ohne Ausnahme' + (nachBau.fehler ? ' — ' + nachBau.fehler : ''));

  /* Bewusst OHNE `klick()`: der Klickton laeuft bei mehreren Varianten an der
     Log-Verteilung vorbei. Zaehlte er mit, bestuende der Test auch dann, wenn
     vom ganzen Kampf nichts zu hoeren waere — genau der Fall, in dem PR #4
     und PR #21 zuerst durchgerutscht sind. */
  LOG.forEach(function (l, k) { uhr.t += TAKT; Labor.spiele(l, BEATS[k]); });

  var erzeugt = (zaehler.osz + zaehler.rausch) - vorher;
  if (erzeugt === 0) stumm.push('PR #' + v.pr);
  ok(erzeugt > 0, v.id + ': erzeugt Klaenge auf den Kampf-Log (Quellen: ' + erzeugt + ')');

  /* Und jedes einzelne Ereignis muss ankommen: eine Variante, die nur auf
     `hit` reagiert, waere sonst von einer vollstaendigen nicht zu
     unterscheiden. Gezaehlt wird, auf wie viele der acht Eintraege sie
     ueberhaupt antwortet. */
  var treffer = 0;
  LOG.forEach(function (l, k) {
    var v0 = zaehler.osz + zaehler.rausch;
    uhr.t += TAKT;
    Labor.spiele(l, BEATS[k]);
    if ((zaehler.osz + zaehler.rausch) > v0) treffer++;
  });
  ok(treffer >= 3, v.id + ': antwortet auf mehrere Ereignisarten (' + treffer + ' von ' + LOG.length + ')');
  abdeckung.push({ pr: v.pr, treffer: treffer });
});

/* Der eigentliche Zweck des Umschalters: nach dem Wechsel darf die vorherige
   Variante nichts mehr beitragen. Geprüft wird die zuletzt gewählte gegen
   `aus` — bleibt der Zähler stehen, schweigen alle 21. */
console.log('--- Abwaehlen und Mehrfachwahl ---');
Labor.waehle([]);
var vorAus = zaehler.osz + zaehler.rausch;
LOG.forEach(function (l, k) { uhr.t += TAKT; Labor.spiele(l, BEATS[k]); });
Labor.klick();
ok((zaehler.osz + zaehler.rausch) === vorAus,
   'ohne Haken erzeugt kein Modul mehr Klaenge');
ok(Labor.gewaehlt().length === 0, 'leere Auswahl ist der gemerkte Zustand');
ok(Labor.waehle('aus').length === 0, 'das alte "aus" heisst weiter leere Auswahl');

/* Ein Haken weg heisst still. Ohne den `schalte(..., false)`-Schritt in
   `waehle()` liefe die abgewaehlte Variante weiter. */
Labor.waehle([liste[0].id]);
LOG.forEach(function (l, k) { uhr.t += TAKT; Labor.spiele(l, BEATS[k]); });
Labor.waehle([liste[1].id]);
var vorZweit = zaehler.osz + zaehler.rausch;
uhr.t += TAKT;
Labor.spiele(LOG[1], 'toedlich');
ok((zaehler.osz + zaehler.rausch) > vorZweit, 'nach dem Wechsel klingt die neue Variante');

/* Der Punkt der Mehrfachwahl: zwei angehaekelte Varianten muessen auf
   denselben Logeintrag zusammen mehr Quellen erzeugen als jede allein. */
function quellenFuer(ids) {
  Labor.waehle(ids);
  var v0 = zaehler.osz + zaehler.rausch;
  LOG.forEach(function (l, k) { uhr.t += TAKT; Labor.spiele(l, BEATS[k]); });
  return (zaehler.osz + zaehler.rausch) - v0;
}
var a = liste[0].id, b = liste[1].id;
var nurA = quellenFuer([a]), nurB = quellenFuer([b]), beide = quellenFuer([a, b]);
ok(beide === nurA + nurB,
   'zwei Haken klingen zusammen (' + nurA + ' + ' + nurB + ' = ' + beide + ')');
ok(Labor.gewaehlt().length === 2, 'zwei Haken bleiben beide gemerkt');

/* Reihenfolge der Klicks darf die gemerkte Auswahl nicht aendern — das Menue
   schreibt sie so in `localStorage`. */
ok(Labor.waehle([b, a]).join(',') === Labor.waehle([a, b]).join(','),
   'Auswahl kommt in Katalogreihenfolge zurueck, nicht in Klickreihenfolge');

/* Alle 21 gleichzeitig: der Extremfall aus dem Menue. Im Browser stoesst das
   an das AudioContext-Limit, im Stub nicht — hier zaehlt nur, dass der
   Verteiler nicht aussteigt und jede angehaekelte Variante beliefert wird. */
var alle = liste.map(function (v) { return v.id; });
ok(Labor.waehle(alle).length === 21, 'alle 21 lassen sich gleichzeitig anhaken');
var vorAlle = zaehler.osz + zaehler.rausch;
uhr.t += TAKT;
Labor.spiele(LOG[1], 'toedlich');
ok((zaehler.osz + zaehler.rausch) - vorAlle >= 10,
   'mit allen 21 Haken liefert der Verteiler an viele Varianten gleichzeitig');
Labor.waehle([]);

/* Wie breit deckt eine Variante das Kampflog ab? Das ist kein Bestehen oder
   Durchfallen, sondern die Zahl, nach der man beim Anhoeren sucht: eine
   Variante mit 3 von 8 laesst den halben Kampf stumm, egal wie gut die drei
   Klaenge sind. */
console.log('');
console.log('--- Abdeckung (von ' + LOG.length + ' Ereignisarten) ---');
abdeckung.sort(function (a, b) { return b.treffer - a.treffer || a.pr - b.pr; })
  .forEach(function (a) {
    console.log('  PR #' + (a.pr < 10 ? ' ' : '') + a.pr + '  ' +
                new Array(a.treffer + 1).join('#') +
                new Array(LOG.length - a.treffer + 1).join('.') + '  ' + a.treffer);
  });

console.log('');
if (stumm.length) console.log('stumm geblieben: ' + stumm.join(', '));
console.log(pass + '/' + (pass + fail) + ' ok');
process.exit(fail ? 1 : 0);
