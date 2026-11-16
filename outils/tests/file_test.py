from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"]); pg=b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto("file:///home/claude/echiquier-animation/index.html?acces=complet"); pg.evaluate("()=>localStorage.setItem('echecs-mad-bot-v1', JSON.stringify({level:3, side:'b'}))"); pg.reload(); pg.wait_for_timeout(600)
    pg.select_option('#modeSel','classique'); pg.wait_for_timeout(800)
    print('ouvert directement (file://) : bouton Voix', pg.evaluate("()=>!!document.querySelector('.bot-sound')"), '| voix connues', pg.evaluate("()=>window.MAD_VOIX.length"), '| livre', pg.evaluate("()=>Object.keys(window.MAD_LIVRE).length"))
    print('lecture:', pg.evaluate("async()=>{const a=new Audio('voix/pat-1.mp3'); try{await a.play(); return 'oui '+a.duration.toFixed(1)+' s'}catch(e){return 'non: '+e.message}}"))
    pg.evaluate("()=>window.Echiquier.doAction({t:'move',from:'e2',to:'e4'})"); pg.wait_for_timeout(2500)
    print('Mad répond à 1.e4 par', pg.evaluate("()=>{const l=window.Echiquier.state().game.last; return l.from+l.to}"), errs); b.close()
