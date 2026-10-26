import { charToLatex } from './mtefLatex';

/** Đổi công thức Word dạng OMML (<m:oMath>) sang LaTeX. */

const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lg', 'lim', 'max', 'min', 'exp', 'det', 'gcd', 'arg', 'sup', 'inf', 'deg', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan']);

const kids = (el: Element) => Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1);
const nameOf = (el: Element) => (el.localName || el.nodeName.replace(/^.*:/, ''));
const child = (el: Element, name: string) => kids(el).find(k => nameOf(k) === name);
const val = (el: Element | undefined, name: string) => {
  const p = el && child(el, name);
  return p ? p.getAttribute('m:val') ?? p.getAttribute('val') : null;
};

function textRun(r: Element): string {
  const t = kids(r).filter(k => nameOf(k) === 't').map(k => k.textContent || '').join('');
  const plain = val(child(r, 'rPr'), 'sty') === 'p' || val(child(r, 'rPr'), 'nor') !== null;
  let out = '';
  for (const ch of Array.from(t)) {
    const cp = ch.codePointAt(0)!;
    if (ch === ' ') { out += '\\ '; continue; }
    out += charToLatex({ k: 'char', tf: 3, code: cp, ch8: 0, embells: [] });
  }
  if (plain && /^[A-Za-z]{2,}$/.test(t)) return FUNCS.has(t) ? `\\${t} ` : `\\mathrm{${t}}`;
  if (/^[A-Za-z]{2,}$/.test(t) && FUNCS.has(t)) return `\\${t} `;
  return out;
}

function arg(el: Element | undefined): string {
  return el ? seq(el) : '';
}

function seq(el: Element): string {
  let out = '';
  for (const k of kids(el)) out += node(k);
  return out;
}

const ACC: Record<string, string> = {
  '̂': '\\hat', '^': '\\hat', '̃': '\\tilde', '~': '\\tilde', '̄': '\\bar', '¯': '\\bar',
  '⃗': '\\vec', '→': '\\vec', '̇': '\\dot', '̈': '\\ddot', '̌': '\\check', '̆': '\\breve'
};

function node(el: Element): string {
  switch (nameOf(el)) {
    case 'r': return textRun(el);
    case 'f': {
      const type = val(child(el, 'fPr'), 'type');
      const n = arg(child(el, 'num')); const d = arg(child(el, 'den'));
      if (type === 'lin') return `{${n}}/{${d}}`;
      if (type === 'noBar') return `\\binom{${n}}{${d}}`;
      return `\\frac{${n}}{${d}}`;
    }
    case 'sSup': return `{${arg(child(el, 'e'))}}^{${arg(child(el, 'sup'))}}`;
    case 'sSub': return `{${arg(child(el, 'e'))}}_{${arg(child(el, 'sub'))}}`;
    case 'sSubSup': return `{${arg(child(el, 'e'))}}_{${arg(child(el, 'sub'))}}^{${arg(child(el, 'sup'))}}`;
    case 'sPre': return `{}_{${arg(child(el, 'sub'))}}^{${arg(child(el, 'sup'))}}{${arg(child(el, 'e'))}}`;
    case 'rad': {
      const hide = val(child(el, 'radPr'), 'degHide');
      const deg = arg(child(el, 'deg'));
      return deg && hide !== '1' && hide !== 'on' ? `\\sqrt[${deg}]{${arg(child(el, 'e'))}}` : `\\sqrt{${arg(child(el, 'e'))}}`;
    }
    case 'd': {
      const pr = child(el, 'dPr');
      const beg = pr ? val(pr, 'begChr') : '(';
      const end = pr ? val(pr, 'endChr') : ')';
      const sep = (pr && val(pr, 'sepChr')) ?? '|';
      const fence = (c: string | null, dflt: string) => {
        if (c === null || c === undefined) return dflt;
        if (c === '') return '.';
        if (c === '{') return '\\{'; if (c === '}') return '\\}';
        if (c === '⟨') return '\\langle'; if (c === '⟩') return '\\rangle';
        if (c === '‖') return '\\|';
        return c;
      };
      const parts = kids(el).filter(k => nameOf(k) === 'e').map(arg);
      const joiner = sep === '|' && !pr ? '|' : sep;
      return `\\left${fence(beg, '(')} ${parts.join(` ${joiner} `)} \\right${fence(end, ')')}`;
    }
    case 'nary': {
      const pr = child(el, 'naryPr');
      const chr = pr ? val(pr, 'chr') : '∫';
      const map: Record<string, string> = { '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap' };
      const op = map[chr || '∫'] || '\\int';
      const lo = arg(child(el, 'sub')); const up = arg(child(el, 'sup'));
      const lim = op === '\\sum' || op === '\\prod' ? '\\limits' : '';
      return `${op}${lim}${lo ? `_{${lo}}` : ''}${up ? `^{${up}}` : ''} ${arg(child(el, 'e'))}`;
    }
    case 'func': return `${arg(child(el, 'fName'))} ${arg(child(el, 'e'))}`;
    case 'limLow': {
      const base = arg(child(el, 'e'));
      const lim = arg(child(el, 'lim'));
      return /^\\[a-z]+ ?$/.test(base) ? `${base}\\limits_{${lim}}` : `\\underset{${lim}}{${base}}`;
    }
    case 'limUpp': return `\\overset{${arg(child(el, 'lim'))}}{${arg(child(el, 'e'))}}`;
    case 'acc': {
      const chr = val(child(el, 'accPr'), 'chr') || '̂';
      return `${ACC[chr] || '\\hat'}{${arg(child(el, 'e'))}}`;
    }
    case 'bar': return val(child(el, 'barPr'), 'pos') === 'bot' ? `\\underline{${arg(child(el, 'e'))}}` : `\\overline{${arg(child(el, 'e'))}}`;
    case 'groupChr': return arg(child(el, 'e'));
    case 'box': case 'phant': return arg(child(el, 'e'));
    case 'borderBox': return `\\boxed{${arg(child(el, 'e'))}}`;
    case 'eqArr': {
      const rows = kids(el).filter(k => nameOf(k) === 'e').map(arg);
      return `\\begin{array}{l} ${rows.join(' \\\\ ')} \\end{array}`;
    }
    case 'm': {
      const rows = kids(el).filter(k => nameOf(k) === 'mr').map(mr => kids(mr).filter(k => nameOf(k) === 'e').map(arg));
      const cols = Math.max(1, ...rows.map(r => r.length));
      return `\\begin{array}{${'c'.repeat(cols)}} ${rows.map(r => r.join(' & ')).join(' \\\\ ')} \\end{array}`;
    }
    case 'e': case 'num': case 'den': case 'sub': case 'sup': case 'deg': case 'lim': case 'fName':
      return seq(el);
    case 'oMath': return seq(el);
    default: return '';
  }
}

export function ommlToLatex(oMath: Element): string {
  return seq(oMath).replace(/\s+/g, ' ').trim();
}
