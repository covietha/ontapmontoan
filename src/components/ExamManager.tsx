import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import {
  Plus, Upload, Download, Trash2, Save, Send, ArrowUp, ArrowDown, Pencil,
  Eye, EyeOff, AlertTriangle, CheckCircle2, FileText, X, Clock, ListChecks
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { MathRenderer } from './MathRenderer';
import { QuestionImages } from './QuestionImages';
import { ExamPreview, type PreviewQuestion } from './ExamPreview';
import { parseDocxFile, downloadWordQuestionSampleGuide } from '../utils/fileParsers';
import { uploadLocalImages } from '../utils/imageStore';
import type { QuestionDifficulty } from '../types';

type QType = 'mcq' | 'true_false' | 'short_answer' | 'essay';

const TYPE_INFO: Record<QType, { part: string; short: string }> = {
  mcq: { part: 'Phần 1: Trắc nghiệm nhiều phương án', short: 'Trắc nghiệm' },
  true_false: { part: 'Phần 2: Trắc nghiệm đúng/sai', short: 'Đúng/Sai' },
  short_answer: { part: 'Phần 3: Trả lời ngắn', short: 'Trả lời ngắn' },
  essay: { part: 'Phần 4: Tự luận', short: 'Tự luận' }
};
const TYPE_ORDER: QType[] = ['mcq', 'true_false', 'short_answer', 'essay'];
/** Cấu trúc đề tốt nghiệp: 12 câu Phần 1, 4 câu Phần 2, 6 câu Phần 3 */
const STANDARD_12 = { mcq: 12, true_false: 4, short_answer: 6, essay: 0 } as const;

interface DraftQuestion {
  key: string;
  type: QType;
  prompt: string;
  options: string[];
  correctOptionIndex: number; // -1 = chưa chọn
  statements: string[]; // đúng/sai: 4 ý
  truths: (boolean | null)[]; // đúng/sai: đáp án từng ý
  acceptedText: string; // trả lời ngắn: các đáp án, ngăn cách bằng dấu ;
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
    type?: QType;
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    statements?: string[];
    truths?: boolean[];
    acceptedAnswers?: string[];
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
const blankQuestion = (type: QType = 'mcq'): DraftQuestion => ({
  key: newKey(), type, prompt: '', options: ['', '', '', ''], correctOptionIndex: -1,
  statements: ['', '', '', ''], truths: [null, null, null, null], acceptedText: '',
  explanation: '', difficulty: 'thong_hieu'
});
const sortByPart = (qs: DraftQuestion[]) =>
  [...qs].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
const countBy = (qs: DraftQuestion[]) => {
  const c: Record<QType, number> = { mcq: 0, true_false: 0, short_answer: 0, essay: 0 };
  qs.forEach(q => { c[q.type] += 1; });
  return c;
};
const blankDraft = (): Draft => ({
  id: null, title: '', code: '', description: '', durationMinutes: 45, grade: 12, source: 'manual', questions: [blankQuestion()]
});

interface Props {
  /** Báo cho thanh trạng thái biết đang ở màn nào: 'list' hoặc 'editor'. */
  onModeChange?: (mode: 'list' | 'editor') => void;
}

export const ExamManager: React.FC<Props> = ({ onModeChange }) => {
  const { getIdToken } = useAuth();
  const { refreshExams, allOfficialExams, hiddenOfficialIds, getQuestionById } = useData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exams, setExams] = useState<ServerExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [importInfo, setImportInfo] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, boolean>>({});
  const [confirmOfficial, setConfirmOfficial] = useState<{ id: string; title: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServerExam | null>(null);
  const [previewData, setPreviewData] = useState<{ title: string; durationMinutes: number; questions: PreviewQuestion[] } | null>(null);

  const previewDraft = (d: Draft) => setPreviewData({
    title: d.title, durationMinutes: d.durationMinutes,
    questions: sortByPart(d.questions).map(q => ({
      type: q.type, prompt: q.prompt, options: q.options, statements: q.statements, truths: q.truths,
      correctOptionIndex: q.correctOptionIndex, acceptedText: q.acceptedText, explanation: q.explanation
    }))
  });
  const previewExam = (ex: ServerExam) => setPreviewData({
    title: ex.title, durationMinutes: ex.durationMinutes,
    questions: ex.questions.map(q => ({
      type: q.type || 'mcq', prompt: q.prompt, options: q.options || [], statements: q.statements || [],
      truths: q.truths || [], correctOptionIndex: q.correctOptionIndex, acceptedText: (q.acceptedAnswers || []).join('; '), explanation: q.explanation
    }))
  });

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
      questions: exam.questions.map(q => ({
        ...blankQuestion(q.type || 'mcq'),
        prompt: q.prompt, explanation: q.explanation, difficulty: q.difficulty, lessonCode: q.lessonCode,
        options: q.options?.length === 4 ? q.options : ['', '', '', ''],
        correctOptionIndex: q.correctOptionIndex,
        statements: q.statements?.length === 4 ? q.statements : ['', '', '', ''],
        truths: q.truths?.length === 4 ? q.truths : [null, null, null, null],
        acceptedText: (q.acceptedAnswers || []).join('; ')
      }))
    });
  };

  /** Chuyển đề mẫu vào cơ sở dữ liệu (giữ mã đề) rồi mở trình soạn để sửa trực tiếp. */
  const openOfficial = async (ex: { id: string; description: string; questionIds: string[] }) => {
    try {
      setNotice(null);
      const questions = ex.questionIds.map(id => {
        const q: any = getQuestionById(id);
        return { id, prompt: q?.prompt || '', options: q?.options || [], difficulty: q?.difficulty, lessonCode: q?.lessonCode };
      });
      const created: ServerExam = await api(`/api/exams/official/${ex.id}/migrate`, { method: 'POST', body: JSON.stringify({ description: ex.description, questions }) });
      await Promise.all([load(), refreshExams()]);
      openEditor(created);
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const deleteOfficial = async (id: string) => {
    try {
      await api(`/api/exams/official/${id}/hidden`, { method: 'PUT', body: JSON.stringify({ hidden: true }) });
      setConfirmOfficial(null);
      await refreshExams();
      setNotice({ type: 'ok', text: 'Đã xóa đề mẫu.' });
    } catch (e: any) {
      setConfirmOfficial(null);
      setNotice({ type: 'err', text: e.message });
    }
  };

  const patchQ = (key: string, patch: Partial<DraftQuestion>) =>
    setDraft(d => d && { ...d, questions: d.questions.map(q => (q.key === key ? { ...q, ...patch, needsReview: patch.needsReview ?? q.needsReview } : q)) });

  /** Đổi chỗ với câu liền kề cùng dạng (cùng phần của đề). */
  const moveQ = (key: string, dir: -1 | 1) =>
    setDraft(d => {
      if (!d) return d;
      const from = d.questions.findIndex(q => q.key === key);
      const type = d.questions[from].type;
      let to = from + dir;
      while (to >= 0 && to < d.questions.length && d.questions[to].type !== type) to += dir;
      if (to < 0 || to >= d.questions.length) return d;
      const qs = [...d.questions];
      [qs[from], qs[to]] = [qs[to], qs[from]];
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
      let added: DraftQuestion[] = r.questions.map(q => ({
        key: newKey(),
        type: q.type,
        prompt: q.prompt,
        options: [0, 1, 2, 3].map(i => q.options[i] || ''),
        correctOptionIndex: q.correctOptionIndex,
        statements: [0, 1, 2, 3].map(i => q.statements[i] || ''),
        truths: [0, 1, 2, 3].map(i => (q.type === 'true_false' ? q.truths[i] ?? null : null)),
        acceptedText: q.acceptedAnswers.join('; '),
        explanation: q.explanation,
        difficulty: q.difficulty,
        lessonCode: q.lessonCode || undefined,
        needsReview: q.needsReview,
        reviewReason: q.reviewReason
      }));
      setPreview(p => ({ ...p, ...Object.fromEntries(added.map(q => [q.key, true])) }));
      setDraft(d => {
        if (!d) return d;
        // Đề lớp 12 chỉ có 3 dạng: tự luận trong file Word bị bỏ qua
        const skippedEssay = d.grade === 12 ? added.filter(q => q.type === 'essay').length : 0;
        if (skippedEssay) {
          added = added.filter(q => q.type !== 'essay');
          setImportInfo(prev => [...prev, `Đã bỏ qua ${skippedEssay} câu tự luận vì đề lớp 12 chỉ gồm 3 dạng. Đổi khối sang lớp 10 hoặc 11 nếu muốn giữ.`]);
        }
        // Bỏ câu trống mặc định nếu chưa nhập gì
        const isBlank = d.questions.length === 1 && !d.questions[0].prompt.trim();
        const base = isBlank ? [] : d.questions;
        const meta = r.meta || {};
        const autoTitle = meta.title ? `${meta.grade ? `Toán ${meta.grade} – ` : ''}${meta.title}` : file.name.replace(/\.docx$/i, '');
        return {
          ...d,
          source: 'docx_import',
          title: d.title || autoTitle,
          durationMinutes: isBlank && meta.durationMinutes ? meta.durationMinutes : d.durationMinutes,
          grade: isBlank && meta.grade ? meta.grade : d.grade,
          questions: sortByPart([...base, ...added])
        };
      });
      const review = added.filter(q => q.needsReview).length;
      const noKey = added.filter(q => /Chưa có đáp án/.test(q.reviewReason || '')).length;
      const st = r.stats;
      const extra = st ? ` Đã nhận ${st.equations} công thức${st.images ? ` và ${st.images} hình` : ''}.` : '';
      setNotice({
        type: 'ok',
        text: `Đã nhập ${added.length} câu từ "${file.name}".${extra}${noKey ? ` File chưa có đáp án cho ${noKey} câu: thầy chọn đáp án đúng ở các câu đánh dấu vàng trước khi phát hành.` : review ? ` Có ${review} câu cần thầy kiểm tra lại (đánh dấu màu vàng).` : ''}`
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
      if (q.type === 'essay' && d.grade === 12) return `Câu ${i + 1}: đề lớp 12 chỉ gồm 3 dạng, không có tự luận.`;
      if (!q.prompt.trim()) return `Câu ${i + 1}: chưa có nội dung câu hỏi.`;
      if (q.type === 'mcq') {
        if (q.options.some(o => !o.trim())) return `Câu ${i + 1}: cần đủ 4 phương án A, B, C, D.`;
        if (q.correctOptionIndex < 0 || q.correctOptionIndex > 3) return `Câu ${i + 1}: chưa chọn đáp án đúng.`;
      } else if (q.type === 'true_false') {
        if (q.statements.some(o => !o.trim())) return `Câu ${i + 1}: cần đủ 4 ý a, b, c, d.`;
        if (q.truths.some(t => t === null)) return `Câu ${i + 1}: chọn Đúng hoặc Sai cho cả 4 ý.`;
      } else if (q.type === 'short_answer') {
        if (!q.acceptedText.trim()) return `Câu ${i + 1}: chưa nhập đáp án.`;
      }
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
      // Hình từ file Word được lưu lên máy chủ trước, đề chỉ giữ đường dẫn hình
      const sorted = sortByPart(draft.questions);
      const flat = sorted.flatMap(q => [q.prompt, ...q.options, ...q.statements, q.explanation]);
      const fixed = await uploadLocalImages(flat, await getIdToken());
      const withUrls = sorted.map((q, i) => {
        const f = fixed.slice(i * 10, i * 10 + 10);
        return { ...q, prompt: f[0], options: f.slice(1, 5), statements: f.slice(5, 9), explanation: f[9] };
      });
      const body = JSON.stringify({
        title: draft.title, code: draft.code, description: draft.description,
        durationMinutes: draft.durationMinutes, grade: draft.grade, source: draft.source, status,
        questions: withUrls.map(q => ({
          type: q.type, prompt: q.prompt, options: q.type === 'mcq' ? q.options : [],
          correctOptionIndex: q.type === 'mcq' ? q.correctOptionIndex : -1,
          statements: q.type === 'true_false' ? q.statements : undefined,
          truths: q.type === 'true_false' ? q.truths : undefined,
          acceptedAnswers: q.type === 'short_answer' ? q.acceptedText.split(/[;|]/).map(a => a.trim()).filter(Boolean) : undefined,
          explanation: q.explanation, difficulty: q.difficulty, lessonCode: q.lessonCode
        }))
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
  const previewModal = previewData ? <ExamPreview {...previewData} onClose={() => setPreviewData(null)} /> : null;

  if (draft) {
    const reviewCount = draft.questions.filter(q => q.needsReview).length;
    return (
      <div className="space-y-5 max-w-5xl">
        {previewModal}
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
            <button onClick={() => setDraft(d => d && ({ ...d, grade: d.grade, questions: [
                ...d.questions.filter(q => q.prompt.trim()),
                ...TYPE_ORDER.filter(t => t !== 'essay').flatMap(t => Array.from({ length: Math.max(0, STANDARD_12[t] - d.questions.filter(q => q.type === t && q.prompt.trim()).length) }, () => blankQuestion(t)))
              ] }))}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2">
              <ListChecks className="w-4 h-4" /> Tạo khung 12 + 4 + 6 câu
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

        {/* Cấu trúc đề */}
        {(() => {
          const c = countBy(draft.questions);
          const std = draft.grade === 12;
          return (
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {TYPE_ORDER.filter(t => t !== 'essay' || draft.grade !== 12).map(t => {
                const ok = std && t !== 'essay' ? c[t] === STANDARD_12[t] : true;
                return (
                  <span key={t} className={ok ? 'text-slate-700' : 'text-amber-800 font-medium'}>
                    {TYPE_INFO[t].short}: <strong>{c[t]}</strong>{std && t !== 'essay' ? ` / ${STANDARD_12[t]}` : ''}
                  </span>
                );
              })}
              {std && <span className="text-xs text-slate-500 ml-auto">Cấu trúc đề tốt nghiệp: 12 câu + 4 câu + 6 câu = 10 điểm</span>}
            </div>
          );
        })()}

        {(() => {
          const sorted = sortByPart(draft.questions);
          let n = 0;
          return TYPE_ORDER.map(t => {
            const group = sorted.filter(q => q.type === t);
            if (group.length === 0) return null;
            return (
              <section key={t} className="space-y-4" aria-label={TYPE_INFO[t].part}>
                <h3 className="font-display text-lg font-semibold text-slate-900 pt-2">{TYPE_INFO[t].part}</h3>
                <ol className="space-y-4">
                  {group.map((q, gi) => {
                    n += 1;
                    const idx = n;
                    return (
                      <li key={q.key} className={`bg-white rounded-2xl border p-5 space-y-4 ${q.needsReview ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-semibold text-slate-900">Câu {idx}</span>
                          <select aria-label={`Dạng câu ${idx}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                            value={q.type} onChange={e => patchQ(q.key, { type: e.target.value as QType, needsReview: false })}>
                            {TYPE_ORDER.filter(x => x !== 'essay' || draft.grade !== 12).map(x => <option key={x} value={x}>{TYPE_INFO[x].short}</option>)}
                          </select>
                          <select aria-label={`Mức độ câu ${idx}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                            value={q.difficulty} onChange={e => patchQ(q.key, { difficulty: e.target.value as QuestionDifficulty })}>
                            {DIFFS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                          </select>
                          {q.needsReview && <span className="text-xs font-medium text-amber-800">⚠ {q.reviewReason || 'Cần kiểm tra'}</span>}
                          <div className="ml-auto flex items-center gap-1">
                            <button onClick={() => setPreview(p => ({ ...p, [q.key]: !p[q.key] }))} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" title="Xem trước công thức" aria-label="Xem trước">
                              {preview[q.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => moveQ(q.key, -1)} disabled={gi === 0} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Chuyển lên"><ArrowUp className="w-4 h-4" /></button>
                            <button onClick={() => moveQ(q.key, 1)} disabled={gi === group.length - 1} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Chuyển xuống"><ArrowDown className="w-4 h-4" /></button>
                            <button onClick={() => setDraft({ ...draft, questions: draft.questions.filter(x => x.key !== q.key) })} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50" aria-label="Xóa câu"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        <label className="block text-sm font-medium text-slate-700 space-y-1.5">
                          {q.type === 'true_false' ? 'Dẫn đề' : 'Nội dung câu hỏi'} <span className="font-normal text-slate-500">(công thức viết trong $...$)</span>
                          <textarea className={`${inputCls} min-h-[5rem] font-normal`} value={q.prompt} maxLength={6000}
                            onChange={e => patchQ(q.key, { prompt: e.target.value })} />
                        </label>
                        {preview[q.key] && q.prompt && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm"><MathRenderer content={q.prompt} /></div>}

                        <QuestionImages
                          addTo="prompt"
                          fields={[
                            { key: 'prompt', label: 'Nội dung câu', value: q.prompt },
                            ...(q.type === 'mcq' ? q.options.map((o, i) => ({ key: `o${i}`, label: `Phương án ${'ABCD'[i]}`, value: o })) : []),
                            ...(q.type === 'true_false' ? q.statements.map((o, i) => ({ key: `s${i}`, label: `Ý ${'abcd'[i]})`, value: o })) : []),
                            { key: 'explanation', label: 'Lời giải', value: q.explanation }
                          ]}
                          onChange={(k, v) => {
                            if (k === 'prompt') patchQ(q.key, { prompt: v });
                            else if (k === 'explanation') patchQ(q.key, { explanation: v });
                            else if (k[0] === 'o') patchQ(q.key, { options: q.options.map((x, i) => (i === Number(k[1]) ? v : x)) });
                            else patchQ(q.key, { statements: q.statements.map((x, i) => (i === Number(k[1]) ? v : x)) });
                          }}
                        />

                        {q.type === 'mcq' && (
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
                        )}

                        {q.type === 'true_false' && (
                          <fieldset className="space-y-2">
                            <legend className="text-sm font-medium text-slate-700 mb-1">Bốn ý a, b, c, d — chọn Đúng hoặc Sai cho từng ý</legend>
                            {q.statements.map((st, si) => (
                              <div key={si} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 font-semibold text-slate-600 text-sm">{'abcd'[si]})</span>
                                  <input className={inputCls} value={st} maxLength={1500} aria-label={`Ý ${'abcd'[si]}`}
                                    onChange={e => patchQ(q.key, { statements: q.statements.map((x, i) => (i === si ? e.target.value : x)) })} />
                                  <div className="flex shrink-0 rounded-lg overflow-hidden border border-slate-300" role="radiogroup" aria-label={`Đáp án ý ${'abcd'[si]}`}>
                                    {([true, false] as const).map(v => (
                                      <button key={String(v)} type="button" role="radio" aria-checked={q.truths[si] === v}
                                        onClick={() => patchQ(q.key, { truths: q.truths.map((x, i) => (i === si ? v : x)), needsReview: false })}
                                        className={`px-3 py-2 text-sm font-semibold ${q.truths[si] === v ? (v ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        {v ? 'Đúng' : 'Sai'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {preview[q.key] && st && <div className="ml-7 text-sm text-slate-700"><MathRenderer content={st} inline /></div>}
                              </div>
                            ))}
                            <p className="text-xs text-slate-500">Điểm mỗi câu: đúng 1 ý được 0,1 · 2 ý được 0,25 · 3 ý được 0,5 · đủ 4 ý được 1 điểm.</p>
                          </fieldset>
                        )}

                        {q.type === 'short_answer' && (
                          <label className="block text-sm font-medium text-slate-700 space-y-1.5">
                            <span className="block">Đáp án <span className="font-normal text-slate-500">(một số; nếu chấp nhận nhiều cách viết, ngăn cách bằng dấu ; ví dụ 12,5; 25/2)</span></span>
                            <input className={`${inputCls} font-mono sm:max-w-sm`} value={q.acceptedText} maxLength={200}
                              onChange={e => patchQ(q.key, { acceptedText: e.target.value, needsReview: false })} />
                          </label>
                        )}

                        <label className="block text-sm font-medium text-slate-700 space-y-1.5">
                          {q.type === 'essay' ? 'Hướng dẫn chấm / đáp án mẫu' : 'Lời giải'} <span className="font-normal text-slate-500">(hiện cho học sinh sau khi nộp bài)</span>
                          <textarea className={`${inputCls} min-h-[3.5rem] font-normal`} value={q.explanation} maxLength={8000}
                            onChange={e => patchQ(q.key, { explanation: e.target.value })} />
                        </label>
                        {preview[q.key] && q.explanation && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm"><MathRenderer content={q.explanation} /></div>}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          });
        })()}

        <div className="flex flex-wrap gap-2">
          {TYPE_ORDER.filter(t => t !== 'essay' || draft.grade !== 12).map(t => (
            <button key={t} onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion(t)] })}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5">
              <Plus className="w-4 h-4" /> Thêm câu {TYPE_INFO[t].short.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 mr-auto">{draft.questions.length} câu · {draft.durationMinutes} phút</span>
          <button onClick={() => { setDraft(null); setNotice(null); }} disabled={saving}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium px-4 py-2">Hủy</button>
          <button onClick={() => previewDraft(draft)} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold px-4 py-2">
            <Eye className="w-4 h-4" /> Xem trước đề
          </button>
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
      {previewModal}
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
                <StatusBadge status={ex.status === 'published' ? 'published' : 'draft'} />
                <span className="ml-auto text-xs text-slate-500">Lớp {ex.grade}</span>
              </div>
              <h3 className="font-display font-semibold text-slate-900 leading-snug">{ex.title}</h3>
              {ex.description && <p className="text-sm text-slate-600">{ex.description}</p>}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{ex.questions.length} câu</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ex.durationMinutes} phút</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                <button onClick={() => previewExam(ex)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-1.5"><Eye className="w-3.5 h-3.5" />Xem trước</button>
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

      {allOfficialExams.some(ex => !hiddenOfficialIds.includes(ex.id) && !exams.some(m => m.id === ex.id)) && (
        <section className="space-y-3 pt-2">
          <h3 className="font-display font-semibold text-slate-900">Đề mẫu của hệ thống</h3>
          <p className="text-sm text-slate-600">Thầy có thể sửa hoặc xóa tùy ý. Bấm "Sửa" lần đầu, đề mẫu được đưa vào danh sách đề của thầy (giữ mã đề, đáp án và lời giải), từ đó sửa, gỡ, xóa như mọi đề khác.</p>
          <ul className="grid md:grid-cols-2 gap-4">
            {allOfficialExams.filter(ex => !hiddenOfficialIds.includes(ex.id) && !exams.some(m => m.id === ex.id)).map(ex => (
              <li key={ex.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 self-start">{ex.code}</span>
                <h4 className="font-display font-semibold text-slate-900 leading-snug">{ex.title}</h4>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{ex.questionIds.length} câu</span>
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{ex.durationMinutes} phút</span>
                </div>
                <div className="mt-auto">
                  <button onClick={() => openOfficial(ex)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-1.5"><Pencil className="w-3.5 h-3.5" />Sửa</button>
                  <button onClick={() => setConfirmOfficial(ex)} className="inline-flex items-center gap-1.5 rounded-lg text-rose-700 hover:bg-rose-50 text-sm font-medium px-3 py-1.5 ml-2"><Trash2 className="w-3.5 h-3.5" />Xóa</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {confirmOfficial && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-display font-semibold text-slate-900">Xóa đề mẫu này?</h3>
            <p className="text-sm text-slate-600">"{confirmOfficial.title}" sẽ biến mất khỏi phòng thi của học sinh và khỏi danh sách đề mẫu. Điểm các em đã làm vẫn được giữ.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOfficial(null)} className="rounded-lg border border-slate-300 text-sm font-medium px-4 py-2">Giữ lại</button>
              <button onClick={() => deleteOfficial(confirmOfficial.id)} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2">Xóa đề</button>
            </div>
          </div>
        </div>
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
