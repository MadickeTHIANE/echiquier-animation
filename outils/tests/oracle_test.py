import sys, json
from playwright.sync_api import sync_playwright
JS = r"""
async (args) => {
  const E = window.Echiquier, B = window.EchiquierBot;
  E.setMode(args.mode, args.v);
  const t0 = performance.now();
  if (!B.solveExact(5e6, 300000)) return {err: "oracle"};
  const oracle = B.exact.table; B.exact.table = new Map(); B.exact.id = "";
  const out = {oracleStates: oracle.size, oracleMs: Math.round(performance.now()-t0), games: []};
  const st0 = oracle.get(B.bareKey()); out.start = st0;
  const other = c => c === "w" ? "b" : "w";
  for (let n = 0; n < args.games; n++) {
    E.newGame(); B.exact.table = new Map(); B.exact.id = "";
    const log = []; let worst = 0, bad = null;
    for (let ply = 0; ply < 200; ply++) {
      const g = E.state().game; if (g.phase === "over") break;
      let a;
      if (g.turn === args.bot) {
        const before = oracle.get(B.bareKey());
        const t = performance.now(); a = B.chooseAction(3); worst = Math.max(worst, performance.now()-t);
        E.doAction(a);
        const g2 = E.state().game;
        if (g2.phase !== "over") {
          const after = oracle.get(B.bareKey());
          if (before[args.bot] >= 0 && after[args.bot] < 0 && !bad) bad = {ply, a, before, after};      // a lâché le gain
          if (before[other(args.bot)] < 0 && after[other(args.bot)] >= 0 && !bad) bad = {ply, a, before, after, lost: true};
        }
        log.push(a.from + a.to);
        continue;
      }
      // adversaire : parfait (résiste le plus longtemps / gagne au plus vite), ou au hasard
      const acts = E.sim.actions(); const me = g.turn, opp = other(me);
      if (args.opp === "random" || (args.opp === "mixed" && Math.random() < 0.5)) a = acts[Math.floor(Math.random()*acts.length)];
      else {
        let best = -Infinity;
        for (const x of acts) {
          const keep = E.sim.save(); E.sim.apply(x); const gg = E.state().game; let v;
          if (gg.phase === "over") v = gg.result.winner === me ? 1e6 : gg.result.winner ? -1e6 : 0;
          else { const e = oracle.get(B.bareKey()); v = e[me] >= 0 ? 1e5 - e[me] : e[opp] >= 0 ? -1e5 + e[opp] : 0; }
          E.sim.load(keep);
          if (v > best) { best = v; a = x; }
        }
      }
      E.doAction(a); log.push(a.from + a.to);
    }
    const g = E.state().game;
    out.games.push({winner: g.result ? g.result.winner : "?", reason: g.result && g.result.reason, plies: log.length, worstMs: Math.round(worst), bad, log: log.join(" ")});
  }
  return out;
}"""
cases = json.loads(sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.set_default_timeout(900000)
    pg.on("pageerror", lambda e: print("PAGEERROR", e))
    pg.goto("http://127.0.0.1:8765/?acces=complet")
    for c in cases:
        r=pg.evaluate(JS,c)
        print(c, "| oracle", r.get("oracleStates"), r.get("oracleMs"), "start", r.get("start"))
        for g in r.get("games",[]): print("   ", g["winner"], g["plies"], "plies, max", g["worstMs"], "ms", "BAD "+json.dumps(g["bad"]) if g["bad"] else "", "|", g["reason"], "|", g["log"][:150])
    b.close()
