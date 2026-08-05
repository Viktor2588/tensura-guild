# Routine — AAA-Politur

Automatisch geführte Ideenliste für Gamefeel, Polish und handcrafted
Look&Feel. Regeln siehe die auslösende Routine: pro Lauf genau eine neue
Idee anhängen, danach alle offenen Punkte abarbeiten oder begründet offen
lassen.

- [x] Sounddesign per Web Audio API — `js/klang.js` (neu): prozedurale SFX
  (Oszillatoren + gefiltertes Rauschen, keine Audiodateien) für Treffer,
  Tod, Signatur-Einsatz, Heilung, Wiederbelebung, Entladung, Verwandlung,
  Zustandskombination, Ausweichen, Fehlschlag und UI-Klicks. Angebunden in
  `js/ui.js` (`klingt()`, aufgerufen aus `schritt()` neben `zeige()`; ein
  `Klang.wecken()`+`Klang.spiele('ui')` im globalen `klick()`-Handler). Die
  sechs Grundformen (geschoss/strahl/klinge/welle/saeule/schleier) spiegeln
  die `FORM`-Tabelle aus `js/brett3d.js` (Phase 57), damit ein Blitz genauso
  klingt wie er blitzt. Ein/Aus-Schalter „Ton" im Menü neben „Effekte",
  gemerkt in `localStorage` (`tensura-klang`). `index.html` bindet
  `js/klang.js` ein, `dev/uitest.js` läuft es mit. Umgesetzt — keine neuen
  Assets, da Ton komplett prozedural erzeugt wird (siehe `ASSETS.md`).
