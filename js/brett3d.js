/* js/brett3d.js — die 2.5D-Ansicht des Schlachtfelds.

   Das Brett ist echt dreidimensional (sechseckige Kacheln, gekippte Kamera,
   Licht), die Figuren sind flache Bilder, die immer zur Kamera schauen. Genau
   diese Mischung meint „2.5D": sie ist der Weg von Final Fantasy Tactics und
   Disgaea, und sie ist hier auch der einzige gangbare — für gerigte 3D-Modelle
   von vierzig Charakteren gibt es keine Quelle, für Bilder schon.

   Die Ansicht ist eine LAGEKARTE, kein Spielbrett: keine Steuerung, keine
   Auswahl, keine Kamerabewegung. Eingreifen kann man im Kampf ohnehin nicht,
   und was man nicht bedienen kann, soll auch nicht so aussehen.

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

  function verfuegbar() {
    if (!root.THREE || !root.document) return false;
    try {
      var c = root.document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
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
    return { gruppe: gruppe, sprite: sprite, mat: mat, leben: leben,
             ziel: { x: p.x, z: p.z } };
  }

  function montiere(el, einheiten) {
    loese();
    if (!verfuegbar() || !einheiten.length) return false;
    var T = root.THREE;

    var breite = el.clientWidth || 640, hoehe = 260;
    var scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xbfd4ff, 0x201820, 1.1));
    var sonne = new T.DirectionalLight(0xffffff, 0.55);
    sonne.position.set(-3, 8, 4);
    scene.add(sonne);

    var mass = baueKacheln(scene, einheiten);

    /* Kamera fest, rund 50° gekippt, von der eigenen Seite her. Der Blick auf
       das Feld ist damit derselbe wie der auf die Aufstellungsliste: eigener
       Trupp vorn, Gegner hinten.

       Der Abstand wird AUSGERECHNET, nicht geschätzt: aus dem Sichtfeld und
       dem, was das Brett belegt. Geschätzt stand das Feld als Briefmarke in
       einem leeren Rahmen — und ein Streifen von 834 x 260 Pixeln verzeiht
       das nicht, weil senkrecht und waagerecht ganz verschieden viel Platz
       ist. Maßgeblich ist, was zuerst anstößt. */
    var sicht = 38 * Math.PI / 180;                 // senkrechtes Sichtfeld
    var seiten = breite / hoehe;
    var kippung = 46 * Math.PI / 180;
    var camera = new T.PerspectiveCamera(38, seiten, 0.1, 200);
    /* Senkrecht zählt nicht nur das Brett: die Figuren stehen darauf und
       ragen darüber hinaus, und der Lebensbalken noch einmal darüber. */
    var senkrecht = mass.tiefe * Math.sin(kippung) + (SPRITE_H + 0.5) * Math.cos(kippung);
    var nachHoehe = (senkrecht / 2) / Math.tan(sicht / 2);
    var nachBreite = (mass.breite / 2) / (Math.tan(sicht / 2) * seiten);
    var d = Math.max(nachHoehe, nachBreite) * 1.14;
    camera.position.set(mass.mitteX, d * Math.sin(kippung),
                        mass.mitteZ + d * Math.cos(kippung));
    camera.lookAt(mass.mitteX, 0, mass.mitteZ);

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.setSize(breite, hoehe);
    renderer.domElement.className = 'brett3d';
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    var figuren = {};
    einheiten.forEach(function (u) { figuren[u.key] = baueFigur(scene, u); });

    zustand = { renderer: renderer, scene: scene, camera: camera,
                figuren: figuren, el: el, raf: 0 };
    aktualisiere(einheiten);
    schleife();
    return true;
  }

  /* Bewegung wird weich nachgezogen statt gesetzt: das Log kennt nur „steht
     jetzt dort", und ein Sprung über zwei Felder liest sich wie ein Fehler. */
  function schleife() {
    if (!zustand) return;
    var f = zustand.figuren, weiter = false;
    Object.keys(f).forEach(function (k) {
      var g = f[k].gruppe, z = f[k].ziel;
      var dx = z.x - g.position.x, dz = z.z - g.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.005) {
        g.position.x += dx * 0.18; g.position.z += dz * 0.18;
        weiter = true;
      }
    });
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
      f.mat.opacity = u.tot ? 0.22 : 1;
      f.mat.color.setHex(u.tot ? 0x555555 : 0xffffff);
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
                   aktualisiere: aktualisiere, loese: loese };
})(globalThis);
