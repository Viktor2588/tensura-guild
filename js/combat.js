/* js/combat.js — Kampfauflösung. Reine Funktion, kein DOM, kein Math.random.
   simulate(teamA, teamB, seed, opts) -> { winner, ticks, log, survivors, roster }

   Ablauf eines Zuges: Statusschaden -> Abklingzeiten -> stärkste bereite aktive
   Fähigkeit einsetzen, sonst normaler Angriff.

   Einheiten kommen fertig aufgelöst rein (Rang, Items, Passive, Prädator hat
   run.js schon eingerechnet):
     { id, name, tags, hp, atk, def, spd, actives:[], effects:[], keywords:[] }

   Hooks der Passiven: onStart onTurnStart onHit onDamaged onKill onDeath onAllyDeath */
'use strict';
(function (root) {

  var TICK_CAP = 3000;                                   // Patt-Bremse
  /* Ohne Obergrenzen läuft alles davon, was pro Treffer stapelt. */
  var STATUS_CAP = { verderbnis: 5, gift: 12, brand: 8, erstarrung: 1 };
  var ROLES = ['front', 'fernkampf', 'magier', 'unterstuetzer', 'verstaerker'];

  function roleOf(u) {
    for (var i = 0; i < ROLES.length; i++) if (u.tags.indexOf(ROLES[i]) >= 0) return ROLES[i];
    return 'front';
  }

  function spawn(def, side, pos) {
    return {
      id: def.id, name: def.name, tags: def.tags.slice(), rank: def.rank || 0,
      key: (side === 'player' ? 'p' : 'e') + pos,
      hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def || 0, spd: def.spd,
      role: roleOf(def), effects: (def.effects || []).slice(),
      /* Abklingzeiten sind Zustand, nicht Daten — deshalb eine eigene Kopie. */
      actives: (def.actives || []).map(function (a) {
        return { id: a.id, name: a.name, cd: a.cd, fn: a.fn, bereit: 0 };
      }),
      keywords: (def.keywords || []).slice(), resistenz: def.resistenz || 0,
      side: side, pos: pos, gauge: 0, status: {}, regen: 0, lifesteal: 0,
      heilfaktor: 0, schildfaktor: 0,
      dmgTaken: 0, dmgDealt: 0
    };
  }

  function simulate(teamA, teamB, seed, opts) {
    opts = opts || {};
    var rng = root.RNG(seed);
    var log = [];
    var t = 0;
    var units = teamA.map(function (d, i) { return spawn(d, 'player', i); })
      .concat(teamB.map(function (d, i) { return spawn(d, 'enemy', i); }));

    function alive(u) { return u.hp > 0; }
    function living(s) { return units.filter(function (u) { return u.side === s && alive(u); }); }
    function team(s) { return units.filter(function (u) { return u.side === s; }); }
    function other(s) { return s === 'player' ? 'enemy' : 'player'; }

    /* ---- Grundoperationen ------------------------------------------------ */

    function deal(target, amount, source, opt) {
      if (!target || !alive(target)) return 0;
      opt = opt || {};
      var v = target.status.verderbnis || 0;
      amount = amount * (1 + v * 0.1);
      if (!opt.pure && target.status.schild > 0) {
        var absorbed = Math.min(target.status.schild, amount);
        target.status.schild -= absorbed;
        amount -= absorbed;
        if (absorbed >= 1) log.push({ t: t, type: 'schild', key: target.key, target: target.name, amount: Math.round(absorbed) });
        if (amount < 1) return 0;
      }
      amount = Math.max(1, Math.round(amount));
      target.hp = Math.max(0, target.hp - amount);
      target.dmgTaken += amount;
      log.push({ t: t, type: 'hit', key: target.key, target: target.name, side: target.side,
                 dmg: amount, source: source, hp: target.hp, maxHp: target.maxHp });
      if (alive(target)) fire(target, 'onDamaged', ctx(target, { amount: amount }));
      else die(target);
      return amount;
    }

    function die(u) {
      fire(u, 'onDeath', ctx(u, {}));
      if (alive(u)) return;                              // Wiederbelebung hat gegriffen
      log.push({ t: t, type: 'death', key: u.key, unit: u.name, side: u.side });
      /* Gefallene Verbündete sind Zustand, den Fähigkeiten abfragen dürfen. */
      living(u.side).forEach(function (a) {
        a._gefallen = 1;
        a._tote = (a._tote || 0) + 1;
        fire(a, 'onAllyDeath', ctx(a, { dead: u }));
      });
    }

    function heal(u, amount, source) {
      if (!u || !alive(u)) return 0;
      amount *= 1 + (u.heilfaktor || 0);                 // Verstärker für Heilungs-Builds
      if (u.status.brand > 0) amount *= 0.5;             // Brand halbiert Heilung
      amount = Math.max(0, Math.min(Math.round(amount), u.maxHp - u.hp));
      if (!amount) return 0;
      u.hp += amount;
      log.push({ t: t, type: 'heal', key: u.key, target: u.name, side: u.side,
                 amount: amount, source: source, hp: u.hp, maxHp: u.maxHp });
      return amount;
    }

    function applyStatus(target, key, stacks) {
      if (!target || !alive(target) || stacks <= 0) return;
      /* Bosse schütteln Erstarrung meist ab — sonst gewinnt Frost jeden
         Einzelkampf, indem er dem Gegner schlicht die Züge nimmt. */
      if (key === 'erstarrung' && target.resistenz && rng() < target.resistenz) {
        log.push({ t: t, type: 'widersteht', key: target.key, target: target.name,
                   side: target.side, status: key });
        return;
      }
      if (key === 'schild') stacks *= 1 + (target.schildfaktor || 0);
      target.status[key] = (target.status[key] || 0) + stacks;
      if (STATUS_CAP[key]) target.status[key] = Math.min(target.status[key], STATUS_CAP[key]);
      /* Schild verfällt nicht — ohne Deckel stapelt ein Schild-Trupp sich eine
         zweite Lebensleiste an und wird unkaputtbar. */
      if (key === 'schild') target.status.schild = Math.min(target.status.schild, target.maxHp * 0.6);
      log.push({ t: t, type: 'status', key: target.key, target: target.name, side: target.side,
                 status: key, stacks: Math.round(target.status[key]) });
    }

    function ctx(self, extra) {
      var c = {
        rng: rng, log: log, self: self, deal: deal, heal: heal, applyStatus: applyStatus,
        allies: function () { return living(self.side); },
        foes: function () { return living(other(self.side)); },
        addEffect: function (u, e) { u.effects.push(e); }
      };
      for (var k in extra) c[k] = extra[k];
      return c;
    }

    function fire(u, hook, c) {
      for (var i = 0; i < u.effects.length; i++) {
        if (u.effects[i].hook === hook) u.effects[i].fn(c);
      }
    }

    /* ---- Angriff: eine Stelle für normalen Schlag und Fähigkeitsschaden ---- */

    function angriff(u, target, mult, quelle, opt) {
      if (!target || !alive(target)) return 0;
      opt = opt || {};
      var pierce = Math.max(u.pierce || 0, opt.pierce || 0, u.role === 'magier' ? 0.6 : 0);
      var base = u.atk * (mult || 1) - target.def * (1 - pierce);
      var c = ctx(u, { attacker: u, target: target, dmg: base * (0.9 + rng() * 0.2) });
      fire(u, 'onHit', c);
      if (!alive(target)) return 0;
      var done = deal(target, c.dmg, quelle || u.name, { pure: !!u.durchschlag || !!opt.pure });
      u.dmgDealt += done;
      if (u.lifesteal > 0 && done) heal(u, done * u.lifesteal, 'Lebensraub');
      /* Wer den Gegner umlegt, darf das merken — Grundlage für Exekutions-Builds,
         die sich über den Kampf hinweg aufschaukeln. */
      if (target.hp <= 0) fire(u, 'onKill', ctx(u, { getoetet: target }));
      return done;
    }

    /* ---- Aufbau: nur noch Relikte, keine Arten-Synergien ------------------- */

    function setup(side) {
      var mine = team(side);
      var api = {
        rng: rng, log: log, units: mine,
        addEffect: function (u, e) { u.effects.push(e); }, ctx: ctx
      };
      if (side === 'player') {
        (opts.relics || []).forEach(function (r) { if (r && r.apply) r.apply(mine, api); });
      }
      mine.forEach(function (u) { fire(u, 'onStart', ctx(u, {})); });
    }
    setup('player');
    setup('enemy');

    var roster = units.map(function (u) {
      return { key: u.key, id: u.id, name: u.name, side: u.side, pos: u.pos,
               maxHp: u.maxHp, atk: u.atk, def: u.def, spd: u.spd, role: u.role,
               tags: u.tags.slice(), actives: u.actives.map(function (a) { return a.name; }) };
    });
    log.push({ t: 0, type: 'setup', roster: roster });

    /* ---- Zug -------------------------------------------------------------- */

    function pickTarget(u) {
      var foes = living(other(u.side));
      if (!foes.length) return null;
      if (u.role === 'fernkampf') return foes[foes.length - 1];               // Hinterreihe
      if (u.role === 'magier') {
        return foes.reduce(function (a, b) { return b.hp < a.hp ? b : a; });  // schwächstes Ziel
      }
      return foes[0];                                                         // Front
    }

    /* Von den bereiten Fähigkeiten die mit der längsten Abklingzeit — die ist
       in aller Regel die stärkste. */
    function waehleAktive(u) {
      var best = null;
      u.actives.forEach(function (a) {
        if (a.bereit <= 0 && (!best || a.cd > best.cd)) best = a;
      });
      return best;
    }

    function act(u) {
      fire(u, 'onTurnStart', ctx(u, {}));
      if (!alive(u)) return;

      if (u.status.gift > 0) { deal(u, u.status.gift * 2, 'Gift', { pure: true }); u.status.gift--; if (!alive(u)) return; }
      if (u.status.brand > 0) { deal(u, u.status.brand * 2, 'Brand', { pure: true }); u.status.brand--; if (!alive(u)) return; }
      if (u.status.verderbnis > 0) u.status.verderbnis--;
      if (u.regen > 0) heal(u, u.regen, 'Regeneration');
      u.actives.forEach(function (a) { if (a.bereit > 0) a.bereit--; });

      if (u.status.erstarrung > 0) {
        u.status.erstarrung--;
        log.push({ t: t, type: 'skip', key: u.key, unit: u.name, side: u.side });
        return;
      }

      var aktive = waehleAktive(u);

      /* Unterstützer heilen, wenn gerade keine Fähigkeit bereit ist. */
      if (u.role === 'unterstuetzer' && !aktive) {
        var hurt = living(u.side).filter(function (a) { return a.hp < a.maxHp; });
        if (hurt.length) {
          var worst = hurt.reduce(function (a, b) { return (b.hp / b.maxHp) < (a.hp / a.maxHp) ? b : a; });
          heal(worst, u.atk * 1.5, u.name);
          return;
        }
      }

      var target = pickTarget(u);
      if (!target) return;

      if (aktive) {
        aktive.bereit = aktive.cd;
        log.push({ t: t, type: 'aktiv', key: u.key, unit: u.name, side: u.side, name: aktive.name });
        aktive.fn(ctx(u, {
          attacker: u, target: target,
          /* aktive liegt im ctx, damit eine Fähigkeit ihre eigene Abklingzeit
             zurücksetzen kann (Milims Amoklauf). */
          aktive: aktive,
          attack: function (mult, tgt, opt) { return angriff(u, tgt || target, mult, aktive.name, opt); }
        }));
        return;
      }
      angriff(u, target, 1);
    }

    /* ---- Schleife --------------------------------------------------------- */

    while (t < TICK_CAP && living('player').length && living('enemy').length) {
      t++;
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        if (!alive(u)) continue;
        u.gauge += u.spd;
        if (u.gauge < 100) continue;
        u.gauge -= 100;
        act(u);
        if (!living('player').length || !living('enemy').length) break;
      }
    }

    var p = living('player').length, e = living('enemy').length;
    var winner = p && !e ? 'player' : e && !p ? 'enemy' : 'draw';
    log.push({ t: t, type: 'end', winner: winner });
    return {
      winner: winner, ticks: t, log: log, roster: roster,
      survivors: units.filter(alive).map(function (u) {
        return { id: u.id, name: u.name, hp: u.hp, maxHp: u.maxHp, side: u.side };
      }),
      fallen: units.filter(function (u) { return !alive(u); })
        .map(function (u) { return { id: u.id, name: u.name, side: u.side }; })
    };
  }

  root.Combat = { simulate: simulate, TICK_CAP: TICK_CAP, ROLES: ROLES, roleOf: roleOf,
                  STATUS_CAP: STATUS_CAP };
})(globalThis);
