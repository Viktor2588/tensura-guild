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
function mit(id, rank) { var m = R.member(id); m.rank = rank || 0; return m; }
/* Der Run beginnt im Draft — für Tests, die die Karte brauchen, durchziehen. */
function fertigerRun(seed, meta) {
  var r = R.create(seed, meta || R.newMeta());
  while (r.phase === 'start') R.chooseStart(r, 0);
  return r;
}
function def(id, rank) { return R.resolve(mit(id, rank)); }

/* ---------------------------------------------------------------- Daten */
head('Daten');
ok(GD.units.length >= 40, GD.units.length + ' Einheiten');
ok(EN.all.length >= 30, EN.all.length + ' Gegner');
ok(GD.relics.length >= 30, GD.relics.length + ' Relikte');
ok(AB.signatures.length === GD.units.length, 'genau eine Signatur je Einheit (' + AB.signatures.length + ')');
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
var HOOKS = ['onStart', 'onTurnStart', 'onHit', 'onDamaged', 'onKill', 'onDeath', 'onAllyDeath'];
ok(AB.passives.every(function (p) { return HOOKS.indexOf(p.hook) >= 0; }), 'jede Passive hängt an einem bekannten Hook');
ok(AB.pool.concat(AB.signatures).every(function (a) { return a.cd >= 1 && a.cd <= 6; }), 'Abklingzeiten liegen zwischen 1 und 6');
ok(AB.alle.every(function (a) { return a.id && a.name && a.text && typeof a.fn === 'function'; }),
   'jede Fähigkeit hat id, Name, Text und fn');
ok(EN.encounters.concat(EN.bosses).every(function (e) {
  return e.units.every(function (id) { return !!EN.get(id); });
}), 'jede Begegnung referenziert existierende Gegner');

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
ok(AB.pool.concat(AB.passives).every(function (a) { return STUFEN.indexOf(a.rarity) >= 0; }),
   'jede Pool-Fähigkeit und Passive hat eine Stufe 1–5');
