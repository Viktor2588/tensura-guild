# Recherche: Woher kommen die ~50 Figurenbilder?

Stand: 2026-08-04. Grundlage: `ASSETS.md` (Bildvorgabe), `platzhalter()` in
`js/brett3d.js`, Bestand: 29 Einheiten in `js/data.js` + Gegner/Bosse in
`js/enemies.js`. Diese Datei ist Recherche, keine Rechtsberatung.

Gemessene Randbedingung dieses Rechners: **GTX 1060, 6 GB VRAM**. Weder
Pillow noch ImageMagick sind installiert, `pip` fehlt ebenfalls. Das prägt
die Empfehlung mehr als jede Modellwahl.

---

## Empfehlung

**Lokale Generierung mit einem Illustrious-/NoobAI-basierten SDXL-Anime-
Checkpoint in ComfyUI, ein Stil-Anker über fixe Prompt-Bausteine + fixen
Seed + optional ein Stil-LoRA, Freistellen mit BiRefNet (ToonOut-Variante),
Nachbearbeitung als ein einziges Python-Skript.**

Drei Gründe, in dieser Reihenfolge:

1. **Die Cloud-Dienste können die Aufgabe gar nicht erfüllen.** Seit
   Februar 2026 blocken Nano Banana Pro / Gemini und die OpenAI-Bildmodelle
   benannte Figuren bekannter Marken hart (Disney-C&D vom Dezember 2025,
   danach ausgeweitete Filter, u. a. auf bekannte Anime-Figuren). „Rimuru
   Tempest, full body" läuft dort in `PROHIBITED_CONTENT`. Zwanzig der 29
   Einheiten sind genau solche Figuren. Ein API-Weg endet also entweder in
   Umschreibungen („blauhaariger androgyner Junge…") — womit die
   Wiedererkennbarkeit weg ist, die der einzige Grund für echte Bilder war —
   oder er endet an der Fehlermeldung.
2. **Die offenen Anime-Checkpoints kennen die Figuren namentlich.**
   Illustrious XL / NoobAI und ihre Abkömmlinge sind auf Danbooru-Tags
   trainiert. `rimuru tempest`, `benimaru (tensura)`, `milim nava`,
   `shion (tensura)`, `veldora tempest` sind dort etablierte Tags. Das ist
   der ganze Trick: keine Beschreibungsakrobatik, kein Charakter-LoRA je
   Figur, kein Referenzbild-Gefrickel. Ein Tag pro Figur, der Rest des
   Prompts bleibt über alle 50 Bilder wortgleich — und genau das ist die
   Stilkonsistenz.
3. **Es kostet nichts und bleibt offline**, was zur Projekthaltung passt
   (`ASSETS.md`: three.js lokal statt CDN, kein Bauschritt, Spiel läuft
   offline).

Der Preis: die 1060 ist langsam. SDXL bei 832×1216 liegt auf dieser Karte
bei grob 1,5–3 min pro Bild (Berichte für 1060 6 GB nennen 3–4 min inkl.
Refiner bei 40 Schritten). Mit 4–6 Kandidaten je Figur sind das ~250–300
Bilder, also zwei bis drei Nächte im Hintergrund. Wer das nicht will:
dieselbe ComfyUI-Konfiguration auf einer RunPod-RTX-4090 für ca. **0,34 $/h**
laufen lassen — der ganze Stapel in 2–4 Stunden, **rund 1–3 $ gesamt**. Das
ist die einzige Stelle, an der Geld die Sache spürbar verbessert.

---

## Optionen im Vergleich

| | Aufwand | Kosten | Qualität | Risiko |
|---|---|---|---|---|
| **A: Lokal SDXL/Illustrious (empfohlen)** | Einrichtung 2–4 h (ComfyUI + Checkpoint + BiRefNet), dann Nachtläufe; Kuratieren ~2 h | 0 € (bzw. 1–3 $ auf RunPod) | Hoch und **wiedererkennbar** — die Figuren sind namentlich im Modell | VRAM-Enge; Bilder sind rechtlich Fanart (siehe unten) |
| **B: Cloud-API (Nano Banana Pro, Seedream, Recraft)** | Gering — ein Skript, ein Nachmittag | 0,035–0,24 $/Bild → **2–15 $** für 50 Bilder plus Ausschuss | Technisch top; Recraft liefert als einziger verlässlich natives PNG mit Alpha | **Blocker**: benannte Anime-Figuren werden gefiltert. Nur brauchbar für die generischen Gegner (Goblin, Riesenspinne, Direwolf) |
| **C: Auftragsarbeit** | Briefing + Abstimmung, Wochen bis Monate | Fiverr 30–185 $/Figur, Mittelklasse 100–400 $, kommerzielle Rechte ×2–5 → **1.500–10.000 $** für 50 | Am besten und am konsistentesten | Preis; und ein Auftrag für geschützte Figuren verlagert das Rechtsthema nur, er löst es nicht |
| **D: Keine Bilder — Platzhalter ausbauen** | 1 Phase im bestehenden Code | 0 € | Bewusst stilisiert; nie „falsch", weil nie fotoähnlich | Bleibt abstrakt; die Figuren bleiben austauschbar |

**Zu D, weil es die ehrlichste Alternative ist:** `platzhalter()` ist heute
Körper + Kopf + Waffe. Mit Art (`slime`, `goblin`, `oger`, `echsenmensch`,
`insektoid`, `daemon`, `drache`, `direwolf`) als zweiter Achse neben der
Rolle wären acht unterscheidbare Silhouetten drin — Hörner beim Oger, Schweif
beim Echsenmenschen, vierbeinig beim Direwolf, Flügel beim Insektoid — plus
eine Farbe je Figur aus der ID gehasht. Das sind vielleicht 80 Zeilen im
schon vorhandenen Canvas-Code, kostet nichts, hat kein Rechtsthema, keinen
Repo-Ballast und erfüllt alle acht Punkte aus `ASSETS.md` per Konstruktion.
Wer nicht sicher ist, ob er 50 Bilder wirklich pflegen will: **erst D, dann
notfalls A**. D und A schließen einander nicht aus, der Platzhalter bleibt ja
ohnehin als Fallback stehen.

**Zu freien Asset-Packs (Teil von D):** OpenGameArt/itch.io/CC0 liefern
brauchbare Ganzkörper-Sprites für generische Fantasy-Monster — für die
Gegner aus `js/enemies.js` (Wolfsjunges, Giftspinne, Goblinräuber, Hornhase)
ist das realistisch. Für Rimuru, Milim oder Diablo existiert nichts
Lizenzfreies, und die Packs sind untereinander stilistisch unvereinbar; ein
Mischbestand aus fünf Packs sieht schlechter aus als ein einheitlicher
Platzhalter. Als alleiniger Weg fällt das aus.

---

## Die empfohlene Pipeline im Detail

### 0. Einrichtung (einmalig)

- **ComfyUI** (portable/Linux), Start mit `--lowvram` oder `--medvram`.
- **Checkpoint**: ein Illustrious-XL-Abkömmling, FP16 ≈ 6,5–7 GB — auf 6 GB
  eng. Praktikabel: FP8-Variante oder GGUF-Quantisierung des Checkpoints,
  oder Generierung bei 640×1280 statt 832×1216 und anschließendes Hochskalieren.
  Alternative fürs gleiche Ergebnis bei weniger VRAM: **Z-Image Turbo
  (6 B)** in der GGUF-Quantisierung läuft laut Anbietern ab 6 GB und braucht
  nur 8–9 Schritte; die Anime-Variante („Z-Anime") ist gezielt dafür. Nachteil:
  jüngeres Ökosystem, Danbooru-Tag-Treue ist schwächer als bei Illustrious.
  **Zuerst Illustrious testen**, Z-Image nur als Ausweichlösung, wenn die
  Karte nicht mitspielt.
- **Freistellen**: `rembg` mit dem Modell `birefnet-general`, oder direkt
  BiRefNet. Für Anime gibt es die feinabgestimmte Variante **ToonOut**
  (BiRefNet-Fork, arXiv 2509.06839): auf Anime-Bildern von 95,3 % auf 99,5 %
  Genauigkeit, genau bei Haarspitzen und Linienkanten, wo `u2net`
  (rembg-Standard) rund 40 % der feinen Strähnen verliert. Beide sind offline,
  batchfähig (ganze Ordner in einem Aufruf), GPU empfohlen (~930 MB Modell).
- **Python-Werkzeuge**: `pip` fehlt hier. `sudo apt install python3-pip
  python3-venv`, dann ein venv mit `pillow` und `rembg[gpu]`. ImageMagick
  wird **nicht** gebraucht — Pillow deckt alles ab, was die Nachbearbeitung
  tut, und ist ohnehin Abhängigkeit von rembg.
- *Nicht* nehmen: **LayerDiffuse** für natives Alpha. Es funktioniert auf
  SD1.5/SDXL, aber es kostet zusätzliches VRAM, verändert den Stil, und der
  Qualitätsvorsprung gegenüber BiRefNet ist bei Figuren vor flachem
  Hintergrund gering. Auf Flux/FLUX.2 gibt es ohnehin kein brauchbares Alpha.

### 1. Prompt-Gerüst

Der Aufbau ist absichtlich stur: **nur das erste Feld wechselt je Figur**,
alles andere ist über alle 50 Bilder wortgleich. Das, plus derselbe Seed und
derselbe Sampler, ist der ganze Konsistenz-Mechanismus — ein Stil-LoRA ist
optional obendrauf, ein Charakter-LoRA je Figur ist für diesen Zweck
Overkill.

```
POSITIV:
  <danbooru-tag der figur>,                     ← einziges variables Feld
  solo, full body, standing, facing viewer, front view, symmetrical pose,
  arms at sides, feet visible, full body in frame, head near top of frame,
  flat mid-grey background, simple background, no shadow, no ground,
  strong rim light from behind, backlit edge glow, cool key light,
  muted saturated colors, clean lineart, cel shading, anime style,
  masterpiece, best quality, very awa

NEGATIV:
  cropped, cut off, out of frame, closeup, portrait, bust,
  cast shadow, drop shadow, ground shadow, floor, reflection,
  text, watermark, signature, logo, emblem, crest, letters,
  white background, bright white armor, blown out highlights, overexposed,
  multiple views, character sheet, 2girls, 2boys, extra limbs, lowres

SEED: fix (z. B. 20260804), je Figur 4–6 Variationen über seed+0..5
SAMPLER: euler_ancestral / DPM++ 2M Karras, CFG 5–7, 28–32 Schritte
GRÖSSE: 832 × 1216 (SDXL-nah), später auf 512 × 1024 gebracht
```

Die Bausteine bilden `ASSETS.md` Punkt für Punkt ab: `full body` +
`feet visible` + `head near top of frame` = Geometrie; `no shadow` +
Negativliste = kein eingemalter Schatten; `strong rim light from behind` =
die eigene Kantentrennung, die das Brett nicht liefert; `text/logo/crest` im
Negativ = spiegelbar; `white background`/`overexposed` im Negativ = keine
großen Flächen über 0,85 Luminanz, die durch `js/fx.js` glühen.
`flat mid-grey background` statt weiß ist bewusst: weiße Haare und helle
Rüstungen (Shion, Shuna, Testarossa) trennen sich vor Grau sauberer, und
Grau verführt das Modell nicht zum Überstrahlen.

Ein Detail zur Reihenfolge: **die sechs Starteinheiten zuerst**, wie
`ASSETS.md` es vorgibt, und danach im Spiel ansehen, bevor der Rest läuft.
Der Grund ist praktisch — falls die Kopfhöhe oder das Rim-Light nicht sitzt,
hat man sechs Bilder verworfen und nicht fünfzig.

### 2. Freistellen (Batch)

```bash
rembg p -m birefnet-general -a roh/ freigestellt/
```

`-a` schaltet Alpha-Matting zu (weichere Haarkanten, langsamer). Bei
schlechten Kanten stattdessen ToonOut-Gewichte in BiRefNet laden. Danach
**Stichprobe von Hand**: Haarspitzen, Waffenklingen und alles Durchsichtige
(Veldoras Aura, Diablos Mantelsaum) sind die Stellen, an denen jedes
Matting-Modell irrt.

### 3. Nachbearbeitung — ein Skript, Pillow, kein Modell

Alles, was `ASSETS.md` fordert, ist deterministische Pixelarbeit. Kein
zweites Modell nötig:

1. **Zuschneiden** auf `img.getbbox()` des Alphakanals.
2. **Einpassen**: auf Höhe 1024 minus ~2 % Luftraum skalieren, Seitenverhältnis
   halten, mittig in eine 512×1024-Leinwand setzen, **unten bündig** — das
   ist die Anforderung „Füße am unteren Bildrand" bei `sprite.center =
   (0.5, 0)`. Wer über 512 breit wird, skaliert an der Breite statt an der
   Höhe.
3. **Kopfhöhe prüfen**: oberste nicht-transparente Zeile soll bei ~0,85–0,95
   der Höhe liegen, damit der Kopf um 0,8 sitzt und Lebensbalken (0,82) und
   Zustandsmarken (0,70) nichts Wichtiges verdecken. Verstöße nur melden,
   nicht automatisch korrigieren — das ist ein Kuratierungssignal.
4. **Luminanz deckeln**: je Pixel `Y = 0.2126R + 0.7152G + 0.0722B`; wo
   `Y > 0.85·255`, alle drei Kanäle mit `0.85·255 / Y` multiplizieren.
   Erhält den Farbton, nimmt nur das Überstrahlen — und lässt kleine Glanz-
   punkte wie Augen und Klingen intakt, weil die nach dem Deckeln immer noch
   die hellsten Stellen sind. (Wer die gewollten Glanzpunkte behalten will:
   nur deckeln, wenn die zusammenhängende helle Fläche größer als ~1,5 % der
   Figurenfläche ist.)
5. **Rim-Light/Outline anlegen**, falls das Modell zu wenig geliefert hat:
   Alphakanal um 3–4 px weiten (`ImageFilter.MaxFilter`), das Original-Alpha
   abziehen, den Ring in der Seitenfarbe (`rgba(122,180,255,.85)` bzw.
   `rgba(255,138,120,.85)` — dieselben Werte wie in `platzhalter()`) füllen,
   leicht weichzeichnen und **hinter** die Figur legen. Damit ist die
   Kantentrennung garantiert und nicht dem Zufall des Prompts überlassen.
6. **Prüfschritt** (einer, klein, am Ende des Skripts): für jedes Ergebnis
   `assert` auf Größe 512×1024, Modus RGBA, unterste Bildzeile enthält
   nicht-transparente Pixel, kein Pixel mit `Y > 0.86·255`. Bricht das
   Skript, ist genau eine der vier Vorgaben verletzt.

Ablage: `assets/einheiten/<id>.png` — mehr braucht es nicht,
`textur()` in `js/brett3d.js` nimmt die Datei beim nächsten Kampf.

### 4. Herkunft eintragen

`ASSETS.md` verlangt je Bild eine Zeile mit Werkzeug, **vollständigem
Prompt**, Datum und Lizenz, sonst gilt das Bild als nicht verwendbar. Bei 50
Bildern von Hand ist das eine Zumutung: das Generierungsskript soll die
Tabellenzeile gleich mitschreiben. Weil nur ein Prompt-Feld variiert, ist die
Zeile kurz — Checkpoint + Version, der variable Tag, Seed, Datum; der
konstante Prompt-Rumpf steht einmal darüber im Fließtext.

---

## Rechtslage, knapp

Sachstand, keine Beratung.

- **Die Figuren.** Rimuru, Benimaru, Milim, Diablo & Co. sind geschützte
  Figuren (Fuse / Kodansha / Eight Bit). Ein Bild, das sie erkennbar
  wiedergibt, ist nach deutschem Recht eine Bearbeitung bzw. Umgestaltung
  (§ 23 UrhG) und braucht für die Verwertung die Zustimmung des
  Rechteinhabers. Ein „Fair Use" wie in den USA existiert hier nicht. Die
  seit 2021 vorhandene **Pastiche-Schranke (§ 51a UrhG)** wird als Auffang
  für Fankunst diskutiert, ist in ihrer Reichweite aber ungeklärt und
  jedenfalls kein verlässlicher Freibrief für ein komplettes Spiel.
- **Privat und unveröffentlicht.** Solange nichts verbreitet und nichts
  öffentlich zugänglich gemacht wird, findet keine relevante Verwertung
  statt; praktisch entsteht kein Konflikt, weil niemand davon erfährt und
  weil es nichts gibt, wogegen vorzugehen wäre. Das ist die heutige Lage des
  Projekts.
- **Die Grenze verläuft bei der Veröffentlichung**, nicht bei der Erstellung.
  Ein öffentliches GitHub-Repo, itch.io, eine gehostete Seite — ab da ist es
  öffentliche Zugänglichmachung. Die Durchsetzung 2026 ist spürbar schärfer
  geworden (verstärkte DMCA-Welle japanischer Rechteinhaber und Distributoren
  auf allen großen Plattformen); die übliche Folge für ein Hobbyprojekt ist
  eine Takedown-Meldung, nicht eine Klage. **Sobald Geld im Spiel ist**
  (Verkauf, Spenden, Werbung) steigt das Risiko sprunghaft, und dann ist es
  auch kein Randfall mehr.
- **Der Ausweg, wenn veröffentlicht werden soll**: Namen und Bilder gegen
  eigene Figuren tauschen. Spielmechanik, Balance und Code sind davon nicht
  betroffen — die IDs in `js/data.js` sind ohnehin nur Schlüssel. Das ist
  eine Umbenennungsarbeit, kein Umbau. Die Gegner aus `js/enemies.js` sind
  großenteils generisch (Goblinräuber, Riesenspinne, Wolfsjunges) und
  unproblematisch.
- **Nutzungsbedingungen der Generatoren.** Google (Gemini/Nano Banana) und
  OpenAI verbieten und **blocken technisch** die Erzeugung geschützter
  Markenfiguren; ein Versuch verstößt gegen die Nutzungsbedingungen und
  scheitert meist ohnehin am Filter. Offene Modelle (Illustrious, NoobAI,
  Z-Image) haben keine solche Sperre; ihre Lizenzen (Fair-AI-Public-License
  bzw. CreativeML-Ableger) regeln das Modell und dessen Weitergabe, nicht die
  Rechte Dritter an dargestellten Figuren — das Urheberrecht an der Vorlage
  bleibt davon unberührt. Anders gesagt: das Modell erlaubt es, der
  Rechteinhaber nicht.

---

## Offene Entscheidungen

1. **Echte Bilder oder ausgebauter Platzhalter (A vs. D)?** Nur A rechtfertigt
   den ganzen Rest dieses Dokuments. D ist eine Phase Arbeit und danach fertig.
2. **Falls A: veröffentlichen oder nicht?** Die Antwort bestimmt, ob die
   Figuren Tensura-Namen tragen dürfen. Sie sollte **vor** dem ersten Bild
   fallen, nicht nach dem fünfzigsten.
3. **Lokal über zwei Nächte oder RunPod für ~2 $?** Reine Geduldsfrage,
   identisches Ergebnis.
4. **Bilder ins Repo?** `ASSETS.md` markiert das schon als offen. 50 PNGs à
   512×1024 mit Alpha sind grob 15–30 MB — vertretbar, aber eine Entscheidung.
5. **Nur Einheiten oder auch alle Gegner?** Die 29 Einheiten tragen das Spiel;
   die Gegner sind zahlreicher und generischer. Ein Mischbestand ist laut
   `ASSETS.md` ausdrücklich in Ordnung — womöglich reicht Stufe 1 und 2 der
   dortigen Reihenfolge dauerhaft.

---

## Quellen

- [Best AI Anime Art Generators 2026 — Mage](https://blog.mage.space/article/best-ai-anime-art-generators-2026/56d21450-3f54-4c10-8884-dcc471195114)
- [Best LoRAs for Consistent Characters in 2026 — Thinkpeak](https://thinkpeak.ai/best-loras-consistent-characters-2026/)
- [Illustrious XL ComfyUI Guide — Tech Tactician](https://techtactician.com/illustrious-xl-comfyui-sdxl-anime-guide-for-beginners/)
- [Illustrious XL VRAM Requirements — WillItRunAI](https://willitrunai.com/image-models/illustrious-xl)
- [Z-Image Turbo auf 6–8 GB VRAM](https://zimage.run/blog/z-image-turbo-quantized-low-vram-guide)
- [Z-Image Turbo VRAM — WillItRunAI](https://willitrunai.com/image-models/z-image-turbo)
- [LayerDiffuse: Transparent Image Layer Diffusion (arXiv 2402.17113)](https://arxiv.org/abs/2402.17113)
- [Welche AI-Generatoren liefern transparente PNGs (2026)](https://transparify.app/blog/ai-image-generators-transparent-background)
- [ToonOut: Fine-tuned Background Removal for Anime Characters (arXiv 2509.06839)](https://arxiv.org/html/2509.06839v1)
- [BiRefNet vs rembg vs U2Net in Produktion](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-4830)
- [AI Image API Pricing 2026 — Kosten pro Bild](https://www.promptlibrary.space/blog/ai-image-api-pricing-in-2026-cost-per-image-for-gpt-image-2-grok-imagine-nano-ba)
- [Nano Banana Pro: 16 blockierte Disney-IPs](https://help.apiyi.com/en/nano-banana-pro-disney-ip-blocked-copyright-protection-guide-en.html)
- [Nano Banana 2 Content-Safety-Mechanismus](https://help.apiyi.com/en/nano-banana-2-content-safety-image-generation-failure-guide-en.html)
- [Gemini blockiert Disney-Bilder — Dataconomy](https://dataconomy.com/2026/02/12/you-can-no-longer-generate-disney-images-on-gemini/)
- [RunPod GPU Pricing 2026](https://deploybase.ai/articles/runpod-gpu-pricing)
- [Anime Illustrator Cost Guide 2026 — Fiverr](https://www.fiverr.com/resources/guides/costs/anime-illustrator)
- [Anime Copyright Crackdown 2026 — Vondran Legal](https://www.vondranlegal.com/anime-copyright-crackdown-2026-what-creators-fans-and-influencers-need-to-know)
- [German Copyright Law 2026 — Überblick](https://ecopyright.io/blog/copyright-in-germany/)
