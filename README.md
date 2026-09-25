# Tensura Guild

Roguelite-Truppenbau im Universum von *That Time I Got Reincarnated as a Slime*.
Du stellst einen Trupp zusammen, der von allein kämpft — die ganze Entscheidung
liegt davor: welche Einheiten, welche Fähigkeiten, welche Relikte, wen du in den
Rang treibst und wen du verschlingst.

## Zwei Regeln bestimmen alles

**Jede Einheit nur einmal.** Zweimal Gobta geht nicht, zwei Oger nebeneinander
schon. Die Art (Goblin, Oger, Sturmwolf, Echsenmensch, Insektoid, Dämon, Drache,
Untot, Slime) ordnet nur ein, woher eine Einheit kommt — Völker-Boni gibt es
keine, ein Build entsteht ausschließlich aus Fähigkeiten.

**Rang C → B → A → S.** Einheiten stehen im Markt schon auf ihrem Rang. Jeder
Rang gibt einen Item-Slot, eine weitere Passive und einen Prädator-Slot; wer
eine eigene Einheit auf höherem Rang kauft, behält ihre Passiven und wählt die
neuen Plätze. Rang S gibt zwei Item-Slots statt einem. **Nur eine Einheit darf
Rang S tragen — der Anführer.** Die Frage ist also nicht, wann jemand S wird,
sondern wer.

| Rang | Item-Slots | Passive | Prädator |
|---|---|---|---|
| C | 1 | 1 | – |
| B | 2 | 2 | 1 |
| A | 3 | 3 | 2 |
| S (nur einer) | 5 | 4 | 3 |

## Starten

Kein Build, keine Abhängigkeiten. Zwei Wege:

```
index.html doppelklicken          # file:// genügt
pnpm start                        # http://localhost:3000
```

`pnpm start` legt einen winzigen statischen Server aus Node-Bordmitteln auf
(`dev/serve.js`). Nötig ist er nicht — er ist nur bequemer, weil manche Browser
auf `file://` sparsam mit `localStorage` umgehen.

> **Nicht durch einen Bundler schicken.** Die Skripte in `index.html` laufen
> so, wie sie dastehen: klassische Skripte, die ihre Schnittstelle an `globalThis`
> hängen. Wer `bun index.html` benutzt, startet Buns Dev-Server mit Hot-Reload,
> der daraus ES-Module macht — und meldet dann Fehler aus dem Bundler statt aus
> dem Spiel (`Failed to load bundled module … this is a bug in Bun's bundler`).
> Ein Produktions-Build (`bun build index.html`) funktioniert übrigens, wird aber
> für nichts gebraucht.

## Dateien

```
index.html  style.css
js/vendor/three.min.js  three.js für das 3D-Brett
js/rng.js        deterministischer RNG (mulberry32), Seed = ganzer Run
js/hex.js        Hexgeometrie (achsiale Koordinaten), rein
js/abilities.js  44 Signaturen, 34 Pool-Aktive, 704 Passive (Linien je Einheit + Bibliothek)
js/data.js       39 Einheiten, 52 Relikte, 32 Ausrüstungen, GLOSSAR (Tooltip-Texte)
js/combat.js     simulate(teamA, teamB, seed, opts) — reine Funktion, kein DOM
js/enemies.js    72 Gegner, 8 Bosse, 82 Begegnungen, 40 Ereignisse
js/run.js        Karte, Markt, Ränge, Passiv-Wahl, Prädator, Speicherstand
js/regie.js      macht aus dem Kampflog einen Zeitplan für die Wiedergabe
js/brett3d.js    das Brett in three.js (ohne WebGL ein No-Op)
js/fx.js         Nachbearbeitung: Bloom und Vignette
js/ton.js        prozeduraler Ton (Web Audio), abschaltbar im Menü
js/ui.js         Darstellung; ändert Zustand nur über Run.*
js/main.js       Start
dev/sim.js       499 Selbsttests
dev/uitest.js    UI-Test in jsdom: klickt einen Run durch (141 Prüfungen)
dev/balance.js   spielt N komplette Runs headless und misst die Builds
dev/linien.js    misst je Einheit und Linie, was eine Passive wert ist
dev/beute.js     misst Relikte, Ausrüstung und Passive einzeln
dev/bildcheck.js Abnahme für Figurenbilder (assets/einheiten/)
dev/prompts.js   Prompts und Herkunftszeilen für Figurenbilder
```

## Entwicklung

```bash
pnpm install                 # nur für den UI-Test (jsdom); das Spiel selbst hat keine Abhängigkeiten
pnpm test                    # sim + uitest + bildcheck, alles muss grün sein
node dev/sim.js              # Logik-Selbsttests, 499/499
node dev/uitest.js           # UI-Test, 141/141
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

6000 Runs, frischer Spieler, Bedrohungsstufe 0: **51 % Siege** (Phase 93,
`GRUNDHAERTE` 1.55, der Bot würfelt den Markt neu). Die Starteinheit liegt zwischen 35 und 76 % Siegquote
(„Siegquote je STARTEINHEIT" in `dev/balance.js`). Oben Schatten +14,
Tempo und Dunkelheit +9. Mit allem Freigeschalteten 60 %.

Der Bot stellt seinen Trupp sinnvoll auf (zäh nach vorn) und kauft nach Wert je
Gold. Beides ist nötig, damit die Zahlen kompetentes Spiel abbilden: ohne
Aufstellung verliert derselbe Bot 15 Punkte, ohne Kaufreihenfolge etwa 5.
`--chaos` schaltet die Aufstellung zum Vergleich ab.

Schwierigkeit wird nicht an 33 Statblöcken gedreht, sondern am `mult` jeder
Begegnung in `js/enemies.js` — ein Knopf pro Begegnung.

## Bedrohungsstufen

Nach dem ersten Sieg geht Stufe 1 auf, danach jeweils die nächste. Jede zieht
eine andere Schraube an, nicht nur die Gegnerwerte:

| Stufe | Name | Was dazukommt (kumulativ) | Siegquote des Bots |
|---|---|---|---|
| 0 | Jura-Wald | – | 53 % |
| 1 | Überzahl | ein Gegner mehr je Begegnung | 44 % |
| 2 | Nachschub | normale Gegner stehen einmal mit 30 % Leben wieder auf | 32 % |
| 3 | Kriegsrecht | zwei statt vier Einheiten im Markt, 30 % teurer | 16 % |
| 4 | Belagerung | im zweiten Akt Eliten auf jedem zweiten Kampfknoten, Lager −15 % | 11 % |
| 5 | Sturmgott | 15 % weniger Magicule, 4 Leben statt 5, Bosse eskalieren doppelt | 3 % |

Gemessen mit `node dev/balance.js 400 --stufe N` (Stufe 0 mit 6000 Runs).

Jede Stufe verlangt einen anderen Trupp, nicht nur einen stärkeren. Der Bot
spielt zudem nur mittelmäßig — für einen Menschen liegt jede Stufe höher.

## Was fehlt

- Die Starteinheit wiegt noch schwer: 35 bis 76 % Siegquote je Start.
- Der Bot in `dev/balance.js` spielt Aufstellung und Ausrüstung stur; wie viel
  ein guter Spieler mehr herausholt, misst er nicht. Eine Breitenstrategie
  (vier auf B statt eine auf S) misst er ebenfalls nicht.
- Echte Figurenbilder: das Werkzeug steht (Phase 77), `assets/einheiten/` ist
  noch leer — das Brett zeigt prozedurale Silhouetten.
