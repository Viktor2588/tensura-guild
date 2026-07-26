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
var VOLL = process.argv.indexOf('--voll') > 0 || process.argv.indexOf('--nur-einheiten') > 0 || process.argv.indexOf('--nur-relikte') > 0;   // alles freigeschaltet = Veteranen-Sicht
var STUFE = 0;                                  // --stufe N: Bedrohungsstufe mitmessen
/* Standard: der Bot stellt sinnvoll auf. Wer nicht aufstellt, verliert 15 Punkte —
   das zu messen wäre nicht mehr kompetentes Spiel. --chaos schaltet es ab. */
var STELLEN = process.argv.indexOf('--chaos') < 0;
process.argv.forEach(function (a, i) { if (a === '--stufe') STUFE = parseInt(process.argv[i + 1] || '0', 10); });

/* --voll = alles frei. --nur-einheiten / --nur-relikte trennen die beiden
   Freischaltungen, um zu sehen, welche die Siegquote bewegt. */
function vollMeta() {
  var m = R.newMeta();
  m.threat = STUFE; m.threatGewaehlt = STUFE;
  if (process.argv.indexOf('--nur-relikte') < 0) {
    m.unlockedUnits = GD.units.map(function (u) { return u.id; });
  }
  if (process.argv.indexOf('--nur-einheiten') < 0) {
    m.unlockedRelics = GD.relics.map(function (r) { return r.id; });
  }
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

/* Ein Relikt mit unerfüllter Bedingung ist gerade wertlos — der Bot soll es
   genauso wenig nehmen wie ein Spieler, der den Hinweis liest. */
function reliktWert(run, id) {
  var r = GD.relic(id);
  if (!r) return 0;
  if (r.bedingung && !r.bedingung(run)) return 4;
  return 18;
}

function play(seed, voll) {
  var rng = globalThis.RNG(seed ^ 0x9e3779b9);
  var basis = R.newMeta();
  basis.threat = STUFE; basis.threatGewaehlt = STUFE;
  var run = R.create(seed, voll ? vollMeta() : basis);
  var schritte = 0;

  /* Zähe nach vorn, Fernkampf und Magier nach hinten. Genau das, was ein Spieler
     als Erstes tut — und was der Bot bisher nie getan hat. */
  function aufstellen() {
    var wert = { front: 0, verstaerker: 1, unterstuetzer: 2, fernkampf: 3, magier: 4 };
    run.team.sort(function (a, b) {
      var da = R.resolve(a), db = R.resolve(b);
      var ra = wert[da.tags[1]] !== undefined ? wert[da.tags[1]] : 2;
      var rb = wert[db.tags[1]] !== undefined ? wert[db.tags[1]] : 2;
      if (ra !== rb) return ra - rb;
      return (db.hp + db.def * 8) - (da.hp + da.def * 8);
    });
  }

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
      if (STELLEN) aufstellen();
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
            : rw.kind === 'relic' ? (reliktWert(run, rw.id))
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
      /* Nach Wert je Gold kaufen statt in Angebotsreihenfolge. Ohne das gibt der
         Bot sein Gold für die erstbeste teure Einheit aus und lässt Relikte
         liegen — genau daran hing der Unterschied zwischen Anfänger und Veteran. */
      var reihenfolge = run.pending.offers.map(function (o, i) {
        var wert = o.kind === 'relic' ? reliktWert(run, o.id)
          : o.kind === 'item' ? 12
          : o.kind === 'rang' ? 14
          : Math.max(0, passt(o.id, kw3)) + (run.team.length < 4 ? 14 : 0);
        return { i: i, o: o, punkte: wert / Math.max(1, o.price) };
      }).sort(function (a2, b2) { return b2.punkte - a2.punkte; });
      reihenfolge.forEach(function (e) {
        var o = e.o;
        if (o.price > run.gold) { unbezahlbar++; return; }
        if (o.kind === 'unit' && passt(o.id, kw3) < 4) return;
        if (o.kind === 'relic' && reliktWert(run, o.id) < 10) return;
        if (R.buy(run, e.i)) kaeufe[o.kind] = (kaeufe[o.kind] || 0) + 1;
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

var siege = 0, akte = {}, schritteSum = 0, rangSum = 0, teamSum = 0;
var kaeufe = {}, unbezahlbar = 0, kostenSum = 0, werteSum = 0, reliktSum = 0, itemSum = 0;
var ohneFront = 0, ohneStuetze = 0;                       // zeigt, ob Einheit/Ausrüstung/Rang wirklich konkurrieren
var proKeyword = {}, proRelikt = {}, proEinheit = {}, proRang = {}, proResonanz = {};

function bump(map, key, won) {
  var e = map[key] = map[key] || { n: 0, w: 0 };
  e.n++; if (won) e.w++;
}

for (var s = 0; s < N; s++) {
  var run = play(s, VOLL);
  var won = run.won;
  if (won) siege++;
  akte[Math.min(run.act, R.AKTE)] = (akte[Math.min(run.act, R.AKTE)] || 0) + 1;
  schritteSum += (run.act - 1) * 8 + run.step;
  teamSum += run.team.length;

  var rollen2 = run.team.map(function (m) { return GD.unit(m.id).tags[1]; });
  if (rollen2.indexOf('front') < 0) ohneFront++;
  if (rollen2.indexOf('unterstuetzer') < 0 && rollen2.indexOf('verstaerker') < 0) ohneStuetze++;
  reliktSum += run.relics.length;
  itemSum += run.team.reduce(function (a2, m) { return a2 + m.items.length; }, 0);
  kostenSum += run.team.reduce(function (a2, m) { return a2 + GD.unit(m.id).cost; }, 0);
  var werte = run.team.reduce(function (a2, m) { var d = R.resolve(m); return a2 + d.hp + d.atk * 6; }, 0);
  werteSum += werte;
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
  /* Resonanz ist die Schwelle, ab der ein Build im Kampf wirklich etwas tut —
     also die Zahl, die zeigt, ob sich das Bündeln lohnt. */
  var reso = Object.keys(R.resonanzen(run));
  bump(proResonanz, reso.length ? reso[0] : 'keine Resonanz', won);
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

console.log('=== ' + N + ' Runs' + (VOLL ? ', volle Freischaltung' : ', frischer Spieler') +
  (STUFE ? ', Bedrohungsstufe ' + STUFE : '') + (STELLEN ? '' : ', ohne Aufstellung') + ' ===');
console.log('Siege: ' + siege + ' (' + Math.round(siege / N * 100) + '%)');
console.log('Ø erreichte Knoten: ' + (schritteSum / N).toFixed(1) + ' von ' + (R.AKTE * R.STEPS.length));
console.log('Ø Trupp: ' + (teamSum / N).toFixed(1) + ' Einheiten, Ø Rangstufen gesamt: ' + (rangSum / N).toFixed(1));
console.log('gescheitert je Akt: ' + Object.keys(akte).sort().map(function (a) {
  return a + ': ' + akte[a];
}).join(' · '));
console.log('nicht bezahlbare Angebote: ' + unbezahlbar + ' (je Run ' + (unbezahlbar / N).toFixed(1) + ')');
console.log('Trupps ohne Frontlinie: ' + ohneFront + ' · ohne Unterstützung: ' + ohneStuetze);
console.log('Ø Relikte: ' + (reliktSum / N).toFixed(1) + ' · Ø angelegte Ausrüstung: ' + (itemSum / N).toFixed(1));
console.log('Ø Truppkosten: ' + (kostenSum / N).toFixed(1) + ' · Ø Truppstärke (hp+6·atk): ' + Math.round(werteSum / N));
console.log('Käufe im Laden: ' + Object.keys(kaeufe).map(function (k) {
  return k + ' ' + kaeufe[k];
}).join(' · '));

var kwRows = tabelle('Winrate nach Build (Quellen + Verstärker):', proKeyword, function (k) { return k; }, Math.max(10, N / 40));
tabelle('Winrate nach Resonanz (drei Teile derselben Linie):', proResonanz, function (k) { return k; }, 10);
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
