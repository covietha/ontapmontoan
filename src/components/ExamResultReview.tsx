import React, { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface Outcome {
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  correctOptionIndex: number;
  correctTruths?: boolean[];
  correctAnswers?: string[];
  statementCorrect?: boolean[];
  pendingReview?: boolean;
  explanation: string;
}
interface ReviewQuestion { id: string; type: Outcome['type']; prompt?: string; options?: string[]; statements?: string[] }
interface ReviewRecord {
  id: string; examId: string; examTitle: string; studentEmail: string; score: number;
  correctCount: number; totalCount: number; timeSpentSeconds: number; gradedAt: string;
  userAnswers: Record<string, any>; detailedResults: Record<string, Outcome>; essayCount?: number;
}

const L = ['A', 'B', 'C', 'D'];
const TYPE_LABEL: Record<string, string> = {
  mcq: 'Trắc nghiệm nhiều lựa chọn', true_false: 'Đúng / Sai', short_answer: 'Trả lời ngắn', essay: 'Tự luận'
};
const fmt = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');

interface Props { resultId: string; onClose: () => void }

const ExamResultReview: React.FC<Props> = ({ resultId, onClose }) => {
  const { getIdToken } = useAuth();
  const { questions: bank } = useData();
  const [data, setData] = useState<{ record: ReviewRecord; questions: ReviewQuestion[] } | null>(null);
  const [error, setError] = useState('');
  const [onlyWrong, setOnlyWrong] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/exams/results/${encodeURIComponent(resultId)}/review`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || `Máy chủ trả lỗi ${res.status}`);
        if (alive) setData(j);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Không tải được chi tiết bài thi.');
      }
    })();
    return () => { alive = false; };
  }, [resultId, getIdToken]);

  const items = useMemo(() => {
    if (!data) return [];
    return data.questions.map((q, i) => {
      const b = bank.find(x => x.id === q.id);
      return {
        no: i + 1,
        id: q.id,
        code: b?.code,
        type: q.type,
        prompt: q.prompt ?? b?.prompt ?? '(Không còn nội dung câu hỏi)',
        options: q.options?.length ? q.options : (b?.options || []),
        statements: q.statements?.length ? q.statements : (b?.statements || []),
        out: data.record.detailedResults[q.id],
        ans: data.record.userAnswers[q.id]
      };
    });
  }, [data, bank]);

  const shown = onlyWrong ? items.filter(it => it.out && !it.out.isCorrect && !it.out.pendingReview) : items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">Chi tiết bài làm</h3>
            {data && (
              <p className="text-sm text-slate-600 mt-0.5">
                <strong>{data.record.studentEmail}</strong> • {data.record.examTitle}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Đóng" className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
          {!data && !error && (
            <div className="flex items-center gap-2 text-slate-500 py-10 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Đang tải bài làm…</div>
          )}
          {error && <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-semibold">{error}</div>}

          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="p-3 rounded-2xl bg-blue-50"><div className="text-slate-500 text-xs">Điểm</div><div className="text-xl font-extrabold text-blue-700">{fmt(data.record.score)}/10</div></div>
                <div className="p-3 rounded-2xl bg-slate-50"><div className="text-slate-500 text-xs">Câu đúng hoàn toàn</div><div className="text-xl font-extrabold text-slate-800">{data.record.correctCount}/{data.record.totalCount}</div></div>
                <div className="p-3 rounded-2xl bg-slate-50"><div className="text-slate-500 text-xs">Thời gian làm</div><div className="text-xl font-extrabold text-slate-800">{Math.max(1, Math.round(data.record.timeSpentSeconds / 60))} phút</div></div>
                <div className="p-3 rounded-2xl bg-slate-50"><div className="text-slate-500 text-xs">Nộp lúc</div><div className="text-sm font-bold text-slate-800">{new Date(data.record.gradedAt).toLocaleString('vi-VN')}</div></div>
              </div>
              {!!data.record.essayCount && (
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 text-sm font-semibold">
                  Có {data.record.essayCount} câu tự luận chờ giáo viên chấm, chưa tính vào điểm.
                </div>
              )}
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={onlyWrong} onChange={e => setOnlyWrong(e.target.checked)} className="w-4 h-4" />
                Chỉ hiện các câu chưa đúng
              </label>

              <div className="space-y-4">
                {shown.map(it => {
                  const out = it.out;
                  const pending = out?.pendingReview;
                  const full = out?.isCorrect;
                  const partial = !full && !pending && (out?.points ?? 0) > 0;
                  const badge = pending
                    ? <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold"><Clock className="w-3.5 h-3.5" />Chờ chấm</span>
                    : full
                      ? <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" />Đúng · {fmt(out!.points)}/{fmt(out!.maxPoints)} đ</span>
                      : <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${partial ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}><XCircle className="w-3.5 h-3.5" />{partial ? 'Đúng một phần' : 'Sai'} · {fmt(out?.points ?? 0)}/{fmt(out?.maxPoints ?? 0)} đ</span>;
                  return (
                    <div key={it.id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">Câu {it.no}</span>
                          <span className="text-slate-500">{TYPE_LABEL[it.type]}</span>
                          {it.code && <span className="font-mono text-xs text-slate-400">{it.code}</span>}
                        </div>
                        {badge}
                      </div>

                      <MathRenderer content={it.prompt} className="text-[15px] text-slate-900" />

                      {it.type === 'mcq' && (
                        <div className="space-y-1.5">
                          {it.options.map((opt, i) => {
                            const isCorrect = out?.correctOptionIndex === i;
                            const isPicked = it.ans === i;
                            const cls = isCorrect ? 'border-emerald-400 bg-emerald-50' : isPicked ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white';
                            return (
                              <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-xl border-2 ${cls}`}>
                                <span className={`font-bold w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-sm ${isCorrect ? 'bg-emerald-600 text-white' : isPicked ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{L[i]}</span>
                                <MathRenderer content={opt} className="flex-1 text-[15px] min-w-0" />
                                <span className="shrink-0 text-xs font-bold self-center">
                                  {isCorrect && <span className="text-emerald-700">Đáp án đúng</span>}
                                  {isPicked && !isCorrect && <span className="text-rose-700">HS chọn</span>}
                                  {isPicked && isCorrect && <span className="text-emerald-700"> · HS chọn</span>}
                                </span>
                              </div>
                            );
                          })}
                          {typeof it.ans !== 'number' && <div className="text-sm font-semibold text-rose-700">Học sinh không trả lời câu này.</div>}
                        </div>
                      )}

                      {it.type === 'true_false' && (
                        <div className="space-y-1.5">
                          {it.statements.map((st, i) => {
                            const given = Array.isArray(it.ans) ? it.ans[i] : null;
                            const truth = out?.correctTruths?.[i];
                            const ok = out?.statementCorrect?.[i];
                            const name = (v: boolean | null | undefined) => v === true ? 'Đúng' : v === false ? 'Sai' : 'Bỏ trống';
                            return (
                              <div key={i} className={`flex flex-wrap items-start gap-2.5 p-2.5 rounded-xl border-2 ${ok ? 'border-emerald-300 bg-emerald-50/60' : 'border-rose-300 bg-rose-50/60'}`}>
                                <span className="font-bold text-slate-700 w-6 shrink-0">{'abcd'[i]})</span>
                                <MathRenderer content={st} className="flex-1 min-w-[10rem] text-[15px]" />
                                <div className="text-sm font-bold flex gap-3 shrink-0">
                                  <span className={ok ? 'text-emerald-700' : 'text-rose-700'}>HS chọn: {name(given)}</span>
                                  <span className="text-emerald-700">Đúng: {name(truth)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {it.type === 'short_answer' && (
                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          <div className={`p-3 rounded-xl border-2 ${full ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                            <div className="text-xs text-slate-500 mb-0.5">Học sinh trả lời</div>
                            <div className="font-bold font-mono text-base">{typeof it.ans === 'string' && it.ans.trim() ? it.ans : <em className="font-sans font-semibold text-rose-700">Bỏ trống</em>}</div>
                          </div>
                          <div className="p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50">
                            <div className="text-xs text-slate-500 mb-0.5">Đáp án đúng</div>
                            <div className="font-bold font-mono text-base">{(out?.correctAnswers || []).join('  hoặc  ') || '—'}</div>
                          </div>
                        </div>
                      )}

                      {it.type === 'essay' && (
                        <div className="p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm">
                          <div className="text-xs text-slate-500 mb-1">Bài làm của học sinh</div>
                          <div className="whitespace-pre-wrap">{typeof it.ans === 'string' && it.ans.trim() ? <MathRenderer content={it.ans} /> : <em className="text-rose-700 font-semibold">Bỏ trống</em>}</div>
                        </div>
                      )}

                    </div>
                  );
                })}
                {shown.length === 0 && <div className="text-center text-slate-500 py-6 font-semibold">Không có câu nào chưa đúng 🎉</div>}
              </div>
            </>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default ExamResultReview;
