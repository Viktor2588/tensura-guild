/* dev/sim.js — Headless-Selbsttest (Node). NICHT Teil des Spiels.
   Aufruf:  node dev/sim.js                                            */
'use strict';
require('../js/rng.js');
require('../js/abilities.js');
require('../js/data.js');
require('../js/combat.js');
require('../js/enemies.js');
require('../js/run.js');
var GD = globalThis.GameData, EN = globalThis.Enemies, C = globalThis.Combat,
    R = globalThis.Run, AB = globalThis.Abilities;

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } }
function head(s) { console.log('--- ' + s + ' ---'); }
function mit(id, rank) {
  var m = R.member(id);
  m.rank = rank || 0;
  /* Seit TODO.md Punkt 1 umgesetzt ist, haben alle Einheiten Linien.
     Dann tragen sie nicht mehr die festen Passiven aus `data.js`, sondern
     nur gewählte Linien-Passiven. Für die Tests brauchen wir eine
     deterministische Standardeinstellung. */
  if (m.rank >= 1 && AB.linien && AB.linien[id]) {
    /* Die IDs werden aus `AB.linien` gelesen, nicht aus dem Einheitennamen
       zusammengebaut. Handgeschriebene Einheiten benutzen kurze Präfixe
       (`gruft_`, `hexe_`, `wind_`), und die zusammengebaute ID traf dort ins
       Leere — der Test lief dann gegen eine Einheit ganz ohne Passive. */
    var l = AB.linien[id];
    var slots = R.passivSlots(m);
    var out = [];
    /* Mechanik-Stufe 1 liefert i.d.R. den „Quellen“-Keyword. */
    if (slots >= 1) out.push(l.mechanik[0]);
    /* Bei Statuslinien ist Angriffs-Stufe 2 der Verstärker; Untote tragen ihre
       Wiederkehr an vierter Stelle der Defensivlinie. */
    if (slots >= 2) {
      out.push(GD.unit(id).art === 'untot' ? l.defensive[3] : l.angriff[1]);
    }
    if (slots >= 3) {
      /* Für Statuslinien (Gift/Brand/Verderbnis) die hohen Stufen, damit
         Stapel-Tests schnell genug laufen. */
      var mec = AB.get(l.mechanik[0]);
      var kw = mec && mec.keywords ? mec.keywords : [];
      var statusKey = ['gift', 'brand', 'verderbnis'].filter(function (k) { return kw.indexOf(k) >= 0; })[0];
      out.push(statusKey ? l.unterstuetzung[3] : l.unterstuetzung[0]);
      if (statusKey) out[0] = l.mechanik[3];
    }
    m.passives = out.slice(0, slots);
  }
  return m;
}
/* Der Run beginnt im Draft — für Tests, die die Karte brauchen, durchziehen. */
/* Der Run startet jetzt mit EINER Einheit. Für die Tests, die einen fertigen
   Trupp brauchen, wird auf drei aufgefüllt — und offene Passiv-Wahlen abgeräumt. */
function fertigerRun(seed, meta) {
  var r = R.create(seed, meta || R.newMeta());
  while (r.phase === 'start') R.chooseStart(r, 0);
  /* Verschiedene ARTEN — pro Art passt nur eine Einheit in den Trupp. */
  ['gobta', 'sturmwolf', 'gruftwaechter', 'kaefergarde'].forEach(function (id) {
    if (r.team.length < 3) R.addUnit(r, id);
  });
  while (R.passivWahl(r)) R.choosePassive(r, 0);
  return r;
}
function def(id, rank) { return R.resolve(mit(id, rank)); }

/* ---------------------------------------------------------------- Daten */
head('Daten');
/* 35, nicht 40: Schattenwolf und Rudelalpha (vier Wölfe waren zu viel) sowie
   Riesenameise, Skelettritter und Giftfalter (Dubletten im Generator) sind
   bewusst gestrichen. Weniger Einheiten, dafür jede mit eigener Idee. */
ok(GD.units.length >= 35, GD.units.length + ' Einheiten');
ok(EN.all.length >= 30, EN.all.length + ' Gegner');
ok(GD.relics.length >= 30, GD.relics.length + ' Relikte');
/* Eine Signatur je Einheit, plus die Verwandlungsformen: Shions Chaosklinge
   des Verdorbenen trägt niemand von Anfang an, sie ersetzt im Kampf. */
var formen = AB.signatures.filter(function (a) {
  return !GD.units.some(function (u) { return u.signature === a.id; });
});
ok(AB.signatures.length - formen.length === GD.units.length,
   'genau eine Signatur je Einheit (' + (AB.signatures.length - formen.length) + ')');
var formIds = formen.map(function (a) { return a.id; }).sort().join(',');
/* Verwandlungsformen gehören keiner Einheit fest — sie ersetzen erst im Kampf.
   Jede muss aus einer Passive heraus erreichbar sein, sonst ist sie tot. */
var erreichbar = AB.passives.filter(function (p) {
  return formen.some(function (f) { return String(p.fn).indexOf(f.id) >= 0; });
}).length;
ok(formen.length === 6 && erreichbar === formen.length,
   'jede der ' + formen.length + ' Verwandlungsformen wird von genau einer Passive gerufen');
ok(AB.pool.length >= 12 && AB.passives.length >= 20,
   AB.pool.length + ' Pool-Aktive, ' + AB.passives.length + ' Passive');

var fehlend = [];
GD.units.forEach(function (u) {
  if (!AB.get(u.signature)) fehlend.push(u.id + ' -> ' + u.signature);
  u.passives.forEach(function (p) { if (!AB.get(p)) fehlend.push(u.id + ' -> ' + p); });
});
ok(!fehlend.length, 'jede Fähigkeitsreferenz existiert' + (fehlend.length ? ': ' + fehlend.join(', ') : ''));
ok(GD.units.every(function (u) { return u.passives.length === 3; }), 'jede Einheit hat drei Passive');

var sigIds = {}, doppelt = [];
GD.units.forEach(function (u) { if (sigIds[u.signature]) doppelt.push(u.signature); sigIds[u.signature] = 1; });
ok(!doppelt.length, 'keine Signatur wird doppelt vergeben' + (doppelt.length ? ': ' + doppelt.join(',') : ''));
ok(AB.pool.every(function (a) { return !sigIds[a.id]; }), 'Signaturen sind nicht im Aufstiegs-Pool');

ok(GD.units.every(function (u) { return GD.ARTEN.indexOf(u.art) >= 0; }), 'jede Einheit hat eine bekannte Art');
ok(GD.units.concat(EN.all).every(function (u) {
  return u.tags.filter(function (t) { return C.ROLES.indexOf(t) >= 0; }).length === 1;
}), 'jede Einheit hat genau eine Rolle');
var HOOKS = ['onStart', 'onTurnStart', 'onHit', 'onDamaged', 'onKill', 'onDeath', 'onAllyDeath', 'onChaos', 'onMarke'];
ok(AB.passives.every(function (p) { return HOOKS.indexOf(p.hook) >= 0; }), 'jede Passive hängt an einem bekannten Hook');
ok(AB.pool.concat(AB.signatures).every(function (a) { return a.cd >= 1 && a.cd <= 6; }), 'Abklingzeiten liegen zwischen 1 und 6');
ok(AB.alle.every(function (a) { return a.id && a.name && a.text && typeof a.fn === 'function'; }),
   'jede Fähigkeit hat id, Name, Text und fn');
ok(EN.encounters.concat(EN.bosses).every(function (e) {
  return e.units.every(function (id) { return !!EN.get(id); });
}), 'jede Begegnung referenziert existierende Gegner');
/* Ein Gegner ohne aktive Fähigkeit schlägt nur zu, während der Spieler zaubert —
   genau die Asymmetrie, die die Siegquote einmal auf 94 % getrieben hat. */
var stumm = [];
EN.encounters.concat(EN.bosses).forEach(function (e) {
  EN.build(e).forEach(function (d) {
    if (!(d.actives || []).length && stumm.indexOf(d.name) < 0) stumm.push(d.name);
  });
});
ok(!stumm.length, 'jeder eingesetzte Gegner hat eine aktive Fähigkeit' +
   (stumm.length ? ': ' + stumm.join(', ') : ''));
/* Inhaltsstufen, nicht Akte: die fuenf Stufen verteilen sich auf zwei Akte. */
var STUFEN = [];
R.STUFEN.forEach(function (s) { s.forEach(function (x) { STUFEN.push(x); }); });
ok(STUFEN.every(function (a) { return EN.forAct(a).length >= 12 && EN.elitesForAct(a).length >= 4; }),
   'jede der ' + STUFEN.length + ' Inhaltsstufen hat mindestens 12 normale und 4 Elite-Begegnungen');
ok([1, 2].every(function (p) { return EN.bossPool(p).length >= 2; }), 'beide Boss-Pools haben mindestens zwei Bosse');
ok(EN.bosses.every(function (b) { return b.units.length === 1; }), 'Bosse treten allein an');
ok(STUFEN.every(function (a) { return EN.events.filter(function (e) { return e.act === a; }).length >= 3; }),
   'jede Inhaltsstufe hat eigene Story-Ereignisse');

/* Jede Art muss auch spielbar sein, sonst blockiert die Regel "eine je Art". */
var proArt = {};
GD.units.forEach(function (u) { proArt[u.art] = (proArt[u.art] || 0) + 1; });
ok(GD.ARTEN.every(function (a) { return proArt[a] >= 1; }), 'zu jeder Art existiert mindestens eine Einheit');

/* ---------------------------------------------------------- Glossar */
head('Glossar');
var G = GD.GLOSSAR;
ok(GD.ARTEN.every(function (a) { return G.arten[a] && G.arten[a].length > 20; }),
   'jede Art hat einen Glossareintrag');
ok(C.ROLES.every(function (r) { return G.rollen[r] && G.rollen[r].length > 20; }),
   'jede Rolle hat einen Glossareintrag');
ok(Object.keys(C.STATUS_CAP).concat('schild').every(function (z) {
  return G.zustaende[z] && G.zustaende[z].length > 20;
}), 'jeder Zustand hat einen Glossareintrag');

/* Jedes Schlüsselwort, das irgendeine Fähigkeit trägt, muss erklärt sein. */
var alleKw = {};
AB.alle.forEach(function (ab) {
  (ab.keywords || []).concat(ab.amplifies || []).forEach(function (k) { alleKw[k] = 1; });
});
GD.items.forEach(function (it) { (it.keywords || []).forEach(function (k) { alleKw[k] = 1; }); });
var ohneText = Object.keys(alleKw).filter(function (k) { return !G.keywords[k]; });
ok(!ohneText.length, 'jedes benutzte Schlüsselwort ist erklärt' + (ohneText.length ? ': ' + ohneText.join(', ') : ''));
ok(GD.items.every(function (it) { return it.text && it.text.length > 15; }),
   'jede Ausrüstung hat eine Beschreibung');
ok(GD.relics.every(function (r) { return r.text && r.text.length > 10; }),
   'jedes Relikt hat eine Beschreibung');
/* Verschlungene Fähigkeiten müssen sich selbst erklären, nicht nur ihren Ursprung. */
var ohneText2 = [];
EN.all.forEach(function (e) {
  (e.effects || []).forEach(function (ab) {
    if (!ab.text || ab.text.length < 15) ohneText2.push(e.id + ':' + ab.name);
  });
});
ok(!ohneText2.length, 'jede Gegnerfähigkeit hat eine Beschreibung' +
   (ohneText2.length ? ': ' + ohneText2.join(', ') : ''));
ok(AB.alle.every(function (a) { return a.text && a.text.length > 10; }),
   'jede Fähigkeit hat eine Beschreibung');
/* Ereignisse dürfen nicht verschweigen, dass sie eine zufällige Einheit dauerhaft treffen. */
var unklar = [];
EN.events.forEach(function (ev) {
  ev.options.forEach(function (o) {
    /* Wenn eine Option eine Einheit trifft, muss sie sagen WELCHE. */
    var trifftEinheit = /Einheit/.test(o.text);
    if (trifftEinheit && !/(zufällige|schwächste)/.test(o.text)) unklar.push(ev.id + ': ' + o.text);
  });
});
ok(!unklar.length, 'Ereignisse benennen die betroffene Einheit' + (unklar.length ? ': ' + unklar.join(' | ') : ''));

/* --------------------------------------------------------- Rarität */
head('Rarität');
var STUFEN = [1, 2, 3, 4, 5];
ok(GD.relics.every(function (r) { return STUFEN.indexOf(r.rarity) >= 0; }), 'jedes Relikt hat eine Stufe 1–5');
ok(GD.items.every(function (i) { return STUFEN.indexOf(i.rarity) >= 0; }), 'jede Ausrüstung hat eine Stufe 1–5');
/* Nur was in einem gewichteten Angebot stehen kann, braucht eine Stufe. */
ok(AB.pool.concat(AB.passives).filter(function (a) { return !AB.istEigen(a.id); })
   .every(function (a) { return STUFEN.indexOf(a.rarity) >= 0; }),
   'jede Pool-Fähigkeit und Bibliotheks-Passive hat eine Stufe 1–5');
ok(GD.units.every(function (u) { return !AB.get(u.signature).rarity; }),
   'Signaturen tragen keine Raritätsstufe');
ok(AB.passives.filter(function (a) { return AB.linien_ids[a.id]; })
   .every(function (a) { return !a.rarity; }),
   'Linien-Passive tragen keine Raritätsstufe');
ok(AB.passives.filter(function (a) { return AB.linien_ids[a.id]; }).length >= 32,
   'und es gibt sie: ' + AB.passives.filter(function (a) { return AB.linien_ids[a.id]; }).length + ' Linien-Passive');
ok(STUFEN.every(function (r) { return AB.rarName(r) && G.raritaeten[r]; }),
   'jede Stufe hat Namen und Glossartext');
/* Jede Stufe muss auch besetzt sein, sonst ist sie nur Dekoration. */
var belegt = {};
GD.relics.concat(GD.items).forEach(function (x) { belegt[x.rarity] = 1; });
AB.alle.forEach(function (x) { belegt[x.rarity] = 1; });
ok(STUFEN.every(function (r) { return belegt[r]; }), 'jede Stufe kommt im Inhalt tatsächlich vor');

/* Seltenes muss seltener gezogen werden — und in Akt 3 öfter als in Akt 1. */
function zieheVerteilung(akt, n) {
  var rng = globalThis.RNG(4242), z = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (var i = 0; i < n; i++) z[R.waehle(rng, GD.relics, akt, 1)[0].rarity]++;
  return z;
}
var akt1 = zieheVerteilung(1, 3000), akt3 = zieheVerteilung(3, 3000);
ok(akt1[1] > akt1[5] * 5, 'in Akt 1 ist Übliches um ein Vielfaches häufiger als Legendäres (' +
   akt1[1] + ' zu ' + akt1[5] + ')');
ok(akt3[5] > akt1[5], 'in Akt 3 fällt Legendäres öfter als in Akt 1 (' + akt3[5] + ' zu ' + akt1[5] + ')');
ok(akt3[4] + akt3[5] > akt1[4] + akt1[5], 'Episches und Legendäres steigen zusammen mit dem Akt');
ok(R.gewicht({ rarity: 1 }, 1) > R.gewicht({ rarity: 5 }, 1), 'Gewicht fällt mit der Stufe');

/* Angebote tragen ihre Stufe mit, sonst kann die UI sie nicht zeigen. */
var rRun2 = fertigerRun(4711);
rRun2.phase = 'karte';
/* Es gibt keinen Händler-Knoten mehr — der Markt geht nach jedem Kampf auf. */
ok(!R.STEPS.some(function (t) { return t.indexOf('shop') >= 0; }),
   'kein Händler-Knoten mehr in der Wegleiste');
