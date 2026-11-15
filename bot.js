/* =====================================================================
   MAD, LE BOT — Échiquier d'animation (Échecs et Mad)

   Un adversaire automatique pour tous les modes de jeu arbitrés.
   Il réfléchit en essayant des coups à l'avance (recherche minimax) à partir
   des mêmes règles que le jeu : aucune règle n'est réécrite ici.

   Trois niveaux :
   - facile : regarde un coup à l'avance et se trompe souvent, exprès ;
   - moyen  : regarde trois coups à l'avance, avec un peu de fantaisie ;
   - fort   : cherche aussi loin que possible en une seconde environ, et joue
              parfaitement les parties assez petites pour être calculées en entier.

   Dans un mode à un seul joueur (Le Cavalier et sa jument), Mad ne joue pas :
   il propose un indice.

   Portrait de Mad : des images carrées dans le dossier pieces/, une par expression :
     mad-neutre.png  (neutre et souriant)        mad-malin.png  (content, sourire en coin)
     mad-etonne.png  (étonné)                    mad-fier.png   (grand sourire fier)
     mad-decu.png    (moue de déception)         mad-pensif.png (il réfléchit)
   Une expression absente est remplacée par mad-neutre.png, puis par un simple « M ».

   Voix de Mad : des enregistrements mp3 facultatifs dans le dossier voix/, déclarés
   dans voix/liste.txt (un nom de fichier par ligne). Voir voix/LISEZMOI.md.
   ===================================================================== */
