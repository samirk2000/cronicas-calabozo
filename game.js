'use strict';
// ===== Crónicas del Calabozo — RPG de casillas estilo Tibia =====
const TS = 32;
const cv = document.getElementById('c'); let cx = cv.getContext('2d');
const mm = document.getElementById('mm'); let mx = mm.getContext('2d');
const $ = id => document.getElementById(id);
function resize() { cv.width = innerWidth; cv.height = innerHeight; cx.imageSmoothingEnabled = false; }
addEventListener('resize', resize); resize();
const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

// ---------- Audio procedural ----------
let AC = null;
function snd(type) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const P = { hit: ['square', 220, 80, .08, .12], hurt: ['sawtooth', 160, 60, .1, .2], pick: ['sine', 700, 1200, .06, .1], lvl: ['triangle', 400, 1200, .12, .5], gather: ['triangle', 300, 200, .08, .1], fire: ['sawtooth', 600, 100, .07, .3], heal: ['sine', 500, 900, .08, .4], build: ['square', 150, 300, .06, .08], die: ['sawtooth', 300, 40, .1, .4], step: ['sine', 90, 70, .02, .04], ui: ['sine', 900, 900, .04, .05], boss: ['sawtooth', 80, 50, .15, 1] }[type];
    if (!P) return;
    o.type = P[0]; o.frequency.setValueAtTime(P[1], t); o.frequency.exponentialRampToValueAtTime(P[2], t + P[4]);
    g.gain.setValueAtTime(P[3], t); g.gain.exponentialRampToValueAtTime(.001, t + P[4]);
    o.start(t); o.stop(t + P[4]);
  } catch (e) { }
}

// ---------- Música procedural ----------
const MUS = {
  town: { bpm: 92, root: 60, scale: [0, 2, 4, 7, 9, 12], prog: [0, 5, 7, 3], lead: 'triangle', bass: 'sine', dens: .55, vol: 1 },
  dungeon: { bpm: 68, root: 52, scale: [0, 3, 5, 7, 10, 12], prog: [0, 0, 8, 7], lead: 'sine', bass: 'triangle', dens: .3, vol: .9 },
  boss: { bpm: 152, root: 45, scale: [0, 1, 3, 5, 7, 8, 12], prog: [0, 1, 0, 6], lead: 'square', bass: 'sawtooth', dens: .7, vol: .8, drums: 1 },
};
const music = { on: localStorage.getItem('cc_music') !== '0', track: null, step: 0, next: 0, gain: null };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function tone(f, t, d, wave, v) { const o = AC.createOscillator(), g = AC.createGain(); o.type = wave; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); g.connect(music.gain); o.start(t); o.stop(t + d + .05); }
function musicTrack() { if (!W || !P) return null; if (W.isArena && arena && arena.active) return 'boss'; if (ents.some(e => e.boss && e.aggro)) return 'boss'; return W.dark ? 'dungeon' : 'town'; }
function musicTick() {
  if (!AC || !music.on) return;
  if (!music.gain) { music.gain = AC.createGain(); music.gain.gain.value = .06; music.gain.connect(AC.destination); }
  const tr = musicTrack(); if (!tr) return;
  if (tr !== music.track) { music.track = tr; music.step = 0; music.next = AC.currentTime + .1; }
  const M = MUS[tr], spb = 60 / M.bpm / 2, ti = Object.keys(MUS).indexOf(tr);
  if (music.next < AC.currentTime) music.next = AC.currentTime + .05;
  while (music.next < AC.currentTime + .25) {
    const t = music.next, st8 = music.step % 16, bar = Math.floor(music.step / 16) % 4, ch = M.prog[bar];
    if (st8 % 4 === 0) tone(mtof(M.root - 12 + ch), t, spb * 3.5, M.bass, .5 * M.vol);
    if (hash(st8 + bar * 3 * (music.step % 64 < 32 ? 1 : 2), ti * 77) < M.dens) { const n = M.scale[Math.floor(hash(st8, bar + ti * 9) * M.scale.length)]; tone(mtof(M.root + 12 + ch + n), t, spb * 1.8, M.lead, .22 * M.vol); }
    if (tr === 'town' && st8 % 8 === 4) tone(mtof(M.root + ch + 4), t, spb * 4, 'sine', .12);
    if (tr === 'dungeon' && st8 === 0) tone(mtof(M.root - 24 + ch), t, spb * 16, 'sine', .35);
    if (M.drums) { if (st8 % 4 === 0) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); g.gain.setValueAtTime(.7, t); g.gain.exponentialRampToValueAtTime(.001, t + .15); o.connect(g); g.connect(music.gain); o.start(t); o.stop(t + .2); } if (st8 % 2 === 1) tone(6000 + Math.random() * 2000, t, .03, 'square', .05); }
    music.next += spb; music.step++;
  }
}
function toggleMusic() {
  music.on = !music.on; localStorage.setItem('cc_music', music.on ? '1' : '0');
  if (music.gain) { music.gain.disconnect(); music.gain = null; } music.track = null;
  log(music.on ? '🎵 Música activada.' : '🔇 Música desactivada.', '#aaa');
}

// ---------- Estaciones y clima ----------
const SEASONS = [{ n: 'Primavera', ico: '🌸', grass: '#3f8a3a', tuft: '#4f9f48', tree: '#2a7a30', w: ['despejado', 'despejado', 'lluvia'] },
  { n: 'Verano', ico: '☀', grass: '#4a9a35', tuft: '#5aaa40', tree: '#2f8a2a', w: ['despejado', 'despejado', 'despejado', 'tormenta'] },
  { n: 'Otoño', ico: '🍂', grass: '#7a8038', tuft: '#a07a30', tree: '#b0602a', w: ['despejado', 'lluvia', 'lluvia', 'despejado'] },
  { n: 'Invierno', ico: '❄', grass: '#c8d2da', tuft: '#e8eef2', tree: '#3a5a4a', w: ['despejado', 'nieve', 'nieve'] }];
const WEATHER_N = { despejado: '☀ Despejado', lluvia: '🌧 Lluvia', tormenta: '⛈ Tormenta', nieve: '🌨 Nieve' };
const DAYLEN = 240;
const hour = () => ((P.dayT / DAYLEN) * 24 + 6) % 24;
const clock = () => { const h = hour(); return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor(h % 1 * 60)).padStart(2, '0'); };
const HOURS = { tavern: [10, 26], market: [8, 22], shop: [8, 20], smith: [8, 19], bank: [9, 18], stable: [7, 20], recruit: [8, 22], quest: [8, 21], arena: [10, 23] };
const isOpen = role => { const h = HOURS[role]; if (!h) return true; const x = hour(); return h[1] > 24 ? (x >= h[0] || x < h[1] - 24) : (x >= h[0] && x < h[1]); };
function nightLevel() { const x = hour(); if (x >= 7 && x < 18) return 0; if (x >= 21 || x < 4) return 1; if (x >= 18) return (x - 18) / 3; return (7 - x) / 3; }
let weather = { type: 'despejado', t: 60, flash: 0 };
const season = () => SEASONS[Math.floor(((P ? P.day : 1) - 1) / 7) % 4];
function setWeather(type, t = rnd(60, 120)) { weather.type = type; weather.t = t; if (P) log('Clima: ' + WEATHER_N[type], '#9cf'); }
function updateSeason(dt) {
  P.dayT += dt; if (P.dayT >= DAYLEN) { P.dayT = 0; const s0 = season(); P.day++; log('Amanece el día ' + P.day + '.', '#fe8'); if (P.bank > 0) { const it = Math.min(500, Math.floor(P.bank * .01)); P.bank += it; if (it) log('🏦 Interés bancario: +' + it + ' oro.', '#9e9'); } if (season() !== s0) { log('¡Comienza ' + season().n + '! ' + season().ico, '#fe8'); setWeather(pick(season().w)); } }
  weather.t -= dt; if (weather.t <= 0) setWeather(pick(season().w));
  if (weather.type === 'nieve' && season().n !== 'Invierno') weather.type = 'despejado';
  if (weather.type === 'tormenta') { weather.flash = Math.max(0, weather.flash - dt); if (Math.random() < dt * .08) { weather.flash = .25; if (!W.dark) { shake = 4; snd('boss'); } } }
}
const wet = () => weather.type === 'lluvia' || weather.type === 'tormenta';
function drawWeather(vw, vh) {
  if (W.dark) return;
  if (wet()) { cx.strokeStyle = 'rgba(170,190,255,.45)'; cx.lineWidth = 1; cx.beginPath(); const n = weather.type === 'tormenta' ? 220 : 130; for (let i = 0; i < n; i++) { const x = (hash(i, 1) * vw + time * 80) % vw, y = (hash(i, 2) * vh + time * (600 + hash(i, 3) * 200)) % vh; cx.moveTo(x, y); cx.lineTo(x - 4, y + 12); } cx.stroke(); cx.fillStyle = 'rgba(40,50,80,.18)'; cx.fillRect(0, 0, vw, vh); }
  if (weather.type === 'nieve') { cx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 160; i++) { const x = (hash(i, 4) * vw + Math.sin(time + i) * 20 + time * 15) % vw, y = (hash(i, 5) * vh + time * (40 + hash(i, 6) * 40)) % vh; cx.fillRect(x, y, 2 + hash(i, 7) * 2, 2 + hash(i, 7) * 2); } }
  if (weather.flash > 0) { cx.fillStyle = `rgba(255,255,255,${weather.flash * 2.5})`; cx.fillRect(0, 0, vw, vh); }
}

// ---------- Tiles ----------
const T = { GRASS: 0, WALL: 1, WATER: 2, FLOOR: 3, PATH: 4, TREE: 5, ROCK: 6, ORE: 7, DOWN: 8, UP: 9, PLOT: 10, DWALL: 11, HERB: 12, STUMP: 13, CRYSTAL: 14, SAND: 15, EXIT: 16, CHEST: 17 };
const SOLID = new Set([T.WALL, T.WATER, T.TREE, T.ROCK, T.ORE, T.DWALL, T.CRYSTAL, 17]);
const RES = { [T.TREE]: { mat: 'madera', hp: 3, xp: 3 }, [T.ROCK]: { mat: 'piedra', hp: 4, xp: 3 }, [T.ORE]: { mat: 'hierro', hp: 5, xp: 6 }, [T.HERB]: { mat: 'hierba', hp: 1, xp: 2 }, [T.CRYSTAL]: { mat: 'cristal', hp: 6, xp: 12 } };

// ---------- Bloques construibles ----------
const BLOCKS = {
  muro_madera: { n: 'Muro de madera', solid: 1, col: '#8b5a2b' },
  muro_piedra: { n: 'Muro de piedra', solid: 1, col: '#888' },
  suelo_madera: { n: 'Suelo de madera', solid: 0, col: '#a0703a', floor: 1 },
  alfombra: { n: 'Alfombra', solid: 0, col: '#a22', floor: 1, comfort: 2 },
  puerta: { n: 'Puerta', solid: 0, col: '#6b3d1b' },
  mesa: { n: 'Mesa', solid: 1, col: '#9a6a3a', comfort: 2 },
  silla: { n: 'Silla', solid: 0, col: '#9a6a3a', comfort: 1 },
  cama: { n: 'Cama', solid: 1, col: '#c44', comfort: 4 },
  cofre: { n: 'Cofre', solid: 1, col: '#b8860b', comfort: 1 },
  antorcha: { n: 'Antorcha', solid: 1, col: '#fa0', comfort: 1, light: 1 },
  maceta: { n: 'Maceta con flores', solid: 1, col: '#e6c', comfort: 2 },
  estanteria: { n: 'Estantería', solid: 1, col: '#7a4a20', comfort: 3 },
  estatua: { n: 'Estatua de héroe', solid: 1, col: '#ccd', comfort: 6 },
  yunque: { n: 'Yunque', solid: 1, col: '#555', comfort: 1 },
  chimenea: { n: 'Chimenea', solid: 1, col: '#844', comfort: 6, light: 1 },
  sofa: { n: 'Sofá', solid: 1, col: '#5a3a8a', comfort: 4 },
  armario: { n: 'Armario', solid: 1, col: '#6a4020', comfort: 3 },
  cuadro: { n: 'Cuadro', solid: 1, col: '#c93', comfort: 3 },
  lampara: { n: 'Lámpara de cristal', solid: 1, col: '#8ef', comfort: 4, light: 1 },
  barril: { n: 'Barril', solid: 1, col: '#7a5028', comfort: 1 },
  banera: { n: 'Bañera', solid: 1, col: '#dde', comfort: 5 },
  piano: { n: 'Piano', solid: 1, col: '#222', comfort: 7 },
  fuente: { n: 'Fuente', solid: 1, col: '#69c', comfort: 9 },
  armero: { n: 'Armero', solid: 1, col: '#666', comfort: 3 },
  trofeo: { n: 'Trofeo de jefe', solid: 1, col: '#fc4', comfort: 10 },
  valla: { n: 'Valla', solid: 1, col: '#a77a4a' },
  forja: { n: 'Forja', solid: 1, col: '#733', comfort: 2, light: 1, station: 1 },
  cocina: { n: 'Cocina', solid: 1, col: '#999', comfort: 3, station: 1 },
  alquimia: { n: 'Mesa de alquimia', solid: 1, col: '#5a3a6a', comfort: 3, station: 1 },
  cultivo: { n: 'Tierra de cultivo', solid: 0, col: '#5a3a20', floor: 1 },
};

// ---------- Recetas ----------
const RECIPES = [
  { id: 'muro_madera', in: { madera: 2 }, n: 4 }, { id: 'suelo_madera', in: { madera: 1 }, n: 4 }, { id: 'muro_piedra', in: { piedra: 2 }, n: 4 },
  { id: 'puerta', in: { madera: 3 } }, { id: 'mesa', in: { madera: 4 } }, { id: 'silla', in: { madera: 2 } }, { id: 'cama', in: { madera: 6, hierba: 2 } },
  { id: 'cofre', in: { madera: 4, hierro: 1 } }, { id: 'antorcha', in: { madera: 1, piedra: 1 }, n: 2 }, { id: 'maceta', in: { piedra: 1, hierba: 2 } },
  { id: 'alfombra', in: { hierba: 3, madera: 1 }, n: 2 }, { id: 'estanteria', in: { madera: 6 } }, { id: 'yunque', in: { hierro: 5, piedra: 2 } },
  { id: 'estatua', in: { piedra: 15, cristal: 2 } },
  { id: 'chimenea', in: { piedra: 12, hierro: 2 } }, { id: 'sofa', in: { madera: 6, hierba: 4 } }, { id: 'armario', in: { madera: 8 } },
  { id: 'cuadro', in: { madera: 2, hierba: 3 } }, { id: 'lampara', in: { cristal: 2, hierro: 2 } }, { id: 'barril', in: { madera: 3 } },
  { id: 'banera', in: { piedra: 8, hierro: 3 } }, { id: 'piano', in: { madera: 15, hierro: 5 } }, { id: 'fuente', in: { piedra: 20, cristal: 3 } },
  { id: 'armero', in: { madera: 4, hierro: 4 } }, { id: 'trofeo', in: { cristal: 8, hierro: 5 } }, { id: 'valla', in: { madera: 1 }, n: 3 },
  { id: 'cultivo', in: { madera: 1, hierba: 1 }, n: 2 },
  { id: 'runa_blanca', in: { piedra: 2, cristal: 1 }, n: 2, name: 'Runa en blanco' },
  { id: 'cana', in: { madera: 3, hierba: 2 }, name: 'Caña de pescar' },
  { id: 'forja', in: { piedra: 10, hierro: 3 } }, { id: 'cocina', in: { piedra: 6, madera: 4 } }, { id: 'alquimia', in: { madera: 4, hierba: 3, piedra: 2 } },
  { id: 'pescado_asado', in: { pescado: 2 } }, { id: 'sushi', in: { pez_dorado: 1, trigo: 1 } },
  { id: 'pan', in: { trigo: 3 } }, { id: 'estofado', in: { zanahoria: 2, hierba: 1 } }, { id: 'tarta', in: { fresa: 3, trigo: 1 } }, { id: 'banquete', in: { trigo: 2, zanahoria: 2, fresa: 2 } },
  { id: 'pocion_vida', in: { hierba: 2 }, n: 2 }, { id: 'pocion_mana', in: { hierba: 2, cristal: 1 }, n: 3 },
  { id: 'gear:arma:2', in: { hierro: 6, madera: 2 }, name: 'Espada forjada (rara)' },
  { id: 'gear:armadura:2', in: { hierro: 10 }, name: 'Cota forjada (rara)' },
  { id: 'gear:casco:2', in: { hierro: 5 }, name: 'Yelmo forjado (raro)' },
  { id: 'gear:anillo:3', in: { cristal: 6, hierro: 4 }, name: 'Anillo arcano (épico)' },
  { id: 'gear:arma:4', in: { cristal: 15, hierro: 20 }, name: 'Arma legendaria' },
];
function recipeStations(r) {
  if (r.id.startsWith('gear:')) return +r.id.split(':')[2] >= 3 ? ['yunque', 'forja'] : ['yunque'];
  if (CONSUM[r.id] && CONSUM[r.id].food) return ['cocina'];
  if (r.id.startsWith('pocion') || r.id === 'runa_blanca') return ['alquimia'];
  return [];
}
const STN_N = { yunque: 'Yunque', forja: 'Forja', cocina: 'Cocina', alquimia: 'Mesa de alquimia' };
function hasStation(id) { for (const k in town.obj) if (town.obj[k] === id) { const [x, y] = k.split(',').map(Number); if (inPlot(x, y)) return true; } return false; }
const CONSUM = { pocion_vida: { n: 'Poción de vida', ico: '❤' }, pocion_mana: { n: 'Poción de maná', ico: '💧' },
  pan: { n: 'Pan casero', ico: '🍞', buff: 'fuerza', dur: 180, food: 1 }, estofado: { n: 'Estofado de zanahoria', ico: '🍲', buff: 'defensa', dur: 180, food: 1 },
  pescado_asado: { n: 'Pescado asado', ico: '🍢', buff: 'vigor', dur: 200, food: 1 }, sushi: { n: 'Sushi dorado', ico: '🍣', buff: 'sabiduria', dur: 400, food: 1 },
  tarta: { n: 'Tarta de fresa', ico: '🍰', buff: 'sabiduria', dur: 240, food: 1 }, banquete: { n: 'Banquete del héroe', ico: '🍱', buff: 'vigor', dur: 300, food: 1 } };
const MATS = { madera: '🪵', piedra: '🪨', hierro: '⛓', hierba: '🌿', cristal: '💎', trigo: '🌾', zanahoria: '🥕', fresa: '🍓', semilla_trigo: '·🌾', semilla_zanahoria: '·🥕', semilla_fresa: '·🍓', pescado: '🐟', pez_dorado: '🐠' };
const CROPS = { trigo: { n: 'Trigo', t: 20, col: '#eec850', price: 10 }, zanahoria: { n: 'Zanahoria', t: 30, col: '#f80', price: 15 }, fresa: { n: 'Fresa', t: 45, col: '#e23', price: 25 } };
const BUFFN = { prisa: '💨 Prisa (utani hur)', escudo: '🔵 Escudo mágico (utamo vita)', luz: '💡 Luz (utevo lux)', fuerza: '💪 Fuerza +25%', defensa: '🛡 Defensa +30%', sabiduria: '📖 XP +40%', vigor: '❤ Regeneración x3' };

// ---------- Objetos / rareza ----------
const RAR = ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario'];
const SLOTS = { arma: '⚔', armadura: '🛡', casco: '⛑', anillo: '💍' };
const PREF = { arma: ['Espada', 'Hacha', 'Maza', 'Estoque', 'Katana', 'Arco', 'Báculo'], armadura: ['Cota', 'Peto', 'Túnica', 'Coraza'], casco: ['Yelmo', 'Capucha', 'Casco'], anillo: ['Anillo', 'Sortija', 'Sello'] };
const SUF = ['del Lobo', 'de Orario', 'de Aincrad', 'de Grimgar', 'del Alba', 'de la Bestia', 'del Héroe', 'del Abismo', 'Rúnico', 'Ancestral'];
let uid = 1;
function genItem(slot, lvl, rar, pref) {
  if (rar == null) { const r = Math.random() * 100 - (P ? P.sk.fortuna * 4 : 0); rar = r < 1.5 ? 4 : r < 7 ? 3 : r < 20 ? 2 : r < 45 ? 1 : 0; }
  slot = slot || pick(Object.keys(SLOTS));
  const m = 1 + rar * 0.35, it = { uid: uid++, slot, rar, lvl, name: (pref || pick(PREF[slot])) + ' ' + pick(SUF), st: {} };
  if (slot === 'arma') { const w = it.name.split(' ')[0]; it.st.atk = Math.round((4 + lvl * 2.2) * m * (w === 'Arco' ? .85 : w === 'Báculo' ? .6 : 1)); if (w === 'Báculo') it.st.int = Math.round((2 + lvl * .6) * m); }
  if (slot === 'armadura') it.st.def = Math.round((2 + lvl * 1.4) * m);
  if (slot === 'casco') it.st.def = Math.round((1 + lvl * .8) * m);
  if (slot === 'anillo') it.st.int = Math.round((1 + lvl * .4) * m);
  const extras = ['fue', 'vit', 'agi', 'int', 'crit'];
  for (let i = 0; i < rar; i++) { const k = pick(extras); it.st[k] = (it.st[k] || 0) + Math.max(1, Math.round(lvl * .3 * m)); }
  it.value = Math.round((5 + lvl * 4) * (1 + rar * rar));
  return it;
}
const STN = { atk: 'Ataque', def: 'Defensa', fue: 'Fuerza', vit: 'Vitalidad', agi: 'Agilidad', int: 'Inteligencia', crit: 'Crítico %' };

// ---------- Habilidades ----------
const SKILLS = {
  golpe: { n: 'Golpe Poderoso', d: 'Activa (1): golpe de 250% +40%/rango. 6 MP', max: 5, row: 0, col: 0, act: 1, mp: 6, cd: 4 },
  maestria: { n: 'Maestría de Armas', d: '+8% daño físico por rango', max: 5, row: 1, col: 0, req: 'golpe' },
  torbellino: { n: 'Torbellino', d: 'Activa (2): golpea a todos alrededor. 12 MP', max: 5, row: 2, col: 0, act: 1, mp: 12, cd: 6, req: 'maestria' },
  fuego: { n: 'Bola de Fuego', d: 'Activa (3): proyectil mágico (INT). 8 MP', max: 5, row: 0, col: 1, act: 1, mp: 8, cd: 2 },
  arcano: { n: 'Mente Arcana', d: '+15 MP máx y +regen de maná por rango', max: 5, row: 1, col: 1, req: 'fuego' },
  curar: { n: 'Curación', d: 'Activa (4): cura según INT. 15 MP', max: 5, row: 2, col: 1, act: 1, mp: 15, cd: 8, req: 'arcano' },
  piel: { n: 'Piel de Hierro', d: '+3 defensa y +15 PV por rango', max: 5, row: 0, col: 2 },
  recolector: { n: 'Recolector', d: '+1 material extra (prob.) por rango', max: 5, row: 1, col: 2, req: 'piel' },
  fortuna: { n: 'Fortuna', d: 'Mejor rareza y +oro por rango', max: 5, row: 2, col: 2, req: 'recolector' },
};
const ACTIVE = ['golpe', 'torbellino', 'fuego', 'curar'];

// ---------- Enemigos ----------
const EN = [
  { n: 'Rata gigante', col: '#8a7', sh: 'rat', hp: 14, atk: 3, spd: .5 },
  { n: 'Slime', col: '#4c4', sh: 'slime', hp: 20, atk: 4, spd: .75 },
  { n: 'Kobold', col: '#c84', sh: 'hum', hp: 26, atk: 6, spd: .45 },
  { n: 'Goblin', col: '#6a3', sh: 'hum', hp: 30, atk: 7, spd: .4 },
  { n: 'Lobo sombrío', col: '#556', sh: 'rat', hp: 34, atk: 9, spd: .3 },
  { n: 'Esqueleto', col: '#ddd', sh: 'hum', hp: 40, atk: 10, spd: .5 },
  { n: 'Hombre lagarto', col: '#3a8', sh: 'hum', hp: 55, atk: 12, spd: .42 },
  { n: 'Gólem de piedra', col: '#998', sh: 'golem', hp: 90, atk: 15, spd: .8 },
  { n: 'Espectro', col: '#a8f', sh: 'ghost', hp: 60, atk: 16, spd: .35 },
  { n: 'Kobold arquero', col: '#b96', sh: 'hum', hp: 22, atk: 7, spd: .5, ranged: 'arrow' },
  { n: 'Mago oscuro', col: '#64a', sh: 'mage', hp: 30, atk: 11, spd: .55, ranged: 'magic' },
  { n: 'Dragón menor', col: '#d42', sh: 'golem', hp: 120, atk: 20, spd: .5 },
];
const THEMES = [
  { n: 'Cavernas', g: ['#3a3540', '#36313c'], w: '#1a1620', wt: '#4a4050', wl: '#3a3040', fog: [0, 0, 0], torch: [255, 170, 80] },
  { n: 'Bosque Subterráneo', g: ['#2f4030', '#2b3a2c'], w: '#0f1a10', wt: '#2f4a2a', wl: '#203a20', fog: [0, 8, 0], torch: [140, 255, 150] },
  { n: 'Glaciar Eterno', g: ['#5a6878', '#56647a'], w: '#1a2230', wt: '#7a90b0', wl: '#5a7090', fog: [0, 4, 15], torch: [150, 210, 255] },
  { n: 'Abismo Ígneo', g: ['#4a2a22', '#42261e'], w: '#200a08', wt: '#6a2a1a', wl: '#4a1a10', fog: [15, 0, 0], torch: [255, 100, 40] },
];
const theme = f => THEMES[Math.floor((f - 1) / 10) % THEMES.length];
const BOSSES = ['Minotauro', 'Rey Goblin', 'Gleam Eyes', 'Señor Esqueleto', 'Udaeus', 'Juggernaut', 'Hidra del Abismo'];

// ---------- Misiones ----------
const QUESTS = [
  { n: 'Primeros pasos', d: 'Recolecta 5 de madera talando árboles (E).', t: 'gather', k: 'madera', c: 5, xp: 40, g: 20, rw: 'kit' },
  { n: 'Al calabozo', d: 'Derrota 5 monstruos en el calabozo.', t: 'kill', c: 5, xp: 90, g: 60, rw: 'arma' },
  { n: 'Un techo propio', d: 'Coloca 6 bloques en tu parcela (B).', t: 'build', c: 6, xp: 90, g: 80, rw: 'cama' },
  { n: 'Más profundo', d: 'Llega al piso 3 del calabozo.', t: 'floor', c: 3, xp: 180, g: 120, rw: 'armadura' },
  { n: 'Minero novato', d: 'Consigue 5 de hierro.', t: 'gather', k: 'hierro', c: 5, xp: 100, g: 60 },
  { n: 'Guardián del piso 5', d: 'Derrota al jefe del piso 5.', t: 'boss', c: 1, xp: 300, g: 250 },
  { n: 'Hogar acogedor', d: 'Alcanza 15 de confort en tu casa.', t: 'comfort', c: 15, xp: 200, g: 150 },
  { n: 'Cazador', d: 'Derrota 60 monstruos.', t: 'kill', c: 60, xp: 400, g: 300 },
  { n: 'Cristales del abismo', d: 'Consigue 5 cristales.', t: 'gather', k: 'cristal', c: 5, xp: 400, g: 300 },
  { n: 'Conquistador', d: 'Llega al piso 15.', t: 'floor', c: 15, xp: 1200, g: 1000 },
  { n: 'Leyenda de la Torre', d: 'Llega al piso 25.', t: 'floor', c: 25, xp: 4000, g: 3000 },
];

// ---------- Estado ----------
let P = null, W = null, town = null, ents = [], parts = [], texts = [], projs = [], drops = [];
let warns = [];
let shake = 0, camX = 0, camY = 0, panel = null, buildMode = false, buildSel = 0, msgs = [], time = 0, paused = true;
let PLOT = { x: 26, y: 6, w: 10, h: 8 };
const HOUSE = [null, { x: 26, y: 6, w: 10, h: 8, n: 'Parcela' }, { x: 26, y: 5, w: 12, h: 10, n: 'Casa de campo', cost: { oro: 500, madera: 30, piedra: 20 }, mult: 1.25 }, { x: 24, y: 4, w: 14, h: 11, n: 'Mansión del héroe', cost: { oro: 2000, piedra: 40, hierro: 20, cristal: 10 }, mult: 1.6 }];
function setPlot(l) { const h = HOUSE[l] || HOUSE[1]; PLOT = { x: h.x, y: h.y, w: h.w, h: h.h }; }
function paintPlot(m) { for (let y = PLOT.y; y < PLOT.y + PLOT.h; y++) for (let x = PLOT.x; x < PLOT.x + PLOT.w; x++) st(m, x, y, T.PLOT); }

function newPlayer() {
  return {
    x: 20, y: 15, fx: 20, fy: 15, mt: 0, dir: [0, 1], lvl: 1, xp: 0, gold: 100, hp: 100, mp: 30,
    base: { fue: 5, vit: 5, agi: 5, int: 5 }, sp: 0, kp: 0, sk: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
    inv: [], mats: Object.fromEntries(Object.keys(MATS).map(k => [k, 0])), cons: { pocion_vida: 5, pocion_mana: 2, pan: 2, estofado: 0, tarta: 0, banquete: 0 }, buffs: {}, cls: 'guerrero', gifts: 0, blocks: {},
    eq: { arma: null, armadura: null, casco: null, anillo: null }, cds: {}, atkCd: 0, maxFloor: 1, floor: 0,
    q: 0, qp: 0, house: 1, binds: ['exura', 'exori', 'utani hur', 'exevo gran mas vis'], runes: { blank: 0, gfb: 0, sd: 0, uh: 0 }, story: { node: 'inicio', p: 0, ready: 0, choices: [], path: null }, perks: {}, storyUnlock: {}, guildHall: 0, allyRest: true, market: [], marketGold: 0, mktStock: [], mktDay: 0, tourneyWeek: -1, tokens: 0, arenaBest: 0, petLv: {}, allyQ: {}, pets: [], pet: null, mounts: [], mount: null, riding: false, party: [], bank: 0, depot: [], blessed: 0, title: '', trail: [], day: 1, dayT: 20, cana: 0, crafted: 0, harvests: 0, fishCaught: 0, ach: {}, friend: {}, talked: {}, gifted: {}, field: 0, rares: 0, bosses: 0, kills: 0, deaths: 0, flash: 0,
  };
}
function stat(k) { let v = P.base[k] || 0; for (const s in P.eq) if (P.eq[s]) v += Math.round((P.eq[s].st[k] || 0) * (1 + (P.eq[s].plus || 0) * .08)); return v; }
function maxHp() { return 80 + stat('vit') * 12 + P.lvl * 8 + P.sk.piel * 15; }
function maxMp() { return 20 + stat('int') * 6 + P.sk.arcano * 15; }
function atk() { return Math.round((5 + stat('fue') * 2 + stat('atk') + P.lvl) * (1 + P.sk.maestria * .08 + ((P.perks && P.perks.dmg) || 0) + (P.riding && P.mount ? MOUNTS[P.mount].atk || 0 : 0)) * (P.buffs.fuerza > 0 ? 1.25 : 1)); }
function def() { return Math.round((stat('def') + Math.floor(stat('vit') / 2) + P.sk.piel * 3) * (P.buffs.defensa > 0 ? 1.3 : 1)); }
function crit() { return 5 + stat('agi') * .6 + stat('crit') + (P.cls === 'arquero' ? 8 : 0); }
function moveTime() { return Math.max(.07, (.22 - stat('agi') * .003) * (P.riding && P.mount ? MOUNTS[P.mount].spd : 1) * (P.buffs && P.buffs.prisa > 0 ? .7 : 1)); }
function atkTime() { return Math.max(.35, 1 - stat('agi') * .015); }
function xpNeed(l) { return Math.round(35 * Math.pow(l, 1.5)); }

function log(t, c = '#ddd') { const l = msgs[msgs.length - 1]; if (l && l.t === t) { l.a = 8; return; } msgs.push({ t, c, a: 8 }); if (msgs.length > 7) msgs.shift(); }

// ---------- Mapas ----------
function makeMap(w, h, fill) { return { w, h, t: new Uint8Array(w * h).fill(fill), hp: {}, regrow: [], obj: {}, dark: false }; }
const gt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? T.DWALL : m.t[y * m.w + x];
const st = (m, x, y, v) => { if (x >= 0 && y >= 0 && x < m.w && y < m.h) { m.t[y * m.w + x] = v; m._ver = (m._ver || 0) + 1; if (m._cc) m._cc[((y >> 4) * 1000) + (x >> 4)] = null; } };