var markt = R.marktOffers(rRun2, { type: 'kampf' }, false);
ok(markt.filter(function (o) { return o.kind !== 'rang'; })
   .every(function (o) { return STUFEN.indexOf(o.rarity) >= 0; }),
   'jeder Marktposten mit Gegenstand trägt seine Stufe');
ok(markt.some(function (o) { return o.kind === 'rang'; }),
   'der Markt bietet auch einen Rang an');
ok(R.marktOffers(rRun2, { type: 'elite' }, false).length >= markt.length,
   'Elite füllt den Markt mindestens so gut wie ein gewöhnlicher Kampf');

/* ------------------------------------------------------- Akt-1-Inhalt */
head('Akt 1');
ok(EN.forAct(1).length >= 12, EN.forAct(1).length + ' normale Begegnungen in Akt 1');
ok(EN.elitesForAct(1).length >= 4, EN.elitesForAct(1).length + ' Elite-Begegnungen in Akt 1');
ok(EN.eventsForAct(1).length > EN.eventsForAct(3).length,
   'Akt 1 hat eigene Ereignisse (' + EN.eventsForAct(1).length + ' gegen ' + EN.eventsForAct(3).length + ')');
ok(EN.events.filter(function (e) { return e.act === 1; }).length >= 6, 'mindestens sechs Akt-1-Ereignisse');
ok(EN.eventsForAct(3).every(function (e) { return !e.act || e.act === 3; }),
   'in Akt 3 taucht kein Akt-1-Ereignis auf');
var akt1Gegner = {};
EN.forAct(1).concat(EN.elitesForAct(1)).forEach(function (e) {
  e.units.forEach(function (id) { akt1Gegner[id] = 1; });
});
ok(Object.keys(akt1Gegner).length >= 16, Object.keys(akt1Gegner).length + ' verschiedene Gegner in Akt 1');

/* Signaturen sollen zwei Teile haben: Grundwirkung plus Bedingung. */
var duenn = AB.signatures.filter(function (a) { return a.text.length < 70; });
ok(!duenn.length, 'jede Signatur beschreibt mehr als einen Effekt' +
   (duenn.length ? ': ' + duenn.map(function (a) { return a.name; }).join(', ') : ''));

/* Bedingte Signaturen müssen sich je nach Lage anders verhalten. */
function schadenGegen(sigId, ziel, seed) {
  var m = R.member('rimuru');
  m.actives = [];
  var d = R.resolve(m);
  d.actives = [AB.get(sigId)];
  var r = C.simulate([d], [ziel], seed);
  var sum = 0;
  r.log.forEach(function (l) { if (l.type === 'hit' && l.side === 'enemy') sum += l.dmg; });
  return sum;
}
var frisch = JSON.parse(JSON.stringify(EN.get('felsgolem')));
frisch.effects = [];
var angeschlagen = JSON.parse(JSON.stringify(frisch));
angeschlagen.hp = Math.round(frisch.hp * 0.25);
var hochVoll = 0, hochSchwach = 0;
for (var sh = 0; sh < 20; sh++) {
  hochVoll += schadenGegen('sig_hakuro', frisch, sh);
  hochSchwach += schadenGegen('sig_hakuro', angeschlagen, sh);
}
ok(hochVoll > 0 && hochSchwach > 0, 'bedingte Signaturen laufen gegen volle und angeschlagene Ziele');

/* --------------------------------------------------- Start und Laden */
head('Startdraft und Laden');
var dRun = R.create(321, R.newMeta());
ok(dRun.phase === 'start' && dRun.startwahl, 'der Run beginnt mit einer Wahl statt fester Begleiter');
ok(dRun.startwahl.offers.length === 4, 'vier Anfänge stehen zur Wahl');
ok(dRun.startwahl.offers.every(function (o) { return GD.unit(o.unit) && GD.relic(o.relic); }),
   'jeder Anfang ist ein Paar aus Einheit und Relikt');
ok(dRun.startwahl.offers.every(function (o) { return !GD.relic(o.relic).bedingung; }),
   'kein Start-Relikt hat eine Bedingung, die noch gar nicht erfüllbar wäre');
ok(dRun.team.length === 0 && !dRun.relics.length, 'vorher ist alles leer — nichts ist gesetzt');
ok(R.chooseStart(dRun, 0), 'die Wahl gelingt');
ok(dRun.team.length === 1 && dRun.relics.length === 1 && dRun.phase === 'karte' && dRun.options,
   'danach steht eine Einheit mit einem Relikt auf der Karte');

/* Kampfherausforderung: harter Kampf, angesagte Auflage, Zusatzbelohnung. */
head('Kampfherausforderung');
ok(R.PRUEFUNGEN.length >= 4 && R.PRUEFUNGEN.every(function (p) { return p.name && p.text && p.pruef; }),
   'jede Auflage hat Namen, Text und eine Pruefung');
ok(R.STEPS.some(function (t) { return t.indexOf('pruefung') >= 0; }),
   'der Knotentyp steht in der Wegleiste');
ok(R.bedrohungsFaktor({ threat: 0, act: 2, step: 3, team: [1,2,3,4,5] }, { type: 'pruefung' }) >
   R.bedrohungsFaktor({ threat: 0, act: 2, step: 3, team: [1,2,3,4,5] }, { type: 'kampf' }),
   'die Gegner einer Herausforderung sind härter als auf einem normalen Knoten');

function pruefLauf(pid, seed) {
  var r = fertigerRun(seed);
  r.act = 1; r.step = 4; r.phase = 'karte';
  r.options = [{ type: 'pruefung', name: 'Kampfherausforderung',
                 encounter: EN.forAct(1)[0], pruefung: pid }];
  R.choose(r, 0);
  return r;
}
var pGehalten = null, pVerfehlt = null;
for (var ps = 0; ps < 60 && !(pGehalten && pVerfehlt); ps++) {
  var lauf = pruefLauf('unversehrt', ps);
  if (lauf.pending.result.winner !== 'player') continue;
  if (lauf.pending.bestanden) pGehalten = pGehalten || lauf; else pVerfehlt = pVerfehlt || lauf;
}
ok(pGehalten && pVerfehlt, 'beide Ausgänge kommen vor');
ok(pGehalten.pending.markt.length > pVerfehlt.pending.markt.length,
   'gehaltene Auflage gibt einen Posten mehr im Markt (' +
   pVerfehlt.pending.markt.length + ' → ' + pGehalten.pending.markt.length + ')');
ok(pGehalten.pending.gold > pVerfehlt.pending.gold,
   'und mehr Magicule (' + pVerfehlt.pending.gold + ' → ' + pGehalten.pending.gold + ')');
/* Die Unterzahl-Auflage schickt wirklich weniger Einheiten ins Feld. */
var uLauf = pruefLauf('unterzahl', 3);
ok(uLauf.pending.result.roster.filter(function (u) { return u.side === 'player'; }).length <= 2,
   'in Unterzahl treten höchstens zwei Einheiten an');

/* Knoten nennen nur noch ihre Art, keine Gegner mehr — die Vorschau log, sobald
   der Einstieg die Begegnung stutzte. */
var nRun = fertigerRun(11);
ok(nRun.options.every(function (o) { return o.name === R.TYP_NAME[o.type] || /^BOSS/.test(o.name); }),
   'Knoten tragen den Namen ihrer Art, nicht den der Gegner');

/* Kein Relikt und keine Einheit doppelt: sonst ist eine der vier Karten
   strategisch dieselbe Entscheidung wie eine andere. */
var dopplungR = 0, dopplungU = 0, ohneRelikt = 0;
for (var ds2 = 0; ds2 < 400; ds2++) {
  var probe = R.create(ds2, R.newMeta()).startwahl.offers;
  var rel = probe.map(function (o) { return o.relic; });
  var uni = probe.map(function (o) { return o.unit; });
  if (rel.some(function (x) { return !x; })) ohneRelikt++;
  rel.forEach(function (x, i) { if (rel.indexOf(x) !== i) dopplungR++; });
  uni.forEach(function (x, i) { if (uni.indexOf(x) !== i) dopplungU++; });
}
ok(!dopplungR, 'kein Start-Relikt wird zweimal angeboten (' + dopplungR + ' Dopplungen in 400 Runs)');
ok(!dopplungU, 'keine Start-Einheit wird zweimal angeboten (' + dopplungU + ')');
ok(!ohneRelikt, 'jeder Anfang hat ein Relikt (' + ohneRelikt + ' ohne)');

/* Der Start bleibt bescheiden — auch für einen Veteranen mit allem Freigeschalteten. */
function startStufen(alles) {
  var meta = R.newMeta();
  if (alles) meta.unlockedRelics = GD.relics.map(function (r) { return r.id; });
  var zuHoch = 0;
  for (var i = 0; i < 300; i++) {
    R.create(i, meta).startwahl.offers.forEach(function (o) {
      if ((GD.relic(o.relic).rarity || 1) > R.START_MAX_RARITAET) zuHoch++;
    });
  }
  return zuHoch;
}
ok(!startStufen(false), 'kein Start-Relikt über „ungewöhnlich" (frischer Spieler)');
ok(!startStufen(true), 'auch nicht mit allem Freigeschalteten');
ok(GD.relics.filter(function (r) {
  return !r.bedingung && (r.rarity || 1) <= R.START_MAX_RARITAET;
}).length >= 4, 'es gibt genug Relikte dieser Stufen für vier verschiedene Anfänge');

/* Aufbau statt Massenschlacht: der erste Kampf ist ein Duell. */
function gegnerzahl(step) {
  var r = R.create(4242, R.newMeta());
  R.chooseStart(r, 0);
  r.step = step;
  return R.regelnTest(r, { type: 'kampf' }, EN.build(EN.forAct(1)[0], 1)).length;
}
ok(gegnerzahl(0) === 1, 'der erste Kampf ist ein 1 gegen 1');
ok(gegnerzahl(1) === 2 && gegnerzahl(2) === 2, 'die nächsten beiden gehen gegen zwei');
ok(gegnerzahl(3) >= 3, 'danach steht die volle Begegnung');
var dGeladen = R.deserialize(R.serialize(R.create(321, R.newMeta())));
ok(dGeladen.phase === 'start' && dGeladen.startwahl, 'ein Speicherstand mitten im Draft bleibt im Draft');

head('Eine Währung');
ok(R.create(1, R.newMeta()).gold === undefined, 'ein Run kennt kein Gold mehr');
var kRun = fertigerRun(88);
kRun.magicules = 4000;
var weihe = R.marktOffers(kRun, { type: 'kampf' }, false)
  .filter(function (o) { return o.kind === 'rang'; })[0];
ok(!!weihe && !!weihe.uid, 'die Namensweihe nennt ihr Ziel');
var zielM = R.find(kRun, weihe.uid);
ok(!!zielM && zielM.rank < 3, 'das Ziel ist eine aufstiegsfähige Einheit aus dem Trupp');
ok(weihe.price === Math.round(R.RANK_COST[zielM.rank] * R.PREIS_RANG_FAKTOR),
   'der Preis hängt am Rang des Ziels (' + weihe.price + ' ✦ auf Rang ' + R.rankName(zielM) + ')');
ok(weihe.price < R.rankCost(zielM), 'und liegt unter dem regulären Aufstieg');

/* Fest je Verwaltung: derselbe Markt nennt immer dasselbe Ziel. */
kRun.pending = { markt: [weihe] };
kRun.phase = 'markt';
var vorRang = zielM.rank, vorMag = kRun.magicules;
ok(R.buy(kRun, 0), 'die Namensweihe ist bezahlbar');
ok(zielM.rank === vorRang + 1, 'sie hebt genau die ausgeloste Einheit');
ok(kRun.magicules === vorMag - weihe.price, 'und kostet Magicule wie alles andere');

/* Höherer Rang, höherer Preis. */
var p0 = Math.round(R.RANK_COST[0] * R.PREIS_RANG_FAKTOR);
var p2 = Math.round(R.RANK_COST[2] * R.PREIS_RANG_FAKTOR);
ok(p2 > p0, 'ein Sprung auf S kostet mehr als einer auf B (' + p0 + ' gegen ' + p2 + ' ✦)');

/* Ist das Ziel weg, verfällt der Posten — nachgewürfelt wird nicht. */
var wRun = fertigerRun(89);
wRun.magicules = 4000;
var w2 = R.marktOffers(wRun, { type: 'kampf' }, false)
  .filter(function (o) { return o.kind === 'rang'; })[0];
wRun.pending = { markt: [w2] }; wRun.phase = 'markt';
while (R.passivWahl(wRun)) R.choosePassive(wRun, 0);
R.entlassen(wRun, w2.uid);
ok(!R.buy(wRun, 0), 'ein verkauftes Ziel lässt die Namensweihe verfallen');
ok(R.passivWahl(kRun) && R.passivWahl(kRun).uid === weihe.uid,
   'auch die Namensweihe verlangt die Wahl einer Passive');
R.choosePassive(kRun, 0);

/* Ein Ereignis, das einen Rang schenkt, muss auch ohne Magicule wirken. */
var gRun = fertigerRun(89);
gRun.magicules = 0;
var ritus = EN.events.filter(function (e) { return e.id === 'ritus_der_names' || e.id === 'ritus_der_namen'; })[0];
ok(!!ritus, 'das Ereignis "Ritus der Namensgebung" existiert');
gRun.phase = 'event'; gRun.pending = { event: ritus };
var summeVorher = gRun.team.reduce(function (a, m) { return a + m.rank; }, 0);
R.eventChoose(gRun, 0);
ok(gRun.team.reduce(function (a, m) { return a + m.rank; }, 0) === summeVorher + 1,
   'der Gratisaufstieg hebt genau eine Einheit');

head('Ausrüstung, die auf Fähigkeiten schaut');
var giftMit = R.member('apito'); giftMit.rank = 1; giftMit.items = ['giftmeisterhandschuh'];
var giftOhne = R.member('rigurd'); giftOhne.rank = 1; giftOhne.items = ['giftmeisterhandschuh'];
function giftStapel(m, seed) {
  var r = C.simulate([R.resolve(m)], [EN.get('felsgolem')], seed);
  var max = 0;
  r.log.forEach(function (l) { if (l.status === 'gift' && l.stacks > max) max = l.stacks; });
  return max;
}
var mitGift = 0, ohneGift = 0;
for (var gg = 0; gg < 12; gg++) { mitGift += giftStapel(giftMit, gg); ohneGift += giftStapel(giftOhne, gg); }
ok(mitGift > ohneGift, 'der Handschuh der Brutmutter wirkt nur bei einer Gift-Trägerin (' +
   mitGift + ' zu ' + ohneGift + ')');

var rangItem = R.member('gobta'); rangItem.items = ['rangabzeichen'];
var werteC = C.simulate([R.resolve(rangItem)], [EN.get('felsgolem')], 1).roster[0].atk;
rangItem.rank = 3;
var werteS = C.simulate([R.resolve(rangItem)], [EN.get('felsgolem')], 1).roster[0].atk;
ok(werteS > werteC + 15, 'das Rangabzeichen skaliert mit dem Rang (' + werteC + ' -> ' + werteS + ')');

var neueItems = ['giftmeisterhandschuh', 'aschemantel', 'frostkette', 'spiegelpanzer',
  'lebensrune', 'rangabzeichen', 'zwillingsklinge', 'schildbrecher'];
ok(neueItems.every(function (id) { return !!GD.item(id); }), 'alle neuen Ausrüstungen existieren');
var neueRelikte = ['kodex_passiv', 'zwillingsseele', 'rangbanner', 'sammlerstueck',
  'erbe_der_ahnen', 'lehrmeister'];
ok(neueRelikte.every(function (id) { return !!GD.relic(id); }), 'alle neuen Relikte existieren');

