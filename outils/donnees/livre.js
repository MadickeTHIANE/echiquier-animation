// À FAIRE en livrant le livre : dans bot.js, bookKey() doit rendre la même clé (retirer le champ « en passant »).
// Fabrique livre/mad.json à partir des parties PGN d'un joueur : pour chaque position des N premiers coups,
// les coups que CE joueur a joués, avec leur nombre. Usage : node livre.js <pseudo> <sortie.json> <fichiers.pgn…>
const { Chess } = require("chess.js");
const fs = require("fs");
const [pseudo, out, ...files] = process.argv.slice(2);
const MAX_PLY = 24, MIN_COUNT = 2;                       // 12 premiers coups ; un coup joué une seule fois est ignoré
const book = {}, stats = { games: 0, white: 0, black: 0, results: { w: [0, 0, 0], b: [0, 0, 0] }, skipped: 0 };
const key = fen => fen.split(" ").slice(0, 3).join(" ");   // pièces, trait, roques (sans la case en passant)
for (const f of files) {
  const games = fs.readFileSync(f, "utf8").split(/\n\n+(?=\[Event )/);
  for (const pgn of games) {
    const tag = n => (new RegExp("\\[" + n + ' "([^"]*)"\\]').exec(pgn) || [])[1] || "";
    if (tag("Variant") && tag("Variant") !== "Standard") { stats.skipped++; continue; }
    if (tag("SetUp") === "1" || tag("FEN")) { stats.skipped++; continue; }
    const me = tag("White").toLowerCase() === pseudo.toLowerCase() ? "w" : tag("Black").toLowerCase() === pseudo.toLowerCase() ? "b" : null;
    if (!me) { stats.skipped++; continue; }
    const g = new Chess();
    try { g.loadPgn(pgn); } catch (e) { stats.skipped++; continue; }
    const moves = g.history({ verbose: true });
    if (moves.length < 4) { stats.skipped++; continue; }
    stats.games++; stats[me === "w" ? "white" : "black"]++;
    const r = tag("Result"), i = r === "1/2-1/2" ? 1 : (r === "1-0") === (me === "w") ? 0 : 2;
    stats.results[me][i]++;
    moves.slice(0, MAX_PLY).forEach(m => {
      if (m.color !== me) return;
      const k = key(m.before), mv = m.from + m.to + (m.promotion || "");
      (book[k] = book[k] || {})[mv] = (book[k][mv] || 0) + 1;
    });
  }
}
const final = {};
for (const k in book) {
  const lines = Object.entries(book[k]).filter(([, n]) => n >= MIN_COUNT).sort((a, b) => b[1] - a[1]);
  if (lines.length) final[k] = lines;
}
fs.writeFileSync(out, JSON.stringify(final));
console.log(JSON.stringify(stats), "positions dans le livre :", Object.keys(final).length);
const start = final["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"];
console.log("premier coup avec les Blancs :", JSON.stringify(start));
