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

### Phase 48 (2026-07-30): Die Eimer zeigten die falsche Rangfolge

Der vierte und letzte naheliegende Verdacht hinter dem Heilungs-Vorsprung — und
dann eine Messstelle, die die ganze Rangfolge umdreht.

**Die Unterstuetzer-Heilung feuert 33.735 Mal und entscheidet nichts.** Der Zweig
in `js/combat.js` („Unterstuetzer heilen, wenn gerade keine Faehigkeit bereit
ist") sah nach totem Code aus, weil Faehigkeiten seit Phase 10 nicht mehr
abkuehlen. Gemessen ist das Gegenteil richtig: von 41.432 Unterstuetzer-Zuegen
in 150 Runs nehmen **81 % genau diesen Zweig** — die Signaturen der
Unterstuetzer haben `wenn`-Bedingungen, die meistens nicht greifen. Komplett
abgeschaltet (Unterstuetzer schlagen dann zu, statt zu heilen): Heilung bleibt
bei **70 %**, Gesamtquote 52 %. **Null Wirkung.**

Ein Rollenzweig, der zehntausende Male feuert und an keinem Ergebnis etwas
aendert, ist ein eigener Befund und steht in TODO.md.

**Damit sind vier Verdachte durch:**

| geprueft | Wirkung auf den Heilungs-Eimer |
|---|---|
| Resonanz halbiert | 1 Punkt |
| `regen` + `lifesteal` ganz aus | 0 relativ |
| alle 22 Wiederbelebungen aus | 4 Punkte |
| Unterstuetzer-Auto-Heilung ganz aus (81 % der Zuege) | 0 Punkte |

**Also die Frage anders gestellt:** liegt der Vorsprung am Schluesselwort oder an
den EINHEITEN, die es tragen? `dev/balance.js` hat dafuer jetzt eine feste
Tabelle — Siegquote der Einheiten mit einem Schluesselwort gegen die ohne,
gewichtet je Einheitenauftritt, nicht je Run. Bei 500 Runs:

| stark | | schwach | |
|---|---|---|---|
| donner | +20 | brand | -16 |
| licht | +17 | frost | -12 |
| chaos | +13 | konter | -7 |
| gift | +13 | blutung | -3 |
| schatten | +12 | exekution | -2 |
| flaeche | +11 | tempo / schild | -1 |
| **heilung** | **+8** | | |

**Das ist fast die umgekehrte Rangfolge der Build-Eimer.** Heilung liegt auf
Einheitenebene nur 8 Punkte vorn, nicht 25. Der Eimer-Vorsprung kommt also nicht
daher, dass Heilungs-Einheiten stark sind — er kommt aus der FESTLEGUNG: ein
Eimer erfordert zwei Quellen und einen Verstaerker, und wer sich auf Heilung
festlegt, gewinnt zu 70 %, wer sich auf Schild festlegt, zu 45 %.

Und die eigentlich starken Schluesselwoerter sind gar nicht baubar: Donner hat
2 Traeger, Licht 3, Frost 2. Ihr Eimer bildet sich nie, deshalb war nie zu
sehen, dass ihre Traeger 17-20 Punkte ueber dem Rest liegen. Umgekehrt waren
**Brand (-16) und Frost (-12) als die schwaechsten Schluesselwoerter des Spiels
unsichtbar** — Brand hat 54 Quellen auf 4 Traegern, ist also tief gebaut und
verliert trotzdem. Tiefe ist es damit auch nicht.

Zwei getrennte Aufgaben, beide in TODO.md: die starken Schluesselwoerter baubar
machen (mehr Traeger) und die schwachen (Brand, Frost, Konter) reparieren.

Am Spiel aendert diese Phase nichts. `dev/sim.js` 409/409, `dev/uitest.js`
107/107.

Worktree `/home/viktor/tensura/worktree/phase-48-heilung`, Branch
`phase-48-heilung`.

### Phase 49 (2026-07-30): Die Schluesselwort-Rangfolge war eine Reichweiten-Rangfolge

Brand sollte repariert werden — Letzter mit -16 aus Phase 48. Der Blick auf die
Traeger beantwortete die Frage sofort anders als gedacht:

| Schluesselwort | Traeger | Rollen |
|---|---|---|
| brand (-16) | 4 | 3 × Verstaerker (Reichweite 1), 1 × Front |
| gift (+13) | 4 | 4 × Fernkampf (Reichweite 3) |
| donner (+20) | 2 | 2 × Fernkampf |
| frost (-12) | 2 | Magier + Verstaerker |

Ueber alle 15 Schluesselwoerter gerechnet: **Korrelation zwischen dem gemessenen
Abstand und der mittleren Reichweite der Traeger r = 0,67.** Die Tabelle aus
Phase 48 misst also zu einem guten Teil nicht das Schluesselwort, sondern die
Rolle seiner Traeger.

**Die fehlende Zahl war die Siegquote je Rolle.** `dev/balance.js` hat sie jetzt,
und sie war eindeutig:

| Rolle | vorher | nachher |
|---|---|---|
| fernkampf (rw 3) | 63 % | 61 % |
| magier (rw 3) | 63 % | 60 % |
| unterstuetzer (rw 2) | 64 % | 60 % |
| front (rw 1) | 51 % | 54 % |
| **verstaerker** | **39 %** | **46 %** |

Phase 41 hatte jedem zwei Schritte gegeben. Bei fuenf Feldern Abstand schiesst
ein Fernkaempfer damit nach einem Zug Anmarsch, ein Nahkaempfer braucht zwei —
gemessen wurde das nie je Rolle, und es kostete 24 Punkte Spreizung. Zwei
Eingriffe:

1. **Der Sturmangriff:** `SCHRITTE` haengt jetzt an der Rolle (Front 4,
   Verstaerker und Unterstuetzer 3, Fernkampf und Magier 2). Wer kurz reicht,
   laeuft weiter — damit ist jede Rolle nach EINEM Zug im Gefecht.
2. **Verstaerker auf Reichweite 2.** Mit Reichweite 1 stand er vorn und fing
   Deckung ab, ohne Panzerung zu haben. Ein Verstaerker gehoert hinter die Front.

Ergebnis: Spreizung **24 → 15 Punkte**, Gesamtsiegquote 50 → 52 % (die Streuung
liegt bei zwei Punkten, Grundhaerte bleibt 1.35). Und die
Schluesselwort-Rangfolge sackt zusammen, wie es die Diagnose vorhersagt:

| | Phase 48 | jetzt |
|---|---|---|
| heilung | +8 | **+3** |
| gift | +13 | +4 |
| konter | -7 | -1 |
| brand | -16 | -11 |
| frost | -12 | -8 |

Der Heilungs-Vorsprung auf Einheitenebene, dem vier Phasen nachgejagt sind, war
also zum groessten Teil ein Rollenartefakt. Der BUILD-Eimer bleibt allerdings bei
69 % — die Festlegung zahlt sich weiter aus, und das ist eine andere Frage.

**Zwei saubere Restbefunde, beide in TODO.md:**

- **Verstaerker hat jetzt dieselbe Reichweite und Schrittzahl wie Unterstuetzer
  (rw 2, 3 Schritte) und liegt 14 Punkte darunter** (46 gegen 60 %). Damit ist
  ausgeschlossen, dass es an der Lage haengt — es sind die Kits.
- **Donner +20 und Verderbnis -15** bleiben als echte Inhaltsausreisser stehen,
  jetzt ohne Reichweiten-Beimischung.

`dev/sim.js` 411/411 — zwei neue Zusicherungen: jede Rolle braucht hoechstens
EINEN Zug Anmarsch. Ohne die faellt eine gesenkte Schrittzahl nicht auf, sie
macht nur wieder eine Rolle schlechter. `dev/uitest.js` 107/107.

Nebenbei: `js/combat.js` exportiert `REICHWEITE` und `SCHRITTE_JE_ROLLE`, damit
die Werkzeuge sie nicht abschreiben — die Kopie in `dev/balance.js` zeigte im
ersten Anlauf noch die alte Verstaerker-Reichweite an.

Worktree `/home/viktor/tensura/worktree/phase-49-brand`, Branch
`phase-49-brand`.

### Phase 50 (2026-07-30): Vollbild-Desktop, kein Handy

Auf Wunsch: das Menue nimmt den Bildschirm, und die Handy-Vorkehrungen kommen
raus. Reine Layoutphase, am Spiel aendert sich nichts.

**Das Menue.** Es ist ein Nachschlagewerk — Glossar, Entwicklungslinien,
Fortschritt, Chronik — und stand in einem 520px-Kasten mit 85vh Hoehe. Davon sah
man immer einen Ausschnitt und scrollte den Rest. Jetzt `100vw × 100vh`, ohne
Rahmen und ohne Ecken, weil es keine Kante mehr gibt, wovon es sich abgrenzen
muesste. Die Id gewinnt ueber die `dialog`-Regeln per Spezifitaet, die
`max-height: 85vh` weiter unten musste also nicht angefasst werden. Kein
Javascript geaendert: es bleibt ein `<dialog>` mit `showModal()`.

**Vollbild heisst nicht einfach breiter.** Ein naives Vollbild waere hier
SCHLECHTER als der Kasten gewesen: eine 2000px lange Zeile Glossartext liest
niemand. Also `columns: 26rem auto` — gemessen vier Spalten a 488px auf einem
2138px-Fenster, Zeilenlaenge damit wieder lesbar. Dieselbe Logik fuer die
Linien-Uebersicht. Die inneren Scroll-Deckel (`max-height` auf Chronik und
Linien) sind weg; sie waren nur da, um in den kleinen Kasten zu passen.

**Die Handy-Vorkehrungen.** Alle vier `@media`-Abfragen sind weg — sie schalteten
Raster ab 620 bzw. 700px auf zwei Spalten. Statt einer Schwelle jetzt
`repeat(auto-fill, minmax(...))`: das Raster nimmt so viele Spalten, wie
hineinpassen. Der `88vw`-Rueckfall der Tooltips ebenfalls weg. Und der
860px-Deckel auf `main` ist gefallen, womit der Ausbruchstrick aus Phase 43
(`margin-left: 50%; transform: translateX(-50%)`) hinfaellig wurde und
geloescht ist — vier Zeilen weniger fuer dasselbe Ergebnis.

**Eine Folge musste nachgezogen werden.** Mit voller Breite ist die Leinwand des
Schlachtfelds 2093px breit, und der Hoehendeckel von 560 aus Phase 43 zwang die
Kamera zurueck: gemessen nur noch 81 % Breitenfuellung statt 96. Deckel auf 760,
damit geht das Brett auch dort vollstaendig auf — gemessen **2093 × 698, 96 %
Breite, 83 % Hoehe, 35 % der Fensterhoehe.**

Bewusst NICHT angefasst: `<meta name="viewport">` in `index.html` (auf dem
Desktop wirkungslos) und die Pointer-Events der Verkaufsflaeche — die sind die
normale Maus-API, kein Handy-Zugestaendnis.

`dev/uitest.js` 107/107, `dev/sim.js` 411/411.

Worktree `/home/viktor/tensura/worktree/phase-50-desktop`, Branch
`phase-50-desktop`.

### Phase 51 (2026-07-30): Einheiten kommen fertig aus dem Markt

Auf Wunsch: Aufwerten und Namensweihe sind weg. Stattdessen stehen **vier
Einheiten** im Markt, jede auf einem gewuerfelten Rang und mit den Passiven, die
zu diesem Rang gehoeren — **C 1, B 2, A 3, S 4**, dieselbe Zahl, die
`PASSIV_SLOTS` ohnehin freischaltet. S ist das Seltene (Gewichte 40/22/10/3), und
die Inhaltsstufe verschiebt sie nach oben, damit Fortschritt sich im Angebot
zeigt und nicht nur im Geldbeutel. Keystones mit Nachteil bleiben aus dem Wurf
draussen — aufgedraengte Nachteile waren schon beim Startzustand bewusst
ausgeschlossen.

Preis: Anwerbung plus genau die Aufstiege, die man sonst bezahlt haette. Kein
Rabatt, kein Zuschlag.

**Zwei Loecher, die die Messung aufgedeckt hat.** Die erste Fassung war fertig
und funktionierte — und lag bei **2 % Siege**:

1. **Bei vollem Trupp war der Rang fuer immer eingefroren.** `addUnit` scheitert
   an einer belegten Art, also gab es nach dem sechsten Kauf keinen Weg mehr nach
   oben. Gemessen 3,3 Rangstufen je Run statt 14,4. Loesung: eine bessere Fassung
   derselben Art ERSETZT die alte — der Markt ist der Aufwertungsweg. Nur nach
   oben, denn eine schwaechere Fassung ist kein Aufstieg, sondern ein Versehen.
2. **Der Aufwertungsposten erschien nie**, weil `unitPool` belegte Arten
   ausfilterte — richtig, solange eine Art nur einmal in den Trupp konnte. Jetzt
   darf eine belegte Art angeboten werden, wenn der Rang darueber liegt. Damit
   2 % → 15 %.

Dann eine dritte Messung: 15 % waren noch zu wenig, weil eine Aufwertung das
**Zweieinhalbfache** eines alten Rangschritts kostete (voller Paketpreis minus
einem Viertel Rueckgabe). Eine Aufwertung ist aber kein Verkauf, sondern derselbe
Weg ein Stueck weiter — also wird der **ganze** Einsatz angerechnet. Netto zahlt
man die Differenz, genau das, was „aufwerten" hiess. Damit 15 % → 30 %.

Den Rest macht die Grundhaerte: **1.35 → 1.15**, gemessen **52 %** bei 600 Runs.
Die Rangstufen liegen wieder bei **14,4 je Run** — genau dem Wert von vorher, die
Wirtschaft ist also aequivalent, nur die Entscheidung ist eine andere.

**Was der Umbau kostet, und das gehoert dazu:** die Passiven sind jetzt
gewuerfelt statt gewaehlt, und das trifft die Rollen ungleich. Die Spreizung, die
Phase 49 von 24 auf 15 Punkte gebracht hatte, ist wieder auf **26** gewachsen —
Unterstuetzer 66 %, Verstaerker 40 %. Verstaerker verstaerken, also haengen sie
mehr als andere an bestimmten Kombinationen, und Zufall trifft sie haerter. Das
bestaetigt den Befund aus Phase 49 („es sind die Kits") und steht als offener
Punkt in TODO.md.

Ebenfalls notiert: **8 unbezahlbare Angebote je Run** (vorher 1,2). Vier Posten
mit Rangwurf heisst, dass regelmaessig ein S-Paket dasteht, das man sich nicht
leisten kann. Als sichtbares Ziel ist das brauchbar, als toter Posten nicht —
messen, ob es sich anders anfuehlt als es sich liest.

Entfernt: `PREIS_RANG_FAKTOR`, der `rang`-Postentyp, sein Chip in der
Oberflaeche, der Aufwerten-Knopf samt `aufstieg`-Aktion, der `festePassive`-Zweig
in `rankUp` und der Aufstiegs-Zweig im Balance-Bot. Damit ist auch ein alter
TODO-Punkt erledigt: der Bot zog stur die vorderste Einheit hoch und hat deshalb
nie gemessen, ob „vier auf B" oder „eine auf S" besser ist — diese Frage stellt
jetzt der Markt selbst, an vier Posten.

`dev/sim.js` 419/419 (sechs neue Zusicherungen: Rang↔Passivzahl, Preisformel,
Kauf, Aufwertung, und dass der Rangwurf S wirklich selten macht),
`dev/uitest.js` 104/104 (der alte Aufstiegs-Abschnitt ist ein Marktabschnitt
geworden).

Worktree `/home/viktor/tensura/worktree/phase-51-rangkauf`, Branch
`phase-51-rangkauf`.

### Phase 52 (2026-07-30): Der Rang ist ein Fenster, keine Verteilung

Rueckmeldung zu Phase 51: der Rangwurf soll fortschrittsbasiert sein — anfangs
70 % C und 30 % B, kurz danach ist C nutzlos und es geht um B/A, im Endspiel um
A/S.

Phase 51 hatte eine gewichtete Verteilung ueber alle vier Raenge (40/22/10/3,
mal einem Faktor je Inhaltsstufe). Deren Fehler war, dass **C nie verschwand**:
im Endspiel stand weiter ein C-Posten im Markt, den niemand mehr anschauen wollte
— einer von vier Plaetzen, dauerhaft tot.

Der Rang ist aber eine ACHSE, nicht ein Lostopf. Also ein **Fenster aus zwei
Nachbarraengen**, das mit dem Fortschritt wandert, und der gebrochene Anteil der
Position IST die Wahrscheinlichkeit fuer den oberen der beiden. Das braucht keine
Tabelle, nur eine Position von 0,3 bis 2,85 — und liefert gemessen genau die
gewuenschten Zahlen:

| Inhaltsstufe | Position | C | B | A | S |
|---|---|---|---|---|---|
| 1 | 0,30 | **70 %** | **30 %** | — | — |
| 2 | 0,90 | 10 % | 90 % | — | — |
| 3 | 1,50 | — | **50 %** | **50 %** | — |
| 4 | 2,10 | — | — | 90 % | 10 % |
| 5 | 2,70 | — | — | **30 %** | **70 %** |
| 6 (Elite/Boss im Endspiel) | 2,85 | — | — | 15 % | 85 % |

Die Grenzen sind bewusst keine glatten 0 und 3: an beiden Enden soll gemischt
bleiben, sonst ist der Markt eine Stufe lang eine Konstante.

Nebenwirkung, und eine gute: die **unbezahlbaren Angebote fallen von 8,0 auf 5,7
je Run.** Das Fenster nimmt beide Enden weg — frueh das S-Paket, das man sich
nicht leisten kann, spaet das C-Paket, das man nicht mehr will.

Grundhaerte **1.15 → 1.12**, gemessen 52 % bei 600 Runs (1.13 gab 49 %, 1.10 gab
54 % — die Kurve ist hier steil, deshalb der Zwischenwert). Rangstufen je Run 14,0
gegen 14,4 vorher, die Wirtschaft bleibt also aequivalent.

`dev/sim.js` 427/427 — acht neue Zusicherungen: die drei Eckpunkte der Kurve
(70/30 am Anfang, B/A in der Mitte, A/S im Endspiel) und fuer jede Stufe, dass das
Fenster **hoechstens zwei** Raenge breit ist. Genau das ist die Absicht; eine
dritte Zeile waere wieder ein Lostopf. `dev/uitest.js` 104/104.

Worktree `/home/viktor/tensura/worktree/phase-52-rangfenster`, Branch
`phase-52-rangfenster`.

### Phase 53 (2026-07-31): S bleibt ein Glueckstreffer

Rueckmeldung zu Phase 52: S soll auch im Endspiel eine Seltenheit sein, etwas,
worueber man sich freut. Mit 30 % A / 70 % S war es dort das Gegenteil — der
Normalfall.

**Und dabei kam ein Leck heraus, das die Seltenheit ohnehin unmoeglich machte.**
Die Aufwertung umging das Fenster vollstaendig: `rang = max(rang, vorhanden.rank
+ 1)` machte aus jeder A-Einheit im Trupp ein S-Angebot, egal was die Stufe
sagte. Ein Trupp aus A-Einheiten haette also dauernd S-Posten gesehen, und zwar
genau dort, wo die Seltenheit zaehlt. Jetzt gilt fuer Wurf UND Aufwertung
dieselbe Obergrenze, `rangObergrenze(stufe)` — der Pool kennt sie ebenfalls,
sonst stehen Arten im Angebot, deren Aufwertung das Fenster nicht hergibt.

Die Positionen stehen jetzt als **Tabelle** statt als Formel, weil sie eine
Absicht ausdruecken und keine Rechnung. Eine lineare Formel kann das nicht: sie
haette am Anfang und am Ende dieselbe Steigung, und genau das soll sie nicht.

| Stufe | Position | C | B | A | S |
|---|---|---|---|---|---|
| 1 | 0,30 | 70 % | 30 % | — | — |
| 2 | 1,05 | — | 95 % | 5 % | — |
| 3 | 1,55 | — | 45 % | 55 % | — |
| 4 | 1,90 | — | 10 % | 90 % | — |
| 5 | 2,15 | — | — | 85 % | **15 %** |
| 6 (nur Elite/Boss) | 2,30 | — | — | 70 % | **30 %** |

Gemessen als Erlebnis, nicht nur als Prozentzahl: **Chance auf mindestens ein S
unter den vier Posten** — Stufe 4: 0 %, Stufe 5: 47 %, nach Elite oder Boss:
76 %. Vor dem Endspiel gibt es also gar kein S, dort etwa jeden zweiten Markt
eines, und am wahrscheinlichsten nach einem schweren Kampf. Die Freude haengt
damit an einer Leistung statt an der Rundenzahl.

Der Trupp wird dadurch deutlich schwaecher — Rangstufen 12,8 statt 14,0, und die
Siegquote fiel auf 42 %. Grundhaerte **1.12 → 1.01**, gemessen **51 %** bei 600
Runs. Nebenbefund: die unbezahlbaren Angebote sind von 5,7 auf **2,0 je Run**
gefallen, weil kein S mehr frueh im Markt haengt — der Punkt aus TODO.md ist
damit erledigt.

Auch der Heilungs-Eimer ist mitgesunken (70 → 61 %), waehrend Chaos auf 71 %
sprang (n=42, kleine Stichprobe). Wer sich festlegt, gewinnt weiter — nur ist es
jetzt nicht mehr dieselbe Linie. Nicht nachgesteuert, nur notiert.

`dev/sim.js` 430/430 — drei neue Zusicherungen: S bleibt unter 25 % im Endspiel,
vor dem Endspiel kommt es gar nicht vor, und die Aufwertung bleibt im Fenster
statt einfach einen Rang draufzulegen. Die letzte ist die wichtige: sie ist der
Waechter fuer genau das Leck, das diese Phase gefunden hat. `dev/uitest.js`
104/104.

Worktree `/home/viktor/tensura/worktree/phase-53-s-selten`, Branch
`phase-53-s-selten`.

### Phase 54 (2026-08-02): Der Takt — aus Wiedergabe wird Regie

Erste Phase des Kampfkino-Plans (54–61). Der Kampf war korrekt, aber tonlos,
und das lag nicht am Rendering: `setInterval(schritt, 70)` gab einem
Giftstapel und einem Todesstoss exakt dieselben 70 Millisekunden. Eine
Ereignisliste gleichmaessig abzuspulen ist keine Regie, sondern ein Ticker.

Neu ist `js/regie.js` — eine reine Funktion, kein DOM, kein three.js:

```
Regie.zeitplan(log) -> [ { i, ms, beat, stopp } ]
```

Sie tut zwei Dinge. **Erstens Gewichte je Ereignistyp** statt einer festen
Zahl: `status` 0,4 · `hit` 1,0 · `aktiv` 3,5 · `death` 5,0 ·
`verwandlung` 6,0. Das Budget bleibt dabei erhalten (70 ms mal Anzahl der
Eintraege), die Zeit wandert nur — was ein Hoehepunkt bekommt, fehlt dem
Belanglosen. Gemessen ueber drei Seeds: **4757 statt 4760 ms, −0,06 %**.
Ein Tod steht jetzt **326 ms**, ein Statusstapel **25 ms** — Faktor 13 statt
Faktor 1.

**Zweitens Vorausschau.** Die Wiedergabe kennt nur „naechster Eintrag"; der
Zeitplan sieht das ganze Log und weiss deshalb schon beim Treffer, dass gleich
jemand faellt. Fuenf Beats: `gross` (≥ 12 % der Lebenspunkte), `toedlich` (auf
diesen Treffer folgt der Tod des Ziels), `flaeche` (einem Einsatz folgen ≥ 2
Treffer), `wende` (eine Seite faellt unter die Haelfte), `finale` (der letzte
Tod). In einem Beispielkampf: 11 · 5 · 5 · 2 · 1.

Das ist der Punkt der Phase. **Ein Hitstop, den man erst beim Tod bemerkt,
kommt zu spaet** — er muss auf dem Treffer davor liegen. Genau deshalb ist die
Vorausschau hier zentral und einmal gebaut, statt in jeder folgenden Phase
neu. `stopp` liegt mit 0/90/140/260 ms **innerhalb** des `ms` seines Beats und
kostet damit keine Extrazeit; ein Beat-Faktor (Finale 2,0 · Wende und toedlich
1,5) sorgt dafuer, dass er auch hineinpasst.

In `js/ui.js` ersetzt ein Zeitkonto auf `requestAnimationFrame` das feste
Intervall. Mehrere billige Eintraege duerfen sich ein Bild teilen — diese
Buendelung ist es, die die Dehnung bezahlt. Dazu **Tempo 1× / 2× / 4×** neben
`Ueberspringen`, gemerkt in `localStorage` wie der Debug-Schalter.
`Ueberspringen` bleibt synchron und unveraendert; `dev/uitest.js` klickt es
sofort und merkt vom Uhrwechsel nichts.

`dev/sim.js` 439/439 — neun neue Zusicherungen, darunter die drei, die den
Kern schuetzen: die Gesamtdauer bleibt innerhalb von 2 % der alten, ein Tod
bekommt mindestens die fuenffache Zeit eines Statusstapels, und jeder als
`toedlich` markierte Treffer hat tatsaechlich einen Tod desselben Ziels vor
sich. `dev/uitest.js` 104/104. `js/combat.js` unangetastet — die Balance kann
sich nicht verschoben haben.

Worktree `/home/viktor/tensura/worktree/phase-54-takt`, Branch
`phase-54-takt`.

### Phase 55 (2026-08-02): Der Einschlag — Treffer bekommen Gewicht

Phase 54 hat die Zeit verteilt, aber im Bild passierte beim Treffer weiterhin
nichts: der Lebensbalken sank, und das war alles. Ein Treffer braucht vier
Dinge, und keins davon ist ein Partikel — **Aufblitzen** (wen hat es
erwischt), **Rueckstoss** (aus welcher Richtung), **Erschuetterung** (wie
hart) und eine **Schadenszahl** (wie viel).

**Die Richtung ist der Grund, warum `js/combat.js` angefasst werden musste.**
Ein `hit`-Eintrag trug `key` (das Ziel) und `source` (einen Namen) — den
Angreifer kannte er nicht. Ohne ihn bleibt vom Rueckstoss ein Zucken auf der
Stelle.

Dabei kam heraus, dass zwei Felder noetig sind, nicht eines. `opt.von` steuert
naemlich bereits die **Deckung** (`js/combat.js:251`): wer zwischen dir und dem
Angreifer steht, faengt ein Drittel ab. Haette man `von` einfach ueberall
nachgetragen, wo bisher keiner stand — etwa in den Passiven, die ueber
`c.deal` Schaden austeilen —, waere aus einer reinen Anzeigeaenderung eine
Regeländerung geworden. Deshalb `anzeigeVon`: dasselbe Wissen, aber es wird
ausschliesslich ins Log geschrieben und nirgends gelesen. Gesetzt wird es an
genau einer Stelle, im `deal` des Faehigkeits-Kontexts, statt in vierzig
Faehigkeiten einzeln.

**Der Beweis, dass nichts verrutscht ist:** `npm run balance 600` liefert
Zeile fuer Zeile dieselben Zahlen wie vorher — Siege **304 (51 %)**,
Kampfherausforderungen 2402 / 63 % gehalten, Ø 13.2 Knoten, gescheitert je Akt
155 / 445, alle acht Boss-Quoten unveraendert.

Im Brett schreibt jetzt **nur noch `schleife()`** das Material. Vorher tat es
`aktualisiere()` — und damit haette der naechste Logeintrag genau das
ueberschrieben, was man gerade sehen soll. Aus demselben Grund gibt es `pos`
(nachgezogener Standpunkt) getrennt von `gruppe.position` (Standpunkt plus
Rueckstoss): ohne die Trennung frisst die naechste Bewegung den Stoss auf.

Der Tod ist kein `opacity = 0.22` mehr, sondern ein Zerfall: Funkenstoss in
der Seitenfarbe, das Bild hebt sich und verlischt. Es bleibt ein sehr blasser
Rest — wer gefallen ist, gehoert weiter auf die Lagekarte. Gemessen: bei 0,55
Hoehe schwebt der Rest sichtbar ueber der Kachel und liest sich als Fehler,
bei 0,3 als Gefallener.

**Und der Hitstop aus Phase 54 hat endlich etwas zum Anhalten.** `Brett3D.halt(ms)`
friert das Bild ein, waehrend die Standzeit weiterlaeuft. Das kostet keine
Zeit, weil `stopp` innerhalb von `ms` liegt.

**Nebenbefund, und kein kleiner:** `verfuegbar()` legte bei JEDEM Aufruf eine
Leinwand mit eigenem WebGL-Kontext an und gab sie nie frei. Solange nur
`aktualisiereFeld()` fragte, fiel das nicht auf; seit die Wiedergabe je
Logeintrag fragt, lief der Browser nach wenigen Sekunden in *„Too many active
WebGL contexts. Oldest context will be lost."* und warf dem Brett den Kontext
unter den Fuessen weg. Die Antwort wird jetzt gemerkt — sie aendert sich
ohnehin nicht. Gefunden mit Playwright im echten Browser; im Test waere es nie
aufgefallen, weil jsdom gar kein WebGL hat.

`js/ui.js`: die 48-Zeilen-Funktion `anwenden()` ist in drei zerlegt —
`anwenden` (Zustand), `zeile` (Log), `zeige` (Brett). Sie war die einzige
Stelle im Projekt, an der Logik und Darstellung sich mischten. `Ueberspringen`
braucht nur die ersten beiden.

`dev/sim.js` 442/442 — drei neue Zusicherungen, darunter die entscheidende:
**ohne Angreifer bleibt nur Zustandsschaden.** Brand kommt aus dem Zustand,
nicht aus einer Richtung, und ein erfundener Rueckstoss waere schlimmer als
keiner. `dev/uitest.js` 104/104. Bildbeweis: Boss-Kampf gegen Charybdis im
Browser, Schadenszahl „18" ueber dem Ziel, passend zur Logzeile.

Worktree `/home/viktor/tensura/worktree/phase-55-einschlag`, Branch
`phase-55-einschlag`.

### Phase 56 (2026-08-02): Licht — Bloom und Farbraum

Die Schicht, die Magie nach Magie aussehen laesst — und die erste, die nicht
mehr aus Timing besteht.

**Warum von Hand und nicht `UnrealBloomPass`.** three.js hat `examples/js` in
r148 entfernt; alle Addons ab da sind ES-Module. Dieses Projekt sitzt auf r149
UMD, weil `ASSETS.md` das ausdruecklich so festgelegt hat, und es hat keinen
Bauschritt. Der Addon-Weg hiesse rund 900 Zeilen Fremdcode von Hand nach
klassischem Skript umschreiben, samt Herkunftsnachweis in `ASSETS.md`. Neu ist
stattdessen `js/fx.js` mit 180 eigenen Zeilen: Szene in ein Rendertarget →
Helligkeitsschwelle mit weichem Knie auf halbe Aufloesung → zwei getrennte
Gauss-Durchgaenge → additiv zurueck ueber die Szene, Vignette im selben
Durchgang. Vollbildquad ist `PlaneGeometry(2,2)` plus `OrthographicCamera`,
mehr braucht es nicht.

**Zwei Sachen, die man leicht falsch macht**, und beide stehen als Kommentar in
der Datei. Erstens: in r149 richtet sich Tonemapping und sRGB beim Rendern in
ein Ziel nach der **Kodierung der Zieltextur**, nicht nach
`renderer.outputEncoding` — ohne `rtSzene.texture.encoding = sRGBEncoding`
bliebe das Bild linear und damit flau. Zweitens: die Leinwand ist
durchsichtig, der Verlauf dahinter kommt aus CSS. Der Zusammenbau muss den
Alphakanal durchtragen und dort anheben, wo das Leuchten ueber leeren Grund
faellt — sonst ist ein Funke am Bildrand unsichtbar, obwohl er strahlt.

Am Renderer stehen jetzt `sRGBEncoding` und `ACESFilmicToneMapping` (die
r149-Schreibweise; `outputColorSpace` gibt es erst ab r152).

**Und dabei kam heraus, dass die erste Einstellung zu viel war.** Mit Schwelle
0,62 riss schon der Koerper des Platzhalters (0x7fb0e8, Spitzenwert 0,91) die
Schwelle — das ganze Brett leuchtete und sah ausgewaschen aus statt magisch.
Jetzt Schwelle 0,85, Staerke 0,6, Belichtung 0,95 statt 1,15: es glimmen die
Funken und die Lebensbalken, nicht die Kacheln.

**Der Vergleichsschalter ist kein Zugestaendnis, sondern das Messinstrument.**
Effekte **voll / sparsam / aus** im Menue, wie der Debug-Schalter im
`localStorage` gemerkt, und er greift sofort — auch mitten im Kampf. Genau
darum geht es: zwei Stufen nebeneinander sehen zu koennen, ohne den Kampf zu
verlieren. Im direkten Vergleich derselben Szene ist `sparsam` flach und hell,
`voll` hat Tiefe — und den groesseren Anteil daran hat die Vignette, nicht das
Bloom. `aus` faellt auf die SVG-Lagekarte zurueck; geprueft, dass dann ein
`<svg>` im Brett steht und kein `<canvas>`.

~~Gemessen im Browser waehrend eines Kampfes mit voller Stufe: 16,7 ms je Bild
im Median — also durchgehend 60 Bilder je Sekunde.~~ **Diese Messung war
falsch und ist in Phase 58 aufgeflogen** — siehe dort. Sie entstand, waehrend
die Schleife des Bretts ruhte; gezaehlt wurde ein leerer `requestAnimationFrame`
und nicht das Zeichnen.

`js/fx.js` ist reiner GPU-Code und laesst sich headless nicht pruefen — in
jsdom gibt es kein WebGL. Es kommt deshalb **keine** Zusicherung in
`dev/sim.js` dazu; der Beleg ist der Bildvergleich. `dev/sim.js` 442/442,
`dev/uitest.js` 104/104 — dass beide unveraendert bleiben, ist hier die
Aussage: die Schicht haengt sauber daneben.

Worktree `/home/viktor/tensura/worktree/phase-56-licht`, Branch
`phase-56-licht`.

### Phase 57 (2026-08-02): Die Formen — jedes Schlüsselwort bewegt sich anders

Bis hierher unterschied nur die **Farbe**. Zwei Faehigkeiten mit demselben
Funkenschwarm in Orange und Gruen sehen aber gleich aus: Farbe erkennt man
erst, wenn man schon hinschaut, Bewegung erkennt man vorher. Neu ist deshalb
eine vierte Tabelle `FORM` neben `FARBE`/`AN_SICH`/`SOFORT`.

**Sechs Grundformen, nicht siebzehn** — mehr waere nicht mehr Information,
sondern weniger, weil sich keine mehr einpraegt:

| Form | Schlüsselwörter | Bewegung |
|---|---|---|
| `geschoss` | brand, gift, frost | Bogenflug, dann Einschlag |
| `strahl` | donner, licht, dunkelheit | gestrecktes Quad A→B, drei Bilder Licht |
| `klinge` | exekution, blutung, konter, verwundbar | Schnittbogen am Ziel, in Angriffsrichtung gedreht |
| `welle` | flaeche | Bodenring auf dem echten Umkreis |
| `saeule` | heilung, schild, tempo | aufsteigender Ring an der eigenen Figur |
| `schleier` | schatten, verderbnis, chaos | kreisende Funken um das Ziel |

Dazu bekommt **jeder** Effekt auf ein fremdes Ziel einen **Einschlagring** auf
dem Boden. Er kostet vierzig Dreiecke und traegt mehr als zehn Funken — er ist
der Unterschied zwischen „trifft" und „schlaegt ein".

**Der Radius der Welle ist nicht geraten.** `FASSUNG_FLAECHE` lag bisher
innerhalb von `simulate()`; es steht jetzt modulweit und wird exportiert —
verschoben, nicht veraendert (`dev/sim.js` 442/442 unmittelbar danach). Das
Brett rechnet den Weltradius aus `Hex.pixel`: bei „pointy top" ist der Abstand
zweier Kachelmitten `sqrt(3)` mal Groesse. Im Bild geht die Welle damit genau
ueber zwei Kachelringe auf.

**Dass eine Flaeche ueberhaupt eine ist, weiss das Brett aus der Regie.**
`combat.js` meldet keine Flaechenwirkung; der `flaeche`-Beat aus Phase 54 sagt,
dass einem Einsatz mehrere Treffer folgen. Die Welle legt sich dann ueber die
Grundform, statt sie zu ersetzen — deshalb `form === 'welle' || beat ===
'flaeche'`.

**Beim Nachsehen im Browser kam ein Fehler heraus, den nur das Bild zeigt:**
die Funken der Welle liefen ueber `streuX * radius` nach aussen — also auf
einem RECHTECK. Ein Funke in der Ecke landete damit weit neben dem Brett, als
faustgrosser weisser Klecks vor der Kamera. Jeder Funke hat jetzt einen festen
Winkel und laeuft auf einem Kreis. Schleier hat denselben Winkel bekommen.

Geprueft mit Playwright und einem Kniff, der sich lohnt: `Brett3D.halt()` aus
Phase 55 friert das Bild ein — Effekt ausloesen, 200 bzw. 420 ms warten,
einfrieren, Bild machen. Ohne das ist ein 520-ms-Effekt vom Werkzeug aus nicht
zu erwischen. Belegt: die Welle als grosse Bodenellipse ueber zwei Kacheln, der
Strahl als gestrecktes Quad zwischen Angreifer und Ziel, der Bodenring an den
Fuessen.

`dev/sim.js` 442/442, `dev/uitest.js` 104/104.

Worktree `/home/viktor/tensura/worktree/phase-57-formen`, Branch
`phase-57-formen`.

### Phase 58 (2026-08-02): Die Figuren leben

Vier kleine Bewegungen und zwei Zutaten, die aus Pappaufstellern Kaempfer
machen — und ein Messfehler aus Phase 56, der dabei aufflog.

**Schattenwurf.** Der groesste einzelne Gewinn dieser Phase, und der
billigste: ein weicher dunkler Fleck flach unter jeder Figur. Ohne ihn
schweben die Figuren VOR dem Brett, mit ihm stehen sie DARAUF. Er schrumpft
mit dem Wippen mit, sonst klebt er als Scheibe.

**Atmen.** Sinus-Wippen, Amplitude 0,055 — klein genug, dass es auffaellt,
wenn es FEHLT, und nicht, wenn es da ist. Die Phase wird aus dem Schluessel
gehasht, sonst wippt der ganze Trupp im Gleichtakt und sieht aus wie eine
Animation statt wie Leben. Wer gefallen ist, atmet nicht.

**Stauchen und Strecken**, gekoppelt an `Brett3D.treffer` aus Phase 55:
stauchen beim Einstecken, strecken beim Austeilen. Dieselbe Sprache wie der
Rueckstoss, nur an der Figur statt am Standpunkt.

**Randkontur** im Platzhalter, eine breite Linie in der Seitenfarbe unter der
Silhouette. Seit Kachel und Vignette dunkel sind, versank die Silhouette sonst
im Brett. Sie bleibt eine Silhouette — die Begruendung im Dateikopf gilt
weiter.

**Blickrichtung — und da lag ein Irrtum.** Der Plan sagte: Gegner ueber ein
negatives `scale.x` spiegeln. Im Bild blieb die Waffe rechts: in three.js
dreht ein negatives `scale.x` am Sprite das Quad, ohne das Bild zu wenden.
Gespiegelt wird jetzt die TEXTUR ueber `repeat.x = -1` / `offset.x = 1`. Im
Bild belegt: der eigene Trupp traegt die Waffe rechts, die Gegner links, beide
Seiten schauen zur Mitte.

**Zustandsmarken**, aber nur drei: Brand, Gift, Erstarrung. Wer alle dreizehn
ans Modell haengt, baut ein zweites Log auf das Brett. Sie sassen zuerst ueber
dem Lebensbalken und wurden dort von der Rahmung abgeschnitten — jetzt sitzen
sie darunter. Eine Marke, die man nicht sieht, ist keine.

**Und jetzt der Messfehler.** Seit die Figuren atmen, steht nie mehr alles
still, und die selbstabschaltende Schleife laeuft durchgehend. Damit wurde
erstmals das echte Zeichnen gemessen — und statt der 16,7 ms aus Phase 56
kamen **480 ms** heraus. Der Grund ist nicht der Code: der Browser hinter dem
Playwright-Werkzeug hat **keine GPU**, er rendert mit SwiftShader in Software
(`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))`, Leinwand 2093 × 749).
Vier Vollbild-Durchgaenge kosten dort genau so viel.

Damit ist auch klar, was die 16,7 ms in Phase 56 wirklich waren: **ein leerer
`requestAnimationFrame`.** Die Schleife des Bretts ruhte zu dem Zeitpunkt, und
gezaehlt wurde eine Uhr, die nichts zeichnete. Der Eintrag zu Phase 56 ist
entsprechend korrigiert.

Was sich hier ehrlich messen laesst, ist nur das Verhaeltnis: **voll 500 ms
gegen sparsam 300 ms** — das Bloom kostet also rund zwei Drittel obendrauf.
Auf einer echten GPU ist das Fuellrate und faellt um Groessenordnungen kleiner
aus, aber eine Bildrate ist aus dieser Umgebung nicht zu bekommen. Die
Prüfungstabelle dieses Plans verlangt „60 fps bei 12 Figuren mit Bloom" —
**diese Zusicherung steht weiter offen** und braucht einen Browser mit GPU.

Nebenbefund fuer Phase 60: bei flachen Brettern mit wenigen Einheiten
schneidet die Rahmung die Figuren oben ab. Die Formel rechnet
`tiefe·sin + (SPRITE_H+0,9)·cos` und unterschaetzt das bei zwei Reihen. Phase
60 misst den Hoehendeckel ohnehin neu.

`dev/sim.js` 442/442, `dev/uitest.js` 104/104.

Worktree `/home/viktor/tensura/worktree/phase-58-figuren`, Branch
`phase-58-figuren`.

### Phase 59 (2026-08-02): Die Kamera lebt

**Hier wird eine Regel aus dem Dateikopf ausdruecklich umgedreht.** Dort stand
seit Phase 41: „keine Steuerung, keine Auswahl, keine Kamerabewegung — was man
nicht bedienen kann, soll auch nicht so aussehen." Die ersten beiden Haelften
tragen weiter. Die dritte nicht: **eine Aufloesung, der man ZUSIEHT, ist ein
Film — und ein Film hat eine Kamera.** Nicht bedienbar zu sein heisst, dass der
Blick GEFUEHRT werden muss, nicht dass er stehen soll. Der Absatz ist neu
geschrieben statt uebergangen; sonst stuende im Code eine Regel, die der Code
bricht.

**Das Gestell hat vier Teile, die sich addieren**, damit keiner den anderen
ueberschreibt: `basis` (die berechnete Rahmung aus `montiere`, unangetastet),
`blick` (ein weich nachgezogener Zielpunkt), `zoom` (ein Faktor auf den
Abstand) und der Erschuetterungsversatz aus Phase 55. Vorher schrieb die
Erschuetterung direkt auf `camera.position` — mit einer zweiten Bewegung
daneben haette sie sie schlicht ueberschrieben.

`Brett3D.blick(keys, staerke, dauer)` ist die ganze Schnittstelle: die Regie
fordert eine Rahmung an, das Brett fuehrt sie aus und faellt nach `dauer` von
selbst zurueck. Heranfahren beim `aktiv`, staerker beim toedlichen Treffer,
Schwenk ueber die Gegnerreihe zum Auftakt.

**Die Leitplanke zieht jedes Bild ein Stueck zurueck, statt einmal hart zu
klemmen.** Faellt eine lebende Einheit aus dem Bild (|NDC| > 0,97), wandert
`blickZiel` um 30 % Richtung Basis und der Zoom oeffnet sich. Damit korrigiert
sie sich selbst, auch waehrend die Einheiten sich bewegen — eine einmalige
Pruefung beim Anfordern waere eine Sekunde spaeter falsch.

**Die Zeitlupe braucht beide Uhren.** Die Regie dehnt den Beat ohnehin (Phase
54); das Brett verlangsamt zusaetzlich seine eigene Animationsuhr auf 0,25 beim
Finale und 0,4 beim toedlichen Treffer. Nur die Dehnung waere langsam, beides
zusammen ist feierlich.

**Der Auftakt wird tatsaechlich bezahlt, nicht dazugerechnet.** Der
`setup`-Eintrag hatte in Phase 54 das Gewicht 0 und verschenkte seine Zeit; er
hat jetzt Gewicht 26 und bekommt damit **780 ms aus demselben Budget** — die
Gesamtdauer bleibt bei 4761 gegen 4760 ms. Dafuer ueberspringt `js/ui.js` den
setup-Eintrag nicht mehr; Zustand und Log ignorieren ihn weiterhin, nur die
Anzeige sieht ihn.

**Und ein offener Punkt aus Phase 55 ist damit geschlossen:** die
Schadenszahlen wurden dort einmal projiziert und dann per CSS bewegt — mit dem
`ponytail:`-Vermerk, dass das ab dieser Phase nicht mehr reicht. Sie laufen
jetzt je Bild mit der Kamera mit.

Geprueft im Browser ueber den Umweg der Schadenszahl als Messpunkt: dieselbe
Weltposition projiziert waehrend der Fahrt auf **64,8 %** der Breite und nach
der Rueckkehr auf **75,3 %**. Die Kamera faehrt also, kommt zurueck, und die
Zahlen haengen daran. Im Bild belegt: beim Heranfahren auf einen einzelnen
Gegner bleibt die eigene Einheit im Rahmen — die Leitplanke greift.

`dev/sim.js` 443/443 — eine neue Zusicherung („der Auftakt bekommt eigene
Zeit"), und die alte „kein Eintrag ausser setup faellt unter die Untergrenze"
ist zu „kein Eintrag" geworden, weil setup jetzt Zeit hat. `dev/uitest.js`
104/104.

Worktree `/home/viktor/tensura/worktree/phase-59-kamera`, Branch
`phase-59-kamera`.

### Phase 60 (2026-08-02): Die Bühne — Stimmung statt Hintergrund

Vier Zutaten machen aus dem Brett einen Ort, und die letzte kauft die
Lesbarkeit zurueck, die die fahrende Kamera aus Phase 59 gekostet hat. Genau
deshalb kommt diese Phase NACH der Kamera und nicht davor.

**Dunst** (`FogExp2`, 0,055) im Ton des Akts: die hinteren Reihen sitzen im
Nebel, das Brett bekommt Tiefe. Exponentiell statt linear, sonst gibt es eine
sichtbare Kante.

**Hintergrund je Akt** — ein grosses Verlaufsquad hinter dem Brett, Akt 1 kuehl
blau, Akt 2 violett. Kein Bild, kein Asset: der Verlauf entsteht zur Laufzeit
auf einer 8 × 256 grossen Leinwand. `montiere` nimmt dafuer einen dritten
Parameter, `js/ui.js` reicht `run.act` durch.

**Schwebeteilchen**, dreissig Stueck, sehr langsam. Sie sagen „hier ist Luft",
nicht „hier passiert etwas" — deshalb duerfen sie nichts tun.

**Kachel-Rueckmeldung:** die Kachel der handelnden Einheit und die des Ziels
pulsen in der Farbe des Schluesselworts. Das ist der Ersatz fuer den
Ueberblick, den die bewegte Kamera kostet: wenn der Blick wandert, braucht man
am Boden eine Marke.

**Die Teilchen waren beim ersten Anlauf ein Fehler.** Sie streuten ueber die
anderthalbfache Bretttiefe — und eins davon stand dicht vor dem Objektiv, wurde
gross und wurde vom Bloom zur weissen Scheibe aufgeblasen. Im Bild sah das aus
wie ein Defekt. Die Tiefe bleibt jetzt innerhalb des Bretts (0,7 statt 1,4),
Groesse und Deckkraft sind halbiert.

**Die volle Buehne.** `#kampfbuehne` ist ein Raster: das Brett bekommt den
Hauptplatz, Aufstellung und Log ruecken auf breiten Fenstern DANEBEN statt
darunter. Keine `@media`-Abfrage — die Datei sagt im Kopf, dass dies ein
Desktop-Spiel im Vollbild ist, und `minmax(0, 3fr) / minmax(22rem, 1fr)` tut
dasselbe ohne Umschaltpunkt.

Damit faellt auch der Grund fuer den niedrigen Hoehendeckel weg: er begrenzte,
wie viel Bildschirm das Brett dem Log wegnimmt, und das Log steht jetzt
nebenan. **760 → 900.** Gemessen an einem Vollbild-Desktop: Leinwand
1560 × 650 — der Deckel bindet also gar nicht mehr, die Geometrie braucht
weniger.

**Und der Nebenbefund aus Phase 58 ist erledigt.** Die Rahmung schnitt bei
flachen Brettern Kopf und Lebensbalken ab. Der Grund stand in der Formel: der
Blick zielt um `SPRITE_H · 0,2` UEBER die Brettebene, und wer hoeher zielt,
schiebt den Inhalt nach unten und braucht oben genau so viel mehr Platz. Der
Versatz geht jetzt doppelt in `senkrecht` ein. Im Bild belegt: Kopf,
Lebensbalken und Zustandsmarken stehen wieder vollstaendig im Rahmen.

`dev/sim.js` 443/443, `dev/uitest.js` 104/104.

**Nachtrag (Rueckmeldung des Nutzers, korrigiert auf `phase-61-figuren`):** das
Log in der Seitenspalte bekam `height: auto; flex: 1`. In einer Spalte, deren
Hoehe vom Inhalt kommt, waechst das einfach mit, statt zu scrollen — und schob
„Ueberspringen" mit jeder Logzeile weiter nach unten. Jetzt ein fester Deckel,
`min(28rem, 46vh)`. Gemessen: 140 zusaetzliche Zeilen machen aus 446 px Inhalt
2832 px, die Box bleibt bei **446 px**, sie scrollt, und die Unterkante der
Buehne bewegt sich um **0 px**.

Worktree `/home/viktor/tensura/worktree/phase-60-buehne`, Branch
`phase-60-buehne`.

### Phase 61 (2026-08-02): Echte Figuren — die Vorgabe (Bilder offen)

Die einzige Phase des Kampfkino-Plans, die keine Codearbeit ist. Umgesetzt ist
davon der **erste** Schritt: die Vorgabe in `ASSETS.md` schärfen, bevor das
erste Bild entsteht. Die Bilder selbst stehen aus — der Nutzer entscheidet über
Werkzeug und Lizenzlage.

Dass die Vorgabe erst jetzt geschrieben wird und nicht am Anfang, ist der
Punkt: **nach den Phasen 55–60 ist bekannt, was ein Bild auf dieser Bühne
können muss.** Die vier Geometriepunkte standen schon da. Die vier neuen
kommen aus dem, was das Brett inzwischen mit dem Bild macht, und sie sind es,
die man ohne Vorwarnung falsch macht:

- **Kein eingemalter Schatten** — das Brett legt seit Phase 58 selbst einen
  darunter, ein zweiter sieht aus wie ein Fehler.
- **Eigene Kantentrennung.** Der farbige Umriss aus Phase 58 steckt in
  `platzhalter()`; ein echtes Bild bekommt ihn **nicht** und versinkt ohne
  eigenen Rand im dunklen Brett — deutlicher als der Platzhalter es je tat.
  Das ist der Punkt, an dem sonst der ganze Stapel nachgearbeitet werden
  müsste.
- **Spiegelbar** — Gegner werden seit Phase 58 gespiegelt, Schrift und Wappen
  fallen damit aus.
- **Keine grossen sehr hellen Flaechen** — die Nachbearbeitung laesst alles
  ueber 0,85 gluehen (Phase 56). Fuer eine Klinge gewollt, fuer eine weisse
  Ruestung nicht.

Dazu praezisiert: Format 512 × 1024 statt „etwa 1:2", und die Hoehen, auf
denen Lebensbalken (0,82) und Zustandsmarken (0,70) liegen — was dort im Bild
steht, wird verdeckt.

Die Herkunftstabelle hat jetzt eine eigene **Prompt**-Spalte, statt ihn in
„Herkunft" zu quetschen. Die Regel bleibt unveraendert scharf: ohne Eintrag
gilt ein Bild als nicht verwendbar.

**Offen und ausdruecklich als Entscheidung vermerkt, nicht als Nebenwirkung:**
`.gitignore` enthaelt nur `node_modules`, die rund fuenfzig Bilder gehen also
mit ins Repo.

`dev/sim.js` 443/443, `dev/uitest.js` 104/104 — es wurde kein Code angefasst.

Worktree `/home/viktor/tensura/worktree/phase-61-figuren`, Branch
`phase-61-figuren`.

### Phase 62 (2026-08-04): Gegner bekommen Schlüsselwörter

Idee 1 aus „Offen aus der Recherche": die Resonanz gilt ausdrücklich für beide
Seiten, aber gegnerseitig war sie tot. `spawn` liest `def.keywords` — und
`build` hat das Feld nie gesetzt. Kein Gegnertrupp hat je eine Schwelle
erreicht.

**Abgeleitet statt abgeschrieben.** Der Plan sah 72 handgepflegte Wortlisten
vor; geschrieben wurde stattdessen `schluesselwoerter(d, actives)` in
`enemies.js`, die dieselben zwei Quellen ausliest, aus denen `Run.buildTeile`
die Wörter des Spielers sammelt: die Aktive und die Passiven. Das ist nicht nur
weniger Arbeit, es ist die haltbarere Fassung — eine zweite Liste würde beim
ersten Umbau einer Fähigkeit lügen, und von Hand erfundene Wörter würden
behaupten, ein Gegner täte etwas, was er nicht tut. Nicht entdoppelt: wer Gift
anlegt UND Gift wirft, ist zwei Teile einer Giftlinie, genau wie beim Spieler.

**Die Resonanz steht jetzt im Kampflog, für beide Seiten.** Sie war vorher nur
auf dem Truppschirm sichtbar; ein Gegnertrupp, der ohne sichtbaren Grund 15 %
mehr heilt, ist ein unerklärter Kampf.

**Der teuerste Fund war ein Fehler, der älter ist als diese Phase.** „Elite:
Steinerne Wacht" (zwei Gargoyles, zwei Blutgolems) erreicht als erste Begegnung
überhaupt Konter-Resonanz — und der Kampf lief sofort in „Maximum call stack
size exceeded". Ursache: ein Konter antwortete auf einen Konter. Zwei Trupps,
die beide `onDamaged` austeilen, schlagen einander in derselben Aufrufkette
endlos zurück; das endete bisher nur durch Sterben, und wo eine
`onDamaged`-Heilung den Konterschaden aufwiegt (Blutgolem, 18 Leben je
erlittenem Treffer), stirbt niemand. Die Sperre `imKonter` in `deal()` lässt
Konter nur noch auf Angriffe antworten. **Der Fehler steckte seit Phase 14 im
Spiel und war bloß unerreichbar** — es brauchte einen Gegnertrupp mit
gebündelter Linie, um ihn auszulösen. Genau das ist das Argument für diese
Phase: die eine Seite des Spiels, die nie gebündelt hat, hat auch nie geprüft.

`node dev/sim.js` 443/443. Die Balance-Messung steht aus und läuft gesammelt
nach Phase 66 — Gegner-Resonanz macht die Gegner stärker, `GRUNDHAERTE` ist
deshalb ein Kandidat für die Nachkalibrierung.

Worktree `/home/viktor/tensura/worktree/phase-62-gegnerworte`, Branch
`phase-62-gegnerworte`.
### Phase 63 (2026-08-04): Die Verstaerker-Diagnose war falsch

Der Auftrag lautete, die acht Verstaerker-Kits umzuschreiben. Die Notiz dazu
stand seit Phase 51 im Plan: Verstaerker 46 %, Unterstuetzer 60 %, Lage und
Reichweite als Ursache durch Phase 49 ausgeschlossen, also *"es liegt an dem,
was die acht Verstaerker-Einheiten tun"*. Die vermutete Ursache war benannt:
Verstaerker haengen mehr als andere an KOMBINATIONEN, brauchen also Passive,
die einzeln tragen.

**Zwei Messungen, beide gegen die Vermutung.** Vor dem ersten Umbau geprueft,
und gut, dass es so herum lief:

1. **Der Rueckfallwert ist bei Verstaerkern normal.** Jede Einheit im Spiel
   traegt an Stelle 3 jeder Linie eine Passive mit Truppbedingung („Fuehrt ein
   Verbuendeter Konter, … — sonst …", die Phase-21-Struktur). Ueber alle 633
   Linien-Passiven ausgezaehlt, wie viel vom vollen Wert uebrig bleibt, wenn die
   Bedingung NICHT erfuellt ist:

   | Rolle | bedingte Passive | Ø Rueckfall |
   |---|---|---|
   | Unterstuetzer | 16 % | **60 %** |
   | Verstaerker | 18 % | 71 % |
   | Fernkampf | 11 % | 72 % |
   | Front | 15 % | 74 % |
   | Magier | 16 % | 77 % |

   Ausgerechnet Unterstuetzer — die beste Rolle — faellt am haertesten zurueck.
   Die Vermutung sagt das Gegenteil vorher. Sie ist damit erledigt.

2. **Unterstuetzer ist die einzige Rolle, deren Bestand vollstaendig bezahlbar
   ist.** Abgeglichen mit der Liste der 14 nie gekauften Einheiten:

   | Rolle | Einheiten | nie gekauft | erreichbar | Ø Kosten |
   |---|---|---|---|---|
   | Unterstuetzer | 4 | **0** | 4 | 2,5 |
   | Front | 14 | 4 | 10 | 2,8 |
   | Verstaerker | 8 | 3 | 5 | 3,0 |
   | Fernkampf | 8 | 3 | 5 | 3,0 |
   | Magier | 5 | 4 | **1** | 3,6 |

   Die 46 % der Verstaerker sind ein Mittel ueber fuenf billige Einheiten;
   Benimaru, Carrera und Milim — die drei staerksten — kommen nie vor. Die 60 %
   der Unterstuetzer sind ein Mittel ueber ihren vollstaendigen Bestand. **Die
   Rollen-Rangfolge ist eine Preis-Rangfolge**, wie schon die
   Schluesselwort-Rangfolge in Phase 49 eine Reichweiten-Rangfolge war.

**Deshalb wurde kein Kit angefasst.** Acht Einheiten auf einen widerlegten
Befund hin umzuschreiben haette den Inhalt beschaedigt und die Zahl trotzdem
nicht bewegt. Stattdessen zwei Eingriffe am Werkzeug, damit die Messung nicht
noch einmal so gelesen wird:

- **`dev/balance.js` weist je Rolle aus, wie viel vom Bestand ueberhaupt
  vorkam** (`4/8 Einheiten erreicht, Ø Kosten 3.0`) und warnt ausdruecklich,
  wenn eine Rolle unvollstaendig gemessen ist. Beim ersten Probelauf las die
  Tabelle „magier 80 %" — aus einer einzigen Einheit bei n=5. Genau diese Zeile
  war vorher nicht von einer echten Rollenaussage zu unterscheiden.
- **`dev/linien.js` sucht in fuenf statt sieben Schritten.** Sieben loesen 0,02
  Haerte auf, waehrend der Standardfehler bei 70 Proben rund 6 Prozentpunkte
  betraegt — die letzten beiden Halbierungen haben Rauschen gemessen und je 140
  Kaempfe gekostet. Das war der offene Punkt „laeuft ueber zehn Minuten".

**Und eine veraltete Notiz gestrichen:** der Plan verlangte, `dev/linien.js`
solle „mit Trupp messen statt eine Einheit allein". Das tut es laengst —
`trupp()` stellt drei Begleiter dazu, deren Art nicht kollidiert. Die Notiz
stammt aus Phase 15 und ist seither ueberholt worden, ohne dass sie jemand
gestrichen hat.

**Was offen bleibt:** ob Verstaerker mit vollem Bestand immer noch
zuruecksteht. Das ist erst nach Phase 64 messbar — vorher misst die Zahl die
Preiskurve. `node dev/sim.js` 443/443.

Worktree `/home/viktor/tensura/worktree/phase-63-verstaerker`, Branch
`phase-63-verstaerker`.
### Phase 64 (2026-08-04): Es war der Bot, nicht die Preiskurve

Zwei Fragen, eine sauber beantwortet, eine nicht.

**A) Die 14 nie gekauften Einheiten waren ein Messfehler.** Der Plan nannte
zwei moegliche Ursachen und bestand darauf, sie zu trennen: eine zu geizige
Bot-Heuristik (dann ist der Inhalt in Ordnung und nur die Messung blind) oder
eine zu steile Preiskurve (dann sieht ein Mensch dasselbe Problem). Getrennt
wurde ueber die doppelte Kostenzaehlung: `passt()` addierte `u.cost` in den
Zaehler, waehrend der Marktvergleich denselben Preis noch einmal in den Nenner
schrieb (Wert je Magicule). Teure Einheiten wurden also zweimal bestraft.

`passt()` bewertet jetzt nur noch Schluesselwoerter. Wo die Einheit gratis ist
— im Startdraft — kommen die Kosten an der Aufrufstelle als Staerkemass wieder
dazu, denn dort sind sie keine Kosten, sondern die einzige verfuegbare
Auskunft ueber Staerke.

Ergebnis bei 40 Runs mit voller Freischaltung: **von 14 teuren Einheiten
bleiben 2 ungekauft statt 14.** Benimaru geht in 100 % der Faelle ueber die
Theke, Adalmann in 80 %, Gerudo in 53 %. Die Preiskurve war nie das Problem.

Damit die Frage nie wieder unentscheidbar ist, zaehlt `dev/balance.js` jetzt
**Angebot und Kauf getrennt**. Ohne diese Trennung sieht „nie gekauft" wie eine
geizige Heuristik aus, obwohl der Posten vielleicht nie im Regal lag: Hakuro
stand in 40 Runs nur 4× ueberhaupt zum Verkauf, Apito dagegen 114×. Das sind
zwei voellig verschiedene Befunde hinter derselben Zahl.

Die Folge fuer alle frueheren Messungen ist unangenehm und gehoert hierhin:
**jede Build- und Rollenzahl vor dieser Phase mittelt ueber die guenstige
Haelfte des Rosters.** Phase 63 hat denselben Befund von der Rollenseite
gefunden — die Rollen-Rangfolge war eine Preis-Rangfolge.

**B) Breite gegen Spitze ist NICHT gemessen worden — der Versuch ist
gescheitert.** Der Plan wollte wissen, ob „vier auf B" oder „eine auf S"
gewinnt. Gebaut wurde dafuer ein zweiter Kaufstil (`--kaufstil spitze`):
absoluter Wert statt Wert je Magicule, Reserve 600 statt 140, also warten statt
zugreifen.

| | Siege | Ø Trupp | Ø Truppkosten | Ø Rangstufen | Ø Staerke |
|---|---|---|---|---|---|
| breite | 70 % | 6,0 | 14,7 | 15,4 | 2104 |
| spitze | 65 % | **6,0** | 15,3 | 14,9 | 2070 |

**Beide Stile enden bei exakt derselben Truppgroesse.** Ein Regler an der
Reserve erzeugt keine Spitzenstrategie — er verzoegert Kaeufe, die spaeter
ohnehin stattfinden, weil das Einkommen weiterlaeuft und die Truppgroesse an
anderen Grenzen haengt. Die fuenf Punkte Unterschied liegen bei n=40 im
Rauschen (Standardfehler rund 8 Punkte). Die Frage bleibt damit offen, aber sie
ist jetzt praeziser: **eine Breitenstrategie braucht eine eigene Regel, nicht
einen Sparfaktor.** Der Stil bleibt als Schalter drin, damit der naechste
Versuch nicht bei null anfaengt.

**Die Siegquote ist erwartungsgemaess gestiegen** (70 % bei voller
Freischaltung), weil der Bot endlich kauft, was er kaufen sollte.
`GRUNDHAERTE` wird deshalb NICHT hier nachgezogen, sondern gesammelt nach
Phase 66 — sonst kalibrieren fuenf Phasen denselben Knopf gegeneinander.

`node dev/sim.js` 443/443.

Worktree `/home/viktor/tensura/worktree/phase-64-oekonomie`, Branch
`phase-64-oekonomie`.
### Phase 65 (2026-08-04): Beide Verdachte waren Messfehler

Zwei offene Punkte, und der Plan verlangte fuer beide ausdruecklich, ERST die
Messung zu pruefen und nicht wieder an Zahlen zu drehen. Gut so — es war
zweimal die Messung.

**A) Der Heilungs-Eimer hat nie einen Heilungs-Build gemessen.** Bis hierher
wanderte jeder Run in GENAU EINEN Eimer: den Build mit der groessten Summe aus
Quellen und Verstaerkern. Diese Zuordnung ist aus zwei Gruenden wertlos:

1. **Ein Trupp hat mehrere Builds gleichzeitig.** Sechs Einheiten erfuellen die
   Huerde im Schnitt fuer 3,7 Schluesselwoerter. Die Zuordnung war also kein
   „wofuer hat sich der Trupp festgelegt", sondern ein argmax.
2. **Und dieses argmax lief ueber ungenormte Zaehlerstaende.** Heilung kommt im
   Mittel auf 9,8 Teile, Schild auf 7,2, Frost auf 3,4 — Heilung gewinnt den
   Vergleich strukturell. Wo Heilung und Schild BEIDE als Build dastanden (256
   von 500 Runs), nahm Heilung den Eimer 165 : 70. Der Schild-Eimer war damit
   im Wesentlichen „Schild ohne Heilung", und **der Abstand von 69 zu 35
   Punkten war der Abstand zwischen diesen beiden Resten, nicht zwischen zwei
   Builds.** Die Frage aus dem Plan — was einen festgelegten Heilungstrupp von
   einem festgelegten Schildtrupp unterscheidet AUSSER dem Schluesselwort —
   hatte die Antwort: nichts. Es waren nie zwei verschiedene Truppsorten.

Dazu trugen die Eimer die Sterbetiefe mit (Heilung Ø 14,4 Knoten, Schild 12,5);
die Siegquote mass zur Haelfte, wie lange der Run ueberhaupt lief.

Jetzt zaehlt ein Run **in jeden Build, den er hat**, nur Runs nach Akt 1 werden
gewertet, und die Tabelle weist den **Abstand zur Grundgesamtheit** aus statt
einer rohen Quote. Damit muss auch die Ausreisser-Regel wechseln: bei
ueberlappenden Eimern liegt jede Quote nahe am Feldmittel, das alte Band
25–75 % wuerde nie wieder anschlagen. Gemeldet wird jetzt ein Abstand ueber
12 Punkten.

Das neue Bild (60 Runs, Grundgesamtheit 59 %):

| Build | Quote | Abstand |
|---|---|---|
| tempo | 78 % | **+19** |
| heilung | 67 % | +8 |
| chaos | 65 % | +6 |
| schild | 60 % | +1 |
| frost | 53 % | −6 |
| konter | 47 % | **−12** |

**Heilung ist kein Ausreisser mehr, und Konter hat das Vorzeichen gewechselt.**
Konter stand seit Phase 12 als 82-%-Ausreisser im Plan, zwei Runden Trimmen
haben ihn um null Punkte bewegt — er war die ganze Zeit der schwaechste Build
und hat nur den Eimer der Trupps geerbt, die weit kamen. Neu auffaellig ist
tempo. Beide Zahlen gehoeren mit dem grossen Lauf bestaetigt, n ist hier klein.

**B) Der Unterstuetzer-Rollenzweig ist geloescht.** Die Regel „Unterstuetzer
heilen, wenn gerade keine Faehigkeit bereit ist" nahm 81 % aller
Unterstuetzer-Zuege. Instrumentiert ueber 150 Runs: 31.776 Zuege, davon 24.641
ohne bereite Faehigkeit — aber in **20.251 davon stand der ganze Trupp auf
vollem Leben**, der Zweig tat also nichts. Und er fiel **kein einziges Mal**
ein, waehrend jemand wirklich verwundet war: unter 85 % greift die
`wenn`-Bedingung der Signatur, und die heilt um ein Vielfaches mehr. Uebrig
blieben 4.390 Heilungen im Band zwischen 85 und 100 % Leben — 11 aufgefuellte
Lebenspunkte je Ausloesung, der Rest Ueberheilung.

