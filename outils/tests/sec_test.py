import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        pg=await b.new_page()
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(300)
        r=await pg.evaluate('''()=>{ const E=window.Echiquier; window.__pwn=0; E.setMode('dalton',0); const s=E.exportState();
          s.shapes=[{type:'hl',square:'a1',color:'red'},{type:'hl',square:'a1',color:'x)" onmouseover="window.__pwn=1'},{type:'arrow',from:'a1',to:'z9',color:'green'},{type:'arrow',from:'b1',to:'b3',color:'blue'}];
          s.model.a3={kind:'std',code:'wP',skin:'https://evil.example/x.png'}; s.model.a4={kind:'img',src:'javascript:alert(1)'}; s.model.zz={kind:'std',code:'wQ'}; s.model.a5={kind:'std',code:'<img src=x onerror=window.__pwn=1>'};
          s.game.note='<img src=x onerror="window.__pwn=1">'; s.game.quiet='<b id=inj>x</b>'; s.game.result={winner:'w',reason:'<img src=x onerror="window.__pwn=1">'}; s.game.phase='over';
          E.importState(s);
          const st=E.state();
          return {shapes:E.getShapes().length, a3:st.model.a3, a4:st.model.a4||null, zz:st.model.zz||null, a5:st.model.a5||null, statusHasImg: !!document.querySelector('#status img'), inj: !!document.getElementById('inj'), status: document.getElementById('status').textContent.slice(0,60)} }''')
        await pg.wait_for_timeout(300)
        print(r, 'pwn=', await pg.evaluate("()=>window.__pwn"))
        r=await pg.evaluate('''()=>{const E=window.Echiquier; E.setShapes([{type:'hl',square:'h8',color:'"><img src=x onerror=window.__pwn=1>'}]); return [E.getShapes().length, !!document.querySelector('#hlLayer img')]}''')
        print('setShapes bad colour ->', r, 'pwn=', await pg.evaluate("()=>window.__pwn"))
        print('importState(null) harmless ->', await pg.evaluate("()=>{try{window.Echiquier.importState(null);window.Echiquier.importState({modeId:'nope',variantIdx:'x',model:5,game:7});return window.Echiquier.state().modeId}catch(e){return 'ERR '+e}}"))
        print('ERRORS',errs); await b.close()
asyncio.run(main())
