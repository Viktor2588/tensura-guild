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

Die ausführlichen Protokolle bis einschließlich Phase 77 stehen in
[`PLAN-archiv.md`](PLAN-archiv.md) — Messungen, verworfene Wege, Begründungen.
Hier nur das Verzeichnis, damit die Datei beim Lesen klein bleibt; neue Phasen
werden weiter unten in dieser Datei angehängt.

- Stand 2026-07-25
- Balancing-Werkzeug: was die Messung aufgedeckt hat
- Phase 7 (2026-07-26): zwei Akte, Chaos, wählbare Passive
- Phase 8 (2026-07-26): die Marke, Blutung und Boss-Eskalation
- Phase 9 (2026-07-26): Bedrohungsstufen sind jetzt Regeln
- Phase 10 (2026-07-26): eine Aktive, keine Abklingzeit
- Phase 11 (2026-07-26): Aufbau, eine Währung, Tags
- Phase 12 (2026-07-26): unbegrenzte Stapel, Knotenarten, Herausforderung
- Phase 13 (2026-07-26): Markt statt Belohnungskarte
- Phase 14 (2026-07-26): zufällige Entwicklung, sichtbarer Fortschritt, Bosse
- Phase 15 (2026-07-26): die Oger sind vollständig
- Phase 16 (2026-07-26): die Goblins
- Phase 17 (2026-07-26): der Bruchpunkt, und die Sturmwölfe
- Phase 18 (2026-07-26): die Echsenmenschen, und ein zweiter Messfehler
- Phase 19 (2026-07-26): Schatten, Dunkelheit und Licht
- Phase 20 (2026-07-26): Donner
- Phase 21 (2026-07-29): Linien nach RPG-Vorbildern
- Phase 22 (2026-07-29): Die Bibliothek war unerreichbar
- Phase 23 (2026-07-29): Alle Linien nach dem Vier-Stufen-Aufbau
- Phase 24 (2026-07-29): Keine Stufen mehr
- Phase 25 (2026-07-29): Vier Einheiten nach ihren Leitmotiven
- Phase 26 (2026-07-29): Shions Verwandlung
- Phase 27 (2026-07-29): Stapel-Ausrüstung, Shions Rad, Rimurus Kit
- Phase 28 (2026-07-29): Weniger Wölfe, drei neue Kits
- Phase 29 (2026-07-29): Wolf und Reiter, Diablo in den Schatten
- Phase 30 (2026-07-29): Zweite Träger für Dunkelheit, Frost und Donner
- Phase 31 (2026-07-29): Der Generator ist weg
- Phase 32 (2026-07-29): Shions zwei Schwellen
- Phase 33 (2026-07-29): Zweite Bibliotheksschicht
- Phase 34 (2026-07-29): Neun stumme Einheiten
- Phase 35 (2026-07-29): Orks und Bestienkrieger
- Phase 36 (2026-07-29): Zwei Art-Identitäten, die schon im Glossar standen
- Phase 37 (2026-07-29): Hakuro ohne Rüstungsbruch, Käfergarde gestrichen
- Phase 38 (2026-07-29): Milim ohne Defensive, und zweite Träger für alles
- Phase 39 (2026-07-29): Der Fortschritt ging beim Laden verloren
- Phase 40 (2026-07-29): Namensweihe als Paket, und Zustände, die reagieren
- Phase 41 (2026-07-30): Das Hexfeld
- Phase 42 (2026-07-30): 2.5D — echtes Brett, flache Figuren
- Phase 43 (2026-07-30): Ein größeres Feld, und Effekte je Element
- Phase 44 (2026-07-30): Flächen bekommen eine Form
- Phase 45 (2026-07-30): Schild war ein Vorrat, Heilung eine Rate
- Phase 46 (2026-07-30): Der Bot nahm immer Karte 1
- Phase 47 (2026-07-30): Drei Verdachte gepruefte, drei fast leer
- Phase 48 (2026-07-30): Die Eimer zeigten die falsche Rangfolge
- Phase 49 (2026-07-30): Die Schluesselwort-Rangfolge war eine Reichweiten-Rangfolge
- Phase 50 (2026-07-30): Vollbild-Desktop, kein Handy
- Phase 51 (2026-07-30): Einheiten kommen fertig aus dem Markt
- Phase 52 (2026-07-30): Der Rang ist ein Fenster, keine Verteilung
- Phase 53 (2026-07-31): S bleibt ein Glueckstreffer
- Phase 54 (2026-08-02): Der Takt — aus Wiedergabe wird Regie
- Phase 55 (2026-08-02): Der Einschlag — Treffer bekommen Gewicht
- Phase 56 (2026-08-02): Licht — Bloom und Farbraum
- Phase 57 (2026-08-02): Die Formen — jedes Schlüsselwort bewegt sich anders
- Phase 58 (2026-08-02): Die Figuren leben
- Phase 59 (2026-08-02): Die Kamera lebt
- Phase 60 (2026-08-02): Die Bühne — Stimmung statt Hintergrund
- Phase 61 (2026-08-02): Echte Figuren — die Vorgabe (Bilder offen)
- Phase 62 (2026-08-04): Gegner bekommen Schlüsselwörter
- Phase 63 (2026-08-04): Die Verstaerker-Diagnose war falsch
- Phase 64 (2026-08-04): Es war der Bot, nicht die Preiskurve
- Phase 65 (2026-08-04): Beide Verdachte waren Messfehler
- Phase 66 (2026-08-04): Die Seltenheit sagte nichts über die Stärke
- QA nach den Phasen 62-66 (2026-08-04): eine gesammelte Kalibrierung
- Phase 67 (2026-08-04): Die Seltenheit sagt jetzt die Stärke
- Phase 68 (2026-08-04): Die Silhouette bekommt eine zweite Achse
- Phase 69 (2026-08-04): Die Leiter war eine Attrappe
- Phase 70 (2026-08-04): Die Leiter greift jetzt in den Beutel
- Phase 71 (2026-08-04): Sturmgott ist die Oekonomie-Stufe
- Phase 72 (2026-08-04): Aufwertung war zugenagelt
- Phase 73 (2026-08-04): Eine Schreibweise fuer Schluesselwoerter
- Phase 74 (2026-08-04): Ein Tooltip an der Bedrohungsanzeige
- Phase 75 (2026-08-04): Der Boss zeigt sich erst nach dem ersten Kampf
- Phase 76 (2026-08-05): Antichaos ist sichtbar, die Art sperrt nichts mehr
- Phase 77 (2026-08-05): Der Weg zu echten Figurenbildern

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

### Audio: genau ein Modul, und das ist fertig

Der Abschnitt stand bis hierher auf **kein Ton, auch kein prozeduraler**. Die
Entscheidung ist gekippt, bewusst und einmalig: das Spiel hat jetzt `js/ton.js`
und einen Ein/Aus-Schalter im Menü. Was gilt:

- **Ein Modul**, `js/ton.js`. Keine zweite Ton-Datei daneben.
- **Keine Audiodateien**, weder Musik noch Samples. Jeder Klang entsteht zur
  Laufzeit aus Oszillatoren und gefiltertem Rauschen — dieselbe Linie, die
  `ASSETS.md` für Silhouetten und Himmel zieht: prozedural erzeugtes Material
  hat keine Herkunftsfrage.
- **Abschaltbar**, `#menu-ton`, gemerkt in `localStorage` unter `tensura-ton`.
  Ton ist ein Geräte-Schalter wie die Effektstufe, kein Run-Zustand.
- **Ohne Web Audio ein No-Op.** `Ton.verfuegbar()` sagt nein, jeder Aufruf
  verpufft — dasselbe Muster, das `js/brett3d.js` für fehlendes WebGL fährt,
  damit `dev/uitest.js` in jsdom nicht daran scheitert.

