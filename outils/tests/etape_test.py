from playwright.sync_api import sync_playwright
import subprocess, sys
R='/home/claude/echiquier-animation'
JS='''()=>{const E=window.Echiquier; const ids=[...document.querySelectorAll('#modeSel option')].map(o=>o.value);
  const out={modes:ids.join(','), net:!!window.EchiquierNet, bot:!!window.EchiquierBot, charte:document.documentElement.classList.contains('charte')};
  if(ids.includes('loup')){E.setMode('loup'); out.loupImgs=document.querySelectorAll('.piece img.skin').length; out.skinBox=!document.getElementById('skinWrap').classList.contains('hidden'); out.src=!!document.querySelector('.rules .src');}
  else if(ids.includes('pions')){E.setMode('pions'); out.src=!!document.querySelector('.rules .src');}
  if(ids.includes('mousquetaires')){E.setMode('mousquetaires'); out.mq=[...document.querySelectorAll('#variantSel option')].length;}
  return out}'''
with sync_playwright() as p:
    b=p.chromium.launch()
    for br in sys.argv[2:]:
        subprocess.run(['git','-C',R,'checkout','-q','etape/'+br],check=True)
        pg=b.new_page(viewport={'width':900,'height':1100}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:8765/index.html?acces=public'); pg.wait_for_timeout(500)
        print(br, pg.evaluate(JS), errs)
        if br.startswith('12'):
            pg.evaluate("()=>{localStorage.setItem('echecs-mad-bot-v1', JSON.stringify({level:3, side:'b'}))}"); pg.reload(); pg.wait_for_timeout(500)
            pg.select_option('#modeSel','mousquetaires'); pg.wait_for_timeout(800); pg.screenshot(path=sys.argv[1]+'/reel12.png')
        if br.startswith('06'): pg.screenshot(path=sys.argv[1]+'/reel06.png')
        pg.close()
    b.close()
