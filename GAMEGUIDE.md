# Tensura Guild — Spielanleitung

## Bedrohungsstufen

Die Langzeitschicht. Nach jedem Sieg geht die nächste Stufe auf, und **jede
schaltet eine Regel frei — keine Prozentzahl.** Eine Prozentzahl verlangt einen
stärkeren Trupp, eine Regel verlangt einen anderen. Die Regeln sind kumulativ.

| Stufe | Name | Regel | Was sie vom Spiel verlangt |
|---|---|---|---|
| 0 | Jura-Wald | — | Der normale Weg. |
| 1 | Überzahl | Jede Begegnung bringt einen Nachzügler mit (halbe Werte) | Fläche und Konter werden wertvoll, reiner Einzelzielschaden verliert |
| 2 | Nachschub | Der vorderste Gegner steht einmal mit 30 % Leben wieder auf | Exekution allein räumt nicht mehr ab — Gift, Brand und Blutung tragen weiter |
| 3 | Kriegsrecht | Der Händler bietet nur noch eine Einheit statt drei, Ränge kosten 15 % mehr | Du gewinnst weitgehend mit dem Trupp, den du gedraftet hast |
| 4 | Belagerung | Auf jedem Kampfknoten steht eine Elite — zur Beute eines normalen Kampfes, und das Lager gibt 15 % weniger | Kein ruhiger Knoten mehr; die Route wird zur Überlebensfrage |
| 5 | Sturmgott | Nur drei Leben statt fünf, Bosse eskalieren doppelt so schnell | Tempo: wer den Boss nicht schnell legt, verliert ihn |

Welche Regeln gerade gelten, steht über der Karte, und die **aktuelle Stufe
steht dauerhaft in der Kopfzeile** (⚠). Ein kleines `+1` daneben heißt: eine
höhere ist frei, du spielst aber gerade eine niedrigere.

**Die Stufe steigt, sobald du einen Run gewinnst** — ein verlorener Run ändert
nichts. Umstellen kannst du sie jederzeit im Menü unter *Fortschritt*; das setzt
den laufenden Run neu auf.

Gemessen mit `node dev/balance.js 500 --stufe N`: 48 / 35 / 24 / 16 / 11 / 6 %
Siegquote. Die Werteschraube läuft nur noch leise nebenher (+1,2 % je Stufe) —
die Härte kommt aus den Regeln.

## Der Start

**Ein Anfang aus vier.** Jeder ist ein Paar: eine Einheit und ein Relikt, das zu
ihren Schlüsselwörtern passt. Mehr hast du nicht — der Rest wird erkämpft.
Weder Einheit noch Relikt kommen doppelt vor, damit jede der vier Karten
wirklich eine andere Richtung ist. Die Start-Relikte sind höchstens
**ungewöhnlich** — Seltenes, Episches und Legendäres wird erspielt, nicht
ausgewürfelt.

Die ersten Knoten sind entsprechend gestaffelt: **der erste Kampf ist ein
1 gegen 1**, die nächsten gehen gegen zwei, dann drei, und die Gegner sind dabei
zusätzlich abgeschwächt. Ab dem achten Knoten steht die volle Begegnung.

Und die Welt wächst mit dir: die Gegnerhärte hängt an deiner Truppgröße. Der
Anstieg ist flacher als der Zugewinn einer zusätzlichen Einheit — wachsen lohnt
sich immer, aber ein Trupp von zwei kämpft nicht gegen die Wand, für die sechs
gedacht waren.

## Nach dem Kampf: Ergebnis, dann Verwaltung

Ein Kampf läuft über **drei Bildschirme**:

1. **Kampf** — die Auflösung, Zug für Zug. Nichts anderes ist zu sehen.
2. **Ergebnis** — Sieg oder Niederlage, die gewonnenen Magicule groß, dazu
   Zugzahl, wer noch steht und wer gefallen ist. Hier wird auch verschlungen.
3. **Verwaltung** — nach der Bestätigung: der Markt, dein Trupp, Aufstellung,
   Ausrüstung, Aufstiege und die Verkaufsfläche.

**Ein gewonnener Kampf bringt nur Magicule** — keine Belohnungskarte mehr. Was
die Beute eingebracht hat, gibst du in der Verwaltung aus.

