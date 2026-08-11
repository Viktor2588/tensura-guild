# Routine: AAA-Spielgefühl

Ideen fuer poliertes Gamedesign, handcrafted Look, Gamefeel, Audio, UI/UX —
gesammelt von der automatisierten Recherche-Routine. Format: `- [ ]` offen,
`- [x]` erledigt (mit kurzer Notiz, falls abgewichen wurde), unveraendert
offen mit kurzer Begruendung, warum (noch) nicht machbar.

- [x] Prozedurale Kampf-Sound-Effekte statt Stille - das Spiel hat bislang
      keine einzige Audiozeile (`grep -r Audio js/` findet nichts ausser dem
      Fremdcode). Neues `js/klang.js` synthetisiert per Web Audio API Treffer-,
      Heil-, Tod-, Wiederbelebungs- und Signatur-Cast-Sounds (nach der
      GAMEGUIDE-Einteilung Bogen/Sofort/Steigt) sowie Sieg-/Niederlage-Fanfaren
      direkt aus Oszillatoren und Rauschpuffern — keine Binärdateien, keine
      neue Abhaengigkeit. Eingehaengt in `js/ui.js` (`zeige()`, `endeReplay()`,
      `klick()`), mit Lautstaerkeregler und Stumm-Schalter im Menü neben
      „Effekte", persistiert wie `tensura-effekte` in `localStorage`.
