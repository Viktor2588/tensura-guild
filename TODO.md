Abgearbeitet in Phase 7 — Details in PLAN.md:

- [x] Frontlinie rückt beim Anwerben direkt auf Platz 1 (Testabkürzung, `Run.addUnit`)
- [x] Zwei Akte, Bosse allein, zwei Boss-Pools
- [x] Debug-Übersicht: Basis → Rang → Ausrüstung → Kampf je Einheit
- [x] Chaos-Mechanik und Shions Signatur nach Entwicklungsstufe
- [x] Wählbare Passive: vier Linien à vier Stufen, Shion vollständig

Abgearbeitet in Phase 8:

- [x] Einheiten-Synergie: `verwundbar` als Trupp-Marke, `blutung` als Schaden
      nach maximalem Leben, Soueis sechzehn Passive
- [x] Boss-Pools auf je vier gefüllt (Orklord Geld, Razen, Roy Valentine)
- [x] Boss-Eskalation, weil allein stehende Bosse sonst eine Ja/Nein-Frage sind

Abgearbeitet in Phase 9:

- [x] Bedrohungsstufen sind Regeln statt Prozentzahlen: Überzahl, Nachschub,
      Kriegsrecht, Belagerung, Sturmgott — kumulativ, gemessen 48/35/24/16/11/6 %

Abgearbeitet in Phase 10:

- [x] Keine Abklingzeiten mehr: die Signatur feuert jede Runde
- [x] Eine Aktive je Einheit (die Signatur), alles Weitere ist passiv —
      der Aufstieg wählt jetzt Passive statt Aktiver
- [x] Einheitenspezifische Fähigkeiten (Signaturen, Linien-Passive) tragen
      keine Raritätsstufe mehr
- [x] Schlüsselwörter werden zentral an der Einheitenkarte erklärt statt an
      jeder einzelnen Fähigkeit

Abgearbeitet in Phase 11:

- [x] Chaos debufft nur noch — vorher konnte es den Gegner ebenso gut stärken
- [x] Passive lassen sich nicht mehr auslassen; der „gilt den ganzen Run"-Hinweis ist weg
- [x] Belohnungen, Startwahl und Laden zeigen Tags mit eigenen Tooltips statt einer Textwand
- [x] Start als Aufbau: vier Paare aus Einheit + Relikt, erster Kampf 1 gegen 1,
      die ersten Knoten gestaffelt, Gegnerhärte wächst mit der Truppgröße
- [x] Eine Währung: Gold ist weg, alles kostet Magicule
- [x] Werte der Kämpfer stehen im Kampf auf der Karte
- [x] UI-Wechsel: während des Kampfes nur die Kampfansicht, danach das Management
- [x] Entlassen nur außerhalb des Kampfes, mit 25 % Rückerstattung des Einsatzes

Abgearbeitet in Phase 12/13:

- [x] Stapel unbegrenzt (Wirkung gedeckelt statt Zahl), Erstarrung bleibt ein Schalter
- [x] Knoten nennen nur ihre Art — die Gegnervorschau log beim Einstieg
- [x] Kampfherausforderung als vierter Kampfknoten mit angesagter Auflage
- [x] Belohnung ist nur noch Magicule; nach jedem Kampf öffnet der Markt
- [x] Verkaufen per Ziehen (Pointer Events, auch auf Touch)
- [x] Händler-Knoten entfernt

Abgearbeitet in Phase 14:

- [x] Entwicklung bietet zufällig an, eine aus jeder Art — die Bibliothek ist
      in Angriff, Mechanik, Unterstützung und Defensive einsortiert
- [x] Meta-Progression im Menü: Balken und Listen für Bedrohungsstufe,
      Einheiten und Relikte
- [x] Boss-Balance eingefangen: 69–82 % statt 44–100 %, im echten Run gemessen
- [x] Konter ist kein Ausreißer mehr

Abgearbeitet in Phase 15:

- [x] Linien für die restlichen vier Oger: Benimaru (Brand), Shuna (Heilung
      und Schild), Hakuro (Klinge und Exekution), Kurobe (Schmiede). Damit hat
      die ganze Art Linien — 96 Linien-Passive insgesamt.
- [x] Bedrohungsstufe sichtbar: dauerhaft in der Kopfzeile, umstellbar im
      Menü. `threatGewaehlt` fällt nicht mehr hinter `threat` zurück.

Abgearbeitet in Phase 16:

- [x] Linien für alle fünf Goblins: Gobta (Glück), Gobkyu (Präzision),
      Rigurd (Häuptling und Schild), Rigur (Wache und Konter), Gobwa
      (Feldverband). Damit sind zwei Arten vollständig, 176 Linien-Passive.

Abgearbeitet in Phase 17:

- [x] `dev/linien.js`: Linien am Bruchpunkt messen statt an fester Härte
- [x] Linien für alle vier Sturmwölfe: Ranga (Blitz), Sturmwolf (Jagd),
      Schattenwolf (Frost), Rudelalpha (Rudel und Tempo)