Jeder Posten steht **ausführlich** da — bei einer Einheit ihre Signatur, ihre
erste Passive und ihre Werte auf Rang C; bei einem Relikt seine Wirkung und ob
die Bedingung bei deinem Trupp greift; bei Ausrüstung, was sie tut. Fehlen dir
Magicule, steht dabei, wie viele.

Es gibt **keinen Händler-Knoten** mehr auf der Karte — der wäre doppelt. Die
freien Slots sind Kämpfe geworden.

### Namensweihe

Ein Rangaufstieg für **80 % des regulären Preises** — aber du suchst die Einheit
nicht aus. Das Ziel wird beim Aufbau des Markts **ausgelost** und steht für diese
Verwaltung fest; es steht im Titel des Postens. Weil der Preis am Rang des Ziels
hängt, kostet ein Sprung auf S mehr als einer auf B (112 / 240 / 448 ✦).

Das macht sie zur Wette statt zur Abkürzung: Fällt das Los auf die Einheit, die
du ohnehin hochziehen wolltest, ist es ein Schnäppchen. Sonst hebst du den Rang
regulär — oder nimmst sie trotzdem, weil billig billig ist. Verkaufst du das
Ziel, verfällt der Posten.

### Verkaufen

Einheit, Ausrüstung oder Relikt auf die **Verkaufsfläche ziehen** — sie steht
überall dort, wo auch dein Trupp steht. Es gibt **ein Viertel** dessen zurück,
was darin steckt: bei einer Einheit Anwerbepreis plus Rangaufstiege, ihre
Ausrüstung wandert in den Beutel. Während der Kampfauflösung ist das gesperrt.

## Magicule — die einzige Währung

Es gibt kein Gold mehr. **Alles kostet Magicule**: Rangaufstiege, Einheiten,
Ausrüstung, Relikte. Jeder gewonnene Kampf bringt welche, und jeder ausgegebene
Punkt fehlt woanders. Genau darin liegt die Entscheidung — ein Relikt für 340
ist ein verzichteter Aufstieg von C auf B plus die Hälfte des nächsten.

| Was | Preis |
|---|---|
| Rang C → B / B → A / A → S | 140 / 300 / 560 |
| Einheit im Laden | 130 + 45 je Kostenpunkt |
| Relikt im Laden | 340 |
| Namensweihe (ein Rang, günstiger) | 80 % des regulären Rangpreises |
| Ausrüstung | das Dreifache ihres Grundwerts |

Zurück bekommst du etwas nur beim **Entlassen**: ein Viertel dessen, was in der
Einheit steckt (Anwerbung plus Rangaufstiege), und ihre Ausrüstung wandert in
den Beutel. Während eines Kampfes geht das nicht.

## Der Run

Den Boss des laufenden Akts siehst du von Anfang an — mit allen Fähigkeiten im
Tooltip. Wer weiß, dass Charybdis Flächenschaden austeilt und Gift streut, baut
anders als jemand, der es erst am achten Knoten erfährt.

**2 Akte à 8 Knoten**, je einer mit Boss am Ende. Die Gegner laufen dabei
weiter über alle fünf Inhaltsstufen der Handlung — sie steigen jetzt nur
*innerhalb* des Akts statt mit der Aktnummer:

| Akt | Knoten | Wo | Boss aus Pool |
|---|---|---|---|
| 1 | 1–4 | Jura-Wald | — |
| 1 | 5–8 | Höhlen, Orks und Gruften | Charybdis · Clayman · Milim Nava |
| 2 | 1–3 | Falmuth und die Dämonen | — |
| 2 | 4–6 | Die Westliche Heilige Kirche | — |
| 2 | 7–8 | Nacht über Ruberios | Hinata Sakaguchi · Luminous Valentine |

Welcher Boss kommt, wird beim Run-Start aus seinem Pool gezogen und steht ab
dem ersten Knoten in der Vorschau. Je vier Bosse pro Pool.

