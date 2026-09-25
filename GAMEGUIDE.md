# Tensura Guild — Spielanleitung

## Bedrohungsstufen

Die Langzeitschicht. Nach jedem Sieg geht die nächste Stufe auf, und **jede
schaltet eine Regel frei — keine Prozentzahl.** Eine Prozentzahl verlangt einen
stärkeren Trupp, eine Regel verlangt einen anderen. Die Regeln sind kumulativ.

| Stufe | Name | Regel | Was sie vom Spiel verlangt |
|---|---|---|---|
| 0 | Jura-Wald | — | Der normale Weg. |
| 1 | Überzahl | Jede Begegnung bringt einen Gegner mehr mit (75 % der Werte) | Fläche und Konter werden wertvoll, reiner Einzelzielschaden verliert |
| 2 | Nachschub | Jeder normale Gegner steht einmal mit 30 % Leben wieder auf — Bosse nicht | Exekution allein räumt nicht mehr ab — Gift, Brand und Blutung tragen weiter |
| 3 | Kriegsrecht | Der Markt bietet zwei Einheiten statt vier | Du gewinnst weitgehend mit dem Trupp, den du hast |
| 4 | Belagerung | Im zweiten Akt steht auf jedem zweiten Kampfknoten eine Elite — zur Beute eines normalen Kampfes; das Lager gibt 15 % weniger | Kein ruhiger Knoten mehr; die Route wird zur Überlebensfrage |
| 5 | Sturmgott | 25 % weniger Magicule, vier Leben statt fünf, Bosse eskalieren doppelt so schnell | Tempo: wer den Boss nicht schnell legt, verliert ihn |

Welche Regeln gerade gelten, steht über der Karte, und die **aktuelle Stufe
steht dauerhaft in der Kopfzeile** (⚠). Ein kleines `+1` daneben heißt: eine
höhere ist frei, du spielst aber gerade eine niedrigere.

**Die Stufe steigt, sobald du einen Run gewinnst** — ein verlorener Run ändert
nichts. Umstellen kannst du sie jederzeit im Menü unter *Fortschritt*; das setzt
den laufenden Run neu auf.

Gemessen mit `node dev/balance.js 1200 --stufe N` (Phase 101): 53 / 42 / 34 /
26 / 20 / 6 % Siegquote. Die Werteschraube läuft nur leise nebenher — die Härte
kommt aus den Regeln.

## Der Tagesrun

Im Menü startet **Tagesrun** einen Run, dessen Seed aus dem Datum kommt:
dieselben Startpaare, dieselben Märkte, derselbe Boss für alle, die heute
spielen. Er läuft auf Stufe 0 mit frischem Freischaltstand und ändert deinen
eigenen Fortschritt nicht. Gemerkt wird dein bestes Ergebnis des Tages.

## Erfolge und Chronik

Im Menü unter *Fortschritt* stehen elf **Erfolge** — Ziele, die zu einer
anderen Spielweise einladen: ohne Rückschlag gewinnen, mit drei Keystones, ohne
Rang S, mit höchstens vier Einheiten, jeden Boss einmal besiegen … Sie machen
nichts stärker. Daneben die **besiegten Bosse** und eine **Chronik** der
letzten zwanzig Runs. Auch ein Tagesrun zählt für Erfolge und Chronik.

## Der Start

**Ein Anfang aus vier.** Jeder ist ein Paar: eine Einheit und ein Relikt, das zu
ihren Schlüsselwörtern passt. Mehr hast du nicht — der Rest wird erkämpft.
Weder Einheit noch Relikt kommen doppelt vor, damit jede der vier Karten
wirklich eine andere Richtung ist. Die Start-Relikte sind höchstens
**ungewöhnlich** — Seltenes, Episches und Legendäres wird erspielt, nicht
ausgewürfelt.

Die ersten Knoten sind entsprechend gestaffelt: **der erste Knoten ist ein
einzelner Kampf, 1 gegen 1 und stark abgeschwächt** — er ist keine Wahl und kaum
zu verlieren. Die nächsten gehen gegen zwei, dann drei, und die Gegner sind dabei
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

### Einheiten kommen fertig aus dem Markt

**Ränge werden nicht gekauft.** Es gibt kein „Aufwerten" an der Einheit und keine
Namensweihe mehr. Stattdessen stehen im Markt **vier Einheiten**, jede schon auf
ihrem Rang und mit den Passiven, die zu diesem Rang gehören:

