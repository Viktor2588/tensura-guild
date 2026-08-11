# Routine: Ideen fuer AAA-Gamefeel

Diese Datei sammelt Ideen fuer poliertes Gamedesign, handcrafted Look, Assets,
Animationen, UI/UX, Audio und Gamefeel — angelehnt an `PLAN.md` und
`TODO.md`, aber als eigene, kleinteilige Liste fuer wiederkehrende
Verbesserungsdurchlaeufe.

Jeder Durchlauf haengt genau eine neue Idee an und setzt danach alle noch
offenen Punkte um, soweit sinnvoll machbar.

## Ideen

- [x] Prozedurales Sounddesign fuer Kampf und UI - Das Spiel hat aktuell keinerlei Audio: kein Treffer-Sound, kein Sieg-Jingle, kein Klick-Feedback, obwohl die Regie (`js/regie.js`) und das 2.5D-Brett (`js/brett3d.js`, `js/fx.js`) Kampf-Hoehepunkte schon als "Beats" kennen. Ein neues Modul `js/ton.js` synthetisiert kurze Klaenge zur Laufzeit per Web Audio API (Oszillatoren, gefiltertes Rauschen) — keine Audiodateien, keine neue Abhaengigkeit, offline lauffaehig. Betroffen: `js/ton.js` (neu), `js/ui.js` (Einbindung an den bestehenden Kampf-Beats in `schritt()`/`endeReplay()` sowie am zentralen Klick-Dispatcher), `index.html` (Skripteinbindung + Menue-Schalter "Ton"), `style.css` (Schalter-Stil), `ASSETS.md` (Dokumentation der Provenienz-Entscheidung).