Der alte Einwand bleibt der Maßstab für alles Weitere: das Spiel ist ein
Auto-Battler, in dem die ganze Entscheidung **vor** dem Kampf fällt. Ton
untermalt einen Ablauf, den niemand steuert. Als einmalige Politur ist das
den Aufwand wert gewesen, als laufende Baustelle nicht — Musik, Ambient-Betten,
Mixer, Lautstärkeregler pro Kategorie sind damit **nicht** eröffnet.

Wie es dazu kam: eine geplante Routine hat das Thema zwischen dem 2. und dem
15.8.2026 einundzwanzig Mal vorgeschlagen (PRs #1–#9, #12–#23), jedes Mal mit
demselben Befund. Statt weiter abzulehnen, sind alle 21 auf
`test/audio-varianten` nebeneinandergelegt und angehört worden; PR #3 hat
gewonnen, der Rest ist verworfen. Ein `grep -i audio`, das jetzt `js/ton.js`
findet, ist **kein Befund und keine Einladung** — siehe `CLAUDE.md`,
Abschnitt Nicht-Ziele.

### Phase 78 (2026-08-16): Tote Angebote, tote Passive, tote Daten

Vier Sachen, die alle dasselbe Muster haben: Inhalt, den das Spiel anbietet,
ohne dass er etwas tun kann.

**Verstärker ohne Quelle werden nicht mehr angeboten.** `keywords` legt an,
`amplifies` liest. Shions Ordnungsteufel liest Antichaos, das ein reiner
Chaos-Bau nirgends anlegt — ein Angebot, das der Spieler gar nicht annehmen
KONNTE. `speisbar()` in `run.js` streicht solche Angebote, für den eigenen Topf
wie für die Bibliothek. Gezählt wird der **Trupp** samt Ausrüstung und Relikten,
nicht die Einheit allein: neun Verstärker (Kurobes `Gehärtet`, Albis'
`Auf Distanz`, Orkkriegers `Schlachtruf` …) können ihre eigene Trägerin gar
nicht speisen und leben von den Verbündeten. 532 der 700 Passiven haben kein
`amplifies`, sind also selbst Quellen und bleiben immer im Topf — der Einstieg
in ein neues Thema läuft über sie, Hybride bleiben möglich.

**Die Passiv-Wahl wird gezogen, nicht sortiert.** Hart nach Passung sortiert
standen bei gleichem Bau über alle 40 Seeds dieselben drei Angebote oben; nur
Platz vier zog frei. Die Passung schrieb den Bau fort, statt ihn zu belohnen.
Jetzt: ein Platz für die beste Passung (sonst kann ein Bau nicht mehr zu Ende
gebaut werden — in 4 von 120 Angeboten sah ein Antichaos-Shion sonst kein
einziges Antichaos), die anderen drei gewichtet mit `1 + Passung`.

**Die Aufwertung nimmt mit, was im Kampf erlernt wurde.** `member()` legt eine
leere Einheit an, und das Passiv-Erbe filterte auf die Linien DIESER Einheit —
verschlungene Gegner und Passive aus der geteilten Bibliothek gingen bei jeder
Aufwertung verlustig. Beides bleibt jetzt, und die Marktkarte sagt es auch.

**117 tote Datenzeilen gelöscht.** Die festen `passives`-Listen je Einheit in
`data.js` wurden seit Phase 51 von niemandem mehr gelesen — alle 39 Einheiten
haben Linien, `passivIds` kam nie mehr an ihnen an.

**Milim hat jetzt doch eine Defensivlinie** — Phase 38 ist damit auf Zuruf
zurückgenommen. Die Ansage „sie verteidigt nicht, sie schlägt" hat gestimmt,
aber sie kostete den Spieler in jedem Aufstieg ein Angebot, das alle anderen 38
Einheiten haben. `Drachenhaut` (22 % weniger Schaden), `Zorn statt Schmerz`
(je erlittenem Treffer +7 % Angriff), `Unsterblicher Leib` (Regeneration) und
`Unzerstörbar` (Schadensdeckel gegen halbe Heilung). Gemessen +0.18 Bruchpunkt
auf B und +0.35 auf S — deutlich unter ihren Angriffslinien (+1.36), also
weiterhin nicht ihr Weg, aber kein leerer Platz mehr.

**Fünf Passive waren gemessen negativ.** `dev/linien.js` misst je Linie;
gebraucht wurde je Passive (Wegwerf-Skript, 150 Proben, Auflösung 0.04). Wer
eine Passive wählt, darf davon nicht schwächer werden:

| Passive | vorher | nachher | Was falsch war |
|---|---|---|---|
| `prie_unt4` Herrin der Quelle | −0.26 | +0.00 | `atk = 1` nimmt einen von vier Kämpfern ganz aus dem Kampf. Der doppelte Ertrag (12 → 25 % Leben, 28 → 60 % Heilung) brachte allein −0.22; erst der Preis auf 40 % Angriff hat es gedreht. |
| `knecht_mec4` Unbrechbare Reihe | −0.13 | −0.04 | Die Reihe wächst je eigenem ZUG, der Preis war halbes Tempo — er fraß genau das, wofür er bezahlt wurde. Preis steht jetzt auf dem eigenen Stoß (60 %). |
| `gerudo_unt4` Orkkönig | −0.09 | +0.04 | Dieselbe `atk = 1`-Falle, aber sie ließ sich nicht mit Zahlen lösen: 45 % Leben und 15 % Minderung bewegten exakt nichts. Gerudo ist der schwerste Schläger im Trupp; der Preis steht jetzt auf seiner Ausdauer (heilt nicht mehr). |
| `gerudo_mec4` Alles auf mich | −0.09 | −0.04 | Viertel Angriff für halbe Deckung. Jetzt halber Angriff. |
| `milim_unt4` Bezwingerin | −0.09 | +0.09 | Halbes Leben auf der stärksten Einheit im Trupp. Jetzt ein Drittel. |
| `prie_mec4` Überfluss | −0.09 | −0.04 | Viertel Angriff für halbe Regeneration. Jetzt zwei Drittel Angriff für doppelte. |
| `knecht_ang4` Drachenspeer | −0.04 | +0.00 | Die Antwort skaliert selbst mit `atk`, der Preis halbierte also den Ertrag mit. Jetzt −30 %. |
| `milim_def4` Unzerstörbar | −0.26 | +0.31 | Neu gebaut und beim ersten Messen zu teuer: 35 % Angriff für einen Schadensdeckel. Jetzt halbe Heilung. |

**Der wiederkehrende Fehler ist nicht die Höhe des Preises, sondern die Stelle.**
Dreimal stand er auf genau dem, was die Passive auszahlt — Tempo bei einer, die
je Zug wächst; Angriff bei einer, deren Konter mit `atk` skaliert; Angriff beim
schwersten Schläger im Trupp. `atk = 1` gibt es in drei Passiven
(`prie_unt4`, `shu_unt4`, `gerudo_unt4`); alle drei stehen jetzt auf 40 %.

Fünf Passive bleiben bei −0.04 (`prie_mec4`, `knecht_mec4`, `gerudo_mec4`,
`shu_mec2`, `shu_def1`). Das ist **ein** Gitterschritt der Messung und damit
nicht von Null zu unterscheiden — daran weiter zu drehen hieße, Rauschen zu
tunen. Der Rest von Drachenknecht und Quellenpriesterin liegt flach bei +0.00
bis +0.04: für Einheiten zu Kosten 2 neben Milims Kosten 5 ist das kein Fehler,
sondern ihr Preis. Nicht angefasst.

Offen geblieben ist eine Ebene darüber: `dev/linien.js` misst eine Linie mit
ALLEN vier Passiven zusammen, und dabei stapeln sich die Preise. Gerudos
Mechaniklinie steht so bei −0.17, obwohl keine ihrer vier Passiven einzeln unter
−0.04 liegt. Im echten Spiel wählt niemand vier aus einer Linie — vier aus
sechzehn, über alle Linien. Wer das angeht, sollte zuerst die Messung an das
Spiel angleichen, nicht die Passiven an die Messung.

`dev/linien.js` kennt jetzt `--proben N`. Der Standard von 70 hat einen
Standardfehler von rund 6 Punkten; für das Nachmessen einzelner Einheiten
lohnen 300.

**`onDamaged` feuert NACH dem Treffer.** Wer dort `c.dmg` anfasst, schreibt eine
Passive, die nichts tut — Schadensminderung gehört auf `self.minderung` oder
`self.schadensdeckel`. Ein Scan über alle 700 Passiven zeigt keinen weiteren
Fall; die erste Fassung von `milim_def1` war einer und ist gemessen bei ±0.00
aufgefallen.

### Phase 79 (2026-09-05): Ein Panzer, der Treffer holt statt sie abzunehmen

Worktree `/home/viktor/tensura/worktree/phase-79-bedrohung`, Branch
`phase-79-bedrohung`. Das Schema aus `CLAUDE.md` nennt `/tensura/worktree/…`;
das Wurzelverzeichnis ist auf dieser Maschine nicht beschreibbar, deshalb
derselbe Pfad unter `$HOME`.

Idee 2 aus der Recherche in `TODO.md` — „Bedrohung statt fester Zielwahl", die
älteste offene Zeile der Liste.

**Der Befund war präziser als die Notiz.** Deckung gab es längst, zweimal
sogar: räumlich in `deal()` (wer dem Angreifer näher steht als das Ziel, fängt
ein Drittel ab) und als `koenigsdeckung()` in `abilities.js`. Beide greifen
NACH dem Schlag. Die Zielwahl selbst (`pickTarget`) hing allein an der Rolle
des Angreifers, und „ich ziehe die Treffer auf mich" war eine Ansage ohne Regel
dahinter — der Kommentar an `koenigsdeckung` sagt es selbst: „Gebaut aus
vorhandenen Mitteln."

**`spott` ist eine Chance je Zielwahl, kein Zwang.** Wer sie trägt, zieht den
Angriff mit dieser Wahrscheinlichkeit auf sich; der Rest geht weiter nach
Rolle. Ein Spotter, der alles zieht, löscht die halbe Zielwahl: Fernkampf
träfe nicht mehr die Hinterreihe, der Magier nicht mehr das schwächste Ziel.
Gilt auch für das Laufziel — wer noch nicht heranreicht, läuft auf den Spotter
zu, und das ist genau der Sinn.

**Der Zug allein macht einen Panzer schlechter, nicht besser.** Das war die
Überraschung. Gerudos „Alles auf mich" trug bis hierher drei Preise auf einem
Körper: halber Angriff, die Hälfte aller Treffer der anderen über
`koenigsdeckung`, und mit dem Spott nun auch noch die halbe Zielwahl. Er
schmolz, und danach stand der Trupp ungedeckt in einem Kampf, den sein halber
Angriff ohnehin verlängert hatte. Gemessen an Rang S, 300 Proben, Auflösung
0.02, Mechaniklinie gegen einen gemischten Bau:

| Aufbau von `gerudo_mec4` | Bruchpunkt |
|---|---|
| Königsdeckung 0.5, wie bisher | −0.09 |
| Königsdeckung 0.5 **und** Spott 0.5 | −0.09 |
| Spott 0.5 allein | −0.02 |
| Spott 0.5 und 35 % Minderung | **+0.02** |

Die Passive war also gemessen negativ, seit es sie gibt — die Krücke war nicht
nur unschön, sie hat nie funktioniert. Wer zieht, braucht keine zweite
Umleitung, sondern eine Haut.

**Zweiter Träger: „Der letzte Wall" des Echsenfürsten.** Er deckelt jeden
Treffer auf 13 % seines Lebens — eine Haut, auf die nie jemand geschossen hat.
Mit Spott 0.35 geht seine Defensivlinie von **−0.13 auf +0.07**. Suphias
„Wächterin" bleibt dagegen bei der Königsdeckung: sie ist Verstärkerin, kein
Panzer, und `koenigsdeckung` braucht ihren zweiten Träger — mit Gerudo allein
wäre es eine Mechanik, die in den meisten Runs nicht vorkommt (`dev/sim.js`
prüft das).

**`jagdbefehl` war tot.** `pickTarget` las das Flag, die Debug-Übersicht zeigte
es an, gesetzt hat es nie jemand — ein Leser ohne Schreiber, dasselbe Muster
wie die 117 Datenzeilen aus Phase 78. Gelöscht; die Anzeigezeile zeigt jetzt
den Spott.

#### `dev/linien.js` misst jetzt, was das Spiel anbietet

Der offene Punkt vom Ende der Phase 78. Bisher füllte jede Spalte alle
`rank + 1` Plätze aus DERSELBEN Linie — ein Bau, den das Spiel nicht kennt:
der Aufstieg legt vier aus sechzehn vor. Wer vier aus einer Linie nimmt,
stapelt auch deren vier Preise.

Jetzt: die halben Plätze aus der geprüften Linie — die bezahlte zuerst, denn
sie ist die Identität der Linie —, der Rest reihum aus den anderen dreien. Und
verglichen wird gegen einen ebenso gemischten Referenzbau statt gegen die
nackte Einheit, denn das ist die Frage beim Aufstieg: diese Linie statt einer
anderen. Die Spalte `ohne` bleibt als Grundwert daneben stehen.

**Das kostet Auflösung, und zwar sichtbar.** „Vier Passive statt keiner"
bewegt den Bruchpunkt um Zehntel, „diese Linie statt einer anderen" um
Hundertstel. Auf dem alten 0,09-Gitter steht danach überall `+0.00`. Die Zahl
der Halbierungen hängt deshalb jetzt an `--proben`: 5 bis 120 Proben, 6 bis
250, ab 250 sieben Schritte und damit 0,02. Der Rundumlauf bleibt billig, das
Nachmessen einzelner Einheiten wird teurer — richtig herum, denn der
Rundumlauf sucht Ausreißer und das Nachmessen entscheidet.

Das erste Ergebnis mit dem neuen Maßstab (300 Proben):

```
Einheit       Rang   ohne  gem.   Angriff  Mechanik  Unterst.  Defensiv
Gerudo        B      0.58  0.63  0.65 +0.02  0.65 +0.02  0.65 +0.02  0.63 +0.00
Gerudo        S      1.09  1.15  1.15 +0.00  1.17 +0.02  1.22 +0.07  1.15 +0.00
Echsenfürst   B      0.23  0.52  0.58 +0.07  0.50 -0.02  0.21 -0.31  0.23 -0.28
Echsenfürst   S      0.93  0.98  1.04 +0.07  0.89 -0.09  0.80 -0.18  1.04 +0.07
```

Die Echsenfürst-Zeile auf B ist kein Messfehler, sondern das, was der neue
Maßstab sichtbar macht: auf Rang B gibt es zwei Passiv-Plätze, einer davon ist
in dieser Spalte der bezahlte Keystone. „Der letzte Wall" kostet zwei Drittel
seines Angriffs — auf S, mit vier Plätzen, trägt der Rest das mit (+0.07), auf
B nicht (−0.28). **Ein Keystone ist eine Aussage über den Rang, nicht nur über
die Linie**, und das stand vorher in keiner Spalte. Wer dort weitermacht: die
Unterstützungslinie des Fürsten steht auf beiden Rängen tief im Minus.

#### Was dabei nebenbei aufgefallen ist

**`dev/balance.js` sieht bezahlte Passiven nie.** Beide 600-Run-Läufe zu dieser
Phase — vorher und nachher — waren byte-identisch, 81 % Siege. Der Grund:
über 120 Runs trifft der Bot ganze 6 Passiv-Entscheidungen und davon 0
bezahlte. Einheiten kommen seit Phase 51 fertig aus dem Markt, und
`wuerfleLinienPassive` filtert `!o.preis`; eine Wahl entsteht nur beim
Aufstieg, den der Bot fast nie erlebt. Die vierte Stelle jeder Linie — 156
Passiven, alle Keystones — ist im 600-Run-Lauf unerreichbar. Steht als eigener
Punkt in `TODO.md`; wer es beheben will, muss dem Bot Aufstiege verschaffen,
nicht an der Auswahl drehen.

#### Aufgeräumt in TODO.md

Vier Punkte standen als offen da, die es nicht mehr waren:

- **`GRUNDHAERTE` an der Wurzel prüfen** — Phase 21 hat den Generator-Einheiten
  echte Linien gegeben, danach musste der globale Knopf nicht mehr nachgezogen
  werden. Der Wert steht bei 1.03, nicht bei den befürchteten 1.08.
- **Aufstiegs-Pool bleibt Gegner-Repertoire** — stand selbst schon auf
  „erledigt, anders als geplant".
- **Idee 3, zwei Reihen** — hat sich mit dem Hexfeld erledigt (Phasen 41-44),
  wie der Entwurf im selben Dokument bereits sagt.
- **Idee 5, Kosten und Aufladung** — halb erledigt, halb entschieden.
  *Aufladung* ist ein Nicht-Ziel seit Phase 10 (keine Abklingzeiten, die
  Signatur feuert jede Runde). *Kosten* gibt es seit Phase 51 als `preis`.

### Phase 80 (2026-09-25): Die Aufwertung öffnet die Keystone-Wahl

Worktree `/home/viktor/tensura/worktree/phase-80-keystones`, Branch
`phase-80-keystones` (Pfad unter `$HOME` wie in Phase 79).

**Der Befund aus Phase 79 war kein Bot-Problem.** `dev/balance.js` sah
bezahlte Passiven nie — aber ein Spieler auch nicht. Seit Phase 51 kommen
Einheiten fertig aus dem Markt, `wuerfleLinienPassive` lässt bezahlte Passiven
bewusst weg, und die einzige Wahl mit Keystones öffnete `rankUp`, das nur
`freierRang` aus sechs seltenen Ereignissen aufruft. 156 Passiven, jede vierte
Stelle einer Linie, waren damit toter Inhalt — dasselbe Muster wie Phase 78.

**Die Aufwertung öffnet ihre neuen Plätze als Wahl.** Kauft man eine Einheit,
die schon im Trupp steht, auf höherem Rang, steht am Marktposten nur das Erbe;
die neuen Plätze kommen nach dem Kauf über `passivAngebot` — dasselbe Angebot
wie beim Aufstieg, mit Keystones, Bibliothek und Verzicht. Einer nach dem
anderen (`naechsteWahl`), damit jedes Angebot die Wahl davor kennt. Die
Marktkarte sagt „+ N neue Passiven zur Wahl nach dem Kauf — auch Keystones".
Ein Neukauf bleibt ein fertiges Paket ohne Keystone: aufgedrängt bekommen soll
man eine Regeländerung weiterhin nicht.

Nebenbei: `choosePassive` blieb stecken, wenn die Einheit der offenen Wahl
inzwischen einer weiteren Aufwertung gewichen war — die Wahl verfällt jetzt.

**Gemessen** (300 Runs, frisch): 5790 Passiv-Wahlen, 4608 davon mit Keystone
im Angebot, 5,0 genommene Keystones je Run (vorher 0 in 120 Runs). Die Zeile
steht jetzt fest in `dev/balance.js`. Siegquote 83 → 79 %.

**Nicht kalibriert.** Die Siegquote ist seit Phase 76 von 50 auf 79 %
gewandert, über drei bewusste Eingriffe (siehe `TODO.md`). Zurück auf ~52 %
bräuchte `GRUNDHAERTE` 1.03 → ~1.40 — eine eigene Entscheidung.

`dev/sim.js` 499/499 · `dev/uitest.js` 141/141.

### Phase 81 (2026-09-25): Die Siegquote zurück auf den Sollwert

Worktree `/home/viktor/tensura/worktree/phase-81-kalibrierung`, Branch `phase-81-kalibrierung`.

Seit Phase 76 war die Siegquote (frisch, Stufe 0) ohne Nachkalibrierung von
50 auf 83 % gewandert, über drei bewusste Eingriffe: `59092a3` Einheiten
gleichgestellt (+14), `2aa31ed` alle Einheiten im Starttopf (+13), Phase 78
reparierte negative Passive (+6); Phase 80 brachte −4. Keiner davon ist ein
Fehler, alle heben die Spielerstärke quer über die Builds — genau der Fall,
für den `GRUNDHAERTE` da ist. Auf Zuruf zurück auf den Sollwert.

**`GRUNDHAERTE` 1.03 → 1.41.** Die Kurve ist flach: 1.10 71 %, 1.22 62 %,
1.36 55 %, 1.41 53 %, 1.46 49 % (je 300–600 Runs). Bei 83 % trennte die
Build-Auswertung nichts mehr — jeder Build lag über 88 %. Jetzt wieder:

| | Siegquote |
|---|---|
| Stufe 0 / 1 / 2 / 3 / 4 / 5 | 53 / 41 / 28 / 22 / 18 / 4 % |
| alles freigeschaltet (`--voll`) | 64 % |
| Runs mit Build (604 von 800) | 69 %, ohne Build fast nie |

**Neu sichtbar: Schatten dominiert** (+24 gegen den Schnitt der Builds, 93 %,
n=61), dahinter Tempo, Licht, Exekution, Dunkelheit (+12 bis +14). Unten
Fläche (−7) und Chaos (−5). Steht in `TODO.md`, nicht angefasst.

Der alte README-Punkt „Freischalten macht den Bot schwächer" hat sich
umgedreht (64 gegen 53 %) und ist gestrichen. Das README ist bei der
Gelegenheit auf den Stand gebracht: Dateiliste, Testzahlen, Bedrohungsstufen
als Regeln statt Prozentzahlen.

`dev/sim.js` 499/499 · `dev/uitest.js` 141/141.

### Phase 82 (2026-09-25): Schatten war ein Symptom — Diagnose, kein Eingriff

Worktree `/home/viktor/tensura/worktree/phase-82-schatten`, Branch `phase-82-schatten`.

Auftrag war „Schatten dominiert" (+24 gegen den Schnitt der Builds, 96 %,
n=162 bei 2000 Runs). Ergebnis: **kein Eingriff am Spiel**, weil keiner der
naheliegenden Knöpfe etwas bewegt — dafür eine belastbare Diagnose und zwei
Messwerkzeuge. Alle Zahlen 2000 Runs, frisch, Rauschen etwa ±2 Punkte.