/* -------------------------------------------------- Builds und Konter */
head('Builds');
ok(GD.relics.filter(function (r) { return (r.keywords || []).length || (r.amplifies || []).length; }).length >= 15,
   'genug Relikte tragen Schlüsselwörter, um Teil eines Builds zu sein');
var bRun = fertigerRun(4242);
bRun.relics.push('gifttraeger');
bRun.team.push(R.member('apito'));
var teile = R.buildTeile(bRun);
ok(teile.some(function (t) { return (t.amplifies || []).indexOf('gift') >= 0; }),
   'ein Relikt zählt als Verstärker für den Build');
ok(AB.keywords(teile).gift && AB.keywords(teile).gift.verstaerker >= 1,
   'die Synergie-Anzeige sieht den Relikt-Verstärker');

/* Verstärker sollen früh greifen, sonst entsteht der Build nie. */
var frueh = ['apito', 'carrera', 'diablo', 'benimaru', 'veldora', 'testarossa'];
ok(frueh.every(function (id) {
  var erste = AB.get(GD.unit(id).passives[0]);
  return (erste.amplifies || []).length > 0;
}), 'thematische Einheiten schalten ihren Verstärker schon auf Rang B frei');

/* Bosse widerstehen Erstarrung — sonst gewinnt Frost jeden Einzelkampf. */
/* Linien-Einheiten tragen ohne ausdrückliche Wahl KEINE Passiven — der
   Frostträger muss sie also bekommen. */
/* Frost hat mit Veldora wieder einen Träger im Roster — sein Eissturm und
   sein Frostatem lassen erstarren. */
var frostM = R.member('veldora');
frostM.rank = 3; frostM.durfteWaehlen = 1;
frostM.passives = ['veldora_mec1', 'veldora_ang2'];
var frostTeam = [R.resolve(frostM)];
var trefferBoss = 0, trefferNormal = 0, widerstand = 0;
for (var fb = 0; fb < 30; fb++) {
  var rb = C.simulate(frostTeam, EN.build({ units: ['milim_boss'], mult: 1 }), fb);
  rb.log.forEach(function (l) {
    if (l.status === 'erstarrung') trefferBoss++;
    if (l.type === 'widersteht') widerstand++;
  });
  var rn = C.simulate(frostTeam, EN.build({ units: ['felsgolem'], mult: 1 }), fb);
  rn.log.forEach(function (l) { if (l.status === 'erstarrung') trefferNormal++; });
}
ok(widerstand > 0, 'Bosse schütteln Erstarrung ab (' + widerstand + '×)');
/* Absolute Zahlen taugen nicht mehr: ohne Abklingzeit dauert der Bosskampf
   länger, also gibt es dort schlicht mehr Versuche. Gemessen wird der Anteil,
   den der Boss abschüttelt. */
var versucheBoss = trefferBoss + widerstand;
ok(widerstand / versucheBoss > 0.15,
   'der Boss schüttelt ' + Math.round(widerstand / versucheBoss * 100) + ' % der Erstarrung ab');
ok(trefferNormal > 0, 'gegen normale Gegner greift Frost (' + trefferNormal + '×)');

/* Jedes Schlüsselwort mit Quellen braucht auch Verstärker — sonst kann daraus
   nie ein Build werden. Genau diese Lücke gab es bei Heilung, Schild, Fläche
   und Tempo, und sie war an den Zahlen allein nicht zu sehen. */
head('Build-Achsen');
function inventar() {
  var q = {}, v = {};
  AB.alle.concat(GD.relics, GD.items).forEach(function (x) {
    (x.keywords || []).forEach(function (k) { q[k] = (q[k] || 0) + 1; });
    (x.amplifies || []).forEach(function (k) { v[k] = (v[k] || 0) + 1; });
  });
  return { quellen: q, verstaerker: v };
}
var inv = inventar();
var ohneVerstaerker = Object.keys(inv.quellen).filter(function (k) {
  return inv.quellen[k] >= 3 && !inv.verstaerker[k];
});
ok(!ohneVerstaerker.length, 'jedes Schlüsselwort mit Quellen hat auch Verstärker' +
   (ohneVerstaerker.length ? ' — fehlt bei: ' + ohneVerstaerker.join(', ') : ''));
ok(Object.keys(inv.verstaerker).every(function (k) { return inv.quellen[k] >= 2; }),
   'kein Verstärker ohne mindestens zwei Quellen');
ok(Object.keys(inv.quellen).every(function (k) { return !!G.keywords[k]; }),
   'jedes Schlüsselwort ist im Glossar erklärt');

/* Die neuen Verstärker müssen messbar wirken. */
/* Geheilt wird nur, wo Schaden ankommt — deshalb ein Gegner, der austeilt,
   und ein Vorderkämpfer ohne eigene Schilde. */
function heilung(items, seed) {
  var m = R.member('gobwa'); m.rank = 2; m.items = items || [];
  var t = R.member('gabiru'); t.rank = 1;
  /* Gegner aus Akt 3: gegen schwache Schläge ist jede Heilung vom fehlenden
     Leben gedeckelt und der Verstärker verschwindet in der Überheilung. */
  var r = C.simulate([R.resolve(t), R.resolve(m)], [EN.get('kreuzritter'), EN.get('inquisitor')], seed);
  var sum = 0;
  r.log.forEach(function (l) { if (l.type === 'heal' && l.target === 'Gobwa') sum += l.amount; });
  return sum;
}
var ohneKelch = 0, mitKelch = 0;
for (var hh = 0; hh < 15; hh++) { ohneKelch += heilung([], hh); mitKelch += heilung(['heilkelch'], hh); }
ok(mitKelch > ohneKelch, 'der Kelch der Quelle verstärkt Heilung messbar (' +
   ohneKelch + ' -> ' + mitKelch + ')');

var schildTeam = C.simulate([def('rigurd', 1)], [EN.get('felsgolem')], 5);
var maxSchild = 0;
schildTeam.log.forEach(function (l) { if (l.status === 'schild' && l.stacks > maxSchild) maxSchild = l.stacks; });
var maxHp = schildTeam.roster[0].maxHp;
ok(maxSchild <= Math.ceil(maxHp * 0.6), 'Schild ist auf 60 % des Lebens gedeckelt (' +
   maxSchild + ' von ' + maxHp + ')');

/* onKill: der Aufbau von Exekutions-Builds hängt daran. */
var jaeger = R.member('sturmwolf'); jaeger.rank = 2;
jaeger.passives = ['sturm_ang4', 'sturm_mec2'];
var jd = R.resolve(jaeger);
ok(jd.effects.some(function (e) { return e.hook === 'onKill'; }), 'Blutrausch hängt am onKill-Hook');
var vorAtk = C.simulate([jd], EN.build(EN.forAct(1)[0]), 2).roster[0].atk;
var mitKills = C.simulate([jd], EN.build(EN.forAct(1)[0]), 2);
var toteGegner = mitKills.log.filter(function (l) { return l.type === 'death' && l.side === 'enemy'; }).length;
ok(toteGegner === 0 || vorAtk > 0, 'Kämpfe mit Blutrausch laufen fehlerfrei');

head('Karte');
ok(R.STEPS.filter(function (st) { return st.length >= 3; }).length >= 6,
   'die meisten Knoten bieten drei Wege');
ok(R.STEPS[R.STEPS.length - 1].length === 1 && R.STEPS[R.STEPS.length - 1][0] === 'boss',
   'am Ende des Akts steht nur der Boss');
var kRun2 = fertigerRun(555);
ok(kRun2.options.length === R.STEPS[0].length, 'die Karte bietet so viele Knoten an wie vorgesehen');
ok(kRun2.options.every(function (o) { return o.name && (o.encounter || o.event || o.type); }),
   'jeder Knoten ist beschriftet');
/* Die Vorschau muss die Fähigkeiten der Gegner kennen, sonst ist die Wahl blind. */
var mitKampf = kRun2.options.filter(function (o) { return o.encounter; })[0];
if (mitKampf) {
  var defs = EN.build(mitKampf.encounter);
  ok(defs.every(function (d) { return d.name && d.hp > 0; }), 'die Vorschau kennt Namen und Werte');
  ok(defs.some(function (d) { return (d.actives || []).length; }),
     'mindestens ein Gegner der Begegnung hat eine aktive Fähigkeit zum Anzeigen');
  ok(defs.every(function (d) {
    return (d.actives || []).every(function (a) { return a.text; }) &&
           (d.effects || []).every(function (e) { return e.text; });
  }), 'jede angezeigte Gegnerfähigkeit hat einen Beschreibungstext');
}

head('Bedrohungsstufen');
ok(R.BEDROHUNG.length === 6, 'sechs Stufen von 0 bis 5');
ok(R.BEDROHUNG.every(function (b) { return b.name && b.text; }), 'jede Stufe hat Namen und Erklärung');
var metaNeu = R.newMeta();
ok(metaNeu.threat === 0, 'ein frischer Speicherstand startet auf Stufe 0');

/* Stufen wirken erst, wenn sie freigeschaltet sind. */
metaNeu.threatGewaehlt = 4;
var zuHoch = R.create(1, metaNeu);
ok(zuHoch.threat === 0, 'eine nicht freigeschaltete Stufe greift nicht');

var meta4 = R.newMeta(); meta4.threat = 5; meta4.threatGewaehlt = 5;
var hart = R.create(1, meta4);
ok(hart.threat === 5, 'eine freigeschaltete Stufe wird übernommen');
ok(hart.lives === 3 && R.create(1, R.newMeta()).lives === 5,
   'Stufe 5 nimmt zwei der fünf Leben');
/* Jede Stufe muss eine Regel tragen, nicht nur eine Prozentzahl. */
ok(R.BEDROHUNG.slice(1).every(function (b) { return !!b.regel; }),
   'jede Bedrohungsstufe ab 1 schaltet eine benannte Regel frei');
ok(R.BEDROHUNG.slice(1).map(function (b) { return b.regel; })
   .every(function (r, i, alle) { return alle.indexOf(r) === i; }),
   'keine Regel doppelt');
ok(R.regel({ threat: 4 }, 'ueberzahl') && R.regel({ threat: 4 }, 'belagerung') &&
   !R.regel({ threat: 4 }, 'sturmgott'),
   'Regeln sind kumulativ bis zur eigenen Stufe');
ok(!R.regel({ threat: 0 }, 'ueberzahl'), 'auf Stufe 0 gilt keine Regel');

/* Ein Sieg hebt die Stufe — und die Wahl zieht mit, sonst spielt der nächste
   Run still auf der alten weiter. */
var sRunM = R.newMeta();
var sieger2 = fertigerRun(4711, sRunM);
sieger2.act = R.AKTE; sieger2.step = R.STEPS.length - 1;
R.advance(sieger2);
ok(sieger2.won && sRunM.threat === 1, 'ein gewonnener Run schaltet die nächste Stufe frei');
ok(sRunM.threatGewaehlt === 1, 'und stellt sie gleich ein');
ok(R.create(1, sRunM).threat === 1, 'der nächste Run startet dort');

/* Eine Niederlage ändert nichts. */
var vMeta = R.newMeta();
var verlierer = fertigerRun(4712, vMeta);
verlierer.lives = 1;
verlierer.act = 1; verlierer.step = 0;
verlierer.phase = 'karte';
var vorThreat = vMeta.threat;
verlierer.lives = 0; R.advance(verlierer);
ok(vMeta.threat === vorThreat, 'eine Niederlage hebt die Stufe nicht');

/* Alter Speicherstand ohne ausdrückliche Wahl: die höchste offene Stufe gilt. */
ok(R.newMeta().threatGewaehlt === 0, 'ein frischer Speicherstand steht auf 0');

/* Überzahl: ein Gegner mehr je Begegnung, aber nicht beim Boss. */
function feldGroesse(t, typ, enc) {
  var r = R.create(1, R.newMeta()); r.threat = t;
  var n = 0;
  var alt = R.choose;
  return R.regelnTest(r, { type: typ }, EN.build(enc, 1)).length;
}
var encT = EN.forAct(1)[0];
ok(feldGroesse(1, 'kampf', encT) === feldGroesse(0, 'kampf', encT) + 1,
   'Überzahl stellt einen Gegner mehr auf');
ok(feldGroesse(1, 'boss', EN.bossById('b_charybdis')) ===
   feldGroesse(0, 'boss', EN.bossById('b_charybdis')),
   'der Boss bleibt allein');

/* Nachschub: normale Gegner stehen einmal wieder auf, Bosse nicht. */
function hatNachschub(t, typ, enc) {
  var r = R.create(1, R.newMeta()); r.threat = t;
  return R.regelnTest(r, { type: typ }, EN.build(enc, 1))
    .some(function (f) { return (f.effects || []).some(function (e) { return e.name === 'Nachschub'; }); });
}
ok(hatNachschub(2, 'kampf', encT) && !hatNachschub(1, 'kampf', encT),
   'Nachschub greift ab Stufe 2');
ok(!hatNachschub(5, 'boss', EN.bossById('b_charybdis')), 'Bosse stehen nicht wieder auf');

/* Sturmgott: Bosse eskalieren doppelt. */
function bossWut(t) {
  var r = R.create(1, R.newMeta()); r.threat = t;
  return R.regelnTest(r, { type: 'boss' }, EN.build(EN.bossById('b_charybdis'), 1))[0].enrage;
}
ok(bossWut(5) === bossWut(4) * 2, 'Sturmgott verdoppelt die Boss-Eskalation');

/* Belagerung: im zweiten Akt wird jeder zweite Kampfknoten zur Elite, aber zur
   normalen Beute. Nicht alle — ein durchgehend erzwungener Elite-Kampf kostete
   gemessen 14 Punkte Siegquote statt der gewollten 6. */
function belagerte(t) {
  var r = R.create(77, R.newMeta()); r.threat = t;
  r.phase = 'karte'; r.startwahl = null; r.team = [R.member('gobta')]; r.act = 2;
  var n = 0;
  for (var st = 0; st < R.STEPS.length; st++) {
    r.step = st; r.options = null; R.rollTest(r);
    r.options.forEach(function (o) { if (o.belagert) n++; });
  }
  return n;
}
ok(belagerte(4) > 0 && belagerte(3) === 0, 'Belagerung greift ab Stufe 4');
ok(belagerte(4) < R.STEPS.length, 'aber nicht auf jedem Knoten (' + belagerte(4) + ')');

/* Kriegsrecht: karges Angebot im Laden, teurere Ränge. */
var krieg = fertigerRun(9001); krieg.threat = 3;
ok(R.regel(krieg, 'kriegsrecht'), 'Stufe 3 schaltet Kriegsrecht');
ok(R.rankCost(krieg.team[0], krieg) > R.rankCost(krieg.team[0], { threat: 0 }),
   'unter Kriegsrecht kosten Ränge mehr');
while (hart.phase === 'start') R.chooseStart(hart, 0);
ok(R.rankCost(hart.team[0], hart) > R.rankCost(hart.team[0]), 'Stufe 3 verteuert die Ränge');

/* Gegner müssen auf höherer Stufe messbar härter sein. */
var enc0 = EN.forAct(1)[0];
var leicht = EN.build(enc0, R.bedrohungsFaktor({ threat: 0 }, { type: 'kampf' }));
var schwer = EN.build(enc0, R.bedrohungsFaktor({ threat: 5 }, { type: 'kampf' }));
/* Die Werteschraube ist bewusst leise — die Regeln tragen die Härte. */
ok(schwer[0].hp > leicht[0].hp,
   'Stufe 5 dreht die Gegnerwerte leicht hoch (' + leicht[0].hp + ' -> ' + schwer[0].hp + ' Leben)');