Abgearbeitet in Phase 18:

- [x] Linien für alle fünf Echsenmenschen: Gabiru (Wirbelspeer), Souka
      (Späherin), Echsenfürst (Ausdauer), Drachenknecht (Speerwall),
      Quellenpriesterin (Regeneration)
- [x] `dev/linien.js` wertet ein Unentschieden nach Vorsprung statt als
      Niederlage — sonst maß es bei Ausdauer-Einheiten nur das Zug-Limit

Abgearbeitet in Phase 19:

- [x] Drei neue Elemente: Schatten (Ausweichen), Dunkelheit (senkt den
      ausgeteilten Schaden), göttliches Licht (heilt, löscht Dunkelheit,
      trägt durch Schatten)
- [x] Schattenwolf von Frost auf Schatten und Dunkelheit umgebaut
- [x] Donnerelement: lädt auf, entlädt sich ab der Schwelle in die ganze Reihe
- [x] Ranga von Frost auf Donner und Schatten umgebaut

Abgearbeitet in Phase 20:

- [x] Linien-Passive für alle Einheiten sind generiert und per `npm test` abgesichert.
- [x] Meta-Progression zeigt jetzt auch verschlossene Einheiten/Relikte namentlich als getrennte Chips.
- [x] Startzustand ist zufällig vorausgewählt (keine Passive-Auswahl beim Anwerben); der Markt zeigt das konkrete mitgebrachte Start-Passiv.

Offen:

1. **Der Aufstiegs-Pool bleibt Gegner-Repertoire.** *(erledigt, anders als
   geplant)* Der Plan war, die 34 Aktiven zu Passiven umzuschreiben, damit die
   Bibliothek wächst. Gewachsen ist sie in Phase 33 — durch 24 neu geschriebene
   Passive, die die Lage lesen statt ein Thema vorauszusetzen (34 → 58). Die
   Aktiven umzubauen hätte dem nichts hinzugefügt; sie sind als Gegnerinhalt
   sinnvoll und bleiben es.

2. **`GRUNDHAERTE` ist in einer Sitzung von 1.02 auf 1.08 gewandert.** Der
   globale Knopf hat die Siegquote geradegezogen, aber er trifft auch die 20
   handgeschriebenen Einheiten, die gar nicht stärker geworden sind. Prüfen, ob
   die Generator-Linien an der Wurzel zu breit sind, statt weiter am Knopf zu
   drehen.

Abgearbeitet in Phase 21:

- [x] Die 20 Generator-Einheiten haben echte Linien statt vier Mal derselben
      Zahl: Angriff wirkt auf den eigenen Schlag, Mechanik auf den
      Themeneffekt, Unterstützung auf den Trupp, Defensive auf das Überleben.
      Stufe 1 Auftakt (Nova), 2 Manöverzähler (D&D Battle Master),
      3 Voraussetzung an den Trupp (Pathfinder Feat-Chain), 4 Keystone mit
      Preis (Path of Exile). Namen sind benannt statt nummeriert.
- [x] `GRUNDHAERTE` 1.02 → 1.06, damit die stärkeren Linien wieder auf 52 %
      Siege (frisch) landen.
- [x] Linienbindung: ab Stufe 2 geht es nur noch in der Linie weiter, die
      Stufe 1 gesetzt hat (`AB.linien_kat` + Filter in `passivAngebot`).
      Gemessen hebt das die Siegquote von 52 auf 60 % — weniger Auswahl macht
      den Trupp stärker, weil die Schlüsselwörter sich stapeln.
- [x] Stufe 4 ist ablehnbar: „nichts nehmen" steht neben dem Keystone.
- [x] `GRUNDHAERTE` 1.06 → 1.17, gemessen 51 % Siege (frisch).

Abgearbeitet in Phase 22:

- [x] **Befund:** die 34 Bibliotheks-Passiven waren für den Spieler
      unerreichbar — seit alle 40 Einheiten Linien haben, greift `passivIds`
      nie mehr auf die feste Liste aus `data.js` zu, und der Kategorien-Zweig
      in `passivAngebot` lief nie.
- [x] Die Bibliothek hängt jetzt an Stufe 4: zwei Passiven ohne Preis stehen
      neben dem Keystone und dem Verzicht. Der Kategorien-Zweig ist zu
      `bibliotheksAngebot()` geworden und wird von beiden Seiten benutzt.
- [x] `GRUNDHAERTE` 1.17 → 1.14, gemessen 50 % Siege (frisch); kein Build steht
      mehr auf der Auffälligkeitenliste.

Abgearbeitet in Phase 23:

- [x] Alle 40 Einheiten tragen den Vier-Stufen-Aufbau (Auftakt, Manöverzähler,
      Voraussetzung, Keystone) — 304 handgeschriebene Passive neu geschrieben,
      Thema je Einheit unverändert. Shion nur nachbalanciert, nicht umgebaut.
- [x] `schwaechstes()` fängt leere Gegnerlisten ab: `onDamaged` feuert auch,
      wenn Gift den letzten Gegner schon erledigt hat.