**Die Mechanik ist es nicht.** Ausweichen je Stapel 7 → 5 %, Obergrenze
60 → 35 %: der Schatten-Build bleibt bei 92–96 %.

**Schatten-Builds sind Diablo-Runs.** Verstärker für Schatten tragen nur Diablo
und Ranga; Diablo steht in 133 der 162 Schatten-Builds. Aber auch Diablo ist
nicht einfach zu stark: Angriff 30 → 20, Belial 3 → 1 Dunkelheit, Dunkelheit-
Deckel 60 → 40 % — seine Siegquote im Trupp bleibt bei 90–95 %. Sie misst vor
allem, WANN er gekauft wird. Kausal ist nur das Herausnehmen (`--ohne`):

| ohne | Siegquote (Basis 54 %) |
|---|---|
| Milim | 49 % |
| Diablo | 50 % |
| Ranga | 51 % |
| Carrera, Seelenhexe, Gobta | 52–55 % (Rauschen) |
| Rigurd | 59 % |
| Echsenfürst | 59 % |

**Grundwerte sind nicht der Hebel.** ±20 % auf Leben und Angriff für zehn
Ausreißer (Diablo, Milim, Hakuro, Phobio runter; Rigurd, Gobta, Echsenfürst,
Drachenknecht, Gruftwächter, Rigur hoch) verschieben den Bruchpunkt in
`dev/linien.js` um einen Messschritt und die `--ohne`-Abstände gar nicht.
Zurückgenommen. Die Stärke steckt im Kit.

