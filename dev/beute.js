/* dev/beute.js — misst, wie viel jede Ausrüstung und jedes Relikt WIRKLICH
   wert ist, und stellt das der Raritätsstufe gegenüber. NICHT Teil des Spiels.
   Aufruf:  node dev/beute.js [items|relikte|passive]

   Gemessen wird wie in `dev/linien.js` der BRUCHPUNKT: die Gegnerstärke, bei
   der die Siegquote durch 50 % geht. Schadenssummen taugen dafür nicht —
   härtere Treffer verkürzen den Kampf, die Summe ist nicht monoton. Der
   Bruchpunkt ist es.

   Zwei Prüfstände, weil die Hälfte der Beute an Bedingungen hängt: „Zustand"
   trägt Gift-, Brand- und Frostquellen, „Wacht" trägt Schild, Konter und
   Heilung. Gewertet wird der BESSERE der beiden — ein Spieler kauft ein Item
   für die Trägerin, zu der es passt, nicht für die, zu der es nicht passt. */
'use strict';
require('../js/rng.js');
require('../js/hex.js');
require('../js/abilities.js');
require('../js/data.js');
require('../js/combat.js');
require('../js/enemies.js');
require('../js/run.js');
var GD = globalThis.GameData, EN = globalThis.Enemies, R = globalThis.Run, C = globalThis.Combat;

var PROBEN = 240;                // SE rund 3 Punkte statt 6,5 — erst damit sind Nachbarstufen unterscheidbar
var RANG = 2;                    // Rang A: drei Item-Slots, zwei Passive

/* Die Prüfstände. `fix` ist die Grundausrüstung des Trupps — die Frostklinge
   im Zustands-Trupp ist die einzige Frostquelle im ganzen Spiel, ohne sie
   messen alle Frost-Verstärker null. */
var STAENDE = {
  zustand: { team: ['drachenwelpe', 'apito', 'ultima', 'carrera'], fix: ['frostklinge'] },
  wacht:   { team: ['gerudo', 'kurobe', 'shuna', 'souei'], fix: [] }
};
/* Relikte mit Truppgrösse- oder Besetzungsbedingung brauchen einen eigenen
   Trupp, sonst misst man ihre unerfüllte Bedingung statt ihrer Stärke. */
var SONDERSTAND = {
  kleines_team: { team: ['gerudo', 'shuna', 'souei'], fix: [] },
  grosses_team: { team: ['gerudo', 'kurobe', 'shuna', 'souei', 'apito', 'carrera'], fix: [] },
  praedator_zahn: { team: ['rimuru', 'gerudo', 'shuna', 'souei'], fix: [] },
  lehrmeister: { team: ['gerudo', 'kurobe', 'shuna', 'souei'], fix: [], rang: 0 }
};

/* Die Prueflinge bekommen Passive. Ein frisch gebautes `member` hat KEINE —
   sie werden im Lauf gewaehlt —, und ein Prueftrupp ohne Passive ist blind
   fuer jede Ausruestung, die daran haengt: die Zwillingsklinge zaehlt die
   Passiven der Traegerin und mass in diesem Stand darum stur +0, auch nachdem
   ihr toter Feldzugriff repariert war. Genommen werden die ersten je Linie,
   soviele wie der Rang traegt — dieselbe Konstruktion wie in dev/linien.js. */
function bau(id, rang, items, extraPassiv) {
  var m = R.member(id);
  m.rank = rang;
  /* `hatLinien` erwartet das MEMBER, nicht die Id — mit einem String liest es
     `AB.linien[undefined]` und ist immer falsch. Genau so stand es nach
     Phase 66 hier, weshalb der Prueftrupp weiterhin ohne Passive antrat und
     die Zwillingsklinge weiterhin +0 mass. Der reparierte Pruefstand war
     selbst kaputt. */
  if (R.hatLinien(m)) {
    var L = globalThis.Abilities.linien[id], reihe = [];
    ['angriff', 'mechanik', 'unterstuetzung', 'defensive'].forEach(function (k) {
      if ((L[k] || [])[0]) reihe.push(L[k][0]);
    });
    m.passives = reihe.slice(0, rang + 1);
  }
  if (extraPassiv) m.passives = (m.passives || []).concat(extraPassiv);
  m.items = items.slice(0, R.itemSlots(m));
  return R.resolve(m);
}
/* Der Pruefling sitzt vorn, wie die Fixtur. Bei lageabhaengigen Passiven ist
   das nicht neutral — vorn heisst Platz 1, also vorderes Glied und ein Umkreis
   von zwei Kameraden im Viererstand. Die Zahl gilt fuer diese Lage, nicht als
   Mittel ueber alle sechs Plaetze. */
function trupp(stand, extraItem, extraPassiv) {
  var rang = stand.rang === undefined ? RANG : stand.rang;
  return stand.team.map(function (id, i) {
    var items = stand.fix.slice(i === 0 ? 0 : stand.fix.length);   // Fixtur nur vorn
    if (extraItem) items = items.concat(extraItem);
    return bau(id, rang, items, i === 0 ? extraPassiv : null);
  });
}

