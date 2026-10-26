/**
 * Đọc công thức MathType (MTEF v5) lưu trong file Word dạng đối tượng OLE ("Equation Native").
 * Kết quả là cây bản ghi, sau đó mtefToLatex() đổi sang LaTeX.
 */

export interface MChar { k: 'char'; tf: number; code: number; ch8: number; embells: number[] }
export interface MLine { k: 'line'; items: MNode[] }
export interface MTmpl { k: 'tmpl'; sel: number; vari: number; opts: number; items: MNode[] }
export interface MPile { k: 'pile'; halign: number; valign: number; items: MNode[] }
export interface MMatrix { k: 'matrix'; rows: number; cols: number; items: MNode[] }
export type MNode = MChar | MLine | MTmpl | MPile | MMatrix;

class Reader {
  p: number;
  constructor(public d: Uint8Array, start: number) { this.p = start; }
  get eof() { return this.p >= this.d.length; }
  u8() { return this.d[this.p++]; }
  u16() { const v = this.d[this.p] | (this.d[this.p + 1] << 8); this.p += 2; return v; }
  i16() { const v = this.u16(); return v & 0x8000 ? v - 0x10000 : v; }
  cstr() { while (!this.eof && this.d[this.p] !== 0) this.p++; this.p++; }
}

const OPT_NUDGE = 0x08;

function readNudge(r: Reader) {
  const x = r.u8(); const y = r.u8();
  if (x === 128 && y === 128) { r.i16(); r.i16(); }
}

/** Đọc mảng kích thước/khoảng cách dạng nibble của bản ghi EQN_PREFS. */
function readDimArray(r: Reader) {
  const n = r.u8();
  let nib = -1; // nibble còn lại của byte hiện tại
  const next = () => {
    if (nib >= 0) { const v = nib; nib = -1; return v; }
    const b = r.u8(); nib = b & 0x0f; return b >> 4;
  };
  for (let i = 0; i < n; i++) {
    next(); // đơn vị
    for (let guard = 0; guard < 40; guard++) { if (next() === 0x0f) break; }
  }
}

function parseList(r: Reader): MNode[] {
  const out: MNode[] = [];
  while (!r.eof) {
    const t = r.u8();
    switch (t) {
      case 0: return out; // END
      case 1: { // LINE
        const o = r.u8();
        if (o & OPT_NUDGE) readNudge(r);
        if (o & 0x04) r.i16();
        if (o & 0x02) { const n = r.u8(); r.p += n * 3; } // thước tab
        const line: MLine = { k: 'line', items: [] };
        if (!(o & 0x01)) line.items = parseList(r);
        out.push(line);
        break;
      }
      case 2: { // CHAR
        const o = r.u8();
        if (o & OPT_NUDGE) readNudge(r);
        const tf = r.u8() - 128;
        let code = 0; let ch8 = 0;
        if (!(o & 0x20)) code = r.u16();
        if (o & 0x04) ch8 = r.u8();
        if (o & 0x10) ch8 = r.u16();
        const embells: number[] = [];
        if (o & 0x01) {
          // danh sách EMBELL kết thúc bằng END
          while (!r.eof) {
            const et = r.u8();
            if (et === 0) break;
            if (et === 6) { const eo = r.u8(); if (eo & OPT_NUDGE) readNudge(r); embells.push(r.u8()); }
            else break;
          }
        }
        out.push({ k: 'char', tf, code: code || ch8, ch8, embells });
        break;
      }
      case 3: { // TMPL
        const o = r.u8();
        if (o & OPT_NUDGE) readNudge(r);
        const sel = r.u8();
        let vari = r.u8();
        if (vari & 0x80) vari = (vari & 0x7f) | (r.u8() << 8);
        const opts = r.u8();
        out.push({ k: 'tmpl', sel, vari, opts, items: parseList(r) });
        break;
      }
      case 4: { // PILE
        const o = r.u8();
        if (o & OPT_NUDGE) readNudge(r);
        const halign = r.u8(); const valign = r.u8();
        out.push({ k: 'pile', halign, valign, items: parseList(r) });
        break;
      }
      case 5: { // MATRIX
        const o = r.u8();
        if (o & OPT_NUDGE) readNudge(r);
        r.u8(); r.u8(); r.u8(); // valign, h_just, v_just
        const rows = r.u8(); const cols = r.u8();
        r.p += Math.ceil(((rows + 1) * 2) / 8);
        r.p += Math.ceil(((cols + 1) * 2) / 8);
        out.push({ k: 'matrix', rows, cols, items: parseList(r) });
        break;
      }
      case 6: { const o = r.u8(); if (o & OPT_NUDGE) readNudge(r); r.u8(); break; } // EMBELL lạc chỗ
      case 7: { const n = r.u8(); r.p += n * 3; break; } // RULER
      case 8: r.u8(); r.u8(); break; // FONT_STYLE_DEF
      case 9: { const l = r.u8(); if (l === 101) r.u16(); else r.u8(); break; } // SIZE
      case 10: case 11: case 12: case 13: case 14: break; // FULL, SUB, SUB2, SYM, SUBSYM
      case 15: r.u8(); break; // COLOR
      case 16: { const o = r.u8(); r.p += (o & 1) ? 8 : 6; if (o & 4) r.cstr(); break; } // COLOR_DEF
      case 17: r.u8(); r.cstr(); break; // FONT_DEF
      case 18: { // EQN_PREFS
        r.u8(); readDimArray(r); readDimArray(r);
        const n = r.u8();
        for (let i = 0; i < n; i++) { if (r.u8() !== 0) r.u8(); }
        break;
      }
      case 19: r.cstr(); break; // ENCODING_DEF
      default: return out; // bản ghi lạ: dừng để không đọc sai
    }
  }
  return out;
}

/** data: nội dung luồng "Equation Native" của đối tượng OLE. Trả về danh sách bản ghi gốc (thường là 1 LINE hoặc PILE). */
export function parseMtef(data: Uint8Array): MNode[] | null {
  if (data.length < 40) return null;
  const hdr = data[0] | (data[1] << 8);
  const r = new Reader(data, hdr);
  if (r.u8() !== 5) return null; // chỉ hỗ trợ MTEF v5 (MathType 5 trở lên)
  r.u8(); r.u8(); r.u8(); r.u8();
  r.cstr(); // khóa ứng dụng
  r.u8(); // tùy chọn
  try { return parseList(r); } catch { return null; }
}
