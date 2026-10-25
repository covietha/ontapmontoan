import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Upload, Download, Trash2, Save, Send, ArrowUp, ArrowDown, Pencil,
  Eye, EyeOff, AlertTriangle, CheckCircle2, FileText, X, Clock, ListChecks
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { MathRenderer } from './MathRenderer';
import { parseDocxFile, downloadWordQuestionSampleGuide } from '../utils/fileParsers';
import type { QuestionDifficulty } from '../types';

interface DraftQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number; // -1 = chưa chọn
  explanation: string;
  difficulty: QuestionDifficulty;
  lessonCode?: string;
  needsReview?: boolean;
  reviewReason?: string;
}

interface ServerExam {
  id: string;
  code: string;
  title: string;
  description: string;
  durationMinutes: number;
  grade: number;
  status: 'draft' | 'published';
  source: 'manual' | 'docx_import';
  createdAt: string;
  updatedAt: string;
  questions: {
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    difficulty: QuestionDifficulty;
    lessonCode?: string;
  }[];
}

interface Draft {
  id: string | null;
  title: string;
  code: string;
  description: string;
  durationMinutes: number;
  grade: number;
  source: 'manual' | 'docx_import';
  questions: DraftQuestion[];
}

const DIFFS: { v: QuestionDifficulty; l: string }[] = [
  { v: 'nhan_biet', l: 'Nhận biết' },
  { v: 'thong_hieu', l: 'Thông hiểu' },
  { v: 'van_dung', l: 'Vận dụng' },
  { v: 'van_dung_cao', l: 'Vận dụng cao' }
];

let keySeq = 0;
const newKey = () => `k${Date.now()}_${keySeq++}`;
const blankQuestion = (): DraftQuestion => ({
  key: newKey(), prompt: '', options: ['', '', '', ''], correctOptionIndex: -1, explanation: '', difficulty: 'thong_hieu'
});
const blankDraft = (): Draft => ({
  id: null, title: '', code: '', description: '', durationMinutes: 45, grade: 12, source: 'manual', questions: [blankQuestion()]
});

interface Props {
  /** Báo cho thanh trạng thái biết đang ở màn nào: 'list' hoặc 'editor'. */
  onModeChange?: (mode: 'list' | 'editor') => void;
}

