const { Chess } = require("chess.js"); const fs = require("fs");
const me0 = "madou93"; const files = process.argv.slice(2);
const S = { n: 0, tc: {}, res: { w: [0, 0, 0], b: [0, 0, 0] }, elo: [], eco: { w: {}, b: {} }, first: {}, reply: {}, plies: 0, castle: { O: 0, OO: 0, none: 0, at: 0 }, qx: 0, term: {}, oppElo: 0, capt: 0, checks: 0, myMoves: 0, dates: [] };
const inc = (o, k) => o[k] = (o[k] || 0) + 1;
for (const f of files) for (const pgn of fs.readFileSync(f, "utf8").split(/\n\n+(?=\[Event )/)) {
  const tag = n => (new RegExp("\\[" + n + ' "([^"]*)"\\]').exec(pgn) || [])[1] || "";
  const me = tag("White").toLowerCase() === me0 ? "w" : tag("Black").toLowerCase() === me0 ? "b" : null;
  if (!me || tag("FEN") || (tag("Variant") && tag("Variant") !== "Standard")) continue;
  const g = new Chess(); try { g.loadPgn(pgn); } catch (e) { continue; }
  const h = g.history({ verbose: true }); if (h.length < 4) continue;
  S.n++; inc(S.tc, tag("TimeControl")); S.dates.push(tag("Date"));
  const r = tag("Result"), i = r === "1/2-1/2" ? 1 : (r === "1-0") === (me === "w") ? 0 : 2; S.res[me][i]++;
  S.elo.push(+tag(me === "w" ? "WhiteElo" : "BlackElo")); S.oppElo += +tag(me === "w" ? "BlackElo" : "WhiteElo");
  const name = (tag("ECOUrl").split("/openings/")[1] || tag("ECO")).split("-").slice(0, 3).join(" "); inc(S.eco[me], name);
  if (me === "w") inc(S.first, h[0].san); else inc(S.reply, h[0].san + " " + h[1].san);
  S.plies += h.length; inc(S.term, (i === 0 ? "G " : i === 1 ? "N " : "P ") + tag("Termination").replace(/^.*? (won|drawn) /, ""));
  let c = "none", q = false;
  h.forEach((m, k) => { if (m.color === me) { S.myMoves++; if (m.captured) S.capt++; if (m.san.includes("+")) S.checks++; if (m.san.startsWith("O-O-O")) { c = "O"; S.castle.at += k / 2; } else if (m.san.startsWith("O-O")) { c = "OO"; S.castle.at += k / 2; } }
    if (k < 40 && m.captured === "q") q = true; });
  inc(S.castle, c); if (q) S.qx++;
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0] + " (" + x[1] + ")").join(", ");
S.elo.sort((a, b) => a - b);
console.log("parties", S.n, "du", S.dates.sort()[0], "au", S.dates[S.dates.length - 1]);
console.log("cadences", top(S.tc, 5));
console.log("Elo min/médian/max", S.elo[0], S.elo[S.elo.length >> 1], S.elo[S.elo.length - 1], "| adversaires en moyenne", Math.round(S.oppElo / S.n));
console.log("Blancs G/N/P", S.res.w.join("/"), "| Noirs G/N/P", S.res.b.join("/"));
console.log("1er coup Blancs:", top(S.first, 5)); console.log("Noirs, réponse:", top(S.reply, 8));
console.log("ouvertures Blancs:", top(S.eco.w, 8)); console.log("ouvertures Noirs:", top(S.eco.b, 8));
console.log("longueur moyenne", Math.round(S.plies / S.n / 2), "coups | petit roque", S.castle.OO, "grand roque", S.castle.O, "sans roque", S.castle.none, "| roque au coup", (S.castle.at / (S.castle.OO + S.castle.O)).toFixed(1));
console.log("dames échangées avant le 20e coup:", S.qx, "| prises", (100 * S.capt / S.myMoves).toFixed(1) + "% des coups | échecs", (100 * S.checks / S.myMoves).toFixed(1) + "%");
console.log("fins:", top(S.term, 8));