function genTown() {
  const m = makeMap(48, 36, T.GRASS); m.name = 'Ciudad de Orario';
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2) { st(m, x, y, T.TREE); continue; }
    const r = hash(x, y);
    if (x > 38 || y > 27) st(m, x, y, r < .35 ? T.TREE : r < .45 ? T.ROCK : r < .5 ? T.ORE : r < .56 ? T.HERB : T.GRASS);
    else if (x < 8) st(m, x, y, r < .3 ? T.TREE : r < .4 ? T.HERB : T.GRASS);
  }
  for (let x = 8; x < 39; x++) st(m, x, 15, T.PATH);
  for (let y = 4; y < 34; y++) st(m, 20, y, T.PATH); st(m, 20, 34, T.EXIT); st(m, 19, 33, T.GRASS); st(m, 21, 33, T.GRASS);
  for (let y = 18; y < 25; y++) for (let x = 9; x < 16; x++) st(m, x, y, (x - 12.5) ** 2 + (y - 21.5) ** 2 < 9 ? T.WATER : T.SAND);
  // plaza y torre
  for (let y = 4; y < 9; y++) for (let x = 16; x < 25; x++) st(m, x, y, T.PATH);
  for (let y = 2; y < 5; y++) for (let x = 18; x < 23; x++) st(m, x, y, T.WALL);
  st(m, 20, 5, T.DOWN);
  setPlot(P ? P.house || 1 : 1); paintPlot(m);
  for (let y = 14; y < 15; y++) st(m, 30, y, T.PATH);
  m.npcs = [
    { x: 22, y: 7, n: 'Eina (Gremio)', col: '#4ae', role: 'quest', id: 'eina' },
    { x: 17, y: 16, n: 'Bors (Mercader)', col: '#da4', role: 'shop', id: 'bors' },
    { x: 23, y: 16, n: 'Welf (Herrero)', col: '#e54', role: 'smith', id: 'welf' },
    { x: 18, y: 7, n: 'Hestia (Diosa)', col: '#fff', role: 'god', id: 'hestia' },
    { x: 10, y: 5, n: 'Banco de Orario', col: '#2a6', role: 'bank' },
    { x: 14, y: 5, n: 'Depósito', col: '#865', role: 'depot' },
    { x: 11, y: 11, n: 'Templo (Sacerdotisa)', col: '#eee', role: 'temple' },
    { x: 27, y: 20, n: 'Ryu (Establo)', col: '#3a8', role: 'stable' },
    { x: 16, y: 5, n: 'Bárbara (Reclutas)', col: '#c4c', role: 'recruit' },
    { x: 34, y: 17, n: 'Coliseo (Arena)', col: '#c33', role: 'arena' },
    { x: 23, y: 20, n: 'Mia (Taberna)', col: '#c85', role: 'tavern' },
    { x: 12, y: 13, n: 'Casa de Subastas', col: '#a8f', role: 'market' },
  ];
  const bld = (x0, y0, w, h, col) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) st(m, x, y, T.WALL); m.roofs.push([x0, y0, w, h, col]); };
  m.roofs = [];
  for (let y = 3; y < 15; y++) for (let x = 8; x < 16; x++) if (gt(m, x, y) !== T.PATH) st(m, x, y, T.GRASS);
  bld(9, 3, 3, 2, '#2a6'); bld(13, 3, 3, 2, '#865'); bld(9, 9, 5, 2, '#ddd'); bld(26, 18, 4, 2, '#a63'); bld(32, 18, 5, 3, '#a33'); st(m, 34, 16, T.PATH);
  bld(21, 18, 5, 2, '#952'); bld(22, 23, 3, 2, '#68a'); bld(26, 23, 3, 2, '#8a6'); bld(10, 14, 0, 0, '#000');
  for (let x = 21; x < 30; x++) st(m, x, 21, T.PATH); for (let y = 21; y < 26; y++) { st(m, 25, y, T.PATH); }
  m.roofs = m.roofs.filter(r => r[2] > 0);
  // horarios de NPCs: trabajo → taberna → casa
  const homes = [[23, 25], [27, 25], [11, 8], [14, 8]], seats = [[21, 20], [22, 20], [24, 20], [25, 20], [21, 22], [22, 22], [24, 22]];
  let hi = 0, si = 0;
  for (const n of m.npcs) { n.wx = n.x; n.wy = n.y; if (['quest', 'shop', 'smith', 'god', 'bank', 'stable', 'recruit'].includes(n.role)) { n.sched = 1; n.home = homes[hi++ % homes.length]; n.seat = seats[si++ % seats.length]; } }
  for (let x = 9; x < 17; x++) st(m, x, 6, T.PATH); for (let y = 6; y < 15; y++) st(m, 15, y, T.PATH); for (let x = 11; x < 15; x++) st(m, x, 12, T.PATH);
  for (let y = 16; y < 21; y++) st(m, 28, y, T.PATH);
  m.light = 1; return m;
}

function genFloor(f) {
  const w = 44 + Math.min(f, 20), h = 34 + Math.min(f, 14), m = makeMap(w, h, T.DWALL);
  m.theme = theme(f); m.name = m.theme.n + ' — Piso ' + f; m.dark = true; m.floor = f; m.npcs = [];
  const rooms = [];
  for (let i = 0; i < 200 && rooms.length < 9 + Math.floor(f / 3); i++) {
    const rw = ri(5, 10), rh = ri(4, 8), x = ri(1, w - rw - 2), y = ri(1, h - rh - 2);
    if (rooms.some(r => x < r.x + r.w + 1 && x + rw + 1 > r.x && y < r.y + r.h + 1 && y + rh + 1 > r.y)) continue;
    rooms.push({ x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) });
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) st(m, x, y, T.FLOOR);
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i]; let x = a.cx, y = a.cy;
    while (x !== b.cx) { st(m, x, y, T.FLOOR); x += Math.sign(b.cx - x); }
    while (y !== b.cy) { st(m, x, y, T.FLOOR); y += Math.sign(b.cy - y); }
  }
  m.torches = new Set();
  for (const r of rooms) for (let k = 0; k < 2; k++) { const x = ri(r.x, r.x + r.w - 1), y = r.y - 1; if (gt(m, x, y) === T.DWALL && gt(m, x, y + 1) === T.FLOOR) m.torches.add(x + ',' + y); }
  const s = rooms[0], e = rooms[rooms.length - 1];
  st(m, s.cx, s.cy, T.UP); m.start = [s.cx, s.cy + 1 < s.y + s.h ? s.cy + 1 : s.cy - 1];
  m.downAt = [e.cx, e.cy]; m.boss = f % 5 === 0;
  if (!m.boss) st(m, e.cx, e.cy, T.DOWN);
  // recursos
  for (const r of rooms.slice(1)) for (let k = 0; k < 2; k++) {
    const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
    if (gt(m, x, y) === T.FLOOR && Math.abs(x - r.cx) + Math.abs(y - r.cy) > 1) st(m, x, y, Math.random() < .12 + f * .01 ? T.CRYSTAL : Math.random() < .5 ? T.ORE : T.ROCK);
  }
  ents = [];
  const p0 = Math.min(EN.length - 5, Math.max(0, Math.floor(f / 2) - 2)), pool = EN.slice(p0, p0 + 5);
  const n = 8 + f * 2;
  for (let i = 0; i < n; i++) {
    const r = pick(rooms.slice(1)), x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
    if (gt(m, x, y) !== T.FLOOR || ents.some(e => e.x === x && e.y === y)) continue;
    spawnEnemy(pick(pool), x, y, f, false);
  }
  if (!m.boss && (f % 3 === 2 || Math.random() < .25) && rooms.length > 2) {
    const r = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))]; let mxp = r.cx, myp = r.cy; if (gt(m, mxp, myp) !== T.FLOOR) { mxp = r.x; myp = r.y; } st(m, mxp, myp, T.FLOOR);
    m.npcs.push({ x: mxp, y: myp, n: 'Mercader errante', col: '#a84', role: 'dmerch' });
    ents = ents.filter(e => Math.abs(e.x - mxp) + Math.abs(e.y - myp) > 4);
    m.mstock = [genItem(null, f + 2, ri(2, 3)), genItem(null, f + 2, ri(2, 4)), genItem(null, f + 3, ri(3, 4))];
    m.mstock.forEach(it => it.price = it.value * 3);
  }
  if (m.boss) spawnEnemy({ n: BOSSES[(f / 5 - 1) % BOSSES.length] + (f > 35 ? ' +' + Math.floor(f / 35) : ''), col: '#b22', sh: 'boss', hp: 400, atk: 14, spd: .55 }, e.cx, e.cy, f, true);
  m.rooms = rooms; m.traps = new Set(); m.seenTraps = new Set(); m.events = []; m.arrowTraps = []; m.saws = [];
  for (const r of rooms.slice(1)) {
    if (Math.random() < .3 + f * .01 && gt(m, r.cx, r.y - 1) === T.DWALL) m.arrowTraps.push({ x: r.cx, y: r.y - 1, dx: 0, dy: 1, cd: rnd(0, 2), rate: Math.max(1.2, 2.6 - f * .03) });
    else if (f >= 2 && Math.random() < .25 + f * .01 && r.w >= 5) { const y = ri(r.y + 1, r.y + r.h - 2); m.saws.push({ x0: r.x, x1: r.x + r.w - 1, y, fx: r.x, dir: 1, spd: 1.6 + f * .03, hcd: 0 }); }
  }
  // trampas
  for (let i = 0; i < 3 + Math.floor(f / 2); i++) { const r = pick(rooms.slice(1)), x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1); if (gt(m, x, y) === T.FLOOR && !(m.npcs || []).some(n => n.x === x && n.y === y)) m.traps.add(x + ',' + y); }
  if (!m.boss && rooms.length > 3) {
    const cand = rooms.slice(1, -1).filter(r => !(m.npcs || []).some(n => n.x >= r.x && n.x < r.x + r.w && n.y >= r.y && n.y < r.y + r.h));
    if (cand.length && Math.random() < .45) { const r = pick(cand); m.treasure = r; for (let k = 0; k < 1 + (Math.random() < .4 ? 1 : 0); k++) { const x = r.cx + k * 2 - (k ? 1 : 0), y = r.cy; if (gt(m, x, y) === T.FLOOR) { st(m, x, y, T.CHEST); m.chests = m.chests || {}; m.chests[x + ',' + y] = { mimic: Math.random() < .2 }; } } m.events.push('tesoro'); }
    const c2 = cand.filter(r => r !== m.treasure); if (f >= 4 && c2.length && Math.random() < .35) { m.house = { r: pick(c2), state: 0 }; m.events.push('casa'); ents = ents.filter(e => !(e.x >= m.house.r.x && e.x < m.house.r.x + m.house.r.w && e.y >= m.house.r.y && e.y < m.house.r.y + m.house.r.h)); }
  }
  return m;
}
function spawnEnemy(b, x, y, f, boss) {
  const sc = 1 + (f - 1) * .28;
  ents.push({ ...b, x, y, fx: x, fy: y, mt: 0, mhp: Math.round(b.hp * sc * (boss ? 1 + f * .1 : 1)), hp: 0, atk: Math.round(b.atk * sc), def: Math.floor(f * .8), lvl: f, boss, cd: rnd(0, 1), mcd: rnd(0, 1), flash: 0, aggro: false, xp: Math.round((b.hp / 3 + f * 4) * 1.35 * (boss ? 8 : 1)) });
  const e = ents[ents.length - 1];
  if (!boss && Math.random() < .04) { e.rare = 1; e.n = '★ ' + e.n + ' dorado'; e.mhp *= 3; e.atk = Math.round(e.atk * 1.5); e.xp *= 5; e.col = '#ec4'; }
  e.hp = e.mhp; e.pt = 3; return e;
}

function los(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, x = x0, y = y0;
  while (x !== x1 || y !== y1) { const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } if ((x !== x1 || y !== y1) && SOLID.has(gt(W, x, y))) return false; }
  return true;
}
// A* hacia el jugador; devuelve el primer paso [dx,dy] o null
function astar(e, tx, ty, limit = 600) {
  const key = (x, y) => y * W.w + x, start = key(e.x, e.y), goal = key(tx, ty);
  const open = [{ x: e.x, y: e.y, g: 0, f: Math.abs(tx - e.x) + Math.abs(ty - e.y) }], came = new Map([[start, null]]), gs = new Map([[start, 0]]);
  const occ = new Set(ents.filter(o => o !== e).map(o => key(o.x, o.y)));
  let n = 0;
  while (open.length && n++ < limit) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const c = open.splice(bi, 1)[0], ck = key(c.x, c.y);
    if (Math.max(Math.abs(c.x - tx), Math.abs(c.y - ty)) <= 1 && ck !== start) {
      let k = ck, prev = came.get(k); while (prev !== start && prev != null) { k = prev; prev = came.get(k); }
      return [k % W.w - e.x, Math.floor(k / W.w) - e.y];
    }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + ox, ny = c.y + oy, nk = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h || nk === goal) continue;
      if (solidAt(nx, ny, true) || gt(W, nx, ny) === T.UP) continue;
      const g = c.g + 1 + (occ.has(nk) ? 4 : 0);
      if (gs.has(nk) && gs.get(nk) <= g) continue;
      gs.set(nk, g); came.set(nk, ck); open.push({ x: nx, y: ny, g, f: g + Math.abs(tx - nx) + Math.abs(ty - ny) });
    }
  }
  return null;
}
function enemyShoot(e, kind) {
  const ax = e.x * TS + 16, ay = e.y * TS + 16, bx = P.x * TS + 16, by = P.y * TS + 16, d = Math.hypot(bx - ax, by - ay) || 1, sp = kind === 'magic' ? 200 : 300;
  projs.push({ x: ax, y: ay, vx: (bx - ax) / d * sp, vy: (by - ay) / d * sp, dmg: e.atk, life: 2.5, hostile: 1, kind, src: e.n });
  snd(kind === 'magic' ? 'fire' : 'step');
}
function bossAI(e, dt) {
  if (!e.enraged && e.hp < e.mhp * .5) { e.enraged = 1; shake = 15; snd('boss'); log('¡' + e.n + ' entra en furia!', '#f44'); }
  e.pt -= dt; if (e.pt > 0) return;
  e.pt = e.enraged ? 3 : 4.5;
  const pat = pick(e.enraged ? ['slam', 'burst', 'summon', 'line', 'rain'] : ['slam', 'burst', 'line', 'rain']); e.lastPat = pat;
  if (pat === 'slam') { for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x || y) warns.push({ x: e.x + x, y: e.y + y, t: 1, dmg: e.atk * 1.6, src: e.n }); log(e.n + ' prepara un golpe sísmico…', '#f84'); }
  if (pat === 'burst') { for (let i = 0; i < (e.enraged ? 12 : 8); i++) { const a = i / (e.enraged ? 12 : 8) * 6.283; projs.push({ x: e.fx * TS + 16, y: e.fy * TS + 16, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, dmg: e.atk * .8, life: 2.5, hostile: 1, kind: 'magic', src: e.n }); } snd('fire'); }
  if (pat === 'line') { const sx = Math.sign(P.x - e.x), sy = Math.sign(P.y - e.y); for (let i = 1; i <= 7; i++) { warns.push({ x: e.x + sx * i, y: e.y + sy * i, t: .8 + i * .06, dmg: e.atk * 1.4, src: e.n }); } }
  if (pat === 'rain') { for (let i = 0; i < 10; i++) warns.push({ x: P.x + ri(-3, 3), y: P.y + ri(-3, 3), t: rnd(.8, 1.4), dmg: e.atk, src: e.n }); warns.push({ x: P.x, y: P.y, t: 1, dmg: e.atk, src: e.n }); }
  if (pat === 'summon') { let c = 0; for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0]]) if (c < 2 && !solidAt(e.x + ox, e.y + oy)) { const m = spawnEnemy(pick(EN.slice(0, 6)), e.x + ox, e.y + oy, W.floor || 1, false); m.aggro = true; m.summoned = 1; c++; } log(e.n + ' invoca refuerzos.', '#f84'); }
}
function solidAt(x, y, ignoreEnt) {
  const t = gt(W, x, y); if (SOLID.has(t)) return true;
  const o = W.obj[x + ',' + y]; if (o && BLOCKS[o].solid) return true;
  if (W.npcs && W.npcs.some(n => n.x === x && n.y === y && !n.hidden)) return true;
  if (W === town && visitors.some(v => v.x === x && v.y === y)) return true;
  if (!ignoreEnt && ents.some(e => e.x === x && e.y === y)) return true;
  if (P && P.x === x && P.y === y && !ignoreEnt) return true;
  if (!ignoreEnt && comps.some(c => c.x === x && c.y === y && !(c.kind === 'ally' && c.a.down))) return true;
  return false;
}

// ---------- Llanuras (mundo abierto) ----------
let field = null;
function genField() {
  const w = 70, h = 52, m = makeMap(w, h, T.GRASS); m.name = 'Llanuras de Orario'; m.npcs = []; m.isField = 1; m.regrow = [];
  const n = (x, y, s) => (hash(Math.floor(x / s), Math.floor(y / s) + 999) * .6 + hash(x, y + 77) * .4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) { st(m, x, y, T.TREE); continue; }
    const v = n(x, y, 6), r = hash(x + 500, y);
    if (v > .62) st(m, x, y, r < .55 ? T.TREE : r < .62 ? T.HERB : T.GRASS);
    else if (x > 48 && v < .3) st(m, x, y, r < .3 ? T.ROCK : r < .42 ? T.ORE : r < .45 ? T.CRYSTAL : T.GRASS);
    else if (r < .03) st(m, x, y, T.HERB); else if (r < .045) st(m, x, y, T.ROCK); else if (r < .07) st(m, x, y, T.TREE);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = ((x - 16) / 8) ** 2 + ((y - 30) / 6) ** 2; if (d < 1) st(m, x, y, T.WATER); else if (d < 1.45) st(m, x, y, T.SAND); }
  let x = 35; for (let y = 1; y < 44; y++) { st(m, x, y, T.PATH); st(m, x + 1, y, T.PATH); if (y % 7 === 0 && y < 40) x += hash(y, 3) < .5 ? -1 : 1; }
  st(m, 35, 1, T.EXIT); m.entry = [35, 2];
  for (let y = 44; y < 48; y++) for (let xx = x - 3; xx <= x + 4; xx++) st(m, xx, y, T.WALL);
  st(m, x, 44, T.DOWN); m.tower = [x, 44];
  return m;
}
const FIELD_MAX = 24;
function spawnFieldMob(far = 10) {
  for (let i = 0; i < 40; i++) {
    const x = ri(3, field.w - 4), y = ri(8, field.h - 4);
    if (gt(field, x, y) !== T.GRASS || solidAt(x, y) || Math.abs(x - P.x) + Math.abs(y - P.y) < far) continue;
    const lvl = 1 + Math.floor(y / 13) + (x > 48 ? 1 : 0), pool = EN.slice(0, 3 + lvl), e = spawnEnemy(pick(pool), x, y, lvl, false); e.aggroR = 4; e.field = 1; return e;
  }
  return null;
}
function enterField(at) {
  if (!field) field = genField();
  W = field; ents = []; drops = []; projs = []; warns = []; P.floor = 0; P.field = 1; fishing = null;
  [P.x, P.y] = at || field.entry; P.fx = P.x; P.fy = P.y; buildComps();
  for (let i = 0; i < FIELD_MAX; i++) spawnFieldMob(6);
  field.spawnT = 8; log('Sales a las ' + field.name + '. Monstruos salvajes rondan por aquí.', '#9e9'); save();
}
function updateField(dt) {
  for (const m of [town, field]) if (m && m !== town && m.regrow.length) m.regrow = m.regrow.filter(r => { if (time < r.at) return true; if (W === m && P.x === r.x && P.y === r.y) { r.at = time + 10; return true; } st(m, r.x, r.y, r.t); return false; });
  if (W !== field) return;
  field.spawnT -= dt; if (field.spawnT <= 0) { field.spawnT = 8; if (ents.length < FIELD_MAX) spawnFieldMob(); }
}
// ---------- Horarios de NPCs ----------
function npcGoal(n) {
  const x = hour();
  if (x >= 22 || x < 7) return 'home';
  if (isOpen(n.role) && x >= 7) return 'work';
  return 'tavern';
}
function updateNPCs(dt) {
  if (!town) return;
  for (const n of town.npcs) {
    if (!n.sched) continue;
    const g = npcGoal(n), tgt = g === 'work' ? [n.wx, n.wy] : g === 'home' ? n.home : n.seat;
    n.state = g;
    if (W !== town) { n.x = tgt[0]; n.y = tgt[1]; n.hidden = g === 'home'; continue; }
    n.mcd = (n.mcd || 0) - dt; if (n.mcd > 0) continue; n.mcd = .45;
    if (n.x === tgt[0] && n.y === tgt[1]) { n.hidden = g === 'home'; continue; }
    n.hidden = false;
    const step = astar({ x: n.x, y: n.y }, tgt[0], tgt[1], 900);
    if (Math.abs(n.x - tgt[0]) + Math.abs(n.y - tgt[1]) === 1) { if (!(P.x === tgt[0] && P.y === tgt[1])) { n.x = tgt[0]; n.y = tgt[1]; } continue; }
    if (step) { const nx = n.x + step[0], ny = n.y + step[1]; if (!(P.x === nx && P.y === ny) && !town.npcs.some(o => o !== n && o.x === nx && o.y === ny)) { n.x = nx; n.y = ny; } }
    else { n.x = tgt[0]; n.y = tgt[1]; }
  }
}
function settleNPCs() { if (!town) return; for (const n of town.npcs) if (n.sched) { const g = npcGoal(n), t = g === 'work' ? [n.wx, n.wy] : g === 'home' ? n.home : n.seat; n.x = t[0]; n.y = t[1]; n.hidden = g === 'home'; n.state = g; } }

// ---------- Casa de subastas ----------
function marketChance(it, price) { const r = price / it.value; return Math.max(.01, Math.min(.6, .35 * (2.6 - r) / 1.6)); }
function marketTick() {
  let sold = 0;
  P.market = (P.market || []).filter(l => { if (Math.random() < marketChance(l.item, l.price)) { P.marketGold = (P.marketGold || 0) + l.price; sold++; log('💰 ' + pick(['Un aventurero de Loki', 'Un mercader de Rakia', 'La Familia Soma', 'Un enano herrero', 'Un noble elfo']) + ' compró tu ' + l.item.name + ' por ' + l.price + ' oro.', '#fd4'); return false; } return true; });
  if (sold) snd('pick'); return sold;
}
let mktT = 0;
function updateMarket(dt) { mktT += dt; if (mktT >= DAYLEN / 24) { mktT = 0; marketTick(); } if (P.mktDay !== P.day) { P.mktDay = P.day; P.mktStock = [0, 1, 2, 3].map(() => { const it = genItem(null, Math.max(P.lvl, P.maxFloor), ri(1, 3)); it.price = Math.round(it.value * rnd(1.8, 2.8)); return it; }); } }
function listItem(uid, price) {
  const it = P.inv.find(i => i.uid === uid); if (!it) return false; price = Math.max(1, Math.round(price || it.value * 2)); const fee = Math.ceil(price * .05);
  if (P.gold < fee || (P.market || []).length >= 8) return false;
  P.gold -= fee; P.inv = P.inv.filter(i => i !== it); P.market = P.market || []; P.market.push({ item: it, price, day: P.day }); log('📜 Pusiste en subasta ' + it.name + ' por ' + price + ' oro (comisión ' + fee + ').', '#a8f'); return true;
}

// ---------- Arena ----------
let arena = null;
function genArena() {
  const m = makeMap(17, 15, T.WALL); m.name = 'Coliseo de Orario'; m.npcs = []; m.isArena = 1; m.regrow = [];
  for (let y = 1; y < 14; y++) for (let x = 1; x < 16; x++) st(m, x, y, T.SAND);
  for (const [x, y] of [[4, 4], [12, 4], [4, 10], [12, 10]]) st(m, x, y, T.ROCK);
  st(m, 8, 14, T.EXIT); m.torches = new Set(['3,0', '8,0', '13,0']); return m;
}
const week = () => Math.floor((P.day - 1) / 7), tourneyDay = () => P.day % 7 === 0;
function rivals() { const w = week(); return ['Bete Loga', 'Aiz Wallenstein', 'Ottar', 'Lefiya', 'Kirito', 'Ranta'].map((n, i) => ({ n, s: 4 + Math.floor(hash(w, i * 13) * 8) })).sort((a, b) => b.s - a.s).slice(0, 4); }
function startArena(tourney) {
  if (!isOpen('arena')) return false;
  if (tourney && (!tourneyDay() || P.tourneyWeek === week())) return false;
  arena = { wave: 0, active: false, wait: 3, gold: 0, tokens: 0, champs: 0, tourney: !!tourney }; if (tourney) { P.tourneyWeek = week(); log('🏆 ¡TORNEO SEMANAL! Supera tantas oleadas como puedas (máx. 12).', '#fd4'); }
  W = genArena(); ents = []; drops = []; projs = []; warns = []; P.floor = 0; P.field = 0; fishing = null; closePanel();
  P.x = 8; P.y = 12; P.fx = 8; P.fy = 12; P.mt = 0; buildComps(); log('⚔ ¡Bienvenido al Coliseo! Sobrevive a las oleadas. Sal por la puerta sur para cobrar.', '#fc6'); snd('boss'); return true;
}
function nextWave() {
  arena.wave++; arena.active = true; const w = arena.wave, lvl = Math.max(1, Math.round(P.lvl * .5 + w * .8)), n = Math.min(14, 2 + w);
  for (let i = 0; i < n; i++) for (let k = 0; k < 30; k++) { const x = ri(1, 15), y = ri(1, 13); if (gt(W, x, y) !== T.SAND || solidAt(x, y) || Math.abs(x - P.x) + Math.abs(y - P.y) < 5) continue; const e = spawnEnemy(pick(EN.slice(0, Math.min(EN.length, 3 + Math.floor(w / 2)))), x, y, lvl, false); e.aggro = true; e.aggroR = 30; break; }
  if (w % 5 === 0) { for (let k = 0; k < 30; k++) { const x = ri(2, 14), y = ri(1, 4); if (solidAt(x, y)) continue; const e = spawnEnemy(pick(EN.slice(5)), x, y, lvl + 2, false); e.mhp = e.hp = e.mhp * 6; e.n = 'Campeón ' + e.n; e.champion = 1; e.col = '#f44'; e.aggro = true; e.aggroR = 30; break; } }
  log('🔔 ¡Oleada ' + w + '!' + (w % 5 === 0 ? ' Aparece un CAMPEÓN.' : ''), '#f84'); snd('boss'); shake = 6;
}
function waveReward() {
  const w = arena.wave, g = Math.round(15 * w + 5 * Math.pow(w, 1.3)), t = 1 + Math.floor(w / 5) * 2;
  P.gold += g; P.tokens = (P.tokens || 0) + t; arena.gold += g; arena.tokens += t; P.arenaBest = Math.max(P.arenaBest || 0, w);
  log('✅ Oleada ' + w + ' superada: +' + g + ' oro, +' + t + ' fichas de arena.', '#9f9');
  if (w % 5 === 0) { const it = genItem(null, Math.max(P.lvl, w), w >= 15 ? 4 : 3); if (P.inv.length < 32) { P.inv.push(it); log('🏆 Premio de campeón: ' + it.name + ' [' + RAR[it.rar] + ']', '#fd4'); } }
  gainXp(10 * w);
}
function updateArena(dt) {
  if (!arena || !W.isArena) return;
  if (arena.active) { if (!ents.length) { arena.active = false; waveReward(); arena.wait = 4; if (arena.tourney && arena.wave >= 12) { finishTourney(); endArena(); } } return; }
  arena.wait -= dt; if (arena.wait <= 0) nextWave();
}
function finishTourney() {
  if (!arena || !arena.tourney || arena.done) return null; arena.done = 1;
  const score = arena.active ? arena.wave - 1 : arena.wave, table = [...rivals(), { n: 'Tú', s: score, me: 1 }].sort((a, b) => b.s - a.s || (a.me ? -1 : 1)), pos = table.findIndex(r => r.me) + 1;
  const prize = [100, 50, 25][pos - 1] || 5; P.tokens = (P.tokens || 0) + prize; P.tourneyBest = Math.min(P.tourneyBest || 99, pos);
  if (pos === 1) { P.tourneyWins = (P.tourneyWins || 0) + 1; log('🥇 ¡CAMPEÓN DEL TORNEO SEMANAL! +' + prize + ' fichas.', '#fd4'); snd('lvl'); } else log('🏅 Torneo: quedaste en el puesto ' + pos + ' con ' + score + ' oleadas. +' + prize + ' fichas.', '#fc6');
  P.lastTourney = { week: week(), pos, score, table: table.map(r => r.n + ': ' + r.s) }; return pos;
}
function endArena() { if (arena && arena.tourney) finishTourney(); const a = arena; arena = null; if (a) log('🏟 Sales del Coliseo. Récord: oleada ' + (P.arenaBest || 0) + '. Ganaste ' + a.gold + ' oro y ' + a.tokens + ' fichas.', '#fc6'); enterTown([34, 16]); }
function checkExit() {
  if (W.isArena && gt(W, P.x, P.y) === T.EXIT) { endArena(); P.mt = 0; return; }
  if (gt(W, P.x, P.y) !== T.EXIT) return;
  if (W === town) enterField(); else if (W === field) enterTown([20, 32]);
  P.mt = 0;
}
function enterTown(at) {
  arena = null;
  P.field = 0; fishing = null; 
  W = town; ents = []; drops = []; projs = []; warns = []; P.floor = 0;
  [P.x, P.y] = at || [20, 6]; P.fx = P.x; P.fy = P.y; buildComps(); log('Has vuelto a ' + W.name + '.', '#9cf'); save();
}
function enterFloor(f) {
  P.floor = f; P.field = 0; fishing = null; W = genFloor(f); drops = []; projs = []; warns = [];
  [P.x, P.y] = W.start; P.fx = P.x; P.fy = P.y; buildComps();
  if (f > P.maxFloor) P.maxFloor = f; allyQuestEvent('floor', null, f); storyEvent('floor', f);
  questEvent('floor', null, f);
  log('Entras al piso ' + f + (W.boss ? ' — ¡Se siente una presencia terrible!' : '.'), W.boss ? '#f66' : '#fc6');
  if (W.boss) { snd('boss'); shake = 12; }
  if (W.events && W.events.includes('tesoro')) log('✨ Sientes un brillo dorado… hay una sala del tesoro en este piso.', '#fd4');
  if (W.events && W.events.includes('casa')) log('⚠ Escuchas gruñidos… cuidado con la casa de monstruos.', '#f84');
  save();
}

// ---------- Input ----------
const keys = {};
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase(); if (paused && k !== 'escape') { return; }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab', 'f1', 'f2', 'f3', 'f4', 'enter'].includes(k)) e.preventDefault();
  keys[k] = true; onKey(k);
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
function onKey(k) {
  if (k === 'escape') { if (fishing) { fishing = null; return; } if (panel) closePanel(); else if (buildMode) { buildMode = false; } return; }
  if (k === 'tab') return togglePanel('worldmap');
  if (k === 'i') return togglePanel('inv'); if (k === 'k') return togglePanel('skills'); if (k === 'c') return togglePanel('craft'); if (k === 'j') return togglePanel('quests'); if (k === 'h') return togglePanel('house'); if (k === 'o') return togglePanel('options'); if (k === 'l') return togglePanel('ach'); if (k === 'n') return toggleMount();
  if (k === 'enter') { openChat(); return; }
  if (k === 'r') { useRune('gfb'); return; } if (k === 't') { useRune('sd'); return; } if (k === 'y') { useRune('uh'); return; }
  if (k === 'p') { petAbility(); return; }
  if (/^f[1-4]$/.test(k)) { castSpell(P.binds[+k[1] - 1]); return; } if (k === 'm') return toggleMusic();
  if (panel) return;
  if (fishing) { if (k === 'e' || k === 'escape') { fishing = null; log('Recoges la caña.', '#aaa'); } return; }
  if (k === 'b') { if (W !== town) return log('Solo puedes construir en la ciudad.', '#f88'); buildMode = !buildMode; log(buildMode ? 'Modo construcción: Espacio coloca, X quita, Q/R cambia bloque.' : 'Modo construcción desactivado.', '#fc6'); return; }
  if (buildMode) {
    const ids = Object.keys(BLOCKS);
    if (k === 'q') buildSel = (buildSel + ids.length - 1) % ids.length;
    if (k === 'r') buildSel = (buildSel + 1) % ids.length;
    if (k === ' ') placeBlock(P.x + P.dir[0], P.y + P.dir[1]);
    if (k === 'x') removeBlock(P.x + P.dir[0], P.y + P.dir[1]);
    return;
  }
  if (k === ' ') playerAttack(true);
  if (k === 'e') interact();
  if (k >= '1' && k <= '4') useSkill(ACTIVE[+k - 1]);
  if (k === '5') usePot('pocion_vida'); if (k === '6') usePot('pocion_mana');
  if (k === '7' || k === '8' || k === '9' || k === '0') usePot(['pan', 'estofado', 'tarta', 'banquete'][k === '0' ? 3 : +k - 7]);
}
cv.addEventListener('mousedown', e => {
  if (paused || panel) return;
  const tx = Math.floor((e.clientX + camX) / TS), ty = Math.floor((e.clientY + camY) / TS);
  if (buildMode) { if (Math.abs(tx - P.x) + Math.abs(ty - P.y) <= 4) { if (e.button === 2) removeBlock(tx, ty); else placeBlock(tx, ty); } return; }
  const en = ents.find(n => n.x === tx && n.y === ty); if (en) { P.target = en; log('Objetivo: ' + en.n, '#fa8'); }
});
cv.addEventListener('contextmenu', e => e.preventDefault());
// táctil
const isTouch = 'ontouchstart' in window;
if (isTouch) { $('touch').style.display = 'block'; $('tact').style.display = 'block'; }
let touchDir = null;
document.querySelectorAll('#touch button').forEach(b => {
  b.addEventListener('touchstart', e => { e.preventDefault(); touchDir = b.dataset.d.split(',').map(Number); });
  b.addEventListener('touchend', e => { e.preventDefault(); touchDir = null; });
});
document.querySelectorAll('#tact button').forEach(b => b.addEventListener('touchstart', e => { e.preventDefault(); onKey(b.dataset.k); }));

