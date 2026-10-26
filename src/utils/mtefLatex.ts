import type { MNode, MChar, MTmpl } from './mtef';

const GREEK_LOWER: Record<number, string> = {
  0x3b1: '\\alpha', 0x3b2: '\\beta', 0x3b3: '\\gamma', 0x3b4: '\\delta', 0x3b5: '\\varepsilon', 0x3b6: '\\zeta',
  0x3b7: '\\eta', 0x3b8: '\\theta', 0x3b9: '\\iota', 0x3ba: '\\kappa', 0x3bb: '\\lambda', 0x3bc: '\\mu',
  0x3bd: '\\nu', 0x3be: '\\xi', 0x3bf: 'o', 0x3c0: '\\pi', 0x3c1: '\\rho', 0x3c2: '\\varsigma', 0x3c3: '\\sigma',
  0x3c4: '\\tau', 0x3c5: '\\upsilon', 0x3c6: '\\varphi', 0x3c7: '\\chi', 0x3c8: '\\psi', 0x3c9: '\\omega',
  0x3d5: '\\phi', 0x3d1: '\\vartheta', 0x3d6: '\\varpi', 0x3f5: '\\epsilon'
};
const GREEK_UPPER: Record<number, string> = {
  0x393: '\\Gamma', 0x394: '\\Delta', 0x398: '\\Theta', 0x39b: '\\Lambda', 0x39e: '\\Xi', 0x3a0: '\\Pi',
  0x3a3: '\\Sigma', 0x3a5: '\\Upsilon', 0x3a6: '\\Phi', 0x3a8: '\\Psi', 0x3a9: '\\Omega'
};
const SYMBOLS: Record<number, string> = {
  0x2212: '-', 0xd7: '\\times', 0xb7: '\\cdot', 0x22c5: '\\cdot', 0xf7: '\\div', 0xb1: '\\pm', 0x2213: '\\mp',
  0x221e: '\\infty', 0x2264: '\\le', 0x2265: '\\ge', 0x2260: '\\ne', 0x2248: '\\approx', 0x2245: '\\cong',
  0x2208: '\\in', 0x2209: '\\notin', 0x220b: '\\ni', 0x2282: '\\subset', 0x2283: '\\supset', 0x2286: '\\subseteq',
  0x2287: '\\supseteq', 0x2284: '\\not\\subset', 0x222a: '\\cup', 0x2229: '\\cap', 0x2205: '\\emptyset',
  0x2200: '\\forall', 0x2203: '\\exists', 0x2192: '\\to', 0x2190: '\\leftarrow', 0x2194: '\\leftrightarrow',
  0x21d2: '\\Rightarrow', 0x21d0: '\\Leftarrow', 0x21d4: '\\Leftrightarrow', 0x2191: '\\uparrow', 0x2193: '\\downarrow',
  0x2220: '\\angle', 0x2225: '\\parallel', 0x22a5: '\\perp', 0x25b3: '\\triangle', 0xb0: '^\\circ',
  0x2032: "'", 0x2033: "''", 0x2202: '\\partial', 0x2207: '\\nabla', 0x2211: '\\sum', 0x220f: '\\prod',
  0x222b: '\\int', 0x222c: '\\iint', 0x222d: '\\iiint', 0x222e: '\\oint', 0x221a: '\\surd', 0x2026: '\\ldots',
  0x22ef: '\\cdots', 0x22ee: '\\vdots', 0x22f1: '\\ddots', 0x2218: '\\circ', 0x2234: '\\therefore', 0x2235: '\\because',
  0x2261: '\\equiv', 0x223c: '\\sim', 0x221d: '\\propto', 0x2223: '\\mid', 0x2124: '\\mathbb{Z}', 0x211d: '\\mathbb{R}',
  0x2115: '\\mathbb{N}', 0x211a: '\\mathbb{Q}', 0x2102: '\\mathbb{C}', 0x2113: '\\ell', 0x210f: '\\hbar',
  0x2297: '\\otimes', 0x2295: '\\oplus', 0x22c3: '\\bigcup', 0x22c2: '\\bigcap', 0x2216: '\\setminus',
  0x2016: '\\|', 0x27e8: '\\langle', 0x27e9: '\\rangle', 0x2329: '\\langle', 0x232a: '\\rangle', 0xa0: '\\ ',
  0x2009: '\\,', 0x2002: '\;', 0x2003: '\\quad', 0x22b2: '\\triangleleft', 0x2713: '\\checkmark',
  0x2243: '\\simeq', 0x226a: '\\ll', 0x226b: '\\gg', 0x2262: '\\not\\equiv', 0x21a6: '\\mapsto', 0x27f6: '\\longrightarrow',
  0x27f9: '\\Longrightarrow', 0x27fa: '\\Longleftrightarrow', 0x21c0: '\\rightharpoonup', 0x2312: '\\frown'
};
const ASCII_ESC: Record<string, string> = {
  '{': '\\{', '}': '\\}', '\\': '\\backslash ', '#': '\\#', '%': '\\%', '&': '\\&', '_': '\\_', '$': '\\$', '~': '\\sim ', '^': '\\hat{}'
};
const TEXT_ESC: Record<string, string> = {
  '{': '\\{', '}': '\\}', '\\': '\\textbackslash ', '#': '\\#', '%': '\\%', '&': '\\&', '_': '\\_', '$': '\\$', '~': '\\sim ', '^': '\\^{}'
};
const FUNC_NAMES = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lg', 'lim', 'max', 'min', 'exp', 'det', 'dim', 'gcd', 'arg', 'sup', 'inf', 'deg', 'ker', 'sinh', 'cosh', 'tanh', 'coth', 'arcsin', 'arccos', 'arctan', 'liminf', 'limsup', 'Pr', 'hom']);
const FENCE: Record<number, [string, string]> = {
  0x28: ['(', ')'], 0x29: ['(', ')'], 0x5b: ['[', ']'], 0x5d: ['[', ']'], 0x7b: ['\\{', '\\}'], 0x7d: ['\\{', '\\}'],
  0x7c: ['|', '|'], 0x2016: ['\\|', '\\|'], 0x27e8: ['\\langle', '\\rangle'], 0x27e9: ['\\langle', '\\rangle'],
  0x2329: ['\\langle', '\\rangle'], 0x232a: ['\\langle', '\\rangle'], 0x230a: ['\\lfloor', '\\rfloor'], 0x230b: ['\\lfloor', '\\rfloor'],
  0x2308: ['\\lceil', '\\rceil'], 0x2309: ['\\lceil', '\\rceil']
};
const FENCE_OPEN = new Set([0x28, 0x5b, 0x7b, 0x27e8, 0x2329, 0x230a, 0x2308]);

