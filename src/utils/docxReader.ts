import JSZip from 'jszip';
import * as CFB from 'cfb';
import { renderToSvg } from 'wmf-emf-renderer';
import { parseMtef } from './mtef';
import { mtefToLatex } from './mtefLatex';
import { ommlToLatex } from './omml';
import { shrinkImage as shrink } from './imageStore';

/**
 * Đọc file Word (.docx) thành văn bản có giữ nguyên:
 *  - công thức MathType (đối tượng OLE) và công thức Word (OMML) → LaTeX trong $...$
 *  - hình vẽ, bảng biến thiên, đồ thị … → thẻ ![w=300](img:ID)
 *  - số thứ tự tự động (A., B., a), 1.) → chữ thật
 */

export interface RichDocx {
  text: string;
  /** id hình → data URL (PNG, JPEG, SVG…) */
  images: Record<string, string>;
  stats: { equations: number; mathtype: number; omml: number; images: number; unreadable: number };
  warnings: string[];
}

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

const kids = (el: Element) => Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1);
const nm = (el: Element) => el.localName || el.nodeName.replace(/^.*:/, '');
const kid = (el: Element | null | undefined, name: string) => (el ? kids(el).find(k => nm(k) === name) : undefined);
const attr = (el: Element | null | undefined, ...names: string[]) => {
  if (!el) return null;
  for (const n of names) { const v = el.getAttribute(n); if (v !== null && v !== '') return v; }
  return null;
};
function* descendants(el: Element): Generator<Element> {
  for (const k of kids(el)) { yield k; yield* descendants(k); }
}

