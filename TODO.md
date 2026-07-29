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

1. **Den Aufstiegs-Pool in Passive umbauen.** *(entschieden, jetzt
   entsperrt)* Die 34 aktiven Fähigkeiten sind totes Gewicht, seit jede Einheit
   nur noch ihre Signatur führt. Sie werden zu Passiven umgeschrieben und in
   die vier Kategorien einsortiert — damit wächst die Bibliothek von 34 auf
   rund 68. Was Gegner brauchen, bleibt als Aktive erhalten.
   Vorher war das sinnlos: die Bibliothek kam gar nicht mehr beim Spieler an
   (siehe Phase 22). Seit sie auf Stufe 4 neben dem Keystone steht, lohnt der
   Ausbau — jede neue Passive ist dort sofort ziehbar.

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

Balance und Werkzeug:

- `dev/linien.js` braucht seit Phase 23 über zehn Minuten statt drei — die
  Binärsuche läuft öfter, weil zähere Einheiten den Bruchpunkt weiter oben
  suchen. Obergrenze oder gröbere Schritte einziehen.
- `dev/linien.js` misst eine Einheit allein und bewertet die
  Unterstützungslinie deshalb strukturell zu schlecht. Mit Trupp messen.

- Anfänger/Veteran-Abstand bei 12 Punkten (50 gegen 62 % Siege).
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
- Die Stärke von Items & relikten ist nicht sauber gebalanced. Manche items fühlen sich viel zu stark an dafür das sie ungewühnlich sind & mache legendary items fühlen sich zu schwach an.
- Erste begegnung sollte immer ein kampf sein.
- Relikt freischalten sollte schneller gehen
