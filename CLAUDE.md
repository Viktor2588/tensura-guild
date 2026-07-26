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