- [x] `heilung` von den kleinen Selbstheil-Ticks entkoppelt — das Schlüsselwort
      hing an jeder zweiten Passive und machte die Build-Auswertung blind.
- [x] Shions Chaos-Skalierungen gedeckelt (+50 % / +45 %), weil
      `Gesetzlosigkeit` die Stapel nie abbauen lässt.
- [x] Schadensdeckel roster-weit um 3,5 Punkte gelockert, samt Texten.
- [x] `GRUNDHAERTE` 1.14 → 1.11, gemessen 51 % Siege (frisch).

Abgearbeitet in Phase 24:

- [x] Keine Stufen mehr: die 16 Passiven je Einheit (4 je Linie) sind frei
      kombinierbar. Angeboten werden vier aus dem ganzen Topf — ohne Quote je
      Linie, damit ein größerer Topf später nichts ändert. Die Linienbindung ist
      weg, `AB.linien_kat` gelöscht.
- [x] Passive mit Preis tragen ein `preis`-Kennzeichen — daran hängt die
      „nichts nehmen"-Option. Der Startzustand zieht nie eine davon.
- [x] Die Linien-Übersicht zeigt die Signatur-Aktive samt Beschreibung und
      markiert die vier Passiven mit Preis.
- [x] `GRUNDHAERTE` 1.11 → 1.08, gemessen 50 % Siege (frisch). Ohne Bindung
      fiel die Quote erst auf 40 % — die Umkehrung des Phase-21-Befunds —, der
      freie Zug aus dem ganzen Topf holte sie auf 57 % zurück.
- [x] **Der Heilungs-Build ist kein Ausreißer mehr** (war die ganze Sitzung bei
      76–82 %). Ursache war nie die Stärke, sondern das Stapeln desselben
      Schlüsselworts über vier Stufen.

Abgearbeitet in Phase 25:

- [x] Souei hatte eine Mechanik zu viel — Gift ist raus, `Giftmal` ist zu
      `Fadennetz` geworden (die Fäden schneiden auf markierten Zielen nach).
      Er führt jetzt Marke, Blutung, Schatten und Doppelgänger.
- [x] Tick-Regeln dokumentiert: Zustände ticken je Zug ihres TRÄGERS, nicht pro
      Runde — mit Reihenfolge, Schaden je Stapel und den vier Fähigkeiten, die
      den Abbau aussetzen. Steht in `js/combat.js` (Tabelle über der Schleife),
      im Glossar (`ticken`, `abbau`) und in `GAMEGUIDE.md`.

- [x] Benimaru: Feuer ist Magieschaden (durchschlägt Rüstung, `Schwarze Flamme`
      auch Schilde), Unterstützungslinie befehligt statt nur zu verstärken.
- [x] Souei: Doppelgänger (`Schattendoppel`), Wurfklingen, Verstohlenheits-
      Auftakt, Fäden legen Verwundbar und Blutung, Meuchelschnitt.
- [x] Shuna: Angriffslinie ist göttliche Angriffsmagie über `heiligerSchlag()` —
      Schaden ohne Rüstung und Schild, dafür in kleinen Anteilen.
- [x] Adalmann aus dem Generator geholt und handgeschrieben: Totenmagie neben
      göttlicher Angriffsmagie aus seiner Priestervergangenheit. Generator: 19.
- [x] **Zwei tote Flags:** `zaeherBrand` (seit Phase 23) las die Engine nie —
      korrekt heißt es `brandBleibt` und gehört aufs Ziel. `verderbnisBleibt`
      neu ergänzt. Beide jetzt per Test abgesichert.

Abgearbeitet in Phase 26:

- [x] Shion: `Verdorbener Teufel` — 10 Chaos auf dem Ziel plus 10 Antichaos auf
      ihr verwandeln sie einmal je Kampf (+45 % Angriff, +25 % Leben, +20 %
      Tempo) und ersetzen ihre Signatur durch die `Chaosklinge des Verdorbenen`.
      Die Bedingung ist der Preis, deshalb trägt sie keinen weiteren.
- [x] Die Preis-Marke hängt an der festen vierten Stelle einer Linie statt an
      der letzten — Linien dürfen jetzt wachsen.
- [x] Verwandlungen erscheinen im Kampflog.

Abgearbeitet in Phase 27:

- [x] `fluchmeister` und `segenmeister`: generische Multiplikatoren für Stapel
      auf Gegner bzw. auf die eigene Reihe, am Anleger. Darauf 5 Items
      (Fluchring, Segensring, Chaoszepter, Ordnungsreif, Markenbrenner) und
      3 Relikte (Fluchsiegel, Segensbanner, Verzerrter Spiegel).
- [x] Shion +3 Passive am Chaos/Antichaos-Rad: Chaosernte, Umkehr der Ordnung,
      Ordnungspanzer. Sie hat jetzt 20.
