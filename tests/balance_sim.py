"""Simulación de progresión: python3 tests/balance_sim.py [etiqueta]  -> tests/balance_<etiqueta>.json"""
import sys, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); tag = sys.argv[1] if len(sys.argv) > 1 else 'now'
SIM = r"""(()=>{const g=__game; let s=12345; Math.random=()=>((s=(s*1103515245+12345)%2147483648)/2147483648);
const P=g.P; P.tut=99; P.hp=P.mhp=1e9; const out=[]; let kills=0, secs=0;
const score=it=>Object.entries(it.st).reduce((a,[k,v])=>a+v*(k==='atk'?1.2:k==='def'?1:k==='int'?.2:.8),0)*(1+(it.plus||0)*.08);
function equipBest(){ for(const it of [...P.inv]){ const c=P.eq[it.slot]; if(it.name.startsWith('Arco')||it.name.startsWith('Báculo')) continue; if(!c||score(it)>score(c)){ P.inv=P.inv.filter(i=>i!==it); if(c) P.inv.push(c); P.eq[it.slot]=it; } } if(P.inv.length>28) P.inv.length=20; }
function spend(){ while(P.sp>0){ P.base[P.sp%3===0?'vit':'fue']++; P.sp--; } const order=['golpe','maestria','piel','maestria','piel']; while(P.kp>0){ const k=['maestria','piel','golpe','fortuna','recolector'].find(k=>P.sk[k]<5); if(!k) break; P.sk[k]++; P.kp--; } }
function fight(e){ const pa=Math.max(1,g.atk()-e.def), hits=Math.ceil(e.mhp/pa); const ea=Math.max(1,e.atk-g.def()*.5); secs+=hits*g.atkTime()+2.5; return {hits, ea}; }
let qi=0;
for(let f=1; f<=50; f++){
  g.enterFloor(f); const list=g.ents.filter(e=>!e.boss); const boss=g.ents.find(e=>e.boss);
  let H=0,EA=0,EH=0,n=0;
  for(const e of list){ const r=fight(e); H+=r.hits; EA+=r.ea; EH+=e.mhp; n++; g.P.x=e.x; g.P.y=e.y; g.killEnemy(e); kills++; g.drops.forEach(d=>{d.x=P.x;d.y=P.y}); g.pickup(); }
  let B=null; if(boss){ const r=fight(boss); B={hits:r.hits, hitsToDie:+(g.maxHp()/r.ea).toFixed(1)}; P.x=boss.x;P.y=boss.y; g.killEnemy(boss); kills++; g.drops.forEach(d=>{d.x=P.x;d.y=P.y}); g.pickup(); }
  if(f===2||f===4){ for(const rw of (f===2?['kit','arma']:['cama','armadura'])) g.questReward(rw); }
  equipBest(); spend();
  out.push({f, lvl:P.lvl, atk:g.atk(), hp:g.maxHp(), def:g.def(), gold:P.gold, kills, min:+(secs/60).toFixed(1), eHP:Math.round(EH/n), hitsToKill:+(H/n).toFixed(1), hitsToDie:+(g.maxHp()/(EA/n)).toFixed(1), boss:B});
}
// multiplicadores apilados máximos
P.buffs.fuerza=99; P.perks={dmg:.15,xp:.2}; P.prestige.perks={dmg:10,xp:10,hp:10,gold:10}; P.sk.maestria=5;
const base={...P.base}; const a1=g.atk(); P.buffs.fuerza=0; P.perks={}; P.prestige.perks={}; P.sk.maestria=0; const a0=g.atk();
P.buffs.fuerza=99; P.perks={dmg:.15,xp:.2}; P.prestige.perks={dmg:10,xp:10,hp:10,gold:10}; P.sk.maestria=5; P.buffs.sabiduria=99; const x0=P.xp, l0=P.lvl; P.xp=0; P.lvl=200; const need=g.xpNeed(200); g.gainXp(1000); const xpm=P.lvl>200?NaN:P.xp/1000;
return {rows:out, atkMult:+(a1/a0).toFixed(2), xpMult:+xpm.toFixed(2)};})()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome'); pg = b.new_page()
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.evaluate("localStorage.clear()"); pg.reload()
    pg.click('#bnew'); pg.wait_for_timeout(200); pg.click('#cls [data-c=guerrero]'); pg.wait_for_timeout(300)
    pg.evaluate("__game.P.tut=99; window.__simPause=1"); r = pg.evaluate(SIM); b.close()
json.dump(r, open(f'{ROOT}/tests/balance_{tag}.json', 'w'), indent=1)
print('errores', errs)
print('mult. ataque apilado x%.2f  · mult. XP apilado x%.2f' % (r['atkMult'], r['xpMult']))
print(' piso nv  atk    PV  def   oro kills  min  ePV golpes/mata golpes/muere jefe')
for x in r['rows']:
    if x['f'] in (1,3,5,8,10,15,20,25,30,40,50): print('%5d %3d %4d %5d %4d %6d %5d %5.0f %5d %8.1f %10.1f  %s' % (x['f'],x['lvl'],x['atk'],x['hp'],x['def'],x['gold'],x['kills'],x['min'],x['eHP'],x['hitsToKill'],x['hitsToDie'],x['boss']))
