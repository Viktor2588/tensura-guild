# Routine: AAA-Politur

Ideenliste fuer das automatisierte AAA-Politur-Routine (siehe Scheduled Task).
Jede Ausfuehrung haengt GENAU EINE neue Idee an und arbeitet danach alle noch
offenen Punkte ab. `[x]` = umgesetzt, `[ ]` = offen (mit Begruendung, falls
nicht umsetzbar).

- [x] Prozedurale Sound-Effekte per Web Audio API - Das Spiel hat aktuell null Audio (kein `<audio>`, kein Sound-Code in js/). Ein neues `js/audio.js` synthetisiert kurze SFX zur Laufzeit (Oszillatoren/Noise, keine Binaerdateien, passt zum bisherigen Muster "kein Bauschritt, keine Abhaengigkeiten") fuer Treffer, Heilung, Schild, Tod, Sieg/Niederlage und Signaturen - gekoppelt an dieselben Schluesselwoerter wie `FARBE` in `js/brett3d.js`. Dazu ein Stumm-Schalter im HUD (`index.html`), persistiert wie der Debug-Schalter in `js/ui.js` per `localStorage`.
# Routine: Ideen fürs AAA-Gefühl

Diese Datei sammelt Ideen für Politur — Gamedesign, Assets, Sprites, Animation,
UI/UX, Audio, Gamefeel. Jede automatische Ausführung hängt **eine** neue Idee an
und arbeitet dann alle offenen Punkte ab, so gut es geht. Offene Punkte bleiben
offen mit Begründung; erledigte werden mit `[x]` markiert.

- [x] Prozedurale Klang-Kulisse (SFX) fürs Kampf-Replay - Das Spiel ist komplett stumm; kein `<audio>`, kein Web-Audio-Code. Ein neues `js/audio.js` (Modul `SFX`, wie `RNG`/`Brett3D` per `globalThis` eingehängt) erzeugt Treffer-, Heilungs-, Tod-, Schild- und Signatur-Klänge rein prozedural über die Web Audio API (Oszillatoren/Rauschen, keine Audiodateien, keine neue Abhängigkeit) und ordnet sie wie `FARBE` in `js/brett3d.js` den Schlüsselwörtern zu. Eingehängt wird das in `js/ui.js` (`anwenden()`, `endeReplay()`, `klick()`), dazu ein Stumm-Knopf im HUD (`index.html`, `style.css`).
# ROUTINE — Ideen für AAA-Spielgefühl

Automatisch geführte Liste (siehe `CLAUDE.md`). Pro Lauf kommt genau eine neue
Idee ans Ende, danach werden alle offenen Punkte abgearbeitet oder mit
Begründung offen gelassen.

- [x] Prozedurales Sound-Design für Kampf und UI - Das Spiel ist komplett stumm: keine Audiodatei, kein `js/*.js` erzeugt oder spielt Ton. Neue Datei `js/ton.js` synthetisiert kurze Effekte zur Laufzeit über die Web Audio API (Oszillatoren, gefiltertes Rauschen — keine Sample-Dateien, passt zur bestehenden Linie aus `ASSETS.md`, prozedural statt fremdes Material zu laden) für Treffer, große/tödliche Treffer, Tod, Heilung, Schild, Fähigkeiten-Einsatz, Sieg/Niederlage und UI-Klicks. Eingehängt wird in `js/ui.js` (`schritt()`/`zeige()` für die Kampf-Beats aus `js/regie.js`, der zentrale Klick-Dispatcher `klick()` für UI), dazu ein Ein/Aus-Schalter in `index.html` (`#menu-ton`, analog zu `#menu-effekte`) und passendes CSS in `style.css`.
  Umgesetzt: `js/ton.js` (neu), eingehängt in `js/ui.js` (`spieleTon()` neben `zeige()`, `Ton.klick()` im zentralen Klick-Dispatcher, Sieg/Niederlage-Fanfare in `endeReplay()`), Schalter `#menu-ton` in `index.html` + CSS in `style.css`, Skriptliste in `dev/uitest.js` ergänzt. Geprüft: `dev/sim.js` 443/443, `dev/uitest.js` 104/104, und ein echter Kampf lief in Chromium (Playwright) durch — alle `Ton.*`-Funktionen laufen ohne Fehler, keine neuen Konsolenfehler.
Ideen fuer ein poliertes, handcraftetes AAA-Spielgefuehl — Gamedesign, Assets,
Sprites, Animation, UI/UX, Audio, Gamefeel. Diese Datei wird von einer
automatisierten Routine gepflegt: **je Ausfuehrung genau ein neuer Punkt am
Ende**, danach werden alle offenen Punkte abgearbeitet oder mit Begruendung
offen gelassen.