Also die erste der beiden Antworten aus dem Plan: totes Gewicht, geloescht. Der
Unterstuetzer schlaegt jetzt zu, wenn niemand Heilung braucht. Siegquote 51 →
50 %. Der Glossartext beschrieb den geloeschten Zweig woertlich und sagt jetzt,
was das Spiel tut.

**Ein Test hing an dem toten Zweig.** „Das Todesurteil wartet auf ein
angeschlagenes Ziel" liess Gobwa allein gegen einen Troll antreten — und sie
hielt nur durch, weil sie sich ueber genau diesen Zweig selbst heilte. Ohne ihn
stirbt sie, bevor der Troll unter die Haelfte faellt, und der Test misst
schweigend nichts (0× spaet, 0× frueh). Der Troll schlaegt jetzt nicht mehr zu;
damit trennt der Test die Wartebedingung von Gobwas Zaehigkeit. `node
dev/sim.js` 443/443.

Worktree `/home/viktor/tensura/worktree/phase-65-messung`, Branch
`phase-65-messung`.

### Phase 66 (2026-08-04): Die Seltenheit sagte nichts über die Stärke

Drei alte Punkte aus `TODO.md`, alle drei Nutzer-Beobachtungen statt
Messbefunde. Der erste war der eigentliche Brocken.

