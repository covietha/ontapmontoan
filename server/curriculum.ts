import { store, Doc } from './store';

/**
 * Chuyên đề và bài học do giáo viên thêm, sửa hoặc xóa.
 * Dữ liệu mẫu có sẵn trong ứng dụng; mỗi lần giáo viên sửa, bản sửa được lưu ở đây và
 * ghi đè bản mẫu cùng mã. Xóa một mục mẫu được ghi lại bằng một dấu "đã xóa".
 */

const COL = 'curriculum';
const ID_RE = /^[a-z0-9][a-z0-9-]{2,63}$/;

export type CurriculumKind = 'topic' | 'lesson';

export interface CurriculumDoc {
  key: string; // topic:<id> | lesson:<id>
  kind: CurriculumKind;
  id: string;
  deleted: boolean;
  data?: Doc;
  updatedAt: string;
  updatedBy: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);

export function validId(id: unknown): id is string {
  return typeof id === 'string' && ID_RE.test(id);
}

export function cleanTopic(id: string, b: any): { ok: true; value: Doc } | { ok: false; error: string } {
  const title = str(b?.title, 300);
  if (!title) return { ok: false, error: 'Vui lòng nhập tên chuyên đề.' };
  const grade = [10, 11, 12].includes(Number(b?.grade)) ? Number(b.grade) : 12;
  const order = Number.isFinite(Number(b?.order)) ? Math.max(0, Math.min(999, Math.round(Number(b.order)))) : 99;
  return {
    ok: true,
    value: { id, title, description: str(b?.description, 2000), order, grade, icon: str(b?.icon, 40) || 'Activity', status: 'verified' }
  };
}

export function cleanLesson(id: string, b: any): { ok: true; value: Doc } | { ok: false; error: string } {
  const title = str(b?.title, 300);
  if (!title) return { ok: false, error: 'Vui lòng nhập tên bài học.' };
  const topicId = str(b?.topicId, 64);
  if (!topicId) return { ok: false, error: 'Bài học cần thuộc một chuyên đề.' };
  const lessonCode = str(b?.lessonCode, 80);
  if (!lessonCode) return { ok: false, error: 'Vui lòng nhập mã bài học.' };
  const grade = [10, 11, 12].includes(Number(b?.grade)) ? Number(b.grade) : 12;

  const formulas = (Array.isArray(b?.formulas) ? b.formulas : []).slice(0, 40).map((f: any) => ({
    name: str(f?.name, 300), latex: str(f?.latex, 2000), note: str(f?.note, 1000) || undefined
  })).filter((f: any) => f.name || f.latex);

  const stepByStepExamples = (Array.isArray(b?.stepByStepExamples) ? b.stepByStepExamples : []).slice(0, 30).map((e: any) => ({
    title: str(e?.title, 300), problem: str(e?.problem, 4000),
    solutionSteps: strList(e?.solutionSteps, 30, 3000), note: str(e?.note, 2000) || undefined
  })).filter((e: any) => e.title || e.problem);

  const commonMistakes = (Array.isArray(b?.commonMistakes) ? b.commonMistakes : []).slice(0, 30).map((m: any) => ({
    mistakeTitle: str(m?.mistakeTitle, 300), explanation: str(m?.explanation, 3000),
    correction: str(m?.correction, 3000), formulaNote: str(m?.formulaNote, 1000) || undefined
  })).filter((m: any) => m.mistakeTitle || m.explanation);

  return {
    ok: true,
    value: {
      id, topicId, lessonCode, title, grade,
      objectives: strList(b?.objectives, 20, 500),
      theorySummary: str(b?.theorySummary, 30000),
      formulas, stepByStepExamples, commonMistakes,
      relatedPracticeQuestionIds: strList(b?.relatedPracticeQuestionIds, 200, 80),
      status: 'verified'
    }
  };
}

export async function listCurriculum(): Promise<CurriculumDoc[]> {
  return (await store.list(COL)) as CurriculumDoc[];
}

export async function saveCurriculum(kind: CurriculumKind, id: string, data: Doc, by: string) {
  const doc: CurriculumDoc = {
    key: `${kind}:${id}`, kind, id, deleted: false,
    data: { ...data, updatedAt: new Date().toISOString(), createdBy: data.createdBy || by },
    updatedAt: new Date().toISOString(), updatedBy: by
  };
  await store.set(COL, doc.key, doc as unknown as Doc);
  return doc;
}

export async function tombstoneCurriculum(kind: CurriculumKind, id: string, by: string) {
  const doc: CurriculumDoc = { key: `${kind}:${id}`, kind, id, deleted: true, updatedAt: new Date().toISOString(), updatedBy: by };
  await store.set(COL, doc.key, doc as unknown as Doc);
}