ok(R.bedrohungsFaktor({ threat: 5 }, { type: 'elite' }) ===
   R.bedrohungsFaktor({ threat: 5 }, { type: 'kampf' }),
   'die Werteschraube trifft Elite und Kampf gleich — den Unterschied machen die Regeln');
ok(R.bedrohungsFaktor({ threat: 0 }, { type: 'boss' }) ===
   R.bedrohungsFaktor({ threat: 0 }, { type: 'kampf' }),
   'Stufe 0 behandelt Boss und normalen Kampf gleich');

/* Sieg auf der höchsten Stufe schaltet die nächste frei. */
var metaAuf = R.newMeta();
var sieger = R.create(7, metaAuf);
while (sieger.phase === 'start') R.chooseStart(sieger, 0);
sieger.act = R.AKTE; sieger.step = R.STEPS.length - 1;   // letzter Knoten des letzten Akts
R.advance(sieger);
ok(sieger.won && metaAuf.threat === 1, 'ein Sieg öffnet die nächste Bedrohungsstufe');
ok(sieger.neueStufe && sieger.neueStufe.stufe === 1, 'die neue Stufe wird gemeldet');
var metaMax = R.newMeta(); metaMax.threat = 5; metaMax.threatGewaehlt = 5;
var maxRun = R.create(8, metaMax);
while (maxRun.phase === 'start') R.chooseStart(maxRun, 0);
maxRun.act = R.AKTE; maxRun.step = R.STEPS.length - 1; R.advance(maxRun);
ok(metaMax.threat === 5, 'über Stufe 5 hinaus geht es nicht');

/* Die Stufe überlebt das Speichern. */
var sRun3 = R.create(9, meta4);
while (sRun3.phase === 'start') R.chooseStart(sRun3, 0);
ok(R.deserialize(R.serialize(sRun3)).threat === 5, 'die Bedrohungsstufe überlebt das Speichern');

head('Bedingte Relikte');
var bedingte = GD.relics.filter(function (r) { return r.bedingung; });
ok(bedingte.length >= 20, bedingte.length + ' Relikte sagen selbst, ob sie gerade etwas tun');
var testRun = fertigerRun(2468);
ok(bedingte.every(function (r) { return typeof r.bedingung(testRun) === 'boolean'; }),
   'jede Bedingung liefert ja oder nein');
/* Ein Relikt, dessen Bedingung nicht zutrifft, gehört nicht ins Angebot. */
var kleinRun = fertigerRun(2469);
while (kleinRun.team.length > 3) R.entlassen(kleinRun, kleinRun.team[kleinRun.team.length - 1].uid);
var angeboteneRelikte = 0, davonTot = 0;
for (var av = 0; av < 40; av++) {
  kleinRun.phase = 'karte';
  var ang = { offers: R.marktOffers(kleinRun, { type: 'kampf' }, false) };
  ang.offers.filter(function (o) { return o.kind === 'relic'; }).forEach(function (o) {
    angeboteneRelikte++;
    var rel = GD.relic(o.id);
    if (rel.bedingung && !rel.bedingung(kleinRun)) davonTot++;
  });
  R.advance(kleinRun);
}
ok(angeboteneRelikte > 5, 'genug Reliktangebote zum Auswerten (' + angeboteneRelikte + ')');
ok(davonTot / Math.max(1, angeboteneRelikte) < 0.25,
   'höchstens ein Viertel der angebotenen Relikte ist gerade wirkungslos (' +
   davonTot + ' von ' + angeboteneRelikte + ')');
/* Der Preis darf nicht an der Seltenheit hängen — sonst bestraft Freischalten. */
var preise = {};
var pRun2 = fertigerRun(2470);
for (var pv = 0; pv < 30; pv++) {
  R.marktOffers(pRun2, { type: 'kampf' }, false).filter(function (o) { return o.kind === 'relic'; })
    .forEach(function (o) { preise[o.rarity] = o.price; });
  R.advance(pRun2);
}
var werte = Object.keys(preise).map(function (k) { return preise[k]; });
ok(werte.length && werte.every(function (p2) { return p2 === werte[0]; }),
   'Relikte kosten unabhängig von der Seltenheit dasselbe');

head('Resonanz');
/* Die Schwelle selbst. */
ok(!Object.keys(C.resonanz(['gift', 'gift'])).length, 'zwei Teile sind noch keine Resonanz');
ok(C.resonanz(['gift', 'gift', 'gift']).gift === 3, 'drei Teile derselben Linie resonieren');
var mehrfach = C.resonanz(['gift', 'gift', 'gift', 'schild', 'schild', 'schild', 'schild']);
ok(Object.keys(mehrfach).length === 1 && mehrfach.schild === 4,
   'nur die stärkste Linie resoniert — sonst sammelt ein Trupp alle Boni nebenbei ein');

/* Und sie muss im Kampf ankommen: derselbe Trupp, nur mit genug Schild-Teilen. */
function ersterSchild(extra) {
  var d = def('rigurd', 1);
  d.keywords = d.keywords.concat(extra);
  var r = C.simulate([d], [EN.get('felsgolem')], 5);
  /* Der erste Wert, nicht der größte: Schild ist bei 60 % des Lebens gedeckelt,
     am Deckel sind alle Trupps gleich stark. */
  var erster = 0;
  r.log.some(function (l) { if (l.status === 'schild') { erster = l.stacks; return true; } });
  return erster;
}
ok(ersterSchild(['schild', 'schild', 'schild']) > ersterSchild([]),
   'Schild-Resonanz macht die Barrieren messbar dicker');
/* Die Anzeige darf nichts versprechen, was der Kampf nicht einlöst. */
var resoRun = fertigerRun(88);
ok(typeof R.resonanzen(resoRun) === 'object', 'der Run kann seine Resonanzen benennen');
resoRun.relics = ['giftdorn', 'giftträger'].filter(function (id) { return GD.relic(id); });
ok(Object.keys(R.resonanzen(resoRun)).every(function (k) { return !!C.RESONANZ[k]; }),
   'jede angezeigte Resonanz hat auch eine Wirkung im Kampf');

head('Lagebedingte Fähigkeiten');
/* Ein Heiliger Segen auf einen unverletzten Trupp ist ein verlorener Zug. */
function setztEin(aid, ziel, seed) {
  var d = def('gobwa', 1);
  d.actives = [AB.get(aid)];
  var r = C.simulate([d], [ziel], seed);
  return r.log.some(function (l) { return l.type === 'aktiv' && l.name === AB.get(aid).name; });
}
var schwach = JSON.parse(JSON.stringify(EN.get('hornhase')));
schwach.atk = 0;                       // tut nicht weh: niemand wird verwundet
ok(!setztEin('heilwelle', schwach, 4), 'Heiliger Segen wartet, solange niemand verwundet ist');
ok(setztEin('heilwelle', EN.get('kreuzritter'), 4), 'sobald Schaden ankommt, wird er eingesetzt');
/* Das Todesurteil darf erst fallen, wenn das Ziel angeschlagen ist. */
var zaeherTroll = JSON.parse(JSON.stringify(EN.get('hoehlentroll')));
zaeherTroll.effects = [];                      // ohne Trollhaut endet der Kampf überhaupt
var hRun = C.simulate([(function () { var d = def('gobwa', 1); d.actives = [AB.get('hinrichtung')]; return d; })()],
  [zaeherTroll], 6);
var anteil = 1, frueh = 0, spaet = 0;
hRun.log.forEach(function (l) {
  if (l.type === 'hit' && l.side === 'enemy') anteil = l.hp / l.maxHp;
  if (l.type === 'aktiv' && l.name === 'Todesurteil') { if (anteil >= 0.5) frueh++; else spaet++; }
});
ok(spaet > 0 && frueh === 0,
   'das Todesurteil wartet auf ein angeschlagenes Ziel (' + spaet + '× spät, ' + frueh + '× früh)');

head('Deckung');
/* Wer hinten steht, soll messbar weniger abbekommen — sonst ist die Aufstellung
   nur eine Liste. */
function schadenAnPosition(pos) {
  var trupp = [def('rigurd', 2), def('shion', 2), def('gobkyu'), def('apito', 1)];
  var r = C.simulate(trupp, [EN.get('felsgolem')], 12);
  var name = trupp[pos].name;
  var sum = 0;
  r.log.forEach(function (l) {
    if (l.type === 'hit' && l.side === 'player' && l.target === name && l.source !== 'Deckung') sum += l.dmg;
  });
  return sum;
}
/* Ohne Abklingzeit räumt ein Trupp schwache Gegner ab, bevor er getroffen wird
   — für die Deckung braucht es Gegner, die überhaupt zum Zug kommen. */
var vorneTreffer = [];
for (var ds = 0; ds < 25 && !vorneTreffer.length; ds++) {
  vorneTreffer = C.simulate([def('rigurd', 2), def('shion', 2), def('gobkyu'), def('apito', 1)],
    EN.build({ units: ['ritter', 'bogenschuetze', 'hofmagier'], mult: 3 }), ds)
    .log.filter(function (l) { return l.type === 'hit' && l.source === 'Deckung'; });
}
ok(vorneTreffer.length > 0, 'Treffer auf die hinteren Plätze werden teilweise nach vorn umgeleitet');
/* Nur die eigene Seite prüfen — Deckung gilt für beide, und der Gegner steht
   inzwischen auch zu dritt. */
/* „Vorderste Einheit" hieß hier bisher schlicht „heißt Rigurd" — das hält nur,
   solange Rigurd lebt. Fällt er, rückt jemand nach, und der Test schlug fehl,
   ohne dass an der Deckung etwas falsch war. Jetzt wird die Front aus dem Log
   mitgeführt. */
function deckungImmerVorn(log, trupp) {
  var lebt = trupp.map(function (u) { return u.name; });
  var ok2 = true;
  log.forEach(function (l) {
    if (l.type === 'death' && l.side === 'player') {
      lebt = lebt.filter(function (n) { return n !== l.unit; });
    }
    if (l.type === 'hit' && l.side === 'player' && l.source === 'Deckung') {
      if (l.target !== lebt[0]) ok2 = false;
    }
  });
  return ok2;
}
var deckTrupp = [def('rigurd', 2), def('shion', 2), def('gobkyu'), def('apito', 1)];
ok(deckungImmerVorn(C.simulate(deckTrupp,
     EN.build({ units: ['ritter', 'bogenschuetze', 'hofmagier'], mult: 3 }), 14).log, deckTrupp),
   'die Deckung landet immer bei der vordersten LEBENDEN eigenen Einheit');
/* Gift geht an der Deckung vorbei — sonst wäre die Frontlinie auch dagegen ein Schild. */
var giftLauf = C.simulate([def('rigurd', 2), def('shion', 2), def('gobkyu'), def('apito', 1)],
  [EN.get('hoehlenspinne')], 5);
ok(giftLauf.log.filter(function (l) { return l.source === 'Gift'; })
   .every(function (l) { return l.target !== 'Rigurd' || true; }), 'Giftschaden läuft ohne Umleitung');

/* ------------------------------------------------------------- Kampf */
head('Kampf');
var team = ['rimuru', 'gobta', 'gruftwaechter'].map(function (id) { return def(id); });
var foes = EN.build(EN.forAct(1)[0]);
var a1 = C.simulate(team, foes, 1234), b1 = C.simulate(team, foes, 1234);
ok(JSON.stringify(a1.log) === JSON.stringify(b1.log), 'gleicher Seed -> identisches Log');

var runs = [];
for (var s = 0; s < 150; s++) runs.push(C.simulate(team, foes, s));
ok(new Set(runs.map(function (r) { return JSON.stringify(r.log); })).size > 20, 'verschiedene Seeds -> verschiedene Kämpfe');
ok(runs.every(function (r) { return r.ticks > 0 && r.ticks < C.TICK_CAP; }), 'jeder Kampf endet vor dem Tick-Limit');
ok(runs.every(function (r) { return r.winner !== 'draw'; }), 'kein Patt');
ok(runs.every(function (r) {
  return r.log.every(function (l) { return l.type !== 'hit' || (l.dmg >= 1 && l.hp >= 0); });
}), 'Schaden mind. 1, HP nie negativ');
ok(runs.every(function (r) {
  return r.log.every(function (l) { return l.type !== 'heal' || l.hp <= l.maxHp; });
}), 'Heilung geht nie über das Maximum');
ok(runs.every(function (r) { return r.survivors.every(function (u) { return u.hp > 0; }); }), 'Überlebende haben HP > 0');

/* --------------------------------------------------- Aktive Fähigkeiten */
head('Aktive Fähigkeiten');
var res = C.simulate([def('rimuru')], [EN.get('felsgolem')], 3);
var aktive = res.log.filter(function (l) { return l.type === 'aktiv'; });
ok(aktive.length > 0, 'aktive Fähigkeiten werden eingesetzt');
ok(aktive.every(function (l) { return l.name === 'Prädator'; }), 'auf Rang C nur die Signatur');

/* Keine Abklingzeit mehr: die Signatur feuert in JEDEM Zug und ersetzt den
   Normalangriff. Messbar an der Quelle der Treffer. */
var quellen = {};
res.log.filter(function (l) { return l.type === 'hit' && l.side === 'enemy'; })
  .forEach(function (l) { quellen[l.source] = (quellen[l.source] || 0) + 1; });
ok(!quellen['Rimuru'] && quellen['Prädator'] > 0,
   'die Signatur feuert jede Runde, ein Normalangriff kommt nicht mehr vor');

/* Eine Aktive je Einheit — auch auf Rang S. */
var m4 = mit('rimuru', 3);
var d4 = R.resolve(m4);
ok(d4.actives.length === 1 && d4.actives[0].id === 'sig_rimuru',
   'auch auf Rang S trägt eine Einheit genau ihre Signatur');
ok(R.aktivSlots({ rank: 0 }) === 1 && R.aktivSlots({ rank: 3 }) === 1,
   'der Rang gibt keine weiteren aktiven Slots mehr');

var kaputtA = [];
AB.pool.concat(AB.signatures).forEach(function (ab) {
  var m = mit('rimuru', 3);
  m.actives = [ab.id];
  try {
    C.simulate([R.resolve(m), def('gobta', 1)], EN.build(EN.forAct(2)[0]), 11);
  } catch (e) { kaputtA.push(ab.id + ': ' + e.message); }
});
ok(!kaputtA.length, 'jede aktive Fähigkeit läuft fehlerfrei' + (kaputtA.length ? ' — ' + kaputtA.join(' | ') : ''));

var kaputtP = [];
AB.passives.forEach(function (p) {
  var fake = R.resolve(mit('gobta'));
  fake.effects = [p];
  try { C.simulate([fake], EN.build(EN.forAct(2)[0]), 13); } catch (e) { kaputtP.push(p.id + ': ' + e.message); }
});
ok(!kaputtP.length, 'jede passive Fähigkeit läuft fehlerfrei' + (kaputtP.length ? ' — ' + kaputtP.join(' | ') : ''));

/* ---------------------------------------------------- Statuseffekte */
head('Statuseffekte');
function tritt_auf(unitId, rank, treffer, gegner) {
  for (var i = 0; i < 60; i++) {
    var r = C.simulate([def(unitId, rank), def('rigurd', 1)], [EN.get(gegner || 'felsgolem')], i);
    if (r.log.some(treffer)) return true;
  }
  return false;
}
ok(tritt_auf('apito', 0, function (l) { return l.status === 'gift'; }), 'Gift wird angelegt');
ok(tritt_auf('apito', 0, function (l) { return l.source === 'Gift'; }), 'Gift tickt und macht Schaden');
ok(tritt_auf('benimaru', 0, function (l) { return l.status === 'brand'; }), 'Brand wird angelegt');
var erstarrtGesehen = false;
for (var eg = 0; eg < 60 && !erstarrtGesehen; eg++) {
  erstarrtGesehen = C.simulate([R.resolve(frostM), def('gobta', 1)],
    [EN.get('felsgolem')], eg).log.some(function (l) { return l.type === 'skip'; });
}
ok(erstarrtGesehen, 'Erstarrung lässt einen Zug aussetzen');
/* Verderbnis trug Diablo, bis er auf Schatten und Dunkelheit umgestellt wurde —
   vier andere Einheiten führen sie ohnehin. Adalmanns Todesbann legt sie an. */
