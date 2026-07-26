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
- 38 Einheiten haben noch keine eigenen Linien; das System steht, der Inhalt
  fehlt. Siehe `TODO.md`.
- Boss-Pool 1 streut: Clayman 90 %, Milim 40 % gegen denselben Referenztrupp.
  Claymans Selbstheilung war für Boss plus Gefolge entworfen und macht ihn
  allein stehend entweder unkaputtbar oder wirkungslos. Pool 2 liegt bei 61–65 %.

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