| Rang | Passive dabei |
|---|---|
| C | 1 |
| B | 2 |
| A | 3 |
| S | 4 |

**Welche Ränge im Markt stehen, hängt am Fortschritt** — und es sind immer nur
zwei benachbarte. Das Fenster wandert mit:

| Wo du bist | Angebot |
|---|---|
| der Anfang | 70 % C, 30 % B |
| kurz danach | 95 % B, 5 % A — C ist durch |
| die Mitte | 45 % B, 55 % A |
| weiter | 10 % B, 90 % A |
| das Endspiel | 85 % A, **15 % S** |

Ein C-Posten im Endspiel wäre ein toter Posten, und genau den gibt es nicht mehr.
Elite- und Bosskämpfe schieben das Fenster eine Stufe nach oben (dann 70 % A,
30 % S).

**S bleibt selten, auch am Ende.** Vor dem Endspiel kommt es überhaupt nicht vor;
dort steht in etwa jedem zweiten Markt eines (47 % Chance auf mindestens ein S
unter den vier Posten), und nach einem Elite- oder Bosskampf in drei von vier.
Der beste Ort für ein S ist also der Markt nach einem schweren Kampf — es hängt
an einer Leistung, nicht an der Rundenzahl.

Welche Passiven dabei sind, wird gewürfelt (Keystones mit Nachteil bleiben
draußen). Alles davon steht am Posten, bevor du kaufst: Rang, Werte auf
diesem Rang, und jede einzelne Passive mit ihrem Text.

**Keystones** sind die vierte Stufe jeder Linie: sie ändern eine Regel und
kosten dafür etwas. Angeboten werden sie, wenn du eine eigene Einheit auf
höherem Rang kaufst — die neuen Plätze wählst du dann selbst, der Keystone ist
mit ★ markiert. Wer einen nimmt, bekommt obendrauf **+15 % Leben und
Angriff**; ablehnen kannst du ihn immer.

**Aufwerten heißt jetzt: eine bessere Fassung derselben Art kaufen.** Steht die
Art schon in deinem Trupp, ist der Posten eine Aufwertung — er ersetzt die alte
Einheit, und ihr **ganzer Einsatz wird angerechnet** (nicht nur ein Viertel wie
beim Entlassen). Netto zahlst du also die Differenz. Angeboten wird eine belegte
Art nur mit höherem Rang; eine schwächere Fassung wäre kein Aufstieg. Die
Ausrüstung der alten Einheit bleibt angelegt — die neue Fassung hat mindestens
so viele Slots.

Ein Gratisaufstieg kommt weiterhin aus dem **Lager** — das ist eine Belohnung,
kein Kaufposten.

### Drill

Übriges Geld geht in den **Drill**: der ganze Trupp — auch wer später
dazukommt — erhält für den Rest des Runs +4 % Leben und Angriff. Der erste
kostet 200 ✦, jeder weitere das Doppelte. Neu würfeln, Einheiten, Drill:
dieselben Magicule, drei Wege.

### Neu würfeln

Passt nichts, würfelst du den Markt neu — derselbe Markt, frisch gezogen, für
50 ✦. Jeder weitere Wurf im selben Markt kostet das Doppelte (100, 200, 400 …).
So suchst du gezielt eine höhere Fassung einer eigenen Einheit, und damit die
Keystone-Wahl. Gekauftes bleibt gekauft.

### Verkaufen

Einheit, Ausrüstung oder Relikt auf die **Verkaufsfläche ziehen** — sie steht
überall dort, wo auch dein Trupp steht. Es gibt **ein Viertel** dessen zurück,
was darin steckt: bei einer Einheit Anwerbepreis plus Rangaufstiege, ihre
Ausrüstung wandert in den Beutel. Während der Kampfauflösung ist das gesperrt.

## Magicule — die einzige Währung

**Alles kostet Magicule**: Einheiten, Ausrüstung, Relikte. Jeder gewonnene
Kampf bringt welche, und jeder ausgegebene Punkt fehlt woanders. Genau darin
liegt die Entscheidung — ein Relikt für 340 ist eine höhere Fassung einer
Einheit, die du dafür nicht kaufst.