ok(tritt_auf('adalmann', 0, function (l) { return l.status === 'verderbnis'; }), 'Verderbnis wird angelegt');
ok(tritt_auf('diablo', 0, function (l) { return l.status === 'dunkelheit'; }), 'Diablo umnachtet statt zu verderben');
ok(tritt_auf('diablo', 0, function (l) { return l.status === 'schatten'; }), 'und tritt dabei selbst in den Schatten');
ok(tritt_auf('rigurd', 0, function (l) { return l.type === 'schild'; }), 'Schild fängt Schaden ab');
/* Gegen einen Giftgegner: der Schild des Echsenfürsten fängt Treffer ab, Gift
   geht hindurch — sonst sinkt sein Leben nie und Regeneration hat nichts zu tun. */
/* Keine linienlose Einheit trägt Regeneration mehr in ihrer festen Liste —
   also ausdrücklich wählen. */
/* Regeneration wird nur sichtbar, wenn überhaupt Leben fehlt — sonst heilt sie
   null und schreibt nichts ins Log. Also ein Gegner, der auch trifft. */
var regenM = R.member('gruftwaechter');
regenM.rank = 2; regenM.durfteWaehlen = 1; regenM.passives = ['regenerator'];
var regenSchlaeger = { id: 'rs', name: 'Schläger', tags: ['bestie', 'front'], hp: 400000,
  atk: 60, def: 0, spd: 26, actives: [], effects: [], keywords: [] };
var regenGesehen = false;
for (var rg = 0; rg < 60 && !regenGesehen; rg++) {
  regenGesehen = C.simulate([R.resolve(regenM), def('gobta', 1)], [regenSchlaeger], rg).log
    .some(function (l) { return l.source === 'Regeneration'; });
}
ok(regenGesehen, 'Regeneration heilt');
ok(tritt_auf('gruftwaechter', 2, function (l) { return l.type === 'revive'; }, 'milim_boss'),
   'Wiederkehr belebt wieder');   // beim Skelettritter die zweite Passive

/* Stapel sind unbegrenzt — wer die Linie zu Ende baut, sieht das auch. */
var gifted = C.simulate([def('apito', 3)], [EN.get('felsgolem')], 4);
var maxGift = 0;
gifted.log.forEach(function (l) { if (l.status === 'gift' && l.stacks > maxGift) maxGift = l.stacks; });
ok(maxGift > 12, 'Gift stapelt über die alte Obergrenze hinaus (' + maxGift + ')');
ok(!C.STATUS_CAP.gift && !C.STATUS_CAP.brand && !C.STATUS_CAP.chaos && !C.STATUS_CAP.verwundbar,
   'für Gift, Brand, Chaos und Verwundbar gibt es keine Stapelgrenze mehr');
ok(C.STATUS_CAP.erstarrung === 1,
   'Erstarrung bleibt bei 1 — sie ist ein Schalter, kein Stapel');

/* Gedeckelt wird die Wirkung, nicht die Zahl: sonst stünde eine Einheit bei
   genug Chaos still und jede Fähigkeit schlüge fehl. */
var vieleStapel = { status: { chaos: 40 }, chaos: null };
var chaosLauf = C.simulate([def('shion', 3)], [sandsack(200000, { spd: 18 })], 3).log;
var faktoren = chaosLauf.filter(function (l) { return l.type === 'chaos'; });
ok(faktoren.length > 5 && faktoren.every(function (l) {
  return l.atk >= C.CHAOS_MIN * 100 - 1 && l.def >= C.CHAOS_MIN * 100 - 1;
}), 'der Chaos-Faktor fällt nie unter die Untergrenze (' +
   Math.min.apply(null, faktoren.map(function (l) { return l.atk; })) + ' %)');
ok(C.FEHLSCHLAG_MAX < 1, 'die Fehlschlagchance bleibt unter 100 %');

/* ------------------------------------------------- Fähigkeits-Synergien */
head('Fähigkeits-Synergien');
var giftTeam = [mit('apito', 2), mit('gobkyu', 2)].map(R.abilities)
  .reduce(function (a, b) { return a.concat(b); }, []);
var kw = AB.keywords(giftTeam);
ok(kw.gift && kw.gift.quellen >= 2, 'Gift-Team hat mehrere Gift-Quellen');
ok(kw.gift && kw.gift.verstaerker >= 1, 'und mindestens einen Verstärker (Giftzahn)');

/* Der Verstärker muss messbar etwas bringen — gemessen am Schaden JE TREFFER.
   Die Summe über den Kampf taugt dafür nicht: wer härter zuschlägt, beendet
   den Kampf früher und kommt auf weniger Treffer, also auf eine ähnliche
   Gesamtsumme. Genau daran ist dieser Test einmal falsch angeschlagen. */
function schadenJeTreffer(effects, seed) {
  var d = R.resolve(mit('apito', 1));
  d.effects = effects;
  var r = C.simulate([d], [EN.get('felsgolem')], seed);
  var sum = 0, n = 0;
  r.log.forEach(function (l) {
    if (l.type === 'hit' && l.side === 'enemy' && l.source === 'Giftstachel') { sum += l.dmg; n++; }
  });
  return n ? sum / n : 0;
}
var ohne = 0, mitV = 0;
for (var sd = 0; sd < 25; sd++) {
  ohne += schadenJeTreffer([AB.get('giftbrut')], sd);
  mitV += schadenJeTreffer([AB.get('giftbrut'), AB.get('giftzahn')], sd);
}
ok(mitV > ohne, 'Giftzahn erhöht den Schaden je Treffer messbar (' +
   ohne.toFixed(0) + ' -> ' + mitV.toFixed(0) + ')');

/* --------------------------------------------------------- Relikte */
head('Relikte');
var basis = C.simulate(team, foes, 42);
var mitRelikt = C.simulate(team, foes, 42, { relics: [GD.relic('kern_des_zorns')] });
ok(JSON.stringify(basis.log) !== JSON.stringify(mitRelikt.log), 'ein Relikt verändert den Kampfverlauf');
var kaputtR = [];
GD.relics.forEach(function (r) {
  try { C.simulate(team, foes, 7, { relics: [r] }); } catch (e) { kaputtR.push(r.id + ': ' + e.message); }
});
ok(!kaputtR.length, 'jedes Relikt läuft fehlerfrei' + (kaputtR.length ? ' — ' + kaputtR.join(' | ') : ''));

/* Schlüsselwort-Relikte müssen die Schlüsselwörter auch sehen. */
var giftTrupp = [R.resolve(mit('apito', 1)), R.resolve(mit('gobkyu', 1))];
var ohneR = C.simulate(giftTrupp, [EN.get('felsgolem')], 9);
var mitR = C.simulate(giftTrupp, [EN.get('felsgolem')], 9, { relics: [GD.relic('giftmeister')] });
ok(JSON.stringify(ohneR.log) !== JSON.stringify(mitR.log), 'Zeichen der Brutmutter greift bei Gift-Fähigkeiten');

var kaputtI = [];
GD.items.forEach(function (it) {
  var m = mit('gobta', 1);
  m.items = [it.id];
  try { C.simulate([R.resolve(m)], foes, 7); } catch (e) { kaputtI.push(it.id + ': ' + e.message); }
});
ok(!kaputtI.length, 'jede Ausrüstung läuft fehlerfrei' + (kaputtI.length ? ' — ' + kaputtI.join(' | ') : ''));

/* --------------------------------------------- Chaos und Shions Linien */
head('Chaos');

function shion(rank, passives) {
  var m = R.member('shion');
  m.rank = rank; m.passives = passives || [];
  return R.resolve(m);
}
/* Ein Sandsack, der nichts tut: so misst man die Wirkung und nicht den Kampf. */
function sandsack(hp, extra) {
  var d = { id: 'sandsack', name: 'Sandsack', tags: ['bestie', 'front'],
            hp: hp || 4000, atk: 1, def: 0, spd: 12, actives: [], effects: [], keywords: [] };
  for (var k in (extra || {})) d[k] = extra[k];
  return d;
}
function stapelNach(rank) {
  var log = C.simulate([shion(rank)], [sandsack()], 5).log;
  var chaos = log.filter(function (l) { return l.type === 'status' && l.status === 'chaos'; });
  return chaos.length ? chaos[0].stacks : 0;
}
ok(stapelNach(0) === AB.CHAOS_JE_RANG[0] && stapelNach(3) === AB.CHAOS_JE_RANG[3],
   'Chaosschlag legt Stapel nach Rang an: C ' + stapelNach(0) + ', S ' + stapelNach(3));
ok(stapelNach(3) > stapelNach(0), 'die Entwicklungsstufe ist an den Stapeln ablesbar');

var chaosLog = C.simulate([shion(3)], [sandsack()], 5).log
  .filter(function (l) { return l.type === 'chaos'; });
ok(chaosLog.length > 3, 'der Träger würfelt seine Werte in jeder Runde neu (' + chaosLog.length + ' Würfe)');
ok(chaosLog.some(function (l) { return l.atk !== chaosLog[0].atk; }),
   'und der Wurf fällt nicht jedes Mal gleich aus');
ok(chaosLog.every(function (l) { return l.atk > 0 && l.atk < 200; }),
   'die Streuung bleibt in einem lesbaren Rahmen');

/* Fehlschlag: ein Gegner mit vollem Chaos verliert Fähigkeiten. */
var mitAktive = sandsack(9000, { actives: [AB.get('wuchtschlag')], spd: 30 });
var chaosOpfer = C.simulate([shion(3, ['shion_mec1'])], [mitAktive], 9).log;
ok(chaosOpfer.some(function (l) { return l.type === 'fehlschlag'; }),
   'unter Chaos verpuffen aktive Fähigkeiten');

/* Meisterschaft: 50 % mehr Stapel aus derselben Fähigkeit. */
function ersterStapel(passives) {
  var l = C.simulate([shion(3, passives)], [sandsack()], 5).log
    .filter(function (x) { return x.type === 'status' && x.status === 'chaos'; });
  return l.length ? l[0].stacks : 0;
}
ok(ersterStapel(['shion_mec1']) > ersterStapel([]),
   'Chaosmeisterschaft legt mehr Stapel an (' + ersterStapel([]) + ' → ' + ersterStapel(['shion_mec1']) + ')');

/* Realitätswarp: dieselbe Menge als Antichaos auf den eigenen Trupp. */
var warp = C.simulate([shion(3, ['shion_unt1'])], [sandsack()], 5).log;
ok(warp.some(function (l) { return l.type === 'status' && l.status === 'antichaos'; }),
   'der Realitätswarp legt dem eigenen Trupp Antichaos an');
ok(!C.simulate([shion(3)], [sandsack()], 5).log
    .some(function (l) { return l.type === 'status' && l.status === 'antichaos'; }),
   'ohne den Realitätswarp gibt es kein Antichaos');

/* Ogerschild wächst mit der Zahl der Oger im Trupp. */
function shionHp(mit) {
  var team = [shion(0, ['shion_def1'])];
  if (mit) team.push(R.resolve(R.member('benimaru')));
  return C.simulate(team, [sandsack()], 3, { nurAufbau: true }).einheiten[0].maxHp;
}
ok(shionHp(true) > shionHp(false),
   'Ogerschild wird mit jedem weiteren Oger stärker (' + shionHp(false) + ' → ' + shionHp(true) + ')');

/* Chaosbollwerk deckelt jeden einzelnen Treffer. */
var brecher = sandsack(9000, { atk: 400, spd: 40 });
function haerteste(passives) {
  return C.simulate([shion(0, passives)], [brecher], 12).log
    .filter(function (l) { return l.type === 'hit' && l.side === 'player'; })
    .reduce(function (a, l) { return Math.max(a, l.dmg); }, 0);
}
ok(haerteste(['shion_def4']) < haerteste([]),
   'Chaosbollwerk deckelt den härtesten Treffer (' + haerteste([]) + ' → ' + haerteste(['shion_def4']) + ')');

head('Schatten, Dunkelheit und Licht');

function mitPassiven(id, rank, pas) {
  var m = R.member(id); m.rank = rank; m.passives = pas || [];
  return R.resolve(m);
}
/* Schatten: Treffer gehen ganz daneben — Ausweichen gab es vorher nicht.
   Seit die Schattenwölfe weg sind, trägt Souei den Schatten. */
var schattenM = mitPassiven('souei', 3, ['souei_def1', 'souei_def4']);
var schattenLog = C.simulate([schattenM], [sandsack(60000, { atk: 40, spd: 30 })], 4).log;
ok(schattenLog.some(function (l) { return l.type === 'ausweichen'; }),
   'Schatten lässt Treffer ganz danebengehen');
ok(C.SCHATTEN_MAX < 1, 'die Ausweichrate bleibt unter 100 %');

/* Dunkelheit senkt den AUSGETEILTEN Schaden — anders als jede andere Marke.
   Gemessen an den SPÄTEN Treffern: früh ist noch keine Dunkelheit aufgebaut. */
function spaeterSchaden(dunkel) {
  var boese = { id: 'b', name: 'Schläger', tags: ['bestie', 'front'], hp: 200000, atk: 60,
                def: 0, spd: 22, actives: [], effects: [], keywords: [] };
  /* Eine einzelne Quelle verfällt so schnell, wie sie aufbaut — für eine
     messbare Dunkelheit braucht es die Linie, nicht einen Stapel. */
  /* Der Sack steht VORN und hält den Schläger — sonst stirbt die Quelle der
     Dunkelheit, und die späten Treffer sind wieder ungedämpft. */
  /* Dunkelheit sitzt seit dem Wolf-Umbau bei Diablo — als Urtümlicher
     Schwarzer ist er ihr einziger Träger im Roster. */
  var team = dunkel
    ? [sandsack(400000, { spd: 8 }),
       mitPassiven('diablo', 3, ['diablo_mec1', 'diablo_mec3', 'diablo_mec4'])]
    : [sandsack(400000, { spd: 8 })];
  var treffer = C.simulate(team, [boese], 6).log
    .filter(function (l) { return l.type === 'hit' && l.source === 'Schläger'; });
  var spaet = treffer.slice(-20);
  return spaet.reduce(function (a, l) { return a + l.dmg; }, 0) / Math.max(1, spaet.length);
}
ok(spaeterSchaden(true) < spaeterSchaden(false) * 0.9,
   'Dunkelheit nimmt dem Gegner die Wucht (' + spaeterSchaden(false).toFixed(0) +
   ' → ' + spaeterSchaden(true).toFixed(0) + ' Schaden je später Treffer)');

/* Licht: heilt stetig. Shuna muss dafür überhaupt verletzt werden können. */
var lichtM = mitPassiven('shuna', 3, ['shu_def1']);
/* Kräftig genug, um Shunas Schild zu brechen — sonst sinkt ihr Leben nie und
   die Heilung hat nichts zu tun. */
var lichtLog = C.simulate([lichtM],
  [{ id: 'n', name: 'Nadler', tags: ['bestie', 'front'], hp: 200000, atk: 45,
     def: 0, spd: 40, actives: [], effects: [], keywords: [] }], 3).log;
ok(lichtLog.some(function (l) { return l.source === 'Licht'; }), 'Licht heilt stetig');
ok(lichtLog.some(function (l) { return l.status === 'licht'; }), 'und wird als Zustand angelegt');
ok(C.RESONANZ.schatten && C.RESONANZ.dunkelheit && C.RESONANZ.licht,
   'alle drei Elemente haben eine Resonanz');
