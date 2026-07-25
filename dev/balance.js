/* dev/balance.js — spielt N komplette Runs headless durch und misst, welche
   Fähigkeits-Builds tragen und welche tot sind. NICHT Teil des Spiels.
   Aufruf:  node dev/balance.js [anzahl] [--voll]                             */
'use strict';
require('../js/rng.js');
require('../js/abilities.js');
require('../js/data.js');
require('../js/combat.js');
require('../js/enemies.js');
require('../js/run.js');
var GD = globalThis.GameData, EN = globalThis.Enemies, R = globalThis.Run, AB = globalThis.Abilities;

var N = parseInt(process.argv[2] || '600', 10);
var VOLL = process.argv.indexOf('--voll') > 0;   // alles freigeschaltet = Veteranen-Sicht

function vollMeta() {
  var m = R.newMeta();
  m.unlockedUnits = GD.units.filter(function (u) { return !u.hero; }).map(function (u) { return u.id; });
  m.unlockedRelics = GD.relics.map(function (r) { return r.id; });
  return m;
}

/* Welche Schlüsselwörter hat der Trupp gerade? Danach richtet der Bot seine
   Käufe aus — genau die Entscheidung, die das neue System vom Spieler will. */
function teamKeywords(run) {
  return AB.keywords(R.buildTeile(run));
}
function passt(id, kw) {
  var u = GD.unit(id);
  if (!u) return 0;
  var score = u.cost;
  var sig = AB.get(u.signature);
  var eigene = (sig ? sig.keywords : []).concat();
  u.passives.forEach(function (p) {
    var ab = AB.get(p);
    if (ab) eigene = eigene.concat(ab.keywords || [], ab.amplifies || []);
  });
  eigene.forEach(function (k) {
    if (kw[k]) score += (kw[k].quellen + kw[k].verstaerker) * 2;
  });
  return score;
}

/* Wegwahl wie ein Mensch, nicht per Würfel: mit einem Leben in der Tasche geht
   man keinem Elite-Kampf entgegen, und volle Beutel wollen zum Händler.
   Ohne diese Heuristik misst der Bot die Härte der Karte statt die des Spiels. */
function route(run, rng) {
  var beste = 0, bestwert = -1e9;
  run.options.forEach(function (o, i) {
    var wert = 0;
    if (o.type === 'kampf') wert = 10;
    if (o.type === 'elite') wert = run.lives >= 3 ? 12 : run.lives === 2 ? 4 : -20;
    if (o.type === 'boss') wert = 100;                       // führt kein Weg vorbei
    if (o.type === 'shop') wert = run.gold >= 120 ? 16 : 6;
    if (o.type === 'lager') wert = 9;
    if (o.type === 'event') wert = 11;
    wert += rng() * 3;                                       // etwas Streuung
    if (wert > bestwert) { bestwert = wert; beste = i; }
  });
  return beste;
}

function play(seed, voll) {
  var rng = globalThis.RNG(seed ^ 0x9e3779b9);
  var run = R.create(seed, voll ? vollMeta() : R.newMeta());
  var schritte = 0;

  function haushalten() {
    (run.bag || []).slice().forEach(function (iid) {
      for (var i = 0; i < run.team.length; i++) {
        if (run.team[i].items.length < R.itemSlots(run.team[i])) { R.equip(run, run.team[i].uid, iid); break; }
      }
    });
    // aufsteigen, sobald bezahlbar: vorderste Einheit zuerst
    for (var j = 0; j < run.team.length && !run.wahl; j++) {
      var m = run.team[j];
      if (R.rankCost(m) && run.magicules >= R.rankCost(m)) { R.rankUp(run, m.uid); break; }
    }
  }

  while (!run.over && schritte < 500) {
    schritte++;
    if (run.phase === 'start') {
      /* Startdraft: die Einheit mit den meisten Schlüsselwörtern nehmen. */
      var kws = teamKeywords(run);
      var bs = 0, bw = -1;
      run.startwahl.offers.forEach(function (id, i) {
        var sc = passt(id, kws);
        if (sc > bw) { bw = sc; bs = i; }
      });
      R.chooseStart(run, bs);
      continue;
    }
    if (run.wahl) {
      /* Fähigkeit wählen, die zum bisherigen Build passt. */
      var kw = teamKeywords(run);
      var best = 0, bestScore = -1;
      run.wahl.offers.forEach(function (id, i) {
        var ab = AB.get(id), sc = 1;
        (ab.keywords || []).forEach(function (k) { if (kw[k]) sc += kw[k].quellen + kw[k].verstaerker; });
        if (sc > bestScore) { bestScore = sc; best = i; }
      });
      R.chooseActive(run, best);
      continue;
    }
    if (run.phase === 'karte') {
      haushalten();
      if (run.wahl) continue;
      R.choose(run, route(run, rng));
      continue;
    }
    if (run.phase === 'kampf') {
      var p = run.pending;
      if (p.devour && p.devour.length) {
        for (var k2 = 0; k2 < run.team.length; k2++) {
          if (R.devour(run, p.devour[0].id, run.team[k2].uid)) break;
        }
      }
      if (p.rewards) {
        var kw2 = teamKeywords(run);
        var b2 = 0, s2 = -1;
        p.rewards.forEach(function (rw, i) {
          var sc = rw.kind === 'unit' ? 10 + passt(rw.id, kw2)
            : rw.kind === 'relic' ? 18
            : rw.kind === 'item' ? 6 : 8;
          if (sc > s2) { s2 = sc; b2 = i; }
        });
        R.takeReward(run, b2);
      }
      R.advance(run);
      continue;
    }
    if (run.phase === 'shop') {
      var kw3 = teamKeywords(run);
      run.pending.offers.forEach(function (o, i) {
        if (o.price > run.gold) { unbezahlbar++; return; }
        if (o.kind === 'unit' && passt(o.id, kw3) < 4) return;
        if (R.buy(run, i)) kaeufe[o.kind] = (kaeufe[o.kind] || 0) + 1;
      });
      haushalten();
      R.advance(run);
      continue;
    }
    if (run.phase === 'event') {
      var ev = run.pending.event;
      var wahl = 0;
      if (ev) for (var j2 = 0; j2 < ev.options.length; j2++) {
        if (!ev.options[j2].can || ev.options[j2].can(run)) { wahl = j2; break; }
      }
      R.eventChoose(run, wahl);
      R.advance(run);
      continue;
    }
    if (run.phase === 'lager') { R.camp(run, Math.floor(rng() * 3)); R.advance(run); continue; }
    break;
  }
  return run;
}

