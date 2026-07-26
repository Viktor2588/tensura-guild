/* dev/uitest.js — UI-Test in jsdom. NICHT Teil des Spiels.
   Lädt index.html samt Skripten, klickt einen Run durch und prüft, was
   tatsächlich im DOM steht.
   Aufruf:  node dev/uitest.js        (vorher einmal: npm install)            */
'use strict';
var fs = require('fs');
var path = require('path');

var JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (e) {
  console.error('jsdom fehlt — einmal "npm install" im Projektordner ausführen.');
  process.exit(1);
}

var wurzel = path.join(__dirname, '..');
/* runScripts 'outside-only' gibt uns ein funktionierendes window.eval, ohne die
   <script>-Tags der Seite selbst auszuführen — die laden wir gleich gezielt. */
var dom = new JSDOM(fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8'), {
  url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only'
});
var win = dom.window, doc = win.document;

/* jsdom kennt showModal nicht — für den Test genügt ein offenes <dialog>. */
win.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
win.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

['js/rng.js', 'js/abilities.js', 'js/data.js', 'js/combat.js', 'js/enemies.js',
 'js/run.js', 'js/ui.js'].forEach(function (f) {
  win.eval(fs.readFileSync(path.join(wurzel, f), 'utf8'));
});

var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } }
function head(s) { console.log('--- ' + s + ' ---'); }
function $(sel) { return doc.querySelector(sel); }
function $$(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)); }
function text(sel) { var e = $(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
function klick(el) { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); }
function hover(el) { el.dispatchEvent(new win.MouseEvent('mouseover', { bubbles: true })); }
function karten() { return $$('main .karte'); }

win.UI.start();
var run = win.UI.aktueller();

/* ---------------------------------------------------------------- Start */
head('Startdraft');
ok(/Wer zieht mit dir los/.test(text('main h2')), 'der Startbildschirm fragt nach den Begleitern');
ok(karten().length === 3, 'drei Einheiten stehen zur Wahl');
ok(karten().every(function (k) { return k.querySelector('.titel') && k.querySelector('.unter'); }),
   'jede Wahlkarte nennt Namen und Beschreibung');
klick(karten()[0]);
ok(run.team.length === 1 && /Wer zieht mit dir los/.test(text('main h2')), 'nach der ersten Wahl folgt die zweite');
klick(karten()[0]);
klick(karten()[0]);
ok(run.phase === 'karte' && run.team.length === 3, 'nach drei Wahlen beginnt die Karte');

/* ------------------------------------------------------------ Wegleiste */
head('Wegleiste und Aufstellung');
ok($$('#pfad .pfad-knoten').length === win.Run.STEPS.length,
   'die Wegleiste zeigt jeden Knoten des Akts');
ok($$('#pfad .pfad-knoten.jetzt').length === 1, 'genau ein Knoten ist als aktueller markiert');
ok(!!$('#pfad .pfad-knoten.boss') && !!$('#pfad .pfad-boss'),
   'der Boss am Ende des Akts ist sichtbar, bevor man dort ankommt');

/* Aufstellung: zwei Klicks tauschen zwei Plätze. */
var vorherOrder = run.team.map(function (m) { return m.uid; });
var plaetze = $$('.aufstellung .platz');
ok(plaetze.length === run.team.length, 'jede Einheit hat einen Platzknopf');
klick(plaetze[0]);
ok($$('.aufstellung .platz.gewaehlt').length === 1, 'der erste Klick wählt aus');
klick($$('.aufstellung .platz')[2]);
var nachherOrder = run.team.map(function (m) { return m.uid; });
ok(nachherOrder[0] === vorherOrder[2] && nachherOrder[2] === vorherOrder[0],
   'der zweite Klick tauscht die beiden Plätze');

/* Debug-Übersicht: aus, bis man sie einschaltet — dann eine Tabelle je Einheit. */
ok(!$('.debugbox'), 'die Debug-Übersicht ist standardmäßig aus');
klick($('.dbg-schalter'));
ok($$('.debugbox table.dbg').length === run.team.length,
   'eingeschaltet zeigt sie für jede Einheit eine Tabelle');
ok($$('.debugbox table.dbg')[0].rows.length === 5,
   'jede Tabelle hat Kopf plus Basis, Rang, Ausrüstung und Kampf');
klick($('.dbg-schalter'));
ok(!$('.debugbox'), 'ein zweiter Klick schaltet sie wieder aus');

ok(!$('.aufstellung .platz.gewaehlt'), 'nach dem Tausch ist nichts mehr ausgewählt');

/* ----------------------------------------------------------------- HUD */
head('Kopfzeile und Trupp');
ok($('#hud-gold').textContent === String(run.gold), 'Gold steht in der Kopfzeile');
ok($('#hud-mag').textContent === String(run.magicules), 'Magicule stehen in der Kopfzeile');
ok($$('.einheit').length === 3, 'der Trupp zeigt drei Einheitenkarten');
ok($$('.einheit .rang').length === 3, 'jede Karte trägt ein Rangabzeichen');
ok($$('.einheit .rar').length === 0, 'Einheiten zeigen keine Raritätsstufe');
ok($$('.einheit .fk.aktiv').length === 3, 'jede Einheit zeigt genau ihre Signatur');

/* ------------------------------------------------------------ Tooltips */
head('Tooltips');
var proben = [
  ['.einheit .tag', 'Art'],
  ['.einheit .fk.aktiv', 'Fähigkeit'],
  ['.einheit .rang', 'Rang'],
  ['.chip.leer', 'Slot-Anzeige'],
  ['main .karte', 'Kartenknoten']
];
proben.forEach(function (p) {
  var el = $(p[0]);
  if (!el) { ok(false, p[1] + ': Element fehlt'); return; }
  hover(el);
  var box = $('.tooltip');
  ok(box && box.style.display === 'block' && box.querySelector('b').textContent &&
     box.querySelector('span').textContent.length > 15, p[1] + ' hat einen Tooltip mit Text');
});
/* Schlüsselwörter und Fähigkeitsart müssen im Tooltip farbig herausstechen. */
hover($('.einheit .fk.aktiv'));
var tipHtml = $('.tooltip').lastChild.innerHTML;
ok(/<em class="(typ-signatur|typ-aktiv)"/.test(tipHtml),
   'der Tooltip färbt die Fähigkeitsart');
ok(/<em class="rar-text-[1-5]"/.test(tipHtml), 'der Tooltip färbt die Raritätsstufe');
ok(tipHtml.indexOf('<script') < 0 && $('.tooltip').lastChild.textContent.length > 15,
   'der Tooltip bleibt escapt und behält seinen Text');
var kwGefunden = 0;
$$('[data-tip-text]').forEach(function (el) {
  hover(el);
  if (/<em class="kw-/.test($('.tooltip').lastChild.innerHTML)) kwGefunden++;
});
ok(kwGefunden >= 3, 'Schlüsselwörter wie Gift oder Schild sind gefärbt (' + kwGefunden + ' Tooltips)');

hover(doc.body);
ok($('.tooltip').style.display === 'none', 'der Tooltip verschwindet wieder');

/* -------------------------------------------------------------- Kampf */
head('Kampf');
var kampfIndex = -1;
for (var versuch = 0; versuch < 20 && kampfIndex < 0; versuch++) {
  kampfIndex = run.options.map(function (o, i) { return o.type === 'kampf' ? i : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (kampfIndex === undefined) kampfIndex = -1;
  if (kampfIndex < 0) { win.Run.advance(run); win.UI.render(); }
}
ok(kampfIndex >= 0, 'ein Kampfknoten ist erreichbar');
klick(karten()[kampfIndex]);
ok($('#kampffeld') && $$('#kampffeld .kaempfer').length >= 4, 'das Kampffeld zeigt beide Seiten');
ok($('[data-a=ueberspringen]'), 'der Kampf lässt sich überspringen');
klick($('[data-a=ueberspringen]'));
ok($$('#kampflog div').length > 5, 'das Kampflog ist gefüllt');
ok($$('#kampflog .aktiv').length > 0, 'aktive Fähigkeiten stehen hervorgehoben im Log');

var sieg = run.pending.result.winner === 'player';
if (sieg) {
  ok(/Sieg/.test(text('main p')), 'ein Sieg wird gemeldet');
  var belohnungen = karten().filter(function (k) { return k.dataset.a === 'belohnung'; });
  ok(belohnungen.length >= 3, 'es gibt mindestens drei Belohnungen zur Wahl');
  ok(belohnungen.every(function (k) { return k.querySelector('.art'); }),
     'jede Belohnung ist als Gefolge/Relikt/Ausrüstung/Vorräte gekennzeichnet');
  var vorher = run.team.length + (run.bag || []).length + run.relics.length;
  klick(belohnungen[belohnungen.length - 1]);          // Vorräte sind immer nehmbar
  ok(run.gold > 0, 'die Belohnung wird gutgeschrieben');
  ok($('[data-a=weiter]'), 'danach geht es weiter');
  klick($('[data-a=weiter]'));
  ok(run.phase === 'karte', 'nach dem Kampf steht wieder die Karte');
} else {
  ok(/Niederlage/.test(text('main p')), 'eine Niederlage wird gemeldet');
  klick($('[data-a=weiter]'));
  ok(run.phase === 'karte', 'nach der Niederlage steht wieder die Karte');
}

/* -------------------------------------------------------- Rangaufstieg */
head('Rangaufstieg');
run.magicules = 5000;
win.UI.render();
var aufstieg = $('[data-a=aufstieg]');
ok(aufstieg && !aufstieg.disabled, 'der Aufstiegsknopf ist mit genug Magicule aktiv');
klick(aufstieg);
ok($('#wahl .karte'), 'nach dem Aufstieg stehen Fähigkeiten zur Wahl');
ok($$('#wahl .karte').length === 3, 'genau drei Angebote');
ok($('[data-a=wahl-skip]'), 'der Slot lässt sich auch frei lassen');
klick($('#wahl .karte'));
ok(!run.wahl && $$('.einheit')[0].querySelectorAll('.fk.aktiv').length === 2,
   'die gewählte Fähigkeit steht auf der Karte');
ok($$('.einheit')[0].querySelector('.fk.passiv'), 'die erste Passive ist freigeschaltet');

/* --------------------------------------------------------------- Shop */
head('Händler');
run.gold = 800;
var shopIndex = -1;
for (var v2 = 0; v2 < 20 && shopIndex < 0; v2++) {
  run.phase = 'karte'; run.pending = null;
  shopIndex = run.options.map(function (o, i) { return o.type === 'shop' ? i : -1; })
    .filter(function (x) { return x >= 0; })[0];
  if (shopIndex === undefined) shopIndex = -1;
  if (shopIndex < 0) { win.Run.advance(run); }
  win.UI.render();
}
ok(shopIndex >= 0, 'ein Händler ist erreichbar');
klick(karten()[shopIndex]);
ok(/Händler/.test(text('main h2')), 'der Laden öffnet');
var angebote = karten().filter(function (k) { return k.dataset.a === 'kaufen'; });
ok(angebote.length >= 5, 'der Laden zeigt mehrere Angebote');
ok(angebote.some(function (k) { return /Namensweihe/.test(k.textContent); }),
   'die Namensweihe wird als Goldsenke angeboten');
ok($('#rang-ziel'), 'für die Namensweihe ist ein Ziel wählbar');
var goldVorher = run.gold;
klick(angebote[0]);
ok(run.gold < goldVorher, 'ein Kauf zieht Gold ab');

/* -------------------------------------------------------------- Menü */
head('Menü und Glossar');
klick($('#btn-menu'));
ok($$('#menu-glossar dt').length >= 40, 'das Glossar listet alle Begriffe');
ok($$('#menu-glossar h4').length >= 5, 'das Glossar ist in Abschnitte geteilt');
ok($('#menu-chronik').children.length > 0, 'die Chronik protokolliert den Run');

/* ------------------------------------------------------ Speicherstand */
head('Speicherstand');
ok(win.localStorage.getItem('tensura-guild-v2'), 'der Run wird gespeichert');
var gespeichert = JSON.parse(win.localStorage.getItem('tensura-guild-v2'));
ok(gespeichert.team.length === run.team.length, 'der Trupp steckt im Speicherstand');
ok(gespeichert.team[0].rank === run.team[0].rank, 'der Rang überlebt das Speichern');

/* Wählbare Passive: vier Karten, eine je Linie. Shion wird angeworben, damit
   der Fall auch dann greift, wenn der Startdraft sie nicht angeboten hat. */
head('Wählbare Passive');
if (win.Run.freieArt(run, 'oger')) win.Run.addUnit(run, 'shion');
else { win.Run.entlassen(run, run.team.filter(function (m) {
  return win.GameData.unit(m.id).art === 'oger'; })[0].uid);
  win.Run.addUnit(run, 'shion'); }
win.UI.render();
var pkarten = $$('#wahl .karte');
ok(pkarten.length === 4, 'beim Anwerben stehen vier Passive zur Wahl');
ok(pkarten.every(function (k) { return k.querySelector('.linie'); }),
   'jede Karte nennt ihre Linie');
var shionM = run.team.filter(function (m) { return m.id === 'shion'; })[0];
klick(pkarten[0]);
ok(shionM.passives.length === 1 && !$('#wahl .karte'),
   'der Klick wählt die Passive und schließt die Wahl');

console.log('\n' + pass + '/' + (pass + fail) + ' ok');
process.exit(fail ? 1 : 0);