**Das Werkzeug zuerst: `dev/beute.js`.** Ausrüstung und Relikte lassen sich
nicht über Schadenssummen vergleichen — härtere Treffer verkürzen den Kampf,
die Summe ist nicht monoton (der Fehler aus Phase 34). Gemessen wird deshalb
gegen zwei Prüfstände: „Zustand" trägt Gift-, Brand- und Frostquellen, „Wacht"
trägt Schild, Konter und Heilung; gewertet wird der bessere von beiden, denn ein
Spieler kauft ein Stück für die Trägerin, zu der es passt.

Der Bruchpunkt aus `dev/linien.js` taugte dabei nur als Referenz, nicht als
Messwert: die binäre Suche gibt ihn gequantelt zurück, dutzende Stücke lasen
denselben Wert, die Rangfolge war eine Treppe mit drei Stufen. Jetzt wird der
Bruchpunkt **einmal je Prüfstand** gesucht und alles Weitere als **Siegquote an
genau dieser Härte** gemessen — dort ist die Kurve am steilsten, und ein Stück
kostet einen statt neun Läufen.

**Der Befund bestätigt die Beschwerde.** Mittelwerte je Stufe:

| Stufe | n | Ø Gewinn |
|---|---|---|
| üblich | 3 | +12 Pkt |
| ungewöhnlich | 4 | **+21 Pkt** |
| selten | 12 | **+16 Pkt** |
| episch | 11 | +21 Pkt |
| legendär | 2 | +23 Pkt |