**Bosse treten allein an** — kein Gefolge, das den Schaden verteilt, dafür
deutlich mehr Leben. Und sie **eskalieren**: mit jedem eigenen Zug +6 % Angriff,
gedeckelt bei +100 %. Ein Bosskampf ist damit ein Tempo-Check — wer nicht
abräumt, verliert allmählich. Ohne die Eskalation entscheidet sich ein Kampf
gegen einen einzelnen Gegner in der ersten Runde: gemessen sprang die Siegquote
von 100 auf 0 %, sobald der Boss 10 % stärker wurde.

An jedem Knoten wählst du zwischen **drei Wegen** — und die Vorschau zeigt dir
vorher, welche Gegner dort stehen, welche Werte sie haben und welche Fähigkeiten
sie einsetzen. Ein Heiler in der gegnerischen Reihe ist ein Grund für Brand, ein
einzelner harter Gegner ein Grund für Frost. Am Ende jedes Akts steht ein Boss.

Die **Wegleiste** unter der Kopfzeile zeigt den ganzen Akt: welche Knotenarten an
welcher Stelle zur Wahl stehen, wo du gerade bist und welcher Boss am Ende
wartet. Fünf verlorene Kämpfe beenden den Run — danach werden zwei neue Karten
dauerhaft freigeschaltet.

Weil ein Run über fünf Akte läuft, reichen die Magicule jetzt bis **Rang S**:
gemessen erreicht ein sauber gespielter Trupp neun bis zehn Rangstufen.

Kämpfe laufen **von allein** ab. Du greifst nicht ein. Alles entscheidet sich
vorher.

## Die Knoten

Die Wahl auf der Karte ist die **Art** des Knotens, nicht ein bekannter Gegner.
Was genau antritt, siehst du erst im Kampf — nur der Boss des Akts steht von
Anfang an fest.

| Knoten | Was dich erwartet |
|---|---|
| **Kampf** | Eine gewöhnliche Begegnung, eine Belohnung zur Wahl |
| **Elite-Kampf** | Härter besetzt, würfelt die Belohnung eine Stufe besser |
| **Kampfherausforderung** | Deutlich härtere Gegner plus eine angesagte Auflage |
| **Ereignis** | Zwei bis drei Optionen, Ausgang steht an der Option |
| **Lager** | Magicule, ein Ausrüstungsstück oder dauerhafte Werte |
| **Boss** | Abschluss des Akts, tritt allein an und eskaliert |

### Kampfherausforderung

Vier mögliche Auflagen: **ohne einen Verlust**, **kurzer Prozess** (höchstens 22
Züge), **unversehrt** (die vorderste Einheit bleibt über drei Vierteln) oder
**in Unterzahl** (nur die ersten zwei Einheiten treten an). Die Auflage steht
vorher auf der Karte.

Hältst du sie, gibt es ein **zweites Belohnungsangebot** obendrauf. Verfehlst du
sie, bleibt es bei der gewöhnlichen Belohnung — verloren ist nichts außer dem
Risiko, das der härtere Kampf mitbringt. Gemessen werden rund 62 % der
angenommenen Auflagen gehalten.

## Eine Einheit je Art

Von jeder Art steht genau eine Einheit im Trupp: Slime, Goblin, Oger, Sturmwolf,
Echsenmensch, Insektoid, Dämon, Drache, Untot. Nimmst du Gobta, ist der
Goblin-Platz belegt — Rigurd bekommst du erst, wenn du Gobta entlässt.

Es gibt **keine Völker-Boni**. Ein Trupp ist nicht stark, weil er aus Goblins
besteht, sondern weil seine Fähigkeiten zusammenpassen.

## Ränge

| Rang | Item-Slots | Aktive | Passive | Prädator | Kosten |
|---|---|---|---|---|---|
| C | 1 | 1 (Signatur) | – | – | Start |
| B | 2 | 1 (Signatur) | 1 | 1 | 140 ✦ |
| A | 3 | 1 (Signatur) | 2 | 2 | 300 ✦ |
| S | **5** | 1 (Signatur) | 3 | 3 | 560 ✦ |

**Die aktive Fähigkeit ist immer die Signatur — sie ändert sich nie.** Alles,
was eine Einheit darüber hinaus lernt, ist passiv. Jeder Aufstieg gibt +30 %
Leben und Angriff, +1 Rüstung, +1 Tempo, einen Item-Slot (auf S zwei), einen
Prädator-Slot und **eine Passive zur Wahl**:

