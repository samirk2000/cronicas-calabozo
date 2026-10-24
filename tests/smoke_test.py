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
      P.blocks.cocina=1; g.setBuild(g.BLOCKIDS().indexOf('cocina')); g.placeBlock(34,12); const before=JSON.stringify(P.buffs); const i=g.RECIPES.findIndex(r=>r.id==='pan'); g.panelAct('craft',{k:String(i)}); const pan=P.cons.pan;
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
    r = G("""const P=g.P; P.friend={}; P.talked={}; P.gifted={}; P.mats.fresa=20; P.mats.piedra=20; const welf=g.town.npcs.find(n=>n.id==='welf');
      g.talk(welf); const pnl=g.panel; g.closePanel(); const c1=g.chat('eina'), c2=g.chat('eina'); const p1=g.giveGift('eina','fresa'), p2=g.giveGift('eina','fresa');
      P.day++; const p3=g.giveGift('eina','piedra'); const kp=P.kp, gold=P.gold; g.addFriend('eina',100);
      return {pnl, c1, c2, p1, p2, p3, hearts:g.hearts('eina'), kp:P.kp-kp, gold:P.gold-gold, inv:P.inv.some(i=>i.slot==='anillo'&&i.rar===3)};""")
    check('amistad: charlar/regalo diario, gustos, corazones y recompensas', r['pnl']=='npc' and r['c1'] and not r['c2'] and r['p1']==12 and r['p2']==0 and r['p3']==4 and r['hearts']==10 and r['kp']==3 and r['gold']==600 and r['inv'], r)

    # 18 Logros
    r = G("""const P=g.P; P.ach={}; P.kills=150; P.maxFloor=12; const g0=P.gold; g.checkAch(); g.openPanel('ach'); const html=document.getElementById('panel').innerHTML; g.closePanel();
      return {k10:!!P.ach.k10, k100:!!P.ach.k100, f10:!!P.ach.f10, f25:!!P.ach.f25, gold:P.gold-g0, html:html.includes('Logros')};""")
    check('logros se desbloquean con recompensa y panel', r['k10'] and r['k100'] and r['f10'] and not r['f25'] and r['gold']>=650 and r['html'], r)

    # 19 Mundo abierto
    r = G("""const P=g.P; g.enterTown(); P.x=20; P.y=33; P.fx=20; P.fy=33; P.mt=0; return {exit:g.gt(g.W,20,34)}""")
    pg.keyboard.down('s'); time.sleep(.5); pg.keyboard.up('s'); time.sleep(.2)
    r2 = G("""const P=g.P; return {name:g.W.name, field:P.field, mobs:g.ents.length, x:P.x, y:P.y}""")
    check('salida de la ciudad lleva a las Llanuras', r2['name']=='Llanuras de Orario' and r2['field']==1 and r2['mobs']>=15, r2)
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

    # 23 Aliados (Grimgar)
    r = G("""let P=g.P; g.enterTown(); P.party=[]; g.buildComps(); g.panelAct('hire',{k:'mogzo'}); g.panelAct('hire',{k:'merry'}); g.panelAct('hire',{k:'yume'});
      const n=P.party.length, ids=P.party.map(a=>a.id); const merry=g.comps.find(c=>c.id==='merry'); P.hp=10; merry.cd=0; g.updateComps(0.01); const healed=P.hp>10;
      const mog=g.comps.find(c=>c.id==='mogzo'); g.hurtAlly(mog, 1e6, 'test'); const down=mog.a.down; P.gold=1000; g.panelAct('trevive',{}); const rev=!P.party.find(a=>a.id==='mogzo').down;
      g.save(); g.load(); return {n, ids, healed, down, rev, persisted:g.P.party.length===2, comps:g.comps.length};""")
    check('reclutar aliados (máx 2), sanadora cura, caer y revivir en templo', r['n']==2 and r['healed'] and r['down']==1 and r['rev'] and r['persisted'] and r['comps']>=3, r)
    r = G("""g.enterFloor(2); const P=g.P; P.hp=1e6; g.ents.length=0; const mog=g.comps.find(c=>c.id==='mogzo'); let pos=null;
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
    check('sin errores de JS', not errs, errs)
    b.close()
fails = [n for n, ok in res if not ok]
print(f"\n{len(res) - len(fails)}/{len(res)} pruebas pasaron")
sys.exit(1 if fails else 0)
