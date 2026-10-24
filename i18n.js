// ---------- i18n: idioma de la interfaz (es / en) ----------
// Todas las cadenas del juego pasan por tr(): textos del DOM (paneles, HUD, registro, tutorial, título),
// atributos (placeholder/title), canvas (fillText/measureText) y diálogos (alert/confirm).
(function () {
  let LANG = localStorage.getItem('cc_lang') || 'es';
  const EN = I18N_EN, WORDS = I18N_WORDS_EN;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(EN).sort((a, b) => b.length - a.length);
  const L = '\\p{L}';
  const phraseRe = new RegExp(keys.map(k => (/^[\p{L}]/u.test(k) ? `(?<!${L})` : '') + esc(k) + (/[\p{L}]$/u.test(k) ? `(?!${L})` : '')).join('|'), 'gu');
  const wordRe = new RegExp(`(?<!${L})(` + Object.keys(WORDS).sort((a, b) => b.length - a.length).map(esc).join('|') + `)(?!${L})`, 'gu');
  const cache = new Map(); const stats = { hits: 0, miss: 0 };
  function tr(s) {
    if (LANG !== 'en' || typeof s !== 'string' || !s || !/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(s)) return s;
    let r = cache.get(s); if (r !== undefined) { stats.hits++; return r; }
    stats.miss++;
    const t = s.trim();
    if (EN[t] != null) r = s.replace(t, EN[t]);
    else r = s.replace(phraseRe, m => EN[m]).replace(wordRe, m => WORDS[m]);
    if (cache.size > 6000) cache.clear(); cache.set(s, r); return r;
  }
  // DOM
  const orig = new WeakMap(), origAttr = new WeakMap(); let busy = false;
  function trNode(n) {
    if (n.nodeType === 3) {
      if (n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)) return;
      const cur = n.nodeValue; let o = orig.get(n);
      if (o === undefined || (o.t !== cur)) { o = { s: cur, t: null }; orig.set(n, o); }
      const out = LANG === 'en' ? tr(o.s) : o.s; o.t = out; if (cur !== out) n.nodeValue = out;
    } else if (n.nodeType === 1) {
      for (const a of ['placeholder', 'title']) if (n.hasAttribute && n.hasAttribute(a)) { let m = origAttr.get(n) || {}; if (m[a] == null || (m[a + '_t'] !== n.getAttribute(a))) m[a] = n.getAttribute(a); const out = LANG === 'en' ? tr(m[a]) : m[a]; m[a + '_t'] = out; origAttr.set(n, m); if (n.getAttribute(a) !== out) n.setAttribute(a, out); }
      if (/^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
      for (const c of n.childNodes) trNode(c);
    }
  }
  function trAll(root) { busy = true; try { trNode(root || document.body); } finally { busy = false; } }
  const mo = new MutationObserver(list => { if (busy || (LANG !== 'en' && !trAll.dirty)) return; busy = true; try { for (const m of list) { if (m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trNode); if (m.type === 'attributes') trNode(m.target); } } finally { busy = false; } });
  addEventListener('DOMContentLoaded', () => { mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title'] }); trAll(); document.documentElement.lang = LANG; });
  // Canvas
  const P2 = CanvasRenderingContext2D.prototype, ft = P2.fillText, st = P2.strokeText, mt = P2.measureText;
  P2.fillText = function (s, ...a) { return ft.call(this, tr(String(s)), ...a); };
  P2.strokeText = function (s, ...a) { return st.call(this, tr(String(s)), ...a); };
  P2.measureText = function (s) { return mt.call(this, tr(String(s))); };
  const al = window.alert, cf = window.confirm, pr = window.prompt;
  window.alert = m => al.call(window, tr(String(m))); window.confirm = m => cf.call(window, tr(String(m))); window.prompt = (m, d) => pr.call(window, tr(String(m)), d);
  function setLang(l) { LANG = l === 'en' ? 'en' : 'es'; localStorage.setItem('cc_lang', LANG); document.documentElement.lang = LANG; trAll.dirty = true; trAll(); trAll.dirty = false; }
  window.I18N = { tr, setLang, get lang() { return LANG; }, trAll, stats, size: keys.length };
  window.tr = tr;
})();
