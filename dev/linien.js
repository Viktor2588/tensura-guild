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

/* Kämpfe je Härtestufe. `--proben N` hebt sie an: bei 70 liegt der Standard-
   fehler der Quote bei rund 6 Punkten, und ein Unterschied von einem Gitter-
   schritt (0,09) ist damit nicht von Rauschen zu unterscheiden. Zum Nachmessen
   einzelner Einheiten lohnen 300; für den Rundumlauf wäre es zu teuer. */
var PROBEN = 70;
process.argv.forEach(function (a, i) {
  if (a === '--proben') PROBEN = parseInt(process.argv[i + 1], 10) || PROBEN;
});
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
  /* Auflösung nach Probenzahl. Fünf Schritte lösen 0,09 auf; sieben 0,02, was
     bei 70 Proben (Standardfehler rund 6 Punkte) nur Rauschen wäre und je
     Schritt trotzdem 140 Kämpfe kostet.

     Seit die Spalten gegen einen GEMISCHTEN Bau zählen statt gegen die nackte
     Einheit, sind die Unterschiede aber kleiner: „vier Passive statt keiner"
     bewegt den Bruchpunkt um Zehntel, „diese Linie statt einer anderen" um
     Hundertstel. Auf dem 0,09-Gitter steht dann überall +0.00, und der
     Rundumlauf sagt nichts mehr. Wer genau hinsehen will, zahlt beides:
     `--proben 300` schaltet auch die feineren Schritte frei. */
  var schritte = PROBEN >= 250 ? 7 : PROBEN >= 120 ? 6 : 5;
  for (var i = 0; i < schritte; i++) {
    var mid = (lo + hi) / 2;
    if (quote(id, rank, passives, mid) > 0.5) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

var LINIEN = ['angriff', 'mechanik', 'unterstuetzung', 'defensive'];

/* ---- Warum nicht vier aus EINER Linie? ----------------------------------
   Bis Phase 78 hat diese Datei je Linie alle `rank + 1` Plätze aus derselben
   Linie gefüllt. Das misst einen Bau, den das Spiel nicht kennt: der Aufstieg
   legt vier aus SECHZEHN vor, über alle Linien. Wer vier aus einer Linie
   nimmt, stapelt auch deren vier Preise — Gerudos Mechaniklinie stand so bei
   −0.17, obwohl keine ihrer Passiven einzeln unter −0.04 lag.

   Jetzt: die halben Plätze aus der geprüften Linie (aufgerundet), der Rest
   reihum aus den anderen dreien. Und verglichen wird gegen einen ebenso
   gemischten Referenzbau statt gegen die nackte Einheit — sonst misst die
   Spalte weiter „Passive gegen keine Passive" und nicht „diese Linie gegen
   eine andere", was die Frage beim Aufstieg ist.                            */
function mischung(L, slots, ausser) {
  var quellen = LINIEN.filter(function (l) { return l !== ausser; });
  var out = [];
  for (var stufe = 0; out.length < slots && stufe < 4; stufe++) {
    for (var i = 0; i < quellen.length && out.length < slots; i++) {
      out.push(L[quellen[i]][stufe]);
    }
  }
  return out;
}
/* Die halben Plätze aus der geprüften Linie, und die BEZAHLTE zuerst: sie ist
   die Identität der Linie (`PREIS_INDEX` in abilities.js, Stelle 4), und wer
   sich auf eine Linie legt, nimmt sie mit. Genau einen Preis statt vier — das
   war der Fehler der alten Messung, nicht der Preis an sich. Die Stellen 0-2
   sind keine Stufen mehr, die Reihenfolge dahinter ist also frei. */
function bauplan(L, lin, slots) {
  var eigen = [L[lin][3]].concat(L[lin].slice(0, 3)).slice(0, Math.ceil(slots / 2));
  return eigen.concat(mischung(L, slots - eigen.length, lin));
}
var wen = process.argv.slice(2).filter(function (a, i, all) {
  return a.indexOf('--') !== 0 && all[i - 1] !== '--proben';
});
if (!wen.length) wen = Object.keys(AB.linien);

console.log('Bruchpunkt = Gegnerstärke, bei der die Siegquote durch 50 % geht.');
console.log('Höher ist besser. „ohne" ist die nackte Einheit, „gemischt" ein Bau');
console.log('reihum aus allen vier Linien — die Deltas zählen gegen „gemischt",');
console.log('denn das ist die Frage beim Aufstieg: diese Linie statt einer anderen.\n');
console.log('Einheit       Rang   ohne  gem.   Angriff  Mechanik  Unterst.  Defensiv');

wen.forEach(function (id) {
  var L = AB.linien[id];
  if (!L) { console.log('  ' + id + ': keine Linien'); return; }
  [1, 3].forEach(function (rank) {
    var slots = rank + 1;
    var nackt = bruchpunkt(id, rank, []);
    var basis = bruchpunkt(id, rank, mischung(L, slots, null));
    var zeile = GD.unit(id).name.padEnd(14) + R.RANK_NAME[rank].padEnd(6) +
      nackt.toFixed(2).padStart(5) + basis.toFixed(2).padStart(6);
    LINIEN.forEach(function (lin) {
      var b = bruchpunkt(id, rank, bauplan(L, lin, slots));
      var d = b - basis;
      zeile += ('  ' + b.toFixed(2) + (d >= 0 ? ' +' : ' ') + d.toFixed(2)).padStart(10);
    });
    console.log(zeile);
  });
});