// gamepad
let padDir = null, padPrev = [];
const PADMAP = { 0: ' ', 1: 'e', 2: '3', 3: '1', 4: '5', 5: '6', 6: '2', 7: '4', 8: 'k', 9: 'i', 10: 'b', 11: 'm' };
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; const gp = pads && [...pads].find(p => p);
  padDir = null; if (!gp) return;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, B = i => gp.buttons[i] && gp.buttons[i].pressed;
  if (B(12) || ay < -.5) padDir = [0, -1]; else if (B(13) || ay > .5) padDir = [0, 1]; else if (B(14) || ax < -.5) padDir = [-1, 0]; else if (B(15) || ax > .5) padDir = [1, 0];
  gp.buttons.forEach((b, i) => { if (b.pressed && !padPrev[i] && PADMAP[i] !== undefined && !paused) { if (i === 1 && panel) closePanel(); else onKey(PADMAP[i]); } padPrev[i] = b.pressed; });
}
addEventListener('gamepadconnected', e => log('🎮 Mando conectado: ' + e.gamepad.id.slice(0, 30), '#9cf'));

// ---------- Acciones ----------
function facing() { return [P.x + P.dir[0], P.y + P.dir[1]]; }
function interact() {
  const [fx, fy] = facing(), t = gt(W, fx, fy), here = gt(W, P.x, P.y);
  const vis = W === town && visitors.find(v => v.x === fx && v.y === fy); if (vis) return talkVisitor(vis);
  const npc = W.npcs && W.npcs.find(n => n.x === fx && n.y === fy && !n.hidden);
  if (npc) return talk(npc);
  const o = W.obj[fx + ',' + fy];
  if (o === 'cultivo' && W === town) return farm(fx, fy);
  if (o === 'cama' && (hour() >= 20 || hour() < 6)) { if (hour() >= 20) { P.day++; } P.dayT = 0; P.hp = maxHp(); P.mp = maxMp(); log('Duermes toda la noche… Amanece el día ' + P.day + ' (06:00).', '#fe8'); snd('heal'); save(); return 'slept'; }
  if (o === 'cama') { P.hp = maxHp(); P.mp = maxMp(); save(); log('Duermes en tu cama. PV/MP restaurados y partida guardada.', '#9f9'); snd('heal'); return; }
  if (o === 'cofre') return openPanel('chest');
  if (here === T.DOWN || t === T.DOWN) { if (!W.floor) return openPanel('floors'); return enterFloor(P.floor + 1); }
  if (here === T.UP || t === T.UP) { if (P.floor <= 1) return enterTown(); return enterFloor(P.floor - 1); }
  if (t === T.CHEST) return openChest(fx, fy);
  if (RES[t]) return gather(fx, fy, t);
  if (t === T.WATER) return startFishing(fx, fy);
  log('No hay nada aquí.', '#888');
}
function gather(x, y, t) {
  if (P.gcd > 0) return; P.gcd = .35;
  const r = RES[t], key = x + ',' + y; W.hp[key] = (W.hp[key] ?? r.hp) - 1;
  snd('gather'); burst(x * TS + 16, y * TS + 16, t === T.TREE ? '#6a4' : t === T.HERB ? '#5e5' : t === T.CRYSTAL ? '#8ef' : '#aaa', 6);
  if (W.hp[key] <= 0) {
    delete W.hp[key];
    const n = 1 + (Math.random() < P.sk.recolector * .2 ? 1 : 0) + (t === T.TREE || t === T.ROCK ? ri(0, 1) : 0);
    if (t === T.HERB && Math.random() < .35) { const sd = pick(['semilla_trigo', 'semilla_trigo', 'semilla_zanahoria', 'semilla_fresa']); P.mats[sd]++; log('Encontraste ' + sd.replace('_', ' de ') + '.', '#9e9'); }
    P.mats[r.mat] += n; addText(x * TS + 16, y * TS, '+' + n + ' ' + r.mat, '#fe8'); gainXp(r.xp + P.floor);
    questEvent('gather', r.mat, n);
    st(W, x, y, !W.dark ? (t === T.TREE ? T.STUMP : T.GRASS) : T.FLOOR);
    if (!W.dark) W.regrow.push({ x, y, t, at: time + 60 });
  }
}
const FRIENDS = {
  eina: { n: 'Eina', likes: ['tarta', 'fresa', 'pez_dorado', 'sushi'], rew: [[2, '100 oro', () => P.gold += 100], [4, '+1 punto de habilidad', () => P.kp++], [6, '500 oro', () => P.gold += 500], [8, '+2 puntos de habilidad', () => P.kp += 2], [10, 'Anillo épico del Gremio', () => P.inv.push(genItem('anillo', Math.max(P.lvl, P.maxFloor), 3))]] },
  bors: { n: 'Bors', likes: ['pescado', 'hierro', 'cristal', 'pescado_asado'], rew: [[3, '5 pociones de vida', () => P.cons.pocion_vida += 5], [6, '1000 oro', () => P.gold += 1000], [10, '10 pociones de maná', () => P.cons.pocion_mana += 10]] },
  welf: { n: 'Welf', likes: ['hierro', 'cristal', 'pan', 'estofado'], rew: [[3, 'Arma rara forjada', () => P.inv.push(genItem('arma', Math.max(P.lvl, P.maxFloor), 2))], [6, 'Armadura épica', () => P.inv.push(genItem('armadura', Math.max(P.lvl, P.maxFloor), 3))], [10, 'Arma legendaria «Crozzo»', () => { const it = genItem('arma', Math.max(P.lvl, P.maxFloor) + 5, 4); it.name = 'Espada Mágica Crozzo'; P.inv.push(it); }]] },
  hestia: { n: 'Hestia', likes: ['pan', 'banquete', 'fresa', 'tarta'], rew: [[2, '+3 puntos de estado', () => P.sp += 3], [5, '3 banquetes', () => P.cons.banquete += 3], [8, '+5 puntos de estado', () => P.sp += 5], [10, 'Bendición: +3 puntos de habilidad', () => P.kp += 3]] },
};
const hearts = id => Math.min(10, Math.floor((P.friend[id] || 0) / 10));
const ACH = [
  { id: 'torneo', n: 'Campeón del Coliseo', d: 'Gana un torneo semanal', c: () => (P.tourneyWins || 0) >= 1, g: 500 },
  { id: 'ench', n: 'Forjador legendario', d: 'Mejora un objeto a +7', c: () => [...P.inv, ...Object.values(P.eq)].some(i => i && (i.plus || 0) >= 7), g: 500 },
  { id: 'house', n: 'Exterminador de nidos', d: 'Limpia una casa de monstruos', c: () => (P.houses || 0) >= 1, g: 200 },
  { id: 'story', n: 'Fin de la historia', d: 'Completa la historia principal', c: () => P.story && P.story.node === 'fin', g: 1000 },
  { id: 'k10', n: 'Primera sangre', d: 'Derrota 10 monstruos', c: () => P.kills >= 10, g: 50 },
  { id: 'k100', n: 'Cazador', d: 'Derrota 100 monstruos', c: () => P.kills >= 100, g: 300 },
  { id: 'k500', n: 'Exterminador', d: 'Derrota 500 monstruos', c: () => P.kills >= 500, g: 1500 },
  { id: 'f5', n: 'Bajo tierra', d: 'Llega al piso 5', c: () => P.maxFloor >= 5, g: 100 },
  { id: 'f10', n: 'Explorador', d: 'Llega al piso 10', c: () => P.maxFloor >= 10, g: 300 },
  { id: 'f25', n: 'Conquistador de la Torre', d: 'Llega al piso 25', c: () => P.maxFloor >= 25, g: 1500 },
  { id: 'boss', n: 'Matagigantes', d: 'Derrota a un jefe', c: () => P.bosses >= 1, g: 200 },
  { id: 'rare', n: 'Brillo dorado', d: 'Derrota a un monstruo raro', c: () => P.rares >= 1, g: 200 },
  { id: 'l10', n: 'Nivel 2 de Falna', d: 'Alcanza el nivel 10', c: () => P.lvl >= 10, g: 200 },
  { id: 'l25', n: 'Aventurero de élite', d: 'Alcanza el nivel 25', c: () => P.lvl >= 25, g: 1000 },
  { id: 'craft', n: 'Artesano', d: 'Fabrica 20 objetos', c: () => P.crafted >= 20, g: 150 },
  { id: 'farm', n: 'Granjero', d: 'Cosecha 10 cultivos', c: () => P.harvests >= 10, g: 150 },
  { id: 'fish', n: 'Pescador', d: 'Pesca 10 peces', c: () => P.fishCaught >= 10, g: 150 },
  { id: 'golden', n: 'Leyenda del lago', d: 'Pesca un pez dorado', c: () => P.mats.pez_dorado > 0 || P.ach.golden, g: 300 },
  { id: 'cozy', n: 'Hogar dulce hogar', d: 'Alcanza 30 de confort', c: () => comfort() >= 30, g: 200 },
  { id: 'mansion', n: 'Terrateniente', d: 'Mejora tu casa a Mansión', c: () => P.house >= 3, g: 500 },
  { id: 'friend', n: 'Mejores amigos', d: '10 corazones con un NPC', c: () => Object.keys(FRIENDS).some(k => hearts(k) >= 10), g: 500 },
  { id: 'rich', n: 'Millonario de Orario', d: 'Ten 5000 de oro', c: () => P.gold >= 5000, g: 0 },
  { id: 'year', n: 'Un año en Orario', d: 'Vive las 4 estaciones (día 22)', c: () => P.day >= 22, g: 500 },
];
function checkAch() { for (const a of ACH) if (!P.ach[a.id] && a.c()) { P.ach[a.id] = 1; P.gold += a.g; log('🏆 ¡Logro desbloqueado: ' + a.n + '! (+' + a.g + ' oro)', '#fd4'); snd('lvl'); addText(P.fx * TS + 16, P.fy * TS - 20, '🏆 ' + a.n, '#fd4', 16); } }
function addFriend(id, pts) {
  const h0 = hearts(id); P.friend[id] = Math.min(100, (P.friend[id] || 0) + pts); const h1 = hearts(id);
  for (const [h, d, f] of FRIENDS[id].rew) if (h > h0 && h <= h1) { f(); log('💖 ' + FRIENDS[id].n + ' (' + h + ' corazones) te recompensa: ' + d + '.', '#f9c'); snd('lvl'); }
  if (h1 > h0) addText(P.fx * TS + 16, P.fy * TS - 12, '💖 ' + h1, '#f9c', 18);
}
function chat(id) { if (P.talked[id] === P.day) { log(FRIENDS[id].n + ': «¡Ya hablamos hoy! Vuelve mañana.»', '#aaa'); return false; } P.talked[id] = P.day; addFriend(id, 3); log(FRIENDS[id].n + ': «' + pick(['¡Qué gusto verte!', '¿Cómo te fue en el calabozo?', 'Cuídate mucho, ¿sí?', 'Hoy hace un día ' + (wet() ? 'lluvioso' : 'precioso') + '.']) + '»', '#f9c'); return true; }
function giveGift(id, item) {
  if (P.gifted[id] === P.day) { log(FRIENDS[id].n + ' ya recibió un regalo hoy.', '#aaa'); return 0; }
  const isMat = P.mats[item] > 0, isFood = P.cons[item] > 0; if (!isMat && !isFood) return 0;
  if (isMat) P.mats[item]--; else P.cons[item]--;
  P.gifted[id] = P.day; const liked = FRIENDS[id].likes.includes(item), pts = liked ? 12 : 4; addFriend(id, pts);
  log(FRIENDS[id].n + (liked ? ': «¡Me encanta! ¡Gracias!» 💖' : ': «Gracias, muy amable.»'), '#f9c'); snd('pick'); return pts;
}
function toggleMount() {
  if (!P.mount) { log('No tienes montura. Cómprala en el Establo de Ryu.', '#f88'); return false; }
  P.riding = !P.riding; snd('pick'); log(P.riding ? 'Montas tu ' + MOUNTS[P.mount].n + '.' : 'Desmontas.', '#9cf'); return P.riding;
}
function talk(n) {
  if (n.id && !talk.direct) { openPanel('npc', n); return; }
  if (n.sched && n.state === 'tavern' && n.role !== 'tavern') { log(n.n + ': «¡Estoy descansando en la taberna! ' + pick(['¿Te invito una ronda?', 'Mañana hablamos de negocios.', 'Dicen que en el piso 10 hay un mercader con armas legendarias…']) + '»', '#fc8'); return 'offduty'; }
  if (!isOpen(n.role)) { const h = HOURS[n.role]; log(n.n + ': «Está cerrado. Abrimos de ' + h[0] + ':00 a ' + h[1] + ':00.» (son las ' + clock() + ')', '#aaa'); return 'closed'; }
  snd('ui');
  if (n.role === 'dmerch') return openPanel('dmerch');
  if (['bank', 'depot', 'temple', 'stable', 'recruit', 'arena', 'tavern', 'market'].includes(n.role)) return openPanel(n.role);
  if (n.role === 'quest') return openPanel('quests');
  if (n.role === 'shop') return openPanel('shop');
  if (n.role === 'smith') return openPanel('craft');
  if (n.role === 'god') { log('Hestia: «Pulsa H para mejorar nuestro hogar.»', '#fcf'); if (P.sp + P.kp > 0) log('Hestia: «¡Tienes puntos sin usar! Abre I y K para actualizar tu Falna.»', '#fcf'); else log('Hestia: «¡Cuídate en el calabozo! Te espero en casa.»', '#fcf'); P.hp = maxHp(); P.mp = maxMp(); }
}
function placeBlock(x, y) {
  const id = Object.keys(BLOCKS)[buildSel];
  if (!P.blocks[id]) return log('No tienes ' + BLOCKS[id].n + '. Fabrícalo (C).', '#f88');
  const t = gt(W, x, y), k = x + ',' + y;
  if (![T.GRASS, T.PLOT, T.PATH, T.SAND, T.STUMP].includes(t) || (x === P.x && y === P.y) || W.obj[k] || W.npcs.some(n => n.x === x && n.y === y)) return log('No se puede colocar ahí.', '#f88');
  if (BLOCKS[id].floor && W.obj[k]) return;
  W.obj[k] = id; P.blocks[id]--; snd('build'); burst(x * TS + 16, y * TS + 16, BLOCKS[id].col, 8);
  if (inPlot(x, y)) { questEvent('build', null, 1); questEvent('comfort', null, comfort()); }
}
function farm(x, y) {
  const k = x + ',' + y, c = town.crops[k];
  if (!c) {
    const sd = ['trigo', 'zanahoria', 'fresa'].find(t => P.mats['semilla_' + t] > 0 && (!P.seedPref || P.seedPref === t)) || ['trigo', 'zanahoria', 'fresa'].find(t => P.mats['semilla_' + t] > 0);
    if (!sd) return log('No tienes semillas. Cómpralas a Bors o búscalas entre las hierbas.', '#f88');
    P.mats['semilla_' + sd]--; town.crops[k] = { t: sd, s: 0, w: 0, g: 0 }; snd('build'); burst(x * TS + 16, y * TS + 16, '#7c4', 6); log('Plantaste ' + CROPS[sd].n + '. ¡Riégalo (E)!', '#9e9'); return 'plant';
  }
  if (c.s >= 3) {
    const n = ri(2, 3) + (Math.random() < P.sk.recolector * .2 ? 1 : 0); P.harvests++; P.mats[c.t] += n; if (Math.random() < .6) P.mats['semilla_' + c.t] += ri(1, 2); else P.mats['semilla_' + c.t] += 1;
    delete town.crops[k]; snd('pick'); burst(x * TS + 16, y * TS + 16, CROPS[c.t].col, 12); addText(x * TS + 16, y * TS, '+' + n + ' ' + CROPS[c.t].n, '#fe8'); gainXp(5); questEvent('gather', c.t, n); return 'harvest';
  }
  if (!c.w) { c.w = 1; snd('gather'); for (let i = 0; i < 8; i++) parts.push({ x: x * TS + rnd(4, 28), y: y * TS + 4, vx: 0, vy: rnd(40, 90), l: .4, col: '#6af', sz: 2 }); log('Regaste el cultivo.', '#6af'); return 'water'; }
  log('Está creciendo… (' + CROPS[c.t].n + ', etapa ' + (c.s + 1) + '/4)', '#aaa'); return 'wait';
}
function growCrops(dt) {
  for (const k in town.crops) { const c = town.crops[k]; if (wet() && c.s < 3) c.w = 1; if (c.s >= 3 || !c.w) continue; c.g += dt * (season().n === 'Invierno' ? .5 : 1); if (c.g >= CROPS[c.t].t / 3) { c.g = 0; c.s++; c.w = c.s >= 3 ? 1 : 0; } }
}
function drawCrop(x, y, sx, sy) {
  const c = town.crops[x + ',' + y]; if (!c) return;
  if (c.w && c.s < 3) { cx.fillStyle = 'rgba(30,40,80,.35)'; cx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2); }
  const col = CROPS[c.t].col, sway = Math.sin(time * 2 + x) * 1.5;
  for (let i = 0; i < 3; i++) {
    const px = sx + 7 + i * 9 + sway, h = 4 + c.s * 5;
    cx.fillStyle = '#3a8a2a'; cx.fillRect(px, sy + 26 - h, 2, h);
    if (c.s >= 1) { cx.fillRect(px - 3, sy + 24 - h / 2, 3, 2); cx.fillRect(px + 2, sy + 22 - h / 2, 3, 2); }
    if (c.s >= 3) { cx.fillStyle = col; cx.fillRect(px - 2, sy + 22 - h, 6, 5); }
  }
  if (c.s >= 3 && Math.sin(time * 4 + x) > .7) { cx.fillStyle = '#fff'; cx.fillRect(sx + 26, sy + 4, 2, 2); }
  if (!c.w && c.s < 3) { cx.font = '11px sans-serif'; cx.textAlign = 'center'; cx.fillText('💧', sx + 16, sy + 8 + Math.sin(time * 4) * 2); }
}
// ===== Visitantes =====
const VNAMES = ['Ais', 'Lili', 'Asuna', 'Kirito', 'Haruhiro', 'Yume', 'Merry', 'Ranta', 'Ryu', 'Klein', 'Shiho', 'Mogzo'];
let visitors = [], visitT = 20;
function comfortTier(c) { return c < 8 ? 0 : c < 25 ? 1 : c < 50 ? 2 : 3; }
const VLINES = [['Hmm… está un poco vacío aquí.', 'Le falta algo de vida a tu casa.'], ['¡Qué lugar tan acogedor!', 'Me gusta tu decoración.'], ['¡Wow, qué casa tan bonita!', 'Podría quedarme aquí todo el día.'], ['¡Es una mansión digna de un héroe!', '¡Todo Orario habla de tu hogar!']];
function spawnVisitor() {
  const c = comfort(); if (c < 3 || visitors.length >= 1 + comfortTier(c)) return null;
  const free = []; for (let y = PLOT.y; y < PLOT.y + PLOT.h; y++) for (let x = PLOT.x; x < PLOT.x + PLOT.w; x++) if (!solidAt(x, y)) free.push([x, y]);
  if (!free.length) return null;
  const [x, y] = pick(free), t = comfortTier(c), v = { x, y, fx: x, fy: y, n: pick(VNAMES), col: `hsl(${ri(0, 360)},50%,50%)`, hair: pick(['#ec4', '#222', '#a52', '#ddd', '#c4a']), line: pick(VLINES[t]), tier: t, gift: 1, life: 90, mt: 0, mcd: 1 };
  visitors.push(v); log(v.n + ' vino de visita a tu casa.', '#9cf'); return v;
}
function updateVisitors(dt) {
  if (W !== town) return;
  visitT -= dt; if (visitT <= 0) { visitT = rnd(40, 80) / (1 + comfortTier(comfort()) * .5); if (Math.random() < .8) spawnVisitor(); }
  for (const v of visitors) {
    v.life -= dt; v.mcd -= dt;
    if (v.mt > 0) { v.mt -= dt; const k = Math.max(0, v.mt / .4); v.fx = v.x - v.dx * k; v.fy = v.y - v.dy * k; } else { v.fx = v.x; v.fy = v.y; }
    if (v.mcd <= 0) { v.mcd = rnd(1, 3); const [ox, oy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (inPlot(v.x + ox, v.y + oy) && !solidAt(v.x + ox, v.y + oy)) { v.x += ox; v.y += oy; v.dx = ox; v.dy = oy; v.mt = .4; } }
  }
  visitors = visitors.filter(v => v.life > 0);
}
function talkVisitor(v) {
  if (v.gift) {
    v.gift = 0; P.gifts++;
    const g = 10 + v.tier * 30 + Math.round(comfort() * 1.5), mat = pick(['madera', 'piedra', 'hierro', 'hierba', 'semilla_fresa', 'semilla_zanahoria']);
    P.gold += g; P.mats[mat] += 1 + v.tier; addText(v.x * TS + 16, v.y * TS, '+' + g + ' oro', '#fd4');
    log(v.n + ': «' + v.line + '» Te regala ' + g + ' oro y ' + (1 + v.tier) + ' ' + mat.replace('_', ' de ') + '.', '#9cf');
    if (v.tier >= 3) { P.buffs.sabiduria = 120; log('¡La inspiración de tu hogar te da ' + BUFFN.sabiduria + '!', '#fc8'); }
  } else log(v.n + ': «' + v.line + '»', '#9cf');
  snd('ui'); return true;
}
function removeBlock(x, y) {
  const k = x + ',' + y, id = W.obj[k]; if (!id) return;
  if (id === 'cultivo' && W === town && town.crops[k]) { delete town.crops[k]; }
  delete W.obj[k]; P.blocks[id] = (P.blocks[id] || 0) + 1; snd('gather'); burst(x * TS + 16, y * TS + 16, BLOCKS[id].col, 6);
}
const GUILD = { x: 30, y: 22, w: 8, h: 6 };
const inGuild = (x, y) => P && P.guildHall && x >= GUILD.x && y >= GUILD.y && x < GUILD.x + GUILD.w && y < GUILD.y + GUILD.h;
function guildComfort() { let c = 0; for (const k in town.obj) { const [x, y] = k.split(',').map(Number); if (inGuild(x, y)) c += BLOCKS[town.obj[k]].comfort || 0; } return c; }
const guildBonus = () => P.guildHall ? Math.min(.3, guildComfort() * .01) : 0;
function paintGuild(m) { for (let y = GUILD.y; y < GUILD.y + GUILD.h; y++) for (let x = GUILD.x; x < GUILD.x + GUILD.w; x++) st(m, x, y, T.PLOT); }
function buyGuildHall() { if (P.guildHall) return false; if (P.gold < 3000) { log('La sede cuesta 3000 oro.', '#f88'); return false; } P.gold -= 3000; P.guildHall = 1; paintGuild(town); for (const k in town.obj) { const [x, y] = k.split(',').map(Number); if (inGuild(x, y) && SOLID.has(gt(town, x, y))) delete town.obj[k]; } log('🏰 ¡Compraste la Sede del Gremio! Tus aliados vivirán y descansarán aquí. Decórala (B) para darles bonus.', '#fd4'); snd('lvl'); buildComps(); return true; }
const inPlot = (x, y) => x >= PLOT.x && y >= PLOT.y && x < PLOT.x + PLOT.w && y < PLOT.y + PLOT.h;
function upgradeHouse() {
  const nx = HOUSE[(P.house || 1) + 1]; if (!nx) return false;
  if (P.gold < nx.cost.oro || !Object.entries(nx.cost).every(([k, v]) => k === 'oro' || P.mats[k] >= v)) return false;
  for (const k in nx.cost) if (k === 'oro') P.gold -= nx.cost[k]; else P.mats[k] -= nx.cost[k];
  P.house++; setPlot(P.house); paintPlot(town);
  for (const k in town.obj) { const [x, y] = k.split(',').map(Number); if (SOLID.has(gt(town, x, y))) delete town.obj[k]; }
  snd('lvl'); log('¡Tu casa ahora es: ' + nx.n + '!', '#fd4'); questEvent('comfort', null, comfort()); save(); return true;
}
function comfort() { let c = 0; const mul = (HOUSE[P.house || 1].mult || 1); for (const k in town.obj) { const [x, y] = k.split(',').map(Number); if (inPlot(x, y)) c += BLOCKS[town.obj[k]].comfort || 0; } return Math.round(c * mul); }

function damageEnemy(e, dmg, color) {
  const c = Math.random() * 100 < crit(); if (c) dmg = Math.round(dmg * 1.8);
  dmg = Math.max(1, Math.round(dmg * rnd(.85, 1.15)) - e.def);
  e.hp -= dmg; e.flash = .15; e.aggro = true; snd('hit'); shake = Math.max(shake, c ? 6 : 3);
  addText(e.fx * TS + 16, e.fy * TS, (c ? '¡' : '') + dmg + (c ? '!' : ''), c ? '#ff4' : color || '#fff', c ? 20 : 15);
  burst(e.fx * TS + 16, e.fy * TS + 16, e.col, c ? 14 : 7);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  ents = ents.filter(x => x !== e); snd('die'); burst(e.fx * TS + 16, e.fy * TS + 16, e.col, 25); shake = e.boss ? 20 : 4;
  gainXp(e.xp); P.kills++; questEvent('kill', null, 1); petGainXp(e.xp * .35); if (W === field) storyEvent('fieldkill', 1); if (e.boss && W.floor) storyEvent('boss' + W.floor, 1); allyQuestEvent('kill', null, 1); allyQuestEvent('killName', e.n.replace(/^★ | dorado$/g, ''), 1, e.rare ? 'rare' : null); if (e.boss) allyQuestEvent('boss', null, 1); if (e.champion && arena) arena.champs = (arena.champs || 0) + 1;
  const g = Math.round((ri(2, 5) + e.lvl * 3) * (1 + P.sk.fortuna * .15 + (P.pet === 'gato' ? (petData('gato').lvl >= 10 ? .5 : .25) : 0)) * (e.boss ? 10 : 1));
  drops.push({ x: e.x, y: e.y, gold: g });
  if (e.boss || e.rare || Math.random() < (e.lvl <= 3 ? .26 : .2)) drops.push({ x: e.x, y: e.y, item: genItem(null, e.lvl, e.boss ? ri(2, 4) : e.rare ? ri(3, 4) : null) });
  if (e.rare) { P.rares++; log('¡Derrotaste a un monstruo raro: ' + e.n + '!', '#fd4'); for (let i = 0; i < 3; i++) drops.push({ x: e.x, y: e.y, gold: g }); }
  if (e.boss) P.bosses++;
  if (Math.random() < .12) drops.push({ x: e.x, y: e.y, cons: Math.random() < .7 ? 'pocion_vida' : 'pocion_mana' });
  if (e.boss) {
    for (let i = 0; i < 3; i++) drops.push({ x: e.x, y: e.y, mat: 'cristal', n: ri(1, 3) });
    st(W, W.downAt[0], W.downAt[1], T.DOWN); log('¡' + e.n + ' ha caído! Se abrió la escalera al siguiente piso.', '#fc4'); questEvent('boss', null, 1);
  }
  if (P.target === e) P.target = null;
}
const isBow = () => P.eq.arma && P.eq.arma.name.startsWith('Arco');
function bowTarget() {
  const ok = e => ents.includes(e) && Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= 6 && los(P.x, P.y, e.x, e.y);
  if (P.target && ok(P.target)) return P.target;
  const [dx, dy] = P.dir; const line = ents.filter(e => ok(e) && (dx ? Math.sign(e.x - P.x) === dx && Math.abs(e.y - P.y) <= 1 : Math.sign(e.y - P.y) === dy && Math.abs(e.x - P.x) <= 1));
  const c = (line.length ? line : ents.filter(e => ok(e) && (e.aggro || Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= 4))); c.sort((a, b) => (Math.abs(a.x - P.x) + Math.abs(a.y - P.y)) - (Math.abs(b.x - P.x) + Math.abs(b.y - P.y)));
  return c[0] || null;
}
function playerAttack(manual) {
  if (P.atkCd > 0) return;
  if (isBow()) {
    const t = bowTarget(); if (!t) { if (manual) { P.atkCd = .3; } return; }
    P.atkCd = atkTime(); const ax = P.fx * TS + 16, ay = P.fy * TS + 16, bx = t.fx * TS + 16, by = t.fy * TS + 16, d = Math.hypot(bx - ax, by - ay) || 1;
    if (Math.abs(bx - ax) > Math.abs(by - ay)) P.dir = [Math.sign(bx - ax), 0]; else P.dir = [0, Math.sign(by - ay)];
    projs.push({ x: ax, y: ay, vx: (bx - ax) / d * 480, vy: (by - ay) / d * 480, dmg: atk(), life: 1, kind: 'arrow', pl: 1 }); snd('step'); return;
  }
  let t = null; const [fx, fy] = facing();
  if (P.target && ents.includes(P.target) && Math.max(Math.abs(P.target.x - P.x), Math.abs(P.target.y - P.y)) <= 1) t = P.target;
  t = t || ents.find(e => e.x === fx && e.y === fy) || ents.find(e => Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= 1);
  if (!t) { if (manual) { P.atkCd = .3; P.swing = .2; } return; }
  P.atkCd = atkTime(); P.swing = .2; P.dir = [Math.sign(t.x - P.x), Math.sign(t.y - P.y)];
  damageEnemy(t, atk());
}
function useSkill(id) {
  const s = SKILLS[id], r = P.sk[id];
  if (!r) return log('No has aprendido ' + s.n + '. (K)', '#f88');
  if ((P.cds[id] || 0) > 0) return; if (P.mp < s.mp) return log('Maná insuficiente.', '#88f');
  P.mp -= s.mp; P.cds[id] = s.cd;
  if (id === 'golpe') {
    const [fx, fy] = facing(); const t = ents.find(e => Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= 1 && (e.x === fx && e.y === fy)) || ents.find(e => Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= 1);
    if (t) damageEnemy(t, atk() * (2.5 + r * .4), '#fa4'); P.swing = .3; shake = 8;
  }
  if (id === 'torbellino') { ents.filter(e => Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= 1).forEach(e => damageEnemy(e, atk() * (1.3 + r * .3), '#fd8')); ring(P.fx * TS + 16, P.fy * TS + 16, '#fd8'); shake = 6; }
  if (id === 'fuego') { projs.push({ x: P.fx * TS + 16, y: P.fy * TS + 16, vx: P.dir[0] * 360, vy: P.dir[1] * 360, dmg: 10 + stat('int') * 3 * (1 + r * .3), life: 1.2 }); snd('fire'); }
  if (id === 'curar') { const h = Math.round(20 + stat('int') * 4 * (1 + r * .3)); P.hp = Math.min(maxHp(), P.hp + h); addText(P.fx * TS + 16, P.fy * TS, '+' + h, '#5f5', 17); ring(P.fx * TS + 16, P.fy * TS + 16, '#5f5'); snd('heal'); }
}
function usePot(id) {
  if (!P.cons[id]) return log('No tienes ' + CONSUM[id].n + '.', '#f88');
  if (CONSUM[id].food) { P.cons[id]--; P.buffs[CONSUM[id].buff] = CONSUM[id].dur; log('Comes ' + CONSUM[id].n + ': ' + BUFFN[CONSUM[id].buff] + ' (' + CONSUM[id].dur / 60 + ' min).', '#fc8'); snd('heal'); ring(P.fx * TS + 16, P.fy * TS + 16, '#fc8'); return; }
  if ((P.cds.pot || 0) > 0) return; P.cds.pot = 1; P.cons[id]--;
  if (id === 'pocion_vida') { const h = Math.round(maxHp() * .4); P.hp = Math.min(maxHp(), P.hp + h); addText(P.fx * TS + 16, P.fy * TS, '+' + h, '#5f5'); }
  else { const h = Math.round(maxMp() * .5); P.mp = Math.min(maxMp(), P.mp + h); addText(P.fx * TS + 16, P.fy * TS, '+' + h, '#69f'); }
  snd('heal');
}
function gainXp(n) {
  if (P.buffs && P.buffs.sabiduria > 0) n = Math.round(n * 1.4);
  if (P.perks && P.perks.xp) n = Math.round(n * (1 + P.perks.xp));
  P.xp += n;
  while (P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++; P.party.forEach(x => { if (!x.down) x.hp = allyMaxHp(x.id); }); P.sp += 3; P.kp += 1; P.hp = maxHp(); P.mp = maxMp();
    snd('lvl'); ring(P.fx * TS + 16, P.fy * TS + 16, '#fd4'); burst(P.fx * TS + 16, P.fy * TS + 16, '#fd4', 40);
    addText(P.fx * TS + 16, P.fy * TS - 10, '¡NIVEL ' + P.lvl + '!', '#fd4', 24);
    log('¡Subiste a nivel ' + P.lvl + '! +3 puntos de estado, +1 punto de habilidad.', '#fd4');
  }
}
function questReward(rw) {
  if (!rw) return;
  if (rw === 'kit') { P.blocks.muro_madera = (P.blocks.muro_madera || 0) + 6; P.blocks.suelo_madera = (P.blocks.suelo_madera || 0) + 4; P.mats.semilla_trigo += 3; log('🎁 Eina te da un kit de construcción (6 muros, 4 suelos) y semillas.', '#fd4'); }
  if (rw === 'arma') { const C = CLASSES[P.cls] || CLASSES.guerrero, it = genItem('arma', Math.max(2, P.lvl), 1, C.w); P.inv.push(it); log('🎁 Recompensa: ' + it.name + ' [Poco común]', '#5e5'); }
  if (rw === 'cama') { P.blocks.cama = (P.blocks.cama || 0) + 1; P.blocks.antorcha = (P.blocks.antorcha || 0) + 2; log('🎁 Recompensa: una cama y 2 antorchas para tu casa.', '#fd4'); }
  if (rw === 'armadura') { const it = genItem('armadura', Math.max(3, P.lvl), 2); P.inv.push(it); log('🎁 Recompensa: ' + it.name + ' [Raro]', '#5af'); }
}
function questEvent(type, key, n) {
  const q = QUESTS[P.q]; if (!q || q.t !== type) return; if (q.k && q.k !== key) return;
  if (type === 'floor' || type === 'comfort') P.qp = Math.max(P.qp, n); else P.qp += n;
  if (P.qp >= q.c) log('Misión «' + q.n + '» completada. Habla con Eina en el gremio.', '#7f7');
}
function hurtPlayer(d, src) {
  d = Math.max(1, Math.round(d * rnd(.85, 1.15) - def() * .5));
  if (fishing) { fishing = null; log('¡Te atacaron! Pierdes el pez.', '#f88'); }
  if (P.buffs.escudo > 0 && P.mp > 0) { const m = Math.min(P.mp, d); P.mp -= m; d -= m; addText(P.fx * TS + 22, P.fy * TS, '-' + Math.round(m), '#69f', 13); }
  P.hp -= d; P.flash = .2; shake = Math.max(shake, 5); snd('hurt');
  addText(P.fx * TS + 16, P.fy * TS, '-' + d, '#f55', 16);
  if (P.hp <= 0) die(src);
}
function die(src) {
  P.deaths++; if (arena && arena.tourney) finishTourney();
  const lost = (P.blessed || (W && W.isArena)) ? 0 : Math.floor(P.gold * .1); P.gold -= lost; if (P.blessed) { P.blessed = 0; log('✨ La bendición del templo te protegió: no pierdes oro.', '#ff9'); }
  log('Has caído ante ' + src + '. Pierdes ' + lost + ' de oro.', '#f44');
  P.hp = maxHp(); P.mp = maxMp(); enterTown([20, 7]); openPanel('death', { src, lost });
}

// ---------- Pesca ----------
let fishing = null;
const FISH = [{ n: 'Trucha', mat: 'pescado', diff: .8, w: 50 }, { n: 'Carpa', mat: 'pescado', diff: 1, w: 30 }, { n: 'Salmón', mat: 'pescado', diff: 1.3, w: 15, n2: 2 }, { n: 'Pez dorado', mat: 'pez_dorado', diff: 1.8, w: 5 }];
function startFishing(x, y) {
  if (!P.cana) { log('Necesitas una caña de pescar (C).', '#f88'); return false; }
  let tot = 0; const ws = FISH.map(f => { const w = f.w * (f.mat === 'pez_dorado' && wet() ? 2.5 : 1); tot += w; return w; }); let r = Math.random() * tot, i = 0; while (r > ws[i]) r -= ws[i++];
  fishing = { f: FISH[i], x, y, fp: .5, fv: 0, ft: 0, zp: .3, zv: 0, prog: .3, bite: rnd(.6, 1.6) }; log('Lanzas la caña… mantén ESPACIO para subir la zona verde.', '#6af'); snd('pick'); return true;
}
function updateFishing(dt) {
  const F = fishing; if (F.bite > 0) { F.bite -= dt; return; }
  F.ft -= dt; if (F.ft <= 0) { F.ft = rnd(.3, 1.2) / F.f.diff; F.fv = rnd(-.9, .9) * F.f.diff; }
  F.fp = Math.max(0, Math.min(1, F.fp + F.fv * dt)); if (F.fp <= 0 || F.fp >= 1) F.fv *= -1;
  F.zv += ((keys[' '] || F.hold) ? 1.8 : -1.5) * dt; F.zv *= .97; F.zp += F.zv * dt; if (F.zp < 0) { F.zp = 0; F.zv = 0; } if (F.zp > .76) { F.zp = .76; F.zv = 0; }
  const inz = F.fp >= F.zp && F.fp <= F.zp + .24; F.inz = inz;
  F.prog += (inz ? .32 : -.2) * dt;
  if (F.prog >= 1) { const n = F.f.n2 || 1; P.mats[F.f.mat] += n; P.fishCaught++; addText(P.fx * TS + 16, P.fy * TS - 8, '+' + F.f.n, '#6cf', 17); log('¡Pescaste: ' + F.f.n + '!', '#6cf'); burst(F.x * TS + 16, F.y * TS + 16, '#6cf', 16); snd('lvl'); gainXp(8 + F.f.diff * 10); fishing = null; }
  else if (F.prog <= 0) { log('El pez escapó…', '#aaa'); snd('gather'); fishing = null; }
}
function drawFishing(vw, vh) {
  const F = fishing; if (!F) return;
  const bx = F.x * TS + 16 - camX, by = F.y * TS + 16 - camY + Math.sin(time * 5) * 2 + (F.bite <= 0 && F.inz ? 2 : 0);
  cx.strokeStyle = '#ddd'; cx.beginPath(); cx.moveTo(P.fx * TS + 26 - camX, P.fy * TS + 4 - camY); cx.lineTo(bx, by); cx.stroke(); cx.fillStyle = '#f33'; cx.beginPath(); cx.arc(bx, by, 4, 0, 7); cx.fill();
  const X = vw / 2 + 120, Y = vh / 2 - 130, H = 260;
  cx.fillStyle = '#000c'; cx.fillRect(X - 10, Y - 30, 90, H + 50); cx.strokeStyle = '#6af'; cx.strokeRect(X - 10, Y - 30, 90, H + 50);
  cx.fillStyle = '#fff'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center'; cx.fillText(F.bite > 0 ? 'Esperando…' : '¡Pica!', X + 35, Y - 12);
  cx.fillStyle = '#123'; cx.fillRect(X, Y, 36, H);
  cx.fillStyle = F.inz ? '#5f5a' : '#5a5a'; cx.fillRect(X, Y + H * (1 - F.zp - .24), 36, H * .24);
  cx.font = '20px sans-serif'; cx.fillText(F.f.mat === 'pez_dorado' ? '🐠' : '🐟', X + 18, Y + H * (1 - F.fp) + 7);
  cx.fillStyle = '#333'; cx.fillRect(X + 46, Y, 14, H); cx.fillStyle = F.prog > .6 ? '#5f5' : F.prog > .3 ? '#fd4' : '#f55'; cx.fillRect(X + 46, Y + H * (1 - F.prog), 14, H * F.prog);
  cx.fillStyle = '#aaa'; cx.font = '10px sans-serif'; cx.fillText('ESPACIO', X + 35, Y + H + 14);
}

// ---------- Compañeros: mascotas, monturas y aliados ----------
const PETS = {
  perro: { n: 'Perro fiel', price: 300, col: '#a86', dmg: 1, range: 1, d: 'Muerde a enemigos cercanos.' },
  gato: { n: 'Gato de la suerte', price: 400, col: '#fa5', dmg: .6, range: 1, gold: .25, d: '+25% de oro de los monstruos.' },
  halcon: { n: 'Halcón', price: 600, col: '#cb9', dmg: .8, range: 4, d: 'Ataca a distancia (4 casillas).' },
  slime: { n: 'Slime mascota', price: 500, col: '#5d8', dmg: .7, range: 1, heal: 1, d: 'Te cura poco a poco.' },
};
const MOUNTS = {
  caballo: { n: 'Caballo', price: 800, col: '#7a4a2a', spd: .65, d: 'Muévete un 35% más rápido.' },
  lobo: { n: 'Lobo gigante', price: 2500, col: '#556', spd: .5, atk: .1, d: 'Muévete un 50% más rápido y +10% ataque.' },
};
const ALLIES = {
  mogzo: { n: 'Mogzo', cls: 'Guerrero', col: '#a63', hp: 2.2, dmg: 1, range: 1, price: 200, taunt: 1 },
  merry: { n: 'Merry', cls: 'Sacerdotisa', col: '#ddf', hp: 1.2, dmg: .5, range: 3, price: 300, healer: 1 },
  yume: { n: 'Yume', cls: 'Cazadora', col: '#da5', hp: 1.3, dmg: .9, range: 5, price: 250 },
  shihoru: { n: 'Shihoru', cls: 'Maga', col: '#649', hp: 1, dmg: 1.3, range: 4, price: 300, magic: 1 },
  ranta: { n: 'Ranta', cls: 'Caballero Oscuro', col: '#333', hp: 1.6, dmg: 1.2, range: 1, price: 250 },
};
const MAX_PARTY = 2;
ALLIES.wiene = { n: 'Wiene', cls: 'Vouivre', col: '#7cf', hp: 1.6, dmg: 1.3, range: 3, price: 0, story: 1 };
ALLIES.lili = { n: 'Lili', cls: 'Supporter', col: '#ec8', hp: 1.1, dmg: .6, range: 3, price: 0, story: 1 };
const EVO = { perro: { n: 'Cerbero', col: '#622' }, gato: { n: 'Nekomata', col: '#c5f' }, halcon: { n: 'Grifo', col: '#db6' }, slime: { n: 'Rey Slime', col: '#3cf' } };
function petData(id = P.pet) { P.petLv = P.petLv || {}; return P.petLv[id] || (P.petLv[id] = { lvl: 1, xp: 0 }); }
const petNeed = l => Math.round(40 * Math.pow(l, 1.5));
const petName = id => (petData(id).lvl >= 10 ? EVO[id].n : PETS[id].n) + ' Nv' + petData(id).lvl;
function petGainXp(n) {
  if (!P.pet) return; const d = petData(); if (d.lvl >= 30) return; d.xp += Math.max(1, Math.round(n));
  while (d.xp >= petNeed(d.lvl) && d.lvl < 30) { d.xp -= petNeed(d.lvl); d.lvl++; log('🐾 ' + PETS[P.pet].n + ' sube a nivel ' + d.lvl + '.', '#9cf');
    if (d.lvl === 10) { log('✨ ¡' + PETS[P.pet].n + ' evolucionó a ' + EVO[P.pet].n + '!', '#fd4'); snd('lvl'); const c = comps.find(c => c.kind === 'pet'); if (c) { ring(c.fx * TS + 16, c.fy * TS + 16, '#fd4'); burst(c.fx * TS + 16, c.fy * TS + 16, '#fd4', 40); } } }
}
const PETAB = { perro: { n: 'Mordisco feroz', cd: 15 }, gato: { n: 'Robo felino', cd: 20 }, halcon: { n: 'Picada', cd: 12 }, slime: { n: 'Curación gelatinosa', cd: 25 } };
function petAbility() {
  if (!P.pet) { log('No tienes mascota activa.', '#f88'); return 'nopet'; }
  if ((P.cds.pet || 0) > 0) { log(PETAB[P.pet].n + ' se recarga (' + Math.ceil(P.cds.pet) + 's).', '#aaa'); return 'cd'; }
  const c = comps.find(c => c.kind === 'pet'); if (!c) return 'nopet';
  const evo = petData().lvl >= 10, pm = petMult(P.pet), range = P.pet === 'halcon' ? 6 : 2;
  const t = (P.target && ents.includes(P.target) && Math.max(Math.abs(P.target.x - c.x), Math.abs(P.target.y - c.y)) <= range) ? P.target : ents.filter(e => Math.max(Math.abs(e.x - c.x), Math.abs(e.y - c.y)) <= range).sort((a, b) => b.hp - a.hp)[0];
  if (P.pet === 'slime') { const h = Math.round(maxHp() * (evo ? .45 : .3)); P.hp = Math.min(maxHp(), P.hp + h); P.party.forEach(a => { if (!a.down) a.hp = allyMaxHp(a.id); }); addText(P.fx * TS + 16, P.fy * TS, '+' + h, '#5f5', 18); ring(c.fx * TS + 16, c.fy * TS + 16, '#5d8'); }
  else { if (!t) { log('No hay enemigos cerca de tu mascota.', '#aaa'); return 'notarget'; }
    c.x = c.x; const base = compDmg(c);
    if (P.pet === 'perro') { damageEnemy(t, base * (evo ? 6 : 4), '#fa5'); if (ents.includes(t)) { t.cd = Math.max(t.cd, 2.5); t.mcd = Math.max(t.mcd, 2.5); addText(t.fx * TS + 16, t.fy * TS - 10, '¡Aturdido!', '#ff8'); } }
    if (P.pet === 'halcon') { for (let i = 0; i < (evo ? 5 : 3); i++) if (ents.includes(t)) damageEnemy(t, base * 1.3, '#cb9'); }
    if (P.pet === 'gato') { const g = Math.round((10 + t.lvl * 6) * (evo ? 2 : 1)); drops.push({ x: P.x, y: P.y, gold: g }); if (Math.random() < (evo ? .5 : .25)) drops.push({ x: P.x, y: P.y, item: genItem(null, t.lvl, ri(1, 3)) }); pickup(); damageEnemy(t, base, '#fa5'); }
  }
  P.cds.pet = PETAB[P.pet].cd; texts.push({ x: c.fx * TS + 16, y: c.fy * TS - 16, t: PETAB[P.pet].n + '!', col: '#9cf', sz: 13, l: 1.2 }); snd('lvl'); return 'used';
}
const petMult = id => (1 + (petData(id).lvl - 1) * .12) * (petData(id).lvl >= 10 ? 1.5 : 1);
// misiones personales de aliados
const AQUEST = {
  mogzo: { n: 'El escudo de Mogzo', d: 'Derrota 30 monstruos con Mogzo en el grupo.', t: 'kill', c: 30 },
  merry: { n: 'Superar el pasado', d: 'Llega al piso 8 con Merry en el grupo.', t: 'floor', c: 8 },
  yume: { n: 'Cazadora de lobos', d: 'Derrota 8 Lobos sombríos con Yume.', t: 'killName', k: 'Lobo sombrío', c: 8 },
  shihoru: { n: 'Valor de maga', d: 'Derrota a un jefe con Shihoru.', t: 'boss', c: 1 },
  ranta: { n: 'Camino del Dread Knight', d: 'Derrota 3 monstruos raros o 40 monstruos con Ranta.', t: 'kill', c: 40, rareAlt: 3 },
};
const allyMult = id => (P.allyQ && P.allyQ[id] && P.allyQ[id].done ? 1.4 : 1) * (1 + (typeof guildBonus === 'function' && town ? guildBonus() : 0));
function allyQuestEvent(type, name, n, extra) {
  P.allyQ = P.allyQ || {};
  for (const a of P.party) {
    if (a.down) continue; const Q = AQUEST[a.id], q = P.allyQ[a.id] || (P.allyQ[a.id] = { p: 0, r: 0 }); if (q.done) continue;
    if (Q.t === type && (!Q.k || Q.k === name)) q.p = type === 'floor' ? Math.max(q.p, n) : q.p + n;
    if (Q.rareAlt && extra === 'rare') q.r++;
    if (q.p >= Q.c || (Q.rareAlt && q.r >= Q.rareAlt)) { q.done = 1; P.gold += 300; a.hp = allyMaxHp(a.id); log('⭐ ' + ALLIES[a.id].n + ' completó «' + Q.n + '»: ¡ahora es Veterano (+40% vida y daño)! +300 oro', '#fd4'); snd('lvl'); }
  }
}
let comps = [];
function allyMaxHp(id) { return Math.round((60 + P.lvl * 14) * ALLIES[id].hp * allyMult(id)); }
function buildComps() {
  comps = []; texts = []; parts = []; reveal();
  if (P.pet) comps.push({ kind: 'pet', id: P.pet, x: P.x, y: P.y, fx: P.x, fy: P.y, mt: 0, cd: 1 });
  for (const a of P.party) comps.push({ kind: 'ally', id: a.id, a, x: P.x, y: P.y, fx: P.x, fy: P.y, mt: 0, cd: 1 });
  placeComps();
  if (W === town && P.guildHall && P.allyRest !== false) { let i = 0; for (const c of comps) if (c.kind === 'ally') { const seats = [[GUILD.x + 2, GUILD.y + 2], [GUILD.x + 5, GUILD.y + 2], [GUILD.x + 3, GUILD.y + 4], [GUILD.x + 6, GUILD.y + 4]]; let [x, y] = seats[i++ % 4]; if (town.obj[x + ',' + y] && BLOCKS[town.obj[x + ',' + y]].solid) { y++; } c.x = x; c.y = y; c.fx = x; c.fy = y; c.rest = 1; } }
}
function placeComps() {
  P.trail = [];
  for (const c of comps) { if (c.rest) continue; let best = null; for (let r = 1; r < 4 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) { const x = P.x + dx, y = P.y + dy; if (!solidAt(x, y) && !comps.some(o => o !== c && o.x === x && o.y === y)) best = [x, y]; } if (best) { c.x = best[0]; c.y = best[1]; } else { c.x = P.x; c.y = P.y; } c.fx = c.x; c.fy = c.y; c.mt = 0; }
}
const compAt = (x, y, self) => comps.some(c => c !== self && c.x === x && c.y === y);
function compDmg(c) { const D = c.kind === 'pet' ? PETS[c.id] : ALLIES[c.id]; return Math.round((4 + P.lvl * 2.2 + (c.kind === 'ally' ? P.lvl : 0)) * D.dmg * (c.kind === 'pet' ? petMult(c.id) : allyMult(c.id))); }
function updateComps(dt) {
  comps.forEach((c, i) => {
    if (c.mt > 0) { c.mt -= dt; const k = Math.max(0, c.mt / .2); c.fx = c.x - c.dx * k; c.fy = c.y - c.dy * k; } else { c.fx = c.x; c.fy = c.y; }
    c.cd -= dt; c.flash = Math.max(0, (c.flash || 0) - dt);
    if (c.rest) { c.restT = (c.restT || 0) + dt; if (c.a.down && c.restT > DAYLEN / 24) { c.a.down = 0; log(ALLIES[c.id].n + ' se recuperó descansando en la sede.', '#9f9'); } if (!c.a.down) c.a.hp = Math.min(allyMaxHp(c.id), c.a.hp + dt * (5 + guildComfort())); if (Math.random() < dt * .3 && c.mt <= 0) { const [ox, oy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (inGuild(c.x + ox, c.y + oy) && !solidAt(c.x + ox, c.y + oy)) { c.x += ox; c.y += oy; c.dx = ox; c.dy = oy; c.mt = .4; } } return; }
    if (c.kind === 'ally' && c.a.down) return;
    const D = c.kind === 'pet' ? PETS[c.id] : ALLIES[c.id];
    // seguir
    const dist = Math.abs(c.x - P.x) + Math.abs(c.y - P.y);
    if (dist > 8) { placeComps(); return; }
    const engaged = dist <= 3 && ents.some(e => Math.max(Math.abs(e.x - c.x), Math.abs(e.y - c.y)) <= D.range && (D.range === 1 || los(c.x, c.y, e.x, e.y)));
    if (c.mt <= 0 && !engaged && dist > 1 + (i > 0 ? 1 : 0)) {
      const tgt = P.trail[P.trail.length - 1 - i] || [P.x, P.y];
      let step = null; const opts = [[Math.sign(tgt[0] - c.x), 0], [0, Math.sign(tgt[1] - c.y)], [Math.sign(P.x - c.x), 0], [0, Math.sign(P.y - c.y)]].filter(o => o[0] || o[1]);
      for (const o of opts) { const nx = c.x + o[0], ny = c.y + o[1]; if (!solidAt(nx, ny) && !compAt(nx, ny, c)) { step = o; break; } }
      if (step) { c.x += step[0]; c.y += step[1]; c.dx = step[0]; c.dy = step[1]; c.mt = .2; }
    }
    if (c.cd > 0) return;
    if (D.healer && P.hp < maxHp() * .6) { const h = Math.round(15 + P.lvl * 5); P.hp = Math.min(maxHp(), P.hp + h); addText(P.fx * TS + 16, P.fy * TS - 4, '+' + h, '#5f5'); ring(P.fx * TS + 16, P.fy * TS + 16, '#afa'); c.cd = 4; return; }
    if (D.healer) { const hurt = comps.find(o => o.kind === 'ally' && !o.a.down && o.a.hp < allyMaxHp(o.id) * .5); if (hurt) { hurt.a.hp = Math.min(allyMaxHp(hurt.id), hurt.a.hp + 20 + P.lvl * 4); ring(hurt.fx * TS + 16, hurt.fy * TS + 16, '#afa'); c.cd = 4; return; } }
    if (D.heal && P.hp < maxHp()) { P.hp = Math.min(maxHp(), P.hp + 2 + P.lvl * .5); }
    const t = ents.filter(e => Math.max(Math.abs(e.x - c.x), Math.abs(e.y - c.y)) <= D.range && (D.range === 1 || los(c.x, c.y, e.x, e.y))).sort((a, b) => (a === P.target ? -1 : 0) - (b === P.target ? -1 : 0) || a.hp - b.hp)[0];
    if (!t) return;
    c.cd = c.kind === 'pet' ? 1.3 : 1.1; c.swing = .2;
    if (D.range > 1) { const ax = c.fx * TS + 16, ay = c.fy * TS + 16, bx = t.fx * TS + 16, by = t.fy * TS + 16, d = Math.hypot(bx - ax, by - ay) || 1; projs.push({ x: ax, y: ay, vx: (bx - ax) / d * 420, vy: (by - ay) / d * 420, dmg: compDmg(c), life: 1.2, kind: D.magic ? undefined : 'arrow', ally: 1 }); }
    else damageEnemy(t, compDmg(c), '#8cf');
  });
}
function hurtAlly(c, d, src) {
  d = Math.max(1, Math.round(d * rnd(.85, 1.15) - P.lvl * .5)); c.a.hp -= d; c.flash = .2; addText(c.fx * TS + 16, c.fy * TS, '-' + d, '#fa8', 13);
  if (c.a.hp <= 0) { c.a.hp = 0; c.a.down = 1; log(ALLIES[c.id].n + ' ha caído. Llévalo al Templo para revivirlo.', '#f88'); snd('die'); }
}
function drawComp(c) {
  const sx = c.fx * TS - camX, sy = c.fy * TS - camY;
  if (c.kind === 'pet') {
    const D = PETS[c.id], b = Math.abs(Math.sin(time * 10)) * (c.mt > 0 ? 3 : 1), evo = petData(c.id).lvl >= 10;
    cx.fillStyle = '#9cf'; cx.font = '9px sans-serif'; cx.textAlign = 'center'; cx.fillText(petName(c.id), sx + 16, sy + 2);
    cx.save(); if (evo) { cx.translate(sx + 16, sy + 28); cx.scale(1.35, 1.35); cx.translate(-sx - 16, -sy - 28); cx.fillStyle = 'rgba(255,220,100,.25)'; cx.beginPath(); cx.arc(sx + 16, sy + 18, 12, 0, 7); cx.fill(); }
    cx.fillStyle = 'rgba(0,0,0,.3)'; cx.beginPath(); cx.ellipse(sx + 16, sy + 28, 8, 3, 0, 0, 7); cx.fill();
    cx.fillStyle = evo ? EVO[c.id].col : D.col;
    if (c.id === 'halcon') { const fy = sy + 4 + Math.sin(time * 4) * 3; cx.beginPath(); cx.ellipse(sx + 16, fy + 10, 5, 4, 0, 0, 7); cx.fill(); const wg = Math.sin(time * 14) * 6; cx.beginPath(); cx.moveTo(sx + 16, fy + 9); cx.lineTo(sx + 4, fy + 6 + wg); cx.lineTo(sx + 28, fy + 6 + wg); cx.fill(); cx.fillStyle = '#fc0'; cx.fillRect(sx + 19, fy + 8, 3, 2); }
    else if (c.id === 'slime') { cx.globalAlpha = .85; cx.beginPath(); cx.ellipse(sx + 16, sy + 22 - b / 2, 9 + b / 2, 7 - b / 3, 0, 0, 7); cx.fill(); cx.globalAlpha = 1; cx.fillStyle = '#000'; cx.fillRect(sx + 12, sy + 19, 2, 2); cx.fillRect(sx + 18, sy + 19, 2, 2); }
    else { cx.fillRect(sx + 8, sy + 16 - b, 16, 9); cx.fillRect(sx + (P.x >= c.x ? 20 : 4), sy + 11 - b, 8, 8); cx.fillRect(sx + 9, sy + 24 - b, 3, 5); cx.fillRect(sx + 20, sy + 24 - b, 3, 5); cx.fillStyle = '#000'; cx.fillRect(sx + (P.x >= c.x ? 25 : 6), sy + 13 - b, 2, 2); if (c.id === 'gato') { cx.fillStyle = evo ? EVO[c.id].col : D.col; cx.fillRect(sx + (P.x >= c.x ? 20 : 4), sy + 8 - b, 2, 3); cx.fillRect(sx + (P.x >= c.x ? 26 : 10), sy + 8 - b, 2, 3); } }
    if (evo && c.id === 'perro') { cx.fillStyle = '#622'; cx.fillRect(sx + (P.x >= c.x ? 14 : 10), sy + 8 - b, 7, 7); }
    cx.restore(); return;
  }
  const D = ALLIES[c.id];
  if (c.a.down) { cx.globalAlpha = .5; cx.save(); cx.translate(sx + 16, sy + 20); cx.rotate(Math.PI / 2); cx.translate(-16, -16); drawChar(0, 0, '#777', [0, 1], {}); cx.restore(); cx.globalAlpha = 1; return; }
  drawChar(sx, sy, D.col, [Math.sign(P.x - c.x) || 0, 1], { flash: c.flash > 0, moving: c.mt > 0, hair: D.healer ? '#eb5' : '#321', weapon: D.range === 1 ? '#bbb' : null, bow: D.range === 5, swing: c.swing, helm: D.taunt ? '#888' : null, cape: D.magic ? '#324' : D.healer ? '#eef' : null });
  c.swing = Math.max(0, (c.swing || 0) - .016);
  cx.fillStyle = '#9cf'; cx.font = '10px sans-serif'; cx.textAlign = 'center'; cx.fillText(D.n, sx + 16, sy - 8);
  cx.fillStyle = '#000'; cx.fillRect(sx + 4, sy - 5, 24, 3); cx.fillStyle = '#4c4'; cx.fillRect(sx + 4, sy - 5, 24 * c.a.hp / allyMaxHp(c.id), 3);
}

// ---------- Hechizos con palabras (estilo Tibia) ----------
const SPELLS = {
  'exura': { n: 'Curación ligera', lvl: 1, mp: 20, f: () => spellHeal(30 + stat('int') * 3) },
  'exura gran': { n: 'Curación intensa', lvl: 8, mp: 50, f: () => spellHeal(80 + stat('int') * 6) },
  'exura vita': { n: 'Curación definitiva', lvl: 20, mp: 120, f: () => spellHeal(200 + stat('int') * 10) },
  'exori': { n: 'Berserk', lvl: 5, mp: 25, f: () => spellArea(1, atk() * 1.5, '#fd8') },
  'exori gran': { n: 'Berserk feroz', lvl: 15, mp: 60, f: () => spellArea(1, atk() * 3, '#fa4') },
  'exevo flam hur': { n: 'Ola de fuego', lvl: 10, mp: 40, f: () => spellWave(20 + stat('int') * 4) },
  'exevo gran mas vis': { n: 'Furia de los cielos', lvl: 20, mp: 160, f: () => spellArea(6, 60 + stat('int') * 8, '#aef', true) },
  'utani hur': { n: 'Prisa', lvl: 3, mp: 30, f: () => { P.buffs.prisa = 30; } },
  'utamo vita': { n: 'Escudo mágico', lvl: 12, mp: 50, f: () => { P.buffs.escudo = 60; } },
  'utevo lux': { n: 'Luz', lvl: 1, mp: 15, f: () => { P.buffs.luz = 120; } },
  'exevo pan': { n: 'Crear comida', lvl: 4, mp: 40, f: () => { P.cons.pan++; } },
  'adori gran': { n: 'Runa: Gran bola de fuego', lvl: 8, mp: 60, rune: 'gfb' },
  'adori vita vis': { n: 'Runa: Muerte súbita', lvl: 15, mp: 120, rune: 'sd' },
  'adura vita': { n: 'Runa: Curación definitiva', lvl: 10, mp: 80, rune: 'uh' },
};
function spellHeal(h) { h = Math.round(h); P.hp = Math.min(maxHp(), P.hp + h); addText(P.fx * TS + 16, P.fy * TS + 4, '+' + h, '#5f5', 17); ring(P.fx * TS + 16, P.fy * TS + 16, '#5f5'); snd('heal'); }
function spellArea(r, dmg, col, sky) {
  const hit = ents.filter(e => Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= r && (r <= 1 || los(P.x, P.y, e.x, e.y)));
  hit.forEach(e => { damageEnemy(e, dmg, col); if (sky) for (let i = 0; i < 6; i++) parts.push({ x: e.fx * TS + 16 + rnd(-4, 4), y: e.fy * TS - i * 14, vx: 0, vy: 200, l: .3, col: '#fff', sz: 3 }); });
  ring(P.fx * TS + 16, P.fy * TS + 16, col); if (r > 1) { ring(P.fx * TS + 16, P.fy * TS + 16, '#fff'); weather.flash = Math.max(weather.flash || 0, .15); shake = 14; snd('boss'); } else { shake = 6; snd('hit'); }
  return hit.length;
}
function spellWave(dmg) {
  const [dx, dy] = P.dir; let n = 0;
  for (let d = 1; d <= 4; d++) for (let w = -(d > 1 ? 1 : 0); w <= (d > 1 ? 1 : 0); w++) {
    const x = P.x + dx * d + (dy ? w : 0), y = P.y + dy * d + (dx ? w : 0); if (SOLID.has(gt(W, x, y))) continue;
    burst(x * TS + 16, y * TS + 16, '#f80', 6); const e = ents.find(e => e.x === x && e.y === y); if (e) { damageEnemy(e, dmg, '#f93'); n++; }
  }
  snd('fire'); return n;
}
function castSpell(txt) {
  const w = (txt || '').toLowerCase().trim().replace(/\s+/g, ' '); if (!w) return 'empty';
  const S = SPELLS[w];
  if (!S) { P.say = { t: txt.slice(0, 60), l: 4 }; return 'say'; }
  if (P.lvl < S.lvl) { log('Necesitas nivel ' + S.lvl + ' para «' + w + '».', '#f88'); return 'lvl'; }
  if ((P.cds.spell || 0) > 0) return 'cd';
  if (P.mp < S.mp) { log('Maná insuficiente para «' + w + '» (' + S.mp + ').', '#88f'); return 'mp'; }
  if (S.rune && !(P.runes.blank > 0)) { log('Necesitas una runa en blanco (fabrícala en la Mesa de alquimia).', '#f88'); return 'blank'; }
  P.mp -= S.mp; P.cds.spell = 1;
  if (S.rune) { P.runes.blank--; P.runes[S.rune] = (P.runes[S.rune] || 0) + 1; texts.push({ x: P.fx * TS + 16, y: P.fy * TS - 14, t: w, col: '#fe7', sz: 14, l: 1.6 }); log('✨ Creaste una runa: ' + RUNES[S.rune].n + ' (' + RUNES[S.rune].key + ' para usar).', '#c9f'); snd('heal'); return 'rune'; }
  texts.push({ x: P.fx * TS + 16, y: P.fy * TS - 14, t: w, col: '#fe7', sz: 14, l: 1.6 });
  S.f(); return 'cast';
}
const RUNES = {
  gfb: { n: 'Gran bola de fuego', key: 'R', w: 'adori gran' },
  sd: { n: 'Muerte súbita', key: 'T', w: 'adori vita vis' },
  uh: { n: 'Curación definitiva', key: 'Y', w: 'adura vita' },
};
function runeTarget(r = 7) { const ok = e => ents.includes(e) && Math.max(Math.abs(e.x - P.x), Math.abs(e.y - P.y)) <= r && los(P.x, P.y, e.x, e.y); if (P.target && ok(P.target)) return P.target; return ents.filter(ok).sort((a, b) => Math.abs(a.x - P.x) + Math.abs(a.y - P.y) - Math.abs(b.x - P.x) - Math.abs(b.y - P.y))[0]; }
function useRune(id) {
  if (!(P.runes[id] > 0)) { log('No tienes runas de ' + RUNES[id].n + '.', '#f88'); return 'none'; }
  if ((P.cds.rune || 0) > 0) return 'cd';
  if (id === 'uh') { P.runes.uh--; P.cds.rune = 1; spellHeal(150 + stat('int') * 8 + P.lvl * 4); texts.push({ x: P.fx * TS + 16, y: P.fy * TS - 14, t: RUNES[id].w, col: '#fe7', sz: 13, l: 1.4 }); return 'used'; }
  const t = runeTarget(); if (!t) { log('No hay objetivo a la vista.', '#aaa'); return 'notarget'; }
  P.runes[id]--; P.cds.rune = 1; texts.push({ x: P.fx * TS + 16, y: P.fy * TS - 14, t: RUNES[id].w, col: '#fe7', sz: 13, l: 1.4 });
  if (id === 'gfb') { const tx = t.x, ty = t.y; ents.filter(e => Math.max(Math.abs(e.x - tx), Math.abs(e.y - ty)) <= 1).forEach(e => damageEnemy(e, 30 + stat('int') * 4 + P.lvl * 2, '#f93')); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) burst((tx + dx) * TS + 16, (ty + dy) * TS + 16, '#f60', 8); snd('fire'); shake = 8; }
  if (id === 'sd') { damageEnemy(t, 60 + stat('int') * 8 + P.lvl * 3, '#c4f'); for (let i = 0; i < 20; i++) parts.push({ x: t.fx * TS + 16, y: t.fy * TS + 16, vx: rnd(-80, 80), vy: rnd(-80, 80), l: .6, col: pick(['#000', '#a4f', '#fff']), sz: 3 }); snd('die'); shake = 6; }
  return 'used';
}
function openChat() { const c = document.getElementById('chat'); c.style.display = 'block'; c.value = ''; c.focus(); }

// ---------- Mejora de equipo (forja de Welf) ----------
function buyProt() { const c = 400 + (P.protBought || 0) * 0; if (P.gold < c) { log('Un pergamino de protección cuesta 400 oro.', '#f88'); return false; } P.gold -= c; P.prot = (P.prot || 0) + 1; P.protBought = (P.protBought || 0) + 1; snd('coin'); log('📜 Compraste un Pergamino de protección (' + P.prot + ').', '#9cf'); return true; }
const ENCH_CH = [100, 95, 88, 80, 70, 60, 50, 40, 30, 20];
function enchantCost(it) { const p = it.plus || 0; return { oro: Math.round(40 * (p + 1) * (p + 1) * (1 + it.rar * .5)), hierro: (p + 1) * 2, cristal: p >= 4 ? p - 3 : 0 }; }
function enchantChance(it) { return Math.min(100, ENCH_CH[it.plus || 0] + (hearts('welf') >= 6 ? 5 : 0) + (P.enchProt ? 0 : 0)); }
function enchant(uid, roll, prot) {
  if (prot == null) prot = P.useProt;
  const it = P.inv.find(i => i.uid === uid) || Object.values(P.eq).find(i => i && i.uid === uid); if (!it) return 'noitem';
  const p = it.plus || 0; if (p >= 10) return 'max';
  if (!isOpen('smith')) return 'closed';
  const c = enchantCost(it); if (P.gold < c.oro || P.mats.hierro < c.hierro || P.mats.cristal < c.cristal) { log('Te faltan materiales para mejorar.', '#f88'); return 'cost'; }
  P.gold -= c.oro; P.mats.hierro -= c.hierro; P.mats.cristal -= c.cristal;
  roll = roll == null ? Math.random() * 100 : roll; snd('build'); shake = 4;
  if (roll < enchantChance(it)) { it.plus = p + 1; log('✨ ¡Éxito! ' + it.name + ' ahora es +' + it.plus + '.', '#fd4'); snd('lvl'); P.enchants = (P.enchants || 0) + 1; return 'ok'; }
  if (p < 4) { log('💥 La mejora falló, pero el objeto está intacto (+' + p + ').', '#f88'); return 'fail'; }
  if (prot && (P.prot || 0) > 0) { P.prot--; log('📜 ¡El pergamino de protección se consumió y salvó tu ' + it.name + ' (+' + p + ')!', '#9cf'); snd('heal'); return 'protected'; }
  if (p >= 7 && roll >= 100 - 25) {
    P.inv = P.inv.filter(i => i !== it); for (const s in P.eq) if (P.eq[s] === it) P.eq[s] = null;
    log('💀 ¡El objeto se destruyó en la forja! (' + it.name + ')', '#f44'); snd('die'); shake = 12; return 'destroyed';
  }
  it.plus = p - 1; log('💥 La mejora falló: ' + it.name + ' baja a +' + it.plus + '.', '#f88'); snd('hurt'); return 'down';
}

// ---------- Niebla de guerra ----------
function reveal(r) {
  if (W === town) return; if (!W.seen || W.seen.length !== W.w * W.h) { W.seen = new Uint8Array(W.w * W.h); if (W === field && P.fieldSeen) try { const b = atob(P.fieldSeen); for (let i = 0; i < b.length && i < W.seen.length; i++) W.seen[i] = b.charCodeAt(i) & 1; } catch (e) { } }
  r = r || (W.dark ? 6 : 9); let n = 0;
  for (let y = Math.max(0, P.y - r); y <= Math.min(W.h - 1, P.y + r); y++) for (let x = Math.max(0, P.x - r); x <= Math.min(W.w - 1, P.x + r); x++) if ((x - P.x) ** 2 + (y - P.y) ** 2 <= r * r && !W.seen[y * W.w + x]) { W.seen[y * W.w + x] = 1; n++; }
  if (n) W._fogv = (W._fogv || 0) + 1; return n;
}
const explored = () => !W.seen ? 1 : W.seen.reduce((a, b) => a + b, 0) / W.seen.length;
function packFog() { if (!field || !field.seen) return P.fieldSeen || ''; let s = ''; for (let i = 0; i < field.seen.length; i++) s += String.fromCharCode(field.seen[i]); return btoa(s); }

// ---------- Eventos del calabozo ----------
function stepEvents() {
  if (!W.traps) return;
  const k = P.x + ',' + P.y;
  if (W.traps.has(k)) {
    W.traps.delete(k); W.seenTraps.add(k); P.trapsHit = (P.trapsHit || 0) + 1;
    if (Math.random() < Math.min(.5, stat('agi') * .01)) { log('🦶 ¡Esquivaste una trampa de pinchos!', '#9f9'); }
    else if (Math.random() < .25) { log('🔔 ¡Una trampa de alarma! Aparecen monstruos.', '#f84'); for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2]]) if (!solidAt(P.x + ox, P.y + oy)) { const e = spawnEnemy(pick(EN.slice(0, 5)), P.x + ox, P.y + oy, W.floor, false); e.aggro = true; } }
    else { const d = Math.round(maxHp() * .12); P.hp -= d; P.flash = .3; shake = 8; addText(P.fx * TS + 16, P.fy * TS, '-' + d, '#f55', 16); burst(P.x * TS + 16, P.y * TS + 24, '#aaa', 12); log('🗡 ¡Trampa de pinchos! -' + d + ' PV', '#f88'); snd('hurt'); if (P.hp <= 0) die('una trampa'); }
    return;
  }
  // detectar trampas cercanas con agilidad
  for (const t of W.traps) { const [x, y] = t.split(',').map(Number); if (Math.abs(x - P.x) + Math.abs(y - P.y) <= 1 && !W.seenTraps.has(t) && Math.random() < stat('agi') * .02) { W.seenTraps.add(t); addText(x * TS + 16, y * TS, '¡Trampa!', '#fa4'); } }
  const H = W.house;
  if (H && H.state === 0 && P.x >= H.r.x && P.x < H.r.x + H.r.w && P.y >= H.r.y && P.y < H.r.y + H.r.h) {
    H.state = 1; H.ids = []; const n = 6 + Math.floor(W.floor / 2); log('👹 ¡CASA DE MONSTRUOS! ¡Sobrevive!', '#f44'); snd('boss'); shake = 14;
    for (let i = 0; i < n * 3 && H.ids.length < n; i++) { const x = ri(H.r.x, H.r.x + H.r.w - 1), y = ri(H.r.y, H.r.y + H.r.h - 1); if (solidAt(x, y) || Math.abs(x - P.x) + Math.abs(y - P.y) < 2) continue; const e = spawnEnemy(pick(EN.slice(0, Math.min(EN.length, 3 + Math.floor(W.floor / 2)))), x, y, W.floor, false); e.aggro = true; e.house = 1; H.ids.push(e); }
  }
}
function updateTraps(dt) {
  if (!W.arrowTraps || P.dead) return;
  for (const a of W.arrowTraps) {
    a.cd -= dt; if (a.cd > 0) continue;
    const along = a.dy ? P.x === a.x && P.y > a.y && P.y - a.y <= 8 : P.y === a.y && Math.abs(P.x - a.x) <= 8;
    if (!along) continue; a.cd = a.rate; a.fired = (a.fired || 0) + 1;
    projs.push({ x: a.x * TS + 16, y: a.y * TS + 28, vx: a.dx * 300, vy: a.dy * 300, dmg: 6 + W.floor * 2, life: 1.5, hostile: 1, kind: 'arrow', src: 'trampa de flechas' }); snd('step');
  }
  for (const w of W.saws) {
    w.fx += w.dir * w.spd * dt; if (w.fx >= w.x1) { w.fx = w.x1; w.dir = -1; } if (w.fx <= w.x0) { w.fx = w.x0; w.dir = 1; }
    w.hcd -= dt;
    if (w.hcd <= 0 && P.y === w.y && Math.abs(w.fx - P.fx) < .6) { w.hcd = 1; const d = Math.round(maxHp() * .08 + W.floor); P.hp -= d; P.flash = .3; shake = 6; P.sawHits = (P.sawHits || 0) + 1; addText(P.fx * TS + 16, P.fy * TS, '-' + d, '#f55', 16); burst(P.fx * TS + 16, P.fy * TS + 20, '#ccc', 10); snd('hurt'); log('⚙ ¡Una sierra móvil te corta! -' + d, '#f88'); if (P.hp <= 0) die('una sierra'); }
  }
}
function drawTraps() {
  if (!W.arrowTraps) return;
  for (const a of W.arrowTraps) { const sx = a.x * TS - camX, sy = a.y * TS - camY; if (sx < -TS || sy < -TS || sx > cv.width || sy > cv.height) continue; cx.fillStyle = '#222'; cx.fillRect(sx + 10, sy + 22, 12, 8); cx.fillStyle = a.cd < .4 ? '#f44' : '#a86'; cx.fillRect(sx + 14, sy + 26, 4, 4); }
  for (const w of W.saws) { const sx = w.fx * TS - camX + 16, sy = w.y * TS - camY + 16; cx.fillStyle = '#0004'; cx.fillRect(w.x0 * TS - camX + 4, w.y * TS - camY + 14, (w.x1 - w.x0) * TS + 24, 4); cx.save(); cx.translate(sx, sy); cx.rotate(time * 12); cx.fillStyle = '#bbb'; cx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 9 : 13, an = i / 16 * 6.283; cx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } cx.fill(); cx.fillStyle = '#555'; cx.beginPath(); cx.arc(0, 0, 3, 0, 7); cx.fill(); cx.restore(); }
}
function checkHouse() {
  const H = W.house; if (!H || H.state !== 1) return;
  if (H.ids.every(e => !ents.includes(e))) {
    H.state = 2; P.houses = (P.houses || 0) + 1; log('🏆 ¡Limpiaste la casa de monstruos! Gran recompensa.', '#fd4'); snd('lvl');
    const x = H.r.cx, y = H.r.cy; drops.push({ x, y, gold: 50 + W.floor * 25 }, { x, y, item: genItem(null, W.floor + 2, ri(2, 4)) }, { x, y, mat: 'cristal', n: ri(1, 3) }); gainXp(30 * W.floor);
  }
}
function openChest(x, y) {
  const c = (W.chests || {})[x + ',' + y]; st(W, x, y, T.FLOOR);
  if (c && c.mimic) { const e = spawnEnemy({ n: 'Mímico', col: '#b8860b', sh: 'golem', hp: 70, atk: 12, spd: .5 }, x, y, W.floor + 2, false); e.aggro = true; e.mhp = e.hp = e.mhp * 2; e.xp *= 3; log('😱 ¡Era un MÍMICO!', '#f44'); snd('boss'); shake = 10; return 'mimic'; }
  drops.push({ x: P.x, y: P.y, gold: 40 + W.floor * 20 }, { x: P.x, y: P.y, item: genItem(null, W.floor + 1, ri(1, 3)) }); if (Math.random() < .5) drops.push({ x: P.x, y: P.y, cons: 'pocion_vida' });
  pickup(); P.chestsOpened = (P.chestsOpened || 0) + 1; log('💰 ¡Abriste un cofre del tesoro!', '#fd4'); snd('lvl'); burst(x * TS + 16, y * TS + 16, '#fd4', 25); return 'loot';
}

