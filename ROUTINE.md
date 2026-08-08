# Tensura Guild — Routine: AAA-Politur

Ideenliste einer wiederkehrenden Routine, die nach mehr Politur sucht — ein
handcrafted, pixel-perfekter AAA-Look: Modelle, Assets, Sprites, Animationen,
UI/UX, Audio, Gamefeel. Jede Ausführung hängt genau eine neue Idee an und
arbeitet danach alle offenen Punkte ab.

- [x] Audio-Feedback-System - Das Spiel war komplett stumm: kein `<audio>`-Tag
      und keine einzige Sounddatei im ganzen Projekt, obwohl GAMEGUIDE.md dem
      Kampf schon Farbe, Bloom und Zeitlupe gibt. Umgesetzt als
      `js/audio.js`: eine Web-Audio-API-Klangkulisse, die jeden Ton zur
      Laufzeit synthetisiert (Oszillatoren plus Hüllkurve, gefiltertes
      Rauschen für Brand/Donner) statt Sounddateien einzukaufen — keine neue
      Abhängigkeit, keine Lizenzfrage, kein Asset-Ordner. Eingehängt in
      `js/ui.js`: ein Klang je Kampflog-Ereignis (Treffer, Heilung, jedes
      Schlüsselwort mit eigener Klangfarbe, Tod, Wiederbelebung, Entladung,
      Verwandlung, Resonanz), ein Sieg-/Niederlage-Jingle am Kampfende, ein
      leiser Klick auf jeden `[data-a]`-Knopf, ein Kauf-Chime im Markt und ein
      Aufstiegs-Chime bei der Passivwahl. Dazu ein Stumm-Schalter (🔊/🔇) in
      der Kopfzeile, Zustand in `localStorage` gemerkt wie Tempo und
      Effektstufe. `dev/uitest.js` lädt `js/audio.js` jetzt mit; da jsdom
      keine `AudioContext` kennt, bleiben alle Aufrufe stille No-ops — dieselbe
      Rückfallregel wie bei `Brett3D.verfuegbar()`.
