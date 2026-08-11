# ROUTINE — Ideen fuer AAA-Gamefeel

Diese Datei speist eine wiederkehrende, automatisierte Aufgabe: pro Lauf kommt
**genau eine** neue Idee ans Ende der Liste, danach werden alle offenen Punkte
(`- [ ]`) durchgearbeitet und, soweit sinnvoll umsetzbar, erledigt (`- [x]`).
Nicht umgesetzte Punkte bleiben offen, mit einer kurzen Begruendung dahinter.

Ziel ist ein poliertes, handcraftedes Spielgefuehl: Modelle, Assets, Sprites,
Animationen, UI/UX, Audio, Gamefeel. Neue Ideen sollen konkret genug sein, um
in einem einzelnen Lauf umgesetzt zu werden, und zu bestehenden Mustern
passen (`js/brett3d.js`, `js/fx.js`, `js/regie.js`, `js/ui.js`, `style.css`).

## Ideen

- [x] Ein Sound-System aus synthetisierten Effekten (Web Audio API) fuer Kampf und UI - Das Spiel ist komplett stumm; kein `<audio>`, keine Sounddatei im Repo. Ein neues `js/audio.js` erzeugt Toene und Impact-Sounds zur Laufzeit per Web Audio API (Oszillatoren, Rauschpuffer, Huellkurven) - ohne externe Assets, passend zum Offline-Anspruch des Projekts. Hook in `js/ui.js` an der Stelle, an der `Brett3D.effekt`/`Brett3D.treffer` schon aus dem Kampflog gespeist werden (`zeige(l, beat)`), dazu ein paar UI-Klicks und ein Sieg/Niederlage-Stinger. Eine Lautstaerke-Stufe (Voll/Leise/Aus) gehoert wie „Effekte" ins Menue und nach `localStorage`.
      Umgesetzt: `js/audio.js` (neues Modul `Klang`, keine neue Abhaengigkeit), Hook in `js/ui.js` `schritt()`
      (`Klang.spiele(l, p.beat)`, unabhaengig von `Brett3D.verfuegbar()`, laeuft also auch mit der
      SVG-Rueckfallebene), Sieg/Niederlage-Stinger in `endeReplay()`, Kauf-Klang und ein genereller
      UI-Klick im zentralen `klick()`-Dispatcher, Freigabe des AudioContext bei der ersten Nutzergeste.
      Menue-Reihe „Ton: Voll/Leise/Aus" in `index.html` neben „Effekte", Zustand in `localStorage`
      (`tensura-audio`) wie beim Effekte-Schalter. `dev/uitest.js` laedt `js/audio.js` mit (jsdom kennt
      kein `AudioContext`, `Klang.verfuegbar()` ist dort false, jeder Aufruf ein No-Op). Getestet mit
      `npm test` (459/459 · 112/112 · 6/6) und zusaetzlich per Playwright/Chromium durch einen echten,
      nicht uebersprungenen Kampf gefahren — keine Laufzeitfehler, `Klang.verfuegbar()` liefert dort
      `true`.
