// Fabrique la liste des répliques à enregistrer à partir de bot.js (pour rester synchronisé avec le code).
const fs = require("fs");
const src = fs.readFileSync("bot.js", "utf8");
const grab = name => { const m = new RegExp("const " + name + " = (\\{[\\s\\S]*?\\n  \\});").exec(src); return eval("(" + m[1] + ")"); };
const SAY = grab("SAY"), TIPS = grab("TIPS"), VOICE = grab("VOICE");
const WHEN = {
  youStart: "Début de partie, quand l'enfant commence", iStart: "Début de partie, quand Mad commence",
  thinking: "Pendant que Mad réfléchit (une fois sur trois)", yourTurn: "Après le coup de Mad (une fois sur trois)",
  iCapture: "Mad vient de capturer une pièce", youCapture: "L'enfant vient de capturer une pièce de Mad",
  iWin: "Mad a gagné", youWin: "L'enfant a gagné", draw: "Partie nulle", pat: "Exercices de mat : pat", mated: "Exercices de mat : l'enfant a fait mat", place: "Mad vient de poser une pièce (Mousquetaires, une fois sur trois)",
  hint: "Défis : Mad montre un indice", noHint: "Défis : aucun chemin possible depuis cette position",
  solo: "Défis : début", soloWin: "Défis : réussi", soloStuck: "Défis : bloqué",
  levelUp: "Sanglier : le sanglier s'est échappé, on passe au niveau suivant"
};
let md = "# La voix de Mad\n\nEnregistrements facultatifs. Un fichier mp3 par réplique, déposé dans ce dossier, puis déclaré dans `liste.js` (son nom, sans « .mp3 »).\nTant qu'un fichier n'est pas dans `liste.js`, la réplique reste simplement écrite à l'écran.\n\n" +
  "Conseils d'enregistrement (Audacity) : mono, 44 100 Hz, export MP3 128 kbit/s ; couper les silences au début et à la fin ; même distance du micro et même volume pour toutes les répliques (Effet > Normaliser à -1 dB).\n\n| Fichier | Phrase à dire | Moment |\n|---|---|---|\n";
let n = 0; const names = [];
for (const k of Object.keys(WHEN)) SAY[k].forEach((t, i) => { const f = VOICE[k] + "-" + (i + 1) + ".mp3"; names.push(f); md += "| `" + f + "` | " + t + " | " + (i ? "" : WHEN[k]) + " |\n"; n++; });
const MODE = { pions: "Bataille de pions", fous: "Les pions contre les fous", opposition: "Duel des rois", dalton: "Lucky Luke contre les Dalton", loup: "Loup dans la bergerie", sanglier: "Sanglier contre chasseur", mousquetaires: "Les 4 Mousquetaires", mat: "Exercices de mat", classique: "Partie classique" };
for (const k of Object.keys(TIPS)) { const f = "astuce-" + k + ".mp3"; names.push(f); md += "| `" + f + "` | " + TIPS[k] + " | Début de partie : " + MODE[k] + " |\n"; n++; }
md += "\n" + n + " répliques. Les répliques de routine (« Je réfléchis », « À toi », « Je pose une pièce ») ne sont dites qu'une fois sur trois pour ne pas lasser.\n\nUn bouton « Voix » sur la carte de Mad permet de couper le son.\n";
fs.writeFileSync("voix/LISEZMOI.md", md);
fs.writeFileSync(process.argv[2], names.join("\n") + "\n");
console.log(md);