**Die eigentliche Spannweite ist die Rolle.** Siegquote je Rolle: Magier 69,
Fernkampf 63, Unterstützer 48, Front 47, Verstärker 46 %. Die beiden Einheiten,
deren Fehlen hilft, sind zähe Frontkämpfer mit wenig Schaden. Die naheliegende
Erklärung — die Boss-Eskalation bestraft lange Kämpfe — ist **widerlegt**:
ohne Eskalation (`ENRAGE_CAP = 0`) steigt alles auf 59 %, der Abstand Magier
zu Front bleibt bei 22 Punkten, und ohne Rigurd wird es wieder +5. Übrig
bleibt die Reichweite: Reichweite 3 schlägt ab dem ersten Zug zu, Reichweite 1
läuft erst vier Felder. Nicht gemessen, nächste Spur.

`dev/linien.js` misst eine Einheit allein (Bruchpunkt S von 0.77 bei Rigurd bis
3.00 bei Shion) und unterschätzt damit Unterstützer; als Ziel taugt es nur
innerhalb einer Rolle.

**Neu in `dev/balance.js`:** `--ohne a,b` nimmt Einheiten ganz aus dem Spiel,
und eine Tabelle zeigt die Siegquote je Einheit im Trupp — mit dem Hinweis,
dass sie den Kaufzeitpunkt mitmisst.