Die Kurve steigt nicht: „ungewöhnlich" schlägt „selten" um fünf Punkte, und von
„ungewöhnlich" bis „legendär" liegen zwei Punkte. Die Raritätsstufe steuerte
Angebotshäufigkeit, Preis und Farbe — aber nicht die Stärke. Acht Stücke sind
umgestuft, die ≥ 2 Stufen danebenlagen (Plattenpanzer und Bollwerkstein hoch,
Frostkette, Segensring und Zorngurt runter, Ordnungsreif auf legendär). Die
übrigen bleiben: 28 Stufen nach der Lesung eines Prüfstands zu setzen wäre
dasselbe Überanpassen, vor dem der Plan seit Phase 8 warnt.

**Zwei tote Zugriffe, gefunden durch die Messung.**

1. **Die Zwillingsklinge gab seit jeher +0.** Sie zählte
   `c.self.effects.filter(e => e.art === 'passiv')` — ein Feld, das an einer
   gebauten Einheit nicht existiert; `art` trägt nur die Bibliothek in
   `abilities.js`. Dieselbe Sorte toter Zugriff wie `zaeherBrand` in Phase 25,
   nur **lesend statt schreibend** — und darum vom Wächter-Test aus Phase 27
   nicht erfasst, der nur prüft, ob gesetzte Felder gelesen werden. `resolve`
   legt jetzt `passivZahl` ab, nach dem Muster von `itemZahl` (Kurobe,
   Phase 15).