// ---------- Historia con decisiones ----------
const STORY = {
  inicio: { n: 'Capítulo 1: El llamado', d: 'Llega al piso 2 del calabozo.', t: 'floor', c: 2,
    q: '«Dos Familias se fijan en ti tras tu primer descenso.» ¿A quién juras lealtad?',
    ch: [{ t: '❤ Quedarme con la Familia Hestia (+10% XP, amistad con Hestia)', path: 'hestia', fx: () => { P.perks.xp = .1; addFriend('hestia', 20); }, next: 'hestia1' },
      { t: '🐺 Aliarme con la Familia Loki (+10% daño, 500 oro)', path: 'loki', fx: () => { P.perks.dmg = .1; P.gold += 500; }, next: 'loki1' }] },
  hestia1: { n: 'Capítulo 2: La pequeña ladrona', d: 'Derrota 15 monstruos en las Llanuras.', t: 'fieldkill', c: 15,
    q: 'Atrapas a Lili, una supporter que robó el cuchillo de Hestia. Llora y te pide perdón.',
    ch: [{ t: '🤝 Perdonarla y ofrecerle un lugar (Lili se une como aliada gratis)', fx: () => { P.storyUnlock.lili = 1; if (P.party.length < MAX_PARTY) { P.party.push({ id: 'lili', hp: allyMaxHp('lili'), down: 0 }); buildComps(); } }, next: 'final' },
      { t: '⚖ Entregarla al Gremio (1000 oro y +20 amistad con Eina)', fx: () => { P.gold += 1000; addFriend('eina', 20); }, next: 'final' }] },
  loki1: { n: 'Capítulo 2: La expedición de Loki', d: 'Llega al piso 8 con la expedición.', t: 'floor', c: 8,
    q: 'La expedición encuentra un arma legendaria. Loki dice que puedes quedártela… si te arriesgas a su ira.',
    ch: [{ t: '🎁 Ofrecerla a Loki (título «Favorito de Loki», 30 fichas)', fx: () => { P.tokens = (P.tokens || 0) + 30; P.storyTitle = 'Favorito de Loki'; }, next: 'final' },
      { t: '⚔ Quedármela (arma legendaria, Loki te mira con recelo)', fx: () => { P.inv.push(genItem('arma', Math.max(P.lvl, 8) + 3, 4)); P.lokiRival = 1; }, next: 'final' }] },
  final: { n: 'Capítulo 3: El Minotauro', d: 'Derrota al jefe del piso 10.', t: 'boss10', c: 1,
    q: 'El Minotauro cae. Toda Orario habla de ti. ¿Qué harás ahora?',
    ch: [{ t: '🌟 Aceptar la fama (título «Leyenda de Orario», 2000 oro)', fx: () => { P.gold += 2000; P.storyTitle = 'Leyenda de Orario'; }, next: 'xenos' },
      { t: '🏠 Volver a casa con tu Familia (+5 puntos de habilidad)', fx: () => { P.kp += 5; P.storyTitle = 'Corazón de la Familia'; }, next: 'xenos' }] },
  xenos: { n: 'Capítulo 4: La Xenos', d: 'Llega al piso 15.', t: 'floor', c: 15,
    q: 'En el piso 15 encuentras a Wiene, una monstruo que habla y te pide ayuda. Los cazadores de Ikelos la persiguen.',
    ch: [{ t: '🐉 Protegerla (Wiene se une como aliada; los cazadores te odian)', fx: () => { P.storyUnlock.wiene = 1; P.hunters = 1; if (P.party.length < MAX_PARTY) { P.party.push({ id: 'wiene', hp: allyMaxHp('wiene'), down: 0 }); buildComps(); } }, next: 'traicion' },
      { t: '💰 Entregarla a los cazadores (3000 oro y equipo épico)', fx: () => { P.gold += 3000; P.inv.push(genItem(null, Math.max(P.lvl, 15) + 2, 3)); P.wieneSold = 1; }, next: 'traicion' }] },
  traicion: { n: 'Capítulo 5: La traición', d: 'Derrota al jefe del piso 20.', t: 'boss20', c: 1,
    q: () => P.wieneSold ? 'El jefe era una trampa de Ikelos: te usaron. Su líder Dix está herido frente a ti.' : 'Dix, líder de los cazadores, cae junto al jefe. Wiene mira con miedo.',
    ch: [{ t: '⚔ Acabar con Dix (+15% daño permanente)', fx: () => { P.perks.dmg = (P.perks.dmg || 0) + .15; }, next: 'dragon' },
      { t: '⛓ Entregarlo al Gremio (+20% XP, Eina +30)', fx: () => { P.perks.xp = (P.perks.xp || 0) + .2; addFriend('eina', 30); }, next: 'dragon' }] },
  dragon: { n: 'Capítulo 6: El Dragón Negro', d: 'Derrota al jefe del piso 30.', t: 'boss30', c: 1,
    q: 'El Dragón Negro, la gran amenaza bajo Orario, ha caído. Los dioses te ofrecen una recompensa.',
    ch: [{ t: '👑 Convertirte en el Héroe de Orario (título, 10 puntos de habilidad)', fx: () => { P.kp += 10; P.storyTitle = 'Héroe de Orario'; }, next: 'fin' },
      { t: '🗝 Reclamar el tesoro del dragón (arma y armadura legendarias, título «Matadragones»)', fx: () => { P.inv.push(genItem('arma', Math.max(P.lvl, 30) + 3, 4), genItem('armadura', Math.max(P.lvl, 30) + 3, 4)); P.storyTitle = 'Matadragones'; }, next: 'fin' }] },
  fin: { n: 'Epílogo', d: '¡Historia completada! Sigue explorando la Torre.', t: 'none', c: 1 },
};
function storyNode() { return STORY[P.story.node]; }
function storyEvent(type, n) {
  const S = storyNode(); if (!S || S.t !== type || P.story.ready) return;
  P.story.p = type === 'floor' ? Math.max(P.story.p, n) : P.story.p + n;
  if (P.story.p >= S.c) { P.story.ready = 1; log('📖 ¡Avanza la historia! «' + S.n + '» — abre J para decidir.', '#c9f'); snd('lvl'); }
}
function storyChoose(i) {
  const S = storyNode(); if (!S || !P.story.ready || !S.ch || !S.ch[i]) return false;
  const c = S.ch[i]; c.fx(); if (c.path) P.story.path = c.path; P.story.choices.push(P.story.node + ':' + i); P.story.node = c.next; P.story.p = 0; P.story.ready = 0;
  log('📖 Decisión tomada: ' + c.t, '#c9f'); snd('lvl');
  const N = storyNode(); if (N && N.t === 'floor') storyEvent('floor', P.maxFloor);
  return true;
}

