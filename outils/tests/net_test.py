import asyncio, sys, json
from playwright.async_api import async_playwright
S=sys.argv[1]
PEER=json.dumps({"host":"127.0.0.1","port":9000,"path":"/","secure":False,"config":{"iceServers":[]}})
INIT="localStorage.setItem('echecs-mad-peer', %s);" % json.dumps(PEER)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--disable-features=WebRtcHideLocalIpsWithMdns"])
        errs=[]
        async def mk(name, w=1000, h=1250):
            ctx=await b.new_context(viewport={'width':w,'height':h}); await ctx.add_init_script(INIT)
            pg=await ctx.new_page()
            pg.on('console', lambda m: errs.append(name+': '+m.text) if m.type=='error' else None)
            pg.on('pageerror', lambda e: errs.append(name+' PAGEERR '+str(e)))
            return pg
        H=await mk('host'); 
        await H.goto('http://localhost:8765/index.html'); await H.wait_for_timeout(400)
        await H.select_option('#modeSel','dalton'); 
        await H.click('#btnNet'); await H.screenshot(path=S+'/net_idle.png')
        await H.click('#netCreate'); await H.wait_for_function("()=>window.EchiquierNet.state().status==='waiting'", timeout=15000)
        code=await H.evaluate("()=>window.EchiquierNet.state().code"); print('code',code)
        await H.wait_for_timeout(500); await H.screenshot(path=S+'/net_host_wait.png')
        G=await mk('guest')
        await G.goto('http://localhost:8765/index.html?partie='+code)
        await G.wait_for_function("()=>window.EchiquierNet.state().status==='connected'", timeout=20000)
        await G.wait_for_timeout(600)
        gs=lambda pg: pg.evaluate("()=>{const s=window.Echiquier.state();const n=window.EchiquierNet.state();return {mode:s.modeId,turn:s.game&&s.game.turn,phase:s.game&&s.game.phase,keys:Object.keys(s.model).sort().join(','),ori:s.orientation,role:n.myRole,side:n.mySide,ver:n.ver,status:n.status,guests:n.guests.length}}")
        print('H',await gs(H)); print('G',await gs(G))
        async def xy(pg,sq):
            return await pg.evaluate('''(sq)=>{const s=window.Echiquier.state();const el=document.getElementById('board');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();const N=s.N;let f='abcdefgh'.indexOf(sq[0]);let rk=+sq.slice(1);let col=f,row=N-rk; if(s.orientation==='black'){col=N-1-f;row=N-1-row;} return [r.left+(col+.5)*r.width/N, r.top+(row+.5)*r.height/N]}''',sq)
        async def drag(pg,a,bq):
            x,y=await xy(pg,a); x2,y2=await xy(pg,bq)
            await pg.mouse.move(x,y); await pg.mouse.down(); await pg.mouse.move((x+x2)/2,(y+y2)/2); await pg.mouse.move(x2,y2); await pg.mouse.up()
        # guest (Lucky Luke, b) tries to move first: refused (not his turn)
        await drag(G,'e8','e5'); await G.wait_for_timeout(300); print('G early move refused', (await gs(G))['keys'])
        # host moves d2-d4
        await drag(H,'d2','d4'); await H.wait_for_timeout(500)
        print('after host move H',await gs(H)); print('G',await gs(G))
        # host tries to move again (not his turn)
        await drag(H,'d4','d5'); await H.wait_for_timeout(300); print('H double move refused', (await gs(H))['keys'])
        # guest moves rook e8-e4
        await drag(G,'e8','e4'); await G.wait_for_timeout(600)
        print('after guest move H',await gs(H)); print('G',await gs(G))
        await G.screenshot(path=S+'/net_guest.png'); await H.screenshot(path=S+'/net_host.png')
        # guest controls disabled
        print('guest controls disabled', await G.evaluate("()=>[modeSel.disabled, document.getElementById('btnNew').disabled]"))
        # host draws arrow -> guest sees it
        x,y=await xy(H,'a2'); x2,y2=await xy(H,'a5'); await H.mouse.move(x,y); await H.mouse.down(button='right'); await H.mouse.move(x2,y2); await H.mouse.up(button='right'); await H.wait_for_timeout(400)
        print('arrows H/G', await H.locator('#arrowLayer polygon').count(), await G.locator('#arrowLayer polygon').count())
        # host undo -> guest synced
        await H.click('#btnNet'); await H.wait_for_timeout(100)
        await H.click('#btnUndo'); await H.wait_for_timeout(400); print('undo H',(await gs(H))['keys'],'G',(await gs(G))['keys'], (await gs(G))['turn'])
        # host switches side
        await H.select_option('#netSide','b'); await H.wait_for_timeout(400); print('side switch G',await gs(G), 'H ori',(await gs(H))['ori'])
        # host changes mode to mousquetaires -> guest follows; guest (now w) places
        await H.select_option('#modeSel','mousquetaires'); await H.wait_for_timeout(500); print('mode G',await gs(G))
        t=G.locator('#spareBottom .piece-tile').nth(0); await t.click(); x,y=await xy(G,'a1'); await G.mouse.click(x,y); await G.wait_for_timeout(500)
        print('guest placed H',await gs(H)); 
        # spectator joins
        Sp=await mk('spect'); await Sp.goto('http://localhost:8765/index.html?partie='+code); await Sp.wait_for_function("()=>window.EchiquierNet.state().status==='connected'", timeout=20000); await Sp.wait_for_timeout(500)
        print('spect',await gs(Sp)); 
        await H.wait_for_timeout(300); await H.screenshot(path=S+'/net_host2.png')
        x,y=await xy(H,'b2'); x2,y2=await xy(H,'d4'); await H.mouse.move(x,y); await H.mouse.down(button='right'); await H.mouse.move(x2,y2); await H.mouse.up(button='right'); await H.wait_for_timeout(400)
        x,y=await xy(Sp,'c3'); await Sp.mouse.click(x,y); await Sp.mouse.move(x,y); await Sp.mouse.down(button='right'); await Sp.mouse.move(x+60,y); await Sp.mouse.up(button='right'); await Sp.wait_for_timeout(300)
        print('spect arrows kept after its own click / cannot draw:', await Sp.locator('#arrowLayer polygon').count(), '| host still', await H.locator('#arrowLayer polygon').count())
        # free mode sync both ways
        await H.select_option('#modeSel','free'); await H.wait_for_timeout(500)
        await drag(G,'e2','e4'); await G.wait_for_timeout(500); print('free guest move -> H', 'e4' in (await gs(H))['keys'].split(','), 'spect', 'e4' in (await gs(Sp))['keys'].split(','))
        await drag(H,'e7','e5'); await H.wait_for_timeout(500); print('free host move -> G', 'e5' in (await gs(G))['keys'].split(','))
        await drag(Sp,'d2','d4'); await Sp.wait_for_timeout(300); print('spect cannot move', 'd2' in (await gs(Sp))['keys'].split(','))
        # guest disconnect (close page) -> spectator promoted
        await G.reload(); await G.wait_for_function("()=>window.EchiquierNet.state().status==='connected'", timeout=20000); await G.wait_for_timeout(700)
        print('guest reload: H guests',(await gs(H))['guests'], 'G role',(await gs(G))['role'], 'spect role',(await gs(Sp))['role'])
        await Sp.screenshot(path=S+'/net_spect.png')
        # wrong code
        W=await mk('wrong'); await W.goto('http://localhost:8765/index.html?partie=ZZZZ'); await W.wait_for_function("()=>window.EchiquierNet.state().status==='error'", timeout=20000); await W.wait_for_timeout(200); await W.screenshot(path=S+'/net_wrong.png'); print('wrong code ->', await W.evaluate("()=>window.EchiquierNet.state().error"))
        # host leaves -> spectator notified
        if not await H.locator('#netLeave').is_visible(): await H.click('#btnNet')
        await H.click('#netLeave'); await Sp.wait_for_timeout(800); print('host left -> spect status', (await gs(Sp))['status'])
        print('ERRORS',[e for e in errs if 'favicon' not in e])
        await b.close()
asyncio.run(main())
