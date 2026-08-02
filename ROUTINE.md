# Routine: Ideen fürs AAA-Gefühl

Diese Datei sammelt Ideen für Politur — Gamedesign, Assets, Sprites, Animation,
UI/UX, Audio, Gamefeel. Jede automatische Ausführung hängt **eine** neue Idee an
und arbeitet dann alle offenen Punkte ab, so gut es geht. Offene Punkte bleiben
offen mit Begründung; erledigte werden mit `[x]` markiert.

- [x] Prozedurale Klang-Kulisse (SFX) fürs Kampf-Replay - Das Spiel ist komplett stumm; kein `<audio>`, kein Web-Audio-Code. Ein neues `js/audio.js` (Modul `SFX`, wie `RNG`/`Brett3D` per `globalThis` eingehängt) erzeugt Treffer-, Heilungs-, Tod-, Schild- und Signatur-Klänge rein prozedural über die Web Audio API (Oszillatoren/Rauschen, keine Audiodateien, keine neue Abhängigkeit) und ordnet sie wie `FARBE` in `js/brett3d.js` den Schlüsselwörtern zu. Eingehängt wird das in `js/ui.js` (`anwenden()`, `endeReplay()`, `klick()`), dazu ein Stumm-Knopf im HUD (`index.html`, `style.css`).
