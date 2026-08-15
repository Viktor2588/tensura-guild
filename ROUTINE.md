# Routine: Ideen fuer AAA-Spielgefuehl

Diese Datei wird von einer geplanten Routine gefuehrt (Recherche zu Polish,
Gamefeel, Assets, Audio, UI/UX). Pro Lauf kommt genau eine neue Idee ans Ende,
danach werden alle offenen Punkte abgearbeitet oder mit Begruendung offen
gelassen.

- [x] Prozedurale Kampf-Audio ohne Audiodateien - Das Spiel hat aktuell
      ueberhaupt keinen Ton (`grep -i audio/sound` in `js/` liefert nichts).
      Neues Modul `js/audio.js` synthetisiert alle Kampfgeraeusche direkt mit
      der Web Audio API (Oszillatoren + gefiltertes Rauschen, keine
      Binaerdateien, keine neue Abhaengigkeit) und haengt sich an denselben
      Log-Typ/Beat aus `js/regie.js` (`hit`, `heal`, `death`, `verwandlung`,
      `end`, …), den `js/ui.js` in `zeige()` schon fuer die 2.5D-Ansicht
      auswertet. Dazu ein Ein/Aus-Schalter im Menue (`index.html`,
      `style.css`) nach demselben Muster wie „Effekte", persistiert in
      `localStorage` als `tensura-audio`.

      Umgesetzt: `js/audio.js` (neu), Skript-Tag in `index.html`, Menü-Zeile
      „Ton: An/Aus" in `index.html`/`style.css`, Anbindung in `js/ui.js`
      (`zeige()` ruft `Klang.spiele()`, zentraler Klick-Dispatcher ruft
      `Klang.entsperren()` gegen die Autoplay-Sperre der Browser). Ohne
      `AudioContext` (jsdom im UI-Test) bleibt `Klang.verfuegbar()` false und
      alles no-op — dafür musste `dev/uitest.js` um `js/audio.js` in der
      Skriptliste ergänzt werden. `node dev/sim.js` 459/459 ·
      `node dev/uitest.js` 112/112 · `npm test` (inkl. `dev/bildcheck.js
      --selftest`) grün. Kein Eingriff an Kampf-Logik oder Balance.