- [x] Rimuru komplett neu: Signatur `Prädator` liest fremde Zustände und macht
      Antichaos daraus; 16 handgeschriebene Linien dazu. Er ist die Gegenfigur
      zu Shion und lebt als einziger von fremden Schlüsselwörtern.
- [x] **Antichaos war nach oben unbegrenzt** — gemessen 481 Stapel. `CHAOS_MAX`
      deckelt den Wurf jetzt bei 2,2.
- [x] Wächter-Test gegen tote Felder: jedes Feld, das eine Fähigkeit setzt, muss
      in `combat.js` vorkommen. Fängt Tippfehler wie `zaeherBrand` sofort.

Abgearbeitet in Phase 28:

- [x] Schattenwolf und Rudelalpha gestrichen — vier Wölfe waren zu viel und
      überschnitten sich mit Ranga. Geblieben: Ranga (Donner/Schatten) und
      Sturmwolf (Exekution/Blutung). Roster: 38 Einheiten.
- [x] Diablo handgeschrieben: Dunkelheit + Verderbnis, die einzige Zange, die
      von zwei Seiten drückt. Er erbt Dunkelheit vom gestrichenen Schattenwolf.
- [x] Veldora handgeschrieben: Fläche + Frost. Holt Frost und Erstarrung
      zurück, die seit Phase 20 gar keinen Träger mehr im Roster hatten.
- [x] Milim handgeschrieben: trägt als einzige Einheit gar keinen Zustand —
      reine, sich aufschaukelnde Zahlen.
- [x] `dunkelheitBleibt` als fünfte Abbau-Ausnahme (Diablos Ewige Nacht).
- [x] Diablos Signatur `Verderbnis` → `Belial`, Rimurus Keystone `Belial` →
      `Azathoth`. Generator: noch 15 Einheiten.

Abgearbeitet in Phase 29:

- [x] Wolf und Reiter: erste Truppbedingung, die an einer ART hängt statt an
      einem Schlüsselwort. Sturmwolf bekommt `Wolfsreiter`, `Reiterei` und
      `Aufgesessen` (Goblin im Trupp), Ranga `Rudel und Stamm`,
      `Schattenreiter` und die `Schattenfusion`.
- [x] Die Schattenfusion greift nur mit **Gobta** namentlich und ersetzt Rangas
      Signatur durch den `Schwarzen Blitz der Fusion` — die zweite Form im
      Spiel nach Shions Verwandlung.
- [x] Diablo von Verderbnis auf **Dunkelheit + Schatten** umgestellt; vier
      andere Einheiten tragen Verderbnis ohnehin. Signatur `Belial` mit.

Abgearbeitet in Phase 30:

- [x] Zweite Träger, handgeschrieben: **Windrache** (Donner, breit und schnell
      statt einzeln wie Ranga), **Gruftwächter** (Frost als Stillstand statt
      Sturm wie Veldora), **Seelenhexe** (Dunkelheit, die sie in Heilung für
      den Trupp umrechnet — anders als Diablo, der darin verschwindet).
- [x] Die Generator-Liste stand doppelt und überschrieb handgeschriebene Linien
      mit erfundenen IDs. Sie zieht jetzt aus `LINE_UNITS`.
- [x] **Fehlalarm im Werkzeug:** „Build frost: 0 %" waren Runs, die an Knoten 2
      starben. `dev/balance.js` zeigt jetzt je Eimer die Ø-Lauftiefe und meldet
      keine Ausreißer mehr für Eimer, die im Schnitt vor Knoten 4 enden.

Abgearbeitet in Phase 31:

- [x] `schild` von den allgegenwärtigen Startschilden entkoppelt: 37 → 12
      Träger. Dasselbe Grundrauschen wie bei `heilung` in Phase 23.
- [x] Riesenameise, Skelettritter und Giftfalter gestrichen (Dubletten).
      Roster: 35 Einheiten.
- [x] Die letzten 9 Generator-Einheiten handgeschrieben — Zegion (Schilde
      brechen), Apito (Gift züchten), Käfergarde (Schild ~ Truppgröße),
      Testarossa (Exekutionskette), Ultima (Verderbnis → Schaden), Carrera
      (Brand zünden statt legen), Dämonengarde (Konter im Voraus),
      Drachenwelpe (frisst Feuer und wächst), Wight-König (lebt von Gefallenen).
- [x] **Der Generator ist gelöscht** — rund 340 Zeilen ohne Kundschaft, samt
      `LINE_UNITS`, `LINE_THEME` und der „Generator"-Markierung in der UI.
- [x] Zwei kaputte Testhelfer repariert: `mit()` baute Passiv-IDs aus dem
      Einheitennamen zusammen und lief bei kurzen Präfixen ins Leere; die
      Deckungs-Prüfung verglich „vorderste Einheit" mit einem festen Namen.

Abgearbeitet in Phase 32:

- [x] Shions Verwandlung in zwei Schwellen geteilt: `Ordnungsteufel` ab 10
      Antichaos auf ihr selbst (Signatur `Klinge der Ordnung`), `Verdorbener
      Teufel` ab 20 Chaos über alle Gegner zusammen. Beide können fallen.
