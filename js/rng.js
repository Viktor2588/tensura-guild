/* js/rng.js — deterministischer RNG (mulberry32). Gleicher Seed = gleicher Run.
   f.state()   -> aktueller Zustand (für Speichern)
   f.state(v)  -> Zustand setzen (für Laden)                                  */
'use strict';
(function (root) {
  root.RNG = function (seed) {
    var a = seed >>> 0;
    function f() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    f.state = function (v) { if (v !== undefined) a = v >>> 0; return a; };
    return f;
  };

  /* Hilfen, die überall gebraucht werden — RNG-abhängig, damit alles am Seed hängt. */
  root.RNG.pick = function (rng, list) { return list[Math.floor(rng() * list.length)]; };
  root.RNG.sample = function (rng, list, n) {
    var pool = list.slice(), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  root.RNG.shuffle = function (rng, list) { return root.RNG.sample(rng, list, list.length); };
})(globalThis);
