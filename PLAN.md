# Tensura Guild — Plan

Roguelite-Truppenbau im *That Time I Got Reincarnated as a Slime*-Universum.
Vorbild: GUILDRUN. Kern ist **nicht** der Kampf, sondern die Kombination:
Einheiten × Fähigkeiten × Relikte × Items. Jeder Run soll eine andere Idee sein.

Verbindliche Referenz. Konzeptänderungen hier nachziehen.

## 1. Kern-Loop

```
Run-Start: 1 Start-Einheit + 1 Start-Relikt + 3 Leben
  ↓
Karte: Knoten wählen (Kampf / Elite / Shop / Event / Rast / Boss)
  ↓
Kampf: läuft automatisch ab (Spieler greift nicht ein)
  ↓
Belohnung: 1 aus 3 (Einheit | Relikt | Item | Magicule)
  ↓  → Aufstellung + Ausrüstung anpassen
  └──── zurück zur Karte, bis Boss ────→ Sieg oder Tod
  ↓
Tod: Meta-Freischaltung (neue Einheiten/Relikte in den Pool) → neuer Run
```

Die einzige Entscheidung im Kampf ist die, die **vorher** getroffen wurde. Das
zwingt die ganze Spieltiefe in Roster/Synergie/Ausrüstung — genau da, wo der
Wiederspielwert herkommt.

Ein Run: 3 Akte à ~8 Knoten, 25–35 Minuten.

## 2. Fähigkeits-System (das Herzstück)

**Eine Einheit je Art.** Slime, Goblin, Oger, Sturmwolf, Echsenmensch,
Insektoid, Dämon, Drache, Untot — von jeder genau eine im Trupp. Es gibt keine
Völker-Boni; wer einen Trupp baut, baut Fähigkeiten, keine Volkszählung.

**Ränge C → B → A → S.** Jeder Aufstieg kostet Magicule und gibt:

| Rang | Item-Slots | Aktive | Passive | Prädator |
|---|---|---|---|---|
| C | 1 | 1 (Signatur) | – | – |
| B | 2 | 2 | 1 | 1 |
| A | 3 | 3 | 2 | 2 |
| S | **5** | 4 | 3 | 3 |

Die neue aktive Fähigkeit wählt der Spieler aus drei Angeboten oder lässt den
Slot frei — dann kann ihn der Prädator füllen. Die Passiven gehören der Einheit
und schalten automatisch auf.

**Aktiv** = feuert im Kampf nach Ablauf der Abklingzeit und ersetzt den normalen
Angriff. Liegt mehr als eine bereit, gewinnt die mit der längsten Abklingzeit.
**Passiv** = hängt an einem Hook und wirkt dauerhaft.