export const ExamManager: React.FC<Props> = ({ onModeChange }) => {
  const { getIdToken } = useAuth();
  const { refreshExams } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exams, setExams] = useState<ServerExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [importInfo, setImportInfo] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<ServerExam | null>(null);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getIdToken();
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
    return data;
  }, [getIdToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExams(await api('/api/exams/manage'));
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);
  const modeCb = useRef(onModeChange);
  modeCb.current = onModeChange;
  const mode = draft ? 'editor' : 'list';
  useEffect(() => { modeCb.current?.(mode); }, [mode]);

  const openEditor = (exam?: ServerExam) => {
    setNotice(null);
    setImportInfo([]);
    setPreview({});
    if (!exam) return setDraft(blankDraft());
    setDraft({
      id: exam.id, title: exam.title, code: exam.code, description: exam.description,
      durationMinutes: exam.durationMinutes, grade: exam.grade, source: exam.source,
      questions: exam.questions.map(q => ({ key: newKey(), ...q }))
    });
  };

  const patchQ = (key: string, patch: Partial<DraftQuestion>) =>
    setDraft(d => d && { ...d, questions: d.questions.map(q => (q.key === key ? { ...q, ...patch, needsReview: patch.needsReview ?? q.needsReview } : q)) });

  const moveQ = (idx: number, dir: -1 | 1) =>
    setDraft(d => {
      if (!d) return d;
      const to = idx + dir;
      if (to < 0 || to >= d.questions.length) return d;
      const qs = [...d.questions];
      [qs[idx], qs[to]] = [qs[to], qs[idx]];
      return { ...d, questions: qs };
    });

  const handleWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setNotice({ type: 'err', text: 'Chỉ nhận file Word đuôi .docx. Thầy lưu lại file sang .docx rồi chọn lại nhé.' });
      return;
    }
    setImporting(true);
    setNotice(null);
    try {
      const r = await parseDocxFile(file);
      setImportInfo(r.errors);
      if (r.questions.length === 0) {
        setNotice({ type: 'err', text: 'Không nhận ra câu hỏi nào trong file. Xem "Mẫu định dạng Word" để soạn đúng cấu trúc.' });
        return;
      }
      const added: DraftQuestion[] = r.questions.map(q => ({
        key: newKey(),
        prompt: q.prompt,
        options: [0, 1, 2, 3].map(i => q.options[i] || ''),
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        lessonCode: q.lessonCode || undefined,
        needsReview: q.needsReview,
        reviewReason: q.reviewReason
      }));
      setDraft(d => {
        if (!d) return d;
        // Bỏ câu trống mặc định nếu chưa nhập gì
        const base = d.questions.length === 1 && !d.questions[0].prompt.trim() ? [] : d.questions;
        return {
          ...d,
          source: 'docx_import',
          title: d.title || file.name.replace(/\.docx$/i, ''),
          questions: [...base, ...added]
        };
      });
      const review = added.filter(q => q.needsReview).length;
      setNotice({
        type: 'ok',
        text: `Đã nhập ${added.length} câu từ "${file.name}".${review ? ` Có ${review} câu cần thầy kiểm tra lại (đánh dấu màu vàng).` : ''}`
      });
    } finally {
      setImporting(false);
    }
  };

  /** Trả về lỗi đầu tiên tìm thấy, hoặc null nếu hợp lệ. */
  const problem = (d: Draft): string | null => {
    if (!d.title.trim()) return 'Vui lòng nhập tên đề thi.';
    if (!(d.durationMinutes >= 1 && d.durationMinutes <= 300)) return 'Thời gian làm bài phải từ 1 đến 300 phút.';
    if (d.questions.length === 0) return 'Đề cần ít nhất 1 câu hỏi.';
    for (let i = 0; i < d.questions.length; i++) {
      const q = d.questions[i];
      if (!q.prompt.trim()) return `Câu ${i + 1}: chưa có nội dung câu hỏi.`;
      if (q.options.some(o => !o.trim())) return `Câu ${i + 1}: cần đủ 4 phương án A, B, C, D.`;
      if (q.correctOptionIndex < 0 || q.correctOptionIndex > 3) return `Câu ${i + 1}: chưa chọn đáp án đúng.`;
    }
    return null;
  };

  const save = async (status: 'draft' | 'published') => {
    if (!draft) return;
    const err = problem(draft);
    if (err) return setNotice({ type: 'err', text: err });
    setSaving(true);
    setNotice(null);
    try {
      const body = JSON.stringify({
        title: draft.title, code: draft.code, description: draft.description,
        durationMinutes: draft.durationMinutes, grade: draft.grade, source: draft.source, status,
        questions: draft.questions.map(({ prompt, options, correctOptionIndex, explanation, difficulty, lessonCode }) =>
          ({ prompt, options, correctOptionIndex, explanation, difficulty, lessonCode }))
      });
      await api(draft.id ? `/api/exams/${draft.id}` : '/api/exams', { method: draft.id ? 'PUT' : 'POST', body });
      await Promise.all([load(), refreshExams()]);
      setDraft(null);
      setNotice({
        type: 'ok',
        text: status === 'published'
          ? 'Đã phát hành. Học sinh thấy đề này ngay trong Luyện tập & thi thử → Phòng thi thử.'
          : 'Đã lưu nháp. Học sinh chưa thấy đề này.'
      });
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (exam: ServerExam) => {
    try {
      await api(`/api/exams/${exam.id}`, { method: 'PUT', body: JSON.stringify({ ...exam, status: exam.status === 'published' ? 'draft' : 'published' }) });
      await Promise.all([load(), refreshExams()]);
      setNotice({ type: 'ok', text: exam.status === 'published' ? 'Đã gỡ đề khỏi phòng thi của học sinh.' : 'Đã phát hành đề cho học sinh.' });
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const remove = async (exam: ServerExam) => {
    try {
      await api(`/api/exams/${exam.id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      await Promise.all([load(), refreshExams()]);
      setNotice({ type: 'ok', text: `Đã xóa đề "${exam.title}".` });
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  const NoticeBar = notice && (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
      {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{notice.text}</span>
      <button onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X className="w-4 h-4" /></button>
    </div>
  );

  /* ───────────────────────── Trình soạn đề ───────────────────────── */
  if (draft) {
    const reviewCount = draft.questions.filter(q => q.needsReview).length;
    return (
      <div className="space-y-5 max-w-5xl">
        {NoticeBar}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="grid md:grid-cols-6 gap-4">
            <label className="md:col-span-4 text-sm font-medium text-slate-700 space-y-1.5 block">
              Tên đề thi
              <input className={inputCls} value={draft.title} maxLength={200} placeholder="VD: Đề kiểm tra Đạo hàm – Lớp 12"
                onChange={e => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="md:col-span-2 text-sm font-medium text-slate-700 space-y-1.5 block">
              Mã đề (tùy chọn)
              <input className={inputCls} value={draft.code} maxLength={40} placeholder="Tự tạo nếu để trống"
                onChange={e => setDraft({ ...draft, code: e.target.value })} />
            </label>
            <label className="md:col-span-4 text-sm font-medium text-slate-700 space-y-1.5 block">
              Mô tả ngắn
              <input className={inputCls} value={draft.description} maxLength={1000} placeholder="Nội dung, phạm vi kiến thức…"
                onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="md:col-span-1 text-sm font-medium text-slate-700 space-y-1.5 block">
              Thời gian (phút)
              <input type="number" min={1} max={300} className={inputCls} value={draft.durationMinutes}
                onChange={e => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} />
            </label>
            <label className="md:col-span-1 text-sm font-medium text-slate-700 space-y-1.5 block">
              Khối
              <select className={inputCls} value={draft.grade} onChange={e => setDraft({ ...draft, grade: Number(e.target.value) })}>
                {[10, 11, 12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={handleWord} />
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">
              <Upload className="w-4 h-4" /> {importing ? 'Đang đọc file…' : 'Nhập câu hỏi từ file Word'}
            </button>
            <button onClick={downloadWordQuestionSampleGuide}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2">
              <Download className="w-4 h-4" /> Mẫu định dạng Word
            </button>
            <span className="text-xs text-slate-500">Mỗi lần nhập sẽ thêm vào cuối đề. Câu nhập xong vẫn sửa tay được.</span>
          </div>

          {importInfo.length > 0 && (
            <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 list-disc pl-6">
              {importInfo.slice(0, 8).map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </section>

        {reviewCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Còn {reviewCount} câu máy chưa chắc chắn khi đọc từ Word. Thầy kiểm tra đáp án trước khi phát hành.
          </div>
        )}

        <ol className="space-y-4">
          {draft.questions.map((q, idx) => (
            <li key={q.key} className={`bg-white rounded-2xl border p-5 space-y-4 ${q.needsReview ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold text-slate-900">Câu {idx + 1}</span>
                <select aria-label={`Mức độ câu ${idx + 1}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  value={q.difficulty} onChange={e => patchQ(q.key, { difficulty: e.target.value as QuestionDifficulty })}>
                  {DIFFS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
                {q.needsReview && <span className="text-xs font-medium text-amber-800">⚠ {q.reviewReason || 'Cần kiểm tra'}</span>}
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => setPreview(p => ({ ...p, [q.key]: !p[q.key] }))} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" title="Xem trước công thức" aria-label="Xem trước">
                    {preview[q.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => moveQ(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Chuyển lên"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveQ(idx, 1)} disabled={idx === draft.questions.length - 1} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Chuyển xuống"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => setDraft({ ...draft, questions: draft.questions.filter(x => x.key !== q.key) })} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50" aria-label="Xóa câu"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700 space-y-1.5">
                Nội dung câu hỏi <span className="font-normal text-slate-500">(công thức viết trong $...$)</span>
                <textarea className={`${inputCls} min-h-[5rem] font-normal`} value={q.prompt} maxLength={6000}
                  onChange={e => patchQ(q.key, { prompt: e.target.value })} />
              </label>
              {preview[q.key] && q.prompt && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm"><MathRenderer content={q.prompt} /></div>}

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-slate-700 mb-1">Các phương án — chọn tròn ở đáp án đúng</legend>
                {q.options.map((o, oi) => (
                  <div key={oi} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input type="radio" name={`correct-${q.key}`} checked={q.correctOptionIndex === oi}
                        onChange={() => patchQ(q.key, { correctOptionIndex: oi, needsReview: false })}
                        className="w-4 h-4 accent-emerald-600 shrink-0" aria-label={`Đáp án đúng là ${'ABCD'[oi]}`} />
                      <span className="w-5 font-semibold text-slate-600 text-sm">{'ABCD'[oi]}.</span>
                      <input className={inputCls} value={o} maxLength={1500} aria-label={`Phương án ${'ABCD'[oi]}`}
                        onChange={e => patchQ(q.key, { options: q.options.map((x, i) => (i === oi ? e.target.value : x)) })} />
                    </div>
                    {preview[q.key] && o && <div className="ml-12 text-sm text-slate-700"><MathRenderer content={o} inline /></div>}
                  </div>
                ))}
                {q.correctOptionIndex < 0 && <p className="text-xs text-rose-600">Chưa chọn đáp án đúng.</p>}
              </fieldset>

              <label className="block text-sm font-medium text-slate-700 space-y-1.5">
                Lời giải <span className="font-normal text-slate-500">(hiện cho học sinh sau khi nộp bài)</span>
                <textarea className={`${inputCls} min-h-[3.5rem] font-normal`} value={q.explanation} maxLength={8000}
                  onChange={e => patchQ(q.key, { explanation: e.target.value })} />
              </label>
              {preview[q.key] && q.explanation && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm"><MathRenderer content={q.explanation} /></div>}
            </li>
          ))}
        </ol>

        <button onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5">
          <Plus className="w-4 h-4" /> Thêm câu hỏi
        </button>

        <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 mr-auto">{draft.questions.length} câu · {draft.durationMinutes} phút</span>
          <button onClick={() => { setDraft(null); setNotice(null); }} disabled={saving}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium px-4 py-2">Hủy</button>
          <button onClick={() => save('draft')} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-700 text-blue-800 hover:bg-blue-50 text-sm font-semibold px-4 py-2 disabled:opacity-60">
            <Save className="w-4 h-4" /> Lưu nháp
          </button>
          <button onClick={() => save('published')} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">
            <Send className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu và phát hành'}
          </button>
        </div>
      </div>
    );
  }

  /* ───────────────────────── Danh sách đề ───────────────────────── */
  return (
    <div className="space-y-5 max-w-5xl">
      {NoticeBar}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => openEditor()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5">
          <Plus className="w-4 h-4" /> Soạn đề mới
        </button>
        <p className="text-sm text-slate-600">Đề phát hành sẽ hiện ở <strong>Luyện tập & thi thử → Phòng thi thử</strong> của học sinh.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Đang tải danh sách đề…</p>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
          <FileText className="w-8 h-8 mx-auto text-slate-400" />
          <p className="font-medium text-slate-800">Chưa có đề nào do thầy soạn</p>
          <p className="text-sm text-slate-500">Bấm "Soạn đề mới" để nhập từ file Word hoặc soạn từng câu.</p>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {exams.map(ex => (
            <li key={ex.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{ex.code}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${ex.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {ex.status === 'published' ? 'Đã phát hành' : 'Bản nháp'}
                </span>
                <span className="ml-auto text-xs text-slate-500">Lớp {ex.grade}</span>
              </div>
              <h3 className="font-display font-semibold text-slate-900 leading-snug">{ex.title}</h3>
              {ex.description && <p className="text-sm text-slate-600">{ex.description}</p>}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{ex.questions.length} câu</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ex.durationMinutes} phút</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                <button onClick={() => openEditor(ex)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-1.5"><Pencil className="w-3.5 h-3.5" />Sửa</button>
                <button onClick={() => toggleStatus(ex)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-1.5">
                  {ex.status === 'published' ? <><EyeOff className="w-3.5 h-3.5" />Gỡ khỏi phòng thi</> : <><Send className="w-3.5 h-3.5" />Phát hành</>}
                </button>
                <button onClick={() => setConfirmDelete(ex)} className="inline-flex items-center gap-1.5 rounded-lg text-rose-700 hover:bg-rose-50 text-sm font-medium px-3 py-1.5 ml-auto"><Trash2 className="w-3.5 h-3.5" />Xóa</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-display font-semibold text-slate-900">Xóa đề thi này?</h3>
            <p className="text-sm text-slate-600">"{confirmDelete.title}" sẽ biến mất khỏi phòng thi của học sinh. Điểm các em đã làm vẫn được giữ.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-slate-300 text-sm font-medium px-4 py-2">Giữ lại</button>
              <button onClick={() => remove(confirmDelete)} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2">Xóa đề</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManager;
