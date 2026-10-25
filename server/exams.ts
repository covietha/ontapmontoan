import { store, Doc } from './store';
import { OFFICIAL_EXAMS, OFFICIAL_QUESTION_KEYS } from './answerKeys';

/**
 * Đề thi do giáo viên soạn (thủ công hoặc nhập từ Word).
 * Đáp án chỉ nằm ở máy chủ; học sinh chỉ nhận bản công khai không có đáp án.
 */

export type ExamDifficulty = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';

export interface CustomExamQuestion {
  id: string;
  prompt: string;
  options: string[]; // đúng 4 phương án
  correctOptionIndex: number; // 0..3
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

  const questions: CustomExamQuestion[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const n = i + 1;
    const prompt = str(q?.prompt, 6000);
    if (!prompt) return { ok: false, error: `Câu ${n}: chưa có nội dung câu hỏi.` };
    const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => str(o, 1500)) : [];
    if (options.length !== 4 || options.some((o: string) => !o)) {
      return { ok: false, error: `Câu ${n}: cần đủ 4 phương án A, B, C, D và không để trống.` };
    }
    const correct = Number(q?.correctOptionIndex);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      return { ok: false, error: `Câu ${n}: chưa chọn đáp án đúng.` };
    }
    const difficulty: ExamDifficulty = DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : 'thong_hieu';
    questions.push({
      id: `${examId}-q${n}`,
      prompt,
      options,
      correctOptionIndex: correct,
      explanation: str(q?.explanation, 8000),
      difficulty,
      lessonCode: str(q?.lessonCode, 80) || undefined
    });
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

export async function listCustomExams(): Promise<CustomExam[]> {
  const rows = (await store.list(COL)) as CustomExam[];
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCustomExam(id: string): Promise<CustomExam | null> {
  return (await store.get(COL, id)) as CustomExam | null;
}

export async function saveCustomExam(exam: CustomExam): Promise<void> {
  await store.set(COL, exam.id, exam as unknown as Doc);
}

export async function deleteCustomExam(id: string): Promise<void> {
  await store.delete(COL, id);
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
      prompt: q.prompt,
      options: q.options,
      difficulty: q.difficulty,
      lessonCode: q.lessonCode
    }))
  };
}

/** Tìm đề để chấm: đề mẫu có sẵn trước, sau đó đến đề giáo viên đã phát hành. */
export async function resolveExamForGrading(examId: string): Promise<null | {
  id: string;
  title: string;
  durationMinutes: number;
  questionIds: string[];
  keyOf: (questionId: string) => { correctOptionIndex: number; explanation: string } | undefined;
}> {
  const official = OFFICIAL_EXAMS.find((e) => e.id === examId);
  if (official) {
    return {
      id: official.id,
      title: official.title,
      durationMinutes: official.durationMinutes,
      questionIds: official.questionIds,
      keyOf: (qId) => OFFICIAL_QUESTION_KEYS[qId]
    };
  }
  const custom = await getCustomExam(examId);
  if (!custom || custom.status !== 'published') return null;
  const byId = new Map(custom.questions.map((q) => [q.id, q]));
  return {
    id: custom.id,
    title: custom.title,
    durationMinutes: custom.durationMinutes,
    questionIds: custom.questions.map((q) => q.id),
    keyOf: (qId) => {
      const q = byId.get(qId);
      return q ? { correctOptionIndex: q.correctOptionIndex, explanation: q.explanation } : undefined;
    }
  };
}
