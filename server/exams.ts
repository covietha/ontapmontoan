import { store, Doc } from './store';
import { OFFICIAL_EXAMS, OFFICIAL_QUESTION_KEYS } from './answerKeys';

/**
 * Đề thi do giáo viên soạn (thủ công hoặc nhập từ Word).
 * Đáp án chỉ nằm ở máy chủ; học sinh chỉ nhận bản công khai không có đáp án.
 */

export type ExamDifficulty = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';

/** mcq: Phần 1 · true_false: Phần 2 (4 ý a–d) · short_answer: Phần 3 · essay: tự luận (lớp 10, 11) */
export type ExamQType = 'mcq' | 'true_false' | 'short_answer' | 'essay';
export const Q_TYPES: ExamQType[] = ['mcq', 'true_false', 'short_answer', 'essay'];

export interface CustomExamQuestion {
  id: string;
  type: ExamQType;
  prompt: string;
  options: string[]; // mcq: 4 phương án; các dạng khác để trống
  correctOptionIndex: number; // mcq: 0..3, dạng khác: -1
  statements?: string[]; // true_false: 4 ý a, b, c, d
  truths?: boolean[]; // true_false: đáp án đúng/sai của từng ý
  acceptedAnswers?: string[]; // short_answer: các đáp án được chấp nhận
  explanation: string;
  difficulty: ExamDifficulty;
  lessonCode?: string;
}

export interface CustomExam {
  id: string;
  code: string;
  title: string;
  description: string;
  durationMinutes: number;
  grade: number;
  status: 'draft' | 'published';
  questions: CustomExamQuestion[];
  source: 'manual' | 'docx_import';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const COL = 'customExams';
const DIFFICULTIES: ExamDifficulty[] = ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];

export const MAX_QUESTIONS = 100;

/** Kiểm tra và làm sạch dữ liệu đề do client gửi. Trả về thông báo lỗi tiếng Việt nếu không hợp lệ. */
export function validateExamInput(body: any, examId: string): { ok: true; value: Omit<CustomExam, 'createdAt' | 'updatedAt' | 'createdBy'> } | { ok: false; error: string } {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  const title = str(body?.title, 200);
  if (!title) return { ok: false, error: 'Vui lòng nhập tên đề thi.' };

  const duration = Math.round(Number(body?.durationMinutes));
  if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
    return { ok: false, error: 'Thời gian làm bài phải từ 1 đến 300 phút.' };
  }

  const rawQuestions = Array.isArray(body?.questions) ? body.questions : [];
  if (rawQuestions.length === 0) return { ok: false, error: 'Đề thi cần ít nhất 1 câu hỏi.' };
  if (rawQuestions.length > MAX_QUESTIONS) return { ok: false, error: `Mỗi đề tối đa ${MAX_QUESTIONS} câu.` };

  const gradeForCheck = [10, 11, 12].includes(Number(body?.grade)) ? Number(body.grade) : 12;
  const questions: CustomExamQuestion[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const n = i + 1;
    const type: ExamQType = Q_TYPES.includes(q?.type) ? q.type : 'mcq';
    if (type === 'essay' && gradeForCheck === 12) {
      return { ok: false, error: `Câu ${n}: đề lớp 12 chỉ gồm 3 dạng (trắc nghiệm, đúng/sai, trả lời ngắn). Tự luận dùng cho đề lớp 10, 11.` };
    }
    const prompt = str(q?.prompt, 6000);
    if (!prompt) return { ok: false, error: `Câu ${n}: chưa có nội dung câu hỏi.` };
    const difficulty: ExamDifficulty = DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : 'thong_hieu';
    const base = {
      id: `${examId}-q${n}`,
      type,
      prompt,
      explanation: str(q?.explanation, 8000),
      difficulty,
      lessonCode: str(q?.lessonCode, 80) || undefined
    };

    if (type === 'mcq') {
      const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => str(o, 1500)) : [];
      if (options.length !== 4 || options.some((o: string) => !o)) {
        return { ok: false, error: `Câu ${n}: cần đủ 4 phương án A, B, C, D và không để trống.` };
      }
      const correct = Number(q?.correctOptionIndex);
      if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
        return { ok: false, error: `Câu ${n}: chưa chọn đáp án đúng.` };
      }
      questions.push({ ...base, options, correctOptionIndex: correct });
    } else if (type === 'true_false') {
      const statements = Array.isArray(q?.statements) ? q.statements.map((o: unknown) => str(o, 1500)) : [];
      if (statements.length !== 4 || statements.some((o: string) => !o)) {
        return { ok: false, error: `Câu ${n}: câu đúng/sai cần đủ 4 ý a, b, c, d và không để trống.` };
      }
      const truths = Array.isArray(q?.truths) ? q.truths : [];
      if (truths.length !== 4 || truths.some((t: unknown) => typeof t !== 'boolean')) {
        return { ok: false, error: `Câu ${n}: cần chọn Đúng hoặc Sai cho cả 4 ý.` };
      }
      questions.push({ ...base, options: [], correctOptionIndex: -1, statements, truths });
    } else if (type === 'short_answer') {
      const accepted = (Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [])
        .map((a: unknown) => str(a, 100)).filter(Boolean).slice(0, 10);
      if (accepted.length === 0) return { ok: false, error: `Câu ${n}: chưa nhập đáp án của câu trả lời ngắn.` };
      questions.push({ ...base, options: [], correctOptionIndex: -1, acceptedAnswers: accepted });
    } else {
      questions.push({ ...base, options: [], correctOptionIndex: -1 });
    }
  }

  const grade = [10, 11, 12].includes(Number(body?.grade)) ? Number(body.grade) : 12;
  const status: CustomExam['status'] = body?.status === 'published' ? 'published' : 'draft';
  const code = str(body?.code, 40) || `DE-${examId.slice(-6).toUpperCase()}`;

  return {
    ok: true,
    value: {
      id: examId,
      code,
      title,
      description: str(body?.description, 1000),
      durationMinutes: duration,
      grade,
      status,
      questions,
      source: body?.source === 'docx_import' ? 'docx_import' : 'manual'
    }
  };
}