**Schlüsselwörter** tragen die Kombos: jede Fähigkeit erzeugt etwas (Quelle)
oder verstärkt etwas (Verstärker) — Gift, Brand, Frost, Verderbnis, Schild,
Heilung, Konter, Exekution, Fläche, Tempo. Ein Build ist rund, wenn Quellen und
Verstärker desselben Worts zusammenkommen. Relikte greifen an denselben Wörtern
an (*„je Gift-Fähigkeit im Trupp +7 % Angriff"*).

**Prädator** — nach einem Sieg darf *ein* Gegner verschlungen werden: seine
Fähigkeit wandert dauerhaft in eine Einheit. Prädator-Slots gibt es ab Rang B.

## 3. Architektur

Vanilla HTML/CSS/JS, kein Build, `file://`-tauglich, mobile-first, UI Deutsch.
Wie deine anderen Projekte — kein Framework, bis eins nachweislich fehlt.

```
index.html  style.css
js/
  rng.js        mulberry32, seeded — jeder Run reproduzierbar
  abilities.js  Signaturen, Aufstiegs-Pool, passive Bibliothek
  data.js       Einheiten, Relikte, Ausrüstung
  enemies.js    Gegner, Begegnungen, Bosse, Ereignisse
  combat.js     simulate(teamA, teamB, seed) -> log[]   ← rein, kein DOM
  run.js        Karte, Knoten, Belohnungen, Shop, Tod
  ui.js         rendert State + spielt combat-log ab
  main.js
dev/
  sim.js        Logik-Selbsttests
  balance.js    N Runs headless, Winrate pro Build
```

Zwei Entscheidungen, die alles andere billig machen:

1. **`combat.js` ist eine reine Funktion.** Gibt ein Log zurück, die UI spielt es
   nur ab. Dieselbe Funktion läuft headless 5000× für die Balance-Analyse.
   Ohne das ist ein Kombo-Spiel nicht auszubalancieren.
2. **Fähigkeiten sind Daten, keine Klassen.** Ein Effekt ist
   `{ hook: 'onHit', fn(ctx) {...} }` direkt im Datenobjekt. Kein Ability-
   Framework, keine Registry, keine Vererbung.

State = ein einfaches Objekt, `JSON.stringify` nach localStorage.

## 4. Phasen

| # | Inhalt | Fertig, wenn | Stand |
|---|---|---|---|
| 0 | RNG, `combat.js`, Kampf zweier Trupps | `node dev/sim.js` löst einen Kampf deterministisch auf | ✅ |
| 1 | Run-Gerüst: Karte, Knoten, Belohnung, Gold/Shop, Tod & Neustart | Ein Run ist im Browser durchspielbar | ✅ |
| 2 | Fähigkeiten (aktiv/passiv), Schlüsselwörter, Relikte, Ausrüstung, Zustände | Zwei sichtbar verschiedene Build-Ideen gewinnen | ✅ |
| 3 | Ränge C/B/A/S, Prädator, Magicule | Zwei Runs mit gleichem Seed fühlen sich unterschiedlich an | ✅ |
| 4 | Content: 40 Einheiten mit eigener Signatur, 16 Pool-Aktive, 27 Passive, 37 Relikte, 33 Gegner, 3 Bosse | Pool trägt 10 Runs ohne Wiederholungsgefühl | ✅ |
| 5 | `dev/balance.js`: Winrate pro Build, tote & dominante Kombos markieren | Kein Build unter 25 % / über 75 % Winrate | ⚠️ siehe unten |
| 6 | Politur: Kampf-Animation, Meta-Freischaltungen, Save/Resume | — | ✅ |

Phase 2 und 4 sind die Arbeit. Der Rest ist Gerüst.

### Stand 2026-07-25

`node dev/sim.js` → 88/88. `node dev/balance.js 600` → 53 % Siege (frischer Spieler).

Phase 5 weiterhin nur teilweise erreicht: Frost-Builds liegen bei 89 % (selten
gebaut, n klein), Schild 71 %, Heilung 58 %, Exekution 38 %. Das Messwerkzeug
steht, die Ausreißer sind benannt, das Nachziehen der Zahlen ist offen.

Beim Kalibrieren gefunden und behoben:
- Verderbnis stapelte unbegrenzt (Clayman skalierte sich selbst hoch) → `STATUS_CAP`.
- Magier ignorierten Rüstung vollständig → jetzt 60 %.
- Gegner hatten keine aktiven Fähigkeiten, der Spieler schon → 94 % Siegquote.
  Jetzt trägt jeder Gegner eine Aktive (Tabelle `AKTIV` in `enemies.js`).
- Das Schlüsselwort „wucht" hing an fast jeder Fähigkeit und übertönte jede echte
  Build-Achse → ersatzlos gestrichen, einfacher Schaden trägt jetzt kein Wort.

Nachgezogen 2026-07-25: Tooltips für alles (ein `data-tip`-Motor in `ui.js`,
Texte im `GLOSSAR` in `data.js`), Glossar im Menü, und Ereignistexte benennen
jetzt ausdrücklich „eine zufällige Einheit … dauerhaft".

Nachgezogen 2026-07-25: fünf Raritätsstufen (üblich → legendär) für Einheiten,
Fähigkeiten, Ausrüstung und Relikte. Die Stufe steuert die Angebotshäufigkeit
(`Run.waehle`, gewichtet nach `AB.RARITAET_GEWICHT` und Akt), den Reliktpreis und
die Farbe. Elite/Boss würfeln einen Akt höher, der Aufstiegs-Topf steigt mit dem
Rang. Signaturen erben die Stufe aus den Kosten ihrer Einheit.

Nachgezogen 2026-07-25: Gegnerfähigkeiten haben Text und Schlüsselwörter
(`faehigkeit()` in `enemies.js`). Verschlungenes zeigt darum überall die
übernommene Fähigkeit samt Wirkung statt nur den Namen des Gegners — und zählt
für die Synergie-Anzeige mit.

Nachgezogen 2026-07-25: Einheiten zeigen keine Raritätsstufe mehr (die Kosten
sagen dasselbe). Alle 40 Signaturen an die Vorlage angelehnt und zweiteilig
gebaut (Grundwirkung + Bedingung); Pool und Passive tragen Lore-Namen. Akt 1
deutlich ausgebaut: 8 neue Gegner, 14 normale und 4 Elite-Begegnungen, sieben
eigene Story-Ereignisse (`act`-Feld an Ereignissen, `EN.eventsForAct`).

Nachgezogen 2026-07-25 (TODO.md abgearbeitet): Startdraft statt fester
Begleiter, Gold als knappe Ressource mit drei konkurrierenden Senken
(Einheit/Ausrüstung/Namensweihe), drei Ereignisse mit Gratisaufstieg, sowie
8 Ausrüstungen und 6 Relikte, die auf Passive, Ränge und Fähigkeitszahl schauen.

Nachgezogen 2026-07-25 (Balancing-Tiefe): `dev/balance.js` zählt einen Trupp
erst als Build, wenn ein Schlüsselwort zwei Quellen und einen Verstärker hat.
Diese Messung deckte auf, dass Builds praktisch nie entstanden — Relikte und
Ausrüstung zählten nicht mit (`Run.buildTeile`), Verstärker-Passive schalteten
zu spät frei (jetzt an erster Stelle), und Angebote ignorierten den Trupp
(jetzt `themenWahl`: zwei von drei Würfen bleiben im Thema). Dazu Bosse mit
60 % Widerstand gegen Erstarrung als Konter gegen Frost, und `dev/uitest.js`
als jsdom-Test der Oberfläche.

### Balancing-Werkzeug: was die Messung aufgedeckt hat

`dev/balance.js` zählt einen Trupp erst dann als Build, wenn ein Schlüsselwort
**zwei Quellen und einen Verstärker** hat. Beim ersten Lauf mit dieser Definition
kamen 500 von 500 Runs ohne Build ins Ziel. Drei Ursachen, alle behoben:

1. Relikte und Ausrüstung zählten gar nicht mit, obwohl sie die wichtigsten
   Verstärker sind → `Run.buildTeile` sammelt jetzt Fähigkeiten, Ausrüstung und
   Relikte an einer Stelle, für Anzeige und Auswertung.
2. Verstärker-Passive standen an dritter Stelle und schalteten erst auf Rang A
   frei, während der Schnitt bei B liegt → bei den elf thematischen Einheiten
   steht der Verstärker jetzt vorn.
3. Angebote nahmen keine Rücksicht auf den Trupp → zwei von drei Würfen bleiben
   im Thema (`themenWahl`).

Dazu zwei universelle Verstärker (Auge für Schwächen, Kalte Berechnung) und
Bosse, die Erstarrung zu 60 % abschütteln — sonst gewinnt Frost jeden
Einzelkampf, indem er dem Gegner die Züge nimmt.

Stand nach 800 Runs:

| | Siege | Frost | Gift | Brand | Exekution | ohne Build |
|---|---|---|---|---|---|---|
| frischer Spieler | 46 % | 66 % | 62 % | – | 49 % | 27 % |
| alles freigeschaltet | 52 % | 76 % | 66 % | 69 % | 35 % | 2 % |

Einen Build zu haben ist damit der stärkste einzelne Faktor im Spiel.

Weitere offene Punkte:
- Ein Neuladen während des Belohnungsbildschirms verwirft die Belohnung
  (gespeichert wird der Kartenzustand, nicht `pending`).
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.

## 5. Risiken

- **Content ist der Job, nicht die Engine.** 40 einzigartige Signaturen sind mehr
  Aufwand als das ganze Kampfsystem. Deshalb Daten-Format vor Content festzurren.
- **Balance ohne Simulation ist Raten.** Phase 5 ist nicht optional; bei einem
  Kombo-Spiel entscheidet sie, ob es Spaß macht.
- **Sammelbegriffe zerstören die Messung.** Ein Schlüsselwort, das an jeder
  zweiten Fähigkeit hängt, macht jeden Build gleich aussehen — und die
  Balance-Auswertung blind.

## 6. Abgrenzung

Bewusst nicht drin: Story-Modus, Basisbau, manuelle Kampfsteuerung, Mehrspieler,
Online-Ranglisten. Alles davon konkurriert mit dem Kern-Loop um dieselbe Zeit.
