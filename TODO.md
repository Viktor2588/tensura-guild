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

Offen:

1. **38 Einheiten haben noch keine eigenen Linien** (`AB.linien`). Shion und
   Souei sind die Vorlagen — vier Linien à vier Stufen je Einheit, also
   16 Passive. Der größte Brocken; Content-Arbeit, keine Mechanik.

2. **Den Aufstiegs-Pool in Passive umbauen.** *(entschieden)* Die 34 aktiven
   Fähigkeiten sind totes Gewicht, seit jede Einheit nur noch ihre Signatur
   führt. Sie werden zu Passiven umgeschrieben und in die vier Kategorien
   (Angriff, Mechanik, Unterstützung, Defensive) einsortiert — damit wächst
   die Bibliothek von 34 auf rund 68 und die Entwicklung wird deutlich
   abwechslungsreicher. Was Gegner brauchen, bleibt als Aktive erhalten.

3. **Startzustand einer Einheit auch zufällig.** *(entschieden)* Eine
   angebotene oder gekaufte Einheit bringt zufällig vorausgewählte Passive
   mit, statt der festen Liste aus `data.js`. Die Entwicklung ab Rang B ist
   bereits zufällig — der Startzustand zieht nach. Im Markt muss die
   Beschreibung zeigen, was die konkret angebotene Einheit mitbringt.

4. **Meta-Progression vollständig visualisieren.** Die Übersicht im Menü zeigt
   bisher nur, was freigeschaltet IST, plus eine Zahl für den Rest. Sie soll
   auch zeigen, **wer und was noch fehlt** — verschlossene Einheiten und
   Relikte namentlich, erkennbar abgesetzt von den freien.

Balance und Werkzeug:

- Anfänger/Veteran-Abstand bei 12 Punkten (50 gegen 62 % Siege).
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
- Wie kann ich die Bedrohungstufe erhöhen?
- Mir fehlt noch das Donnerelement
- Die Stärke von Items & relikten ist nicht sauber gebalanced. Manche items fühlen sich viel zu stark an dafür das sie ungewühnlich sind & mache legendary items fühlen sich zu schwach an.
- Erste begegnung sollte immer ein kampf sein.
