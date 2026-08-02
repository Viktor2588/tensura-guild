/* js/brett3d.js — die 2.5D-Ansicht des Schlachtfelds.

   Das Brett ist echt dreidimensional (sechseckige Kacheln, gekippte Kamera,
   Licht), die Figuren sind flache Bilder, die immer zur Kamera schauen. Genau
   diese Mischung meint „2.5D": sie ist der Weg von Final Fantasy Tactics und
   Disgaea, und sie ist hier auch der einzige gangbare — für gerigte 3D-Modelle
   von vierzig Charakteren gibt es keine Quelle, für Bilder schon.

   Die Ansicht ist eine LAGEKARTE, kein Spielbrett: keine Steuerung, keine
   Auswahl. Eingreifen kann man im Kampf ohnehin nicht, und was man nicht
   bedienen kann, soll auch nicht so aussehen.

   Die Kamera steht dabei fest — bis auf die Erschuetterung beim Treffer. Das
   ist keine Ausnahme von der Regel, sondern ihre Bestaetigung: sie ist nicht
   bedienbar, sie ist Rueckmeldung. (Phase 59 nimmt sich die Kamera als Ganzes
   vor und schreibt diesen Absatz dann neu.)

   Ohne WebGL passiert hier gar nichts — `verfuegbar()` sagt nein, und die
   Oberfläche bleibt bei der SVG-Lagekarte. Das ist keine Höflichkeit gegenüber
   alten Browsern, sondern hält den UI-Test lauffähig, der in jsdom läuft.     */
