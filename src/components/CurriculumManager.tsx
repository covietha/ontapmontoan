import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Save, ArrowLeft, Eye, EyeOff, X, AlertTriangle, CheckCircle2, BookOpen, Layers } from 'lucide-react';
import { useData } from '../context/DataContext';
import { MathRenderer } from './MathRenderer';
import type { Topic, Lesson, StepByStepExample, CommonMistake } from '../types';

type Notice = { type: 'ok' | 'err'; text: string } | null;

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const btn = 'inline-flex items-center gap-2 rounded-lg text-sm font-semibold px-4 py-2 disabled:opacity-60';

/** Tạo mã không dấu, chỉ gồm chữ thường, số và gạch ngang. */
const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({ label, hint, children, className = '' }) => (
  <label className={`block text-sm font-medium text-slate-700 space-y-1.5 ${className}`}>
    <span>{label} {hint && <span className="font-normal text-slate-500">{hint}</span>}</span>
    {children}
  </label>
);

interface Props {
  onModeChange?: (mode: 'topics' | 'lesson') => void;
}

export const CurriculumManager: React.FC<Props> = ({ onModeChange }) => {
  const { topics, lessons, questions, saveTopic, saveLesson, deleteTopic, deleteLesson } = useData();

  const [selectedId, setSelectedId] = useState<string>('');
  const [topicDraft, setTopicDraft] = useState<(Topic & { isNew?: boolean }) | null>(null);
  const [lessonDraft, setLessonDraft] = useState<(Lesson & { isNew?: boolean }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'topic' | 'lesson'; id: string; title: string; text: string } | null>(null);

  const modeCb = useRef(onModeChange);
  modeCb.current = onModeChange;
  const mode = lessonDraft ? 'lesson' : 'topics';
  useEffect(() => { modeCb.current?.(mode); }, [mode]);

  useEffect(() => {
    if (!selectedId || !topics.some(t => t.id === selectedId)) setSelectedId(topics[0]?.id || '');
  }, [topics, selectedId]);

  const selected = topics.find(t => t.id === selectedId);
  const topicLessons = useMemo(() => lessons.filter(l => l.topicId === selectedId), [lessons, selectedId]);

  const run = async (fn: () => Promise<void>, okText: string) => {
    setSaving(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ type: 'ok', text: okText });
      return true;
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message || 'Không lưu được. Thầy thử lại sau.' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /* ───────────── Chuyên đề ───────────── */
  const newTopic = () => setTopicDraft({
    isNew: true, id: '', title: '', description: '', order: topics.length + 1, grade: 12, icon: 'Activity', status: 'verified'
  });

  const submitTopic = async () => {
    if (!topicDraft) return;
    const title = topicDraft.title.trim();
    if (!title) return setNotice({ type: 'err', text: 'Vui lòng nhập tên chuyên đề.' });
    const id = topicDraft.isNew ? `topic-${slug(title) || 'moi'}-${Date.now().toString(36).slice(-4)}` : topicDraft.id;
    const { isNew, ...rest } = topicDraft;
    const ok = await run(() => saveTopic({ ...rest, id, title }), isNew ? 'Đã thêm chuyên đề.' : 'Đã lưu chuyên đề.');
    if (ok) { setTopicDraft(null); setSelectedId(id); }
  };

  /* ───────────── Bài học ───────────── */
  const blankLesson = (): Lesson & { isNew: boolean } => ({
    isNew: true, id: '', topicId: selectedId, lessonCode: '', title: '', grade: selected?.grade || 12,
    objectives: [''], theorySummary: '', formulas: [], stepByStepExamples: [], commonMistakes: [],
    relatedPracticeQuestionIds: [], status: 'verified', updatedAt: new Date().toISOString()
  });

  const openLesson = (l?: Lesson) => {
    setNotice(null);
    setPreview(false);
    setLessonDraft(l ? { ...JSON.parse(JSON.stringify(l)), objectives: l.objectives.length ? l.objectives : [''] } : blankLesson());
  };

  const submitLesson = async () => {
    if (!lessonDraft) return;
    const d = lessonDraft;
    if (!d.title.trim()) return setNotice({ type: 'err', text: 'Vui lòng nhập tên bài học.' });
    const code = d.lessonCode.trim() || `${slug(d.title).toUpperCase().slice(0, 30)}`;
    const id = d.isNew ? `lesson-${slug(d.title) || 'moi'}-${Date.now().toString(36).slice(-4)}` : d.id;
    const { isNew, ...rest } = d;
    const ok = await run(
      () => saveLesson({ ...rest, id, lessonCode: code, title: d.title.trim(), objectives: d.objectives.filter(o => o.trim()) }),
      isNew ? 'Đã thêm bài học. Học sinh thấy ngay khi tải lại trang.' : 'Đã lưu bài học.'
    );
    if (ok) setLessonDraft(null);
  };

  const patch = (p: Partial<Lesson>) => setLessonDraft(d => d && { ...d, ...p });

  const doDelete = async () => {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    await run(() => (c.kind === 'topic' ? deleteTopic(c.id) : deleteLesson(c.id)), `Đã xóa "${c.title}".`);
  };

  const askDeleteTopic = (t: Topic) => {
    const n = lessons.filter(l => l.topicId === t.id).length;
    if (n > 0) return setNotice({ type: 'err', text: `Chuyên đề này còn ${n} bài học. Thầy xóa hoặc chuyển các bài học trước rồi mới xóa chuyên đề.` });
    setConfirm({ kind: 'topic', id: t.id, title: t.title, text: 'Chuyên đề sẽ biến mất khỏi mọi tài khoản học sinh.' });
  };

  const askDeleteLesson = (l: Lesson) => {
    const n = questions.filter(q => q.lessonId === l.id && q.approvalStatus !== 'trash').length;
    setConfirm({
      kind: 'lesson', id: l.id, title: l.title,
      text: n > 0 ? `Có ${n} câu hỏi đang gắn với bài này; các câu đó vẫn còn nhưng không còn dẫn về bài học.` : 'Bài học sẽ biến mất khỏi mọi tài khoản học sinh.'
    });
  };

  const NoticeBar = notice && (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
      {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{notice.text}</span>
      <button onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X className="w-4 h-4" /></button>
    </div>
  );

  /* ───────────── Trình soạn bài học ───────────── */
  if (lessonDraft) {
    const d = lessonDraft;
    const setList = <K extends 'formulas' | 'stepByStepExamples' | 'commonMistakes'>(key: K, list: Lesson[K]) => patch({ [key]: list } as Partial<Lesson>);
    const rm = (i: number, arr: any[]) => arr.filter((_, k) => k !== i);
    const smallBtn = 'p-1.5 rounded-md text-rose-600 hover:bg-rose-50';
    const card = 'bg-white rounded-2xl border border-slate-200 p-5 space-y-4';

    return (
      <div className="space-y-5 max-w-4xl">
        {NoticeBar}
        <button onClick={() => { setLessonDraft(null); setNotice(null); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Về danh sách chuyên đề
        </button>

        <section className={card}>
          <div className="grid md:grid-cols-6 gap-4">
            <Field label="Tên bài học" className="md:col-span-4">
              <input className={inputCls} value={d.title} maxLength={300} onChange={e => patch({ title: e.target.value })} />
            </Field>
            <Field label="Mã bài" hint="(tự tạo nếu để trống)" className="md:col-span-2">
              <input className={inputCls} value={d.lessonCode} maxLength={80} onChange={e => patch({ lessonCode: e.target.value })} />
            </Field>
            <Field label="Thuộc chuyên đề" className="md:col-span-4">
              <select className={inputCls} value={d.topicId} onChange={e => patch({ topicId: e.target.value })}>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </Field>
            <Field label="Khối" className="md:col-span-2">
              <select className={inputCls} value={d.grade || 12} onChange={e => patch({ grade: Number(e.target.value) })}>
                {[10, 11, 12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className={card}>
          <h3 className="font-display font-semibold text-slate-900">Mục tiêu bài học</h3>
          {d.objectives.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input className={inputCls} value={o} aria-label={`Mục tiêu ${i + 1}`} maxLength={500}
                onChange={e => patch({ objectives: d.objectives.map((x, k) => (k === i ? e.target.value : x)) })} />
              <button className={smallBtn} aria-label="Xóa mục tiêu" onClick={() => patch({ objectives: rm(i, d.objectives) })}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button className={`${btn} border border-dashed border-slate-400 text-slate-700 hover:bg-slate-50`} onClick={() => patch({ objectives: [...d.objectives, ''] })}>
            <Plus className="w-4 h-4" /> Thêm mục tiêu
          </button>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display font-semibold text-slate-900">Tóm tắt lý thuyết</h3>
            <button onClick={() => setPreview(p => !p)} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
              {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {preview ? 'Ẩn xem trước' : 'Xem trước công thức'}
            </button>
          </div>
          <textarea className={`${inputCls} min-h-[10rem] font-normal`} value={d.theorySummary} maxLength={30000}
            aria-label="Tóm tắt lý thuyết" placeholder="Công thức viết trong $...$ hoặc $$...$$"
            onChange={e => patch({ theorySummary: e.target.value })} />
          {preview && d.theorySummary && <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm"><MathRenderer content={d.theorySummary} /></div>}
        </section>

        <section className={card}>
          <h3 className="font-display font-semibold text-slate-900">Công thức cần nhớ</h3>
          {d.formulas.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex gap-2">
                <input className={inputCls} placeholder="Tên công thức" aria-label="Tên công thức" value={f.name} onChange={e => setList('formulas', d.formulas.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                <button className={smallBtn} aria-label="Xóa công thức" onClick={() => setList('formulas', rm(i, d.formulas))}><Trash2 className="w-4 h-4" /></button>
              </div>
              <input className={`${inputCls} font-mono`} placeholder="Công thức (LaTeX), ví dụ \\frac{a}{b}" aria-label="Công thức LaTeX" value={f.latex} onChange={e => setList('formulas', d.formulas.map((x, k) => (k === i ? { ...x, latex: e.target.value } : x)))} />
              <input className={inputCls} placeholder="Ghi chú (không bắt buộc)" aria-label="Ghi chú công thức" value={f.note || ''} onChange={e => setList('formulas', d.formulas.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))} />
              {preview && f.latex && <div className="text-sm"><MathRenderer content={`$$${f.latex}$$`} /></div>}
            </div>
          ))}
          <button className={`${btn} border border-dashed border-slate-400 text-slate-700 hover:bg-slate-50`} onClick={() => setList('formulas', [...d.formulas, { name: '', latex: '', note: '' }])}>
            <Plus className="w-4 h-4" /> Thêm công thức
          </button>
        </section>

        <section className={card}>
          <h3 className="font-display font-semibold text-slate-900">Ví dụ mẫu từng bước</h3>
          {d.stepByStepExamples.map((ex, i) => {
            const upd = (p: Partial<StepByStepExample>) => setList('stepByStepExamples', d.stepByStepExamples.map((x, k) => (k === i ? { ...x, ...p } : x)));
            return (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex gap-2">
                  <input className={inputCls} placeholder="Tên ví dụ" aria-label="Tên ví dụ" value={ex.title} onChange={e => upd({ title: e.target.value })} />
                  <button className={smallBtn} aria-label="Xóa ví dụ" onClick={() => setList('stepByStepExamples', rm(i, d.stepByStepExamples))}><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea className={`${inputCls} min-h-[4rem]`} placeholder="Đề bài" aria-label="Đề bài ví dụ" value={ex.problem} onChange={e => upd({ problem: e.target.value })} />
                <textarea className={`${inputCls} min-h-[5rem]`} placeholder="Các bước giải, mỗi bước một dòng" aria-label="Các bước giải"
                  value={ex.solutionSteps.join('\n')} onChange={e => upd({ solutionSteps: e.target.value.split('\n') })} />
                <input className={inputCls} placeholder="Lưu ý (không bắt buộc)" aria-label="Lưu ý" value={ex.note || ''} onChange={e => upd({ note: e.target.value })} />
              </div>
            );
          })}
          <button className={`${btn} border border-dashed border-slate-400 text-slate-700 hover:bg-slate-50`} onClick={() => setList('stepByStepExamples', [...d.stepByStepExamples, { title: '', problem: '', solutionSteps: [''] }])}>
            <Plus className="w-4 h-4" /> Thêm ví dụ
          </button>
        </section>

        <section className={card}>
          <h3 className="font-display font-semibold text-slate-900">Bẫy sai thường gặp</h3>
          {d.commonMistakes.map((m, i) => {
            const upd = (p: Partial<CommonMistake>) => setList('commonMistakes', d.commonMistakes.map((x, k) => (k === i ? { ...x, ...p } : x)));
            return (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex gap-2">
                  <input className={inputCls} placeholder="Học sinh hay sai ở đâu" aria-label="Tên lỗi sai" value={m.mistakeTitle} onChange={e => upd({ mistakeTitle: e.target.value })} />
                  <button className={smallBtn} aria-label="Xóa lỗi sai" onClick={() => setList('commonMistakes', rm(i, d.commonMistakes))}><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea className={`${inputCls} min-h-[3.5rem]`} placeholder="Vì sao sai" aria-label="Vì sao sai" value={m.explanation} onChange={e => upd({ explanation: e.target.value })} />
                <textarea className={`${inputCls} min-h-[3.5rem]`} placeholder="Cách làm đúng" aria-label="Cách làm đúng" value={m.correction} onChange={e => upd({ correction: e.target.value })} />
              </div>
            );
          })}
          <button className={`${btn} border border-dashed border-slate-400 text-slate-700 hover:bg-slate-50`} onClick={() => setList('commonMistakes', [...d.commonMistakes, { mistakeTitle: '', explanation: '', correction: '' }])}>
            <Plus className="w-4 h-4" /> Thêm lỗi sai
          </button>
        </section>

        <div className="sticky bottom-0 py-3 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex justify-end gap-2">
          <button onClick={() => { setLessonDraft(null); setNotice(null); }} disabled={saving} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Hủy</button>
          <button onClick={submitLesson} disabled={saving} className={`${btn} bg-emerald-700 hover:bg-emerald-800 text-white`}>
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu bài học'}
          </button>
        </div>
      </div>
    );
  }

  /* ───────────── Danh sách chuyên đề và bài học ───────────── */
  return (
    <div className="space-y-5 max-w-6xl">
      {NoticeBar}
      <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)] gap-5 items-start">
        <aside className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between px-2 pt-1">
            <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4" /> Chuyên đề ({topics.length})</h3>
            <button onClick={newTopic} className="p-1.5 rounded-md text-blue-700 hover:bg-blue-50" aria-label="Thêm chuyên đề"><Plus className="w-4 h-4" /></button>
          </div>
          <ul className="space-y-1">
            {topics.map(t => (
              <li key={t.id}>
                <button onClick={() => setSelectedId(t.id)} aria-current={t.id === selectedId ? 'true' : undefined}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${t.id === selectedId ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span className="block leading-snug">{t.title}</span>
                  <span className="text-xs font-normal text-slate-500">Lớp {t.grade} · {lessons.filter(l => l.topicId === t.id).length} bài</span>
                </button>
              </li>
            ))}
          </ul>
          {topics.length === 0 && <p className="px-2 pb-2 text-sm text-slate-500">Chưa có chuyên đề. Bấm dấu + để thêm.</p>}
        </aside>

        <section className="space-y-4 min-w-0">
          {selected ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold text-slate-900 leading-snug">{selected.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{selected.description || 'Chưa có mô tả.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setTopicDraft({ ...selected })} className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}><Pencil className="w-4 h-4" /> Sửa chuyên đề</button>
                    <button onClick={() => askDeleteTopic(selected)} className={`${btn} text-rose-700 hover:bg-rose-50`}><Trash2 className="w-4 h-4" /> Xóa</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Bài học ({topicLessons.length})</h3>
                <button onClick={() => openLesson()} className={`${btn} bg-blue-700 hover:bg-blue-800 text-white`}><Plus className="w-4 h-4" /> Thêm bài học</button>
              </div>

              {topicLessons.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                  Chuyên đề này chưa có bài học. Bấm "Thêm bài học" để soạn bài đầu tiên.
                </div>
              ) : (
                <ul className="space-y-3">
                  {topicLessons.map(l => (
                    <li key={l.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 break-all">{l.lessonCode}</span>
                        <h4 className="font-semibold text-slate-900 mt-1.5 leading-snug">{l.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{l.formulas.length} công thức · {l.stepByStepExamples.length} ví dụ · {l.commonMistakes.length} bẫy sai</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openLesson(l)} className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}><Pencil className="w-4 h-4" /> Sửa</button>
                        <button onClick={() => askDeleteLesson(l)} className={`${btn} text-rose-700 hover:bg-rose-50`} aria-label={`Xóa bài ${l.title}`}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
              <p className="font-medium text-slate-800">Chưa có chuyên đề nào</p>
              <button onClick={newTopic} className={`${btn} bg-blue-700 text-white`}><Plus className="w-4 h-4" /> Thêm chuyên đề</button>
            </div>
          )}
        </section>
      </div>

      {topicDraft && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Chuyên đề">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-semibold text-slate-900">{topicDraft.isNew ? 'Thêm chuyên đề' : 'Sửa chuyên đề'}</h3>
            <Field label="Tên chuyên đề"><input className={inputCls} value={topicDraft.title} maxLength={300} autoFocus onChange={e => setTopicDraft({ ...topicDraft, title: e.target.value })} /></Field>
            <Field label="Mô tả ngắn"><textarea className={`${inputCls} min-h-[4.5rem]`} value={topicDraft.description} maxLength={2000} onChange={e => setTopicDraft({ ...topicDraft, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Khối"><select className={inputCls} value={topicDraft.grade} onChange={e => setTopicDraft({ ...topicDraft, grade: Number(e.target.value) })}>{[10, 11, 12].map(g => <option key={g} value={g}>Lớp {g}</option>)}</select></Field>
              <Field label="Thứ tự hiển thị"><input type="number" min={1} max={999} className={inputCls} value={topicDraft.order} onChange={e => setTopicDraft({ ...topicDraft, order: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setTopicDraft(null); setNotice(null); }} disabled={saving} className={`${btn} border border-slate-300 text-slate-700`}>Hủy</button>
              <button onClick={submitTopic} disabled={saving} className={`${btn} bg-emerald-700 hover:bg-emerald-800 text-white`}><Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu chuyên đề'}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-display font-semibold text-slate-900">Xóa "{confirm.title}"?</h3>
            <p className="text-sm text-slate-600">{confirm.text}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className={`${btn} border border-slate-300 text-slate-700`}>Giữ lại</button>
              <button onClick={doDelete} className={`${btn} bg-rose-600 hover:bg-rose-700 text-white`}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumManager;
