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

Anforderungen an ein Bild:

- **Hochformat**, etwa 1:2 (der Platzhalter ist 128 × 256). Andere
  Seitenverhältnisse werden auf 1:2 gestaucht.
- **Freigestellt**, mit Alphakanal. Der Hintergrund ist das Brett.
- **Von vorn**, aufrecht stehend, Füße am unteren Bildrand: die Figur wird an
  ihrer Unterkante auf das Feld gestellt.
- Kopf bei rund vier Fünfteln der Höhe — dort sitzt der Lebensbalken.

Wenn Bilder dazukommen, hier je Bild eintragen: Quelle beziehungsweise
Werkzeug und Prompt, Datum, Lizenz. Ohne diesen Eintrag gilt ein Bild als
nicht verwendbar.

| Datei | Herkunft | Datum | Lizenz |
|---|---|---|---|
| — | noch keine | — | — |
