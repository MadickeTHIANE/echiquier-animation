// Convertit le cahier (FEN + corrigé en notation française) en données pour le site, en vérifiant chaque coup.
const { Chess } = require("chess.js"); const fs = require("fs");
const M = require("/home/claude/echiquier-animation/moteur.js");
const fens = {}; let level = 0; const levelOf = {};
for (const l of fs.readFileSync("../cahier/fen.txt", "utf8").split("\n")) {
  const p = /palier (\d+) Elo/.exec(l); if (p) level = +p[1];
  const m = /^\s*(\d+)\s+(\S+ [wb] \S+ \S+ \d+ \d+)/.exec(l); if (m) { fens[+m[1]] = m[2]; levelOf[+m[1]] = level; }
}
const SOL = { 1: "Dxf7#", 2: "Tb8#", 3: "Ta8#", 4: "Rg6+ Rg8 Dd8# | Rf7+ Rh7 Dh4#", 5: "Dxg7#", 6: "Ce5#", 7: "Dxb2#", 8: "g5#", 9: "Dg7#",
  10: "Da6#", 11: "Ce7+ Rh7 Txh5#", 12: "Ce2+ Rh1 Txh2+ Rxh2 Th8#", 13: "Fc5+ Rh1 Txf1#", 14: "Txf2", 15: "Cxg6#", 16: "Ch3+ Rh1 Dg1+ Txg1 Cf2#", 17: "Dg7#", 18: "Df4+ g3 Df2+ Dxf2 Txf2#",
  19: "Cg3+", 20: "Fc4+ Rg1 Td1", 22: "Txf2 Fxb1 Txd2", 23: "Cb6+", 24: "Df1+", 25: "Df7#", 26: "Da3# | Da5#", 27: "Ff4 Dxf4 Dxf4+",
  28: "Dh8+ Fxh8 Txh8+ Rg7 Txe8", 29: "Fc5+ Rf1 Fxa7", 30: "Fxh7+ Rxh7 Dxd4", 31: "Cf5+ Re4 Cxd6+", 32: "d6+ Dxa2 dxc7", 33: "Db6+ Rh1 Dxc6+", 34: "Txg7 Fxg7 Dg5+", 35: "Ce2+ Rh2 Cxg3", 36: "De1+ Rh2 Dg3+ Rh1 Dxg2#",
  37: "Dh3+ Th2 Dxf1#", 38: "Fxf7+ Rxf7 Dxc5", 39: "Re1", 40: "Fxe4 Fxe4 Dxd2", 41: "Txe8 Txe8 Dxf3", 42: "Txd3+ Rxd3 Rxf4 | Txd3+ Fxd3 Txf4", 43: "De4+ Rg5 Dg4#", 44: "Txd4 Fxd4 Cxc2", 45: "Dh1#",
  46: "Dd5+ Re7 Fg5", 47: "Tc6+ Rb3 Fxd3", 48: "Te8+ Rg7 Txc8", 49: "Cd6+ Rf8 Txb7", 50: "Txg3+ fxg3 Dxg3 Rh1 Dxh2#", 51: "Txf8+ Rxf8 Dxf6+", 52: "Cf3+ Rh1 Th2#", 53: "Txc5 Txc5 Fd4+", 54: "Ch5 Tg8 Cxf6" };
const THEME = { 4: "mat en 2", 11: "mat en 2", 12: "mat en 3", 13: "mat en 2", 14: "gagnant, mat à terme", 16: "mat en 3", 18: "mat en 3", 19: "gagnant, mat à terme", 20: "gain de matériel", 22: "gain de matériel", 23: "gagnant, mat à terme", 24: "gagnant, mat à terme", 27: "gain décisif",
  28: "gain de matériel", 29: "avantage net", 30: "gain de matériel", 31: "gain de matériel", 32: "gain de matériel", 33: "avantage net", 34: "avantage net", 35: "gain de matériel", 36: "mat en 3", 37: "mat en 2", 38: "gain de matériel", 39: "gagnant, mat à terme", 40: "gain de matériel", 41: "gain de matériel", 42: "gain de matériel", 43: "mat en 2", 44: "avantage net",
  46: "gain de matériel", 47: "gain de matériel", 48: "gain de matériel", 49: "gain de matériel", 50: "mat en 3", 51: "gain de matériel", 52: "mat en 2", 53: "gain de matériel", 54: "gain de matériel" };
const FR = { R: "K", D: "Q", T: "R", F: "B", C: "N" };
const en = s => s.replace(/^[RDTFC]/, c => FR[c]);
const out = [], problems = [];
for (const n of Object.keys(fens).map(Number).sort((a, b) => a - b)) {
  const lines = [];
  for (const alt of SOL[n].split(" | ")) {
    const g = new Chess(fens[n]), line = [];
    for (const tok of alt.split(" ")) {
      let mv = null;
      for (const cand of [en(tok), en(tok).replace("x", ""), en(tok).replace(/[+#]/g, ""), en(tok).replace("x", "").replace(/[+#]/g, "")]) { try { mv = g.move(cand); } catch (e) { mv = null; } if (mv) break; }
      if (!mv) { problems.push(n + ": coup illégal « " + tok + " » dans " + alt); break; }
      const wantMate = tok.includes("#"), wantCheck = tok.includes("+") || wantMate;
      if (wantMate !== g.isCheckmate()) problems.push(n + ": « " + tok + " » " + (g.isCheckmate() ? "fait mat (non signalé)" : "n'est pas mat"));
      else if (wantCheck !== g.isCheck()) problems.push(n + ": « " + tok + " » " + (g.isCheck() ? "fait échec (non signalé)" : "ne fait pas échec"));
      if (tok.includes("x") !== !!mv.captured) problems.push(n + ": « " + tok + " » " + (mv.captured ? "est une prise" : "n'est pas une prise"));
      line.push(mv.from + mv.to + (mv.promotion || ""));
    }
    lines.push(line);
  }
  // Avis du moteur : le premier coup du corrigé est-il le meilleur, et de combien ?
  M.setFen(fens[n]); const r = M.think({ ms: 1500, exact: true });
  const firsts = lines.map(l => l[0]); const best = r.moves[0], mine = r.moves.find(m => firsts.includes(m.from + m.to + (m.promo ? m.promo.toLowerCase() : "")));
  const others = r.moves.filter(m => !firsts.includes(m.from + m.to)).slice(0, 1)[0];
  const fmt = v => Math.abs(v) > 29000 ? (v > 0 ? "mat" : "-mat") : (v / 100).toFixed(1);
  let flag = "";
  if (!mine) flag = "COUP DU CORRIGÉ INTROUVABLE";
  else if (!firsts.includes(best.from + best.to)) flag = "le moteur préfère " + best.from + best.to + " (" + fmt(best.score) + ") au corrigé (" + fmt(mine.score) + ")";
  else if (others && mine.score - others.score < 150 && !(mine.score > 29000 && others.score < 29000)) flag = "autre coup presque aussi bon : " + others.from + others.to + " (" + fmt(others.score) + " contre " + fmt(mine.score) + ")";
  if (mine && mine.score < 150) flag += (flag ? " ; " : "") + "le corrigé ne donne qu'un avantage de " + fmt(mine.score);
  if (flag) problems.push(n + " (" + SOL[n] + ") : " + flag);
  out.push({ n, elo: levelOf[n], fen: fens[n].split(" ").slice(0, 4).join(" "), lines, theme: THEME[n] || "mat en 1" });
}
fs.writeFileSync("cahier.json", JSON.stringify(out));
console.log(out.length, "problèmes"); console.log(problems.join("\n"));
