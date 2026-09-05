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
 * genau einem wechselnden Block — also faellt die Zeile hier gleich mit ab.
 *
 * Der Prompt besteht aus drei Teilen, die IMMER in dieser Reihenfolge stehen:
 *
 *   VORSPANN   ueber alle Bilder wortgleich  — was fuer ein Bild das wird
 *   BESCHREIBUNG[id]  wechselt je Figur      — wer darauf zu sehen ist
 *   STIL       ueber alle Bilder wortgleich  — wie es gezeichnet wird
 *
 * Frueher stand in der Mitte ein Danbooru-Tag ("shion (tensura)") und das
 * Modell hat den Rest ergaenzt. Das war kuerzer, aber es hing daran, dass das
 * Modell die Figur namentlich kennt — bei den eigenen Erfindungen dieses Spiels
 * kam Beliebiges heraus. Jetzt steht die Figur ausgeschrieben da: Haar, Augen,
 * Volksmerkmal, Kleidung Stueck fuer Stueck, Waffe, Pose. Das ist laenger, gilt
 * aber fuer erfundene und bekannte Figuren gleichermassen, und derselbe Seed
 * trifft damit zweimal dieselbe Figur statt zweimal dieselbe Stimmung.
 */

'use strict';

var path = require('path');
global.window = global;
require(path.join(__dirname, '..', 'js', 'data.js'));
var GD = global.GameData;

/* „illustration", nicht „design sheet": mit `design sheet` nimmt das Modell das
   Wort woertlich und liefert ein Blatt — Nebenskizze vom Kopf, Waffe als
   freistehendes Requisit daneben. Genau so kam der erste Testlauf mit Shion
   zurueck. Ein Sprite darf nur EINE Ansicht und keine losen Teile enthalten,
   sonst laesst es sich nicht freistellen. */
var VORSPANN = 'full body anime character illustration';

var STIL = [
  'clean cel shading, crisp lineart, soft gradients',
  'plain white background, official game character art style'
].join(', ');

var NEGATIV = 'blurry, extra limbs, malformed hands, cluttered background, ' +
  'photorealistic, watermark, text';

/* Je Figur: Alter und Statur, Haar, Augen, Volksmerkmal, Miene, Kleidung von
   aussen nach innen, dann Waffe und Pose. Die Reihenfolge ist ueberall gleich —
   das Modell gewichtet frueh Genanntes staerker, und wenn die Reihenfolge
   wechselt, wechselt auch die Bildaufteilung. */
