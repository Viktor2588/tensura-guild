# Tensura Guild — Plan

Roguelite-Truppenbau im *That Time I Got Reincarnated as a Slime*-Universum.
Vorbild: GUILDRUN. Kern ist **nicht** der Kampf, sondern die Kombination:
Einheiten × Fähigkeiten × Relikte × Items. Jeder Run soll eine andere Idee sein.

Verbindliche Referenz. Konzeptänderungen hier nachziehen.

## 1. Kern-Loop

```
Run-Start: 1 aus 4 Paaren (Einheit + Relikt), 5 Leben
  ↓
Karte: Knoten wählen (Kampf / Elite / Shop / Event / Rast / Boss)
  ↓
Kampf: läuft automatisch ab (Spieler greift nicht ein)
  ↓
Belohnung: 1 aus 4-5 (Einheit | Relikt | Item | Magicule)
  ↓  → Aufstellung + Ausrüstung anpassen
  └──── zurück zur Karte, bis Boss ────→ Sieg oder Tod
  ↓
Tod: Meta-Freischaltung (neue Einheiten/Relikte in den Pool) → neuer Run
```

Die einzige Entscheidung im Kampf ist die, die **vorher** getroffen wurde. Das
zwingt die ganze Spieltiefe in Roster/Synergie/Ausrüstung — genau da, wo der
Wiederspielwert herkommt.

Ein Run: 2 Akte à 8 Knoten, je ein Boss aus seinem Pool. Die Gegner laufen
weiter über fünf Inhaltsstufen — die steigen innerhalb des Akts mit dem Schritt.

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

**Genau eine Aktive je Einheit: ihre Signatur.** Sie feuert in jedem Zug und
ersetzt den Normalangriff — es gibt keine Abklingzeiten. Alles, was eine Einheit
darüber hinaus lernt, ist passiv, und beim Aufstieg wird eine aus mehreren
gewählt. Die Signatur ist damit die Handschrift der Einheit, die Passiven sind
ihr Fortschritt.

**Aktiv** = feuert in jedem Zug und ersetzt den normalen Angriff. Trägt sie ein
`wenn(c)`, wartet sie auf ihre Lage (verwundeter Trupp, angeschlagenes Ziel,
zwei Gegner) und die Einheit schlägt solange normal zu. **Passiv** = hängt an
einem Hook und wirkt dauerhaft.

