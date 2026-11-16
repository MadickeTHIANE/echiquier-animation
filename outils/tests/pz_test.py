import sys, json
from playwright.sync_api import sync_playwright
out=sys.argv[1]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':900,'height':1150}); pg.set_default_timeout(120000); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto("http://127.0.0.1:8766/index.html?acces=public"); pg.wait_for_timeout(400)
    pg.select_option('#modeSel','problemes'); pg.wait_for_timeout(300)
    info=lambda: pg.evaluate("()=>{const s=window.Echiquier.state(); return {v:s.variantIdx, turn:s.game.turn, phase:s.game.phase, res:s.game.result&&s.game.result.reason, note:s.game.note, o:s.orientation, next:!document.getElementById('pzNext').disabled, hint:document.getElementById('pzHint').textContent, locked:[...document.querySelectorAll('#variantSel option')].filter(o=>o.disabled).length, main:document.querySelector('#status .main').textContent, shapes:window.Echiquier.getShapes().length}}")
    print('début', info())
    print('mauvais coup ->', pg.evaluate("()=>window.Echiquier.doAction({t:'move',from:'h5',to:'h7'})"), info()['note'])
    pg.click('#pzHint'); print('indice 1', info()['shapes'], info()['hint']); pg.click('#pzHint'); print('indice 2', info()['shapes']); pg.screenshot(path=out+'/pz1.png')
    print('bon coup ->', pg.evaluate("()=>window.Echiquier.doAction({t:'move',from:'h5',to:'f7'})"), info())
    pg.click('#pzNext'); pg.wait_for_timeout(200); print('suivant', info())
    res=pg.evaluate(r"""async ()=>{ const E=window.Echiquier, P=window.CAHIER_PROBLEMES, bad=[]; const wait=ms=>new Promise(r=>setTimeout(r,ms));
      for (let i=1;i<P.length;i++){ E.setMode('problemes', i); const s0=E.state(); if (s0.variantIdx!==i) { bad.push(P[i].n+': verrouillé'); continue; }
        const line=P[i].lines[0];
        for (let k=0;k<line.length;k+=2){ const mv=line[k]; if(!E.doAction({t:'move',from:mv.slice(0,2),to:mv.slice(2,4)})) { bad.push(P[i].n+': coup refusé '+mv); break; } await wait(750); }
        const g=E.state().game; if (!(g.phase==='over' && g.result.winner===g.pz.side)) bad.push(P[i].n+': non résolu '+JSON.stringify(g.result)+' step '+g.pz.step);
      } return {bad, progress: localStorage.getItem('echecs-mad-problemes')}; }""")
    print('cahier complet:', res, info())
    print(pg.evaluate(r"""async ()=>{ const E=window.Echiquier, P=window.CAHIER_PROBLEMES; const wait=ms=>new Promise(r=>setTimeout(r,ms)); const out=[];
      const idx=n=>P.findIndex(p=>p.n===n);
      E.setMode('problemes', idx(4)); E.doAction({t:'move',from:'f6',to:'f7'}); await wait(750); out.push(E.state().model.h7 && E.state().model.h7.code); E.doAction({t:'move',from:'d4',to:'h4'}); out.push(E.state().game.result.reason);
      E.setMode('problemes', idx(15)); out.push(E.doAction({t:'move',from:'e5',to:'f7'}), E.state().game.result.reason);
      E.setMode('problemes', idx(12)); E.doAction({t:'move',from:'f4',to:'e2'}); await wait(750); E.undo(); out.push('annuler -> '+E.state().game.turn+' step '+E.state().game.pz.step);
      return out; }"""))
    pg.evaluate("()=>window.Echiquier.setMode('problemes', 11)"); pg.wait_for_timeout(300); pg.click('#pzHint'); pg.wait_for_timeout(100); pg.screenshot(path=out+'/pz2.png')
    print('ERR', errs); b.close()
