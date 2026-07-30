/* js/hex.js — Hexgeometrie. Kennt das Spiel nicht.

   Achsiale Koordinaten (q, r). Das ist die übliche Wahl, weil sich damit alles
   Weitere in wenigen Zeilen ausdrückt: die dritte Kubuskoordinate ist immer
   s = -q - r, also braucht man sie nicht zu speichern.

   Die Ausrichtung ist „pointy top": zwei Nachbarn liegen waagerecht, vier
   diagonal. Für ein Schlachtfeld heißt das, dass Reihen sich sauber lesen
   lassen — und genau als Reihen stellt der Spieler heute schon auf.

   Alles hier ist rein: gleiche Eingabe, gleiche Ausgabe, kein Zustand. Das
   Modul lässt sich damit für sich prüfen, bevor irgendetwas davon abhängt.   */
(function (root) {
  'use strict';

  /* Die sechs Richtungen. Reihenfolge ist stabil, weil die Zugwahl bei
     gleichwertigen Feldern sonst vom Zufall der Sortierung abhinge. */
  var RICHTUNGEN = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];

  function hex(q, r) { return { q: q, r: r }; }
  function gleich(a, b) { return a && b && a.q === b.q && a.r === b.r; }
  function schluessel(a) { return a.q + ',' + a.r; }

  /* Distanz über die Kubusdarstellung: die halbe Summe der drei Beträge. */
  function distanz(a, b) {
    var dq = a.q - b.q, dr = a.r - b.r, ds = (-a.q - a.r) - (-b.q - b.r);
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
  }

  function nachbarn(a) {
    return RICHTUNGEN.map(function (d) { return hex(a.q + d.q, a.r + d.r); });
  }

  /* Alle Felder mit Distanz <= n, das Zentrum eingeschlossen. Das ist die Form,
     die eine Fähigkeit mit Reichweite abdeckt. */
  function umkreis(mitte, n) {
    var out = [];
    for (var q = -n; q <= n; q++) {
      for (var r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) {
        out.push(hex(mitte.q + q, mitte.r + r));
      }
    }
    return out;
  }

  /* Nur der Rand: Distanz genau n. Für Formen wie „alles im Ring um mich". */
  function ring(mitte, n) {
    if (n <= 0) return [hex(mitte.q, mitte.r)];
    var out = [], h = hex(mitte.q + RICHTUNGEN[4].q * n, mitte.r + RICHTUNGEN[4].r * n);
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < n; j++) {
        out.push(hex(h.q, h.r));
        h = hex(h.q + RICHTUNGEN[i].q, h.r + RICHTUNGEN[i].r);
      }
    }
    return out;
  }

  /* Ein Schritt von `a` in Richtung `b`: der Nachbar, der die Distanz am
     stärksten senkt. `blockiert(hex)` darf Felder ausschließen — belegte etwa.
     Kein A*: auf einem Feld dieser Größe ohne Mauern reicht der gierige Schritt,
     und er ist nachvollziehbar. Läuft eine Einheit sich fest, gibt sie auf,
     statt zu zappeln. */
  function schritt(a, b, blockiert) {
    var best = null, bestD = distanz(a, b);
    nachbarn(a).forEach(function (n) {
      if (blockiert && blockiert(n)) return;
      var d = distanz(n, b);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  /* Ein Pfad aus höchstens `schritte` Schritten in Richtung `ziel`, der bei
     `reichweite` stehen bleibt — man läuft nicht in den Gegner hinein, sondern
     bis auf Schlagdistanz heran. */
  function laufe(von, ziel, schritte, reichweite, blockiert) {
    var hier = hex(von.q, von.r);
    for (var i = 0; i < schritte; i++) {
      if (distanz(hier, ziel) <= (reichweite || 1)) break;
      var s = schritt(hier, ziel, blockiert);
      if (!s) break;
      hier = s;
    }
    return hier;
  }

  /* Pixelmitte für die Darstellung. „Pointy top", Zeilen um eine halbe Breite
     versetzt. Nur die Anzeige braucht das. */
  function pixel(a, groesse) {
    return {
      x: groesse * Math.sqrt(3) * (a.q + a.r / 2),
      y: groesse * 1.5 * a.r
    };
  }

  root.Hex = {
    hex: hex, gleich: gleich, schluessel: schluessel, distanz: distanz,
    nachbarn: nachbarn, umkreis: umkreis, ring: ring, schritt: schritt,
    laufe: laufe, pixel: pixel, RICHTUNGEN: RICHTUNGEN
  };
})(globalThis);
