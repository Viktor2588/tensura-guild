/* dev/bildcheck.js — die Abnahme fuer Figurenbilder.
 *
 *   node dev/bildcheck.js                 alles unter assets/einheiten/
 *   node dev/bildcheck.js bild.png ...    einzelne Dateien
 *   node dev/bildcheck.js --selftest      prueft den Pruefer selbst
 *
 * `ASSETS.md` stellt acht Anforderungen an ein Bild. Vier davon sind Geschmack
 * und muessen am Brett beurteilt werden (Stil, Pose, Spiegelbarkeit, kein
 * eingemalter Schatten). Die anderen vier sind Pixelarbeit und lassen sich
 * messen — genau die stehen hier. Was durchfaellt, gehoert nicht ins Repo.
 *
 * Ohne Abhaengigkeit: `zlib` liegt in Node, und ein PNG-Dekoder fuer den Fall,
 * den wir brauchen (8 Bit, RGBA, nicht interlaced), sind die sechzig Zeilen
 * unten. Pillow dafuer zu installieren waere mehr Aufwand als der Dekoder.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var BREITE = 512, HOEHE = 1024;
var LUM_MAX = 0.86;                 // js/fx.js laesst alles ueber 0.85 gluehen
var KOPF_MIN = 0.85, KOPF_MAX = 0.95;

/* ---- PNG lesen ---------------------------------------------------------- */

function chunks(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('kein PNG');
  var out = [], p = 8;
  while (p < buf.length) {
    var len = buf.readUInt32BE(p);
    out.push({ typ: buf.toString('ascii', p + 4, p + 8), daten: buf.slice(p + 8, p + 8 + len) });
    p += len + 12;
  }
  return out;
}

/* Rueckwaerts filtern nach PNG-Spezifikation 9.2 — die fuenf Filtertypen sind
   der einzige Grund, warum ein PNG-Dekoder nicht drei Zeilen lang ist. */
