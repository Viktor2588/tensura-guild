/* dev/hextest.js — prüft die Hexgeometrie für sich, ohne Spiel.
   Aufruf:  node dev/hextest.js                                              */
'use strict';
require('../js/hex.js');
var H = globalThis.Hex;

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function head(s) { console.log('--- ' + s + ' ---'); }
var h = H.hex;

head('Distanz');
ok(H.distanz(h(0, 0), h(0, 0)) === 0, 'zu sich selbst ist null');
ok(H.nachbarn(h(0, 0)).every(function (n) { return H.distanz(h(0, 0), n) === 1; }),
   'jeder der sechs Nachbarn liegt genau eins entfernt');
ok(H.nachbarn(h(0, 0)).length === 6, 'es sind genau sechs');
ok(H.distanz(h(0, 0), h(3, 0)) === 3 && H.distanz(h(0, 0), h(0, 3)) === 3 &&
   H.distanz(h(0, 0), h(3, -3)) === 3, 'drei Schritte in drei Richtungen sind auch drei');
ok(H.distanz(h(2, -1), h(-1, 3)) === H.distanz(h(-1, 3), h(2, -1)), 'Distanz ist symmetrisch');
/* Dreiecksungleichung an zufälligen Punkten — der Test, der eine falsche
   Formel zuverlässig auffliegen lässt. */
var dreieck = true;
for (var i = 0; i < 200; i++) {
  var a = h(i % 7 - 3, (i * 3) % 7 - 3), b = h((i * 5) % 7 - 3, (i * 2) % 7 - 3),
      c = h((i * 11) % 7 - 3, (i * 7) % 7 - 3);
  if (H.distanz(a, c) > H.distanz(a, b) + H.distanz(b, c)) dreieck = false;
}
ok(dreieck, 'die Dreiecksungleichung gilt');

head('Formen');
ok(H.umkreis(h(0, 0), 0).length === 1, 'ein Umkreis mit Reichweite 0 ist das Feld selbst');
ok(H.umkreis(h(0, 0), 1).length === 7, 'mit Reichweite 1 sind es sieben Felder');
ok(H.umkreis(h(0, 0), 2).length === 19, 'mit Reichweite 2 neunzehn');
ok(H.umkreis(h(2, -1), 2).every(function (x) { return H.distanz(h(2, -1), x) <= 2; }),
   'im Umkreis liegt nichts weiter weg als die Reichweite');
ok(H.ring(h(0, 0), 2).length === 12 &&
   H.ring(h(0, 0), 2).every(function (x) { return H.distanz(h(0, 0), x) === 2; }),
   'ein Ring enthält nur den Rand');

head('Bewegung');
ok(H.distanz(H.schritt(h(0, 0), h(4, 0)), h(4, 0)) === 3, 'ein Schritt senkt die Distanz um eins');
ok(H.schritt(h(0, 0), h(0, 0)) === null, 'am Ziel gibt es keinen Schritt mehr');
/* Laufen hält auf Reichweite an, statt in den Gegner hineinzurennen. */
var ziel = h(5, 0);
ok(H.distanz(H.laufe(h(0, 0), ziel, 10, 1), ziel) === 1,
   'wer bis auf Schlagdistanz läuft, bleibt bei eins stehen');
ok(H.distanz(H.laufe(h(0, 0), ziel, 10, 3), ziel) === 3,
   'ein Fernkämpfer bleibt auf seiner Reichweite stehen');
ok(H.distanz(H.laufe(h(0, 0), ziel, 2, 1), ziel) === 3,
   'mehr als die eigenen Schritte geht nicht');
/* Blockade: alles außer der eigenen Zeile ist dicht, der Weg bleibt trotzdem
   gangbar. Und wer ganz eingemauert ist, gibt auf statt zu zappeln. */
ok(H.distanz(H.laufe(h(0, 0), ziel, 10, 1, function (x) { return x.r !== 0; }), ziel) === 1,
   'mit einer Gasse findet er trotzdem hin');
ok(H.gleich(H.laufe(h(0, 0), ziel, 10, 1, function () { return true; }), h(0, 0)),
   'eingemauert bleibt er stehen, statt sich festzurennen');

console.log('\n' + pass + '/' + (pass + fail) + ' ok');
process.exit(fail ? 1 : 0);