/** Ký tự đơn → LaTeX (không xét kiểu chữ). */
export function charToLatex(c: MChar): string {
  const code = c.code;
  if (code >= 0xef00 && code <= 0xefff) return '\\,'; // khoảng cách của MathType
  if (code >= 0xf000 && code <= 0xf0ff) { // phông Symbol cũ: đưa về mã gốc
    const low = code - 0xf000;
    if (low >= 0x20 && low < 0x7f && c.tf !== 6) return ASCII_ESC[String.fromCharCode(low)] || String.fromCharCode(low);
  }
  if (GREEK_LOWER[code]) return GREEK_LOWER[code] + ' ';
  if (GREEK_UPPER[code]) return GREEK_UPPER[code] + ' ';
  if (SYMBOLS[code]) { const v = SYMBOLS[code]; return /^\\[a-zA-Z]+$/.test(v) ? v + ' ' : v; }
  if (code === 0x20) return '';
  if (code < 0x80) { const ch = String.fromCharCode(code); return ASCII_ESC[ch] || ch; }
  return String.fromCodePoint(code);
}

const EMBELL: Record<number, (s: string) => string> = {
  2: s => `\\dot{${s}}`, 3: s => `\\ddot{${s}}`, 4: s => `\\dddot{${s}}`,
  5: s => `${s}'`, 6: s => `${s}''`, 7: s => `${s}'''`,
  8: s => `\\tilde{${s}}`, 9: s => `\\hat{${s}}`, 10: s => `\\not ${s}`,
  11: s => `\\overrightarrow{${s}}`, 12: s => `\\overleftarrow{${s}}`, 13: s => `\\overleftrightarrow{${s}}`,
  16: s => `\\underline{${s}}`, 17: s => `\\overline{${s}}`, 18: s => `\\overset{\\frown}{${s}}`
};