### Phase 83 (2026-09-25): Die Starteinheit entscheidet den Run — Diagnose

Worktree `/home/viktor/tensura/worktree/phase-83-frontspott`, Branch `phase-83-frontspott`.

Gestartet als „die Front zieht Treffer" (Grund-Spott für die Front-Rolle).
**Kein Eingriff am Spiel** — vier Versuche ohne Wirkung, dafür die erste
saubere Vergleichszahl zwischen Einheiten. Alle Messungen 6000 Runs, frisch.

**Die Rollen-Tabelle misst den Kaufzeitpunkt, nicht die Rolle.** Grund-Spott
0.15 bis 0.5 für jede Front-Einheit: Front bleibt bei 49–50 %, Magier bei
72–74 %. Gleiche Reichweite für alle: der Abstand schrumpft nur von 22 auf 16
Punkte. Billige Front ist von Anfang an im Trupp, auch in Runs, die früh
sterben; späte Magier-Käufe gibt es nur in langen Runs.

**Die Starteinheit ist der saubere Vergleich.** Der Bot wählt sie fast
gleichverteilt (n≈154 je Einheit). Neue Tabelle in `dev/balance.js`:

| Start | Sieg | Tod in Akt 1 |
|---|---|---|
| Diablo | 94 % | 0 % |
| Milim | 90 % | 3 % |
| Testarossa | 78 % | 5 % |
| … Mitte | ~50 % | ~25 % |
| Suphia | 30 % | 39 % |
| Gruftwächter | 26 % | 56 % |

Was NICHT wirkt (alles zurückgenommen):

- **Grundwerte.** Leben und Angriff je Ausreißer um bis zu ±25 %: Diablo mit
  75 % seiner Werte gewinnt als Start 92 %, Gruftwächter mit +16 % 27 %.
- **Allein-Regel.** Signaturen ohne Schaden schlagen allein zusätzlich zu:
  die schwachen Starter bleiben, die Gesamtquote sinkt 53 → 50 %, weil auch
  allein stehende Gegner und Bosse sie bekommen.
- **Mehr Schild.** ×1,5, mit dem Leben skaliert, beides (2–3× Schild): Gesamt
  bis 60 %, Schild-Resonanz 36 → 46 %, aber Schild-Einheiten bleiben 12 Punkte
  unter dem Rest und Gruftwächter bei 29 %.

**Was wirkt: der Themen-Markt.** `themenWahl` zieht 65 % der Angebote nach den
Schlüsselwörtern des Trupps. Abgeschaltet (Test, nicht übernommen):

| Start | mit Themen | ohne |
|---|---|---|
| Gruftwächter | 26 % | 55 % |
| Gobta | 32 % | 55 % |
| Suphia | 30 % | 52 % |
| gesamt | 53 % | 58 % |

Die Starteinheit legt das Thema des Runs fest, und ein Schild-Thema füllt den
Trupp mit Einheiten, die nicht töten. Die Spitze bleibt davon unberührt
(Diablo 92 %, Milim 84 %, Testarossa 81 % auch ohne Themen) — sie ist
wirklich stark, und zwar im Kit, nicht in den Werten.

Offen, als Entscheidung: Themen-Anteil senken (gemessen wirksam, macht Builds
zufälliger), oder Schild-Einheiten Schaden geben statt mehr Schild; die Spitze
über ihr Kit kürzen.

### Phase 84 (2026-09-25): Der Starter legt den Run nicht mehr fest

Worktree `/home/viktor/tensura/worktree/phase-84-themen`, Branch `phase-84-themen`.

Umsetzung der Diagnose aus Phase 83. Alle Zahlen 6000 Runs, frisch.

**Einheiten kommen gemischt, nicht nach Thema.** `themenWahl` hat drei Aufrufer
— Einheiten, Ausrüstung, Relikte. Einzeln abgeschaltet trägt nur der
Einheiten-Markt den Effekt (Gruftwächter als Start 26 → 58 %, Ausrüstung und
Relikte bewegen nichts). Der Themen-Anteil insgesamt gesenkt (65 → 35 %)
brachte dagegen kaum etwas (26 → 30 %). Also: `waehle` statt `themenWahl` für
Einheiten, Ausrüstung und Relikte folgen weiter dem Thema. Builds entstehen
unverändert, eher häufiger.

**Die Spitze an ihrem Werkzeug gekürzt**, nicht an den Werten (die bewegten in
Phase 83 nichts):

| Einheit | Werkzeug | vorher → nachher | als Start |
|---|---|---|---|
| Milim | Drachenfaust | 260 → 200 % | 81 → 67 % |
| Testarossa | Todesstreich | +15 → +8 % des max. Lebens | 85 → 75 % |
| Diablo | Belial, umnachtet | 12 % max. Leben → 80 % eigener Angriff | 93 → 76 % |
| Diablo | Belial / Umnachtung | 3 → 2 / 5 → 3 Dunkelheit | kaum Wirkung |

Diablos Kern war der Nebensatz: mit all seinen Dunkelheitsquellen ist jedes
Ziel „völlig umnachtet", Belial riss damit jede Runde 12 % des maximalen
Lebens heraus — gegen Bosse dieselbe Wucht wie Testarossa. 6 % ließen ihn noch
bei 89 %; am eigenen Angriff statt am fremden Leben landet er bei 78 %.
**Schaden nach maximalem Leben ist das Werkzeug, das Bosse bricht** — wer es
wieder vergibt, sollte es klein halten.

**`GRUNDHAERTE` 1.41 → 1.45**, gemessen 51 %.

| | vorher | nachher |
|---|---|---|
| Spanne der Starter | 68 Punkte (94–26) | 41 Punkte (76–35) |
| Schatten-Build | +24 | +14 |
| Stufen 0–5 | 53/41/28/22/18/4 % | 51/35/26/17/12/2 % |
| alles frei | 64 % | 58 % |

Die Stufenkurve ist steiler geworden; Stufe 5 mit 2 % ist hart am Rand.

`dev/sim.js` 499/499 · `dev/uitest.js` 141/141.

### Phase 85 (2026-09-25): Ein Anführer — nur eine Einheit auf Rang S

Worktree `/home/viktor/tensura/worktree/phase-85-anfuehrer`, Branch `phase-85-anfuehrer`.

Der älteste offene Designpunkt: der Rang war ein Meilenstein, keine
Entscheidung. Jeder Run, der Akt 2 erreichte, hatte eine Einheit auf A oder S;
höher kaufen lohnte sich immer. Auf Zuruf die kleinste der drei vorgelegten
Regeln (Anführer, Rangbudget, Breite belohnen).

