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

/* Fester Seed: der Run zieht seinen Startwert aus Math.random. Ohne das ist
   jeder Testlauf ein anderer, und ein Fehlschlag lässt sich nicht nachstellen —
   genau so ist einer durchgerutscht und beim nächsten Lauf verschwunden. */
win.Math.random = (function (z) {
  return function () { z = (z * 1103515245 + 12345) % 2147483648; return z / 2147483648; };
})(20260726);

/* jsdom kennt showModal nicht — für den Test genügt ein offenes <dialog>. */
win.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
win.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

/* three.js fehlt hier bewusst: jsdom hat kein WebGL, `Brett3D.verfuegbar()`
   sagt deshalb nein, und geprüft wird die SVG-Lagekarte — die Rückfallebene,
   die es genau für diesen Fall gibt. */
['js/rng.js', 'js/hex.js', 'js/brett3d.js', 'js/abilities.js', 'js/data.js', 'js/combat.js', 'js/enemies.js',
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
ok(/Womit fängst du an/.test(text('main h2')), 'der Startbildschirm fragt nach dem Anfang');
ok(karten().length === 4, 'vier Anfänge stehen zur Wahl');
ok(karten().every(function (k) { return k.querySelector('.titel') && k.querySelector('.kw-leiste'); }),
   'jede Wahlkarte nennt Namen und Tags');
ok(karten().every(function (k) { return k.querySelectorAll('.kw-tag').length >= 4; }),
   'die Infos stecken in einzelnen Tags statt in einer Textwand');
/* Einheit und Relikt müssen als getrennte Blöcke erkennbar sein. */
ok(karten().every(function (k) {
  return k.querySelector('.teil-einheit') && k.querySelector('.teil-relikt');
}), 'jede Karte trennt Einheit und Relikt in eigene Blöcke');
ok(karten().every(function (k) {
  var h = Array.prototype.map.call(k.querySelectorAll('.herkunft'), function (e) { return e.textContent; });
  return h[0] === 'Einheit' && h[1] === 'Relikt';
}), 'jeder Block sagt, woher sein Effekt kommt');
ok(karten().every(function (k) {
  return k.querySelector('.teil-einheit .unter') && k.querySelector('.teil-relikt .unter');
}), 'jeder Block trägt seine eigene Wirkungsbeschreibung');
klick(karten()[0]);
ok(run.phase === 'karte' && run.team.length === 1 && run.relics.length === 1,
   'nach der Wahl steht eine Einheit mit einem Relikt auf der Karte');

/* Der Run startet mit einer Einheit — für Aufstellung und Trupp-Panel braucht
   der Test drei. */
['gobta', 'sturmwolf', 'gruftwaechter', 'zegion'].forEach(function (id) {
  if (run.team.length < 3) win.Run.addUnit(run, id);
});
while (win.Run.passivWahl(run)) win.Run.choosePassive(run, 0);
win.UI.render();

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
ok(!$('#hud-gold'), 'Gold gibt es nicht mehr in der Kopfzeile');
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
/* Einheitenspezifisches trägt keine Stufe mehr — die Farbe muss aber weiter
   funktionieren, also am Relikt geprüft. */
hover($('#reliktliste .chip') || $('.einheit .fk.passiv') || $('.einheit .fk.aktiv'));
ok(!/Abklingzeit/.test($('.tooltip').lastChild.textContent),
   'der Tooltip nennt keine Abklingzeit mehr');
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
/* Die Aufstellung ist seit dem Hexfeld eine echte Regel — sie muss sichtbar
   sein, sonst wundert man sich nur, warum der Nahkämpfer erst nichts tut. */
ok($('#kampfbrett svg.brett'), 'die Lagekarte zeigt das Schlachtfeld');
ok($$('#kampfbrett .feld-einheit').length >= 4, 'mit einem Punkt je Einheit');
ok($$('#kampfbrett .feld-einheit.player').length > 0 &&
   $$('#kampfbrett .feld-einheit.enemy').length > 0, 'und beide Seiten unterscheidbar');
ok($('[data-a=ueberspringen]'), 'der Kampf lässt sich überspringen');
klick($('[data-a=ueberspringen]'));
/* Nicht an einer Zeilenzahl festmachen — die hängt daran, wie lang der Kampf
   dauert, und der wiederum am Startdraft. Geprüft wird, was das Log leisten
   muss: Treffer zeigen und das Ende benennen. */
var logText = text('#kampflog');
ok($$('#kampflog div').length > 0 && /\d/.test(logText),
   'das Kampflog ist gefüllt (' + $$('#kampflog div').length + ' Zeilen)');
ok($$('#kampflog .aktiv').length > 0, 'aktive Fähigkeiten stehen hervorgehoben im Log');

var sieg = run.pending.result.winner === 'player';
if (sieg) {
  /* Bildschirm 2: das Ergebnis für sich, ohne Verwaltung darunter. */
  ok(/Sieg/.test(text('.ergebnis h2')), 'ein Sieg wird als eigene Ansage gemeldet');
  ok(/✦/.test(text('.ergebnis .beute')), 'die gewonnenen Magicule stehen gross da');
  ok(run.magicules > 0, 'die Beute wird als Magicule gutgeschrieben');
  ok(!$('#team').innerHTML, 'die Verwaltung ist auf dem Ergebnisbildschirm noch weg');
  ok(!karten().some(function (k) { return k.dataset.a === 'kaufen'; }),
     'und der Markt auch');
  /* Bildschirm 3: nach der Bestätigung die Verwaltung. */
  ok($('[data-a=zum-markt]'), 'ein Knopf führt zur Verwaltung');
  klick($('[data-a=zum-markt]'));
  ok(run.phase === 'markt', 'danach steht die Verwaltung');
  ok($$('#team .einheit').length > 0, 'mit dem Trupp darunter');
  /* Die Namensweihe nennt ihr ausgelostes Ziel und braucht keine Auswahl mehr. */
  ok(!$('#rang-ziel'), 'für die Namensweihe gibt es keinen Zielwähler mehr');
  var weiheKarte = karten().filter(function (k) { return /Namensweihe/.test(k.textContent); })[0];
  if (weiheKarte) {
    ok(/Namensweihe: \w/.test(weiheKarte.querySelector('.titel').textContent),
       'sie nennt die ausgeloste Einheit im Titel');
    ok(/Rang/.test(weiheKarte.querySelector('.beschreibung').textContent),
       'und den Rangsprung in der Beschreibung');
  }
  var posten = karten().filter(function (k) { return k.dataset.a === 'kaufen'; });
  ok(posten.length >= 3, 'der Markt bietet mindestens drei Posten (' + posten.length + ')');
  ok(posten.every(function (k) { return k.querySelector('.art') && k.querySelector('.beschreibung'); }),
     'jeder Posten ist gekennzeichnet und ausführlich beschrieben');
  ok(posten.every(function (k) { return /✦/.test(k.querySelector('.titel').textContent); }),
     'jeder Posten nennt seinen Preis in Magicule');
  ok(!!$('#verkauf'), 'es gibt eine Verkaufsfläche');
  ok($$('[data-verkauf]').length > 0, 'und ziehbare Gegenstände dafür');

  /* Kaufen: genug Magicule geben, dann den ersten bezahlbaren Posten nehmen. */
  run.magicules = 9000; win.UI.render();
  var kaufbar = karten().filter(function (k) { return k.dataset.a === 'kaufen' && !k.disabled; });
  if (kaufbar.length) {
    var magVor = run.magicules;
    klick(kaufbar[0]);
    ok(run.magicules < magVor, 'ein Kauf zieht Magicule ab');
  } else { ok(false, 'kein Posten war kaufbar'); }
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
/* Eine offene Passiv-Wahl blockiert den Aufstieg — erst abräumen. */
while (win.Run.passivWahl(run)) win.Run.choosePassive(run, 0);
win.UI.render();
var aufstieg = $('[data-a=aufstieg]');
ok(aufstieg && !aufstieg.disabled, 'der Aufstiegsknopf ist mit genug Magicule aktiv');
klick(aufstieg);
ok($('#wahl .karte'), 'nach dem Aufstieg stehen Passive zur Wahl');
/* Keine Stufen, keine Bindung: je eine Passive aus jeder der vier Linien. */
ok($$('#wahl .karte').length >= 4 && $$('#wahl .linie').length >= 4,
   'vier Angebote, jedes mit seiner Linie beschriftet');
ok(text('#wahl .hinweis').indexOf('Quote') >= 0 ||
   text('#wahl .hinweis').indexOf('Preis') >= 0,
   'und die Box erklärt, dass frei gezogen wird');
ok(!$('[data-a=pwahl-skip]'), 'es gibt keinen Weg, die Passive auszulassen');
var vorherPassive = $$('.einheit')[0].querySelectorAll('.fk.passiv').length;
klick($('#wahl .karte'));
ok(!win.Run.passivWahl(run) &&
   $$('.einheit')[0].querySelectorAll('.fk.passiv').length === vorherPassive + 1,
   'die gewählte Passive steht auf der Karte');
ok($$('.einheit')[0].querySelectorAll('.fk.aktiv').length === 1,
   'die Einheit hat weiterhin genau eine Aktive');
ok($$('.einheit')[0].querySelector('.fk.passiv'), 'die erste Passive ist freigeschaltet');

/* ------------------------------------------------------------- Markt */
head('Markt und Verkaufen');
ok(!win.Run.STEPS.some(function (t) { return t.indexOf('shop') >= 0; }),
   'es gibt keinen Händler-Knoten mehr auf der Karte');

/* Verkaufen per Ziehen: Pointer-Bahn von der Karte auf die Verkaufsfläche. */
function zieh(el, ziel) {
  var r = ziel.getBoundingClientRect();
  function ev(typ, x, y) {
    var e = new win.MouseEvent(typ, { bubbles: true, clientX: x, clientY: y });
    el.dispatchEvent(e);
    if (typ !== 'pointerdown') doc.dispatchEvent(e);
    return e;
  }
  el.dispatchEvent(new win.MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
  doc.dispatchEvent(new win.MouseEvent('pointermove',
    { bubbles: true, clientX: r.left + 1, clientY: r.top + 1 }));
  doc.dispatchEvent(new win.MouseEvent('pointerup',
    { bubbles: true, clientX: r.left + 1, clientY: r.top + 1 }));
}
/* jsdom liefert für alles 0-Rechtecke — die Trefferprüfung braucht echte Werte. */
win.Element.prototype.getBoundingClientRect = function () {
  return this.id === 'verkauf'
    ? { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }
    : { left: 500, top: 500, right: 520, bottom: 520, width: 20, height: 20 };
};

(run.bag = run.bag || []).push('kurzschwert');
run.relics.push('lebensquell');
run.phase = 'lager'; run.pending = { done: true };
win.UI.render();
var itemChip = $('[data-verkauf="item"]');
ok(!!itemChip, 'Beutel-Gegenstände sind ziehbar markiert');
ok(!!$('#verkauf'), 'die Verkaufsfläche steht am Trupp, nicht nur im Markt');
var vorMag = run.magicules, vorBag = run.bag.length;
zieh(itemChip, $('#verkauf'));
ok(run.bag.length === vorBag - 1 && run.magicules > vorMag,
   'ein auf die Fläche gezogener Gegenstand wird verkauft (+' +
   (run.magicules - vorMag) + ' ✦)');
var relChip = $('[data-verkauf="relikt"]');
var vorRel = run.relics.length;
zieh(relChip, $('#verkauf'));
ok(run.relics.length === vorRel - 1, 'ein Relikt lässt sich genauso verkaufen');
var einheitKarte = $('[data-verkauf="einheit"]');
var vorTeam = run.team.length;
zieh(einheitKarte, $('#verkauf'));
ok(run.team.length === vorTeam - 1, 'und eine Einheit ebenso');
/* Während der Kampfauflösung wird nicht verkauft, im Markt danach schon. */
ok(!win.Run.darfEntlassen({ phase: 'kampf', pending: { result: {} } }),
   'in der Kampfphase ist Verkaufen gesperrt');
ok(win.Run.darfEntlassen({ phase: 'markt', pending: { markt: [] } }),
   'in der Verwaltung danach ist es erlaubt');

/* -------------------------------------------------------------- Menü */
head('Menü und Glossar');
klick($('#btn-menu'));
ok($$('#menu-glossar dt').length >= 40, 'das Glossar listet alle Begriffe');
/* Fortschritt: was über die Runs hinweg verdient wurde. */
/* Die Stufenwahl muss im Menü erreichbar sein — im Startbildschirm sieht man
   sie einen Augenblick und danach nie wieder. */
ok($$('#menu-meta [data-a=stufe]').length + $$('#menu-meta button[disabled]').length ===
   win.Run.BEDROHUNG.length,
   'das Menü zeigt jede Bedrohungsstufe, freie wie verschlossene');
ok($$('#menu-meta button[disabled]').length > 0, 'verschlossene sind als solche erkennbar');
ok(/gewinnst/.test(text('#menu-meta')), 'und es steht dabei, wie die Stufe steigt');
ok(!!$('#hud-stufe'), 'die Kopfzeile zeigt die Bedrohungsstufe dauerhaft');
ok($$('#menu-meta .fortschritt').length === 3,
   'der Fortschritt zeigt Balken für Bedrohungsstufe, Einheiten und Relikte');
ok(/\d+ \/ \d+/.test(text('#menu-meta')), 'mit Zahlen daran');
ok($$('#menu-meta .chip').length === win.GameData.units.length + win.GameData.relics.length,
   'und listet Einheiten und Relikte vollständig (inkl. verschlossen) einzeln auf');
ok($$('#menu-meta .chip[data-tip]').length > 0, 'jeder Eintrag erklärt sich im Tooltip');
ok($$('#menu-glossar h4').length >= 5, 'das Glossar ist in Abschnitte geteilt');
ok(/je Zug seines TRÄGERS/.test(text('#menu-glossar')),
   'das Glossar sagt, wann ein Zustand tickt');
ok(/Dauerbrand/.test(text('#menu-glossar')) && /150 statt 6/.test(text('#menu-glossar')),
   'und welche Fähigkeiten den Abbau aussetzen, samt Größenordnung');
ok($$('#linien-einheit option').length === win.GameData.units.length,
   'die Linien-Übersicht listet jede Einheit');
var linienSel = $('#linien-einheit');
linienSel.value = 'zegion';
linienSel.dispatchEvent(new win.Event('change', { bubbles: true }));
/* Es gibt keine generierten Einheiten mehr — der Kopf zeigt jetzt die
   Schlüsselwörter der Einheit statt eines Generator-Etiketts. */
ok($$('#menu-linien .linien-kopf .kw-chip').length > 0,
   'die Übersicht nennt die Schlüsselwörter der Einheit');
ok(!!$('#menu-linien .signatur-block'), 'die Übersicht zeigt auch die Signatur-Aktive');
ok($('#menu-linien .signatur-block .unter').textContent.length > 15,
   'samt ihrer Beschreibung');
ok($$('#menu-linien .linie-block').length === 4 &&
   $$('#menu-linien .linien-stufe').length >= 16,
   'und mindestens sechzehn Passive in vier Linien');
ok(!/Stufe \d/.test(text('#menu-linien')), 'ohne Stufen — die sechzehn sind frei kombinierbar');
ok($$('#menu-linien .tag-preis').length === 4, 'vier davon sind als Preis markiert');
ok(!$('#menu [data-blatt="linien"]').hidden && $('#menu [data-blatt="chronik"]').hidden,
   'das Menü öffnet auf dem Reiter Entwicklungslinien');
klick($('#menu-reiter [data-reiter="chronik"]'));
ok($('#menu [data-blatt="linien"]').hidden && !$('#menu [data-blatt="chronik"]').hidden,
   'ein Reiter-Klick blendet das andere Blatt aus');
klick($('#menu-reiter [data-reiter="linien"]'));
ok($('#menu-chronik').children.length > 0, 'die Chronik protokolliert den Run');

/* ------------------------------------------------------ Speicherstand */
head('Speicherstand');
ok(win.localStorage.getItem('tensura-guild-v3'), 'der Run wird gespeichert');
/* Die Meta hängt an einem versionslosen Schlüssel — sie überlebt Formatwechsel. */
ok(win.localStorage.getItem('tensura-guild-meta'), 'die Meta liegt getrennt vom Run');
win.localStorage.setItem('tensura-guild-v2', '{"kaputt":true}');
win.Run.load();
ok(!win.localStorage.getItem('tensura-guild-v2'), 'ein Speicherstand alter Version wird beim Laden entsorgt');
var gespeichert = JSON.parse(win.localStorage.getItem('tensura-guild-v3'));
ok(gespeichert.team.length === run.team.length, 'der Trupp steckt im Speicherstand');
ok(gespeichert.team[0].rank === run.team[0].rank, 'der Rang überlebt das Speichern');

/* Start-Passiv: Einheit bekommt beim Anwerben eine vorausgewählte Linien-
   Passive (keine Karten-Auswahl mehr). Shion wird angeworben, damit der Fall
   auch dann greift, wenn der Startdraft sie nicht angeboten hat. */
head('Wählbare Passive');
if (win.Run.freieArt(run, 'oger')) win.Run.addUnit(run, 'shion');
else { win.Run.entlassen(run, run.team.filter(function (m) {
  return win.GameData.unit(m.id).art === 'oger'; })[0].uid);
  win.Run.addUnit(run, 'shion'); }
win.UI.render();
var pkarten = $$('#wahl .karte');
ok(pkarten.length === 0, 'beim Anwerben gibt es keine Passive-Auswahl mehr');
var shionM = run.team.filter(function (m) { return m.id === 'shion'; })[0];
ok(shionM.passives.length === 1 && win.Abilities.linienAngebot('shion')
     .some(function (o) { return o.id === shionM.passives[0] && !o.preis; }),
   'Shion startet mit einer vorausgewählten Linien-Passive ohne Preis');

console.log('\n' + pass + '/' + (pass + fail) + ' ok');
process.exit(fail ? 1 : 0);
