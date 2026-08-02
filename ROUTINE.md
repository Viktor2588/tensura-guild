# Routine: AAA-Politur

Ideenliste fuer das automatisierte AAA-Politur-Routine (siehe Scheduled Task).
Jede Ausfuehrung haengt GENAU EINE neue Idee an und arbeitet danach alle noch
offenen Punkte ab. `[x]` = umgesetzt, `[ ]` = offen (mit Begruendung, falls
nicht umsetzbar).

- [x] Prozedurale Sound-Effekte per Web Audio API - Das Spiel hat aktuell null Audio (kein `<audio>`, kein Sound-Code in js/). Ein neues `js/audio.js` synthetisiert kurze SFX zur Laufzeit (Oszillatoren/Noise, keine Binaerdateien, passt zum bisherigen Muster "kein Bauschritt, keine Abhaengigkeiten") fuer Treffer, Heilung, Schild, Tod, Sieg/Niederlage und Signaturen - gekoppelt an dieselben Schluesselwoerter wie `FARBE` in `js/brett3d.js`. Dazu ein Stumm-Schalter im HUD (`index.html`), persistiert wie der Debug-Schalter in `js/ui.js` per `localStorage`.
