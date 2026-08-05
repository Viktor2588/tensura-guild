# Routine: AAA-Gamefeel

Ideen aus der wiederkehrenden Recherche-Routine, wie das Spiel sich mehr wie
ein poliertes, handcraftedes Produkt anfühlt statt wie ein Prototyp — Modelle,
Assets, Sprites, Animation, UI/UX, Audio, Gamefeel. Format: siehe CLAUDE.md /
den Routine-Auftrag. Jeder Durchlauf hängt genau eine neue Idee an und
arbeitet danach alle offenen ab.

- [x] Prozedurale Kampf-Soundeffekte (Web Audio API) - Das Spiel hat bislang keinerlei Ton: `js/fx.js` gibt dem Kampf Bloom und Zeitlupe, aber jeder Treffer, Tod, Zauber und Sieg bleibt stumm. Ein neues `js/klang.js` synthetisiert alle Effekte zur Laufzeit aus Oszillatoren und gefiltertem Rauschen (keine Audiodateien, kein Lizenzthema, passt zum Offline-Anspruch aus ASSETS.md), gehängt an dieselben Log-Ereignisse und Regie-Beats, die `js/ui.js`/`js/regie.js` schon fürs Brett auswerten. (Umgesetzt: `js/klang.js` neu, Hook in `js/ui.js` `schritt()`, Lautstärke-Umschalter im Menü wie beim Effekte-Regler, Tests in `dev/sim.js`. In einem echten Browser per Playwright geprüft: Ton löst beim Durchklicken von Draft und Kampf tatsächlich aus, `npm test` bleibt grün.)
