import asyncio, sys
from playwright.async_api import async_playwright
S=sys.argv[1]
SOLVE='''([m,v]) => { const E=window.Echiquier, B=window.EchiquierBot; E.setMode(m,v); let n=0; const pawns=E.sim.piecesOf("b").length; const seq=[];
  while(E.state().game.phase!=="over" && n<20){ const a=B.soloHint(); if(!a) return {err:"no hint",n}; E.doAction(a); seq.push(a.to); n++; }
  const g=E.state().game; return {pawns, n, winner:g.result.winner, seq:seq.join(" "), reason:g.result.reason}; }'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        ctx=await b.new_context(viewport={'width':1000,'height':1300}, device_scale_factor=1)
        await ctx.add_init_script("window.__played=[]; window.Audio=function(src){ this.src=src; this.play=()=>{ window.__played.push(src); setTimeout(()=>this.onended&&this.onended(),30); return Promise.resolve(); }; this.pause=()=>{}; };")
        pg=await ctx.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8766/index.html'); await pg.wait_for_timeout(500)
        for m in ['defiTour','defiFou']:
            nv=await pg.evaluate("m=>window.Echiquier.MODES[m].variants.length",m)
            for v in range(nv): print(m,v,await pg.evaluate(SOLVE,[m,v]))
        print('tour défi 1 : coup sans prise refusé, mauvaise première prise =>', await pg.evaluate('''()=>{const E=window.Echiquier;E.setMode('defiTour',0);
           const quiet=E.doAction({t:'move',from:'e5',to:'e6'}); const t=E.sim.movesFrom('e5').slice().sort();
           E.doAction({t:'move',from:'e5',to:'g5'}); E.doAction({t:'move',from:'g5',to:'g7'}); E.doAction({t:'move',from:'g7',to:'d7'}); E.doAction({t:'move',from:'d7',to:'d3'});
           const g=E.state().game; return [quiet, t, g.phase, g.result]}'''))
        await pg.select_option('#modeSel','defiTour'); await pg.wait_for_timeout(300); await pg.screenshot(path=S+'/defi_tour.png')
        await pg.select_option('#modeSel','defiFou'); await pg.wait_for_timeout(300); await pg.click('#botHint'); await pg.wait_for_timeout(200); await pg.screenshot(path=S+'/defi_fou.png')
        # Loup : un mouton capture le loup
        await pg.select_option('#modeSel','loup'); await pg.wait_for_timeout(300)
        print('loup: variantes cachées', await pg.evaluate("()=>document.getElementById('variantSel').classList.contains('hidden')"),
              await pg.evaluate('''()=>{const E=window.Echiquier; E.doAction({t:'move',from:'e2',to:'e4'}); E.doAction({t:'move',from:'d8',to:'d5'});
                 const t=E.sim.movesFrom('e4').slice().sort(); E.doAction({t:'move',from:'e4',to:'d5'}); return [t, E.state().game.result]}'''))
        # Sanglier : passage de niveau
        LV='''(v)=>{const E=window.Echiquier; E.setMode('sanglier',v); const st=E.sim.save(); const m={...st.model}; delete m.d1; m.c6=st.model.d1; st.model=m; E.sim.load(st); E.refresh();
              const ok=E.doAction({t:'move',from:'c6',to:'b8'}); const s=E.state(); return [ok, s.variantIdx, s.game.phase, s.game.result && s.game.result.reason]}'''
        NOW="()=>{const s=window.Echiquier.state(); return [s.variantIdx, s.game.phase, Object.keys(s.model).sort().join(',')]}"
        for v in [0,1,2,3,4]:
            r=await pg.evaluate(LV,v); await pg.wait_for_timeout(3300); print('sanglier v',v,r,'-> après 3 s', await pg.evaluate(NOW))
        r=await pg.evaluate(LV,0); await pg.evaluate("()=>window.Echiquier.undo()"); await pg.wait_for_timeout(3300); print('annulation pendant l attente -> reste', await pg.evaluate(NOW))
        # Mad : visage pensif pendant la réflexion, et voix
        await pg.evaluate('''()=>{localStorage.setItem('echecs-mad-bot-v1', JSON.stringify({level:3, side:'b'}));}'''); await pg.reload(); await pg.wait_for_timeout(600)
        await pg.select_option('#modeSel','sanglier'); await pg.wait_for_timeout(1200)
        print('voix au début:', await pg.evaluate("()=>window.__played.slice()"))
        await pg.evaluate("()=>window.Echiquier.doAction({t:'move',from:'d1',to:'e3'})"); await pg.wait_for_timeout(150)
        print('pendant la réflexion:', await pg.evaluate("()=>[document.querySelector('.bot-avatar img').getAttribute('src'), document.querySelector('.bot-line').textContent]"))
        await pg.screenshot(path=S+'/pensif.png', clip={'x':0,'y':0,'width':1000,'height':420})
        await pg.wait_for_timeout(2500)
        print('après:', await pg.evaluate("()=>[document.querySelector('.bot-avatar img').getAttribute('src'), document.querySelector('.bot-line').textContent, !!document.querySelector('.bot-sound')]"))
        # sanglier s'échappe contre Mad -> niveau suivant + réplique
        r=await pg.evaluate('''()=>{const E=window.Echiquier; E.setMode('sanglier',0); const st=E.sim.save(); const m={...st.model}; delete m.d1; m.c6=st.model.d1; st.model=m; E.sim.load(st); E.refresh();
              E.doAction({t:'move',from:'c6',to:'b8'}); return document.querySelector('.bot-line').textContent}''')
        await pg.wait_for_timeout(3300); print('Mad au passage de niveau:', r, '|', await pg.evaluate(NOW), await pg.evaluate("()=>document.querySelector('.bot-line').textContent"))
        print('voix jouées:', await pg.evaluate("()=>window.__played.slice()"))
        await pg.click('.bot-sound'); print('muet:', await pg.evaluate("()=>[window.EchiquierBot.state().muted, document.querySelector('.bot-sound').textContent]"))
        print('ERRORS',errs); await b.close()
asyncio.run(main())