// ---------- Partículas ----------
function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(30, 160); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: rnd(.3, .7), col, sz: rnd(2, 4) }); } }
function ring(x, y, col) { parts.push({ ring: 1, x, y, l: .5, col, r: 4 }); }
function addText(x, y, t, col, sz = 15) { texts.push({ x: x + rnd(-6, 6), y, t, col, sz, l: 1 }); }

// ---------- Update ----------
function update(dt) {
  time += dt;
  if (fishing) { updateFishing(dt); if (fishing && (P.mt > 0 || ents.some(e => Math.abs(e.x - P.x) + Math.abs(e.y - P.y) <= 1 && e.aggro))) { } }
  for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dt);
  P.atkCd = Math.max(0, P.atkCd - dt); P.gcd = Math.max(0, (P.gcd || 0) - dt); P.flash = Math.max(0, P.flash - dt); P.swing = Math.max(0, (P.swing || 0) - dt);
  // regen
  const homeBonus = W === town ? 1 + comfort() * .1 : 1;
  P.hp = Math.min(maxHp(), P.hp + dt * (.5 + stat('vit') * .1) * homeBonus * (W === town ? 3 : 1));
  P.mp = Math.min(maxMp(), P.mp + dt * (.4 + stat('int') * .08 + P.sk.arcano * .3) * homeBonus);
  // movimiento
  if (P.mt > 0) { P.mt -= dt; const k = Math.max(0, P.mt / moveTime()); P.fx = P.x - P.mdx * k; P.fy = P.y - P.mdy * k; if (P.mt <= 0) { P.fx = P.x; P.fy = P.y; } }
  if (P.mt <= 0 && !panel && !fishing) {
    let dx = 0, dy = 0;
    if (keys.w || keys.arrowup) dy = -1; else if (keys.s || keys.arrowdown) dy = 1; else if (keys.a || keys.arrowleft) dx = -1; else if (keys.d || keys.arrowright) dx = 1;
    if (touchDir) [dx, dy] = touchDir;
    if (padDir) [dx, dy] = padDir;
    if (dx || dy) {
      P.dir = [dx, dy];
      const sw = comps.find(c => c.x === P.x + dx && c.y === P.y + dy); if (sw) { sw.x = P.x; sw.y = P.y; sw.fx = sw.x; sw.fy = sw.y; }
      if (!solidAt(P.x + dx, P.y + dy)) { P.trail.push([P.x, P.y]); if (P.trail.length > 6) P.trail.shift(); P.x += dx; P.y += dy; P.mdx = dx; P.mdy = dy; P.mt = moveTime(); if (Math.random() < .3) snd('step'); pickup(); checkExit(); stepEvents(); reveal(); }
    }
  }
  // auto ataque si hay enemigo adyacente
  if (!buildMode && !fishing) playerAttack(false);
  // enemigos
  for (const e of [...ents]) {
    if (!ents.includes(e)) continue;
    e.flash = Math.max(0, e.flash - dt); e.cd -= dt; e.mcd -= dt;
    if (e.mt > 0) { e.mt -= dt; const k = Math.max(0, e.mt / e.spd); e.fx = e.x - e.dx * k; e.fy = e.y - e.dy * k; } else { e.fx = e.x; e.fy = e.y; }
    const dx = P.x - e.x, dy = P.y - e.y, dist = Math.abs(dx) + Math.abs(dy), cheb = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist < (e.aggroR || 7) + (e.boss ? 4 : 0)) e.aggro = true; if (dist > 16) e.aggro = false;
    if (e.boss && e.aggro) bossAI(e, dt);
    const sight = e.ranged && e.aggro && dist <= 7 && los(e.x, e.y, P.x, P.y);
    if (sight && cheb > 1 && e.cd <= 0) { e.cd = e.ranged === 'magic' ? 2.4 : 1.8; enemyShoot(e, e.ranged); }
    else if (e.cd <= 0 && cheb > 1 && comps.some(c => c.kind === 'ally' && !c.a.down && Math.max(Math.abs(c.x - e.x), Math.abs(c.y - e.y)) <= 1)) { const c = comps.find(c => c.kind === 'ally' && !c.a.down && Math.max(Math.abs(c.x - e.x), Math.abs(c.y - e.y)) <= 1); e.cd = 1.4; e.lunge = .15; hurtAlly(c, e.atk, e.n); }
    else if (cheb <= 1 && e.cd <= 0 && comps.some(c => c.kind === 'ally' && !c.a.down && ALLIES[c.id].taunt && Math.max(Math.abs(c.x - e.x), Math.abs(c.y - e.y)) <= 1) && Math.random() < .5) { const c = comps.find(c => c.kind === 'ally' && !c.a.down && ALLIES[c.id].taunt && Math.max(Math.abs(c.x - e.x), Math.abs(c.y - e.y)) <= 1); e.cd = 1.4; hurtAlly(c, e.atk, e.n); }
    else if (cheb <= 1 && e.cd <= 0) { e.cd = e.boss ? (e.enraged ? .8 : 1.1) : 1.4; e.lunge = .15; hurtPlayer(e.atk, e.n); }
    else if (cheb > 1 && e.mcd <= 0 && !(sight && dist <= 4)) {
      e.mcd = (e.enraged ? e.spd * .7 : e.spd) + (e.aggro ? 0 : rnd(.5, 2));
      let step = null;
      if (e.aggro) step = astar(e, P.x, P.y);
      if (!step) step = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const [ox, oy] = step;
      if (!solidAt(e.x + ox, e.y + oy) && gt(W, e.x + ox, e.y + oy) !== T.UP) { e.x += ox; e.y += oy; e.dx = ox; e.dy = oy; e.mt = e.spd; }
    }
    e.lunge = Math.max(0, (e.lunge || 0) - dt);
  }
  // zonas de peligro (ataques del jefe)
  for (const w of warns) { w.t -= dt; if (w.t <= 0 && !w.done) { w.done = 1; burst(w.x * TS + 16, w.y * TS + 16, '#f62', 6); if (P.x === w.x && P.y === w.y) hurtPlayer(w.dmg, w.src); } }
  warns = warns.filter(w => w.t > -.25);
  // proyectiles
  for (const p of projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.kind !== 'arrow') parts.push({ x: p.x, y: p.y, vx: rnd(-20, 20), vy: rnd(-20, 20), l: .3, col: p.kind === 'magic' ? pick(['#a6f', '#c9f', '#64f']) : pick(['#f80', '#fd0', '#f40']), sz: 3 });
    const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
    if (p.hostile) {
      if (Math.hypot(P.fx * TS + 16 - p.x, P.fy * TS + 16 - p.y) < 14) { hurtPlayer(p.dmg, p.src); burst(p.x, p.y, p.kind === 'magic' ? '#a6f' : '#ca8', 10); p.life = 0; }
      else if (SOLID.has(gt(W, tx, ty))) p.life = 0;
      continue;
    }
    const e = ents.find(e => Math.hypot(e.fx * TS + 16 - p.x, e.fy * TS + 16 - p.y) < 18);
    if (e) { damageEnemy(e, p.dmg, '#f93'); burst(p.x, p.y, '#f80', 15); p.life = 0; }
    else if (SOLID.has(gt(W, tx, ty))) { burst(p.x, p.y, '#f80', 8); p.life = 0; }
  }
  projs = projs.filter(p => p.life > 0);
  for (const p of parts) { p.l -= dt; if (p.ring) p.r += dt * 120; else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; } }
  parts = parts.filter(p => p.l > 0); if (parts.length > 800) parts.splice(0, parts.length - 800);
  for (const t of texts) { t.y -= 30 * dt; t.l -= dt; } texts = texts.filter(t => t.l > 0);
  for (const m of msgs) m.a -= dt; msgs = msgs.filter(m => m.a > 0);
  shake = Math.max(0, shake - dt * 30);
  for (const b in P.buffs) { P.buffs[b] -= dt; if (P.buffs[b] <= 0) { delete P.buffs[b]; log('El efecto ' + BUFFN[b] + ' terminó.', '#aaa'); } }
  if (P.buffs.vigor > 0) P.hp = Math.min(maxHp(), P.hp + dt * (1 + stat('vit') * .2) * 2);
  updateComps(dt);
  updateArena(dt); checkHouse(); updateTraps(dt); updateNPCs(dt); updateMarket(dt);
  growCrops(dt); updateVisitors(dt); updateSeason(dt); updateField(dt);
  P.achT = (P.achT || 0) - dt; if (P.achT <= 0) { P.achT = 1; checkAch(); }
  // regeneración de recursos en ciudad
  if (town.regrow.length) town.regrow = town.regrow.filter(r => { if (time < r.at) return true; if (town.obj[r.x + ',' + r.y] || (P.x === r.x && P.y === r.y && W === town)) { r.at = time + 10; return true; } st(town, r.x, r.y, r.t); return false; });
  if ((time | 0) % 30 === 0 && ((time - dt) | 0) % 30 !== 0) save();
}
function pickup() {
  for (const d of drops.filter(d => d.x === P.x && d.y === P.y)) {
    if (d.gold) { P.gold += d.gold; addText(P.fx * TS + 16, P.fy * TS - 8, '+' + d.gold + ' oro', '#fd4'); }
    if (d.item) { if (P.inv.length >= 32) { log('Inventario lleno.', '#f88'); continue; } P.inv.push(d.item); log('Obtienes: ' + d.item.name + ' [' + RAR[d.item.rar] + ']', ['#ccc', '#5e5', '#5af', '#c7f', '#fb3'][d.item.rar]); }
    if (d.cons) { P.cons[d.cons]++; log('Obtienes ' + CONSUM[d.cons].n + '.', '#9f9'); }
    if (d.mat) { P.mats[d.mat] += d.n; questEvent('gather', d.mat, d.n); addText(P.fx * TS + 16, P.fy * TS - 8, '+' + d.n + ' ' + d.mat, '#8ef'); }
    d.taken = 1; snd('pick');
  }
  drops = drops.filter(d => !d.taken);
}