/* Unentschieden am Zug-Limit: wer vorn liegt, hat gewonnen — sonst verzerrt
   die Messung jeden Bau, der auf Ausdauer setzt (siehe dev/linien.js). */
function gewonnen(r) {
  if (r.winner === 'player') return true;
  if (r.winner !== 'draw') return false;
  var meine = 0, ihre = 0;
  r.survivors.forEach(function (u) {
    if (u.side === 'player') meine += u.hp / u.maxHp; else ihre += u.hp / u.maxHp;
  });
  return meine > ihre;
}

function quote(stand, item, relikt, haerte, passiv) {
  var enc = EN.forAct(4), w = 0;
  var opts = relikt ? { relics: [relikt] } : undefined;
  for (var s = 0; s < PROBEN; s++) {
    if (gewonnen(C.simulate(trupp(stand, item, passiv), EN.build(enc[s % enc.length], haerte), s, opts))) w++;
  }
  return w / PROBEN;
}

function bruchpunkt(stand, item, relikt) {
  var lo = 0.2, hi = 3.0;
  if (quote(stand, item, relikt, lo) < 0.5) return lo;
  if (quote(stand, item, relikt, hi) > 0.5) return hi;
  for (var i = 0; i < 7; i++) {
    var mid = (lo + hi) / 2;
    if (quote(stand, item, relikt, mid) > 0.5) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

var RAR = ['', 'üblich', 'ungewöhnl.', 'selten', 'episch', 'legendär'];

/* Der Bruchpunkt taugt als REFERENZ, aber nicht als Messwert je Item: die
   binäre Suche gibt ihn gequantelt zurück, und dutzende Items lesen deshalb
   exakt denselben Wert — die Rangfolge wäre eine Treppe mit drei Stufen.
   Also einmal je Prüfstand den Bruchpunkt suchen, und alles Weitere als
   SIEGQUOTE an genau dieser Härte messen. Dort ist die Kurve am steilsten,
   die Auflösung also am besten, und ein Item kostet einen statt neun Läufe. */
var basis = {}, nullquote = {};
Object.keys(STAENDE).forEach(function (k) {
  basis[k] = bruchpunkt(STAENDE[k], null, null);
  nullquote[k] = quote(STAENDE[k], null, null, basis[k]);
});

function messe(item, relikt, sonder, passiv) {
  if (sonder) {
    var h = bruchpunkt(sonder, null, null);
    return quote(sonder, item, relikt, h, passiv) - quote(sonder, null, null, h);
  }
  var best = -9;
  Object.keys(STAENDE).forEach(function (k) {
    var d = quote(STAENDE[k], item, relikt, basis[k], passiv) - nullquote[k];
    if (d > best) best = d;
  });
  return best;
}

function tabelle(titel, liste, mess) {
  console.log('\n' + titel + '   (Siegquote-Gewinn an der Referenzhärte, höher = stärker)');
  var rows = liste.map(function (x) { return { x: x, d: mess(x) }; })
    .sort(function (a, b) { return b.d - a.d; });
  rows.forEach(function (r) {
    console.log('  ' + r.x.name.padEnd(26) + RAR[r.x.rarity].padEnd(12) +
      (r.d >= 0 ? '+' : '') + (r.d * 100).toFixed(0) + ' Pkt');
  });
  /* Der eigentliche Befund: was bringt eine Stufe im Mittel? Wenn die Kurve
     nicht steigt, steuert die Raritätsstufe nur Farbe und Preis. */
  console.log('  ---- Mittel je Stufe ----');
  [1, 2, 3, 4, 5].forEach(function (r) {
    var e = rows.filter(function (z) { return z.x.rarity === r; });
    if (!e.length) return;
    var m = e.reduce(function (a, z) { return a + z.d; }, 0) / e.length;
    console.log('  ' + RAR[r].padEnd(14) + 'n=' + String(e.length).padEnd(4) +
      'Ø ' + (m >= 0 ? '+' : '') + (m * 100).toFixed(0) + ' Pkt');
  });
  return rows;
}

var was = process.argv[2] || 'alles';
console.log('Grundbruchpunkte: ' + Object.keys(basis).map(function (k) {
  return k + ' ' + basis[k].toFixed(2);
}).join(' · '));
if (was === 'items' || was === 'alles') {
  tabelle('AUSRÜSTUNG', GD.items, function (it) { return messe(it.id, null, null); });
}
if (was === 'relikte' || was === 'alles') {
  tabelle('RELIKTE', GD.relics, function (rl) { return messe(null, rl, SONDERSTAND[rl.id]); });
}
/* Die geteilte Bibliothek war bis hierher ungemessen — es gab schlicht kein
   Werkzeug dafuer, waehrend Ausruestung und Relikte seit Phase 66 eines haben.
   Damit ist auch die dritte Schicht (Lage-Passive) pruefbar, statt nach Gefuehl
   eingestuft zu werden. */
if (was === 'passive') {
  var AB = globalThis.Abilities;
  var bib = AB.passives.filter(function (p) { return !AB.linien_ids[p.id]; });
  tabelle('BIBLIOTHEKS-PASSIVE', bib, function (p) { return messe(null, null, null, p.id); });
}
