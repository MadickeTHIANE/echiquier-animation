import sys, json
from playwright.sync_api import sync_playwright
JS = r"""
(args) => {
  const E = window.Echiquier, B = window.EchiquierBot;
  E.setMode(args.mode, args.v);
  const res = [];
  for (let n = 0; n < args.games; n++) {
    E.newGame(); const log = []; let worst = 0;
    for (let ply = 0; ply < 120; ply++) {
      const g = E.state().game; if (g.phase === "over") break;
      const lv = g.turn === "w" ? args.w : args.b; let a;
      if (lv === 0) { const acts = E.sim.actions(); a = acts[Math.floor(Math.random()*acts.length)]; }
      else { const t = performance.now(); a = B.chooseAction(lv); worst = Math.max(worst, performance.now()-t); }
      // pièce posée en prise ?
      E.doAction(a);
      log.push(a.t === "place" ? a.type + "@" + a.to : a.from + a.to);
    }
    const g = E.state().game;
    res.push({w: g.result ? g.result.winner : "?", reason: g.result ? g.result.reason : "", worst: Math.round(worst), log: log.join(" ")});
  }
  return res;
}"""
cases = json.loads(sys.argv[1])
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.set_default_timeout(900000)
    pg.on("pageerror", lambda e: print("PAGEERROR", e))
    pg.goto("http://127.0.0.1:8765/?acces=complet")
    for c in cases:
        print(c)
        for g in pg.evaluate(JS,c): print("   ", g["w"], "max", g["worst"], "ms |", g["reason"][:70], "|", g["log"][:230])
    b.close()
