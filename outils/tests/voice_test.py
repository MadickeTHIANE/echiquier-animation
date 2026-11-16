from playwright.sync_api import sync_playwright
INIT="""window.__log=[]; window.Audio=function(src){ const self=this; this.src=src; this.play=()=>{ window.__log.push(['début',src.split('/').pop(),Math.round(performance.now())]); self.t=setTimeout(()=>{window.__log.push(['fin',src.split('/').pop(),Math.round(performance.now())]); self.onended&&self.onended();},2500); return Promise.resolve(); }; this.pause=()=>{ clearTimeout(self.t); window.__log.push(['COUPÉ',src.split('/').pop(),Math.round(performance.now())]); }; };"""
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); ctx.add_init_script(INIT); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto("file:///home/claude/echiquier-animation/index.html?acces=complet"); pg.evaluate("()=>localStorage.setItem('echecs-mad-bot-v1', JSON.stringify({level:3, side:'b'}))"); pg.reload(); pg.wait_for_timeout(500)
    pg.select_option('#modeSel','mousquetaires'); pg.wait_for_timeout(500); print('stub', pg.evaluate("()=>[String(window.Audio).slice(0,30), window.__log.length]"))
    # l'enfant pose ses pièces dès que c'est son tour, sans attendre la fin des phrases (chaque phrase dure 2,5 s ici)
    for k in range(40):
        r=pg.evaluate("""()=>{const E=window.Echiquier, g=E.state().game; if(g.phase==='over') return 'fin'; if(g.turn!=='w') return 'attente'; const a=E.sim.actions(); return E.doAction(a[Math.floor(Math.random()*a.length)])?'joué':'refus'}""")
        if r=='fin': break
        pg.wait_for_timeout(700)
    pg.wait_for_timeout(6000)
    log=pg.evaluate("()=>window.__log")
    cut=[l for l in log if l[0]=='COUPÉ']; starts=[l for l in log if l[0]=='début']; ends=[l for l in log if l[0]=='fin']
    over=sum(1 for i in range(len(starts)-1) if starts[i+1][2] < starts[i][2]+2400)
    print('répliques commencées', len(starts), '| terminées', len(ends), '| coupées', len(cut), '| chevauchements', over, errs)
    print([s[1] for s in starts]); b.close()
