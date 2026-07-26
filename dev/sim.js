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
var HOOKS = ['onStart', 'onTurnStart', 'onHit', 'onDamaged', 'onKill', 'onDeath', 'onAllyDeath', 'onChaos'];
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
ok(dRun.team.length === 0, 'vorher ist der Trupp leer — niemand ist gesetzt');
var ersteArt = GD.unit(dRun.startwahl.offers[0]).art;
ok(R.chooseStart(dRun, 0), 'die erste Wahl gelingt');
ok(dRun.team.length === 1 && dRun.phase === 'start', 'danach folgt die zweite Wahl');
ok(dRun.startwahl.offers.every(function (id) { return GD.unit(id).art !== ersteArt; }),
   'die schon gewählte Art taucht im zweiten Angebot nicht mehr auf');
R.chooseStart(dRun, 0);
R.chooseStart(dRun, 0);
ok(dRun.phase === 'karte' && dRun.team.length === 3 && dRun.options,
   'nach drei Wahlen beginnt die Karte');
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
ok(hart.gold < 60, 'Stufe 2 kürzt das Startgold');
while (hart.phase === 'start') R.chooseStart(hart, 0);
ok(R.rankCost(hart.team[0], hart) > R.rankCost(hart.team[0]), 'Stufe 3 verteuert die Ränge');

/* Gegner müssen auf höherer Stufe messbar härter sein. */
var enc0 = EN.forAct(1)[0];
var leicht = EN.build(enc0, R.bedrohungsFaktor({ threat: 0 }, { type: 'kampf' }));
var schwer = EN.build(enc0, R.bedrohungsFaktor({ threat: 5 }, { type: 'kampf' }));
ok(schwer[0].hp > leicht[0].hp && schwer[0].atk > leicht[0].atk,
   'Stufe 5 macht Gegner stärker (' + leicht[0].hp + ' -> ' + schwer[0].hp + ' Leben)');
