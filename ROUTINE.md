# Routine: AAA-Politur

Ideen fuer ein poliertes, handcraftetes AAA-Spielgefuehl — Gamedesign, Assets,
Sprites, Animation, UI/UX, Audio, Gamefeel. Diese Datei wird von einer
automatisierten Routine gepflegt: **je Ausfuehrung genau ein neuer Punkt am
Ende**, danach werden alle offenen Punkte abgearbeitet oder mit Begruendung
offen gelassen.

- [x] Klang: prozedurale Toneffekte fuer Kampf und UI - Das Spiel ist heute vollstaendig stumm (kein `AudioContext`-Aufruf im ganzen Projekt). Neues Modul `js/audio.js` erzeugt Treffer-, Heilungs-, Tod-, Signatur-, Sieg/Niederlage- und Klick-Toene zur Laufzeit aus Oszillatoren und einem Rauschpuffer (Web Audio API, keine Sample-Datei), angehaengt in `js/ui.js` an dieselbe Stelle wie die Brett-Effekte. Betrifft `js/audio.js` (neu), `js/ui.js`, `index.html`, `style.css`, `dev/uitest.js`. Umgesetzt in Phase 62 (siehe `PLAN.md`) inklusive eigenem Menu-Schalter „Ton: Voll/Sparsam/Aus".