function entfiltern(roh, breite, hoehe) {
  var bpp = 4, stride = breite * bpp;
  var out = Buffer.alloc(stride * hoehe);
  for (var y = 0; y < hoehe; y++) {
    var typ = roh[y * (stride + 1)];
    var zeile = roh.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (var x = 0; x < stride; x++) {
      var a = x >= bpp ? out[y * stride + x - bpp] : 0;
      var b = y > 0 ? out[(y - 1) * stride + x] : 0;
      var c = (x >= bpp && y > 0) ? out[(y - 1) * stride + x - bpp] : 0;
      var v = zeile[x];
      if (typ === 1) v += a;
      else if (typ === 2) v += b;
      else if (typ === 3) v += (a + b) >> 1;
      else if (typ === 4) {
        var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (typ !== 0) throw new Error('unbekannter Filtertyp ' + typ);
      out[y * stride + x] = v & 255;
    }
  }
  return out;
}

function lies(datei) {
  var cs = chunks(fs.readFileSync(datei));
  var ihdr = cs.filter(function (c) { return c.typ === 'IHDR'; })[0];
  if (!ihdr) throw new Error('kein IHDR');
  var breite = ihdr.daten.readUInt32BE(0), hoehe = ihdr.daten.readUInt32BE(4);
  var tiefe = ihdr.daten[8], farbtyp = ihdr.daten[9], interlace = ihdr.daten[12];
  if (tiefe !== 8) throw new Error('nur 8 Bit je Kanal, hier ' + tiefe);
  if (farbtyp !== 6) throw new Error('kein Alphakanal (PNG-Farbtyp ' + farbtyp + ', gebraucht 6)');
  if (interlace) throw new Error('interlaced PNG');
  var idat = Buffer.concat(cs.filter(function (c) { return c.typ === 'IDAT'; })
    .map(function (c) { return c.daten; }));
  return { breite: breite, hoehe: hoehe, px: entfiltern(zlib.inflateSync(idat), breite, hoehe) };
}

/* ---- Die vier messbaren Regeln ------------------------------------------ */

function pruefe(bild) {
  var fehler = [], w = bild.breite, h = bild.hoehe, px = bild.px;

  if (w !== BREITE || h !== HOEHE) {
    fehler.push('Format ' + w + 'x' + h + ' statt ' + BREITE + 'x' + HOEHE);
  }

  /* Fuesse am unteren Bildrand: das Sprite haengt an seiner Unterkante
     (`sprite.center = (0.5, 0)`). Ist die unterste Zeile leer, schwebt die
     Figur ueber dem Feld — auf dem Brett sieht das aus wie ein Fehler im
     Hexraster, nicht wie ein Bildfehler, und man sucht an der falschen Stelle. */
  var unten = 0;
  for (var x = 0; x < w; x++) if (px[((h - 1) * w + x) * 4 + 3] > 8) unten++;
  if (!unten) fehler.push('unterste Bildzeile ist leer — die Figur schwebt');

  /* Kopfhoehe: darueber liegen Lebensbalken (0,82) und Zustandsmarken (0,70). */
  var oberste = -1;
  for (var y = 0; y < h && oberste < 0; y++) {
    for (var x2 = 0; x2 < w; x2++) {
      if (px[(y * w + x2) * 4 + 3] > 8) { oberste = y; break; }
    }
  }
  if (oberste < 0) fehler.push('Bild ist vollstaendig transparent');
  else {
    var kopf = 1 - oberste / h;
    if (kopf < KOPF_MIN || kopf > KOPF_MAX) {
      fehler.push('Scheitel bei ' + kopf.toFixed(2) + ' der Hoehe, erwartet ' +
        KOPF_MIN + '–' + KOPF_MAX);
    }
  }

  /* Luminanzdeckel: `js/fx.js` laesst alles ueber 0,85 gluehen. Einzelne
     Glanzpunkte sind gewollt, eine Flaeche nicht — gezaehlt wird deshalb der
     ANTEIL zu heller Pixel an der Figur, nicht ihr Vorkommen. */
  var hell = 0, deckend = 0;
  for (var i = 0; i < w * h; i++) {
    if (px[i * 4 + 3] < 128) continue;
    deckend++;
    var Y = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    if (Y > LUM_MAX) hell++;
  }
  if (deckend && hell / deckend > 0.015) {
    fehler.push('zu helle Flaeche: ' + (hell / deckend * 100).toFixed(1) +
      ' % der Figur ueber Luminanz ' + LUM_MAX + ' (erlaubt 1,5 %)');
  }

  return fehler;
}

/* ---- Selbsttest --------------------------------------------------------- */

/* Baut Testbilder im Speicher, statt welche ins Repo zu legen: der Dekoder ist
   die Stelle, die still falsch sein kann, und ein PNG von Hand zu schreiben
   ist billiger als eins zu pflegen. Filtertyp 0 reicht dafuer — die uebrigen
   vier deckt jedes echte Bild ab. */
function testPng(w, h, mal) {
  function chunk(typ, daten) {
    var len = Buffer.alloc(4); len.writeUInt32BE(daten.length);
    var koerper = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
    var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(koerper) >>> 0);
    return Buffer.concat([len, koerper, crc]);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  var roh = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var p = mal(x, y), off = y * (w * 4 + 1) + 1 + x * 4;
      roh[off] = p[0]; roh[off + 1] = p[1]; roh[off + 2] = p[2]; roh[off + 3] = p[3];
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(roh)), chunk('IEND', Buffer.alloc(0))]);
}

