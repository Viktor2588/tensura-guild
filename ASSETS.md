# Assets

Das Spiel kam bis Phase 41 ohne eine einzige Bilddatei aus. Mit der
2.5D-Ansicht (`js/brett3d.js`) gibt es zum ersten Mal einen Platz für welche.
Diese Datei sagt, wohin sie gehören und woher sie stammen — Herkunft
lückenlos, sonst ist später nicht mehr feststellbar, was benutzt werden darf.

## Fremdcode

| Was | Woher | Lizenz |
|---|---|---|
| `js/vendor/three.min.js` | three.js r149, npm-Paket `three@0.149.0`, Datei `build/three.min.js` | MIT, Wortlaut in `js/vendor/three.LICENSE` |

Bewusst lokal abgelegt statt per CDN: das Spiel läuft offline, und das soll so
bleiben. Bewusst r149 statt neuer: das ist die letzte Fassung mit einem
UMD-Build, der sich per `<script>` einbinden lässt — der Rest des Projekts hat
keinen Bauschritt und soll keinen bekommen.

## Klang

**Keine Audiodatei im Repo, und keine ist geplant.** `js/audio.js`
synthetisiert jeden Ton zur Laufzeit über die Web-Audio-API (Oszillatoren
plus Hüllkurve, gefiltertes Rauschen für Brand und Donner) statt fertige
Sounddateien einzubinden — damit stellt sich die Provenienzfrage dieser
Datei für Klang gar nicht erst: es gibt nichts, das von irgendwoher stammt.
Sollten doch einmal echte Audiodateien dazukommen (Musik, Sprachausgabe),
gehören sie unter `assets/audio/` und eine Herkunftszeile hierhin, nach
demselben Muster wie bei den Figuren unten.

## Figuren

**Stand: es gibt noch keine Bilddateien.** Die Ansicht zeichnet Platzhalter zur
Laufzeit auf ein Canvas (`platzhalter()` in `js/brett3d.js`). Seit Phase 68
tragen sie **zwei Achsen**:

- die **Art** formt die Silhouette (Tabelle `ARTEN`): Breite, Kopfform und die
  Anhängsel — Hörner, Ohren, Schweif, Flügel, Kamm, Fühler, Hauer. Zwölf
  Einträge, einer je Art in `data.js` und `enemies.js`.
- die **Rolle** trägt weiterhin die Waffe: Klinge, Bogen oder Stab.

Kein Gesicht — ein schlechtes Gesicht liest sich als Fehler, eine Silhouette als
Absicht. Die Merkmale sind bewusst grob; feiner zu werden hiesse, ein Gesicht
anzudeuten.

`node dev/silhouetten.js` prüft, dass jede Kombination zeichnet, dass **keine
zwei Arten identisch aussehen** und dass jede Art aus dem Spiel einen Eintrag
hat. Der Rückfall auf `mensch` ist eine Notbremse gegen leere Kacheln, kein
Ersatz für einen eigenen Eintrag.

Sobald es echte Bilder gibt, gehören sie hierhin:

```
assets/einheiten/<id>.png
```

`<id>` ist die Einheiten-ID aus `js/data.js` (`rimuru`, `benimaru`, `rigurd`,
…) beziehungsweise aus `js/enemies.js`. Liegt die Datei da, nimmt die Ansicht
sie beim nächsten Kampf automatisch statt des Platzhalters — es ist keine
Codeänderung nötig und keine Liste zu pflegen. Fehlt sie, bleibt der
Platzhalter stehen (der 404 im Konsolenlog ist erwartet, einer je Einheit und
Sitzung).

### Anforderungen an ein Bild

Diese Liste ist nach den Phasen 55–60 geschrieben, nicht davor: die Bühne
steht, und damit ist bekannt, was ein Bild darauf können muss. Die vier
oberen Punkte sind Geometrie, die vier unteren kommen aus dem, was das Brett
mit dem Bild macht — und die sind es, die man ohne Vorwarnung falsch macht.

- **Format 512 × 1024**, Hochformat 1:2. Andere Seitenverhältnisse werden auf
  1:2 gestaucht.
- **Freigestellt**, mit Alphakanal. Der Hintergrund ist das Brett.
- **Von vorn**, aufrecht stehend, **Füße am unteren Bildrand**: die Figur wird
  an ihrer Unterkante auf das Feld gestellt (`sprite.center = (0.5, 0)`).
- **Kopf bei rund vier Fünfteln der Höhe.** Darüber liegen Lebensbalken (bei
  0,82 der Figurenhöhe) und Zustandsmarken (bei 0,70) — was dort im Bild
  steht, wird verdeckt.

- **Kein eingemalter Schatten.** Seit Phase 58 legt das Brett selbst einen
  weichen Fleck unter jede Figur. Ein zweiter im Bild sieht aus wie ein
  Fehler.
- **Eigene Kantentrennung mitbringen.** Der farbige Umriss, der die Figur vom
  dunklen Brett abhebt, steckt in `platzhalter()` — ein echtes Bild bekommt
  ihn **nicht**. Ohne einen eigenen hellen Rand oder Gegenlicht versinkt es im
  Brett, und zwar deutlicher als der Platzhalter es je tat.
- **Spiegelbar.** Gegner werden gespiegelt (`repeat.x = -1`), damit beide
  Seiten zur Mitte schauen. Schrift, Wappen und alles, was seitenverkehrt
  falsch aussieht, gehört deshalb nicht ins Bild.
- **Keine großen sehr hellen Flächen.** Die Nachbearbeitung lässt alles über
  0,85 Helligkeit glühen (`js/fx.js`). Für eine Klinge oder ein Auge ist das
  gewollt, für eine weiße Rüstung nicht.

