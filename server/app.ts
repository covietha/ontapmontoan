import express from 'express';
import crypto from 'crypto';
import { OFFICIAL_QUESTION_KEYS, OFFICIAL_EXAMS } from './answerKeys';
import { verifyFirebaseToken } from './auth';
import {
  hashPassword,
  verifyPassword,
  createSchoolToken,
  StoredAccountRecord,
  listAccounts,
  findAccount,
  getAccountById,
  saveAccount,
  isTeacherAccountEmail,
  getSchoolConfig,
  saveSchoolConfig,
  invalidateAccountsCache
} from './accounts';
import { store, StorageNotConfiguredError } from './store';
import { chatConfigured, isChatEnabled, setChatEnabled, usageLeft, bumpUsage, cleanMessages, askGemini, ChatUpstreamError, DAILY_LIMIT } from './chat';
import { validId, cleanTopic, cleanLesson, listCurriculum, saveCurriculum, tombstoneCurriculum } from './curriculum';
import {
  validateExamInput,
  listCustomExams,
  getCustomExam,
  saveCustomExam,
  deleteCustomExam,
  toPublicExam,
  resolveExamForGrading,
  snapshotExamQuestions,
  type ReviewQuestion,
  gradeQuestion,
  sanitizeAnswer,
  type QuestionOutcome
} from './exams';

export interface AdminRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'root_admin' | 'teacher_admin';
  assignedAt: string;
  assignedBy: string;
}

const ROOT_ADMIN: AdminRecord = {
    uid: 'teacher-root-uid-viethat',
    email: 'viethathd@gmail.com',
    displayName: 'Thầy Việt Hà (Quản trị viên gốc)',
    role: 'root_admin',
    assignedAt: '2026-01-01T00:00:00.000Z',
    assignedBy: 'system_root'
  };


export interface VerifiedExamResultRecord {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentEmail: string;
  score: number;
  correctCount: number;
  totalCount: number;
  timeSpentSeconds: number;
  userAnswers: Record<string, any>;
  verificationStatus: 'server_verified';
  gradedAt: string;
  detailedResults: Record<string, QuestionOutcome>;
  essayCount?: number;
  /** Bản chụp nội dung đề lúc chấm (đề giáo viên soạn), để xem lại đúng như học sinh đã làm dù đề sau đó bị sửa. */
  examSnapshot?: ReviewQuestion[];
  firestoreSync?: {
    synced: boolean;
    documentId: string;
    error?: string;
  };
}

/** Quản trị viên gốc luôn tồn tại; các quản trị viên khác lưu trong bộ sưu tập `admins`. */
async function listAdmins(): Promise<AdminRecord[]> {
  const stored = (await store.list('admins')) as AdminRecord[];
  return [ROOT_ADMIN, ...stored.filter((a) => a.email.toLowerCase() !== ROOT_ADMIN.email)];
}

async function isAdminEmail(email: string): Promise<boolean> {
  if (email.toLowerCase() === ROOT_ADMIN.email) return true;
  return (await store.where('admins', 'email', email.toLowerCase())).length > 0;
}

/** Giáo viên = quản trị viên hoặc tài khoản trường có vai trò giáo viên. */
async function isTeacherEmail(email: string): Promise<boolean> {
  return (await isAdminEmail(email)) || (await isTeacherAccountEmail(email));
}

const RESULTS = 'serverExamResults';

/** Bọc handler async của Express 4 để lỗi được trả về dạng JSON thay vì treo yêu cầu. */
function wrapHandlers(app: express.Express) {
  for (const method of ['get', 'post', 'put', 'delete'] as const) {
    const original = (app as any)[method].bind(app);
    (app as any)[method] = (path: any, ...handlers: any[]) => {
      if (handlers.length === 0) return original(path); // app.get('setting')
      return original(
        path,
        ...handlers.map((h) =>
          typeof h === 'function'
            ? (req: any, res: any, next: any) => Promise.resolve(h(req, res, next)).catch(next)
            : h
        )
      );
    };
  }
}

const wrapAsync = (fn: (req: any, res: any) => Promise<any>) => (req: any, res: any, next: any) => { fn(req, res).catch(next); };