- Einheiten mit eigenen **Linien** (bisher Shion und Souei) wählen aus **vier** —
  je eine aus Angriff, eigener Mechanik, Unterstützung und Defensive.
- Alle anderen wählen aus **drei**: ihrer eigenen nächsten Passive plus zwei aus
  der geteilten Bibliothek, die zu ihren Schlüsselwörtern passen.

Verzichten ist erlaubt, kostet dann aber den Slot.

Magicule sind knapp. Vier Einheiten auf Rang B oder eine auf S? Das ist die
Frage, die jeden Run prägt.

## Aktiv und Passiv

**Es gibt keine Abklingzeiten.** Die Signatur feuert in **jedem** Zug und ersetzt
den normalen Angriff. Damit ist Tempo direkt Schlagkraft: jeder zusätzliche Zug
ist ein zusätzlicher Einsatz.

Manche Signaturen warten aber auf ihre **Lage**, und das steht in ihrem Text: der
Heilige Segen geht erst los, wenn jemand verwundet ist, das Todesurteil erst
gegen ein angeschlagenes Ziel, der Klingensturm erst, wenn mindestens zwei Gegner
stehen. Solange die Lage nicht da ist, schlägt die Einheit normal zu — sonst
würde dein Heiler einen unverletzten Trupp heilen, während der Gegner zuschlägt.

Jede Einheit hat ihre **einzigartige Signatur**, die es sonst nirgends gibt.
Signaturen haben immer zwei Teile: eine Grundwirkung und eine Bedingung, die sich
zu erfüllen lohnt. Benimarus *Kurenai* setzt 4 Brand — brannte das Ziel schon,
springt die Flamme auf alle anderen über. Shions *Chaosschlag* legt Chaos nach
ihrer Entwicklungsstufe an, Soueis *Stahlfaden* markiert das Ziel für den ganzen
Trupp. Signaturen tragen **keine Raritätsstufe** — sie stehen in keinem Angebot,
also wäre die Stufe nur Farbe.

**Passive** wirken dauerhaft: Gift bei jedem Treffer, Schild zu Kampfbeginn,
Konterschaden, Wiederkehr nach dem Tod. Sie sind der ganze Fortschritt einer
Einheit.

Auch der **Prädator** liefert Passive: die Fähigkeit eines verschlungenen Gegners
hängt sich als weitere Passive an.

## Aufstellung

Die Reihenfolge im Trupp ist die Frontlinie: **vorn steht, wer zuerst getroffen
wird.** Wen ein Angreifer trifft, hängt an seiner Rolle:

| Rolle | Zielt auf |
|---|---|
| Frontlinie | die gegnerische Front |
| Fernkampf | die gegnerische **Hinterreihe** |
| Magier | das Ziel mit dem **wenigsten Leben**, ignoriert 60 % Rüstung |
| Unterstützer | heilt den am stärksten verwundeten Verbündeten, wenn keine Fähigkeit bereit ist |
| Verstärker | normaler Angriff |

**Umstellen geht in zwei Schritten**: in der Zeile über dem Trupp die eine
Einheit antippen, dann die andere — die beiden tauschen den Platz. Die Pfeile
▲▼ an jeder Karte bleiben für die Feinkorrektur. Der Strich in der Zeile
markiert, ab wo die Deckung greift.

## Deckung

Ab Platz 3 gibt eine Einheit **ein Drittel jedes Treffers an die vorderste
lebende Einheit ab**. Ein zäher Körper vorn schützt die Reihe dahinter also
wirklich — Gift und Brand gehen daran allerdings vorbei. Wer seinen Trupp
sinnvoll aufstellt statt ihn zu lassen, wie er kam, gewinnt messbar öfter.

## Relikte mit Bedingung

Manche Relikte wirken nur unter einer Voraussetzung — *Einsamer Pfad* braucht
höchstens drei Einheiten, *Zeichen der Brutmutter* mindestens eine
Gift-Fähigkeit. Auf der Karte steht deshalb **Bedingung erfüllt** oder **derzeit
wirkungslos**, und in deiner Reliktliste schläft ein Relikt sichtbar (💤), wenn
sein Fall gerade nicht eintritt. Der Händler bietet solche Relikte bevorzugt
dann an, wenn sie zu deinem Trupp passen.

