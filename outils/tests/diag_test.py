from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/index.html")
    pg.evaluate("()=>localStorage.setItem('echecs-mad-peer', JSON.stringify({host:'127.0.0.1',port:9999,path:'/',secure:false}))")
    pg.goto("http://127.0.0.1:8765/index.html?partie=ABCD")
    seen=set()
    for i in range(80):
        pg.wait_for_timeout(1000)
        t=pg.evaluate("()=>{const e=document.querySelector('.net-state, #netPanel, .net-panel'); return e?e.innerText.slice(0,400):''}")
        st=pg.evaluate("()=>window.EchiquierNet.state().status")
        key=(st,t.split('\n')[0][:90])
        if key not in seen: seen.add(key); print(i,key)
        if st=='error': print(t); break
    print('ERR',errs); b.close()