/* ---- Läufe ------------------------------------------------------------- */

var siege = 0, akte = [0, 0, 0, 0], schritteSum = 0, rangSum = 0, teamSum = 0;
var kaeufe = {}, unbezahlbar = 0;                       // zeigt, ob Einheit/Ausrüstung/Rang wirklich konkurrieren
var proKeyword = {}, proRelikt = {}, proEinheit = {}, proRang = {};

function bump(map, key, won) {
  var e = map[key] = map[key] || { n: 0, w: 0 };
  e.n++; if (won) e.w++;
}

for (var s = 0; s < N; s++) {
  var run = play(s, VOLL);
  var won = run.won;
  if (won) siege++;
  akte[Math.min(run.act, 3)]++;
  schritteSum += (run.act - 1) * 8 + run.step;
  teamSum += run.team.length;

  var abs = R.buildTeile(run);
  var hoechster = 0;
  run.team.forEach(function (m) {
    rangSum += m.rank;
    if (m.rank > hoechster) hoechster = m.rank;
    bump(proEinheit, m.id, won);
  });
  bump(proRang, R.RANK_NAME[hoechster], won);
  /* Ein Build ist erst einer, wenn Quellen UND Verstärker zusammenkommen.
     Ohne diese Hürde wandert jeder ziellose Trupp in den größten Eimer und
     verfälscht dessen Siegquote. */
  var kw = AB.keywords(abs);
  var builds = Object.keys(kw).filter(function (k) {
    return kw[k].quellen >= 2 && kw[k].verstaerker >= 1;
  }).sort(function (a, b) {
    return (kw[b].quellen + kw[b].verstaerker) - (kw[a].quellen + kw[a].verstaerker);
  });
  bump(proKeyword, builds.length ? builds[0] : 'kein Build', won);
  run.relics.forEach(function (id) { bump(proRelikt, id, won); });
}

function tabelle(titel, map, nameFn, minN) {
  console.log('\n' + titel);
  var rows = Object.keys(map).map(function (k) {
    return { k: k, n: map[k].n, wr: Math.round(map[k].w / map[k].n * 100) };
  }).filter(function (r) { return r.n >= (minN || 1); })
    .sort(function (a, b) { return b.wr - a.wr; });
  rows.forEach(function (r) {
    console.log('  ' + (nameFn(r.k) + '                      ').slice(0, 24) +
      String(r.wr + '%').padStart(5) + '   (' + r.n + ')');
  });
  return rows;
}

console.log('=== ' + N + ' Runs' + (VOLL ? ', volle Freischaltung' : ', frischer Spieler') + ' ===');
console.log('Siege: ' + siege + ' (' + Math.round(siege / N * 100) + '%)');
console.log('Ø erreichte Knoten: ' + (schritteSum / N).toFixed(1) + ' von 24');
console.log('Ø Trupp: ' + (teamSum / N).toFixed(1) + ' Einheiten, Ø Rangstufen gesamt: ' + (rangSum / N).toFixed(1));
console.log('gescheitert in Akt 1/2/3: ' + akte[1] + ' / ' + akte[2] + ' / ' + akte[3]);
console.log('nicht bezahlbare Angebote: ' + unbezahlbar + ' (je Run ' + (unbezahlbar / N).toFixed(1) + ')');
console.log('Käufe im Laden: ' + Object.keys(kaeufe).map(function (k) {
  return k + ' ' + kaeufe[k];
}).join(' · '));

var kwRows = tabelle('Winrate nach Build (Quellen + Verstärker):', proKeyword, function (k) { return k; }, Math.max(10, N / 40));
tabelle('Winrate nach höchstem Rang im Trupp:', proRang, function (k) { return 'Rang ' + k; }, 10);
var relRows = tabelle('Winrate nach Relikt:', proRelikt, function (k) {
  var r = GD.relic(k); return r ? r.name : k;
}, Math.max(15, N / 30));

console.log('\nAuffälligkeiten:');
var flags = 0;
kwRows.forEach(function (r) {
  if (r.k === 'kein Build') return;                    // soll ruhig unten liegen
  if (r.wr < 25 || r.wr > 75) { console.log('  ! Build ' + r.k + ': ' + r.wr + '%'); flags++; }
});
relRows.forEach(function (r) {
  if (r.wr < 20 || r.wr > 80) { console.log('  ! Relikt ' + GD.relic(r.k).name + ': ' + r.wr + '%'); flags++; }
});
var nie = GD.units.filter(function (u) { return !proEinheit[u.id]; });
if (nie.length) console.log('  ! nie gespielt: ' + nie.map(function (u) { return u.name; }).join(', '));
if (!flags && !nie.length) console.log('  keine — Kurve sieht gesund aus');