## Schlüsselwörter — hier liegen die Kombos

Jede Fähigkeit trägt Schlüsselwörter: was sie **erzeugt** (Quelle) und was sie
**verstärkt**. Die Anzeige unter dem Trupp zählt beides zusammen.

| Schlüsselwort | Wirkung | Grenze |
|---|---|---|
| Gift | knapp 2 Schaden je Stapel pro eigenem Zug | – |
| Brand | 2 Schaden je Stapel pro Zug, halbiert Heilung | – |
| Frost | Zug fällt aus | 1, Bosse widerstehen zu 60 % |
| Verderbnis | Ziel nimmt +10 % Schaden je Stapel | – |
| Schild | fängt Schaden ab, baut sich nicht ab | 60 % des Lebens |
| Heilung | Regeneration, Lebensraub, Wiederbelebung | – |
| Konter | Schaden zurück an den Angreifer | – |
| Exekution | mehr Schaden gegen angeschlagene Ziele | – |
| Fläche | trifft mehrere Gegner | – |
| Tempo | mehr Züge, also öfter die eigene Signatur | – |
| Chaos | Werte des Ziels würfeln jede Runde neu, Fähigkeiten verpuffen | – |
| Verwundbar | JEDER Angreifer schlägt 15 % je Stapel mehr Rüstung durch | – |
| Blutung | gut 1 % des maximalen Lebens je Stapel pro Zug | – |
| Schatten | je Stapel 7 % Chance, einem Treffer GANZ auszuweichen (max. 60 %) | – |
| Dunkelheit | je Stapel 7 % weniger Schaden, den das Ziel AUSTEILT (max. 60 %) | – |
| Licht | heilt je Stapel 1,5 % pro Zug, löscht Dunkelheit, trägt durch Schatten | – |
| Donner | lädt auf; ab 6 Stapeln entlädt er sich in die GANZE gegnerische Reihe | – |

**Stapel sind unbegrenzt.** Wer eine Linie zu Ende baut, sieht das auch an der
Zahl. Gedeckelt wird nur die Wirkung dort, wo sie sinnlos würde: der Chaos-Faktor
fällt nie unter 15 %, die Fehlschlagchance nie über 75 %. Einzige Ausnahme ist
**Erstarrung** — sie ist ein Schalter, kein Stapel: ein Zug fällt aus, mehr nicht.

Ein Build ist erst rund, wenn **Quellen und Verstärker zusammenkommen** — die
Anzeige markiert ihn dann grün. Zwei Quellen plus ein Verstärker sind die
Schwelle, ab der ein Trupp messbar besser dasteht: mit Build gewinnt er etwa
doppelt so oft wie ohne. Relikte und Ausrüstung zählen dabei mit: Apitos
Giftstachel legt 5 Gift an, Giftzahn schlägt +30 % auf vergiftete Ziele, das
Relikt *Zeichen der Brutmutter* gibt für jede Gift-Fähigkeit im Trupp +7 %
Angriff. Einzeln solide, zusammen ein Build.

### Resonanz

**Drei Teile derselben Linie — Fähigkeiten, Ausrüstung und Relikte zusammen —
schalten für den ganzen Trupp einen Bonus frei.** Die Synergie-Anzeige markiert
das golden, der Tooltip sagt dir vorher, wie viele Teile noch fehlen.

| Linie | Resonanz |
|---|---|
| Gift | Gift richtet 20 % mehr Schaden an |
| Brand | Brand richtet 20 % mehr Schaden an |
| Frost | gegnerischer Widerstand gegen Erstarrung sinkt um 30 % |
| Verderbnis | +13 % Schaden je Stapel statt +10 % |
| Schild | alle Schilde 15 % stärker |
| Heilung | alle Heilung 15 % stärker |
| Tempo | der ganze Trupp 6 % schneller |
| Konter | jede Einheit wirft 4 plus 10 % ihres Angriffs zurück |
| Exekution | +15 % Schaden gegen Ziele unter 35 % Leben |
| Fläche | +8 % Schaden, solange mindestens zwei Gegner stehen |

