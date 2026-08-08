# Routine: AAA-Politur

Diese Datei sammelt Ideen fuer ein poliertes, handcrafted Spielgefuehl —
Modelle, Assets, Sprites, Animationen, UI/UX, Audio, Gamefeel. Eine
automatisierte Routine haengt hier pro Lauf **genau eine** neue Idee an und
arbeitet danach alle offenen Punkte ab, so weit sinnvoll machbar.

- [x] Prozedurale Sound-Engine (Web Audio API) fuer Kampf-Feedback - Das Spiel ist bis heute komplett stumm (kein `<audio>`, kein Web-Audio-Code in `js/`). Ein neues `js/audio.js` synthetisiert Toene zur Laufzeit ueber Oszillatoren und einen Rauschpuffer — Treffer, Heilung, Tod, Signatureinsatz, Schild, Status, Ausweichen, Wiederbelebung, Entladung, Kombi, Verwandlung, Wut, Fehlschlag sowie ein Sieg-/Niederlage-Stinger — angebunden in `js/ui.js` an der Stelle, an der `Regie.zeitplan` ohnehin schon Beats kennt. Keine Audiodateien, keine neue Abhaengigkeit, ein Ton-Ein/Aus-Schalter im Menue (`index.html`, mit `localStorage`-Merker wie bei Tempo/Effekte).
