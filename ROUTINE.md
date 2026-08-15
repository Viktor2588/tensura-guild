# Routine: AAA-Politur

Ideenliste fuer das automatisierte AAA-Politur-Routine (siehe Scheduled Task).
Jede Ausfuehrung haengt GENAU EINE neue Idee an und arbeitet danach alle noch
offenen Punkte ab. `[x]` = umgesetzt, `[ ]` = offen (mit Begruendung, falls
nicht umsetzbar).

- [x] Prozedurale Sound-Effekte per Web Audio API - Das Spiel hat aktuell null Audio (kein `<audio>`, kein Sound-Code in js/). Ein neues `js/audio.js` synthetisiert kurze SFX zur Laufzeit (Oszillatoren/Noise, keine Binaerdateien, passt zum bisherigen Muster "kein Bauschritt, keine Abhaengigkeiten") fuer Treffer, Heilung, Schild, Tod, Sieg/Niederlage und Signaturen - gekoppelt an dieselben Schluesselwoerter wie `FARBE` in `js/brett3d.js`. Dazu ein Stumm-Schalter im HUD (`index.html`), persistiert wie der Debug-Schalter in `js/ui.js` per `localStorage`.
# Routine: Ideen fürs AAA-Gefühl

Diese Datei sammelt Ideen für Politur — Gamedesign, Assets, Sprites, Animation,
UI/UX, Audio, Gamefeel. Jede automatische Ausführung hängt **eine** neue Idee an
und arbeitet dann alle offenen Punkte ab, so gut es geht. Offene Punkte bleiben
offen mit Begründung; erledigte werden mit `[x]` markiert.

- [x] Prozedurale Klang-Kulisse (SFX) fürs Kampf-Replay - Das Spiel ist komplett stumm; kein `<audio>`, kein Web-Audio-Code. Ein neues `js/audio.js` (Modul `SFX`, wie `RNG`/`Brett3D` per `globalThis` eingehängt) erzeugt Treffer-, Heilungs-, Tod-, Schild- und Signatur-Klänge rein prozedural über die Web Audio API (Oszillatoren/Rauschen, keine Audiodateien, keine neue Abhängigkeit) und ordnet sie wie `FARBE` in `js/brett3d.js` den Schlüsselwörtern zu. Eingehängt wird das in `js/ui.js` (`anwenden()`, `endeReplay()`, `klick()`), dazu ein Stumm-Knopf im HUD (`index.html`, `style.css`).
# ROUTINE — Ideen für AAA-Spielgefühl

Automatisch geführte Liste (siehe `CLAUDE.md`). Pro Lauf kommt genau eine neue
Idee ans Ende, danach werden alle offenen Punkte abgearbeitet oder mit
Begründung offen gelassen.

- [x] Prozedurales Sound-Design für Kampf und UI - Das Spiel ist komplett stumm: keine Audiodatei, kein `js/*.js` erzeugt oder spielt Ton. Neue Datei `js/ton.js` synthetisiert kurze Effekte zur Laufzeit über die Web Audio API (Oszillatoren, gefiltertes Rauschen — keine Sample-Dateien, passt zur bestehenden Linie aus `ASSETS.md`, prozedural statt fremdes Material zu laden) für Treffer, große/tödliche Treffer, Tod, Heilung, Schild, Fähigkeiten-Einsatz, Sieg/Niederlage und UI-Klicks. Eingehängt wird in `js/ui.js` (`schritt()`/`zeige()` für die Kampf-Beats aus `js/regie.js`, der zentrale Klick-Dispatcher `klick()` für UI), dazu ein Ein/Aus-Schalter in `index.html` (`#menu-ton`, analog zu `#menu-effekte`) und passendes CSS in `style.css`.
  Umgesetzt: `js/ton.js` (neu), eingehängt in `js/ui.js` (`spieleTon()` neben `zeige()`, `Ton.klick()` im zentralen Klick-Dispatcher, Sieg/Niederlage-Fanfare in `endeReplay()`), Schalter `#menu-ton` in `index.html` + CSS in `style.css`, Skriptliste in `dev/uitest.js` ergänzt. Geprüft: `dev/sim.js` 443/443, `dev/uitest.js` 104/104, und ein echter Kampf lief in Chromium (Playwright) durch — alle `Ton.*`-Funktionen laufen ohne Fehler, keine neuen Konsolenfehler.
Ideen fuer ein poliertes, handcraftetes AAA-Spielgefuehl — Gamedesign, Assets,
Sprites, Animation, UI/UX, Audio, Gamefeel. Diese Datei wird von einer
automatisierten Routine gepflegt: **je Ausfuehrung genau ein neuer Punkt am
Ende**, danach werden alle offenen Punkte abgearbeitet oder mit Begruendung
offen gelassen.

- [x] Klang: prozedurale Toneffekte fuer Kampf und UI - Das Spiel ist heute vollstaendig stumm (kein `AudioContext`-Aufruf im ganzen Projekt). Neues Modul `js/audio.js` erzeugt Treffer-, Heilungs-, Tod-, Signatur-, Sieg/Niederlage- und Klick-Toene zur Laufzeit aus Oszillatoren und einem Rauschpuffer (Web Audio API, keine Sample-Datei), angehaengt in `js/ui.js` an dieselbe Stelle wie die Brett-Effekte. Betrifft `js/audio.js` (neu), `js/ui.js`, `index.html`, `style.css`, `dev/uitest.js`. Umgesetzt in Phase 62 (siehe `PLAN.md`) inklusive eigenem Menu-Schalter „Ton: Voll/Sparsam/Aus“.