Es resoniert immer nur die **stärkste** Linie. Vier Boni nebenher einzusammeln
wäre kein Build, sondern nur ein volles Inventar — die Regel zwingt zur
Entscheidung, worauf du baust. Gegner spielen nach derselben Regel.

## Raritätsstufen

Einheiten, Fähigkeiten, Ausrüstung und Relikte tragen eine von fünf Stufen:

| Stufe | Bedeutung |
|---|---|
| Üblich | Grundsolide Werte ohne Eigenheit. |
| Ungewöhnlich | Ein klarer Effekt, der schon einen Build tragen kann. |
| Selten | Deutlich stärker oder an eine Bedingung geknüpft. |
| Episch | Verändert, wie der Trupp kämpft. |
| Legendär | Run-definierend. |

Die Stufe ist nicht nur Farbe: sie steuert, **wie wahrscheinlich etwas
angeboten wird**. In Akt 1 dominiert Übliches, in Akt 3 tauchen Episches und
Legendäres deutlich öfter auf. Elite- und Bosskämpfe würfeln eine Stufe besser
als normale Kämpfe, und je höher der Rang einer Einheit, desto besser der Topf,
aus dem beim Aufstieg die drei Fähigkeiten gezogen werden.

Die Signatur einer Einheit hat immer dieselbe Stufe wie die Einheit selbst.

## Prädator

Nach jedem gewonnenen Kampf darfst du **einen** besiegten Gegner verschlingen.
Seine Fähigkeit wandert dauerhaft in eine Einheit deiner Wahl. Freie
Prädator-Slots gibt es erst ab Rang B — auf Rang C kannst du nichts behalten.

Die Auswahl zeigt die Fähigkeit selbst mit ihrer Wirkung, nicht den Gegner.
Auf der Einheit steht sie danach mit Namen und Beschreibung, und ihre
Schlüsselwörter zählen für deine Synergie-Anzeige mit: ein verschlungener
Giftbiss macht aus einer Gift-Quelle zwei.

## Gold und Ausrüstung

Gold gibst du beim Händler aus, und es reicht nie für alles. Drei Dinge
konkurrieren um denselben Beutel:

- **Einheiten** (65–180 Gold) — mehr Körper, eine neue Art, eine neue Signatur.
- **Ausrüstung** (35–100 Gold) — macht eine vorhandene Einheit deutlich besser.
- **Namensweihe** (130 Gold) — ein Rang ohne Magicule, für eine Einheit deiner Wahl.

Ausrüstung liegt im Beutel, bis du sie einer Einheit anlegst — die Slots hängen
am Rang. Ein Teil der Ausrüstung schaut darauf, **wen** du ausrüstest: der
Handschuh der Brutmutter wirkt nur bei einer Einheit, die selbst Gift erzeugt,
die Zwillingsklinge zahlt sich erst ab Rang B aus, das Rangabzeichen ist auf
Rang C wertlos.

## Wann Zustände ticken

Das ist die eine Regel, die man kennen muss, weil sie fast jede Rechnung
verschiebt: **Zustände ticken nicht pro Runde, sondern einmal je Zug ihres
Trägers** — am Anfang seines Zuges, in fester Reihenfolge (Gift, Brand, Blutung,
Verderbnis, Licht, Schatten, Dunkelheit, Verwundbar, Chaos, Regeneration,
Erstarrung).

Zwei Folgen daraus:

- **Tempo verstärkt Schaden über Zeit.** Ein schneller Gegner brennt und blutet
  in derselben Zeit öfter als ein langsamer. Wer den Gegner beschleunigt — oder
  einen langsamen Boss vergiftet — rechnet daran vorbei.
- **Erstarrung schützt nicht davor.** Der ausgesetzte Zug tickt trotzdem.

Je Stapel und Tick: Gift 1,7 Schaden, Brand 2 (und halbiert jede Heilung),
Blutung 1,2 % des maximalen Lebens, Licht heilt 1,5 %. Alle drei
Schadensarten gehen durch Schilde. Verderbnis und Verwundbar ticken gar nicht —
sie liegen einfach und verändern, was ankommt.

