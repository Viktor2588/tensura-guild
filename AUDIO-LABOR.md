# Audio-Labor — Branch `test/audio-varianten`

**Dieser Branch gehört nicht nach `main`.** Er existiert, um die 21 offenen
Audio-PRs einmal anzuhören und danach zu entscheiden. In `main` gilt `PLAN.md`
Abschnitt 6: das Spiel bekommt keinen Ton, weder als Datei noch prozedural.

## Warum es diesen Branch gibt

Zwischen dem 2. und dem 15. August hat eine geplante Routine einundzwanzig Mal
dieselbe Idee vorgeschlagen und einundzwanzig Pull Requests geöffnet: PR #1–#9
und #12–#23. Jeder von ihnen

- legt ein neues Modul an — elf als `js/audio.js`, fünf als `js/klang.js`,
  fünf als `js/ton.js`,
- hängt sich an dieselbe Stelle in `js/ui.js` (die Replay-Schleife),
- trägt einen Schalter ins Menü ein und
- schreibt seine Schnittstelle unter einen von vier Namen: `Klang`, `Ton`,
  `Sound` oder `SFX`.

Ein gewöhnlicher Reihen-Merge löst das nicht auf. Jeder PR kollidiert mit jedem
anderen in denselben fünf Dateien, und wer die Konflikte der Reihe nach
zugunsten des jeweils neueren löst, hat am Ende genau einen PR im Baum — die
zwanzig älteren wären überschrieben, ohne je geklungen zu haben.

Also liegen hier alle 21 nebeneinander, und Kästchen im Menü entscheiden,
welche davon spielen — einzeln oder mehrere gleichzeitig.

## Anhören

```
npm start        # http://localhost:3000
```

Menü öffnen → Block **Audio-Varianten** → ankreuzen, was mitlaufen soll → einen
Kampf starten. Umhaken geht auch mitten im Kampf; eine abgewählte Variante wird
dabei stummgeschaltet. **Keine** setzt alle Haken auf einmal zurück.
Voreinstellung ist kein Haken — wer den Branch frisch auscheckt, bekommt zuerst
dasselbe stumme Spiel wie in `main`.

Mehrere Haken gleichzeitig sind Absicht: zwei Kandidaten am selben Kampf
nebeneinander zu hören ist der schnellste Weg, sie zu unterscheiden. Sie
klingen dann wirklich übereinander, es wird also keine Variante gedämpft.

> Jede angehakte Variante hält ihren **eigenen `AudioContext`**. Alle 21
> gleichzeitig hat Chromium hier klaglos gebaut, aber Browser deckeln die Zahl
> pro Seite, und wo der Deckel liegt, ist nicht zugesagt. Baut eine Variante
> nicht, nennt die Infozeile unter der Liste sie namentlich — damit das nicht
> wie eine stille Variante aussieht. Zum Vergleichen reichen ohnehin zwei bis
> drei; 21 gleichzeitig sind Lärm, kein Test.

Die Wahl liegt in `localStorage` unter `tensura-audio-varianten` (kommagetrennt)
und überlebt einen neuen Run, aber nicht den Wechsel an einen anderen Rechner.
Sie gehört wie Effektstufe und Tempo zum Gerät, nicht zum Spielstand.

> Der erste Klick auf die Seite entsperrt den Ton. Browser lassen einen
> `AudioContext` erst nach einer Nutzergeste laufen — vorher bleibt es still,
> auch wenn Varianten angehakt sind.

## Wie die Merges gelaufen sind

Alle 21 PR-Branches sind echt gemergt, in der Reihenfolge ihrer Nummern. Die
Konflikte sind nach einer festen Regel aufgelöst:

| Datei | Regel |
|---|---|
| `js/audio.js`, `js/ton.js`, `js/klang.js` | Fassung des PRs, verschoben nach `js/audio-labor/pr-<nr>-<branch>.js` |
| `js/ui.js`, `index.html`, `style.css`, `dev/uitest.js`, `dev/sim.js` | verworfen, durch **eine** gemeinsame Anbindung ersetzt |
| `PLAN.md`, `ROUTINE.md`, `ASSETS.md`, `TODO.md` | beide Seiten behalten (Union) |

Der Verzicht auf die 21 `ui.js`-Fassungen ist der Kern: statt 21 Anbindungen
gibt es eine (`AudioLabor.spiele`), und die verteilt an alle angehakten
Varianten.

