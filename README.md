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
js/abilities.js  40 Signaturen, 16 Pool-Aktive, 27 Passive
js/data.js       40 Einheiten, 43 Relikte, 24 Ausrüstungen, GLOSSAR (Tooltip-Texte)
js/combat.js     simulate(teamA, teamB, seed, opts) — reine Funktion, kein DOM
js/enemies.js    41 Gegner (mit eigenen Aktiven), 3 Bosse, 36 Begegnungen, 20 Ereignisse
js/run.js        Karte, Ränge, Belohnungen, Shop, Prädator, Speicherstand
js/ui.js         Darstellung; ändert Zustand nur über Run.*
js/main.js       Start
dev/sim.js       144 Selbsttests
dev/uitest.js    UI-Test in jsdom: klickt einen Run durch (46 Prüfungen)
dev/balance.js   spielt N komplette Runs headless und misst die Builds
```

## Entwicklung

```bash
npm install                  # nur für den UI-Test (jsdom); das Spiel selbst hat keine Abhängigkeiten
node dev/sim.js              # Logik-Selbsttests, muss 144/144 sein
node dev/uitest.js           # UI-Test, muss 46/46 sein
node dev/balance.js 600      # Balance, frischer Spieler
node dev/balance.js 600 --voll   # Balance, alles freigeschaltet
```

`combat.js` gibt ein Log zurück und rührt kein DOM an. Deshalb kann `balance.js`
dieselbe Funktion tausendfach headless laufen lassen — bei einem Kombo-Spiel ist
das der einzige Weg, tote und dominante Builds zu finden.

## Balance-Stand

800 Runs mit dem Bot aus `dev/balance.js`. Ein Trupp gilt erst als *Build*, wenn
ein Schlüsselwort zwei Quellen und einen Verstärker hat:

| | Siege | Frost | Gift | Brand | Exekution | ohne Build |
|---|---|---|---|---|---|---|
| frischer Spieler | 46 % | 66 % | 62 % | – | 49 % | 27 % |
| alles freigeschaltet | 52 % | 76 % | 66 % | 69 % | 35 % | 2 % |

Einen Build zu haben ist der stärkste einzelne Faktor im Spiel. Je Run bleiben
8,4 Ladenangebote unbezahlbar — Gold reicht nie für alles.

Schwierigkeit wird nicht an 33 Statblöcken gedreht, sondern am `mult` jeder
Begegnung in `js/enemies.js` — ein Knopf pro Begegnung.

## Was fehlt

- Frost liegt bei voller Freischaltung mit 76 % knapp über dem Zielband (25–75 %).
- Verderbnis-, Schild-, Heilungs- und Konter-Builds kommen zu selten zustande,
  um belastbare Zahlen zu haben.
- Keine Grafik — Textkarten und Balken.
