"""Extrae las cadenas en español de game.js/index.html (mismas reglas que la tabla i18n)
y devuelve las que, traducidas al inglés, siguen pareciendo español."""
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPANISH = re.compile(r"[ñáéíóú¡¿]|\b([Dd]e|[Dd]el|[Ll]as?|[Ll]os|[Ee]l|[Cc]on|[Pp]ara|[Uu]na|[Pp]or|[Ss]in|[Mm]ás|[Ee]stá|[Hh]oy|[Cc]ada|[Tt]us?|[Qq]ue|[Ee]n|y)\b")
# Nombres propios y palabras que no se traducen
ALLOW = re.compile(r"Ulrik el Coloso|Kael Espadanegra|Selin Vientoalba|Nerea Rúnica|Garrik el Lobo|Lucía|Español|Mordo Kast|exura|exori|exevo|utani|utamo|utevo|adori|adura|Bárbara|Valdoria|Tadeo|Rufina|Ysra|Pipa")
def extract():
    s = open(ROOT + '/game.js', encoding='utf-8').read()
    s = s[:s.index('// ---------- Migración de partidas antiguas')] + s[s.index('function load() {'):]
    out = set()
    def add(seg):
        seg = seg.strip(" ·:,.|—-–()+/")
        if not seg or len(seg) < 3: return
        if re.search(r"[{}=;]|=>|\bconst\b|\breturn\b|px|rgba|#[0-9a-f]{3}|^\w+\(|^[a-z_0-9]+$|data-|style|sans-serif|Georgia", seg): return
        if not re.search(r"[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}", seg): return
        if ' ' in seg or re.search(r"[áéíóúñ¡¿ÁÉÍÓÚ]", seg) or re.match(r"[A-ZÁÉÍÓÚ]", seg): out.add(seg)
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", s):
        v = next(g for g in m.groups() if g is not None)
        for p in re.split(r"\$\{(?:[^{}]|\{[^{}]*\})*\}", v):
            for seg in re.split(r"<[^>]*>|\\n|[«»\"]", p): add(seg)
    h = open(ROOT + '/index.html', encoding='utf-8').read()
    for seg in re.split(r"<[^>]*>", h[h.index('<body>'):h.index('<script')]):
        for x in seg.split('·'): add(x)
    return sorted(out)
def untranslated(page):
    lits = extract()
    res = page.evaluate("L => L.map(s => [s, I18N.tr(s)])", lits) if 'I18N.lang' else None
    bad = [s for s, t in res if SPANISH.search(ALLOW.sub('', t))]
    return lits, bad