| Was | Preis |
|---|---|
| Einheit auf Rang C | 265 — jede Einheit, kein Aufpreis für die starken |
| dieselbe auf B / A / S | zusätzlich 140 / +300 / +560 |
| Aufwertung (dieselbe Einheit, höherer Rang) | der Paketpreis minus dem ganzen Einsatz der alten Einheit |
| Relikt im Laden | 340 |
| Ausrüstung | das Dreifache ihres Grundwerts |

Eine Einheit auf S kostet also genau so viel wie dieselbe Einheit auf C plus die
drei Aufstiege — der Markt nimmt dir die Arbeit ab, nicht das Geld. Und der
Anwerbepreis ist für **alle Einheiten derselbe**: was du im Markt bezahlst, sagt
nur, auf welchem Rang sie steht, nicht wer sie ist. Ein Goblin und ein
Primordial kosten gleich, gedraftet wird nach Trupp, nicht nach Preisschild.

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

Welcher Boss kommt, wird beim Run-Start aus seinem Pool gezogen und zeigt sich
nach dem ersten Kampf. Je vier Bosse pro Pool.

**Jeder Boss hat eine eigene Regel**, und die Vorschau nennt sie. Sie bestraft
einen Bau und belohnt einen anderen — wer sie kennt, baut darauf hin:

| Boss | Regel |
|---|---|
| Charybdis | **Sturmflut** — jede vierte Runde 80 % Schaden auf alle, jeder Schild ist weg |
| Clayman | **Puppenspieler** — reißt dem stärksten Gegner Schild, Antichaos und Schatten weg |
| Milim Nava | **Drachenschuppen** — kein Treffer kostet sie mehr als 4 % ihres Lebens |
| Geld, der Orklord | **Hunger** — frisst Gefallene: +25 % Leben geheilt, +15 % Angriff |
| Hinata Sakaguchi | **Heiliges Schwert** — schüttelt jede Runde Dunkelheit, Chaos, Verderbnis und Marken ab |
| Luminous Valentine | **Ewige Nacht** — ihre Gegner heilen nur halb so stark |
| Razen der Hofmagier | **Barriere** — Schild über 40 % seines Lebens, jede vierte Runde erneuert |
| Roy Valentine | **Bluttausch** — entzieht jedem Gegner jede Runde 3 % Leben |

**Bosse treten allein an** — kein Gefolge, das den Schaden verteilt, dafür
deutlich mehr Leben. Und sie **eskalieren**: mit jedem eigenen Zug +6 % Angriff,
gedeckelt bei +100 %. Ein Bosskampf ist damit ein Tempo-Check — wer nicht
abräumt, verliert allmählich. Ohne die Eskalation entscheidet sich ein Kampf
gegen einen einzelnen Gegner in der ersten Runde: gemessen sprang die Siegquote
von 100 auf 0 %, sobald der Boss 10 % stärker wurde.

Ab dem zweiten Knoten wählst du zwischen **drei Wegen** — Kampf, Elite,
Ereignis, Lager, Kampfherausforderung. Welche Gegner antreten, zeigt der Knoten
nicht, nur seine Art (siehe unten). Am Ende jedes Akts steht ein Boss.

Die **Wegleiste** unter der Kopfzeile zeigt den ganzen Akt: welche Knotenarten an
welcher Stelle zur Wahl stehen, wo du gerade bist und welcher Boss am Ende
wartet. Fünf verlorene Kämpfe beenden den Run (auf Stufe 5 vier) — danach
werden neue Relikte dauerhaft freigeschaltet. Einheiten sind alle von Anfang an
frei.

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

## Jede Einheit nur einmal

Gesperrt ist nur dieselbe Einheit zweimal — die **Art sperrt nichts**. Gobta und
Rigurd dürfen nebeneinander stehen, Shion und Souei auch. Bis Phase 76 war das
anders, und die Regel kam im Spiel als Verlust an: der Markt bot die zweite
Einheit derselben Art als „Aufwertung" an und räumte die erste weg.

Es gibt **keine Völker-Boni**. Ein Trupp ist nicht stark, weil er aus Goblins
besteht, sondern weil seine Fähigkeiten zusammenpassen. Ein paar Art-Eigenheiten
hängen trotzdem an ihr: Goblins skalieren mit dem Rang, Echsenmenschen mit der
Kampfdauer, Insektoiden häuten sich.

## Ränge

