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

Die neue aktive Fähigkeit wählt der Spieler aus drei Angeboten oder lässt den
Slot frei — dann kann ihn der Prädator füllen. Die Passiven gehören der Einheit
und schalten automatisch auf.

**Aktiv** = feuert im Kampf nach Ablauf der Abklingzeit und ersetzt den normalen
Angriff. Liegt mehr als eine bereit, gewinnt die mit der längsten Abklingzeit —
außer die Fähigkeit trägt ein `wenn(c)`, dann wartet sie auf ihre Lage
(verwundeter Trupp, angeschlagenes Ziel, zwei Gegner). **Passiv** = hängt an
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

Weitere offene Punkte:
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
- 39 Einheiten haben noch keine eigenen Linien; das System steht, der Inhalt
  fehlt. Siehe `TODO.md`.
- Boss-Pool 2 hat nur zwei Einträge — jeder zweite Run endet gegen denselben.

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