function toBase64(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function utf8ToBase64(str: string): string {
  return toBase64(new TextEncoder().encode(str));
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

function romanOf(n: number, upper: boolean) {
  const t: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return upper ? s.toUpperCase() : s;
}
function fmtNum(n: number, fmt: string) {
  switch (fmt) {
    case 'upperLetter': return String.fromCharCode(64 + ((n - 1) % 26) + 1);
    case 'lowerLetter': return String.fromCharCode(96 + ((n - 1) % 26) + 1);
    case 'upperRoman': return romanOf(n, true);
    case 'lowerRoman': return romanOf(n, false);
    default: return String(n);
  }
}

interface Level { fmt: string; text: string; start: number }

export async function readDocxRich(data: ArrayBuffer | Uint8Array): Promise<RichDocx> {
  const zip = await JSZip.loadAsync(data);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('File không phải tài liệu Word (.docx) hợp lệ.');
  const parser = new DOMParser();
  const parse = async (path: string) => {
    const f = zip.file(path);
    return f ? parser.parseFromString(await f.async('string'), 'application/xml') : null;
  };
  const doc = parser.parseFromString(await docFile.async('string'), 'application/xml');
  const relsDoc = await parse('word/_rels/document.xml.rels');
  const numDoc = await parse('word/numbering.xml');

  const rels = new Map<string, { target: string; type: string }>();
  if (relsDoc) {
    for (const r of Array.from(relsDoc.getElementsByTagName('Relationship'))) {
      let t = r.getAttribute('Target') || '';
      t = t.startsWith('/') ? t.slice(1) : `word/${t}`;
      rels.set(r.getAttribute('Id') || '', { target: t.replace(/\/\.\//g, '/'), type: r.getAttribute('Type') || '' });
    }
  }

  const stats = { equations: 0, mathtype: 0, omml: 0, images: 0, unreadable: 0 };
  const warnings: string[] = [];
  const images: Record<string, string> = {};
  const imageIdByPath = new Map<string, string>();
  const imageCache = new Map<string, string | null>(); // path → dataUrl
  const oleCache = new Map<string, string | null>(); // path → latex

  // Nạp trước hình và đối tượng công thức (bất đồng bộ), phần duyệt cây sau đó chạy đồng bộ
  const jobs: Promise<void>[] = [];
  for (const { target, type } of rels.values()) {
    const f = zip.file(target);
    if (!f) continue;
    if (/\/image$/.test(type)) {
      jobs.push((async () => {
        const ext = (target.split('.').pop() || '').toLowerCase();
        const bytes = await f.async('uint8array');
        try {
          if (MIME[ext]) imageCache.set(target, await shrink(`data:${MIME[ext]};base64,${toBase64(bytes)}`));
          else if (ext === 'wmf' || ext === 'emf') {
            const svg = renderToSvg(bytes, {});
            imageCache.set(target, `data:image/svg+xml;base64,${utf8ToBase64(svg)}`);
          } else imageCache.set(target, null);
        } catch { imageCache.set(target, null); }
      })());
    } else if (/\/oleObject$/.test(type)) {
      jobs.push((async () => {
        try {
          const bytes = await f.async('uint8array');
          const cfb = CFB.read(bytes, { type: 'array' });
          const entry = CFB.find(cfb, 'Equation Native');
          const tree = entry && entry.content ? parseMtef(new Uint8Array(entry.content as ArrayLike<number>)) : null;
          const latex = tree ? mtefToLatex(tree) : '';
          oleCache.set(target, latex || null);
        } catch { oleCache.set(target, null); }
      })());
    }
  }
  await Promise.all(jobs);

  const imageToken = (rid: string | null, widthPx: number): string => {
    const rel = rid ? rels.get(rid) : undefined;
    if (!rel) return '';
    const url = imageCache.get(rel.target);
    if (!url) { stats.unreadable++; return ''; }
    let id = imageIdByPath.get(rel.target);
    if (!id) {
      id = `d${imageIdByPath.size + 1}`;
      imageIdByPath.set(rel.target, id);
      images[id] = url;
    }
    stats.images++;
    return `![w=${Math.round(widthPx) || 0}](img:${id})`;
  };

  // ───── Số thứ tự tự động ─────
  const abstractLevels = new Map<string, Level[]>();
  const numToAbstract = new Map<string, string>();
  if (numDoc) {
    for (const a of Array.from(numDoc.getElementsByTagName('w:abstractNum'))) {
      const id = a.getAttribute('w:abstractNumId') || '';
      const lv: Level[] = [];
      for (const l of kids(a).filter(k => nm(k) === 'lvl')) {
        const i = Number(l.getAttribute('w:ilvl') || 0);
        lv[i] = {
          fmt: attr(kid(l, 'numFmt'), 'w:val') || 'decimal',
          text: attr(kid(l, 'lvlText'), 'w:val') || '',
          start: Number(attr(kid(l, 'start'), 'w:val') || 1)
        };
      }
      abstractLevels.set(id, lv);
    }
    for (const n of Array.from(numDoc.getElementsByTagName('w:num'))) {
      numToAbstract.set(n.getAttribute('w:numId') || '', attr(kid(n, 'abstractNumId'), 'w:val') || '');
    }
  }
  const counters = new Map<string, number[]>();
  const listLabel = (p: Element): string => {
    const numPr = kid(kid(p, 'pPr'), 'numPr');
    if (!numPr) return '';
    const numId = attr(kid(numPr, 'numId'), 'w:val') || '';
    if (!numId || numId === '0') return '';
    const ilvl = Number(attr(kid(numPr, 'ilvl'), 'w:val') || 0);
    const levels = abstractLevels.get(numToAbstract.get(numId) || '');
    const lv = levels?.[ilvl];
    if (!lv || lv.fmt === 'bullet' || lv.fmt === 'none') return '';
    const c = counters.get(numId) || [];
    c[ilvl] = c[ilvl] === undefined ? lv.start : c[ilvl] + 1;
    for (let i = ilvl + 1; i < c.length; i++) c[i] = undefined as unknown as number;
    counters.set(numId, c);
    return lv.text.replace(/%(\d)/g, (_m, d) => {
      const idx = Number(d) - 1;
      const l2 = levels![idx];
      const v = c[idx] ?? l2?.start ?? 1;
      return fmtNum(v, l2?.fmt || 'decimal');
    });
  };

  // ───── Duyệt nội dung ─────
  const px = (cx: string | null) => (cx ? Number(cx) / 9525 : 0);
  const ptToPx = (style: string | null, key: 'width' | 'height') => {
    const m = style && new RegExp(`${key}:\\s*([\\d.]+)(pt|px)?`).exec(style);
    return m ? Number(m[1]) * (m[2] === 'px' ? 1 : 1.333) : 0;
  };

  const drawingToken = (d: Element): string => {
    const blip = Array.from(descendants(d)).find(e => nm(e) === 'blip');
    if (!blip) return '';
    const ext = Array.from(descendants(d)).find(e => nm(e) === 'extent');
    return imageToken(attr(blip, 'r:embed', 'embed'), px(attr(ext, 'cx')));
  };

  const objectToken = (o: Element): string => {
    const ole = Array.from(descendants(o)).find(e => nm(e) === 'OLEObject');
    const shape = Array.from(descendants(o)).find(e => nm(e) === 'shape');
    const progId = attr(ole, 'ProgID') || '';
    if (ole && /Equation|DSMT|MathType/i.test(progId)) {
      const rel = rels.get(attr(ole, 'r:id', 'id') || '');
      const latex = rel ? oleCache.get(rel.target) : null;
      if (latex) { stats.equations++; stats.mathtype++; return `$${latex}$`; }
    }
    // Không đọc được công thức (hoặc không phải công thức): dùng ảnh xem trước nếu có
    const img = Array.from(descendants(o)).find(e => nm(e) === 'imagedata');
    if (img) {
      const style = attr(shape, 'style');
      return imageToken(attr(img, 'r:id', 'id'), ptToPx(style, 'width'));
    }
    return '';
  };

  const pictToken = (pict: Element): string => {
    if (Array.from(descendants(pict)).some(e => nm(e) === 'textbox')) return '';
    const img = Array.from(descendants(pict)).find(e => nm(e) === 'imagedata');
    if (!img) return '';
    const shape = Array.from(descendants(pict)).find(e => nm(e) === 'shape');
    return imageToken(attr(img, 'r:id', 'id'), ptToPx(attr(shape, 'style'), 'width'));
  };

  let out = '';
  const emit = (s: string) => {
    if (!s) return;
    if (s.startsWith('$') && out.endsWith('$')) out += ' ';
    out += s;
  };

  const runChild = (rc: Element): string => {
    switch (nm(rc)) {
      case 't': return rc.textContent || '';
      case 'tab': return ' ';
      case 'br': case 'cr': return attr(rc, 'w:type') === 'page' ? '' : '\n';
      case 'noBreakHyphen': return '-';
      case 'drawing': return drawingToken(rc);
      case 'pict': return pictToken(rc);
      case 'object': return objectToken(rc);
      case 'AlternateContent': {
        const ch = kids(rc).find(k => nm(k) === 'Choice') || kids(rc).find(k => nm(k) === 'Fallback');
        return ch ? kids(ch).map(runChild).join('') : '';
      }
      default: return '';
    }
  };

  const inline = (el: Element) => {
    for (const c of kids(el)) {
      switch (nm(c)) {
        case 'r': {
          const va = attr(kid(kid(c, 'rPr'), 'vertAlign'), 'w:val');
          let t = kids(c).map(runChild).join('').replace(/ /g, ' ');
          if ((va === 'superscript' || va === 'subscript') && t.trim() && !t.includes('![') && !t.includes('$')) {
            t = `$${va === 'superscript' ? '^' : '_'}{${t.trim()}}$`;
          }
          emit(t);
          break;
        }
        case 'hyperlink': case 'ins': case 'smartTag': case 'sdt': case 'sdtContent': case 'fldSimple': case 'customXml': case 'AlternateContent':
          inline(nm(c) === 'AlternateContent' ? (kids(c).find(k => nm(k) === 'Choice') || kids(c)[0] || c) : c);
          break;
        case 'oMath': {
          const l = ommlToLatex(c);
          if (l) { stats.equations++; stats.omml++; emit(`$${l}$`); }
          break;
        }
        case 'oMathPara':
          for (const m of kids(c).filter(k => nm(k) === 'oMath')) {
            const l = ommlToLatex(m);
            if (l) { stats.equations++; stats.omml++; emit(`$${l}$`); }
          }
          break;
        default: break; // del, bookmark, proofErr, pPr …
      }
    }
  };

  const lines: string[] = [];
  const para = (p: Element) => {
    out = '';
    const label = listLabel(p);
    if (label) out = `${label} `;
    inline(p);
    lines.push(out.replace(/[ \t]+$/g, ''));
  };
  const block = (el: Element) => {
    for (const c of kids(el)) {
      switch (nm(c)) {
        case 'p': para(c); break;
        case 'tbl':
          for (const tr of kids(c).filter(k => nm(k) === 'tr'))
            for (const tc of kids(tr).filter(k => nm(k) === 'tc')) block(tc);
          break;
        case 'sdt': { const sc = kid(c, 'sdtContent'); if (sc) block(sc); break; }
        default: break;
      }
    }
  };
  const body = Array.from(doc.getElementsByTagNameNS(NS_W, 'body'))[0] || doc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('Không đọc được nội dung file Word.');
  block(body);

  if (stats.unreadable > 0) warnings.push(`${stats.unreadable} hình/công thức không đọc được (định dạng lạ). Thầy kiểm tra lại các câu có hình.`);
  return { text: lines.join('\n'), images, stats, warnings };
}