| Rang | Item-Slots | Aktive | Passive | Prädator |
|---|---|---|---|---|
| C | 1 | 1 (Signatur) | 1 | – |
| B | 2 | 1 (Signatur) | 2 | 1 |
| A | 3 | 1 (Signatur) | 3 | 2 |
| S (nur einer) | **5** | 1 (Signatur) | 4 | 3 |

**Die aktive Fähigkeit ist immer die Signatur — sie ändert sich nie.** Alles,
was eine Einheit darüber hinaus lernt, ist passiv. Jeder Rang gibt +30 % Leben
und Angriff, +1 Rüstung, +1 Tempo, einen Item-Slot (auf S zwei), einen
Prädator-Slot und eine Passive mehr.

Ränge werden nicht einzeln gekauft: eine Einheit steht im Markt schon auf ihrem
Rang. Kaufst du eine **eigene** Einheit auf höherem Rang, behält sie Passiven,
Ausrüstung und Verschlungenes, und die **neuen Plätze wählst du selbst** — aus
den vier Linien der Einheit (Angriff, eigene Mechanik, Unterstützung,
Defensive). Darunter kann ein ★ **Keystone** sein (siehe oben).

**Nur eine Einheit darf Rang S tragen — der Anführer.** Steht er, bietet der
Markt kein zweites S an. Die Frage ist also nicht, wann jemand S wird, sondern
wer.

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

## Tiefere Systeme

- **Meisterschaft:** jede Passive zählt die Kämpfe, in denen sie ausgelöst
  hat. Ab 3 Kämpfen ✦, ab 8 ✦✦ — jede Stufe gibt dem Träger +3 % Leben und
  Angriff. Die Aufwertung nimmt den Stand mit.
- **Bindungen:** acht Paare aus der Welt schalten einen dritten Effekt frei,
  wenn beide im Trupp stehen (Oger-Geschwister, Sturmbund, Goblinreiter …).
  Sie stehen unter den Synergien; der Markt sagt „🔗 bindet: …".
- **Stapel verbrauchen:** Giftschlag, Glutstoß, Schildsprenger und Blutzoll
  lösen gesammelte Stapel auf einmal aus — weiter aufbauen oder jetzt zünden.
- **Position:** Geschlossene Reihe, Reihenstärke, Lückenschlag und
  Durchbohren lesen, wer auf dem Hexfeld neben wem steht.

**Shion** hat dazu: die **Ausrichtung** (Ordnungsteufel und Verdorbener Teufel
schließen sich aus — wer den einen wählt, ist festgelegt), den **Ultimativen
Teufel** (nur Rang S, 12 Chaos auf den Gegnern und 6 Antichaos auf ihr
zugleich), **Shions Küche** (ein zufälliges Gericht für jeden Verbündeten),
die **Chaosentladung** (ab 10 Chaos: der Gegner erstarrt und trifft danach
einen eigenen Verbündeten) und den **Meisterkoch der Wirklichkeit** (Chaos-Würfe
der Gegner zählen doppelt schlecht, Antichaos-Würfe im Trupp doppelt gut).

## Provokation

**Provokation** ist harter Spott für eine Runde: bis zum nächsten eigenen Zug
greifen **alle** Gegner die provozierende Einheit an, und wer sie noch nicht
erreicht, läuft zu ihr. Das können nur Frontkämpfer — über die
Bibliotheks-Passive **Herausforderung** (jeden dritten Zug, dazu ein Schild)
oder über ihre eigene Passive am Ende der Defensivlinie, jede mit eigener
Handschrift: Gobta duckt sich in Schatten, Rigurd gibt dem Trupp Rüstung,
Shion legt allen Chaos an, der Drachenwelpe setzt alle in Brand …

## Deckung und Spott

**Deckung** hängt an der Lage auf dem Hexfeld: Steht ein lebender Verbündeter
näher am Angreifer als dessen Ziel, übernimmt er **ein Drittel des Treffers**.
Ein zäher Körper vorn schützt die Reihe dahinter also wirklich — Gift, Brand
und Blutung gehen daran allerdings vorbei. Wer seinen Trupp sinnvoll aufstellt
statt ihn zu lassen, wie er kam, gewinnt messbar öfter.

