/* dev/serve.js — winziger statischer Server für die lokale Entwicklung.
   NICHT Teil des Spiels und keine Abhängigkeit: nur Node-Bordmittel.

   Aufruf:  node dev/serve.js [port]      (Standard 8080)

   Warum überhaupt? Das Spiel braucht keinen Build — die acht Skripte laufen so,
   wie sie dastehen. Wer es durch einen Bundler schickt (etwa `bun index.html`,
   das einen Dev-Server mit Hot-Reload startet), bekommt Modul-Semantik, die der
   Code nie verlangt hat, und im Zweifel Fehler aus dem Bundler statt aus dem
   Spiel. Dieser Server liefert die Dateien einfach aus.                       */
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');

var WURZEL = path.join(__dirname, '..');
var PORT = parseInt(process.argv[2] || '8080', 10);
var TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

http.createServer(function (req, res) {
  var pfad = decodeURIComponent(req.url.split('?')[0]);
  if (pfad === '/') pfad = '/index.html';
  /* Nicht aus dem Projektordner herausdienen — auch ein Entwicklungsserver
     sollte keinen Pfad nach oben zulassen. */
  var datei = path.join(WURZEL, path.normalize(pfad));
  if (datei.indexOf(WURZEL + path.sep) !== 0) {
    res.writeHead(403); res.end('verboten'); return;
  }
  fs.readFile(datei, function (err, inhalt) {
    if (err) { res.writeHead(404); res.end('nicht gefunden: ' + pfad); return; }
    res.writeHead(200, {
      'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream',
      /* Kein Cache: sonst sieht man seine eigenen Änderungen nicht. */
      'Cache-Control': 'no-store'
    });
    res.end(inhalt);
  });
}).listen(PORT, '127.0.0.1', function () {
  console.log('Tensura Guild läuft auf http://localhost:' + PORT + '/');
  console.log('Beenden mit Strg+C.');
});