**Schlüsselwörter** tragen die Kombos: jede Fähigkeit erzeugt etwas (Quelle)
oder verstärkt etwas (Verstärker) — Gift, Brand, Frost, Verderbnis, Schild,
Heilung, Konter, Exekution, Fläche, Tempo. Ein Build ist rund, wenn Quellen und
Verstärker desselben Worts zusammenkommen. Relikte greifen an denselben Wörtern
an (*„je Gift-Fähigkeit im Trupp +7 % Angriff"*).

**Resonanz** ist die mechanische Schwelle dazu: drei Teile derselben Linie —
Fähigkeiten, Ausrüstung, Relikte zusammengezählt — schalten einen Trupp-Bonus
frei (`Combat.RESONANZ`). Es resoniert nur die stärkste Linie, sonst sammelt ein
Trupp mit neun Relikten alle Boni nebenbei ein. Gilt für beide Seiten.

**Wählbare Passive.** Einheiten mit eigenen Linien (`AB.linien`) bekommen bei
der Anwerbung und bei jedem Aufstieg vier Angebote — eines je Linie: Werte-
Angriff, eigene Mechanik, Unterstützung, Defensive. Vier Linien à vier Stufen,
sechzehn Passive je Einheit. Wer keine Linien hat, behält die drei festen aus
`data.js`. Shion ist die Vorlage; die übrigen 39 Einheiten sind offen.

**Prädator** — nach einem Sieg darf *ein* Gegner verschlungen werden: seine
Fähigkeit wandert dauerhaft in eine Einheit. Prädator-Slots gibt es ab Rang B.

## 3. Architektur

Vanilla HTML/CSS/JS, kein Build, `file://`-tauglich, mobile-first, UI Deutsch.
Die acht Skripte sind klassische Skripte, keine Module: sie hängen ihre
Schnittstelle an `globalThis` und verlassen sich auf die Reihenfolge in
`index.html`. Ein Bundler ist deshalb nicht nur unnötig, sondern eine eigene
Fehlerquelle — `npm start` legt stattdessen `dev/serve.js` auf.
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
  linien.js     vergleicht die vier Linien einer Einheit über ihren Bruchpunkt
  serve.js      statischer Server für die Entwicklung
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
| 4 | Content: 40 Einheiten mit eigener Signatur, 31 Pool-Aktive, 27 Passive, 37 Relikte, 68 Gegner, 5 Bosse, 5 Akte | Pool trägt 10 Runs ohne Wiederholungsgefühl | ✅ |
| 5 | `dev/balance.js`: Winrate pro Build, tote & dominante Kombos markieren | Kein Build unter 25 % / über 75 % Winrate | ⚠️ siehe unten |
| 6 | Politur: Kampf-Animation, Meta-Freischaltungen, Save/Resume | — | ✅ |
| 7 | TODO.md: zwei Akte mit Boss-Pools, Debug-Übersicht, Chaos-Mechanik und wählbare Passive je Einheit | Shion spielt sich sichtbar anders als über Werte allein | ✅ Shion, 39 Einheiten offen |
| 8 | Einheiten-Synergie: „verwundbar" als Trupp-Marke, Blutung, Soueis sechzehn Passive, größere Boss-Pools | Ein Assassine macht den ganzen Trupp stärker, nicht nur sich | ✅ Souei, 38 Einheiten offen |
| 9 | Bedrohungsstufen als Regeln statt Prozentzahlen | Jede Stufe verlangt ein anderes Spiel, nicht nur einen stärkeren Trupp | ✅ |
| 10 | Eine Aktive je Einheit, keine Abklingzeiten, Passive als einziger Fortschritt | Der Aufstieg ist eine Passiv-Entscheidung, die Signatur bleibt die Handschrift | ✅ |
| 11 | Aufbau statt Ausrüstung: ein Anfang aus vier Paaren, eine Währung, Tags statt Textwänden | Der erste Kampf ist ein Duell, und jeder Kauf ist ein verzichteter Aufstieg | ✅ |
| 12 | Unbegrenzte Stapel, Knoten als Arten statt Gegnerlisten, Kampfherausforderung | Die Wahl auf der Karte ist ein Risiko, keine Vorabinformation | ✅ |
| 13 | Belohnung ist nur noch Magicule; nach jedem Kampf öffnet der Markt samt Verkauf per Ziehen | Was der Kampf einbringt, wird sofort zu einer Entscheidung | ✅ |
| 14 | Entwicklung würfelt eine Passive je Kategorie, Meta-Fortschritt sichtbar, Bosse eingefangen | Der Aufstieg ist jede Runde eine andere Frage | ✅ |
| 15 | Linien für die restlichen vier Oger — die erste Art ist vollständig | Sechs Oger, sechs Spielweisen, aber nur einer darf mit | ✅ 6 von 40 |
| 16 | Linien für alle fünf Goblins — die zweite Art ist vollständig | Der billigste Anfang trägt jetzt eigene Tiefe | ✅ 11 von 40 |
| 17 | Bruchpunkt-Prüfstand für Linien, dazu die vier Sturmwölfe | Auch defensive Linien werden endlich fair gemessen | ✅ 15 von 40 |
| 18 | Linien für die fünf Echsenmenschen — die Hälfte des Rosters ist erreicht | Zwanzig Einheiten mit eigener Handschrift | ✅ 20 von 40 |
| 19 | Schatten, Dunkelheit und göttliches Licht; Schattenwolf umgebaut | Ausweichen und gedämpfter Gegnerschaden — zwei neue Achsen | ✅ |
| 20 | Donner mit Schwelle und Entladung; Ranga umgebaut | Aufladen statt ticken — der erste Zustand mit Schwellenwert | ✅ |

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

Zweiter Durchgang (2026-07-26): eine Bestandsaufnahme je Schlüsselwort zeigte,
dass Heilung 21 Quellen und **null** Verstärker hatte, Schild 11/0, Fläche 8/0,
Tempo 5/0 — diese Builds konnten definitionsgemäß nie entstehen. Fünf
Verstärker-Passive, vier Relikte und zwei Ausrüstungen füllen die Lücken; dazu
`heilfaktor`/`schildfaktor` im Kampf und ein `onKill`-Hook, an dem der Aufbau von
Exekutions-Builds hängt. Gegengewichte: Schild ist auf 60 % des Lebens gedeckelt,
Erstarrung stapelt nicht mehr.

Stand nach je 800 Runs:

| | Siege | Gift | Frost | Brand | Heilung | Schild | Exekution | ohne Build |
|---|---|---|---|---|---|---|---|---|
| frischer Spieler | 43 % | 68 % | – | – | 43 % | 66 % | 41 % | 0 % |
| alles freigeschaltet | 50 % | 72 % | 71 % | 70 % | 54 % | 50 % | 43 % | 0 % |

Alle Builds liegen im Zielband 25–75 %, und ein Trupp ohne Build gewinnt praktisch
nie. Ein Test in `dev/sim.js` schlägt jetzt fehl, sobald ein Schlüsselwort Quellen
ohne Verstärker hat — genau die Lücke, die an den Siegquoten allein unsichtbar war.

Dritter Durchgang (2026-07-26): Akt 2 und 3 auf Akt-1-Dichte gebracht (je 12
normale und 4 Elite-Begegnungen, je drei eigene Story-Ereignisse, 7 neue
Gegner aus dem Orklord- und Falmuth-Bogen). Billige Träger für Verderbnis- und
Konter-Builds, damit die nicht erst mit teuren Einheiten anlaufen. Und der
Belohnungsbildschirm übersteht jetzt ein Neuladen: `serialize` legt ein
schlankes `pending` ab (Belohnungen, Prädator-Angebot, Ergebnis — nicht das Log).

Vierter Durchgang (2026-07-26): Die Wegwahl bietet drei Knoten statt zwei, und
die Vorschau zeigt vor dem Betreten die Gegner mit Werten und Fähigkeiten —
vorher stand dort nur eine Namensliste. Die 15 zuletzt ergänzten Gegner hatten
keine aktive Fähigkeit; ein Test fängt das jetzt ab. Im Bot ersetzt eine
Wegwahl-Heuristik das Würfeln, sonst maß er die Härte der Karte statt die des
Spiels.

Fünfter Durchgang (2026-07-26): **Bedrohungsstufen 0–5** als Langzeitschicht —
freigeschaltet durch Siege, jede zieht eine andere Schraube an (Gegnerwerte,
Startgold, Rangkosten, Leben). Der Boss des Akts steht ab dem ersten Knoten mit
Fähigkeiten in der Vorschau. `dev/balance.js --stufe N` misst jede Stufe:
54/47/39/28/20/10 % Siegquote. Dabei zeigte sich, wie schmal der Grat ist —
die erste Fassung mit 10 % Schritten ließ Stufe 2 auf 3 % einbrechen.

Sechster Durchgang (2026-07-26): **Deckung** — ab Platz 3 geht ein Drittel jedes
Treffers an die vorderste lebende Einheit. Damit ist die Aufstellung messbar
15 Punkte Siegquote wert statt 4; sie war vorher fast Dekoration. Außerdem:
Relikte mit enger Wirkung tragen jetzt eine `bedingung(run)`, werden in der UI
als „derzeit wirkungslos" markiert und bevorzugt dann angeboten, wenn sie
passen; Reliktpreise hängen nicht mehr an der Seltenheit.

Dabei ist ein Befund offen geblieben, der es wert ist, notiert zu werden: **mit
allem Freigeschalteten gewinnt der Bot seltener** (41 statt 53 %). Truppstärke
und Rangsumme sind gleich, der Unterschied liegt in Relikten und Ausrüstung.
Die Bedingungen und die flache Preisstaffel haben fünf der ursprünglich
sechzehn Punkte zurückgeholt, der Rest ist ungeklärt.

Nachgezogen 2026-07-26 (Einheiten statt Einheitsbrei): Rimuru ist kein gesetzter
Held mehr — der Starttrupp wird komplett gedraftet (dreimal eine aus drei), er
liegt als legendäre Einheit mit im Pool. Der Aufstieg bietet zwei der drei
Fähigkeiten aus der Linie der Einheit selbst an (Schlüsselwörter ihrer Signatur
und ihrer freigeschalteten Passiven), das dritte bleibt offen. Dafür brauchte
jede Linie Tiefe: der Aufstiegs-Pool wuchs von 16 auf 31 Aktive, jedes Thema hat
jetzt mindestens drei Antworten. Siegquote unverändert bei 56 %.

Nachgezogen 2026-07-26 (letzter TODO-Punkt): Tooltips färben Zustände,
Fähigkeitsart und Raritätsstufe. Eine Stammtabelle in `ui.js` (`TIP_STAMM`)
markiert beim Anzeigen, die rund vierzig `tip()`-Aufrufe bleiben roher Text.

Nachgezogen 2026-07-26 (Kampf- und Buildsystem): zwei Eingriffe, beide gemessen.

1. **Lagebedingte Fähigkeiten.** Aktive tragen optional ein `wenn(c)`; die
   Auswahl im Kampf überspringt, was gerade sinnlos wäre. Vorher feuerte immer
   die mit der längsten Abklingzeit — der Heilige Segen heilte einen
   unverletzten Trupp, das Todesurteil traf volles Leben, und die Wahl beim
   Aufstieg war faktisch „nimm die höchste Zahl". Wert: +3 Punkte Siegquote,
   für beide Seiten.
2. **Resonanz.** Drei Teile derselben Linie (Fähigkeiten, Ausrüstung, Relikte)
   schalten einen Trupp-Bonus frei; nur die stärkste Linie zählt. Vorher war
   „Build" nur eine Zahl in `dev/balance.js` — die Teile wirkten einzeln, nichts
   belohnte das Bündeln. Erste Fassung mit allen Resonanzen gleichzeitig war
   +24 Punkte (82 % Siegquote); auf eine Linie begrenzt und halbiert sind es
   +8. Bezahlt wird das mit `GRUNDHAERTE` = 1.02 in `run.js` (alle Gegner 2 %
   stärker) — die Kurve ist so steil, dass 7 % bereits 26 Punkte kosten.

Ergebnis `dev/balance.js 600`: 59 % Siege (frischer Spieler), Builds zwischen
57 und 66 % statt 47 bis 80 %. Nebenbei gefunden: `amplifies` an Ausrüstung
zählte in `resolve()` nicht für die Synergie-Anzeige mit. `dev/balance.js` weist
Siegquote jetzt auch nach Resonanz aus.

Nachgezogen 2026-07-26 (Akt 4 und 5, bis Ende Anime-Staffel 3): Der Run läuft
über fünf Akte — neu sind die Westliche Heilige Kirche (Boss Hinata Sakaguchi,
mit Reflexion auf erlittenen Schaden) und Ruberios (Boss Luminous Valentine, mit
Lebensraub und einer Wiederauferstehung). Dazu 20 Gegner, 24 normale und
8 Elite-Begegnungen, 8 Ereignisse. `AKTE` in `run.js` ist die einzige Stelle, an
der die Aktzahl steht.

Die Kalibrierung danach war der eigentliche Aufwand. Zwei Befunde:
- **Akt 3 war die Wand, nicht das Finale.** Als letzter Akt war das richtig, in
  der Mitte einer Fünf-Akt-Kurve nicht: der Sprung von Akt 2 auf 3 verdoppelte
  den gegnerischen Angriff. Jetzt 1.85 (Akt 2) und 1.68 (Akt 3) statt 1.75/1.98.
- **Fünf Leben statt drei.** 40 Knoten mit dem Lebensbudget für 24 sind kein
  härteres Spiel, nur ein kürzeres. Bedrohungsstufe 5 nimmt jetzt zwei davon.

Ergebnis `dev/balance.js 400`: 47 % Siege (frischer Spieler), 62 % mit allem
Freigeschalteten — der Veteran gewinnt endlich öfter als der Anfänger, das war
vorher umgekehrt. Nebeneffekt: Ø 9,5 Rangstufen statt 4,7, Rang S ist über fünf
Akte erreichbar. Damit ist auch der alte offene Punkt „alle bleiben auf B" weg.

Nachgezogen 2026-07-26 (TODO.md): Wegleiste unter der Kopfzeile — alle acht
Knoten des Akts mit ihren Wahlmöglichkeiten, aktueller Position und dem Boss am
Ende. Und die Aufstellung geht in zwei Tipps (erste Einheit, zweite Einheit,
getauscht) statt mit vier Pfeilklicks; `Run.swap` dazu.

### Phase 7 (2026-07-26): zwei Akte, Chaos, wählbare Passive

Vier Punkte aus `TODO.md`, alle gemessen.

1. **Zwei Akte statt fünf.** `AKTE = 2`, aber die fünf Inhaltsstufen bleiben —
   sie steigen jetzt innerhalb des Akts mit dem Schritt (`Run.inhaltsStufe`,
   Tabelle `STUFEN`). Ohne diese Trennung wären drei Fünftel aller Gegner,
   Ereignisse und Elite-Begegnungen tot gewesen. Bosse treten allein an, gezogen
   aus zwei Pools; `hpMult` an der Begegnung ersetzt das weggefallene Gefolge,
   ohne den Angriff mitzuverdreifachen.

   Der eigentliche Aufwand war wieder die Kalibrierung: 16 Knoten mit dem
   Einkommen für 40 ergaben **0 % Siege**. Ein Knopf statt dreißig nachgezogener
   Zahlen — `WACHSTUM` multipliziert Gold und Magicule. Gemessen 2,5 → 3 %,
   4 → 21 %, 6 → 44 %, 8 → 58 %; bei **6,5** stehen 49 % Siege und 10,4
   Rangstufen, also fast genau die Kurve der alten Fünf-Akt-Fassung (9,5).

2. **Debug-Übersicht** (🔬 über dem Trupp). Vier Zwischenstände je Wert: Basis →
   Rang → Ausrüstung → Kampf, mit Delta je Zeile, dazu Schild, Regeneration,
   Lebensraub, Heil- und Schildfaktor, Durchdringung, Fähigkeiten und
   Schlüsselwörter. Die letzte Spalte kommt aus `combat.js` selbst
   (`simulate(..., { nurAufbau: true })` gibt die aufgebauten Einheiten zurück),
   nicht aus einer Zweitrechnung — sonst behauptet die Anzeige irgendwann etwas
   anderes als der Kampf.

3. **Chaos.** Kein Schaden über Zeit, sondern Unberechenbarkeit: Angriff,
   Rüstung und Tempo des Trägers werden zu Beginn jedes eigenen Zuges neu
   ausgewürfelt (±6 % je Stapel), aktive Fähigkeiten verpuffen mit 5 % je Stapel.
   `antichaos` ist dieselbe Mechanik nach oben. Shions Signatur legt Stapel nach
   Entwicklungsstufe an: C 1, B 2, A 3, S 5 (`AB.CHAOS_JE_RANG`).

4. **Wählbare Passive.** `AB.linien` hält je Einheit vier Linien à vier Stufen —
   Werte-Angriff, eigene Mechanik, Unterstützung, Defensive. Beim Anwerben und
   bei jedem Aufstieg wählt der Spieler eine aus vier; die Wahlen liegen in einer
   Warteschlange (`run.pwahlen`), weil der Startdraft drei Einheiten hintereinander
   anwirbt. Einheiten ohne Linien behalten die drei festen Passiven.

Gemessen an einem festen Trupp gegen Stufe-3-Begegnungen (800 Kämpfe je Zeile,
Restleben als das feinere Maß):

| Shion Rang S mit | Siege | Restleben |
|---|---|---|
| ohne Passive | 53 % | 23 % |
| Mechanik 3+4 | 57 % | 26 % |
| Angriff 1+2 / Mechanik 1+2 | 61 % | 27–28 % |
| Defensive 1+2 | 67 % | 37 % |
| Angriff 3+4 | 69 % | 34 % |
| Unterstützung 1+2 | 73 % | 42 % |
| Defensive 3+4 | 76 % | 48 % |
| Unterstützung 3+4 | 80 % | 54 % |
| eine je Linie gemischt | **85 %** | 54 % |
| viermal Mechanik | 68 % | 33 % |

Zwei Befunde daraus, beide eingearbeitet: die Mechanik-Linie war in der ersten
Fassung **exakt so stark wie gar keine Passive** (53 %) — ein Verstärker, der nur
Shion selbst gilt, verschwindet in einem Trupp aus fünf. Entropiebruch hängt
jetzt am ganzen Trupp, und Kettenreaktion (zu situativ) wurde zu Gesetzlosigkeit:
Chaos baut sich nicht mehr ab. Und: **Mischen schlägt Durchziehen** (85 gegen
68 %) — genau die Entscheidung, die vier Linien haben sollen.

Ergebnis `dev/balance.js 400`: 49 % Siege frisch, 52 % mit allem
Freigeschalteten, Builds zwischen 44 und 63 %.

### Phase 8 (2026-07-26): die Marke, Blutung und Boss-Eskalation

**`verwundbar` ist das erste Schlüsselwort, das dem ganzen Trupp gehört.** Jeder
Stapel lässt JEDEN Angreifer 15 % mehr Rüstung durchschlagen, nicht nur den, der
markiert hat. Für sich genommen bescheiden — der Wert liegt darin, dass die
Unterstützungs-Passiven der anderen daran andocken. Dazu `blutung`: Schaden über
Zeit nach dem **maximalen Leben** des Ziels statt nach einer festen Zahl, also
die Antwort auf Gegner, die schlicht zu viel Leben haben.

**Souei** ist der Gegenentwurf zu Shion und trägt sie: stärkste
Unterstützungslinie im Spiel, schwächste Angriffslinie. Beide sind Oger, es darf
nur eine Einheit je Art im Trupp stehen — die Wahl ist damit eine echte
Weggabelung statt einer Zahl.

**Boss-Pools auf je vier gefüllt**: neu sind Geld der Orklord, Razen der
Hofmagier und Roy Valentine.

Der eigentliche Befund kam beim Tunen: **ein allein stehender Boss ist eine
Ja/Nein-Frage, keine Schwierigkeit.** Beide Seiten schlagen mit fast konstantem
Schaden, also entscheidet sich alles in der ersten Runde. Gemessen an Clayman:

| Härtefaktor | 0,8 | 0,9 | 1,0 | 1,1 | 1,25 | 1,5 |
|---|---|---|---|---|---|---|
| Siegquote | 100 % | 100 % | 100 % | 3 % | 0 % | 0 % |

Kein Multiplikator der Welt trifft ein Zielband auf einer solchen Klippe. Das
alte Design (Boss plus zwei Begleiter) hatte den Verlauf, weil das Gefolge
wegstirbt und der Schaden über die Zeit sinkt. Ersatz dafür ist die
**Eskalation**: +6 % Angriff je eigenem Zug, gedeckelt bei +100 %, linear auf
den Grundangriff. Multiplikativ auf `u.atk` potenziert sie sich über einen
langen Kampf ins Absurde — erste Fassung, Clayman kippte damit wieder auf 0 %.
Mit der gedeckelten Fassung entsteht eine Übergangszone, und ein Bosskampf wird
zum Tempo-Check.

Zweiter Befund, teurer: **gegen einen von Hand gebauten Referenztrupp zu tunen
misst den Referenztrupp, nicht das Spiel.** Die so kalibrierten Bosse ließen die
Siegquote von 49 auf 14 % fallen — mein Trupp war stärker als das, womit ein
Spieler beim Boss wirklich ankommt. Nachgezogen wird jetzt über einen
gemeinsamen Regler `BOSS_HAERTE` in `enemies.js`, gemessen mit `dev/balance.js`:
0,6 → 50 %, 0,7 → 41 %, 0,8 → 30 %. Steht auf **0,6**.

Ergebnis `dev/balance.js 400`: 50 % Siege frisch, 51 % mit allem
Freigeschalteten, Builds zwischen 36 und 63 %.

### Phase 9 (2026-07-26): Bedrohungsstufen sind jetzt Regeln

Vorher war jede Stufe dieselbe Schraube: +2,5 % Gegnerwerte, +5 %, +7,5 %. Das
verlangt einen stärkeren Trupp, aber kein anderes Spiel. Jetzt schaltet jede
Stufe **eine benannte Regel** frei, kumulativ, und die Werteschraube läuft nur
noch leise nebenher (0,012 statt 0,025 je Stufe):

| Stufe | Regel | Was sie verschiebt |
|---|---|---|
| 1 | **Überzahl** — ein Nachzügler je Begegnung, halbe Werte | Fläche und Konter auf, Einzelziel ab |
| 2 | **Nachschub** — der vorderste Gegner steht einmal mit 30 % auf | Exekution allein reicht nicht mehr |
| 3 | **Kriegsrecht** — ein Einheitenangebot statt drei, Ränge +15 % | der gedraftete Trupp muss tragen |
| 4 | **Belagerung** — überall Elite zu normaler Beute, Lager −15 % | kein ruhiger Knoten mehr |
| 5 | **Sturmgott** — drei Leben, Bosse eskalieren doppelt | Tempo statt Aushalten |

Gemessen `dev/balance.js 500 --stufe N`: **48 / 35 / 24 / 16 / 11 / 6 %**.

Drei Fehlschläge auf dem Weg, alle an derselben Ursache — eine Regel wiegt
schwerer, als sie klingt:

1. **Ein voller Extragegner halbierte die Siegquote** (46 → 14 % auf Stufe 1
   allein). Der Nachzügler hat jetzt halbe Werte; die Wirkung bleibt, die Wand
   ist weg.
2. **Nachschub auf allen Gegnern** kostete 17 Punkte statt der gewollten 7 — die
   Zahl der zusätzlichen Körper wiegt schwerer als deren Leben. Jetzt kommt nur
   der vorderste zurück.
3. **Belagerung war LEICHTER als die Stufe darunter** (23 gegen 17 %): die
   Elite-Beute zahlte die härteren Gegner mehr als zurück, und der Bot wich über
   seine Wegwahl aus. Jetzt Elite-Gegner zu normaler Beute, auf beiden Akten,
   plus 15 % weniger aus dem Lager. Erste Korrektur schoss über (Lager halbiert
   → 4 %), 0,85 trifft.

Der zweite und dritte Punkt sind derselbe Befund wie schon bei den Bossen: **die
Kurve lässt sich nicht am Reißbrett schätzen.** Jede dieser Regeln sah auf dem
Papier nach „ein bisschen härter" aus.

### Phase 10 (2026-07-26): eine Aktive, keine Abklingzeit

Auf Zuruf umgebaut, und der Umbau ging tiefer als die Anzeige, an der er begann:

- **Keine Abklingzeiten.** Die Aktive feuert in jedem Zug. `cd` blieb als Feld
  erhalten, heißt im Kampf jetzt `wucht` und dient nur noch als Reihenfolge, wo
  eine Seite mehrere Aktive hat — die Zahl war schon immer ein Maß für Stärke.
- **Eine Aktive je Einheit: die Signatur.** `AKTIV_SLOTS` ist [1,1,1,1]. Der
  Aufstieg wählt keine Aktive mehr, sondern eine **Passive**: vier aus den Linien
  (Shion, Souei) oder drei aus der Bibliothek plus der eigenen nächsten. Damit
  fällt `run.wahl` ersatzlos weg, alles läuft über `run.pwahlen`.
- **Keine Raritätsstufe** an Signaturen und Linien-Passiven — sie stehen in
  keinem gewichteten Angebot, die Stufe wäre nur Farbe (`AB.istEigen`).
- **Schlüsselwörter zentral an der Einheitenkarte**, nicht an jeder Fähigkeit.
  Eine Einheit trägt bis zu acht Fähigkeiten, die dieselben Wörter benutzen; die
  Definition stand achtmal da.

Drei Dinge, die erst die Messung zeigte:

1. **Gegner profitierten mehr als der Spieler.** Sie behielten ihre Liste aus bis
   zu drei Aktiven und feuerten davon jede Runde die stärkste, während der
   Spieler auf die Signatur zurückfiel: Siegquote 50 → 40 %. `EN.aktiveVon`
   schneidet jetzt auf eine zu, dieselbe Regel für beide Seiten (→ 43 %), Rest
   über `GRUNDHAERTE` 1.02 → 0.98 (→ 50 %).
2. **Drei Relikte und ein Item hingen an Abklingzeit oder Anzahl der Aktiven**
   (Taktgeber, Zwillingsseele, Zwillingsklinge) und waren schlagartig wirkungslos
   — neu geschrieben statt gelöscht.
3. **Tests maßen Summen statt Raten.** „Gezeichnetes Ziel" schien wirkungslos
   (9929 gegen 9967 Schaden), weil der Sandsack mit der Passiven früher stirbt
   und die Summe deshalb gleich bleibt. Je Treffer gemessen wirkt sie. Derselbe
   Fehler steckte im Frost-Test.

Ergebnis `dev/balance.js 400`: 50 % frisch, 45 % voll freigeschaltet, Builds
41–60 %. Bedrohungsleiter 50/34/25/19/19/15 — Stufe 3 und 4 liegen gleichauf,
verlangen aber Verschiedenes (karger Händler gegen Elite überall).

### Phase 11 (2026-07-26): Aufbau, eine Währung, Tags

Sieben Punkte aus `TODO.md`.

- **Chaos debufft nur noch.** Der Wurf war symmetrisch — als Debuff gedacht, als
  Glücksspiel gespielt. Jetzt zieht Chaos nur nach unten, Antichaos nur nach
  oben; unvorhersehbar bleibt die Höhe, nicht die Richtung.
- **Passive lassen sich nicht auslassen.** `skipPassive` ist ersatzlos weg.
- **Tags statt Textwänden.** Belohnung, Startwahl und Laden zeigen Art, Rolle,
  Signatur, Schlüsselwörter und Bedingung als einzelne Tags mit eigenem Tooltip.
- **Werte im Kampf** auf jeder Kämpferkarte, und **das Management verschwindet,
  solange der Kampf läuft** — vorher stand die halbe Verwaltung unter einer
  laufenden Animation.
- **Der Start ist ein Aufbau:** vier Paare aus Einheit und passendem Relikt statt
  dreier Einheiten. Erster Kampf 1 gegen 1, die ersten sieben Knoten mit weniger
  und schwächeren Gegnern (`EINSTIEG`, `EINSTIEG_HAERTE`).
- **Eine Währung.** Gold und Magicule waren dieselbe Zahl in zwei Beuteln.
- **Entlassen** nur außerhalb des Kampfes und gegen 25 % des Einsatzes
  (Anwerbepreis plus Rangkosten); die Ausrüstung geht zurück in den Beutel.

Das Zusammenlegen der Währungen war der teuerste Teil, in drei Stufen:

1. Beim Umbau ersetzte der Magicule-Anteil die Kampfbeute, statt sie zu
   ergänzen — **der Ertrag fiel auf ein Drittel**, Siegquote 4 %.
2. Mit einer Einheit statt dreien am Start erreicht der Trupp nie die Größe, für
   die Akt 2 kalibriert war. Deshalb hängt die Gegnerhärte jetzt an der
   Truppgröße (`TRUPP_BEZUG`, `TRUPP_STEIGUNG`), flacher als der Zugewinn einer
   Einheit — wachsen lohnt sich weiterhin.
3. `WACHSTUM` von 6,5 auf 14,5. Dann waren Magicule zu reichlich (0,1
   unbezahlbare Angebote je Run — also keine Entscheidung), also mussten die
   Ladenpreise in dieselbe Liga wie die Rangkosten: Einheit 130 + 45 je
   Kostenpunkt, Relikt 340, Ausrüstung dreifach. Jetzt 1,0 unbezahlbare
   Angebote je Run.

Und noch ein Messfehler statt eines Balancefehlers: **Stufe 4 maß sich leichter
als Stufe 3**, weil der Bot belagerte Knoten an ihrem Elite-Label bewertete und
sie deshalb aufsuchte — obwohl sie nur normale Beute zahlen. Nach der Korrektur
im Bot zeigte sich die Regel als viel zu hart (25 → 11 %), sie trifft jetzt nur
jeden zweiten Kampfknoten in Akt 2.

Nachgetragen: **der Speicherstand-Schlüssel war nie angehoben worden.** Ein
Stand aus Phase 10 ließ die Startansicht abstürzen (`startwahl.offers` enthielt
Strings statt Paaren) — wer das Spiel schon einmal geöffnet hatte, sah die neue
Fassung überhaupt nicht. Jetzt `tensura-guild-v3`, alte Schlüssel werden beim
Laden entsorgt, und die Meta hängt an einem eigenen, versionslosen Schlüssel,
damit Freischaltungen einen Formatwechsel überleben.

Ergebnis `dev/balance.js 500`: 47 % frisch, 47 % voll freigeschaltet, Ø 4,8
Einheiten. Bedrohungsleiter **47/37/29/25/21/15** — erstmals sauber monoton.

### Phase 12 (2026-07-26): unbegrenzte Stapel, Knotenarten, Herausforderung

- **Stapelgrenzen weg.** `STATUS_CAP` enthält nur noch `erstarrung: 1` — die ist
  kein Stapel, sondern ein Schalter. Gedeckelt wird stattdessen die *Wirkung*
  dort, wo sie unsinnig würde: `CHAOS_MIN` 0.15 (sonst stünde eine Einheit bei
  genug Chaos still) und `FEHLSCHLAG_MAX` 0.75 (sonst schlüge jede Fähigkeit fehl).
- **Knoten nennen nur noch ihre Art.** Die Gegnervorschau war nicht nur
  Vorabinformation, sie **log**: sie zeigte die volle Begegnung, während der
  Einstieg sie auf ein bis zwei Gegner stutzte — versprochen wurden vier
  Wolfsjunge, angetreten ist eines. `gegnerVorschau` ist ersatzlos weg, die
  Boss-Vorschau bleibt (sie hat nie gelogen).
- **Kampfherausforderung** als vierter Kampfknoten: härtere Gegner
  (`PRUEFUNG_HAERTE` 1.9) plus eine angesagte Auflage — ohne Verlust, in 22
  Zügen, unversehrt oder in Unterzahl. Gehalten gibt es ein zweites
  Belohnungsangebot.

Die Kalibrierung lief in drei Schritten, und der erste Entwurf war ein Geschenk
statt einer Herausforderung:

| | gehalten | Siegquote |
|---|---|---|
| erste Fassung (normale Gegner, lockere Auflagen) | 92–100 % | 66 % |
| Auflagen verschärft, Gegner ×1.3 | 74 % | 63 % |
| ohne verdoppelte Beute, Gegner ×1.9 | 62 % | 54 % |

Den Rest holte `GRUNDHAERTE` 0.98 → 1.02 zurück: unbegrenzte Stapel nützen dem
Spieler mehr als dem Gegner, weil er die meisten Quellen bündelt.

Ergebnis `dev/balance.js 500`: 52 % frisch, 53 % voll freigeschaltet. Zu
beobachten: Konter-Builds messen 81 % (n=47, also dünn) — das ist über dem
Zielband und hängt vermutlich an den jetzt unbegrenzten Stapeln.

### Phase 13 (2026-07-26): Markt statt Belohnungskarte

- **Kämpfe zahlen nur noch Magicule.** `rollRewards` und `takeReward` sind weg.
- **Nach jedem gewonnenen Kampf öffnet der Markt** — im selben Bildschirm wie die
  Truppenverwaltung. Jeder Posten steht ausführlich da statt in einem Tooltip:
  Signatur, erste Passive und Werte bei Einheiten; Wirkung und erfüllte Bedingung
  bei Relikten; und wie viele Magicule fehlen, wenn es nicht reicht.
- **Drei Bildschirme je Kampf:** Auflösung, Ergebnis, Verwaltung. Vorher hingen
  Ergebnis und Markt auf einer Seite; jetzt trägt `run.phase === 'markt'` die
  Verwaltung, und `zumMarkt(run)` ist der Übergang. Beide Bildschirme überstehen
  ein Neuladen (`phase` liegt im Speicherstand).
- **Der Händler-Knoten ist raus** — er wäre doppelt. Seine drei Slots in `STEPS`
  sind Kämpfe und Herausforderungen geworden.
- **Verkaufen durch Ziehen.** Einheit, Ausrüstung oder Relikt auf die
  Verkaufsfläche, ein Viertel des Einsatzes zurück.
- Die gehaltene Auflage einer Herausforderung gibt jetzt **mehr Magicule
  (+60 %) und einen Posten mehr** statt eines zweiten Belohnungsangebots.

Zwei Entscheidungen, die begründet sein wollen:

1. **Pointer Events statt HTML5-Drag.** Letzteres feuert auf Touch überhaupt
   nicht, und das Projekt ist mobile-first. Ein Zeiger, eine Bahn — Maus wie
   Finger, mit einem Geist am Cursor und Trefferprüfung gegen die Fläche.
2. **`darfEntlassen` musste weicher werden.** Es sperrte Verkaufen für die ganze
   Phase `kampf` — und genau darin liegt jetzt der Markt. Jetzt sperrt es die
   Kampfauflösung, nicht den Markt danach.

Kalibriert: der Markt nach jedem Kampf bringt spürbar mehr Ausrüstung und
Relikte ins Spiel (Ø 8,3 Relikte und 8,4 Ausrüstungen gegen vorher 6,3 und 5,6),
also stieg `GRUNDHAERTE` von 1.02 auf 1.08. Ergebnis `dev/balance.js 500`:
**48 % frisch, 60 % voll freigeschaltet**, 59 % der Auflagen gehalten.

Nachgetragen: **zwei Laufzeitfehler, beide beim Neuladen.**

1. Der Ergebnisbildschirm las `result.survivors` und `result.ticks` — der
   schlanke Speicherstand trägt aber bewusst nur `{ winner }`. Nach einem F5 auf
   dem Ergebnis stürzte die Seite ab. Der Kampf legt jetzt eine `bilanz` an
   (Züge, wer steht, wer fiel), die mitgespeichert wird; das Log bleibt draußen.
2. `deserialize` stellte `over`/`won` nicht wieder her. Ein beendeter Run kam als
   unfertiger zurück — mit einer Aktnummer hinter dem letzten Akt, und der
   nächste Kartenwurf suchte einen Boss, den es nicht gibt. Gefunden mit einem
   Fuzz über 60 000 Aktionen, der nach jeder Aktion speichert und lädt.
   Zusätzlich begrenzt `bossOf` die Aktnummer jetzt selbst.

Der Fuzz und ein Renderlauf über alle Phasen aus geladenem Stand sind seither
sauber.

Nachgetragen: **Namensweihe lost ihr Ziel aus.** Vorher hob sie eine Einheit
deiner Wahl zum Festpreis — also immer die teuerste, was die Wahl trivial machte.
Jetzt wird das Ziel beim Aufbau des Markts gezogen und steht für diese Verwaltung
fest, und der Preis hängt am Rang des Ziels (80 % des regulären). Nebenbei kam
heraus, dass sie vorher oft gar nicht griff: der Bot bot sie stets der vordersten
Einheit an, und war die schon auf S, verfiel der Kauf stillschweigend. Seit sie
trifft, stieg die Siegquote um vier Punkte — ausgeglichen über `GRUNDHAERTE`
1.08 → 1.14.

Dabei fiel eine Schwäche im Prüfwerkzeug auf: `dev/uitest.js` zog seinen Seed aus
`Math.random`, war also bei jedem Lauf ein anderer Test. Ein Fehlschlag ließ sich
nicht nachstellen und war beim nächsten Lauf weg. Jetzt fester Seed.

### Phase 14 (2026-07-26): zufällige Entwicklung, sichtbarer Fortschritt, Bosse

- **Die Bibliothek ist kategorisiert.** Alle 34 geteilten Passiven tragen jetzt
  eine der vier Arten: Angriff (9), Mechanik (9), Unterstützung (7), Defensive
  (9). Der Aufstieg bietet **eine aus jeder Art** an, zufällig gezogen, mit einer
  Neigung zum Thema der Einheit (65 %). Vorher stand die feste nächste Passive
  aus `data.js` im Angebot — dieselbe Einheit entwickelte sich in jedem Run gleich.
- **Meta-Fortschritt im Menü:** Balken und Listen für Bedrohungsstufe, Einheiten
  und Relikte, jeder Eintrag mit Tooltip. Vorher war die Freischaltung eine Zeile
  beim Tod und danach unsichtbar.

**Bosse waren die leichtesten Kämpfe des Akts.** Im echten Run gemessen
(`dev/balance.js` weist die Siegquote jetzt je Boss aus) standen sie bei
83–100 %, nur Roy Valentine bei 44 % — während der Run insgesamt bei 51 % lag.
Der Spieler starb also an gewöhnlichen Knoten und spazierte durch das Finale.
Der alte Notizzettel („Clayman leicht, Milim hart") war längst überholt.

Nachgezogen mit einem Tuner, der jeden Boss gegen die Messung im echten Run
schiebt statt gegen einen von Hand gebauten Referenztrupp — der war beim letzten
Versuch die Fehlerquelle. Ergebnis: **69–82 %** über alle acht.

Ein Boss brauchte mehr als eine Zahl: **Geld, der Orklord** blieb bei 89 %, weil
sein Kit ihn zäh, aber harmlos machte — Multiplikatoren skalieren Leben und
Angriff gleichmäßig und ändern daran nichts. Sein Fleischwall heilt jetzt halb so
viel, lässt seinen Angriff dafür mit jedem erlittenen Treffer wachsen.

Konter (vorher 84 %) ist kein Ausreißer mehr: Stachelhaut, Dornenkranz und die
Konter-Resonanz werfen weniger zurück. Er liegt jetzt gleichauf mit Heilung und
Brand.

Ergebnis `dev/balance.js 600`: 50 % frisch, 62 % voll freigeschaltet,
Bedrohungsleiter 50/40/…/31/…/16.

### Phase 15 (2026-07-26): die Oger sind vollständig

Vier Einheiten, je vier Linien à vier Stufen — **64 neue Passive**, zusammen mit
Shion und Souei jetzt 96. Damit hat die erste Art ihre Tiefe, und die Regel „eine
Einheit je Art" wird bei den Ogern zur Wahl zwischen sechs Spielweisen:

| Oger | Linie | Kern |
|---|---|---|
| Shion | Chaos | Werte des Gegners würfeln neu, Fähigkeiten verpuffen |
| Souei | Verwundbar | markiert für den ganzen Trupp |
| Benimaru | Brand und Fläche | zündet das Feld an und schlägt daraus Kapital |
| Shuna | Heilung und Schild | dichteste Unterstützung, schwächster Angriff |
| Hakuro | Klinge und Exekution | räumt Angeschlagene ab, lehrt es dem Trupp |
| Kurobe | Schmiede | rechnet mit der **Ausrüstung** des Trupps |

Kurobe öffnet dabei eine Achse, die es bisher nicht gab: seine Linie skaliert mit
der Zahl angelegter Ausrüstungsstücke. Damit bekommt der Beutel erstmals eine
eigene Build-Bedeutung statt nur Werte.

Drei kleine Haken in `combat.js` waren nötig, alle nach dem Muster bestehender
Felder (`zaehesChaos`, `offeneWunde`): `brandBleibt` und `brandFaktor` für
Benimarus Mechanik, `ueberheilung` für Shunas Überfluss, `itemZahl` für Kurobe.

Gemessen an einem Prüfstand, der überhaupt unterscheidet (Rang 2, Stufe-4-Gegner,
300 Kämpfe je Zelle) zeigte sich ein Muster, das nicht am Inhalt liegt, sondern
an der Kurve: **Defensivlinien dominieren auf niedrigem Rang** (36–48 % gegen
17 % Grundwert), Unterstützung und Mechanik zahlen erst später. Zwei frühere
Prüfstände waren wertlos, weil sie gesättigt waren — bei Rang 3 mit voller
Ausrüstung gewinnt jede Variante zu 100 %.

Ergebnis `dev/balance.js 600`: 50 % frisch, 63 % voll freigeschaltet, Bosse
65–84 %. `GRUNDHAERTE` von 0.86 auf 0.90, weil sechs ausgebaute Oger den Trupp
messbar stärker machen.

### Phase 16 (2026-07-26): die Goblins

Fünf Einheiten, 80 neue Passive — zusammen 176. Die Goblins sind bewusst die
zweite Art: sie sind das Billigste im Angebot und stehen deshalb in fast jedem
Startdraft.

| Goblin | Linie | Kern |
|---|---|---|
| Gobta | Glück | fast alles hängt an einer Probe, die auch danebengehen darf |
| Gobkyu | Präzision | Rüstung ignorieren, Schwächen ausnutzen, Zusatzschüsse |
| Rigurd | Häuptling und Schild | Schild für den ganzen Trupp, Formation |
| Rigur | Wache und Konter | zahlt zurück, wird stärker mit jedem Verlust |
| Gobwa | Feldverband | Heilung, die mit dem Schaden des Trupps wächst |

Gobtas Linie ist die erste, die **auf Zufall gebaut ist** statt auf feste Werte:
20 % auf doppelten Schaden, 25 % auf einen Schild, 50 % auf ein Wiederaufstehen.
Damit steht neben den berechenbaren Builds erstmals ein Glücksspiel.

Ergebnis `dev/balance.js 600`: 51 % frisch, 61 % voll freigeschaltet;
`GRUNDHAERTE` von 0.90 auf 0.93.

Zum Prüfstand, der die Linien vergleicht: er trennt gut bei Gobta (0 → 26 %) und
Rigur (0 → 16 %), zeigt bei **Rigurd durchgehend 0 %** — nicht weil seine Passiven
nicht greifen (nachgeprüft: Häuptlingszorn, Bollwerk und Formation wirken alle),
sondern weil ein rein defensiver Zuschnitt auf Rang 2 gegen Stufe-4-Gegner nichts
rettet. Dasselbe Muster wie bei Souei in Phase 15. Ein Prüfstand, der defensive
Linien fair misst, fehlt noch.

### Phase 17 (2026-07-26): der Bruchpunkt, und die Sturmwölfe

Erst das Werkzeug, dann der Inhalt — sonst hätte ich die nächste Art wieder
falsch gemessen.

**`dev/linien.js` misst den Bruchpunkt** statt der Siegquote bei fester Härte:
den Gegner-Multiplikator, bei dem die Siegquote durch 50 % geht, per binärer
Suche. Der alte Ansatz unterschlug defensive Linien systematisch — bei einer
Härte, die der Trupp ohnehin nicht überlebt, steht jede Variante bei 0 %, bei
einer leichten bei 100 %. Genau das ließ Rigurd und Souei wirkungslos aussehen,
obwohl ihre Passiven nachweislich griffen. Jetzt zeigt jede Linie eine
Verschiebung.

**Die Sturmwölfe** sind die dritte vollständige Art, 64 neue Passive (zusammen
240): Ranga (Blitz, springt und lähmt), Sturmwolf (Jagd auf Angeschlagene),
Schattenwolf (Frost), Rudelalpha (Rudel und Tempo als Trupp-Achse).

Der neue Prüfstand fand sofort zwei Dinge, die die alte Methode nicht gezeigt
hätte:

1. **Schattenwolfs Defensivlinie war fast unsterblich** — Schadensdeckel *und*
   Minderung *und* Schild stapelten sich zu einem Bruchpunkt von +1.94, während
   die nächstbeste Linie bei +0.30 lag. Der Deckel ist raus, jetzt +0.15.
2. **Sturmwolfs ganze Angriffslinie verschob den Bruchpunkt um 0.00.** Der
   Grund ist strukturell: er hat 9 Grundangriff, und Prozentboni auf einen so
   kleinen Wert sind nichts. Seine Angriffslinie arbeitet jetzt mit festen
   Zahlen. Das ist eine Lehre für alle billigen Einheiten, die noch kommen.

Ergebnis `dev/balance.js`: 48 % frisch, 62 % voll freigeschaltet;
`GRUNDHAERTE` von 0.93 auf 0.95.

### Phase 18 (2026-07-26): die Echsenmenschen, und ein zweiter Messfehler

Fünf Einheiten, 80 neue Passive — zusammen **320**, die Hälfte des Rosters hat
jetzt Linien.

| Echsenmensch | Linie | Kern |
|---|---|---|
| Gabiru | Wirbelspeer | je voller die gegnerische Reihe, desto besser |
| Souka | Späherin | Rüstung ignorieren, an der Front vorbei |
| Echsenfürst | Ausdauer | wächst, solange der Kampf dauert |
| Drachenknecht | Speerwall | zahlt zurück und lehrt es dem Trupp |
| Quellenpriesterin | Regeneration | der stetige Fluss statt der Stoßheilung |

Der Prüfstand aus Phase 17 hatte noch einen zweiten blinden Fleck, und er traf
genau die Einheiten dieser Art: **ein Unentschieden am Zug-Limit zählte als
Niederlage.** Wer auf Ausdauer gebaut ist, führt lange Kämpfe — bei Echsenfürst
und Quellenpriesterin lief die Messung deshalb ins Limit und gab für alle vier
Linien denselben Bodenwert aus (0.41 / +0.00 quer durch). Gemessen wurde damit
nicht ihre Stärke, sondern nur, ab wann Kämpfe sich nicht mehr auflösen.

Jetzt gilt: wer am Limit vorn liegt (mehr Restleben-Anteil), hat gewonnen. Damit
zeigen auch sie ihre Linien — Echsenfürsts Unterstützung +0.20, Defensive +0.22;
Quellenpriesterins Mechanik +0.35. Nebenbei bekam der Referenztrupp volle
Ausrüstung, weil mancher Bruchpunkt sonst auf der Untergrenze der Suche klebte.

Ergebnis `dev/balance.js`: 49 % frisch, 61 % voll; `GRUNDHAERTE` 0.95 → 0.97.

### Phase 19 (2026-07-26): Schatten, Dunkelheit und Licht

Drei Elemente, jedes mit einer Wirkung, die es im Spiel noch nicht gab:

- **Schatten** (auf sich): je Stapel 7 % Chance, einem Treffer **ganz** auszuweichen,
  gedeckelt bei 60 %. Ausweichen gab es bisher nicht — alles federte nur ab.
- **Dunkelheit** (auf dem Gegner): senkt, was er **austeilt**, um 7 % je Stapel.
  Jede andere Marke erhöht, was er einsteckt; das hier ist die Gegenrichtung.
- **Göttliches Licht** (auf sich): heilt je Stapel 1,5 % pro Zug, löscht ebenso
  viel Dunkelheit, und die eigenen Angriffe gehen **durch fremde Schatten**.
  Damit hat jede der beiden Finsternisse eine Antwort.

Der **Schattenwolf** ist von Frost auf diese Achse umgebaut — Signatur
„Schattenbiss" statt „Frostbiss", alle sechzehn Linien neu. Frost bleibt bei
Ranga und in der Bibliothek. **Shuna** trägt das Licht.

Beim Testen gingen drei Kulissen daneben, alle aus demselben Grund — *die
Messung stand an der falschen Stelle*:

1. Die Frost-Tests bauten Ranga ohne Passive. Linien-Einheiten tragen ohne
   ausdrückliche Wahl **keine** — der Frostträger blieb wirkungslos.
2. Der Dunkelheits-Test ließ die Quelle vorn stehen: der Schattenwolf starb,
   die Dunkelheit verfiel, und gemessen wurden ungedämpfte späte Treffer.
   Jetzt hält ein Sack die Front.
3. Der Licht-Test gab Shuna ihren Schild mit — der fing alles ab, ihr Leben
   sank nie, und die Heilung hatte nichts zu tun.

Ergebnis `dev/balance.js 600`: 50 % frisch, 61 % voll; `GRUNDHAERTE` 0.97 → 1.00.

### Phase 20 (2026-07-26): Donner

Das vierte neue Element, und das einzige mit einer **Schwelle**: Donner bleibt
liegen und tut nichts, bis sechs Stapel zusammenkommen. Dann entlädt er sich und
trifft die **ganze Reihe** des Trägers für 1,2 % ihres maximalen Lebens je
Stapel, und die Ladung beginnt von vorn. Gift und Brand ticken stetig,
Verwundbar und Verderbnis wirken dauerhaft — Donner sammelt und schlägt zu. Das
belohnt es, viele Gegner gleichzeitig aufzuladen. Die Resonanz senkt die Schwelle
auf vier.

**Ranga** ist von Frost auf Donner und Schatten umgebaut — Signatur „Schwarzer
Blitz" lädt jetzt statt zu lähmen, alle sechzehn Linien neu. Damit trägt keine
Signatur mehr Frost; es lebt in der Bibliothek (`frostkern`, `frostschneide`),
im Aufstiegs-Pool und bei den Gegnern weiter. Die Frost-Tests ziehen ihren
Träger jetzt von dort.

Ein Detail, das beim Schreiben der Entladung auffiel: sie kann sich selbst
auslösen — der Schaden tötet, `onDeath` legt neuen Donner an, und das ruft die
nächste Entladung. Ein Sperrflag verhindert die Kette.

Ergebnis `dev/balance.js 600`: 50 % frisch, 62 % voll; `GRUNDHAERTE` 1.00 → 1.02.

Weitere offene Punkte:
- Der Abstand zwischen Anfänger und Veteran ist auf 12 Punkte gewachsen
  (48 gegen 60 %) — der Markt nach jedem Kampf belohnt einen großen Reliktpool
  stärker als früher der einzelne Händler-Knoten.
- Konter liegt bei 76 % Siegquote knapp über dem Zielband 25–75 %.
- Der Aufstiegs-Pool aus 34 Aktiven wird vom Spieler nicht mehr gezogen und lebt
  nur noch als Gegner-Repertoire. Entweder in Passive umbauen oder bewusst als
  Gegnerinhalt führen.
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
- Alle Einheiten haben Linien, aber die Hälfte kommt aus dem Generator und
  staffelt nur dieselbe Zahl vier Mal. Siehe Phase 21.
- Boss-Pool 1 streut: Clayman 90 %, Milim 40 % gegen denselben Referenztrupp.
  Claymans Selbstheilung war für Boss plus Gefolge entworfen und macht ihn
  allein stehend entweder unkaputtbar oder wirkungslos. Pool 2 liegt bei 61–65 %.

### Phase 21 (2026-07-29): Linien nach RPG-Vorbildern

Der Generator hat 40 Einheiten Linien gegeben, aber er kann nur eines: dieselbe
Wirkung vier Mal größer schreiben. Stufe 4 ist Stufe 1 mit einer anderen Zahl,
und ob jemand Angriff oder Defensive gewählt hat, sieht man dem Kampf nicht an.
Vier geliehene Konzepte geben jeder Stufe eine eigene Aufgabe. Die
Linien-Übersicht im Menü (Reiter „Entwicklungslinien") ist das Werkzeug, an dem
sich das prüfen lässt: was dort langweilig zu lesen ist, ist auch langweilig zu
spielen.

**Stufe 1 — Signaturbindung.** Bleibt wie bisher und bleibt Handarbeit: die
Passive verstärkt genau die eine Signatur der Einheit. Das ist der Teil, den ein
Generator nicht erzeugen kann, weil er die Signatur verstehen müsste.

**Stufe 2 — Kampfmanöver-Würfel** *(D&D, Battle Master)*. Statt „+15 % Schaden"
ein Zähler: er füllt sich unter einer Bedingung und wird bei einer anderen
ausgegeben. Beispiel Angriff: jeder erlittene Treffer gibt eine Ladung, drei
Ladungen verdoppeln den nächsten Angriff. Damit hat der Trupp eine Ressource zu
verwalten und der Kampf einen Rhythmus, statt nur einen höheren Multiplikator.

**Stufe 3 — Voraussetzung** *(Pathfinder, Feat-Chains)*. Die Passive verlangt
etwas vom Trupp, nicht von der Einheit: ein Schlüsselwort, das jemand anderes
mitbringt. Beispiel: „solange ein Verbündeter Blutung trägt, …". Das macht die
Reihenfolge der Anwerbungen zu einer Entscheidung und belohnt Bauen statt
Sammeln — dieselbe Idee wie die Resonanzen, aber pro Einheit statt pro Trupp.

**Stufe 4 — Keystone mit Nachteil** *(Path of Exile)*. Kein Bonus, sondern eine
geänderte Regel, die etwas kostet: doppelter Schaden bei halber Rüstung, keine
Heilung dafür Schild aus jedem Treffer. Ein Endpunkt, den man auch **ablehnen**
können muss — deshalb bekommt Stufe 4 eine „nichts nehmen"-Option.

**Linienbindung** *(D&D, Subklasse)*. Ab Stufe 2 geht es nur noch in derselben
Linie weiter. Heute lässt sich quer mischen, und genau deshalb sehen alle Trupps
gleich aus: wer immer das Stärkste nimmt, baut immer dasselbe. Die Wahl bei
Stufe 1 wird damit erst zu einer Wahl. Zu messen ist, ob die Siegquote dadurch
unter das Zielband rutscht — die Bindung nimmt dem Spieler eine Korrekturmöglichkeit.

**Umgesetzt** für die 20 Generator-Einheiten. Statt vier Mal derselben Zahl
tragen die vier Linien jetzt vier Rollen: Angriff wirkt auf den eigenen Schlag,
Mechanik auf den Themeneffekt, Unterstützung auf den Trupp, Defensive auf das
Überleben — und jede Stufe hat quer über alle vier dieselbe Aufgabe
(Auftakt / Manöverzähler / Voraussetzung / Keystone). Die Namen heißen nicht
mehr „Zegion: Angriff 3", sondern `Zegion: Gleichschritt`.

Zwei Stellen tragen das System: `ausbruch()` ist der einzige Ort, an dem ein
Thema „losgeht" — Auftakt, Zähler und Voraussetzung zünden denselben Effekt und
unterscheiden sich nur im Wann. `truppFuehrt()` fragt das Schlüsselwort
ausdrücklich bei den *anderen* Einheiten ab; täte es das nicht, wäre die
Voraussetzung ein verkappter Eigenbonus.

Beim Messen aufgefallen: Der Unterstützungs-Keystone („Geteiltes Los": der Trupp
schlägt 22 % härter, die Einheit selbst nur noch mit einem Drittel) ist für eine
allein stehende Einheit reiner Verlust. Ein Preis ohne Gegenleistung ist keine
Entscheidung, sondern eine Falle — er greift jetzt nur mit Verbündeten.

Ergebnis `dev/balance.js 600`: 61 % frisch beim ersten Durchlauf, also klar zu
stark. Alle Zahlen einmal quer heruntergedreht auf 58 %, dann `GRUNDHAERTE`
1.02 → 1.06 für die letzten Punkte. Endstand 52 % frisch. Der Konter-Build fiel
dabei von 83 auf 72 % und liegt damit wieder im Zielband.

**Nachgezogen (2026-07-29): Linienbindung und Verzicht.** Beides sitzt in
`passivAngebot`. `AB.linien_kat` sagt, in welcher der vier Linien eine Passive
steht; ab Stufe 2 filtert das Angebot auf die Linie der ersten. Auf Stufe 4
steht ein `{ verzicht: true }`-Posten daneben, den `choosePassive` abräumt, ohne
etwas anzuhängen — die Einheit bleibt dann bei drei Passiven.

Die Messung war die Überraschung dieser Phase: die Bindung hebt die Siegquote
von 52 auf **60 %**, statt sie zu senken. Weniger Auswahl macht den Trupp
stärker, weil vier Stufen derselben Linie dasselbe Schlüsselwort vier Mal
stapeln — Resonanzen und die Voraussetzung auf Stufe 3 greifen dadurch fast
immer. Freie Wahl hatte die Builds verwässert, nicht geschärft.

Der erste Erklärungsversuch war, dass die Voraussetzung zu leicht zu erfüllen
geworden ist. Ihre Belohnung einmal quer heruntergedreht brachte aber nur einen
Punkt (60 → 59 %) — der Gewinn liegt in der Schlüsselwort-Dichte selbst, nicht
an einer einzelnen Stufe. Also über `GRUNDHAERTE` 1.06 → 1.17 gegengesteuert;
Endstand **51 % frisch**. Der Konter-Build ist damit keine Auffälligkeit mehr,
Heilung liegt mit 76 % knapp über dem Band.

`dev/balance.js` musste mitziehen: der Bot bewertet den Verzicht wie ein
Angebot ohne Treffer und lehnt den Keystone damit genau dann ab, wenn er zum
Build nichts beiträgt.

### Phase 22 (2026-07-29): Die Bibliothek war unerreichbar

Vor dem Umbau des Aufstiegs-Pools (TODO-Punkt 1) stand die Frage, wohin die
umgeschriebenen Fähigkeiten eigentlich fließen sollen. Die Antwort war
unangenehm: **nirgendwohin**. Seit alle 40 Einheiten eigene Linien haben, gibt
`passivIds` für jede Einheit nur noch die gewählten Linien-Passiven zurück; der
Zweig für die feste Liste aus `data.js` ist unerreichbar, und mit ihm die
gesamte Bibliothek aus 34 geteilten Passiven. Auch der Kategorien-Zweig in
`passivAngebot` lief nie. Nachgewiesen mit einem echten Run: eine frisch
angeworbene Einheit trägt `knecht_mec1`, ihre drei `data.js`-Passiven
(`rachsucht`, `dornenhaut`, `konterstoss`) tauchen weder im Angebot noch im
Kampf auf. Der geplante Ausbau der Bibliothek von 34 auf 68 hätte einen Topf
verdoppelt, aus dem niemand zieht.

Die Bibliothek hängt jetzt an der Stelle, die ohnehin eine Alternative
brauchte: dem Keystone auf Stufe 4. Er kostet etwas, also stehen daneben zwei
Bibliotheks-Passiven — schwächer, dafür ohne Preis — und der Verzicht. Damit
ist aus „nichts nehmen" eine echte dritte Option geworden, und die Bibliothek
hat wieder einen Weg zum Spieler. Der Kategorien-Zweig ist zu
`bibliotheksAngebot()` geworden und wird von beiden Seiten benutzt, statt
tot herumzuliegen.

Gemessen kostet das Siege: 51 → 47 %, weil die Bibliothek schwächer ist als ein
Keystone und der Bot sie nimmt, sobald sie besser zum Build passt. Das ist der
Preis der Wahlfreiheit und richtig so. `GRUNDHAERTE` 1.17 → 1.14, Endstand
**50 % frisch** — und erstmals seit Phase 20 steht kein einziger Build mehr auf
der Auffälligkeitenliste.

Offen aus Phase 21/22:
- `GRUNDHAERTE` ist in einer Sitzung von 1.02 auf 1.14 gewandert. Der globale
  Knopf hat die Zahl geradegezogen, aber er trifft auch die 20 handgeschriebenen
  Einheiten, die gar nicht stärker geworden sind. Prüfen, ob die
  Generator-Linien stattdessen an der Wurzel zu breit sind.
- `dev/linien.js` zeigt die Angriffslinie über alle 20 Einheiten vorn
  (+0,2 bis +0,57 am Bruchpunkt), die Unterstützungslinie hinten. Das Werkzeug
  misst eine Einheit allein — genau der Fall, in dem eine Trupp-Linie nichts
  wert sein kann. Entweder misst `linien.js` künftig mit Trupp, oder die
  Aussage bleibt für Unterstützung unbrauchbar.

### Phase 23 (2026-07-29): Alle Linien nach dem Vier-Stufen-Aufbau

Phase 21 hat den Aufbau nur den 20 Generator-Einheiten gegeben. Die 20
handgeschriebenen hatten Charakter, aber keine Struktur: Gobtas Angriffslinie
war vier Mal „Chance auf Extraschaden", und dem Kampf sah man nicht an, welche
Stufe gerade lief. Jetzt tragen alle 40 Einheiten dieselben vier Rungs —
Auftakt, Manöverzähler, Voraussetzung, Keystone — bei unverändertem Thema.
Shion ist auf Wunsch inhaltlich unangetastet geblieben und nur nachgezogen
worden.

304 Passive neu geschrieben, Art für Art mit einer Messung dazwischen:
Goblins (51 %), Oger (49 %), Sturmwölfe, Echsenmenschen. `zaehler` und
`truppFuehrt` aus der Generator-Schicht tragen jetzt auch die handgeschriebenen
Linien — dieselbe Mechanik, keine zweite Implementierung.

**Drei Befunde aus dem Messen:**

*Leere Listen.* `onDamaged` feuert auch, wenn eine Gift- oder Brandmarke den
letzten Gegner gerade erledigt hat. Ein blankes `reduce` über `foes()` wirft
dort. `schwaechstes()` ist die eine Stelle, die das abfängt; die vier Aktiven
mit demselben Muster sind nicht betroffen, weil die Zugschleife dort ein Ziel
garantiert.

*Sammelbegriffe.* Der Heilungs-Build stieg auf 82 %. Zwei Runden Zahlen-Trimmen
bewegten ihn um einen Punkt — weil die Ursache nicht die Stärke war, sondern
dass ich `heilung` an fast jede Defensive-Stufe-2 gehängt hatte. Ein kleiner
Selbstheil-Tick ist keine Heilungs-*Quelle*; das Schlüsselwort an jeder zweiten
Passive macht die Auswertung blind. Genau das Risiko, das in Abschnitt 5 steht.
Nach dem Entkoppeln: 78 %.

*Unbegrenztes Stapeln.* Shions Linien lagen bei Rang S bei +1,18 und +1,22 am
Bruchpunkt, während der Rest des Rosters zwischen −0,24 und +0,4 liegt. Ursache
ist nicht eine einzelne Zahl, sondern dass `Gesetzlosigkeit` Chaos nie abbauen
lässt und jede „je Stapel"-Skalierung dadurch unbegrenzt wächst. Die Zahlen sind
gesenkt **und** die Skalierungen gedeckelt (+50 % bzw. +45 %).

Ebenso an die Messgrenze (3,00) schlugen drei Linien, die ich selbst gebaut
hatte: Shunas und der Priesterin Unterstützungslinie legten auf Stufe 3 einen
Schadensdeckel über den ganzen Trupp — eine Defensiv-Wirkung auf einer
Trupp-Linie, stärker als der Defensiv-Keystone daneben. Sie geben jetzt
Regeneration. Soukas `Unsichtbar` legte jeden Zug Schatten nach und machte sie
unantastbar; es greift nur noch jeden zweiten Zug.

Zuletzt roster-weit: der Schadensdeckel skaliert mit dem maximalen Leben und
wird bei Rang S zur stärksten Wirkung im Spiel. Alle Keystone-Deckel sind um
3,5 Punkte gelockert — samt der Beschreibungstexte, die sonst etwas anderes
behauptet hätten als der Kampf tut.

Ergebnis `dev/balance.js 600`: 51 % frisch, `GRUNDHAERTE` 1.14 → 1.11.

Nach allen Trimms bleibt Shunas Defensivlinie der letzte gemessene Ausreißer
(+1,38): Startschild, bedingte Wiederkehr und Deckel stapelten sich. Schild und
Wiederkehr sind gesenkt.

Offen aus dieser Phase:
- `dev/linien.js` braucht jetzt über zehn Minuten statt drei. Die Kämpfe selbst
  sind schnell (40 Einheiten × 4 Linien in 0,4 s gemessen) — die Binärsuche
  läuft nur öfter, weil zähere Einheiten den Bruchpunkt weiter oben suchen.
  Kein Fehler, aber der Prüfstand braucht eine Obergrenze oder gröbere Schritte.
- Der Heilungs-Build liegt mit 79 % weiter knapp über dem Zielband. Er stand
  aber schon vor dieser Phase bei 76–77 % — das ist ein alter Befund, kein
  neuer.
- Shions Linien liegen nach dem Deckeln immer noch über dem Roster. Ihr Thema
  ist unbegrenztes Stapeln; solange das so bleibt, hilft nur Deckeln, nicht
  Senken.

### Phase 24 (2026-07-29): Keine Stufen mehr

Die sechzehn Passiven einer Einheit sind jetzt ein Topf, kein Pfad. Es gibt
keine Stufe 1–4 und keine Linienbindung: angeboten wird bei jedem Aufstieg eine
Passive je Linie, zufällig aus dem, was die Einheit noch nicht trägt. Die vier
Linien bleiben die Struktur der *Wahl* — sie sind keine Reihenfolge mehr.

`linienAngebot(unitId)` gibt deshalb alle sechzehn zurück statt vier einer
Stufe; wer zieht, filtert selbst. Gezogen werden vier — ohne Quote je Linie, aus
dem ganzen Topf. Dass es heute sechzehn sind und vier je Linie, ist Inhalt und
keine Regel: wächst der Topf, zieht `passivAngebot` unverändert weiter. Gemessen
über 300 Angebote streut das gut (2–3 verschiedene Linien im Regelfall, alle
vier aus derselben Linie genau ein Mal). Die Rungs aus Phase 21 sind als *Inhalt*
geblieben (Auftakt, Manöverzähler, Voraussetzung, Keystone), aber sie sind keine
Positionen mehr. Was einen Preis kostet, trägt jetzt ein `preis`-Kennzeichen —
das Angebot braucht es, um „nichts nehmen" danebenstellen zu können. Der
Startzustand beim Anwerben zieht ausdrücklich *keine* Passive mit Preis: einen
Nachteil aufgedrängt zu bekommen, bevor man die Einheit gespielt hat, ist keine
Entscheidung. `AB.linien_kat` ist mit der Bindung weggefallen.

Die Übersicht im Menü zeigt jetzt auch die **Signatur** — die eine Aktive, die
die Einheit immer führt. Ohne sie las sich die Seite wie eine Liste ohne Mitte:
Benimarus Brand-Passive ergeben erst Sinn, wenn daneben steht, dass seine
Signatur das Feuer legt. Die vier Passiven mit Preis sind dort markiert.

**Die Messung ist das Interessante.** Ohne Bindung fiel die Siegquote von 51 auf
40 % — die Umkehrung des Befunds aus Phase 21, und aus demselben Grund: vier
Passive derselben Linie stapeln dasselbe Schlüsselwort, freie Kombination
streut es. Der freie Zug aus dem ganzen Topf holt einen Teil davon zurück
(40 → 57 %), weil vier beliebige Passive öfter zusammenpassen als vier
erzwungen verschiedene. `GRUNDHAERTE` 1.11 → 1.08, Endstand **50 % frisch**.

Dafür ist die Auffälligkeitenliste die kürzeste dieser Sitzung: **kein einziger
Build-Ausreißer mehr**. Der Heilungs-Build stand die ganze Sitzung über bei
76–82 % und ließ sich durch kein Zahlen-Trimmen bewegen; er verschwindet, sobald
sich Schlüsselwörter nicht mehr vier Stufen tief stapeln lassen. Die Ursache war
also nie die Stärke einzelner Passiven, sondern die Struktur, die sie in eine
Reihe zwang.

### Phase 25 (2026-07-29): Vier Einheiten nach ihren Leitmotiven

Ein Inhaltsdurchgang, keine Mechanik: die Linien sollen lesen wie die Figur.

**Benimaru — Feuer als Magie, und Feldherrschaft.** Sein Feuer fragt nicht mehr
nach Rüstung: `Glutzorn` durchschlägt sie, `Schwarze Flamme` ersetzt den alten
Prozent-Aufschlag durch reinen Flammenschaden, den weder Rüstung noch Schild
aufhält, und `Entfesseltes Kurenai` macht das dauerhaft. Damit unterscheidet er
sich mechanisch von Hakuros Klinge, nicht nur im Text. Die Unterstützungslinie
befehligt jetzt (`Angriffsbefehl` statt eines stillen Aufschlags), statt nur
Zahlen zu erhöhen.

**Souei — der Assassine.** Neu: `Aus dem Nichts` (Auftakt aus der
Verstohlenheit, danach taucht er wieder ab), `Wurfklingen` (Fernkampf auf die
ganze Reihe), `Schattendoppel` (der Doppelgänger schlägt mit — 55 % je Treffer,
wenn ein Verbündeter Schatten führt), `Meuchelschnitt` (Hinrichtung markierter
Ziele), `Stahlfäden` (Fäden legen Verwundbar UND Blutung). Marke, Gift, Blutung
und Schatten sitzen damit alle auf ihm.

**Shuna — drei Arten Magie.** Ihre Angriffslinie schlägt nicht mehr mit der
Klinge, sondern mit Licht: `Heiliger Strahl`, `Läuterung`, `Gericht`. Der
gemeinsame Nenner ist `heiligerSchlag()` — Schaden, der weder Rüstung noch
Schild kennt und genau deshalb in kleinen Anteilen bleibt. Heilung und
göttlicher Schutz stehen unverändert in den anderen drei Linien.

**Adalmann — der abgefallene Priester.** Er stand im Generator; jetzt hat er
eigene Linien, weil sein Charakter genau die Reibung ist: Totenmagie aus dem
Grab (`Todesbann`, `Grabesatem`, `Verfluchtes Wort`) neben göttlicher
Angriffsmagie aus der alten Ausbildung (`Totengebet`, `Bannstrahl`,
`Sterbesakrament`). Der Generator zählt damit noch 19 Einheiten.

**Zwei tote Flags gefunden.** `zaeherBrand` wurde in Phase 23 gesetzt und von
der Engine nie gelesen — das Feld heißt `brandBleibt`, und es gehört auf das
brennende ZIEL, nicht auf den Anzünder. `Dauerbrand` tat seitdem schlicht
nichts. Für Verderbnis gab es gar keinen Abbau-Stopp; er ist jetzt da
(`verderbnisBleibt`), nach demselben Muster wie `offeneWunde` und `zaehesChaos`.
Gemessen: Brand tickt ohne Flag sechs Mal, mit Flag 150 Mal. Zwei Tests halten
das fest — genau diese Art Flag verschwindet still, wenn der Name nicht passt.

Souei trug danach eine Mechanik zu viel — Marke, Blutung, Schatten,
Doppelgänger *und* Gift. `Giftmal` ist zu `Fadennetz` geworden: die Fäden
schneiden auf markierten Zielen nach, was dieselbe Arbeit tut und ihm gehört.
Gift lebt in der Bibliothek und bei Apito und dem Giftfalter weiter.

**Tick-Regeln aufgeschrieben.** Der Flag-Fund hat gezeigt, dass nirgends stand,
wie oft ein Zustand überhaupt wirkt — und die Antwort ist nicht offensichtlich:
Zustände ticken **je Zug ihres Trägers**, nicht pro Runde. Daraus folgt, dass
Tempo jeden Schaden über Zeit verstärkt und Erstarrung nicht davor schützt. Das
steht jetzt an drei Stellen, jede für ihr Publikum: eine Tabelle über der
Status-Schleife in `js/combat.js` (Reihenfolge, Schaden je Stapel, die vier
Abbau-Flags und auf wem sie sitzen), zwei Glossar-Einträge im Spiel (`ticken`,
`abbau`) und ein Abschnitt in `GAMEGUIDE.md`. Zwei UI-Tests prüfen, dass die
Erklärung im Menü ankommt.

`dev/balance.js 600`: 50 % frisch, `GRUNDHAERTE` unverändert bei 1.08.

### Phase 26 (2026-07-29): Shions Verwandlung

Shions Rangleiter heißt seit jeher C Oger, B Teufel, A Verdorbener Teufel,
S Ultimativer Teufel — im Kampf war davon nichts zu sehen. `Verdorbener Teufel`
macht die dritte Stufe sichtbar: Triffst du ein Ziel mit **10 Chaos**, während
du selbst **10 Antichaos** hältst, verwandelt sich Shion einmal je Kampf —
+45 % Angriff, +25 % Leben, +20 % Tempo, und ihre Signatur wird durch die
`Chaosklinge des Verdorbenen` ersetzt (230 % Schaden, doppelte Chaos-Menge).

Die Passive kostet nichts, weil die **Bedingung der Preis ist**: zehn Chaos auf
dem Ziel bekommt nur, wer stapelt, und zehn Antichaos auf sich selbst nur, wer
den Realitätswarp trägt. Gemessen bestätigt: ohne Antichaos-Quelle fällt die
Schwelle nie, mit dem Warp genau einmal. Drei Tests halten beides fest.

Zwei Dinge mussten dafür nachziehen:

- Die **Preis-Marke** hing an der letzten Stelle einer Linie. Shions
  Angriffslinie hat jetzt fünf Passive, und die Marke wäre von `Verzerrter
  Titan` auf die neue gewandert. Sie hängt nun an der festen vierten Stelle —
  Linien dürfen damit wachsen, ohne dass sich etwas verschiebt.
- Der **Signaturzähler** im Test verlangte genau eine je Einheit. Die
  Chaosklinge gehört keiner Einheit fest, sie ersetzt erst im Kampf; der Test
  trennt jetzt Signaturen von Verwandlungsformen und verlangt beides.

Die Verwandlung steht auch im Kampflog (`✦ Shion wird zum Verdorbenen Teufel`).
Der seltenste Moment eines Kampfes darf nicht stumm bleiben.

`dev/balance.js 600`: 51 % frisch, `GRUNDHAERTE` unverändert.

### Phase 27 (2026-07-29): Stapel-Ausrüstung, Shions Rad, Rimurus Kit

**Zwei generische Stellschrauben.** `applyStatus` kannte bisher nur
Spezialfälle (`chaosmeister`, `markenmeister`). Jetzt nimmt es den Anleger
entgegen und multipliziert über zwei Felder: `fluchmeister` für Stapel auf
GEGNER, `segenmeister` für Stapel auf die EIGENE Reihe. Beide sitzen am
Anleger, nicht am Ziel — sonst verstärkte ein Relikt versehentlich auch fremde
Marken. Die Spezialfälle multiplizieren obendrauf.

Darauf fünf Ausrüstungsstücke (Fluchring, Segensring, Chaoszepter,
Ordnungsreif, Markenbrenner) und drei Relikte (Fluchsiegel, Segensbanner,
Verzerrter Spiegel). Die Relikte sind kleiner dosiert: ein Faktor auf fünf
Einheiten multipliziert sich mit allem, was sie ohnehin anlegen.

**Shion, drei weitere Passive am selben Rad.** Chaos und Antichaos sind
dieselbe Mechanik, einmal nach unten und einmal nach oben — die neuen drehen
daran, statt Zahlen zu erhöhen: `Chaosernte` erntet die Ladung eines fallenden
Ziels in dauerhaften Angriff und Trupp-Antichaos, `Umkehr der Ordnung` zieht
jeden Zug Chaos vom belastetsten Gegner ab und gibt es dem schwächsten
Verbündeten als Antichaos, `Ordnungspanzer` wandelt Antichaos in Schadensabwehr
und verbraucht es dabei. Shion hat damit 20 Passive.

**Rimuru komplett neu.** Er stand im Generator und hatte 16 nichtssagende
Linien. Seine Signatur heißt jetzt `Prädator` und trägt die Idee: er legt als
einziger keine eigene Marke an, er LIEST das Feld. Jeder *verschiedene* Zustand
auf dem Ziel wird zu einem Antichaos-Stapel für ihn, und je Stapel trifft er
härter. Damit hängt seine Stärke daran, was der übrige Trupp anrichtet — er ist
der einzige Baustein, der von FREMDEN Schlüsselwörtern lebt, und die Gegenfigur
zu Shion: sie sät Unordnung, er erntet Ordnung. Gemessen: allein bekommt er null
Antichaos, neben Shion sofort dauerhaft welches.

Seine sechzehn Linien führen das aus — `Große Weisheit` (Schaden je gelesenem
Zustand), `Magen der Unendlichkeit` (verschlingt Stapel und macht Antichaos
daraus), `Analyse teilen` (gibt Antichaos an den Trupp weiter), `Unendlicher
Kerker` (Zustände auf seinen Zielen bauen sich nicht mehr ab, dafür legt er
selbst keine an).

**Antichaos hatte keine Obergrenze.** Das fiel nie auf, weil Chaos nur nach
unten zieht — bis Rimuru anfing, es zu ernten: in einem langen Kampf standen
gemessen 481 Stapel, und der Wurf verließ jede Skala. `CHAOS_MAX = 2.2` deckelt
ihn jetzt. Ein Test prüft beides: gedeckelt bei 500 Stapeln, wachsend darunter.

**Und ein Wächter gegen die Fehlerklasse.** `zaeherBrand` tat zwei Phasen lang
nichts, weil das Feld in Wahrheit `brandBleibt` heißt; beim Schreiben von Rimuru
wäre mir mit `antichaosDoppelt` fast dasselbe passiert. Ein Test geht deshalb
quer über alle Fähigkeiten, sammelt jedes Feld, das eine Fähigkeit einer Einheit
zuweist, und verlangt, dass es in `combat.js` überhaupt vorkommt. Das findet den
Tippfehler in dem Moment, in dem er entsteht.

`dev/balance.js 600`: 51 % frisch, kein Build-Ausreißer, `GRUNDHAERTE` unverändert.

### Phase 28 (2026-07-29): Weniger Wölfe, drei neue Kits

**Vier Schattenwölfe waren zu viel.** Ranga (Donner, Schatten, Tempo) und drei
weitere derselben Art, deren Rollen sich mit ihm überschnitten. Geblieben sind
Ranga und der **Sturmwolf** — Hetzjagd, Exekution, Blutung, also die einzige der
drei Wolfsrollen ohne Überschneidung. **Schattenwolf** und **Rudelalpha** sind
gestrichen, samt Signaturen, 32 Linien-Passiven und Freischalt-Eintrag. Der
Roster steht damit bei 38 Einheiten.

Das Streichen legte zwei Löcher frei, und beide sind beim Handschreiben der
nächsten drei Einheiten gefüllt worden:

- **Dunkelheit** hatte im ganzen Roster nur einen Träger — den Schattenwolf.
  Sie sitzt jetzt bei **Diablo**, dem Urtümlichen Schwarzen, wo sie ohnehin
  hingehört. Sein Kit ist die einzige Zange im Spiel, die von zwei Seiten
  drückt: Dunkelheit senkt, was der Gegner austeilt, Verderbnis erhöht, was bei
  ihm ankommt. Dazu `Ewige Nacht`, die fünfte Fähigkeit, die einen Abbau
  aussetzt (`dunkelheitBleibt`).
- **Frost und Erstarrung** hatten seit Phase 20 überhaupt keinen Träger mehr —
  ein Element lebte nur noch in der Bibliothek und bei Gegnern. **Veldora**
  holt sie zurück: Sturm heißt bei ihm Fläche plus Frost, Böen über die ganze
  Reihe und Gegner, die erstarren. Donner bleibt bei Ranga, damit sich die
  beiden Wetterlagen nicht doppeln.

**Milim** ist die dritte und die ungewöhnlichste: sie trägt als einzige Einheit
im Spiel **gar keinen Zustand**. Ihre Linien sind reine Zahlen, die sich
gegenseitig aufschaukeln — `Drachenzorn` schlägt auf dasselbe Ziel mit jedem
Schlag 12 % härter, `Drakonische Wut` wächst pro Zug ohne Grenze, `Unsterbliche
Drachin` steht mit doppeltem Angriff wieder auf. Das ist ihr Charakter und
zugleich die Nische, die im Roster fehlte: ein Bau, der nichts anlegt.

Zwei Namen saßen falsch und sind mitgewandert: Diablos Signatur hieß
schlicht `Verderbnis` — im Kampflog nicht vom Zustand zu unterscheiden — und
heißt jetzt `Belial`, was kanonisch ohnehin seine Fähigkeit ist. Rimurus
Keystone trug diesen Namen zu Unrecht und heißt jetzt `Azathoth`.

**Der Wächter-Test hat sich zum ersten Mal bezahlt gemacht.** Er fing
`dunkelheitBleibt` in dem Moment, in dem ich es schrieb — dasselbe Muster, das
bei `zaeherBrand` zwei Phasen lang unbemerkt blieb.

`dev/balance.js 600`: 51 % frisch, `GRUNDHAERTE` unverändert.

### Phase 29 (2026-07-29): Wolf und Reiter, Diablo in den Schatten

**Die erste Truppbedingung, die an einer ART hängt.** Bisher fragten alle
Voraussetzungen nach einem Schlüsselwort. Goblins reiten Sturmwölfe — das stand
im Roster bisher nur als Fluff. Sechs neue Passiven machen daraus eine
Bau-Entscheidung, und zwar auf zwei Ebenen:

- **Allgemein, beim Sturmwolf.** `Wolfsreiter` (+25 % Angriff und +15 % Tempo
  für Wolf UND Reiter), `Reiterei` (je Goblin +7 % Tempo für den Trupp),
  `Aufgesessen` (der Reiter pariert mit, 22 % weniger Schaden). Damit werten
  sich der billigste Anfang und der billigste Wolf gegenseitig auf.
- **Namentlich, bei Ranga.** `Schattenfusion` greift nur mit **Gobta** — nicht
  mit irgendeinem Goblin. Dann verschmelzen die beiden: +45 % Angriff, +35 %
  Tempo, 6 Schatten, Gobta +25 % Leben, und Rangas Signatur wird zum
  `Schwarzen Blitz der Fusion` (210 % auf die ganze Reihe plus 4 Donner auf
  jeden). Dazu `Rudel und Stamm` und `Schattenreiter`.

Die Fusion ist nach Shions Verwandlung die zweite Form im Spiel, die eine
Signatur ersetzt. Vier Tests halten die Grenzen: ohne Goblin folgenlos, mit
einem anderen Goblin keine Fusion, mit Gobta genau einmal.

**Diablo weg von Verderbnis.** Vier Einheiten führten sie ohnehin (Gobta,
Ultima, Dämonengarde, Adalmann) — als fünfter Träger war er austauschbar. Er
führt jetzt **Dunkelheit und Schatten**, zwei Finsternisse an verschiedenen
Enden derselben Rechnung: Dunkelheit senkt, was der Gegner *austeilt*, Schatten
lässt Treffer an ihm ganz danebengehen. Der perfekte Diener wird nicht getroffen
und schlägt zurück, während niemand ihn sieht. Seine Signatur `Belial` legt
entsprechend Dunkelheit an und zieht ihn selbst in den Schatten.

Die Schlüsselwörter stehen danach: Verderbnis 4 Träger, Schatten 4, Dunkelheit
und Frost und Donner je 1, Chaos 2.

`dev/balance.js 600`: 50 % frisch, `GRUNDHAERTE` unverändert.

### Phase 30 (2026-07-29): Zweite Träger für Dunkelheit, Frost und Donner

Drei Schlüsselwörter hingen an je einer Einheit — fällt sie im Draft nicht,
existiert das Element für diesen Run nicht. Jedes hat jetzt einen zweiten
Träger, handgeschrieben statt umgethemt:

- **Windrache — Donner.** Ranga lädt einen Gegner nach dem anderen auf, der
  Windrache lädt breit und schnell. Tempo bleibt sein zweites Standbein: er ist
  öfter am Zug, also lädt er öfter nach. Darin liegt der Unterschied.
- **Gruftwächter — Frost.** Bei Veldora heißt Frost Sturm, beim Wächter
  Stillstand. Weil Erstarrung auf EINEN Stapel gedeckelt ist, zählt nicht die
  Menge, sondern wie oft sie fällt — sein `Mausoleum` lässt jeden Zug alle
  Gegner erstarren und kostet dafür drei Viertel seines Angriffs.
- **Seelenhexe — Dunkelheit.** Diablo umnachtet und verschwindet dabei selbst;
  die Hexe umnachtet und ZIEHT daraus. Jeder Stapel auf einem Gegner ist für sie
  eine Seele, aus der sie Leben für den Trupp holt — der einzige Bau im Spiel,
  der eine Gegnermarke in Heilung umrechnet.

Handgeschrieben, weil der Generator es hier nicht könnte: seine Status-Linien
legen `2 × Stärke` Stapel an, und Erstarrung ist auf einen gedeckelt — die
Hälfte davon verpufft. Donners Schwelle drückt er ebensowenig aus.

**Ein Duplikat entfernt.** Die Liste der Generator-Einheiten stand ein zweites
Mal ausgeschrieben und lief `LINE_UNITS` hinterher: wer von Hand geschrieben
wurde, bekam seine Linien danach wieder mit erfundenen IDs überschrieben. Das
fiel erst auf, als drei Einheiten mit kurzen Präfixen (`wind_`, `gruft_`,
`hexe_`) nicht mehr zufällig auf das Muster passten. Jetzt zieht die Schleife
aus `LINE_UNITS`.

**Und ein Fehlalarm, dem ich aufgesessen bin.** `dev/balance.js` meldete
„Build frost: 0 % (15)". Ich habe daraufhin Erstarrung so geändert, dass ein
abgeschüttelter Frost trotzdem Tempo nimmt — und dann nachgemessen: ein
Frost-Trupp gewinnt **100 %** gegen Clayman, Milim und Hinata. Die Änderung war
auf einer Fehldiagnose gebaut und ist zurückgenommen.

Der Grund für die 0 %: der Build wird am ENDE eines Runs bestimmt. Wer in Akt 1
stirbt, hat kaum Einheiten und landet in einem kleinen Eimer. Die Tabelle zeigt
jetzt je Eimer die durchschnittliche Lauftiefe — `frost 0 % (15) Ø Knoten 1.9`,
dieselbe Tiefe wie „kein Build" — und die Auffälligkeitenliste überspringt
Eimer, deren Runs im Schnitt vor Knoten 4 sterben. Ein Werkzeug, das solche
Runs als Balance-Problem meldet, schickt einen zuverlässig in die falsche
Richtung.

Schlüsselwörter danach: Dunkelheit, Frost, Donner und Chaos je 2 Träger,
Schatten und Verderbnis je 4. Generator: noch 12 Einheiten.

`dev/balance.js 600`: 50 % frisch, kein Build-Ausreißer.

### Phase 31 (2026-07-29): Der Generator ist weg

Zwölf Einheiten kamen noch aus dem Generator, und neun davon trugen ein Thema,
das eine andere Generator-Einheit auch schon hatte: Konter dreimal, Gift, Brand
und Verderbnis je zweimal. Erst ausgedünnt, dann handgeschrieben.

**Gestrichen (3):** Riesenameise und Skelettritter waren beide Konter-Frontlinie
für einen Punkt — dasselbe Kit in zwei Arten. Der Giftfalter doppelte Apito.
Roster: 38 → 35.

**Handgeschrieben (9),** jede mit einer Idee, die es im Spiel noch nicht gab:

- **Zegion** greift nicht den Körper an, sondern die Deckung davor: er
  ZERSCHLÄGT Schilde, statt sie zu durchdringen. Die erste Einheit, deren Wert
  am Gegner hängt statt am eigenen Trupp.
- **Apito** legt Gift nicht an, sondern züchtet es — ihre Stapel wachsen von
  selbst nach.
- **Käfergarde** ist die einzige, deren Schilde mit der TRUPPGRÖSSE wachsen.
- **Testarossa** macht aus Exekution eine Kette: jeder Abschuss zahlt den
  nächsten mit Angriff und einem weiteren Zug.
- **Ultima** zieht aus Verderbnis direkten Schaden, statt sie nur zu verstärken.
- **Carrera** legt kein Feuer, sie ZÜNDET liegendes: Brand-Stapel werden zu
  einem Schlag und erlöschen dabei. Ein Bau, der von der Arbeit anderer lebt.
- **Dämonengarde** kontert nicht als Reaktion, sondern wird mit jedem
  Austausch schneller und härter.
- **Drachenwelpe** frisst Feuer und wächst daran — dauerhaft, über den Kampf.
- **Wight-König** ist der einzige, dessen Stärke an GEFALLENEN hängt statt an
  Verwundeten. Für ihn ist ein Toter kein reiner Verlust.

**Damit hatte der Generator keine Kundschaft mehr** — rund 340 Zeilen, die
niemand mehr aufrief. Sie sind weg, samt `LINE_UNITS`, `LINE_THEME` und der
„Generator"-Markierung in der Linien-Übersicht. Vier Helfer sind geblieben
(`ausbruch`, `zaehler`, `truppFuehrt`, `schwaechstes`), weil die
handgeschriebenen Linien sie weiterbenutzen. Der Kopf der Übersicht zeigt statt
des toten Etiketts jetzt die Schlüsselwörter der Einheit — die Information, die
man dort tatsächlich sucht.

**Vorher aber das Schild-Grundrauschen.** `schild` stand bei 37 von 38
Einheiten, weil ich jeder Einheit ein „Beginnt mit einem Schild"-Passiv gegeben
und jedes markiert hatte. Genau der Fehler, den ich in Phase 23 bei `heilung`
diagnostiziert hatte, nur flächendeckend. Das Schlüsselwort steht jetzt nur noch
dort, wo eine Einheit wirklich darauf baut — mehrere Passive, Schilde für den
Trupp, ein Schildfaktor. 37 → 12 Träger, und die Build-Tabelle sagt an dieser
Stelle wieder etwas aus. Das Selbstschild wirkt unverändert, es zählt nur nicht
mehr als Quelle.

Zwei Testhelfer waren dabei stillschweigend kaputt: `mit()` baute Passiv-IDs aus
dem Einheitennamen zusammen (`gruftwaechter_mec1`), was bei kurzen Präfixen
(`gruft_`) ins Leere lief — der Test prüfte dann eine Einheit ganz ohne
Passive. Und die Deckungs-Prüfung verglich „vorderste Einheit" mit „heißt
Rigurd", was nur hielt, solange Rigurd lebte. Beide lesen jetzt den echten
Zustand.

`dev/balance.js 600`: 50 % frisch. Offen: der Konter-Eimer meldet 82 %, aber bei
n=28 und der größten Lauftiefe aller Eimer (15,0 von 16) — zwei Runden Trimmen
haben ihn um null Punkte bewegt. Das riecht nach Auswahl, nicht nach Stärke;
vor dem nächsten Eingriff gehört das gezielt nachgemessen, so wie bei Frost.

### Phase 32 (2026-07-29): Shions zwei Schwellen

`Verdorbener Teufel` verlangte beides auf einmal — 10 Chaos auf dem Ziel UND
10 Antichaos auf Shion. Das ist jetzt in zwei Passive geteilt, an
verschiedenen Enden desselben Rades:

- **Ordnungsteufel** zählt, was Shion **selbst** trägt: ab 10 Antichaos.
  Signatur wird zur `Klinge der Ordnung`, die den ganzen Trupp mit Antichaos
  versorgt.
- **Verdorbener Teufel** zählt, was auf dem **Feld** liegt: ab 20 Chaos über
  alle Gegner zusammen. Signatur bleibt die `Chaosklinge des Verdorbenen`.

Beide können in einem Kampf fallen — ein voller Chaos/Antichaos-Bau bekommt
beide, und die Chaosklinge setzt sich als die stärkere Form durch.

**Der Bonus hängt jetzt an der Zahl der Stapel, nicht mehr am bloßen Erreichen
der Schwelle.** Ordnung gibt 3 % je Antichaos-Stapel, Verderbnis 2 % je
Chaos-Stapel — auf Angriff voll, auf Tempo halb, auf Leben zu 60 %, gedeckelt
bei +90 %. Wer nur knapp über die Schwelle kommt, bekommt wenig; wer den Bau
wirklich fährt, viel. Gemessen: Ordnung mit dem Realitätswarp +36 %, Verderbnis
mit Chaosmeisterschaft und Gesetzlosigkeit +52 %.

`verwandle()` ist die eine Stelle, an der eine Verwandlung passiert — sonst
wären die beiden über die Zeit auseinandergelaufen. Der Kampflog nennt die
Stapel und den Bonus mit (`✦ Shion wird zum Ordnungsteufel (12 Stapel → +36 %)`),
weil ein variabler Bonus unsichtbar wäre, wenn er nur in der Rechnung stünde.

`dev/balance.js 600`: 50 % frisch.

### Phase 33 (2026-07-29): Zweite Bibliotheksschicht

Die 34 geteilten Passiven waren fast alle „+X % gegen Y". Für eine Bibliothek
ist das im Ansatz richtig — sie muss auf JEDER Einheit funktionieren, darf also
kein Thema voraussetzen. Aber themenfrei heißt nicht ideenfrei. 24 neue lesen
stattdessen die **Lage**: wo die Einheit steht, wie viele Gegner noch stehen,
wie oft sie getroffen wurde, wie viel Leben ihr fehlt. Das funktioniert überall
und ist trotzdem eine Entscheidung.

- **Angriff:** `Vorhut` (+28 % ganz vorn) und `Hinterhalt` (+32 % dahinter) sind
  ein Paar, das die Aufstellung zur Wahl macht. `Duellant` (+45 % gegen einen
  einzelnen Gegner) ist die erste Passive, die ausdrücklich für Bosse gebaut
  ist. Dazu `Anlauf`, `Zweitschlag`, `Grenzgang` (+55 % Angriff, ein Drittel
  weniger Leben).
- **Mechanik:** `Markierer` gibt jeder Einheit eine Verwundbar-Quelle — die
  Marke gilt für den ganzen Trupp. `Panzerknacker` ignoriert Rüstung gegen
  beschildete Ziele, `Zündschnur` zahlt für jeden Zustand, egal welchen.
  `Brennglas` vergrößert alle eigenen Stapel um 50 % und kostet ein Drittel
  Angriff.
- **Unterstützung:** `Schlachtplan` (6 % je Truppmitglied) belohnt eine volle
  Reihe, `Letztes Aufgebot` die letzte Stehende, `Wachablösung` beschildet den
  Nachrücker, wenn vorn jemand fällt.
- **Defensive:** `Standfest` (weniger Schaden je fehlendem Leben),
  `Todesverachtung`, `Trotz`, `Rückendeckung`, `Zähe Haut`, `Festgewachsen`.

Sechs davon tragen einen **Preis**. Damit ist die Bibliothek nicht mehr nur die
brave Alternative neben einem Linien-Keystone, sondern kann selbst eine
Ansage sein.

Bibliothek: 34 → 58, gleichmäßig verteilt (15 Angriff, 15 Mechanik,
13 Unterstützung, 15 Defensive). Damit ist TODO-Punkt 1 erfüllt — nicht durch
Umbau der 34 Aktiven, sondern durch neue Passive; die Aktiven bleiben das
Gegner-Repertoire, das sie ohnehin geworden sind.

**Ein Irrtum beim Bauen:** `pos` ist 0-basiert, vorn ist 0. `Vorhut` und
`Hinterhalt` waren dadurch um eins verschoben — Vorhut feuerte auf Platz 2,
Hinterhalt gar nicht. Gemessen statt angenommen, und fünf Tests halten die neue
Schicht jetzt fest. (Die Deckung im Kampf nutzt dieselbe 0-Basis mit `pos >= 2`;
das Glossar sagt „ab Platz 3" und stimmt damit überein.)

`dev/balance.js 600`: 51 % frisch, kein Build-Ausreißer — auch Konter nicht
mehr, der sich zuletzt hartnäckig gehalten hatte.

### Phase 34 (2026-07-29): Neun stumme Einheiten

Die Insektoiden sollten eine Identität bekommen — sie waren zu dritt zwar
mechanisch verschieden, aber die ART hatte nichts Eigenes. Jetzt haben alle
drei eine **Metamorphose**: eine Schwelle mitten im Kampf, hinter der eine
stärkere Form und eine andere Signatur stehen. Zegion häutet sich nach sechs
Treffern zur `Perfekten Form`, Apito wächst bei 25 Gift auf dem Feld zur
`Ausgewachsenen Königin` aus, die Käfergarde klappt bei 30 % verlorenem Leben
den Panzer auf. Keine andere Art kann das, und es ist genau das, was Insekten
tun. `verwandle()` ist dieselbe Stelle wie bei Shion und Ranga.

**Beim Prüfen fiel dann etwas viel Größeres auf.** Die Metamorphosen feuerten
nicht — und der Grund war nicht die Schwelle:

`onHit` feuert nur im Angriffsweg (`angriff()`). Eine Signatur, die weder
`c.attack` benutzt noch eine Lagebedingung trägt, ersetzt jeden Zug den
Normalangriff — dann feuert `onHit` **nie**, und jede Passive der Angriffslinie
dieser Einheit ist tot. Das betraf **neun Einheiten** mit 3–5 toten Passiven
je Stück: Rigurd, Gobwa, Shuna, Kurobe, Echsenfürst, Quellenpriesterin,
Gruftwächter, Seelenhexe und Zegion. Der Spieler konnte sie wählen, und sie
taten nichts.

Zwei verschiedene Ursachen, zwei Reparaturen:

- **Zegion** benutzte `c.deal` statt `c.attack`. Behoben.
- **Apito** war der subtilste Fall: ihre Signatur wechselte auf `deal`, *sobald
  das Ziel sechs Gift trug* — ihr eigenes Gift schaltete also ihre Angriffslinie
  ab, nach wenigen Runden. Jetzt `attack(..., { pure: gift >= 6 })`, was auch dem
  Text entspricht: durch Schilde, nicht durch Rüstung.
- Die anderen **acht** haben Unterstützer-Signaturen, die zu Recht nicht
  angreifen — ihnen fehlte die **Lagebedingung**. Genau der Mechanismus, den das
  Glossar beschreibt („trägt sie eine Lagebedingung, schlägt die Einheit
  stattdessen normal zu"). Sie haben jetzt `verwundet`, `schildeDuenn` oder
  `nochNichtGerufen` — Heilen ohne Verwundete, Schilde auf volle Schilde und ein
  einmaliger Verstärkerruf waren ohnehin verschwendet.

Ein Test geht jetzt quer über alle Einheiten: wer `onHit`-Passive hat, muss auch
zum Angriff kommen. Das ist dieselbe Klasse wie der Wächter gegen tote Felder —
ein Fehler, bei dem nichts fehlschlägt, sondern nur nichts passiert.

**Und ein Test, der aus dem falschen Grund grün war:** die Giftzahn-Prüfung
verglich die Schadens*summe* über einen Kampf. Wer härter zuschlägt, beendet den
Kampf früher und kommt auf weniger Treffer — die Summe bleibt gleich. Sie misst
jetzt den Schaden **je Treffer**.

Die Reparatur hob die Siegquote von 51 auf 66 %: acht Einheiten greifen jetzt
an, wenn ihre Unterstützung nicht gebraucht wird. `GRUNDHAERTE` 1.08 → 1.28,
Endstand **49 % frisch**.

### Phase 35 (2026-07-29): Orks und Bestienkrieger

Zwei neue Arten, fünf Einheiten, Roster 35 → 40. `ART_NAME` kannte `ork` und
`bestie` längst — sie standen nur nicht in `ARTEN`.

**Orks sind ein Gegensatzpaar.** Geld, der Orkkönig, hat sein eigenes Volk
gefressen und richtet den Hunger als König nach innen: er **zieht Schaden seiner
Reihe auf sich**, und zwar unabhängig von der Aufstellung. Die Deckung des
Kampfsystems hängt an Platz 3 — Geld nimmt jedem etwas ab, egal wo er steht.
Gemessen steigt das Restleben des Gedeckten von 82 auf 86 bzw. 91 %, je nach
Anteil. Der Orkkrieger ist sein genaues Gegenteil und der billigste Frontkämpfer
im Spiel: er nimmt niemandem etwas ab, teilt aus und fällt. Seine Linien zahlen
für Wunden, nicht für Deckung.

`koenigsdeckung()` baut die Umleitung aus vorhandenen Mitteln — der Verbündete
bekommt seinen Anteil zurückgeheilt, der Beschützer bekommt ihn roh. Der Anteil
ist auf 50 % gedeckelt, alles darüber wäre ein Perpetuum mobile.

**Die drei Bestienkrieger** aus Eurazania tragen keine Magie und legen keinen
Zustand an. Ihre Art-Identität ist die **Reaktion auf den Kampfverlauf**, nicht
eine Wirkung: Phobio reagiert auf erlittenen Schaden (und schlägt als einzige
Einheit im Spiel mit stark schwankendem Schaden — 55 bis 175 %), Albis auf
gefallene Gegner (jeder Abschuss macht sie präziser), Suphia auf verwundete
Verbündete. Damit unterscheiden sie sich von der Metamorphose der Insektoiden:
dort eine Schwelle, die verwandelt, hier ein Ereignis, auf das geantwortet wird.

Orkkrieger und Phobio stehen im Startbestand — der eine, weil er der billigste
Frontkämpfer ist, der andere, damit die neue Art gleich im Angebot auftaucht.

**Zwei Tests waren zu eng geschnitten.** Die Kampflog-Prüfung verlangte mehr als
fünf Zeilen — das hängt an der Kampflänge und damit am Startdraft, den zwei neue
Startbestand-Einheiten verschoben haben. Sie prüft jetzt, was das Log leisten
muss, statt eine Zeilenzahl.

`dev/balance.js 600`: 49 % frisch, kein Build-Ausreißer.

### Phase 36 (2026-07-29): Zwei Art-Identitäten, die schon im Glossar standen

Eine Messung über alle 40 Einheiten zeigte sieben, die weder eine eigene
Mechanik noch ein seltenes Schlüsselwort trugen — austauschbar im Wortsinn:
Rigurd, Rigur, Gobwa, Gabiru, Echsenfürst, Drachenknecht, Dämonengarde. Vier
davon Goblins und Echsenmenschen, also genau die zwei Arten, die in Phase 23 als
Erste umgebaut wurden — bevor die interessanteren Werkzeuge überhaupt
existierten.

Die Lösung stand längst im Glossar, sie war nur nie mechanisch wahr:

- **Goblins** — „schwach geboren, wächst über seine Fähigkeiten hinaus". Ihre
  Passiven skalieren jetzt mit dem **Rang**. `rangStufe()` gibt 1 bis 4, und
  keine andere Art liest ihn. Gemessen an Rigurds `Erster in der Schlacht`:
  13 Schaden je Treffer auf C, 37 auf S. Alle fünf Goblins tragen das, nicht
  nur die drei blassen — sonst wäre es wieder nur eine Behauptung.
- **Echsenmenschen** — „hält die Front über lange Kämpfe". Ihre Passiven wachsen
  mit der Zahl der **eigenen Züge**. `langerKampf()` installiert den Zähler
  genau einmal je Einheit, egal wie viele Dauer-Passive sie trägt. Gemessen an
  `Langer Atem`: 34 → 59 Schaden je Treffer. Wer sie schnell abräumt, merkt
  nichts davon — das ist der Punkt.

**Dämonengarde** bekam keine Art-Identität (die Dämonen sind einzeln stark
gezeichnet), sondern eine eigene: sie schlägt zurück, *bevor* der Treffer sitzt.
Jeder Austausch schärft ihre Klinge (+5 Angriff), jeder dritte bis vierte
verschafft ihr einen zusätzlichen Zug, und ihr Keystone kontert nicht den
Angreifer, sondern alle.

**Zwei Befunde am Werkzeug:**

Mein Ersetzungs-Regex hat drei Nachbar-Passive mitgefressen (`rigurd_ang4`,
`fuerst_ang4`, `knecht_ang4`), weil die zu ersetzenden Rümpfe einzeilig waren
und der Ausdruck bis zum nächsten mehrzeiligen Ende weiterlief. Aus dem Commit
zurückgeholt.

Schlimmer: **kein Test hat es gemerkt.** Die Prüfung „jede Fähigkeitsreferenz
existiert" las nur `u.signature` und `u.passives` aus `data.js` — die LINIEN
standen nie darin. Eine Einheit hätte im Aufstieg eine Passive angeboten, die
es nicht gibt. Die Prüfung deckt jetzt auch `AB.linien` ab.

Die Heuristik selbst ist ausdrücklich keine Design-Bewertung: sie zählt
Code-Merkmale. Beim ersten Durchlauf meldete sie 29 Einheiten, weil sie Haken
nicht mitlas, und führte Milim als blass, obwohl „trägt gar keinen Zustand" ihre
erklärte Nische ist. Die sieben oben sind einzeln gegengelesen.

`dev/balance.js 600`: 50 % frisch, kein Build-Ausreißer.

### Phase 37 (2026-07-29): Hakuro ohne Rüstungsbruch, Käfergarde gestrichen

**Hakuro trug an fünf Stellen Rüstungsdurchschlag** — Signatur, `Klingengeist`,
`Auge des Meisters`, `Schule des Schwertes`, `Vermächtnis`. Das ist die Stärke
eines Magiers oder eines Panzerbrechers, nicht die eines alten Schwertmeisters.
Alle fünf sind durch **Technik** ersetzt: der Hieb sitzt ein zweites Mal
(Signatur, `Klingengeist`, `Vermächtnis` für den Trupp), und `Auge des Meisters`
liest den Gegner — je eigenem Schnitt +5 % Schaden, höchstens +70 %. Der Trupp
lernt bei ihm Finten statt Durchschlag.

**Käfergarde ist gestrichen.** Von den Insektoiden bleiben Zegion und Apito; die
Metamorphose als Art-Identität tragen beide weiter. Roster: 40 → 39.
`GRUNDHAERTE` 1.28 → 1.31.

**Derselbe Regex-Fehler wie in Phase 36 — diesmal sofort gefangen.** Beim
Ersetzen von `hak_mec1` (einzeiliger Rumpf) lief der Ausdruck bis zum nächsten
mehrzeiligen Ende und nahm `hak_mec2` mit. Der Test, den ich in Phase 36
erweitert habe, hat es in derselben Minute gemeldet, statt es monatelang liegen
zu lassen. Genau dafür war er da.

Ein Test hing noch an einer festen Zahl (`formen.length === 6`). Verwandlungs-
formen kommen und gehen mit den Einheiten — geprüft wird jetzt, dass keine tot
herumliegt, nicht wie viele es sind.

`dev/balance.js 600`: 50 % frisch, kein Build-Ausreißer.

### Phase 38 (2026-07-29): Milim ohne Defensive, und zweite Träger für alles

**Milim trägt als einzige Einheit im Spiel keine Defensivlinie.** Das ist kein
Versehen, sondern die Ansage: sie verteidigt nicht, sie schlägt. Wer sie nimmt,
bekommt zwölf Passive statt sechzehn und muss ihr Überleben aus Relikten,
Ausrüstung und der Aufstellung bauen. Ein Test hält fest, dass genau eine
Einheit so gebaut ist — damit es auffällt, wenn es jemand versehentlich
nachmacht.

**Ihre zwei Bauweisen stecken in zwei Linien:**

- Die **Angriffslinie** macht sie zur langsamen Brecherin. `Aufgeladener Zorn`
  trifft jeden dritten Schlag VIERFACH und betäubt sie danach einen Zug lang
  (`erstarrung` auf sich selbst — der Zustand existierte längst, nur nie als
  eigener Preis). `Vernichtung` gibt +140 % auf jeden Schlag und kostet jeden
  zweiten Zug.
- Die **Mechaniklinie** macht sie zur schnellen wilden Schlägerin: `Ungezügelt`
  (+35 % Tempo), `Rasend` (wächst je Zug), `Sturmfaust` (zweiter Schlag in jedem
  Zug für 60 %).

Gemessen trennen sich die beiden klar: 309 Schaden bei 27 Treffern und acht
Aussetzern gegen 99 Schaden bei 100 Treffern und keinem. Beides zusammen geht
schlecht — die Selbstbetäubung frisst genau die Züge, für die die andere Linie
zahlt. Das ist der Punkt.

`Drachenbrut` und `Drachentöterin` hängen an `enrage`, also an Bossen: der
Trupp trifft Bosse und Drachen 35 % härter, Milim selbst doppelt. Eine Nische,
die es noch nicht gab — Bosse sind der harte Teil eines Runs.

**Zweite Träger für alles.** Eine Mechanik, die nur an einer Einheit hängt,
existiert für die meisten Runs nicht — derselbe Grund, aus dem Dunkelheit und
Frost in Phase 30 zweite Träger bekamen. Vier Mechaniken standen allein da:

| Mechanik | war allein bei | jetzt zusätzlich |
|---|---|---|
| Chaos anlegen | Shion | **Gobta** — sein Würfel IST Unordnung, „Schicksalswende" passt zu Chaos besser als zu Verderbnis |
| Zustände lesen | Rimuru | **Albis** — die Berechnende liest, was auf dem Ziel liegt |
| Schildbruch | Zegion | **Orkkrieger** — die grobe Axt zerschlägt Deckung |
| Zufallsschaden | Phobio | **Gobta** — sein ganzes Wesen, jetzt als Schwankung statt nur als Chance |
| Selbstbetäubung | Milim | **Orkkrieger** — der Berserker holt so weit aus, dass er offen steht |
| Boss-Bonus | Milim | **Hakuro** — der alte Meister hat schon Größeres gefällt |

Dazu bekam die **Aufstellung** erstmals Bedeutung für Einheiten statt nur für
die Bibliothek: Gobkyu hält aus der Hinterreihe deutlich besser aus als vorn
(ein Bogenschütze gehört nach hinten), und Rigurds `Häuptling` wirkt doppelt so
stark, wenn er selbst an der Spitze steht.

Ein Test geht jetzt quer über alle Mechaniken und verlangt zwei Träger. Kein
Schlüsselwort und keine Mechanik steht mehr allein.

`dev/balance.js 600`: 50 % frisch, kein Build-Ausreißer.

### Phase 39 (2026-07-29): Der Fortschritt ging beim Laden verloren

Gemeldet als „ich kann keine Bedrohungsstufe freischalten" — 23 Runs, 15 Siege,
Stufe 0. Die Freischaltung selbst war in Ordnung; isoliert nachgestellt hebt der
erste Sieg die Stufe zuverlässig. Der Fehler saß im Speichern:

**Der Speicherstand eines Runs enthielt eine Kopie der Meta**, und `deserialize`
baute den Fortschritt daraus neu — also auf dem Stand von *Rundenbeginn*. Jede
folgende Aktion schrieb diese alte Kopie über den echten Fortschritt zurück.
Wer gewann, bekam seine Stufe; wer danach weiterspielte, verlor sie wieder. Die
Meta ist globaler Fortschritt und gehört nicht dem Run: der Speicher hat jetzt
Vorrang, die eingebettete Kopie ist nur noch der Notnagel für Stände ohne
eigenen Meta-Eintrag.

Der Screenshot trug den zweiten Hinweis schon in sich: „40 / 38" bei den
Einheiten und „weitester Weg: 40 Knoten", obwohl ein Lauf 16 Knoten hat. Der
Stand kannte gestrichene Einheiten und eine Fassung mit fünf Akten. `loadMeta`
räumt beides jetzt auf.

Und weil Siege ohne Bedrohungsstufe gar nicht vorkommen können — der erste Sieg
hebt sie immer —, ist genau diese Kombination die Signatur des Bugs. Ein Stand
mit Siegen und Stufe 0 bekommt die Stufen nachgereicht, statt fünfzehn Siege
noch einmal spielen zu müssen. Die Bedingung ist eng genug, dass sie einen
gesunden Stand nie anfasst.

Fünf Tests halten das fest, alle mit einem eigenen localStorage-Ersatz.

**Geld heißt jetzt Gerudo.** Beim Umbenennen ist mir der unquotierte Schlüssel
in der Linien-Tabelle durchgerutscht — die Einheit hatte kurz keine Linien mehr,
und der Wächter-Test aus Phase 34 hat es sofort gemeldet.

`dev/balance.js 600`: 50 % frisch.

### Phase 40 (2026-07-29): Namensweihe als Paket, und Zustände, die reagieren

**Die Namensweihe war zwei Bildschirme für eine Entscheidung.** Sie hob den Rang
einer ausgelosten Einheit und öffnete danach eine Passiv-Wahl — also kaufen,
dann noch einmal klicken. Jetzt zieht der Markt die Passive gleich mit, nennt
sie im Angebot beim Namen und legt sie beim Kauf direkt an. Man sieht vorher
genau, was man bekommt, und entscheidet einmal: dieses Paket zu diesem Preis,
oder nicht. Schneller, und die Entscheidung ist schärfer, weil sie vollständig
ist.

**Idee 4 umgesetzt: Zustände reagieren aufeinander.** Dreizehn Zustände
ignorierten sich fast alle — nur Licht löschte Dunkelheit, nur Donner hatte eine
Schwelle. Ein sauber gestapeltes EINZELNES Schlüsselwort war damit immer besser
als zwei gemischte, und das Spiel bestrafte genau die Hybridbauten, die es
anbietet.

Drei Kombinationen ändern das:

| | Auslöser | Wirkung |
|---|---|---|
| **Verpuffung** | Brand trifft Gift, zusammen ≥ 8 Stapel | beide verbrennen, je Stapel 3 Schaden durch Schilde |
| **Splitter** | Erstarrung auf einen geladenen Gegner | die Donnerladung entlädt sich sofort |
| **Aufgerissen** | Blutung auf ein Ziel mit ≥ 3 Verwundbar | die Blutung fällt 50 % größer aus |

Alle drei lösen beim **Anlegen** des zweiten Zustands aus, stehen also an einer
Stelle in `applyStatus`, und alle drei haben eine **Schwelle**. Das ist der
entscheidende Teil: ein Mono-Bau trifft sie nie, weil ihm der Partner fehlt —
gemessen löst „nur Gift 20" keine einzige aus. Bestehende Bauten sind damit
unangetastet, neue werden möglich.

Ein Sperrflag verhindert, dass eine Kombination die nächste auslöst — dieselbe
Falle wie bei der Donner-Entladung in Phase 19. Der Kampflog nennt sie
(`✸ Verpuffung an Nadler (10 Stapel)`), weil ein seltener Effekt, den niemand
sieht, keiner ist.

`dev/balance.js 600`: 51 % frisch, kein Build-Ausreißer.

### Phase 41 (2026-07-30): Das Hexfeld

Die Aufstellung war eine Liste, und „Deckung" eine Regel über Listenplätze
(„ab Platz 3 gibt ein Drittel an die vorderste Einheit ab"). Das war eine
Abstraktion von einer Lage, die es gar nicht gab. Jetzt gibt es sie.

`js/hex.js` ist reine Geometrie in achsialen Koordinaten (q, r) und kennt das
Spiel nicht: Distanz, Nachbarn, Umkreis, Ring, ein gieriger Schritt und `laufe`,
das auf Reichweite anhält statt in den Gegner hineinzurennen. Kein A* — auf
einem Feld dieser Größe ohne Mauern reicht der gierige Schritt, und wer sich
festläuft, bleibt stehen statt zu zappeln. `dev/hextest.js` prüft das Modul für
sich allein (18 Zusicherungen, inklusive Dreiecksungleichung an 200 Punktepaaren
— der Test, der eine falsche Distanzformel zuverlässig auffliegen lässt).

Im Kampf folgt daraus alles Weitere:

| Rolle | Reichweite |
|---|---|
| Frontlinie, Verstärker | 1 |
| Unterstützer | 2 |
| Fernkampf, Magier | 3 |

Zwei Glieder je Seite (Plätze 1–3 vorn, 4–6 dahinter), einander gegenüber. Wer
niemanden erreicht, **läuft** in seinem Zug bis zu zwei Felder heran, statt
zuzuschlagen — der Nahkämpfer verliert die ersten Züge, der Fernkämpfer schießt
sofort. Die Rolle war bisher nur Zielwahl und hat damit zum ersten Mal
räumliche Bedeutung. Die Deckung hängt jetzt an der Lage: Wer dem Angreifer
näher steht als das Ziel, fängt ein Drittel ab. Gift, Brand und Blutung gehen
weiter hindurch.

Die Fähigkeiten bleiben vorerst global — Schritt 1 des gestuften Wegs aus
TODO.md („Reichweiten für alle 290 Flächenfähigkeiten") ist bewusst NICHT
mitgemacht. Erst soll sich zeigen, ob der Raum sich überhaupt gut anfühlt; sonst
definiert man 290 Formen für ein Spiel, das kein Raumspiel sein will.

Sichtbar wird das über eine SVG-Lagekarte über dem Kampflog (ein Punkt je
Einheit, Größe = Lebensanteil). Ohne Bild wäre die Aufstellung eine unsichtbare
Regel, und man wunderte sich nur, warum der Nahkämpfer erst nichts tut.
Eingreifen kann man nicht — es bleibt eine Autoschlacht.

Das Heranlaufen kostet Züge und damit Schaden, also musste die Grundhärte
nachgeben: **1.31 → 1.21**, gemessen 51 % Siege frisch bei `dev/balance.js 500`.
`dev/sim.js` 401/401, `dev/uitest.js` 107/107.

### Phase 42 (2026-07-30): 2.5D — echtes Brett, flache Figuren

Die SVG-Lagekarte aus Phase 41 zeigte Punkte. Gewünscht war eine 2.5D-Ansicht
mit echten Charaktermodellen — und der ehrliche Befund dazu lautet: gerigte
3D-Modelle für vierzig Charaktere gibt es nicht und lassen sich hier auch nicht
erzeugen. Bilder schon. Also der Weg von Final Fantasy Tactics und Disgaea:
**das Brett ist echt dreidimensional, die Figuren sind flache Bilder darauf,
die sich immer zur Kamera drehen.** Genau diese Mischung heißt 2.5D.

`js/brett3d.js` (three.js r149, lokal unter `js/vendor/`, kein CDN und kein
Bauschritt — siehe ASSETS.md): sechseckige Kacheln aus `CylinderGeometry`,
Hemisphären- plus Richtungslicht, feste Kamera, 46° gekippt, Blick von der
eigenen Seite. Keine Steuerung, keine Auswahl — es bleibt eine Lagekarte, und
was man nicht bedienen kann, soll auch nicht wie ein Spielbrett aussehen.

Zwei Dinge waren nicht offensichtlich und wurden gemessen statt geschätzt:

- **Der Kameraabstand.** Geschätzt („Spanne × 0,95") stand das Brett als
  Briefmarke in einem leeren Rahmen: gemessen füllte es **43 %** der Fläche.
  Ein Streifen von 834 × 260 Pixeln verzeiht das nicht, weil senkrecht und
  waagerecht ganz verschieden viel Platz ist. Jetzt wird der Abstand aus dem
  Sichtfeld ausgerechnet — beide Richtungen einzeln, maßgeblich ist, was zuerst
  anstößt, und senkrecht zählen die Figuren mit, nicht nur das Brett. Gemessen
  **75 % Breite, 78 % Höhe**, nichts abgeschnitten.
- **Der Rand nur in Laufrichtung.** Quer dazu stehen ohnehin alle drei Reihen;
  zwei leere Reihen mehr machen das Brett tiefer, und je tiefer es im flachen
  Streifen ist, desto kleiner werden die Figuren.

Bewegung wird weich nachgezogen, nicht gesetzt — das Log kennt nur „steht jetzt
dort", und ein Sprung über zwei Felder liest sich als Fehler. Steht alles still,
ruht auch die Renderschleife.

**Ohne WebGL passiert nichts**, dann bleibt die SVG-Karte aus Phase 41 stehen.
Das ist keine Höflichkeit gegenüber alten Browsern: `dev/uitest.js` läuft in
jsdom, und die Rückfallebene ist das, was er prüft.

Figuren sind vorerst zur Laufzeit gezeichnete Silhouetten — Umriss und Waffe aus
der Rolle, Farbe aus der Seite, bewusst ohne Gesicht. Echte Bilder tropfen ohne
Codeänderung ein, sobald `assets/einheiten/<id>.png` existiert; Anforderungen
und Herkunftspflicht stehen in **ASSETS.md**, der ersten Assetdatei des
Projekts.

Am Kampf ändert sich nichts: `dev/sim.js` 401/401, `dev/uitest.js` 107/107,
`dev/hextest.js` 18/18, Balance unangetastet.

### Phase 43 (2026-07-30): Ein größeres Feld, und Effekte je Element

**Das Feld größer machen ging gemessen anders aus als gedacht.** Der erste
Versuch war der naheliegende: die Leinwand höher, 260 → 417 Pixel. Ergebnis
gemessen: **49 % Höhenfüllung, 132 Pixel leer unten**, und die Hexe genau so
groß wie vorher. Bei fester Breite fasst die Kamera die Breite — ein höherer
Rahmen fügt nur Himmel hinzu. Kippung, Sichtfeld, Rahmenhöhe verschieben alle
nur Leerraum.

Der Deckel war die **860 Pixel breite Spalte**. Also zwei Änderungen, die
wirklich greifen:

- Das Brett bricht aus der Spalte aus (`width: min(96vw, 1400px)`). Gemessen im
  echten Layout: Leinwand **1400 × 501** statt 834 × 260.
- Die Rahmenhöhe folgt jetzt dem Brett statt umgekehrt: erst der Abstand, der
  die Breite ausfüllt, dann genau die Höhe, die das Brett dabei braucht.
  Gemessen **96 % Breite, 83 % Höhe** gefüllt, 20 gegen 28 Pixel Rand oben und
  unten — vorher 75 / 78 mit schiefer Verteilung. Gezielt wird etwas über die
  Brettebene, weil die Figuren nach oben ragen.

Zusammen sind die Hexe **mehr als doppelt so groß** wie in Phase 42.

**Effekte hängen am Schlüsselwort, nicht am Namen.** Vierzig Signaturen hätten
vierzig Effekte bedeutet; das Schlüsselwort ist aber ohnehin das, worum die
Fähigkeit gebaut ist und was der Spieler beim Bauen auswählt. Wer Brand spielt,
soll Brand sehen — gleich von welcher Einheit. Zwei Bewegungen decken alles ab:
etwas fliegt im Bogen hinüber und schlägt ein, oder etwas steigt an der eigenen
Figur auf. Der Rest ist Farbe, Streuung und Tempo (`FARBE`, `AN_SICH`, `SOFORT`
in `js/brett3d.js`). Donner, Licht, Dunkelheit und Exekution schlagen ohne Flug
ein; Heilung, Schild, Tempo, Schatten und Konter steigen auf.

Dafür trägt das Kampflog zwei Felder mehr: `kw` und `ziel` am `aktiv`-Eintrag.
Die Stelle, die dabei still bricht, ist der Aufbau der Einheit — `keywords`
wurde in `actives` nicht mitkopiert. Genau darauf zielen die drei neuen
Zusicherungen in `dev/sim.js`.

Gemessen im Browser, weil jsdom kein WebGL hat: ein Effekt hebt die Zahl heller
Bildpunkte von 360 auf 714 und ist danach vollständig wieder abgeräumt (zurück
auf 360). Die Renderschleife ruht weiter, sobald nichts mehr läuft.

`dev/sim.js` 404/404, `dev/uitest.js` 107/107, `dev/hextest.js` 18/18. Am Kampf
selbst ändert sich nichts, die Balance ist unangetastet.

### Phase 44 (2026-07-30): Flächen bekommen eine Form

Der offene Punkt aus TODO.md, und die zentrale Zahl des Hex-Umbaus: **129
Fähigkeiten trafen „alle Gegner", 160 fassten den ganzen Trupp.** Solange das
global bleibt, ist der Raum Dekoration — man kann sich hinstellen, wo man will.

TODO.md rechnete mit „rund 290 Fähigkeiten, die eine Formdefinition brauchen".
Die brauchen sie nicht. `c.foes()` und `c.allies()` sind der Trichter, durch den
jede Massenwirkung läuft: **zwei Zeilen in `ctx()`**, und jede der 290 hat eine
Form. Eine Definition je Fähigkeit wären 290 Entscheidungen gewesen, von denen
280 dasselbe gesagt hätten.

Die Form ist ein Umkreis — bei Gegnern um das ZIEL, bei Verbündeten um sich
selbst. Radius 1, und 2 wenn die *Fähigkeit* `flaeche` trägt (nicht die Einheit,
sonst würde ein Flächenträger auch mit Einzelzielen weit fassen; für Passive
ohne Fähigkeit im Rücken gilt die Einheit). Ohne Ziel — Passive zu Kampfbeginn —
ist der Mittelpunkt der nächststehende Gegner.

**Damit wird die Aufstellung erstmals eine Rechnung, die man anstellen kann.**
Gemessen, wen ein Umkreis von 1 aus jedem Platz erreicht:

| von Platz | erreicht |
|---|---|
| 1 | 1, 2, 4, 5 |
| **2** | **1, 2, 3, 5, 6** |
| 3 | 2, 3, 6 |
| 4 | 1, 4, 5 |
| **5** | **1, 2, 4, 5, 6** |
| 6 | 2, 3, 5, 6 |

Wer den Trupp stärkt, gehört in die Mitte. Von Platz 3 erreicht derselbe Buff
drei statt fünf Plätze. Das ist keine Feinheit, das ist ein Drittel Wirkung.

Zwei Tests sichern genau das ab, und zwar die Regel, nicht eine Schwelle:
Apitos Brutnest („vergiftet jeden Gegner") trifft gegen sechs Gegner **3 von 6**
statt sechs, mit `flaeche` **5 von 6**; und derselbe Truppbuff von Souei wirkt
aus der Mitte messbar stärker als vom Rand. Beim Schreiben fielen zwei eigene
Fehler auf, die beide still gewesen wären: `def()` löst die Einheit schon auf,
eine danach gesetzte Passivwahl verpufft — und über vier Runden gezählt vergiftet
Apitos Signatur die Nachzügler einzeln nach, also stehen am Ende doch sechs da.
Gezählt wird deshalb nur `t === 0`.

Balance: der Umbau nimmt beiden Seiten die Massenwirkung, kostet den Spieler aber
netto — gemessen **45 %** Siege. Grundhärte **1.21 → 1.16**, damit wieder
**51 %** bei `node dev/balance.js 500`. Der Heilungsbau bleibt mit 69 % der
stärkste; er steht damit weiter oben auf der Liste, ist aber nicht Gegenstand
dieser Phase.

`dev/sim.js` 407/407, `dev/uitest.js` 107/107.

Gearbeitet im Worktree `/home/viktor/tensura/worktree/phase-44-flaechen`
(Branch `phase-44-flaechen`). Das Schema aus CLAUDE.md nennt
`/tensura/worktree/...` — dort fehlt das Schreibrecht, deshalb unter `$HOME`.

### Phase 45 (2026-07-30): Schild war ein Vorrat, Heilung eine Rate

Gemessener Befund aus Phase 44: **Heilung 69 %, Schild 34 % Siege** — 35 Punkte
zwischen den beiden groessten Buckets.

Erst geprueft, ob das ueberhaupt Balance ist oder das Sammelbegriff-Risiko aus
Abschnitt 5. Die erste Zaehlung war selbst falsch: sie sah nur `u.passives`
(drei je Einheit) und uebersah die 16 Linien-Passiven — 789 Faehigkeiten statt
100. Richtig gezaehlt:

| Schluesselwort | Quellen | Verstaerker | Traeger |
|---|---|---|---|
| heilung | 85 | 17 | 17 von 39 |
| schild | 61 | 20 | 17 von 39 |
| tempo | 46 | 21 | 19 |
| blutung | 9 | 4 | 5 |

Also **kein Angebotsproblem**: die beiden liegen praktisch gleich auf und sind
trotzdem 35 Punkte auseinander. Der Unterschied ist strukturell — **Heilung ist
eine Rate, Schild ein Vorrat.** Ein Vorrat wird einmal verbraucht, eine Rate
jeden Zug neu, und dieselben 15 % Resonanz wirken auf beides voellig
verschieden.

Also bekommt Schild ebenfalls eine Rate: die Schild-Resonanz baut die Barriere
je eigenem Zug um 22 nach, gedeckelt bei 35 % des Maximallebens. Dieselbe
Mechanik wie Regeneration, nur auf den Schild. Gemessen **34 → 46 %**, Abstand
zu Heilung von 35 auf 25 Punkte, Gesamtsiegquote unveraendert bei 52 % — die
Aenderung verteilt um, sie schenkt nichts. Grundhaerte bleibt 1.16.

**Zwei Messungen ergaben nichts, und das ist das eigentliche Ergebnis.**

1. Die Heilungs-Resonanz halbiert (15 % → 8 %): Bucket 70 % → 69 %. Der Regler
   traegt den Ausreisser nicht. Nerf zurueckgenommen, statt ihn stehen zu
   lassen — dieselbe Lehre wie beim Konter-Eimer in TODO.md.
2. `regen` UND `lifesteal` komplett abgeschaltet: die Gesamtquote fiel von 52
   auf 39 %, aber der Abstand Heilung↔Schild blieb bei 24 Punkten. Jeder Bucket
   verlor gleich viel. Heilung traegt seinen Vorsprung also nicht ueber diese
   zwei Mechaniken.

Auch dieser Probeeingriff war zweimal falsch, bevor er etwas sagte: er nullte
`regen` **vor** `onStart`, wo es gesetzt wird — und die Flagge landete im
Blockkommentar von `balance.js`, weshalb zwei Laeufe byte-identische Zahlen
lieferten. Byte-identisch heisst nie „kein Effekt", sondern „nicht ausgefuehrt".

**Was daraus folgt (offen, in TODO.md):** wenn kein Regler und keine Mechanik
den Vorsprung erklaert, messen die Buckets womoeglich nicht das
Schluesselwort, sondern die Truppzusammensetzung — `heilung` heisst faktisch
„hat einen funktionierenden Unterstuetzer", `schild` ist mit 223 von 600 Runs
der Auffangbucket. Bevor hier weiter getrimmt wird, muss die Zuordnung um die
Zusammensetzung bereinigt werden.

`dev/sim.js` 409/409 (zwei neue Zusicherungen: die Resonanz legt die Barriere
wiederholt neu, und sie haelt am Deckel), `dev/uitest.js` 107/107.

Worktree `/home/viktor/tensura/worktree/phase-45-builds`, Branch
`phase-45-builds`.

### Phase 46 (2026-07-30): Der Bot nahm immer Karte 1

Voraussetzung, die Phase 45 selbst notiert hatte: bevor weiter an Zahlen gedreht
wird, muss die Messung stimmen. Sie stimmte nicht.

**Der Befund.** Ein Startangebot ist `{ unit, relic, passive }`, keine Id. Der Bot
in `dev/balance.js` uebergab das ganze Objekt an `passt()`, dort lief
`GD.unit(objekt)` auf `undefined`, die Funktion gab fuer jedes Angebot 0 zurueck
— und `0 > -1` traf nur beim ersten Angebot zu. **Der Bot nahm in jedem Run die
erste Karte.** Die Startwahl war keine Wahl, sondern eine Konstante, und weil
der ganze Run auf dem Startdraft aufbaut, hing daran alles Weitere.

Ein stiller Fehler: nichts stuerzte ab, nichts sah falsch aus, die Zahlen waren
plausibel. Genau diese Art macht eine Messung wertlos, ohne dass es auffaellt.

**Was er gekostet hat.** Mit repariertem Draft springt die Siegquote von 52 auf
**64 %** — der Bot war zwoelf Punkte schlechter als das Spiel annahm. Damit ist
jede Grundhaerte, die je gegen ihn getunt wurde, gegen einen Bot getunt worden,
der immer Karte 1 nahm. Neu gesetzt: **1.16 → 1.35**, gemessen 50 % bei 500 und
52 % bei 600 Runs (die Streuung liegt bei rund zwei Punkten, das gehoert dazu).

**Was er NICHT erklaert.** Die 20 nie gespielten Einheiten aus Phase 45 haben
zwei ganz andere Ursachen, und keine davon ist der Draft:

- **6 waren nur nicht freigeschaltet.** Der Standardlauf ist ein frischer
  Spieler, dem gehoeren die meisten Einheiten noch nicht. Kein Fehler, sondern
  die Bedeutung von „frischer Spieler" — meine Notiz in TODO.md war falsch und
  ist korrigiert.
- **14 werden auch bei `--voll` nie gekauft**, und zwar genau die mit Kosten 4-5.
  Der Bot bewertet Marktposten nach Wert je Magicule, und `passt()` enthaelt die
  Kosten schon einmal — teure Einheiten werden doppelt bestraft. Ob die
  Heuristik zu geizig oder die Preiskurve zu steil ist, sind zwei verschiedene
  Eingriffe; in TODO.md getrennt notiert.

**Und was jetzt belastbar ist.** Der Heilungs-Ausreisser ueberlebt die Reparatur:
70 % gegen 40-46 % fuer alles andere, bei n=237 von 600 sogar der groesste Eimer.
Die Vermutung aus Phase 45 — die Eimer messten die Truppzusammensetzung statt das
Schluesselwort — ist damit teilweise widerlegt. Ein Bot, der wirklich nach Build
draftet, landet bei denselben 25-30 Punkten Abstand. Der naechste Verdacht steht
in TODO.md: die Wiederbelebung, weil sie einen Tod rueckgaengig macht und keine
andere Linie etwas Vergleichbares hat.

Nebenbefund, ebenfalls in TODO.md: **Rang A gewinnt in 103 Runs kein einziges
Mal**, Rang S in 483 zu 64 %. Eine so harte Null ist keine Kurve, sondern eine
Schwelle.

Am Spiel selbst aendert diese Phase nur die Grundhaerte. `dev/sim.js` 409/409,
`dev/uitest.js` 107/107.

Worktree `/home/viktor/tensura/worktree/phase-46-messung`, Branch
`phase-46-messung`.

### Phase 47 (2026-07-30): Drei Verdachte gepruefte, drei fast leer

Fortsetzung des Heilungs-Ausreissers — und zwei Messtellen, die vorher nichts
sagten.

**Der Rang war eine Tautologie.** „Rang A gewinnt in 103 Runs kein einziges Mal"
klang nach einer Schwelle. `dev/balance.js` liest den Rang aber am RUN-ENDE: ein
Run, der in Akt 1 stirbt, hatte nie Geld fuer S. Die Tabelle misst also die
Laufzeit, nicht den Rang. Die alte Tabelle ist jetzt so beschriftet („Folge der
Laufzeit, nicht Ursache"), und daneben steht eine **feste Messstelle: der Rang
bei Akt-2-Beginn.**

Deren Ergebnis ist selbst ein Befund: **dort gibt es nur eine Zeile, Rang S,
n=296.** Jeder Run, der Akt 2 erreicht, hat bereits eine S-Einheit; die anderen
204 kommen nie so weit. Der Rang ist damit keine Entscheidung, sondern ein
Meilenstein — man erreicht ihn und spielt weiter (84 % Siege von dort), oder der
Run ist vorher zu Ende. Ob das gewollt ist, steht in TODO.md.

**Die Wiederbelebung erklaert 4 von 25 Punkten.** Erst je Run gezaehlt: 4,35 in
gewonnenen gegen 0,94 in verlorenen Runs — Faktor 4,6, sah nach der Antwort aus.
Je KNOTEN normalisiert bleiben 0,272 gegen 0,118, Faktor 2,3: die Haelfte des
Effekts war Laufzeit. `dev/balance.js` gibt jetzt beides aus, mit dem Hinweis
daneben.

Dann kausal geprueft statt korreliert. Es gibt 22 Wiederbelebungen in
`js/abilities.js` und keinen gemeinsamen Helfer — abschalten liess sich das
trotzdem an EINER Stelle, weil alle `onDeath`-Haken sind: wer nach dem Hook
wieder lebt, wird zurueckgelegt. Vorher verifiziert, dass die Probe wirklich
beisst (Tod bei t=167 statt t=234, sechs statt neun eingesteckte Treffer) —
nach drei Fehlmessungen in dieser Sitzung nicht mehr ohne Gegenprobe. Ergebnis:
Heilung **70 → 66 %**, Gesamtquote 50 → 49 %.

**Damit sind drei Verdachte durch und keiner traegt den Ausreisser:**

| geprueft | Wirkung auf den Heilungs-Eimer |
|---|---|
| Resonanz halbiert (Phase 45) | 1 Punkt |
| `regen` + `lifesteal` ganz aus (Phase 45) | 0 Punkte relativ (alle Eimer fielen gleich) |
| alle 22 Wiederbelebungen aus (Phase 47) | 4 Punkte |

Der Vorsprung ist also nicht ein Hebel, sondern verteilt. Und Breite allein
erklaert ihn auch nicht: Schild hat mit 61 Quellen und ebenfalls 17 Traegern
fast dieselbe Breite und sitzt 25 Punkte darunter. Was noch nicht geprueft ist:
die DIREKTEN Heilungen — `heal()` und besonders die Regel, dass ein
Unterstuetzer ohne bereite Faehigkeit den am schwersten Verletzten heilt. Die
haengt an der ROLLE, nicht am Schluesselwort, und ist in keiner der drei Proben
mit abgeschaltet worden. Sie steht als naechster Verdacht in TODO.md.

Diese Phase aendert am Spiel nichts — nur das Messwerkzeug. `dev/sim.js`
409/409, `dev/uitest.js` 107/107.

Worktree `/home/viktor/tensura/worktree/phase-47-revive`, Branch
`phase-47-revive`.

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