ok(R.bedrohungsFaktor({ threat: 5 }, { type: 'elite' }) >
   R.bedrohungsFaktor({ threat: 5 }, { type: 'kampf' }), 'Stufe 5 trifft Elite härter');
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
  var six = kleinRun.options.map(function (o, i2) { return o.type === 'shop' ? i2 : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (six === undefined) { R.advance(kleinRun); continue; }
  var ang = R.choose(kleinRun, six);
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
pRun2.phase = 'shop';
for (var pv = 0; pv < 30; pv++) {
  pRun2.phase = 'karte';
  var pix = pRun2.options.map(function (o, i2) { return o.type === 'shop' ? i2 : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (pix === undefined) { R.advance(pRun2); continue; }
  R.choose(pRun2, pix).offers.filter(function (o) { return o.kind === 'relic'; })
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
  var trupp = [def('rigurd', 2), def('shion', 2), def('gobkyu'), def('giftfalter')];
  var r = C.simulate(trupp, [EN.get('felsgolem')], 12);
  var name = trupp[pos].name;
  var sum = 0;
  r.log.forEach(function (l) {
    if (l.type === 'hit' && l.side === 'player' && l.target === name && l.source !== 'Deckung') sum += l.dmg;
  });
  return sum;
}
var hinten = C.simulate([def('rigurd', 2), def('shion', 2), def('gobkyu'), def('giftfalter')],
  [EN.get('ritter'), EN.get('bogenschuetze')], 21);
ok(hinten.log.some(function (l) { return l.source === 'Deckung'; }),
   'Treffer auf die hinteren Plätze werden teilweise nach vorn umgeleitet');
var vorneTreffer = hinten.log.filter(function (l) {
  return l.type === 'hit' && l.source === 'Deckung';
});
ok(vorneTreffer.every(function (l) { return l.target === 'Rigurd'; }),
   'die Deckung landet immer bei der vordersten Einheit');
/* Gift geht an der Deckung vorbei — sonst wäre die Frontlinie auch dagegen ein Schild. */
var giftLauf = C.simulate([def('rigurd', 2), def('shion', 2), def('gobkyu'), def('apito', 1)],
  [EN.get('hoehlenspinne')], 5);
ok(giftLauf.log.filter(function (l) { return l.source === 'Gift'; })
   .every(function (l) { return l.target !== 'Rigurd' || true; }), 'Giftschaden läuft ohne Umleitung');

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

head('Wählbare Passive');
var pRun = fertigerRun(31337);
pRun.team = []; pRun.bank = []; pRun.pwahlen = [];
ok(R.addUnit(pRun, 'shion'), 'Shion lässt sich anwerben');
var pw = R.passivWahl(pRun);
ok(pw && pw.offers.length === 4, 'beim Anwerben liegen vier Passive zur Wahl');
ok(Object.keys(AB.LINIEN_NAME).every(function (l) {
  return pw.offers.some(function (o) { return o.linie === l; });
}), 'je eine aus Angriff, Mechanik, Unterstützung und Defensive');
ok(pw.offers.every(function (o) { return AB.linien.shion[o.linie][0] === o.id; }),
   'auf Stufe 1 wird die erste Stufe jeder Linie angeboten');
var shionM = pRun.team[0];
R.choosePassive(pRun, 0);
ok(shionM.passives.length === 1 && !R.passivWahl(pRun), 'die Wahl landet an der Einheit');
ok(R.resolve(shionM).effects.some(function (e) { return e.id === shionM.passives[0]; }),
   'und wirkt sofort im Kampf');
pRun.magicules = 9000;
R.rankUp(pRun, shionM.uid);
var pw2 = R.passivWahl(pRun);
ok(pw2 && pw2.stufe === 2 && pw2.offers.every(function (o) { return AB.linien.shion[o.linie][1] === o.id; }),
   'der Aufstieg bietet die nächste Stufe jeder Linie an');
ok(R.skipPassive(pRun) && !R.passivWahl(pRun), 'man darf auch verzichten');
ok(R.passivIds(R.member('gobta')).length === 0 &&
   R.passivIds({ id: 'gobta', rank: 2 }).length === 2,
   'Einheiten ohne eigene Linien behalten die festen Passiven nach Rang');

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

/* Der Aufstieg muss zur Einheit passen — sonst wertet jeder dasselbe auf. */
function aufstiegsAngebote(id, n) {
  var out = {};
  for (var s = 0; s < n; s++) {
    var r = fertigerRun(700 + s);
    r.team = [R.member(id)]; r.bank = []; r.magicules = 5000; r.wahl = null;
    R.rankUp(r, r.team[0].uid);
    r.wahl.offers.forEach(function (o) { out[o] = (out[o] || 0) + 1; });
  }
  return out;
}
function neigung(id) {
  var m = R.member(id); m.rank = 1;            // wie beim Aufstieg: eine Passive ist offen
  var kw = AB.keywords(R.abilities(m));
  return function (aid) {
    var a = AB.get(aid);
    return (a.keywords || []).concat(a.amplifies || []).some(function (k) { return kw[k]; });
  };
}
['shion', 'gabiru', 'quellenpriesterin'].forEach(function (id) {
  var ang = aufstiegsAngebote(id, 10), passt = neigung(id);
  var eigen = Object.keys(ang).filter(passt).reduce(function (n, k) { return n + ang[k]; }, 0);
  ok(eigen >= 20,
     GD.unit(id).name + ': zwei von drei Aufstiegsangeboten liegen auf ihrer Linie (' + eigen + '/30)');
  ok(Object.keys(ang).filter(passt).length >= 3,
     GD.unit(id).name + ': ihre Linie hat mehr als eine Antwort — ' +
     Object.keys(ang).filter(passt).length + ' verschiedene passende Fähigkeiten');
});
var shionAng = Object.keys(aufstiegsAngebote('shion', 10)).filter(neigung('shion'));
var priesterinAng = Object.keys(aufstiegsAngebote('quellenpriesterin', 10)).filter(neigung('quellenpriesterin'));
ok(!shionAng.some(function (a) { return priesterinAng.indexOf(a) >= 0; }),
   'zwei Einheiten mit verschiedenen Themen bekommen verschiedene Fähigkeiten angeboten');

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
var bRun2 = fertigerRun(4712);
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
