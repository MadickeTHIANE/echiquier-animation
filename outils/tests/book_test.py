from playwright.sync_api import sync_playwright
JS=r"""
async () => { const E=window.Echiquier, B=window.EchiquierBot; await new Promise(r=>setTimeout(r,600)); const first={}, reply={}; const lines=[];
  for (let n=0;n<40;n++){ E.setMode("classique"); const a=B.chooseAction(3); first[a.from+a.to]=(first[a.from+a.to]||0)+1; }
  for (let n=0;n<40;n++){ E.setMode("classique"); E.doAction({t:"move",from:"e2",to:"e4"}); const a=B.chooseAction(1); reply[a.from+a.to]=(reply[a.from+a.to]||0)+1; }
  for (let n=0;n<3;n++){ E.setMode("classique"); const l=[]; let t0=performance.now(), book=0;
    for (let k=0;k<16;k++){ const t=performance.now(); const a=B.chooseAction(3); if (performance.now()-t<100) book++; if(!E.doAction(a)) return "refus"; l.push(a.from+a.to); }
    lines.push(l.join(" ")+" | coups du livre: "+book); }
  return {first, reply, lines}; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.set_default_timeout(300000); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8766/index.html"); r=pg.evaluate(JS)
    print(r['first']); print(r['reply']); [print(l) for l in r['lines']]; print('ERR',errs); b.close()
