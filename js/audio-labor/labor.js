/* js/audio-labor/labor.js — der Umschalter fuers Varianten-Labor.

   Dieser Branch ist kein Feature, sondern ein Pruefstand. In `main` gilt
   `PLAN.md` Abschnitt 6: das Spiel bekommt keinen Ton. Hier liegen die 21
   Audio-Varianten aus den offenen PRs #1–#23 nebeneinander, damit man sie
   einmal anhoeren und dann entscheiden kann. Nichts davon gehoert nach `main`.

   Das Problem, das diese Datei loest: die 21 Varianten sind 21 Antworten auf
   dieselbe Frage. Jede legt ein Modul an (`js/audio.js`, `js/ton.js` oder
   `js/klang.js`), jede haengt sich in dieselbe Stelle in `js/ui.js`, und jede
   schreibt ihre Schnittstelle unter einen von vier Namen — `Klang`, `Ton`,
   `Sound`, `SFX`. Nebeneinander geladen wuerde die letzte alle vorherigen
   ueberschreiben; alle gleichzeitig angebunden waeren Laerm statt Sounddesign.

   Also: `js/ui.js` kennt nur diese eine Anbindung (`AudioLabor.spiele`), nicht
   21, und im Menue haekelt man an, welche davon mitlaufen. Mehrere gleichzeitig
   sind ausdruecklich erlaubt — zum Vergleichen zweier Kandidaten am selben
   Kampf ist das der ganze Zweck. Wer alle anhaekelt, bekommt Laerm; das ist
   dann seine Entscheidung und nicht die des Umschalters. */