Ein Bild, das diese Punkte erfüllt, braucht **keine Codeänderung** — `textur()`
in `js/brett3d.js` nimmt es beim nächsten Kampf.

### Reihenfolge

Nach jedem Stapel im Spiel ansehen, nicht erst am Ende:

1. die sechs Pilotfiguren (`PILOT` in `dev/prompts.js`)
2. die übrigen Einheiten aus `js/data.js`
3. die Bosse
4. die häufigen Gegner aus `js/enemies.js`

Ein gemischter Bestand ist ausdrücklich in Ordnung und soll auch geprüft
werden: wo eine Datei fehlt, springt der Platzhalter ein.

**Die sechs Pilotfiguren sind sechs verschiedene ARTEN** (Rimuru, Shion, Ranga,
Gobta, Gabiru, Orkkrieger), nicht die sechs meistgespielten. Der Pilot soll
nicht zeigen, dass das Modell Oger kann, sondern ob die Vorgaben oben über
verschiedene Körperformen halten: ein Slime hat keine Füße, ein Wolf steht auf
vieren — und genau daran scheitert „Füße am unteren Bildrand" als Erstes.

### Zwei Werkzeuge

```
node dev/prompts.js            Prompts + Herkunftszeilen für die sechs Pilotfiguren
node dev/prompts.js --alle     für alle Einheiten
node dev/bildcheck.js          prüft, was in assets/einheiten/ liegt
```

`dev/prompts.js` hält den Prompt-Rumpf an EINER Stelle: nur das erste Feld
wechselt je Figur, der Rest ist über alle Bilder wortgleich. Das, derselbe Seed
und derselbe Sampler sind der ganze Konsistenz-Mechanismus (Begründung in
`dev/asset-recherche.md`). Die Herkunftszeile für die Tabelle unten fällt beim
Generieren gleich mit ab — von Hand wäre sie bei jedem Bild dieselbe
Abschreibübung mit genau einem wechselnden Wort.

`dev/bildcheck.js` misst die vier Anforderungen von oben, die messbar sind:
Format 512 × 1024 mit Alphakanal, unterste Bildzeile deckend (Füße am Rand),
Scheitel bei 0,85–0,95 der Höhe, höchstens 1,5 % der Figurenfläche über
Luminanz 0,86. Die anderen vier (Stil, Pose, Spiegelbarkeit, kein eingemalter
Schatten) sind Geschmack und werden am Brett beurteilt — dafür gibt es keine
Zahl. Das Skript bringt keine Abhängigkeit mit: `zlib` liegt in Node, der
PNG-Dekoder sind sechzig Zeilen, und `node dev/bildcheck.js --selftest` prüft
den Prüfer gegen fünf absichtlich kaputte Bilder (Teil von `npm test`).

### Herkunft

Je Bild eine Zeile: Werkzeug beziehungsweise Quelle, der **vollständige
Prompt**, Datum, Lizenz. **Ohne diesen Eintrag gilt ein Bild als nicht
verwendbar** — das ist keine Formalie, sondern der einzige Weg, später noch
feststellen zu können, was benutzt werden darf.

### Entschieden am 2026-08-04

Die Fragen aus `dev/asset-recherche.md` sind beantwortet:

- **Privat.** Das Spiel wird nicht veröffentlicht. Damit dürfen die Figuren ihre
  Tensura-Namen tragen; die Grenze verläuft bei der Veröffentlichung, nicht bei
  der Erstellung. Sollte sich das ändern, ist es eine Umbenennung und kein
  Umbau — die IDs sind nur Schlüssel.
- **Erst die ausgebauten Silhouetten (Option D), dann echte Bilder (Option A).**
  D ist in Phase 68 umgesetzt und kostet nichts; es beantwortet, ob fünfzig
  Einzelbilder überhaupt gepflegt werden wollen.
- **Lokale GPU** für die Generierung, kein gemieteter Rechner. — *Am 2026-08-05
  verworfen, siehe unten.*
- **Bilder ins Repo.** `.gitignore` bleibt bei `node_modules`. Rund 15–30 MB —
  vertretbar, weil das Spiel offline läuft und das bleiben soll.
- **Alle Einheiten UND alle 72 Gegner**, nicht nur die Einheiten.

### Entschieden am 2026-08-05

- **Browser-Generator statt eigener oder gemieteter GPU.** Civitai, SeaArt und
  tensor.art fahren dieselben Illustrious-/NoobAI-Checkpoints, um die es in der
  Recherche geht, im kostenlosen Tagesbudget. Damit fällt der ganze Unterbau
  weg: keine ComfyUI-Einrichtung, kein Torch, kein Pod. Der lokale Weg hätte
  hier zusätzlich `python3.12` gebraucht — dieser Rechner hat Python 3.14 und
  kein `pip`, und für 3.14 gibt es noch keine Torch-Wheels.
- **Erst die sechs Pilotfiguren, dann neu entscheiden.** Nicht 111 Bilder auf
  Verdacht. Der Bestand ist seit der Recherche von 29 auf **39 Einheiten +
  72 Gegner** gewachsen; ob 47 oder 111 Einzelbilder gepflegt werden wollen,
  beantwortet der Pilot ehrlicher als jede Schätzung.
- **Nachbearbeitung von Hand statt Pipeline.** Zuschneiden und Einpassen von
  sechs Bildern dauert in einem Bildprogramm kürzer, als das Pillow-Skript aus
  der Recherche zu schreiben. `dev/bildcheck.js` sagt, ob es gesessen hat.
  Ab etwa zwanzig Bildern lohnt das Skript — vorher nicht.

| Datei | Werkzeug / Quelle | Prompt | Datum | Lizenz |
|---|---|---|---|---|
| — | noch keine | — | — | — |