var BESCHREIBUNG = {

  /* ---- Slime ------------------------------------------------------------- */
  rimuru: 'androgynous young person, slender short figure, chin length pale ' +
    'sky blue hair with straight bangs, large golden yellow eyes, calm gentle ' +
    'expression, long black and dark blue high collar coat with gold trim and ' +
    'wide sleeves, black bodysuit underneath, black boots, both arms relaxed ' +
    'at sides, small blue slime blob resting at the feet, upright neutral pose',

  /* ---- Goblins ----------------------------------------------------------- */
  gobta: 'small cheerful goblin boy, short stocky figure, spiky dark green ' +
    'hair, round black eyes, pointed ears, olive green skin, wide grin with ' +
    'small tusks, simple brown leather vest over grey tunic, cloth wrappings ' +
    'on forearms, short trousers, bare feet, right hand holding a short curved ' +
    'sword pointing down, left hand scratching the back of the head, relaxed ' +
    'cocky stance',
  gobkyu: 'lean young goblin archer, wiry figure, short black hair tied with a ' +
    'red band, narrow yellow eyes, pointed ears, olive green skin, focused ' +
    'expression, light leather harness over bare chest, quiver of arrows on ' +
    'the back, cloth belt with pouches, wrapped shins, left hand holding a ' +
    'short recurve bow at the side, right hand resting on the quiver strap, ' +
    'alert upright stance',
  rigurd: 'old goblin chieftain, broad muscular figure, thick white beard and ' +
    'bald head, heavy brow, stern black eyes, pointed ears, weathered green ' +
    'skin, dark iron breastplate over a brown fur mantle, wide studded belt, ' +
    'heavy boots, both hands resting on the pommel of a large upright sword ' +
    'planted in front, grounded commanding stance',
  rigur: 'adult goblin guard captain, tall lean figure, short dark green hair, ' +
    'sharp orange eyes, pointed ears, green skin, grim set jaw, banded leather ' +
    'armour with a red sash across the chest, metal shoulder guard on the ' +
    'right, dark trousers, laced boots, right hand gripping a long spear held ' +
    'vertically, left arm at the side, disciplined upright stance',
  gobwa: 'young goblin woman, slight figure, long dark green hair in a low ' +
    'braid, gentle amber eyes, pointed ears, pale green skin, soft worried ' +
    'smile, layered cream and moss green herbalist robe, wide cloth belt with ' +
    'hanging pouches and dried herbs, simple sandals, both hands holding a ' +
    'shallow wooden bowl at waist height, calm still pose',

  /* ---- Oger -------------------------------------------------------------- */
  benimaru: 'young adult man, tall lean muscular figure, short crimson red ' +
    'hair, sharp red eyes, single dark curved oni horn on the forehead, ' +
    'confident half smile, open dark red haori with black flame pattern over a ' +
    'bare chest, wide black obi sash, loose dark hakama trousers, straw ' +
    'sandals, right hand resting on the hilt of a katana at the hip, left hand ' +
    'holding the black lacquered scabbard, relaxed contrapposto pose',
  shion: 'young adult woman, tall athletic figure, long lavender hair in high ' +
    'ponytail with side bangs, violet eyes, single dark curved oni horn on ' +
    'forehead, confident slight smile, dark purple double-breasted suit jacket ' +
    'with deep V neckline, light green collar underneath, matching slim purple ' +
    'trousers, black belt, black ankle boots, right arm raised holding the ' +
    'wrapped hilt of an oversized odachi resting on shoulder, huge dark ' +
    'red-brown cylindrical scabbard with black metal fittings reaching the ' +
    'ground, left hand on hip, contrapposto pose',
  souei: 'young adult man, tall slim figure, straight dark blue hair with long ' +
    'side locks, narrow pale blue eyes, single dark oni horn on the forehead, ' +
    'impassive expression, close fitting dark navy bodysuit with grey plated ' +
    'shoulders, black gloves and belted harness, thin steel wires coiled at ' +
    'the hip, dark boots, both arms straight at the sides, silent upright ' +
    'stance',
  shuna: 'young adult woman, slender graceful figure, long pale pink hair with ' +
    'straight bangs, soft pink eyes, single small oni horn on the forehead, ' +
    'serene smile, layered white and rose kimono with wide sleeves and floral ' +
    'hem pattern, broad red obi sash tied at the back, white tabi and wooden ' +
    'sandals, both hands folded together in front at waist height, poised ' +
    'still pose',
  hakuro: 'elderly man, wiry compact figure, long white hair tied back and a ' +
    'long white beard, narrow closed eyes, single worn grey oni horn on the ' +
    'forehead, calm knowing smile, dark grey training kimono with a black ' +
    'sleeveless overcoat, simple rope belt, cloth leg wrappings, straw ' +
    'sandals, right hand resting on the hilt of a slim katana at the hip, left ' +
    'hand behind the back, upright disciplined stance',
  kurobe: 'middle aged man, broad heavy figure, short black hair tied in a ' +
    'topknot, dark brown eyes, single thick oni horn on the forehead, focused ' +
    'frown, soot stained dark work kimono with sleeves tied back, thick ' +
    'leather smith apron, forearm wrappings, heavy sandals, right hand holding ' +
    'a large smithing hammer resting head down on the ground, left hand on the ' +
    'hip, solid planted stance',

  /* ---- Direwolf ---------------------------------------------------------- */
  ranga: 'giant black wolf, powerful quadruped body, thick dark fur with a ' +
    'silver mane at the neck, glowing yellow eyes, single curved horn on the ' +
    'forehead, bared fangs, crackling blue lightning arcing along the back and ' +
    'tail, all four paws planted on the ground, head lowered and turned toward ' +
    'the viewer, alert prowling stance',
  sturmwolf: 'large grey wolf, lean quadruped body, short storm grey fur with ' +
    'white throat, pale blue eyes, faint wind swirls around the paws, ears ' +
    'pricked forward, all four paws on the ground, head level and facing the ' +
    'viewer, tense ready stance',

  /* ---- Echsenmenschen ---------------------------------------------------- */
  gabiru: 'adult lizardman warrior, tall broad figure, teal green scales, ' +
    'crested reptilian head with a swept back fin, yellow slit eyes, long ' +
    'heavy tail, proud open mouthed grin, bronze scale mail over the chest, ' +
    'brown leather kilt with metal studs, arm bracers, bare clawed feet, right ' +
    'hand holding a long bladed spear upright, left hand on the hip, boastful ' +
    'wide stance',
  souka: 'adult lizardwoman scout, slim agile figure, pale blue green scales, ' +
    'narrow reptilian head with small side fins, orange slit eyes, long ' +
    'tapering tail, watchful neutral expression, light leather chest harness ' +
    'and short cloak, belted satchel, wrapped forearms, bare clawed feet, ' +
    'right hand holding a slim javelin at the side, left hand shading the ' +
    'eyes, poised scouting stance',
  echsenfuerst: 'old lizardman lord, massive imposing figure, deep green ' +
    'scales with grey along the jaw, horned reptilian head, amber slit eyes, ' +
    'thick heavy tail, solemn closed mouth, ornate blue and gold lamellar ' +
    'armour over the shoulders and chest, long dark green cloak, wide belt ' +
    'with a carved emblem, bare clawed feet, both hands resting on a broad ' +
    'trident planted in front, immovable regal stance',
  drachenknecht: 'adult lizardman retainer, sturdy figure, olive green scales, ' +
    'blunt reptilian head, red slit eyes, thick tail, determined set jaw, dark ' +
    'iron half plate over a padded blue tunic, tabard with a dragon crest, ' +
    'metal greaves, clawed feet, right hand raising a war banner on a long ' +
    'pole, left hand gripping a short sword at the belt, forward leaning ' +
    'stance',
  quellenpriesterin: 'young lizardwoman priestess, slender figure, pale mint ' +
    'green scales, delicate reptilian head with a small crest, soft violet ' +
    'slit eyes, slim tail, gentle calm expression, flowing white and turquoise ' +
    'ceremonial robe with water pattern trim, shell and pearl necklace, bare ' +
    'clawed feet, both hands holding a tall staff topped with a clear blue ' +
    'stone, quiet upright pose',

  /* ---- Insektoide -------------------------------------------------------- */
  zegion: 'towering insectoid warrior, humanoid figure with hard black ' +
    'carapace plating, smooth featureless head with glowing violet compound ' +
    'eyes, two thin antennae swept back, segmented armoured limbs, folded ' +
    'iridescent wings on the back, no expression, dark purple sash across the ' +
    'chest, both fists clenched at the sides, perfectly straight silent stance',
  apito: 'insectoid woman, slim figure with amber and black chitin plating, ' +
    'humanoid head with large golden compound eyes and two curved antennae, ' +
    'four translucent wings on the back, calm sharp expression, layered honey ' +
    'coloured carapace armour over the torso, segmented thigh guards, right ' +
    'hand holding a slender needle lance pointing down, left hand at the side, ' +
    'light hovering stance with feet on the ground',

  /* ---- Daemonen ---------------------------------------------------------- */
  diablo: 'tall adult man, elegant slender figure, slicked back black hair ' +
    'with two long curved horns, glowing red eyes, pointed ears, pale grey ' +
    'skin, thin knowing smile, immaculate black butler tailcoat with white ' +
    'gloves, white dress shirt and black waistcoat, dark trousers, polished ' +
    'black shoes, right hand held across the chest in a bow gesture, left arm ' +
    'behind the back, poised courteous stance, faint dark aura at the feet',
  testarossa: 'adult woman, tall poised figure, long straight platinum white ' +
    'hair, cold red eyes, pale skin, faint dark aura, serene unsettling smile, ' +
    'fitted white military dress coat with gold buttons and high collar, black ' +
    'gloves, narrow black skirt, black heeled boots, right hand raised with ' +
    'fingers slightly spread, left hand at the side, elegant upright stance',
  ultima: 'adult woman, slim figure, long straight black hair with blunt ' +
    'bangs, bright violet eyes, pale skin, playful cruel smile, fitted dark ' +
    'purple military dress coat with silver trim, black gloves and thigh high ' +
    'black boots, short black skirt, right hand holding a thin dark rapier ' +
    'pointing down, left hand on the hip, leaning teasing stance',
  carrera: 'adult woman, tall strong figure, long wavy golden blonde hair, ' +
    'fierce yellow eyes, pale skin, wide confident grin, open black military ' +
    'greatcoat with gold epaulettes over a dark bodysuit, wide belt, heavy ' +
    'black boots, right hand resting on a massive black warhammer standing head ' +
    'down on the ground, left hand on the hip, bold planted stance',
  daemonengarde: 'faceless demon soldier, tall lean figure, smooth dark grey ' +
    'skin, no visible face beneath a horned helmet, two glowing crimson eye ' +
    'slits, dark plate armour with sharp angular pauldrons, tattered black ' +
    'cape, clawed gauntlets, armoured boots, right hand holding a straight ' +
    'black sword pointing down, left hand carrying a narrow dark shield, rigid ' +
    'guarding stance',

  /* ---- Drachen ----------------------------------------------------------- */
  veldora: 'young adult man, tall broad figure, spiky pale blonde hair, ' +
    'gleaming blue eyes, two black dragon horns curving back, sharp toothed ' +
    'grin, long black leather coat with a high collar and silver buckles over ' +
    'a bare chest, dark trousers and heavy boots, crackling storm wind and ' +
    'small lightning arcs around the shoulders, both arms crossed over the ' +
    'chest, triumphant wide stance',
  milim: 'young girl, small slight figure, very long pink hair in twin ' +
    'ponytails reaching the ground, large pink eyes, a single white dragon ' +
    'horn on the forehead, bright reckless grin, short white and pink dress ' +
    'with gold trim and a dark chest harness, long white gloves, thigh high ' +
    'white boots, both fists clenched and raised slightly, energetic bouncing ' +
    'stance',
  drachenwelpe: 'small young dragon, stout quadruped body, deep red scales ' +
    'with a cream belly, oversized head with short blunt horns, big orange ' +
    'eyes, stubby folded wings, short tail, curious open mouth, all four clawed ' +
    'feet on the ground, head tilted toward the viewer, playful crouching ' +
    'stance',
  windrache: 'slender green dragon, long serpentine body on four slim legs, ' +
    'pale jade scales, narrow horned head with swept back frills, cyan eyes, ' +
    'wide translucent wings half spread, long whipping tail, swirling wind ' +
    'currents around the body, all four feet on the ground, head raised, ' +
    'poised soaring stance',

  /* ---- Orks -------------------------------------------------------------- */
  gerudo: 'huge ork general, massive heavy figure, grey green skin, bald head ' +
    'with a broad jaw and two upward tusks, small dark eyes, deep scar across ' +
    'the cheek, grim closed mouth, thick iron plate armour over the chest and ' +
    'shoulders, chainmail skirt, wide studded belt, heavy armoured boots, both ' +
    'hands resting on the haft of an enormous cleaver planted in front, ' +
    'immovable braced stance',
  orkkrieger: 'ork foot soldier, broad heavy figure, dull green skin, coarse ' +
    'black hair tied back, two short lower tusks, small yellow eyes, angry ' +
    'snarl, battered iron breastplate over a rough hide tunic, mismatched ' +
    'shoulder plate, cloth wrappings on the arms, worn boots, right hand ' +
    'holding a notched broad sword pointing down, left arm carrying a dented ' +
    'round wooden shield, aggressive forward stance',

  /* ---- Bestienkrieger ---------------------------------------------------- */
  phobio: 'young adult man, tall muscular figure, shaggy dark hair with black ' +
    'leopard ears, sharp yellow eyes, dark spotted fur along the forearms, long ' +
    'spotted tail, defiant bared teeth, open sleeveless black jacket over a ' +
    'bare chest, wide cloth belt, loose dark trousers, bare clawed feet, both ' +
    'hands in loose claws at the sides, crouched ready stance',
  albis: 'adult woman, tall lithe figure, long silver white hair, golden ' +
    'serpentine eyes, pale scaled patches on the cheeks and forearms, cool ' +
    'composed expression, fitted dark green and gold beastfolk dress with a ' +
    'high slit skirt, gold arm rings and shoulder ornament, sandals with ankle ' +
    'straps, right hand holding a curved bow at the side, left hand resting ' +
    'near a hip quiver, elegant upright stance',
  suphia: 'adult woman, sturdy athletic figure, short dark blue hair, sharp ' +
    'grey eyes, small round beast ears, bushy tail, stern reliable expression, ' +
    'dark blue and steel guard uniform with a plated chest piece, tabard with ' +
    'a beast crest, armoured gloves and greaves, heavy boots, right hand ' +
    'holding an upright ceremonial banner pole, left hand at the side, firm ' +
    'attentive stance',

  /* ---- Untote ------------------------------------------------------------ */
  adalmann: 'undead sorcerer, tall gaunt figure, skeletal face with hollow ' +
    'sockets and two points of blue soul fire for eyes, no hair, exposed bone ' +
    'at the hands, solemn expression, heavy dark violet and gold sorcerer robe ' +
    'with a wide collar and layered mantle, ornate chain across the chest, long ' +
    'trailing hem, both hands holding a tall black staff topped with a violet ' +
    'crystal, still commanding pose',
  wightkoenig: 'undead king, tall broad skeletal figure, crowned bare skull ' +
    'with cold green soul fire in the eye sockets, tattered royal cloak in deep ' +
    'red over blackened plate armour, ornate pauldrons and gauntlets, rusted ' +
    'chain skirt, armoured boots, right hand holding a heavy dark broadsword ' +
    'pointing down, left hand at the side, grim regal stance',
  gruftwaechter: 'undead tomb guardian, heavy armoured skeletal figure, closed ' +
    'iron helm with a narrow visor and dim red light inside, corroded grey ' +
    'plate armour covered in grave dust, torn grey surcoat, oversized ' +
    'gauntlets, armoured boots, left arm carrying a tall rectangular tower ' +
    'shield planted on the ground, right hand holding a short mace, unmoving ' +
    'blocking stance',
  seelenhexe: 'undead witch, slender figure, long ash grey hair, pale grey ' +
    'skin with faint cracks, hollow eyes glowing soft violet, sad quiet smile, ' +
    'layered tattered black and lilac robe with a wide hood down on the ' +
    'shoulders, bandaged forearms, bare feet, right hand raised holding a small ' +
    'floating pale soul light, left hand at the side, weightless drifting pose'
};