// ---------- Render ----------
// ---------- Caché de tiles (rendimiento) ----------
let CACHING = false; const CH = 16, ANIM = new Set([2, 14, 17]); const perf = { frames: 0, total: 0, max: 0, chunksBuilt: 0, last: 0 };
function chunkKey() { return (W.dark ? (W.theme || THEMES[0]).n : season().n); }
function getChunk(cxi, cyi) {
  const key = chunkKey(); if (W._ck !== key) { W._cc = {}; W._ck = key; }
  const id = cyi * 1000 + cxi; let c = W._cc[id]; if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = CH * TS; const old = cx; cx = c.getContext('2d'); CACHING = true;
  try { for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const tx = cxi * CH + x, ty = cyi * CH + y; if (tx >= W.w || ty >= W.h) continue; const t = gt(W, tx, ty); if (!ANIM.has(t)) drawTile(tx, ty, t, x * TS, y * TS); } }
  finally { cx = old; CACHING = false; }
  perf.chunksBuilt++; return (W._cc[id] = c);
}
function drawTile(x, y, t, sx, sy) {
  const h = hash(x, y), dark = W.dark;
  const th = W.theme || THEMES[0], SE = season(), ground = dark ? th.g[h < .5 ? 0 : 1] : SE.grass;
  if (t === T.DWALL) { cx.fillStyle = th.w; cx.fillRect(sx, sy, TS, TS); if (gt(W, x, y + 1) !== T.DWALL) { cx.fillStyle = th.wt; cx.fillRect(sx, sy + 18, TS, 14); if (W.torches && W.torches.has(x + ',' + y)) { cx.fillStyle = '#5a3a1a'; cx.fillRect(sx + 14, sy + 10, 4, 10); cx.fillStyle = `rgb(${th.torch})`; cx.beginPath(); cx.arc(sx + 16, sy + 8 + Math.sin(time * 11 + x) , 4 + Math.sin(time * 17 + y), 0, 7); cx.fill(); } cx.fillStyle = th.wl; for (let i = 0; i < 4; i++) cx.fillRect(sx + (i * 8 + (y % 2) * 4) % 32, sy + 18, 1, 14); cx.fillRect(sx, sy + 25, TS, 1); } return; }
  if (t === T.WATER) { cx.fillStyle = '#2a5aa8'; cx.fillRect(sx, sy, TS, TS); cx.fillStyle = '#5a8ae8'; const o = Math.sin(time * 2 + x + y) * 4; cx.fillRect(sx + 6 + o, sy + 10, 10, 2); cx.fillRect(sx + 16 - o, sy + 22, 8, 2); return; }
  cx.fillStyle = t === T.PATH ? (h < .5 ? '#a8946a' : '#a08c62') : t === T.SAND ? '#d8c890' : t === T.PLOT ? '#7a6a48' : t === T.WALL ? '#777' : ground;
  if (dark && t !== T.FLOOR && t !== T.UP && t !== T.DOWN) cx.fillStyle = ground;
  if (t === T.FLOOR) cx.fillStyle = ground;
  cx.fillRect(sx, sy, TS, TS);
  if (!dark && (t === T.GRASS || t === T.STUMP) && h < .4) { cx.fillStyle = SE.tuft; cx.fillRect(sx + h * 28, sy + (h * 997 % 1) * 26, 2, 5); cx.fillRect(sx + (h * 53 % 1) * 28, sy + (h * 31 % 1) * 26, 2, 4); if (h < .05) { cx.fillStyle = pick(['#fff', '#fe6', '#f8c']); cx.fillRect(sx + 14, sy + 14, 3, 3); } }
  if (dark && t === T.FLOOR && h < .15) { cx.fillStyle = '#2a2530'; cx.fillRect(sx + h * 180, sy + 8, 4, 3); }
  if (t === T.PLOT) { cx.strokeStyle = '#8f7a50'; cx.strokeRect(sx + .5, sy + .5, TS - 1, TS - 1); }
  if (t === T.WALL) { cx.fillStyle = '#666'; for (let i = 0; i < 3; i++) cx.fillRect(sx, sy + i * 11, TS, 1); cx.fillRect(sx + (y % 2) * 16, sy, 1, TS); }
  if (t === T.TREE) { cx.fillStyle = '#5a3a1a'; cx.fillRect(sx + 13, sy + 18, 6, 14); cx.fillStyle = h < .5 ? '#1f6a2a' : SE.tree; cx.beginPath(); cx.arc(sx + 16, sy + 13, 13, 0, 7); cx.fill(); cx.fillStyle = '#3a9a40'; cx.beginPath(); cx.arc(sx + 12, sy + 9, 5, 0, 7); cx.fill(); }
  if (t === T.TREE && SE.n === 'Invierno') { cx.fillStyle = '#eef'; cx.fillRect(sx + 6, sy + 2, 20, 4); }
  if (t === T.CHEST) { cx.fillStyle = th.g[0]; cx.fillRect(sx, sy, TS, TS); cx.fillStyle = '#8a5a1a'; cx.fillRect(sx + 4, sy + 10, 24, 18); cx.fillStyle = '#fd4'; cx.fillRect(sx + 4, sy + 16, 24, 3); cx.fillRect(sx + 14, sy + 14, 4, 6); cx.fillStyle = `rgba(255,220,100,${.3 + Math.sin(time * 4) * .2})`; cx.fillRect(sx + 2, sy + 6, 28, 2); }
  if (!CACHING && W.seenTraps && W.seenTraps.has(x + ',' + y)) { cx.fillStyle = '#888'; for (let i = 0; i < 4; i++) { cx.beginPath(); cx.moveTo(sx + 5 + i * 7, sy + 26); cx.lineTo(sx + 8 + i * 7, sy + 16); cx.lineTo(sx + 11 + i * 7, sy + 26); cx.fill(); } }
  if (t === T.EXIT) { cx.fillStyle = '#a8946a'; cx.fillRect(sx, sy, TS, TS); cx.fillStyle = '#6a4a2a'; cx.fillRect(sx + 14, sy + 10, 4, 20); cx.fillStyle = '#c9a060'; cx.fillRect(sx + 4, sy + 4, 24, 10); cx.fillStyle = '#000'; cx.font = '9px sans-serif'; cx.textAlign = 'center'; cx.fillText(W === town ? 'Llanuras' : 'Orario', sx + 16, sy + 12); }
  if (t === T.STUMP) { cx.fillStyle = '#6a4a2a'; cx.fillRect(sx + 11, sy + 18, 10, 8); cx.fillStyle = '#a08050'; cx.fillRect(sx + 12, sy + 17, 8, 3); }
  if (t === T.ROCK || t === T.ORE || t === T.CRYSTAL) {
    cx.fillStyle = t === T.CRYSTAL ? '#335' : '#7a7a80'; cx.beginPath(); cx.moveTo(sx + 4, sy + 28); cx.lineTo(sx + 8, sy + 8); cx.lineTo(sx + 20, sy + 4); cx.lineTo(sx + 29, sy + 14); cx.lineTo(sx + 28, sy + 28); cx.fill();
    cx.fillStyle = t === T.CRYSTAL ? '#335' : '#9a9aa0'; cx.fillRect(sx + 10, sy + 9, 8, 4);
    if (t === T.ORE) { cx.fillStyle = '#d97'; cx.fillRect(sx + 12, sy + 16, 4, 4); cx.fillRect(sx + 20, sy + 12, 3, 3); cx.fillRect(sx + 9, sy + 22, 3, 3); }
    if (t === T.CRYSTAL) { cx.fillStyle = `hsl(${190 + Math.sin(time * 3 + x) * 20},90%,65%)`; cx.beginPath(); cx.moveTo(sx + 16, sy + 2); cx.lineTo(sx + 22, sy + 16); cx.lineTo(sx + 16, sy + 28); cx.lineTo(sx + 10, sy + 16); cx.fill(); }
  }
  if (t === T.HERB) { cx.fillStyle = '#2d7a2d'; cx.beginPath(); cx.arc(sx + 16, sy + 20, 9, 0, 7); cx.fill(); cx.fillStyle = '#e44'; cx.fillRect(sx + 12, sy + 15, 3, 3); cx.fillRect(sx + 19, sy + 19, 3, 3); }
  if (t === T.DOWN || t === T.UP) {
    cx.fillStyle = '#222'; cx.fillRect(sx + 3, sy + 3, 26, 26);
    for (let i = 0; i < 4; i++) { cx.fillStyle = t === T.DOWN ? `rgb(${120 - i * 25},${110 - i * 25},${100 - i * 25})` : `rgb(${80 + i * 25},${80 + i * 25},${90 + i * 25})`; cx.fillRect(sx + 4, sy + 4 + i * 6, 24, 5); }
    cx.fillStyle = t === T.DOWN ? '#fc6' : '#9cf'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center'; cx.fillText(t === T.DOWN ? '▼' : '▲', sx + 16, sy + 4 + Math.sin(time * 4) * 2);
  }
}
function drawBlock(id, sx, sy) {
  const b = BLOCKS[id]; cx.fillStyle = b.col;
  switch (id) {
    case 'muro_madera': cx.fillRect(sx, sy, TS, TS); cx.fillStyle = '#6b4520'; for (let i = 0; i < 4; i++) cx.fillRect(sx, sy + i * 8, TS, 1); break;
    case 'muro_piedra': cx.fillRect(sx, sy, TS, TS); cx.fillStyle = '#666'; for (let i = 0; i < 4; i++) { cx.fillRect(sx, sy + i * 8, TS, 1); cx.fillRect(sx + (i % 2) * 12 + 6, sy + i * 8, 1, 8); } break;
    case 'suelo_madera': cx.fillRect(sx, sy, TS, TS); cx.fillStyle = '#8a5a2a'; for (let i = 0; i < 4; i++) cx.fillRect(sx + i * 8, sy, 1, TS); break;
    case 'alfombra': cx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2); cx.strokeStyle = '#fc4'; cx.strokeRect(sx + 4.5, sy + 4.5, TS - 9, TS - 9); break;
    case 'puerta': cx.fillRect(sx + 4, sy, 24, TS); cx.fillStyle = '#fc4'; cx.fillRect(sx + 22, sy + 16, 3, 3); break;
    case 'mesa': cx.fillRect(sx + 3, sy + 8, 26, 12); cx.fillStyle = '#6a4a20'; cx.fillRect(sx + 5, sy + 20, 3, 9); cx.fillRect(sx + 24, sy + 20, 3, 9); break;
    case 'silla': cx.fillRect(sx + 10, sy + 6, 12, 4); cx.fillRect(sx + 10, sy + 16, 12, 4); cx.fillRect(sx + 10, sy + 6, 3, 22); cx.fillRect(sx + 19, sy + 16, 3, 12); break;
    case 'cama': cx.fillStyle = '#6a4a20'; cx.fillRect(sx + 3, sy + 2, 26, 28); cx.fillStyle = '#eee'; cx.fillRect(sx + 6, sy + 4, 20, 7); cx.fillStyle = b.col; cx.fillRect(sx + 5, sy + 12, 22, 16); break;
    case 'cofre': cx.fillRect(sx + 4, sy + 10, 24, 18); cx.fillStyle = '#7a5a10'; cx.fillRect(sx + 4, sy + 16, 24, 2); cx.fillStyle = '#ddd'; cx.fillRect(sx + 14, sy + 15, 4, 5); break;
    case 'antorcha': cx.fillStyle = '#5a3a1a'; cx.fillRect(sx + 14, sy + 12, 4, 16); cx.fillStyle = `hsl(${30 + Math.sin(time * 15) * 10},100%,55%)`; cx.beginPath(); cx.arc(sx + 16, sy + 10 + Math.sin(time * 9), 5, 0, 7); cx.fill(); break;
    case 'maceta': cx.fillStyle = '#a55'; cx.fillRect(sx + 10, sy + 18, 12, 10); cx.fillStyle = '#3a3'; cx.beginPath(); cx.arc(sx + 16, sy + 14, 7, 0, 7); cx.fill(); cx.fillStyle = b.col; cx.fillRect(sx + 12, sy + 10, 3, 3); cx.fillRect(sx + 18, sy + 13, 3, 3); break;
    case 'estanteria': cx.fillRect(sx + 2, sy + 2, 28, 28); for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) { cx.fillStyle = ['#a33', '#36a', '#3a5', '#aa3'][(i + j) % 4]; cx.fillRect(sx + 4 + j * 5, sy + 4 + i * 9, 4, 7); } break;
    case 'estatua': cx.fillStyle = '#999'; cx.fillRect(sx + 6, sy + 24, 20, 6); cx.fillStyle = b.col; cx.fillRect(sx + 11, sy + 10, 10, 14); cx.beginPath(); cx.arc(sx + 16, sy + 7, 5, 0, 7); cx.fill(); cx.fillRect(sx + 22, sy + 2, 2, 18); break;
    case 'chimenea': cx.fillRect(sx + 2, sy + 4, 28, 26); cx.fillStyle = '#211'; cx.fillRect(sx + 8, sy + 14, 16, 16); cx.fillStyle = `hsl(${25 + Math.sin(time * 12) * 10},100%,55%)`; cx.beginPath(); cx.moveTo(sx + 10, sy + 30); cx.lineTo(sx + 16, sy + 16 + Math.sin(time * 10) * 2); cx.lineTo(sx + 22, sy + 30); cx.fill(); break;
    case 'sofa': cx.fillRect(sx + 2, sy + 8, 28, 20); cx.fillStyle = '#7a5aaa'; cx.fillRect(sx + 6, sy + 14, 20, 10); break;
    case 'armario': cx.fillRect(sx + 4, sy, 24, 30); cx.fillStyle = '#4a2a10'; cx.fillRect(sx + 15, sy + 2, 2, 26); cx.fillStyle = '#fc4'; cx.fillRect(sx + 12, sy + 14, 2, 3); cx.fillRect(sx + 18, sy + 14, 2, 3); break;
    case 'cuadro': cx.fillRect(sx + 4, sy + 4, 24, 20); cx.fillStyle = '#4ad'; cx.fillRect(sx + 7, sy + 7, 18, 14); cx.fillStyle = '#3a3'; cx.fillRect(sx + 7, sy + 15, 18, 6); cx.fillStyle = '#fe6'; cx.fillRect(sx + 19, sy + 9, 3, 3); break;
    case 'lampara': cx.fillStyle = '#888'; cx.fillRect(sx + 15, sy + 14, 2, 14); cx.fillRect(sx + 10, sy + 27, 12, 3); cx.fillStyle = b.col; cx.beginPath(); cx.arc(sx + 16, sy + 10, 7, 0, 7); cx.fill(); break;
    case 'barril': cx.beginPath(); cx.ellipse(sx + 16, sy + 17, 10, 13, 0, 0, 7); cx.fill(); cx.fillStyle = '#444'; cx.fillRect(sx + 6, sy + 10, 20, 2); cx.fillRect(sx + 6, sy + 22, 20, 2); break;
    case 'banera': cx.fillRect(sx + 2, sy + 6, 28, 20); cx.fillStyle = '#6af'; cx.fillRect(sx + 5, sy + 9, 22, 12); break;
    case 'piano': cx.fillRect(sx + 2, sy + 4, 28, 24); cx.fillStyle = '#fff'; cx.fillRect(sx + 4, sy + 18, 24, 6); cx.fillStyle = '#000'; for (let i = 0; i < 6; i++) cx.fillRect(sx + 6 + i * 4, sy + 18, 2, 4); break;
    case 'fuente': cx.fillStyle = '#999'; cx.beginPath(); cx.arc(sx + 16, sy + 18, 13, 0, 7); cx.fill(); cx.fillStyle = b.col; cx.beginPath(); cx.arc(sx + 16, sy + 18, 10, 0, 7); cx.fill(); cx.fillStyle = '#cef'; cx.fillRect(sx + 15, sy + 4 + Math.sin(time * 8) * 2, 2, 12); break;
    case 'armero': cx.fillStyle = '#5a3a1a'; cx.fillRect(sx + 3, sy + 24, 26, 4); cx.fillRect(sx + 3, sy + 6, 26, 3); cx.fillStyle = '#ccc'; for (let i = 0; i < 4; i++) cx.fillRect(sx + 6 + i * 6, sy + 2, 2, 24); break;
    case 'trofeo': cx.fillStyle = '#654'; cx.fillRect(sx + 8, sy + 22, 16, 8); cx.fillStyle = b.col; cx.fillRect(sx + 10, sy + 6, 12, 12); cx.fillRect(sx + 14, sy + 18, 4, 4); cx.fillRect(sx + 6, sy + 8, 4, 6); cx.fillRect(sx + 22, sy + 8, 4, 6); break;
    case 'cultivo': cx.fillStyle = '#5a3a20'; cx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2); cx.fillStyle = '#4a2a14'; for (let i = 0; i < 4; i++) cx.fillRect(sx + 2, sy + 4 + i * 7, TS - 4, 2); break;
    case 'forja': cx.fillRect(sx + 2, sy + 4, 28, 26); cx.fillStyle = '#311'; cx.fillRect(sx + 7, sy + 12, 18, 12); cx.fillStyle = `hsl(${20 + Math.sin(time * 9) * 10},100%,50%)`; cx.fillRect(sx + 9, sy + 16 + Math.sin(time * 7), 14, 8); break;
    case 'cocina': cx.fillRect(sx + 2, sy + 6, 28, 24); cx.fillStyle = '#333'; cx.fillRect(sx + 5, sy + 8, 9, 4); cx.fillRect(sx + 18, sy + 8, 9, 4); cx.fillStyle = '#a66'; cx.beginPath(); cx.arc(sx + 22, sy + 6, 5, 0, 7); cx.fill(); cx.fillStyle = '#222'; cx.fillRect(sx + 7, sy + 16, 18, 11); break;
    case 'alquimia': cx.fillRect(sx + 2, sy + 12, 28, 8); cx.fillRect(sx + 4, sy + 20, 3, 10); cx.fillRect(sx + 25, sy + 20, 3, 10); cx.fillStyle = '#5f5'; cx.fillRect(sx + 6, sy + 4, 5, 8); cx.fillStyle = '#58f'; cx.fillRect(sx + 14, sy + 6, 5, 6); cx.fillStyle = `hsl(${time * 60 % 360},80%,60%)`; cx.beginPath(); cx.arc(sx + 24, sy + 8, 4, 0, 7); cx.fill(); break;
    case 'valla': cx.fillRect(sx, sy + 12, TS, 3); cx.fillRect(sx, sy + 22, TS, 3); cx.fillRect(sx + 4, sy + 8, 4, 22); cx.fillRect(sx + 24, sy + 8, 4, 22); break;
    case 'yunque': cx.fillRect(sx + 6, sy + 12, 20, 6); cx.fillRect(sx + 12, sy + 18, 8, 8); cx.fillRect(sx + 8, sy + 26, 16, 4); break;
  }
}
function drawChar(px, py, body, dir, opts = {}) {
  const ph = opts.moving ? Math.sin(time * 16) : 0, bob = Math.abs(ph) * 2, y = py - bob, F = opts.flash;
  cx.fillStyle = 'rgba(0,0,0,.3)'; cx.beginPath(); cx.ellipse(px + 16, py + 28, 10, 4, 0, 0, 7); cx.fill();
  if (opts.cape) { cx.fillStyle = F ? '#fff' : opts.cape; cx.fillRect(px + 8 - dir[0] * 2, y + 11, 16, 13 + Math.abs(ph) * 2); }
  cx.fillStyle = F ? '#fff' : opts.legs || '#334';
  cx.fillRect(px + 10, y + 20 + ph * 2, 5, 8 - ph * 2); cx.fillRect(px + 17, y + 20 - ph * 2, 5, 8 + ph * 2);
  cx.fillStyle = F ? '#fff' : '#3a2a1a'; cx.fillRect(px + 10, y + 26 + ph * 2 - ph * 2, 5, 2); cx.fillRect(px + 17, y + 26, 5, 2);
  cx.fillStyle = F ? '#fff' : body; cx.fillRect(px + 8, y + 10, 16, 12);
  if (opts.trim) { cx.fillStyle = F ? '#fff' : opts.trim; cx.fillRect(px + 8, y + 10, 16, 2); cx.fillRect(px + 15, y + 12, 2, 10); cx.fillRect(px + 8, y + 19, 16, 2); }
  // brazos
  cx.fillStyle = F ? '#fff' : (opts.skin || '#f0c8a0'); cx.fillRect(px + 5, y + 11 - ph * 2, 3, 9); cx.fillRect(px + 24, y + 11 + ph * 2, 3, 9);
  cx.fillStyle = F ? '#fff' : (opts.skin || '#f0c8a0'); cx.fillRect(px + 10, y + 1, 12, 10);
  if (opts.helm) { cx.fillStyle = F ? '#fff' : opts.helm; cx.fillRect(px + 8, y - 2, 16, 6); cx.fillRect(px + 8, y + 2, 3, 7); cx.fillRect(px + 21, y + 2, 3, 7); cx.fillStyle = '#fff6'; cx.fillRect(px + 10, y - 1, 6, 2); if (opts.helmRar >= 3) { cx.fillStyle = '#f44'; cx.fillRect(px + 15, y - 7, 2, 6); } }
  else { cx.fillStyle = opts.hair || '#432'; cx.fillRect(px + 9, y, 14, 4); }
  if (dir[1] >= 0) { cx.fillStyle = '#000'; cx.fillRect(px + 12 + dir[0] * 2, y + 5, 2, 2); cx.fillRect(px + 18 + dir[0] * 2, y + 5, 2, 2); }
  if (opts.ring) { cx.fillStyle = opts.ring; cx.globalAlpha = .5 + Math.sin(time * 5) * .3; cx.fillRect(px + 24, y + 18, 3, 3); cx.globalAlpha = 1; }
  if (opts.bow) { cx.strokeStyle = '#7a4a1a'; cx.lineWidth = 2; cx.beginPath(); cx.arc(px + 26, y + 15, 8, -1.2, 1.2); cx.stroke(); cx.lineWidth = 1; }
  if (opts.weapon) {
    const sw = opts.swing || 0, a = Math.atan2(dir[1], dir[0]) + (sw > 0 ? (sw / .2 - .5) * 2.4 : .6), wt = opts.wtype || 'Espada';
    cx.save(); cx.translate(px + 16, y + 15); cx.rotate(a); cx.fillStyle = opts.weapon;
    if (wt === 'Báculo') { cx.fillStyle = '#6a4a2a'; cx.fillRect(2, -1, 24, 3); cx.fillStyle = opts.weapon; cx.beginPath(); cx.arc(27, 0, 4 + Math.sin(time * 6), 0, 7); cx.fill(); }
    else if (wt === 'Hacha') { cx.fillStyle = '#7a4a1a'; cx.fillRect(4, -1, 18, 3); cx.fillStyle = opts.weapon; cx.beginPath(); cx.moveTo(16, -1); cx.lineTo(22, -8); cx.lineTo(24, 2); cx.fill(); }
    else if (wt === 'Maza') { cx.fillStyle = '#7a4a1a'; cx.fillRect(4, -1, 14, 3); cx.fillStyle = opts.weapon; cx.beginPath(); cx.arc(20, 0, 5, 0, 7); cx.fill(); }
    else if (wt === 'Katana' || wt === 'Estoque') { cx.fillRect(6, -1, 21, 2); cx.fillStyle = '#a80'; cx.fillRect(4, -3, 2, 6); }
    else { cx.fillRect(6, -2, 16, 3); cx.fillStyle = '#a80'; cx.fillRect(4, -4, 3, 7); }
    if (opts.wrar >= 3) { cx.fillStyle = `rgba(255,220,120,${.4 + Math.sin(time * 8) * .2})`; cx.fillRect(6, -3, 18, 5); }
    cx.restore();
  }
}
function drawEnemy(e) {
  let px = e.fx * TS - camX, py = e.fy * TS - camY;
  if (e.lunge > 0) { px += Math.sign(P.x - e.x) * 6; py += Math.sign(P.y - e.y) * 6; }
  const col = e.flash > 0 ? '#fff' : e.col, s = e.boss ? 1.6 : 1;
  cx.save(); cx.translate(px + 16, py + 16); cx.scale(s, s); cx.translate(-16, -16 - (e.boss ? 6 : 0));
  cx.fillStyle = 'rgba(0,0,0,.3)'; cx.beginPath(); cx.ellipse(16, 28, 11, 4, 0, 0, 7); cx.fill();
  const b = Math.sin(time * 6 + e.x) * 2;
  if (e.rare) { cx.fillStyle = `rgba(255,210,60,${.25 + Math.sin(time * 6) * .1})`; cx.beginPath(); cx.arc(16, 16, 18, 0, 7); cx.fill(); if (Math.random() < .2) parts.push({ x: e.fx * TS + rnd(4, 28), y: e.fy * TS + rnd(0, 28), vx: 0, vy: -30, l: .6, col: '#fe6', sz: 2 }); }
  if (e.enraged) { cx.fillStyle = `rgba(255,0,0,${.2 + Math.sin(time * 10) * .1})`; cx.beginPath(); cx.arc(16, 14, 20, 0, 7); cx.fill(); }
  if (e.sh === 'slime') { cx.fillStyle = col; cx.beginPath(); cx.ellipse(16, 20 - b / 2, 12 + b, 9 - b / 2, 0, 0, 7); cx.fill(); cx.fillStyle = '#fff8'; cx.fillRect(10, 14, 4, 3); cx.fillStyle = '#000'; cx.fillRect(12, 18, 2, 3); cx.fillRect(19, 18, 2, 3); }
  else if (e.sh === 'rat') { cx.fillStyle = col; cx.beginPath(); cx.ellipse(16, 20, 12, 7, 0, 0, 7); cx.fill(); cx.beginPath(); cx.arc(26, 17, 5, 0, 7); cx.fill(); cx.fillStyle = '#f33'; cx.fillRect(27, 15, 2, 2); cx.strokeStyle = col; cx.beginPath(); cx.moveTo(4, 20); cx.quadraticCurveTo(0, 12 + b, 2, 8); cx.stroke(); }
  else if (e.sh === 'ghost') { cx.globalAlpha = .75; cx.fillStyle = col; cx.beginPath(); cx.arc(16, 12 + b, 10, Math.PI, 0); cx.lineTo(26, 28 + b); cx.lineTo(21, 24 + b); cx.lineTo(16, 28 + b); cx.lineTo(11, 24 + b); cx.lineTo(6, 28 + b); cx.fill(); cx.fillStyle = '#000'; cx.fillRect(11, 10 + b, 3, 4); cx.fillRect(18, 10 + b, 3, 4); cx.globalAlpha = 1; }
  else if (e.sh === 'golem') { cx.fillStyle = col; cx.fillRect(5, 8, 22, 18); cx.fillRect(9, 2, 14, 8); cx.fillRect(2, 10, 5, 12); cx.fillRect(25, 10, 5, 12); cx.fillRect(8, 26, 6, 4); cx.fillRect(18, 26, 6, 4); cx.fillStyle = '#f84'; cx.fillRect(12, 5, 3, 2); cx.fillRect(18, 5, 3, 2); }
  else if (e.sh === 'boss') { cx.fillStyle = col; cx.fillRect(7, 10, 18, 14); cx.fillRect(9, 24, 5, 6); cx.fillRect(18, 24, 5, 6); cx.fillStyle = '#5a2a1a'; cx.fillRect(10, 1, 12, 10); cx.fillStyle = '#eed'; cx.fillRect(6, 0, 4, 3); cx.fillRect(22, 0, 4, 3); cx.fillStyle = '#ff0'; cx.fillRect(12, 4, 3, 2); cx.fillRect(18, 4, 3, 2); cx.fillStyle = '#aaa'; cx.fillRect(25, 4 + b, 3, 20); cx.fillRect(22, 4 + b, 9, 6); }
  else if (e.sh === 'mage') { drawChar(0, 0, col, [Math.sign(P.x - e.x), 1], { flash: e.flash > 0, skin: '#a9b', hair: '#213', legs: col, moving: e.mt > 0 }); cx.fillStyle = e.flash > 0 ? '#fff' : '#324'; cx.beginPath(); cx.moveTo(6, 3); cx.lineTo(16, -12); cx.lineTo(26, 3); cx.fill(); cx.fillStyle = '#a7f'; cx.beginPath(); cx.arc(27, 6 + b, 3, 0, 7); cx.fill(); }
  else { drawChar(0, 0, col, [Math.sign(P.x - e.x), 1], { flash: e.flash > 0, skin: col, hair: '#222', legs: '#433', weapon: e.ranged ? null : '#bbb', bow: e.ranged === 'arrow', moving: e.mt > 0 }); }
  cx.restore();
  if (e.hp < e.mhp || e.boss) { const w = e.boss ? 48 : 28; cx.fillStyle = '#000'; cx.fillRect(px + 16 - w / 2, py - (e.boss ? 22 : 6), w, 4); cx.fillStyle = e.boss ? '#f33' : '#e44'; cx.fillRect(px + 16 - w / 2, py - (e.boss ? 22 : 6), w * e.hp / e.mhp, 4); }
  if (P.target === e) { cx.strokeStyle = '#f44'; cx.strokeRect(px + 1, py + 1, 30, 30); }
}
let useCache = true;
function render() {
  const t0 = performance.now();
  const vw = cv.width, vh = cv.height;
  camX = P.fx * TS + 16 - vw / 2 + (shake ? rnd(-shake, shake) : 0); camY = P.fy * TS + 16 - vh / 2 + (shake ? rnd(-shake, shake) : 0);
  const mw = W.w * TS, mh = W.h * TS;
  camX = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, camX)); camY = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, camY));
  camX = Math.round(camX); camY = Math.round(camY);
  cx.fillStyle = '#000'; cx.fillRect(0, 0, vw, vh);
  const x0 = Math.floor(camX / TS) - 1, y0 = Math.floor(camY / TS) - 1, x1 = x0 + Math.ceil(vw / TS) + 2, y1 = y0 + Math.ceil(vh / TS) + 2;
  if (useCache) for (let cy2 = Math.max(0, Math.floor(y0 / CH)); cy2 <= Math.min(Math.floor((W.h - 1) / CH), Math.floor(y1 / CH)); cy2++) for (let cx2 = Math.max(0, Math.floor(x0 / CH)); cx2 <= Math.min(Math.floor((W.w - 1) / CH), Math.floor(x1 / CH)); cx2++) cx.drawImage(getChunk(cx2, cy2), cx2 * CH * TS - camX, cy2 * CH * TS - camY);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const sx = x * TS - camX, sy = y * TS - camY;
    if (x < 0 || y < 0 || x >= W.w || y >= W.h) { if (!W.dark) { cx.fillStyle = '#1f5a20'; cx.fillRect(sx, sy, TS, TS); } continue; }
    const tt = gt(W, x, y); if (!useCache || ANIM.has(tt)) drawTile(x, y, tt, sx, sy);
    if (useCache && W.seenTraps && W.seenTraps.size && W.seenTraps.has(x + ',' + y)) { cx.fillStyle = '#888'; for (let i = 0; i < 4; i++) { cx.beginPath(); cx.moveTo(sx + 5 + i * 7, sy + 26); cx.lineTo(sx + 8 + i * 7, sy + 16); cx.lineTo(sx + 11 + i * 7, sy + 26); cx.fill(); } }
    const o = W.obj[x + ',' + y]; if (o && BLOCKS[o].floor) drawBlock(o, sx, sy); if (o === 'cultivo' && W === town) drawCrop(x, y, sx, sy);
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = W.obj[x + ',' + y]; if (o && !BLOCKS[o].floor) drawBlock(o, x * TS - camX, y * TS - camY); }
  if (W.roofs) for (const [x0, y0, w, h, col] of W.roofs) { const sx = x0 * TS - camX, sy = y0 * TS - camY; cx.fillStyle = col; cx.fillRect(sx - 4, sy - 10, w * TS + 8, 18); cx.fillStyle = '#0003'; cx.fillRect(sx - 4, sy + 4, w * TS + 8, 4); cx.fillStyle = '#5a3a1a'; cx.fillRect(sx + w * TS / 2 - 8, sy + h * TS - 22, 16, 22); cx.fillStyle = '#ffd'; cx.fillRect(sx + 6, sy + 16, 10, 8); cx.fillRect(sx + w * TS - 16, sy + 16, 10, 8); }
  if (W === town && P.guildHall) { cx.strokeStyle = '#c4ca'; cx.setLineDash([4, 4]); cx.strokeRect(GUILD.x * TS - camX, GUILD.y * TS - camY, GUILD.w * TS, GUILD.h * TS); cx.setLineDash([]); cx.fillStyle = '#e8e'; cx.font = '11px sans-serif'; cx.textAlign = 'left'; cx.fillText('Sede del Gremio — Confort ' + guildComfort() + ' (aliados +' + Math.round(guildBonus() * 100) + '%)', GUILD.x * TS - camX + 2, GUILD.y * TS - camY - 4); }
  if (W === town) { cx.strokeStyle = '#fc6a'; cx.setLineDash([4, 4]); cx.strokeRect(PLOT.x * TS - camX, PLOT.y * TS - camY, PLOT.w * TS, PLOT.h * TS); cx.setLineDash([]); cx.fillStyle = '#fc6'; cx.font = '11px sans-serif'; cx.textAlign = 'left'; cx.fillText(HOUSE[P.house || 1].n + ' (nv ' + (P.house || 1) + ') — Confort ' + comfort() + '  [H: mejorar]', PLOT.x * TS - camX + 2, PLOT.y * TS - camY - 4); }
  for (const d of drops) { const sx = d.x * TS - camX, sy = d.y * TS - camY + Math.sin(time * 4 + d.x) * 2; if (d.gold) { cx.fillStyle = '#fd4'; cx.beginPath(); cx.arc(sx + 12, sy + 20, 4, 0, 7); cx.arc(sx + 19, sy + 22, 4, 0, 7); cx.fill(); } else if (d.item) { cx.fillStyle = ['#ccc', '#5e5', '#5af', '#c7f', '#fb3'][d.item.rar]; cx.globalAlpha = .4 + Math.sin(time * 5) * .2; cx.fillRect(sx + 6, sy + 6, 20, 20); cx.globalAlpha = 1; cx.font = '16px sans-serif'; cx.textAlign = 'center'; cx.fillText(SLOTS[d.item.slot], sx + 16, sy + 22); } else { cx.font = '14px sans-serif'; cx.textAlign = 'center'; cx.fillText(d.cons ? CONSUM[d.cons].ico : MATS[d.mat], sx + 16, sy + 22); } }
  drawTraps();
  // entidades ordenadas por y
  const list = [...(W === town ? visitors : []).map(v => ({ v, y: v.fy })), ...(W.npcs || []).filter(n => !n.hidden).map(n => ({ n, y: n.y })), ...ents.map(e => ({ e, y: e.fy })), ...comps.map(c => ({ c, y: c.fy - .01 })), { p: 1, y: P.fy }].sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o.n) { const sx = o.n.x * TS - camX, sy = o.n.y * TS - camY; if (!isOpen(o.n.role)) { cx.fillStyle = '#ccf'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'center'; cx.fillText('Zzz', sx + 26, sy - 14 + Math.sin(time * 2) * 3); } drawChar(sx, sy, o.n.col, [0, 1], { hair: o.n.role === 'god' ? '#111' : '#a63', legs: '#335' }); cx.fillStyle = '#fff'; cx.font = '10px sans-serif'; cx.textAlign = 'center'; cx.fillText(o.n.n, sx + 16, sy - 4); if (o.n.role === 'quest' && QUESTS[P.q] && P.qp >= QUESTS[P.q].c) { cx.fillStyle = '#fd4'; cx.font = 'bold 18px sans-serif'; cx.fillText('!', sx + 16, sy - 14 + Math.sin(time * 5) * 2); } }
    else if (o.v) { const v = o.v, sx = v.fx * TS - camX, sy = v.fy * TS - camY; drawChar(sx, sy, v.col, [0, 1], { hair: v.hair, moving: v.mt > 0 }); cx.fillStyle = '#9cf'; cx.font = '10px sans-serif'; cx.textAlign = 'center'; cx.fillText(v.n + (v.gift ? ' 🎁' : ''), sx + 16, sy - 4);
      if (Math.abs(v.x - P.x) + Math.abs(v.y - P.y) <= 3) { cx.font = '11px sans-serif'; const w = cx.measureText(v.line).width + 10; cx.fillStyle = '#fffe'; cx.fillRect(sx + 16 - w / 2, sy - 30, w, 16); cx.fillStyle = '#222'; cx.fillText(v.line, sx + 16, sy - 18); } }
    else if (o.c) drawComp(o.c);
    else if (o.e) drawEnemy(o.e);
    else { const psx = P.fx * TS - camX, psy = P.fy * TS - camY;
      if (P.riding && P.mount) { const M = MOUNTS[P.mount], b = P.mt > 0 ? Math.abs(Math.sin(time * 16)) * 2 : 0, f = P.dir[0] < 0 ? -1 : 1; cx.fillStyle = 'rgba(0,0,0,.3)'; cx.beginPath(); cx.ellipse(psx + 16, psy + 30, 14, 4, 0, 0, 7); cx.fill(); cx.fillStyle = M.col; cx.fillRect(psx + 3, psy + 18 - b, 26, 9); cx.fillRect(psx + 16 + f * 10, psy + 11 - b, 7, 9); for (const lx of [5, 11, 19, 25]) cx.fillRect(psx + lx, psy + 26 - b + (P.mt > 0 ? Math.sin(time * 16 + lx) * 2 : 0), 3, 5); cx.fillStyle = '#222'; cx.fillRect(psx + 16 - f * 13, psy + 18 - b, 3, 8); }
      cx.save(); if (P.riding && P.mount) cx.translate(0, -8);
      const E = P.eq, rc = ['#ccc', '#9e9', '#9cf', '#d9f', '#fd6']; drawChar(P.fx * TS - camX, P.fy * TS - camY, E.armadura ? ['#667', '#4a6', '#36a', '#738', '#a70'][E.armadura.rar] : '#2a4a8a', P.dir, { flash: P.flash > 0, bow: E.arma && E.arma.name.startsWith('Arco') ? 1 : 0, weapon: E.arma && !E.arma.name.startsWith('Arco') ? rc[E.arma.rar] : null, wtype: E.arma && E.arma.name.split(' ')[0], wrar: E.arma ? E.arma.rar : 0, trim: E.armadura ? rc[E.armadura.rar] : null, cape: E.armadura && E.armadura.rar >= 2 ? ['', '', '#246', '#526', '#a22'][E.armadura.rar] : null, helm: E.casco ? ['#888', '#7a9', '#79b', '#a8c', '#db5'][E.casco.rar] : null, helmRar: E.casco ? E.casco.rar : 0, ring: E.anillo ? rc[E.anillo.rar] : null, swing: P.swing, moving: P.mt > 0 && !P.riding, hair: '#ddd' }); cx.restore();
      if (P.title) { cx.font = 'bold 10px serif'; cx.textAlign = 'center'; cx.fillStyle = '#000'; cx.fillText('«' + P.title + '»', psx + 17, psy - 7 - (P.riding ? 8 : 0)); cx.fillStyle = '#fd6'; cx.fillText('«' + P.title + '»', psx + 16, psy - 8 - (P.riding ? 8 : 0)); } }
  }
  for (const p of projs) { if (p.kind === 'arrow') { const a = Math.atan2(p.vy, p.vx); cx.save(); cx.translate(p.x - camX, p.y - camY); cx.rotate(a); cx.fillStyle = '#ca8'; cx.fillRect(-8, -1, 14, 2); cx.fillStyle = '#ddd'; cx.fillRect(6, -2, 4, 4); cx.restore(); } else { cx.fillStyle = p.kind === 'magic' ? '#c8f' : '#ff8'; cx.beginPath(); cx.arc(p.x - camX, p.y - camY, p.hostile ? 5 : 6, 0, 7); cx.fill(); } }
  for (const w of warns) { if (w.done) continue; cx.fillStyle = `rgba(255,${w.t < .3 ? 0 : 80},0,${.25 + (1 - Math.min(1, w.t)) * .4})`; cx.fillRect(w.x * TS - camX + 2, w.y * TS - camY + 2, TS - 4, TS - 4); }
  for (const p of parts) { cx.globalAlpha = Math.min(1, p.l * 2); if (p.ring) { cx.strokeStyle = p.col; cx.lineWidth = 3; cx.beginPath(); cx.arc(p.x - camX, p.y - camY, p.r, 0, 7); cx.stroke(); cx.lineWidth = 1; } else { cx.fillStyle = p.col; cx.fillRect(p.x - camX, p.y - camY, p.sz, p.sz); } }
  cx.globalAlpha = 1;
  // cursor de construcción
  if (buildMode) { const [fx, fy] = facing(), id = Object.keys(BLOCKS)[buildSel]; cx.globalAlpha = .5 + Math.sin(time * 6) * .2; drawBlock(id, fx * TS - camX, fy * TS - camY); cx.globalAlpha = 1; cx.strokeStyle = '#ff0'; cx.strokeRect(fx * TS - camX, fy * TS - camY, TS, TS); }
  // iluminación (antorchas, jugador, hechizos)
  const night = W.dark ? 0 : nightLevel();
  const dk = W.dark ? .93 : night * .6;
  if (dk > .02) {
    if (!render.lc) render.lc = document.createElement('canvas');
    const lc = render.lc, l = lc.getContext('2d'); if (lc.width !== vw || lc.height !== vh) { lc.width = vw; lc.height = vh; }
    const th = W.theme || THEMES[0], fg = W.dark ? th.fog : [10, 10, 40];
    l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, vw, vh); l.fillStyle = `rgba(${fg},${dk})`; l.fillRect(0, 0, vw, vh);
    l.globalCompositeOperation = 'destination-out';
    const lights = [[P.fx * TS + 16, P.fy * TS + 16, (175 + Math.sin(time * 3) * 6) * (P.buffs.luz > 0 ? 1.7 : 1)]];
    if (W.torches) for (const k of W.torches) { const [x, y] = k.split(',').map(Number); lights.push([x * TS + 16, y * TS + 24, 115 + Math.sin(time * 9 + x) * 6, 1]); }
    for (const k in W.obj) if (BLOCKS[W.obj[k]].light) { const [x, y] = k.split(',').map(Number); lights.push([x * TS + 16, y * TS + 12, 120 + Math.sin(time * 9 + x) * 6, 1]); }
    for (const p of projs) if (p.kind !== 'arrow') lights.push([p.x, p.y, 60]);
    for (const [x, y, r] of lights) { const sx = x - camX, sy = y - camY; if (sx < -r || sy < -r || sx > vw + r || sy > vh + r) continue; const g = l.createRadialGradient(sx, sy, r * .2, sx, sy, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.beginPath(); l.arc(sx, sy, r, 0, 7); l.fill(); }
    cx.drawImage(lc, 0, 0);
    cx.globalCompositeOperation = 'lighter';
    const tc = (W.theme || THEMES[0]).torch;
    for (const [x, y, r, warm] of lights) if (warm) { const sx = x - camX, sy = y - camY; if (sx < -r || sy < -r || sx > vw + r || sy > vh + r) continue; const g = cx.createRadialGradient(sx, sy, 0, sx, sy, r * .7); g.addColorStop(0, `rgba(${tc},.22)`); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g; cx.fillRect(sx - r, sy - r, r * 2, r * 2); }
    cx.globalCompositeOperation = 'source-over';
  }
  if (P.say) { P.say.l -= 1 / 60; if (P.say.l <= 0) P.say = null; else { cx.font = '12px sans-serif'; cx.textAlign = 'center'; const sx = P.fx * TS + 16 - camX, sy = P.fy * TS - camY - 26; cx.fillStyle = '#000'; cx.fillText(P.say.t, sx + 1, sy + 1); cx.fillStyle = '#ff6'; cx.fillText(P.say.t, sx, sy); } }
  drawWeather(vw, vh); drawFishing(vw, vh);
  for (const t of texts) { cx.globalAlpha = Math.min(1, t.l * 2); cx.font = `bold ${t.sz}px sans-serif`; cx.textAlign = 'center'; cx.fillStyle = '#000'; cx.fillText(t.t, t.x - camX + 1, t.y - camY + 1); cx.fillStyle = t.col; cx.fillText(t.t, t.x - camX, t.y - camY); }
  cx.globalAlpha = 1;
  if (P.hp < maxHp() * .25) { cx.fillStyle = `rgba(200,0,0,${.15 + Math.sin(time * 6) * .08})`; cx.fillRect(0, 0, vw, vh); }
  // nombre del mapa
  cx.fillStyle = '#fc6'; cx.font = 'bold 16px serif'; cx.textAlign = 'center'; cx.fillText(W.name, vw / 2, 24);
  if (buildMode) { const id = Object.keys(BLOCKS)[buildSel]; cx.fillStyle = '#ff0'; cx.font = 'bold 14px sans-serif'; cx.fillText('CONSTRUIR: ' + BLOCKS[id].n + ' x' + (P.blocks[id] || 0) + '   (Q/R cambiar · Espacio/clic colocar · X/clic der. quitar · B salir)', vw / 2, 46); }
  const boss = ents.find(e => e.boss); if (boss) { cx.fillStyle = '#000a'; cx.fillRect(vw / 2 - 200, 56, 400, 16); cx.fillStyle = '#c22'; cx.fillRect(vw / 2 - 198, 58, 396 * boss.hp / boss.mhp, 12); cx.fillStyle = '#fff'; cx.font = 'bold 11px sans-serif'; cx.fillText(boss.n, vw / 2, 68); }
  drawMinimap();
}
const _render = render;
render = function () { const t0 = performance.now(); _render(); const d = performance.now() - t0; perf.frames++; perf.total += d; perf.last = d; if (perf.frames > 30) perf.max = Math.max(perf.max, d); };
function drawMinimap() {
  const s = Math.min(150 / W.w, 150 / W.h), ox = (150 - W.w * s) / 2, oy = (150 - W.h * s) / 2; drawMinimap.off = [ox, oy];
  if (mm.height !== Math.round(W.h * s) && false) { }
  mx.fillStyle = W.dark ? '#000' : '#1f4a20'; mx.fillRect(0, 0, 150, 150);
  const mk = (W._ver || 0) + ':' + (W._fogv || 0) + ':' + W.w;
  if (!W._mm || W._mmk !== mk) { W._mmk = mk; W._mm = document.createElement('canvas'); W._mm.width = W._mm.height = 150; const keep = mx; mx = W._mm.getContext('2d'); mx.translate(ox, oy); drawMinimapTiles(s); mx = keep; perf.mmBuilt = (perf.mmBuilt || 0) + 1; }
  mx.drawImage(W._mm, 0, 0); mx.save(); mx.translate(ox, oy);
  const vis = (x, y) => !W.seen || W.seen[y * W.w + x];
  for (const e of ents) if (vis(e.x, e.y)) { mx.fillStyle = e.boss ? '#f0f' : '#f33'; mx.fillRect(e.x * s - 1, e.y * s - 1, 3, 3); }
  for (const c of comps) { mx.fillStyle = '#5cf'; mx.fillRect(c.x * s - 1, c.y * s - 1, 3, 3); }
  for (const n of W.npcs || []) if (vis(n.x, n.y)) { mx.fillStyle = '#ff0'; mx.fillRect(n.x * s - 1, n.y * s - 1, 3, 3); }
  mx.fillStyle = '#fff'; mx.fillRect(P.x * s - 2, P.y * s - 2, 4, 4); mx.restore();
}
function drawMinimapTiles(s) {
  for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
    const t = gt(W, x, y); if (t === T.DWALL) continue; if (W.seen && !W.seen[y * W.w + x]) continue;
    mx.fillStyle = t === T.CHEST ? '#fd4' : t === T.EXIT ? '#fc6' : t === T.DOWN ? '#fc0' : t === T.UP ? '#0cf' : t === T.WATER ? '#36c' : t === T.TREE ? '#163' : SOLID.has(t) ? '#666' : t === T.PLOT ? '#a85' : W.dark ? '#544' : '#3a6';
    mx.fillRect(x * s, y * s, s + .5, s + .5);
  }
}
function hud() {
  const mh = maxHp(), mp = maxMp();
  $('hname').innerHTML = `<b style="color:#fc6">Aventurero Nv.${P.lvl}</b> · 💰 ${P.gold} · ${P.floor ? 'Piso ' + P.floor : P.field ? 'Llanuras' : 'Ciudad'} (máx ${P.maxFloor})` + (P.sp + P.kp ? ` · <span style="color:#7f7">¡Puntos libres!</span>` : '');
  $('hp').style.width = (100 * P.hp / mh) + '%'; $('hpt').textContent = `PV ${Math.ceil(P.hp)}/${mh}`;
  $('mp').style.width = (100 * P.mp / mp) + '%'; $('mpt').textContent = `MP ${Math.floor(P.mp)}/${mp}`;
  $('xp').style.width = (100 * P.xp / xpNeed(P.lvl)) + '%';
  const q = QUESTS[P.q]; $('hinfo').innerHTML = (P.story && P.story.ready ? '<b style="color:#c9f">📖 ¡Decisión de historia pendiente! (J)</b><br>' : '') + (q ? `📜 ${q.n}: ${Math.min(P.qp, q.c)}/${q.c}` : '📜 ¡Todas las misiones completadas!') + Object.keys(P.buffs).map(b => `<br><span style="color:#fc8">${BUFFN[b]} ${Math.ceil(P.buffs[b])}s</span>`).join('') + (P.party.length ? '<br>👥 ' + P.party.map(x => `${ALLIES[x.id].n} ${x.down ? '💀' : Math.ceil(x.hp) + '/' + allyMaxHp(x.id)}`).join(' · ') : '') + (P.pet ? ' 🐾 ' + PETS[P.pet].n : '') + (P.riding ? ' 🐴' : '') + (P.bank ? ' · 🏦 ' + P.bank : '') + (arena ? `<br><b style="color:#f84">🏟 Oleada ${arena.wave} ${arena.active ? '— enemigos: ' + ents.length : '— siguiente en ' + Math.ceil(arena.wait) + 's'}</b>` : '') + (P.pet ? ' 🐾 ' + petName(P.pet) + ' [P ' + ((P.cds.pet || 0) > 0 ? Math.ceil(P.cds.pet) + 's' : '✔') + ']' : '') + (P.runes.gfb + P.runes.sd + P.runes.uh + P.runes.blank ? `<br>🔮 Runas: R GFB ${P.runes.gfb} · T SD ${P.runes.sd} · Y UH ${P.runes.uh} · en blanco ${P.runes.blank}` : '') + `<br>🕐 ${clock()} ${nightLevel() > .5 ? '🌙' : ''} · ${season().ico} ${season().n}, día ${P.day} · ${WEATHER_N[weather.type]}` + `<br><span style="color:#888">Clase: ${CLASSES[P.cls].n} · ${music.on ? '🎵' : '🔇'} (M) · Opciones (O)</span>`;
  $('log').innerHTML = msgs.map(m => `<div style="color:${m.c};opacity:${Math.min(1, m.a)}">${m.t}</div>`).join('');
  let h = ''; ACTIVE.forEach((id, i) => { const s = SKILLS[id], cd = P.cds[id] || 0; h += `<div class="slot" style="opacity:${P.sk[id] ? 1 : .35}"><span class="k">${i + 1}</span><b>${['💥', '🌀', '🔥', '✨'][i]}</b>${s.n.split(' ')[0]}<div class="cd" style="height:${cd / s.cd * 100}%"></div></div>`; });
  h += `<div class="slot"><span class="k">5</span><b>❤</b>x${P.cons.pocion_vida}</div><div class="slot"><span class="k">6</span><b>💧</b>x${P.cons.pocion_mana}</div>`;
  if (h !== hud.last) { $('bar').innerHTML = h; hud.last = h; }
}

