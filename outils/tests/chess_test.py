import sys
from playwright.sync_api import sync_playwright
out=sys.argv[1]
MAT=r"""
(v) => { const E=window.Echiquier, B=window.EchiquierBot; E.setMode("mat", v); let n=0, worst=0;
  while (E.state().game.phase !== "over" && n < 220) { const g=E.state().game; let a;
    if (g.turn === "w") { a=B.chessHint(); }
    else { const t=performance.now(); a=B.chooseAction(3); worst=Math.max(worst,performance.now()-t); }
    if (!E.doAction(a)) return {err:"refusé", a, n}; n++; }
  const g=E.state().game; return {plies:n, res:g.result, worst:Math.round(worst)}; }"""
GAME=r"""
([lw, lb, max]) => { const E=window.Echiquier, B=window.EchiquierBot; E.setMode("classique"); let n=0, worst=0; const log=[];
  while (E.state().game.phase !== "over" && n < max) { const g=E.state().game; const t=performance.now();
    const a=B.chooseAction(g.turn==="w"?lw:lb); worst=Math.max(worst,performance.now()-t);
    if (!a || !E.doAction(a)) return {err:"refusé", a, n}; log.push(a.from+a.to+(a.promo||"")); n++; }
  const g=E.state().game; return {plies:n, res:g.result, worst:Math.round(worst), castle:g.castle, log:log.join(" ").slice(0,300)}; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':900,'height':1200}); pg.set_default_timeout(900000); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8766/index.html"); pg.wait_for_timeout(500)
    for v in range(6): print("mat",v,pg.evaluate(MAT,v))
    print("fort vs facile", pg.evaluate(GAME,[3,1,300]))
    print("moyen vs fort", pg.evaluate(GAME,[2,3,300]))
    # interface : roque et promotion à la souris
    print(pg.evaluate(r"""()=>{const E=window.Echiquier; E.setMode("classique"); const s=E.sim.save();
      const m={}; const put=(q,c)=>m[q]={kind:"std",code:c}; put("e1","wK");put("h1","wR");put("a1","wR");put("b7","wP");put("e8","bK");put("h7","bP");
      s.model=m; E.sim.load(s); E.refresh(); return [E.sim.movesFrom("e1").slice().sort().join(","), E.sim.movesFrom("b7").join(",")]}"""))
    def click(sq):
        box=pg.evaluate("()=>{const r=document.getElementById('board').getBoundingClientRect(); return [r.left,r.top,r.width]}")
        f="abcdefgh".index(sq[0]); r=int(sq[1]); s=box[2]/8
        pg.mouse.click(box[0]+(f+.5)*s, box[1]+(8-r+.5)*s)
    click("e1"); click("g1"); pg.wait_for_timeout(200)
    print("après roque:", pg.evaluate("()=>{const s=window.Echiquier.state(); return [s.model.g1&&s.model.g1.code, s.model.f1&&s.model.f1.code, s.game.castle, s.game.turn]}"))
    click("e8"); click("d7"); pg.wait_for_timeout(200)
    click("b7"); click("b8"); pg.wait_for_timeout(300)
    print("fenêtre de promotion:", pg.evaluate("()=>!!document.getElementById('promo')")); pg.screenshot(path=out+"/promo.png")
    pg.click(".promo-btn[title='Cavalier']"); pg.wait_for_timeout(200)
    print("après promotion:", pg.evaluate("()=>{const s=window.Echiquier.state(); return [s.model.b8&&s.model.b8.code, !!document.getElementById('promo'), s.game.turn, s.game.note]}"))
    # exercice de mat avec Mad : contrôles, indice
    pg.evaluate("()=>{localStorage.setItem('echecs-mad-bot-v1', JSON.stringify({level:3, side:'w'}))}"); pg.reload(); pg.wait_for_timeout(500)
    pg.select_option('#modeSel','mat'); pg.wait_for_timeout(1200)
    print("mat: camp imposé", pg.evaluate("()=>[window.EchiquierBot.state().side, !!document.getElementById('botSide'), !!document.getElementById('botHint'), document.querySelector('.bot-line').textContent, window.Echiquier.state().game.turn]"))
    pg.click('#botHint'); pg.wait_for_timeout(1500); pg.screenshot(path=out+"/mat.png")
    pg.select_option('#modeSel','classique'); pg.wait_for_timeout(3500)
    print("classique: Mad blancs a joué", pg.evaluate("()=>[window.EchiquierBot.state().side, window.Echiquier.state().game.moves, !!document.getElementById('botSide')]"))
    pg.screenshot(path=out+"/classique.png")
    print("ERR",errs); b.close()