/* Notbeschreibung fuer Einheiten ohne eigenen Eintrag: dieselben zwei Achsen,
   die auch `platzhalter()` in `js/brett3d.js` zeichnet — Volk und Rolle. Sie
   ist brauchbar, aber austauschbar; wer ein Bild wirklich braucht, bekommt
   einen Eintrag in `BESCHREIBUNG`. */
var ART_WORT = {
  slime: 'small blue slime creature with a smooth round body and simple face',
  goblin: 'short goblin with green skin and pointed ears',
  oger: 'tall oni with a single curved horn on the forehead',
  direwolf: 'giant wolf on four legs with thick dark fur',
  echsenmensch: 'lizardman with green scales, a crested head and a long tail',
  insektoid: 'insectoid humanoid with hard carapace plating and antennae',
  daemon: 'demon with pale grey skin, horns and a faint dark aura',
  drache: 'dragon with scaled hide and folded wings',
  untot: 'undead figure with a skeletal face and soul fire in the eye sockets',
  bestie: 'beastfolk warrior with animal ears, a tail and patches of fur',
  ork: 'heavy ork with green skin and two lower tusks',
  mensch: 'human adult of ordinary build'
};
var ROLLE_WORT = {
  front: 'heavy plate armour, a broad sword held pointing down and a round ' +
    'shield on the left arm, braced forward stance',
  fernkampf: 'light leather armour, a bow held at the side and a quiver on the ' +
    'back, alert upright stance',
  magier: 'long layered robe with a wide collar, both hands holding a tall ' +
    'staff, still commanding pose',
  unterstuetzer: 'pale healer robe with a wide sash, both hands holding a ' +
    'staff topped with a clear stone, calm upright pose',
  verstaerker: 'ceremonial armour with a tabard, right hand raising a banner ' +
    'on a long pole, firm attentive stance'
};