2. **Der Prüfstand war blind für genau diese Sorte Ausrüstung.** Nach der
   Reparatur mass die Zwillingsklinge immer noch +0 — weil `bau()` frische
   `member` baute, und die haben **keine gewählten Passiven**. Ein Prüftrupp
   ohne Passive kann kein passiv-abhängiges Stück bewerten. Die Prüflinge
   bekommen jetzt je Linie die erste Passive, soviele wie der Rang trägt.
   *(Nachtrag Phase 67: diese Reparatur hat nie gegriffen — sie fragte
   `R.hatLinien(id)` mit einer Id, und die Funktion erwartet das Member. Der
   Zweig war immer falsch, der Prüftrupp blieb ohne Passive. Die
   Stufen-Mittelwerte unten stammen deshalb sämtlich aus einem blinden
   Prüfstand.)*
   **Der zweite Fehler hätte den ersten verdeckt**, wenn ich die Messung nach
   der Reparatur nicht wiederholt hätte.

**Die zwei kleineren Punkte:**

- **Der erste Knoten ist immer ein Kampf.** `STEPS[0]` bot `['kampf', 'kampf',
  'event']` an — ein Run konnte mit einem Ereignis beginnen, und der Einstieg
  (das 1-gegen-1-Duell aus Phase 11) fiel dann ganz aus. Jetzt dreimal `kampf`.
  Eine Wahl bleibt es: welcher Kampf, verrät der Knoten seit Phase 12 ohnehin
  nicht.