- [x] Die Boni skalieren mit der Zahl der Stapel statt fest zu sein — 3 % bzw.
      2 % je Stapel, gedeckelt bei +90 %. Der Kampflog nennt Stapel und Bonus.

Abgearbeitet in Phase 33:

- [x] Zweite Bibliotheksschicht: 24 handgeschriebene geteilte Passive, die die
      LAGE lesen (Position, Gegnerzahl, erlittene Treffer, fehlendes Leben)
      statt ein Thema vorauszusetzen. Sechs davon tragen einen Preis.
      Bibliothek 34 → 58, gleichmäßig über die vier Kategorien.
- [x] `pos` ist 0-basiert — `Vorhut` und `Hinterhalt` waren um eins verschoben.
      Nachgemessen und mit fünf Tests festgehalten.

Abgearbeitet in Phase 34:

- [x] Insektoiden bekommen eine Art-Identität: **Metamorphose**. Alle drei
      häuten sich mitten im Kampf in eine stärkere Form mit anderer Signatur.
- [x] **Neun Einheiten feuerten nie `onHit`** — ihre Signatur griff nicht an und
      hatte keine Lagebedingung, also gab es nie einen Normalangriff. 3–5
      Angriffs-Passive je Einheit waren tot. Zegion nutzte `deal` statt
      `attack`, Apitos eigenes Gift schaltete ihre Linie ab, die anderen acht
      brauchten eine Lagebedingung.
- [x] Wächter-Test: wer `onHit`-Passive hat, muss auch zum Angriff kommen.
- [x] Die Giftzahn-Prüfung maß die Schadenssumme über einen Kampf — die ist
      nicht monoton, weil härtere Treffer den Kampf verkürzen. Jetzt je Treffer.
- [x] `GRUNDHAERTE` 1.08 → 1.28; die Reparatur hatte die Quote auf 66 % gehoben.

Abgearbeitet in Phase 35:

- [x] Neue Art **Ork**: Geld (zieht Schaden seiner Reihe auf sich, unabhängig
      von der Aufstellung — `koenigsdeckung()`) und der Orkkrieger (billigster
      Frontkämpfer, zahlt für Wunden statt für Deckung).
- [x] Neue Art **Bestie**: Phobio, Albis, Suphia. Art-Identität ist die
      Reaktion auf den Kampfverlauf — erlittener Schaden, gefallene Gegner,
      verwundete Verbündete. Phobio schlägt als einzige Einheit mit stark
      schwankendem Schaden (55–175 %).
- [x] Orkkrieger und Phobio im Startbestand. Roster: 40 Einheiten.
- [x] Die Kampflog-Prüfung hing an einer Zeilenzahl und damit am Startdraft.

Abgearbeitet in Phase 36:

- [x] **Goblins skalieren mit dem Rang** (`rangStufe()`) — 13 → 37 Schaden je
      Treffer von C auf S. Alle fünf tragen es, nicht nur die blassen drei.
- [x] **Echsenmenschen wachsen mit der Kampfdauer** (`langerKampf()`) — der
      Zähler wird genau einmal je Einheit installiert. 34 → 59 je Treffer.
- [x] Beide Identitäten standen wörtlich im Glossar, ohne mechanisch zu
      stimmen. Die Glossartexte sagen jetzt, was das Spiel tut.
- [x] Dämonengarde: schlägt zurück, bevor der Treffer sitzt — jeder Austausch
      schärft die Klinge, jeder dritte gibt einen Zug, der Keystone kontert alle.
- [x] **Die Referenzprüfung deckte die Linien nicht ab.** Ein Regex-Fehler hat
      drei Passive gelöscht, ohne dass ein Test anschlug. Jetzt prüft sie auch
      `AB.linien`.

Abgearbeitet in Phase 37:

- [x] Hakuro trägt keinen Rüstungsdurchschlag mehr — alle fünf Stellen durch
      Technik ersetzt: der Hieb sitzt ein zweites Mal, und `Auge des Meisters`
      liest den Gegner (+5 % je eigenem Schnitt, höchstens +70 %).
- [x] Käfergarde gestrichen. Insektoiden: Zegion und Apito. Roster: 39.
- [x] `GRUNDHAERTE` 1.28 → 1.31.
- [x] Ein Test hing an einer festen Zahl von Verwandlungsformen; er prüft jetzt,
      dass keine tot herumliegt.

Abgearbeitet in Phase 38:

- [x] **Milim hat keine Defensivlinie** — zwölf Passive statt sechzehn, die
      einzige Einheit im Spiel. Ihre Angriffslinie ist die langsame Brecherin
      (vierfache Schläge, danach Selbstbetäubung), ihre Mechaniklinie die
      schnelle Schlägerin. Gemessen: 309 Schaden bei 27 Treffern gegen 99 bei
      100. Dazu Boss- und Drachenboni über `enrage`.
