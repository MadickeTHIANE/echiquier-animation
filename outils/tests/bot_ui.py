import asyncio, sys, json
from playwright.async_api import async_playwright
S=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        pg=await b.new_page(viewport={'width':1000,'height':1300})
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        st=lambda: pg.evaluate("()=>{const s=window.Echiquier.state();return {keys:Object.keys(s.model).sort().join(','),turn:s.game&&s.game.turn,phase:s.game&&s.game.phase,hist:s.history,line:window.EchiquierBot.state().line,res:s.game&&s.game.result}}")
        async def xy(sq):
            return await pg.evaluate('''(sq)=>{const s=window.Echiquier.state();const el=document.getElementById('board');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();const N=s.N;let f='abcdefgh'.indexOf(sq[0]);let rk=+sq.slice(1);let col=f,row=N-rk; if(s.orientation==='black'){col=N-1-f;row=N-1-row;} return [r.left+(col+.5)*r.width/N, r.top+(row+.5)*r.height/N]}''',sq)
        async def drag(a,bq):
            x,y=await xy(a); x2,y2=await xy(bq)
            await pg.mouse.move(x,y); await pg.mouse.down(); await pg.mouse.move((x+x2)/2,(y+y2)/2); await pg.mouse.move(x2,y2); await pg.mouse.up()
        print('free: bot ctl hidden', await pg.locator('.bot-ctl').is_hidden())
        await pg.select_option('#modeSel','dalton'); await pg.wait_for_timeout(300)
        await pg.select_option('#botLevel','2'); await pg.wait_for_timeout(400)
        print('start',await st())
        await pg.screenshot(path=S+'/bot1.png')
        await drag('d2','d4'); await pg.wait_for_timeout(200); s=await st(); print('thinking',s['turn'],s['line'])
        await drag('b2','b4'); s2=await st(); print('human blocked during bot turn', s2['keys']==s['keys'])
        await pg.wait_for_timeout(1800); s=await st(); print('bot replied',s); await pg.screenshot(path=S+'/bot2.png')
        await pg.click('#btnUndo'); await pg.wait_for_timeout(500); s=await st(); print('undo both',s['keys'],s['turn'],s['hist'])
        # bot plays first (side w)
        await pg.select_option('#botSide','w'); await pg.wait_for_timeout(2600); s=await st(); print('bot first',s)
        # mousquetaires vs strong bot (bot b)
        await pg.select_option('#modeSel','mousquetaires'); await pg.wait_for_timeout(300)
        await pg.select_option('#botSide','b'); await pg.select_option('#botLevel','3'); await pg.wait_for_timeout(500)
        t=pg.locator('#spareBottom .piece-tile').nth(0); await t.click(); x,y=await xy('b2'); await pg.mouse.click(x,y); await pg.wait_for_timeout(2500)
        s=await st(); print('mq placement',s); await pg.screenshot(path=S+'/bot3.png')
        # finish quickly: human plays random legal via API until over, bot auto-replies
        for i in range(60):
            s=await st()
            if s['phase']=='over': break
            if s['turn']=='w':
                await pg.evaluate("()=>{const E=window.Echiquier;const a=E.sim.actions();E.doAction(a[Math.floor(Math.random()*a.length)])}")
            await pg.wait_for_timeout(700)
        print('mq end',await st()); await pg.screenshot(path=S+'/bot4.png')
        # jument: hint
        await pg.select_option('#modeSel','jument'); await pg.wait_for_timeout(400)
        await pg.click('#botHint'); await pg.wait_for_timeout(200); print('hint arrows', await pg.locator('#arrowLayer polygon').count(), (await st())['line']); await pg.screenshot(path=S+'/bot5.png')
        # referee off -> bot hidden
        await pg.select_option('#modeSel','loup'); await pg.wait_for_timeout(300); await pg.uncheck('#chkReferee'); await pg.wait_for_timeout(300); print('ref off: ctl hidden', await pg.locator('.bot-ctl').is_hidden(), 'card hidden', await pg.locator('.bot-card').is_hidden()); await pg.check('#chkReferee')
        await pg.wait_for_timeout(2500); print('loup with bot b:',await st())
        # mobile screenshot
        pm=await b.new_page(viewport={'width':390,'height':844}); await pm.goto('http://localhost:8765/index.html'); await pm.select_option('#modeSel','sanglier'); await pm.wait_for_timeout(300); await pm.select_option('#botLevel','1'); await pm.wait_for_timeout(600); await pm.screenshot(path=S+'/bot_mobile.png')
        print('ERRORS',errs); await b.close()
asyncio.run(main())