(function (root) {
  'use strict';

  /* Wer was exportiert und wie er angesprochen werden will. Geraten wird hier
     nichts: `global` und `art` sind aus dem `js/ui.js` des jeweiligen PRs
     abgelesen. Das ist noetig, weil die Varianten sich nicht nur im Klang
     unterscheiden, sondern in der Bauform der Schnittstelle:

       log      `spiele(l, beat)` — der Logeintrag geht unveraendert rein
       ereignis `ereignis(l, beat)` — dasselbe unter anderem Namen
       kampf    `kampf(l, beat)`   — dasselbe unter drittem Namen
       typ04    `spiele(l.type, { beat, dmg, maxHp, winner })`
       typ09    `spiele(typ, kw, staerke, beat)` — vier Einzelargumente
       typ21    `spiele(name)` mit eigenen Namen ('tod' statt 'death')
       einzeln  je Ereignis eine eigene Methode: `treffer()`, `tod()`, …

     Duck-Typing reicht hier nicht: PR #4 und PR #21 haben beide eine Methode
     namens `spiele`, die aber einen String erwartet. Bekommt sie den
     Logeintrag, faellt sie stillschweigend durch — die Variante klaenge nur
     noch beim Klicken und saehe dabei aus, als sei sie einfach leise. */
  var KATALOG = [
    { id: 'pr-01', pr: 1,  global: 'Sound', art: 'einzeln',  titel: 'Sound-Effekte: synthetisierte Audio-Politur' },
    { id: 'pr-02', pr: 2,  global: 'SFX',   art: 'einzeln',  titel: 'Prozedurale Klangkulisse fuers Kampf-Replay' },
    { id: 'pr-03', pr: 3,  global: 'Ton',   art: 'einzeln',  titel: 'Prozedurales Sound-Design fuer Kampf und UI' },
    { id: 'pr-04', pr: 4,  global: 'Klang', art: 'typ04',    titel: 'Klang: prozedurale Toneffekte (Phase 62)' },
    { id: 'pr-05', pr: 5,  global: 'Ton',   art: 'log',      titel: 'Synthetische Kampf-Sounds fuers Gamefeel' },
    { id: 'pr-06', pr: 6,  global: 'Ton',   art: 'einzeln',  titel: 'Sound-Design fuer Kampf und Ergebnis' },
    { id: 'pr-07', pr: 7,  global: 'Klang', art: 'log',      titel: 'Sound-Engine ohne Audiodateien' },
    { id: 'pr-08', pr: 8,  global: 'Ton',   art: 'log',      titel: 'Kampfton: Web-Audio-Engine statt Stille' },
    { id: 'pr-09', pr: 9,  global: 'Klang', art: 'typ09',    titel: 'Sounddesign per Web Audio API' },
    { id: 'pr-12', pr: 12, global: 'Klang', art: 'log',      titel: 'Soundeffekte ueber Web Audio' },
    { id: 'pr-13', pr: 13, global: 'Klang', art: 'einzeln',  titel: 'Audio-Feedback fuer Kampf, Menue und Markt' },
    { id: 'pr-14', pr: 14, global: 'Klang', art: 'ereignis', titel: 'Klangkulisse: das Spiel war komplett stumm' },
    { id: 'pr-15', pr: 15, global: 'Ton',   art: 'kampf',    titel: 'Sound-Kulisse per Web Audio API' },
    { id: 'pr-16', pr: 16, global: 'Klang', art: 'einzeln',  titel: 'Synthetisierte Kampf- und UI-Sounds' },
    { id: 'pr-17', pr: 17, global: 'Ton',   art: 'einzeln',  titel: 'Kampfton: Audio-Feedback fuer den Kampf' },
    { id: 'pr-18', pr: 18, global: 'Klang', art: 'ereignis', titel: 'Klangkulisse fuer Kampf und Menue' },
    { id: 'pr-19', pr: 19, global: 'Klang', art: 'einzeln',  titel: 'Prozedurale Sound-Effekte statt Stille' },
    { id: 'pr-20', pr: 20, global: 'Klang', art: 'log',      titel: 'Klang-System: Kampf und UI werden hoerbar' },
    { id: 'pr-21', pr: 21, global: 'Ton',   art: 'typ21',    titel: 'Sounddesign fuer Kampf und UI' },
    { id: 'pr-22', pr: 22, global: 'Klang', art: 'log',      titel: 'Kampf-Audio: das Spiel hat einen Ton' },
    { id: 'pr-23', pr: 23, global: 'Klang', art: 'log',      titel: 'SFX fuer Treffer, Tod, Sieg und UI' }
  ];

  var nachId = {};
  KATALOG.forEach(function (e) { nachId[e.id] = e; e.fabrik = null; e.modul = null; });

  /* Die angehaekelten Varianten, in Katalogreihenfolge. Leer heisst stumm —
     es gibt keinen eigenen `aus`-Eintrag mehr, nichts angehaekelt ist `aus`.

     ponytail: jede aktive Variante haelt ihren eigenen AudioContext. Alle 21
     gleichzeitig baut Chromium klaglos, aber Browser deckeln die Zahl pro
     Seite. Reisst der Deckel, wirft `new AudioContext()`, der Fehler landet in
     `e.fehler` und damit sichtbar in `liste()` statt als Stille. Ein
     gemeinsamer Context waere die Loesung, kostet aber einen Eingriff in alle
     21 Varianten — erst bauen, wenn der Deckel jemanden wirklich trifft. */
  var aktive = [];

  /* Der Schirm. Lesen faellt auf das echte globale Objekt durch (die Varianten
     brauchen `AudioContext`, `localStorage`, gelegentlich `Abilities`),
     Schreiben bleibt drin. Funktionen werden an das echte globale Objekt
     gebunden — sonst wirft `setTimeout` mit dem Proxy als Empfaenger. Dass
     `bind` auch Konstruktoren ueberlebt, ist Absicht: `new ctx.AudioContext()`
     muss weiter gehen. */
  function schirm(eigen) {
    if (typeof Proxy !== 'function') return root;
    return new Proxy(eigen, {
      get: function (t, k) {
        if (k in t) return t[k];
        var v = root[k];
        return typeof v === 'function' ? v.bind(root) : v;
      },
      set: function (t, k, v) { t[k] = v; return true; },
      has: function (t, k) { return k in t || k in root; },
      deleteProperty: function (t, k) { delete t[k]; return true; }
    });
  }

  /* Ruft jede Variante beim Laden auf (siehe Kopf der `pr-*.js`). Die Fabrik
     wird hier nur gemerkt, nicht ausgefuehrt: 21 Varianten sofort zu
     instanziieren hiesse 21 `AudioContext` aufzumachen, und davon gibt der
     Browser nicht beliebig viele her. Gebaut wird erst beim Umschalten. */
  function registriere(id, fabrik) {
    var e = nachId[id];
    if (!e) return;
    e.fabrik = fabrik;
  }

  function baue(e) {
    if (e.modul || !e.fabrik) return e.modul;
    var eigen = Object.create(null);
    try {
      e.fabrik(schirm(eigen));
      e.modul = eigen[e.global] || null;
    } catch (err) {
      e.fehler = String(err);
      e.modul = null;
    }
    return e.modul;
  }

  /* Alle angehaekelten Varianten, gebaut. Wer nicht baut, faellt raus statt
     den Rest mitzureissen. */
  function module() {
    var out = [];
    aktive.forEach(function (id) {
      var e = nachId[id];
      var m = e && (e.modul || baue(e));
      if (m) out.push({ e: e, m: m });
    });
    return out;
  }

  /* Ein- und Ausschalten quer durch vier Generationen Schnittstelle. Die
     Varianten sind sich nicht einig, ob die Stufe `'an'/'aus'`,
     `'voll'/'sparsam'/'aus'` oder `'voll'/'leise'/'aus'` heisst — die
     validierenden Fassungen geben einen unbekannten Wert unveraendert zurueck,
     also darf man beides nacheinander versuchen. Die Fassungen mit
     Stumm-Schalter statt Stufe werden ueber ihren eigenen Getter angeglichen,
     damit ein Umschalten nicht zufaellig das Gegenteil bewirkt. */
  function schalte(m, ein) {
    if (!m) return;
    versuch(function () {
      if (typeof m.stufe === 'function') {
        if (ein) { m.stufe('voll'); m.stufe('an'); } else { m.stufe('aus'); }
      }
      if (typeof m.schalte === 'function') m.schalte(ein);
      if (typeof m.setzeAn === 'function') m.setzeAn(ein);
      if (typeof m.stelleStumm === 'function') m.stelleStumm(!ein);
      if (typeof m.setzeStumm === 'function') m.setzeStumm(!ein);
      if (typeof m.stummSchalten === 'function' && typeof m.istStumm === 'function') {
        if (m.istStumm() === ein) m.stummSchalten();
      }
      if (typeof m.schalteStumm === 'function' && typeof m.stummgeschaltet === 'function') {
        if (m.stummgeschaltet() === ein) m.schalteStumm();
      }
    });
  }

  /* Die Autoplay-Sperre: ein `AudioContext` startet ausgesetzt und darf erst
     nach einer Nutzergeste laufen. Jede Variante hat sich einen eigenen Namen
     dafuer ausgedacht. */
  function entsperren() {
    module().forEach(function (p) {
      versuch(function () {
        ['entsperren', 'wecken', 'wecke', 'init'].forEach(function (n) {
          if (typeof p.m[n] === 'function') p.m[n]();
        });
      });
    });
  }

  function versuch(f) { try { f(); } catch (e) {} }

  function ruf(m, name) {
    if (!m || typeof m[name] !== 'function') return false;
    var args = Array.prototype.slice.call(arguments, 2);
    try { m[name].apply(m, args); } catch (e) {}
    return true;
  }

  /* Der eine Einstieg, den `js/ui.js` kennt: ein Logeintrag rein, uebersetzt
     in das, was die aktive Variante versteht. Der Eintrag `end` laeuft hier
     mit durch — er steht als letzter im Kampflog (`js/combat.js`), also
     braucht es keinen zweiten Weg fuer Sieg und Niederlage. */
  function spiele(l, beat) {
    if (!l) return;
    module().forEach(function (p) { einem(p.e, p.m, l, beat); });
  }

  function einem(e, m, l, beat) {
    switch (e.art) {
      case 'log':      ruf(m, 'spiele', l, beat); break;
      case 'ereignis': ruf(m, 'ereignis', l, beat); break;
      case 'kampf':    ruf(m, 'kampf', l, beat); break;
      case 'typ04':
        ruf(m, 'spiele', l.type,
            { beat: beat, dmg: l.dmg, maxHp: l.maxHp, winner: l.winner });
        break;
      case 'typ09':    typ09(m, l, beat); break;
      case 'typ21':    typ21(m, l, beat); break;
      default:         einzeln(m, l, beat); break;
    }
  }

  /* PR #9: vier Einzelargumente, und der Schadensanteil steckt im dritten. */
  function typ09(m, l, beat) {
    var TYPEN = ['aktiv', 'hit', 'heal', 'death', 'revive', 'entladung',
                 'verwandlung', 'kombi', 'ausweichen', 'fehlschlag'];
    if (TYPEN.indexOf(l.type) < 0) return;
    if (l.type === 'aktiv') ruf(m, 'spiele', 'aktiv', l.kw, null, beat);
    else if (l.type === 'hit') ruf(m, 'spiele', 'hit', null, l.dmg / (l.maxHp || 1), beat);
    else ruf(m, 'spiele', l.type, null, null, beat);
  }

  /* PR #21 hat eigene Namen: `tod` statt `death`, `einsatz` statt `aktiv`. */
  function typ21(m, l, beat) {
    var NAMEN = { heal: 'heilung', death: 'tod', revive: 'wiederbelebung',
                  schild: 'schild', ausweichen: 'ausweichen',
                  fehlschlag: 'fehlschlag', wut: 'wut', kombi: 'kombi',
                  entladung: 'entladung', verwandlung: 'verwandlung',
                  resonanz: 'resonanz' };
    if (l.type === 'hit') { ruf(m, 'spiele', 'treffer', l.dmg / (l.maxHp || 1), beat); return; }
    if (l.type === 'aktiv') { ruf(m, 'spiele', 'einsatz', l.side === 'player'); return; }
    if (l.type === 'end') { ruf(m, 'spiele', l.winner === 'player' ? 'sieg' : 'niederlage'); return; }
    if (NAMEN[l.type]) ruf(m, 'spiele', NAMEN[l.type]);
  }

  function einzeln(m, l, beat) {
    if (l.type === 'end') {
      if (l.winner === 'player') ruf(m, 'sieg'); else ruf(m, 'niederlage');
      return;
    }
    /* `treffer` erwartet bei den meisten Fassungen den Schadensanteil am
       maximalen Leben — dieselbe Zahl, die `Brett3D.treffer` bekommt. */
    var anteil = l.dmg && l.maxHp ? l.dmg / l.maxHp : 0.3;
    switch (l.type) {
      case 'hit':
        ruf(m, 'treffer', anteil, beat, l.dmg);
        break;
      case 'heal':
        ruf(m, 'heilung', l.amount, beat) || ruf(m, 'effekt', 'heilung');
        break;
      case 'death':
        ruf(m, 'tod', beat);
        break;
      case 'revive':
        ruf(m, 'wiederbelebung', beat) || ruf(m, 'wiederbelebt', beat) ||
        ruf(m, 'revive', beat) || ruf(m, 'effekt', 'wiederbelebung');
        break;
      case 'schild':
        ruf(m, 'schild', beat) || ruf(m, 'schildFang', beat) || ruf(m, 'effekt', 'schild');
        break;
      case 'aktiv':
        ruf(m, 'aktiv', l.kw, beat) || ruf(m, 'signatur', l.kw, beat) ||
        ruf(m, 'effekt', l.kw, beat);
        break;
      case 'verwandlung':
        ruf(m, 'verwandlung', beat) || ruf(m, 'effekt', 'verwandlung');
        break;
      default:
        break;
    }
  }

  function klick() {
    module().forEach(function (p) {
      ruf(p.m, 'klick') || ruf(p.m, 'taste') || ruf(p.m, 'ui', 'klick');
    });
  }

  /* Auswahl setzen. Abgewaehlte Varianten werden stummgeschaltet, statt sie
     nur nicht mehr zu beliefern: mehrere haben eigene Schleifen (Ambient-Bett,
     Nachhall), die sonst weiterlaufen wuerden, obwohl der Haken weg ist.

     Nimmt eine Liste von Ids; ein einzelner String und das alte `'aus'` gehen
     weiter durch, damit ein Aufruf von Hand in der Konsole nicht ueberrascht. */
  function waehle(ids) {
    if (typeof ids === 'string') ids = ids === 'aus' ? [] : [ids];
    var neu = (ids || []).filter(function (id) { return !!nachId[id]; });
    /* Katalogreihenfolge, damit `gewaehlt()` unabhaengig von der Klickfolge
       immer dasselbe liefert (der Test vergleicht darauf). */
    neu = KATALOG.map(function (e) { return e.id; })
                 .filter(function (id) { return neu.indexOf(id) >= 0; });

    aktive.forEach(function (id) {
      if (neu.indexOf(id) < 0 && nachId[id].modul) schalte(nachId[id].modul, false);
    });
    var vorher = aktive;
    aktive = neu;
    module().forEach(function (p) {
      if (vorher.indexOf(p.e.id) < 0) schalte(p.m, true);
    });
    entsperren();
    return aktive.slice();
  }

  function gewaehlt() { return aktive.slice(); }

  /* Fuer die Auswahlliste im Menue. `bereit` sagt, ob die Datei ueberhaupt
     geladen wurde — fehlt ein Skript-Tag, faellt das hier auf und nicht erst
     als Stille beim Testen. */
  function liste() {
    return KATALOG.map(function (e) {
      return { id: e.id, pr: e.pr, titel: e.titel, bereit: !!e.fabrik, fehler: e.fehler || null };
    });
  }

  root.AudioLabor = {
    registriere: registriere, waehle: waehle, gewaehlt: gewaehlt, liste: liste,
    spiele: spiele, klick: klick, entsperren: entsperren
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
