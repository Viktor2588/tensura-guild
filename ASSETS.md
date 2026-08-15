# Assets

Das Spiel kam bis Phase 41 ohne eine einzige Bilddatei aus. Mit der
2.5D-Ansicht (`js/brett3d.js`) gibt es zum ersten Mal einen Platz für welche.
Diese Datei sagt, wohin sie gehören und woher sie stammen — Herkunft
lückenlos, sonst ist später nicht mehr feststellbar, was benutzt werden darf.

## Ton

**Kein Audio-Ordner.** Seit `js/ton.js` (Routine, 2026-08-09) erzeugt das
Spiel jeden Klang zur Laufzeit per Web Audio API — Oszillatoren und ein
gefilterter Rauschpuffer, keine Audiodateien. Damit gibt es hier nichts zu
verorten: keine Lizenzfrage, kein Format, kein Repo-Gewicht. Der Ton-Schalter
im Menü (`tensura-ton` in `localStorage`) und `Ton.verfuegbar()` folgen
demselben Muster wie die Effektstufe und `Brett3D.verfuegbar()`.

## Fremdcode

| Was | Woher | Lizenz |
|---|---|---|
| `js/vendor/three.min.js` | three.js r149, npm-Paket `three@0.149.0`, Datei `build/three.min.js` | MIT, Wortlaut in `js/vendor/three.LICENSE` |

Bewusst lokal abgelegt statt per CDN: das Spiel läuft offline, und das soll so
bleiben. Bewusst r149 statt neuer: das ist die letzte Fassung mit einem
UMD-Build, der sich per `<script>` einbinden lässt — der Rest des Projekts hat
keinen Bauschritt und soll keinen bekommen.

## Audio

**Es gibt keine Audiodateien und soll vorerst auch keine geben.** `js/audio.js`
erzeugt jeden Ton zur Laufzeit aus der Web Audio API (Oszillatoren für Töne,
gefiltertes Rauschen für Einschläge) statt aus Samples. Das umgeht dieselbe
Lizenzfrage, die die Figuren-Herkunftstabelle unten so ernst nimmt — ein
synthetischer Ton hat keine Quelle, die belegt werden müsste — und braucht
keinen neuen Ordner unter `assets/`. Sollten später echte Sample-Dateien
dazukommen (Musik, Sprachausgabe, aufwendigere SFX), gehören sie unter
`assets/audio/` und in eine eigene Herkunftstabelle nach demselben Muster wie
bei den Figuren.
## Ton

**Es gibt keine Audio-Dateien.** Wie das Bloom in `js/fx.js` entstehen alle
Sound-Effekte zur Laufzeit aus eigenem Code — Oszillatoren und gefiltertes
Rauschen über die Web Audio API, in `js/ton.js`. Damit fällt für Ton dieselbe
Provenienz-Frage weg, die diese Datei sonst beantwortet: es gibt nichts
Fremdes zu benennen und nichts, dessen Lizenz zu klären wäre.
## Ton

**Es gibt keine Audiodateien und soll auch keine geben.** `js/audio.js`
synthetisiert jeden Ton — Treffer, Heilung, Tod, Signatureinsatz, Schild,
Status, Ausweichen, Wiederbelebung, Entladung, Kombi, Verwandlung, Wut,
Fehlschlag, Sieg-/Niederlage-Stinger — zur Laufzeit aus Oszillatoren
(`OscillatorNode`) und einem einmal gefüllten Rauschpuffer der Web Audio
API. Kein Fremdcode, keine Lizenzfrage, kein zusätzliches Repo-Gewicht.
Angebunden ist es in `js/ui.js` an der Stelle, an der `Regie.zeitplan`
ohnehin schon jeden Logeintrag samt Beat kennt (`schritt()` und
`endeReplay()`). Ein Ton-Ein/Aus-Schalter sitzt im Menü, gemerkt in
`localStorage` unter `tensura-audio` — dasselbe Muster wie Tempo und
Effektstufe.
## Klang

Seit `js/audio.js` (siehe ROUTINE.md) gibt es Ton — **keine einzige Audiodatei**.
Jeder Effekt entsteht zur Laufzeit aus Oszillatoren und gefiltertem Rauschen
(Web Audio API), an denselben sechs Formen orientiert wie `FORM` in
`js/brett3d.js`. Keine Provenienz-Zeile nötig, weil nichts generiert oder
heruntergeladen wurde — es ist Code, kein Asset. Bleibt das so (kein Musikbett
aus fremder Quelle, keine Sample-Bibliothek), bleibt diese Sektion leer.
## Ton

**Keine Audiodateien.** `js/klang.js` erzeugt jeden Ton zur Laufzeit aus
Oszillatoren und einem einzigen Rauschpuffer (Web-Audio-API, seit 2026-08-08).
Damit gibt es hier nichts mit Herkunft zu klären — synthetischer Ton entsteht
im Code, nicht aus einer Quelle, die eine Lizenz bräuchte. Sollte das Spiel
später echte Musik oder aufgenommene Effekte bekommen, gehört deren Herkunft
in eine eigene Tabelle hier, nach demselben Muster wie die Figuren unten.
## Klang

**Keine Audiodatei im Repo, und keine ist geplant.** `js/audio.js`
synthetisiert jeden Ton zur Laufzeit über die Web-Audio-API (Oszillatoren
plus Hüllkurve, gefiltertes Rauschen für Brand und Donner) statt fertige
Sounddateien einzubinden — damit stellt sich die Provenienzfrage dieser
Datei für Klang gar nicht erst: es gibt nichts, das von irgendwoher stammt.
Sollten doch einmal echte Audiodateien dazukommen (Musik, Sprachausgabe),
gehören sie unter `assets/audio/` und eine Herkunftszeile hierhin, nach
demselben Muster wie bei den Figuren unten.
## Ton