var CRC_TAB = (function () {
  var t = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function selftest() {
  var assert = require('assert');
  var tmp = path.join(require('os').tmpdir(), 'bildcheck-test.png');

  /* Eine gueltige Figur: Saeule von 0,90 der Hoehe bis ganz unten, mittelhell. */
  function gut(x, y) {
    var drin = x > 200 && x < 312 && y > HOEHE * 0.10;
    return drin ? [90, 110, 160, 255] : [0, 0, 0, 0];
  }
  fs.writeFileSync(tmp, testPng(BREITE, HOEHE, gut));
  assert.deepStrictEqual(pruefe(lies(tmp)), [], 'eine regelkonforme Figur faellt nicht durch');

  /* Schwebend: unten 40 px frei. */
  fs.writeFileSync(tmp, testPng(BREITE, HOEHE, function (x, y) {
    return (y > HOEHE - 40) ? [0, 0, 0, 0] : gut(x, y);
  }));
  assert.ok(pruefe(lies(tmp)).join(' ').indexOf('schwebt') >= 0, 'schwebende Figur faellt auf');

  /* Kopf zu tief: erst ab der Haelfte faengt die Figur an. */
  fs.writeFileSync(tmp, testPng(BREITE, HOEHE, function (x, y) {
    return y < HOEHE * 0.5 ? [0, 0, 0, 0] : gut(x, y);
  }));
  assert.ok(pruefe(lies(tmp)).join(' ').indexOf('Scheitel') >= 0, 'zu tiefer Scheitel faellt auf');

  /* Ueberstrahlt: die halbe Figur ist fast weiss. */
  fs.writeFileSync(tmp, testPng(BREITE, HOEHE, function (x, y) {
    var p = gut(x, y);
    return (p[3] && y < HOEHE * 0.5) ? [252, 252, 252, 255] : p;
  }));
  assert.ok(pruefe(lies(tmp)).join(' ').indexOf('zu helle') >= 0, 'weisse Flaeche faellt auf');

  /* Falsches Format. */
  fs.writeFileSync(tmp, testPng(256, 256, function () { return [40, 40, 40, 255]; }));
  assert.ok(pruefe(lies(tmp)).join(' ').indexOf('Format') >= 0, 'falsches Format faellt auf');

  /* Ohne Alphakanal gar nicht erst lesbar — das ist die haeufigste Lieferung
     eines Browser-Generators und soll eine klare Meldung geben. */
  var ohneAlpha = testPng(4, 4, function () { return [0, 0, 0, 255]; });
  ohneAlpha[8 + 8 + 9] = 2;                                  // IHDR-Farbtyp auf RGB
  fs.writeFileSync(tmp, ohneAlpha);
  assert.throws(function () { lies(tmp); }, /Alphakanal/, 'PNG ohne Alpha wird benannt');

  fs.unlinkSync(tmp);
  console.log('6/6 ok — der Pruefer prueft.');
}

/* ---- Aufruf ------------------------------------------------------------- */

function main(argv) {
  if (argv.indexOf('--selftest') >= 0) return selftest();
  var dateien = argv.filter(function (a) { return a.charAt(0) !== '-'; });
  if (!dateien.length) {
    var ordner = path.join(__dirname, '..', 'assets', 'einheiten');
    if (!fs.existsSync(ordner)) {
      console.log('Noch keine Bilder: ' + ordner + ' gibt es nicht.');
      console.log('Prompts holen: node dev/prompts.js');
      return;
    }
    dateien = fs.readdirSync(ordner).filter(function (f) { return /\.png$/i.test(f); })
      .map(function (f) { return path.join(ordner, f); });
  }
  var schlecht = 0;
  dateien.forEach(function (d) {
    var fehler;
    try { fehler = pruefe(lies(d)); }
    catch (e) { fehler = [e.message]; }
    if (fehler.length) { schlecht++; console.log('✗ ' + path.basename(d) + '\n    ' + fehler.join('\n    ')); }
    else console.log('✓ ' + path.basename(d));
  });
  console.log('\n' + (dateien.length - schlecht) + '/' + dateien.length + ' ok');
  process.exit(schlecht ? 1 : 0);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { lies: lies, pruefe: pruefe };
