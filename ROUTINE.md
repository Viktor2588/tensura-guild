# ROUTINE — Ideen für AAA-Spielgefühl

Automatisch geführte Liste (siehe `CLAUDE.md`). Pro Lauf kommt genau eine neue
Idee ans Ende, danach werden alle offenen Punkte abgearbeitet oder mit
Begründung offen gelassen.

- [x] Prozedurales Sound-Design für Kampf und UI - Das Spiel ist komplett stumm: keine Audiodatei, kein `js/*.js` erzeugt oder spielt Ton. Neue Datei `js/ton.js` synthetisiert kurze Effekte zur Laufzeit über die Web Audio API (Oszillatoren, gefiltertes Rauschen — keine Sample-Dateien, passt zur bestehenden Linie aus `ASSETS.md`, prozedural statt fremdes Material zu laden) für Treffer, große/tödliche Treffer, Tod, Heilung, Schild, Fähigkeiten-Einsatz, Sieg/Niederlage und UI-Klicks. Eingehängt wird in `js/ui.js` (`schritt()`/`zeige()` für die Kampf-Beats aus `js/regie.js`, der zentrale Klick-Dispatcher `klick()` für UI), dazu ein Ein/Aus-Schalter in `index.html` (`#menu-ton`, analog zu `#menu-effekte`) und passendes CSS in `style.css`.
  Umgesetzt: `js/ton.js` (neu), eingehängt in `js/ui.js` (`spieleTon()` neben `zeige()`, `Ton.klick()` im zentralen Klick-Dispatcher, Sieg/Niederlage-Fanfare in `endeReplay()`), Schalter `#menu-ton` in `index.html` + CSS in `style.css`, Skriptliste in `dev/uitest.js` ergänzt. Geprüft: `dev/sim.js` 443/443, `dev/uitest.js` 104/104, und ein echter Kampf lief in Chromium (Playwright) durch — alle `Ton.*`-Funktionen laufen ohne Fehler, keine neuen Konsolenfehler.
