# Tensura Guild

Roguelite-Truppenbau im Universum von *That Time I Got Reincarnated as a Slime*.
Du stellst einen Trupp zusammen, der von allein kämpft — die ganze Entscheidung
liegt davor: welche Einheiten, welche Fähigkeiten, welche Relikte, wen du in den
Rang treibst und wen du verschlingst.

## Zwei Regeln bestimmen alles

**Eine Einheit je Art.** Goblin, Oger, Sturmwolf, Echsenmensch, Insektoid, Dämon,
Drache, Untot, Slime — von jeder Art steht genau eine im Trupp. Es gibt keine
Völker-Boni; ein Build entsteht ausschließlich aus Fähigkeiten.

**Rang C → B → A → S.** Jeder Aufstieg kostet Magicule und gibt einen Item-Slot,
eine weitere aktive Fähigkeit (aus drei Angeboten gewählt) und schaltet die
nächste eigene Passive frei. Rang S gibt zwei Item-Slots statt einem.

| Rang | Item-Slots | Aktive | Passive | Prädator | Kosten |
|---|---|---|---|---|---|
| C | 1 | 1 (Signatur) | – | – | – |
| B | 2 | 2 | 1 | 1 | 140 ✦ |
| A | 3 | 3 | 2 | 2 | 300 ✦ |
| S | 5 | 4 | 3 | 3 | 560 ✦ |

## Starten

Kein Build, keine Abhängigkeiten. `index.html` im Browser öffnen — auch per
Doppelklick über `file://`.

## Dateien

```
index.html  style.css
js/rng.js        deterministischer RNG (mulberry32), Seed = ganzer Run
js/abilities.js  40 Signaturen, 16 Pool-Aktive, 34 Passive
js/data.js       40 Einheiten, 49 Relikte, 27 Ausrüstungen, GLOSSAR (Tooltip-Texte)
js/combat.js     simulate(teamA, teamB, seed, opts) — reine Funktion, kein DOM
js/enemies.js    48 Gegner (mit eigenen Aktiven), 3 Bosse, 50 Begegnungen, 26 Ereignisse
js/run.js        Karte, Ränge, Belohnungen, Shop, Prädator, Speicherstand
js/ui.js         Darstellung; ändert Zustand nur über Run.*
js/main.js       Start
dev/sim.js       181 Selbsttests
dev/uitest.js    UI-Test in jsdom: klickt einen Run durch (46 Prüfungen)
dev/balance.js   spielt N komplette Runs headless und misst die Builds
```

## Entwicklung

```bash
npm install                  # nur für den UI-Test (jsdom); das Spiel selbst hat keine Abhängigkeiten
node dev/sim.js              # Logik-Selbsttests, muss 181/181 sein
node dev/uitest.js           # UI-Test, muss 46/46 sein
node dev/balance.js 600      # Balance, frischer Spieler
node dev/balance.js 400 --stufe 3   # Balance auf Bedrohungsstufe 3
node dev/balance.js 600 --voll   # Balance, alles freigeschaltet
```

`combat.js` gibt ein Log zurück und rührt kein DOM an. Deshalb kann `balance.js`
dieselbe Funktion tausendfach headless laufen lassen — bei einem Kombo-Spiel ist
das der einzige Weg, tote und dominante Builds zu finden.

## Balance-Stand

800 Runs mit dem Bot aus `dev/balance.js`. Ein Trupp gilt erst als *Build*, wenn
ein Schlüsselwort zwei Quellen und einen Verstärker hat:

| | Siege | Schild | Gift | Brand | Frost | Heilung | Exekution | Konter | ohne Build |
|---|---|---|---|---|---|---|---|---|---|
| frischer Spieler | 47 % | 60 % | 56 % | – | – | 46 % | 48 % | 38 % | 2 % |
| alles freigeschaltet | 53 % | 54 % | 69 % | 69 % | 52 % | 56 % | 51 % | – | 0 % |

Sieben Builds entstehen regelmäßig, alle im Zielband 25–75 %; ein Trupp ohne
Build gewinnt praktisch nie. Je Run bleiben rund 7 Ladenangebote unbezahlbar —
Gold reicht nie für alles.

Der Bot wählt seinen Weg über die Karte nach einer einfachen Heuristik (kein
Elite-Kampf mit einem Leben, Händler bei vollem Beutel). Ohne die maß er die
Härte der Karte statt die des Spiels.

Schwierigkeit wird nicht an 33 Statblöcken gedreht, sondern am `mult` jeder
Begegnung in `js/enemies.js` — ein Knopf pro Begegnung.

## Bedrohungsstufen

Nach dem ersten Sieg geht Stufe 1 auf, danach jeweils die nächste. Jede zieht
eine andere Schraube an, nicht nur die Gegnerwerte:

| Stufe | Name | Was sich ändert | Siegquote des Bots |
|---|---|---|---|
| 0 | Jura-Wald | – | 54 % |
| 1 | Unruhige Grenze | Gegner +2,5 % | 47 % |
| 2 | Aufmarsch | +5 %, 20 Gold weniger zum Start | 39 % |
| 3 | Krieg | +7,5 %, Ränge kosten 12 % mehr | 28 % |
| 4 | Untergang | +10 % | 20 % |
| 5 | Sturmgott | +12,5 %, Elite und Boss zusätzlich, nur zwei Leben | 10 % |

Die Schritte sind absichtlich klein: die Kurve ist steil genug, dass 20 % mehr
Gegnerwerte fast jeden Run kippen. Der Bot spielt zudem nur mittelmäßig — für
einen Menschen liegt jede Stufe höher.

## Was fehlt

- Verderbnis-, Tempo- und Flächen-Builds entstehen zu selten für belastbare Zahlen.
- Der Bot stellt nie um: Aufstellung und Ausrüstungsverteilung bleiben ungemessen.
- Der Bot in `dev/balance.js` spielt Aufstellung und Ausrüstung stur; wie viel
  ein guter Spieler mehr herausholt, misst er nicht.
- Keine Grafik — Textkarten und Balken.
