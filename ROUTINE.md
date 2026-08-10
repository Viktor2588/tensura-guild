# Routine: AAA-Politur

Ideen, die den Weg zu einem polierten, handcrafted AAA-Gefühl beschreiben —
Gamedesign, Assets, Sprites, Animationen, UI/UX, Audio, Gamefeel. Eine Idee je
Ausführung wird angehängt; offene Punkte (`- [ ]`) werden bei der nächsten
Gelegenheit umgesetzt oder mit einer kurzen Begründung offen gelassen.

- [x] Prozedurale Kampf- und UI-Klangkulisse - Das Spiel ist bisher komplett stumm: kein `<audio>`, kein Sound-Code, nirgends. Neue Datei `js/audio.js` (`root.Klang`) erzeugt Treffer-, Heil-, Tod-, Wiederbelebungs-, Signatur-, Status- und Schild-Töne per WebAudio-Synthese (Oszillatoren, gefiltertes Rauschen, Hüllkurven) — keine Audiodateien, also kein neuer Assettyp und keine ASSETS.md-Herkunftszeile nötig. Eingehängt in `js/ui.js` (`schritt()` für Kampfereignisse, `klick()` für UI-Klicks) und `index.html` (Script-Tag, neue Menüzeile „Ton: Voll/Sparsam/Aus" analog zur bestehenden Effektstufe).
