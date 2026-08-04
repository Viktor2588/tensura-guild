/* dev/silhouetten.js — prüft die Platzhalter-Figuren aus `js/brett3d.js`.
   NICHT Teil des Spiels.   Aufruf:  node dev/silhouetten.js

   Warum ein eigener Prüfstand: `platzhalter()` zeichnet auf ein Canvas, und
   weder `dev/sim.js` (kein DOM) noch `dev/uitest.js` (jsdom ohne 2D-Kontext)
   können das ausführen. Ein Stub-Kontext, der die Zeichenbefehle mitschreibt,
   reicht für die zwei Fragen, die zählen:

     1. Wirft keine Kombination aus Art, Rolle und Seite?
     2. Sieht jede ART anders aus als jede andere?

   Punkt 2 ist der eigentliche Test. Eine Merkmalstabelle, in der zwei Einträge
   dieselben Werte tragen, fällt sonst niemandem auf — auf dem Brett stünden
   dann zwei Arten mit identischer Silhouette da, und genau dagegen ist die
   Art-Achse gebaut. */
'use strict';
require('../js/rng.js');
require('../js/hex.js');
require('../js/abilities.js');
require('../js/data.js');

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } }

/* Ein Kontext, der jeden Aufruf als Text sammelt. Zahlen werden gerundet, damit
   Gleitkomma-Rauschen keine Unterschiede vortäuscht. */
function stubKontext(spur) {
  var ctx = {};
  ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'rect',
   'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'save', 'restore',
   'translate', 'scale', 'rotate'].forEach(function (n) {
    ctx[n] = function () {
      var args = [].slice.call(arguments).map(function (v) {
        return typeof v === 'number' ? Math.round(v * 100) / 100 : v;
      });
      spur.push(n + '(' + args.join(',') + ')');
    };
  });
  return ctx;
}

var letzteSpur = null;
global.document = {
  createElement: function () {
    return { width: 0, height: 0, getContext: function () {
      letzteSpur = []; return stubKontext(letzteSpur);
    } };
  }
};
/* `platzhalter` endet mit `new THREE.CanvasTexture(c)` — mehr braucht es nicht. */
global.THREE = { CanvasTexture: function () { return { magFilter: null }; },
                 NearestFilter: 1 };
require('../js/brett3d.js');

var B3 = globalThis.Brett3D;
ok(B3 && typeof B3.platzhalter === 'function',
   'brett3d.js gibt platzhalter() nach aussen — sonst ist hier nichts zu pruefen');
if (!B3 || !B3.platzhalter) { console.log('\n' + pass + '/' + (pass + fail) + ' ok'); process.exit(1); }

var ARTEN = ['slime', 'goblin', 'oger', 'direwolf', 'echsenmensch', 'insektoid',
             'daemon', 'drache', 'untot', 'bestie', 'ork', 'mensch'];
var ROLLEN = ['front', 'fernkampf', 'magier', 'unterstuetzer', 'verstaerker'];

console.log('--- Alle Kombinationen zeichnen ---');
var spuren = {};
ARTEN.forEach(function (art) {
  ROLLEN.forEach(function (rolle) {
    ['player', 'enemy'].forEach(function (seite) {
      var u = { tags: [art, rolle], role: rolle, side: seite, key: art + rolle + seite };
      var geworfen = null;
      try { B3.platzhalter(u); } catch (e) { geworfen = e; }
      ok(!geworfen, art + '/' + rolle + '/' + seite + ' zeichnet ohne Fehler: ' +
         (geworfen && geworfen.message));
      if (!geworfen && rolle === 'front' && seite === 'player') {
        spuren[art] = letzteSpur.join('|');
      }
    });
  });
});

console.log('--- Jede Art sieht anders aus ---');
ARTEN.forEach(function (a, i) {
  ARTEN.slice(i + 1).forEach(function (b) {
    ok(spuren[a] !== spuren[b],
       'Art ' + a + ' und ' + b + ' zeichnen identisch — eine der beiden traegt kein eigenes Merkmal');
  });
});

console.log('--- Unbekannte Art faellt auf mensch zurueck ---');
/* Ein neuer Eintrag in `data.js` darf nie eine leere Kachel erzeugen. */
var unbekannt = null;
try { B3.platzhalter({ tags: ['gibtesnicht', 'front'], role: 'front', side: 'player' }); }
catch (e) { unbekannt = e; }
ok(!unbekannt, 'unbekannte Art wirft nicht: ' + (unbekannt && unbekannt.message));
ok(letzteSpur.join('|') === spuren.mensch, 'unbekannte Art zeichnet wie mensch');

console.log('--- Jede Art im Spiel hat einen Eintrag ---');
/* Der Rueckfall auf `mensch` ist eine Notbremse, kein Ersatz fuer Pflege: eine
   Art, die im Spiel steht, soll ihre eigene Silhouette haben. */
require('../js/combat.js');
require('../js/enemies.js');
var GD = globalThis.GameData, EN = globalThis.Enemies;
var imSpiel = {};
GD.units.forEach(function (u) { imSpiel[u.tags[0]] = 1; });
/* Die 72 Gegner zaehlen genauso: sie stehen auf demselben Brett und nehmen
   denselben Platzhalter. Ein Gegner ohne Art faellt stumm auf `mensch`. */
EN.all.forEach(function (e) { imSpiel[(e.tags || [])[0]] = 1; });
Object.keys(imSpiel).forEach(function (art) {
  ok(ARTEN.indexOf(art) >= 0, 'Art "' + art + '" steht im Spiel, aber nicht in ARTEN');
});

console.log('\n' + pass + '/' + (pass + fail) + ' ok');
process.exit(fail ? 1 : 0);