**Höchstens eine Einheit in Trupp und Bank trägt Rang S.** Eine Regel,
`anfuehrer(run, ausser)`, an allen Stellen, an denen S entsteht: `kaufbar`
(Markt und UI), `addUnit`, `rankUp`, der Gratisaufstieg aus dem Lager, der
Rangwurf im Markt (steht ein Anführer, würfelt der Markt kein zweites S) und
der reservierte Aufwertungsplatz (eine A-Einheit wird nicht als tote
Aufwertung angeboten). Dieselbe Einheit darf ihren eigenen Platz behalten —
sie ersetzt sich ja nur. Die Marktkarte nennt den Grund („Nur ein Anführer auf
Rang S — Milim ist es schon"), der Rang-Tooltip erklärt die Regel.

Nebenbei im Glossar korrigiert: Aufwerten hängt seit Phase 76 an der Einheit,
nicht an der Art, und öffnet seit Phase 80 eine Wahl.

**Gemessen** (6000 Runs, frisch): Rangstufen im Trupp Ø 13,9 → 12,0,
Siegquote 51 → 49 %. `GRUNDHAERTE` 1.45 → 1.42, gemessen 51 %. Stufen 0–5:
51/37/25/18/14/3 %, alles frei 60 %, Kaufstil „spitze" 40 %.

Was der Bot NICHT misst: ob „wer wird S?" eine spannende Frage ist. Er kauft
das S-Angebot, das zuerst kommt. Das zeigt erst ein Spieltest.

`dev/sim.js` 506/506 · `dev/uitest.js` 141/141.

### Phase 86 (2026-09-25): Sturmgott bleibt schaffbar

Worktree `/home/viktor/tensura/worktree/phase-86-sturmgott`, Branch `phase-86-sturmgott`.

Stufe 5 lag nach den Phasen 84/85 bei 2–3 %, Stufe 4 bei 13 %. **86 % der Runs
auf Stufe 5 endeten schon in Akt 1** (Stufe 4: 60 %). Die Zutaten einzeln
zurückgenommen, je 1500 Runs auf Stufe 5:

| ohne … | Siegquote |
|---|---|
| (wie bisher) | 2 % |
| Einkommensabzug (−30 %) | 5 % |
| Lebensabzug (3 statt 5) | 4 % |
| doppelte Boss-Eskalation | 2 % |
| fünften Härteaufschlag | 2 % |

Keine Zutat allein trägt den Sprung; es ist die Summe auf einem Trupp, der
schon bei Stufe 4 den Großteil seiner Runs in Akt 1 verliert. Zurückgenommen
sind die beiden Schrauben mit der meisten Wirkung, beide nur halb: **−15 %
statt −30 % Einkommen, 4 statt 3 Leben.** Die Handschrift der Stufe
(weniger Geld, doppelt eskalierende Bosse) bleibt. Gemessen 6 % (3000 Runs).

`dev/sim.js` 506/506 · `dev/uitest.js` 141/141.

### Phase 87 (2026-09-25): Die Ränder der Starter-Tabelle

Worktree `/home/viktor/tensura/worktree/phase-87-raender`, Branch `phase-87-raender`.

Nach Phase 84 lag die Starter-Tabelle zwischen 36 und 76 %. Kleine Eingriffe
am Kit der Ränder, gemeinsam gemessen (6000 Runs, n≈154 je Starter):

| Einheit | Signatur | Start vorher → nachher |
|---|---|---|
| Diablo | Belial 140 → 120 % | 76 → 77 % |
| Testarossa | +8 → +5 % max. Leben | 76 → 71 % |
| Ultima | Seelenzehrung 120 → 100 % | 72 → 72 % |
| Echsenfürst | Bollwerk schlägt mit 100 % zu | 36 → 40 % |
| Carrera | Sprengung 80/120 → 100/140 % | 38 → 40 % |
| Drachenwelpe | Glutatem 130/170 → 150/190 % | 38 → 44 % |
| Suphia | Goldene Wacht 130 → 150 % | 38 → 40 % |
| Gobkyu | Windpfeil 120/170 → 140/190 % | 39 → 43 % |
| Gobwa | Feldverband schlägt danach mit 80 % zu | 39 → 43 % |

Spanne 40 → 39 Punkte, Siegquote 52 %. Unten wirkt es, oben kaum: Diablo und
Ultima bewegen 20 % weniger Signaturschaden nicht. **Oben trägt die Rolle.**
Starter nach Rolle: Magier 67 %, Fernkampf 55 %, Unterstützer 49 %, Front 47 %,
Verstärker 46 %. Getestet, nicht übernommen: Magier auf Reichweite 2 drückt
jeden Magier um 6–9 Punkte (Diablo 69 %), die Spanne aber nur auf 37 — eine
Regeländerung für alle Magier auf beiden Seiten für zwei Punkte. Liegt als
Option bereit, falls Magier als Starter weiter herausstechen.

Gobwa: der Schlag gehört HINTER die Heilung. Davor konnte Gobwa am Konter
sterben, und `c.allies()` war beim anschließenden `reduce` leer.

`dev/sim.js` 506/506 · `dev/uitest.js` 141/141.

### Phase 88 (2026-09-25): Ein Einstieg ohne Wahl, eine Aufwertung ohne Verlust

Worktree `/home/viktor/tensura/worktree/phase-88-einstieg`, Branch `phase-88-einstieg`.

Aus dem ersten Spieltest (3 Minuten):

**„Der erste Kampf sollte keine Wahl sein und schwer zu verlieren."** Der erste
Knoten bot drei Kampfknoten nebeneinander an — eine Wahl ohne Inhalt. Jetzt
steht dort EIN Kampf. Verloren ging er im Schnitt in 3 % der Runs, mit einem
Unterstützer als Start aber in jedem vierten (Seelenhexe 26 %,
Quellenpriesterin 25 %). `EINSTIEG_HAERTE[0]` 0.55 → 0.25: im Schnitt 0,1 %,
schlechtester Starter 5 %. Die Gesamtquote bleibt bei 51 % (6000 Runs).

**„Bei einer Aufwertung sollte die Ausrüstung nicht wegfliegen."** Sie flog in
den Beutel und musste für denselben, nur stärkeren Kämpfer neu angelegt
werden. Jetzt wandert sie mit; der höhere Rang hat mindestens so viele Slots,
was trotzdem nicht passt (alte Stände), geht in den Beutel. Die Marktkarte
sagt es: „Ausrüstung bleibt angelegt". Beim Entlassen landet sie weiterhin im
Beutel.

`dev/sim.js` 512/512 · `dev/uitest.js` 141/141.

### Phase 89 (2026-09-25): Keystones, die sich lohnen

Worktree `/home/viktor/tensura/worktree/phase-89-keystones`, Branch `phase-89-keystones`.

Rückmeldung aus dem Spieltest: „Die Keystones sind unattraktiv." Gemessen
stimmt das auf drei Ebenen.

**Einzeln (Prüfstand wie `dev/linien.js`, Rang S, Keystone statt der Stufe-1-
Passive derselben Linie):** 90 von 156 Keystones machen die Einheit schwächer,
56 deutlich (≤ −0.10). Je Linie: Unterstützung −0.25 (34 von 39 negativ),
Mechanik −0.04, Angriff −0.01, Defensive ±0.00. Die Unterstützungs-Keystones
folgen fast alle einer Formel — „der Trupp bekommt X, die Einheit selbst
schlägt nur noch mit einem Drittel/Viertel" — und haben damit genau den Fehler
aus Phase 78: der Preis sitzt auf dem, was die Einheit auszahlt. Der Prüfstand
übertreibt das allerdings, seine vier Begleiter (Rigurd, Gobwa, Souka,
Sturmwolf) machen kaum Schaden, ein Trupp-Buff hat dort wenig zu verstärken.

**Im ganzen Spiel:** ein Bot, der jeden angebotenen Keystone nimmt, gewann
48 %, einer, der nie einen nimmt, 50 %. Ein Abschluss, der etwas kostet und
nichts bringt.

**In der UI:** die Keystone-Karte war nicht gekennzeichnet. Der Hinweis sagte
„eine davon ändert eine Regel und kostet dafür etwas", welche, stand nirgends
— sichtbar war nur der Nachteil im Text.

Drei Eingriffe:

1. **Milderer Preis bei 25 Unterstützungs-Keystones**: eigener Angriff
   34 → 60 %, 25 → 55 %, 20 → 50 %, Texte mit. Prüfstand −0.25 → −0.17;
   im Spiel 48 → 49 % (immer) gegen 50 % (nie).
2. **Keystone-Prämie**: wer einen Keystone trägt, bekommt +15 % Leben und
   Angriff (`KEYSTONE_PRAEMIE` in `run.js`, angewandt in `resolve`).
   Immer/nie im ganzen Spiel, je 3000 Runs:

   | Prämie | immer | nie |
   |---|---|---|
   | – | 49 % | 50 % |
   | +15 % | 55 % | 50 % |
   | +30 % | 61 % | 50 % |

   +15 %: lohnend, aber kein Pflichtkauf.
3. **Die Karte zeigt ihn**: ★-Marke, Goldrand, „★ Keystone — +15 % Leben und
   Angriff", und der Hinweistext nennt die Prämie.

`GRUNDHAERTE` bleibt bei 1.42 (gemessen 52 %). Die übrigen 131 Keystones sind
nicht einzeln angefasst — die Prämie hebt sie alle. Die schlimmsten Einzelfälle
(Shions „Wille der Herrin" −0.59 ohne jeden Angriffspreis, Soueis Schwarmmal
−0.53, Zegions Mechanik und Defensive) wären der nächste Schritt, falls sich
einzelne im Spiel weiter tot anfühlen.

`dev/sim.js` 515/515 · `dev/uitest.js` 141/141.

### Phase 90 (2026-09-25): Shion schlägt öfter zu, und man sieht ihr Chaos

Worktree `/home/viktor/tensura/worktree/phase-90-shion`, Branch `phase-90-shion`.

Rückmeldung aus dem Spieltest: „Shion fühlt sich sehr schwach an." Gemessen
ist sie das nicht — als Starterin 70 % (Platz 3 von 39), und ohne sie fällt die
Siegquote des Bots von 53 auf 50 %. Was sie schwach WIRKEN lässt:

- **Tempo 18**, das zweitniedrigste im Spiel (Median 27). Sie handelt selten.
- **Ihre Stärke ist unsichtbar.** Chaos würfelt Angriff, Rüstung und Tempo des
  Ziels jede Runde neu und lässt dessen Fähigkeiten verpuffen — das stand nur
  im Kampflog und im Tooltip, nie auf dem Brett.

Auf Zuruf: schneller bei gleicher Stärke, und Chaos sichtbar.

**Schneller.** Der Schaden je Schlag ist bei Shion fast egal — mit Tempo 24
gewann sie als Start 79 % bei 100 %, 120 % und 150 % Signaturschaden gleich.
Ihre Stärke ist das Chaos, das sie bei JEDER Aktion anlegt; mehr Aktionen sind
mehr Chaos. Deshalb wird nicht der Schaden gegengerechnet, sondern die Stapel:

| Tempo | Chaos C/B/A/S | als Start |
|---|---|---|
| 18 | 2/3/4/6 | 70 % |
| 20 | 2/3/4/6 | 74 % |
| 22 | 2/3/4/6 | 76 % |
| 22 | 2/3/3/5 | 71 % |

Übernommen: Tempo 22, Chaos 2/3/3/5. Nachgemessen 67–69 %. Der Text der
Verdorbenen-Signatur stimmte schon vorher nicht (doppelte Menge von 2/3/4/6
wäre 4/6/8/12 gewesen) und nennt jetzt 4/6/6/10.

**Chaos sichtbar.** `Brett3D.schrift(key, text)` legt Text statt einer Zahl
über eine Figur, auf demselben Weg wie die Schadenszahlen. Der Wurf der Runde
steht als „🎲 ⚔ 62 %" über dem Gegner, eine verpuffte Fähigkeit als
„✗ verpufft". Nicht im Browser angesehen — die Tests laufen, das Aussehen
zeigt erst der nächste Spieltest.

`dev/sim.js`: ein Shion-Test verglich den Bonus der Verwandlung exakt mit
2 × Stapelzahl; Stapel können Bruchzahlen sein, das Log rundet. Mit den alten
Werten passte das zufällig, jetzt mit einem Punkt Spielraum.

`dev/sim.js` 515/515 · `dev/uitest.js` 141/141.

### Phase 91 (2026-09-25): Sichtprüfung im Browser, Keystone-Ausreißer

Worktree `/home/viktor/tensura/worktree/phase-91-sichtpruefung`, Branch `phase-91-sichtpruefung`.

**Sichtprüfung.** Die UI-Änderungen der Phasen 85–90 waren nur durch Tests
gedeckt, nie angesehen. Mit Playwright durchgeklickt, Zustände über
`UI.aktueller()` hergestellt. Gefunden und behoben:

- **Chaos-Schrift und Schadenszahl am selben Anker.** Ein Chaosschlag trifft
  und würfelt im selben Takt — beide Texte lagen deckungsgleich übereinander.
  Die Schrift sitzt jetzt über dem Lebensbalken (`schwebe(…, hoehe)`).
- **„Wohin?" über einem einzigen Knoten** (Phase 88). Steht nur einer da,
  heißt es „Weiter".
- **„Kampf / Kampf".** Jeder normale Kampfknoten zeigte Titel und Untertitel
  gleich. Der Untertitel erscheint nur noch, wenn er etwas anderes sagt.
- **„Bleibt bei drei Passiven"** stand fest im Verzicht-Text — seit die
  Aufwertung ihre Plätze als Wahl öffnet (Phase 80), stimmt das nur beim
  Aufstieg auf S. Jetzt die echte Zahl.
- **„◈ Wahl auf Rang S" an einer A-Einheit, obwohl schon ein Anführer
  steht** (Phase 85) — ein Versprechen, das der Markt nicht einlöst. Der
  Hinweis entfällt dann; sein Tooltip beschrieb außerdem noch den Aufstieg
  vor Phase 51 („je eine aus den vier Linien").

In Ordnung waren: die ★-Keystone-Karte, die Anführer-Sperre im Markt samt
Grund, die Chaos-Schrift selbst. Die einzigen Konsolenfehler sind 404 für
`favicon.ico` und die noch fehlenden Figurenbilder. Screenshots vom laufenden
3D-Brett scheitern im Headless-Browser (Zeitüberschreitung beim Auslesen des
WebGL-Bilds); geprüft wurde dort über die DOM-Positionen.

**Keystone-Ausreißer.** Neu gemessen mit Prämie (Phase 89): Schnitt aller 156
Keystones ±0.00, 43 noch ≤ −0.10. Die zehn stärksten Abweichungen angefasst:

| Keystone | Eingriff | vorher → nachher |
|---|---|---|
| Souei „Schwarmmal" | Preis galt bei JEDER Marke (Fehler), jetzt einmal | −0.53 → −0.18 |
| Zegion „Absolute Verteidigung" | Angriff ⅓ → 60 % | −0.48 → −0.09 |
| Zegion „Insektenkaiser" | Angriff 55 → 80 % | −0.48 → −0.26 |
| Zegion „Unbewegter Kaiser" | Tempo ½ → ¾ | −0.35 → −0.09 |
| Shion „Wille der Herrin" | 3 → 5 Antichaos, Schild 30 → 50 | −0.46 → −0.33 |
| Hakuro „Hundert Schnitte" | Leben ½ → 70 % | −0.35 → −0.13 |
| Hakuro „Vermächtnis" | nur noch Rüstung als Preis | −0.35 → −0.09 |
| Ranga „Herr der Stürme" | Angriff ½ → 70 % | −0.35 → −0.17 |
| Ranga „Gewitterfront" | 2 → 1 Donner je Schlag | +1.14 → +0.48 |
| Gruftwächter „Mausoleum" | Frost nur jeden zweiten Zug | +0.96 → +0.39 |

Die beiden Trupp-Keystones bleiben im Minus; der Prüfstand unterschätzt sie,
seine Begleiter machen kaum Schaden. Siegquote 53 % (6000 Runs), keine
Nachkalibrierung.

`dev/sim.js` 515/515 · `dev/uitest.js` 141/141.

### Phase 92 (2026-09-25): Doku aufräumen — PLAN-Archiv, GAMEGUIDE nachziehen

Worktree `/home/viktor/tensura/worktree/phase-92-doku`, Branch `phase-92-doku`.

**`PLAN.md` 252 → 52 KB.** Die Protokolle bis Phase 77 (74 Abschnitte) stehen
unverändert in `PLAN-archiv.md`; hier bleibt die Übersichtstabelle von
Abschnitt 4 und ein Verzeichnis der archivierten Überschriften. Jeder
autonome Lauf liest diese Datei zuerst — sie war zu vier Fünfteln Geschichte.
Zwei Verweise (`abilities.js`, `TODO.md`) zeigen jetzt aufs Archiv.

**`GAMEGUIDE.md` nachgezogen.** Veraltet waren: eine Gold-Währung (seit
Phase 11 weg), „fünf Akte", Rangkosten und „Aufstieg kaufen" (seit Phase 51
kommt der Rang mit der Einheit), „Linien bisher nur Shion und Souei" (alle 39),
Abklingzeiten (seit Phase 10 weg), Stapel-Obergrenzen (seit Phase 12 weg), eine
Gegnervorschau an den Knoten (seit Phase 12 weg), Chaos „nach oben oder unten"
(seit Phase 11 nur nach unten), Einheiten als Freischaltung (seit `2aa31ed` alle
frei), und die Regeln und Zahlen der Bedrohungsstufen. Neu drin: Anführer,
Keystone-Wahl beim Aufwerten, der Einstieg ohne Wahl, die Chaos-Anzeige.

**Im Spiel selbst** stand derselbe Fehler: der Regeltext von Kriegsrecht sagte
„EINE Einheit statt drei, Rangaufstiege 30 % teurer" — es sind zwei statt
vier, und teurer werden die Einheiten.

`dev/sim.js` 515/515 · `dev/uitest.js` 141/141.

### Phase 93 (2026-09-25): Markt neu würfeln

Worktree `/home/viktor/tensura/worktree/phase-93-reroll`, Branch `phase-93-reroll`.

Für Magicule einen frischen Markt derselben Stufe: 50 ✦, jeder weitere Wurf im
selben Markt das Doppelte. `Run.neuWuerfeln`, Knopf „🎲 Neu würfeln — N ✦"
neben „Weiterziehen". Elite- und Bossmärkte bleiben es (`pending.stark`),
gespeichert wird mit.

**Der Befund dahinter: Geld ist nicht knapp.** Ein Bot-Run endet im Schnitt mit
rund 12.600 ungenutzten Magicule — der Markt kann den Ertrag nicht aufnehmen
(sechs Plätze, vier Einheiten je Markt, Ränge nur mit der Einheit). Ein
linearer Neuwurfpreis war deshalb gratis: bei 30, 60 und 100 ✦ würfelte der
Bot gleich oft (9,4 je Run) und gewann 62 statt 53 %. Verdoppelnd wird der
dritte, vierte Wurf eine Frage; übrig bleiben jetzt Ø 9.100.

Der Bot würfelt, wenn er keine Einheit gekauft hat und danach noch eine kaufen
könnte, höchstens zweimal je Markt (`--ohne-neuwurf` schaltet das ab).
`GRUNDHAERTE` 1.42 → 1.55: 53 % mit Neuwurf, 44 % ohne — wer das Werkzeug
liegen lässt, spielt merklich schwächer. Stufen 0–5: 53/44/32/16/11/3 %.

Offen: **Stufe 5 ist wieder bei 3 %** (Sturmgott kürzt das Einkommen und damit
die Würfe). Und der Überschuss selbst — 9.000 Magicule am Ende sind keine
Entscheidung. Der Neuwurf nimmt einen Teil auf, eine echte Senke fehlt.

`dev/sim.js` 521/521 · `dev/uitest.js` 141/141.

### Phase 94 (2026-09-25): Jeder Boss hat eine eigene Regel

Worktree `/home/viktor/tensura/worktree/phase-94-bossregeln`, Branch `phase-94-bossregeln`.

Die acht Bosse ähnelten sich: drei ignorierten die Rüstung, vier trafen mit
einer Chance alle, zwei heilten über Lebensraub. Keiner verlangte einen
bestimmten Bau. Jetzt trägt jeder eine **Boss-Regel** (`BOSS_REGELN` in
`enemies.js`, `regel: true`), die einen Bau bestraft und einen anderen
belohnt, und die Vorschau nennt sie im Text — seit Phase 75 steht der Boss nach
dem ersten Kampf fest, jetzt hat das eine Folge für den Aufbau. Tabelle in
`GAMEGUIDE.md`.

Neu im Kampfkontext: `c.gegner()`, die ganze Gegenseite ohne Umkreis — das
Gegenstück zu `c.trupp()`. `c.foes()` ist raumgefiltert, und die Sturmflut
meint wirklich jeden.

**Ausgeglichen über den Multiplikator je Boss**, nicht über `GRUNDHAERTE`: die
Regeln sollen Bosse unterscheidbar machen, nicht schwerer. Siegquote im Run
(6000 Runs), vorher / nur Regel / Regel und neuer `mult`:

| Boss | vorher | Regel | ausgeglichen | `mult` |
|---|---|---|---|---|
| Charybdis | 61 % | 46 % | 58 % | 1.97 → 1.73 |
| Clayman | 62 % | 61 % | 61 % | — |
| Geld | 49 % | 47 % | 47 % | — |
| Hinata | 73 % | 61 % | 66 % | 1.93 → 1.745 |
| Luminous | 77 % | 69 % | 74 % | 1.00 → 0.94 |
| Milim | 48 % | 34 % | 43 % | 0.91 → 0.81 |
| Razen | 68 % | 50 % | 63 % | 1.15 → 0.98 |
| Roy | 85 % | 93 % | 89 % | 2.23 → 2.37 |
| gesamt | 53 % | 46 % | 52 % | |

`dev/sim.js` 523/523 · `dev/uitest.js` 141/141.

### Phase 95 (2026-09-25): Der Tagesrun

Worktree `/home/viktor/tensura/worktree/phase-95-tagesrun`, Branch `phase-95-tagesrun`.

Der ganze Run hängt an einem Seed (`rng.js`, mulberry32). Ein Seed aus dem
Datum (FNV-1a über „JJJJ-MM-TT") macht daraus einen Tagesrun: dieselben
Startpaare, Märkte und Bosse für alle, die heute spielen. `Run.createTages`
startet mit frischem `newMeta()` und Stufe 0; `speichern()` schreibt den
Wegwerf-Stand nie zurück, und das Laden baut ihn frisch statt aus dem eigenen
Fortschritt. Das beste Ergebnis je Tag steht unter `tensura-guild-tagesrun`.
Knopf im Menü und auf dem Endbildschirm, die Kopfzeile nennt das Datum.

Nebenbei: der Siegbildschirm sagte immer „Milim ist bezwungen" — der letzte
Boss kommt aus dem Pool von Akt 2. Jetzt steht dort sein Name.

`dev/sim.js` 527/527 · `dev/uitest.js` 141/141.