var SEED = 20260805;
var GROESSE = '832 x 1216 (danach auf 512 x 1024 zuschneiden)';
var SAMPLER = 'DPM++ 2M Karras, CFG 6, 30 Schritte';
var MODELL = 'WAI-illustrious-SDXL (Forge, lokal)';

/* Sechs Figuren, sechs verschiedene ARTEN. Der Pilot soll nicht messen, ob das
   Modell Oger kann, sondern ob die Vorgaben aus `ASSETS.md` ueber
   unterschiedliche Koerperformen halten — ein Slime hat keine Fuesse, ein Wolf
   steht auf vieren, und genau daran scheitert „Fuesse am unteren Bildrand". */
var PILOT = ['rimuru', 'shion', 'ranga', 'gobta', 'gabiru', 'orkkrieger'];

function figurTeil(u) {
  if (BESCHREIBUNG[u.id]) return BESCHREIBUNG[u.id];
  return [u.name, ART_WORT[u.art] || u.art, ROLLE_WORT[u.tags[1]] || ''].
    filter(Boolean).join(', ');
}

/* Der ganze Positiv-Prompt, wie er ins Feld gehoert. */
function positiv(u) {
  return [VORSPANN, figurTeil(u), STIL].join(', ');
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
    positiv(u),
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
  return '| `assets/einheiten/' + u.id + '.png` | ' + MODELL + ' | `' +
    positiv(u) + '` | Seed ' + seedVon(u.id) + ' | ' +
    new Date().toISOString().slice(0, 10) +
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
  console.log('Prompts fuer ' + units.length + ' Figur(en). Vorspann und Stilteil');
  console.log('sind ueber alle Bilder gleich, ebenso der NEGATIV-Teil.\n');
  units.forEach(function (u) { console.log(block(u)); });
  console.log('--- Zeilen fuer die Herkunftstabelle in ASSETS.md ---\n');
  units.forEach(function (u) { console.log(mdZeile(u)); });
  console.log('\nNach dem Herunterladen: node dev/bildcheck.js');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {
  PILOT: PILOT, figurTeil: figurTeil, positiv: positiv, seedVon: seedVon,
  VORSPANN: VORSPANN, STIL: STIL, NEGATIV: NEGATIV, BESCHREIBUNG: BESCHREIBUNG
};
