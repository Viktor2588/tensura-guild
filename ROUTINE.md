# Routine — Ideen für AAA-Gamefeel

Automatisch gepflegte Liste. Jede Ausführung hängt genau eine neue Idee an
und arbeitet danach alle offenen Punkte ab (siehe CLAUDE.md).

- [x] Prozedurales Sound-Design für Kampf und Ergebnis - Neue `js/ton.js` synthetisiert Sound-Effekte zur Laufzeit per Web Audio API (kein Audio-Asset nötig, keine neue Abhängigkeit): Treffer (Lautstärke/Klang nach Schadensanteil), Tod, Heilung, Signatureinsatz (Klangfarbe nach Schlüsselwort-Kategorie: Feuer/Eis/Gift/Schild/Licht/Schatten/Blitz/Standard) sowie Sieg- und Niederlage-Fanfare. Einbindung in `js/ui.js` (`schritt()`/`endeReplay()`), eigener Lautstärke-Regler analog zum Effekte-Schalter in `index.html`/`style.css` (`Ton: Voll/Leise/Aus`, gespeichert unter `tensura-ton`).
