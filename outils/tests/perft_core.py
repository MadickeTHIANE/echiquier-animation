from playwright.sync_api import sync_playwright
JS=r"""
([fen, depth]) => {
  const E = window.Echiquier; E.setMode("classique");
  const [rows, turn, c, e] = fen.split(" "); const model = {};
  rows.split("/").forEach((row, i) => { let f = 0; for (const ch of row) { if (ch >= "1" && ch <= "8") { f += +ch; continue; }
    model["abcdefgh"[f] + (8 - i)] = { kind: "std", code: (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase() }; f++; } });
  const s = E.sim.save(); s.model = model; s.game.turn = turn; s.game.castle = c === "-" ? "" : c; s.game.ep = e === "-" ? null : e; s.game.rep = {}; s.game.quiet = 0;
  E.sim.load(s);
  const perft = d => { if (d === 0) return 1; const g = E.state().game; if (g.phase === "over") return 0; let n = 0;
    for (const a of E.sim.actions()) { const keep = E.sim.save(); E.sim.apply(a); n += perft(d - 1); E.sim.load(keep); } return n; };
  const t = performance.now(); const n = perft(depth); E.newGame(); return [n, Math.round(performance.now() - t)];
}"""
T=[["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",3,8902],
["r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -",3,97862],
["8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -",4,43238],
["r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -",3,9467],
["rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ -",3,62379]]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.set_default_timeout(900000); pg.on('pageerror', lambda e: print('ERR',e))
    pg.goto("http://127.0.0.1:8766/index.html")
    for f,d,n in T:
        r=pg.evaluate(JS,[f,d]); print("OK" if r[0]==n else "FAUX", r, n)
    b.close()
