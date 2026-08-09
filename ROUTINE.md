# Routine: AAA-Politur

Ideen aus der automatischen Recherche-Routine für ein poliertes, handcraftetes
Spielgefühl — Modelle, Assets, Sprites, Animationen, UI/UX, Audio, Gamefeel.
Pro Lauf kommt genau ein neuer Punkt dazu; offene Punkte werden beim nächsten
Lauf nach Möglichkeit umgesetzt.

- [x] Audio-Feedback für Kampf und UI - Das Spiel hat aktuell keinen einzigen Ton (kein `js/*.js` mit Sound, keine Audiodateien im Repo). Ein neues `js/klang.js` soll per Web Audio API kurze synthetisierte Effekte erzeugen (Treffer, Heilung, Tod, Signatur-Zauber je Schlüsselwort, Resonanz/Kombo, Verwandlung, Entladung, Sieg-/Niederlage-Fanfare) und in `js/ui.js` an den Wiedergabe-Schritten der Kampfanimation sowie an Button-Klicks andocken, mit einem Ein/Aus-Schalter im Menü (analog zum bestehenden "Effekte"-Schalter) und Speicherung in `localStorage`. Keine externen Audiodateien nötig, kein Bauschritt, passt zum Muster aus `js/fx.js` (eigener Shader-Code statt Fremdpaket statt fertiges Sound-Paket).
      Umgesetzt: `js/klang.js` (neu) synthetisiert alle Effekte per Oszillator/Rauschpuffer, ohne Audiodatei. In `js/ui.js` hängt eine neue Funktion `hoerbar(l, beat)` — bewusst unabhängig von `Brett3D.verfuegbar()`, damit Ton auch im SVG-Rückfall läuft — an denselben Wiedergabe-Schritt wie `zeige()`; Button-Klicks lösen `Klang.klick()` aus, Sieg/Niederlage lösen einmalig `Klang.sieg()`/`Klang.niederlage()` aus. Menü hat einen neuen Schalter "Ton: An/Aus" (`index.html`, `tensura-ton` in `localStorage`), AudioContext wird erst bei der ersten Nutzergeste erzeugt. Getestet in `dev/sim.js` (Node ohne AudioContext, alle Funktionen No-Op statt Absturz) und `dev/uitest.js` (jsdom). `npm test`: 479/479 · 114/114 · 6/6.