- **Relikte schalten doppelt so schnell frei**, zwei je Run statt einem. Es gibt
  mehr Relikte als Einheiten, und ein Relikt ist der kleinere Zugewinn.

**Offen:** die Stufen-Mittelwerte oben stammen aus dem Lauf VOR der
Prüfstand-Reparatur. Sie sind für die grobe Aussage gut genug — die Kurve ist
flach —, aber die Zahlen einzelner passiv-abhängiger Stücke gehören neu gelesen.
`node dev/sim.js` 443/443.

Worktree `/home/viktor/tensura/worktree/phase-66-beute`, Branch
`phase-66-beute`.

### QA nach den Phasen 62-66 (2026-08-04): eine gesammelte Kalibrierung

Die fuenf Phasen wurden bewusst OHNE eigene Balance-Messung gebaut und erst am
Ende gemeinsam kalibriert — sonst haetten fuenf Zweige denselben Knopf
gegeneinander eingestellt. Zusammengefuehrt auf `integration-62-66`; die
Konflikte lagen ausschliesslich in `PLAN.md` und wurden als Vereinigung
aufgeloest.

`node dev/sim.js` 443/443 · `node dev/uitest.js` 104/104.

**`GRUNDHAERTE` 1.01 → 1.085.** Der Merge hob die Siegquote auf 57 %, im
Wesentlichen durch Phase 64 (der Bot kauft endlich die teuren Einheiten).
Gemessen ueber je 300 Runs: 1.045 → 57 %, 1.06 → 52 %, 1.075 → 52 %,
1.09 → 48 %. Steht auf 1.085.

Ergebnis `dev/balance.js 500`: **48 % frisch**, 65 % voll freigeschaltet.
Bedrohungsleiter (je 150) **41/35/32/31/27/14 — monoton.**

Der Anfaenger/Veteran-Abstand ist von 12 auf 17 Punkte gewachsen. Das ist die
erwartete Folge von Phase 64: teure Einheiten sind jetzt kaufbar, und teure
Einheiten sind ueberwiegend die freigeschalteten. Ob 17 Punkte zu viel sind,
ist eine Design-Frage, keine Fehlfunktion.

**Drei Auffaelligkeiten, offen und ausdruecklich nicht nachgezogen:**

1. **Geld, der Orklord steht bei 27 %**, waehrend die uebrigen sieben Bosse
   zwischen 53 und 80 % liegen. Phase 14 hatte ihn von 89 % heruntergezogen,
   indem sein Fleischwall nur noch halb so viel heilt und sein Angriff mit
   jedem erlittenen Treffer waechst — diese Skalierung traegt jetzt zu weit. Er
   ist der einzige Boss ausserhalb des Bandes und der naechste offensichtliche
   Eingriff.
2. **Der Schatten-Build gewinnt 100 % von 28 Runs**, bei Ø 16,0 Knoten — also
   kein einziger Fehlschlag. Das ist der hoechste Abstand, den die neue
   Auswertung je gemeldet hat (+36). n ist klein, aber 28 von 28 ist kein
   Rauschen. Gezielt nachmessen, wie Phase 30 es bei Frost getan hat, statt an
   Zahlen zu drehen.
3. **`verderbnis` erschien im ersten Lauf mit −41 bei n=13** und im zweiten gar
   nicht mehr. Ein Eimer, der zwischen zwei Laeufen verschwindet, ist zu duenn
   fuer eine Aussage.

Der Merge liegt auf `integration-62-66` und ist NICHT auf `main`.


### Phase 67 (2026-08-04): Die Seltenheit sagt jetzt die Stärke

Phase 66 hatte gemessen, dass die Raritätsstufe nichts über die Stärke sagt,
aber nur acht Stücke umgestuft. Hier vollständig — und erst, nachdem der
Prüfstand wirklich funktionierte.

**Der Prüfstand war zum dritten Mal kaputt.** Phase 66 hatte ihn repariert:
Prüflinge sollten Passive bekommen, weil ein Trupp ohne Passive keine
passiv-abhängige Ausrüstung bewerten kann. Die Reparatur fragte
`R.hatLinien(id)` — mit einer **Id**, während die Funktion das **Member**
erwartet (`AB.linien[m.id]`). Mit einem String liest sie `AB.linien[undefined]`
und ist immer falsch. Der Zweig lief nie, der Prüftrupp blieb ohne Passive,
und sämtliche Stufen-Mittelwerte aus Phase 66 stammen aus einem blinden
Prüfstand.

Damit sind es drei Schichten desselben Fehlers, jede von der darüber verdeckt:

1. Die Zwillingsklinge las `e.art === 'passiv'` — ein Feld, das an einer
   gebauten Einheit nicht existiert. Sie gab seit jeher +0.
2. Der Prüfstand konnte das nicht sehen, weil seine Einheiten keine Passiven
   hatten.
3. Die Reparatur von Punkt 2 war selbst kaputt.

Erst nach Punkt 3 misst die Zwillingsklinge, was sie tut — und zwar **+39, das
stärkste Ausrüstungsstück im Spiel** statt des schwächsten. Ihr Wert steigt mit
der Zahl der Passiven, also mit dem Rang; im Prüfstand auf Rang A sind das
+15 Angriff und +6 Tempo.

**Auflösung erhöht: 240 Proben statt 60.** Bei 60 liegt der Standardfehler bei
rund 6,5 Punkten, während fast alle Stücke zwischen +12 und +32 lagen —
Nachbarstufen wären ununterscheidbar gewesen, und eine Umstufung darauf hätte
Rauschen kartiert. Bei 240 sind es rund 3.

**Die Regel für die Umstufung: rangerhaltend.** Die Stücke werden nach
gemessener Stärke sortiert und bekommen die Stufen in genau der
Häufigkeitsverteilung zugeteilt, die es vorher gab — gleich viele legendäre,
gleich viele übliche. Damit ist die Stufe per Konstruktion monoton in der
Stärke, ohne dass sich die Ökonomie verschiebt (die Stufe steuert
Angebotshäufigkeit und, bei Ausrüstung, den Preis). Eine Neuvergabe nach festen
Punktebändern hätte dagegen alle Stücke in zwei Stufen gedrängt.

**61 Umstufungen**, 25 bei der Ausrüstung, 36 bei den Relikten. Ergebnis:

| Stufe | Ausrüstung vorher | nachher | Relikte vorher | nachher |
|---|---|---|---|---|
| üblich | +15 | **+9** | +8 | **+2** |
| ungewöhnlich | +16 | **+12** | +9 | **+5** |
| selten | +16 | **+16** | +13 | **+9** |
| episch | +22 | **+24** | +10 | **+13** |
| legendär | +25 | **+33** | +21 | **+30** |

Vorher war die Kurve bei der Ausrüstung in den unteren drei Stufen flach
(15/16/16) und bei den Relikten sogar fallend (selten +13 über episch +10).
Jetzt steigt sie in beiden Tabellen streng.

Die auffälligsten Einzelfälle: **Windstiefel** standen auf „üblich" und messen
+22 (jetzt episch), **Kern des Zorns** auf „üblich" mit +12 (jetzt episch);
umgekehrt lag **Prädatorzahn** auf „legendär" bei +8 und **Taktgeber**
ebenfalls legendär bei +8 (beide jetzt selten).

**Drei Relikte blieben ausdrücklich unangetastet.** Frostbrecher, Zeichen der
Dornen und Zwillingsseele messen +0 — aber sie sind nicht tot, sondern in
diesen zwei Prüfständen **nicht auslösbar**: sie brauchen erstarrte Ziele,
Konter-Fähigkeiten im Trupp beziehungsweise eine verschlungene Fähigkeit.
Nichts davon liefern „Zustand" und „Wacht". Sie aufgrund einer Messung
herabzustufen, die sie gar nicht messen konnte, wäre genau der Fehler, den
diese Phase aufgeklärt hat. Sie behalten ihre Stufe und stehen als offener
Punkt.

**Kalibriert:** die Umstufung hob die Siegquote von 48 auf 54 %, also
`GRUNDHAERTE` 1.085 → 1.13 (gemessen: 1.10 → 56 %, 1.115 → 53 %, 1.13 → 51 %).

`dev/balance.js 500`: **49 % frisch**, 59 % voll freigeschaltet.
Bedrohungsleiter (je 150) **49/39/33/32/29/11 — monoton.**
`dev/sim.js` 443/443 · `dev/uitest.js` 104/104.

Worktree `/home/viktor/tensura/worktree/phase-67-seltenheit`, Branch
`phase-67-seltenheit`.

### Phase 68 (2026-08-04): Die Silhouette bekommt eine zweite Achse

Option D aus `dev/asset-recherche.md`, und zwar bewusst VOR den echten Bildern:
sie kostet einen Nachmittag und beantwortet, ob fuenfzig Einzelbilder ueberhaupt
gepflegt werden wollen. Die Entscheidungen dazu stehen jetzt in `ASSETS.md`
(privat, lokale GPU, Bilder ins Repo, alle Einheiten und alle 72 Gegner).

Bis hierher trug der Platzhalter genau EINE Achse: die Rolle bestimmte Breite
und Waffe, die Seite die Farbe. Auf dem Brett sahen damit ein Oger, ein Slime
und ein Skelett identisch aus, solange sie dieselbe Rolle hatten — und das ist
die Haelfte der Information, die eine Figur tragen soll.

Jetzt formt die **Art** die Silhouette (Tabelle `ARTEN`, zwoelf Eintraege), die
**Rolle** traegt weiter die Waffe. Merkmale: Breite, Kopfform (rund, Schnauze,
Insektenoval, Schaedel, Blob) und Anhaengsel — Hoerner kurz/lang, Ohren
spitz/rund, Schweif, Fluegel, Echsenkamm, Fuehler, Orkhauer.

Zwei Dinge, die beim Bauen wichtig waren:

1. **Der Umriss muss alle Teile mitnehmen.** Die Kantentrennung aus Phase 58 war
   ein breiter Strich unter Koerper und Kopf. Ein Fluegel oder Horn, das nicht
   mitgestrichen wird, haengt ohne Rand im dunklen Brett. `hinten()` und
   `aufsatz()` sind deshalb eigene Pfadfunktionen, die in BEIDEN Durchgaengen
   laufen — erst breit in der Seitenfarbe, dann gefuellt.
2. **Anhaengsel liegen hinter der Figur** und werden mit 75 % Deckkraft
   gefuellt, sonst verschmelzen Fluegel und Rumpf zu einer Flaeche.

**`dev/silhouetten.js`** ist der Pruefstand dazu. Noetig, weil weder
`dev/sim.js` (kein DOM) noch `dev/uitest.js` (jsdom ohne 2D-Kontext) eine
Canvas-Zeichnung ausfuehren koennen; ein Stub-Kontext schreibt die
Zeichenbefehle mit. Er prueft drei Dinge, und das zweite ist der eigentliche
Punkt:

- Jede Kombination aus 12 Arten x 5 Rollen x 2 Seiten zeichnet ohne Fehler.
- **Keine zwei Arten zeichnen identisch.** Ein doppelter Eintrag in der
  Merkmalstabelle faellt sonst niemandem auf — auf dem Brett stuenden zwei Arten
  mit derselben Silhouette, also genau der Zustand, gegen den die Achse gebaut
  ist.
