const d = require("./cahier.json"), fs = require("fs");
let out = `/* =====================================================================
   CAHIER DE PROBLÈMES — cahier.js
   Les problèmes du cahier d'évaluation d'Échecs et Mad (800 à 1300 Elo), dans l'ordre du cahier.
   n      : numéro dans le cahier imprimé (le 21, erroné, est absent)
   elo    : palier de la page
   fen    : position (pièces, trait, roques, prise en passant)
   lines  : la ou les suites du corrigé, coup par coup (départ + arrivée) ; le premier coup est celui de l'élève
   theme  : ce que la suite obtient, affiché une fois le problème résolu
   ===================================================================== */
window.CAHIER_PROBLEMES = [
`;
out += d.map(p => "  " + JSON.stringify(p)).join(",\n") + "\n];\n";
fs.writeFileSync(process.argv[2], out);
