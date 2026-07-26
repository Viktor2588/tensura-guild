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

Offen:

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
- Chaos sollte standardmäßig das gegnerische Ziel debuffen & nicht buffen
- Es sollte nicht Möglich sein, entwicklungsfähigkeiten(passive) auszulassen. Die infromation das diese den ganzen run anhalten ist unnötig
- Einheiten belohnungen sollten auf Tags verteilt sein, und nicht ein rießieger wall auf text sein wenn man über die belohnung hovert so teilt sich die Infos auf jeweilige häppchen auf. Möchte ich wissen was untot heißt? da bekomme ich den "untoten" tooltip über den tag damit ich das kurz nachschauen kann.
