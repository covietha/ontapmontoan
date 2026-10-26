import React, { useRef, useState } from 'react';
import { ImagePlus, Replace, Trash2 } from 'lucide-react';
import { IMG_MD, imageFileToToken, resolveImageSrc } from '../utils/imageStore';

export interface ImgField { key: string; label: string; value: string }

interface Props {
  fields: ImgField[];
  /** Đổi nội dung một ô (key) sang văn bản mới */
  onChange: (key: string, value: string) => void;
  /** Ô nhận hình mới khi bấm "Thêm hình" */
  addTo: string;
}

const SIZES: [string, number][] = [['Nhỏ', 150], ['Vừa', 260], ['Lớn', 380], ['Rộng', 520]];

/** Quản lý hình trong một câu hỏi: xem, đổi hình, đổi cỡ, xóa và thêm hình mới. */
export const QuestionImages: React.FC<Props> = ({ fields, onChange, addTo }) => {
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ key: string; token: string } | null>(null);
  const [err, setErr] = useState('');

  const items: { key: string; label: string; token: string; alt: string; src: string; w: number }[] = [];
  for (const f of fields) {
    for (const m of f.value.matchAll(IMG_MD)) {
      const src = resolveImageSrc(m[2]);
      if (!src) continue;
      items.push({ key: f.key, label: f.label, token: m[0], alt: m[1], src, w: Number(/w=(\d+)/.exec(m[1])?.[1]) || 0 });
    }
  }
  const valueOf = (key: string) => fields.find(f => f.key === key)?.value ?? '';

  const replaceToken = (key: string, oldTok: string, newTok: string) => {
    const v = valueOf(key);
    onChange(key, newTok ? v.replace(oldTok, newTok) : v.replace(new RegExp(`\\n?${oldTok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), ''));
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'add' | 'replace') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr('');
    try {
      const tok = await imageFileToToken(file);
      if (mode === 'add') {
        const v = valueOf(addTo);
        onChange(addTo, `${v}${v && !v.endsWith('\n') ? '\n' : ''}${tok}`);
      } else if (target.current) {
        // giữ cỡ hiện tại của hình cũ
        const oldW = /w=(\d+)/.exec(target.current.token)?.[1];
        replaceToken(target.current.key, target.current.token, oldW ? tok.replace(/w=\d+/, `w=${oldW}`) : tok);
      }
    } catch (ex: any) {
      setErr(ex?.message || 'Không thêm được hình.');
    }
  };

  const resize = (it: (typeof items)[number], w: number) =>
    replaceToken(it.key, it.token, it.token.replace(/!\[[^\]]*\]/, `![w=${w}]`));

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <span className="text-sm font-medium text-slate-700">Hình vẽ trong câu {items.length ? `(${items.length})` : ''}</span>
        <button type="button" onClick={() => addRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
          <ImagePlus className="w-4 h-4" /> Thêm hình
        </button>
        <input ref={addRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={e => onPick(e, 'add')} />
        <input ref={replaceRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={e => onPick(e, 'replace')} />
      </div>
      {items.length === 0 && <p className="text-xs text-slate-500">Chưa có hình. Bấm "Thêm hình" để chèn ảnh (đồ thị, bảng biến thiên…) vào cuối nội dung câu hỏi.</p>}
      {items.map((it, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-slate-200 p-2">
          <img src={it.src} alt="Hình trong câu" className="h-16 max-w-[10rem] object-contain rounded border border-slate-200 bg-white" />
          <div className="text-xs text-slate-500 min-w-[6rem]">{it.label}</div>
          <label className="text-xs text-slate-600 flex items-center gap-1">Cỡ
            <select className="border border-slate-300 rounded px-1.5 py-1 text-sm bg-white" value={SIZES.find(([, v]) => v === it.w)?.[1] ?? 0}
              onChange={e => resize(it, Number(e.target.value))}>
              {!SIZES.some(([, v]) => v === it.w) && <option value={0}>{it.w ? `${it.w}px` : 'Tự động'}</option>}
              {SIZES.map(([n, v]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => { target.current = { key: it.key, token: it.token }; replaceRef.current?.click(); }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1">
              <Replace className="w-4 h-4" /> Thay hình
            </button>
            <button type="button" onClick={() => replaceToken(it.key, it.token, '')}
              className="inline-flex items-center gap-1 text-sm font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
              <Trash2 className="w-4 h-4" /> Xóa
            </button>
          </div>
        </div>
      ))}
      {err && <p className="text-sm text-rose-600">{err}</p>}
    </div>
  );
};
