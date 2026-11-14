/* =====================================================================
   JEU EN LIGNE — Échiquier d'animation (Échecs et Mad)

   Deux navigateurs se connectent directement l'un à l'autre (WebRTC), mis en
   relation par le service gratuit PeerJS. Aucun compte, aucun serveur à gérer.

   Principe :
   - la personne qui crée la partie est « l'hôte » : son échiquier fait foi ;
   - l'hôte envoie l'état complet de la partie à chaque changement ;
   - l'invité envoie seulement ses coups, que l'hôte vérifie puis rediffuse ;
   - les personnes suivantes qui rejoignent avec le même code sont spectatrices.

   Ce fichier ne touche pas aux règles : il passe par window.Echiquier.
   ===================================================================== */
(function () {
  "use strict";

  const E = window.Echiquier;
  if (!E) return;
  if (!E.acces.enLigne) return;            // pas encore publié (voir ECHIQUIER_PUBLIE dans index.html)

  const ID_PREFIX = "echecsetmad-echiquier-";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";   // sans I ni O, trop proches de 1 et 0
  const CODE_LEN = 4;
  const URL_PARAM = "partie";
  const LIBS = { peer: "vendor/peerjs.min.js", qr: "vendor/qrcode.js" };
  const PING_MS = 4000, LOST_MS = 13000, RETRY_MS = 3000, MAX_RETRIES = 40;
  const CONNECT_MS = 15000, MAX_FIRST_TRIES = 3;   // première connexion : on n'insiste pas indéfiniment

  const net = {
    mode: null,          // null | "host" | "guest"
    status: "idle",      // idle | opening | waiting | connected | reconnecting | error | ended
    error: "",
    code: "",
    peer: null,
    ver: 0,              // version de l'état, incrémentée par l'hôte
    side: "w",           // camp joué par l'hôte
    guests: [],          // hôte : [{conn, role, seen}]
    conn: null,          // invité : connexion vers l'hôte
    myRole: null,        // invité : "player" | "spectator"
    mySide: null,        // invité : camp joué
    seen: 0, retries: 0, timer: null, ping: null, everConnected: false, viewKey: ""
  };

  const other = c => (c === "w" ? "b" : "w");
  const $ = id => document.getElementById(id);

  /* ---------- Chargement à la demande des bibliothèques ---------- */
  const loaded = {};
  function loadLib(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src; s.onload = resolve; s.onerror = () => { delete loaded[src]; reject(new Error(src)); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }
  // Réglage facultatif (tests, serveur PeerJS personnel) : localStorage["echecs-mad-peer"] = options JSON.
  // Par défaut : plusieurs serveurs pour que deux appareils sur des réseaux différents se trouvent
  // (STUN : découvrir son adresse publique ; TURN : relais de secours fourni par PeerJS).
  const ICE = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" }
  ];
  function peerOptions() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem("echecs-mad-peer") || "null") || {}; } catch (_) { }
    if (!o.config) o.config = { iceServers: ICE, sdpSemantics: "unified-plan" };
    return o;
  }
  // Ce qui s'est passé pendant la tentative de connexion, pour expliquer un échec.
  const diag = { signal: false, error: "", ice: "", kinds: {} };
  function watch(conn) {
    try {
      const pc = conn.peerConnection;
      if (!pc) return;
      pc.addEventListener("iceconnectionstatechange", () => { diag.ice = pc.iceConnectionState; });
      pc.addEventListener("icecandidate", e => {
        const c = e.candidate && e.candidate.candidate;
        const m = c && / typ ([a-z]+)/.exec(c);
        if (m) diag.kinds[m[1]] = true;
      });
    } catch (_) { }
  }
  function diagText() {
    const kinds = Object.keys(diag.kinds).join("+") || "aucune";
    const err = String(diag.error || "").replace(/[^a-z-]/gi, "") || "aucune";
    return "Détail technique : mise en relation " + (diag.signal ? "ok" : "sans réponse") + " · liaison " + (diag.ice || "non commencée") +
      " · adresses " + kinds + " · erreur " + err + ".";
  }
  function whyFailed() {
    if (!diag.signal) return "Le service de mise en relation ne répond pas depuis cet appareil. Vérifiez la connexion Internet, ou essayez un autre réseau.";
    if (diag.error === "peer-unavailable") return "Aucune partie ouverte ne correspond au code " + net.code + ". Vérifiez que l'écran de la personne qui a créé la partie est resté allumé, sur la page du jeu.";
    return "Les deux appareils n'arrivent pas à se joindre. Cela arrive quand ils sont sur deux réseaux différents (par exemple le Wi-Fi d'un côté, la 4G de l'autre) : mettez-les sur le même Wi-Fi, ou sur le partage de connexion du même téléphone.";
  }
  const peerId = code => ID_PREFIX + code.toLowerCase();
  function randomCode() {
    let s = "";
    for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }
  function shareLink() {
    return location.origin + location.pathname + "?" + URL_PARAM + "=" + net.code;
  }

  /* ---------- État de la partie vu du réseau ---------- */
  function refereedGame() {
    const st = E.state();
    return st.game && st.game.referee ? st.game : null;
  }
  function turnOk(side) {
    const g = refereedGame();
    if (!g) return true;                       // déplacement libre : pas de tour
    return g.phase !== "over" && g.turn === side;
  }
  const hostPlayer = () => net.guests.find(g => g.role === "player") || null;

  E.guards.play.push(() => {
    if (!net.mode) return true;
    if (net.mode === "guest") {
      if (net.status !== "connected" || net.myRole !== "player") return false;
      return turnOk(net.mySide);
    }
    if (!hostPlayer()) return true;            // seul (ou avec des spectateurs) : l'hôte joue les deux camps
    return turnOk(net.side);
  });
  E.guards.control.push(() => net.mode !== "guest");
  // Un spectateur ne dessine pas et n'efface pas les flèches de la partie.
  E.guards.annotate.push(() => !(net.mode === "guest" && net.myRole !== "player"));

  E.statusExtras.push(() => {
    if (!net.mode) return "";
    if (net.mode === "guest") {
      if (net.status !== "connected") return "Connexion à la partie en cours…";
      if (net.myRole !== "player") return "Vous regardez la partie.";
      const g = refereedGame();
      if (!g || g.phase === "over") return "";
      return g.turn === net.mySide ? "À vous de jouer." : "L'adversaire réfléchit…";
    }
    if (!hostPlayer()) return `En attente d'un adversaire · code ${net.code}`;
    const g = refereedGame();
    if (!g || g.phase === "over") return "";
    return g.turn === net.side ? "À vous de jouer." : "L'adversaire réfléchit…";
  });

  /* ---------- Envoi ---------- */
  function send(conn, msg) {
    try { if (conn && conn.open) conn.send(msg); } catch (err) { console.warn("[en ligne] envoi impossible", err); }
  }
  function broadcast(msg, except) {
    net.guests.forEach(g => { if (g !== except) send(g.conn, msg); });
  }
  function stateMsg() { return { t: "state", ver: net.ver, state: E.exportState() }; }

  // Changement local de la partie (coup, nouvelle partie, changement de mode…)
  E.on("change", d => {
    if (net.mode === "host") {
      net.ver++;
      broadcast(stateMsg());
      applyView(net.side);
      renderPanel();
    } else if (net.mode === "guest" && net.myRole === "player") {
      if (d.action) send(net.conn, { t: "act", a: d.action, base: net.ver });
      else {
        const st = E.exportState();
        send(net.conn, { t: "prop", base: net.ver, model: st.model, sideToMove: st.sideToMove });
      }
    }
  });
  // Flèches et surbrillances
  E.on("shapes", () => {
    const msg = { t: "shapes", shapes: E.getShapes() };
    if (net.mode === "host") broadcast(msg);
    else if (net.mode === "guest" && net.myRole === "player") send(net.conn, msg);
  });

  /* ---------- Hôte ---------- */
  async function host() {
    if (net.mode) return;
    net.mode = "host"; net.status = "opening"; net.error = ""; net.ver = 1; net.guests = [];
    net.side = "w"; net.viewKey = "";
    renderAll();
    try { await loadLib(LIBS.peer); } catch (_) { return fail("Impossible de charger le module de jeu en ligne."); }
    openHostPeer(0);
  }
  function openHostPeer(attempt) {
    net.code = randomCode();
    const peer = new window.Peer(peerId(net.code), peerOptions());
    net.peer = peer;
    peer.on("open", () => {
      if (net.peer !== peer) return;
      net.status = "waiting";
      startPing();
      renderAll();
    });
    peer.on("connection", conn => {
      conn.on("open", () => addGuest(conn));
    });
    peer.on("disconnected", () => {
      // Le service de mise en relation a décroché : les joueurs déjà connectés ne sont pas touchés.
      setTimeout(() => { if (net.peer === peer && !peer.destroyed) { try { peer.reconnect(); } catch (_) { } } }, 2000);
    });
    peer.on("error", err => {
      if (net.peer !== peer) return;
      if (err && err.type === "unavailable-id" && net.status === "opening" && attempt < 6) {
        try { peer.destroy(); } catch (_) { }
        openHostPeer(attempt + 1);            // code déjà pris : on en tire un autre
        return;
      }
      if (net.status === "opening") fail("Le service de mise en relation est injoignable. Vérifiez la connexion Internet.");
    });
  }
  function addGuest(conn) {
    const g = { conn, role: hostPlayer() ? "spectator" : "player", seen: Date.now() };
    net.guests.push(g);
    conn.on("data", m => onHostData(g, m));
    conn.on("close", () => removeGuest(g));
    conn.on("error", () => removeGuest(g));
    send(conn, {
      t: "hello", role: g.role, side: g.role === "player" ? other(net.side) : null,
      ver: net.ver, state: E.exportState()
    });
    net.status = "connected";
    if (g.role === "player") { E.toast("Un adversaire a rejoint la partie"); open = false; }
    renderAll();
  }
  function removeGuest(g) {
    const i = net.guests.indexOf(g);
    if (i < 0) return;
    net.guests.splice(i, 1);
    try { g.conn.close(); } catch (_) { }
    // La place de joueur reste libre : la prochaine personne qui rejoint (ou l'adversaire qui revient) la prend.
    if (g.role === "player") E.toast("L'adversaire s'est déconnecté", true);
    if (!net.guests.length && net.mode === "host") net.status = "waiting";
    renderAll();
  }
  function onHostData(g, m) {
    g.seen = Date.now();
    if (!m || typeof m !== "object") return;
    if (m.t === "ping") return;
    if (m.t === "bye") { removeGuest(g); return; }
    if (g.role !== "player") return;           // les spectateurs ne font que regarder
    if (m.t === "act") {
      const game = refereedGame();
      const fresh = m.base === net.ver && game && game.turn === other(net.side);
      if (!fresh || !E.doAction(m.a)) send(g.conn, stateMsg());   // refusé : on renvoie l'état qui fait foi
    } else if (m.t === "prop") {
      if (m.base === net.ver && !refereedGame()) {
        const st = E.exportState();
        st.model = m.model || {}; st.sideToMove = m.sideToMove || st.sideToMove;
        E.importState(st);
        net.ver++;
        broadcast(stateMsg());
      } else send(g.conn, stateMsg());
    } else if (m.t === "shapes") {
      E.setShapes(m.shapes || []);
      broadcast({ t: "shapes", shapes: m.shapes || [] }, g);
    }
  }
  function setHostSide(side) {
    net.side = side === "b" ? "b" : "w";
    net.viewKey = "";
    applyView(net.side);
    const p = hostPlayer();
    if (p) send(p.conn, { t: "role", role: "player", side: other(net.side) });
    renderAll();
  }

  /* ---------- Invité ---------- */
  async function join(code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, CODE_LEN);
    if (code.length !== CODE_LEN) { E.toast("Le code comporte " + CODE_LEN + " lettres", true); return; }
    if (net.mode) return;
    net.mode = "guest"; net.code = code; net.status = "opening"; net.error = "";
    net.retries = 0; net.everConnected = false; net.myRole = null; net.mySide = null; net.viewKey = "";
    renderAll();
    try { await loadLib(LIBS.peer); } catch (_) { return fail("Impossible de charger le module de jeu en ligne."); }
    openGuestPeer();
  }
  function openGuestPeer() {
    if (net.mode !== "guest") return;
    const peer = new window.Peer(peerOptions());
    net.peer = peer;
    diag.signal = false; diag.error = ""; diag.ice = ""; diag.kinds = {};
    // Sans réponse du service de mise en relation, on ne reste pas bloqué sur « Connexion en cours ».
    clearTimeout(net.timer);
    net.timer = setTimeout(() => { if (net.peer === peer && net.status !== "connected") lost(); }, CONNECT_MS);
    peer.on("open", () => {
      if (net.peer !== peer) return;
      diag.signal = true;
      const conn = peer.connect(peerId(net.code), { reliable: true });
      net.conn = conn;
      watch(conn);
      // Certains réseaux (écoles, entreprises) bloquent ce type de connexion : sans réponse, on réessaie.
      clearTimeout(net.timer);
      net.timer = setTimeout(() => { if (net.conn === conn && net.status !== "connected") lost(); }, CONNECT_MS);
      conn.on("open", () => { net.seen = Date.now(); startPing(); });
      conn.on("data", m => { if (net.conn === conn) onGuestData(m); });
      conn.on("close", () => { if (net.conn === conn) lost(); });
      conn.on("error", () => { if (net.conn === conn) lost(); });
    });
    peer.on("error", err => {
      if (net.peer !== peer) return;
      const type = err && err.type;
      diag.error = type || "inconnue";
      if (type === "peer-unavailable" && !net.everConnected && net.retries === 0) {
        fail("Aucune partie ne correspond au code " + net.code + ". Vérifiez-le auprès de la personne qui a créé la partie.");
      } else lost();
    });
  }
  function onGuestData(m) {
    net.seen = Date.now();
    if (!m || typeof m !== "object" || m.t === "ping") return;
    if (m.t === "hello") {
      clearTimeout(net.timer);
      net.status = "connected"; net.everConnected = true; net.retries = 0;
      net.myRole = m.role; net.mySide = m.side; net.ver = m.ver;
      E.importState(m.state);
      applyView(net.mySide);
      open = false;                             // connecté : on laisse la place à l'échiquier
      if (!net.helloShown) { net.helloShown = true; E.toast("Connecté à la partie " + net.code); }
      renderAll();
    } else if (m.t === "state") {
      net.ver = m.ver;
      E.importState(m.state);
      applyView(net.mySide);
      renderPanel();
    } else if (m.t === "role") {
      net.myRole = m.role; net.mySide = m.side; net.viewKey = "";
      applyView(net.mySide);
      renderAll();
    } else if (m.t === "shapes") {
      E.setShapes(m.shapes || []);
    } else if (m.t === "bye") {
      stopNet();
      net.mode = "guest"; net.status = "ended";
      renderAll();
    }
  }
  // Celui qui joue le camp « du haut » voit l'échiquier retourné (une fois par partie, il peut ensuite le tourner).
  function applyView(side) {
    const st = E.state();
    const key = st.modeId + "/" + st.variantIdx + "/" + side;
    if (key === net.viewKey) return;
    net.viewKey = key;
    const want = side === "b" ? "black" : "white";
    if (st.orientation !== want) E.setOrientation(want);
  }
  function lost() {
    if (net.mode !== "guest" || net.status === "error" || net.status === "ended") return;
    const peer = net.peer;
    net.peer = null; net.conn = null;
    try { if (peer) peer.destroy(); } catch (_) { }
    stopPing();
    clearTimeout(net.timer);
    net.retries++;
    if (!net.everConnected && net.retries >= MAX_FIRST_TRIES) {
      return fail("Connexion impossible. " + whyFailed() + "<br><small>" + diagText() + "</small>");
    }
    if (net.retries > MAX_RETRIES) return fail("La connexion a été perdue.");
    net.status = "reconnecting";
    renderAll();
    net.timer = setTimeout(openGuestPeer, RETRY_MS);
  }

  /* ---------- Commun ---------- */
  function startPing() {
    stopPing();
    net.ping = setInterval(() => {
      const now = Date.now();
      if (net.mode === "host") {
        broadcast({ t: "ping" });
        net.guests.slice().forEach(g => { if (now - g.seen > LOST_MS) removeGuest(g); });
      } else if (net.mode === "guest" && net.conn) {
        send(net.conn, { t: "ping" });
        if (now - net.seen > LOST_MS) lost();
      }
    }, PING_MS);
  }
  function stopPing() { clearInterval(net.ping); net.ping = null; }
  function stopNet() {
    stopPing();
    clearTimeout(net.timer);
    const peer = net.peer;
    net.peer = null; net.conn = null; net.guests = [];
    try { if (peer) peer.destroy(); } catch (_) { }
  }
  function fail(text) {
    stopNet();
    net.status = "error"; net.error = text;
    renderAll();
  }
  function leave() {
    if (net.mode === "host") broadcast({ t: "bye" });
    const wasGuest = net.mode === "guest";
    if (wasGuest) send(net.conn, { t: "bye" });
    stopNet();
    net.mode = null; net.status = "idle"; net.error = ""; net.code = ""; net.helloShown = false;
    if (new URLSearchParams(location.search).has(URL_PARAM)) {
      try { history.replaceState(null, "", location.pathname); } catch (_) { }
    }
    if (wasGuest) E.setOrientation("white");
    renderAll();
  }
  window.addEventListener("pagehide", () => {
    if (net.mode === "host") broadcast({ t: "bye" });
    else if (net.mode === "guest") send(net.conn, { t: "bye" });
  });

  /* ---------- Interface ---------- */
  const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/></svg>`;
  let btn, panel, open = false;

  function build() {
    const bar = document.querySelector(".modebar");
    if (!bar) return;
    btn = document.createElement("button");
    btn.className = "btn net-btn"; btn.id = "btnNet"; btn.type = "button";
    btn.addEventListener("click", () => { open = !open; renderAll(); });
    bar.appendChild(btn);
    panel = document.createElement("div");
    panel.className = "netpanel hidden"; panel.id = "netPanel";
    bar.insertAdjacentElement("afterend", panel);
  }

  function stateLine() {
    const dot = cls => `<span class="net-dot ${cls}"></span>`;
    if (net.status === "error") return dot("off") + net.error;
    if (net.status === "ended") return dot("off") + "La personne qui avait créé la partie l'a quittée.";
    if (net.status === "opening") return dot("wait") + "Connexion en cours…";
    if (net.status === "reconnecting") return dot("wait") + (net.everConnected
      ? "Connexion perdue, nouvelle tentative…"
      : "Toujours pas de réponse, nouvel essai (" + (net.retries + 1) + " sur " + MAX_FIRST_TRIES + ")…");
    const m = E.mode();
    if (net.mode === "host") {
      const p = hostPlayer(), spect = net.guests.length - (p ? 1 : 0);
      let s = p ? dot("on") + "Adversaire connecté" : dot("wait") + "En attente d'un adversaire…";
      if (spect > 0) s += " · " + spect + (spect > 1 ? " spectateurs" : " spectateur");
      return s;
    }
    if (net.myRole === "player") {
      const side = m.sides && net.mySide ? " · vous jouez : " + m.sides[net.mySide] : "";
      return dot("on") + "Connecté" + side;
    }
    return dot("on") + "Connecté · vous regardez la partie";
  }

  function renderButton() {
    if (!btn) return;
    const active = !!net.mode;
    const cls = net.status === "connected" ? "on" : (net.status === "error" || net.status === "ended") ? "off" : "wait";
    btn.classList.toggle("active", active);
    btn.innerHTML = active
      ? `<span class="net-dot ${cls}"></span><span>En ligne · ${net.code}</span>`
      : ICON + "<span>Jouer en ligne</span>";
    btn.setAttribute("aria-expanded", String(open));
  }

  function renderPanel() {
    if (!panel) return;
    panel.classList.toggle("hidden", !open);
    if (!open) return;
    const m = E.mode();
    let html = "";
    if (!net.mode) {
      html = `
        <div class="net-title">Jouer en ligne à deux</div>
        <p class="net-hint">Créez une partie, puis donnez le code ou le lien à l'autre joueur. Le mode de jeu est celui
          de la personne qui crée la partie ; elle peut en changer à tout moment.</p>
        <div class="net-row">
          <button class="btn primary" id="netCreate" type="button">Créer une partie</button>
          <span class="net-or">ou</span>
          <input id="netCode" class="net-input" maxlength="${CODE_LEN}" placeholder="CODE" autocomplete="off"
            autocapitalize="characters" spellcheck="false" aria-label="Code de la partie">
          <button class="btn" id="netJoin" type="button">Rejoindre</button>
        </div>`;
    } else if (net.mode === "host") {
      const ready = net.status !== "opening" && net.status !== "error";
      const sides = m.sides
        ? `<label class="net-side">Je joue
             <select id="netSide">
               <option value="w"${net.side === "w" ? " selected" : ""}>${m.sides.w}</option>
               <option value="b"${net.side === "b" ? " selected" : ""}>${m.sides.b}</option>
             </select></label>`
        : "";
      html = `
        <div class="net-title">Partie en ligne</div>
        ${ready ? `
        <div class="net-share">
          <div class="net-qr" id="netQr" aria-hidden="true"></div>
          <div class="net-sharetext">
            <div class="net-codebox"><span>Code de la partie</span><strong>${net.code}</strong></div>
            <div class="net-row">
              <input class="net-input link" id="netLink" readonly value="${shareLink()}" aria-label="Lien de la partie">
              <button class="btn" id="netCopy" type="button">Copier le lien</button>
            </div>
            ${sides}
          </div>
        </div>` : ""}
        <div class="net-state">${stateLine()}</div>
        <div class="net-row"><button class="btn" id="netLeave" type="button">Quitter la partie en ligne</button></div>`;
    } else {
      const retry = net.status === "error" || net.status === "ended";
      html = `
        <div class="net-title">Partie en ligne · ${net.code}</div>
        <div class="net-state">${stateLine()}</div>
        <div class="net-row">
          ${retry && net.status === "error" ? `<button class="btn primary" id="netRetry" type="button">Réessayer</button>` : ""}
          <button class="btn" id="netLeave" type="button">${retry ? "Fermer" : "Quitter la partie en ligne"}</button>
        </div>`;
    }
    panel.innerHTML = html;

    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
    on("netCreate", "click", host);
    on("netJoin", "click", () => join($("netCode").value));
    on("netCode", "keydown", e => { if (e.key === "Enter") join($("netCode").value); });
    on("netCode", "input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ""); });
    on("netLeave", "click", leave);
    on("netRetry", "click", () => { const c = net.code; leave(); open = true; join(c); });
    on("netSide", "change", e => setHostSide(e.target.value));
    on("netLink", "focus", e => e.target.select());
    on("netCopy", "click", copyLink);
    if ($("netQr")) drawQr();
  }

  function copyLink() {
    const link = shareLink();
    const done = () => E.toast("Lien copié");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, fallback);
    } else fallback();
    function fallback() {
      const el = $("netLink");
      if (!el) return;
      el.focus(); el.select();
      try { document.execCommand("copy"); done(); } catch (_) { E.toast("Sélectionnez le lien pour le copier", true); }
    }
  }
  function drawQr() {
    loadLib(LIBS.qr).then(() => {
      const box = $("netQr");
      if (!box || !window.qrcode) return;
      const qr = window.qrcode(0, "M");
      qr.addData(shareLink());
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }).catch(() => { });
  }

  function renderAll() {
    renderButton();
    renderPanel();
    E.refresh();          // les droits de jeu et la ligne de statut dépendent de la connexion
  }

  build();
  renderButton();

  // Lien d'invitation : …/?partie=ABCD
  const invited = new URLSearchParams(location.search).get(URL_PARAM);
  if (invited) { open = true; join(invited); }

  // Petite poignée pour les tests.
  window.EchiquierNet = { host, join, leave, state: () => net };
})();