function applyEmbells(s: string, c: MChar) {
  let out = s;
  for (const e of c.embells) { const f = EMBELL[e]; if (f) out = f(out); }
  return out;
}

const isLine = (n: MNode) => n.k === 'line';
const lineOf = (t: MTmpl) => t.items.filter(isLine);
const sub = (n: MNode | undefined) => (n ? renderNode(n).trim() : '');

function fenceLatex(t: MTmpl, inner: string): string {
  const chars = t.items.filter((n): n is MChar => n.k === 'char');
  const hasL = !!(t.vari & 1);
  const hasR = !!(t.vari & 2);
  const left = hasL ? chars[0] : undefined;
  const right = hasR ? chars[hasL ? 1 : 0] : undefined;
  const pick = (c: MChar | undefined, idx: 0 | 1) => {
    if (!c) return '.';
    const f = FENCE[c.code];
    if (f) return f[idx];
    const raw = charToLatex(c).trim();
    return raw || '.';
  };
  return `\\left${pick(left, 0)} ${inner} \\right${pick(right, 1)}`;
}

function bigOp(t: MTmpl, name: string, limits = true): string {
  const lines = lineOf(t);
  const operand = sub(lines[0]);
  const lo = sub(lines[1]);
  const up = sub(lines[2]);
  const ch = t.items.find((n): n is MChar => n.k === 'char');
  const op = ch && ch.code !== 0x20 ? (SYMBOLS[ch.code] ? SYMBOLS[ch.code].trim() : name) : name;
  const lim = limits ? '\\limits' : '';
  return `${op}${lim}${lo ? `_{${lo}}` : ''}${up ? `^{${up}}` : ''} ${operand}`;
}

function renderTmpl(t: MTmpl): string {
  const lines = lineOf(t);
  const slots = t.items.filter(n => n.k !== 'char');
  switch (t.sel) {
    case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7: case 8: case 9:
      return fenceLatex(t, slots.map(renderNode).join(' ').trim());
    case 10: { // căn
      const rad = sub(lines[0]); const idx = sub(lines[1]);
      return idx ? `\\sqrt[${idx}]{${rad}}` : `\\sqrt{${rad}}`;
    }
    case 11: // phân số
      return t.vari === 1 ? `{${sub(lines[0])}}/{${sub(lines[1])}}` : `\\frac{${sub(lines[0])}}{${sub(lines[1])}}`;
    case 12: return `\\underline{${sub(lines[0])}}`;
    case 13: return `\\overline{${sub(lines[0])}}`;
    case 14: { // mũi tên trên/dưới
      const ch = t.items.find((n): n is MChar => n.k === 'char');
      const main = sub(lines[0]) || sub(lines[1]);
      const code = ch?.code ?? 0x2192;
      if (code === 0x2190) return `\\overleftarrow{${main}}`;
      if (code === 0x2194) return `\\overleftrightarrow{${main}}`;
      return `\\overrightarrow{${main}}`;
    }
    case 15: return bigOp(t, '\\int', false);
    case 16: return bigOp(t, '\\sum');
    case 17: return bigOp(t, '\\prod');
    case 18: return bigOp(t, '\\coprod');
    case 19: return bigOp(t, '\\bigcup');
    case 20: return bigOp(t, '\\bigcap');
    case 21: case 22: return bigOp(t, '\\sum');
    case 23: { // giới hạn
      const label = sub(lines[0]) || '\\lim';
      const lo = sub(lines[1]); const up = sub(lines[2]);
      const name = /^\\[a-z]+$/.test(label) ? label : `\\operatorname*{${label.replace(/\\mathrm\{([^}]*)\}/g, '$1')}}`;
      return `${name}${lo ? `_{${lo}}` : ''}${up ? `^{${up}}` : ''} `;
    }
    case 24: return (t.vari & 1) ? `\\overbrace{${sub(lines[0])}}^{${sub(lines[1])}}` : `\\underbrace{${sub(lines[0])}}_{${sub(lines[1])}}`;
    case 25: return (t.vari & 1) ? `\\overset{${sub(lines[1])}}{${sub(lines[0])}}` : `\\underset{${sub(lines[1])}}{${sub(lines[0])}}`;
    case 27: return `_{${sub(lines[0])}}`;
    case 28: return `^{${sub(lines.length > 1 ? lines[1] : lines[0])}}`;
    case 29: {
      const lo = sub(lines[0]); const up = sub(lines[1]);
      return `${lo ? `_{${lo}}` : ''}${up ? `^{${up}}` : ''}`;
    }
    case 31: {
      const ch = t.items.find((n): n is MChar => n.k === 'char');
      const main = sub(lines[0]);
      if (ch?.code === 0x2190) return `\\overleftarrow{${main}}`;
      if (ch?.code === 0x2194) return `\\overleftrightarrow{${main}}`;
      return `\\overrightarrow{${main}}`;
    }
    case 32: return `\\widetilde{${sub(lines[0])}}`;
    case 33: return `\\widehat{${sub(lines[0])}}`;
    case 34: return `\\overset{\\frown}{${sub(lines[0])}}`;
    case 36: return `\\cancel{${sub(lines[0])}}`;
    case 37: return `\\boxed{${sub(lines[0])}}`;
    default:
      return slots.map(renderNode).join(' ');
  }
}