- Jede Art aus `data.js` UND aus `enemies.js` hat einen Eintrag. Der Rueckfall
  auf `mensch` bleibt als Notbremse gegen leere Kacheln, ist aber kein Ersatz
  fuer Pflege. Geprueft: die 72 Gegner verteilen sich auf neun Arten, alle
  vorhanden.

`node dev/silhouetten.js` 201/201 · `dev/sim.js` 443/443 ·
`dev/uitest.js` 104/104. Am Kampf wurde nichts geaendert, eine Balance-Messung
entfaellt.

Worktree `/home/viktor/tensura/worktree/phase-68-silhouetten`, Branch
`phase-68-silhouetten`.

### Phase 69 (2026-08-04): Die Leiter war eine Attrappe

Rueckmeldung aus dem echten Spiel: die fuenf Bedrohungsstufen fuehlen sich zu
aehnlich an, Stufe 5 sei muehelos, und zwischen 0 und 5 sei kaum ein
Unterschied zu merken. Beides trifft zu, und der Befund ist unangenehm genau.

**1. Die Werteschraube war ein Gerucht.** Ueber die GANZE Leiter stieg der
Gegnerfaktor von 0.435 auf 0.458 — **fuenf Prozent von Stufe 0 bis Stufe 5**.
Phase 9 hatte sie bewusst auf 0.012 je Stufe gedrosselt, weil „die Regeln die
Haerte tragen" sollten.

**2. Die Regeln trugen sie nicht — sie bestrafen Verlieren, nicht Spielen.**
Ein Nachzuegler mit halben Werten, ein einzelner Gegner der einmal mit 30 %
aufsteht, zwei Leben weniger: keine dieser Regeln aendert etwas fuer jemanden,
der seine Kaempfe gewinnt. Genau das war die Rueckmeldung.

**3. Zwei Regeltexte beschrieben ein Spiel, das es nicht gab.** Stufe 1
versprach woertlich „jede Begegnung bringt einen Gegner mehr mit" — der Code
gab ihm halbe Werte. Stufe 2 versprach „JEDER normale Gegner steht einmal
wieder auf" — der Code liess nur den vordersten zurueckkommen. Beides waren
Rueckzieher aus Phase 9, weil die Vollversion die Siegquote des BOTS
einbrechen liess (46 → 14 %, bzw. 17 statt 7 Punkte). Die Texte blieben stehen.
Dasselbe Muster wie die Art-Identitaeten in Phase 36: die Beschreibung sagte,
was gemeint war, der Code etwas anderes — und der Spieler liest die
Beschreibung.

**Und das ist der eigentliche Befund dieser Phase: ich habe fuenf Phasen lang
gegen einen Bot kalibriert, der schwaecher spielt als der Mensch.** Bei den
alten Werten mass `dev/balance.js` fuer Stufe 5 elf Prozent Siege — waehrend
dieselbe Stufe von Hand muehelos zu gewinnen war. Jede Ruecknahme in Phase 9
wurde damit begruendet, dass der Bot einbricht. Der Bot ist ein gutes
Messinstrument fuer Monotonie und fuer Ausreisser, aber er ist **kein Massstab
fuer die Schwierigkeit.**

**Umgesetzt:**

- **Werteschraube 0.012 → 0.032** je Stufe. Der Gegnerfaktor laeuft jetzt von
  0.435 auf 0.522, also +20 % statt +5 %.
- **Ueberzahl:** Nachzuegler von 0.5 auf 0.75 der Werte. Ein Ziel mehr im Log
  war keine Ueberzahl.
- **Nachschub:** JEDER Gegner steht einmal auf, nicht nur der vorderste. Damit
  ist es die Stufe, auf der geballter Schaden zaehlt und Nadelstiche zweimal
  abraeumen muessen — also das, was der Text immer schon behauptet hat.
- **Sturmgott:** fasste bisher nur Bosse an, auf 14 von 16 Knoten war Stufe 5
  identisch mit Stufe 4 plus zwei Leben weniger. Jetzt schlagen ALLE Gegner
  12 % schneller zu; die Boss-Eskalation kommt beim Boss obendrauf. Der Text
  versprach „jetzt zaehlt Tempo" — jetzt stimmt er.

**Gemessen** (`dev/balance.js 150 --stufe N`), Bot:

| Stufe | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| vorher | 49 | 39 | 33 | 32 | 29 | 11 |
| nachher | 49 | 33 | 21 | 17 | 11 | 3 |

Vorher lagen die Stufen 2, 3 und 4 bei 33/32/29 — drei Stufen ohne messbaren
Unterschied, was die Rueckmeldung „zu nah beieinander" exakt bestaetigt. Jetzt
sind sie getrennt. Stufe 0 ist unveraendert bei 50 % (400 Runs), `GRUNDHAERTE`
wurde nicht angefasst — die Leiter wurde steiler, das Grundspiel nicht haerter.

**Offen und ehrlich:** wie hart sich das von Hand anfuehlt, kann dieses
Werkzeug nicht sagen. Die drei Stellschrauben stehen bewusst beieinander in
`run.js` (`0.032` im `bedrohungsFaktor`, `NACHZUEGLER`, `STURM_TEMPO`), damit
die naechste Rueckmeldung in einer Zeile beantwortet werden kann.

`dev/sim.js` 443/443 · `dev/uitest.js` 104/104 · `dev/silhouetten.js` 201/201.

Worktree `/home/viktor/tensura/worktree/phase-69-bedrohung`, Branch
`phase-69-bedrohung`.

### Phase 70 (2026-08-04): Die Leiter greift jetzt in den Beutel

Auf Zuruf: je Bedrohungsstufe weniger Magicule. Die Begruendung des Nutzers ist
die richtige und sie deckt eine Luecke in Phase 69 auf — **diese hatte die
Leiter nur auf der KAMPFEBENE steiler gemacht**: mehr Gegner, schneller,
zaeher. Das verlangt einen staerkeren Trupp, nicht bessere Entscheidungen. Ein
knapperer Beutel verlangt beides.

Umgesetzt als `beuteFaktor(run)`, **4,5 % weniger je Stufe** — Stufe 5 bekommt
78 % des Einkommens. Der Faktor greift nur auf EINKOMMEN (Kampfbeute, Lager),
nicht auf Verkaufserloese: die sind Rueckerstattungen, und sie zu kuerzen wuerde
denselben Magicule zweimal besteuern und das Umbauen des Trupps bestrafen statt
das Ausgeben.

