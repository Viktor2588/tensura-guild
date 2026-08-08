/* js/audio.js — Klangkulisse ohne eine einzige Audiodatei.

   Das Spiel war bis hierhin komplett stumm: kein <audio>-Tag, keine Datei
   unter assets/. Statt Sounddateien einzukaufen (Lizenzfragen, Bandbreite,
   ein Ordner voller Binaerdateien in einem Projekt, das bewusst ohne Assets
   auskam) synthetisiert dieses Modul jeden Ton zur Laufzeit ueber die
   Web-Audio-API: ein Oszillator plus eine Huellkurve sind ein Klick, zwei
   plus eine leichte Verzoegerung sind ein Sieges-Jingle. Keine neue
   Abhaengigkeit, keine Datei, keine Lizenzfrage.

   `bereit()` legt den AudioContext erst beim ersten Ton an — Browser lassen
   ihn ohne Nutzergeste ohnehin nur suspendiert starten, und ein Spiel, das
   ihn schon beim Laden oeffnet, handelt sich nur eine Konsolenwarnung ein.
   Fehlt die Web-Audio-API (z. B. jsdom in `dev/uitest.js`), bleiben alle
   Funktionen stille No-ops — dieselbe Rueckfallregel wie bei
   `Brett3D.verfuegbar()` fuer die 2.5D-Ansicht.                            */