**Spott** ist die Stufe davor. Deckung greift, NACHDEM der Schlag gefallen ist;
Spott greift an der Zielwahl selbst. Wer Spott trägt, zieht jeden Angriff mit
der angegebenen Wahrscheinlichkeit auf sich — egal welche Rolle der Angreifer
hat und wen er eigentlich nehmen wollte. Es ist eine Chance, kein Zwang: der
Rest der Angriffe geht weiter nach Rolle, ein Panzer schaltet die gegnerische
Zielwahl also nicht ab.

Zwei Passiven legen ihn an: Gerudos **Alles auf mich** (50 %) und **Der letzte
Wall** des Echsenfürsten (35 %). Beide bezahlen ihn mit ihrem Angriff, und
beide bringen eine Haut mit — 35 % Minderung beim einen, ein Schadensdeckel
beim anderen. Das ist kein Zufall: Ziehen ohne Zähigkeit heißt nur, schneller
zu sterben und den Trupp danach ungedeckt stehen zu lassen.

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

Fähigkeiten, Ausrüstung und Relikte tragen eine von fünf Stufen. **Einheiten
nicht** — jede Einheit liegt gleich häufig im Markt, was sie kostet und auf
welchem Rang sie steht, sagt schon genug über sie.

| Stufe | Bedeutung |
|---|---|
| Üblich | Grundsolide Werte ohne Eigenheit. |
| Ungewöhnlich | Ein klarer Effekt, der schon einen Build tragen kann. |
| Selten | Deutlich stärker oder an eine Bedingung geknüpft. |
| Episch | Verändert, wie der Trupp kämpft. |
| Legendär | Run-definierend. |

Die Stufe ist nicht nur Farbe: sie steuert, **wie wahrscheinlich etwas
angeboten wird**. Früh dominiert Übliches, gegen Ende des zweiten Akts tauchen
Episches und Legendäres deutlich öfter auf — bei Ausrüstung und Relikten, nicht
bei Einheiten. Elite- und Bosskämpfe würfeln eine Stufe besser als normale
Kämpfe.

Einheitenspezifisches — Signaturen und die Passiven der Linien — trägt keine
Stufe.

## Prädator

Nach jedem gewonnenen Kampf darfst du **einen** besiegten Gegner verschlingen.
Seine Fähigkeit wandert dauerhaft in eine Einheit deiner Wahl. Freie
Prädator-Slots gibt es erst ab Rang B — auf Rang C kannst du nichts behalten.

Die Auswahl zeigt die Fähigkeit selbst mit ihrer Wirkung, nicht den Gegner.
Auf der Einheit steht sie danach mit Namen und Beschreibung, und ihre
Schlüsselwörter zählen für deine Synergie-Anzeige mit: ein verschlungener
Giftbiss macht aus einer Gift-Quelle zwei.

## Ausrüstung

**Schmelzen:** Zwei Teile derselben Seltenheit im Beutel werden auf Knopfdruck
zu einem zufälligen Teil der nächsten (üblich → ungewöhnlich → selten → episch
→ legendär). So wird aus übriger Ausrüstung etwas Besseres statt eines
Viertels beim Verkauf.

Ausrüstung liegt im Beutel, bis du sie einer Einheit anlegst — die Slots hängen
am Rang. Ein Teil der Ausrüstung schaut darauf, **wen** du ausrüstest: der
Handschuh der Brutmutter wirkt nur bei einer Einheit, die selbst Gift erzeugt,
die Zwillingsklinge zahlt sich erst ab Rang B aus, das Rangabzeichen ist auf
Rang C wertlos.

## Das Schlachtfeld

Der Kampf findet auf einem Hexfeld statt. Die Reihenfolge, die du in der
Aufstellung wählst, wird dort zur Position: **Plätze 1–3 stehen im vorderen
Glied, 4–6 dahinter**, und die Gegner stehen gegenüber.

**Reichweite und Schritte** hängen an der Rolle — und zwar gegenläufig: wer kurz
reicht, läuft weiter.

| Rolle | erreicht | läuft je Zug |
|---|---|---|
| Frontlinie | 1 Feld | 4 Felder |
| Verstärker, Unterstützer | 2 Felder | 3 Felder |
| Fernkampf, Magier | 3 Felder | 2 Felder |

Wer niemanden in Reichweite hat, **läuft** heran — und darf im selben Zug noch
zuschlagen, wenn es dann reicht. Weil kurze Reichweite mit mehr Schritten
zusammengeht, ist **jede Rolle nach einem Zug Anmarsch im Gefecht**. Vorher hatte
jeder zwei Schritte, und der Nahkampf verlor damit die ersten Züge: gemessen
gewannen Fernkampf und Magier 63 %, Verstärker nur 39 %. Reichweite entscheidet
jetzt über die Lage im Kampf, nicht über die Eröffnung.