- [x] **Zweite Träger für sechs Mechaniken**: Chaos (Gobta), Zustände lesen
      (Albis), Schildbruch (Orkkrieger), Zufallsschaden (Gobta),
      Selbstbetäubung (Orkkrieger), Boss-Bonus (Hakuro).
- [x] Die Aufstellung zählt jetzt auch für Einheiten: Gobkyu hält hinten
      besser aus, Rigurds Häuptling wirkt doppelt an der Spitze.
- [x] Ein Test verlangt für jede Mechanik zwei Träger. Kein Schlüsselwort und
      keine Mechanik steht mehr allein.

Abgearbeitet in Phase 39:

- [x] **Bugfix Fortschritt:** Der Speicherstand eines Runs trug eine Kopie der
      Meta, und das Laden baute den globalen Fortschritt daraus neu — auf dem
      Stand von Rundenbeginn. Jede Aktion schrieb ihn dann zurück. Der Speicher
      hat jetzt Vorrang.
- [x] `loadMeta` räumt alte Stände auf: gestrichene Einheiten und Relikte
      fallen heraus, der weiteste Weg wird auf die heutige Lauflänge gekappt.
- [x] Stände mit Siegen, aber Stufe 0 bekommen die Bedrohungsstufen
      nachgereicht — diese Kombination kann nur durch den Bug entstanden sein.
- [x] Geld heißt Gerudo.

- Die Stärke von Items & relikten ist nicht sauber gebalanced. Manche items fühlen sich viel zu stark an dafür das sie ungewühnlich sind & mache legendary items fühlen sich zu schwach an.
- Erste begegnung sollte immer ein kampf sein.
- Relikt freischalten sollte schneller gehen
- ~~Ich brauche eine Möglichkeit alle Fähigkeiten jeder Einheit einzusehen~~ —
  erledigt: **Menü → Entwicklungslinien** zeigt je Einheit die Signatur samt
  Beschreibung und alle sechzehn Passiven in vier Linien, mit Tooltips und
  Preis-Markierung.
- ~~Bedrohungsstufe ist immer 0, kein fortschritt zu sehen, obwohl ein run
  gewonnen wird~~ — erledigt in Phase 39: der Speicherstand des Runs trug eine
  Kopie der Meta und überschrieb damit den echten Fortschritt. Alte Stände mit
  Siegen bekommen die Stufen nachgereicht.

Abgearbeitet in Phase 40:

- [x] Die **Namensweihe** bringt ihre Passive mit: Ziel UND Passive werden beim
      Marktaufbau ausgelost, stehen im Angebot und werden beim Kauf direkt
      angelegt. Keine zweite Wahl mehr — ein Klick, eine vollständige
      Entscheidung.
- [x] **Zustands-Kombinationen** (Idee 4): Verpuffung (Brand + Gift ≥ 8),
      Splitter (Erstarrung auf Donner), Aufgerissen (Blutung auf 3+ Verwundbar).
      Alle mit Schwelle, damit Mono-Bauten sie nie auslösen. Im Kampflog, im
      Glossar und in `GAMEGUIDE.md` erklärt.

Offen aus der Recherche (Ideen 1, 2, 3, 5):

- **1. Gegnergruppen bekommen eigene Schlüsselwörter.** Die Resonanz-Maschinerie
  läuft schon für beide Seiten, aber alle 72 Gegner haben `keywords: []`. Reine
  Datenarbeit, größter Gewinn.
- **2. Bedrohung statt fester Zielwahl** — ein Panzer kann heute keine Treffer
  auf sich ziehen.
- **3. Zwei Reihen statt einer Liste.**
- **5. Kosten und Aufladung als System** statt je Passive handgeschnitzt.

## Entwurf: Hexagonales Taktik-RPG

**Stand 2026-07-30 (Phasen 41-44): Schritte 1-3 des gestuften Wegs unten sind
umgesetzt** — Hexkoordinaten, Reichweite je Rolle, Bewegung, lagebedingte
Deckung, 2.5D-Ansicht mit Effekten, und seit Phase 44 fassen Flächen einen
Umkreis statt das ganze Feld. Schritt 1 brauchte KEINE 290 Formdefinitionen,
sondern zwei Zeilen in `ctx()`; Schritt 2 (zwei Reihen) hat sich mit Schritt 3
erledigt. **Offen bleibt allein Schritt 4: Spielerzüge.**

Notiert am 2026-07-29 auf Nachfrage. Das ist kein Feature, sondern ein
Genre-Wechsel: der Kampf ist heute eine *Auflösung* — `simulate()` rechnet ihn
komplett durch, die UI spielt ihn nur nach, und der Spieler hat währenddessen
keinen einzigen Eingriff. Ein Hexfeld führt Raum ein, und Raum ohne
Entscheidungen darin ist bloß Dekoration.

### Die Gabelung, die alles andere bestimmt

**A — Hex-Autoschlacht.** Einheiten bewegen sich selbst nach ihrer Rolle. Der
Spieler entscheidet vor dem Kampf: Aufstellung auf dem Feld, Zusammensetzung,
Ausrüstung. Der Roguelite-Kreislauf bleibt, `dev/balance.js` läuft weiter,
ein Run dauert weiter Minuten.