// Nhớ tạm danh sách đề 30 giây (mọi học sinh đều đọc) để tiết kiệm hạn mức đọc của Firestore; xóa ngay khi có ghi.
let examCache: { at: number; rows: CustomExam[] } | null = null;
export async function listCustomExams(): Promise<CustomExam[]> {
  if (!examCache || Date.now() - examCache.at > 30_000) {
    const rows = (await store.list(COL)) as CustomExam[];
    examCache = { at: Date.now(), rows: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  }
  return examCache.rows.map((e) => ({ ...e }));
}

export async function getCustomExam(id: string): Promise<CustomExam | null> {
  return (await store.get(COL, id)) as CustomExam | null;
}

export async function saveCustomExam(exam: CustomExam): Promise<void> {
  await store.set(COL, exam.id, exam as unknown as Doc);
  examCache = null;
}

export async function deleteCustomExam(id: string): Promise<void> {
  await store.delete(COL, id);
  examCache = null;
}

/** Bản gửi cho học sinh: không có đáp án và lời giải. */
export function toPublicExam(exam: CustomExam) {
  return {
    id: exam.id,
    code: exam.code,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    grade: exam.grade,
    totalQuestions: exam.questions.length,
    createdAt: exam.createdAt,
    questions: exam.questions.map((q, i) => ({
      id: q.id,
      code: `C${i + 1}`,
      type: q.type || 'mcq',
      prompt: q.prompt,
      options: q.options,
      statements: q.statements,
      difficulty: q.difficulty,
      lessonCode: q.lessonCode
    }))
  };
}

/* ───────────── Chấm điểm ───────────── */

export interface GradableQuestion {
  id: string;
  type: ExamQType;
  correctOptionIndex?: number;
  truths?: boolean[];
  acceptedAnswers?: string[];
  explanation: string;
}

export interface GradableExam {
  id: string;
  title: string;
  durationMinutes: number;
  questions: GradableQuestion[];
}

/** Điểm thô theo thang của đề thi tốt nghiệp: mỗi câu trắc nghiệm 0,25 · mỗi câu đúng/sai tối đa 1 · mỗi câu trả lời ngắn 0,5. */
const MAX_POINTS: Record<ExamQType, number> = { mcq: 0.25, true_false: 1, short_answer: 0.5, essay: 0 };
const TF_POINTS = [0, 0.1, 0.25, 0.5, 1];

/** Chuẩn hóa đáp án trả lời ngắn: bỏ khoảng trắng, đổi dấu phẩy thành dấu chấm, so sánh theo số nếu được. */
export function sameShortAnswer(given: string, accepted: string): boolean {
  const clean = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/^\+/, '');
  const a = clean(given);
  const b = clean(accepted);
  if (!a || !b) return false;
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) <= 1e-9 * Math.max(1, Math.abs(nb));
  return false;
}