**Die Oekonomie ist der mit Abstand steilste Hebel — das war zu lernen.** Der
erste Versuch mit 7 % je Stufe liess die Leiter auf 49/25/12/7/**2/2** fallen:
Stufe 4 und 5 waren nicht mehr zu unterscheiden, also genau der Zustand, gegen
den diese Arbeit laeuft. Der Grund ist Kumulation — 65 % Einkommen ueber 16
Knoten ergibt einen schwaecheren Trupp, der mehr Kaempfe verliert, was wieder
Einkommen kostet. Derselbe Befund wie in Phase 11, als das Zusammenlegen der
Waehrungen die Siegquote auf 4 % schickte.

Deshalb wurden die Kampfschrauben aus Phase 69 zurueckgenommen, damit die
Oekonomie die Arbeit tragen kann:

| | Phase 69 | jetzt |
|---|---|---|
| Werteschraube je Stufe | 0.032 | **0.022** |
| Sturmgott-Tempo | 1.12 | **1.06** |
| Beute je Stufe | — | **−4,5 %** |

**Gemessen** (`dev/balance.js`, 150–400 Runs je Stufe):

| Stufe | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| vor Phase 69 | 49 | 39 | 33 | 32 | 29 | 11 |
| Phase 69 | 49 | 33 | 21 | 17 | 11 | 3 |
| **jetzt** | **50** | **32** | **22** | **17** | **12** | **3** |

Stufe 0 unveraendert bei 50 % ueber 400 Runs, `GRUNDHAERTE` nicht angefasst.
Gegenueber Phase 69 ist die Kurve fast identisch — aber sie entsteht jetzt zu
einem guten Teil aus knappen Magicule statt aus haerteren Gegnern, und das ist
der Unterschied zwischen „staerkerer Trupp noetig" und „bessere Entscheidungen
noetig".

**Weiterhin offen, und ehrlich so:** der Bot misst Monotonie, nicht
Schwierigkeit (Befund aus Phase 69). Ob sich die Leiter von Hand jetzt
gestaffelt anfuehlt, kann nur das echte Spiel sagen. Die vier Stellschrauben
liegen bewusst beieinander in `run.js`: `0.022` im `bedrohungsFaktor`,
`NACHZUEGLER`, `STURM_TEMPO`, `BEUTE_JE_STUFE`.

`dev/sim.js` 443/443 · `dev/uitest.js` 104/104.

Worktree `/home/viktor/tensura/worktree/phase-70-beutestufe`, Branch
`phase-70-beutestufe`.

### Phase 71 (2026-08-04): Sturmgott ist die Oekonomie-Stufe

Auf Zuruf: statt 4,5 % je Stufe (Phase 70) **ein flacher Abzug von 30 % nur auf
Stufe 5**. Die Begruendung des Nutzers trifft einen Konstruktionsfehler von
Phase 70 — 4,5 % sind in keinem einzelnen Kauf zu merken. Ein Drittel ist in
jedem zu merken, und der Schritt von 4 auf 5 bekommt damit eine eigene
Handschrift statt „dasselbe, etwas mehr".

`beuteFaktor(run)` gibt jetzt 0.70 unter Sturmgott und sonst 1.

**Und weil die Beutekuerzung diese Stufe jetzt traegt, ist der Tempo-Aufschlag
aus Phase 69 wieder raus.** Er war dort noetig, weil Stufe 5 sonst auf 14 von 16
Knoten identisch mit Stufe 4 war; jetzt ist er nur noch Ballast auf einer Stufe,
die schon vier kumulierte Regeln mitschleppt. Sturmgott ist damit die
**Oekonomie-Stufe**: ein Drittel weniger Einkommen, drei Leben, doppelt
eskalierende Bosse — die Gegner selbst sind kaum haerter als auf Stufe 4. Das
unterscheidet sie schaerfer von 1 bis 4 als noch ein Werteaufschlag.

**Nebenbefund, und kein kleiner: Kriegsrecht hatte eine tote Klausel.** Ohne die
verteilte Kuerzung lag Stufe 3 gemessen gleichauf mit Stufe 2 (22 % gegen 22 %).
Die Regel verspricht „Raenge kosten mehr" und multiplizierte dafuer `rankCost`
— aber **seit Phase 51 kauft niemand mehr einen Aufstieg**, der Rang kommt mit
der Einheit aus dem Markt. Die Klausel lief zwoelf Phasen ins Leere; sie testweise
von 15 auf 32 % zu erhoehen bewegte exakt null Punkte. Derselbe Fehlertyp wie
die toten Felder aus Phase 25 und 66, nur an einer Regel statt an einer
Faehigkeit. Der Zuschlag sitzt jetzt in `rangPreis` — an der Stelle, an der
heute wirklich bezahlt wird — und betraegt 30 %. Gemessen faellt Stufe 3 damit
von 22 auf 12 %.

**Gemessen** (`dev/balance.js`, 200–250 Runs je Stufe):

| Stufe | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| ursprünglich | 49 | 39 | 33 | 32 | 29 | 11 |
| Phase 70 | 50 | 32 | 22 | 17 | 12 | 3 |
| **jetzt** | **49** | **33** | **22** | **12** | **8** | **0** |

**Der Vorbehalt zu Stufe 5 gehoert deutlich hierhin.** 0 % ist keine Zahl, mit
der sich weiterarbeiten laesst. Die Lauftiefe sagt mehr — und sie sagt etwas
Unangenehmes:

| Stufe | Ø erreichte Knoten | in Akt 1 gescheitert |
|---|---|---|
| 3 | 8,5 von 16 | 131 von 200 |
| 4 | 8,2 von 16 | 138 von 200 |
| 5 | **5,6** | **186 von 200** |

Auf Stufe 5 stirbt der Bot nicht am Ende, sondern **am Anfang**. Der flache
Abzug wirkt ab dem ersten Knoten, und ein Run, der mit einer Einheit beginnt,
kommt mit 70 % Einkommen gar nicht erst in Gang — die Kuerzung kumuliert
ueber den ganzen Lauf, statt eine Entscheidung zu verschaerfen. Aus einer
Zermuerbung ist eine **Wand** geworden.

Ob das fuer einen Menschen zutrifft, kann dieses Werkzeug nicht sagen (Befund
aus Phase 69: der Bot misst Monotonie, nicht Schwierigkeit) — und der Bot ist
gerade in der Fruehphase am schwaechsten, weil er ohne Plan kauft. Die
naheliegende Milderung, falls es sich von Hand als Wand anfuehlt, waere, den
Abzug **erst ab Akt 2** greifen zu lassen: dann verschaerft er die
Endspiel-Entscheidungen, ohne den Aufbau zu ersticken. Bewusst nicht
vorweggenommen.

`dev/sim.js` 443/443 · `dev/uitest.js` 104/104.

Worktree `/home/viktor/tensura/worktree/phase-71-sturmgott`, Branch
`phase-71-sturmgott`.

### Phase 72 (2026-08-04): Aufwertung war zugenagelt

Sechs Punkte aus dem echten Spiel, nach einem gewonnenen Run auf Stufe 5. Einer
davon war ein Konstruktionsfehler, der eine ganze Spielweise unmoeglich machte.

**Der kritische Fehler: zwei Regeln an zwei Stellen, die voneinander abwichen.**
`addUnit` kann laengst aufwerten — steht die Art schon im Trupp, raeumt sie die
alte Einheit weg, gibt die Ausruestung zurueck und rechnet den VOLLEN Einsatz
an (Phase 51 hat das eigens so gebaut, samt Messung). `shopOffers` bietet das
auch ausdruecklich an: „Steht die Art schon im Trupp, ist das Angebot eine
Aufwertung — dann muss der Rang darueber liegen." Aber die Marktkarte in
`ui.js` fragte `freieArt` und sperrte den Posten mit „Art schon besetzt".

**Der einzige Weg, eine eigene Einheit hochzubringen, war damit zugenagelt.**
Der Motor konnte es, der Markt bot es an, die Oberflaeche verbot es. Jetzt gibt
es nur noch eine Regel: `kaufbar(run, id, rang)` beantwortet dieselbe Frage, die
`addUnit` beim Kauf stellt, und die Karte weist die Aufwertung ausdruecklich aus
(„ersetzt X, Einsatz wird angerechnet"). Die Sperrmeldung nennt jetzt den echten
Grund — „Rang zu niedrig zum Aufwerten" statt „Art besetzt".

**Der zweite Teil desselben Problems: die Aufwertung wuerfelte neu.**
`wuerfleLinienPassive` zog fuer JEDES Angebot frei aus dem Topf, auch fuer das,
das die eigene Einheit weiterentwickelt. Wer eine Shion mit drei Chaos-Passiven
aufwertete, bekam eine Shion mit drei ANDEREN zurueck. Ein Build ueber mehrere
Raenge war damit nicht spielbar — genau die Rueckmeldung „so kann man keinen
Evolution-Build fahren". Jetzt erbt das Angebot die vorhandenen Passiven und
fuellt nur auf. Geerbt wird ausschliesslich bei DERSELBEN Einheit: ein anderer
Oger ist keine Weiterentwicklung von Shion, sondern ihr Ersatz. Fremde IDs
fallen heraus.

**Kampfbilanz nach dem Sieg.** Wer hat ausgeteilt, wer eingesteckt, wer
geheilt — bis hierher war ein Sieg eine Zahl, und ob der teure Neuzugang etwas
beigetragen hat, erfuhr man nie. Gerechnet wird sie beim Kampf, nicht in der UI:
das Log wandert bewusst nicht in den Speicherstand (Phase 13), die fertigen
Zahlen dagegen schon. Dafuer tragen `survivors` und `fallen` jetzt `dmgDealt`
und `dmgTaken` — die vollen Einheitenobjekte verlassen `simulate` nicht.
Heilung haengt am Empfaenger und nicht am Heiler; statt die Engine umzubauen,
wird das Log an dieser einen Stelle nach `source` ausgezaehlt.

**Schluesselwoerter in den Entwicklungslinien.** Sie standen nur im Tooltip —
man musste jede der sechzehn Passiven einzeln anfahren, um zu sehen, welche
Gift macht und welche Schild. Jetzt Chips, ueberfliegbar.

**Kumulierte Mali statt Fliesstext.** Oben rechts stand der Text der OBERSTEN
Stufe, waehrend die vier darunter weiterlaufen — man las „drei Leben statt
fuenf" und erfuhr nichts von den vier anderen Regeln. `R.mali(t)` liefert die
Liste, **aus den echten Konstanten gerechnet**. Das ist kein Zufall: diese
Sitzung hat dreimal gezeigt, wohin handgepflegte Beschreibungen fuehren — Stufe
1 versprach „ein Gegner mehr" bei halben Werten (Phase 69), Kriegsrecht
versprach teurere Raenge und multiplizierte eine tote Funktion (Phase 71), zwei
Art-Identitaeten standen im Glossar ohne zu existieren (Phase 36). Was hier
steht, kann nicht mehr abweichen.

Dazu die zwei „der Trupp, den du hast"-Saetze aus den Regeltexten entfernt — sie
stimmen seit der Aufwertungs-Reparatur ohnehin nicht mehr.

`dev/sim.js` **458/458** (5 neue Tests: Aufwertung kaufbar, Passiv-Erbe,
Kampfbilanz) · `dev/uitest.js` 104/104 · `dev/silhouetten.js` 201/201 ·
`dev/balance.js 500` 50 % — `GRUNDHAERTE` unveraendert.

Worktree `/home/viktor/tensura/worktree/phase-72-evolution`, Branch
`phase-72-evolution`.

### Phase 73 (2026-08-04): Eine Schreibweise fuer Schluesselwoerter

Rueckmeldung: die farbigen Marken fehlen in den Entwicklungslinien. Zu Recht,
und der Fehler ist meiner aus Phase 72 — ich habe dort `kw-chip` benutzt, weil
es im Signatur-Block schon so stand, statt zu pruefen, womit der REST des
Spiels Schluesselwoerter anzeigt.

Es gab zwei Schreibweisen fuer dieselbe Information:

- `.kw-tag` mit `kw-<wort>` — farbig, mit Glossar-Tooltip. Marktposten,
  Belohnungskarten, Kaempfer. Ueber `tag()` gebaut.
- `.kw-chip` — grau, ohne Tooltip. Nur in den Entwicklungslinien.

Ausgerechnet dort also, wo man Schluesselwoerter **vergleicht**, standen sie in
der stummen Variante. Alle drei Stellen (Kopf, Signatur, Passive) laufen jetzt
ueber `kwTag(k)`, das genau das baut, was `belohnungTags` baut. `.kw-chip` ist
ersatzlos geloescht — Zweitformen ohne Kundschaft sind genau die Sorte
Doppelung, die diese Sitzung mehrfach als Fehlerquelle hatte.

Der Test hing an der alten Klasse und schlug korrekt fehl. Er prueft jetzt drei
Dinge statt einer: farbige Marken im Kopf, farbige Marken an **jeder einzelnen
Passiven** (das war der eigentliche Gewinn aus Phase 72), und dass keine grauen
Chips mehr uebrig sind.

`dev/sim.js` 458/458 · `dev/uitest.js` **106/106** · `dev/silhouetten.js`
201/201. Kein Eingriff am Kampf, keine Balance-Messung noetig.

Worktree `/home/viktor/tensura/worktree/phase-73-labels`, Branch
`phase-73-labels`.

### Phase 74 (2026-08-04): Ein Tooltip an der Bedrohungsanzeige

Rueckmeldung: der alte Tooltip am Warnzeichen soll weg. Beim Nachsehen waren es
zwei Fehler statt einem.

1. **Zwei Tooltips fuer dieselbe Anzeige.** `hudTips()` hing einen festen
   Langtext an das umschliessende `<span>` — also an das ⚠ —, waehrend
   `zeichneHud` die kumulierten Mali an das `<b>` darin setzte. Nebeneinander,
   der aeltere der laengere. Der feste Text ist weg; was gilt, sagen die Mali,
   und wie die Stufe steigt, steht im Menue unter „Fortschritt", wo man sie auch
   umstellt.
2. **Der Mali-Tooltip aus Phase 72 war halb kaputt.** Er setzte nur `data-tip`,
   also den TITEL, und liess `data-tip-text` leer — die ganze Liste stand als
   Ueberschrift. Der Motor liest den Rumpf aus `data-tip-text` (`tip()` schreibt
   beide, ich hatte von Hand nur eines gesetzt). Jetzt getrennt: Titel „Stufe 5 ·
   Sturmgott", Rumpf die Mali-Liste.

Der Tooltip sitzt jetzt am umschliessenden `<span>`, damit auch das Warnzeichen
davor ihn zeigt — es gehoert zur Anzeige, nicht daneben.

Vier neue Tests halten das fest: Rumpf vorhanden, Titel wohlgeformt, der alte
Langtext weg, und am inneren `<b>` haengt kein zweiter Tooltip mehr.

`dev/sim.js` 458/458 · `dev/uitest.js` **110/110** · `dev/silhouetten.js`
201/201. Kein Eingriff am Kampf.

Worktree `/home/viktor/tensura/worktree/phase-74-hudtip`, Branch
`phase-74-hudtip`.

### Phase 75 (2026-08-04): Der Boss zeigt sich erst nach dem ersten Kampf

Rueckmeldung: der Akt-Boss stand auf dem Startbildschirm — also bevor die erste
Einheit gedraftet war. Damit liess sich der ganze Trupp gegen genau ihn bauen,
und ein Run war ein Konter, der vor dem ersten Zug feststand statt einer
Antwort auf das, was kommt.

Er zeigt sich jetzt nach dem ersten Kampf. Bedingung ist `run.step > 0`, und
das braucht **kein neues Feld**: der erste Knoten ist seit Phase 66 immer ein
Kampf, und `step` liegt im Speicherstand — der Boss bleibt also auch nach einem
Neuladen verdeckt. Ab Akt 2 ist ohnehin gekaempft worden.

**Er stand an drei Stellen, nicht an einer.** Die Sperre sitzt deshalb zentral
in `bossVorschau`, nicht an den Aufrufstellen:

1. Startbildschirm — dort ist die Vorschau ersatzlos weg, auch der Platzhalter.
2. Kartenansicht — dort steht jetzt „wer wartet, zeigt sich nach dem ersten
   Kampf", damit die Zeile nicht kommentarlos verschwindet.
3. **Die Wegleiste unter der Kopfzeile**, und die haette ich fast uebersehen:
   sie nennt den Namen am Ende der Knotenreihe und war waehrend des Drafts
   sichtbar. Der Boss-KNOTEN bleibt als Krone stehen — verdeckt ist nur, wer
   dort steht.

Ein Test forderte ausdruecklich das alte Verhalten („der Boss ist sichtbar,
bevor man dort ankommt") und schlug korrekt fehl. Er prueft jetzt beide
Zustaende: Knoten sichtbar und Name verdeckt vor dem ersten Kampf, Name da
danach.

`dev/sim.js` 458/458 · `dev/uitest.js` **112/112** · `dev/silhouetten.js`
201/201. Nur `ui.js` angefasst — `dev/balance.js` laeuft ohne die Oberflaeche,
eine Balance-Messung entfaellt.

Worktree `/home/viktor/tensura/worktree/phase-75-boss`, Branch `phase-75-boss`.

### Phase 76 (2026-08-05): Antichaos ist sichtbar, die Art sperrt nichts mehr

Zwei Rueckmeldungen aus `TODO.md`, beide an derselben Stelle: was das Spiel
tut, stand nicht dort, wo man es sieht.

**1. Antichaos war eine unsichtbare Mechanik.** Es hat einen Glossareintrag,
eine Farbe an der Kampfkarte und rund 40 Faehigkeiten — aber kein einziges
`keywords`-Eintrag. Damit tauchte es nirgends als Tag auf: nicht an Shion,
nicht an Rimuru, nicht am Marktposten. Wer `Realitaetswarp` nahm, sah dem Trupp
nicht an, dass er jetzt eine zweite Mechanik fuehrt.

- `antichaos` steht jetzt an den Faehigkeiten, die es LEGEN (`keywords`), und an
  denen, die die Stapel LESEN (`amplifies` — Ordnungsteufel, Ordnungspanzer,
  Angepasst, Azathoth, Herr der Monster). Beide Seiten braucht es: der Test
  „jedes Schluesselwort mit Quellen hat auch Verstaerker" schlug sonst zu Recht
  an.
- **Fuer die Resonanz zaehlt es weiter als `chaos`** (`Abilities.FOLGT`). Als
  eigene Linie gefuehrt wuerde es Shion und Rimuru spalten: zwei halbe Themen
  statt eines ganzen, und die Resonanzschwelle waere seltener erreicht.
  `Combat.RESONANZ.chaos` sagt woertlich, dass beide dasselbe Rad sind.
- Sichtbar ist es trotzdem an drei Stellen: Tag an Einheit und Marktposten
  (eigene Farbe, nicht mehr die von Chaos), Marke auf dem 2.5D-Brett, und
  Glossareintrag unter den Schluesselwoertern statt nur unter den Zustaenden.
- Die Brettmarken haben nur drei Plaetze, aber jetzt fuenf Kandidaten. Vergeben
  werden sie nach STAPELZAHL statt nach Reihenfolge in der Liste — sonst haette
  ein Brandstapel von 1 einen Antichaos-Stapel von 20 verdeckt.

**2. Die Artsperre ist weg.** „Warum kann ich Shion und Souei nicht gleichzeitig
haben?" — weil beide Oger sind und der Trupp bis hierher genau eine Einheit je
Art zuliess. Als Vielfaltsregel gedacht, im Spiel als Verlust angekommen: der
Markt bot den zweiten Oger als „Aufwertung" an und raeumte den ersten weg.

Gesperrt ist jetzt nur noch dieselbe EINHEIT (`belegteIds`/`freieEinheit` statt
`belegteArten`/`freieArt`). Die Art ordnet weiter ein, woher jemand kommt, und
traegt ihre Eigenheiten (Goblins am Rang, Echsenmenschen an der Kampfdauer,
Insektoiden an der Haeutung) — den Trupp schraenkt sie nicht mehr ein.

**Das hat den Rangaufstieg mitgerissen, und das war der eigentliche Aufwand.**
Seit Phase 51 werden Raenge nicht gekauft, sondern ueber den Markt: eine bessere
Fassung ersetzt die alte. Solange die Art sperrte, war fast jedes Angebot einer
belegten Art automatisch so eine Aufwertung — bei 6 belegten von 12 Arten also
etwa jedes zweite. Ueber die Einheit gerechnet trifft der Wurf die eigenen sechs
von 39 kaum noch: gemessen fielen die Rangstufen von 14,4 auf 10,5 und die
Siegquote von 53 auf **27 %**.

Deshalb ist im Markt ein Platz reserviert statt dem Zufall ueberlassen: alle
Einheiten-Posten bis auf einen gehen an eigene Einheiten, die noch Rang holen
koennen. Der eine freie Platz ist nicht Kosmetik — mit allen Plaetzen als
Aufwertung (kein Zugang mehr) fiel die Quote wieder auf 33 %, mit der Haelfte
auf 35 %.

`GRUNDHAERTE` 1.13 → **1.03**, gemessen 50 % Siege (frisch, n=300). Die Differenz
ist der Preis der Regel: eine schwache Einheit auszutauschen kostet jetzt den
Umweg ueber das Entlassen (ein Viertel zurueck) statt der vollen Anrechnung beim
Artentausch.

Der Trupp-Kopf sagt „jede Einheit nur einmal", die Zeile „Freie Arten: …" ist
ersatzlos weg — bei 39 Einheiten waere sie eine Liste ohne Aussage. Glossar,
`README.md` und `GAMEGUIDE.md` sagen dasselbe wie der Code.

`dev/sim.js` **459/459** · `dev/uitest.js` 112/112 · `dev/silhouetten.js`
201/201. Sechs Tests hingen an der Artregel und pruefen jetzt die Einheitenregel
— darunter einer, der ausdruecklich „eine zweite Goblin-Einheit wird abgelehnt"
verlangte, und ein neuer, der Shion und Souei zusammen in den Trupp stellt.

Worktree `/home/viktor/tensura/worktree/phase-76-antichaos`, Branch
`phase-76-antichaos`.

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