**B — Hex-Taktik mit Spielerzügen.** Der Spieler bewegt und handelt jede Einheit
selbst. Das ist das eigentliche Taktik-RPG — und es kostet:
- Die Wiedergabe entfällt; die UI wird zum Spielbrett mit Eingaben.
- `dev/balance.js` braucht eine **Taktik-KI**, sonst gibt es keine 600-Run-Messung
  mehr. Ohne die Messung ist die Balance dieses Projekts blind — sie hat in
  dieser Sitzung ein Dutzend Fehleinschätzungen aufgedeckt.
- Ein Run dauert nicht mehr Minuten, sondern eine halbe Stunde. Das verändert
  den Meta-Fortschritt, die Aktlänge und die Zahl der Knoten.

**Empfehlung: A zuerst.** Sie ist ein Zwischenschritt, kein Kompromiss — und
wenn der Raum steht und sich gut anfühlt, ist B danach ein UI-Projekt statt
eines Systemprojekts.

### Was der Hexlayer mindestens braucht

- **Koordinaten**: Achsial (`q`, `r`) ist die übliche Wahl; Distanz ist
  `(|q1-q2| + |q1+r1-q2-r2| + |r1-r2|) / 2`.
- **Reichweite je Fähigkeit** statt „alle Gegner".
- **Bewegung**: ein `zug`-Wert je Einheit, Hexfelder pro Zug.
- **Sichtlinie** — nur, wenn es Blocker gibt. Ohne Deckung im Gelände ist sie
  Aufwand ohne Ertrag.
- Ein kleines Feld reicht: **3–4 Gegner gegen bis zu 6 Einheiten**, also etwa
  7×7 Hexe. Größer wird Laufzeit ohne Entscheidung.

### Was schon passt — und zwar überraschend gut

Vieles im Spiel ist heute eine Abstraktion von Raum und würde auf Hexen
buchstäblich werden:

- **Deckung** hängt an „Platz 3 oder weiter hinten" und gibt ein Drittel nach
  vorn ab. Auf Hexen: der Nachbar vor dir fängt ab. Aus einer Zahl wird eine Lage.
- **Gerudos Königsdeckung** habe ich als Rückheilung nachgebaut, weil es keine
  echte Umleitung gibt. Auf Hexen: er deckt die *angrenzenden* Felder. Dieselbe
  Idee, endlich ohne Krücke.
- **`flaeche`** ist heute „alle Gegner". Auf Hexen wird daraus eine Form:
  Kegel, Linie, Ring. Gabirus Wirbel, Veldoras Sturm und Carreras Sprengung
  hätten alle drei eine *andere* Form statt derselben Wirkung.
- **`schatten`** (Ausweichen) wäre Sichtlinie und Distanz statt einer Prozentzahl.
- **Rollen** (`front`, `fernkampf`, `magier`) sind heute nur Zielwahl. Auf Hexen
  werden sie Reichweite — und die Rolle bekommt zum ersten Mal Struktur.
- **Ranga + Gobta**, die Schattenfusion: zwei Einheiten, ein Feld. Auf Hexen
  eine natürliche Regel statt einer Sonderbehandlung.
- Die **Aufstellung** ist heute eine Liste, die man tauscht. Auf Hexen wird sie
  die Hauptentscheidung vor jedem Kampf — genau die Tiefe, um die es geht.

### Was bricht — die ehrliche Rechnung

Gemessen im heutigen Bestand:

- **129 Fähigkeiten treffen „alle Gegner"**, **160 fassen den ganzen Trupp an**.
  Auf einem Hexfeld ist das eine offene Frage: Bleiben sie global, ist der Raum
  Dekoration. Bekommen sie Reichweiten und Formen, sind das **rund 290
  Fähigkeiten**, die eine Formdefinition brauchen. Das ist die zentrale Zahl
  dieses Umbaus — vergleichbar mit dem Befund, dass alle 72 Gegner keine
  Schlüsselwörter haben.
- **Zielwahl** (`pickTarget`) ist rollenbasiert und deterministisch. Auf Hexen
  muss sie Erreichbarkeit kennen — und braucht damit dieselbe Bedrohungslogik,
  die als Idee 2 ohnehin offen ist.
- **`dev/balance.js`** misst 600 Runs. Mit Bewegung braucht der Bot eine
  Positionierungs-KI, sonst misst er einen Trupp, der falsch steht.
- **Speicherstand**: die Aufstellung ist heute die Reihenfolge im Array. Hexe
  brauchen Koordinaten je Einheit — Formatwechsel, also eine Migration.
- **Die Wiedergabe** kennt nur Ereignisse (`hit`, `status`, `death`). Bewegung
  wäre ein neuer Ereignistyp und eine neue Darstellung.

### Ein gestufter Weg, falls es losgehen soll