function renderNode(n: MNode): string {
  switch (n.k) {
    case 'line': return renderItems(n.items);
    case 'tmpl': return renderTmpl(n);
    case 'pile': {
      const al = n.halign === 1 ? 'l' : n.halign === 3 ? 'r' : 'c';
      const rows = n.items.map(renderNode);
      return `\\begin{array}{${al}} ${rows.join(' \\\\ ')} \\end{array}`;
    }
    case 'matrix': {
      const rows: string[] = [];
      for (let i = 0; i < n.rows; i++) {
        const cells: string[] = [];
        for (let j = 0; j < n.cols; j++) cells.push(renderNode(n.items[i * n.cols + j] || { k: 'line', items: [] }));
        rows.push(cells.join(' & '));
      }
      return `\\begin{array}{${'c'.repeat(n.cols)}} ${rows.join(' \\\\ ')} \\end{array}`;
    }
    case 'char': return applyEmbells(charToLatex(n), n);
  }
}

/** Ghép dãy đối tượng: gom chữ của hàm (sin, lim…) và chữ thường (TEXT) thành một khối. */
function renderItems(items: MNode[]): string {
  let out = '';
  for (let i = 0; i < items.length; i++) {
    const n = items[i];
    if (n.k === 'char' && n.tf === 2 && /[A-Za-z]/.test(String.fromCharCode(n.code)) && n.code < 0x80) {
      let j = i; let name = '';
      while (j < items.length) {
        const m = items[j];
        if (m.k === 'char' && m.tf === 2 && m.code < 0x80 && /[A-Za-z]/.test(String.fromCharCode(m.code)) && m.embells.length === 0) { name += String.fromCharCode(m.code); j++; } else break;
      }
      if (name) {
        out += FUNC_NAMES.has(name) ? `\\${name} ` : `\\mathrm{${name}}`;
        i = j - 1; continue;
      }
    }
    if (n.k === 'char' && n.tf === 1) {
      let j = i; let txt = '';
      while (j < items.length) {
        const m = items[j];
        if (m.k === 'char' && m.tf === 1 && m.embells.length === 0) { txt += String.fromCodePoint(m.code || 0x20); j++; } else break;
      }
      if (/^\s*[A-Za-z0-9]\s*$/.test(txt)) {
        out += txt.trim();
      } else if (txt.trim()) {
        const esc = txt.replace(/[{}\\#%&_$~^]/g, ch => TEXT_ESC[ch] || ch);
        out += `\\text{${esc}}`;
      } else out += ' ';
      i = j - 1; continue;
    }
    if (n.k === 'char' && n.tf === 7 && /[A-Za-z]/.test(String.fromCharCode(n.code))) {
      out += `\\mathbf{${String.fromCharCode(n.code)}}`; continue;
    }
    const piece = renderNode(n);
    // chỉ số trên/dưới cần có phần gốc đứng trước
    if (n.k === 'tmpl' && (n.sel === 27 || n.sel === 28 || n.sel === 29) && !out.trim()) out += '{}';
    out += piece;
  }
  return out;
}

export function mtefToLatex(tree: MNode[]): string {
  const raw = tree.map(renderNode).join(' ');
  return raw.replace(/\s+/g, ' ').replace(/\{\s+/g, '{').replace(/\s+\}/g, '}').trim();
}