**Kombinationen.** Drei Zustandspaare reagieren aufeinander, und sie sind der
Grund, warum ein gemischter Bau mehr sein kann als die Summe seiner Teile:

- **Verpuffung** — Brand trifft Gift, zusammen mindestens 8 Stapel. Beide
  verbrennen und richten je Stapel 3 Schaden an, der durch Schilde geht.
- **Splitter** — Erstarrung auf einen mit Donner geladenen Gegner entlädt die
  Ladung sofort, statt auf die Schwelle zu warten.
- **Aufgerissen** — Blutung auf ein Ziel mit mindestens 3 Verwundbar fällt 50 %
  größer aus.

Alle drei haben eine Schwelle. Ein reiner Ein-Schlüsselwort-Bau löst sie nie
aus — ihm fehlt der Partner. Wer mischt, bekommt dafür etwas, was Stapeln
allein nicht gibt.

**Abbau und die vier Ausnahmen.** Normalerweise verliert jeder Zustand pro
Trägerzug einen Stapel. Fünf Fähigkeiten setzen das aus: Benimarus *Dauerbrand*,
Adalmanns *Verfluchtes Wort*, Diablos *Ewige Nacht*, Soueis *Offene Wunde* und
Shions *Gesetzlosigkeit*. Der Unterschied ist keine Feinheit, sondern eine
Größenordnung — ein Brand, der nicht abbaut, tickt gemessen 150 statt 6 Mal.
Wer eine davon zieht, sollte den Trupp darum herum bauen.

Schild ist der einzige Zustand, der sich überhaupt nicht abbaut: er wird nur
verbraucht, und höchstens 60 % des maximalen Lebens liegen gleichzeitig darauf.
Donner baut sich ebenfalls nicht ab, sondern lädt bis zur Schwelle und entlädt
sich dann in die ganze Reihe.

## Nachschlagen im Spiel

Fast jedes Element hat einen Tooltip: Art, Rolle, Rang, jede aktive und passive
Fähigkeit, Ausrüstung, Relikte, Statusmarken im Kampf, die Werte oben in der
Leiste und die Knoten auf der Karte. Am Rechner beim Überfahren, am Handy beim
Antippen.

Alles zusammen steht unter **Menü → Glossar**: Zustände, Schlüsselwörter,
Rollen, Arten und Begriffe wie Rang, Prädator, Aufstellung — sowie „Ticken" und
„Abbau" für die Regeln oben.

## Tipps

- Zwei Quellen plus ein Verstärker desselben Schlüsselworts schlagen fast immer
  vier zusammengewürfelte Fähigkeiten.
- Lass einen aktiven Slot frei, wenn du auf eine bestimmte Gegnerfähigkeit
  spekulierst — der Prädator füllt ihn.
- Fähigkeiten mit langer Abklingzeit verdrängen die kurzen. Ein Wuchtschlag
  (cd 3) neben einer Signatur (cd 2) heißt: die Signatur kommt seltener.
- Verderbnis stapelt nur bis 5, Frost nur bis 2 — der Rest ist verschenkt.
- Rang S auf der vordersten Einheit plus *Anführerkrone* ist eine eigene
  Strategie: fünf Item-Slots auf einem Körper.

## Chaos und Shions Linien

**Chaos** ist kein Schaden, sondern Unberechenbarkeit. Wer Chaos trägt, würfelt
zu Beginn jedes eigenen Zuges Angriff, Rüstung und Tempo neu aus — je Stapel um
bis zu 6 % nach oben *oder* unten —, und jede aktive Fähigkeit verpufft mit 5 %
Chance je Stapel, ohne dass die Abklingzeit ausbleibt. Der Tooltip an der
Chaos-Marke zeigt den Wurf der laufenden Runde.

**Antichaos** ist dieselbe Mechanik, invertiert: dieselbe Streuung, aber nur
nach oben und ohne Fehlschlag.

Shions Signatur **Chaosschlag** legt Chaos nach ihrer Entwicklungsstufe an —
C Oger 1 Stapel, B Teufel 2, A Verdorbener Teufel 3, S Ultimativer Teufel 5.
Sie ist damit die erste Einheit mit **wählbaren Passiven**: vier Linien à vier
Stufen, insgesamt sechzehn.

