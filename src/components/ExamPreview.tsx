import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

export interface PreviewQuestion {
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
  prompt: string;
  options: string[];
  statements: string[];
  truths: (boolean | null)[];
  correctOptionIndex: number;
  acceptedText: string;
  explanation: string;
}

interface Props {
  title: string;
  durationMinutes: number;
  questions: PreviewQuestion[];
  onClose: () => void;
}

const PARTS: { kind: PreviewQuestion['type']; title: string }[] = [
  { kind: 'mcq', title: 'Phần 1: Trắc nghiệm lựa chọn' },
  { kind: 'true_false', title: 'Phần 2: Trắc nghiệm Đúng/Sai' },
  { kind: 'short_answer', title: 'Phần 3: Trả lời ngắn' },
  { kind: 'essay', title: 'Phần 4: Tự luận' }
];
const letters = ['A', 'B', 'C', 'D'];

/** Xem trước đề đúng như học sinh sẽ thấy trong phòng thi; có thể bật hiện đáp án để soát lại. */
export const ExamPreview: React.FC<Props> = ({ title, durationMinutes, questions, onClose }) => {
  const [idx, setIdx] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const [fontPx, setFontPx] = useState(17);
  const q = questions[idx];

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-100 flex flex-col">
      <div className="shrink-0 bg-amber-100 border-b border-amber-300 px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-bold text-amber-900"><Eye className="w-4 h-4" /> Xem trước — học sinh sẽ thấy đề như dưới đây</span>
        <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer select-none">
          <input type="checkbox" checked={showKey} onChange={e => setShowKey(e.target.checked)} className="w-4 h-4" /> Hiện đáp án đúng
        </label>
        <span className="text-slate-600 hidden sm:inline">Cỡ chữ</span>
        <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
          <button onClick={() => setFontPx(f => Math.max(14, f - 1))} className="px-2.5 py-0.5 font-bold hover:bg-slate-100" aria-label="Giảm cỡ chữ">A−</button>
          <span className="px-1.5 font-semibold tabular-nums">{fontPx}px</span>
          <button onClick={() => setFontPx(f => Math.min(26, f + 1))} className="px-2.5 py-0.5 font-bold hover:bg-slate-100" aria-label="Tăng cỡ chữ">A+</button>
        </div>
        <button onClick={onClose} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold px-3 py-1.5">
          <X className="w-4 h-4" /> Đóng xem trước
        </button>
      </div>

      <div className="exam-focus flex-1 min-h-0 p-2.5 flex flex-col lg:flex-row gap-3">
        <section className="order-2 lg:order-1 flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col min-h-0">
          {q ? (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="font-mono text-sm font-extrabold px-3 py-1 rounded-lg bg-blue-600 text-white">Câu {idx + 1}</span>
                  <span className="text-sm text-slate-500">{PARTS.find(p => p.kind === q.type)?.title.split(':')[1]?.trim()}</span>
                </div>
                <div className="font-medium text-slate-900 leading-relaxed" style={{ fontSize: fontPx }}>
                  <MathRenderer content={q.prompt || '(chưa có nội dung)'} />
                </div>

                {q.type === 'mcq' && (
                  <div className="space-y-2" style={{ fontSize: fontPx }}>
                    {q.options.map((o, i) => {
                      const right = showKey && q.correctOptionIndex === i;
                      return (
                        <div key={i} className={`w-full px-3 py-2 rounded-xl border-2 flex items-start gap-3 ${right ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                          <span className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center shrink-0 text-sm ${right ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{letters[i]}</span>
                          <div className="font-medium flex-1 pt-0.5 overflow-x-auto"><MathRenderer content={o || '(trống)'} inline /></div>
                          {right && <span className="text-xs font-bold text-emerald-700 self-center">Đáp án đúng</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="space-y-2" style={{ fontSize: fontPx }}>
                    {q.statements.map((st, i) => (
                      <div key={i} className="rounded-xl border-2 border-slate-200 px-3 py-2 flex flex-wrap sm:flex-nowrap items-center gap-3">
                        <div className="flex gap-2 shrink-0">
                          {([true, false] as const).map(v => {
                            const right = showKey && q.truths[i] === v;
                            return <span key={String(v)} className={`w-10 h-10 rounded-xl border-2 font-bold flex items-center justify-center ${right ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 text-slate-600 bg-white'}`}>{v ? 'Đ' : 'S'}</span>;
                          })}
                        </div>
                        <div className="flex-1 min-w-0 overflow-x-auto">
                          <span className="font-semibold text-slate-600 mr-2">{'abcd'[i]})</span>
                          <MathRenderer content={st || '(trống)'} inline />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'short_answer' && (
                  <div className="space-y-2">
                    <div className="block text-sm font-semibold text-slate-600">Nhập đáp án (một số)</div>
                    <div className="w-full sm:max-w-sm rounded-2xl border-2 border-slate-300 px-4 py-3 text-slate-400" style={{ fontSize: fontPx }}>Ví dụ: 12,5</div>
                    {showKey && <p className="text-base text-emerald-800 font-semibold">Đáp án đúng: {q.acceptedText || '(chưa nhập)'}</p>}
                  </div>
                )}

                {q.type === 'essay' && (
                  <div className="space-y-2">
                    <div className="block text-sm font-semibold text-slate-600">Bài làm của em</div>
                    <div className="w-full min-h-[8rem] rounded-2xl border-2 border-slate-300 px-4 py-3 text-slate-400" style={{ fontSize: fontPx }}>Trình bày lời giải...</div>
                  </div>
                )}

                {showKey && q.explanation && (
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                    <div className="font-bold text-blue-800 mb-1 text-sm">Lời giải</div>
                    <div className="text-slate-700" style={{ fontSize: fontPx }}><MathRenderer content={q.explanation} /></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 shrink-0">
                <button disabled={idx === 0} onClick={() => setIdx(i => i - 1)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${idx === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 border border-slate-200'}`}>
                  <ArrowLeft className="w-4 h-4" /> Câu trước
                </button>
                <button disabled={idx === questions.length - 1} onClick={() => setIdx(i => i + 1)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${idx === questions.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  Câu tiếp theo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : <p className="text-slate-500">Đề chưa có câu hỏi nào.</p>}
        </section>

        <aside className="order-1 lg:order-2 lg:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col gap-3 lg:overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-3">{title || '(chưa đặt tên đề)'}</h2>
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl font-mono text-lg font-black border bg-slate-100 border-slate-200 text-slate-800">
            <Clock className="w-4 h-4 text-slate-500" /> {String(durationMinutes).padStart(2, '0')}:00
          </div>
          <div className="font-bold text-slate-800 text-sm">Bảng câu hỏi ({questions.length})</div>
          {PARTS.map(part => {
            const items = questions.map((qq, i) => ({ qq, i })).filter(x => x.qq.type === part.kind);
            if (!items.length) return null;
            return (
              <div key={part.kind} className="space-y-2">
                <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1 text-sm">{part.title}</div>
                <div className="grid grid-cols-5 gap-2">
                  {items.map(({ i }) => (
                    <button key={i} onClick={() => setIdx(i)} aria-label={`Câu ${i + 1}`}
                      className={`h-9 rounded-xl text-sm font-bold border bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 ${idx === i ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>
      </div>
    </div>,
    document.body
  );
};

export default ExamPreview;