**Deckung** hängt jetzt an der Lage: Steht ein Verbündeter näher am Angreifer
als dessen Ziel, übernimmt er ein Drittel des Treffers. Ein zäher Körper vorn
schützt die Reihe dahinter also wirklich — und zwar dort, wo er wirklich steht.
Gift, Brand und Blutung gehen durch die Deckung hindurch.

### „Alle Gegner" heißt jetzt: ein Umkreis

Eine Fähigkeit, die „alle Gegner" trifft oder „den Trupp" stärkt, fasst **einen
Umkreis von 1 Feld** — bei Gegnern um das Ziel herum, bei Verbündeten um sich
selbst. Trägt die Fähigkeit das Schlüsselwort **Fläche**, sind es **2 Felder**.
Damit kauft Fläche zum ersten Mal Reichweite und nicht bloß einen Bonus.

Wen ein Umkreis von 1 Feld aus welchem Platz erreicht:

| von Platz | erreicht |
|---|---|
| 1 | 1, 2, 4, 5 |
| **2** | **1, 2, 3, 5, 6** |
| 3 | 2, 3, 6 |
| 4 | 1, 4, 5 |
| **5** | **1, 2, 4, 5, 6** |
| 6 | 2, 3, 5, 6 |

Daraus folgt die wichtigste neue Regel der Aufstellung: **wer den Trupp stärkt
oder heilt, gehört in die Mitte** (Platz 2 oder 5). Von Platz 3 aus erreicht
derselbe Buff nur die Hälfte. Umgekehrt gilt dasselbe für den Gegner — eine
Massenwirkung von ihm trifft nie mehr den ganzen Trupp auf einmal.

Die Lagekarte über dem Kampflog zeigt in 2.5D, wo alle stehen: das Hexfeld ist
dreidimensional und gekippt, die Figuren sind flache Bilder darauf, die sich
immer zur Kamera drehen. Wer heranläuft, gleitet sichtbar über die Felder; der
Balken über dem Kopf ist das Leben. Eingreifen kannst du während des Kampfes
nicht — die Entscheidungen fallen davor.

Die Figuren sind vorerst Silhouetten: Umriss und Waffe kommen aus der Rolle
(Klinge = Frontlinie, Bogen = Fernkampf, Stab = alles Magische), die Farbe aus
der Seite. Echte Charakterbilder ersetzen sie, sobald es welche gibt.

### Was du bei einer Signatur siehst

Jede Signatur zeigt ihr **Schlüsselwort** — nicht ihren Namen. Wer eine Linie
baut, sieht sie also auch, egal welche Einheit gerade wirkt:

| | sieht aus wie |
|---|---|
| Gift, Brand, Frost, Blutung, Verderbnis, Chaos, Fläche | fliegt in einem Bogen hinüber und schlägt ein |
| Donner, Licht, Dunkelheit, Exekution | schlägt sofort am Ziel ein, ohne Flug |
| Heilung, Schild, Tempo, Schatten, Konter | steigt an der eigenen Figur auf |

Die Farbe ist die des Elements: Brand orange, Gift grün, Frost hellblau, Donner
gelb, Licht cremeweiß, Dunkelheit violett, Blutung rot. Eine Signatur ohne
Schlüsselwort schlägt schlicht weiß ein.

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
**Mit Schild-Resonanz** (drei Teile derselben Linie) baut sich die Barriere
zusätzlich je eigenem Zug um 22 nach, bis zu 35 % des Maximallebens. Das ist
der Punkt, an dem die Schildlinie vom Vorrat zur Rate wird — vorher hielt sie
den ersten Schlag, jetzt hält sie, solange du nicht überrannt wirst. Gemessen
hebt das die Schildlinie von 34 auf 46 % Siegquote.
Donner baut sich ebenfalls nicht ab, sondern lädt bis zur Schwelle und entlädt
sich dann in die ganze Reihe.

## Nachschlagen im Spiel

Tensura Guild ist ein **Desktop-Spiel im Vollbild**. Es gibt keine
Handy-Ansicht: das Fenster wird ausgenutzt, statt in eine Lesespalte zu passen,
und die Breite des Fensters ist es, aus der das Schlachtfeld seine Größe zieht.