(function () {
  "use strict";

  const E = window.Echiquier;
  if (!E) return;
  if (!E.acces.bot) return;            // pas encore publié (voir ECHIQUIER_PUBLIE dans index.html)

  const AVATARS = {
    neutre: "pieces/mad-neutre.png", malin: "pieces/mad-malin.png", etonne: "pieces/mad-etonne.png",
    fier: "pieces/mad-fier.png", decu: "pieces/mad-decu.png", pensif: "pieces/mad-pensif.png"
  };
  // L'expression de Mad selon ce qu'il dit.
  const MOOD = {
    iCapture: "malin", youCapture: "etonne", noHint: "etonne", thinking: "pensif",
    iWin: "fier", soloWin: "fier", levelUp: "fier", youWin: "decu", soloStuck: "decu", pat: "malin", mated: "decu"
  };
  const STORE = "echecs-mad-bot-v1";
  const LEVELS = {
    1: { name: "facile", depth: 1, noise: 260, blunder: 0.25, ms: 250 },
    2: { name: "moyen", depth: 3, noise: 45, blunder: 0, ms: 600 },
    3: { name: "fort", depth: 40, noise: 0, blunder: 0, ms: 1200, exact: true }
  };
  const WIN = 1e6;

  const bot = { level: 0, side: "b", thinking: false, timer: null, line: "", mood: "neutre", muted: false };
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "null");
    if (s) { bot.level = [0, 1, 2, 3].includes(s.level) ? s.level : 0; bot.side = s.side === "w" ? "w" : "b"; bot.muted = !!s.muted; }
  } catch (_) { }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ level: bot.level, side: bot.wish || bot.side, muted: bot.muted })); } catch (_) { } };
  // Certains modes imposent le camp de Mad (exercices de mat : il défend avec le roi seul) ; on retient le camp choisi pour les autres.
  function fixSide() {
    const forced = E.mode().botSide;
    if (forced) { if (!bot.wish) bot.wish = bot.side; bot.side = forced; }
    else if (bot.wish) { bot.side = bot.wish; bot.wish = null; }
  }

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
    return st.modeId !== "free" && !!game() && !E.mode().solo && !E.mode().puzzle && !online();
  }
  const active = () => bot.level > 0 && available();
  const botTurn = () => { const g = game(); return active() && g.phase !== "over" && g.turn === bot.side; };

  E.guards.play.push(() => !botTurn());

  /* ---------- Évaluation d'une position (du point de vue des Blancs, en centièmes de pion) ---------- */
  function evaluate() {
    const st = E.state(), model = st.model, N = st.N, m = E.mode(), g = m.goals || {}, gm = st.game;
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
        if (t === "P") {                             // un pion protégé par un autre pion ne se prend pas gratuitement
          const f = sq.charCodeAt(0), back = c === "w" ? rank - 1 : rank + 1;
          const l = model[String.fromCharCode(f - 1) + back], r = model[String.fromCharCode(f + 1) + back];
          if ((l && l.code === c + "P") || (r && r.code === c + "P")) s += c === "w" ? 30 : -30;
        }
      }
    }
    if (reach) {                                     // un pion avancé vaut de plus en plus cher
      s += best.w * best.w * 12 + sum.w * 6;
      s -= best.b * best.b * 12 + sum.b * 6;
    }
    if (gm.phase === "place") {                      // pièces encore en main : elles comptent, et les grosses se posent tard
      for (const t of gm.reserve.w) s += (E.VALUE[t] || 0) * 106;
      for (const t of gm.reserve.b) s -= (E.VALUE[t] || 0) * 106;
    }
    if (m.tieWinner) s += m.tieWinner === "w" ? 40 : -40;   // à égalité de points, ce camp gagne
    return s;
  }
  function terminal(ply) {
    const w = E.state().game.result.winner;
    if (!w) return 0;
    return w === "w" ? WIN - ply : -(WIN - ply);     // gagner vite, perdre tard
  }
  // Signature d'une position : pièces, trait, pièces en main, et le compteur de coups sans prise s'il compte.
  function posKey() {
    const st = E.state(), m = st.model, g = st.game;
    let k = "";
    for (const s of Object.keys(m).sort()) k += s + (m[s].code || "");
    k += "|" + g.turn;
    if (g.phase === "place") k += "|" + g.reserve.w.join("") + "/" + g.reserve.b.join("");
    if (E.mode().quietLimit) k += "|" + g.quiet;
    return k;
  }

  /* ---------- Recherche minimax avec élagage alpha-bêta ---------- */
  let deadline = 0, nodes = 0, tt = new Map();
  class Timeout extends Error { }
  const tick = () => { if ((++nodes & 255) === 0 && Date.now() > deadline) throw new Timeout(); };
  const sameAction = (a, b) => !!a && !!b && a.t === b.t && a.to === b.to && a.from === b.from && a.type === b.type;

  function ordered(actions, first) {
    const model = E.state().model;
    const score = a => sameAction(a, first) ? 1000 : (a.t === "move" && model[a.to]) ? (E.VALUE[model[a.to].code[1]] || 0) + 1 : 0;
    return actions.map(a => [score(a), a]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
  }
  // Un coup « bruyant » : une prise, ou la pièce qui atteint la rangée d'arrivée.
  function noisy(a) {
    if (a.t !== "move") return false;
    const st = E.state(), model = st.model;
    if (model[a.to]) return true;
    const r = (E.mode().goals || {}).reach, p = model[a.from];
    if (!r || !p || p.code[1] !== r.type) return false;
    const rank = Number(a.to.slice(1));
    return rank === (p.code[0] === "w" ? st.N : 1);
  }
  // Au bout de la réflexion, on termine les échanges en cours : une pièce en prise n'est pas une pièce gagnée.
  function quiesce(alpha, beta, ply, qd) {
    tick();
    const g = E.state().game;
    if (g.phase === "over") return terminal(ply);
    if (g.phase === "place") return placeValue(ply);
    const stand = evaluate();
    if (qd <= 0) return stand;
    const max = g.turn === "w";
    let best = stand;
    if (max) { if (best >= beta) return best; if (best > alpha) alpha = best; }
    else { if (best <= alpha) return best; if (best < beta) beta = best; }
    for (const a of ordered(E.sim.actions().filter(noisy))) {
      const keep = E.sim.save();
      E.sim.apply(a);
      let v;
      try { v = quiesce(alpha, beta, ply + 1, qd - 1); } finally { E.sim.load(keep); }
      if (max) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
  // Pendant le placement : que vaudrait la position si l'on commençait à jouer tout de suite ?
  // Sert à ne pas poser une pièce en prise.
  function placeValue(ply) {
    const keep = E.sim.save(), first = E.mode().first || "w";
    const base = evaluate();
    const asIf = turn => {
      const s = E.sim.save();
      s.game.phase = "move"; s.game.turn = turn; s.game.quiet = 0;
      E.sim.load(s);
      try { return quiesce(-Infinity, Infinity, ply, 4) - evaluate(); } finally { E.sim.load(keep); }
    };
    // Le camp qui jouera le premier a le temps de sauver une pièce : sa menace compte davantage.
    return base + 0.7 * asIf(first) + 0.3 * asIf(other(first));
  }
  function search(depth, alpha, beta, ply) {
    tick();
    const g = E.state().game;
    if (g.phase === "over") return terminal(ply);
    if (depth <= 0) return quiesce(alpha, beta, ply, 6);
    const key = posKey(), hit = tt.get(key);
    if (hit && hit.depth >= depth) {
      if (hit.flag === 0) return hit.v;
      if (hit.flag === 1 && hit.v >= beta) return hit.v;
      if (hit.flag === 2 && hit.v <= alpha) return hit.v;
    }
    const actions = ordered(E.sim.actions(), hit && hit.best);
    if (!actions.length) return evaluate();
    const max = g.turn === "w", a0 = alpha, b0 = beta;
    let best = max ? -Infinity : Infinity, bestA = null;
    for (const a of actions) {
      const keep = E.sim.save();
      E.sim.apply(a);
      let v;
      try { v = search(depth - 1, alpha, beta, ply + 1); } finally { E.sim.load(keep); }
      if (max) { if (v > best) { best = v; bestA = a; } if (best > alpha) alpha = best; }
      else { if (v < best) { best = v; bestA = a; } if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    // Les gains forcés dépendent de la distance à la racine : on ne les réutilise pas tels quels.
    if (Math.abs(best) < WIN / 2) tt.set(key, { depth, v: best, best: bestA, flag: best <= a0 ? 2 : best >= b0 ? 1 : 0 });
    else tt.set(key, { depth: -1, v: 0, best: bestA, flag: 0 });
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

  /* ---------- Jeu parfait : quand la partie est assez petite, Mad la connaît par cœur ---------- */
  // On visite toutes les positions accessibles, puis on remonte depuis les fins de partie :
  // pour chaque position, qui gagne, et en combien de coups. (Duel des rois, fins de partie des autres jeux.)
  const copy = s => ({ model: { ...s.model }, game: { ...s.game, reserve: { w: s.game.reserve.w.slice(), b: s.game.reserve.b.slice() } } });
  const fresh = s => { const c = copy(s); c.game.rep = {}; c.game.quiet = 0; return c; };
  const bareKey = () => {
    const st = E.state(), m = st.model;
    let k = "";
    for (const s of Object.keys(m).sort()) k += s + (m[s].code || "");
    return k + "|" + st.game.turn;
  };
  const exact = { id: "", table: new Map(), retryAt: 0 };
  function solveExact(maxStates, ms) {
    const start = E.sim.save(), until = Date.now() + ms;
    const index = new Map(), turn = [], term = [], succ = [];
    const add = (k, t, tm) => { index.set(k, turn.length); turn.push(t); term.push(tm); succ.push(null); return turn.length - 1; };
    let ok = true;
    try {
      E.sim.load(fresh(start));
      add(bareKey(), E.state().game.turn, 0);
      let frontier = [{ i: 0, s: fresh(start) }];
      while (frontier.length && ok) {
        const next = [];
        for (const node of frontier) {
          if (turn.length > maxStates || Date.now() > until) { ok = false; break; }
          E.sim.load(copy(node.s));
          const list = [];
          for (const a of E.sim.actions()) {
            const keep = E.sim.save();
            E.sim.apply(a);
            const g = E.state().game;
            let k = bareKey(), tm = 0;
            if (g.phase === "over") { tm = g.result.winner === "w" ? 1 : g.result.winner === "b" ? 2 : 3; k += "#" + tm; }
            let j = index.get(k);
            if (j === undefined) {
              j = add(k, g.turn, tm);
              if (!tm) next.push({ i: j, s: fresh(E.sim.save()) });
            }
            list.push(j);
            E.sim.load(keep);
          }
          succ[node.i] = list;
          if (!list.length) term[node.i] = 3;         // aucun coup et pas de vainqueur : nulle
        }
        frontier = next;
      }
    } finally { E.sim.load(start); }
    if (!ok) return false;
    const n = turn.length, preds = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) if (succ[i]) for (const j of succ[i]) preds[j].push(i);
    const solve = (side, code) => {                   // positions d'où `side` force le gain, et en combien de coups
      const d = new Int32Array(n).fill(-1), left = new Int32Array(n), queue = [];
      for (let i = 0; i < n; i++) { left[i] = succ[i] ? succ[i].length : 0; if (term[i] === code) { d[i] = 0; queue.push(i); } }
      for (let q = 0; q < queue.length; q++) {
        const s = queue[q];
        for (const p of preds[s]) {
          if (d[p] >= 0 || term[p]) continue;
          if (turn[p] === side || --left[p] === 0) { d[p] = d[s] + 1; queue.push(p); }
        }
      }
      return d;
    };
    const dw = solve("w", 1), db = solve("b", 2);
    exact.table = new Map();
    index.forEach((i, k) => { if (!term[i]) exact.table.set(k, { w: dw[i], b: db[i] }); });
    return true;
  }
  // Le meilleur coup d'après la table, ou null si la partie est encore trop vaste.
  function exactAction(actions) {
    const g = E.state().game, m = E.mode();
    if (g.phase !== "move" || m.quietLimit) return null;
    const id = gameKey();
    if (exact.id !== id) { exact.id = id; exact.table = new Map(); exact.retryAt = 0; }
    if (!exact.table.has(bareKey())) {
      if ((g.moves || 0) < exact.retryAt) return null;
      if (!solveExact(30000, 1500)) { exact.retryAt = (g.moves || 0) + 4; return null; }
    }
    const me = g.turn, opp = other(me), sign = me === "w" ? 1 : -1;
    // Classe d'une position pour `me` : gain (vite), nulle, perte (tard).
    const grade = () => {
      const e = exact.table.get(bareKey());
      if (!e) return null;
      return e[me] >= 0 ? 1e5 - e[me] : e[opp] >= 0 ? -1e5 + e[opp] : 0;
    };
    const scored = actions.map(a => {
      const keep = E.sim.save();
      E.sim.apply(a);
      const after = E.state().game;
      let v;
      if (after.phase === "over") {
        const w = after.result.winner, known = grade();
        // Fin par répétition dans une position que personne ne peut forcer : c'est la nulle, on l'accepte.
        v = w === me ? 1e6 : !w ? 0 : known === 0 ? 1 : -1e6;
      } else {
        v = grade();
        if (v === null) v = 0;
        if (v === 0) {                                // nulle : on préfère le coup qui tend le plus de pièges
          const replies = E.sim.actions();
          let traps = 0;
          for (const r of replies) {
            const k2 = E.sim.save();
            E.sim.apply(r);
            const g2 = E.state().game;
            const e = g2.phase === "over" ? null : exact.table.get(bareKey());
            if ((g2.phase === "over" && g2.result.winner === me) || (e && e[me] >= 0)) traps++;
            E.sim.load(k2);
          }
          v = (replies.length ? 100 * traps / replies.length : 0) + evaluate() * sign * 0.01;
        }
      }
      E.sim.load(keep);
      return { a, v };
    });
    const top = Math.max(...scored.map(x => x.v));
    return pick(scored.filter(x => x.v >= top - 1e-6)).a;
  }

  /* ---------- Vraies parties d'échecs : Mad confie la réflexion à son moteur (moteur.js) ---------- */
  // facile : voit un coup devant lui et se trompe souvent ; moyen : trois coups, quelques imprécisions ;
  // fort : réfléchit un peu plus d'une seconde, sans erreur volontaire.
  const CHESS_LEVELS = {
    1: { depth: 1, ms: 300, noise: 150, blunder: 0.2, exact: true },
    2: { depth: 3, ms: 600, noise: 50, blunder: 0, exact: true },
    3: { depth: 64, ms: 1300, noise: 0, blunder: 0, exact: false }
  };
  // La position telle que le moteur l'attend.
  function enginePosition(model, g) {
    if (!model) { const st = E.state(); model = st.model; g = st.game; }
    const pieces = {};
    for (const sq in model) if (model[sq].kind === "std") pieces[sq] = model[sq].code;
    return { pieces, turn: g.turn, castle: g.castle || "", ep: g.ep || null, half: g.quiet || 0 };
  }
  // Livre d'ouvertures facultatif (livre/mad.json) : les coups que Madické joue vraiment, position par position.
  // { "<pièces> <trait> <roques>": [["e2e4", 12], ["d2d4", 3]], … }
  let book = null;
  fetch("livre/mad.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && typeof j === "object") book = j; }).catch(() => { });
  function bookKey() {
    const p = enginePosition();
    let rows = [];
    for (let r = 8; r >= 1; r--) {
      let row = "", gap = 0;
      for (const f of "abcdefgh") {
        const c = p.pieces[f + r];
        if (!c) { gap++; continue; }
        if (gap) { row += gap; gap = 0; }
        row += c[0] === "w" ? c[1] : c[1].toLowerCase();
      }
      rows.push(row + (gap || ""));
    }
    return rows.join("/") + " " + p.turn + " " + (p.castle || "-");
  }
  function bookMove(actions) {
    const lines = book && book[bookKey()];
    if (!Array.isArray(lines) || !lines.length) return null;
    let total = 0;
    for (const l of lines) total += Number(l[1]) || 0;
    let x = Math.random() * total;
    for (const l of lines) {
      x -= Number(l[1]) || 0;
      if (x <= 0) {
        const mv = String(l[0]);
        return actions.find(a => a.from + a.to + (a.promo ? a.promo.toLowerCase() : "") === mv) || null;
      }
    }
    return null;
  }
  // Les coups de la position, notés par le moteur, du meilleur au moins bon (ou null sans moteur).
  function engineMoves(L) {
    const M = window.MoteurEchecs;
    if (!M) return null;
    // Le moteur reçoit aussi le passé de la partie : il sait ainsi quelles positions se répètent.
    M.set(enginePosition(), E.past().filter(h => h.game && h.game.phase === "move").map(h => enginePosition(h.model, h.game)));
    return M.think({ ms: L.ms, depth: L.depth, exact: L.exact, window: L.window || L.noise }).moves;
  }
  function chessAction(levelId, actions) {
    const L = CHESS_LEVELS[levelId] || CHESS_LEVELS[2];
    if (E.mode().castle) {                             // partie classique : d'abord le répertoire de Madické
      const b = bookMove(actions);
      if (b) return b;
    }
    if (L.blunder && Math.random() < L.blunder) return pick(actions);
    const moves = engineMoves(L);
    if (!moves || !moves.length) return null;
    moves.forEach(m => { m.v = m.score + (Math.random() * 2 - 1) * L.noise; });
    moves.sort((x, y) => y.v - x.v);
    return freshest(moves, actions);
  }
  // Le coup du moteur est toujours revérifié avec les règles de la page.
  // Avec l'avantage, on évite de revenir dans une position déjà vue : tourner en rond mène à la nulle.
  function freshest(moves, actions) {
    const find = m => actions.find(a => a.from === m.from && a.to === m.to && (a.promo || null) === (m.promo || null));
    const best = moves[0].score;
    let fallback = null;
    for (const m of moves) {
      const a = find(m);
      if (!a) continue;
      if (!fallback) fallback = a;
      if (best < 150) return a;
      if (m.score < 150 || m.score < best - 100) break;
      const keep = E.sim.save();
      E.sim.apply(a);
      const g = E.state().game, again = (g.phase === "over" && !g.result.winner) || E.seen() > 1;
      E.sim.load(keep);
      if (!again) return a;
    }
    return fallback;
  }
  // Le meilleur coup pour le camp au trait, à montrer comme indice.
  function chessHint() {
    const moves = engineMoves({ ms: 1000, depth: 64, exact: false, noise: 0 });
    return moves && moves.length ? freshest(moves, E.sim.actions()) : null;
  }

  function chooseAction(levelId) {
    const L = LEVELS[levelId] || LEVELS[2];
    const actions = ordered(E.sim.actions());
    if (!actions.length) return null;
    if (actions.length === 1) return actions[0];
    if (E.mode().chess) {
      const a = chessAction(levelId, actions);
      if (a) return a;
    }
    if (L.blunder && Math.random() < L.blunder) return pick(actions);      // étourderie volontaire
    if (L.exact) {
      const a = exactAction(actions);
      if (a) return a;
    }
    deadline = Date.now() + L.ms; nodes = 0; tt = new Map();
    let scored = null;
    for (let d = 1; d <= L.depth; d++) {
      let done;
      try { done = scoreRoot(actions, d); } catch (err) {
        if (!(err instanceof Timeout)) throw err;
        break;                                        // temps écoulé : on garde la dernière profondeur complète
      }
      scored = done;
      if (scored.some(x => x.v > WIN / 2)) break;     // un gain forcé est trouvé, inutile d'aller plus loin
      if (scored.every(x => x.v < -WIN / 2)) break;   // tout perd : inutile d'insister
    }
    if (!scored) scored = actions.map(a => ({ a, v: 0 }));
    scored.forEach(x => { x.v += (Math.random() * 2 - 1) * L.noise; });
    const top = Math.max(...scored.map(x => x.v));
    return pick(scored.filter(x => x.v >= top - 0.5)).a;
  }

  /* ---------- Indice pour les modes à un seul joueur : plus court chemin vers la victoire ---------- */
  // Les états mis de côté ne doivent jamais redevenir l'état en cours tels quels : on en charge une copie.
  function soloHint() {
    const start = E.sim.save();
    const key = () => {
      const m = E.state().model;
      return Object.keys(m).sort().map(s => s + (m[s].code || "")).join(",");
    };
    const seen = new Set([key()]);
    let frontier = [{ s: start, first: null }];
    try {
      for (let depth = 0; depth < 14 && frontier.length; depth++) {
        const next = [];
        for (const node of frontier) {
          E.sim.load(copy(node.s));
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
    } finally { E.sim.load(copy(start)); }
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
    pat: ["Pat ! Mon roi n'est pas en échec, mais il ne peut plus bouger : partie nulle. Tu y étais presque."],
    mated: ["Échec et mat ! Bien joué.", "Mat ! Mon roi n'a plus aucune case. Bravo !"],
    place: ["Je pose une pièce.", "Voilà, à toi de poser."],
    hint: ["Essaie par ici.", "Regarde cette case.", "Et si tu passais par là ?"],
    noHint: ["Là, je ne vois pas de chemin. Annule un coup et réessaie."],
    solo: ["Ici tu joues seul. Si tu bloques, demande-moi un indice."],
    soloWin: ["Bravo, tu as réussi !", "Bien joué, tu as trouvé le chemin !"],
    soloStuck: ["Bloqué ! Annule un coup ou recommence."],
    levelUp: ["Bien joué ! On corse un peu : niveau suivant.", "Tu t'es échappé ! Attention, j'appelle du renfort."]
  };
  const TIPS = {
    pions: "Astuce : un pion tout seul se fait prendre, avance-les ensemble.",
    fous: "Astuce : un pion gardé par son voisin, le fou n'ose pas le prendre.",
    opposition: "Astuce : mets ton roi juste en face du mien, avec une case entre nous.",
    dalton: "Astuce : des pions qui se protègent avancent ensemble.",
    loup: "Astuce : un mouton capture en diagonale, même le loup.",
    sanglier: "Astuce : regarde les diagonales des chasseurs avant de sauter.",
    mousquetaires: "Astuce : avant de poser une pièce, vérifie qu'elle ne peut pas être prise.",
    mat: "Astuce : attention au pat ! Tant que tu ne fais pas mat, laisse toujours une case à mon roi.",
    classique: "Astuce : sors tes pièces, mets ton roi à l'abri avec le roque, et occupe le centre."
  };
  /* ---------- La voix de Mad (enregistrements facultatifs du dossier voix/) ---------- */
  // Nom des fichiers : <réplique>-<numéro>.mp3 ; l'astuce d'un mode : astuce-<mode>.mp3.
  const VOICE = {
    hello: "bonjour", youStart: "a-toi-de-commencer", iStart: "je-commence", thinking: "je-reflechis", yourTurn: "a-toi",
    iCapture: "je-prends", youCapture: "tu-prends", iWin: "je-gagne", youWin: "tu-gagnes", draw: "nulle", pat: "pat", mated: "mat", place: "je-pose",
    hint: "indice", noHint: "pas-d-indice", solo: "defi", soloWin: "defi-reussi", soloStuck: "defi-bloque", levelUp: "niveau-suivant"
  };
  const CHATTER = { thinking: 1, yourTurn: 1, place: 1 };     // répliques de routine : dites une fois sur trois seulement
  const voices = new Set();
  let playing = null;
  fetch("voix/liste.txt", { cache: "no-cache" }).then(r => (r.ok ? r.text() : "")).then(txt => {
    txt.split(/\r?\n/).map(l => l.trim()).filter(l => /^[a-z0-9-]+\.mp3$/.test(l)).forEach(l => voices.add(l.slice(0, -4)));
    if (voices.size) renderCard();
  }).catch(() => { });
  function hush() { if (playing) { playing.pause(); playing = null; } }
  function speak(ids) {
    hush();
    const queue = ids.filter(id => voices.has(id));
    if (bot.muted || !queue.length) return;
    const next = () => {
      const id = queue.shift();
      if (!id) { playing = null; return; }
      const a = new Audio("voix/" + id + ".mp3");
      playing = a;
      a.onended = () => { if (playing === a) next(); };
      const p = a.play();
      if (p && p.catch) p.catch(() => { if (playing === a) playing = null; });     // son refusé par le navigateur : on se tait
    };
    next();
  }
  function say(kind, extra) {
    const lines = SAY[kind] || [""], i = Math.floor(Math.random() * lines.length);
    bot.line = lines[i] + (extra ? " " + extra : "");
    bot.mood = MOOD[kind] || "neutre";
    renderCard();
    if (CHATTER[kind] && Math.random() > 1 / 3) { hush(); return; }
    const ids = [VOICE[kind] + "-" + (i + 1)];
    if (extra) ids.push("astuce-" + E.state().modeId);
    speak(ids);
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
    fixSide();
    if (d && d.action) {                           // un coup vient d'être joué : la flèche d'indice n'a plus lieu d'être
      const all = E.getShapes(), kept = all.filter(x => !x.hint);
      if (kept.length !== all.length) E.setShapes(kept);
    }
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
      const pat = !w && /^Pat/.test(g.result.reason || "");
      say(pat ? "pat" : !w ? "draw" : w === bot.side ? "iWin" : g.result.up ? "levelUp" : E.mode().mateCount ? "mated" : "youWin");
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
      // Après une prise du joueur, Mad garde un instant sa réaction avant de se remettre à réfléchir.
      if (bot.mine) bot.timer = setTimeout(schedule, 700);
      else if (d.captured) bot.timer = setTimeout(schedule, 1300);
      else schedule();
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
    ctl.classList.toggle("hidden", st.modeId === "free" || !game() || online() || !!m.puzzle);
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
      ${bot.level && !m.botSide ? `<label class="bot-label">Mad joue
        <select id="botSide">
          <option value="w"${bot.side === "w" ? " selected" : ""}>${m.sides.w}</option>
          <option value="b"${bot.side === "b" ? " selected" : ""}>${m.sides.b}</option>
        </select>
      </label>` : ""}`;
    document.getElementById("botLevel").addEventListener("change", e => {
      bot.level = Number(e.target.value); save(); restart();
    });
    if (m.botSide && bot.level) {                      // exercices de mat : un indice à la demande
      ctl.insertAdjacentHTML("beforeend", `<button class="btn" id="botHint" type="button">Un indice de Mad</button>`);
      document.getElementById("botHint").addEventListener("click", giveHint);
    }
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
    const face = found[bot.mood] || found.neutre || "";
    card.classList.toggle("thinking", bot.thinking);
    card.innerHTML = `
      <span class="bot-avatar${face ? " has-img" : ""}">${face ? `<img src="${face}" alt="">` : ""}<b>M</b></span>
      <span class="bot-text">
        <span class="bot-name">Mad${!solo && L ? ` <i>· ${L.name}</i>` : ""}</span>
        <span class="bot-line"></span>
      </span>
      ${voices.size ? `<button class="bot-sound" type="button" aria-pressed="${!bot.muted}" title="${bot.muted ? "Activer la voix de Mad" : "Couper la voix de Mad"}">${bot.muted ? "Voix coupée" : "Voix"}</button>` : ""}`;
    card.querySelector(".bot-line").textContent = bot.line;
    const snd = card.querySelector(".bot-sound");
    if (snd) snd.addEventListener("click", () => { bot.muted = !bot.muted; if (bot.muted) hush(); save(); renderCard(); });
  }
  // Les portraits sont facultatifs : on vérifie une seule fois lesquels existent.
  const found = {};
  Object.keys(AVATARS).forEach(mood => {
    const probe = new Image();
    probe.onload = () => { found[mood] = AVATARS[mood]; renderCard(); };
    probe.src = AVATARS[mood];
  });

  function giveHint() {
    const g = game();
    if (!g || g.phase === "over") return;
    let a = null;
    if (E.mode().chess) {                            // exercice de mat : le moteur montre le meilleur coup
      a = chessHint();
    } else a = soloHint();
    if (!a) { say("noHint"); return; }
    const shapes = E.getShapes().filter(s => !(s.type === "arrow" && s.hint));
    shapes.push({ type: "arrow", from: a.from, to: a.to, color: "blue", hint: true });
    E.setShapes(shapes);
    say("hint");
  }

  fixSide();
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

  window.EchiquierBot = { state: () => bot, chooseAction, soloHint, evaluate, exact, solveExact, bareKey, engineMoves, chessHint };
})();