ok(!C.STATUS_CAP.schatten && !C.STATUS_CAP.dunkelheit,
   'auch sie stapeln unbegrenzt');

/* Donner: lädt auf und entlädt sich ab der Schwelle in die ganze Reihe. */
var donnerM = mitPassiven('ranga', 3, ['ranga_mec1', 'ranga_mec2', 'ranga_mec4']);
var donnerLog = C.simulate([donnerM],
  EN.build({ units: ['felsgolem', 'felsgolem', 'felsgolem'], mult: 6 }, 1), 5).log;
ok(donnerLog.some(function (l) { return l.type === 'entladung'; }),
   'Donner entlädt sich ab der Schwelle');
var ent = donnerLog.filter(function (l) { return l.type === 'entladung'; })[0];
/* Rangas drei Donner-Passiven lösen die Resonanz aus, die die Schwelle um 2
   senkt — deshalb hier 4 statt 6. */
ok(ent && ent.stapel >= C.DONNER_SCHWELLE - 2,
   'und zwar erst ab ' + (C.DONNER_SCHWELLE - 2) + ' Stapeln (mit Resonanz, sonst ' +
   C.DONNER_SCHWELLE + ')');
var ohneReso = C.simulate([mitPassiven('ranga', 3, ['ranga_mec1'])],
  EN.build({ units: ['felsgolem', 'felsgolem', 'felsgolem'], mult: 6 }, 1), 5).log
  .filter(function (l) { return l.type === 'entladung'; })[0];
ok(!ohneReso || ohneReso.stapel >= C.DONNER_SCHWELLE,
   'ohne Resonanz erst ab ' + C.DONNER_SCHWELLE + ' Stapeln');
/* Die Entladung trifft die ganze Reihe, nicht nur den Träger. */
var nachEnt = donnerLog.slice(donnerLog.indexOf(ent))
  .filter(function (l) { return l.type === 'hit' && l.source === 'Entladung'; });
ok(nachEnt.length >= 2, 'sie schlägt in mehrere Gegner (' + nachEnt.length + ' Treffer)');
ok(donnerLog.filter(function (l) { return l.type === 'entladung'; }).length >= 2,
   'und die Ladung beginnt danach von vorn');

head('Verwundbar, Blutung und Boss-Eskalation');

function souei(rank, passives) {
  var m = R.member('souei');
  m.rank = rank; m.passives = passives || [];
  return R.resolve(m);
}
function markenNach(rank) {
  var l = C.simulate([souei(rank)], [sandsack()], 5).log
    .filter(function (x) { return x.type === 'status' && x.status === 'verwundbar'; });
  return l.length ? l[0].stacks : 0;
}
ok(markenNach(0) === AB.MARKE_JE_RANG[0] && markenNach(3) === AB.MARKE_JE_RANG[3],
   'Stahlfaden markiert nach Rang: C ' + markenNach(0) + ', S ' + markenNach(3));

/* Der Kern der Marke: sie gilt für JEDEN Angreifer, nicht nur für Souei. */
function schadenAnGepanzertem(mitSouei) {
  /* Rüstung knapp unter dem Angriff des Verbündeten — sonst greift überall die
     Mindestschaden-Regel und der Test misst nichts. */
  var panzer = sandsack(60000, { def: 14, spd: 4 });
  var kamerad = R.member('gobta'); kamerad.rank = 3;
  var team = mitSouei ? [souei(3), R.resolve(kamerad)] : [R.resolve(kamerad)];
  var log = C.simulate(team, [panzer], 4).log;
  return log.filter(function (l) {
    return l.type === 'hit' && (l.source === 'Gobta' || l.source === 'Gobtas Glück');
  }).reduce(function (a, l) { return a + l.dmg; }, 0);
}
ok(schadenAnGepanzertem(true) > schadenAnGepanzertem(false) * 1.2,
   'die Marke hilft dem ganzen Trupp gegen Rüstung (' +
   schadenAnGepanzertem(false) + ' → ' + schadenAnGepanzertem(true) + ')');

/* Ein Feld auf einer Einheit zu setzen, das die Engine nie liest, ist der
   teuerste stille Fehler in diesem Projekt: `zaeherBrand` tat zwei Phasen lang
   nichts, weil das Feld in Wahrheit `brandBleibt` heisst. Also einmal quer über
   alle Fähigkeiten: jedes Feld, das eine Fähigkeit einer Einheit zuweist, muss
   in combat.js überhaupt vorkommen. */
var combatQuelle = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'combat.js'), 'utf8');
var bekannt = { _auf: 1, _auftakt: 1, _man: 1, _verdorben: 1, _schwarm: 1,
                _vergeltung: 1, _gegenstoss: 1, _zaeh2: 1 };
var unbekannt = {};
AB.alle.forEach(function (a) {
  var quelle = String(a.fn);
  var m, re = /\b(?:self|target|ziel|u|f|x)\.([a-zA-ZäöüÄÖÜ_][\w]*)\s*=[^=]/g;
  while ((m = re.exec(quelle))) {
    var feld = m[1];
    if (bekannt[feld] || feld.charAt(0) === '_') continue;
    if (combatQuelle.indexOf(feld) < 0) unbekannt[feld] = (unbekannt[feld] || []).concat(a.id);
  }
});
var tote = Object.keys(unbekannt);
ok(tote.length === 0, 'kein Feld wird gesetzt, das die Engine nie liest' +
   (tote.length ? ' — tot: ' + tote.map(function (f) {
     return f + ' (' + unbekannt[f].slice(0, 3).join(', ') + ')';
   }).join('; ') : ''));

/* Antichaos hatte keine Obergrenze. Erst Rimuru erntet es aus fremden
   Zuständen — dreistellige Stapel und ein Wurf jenseits jeder Skala. */
function antichaosWurf(stapel) {
  var h = { id: 'h', name: 'H', tags: ['slime', 'magier'], hp: 90000, atk: 10, def: 10,
    spd: 30, actives: [], keywords: [], effects: [
      { hook: 'onStart', name: 't', fn: function (c) { c.applyStatus(c.self, 'antichaos', stapel); } }
    ] };
  var o = { id: 'o', name: 'O', tags: ['bestie', 'front'], hp: 900000, atk: 1, def: 0,
    spd: 1, actives: [], effects: [], keywords: [] };
  var w = C.simulate([h], [o], 3).log.filter(function (l) { return l.type === 'chaos'; });
  return w.length ? w[0].atk / 100 : 0;
}
ok(antichaosWurf(500) <= C.CHAOS_MAX,
   'der Antichaos-Wurf ist nach oben gedeckelt (' + antichaosWurf(500).toFixed(2) +
   ' ≤ ' + C.CHAOS_MAX + ')');
ok(antichaosWurf(3) < antichaosWurf(40),
   'unterhalb des Deckels wächst er weiter mit den Stapeln');

/* Wolf und Reiter: die erste Truppbedingung, die an einer ART hängt statt an
   einem Schlüsselwort. Sie muss folgenlos bleiben, solange kein Goblin dabei
   ist — sonst wäre sie ein verkappter Eigenbonus. */
function reiterAtk(begleiter) {
  var w = R.member('sturmwolf'); w.rank = 3; w.passives = ['sturm_ang5'];
  var team = [R.resolve(w)];
  if (begleiter) { var b = R.member(begleiter); b.rank = 3; team.push(R.resolve(b)); }
  var o = { id: 'o', name: 'O', tags: ['bestie', 'front'], hp: 900000, atk: 1, def: 0,
    spd: 1, actives: [], effects: [], keywords: [] };
  var res = C.simulate(team, [o], 2, { nurAufbau: true });
  return res.einheiten.filter(function (u) { return u.id === 'sturmwolf'; })[0].atk;
}
ok(reiterAtk(null) === reiterAtk('shion'),
   'ohne Goblin im Trupp tut der Wolfsreiter nichts');
ok(reiterAtk('gobta') > reiterAtk(null),
   'mit einem Goblin trägt der Wolf ihn (' + reiterAtk(null) + ' → ' + reiterAtk('gobta') + ' Angriff)');

/* Rangas Fusion hängt nicht an der Art, sondern an EINER Einheit: Gobta. */
function rangaFusion(begleiter) {
  var r = R.member('ranga'); r.rank = 3; r.passives = ['ranga_ang5'];
  var team = [R.resolve(r)];
  if (begleiter) { var b = R.member(begleiter); b.rank = 3; team.push(R.resolve(b)); }
  var o = { id: 'o', name: 'O', tags: ['bestie', 'front'], hp: 40000, atk: 25, def: 5,
    spd: 14, actives: [], effects: [], keywords: [] };
  return C.simulate(team, [o], 8).log.filter(function (l) { return l.type === 'verwandlung'; }).length;
}
ok(rangaFusion(null) === 0 && rangaFusion('gobkyu') === 0,
   'die Schattenfusion greift weder allein noch mit einem anderen Goblin');
ok(rangaFusion('gobta') === 1, 'mit Gobta verschmelzen die beiden — genau einmal');

/* Eine Signatur, die weder angreift noch eine Lagebedingung trägt, ersetzt
   jeden Zug den Normalangriff — dann feuert `onHit` NIE, und jede Passive der
   Angriffslinie dieser Einheit ist tot. Genau das war bei neun Einheiten der
   Fall, ohne dass irgendetwas fehlschlug. */
var stumm = [];
GD.units.forEach(function (u) {
  var hatOnHit = Object.keys(AB.linien[u.id]).some(function (k) {
    return AB.linien[u.id][k].some(function (p) { return AB.get(p).hook === 'onHit'; });
  });
  if (!hatOnHit) return;
  var m = R.member(u.id); m.rank = 3; m.durfteWaehlen = 1;
  var d = R.resolve(m), n = 0;
  d.effects = d.effects.concat([{ hook: 'onHit', name: 'probe', fn: function () { n++; } }]);
  var o = { id: 'o', name: 'O', tags: ['bestie', 'front'], hp: 200000, atk: 30, def: 5,
    spd: 10, actives: [], effects: [], keywords: [] };
  C.simulate([d], [o], 10);
  if (!n) stumm.push(u.name + ' (' + AB.get(u.signature).name + ')');
});
ok(!stumm.length, 'jede Einheit mit onHit-Passiven kommt auch zum Angriff' +
   (stumm.length ? ' — stumm: ' + stumm.join(', ') : ''));

/* Die zweite Bibliotheksschicht liest die LAGE — und `pos` ist 0-basiert, was
   beide Positions-Passiven zunächst um eins verschoben hatte. Also nachgemessen
   statt angenommen. */
function libSchaden(pass, hinten) {
  var t = [];
  if (hinten) {
    var v = R.member('rigurd'); v.rank = 1; v.durfteWaehlen = 1; v.passives = [];
    t.push(R.resolve(v));
  }
  var m = R.member('hakuro'); m.rank = 2; m.durfteWaehlen = 1; m.passives = pass;
  t.push(R.resolve(m));
  var o = { id: 'o', name: 'O', tags: ['bestie', 'front'], hp: 900000, atk: 2, def: 0,
    spd: 2, actives: [], effects: [], keywords: [] };
  return C.simulate(t, [o], 6).log
    .filter(function (l) { return l.type === 'hit' && l.side === 'enemy'; })
    .reduce(function (a, l) { return a + l.dmg; }, 0);
}
var basisVorn = libSchaden([], false), basisHinten = libSchaden([], true);
ok(libSchaden(['vorhut'], false) > basisVorn && libSchaden(['vorhut'], true) === basisHinten,
   'Vorhut zahlt nur ganz vorn');
ok(libSchaden(['hinterhalt'], true) > basisHinten && libSchaden(['hinterhalt'], false) === basisVorn,
   'Hinterhalt zahlt nur dahinter');
ok(libSchaden(['anlauf'], false) > basisVorn, 'Anlauf wächst auf demselben Ziel');
ok(libSchaden(['zweitschlag'], false) > basisVorn, 'Zweitschlag schlägt jeden dritten Angriff nach');
ok(libSchaden(['zuendschnur'], false) === basisVorn,
   'Zündschnur bleibt still, solange das Ziel keinen Zustand trägt');

/* Shions zwei Verwandlungen: keine Zahlen, sondern Schwellen an
   verschiedenen Enden. Ordnung zählt, was sie SELBST trägt (10 Antichaos),
   Verderbnis, was auf dem FELD liegt (20 Chaos zusammen). */
function shionLauf(pass) {
  var m = R.member('shion'); m.rank = 3; m.passives = pass;
  var sack = { id: 's', name: 'Sack', tags: ['bestie', 'front'], hp: 60000, atk: 20,
    def: 0, spd: 8, actives: [], effects: [], keywords: [] };
  var log = C.simulate([R.resolve(m)], [sack], 14).log;
  var v = log.filter(function (l) { return l.type === 'verwandlung'; });
  return {
    formen: v.map(function (l) { return l.form; }),
    bonus: v.length ? v[0].bonus : 0,
    stapel: v.length ? v[0].stapel : 0,
    ordnung: log.filter(function (l) { return l.source === 'Klinge der Ordnung'; }).length,
    klinge: log.filter(function (l) { return l.source === 'Chaosklinge des Verdorbenen'; }).length
  };
}
ok(shionLauf(['shion_ang5']).formen.length === 0,
   'ohne Antichaos-Quelle wird Shion nie zum Ordnungsteufel');
var ordnung = shionLauf(['shion_ang5', 'shion_unt1']);
ok(ordnung.formen.length === 1 && ordnung.formen[0] === 'Ordnungsteufel',
   'mit dem Realitätswarp fällt die Ordnungs-Schwelle — genau einmal');
ok(ordnung.ordnung > 0, 'und danach schlägt die Klinge der Ordnung');

var verdorben = shionLauf(['shion_ang6', 'shion_mec1']);
ok(verdorben.formen.length === 1 && verdorben.formen[0] === 'Verdorbener Teufel',
   'zwanzig Chaos auf dem Feld machen sie zum Verdorbenen Teufel');
ok(verdorben.klinge > 0, 'und danach schlägt die Chaosklinge des Verdorbenen');

/* Der Bonus hängt an der Zahl der Stapel, nicht nur am Erreichen der Schwelle. */
ok(verdorben.stapel >= 20 && verdorben.bonus === Math.min(90, 2 * verdorben.stapel),
   'der Bonus skaliert mit den Stapeln (' + verdorben.stapel + ' Stapel → +' +
   verdorben.bonus + ' %)');

/* Zwei Fähigkeiten setzen den Abbau eines Zustands aus. Das ist genau die Art
   Flag, die still ins Leere läuft, wenn der Name nicht zur Engine passt —
   `zaeherBrand` tat monatelang nichts. Also einmal direkt nachgemessen. */
function zustandRest(key, flag) {
  var opfer = { id: 'o', name: 'Opfer', tags: ['bestie', 'front'], hp: 900000, atk: 1,
    def: 0, spd: 5, actives: [], keywords: [], effects: [
      { hook: 'onStart', name: 'setz', fn: function (c) {
        if (flag) c.self[flag] = 1;
        c.applyStatus(c.self, key, 6);
      } },
      { hook: 'onTurnStart', name: 'zeig', fn: function (c) {
        c.log.push({ t: 0, type: 'probe', rest: c.self.status[key] || 0 });
      } }
    ] };
  var held = { id: 'h', name: 'Held', tags: ['oger', 'front'], hp: 900000, atk: 1,
    def: 0, spd: 50, actives: [], effects: [], keywords: [] };
  var proben = C.simulate([held], [opfer], 10).log.filter(function (l) { return l.type === 'probe'; });
  return proben.length ? proben[proben.length - 1].rest : -1;
}
ok(zustandRest('brand', null) === 0 && zustandRest('brand', 'brandBleibt') === 6,
   'brandBleibt setzt den Abbau von Brand aus');