- [x] Klang: prozedurale Toneffekte fuer Kampf und UI - Das Spiel ist heute vollstaendig stumm (kein `AudioContext`-Aufruf im ganzen Projekt). Neues Modul `js/audio.js` erzeugt Treffer-, Heilungs-, Tod-, Signatur-, Sieg/Niederlage- und Klick-Toene zur Laufzeit aus Oszillatoren und einem Rauschpuffer (Web Audio API, keine Sample-Datei), angehaengt in `js/ui.js` an dieselbe Stelle wie die Brett-Effekte. Betrifft `js/audio.js` (neu), `js/ui.js`, `index.html`, `style.css`, `dev/uitest.js`. Umgesetzt in Phase 62 (siehe `PLAN.md`) inklusive eigenem Menu-Schalter „Ton: Voll/Sparsam/Aus“.
# Routine-Ideen: AAA-Gamefeel

Diese Datei sammelt Ideen für ein poliertes, handcraftetes Spielgefühl
(Modelle, Assets, Sprites, Animationen, UI/UX, Audio, Gamefeel). Jede
Ausführung der Routine hängt **genau eine** neue Idee ans Ende an und
arbeitet danach alle noch offenen Punkte ab.

- [x] Synthetische Kampf-Sounds für Gamefeel - Das Spiel hat bislang kein einziges Audio-Feedback (kein `Audio`/`AudioContext` irgendwo im Code) — ein Treffer, eine Heilung oder ein Todesstoß laufen komplett stumm ab, obwohl das Brett (`js/brett3d.js`, `js/fx.js`) und die Regie (`js/regie.js`) Höhepunkte längst kennen. Neues `js/audio.js` erzeugt kurze Klänge per Web-Audio-API-Synthese (Oszillatoren, Rauschstoß) statt Sample-Dateien — keine Lizenzfrage, kein neuer Asset-Ordner, kein Netzzugriff. Eingehängt wird es in `schritt()` (`js/ui.js`), das je Log-Eintrag ohnehin schon `zeige(l, p.beat)` aufruft. Ein Ton-An/Aus-Schalter kommt ins Menü (`index.html`), gemerkt wie `tensura-effekte` per `localStorage`.
  Umgesetzt: `js/audio.js` neu (Oszillator- und Rauschsynthese für hit/heal/death/aktiv/schild/status/chaos/fehlschlag/ausweichen/wut/kombi/entladung/verwandlung/revive, gewichtet nach `beat` aus `js/regie.js`). Eingehängt in `js/ui.js` (`schritt()` ruft `Ton.spiele(l, p.beat)`, `klick()` ruft `Ton.entsperren()` gegen die Autoplay-Sperre, neue Aktion `ton` plus `zeigeTonwahl()`). Menüzeile „Ton: An/Aus" in `index.html`, Stil in `style.css` (`#menu-ton`), Skript in `index.html` und `dev/uitest.js` eingebunden. `dev/sim.js` 443/443, `dev/uitest.js` 104/104 (jsdom kennt `AudioContext` nicht — `Ton` fällt dort auf einen stillen No-Op zurück, geprüft durch die weiterhin grünen Läufe).
# Routine — Ideen für AAA-Gamefeel

Automatisch gepflegte Liste. Jede Ausführung hängt genau eine neue Idee an
und arbeitet danach alle offenen Punkte ab (siehe CLAUDE.md).

- [x] Prozedurales Sound-Design für Kampf und Ergebnis - Neue `js/ton.js` synthetisiert Sound-Effekte zur Laufzeit per Web Audio API (kein Audio-Asset nötig, keine neue Abhängigkeit): Treffer (Lautstärke/Klang nach Schadensanteil), Tod, Heilung, Signatureinsatz (Klangfarbe nach Schlüsselwort-Kategorie: Feuer/Eis/Gift/Schild/Licht/Schatten/Blitz/Standard) sowie Sieg- und Niederlage-Fanfare. Einbindung in `js/ui.js` (`schritt()`/`endeReplay()`), eigener Lautstärke-Regler analog zum Effekte-Schalter in `index.html`/`style.css` (`Ton: Voll/Leise/Aus`, gespeichert unter `tensura-ton`).
Diese Datei sammelt Ideen fuer ein poliertes, handcrafted Spielgefuehl —
Modelle, Assets, Sprites, Animationen, UI/UX, Audio, Gamefeel. Eine
automatisierte Routine haengt hier pro Lauf **genau eine** neue Idee an und
arbeitet danach alle offenen Punkte ab, so weit sinnvoll machbar.

