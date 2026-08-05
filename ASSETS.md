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

Seit `js/audio.js` (siehe ROUTINE.md) gibt es Ton — **keine einzige Audiodatei**.
Jeder Effekt entsteht zur Laufzeit aus Oszillatoren und gefiltertem Rauschen
(Web Audio API), an denselben sechs Formen orientiert wie `FORM` in
`js/brett3d.js`. Keine Provenienz-Zeile nötig, weil nichts generiert oder
heruntergeladen wurde — es ist Code, kein Asset. Bleibt das so (kein Musikbett
aus fremder Quelle, keine Sample-Bibliothek), bleibt diese Sektion leer.

## Figuren

**Stand: es gibt noch keine.** Die Ansicht zeichnet Platzhalter zur Laufzeit
auf ein Canvas (`platzhalter()` in `js/brett3d.js`): eine Silhouette, deren
Umriss und Waffe von der Rolle kommen und deren Farbe von der Seite. Kein
Gesicht — ein schlechtes Gesicht liest sich als Fehler, eine Silhouette als
Absicht.

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

1. die sechs Starteinheiten
2. die übrigen Einheiten aus `js/data.js`
3. die Bosse
4. die häufigen Gegner aus `js/enemies.js`

Ein gemischter Bestand ist ausdrücklich in Ordnung und soll auch geprüft
werden: wo eine Datei fehlt, springt der Platzhalter ein.

### Herkunft

Je Bild eine Zeile: Werkzeug beziehungsweise Quelle, der **vollständige
Prompt**, Datum, Lizenz. **Ohne diesen Eintrag gilt ein Bild als nicht
verwendbar** — das ist keine Formalie, sondern der einzige Weg, später noch
feststellen zu können, was benutzt werden darf.

Offen und vor dem ersten Bild zu entscheiden: `.gitignore` enthält heute nur
`node_modules`. Die Bilder gehen also mit ins Repo, rund fünfzig Stück. Das ist
vertretbar (das Spiel läuft offline und soll das bleiben), aber es ist eine
Entscheidung und keine Nebenwirkung.

| Datei | Werkzeug / Quelle | Prompt | Datum | Lizenz |
|---|---|---|---|---|
| — | noch keine | — | — | — |