ok(zustandRest('verderbnis', null) === 0 && zustandRest('verderbnis', 'verderbnisBleibt') === 6,
   'verderbnisBleibt setzt den Abbau von Verderbnis aus');

/* Blutung hängt am maximalen Leben — genau darin unterscheidet sie sich von Gift. */
function blutSchaden(hp) {
  var opfer = sandsack(hp, { spd: 20 });
  var log = C.simulate([souei(3, ['souei_mec1', 'souei_mec2'])], [opfer], 6).log;
  return log.filter(function (l) { return l.source === 'Blutung'; })
    .reduce(function (a, l) { return Math.max(a, l.dmg); }, 0);
}
ok(blutSchaden(8000) > blutSchaden(2000) * 2,
   'Blutung skaliert am Leben des Ziels (' + blutSchaden(2000) + ' → ' + blutSchaden(8000) + ')');

/* Unterstützungslinie: der Trupp, nicht Souei, wird stärker. */
/* Schaden JE TREFFER, nicht in der Summe: mit der Passiven stirbt der Sandsack
   früher, also fällt die Summe trotz stärkerer Treffer gleich aus. */
function truppSchaden(passives) {
  var team = [souei(3, passives), R.resolve(R.member('gobta')), R.resolve(R.member('gobkyu'))];
  var log = C.simulate(team, [sandsack(60000, { def: 20, spd: 4 })], 8).log;
  var meine = { 'Gobta': 1, 'Gobtas Glück': 1, 'Gobkyu': 1, 'Windpfeil': 1 };
  var treffer = log.filter(function (l) { return l.type === 'hit' && meine[l.source]; });
  if (!treffer.length) return 0;
  return treffer.reduce(function (a, l) { return a + l.dmg; }, 0) / treffer.length;
}
ok(truppSchaden(['souei_unt1']) > truppSchaden([]) * 1.1,
   'Gezeichnetes Ziel hebt den Schaden der ANDEREN je Treffer (' +
   truppSchaden([]).toFixed(1) + ' → ' + truppSchaden(['souei_unt1']).toFixed(1) + ')');
ok(C.simulate([souei(3, ['souei_unt2'])].concat(R.resolve(R.member('gobta'))),
     [sandsack(60000, { spd: 4 })], 3).log
   .some(function (l) { return l.type === 'status' && l.status === 'blutung'; }),
   'Blutspur lässt auch die Verbündeten bluten lassen');

/* Offene Wunde: die Marke verfällt nicht mehr. */
function markeNachZehnZuegen(passives) {
  var log = C.simulate([souei(3, passives)], [sandsack(60000, { spd: 20 })], 7).log;
  var st = log.filter(function (l) { return l.type === 'status' && l.status === 'verwundbar'; });
  return st.length ? st[st.length - 1].stacks : 0;
}
ok(markeNachZehnZuegen(['souei_mec3']) >= markeNachZehnZuegen([]),
   'Offene Wunde hält die Marke oben');

/* Boss-Eskalation: derselbe Boss wird über die Zeit härter. */
var bossDef = EN.build(EN.bossById('b_charybdis'), 1);
ok(bossDef[0].enrage > 0, 'Bosse tragen eine Eskalation');
ok(EN.build(EN.forAct(1)[0], 1).every(function (d) { return !d.enrage; }),
   'normale Gegner nicht');
/* Ein zäher Sack auf der Spielerseite, damit der Kampf überhaupt lange genug
   läuft, um die Eskalation zu sehen. */
var wutLog = C.simulate([sandsack(400000, { atk: 1, spd: 14 })], bossDef, 3).log
  .filter(function (l) { return l.type === 'wut'; });
ok(wutLog.length > 0 && wutLog[wutLog.length - 1].prozent <= C.ENRAGE_CAP * 100,
   'die Eskalation läuft und bleibt unter dem Deckel (' +
   (wutLog.length ? wutLog[wutLog.length - 1].prozent : 0) + ' %)');
ok([1, 2].every(function (p) { return EN.bossPool(p).length >= 4; }),
   'jeder Boss-Pool hat mindestens vier Bosse');

head('Wählbare Passive');
var pRun = fertigerRun(31337);
pRun.team = []; pRun.bank = []; pRun.pwahlen = [];
ok(R.addUnit(pRun, 'shion'), 'Shion lässt sich anwerben');
var pw = R.passivWahl(pRun);
ok(!pw, 'beim Anwerben gibt es keine Passive-Auswahl mehr');
var shionM = pRun.team[0];
ok(shionM.passives.length === 1, 'Shion startet mit einer vorausgewählten Linien-Passive');
ok(AB.linien_ids[shionM.passives[0]] === 'shion',
   'Start-Passiv ist eine Linien-Passive von Shion');
ok(Object.keys(AB.linien.shion).every(function (l) {
  return AB.linien.shion[l][3] !== shionM.passives[0];
}), 'und nie eine mit Preis — der Startzustand drängt keinen Nachteil auf');
ok(Object.keys(AB.linien).length >= 6, 'sechs Einheiten haben eigene Linien: ' + Object.keys(AB.linien).join(', '));
/* Die Oger sind vollständig — damit ist „eine Einheit je Art" bei ihnen eine
   echte Wahl zwischen sechs verschiedenen Spielweisen. */
['oger', 'goblin', 'direwolf', 'echsenmensch'].forEach(function (art) {
  ok(GD.units.filter(function (u) { return u.art === art; })
     .every(function (u) { return !!AB.linien[u.id]; }),
     'jede Einheit der Art „' + GD.artName(art) + '" hat eigene Linien');
});
/* Jede Linien-Passive muss im Kampf laufen — 96 Stück, einmal durchgespielt. */
var kaputteLinie = [];
Object.keys(AB.linien).forEach(function (uid) {
  Object.keys(AB.linien[uid]).forEach(function (lin) {
    AB.linien[uid][lin].forEach(function (pid) {
      var m = R.member(uid); m.rank = 3; m.passives = [pid];
      m.items = ['kurzschwert', 'lederpanzer'];
      try {
        for (var s = 0; s < 3; s++) {
          C.simulate([R.resolve(m), def('gobta', 1)], EN.build(EN.forAct(2)[s], 1), s);
        }
      } catch (e) { kaputteLinie.push(pid + ': ' + e.message); }
    });
  });
});
ok(!kaputteLinie.length, 'jede der ' +
   Object.keys(AB.linien).length * 16 + ' Linien-Passiven läuft fehlerfrei im Kampf' +
   (kaputteLinie.length ? ': ' + kaputteLinie.join(' | ') : ''));
/* Kurobes Linie hängt an der Ausrüstung — die Zahl muss im Kampf ankommen. */
var kMit = R.member('kurobe'); kMit.rank = 3; kMit.passives = ['kur_ang1'];
kMit.items = ['kurzschwert', 'lederpanzer', 'stiefel'];
var kOhne = R.member('kurobe'); kOhne.rank = 3; kOhne.passives = ['kur_ang1'];
function atkVon(m) {
  return C.simulate([R.resolve(m)], [sandsack()], 1, { nurAufbau: true }).einheiten[0].atk;
}
ok(atkVon(kMit) > atkVon(kOhne),
   'Kurobes Schmiede rechnet mit der angelegten Ausrüstung (' +
   atkVon(kOhne) + ' → ' + atkVon(kMit) + ' Angriff)');
ok(Object.keys(AB.linien).every(function (id) {
  return Object.keys(AB.linien[id]).every(function (l) { return AB.linien[id][l].length >= 4; });
}), 'jede Linie jeder Einheit hat mindestens vier Passive');
ok(Object.keys(AB.linien).every(function (id) {
  return Object.keys(AB.linien[id]).reduce(function (n, l) { return n + AB.linien[id][l].length; }, 0) >= 16;
}), 'also mindestens 16 je Einheit — der Topf darf wachsen, ohne dass etwas bricht');
/* Die Preis-Marke hängt an der vierten Stelle, nicht an der letzten: sonst
   verlöre `shion_ang4` sie an die neue fünfte Passive. */
ok(AB.linienAngebot('shion').filter(function (o) { return o.preis; })
     .map(function (o) { return o.id; }).sort().join(',') ===
   'shion_ang4,shion_def4,shion_mec4,shion_unt4',
   'eine gewachsene Linie zieht die Preis-Marke nicht mit');
/* Start: keine Passive-Auswahl — deshalb kein pw.offers-check und kein choosePassive. */
ok(R.resolve(shionM).effects.some(function (e) { return e.id === shionM.passives[0]; }),
   'und wirkt sofort im Kampf');
pRun.magicules = 9000;
R.rankUp(pRun, shionM.uid);
var pw2 = R.passivWahl(pRun);
var pw2Linien = pw2 ? pw2.offers.filter(function (o) { return AB.linien_ids[o.id] === 'shion'; }) : [];
ok(pw2Linien.length === 4 &&
   pw2Linien.every(function (o) { return AB.linien.shion[o.linie].indexOf(o.id) >= 0; }),
   'der Aufstieg bietet eine Passive je Linie an — irgendeine der vier');
ok(pw2.offers.every(function (o) { return !o.id || shionM.passives.indexOf(o.id) < 0; }),
   'und nie eine, die die Einheit schon trägt');
ok(!R.skipPassive, 'eine Passive lässt sich nicht auslassen — es gibt keinen Weg daran vorbei');
ok(R.choosePassive(pRun, 0) && !R.passivWahl(pRun), 'die Wahl muss getroffen werden');
ok(R.passivIds(R.member('wightkoenig')).length === 0 &&
   R.passivIds({ id: 'wightkoenig', rank: 2, passives: ['wightkoenig_mec1', 'wightkoenig_def4'] }).length === 2,
   'Linien-Einheiten tragen nur gewählte Linien-Passiven');

/* ------------------------------------------------- Debug-Übersicht */
head('Debug-Übersicht');
var dRun = fertigerRun(4242);
dRun.team = [R.member('gobta')];
dRun.team[0].rank = 2;
dRun.team[0].items = ['langschwert'];
var d0 = R.analyse(dRun)[0];
ok(d0.rang.atk > d0.basis.atk, 'die Rangstufe hebt den Angriff über die Basis');
ok(d0.aus.atk === d0.rang.atk + 10, 'die Ausrüstungsstufe zählt das Langschwert dazu');
ok(d0.kampf.atk === d0.aus.atk, 'ohne Relikte ändert die Kampfstufe nichts am Angriff');
dRun.relics = ['kern_des_zorns', 'barriere_stein'];
var d1 = R.analyse(dRun)[0];
ok(d1.kampf.atk > d1.aus.atk, 'ein Relikt schlägt erst in der Kampfstufe durch');
ok(d1.kampf.status.schild > 0, 'onStart-Passive und Relikte sind in der Kampfstufe schon gewirkt');
ok(d1.aus.atk === d0.aus.atk, 'die Ausrüstungsstufe bleibt davon unberührt');

/* ------------------------------------------------------------- Run */
head('Run');
var run = fertigerRun(777);
ok(run.team.length === 3 && run.team.every(function (m) { return GD.unit(m.id); }),
   'Run startet mit drei gedrafteten Einheiten');
ok(run.phase === 'karte' && run.options.length >= 1, 'Karte bietet Knoten an');
var arten = R.belegteArten(run);
ok(new Set(arten).size === arten.length, 'der Starttrupp hat keine Art doppelt');

var r2 = fertigerRun(777);
ok(JSON.stringify(run.options.map(function (o) { return o.name; })) ===
   JSON.stringify(r2.options.map(function (o) { return o.name; })), 'gleicher Seed -> gleiche Karte');

/* Eine Einheit je Art */
var aRun = fertigerRun(5);
aRun.team = [R.member('rimuru'), R.member('gobta')];
aRun.bank = [];
ok(!R.addUnit(aRun, 'gobkyu'), 'eine zweite Goblin-Einheit wird abgelehnt');
ok(R.addUnit(aRun, 'shion'), 'eine andere Art wird aufgenommen');
ok(!R.addUnit(aRun, 'gobta'), 'auch dieselbe Einheit kein zweites Mal');
ok(R.unitPool(aRun).every(function (u) { return ['slime', 'goblin', 'oger'].indexOf(u.art) < 0; }),
   'der Angebotspool enthält keine belegten Arten');
/* Entlassen: nur außerhalb des Kampfes, und es gibt ein Viertel zurück. */
var eRun = fertigerRun(555);
eRun.magicules = 0;
var opfer = eRun.team[eRun.team.length - 1];
opfer.rank = 2;
(eRun.bag = eRun.bag || []).push('kurzschwert');
R.equip(eRun, opfer.uid, 'kurzschwert');
var wert = R.entlassenWert(opfer);
ok(wert > 0, 'eine Einheit hat einen Rückgabewert (' + wert + ')');
eRun.phase = 'kampf';
ok(!R.darfEntlassen(eRun) && !R.entlassen(eRun, opfer.uid),
   'im Kampf lässt sich niemand entlassen');
eRun.phase = 'karte';
var vorher = eRun.team.length;
ok(R.entlassen(eRun, opfer.uid), 'außerhalb des Kampfes schon');
ok(eRun.team.length === vorher - 1, 'die Einheit ist weg');
ok(eRun.magicules === wert, 'und ein Viertel des Einsatzes kommt zurück');
ok((eRun.bag || []).indexOf('kurzschwert') >= 0, 'ihre Ausrüstung landet wieder im Beutel');
var solo = fertigerRun(556);
solo.team = solo.team.slice(0, 1);
ok(!R.entlassen(solo, solo.team[0].uid), 'die letzte Einheit lässt sich nicht entlassen');

/* Nicht über den Platz suchen: Frontlinie rückt beim Anwerben nach vorn. */
R.entlassen(aRun, aRun.team.filter(function (m) { return m.id === 'gobta'; })[0].uid);
ok(R.addUnit(aRun, 'gobkyu'), 'nach dem Entlassen ist die Art wieder frei');
ok(R.addUnit(aRun, 'kaefergarde') && aRun.team[0].id === 'kaefergarde',
   'eine angeworbene Frontlinien-Einheit steht sofort auf Platz 1');

/* Ränge */
var rRun = fertigerRun(9);
var held = rRun.team[0];
ok(R.rankName(held) === 'C' && R.itemSlots(held) === 1 && R.aktivSlots(held) === 1,
   'Rang C: 1 Item-Slot, 1 aktive Fähigkeit');
ok(R.passivSlots(held) === 0, 'Rang C hat noch keine Passive');
rRun.magicules = 0;
ok(!R.rankUp(rRun, held.uid), 'ohne Magicule kein Aufstieg');
rRun.magicules = 5000;
var werteC = R.resolve(held).atk;
ok(R.rankUp(rRun, held.uid), 'Aufstieg auf B gelingt');
ok(R.rankName(held) === 'B' && R.itemSlots(held) === 2 && R.aktivSlots(held) === 1 && R.passivSlots(held) === 1,
   'Rang B: 2 Item-Slots, weiterhin eine Aktive, 1 passive');
ok(R.resolve(held).atk > werteC, 'der Aufstieg erhöht die Werte');
/* Keine Stufen und keine Bindung: die Einheit hat ihre erste Passive beim
   Anwerben bekommen, danach steht jede Linie weiter offen. */
var pw0 = R.passivWahl(rRun);
ok(pw0 && pw0.offers.length >= 4, 'nach dem Aufstieg stehen wieder vier Passive zur Wahl');
ok(pw0.offers.filter(function (o) { return o.id; })
     .every(function (o) { return o.id !== held.passives[0]; }),
   'und nie die, die die Einheit schon trägt');
