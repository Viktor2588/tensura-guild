# Routine-Ideen: AAA-Gamefeel

Diese Datei sammelt Ideen aus der automatisierten Polish-Routine (siehe
Scheduler-Prompt), eine pro Ausführung. Offene Punkte werden bei jedem Lauf
abgearbeitet oder mit Begründung offen gelassen.

- [x] Prozedurale Sound-Kulisse für Kampf und UI - `js/ton.js` (neu) erzeugt Trefferschläge, Heilklänge, Sieg-/Niederlage-Fanfaren und einen UI-Klick rein per Web Audio API (Oszillatoren, Rauschpuffer, Hüllkurven) — keine Audiodateien, keine neue Abhängigkeit. Eingehängt in `js/ui.js` an `schritt()` fürs Kampflog, in `endeReplay()` fürs Ergebnis und im zentralen `klick()`-Handler für Buttons; ein Ton-Schalter (An/Aus) kommt ins Menü neben „Effekte" und wird wie `tensura-effekte` in `localStorage` gemerkt.
      Umgesetzt: `js/ton.js` neu, eingebunden in `index.html`, verdrahtet in `js/ui.js` (`schritt()`, `endeReplay()`, `klick()`, Menü-Reihe „Ton"). `dev/uitest.js` um `js/ton.js` in der Skriptliste ergänzt, `dev/sim.js` 459/459 und `dev/uitest.js` 112/112 grün. In `ASSETS.md` dokumentiert (kein Audio-Ordner nötig, da rein synthetisch).
