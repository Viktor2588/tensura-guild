/* js/ui.js — Darstellung und Eingaben. Enthält keine Spielregeln:
   alles, was den Zustand ändert, geht durch Run.*                            */
'use strict';
(function (root) {
  var R = root.Run, GD = root.GameData, EN = root.Enemies, C = root.Combat, AB = root.Abilities;

  var run = null;
  var replay = null;             // { res, i, u:{key->Anzeige}, zeilen, timer, fertig }
  var STATUS_NAMEN = { gift: 'Gift', brand: 'Brand', erstarrung: 'Erstarrt', verderbnis: 'Verderbnis', schild: 'Schild' };
  var KEYWORD_NAMEN = {
    gift: 'Gift', brand: 'Brand', frost: 'Frost', verderbnis: 'Verderbnis',
    schild: 'Schild', heilung: 'Heilung', konter: 'Konter', tempo: 'Tempo',
    exekution: 'Exekution', flaeche: 'Fläche'
  };
  var TYP_TEXT = {
    kampf: 'Kampf', elite: 'Elite-Kampf', boss: 'Boss', shop: 'Händler',
    event: 'Ereignis', lager: 'Lager'
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
    signatur: 'typ-signatur', aktive: 'typ-aktiv', passive: 'typ-passiv', passiv: 'typ-passiv',
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
    var paare = [['hud-gold', 'Gold', G.begriffe.gold], ['hud-mag', 'Magicule', G.begriffe.magicule],
                 ['hud-leben', 'Verbleibende Niederlagen', G.begriffe.leben]];
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
    $('hud-gold').textContent = run.gold;
    $('hud-mag').textContent = run.magicules;
    $('hud-leben').textContent = run.lives;
    zeichnePfad();
  }

  /* Der Weg durch den Akt: was an jedem Knoten zur Wahl steht, wo du gerade
     stehst und wann der Boss kommt. Ohne das plant niemand voraus — die
     Reihenfolge der Knotenarten steht ja fest (Run.STEPS). */
  var TYP_ICON = { kampf: '⚔', elite: '☠', boss: '👑', shop: '🪙', event: '❓', lager: '🏕' };
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

  function gegnerVorschau(enc) {
    var zaehler = {};
    enc.units.forEach(function (id) {
      var n = EN.get(id).name;
      zaehler[n] = (zaehler[n] || 0) + 1;
    });
    return Object.keys(zaehler).map(function (n) {
      return zaehler[n] > 1 ? zaehler[n] + '× ' + n : n;
    }).join(', ');
  }

  /* Was dich dort erwartet, mit Fähigkeiten — ohne das ist die Wegwahl blind.
     Die Werte kommen aus EN.build, also inklusive der Härte dieser Begegnung. */
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

  function zeichneKarte() {
    var html = bossVorschau(run.act) + '<h2>Wohin?</h2><div class="karten">';
    run.options.forEach(function (o, i) {
      var klasse = o.type === 'boss' ? 'karte boss' : o.type === 'elite' ? 'karte elite' : 'karte';
      var unter = o.encounter ? gegnerVorschau(o.encounter)
        : o.type === 'shop' ? 'Einheiten, Ausrüstung, Relikte kaufen'
        : o.type === 'lager' ? 'Gold, Magicule oder eine Einheit stärken'
        : 'Unbekannter Ausgang';
      var tipText = o.encounter
        ? gegnerDetails(o.encounter) +
          (o.type === 'elite' ? '\n\nElite: härter, würfelt Belohnungen aber eine Stufe besser.' : '') +
          (o.type === 'boss' ? '\n\nBoss: Abschluss des Akts. Widersteht Erstarrung zu 60 %.' : '') +
          '\n\nVerlierst du, kostet das ein Leben und der Knoten wird neu ausgewürfelt.'
        : o.type === 'shop' ? 'Kaufen mit Gold: Einheiten, Ausrüstung, meist ein Relikt.'
        : o.type === 'lager' ? 'Ein Bonus zur Wahl: Gold, Magicule oder dauerhafte Werte für eine zufällige Einheit.'
        : 'Ein Ereignis mit zwei bis drei Optionen. Was dabei herauskommt, steht an der Option.';
      html += '<button class="' + klasse + '" data-a="knoten" data-i="' + i + '"' +
        tip(o.name, tipText) + '>' +
        '<span class="titel">' + esc(o.name) + '</span>' +
        '<span class="unter">' + esc(TYP_TEXT[o.type] || o.type) + ' · ' + esc(unter) + '</span></button>';
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
    return html + '</div><p class="hinweis">' + esc(R.bedrohung(run.threat).name) + ' — ' +
      esc(R.bedrohung(run.threat).text) + '</p>';
  }

  function zeichneStart() {
    var w = run.startwahl;
    var html = stufenHtml() + bossVorschau(1) + '<h2>Wer zieht mit dir los?</h2>' +
      '<p class="hinweis">Noch ' + w.verbleibend + ' Wahl' + (w.verbleibend === 1 ? '' : 'en') +
      '. Der ganze Trupp ist deine Entscheidung. ' +
      'Von jeder Art kommt nur eine Einheit mit.</p><div class="karten">';
    w.offers.forEach(function (id, i) {
      var u = GD.unit(id), sig = AB.get(u.signature);
      html += '<button class="karte" data-a="start" data-i="' + i + '"' +
        belohnungTip({ kind: 'unit', id: id }) + '>' +
        artHtml('unit') + '<span class="titel">' + esc(u.name) + '</span>' +
        '<span class="unter">' + esc(GD.artName(u.art)) + ' · ' + esc(GD.rolleName(u.tags[1])) +
        ' · ' + esc(sig.name) + '</span>' +
        '<span class="unter">' + esc(sig.text) + '</span></button>';
    });
    return $('view').innerHTML = html + '</div>';
  }

  /* -------------------------------------------------------------- Kampf */

  function starteReplay(res) {
    replay = { res: res, i: 0, u: {}, zeilen: [], fertig: false, timer: null };
    res.roster.forEach(function (r) {
      replay.u[r.key] = { name: r.name, side: r.side, hp: r.maxHp, maxHp: r.maxHp, status: {}, tot: false };
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
    if (l.type === 'schild' && u) { u.status.schild = Math.max(0, (u.status.schild || 0) - l.amount); }

    var text = null, klasse = l.side === 'player' ? 'feind' : 'spieler';
    if (l.type === 'hit') text = esc(l.source) + ' → ' + esc(l.target) + ': ' + l.dmg;
    else if (l.type === 'heal') text = esc(l.source) + ' heilt ' + esc(l.target) + ' um ' + l.amount;
    else if (l.type === 'status') text = esc(l.target) + ': ' + (STATUS_NAMEN[l.status] || l.status) + ' ' + l.stacks;
    else if (l.type === 'schild') text = esc(l.target) + ': Schild fängt ' + l.amount;
    else if (l.type === 'skip') text = esc(l.unit) + ' kann sich nicht rühren';
    else if (l.type === 'widersteht') text = esc(l.target) + ' schüttelt die Erstarrung ab';
    else if (l.type === 'revive') text = esc(l.unit) + ' steht wieder auf';
    else if (l.type === 'aktiv') { text = '⚡ ' + esc(l.unit) + ' setzt ' + esc(l.name) + ' ein';
                                   klasse = (l.side === 'player' ? 'spieler' : 'feind') + ' aktiv'; }
    else if (l.type === 'death') { text = esc(l.unit) + ' fällt'; klasse = 'tod'; }
    if (text) replay.zeilen.push('<div class="' + klasse + '">' + text + '</div>');
    if (replay.zeilen.length > 140) replay.zeilen.shift();
  }

  function kaempferHtml(u) {
    var marken = Object.keys(u.status).filter(function (k) { return u.status[k] > 0; })
      .map(function (k) {
        return '<span class="marke ' + k + '"' + tip(STATUS_NAMEN[k] || k, G.zustaende[k]) + '>' +
          (STATUS_NAMEN[k] || k) + ' ' + Math.round(u.status[k]) + '</span>';
      }).join('');
    var pct = Math.max(0, Math.round(u.hp / u.maxHp * 100));
    return '<div class="kaempfer' + (u.tot ? ' tot' : '') + (u.side === 'enemy' ? ' feind' : '') + '">' +
      '<div class="zeile"><span>' + esc(u.name) + '</span><span>' + Math.max(0, u.hp) + '/' + u.maxHp + '</span></div>' +
      '<div class="balken"><i style="width:' + pct + '%"></i></div>' +
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

  function belohnungTip(r) {
    if (r.kind === 'unit') {
      var u = GD.unit(r.id), sig = AB.get(u.signature);
      var txt = GD.artName(u.art) + ' · ' + GD.rolleName(u.tags[1]) + '\n' +
        (G.rollen[u.tags[1]] || '') + '\n\n' +
        'Signatur: ' + sig.name + ' (Abklingzeit ' + sig.cd + ') — ' + sig.text + '\n' +
        'Passive ab Rang B/A/S: ' + u.passives.map(function (id) {
          var p2 = AB.get(id); return p2.name + ' (' + p2.text + ')';
        }).join(' · ');
      return tip(u.name, txt);
    }
    if (r.kind === 'relic') {
      var rel = GD.relic(r.id);
      return tip(rel.name, rarZeile(rel.rarity, 'Relikt') +
        'Wirkt auf den ganzen Trupp, den ganzen Run.\n' + rel.text +
        (rel.bedingung ? '\n\n' + (rel.bedingung(run)
          ? '✓ Bedingung ist mit deinem jetzigen Trupp erfüllt.'
          : '✗ Mit deinem jetzigen Trupp wirkungslos — erst sinnvoll, wenn die Bedingung zutrifft.') : ''));
    }
    if (r.kind === 'item') {
      var it = GD.item(r.id);
      return tip(it.name, rarZeile(it.rarity, 'Ausrüstung') +
        'Landet im Beutel und wird einer Einheit angelegt.\n' + (it.text || ''));
    }
    if (r.kind === 'rang') {
      return tip('Namensweihe', 'Hebt die oben gewählte Einheit einen Rang — ohne Magicule.\n\n' +
        G.begriffe.rang);
    }
    return tip('Vorräte', G.begriffe.gold + '\n\n' + G.begriffe.magicule);
  }

  function ergebnisHtml(p) {
    var html = '';
    if (p.result.winner === 'player') {
      html += '<p class="gut">Sieg! +' + p.gold + ' Gold, +' + R.ertrag(25 + R.inhaltsStufe(run) * 15) + ' Magicule.</p>';
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
      if (p.rewards) {
        html += '<h3>Belohnung wählen</h3><div class="karten">';
        p.rewards.forEach(function (r, i) {
          var geht = r.kind !== 'unit' || R.freieArt(run, GD.unit(r.id).art);
          html += '<button class="karte" data-a="belohnung" data-i="' + i + '"' + (geht ? '' : ' disabled') +
            belohnungTip(r) + '>' +
            artHtml(r.kind) + (r.kind === 'unit' ? '' : rarHtml(r.rarity)) + bedingungHtml(r) + '<span class="titel">' + esc(r.name) + '</span>' +
            '<span class="unter">' + esc(r.text || '') + (geht ? '' : ' — Art schon besetzt') + '</span></button>';
        });
        html += '</div>';
      }
    } else {
      html += '<p class="schlecht">Niederlage. Ein Leben verloren — ' + run.lives + ' übrig.</p>';
    }
    if (!p.rewards) html += '<div class="reihe"><button class="haupt" data-a="weiter">Weiter</button></div>';
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

  function zeichneShop() {
    var html = '<h2>Händler</h2><p class="hinweis">Gold: ' + run.gold + '</p>';
    if (run.pending.offers.some(function (o) { return o.kind === 'rang' && !o.sold; })) {
      var kandidaten = run.team.filter(function (m) { return m.rank < 3; });
      html += '<div class="reihe"><span class="hinweis">Namensweihe für:</span>' +
        '<select id="rang-ziel">' + kandidaten.map(function (m) {
          return '<option value="' + m.uid + '">' + esc(GD.unit(m.id).name) + ' (' +
            R.rankName(m) + ' → ' + R.RANK_NAME[m.rank + 1] + ')</option>';
        }).join('') + '</select></div>';
    }
    html += '<div class="karten">';
    run.pending.offers.forEach(function (o, i) {
      var frei = o.kind !== 'unit' || R.freieArt(run, GD.unit(o.id).art);
      if (o.kind === 'rang') frei = run.team.some(function (m) { return m.rank < 3; }) && !run.wahl;
      var geht = !o.sold && run.gold >= o.price && frei;
      html += '<button class="karte' + (o.sold ? ' gewaehlt' : '') + '" data-a="kaufen" data-i="' + i + '"' +
        (geht ? '' : ' disabled') + belohnungTip(o) + '>' + artHtml(o.kind) +
        (o.kind === 'unit' ? '' : rarHtml(o.rarity)) + bedingungHtml(o) +
        '<span class="titel">' + esc(o.name) + ' — ' + o.price + ' 🪙' + (o.sold ? ' (gekauft)' : '') + '</span>' +
        '<span class="unter">' + esc(o.text || '') + (frei ? '' : ' — Art schon besetzt') + '</span></button>';
    });
    html += '</div><div class="reihe"><button class="haupt" data-a="weiter">Weiterziehen</button></div>';
    $('view').innerHTML = html;
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

  function zeichneLager() {
    var html = '<h2>Lager</h2>';
    if (!run.pending.done) {
      html += '<p>Ihr schlagt die Zelte auf. Was ist jetzt am wichtigsten?</p><div class="karten">' +
        '<button class="karte" data-a="lager" data-i="0"' + tip('Vorräte verkaufen', G.begriffe.gold) +
        '><span class="titel">Vorräte verkaufen</span><span class="unter">+60 Gold</span></button>' +
        '<button class="karte" data-a="lager" data-i="1"' + tip('Meditieren', G.begriffe.magicule) +
        '><span class="titel">Meditieren</span><span class="unter">+120 Magicule</span></button>' +
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

  function zeichneWahl() {
    if (!run.wahl) { $('wahl').innerHTML = ''; return; }
    var m = R.find(run, run.wahl.uid);
    var html = '<div class="wahlbox"><h3>Aufstieg: ' + esc(GD.unit(m.id).name) + ' — Rang ' + R.rankName(m) +
      '</h3><p class="hinweis">Eine neue aktive Fähigkeit für den freien Slot. ' +
      'Frei lassen heißt: der Prädator kann ihn später füllen.</p><div class="karten">';
    run.wahl.offers.forEach(function (id, i) {
      var a = AB.get(id);
      html += '<button class="karte" data-a="wahl" data-i="' + i + '"' +
        tip(a.name, rarZeile(a.rarity, 'aktive Fähigkeit') +
          'Abklingzeit ' + a.cd + ' Züge.\n' + a.text + '\n\n' +
          (a.keywords.length ? 'Schlüsselwörter: ' + a.keywords.map(kwName).join(', ') + '\n' +
            a.keywords.map(function (k) { return kwName(k) + ': ' + (G.keywords[k] || ''); }).join('\n')
            : 'Ohne Schlüsselwort — reiner Schaden.')) + '>' +
        artHtml('skill') + rarHtml(a.rarity) + '<span class="titel">' + esc(a.name) + ' · ' + a.cd + ' Züge</span>' +
        '<span class="unter">' + esc(a.text) + '</span></button>';
    });
    html += '</div><div class="reihe"><button data-a="wahl-skip">Slot frei lassen</button></div></div>';
    $('wahl').innerHTML = html;
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
    var kannAufsteigen = m.rank < 3 && run.magicules >= kosten && !run.wahl;
    var abs = R.abilities(m);
    var aktive = abs.filter(function (a) { return a.art === 'aktiv'; });
    var passive = abs.filter(function (a) { return a.art === 'passiv'; });

    var html = '<div class="einheit' + (aufBank ? ' bank' : '') + '" data-uid="' + m.uid + '">' +
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

    function kwZeile(a) {
      if (!a.keywords || !a.keywords.length) return '';
      return '\n\nSchlüsselwörter: ' + a.keywords.map(kwName).join(', ') + '\n' +
        a.keywords.map(function (k) { return kwName(k) + ': ' + (G.keywords[k] || ''); }).join('\n');
    }
    html += '<div class="faehigkeiten">';
    aktive.forEach(function (a, ix) {
      var art = (ix === 0 ? 'Signatur' : 'Aktive Fähigkeit');
      html += '<div class="fk aktiv rar-text-' + (a.rarity || 1) + '"' +
        tip(a.name + ' · ' + art, rarZeile(a.rarity, art) +
          (ix === 0 ? G.begriffe.signatur + '\n\n' : '') +
          G.begriffe.aktiv + '\n\nAbklingzeit: ' + a.cd + ' eigene Züge.\nWirkung: ' + a.text +
          kwZeile(a)) + '>⚡ ' + esc(a.name) + ' <span class="cd">' + a.cd + '</span></div>';
    });
    for (var i = aktive.length; i < R.aktivSlots(m); i++) {
      html += '<div class="fk leer"' + tip('Freier Slot',
        'Hier passt noch eine aktive Fähigkeit hinein — aus dem Angebot beim nächsten Aufstieg ' +
        'oder über den Prädator.') + '>⚡ freier Slot</div>';
    }
    passive.forEach(function (a) {
      html += '<div class="fk passiv rar-text-' + (a.rarity || 1) + '"' +
        tip(a.name + ' · Passiv', rarZeile(a.rarity, 'passive Fähigkeit') +
          G.begriffe.passiv + '\n\nWirkung: ' + a.text + kwZeile(a)) +
        '>◈ ' + esc(a.name) + '</div>';
    });
    var naechste = basis.passives[R.passivSlots(m)];
    if (naechste && m.rank < 3) {
      var np = AB.get(naechste);
      html += '<div class="fk leer"' + tip('Noch verschlossen: ' + np.name,
        'Schaltet mit dem Aufstieg auf Rang ' + R.RANK_NAME[m.rank + 1] + ' frei.\nWirkung: ' + np.text) +
        '>◈ ' + esc(np.name) + ' (Rang ' + R.RANK_NAME[m.rank + 1] + ')</div>';
    }
    m.devoured.slice(0, R.praedatorSlots(m)).forEach(function (eid) {
      var e = EN.get(eid);
      (e.effects || []).forEach(function (ab) {
        html += '<div class="fk praedator"' +
          tip(ab.name, (ab.text || '') + kwZeile(ab) + '\n\nVerschlungen von ' + e.name + '.') +
          '>🍽 ' + esc(ab.name) + '</div>';
      });
    });
    html += '</div>';

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
    html += '<button data-a="entlassen" data-uid="' + m.uid + '">Entlassen</button>';
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
    if (extra.length) html += '<p class="dbg-extra">' + esc(extra.join(' · ')) + '</p>';

    html += '<p class="dbg-extra">⚡ ' + (k.actives.map(function (x) {
      return esc(x.name) + ' (' + x.cd + ')';
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

  function zeichneUnten() {
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
      aufstellungHtml() +
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
        return '<span class="chip rar-rand-' + it.rarity + '"' +
          tip(it.name, rarZeile(it.rarity, 'Ausrüstung') + (it.text || '')) + '>' + esc(it.name) +
          ' <button data-a="anlegen" data-id="' + id + '">anlegen</button></span>';
      }).join('') + '</div>';

    $('reliktliste').innerHTML = !run.relics.length ? '' :
      '<h3>Relikte</h3><div class="liste">' + run.relics.map(function (id) {
        var r = GD.relic(id);
        var wirkt = !r.bedingung || r.bedingung(run);
        return '<span class="chip rar-rand-' + r.rarity + (wirkt ? '' : ' schlaeft') + '"' +
          tip(r.name, rarZeile(r.rarity, 'Relikt') +
            'Wirkt auf den ganzen Trupp, den ganzen Run.\n' + r.text +
            (r.bedingung ? '\n\n' + (wirkt ? '✓ Bedingung erfüllt.'
              : '✗ Schläft gerade — die Bedingung trifft auf deinen Trupp nicht zu.') : '')) + '>' +
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
    else if (run.phase === 'shop') zeichneShop();
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
    belohnung: function (d) { R.takeReward(run, +d.i); render(); speichern(); },
    devour: function (d) {
      var ziel = $('devour-ziel');
      R.devour(run, d.id, ziel ? ziel.value : run.team[0].uid);
      render(); speichern();
    },
    weiter: function () { R.advance(run); replay = null; render(); speichern(); },
    stufe: function (d) {
      var neu = Math.min(+d.i, run.meta.threat || 0);
      run.meta.threatGewaehlt = neu;
      R.saveMeta(run.meta);
      /* Die Stufe greift beim Start — also den Run neu aufsetzen. */
      run = R.create(Math.floor(Math.random() * 0xffffffff), run.meta);
      render(); speichern();
    },
    start: function (d) { R.chooseStart(run, +d.i); render(); speichern(); },
    kaufen: function (d) {
      var ziel = $('rang-ziel');
      R.buy(run, +d.i, ziel ? ziel.value : null);
      render(); speichern();
    },
    event: function (d) { R.eventChoose(run, +d.i); render(); speichern(); },
    lager: function (d) { R.camp(run, +d.i); render(); speichern(); },
    aufstieg: function (d) { R.rankUp(run, d.uid); render(); speichern(); },
    wahl: function (d) { R.chooseActive(run, +d.i); render(); speichern(); },
    'wahl-skip': function () { R.skipActive(run); render(); speichern(); },
    platz: function (d) {
      if (!tauschUid || tauschUid === d.uid) tauschUid = tauschUid === d.uid ? null : d.uid;
      else { R.swap(run, tauschUid, d.uid); tauschUid = null; speichern(); }
      render();
    },
    vor: function (d) { R.move(run, d.uid, -1); render(); speichern(); },
    zurueck: function (d) { R.move(run, d.uid, 1); render(); speichern(); },
    bank: function (d) { R.bench(run, d.uid); render(); speichern(); },
    einsetzen: function (d) { R.deploy(run, d.uid); render(); speichern(); },
    entlassen: function (d) {
      var m = R.find(run, d.uid);
      if (m && confirm(GD.unit(m.id).name + ' entlassen? Die Art wird dadurch wieder frei.')) {
        R.entlassen(run, d.uid); render(); speichern();
      }
    },
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

  function neuerRun() {
    var meta = R.loadMeta();
    R.clear();
    run = R.create(Math.floor(Math.random() * 0xffffffff), meta);
    replay = null;
    $('menu').close();
    render();
    speichern();
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
    $('btn-menu').addEventListener('click', function () {
      $('menu-info').textContent = 'Runs: ' + run.meta.runs + ' · Siege: ' + run.meta.wins +
        ' · freigeschaltet: ' + run.meta.unlockedUnits.length + ' Einheiten, ' +
        run.meta.unlockedRelics.length + ' Relikte.';
      $('menu-glossar').innerHTML = glossarHtml();
      $('menu-chronik').innerHTML = run.chronik.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('');
      $('menu').showModal();
    });
    render();
  }

  root.UI = { start: start, aktueller: function () { return run; }, render: render };
})(globalThis);
