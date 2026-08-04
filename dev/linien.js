/* dev/linien.js — vergleicht die vier Linien einer Einheit. NICHT Teil des Spiels.
   Aufruf:  node dev/linien.js [einheit ...]      ohne Angabe: alle mit Linien

   Warum nicht einfach die Siegquote bei fester Härte messen? Weil das defensive
   Linien systematisch unterschlägt: bei einer Härte, die der Trupp ohnehin nicht
   überlebt, steht jede Variante bei 0 %, und bei einer, die er locker schafft,
   bei 100 %. Zwischen beidem liegt der interessante Bereich — und der ist je
   Einheit woanders.

   Gemessen wird deshalb der BRUCHPUNKT: der Gegner-Multiplikator, bei dem die
   Siegquote durch 50 % geht. Eine Linie, die den Bruchpunkt von 1.0 auf 1.3
   schiebt, ist 30 % Härte wert — egal ob sie das über Schaden oder über
   Überleben tut.                                                              */
'use strict';
require('../js/rng.js');
require('../js/hex.js');
require('../js/abilities.js');
require('../js/data.js');
require('../js/combat.js');
require('../js/enemies.js');
require('../js/run.js');
var GD = globalThis.GameData, EN = globalThis.Enemies,
    R = globalThis.Run, AB = globalThis.Abilities, C = globalThis.Combat;

var PROBEN = 70;                        // Kämpfe je Härtestufe
var BEGLEITUNG = ['rigurd', 'gobwa', 'souka', 'sturmwolf'];

/* Ein Trupp aus der Prüf-Einheit und drei Begleitern, deren Art nicht kollidiert. */
function trupp(id, rank, passives) {
  var art = GD.unit(id).art;
  var team = [bau(id, rank, passives)];
  BEGLEITUNG.forEach(function (b) {
    if (team.length >= 4 || GD.unit(b).art === art) return;
    team.push(bau(b, rank, null));
  });
  return team;
}
/* Der Referenztrupp muss Luft nach beiden Seiten haben. Mit nur einem Item lag
   der Bruchpunkt mancher Einheit genau auf der Untergrenze der Suche — dann
   lesen alle vier Linien denselben Bodenwert und die Messung sagt nichts. */
var AUSRUESTUNG = ['heldenmal', 'plattenpanzer', 'langschwert', 'amulett', 'stiefel'];
function bau(id, rank, passives) {
  var m = R.member(id);
  m.rank = rank;
  m.items = AUSRUESTUNG.slice(0, R.itemSlots(m));
  if (passives) m.passives = passives;
  return R.resolve(m);
}

/* Ein Unentschieden am Zug-Limit als Niederlage zu werten verzerrt genau die
   Einheiten, die auf Ausdauer gebaut sind: ihre Kämpfe laufen lang, und dann
   misst der Prüfstand nicht mehr ihre Stärke, sondern nur noch, wann Kämpfe
   aufhören sich aufzulösen. Wer am Limit vorn liegt, hat gewonnen. */
function gewonnen(r) {
  if (r.winner === 'player') return true;
  if (r.winner !== 'draw') return false;
  var meine = 0, ihre = 0;
  r.survivors.forEach(function (u) {
    if (u.side === 'player') meine += u.hp / u.maxHp; else ihre += u.hp / u.maxHp;
  });
  return meine > ihre;
}

function quote(id, rank, passives, haerte) {
  var enc = EN.forAct(4), w = 0;
  for (var s = 0; s < PROBEN; s++) {
    if (gewonnen(C.simulate(trupp(id, rank, passives), EN.build(enc[s % enc.length], haerte), s))) w++;
  }
  return w / PROBEN;
}

/* Binäre Suche auf der Härte: wo geht die Siegquote durch die Hälfte? */
function bruchpunkt(id, rank, passives) {
  var lo = 0.2, hi = 3.0;
  if (quote(id, rank, passives, lo) < 0.5) return lo;      // schafft nicht mal das
  if (quote(id, rank, passives, hi) > 0.5) return hi;
  /* Fünf Schritte, nicht sieben. Sieben lösen 2,8/128 = 0,02 Härte auf — bei
     70 Proben je Punkt liegt der Standardfehler der Quote aber schon bei rund
     6 Prozentpunkten, die letzten beiden Halbierungen messen also Rauschen und
     kosten trotzdem je 140 Kämpfe. Fünf Schritte reichen auf 0,09 genau, und
     der Lauf wird um gut ein Viertel kürzer. */
  for (var i = 0; i < 5; i++) {
    var mid = (lo + hi) / 2;
    if (quote(id, rank, passives, mid) > 0.5) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

var LINIEN = ['angriff', 'mechanik', 'unterstuetzung', 'defensive'];
var wen = process.argv.slice(2);
if (!wen.length) wen = Object.keys(AB.linien);

console.log('Bruchpunkt = Gegnerstärke, bei der die Siegquote durch 50 % geht.');
console.log('Höher ist besser. „ohne" ist der Grundwert derselben Einheit.\n');
console.log('Einheit       Rang   ohne   Angriff  Mechanik  Unterst.  Defensiv');

wen.forEach(function (id) {
  var L = AB.linien[id];
  if (!L) { console.log('  ' + id + ': keine Linien'); return; }
  [1, 3].forEach(function (rank) {
    var basis = bruchpunkt(id, rank, []);
    var zeile = GD.unit(id).name.padEnd(14) + R.RANK_NAME[rank].padEnd(6) +
      basis.toFixed(2).padStart(5);
    LINIEN.forEach(function (lin) {
      var p = L[lin].slice(0, rank + 1);
      var b = bruchpunkt(id, rank, p);
      var d = b - basis;
      zeile += ('  ' + b.toFixed(2) + (d >= 0 ? ' +' : ' ') + d.toFixed(2)).padStart(10);
    });
    console.log(zeile);
  });
});