`js/klang.js` (Routine vom 2026-08-09) erzeugt jeden Ton zur Laufzeit per Web
Audio API — Oszillatoren und ein Rauschpuffer, keine Audiodatei. Damit gibt es
hier **nichts mit eigener Herkunftszeile**: keine Lizenzfrage, kein Download,
kein Eintrag nötig. Das ist bewusst so und keine Lücke in dieser Liste.

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

## Ton

**Keine Audiodatei, genau wie bei den Figuren vor Phase 41 keine Bilddatei.**
`js/audio.js` synthetisiert jeden Klang zur Laufzeit aus Oszillatoren und
gefiltertem Rauschen (Web Audio API) — kein `<audio>`-Tag, kein Download, keine
Lizenzfrage. Die Zuordnung folgt demselben Schlüsselwort-Prinzip wie `FARBE`
in `js/brett3d.js`.

Eigenschaften: Quellcode, komplett selbst geschrieben in dieser Sitzung
(2026-08-02, Routine `routine/2026-08-02-sound-fx`), keine externe Quelle,
keine Lizenzangabe nötig. Ohne Web Audio API (z. B. in `dev/uitest.js`, das in
jsdom läuft) bleibt das Spiel stumm — `Sound.verfuegbar()` sagt dann nein,
genau wie `Brett3D.verfuegbar()` bei fehlendem WebGL.

Sollte das Projekt später doch aufgenommene oder komponierte Musik/SFX
bekommen, gehören sie nach `assets/audio/` und hier mit Quelle, Datum und
Lizenz eingetragen — dieselbe Regel wie bei den Figuren oben.
| Datei | Herkunft | Datum | Lizenz |
|---|---|---|---|
| — | noch keine | — | — |

## Klang

**Keine einzige Audiodatei.** `js/audio.js` (Modul `SFX`) erzeugt jeden Ton zur
Laufzeit aus Oszillatoren und gefiltertem Rauschen über die Web Audio API —
dieselbe Haltung wie bei den Figuren: Platzhalter aus Code statt eine fremde
Datei mit ungeklärter Lizenz. Es gibt daher nichts einzutragen und nichts zu
lizenzieren; die „Herkunft" ist der Quellcode selbst, eigen geschrieben am
2026-08-02.

Sollten doch einmal echte Audiodateien dazukommen (Musik, Sprachausgabe,
aufgenommene SFX), gehören sie unter `assets/audio/` und hier mit Quelle,
Datum und Lizenz eingetragen — genau wie bei den Figuren oben.
## Audio

**Es gibt keine einzige Audiodatei und soll auch keine geben**, aus demselben
Grund wie bei den Platzhalter-Silhouetten und den Himmelverläufen im Brett:
prozedural erzeugtes Material hat keine Herkunftsfrage, eine Sample-Bibliothek
hätte eine — Lizenz, Dateigröße, Offline-Fähigkeit.

`js/ton.js` synthetisiert jeden Klang zur Laufzeit über die Web Audio API
(Oszillatoren mit Frequenzrampen, gefiltertes weißes Rauschen für Einschläge
und Whoosh). Ein Kompressor am Ausgang statt an jeder Quelle, damit mehrere
gleichzeitige Treffer sich ducken statt zu übersteuern. Ohne Web Audio
(jsdom, sehr alte Browser) ist jeder Aufruf ein No-Op — `Ton.verfuegbar()`
sagt nein, genau das Muster, das `js/brett3d.js` für fehlendes WebGL fährt.

Sollte doch einmal echtes Audiomaterial dazukommen (Musik lässt sich schwer
synthetisieren, ein Soundtrack wäre der naheliegende erste Kandidat), gehört
es nach `assets/audio/` und in eine Tabelle wie die der Figuren oben —
Werkzeug/Quelle, Datum, Lizenz, ohne Eintrag nicht verwendbar.
## Klang

**Es gibt keine einzige Ton-Datei, und das ist Absicht.** `js/audio.js`
(Phase 62) erzeugt jeden Ton zur Laufzeit aus Oszillatoren und einem
geteilten Rauschpuffer der Web Audio API — dieselbe Entscheidung wie bei den
Figuren-Platzhaltern und dem Aktverlauf: kein Sample, keine Lizenzfrage,
keine neue Datei im Repo. Fällt die Web Audio API weg (etwa in `jsdom`),
bleibt das Spiel stumm statt zu einem Fehler zu führen — `Klang.verfuegbar()`
prüft das selbst.

Sollten künftig doch aufgenommene oder generierte Audiodateien dazukommen
(Musik, Sprachausgabe, Umgebungsgeräusche), gehören sie unter
`assets/audio/<name>.<ext>` und bekommen hier dieselbe Herkunftszeile wie ein
Bild: Werkzeug/Quelle, vollständiger Prompt bzw. Aufnahmehinweis, Datum,
Lizenz.
**Es gibt keine Audiodateien und soll vorerst auch keine geben.** Genauso wie
bei den Figuren fehlt eine Quelle für fertige Sounddateien — anders als bei
den Figuren braucht ein Ton aber keine: `js/klang.js` erzeugt jeden Effekt
zur Laufzeit aus Oszillatoren und gefiltertem Rauschen (Web Audio API), ohne
ein einziges Sample. Es ist deshalb **kein Eintrag in der Herkunftstabelle
nötig** — der Code selbst ist die Quelle, nachlesbar und ohne Lizenzfrage.

Sobald echte Musik oder aufgenommene Effekte dazukommen (Ambient-Loops je
Akt, Bosskampf-Themes), gehören sie hierhin und brauchen dann wie jedes Bild
einen Herkunftseintrag — Werkzeug/Quelle, Lizenz, Datum.