ok(GD.units.every(function (u) {
  var sig = AB.get(u.signature);
  return sig.rarity === u.rarity && STUFEN.indexOf(sig.rarity) >= 0;
}), 'jede Signatur erbt die Stufe ihrer Einheit');
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
var shop = null;
for (var sv = 0; sv < 12 && !shop; sv++) {
  var ix = rRun2.options.map(function (o, i2) { return o.type === 'shop' ? i2 : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (ix === undefined) { R.advance(rRun2); continue; }
  shop = R.choose(rRun2, ix);
}
ok(shop && shop.offers.filter(function (o) { return o.kind !== 'rang'; })
   .every(function (o) { return STUFEN.indexOf(o.rarity) >= 0; }),
   'jedes Shop-Angebot mit Gegenstand trägt seine Stufe');
ok(shop && shop.offers.some(function (o) { return o.kind === 'rang'; }),
   'der Laden bietet auch einen Rang gegen Gold an');

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
ok(dRun.startwahl.offers.length === 3, 'drei Einheiten stehen zur Wahl');
ok(dRun.team.length === 1, 'vorher ist nur Rimuru im Trupp');
var ersteArt = GD.unit(dRun.startwahl.offers[0]).art;
ok(R.chooseStart(dRun, 0), 'die erste Wahl gelingt');
ok(dRun.team.length === 2 && dRun.phase === 'start', 'danach folgt die zweite Wahl');
ok(dRun.startwahl.offers.every(function (id) { return GD.unit(id).art !== ersteArt; }),
   'die schon gewählte Art taucht im zweiten Angebot nicht mehr auf');
R.chooseStart(dRun, 0);
ok(dRun.phase === 'karte' && dRun.team.length === 3 && dRun.options,
   'nach zwei Wahlen beginnt die Karte');
var dGeladen = R.deserialize(R.serialize(R.create(321, R.newMeta())));
ok(dGeladen.phase === 'start' && dGeladen.startwahl, 'ein Speicherstand mitten im Draft bleibt im Draft');

head('Gold gegen Magicule');
var kRun = fertigerRun(88);
kRun.gold = 1000; kRun.magicules = 0;
kRun.phase = 'shop';
kRun.pending = { offers: R.relicPool(kRun).length ? [{ kind: 'rang', name: 'Namensweihe', price: 130 }] : [] };
var vorRang = kRun.team[1].rank;
ok(R.buy(kRun, 0, kRun.team[1].uid), 'die Namensweihe ist mit Gold bezahlbar');
ok(kRun.team[1].rank === vorRang + 1, 'sie hebt genau die gewählte Einheit einen Rang');
ok(kRun.magicules === 0, 'und kostet dabei keine Magicule');
ok(kRun.wahl && kRun.wahl.uid === kRun.team[1].uid, 'auch dabei wird eine neue Fähigkeit gewählt');
R.skipActive(kRun);

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
var frueh = ['apito', 'giftfalter', 'diablo', 'benimaru', 'schattenwolf', 'testarossa'];
ok(frueh.every(function (id) {
  var erste = AB.get(GD.unit(id).passives[0]);
  return (erste.amplifies || []).length > 0;
}), 'thematische Einheiten schalten ihren Verstärker schon auf Rang B frei');

/* Bosse widerstehen Erstarrung — sonst gewinnt Frost jeden Einzelkampf. */
var frostTeam = [def('schattenwolf', 3)];
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
ok(trefferNormal > trefferBoss, 'gegen normale Gegner greift Frost deutlich öfter (' +
   trefferNormal + ' zu ' + trefferBoss + ')');

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
  var r = C.simulate([R.resolve(t), R.resolve(m)], [EN.get('ritter'), EN.get('bogenschuetze')], seed);
  var sum = 0;
  r.log.forEach(function (l) { if (l.type === 'heal' && l.side === 'player') sum += l.amount; });
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
var jd = R.resolve(jaeger);
ok(jd.effects.some(function (e) { return e.hook === 'onKill'; }), 'Blutrausch hängt am onKill-Hook');
var vorAtk = C.simulate([jd], EN.build(EN.forAct(1)[0]), 2).roster[0].atk;
var mitKills = C.simulate([jd], EN.build(EN.forAct(1)[0]), 2);
var toteGegner = mitKills.log.filter(function (l) { return l.type === 'death' && l.side === 'enemy'; }).length;
ok(toteGegner === 0 || vorAtk > 0, 'Kämpfe mit Blutrausch laufen fehlerfrei');

/* ------------------------------------------------------------- Kampf */
head('Kampf');
var team = ['rimuru', 'gobta', 'skelettritter'].map(function (id) { return def(id); });
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
ok(aktive.every(function (l) { return l.name === 'Wasserklinge'; }), 'auf Rang C nur die Signatur');

/* Abklingzeit: bei cd 3 darf höchstens gut jeder dritte Zug ein Einsatz sein.
   Messbar an der Quelle der Treffer — Signaturname gegen Einheitenname. */
var quellen = {};
res.log.filter(function (l) { return l.type === 'hit' && l.side === 'enemy'; })
  .forEach(function (l) { quellen[l.source] = (quellen[l.source] || 0) + 1; });
var einsaetze = quellen['Wasserklinge'] || 0, normal = quellen['Rimuru'] || 0;
ok(normal > 0 && einsaetze / (einsaetze + normal) < 0.45,
   'die Abklingzeit bremst den Einsatz (' + einsaetze + ' Fähigkeit / ' + normal + ' normal)');

var m4 = mit('rimuru', 3);
m4.actives = ['wuchtschlag', 'heilwelle', 'giftstoss'];
var d4 = R.resolve(m4);
ok(d4.actives.length === 4, 'Rang S trägt vier aktive Fähigkeiten');
var res4 = C.simulate([d4, def('gabiru')], [EN.get('felsgolem')], 3);
var namen4 = {};
res4.log.filter(function (l) { return l.type === 'aktiv' && l.key === 'p0'; })
  .forEach(function (l) { namen4[l.name] = 1; });
ok(Object.keys(namen4).length >= 3, 'mehrere Fähigkeiten wechseln sich ab (' + Object.keys(namen4).join(', ') + ')');

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
ok(tritt_auf('giftfalter', 0, function (l) { return l.status === 'gift'; }), 'Gift wird angelegt');
ok(tritt_auf('giftfalter', 0, function (l) { return l.source === 'Gift'; }), 'Gift tickt und macht Schaden');
ok(tritt_auf('benimaru', 0, function (l) { return l.status === 'brand'; }), 'Brand wird angelegt');
ok(tritt_auf('schattenwolf', 0, function (l) { return l.type === 'skip'; }), 'Erstarrung lässt einen Zug aussetzen');
ok(tritt_auf('diablo', 0, function (l) { return l.status === 'verderbnis'; }), 'Verderbnis wird angelegt');
ok(tritt_auf('rigurd', 0, function (l) { return l.type === 'schild'; }), 'Schild fängt Schaden ab');
ok(tritt_auf('quellenpriesterin', 0, function (l) { return l.source === 'Regeneration'; }), 'Regeneration heilt');
ok(tritt_auf('skelettritter', 2, function (l) { return l.type === 'revive'; }, 'milim_boss'),
   'Wiederkehr belebt wieder');   // beim Skelettritter die zweite Passive

var gifted = C.simulate([def('apito', 3)], [EN.get('felsgolem')], 4);
var maxGift = 0;
gifted.log.forEach(function (l) { if (l.status === 'gift' && l.stacks > maxGift) maxGift = l.stacks; });
ok(maxGift <= C.STATUS_CAP.gift, 'Gift überschreitet die Obergrenze nicht (' + maxGift + ')');

/* ------------------------------------------------- Fähigkeits-Synergien */
head('Fähigkeits-Synergien');
var giftTeam = [mit('apito', 2), mit('giftfalter', 2)].map(R.abilities)
  .reduce(function (a, b) { return a.concat(b); }, []);
var kw = AB.keywords(giftTeam);
ok(kw.gift && kw.gift.quellen >= 2, 'Gift-Team hat mehrere Gift-Quellen');
ok(kw.gift && kw.gift.verstaerker >= 1, 'und mindestens einen Verstärker (Giftzahn)');

/* Der Verstärker muss messbar etwas bringen. */
function schaden(effects, seed) {
  var d = R.resolve(mit('apito', 1));
  d.effects = effects;
  var r = C.simulate([d], [EN.get('felsgolem')], seed);
  var sum = 0;
  r.log.forEach(function (l) { if (l.type === 'hit' && l.side === 'enemy') sum += l.dmg; });
  return sum;
}
var ohne = 0, mitV = 0;
for (var sd = 0; sd < 25; sd++) {
  ohne += schaden([AB.get('giftbrut')], sd);
  mitV += schaden([AB.get('giftbrut'), AB.get('giftzahn')], sd);
}
ok(mitV > ohne, 'Giftzahn erhöht den Schaden messbar (' + ohne + ' -> ' + mitV + ')');

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
var giftTrupp = [R.resolve(mit('apito', 1)), R.resolve(mit('giftfalter', 1))];
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

/* ------------------------------------------------------------- Run */
head('Run');
var run = fertigerRun(777);
ok(run.team[0].id === 'rimuru', 'Run startet mit Rimuru');
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
R.entlassen(aRun, aRun.team[1].uid);
ok(R.addUnit(aRun, 'gobkyu'), 'nach dem Entlassen ist die Art wieder frei');

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
ok(R.rankName(held) === 'B' && R.itemSlots(held) === 2 && R.aktivSlots(held) === 2 && R.passivSlots(held) === 1,
   'Rang B: 2 Item-Slots, 2 aktive, 1 passive');
ok(R.resolve(held).atk > werteC, 'der Aufstieg erhöht die Werte');
ok(rRun.wahl && rRun.wahl.offers.length === 3, 'nach dem Aufstieg stehen drei aktive Fähigkeiten zur Wahl');
ok(!R.rankUp(rRun, held.uid), 'kein zweiter Aufstieg, solange die Wahl offen ist');
var gewaehlt = rRun.wahl.offers[0];
ok(R.chooseActive(rRun, 0), 'eine Fähigkeit wird gewählt');
ok(held.actives[0] === gewaehlt && R.resolve(held).actives.length === 2, 'sie liegt danach im zweiten Slot');

R.rankUp(rRun, held.uid); R.skipActive(rRun);
ok(R.rankName(held) === 'A' && R.resolve(held).effects.length >= 2, 'Rang A schaltet die zweite Passive frei');
ok(rRun.wahl === null, 'ein Slot darf auch frei bleiben');
R.rankUp(rRun, held.uid); R.skipActive(rRun);
ok(R.rankName(held) === 'S' && R.itemSlots(held) === 5, 'Rang S gibt zwei Item-Slots statt einem');
ok(R.praedatorSlots(held) === 3, 'Rang S trägt drei verschlungene Fähigkeiten');
ok(!R.rankUp(rRun, held.uid), 'über S hinaus geht es nicht');

/* Item-Slots hängen am Rang */
var iRun = fertigerRun(31);
iRun.bag = ['kurzschwert', 'langschwert'];
var im = iRun.team[0];
ok(R.equip(iRun, im.uid, 'kurzschwert'), 'erstes Item passt');
ok(!R.equip(iRun, im.uid, 'langschwert'), 'zweites Item braucht Rang B');
iRun.magicules = 5000; R.rankUp(iRun, im.uid); R.skipActive(iRun);
ok(R.equip(iRun, im.uid, 'langschwert'), 'nach dem Aufstieg passt es');

/* Prädator */
var pRun = fertigerRun(11);
pRun.magicules = 5000;
R.rankUp(pRun, pRun.team[0].uid); R.skipActive(pRun);
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
sRun.gold = 1000;
sRun.phase = 'shop';
sRun.pending = { offers: [{ kind: 'item', id: 'kurzschwert', name: 'Kurzschwert', price: 25 }] };
ok(R.buy(sRun, 0), 'Kauf gelingt mit genug Gold');
ok(!R.buy(sRun, 0), 'dasselbe Angebot ist nur einmal kaufbar');

/* Ereignisse */
var eKaputt = [];
EN.events.forEach(function (ev) {
  ev.options.forEach(function (opt, oi) {
    var t = fertigerRun(3);
    t.gold = 500; t.magicules = 500;
    t.phase = 'event'; t.pending = { event: ev };
    try { R.eventChoose(t, oi); } catch (e) { eKaputt.push(ev.id + '#' + oi + ': ' + e.message); }
  });
});
ok(!eKaputt.length, 'jede Ereignisoption läuft fehlerfrei' + (eKaputt.length ? ' — ' + eKaputt.join(' | ') : ''));

/* Speichern */
var save = fertigerRun(1234);
save.gold = 321; save.magicules = 77; save.relics.push('kern_des_zorns');
save.magicules = 5000; R.rankUp(save, save.team[0].uid); R.chooseActive(save, 0);
save.gold = 321;
var wieder = R.deserialize(R.serialize(save));
ok(wieder.gold === 321 && wieder.relics.length === 1, 'Gold und Relikte überleben das Speichern');
ok(wieder.team.length === save.team.length, 'der Trupp überlebt das Speichern');
ok(wieder.team[0].rank === 1 && wieder.team[0].actives.length === 1, 'Rang und gewählte Fähigkeit überleben');
ok(R.resolve(wieder.team[0]).actives.length === 2, 'geladene Mitglieder lösen ihre Fähigkeiten korrekt auf');

/* Ein Neuladen im Belohnungsbildschirm darf die Belohnung nicht verschlucken. */
var bRun2 = fertigerRun(4711);
var beute2 = null;
for (var bb = 0; bb < 16 && !beute2; bb++) {
  var bi = bRun2.options.map(function (o, i2) { return o.type === 'kampf' ? i2 : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (bi === undefined) { R.advance(bRun2); continue; }
  var bp = R.choose(bRun2, bi);
  if (bp.result.winner === 'player' && bp.rewards) beute2 = bp;
  else { bRun2.lives = 3; R.advance(bRun2); }
}
ok(!!beute2, 'ein Kampf mit offener Belohnung ist erreichbar');
if (beute2) {
  var wieder2 = R.deserialize(R.serialize(bRun2));
  ok(wieder2.phase === 'kampf' && wieder2.pending && wieder2.pending.rewards,
     'nach dem Laden steht die Belohnung noch zur Wahl');
  ok(wieder2.pending.rewards.length === beute2.rewards.length,
     'es sind dieselben Belohnungen wie vorher');
  ok(R.takeReward(wieder2, wieder2.pending.rewards.length - 1),
     'die Belohnung lässt sich nach dem Laden noch nehmen');
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
  if (d.wahl) { R.chooseActive(d, 0); continue; }
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