## Wie der Umschalter arbeitet

`js/audio-labor/labor.js`. Zwei Dinge musste er lösen.

**Namenskollision.** 21 Module schreiben an `globalThis.Klang` und Verwandte;
nebeneinander geladen bliebe nur das letzte übrig. Jede Variante bekommt
deshalb beim Laden einen eigenen Schirm gereicht statt des echten globalen
Objekts — ein `Proxy`, dessen Lesezugriffe auf das echte globale Objekt
durchfallen (`AudioContext`, `localStorage`) und dessen Schreibzugriffe im
Schirm hängenbleiben. Die Klammer dafür steht im Kopf jeder `pr-*.js`; der
Inhalt darunter ist unverändert.

Gebaut wird eine Variante erst beim Umschalten, nicht beim Laden: 21
`AudioContext` gleichzeitig gibt kein Browser her.

**Vier Bauformen von Schnittstelle.** Die Varianten sind sich nicht einig,
wie ein Kampfereignis hereinkommt:

| Bauform | Aufruf | PRs |
|---|---|---|
| `log` | `spiele(l, beat)` | 5, 7, 8, 12, 20, 22, 23 |
| `ereignis` | `ereignis(l, beat)` | 14, 18 |
| `kampf` | `kampf(l, beat)` | 15 |
| `typ04` | `spiele(l.type, { beat, dmg, maxHp, winner })` | 4 |
| `typ09` | `spiele(typ, kw, staerke, beat)` | 9 |
| `typ21` | `spiele(name)` mit eigenen Namen (`tod` statt `death`) | 21 |
| `einzeln` | je Ereignis eine Methode: `treffer()`, `tod()`, … | 1, 2, 3, 6, 13, 16, 17, 19 |

Die Zuordnung steht als `art` im `KATALOG` und ist aus dem `js/ui.js` des
jeweiligen PRs abgelesen, nicht geraten. Das ist der Punkt, an dem der erste
Anlauf schiefging: PR #4 und PR #21 haben beide eine Methode namens `spiele`,
die aber einen String erwartet. Mit dem Logeintrag gefüttert fällt sie
stillschweigend durch — beide klangen nur noch beim Klicken und sahen dabei
aus, als seien sie einfach leise.

## Prüfen

```
node dev/audiolabor.js     # hängt auch an `npm test`
```

Eine Attrappe der Web Audio API zählt jeden erzeugten Oszillator. Geprüft wird,
dass sich alle 21 registrieren, dass jede ohne Ausnahme baut und unter dem
erwarteten Namen exportiert, dass jede auf ein Test-Kampflog tatsächlich Klänge
erzeugt — und dass nach dem Umschalten die vorherige schweigt.

Der Klickton zählt dabei bewusst **nicht** mit: er läuft bei mehreren Varianten
an der Log-Verteilung vorbei, und mit ihm bestünde der Test auch dann, wenn vom
ganzen Kampf nichts zu hören wäre.

Am Ende steht eine Abdeckungstabelle: auf wie viele der acht Ereignisarten
antwortet eine Variante überhaupt. Das ist kein Bestehen oder Durchfallen,
sondern die Zahl, nach der man beim Anhören sucht — vier von acht heißt, dass
der halbe Kampf stumm bleibt, egal wie gut die vier Klänge sind.

Stand zuletzt: **110/110**, Abdeckung zwischen 4 und 8 von 8.

`node dev/sim.js` 459/459 · `node dev/uitest.js` 112/112 — an Kampflogik und
Balance ist nichts angefasst.

## Wenn das Anhören vorbei ist

Der erwartete Ausgang ist, dass alle 21 PRs geschlossen werden und dieser
Branch mit ihnen verschwindet. Die Entscheidung dazu steht in `CLAUDE.md`
(Abschnitt „Nicht-Ziele") und `PLAN.md` (Abschnitt 6) — beide sind auf
`claude/docs-and-pr-merge-fdoz01` geschrieben und gehören nach `main`, damit
die Routine nicht am 16. August den zweiundzwanzigsten Audio-PR öffnet.

Sollte wider Erwarten eine Variante überzeugen: sie liegt unter
`js/audio-labor/pr-<nr>-*.js` unverändert bereit und lässt sich mit dem
zugehörigen `js/ui.js` aus ihrem PR-Branch als normale Änderung neu aufsetzen.
Der Umschalter selbst gehört dann nicht mit — er ist Prüfstand, kein Feature.
