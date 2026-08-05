# Routine — Ideen für AAA-Gefühl

Automatisch geführte Liste (siehe Aufgabenbeschreibung der Routine). Pro
Ausführung kommt genau eine neue Idee ans Ende, danach werden alle offenen
Punkte durchgearbeitet und abgehakt oder mit Begründung offen gelassen.

- [x] Prozedurale Sound-Engine für Kampf-SFX (Web Audio API) - Das Spiel hat
  keinerlei Ton, obwohl Kampfregie (`js/regie.js`), Bühne (`js/brett3d.js`)
  und Nachbearbeitung (`js/fx.js`) seit Phase 54-60 spürbar an Filmsprache
  gearbeitet haben. Neue Datei `js/audio.js` (`Ton`) synthetisiert Treffer,
  Signaturen (nach Schlüsselwort-Form wie `FORM` in `js/brett3d.js`),
  Heilung, Schild, Ausweichen, Tod, Wiederbelebung, Verwandlung und
  Sieg/Niederlage rein aus Oszillatoren und gefiltertem Rauschen — keine
  Audiodatei, kein Lizenzrisiko, passt zum Offline-Anspruch. Eingehängt in
  `js/ui.js` (`schritt()`, neben `zeige()`), Menü-Schalter „Ton: An/Aus" in
  `index.html`/`style.css`, dokumentiert in `ASSETS.md`.
  Umgesetzt: `js/audio.js` neu, `js/ui.js` (Wiedergabe-Hook, Klick-Freischaltung,
  Menü-Schalter), `index.html` (Script-Tag, Menüzeile), `style.css`
  (`#menu-ton`), `dev/uitest.js` (Skriptliste ergänzt), `ASSETS.md`
  (Abschnitt „Klang"). Getestet: `dev/sim.js` 443/443, `dev/uitest.js`
  104/104, sowie ein Playwright-Rundgang (Menü öffnen, Ton umschalten, Lauf
  starten, Kampf antriggern) ohne neue Konsolenfehler — nur die erwarteten
  404 der fehlenden Platzhalterbilder.