(function (root) {
  'use strict';

  var G = 1;                       // Hexradius in Weltmaßen; alles andere relativ
  var KACHEL_H = 0.22;             // Kachelhöhe — genug für eine sichtbare Kante
  var SPRITE_H = 3.2;              // Figurenhöhe, gemessen in Hexradien

  /* Wohin echte Bilder gehören, sobald es welche gibt. Fehlt die Datei, zeichnet
     `platzhalter()` eine Figur — die Ansicht funktioniert also von Anfang an,
     und Kunst tropft später ohne Codeänderung ein. Siehe ASSETS.md. */
  var BILDPFAD = 'assets/einheiten/';

  var zustand = null;              // { renderer, scene, camera, figuren, el, raf }
  var texturen = {};               // id -> THREE.Texture, über Kämpfe hinweg

  /* Die Antwort wird gemerkt, und zwar zwingend: jeder Aufruf legte bisher
     eine Leinwand mit eigenem WebGL-Kontext an und gab sie nie frei. Seit die
     Wiedergabe je Logeintrag fragt, laeuft der Browser damit in „Too many
     active WebGL contexts" und wirft dem Brett den Kontext unter den Fuessen
     weg. Einmal fragen genuegt — die Antwort aendert sich nicht. */
  var kannWebGL = null;
  function verfuegbar() {
    if (kannWebGL !== null) return kannWebGL;
    if (!root.THREE || !root.document) return false;   // noch nicht geladen: nicht merken
    try {
      var c = root.document.createElement('canvas');
      kannWebGL = !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { kannWebGL = false; }
    return kannWebGL;
  }

  /* ---- Die Figur, solange es kein Bild gibt --------------------------------
     Bewusst eine Silhouette und keine Andeutung eines Gesichts: ein schlechtes
     Gesicht liest sich als kaputt, eine Silhouette als Absicht. Die Rolle formt
     die Umrisse — daran erkennt man auf dem Brett, wer weit reicht und wer
     heranlaufen muss, und genau das ist die Regel, die die Karte zeigen soll. */
  function platzhalter(u) {
    var c = root.document.createElement('canvas');
    c.width = 128; c.height = 256;
    var x = c.getContext('2d'), mitte = 64;
    var haut = u.side === 'player' ? '#7fb0e8' : '#e08078';
    var stoff = u.side === 'player' ? '#2c4a72' : '#6b2a26';

    x.lineWidth = 5;
    x.strokeStyle = 'rgba(0,0,0,.55)';
    x.lineJoin = 'round';

    /* Umhang/Körper: unten breit, oben schmal. Die Breite trägt die Rolle. */
    var breit = u.role === 'front' ? 40 : u.role === 'fernkampf' ? 26 : 32;
    x.beginPath();
    x.moveTo(mitte - breit, 232);
    x.lineTo(mitte - breit * 0.55, 120);
    x.lineTo(mitte + breit * 0.55, 120);
    x.lineTo(mitte + breit, 232);
    x.closePath();
    x.fillStyle = stoff; x.fill(); x.stroke();

    /* Kopf */
    x.beginPath();
    x.arc(mitte, 92, 26, 0, Math.PI * 2);
    x.fillStyle = haut; x.fill(); x.stroke();

    /* Die Waffe macht den Unterschied auf einen Blick sichtbar. */
    x.strokeStyle = 'rgba(0,0,0,.55)';
    x.fillStyle = '#cfd6df';
    if (u.role === 'front') {                       // Klinge, aufrecht
      x.beginPath(); x.rect(mitte + breit - 4, 96, 9, 118);
      x.fill(); x.stroke();
      x.beginPath(); x.moveTo(mitte + breit - 12, 96);
      x.lineTo(mitte + breit + 13, 96); x.lineTo(mitte + breit + 0.5, 66);
      x.closePath(); x.fill(); x.stroke();
    } else if (u.role === 'fernkampf') {            // Bogen
      x.beginPath();
      x.arc(mitte + breit + 4, 155, 46, -Math.PI * 0.62, Math.PI * 0.62);
      x.lineWidth = 8; x.strokeStyle = '#9a7038'; x.stroke();
      x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,0,.55)';
    } else {                                        // Stab für alles Magische
      x.beginPath(); x.rect(mitte + breit - 2, 74, 8, 148);
      x.fillStyle = '#9a7038'; x.fill(); x.stroke();
      x.beginPath(); x.arc(mitte + breit + 2, 68, 13, 0, Math.PI * 2);
      x.fillStyle = u.side === 'player' ? '#8fd0ff' : '#ffb060';
      x.fill(); x.stroke();
    }

    var tex = new root.THREE.CanvasTexture(c);
    tex.magFilter = root.THREE.NearestFilter;       // scharfe Kanten statt Matsch
    return tex;
  }

  /* Erst der Platzhalter, dann — falls die Datei existiert — das echte Bild.
     Andersherum bliebe die Figur bis zum Ladefehler unsichtbar. */
  function textur(u, material) {
    var id = u.id || u.key;
    if (texturen[id]) return texturen[id];
    var tex = platzhalter(u);
    texturen[id] = tex;
    var bild = new root.Image();
    bild.onload = function () {
      var echt = new root.THREE.CanvasTexture(bild);
      texturen[id] = echt;
      if (material) material.map = echt;
    };
    bild.onerror = function () { };                 // Platzhalter bleibt stehen
    bild.src = BILDPFAD + id + '.png';
    return tex;
  }

  function balken(breiteAnteil, farbe) {
    var m = new root.THREE.SpriteMaterial({ color: farbe, depthTest: false });
    var s = new root.THREE.Sprite(m);
    s.scale.set(0.95 * breiteAnteil, 0.13, 1);
    return s;
  }

  function weltpos(hexfeld) {
    var p = root.Hex.pixel(hexfeld, G);
    return { x: p.x, z: p.y };
  }

  /* ---- Effekte -------------------------------------------------------------
     Vierzig Signaturen, aber KEINE vierzig Effekte: der Effekt hängt am
     SCHLÜSSELWORT, nicht am Namen. Das ist nicht die faule Abkürzung, sondern
     die richtige Zuordnung — das Schlüsselwort ist bereits das, worum die
     ganze Fähigkeit gebaut ist, und was der Spieler beim Bauen auswählt. Wer
     Brand spielt, soll Brand SEHEN, gleich von welcher Einheit.

     Zwei Bewegungen reichen für alles: etwas fliegt hinüber und schlägt ein,
     oder etwas steigt an der eigenen Figur auf. Alles andere ist Farbe,
     Streuung und Tempo. */
  var FARBE = {
    brand: 0xff7a2a, gift: 0x86d94a, frost: 0x8fe0ff, donner: 0xffe14a,
    blutung: 0xd8382f, verderbnis: 0xc44ad8, chaos: 0xff5fbf,
    schatten: 0x8b5cf6, dunkelheit: 0x6c34a8, licht: 0xfff0b0,
    heilung: 0x6ee7a8, schild: 0x6aa8ff, konter: 0xffc46a,
    exekution: 0xff3b3b, verwundbar: 0xff9a5a, tempo: 0xa8ffe0,
    flaeche: 0xffb347
  };

  /* Wer sich selbst stärkt, schickt nichts hinüber. */
  var AN_SICH = { heilung: 1, schild: 1, tempo: 1, schatten: 1, konter: 1 };
  /* Wer schlägt statt zu werfen: kein Flug, nur der Einschlag. */
  var SOFORT = { donner: 1, licht: 1, dunkelheit: 1, exekution: 1 };

  var funkeTex = null;
  function funke() {
    if (funkeTex) return funkeTex;
    var c = root.document.createElement('canvas');
    c.width = c.height = 64;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    funkeTex = new root.THREE.CanvasTexture(c);
    return funkeTex;
  }

  function teilchen(farbe, groesse) {
    var T = root.THREE;
    var m = new T.SpriteMaterial({ map: funke(), color: farbe, transparent: true,
                                   depthWrite: false, blending: T.AdditiveBlending });
    var s = new T.Sprite(m);
    s.scale.set(groesse, groesse, 1);
    return s;
  }

  /* Ein Effekt ist eine Handvoll Funken mit Startpunkt, Richtung und Laufzeit.
     Gerechnet wird beim Zeichnen, nicht gespeichert — kein Zustand, der
     zwischen zwei Kämpfen hängenbleiben kann. */
  function effekt(vonKey, nachKey, kw, farbeOpt) {
    if (!zustand) return;
    var vonF = zustand.figuren[vonKey], nachF = zustand.figuren[nachKey || vonKey];
    if (!vonF) return;
    var farbe = farbeOpt || FARBE[kw] || 0xdfe6f0;
    var anSich = AN_SICH[kw] || !nachF || nachF === vonF;
    var a = vonF.gruppe.position, b = (nachF || vonF).gruppe.position;
    var zahl = anSich ? 12 : 16;
    var dauer = anSich ? 620 : 520;
    var flug = SOFORT[kw] ? 0.12 : 0.5;               // Anteil der Zeit bis zum Ziel
    var funken = [];

    for (var i = 0; i < zahl; i++) {
      var s = teilchen(farbe, 0.5 + Math.random() * 0.5);
      s.renderOrder = 3;
      zustand.scene.add(s);
      funken.push({
        s: s,
        /* Streuung am Ziel, damit es einschlägt statt zu treffen wie ein Punkt. */
        streuX: (Math.random() - 0.5) * 1.7,
        streuY: Math.random() * 1.9,
        streuZ: (Math.random() - 0.5) * 1.7,
        /* Versatz am Start: der Schwarm bricht auf, statt aus einem Loch zu kommen. */
        abX: (Math.random() - 0.5) * 0.7,
        abZ: (Math.random() - 0.5) * 0.7,
        verzug: Math.random() * 0.22
      });
    }

    zustand.effekte.push({
      funken: funken, start: 0, dauer: dauer, flug: flug, anSich: anSich,
      ax: a.x, ay: SPRITE_H * 0.5, az: a.z, bx: b.x, by: SPRITE_H * 0.45, bz: b.z
    });
    if (!zustand.raf) zustand.raf = root.requestAnimationFrame(schleife);
  }

  /* Einen Effekt auf den Stand `p` (0..1) bringen. Gibt false zurück, wenn er
     abgelaufen ist. */
  function zeichneEffekt(e, p) {
    e.funken.forEach(function (f) {
      var q = Math.max(0, Math.min(1, (p - f.verzug) / (1 - f.verzug)));
      var s = f.s;
      if (e.anSich) {
        /* Aufsteigen und ausblenden: eine Stärkung geht nach oben. */
        s.position.set(e.ax + f.abX * (1 + q), e.ay + f.streuY * q * 1.6, e.az + f.abZ * (1 + q));
        s.material.opacity = Math.sin(q * Math.PI);
      } else if (q < e.flug) {
        /* Flug. Ein leichter Bogen, sonst sieht es aus wie ein Schieberegler. */
        var w = e.flug ? q / e.flug : 1;
        var bogen = Math.sin(w * Math.PI) * 1.5;
        s.position.set(e.ax + (e.bx - e.ax) * w + f.abX,
                       e.ay + (e.by - e.ay) * w + bogen,
                       e.az + (e.bz - e.az) * w + f.abZ);
        s.material.opacity = 1;
      } else {
        /* Einschlag: auseinanderstieben und verlöschen. */
        var v = (q - e.flug) / (1 - e.flug);
        s.position.set(e.bx + f.streuX * v, e.by + f.streuY * v * 0.8, e.bz + f.streuZ * v);
        s.material.opacity = 1 - v;
      }
      s.material.opacity *= 0.95;
    });
    return p < 1;
  }

  function raeumeEffekt(e) {
    e.funken.forEach(function (f) {
      zustand.scene.remove(f.s);
      f.s.material.dispose();
    });
  }

  /* ---- Einschlag -----------------------------------------------------------
     Bis hierher stand im Log, dass jemand getroffen wurde, und auf dem Brett
     sank eine Zahl. Ein Treffer braucht vier Dinge, und keins davon ist ein
     Partikel: Aufblitzen (WEN hat es erwischt), Rueckstoss (aus WELCHER
     Richtung), Erschuetterung (WIE HART) und eine Zahl (WIE VIEL).

     Die Richtung ist der Grund, warum `js/combat.js` den Schluessel des
     Angreifers mitloggen muss — ohne ihn bleibt nur ein Zucken auf der
     Stelle.                                                                  */

  var STOSS = 0.18;                  // Rueckstoss des Ziels, in Hexradien
  var AUSFALL = 0.25;                // Ausfallschritt des Nahkaempfers

  function halt(ms) {
    if (!zustand) return;
    zustand.halt = Math.max(zustand.halt || 0, ms || 0);
    if (!zustand.raf) zustand.raf = root.requestAnimationFrame(schleife);
  }

  function ruettel(staerke) {
    if (!zustand) return;
    zustand.ruettel = Math.min(1.2, (zustand.ruettel || 0) + staerke);
    if (!zustand.raf) zustand.raf = root.requestAnimationFrame(schleife);
  }

  /* Die Zahl haengt als DOM ueber der Leinwand, nicht als Sprite darin: Text
     im WebGL-Bild waere eine Schriftatlas-Bastelei, und `CSS2DRenderer` ist
     ein Addon — die gibt es auf r149 UMD nicht.
     ponytail: einmal projiziert und dann per CSS bewegt. Sobald die Kamera in
     Phase 59 faehrt, muss die Position je Bild mitlaufen. */
  function zahl(f, wert, seite, gross) {
    if (!zustand || !zustand.zahlen) return;
    var v = new root.THREE.Vector3(f.gruppe.position.x, SPRITE_H * 0.75, f.gruppe.position.z);
    v.project(zustand.camera);
    var el = root.document.createElement('span');
    el.className = (seite === 'player' ? 'spieler' : 'feind') +
      (gross ? ' gross' : '') + (wert < 0 ? ' heilung' : '');
    el.textContent = (wert < 0 ? '+' : '') + Math.abs(Math.round(wert));
    el.style.left = ((v.x * 0.5 + 0.5) * 100) + '%';
    el.style.top = ((-v.y * 0.5 + 0.5) * 100) + '%';
    zustand.zahlen.appendChild(el);
    root.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  }

  /* `anteil` ist der Schaden gemessen an den Lebenspunkten des Ziels — daraus
     kommt jede Staerke hier. Ein negativer Wert ist Heilung: die blitzt und
     zaehlt, aber stoesst niemanden weg. */
  function treffer(vonKey, nachKey, anteil, beat, wert) {
    if (!zustand) return;
    var ziel = zustand.figuren[nachKey];
    if (!ziel) return;
    anteil = Math.max(0, Math.min(1, anteil || 0));
    var heil = wert < 0;

    ziel.blitz = 1;
    ziel.blitzFarbe = heil ? 0x6ee7a8 : 0xffffff;
    if (wert !== undefined && wert !== null) {
      zahl(ziel, wert, ziel.seite, !heil && (beat === 'gross' || beat === 'toedlich' || beat === 'finale'));
    }
    if (heil) { if (!zustand.raf) zustand.raf = root.requestAnimationFrame(schleife); return; }

    var von = vonKey && zustand.figuren[vonKey];
    var rx = 0, rz = 1;
    if (von && von !== ziel) {
      var dx = ziel.pos.x - von.pos.x, dz = ziel.pos.z - von.pos.z;
      var weit = Math.sqrt(dx * dx + dz * dz) || 1;
      rx = dx / weit; rz = dz / weit;
      /* Wer danebensteht, faellt aus; wer aus der Ferne schiesst, tritt zurueck.
         Beides sagt dasselbe: der Schlag hat eine Herkunft. */
      var nah = weit < G * 1.7;
      von.stoss = { x: rx * (nah ? AUSFALL : -0.1), z: rz * (nah ? AUSFALL : -0.1), t: 1 };
    }
    var wucht = 0.5 + anteil;
    ziel.stoss = { x: rx * STOSS * wucht, z: rz * STOSS * wucht, t: 1 };
    ruettel((0.05 + anteil * 0.5) * (beat === 'toedlich' || beat === 'finale' ? 1.8 : 1));
  }

  /* Tod war bisher `opacity = 0.22` — die Figur wurde blass, und das war
     alles. Jetzt zerfaellt sie: ein Funkenstoss in der Seitenfarbe, das Bild
     treibt nach oben und verlischt. Es bleibt ein sehr blasser Rest stehen,
     denn wer gefallen ist, gehoert weiter auf die Lagekarte. */
  function zerfall(f, key, seite) {
    f.loesch = 0.0001;
    effekt(key, null, null, seite === 'player' ? 0x6aa8ff : 0xff6a5a);
    ruettel(0.18);
  }

  /* ---- Aufbau -------------------------------------------------------------- */

  function baueKacheln(scene, einheiten) {
    var T = root.THREE;
    var minQ = 99, maxQ = -99, minR = 99, maxR = -99;
    einheiten.forEach(function (u) {
      minQ = Math.min(minQ, u.hex.q); maxQ = Math.max(maxQ, u.hex.q);
      minR = Math.min(minR, u.hex.r); maxR = Math.max(maxR, u.hex.r);
    });
    /* Rand nur in Laufrichtung. Quer dazu stehen ohnehin schon alle drei
       Reihen — noch zwei leere hinzuzunehmen macht das Brett tiefer, und je
       tiefer es ist, desto kleiner werden die Figuren im flachen Streifen. */
    minQ--; maxQ++;

    var geo = new T.CylinderGeometry(G * 0.94, G * 0.94, KACHEL_H, 6);
    var mitteQ = (minQ + maxQ) / 2;
    var kacheln = new T.Group();
    for (var q = minQ; q <= maxQ; q++) {
      for (var r = minR; r <= maxR; r++) {
        /* Die eigene Hälfte ist kühl, die gegnerische warm — die Seiten sind
           damit lesbar, auch bevor man die Figuren erkennt. */
        var eigen = q < mitteQ;
        var m = new T.MeshLambertMaterial({ color: eigen ? 0x2c3444 : 0x3d3038 });
        var k = new T.Mesh(geo, m);
        var p = weltpos({ q: q, r: r });
        k.position.set(p.x, 0, p.z);
        kacheln.add(k);
      }
    }
    scene.add(kacheln);

    /* Bei „pointy top" wächst x mit q UND r, z nur mit r — die Ecken der
       Bounding-Box sind deshalb (minQ,minR) und (maxQ,maxR). */
    var p1 = weltpos({ q: minQ, r: minR }), p2 = weltpos({ q: maxQ, r: maxR });
    return {
      mitteX: (p1.x + p2.x) / 2, mitteZ: (p1.z + p2.z) / 2,
      breite: Math.abs(p2.x - p1.x) + 2 * G,
      tiefe: Math.abs(p2.z - p1.z) + 2 * G
    };
  }

  function baueFigur(scene, u) {
    var T = root.THREE;
    var mat = new T.SpriteMaterial({ transparent: true });
    mat.map = textur(u, mat);
    var sprite = new T.Sprite(mat);
    sprite.scale.set(SPRITE_H * 0.5, SPRITE_H, 1);
    sprite.center.set(0.5, 0);                      // steht auf dem Feld, statt zu schweben

    var gruppe = new T.Group();
    gruppe.add(sprite);

    var hintergrund = balken(1, 0x14181f);
    var leben = balken(1, u.side === 'player' ? 0x4a9fef : 0xd05248);
    /* Der Kopf sitzt nicht am oberen Rand der Textur, sondern bei rund vier
       Fuenfteln — der Balken gehoert dorthin, sonst schwebt er losgeloest
       ueber der Figur. */
    hintergrund.position.y = SPRITE_H * 0.82;
    leben.position.y = SPRITE_H * 0.82;
    hintergrund.renderOrder = 1; leben.renderOrder = 2;
    gruppe.add(hintergrund); gruppe.add(leben);

    var p = weltpos(u.hex);
    gruppe.position.set(p.x, KACHEL_H / 2, p.z);
    scene.add(gruppe);
    /* `pos` ist der nachgezogene Standpunkt, `gruppe.position` derselbe Punkt
       PLUS Rueckstoss. Ohne die Trennung frisst die naechste Bewegung den Stoss
       auf, und der Treffer bleibt unsichtbar. */
    return { gruppe: gruppe, sprite: sprite, mat: mat, leben: leben,
             seite: u.side, ziel: { x: p.x, z: p.z }, pos: { x: p.x, z: p.z },
             stoss: null, blitz: 0, blitzFarbe: 0xffffff, tot: false, loesch: 0 };
  }

  function montiere(el, einheiten) {
    loese();
    if (!verfuegbar() || !einheiten.length) return false;
    var T = root.THREE;
    if (!blitzC) blitzC = new T.Color();

    /* ponytail: Breite wird nur beim Aufbau gelesen — wer das Fenster MITTEN im
       Kampf umzieht, sieht das Brett erst beim nächsten neu gefasst. Ein
       ResizeObserver, der Kamera und Leinwand nachzieht, wenn das je stört. */
    var breite = el.clientWidth || 640;
    var scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xbfd4ff, 0x201820, 1.1));
    var sonne = new T.DirectionalLight(0xffffff, 0.55);
    sonne.position.set(-3, 8, 4);
    scene.add(sonne);

    var mass = baueKacheln(scene, einheiten);

    /* Kamera fest, 46° gekippt, von der eigenen Seite her. Der Blick auf das
       Feld ist damit derselbe wie der auf die Aufstellungsliste: eigener Trupp
       vorn, Gegner hinten.

       Die HÖHE der Leinwand folgt dem Brett, statt vorgegeben zu werden — das
       ist der Punkt, an dem „mach das Feld größer" gemessen anders ausgeht als
       gedacht. Ein höherer Rahmen macht die Hexe NICHT größer: bei fester
       Breite fasst die Kamera die Breite, und alles darüber hinaus ist leerer
       Himmel. Bei 417 Pixeln Höhe waren gemessen 49 % gefüllt, 132 davon leer
       unten. Also umgekehrt gerechnet: erst der Abstand, der die Breite
       ausfüllt, dann genau die Höhe, die das Brett dabei braucht. Damit sind
       die Hexe so groß, wie die Breite es überhaupt erlaubt, und kein Pixel
       geht an Rand verloren. */
    var sicht = 38 * Math.PI / 180;                 // senkrechtes Sichtfeld
    var kippung = 46 * Math.PI / 180;
    /* Senkrecht zählt nicht nur das Brett: die Figuren stehen darauf und
       ragen darüber hinaus, und der Lebensbalken noch einmal darüber. */
    var senkrecht = mass.tiefe * Math.sin(kippung) + (SPRITE_H + 0.9) * Math.cos(kippung);
    /* Der obere Deckel begrenzt, wie viel Bildschirm das Brett dem Kampflog
       wegnimmt. Bei 560 kostete er auf einem Vollbild-Desktop (Leinwand 2093
       breit) Fuellung: gemessen 81 statt 96 % der Breite, weil die Kamera
       zurueckweichen muss, um in die gedeckelte Hoehe zu passen. 760 laesst das
       Brett auch dort noch vollstaendig aufgehen. */
    var hoehe = Math.round(Math.max(220, Math.min(760,
                  breite * senkrecht / mass.breite)));
    var seiten = breite / hoehe;
    var camera = new T.PerspectiveCamera(38, seiten, 0.1, 200);
    var nachHoehe = (senkrecht / 2) / Math.tan(sicht / 2);
    var nachBreite = (mass.breite / 2) / (Math.tan(sicht / 2) * seiten);
    var d = Math.max(nachHoehe, nachBreite) * 1.04;
    camera.position.set(mass.mitteX, d * Math.sin(kippung),
                        mass.mitteZ + d * Math.cos(kippung));
    /* Gezielt wird etwas ÜBER die Brettebene: die Figuren ragen nach oben, also
       sitzt der Inhalt sonst am oberen Rand und lässt unten Luft. Gemessen 0
       Pixel oben gegen 49 unten — das hebt der Versatz auf. */
    camera.lookAt(mass.mitteX, SPRITE_H * 0.2, mass.mitteZ);

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.setSize(breite, hoehe);
    renderer.domElement.className = 'brett3d';
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    /* Die Ebene fuer die Schadenszahlen liegt ueber der Leinwand, nicht darin. */
    var zahlen = root.document.createElement('div');
    zahlen.className = 'brett3d-zahlen';
    el.appendChild(zahlen);

    var figuren = {};
    einheiten.forEach(function (u) { figuren[u.key] = baueFigur(scene, u); });

    zustand = { renderer: renderer, scene: scene, camera: camera,
                figuren: figuren, el: el, raf: 0, effekte: [], zahlen: zahlen,
                kam: camera.position.clone(), ruettel: 0, zeit: 0, halt: 0 };
    aktualisiere(einheiten);
    schleife();
    return true;
  }

  var blitzC = null;                 // eine Farbe, wiederverwendet statt je Bild neu

  /* Bewegung wird weich nachgezogen statt gesetzt: das Log kennt nur „steht
     jetzt dort", und ein Sprung über zwei Felder liest sich wie ein Fehler. */
  function schleife(zeit) {
    if (!zustand) return;
    zeit = zeit || (root.performance ? root.performance.now() : Date.now());
    var dt = zustand.zeit ? Math.min(100, zeit - zustand.zeit) : 16;
    zustand.zeit = zeit;
    var f = zustand.figuren, weiter = false;
    /* Hitstop: das Bild steht, die Uhr der Wiedergabe laeuft weiter. Genau
       diese Sekundenbruchteile Stillstand machen aus einem Treffer einen
       Schlag — mehr als jeder Partikel. Nichts wird gerechnet, nur gezeigt. */
    if (zustand.halt > 0) {
      zustand.halt -= dt;
      zustand.renderer.render(zustand.scene, zustand.camera);
      zustand.raf = root.requestAnimationFrame(schleife);
      return;
    }
    Object.keys(f).forEach(function (k) {
      var d = f[k], g = d.gruppe, z = d.ziel;
      var dx = z.x - d.pos.x, dz = z.z - d.pos.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.005) {
        d.pos.x += dx * 0.18; d.pos.z += dz * 0.18;
        weiter = true;
      }
      /* Rueckstoss: hin und federnd zurueck, in einem Sinusbogen. */
      var vx = 0, vz = 0;
      if (d.stoss) {
        d.stoss.t -= dt / 260;
        if (d.stoss.t <= 0) { d.stoss = null; }
        else {
          var s = Math.sin(d.stoss.t * Math.PI);
          vx = d.stoss.x * s; vz = d.stoss.z * s;
          weiter = true;
        }
      }
      g.position.x = d.pos.x + vx;
      g.position.z = d.pos.z + vz;

      /* Aufblitzen und Zerfall schreiben das Material — deshalb tut es
         `aktualisiere()` nicht mehr, sonst ueberschriebe der naechste Logeintrag
         den Treffer, den man gerade sehen soll. */
      if (d.blitz > 0) { d.blitz = Math.max(0, d.blitz - dt / 110); weiter = true; }
      if (d.loesch > 0 && d.loesch < 1) { d.loesch = Math.min(1, d.loesch + dt / 520); weiter = true; }
      /* Gemessen: bei 0,55 schwebt der Rest sichtbar ueber der Kachel und sieht
         aus wie ein Fehler statt wie ein Gefallener. 0,3 liest sich als
         „gehoben und verloschen". */
      var hoch = d.loesch > 0 ? d.loesch * 0.3 : 0;
      d.gruppe.position.y = KACHEL_H / 2 + hoch;
      var deck = d.tot ? 0.22 + (1 - d.loesch) * 0.78 : 1;
      d.mat.opacity = Math.min(1, deck + d.blitz * 0.4);
      d.mat.color.setHex(d.tot ? 0x555555 : 0xffffff);
      if (d.blitz > 0) d.mat.color.lerp(blitzC.setHex(d.blitzFarbe), d.blitz);
    });

    /* Erschuetterung: die Kamera zittert, nicht das Brett. Ohne Abklingen
       waere es ein Wackeln, mit Abklingen ist es ein Schlag. */
    if (zustand.ruettel > 0) {
      var a = zustand.ruettel * zustand.ruettel * 0.4;
      zustand.camera.position.set(
        zustand.kam.x + (Math.random() - 0.5) * a,
        zustand.kam.y + (Math.random() - 0.5) * a,
        zustand.kam.z + (Math.random() - 0.5) * a * 0.5);
      zustand.ruettel = Math.max(0, zustand.ruettel - dt / 250);
      if (!zustand.ruettel) zustand.camera.position.copy(zustand.kam);
      weiter = true;
    }
    /* Rueckwaerts, weil abgelaufene Effekte hier herausfallen. */
    for (var i = zustand.effekte.length - 1; i >= 0; i--) {
      var e = zustand.effekte[i];
      if (!e.start) e.start = zeit;
      if (zeichneEffekt(e, (zeit - e.start) / e.dauer)) { weiter = true; continue; }
      raeumeEffekt(e);
      zustand.effekte.splice(i, 1);
      weiter = true;                                  // ein Bild noch, sonst bleibt der Rest stehen
    }
    zustand.renderer.render(zustand.scene, zustand.camera);
    /* Steht alles still, ruht auch die Schleife — eine Lagekarte muss nicht
       sechzig Mal je Sekunde dasselbe Bild zeichnen. */
    if (weiter) zustand.raf = root.requestAnimationFrame(schleife);
    else zustand.raf = 0;
  }

  function aktualisiere(einheiten) {
    if (!zustand) return;
    einheiten.forEach(function (u) {
      var f = zustand.figuren[u.key];
      if (!f) return;
      var p = weltpos(u.hex);
      f.ziel.x = p.x; f.ziel.z = p.z;
      var anteil = Math.max(0, Math.min(1, u.hp / u.maxHp));
      f.leben.scale.x = 0.95 * Math.max(0.02, anteil);
      /* Der Balken schrumpft nach rechts weg, nicht aus der Mitte heraus. */
      f.leben.position.x = -0.95 * (1 - Math.max(0.02, anteil)) / 2;
      f.leben.visible = !u.tot;
      /* Material und Hoehe schreibt nur noch `schleife()` — hier steht bloss,
         WAS gilt, nicht wie es gerade aussieht. */
      if (u.tot && !f.tot) zerfall(f, u.key, u.side);
      if (!u.tot && f.tot) f.loesch = 0;               // Wiederbelebung
      f.tot = !!u.tot;
    });
    if (!zustand.raf) zustand.raf = root.requestAnimationFrame(schleife);
  }

  function loese() {
    if (!zustand) return;
    if (zustand.raf) root.cancelAnimationFrame(zustand.raf);
    zustand.renderer.dispose();
    if (zustand.el) zustand.el.innerHTML = '';
    zustand = null;
  }

  function montiert(el) { return !!zustand && zustand.el === el; }

  root.Brett3D = { verfuegbar: verfuegbar, montiere: montiere, montiert: montiert,
                   aktualisiere: aktualisiere, effekt: effekt, treffer: treffer,
                   halt: halt, loese: loese };
})(globalThis);
