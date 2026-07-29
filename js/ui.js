/* js/ui.js — Darstellung und Eingaben. Enthält keine Spielregeln:
   alles, was den Zustand ändert, geht durch Run.*                            */
'use strict';
(function (root) {
  var R = root.Run, GD = root.GameData, EN = root.Enemies, C = root.Combat, AB = root.Abilities;

  var run = null;
  var replay = null;             // { res, i, u:{key->Anzeige}, zeilen, timer, fertig }
  var STATUS_NAMEN = { gift: 'Gift', brand: 'Brand', erstarrung: 'Erstarrt', verderbnis: 'Verderbnis',
                       schild: 'Schild', chaos: 'Chaos', antichaos: 'Antichaos',
                       verwundbar: 'Verwundbar', blutung: 'Blutung',
                       schatten: 'Schatten', dunkelheit: 'Dunkelheit', licht: 'Licht',
                       donner: 'Donner' };
  var KEYWORD_NAMEN = {
    gift: 'Gift', brand: 'Brand', frost: 'Frost', verderbnis: 'Verderbnis',
    schild: 'Schild', heilung: 'Heilung', konter: 'Konter', tempo: 'Tempo',
    exekution: 'Exekution', flaeche: 'Fläche', chaos: 'Chaos',
    verwundbar: 'Verwundbar', blutung: 'Blutung',
    schatten: 'Schatten', dunkelheit: 'Dunkelheit', licht: 'Licht', donner: 'Donner'
  };
  var TYP_TEXT = {
    kampf: 'Kampf', elite: 'Elite-Kampf', pruefung: 'Kampfherausforderung',
    boss: 'Boss', shop: 'Händler', event: 'Ereignis', lager: 'Lager'
  };
  var ART_TEXT = {
    unit: 'Gefolge', relic: 'Relikt', item: 'Ausrüstung', gold: 'Vorräte',
    skill: 'Fähigkeit', rang: 'Rang'
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function artHtml(kind) { return '<span class="art art-' + kind + '">' + ART_TEXT[kind] + '</span>'; }
  /* Rarität: 1 üblich … 5 legendär. Farbe und Wort, überall dasselbe. */
  function rarHtml(r) {
    if (!r) return '';
    return '<span class="rar rar-' + r + '">' + AB.rarName(r) + '</span>';
  }
  function rarZeile(r, was) {
    if (!r) return '';
    return AB.rarName(r).charAt(0).toUpperCase() + AB.rarName(r).slice(1) +
      (was ? ' · ' + was : '') + '\n\n';
  }
  function kwName(k) { return KEYWORD_NAMEN[k] || k; }
  var G = GD.GLOSSAR;

  /* ---- Tooltips ----------------------------------------------------------
     Ein Motor für alles: data-tip (Titel) + data-tip-text (Beschreibung).
     Kein title-Attribut — das kennt weder Zeilenumbruch noch Touch.          */

  function tip(titel, text) {
    if (!text) return '';
    return ' data-tip="' + esc(titel) + '" data-tip-text="' + esc(text) + '"';
  }

  /* Farbe im Tooltip: Wortstamm -> Klasse. Eine Tabelle statt Markup an rund
     vierzig tip()-Aufrufen — die Texte bleiben roher Text, gefärbt wird erst
     beim Anzeigen. Der Stamm fängt die Beugung mit ab ("Gift" -> "Giftnebel",
     "erstarr" -> "erstarrte"). */
  var TIP_STAMM = {
    vergift: 'kw-gift', gift: 'kw-gift',
    verbrenn: 'kw-brand', brenn: 'kw-brand', brand: 'kw-brand',
    frost: 'kw-frost', erstarr: 'kw-frost',
    verderb: 'kw-verderbnis', fluch: 'kw-verderbnis',
    schild: 'kw-schild', heilung: 'kw-heilung', heilt: 'kw-heilung',
    konter: 'kw-konter', tempo: 'kw-tempo', flächen: 'kw-flaeche', fläche: 'kw-flaeche',
    exekution: 'kw-exekution',
    signatur: 'typ-signatur', aktive: 'typ-aktiv', aktiv: 'typ-aktiv',
    passive: 'typ-passiv', passiv: 'typ-passiv',
    chaos: 'kw-chaos', antichaos: 'kw-chaos', verwundbar: 'kw-verwundbar', blutung: 'kw-blutung',
    schatten: 'kw-schatten', dunkel: 'kw-dunkelheit', licht: 'kw-licht', donner: 'kw-donner',
    relikt: 'typ-relikt', ausrüstung: 'typ-item',
    üblich: 'rar-text-1', ungewöhnlich: 'rar-text-2', selten: 'rar-text-3',
    episch: 'rar-text-4', legendär: 'rar-text-5'
  };
  var TIP_RE = new RegExp('(' + Object.keys(TIP_STAMM).join('|') + ')[a-zäöüß]*', 'gi');
  function markiere(t) {
    return esc(t).replace(TIP_RE, function (treffer, stamm) {
      return '<em class="' + TIP_STAMM[stamm.toLowerCase()] + '">' + treffer + '</em>';
    });
  }
  var tipEl = null;
  function tipBox() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'tooltip';
      tipEl.appendChild(document.createElement('b'));
      tipEl.appendChild(document.createElement('span'));
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function zeigeTip(el) {
    var box = tipBox();
    box.firstChild.innerHTML = markiere(el.dataset.tip || '');
    box.lastChild.innerHTML = markiere(el.dataset.tipText || '');
    box.style.display = 'block';
    box.style.left = '0px';
    box.style.top = '0px';
    var r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    var links = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - b.width - 8));
    var oben = r.bottom + 8;
    if (oben + b.height > window.innerHeight - 8) oben = Math.max(8, r.top - b.height - 8);
    box.style.left = (links + window.scrollX) + 'px';
    box.style.top = (oben + window.scrollY) + 'px';
  }
  function versteckeTip() { if (tipEl) tipEl.style.display = 'none'; }

  /* ---------------------------------------------------------------- Kopf */

  function hudTips() {
    var paare = [['hud-mag', 'Magicule', G.begriffe.magicule],
                 ['hud-leben', 'Verbleibende Niederlagen', G.begriffe.leben]];
    paare.push(['hud-stufe', 'Bedrohungsstufe', G.begriffe.bedrohungsstufe +
      '\n\nSie steigt, sobald du einen Run auf der aktuellen Stufe GEWINNST — ' +
      'ein verlorener Run ändert nichts. Umstellen kannst du sie im Menü unter ' +
      '„Fortschritt"; das setzt den laufenden Run neu auf.']);
    paare.forEach(function (p) {
      var el = $(p[0]).parentNode;
      el.dataset.tip = p[1];
      el.dataset.tipText = p[2];
      el.removeAttribute('title');
    });
  }

  function zeichneHud() {
    $('hud-ort').textContent = (run.over ? 'Run beendet'
      : 'Akt ' + run.act + ' · Knoten ' + (run.step + 1) + '/' + R.STEPS.length) +
      (run.threat ? ' · Stufe ' + run.threat : '');
    var st = R.bedrohung(run.threat || 0);
    var offen = run.meta.threat || 0;
    $('hud-stufe').innerHTML = st.stufe +
      (offen > (run.threat || 0) ? '<i class="hoeher">+' + (offen - run.threat) + '</i>' : '');
    $('hud-mag').textContent = run.magicules;
    $('hud-leben').textContent = run.lives;
    zeichnePfad();
  }

  /* Der Weg durch den Akt: was an jedem Knoten zur Wahl steht, wo du gerade
     stehst und wann der Boss kommt. Ohne das plant niemand voraus — die
     Reihenfolge der Knotenarten steht ja fest (Run.STEPS). */
  var TYP_ICON = { kampf: '⚔', elite: '☠', pruefung: '⚑', boss: '👑', shop: '⚖',
                   event: '❓', lager: '🏕' };
  function zeichnePfad() {
    var el = $('pfad');
    if (!el) return;
    if (run.over) { el.innerHTML = ''; return; }
    var boss = R.boss(run);
    var html = '<span class="pfad-akt"' + tip('Akt ' + run.act + ' von ' + R.AKTE,
      'Jeder Akt hat ' + R.STEPS.length + ' Knoten und endet mit seinem Boss.') +
      '>Akt ' + run.act + '/' + R.AKTE + '</span>';
    R.STEPS.forEach(function (typen, i) {
      var klasse = i < run.step ? 'vorbei' : i === run.step ? 'jetzt' : '';
      var istBoss = typen.length === 1 && typen[0] === 'boss';
      if (istBoss) klasse += ' boss';
      var zeichen = typen.map(function (t) { return TYP_ICON[t] || '?'; }).join('');
      html += '<span class="pfad-knoten ' + klasse + '"' +
        tip('Knoten ' + (i + 1) + (istBoss ? ' · Boss' : ''),
          istBoss ? (boss ? boss.name + ' — kein Weg daran vorbei.' : 'Der Boss des Akts.')
                  : 'Zur Wahl: ' + typen.map(function (t) { return TYP_TEXT[t] || t; }).join(' · ')) +
        '>' + zeichen + '</span>';
    });
    if (boss) html += '<span class="pfad-boss"' + tip('BOSS: ' + boss.name, gegnerDetails(boss)) +
      '>' + esc(boss.name) + '</span>';
    el.innerHTML = html;
  }

  /* -------------------------------------------------------------- Karte */

  function gegnerDetails(enc) {
    var defs = EN.build(enc), gesehen = {}, zeilen = [];
    defs.forEach(function (d) {
      if (gesehen[d.id]) return;
      gesehen[d.id] = 1;
      var anzahl = enc.units.filter(function (x) { return x === d.id; }).length;
      var kopf = (anzahl > 1 ? anzahl + '× ' : '') + d.name +
        ' (' + d.hp + '❤ ' + d.atk + '⚔ ' + d.def + '🛡 ' + d.spd + '⚡, ' +
        GD.rolleName(C.roleOf(d)) + ')';
      var koennen = (d.actives || []).map(function (a) { return '⚡ ' + a.name + ': ' + a.text; })
        .concat((d.effects || []).map(function (e) { return '◈ ' + e.name + (e.text ? ': ' + e.text : ''); }));
      zeilen.push(kopf + (koennen.length ? '\n   ' + koennen.join('\n   ') : ''));
    });
    return zeilen.join('\n');
  }

  /* Kein Gegnername, keine Truppenschau: die Wahl ist die ART des Knotens.
     Vorher stand dort die volle Begegnung — und während des Einstiegs traten
     dann ein bis zwei Gegner an statt der versprochenen vier. */
  var KNOTEN_TEXT = {
    kampf: 'Eine gewöhnliche Begegnung. Wer sie gewinnt, wählt eine Belohnung.',
    elite: 'Härter besetzt, würfelt die Belohnung aber eine Stufe besser.',
    pruefung: 'Ein Kampf mit einer Auflage. Hältst du sie ein, gibt es die doppelte ' +
      'Beute und ein zweites Belohnungsangebot — sonst die gewöhnliche.',
    boss: 'Abschluss des Akts. Tritt allein an, wird mit jedem Zug stärker und ' +
      'widersteht Erstarrung zu 60 %.',
    shop: 'Kaufen mit Magicule: Einheiten, Ausrüstung, meist ein Relikt.',
    lager: 'Eines zur Wahl: Magicule, ein Ausrüstungsstück oder dauerhafte Werte ' +
      'für eine zufällige Einheit.',
    event: 'Ein Ereignis mit zwei bis drei Optionen. Was dabei herauskommt, steht an der Option.'
  };

  function zeichneKarte() {
    var html = regelListe(false) + bossVorschau(run.act) + '<h2>Wohin?</h2><div class="karten">';
    run.options.forEach(function (o, i) {
      var klasse = 'karte' + (o.type === 'boss' ? ' boss' : o.type === 'elite' ? ' elite' : '') +
        (o.type === 'pruefung' ? ' pruefung' : '');
      var p = o.pruefung ? R.pruefung(o.pruefung) : null;
      var text = KNOTEN_TEXT[o.type] || '';
      if (p) text += '\n\nAuflage — ' + p.name + ': ' + p.text;
      if (o.belagert) text += '\n\nBelagerung: hier steht eine Elite, die Beute bleibt gewöhnlich.';
      if (o.encounter) text += '\n\nVerlierst du, kostet das ein Leben und der Knoten wird neu ausgewürfelt.';
      html += '<button class="' + klasse + '" data-a="knoten" data-i="' + i + '"' +
        tip(o.name, text) + '>' +
        '<span class="art art-' + o.type + '">' + (TYP_ICON[o.type] || '') + '</span>' +
        '<span class="titel">' + esc(o.name) + '</span>' +
        '<span class="unter">' + esc(p ? p.name : (TYP_TEXT[o.type] || o.type)) + '</span></button>';
    });
    html += '</div>';
    $('view').innerHTML = html;
  }

  /* -------------------------------------------------------- Startdraft */

  /* Wer den Boss des Akts kennt, kann darauf hinbauen — deshalb steht er von
     Anfang an da, samt Fähigkeiten. */
  function bossVorschau(akt) {
    var b = R.boss(run, akt);
    if (!b) return '';
    return '<p class="hinweis">Am Ende von Akt ' + akt + ' wartet <b' +
      tip('BOSS: ' + b.name, gegnerDetails(b)) + '>' + esc(b.name) + '</b>.</p>';
  }

  function stufenHtml() {
    var meta = run.meta;
    if (!meta.threat) return '';
    var html = '<h3' + tip('Bedrohungsstufe',
      'Nach jedem Sieg geht die nächste Stufe auf. Jede verschärft eine andere Schraube, ' +
      'nicht nur die Gegnerwerte.') + '>Bedrohungsstufe</h3><div class="reihe">';
    R.BEDROHUNG.forEach(function (b) {
      if (b.stufe > meta.threat) return;
      html += '<button class="' + (b.stufe === run.threat ? 'haupt' : '') + '" data-a="stufe" data-i="' +
        b.stufe + '"' + tip(b.stufe + ' · ' + b.name, b.text) + '>' + b.stufe + '</button>';
    });
    return html + '</div>' + regelListe(true);
  }

  /* Welche Regeln gelten gerade? Ohne diese Liste ist die Stufe eine Zahl im
     Kopf der Seite und der Spieler merkt erst im Kampf, was anders ist. */
  function regelListe(lang) {
    if (!run.threat) return '';
    var aktiv = R.BEDROHUNG.filter(function (b) { return b.regel && b.stufe <= run.threat; });
    if (!aktiv.length) return '';
    return '<div class="regeln">' + aktiv.map(function (b) {
      return '<span class="regel"' + tip(b.stufe + ' · ' + b.name, b.text) + '>' +
        esc(b.name) + '</span>';
    }).join('') + '</div>' +
      (lang ? '<p class="hinweis">' + esc(R.bedrohung(run.threat).text) + '</p>' : '');
  }

  function zeichneStart() {
    var w = run.startwahl;
    var html = stufenHtml() + bossVorschau(1) + '<h2>Womit fängst du an?</h2>' +
      '<p class="hinweis">Eine Einheit und ein Relikt — mehr hast du nicht. ' +
      'Der Rest wird erkämpft.</p><div class="karten">';
    /* Zwei getrennte Blöcke statt einer gemischten Liste: sonst steht die
       Wirkung der Signatur direkt neben der des Relikts und niemand sieht,
       welcher Effekt woher kommt. Die Herkunft steht als Überschrift dabei. */
    w.offers.forEach(function (o, i) {
      var u = GD.unit(o.unit), sig = AB.get(u.signature);
      var rel = o.relic ? GD.relic(o.relic) : null;
      html += '<button class="karte paar" data-a="start" data-i="' + i + '">' +
        '<div class="paar-teil teil-einheit">' +
          '<span class="herkunft"' + tip('Einheit',
            'Die Einheit selbst: ihre Werte, ihre Rolle in der Aufstellung und ihre ' +
            'Signatur. Sie kämpft, steigt im Rang auf und lernt Passive dazu.') +
            '>Einheit</span>' +
          '<span class="titel">' + esc(u.name) + '</span>' +
          '<div class="kw-leiste">' + belohnungTags({ kind: 'unit', id: o.unit }) + '</div>' +
          '<span class="unter"><b>' + esc(sig.name) + ':</b> ' + esc(sig.text) + '</span>' +
        '</div>';
      if (rel) {
        html += '<div class="paar-teil teil-relikt">' +
          '<span class="herkunft"' + tip('Relikt',
            'Wirkt auf den GANZEN Trupp und den ganzen Run — auch auf Einheiten, die ' +
            'erst später dazustoßen. Es kämpft nicht selbst und steigt nicht auf.') +
            '>Relikt</span>' +
          '<span class="titel">' + esc(rel.name) + '</span>' +
          '<div class="kw-leiste">' + belohnungTags({ kind: 'relic', id: o.relic }) + '</div>' +
          '<span class="unter">' + esc(rel.text) + '</span>' +
        '</div>';
      }
      html += '</button>';
    });
    return $('view').innerHTML = html + '</div>';
  }

  /* -------------------------------------------------------------- Kampf */

  function starteReplay(res) {
    replay = { res: res, i: 0, u: {}, zeilen: [], fertig: false, timer: null };
    res.roster.forEach(function (r) {
      replay.u[r.key] = { name: r.name, side: r.side, hp: r.maxHp, maxHp: r.maxHp,
                          atk: r.atk, def: r.def, spd: r.spd, role: r.role,
                          aktive: (r.actives || [])[0] || null, status: {}, tot: false };
    });
    zeichneKampf();
    replay.timer = setInterval(schritt, 70);
  }

  function schritt() {
    var log = replay.res.log;
    var l = null;
    while (replay.i < log.length) {
      l = log[replay.i++];
      if (l.type !== 'setup') break;
      l = null;
    }
    if (!l) { endeReplay(); return; }
    anwenden(l);
    aktualisiereFeld();
    if (replay.i >= log.length) endeReplay();
  }

  function anwenden(l) {
    var u = l.key && replay.u[l.key];
    if (l.type === 'hit' && u) { u.hp = l.hp; }
    if (l.type === 'heal' && u) { u.hp = l.hp; }
    if (l.type === 'death' && u) { u.tot = true; u.hp = 0; }
    if (l.type === 'revive' && u) { u.tot = false; u.hp = l.hp; }
    if (l.type === 'status' && u) { u.status[l.status] = l.stacks; }
    /* Der Würfelwurf der Runde gehört an die Einheit, nicht nur ins Log —
       sonst schwanken die Zahlen und niemand sieht, woher. */
    if (l.type === 'chaos' && u) { u.wurf = l; }
    if (l.type === 'schild' && u) { u.status.schild = Math.max(0, (u.status.schild || 0) - l.amount); }

    var text = null, klasse = l.side === 'player' ? 'feind' : 'spieler';
    if (l.type === 'hit') text = esc(l.source) + ' → ' + esc(l.target) + ': ' + l.dmg;
    else if (l.type === 'heal') text = esc(l.source) + ' heilt ' + esc(l.target) + ' um ' + l.amount;
    else if (l.type === 'status') text = esc(l.target) + ': ' + (STATUS_NAMEN[l.status] || l.status) + ' ' + l.stacks;
    else if (l.type === 'schild') text = esc(l.target) + ': Schild fängt ' + l.amount;
    else if (l.type === 'skip') text = esc(l.unit) + ' kann sich nicht rühren';
    else if (l.type === 'widersteht') text = esc(l.target) + ' schüttelt die Erstarrung ab';
    else if (l.type === 'revive') text = esc(l.unit) + ' steht wieder auf';
    else if (l.type === 'chaos') text = '🎲 ' + esc(l.unit) + ': Angriff ' + l.atk + ' %, Rüstung ' +
      l.def + ' %, Tempo ' + l.spd + ' %';
    else if (l.type === 'fehlschlag') text = '✗ ' + esc(l.unit) + ': ' + esc(l.name) + ' verpufft im Chaos';
    else if (l.type === 'ausweichen') text = '↯ ' + esc(l.target) + ' weicht im Schatten aus';
    else if (l.type === 'entladung') text = '⚡ Entladung an ' + esc(l.unit) + ': ' + l.stapel + ' Stapel schlagen in die ganze Reihe';
    /* Eine Verwandlung ist der seltenste Moment im Kampf — sie darf nicht
       stumm im Log fehlen, sonst merkt niemand, dass die Schwelle fiel. */
    /* Der Bonus ist nicht mehr fest, sondern hängt an den Stapeln — dann muss
       er auch im Log stehen, sonst sieht niemand, was das Stapeln gebracht hat. */
    else if (l.type === 'verwandlung') text = '✦ ' + esc(l.unit) + ' wird zum ' + esc(l.form) +
      (l.bonus ? ' (' + l.stapel + ' Stapel → +' + l.bonus + ' %)' : '');
    else if (l.type === 'wut') text = '🔥 ' + esc(l.unit) + ' gerät in Rage: Angriff ' + l.atk;
    else if (l.type === 'aktiv') { text = '⚡ ' + esc(l.unit) + ' setzt ' + esc(l.name) + ' ein';
                                   klasse = (l.side === 'player' ? 'spieler' : 'feind') + ' aktiv'; }
    else if (l.type === 'death') { text = esc(l.unit) + ' fällt'; klasse = 'tod'; }
    if (text) replay.zeilen.push('<div class="' + klasse + '">' + text + '</div>');
    if (replay.zeilen.length > 140) replay.zeilen.shift();
  }

  function kaempferHtml(u) {
    var marken = Object.keys(u.status).filter(function (k) { return u.status[k] > 0; })
      .map(function (k) {
        var zusatz = '';
        if ((k === 'chaos' || k === 'antichaos') && u.wurf) {
          zusatz = '\n\nWurf dieser Runde: Angriff ' + u.wurf.atk + ' %, Rüstung ' +
            u.wurf.def + ' %, Tempo ' + u.wurf.spd + ' % des Grundwerts.';
        }
        return '<span class="marke ' + k + '"' + tip(STATUS_NAMEN[k] || k, G.zustaende[k] + zusatz) + '>' +
          (STATUS_NAMEN[k] || k) + ' ' + Math.round(u.status[k]) + '</span>';
      }).join('');
    var pct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
    return '<div class="kaempfer' + (u.tot ? ' tot' : '') + (u.side === 'enemy' ? ' feind' : '') + '"' +
      tip(u.name, GD.rolleName(u.role) + '\n' + (G.rollen[u.role] || '') +
        (u.aktive ? '\n\nSignatur: ' + u.aktive : '')) + '>' +
      '<div class="zeile"><span>' + esc(u.name) + '</span><span>' + Math.max(0, u.hp) + '/' + u.maxHp + '</span></div>' +
      '<div class="balken"><i style="width:' + pct + '%"></i></div>' +
      '<div class="kwerte">' + u.atk + '⚔ ' + u.def + '🛡 ' + u.spd + '⚡</div>' +
      (marken ? '<div class="marken">' + marken + '</div>' : '') + '</div>';
  }

  function seiteHtml(side, titel) {
    var html = '<div class="seite"><h3>' + titel + '</h3>';
    Object.keys(replay.u).filter(function (k) { return replay.u[k].side === side; })
      .forEach(function (k) { html += kaempferHtml(replay.u[k]); });
    return html + '</div>';
  }

  function aktualisiereFeld() {
    if (!replay) return;
    var feld = $('kampffeld');
    if (feld) feld.innerHTML = seiteHtml('player', 'Dein Trupp') + seiteHtml('enemy', 'Gegner');
    var log = $('kampflog');
    if (log) { log.innerHTML = replay.zeilen.join(''); log.scrollTop = log.scrollHeight; }
  }

  function zeichneKampf() {
    var p = run.pending;
    var html = '<h2>' + esc(p.node.name) + '</h2>';
    if (replay) html += '<div class="feld" id="kampffeld"></div><div id="kampflog"></div>';
    if (replay && !replay.fertig) {
      html += '<div class="reihe"><button type="button" data-a="ueberspringen">Überspringen</button></div>';
    } else {
      html += ergebnisHtml(p);
    }
    $('view').innerHTML = html;
    aktualisiereFeld();
  }

  /* Volle Beschreibung eines Angebots — bei Einheiten die Signatur und die
     drei Passiven, die mit den Rängen aufgehen. */
  /* Ein Relikt, dessen Bedingung gerade nicht zutrifft, sieht sonst aus wie jedes
     andere — und ist doch nichts wert. */
  function bedingungHtml(r) {
    if (r.kind !== 'relic') return '';
    var rel = GD.relic(r.id);
    if (!rel || !rel.bedingung) return '';
    return rel.bedingung(run)
      ? '<span class="bed an">Bedingung erfüllt</span>'
      : '<span class="bed aus">derzeit wirkungslos</span>';
  }

  /* Ein Tag mit eigenem Tooltip. Statt einer Textwand am Kartenrand bekommt
     jede Information ihr eigenes Häppchen: wer wissen will, was „Untot" heißt,
     tippt den Untot-Tag an. */
  function tag(klasse, text, titel, hilfe) {
    return '<span class="kw-tag ' + klasse + '"' + tip(titel, hilfe) + '>' + esc(text) + '</span>';
  }

  function belohnungTags(r) {
    var tags = [];
    if (r.kind === 'unit') {
      var u = GD.unit(r.id), sig = AB.get(u.signature);
      tags.push(tag('tag-art', GD.artName(u.art), 'Art: ' + GD.artName(u.art),
        G.arten[u.art] + '\n\n' + G.begriffe.art));
      tags.push(tag('tag-rolle', GD.rolleName(u.tags[1]), 'Rolle: ' + GD.rolleName(u.tags[1]),
        G.rollen[u.tags[1]]));
      tags.push(tag('tag-sig', sig.name, sig.name, 'Aktive Fähigkeit\n\n' + sig.text));
      (sig.keywords || []).forEach(function (k) {
        tags.push(tag('kw-' + k, kwName(k), kwName(k),
          (G.keywords[k] || '') + (G.zustaende[k] ? '\n\n' + G.zustaende[k] : '')));
      });
      if (AB.linien[u.id]) {
        tags.push(tag('tag-linien', 'Vier Linien', 'Eigene Entwicklungslinien',
          'Diese Einheit wählt bei jedem Aufstieg aus vier Passiven — je eine aus Angriff, ' +
          'eigener Mechanik, Unterstützung und Defensive.'));
      }
      return tags.join('');
    }
    if (r.kind === 'relic') {
      var rel = GD.relic(r.id);
      tags.push(tag('rar-tag rar-text-' + rel.rarity, AB.rarName(rel.rarity),
        'Raritätsstufe', G.raritaeten[rel.rarity]));
      tags.push(tag('tag-relikt', 'Relikt', 'Relikt', 'Wirkt auf den ganzen Trupp, den ganzen Run.'));
      (rel.keywords || []).concat(rel.amplifies || []).forEach(function (k) {
        tags.push(tag('kw-' + k, kwName(k), kwName(k), G.keywords[k] || ''));
      });
      if (rel.bedingung) {
        var an = rel.bedingung(run);
        tags.push(tag(an ? 'tag-an' : 'tag-aus', an ? 'Bedingung erfüllt' : 'wirkungslos',
          'Bedingtes Relikt', an ? 'Mit deinem jetzigen Trupp wirkt es.'
            : 'Mit deinem jetzigen Trupp wirkungslos — erst sinnvoll, wenn die Bedingung zutrifft.'));
      }
      return tags.join('');
    }
    if (r.kind === 'item') {
      var it = GD.item(r.id);
      tags.push(tag('rar-tag rar-text-' + it.rarity, AB.rarName(it.rarity),
        'Raritätsstufe', G.raritaeten[it.rarity]));
      tags.push(tag('tag-item', 'Ausrüstung', 'Ausrüstung',
        'Landet im Beutel und wird einer Einheit angelegt.\n\n' + G.begriffe.itemslot));
      (it.keywords || []).concat(it.amplifies || []).forEach(function (k) {
        tags.push(tag('kw-' + k, kwName(k), kwName(k), G.keywords[k] || ''));
      });
      return tags.join('');
    }
    if (r.kind === 'rang') {
      return tag('tag-rang', 'Aufstieg', 'Namensweihe', G.begriffe.rang);
    }
    return tag('tag-mag', 'Vorräte', 'Vorräte', G.begriffe.magicule);
  }

  function ergebnisHtml(p) {
    var html = '';
    if (p.result.winner === 'player') {
      /* Das Ergebnis als eigene Ansage. Die Zahlen kommen aus `bilanz`, nicht aus
         dem Kampflog — das steht nach einem Neuladen nicht mehr zur Verfügung. */
      var b = p.bilanz || {};
      var gefallen = b.gefallen || [];
      html += '<div class="ergebnis"><h2 class="gut">Sieg</h2>' +
        '<p class="beute">+' + (p.gold || 0) + ' ✦ Magicule</p>' +
        (b.ticks ? '<p class="hinweis">' + b.ticks + ' Züge · ' + b.lebend + ' von ' +
          (b.lebend + gefallen.length) + ' Einheiten stehen noch' +
          (gefallen.length ? ' · gefallen: ' + esc(gefallen.join(', ')) : '') + '</p>' : '') +
        '<p class="hinweis">Magicule gesamt: ' + run.magicules + ' ✦</p></div>';
      if (p.devour && p.devour.length) {
        var moeglich = run.team.filter(function (m) { return m.devoured.length < R.praedatorSlots(m); });
        html += '<h3' + tip('Prädator', G.begriffe.praedator) + '>Prädator</h3>';
        if (!moeglich.length) {
          html += '<p class="hinweis">Kein freier Prädator-Slot — dafür braucht es mindestens Rang B.</p>';
        } else {
          html += '<p class="hinweis">Die Fähigkeit des Gefallenen wandert dauerhaft in die gewählte Einheit.</p>' +
            '<div class="reihe"><select id="devour-ziel">' +
            moeglich.map(function (m) {
              return '<option value="' + m.uid + '">' + esc(GD.unit(m.id).name) + ' (' +
                m.devoured.length + '/' + R.praedatorSlots(m) + ')</option>';
            }).join('') + '</select></div><div class="karten">';
          var gezeigt = {};
          p.devour.forEach(function (f) {
            if (gezeigt[f.id]) return;
            gezeigt[f.id] = 1;
            var e = EN.get(f.id);
            var koennen = f.abilities || (e.effects || []).map(function (x) {
              return { name: x.name, text: x.text || '' };
            });
            html += '<button class="karte" data-a="devour" data-id="' + esc(f.id) + '"' +
              tip(koennen.map(function (x) { return x.name; }).join(' · '),
                koennen.map(function (x) { return x.name + ': ' + x.text; }).join('\n\n') +
                '\n\nWird dauerhaft übernommen, von ' + e.name + '.') + '>' +
              artHtml('skill') +
              '<span class="titel">' + esc(koennen.map(function (x) { return x.name; }).join(' · ')) + '</span>' +
              '<span class="unter">' + esc(koennen.map(function (x) { return x.text; }).join(' ')) +
              ' — von ' + esc(e.name) + '</span></button>';
          });
          html += '</div>';
        }
      }
      if (p.bestanden !== undefined) {
        var pr = R.pruefung(run.node && run.node.pruefung);
        html += '<p class="' + (p.bestanden ? 'gut' : 'hinweis') + '">' +
          (p.bestanden ? '✓ Auflage gehalten' : '✗ Auflage verfehlt') +
          (pr ? ' — ' + esc(pr.name) + ': ' + esc(pr.text) : '') +
          (p.bestanden ? ' Mehr Magicule und ein Posten mehr im Markt.' : '') + '</p>';
      }
    } else {
      html += '<p class="schlecht">Niederlage. Ein Leben verloren — ' + run.lives + ' übrig.</p>';
    }
    html += '<div class="reihe"><button class="haupt" data-a="' +
      (p.markt ? 'zum-markt' : 'weiter') + '">' +
      (p.markt ? 'Zur Verwaltung' : 'Weiter') + '</button></div>';
    return html;
  }

  function endeReplay() {
    if (replay.timer) clearInterval(replay.timer);
    replay.timer = null;
    replay.fertig = true;
    zeichneKampf();
    zeichneUnten();
    speichern();
  }

  function ueberspringen() {
    if (!replay || replay.fertig) return;
    var log = replay.res.log;
    while (replay.i < log.length) {
      var l = log[replay.i++];
      if (l.type !== 'setup') anwenden(l);
    }
    endeReplay();
  }

  /* --------------------------------------------------------------- Shop */

  /* ------------------------------------------------------------- Markt */

  /* Was ein Posten wirklich tut — ausführlich, nicht als Kurzzeile. Der Markt
     ist die Stelle, an der entschieden wird; hier gehört die volle Beschreibung
     hin, nicht in einen Tooltip. */
  function marktText(o) {
    if (o.kind === 'unit') {
      var u = GD.unit(o.id), sig = AB.get(u.signature);
      var zeilen = ['<b>' + esc(sig.name) + '</b> — ' + esc(sig.text)];
      if (AB.linien[u.id]) {
        if (o.passive) {
          var p = AB.get(o.passive);
          zeilen.push('Startet mit <b>' + esc(p.name) + '</b> (Linie ' + esc(o.passiveLinieName) +
            '): ' + esc(p.text));
        } else {
          zeilen.push('Wählt bei jedem Aufstieg aus <b>vier</b> eigenen Passiven — sechzehn insgesamt, frei kombinierbar.');
        }
      } else {
        zeilen.push('Erste Passive: ' + (u.passives || []).slice(0, 1).map(function (id) {
          var pp = AB.get(id); return '<b>' + esc(pp.name) + '</b> — ' + esc(pp.text);
        }).join(''));
      }
      var d = R.resolve(R.member(o.id));
      zeilen.push('Werte auf Rang C: ' + d.hp + '❤ ' + d.atk + '⚔ ' + d.def + '🛡 ' + d.spd + '⚡');
      return zeilen.join('<br>');
    }
    if (o.kind === 'relic') {
      var rel = GD.relic(o.id);
      var an = !rel.bedingung || rel.bedingung(run);
      return '<b>' + esc(rel.text) + '</b><br>Wirkt auf den ganzen Trupp, den ganzen Run.' +
        (rel.bedingung ? '<br>' + (an ? '✓ Bedingung mit deinem Trupp erfüllt.'
          : '✗ Mit deinem jetzigen Trupp wirkungslos.') : '');
    }
    if (o.kind === 'item') {
      var it = GD.item(o.id);
      return esc(it.text || '') + '<br>Landet im Beutel; anlegen kannst du es unten am Trupp.';
    }
    if (o.kind === 'rang') {
      var m = R.find(run, o.uid);
      if (!m) return esc(o.text) + '<br>Das Ziel ist nicht mehr im Trupp — der Posten verfällt.';
      return esc(o.text) + '<br>Regulär kostet dieser Aufstieg ' + R.rankCost(m, run) +
        ' ✦; hier sind es ' + o.price + ' ✦.' +
        '<br>Er bringt wie jeder Aufstieg +30 % Leben und Angriff, einen Item-Slot, ' +
        'einen Prädator-Slot und eine Passive zur Wahl.';
    }
    return esc(o.text || '');
  }

  function marktHtml(offers) {
    var html = '<h3>Markt — ' + run.magicules + ' ✦</h3>' +
      '<p class="hinweis">Was der Kampf eingebracht hat, gibst du hier aus. ' +
      'Verkaufen: Gegenstand, Relikt oder Einheit auf die Fläche unten ziehen.</p>';
    html += '<div class="karten markt">';
    offers.forEach(function (o, i) {
      var frei = o.kind !== 'unit' || R.freieArt(run, GD.unit(o.id).art);
      if (o.kind === 'rang') {
        var zielM = R.find(run, o.uid);
        frei = !!zielM && zielM.rank < 3 && !R.passivWahl(run);
      }
      var geht = !o.sold && run.magicules >= o.price && frei;
      html += '<button class="karte' + (o.sold ? ' gewaehlt' : '') + '" data-a="kaufen" data-i="' + i + '"' +
        (geht ? '' : ' disabled') + '>' + artHtml(o.kind) +
        '<span class="titel">' + esc(o.name) + ' — ' + o.price + ' ✦' + (o.sold ? ' (gekauft)' : '') + '</span>' +
        '<div class="kw-leiste">' + belohnungTags(o) + '</div>' +
        '<span class="beschreibung">' + marktText(o) + '</span>' +
        (frei ? '' : '<span class="unter">Art schon besetzt</span>') +
        (!o.sold && frei && run.magicules < o.price
          ? '<span class="unter">' + (o.price - run.magicules) + ' ✦ fehlen</span>' : '') +
        '</button>';
    });
    return html + '</div>';
  }

  /* Die Fläche steht immer da, wo auch der Trupp steht — nicht nur im Markt.
     Verkaufen ist Truppenpflege, kein Ladengeschäft. */
  function verkaufsflaeche() {
    if (!R.darfEntlassen(run)) return '';
    return '<div id="verkauf" class="verkauf"><b>Verkaufen</b>' +
      '<span class="unter">Einheit, Ausrüstung oder Relikt hierher ziehen — ' +
      'es gibt ein Viertel des Einsatzes zurück.</span></div>';
  }

  /* ----------------------------------------------------------- Ereignis */

  function zeichneEvent() {
    var ev = run.pending.event;
    var html;
    if (ev) {
      html = '<h2>' + esc(ev.name) + '</h2><p>' + esc(ev.text) + '</p><div class="karten">';
      ev.options.forEach(function (o, i) {
        var geht = !o.can || o.can(run);
        html += '<button class="karte" data-a="event" data-i="' + i + '"' + (geht ? '' : ' disabled') + '>' +
          '<span class="titel">' + esc(o.text) + '</span></button>';
      });
      html += '</div>';
    } else {
      html = '<h2>Ereignis</h2><p class="gut">' + esc(run.pending.text || 'Erledigt.') + '</p>' +
        '<div class="reihe"><button class="haupt" data-a="weiter">Weiter</button></div>';
    }
    $('view').innerHTML = html;
  }

  /* -------------------------------------------------------------- Lager */

  function zeichneMarkt() {
    var p = run.pending;
    $('view').innerHTML = '<h2>Verwaltung</h2>' +
      '<p class="hinweis">Rüste den Trupp aus, bevor es weitergeht. Unten stehen ' +
      'Aufstellung, Ausrüstung und Aufstiege.</p>' +
      marktHtml(p.markt || []) +
      '<div class="reihe"><button class="haupt" data-a="weiter">Weiterziehen</button></div>';
  }

  function zeichneLager() {
    var html = '<h2>Lager</h2>';
    if (!run.pending.done) {
      html += '<p>Ihr schlagt die Zelte auf. Was ist jetzt am wichtigsten?</p><div class="karten">' +
        '<button class="karte" data-a="lager" data-i="0"' + tip('Meditieren', G.begriffe.magicule) +
        '><span class="titel">Meditieren</span><span class="unter">Magicule für den nächsten Aufstieg</span></button>' +
        '<button class="karte" data-a="lager" data-i="1"' + tip('Schmieden', G.begriffe.itemslot) +
        '><span class="titel">Schmieden</span><span class="unter">Ein Ausrüstungsstück in den Beutel</span></button>' +
        '<button class="karte" data-a="lager" data-i="2"' + tip('Training',
          'Trifft eine zufällige Einheit aus dem Trupp, nicht die von dir gewählte. Der Bonus bleibt den ganzen Run.') +
        '><span class="titel">Training</span><span class="unter">Eine zufällige Einheit: dauerhaft +30 Leben, +4 Angriff</span></button>' +
        '</div>';
    } else {
      html += '<p class="gut">Das Lager wird abgebrochen.</p>' +
        '<div class="reihe"><button class="haupt" data-a="weiter">Weiter</button></div>';
    }
    $('view').innerHTML = html;
  }

  /* --------------------------------------------------------------- Ende */

  function zeichneEnde() {
    var html = run.won
      ? '<h2 class="gut">Milim ist bezwungen — der Run ist gewonnen.</h2>'
      : '<h2 class="schlecht">Der Trupp ist gefallen.</h2>';
    html += '<p>Erreicht: Akt ' + run.act + ', Knoten ' + (run.step + 1) + '. ' +
      'Runs gespielt: ' + run.meta.runs + ', gewonnen: ' + run.meta.wins + '.</p>';
    if (run.unlocked && run.unlocked.length) {
      html += '<p>Neu freigeschaltet: <b>' + esc(run.unlocked.join(', ')) + '</b></p>';
    }
    if (run.neueStufe) {
      html += '<p class="gut">Bedrohungsstufe ' + run.neueStufe.stufe + ' offen: <b>' +
        esc(run.neueStufe.name) + '</b> — ' + esc(run.neueStufe.text) + '</p>';
    }
    html += '<div class="reihe"><button class="haupt" data-a="neu">Neuer Run</button></div>';
    $('view').innerHTML = html;
  }

  /* ------------------------------------------------- Fähigkeitsauswahl */

  /* Passive wählen: vier Angebote, eines je Linie. Die Linie steht dabei, sonst
     ist es nur eine weitere Liste von vier Namen. */
  function passivWahlHtml() {
    var w = R.passivWahl(run);
    if (!w) return '';
    var m = R.find(run, w.uid);
    if (!m) return '';
    var hat = (m.passives || []).length;
    var html = '<div class="wahlbox"><h3>' + esc(GD.unit(m.id).name) + ' — ' +
      (hat + 1) + '. Passive (Rang ' + R.rankName(m) + ')</h3>' +
      '<p class="hinweis">' + (w.offers.some(function (o) { return o.verzicht; })
        ? 'Eine davon ändert eine Regel und kostet dafür etwas. Daneben steht die Bibliothek — schwächer, aber ohne Preis — oder gar nichts.'
        : 'Vier aus den eigenen Passiven dieser Einheit — frei gezogen, ohne Reihenfolge und ohne Quote je Linie.') + '</p>' +
      '<div class="karten">';
    w.offers.forEach(function (o, i) {
      if (o.verzicht) {
        html += '<button class="karte verzicht" data-a="pwahl" data-i="' + i + '"' +
          tip('Nichts nehmen', 'Die Einheit bleibt bei drei Passiven. Kein Keystone, ' +
            'aber auch kein Preis.') + '>' +
          '<span class="titel">◇ Nichts nehmen</span>' +
          '<span class="linie">Verzicht</span>' +
          '<span class="unter">Bleibt bei drei Passiven — ohne den Preis des Keystones.</span></button>';
        return;
      }
      var a = AB.get(o.id);
      html += '<button class="karte" data-a="pwahl" data-i="' + i + '"' +
        tip(a.name + ' · ' + o.linieName, rarZeile(a.rarity, 'passive Fähigkeit') +
          G.begriffe.passiv + '\n\nLinie: ' + o.linieName + '\nWirkung: ' + a.text +
          ((a.keywords || []).concat(a.amplifies || []).length
            ? '\n\nSchlüsselwörter: ' + (a.keywords || []).concat(a.amplifies || []).map(kwName).join(', ')
            : '')) + '>' +
        artHtml('skill') + rarHtml(a.rarity) +
        '<span class="titel">◈ ' + esc(a.name) + '</span>' +
        '<span class="linie">' + esc(o.linieName) + '</span>' +
        '<span class="unter">' + esc(a.text) + '</span></button>';
    });
    return html + '</div></div>';
  }

  function zeichneWahl() {
    $('wahl').innerHTML = passivWahlHtml();
  }

  /* --------------------------------------------------------- Team-Panel */

  /* Fähigkeits-Synergien: was erzeugt der Trupp, was verstärkt er? */
  function synergienHtml() {
    var teile = R.buildTeile(run);
    var kw = AB.keywords(teile);
    var reso = R.resonanzen(run);
    var keys = Object.keys(kw).sort(function (a, b) {
      return (kw[b].quellen + kw[b].verstaerker) - (kw[a].quellen + kw[a].verstaerker);
    });
    if (!keys.length) return '';
    var html = '<h3' + tip('Fähigkeits-Synergien',
      'Was der Trupp erzeugt und was er davon ausnutzt. Ein Build ist erst rund, wenn zu einer ' +
      'Quelle auch ein Verstärker desselben Schlüsselworts kommt — grün markiert.\n\n' +
      G.begriffe.resonanz) +
      '>Fähigkeits-Synergien</h3><div class="syn">';
    keys.forEach(function (k) {
      var e = kw[k], n = e.quellen + e.verstaerker;
      var stark = e.quellen >= 2 && e.verstaerker >= 1;
      var an = !!reso[k];
      html += '<span class="syn-eintrag' + (stark ? ' an' : '') + (an ? ' reso' : '') + '"' +
        tip(kwName(k) + (an ? ' · Resonanz' : ''),
          (G.keywords[k] || '') + '\n\n' + (G.zustaende[k] ? G.zustaende[k] + '\n\n' : '') +
          'Quelle: ' + G.begriffe.quelle + '\nVerstärker: ' + G.begriffe.verstaerker +
          (stark ? '\n\n✓ Quellen und Verstärker greifen ineinander — das ist ein Build.' : '') +
          (C.RESONANZ[k] ? '\n\n' + G.begriffe.resonanz + '\nResonanz: ' + C.RESONANZ[k] +
            (an ? '\n✓ aktiv (' + n + ' Teile)' : '\nNoch ' + (C.RESONANZ_SCHWELLE - n) +
              ' Teil' + (C.RESONANZ_SCHWELLE - n === 1 ? '' : 'e') + ' bis zur Resonanz.') : '')) + '>' +
        '<b>' + esc(kwName(k)) + '</b> · ' + e.quellen + ' Quelle' + (e.quellen === 1 ? '' : 'n') +
        (e.verstaerker ? ' · ' + e.verstaerker + '× Verstärker' : '') +
        (an ? ' <b class="reso-marke">RESONANZ</b>' : '') + '</span>';
    });
    return html + '</div>';
  }

  /* Aufstellung in einer Zeile: erste Einheit antippen, zweite antippen,
     getauscht. Mit ▲▼ allein braucht ein Weg von Platz 5 nach vorn vier Klicks
     — genau das war umständlich. Die Pfeile bleiben für die Feinkorrektur. */
  var tauschUid = null;
  function aufstellungHtml() {
    if (run.team.length < 2) return '';
    var html = '<div class="aufstellung"' + tip('Aufstellung ändern',
      'Erst die eine Einheit antippen, dann die andere — die beiden tauschen den Platz. ' +
      G.begriffe.aufstellung) + '>';
    run.team.forEach(function (m, i) {
      var gewaehlt = m.uid === tauschUid;
      html += '<button class="platz' + (gewaehlt ? ' gewaehlt' : '') + '" data-a="platz" data-uid="' +
        m.uid + '"><b>' + (i + 1) + '</b> ' + esc(GD.unit(m.id).name) + '</button>';
      if (i === 1) html += '<span class="platz-trenner"' + tip('Ab hier greift die Deckung',
        G.begriffe.deckung) + '>┊</span>';
    });
    return html + '</div>' +
      (tauschUid ? '<p class="hinweis">Jetzt die Einheit antippen, mit der getauscht werden soll.</p>' : '');
  }

  function einheitHtml(m, aufBank) {
    var d = R.resolve(m);
    var basis = GD.unit(m.id);
    var kosten = R.rankCost(m, run);
    var kannAufsteigen = m.rank < 3 && run.magicules >= kosten && !R.passivWahl(run);
    var abs = R.abilities(m);
    var aktive = abs.filter(function (a) { return a.art === 'aktiv'; });
    var passive = abs.filter(function (a) { return a.art === 'passiv'; });

    var html = '<div class="einheit' + (aufBank ? ' bank' : '') + '" data-uid="' + m.uid + '"' +
      ' data-verkauf="einheit" data-name="' + esc(d.name) + '">' +
      '<div class="kopf"><span class="name"><span class="rang rang-' + R.rankName(m) + '"' +
      tip('Rang ' + R.rankName(m), G.begriffe.rang + '\n\nJetzt: ' + R.itemSlots(m) + ' Item-Slots, ' +
        R.aktivSlots(m) + ' aktive, ' + R.passivSlots(m) + ' passive, ' +
        R.praedatorSlots(m) + ' Prädator-Slots.') + '>' +
      R.rankName(m) + '</span> ' + esc(d.name) + '</span>' +
      '<span class="werte"' + tip('Werte',
        'Leben ' + d.hp + ' · Angriff ' + d.atk + ' · Rüstung ' + d.def + ' · Tempo ' + d.spd +
        '\n\nRüstung senkt jeden eingehenden Treffer. Tempo bestimmt, wie oft die Einheit am Zug ist.') +
      '>' + d.hp + '❤ ' + d.atk + '⚔ ' + d.def + '🛡 ' + d.spd + '⚡</span></div>' +
      '<div class="tags"><span class="tag"' +
      tip('Art: ' + GD.artName(basis.art), G.arten[basis.art] + '\n\n' + G.begriffe.art) + '>' +
      esc(GD.artName(basis.art)) + '</span>' +
      '<span class="tag"' + tip('Rolle: ' + GD.rolleName(basis.tags[1]), G.rollen[basis.tags[1]]) + '>' +
      esc(GD.rolleName(basis.tags[1])) + '</span></div>';

    /* Nur die Wörter, nicht ihre Erklärung: erklärt wird zentral an der
       Einheitenkarte. Sonst steht dieselbe Definition an jeder der bis zu acht
       Fähigkeiten einer Einheit. Gefärbt wird über TIP_STAMM. */
    function kwZeile(a) {
      var ks = (a.keywords || []).concat(a.amplifies || []);
      return ks.length ? '\n\n' + ks.map(kwName).join(' · ') : '';
    }
    html += '<div class="faehigkeiten">';
    aktive.forEach(function (a) {
      html += '<div class="fk aktiv' + (a.rarity ? ' rar-text-' + a.rarity : '') + '"' +
        tip(a.name, 'Aktive Fähigkeit\n\n' + a.text + kwZeile(a)) +
        '>⚡ ' + esc(a.name) + '</div>';
    });
    passive.forEach(function (a) {
      html += '<div class="fk passiv' + (a.rarity ? ' rar-text-' + a.rarity : '') + '"' +
        tip(a.name, 'Passive Fähigkeit\n\n' + a.text + kwZeile(a)) +
        '>◈ ' + esc(a.name) + '</div>';
    });
    if (m.rank < 3) {
      var wieviele = R.hatLinien(m) ? 'vier' : 'drei';
      html += '<div class="fk leer"' + tip('Nächste Passive',
        'Der Aufstieg auf Rang ' + R.RANK_NAME[m.rank + 1] + ' gibt eine Passive zur Wahl — ' +
        'eine aus ' + wieviele + (R.hatLinien(m) ? ', je eine aus den vier Linien dieser Einheit.'
          : ', darunter die nächste eigene Passive dieser Einheit.')) +
        '>◈ Wahl auf Rang ' + R.RANK_NAME[m.rank + 1] + '</div>';
    }
    m.devoured.slice(0, R.praedatorSlots(m)).forEach(function (eid) {
      var e = EN.get(eid);
      (e.effects || []).forEach(function (ab) {
        html += '<div class="fk praedator"' +
          tip(ab.name, 'Passive Fähigkeit · verschlungen von ' + e.name + '\n\n' +
            (ab.text || '') + kwZeile(ab)) +
          '>🍽 ' + esc(ab.name) + '</div>';
      });
    });
    html += '</div>';

    /* Schlüsselwörter zentral an der Einheit erklärt, nicht an jeder Fähigkeit:
       eine Einheit trägt bis zu acht Fähigkeiten, die dieselben Wörter benutzen. */
    var eigeneKw = [];
    abs.forEach(function (a) {
      (a.keywords || []).concat(a.amplifies || []).forEach(function (k) {
        if (eigeneKw.indexOf(k) < 0) eigeneKw.push(k);
      });
    });
    if (eigeneKw.length) {
      html += '<div class="kw-leiste">' + eigeneKw.map(function (k) {
        return '<span class="kw-tag kw-' + k + '"' +
          tip(kwName(k), (G.keywords[k] || '') +
            (G.zustaende[k] ? '\n\n' + G.zustaende[k] : '')) + '>' + esc(kwName(k)) + '</span>';
      }).join('') + '</div>';
    }

    html += '<div class="liste">' + m.items.map(function (id) {
      var it = GD.item(id);
      return '<span class="chip rar-rand-' + it.rarity + '"' +
        tip(it.name, rarZeile(it.rarity, 'Ausrüstung') + (it.text || '')) + '>' + esc(it.name) +
        ' <button data-a="ablegen" data-uid="' + m.uid + '" data-id="' + id + '">×</button></span>';
    }).join('') +
      '<span class="chip leer"' + tip('Ausrüstungs-Slots', G.begriffe.itemslot) + '>Ausrüstung ' +
      m.items.length + '/' + R.itemSlots(m) + '</span>' +
      '<span class="chip leer"' + tip('Prädator-Slots', G.begriffe.praedator) + '>Prädator ' +
      m.devoured.length + '/' + R.praedatorSlots(m) + '</span></div>';

    html += '<div class="knoepfe">';
    if (!aufBank) {
      html += '<button data-a="vor" data-uid="' + m.uid + '" title="nach vorn">▲</button>' +
        '<button data-a="zurueck" data-uid="' + m.uid + '" title="nach hinten">▼</button>';
      html += '<button data-a="bank" data-uid="' + m.uid + '">Bank</button>';
    } else {
      html += '<button data-a="einsetzen" data-uid="' + m.uid + '">Einsetzen</button>';
    }
    html += '<span class="chip leer ziehhinweis"' +
      tip('Entlassen', 'Diese Karte auf die Verkaufsfläche im Markt ziehen. Gibt ' +
        R.entlassenWert(m) + ' Magicule zurück — ein Viertel dessen, was in dieser Einheit ' +
        'steckt (Anwerbung und Rangaufstiege). Ausrüstung wandert zurück in den Beutel, ' +
        'die Art wird wieder frei.') + '>ziehen: +' + R.entlassenWert(m) + '✦</span>';
    html += '<button class="' + (kannAufsteigen ? 'haupt' : '') + '" data-a="aufstieg" data-uid="' + m.uid + '"' +
      (kannAufsteigen ? '' : ' disabled') +
      tip(m.rank >= 3 ? 'Höchster Rang' : 'Aufstieg auf Rang ' + R.RANK_NAME[m.rank + 1],
        m.rank >= 3 ? 'Weiter geht es nicht.' :
        'Kostet ' + kosten + ' Magicule (du hast ' + run.magicules + ').\n\nGibt: +30 % Leben und Angriff, ' +
        '+1 Rüstung, +1 Tempo, ' + (m.rank === 2 ? 'ZWEI Item-Slots' : 'einen Item-Slot') +
        ', einen aktiven Slot mit Auswahl aus drei Fähigkeiten (zwei davon passen ' +
        'zur Linie dieser Einheit), die Passive „' +
        (AB.get(basis.passives[R.passivSlots(m)]) || { name: '—' }).name + '" und einen Prädator-Slot.') + '>' +
      (m.rank >= 3 ? 'Rang S erreicht' : 'Aufstieg ' + R.RANK_NAME[m.rank + 1] + ' — ' + kosten + '✦') + '</button>';
    html += '</div></div>';
    return html;
  }

  /* ------------------------------------------------ Debug-Übersicht */

  /* Warum ist diese Einheit so stark, wie sie ist? Vier Zwischenstände je Wert
     — Basis, Rang, Ausrüstung, Kampf — und dahinter, was den letzten Sprung
     verursacht hat. Die Kampfspalte kommt aus combat.js selbst (`nurAufbau`),
     nicht aus einer Zweitrechnung, die irgendwann etwas anderes behauptet. */

  var debugAn = false;
  try { debugAn = localStorage.getItem('tensura-debug') === '1'; } catch (e) {}

  var WERTE = [['hp', '❤', 'maxHp'], ['atk', '⚔', 'atk'], ['def', '🛡', 'def'], ['spd', '⚡', 'spd']];

  function delta(a, b) {
    var d = b - a;
    return d === 0 ? '' : '<i class="' + (d > 0 ? 'auf' : 'ab') + '">' + (d > 0 ? '+' : '') + d + '</i>';
  }

  function debugZeile(name, hilfe, werte, vorher) {
    var html = '<tr><th' + tip(name, hilfe) + '>' + esc(name) + '</th>';
    WERTE.forEach(function (w, i) {
      html += '<td>' + werte[i] + (vorher ? ' ' + delta(vorher[i], werte[i]) : '') + '</td>';
    });
    return html + '</tr>';
  }

  function debugEinheit(a) {
    var basis = [a.basis.hp, a.basis.atk, a.basis.def, a.basis.spd];
    var rang = [a.rang.hp, a.rang.atk, a.rang.def, a.rang.spd];
    var aus = [a.aus.hp, a.aus.atk, a.aus.def, a.aus.spd];
    var kmp = [a.kampf.maxHp, a.kampf.atk, a.kampf.def, a.kampf.spd];

    var html = '<div class="dbg-einheit"><h4>' + esc(a.basis.name) +
      ' <span class="rang rang-' + R.rankName(a.m) + '">' + R.rankName(a.m) + '</span>' +
      ' <small>Platz ' + (run.team.indexOf(a.m) + 1) + ' · ' +
      esc(GD.rolleName(a.basis.tags[1])) + '</small></h4>' +
      '<table class="dbg"><tr><th>Stufe</th>' +
      WERTE.map(function (w) { return '<th>' + w[1] + '</th>'; }).join('') + '</tr>';
    html += debugZeile('Basis', 'Rohwerte aus data.js — ohne alles.', basis, null);
    html += debugZeile('Rang ' + R.rankName(a.m),
      'Jeder Rang gibt +30 % Leben und Angriff, +1 Rüstung, +1 Tempo.', rang, basis);
    html += debugZeile('Ausrüstung',
      'Angelegte Ausrüstung und dauerhafte Ereignis-Boni.\n\n' +
      (a.m.items.map(function (id) { return GD.item(id).name; }).join(', ') || 'nichts angelegt') +
      (a.m.bonus ? '\nEreignis-Boni: ' + JSON.stringify(a.m.bonus) : ''), aus, rang);
    html += debugZeile('Im Kampf',
      'Relikte, Resonanz und alle Passiven mit Hook onStart — der Zustand, mit dem ' +
      'die erste Runde beginnt.', kmp, aus);
    html += '</table>';

    /* Alles, was kein Grundwert ist, aber im Kampf zählt. */
    var extra = [];
    var k = a.kampf;
    if (k.status.schild) extra.push('Schild ' + Math.round(k.status.schild));
    if (k.regen) extra.push('Regeneration ' + k.regen);
    if (k.lifesteal) extra.push('Lebensraub ' + Math.round(k.lifesteal * 100) + ' %');
    if (k.heilfaktor) extra.push('Heilung ×' + (1 + k.heilfaktor).toFixed(2));
    if (k.schildfaktor) extra.push('Schild ×' + (1 + k.schildfaktor).toFixed(2));
    if (k.pierce) extra.push('Rüstungsdurchdringung ' + Math.round(k.pierce * 100) + ' %');
    if (k.durchschlag) extra.push('geht durch Schilde');
    if (k.minderung) extra.push('Schadensminderung ' + Math.round(k.minderung * 100) + ' %');
    if (k.schadensdeckel) extra.push('Treffer gedeckelt auf ' + Math.round(k.schadensdeckel * 100) + ' % Leben');
    if (k.markenmeister > 1) extra.push('Marken ×' + k.markenmeister);
    if (k.chaosmeister > 1) extra.push('Chaos ×' + k.chaosmeister);
    if (k.jagdbefehl) extra.push('Jagdbefehl');
    if (extra.length) html += '<p class="dbg-extra">' + esc(extra.join(' · ')) + '</p>';

    html += '<p class="dbg-extra">⚡ ' + (k.actives.map(function (x) {
      return esc(x.name);
    }).join(' · ') || '—') + '</p>';
    html += '<p class="dbg-extra">◈ ' + (k.effects.map(function (x) {
      return esc(x.name || '?');
    }).join(' · ') || '—') + '</p>';
    if (k.keywords.length) {
      html += '<p class="dbg-extra">🔑 ' + esc(k.keywords.map(kwName).join(' · ')) + '</p>';
    }
    return html + '</div>';
  }

  function debugHtml() {
    if (!debugAn) return '';
    if (!run.team.length) return '<div class="debugbox"><p class="hinweis">Kein Trupp.</p></div>';
    var a = R.analyse(run);
    var reso = Object.keys(a[0].resonanz);
    var wirksam = run.relics.map(GD.relic).filter(function (r) {
      return !r.bedingung || r.bedingung(run);
    });
    var schlafend = run.relics.map(GD.relic).filter(function (r) {
      return r.bedingung && !r.bedingung(run);
    });
    var html = '<div class="debugbox"><p class="dbg-kopf">' +
      'Resonanz: <b>' + (reso.length ? esc(kwName(reso[0])) + ' — ' + esc(C.RESONANZ[reso[0]]) : 'keine') + '</b>' +
      ' · Relikte aktiv: ' + wirksam.length + '/' + run.relics.length +
      (schlafend.length ? ' (schläft: ' + esc(schlafend.map(function (r) { return r.name; }).join(', ')) + ')' : '') +
      ' · Truppstärke ' + a.reduce(function (s, x) { return s + x.kampf.maxHp + 6 * x.kampf.atk; }, 0) +
      '</p>';
    a.forEach(function (x) { html += debugEinheit(x); });
    return html + '</div>';
  }

  /* Solange der Kampf läuft, gehört der Bildschirm dem Kampf. Erst danach kommt
     das Truppen-Management samt Aufstiegen zurück — sonst steht die halbe
     Verwaltung unter einer laufenden Animation und niemand sieht beides. */
  /* Die Kampfphase gehört ganz dem Kampf — erst die Auflösung, dann das
     Ergebnis. Die Verwaltung kommt danach in ihrem eigenen Bildschirm. */
  function kampfLaeuft() { return run.phase === 'kampf'; }

  function zeichneUnten() {
    if (kampfLaeuft()) {
      ['wahl', 'synergien', 'team', 'beutel', 'reliktliste'].forEach(function (id) {
        var el = $(id); if (el) el.innerHTML = '';
      });
      return;
    }
    zeichneWahl();
    $('synergien').innerHTML = synergienHtml();

    var frei = GD.ARTEN.filter(function (a) { return R.freieArt(run, a); });
    var html = '<h3' + tip('Aufstellung', G.begriffe.aufstellung + '\n\n' + G.begriffe.art) +
      '>Trupp — vorn zuerst getroffen (' + run.team.length + '/' + R.TEAM_MAX + ')' +
      ' · eine Einheit je Art' +
      '<button class="dbg-schalter' + (debugAn ? ' an' : '') + '" data-a="debug"' +
      tip('Debug-Übersicht', 'Zeigt für jede Einheit, woher jeder Punkt kommt: Basis, Rang, ' +
        'Ausrüstung, und was Relikte, Resonanz und Passive im Kampf daraus machen.') +
      '>🔬 Debug</button></h3>' +
      debugHtml() +
      verkaufsflaeche() + aufstellungHtml() +
      '<p class="hinweis">Freie Arten: ' + (frei.length
        ? frei.map(function (a2) {
            return '<span class="frei-art"' + tip(GD.artName(a2), G.arten[a2]) + '>' +
              esc(GD.artName(a2)) + '</span>';
          }).join(', ')
        : 'keine — für eine neue Einheit musst du erst eine entlassen') + '</p>' +
      '<div class="einheiten">';
    run.team.forEach(function (m) { html += einheitHtml(m, false); });
    html += '</div>';
    if (run.bank.length) {
      html += '<h3' + tip('Bank', G.begriffe.bank) + '>Bank (' + run.bank.length + '/' + R.BANK_MAX +
        ')</h3><div class="einheiten">';
      run.bank.forEach(function (m) { html += einheitHtml(m, true); });
      html += '</div>';
    }
    $('team').innerHTML = html;

    var bag = run.bag || [];
    $('beutel').innerHTML = !bag.length ? '' :
      '<h3>Beutel</h3><div class="reihe"><select id="item-ziel">' +
      run.team.concat(run.bank).map(function (m) {
        return '<option value="' + m.uid + '">' + esc(GD.unit(m.id).name) + ' (' +
          m.items.length + '/' + R.itemSlots(m) + ')</option>';
      }).join('') + '</select></div>' +
      '<div class="liste">' + bag.map(function (id) {
        var it = GD.item(id);
        return '<span class="chip rar-rand-' + it.rarity + '" data-verkauf="item" data-id="' + id +
          '" data-name="' + esc(it.name) + '"' +
          tip(it.name, rarZeile(it.rarity, 'Ausrüstung') + (it.text || '') +
            '\n\nZum Verkaufen auf die Verkaufsfläche ziehen: +' + R.itemWert(id) + ' Magicule.') +
          '>' + esc(it.name) +
          ' <button data-a="anlegen" data-id="' + id + '">anlegen</button></span>';
      }).join('') + '</div>';

    $('reliktliste').innerHTML = !run.relics.length ? '' :
      '<h3>Relikte</h3><div class="liste">' + run.relics.map(function (id) {
        var r = GD.relic(id);
        var wirkt = !r.bedingung || r.bedingung(run);
        return '<span class="chip rar-rand-' + r.rarity + (wirkt ? '' : ' schlaeft') + '"' +
          ' data-verkauf="relikt" data-id="' + id + '" data-name="' + esc(r.name) + '"' +
          tip(r.name, rarZeile(r.rarity, 'Relikt') +
            'Wirkt auf den ganzen Trupp, den ganzen Run.\n' + r.text +
            (r.bedingung ? '\n\n' + (wirkt ? '✓ Bedingung erfüllt.'
              : '✗ Schläft gerade — die Bedingung trifft auf deinen Trupp nicht zu.') : '') +
            '\n\nZum Verkaufen auf die Verkaufsfläche ziehen: +' + R.reliktWert(id) + ' Magicule.') + '>' +
          esc(r.name) + (wirkt ? '' : ' 💤') + '</span>';
      }).join('') + '</div>';
  }

  /* ------------------------------------------------------------- Render */

  function render() {
    versteckeTip();
    zeichneHud();
    if (run.phase === 'start') zeichneStart();
    else if (run.phase === 'karte') zeichneKarte();
    else if (run.phase === 'kampf') zeichneKampf();
    else if (run.phase === 'markt') zeichneMarkt();
    else if (run.phase === 'event') zeichneEvent();
    else if (run.phase === 'lager') zeichneLager();
    else zeichneEnde();
    zeichneUnten();
  }

  function speichern() {
    R.saveMeta(run.meta);
    if (!run.over) R.save(run); else R.clear();
  }

  /* ------------------------------------------------------------ Aktionen */

  var aktionen = {
    knoten: function (d) {
      var p = R.choose(run, +d.i);
      if (run.phase === 'kampf') { starteReplay(p.result); zeichneHud(); zeichneUnten(); }
      else { render(); speichern(); }
    },
    ueberspringen: function () { ueberspringen(); },
    devour: function (d) {
      var ziel = $('devour-ziel');
      R.devour(run, d.id, ziel ? ziel.value : run.team[0].uid);
      render(); speichern();
    },
    'zum-markt': function () { R.zumMarkt(run); replay = null; render(); speichern(); },
    weiter: function () { R.advance(run); replay = null; render(); speichern(); },
    stufe: function (d) {
      if (!run.over && run.step + run.act > 1 &&
          !confirm('Die Stufe zu wechseln setzt den laufenden Run neu auf. Fortfahren?')) return;
      var menu = $('menu'); if (menu && menu.open) menu.close();
      var neu = Math.min(+d.i, run.meta.threat || 0);
      run.meta.threatGewaehlt = neu;
      R.saveMeta(run.meta);
      /* Die Stufe greift beim Start — also den Run neu aufsetzen. */
      run = R.create(Math.floor(Math.random() * 0xffffffff), run.meta);
      render(); speichern();
    },
    start: function (d) { R.chooseStart(run, +d.i); render(); speichern(); },
    kaufen: function (d) { R.buy(run, +d.i); render(); speichern(); },
    event: function (d) { R.eventChoose(run, +d.i); render(); speichern(); },
    lager: function (d) { R.camp(run, +d.i); render(); speichern(); },
    aufstieg: function (d) { R.rankUp(run, d.uid); render(); speichern(); },
    pwahl: function (d) { R.choosePassive(run, +d.i); render(); speichern(); },
    platz: function (d) {
      if (!tauschUid || tauschUid === d.uid) tauschUid = tauschUid === d.uid ? null : d.uid;
      else { R.swap(run, tauschUid, d.uid); tauschUid = null; speichern(); }
      render();
    },
    vor: function (d) { R.move(run, d.uid, -1); render(); speichern(); },
    zurueck: function (d) { R.move(run, d.uid, 1); render(); speichern(); },
    bank: function (d) { R.bench(run, d.uid); render(); speichern(); },
    einsetzen: function (d) { R.deploy(run, d.uid); render(); speichern(); },
    anlegen: function (d) {
      var ziel = $('item-ziel');
      R.equip(run, ziel ? ziel.value : run.team[0].uid, d.id);
      render(); speichern();
    },
    ablegen: function (d) { R.unequip(run, d.uid, d.id); render(); speichern(); },
    debug: function () {
      debugAn = !debugAn;
      try { localStorage.setItem('tensura-debug', debugAn ? '1' : '0'); } catch (e) {}
      render();
    },
    neu: function () { neuerRun(); },
    speichern: function () { speichern(); $('menu').close(); },
    'menu-zu': function () { $('menu').close(); }
  };

  /* Alles Erklärbare an einem Ort — im Menü nachschlagbar, ohne Hovern. */
  function glossarHtml() {
    var teile = [
      ['Zustände', G.zustaende, STATUS_NAMEN],
      ['Schlüsselwörter', G.keywords, KEYWORD_NAMEN],
      ['Rollen', G.rollen, null],
      ['Arten', G.arten, null],
      ['Raritätsstufen', G.raritaeten, null],
      ['Begriffe', G.begriffe, null]
    ];
    return teile.map(function (t) {
      var eintraege = Object.keys(t[1]).map(function (k) {
        var name = t[2] ? (t[2][k] || k) : (t[0] === 'Rollen' ? GD.rolleName(k)
          : t[0] === 'Arten' ? GD.artName(k) : k.charAt(0).toUpperCase() + k.slice(1));
        if (t[0] === 'Raritätsstufen') name = AB.rarName(+k).charAt(0).toUpperCase() + AB.rarName(+k).slice(1);
        return '<dt' + (t[0] === 'Raritätsstufen' ? ' class="rar-text-' + k + '"' : '') + '>' +
          esc(name) + '</dt><dd>' + esc(t[1][k]) + '</dd>';
      }).join('');
      return '<h4>' + t[0] + '</h4><dl class="glossar">' + eintraege + '</dl>';
    }).join('');
  }

  /* Alle Linien je Einheit — Nachschlagewerk im Menü. */
  var LINIE_KATEN = ['angriff', 'mechanik', 'unterstuetzung', 'defensive'];

  function linienEinheitenSortiert() {
    return GD.units.filter(function (u) { return AB.linien[u.id]; }).sort(function (a, b) {
      var c = GD.artName(a.art).localeCompare(GD.artName(b.art), 'de');
      return c !== 0 ? c : a.name.localeCompare(b.name, 'de');
    });
  }

  function linienDetailHtml(unitId) {
    var u = GD.unit(unitId), l = AB.linien[unitId];
    if (!u || !l) return '<p class="hinweis">Keine Linien für diese Einheit.</p>';
    /* Die „Generator"-Markierung und der Archetyp sind weg: es gibt keine
       generierten Einheiten mehr, alle 35 sind von Hand geschrieben. Statt
       eines toten Etiketts stehen jetzt die Schlüsselwörter der Einheit da —
       das ist die Information, nach der man in der Übersicht sucht. */
    var kws = {};
    LINIE_KATEN.forEach(function (kat) {
      (l[kat] || []).forEach(function (pid) {
        var a = AB.get(pid);
        if (a) (a.keywords || []).forEach(function (k) { kws[k] = 1; });
      });
    });
    var liste = Object.keys(kws);
    var html = '<p class="linien-kopf"><b>' + esc(u.name) + '</b> · ' + esc(GD.artName(u.art)) +
      (liste.length ? '<br><span class="kws">' + liste.map(function (k) {
        return '<span class="kw-chip">' + esc(kwName(k)) + '</span>';
      }).join('') + '</span>' : '') + '</p>';

    /* Die Signatur steht über den Linien: sie ist die eine Aktive, die die
       Einheit immer führt, und der Grund, warum ihre Passiven so aussehen, wie
       sie aussehen. Ohne sie liest sich die Übersicht wie eine Liste ohne Mitte. */
    var sig = AB.get(u.signature);
    if (sig) {
      var sigKs = (sig.keywords || []).concat(sig.amplifies || []);
      html += '<div class="signatur-block"' +
        tip(sig.name, sig.text + (sigKs.length ? '\n\n' + sigKs.map(kwName).join(' · ') : '')) + '>' +
        '<h5>Signatur · jede Runde</h5>' +
        '<span class="titel">✦ ' + esc(sig.name) + '</span>' +
        '<span class="unter">' + esc(sig.text) + '</span>' +
        (sigKs.length ? '<span class="kws">' + sigKs.map(function (k) {
          return '<span class="kw-chip">' + esc(kwName(k)) + '</span>';
        }).join('') + '</span>' : '') +
        '</div>';
    }

    html += '<div class="linien-blaetter">';
    LINIE_KATEN.forEach(function (kat) {
      if (!l[kat] || !l[kat].length) return;
      html += '<div class="linie-block"><h5>' + esc(AB.LINIEN_NAME[kat] || kat) + '</h5>';
      l[kat].forEach(function (pid, i) {
        var a = AB.get(pid);
        if (!a) { html += '<span class="linien-stufe">' + esc(pid) + '</span>'; return; }
        /* Keine Stufen mehr — die Passiven einer Linie sind gleichrangig und
           frei kombinierbar. Markiert wird nur, was einen Preis hat: feste
           vierte Stelle, damit eine wachsende Linie die Marke nicht mitzieht. */
        var preis = i === 3;
        var ks = (a.keywords || []).concat(a.amplifies || []);
        var tipText = a.text + (preis ? '\n\nÄndert eine Regel und kostet dafür etwas.' : '') +
          (ks.length ? '\n\n' + ks.map(kwName).join(' · ') : '');
        html += '<span class="linien-stufe"' + tip(a.name, tipText) + '>' +
          '<b>' + esc(a.name) + '</b>' +
          (preis ? ' <span class="tag-preis">Preis</span>' : '') +
          ' — ' + esc(a.text) + '</span>';
      });
      html += '</div>';
    });
    return html + '</div>';
  }

  function fuelleLinienSelect(sel, preferId) {
    if (!sel) return preferId;
    var liste = linienEinheitenSortiert();
    var pick = preferId;
    if (!pick || !AB.linien[pick]) {
      pick = liste.length ? liste[0].id : '';
    }
    sel.innerHTML = liste.map(function (u) {
      return '<option value="' + esc(u.id) + '"' + (u.id === pick ? ' selected' : '') + '>' +
        esc(GD.artName(u.art) + ' — ' + u.name) + '</option>';
    }).join('');
    return pick;
  }

  function zeichneLinienUebersicht(unitId) {
    var sel = $('linien-einheit'), box = $('menu-linien');
    if (!box) return;
    var id = fuelleLinienSelect(sel, unitId || (sel && sel.value) ||
      (run.team[0] ? run.team[0].id : null));
    box.innerHTML = linienDetailHtml(id);
  }

  function metaHtml() {
    var meta = run.meta;
    var uOffen = GD.units.filter(function (u) { return meta.unlockedUnits.indexOf(u.id) < 0; });
    var rOffen = GD.relics.filter(function (r) { return meta.unlockedRelics.indexOf(r.id) < 0; });
    var uOffenIds = uOffen.map(function (u) { return u.id; });
    var rOffenIds = rOffen.map(function (r) { return r.id; });
    var stufe = R.bedrohung(meta.threat || 0);

    function balken(hab, gesamt) {
      var p = Math.round(hab / gesamt * 100);
      return '<div class="fortschritt"><i style="width:' + p + '%"></i>' +
        '<b>' + hab + ' / ' + gesamt + '</b></div>';
    }
    function liste(ids, alle, hol, leer) {
      return '<div class="liste">' + alle.filter(function (x) { return ids.indexOf(x.id) >= 0; })
        .map(function (x) {
          var rar = x.rarity || 1;
          return '<span class="chip' + (leer ? ' leer' : '') + ' rar-rand-' + rar + '"' +
            tip(x.name, hol(x)) + '>' + esc(x.name) + '</span>';
        }).join('') + '</div>';
    }

    /* Die Stufenwahl gehört hierher und nicht nur in den Startbildschirm: dort
       sieht man sie einen Augenblick und danach nie wieder. */
    var wahl = '<div class="reihe">' + R.BEDROHUNG.map(function (b2) {
      if (b2.stufe > (meta.threat || 0)) {
        return '<button disabled' + tip(b2.stufe + ' · ' + b2.name,
          'Noch verschlossen. Gewinne einen Run auf Stufe ' + (meta.threat || 0) +
          ', dann geht diese auf.') + '>🔒 ' + b2.stufe + '</button>';
      }
      return '<button class="' + (b2.stufe === run.threat ? 'haupt' : '') +
        '" data-a="stufe" data-i="' + b2.stufe + '"' +
        tip(b2.stufe + ' · ' + b2.name, b2.text +
          '\n\nUmstellen setzt den laufenden Run neu auf.') + '>' + b2.stufe + '</button>';
    }).join('') + '</div>';

    return '<p class="hinweis">' + run.meta.runs + ' Runs · ' + run.meta.wins + ' Siege · ' +
      'weitester Weg: ' + (meta.best || 0) + ' Knoten</p>' +
      '<h4>Bedrohungsstufe ' + stufe.stufe + ' — ' + esc(stufe.name) + '</h4>' +
      balken(meta.threat || 0, R.BEDROHUNG.length - 1) +
      '<p class="hinweis">' + esc(stufe.text) + '</p>' + wahl +
      '<p class="hinweis">Die Stufe steigt, sobald du einen Run <b>gewinnst</b>. ' +
      'Ein verlorener Run ändert nichts.</p>' +
      '<h4>Einheiten</h4>' + balken(meta.unlockedUnits.length, GD.units.length) +
      liste(meta.unlockedUnits, GD.units, function (u) {
        var sig = AB.get(u.signature);
        return GD.artName(u.art) + ' · ' + GD.rolleName(u.tags[1]) + '\n' + sig.name + ': ' + sig.text;
      }) +
      (uOffen.length
        ? '<p class="hinweis">Noch verschlossen: ' + uOffen.length +
          ' Einheiten. Jeder beendete Run schaltet eine frei.</p>' +
          liste(uOffenIds, GD.units, function (u) {
            var sig = AB.get(u.signature);
            return GD.artName(u.art) + ' · ' + GD.rolleName(u.tags[1]) + '\n' + sig.name + ': ' + sig.text;
          }, true)
        : '<p class="gut">Alle Einheiten frei.</p>') +
      '<h4>Relikte</h4>' + balken(meta.unlockedRelics.length, GD.relics.length) +
      liste(meta.unlockedRelics, GD.relics, function (r) { return r.text; }) +
      (rOffen.length
        ? '<p class="hinweis">Noch verschlossen: ' + rOffen.length + ' Relikte.</p>' +
          liste(rOffenIds, GD.relics, function (r) { return r.text; }, true)
        : '<p class="gut">Alle Relikte frei.</p>');
  }

  function neuerRun() {
    var meta = R.loadMeta();
    R.clear();
    run = R.create(Math.floor(Math.random() * 0xffffffff), meta);
    replay = null;
    $('menu').close();
    render();
    speichern();
  }

  /* ---- Verkaufen per Ziehen -----------------------------------------------
     Pointer Events statt HTML5-Drag: Letzteres feuert auf Touch gar nicht, und
     das Spiel ist mobile-first. Ein Zeiger, eine Bahn — Maus wie Finger.      */

  var zieht = null;

  function ziehbar(el) {
    var q = el.closest && el.closest('[data-verkauf]');
    return q && R.darfEntlassen(run) ? q : null;
  }

  function verkaufsWert(d) {
    if (d.verkauf === 'item') return R.itemWert(d.id);
    if (d.verkauf === 'relikt') return R.reliktWert(d.id);
    var m = R.find(run, d.uid);
    return m ? R.entlassenWert(m) : 0;
  }

  function zieheStart(ev) {
    var el = ziehbar(ev.target);
    if (!el) return;
    ev.preventDefault();
    var geist = el.cloneNode(true);
    geist.className = 'zieh-geist';
    geist.textContent = el.dataset.name + '  +' + verkaufsWert(el.dataset) + '✦';
    document.body.appendChild(geist);
    zieht = { el: el, geist: geist, daten: el.dataset };
    el.classList.add('wird-gezogen');
    $('verkauf') && $('verkauf').classList.add('bereit');
    bewege(ev);
  }

  function bewege(ev) {
    if (!zieht) return;
    zieht.geist.style.left = ev.clientX + 'px';
    zieht.geist.style.top = ev.clientY + 'px';
    var ziel = $('verkauf');
    if (!ziel) return;
    var r = ziel.getBoundingClientRect();
    var drin = ev.clientX >= r.left && ev.clientX <= r.right &&
               ev.clientY >= r.top && ev.clientY <= r.bottom;
    ziel.classList.toggle('drueber', drin);
    zieht.drin = drin;
  }

  function zieheEnde() {
    if (!zieht) return;
    var d = zieht.daten, drin = zieht.drin;
    zieht.geist.remove();
    zieht.el.classList.remove('wird-gezogen');
    var ziel = $('verkauf');
    if (ziel) { ziel.classList.remove('bereit'); ziel.classList.remove('drueber'); }
    zieht = null;
    if (!drin) return;
    var ok = d.verkauf === 'item' ? R.verkaufeItem(run, d.id)
      : d.verkauf === 'relikt' ? R.verkaufeRelikt(run, d.id)
      : R.entlassen(run, d.uid);
    if (ok) { render(); speichern(); }
  }

  function klick(ev) {
    var el = ev.target.closest('[data-a]');
    if (!el) return;
    var a = aktionen[el.dataset.a];
    if (!a) return;
    ev.preventDefault();
    a(el.dataset);
  }

  function start() {
    run = R.load();
    if (!run) run = R.create(Math.floor(Math.random() * 0xffffffff), R.loadMeta());
    document.addEventListener('click', klick);
    document.addEventListener('pointerdown', zieheStart);
    document.addEventListener('pointermove', bewege);
    document.addEventListener('pointerup', zieheEnde);
    document.addEventListener('pointercancel', zieheEnde);
    /* Tooltips: Hover am Rechner, Tippen am Handy. */
    document.addEventListener('mouseover', function (ev) {
      var el = ev.target.closest && ev.target.closest('[data-tip]');
      if (el) zeigeTip(el); else versteckeTip();
    });
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest && ev.target.closest('[data-tip]');
      if (el && el.isConnected) zeigeTip(el);
    });
    window.addEventListener('scroll', versteckeTip, true);
    hudTips();
    var linienSel = $('linien-einheit');
    if (linienSel) linienSel.addEventListener('change', function () { zeichneLinienUebersicht(linienSel.value); });
    var reiter = $('menu-reiter');
    if (reiter) reiter.addEventListener('click', function (e) {
      var b = e.target.closest('[data-reiter]');
      if (!b) return;
      reiter.querySelectorAll('button').forEach(function (x) { x.classList.toggle('an', x === b); });
      document.querySelectorAll('#menu .blatt').forEach(function (s) {
        s.hidden = s.dataset.blatt !== b.dataset.reiter;
      });
    });
    $('btn-menu').addEventListener('click', function () {
      $('menu-info').textContent = 'Runs: ' + run.meta.runs + ' · Siege: ' + run.meta.wins +
        ' · freigeschaltet: ' + run.meta.unlockedUnits.length + ' Einheiten, ' +
        run.meta.unlockedRelics.length + ' Relikte.';
      $('menu-meta').innerHTML = metaHtml();
      zeichneLinienUebersicht();
      $('menu-glossar').innerHTML = glossarHtml();
      $('menu-chronik').innerHTML = run.chronik.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('');
      $('menu').showModal();
    });
    render();
  }

  root.UI = { start: start, aktueller: function () { return run; }, render: render };
})(globalThis);