// ---------- Paneles ----------
function togglePanel(n) { if (panel === n) closePanel(); else openPanel(n); }
function drawWorldMap() {
  const c = document.getElementById('wmc'); if (!c) return false; const g = c.getContext('2d');
  const s = Math.min(c.width / W.w, c.height / W.h), ox = (c.width - W.w * s) / 2, oy = (c.height - W.h * s) / 2;
  g.fillStyle = W.dark ? '#000' : '#1f4a20'; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
    const t = gt(W, x, y); if (t === T.DWALL) continue; if (W.seen && !W.seen[y * W.w + x]) { g.fillStyle = '#0a0a0a'; g.fillRect(ox + x * s, oy + y * s, s + .5, s + .5); continue; }
    g.fillStyle = t === T.CHEST ? '#fd4' : t === T.EXIT ? '#fa4' : t === T.DOWN ? '#fc0' : t === T.UP ? '#0cf' : t === T.WATER ? '#36c' : t === T.TREE ? '#163' : t === T.PATH ? '#a8946a' : t === T.WALL ? '#888' : SOLID.has(t) ? '#666' : t === T.PLOT ? '#a85' : t === T.SAND ? '#d8c890' : W.dark ? (W.theme || THEMES[0]).g[0] : season().grass;
    g.fillRect(ox + x * s, oy + y * s, s + .5, s + .5);
  }
  if (W.roofs) for (const [x0, y0, w, h, col] of W.roofs) { g.fillStyle = col; g.fillRect(ox + x0 * s, oy + y0 * s, w * s, h * s); }
  g.font = 'bold 10px sans-serif'; g.textAlign = 'center';
  for (const n of (W.npcs || [])) if (!n.hidden) { g.fillStyle = '#ff0'; g.fillRect(ox + n.x * s, oy + n.y * s, s, s); g.fillStyle = '#fff'; g.fillText(n.n.split(' ')[0], ox + n.x * s + s / 2, oy + n.y * s - 2); }
  for (const e of ents) if (!W.seen || W.seen[e.y * W.w + e.x]) { g.fillStyle = e.boss ? '#f0f' : '#f33'; g.fillRect(ox + e.x * s, oy + e.y * s, s, s); }
  if (W.seen) { g.fillStyle = '#ccc'; g.textAlign = 'left'; g.fillText('Explorado: ' + Math.round(explored() * 100) + '%', 6, c.height - 6); g.textAlign = 'center'; }
  for (const cc of comps) { g.fillStyle = '#5cf'; g.fillRect(ox + cc.x * s, oy + cc.y * s, s, s); }
  g.fillStyle = '#fff'; g.fillRect(ox + P.x * s - 2, oy + P.y * s - 2, s + 4, s + 4); g.fillStyle = '#f00'; g.fillRect(ox + P.x * s, oy + P.y * s, s, s);
  if (W === town) { g.strokeStyle = '#fc6'; g.strokeRect(ox + PLOT.x * s, oy + PLOT.y * s, PLOT.w * s, PLOT.h * s); g.fillStyle = '#fc6'; g.fillText('Tu casa', ox + (PLOT.x + PLOT.w / 2) * s, oy + PLOT.y * s - 2); if (P.guildHall) { g.strokeStyle = '#c4c'; g.strokeRect(ox + GUILD.x * s, oy + GUILD.y * s, GUILD.w * s, GUILD.h * s); g.fillStyle = '#c4c'; g.fillText('Sede del gremio', ox + (GUILD.x + GUILD.w / 2) * s, oy + GUILD.y * s - 2); } }
  drawWorldMap.drawn = (drawWorldMap.drawn || 0) + 1; return true;
}
function closePanel() { panel = null; $('panel').style.display = 'none'; $('tip').style.display = 'none'; }
function openPanel(n, data) { panel = n; panel_data = data; snd('ui'); drawPanel(); $('panel').style.display = 'block'; }
let panel_data = null;
function itemHtml(it, act) { return `<div class="it r${it.rar}" data-act="${act}" data-uid="${it.uid}"><span style="font-size:18px">${SLOTS[it.slot]}</span><br><span class="c${it.rar}">${it.plus ? '+' + it.plus + ' ' : ''}${it.name.slice(0, 14)}</span></div>`; }
function itemTip(it) { const cmp = P.eq[it.slot]; return `<b class="c${it.rar}">${it.plus ? '+' + it.plus + ' ' : ''}${it.name}</b>${it.plus ? ' <small>(+' + it.plus * 8 + '% estadísticas)</small>' : ''}<br><i>${RAR[it.rar]} · ${it.slot} · nv ${it.lvl}</i><br>` + Object.entries(it.st).map(([k, v]) => `+${v} ${STN[k]}` + (cmp && cmp !== it ? ` <span style="color:${v >= (cmp.st[k] || 0) ? '#7f7' : '#f77'}">(${cmp.st[k] || 0})</span>` : '')).join('<br>') + `<br><span style="color:#fd4">Valor: ${it.value} oro</span>`; }
function have(inp) { return Object.entries(inp).every(([k, v]) => P.mats[k] >= v); }
function drawPanel() {
  const el = $('panel'); let h = '';
  const close = '<button style="float:right" data-act="close">✕ Cerrar</button>';
  if (panel === 'inv') {
    h = close + `<h2>🎒 Inventario y Estado</h2><div style="display:flex;gap:20px;flex-wrap:wrap"><div><h3>Equipo</h3>`;
    for (const s in SLOTS) { const it = P.eq[s]; h += `<div style="display:flex;align-items:center;gap:6px;margin:4px 0">${it ? itemHtml(it, 'unequip') : `<div class="it">${SLOTS[s]}<br>vacío</div>`}<span>${s}</span></div>`; }
    h += `</div><div><h3>Estado (${P.sp} pts)</h3>`;
    for (const k of ['fue', 'vit', 'agi', 'int']) h += `<div>${STN[k]}: <b>${stat(k)}</b> <button data-act="stat" data-k="${k}" ${P.sp ? '' : 'disabled'}>+</button></div>`;
    h += `<p>Ataque: ${atk()} · Defensa: ${def()}<br>Crítico: ${crit().toFixed(1)}% · PV ${maxHp()} · MP ${maxMp()}<br>Velocidad ataque: ${atkTime().toFixed(2)}s<br>Monstruos derrotados: ${P.kills} · Muertes: ${P.deaths}</p>`;
    h += `<h3>Materiales</h3>` + Object.entries(P.mats).map(([k, v]) => `${MATS[k]} ${k}: ${v}`).join('<br>');
    h += `<h3>Comida (7-0)</h3>` + ['pan', 'estofado', 'tarta', 'banquete'].map(k => `${CONSUM[k].ico} ${CONSUM[k].n} x${P.cons[k]} <button data-act="eat" data-k="${k}" ${P.cons[k] ? '' : 'disabled'}>Comer</button>`).join('<br>');
    h += `<h3>Bloques</h3>` + (Object.entries(P.blocks).filter(e => e[1] > 0).map(([k, v]) => `${BLOCKS[k].n} x${v}`).join('<br>') || 'Ninguno');
    h += `</div><div><h3>Mochila (${P.inv.length}/32) — clic: equipar · clic der.: vender/tirar</h3><div class="grid">${P.inv.map(it => itemHtml(it, 'equip')).join('')}</div></div></div>`;
  }
  if (panel === 'skills') {
    h = close + `<h2>🌟 Falna — Árbol de habilidades (${P.kp} pts)</h2><div style="display:grid;grid-template-columns:repeat(3,200px);gap:10px">`;
    ['⚔ Guerrero', '🔥 Mago', '🛡 Supervivencia'].forEach(t => h += `<b style="text-align:center;color:#fc6">${t}</b>`);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const id = Object.keys(SKILLS).find(k => SKILLS[k].row === r && SKILLS[k].col === c), s = SKILLS[id];
      const ok = P.kp > 0 && P.sk[id] < s.max && (!s.req || P.sk[s.req] > 0);
      h += `<div style="border:1px solid ${P.sk[id] ? '#fc6' : '#555'};padding:6px;border-radius:6px;background:#0005"><b>${s.n}</b> ${P.sk[id]}/${s.max}<br><small>${s.d}${s.req ? '<br>Requiere: ' + SKILLS[s.req].n : ''}</small><br><button data-act="skill" data-k="${id}" ${ok ? '' : 'disabled'}>Aprender</button></div>`;
    }
    h += '</div>';
  }
  if (panel === 'craft') {
    h = close + `<button style="float:right" data-act="openench">⚒ Mejorar equipo (Welf)</button><h2>🔨 Fabricación</h2><p>${Object.entries(P.mats).map(([k, v]) => `${MATS[k]} ${v}`).join(' · ')}</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">`;
    RECIPES.forEach((r, i) => { const nm = r.name || (BLOCKS[r.id] ? BLOCKS[r.id].n : CONSUM[r.id].n), sts = recipeStations(r), stOk = sts.every(hasStation); if (r.id === 'cana' && P.cana) return; h += `<div style="background:#0005;padding:5px;border-radius:5px"><b>${nm}</b>${r.n ? ' x' + r.n : ''}<br><small>${Object.entries(r.in).map(([k, v]) => `<span style="color:${P.mats[k] >= v ? '#9f9' : '#f88'}">${MATS[k]}${v}</span>`).join(' ')}${sts.length ? '<br>' + sts.map(x => `<span style="color:${hasStation(x) ? '#9f9' : '#f88'}">⚒ ${STN_N[x]}</span>`).join(' ') : ''}</small><br><button data-act="craft" data-k="${i}" ${have(r.in) && stOk ? '' : 'disabled'}>Fabricar</button></div>`; });
    h += '</div>';
  }
  if (panel === 'worldmap') {
    h = close + `<h2>🗺 Mapa del mundo — ${W.name}</h2><div style="display:flex;gap:14px;flex-wrap:wrap"><canvas id="wmc" width="560" height="400" style="background:#000;border:1px solid #666;image-rendering:pixelated"></canvas><div style="min-width:200px">
      <h3>Rutas</h3><div style="line-height:1.9">🏘 <b>Ciudad de Orario</b> ${W === town ? '◀ aquí' : ''}<br>&nbsp;&nbsp;↕ letrero sur<br>🌾 <b>Llanuras de Orario</b> ${W === field ? '◀ aquí' : ''}<br>&nbsp;&nbsp;↕ torre del sur · torre del norte (ciudad)<br>🗼 <b>Calabozo</b>: pisos 1–${P.maxFloor} ${W.floor ? '◀ piso ' + W.floor : ''}<br>🏟 Coliseo ${W.isArena ? '◀ aquí' : ''}</div>
      <h3>Leyenda</h3><small>⬛ sin explorar (niebla) · ⬜ tú · 🟡 NPC · 🔴 enemigo · 🔵 compañero · 🟧 escaleras/salidas · 💰 cofre</small>
      <h3>Pisos explorados</h3><small>${[...Array(Math.min(P.maxFloor, 40))].map((_, i) => { const f = i + 1, th = theme(f); return `<span title="${th.n}" style="display:inline-block;width:14px;height:14px;margin:1px;background:${f % 5 === 0 ? '#b22' : th.wt};border:1px solid #000"></span>`; }).join('')}</small><br><small>Rojo = piso de jefe</small></div></div>`;
  }
  if (panel === 'enchant') {
    h = close + `<h2>⚒ Forja de Welf — Mejora de equipo</h2><p>De +1 a +10 (+8% de estadísticas por nivel). Probabilidad: ${ENCH_CH.map((c, i) => '+' + (i + 1) + ':' + c + '%').join(' ')}${hearts('welf') >= 6 ? ' (+5% por amistad con Welf)' : ''}.<br>Riesgo: desde +5 un fallo baja un nivel; desde +8 un fallo puede <b style="color:#f44">destruir</b> el objeto.</p><p>📜 Pergaminos de protección: <b>${P.prot || 0}</b> <button data-act="buyprot" ${P.gold >= 400 ? '' : 'disabled'}>Comprar (400 oro)</button> <label><input type="checkbox" data-act="toggleprot" ${P.useProt ? 'checked' : ''}> Usar al fallar (desde +5: evita bajar o destruir; se consume)</label></p><p>💰 ${P.gold} · ⛓ ${P.mats.hierro} · 💎 ${P.mats.cristal} ${isOpen('smith') ? '' : '<b style="color:#f88">· La forja está cerrada</b>'}</p>`;
    const list = [...Object.values(P.eq).filter(Boolean), ...P.inv];
    h += list.map(it => { const c = enchantCost(it), ok = (it.plus || 0) < 10 && P.gold >= c.oro && P.mats.hierro >= c.hierro && P.mats.cristal >= c.cristal && isOpen('smith'); return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">${itemHtml(it, 'none')}<div>${(it.plus || 0) >= 10 ? '<b style="color:#fd4">¡+10 MÁXIMO!</b>' : `→ +${(it.plus || 0) + 1} (${enchantChance(it)}%) · 💰${c.oro} ⛓${c.hierro}${c.cristal ? ' 💎' + c.cristal : ''} <button data-act="ench" data-uid="${it.uid}" ${ok ? '' : 'disabled'}>Mejorar</button>`}${Object.values(P.eq).includes(it) ? ' <small>(equipado)</small>' : ''}</div></div>`; }).join('');
  }
  if (panel === 'quests') {
    const S = storyNode();
    let sh = `<h2>📖 Historia ${P.story.path ? '— Ruta ' + (P.story.path === 'hestia' ? 'Hestia' : 'Loki') : ''}</h2>`;
    if (S) { sh += `<p><b>${S.n}</b><br>${S.d} ${S.t !== 'none' ? `(${Math.min(P.story.p, S.c)}/${S.c})` : ''}</p>`; if (P.story.ready && S.ch) sh += `<p style="color:#fc8"><i>${typeof S.q === 'function' ? S.q() : S.q}</i></p>` + S.ch.map((c, i) => `<button data-act="story" data-k="${i}" style="display:block;margin:4px 0">${c.t}</button>`).join(''); }
    if (P.story.choices.length) sh += `<p><small>Tus decisiones: ${P.story.choices.length} · ${P.storyTitle ? 'Título de historia: «' + P.storyTitle + '»' : ''}</small></p>`;
    const q = QUESTS[P.q];
    h = close + sh + `<h2>📜 Gremio de Aventureros</h2>`;
    if (!q) h += '<p>Eina: «¡Has completado todo! Eres una leyenda de Orario.»</p>';
    else h += `<p><b>${q.n}</b><br>${q.d}<br>Progreso: ${Math.min(P.qp, q.c)}/${q.c}<br>Recompensa: ${q.xp} XP · ${q.g} oro</p>` + (P.qp >= q.c ? `<button data-act="turnin">Entregar misión</button>` : '<i>Eina: «¡Vuelve cuando lo hayas logrado!»</i>');
    h += `<p style="color:#888">Misiones completadas: ${P.q}/${QUESTS.length}</p>`;
  }
  if (panel === 'shop') {
    const disc = 1 - hearts('bors') * .03, pr = { pocion_vida: Math.round((15 + P.lvl * 2) * disc), pocion_mana: Math.round((20 + P.lvl * 2) * disc) };
    h = close + `<h2>🏪 Tienda de Bors</h2><p>💰 ${P.gold}</p>`;
    for (const k in pr) h += `<button data-act="buy" data-k="${k}" data-p="${pr[k]}">Comprar ${CONSUM[k].n} (${pr[k]} oro)</button>`;
    h += '<br>'; for (const c in CROPS) h += `<button data-act="seed" data-k="${c}">3 semillas de ${CROPS[c].n} (${CROPS[c].price} oro)</button>`; h += `<button data-act="sellcrops">Vender cosechas</button><br>`;
    for (const m of ['madera', 'piedra', 'hierro', 'hierba']) h += `<button data-act="buymat" data-k="${m}">Comprar 5 ${m} (${m === 'hierro' ? 40 : 15} oro)</button>`;
    h += `<button data-act="buyequip">Equipo aleatorio nv.${P.maxFloor} (${60 + P.maxFloor * 25} oro)</button>`;
    h += `<h3>Vender (clic)</h3><button data-act="sellcommon">Vender todo lo Común y Poco común</button><div class="grid">${P.inv.map(it => itemHtml(it, 'sell')).join('')}</div>`;
  }
  if (panel === 'floors') {
    h = close + `<h2>🗼 Entrada al Calabozo</h2><p>¿A qué piso quieres ir? (puntos de control cada 5 pisos)</p>`;
    const opts = [1]; for (let f = 5; f <= P.maxFloor; f += 5) opts.push(f + 1 <= P.maxFloor ? f + 1 : f);
    [...new Set(opts)].forEach(f => h += `<button data-act="floor" data-k="${f}">Piso ${f}</button>`);
  }
  if (panel === 'chest') {
    h = close + `<h2>📦 Cofre de la casa</h2><p>Guarda objetos aquí (clic para mover).</p><h3>Cofre</h3><div class="grid">${(P.chest || []).map(it => itemHtml(it, 'take')).join('')}</div><h3>Mochila</h3><div class="grid">${P.inv.map(it => itemHtml(it, 'store')).join('')}</div>`;
  }
  if (panel === 'house') {
    const l = P.house || 1, nx = HOUSE[l + 1];
    h = close + `<h2>🏠 Tu hogar: ${HOUSE[l].n} (nivel ${l})</h2><p>Confort actual: <b>${comfort()}</b> (multiplicador x${HOUSE[l].mult || 1}). El confort acelera tu regeneración en la ciudad.</p>`;
    if (nx) { const ok = P.gold >= nx.cost.oro && Object.entries(nx.cost).every(([k, v]) => k === 'oro' || P.mats[k] >= v); h += `<p>Mejorar a <b>${nx.n}</b>: parcela ${nx.w}x${nx.h}, confort x${nx.mult}.<br>Coste: ${Object.entries(nx.cost).map(([k, v]) => `<span style="color:${(k === 'oro' ? P.gold : P.mats[k]) >= v ? '#9f9' : '#f88'}">${k === 'oro' ? '💰' : MATS[k]} ${v}</span>`).join(' ')}</p><button data-act="upgrade" ${ok ? '' : 'disabled'}>Mejorar casa</button>`; }
    else h += '<p>¡Tienes la mejor casa de Orario!</p>';
  }
  if (panel === 'npc') {
    const n = panel_data, F = FRIENDS[n.id], hs = hearts(n.id);
    h = close + `<h2>${n.n}</h2><p style="font-size:18px">${'💖'.repeat(hs)}${'🤍'.repeat(10 - hs)} <small>(${P.friend[n.id] || 0}/100)</small></p>`;
    h += `<button data-act="npcrole">${{ quest: '📜 Misiones', shop: '🏪 Tienda', smith: '🔨 Fabricar', god: '🙏 Bendición (curar)' }[n.role]}</button> <button data-act="chat" ${P.talked[n.id] === P.day ? 'disabled' : ''}>💬 Charlar</button>`;
    h += `<h3>Regalar (1 al día) ${P.gifted[n.id] === P.day ? '— ya regalaste hoy' : ''}</h3><p><small>Le gusta: ${F.likes.map(k => MATS[k] || CONSUM[k].ico).join(' ')}</small></p>`;
    const gifts = [...Object.keys(P.mats).filter(k => P.mats[k] > 0), ...Object.keys(P.cons).filter(k => P.cons[k] > 0 && CONSUM[k].food)];
    h += gifts.map(k => `<button data-act="gift" data-k="${k}" ${P.gifted[n.id] === P.day ? 'disabled' : ''}>${MATS[k] || CONSUM[k].ico} ${k.replace('_', ' ')}${F.likes.includes(k) ? ' 💖' : ''}</button>`).join('') || '<i>No tienes nada que regalar.</i>';
    h += `<h3>Recompensas de amistad</h3>` + F.rew.map(([hh, d]) => `<div style="color:${hs >= hh ? '#9f9' : '#888'}">${hs >= hh ? '✔' : '○'} ${hh} 💖 — ${d}</div>`).join('');
  }
  if (panel === 'market') {
    h = close + `<h2>⚖ Casa de Subastas</h2><p>Pon objetos a la venta (máx. 8). Los compradores aparecen cada hora; cuanto más alto el precio respecto a su valor, menos probable es la venta. Comisión: 5%.</p>
      <p>Ganancias por cobrar: 💰 ${P.marketGold || 0} <button data-act="mcollect" ${P.marketGold ? '' : 'disabled'}>Cobrar</button></p><h3>Tus subastas (${(P.market || []).length}/8)</h3>` +
      ((P.market || []).map((l, i) => `<div>${l.item.name} <span class="c${l.item.rar}">[${RAR[l.item.rar]}]</span> — ${l.price} oro <small>(prob. ${Math.round(marketChance(l.item, l.price) * 100)}%/h)</small> <button data-act="mcancel" data-k="${i}">Retirar</button></div>`).join('') || '<i>Ninguna</i>') +
      `<h3>Vender desde la mochila</h3><p><small>Precio sugerido = 2× valor. Clic = vender a 2×; clic derecho no aplica.</small> Multiplicador: <select id="mmult"><option value="1.2">1.2×</option><option value="1.6">1.6×</option><option value="2" selected>2×</option><option value="2.5">2.5×</option><option value="3">3×</option></select></p><div class="grid">${P.inv.map(it => itemHtml(it, 'mlist')).join('')}</div>
      <h3>Ofertas de hoy</h3><div class="grid">${(P.mktStock || []).map((it, i) => `<div>${itemHtml(it, 'none')}<button data-act="mbuy" data-k="${i}" ${P.gold >= it.price ? '' : 'disabled'}>${it.price}💰</button></div>`).join('')}</div>`;
  }
  if (panel === 'tavern') {
    const here = town.npcs.filter(n => n.state === 'tavern').map(n => n.n.split(' ')[0]);
    h = close + `<h2>🍺 Taberna «El Ciervo Dorado»</h2><p>Abierta de 10:00 a 02:00. Ahora (${clock()}) están aquí: ${here.join(', ') || 'nadie conocido'}.</p>
      <button data-act="tbuy" data-k="pan" data-p="20">🍞 Pan casero (20)</button><button data-act="tbuy" data-k="estofado" data-p="45">🍲 Estofado (45)</button><button data-act="tbuy" data-k="tarta" data-p="70">🍰 Tarta (70)</button><button data-act="tbuy" data-k="banquete" data-p="150">🍱 Banquete (150)</button>
      <h3>Rumores</h3><button data-act="rumor">Escuchar rumores (5 oro)</button><p id="rumor" style="color:#fc8">${P.lastRumor || ''}</p>
      <h3>Una ronda para todos</h3><button data-act="round" ${P.gold >= 50 ? '' : 'disabled'}>Invitar una ronda (50 oro): +5 amistad con quien esté aquí</button>`;
  }
  if (panel === 'arena') {
    h = close + `<h2>🏟 Coliseo de Orario</h2><p>Lucha contra oleadas cada vez más fuertes, con un campeón cada 5 oleadas. Si mueres aquí no pierdes oro. Sal por la puerta sur cuando quieras.</p><p>Récord: oleada ${P.arenaBest || 0} · Fichas: 🎟 ${P.tokens || 0} · Horario 10:00–23:00 (${clock()})</p>
      <button data-act="arenago" ${isOpen('arena') ? '' : 'disabled'}>⚔ Entrar a la arena</button>
      <h3>🏆 Torneo semanal (cada 7 días · hoy es día ${P.day})</h3>${tourneyDay() ? (P.tourneyWeek === week() ? '<p>Ya participaste esta semana.</p>' : `<button data-act="tourney" ${isOpen('arena') ? '' : 'disabled'}>Inscribirse al torneo</button>`) : `<p>Próximo torneo: día ${P.day + (7 - P.day % 7)}.</p>`}
      <p><small>Rivales de esta semana: ${rivals().map(r => r.n + ' (' + r.s + ')').join(' · ')} · Premios: 🥇100 🥈50 🥉25 fichas</small></p>${P.lastTourney ? `<p><small>Último torneo: puesto ${P.lastTourney.pos} (${P.lastTourney.table.join(', ')})</small></p>` : ''}<h3>Tienda de fichas</h3>
      <button data-act="tok" data-k="epic" ${(P.tokens || 0) >= 15 ? '' : 'disabled'}>Cofre épico (15 🎟)</button><button data-act="tok" data-k="leg" ${(P.tokens || 0) >= 50 ? '' : 'disabled'}>Cofre legendario (50 🎟)</button><button data-act="petelixir" ${(P.tokens || 0) >= 5 && P.pet ? '' : 'disabled'}>Elixir de mascota: +1 nivel (5 🎟)</button>`;
  }
  if (panel === 'dmerch') {
    h = close + `<h2>🎒 Mercader errante</h2><p>«Psst… mercancía rara de las profundidades. Solo por hoy.» 💰 ${P.gold}</p><div class="grid">` + (W.mstock || []).map((it, i) => `<div>${itemHtml(it, 'none')}<button data-act="dbuy" data-k="${i}" ${P.gold >= it.price ? '' : 'disabled'}>${it.price}💰</button></div>`).join('') + '</div>';
    h += `<p><button data-act="delixir" ${P.gold >= 150 + P.floor * 20 ? '' : 'disabled'}>Elixir completo (+3 pociones de vida y maná) — ${150 + P.floor * 20} oro</button></p>`;
  }
  if (panel === 'bank') {
    h = close + `<h2>🏦 Banco de Orario</h2><p>Lo que guardas en el banco no se pierde al morir. Interés: 1% diario (máx. 500).</p><p>En mano: 💰 ${P.gold} · En el banco: 🏦 ${P.bank}</p>`;
    for (const v of [100, 1000]) h += `<button data-act="dep" data-k="${v}">Depositar ${v}</button>`; h += `<button data-act="dep" data-k="all">Depositar todo</button><br>`;
    for (const v of [100, 1000]) h += `<button data-act="wd" data-k="${v}">Retirar ${v}</button>`; h += `<button data-act="wd" data-k="all">Retirar todo</button>`;
  }
  if (panel === 'depot') {
    h = close + `<h2>📦 Depósito</h2><p>Almacén ilimitado de objetos (clic para mover).</p><button data-act="depmats">Guardar todos los materiales</button> <button data-act="takemats">Sacar todos los materiales</button><p><small>Materiales guardados: ${Object.entries(P.depotMats || {}).filter(e => e[1] > 0).map(([k, v]) => (MATS[k] || k) + v).join(' ') || 'ninguno'}</small></p>
      <h3>Depósito (${P.depot.length})</h3><div class="grid">${P.depot.map(it => itemHtml(it, 'dtake')).join('')}</div><h3>Mochila</h3><div class="grid">${P.inv.map(it => itemHtml(it, 'dstore')).join('')}</div>`;
  }
  if (panel === 'temple') {
    const down = P.party.filter(a => a.down).length;
    h = close + `<h2>⛪ Templo</h2><p>«Que los dioses te protejan, aventurero.»</p><button data-act="theal">Curación completa (gratis)</button>
      <button data-act="trevive" ${down && P.gold >= 50 * down ? '' : 'disabled'}>Revivir aliados caídos (${down}) — ${50 * down} oro</button>
      <button data-act="tbless" ${P.blessed || P.gold < 50 * P.lvl ? 'disabled' : ''}>Bendición: la próxima muerte no cuesta oro — ${50 * P.lvl} oro</button>${P.blessed ? '<p style="color:#ff9">✨ Estás bendecido.</p>' : ''}`;
  }
  if (panel === 'stable') {
    h = close + `<h2>🐴 Establo de Ryu</h2><p>💰 ${P.gold}</p><h3>Mascotas (te acompañan y luchan)</h3>`;
    for (const k in PETS) { const D = PETS[k], own = P.pets.includes(k); h += `<div>${D.n} — <small>${D.d}</small> ${own ? `<small>[${petName(k)} · ${petData(k).xp}/${petNeed(petData(k).lvl)} XP]</small> <button data-act="setpet" data-k="${k}">${P.pet === k ? '✔ Activa' : 'Llevar'}</button>` : `<button data-act="buypet" data-k="${k}" ${P.gold >= D.price ? '' : 'disabled'}>Comprar ${D.price}💰</button>`}</div>`; }
    h += `<button data-act="setpet" data-k="">Dejar mascota en casa</button><h3>Monturas (N para montar)</h3>`;
    for (const k in MOUNTS) { const D = MOUNTS[k], own = P.mounts.includes(k); h += `<div>${D.n} — <small>${D.d}</small> ${own ? `<button data-act="setmount" data-k="${k}">${P.mount === k ? '✔ Activa' : 'Usar'}</button>` : `<button data-act="buymount" data-k="${k}" ${P.gold >= D.price ? '' : 'disabled'}>Comprar ${D.price}💰</button>`}</div>`; }
  }
  if (panel === 'recruit') {
    h = close + `<h2>⚔ Reclutas del Gremio</h2><p>Forma un grupo como en Grimgar (máx. ${MAX_PARTY} aliados). Suben de nivel contigo. 💰 ${P.gold}</p>`;
    h += P.guildHall ? `<p>🏰 <b>Sede del Gremio</b>: confort ${guildComfort()} → aliados +${Math.round(guildBonus() * 100)}% vida/daño. <button data-act="allyrest">${P.allyRest !== false ? 'Aliados: descansan en la sede (en la ciudad)' : 'Aliados: te siguen en la ciudad'}</button></p>` : `<p><button data-act="buyguild" ${P.gold >= 3000 ? '' : 'disabled'}>🏰 Comprar Sede del Gremio (3000 oro)</button> <small>Vivienda compartida con tus aliados: descansan, se curan, reviven solos y la decoración les da bonus.</small></p>`;
    for (const k in ALLIES) { if (ALLIES[k].story && !P.storyUnlock?.[k]) continue; const D = ALLIES[k], inp = P.party.find(a => a.id === k), cost = D.price + P.lvl * 20; h += `<div style="margin:4px 0"><b style="color:${D.col === '#333' ? '#aaa' : D.col}">${D.n}</b> — ${D.cls} ${D.healer ? '(cura)' : D.taunt ? '(tanque)' : D.range > 1 ? '(distancia)' : '(cuerpo a cuerpo)'} ${inp ? `<button data-act="dismiss" data-k="${k}">Despedir</button> ${inp.down ? '💀' : '❤ ' + inp.hp + '/' + allyMaxHp(k)}` : `<button data-act="hire" data-k="${k}" ${P.party.length < MAX_PARTY && P.gold >= cost ? '' : 'disabled'}>Reclutar ${cost}💰</button>`}</div>`; }
  }
  if (panel === 'recruit') {
    h += P.party.length ? '<h3>Misiones personales</h3>' + P.party.map(a => { const Q = AQUEST[a.id], q = (P.allyQ || {})[a.id] || { p: 0 }; return `<div>${q.done ? '⭐' : '📜'} <b>${ALLIES[a.id].n}</b>: ${Q.n} — <small>${Q.d} ${q.done ? '¡Completada! (Veterano)' : `(${Math.min(q.p, Q.c)}/${Q.c}${Q.rareAlt ? ', raros ' + (q.r || 0) + '/' + Q.rareAlt : ''})`}</small></div>`; }).join('') : '';
  }
  if (panel === 'ach') {
    const got = ACH.filter(a => P.ach[a.id]).length;
    h = close + `<h2>🏆 Logros (${got}/${ACH.length})</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">` + ACH.map(a => `<div style="padding:6px;border-radius:6px;background:${P.ach[a.id] ? '#2a3a1a' : '#0005'};opacity:${P.ach[a.id] ? 1 : .6}">${P.ach[a.id] ? '🏆' : '🔒'} <b>${a.n}</b><br><small>${a.d} · +${a.g} oro</small>${P.ach[a.id] ? `<br><button data-act="title" data-k="${a.n}">${P.title === a.n ? '✔ Título activo' : 'Usar como título'}</button>` : ''}</div>`).join('') + '</div>' + (P.storyTitle ? `<p><button data-act="title" data-k="${P.storyTitle}">Usar título de historia: «${P.storyTitle}»</button></p>` : '') + `<p><button data-act="title" data-k="">Quitar título</button></p>`;
  }
  if (panel === 'options') {
    h = close + `<h2>⚙ Opciones</h2><button data-act="music">${music.on ? '🔇 Silenciar música' : '🎵 Activar música'} (M)</button>
    <h3>Exportar / importar partida</h3><p>Exportar descarga un archivo .txt y muestra el código aquí. Para importar, pega un código y pulsa Importar.</p>
    <button data-act="export">💾 Exportar</button> <button data-act="import">📥 Importar</button><br><textarea id="savetxt" style="width:100%;height:90px;background:#000;color:#9f9;font-size:10px"></textarea>
    <h3>Hechizos (Enter para escribir · F1-F4 atajos)</h3>${[0, 1, 2, 3].map(i => `F${i + 1}: <input id="bind${i}" value="${P.binds[i] || ''}" style="width:160px">`).join(' ')} <button data-act="binds">Guardar atajos</button><p><small>${Object.entries(SPELLS).map(([w, S]) => `<b>${w}</b> (${S.n}, nv ${S.lvl}, ${S.mp} MP)`).join(' · ')}</small></p><h3>Mando</h3><p>Stick/cruceta: mover · A atacar · B usar/cerrar · X bola de fuego · Y golpe · LB/RB pociones · LT/RT torbellino/curar · Select habilidades · Start inventario</p>`;
  }
  if (panel === 'death') {
    h = `<h2 style="color:#f44">💀 Has caído</h2><p>Derrotado por <b>${panel_data.src}</b>.<br>Hestia te rescató y te llevó a la ciudad. Perdiste ${panel_data.lost} de oro.</p><p>Nivel ${P.lvl} · Piso máximo ${P.maxFloor} · Monstruos: ${P.kills}<br>Récord de piso: ${localStorage.getItem('cc_record') || P.maxFloor}</p><button data-act="close">Levantarse</button>`;
  }
  el.innerHTML = h;
  if (panel === 'worldmap') drawWorldMap();
}
$('panel').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) panelAct(b.dataset.act, b.dataset, false); });
$('panel').addEventListener('contextmenu', e => { e.preventDefault(); const b = e.target.closest('[data-act]'); if (b && b.dataset.act === 'equip') panelAct('sell', b.dataset, true); });
$('panel').addEventListener('mousemove', e => { const b = e.target.closest('[data-uid]'), tip = $('tip'); if (!b) { tip.style.display = 'none'; return; } const it = findItem(+b.dataset.uid); if (!it) return; tip.innerHTML = itemTip(it); tip.style.display = 'block'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });
function findItem(u) { return P.inv.find(i => i.uid === u) || (P.mktStock || []).find(i => i.uid === u) || (P.market || []).map(l => l.item).find(i => i.uid === u) || P.depot.find(i => i.uid === u) || (W.mstock || []).find(i => i.uid === u) || Object.values(P.eq).find(i => i && i.uid === u) || (P.chest || []).find(i => i.uid === u); }
function panelAct(a, d) {
  const it = d.uid ? findItem(+d.uid) : null;
  if (a === 'close') return closePanel();
  if (a === 'stat' && P.sp > 0) { P.base[d.k]++; P.sp--; }
  if (a === 'skill') { const s = SKILLS[d.k]; if (P.kp > 0 && P.sk[d.k] < s.max && (!s.req || P.sk[s.req])) { P.kp--; P.sk[d.k]++; snd('lvl'); } }
  if (a === 'equip' && it) { P.inv = P.inv.filter(i => i !== it); if (P.eq[it.slot]) P.inv.push(P.eq[it.slot]); P.eq[it.slot] = it; snd('build'); }
  if (a === 'unequip' && it) { if (P.inv.length < 32) { P.eq[it.slot] = null; P.inv.push(it); } }
  if (a === 'sell' && it && P.inv.includes(it)) { P.inv = P.inv.filter(i => i !== it); P.gold += Math.round(it.value * .5); snd('pick'); }
  if (a === 'sellcommon') { P.inv = P.inv.filter(i => { if (i.rar <= 1) { P.gold += Math.round(i.value * .5); return false; } return true; }); snd('pick'); }
  if (a === 'seed' && P.gold >= CROPS[d.k].price) { P.gold -= CROPS[d.k].price; P.mats['semilla_' + d.k] += 3; snd('pick'); }
  if (a === 'sellcrops') { for (const c in CROPS) { P.gold += P.mats[c] * Math.round(CROPS[c].price / 3); P.mats[c] = 0; } snd('pick'); }
  if (a === 'eat') usePot(d.k);
  if (a === 'music') toggleMusic();
  if (a === 'chat') chat(panel_data.id);
  if (a === 'binds') { for (let i = 0; i < 4; i++) { const el = document.getElementById('bind' + i); if (el) P.binds[i] = el.value.toLowerCase().trim(); } log('Atajos guardados.', '#9f9'); }
  if (a === 'title') { P.title = d.k || ''; }
  if (a === 'dbuy') { const it = W.mstock && W.mstock[+d.k]; if (it && P.gold >= it.price && P.inv.length < 32) { P.gold -= it.price; W.mstock.splice(+d.k, 1); P.inv.push(it); log('Compraste ' + it.name + ' [' + RAR[it.rar] + ']', '#c7f'); snd('pick'); } }
  if (a === 'delixir') { const c = 150 + P.floor * 20; if (P.gold >= c) { P.gold -= c; P.cons.pocion_vida += 3; P.cons.pocion_mana += 3; snd('pick'); } }
  if (a === 'dep') { const v = d.k === 'all' ? P.gold : Math.min(P.gold, +d.k); P.gold -= v; P.bank += v; snd('pick'); }
  if (a === 'wd') { const v = d.k === 'all' ? P.bank : Math.min(P.bank, +d.k); P.bank -= v; P.gold += v; snd('pick'); }
  if (a === 'dstore' && it) { P.inv = P.inv.filter(i => i !== it); P.depot.push(it); }
  if (a === 'dtake' && it && P.inv.length < 32) { P.depot = P.depot.filter(i => i !== it); P.inv.push(it); }
  if (a === 'depmats') { P.depotMats = P.depotMats || {}; for (const k in P.mats) { P.depotMats[k] = (P.depotMats[k] || 0) + P.mats[k]; P.mats[k] = 0; } }
  if (a === 'takemats') { for (const k in P.depotMats || {}) { P.mats[k] = (P.mats[k] || 0) + P.depotMats[k]; } P.depotMats = {}; }
  if (a === 'theal') { P.hp = maxHp(); P.mp = maxMp(); P.party.forEach(x => { if (!x.down) x.hp = allyMaxHp(x.id); }); snd('heal'); }
  if (a === 'trevive') { const down = P.party.filter(x => x.down); if (P.gold >= 50 * down.length) { P.gold -= 50 * down.length; down.forEach(x => { x.down = 0; x.hp = allyMaxHp(x.id); }); buildComps(); snd('heal'); log('Tus aliados han sido revividos.', '#9f9'); } }
  if (a === 'tbless') { const c = 50 * P.lvl; if (!P.blessed && P.gold >= c) { P.gold -= c; P.blessed = 1; snd('heal'); } }
  if (a === 'buypet' && PETS[d.k] && P.gold >= PETS[d.k].price && !P.pets.includes(d.k)) { P.gold -= PETS[d.k].price; P.pets.push(d.k); P.pet = d.k; buildComps(); snd('lvl'); log('¡' + PETS[d.k].n + ' es tu nueva mascota!', '#9cf'); }
  if (a === 'setpet') { P.pet = d.k || null; buildComps(); }
  if (a === 'buymount' && MOUNTS[d.k] && P.gold >= MOUNTS[d.k].price && !P.mounts.includes(d.k)) { P.gold -= MOUNTS[d.k].price; P.mounts.push(d.k); P.mount = d.k; snd('lvl'); log('¡Compraste: ' + MOUNTS[d.k].n + '! Pulsa N para montar.', '#9cf'); }
  if (a === 'setmount') { P.mount = d.k; }
  if (a === 'petelixir') { if ((P.tokens || 0) >= 5 && P.pet) { P.tokens -= 5; petGainXp(petNeed(petData().lvl)); } }
  if (a === 'mlist' && it) { const m = +(document.getElementById('mmult') || { value: 2 }).value; listItem(it.uid, it.value * m); }
  if (a === 'mcancel') { const l = P.market[+d.k]; if (l && P.inv.length < 32) { P.market.splice(+d.k, 1); P.inv.push(l.item); } }
  if (a === 'mcollect') { P.gold += P.marketGold || 0; log('Cobraste ' + (P.marketGold || 0) + ' oro de tus subastas.', '#fd4'); P.marketGold = 0; snd('pick'); }
  if (a === 'mbuy') { const it2 = P.mktStock[+d.k]; if (it2 && P.gold >= it2.price && P.inv.length < 32) { P.gold -= it2.price; P.mktStock.splice(+d.k, 1); P.inv.push(it2); snd('pick'); } }
  if (a === 'buyprot') buyProt();
  if (a === 'toggleprot') P.useProt = !P.useProt;
  if (a === 'openench') { openPanel('enchant'); return; }
  if (a === 'ench' && it) { enchant(it.uid); }
  if (a === 'buyguild') buyGuildHall();
  if (a === 'allyrest') { P.allyRest = P.allyRest === false; buildComps(); }
  if (a === 'story') { storyChoose(+d.k); }
  if (a === 'tbuy' && P.gold >= +d.p) { P.gold -= +d.p; P.cons[d.k]++; snd('pick'); }
  if (a === 'rumor' && P.gold >= 5) { P.gold -= 5; P.lastRumor = pick(['«El mercader errante aparece siempre en los pisos 2, 5, 8…»', '«Bors paga bien el pescado… y Welf adora el hierro.»', '«Con lluvia pican más los peces dorados.»', '«En el Coliseo hay torneo cada 7 días. ¡El campeón gana 100 fichas!»', '«Si escribes adori vita vis con una runa en blanco… boom.»', '«Las mascotas evolucionan a nivel 10.»', '«En la Casa de Subastas, si pides demasiado, nadie compra.»']); }
  if (a === 'round' && P.gold >= 50) { P.gold -= 50; town.npcs.filter(n => n.state === 'tavern' && n.id).forEach(n => addFriend(n.id, 5)); log('🍻 ¡Invitas una ronda! Todos brindan por ti.', '#fc8'); snd('lvl'); }
  if (a === 'arenago') { startArena(); return; }
  if (a === 'tourney') { startArena(true); return; }
  if (a === 'tok') { const c = d.k === 'leg' ? 50 : 15; if ((P.tokens || 0) >= c && P.inv.length < 32) { P.tokens -= c; const it = genItem(null, Math.max(P.lvl, P.maxFloor), d.k === 'leg' ? 4 : 3); P.inv.push(it); log('🎁 ' + it.name + ' [' + RAR[it.rar] + ']', '#fd4'); snd('lvl'); } }
  if (a === 'hire') { const D = ALLIES[d.k], cost = D.price + P.lvl * 20; if (P.party.length < MAX_PARTY && P.gold >= cost && !P.party.find(x => x.id === d.k)) { P.gold -= cost; P.party.push({ id: d.k, hp: allyMaxHp(d.k), down: 0 }); buildComps(); log(D.n + ' (' + D.cls + ') se une a tu grupo.', '#9cf'); snd('lvl'); } }
  if (a === 'dismiss') { P.party = P.party.filter(x => x.id !== d.k); buildComps(); }
  if (a === 'gift') giveGift(panel_data.id, d.k);
  if (a === 'npcrole') { const n = panel_data; talk.direct = 1; try { closePanel(); talk(n); } finally { talk.direct = 0; } return; }
  if (a === 'export') { const t = exportSave(); const ta = document.getElementById('savetxt'); downloadSave(t); drawPanel(); document.getElementById('savetxt').value = t; return; }
  if (a === 'import') { const t = document.getElementById('savetxt').value.trim(); if (importSave(t)) { log('Partida importada.', '#9f9'); closePanel(); } else alert('Código de partida inválido.'); return; }
  if (a === 'buy' && P.gold >= +d.p) { P.gold -= +d.p; P.cons[d.k]++; snd('pick'); }
  if (a === 'buymat') { const c = d.k === 'hierro' ? 40 : 15; if (P.gold >= c) { P.gold -= c; P.mats[d.k] += 5; snd('pick'); } }
  if (a === 'buyequip') { const c = 60 + P.maxFloor * 25; if (P.gold >= c && P.inv.length < 32) { P.gold -= c; const n = genItem(null, P.maxFloor); P.inv.push(n); log('Compraste ' + n.name, '#9cf'); } }
  if (a === 'craft') {
    const r = RECIPES[+d.k]; if (!have(r.in)) return; if (!recipeStations(r).every(hasStation)) { log('Necesitas en tu casa: ' + recipeStations(r).map(x => STN_N[x]).join(', '), '#f88'); return; }
    if (r.id === 'runa_blanca') { for (const k in r.in) P.mats[k] -= r.in[k]; P.runes.blank = (P.runes.blank || 0) + 2; P.crafted++; log('Fabricaste 2 runas en blanco. Escribe «adori gran», «adori vita vis» o «adura vita».', '#c9f'); drawPanel(); return; }
    if (r.id === 'cana') { for (const k in r.in) P.mats[k] -= r.in[k]; P.cana = 1; P.crafted++; log('¡Fabricaste una caña de pescar! Mira al agua y pulsa E.', '#6af'); drawPanel(); return; }
    if (r.id.startsWith('gear:') && P.inv.length >= 32) return log('Inventario lleno.', '#f88');
    for (const k in r.in) P.mats[k] -= r.in[k];
    if (r.id.startsWith('gear:')) { const [, slot, rar] = r.id.split(':'); const n = genItem(slot, Math.max(P.lvl, P.maxFloor), +rar); P.inv.push(n); log('Forjaste: ' + n.name, '#fc6'); }
    else if (CONSUM[r.id]) P.cons[r.id] += r.n || 1; else P.blocks[r.id] = (P.blocks[r.id] || 0) + (r.n || 1);
    snd('build'); gainXp(2); P.crafted++;
  }
  if (a === 'turnin') { const q = QUESTS[P.q]; if (P.qp >= q.c) { questReward(q.rw); P.gold += q.g; gainXp(q.xp); log('Recompensa: ' + q.xp + ' XP y ' + q.g + ' oro.', '#fd4'); P.q++; P.qp = 0; const nq = QUESTS[P.q]; if (nq && nq.t === 'floor') P.qp = P.maxFloor; if (nq && nq.t === 'comfort') P.qp = comfort(); if (nq && nq.t === 'build') P.qp = 0; } }
  if (a === 'upgrade') upgradeHouse();
  if (a === 'floor') { closePanel(); return enterFloor(+d.k); }
  if (a === 'store' && it) { P.chest = P.chest || []; P.inv = P.inv.filter(i => i !== it); P.chest.push(it); }
  if (a === 'take' && it && P.inv.length < 32) { P.chest = P.chest.filter(i => i !== it); P.inv.push(it); }
  drawPanel();
}

