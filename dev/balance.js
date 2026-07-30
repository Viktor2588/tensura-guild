/* dev/balance.js — spielt N komplette Runs headless durch und misst, welche
   Fähigkeits-Builds tragen und welche tot sind. NICHT Teil des Spiels.
   Aufruf:  node dev/balance.js [anzahl] [--voll]                             */
'use strict';
require('../js/rng.js');
require('../js/hex.js');
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
    /* Ein belagerter Knoten trägt zwar Elite-Gegner, zahlt aber normale Beute —
       er ist kein Elite-Angebot, sondern ein teurer Pflichtkampf. Ohne diese
       Unterscheidung suchte der Bot sie AUF und maß Stufe 4 dadurch leichter
       als Stufe 3. */
    if (o.type === 'elite') {
      wert = o.belagert ? 10 : (run.lives >= 3 ? 12 : run.lives === 2 ? 4 : -20);
    }
    /* Die Auflage lohnt sich nur mit Puffer — mit einem Leben geht man kein
       zusätzliches Risiko ein. */
    if (o.type === 'pruefung') wert = run.lives >= 3 ? 13 : run.lives === 2 ? 8 : -5;
    if (o.type === 'boss') wert = 100;                       // führt kein Weg vorbei
    if (o.type === 'shop') wert = run.magicules >= 400 ? 16 : 6;
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
    for (var j = 0; j < run.team.length && !R.passivWahl(run); j++) {
      var m = run.team[j];
      if (R.rankCost(m) && run.magicules >= R.rankCost(m)) { R.rankUp(run, m.uid); break; }
    }
  }

  /* An den Run gehaengt, nicht lokal: die Auswertung laeuft ausserhalb von
     `play()` und sieht nur, was zurueckkommt. */
  run._revives = 0; run._rangAkt2 = null;
  while (!run.over && schritte < 500) {
    /* Einmal beim Uebergang in Akt 2 festhalten, wie weit der Trupp da war. */
    if (run._rangAkt2 === null && run.act >= 2) {
      run._rangAkt2 = run.team.reduce(function (a, m) { return Math.max(a, m.rank); }, 0);
    }
    schritte++;
    if (run.phase === 'start') {
      /* Startdraft: die Einheit mit den meisten Schlüsselwörtern nehmen.

         Ein Angebot ist `{ unit, relic, passive }`, nicht eine Id — genau das
         ging hier bis Phase 46 schief. `passt(o)` bekam das ganze Objekt,
         `GD.unit(objekt)` gab `undefined`, die Funktion lieferte für jedes
         Angebot 0, und `0 > -1` traf nur beim ersten zu: der Bot nahm immer
         Karte 1. Die Startwahl war damit keine Wahl, sondern eine Konstante —
         und weil der ganze Run auf dem Startdraft aufbaut, hing daran die
         halbe Besetzung, die nie gespielt wurde. Ein stiller Fehler, der die
         Messung leise wertlos machte und nicht auffiel, weil er nichts
         abstürzen ließ. */
      var kws = teamKeywords(run);
      var bs = 0, bw = -1;
      run.startwahl.offers.forEach(function (o, i) {
        var sc = passt(o.unit, kws);
        if (sc > bw) { bw = sc; bs = i; }
      });
      R.chooseStart(run, bs);
      continue;
    }
    if (R.passivWahl(run)) {
      /* Passive wählen, die zum bisherigen Build passt — sonst blockiert die
         offene Wahl jeden weiteren Aufstieg. */
      var pkw = teamKeywords(run), pw = R.passivWahl(run);
      var pBest = 0, pScore = -1;
      pw.offers.forEach(function (o, i) {
        var ab = o.verzicht ? null : AB.get(o.id), sc = 1;
        /* Der Verzicht auf Stufe 4 zählt wie ein Angebot ohne Treffer: der Bot
           lehnt den Keystone genau dann ab, wenn er zum Build nichts beiträgt. */
        if (ab) (ab.keywords || []).concat(ab.amplifies || [])
          .forEach(function (k) { if (pkw[k]) sc += pkw[k].quellen + pkw[k].verstaerker; });
        if (sc > pScore) { pScore = sc; pBest = i; }
      });
      R.choosePassive(run, pBest);
      continue;
    }
    if (run.phase === 'karte') {
      haushalten();
      if (STELLEN) aufstellen();
      if (R.passivWahl(run)) continue;
      R.choose(run, route(run, rng));
      continue;
    }
    if (run.phase === 'kampf' || run.phase === 'markt') {
      var p = run.pending;
      if (p.result && p.result.log) {
        p.result.log.forEach(function (l) {
          if (l.type === 'revive' && l.side === 'player') run._revives++;
        });
      }
      if (p.devour && p.devour.length) {
        for (var k2 = 0; k2 < run.team.length; k2++) {
          if (R.devour(run, p.devour[0].id, run.team[k2].uid)) break;
        }
      }
      /* Der Markt nach dem Kampf: nach Wert je Magicule kaufen, solange es
         reicht. Genau die Entscheidung, die das Spiel jetzt vom Spieler will. */
      /* Denselben Weg wie ein Spieler: erst das Ergebnis bestätigen, dann in der
         Verwaltung einkaufen. Gezählt wird beim Bestätigen, sonst doppelt. */
      if (run.node && run.node.type === 'boss' && !p._gezaehlt) {
        p._gezaehlt = 1;
        var bn = run.node.name;
        bossKampf[bn] = (bossKampf[bn] || 0) + 1;
        if (p.result.winner === 'player') bossSieg[bn] = (bossSieg[bn] || 0) + 1;
      }
      if (p.markt && run.phase === 'kampf') {
        if (p.bestanden !== undefined) {
          run._pruefN = (run._pruefN || 0) + 1;
          if (p.bestanden) run._pruefOk = (run._pruefOk || 0) + 1;
        }
        R.zumMarkt(run);
        continue;
      }
      if (p.markt) {
        var kw2 = teamKeywords(run);
        var posten = p.markt.map(function (o, i) {
          var sc = o.kind === 'unit' ? 12 + passt(o.id, kw2)
            : o.kind === 'relic' ? reliktWert(run, o.id)
            : o.kind === 'item' ? 7
            : o.kind === 'rang' ? 14 : 5;
          return { i: i, wert: sc / Math.max(1, o.price) * 100 };
        }).sort(function (a, b) { return b.wert - a.wert; });
        posten.forEach(function (x) {
          var o = p.markt[x.i];
          if (o.sold) return;
          if (run.magicules < o.price) { unbezahlbar++; return; }
          /* Rang und Aufstieg konkurrieren um dieselben Magicule — etwas
             Reserve für den nächsten Aufstieg bleibt stehen. */
          if (run.magicules - o.price < 140 && o.kind !== 'rang') return;
          if (R.buy(run, x.i, run.team[0] && run.team[0].uid)) kaeufe[o.kind] = (kaeufe[o.kind] || 0) + 1;
        });
      }
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
var pruefGesamt = 0, pruefOk = 0;
var bossKampf = {}, bossSieg = {};
var kaeufe = {}, unbezahlbar = 0, kostenSum = 0, werteSum = 0, reliktSum = 0, itemSum = 0;
var ohneFront = 0, ohneStuetze = 0;                       // zeigt, ob Einheit/Ausrüstung/Rang wirklich konkurrieren
var proKeyword = {}, proRelikt = {}, proEinheit = {}, proRang = {}, proResonanz = {};
/* Der Rang am RUN-ENDE ist eine Folge der Laufzeit, keine Ursache: ein Run, der
   in Akt 1 stirbt, hatte nie Geld fuer S. Deshalb zusaetzlich der Rang zu einem
   FESTEN Zeitpunkt — Beginn von Akt 2 —, und von dort aus die Siegquote. Das ist
   die Zahl, die etwas darueber sagt, ob Rang traegt. */
var proRangAkt2 = {};
/* Wiederbelebungen: der offene Verdacht hinter dem Heilungs-Vorsprung. Ein Tod,
   der rueckgaengig gemacht wird, hat kein Gegenstueck in einer anderen Linie. */
var reviveGewonnen = 0, reviveVerloren = 0, reviveRunsG = 0, reviveRunsV = 0;
var reviveKnotenG = 0, reviveKnotenV = 0;

/* Jeder Eimer trägt seine durchschnittliche Lauftiefe mit. Ohne sie liest sich
   ein kleiner Eimer mit 0 % wie ein kaputter Build — dabei sind es Runs, die in
   Akt 1 gestorben sind, bevor überhaupt ein Trupp stand. Genau darauf bin ich
   einmal hereingefallen: „Frost 0 % (15)" wurde nachgemessen und gewinnt in
   Wahrheit 100 % gegen alle drei Bosse. */
function bump(map, key, won, tiefe) {
  var e = map[key] = map[key] || { n: 0, w: 0, t: 0 };
  e.n++; if (won) e.w++; e.t += (tiefe || 0);
}

for (var s = 0; s < N; s++) {
  var run = play(s, VOLL);
  var won = run.won;
  if (won) siege++;
  akte[Math.min(run.act, R.AKTE)] = (akte[Math.min(run.act, R.AKTE)] || 0) + 1;
  pruefGesamt += run._pruefN || 0; pruefOk += run._pruefOk || 0;
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
  if (run._rangAkt2 !== null) bump(proRangAkt2, R.RANK_NAME[run._rangAkt2], won);
  /* JE KNOTEN, nicht je Run: ein gewonnener Run spielt 16 Knoten, ein
     verlorener oft die Haelfte. Je Run gezaehlt misst man die Laufzeit. */
  var knoten = Math.max(1, (run.act - 1) * R.STEPS.length + run.step);
  if (won) { reviveGewonnen += run._revives; reviveRunsG++; reviveKnotenG += knoten; }
  else { reviveVerloren += run._revives; reviveRunsV++; reviveKnotenV += knoten; }
  /* Ein Build ist erst einer, wenn Quellen UND Verstärker zusammenkommen.
     Ohne diese Hürde wandert jeder ziellose Trupp in den größten Eimer und
     verfälscht dessen Siegquote. */
  var kw = AB.keywords(abs);
  var builds = Object.keys(kw).filter(function (k) {
    return kw[k].quellen >= 2 && kw[k].verstaerker >= 1;
  }).sort(function (a, b) {
    return (kw[b].quellen + kw[b].verstaerker) - (kw[a].quellen + kw[a].verstaerker);
  });
  bump(proKeyword, builds.length ? builds[0] : 'kein Build', won, run.step + (run.act - 1) * R.STEPS.length);
  /* Resonanz ist die Schwelle, ab der ein Build im Kampf wirklich etwas tut —
     also die Zahl, die zeigt, ob sich das Bündeln lohnt. */
  var reso = Object.keys(R.resonanzen(run));
  bump(proResonanz, reso.length ? reso[0] : 'keine Resonanz', won);
  run.relics.forEach(function (id) { bump(proRelikt, id, won); });
}

function tabelle(titel, map, nameFn, minN) {
  console.log('\n' + titel);
  var rows = Object.keys(map).map(function (k) {
    return { k: k, n: map[k].n, wr: Math.round(map[k].w / map[k].n * 100),
             tiefe: map[k].t ? map[k].t / map[k].n : null };
  }).filter(function (r) { return r.n >= (minN || 1); })
    .sort(function (a, b) { return b.wr - a.wr; });
  rows.forEach(function (r) {
    console.log('  ' + (nameFn(r.k) + '                      ').slice(0, 24) +
      String(r.wr + '%').padStart(5) + '   (' + r.n + ')' +
      (r.tiefe === null ? '' : '  Ø Knoten ' + r.tiefe.toFixed(1)));
  });
  return rows;
}

console.log('=== ' + N + ' Runs' + (VOLL ? ', volle Freischaltung' : ', frischer Spieler') +
  (STUFE ? ', Bedrohungsstufe ' + STUFE : '') + (STELLEN ? '' : ', ohne Aufstellung') + ' ===');
console.log('Siege: ' + siege + ' (' + Math.round(siege / N * 100) + '%)');
console.log('Bosse (Siegquote im echten Run):');
Object.keys(bossKampf).sort().forEach(function (b) {
  console.log('  ' + b.replace('BOSS: ', '').padEnd(24) +
    String(Math.round((bossSieg[b] || 0) / bossKampf[b] * 100)).padStart(3) + '%  (' + bossKampf[b] + ')');
});
console.log('Kampfherausforderungen: ' + pruefGesamt + ', davon gehalten ' +
  (pruefGesamt ? Math.round(pruefOk / pruefGesamt * 100) : 0) + ' %');
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
tabelle('Winrate nach höchstem Rang AM RUN-ENDE (Folge der Laufzeit, nicht Ursache):',
  proRang, function (k) { return 'Rang ' + k; }, 10);
tabelle('Winrate nach höchstem Rang BEI AKT-2-BEGINN (feste Messstelle):',
  proRangAkt2, function (k) { return 'Rang ' + k; }, 10);
console.log('\nWiederbelebungen JE KNOTEN: gewonnen ' +
  (reviveKnotenG ? (reviveGewonnen / reviveKnotenG).toFixed(3) : '-') +
  ' · verloren ' + (reviveKnotenV ? (reviveVerloren / reviveKnotenV).toFixed(3) : '-') +
  '   (je Run: ' + (reviveRunsG ? (reviveGewonnen / reviveRunsG).toFixed(2) : '-') +
  ' gegen ' + (reviveRunsV ? (reviveVerloren / reviveRunsV).toFixed(2) : '-') +
  ', aber je Run misst die Laufzeit mit)');
var relRows = tabelle('Winrate nach Relikt:', proRelikt, function (k) {
  var r = GD.relic(k); return r ? r.name : k;
}, Math.max(15, N / 30));

console.log('\nAuffälligkeiten:');
var flags = 0;
kwRows.forEach(function (r) {
  if (r.k === 'kein Build') return;                    // soll ruhig unten liegen
  /* Ein Eimer, dessen Runs im Schnitt vor Knoten 4 sterben, sagt nichts über
     seinen Build aus — dort stehen Trupps, die nie einer geworden sind. Ohne
     diese Hürde meldet das Werkzeug „Frost 0 %", und Frost gewinnt in Wahrheit
     100 % gegen alle drei Bosse. */
  if (r.tiefe !== null && r.tiefe < 4) return;
  if (r.wr < 25 || r.wr > 75) { console.log('  ! Build ' + r.k + ': ' + r.wr + '%'); flags++; }
});
relRows.forEach(function (r) {
  if (r.wr < 20 || r.wr > 80) { console.log('  ! Relikt ' + GD.relic(r.k).name + ': ' + r.wr + '%'); flags++; }
});
var nie = GD.units.filter(function (u) { return !proEinheit[u.id]; });
if (nie.length) console.log('  ! nie gespielt: ' + nie.map(function (u) { return u.name; }).join(', '));
if (!flags && !nie.length) console.log('  keine — Kurve sieht gesund aus');