1. **Reichweiten einführen, ohne Hexe.** Jede Fähigkeit bekommt `reichweite`
   (1 = angrenzend, 2 = Reihe, 99 = global). Ändert am Kampf zunächst nichts,
   erzwingt aber die Entscheidung für alle 290 Fähigkeiten — und legt offen, wie
   viele wirklich global sein wollen.
2. **Zwei Reihen** (die offene Idee 3). Kleinster echter Raum, deckt Deckung,
   Reichweite und Rollen ab. Wenn sich das *nicht* gut anfühlt, ist ein Hexfeld
   nur mehr desselben Problems.
3. **Hexkoordinaten** als Ersatz für die Reihen, weiterhin Autoschlacht:
   Einheiten laufen selbst, der Spieler stellt auf.
4. **Spielerzüge** — erst wenn 1–3 stehen und die Messung wieder läuft.

Schritt 1 ist die eigentliche Arbeit und für sich allein schon wertvoll: er
beantwortet, ob dieses Spiel überhaupt ein Raumspiel sein will.


Balance und Werkzeug:

- **Der Heilungs-Vorsprung ist echt.** Phase 46 hat den Startdraft des Bots
  repariert (er nahm jahrelang immer Karte 1) — und Heilung steht danach
  unverändert bei 70 % gegen 40-46 % für alles andere, bei n=237 von 600 der
  größte Eimer. Die Vermutung aus Phase 45, die Eimer messten nur die
  Truppzusammensetzung, ist damit teilweise widerlegt: ein Bot, der wirklich
  nach Build draftet, landet trotzdem bei denselben 25-30 Punkten Abstand.
  Weder Angebot (85 gegen 61 Quellen) noch Resonanz (halbiert: null Punkte) noch
  `regen`+`lifesteal` (abgeschaltet: alle Eimer verlieren gleich viel) erklären
  ihn. Phase 47 hat auch die Wiederbelebung geprüft — alle 22 abgeschaltet:
  4 Punkte. Damit sind drei Verdachte durch (Resonanz 1, `regen`+`lifesteal` 0
  relativ, Wiederbelebung 4) und keiner trägt die 25 Punkte. **Nächster und
  letzter naheliegender Verdacht: die direkten Heilungen** — vor allem die
  Regel, dass ein Unterstützer ohne bereite Fähigkeit den am schwersten
  Verletzten heilt (`js/combat.js`, Rollen-Zweig). Die hängt an der ROLLE, nicht
  am Schlüsselwort, und war in keiner Probe mit abgeschaltet. Wenn auch das
  nichts trägt, ist der Vorsprung wirklich diffus und die Frage lautet nicht
  „was nerfen", sondern „warum sind die schmalen Linien schwächer".
- **14 Einheiten werden nie gekauft, auch bei voller Freischaltung** — Benimaru,
  Hakuro, Echsenfürst, Zegion, Apito, Diablo, Testarossa, Ultima, Carrera,
  Veldora, Milim, Windrache, Gerudo, Adalmann. Alle haben **Kosten 4-5**. Der
  Bot bewertet Marktposten nach Wert je Magicule (`sc / price`), und das
  bestraft teure Einheiten doppelt, weil `passt()` die Kosten schon einmal
  enthält. Entweder ist die Heuristik zu geizig oder die Preiskurve zu steil —
  beides ist messbar, aber es sind zwei verschiedene Eingriffe. Solange das
  offen ist, messen alle Build-Zahlen nur die günstige Hälfte der Besetzung.
- **Der Rang ist keine Entscheidung, sondern ein Meilenstein.** Die alte Zahl
  („Rang A gewinnt nie") war eine Tautologie: `dev/balance.js` las den Rang am
  Run-Ende, und ein früh gestorbener Run hatte nie Geld für S. Phase 47 misst
  jetzt an fester Stelle, bei Akt-2-Beginn — und dort gibt es nur eine Zeile:
  **Rang S, n=296, 84 % Siege.** Jeder Run, der Akt 2 erreicht, hat schon eine
  S-Einheit; die anderen 204 kommen nie so weit. Zu klären, ob das gewollt ist:
  eine Breitenstrategie (vier auf B statt eine auf S) ist damit nicht schwach,
  sondern nicht existent.


- Der Konter-Eimer meldet 82 %, aber bei n=28 und der größten Lauftiefe aller
  Eimer. Zwei Runden Trimmen bewegten ihn um null Punkte — vor dem nächsten
  Eingriff gezielt nachmessen (wie bei Frost), statt weiter an Zahlen zu drehen.

- `dev/linien.js` braucht seit Phase 23 über zehn Minuten statt drei — die
  Binärsuche läuft öfter, weil zähere Einheiten den Bruchpunkt weiter oben
  suchen. Obergrenze oder gröbere Schritte einziehen.
- `dev/linien.js` misst eine Einheit allein und bewertet die
  Unterstützungslinie deshalb strukturell zu schlecht. Mit Trupp messen.

- Anfänger/Veteran-Abstand bei 12 Punkten (50 gegen 62 % Siege).
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
