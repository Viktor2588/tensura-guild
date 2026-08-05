/* dev/prompts.js — Prompts fuer die Figurenbilder, und die Herkunftszeile dazu.
 *
 *   node dev/prompts.js              die sechs Pilotfiguren
 *   node dev/prompts.js shion ranga  ausgewaehlte IDs
 *   node dev/prompts.js --alle       alle Einheiten aus js/data.js
 *   node dev/prompts.js --md ...     nur die ASSETS.md-Tabellenzeilen
 *
 * Warum ein Skript und keine Textdatei: `ASSETS.md` verlangt je Bild eine
 * Herkunftszeile mit dem VOLLSTAENDIGEN Prompt, sonst gilt das Bild als nicht
 * verwendbar. Von Hand ist das bei jedem Bild dieselbe Abschreibuebung mit
 * genau einem wechselnden Wort — also faellt die Zeile hier gleich mit ab.
 *
 * Der Prompt-Rumpf steht in `dev/asset-recherche.md` begruendet: jeder
 * Baustein bildet einen Punkt aus `ASSETS.md` ab. Er ist ueber ALLE Bilder
 * wortgleich; nur `TAG` wechselt. Das, derselbe Seed und derselbe Sampler sind
 * der ganze Konsistenz-Mechanismus.
 */

'use strict';

var path = require('path');
global.window = global;
require(path.join(__dirname, '..', 'js', 'data.js'));
var GD = global.GameData;

/* Danbooru-Tags fuer die Figuren, die es im Modell namentlich gibt. Alles
   andere ist eine eigene Erfindung dieses Spiels und braucht eine
   Beschreibung statt eines Tags — dort traegt der Text die Wiedererkennung,
   nicht das Modell. Fehlt ein Eintrag, baut `figurTeil()` aus Art und Rolle
   eine Notbeschreibung; die ist brauchbar, aber austauschbar. */
var TAG = {
  rimuru: 'rimuru tempest, androgynous, light blue hair, gold eyes, black and blue coat',
  shion: 'shion (tensura), purple hair, oni horn, large odachi',
  souei: 'souei (tensura), blue hair, oni, dark bodysuit',
  benimaru: 'benimaru (tensura), red hair, oni horn, katana',
  shuna: 'shuna (tensura), pink hair, kimono, oni',
  hakuro: 'hakuro (tensura), old man, oni, katana',
  ranga: 'ranga (tensura), giant black wolf, single horn, lightning',
  gobta: 'gobta (tensura), small goblin, cheerful',
  milim: 'milim nava, pink twintails, dragon horn',
  veldora: 'veldora tempest, blonde, dragon, storm',
  diablo: 'diablo (tensura), black butler suit, demon, red eyes',
  gabiru: 'gabiru (tensura), lizardman, spear',
  souka: 'souka (tensura), female lizardman, scout'
};

/* Rollen und Arten fuer die eigenen Figuren — dieselben zwei Achsen, die auch
   `platzhalter()` in `js/brett3d.js` zeichnet. */
var ART_WORT = {
  slime: 'slime creature', goblin: 'goblin', oger: 'oni, horns',
  direwolf: 'giant wolf, quadruped', echsenmensch: 'lizardman, tail, scales',
  insektoid: 'insectoid, carapace, antennae', daemon: 'demon, dark aura',
  drache: 'dragon, wings', untot: 'undead, skeletal', bestie: 'beastman, fur',
  ork: 'orc, tusks, heavy build', mensch: 'human'
};
var ROLLE_WORT = {
  front: 'heavy armor, sword and shield', fernkampf: 'bow, light armor',
  magier: 'staff, robe', unterstuetzer: 'healer robe, staff',
  verstaerker: 'banner, ceremonial armor'
};

var RUMPF = [
  'solo, full body, standing, facing viewer, front view, symmetrical pose',
  'arms at sides, feet visible, full body in frame, head near top of frame',
  'flat mid-grey background, simple background, no shadow, no ground',
  'strong rim light from behind, backlit edge glow, cool key light',
  'muted saturated colors, clean lineart, cel shading, anime style',
  'masterpiece, best quality, very awa'
].join(', ');