| Linie | Worum es geht | Stufe 1 |
|---|---|---|
| Angriff | Chaos in eigene Werte umsetzen | Chaosrausch |
| Chaos-Mechanik | das Chaos selbst schärfen | Chaosmeisterschaft |
| Unterstützung | Antichaos für den Trupp | Realitätswarp |
| Defensive | Oger-Fleisch | Ogerschild |

Beim Anwerben und bei **jedem Aufstieg** wählst du **eine aus vier** — eine je
Linie, auf der Stufe, die dem Rang entspricht. Verzichten ist erlaubt. Gemessen
lohnt sich das Mischen: eine Shion mit je einer Passiven aus verschiedenen
Linien steht deutlich besser da als eine, die eine Linie durchzieht.

## Schatten, Dunkelheit und Licht

Drei Elemente, die etwas tun, das es sonst nirgends gibt:

- **Schatten** liegt auf der *eigenen* Einheit und lässt sie Treffern **ganz
  ausweichen** — das erste Element, das Schaden vermeidet statt ihn abzufedern.
- **Dunkelheit** liegt auf dem *Gegner* und senkt, was er **austeilt**. Alle
  anderen Marken erhöhen, was er einsteckt; Dunkelheit nimmt ihm die Wucht. Gegen
  Zustandsschaden hilft sie nicht.
- **Göttliches Licht** liegt auf der eigenen Einheit, heilt stetig, brennt
  Dunkelheit weg — und ihre Angriffe gehen **durch fremde Schatten hindurch**.
  Es ist die Antwort auf beide Finsternis-Elemente.

Der **Schattenwolf** trägt Schatten und Dunkelheit, **Shuna** das Licht.

### Donner

Das vierte neue Element arbeitet als einziges mit einer **Schwelle**: Donner
bleibt liegen und tut nichts — bis sechs Stapel zusammenkommen. Dann **entlädt**
er sich und trifft die **ganze Reihe** des Trägers für 1,2 % ihres maximalen
Lebens je Stapel, und die Ladung beginnt von vorn. Gift und Brand ticken stetig,
Verwundbar und Verderbnis wirken dauerhaft — Donner sammelt und schlägt zu.

Deshalb lohnt es sich, **viele Gegner gleichzeitig** aufzuladen. **Ranga** trägt
ihn, zusammen mit Schatten: er lädt die Reihe auf und steht selbst in Deckung.
Die Donner-Resonanz senkt die Schwelle von sechs auf vier.

## Souei und die Marke

Souei ist der Gegenentwurf zu Shion: er baut nicht sich auf, sondern reißt das
Ziel für die anderen auf. **Stahlfaden** macht verwundbar — 1 Stapel auf Rang C,
2 auf B, 3 auf A, 5 auf S. Jeder Stapel lässt *jeden* Angreifer 15 % mehr
Rüstung durchschlagen, nicht nur Souei selbst. Das ist der Haken, an dem seine
Unterstützungslinie hängt.

| Linie | Worum es geht | Stufe 1 |
|---|---|---|
| Angriff | die Marke in eigenen Schaden umsetzen | Schattenschnitt |
| Chaos-Mechanik | die Marke selbst schärfen | Zielsicherheit |
| Unterstützung | der Trupp schlägt in die Wunde | Gezeichnetes Ziel |
| Defensive | Fäden und Schatten | Schattenschritt |

Seine Unterstützungslinie ist die stärkste im Spiel und seine Angriffslinie die
schwächste — das ist Absicht. Wer Souei nimmt, baut einen Trupp um ihn herum:
*Gezeichnetes Ziel* gibt allen +6 % Schaden je Stapel, *Blutspur* und *Giftmal*
lassen den ganzen Trupp Blutung oder Gift anlegen, *Jagdbefehl* schickt alle auf
dasselbe markierte Ziel.

Shion und Souei sind beide Oger — und es darf nur **eine Einheit je Art** im
Trupp stehen. Die Wahl zwischen ihnen ist also eine echte Weggabelung.

Alle anderen Einheiten behalten vorerst ihre drei festen Passiven, die mit dem
Rang aufschalten.