Fast jedes Element hat einen Tooltip: Art, Rolle, Rang, jede aktive und passive
Fähigkeit, Ausrüstung, Relikte, Statusmarken im Kampf, die Werte oben in der
Leiste und die Knoten auf der Karte — beim Überfahren mit der Maus.

Alles zusammen steht unter **Menü → Glossar**: Zustände, Schlüsselwörter,
Rollen, Arten und Begriffe wie Rang, Prädator, Aufstellung — sowie „Ticken" und
„Abbau" für die Regeln oben. Das Menü nimmt den ganzen Bildschirm, weil es ein
Nachschlagewerk ist: das Glossar steht in Spalten nebeneinander, die vier
Entwicklungslinien einer Einheit ebenso.

## Tipps

- Zwei Quellen plus ein Verstärker desselben Schlüsselworts schlagen fast immer
  vier zusammengewürfelte Fähigkeiten.
- Lass einen Prädator-Slot frei, wenn du auf eine bestimmte Gegnerfähigkeit
  spekulierst.
- Stapel sind unbegrenzt, gedeckelt ist die Wirkung — Erstarrung ist ein
  Schalter und bleibt bei 1.
- Wer den Trupp stärkt oder heilt, gehört in die Mitte der Aufstellung.
- Rang S auf der vordersten Einheit plus *Anführerkrone* ist eine eigene
  Strategie: fünf Item-Slots auf einem Körper.

## Chaos und Shions Linien

**Chaos** ist kein Schaden, sondern Unberechenbarkeit. Wer Chaos trägt, würfelt
zu Beginn jedes eigenen Zuges Angriff, Rüstung und Tempo neu aus — je Stapel um
bis zu 6 % nach **unten** (Antichaos zieht nach oben) —, und seine Signatur
verpufft mit 5 % Chance je Stapel. Über der Figur steht der Wurf der Runde
(„🎲 ⚔ 62 %"), eine verpuffte Fähigkeit als „✗ verpufft"; der Tooltip an der
Chaos-Marke zeigt alle drei Werte.

**Antichaos** ist dieselbe Mechanik, invertiert: dieselbe Streuung, aber nur
nach oben und ohne Fehlschlag.

Shions Signatur **Chaosschlag** legt Chaos nach ihrer Entwicklungsstufe an —
C Oger 2 Stapel, B Teufel 3, A Verdorbener Teufel 3, S Ultimativer Teufel 5.

| Linie | Worum es geht | Beispiele |
|---|---|---|
| Angriff | Chaos in eigene Werte umsetzen | Chaosrausch, Wutspirale |
| Mechanik | das Rad selbst — Stapel legen, wachsen lassen, umwandeln, verwandeln | Instabile Klinge, Entropiebruch, Chaosernte, Realitätswarp, Ordnungsteufel, Verdorbener Teufel |
| Unterstützung | Antichaos und Stärke für den Trupp | Stille Ordnung, Geteilte Wut, Umkehr der Ordnung |
| Defensive | Oger-Fleisch | Ogerschild, Chaosbollwerk |

Die Mechanik arbeitet mit **beiden Seiten des Rades**: Chaos auf den Gegnern,
Antichaos im eigenen Trupp. Die **Chaosernte** dreht es in beide Richtungen
(fällt ein Gegner mit 5 Chaos, bekommt ein Verbündeter 5 Antichaos; trägt ein
Verbündeter 5 Antichaos, werden sie zu 5 Chaos auf einem Gegner), der
**Entropiebruch** lässt jeden liegenden Stapel jede Runde wachsen, die
**Gesetzlosigkeit** hält beides fest.

**Verwandlungen:** ab **6 Antichaos** auf Shion wird sie zum Ordnungsteufel, ab
**12 Chaos** auf den Gegnern zum Verdorbenen Teufel — je Stapel mehr Angriff,
Tempo und Leben, höchstens +90 %, und eine neue Signatur.

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

Shion und Souei sind beide Oger — seit Phase 76 ist das kein Ausschluss mehr:
sie dürfen zusammen im Trupp stehen, und Soueis Marken-Unterstützung passt zu
Shions Chaos genauso wie zu jedem anderen Trupp.

Alle anderen Einheiten behalten vorerst ihre drei festen Passiven, die mit dem
Rang aufschalten.