export async function createExpressApp() {
  const app = express();
  wrapHandlers(app);
  // Hình trong đề thi gửi lên dạng data URL nên cho phép thân yêu cầu lớn hơn mặc định
  app.use('/api/exam-images', express.json({ limit: '1.2mb' }));
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'THPT MATH 360 Authoritative Grading & Security Server',
      timestamp: new Date().toISOString(),
      examsCount: OFFICIAL_EXAMS.length,
      keysCount: Object.keys(OFFICIAL_QUESTION_KEYS).length,
      storage: store.backend,
      sessionSecretConfigured: !!process.env.SESSION_SECRET
    });
  });

  // Server-side check for a single practice question (Topic Practice)
  app.post('/api/practice/check', async (req, res) => {
    // 1. Bắt buộc xác thực Firebase ID Token của người dùng
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính để kiểm tra câu hỏi tự luyện'
      });
    }

    const { questionId, selectedOptionIndex } = req.body;
    if (!questionId || typeof questionId !== 'string') {
      return res.status(400).json({ error: 'Mã câu hỏi không hợp lệ hoặc bị thiếu' });
    }

    if (typeof selectedOptionIndex !== 'number' || selectedOptionIndex < 0 || selectedOptionIndex > 10) {
      return res.status(400).json({ error: 'Phương án lựa chọn không hợp lệ' });
    }

    const key = OFFICIAL_QUESTION_KEYS[questionId];
    if (!key) {
      return res.status(404).json({ error: 'Không tìm thấy đáp án chuẩn của câu hỏi trên máy chủ' });
    }

    const isCorrect = selectedOptionIndex === key.correctOptionIndex;
    return res.json({
      questionId,
      isCorrect,
      correctOptionIndex: key.correctOptionIndex,
      explanation: key.explanation,
      verifiedBy: 'server',
      checkedByUid: authResult.user.uid
    });
  });

  // Server-side Authoritative Exam Grading Endpoint
  app.post('/api/exams/grade', async (req, res) => {
    // 1. Xác thực Firebase ID Token của người nộp bài
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính để chấm thi chính thức'
      });
    }

    const authenticatedUser = authResult.user;

    // 2. Chống giả mạo UID (UID Spoofing Guard)
    // Nếu client cố tình gửi studentId khác với UID trong Token đã được Google xác thực
    if (req.body.studentId && req.body.studentId !== authenticatedUser.uid) {
      return res.status(403).json({
        error: 'Từ chối giả mạo danh tính: studentId trong payload không khớp với UID trong Firebase ID Token.'
      });
    }

    const { examId, userAnswers, timeSpentSeconds } = req.body;

    // 3. Kiểm tra tính hợp lệ của tham số nộp bài
    if (!examId || typeof examId !== 'string') {
      return res.status(400).json({ error: 'Thiếu hoặc sai định dạng mã đề thi (examId)' });
    }

    // 4. Chống gửi examId tùy ý ngoài danh mục đề thi hợp lệ
    const exam = await resolveExamForGrading(examId);
    if (!exam) {
      return res.status(404).json({
        error: 'Đề thi không tồn tại hoặc chưa được phát hành trên máy chủ'
      });
    }

    // 5. Kiểm tra và làm sạch cấu trúc userAnswers (chống payload rác & DoS)
    if (userAnswers !== undefined && (typeof userAnswers !== 'object' || userAnswers === null || Array.isArray(userAnswers))) {
      return res.status(400).json({ error: 'Cấu trúc bài làm (userAnswers) không hợp lệ (phải là key-value object)' });
    }

    const rawAnswers = (userAnswers || {}) as Record<string, unknown>;
    if (Object.keys(rawAnswers).length > exam.questions.length * 3) {
      return res.status(400).json({ error: 'Số lượng câu trả lời vượt quá giới hạn bất thường của đề thi' });
    }

    // Chỉ giữ câu trả lời đúng định dạng của từng dạng câu hỏi
    const sanitizedAnswers: Record<string, any> = {};
    for (const q of exam.questions) {
      const a = sanitizeAnswer(q.type, rawAnswers[q.id]);
      if (a !== undefined) sanitizedAnswers[q.id] = a;
    }

    // 6. Chấm điểm độc lập từ đáp án chuẩn phía máy chủ
    // Tuyệt đối KHÔNG tin score, correctCount, totalCount do trình duyệt tự gửi
    let correctCount = 0;
    let earned = 0;
    let maxPoints = 0;
    let gradedCount = 0;
    let essayCount = 0;
    const detailedResults: Record<string, QuestionOutcome> = {};

    exam.questions.forEach(q => {
      const out = gradeQuestion(q, sanitizedAnswers[q.id]);
      detailedResults[q.id] = out;
      if (q.type === 'essay') { essayCount += 1; return; }
      gradedCount += 1;
      if (out.isCorrect) correctCount += 1;
      earned += out.points;
      maxPoints += out.maxPoints;
    });

    const totalCount = gradedCount;
    const rawScore = maxPoints > 0 ? (earned / maxPoints) * 10 : 0;
    const score = Math.round(rawScore * 100) / 100;

    // Chuẩn hóa thời gian làm bài (tối thiểu 1 giây, tối đa duration + 30 phút gia hạn)
    const maxAllowedSeconds = exam.durationMinutes * 60 + 1800;
    const parsedTime = typeof timeSpentSeconds === 'number' && timeSpentSeconds > 0 
      ? Math.min(Math.floor(timeSpentSeconds), maxAllowedSeconds) 
      : 1;

    const resultRecord: VerifiedExamResultRecord = {
      id: `srv_exr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      examId: exam.id,
      examTitle: exam.title,
      studentId: authenticatedUser.uid,
      studentEmail: authenticatedUser.email,
      score,
      correctCount,
      totalCount,
      timeSpentSeconds: parsedTime,
      userAnswers: sanitizedAnswers,
      verificationStatus: 'server_verified',
      gradedAt: new Date().toISOString(),
      detailedResults,
      essayCount,
      examSnapshot: await snapshotExamQuestions(exam.id)
    };

    // 7. Ghi vào sổ cái kết quả chính thức (bắt buộc) và bản công khai cho học sinh trong /examResults
    await store.set(RESULTS, resultRecord.id, resultRecord as any);
    const firestoreSync: { synced: boolean; documentId: string; error?: string } = { synced: false, documentId: resultRecord.id };
    try {
      await store.set('examResults', resultRecord.id, {
        id: resultRecord.id,
        examId: resultRecord.examId,
        examTitle: resultRecord.examTitle,
        studentId: resultRecord.studentId,
        studentEmail: resultRecord.studentEmail,
        score: resultRecord.score,
        correctCount: resultRecord.correctCount,
        totalCount: resultRecord.totalCount,
        timeSpentSeconds: resultRecord.timeSpentSeconds,
        userAnswers: resultRecord.userAnswers,
        verificationStatus: resultRecord.verificationStatus,
        completedAt: resultRecord.gradedAt
      });
      firestoreSync.synced = true;
    } catch (err: any) {
      firestoreSync.error = err?.message || 'Không ghi được bản sao kết quả';
    }

    const { examSnapshot: _snap, ...publicRecord } = resultRecord;
    return res.json({
      ...publicRecord,
      firestoreSync
    });
  });

  // Query authenticated student's verified results
  app.get('/api/exams/results', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    const { uid, email, isRootAdmin } = authResult.user;
    const isTeacher = isRootAdmin || authResult.user.role === 'teacher' || (await isAdminEmail(email));
    const rows = (isTeacher ? await store.list(RESULTS) : await store.where(RESULTS, 'studentId', uid)) as VerifiedExamResultRecord[];
    return res.json(rows.map(({ examSnapshot: _s, ...r }) => r).sort((x, y) => y.gradedAt.localeCompare(x.gradedAt)));
  });

  // Quản trị viên xóa kết quả thi (một hoặc nhiều bài) để giải phóng dung lượng. Không khôi phục được.
  app.post('/api/exams/results/delete', wrapAsync(async (req, res) => {
    const authResult = await verifyFirebaseToken(req.headers.authorization);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Yêu cầu xác thực danh tính' });
    }
    if (!authResult.user.isRootAdmin) {
      return res.status(403).json({ error: 'Chỉ Quản trị viên mới được xóa kết quả thi.' });
    }
    const ids: string[] = Array.isArray(req.body?.ids) ? Array.from(new Set(req.body.ids.map((x: any) => String(x)))) as string[] : [];
    if (ids.length === 0) return res.status(400).json({ error: 'Chưa chọn bài nào để xóa.' });
    if (ids.length > 1000) return res.status(400).json({ error: 'Mỗi lần xóa tối đa 1000 bài.' });
    if (ids.some((id) => !/^[A-Za-z0-9_.-]{1,120}$/.test(id))) return res.status(400).json({ error: 'Mã bài không hợp lệ.' });
    for (let i = 0; i < ids.length; i += 25) {
      await Promise.all(ids.slice(i, i + 25).map(async (id) => {
        await store.delete(RESULTS, id);
        await store.delete('examResults', id).catch(() => undefined);
      }));
    }
    console.log(`[results-delete] ${authResult.user.email} đã xóa ${ids.length} kết quả thi`);
    return res.json({ success: true, deleted: ids.length });
  }));

  // Xem lại chi tiết một bài thi: đề như học sinh đã làm + bài làm + đáp án đúng. Giáo viên xem mọi bài, học sinh chỉ xem bài của mình.
  app.get('/api/exams/results/:id/review', wrapAsync(async (req, res) => {
    const authResult = await verifyFirebaseToken(req.headers.authorization);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Yêu cầu xác thực danh tính' });
    }
    const { uid, email, isRootAdmin } = authResult.user;
    const isTeacher = isRootAdmin || authResult.user.role === 'teacher' || (await isAdminEmail(email));
    const rec = (await store.get(RESULTS, req.params.id)) as VerifiedExamResultRecord | null;
    if (!rec || (!isTeacher && rec.studentId !== uid)) {
      return res.status(404).json({ error: 'Không tìm thấy bài thi.' });
    }
    const { examSnapshot, ...record } = rec;
    const questions = examSnapshot && examSnapshot.length ? examSnapshot : await snapshotExamQuestions(rec.examId);
    return res.json({ record, questions });
  }));

  /* ───────────── Đề thi do giáo viên soạn ───────────── */

  const authTeacher = async (req: any, res: any) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) {
      res.status(r.statusCode || 401).json({ error: r.error || 'Yêu cầu xác thực danh tính' });
      return null;
    }
    const ok = r.user.isRootAdmin || r.user.role === 'teacher' || (await isTeacherEmail(r.user.email));
    if (!ok) {
      res.status(403).json({ error: 'Chỉ giáo viên và quản trị viên mới được soạn đề thi.' });
      return null;
    }
    return r.user;
  };


  // Giáo viên: lưu hình của câu hỏi (từ file Word). Mã hình = băm nội dung nên lưu lại cùng hình không bị trùng.
  const IMG_COL = 'examImages';
  const IMG_MAX_BYTES = 700 * 1024;
  app.post('/api/exam-images', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const m = /^data:(image\/(?:png|jpeg|gif|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
    if (!m) return res.status(400).json({ error: 'Hình không đúng định dạng (chỉ nhận PNG, JPEG, GIF, WEBP, SVG).' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > IMG_MAX_BYTES) return res.status(413).json({ error: 'Hình quá lớn (tối đa khoảng 700KB). Thầy thu nhỏ hình trong Word rồi nhập lại.' });
    if (m[1] === 'image/svg+xml' && /<script|\son\w+\s*=|javascript:|<foreignObject/i.test(buf.toString('utf8'))) {
      return res.status(400).json({ error: 'Hình SVG chứa mã không an toàn.' });
    }
    const id = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32);
    await store.set(IMG_COL, id, { id, mime: m[1], data: m[2], size: buf.length, createdBy: user.email, createdAt: new Date().toISOString() } as any);
    return res.json({ id, url: `/api/exam-images/${id}` });
  }));

  // Hình hiển thị công khai (mã khó đoán); trả về kèm chính sách chặn chạy mã.
  app.get('/api/exam-images/:id', wrapAsync(async (req, res) => {
    const id = String(req.params.id || '');
    if (!/^[a-f0-9]{8,64}$/.test(id)) return res.status(404).end();
    const doc = (await store.get(IMG_COL, id)) as any;
    if (!doc?.data) return res.status(404).end();
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    return res.send(Buffer.from(doc.data, 'base64'));
  }));

  // Học sinh: danh sách đề đã phát hành (không kèm đáp án)
  app.get('/api/exams/published', wrapAsync(async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) {
      return res.status(r.statusCode || 401).json({ error: r.error || 'Yêu cầu xác thực danh tính' });
    }
    const all = await listCustomExams();
    return res.json(all.filter((e) => e.status === 'published').map(toPublicExam));
  }));

  /* Đề mẫu của hệ thống (đề bên phải): giáo viên chép thành đề riêng để sửa, đề mẫu gốc có thể được ẩn khỏi học sinh. */
  const HIDDEN_COL = 'config';
  const HIDDEN_ID = 'hiddenOfficialExams';
  const readHidden = async (): Promise<string[]> => {
    const d = (await store.get(HIDDEN_COL, HIDDEN_ID)) as any;
    return Array.isArray(d?.ids) ? d.ids.filter((x: any) => typeof x === 'string') : [];
  };

  app.get('/api/exams/official/hidden', wrapAsync(async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) return res.status(r.statusCode || 401).json({ error: r.error || 'Yêu cầu xác thực danh tính' });
    return res.json({ ids: await readHidden() });
  }));

  // Giáo viên: chuyển đề mẫu vào cơ sở dữ liệu (giữ nguyên mã đề) để sửa trực tiếp như mọi đề khác.
  app.post('/api/exams/official/:id/migrate', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const ex = OFFICIAL_EXAMS.find((e) => e.id === req.params.id);
    if (!ex) return res.status(404).json({ error: 'Không tìm thấy đề mẫu.' });
    const existing = await getCustomExam(ex.id);
    if (existing) return res.json(existing);
    const given: any[] = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const questions = ex.questionIds.map((qId) => {
      const g = given.find((x) => x?.id === qId) || {};
      const k = OFFICIAL_QUESTION_KEYS[qId];
      return {
        type: 'mcq', prompt: g.prompt, options: g.options,
        correctOptionIndex: k?.correctOptionIndex ?? -1, explanation: k?.explanation || '',
        difficulty: g.difficulty, lessonCode: g.lessonCode
      };
    });
    const v = validateExamInput({
      title: ex.title, code: ex.code, description: String(req.body?.description || ''),
      durationMinutes: ex.durationMinutes, grade: 12, status: 'published', source: 'manual', questions
    }, ex.id);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const now = new Date().toISOString();
    const exam = { ...v.value, createdAt: now, updatedAt: now, createdBy: user.email };
    await saveCustomExam(exam);
    const set = new Set(await readHidden());
    set.add(ex.id);
    await store.set(HIDDEN_COL, HIDDEN_ID, { id: HIDDEN_ID, ids: [...set] } as any);
    return res.status(201).json(exam);
  }));

  app.put('/api/exams/official/:id/hidden', wrapAsync(async (req, res) => {
    if (!(await authTeacher(req, res))) return;
    const id = String(req.params.id);
    if (!OFFICIAL_EXAMS.some((e) => e.id === id)) return res.status(404).json({ error: 'Không tìm thấy đề mẫu.' });
    const set = new Set(await readHidden());
    if (req.body?.hidden) set.add(id); else set.delete(id);
    const ids = [...set];
    await store.set(HIDDEN_COL, HIDDEN_ID, { id: HIDDEN_ID, ids } as any);
    return res.json({ ids });
  }));

  // Giáo viên: toàn bộ đề (có đáp án)
  app.get('/api/exams/manage', wrapAsync(async (req, res) => {
    if (!(await authTeacher(req, res))) return;
    return res.json(await listCustomExams());
  }));

  app.post('/api/exams', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const id = `exam-${Date.now()}`;
    const v = validateExamInput(req.body, id);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const now = new Date().toISOString();
    const exam = { ...v.value, createdAt: now, updatedAt: now, createdBy: user.email };
    await saveCustomExam(exam);
    return res.status(201).json(exam);
  }));

  app.put('/api/exams/:id', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const old = await getCustomExam(req.params.id);
    if (!old) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    const v = validateExamInput(req.body, old.id);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const exam = { ...v.value, createdAt: old.createdAt, createdBy: old.createdBy, updatedAt: new Date().toISOString() };
    await saveCustomExam(exam);
    return res.json(exam);
  }));

  app.delete('/api/exams/:id', wrapAsync(async (req, res) => {
    if (!(await authTeacher(req, res))) return;
    const old = await getCustomExam(req.params.id);
    if (!old) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    await deleteCustomExam(old.id);
    return res.json({ ok: true });
  }));

  /* ───────────── Lớp do giáo viên tạo (nhóm học sinh lấy từ các lớp trong danh sách) ───────────── */

  const GROUPS = 'classGroups';
  const cleanGroup = async (body: any) => {
    const name = String(body?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!name) return { error: 'Vui lòng nhập tên lớp.' } as const;
    const grade = [10, 11, 12].includes(Number(body?.grade)) ? Number(body.grade) : 12;
    const academicYear = String(body?.academicYear ?? '').trim().slice(0, 20) || '2026-2027';
    const description = String(body?.description ?? '').trim().slice(0, 300);
    const wanted: string[] = Array.isArray(body?.studentIds) ? body.studentIds.map((x: any) => String(x)) : [];
    if (wanted.length > 600) return { error: 'Mỗi lớp tối đa 600 học sinh.' } as const;
    const valid = new Set((await listAccounts()).filter((a) => a.role === 'student').map((a) => a.id));
    const studentIds = Array.from(new Set(wanted.filter((id) => valid.has(id))));
    return { value: { name, grade, academicYear, description, studentIds } } as const;
  };

  // Thông tin các lớp trong danh sách (12A1…): tên lớp, năm học, giáo viên chủ nhiệm. Dùng chung cho mọi giáo viên.
  const INFO = 'classInfo';
  app.get('/api/classes/info', wrapAsync(async (req, res) => {
    if (!(await authTeacher(req, res))) return;
    const rows = (await store.list(INFO)) as any[];
    const info: Record<string, any> = {};
    rows.forEach((r) => { info[r.code] = r; });
    const teachers = (await listAccounts()).filter((a) => a.role === 'teacher' && a.status === 'active')
      .map((a) => ({ id: a.id, displayName: a.displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
    return res.json({ info, teachers });
  }));

  app.put('/api/classes/info/:code', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const code = String(req.params.code || '').toUpperCase();
    if (!/^[0-9]{2}[A-Z]{1,3}[0-9]{0,2}$/.test(code)) return res.status(400).json({ error: 'Mã lớp không hợp lệ.' });
    const name = String(req.body?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const academicYear = String(req.body?.academicYear ?? '').trim().slice(0, 20);
    if (!name || !academicYear) return res.status(400).json({ error: 'Vui lòng nhập tên lớp và năm học.' });
    const grade = [10, 11, 12].includes(Number(req.body?.grade)) ? Number(req.body.grade) : 12;
    const homeroomTeacherName = String(req.body?.homeroomTeacherName ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const homeroomTeacherId = String(req.body?.homeroomTeacherId ?? '').trim().slice(0, 80);
    const doc = { id: code, code, name, academicYear, grade, homeroomTeacherId, homeroomTeacherName, updatedBy: user.email, updatedAt: new Date().toISOString() };
    await store.set(INFO, code, doc as any);
    return res.json(doc);
  }));

  // Xóa một lớp trong danh sách (12A1…) cùng toàn bộ tài khoản học sinh của lớp. Không khôi phục được.
  // Điểm các bài đã thi vẫn được giữ. Phải gửi kèm mã lớp để xác nhận.
  app.delete('/api/classes/roster/:code', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{1,3}[0-9]{0,2}$/.test(code)) return res.status(400).json({ error: 'Mã lớp không hợp lệ.' });
    if (String(req.query.confirm || '').trim().toUpperCase() !== code) {
      return res.status(400).json({ error: 'Cần gõ đúng mã lớp để xác nhận xóa.' });
    }
    invalidateAccountsCache();
    const victims = (await listAccounts()).filter((a) => a.role === 'student' && String(a.classroom || '').toUpperCase() === code);
    const ids = victims.map((a) => a.id);
    for (let i = 0; i < ids.length; i += 25) {
      await Promise.all(ids.slice(i, i + 25).map(async (id) => {
        await store.delete('schoolAccounts', id);
        await store.delete('users', id).catch(() => undefined);
      }));
    }
    invalidateAccountsCache();
    await store.delete(INFO, code).catch(() => undefined);
    // Gỡ các học sinh đã xóa khỏi những lớp do giáo viên tạo
    if (ids.length) {
      const gone = new Set(ids);
      for (const g of (await store.list(GROUPS)) as any[]) {
        const keep = (g.studentIds || []).filter((id: string) => !gone.has(id));
        if (keep.length !== (g.studentIds || []).length) await store.set(GROUPS, g.id, { ...g, studentIds: keep } as any);
      }
    }
    console.log(`[class-delete] ${user.email} đã xóa lớp ${code} và ${ids.length} tài khoản học sinh`);
    return res.json({ success: true, deletedStudents: ids.length, message: `Đã xóa lớp ${code} và ${ids.length} tài khoản học sinh.` });
  }));

  app.get('/api/classes', wrapAsync(async (req, res) => {
    if (!(await authTeacher(req, res))) return;
    const valid = new Set((await listAccounts()).filter((a) => a.role === 'student').map((a) => a.id));
    const rows = ((await store.list(GROUPS)) as any[])
      .map((g) => ({ ...g, studentIds: (g.studentIds || []).filter((id: string) => valid.has(id)) }))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return res.json({ classes: rows });
  }));

  app.post('/api/classes', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const v = await cleanGroup(req.body);
    if ('error' in v) return res.status(400).json({ error: v.error });
    const id = `grp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const doc = { id, ...v.value, createdBy: user.email, createdAt: now, updatedAt: now };
    await store.set(GROUPS, id, doc as any);
    return res.status(201).json(doc);
  }));

  app.put('/api/classes/:id', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const old = (await store.get(GROUPS, String(req.params.id))) as any;
    if (!old) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
    if (!user.isRootAdmin && old.createdBy !== user.email) return res.status(403).json({ error: 'Chỉ người tạo lớp hoặc quản trị viên mới sửa được lớp này.' });
    const v = await cleanGroup(req.body);
    if ('error' in v) return res.status(400).json({ error: v.error });
    const doc = { ...old, ...v.value, updatedAt: new Date().toISOString() };
    await store.set(GROUPS, old.id, doc as any);
    return res.json(doc);
  }));

  app.delete('/api/classes/:id', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const old = (await store.get(GROUPS, String(req.params.id))) as any;
    if (!old) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
    if (!user.isRootAdmin && old.createdBy !== user.email) return res.status(403).json({ error: 'Chỉ người tạo lớp hoặc quản trị viên mới xóa được lớp này.' });
    await store.delete(GROUPS, old.id);
    return res.json({ ok: true });
  }));

  /* ───────────── Chuyên đề và bài học ───────────── */

  // Mọi người đã đăng nhập đều đọc được; ứng dụng ghép bản sửa này lên dữ liệu mẫu
  app.get('/api/curriculum', wrapAsync(async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) return res.status(r.statusCode || 401).json({ error: r.error || 'Yêu cầu xác thực danh tính' });
    const docs = await listCurriculum();
    return res.json({
      topics: docs.filter((d) => d.kind === 'topic' && !d.deleted).map((d) => d.data),
      lessons: docs.filter((d) => d.kind === 'lesson' && !d.deleted).map((d) => d.data),
      deletedTopicIds: docs.filter((d) => d.kind === 'topic' && d.deleted).map((d) => d.id),
      deletedLessonIds: docs.filter((d) => d.kind === 'lesson' && d.deleted).map((d) => d.id)
    });
  }));

  const curriculumRoute = (kind: 'topic' | 'lesson') => {
    const path = kind === 'topic' ? '/api/curriculum/topics/:id' : '/api/curriculum/lessons/:id';
    app.put(path, wrapAsync(async (req, res) => {
      const user = await authTeacher(req, res);
      if (!user) return;
      if (!validId(req.params.id)) return res.status(400).json({ error: 'Mã không hợp lệ (chỉ dùng chữ thường không dấu, số và dấu gạch ngang).' });
      const v = kind === 'topic' ? cleanTopic(req.params.id, req.body) : cleanLesson(req.params.id, req.body);
      if (!v.ok) return res.status(400).json({ error: v.error });
      const doc = await saveCurriculum(kind, req.params.id, v.value, user.email);
      return res.json(doc.data);
    }));
    app.delete(path, wrapAsync(async (req, res) => {
      const user = await authTeacher(req, res);
      if (!user) return;
      if (!validId(req.params.id)) return res.status(400).json({ error: 'Mã không hợp lệ.' });
      await tombstoneCurriculum(kind, req.params.id, user.email);
      return res.json({ ok: true });
    }));
  };
  curriculumRoute('topic');
  curriculumRoute('lesson');

  /* ───────────── Trợ lý Toán (chatbox) ───────────── */

  app.get('/api/chat/status', wrapAsync(async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) return res.status(r.statusCode || 401).json({ error: r.error || 'Yêu cầu xác thực danh tính' });
    const enabled = await isChatEnabled();
    return res.json({ configured: chatConfigured(), enabled, available: enabled && chatConfigured(), remaining: await usageLeft(r.user.uid), dailyLimit: DAILY_LIMIT });
  }));

  app.put('/api/chat/config', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    await setChatEnabled(req.body?.enabled !== false, user.email);
    return res.json({ enabled: await isChatEnabled() });
  }));

  app.post('/api/chat', wrapAsync(async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) return res.status(r.statusCode || 401).json({ error: r.error || 'Yêu cầu xác thực danh tính' });
    if (!chatConfigured()) return res.status(503).json({ error: 'Trợ lý Toán chưa được bật. Thầy cô cần thêm khóa GEMINI_API_KEY trên máy chủ.' });
    if (!(await isChatEnabled())) return res.status(403).json({ error: 'Trợ lý Toán đang tạm tắt.' });
    const messages = cleanMessages(req.body?.messages);
    if (!messages) return res.status(400).json({ error: 'Câu hỏi không hợp lệ.' });
    const left = await usageLeft(r.user.uid);
    if (left <= 0) return res.status(429).json({ error: (r.user.isRootAdmin || r.user.role === 'teacher') ? `Thầy/cô đã dùng hết ${DAILY_LIMIT} câu hỏi hôm nay. Mai thầy/cô hỏi tiếp nhé.` : `Em đã dùng hết ${DAILY_LIMIT} câu hỏi hôm nay. Mai em hỏi tiếp nhé.`, remaining: 0 });
    const context = typeof req.body?.context === 'string' ? req.body.context.slice(0, 1500) : '';
    try {
      const audience = r.user.isRootAdmin || r.user.role === 'teacher' ? 'teacher' : 'student';
      const reply = await askGemini(messages, context, audience);
      // Nếu máy chủ chưa có nơi lưu dữ liệu thì không đếm được lượt, nhưng vẫn trả lời học sinh
      let remaining = left - 1;
      try { await bumpUsage(r.user.uid); } catch (err) { console.error('[chat] Không ghi được số lượt:', err); remaining = left; }
      return res.json({ reply, remaining });
    } catch (e) {
      const up = e instanceof ChatUpstreamError ? e : null;
      const isStaff = r.user.isRootAdmin || r.user.role === 'teacher' || (await isTeacherEmail(r.user.email));
      const detail = up?.reason || (e instanceof Error ? e.message : String(e));
      const reason = isStaff && detail ? ` [Chỉ giáo viên thấy dòng này] ${detail}` : '';
      console.error('[chat] Lỗi:', detail);
      if (up?.status === 429) return res.status(503).json({ error: `Trợ lý đang quá tải (hết lượt miễn phí tạm thời). Em thử lại sau ít phút nhé.${reason}` });
      return res.status(502).json({ error: `Không kết nối được trợ lý. Em thử lại sau nhé.${reason}` });
    }
  }));

  // List admins: Accessible to root admin and teachers
  app.get('/api/admins', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính để xem danh sách quản trị viên'
      });
    }

    const { email, isRootAdmin } = authResult.user;
    const isTeacherOrAdmin = isRootAdmin || (await isAdminEmail(email));

    if (!isTeacherOrAdmin) {
      return res.status(403).json({
        error: 'Chỉ giáo viên và quản trị viên mới có quyền xem danh sách quản trị'
      });
    }

    return res.json(await listAdmins());
  });

  // Assign new admin: STRICTLY ROOT ADMIN ONLY (viethathd@gmail.com with verified email)
  app.post('/api/admins', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    if (!authResult.user.isRootAdmin) {
      return res.status(403).json({
        error: 'Từ chối phân quyền: Chỉ Quản trị viên gốc (viethathd@gmail.com) mới có quyền cấp quyền quản trị viên.'
      });
    }

    const { email, displayName, uid } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email quản trị viên không hợp lệ' });
    }

    const adminUid = uid || `admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAdmin: AdminRecord = {
      uid: adminUid,
      email: email.trim().toLowerCase(),
      displayName: displayName?.trim() || 'Giáo viên bộ môn Toán',
      role: 'teacher_admin',
      assignedAt: new Date().toISOString(),
      assignedBy: authResult.user.email
    };

    if (newAdmin.email === ROOT_ADMIN.email) {
      return res.status(400).json({ error: 'Quản trị viên gốc đã có sẵn toàn quyền' });
    }

    // Nếu email đã là quản trị viên thì cập nhật bản ghi cũ thay vì tạo thêm
    const existing = (await store.where('admins', 'email', newAdmin.email))[0];
    if (existing) newAdmin.uid = existing.uid;
    await store.set('admins', newAdmin.uid, newAdmin as any);

    return res.json({ success: true, admin: newAdmin });
  });

  // Revoke admin: STRICTLY ROOT ADMIN ONLY (viethathd@gmail.com with verified email)
  app.delete('/api/admins/:adminId', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    if (!authResult.user.isRootAdmin) {
      return res.status(403).json({
        error: 'Từ chối phân quyền: Chỉ Quản trị viên gốc (viethathd@gmail.com) mới có quyền thu hồi quyền quản trị viên.'
      });
    }

    const { adminId } = req.params;
    const target = (await listAdmins()).find(a => a.uid === adminId);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản quản trị viên tương ứng' });
    }

    if (target.role === 'root_admin' || target.email === 'viethathd@gmail.com') {
      return res.status(400).json({ error: 'Không thể thu hồi quyền của Quản trị viên gốc' });
    }

    await store.delete('admins', adminId);

    return res.json({ success: true, message: `Đã thu hồi quyền quản trị viên của ${target.email}` });
  });

  // =========================================================================
  // SCHOOL-MANAGED CENTRALIZED AUTHENTICATION & ACCOUNT ENDPOINTS
  // =========================================================================

  // 1. School Login Endpoint (Mã học sinh / giáo viên + Mật khẩu cấp)
  app.post('/api/auth/school-login', async (req, res) => {
    const { username, password, portalRole } = req.body;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Vui lòng nhập đầy đủ Tên đăng nhập / Mã định danh và Mật khẩu do nhà trường cấp.'
      });
    }

    const account = await findAccount(username);

    if (!account) {
      return res.status(401).json({
        error: 'Mã đăng nhập không tồn tại trong hệ thống quản lý của nhà trường.'
      });
    }

    // Check account lock status
    if (account.status === 'locked') {
      return res.status(403).json({
        error: 'Tài khoản này đã bị khóa bởi Quản trị viên nhà trường. Vui lòng liên hệ Văn phòng Đoàn / Tổ Toán.'
      });
    }

    // Enforce strict separation between Student and Teacher portals
    if (portalRole === 'student' && account.role !== 'student') {
      return res.status(403).json({
        error: 'Tài khoản này là tài khoản Giáo viên. Vui lòng chuyển sang tab "Giáo viên đăng nhập" để truy cập.'
      });
    }

    if (portalRole === 'teacher' && account.role !== 'teacher') {
      return res.status(403).json({
        error: 'Tài khoản này là tài khoản Học sinh. Vui lòng chuyển sang tab "Học sinh đăng nhập" để truy cập.'
      });
    }

    // Verify cryptographic PBKDF2-SHA512 hash
    const isPasswordValid = verifyPassword(password, account.passwordHash, account.salt);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại mật khẩu do nhà trường cấp.'
      });
    }

    // Issue secure HMAC session token
    account.lastLoginAt = new Date().toISOString();
    try {
      await saveAccount(account);
    } catch (err) {
      if (!(err instanceof StorageNotConfiguredError)) throw err; // đăng nhập vẫn tiếp tục, chỉ không ghi được giờ đăng nhập
    }
    const token = createSchoolToken(account.id, account.username, account.role);

    return res.json({
      success: true,
      token,
      profile: {
        uid: account.id,
        username: account.username,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        classroom: account.classroom,
        status: account.status,
        createdAt: account.createdAt
      }
    });
  });

  // 2. Get list of accounts (Admin: all accounts; Authorized Teacher: student accounts)
  app.get('/api/accounts', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || (await isTeacherEmail(authResult.user.email));

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ giáo viên và quản trị viên mới có quyền xem danh sách tài khoản trường.'
      });
    }

    // Filter accounts based on authority: teachers only see students
    const visibleAccounts = (await listAccounts())
      .filter(a => isRoot ? true : a.role === 'student')
      .map(({ passwordHash, salt, ...safeAccount }) => safeAccount);

    return res.json({
      accounts: visibleAccounts,
      config: await getSchoolConfig(),
      totalCount: visibleAccounts.length
    });
  });

  // Nhập danh sách học sinh theo lớp từ bảng điểm. Gọi từng lớp một (tránh quá thời gian của máy chủ),
  // sau cùng gọi finalize để xóa các tài khoản học sinh không còn trong danh sách mới.
  const CODE_RE = /^[0-9]{2}[A-Z]{1,3}[0-9]{3,4}$|^[0-9]{6,12}$/;
  const CLASS_RE = /^[0-9]{2}[A-Z]{1,3}[0-9]{0,2}$/;
  const PW_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // bỏ các ký tự dễ nhầm: i l o 0 1
  const randomPassword = () => Array.from(crypto.randomBytes(8)).map((b) => PW_CHARS[b % PW_CHARS.length]).join('');
  const inChunks = async <T,>(items: T[], size: number, fn: (x: T) => Promise<void>) => {
    for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
  };

  app.post('/api/accounts/import-students', wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    if (!user.isRootAdmin && !(await getSchoolConfig()).teachersCanCreateStudents) {
      return res.status(403).json({ error: 'Nhà trường hiện chưa bật quyền cho giáo viên tạo tài khoản học sinh.' });
    }

    if (req.body?.finalize) {
      const keep = new Set((Array.isArray(req.body.keepCodes) ? req.body.keepCodes : []).map((c: any) => String(c)));
      if (keep.size === 0) return res.status(400).json({ error: 'Danh sách giữ lại trống, không xóa học sinh cũ.' });
      const old = (await listAccounts()).filter((a) => a.role === 'student' && !keep.has(a.username));
      await inChunks(old, 25, async (a) => {
        await store.delete('schoolAccounts', a.id); invalidateAccountsCache();
        await store.delete('users', a.id).catch(() => undefined);
      });
      return res.json({ removed: old.length });
    }

    const classroom = String(req.body?.classroom || '').trim().toUpperCase();
    if (!CLASS_RE.test(classroom)) return res.status(400).json({ error: 'Tên lớp không hợp lệ.' });
    const rows: any[] = Array.isArray(req.body?.students) ? req.body.students : [];
    if (rows.length === 0 || rows.length > 80) return res.status(400).json({ error: 'Mỗi lần nhập 1 đến 80 học sinh.' });

    const clean = rows.map((r) => ({
      code: String(r?.code ?? '').trim(),
      name: String(r?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
      dob: String(r?.dob ?? '').trim().slice(0, 20),
      nid: String(r?.nationalId ?? '').trim().slice(0, 20)
    }));
    const bad = clean.find((r) => !CODE_RE.test(r.code) || !r.name);
    if (bad) return res.status(400).json({ error: `Dòng không hợp lệ (mã "${bad.code}", tên "${bad.name}").` });

    const created: { code: string; name: string; password: string }[] = [];
    let updated = 0;
    const now = new Date().toISOString();
    await inChunks(clean, 15, async (r) => {
      const id = `sch_acc_${r.code.toLowerCase()}`;
      const existing = (await store.get('schoolAccounts', id)) as unknown as StoredAccountRecord | null;
      if (existing && existing.role !== 'student') throw new Error(`Mã ${r.code} trùng với tài khoản giáo viên.`);
      let rec: StoredAccountRecord;
      if (existing) {
        rec = { ...existing, displayName: r.name, classroom, dateOfBirth: r.dob || existing.dateOfBirth, studentNumber: r.nid || existing.studentNumber };
        updated += 1;
      } else {
        const password = randomPassword();
        const { hash, salt } = hashPassword(password);
        rec = {
          id, username: r.code, displayName: r.name, email: `${r.code}@thptmath360.vn`, role: 'student',
          classroom, status: 'active', createdAt: now, createdBy: user.email, dateOfBirth: r.dob || undefined, studentNumber: r.nid || undefined,
          passwordHash: hash, salt
        };
        created.push({ code: r.code, name: r.name, password });
      }
      await saveAccount(rec);
      await store.set('users', id, {
        uid: id, username: rec.username, email: rec.email, displayName: rec.displayName, role: 'student',
        classroom, status: rec.status, createdAt: rec.createdAt
      }).catch(() => undefined);
    });
    return res.json({ classroom, created, updatedCount: updated });
  }));

  // 3. Create a new school account (Admin: teacher/student; Authorized Teacher: students)
  app.post('/api/accounts', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || (await isTeacherEmail(authResult.user.email));

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Từ chối quyền: Học sinh không thể tự tạo tài khoản.'
      });
    }

    const { username, displayName, role, classroom, password } = req.body;

    if (!username || typeof username !== 'string' || !displayName || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Mã định danh và Họ tên.' });
    }

    const targetRole = role === 'teacher' ? 'teacher' : 'student';

    // Only Root Admin can create teacher accounts
    if (targetRole === 'teacher' && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ Quản trị viên gốc (viethathd@gmail.com) mới có quyền tạo tài khoản giáo viên.'
      });
    }

    // If teacher is creating student account, check if authorized by school config
    if (targetRole === 'student' && !isRoot && !(await getSchoolConfig()).teachersCanCreateStudents) {
      return res.status(403).json({
        error: 'Nhà trường hiện chưa bật quyền cho giáo viên tự tạo tài khoản học sinh.'
      });
    }

    const schoolConfig = await getSchoolConfig();
    const cleanUsername = username.trim().toUpperCase();
    const existing = await findAccount(cleanUsername);
    if (existing) {
      return res.status(400).json({
        error: `Mã định danh ${cleanUsername} đã tồn tại trong hệ thống.`
      });
    }

    const initialPassword = password?.trim() || schoolConfig.defaultStudentPassword || 'ThptMath@2026';
    const { hash, salt } = hashPassword(initialPassword);

    const newAccount: StoredAccountRecord = {
      id: `sch_acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      displayName: displayName.trim(),
      email: `${cleanUsername.toLowerCase()}@thptmath360.vn`,
      role: targetRole,
      classroom: classroom?.trim() || (targetRole === 'teacher' ? 'Tổ Toán' : '12A1'),
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: authResult.user.email,
      passwordHash: hash,
      salt
    };

    await saveAccount(newAccount);

    // Bản sao không chứa mật khẩu vào /users để các màn hình khác đọc
    await store.set('users', newAccount.id, {
      uid: newAccount.id,
      username: newAccount.username,
      email: newAccount.email,
      displayName: newAccount.displayName,
      role: newAccount.role,
      classroom: newAccount.classroom,
      status: newAccount.status,
      createdAt: newAccount.createdAt
    }).catch(() => undefined);

    const { passwordHash: _ph, salt: _s, ...safeResponse } = newAccount;
    return res.json({
      success: true,
      account: safeResponse,
      initialPasswordProvided: initialPassword
    });
  });

  // 4. Lock / Unlock account (Admin or Teacher for student accounts)
  app.put('/api/accounts/:id/status', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || authResult.user.role === 'teacher' || (await isTeacherEmail(authResult.user.email));

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ Quản trị viên và Giáo viên mới có quyền Khóa hoặc Mở khóa tài khoản.'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const account = await findAccount(id);
    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản tương ứng' });
    }

    if (!isRoot && account.role !== 'student') {
      return res.status(403).json({
        error: 'Giáo viên chỉ được phép khóa hoặc mở khóa tài khoản học sinh.'
      });
    }

    account.status = status === 'locked' ? 'locked' : 'active';
    await saveAccount(account);
    await store.set('users', account.id, { status: account.status }, { merge: true }).catch(() => undefined);

    return res.json({
      success: true,
      message: `Đã ${account.status === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${account.username}`,
      status: account.status
    });
  });

  // 5. Reset Password for account (Admin or Teacher for student accounts)
  app.post('/api/accounts/:id/reset-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || 'Yêu cầu xác thực danh tính'
      });
    }

    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || authResult.user.role === 'teacher' || (await isTeacherEmail(authResult.user.email));

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ Quản trị viên và Giáo viên mới có quyền Đặt lại mật khẩu tài khoản.'
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const account = await findAccount(id);
    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản tương ứng' });
    }

    // Non-root teachers can only reset passwords for students
    if (!isRoot && account.role !== 'student') {
      return res.status(403).json({
        error: 'Giáo viên chỉ được phép đặt lại mật khẩu cho tài khoản học sinh.'
      });
    }

    const passwordToSet = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (passwordToSet.length < 8 || passwordToSet.length > 100) {
      return res.status(400).json({ error: 'Mật khẩu mới cần từ 8 đến 100 ký tự.' });
    }
    const { hash, salt } = hashPassword(passwordToSet);

    account.passwordHash = hash;
    account.salt = salt;
    await saveAccount(account);

    return res.json({
      success: true,
      message: `Đã lưu mật khẩu mới cho tài khoản ${account.username}`
    });
  });

  // Quản trị viên xóa tài khoản giáo viên hoặc học sinh (không khôi phục được; điểm đã thi vẫn được giữ)
  app.delete('/api/accounts/:id', wrapAsync(async (req, res) => {
    const authResult = await verifyFirebaseToken(req.headers.authorization);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Yêu cầu xác thực danh tính' });
    }
    if (!authResult.user.isRootAdmin) {
      return res.status(403).json({ error: 'Chỉ Quản trị viên gốc mới được xóa tài khoản.' });
    }
    const account = await findAccount(String(req.params.id));
    if (!account) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    if (account.id === authResult.user.uid || account.email.toLowerCase() === 'viethathd@gmail.com') {
      return res.status(400).json({ error: 'Không thể xóa tài khoản quản trị đang đăng nhập.' });
    }
    await store.delete('schoolAccounts', account.id); invalidateAccountsCache();
    await store.delete('users', account.id).catch(() => undefined);
    return res.json({ success: true, message: `Đã xóa tài khoản ${account.username} (${account.displayName}).` });
  }));

  // Người dùng tự đổi mật khẩu của chính mình (phải nhập đúng mật khẩu hiện tại)
  app.post('/api/account/change-password', async (req, res) => {
    const authResult = await verifyFirebaseToken(req.headers.authorization);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({ error: authResult.error || 'Yêu cầu xác thực danh tính' });
    }
    const account = await getAccountById(authResult.user.uid);
    if (!account) {
      return res.status(404).json({ error: 'Tài khoản này đăng nhập bằng Google nên không có mật khẩu nhà trường để đổi.' });
    }
    const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    if (!verifyPassword(current, account.passwordHash, account.salt)) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại chưa đúng.' });
    }
    if (next.length < 8 || next.length > 100) {
      return res.status(400).json({ error: 'Mật khẩu mới cần từ 8 đến 100 ký tự.' });
    }
    if (next === current) {
      return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
    }
    const { hash, salt } = hashPassword(next);
    account.passwordHash = hash;
    account.salt = salt;
    await saveAccount(account);
    return res.json({ success: true, message: 'Đã lưu mật khẩu mới. Lần đăng nhập sau dùng mật khẩu này.' });
  });

  // 6. Config: Toggle permission for teachers to create student accounts (Root Admin only)
  app.put('/api/accounts/config', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);

    if (!authResult.success || !authResult.user?.isRootAdmin) {
      return res.status(403).json({
        error: 'Chỉ Quản trị viên gốc mới có quyền thay đổi cấu hình phân quyền hệ thống.'
      });
    }

    const { teachersCanCreateStudents } = req.body;
    const config = await getSchoolConfig();
    if (typeof teachersCanCreateStudents === 'boolean') {
      config.teachersCanCreateStudents = teachersCanCreateStudents;
      await saveSchoolConfig(config);
    }

    return res.json({
      success: true,
      config
    });
  });

  // Bắt mọi lỗi chưa xử lý: trả JSON rõ ràng thay vì để yêu cầu treo
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof StorageNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error('[server] Lỗi không mong đợi:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi máy chủ không xác định' });
  });

  return app;
}
