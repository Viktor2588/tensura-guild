/* js/fx.js — Nachbearbeitung: Bloom und Vignette.

   Warum von Hand und nicht `UnrealBloomPass`: three.js hat `examples/js` in
   r148 entfernt, alle Addons ab da sind ES-Module. Dieses Projekt sitzt auf
   r149 UMD, weil ASSETS.md das ausdruecklich so festgelegt hat — es hat
   keinen Bauschritt und soll keinen bekommen. Der Addon-Weg hiesse rund 900
   Zeilen Fremdcode von Hand nach klassischem Skript umschreiben, samt
   Herkunftsnachweis. Hier stehen 150 eigene.

   Was passiert: Szene in ein Rendertarget → Helligkeitsschwelle auf halbe
   Aufloesung → zwei getrennte Gauss-Durchgaenge (waagerecht, senkrecht) →
   additiv wieder ueber die Szene, mit Vignette im selben Durchgang.

   ponytail: einstufiges Bloom. Werden breite Lichter bandig, geht es auf eine
   dreistufige Pyramide — bei einem Brett mit einer Handvoll Funken ist das
   Geld nicht angelegt.

   ponytail: geblurrt wird in sRGB, nicht in Linear. Physikalisch falsch,
   optisch bei diesen Motiven nicht zu unterscheiden, und es spart einen
   Hin- und Rueckdurchgang. Wenn breite Farbverlaeufe je grau wirken: das ist
   der Grund.                                                                */
'use strict';
(function (root) {

  var VERT = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    /* Das Quad liegt schon in Bildkoordinaten — keine Matrix noetig. */
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  /* Helligkeitsschwelle mit weichem Knie: ein harter Schnitt laesst Kanten
     flackern, sobald ein Funke ueber die Schwelle wandert. */
  var HELL = [
    'uniform sampler2D tBild;',
    'uniform float schwelle;',
    'uniform float knie;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec4 c = texture2D(tBild, vUv);',
    '  float h = max(max(c.r, c.g), c.b);',
    '  float w = clamp((h - schwelle) / max(knie, 0.0001), 0.0, 1.0);',
    '  gl_FragColor = vec4(c.rgb * w * w * c.a, 1.0);',
    '}'
  ].join('\n');

  /* Fuenf Abgriffe mit linear gefilterten Zwischenpunkten — das entspricht
     neun echten und kostet die Haelfte. */
  var UNSCHARF = [
    'uniform sampler2D tBild;',
    'uniform vec2 richtung;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 s = texture2D(tBild, vUv).rgb * 0.227027;',
    '  s += (texture2D(tBild, vUv + richtung * 1.3846).rgb +',
    '        texture2D(tBild, vUv - richtung * 1.3846).rgb) * 0.316216;',
    '  s += (texture2D(tBild, vUv + richtung * 3.2308).rgb +',
    '        texture2D(tBild, vUv - richtung * 3.2308).rgb) * 0.070270;',
    '  gl_FragColor = vec4(s, 1.0);',
    '}'
  ].join('\n');

  /* Die Leinwand ist durchsichtig — der Verlauf dahinter kommt aus CSS. Also
     traegt der Alphakanal der Szene durch, und das Leuchten hebt ihn dort an,
     wo es ueber leeren Grund faellt. Sonst waere ein Funke am Bildrand
     unsichtbar, obwohl er strahlt. */
  var ZUSAMMEN = [
    'uniform sampler2D tSzene;',
    'uniform sampler2D tLicht;',
    'uniform float staerke;',
    'uniform float vignette;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec4 s = texture2D(tSzene, vUv);',
    '  vec3 b = texture2D(tLicht, vUv).rgb * staerke;',
    '  vec3 c = s.rgb + b;',
    '  float d = distance(vUv, vec2(0.5));',
    '  float v = mix(1.0, smoothstep(0.82, 0.30, d), vignette);',
    '  float a = clamp(s.a + max(max(b.r, b.g), b.b), 0.0, 1.0);',
    '  gl_FragColor = vec4(c * v, a);',
    '}'
  ].join('\n');

  function komposition(renderer, breite, hoehe, opt) {
    var T = root.THREE;
    opt = opt || {};
    var halb = 2;

    function ziel(b, h) {
      var rt = new T.WebGLRenderTarget(Math.max(1, Math.round(b)), Math.max(1, Math.round(h)), {
        minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat
      });
      rt.texture.generateMipmaps = false;
      return rt;
    }

    /* Die Szene wird MIT Tonemapping und sRGB in ihr Ziel gerendert: in r149
       richtet sich das nach der Kodierung der Zieltextur, nicht nach
       `renderer.outputEncoding`. Ohne diese Zeile bliebe das Bild linear und
       damit flau. */
    var rtSzene = ziel(breite, hoehe);
    rtSzene.texture.encoding = T.sRGBEncoding;
    var rtHell = ziel(breite / halb, hoehe / halb);
    var rtA = ziel(breite / halb, hoehe / halb);
    var rtB = ziel(breite / halb, hoehe / halb);

    var quad = new T.Mesh(new T.PlaneGeometry(2, 2), null);
    var szene = new T.Scene();
    szene.add(quad);
    var kamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    function material(fragment, uniforms) {
      return new T.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT,
                                    fragmentShader: fragment, depthTest: false,
                                    depthWrite: false, transparent: true });
    }

    var mHell = material(HELL, {
      tBild: { value: rtSzene.texture },
      schwelle: { value: opt.schwelle === undefined ? 0.85 : opt.schwelle },
      knie: { value: 0.28 }
    });
    var mUnscharf = material(UNSCHARF, {
      tBild: { value: null }, richtung: { value: new T.Vector2() }
    });
    var mZusammen = material(ZUSAMMEN, {
      tSzene: { value: rtSzene.texture }, tLicht: { value: rtB.texture },
      staerke: { value: opt.staerke === undefined ? 0.6 : opt.staerke },
      vignette: { value: opt.vignette === undefined ? 0.55 : opt.vignette }
    });

    function durchgang(mat, nach) {
      quad.material = mat;
      renderer.setRenderTarget(nach || null);
      renderer.clear();
      renderer.render(szene, kamera);
    }

    function render(scene, camera) {
      var alt = renderer.getRenderTarget();
      renderer.setRenderTarget(rtSzene);
      renderer.clear();
      renderer.render(scene, camera);

      durchgang(mHell, rtHell);

      mUnscharf.uniforms.tBild.value = rtHell.texture;
      mUnscharf.uniforms.richtung.value.set(1 / rtHell.width, 0);
      durchgang(mUnscharf, rtA);

      mUnscharf.uniforms.tBild.value = rtA.texture;
      mUnscharf.uniforms.richtung.value.set(0, 1 / rtHell.height);
      durchgang(mUnscharf, rtB);

      durchgang(mZusammen, null);
      renderer.setRenderTarget(alt);
    }

    function groesse(b, h) {
      rtSzene.setSize(Math.max(1, Math.round(b)), Math.max(1, Math.round(h)));
      [rtHell, rtA, rtB].forEach(function (rt) {
        rt.setSize(Math.max(1, Math.round(b / halb)), Math.max(1, Math.round(h / halb)));
      });
    }

    function loese() {
      [rtSzene, rtHell, rtA, rtB].forEach(function (rt) { rt.dispose(); });
      [mHell, mUnscharf, mZusammen].forEach(function (m) { m.dispose(); });
      quad.geometry.dispose();
    }

    return { render: render, groesse: groesse, loese: loese };
  }

  root.FX = { komposition: komposition };

})(globalThis);