- [x] Prozedurale Sound-Engine (Web Audio API) fuer Kampf-Feedback - Das Spiel ist bis heute komplett stumm (kein `<audio>`, kein Web-Audio-Code in `js/`). Ein neues `js/audio.js` synthetisiert Toene zur Laufzeit ueber Oszillatoren und einen Rauschpuffer — Treffer, Heilung, Tod, Signatureinsatz, Schild, Status, Ausweichen, Wiederbelebung, Entladung, Kombi, Verwandlung, Wut, Fehlschlag sowie ein Sieg-/Niederlage-Stinger — angebunden in `js/ui.js` an der Stelle, an der `Regie.zeitplan` ohnehin schon Beats kennt. Keine Audiodateien, keine neue Abhaengigkeit, ein Ton-Ein/Aus-Schalter im Menue (`index.html`, mit `localStorage`-Merker wie bei Tempo/Effekte).
# Routine — Ideen für AAA-Gefühl

Automatisch geführte Liste (siehe Aufgabenbeschreibung der Routine). Pro
Ausführung kommt genau eine neue Idee ans Ende, danach werden alle offenen
Punkte durchgearbeitet und abgehakt oder mit Begründung offen gelassen.

- [x] Prozedurale Sound-Engine für Kampf-SFX (Web Audio API) - Das Spiel hat
  keinerlei Ton, obwohl Kampfregie (`js/regie.js`), Bühne (`js/brett3d.js`)
  und Nachbearbeitung (`js/fx.js`) seit Phase 54-60 spürbar an Filmsprache
  gearbeitet haben. Neue Datei `js/audio.js` (`Ton`) synthetisiert Treffer,
  Signaturen (nach Schlüsselwort-Form wie `FORM` in `js/brett3d.js`),
  Heilung, Schild, Ausweichen, Tod, Wiederbelebung, Verwandlung und
  Sieg/Niederlage rein aus Oszillatoren und gefiltertem Rauschen — keine
  Audiodatei, kein Lizenzrisiko, passt zum Offline-Anspruch. Eingehängt in
  `js/ui.js` (`schritt()`, neben `zeige()`), Menü-Schalter „Ton: An/Aus“ in
  `index.html`/`style.css`, dokumentiert in `ASSETS.md`.
  Umgesetzt: `js/audio.js` neu, `js/ui.js` (Wiedergabe-Hook, Klick-Freischaltung,
  Menü-Schalter), `index.html` (Script-Tag, Menüzeile), `style.css`
  (`#menu-ton`), `dev/uitest.js` (Skriptliste ergänzt), `ASSETS.md`
  (Abschnitt „Klang“). Getestet: `dev/sim.js` 443/443, `dev/uitest.js`
  104/104, sowie ein Playwright-Rundgang (Menü öffnen, Ton umschalten, Lauf
  starten, Kampf antriggern) ohne neue Konsolenfehler — nur die erwarteten
  404 der fehlenden Platzhalterbilder.
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
# Routine: AAA-Gamefeel

Ideen aus der wiederkehrenden Recherche-Routine, wie das Spiel sich mehr wie
ein poliertes, handcraftedes Produkt anfühlt statt wie ein Prototyp — Modelle,
Assets, Sprites, Animation, UI/UX, Audio, Gamefeel. Format: siehe CLAUDE.md /
den Routine-Auftrag. Jeder Durchlauf hängt genau eine neue Idee an und
arbeitet danach alle offenen ab.

- [x] Prozedurale Kampf-Soundeffekte (Web Audio API) - Das Spiel hat bislang keinerlei Ton: `js/fx.js` gibt dem Kampf Bloom und Zeitlupe, aber jeder Treffer, Tod, Zauber und Sieg bleibt stumm. Ein neues `js/klang.js` synthetisiert alle Effekte zur Laufzeit aus Oszillatoren und gefiltertem Rauschen (keine Audiodateien, kein Lizenzthema, passt zum Offline-Anspruch aus ASSETS.md), gehängt an dieselben Log-Ereignisse und Regie-Beats, die `js/ui.js`/`js/regie.js` schon fürs Brett auswerten. (Umgesetzt: `js/klang.js` neu, Hook in `js/ui.js` `schritt()`, Lautstärke-Umschalter im Menü wie beim Effekte-Regler, Tests in `dev/sim.js`. In einem echten Browser per Playwright geprüft: Ton löst beim Durchklicken von Draft und Kampf tatsächlich aus, `npm test` bleibt grün.)
