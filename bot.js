/* =====================================================================
   MAD, LE BOT — Échiquier d'animation (Échecs et Mad)

   Un adversaire automatique pour tous les modes de jeu arbitrés.
   Il réfléchit en essayant des coups à l'avance (recherche minimax) à partir
   des mêmes règles que le jeu : aucune règle n'est réécrite ici.

   Trois niveaux :
   - facile : regarde un coup à l'avance et se trompe souvent, exprès ;
   - moyen  : regarde trois coups à l'avance, avec un peu de fantaisie ;
   - fort   : cherche aussi loin que possible en moins d'une seconde.

   Dans un mode à un seul joueur (Le Cavalier et sa jument), Mad ne joue pas :
   il propose un indice.

   Pour mettre votre portrait : déposez une image carrée dans pieces/mad.png.
   ===================================================================== */
(function () {
  "use strict";

  const E = window.Echiquier;
  if (!E) return;

  const AVATAR = "pieces/mad.png";
  const STORE = "echecs-mad-bot-v1";
  const LEVELS = {
    1: { name: "facile", depth: 1, noise: 260, blunder: 0.25, ms: 250 },
    2: { name: "moyen", depth: 3, noise: 45, blunder: 0, ms: 600 },
    3: { name: "fort", depth: 7, noise: 0, blunder: 0, ms: 800 }
  };
  const WIN = 1e6;

  const bot = { level: 0, side: "b", thinking: false, timer: null, line: "", lastKey: "" };
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "null");
    if (s) { bot.level = [0, 1, 2, 3].includes(s.level) ? s.level : 0; bot.side = s.side === "w" ? "w" : "b"; }
  } catch (_) { }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ level: bot.level, side: bot.side })); } catch (_) { } };

  const other = c => (c === "w" ? "b" : "w");
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const online = () => !!(window.EchiquierNet && window.EchiquierNet.state().mode);

  function game() {
    const st = E.state();
    return st.game && st.game.referee ? st.game : null;
  }
  // Mad peut-il jouer dans la situation actuelle ?
  function available() {
    const st = E.state();
    return st.modeId !== "free" && !!game() && !E.mode().solo && !online();
  }
  const active = () => bot.level > 0 && available();
  const botTurn = () => { const g = game(); return active() && g.phase !== "over" && g.turn === bot.side; };

  E.guards.play.push(() => !botTurn());

  /* ---------- Évaluation d'une position (du point de vue des Blancs, en centièmes de pion) ---------- */
  function evaluate() {
    const st = E.state(), model = st.model, N = st.N, g = E.mode().goals || {};
    let s = 0;
    const reach = g.reach;
    const best = { w: 0, b: 0 }, sum = { w: 0, b: 0 };
    for (const sq in model) {
      const p = model[sq];
      if (p.kind !== "std") continue;
      const c = p.code[0], t = p.code[1];
      const v = (E.VALUE[t] || 0) * 100;
      s += c === "w" ? v : -v;
      if (reach && (reach.side === c || reach.side === "any") && t === reach.type) {
        const rank = Number(sq.slice(1));
        const adv = c === "w" ? rank - 1 : N - rank;
        if (adv > best[c]) best[c] = adv;
        sum[c] += adv;
      }
    }
    if (reach) {                                     // un pion avancé vaut de plus en plus cher
      s += best.w * best.w * 12 + sum.w * 6;
      s -= best.b * best.b * 12 + sum.b * 6;
    }
    return s;
  }
  function terminal(ply) {
    const w = E.state().game.result.winner;
    if (!w) return 0;
    return w === "w" ? WIN - ply : -(WIN - ply);     // gagner vite, perdre tard
  }

  /* ---------- Recherche minimax avec élagage alpha-bêta ---------- */
  let deadline = 0, nodes = 0;
  class Timeout extends Error { }

  function ordered(actions) {
    const model = E.state().model;
    const score = a => (a.t === "move" && model[a.to]) ? (E.VALUE[model[a.to].code[1]] || 0) + 1 : 0;
    return actions.map(a => [score(a), a]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
  }
  function search(depth, alpha, beta, ply) {
    if ((++nodes & 255) === 0 && Date.now() > deadline) throw new Timeout();
    const g = E.state().game;
    if (g.phase === "over") return terminal(ply);
    if (depth <= 0) return evaluate();
    const actions = ordered(E.sim.actions());
    if (!actions.length) return evaluate();
    const max = g.turn === "w";
    let best = max ? -Infinity : Infinity;
    for (const a of actions) {
      const keep = E.sim.save();
      E.sim.apply(a);
      let v;
      try { v = search(depth - 1, alpha, beta, ply + 1); } finally { E.sim.load(keep); }
      if (max) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
  // Note chaque coup possible à la racine, à la profondeur demandée (du point de vue du camp au trait).
  function scoreRoot(actions, depth) {
    const sign = E.state().game.turn === "w" ? 1 : -1;
    return actions.map(a => {
      const keep = E.sim.save();
      E.sim.apply(a);
      let v;
      try { v = search(depth - 1, -Infinity, Infinity, 1); } finally { E.sim.load(keep); }
      return { a, v: v * sign };
    });
  }
  function chooseAction(levelId) {
    const L = LEVELS[levelId] || LEVELS[2];
    const g = E.state().game;
    const actions = ordered(E.sim.actions());
    if (!actions.length) return null;
    if (actions.length === 1) return actions[0];
    if (L.blunder && Math.random() < L.blunder) return pick(actions);      // étourderie volontaire

    // En phase de placement il y a beaucoup de possibilités : on regarde moins loin.
    const maxDepth = g.phase === "place" ? Math.min(L.depth, 2) : L.depth;
    deadline = Date.now() + L.ms; nodes = 0;
    let scored = null;
    for (let d = 1; d <= maxDepth; d++) {
      try { scored = scoreRoot(actions, d); } catch (err) {
        if (!(err instanceof Timeout)) throw err;
        break;                                        // temps écoulé : on garde la dernière profondeur complète
      }
      if (scored.some(x => x.v > WIN / 2)) break;     // un gain forcé est trouvé, inutile d'aller plus loin
    }
    if (!scored) scored = actions.map(a => ({ a, v: 0 }));
    scored.forEach(x => { x.v += (Math.random() * 2 - 1) * L.noise; });
    const top = Math.max(...scored.map(x => x.v));
    return pick(scored.filter(x => x.v >= top - 0.5)).a;
  }

  /* ---------- Indice pour les modes à un seul joueur : plus court chemin vers la victoire ---------- */
  function soloHint() {
    const start = E.sim.save();
    const key = () => Object.keys(E.state().model).sort().join(",");
    const seen = new Set([key()]);
    let frontier = [{ s: start, first: null }];
    try {
      for (let depth = 0; depth < 14 && frontier.length; depth++) {
        const next = [];
        for (const node of frontier) {
          E.sim.load(node.s);
          for (const a of E.sim.actions()) {
            const keep = E.sim.save();
            E.sim.apply(a);
            const first = node.first || a;
            const g = E.state().game;
            if (g.phase === "over") { if (g.result.winner === "w") { E.sim.load(keep); return first; } }
            else {
              const k = key();
              if (!seen.has(k)) { seen.add(k); next.push({ s: E.sim.save(), first }); }
            }
            E.sim.load(keep);
          }
        }
        frontier = next;
      }
    } finally { E.sim.load(start); }
    return null;
  }

  /* ---------- Les mots de Mad ---------- */
  const SAY = {
    hello: ["Salut, c'est Mad ! On fait une partie ?", "Installe-toi, on joue ensemble."],
    youStart: ["À toi de commencer.", "Honneur à toi, je te regarde jouer."],
    iStart: ["C'est moi qui commence, regarde bien.", "Je commence, à toi de trouver la parade."],
    thinking: ["Je réfléchis…", "Voyons voir…", "Laisse-moi regarder ça…"],
    yourTurn: ["À toi.", "À toi de jouer.", "Qu'est-ce que tu réponds ?", "Prends ton temps."],
    iCapture: ["Je prends ! Une pièce non défendue, c'est un cadeau.", "Celle-ci est pour moi.", "Merci pour la pièce !"],
    youCapture: ["Bien vu !", "Aïe, je ne l'avais pas protégée.", "Joli coup, tu as trouvé la faille."],
    iWin: ["Cette fois c'est pour moi. On en refait une ?", "Gagné ! Tu veux ta revanche ?"],
    youWin: ["Bravo, tu m'as battu !", "Bien joué, c'est toi le plus fort aujourd'hui."],
    draw: ["Partie nulle. On remet ça ?"],
    place: ["Je pose une pièce.", "Voilà, à toi de poser."],
    hint: ["Essaie par ici.", "Regarde cette case.", "Et si ton cavalier passait par là ?"],
    noHint: ["Là, je ne vois pas de chemin. Annule un coup et réessaie."],
    solo: ["Ici tu joues seul. Si tu bloques, demande-moi un indice."],
    soloWin: ["Bravo, tu as réussi !", "Bien joué, tu as trouvé le chemin !"],
    soloStuck: ["Bloqué ! Annule un coup ou recommence."]
  };
  const TIPS = {
    pions: "Astuce : un pion tout seul se fait prendre, avance-les ensemble.",
    dalton: "Astuce : des pions qui se protègent avancent ensemble.",
    loup: "Astuce : le loup doit choisir, il ne peut pas tout garder.",
    sanglier: "Astuce : regarde les diagonales des chasseurs avant de sauter.",
    mousquetaires: "Astuce : avant de poser une pièce, vérifie qu'elle ne peut pas être prise."
  };
  function say(kind, extra) {
    bot.line = pick(SAY[kind] || [""]) + (extra ? " " + extra : "");
    renderCard();
  }

  /* ---------- Déroulement ---------- */
  function cancel() { clearTimeout(bot.timer); bot.timer = null; bot.thinking = false; }

  function schedule() {
    cancel();
    if (!botTurn()) return;
    bot.thinking = true;
    say("thinking");
    E.refresh();
    bot.timer = setTimeout(play, 550);
  }
  function play() {
    bot.timer = null;
    if (!botTurn()) { bot.thinking = false; renderCard(); return; }
    let a = null;
    try { a = chooseAction(bot.level); } catch (err) { console.error(err); }
    bot.thinking = false;
    if (!a) { renderCard(); return; }
    bot.mine = true;                       // le prochain événement « change » vient de Mad
    const ok = E.doAction(a);
    bot.mine = false;
    if (!ok) renderCard();
  }

  function gameKey() {
    const st = E.state();
    return st.modeId + "/" + st.variantIdx + "/" + bot.level + "/" + bot.side;
  }
  function greet() {
    const g = game();
    if (!active() || !g) return;
    const tip = TIPS[E.state().modeId] || "";
    say(g.turn === bot.side ? "iStart" : "youStart", tip);
  }

  E.on("change", d => {
    if (E.mode().solo && game()) {                 // mode à un seul joueur : Mad commente et donne des indices
      cancel();
      const g = game();
      if (g.phase === "over") say(g.result.winner === "w" ? "soloWin" : "soloStuck");
      else if (!d.action && !d.undo) say("solo");
      renderControls();
      return;
    }
    if (!active()) { cancel(); renderControls(); renderCard(); return; }
    const g = game();
    if (d.undo) {
      cancel();
      // On annule aussi le coup de Mad, sinon il rejouerait aussitôt.
      if (g.turn === bot.side && E.state().history > 0) { E.undo(); return; }
      say("yourTurn");
      if (botTurn()) schedule();
      return;
    }
    if (g.phase === "over") {
      cancel();
      const w = g.result.winner;
      say(!w ? "draw" : w === bot.side ? "iWin" : "youWin");
      return;
    }
    if (!d.action) {                       // nouvelle partie, changement de mode…
      cancel();
      renderControls();
      greet();
      if (botTurn()) bot.timer = setTimeout(schedule, 700);
      return;
    }
    if (bot.mine) say(d.captured ? "iCapture" : g.phase === "place" ? "place" : "yourTurn");
    else if (d.captured) say("youCapture");
    if (botTurn()) {                       // au tour de Mad (ou encore à lui si l'adversaire a dû passer)
      if (bot.mine) bot.timer = setTimeout(schedule, 700); else schedule();
    }
  });

  /* ---------- Interface ---------- */
  let ctl, card;
  function build() {
    const bar = document.querySelector(".modebar");
    const status = document.getElementById("status");
    if (!bar || !status) return;
    ctl = document.createElement("span");
    ctl.className = "bot-ctl";
    const netBtn = document.getElementById("btnNet");
    if (netBtn) bar.insertBefore(ctl, netBtn); else bar.appendChild(ctl);
    card = document.createElement("div");
    card.className = "bot-card hidden";
    card.setAttribute("aria-live", "polite");
    status.insertAdjacentElement("afterend", card);
  }

  function renderControls() {
    if (!ctl) return;
    const st = E.state(), m = E.mode();
    const solo = !!m.solo && !!game();
    ctl.classList.toggle("hidden", st.modeId === "free" || !game() || online());
    if (ctl.classList.contains("hidden")) { ctl.innerHTML = ""; return; }
    if (solo) {
      ctl.innerHTML = `<button class="btn" id="botHint" type="button">Un indice de Mad</button>`;
      document.getElementById("botHint").addEventListener("click", giveHint);
      return;
    }
    const opt = (v, label) => `<option value="${v}"${bot.level === v ? " selected" : ""}>${label}</option>`;
    ctl.innerHTML = `
      <label class="bot-label">Adversaire
        <select id="botLevel">
          ${opt(0, "Deux joueurs sur cet écran")}
          ${opt(1, "Mad · facile")}
          ${opt(2, "Mad · moyen")}
          ${opt(3, "Mad · fort")}
        </select>
      </label>
      ${bot.level ? `<label class="bot-label">Mad joue
        <select id="botSide">
          <option value="w"${bot.side === "w" ? " selected" : ""}>${m.sides.w}</option>
          <option value="b"${bot.side === "b" ? " selected" : ""}>${m.sides.b}</option>
        </select>
      </label>` : ""}`;
    document.getElementById("botLevel").addEventListener("change", e => {
      bot.level = Number(e.target.value); save(); restart();
    });
    const side = document.getElementById("botSide");
    if (side) side.addEventListener("change", e => { bot.side = e.target.value === "w" ? "w" : "b"; save(); restart(); });
  }
  // Changer d'adversaire ou de camp relance une partie propre.
  function restart() {
    cancel();
    renderControls();
    if (game()) E.newGame(); else renderCard();
  }

  function renderCard() {
    if (!card) return;
    const solo = !!E.mode().solo && !!game();
    const show = (active() || (solo && bot.line)) && !!bot.line;
    card.classList.toggle("hidden", !show);
    if (!show) return;
    const L = LEVELS[bot.level];
    card.classList.toggle("thinking", bot.thinking);
    card.innerHTML = `
      <span class="bot-avatar${hasAvatar ? " has-img" : ""}">${hasAvatar ? `<img src="${AVATAR}" alt="">` : ""}<b>M</b></span>
      <span class="bot-text">
        <span class="bot-name">Mad${!solo && L ? ` <i>· ${L.name}</i>` : ""}</span>
        <span class="bot-line"></span>
      </span>`;
    card.querySelector(".bot-line").textContent = bot.line;
  }
  // Le portrait est facultatif : on vérifie une seule fois s'il existe, sinon on garde le monogramme « M ».
  let hasAvatar = false;
  const probe = new Image();
  probe.onload = () => { hasAvatar = true; renderCard(); };
  probe.src = AVATAR;

  function giveHint() {
    const g = game();
    if (!g || g.phase === "over") return;
    const a = soloHint();
    if (!a) { say("noHint"); return; }
    const shapes = E.getShapes().filter(s => !(s.type === "arrow" && s.hint));
    shapes.push({ type: "arrow", from: a.from, to: a.to, color: "blue", hint: true });
    E.setShapes(shapes);
    say("hint");
  }

  build();
  renderControls();
  // Au chargement : si une partie contre Mad était en cours de réglage, on la démarre proprement.
  if (active()) { greet(); if (botTurn()) bot.timer = setTimeout(schedule, 700); }
  else if (E.mode().solo && game()) say("solo");

  // Le jeu en ligne et Mad ne se cumulent pas : on revérifie quand l'affichage change.
  let wasOnline = online();
  setInterval(() => {
    const now = online();
    if (now !== wasOnline) { wasOnline = now; cancel(); renderControls(); renderCard(); E.refresh(); }
  }, 700);

  window.EchiquierBot = { state: () => bot, chooseAction, soloHint, evaluate };
})();
