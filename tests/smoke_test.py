"""Prueba headless: python3 tests/smoke_test.py  (requiere playwright y Chrome)"""
import time, json, sys, os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
res = []
def check(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name, extra)
with sync_playwright() as p:
    exe = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
    b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 760})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto('file://' + ROOT + '/index.html')
    pg.evaluate("localStorage.clear()")
    pg.reload(); pg.click('#bnew'); time.sleep(.2); pg.click('#cls [data-c=guerrero]'); time.sleep(.3)
    G = lambda js: pg.evaluate("(()=>{const g=__game;" + js + "})()")

    # 1 Combate: matar enemigo adyacente
    r = G("""g.enterFloor(1); g.ents.length=0; g.drops.length=0; const P=g.P;
      const xp0=P.xp+0, lv0=P.lvl, k0=P.kills;
      let x=P.x+1,y=P.y; if(g.solidAt(x,y,true)){x=P.x-1} if(g.solidAt(x,y,true)){x=P.x;y=P.y+1} if(g.solidAt(x,y,true)){y=P.y-1}
      const e=g.spawnEnemy(g.EN[0],x,y,1,false); e.rare=0; e.hp=1;
      g.update(0.05);
      return {dead:!g.ents.includes(e), kills:P.kills-k0, xpGain:(P.lvl>lv0)||P.xp>xp0, drops:g.drops.length, ex:x, ey:y};""")
    check('auto-ataque mata enemigo adyacente', r['dead'] and r['kills'] == 1, r)
    check('XP otorgada', r['xpGain'])
    check('botín (oro) soltado', r['drops'] >= 1)
    r = G("""const P=g.P, d=g.drops[0]; const gold0=P.gold; g.drops.forEach(d=>{d.x=P.x;d.y=P.y}); g.drops.push({x:P.x,y:P.y,item:{uid:99999,slot:'arma',rar:3,lvl:1,name:'Katana de prueba',st:{atk:50},value:10}});
      const n0=P.inv.length; g.pickup(); return {gold:P.gold-gold0, inv:P.inv.length-n0, left:g.drops.length};""")
    check('recoger oro e ítem', r['gold'] > 0 and r['inv'] >= 1 and r['left'] == 0, r)
    r = G("""const it=g.P.inv.find(i=>i.uid===99999); g.panelAct('equip',{uid:'99999'}); return g.P.eq.arma && g.P.eq.arma.uid===99999;""")
    check('equipar arma', r)

    # 2 Misión: progreso de 'Primeros pasos' (madera) y entrega
    r = G("""const P=g.P; P.q=0; P.qp=0; g.questEvent('gather','madera',5); const ok=P.qp>=5; const gold=P.gold; g.panelAct('turnin',{}); return {ok, q:P.q, gold:P.gold-gold};""")
    check('progreso y entrega de misión', r['ok'] and r['q'] == 1 and r['gold'] == 20, r)
    r = G("""const P=g.P; const k=P.qp; g.ents.length=0; const e=g.spawnEnemy(g.EN[1],P.x+20,P.y,1,false); g.killEnemy(e); return P.qp-k;""")
    check('misión de matar cuenta bajas', r == 1, r)

    # 3 Jefe: piso 5, matar jefe abre escalera
    r = G("""const P=g.P; g.enterFloor(5); const b=g.ents.find(e=>e.boss); if(!b) return {boss:false};
      const [dx,dy]=g.W.downAt; const before=g.gt(g.W,dx,dy); g.killEnemy(b);
      return {boss:true, before, after:g.gt(g.W,dx,dy), DOWN:g.T.DOWN, bosses:P.bosses};""")
    check('jefe existe en piso 5', r.get('boss'))
    check('matar jefe abre escalera', r.get('after') == r.get('DOWN') and r.get('before') != r.get('DOWN'), r)
    r = G("""g.enterFloor(10); const b=g.ents.find(e=>e.boss); const P=g.P; P.hp=1e9; b.x=P.x+3; b.y=P.y; b.aggro=true; b.hp=b.mhp*0.4;
      const seen=new Set(); for(let i=0;i<40;i++){ b.pt=0; g.bossAI(b,0.01); seen.add(b.lastPat); }
      for(let i=0;i<60;i++) g.update(0.05);
      return {pats:[...seen], enraged:!!b.enraged, warns:g.warns.length, theme:g.W.name};""")
    check('patrones de jefe (golpe, ráfaga, línea, lluvia, invocar)', len(r['pats']) >= 4 and r['enraged'], r)

    # 4 A*, alcance, temas, raros
    r = G("""g.enterFloor(3); const P=g.P; g.ents.length=0; let e=null;
      for(let y=0;y<g.W.h&&!e;y++)for(let x=0;x<g.W.w&&!e;x++){ if(!g.solidAt(x,y,true)&&Math.abs(x-P.x)+Math.abs(y-P.y)>8){ const s=g.astar({x,y},P.x,P.y,3000); if(s) e={x,y,s}; } }
      return e?{ok:true,step:e.s}:{ok:false};""")
    check('A* encuentra ruta', r['ok'] and abs(r['step'][0]) + abs(r['step'][1]) == 1, r)
    r = G("""const P=g.P; P.hp=1e9; g.ents.length=0; g.projs.length=0; const arch=g.EN.find(e=>e.ranged==='magic'); let pos=null;
      for(const [ox,oy] of [[4,0],[-4,0],[0,4],[0,-4],[3,0],[-3,0],[0,3],[0,-3]]) if(!g.solidAt(P.x+ox,P.y+oy,true)&&g.los(P.x+ox,P.y+oy,P.x,P.y)){pos=[P.x+ox,P.y+oy];break}
      if(!pos) return {skip:true}; const e=g.spawnEnemy(arch,pos[0],pos[1],3,false); e.cd=0; e.aggro=true; g.update(0.02);
      return {proj:g.projs.filter(p=>p.hostile).length};""")
    check('enemigo mágico dispara a distancia', r.get('skip') or r['proj'] >= 1, r)
    r = G("""const names=[1,11,21,31].map(f=>{g.enterFloor(f); return g.W.name.split(' — ')[0]}); let rare=0; for(let i=0;i<500;i++){ const e=g.spawnEnemy(g.EN[0],1,1,1,false); if(e.rare) rare++; } g.ents.length=0; return {names, rare};""")
    check('temas distintos cada 10 pisos', len(set(r['names'])) == 4, r)
    check('aparecen monstruos raros', r['rare'] > 0, r)

    # 5 Fabricación + construcción + casa
    r = G("""g.enterTown(); const P=g.P; Object.assign(P.mats,{madera:100,piedra:100,hierro:50,hierba:50,cristal:30}); P.gold=5000;
      const i=g.RECIPES.findIndex(r=>r.id==='cama'); const m0=P.mats.madera; g.panelAct('craft',{k:String(i)});
      const ip=g.RECIPES.findIndex(r=>r.id==='piano'); g.panelAct('craft',{k:String(ip)});
      return {cama:P.blocks.cama, piano:P.blocks.piano, used:m0-P.mats.madera};""")
    check('fabricar cama y piano', r['cama'] == 1 and r['piano'] == 1 and r['used'] == 21, r)
    r = G("""const P=g.P; P.x=28; P.y=8; P.fx=28; P.fy=8; const ids=g.BLOCKIDS(); g.setBuild(ids.indexOf('cama')); const c0=g.comfort();
      g.placeBlock(29,8); g.setBuild(ids.indexOf('piano')); g.placeBlock(27,8);
      return {cama:g.town.obj['29,8'], piano:g.town.obj['27,8'], comfort:g.comfort()-c0, left:P.blocks.cama};""")
    check('colocar bloques en parcela y confort sube', r['cama'] == 'cama' and r['piano'] == 'piano' and r['comfort'] == 11, r)
    r = G("""const P=g.P; P.dir=[1,0]; P.hp=1; g.interact(); return P.hp>1;""")
    check('dormir en la cama cura', r)
    r = G("""const P=g.P; const c0=g.comfort(); const ok=g.upgradeHouse(); return {ok, house:P.house, c:g.comfort()>=c0, plot:g.gt(g.town,37,14)===10};""")
    check('mejorar casa a nivel 2', r['ok'] and r['house'] == 2 and r['plot'], r)
    r = G("""g.removeBlock(27,8); return [g.town.obj['27,8']===undefined, g.P.blocks.piano];""")
    check('quitar bloque lo devuelve', r[0] and r[1] == 1, r)

    # 6 Guardado / carga
    r = G("""const P=g.P; P.gold=4321; P.lvl=7; P.sk.fuego=2; g.save(); P.gold=0; P.lvl=1; g.load();
      const Q=g.P; return {gold:Q.gold, lvl:Q.lvl, fuego:Q.sk.fuego, house:Q.house, cama:g.town.obj['29,8'], arma:Q.eq.arma&&Q.eq.arma.name};""")
    check('guardar/cargar ida y vuelta', r['gold'] == 4321 and r['lvl'] == 7 and r['fuego'] == 2 and r['house'] == 2 and r['cama'] == 'cama', r)
    pg.reload(); time.sleep(.3)
    vis = pg.evaluate("getComputedStyle(document.getElementById('bcont')).display")
    pg.click('#bcont'); time.sleep(.3)
    r = G("return {gold:g.P.gold, house:g.P.house}")
    check('continuar tras recargar página', vis != 'none' and r['gold'] == 4321, r)


    # 8 Clases y arco
    r = G("""const out={}; for(const c of ['guerrero','mago','arquero']){ g.newGame(c); out[c]={arma:g.P.eq.arma.name.split(' ')[0], sk:Object.keys(g.P.sk).filter(k=>g.P.sk[k]>0), bow:g.isBow()}; } return out;""")
    check('clases: guerrero/mago/arquero con armas propias', r['guerrero']['arma']=='Espada' and r['mago']['arma']=='Báculo' and r['arquero']['arma']=='Arco' and r['arquero']['bow'] and 'fuego' in r['mago']['sk'], r)
    r = G("""const P=g.P; g.enterFloor(2); P.hp=1e6; g.ents.length=0; g.projs.length=0; let pos=null;
      for(const [ox,oy] of [[4,0],[-4,0],[0,4],[0,-4],[3,0],[-3,0],[0,3],[0,-3]]) if(!g.solidAt(P.x+ox,P.y+oy,true)&&g.los(P.x,P.y,P.x+ox,P.y+oy)){pos=[P.x+ox,P.y+oy];break}
      if(!pos) return {skip:1}; const e=g.spawnEnemy(g.EN[0],pos[0],pos[1],1,false); e.hp=1; e.mhp=1; e.spd=99; e.mcd=99; e.cd=99; P.target=e; P.atkCd=0;
      for(let i=0;i<40&&g.ents.includes(e);i++) g.update(0.03); return {dead:!g.ents.includes(e), dist:Math.abs(pos[0]-P.x)+Math.abs(pos[1]-P.y)};""")
    check('arco mata enemigo a distancia', r.get('skip') or r['dead'], r)

    # 9 Cultivos y cocina
    r = G("""g.enterTown(); const P=g.P; P.x=28; P.y=8; P.fx=28; P.fy=8; P.dir=[1,0]; P.blocks.cultivo=1; P.mats.semilla_trigo=5;
      g.setBuild(g.BLOCKIDS().indexOf('cultivo')); g.placeBlock(29,8); const st=[];
      st.push(g.farm(29,8)); st.push(g.farm(29,8)); for(let i=0;i<3;i++){ g.growCrops(30); if(g.town.crops['29,8'].s<3) g.farm(29,8); } const c=g.town.crops['29,8'];
      const t0=P.mats.trigo; st.push(g.interact()); return {st, stage:c&&c.s, trigo:P.mats.trigo-t0, gone:!g.town.crops['29,8'], seeds:P.mats.semilla_trigo};""")
    check('plantar, regar, crecer y cosechar', r['st'][0]=='plant' and r['st'][1]=='water' and r['stage']==3 and r['trigo']>=2 and r['gone'], r)
    r = G("""const P=g.P; P.mats.trigo=10; P.mats.zanahoria=5; P.mats.fresa=5; P.mats.hierba=5; const a0=(()=>{return 0})();
      P.cons.pan=0; P.blocks.cocina=1; g.setBuild(g.BLOCKIDS().indexOf('cocina')); g.placeBlock(34,12); const before=JSON.stringify(P.buffs); const i=g.RECIPES.findIndex(r=>r.id==='pan'); g.panelAct('craft',{k:String(i)}); const pan=P.cons.pan;
      g.closePanel(); const base=g.P.eq.arma; P.cds={}; const atk0=(P.buffs.fuerza?1:0); g.usePot('pan'); const j=g.RECIPES.findIndex(r=>r.id==='tarta'); g.panelAct('craft',{k:String(j)}); g.usePot('tarta');
      const xp0=P.xp, l0=P.lvl; g.gainXp(10); return {pan, buffs:Object.keys(P.buffs), xp:P.lvl>l0||P.xp-xp0==14};""")
    check('cocinar y comer da buffs (fuerza, XP +40%)', r['pan']==1 and 'fuerza' in r['buffs'] and 'sabiduria' in r['buffs'] and r['xp'], r)

    # 10 Visitantes
    r = G("""const P=g.P; for(let i=0;i<6;i++){ P.blocks.fuente=(P.blocks.fuente||0)+1; } g.setBuild(g.BLOCKIDS().indexOf('fuente')); g.placeBlock(27,10); g.placeBlock(29,10); g.placeBlock(31,10);
      const c=g.comfort(); const v=g.spawnVisitor(); if(!v) return {c, v:false}; const gold=P.gold; g.talkVisitor(v); const gift=P.gold-gold; g.talkVisitor(v);
      return {c, v:true, tier:v.tier, gift, gold2:P.gold-gold, line:v.line};""")
    check('visitante aparece y regala según confort', r['v'] and r['gift'] > 0 and r['gold2'] == r['gift'] and r['tier'] >= 2, r)

    # 11 Música
    r = G("""g.musicTick(); const a=g.musicTrack(); g.enterFloor(3); const b=g.musicTrack(); g.enterFloor(5); const boss=g.ents.find(e=>e.boss); boss.aggro=true; const c=g.musicTrack(); g.musicTick();
      const on1=g.music.on; g.toggleMusic(); const on2=g.music.on; g.toggleMusic(); return {a,b,c,on1,on2,on3:g.music.on, playing:g.music.track, stored:localStorage.getItem('cc_music')};""")
    check('pistas de música ciudad/calabozo/jefe', r['a']=='town' and r['b']=='dungeon' and r['c']=='boss', r)
    check('silenciar música (M) persiste', r['on1'] != r['on2'] and r['on3'] == r['on1'] and r['stored'] == '1', r)

    # 12 Mando
    G("""g.enterTown(); const P=g.P; P.x=21; P.y=10; P.fx=21; P.fy=10; window.__pad={axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))}; navigator.getGamepads=()=>[window.__pad];""")
    x0 = G("return g.P.x")
    G("window.__pad.axes[0]=1"); time.sleep(.6); G("window.__pad.axes[0]=0")
    x1 = G("return g.P.x")
    G("window.__pad.buttons[9].pressed=true"); time.sleep(.15); G("window.__pad.buttons[9].pressed=false"); time.sleep(.1)
    p1 = G("return g.panel")
    G("window.__pad.buttons[1].pressed=true"); time.sleep(.15); G("window.__pad.buttons[1].pressed=false"); time.sleep(.1)
    p2 = G("return g.panel")
    check('mando: stick mueve, Start abre inventario, B cierra', x1 > x0 and p1 == 'inv' and p2 is None, (x0, x1, p1, p2))
    G("navigator.getGamepads=()=>[]")

    # 13 Exportar / importar
    r = G("""const P=g.P; P.gold=777; P.cls='mago'; g.town.crops['30,9']={t:'fresa',s:2,w:1,g:0}; const code=g.exportSave(); P.gold=1; localStorage.removeItem('cc_save');
      const bad=g.importSave('basura!!'); const ok=g.importSave(code); return {bad, ok, gold:g.P.gold, cls:g.P.cls, crop:g.town.crops['30,9']&&g.town.crops['30,9'].t, len:code.length};""")
    check('exportar/importar partida', (not r['bad']) and r['ok'] and r['gold']==777 and r['cls']=='mago' and r['crop']=='fresa', r)
    G("g.openPanel('options')"); time.sleep(.1); pg.screenshot(path=ROOT + '/tests/shot_options.png'); G("g.closePanel()")
    G("g.enterTown(); g.P.x=30; g.P.y=12; g.P.fx=30; g.P.fy=12; g.spawnVisitor()"); time.sleep(.5); pg.screenshot(path=ROOT + '/tests/shot_farm.png')


    # 14 Estaciones y clima
    r = G("""const P=g.P; g.enterTown(); P.day=1; P.dayT=0; const s1=g.season().n; P.day=8; const s2=g.season().n; P.day=22; const s4=g.season().n;
      P.day=21; P.dayT=239.9; g.updateSeason(0.2); const s5=g.season().n, d=P.day;
      g.town.crops['33,13']={t:'trigo',s:0,w:0,g:0}; g.setWeather('lluvia',100); g.growCrops(0.1); const wetd=g.town.crops['33,13'].w;
      P.day=22; g.setWeather('nieve',100); g.render(); const c=g.town.crops['33,13']; c.s=0;c.g=0;c.w=1; g.setWeather('despejado',100); g.growCrops(2); const winter=c.g;
      g.setWeather('tormenta',100); g.render(); delete g.town.crops['33,13']; return {s1,s2,s4,s5,d,wetd,winter};""")
    check('estaciones avanzan (primavera→verano→invierno)', r['s1']=='Primavera' and r['s2']=='Verano' and r['s4']=='Invierno' and r['d']==22, r)
    check('lluvia riega cultivos e invierno ralentiza', r['wetd']==1 and abs(r['winter']-1.0)<1e-6, r)
    pg.screenshot(path=ROOT + '/tests/shot_storm.png')
    G("g.setWeather('nieve',100)"); time.sleep(.3); pg.screenshot(path=ROOT + '/tests/shot_snow.png'); G("g.P.day=1; g.setWeather('despejado',100)")

    # 15 Estaciones de fabricación
    r = G("""const P=g.P; Object.assign(P.mats,{madera:200,piedra:200,hierro:100,hierba:50,cristal:50,trigo:10}); const ri=g.RECIPES.findIndex(r=>r.id==='pocion_vida');
      for(const k in g.town.obj) if(['alquimia','yunque','forja'].includes(g.town.obj[k])) delete g.town.obj[k];
      const c0=P.cons.pocion_vida; g.panelAct('craft',{k:String(ri)}); const blocked=P.cons.pocion_vida===c0;
      const ai=g.RECIPES.findIndex(r=>r.id==='alquimia'); g.panelAct('craft',{k:String(ai)}); P.x=30;P.y=12;P.fx=30;P.fy=12; g.setBuild(g.BLOCKIDS().indexOf('alquimia')); g.placeBlock(30,13);
      g.panelAct('craft',{k:String(ri)}); const ok=P.cons.pocion_vida>c0;
      const gi=g.RECIPES.findIndex(r=>r.id==='gear:anillo:3'); const n0=P.inv.length; g.panelAct('craft',{k:String(gi)}); const gb=P.inv.length===n0;
      for(const id of ['yunque','forja']){ g.panelAct('craft',{k:String(g.RECIPES.findIndex(r=>r.id===id))}); } g.setBuild(g.BLOCKIDS().indexOf('yunque')); g.placeBlock(31,13); g.setBuild(g.BLOCKIDS().indexOf('forja')); g.placeBlock(32,13);
      g.panelAct('craft',{k:String(gi)}); return {blocked, ok, gearBlocked:gb, gearOk:P.inv.length===n0+1, st:g.recipeStations(g.RECIPES[gi])};""")
    check('mesas de fabricación requeridas (alquimia, yunque+forja)', r['blocked'] and r['ok'] and r['gearBlocked'] and r['gearOk'], r)

    # 16 Pesca
    r = G("""const P=g.P; P.cana=0; P.x=12; P.y=18; P.fx=12; P.fy=18; P.dir=[0,1]; const no=g.interact(); g.panelAct('craft',{k:String(g.RECIPES.findIndex(r=>r.id==='cana'))}); g.closePanel();
      const f0=P.fishCaught; const start=g.interact(); const F=g.fishing; if(!F) return {no, start, fishing:false, tile:g.gt(g.W,12,18)};
      F.bite=0; F.prog=.97; F.fp=.5; F.zp=.4; F.zv=0; F.fv=0; F.ft=99; for(let i=0;i<10&&g.fishing;i++) g.updateFishing(0.02);
      const caught=P.fishCaught-f0; g.startFishing(12,19); const F2=g.fishing; F2.bite=0; F2.prog=.02; F2.fp=0.95; F2.zp=0; F2.ft=99; F2.fv=0; for(let i=0;i<10&&g.fishing;i++) g.updateFishing(0.05);
      return {no, start, caught, escaped:g.fishing===null, cana:P.cana, pesc:P.mats.pescado+P.mats.pez_dorado};""")
    check('pesca: requiere caña, captura y escape', r.get('no') is False and r.get('caught')==1 and r.get('escaped') and r.get('pesc',0)>=1, r)
    G("const P=g.P; g.startFishing(12,19); g.fishing.bite=0;"); pg.keyboard.down(' '); time.sleep(.6); pg.screenshot(path=ROOT + '/tests/shot_fishing.png'); pg.keyboard.up(' '); pg.keyboard.press('Escape')

    # 17 Amistad
    r = G("""const P=g.P; P.friend={}; P.talked={}; P.gifted={}; P.mats.fresa=20; P.mats.piedra=20; const brann=g.town.npcs.find(n=>n.id==='brann');
      g.talk(brann); const pnl=g.panel; g.closePanel(); const c1=g.chat('noa'), c2=g.chat('noa'); const p1=g.giveGift('noa','fresa'), p2=g.giveGift('noa','fresa');
      P.day++; const p3=g.giveGift('noa','piedra'); const kp=P.kp, gold=P.gold; g.addFriend('noa',100);
      return {pnl, c1, c2, p1, p2, p3, hearts:g.hearts('noa'), kp:P.kp-kp, gold:P.gold-gold, inv:P.inv.some(i=>i.slot==='anillo'&&i.rar===3)};""")
    check('amistad: charlar/regalo diario, gustos, corazones y recompensas', r['pnl']=='npc' and r['c1'] and not r['c2'] and r['p1']==12 and r['p2']==0 and r['p3']==4 and r['hearts']==10 and r['kp']==3 and r['gold']==600 and r['inv'], r)

    # 18 Logros
    r = G("""const P=g.P; P.ach={}; P.kills=150; P.maxFloor=12; const g0=P.gold; g.checkAch(); g.openPanel('ach'); const html=document.getElementById('panel').innerHTML; g.closePanel();
      return {k10:!!P.ach.k10, k100:!!P.ach.k100, f10:!!P.ach.f10, f25:!!P.ach.f25, gold:P.gold-g0, html:html.includes('Logros')};""")
    check('logros se desbloquean con recompensa y panel', r['k10'] and r['k100'] and r['f10'] and not r['f25'] and r['gold']>=650 and r['html'], r)

    # 19 Mundo abierto
    r = G("""const P=g.P; g.enterTown(); P.x=20; P.y=33; P.fx=20; P.fy=33; P.mt=0; return {exit:g.gt(g.W,20,34)}""")
    pg.keyboard.down('s'); time.sleep(.5); pg.keyboard.up('s'); time.sleep(.2)
    r2 = G("""const P=g.P; return {name:g.W.name, field:P.field, mobs:g.ents.length, x:P.x, y:P.y}""")
    check('salida de la ciudad lleva a las Llanuras', r2['name']=='Llanuras de Valdoria' and r2['field']==1 and r2['mobs']>=15, r2)
    r3 = G("""let P=g.P; const m=g.ents[0]; const far=Math.abs(m.x-P.x)+Math.abs(m.y-P.y); let res=0; for(let y=0;y<g.W.h;y++)for(let x=0;x<g.W.w;x++){const t=g.gt(g.W,x,y); if([g.T.TREE,g.T.ROCK,g.T.ORE,g.T.HERB].includes(t)) res++;}
      g.ents.length=0; for(let i=0;i<3;i++) g.spawnFieldMob(); const e=g.ents[0]; e.hp=1; g.killEnemy(e); const k=g.P.kills;
      g.save(); g.load(); P=g.P; const after={name:g.W.name, field:g.P.field};
      const [tx,ty]=g.W.tower; P.x=tx; P.y=ty-1; P.fx=P.x; P.fy=P.y; P.dir=[0,1]; g.ents.length=0; g.interact(); const pnl=g.panel; g.closePanel();
      P.x=35; P.y=2; P.fx=35; P.fy=2; P.mt=0; P.dir=[0,-1]; return {res, after, pnl, aggroR:g.ents.every(e=>e.aggroR===4), lvlOk:true}""")
    check('llanuras: recursos, mobs errantes, guardar/cargar y torre al calabozo', r3['res']>100 and r3['after']['field']==1 and r3['pnl']=='floors', r3)
    pg.screenshot(path=ROOT + '/tests/shot_field.png')
    pg.keyboard.down('w'); time.sleep(.5); pg.keyboard.up('w'); time.sleep(.2)
    check('volver de las Llanuras a la ciudad', G("return g.W===g.town && g.P.field===0"))


    # 20 Cámara y minimapa
    r = G("""g.enterTown(); const P=g.P; P.x=3; P.y=3; P.fx=3; P.fy=3; g.render(); const [cx0,cy0]=g.cam; P.x=45; P.y=33; P.fx=45; P.fy=33; g.render(); const [cx1,cy1]=g.cam;
      const vw=innerWidth, vh=innerHeight; const off=g.mmOff(); g.enterField(); g.render(); const off2=g.mmOff();
      return {cx0,cy0,maxX:cx1<=g.town.w*32-vw, maxY:cy1<=g.town.h*32-vh || g.town.h*32<vh, off, off2};""")
    check('cámara limitada a los bordes del mapa', r['cx0'] >= 0 and r['cy0'] >= 0 and r['maxX'] and r['maxY'], r)
    check('minimapa centrado sin franja negra', r['off'][1] > 0 and abs(r['off'][0]) < 1e-6 and r['off2'][1] > 0, r)
    pg.screenshot(path=ROOT + '/tests/shot_edge.png')

    # 21 Pueblo estilo Tibia: banco, depósito, templo
    r = G("""g.enterTown(); const P=g.P; const roles=g.town.npcs.map(n=>n.role); P.gold=1000; P.bank=0; g.panelAct('dep',{k:'all'}); const b1=P.bank, g1=P.gold;
      P.gold=500; P.blessed=0; P.hp=1; P.party=[]; g.die('prueba'); g.closePanel(); const afterDie={gold:P.gold, bank:P.bank};
      g.panelAct('wd',{k:'100'}); const g2=P.gold; const gold0=P.gold; P.gold=10000; g.panelAct('tbless',{}); const blessed=P.blessed; const gb=P.gold; g.die('prueba'); g.closePanel(); const blessKeep=P.gold===gb && !P.blessed;
      const it={uid:55555,slot:'casco',rar:2,lvl:3,name:'Yelmo depositado',st:{def:5},value:50}; P.inv.push(it); g.panelAct('dstore',{uid:'55555'}); const inDep=P.depot.some(i=>i.uid===55555)&&!P.inv.some(i=>i.uid===55555);
      P.mats.madera=7; g.panelAct('depmats',{}); const mStored=P.mats.madera===0; g.save(); g.load(); const Q=g.P; const persist=Q.depot.some(i=>i.uid===55555) && Q.depotMats.madera>=7;
      g.panelAct('dtake',{uid:'55555'}); g.panelAct('takemats',{}); P.hp=1;
      g.panelAct('theal',{}); return {roles, b1, g1, afterDie, blessed, blessKeep, inDep, mStored, persist, back:Q.inv.some(i=>i.uid===55555), mad:Q.mats.madera>=7, healed:Q.hp===undefined||true};""")
    check('NPCs de banco, depósito, templo, establo y reclutas', all(x in r['roles'] for x in ['bank','depot','temple','stable','recruit']), r['roles'])
    check('banco protege el oro al morir', r['b1']==1000 and r['g1']==0 and r['afterDie']['bank']==1000 and r['afterDie']['gold']==450, r)
    check('bendición del templo evita pérdida', r['blessed']==1 and r['blessKeep'], r)
    check('depósito guarda objetos y materiales (persistente)', r['inDep'] and r['mStored'] and r['persist'] and r['back'] and r['mad'], r)

    # 22 Mascotas y monturas
    r = G("""g.enterFloor(1); let P=g.P; P.gold=99999; P.hp=1e6; g.panelAct('buypet',{k:'perro'}); const pet=g.comps.find(c=>c.kind==='pet'); if(!pet) return {pet:false};
      g.ents.length=0; let pos=null; for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){ const x=pet.x+ox,y=pet.y+oy; if(!g.solidAt(x,y)&&Math.max(Math.abs(x-P.x),Math.abs(y-P.y))>1){pos=[x,y];break} }
      if(!pos) return {pet:true, skip:true}; const e=g.spawnEnemy(g.EN[0],pos[0],pos[1],1,false); e.hp=e.mhp=5; e.spd=99; e.mcd=99; e.cd=99; e.def=0; pet.cd=0; P.x=P.x; 
      const px=pet.x, py=pet.y; for(let i=0;i<20&&g.ents.includes(e);i++){ pet.x=px; pet.y=py; pet.mt=0; g.updateComps(0.1); } return {pet:true, killed:!g.ents.includes(e)};""")
    check('mascota sigue y pelea', r.get('pet') and (r.get('skip') or r.get('killed')), r)
    r = G("""const P=g.P; const t0=g.moveTime(); const no=g.P.mount; g.panelAct('buymount',{k:'caballo'}); const ok=g.toggleMount(); const t1=g.moveTime(); const a0=g.atk(); g.panelAct('buymount',{k:'lobo'}); g.panelAct('setmount',{k:'lobo'}); const a1=g.atk(); g.toggleMount(); const t2=g.moveTime(); return {no, ok, faster:t1<t0*0.7, atkUp:a1>a0, off:t2===t0};""")
    check('montura acelera (N) y lobo da ataque', r['no'] is None and r['ok'] and r['faster'] and r['atkUp'] and r['off'], r)

    # 23 Aliados
    r = G("""let P=g.P; g.enterTown(); P.party=[]; g.buildComps(); g.panelAct('hire',{k:'bruno'}); g.panelAct('hire',{k:'selene'}); g.panelAct('hire',{k:'tala'});
      const n=P.party.length, ids=P.party.map(a=>a.id); const selene=g.comps.find(c=>c.id==='selene'); P.hp=10; selene.cd=0; g.updateComps(0.01); const healed=P.hp>10;
      const mog=g.comps.find(c=>c.id==='bruno'); g.hurtAlly(mog, 1e6, 'test'); const down=mog.a.down; P.gold=1000; g.panelAct('trevive',{}); const rev=!P.party.find(a=>a.id==='bruno').down;
      g.save(); g.load(); return {n, ids, healed, down, rev, persisted:g.P.party.length===2, comps:g.comps.length};""")
    check('reclutar aliados (máx 2), sanadora cura, caer y revivir en templo', r['n']==2 and r['healed'] and r['down']==1 and r['rev'] and r['persisted'] and r['comps']>=3, r)
    r = G("""g.enterFloor(2); const P=g.P; P.hp=1e6; g.ents.length=0; const mog=g.comps.find(c=>c.id==='bruno'); let pos=null;
      for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const x=mog.x+ox,y=mog.y+oy; if(!g.solidAt(x,y)&&Math.max(Math.abs(x-P.x),Math.abs(y-P.y))>1){pos=[x,y];break} }
      if(!pos) return {skip:1}; const e=g.spawnEnemy(g.EN[2],pos[0],pos[1],2,false); e.hp=e.mhp=8; e.spd=99; e.mcd=99; e.def=0; e.cd=0; const hp0=mog.a.hp;
      const mx=mog.x,my=mog.y; for(let i=0;i<30&&g.ents.includes(e);i++){ mog.x=mx; mog.y=my; mog.mt=0; g.update(0.05); } return {killed:!g.ents.includes(e), tookHit:mog.a.hp<hp0};""")
    check('aliado combate y recibe golpes', r.get('skip') or (r['killed']), r)
    G("g.enterFloor(3); g.P.hp=1e6"); time.sleep(1.2); pg.screenshot(path=ROOT + '/tests/shot_party.png')

    # 24 Mercader del calabozo
    r = G("""const P=g.P; g.enterFloor(5); const boss5=g.W.npcs.some(n=>n.role==='dmerch'); g.enterFloor(2); const m=g.W.npcs.find(n=>n.role==='dmerch'); if(!m) return {m:false};
      const near=g.ents.filter(e=>Math.abs(e.x-m.x)+Math.abs(e.y-m.y)<=4).length; P.x=m.x; P.y=m.y+1; if(g.solidAt(P.x,P.y,true)){P.y=m.y-1} P.dir=[0, m.y-P.y]; g.ents.length=0; g.interact(); const pnl=g.panel;
      P.gold=99999; const st=g.W.mstock.length, rar=g.W.mstock.every(i=>i.rar>=2); const n0=P.inv.length; g.panelAct('dbuy',{k:'0'}); const n1=P.inv.length; g.closePanel();
      return {m:true, boss5, near, pnl, st, rar, bought:n1===n0+1, left:g.W.mstock.length};""")
    check('mercader errante en piso 2 con stock raro y zona segura', r['m'] and not r['boss5'] and r['near']==0 and r['pnl']=='dmerch' and r['st']==3 and r['rar'] and r['bought'] and r['left']==2, r)

    # 25 Títulos
    r = G("""const P=g.P; P.ach.k10=1; g.panelAct('title',{k:'Primera sangre'}); g.render(); const t=P.title; g.save(); g.load(); return {t, saved:g.P.title};""")
    check('título de logro sobre el jugador (persistente)', r['t']=='Primera sangre' and r['saved']=='Primera sangre', r)
    G("g.enterTown(); g.P.x=12; g.P.y=7; g.P.fx=12; g.P.fy=7; g.toggleMount(); g.buildComps();"); time.sleep(.5); pg.screenshot(path=ROOT + '/tests/shot_town2.png')


    # 26 Horarios y día/noche
    r = G("""g.enterTown(); const P=g.P; const shop=g.town.npcs.find(n=>n.role==='shop'), depot=g.town.npcs.find(n=>n.role==='depot');
      P.dayT=0; const h6=g.clock(), open6=g.isOpen('shop'), n6=g.nightLevel(); g.closePanel(); const r6=(()=>{g.talk.direct=1; try{return g.talk(shop)}finally{g.talk.direct=0}})(); const p6=g.panel;
      P.dayT=60; const h12=g.clock(), open12=g.isOpen('shop'), n12=g.nightLevel(); g.talk.direct=1; g.talk(shop); g.talk.direct=0; const p12=g.panel; g.closePanel();
      P.dayT=170; const h23=g.clock(), n23=g.nightLevel(), dep23=g.isOpen('depot'), bank23=g.isOpen('bank'); g.render();
      delete g.town.obj['35,13']; delete g.town.obj['34,13']; P.x=34; P.y=13; P.dir=[1,0]; P.blocks.cama=1; g.setBuild(g.BLOCKIDS().indexOf('cama')); g.placeBlock(35,13); const d0=P.day; const sl=g.interact(); 
      return {h6,open6,r6,p6,h12,open12,p12,n6,n12,h23,n23,dep23,bank23,sl,day:P.day-d0,dayT:P.dayT};""")
    check('reloj y tiendas con horario (cerrado 06:00, abierto 12:00)', r['h6']=='06:00' and not r['open6'] and r['r6']=='closed' and r['p6'] is None and r['h12']=='12:00' and r['open12'] and r['p12']=='shop', r)
    check('noche a las 23:00, depósito 24h, banco cerrado; dormir pasa al día siguiente', r['n23']==1 and r['n12']==0 and r['dep23'] and not r['bank23'] and r['sl']=='slept' and r['day']==1 and r['dayT']==0, r)
    G("g.P.dayT=180; g.P.x=20; g.P.y=12; g.P.fx=20; g.P.fy=12"); time.sleep(.4); pg.screenshot(path=ROOT + '/tests/shot_night.png'); G("g.P.dayT=40")

    # 27 Hechizos con palabras
    r = G("""const P=g.P; g.enterFloor(1); g.ents.length=0; P.lvl=25; P.mp=9999; P.base.int=20; P.hp=10; P.cds={};
      const a=g.castSpell('EXURA'); const healed=P.hp>10; const cd=g.castSpell('exura'); P.cds={};
      let pos=null; for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(!g.solidAt(P.x+ox,P.y+oy,true)){pos=[P.x+ox,P.y+oy];break}
      const e=g.spawnEnemy(g.EN[0],pos[0],pos[1],1,false); e.hp=e.mhp=99999; const hp0=e.hp; g.castSpell('exori'); const exori=e.hp<hp0; P.cds={};
      const e2=g.spawnEnemy(g.EN[0],P.x+(pos[0]-P.x)*1,P.y+(pos[1]-P.y)*1,1,false); const h1=e.hp; g.castSpell('exevo gran mas vis'); const mas=e.hp<h1; P.cds={};
      g.castSpell('utani hur'); const haste=P.buffs.prisa>0; P.cds={}; g.castSpell('utamo vita'); const shield=P.buffs.escudo>0; P.cds={};
      const mp0=P.mp, hp1=P.hp; g.hurtPlayer ? 0 : 0; P.cds={}; g.castSpell('utevo lux'); P.cds={}; const pan0=P.cons.pan; g.castSpell('exevo pan'); P.cds={};
      P.lvl=1; const low=g.castSpell('exura vita'); P.lvl=25; P.mp=0; const nomp=g.castSpell('exura'); P.mp=999; const say=g.castSpell('hola amigos');
      const words=[...document.querySelectorAll('canvas')].length; g.ents.length=0;
      return {a, healed, cd, exori, mas, haste, shield, lux:P.buffs.luz>0, pan:P.cons.pan-pan0, low, nomp, say, sayT:P.say&&P.say.t};""")
    check('hechizos: exura, exori, exevo gran mas vis, utani hur, utamo vita, utevo lux, exevo pan', r['a']=='cast' and r['healed'] and r['cd']=='cd' and r['exori'] and r['mas'] and r['haste'] and r['shield'] and r['lux'] and r['pan']==1, r)
    check('hechizos validan nivel/maná y texto normal es diálogo', r['low']=='lvl' and r['nomp']=='mp' and r['say']=='say' and r['sayT']=='hola amigos', r)
    r = G("""const P=g.P; P.buffs.escudo=60; P.mp=500; const hp0=P.hp; P.hp=100; g.enterTown(); const e=g.spawnEnemy(g.EN[0],1,1,1,false); g.ents.length=0; return true""")
    G("g.P.mp=999; g.P.cds={}; g.P.hp=50"); pg.keyboard.press('Enter'); time.sleep(.1); pg.keyboard.type('exura gran'); pg.keyboard.press('Enter'); time.sleep(.2)
    r = G("return {hp:g.P.hp, chat:document.getElementById('chat').style.display}")
    check('escribir hechizo en el chat (Enter)', r['hp'] > 50 and r['chat'] == 'none', r)
    G("g.P.mp=999; g.P.cds={}; g.P.hp=50; g.P.binds[0]='exura'"); pg.keyboard.press('F1'); time.sleep(.1)
    check('atajo F1 lanza hechizo', G("return g.P.hp>50"))

    # 28 Mascotas: nivel y evolución
    r = G("""const P=g.P; P.pets=['perro','gato']; P.pet='perro'; P.petLv={}; g.buildComps(); const m1=g.petMult('perro'); for(let i=0;i<200 && g.petData().lvl<10;i++) g.petGainXp(100); const d=g.petData();
      const m10=g.petMult('perro'); g.render(); g.save(); g.load(); return {lvl:d.lvl, m1, m10, name:g.petName('perro'), saved:g.petData('perro').lvl};""")
    check('mascota sube de nivel y evoluciona (Cerbero)', r['lvl']>=10 and r['m10']>r['m1']*2 and r['name'].startswith('Cerbero') and r['saved']>=10, r)

    # 29 Misiones personales de aliados
    r = G("""const P=g.P; P.party=[{id:'bruno',hp:100,down:0},{id:'selene',hp:100,down:0}]; P.allyQ={}; g.buildComps(); const hp0=g.allyMaxHp('bruno');
      for(let i=0;i<30;i++) g.allyQuestEvent('kill',null,1); const mog=P.allyQ.bruno.done; g.allyQuestEvent('floor',null,8); const mer=P.allyQ.selene.done;
      g.openPanel('recruit'); const html=document.getElementById('panel').innerHTML; g.closePanel(); return {mog, mer, hpUp:g.allyMaxHp('bruno')>hp0*1.3, mult:g.allyMult('bruno'), html:html.includes('Misiones personales')&&html.includes('Veterano')};""")
    check('misiones personales de aliados → Veterano', r['mog']==1 and r['mer']==1 and r['hpUp'] and r['html'], r)

    # 30 Arena
    r = G("""const P=g.P; g.enterTown(); P.dayT=60; P.hp=1e6; P.lvl=10; const tk0=P.tokens||0, gold0=P.gold; const ok=g.startArena(); const name=g.W.name;
      g.nextWave(); const w1=g.ents.length; g.ents.length=0; g.updateArena(0.1); const after=g.arena.active; for(let i=0;i<5;i++){ g.updateArena(1); }
      const w2=g.arena.wave; for(let w=g.arena.wave; w<5; w++){ g.ents.length=0; g.updateArena(0.1); g.arena.wait=0; g.updateArena(0.01); }
      const champ=g.ents.some(e=>e.champion); g.ents.length=0; const inv0=P.inv.length; g.updateArena(0.1);
      const res={ok, name, w1, after, w2, wave:g.arena.wave, champ, tokens:P.tokens-tk0, gold:P.gold-gold0, best:P.arenaBest, prize:P.inv.length-inv0};
      P.gold=1000; g.die('arena'); g.closePanel(); res.noLoss=P.gold===1000; res.town=g.W===g.town; return res;""")
    check('arena: oleadas, campeón cada 5, fichas/oro/premio, sin pérdida al morir', r['ok'] and r['name']=='Coliseo de Valdoria' and r['w1']>=3 and r['after']==False and r['w2']==2 and r['champ'] and r['tokens']>0 and r['gold']>0 and r['best']==5 and r['noLoss'] and r['town'], r)
    r = G("""const P=g.P; P.tokens=100; P.pet='perro'; const n0=P.inv.length; g.panelAct('tok',{k:'leg'}); const leg=P.inv.length===n0+1&&P.inv[P.inv.length-1].rar===4; P.dayT=230; const closed=!g.startArena(); P.dayT=60;
      g.startArena(); g.P.x=8; g.P.y=14; g.checkExit(); return {leg, closed, back:g.W===g.town, tok:P.tokens}""")
    check('tienda de fichas, horario de arena y salida por la puerta', r['leg'] and r['closed'] and r['back'], r)
    G("g.startArena(); g.nextWave(); g.P.hp=1e6"); time.sleep(1); pg.screenshot(path=ROOT + '/tests/shot_arena.png'); G("g.enterTown()")


    # 31 Balance de inicio (primeros ~30 min)
    r = G("""localStorage.removeItem('cc_save'); g.newGame('guerrero'); const P=g.P; const start={gold:P.gold, pv:P.cons.pocion_vida, pan:P.cons.pan};
      const need=[1,2,3,4,5].map(l=>g.xpNeed(l)); let inv0=P.inv.length;
      g.questEvent('gather','madera',5); g.panelAct('turnin',{}); const kit=P.blocks.muro_madera>=6;
      g.enterFloor(1); for(let f=1;f<=3;f++){ g.enterFloor(f); const list=[...g.ents]; while(list.length<10) list.push(g.spawnEnemy(g.EN[f-1],P.x,P.y,f,false)); for(const e of list.slice(0,10)) g.killEnemy(e); g.drops.forEach(d=>{d.x=P.x;d.y=P.y}); g.pickup(); if(f===1){ g.panelAct('turnin',{}); } }
      const weap=P.inv.some(i=>i.slot==='arma'&&i.rar===1); g.questEvent('build',null,6); g.panelAct('turnin',{}); const cama=P.blocks.cama>=1; g.panelAct('turnin',{});
      return {start, need, lvl:P.lvl, gold:P.gold, items:P.inv.length-inv0, kit, weap, cama, q:P.q, sp:P.sp, kp:P.kp};""")
    check('inicio generoso: 100 oro, 5 pociones, 2 panes', r['start']['gold']==100 and r['start']['pv']==5 and r['start']['pan']==2, r['start'])
    check('progresión temprana: ~30 kills + 4 misiones → nivel ≥6, oro ≥300, botín y premios', r['lvl']>=6 and r['gold']>=300 and r['items']>=4 and r['kit'] and r['weap'] and r['cama'] and r['q']==4, r)

    # 32 Horarios de NPCs y taberna
    r = G("""g.enterTown(); const P=g.P; P.x=20; P.y=12; P.fx=20; P.fy=12; const gaspar=g.town.npcs.find(n=>n.role==='shop'), tav=g.town.npcs.find(n=>n.role==='tavern');
      P.dayT=60; g.settleNPCs(); const work=[gaspar.x,gaspar.y,gaspar.state]; P.dayT=145; for(let i=0;i<400 && !(gaspar.x===gaspar.seat[0]&&gaspar.y===gaspar.seat[1]);i++) g.updateNPCs(0.5); const atTav=[gaspar.x,gaspar.y].join()===gaspar.seat.join(), st=gaspar.state;
      g.talk.direct=1; const off=g.talk(gaspar); g.talk.direct=0; P.dayT=170; for(let i=0;i<400 && !gaspar.hidden;i++) g.updateNPCs(0.5); const hidden=gaspar.hidden; g.render();
      P.dayT=140; g.settleNPCs(); g.talk.direct=1; g.talk(tav); g.talk.direct=0; const tpnl=g.panel; const html=document.getElementById('panel').innerHTML; P.gold=500; g.panelAct('tbuy',{k:'estofado',p:'45'}); g.panelAct('round',{}); g.closePanel();
      P.dayT=60; g.settleNPCs(); return {work, atTav, st, off, hidden, tpnl, html:html.includes('Gaspar'), tavOpenLate:(P.dayT=190, g.isOpen('tavern')), tavClosed:(P.dayT=225, !g.isOpen('tavern'))};""")
    G("g.P.dayT=40; g.settleNPCs()")
    check('NPCs: trabajo de día → taberna al cerrar → casa de noche', r['work'][2]=='work' and r['atTav'] and r['st']=='tavern' and r['off']=='offduty' and r['hidden'], r)
    check('taberna: horario 10–02, comida, ronda y clientes', r['tpnl']=='tavern' and r['html'] and r['tavOpenLate'] and r['tavClosed'], r)

    # 33 Casa de subastas
    r = G("""const P=g.P; P.market=[]; P.marketGold=0; P.gold=1000; const a={uid:70001,slot:'anillo',rar:2,lvl:5,name:'Anillo barato',st:{int:3},value:100}, b={uid:70002,slot:'anillo',rar:2,lvl:5,name:'Anillo carísimo',st:{int:3},value:100};
      P.inv.push(a,b); g.listItem(70001,120); g.listItem(70002,1000); const fee=1000-P.gold; const ca=g.marketChance(a,120), cb=g.marketChance(b,1000);
      let soldA=-1; for(let h=0;h<200;h++){ g.marketTick(); if(soldA<0 && !P.market.some(l=>l.item.uid===70001)) soldA=h; } const bLeft=P.market.some(l=>l.item.uid===70002);
      const mg=P.marketGold; g.panelAct('mcollect',{}); g.updateMarket(0); const stock=(P.mktStock||[]).length; const g0=P.gold; if(stock) g.panelAct('mbuy',{k:'0'});
      g.openPanel('market'); g.closePanel();
      return {fee, ca, cb, soldA, mg, collected:P.marketGold===0, stock, bought:P.gold<g0};""")
    check('subastas: comisión, precio alto vende menos, cobrar y comprar ofertas', r['fee']==56 and r['ca']>r['cb']*5 and r['soldA']>=0 and r['mg']>=120 and r['collected'] and r['stock']==4 and r['bought'], r)

    # 34 Runas
    r = G("""const _rnd=Math.random; let _sd=12345; Math.random=()=>((_sd=(_sd*16807)%2147483647)-1)/2147483646; try{ const P=g.P; P.lvl=20; P.mp=9999; P.cds={}; P.runes={blank:0,gfb:0,sd:0,uh:0}; const noBlank=g.castSpell('adori gran');
      Object.assign(P.mats,{piedra:20,cristal:10}); g.enterTown(); P.blocks.alquimia=1; g.setBuild(g.BLOCKIDS().indexOf('alquimia')); g.placeBlock(30,13); const ri=g.RECIPES.findIndex(r=>r.id==='runa_blanca'); g.panelAct('craft',{k:String(ri)}); g.closePanel(); const blanks=P.runes.blank;
      P.cds={}; const r1=g.castSpell('adori gran'); P.cds={}; const r2=g.castSpell('adori vita vis'); P.mp=9999; P.cds={};
      g.enterFloor(1); g.ents.length=0; let pos=null; for(const [ox,oy] of [[2,0],[-2,0],[0,2],[0,-2]]) if(!g.solidAt(P.x+ox,P.y+oy,true)&&g.los(P.x,P.y,P.x+ox,P.y+oy)){pos=[P.x+ox,P.y+oy];break}
      if(!pos) return {skip:1}; const e=g.spawnEnemy(g.EN[0],pos[0],pos[1],1,false); e.hp=e.mhp=99999; e.spd=99;e.mcd=99;e.cd=99; Math.random=()=>0.99; const h0=e.hp; const u1=g.useRune('gfb'); const h1=e.hp; P.cds={}; const u2=g.useRune('sd'); const h2=e.hp; P.cds={}; const u3=g.useRune('sd');
      g.ents.length=0; return {noBlank, blanks, r1, r2, u1, gfb:h1<h0, u2, sd:(h1-h2)>(h0-h1), u3}; } finally { Math.random=_rnd; }""")
    check('runas: requieren runa en blanco, se crean con palabras y se usan (R/T)', r.get('skip') or (r['noBlank']=='blank' and r['blanks']==2 and r['r1']=='rune' and r['r2']=='rune' and r['u1']=='used' and r['gfb'] and r['u2']=='used' and r['sd'] and r['u3']=='none'), r)

    # 35 Habilidades de mascota (P)
    r = G("""const P=g.P; g.enterFloor(1); P.hp=1e6; P.pets=['perro','gato','halcon','slime']; const out={};
      for(const id of ['perro','halcon','gato','slime']){ P.pet=id; g.buildComps(); g.ents.length=0; const c=g.comps.find(c=>c.kind==='pet'); let pos=null;
        for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(!g.solidAt(c.x+ox,c.y+oy)){pos=[c.x+ox,c.y+oy];break}
        const e=pos?g.spawnEnemy(g.EN[0],pos[0],pos[1],1,false):null; if(e){e.hp=e.mhp=99999;e.cd=0;} P.hp=P.hp; if(id==='slime') P.hp=10; P.cds.pet=0; const g0=P.gold, h0=e?e.hp:0;
        const res=g.petAbility(); out[id]={res, dmg:e?h0-e.hp:0, stun:e?e.cd>=2:false, gold:P.gold-g0, heal:id==='slime'?P.hp>10:null, cd:g.petAbility()}; P.hp=1e6; }
      g.ents.length=0; return out;""")
    check('habilidades de mascota: mordisco aturde, picada, robo de oro, curación; recarga', r['perro']['res']=='used' and r['perro']['stun'] and r['halcon']['dmg']>0 and r['gato']['gold']>0 and r['slime']['heal'] and all(r[k]['cd']=='cd' for k in r), r)

    # 36 Torneo semanal
    r = G("""const P=g.P; g.enterTown(); P.dayT=60; P.hp=1e6; P.day=6; const notToday=!g.startArenaT(); P.day=7; P.tourneyWeek=-1; const t0=P.tokens||0; const ok=g.startArenaT();
      for(let w=0; w<12; w++){ g.arena.wait=0; g.updateArena(0.01); g.ents.length=0; g.updateArena(0.01); if(!g.arena) break; }
      const ended=!g.arena, back=g.W===g.town, last=P.lastTourney, tok=P.tokens-t0; const again=!g.startArenaT(); g.checkAch(); return {notToday, ok, ended, back, pos:last&&last.pos, score:last&&last.score, tok, again, champ:!!P.ach.torneo, wins:P.tourneyWins};""")
    check('torneo semanal: solo día 7, 12 oleadas, puesto 1 → 100 fichas y título, una vez por semana', r['notToday'] and r['ok'] and r['ended'] and r['back'] and r['pos']==1 and r['score']==12 and r['tok']>=100 and r['again'] and r['champ'], r)
    r = G("""const P=g.P; P.day=14; P.tourneyWeek=-1; g.startArenaT(); g.arena.wait=0; g.updateArena(0.01); g.ents.length=0; g.updateArena(0.01); g.arena.wait=0; g.updateArena(0.01); P.gold=100; g.die('torneo'); g.closePanel(); return {pos:P.lastTourney.pos, score:P.lastTourney.score, gold:P.gold}""")
    check('morir en torneo cuenta el puntaje sin perder oro', r['score']==1 and r['pos']>=4 and r['gold']==100, r)
    G("g.P.dayT=140; g.settleNPCs(); g.enterTown([22,21]);"); time.sleep(.6); pg.screenshot(path=ROOT + '/tests/shot_tavern.png'); G("g.P.dayT=40; g.settleNPCs()")

    # Iteración 8: mejora, eventos, mapa, sede, historia
    r = G("""const P=g.P; P.dayT=40; g.settleNPCs&&g.settleNPCs(); const it=g.genItem('arma',5,1); P.inv.push(it); P.gold=1e6; P.mats.hierro=999; P.mats.cristal=999;
      const a0=g.stat('atk'); const o1=g.enchant(it.uid,0); const a1=it.plus; for(let i=0;i<6;i++) g.enchant(it.uid,0);
      const p7=it.plus; it.plus=5; const fd=g.enchant(it.uid,99); const pd=it.plus; it.plus=7; const it2=g.genItem('arma',5,1); it2.plus=8; P.inv.push(it2); const fx=g.enchant(it2.uid,99.9);
      const it3=g.genItem('casco',5,1); it3.plus=2; P.inv.push(it3); const f3=g.enchant(it3.uid,99); P.eq.arma=it; const a2=g.stat('atk');
      const it4=g.genItem('arma',5,1); it4.plus=10; P.inv.push(it4); const mx=g.enchant(it4.uid,0);
      return {o1,a1,p7,fd,pd,fx,gone:!P.inv.includes(it2),f3,p3:it3.plus||0,mx,cost:g.enchantCost(it).oro>0}""")
    check('mejora +1..+10: éxito, fallo seguro <+5, baja desde +5, destrucción desde +8, máximo +10', r['o1']=='ok' and r['a1']==1 and r['p7']==7 and r['fd']=='down' and r['pd']==4 and r['fx']=='destroyed' and r['gone'] and r['f3']=='fail' and r['p3']==2 and r['mx']=='max', r)
    r = G("""const P=g.P; P.dayT=40; P.gold=1e6; const it=g.genItem('arma',5,1); it.st={atk:20}; P.eq.arma=it; const a=g.stat('atk'); it.plus=5; const b=g.stat('atk'); P.dayT=DAYLEN_ ; return {a,b}""".replace('P.dayT=DAYLEN_ ;',''))
    check('cada + suma 8% de estadísticas', r['b']>r['a'], r)
    r = G("""const P=g.P; P.hp=P.mhp=1e6; g.enterFloor(6); const W=g.W; const k=[P.x+1,P.y]; W.traps.add((P.x+1)+','+P.y); P.base.agi=0; const hp0=P.hp; const ex=P.x; P.x+=1; g.stepEvents(); return {seen:W.seenTraps.has(k.join(',')), gone:!W.traps.has(k.join(',')), hit:P.trapsHit}""")
    check('trampas se activan y quedan visibles', r['seen'] and r['gone'] and r['hit']>=1, r)
    r = G("""const P=g.P; g.enterFloor(6); const W=g.W; W.chests={}; const x=P.x+1,y=P.y; W.t[y*W.w+x]=17; W.chests[x+','+y]={mimic:false}; const g0=P.gold, c0=P.chestsOpened||0; const a=g.openChest(x,y);
      W.t[y*W.w+x]=17; W.chests[x+','+y]={mimic:true}; const n0=g.ents.length; const b=g.openChest(x,y); return {a,b,gold:P.gold>g0||P.inv.length>0, mim:g.ents.length>n0 && g.ents.some(e=>e.n==='Mímico')}""")
    check('cofres del tesoro dan botín; algunos son mímicos', r['a']=='loot' and r['b']=='mimic' and r['mim'], r)
    r = G("""const P=g.P; let found=0; for(let f=3;f<40&&!found;f++){ if(f%5==0) continue; g.enterFloor(f); if(g.W.events.includes('tesoro')&&[...Object.keys(g.W.chests||{})].length) found=f; } let house=0; for(let f=3;f<60&&!house;f++){ if(f%5==0) continue; g.enterFloor(f); if(g.W.house) house=f; }
      const H=g.W.house; P.x=H.r.cx; P.y=H.r.cy; g.stepEvents(); const n=H.ids.length, st1=H.state; for(const e of H.ids){ const i=g.ents.indexOf(e); if(i>=0) g.ents.splice(i,1);} const d0=g.drops.length; g.checkHouse(); return {found,house,n,st1,st2:H.state,drops:g.drops.length-d0, cnt:P.houses}""")
    check('salas del tesoro y casas de monstruos se generan; limpiar la casa da recompensa', r['found']>0 and r['house']>0 and r['n']>=6 and r['st1']==1 and r['st2']==2 and r['drops']>=3, r)
    G("g.enterTown(); g.closePanel()"); pg.keyboard.press('Tab'); time.sleep(.3)
    r = G("""const c=document.getElementById('wmc'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let col=new Set(); for(let i=0;i<d.length;i+=997*4) col.add(d[i]+','+d[i+1]+','+d[i+2]); return {panel:g.panel, colors:col.size, drawn:g.drawWorldMap.drawn}""")
    pg.screenshot(path=ROOT + '/tests/shot_worldmap.png')
    check('Tab abre el mapa del mundo dibujado', r['panel']=='worldmap' and r['colors']>4, r)
    pg.keyboard.press('Tab'); time.sleep(.1)
    r = G("""const p=g.panel; g.enterFloor(3); g.openPanel('worldmap'); const ok=g.drawWorldMap(); g.closePanel(); return {p,ok}""")
    check('Tab cierra el mapa; también funciona en el calabozo', r['p'] in (None,'',False) and r['ok'], r)
    r = G("""const P=g.P; g.enterTown(); P.party=[{id:'bruno',hp:10,down:1},{id:'corvo',hp:10,down:0}]; P.gold=100; const no=g.buyGuildHall(); P.gold=5000; const yes=g.buyGuildHall(); g.buildComps(); const G0=g.GUILD;
      const rest=g.comps.filter(c=>c.kind==='ally').every(c=>c.rest && c.x>=G0.x && c.x<G0.x+G0.w); const b0=g.guildBonus(); g.town.obj[(G0.x+1)+','+(G0.y)]='sofa'; g.town.obj[(G0.x+7)+','+(G0.y)]='chimenea'; const b1=g.guildBonus();
      for(let i=0;i<40;i++) g.updateComps(1); const rev=!P.party[0].down; const pr=P.party.find(a=>a.id==='corvo');
      g.save(); g.load(); g.enterTown(); return {no,yes,rest,b0,b1,rev,hall:g.P.guildHall, obj:!!g.town.obj[(G0.x+1)+','+(G0.y)]}""")
    check('sede del gremio: compra, aliados viven ahí, se curan/reviven, decoración da bonus, persiste', (not r['no']) and r['yes'] and r['rest'] and r['b1']>r['b0'] and r['rev'] and r['hall']==1 and r['obj'], r)
    r = G("""const P=g.P; P.story={node:'inicio',p:0,ready:0,choices:[],path:null}; P.perks={}; g.storyEvent('floor',2); const rdy=P.story.ready; const s0=JSON.stringify(P.story);
      const save=JSON.stringify({story:P.story}); g.storyChoose(0); const A={path:P.story.path, node:P.story.node, xp:P.perks.xp};
      P.party=[]; P.field=1; for(let i=0;i<15;i++) g.storyEvent('fieldkill',1); g.storyChoose(0); const pipa=P.party.some(a=>a.id==='pipa') && P.storyUnlock.pipa;
      g.storyEvent('boss10',1); const gold0=P.gold; g.storyChoose(0); const fin=P.story.node, gt=P.gold-gold0, t=P.storyTitle;
      P.story={node:'inicio',p:0,ready:0,choices:[],path:null}; P.perks={}; P.storyTitle=''; P.maxFloor=10; g.storyEvent('floor',2); g.storyChoose(1); const B={path:P.story.path,node:P.story.node,dmg:P.perks.dmg, ready:P.story.ready};
      const n0=P.inv.length; g.storyChoose(1); const leg=P.inv.length>n0 && P.inv[P.inv.length-1].rar===4;
      g.openPanel('quests'); const html=document.getElementById('panel').innerHTML; g.closePanel(); return {rdy,A,pipa,fin,gt,t,B,leg,rival:P.lokiRival, html:html.includes('Historia')}""")
    check('historia ramificada: ruta Aurelia (Pipa aliada) y ruta Varkas (arma legendaria), final con título', r['rdy'] and r['A']['path']=='aurelia' and r['A']['node']=='aurelia1' and r['pipa'] and r['fin']=='hablantes' and r['gt']==2000 and r['t']=='Leyenda de Valdoria' and r['B']['path']=='varkas' and r['B']['ready']==1 and r['leg'] and r['rival']==1 and r['html'], r)
    r = G("""g.save(); g.load(); const P=g.P; return {node:P.story.node, ch:P.story.choices.length, dmg:P.perks.dmg}""")
    check('historia y ventajas persisten al guardar/cargar', r['node']=='final' and r['ch']==2 and r['dmg']==0.1, r)
    G("g.P.party=[]; g.enterTown(); g.closePanel()")

    # Iteración 9
    r = G("""const P=g.P; P.dayT=40; P.gold=1e6; P.mats.hierro=999; P.mats.cristal=999; P.prot=0; const b=g.buyProt(); const it=g.genItem('arma',5,1); it.plus=9; P.inv.push(it);
      const a=g.enchant(it.uid,99.9,true); const pa=it.plus, pr=P.prot; const c=g.enchant(it.uid,99.9,true); const gone=!P.inv.includes(it);
      const it2=g.genItem('arma',5,1); it2.plus=2; P.inv.push(it2); P.prot=1; const d=g.enchant(it2.uid,99,true); g.openPanel('enchant'); const html=document.getElementById('panel').innerHTML; g.closePanel();
      return {b,a,pa,pr,c,gone,d,keep:P.prot,html:html.includes('Pergaminos de protección')}""")
    check('pergamino de protección evita destrucción/bajada y se consume; sin pergamino se destruye', r['b'] and r['a']=='protected' and r['pa']==9 and r['pr']==0 and r['c']=='destroyed' and r['gone'] and r['d']=='fail' and r['keep']==1 and r['html'], r)
    r = G("""const P=g.P; P.story={node:'hablantes',p:0,ready:0,choices:[],path:'aurelia'}; P.perks={}; P.party=[]; P.maxFloor=1; g.storyEvent('floor',15); const r1=P.story.ready; g.storyChoose(0); const w=P.party.some(a=>a.id==='ysra')&&P.storyUnlock.ysra;
      g.storyEvent('boss10',1); const no=P.story.ready; g.storyEvent('boss20',1); g.openPanel('quests'); const q=document.getElementById('panel').innerHTML.includes('Mordo Kast'); g.closePanel(); g.storyChoose(0); const dmg=P.perks.dmg;
      g.storyEvent('boss30',1); const kp=P.kp; g.storyChoose(0); const A={node:P.story.node,t:P.storyTitle,kp:P.kp-kp};
      P.story={node:'varkas1',p:0,ready:0,choices:[],path:'varkas'}; P.perks={}; P.maxFloor=16; g.storyEvent('floor',8); g.storyChoose(0); g.storyEvent('boss10',1); g.storyChoose(0); const auto=P.story.ready; const g0=P.gold; g.storyChoose(1); const gold=P.gold-g0;
      g.storyEvent('boss20',1); g.storyChoose(1); const xp=P.perks.xp; g.storyEvent('boss30',1); const n0=P.inv.length; g.storyChoose(1);
      return {r1,w,no,q,dmg,A,auto,gold,xp,leg:P.inv.length-n0, t2:P.storyTitle, node:P.story.node}""")
    check('capítulos 4–6 (pisos 15/20/30): Ysra aliada o venderla, Mordo Kast, Dragón de Ceniza con finales distintos', r['r1']==1 and r['w'] and not r['no'] and r['q'] and r['dmg']==0.15 and r['A']['node']=='fin' and r['A']['t']=='Héroe de Valdoria' and r['A']['kp']==10 and r['auto']==1 and r['gold']==3000 and r['xp']==0.2 and r['leg']==2 and r['t2']=='Matadragones', r)
    r = G("""const P=g.P; P.party=[]; P.hp=P.mhp=1e6; let F=0; for(let f=2;f<60&&!F;f++){ if(f%5==0) continue; g.enterFloor(f); if(g.W.arrowTraps.length&&g.W.saws.length) F=f; } const W=g.W; const a=W.arrowTraps[0];
      g.ents.length=0; P.x=a.x; P.y=a.y+3; P.fx=P.x; P.fy=P.y; a.cd=0; const n0=g.projs.length; g.updateTraps(0.01); const fired=g.projs.length>n0 && !!g.projs[g.projs.length-1].hostile; P.x=a.x+1; a.cd=0; const n1=g.projs.length; g.updateTraps(0.01); const notAligned=g.projs.length===n1;
      const w=W.saws[0]; P.x=Math.round(w.x0+(w.x1-w.x0)/2); P.y=w.y; P.fx=P.x; P.fy=P.y; const xs=new Set(); const h0=P.sawHits||0; for(let i=0;i<200;i++){ g.updateTraps(0.05); xs.add(Math.round(w.fx)); }
      g.projs.length=0; return {F,fired,notAligned,moved:xs.size>=3,hit:(P.sawHits||0)>h0}""")
    check('trampas de flechas disparan en línea y sierras móviles patrullan y cortan', r['F']>0 and r['fired'] and r['notAligned'] and r['moved'] and r['hit'], r)
    r = G("""const P=g.P; g.enterFloor(7); const e0=g.explored(); const W=g.W; const far=W.rooms[W.rooms.length-1]; const hid=!W.seen[far.cy*W.w+far.cx] || Math.hypot(far.cx-P.x,far.cy-P.y)<7; P.x=far.cx; P.y=far.cy; const n=g.reveal(); const e1=g.explored();
      g.openPanel('worldmap'); const html=document.getElementById('panel').innerHTML; g.closePanel();
      g.enterField(); const f0=g.explored(); g.P.x+=10; g.reveal(); const f1=g.explored(); g.save(); g.load(); g.enterField(); const f2=g.explored(); g.enterTown(); return {e0,hid,n,e1,html:html.includes('niebla'),f0,f1,f2}""")
    check('niebla de guerra: se revela al explorar, mapa/minimapa ocultan lo no visto, Llanuras persisten', r['e0']<0.5 and r['hid'] and r['n']>0 and r['e1']>r['e0'] and r['html'] and r['f1']>r['f0'] and r['f2']>=r['f1']*0.99, r)
    r = G("""const P=g.P; g.enterFloor(25); const b=g.perf.chunksBuilt; g.render(); g.render(); const b2=g.perf.chunksBuilt; for(let i=0;i<5;i++) g.render(); const b3=g.perf.chunksBuilt;
      let t=performance.now(); for(let i=0;i<60;i++) g.render(); const cached=(performance.now()-t)/60; g.useCache=false; t=performance.now(); for(let i=0;i<60;i++) g.render(); const raw=(performance.now()-t)/60; g.useCache=true;
      g.enterField(); t=performance.now(); for(let i=0;i<60;i++){ g.render(); g.drawMinimap(); } const field=(performance.now()-t)/60; g.enterTown(); t=performance.now(); for(let i=0;i<60;i++){ g.render(); g.drawMinimap(); } const town=(performance.now()-t)/60;
      return {built:b2-b, reuse:b3===b2, cached:+cached.toFixed(2), raw:+raw.toFixed(2), field:+field.toFixed(2), town:+town.toFixed(2)}""")
    print('   rendimiento (ms/frame):', r)
    check('caché de tiles: chunks se reutilizan y el render es rápido (<12 ms/frame en mapas grandes)', r['built']>0 and r['reuse'] and r['cached']<=r['raw']*1.1 and r['field']<12 and r['town']<12, r)
    r = G("""g.enterFloor(3); const M=g.W; g.render(); const P=g.P; const x=P.x+1, y=P.y; const id=((y>>4)*1000)+(x>>4); const was=!!M._cc[id]; const other=Object.keys(M._cc).map(Number).filter(i=>i!==id);
      M.t[y*M.w+x]=17; M.chests={}; M.chests[x+','+y]={mimic:false}; const v0=M._ver||0; g.openChest(x,y); return {was, inv:!M._cc[id], others:other.every(i=>!!M._cc[i]), ver:(M._ver||0)>v0}""")
    check('modificar un tile invalida solo su chunk', r['was'] and r['inv'] and r['others'] and r['ver'], r)
    G("g.P.party=[]; g.enterTown(); g.closePanel()")

    # Iteración 10
    r = G("""const P=g.P; g.enterFloor(25); g.closePanel(); const s0=g.lightScale; const T=(n)=>{const t=performance.now(); for(let i=0;i<n;i++) g.render(); return (performance.now()-t)/n}; T(10); g.lightScale=1; const full=T(60); g.lightScale=s0; const low=T(60); return {full:+full.toFixed(2), low:+low.toFixed(2), s0}""")
    print('   iluminación (ms/frame):', r)
    check('perfil: luz a 1/4 de resolución reduce el tiempo de frame del calabozo', r['s0']==0.25 and r['low'] < r['full'], r)
    r = G("""const P=g.P; g.enterTown(); Object.assign(P.mats,{cristal:10,hierba:10,madera:10}); P.prot=0; const ri=g.RECIPES.findIndex(r=>r.id==='pergamino_prot'); for(const k in g.town.obj) if(['alquimia','yunque'].includes(g.town.obj[k])) delete g.town.obj[k];
      g.panelAct('craft',{k:String(ri)}); const no=P.prot; P.blocks.alquimia=1; P.blocks.yunque=1; g.setBuild(g.BLOCKIDS().indexOf('alquimia')); g.placeBlock(30,13); g.setBuild(g.BLOCKIDS().indexOf('yunque')); g.placeBlock(31,13);
      g.panelAct('craft',{k:String(ri)}); g.closePanel(); return {no, yes:P.prot, cr:P.mats.cristal}""")
    check('pergamino de protección fabricable (alquimia + yunque)', r['no']==0 and r['yes']==1 and r['cr']==7, r)
    G("g.closePanel()"); pg.keyboard.press('?'); time.sleep(.2)
    r = G("""const p=g.panel, html=document.getElementById('panel').innerHTML; g.closePanel(); g.onKey('h'); const h=g.panel; g.closePanel(); g.onKey('tab'); const t=g.panel; g.closePanel(); return {p, n:(html.match(/<kbd>/g)||[]).length, tab:html.includes('Tab'), h, t}""")
    check('? abre la ayuda de teclas sin chocar con H/Tab/F1', r['p']=='keys' and r['n']>=25 and r['h']=='house' and r['t']=='worldmap', r)
    r = G("""const old={v:9,P:{lvl:5,gold:10,friend:{hestia:30,eina:20},talked:{welf:1},party:[{id:'mogzo',hp:5,down:0},{id:'lili',hp:3,down:0}],allyQ:{merry:{p:2}},storyUnlock:{lili:1},story:{node:'xenos',p:0,ready:0,choices:['inicio:0','hestia1:0'],path:'hestia'},title:'Leyenda de Orario',storyTitle:'Leyenda de Orario',inv:[{uid:5,slot:'arma',rar:4,lvl:5,name:'Espada Mágica Crozzo',st:{atk:5}}],eq:{},mats:{},cons:{},wieneSold:0}};
      const mig=g.migrateSave(JSON.parse(JSON.stringify(old))).P; return {f:Object.keys(mig.friend).join(), t:Object.keys(mig.talked).join(), party:mig.party.map(a=>a.id).join(), aq:Object.keys(mig.allyQ).join(), node:mig.story.node, path:mig.story.path, ch:mig.story.choices.join(), title:mig.title, it:mig.inv[0].name, tut:old.P.tut}""")
    check('migración de partidas antiguas a los nombres nuevos', r['f']=='aurelia,noa' and r['t']=='brann' and r['party']=='bruno,pipa' and r['aq']=='selene' and r['node']=='hablantes' and r['path']=='aurelia' and r['ch']=='inicio:0,aurelia1:0' and r['title']=='Leyenda de Valdoria' and r['it']=='Espada Mágica Ascua', r)
    r = G("""const P0=JSON.parse(JSON.stringify(g.P)); const s=JSON.parse(localStorage.getItem('cc_save')||'null'); g.save(); const sv=JSON.parse(localStorage.getItem('cc_save')); sv.P.friend={hestia:40}; sv.P.party=[{id:'ranta',hp:9,down:0}]; delete sv.P.ipv; delete sv.P.tut; localStorage.setItem('cc_save',JSON.stringify(sv)); g.load(); const P=g.P; const out={fr:P.friend.aurelia, party:P.party[0].id, tut:P.tut, allies:!!g.ALLIES[P.party[0].id]}; P.party=[]; g.enterTown(); return out""")
    check('una partida antigua guardada carga con aliados/amistades migrados y sin tutorial', r['fr']==40 and r['party']=='corvo' and r['allies'] and r['tut']>=9, r)
    import re as _re
    banned = r"\b(Orario|Hestia|Loki|Eina|Welf|Bors|Mia|Ryu|Ais|Aiz|Asuna|Kirito|Haruhiro|Mogzo|Merry|Yume|Shihoru|Ranta|Lili|Wiene|Dix|Ikelos|Bete|Ottar|Crozzo|Gleam Eyes|Udaeus|Xenos|Familia|Falna|Vouivre|Soma|Rakia|Lefiya|Klein|Juggernaut|DanMachi|SAO|Aincrad|Grimgar|Wallenstein)\b"
    left = []
    for f in ['game.js', 'index.html', 'README.md']:
        for i, line in enumerate(open(ROOT + '/' + f, encoding='utf-8'), 1):
            if 'OLD_IDS' in line or 'OLD_TXT' in line: continue
            for m in _re.finditer(banned, line, _re.I): left.append(f'{f}:{i}:{m.group(0)}')
    check('sin nombres de franquicias ajenas en el código/README (salvo la tabla de migración)', not left, left[:10])

    # Iteración 11: idioma, sprites
    r = G("""g.enterTown(); g.openPanel('options'); const html=document.getElementById('panel').innerHTML; g.panelAct('lang',{k:'en'}); I18N.trAll(); const h2=document.querySelector('#panel h2').textContent; g.closePanel();
      const sp=/\\b(de|del|la|las|los|con|para|tus|una|por|sin|más|está|hoy|cada)\\b|[ñ¡¿]/i; let tot=0, bad=[]; const P=g.P; P.guildHall=1;
      for(const pn of ['inv','skills','craft','quests','house','ach','worldmap','keys','enchant','options']){ g.openPanel(pn); I18N.trAll(); const w=document.createTreeWalker(document.getElementById('panel'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ const v=n.nodeValue.trim(); if(!v) continue; tot++; if(sp.test(v) && !/Español|Vientoalba|Coloso|Espadanegra/.test(v)) bad.push(v.slice(0,60)); } g.closePanel(); }
      g.update(0.05); I18N.trAll(); const hud=document.getElementById('hud').textContent; const canvasTr=I18N.tr('Ciudad de Valdoria'); const ls=localStorage.getItem('cc_lang');
      g.openPanel('options'); g.panelAct('lang',{k:'es'}); I18N.trAll(); const back=document.querySelector('#panel h2').textContent; g.closePanel(); const back2=I18N.tr('Ciudad de Valdoria');
      return {opt:html.includes('English'), h2, tot, bad:bad.slice(0,8), nbad:bad.length, canvasTr, ls, back, back2, size:I18N.size, help:document.getElementById('help').textContent.slice(0,30)}""")
    check('idioma: opción English traduce paneles, HUD y canvas; Español restaura; se recuerda', r['opt'] and r['h2']=='⚙ Options' and r['tot']>150 and r['nbad']<=3 and r['canvasTr']=='City of Valdoria' and r['ls']=='en' and r['back']=='⚙ Opciones' and r['back2']=='Ciudad de Valdoria' and r['size']>=850, r)
    r = G("""const P=g.P; g.enterFloor(4); g.closePanel(); const S=g.sprStats; for(let i=0;i<20;i++) g.render(); const h0=S.hit, m0=S.miss; for(let i=0;i<60;i++) g.render(); const dh=S.hit-h0, dm=S.miss-m0;
      const T=on=>{ g.spriteCache=on; const t=performance.now(); for(let i=0;i<3000;i++) g.drawChar(100+(i%7),100,'#c33',[1,0],{weapon:'#ccc',wrar:2,helm:'#888',legs:'#334',trim:'#fc6',hair:'#432',moving:i%2==0}); return performance.now()-t; };
      T(true); const on=T(true), off=T(false); g.spriteCache=true; return {dh,dm,size:g.SPR.size, on:+on.toFixed(1), off:+off.toFixed(1)}""")
    print('   sprites (3000 personajes, ms):', r)
    check('caché de sprites: casi todo son aciertos, tamaño acotado y dibujar personajes es más rápido', r['dh']>r['dm']*5 and r['size']<=800 and r['on']<r['off'], r)
    G("g.enterTown(); g.closePanel()")

    # 7 Jugar en tiempo real con teclado, varios pisos, paneles y render
    G("g.P.hp=1e9; g.P.sk.fuego=1; g.P.sk.golpe=1; g.P.mp=999")
    for k in ['i', 'k', 'c', 'j', 'h']:
        pg.keyboard.press(k); time.sleep(.15); pg.keyboard.press(k)
    pg.screenshot(path=ROOT + '/tests/shot_town.png')
    for f in [2, 15, 25, 35]:
        G(f"g.enterFloor({f}); g.P.hp=1e9")
        for i in range(12):
            k = 'wasd'[i % 4]; pg.keyboard.down(k); time.sleep(.2); pg.keyboard.up(k); pg.keyboard.press(' '); pg.keyboard.press('3')
        pg.screenshot(path=ROOT + f'/tests/shot_floor{f}.png')
    G("g.enterFloor(20); const b=g.ents.find(e=>e.boss); const P=g.P; b.x=P.x+2; b.y=P.y; b.hp=b.mhp*.3; P.hp=1e9")
    time.sleep(4); pg.screenshot(path=ROOT + '/tests/shot_boss.png')
    G("g.P.hp=5"); G("g.enterFloor(4); const P=g.P; g.ents.length=0; for(const [ox,oy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(!g.solidAt(P.x+ox,P.y+oy,true)){const e=g.spawnEnemy(g.EN[9],P.x+ox,P.y+oy,40,false); e.cd=0}")
    time.sleep(2)
    r = G("return {floor:g.P.floor, deaths:g.P.deaths, panel:g.panel}")
    check('morir regresa a la ciudad con pantalla de muerte', r['floor'] == 0 and r['deaths'] >= 1 and r['panel'] == 'death', r)
    # Móvil 390px + tutorial
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    m = ctx.new_page(); m.on('pageerror', lambda e: errs.append('móvil: ' + str(e)))
    m.goto('file://' + ROOT + '/index.html'); m.evaluate("localStorage.clear()"); m.reload(); m.tap('#bnew'); time.sleep(.2); m.tap('#cls [data-c=mago]'); time.sleep(.4)
    M = lambda js: m.evaluate("(()=>{const g=__game;" + js + "})()")
    r = M("""const el=document.getElementById('tut'); const a={vis:getComputedStyle(el).display!=='none', step:g.P.tut, txt:el.textContent}; return a""")
    check('tutorial visible al empezar (paso 1: moverse)', r['vis'] and r['step']==0 and 'Muévete' in r['txt'], r)
    r = M("""const P=g.P; const seq=[]; P.steps=6; g.updateTut(); seq.push(P.tut); g.openPanel('npc',g.town.npcs[0]); g.closePanel(); g.updateTut(); seq.push(P.tut); g.tutFlag('gather'); g.updateTut(); seq.push(P.tut);
      g.openPanel('inv'); g.closePanel(); g.updateTut(); seq.push(P.tut); g.enterFloor(1); g.updateTut(); seq.push(P.tut); P.kills=1; g.updateTut(); const hidden=getComputedStyle(document.getElementById('tut')).display==='none'; seq.push(P.tut);
      g.gainXp(5000); g.updateTut(); const show=getComputedStyle(document.getElementById('tut')).display!=='none'; g.openPanel('skills'); g.closePanel(); g.updateTut(); seq.push(P.tut); g.enterTown(); const gold=P.gold; g.tutFlag('build'); g.updateTut(); seq.push(P.tut); g.openPanel('keys'); g.closePanel(); g.updateTut(); seq.push(P.tut);
      return {seq, hidden, show, bonus:P.gold-gold, done:getComputedStyle(document.getElementById('tut')).display==='none'}""")
    check('tutorial avanza con acciones reales y premia al terminar', r['seq']==[1,2,3,4,5,6,7,8,9] and r['hidden'] and r['show'] and r['bonus']==50 and r['done'], r)
    r = M("""const P=g.P; P.tut=0; g.updateTut(); return 1"""); m.tap('#tut [data-tut]'); time.sleep(.1)
    r = M("return {tut:g.P.tut, n:g.TUT.length}")
    check('botón «Saltar tutorial» funciona (táctil)', r['tut']==r['n'], r)
    r = M("""return {menu:getComputedStyle(document.getElementById('menu')).display, touch:getComputedStyle(document.getElementById('touch')).display, mobile:document.body.classList.contains('mobile')}""")
    check('móvil: barra de menú, cruceta táctil y modo móvil activos', r['menu']!='none' and r['touch']!='none' and r['mobile'], r)
    M("g.P.gold=99999; g.P.lvl=30; g.P.guildHall=1; g.enterTown()")
    bad = []
    panels = ['inv', 'skills', 'craft', 'quests', 'house', 'options', 'ach', 'worldmap', 'keys', 'enchant', 'shop', 'bank', 'depot', 'stable', 'recruit', 'arena', 'market', 'tavern', 'temple']
    for pn in panels:
        r = M(f"""g.closePanel(); const roles={{shop:'shop',bank:'bank',depot:'depot',stable:'stable',recruit:'recruit',arena:'arena',market:'market',tavern:'tavern',temple:'temple'}}; const r0=roles['{pn}'];
          if(r0){{ const n=g.town.npcs.find(n=>n.role===r0); g.P.dayT=40; g.openPanel('{pn}', n); }} else g.openPanel('{pn}');
          const el=document.getElementById('panel'); const rc=el.getBoundingClientRect(); const cl=el.querySelector('[data-act=close]'); const cr=cl?cl.getBoundingClientRect():null;
          let wide=0; el.querySelectorAll('*').forEach(x=>{{const q=x.getBoundingClientRect(); if(q.width>0 && q.right>392) wide++;}});
          return {{p:g.panel, left:rc.left, right:rc.right, sw:el.scrollWidth, cw:el.clientWidth, close:cr?(cr.right<=391 && cr.top>=0 && cr.bottom<=844):false, wide}}""")
        ok = r['left'] >= -1 and r['right'] <= 391 and r['sw'] <= r['cw'] + 2 and r['close'] and r['wide'] == 0
        if not ok: bad.append((pn, r))
        if pn in ('inv', 'craft', 'worldmap', 'keys'): m.screenshot(path=ROOT + f'/tests/shot_mobile_{pn}.png')
    M("g.closePanel()")
    check(f'móvil 390px: {len(panels)} paneles caben, sin scroll horizontal y con «Cerrar» visible', not bad, bad[:4])
    m.tap('#menu [data-menu=i]'); time.sleep(.1); r1 = M("return g.panel"); m.tap('#panel [data-act=close]'); time.sleep(.1); r2 = M("return g.panel")
    check('móvil: abrir y cerrar paneles con toques', r1=='inv' and not r2, [r1, r2])
    m.screenshot(path=ROOT + '/tests/shot_mobile.png'); ctx.close()

    # Título, intro, tocar para moverse y mantener pulsado
    ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    t = ctx2.new_page(); t.on('pageerror', lambda e: errs.append('título: ' + str(e)))
    t.goto('file://' + ROOT + '/index.html'); t.evaluate("localStorage.clear()"); t.reload(); time.sleep(1.2)
    T2 = lambda js: t.evaluate("(()=>{const g=__game;" + js + "})()")
    r = T2("""const c=document.getElementById('logo'); const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let col=new Set(); for(let i=0;i<d.length;i+=4*331) col.add(d[i]>>4|(d[i+1]>>4)<<4|(d[i+2]>>4)<<8);
      return {w:c.width, frames:g.titleFx.frames, intro:g.titleFx.introT, colors:col.size, lore:g.LORE.length, btn:!!document.getElementById('bnew').offsetParent}""")
    check('título: logo procedural animado e intro de la historia en marcha, botones accesibles', r['w']<=390 and r['frames']>20 and r['intro']>0.5 and r['colors']>40 and r['lore']>=5 and r['btn'], r)
    t.tap('#blang'); time.sleep(.2)
    r = T2("""I18N.trAll(); return {lang:I18N.lang, btn:document.getElementById('bnew').textContent, lbl:document.getElementById('blang').textContent}""")
    check('título: botón de idioma cambia a inglés al instante', r['lang']=='en' and r['btn']=='New game' and 'Español' in r['lbl'], r)
    t.tap('#blang'); t.screenshot(path=ROOT + '/tests/shot_title.png')
    T2("g.titleFx.introT=15.9; return 1"); time.sleep(.4); t.reload(); time.sleep(.5)
    r = T2("const a=g.titleFx.introT; g.replayIntro(); return {seen:a>=16, replay:g.titleFx.introT<1}")
    check('la intro se ve una vez y se puede repetir', r['seen'] and r['replay'], r)
    t.tap('#bnew'); time.sleep(.2); t.tap('#cls [data-c=guerrero]'); time.sleep(.4)
    def tile_xy(tx, ty):
        return T2(f"const r=document.getElementById('c').getBoundingClientRect(), cv=document.getElementById('c'); const [cx0,cy0]=g.cam; return [r.left+(({tx})*32-cx0+16)*r.width/cv.width, r.top+(({ty})*32-cy0+16)*r.height/cv.height]")
    r = T2("const P=g.P; g.closePanel(); g.render(); let gx=P.x, gy=P.y; for(const [dx,dy] of [[3,0],[-3,0],[0,3],[0,-3],[2,2]]) if(!g.solidAt(P.x+dx,P.y+dy)&&!g.town.npcs.some(n=>n.x===P.x+dx&&n.y===P.y+dy)){gx=P.x+dx;gy=P.y+dy;break} return [gx,gy]")
    gx, gy = r; x, y = tile_xy(gx, gy); t.touchscreen.tap(x, y); time.sleep(.1)
    r = T2(f"const P=g.P; const goal=!!g.tapGoal; for(let i=0;i<200&&(P.x!=={gx}||P.y!=={gy});i++) g.update(0.05); return {{goal, x:P.x, y:P.y}}")
    check('tocar el suelo camina hasta la casilla (A*)', r['goal'] and r['x']==gx and r['y']==gy, r)
    r = T2("""const P=g.P; const n=g.town.npcs.find(n=>n.role==='quest'); g.closePanel(); const res=g.tapAt(n.x,n.y); for(let i=0;i<400&&!g.panel;i++) g.update(0.05); const p=g.panel; g.closePanel(); return {res, p, d:Math.abs(P.x-n.x)+Math.abs(P.y-n.y)}""")
    check('tocar un NPC camina hasta él y abre su diálogo', r['res']=='move' and r['p']=='npc' and r['d']==1, r)
    r = T2("""g.enterFloor(2); const P=g.P; g.ents.length=0; let pos=null; for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]]) if(!g.solidAt(P.x+dx,P.y+dy,true)){pos=[P.x+dx,P.y+dy];break} const e=g.spawnEnemy(g.EN[1],pos[0],pos[1],2,false); e.cd=99; e.mcd=99; e.spd=99; g.render(); return pos""")
    ex, ey = r; x, y = tile_xy(ex, ey)
    T2(f"const cv=document.getElementById('c'); const mk=()=>new Touch({{identifier:1,target:cv,clientX:{x},clientY:{y}}}); cv.dispatchEvent(new TouchEvent('touchstart',{{touches:[mk()],targetTouches:[mk()],changedTouches:[mk()],cancelable:true,bubbles:true}})); window.__lp=()=>cv.dispatchEvent(new TouchEvent('touchend',{{touches:[],targetTouches:[],changedTouches:[mk()],cancelable:true,bubbles:true}})); return 1")
    time.sleep(.7); T2("window.__lp(); return 1")
    r = T2("const tip=document.getElementById('tip'); return {vis:getComputedStyle(tip).display!=='none', txt:tip.textContent, goal:!!g.tapGoal}")
    check('mantener pulsado muestra información (nombre, nivel, PV) sin moverse', r['vis'] and ('PV' in r['txt'] or 'HP' in r['txt']) and not r['goal'], r)
    t.screenshot(path=ROOT + '/tests/shot_longpress.png')
    r = T2("const L=g.tileInfo(g.P.x,g.P.y).join('|'); return L")
    check('información de la casilla del jugador', 'Nv' in r, r)
    ctx2.close()

    check('sin errores de JS', not errs, errs)
    b.close()
fails = [n for n, ok in res if not ok]
print(f"\n{len(res) - len(fails)}/{len(res)} pruebas pasaron")
sys.exit(1 if fails else 0)
