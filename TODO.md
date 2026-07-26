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

Offen:

- 38 Einheiten haben noch keine eigenen Linien (`AB.linien`). Shion und Souei sind die Vorlagen — vier Linien à vier Stufen je Einheit.
- Der Aufstiegs-Pool aus 34 aktiven Fähigkeiten wird vom Spieler & gegner nicht gezogen. jeder Kampfeinheit hat nur eine Aktive fähikgeit mit passiven Fähgikeiten
- Angebotene/kaufbare Einheiten haben zufällige ausgesuchte Passive nur beim entwickeln suchenw wir aktiv aus welche neue passive dazukommt.
- Boss-Balance in Pool 1 streut (Clayman leicht, Milim hart) — Claymans
  Selbstheilung war für Boss plus Gefolge entworfen.
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
- Bitte Die Meta progression anzeigen was alles freigeschaltet wurde
