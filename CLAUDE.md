## Arbeitsweise fuer Plan-Phasen

Wenn der Nutzer sagt "mach weiter mit den naechsten Phasen des Plans" oder
aehnlich, arbeite autonom an der naechsten sinnvollen offenen Phase in
`PLAN.md` oder TODO.md.

Pflichtablauf fuer jede Phase:

1. Immer in einem eigenen Git-Worktree arbeiten, niemals direkt im
   Haupt-Checkout.
   - Worktree-Schema: `/tensura/worktree/phase-<nr>-<kurzname>`
   - Branch-Schema: `phase-<nr>-<kurzname>`

2. Vor Beginn der Umsetzung `PLAN.md` aktualisieren:
   - die begonnene Phase als `[~] ... (in Bearbeitung)` markieren
   - den verwendeten Worktree nennen
   - keine Phase uebernehmen, die bereits als `[~]` markiert ist

3. Waehrend der Umsetzung:
   - bestehende Projektmuster verwenden
   - Imagegen-/Asset-Provenienz in `ASSETS.md` dokumentieren

## Nicht-Ziele

Diese Punkte sind entschieden und werden nicht neu aufgerollt. Sie gelten fuer
autonome Laeufe und geplante Routinen genauso wie fuer direkte Auftraege.

### Audio ist erledigt — `js/ton.js` und sonst nichts

Das Thema ist **abgeschlossen**, nicht offen. Genau ein Modul macht Ton:
`js/ton.js`, prozedural ueber die Web Audio API, mit Ein/Aus-Schalter im Menue
(`#menu-ton`). Das reicht, und dabei bleibt es. Nicht bauen, nicht vorschlagen,
nicht als offenen Punkt fuehren:

- keine zweite Ton-Datei — kein `js/audio.js`, `js/klang.js`, `js/sfx.js`
- keine Musik und keine Audio-Dateien; `js/ton.js` synthetisiert zur Laufzeit,
  `assets/audio/` gibt es nicht (Begruendung in `ASSETS.md`, Abschnitt Audio)
- keine Routine-Idee zum Thema Audio/Klang/Sounddesign

**Vorgeschichte, damit sie sich nicht wiederholt:** zwischen dem 2. und dem
15.8.2026 hat eine geplante Routine 21 Mal denselben Befund gemeldet ("grep -i
audio in js/ liefert nichts") und 21 Mal dasselbe Modul vorgeschlagen — PRs
#1–#9 und #12–#23. Alle 21 wurden auf `test/audio-varianten` nebeneinander
angehoert; uebernommen wurde PR #3, der Rest verworfen.

Wenn eine Recherche "das Spiel hat kaum Ton" oder "die Klangkulisse ist duenn"
als Luecke meldet: das ist der Sollzustand, kein Fund. Punkt streichen,
naechste Idee nehmen. Erweiterungen an `js/ton.js` nur auf ausdruecklichen
Zuruf, nicht aus einem autonomen Lauf heraus.
