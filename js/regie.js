/* js/regie.js — Die Regie. Aus dem Kampflog wird ein Zeitplan.

   Bis hierher lief die Wiedergabe auf einer festen Uhr: `setInterval(schritt,
   70)`. Ein Giftstapel und ein Todesstoss bekamen dieselben 70 Millisekunden.
   Genau daran liegt es, dass ein Kampf sich gleichfoermig anfuehlt — nicht am
   Rendering.

   Diese Datei verteilt dieselbe Gesamtzeit ungleich: Belangloses wird
   gebuendelt, Hoehepunkte werden gedehnt. Das Zeitbudget bleibt dabei
   erhalten (70 ms mal Anzahl der Eintraege), es wandert nur.

   Rein: kein DOM, kein three.js, kein Zufall. Damit ist der Zeitplan in
   `dev/sim.js` headless pruefbar — und das ist er auch.                     */
'use strict';
(function (root) {

  /* Wie lange ein Ereignis wiegt, relativ zueinander. `setup` bekommt 0: es
     steht vor dem Kampf und kostete auch bisher keine Zeit. */
  var GEWICHT = {
    setup: 0,
    chaos: 0.4, status: 0.4, schild: 0.4, skip: 0.4, widersteht: 0.4,
    heal: 0.8,
    hit: 1.0,
    zug: 1.2,
    ausweichen: 1.5,
    fehlschlag: 2.0,
    wut: 3.0, kombi: 3.0, entladung: 3.0,
    aktiv: 3.5,
    revive: 4.0,
    death: 5.0,
    verwandlung: 6.0
  };

  var BASIS = 70, MIN = 25, MAX = 900;

  /* Hitstop: der Moment, in dem alles kurz stehenbleibt. Er liegt INNERHALB
     des `ms` seines Beats und kostet deshalb keine Extrazeit. */
  var STOPP = { finale: 260, toedlich: 140, gross: 90 };

  /* Ein Beat ist mehr wert als sein Typ allein sagt: der letzte Tod eines
     Kampfes ist kein Tod wie die anderen. Der Faktor geht in dasselbe Budget
     ein — was hier dazukommt, fehlt anderswo, und das ist die Absicht. */
  var BEAT_FAKTOR = { finale: 2.0, wende: 1.5, toedlich: 1.5, flaeche: 1.3, gross: 1.2 };

  /* Ein Treffer ist gross, wenn er ein Achtel der Lebenspunkte nimmt. */
  var GROSS = 0.12;

  /* -------------------------------------------------------------- Beats */

  /* Vorausschau. Die Wiedergabe kennt nur "naechster Eintrag" — der Zeitplan
     dagegen sieht das ganze Log und weiss deshalb schon beim Treffer, dass
     gleich jemand faellt. Ohne dieses Wissen gibt es keine Regie, nur Tempo. */
  function beats(log) {
    var b = new Array(log.length);
    var i, j, l;

    /* Startstaerke je Seite fuer `wende`. Der setup-Eintrag traegt das
       fertige Manifest; fehlt er, zaehlen wir die Schluessel aus dem Log. */
    var start = { player: 0, enemy: 0 }, gesehen = {};
    for (i = 0; i < log.length; i++) {
      if (log[i].type === 'setup' && log[i].roster) {
        log[i].roster.forEach(function (r) { if (start[r.side] !== undefined) start[r.side]++; });
        break;
      }
    }
    if (!start.player || !start.enemy) {
      for (i = 0; i < log.length; i++) {
        l = log[i];
        if (l.key && !gesehen[l.key] && start[l.side] !== undefined) { gesehen[l.key] = 1; start[l.side]++; }
      }
    }

    var letzterTod = -1;
    for (i = 0; i < log.length; i++) if (log[i].type === 'death') letzterTod = i;

    var tot = { player: 0, enemy: 0 };
    for (i = 0; i < log.length; i++) {
      l = log[i];

      if (l.type === 'hit') {
        /* toedlich: auf diesen Treffer folgt ein Tod desselben Ziels, bevor
           es erneut getroffen wird. */
        for (j = i + 1; j < log.length; j++) {
          if (log[j].key !== l.key) continue;
          if (log[j].type === 'death') { b[i] = 'toedlich'; break; }
          if (log[j].type === 'hit' || log[j].type === 'heal' || log[j].type === 'revive') break;
        }
        if (!b[i] && l.maxHp && l.dmg / l.maxHp >= GROSS) b[i] = 'gross';

      } else if (l.type === 'aktiv') {
        /* flaeche: einem Einsatz folgen mehrere Treffer, bevor der naechste
           Zug beginnt. So sieht die Anzeige eine Flaechenwirkung, ohne dass
           combat.js sie melden muesste. */
        var treffer = 0;
        for (j = i + 1; j < log.length; j++) {
          if (log[j].type === 'aktiv' || log[j].type === 'zug') break;
          if (log[j].type === 'hit') treffer++;
        }
        if (treffer >= 2) b[i] = 'flaeche';

      } else if (l.type === 'death') {
        if (tot[l.side] !== undefined) tot[l.side]++;
        if (i === letzterTod) b[i] = 'finale';
        else if (start[l.side] && tot[l.side] * 2 >= start[l.side] &&
                 (tot[l.side] - 1) * 2 < start[l.side]) b[i] = 'wende';
      }
    }
    return b;
  }

  /* -------------------------------------------------------------- Zeit */

  /* Rohverteilung nach Gewicht, dann geklammert — und nach jedem Klammern
     wird der Rest neu auf die Freien verteilt, sonst frisst die Untergrenze
     das Budget der Hoehepunkte auf. Drei Durchgaenge reichen; danach ist die
     Abweichung kleiner als die 2 %, die `dev/sim.js` zusichert. */
  function verteile(gew, budget) {
    var ms = new Array(gew.length), fest = new Array(gew.length);
    var i, durchgang;
    for (i = 0; i < gew.length; i++) { ms[i] = 0; fest[i] = gew[i] <= 0; }

    for (durchgang = 0; durchgang < 4; durchgang++) {
      var restBudget = budget, freiGew = 0;
      for (i = 0; i < gew.length; i++) {
        if (fest[i]) restBudget -= ms[i]; else freiGew += gew[i];
      }
      if (freiGew <= 0) break;
      var neu = false;
      for (i = 0; i < gew.length; i++) {
        if (fest[i]) continue;
        var w = restBudget * gew[i] / freiGew;
        if (w < MIN) { ms[i] = MIN; fest[i] = true; neu = true; }
        else if (w > MAX) { ms[i] = MAX; fest[i] = true; neu = true; }
        else ms[i] = w;
      }
      if (!neu) break;
    }
    for (i = 0; i < ms.length; i++) ms[i] = Math.round(ms[i]);
    return ms;
  }

  /* ---------------------------------------------------------- Zeitplan */

  /* Ein Eintrag je Logzeile, gleicher Index. `ms` ist die Standzeit NACH dem
     Abarbeiten, `stopp` der eingefrorene Anteil davon, `beat` der Grund. */
  function zeitplan(log, opts) {
    opts = opts || {};
    var basis = opts.basis || BASIS;
    var b = beats(log);
    var gew = new Array(log.length);
    var n = 0, i;
    for (i = 0; i < log.length; i++) {
      var g = GEWICHT[log[i].type];
      gew[i] = (g === undefined ? 1 : g) * (BEAT_FAKTOR[b[i]] || 1);
      if (log[i].type !== 'setup') n++;
    }
    var ms = verteile(gew, basis * n);

    var plan = new Array(log.length);
    for (i = 0; i < log.length; i++) {
      plan[i] = { i: i, ms: ms[i], beat: b[i] || null, stopp: STOPP[b[i]] || 0 };
      if (plan[i].stopp > plan[i].ms) plan[i].stopp = plan[i].ms;
    }
    return plan;
  }

  root.Regie = { zeitplan: zeitplan, GEWICHT: GEWICHT, BASIS: BASIS, MIN: MIN, MAX: MAX };

})(typeof globalThis !== 'undefined' ? globalThis : this);
