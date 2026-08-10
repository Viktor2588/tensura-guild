# Routine: AAA-Politur

Ideenliste einer automatisierten Routine, die das Spielgefühl in Richtung
"AAA" schärfen soll — Gamedesign, Assets/Sprites, Animation, UI/UX, Audio,
Gamefeel. Jede Ausführung hängt genau eine neue Idee ans Ende an und arbeitet
danach alle noch offenen Punkte ab. `- [ ]` = offen, `- [x]` = erledigt (mit
kurzer Notiz, was gebaut wurde), unmarkiert mit Begründung = bewusst
zurückgestellt.

- [x] Kampfton (prozedural, keine Audiodatei) - Bis heute ist das Spiel komplett stumm; bei einem so ausgearbeiteten visuellen Beat-System (Kamera, Bloom, Hitstop, Zeitlupe in `js/regie.js`/`js/brett3d.js`) ist Stille die größte verbleibende Lücke zu einem AAA-Gefühl. Neues Modul `js/ton.js` synthetisiert über die Web Audio API (Oszillatoren + gefiltertes Rauschen) Treffer-, Heilungs-, Tod- und Signatur-Töne, angebunden an dieselbe Stelle wie das Brett (`zeige()`/neue `hoere()`-Funktion in `js/ui.js`), inklusive An/Aus-Schalter im Menü (`index.html`, `style.css`). Umgesetzt: `js/ton.js` neu, Verdrahtung in `js/ui.js` (Aufruf `hoere()` in `schritt()`, Menüaktion `ton`, `localStorage`-Persistenz wie bei der Effektstufe), Skript-Einbindung in `index.html` und `dev/uitest.js`, Provenienz in `ASSETS.md` dokumentiert (kein externes Asset — Code ist die Quelle). Getestet: `npm test` (459/459 · 112/112 · 6/6) und ein Playwright-Rauchtest über einen echten Kampf ohne Konsolenfehler.
