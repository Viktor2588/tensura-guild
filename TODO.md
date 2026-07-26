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

Offen:

- Der Aufstiegs-Pool aus 34 aktiven Fähigkeiten wird vom Spieler nicht mehr
  gezogen — er lebt nur noch als Gegner-Repertoire weiter. Entweder in Passive
  umbauen oder bewusst als Gegnerinhalt führen.
- 38 Einheiten haben noch keine eigenen Linien. Das System steht (`AB.linien`),
  Shion und Souei sind die Vorlagen — pro Einheit vier Linien à vier Stufen:
  Werte-Angriff, eigene Mechanik, Unterstützung, Defensive. Als Nächstes bieten
  sich die übrigen Oger an (Benimaru/Brand, Shuna/Heilung, Hakuro/Exekution,
  Kurobe/Ausrüstung), weil sie mit Shion und Souei um denselben Artenslot
  konkurrieren — da wird die Wahl am ehesten spürbar.
- Boss-Balance in Pool 1 streut: Clayman 90 %, Milim 40 % gegen denselben
  Referenztrupp. Der Grund ist Claymans Selbstheilung, die für Boss+Gefolge
  entworfen war und ihn allein stehend entweder unkaputtbar oder wirkungslos
  macht. Pool 2 liegt sauber bei 61–65 %.
- Der Bot in `balance.js` steigt stur die vorderste Einheit auf; ob „vier auf B"
  oder „eine auf S" besser ist, misst er damit nicht.
