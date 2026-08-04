# Routine-Ideen: AAA-Gamefeel

Diese Datei sammelt Ideen für ein poliertes, handcraftetes Spielgefühl
(Modelle, Assets, Sprites, Animationen, UI/UX, Audio, Gamefeel). Jede
Ausführung der Routine hängt **genau eine** neue Idee ans Ende an und
arbeitet danach alle noch offenen Punkte ab.

- [x] Synthetische Kampf-Sounds für Gamefeel - Das Spiel hat bislang kein einziges Audio-Feedback (kein `Audio`/`AudioContext` irgendwo im Code) — ein Treffer, eine Heilung oder ein Todesstoß laufen komplett stumm ab, obwohl das Brett (`js/brett3d.js`, `js/fx.js`) und die Regie (`js/regie.js`) Höhepunkte längst kennen. Neues `js/audio.js` erzeugt kurze Klänge per Web-Audio-API-Synthese (Oszillatoren, Rauschstoß) statt Sample-Dateien — keine Lizenzfrage, kein neuer Asset-Ordner, kein Netzzugriff. Eingehängt wird es in `schritt()` (`js/ui.js`), das je Log-Eintrag ohnehin schon `zeige(l, p.beat)` aufruft. Ein Ton-An/Aus-Schalter kommt ins Menü (`index.html`), gemerkt wie `tensura-effekte` per `localStorage`.
  Umgesetzt: `js/audio.js` neu (Oszillator- und Rauschsynthese für hit/heal/death/aktiv/schild/status/chaos/fehlschlag/ausweichen/wut/kombi/entladung/verwandlung/revive, gewichtet nach `beat` aus `js/regie.js`). Eingehängt in `js/ui.js` (`schritt()` ruft `Ton.spiele(l, p.beat)`, `klick()` ruft `Ton.entsperren()` gegen die Autoplay-Sperre, neue Aktion `ton` plus `zeigeTonwahl()`). Menüzeile „Ton: An/Aus" in `index.html`, Stil in `style.css` (`#menu-ton`), Skript in `index.html` und `dev/uitest.js` eingebunden. `dev/sim.js` 443/443, `dev/uitest.js` 104/104 (jsdom kennt `AudioContext` nicht — `Ton` fällt dort auf einen stillen No-Op zurück, geprüft durch die weiterhin grünen Läufe).
