"""Capturas: python3 tests/shots.py <prefijo>  -> tests/shots/<prefijo>_*.png"""
import sys, os, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); pre = sys.argv[1] if len(sys.argv) > 1 else 'shot'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 900, 'height': 600})
    pg.goto('file://' + ROOT + '/index.html'); pg.evaluate("localStorage.clear()"); pg.reload()
    pg.click('#bnew'); time.sleep(.2); pg.click('#cls [data-c=guerrero]'); time.sleep(.3)
    G = lambda js: pg.evaluate("(()=>{const g=__game;" + js + "})()")
    G("""const P=g.P; P.tut=99; P.tutF=null; const t=document.getElementById('tut'); if(t) t.style.display='none'; g.enterFloor(3); g.ents.length=0; P.hp=P.mhp=1e6;
      const sp=[[g.EN[0],2,0],[g.EN[1],-2,0],[g.EN[2],0,2],[g.EN[3],2,2],[g.EN[4],-2,2]]; for(const [d,dx,dy] of sp){ if(!d) continue; const e=g.spawnEnemy(d,P.x+dx,P.y+dy,3,false); e.aggro=false; e.spd=0; }""")
    time.sleep(.4); G("g.P.swing=.12; g.P.dir=[1,0]"); pg.screenshot(path=f'{ROOT}/tests/shots/{pre}_combate.png')
    G("g.openPanel('inv')"); time.sleep(.3); pg.screenshot(path=f'{ROOT}/tests/shots/{pre}_inventario.png')
    G("g.closePanel(); g.openPanel('craft')"); time.sleep(.3); pg.screenshot(path=f'{ROOT}/tests/shots/{pre}_fabricacion.png')
    b.close()