export interface QuestionOutcome {
  type: ExamQType;
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

/** Làm sạch bài làm của một câu theo dạng; trả về undefined nếu chưa trả lời hoặc sai định dạng. */
export function sanitizeAnswer(type: ExamQType, v: unknown): number | (boolean | null)[] | string | undefined {
  if (type === 'mcq') return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : undefined;
  if (type === 'true_false') {
    if (!Array.isArray(v) || v.length !== 4) return undefined;
    return v.map((x) => (typeof x === 'boolean' ? x : null));
  }
  if (typeof v === 'string') return v.slice(0, type === 'essay' ? 8000 : 60);
  return undefined;
}

export function gradeQuestion(q: GradableQuestion, answer: unknown): QuestionOutcome {
  const max = MAX_POINTS[q.type];
  if (q.type === 'true_false') {
    const truths = q.truths || [false, false, false, false];
    const given = Array.isArray(answer) ? answer : [];
    const statementCorrect = truths.map((t, i) => given[i] === t);
    const n = statementCorrect.filter(Boolean).length;
    return {
      type: q.type, isCorrect: n === 4, points: TF_POINTS[n], maxPoints: max,
      correctOptionIndex: -1, correctTruths: truths, statementCorrect, explanation: q.explanation
    };
  }
  if (q.type === 'short_answer') {
    const accepted = q.acceptedAnswers || [];
    const ok = typeof answer === 'string' && accepted.some((a) => sameShortAnswer(answer, a));
    return {
      type: q.type, isCorrect: ok, points: ok ? max : 0, maxPoints: max,
      correctOptionIndex: -1, correctAnswers: accepted, explanation: q.explanation
    };
  }
  if (q.type === 'essay') {
    return { type: q.type, isCorrect: false, points: 0, maxPoints: 0, correctOptionIndex: -1, pendingReview: true, explanation: q.explanation };
  }
  const ok = typeof answer === 'number' && answer === q.correctOptionIndex;
  return {
    type: 'mcq', isCorrect: ok, points: ok ? max : 0, maxPoints: max,
    correctOptionIndex: q.correctOptionIndex ?? -1, explanation: q.explanation
  };
}

/** Tìm đề để chấm: đề mẫu có sẵn trước, sau đó đến đề giáo viên đã phát hành. */
export async function resolveExamForGrading(examId: string): Promise<GradableExam | null> {
  const migrated = OFFICIAL_EXAMS.some((e) => e.id === examId) ? await getCustomExam(examId) : null;
  const official = migrated ? undefined : OFFICIAL_EXAMS.find((e) => e.id === examId);
  if (official) {
    return {
      id: official.id,
      title: official.title,
      durationMinutes: official.durationMinutes,
      questions: official.questionIds
        .filter((qId) => OFFICIAL_QUESTION_KEYS[qId])
        .map((qId) => ({
          id: qId, type: 'mcq' as const,
          correctOptionIndex: OFFICIAL_QUESTION_KEYS[qId].correctOptionIndex,
          explanation: OFFICIAL_QUESTION_KEYS[qId].explanation
        }))
    };
  }
  const custom = await getCustomExam(examId);
  if (!custom || custom.status !== 'published') return null;
  return {
    id: custom.id,
    title: custom.title,
    durationMinutes: custom.durationMinutes,
    questions: custom.questions.map((q) => ({
      id: q.id, type: q.type || 'mcq', correctOptionIndex: q.correctOptionIndex,
      truths: q.truths, acceptedAnswers: q.acceptedAnswers, explanation: q.explanation
    }))
  };
}


/** Nội dung một câu hỏi dùng để xem lại bài thi. Đề mẫu chỉ có mã câu (nội dung nằm ở ngân hàng câu hỏi phía trình duyệt). */
export interface ReviewQuestion {
  id: string;
  type: ExamQType;
  prompt?: string;
  options?: string[];
  statements?: string[];
}

export async function snapshotExamQuestions(examId: string): Promise<ReviewQuestion[]> {
  const migrated = OFFICIAL_EXAMS.some((e) => e.id === examId) ? await getCustomExam(examId) : null;
  const official = migrated ? undefined : OFFICIAL_EXAMS.find((e) => e.id === examId);
  if (official) {
    return official.questionIds.filter((qId) => OFFICIAL_QUESTION_KEYS[qId]).map((qId) => ({ id: qId, type: 'mcq' as const }));
  }
  const custom = await getCustomExam(examId);
  if (!custom) return [];
  return custom.questions.map((q) => ({
    id: q.id, type: q.type || 'mcq', prompt: q.prompt, options: q.options, statements: q.statements
  }));
}
