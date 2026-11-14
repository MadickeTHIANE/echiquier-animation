/* =====================================================================
   MOTEUR D'ÉCHECS DE MAD — moteur.js
   Le cerveau de Mad pour les vraies parties d'échecs (partie classique, exercices de mat).
   Il ne dessine rien et ne connaît pas la page : on lui donne une position, il rend un coup.

   Pourquoi un moteur à part ? Les mini-jeux se contentent des règles de index.html, que le bot
   essaie coup par coup. Aux échecs complets c'est trop lent : ici l'échiquier est un simple
   tableau de nombres, ce qui permet de regarder des centaines de milliers de positions par seconde.
   Les règles restent celles de index.html : bot.js vérifie toujours le coup proposé avant de le jouer.

   Méthode : recherche alpha-bêta avec approfondissement progressif, table de transposition,
   fin des échanges avant d'évaluer, et une évaluation simple (matériel, placement des pièces,
   pions passés, roi adverse repoussé vers le bord quand on a l'avantage).

   Utilisable aussi sans navigateur (tests) : node -e "require('./moteur.js')".
   ===================================================================== */
(function (root) {
  "use strict";

  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const VAL = [0, 100, 320, 330, 500, 900, 0];
  const MATE = 30000, INF = 32000;
  const LETTER = " PNBRQK";

  /* ---------- Position : échiquier « 0x88 » (case = rangée * 16 + colonne) ---------- */
  const board = new Int8Array(128);         // > 0 pièce blanche, < 0 pièce noire
  let side = 1;                             // 1 = Blancs au trait, -1 = Noirs
  let castle = 0;                           // 1 petit roque blanc, 2 grand roque blanc, 4 et 8 pour les Noirs
  let ep = -1;                              // case de prise en passant, ou -1
  let half = 0;                             // demi-coups depuis la dernière prise ou poussée de pion
  const king = [0, 0];                      // case du roi blanc, du roi noir
  let hLo = 0, hHi = 0;                     // signature de la position (deux moitiés de 32 bits)

  const KNIGHT = [-33, -31, -18, -14, 14, 18, 31, 33];
  const ROYAL = [-17, -16, -15, -1, 1, 15, 16, 17];
  const DIAG = [-17, -15, 15, 17], LINE = [-16, -1, 1, 16];
  const RIGHTS = new Int8Array(128).fill(15);
  RIGHTS[4] = 12; RIGHTS[0] = 13; RIGHTS[7] = 14; RIGHTS[116] = 3; RIGHTS[112] = 7; RIGHTS[119] = 11;

  // Nombres aléatoires fixes pour les signatures (toujours les mêmes d'une exécution à l'autre).
  let seed = 0x9e3779b9;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const ZL = new Int32Array(13 * 128), ZH = new Int32Array(13 * 128);
  for (let i = 0; i < ZL.length; i++) { ZL[i] = rnd(); ZH[i] = rnd(); }
  const ZSL = rnd(), ZSH = rnd();
  const ZCL = new Int32Array(16), ZCH = new Int32Array(16), ZEL = new Int32Array(128), ZEH = new Int32Array(128);
  for (let i = 0; i < 16; i++) { ZCL[i] = rnd(); ZCH[i] = rnd(); }
  for (let i = 0; i < 128; i++) { ZEL[i] = rnd(); ZEH[i] = rnd(); }
  const zi = (pc, sq) => (pc + 6) * 128 + sq;

  function rehash() {
    hLo = 0; hHi = 0;
    for (let s = 0; s < 128; s++) if (!(s & 0x88) && board[s]) { hLo ^= ZL[zi(board[s], s)]; hHi ^= ZH[zi(board[s], s)]; }
    if (side < 0) { hLo ^= ZSL; hHi ^= ZSH; }
    hLo ^= ZCL[castle]; hHi ^= ZCH[castle];
    if (ep >= 0) { hLo ^= ZEL[ep]; hHi ^= ZEH[ep]; }
  }

  const sqOf = name => (name.charCodeAt(1) - 49) * 16 + (name.charCodeAt(0) - 97);
  const nameOf = s => String.fromCharCode(97 + (s & 7)) + String.fromCharCode(49 + (s >> 4));

  // Position donnée par la page : { pieces: { e1: "wK", … }, turn: "w", castle: "KQkq", ep: "e3" | null, half: 0 }
  // `past` (facultatif) : les positions précédentes de la partie, de la plus ancienne à la plus récente,
  // pour que le moteur reconnaisse les répétitions.
  function set(pos, past) {
    const seenLo = [], seenHi = [];
    for (const old of (past || []).slice(-300)) { load(old); seenLo.push(hLo); seenHi.push(hHi); }
    load(pos);
    for (let i = 0; i < seenLo.length; i++) { HL[i] = seenLo[i]; HH[i] = seenHi[i]; }
    hp = seenLo.length;
  }
  function load(pos) {
    board.fill(0);
    for (const name in pos.pieces) {
      const code = pos.pieces[name], t = LETTER.indexOf(code[1]);
      if (t < 1) continue;
      const s = sqOf(name);
      board[s] = code[0] === "w" ? t : -t;
      if (t === K) king[code[0] === "w" ? 0 : 1] = s;
    }
    side = pos.turn === "b" ? -1 : 1;
    const c = pos.castle || "";
    castle = (c.includes("K") ? 1 : 0) | (c.includes("Q") ? 2 : 0) | (c.includes("k") ? 4 : 0) | (c.includes("q") ? 8 : 0);
    ep = pos.ep ? sqOf(pos.ep) : -1;
    half = pos.half || 0;
    sp = 0; hp = 0;
    rehash();
  }
  function setFen(fen) {
    const [rows, turn, c, e, h] = fen.split(/\s+/), pieces = {};
    rows.split("/").forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (ch >= "1" && ch <= "8") { f += Number(ch); continue; }
        pieces[String.fromCharCode(97 + f) + (8 - i)] = (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase();
        f++;
      }
    });
    set({ pieces, turn, castle: c === "-" ? "" : c, ep: e && e !== "-" ? e : null, half: Number(h) || 0 });
  }

  /* ---------- La case `s` est-elle attaquée par le camp `by` (1 ou -1) ? ---------- */
  function attacked(s, by) {
    let t;
    t = s - by * 15; if (!(t & 0x88) && board[t] === by * P) return true;
    t = s - by * 17; if (!(t & 0x88) && board[t] === by * P) return true;
    for (let i = 0; i < 8; i++) {
      t = s + KNIGHT[i]; if (!(t & 0x88) && board[t] === by * N) return true;
      t = s + ROYAL[i]; if (!(t & 0x88) && board[t] === by * K) return true;
    }
    for (let i = 0; i < 4; i++) {
      let d = DIAG[i]; t = s + d;
      while (!(t & 0x88)) { const p = board[t]; if (p) { if (p === by * B || p === by * Q) return true; break; } t += d; }
      d = LINE[i]; t = s + d;
      while (!(t & 0x88)) { const p = board[t]; if (p) { if (p === by * R || p === by * Q) return true; break; } t += d; }
    }
    return false;
  }
  const inCheck = c => attacked(king[c > 0 ? 0 : 1], -c);

  /* ---------- Coups : départ | arrivée << 7 | promotion << 14 | genre << 17 ---------- */
  // genre : 0 normal, 1 prise en passant, 2 roque, 3 pion qui avance de deux cases
  const FROM = m => m & 127, TO = m => (m >> 7) & 127, PROMO = m => (m >> 14) & 7, KIND = m => m >> 17;
  const mk = (f, t, pr, k) => f | (t << 7) | (pr << 14) | (k << 17);

  function generate(list, capturesOnly) {
    let n = 0;
    for (let s = 0; s < 120; s++) {
      if (s & 0x88) { s += 7; continue; }
      const pc = board[s];
      if (!pc || (pc > 0) !== (side > 0)) continue;
      const t = pc > 0 ? pc : -pc;
      if (t === P) {
        const up = side * 16, last = side > 0 ? 7 : 0, home = side > 0 ? 1 : 6;
        for (const d of [up - 1, up + 1]) {
          const x = s + d;
          if (x & 0x88) continue;
          if (board[x] && (board[x] > 0) !== (side > 0)) {
            if ((x >> 4) === last) { list[n++] = mk(s, x, Q, 0); list[n++] = mk(s, x, N, 0); list[n++] = mk(s, x, R, 0); list[n++] = mk(s, x, B, 0); }
            else list[n++] = mk(s, x, 0, 0);
          } else if (x === ep) list[n++] = mk(s, x, 0, 1);
        }
        const one = s + up;
        if (!board[one]) {
          if ((one >> 4) === last) {
            list[n++] = mk(s, one, Q, 0);
            if (!capturesOnly) { list[n++] = mk(s, one, N, 0); list[n++] = mk(s, one, R, 0); list[n++] = mk(s, one, B, 0); }
          } else if (!capturesOnly) {
            list[n++] = mk(s, one, 0, 0);
            if ((s >> 4) === home && !board[one + up]) list[n++] = mk(s, one + up, 0, 3);
          }
        }
        continue;
      }
      if (t === N || t === K) {
        const offs = t === N ? KNIGHT : ROYAL;
        for (let i = 0; i < 8; i++) {
          const x = s + offs[i];
          if (x & 0x88) continue;
          const o = board[x];
          if (!o) { if (!capturesOnly) list[n++] = mk(s, x, 0, 0); }
          else if ((o > 0) !== (side > 0)) list[n++] = mk(s, x, 0, 0);
        }
        if (t === K && !capturesOnly) {
          const e = side > 0 ? 4 : 116, ks = side > 0 ? 1 : 4, qs = side > 0 ? 2 : 8;
          if (s === e && (castle & (ks | qs)) && !attacked(e, -side)) {
            if ((castle & ks) && !board[e + 1] && !board[e + 2] && board[e + 3] === side * R && !attacked(e + 1, -side)) list[n++] = mk(e, e + 2, 0, 2);
            if ((castle & qs) && !board[e - 1] && !board[e - 2] && !board[e - 3] && board[e - 4] === side * R && !attacked(e - 1, -side)) list[n++] = mk(e, e - 2, 0, 2);
          }
        }
        continue;
      }
      for (let i = 0; i < 4; i++) {
        for (let pass = 0; pass < 2; pass++) {
          if ((pass === 0 && t === R) || (pass === 1 && t === B)) continue;
          const d = pass === 0 ? DIAG[i] : LINE[i];
          let x = s + d;
          while (!(x & 0x88)) {
            const o = board[x];
            if (!o) { if (!capturesOnly) list[n++] = mk(s, x, 0, 0); }
            else { if ((o > 0) !== (side > 0)) list[n++] = mk(s, x, 0, 0); break; }
            x += d;
          }
        }
      }
    }
    return n;
  }

  /* ---------- Jouer et défaire un coup ---------- */
  const U = new Int32Array(8 * 512);        // pile : pièce prise, roque, en passant, demi-coups, signature
  let sp = 0;
  const HL = new Int32Array(1024), HH = new Int32Array(1024);   // signatures des positions traversées (répétitions)
  let hp = 0;

  function make(m) {
    const f = FROM(m), t = TO(m), k = KIND(m), pc = board[f], me = side;
    let cap = board[t];
    U[sp++] = cap; U[sp++] = castle; U[sp++] = ep; U[sp++] = half; U[sp++] = hLo; U[sp++] = hHi;
    HL[hp] = hLo; HH[hp] = hHi; hp++;
    hLo ^= ZCL[castle]; hHi ^= ZCH[castle];
    if (ep >= 0) { hLo ^= ZEL[ep]; hHi ^= ZEH[ep]; }
    if (cap) { hLo ^= ZL[zi(cap, t)]; hHi ^= ZH[zi(cap, t)]; }
    hLo ^= ZL[zi(pc, f)]; hHi ^= ZH[zi(pc, f)];
    board[f] = 0;
    let put = pc;
    if (PROMO(m)) put = me * PROMO(m);
    board[t] = put;
    hLo ^= ZL[zi(put, t)]; hHi ^= ZH[zi(put, t)];
    if (k === 1) {                              // prise en passant : le pion pris est derrière la case d'arrivée
      const x = t - me * 16;
      hLo ^= ZL[zi(board[x], x)]; hHi ^= ZH[zi(board[x], x)];
      board[x] = 0; cap = 1;
    } else if (k === 2) {                       // roque : la tour saute par-dessus le roi
      const rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1;
      hLo ^= ZL[zi(board[rf], rf)] ^ ZL[zi(board[rf], rt)]; hHi ^= ZH[zi(board[rf], rf)] ^ ZH[zi(board[rf], rt)];
      board[rt] = board[rf]; board[rf] = 0;
    }
    if (pc === me * K) king[me > 0 ? 0 : 1] = t;
    castle &= RIGHTS[f] & RIGHTS[t];
    ep = k === 3 ? f + me * 16 : -1;
    half = (cap || pc === me * P) ? 0 : half + 1;
    hLo ^= ZCL[castle]; hHi ^= ZCH[castle];
    if (ep >= 0) { hLo ^= ZEL[ep]; hHi ^= ZEH[ep]; }
    hLo ^= ZSL; hHi ^= ZSH;
    side = -me;
    if (attacked(king[me > 0 ? 0 : 1], -me)) { unmake(m); return false; }   // roi laissé en échec : coup interdit
    return true;
  }
  function unmake(m) {
    const f = FROM(m), t = TO(m), k = KIND(m);
    side = -side;
    const me = side;
    hp--;
    hHi = U[--sp]; hLo = U[--sp]; half = U[--sp]; ep = U[--sp]; castle = U[--sp];
    const cap = U[--sp];
    const pc = PROMO(m) ? me * P : board[t];
    board[f] = pc; board[t] = cap;
    if (k === 1) board[t - me * 16] = -me * P;
    else if (k === 2) {
      const rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1;
      board[rf] = board[rt]; board[rt] = 0;
    }
    if (pc === me * K) king[me > 0 ? 0 : 1] = f;
  }
  function makeNull() {
    U[sp++] = ep; U[sp++] = hLo; U[sp++] = hHi;
    HL[hp] = hLo; HH[hp] = hHi; hp++;
    if (ep >= 0) { hLo ^= ZEL[ep]; hHi ^= ZEH[ep]; }
    ep = -1; hLo ^= ZSL; hHi ^= ZSH; side = -side;
  }
  function unmakeNull() { side = -side; hp--; hHi = U[--sp]; hLo = U[--sp]; ep = U[--sp]; }

  /* ---------- Évaluation (du point de vue du camp au trait, en centièmes de pion) ---------- */
  // Tables de placement « Simplified Evaluation Function » (T. Michniewski, domaine public), vues côté Blancs, 8e rangée d'abord.
  const T = {
    1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    7: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };
  // PST[pièce][case 0x88] pour les Blancs ; les Noirs lisent la case en miroir.
  const PST = [];
  for (let t = 1; t <= 7; t++) {
    PST[t] = new Int16Array(128);
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) PST[t][r * 16 + f] = T[t][(7 - r) * 8 + f];
  }
  const mirror = s => (7 - (s >> 4)) * 16 + (s & 7);
  const PASSED = [0, 5, 10, 20, 40, 70, 110, 0];
  const dist = (a, b) => Math.max(Math.abs((a >> 4) - (b >> 4)), Math.abs((a & 7) - (b & 7)));
  const edge = s => { const r = s >> 4, f = s & 7; return Math.max(Math.abs(2 * r - 7), Math.abs(2 * f - 7)) >> 1; };   // 0 au centre … 3 au bord

  function evaluate() {
    let mat = [0, 0], pos = [0, 0], npm = [0, 0], cnt = [new Int8Array(7), new Int8Array(7)], bishopSq = [-1, -1];
    const wp = [9, 9, 9, 9, 9, 9, 9, 9], bp = [-1, -1, -1, -1, -1, -1, -1, -1];   // pion blanc le moins avancé / noir le moins avancé, par colonne
    const wPawns = [], bPawns = [];
    for (let s = 0; s < 120; s++) {
      if (s & 0x88) { s += 7; continue; }
      const pc = board[s];
      if (!pc) continue;
      const c = pc > 0 ? 0 : 1, t = pc > 0 ? pc : -pc;
      cnt[c][t]++;
      if (t === K) continue;
      mat[c] += VAL[t];
      pos[c] += PST[t][c ? mirror(s) : s];
      if (t === P) {
        const f = s & 7, r = s >> 4;
        if (c === 0) { wPawns.push(s); if (r < wp[f]) wp[f] = r; } else { bPawns.push(s); if (r > bp[f]) bp[f] = r; }
      } else { npm[c] += VAL[t]; if (t === B) bishopSq[c] = s; }
    }
    // Pions passés : plus aucun pion adverse devant, ni sur les colonnes voisines.
    for (const s of wPawns) {
      const f = s & 7, r = s >> 4;
      let free = true;
      for (let g = f - 1; g <= f + 1; g++) if (g >= 0 && g < 8 && bp[g] > r) free = false;
      if (free) pos[0] += PASSED[r];
    }
    for (const s of bPawns) {
      const f = s & 7, r = s >> 4;
      let free = true;
      for (let g = f - 1; g <= f + 1; g++) if (g >= 0 && g < 8 && wp[g] < r) free = false;
      if (free) pos[1] += PASSED[7 - r];
    }
    if (cnt[0][B] >= 2) pos[0] += 30;
    if (cnt[1][B] >= 2) pos[1] += 30;
    // Le roi : à l'abri tant qu'il reste des pièces, actif en finale.
    const total = npm[0] + npm[1], end = total >= 3000 ? 0 : (3000 - total) / 3000;
    const k0 = king[0], k1 = king[1];
    pos[0] += PST[6][k0] * (1 - end) + PST[7][k0] * end;
    pos[1] += PST[6][mirror(k1)] * (1 - end) + PST[7][mirror(k1)] * end;
    let score = mat[0] + pos[0] - mat[1] - pos[1];
    // Avantage décisif sans pions à promouvoir : repousser le roi adverse au bord et approcher le sien.
    for (let c = 0; c < 2; c++) {
      const o = 1 - c;
      if (mat[o] === 0 && npm[c] >= 500 || (mat[o] === 0 && cnt[c][B] + cnt[c][N] >= 2)) {
        const lk = king[o], wk = king[c];
        let push = edge(lk) * 40 + (7 - dist(lk, wk)) * 12;
        if (cnt[c][B] === 1 && cnt[c][N] === 1 && npm[c] < 700) {     // fou + cavalier : le mat se donne dans le coin de la couleur du fou
          const dark = ((bishopSq[c] >> 4) + (bishopSq[c] & 7)) % 2 === 0;
          // Plus le roi adverse est loin de la grande diagonale opposée, plus il est près d'un « bon » coin.
          const f = dark ? (lk & 7) : 7 - (lk & 7), r = lk >> 4;
          push = Math.abs(7 - f - r) * 60 + edge(lk) * 25 + (7 - dist(lk, wk)) * 20;
        }
        score += (c === 0 ? 1 : -1) * (300 + push);
      }
    }
    return side > 0 ? score : -score;
  }

  /* ---------- Recherche ---------- */
  const TT_SIZE = 1 << 20, TT_MASK = TT_SIZE - 1;
  const ttHi = new Int32Array(TT_SIZE), ttLo = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE);
  const ttVal = new Int16Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
  const killers = new Int32Array(2 * 128), hist = new Int32Array(2 * 128 * 128);
  const lists = [];
  for (let i = 0; i < 128; i++) lists.push(new Int32Array(256));
  const scores = new Int32Array(256);
  let nodes = 0, deadline = 0, stopped = false;
  class Stop extends Error { }

  function repeated() {
    const lim = Math.max(0, hp - half);
    for (let i = hp - 2; i >= lim; i -= 2) if (HL[i] === hLo && HH[i] === hHi) return true;
    return false;
  }
  function order(list, n, ply, best) {
    const c = side > 0 ? 0 : 1;
    for (let i = 0; i < n; i++) {
      const m = list[i], cap = board[TO(m)];
      let s;
      if (m === best) s = 1 << 30;
      else if (cap || KIND(m) === 1) s = (1 << 24) + VAL[cap ? Math.abs(cap) : P] * 16 - Math.abs(board[FROM(m)]);
      else if (PROMO(m) === Q) s = (1 << 24) - 1;
      else if (m === killers[ply * 2] || m === killers[ply * 2 + 1]) s = 1 << 20;
      else s = hist[(c * 128 + FROM(m)) * 128 + TO(m)];
      scores[i] = s;
    }
    for (let i = 1; i < n; i++) {                 // tri par insertion : les listes sont courtes
      const m = list[i], s = scores[i];
      let j = i - 1;
      while (j >= 0 && scores[j] < s) { list[j + 1] = list[j]; scores[j + 1] = scores[j]; j--; }
      list[j + 1] = m; scores[j + 1] = s;
    }
  }
  function quiesce(alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) throw new Stop();
    const stand = evaluate();
    if (ply >= 100) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const list = lists[ply], n = generate(list, true);
    order(list, n, ply, 0);
    for (let i = 0; i < n; i++) {
      const m = list[i];
      if (!make(m)) continue;
      const v = -quiesce(-beta, -alpha, ply + 1);
      unmake(m);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function search(depth, alpha, beta, ply, allowNull) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) throw new Stop();
    if (ply > 0 && (half >= 100 || repeated())) return 0;
    const check = inCheck(side);
    if (check) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);
    if (ply >= 100) return evaluate();
    const idx = hLo & TT_MASK;
    let best = 0;
    if (ttHi[idx] === hHi && ttLo[idx] === hLo) {
      best = ttMove[idx];
      if (ply > 0 && ttDepth[idx] >= depth) {
        let v = ttVal[idx];
        if (v > MATE - 200) v -= ply; else if (v < -MATE + 200) v += ply;
        const fl = ttFlag[idx];
        if (fl === 0 || (fl === 1 && v >= beta) || (fl === 2 && v <= alpha)) return v;
      }
    }
    // « Et si je passais mon tour ? » : si la position reste excellente, inutile de chercher plus loin.
    if (allowNull && !check && depth >= 3 && ply > 0 && beta < MATE - 200) {
      let big = 0;
      for (let s = 0; s < 120; s++) { if (s & 0x88) { s += 7; continue; } const p = board[s] * side; if (p > P && p < K) big++; }
      if (big >= 2 && evaluate() >= beta) {
        makeNull();
        const v = -search(depth - 3, -beta, -beta + 1, ply + 1, false);
        unmakeNull();
        if (v >= beta) return beta;
      }
    }
    const list = lists[ply], n = generate(list, false);
    order(list, n, ply, best);
    const a0 = alpha, c = side > 0 ? 0 : 1;
    let legal = 0, bestV = -INF, bestM = 0;
    for (let i = 0; i < n; i++) {
      const m = list[i], quiet = !board[TO(m)] && KIND(m) !== 1;
      if (!make(m)) continue;
      legal++;
      let v;
      if (legal === 1) v = -search(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        // Les coups calmes classés loin dans la liste sont d'abord regardés moins profondément.
        const less = (legal > 4 && depth >= 3 && quiet && !check) ? 1 : 0;
        v = -search(depth - 1 - less, -alpha - 1, -alpha, ply + 1, true);
        if (less && v > alpha) v = -search(depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && v < beta) v = -search(depth - 1, -beta, -alpha, ply + 1, true);
      }
      unmake(m);
      if (v > bestV) { bestV = v; bestM = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (quiet) {
          if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
          hist[(c * 128 + FROM(m)) * 128 + TO(m)] += depth * depth;
        }
        break;
      }
    }
    if (!legal) return check ? -MATE + ply : 0;      // mat ou pat
    let store = bestV;
    if (store > MATE - 200) store += ply; else if (store < -MATE + 200) store -= ply;
    ttHi[idx] = hHi; ttLo[idx] = hLo; ttMove[idx] = bestM; ttVal[idx] = store; ttDepth[idx] = depth;
    ttFlag[idx] = bestV <= a0 ? 2 : bestV >= beta ? 1 : 0;
    return bestV;
  }

  const describe = m => ({ from: nameOf(FROM(m)), to: nameOf(TO(m)), promo: PROMO(m) ? LETTER[PROMO(m)] : null });
  function legalMoves() {
    const list = new Int32Array(256), n = generate(list, false), out = [];
    for (let i = 0; i < n; i++) if (make(list[i])) { unmake(list[i]); out.push(list[i]); }
    return out;
  }
  function clearSearch() { ttHi.fill(0); ttLo.fill(0); ttDepth.fill(0); killers.fill(0); hist.fill(0); }

  // Note tous les coups de la position, du meilleur au moins bon.
  // options : ms (temps de réflexion), depth (profondeur maximale).
  // Résultat : [{ from, to, promo, score }], score en centièmes de pion pour le camp au trait.
  function think(options) {
    const ms = options.ms || 1000, maxDepth = options.depth || 64;
    deadline = Date.now() + ms; nodes = 0;
    clearSearch();
    const moves = legalMoves();
    let done = moves.map(m => ({ m, v: 0 })), reached = 0;
    // Quand le temps est écoulé, la recherche s'arrête en plein calcul : on remet la position exactement comme elle était.
    const keep = { board: board.slice(), side, castle, ep, half, k0: king[0], k1: king[1], hLo, hHi, sp, hp };
    if (moves.length > 1) {
      try {
        for (let d = 1; d <= maxDepth; d++) {
          const round = [];
          let alpha = -INF;
          // Le meilleur coup de la profondeur précédente d'abord ; chaque coup reçoit une vraie note.
          const sorted = done.slice().sort((a, b) => b.v - a.v);
          for (const x of sorted) {
            make(x.m);
            const v = -search(d - 1, -INF, options.exact ? INF : -alpha + (options.window || 0), 1, true);
            unmake(x.m);
            round.push({ m: x.m, v });
            if (v > alpha) alpha = v;
          }
          done = round; reached = d;
          if (alpha > MATE - 200 || alpha < -MATE + 200) break;      // mat trouvé (ou inévitable)
        }
      } catch (e) {
        board.set(keep.board); side = keep.side; castle = keep.castle; ep = keep.ep; half = keep.half;
        king[0] = keep.k0; king[1] = keep.k1; hLo = keep.hLo; hHi = keep.hHi; sp = keep.sp; hp = keep.hp;
        if (!(e instanceof Stop)) throw e;
      }
    }
    done.sort((a, b) => b.v - a.v);
    return { depth: reached, nodes, moves: done.map(x => Object.assign(describe(x.m), { score: x.v })) };
  }
  function perft(depth) {
    if (depth === 0) return 1;
    const list = new Int32Array(256), n = generate(list, false);
    let total = 0;
    for (let i = 0; i < n; i++) if (make(list[i])) { total += perft(depth - 1); unmake(list[i]); }
    return total;
  }

  // Joue un coup pour de bon (tests et parties entre moteurs).
  function play(mv) {
    for (const m of legalMoves()) {
      const d = describe(m);
      if (d.from === mv.from && d.to === mv.to && (d.promo || null) === (mv.promo || null)) { make(m); sp = 0; return true; }
    }
    return false;
  }
  const api = { set, setFen, think, perft, evaluate, play, MATE, legal: () => legalMoves().map(describe), inCheck: () => inCheck(side), half: () => half };
  root.MoteurEchecs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