var NEGATIV = [
  'cropped, cut off, out of frame, closeup, portrait, bust',
  'cast shadow, drop shadow, ground shadow, floor, reflection',
  'text, watermark, signature, logo, emblem, crest, letters',
  'white background, bright white armor, blown out highlights, overexposed',
  'multiple views, character sheet, 2girls, 2boys, extra limbs, lowres'
].join(', ');

var SEED = 20260805;
var GROESSE = '832 x 1216 (danach auf 512 x 1024 zuschneiden)';
var SAMPLER = 'DPM++ 2M Karras, CFG 6, 30 Schritte';
var MODELL = 'Illustrious-XL-Ableger (Browser-Generator)';

/* Sechs Figuren, sechs verschiedene ARTEN. Der Pilot soll nicht messen, ob das
   Modell Oger kann, sondern ob die Vorgaben aus `ASSETS.md` ueber
   unterschiedliche Koerperformen halten — ein Slime hat keine Fuesse, ein Wolf
   steht auf vieren, und genau daran scheitert „Fuesse am unteren Bildrand". */
var PILOT = ['rimuru', 'shion', 'ranga', 'gobta', 'gabiru', 'orkkrieger'];

function figurTeil(u) {
  if (TAG[u.id]) return TAG[u.id];
  return [u.name, ART_WORT[u.art] || u.art, ROLLE_WORT[u.tags[1]] || ''].
    filter(Boolean).join(', ');
}

function seedVon(id) {
  /* Fester Seed je Figur statt einer laufenden Nummer: so bleibt die Zeile in
     `ASSETS.md` reproduzierbar, auch wenn die Reihenfolge sich aendert. */
  var h = 0;
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SEED + (h % 1000);
}

function block(u) {
  var s = seedVon(u.id);
  return [
    '### ' + u.name + '  (' + u.id + ')',
    '',
    'POSITIV:',
    figurTeil(u) + ',',
    RUMPF,
    '',
    'NEGATIV:',
    NEGATIV,
    '',
    'SEED ' + s + ' (Varianten: +1 .. +5)  ·  ' + SAMPLER + '  ·  ' + GROESSE,
    'Ablage: assets/einheiten/' + u.id + '.png',
    ''
  ].join('\n');
}

function mdZeile(u) {
  return '| `assets/einheiten/' + u.id + '.png` | ' + MODELL + ' | Rumpf (siehe oben) + `' +
    figurTeil(u) + '` | Seed ' + seedVon(u.id) + ' | ' + new Date().toISOString().slice(0, 10) +
    ' | Fanart, privat — siehe Rechtslage in `dev/asset-recherche.md` |';
}

function main(argv) {
  var nurMd = argv.indexOf('--md') >= 0;
  var ids = argv.filter(function (a) { return a.charAt(0) !== '-'; });
  if (argv.indexOf('--alle') >= 0) ids = GD.units.map(function (u) { return u.id; });
  if (!ids.length) ids = PILOT;

  var units = ids.map(function (id) {
    var u = GD.unit(id);
    if (!u) { console.error('unbekannte Einheit: ' + id); process.exit(1); }
    return u;
  });

  if (nurMd) {
    units.forEach(function (u) { console.log(mdZeile(u)); });
    return;
  }
  console.log('Prompts fuer ' + units.length + ' Figur(en). Der NEGATIV-Teil und alles');
  console.log('nach der ersten Zeile im POSITIV-Teil ist ueber alle Bilder gleich.\n');
  units.forEach(function (u) { console.log(block(u)); });
  console.log('--- Zeilen fuer die Herkunftstabelle in ASSETS.md ---\n');
  units.forEach(function (u) { console.log(mdZeile(u)); });
  console.log('\nNach dem Herunterladen: node dev/bildcheck.js');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PILOT: PILOT, figurTeil: figurTeil, seedVon: seedVon, RUMPF: RUMPF, NEGATIV: NEGATIV };