'use strict';
(function (root) {

  var ctx = null;
  var master = null;
  var rauschPuffer = null;
  var stumm = false;
  try { stumm = localStorage.getItem('tensura-klang-stumm') === '1'; } catch (e) {}

  function bereit() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return true;
  }

  function wecke() {
    if (bereit() && ctx.state === 'suspended') ctx.resume();
  }

  function istStumm() { return stumm; }
  function stelleStumm(ja) {
    stumm = !!ja;
    try { localStorage.setItem('tensura-klang-stumm', stumm ? '1' : '0'); } catch (e) {}
    return stumm;
  }

  /* Ein einzelner Ton: Oszillator mit exponentieller Huellkurve, optional
     ein Gleiten der Frequenz (`bis`). `verz` schiebt den Einsatz auf der
     Audio-Uhr nach hinten — genauer als `setTimeout` und ohne zweite Uhr,
     wenn `folge()` mehrere Toene hintereinander braucht. */
  function ton(freq, dauer, opt) {
    if (stumm || !bereit()) return;
    wecke();
    opt = opt || {};
    var t = ctx.currentTime + (opt.verz || 0);
    var osc = ctx.createOscillator();
    osc.type = opt.form || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    if (opt.bis) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.bis), t + dauer);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opt.vol || 0.22, t + (opt.an || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dauer + 0.03);
  }

  function folge(schritte) { schritte.forEach(function (s) { ton(s[0], s[1], s[2]); }); }

  /* Gefiltertes Rauschen fuer alles, was knistert statt zu klingen (Brand,
     eine Donner-Entladung). Der Puffer ist eine Sekunde Zufallsrauschen,
     einmal erzeugt und fuer jeden Aufruf wiederverwendet. */
  function rauschen(dauer, opt) {
    if (stumm || !bereit()) return;
    wecke();
    opt = opt || {};
    if (!rauschPuffer) {
      rauschPuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = rauschPuffer.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = ctx.currentTime + (opt.verz || 0);
    var src = ctx.createBufferSource();
    src.buffer = rauschPuffer;
    src.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = opt.filterTyp || 'bandpass';
    filter.frequency.value = opt.freq || 1200;
    filter.Q.value = opt.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opt.vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dauer + 0.03);
  }

  /* Ein Klangbild je Schluesselwort — dieselbe Palette, mit der GAMEGUIDE.md
     die Farbe je Element festlegt: Brand knistert, Frost ist glaesern hoch,
     Donner ein kurzer Schnarrer, Licht ein weicher Dreiklang-Ton. */
  var STATUS_TON = {
    gift:        { freq: 260, bis: 190, form: 'sine', dauer: 0.09 },
    brand:       { rauschen: true, freq: 2400, q: 2.2, dauer: 0.11, vol: 0.16 },
    frost:       { freq: 1500, bis: 1900, form: 'triangle', dauer: 0.09, vol: 0.14 },
    verderbnis:  { freq: 140, bis: 95, form: 'sawtooth', dauer: 0.12, vol: 0.16 },
    schild:      { freq: 500, bis: 700, form: 'sine', dauer: 0.11, vol: 0.16 },
    heilung:     { freq: 700, bis: 1000, form: 'sine', dauer: 0.14, vol: 0.16 },
    konter:      { freq: 380, form: 'square', dauer: 0.06, vol: 0.14 },
    exekution:   { freq: 220, bis: 90, form: 'sawtooth', dauer: 0.14, vol: 0.18 },
    blutung:     { freq: 180, bis: 150, form: 'sine', dauer: 0.1, vol: 0.13 },
    schatten:    { freq: 900, bis: 300, form: 'sine', dauer: 0.1, vol: 0.13 },
    dunkelheit:  { freq: 130, form: 'sine', dauer: 0.16, vol: 0.16 },
    licht:       { freq: 1200, bis: 1600, form: 'triangle', dauer: 0.16, vol: 0.16 },
    donner:      { freq: 90, form: 'sawtooth', dauer: 0.07, vol: 0.16 },
    verwundbar:  { freq: 400, bis: 320, form: 'square', dauer: 0.06, vol: 0.13 },
    chaos:       { freq: 300, bis: 620, form: 'sawtooth', dauer: 0.09, vol: 0.13 },
    antichaos:   { freq: 620, bis: 900, form: 'sine', dauer: 0.09, vol: 0.13 },
    erstarrung:  { freq: 1800, form: 'sine', dauer: 0.18, vol: 0.15 },
    tempo:       { freq: 500, bis: 750, form: 'sine', dauer: 0.06, vol: 0.13 }
  };

  /* Dispatcht einen Kampflog-Eintrag auf einen Klang. Lebt hier statt in
     ui.js, aus demselben Grund wie `Brett3D.effekt`: die Anzeige (und jetzt
     die Klangkulisse) soll nur wissen MUSS, dass ein Ereignis geschah, nicht
     WIE es klingt. */
  function ereignis(l) {
    if (!l) return;
    switch (l.type) {
      case 'hit': {
        var anteil = Math.max(0, Math.min(1, l.dmg / (l.maxHp || l.dmg || 1)));
        ton(150 - anteil * 55, 0.08 + anteil * 0.05,
          { form: 'square', bis: 70, vol: Math.min(0.32, 0.12 + anteil * 0.35) });
        break;
      }
      case 'heal': ton(700, 0.15, { form: 'sine', bis: 950, vol: 0.16 }); break;
      case 'status': {
        var s = STATUS_TON[l.status];
        if (!s) break;
        if (s.rauschen) rauschen(s.dauer, s); else ton(s.freq, s.dauer, s);
        break;
      }
      case 'schild': ton(500, 0.1, { form: 'sine', bis: 650, vol: 0.14 }); break;
      case 'death': ton(220, 0.32, { form: 'sine', bis: 55, vol: 0.26 }); break;
      case 'revive': folge([[520, 0.09, { bis: 700, vol: 0.16 }], [780, 0.13, { bis: 1000, vol: 0.16, verz: 0.09 }]]); break;
      case 'entladung': rauschen(0.22, { freq: 500, q: 4, vol: 0.26 }); ton(90, 0.22, { form: 'sawtooth', vol: 0.2 }); break;
      case 'verwandlung':
        folge([[300, 0.18, { bis: 200, vol: 0.18 }], [520, 0.22, { bis: 900, vol: 0.2, verz: 0.16 }],
               [820, 0.32, { bis: 1300, vol: 0.22, verz: 0.36 }]]);
        break;
      case 'resonanz': folge([[600, 0.1, { bis: 800, vol: 0.16 }], [900, 0.14, { bis: 1200, vol: 0.16, verz: 0.09 }]]); break;
      case 'fehlschlag': ton(200, 0.07, { form: 'square', bis: 120, vol: 0.13 }); break;
      case 'ausweichen': ton(1000, 0.06, { form: 'sine', bis: 1400, vol: 0.1 }); break;
      case 'widersteht': ton(1500, 0.08, { form: 'triangle', bis: 1200, vol: 0.13 }); break;
      case 'wut': ton(150, 0.16, { form: 'sawtooth', bis: 250, vol: 0.18 }); break;
      case 'kombi': ton(400, 0.14, { form: 'square', bis: 700, vol: 0.18 }); break;
      case 'aktiv': ton(500, 0.05, { form: 'triangle', bis: 650, vol: 0.09 }); break;
    }
  }

  function klick() { ton(700, 0.035, { form: 'square', bis: 500, vol: 0.07 }); }
  function kauf() { folge([[500, 0.06, { bis: 750, vol: 0.12 }], [750, 0.09, { bis: 1000, vol: 0.12, verz: 0.05 }]]); }
  function entwicklung() {
    folge([[400, 0.09, { bis: 500, vol: 0.16 }], [600, 0.09, { bis: 750, vol: 0.16, verz: 0.08 }],
           [900, 0.16, { bis: 1200, vol: 0.18, verz: 0.16 }]]);
  }
  function sieg() {
    folge([[500, 0.12, { bis: 650, vol: 0.2 }], [650, 0.12, { bis: 800, vol: 0.2, verz: 0.1 }],
           [800, 0.12, { bis: 1000, vol: 0.2, verz: 0.2 }], [1000, 0.3, { bis: 1300, vol: 0.22, verz: 0.3 }]]);
  }
  function niederlage() {
    folge([[300, 0.22, { bis: 180, form: 'sawtooth', vol: 0.18 }],
           [220, 0.38, { bis: 90, form: 'sawtooth', vol: 0.18, verz: 0.18 }]]);
  }

  root.Klang = {
    wecke: wecke, istStumm: istStumm, stelleStumm: stelleStumm,
    ereignis: ereignis, klick: klick, kauf: kauf, entwicklung: entwicklung,
    sieg: sieg, niederlage: niederlage
  };

})(globalThis);