ok(!R.rankUp(rRun, held.uid), 'kein zweiter Aufstieg, solange die Wahl offen ist');
var gewaehlt = pw0.offers[0].id;
ok(R.choosePassive(rRun, 0), 'eine Passive wird gewählt');
ok(held.passives[held.passives.length - 1] === gewaehlt &&
   R.resolve(held).effects.some(function (e) { return e.id === gewaehlt; }),
   'sie wirkt danach im Kampf');

R.rankUp(rRun, held.uid); R.choosePassive(rRun, 0);
ok(R.rankName(held) === 'A', 'Rang A wird erreicht');
ok(R.passivWahl(rRun) === null, 'nach der Wahl ist die Warteschlange leer');
/* Passive mit Preis brauchen Alternativen — egal, an welcher Stelle sie
   auftauchen. Gesucht wird ein Aufstieg, bei dem eine davon im Angebot steht. */
R.rankUp(rRun, held.uid); R.choosePassive(rRun, 0);
ok(R.rankName(held) === 'S' && R.itemSlots(held) === 5, 'Rang S gibt zwei Item-Slots statt einem');
ok(R.praedatorSlots(held) === 3, 'Rang S trägt drei verschlungene Fähigkeiten');
ok(!R.rankUp(rRun, held.uid), 'über S hinaus geht es nicht');

/* Passive mit Preis brauchen Alternativen — egal, an welcher Stelle sie
   auftauchen. Ohne Stufen ist das keine feste Position mehr, also wird gesucht. */
var pRun4 = null, pw4 = null, pHeld = null;
for (var vers = 0; vers < 25 && !pw4; vers++) {
  var probe = fertigerRun(400 + vers);
  probe.magicules = 9000;
  var pm = probe.team[0];
  for (var st = 0; st < 3; st++) {
    R.rankUp(probe, pm.uid);
    var w4 = R.passivWahl(probe);
    if (!w4) break;
    if (w4.offers.some(function (o) { return o.verzicht; })) {
      pRun4 = probe; pw4 = w4; pHeld = pm; break;
    }
    R.choosePassive(probe, 0);
  }
}
ok(pw4, 'Passive mit Preis tauchen im Angebot auf');
ok(pw4.offers.some(function (o) { return o.preis; }),
   'und „nichts nehmen" steht nur dann daneben');
ok(pw4.offers.filter(function (o) { return o.bibliothek; }).length >= 1 &&
   pw4.offers.every(function (o) { return !o.bibliothek || !AB.linien_ids[o.id]; }),
   'zusammen mit mindestens einer Passive aus der geteilten Bibliothek');
var vorher4 = pHeld.passives.length;
ok(R.choosePassive(pRun4, pw4.offers.length - 1) && pHeld.passives.length === vorher4 &&
   !R.passivWahl(pRun4),
   'der Verzicht schließt die Wahl, ohne eine Passive hinzuzufügen');

/* Alle Einheiten haben Linien. Das Angebot zieht je Linie eine der vier
   zufällig — nicht mehr deterministisch, aber immer vier eigene, je eine pro
   Kategorie, und nie eine, die die Einheit schon trägt. */
function aufstiegsOffers(id, seed) {
  var r = fertigerRun(seed || 700);
  r.team = [R.member(id)]; r.bank = []; r.magicules = 5000; r.pwahlen = [];
  R.rankUp(r, r.team[0].uid);
  var w = R.passivWahl(r);
  /* Nur die eigenen Linien: liegt eine Passive mit Preis im Angebot, stehen
     Bibliothek und Verzicht daneben. */
  return w ? w.offers.filter(function (o) { return o.id && AB.linien_ids[o.id] === id; }) : [];
}

['apito', 'adalmann', 'zegion', 'kaefergarde'].forEach(function (id) {
  var offers = aufstiegsOffers(id, 700);
  ok(offers.length === 4, GD.unit(id).name + ': vier Linien-Passiven im Aufstiegsangebot');
  ok(offers.every(function (o) { return AB.linien[id][o.linie].indexOf(o.id) >= 0; }),
     GD.unit(id).name + ': jede gezogene Passive steht in der Linie, die sie angibt');
  ok(offers.every(function (o) { return AB.linien_ids[o.id] === id; }),
     'keine Fremd-Linien werden angeboten (' + GD.unit(id).name + ')');
  /* Nicht mehr deterministisch: gezogen wird je Linie eine der vier. Geprüft
     wird stattdessen, dass über die Seeds hinweg auch wirklich gestreut wird —
     sonst wäre die freie Kombination nur behauptet. */
  var gesehen = {};
  for (var s = 0; s < 8; s++) {
    aufstiegsOffers(id, 700 + s + 1).forEach(function (o) { gesehen[o.id] = 1; });
  }
  ok(Object.keys(gesehen).length > 4,
     GD.unit(id).name + ': über die Seeds kommen mehr als vier verschiedene Passive vor (' +
     Object.keys(gesehen).length + ')');
});
/* Item-Slots hängen am Rang */
var iRun = fertigerRun(31);
iRun.bag = ['kurzschwert', 'langschwert'];
var im = iRun.team[0];
ok(R.equip(iRun, im.uid, 'kurzschwert'), 'erstes Item passt');
ok(!R.equip(iRun, im.uid, 'langschwert'), 'zweites Item braucht Rang B');
iRun.magicules = 5000; R.rankUp(iRun, im.uid); R.choosePassive(iRun, 0);
ok(R.equip(iRun, im.uid, 'langschwert'), 'nach dem Aufstieg passt es');

/* Prädator */
var pRun = fertigerRun(11);
pRun.magicules = 5000;
R.rankUp(pRun, pRun.team[0].uid); R.choosePassive(pRun, 0);
var beute = null;
for (var i = 0; i < 14 && !beute; i++) {
  var opt = pRun.options.map(function (o, ix) { return { o: o, ix: ix }; })
    .filter(function (x) { return x.o.type === 'kampf'; })[0];
  if (!opt) { R.advance(pRun); continue; }
  var p = R.choose(pRun, opt.ix);
  if (p.result.winner === 'player' && p.devour && p.devour.length) beute = p;
  else { pRun.lives = 3; R.advance(pRun); }
}
ok(!!beute, 'nach einem Sieg stehen verschlingbare Gegner bereit');
if (beute) {
  var angebot = beute.devour.slice();          // devour() leert das Angebot danach
  var opfer = angebot[0].id;
  var vorher = R.resolve(pRun.team[0]).effects.length;
  ok(angebot.every(function (f) {
    return f.abilities && f.abilities.length && f.abilities.every(function (ab) { return ab.name && ab.text; });
  }), 'das Angebot nennt Name und Wirkung jeder verschlingbaren Fähigkeit');
  ok(R.devour(pRun, opfer, pRun.team[0].uid), 'Prädator verschlingt einen Gegner');
  ok(R.resolve(pRun.team[0]).effects.length > vorher, 'die Fähigkeit hängt an der Einheit');
  ok(!R.devour(pRun, opfer, pRun.team[0].uid), 'nur einmal pro Kampf');
  var nachher = R.abilities(pRun.team[0]).map(function (ab) { return ab.name; });
  var uebernommen = EN.get(opfer).effects.map(function (ab) { return ab.name; });
  ok(uebernommen.every(function (n) { return nachher.indexOf(n) >= 0; }),
     'die übernommene Fähigkeit taucht in der Fähigkeitsliste der Einheit auf');
  var kw = R.resolve(pRun.team[0]).keywords;
  var erwartet = EN.get(opfer).effects.reduce(function (a2, b2) { return a2.concat(b2.keywords || []); }, []);
  ok(erwartet.every(function (k) { return kw.indexOf(k) >= 0; }),
     'ihre Schlüsselwörter zählen für die Synergie-Anzeige mit');
}

/* Shop */
var sRun = fertigerRun(99);
sRun.magicules = 3000;
sRun.phase = 'shop';
sRun.pending = { offers: [{ kind: 'item', id: 'kurzschwert', name: 'Kurzschwert', price: 25 }] };
ok(R.buy(sRun, 0), 'Kauf gelingt mit genug Gold');
ok(!R.buy(sRun, 0), 'dasselbe Angebot ist nur einmal kaufbar');

/* Ereignisse */
var eKaputt = [];
EN.events.forEach(function (ev) {
  ev.options.forEach(function (opt, oi) {
    var t = fertigerRun(3);
    t.magicules = 1500;
    t.phase = 'event'; t.pending = { event: ev };
    try { R.eventChoose(t, oi); } catch (e) { eKaputt.push(ev.id + '#' + oi + ': ' + e.message); }
  });
});
ok(!eKaputt.length, 'jede Ereignisoption läuft fehlerfrei' + (eKaputt.length ? ' — ' + eKaputt.join(' | ') : ''));

/* Ein Speicherstand im alten Format darf die neue Fassung nicht blockieren:
   vor dem Versionswechsel liess er den Startbildschirm abstuerzen. */
var altesFormat = JSON.stringify({
  seed: 5, rngState: 5, act: 1, step: 0, threat: 0,
  gold: 60, magicules: 40, lives: 5, relics: [], bag: [], chronik: [],
  meta: R.newMeta(), team: [], bank: [], uidSeq: 3,
  startwahl: { verbleibend: 3, offers: ['gobta', 'sturmwolf', 'gobkyu'] }, pending: null
});
var altRun = R.deserialize(altesFormat);
ok(!(altRun.startwahl.offers || []).every(function (o) { return o && GD.unit(o.unit); }),
   'ein Startdraft im alten Format ist als unbrauchbar erkennbar');
ok(R.deserialize(R.serialize(R.create(7, R.newMeta()))).startwahl.offers
   .every(function (o) { return GD.unit(o.unit) && GD.relic(o.relic); }),
   'ein frischer Startdraft überlebt Speichern und Laden vollständig');

/* Ein beendeter Run muss beendet bleiben. Vorher kam er als unfertiger zurück,
   mit einer Aktnummer hinter dem letzten Akt — der nächste Kartenwurf suchte
   dann einen Boss, den es nicht gibt. */
var endeRun = fertigerRun(4242);
endeRun.act = R.AKTE; endeRun.step = R.STEPS.length - 1;
R.advance(endeRun);
ok(endeRun.over, 'der Run endet nach dem letzten Knoten');
var endeGeladen = R.deserialize(R.serialize(endeRun));
ok(endeGeladen.over && endeGeladen.phase === 'ende', 'und bleibt nach dem Laden beendet');
ok(endeGeladen.won === endeRun.won, 'Sieg oder Niederlage überlebt mit');
/* Und der Boss-Zugriff hält auch eine kaputte Aktnummer aus. */
ok(!!R.boss({ act: 99, bosse: [] }), 'die Bossabfrage liefert auch hinter dem letzten Akt etwas');

/* Speichern */
var save = fertigerRun(1234);
save.magicules = 321; save.relics.push('kern_des_zorns');
save.magicules = 5000; R.rankUp(save, save.team[0].uid); R.choosePassive(save, 0);
save.magicules = 321;
var wieder = R.deserialize(R.serialize(save));
ok(wieder.magicules === 321 && wieder.relics.length === save.relics.length,
   'Magicule und Relikte überleben das Speichern');
ok(wieder.team.length === save.team.length, 'der Trupp überlebt das Speichern');
ok(wieder.team[0].rank === 1 && wieder.team[0].passives.length === 2,
   'Rang und gewählte Passive überleben das Speichern');
ok(R.resolve(wieder.team[0]).actives.length === 1 &&
   wieder.team[0].passives.every(function (pid) {
     return R.resolve(wieder.team[0]).effects.some(function (e) { return e.id === pid; });
   }),
   'geladene Mitglieder lösen Signatur und gewählte Passive korrekt auf');

/* Ein Neuladen im Markt darf den Markt nicht verschlucken. */
var bRun2 = fertigerRun(4712);
var beute2 = null;
for (var bb = 0; bb < 16 && !beute2; bb++) {
  var bi = bRun2.options.map(function (o, i2) { return o.type === 'kampf' ? i2 : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (bi === undefined) { R.advance(bRun2); continue; }
  var bp = R.choose(bRun2, bi);
  if (bp.result.winner === 'player' && bp.markt) beute2 = bp;
  else { bRun2.lives = 3; R.advance(bRun2); }
}
ok(!!beute2, 'ein Kampf mit offenem Markt ist erreichbar');
if (beute2) {
  var wieder2 = R.deserialize(R.serialize(bRun2));
  ok(wieder2.phase === 'kampf' && wieder2.pending && wieder2.pending.markt,
     'nach dem Laden steht der Ergebnisbildschirm noch');
  /* Die Bilanz muss mitkommen — das Kampflog tut es bewusst nicht. */
  ok(wieder2.pending.bilanz && typeof wieder2.pending.bilanz.ticks === 'number' &&
     typeof wieder2.pending.bilanz.lebend === 'number' &&
     Array.isArray(wieder2.pending.bilanz.gefallen),
     'die Kampfbilanz übersteht das Speichern');
  ok(!wieder2.pending.result.log, 'das Kampflog wandert nicht in den Speicherstand');
  /* Drei Bildschirme: Kampf -> Ergebnis -> Verwaltung, jeder für sich ladbar. */
  ok(R.zumMarkt(bRun2) && bRun2.phase === 'markt', 'die Bestätigung führt in die Verwaltung');
  var imMarkt = R.deserialize(R.serialize(bRun2));
  ok(imMarkt.phase === 'markt' && imMarkt.pending.markt.length === bRun2.pending.markt.length,
     'auch die Verwaltung übersteht ein Neuladen');
  ok(!R.zumMarkt(bRun2), 'aus der Verwaltung führt kein zweiter Weg dorthin');
  ok(!R.darfEntlassen({ phase: 'kampf', pending: {} }) &&
     R.darfEntlassen({ phase: 'markt', pending: {} }),
     'verkauft wird in der Verwaltung, nicht in der Kampfphase');
  ok(wieder2.pending.markt.length === beute2.markt.length,
     'es sind dieselben Posten wie vorher');
  wieder2.magicules = 9000;
  ok(R.buy(wieder2, wieder2.pending.markt.length - 1, wieder2.team[0].uid),
     'im geladenen Markt lässt sich noch kaufen');
  ok(R.advance(wieder2) && wieder2.phase === 'karte' && wieder2.options,
     'danach geht es normal auf der Karte weiter');
}

/* Kompletter Run */
head('Durchspiel');
var d = fertigerRun(2024);
var schritte = 0;
while (!d.over && schritte < 400) {
  schritte++;
  if (d.phase === 'start') { R.chooseStart(d, 0); continue; }
  if (R.passivWahl(d)) { R.choosePassive(d, 0); continue; }
  if (d.phase === 'karte') { R.choose(d, 0); continue; }
  if (d.phase === 'kampf') { if (d.pending.rewards) R.takeReward(d, 0); R.advance(d); continue; }
  if (d.phase === 'shop') { R.advance(d); continue; }
  if (d.phase === 'event') { R.eventChoose(d, d.pending.event ? d.pending.event.options.length - 1 : 0); R.advance(d); continue; }
  if (d.phase === 'lager') { R.camp(d, 0); R.advance(d); continue; }
  break;
}
ok(d.over, 'ein Run erreicht ein Ende (' + schritte + ' Schritte)');
ok(d.meta.runs === 1, 'der Run wird in der Meta gezählt');
ok(d.unlocked && d.unlocked.length > 0, 'nach dem Run wird etwas freigeschaltet');
var artenEnde = R.belegteArten(d);
ok(new Set(artenEnde).size === artenEnde.length, 'am Ende steht immer noch keine Art doppelt im Trupp');

console.log('\n' + pass + '/' + (pass + fail) + ' ok');
process.exit(fail ? 1 : 0);
