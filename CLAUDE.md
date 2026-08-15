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

### Kein Audio, auch kein prozedurales

**Wir brauchen keine Musik und keine Audio-Dateien — und ebenso wenig
prozedural generierten Klang.** Nicht bauen, nicht vorschlagen, nicht als
offenen Punkt fuehren:

- keine Musik und keine Soundeffekte, weder als Datei noch synthetisiert
- kein `js/audio.js`, kein Web-Audio-Modul, kein Ton-Schalter im Menue
- keine Routine-Idee zum Thema Audio/Klang/Sounddesign

Dass eine Loesung "ohne Binaerdateien" auskommt (Oszillatoren, gefiltertes
Rauschen, Web Audio API), ist **kein** Argument dafuer — abgelehnt ist der Ton,
nicht das Dateiformat. Begruendung in `PLAN.md`, Abschnitt 6 (Abgrenzung).

Wenn eine Recherche "das Spiel ist komplett stumm" als Luecke meldet: das ist
der Sollzustand, kein Fund. Punkt streichen, naechste Idee nehmen.