// ---------- Guardado ----------
function save() {
  if (!P || !town) return;
  try { P.fieldSeen = packFog();
    const rec = Math.max(+localStorage.getItem('cc_record') || 0, P.maxFloor); localStorage.setItem('cc_record', rec);
    localStorage.setItem('cc_save', JSON.stringify({ v: 5, P: { ...P, target: null, trail: [], say: null, ...(W && W.isArena ? { x: 34, y: 16 } : {}) }, obj: town.obj, crops: town.crops, uid }));
  } catch (e) { }
}
function load() {
  const s = JSON.parse(localStorage.getItem('cc_save') || 'null'); if (!s) return false;
  const d = newPlayer(); P = Object.assign(d, s.P); P.mats = Object.assign(newPlayer().mats, s.P.mats); P.cons = Object.assign(newPlayer().cons, s.P.cons); P.buffs = P.buffs || {}; P.runes = Object.assign({ blank: 0, gfb: 0, sd: 0, uh: 0 }, s.P.runes); P.fieldSeen = s.P.fieldSeen || ''; P.story = Object.assign({ node: 'inicio', p: 0, ready: 0, choices: [], path: null }, s.P.story); P.perks = P.perks || {}; P.storyUnlock = P.storyUnlock || {}; P.target = null; P.cds = {}; uid = s.uid || 1000; visitors = [];
  for (const k in SKILLS) P.sk[k] = P.sk[k] || 0;
  town = genTown(); town.obj = s.obj || {}; if (P.guildHall) paintGuild(town); town.crops = s.crops || {};
  P.trail = []; comps = []; settleNPCs();
  if (P.floor > 0) enterFloor(P.floor); else if (P.field) enterField([P.x, P.y]); else { W = town; P.fx = P.x; P.fy = P.y; if (solidAt(P.x, P.y, true)) { P.x = 20; P.y = 7; P.fx = 20; P.fy = 7; } }
  buildComps(); return true;
}
const CLASSES = {
  guerrero: { n: 'Guerrero', d: 'Fuerte y resistente. Empieza con espada, escudo de vitalidad y Golpe Poderoso.', st: { fue: 3, vit: 3 }, w: 'Espada', sk: 'golpe' },
  mago: { n: 'Mago', d: 'Domina el fuego arcano. Empieza con báculo, mucho maná y Bola de Fuego.', st: { int: 5, vit: 1 }, w: 'Báculo', sk: 'fuego' },
  arquero: { n: 'Arquero', d: 'Ataca a distancia con arco, es ágil y crítico (+8%). Empieza con Piel de Hierro.', st: { agi: 4, fue: 2 }, w: 'Arco', sk: 'piel' },
};
function exportSave() { save(); return btoa(unescape(encodeURIComponent(localStorage.getItem('cc_save')))); }
function downloadSave(t) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'cronicas_partida.txt'; a.click(); } catch (e) { } }
function importSave(t) {
  try { const j = decodeURIComponent(escape(atob(t.trim()))); const o = JSON.parse(j); if (!o || !o.P || typeof o.P.lvl !== 'number') return false; localStorage.setItem('cc_save', j); load(); return true; } catch (e) { return false; }
}
function newGame(cls = 'guerrero') {
  P = newPlayer(); town = genTown(); town.crops = {}; visitors = []; comps = []; W = town; P.x = 20; P.y = 9; P.fx = 20; P.fy = 9;
  const C = CLASSES[cls] || CLASSES.guerrero; P.cls = CLASSES[cls] ? cls : 'guerrero';
  for (const k in C.st) P.base[k] += C.st[k]; P.sk[C.sk] = 1; P.hp = maxHp(); P.mp = maxMp();
  P.eq.arma = genItem('arma', 1, 0, C.w); P.mats.semilla_trigo = 3; P.blocks.cultivo = 2;
  log('Has elegido la clase ' + C.n + '.', '#fc6');
  log('¡Bienvenido a Orario, aventurero!', '#fc6');
  log('Habla con Eina (E) en el gremio para recibir misiones. El calabozo está en la torre al norte.', '#9cf');
  log('Tu parcela de casa está al este: tala, mina, fabrica (C) y construye (B).', '#9cf');
  save();
}
$('bcont').style.display = localStorage.getItem('cc_save') ? '' : 'none';
$('bcont').onclick = () => { if (!load()) newGame(); start(); };
$('bnew').onclick = () => { if (localStorage.getItem('cc_save') && !confirm('¿Borrar la partida actual?')) return; $('cls').style.display = 'flex'; };
document.querySelectorAll('#cls [data-c]').forEach(b => b.onclick = () => { newGame(b.dataset.c); start(); });
$('bimp').onclick = () => $('fimp').click();
$('fimp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { if (importSave(t)) start(); else alert('Archivo de partida inválido.'); }); };
function start() { $('title').style.display = 'none'; paused = false; snd('ui'); }
setInterval(() => { try { if (!paused && P) musicTick(); } catch (e) { } }, 100);
addEventListener('beforeunload', save);

let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!paused && P) { pollPad(); update(dt); render(); hud(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// API de pruebas
window.__game = { get P() { return P; }, get W() { return W; }, get ents() { return ents; }, get drops() { return drops; }, get town() { return town; }, get warns() { return warns; }, get projs() { return projs; }, get panel() { return panel; }, newGame, start, genItem, buyProt, reveal, explored, packFog, updateTraps, getChunk, perf, get useCache() { return useCache; }, set useCache(v) { useCache = v; }, render: () => render(), drawMinimap: () => drawMinimap(), enchant, enchantCost, enchantChance, stat, openChest, stepEvents, checkHouse, drawWorldMap, buyGuildHall, guildComfort, guildBonus, GUILD, storyEvent, storyChoose, storyNode, STORY, useRune, RUNES, petAbility, PETAB, startArenaT: () => startArena(true), finishTourney, rivals, week, tourneyDay, listItem, marketTick, marketChance, updateMarket, updateNPCs, settleNPCs, npcGoal, questReward, xpNeed, castSpell, SPELLS, hour, clock, isOpen, nightLevel, startArena, nextWave, updateArena, get arena() { return arena; }, petGainXp, petData, petMult, petName, allyQuestEvent, allyMult, AQUEST, get comps() { return comps; }, buildComps, updateComps, toggleMount, moveTime, get cam() { return [camX, camY]; }, mmOff: () => drawMinimap.off, PETS, MOUNTS, ALLIES, allyMaxHp, hurtAlly, die, atk, farm, startFishing, updateFishing, get fishing() { return fishing; }, setWeather, get weather() { return weather; }, season, updateSeason, hasStation, recipeStations, enterField, get field() { return field; }, spawnFieldMob, checkExit, giveGift, chat, hearts, addFriend, talk, checkAch, ACH, FRIENDS, growCrops, spawnVisitor, talkVisitor, get visitors() { return visitors; }, music, musicTick, musicTrack, toggleMusic, pollPad, get padDir() { return padDir; }, exportSave, importSave, usePot, playerAttack, isBow, CLASSES, CROPS, onKey, enterFloor, enterTown, update, render, gainXp, spawnEnemy, killEnemy, damageEnemy, pickup, placeBlock, removeBlock, panelAct, openPanel, closePanel, save, load, comfort, upgradeHouse, astar, los, bossAI, questEvent, interact, EN, RECIPES, QUESTS, BLOCKS, T, gt, solidAt, setBuild(i) { buildSel = i; }, BLOCKIDS: () => Object.keys(BLOCKS) };
