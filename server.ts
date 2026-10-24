import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { OFFICIAL_QUESTION_KEYS, OFFICIAL_EXAMS } from './server/answerKeys';
import { verifyFirebaseToken } from './server/auth';
import { 
  SERVER_ACCOUNTS, 
  SCHOOL_CONFIG, 
  hashPassword, 
  verifyPassword, 
  createSchoolToken, 
  saveAccounts,
  StoredAccountRecord 
} from './server/accounts';
import firebaseConfig from './firebase-applet-config.json';

// Initialize server-side Firestore instance
const serverApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig, 'SERVER_APP');
const serverDb = getFirestore(serverApp, firebaseConfig.firestoreDatabaseId);

export interface AdminRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'root_admin' | 'teacher_admin';
  assignedAt: string;
  assignedBy: string;
}

export const SERVER_ADMINS: AdminRecord[] = [
  {
    uid: 'teacher-root-uid-viethat',
    email: 'viethathd@gmail.com',
    displayName: 'Thầy Việt Hà (Quản trị viên gốc)',
    role: 'root_admin',
    assignedAt: '2026-01-01T00:00:00.000Z',
    assignedBy: 'system_root'
  }
];

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
  userAnswers: Record<string, number>;
  verificationStatus: 'server_verified';
  gradedAt: string;
  detailedResults: Record<string, { isCorrect: boolean; correctOptionIndex: number; explanation: string }>;
  firestoreSync?: {
    synced: boolean;
    documentId: string;
    error?: string;
  };
}

// Authoritative in-memory ledger of server-verified exam results
export const SERVER_VERIFIED_RESULTS: VerifiedExamResultRecord[] = [];

export async function createExpressApp() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'THPT MATH 360 Authoritative Grading & Security Server',
      timestamp: new Date().toISOString(),
      examsCount: OFFICIAL_EXAMS.length,
      keysCount: Object.keys(OFFICIAL_QUESTION_KEYS).length,
      totalVerifiedResults: SERVER_VERIFIED_RESULTS.length
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
    const exam = OFFICIAL_EXAMS.find(e => e.id === examId);
    if (!exam) {
      return res.status(404).json({
        error: 'Đề thi không tồn tại hoặc chưa được phát hành trên máy chủ'
      });
    }

    // 5. Kiểm tra và làm sạch cấu trúc userAnswers (chống payload rác & DoS)
    if (userAnswers !== undefined && (typeof userAnswers !== 'object' || userAnswers === null || Array.isArray(userAnswers))) {
      return res.status(400).json({ error: 'Cấu trúc bài làm (userAnswers) không hợp lệ (phải là key-value object)' });
    }

    const rawAnswers = (userAnswers || {}) as Record<string, any>;
    const answerKeys = Object.keys(rawAnswers);
    if (answerKeys.length > exam.questionIds.length * 3) {
      return res.status(400).json({ error: 'Số lượng câu trả lời vượt quá giới hạn bất thường của đề thi' });
    }

    // Làm sạch câu trả lời: chỉ giữ số nguyên hợp lệ [0..10]
    const sanitizedAnswers: Record<string, number> = {};
    for (const [qId, val] of Object.entries(rawAnswers)) {
      if (typeof qId === 'string' && typeof val === 'number' && Number.isInteger(val) && val >= 0 && val <= 10) {
        sanitizedAnswers[qId] = val;
      }
    }

    // 6. Chấm điểm độc lập từ đáp án chuẩn phía máy chủ
    // Tuyệt đối KHÔNG tin score, correctCount, totalCount do trình duyệt tự gửi
    let correctCount = 0;
    const detailedResults: Record<string, { isCorrect: boolean; correctOptionIndex: number; explanation: string }> = {};

    exam.questionIds.forEach(qId => {
      const selected = sanitizedAnswers[qId];
      const key = OFFICIAL_QUESTION_KEYS[qId];
      if (key) {
        const isCorrect = typeof selected === 'number' && selected === key.correctOptionIndex;
        if (isCorrect) correctCount += 1;
        detailedResults[qId] = {
          isCorrect,
          correctOptionIndex: key.correctOptionIndex,
          explanation: key.explanation
        };
      }
    });

    const totalCount = exam.questionIds.length;
    const rawScore = totalCount > 0 ? (correctCount / totalCount) * 10 : 0;
    const score = Math.round(rawScore * 10) / 10;

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
      detailedResults
    };

    // 7. Cố gắng đồng bộ kết quả vào Firestore đúng tài liệu /examResults
    let firestoreSync: { synced: boolean; documentId: string; error?: string };
    try {
      const resultDocRef = doc(serverDb, 'examResults', resultRecord.id);
      await setDoc(resultDocRef, {
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
      firestoreSync = { synced: true, documentId: resultRecord.id };
    } catch (err: any) {
      firestoreSync = {
        synced: false,
        documentId: resultRecord.id,
        error: err?.message || 'Quy tắc Firestore bảo mật hoặc quyền truy cập từ chối ghi'
      };
    }

    // Ghi nhận vào sổ cái kết quả chính thức phía máy chủ
    SERVER_VERIFIED_RESULTS.unshift(resultRecord);

    return res.json({
      ...resultRecord,
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
    const isTeacher = isRootAdmin || SERVER_ADMINS.some(a => a.email.toLowerCase() === email.toLowerCase());
    if (isTeacher) {
      return res.json(SERVER_VERIFIED_RESULTS);
    }

    const myResults = SERVER_VERIFIED_RESULTS.filter(r => r.studentId === uid);
    return res.json(myResults);
  });

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
    const isTeacherOrAdmin = isRootAdmin || SERVER_ADMINS.some(a => a.email.toLowerCase() === email.toLowerCase());

    if (!isTeacherOrAdmin) {
      return res.status(403).json({
        error: 'Chỉ giáo viên và quản trị viên mới có quyền xem danh sách quản trị'
      });
    }

    return res.json(SERVER_ADMINS);
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

    // Save to Firestore /admins collection
    try {
      await setDoc(doc(serverDb, 'admins', newAdmin.uid), {
        uid: newAdmin.uid,
        email: newAdmin.email,
        displayName: newAdmin.displayName,
        role: newAdmin.role,
        assignedAt: newAdmin.assignedAt,
        assignedBy: newAdmin.assignedBy
      });
    } catch (e: any) {
      console.warn('[server] Firestore admins sync deferred:', e?.message || e);
    }

    // Add to in-memory ledger
    const existingIdx = SERVER_ADMINS.findIndex(a => a.email.toLowerCase() === newAdmin.email);
    if (existingIdx >= 0) {
      SERVER_ADMINS[existingIdx] = newAdmin;
    } else {
      SERVER_ADMINS.push(newAdmin);
    }

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
    const target = SERVER_ADMINS.find(a => a.uid === adminId);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản quản trị viên tương ứng' });
    }

    if (target.role === 'root_admin' || target.email === 'viethathd@gmail.com') {
      return res.status(400).json({ error: 'Không thể thu hồi quyền của Quản trị viên gốc' });
    }

    try {
      await deleteDoc(doc(serverDb, 'admins', adminId));
    } catch (e: any) {
      console.warn('[server] Firestore admin delete deferred:', e?.message || e);
    }

    const idx = SERVER_ADMINS.findIndex(a => a.uid === adminId);
    if (idx >= 0) {
      SERVER_ADMINS.splice(idx, 1);
    }

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

    const cleanUsername = username.trim().toLowerCase();
    const account = SERVER_ACCOUNTS.find(a => 
      a.username.toLowerCase() === cleanUsername || 
      a.id.toLowerCase() === cleanUsername ||
      a.email.toLowerCase() === cleanUsername
    );

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
    saveAccounts(SERVER_ACCOUNTS);
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
    const isTeacher = isRoot || SERVER_ADMINS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase()) ||
      SERVER_ACCOUNTS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase() && a.role === 'teacher');

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ giáo viên và quản trị viên mới có quyền xem danh sách tài khoản trường.'
      });
    }

    // Filter accounts based on authority: teachers only see students
    const visibleAccounts = SERVER_ACCOUNTS
      .filter(a => isRoot ? true : a.role === 'student')
      .map(({ passwordHash, salt, ...safeAccount }) => safeAccount);

    return res.json({
      accounts: visibleAccounts,
      config: SCHOOL_CONFIG,
      totalCount: visibleAccounts.length
    });
  });

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
    const isTeacher = isRoot || SERVER_ADMINS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase()) ||
      SERVER_ACCOUNTS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase() && a.role === 'teacher');

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
    if (targetRole === 'student' && !isRoot && !SCHOOL_CONFIG.teachersCanCreateStudents) {
      return res.status(403).json({
        error: 'Nhà trường hiện chưa bật quyền cho giáo viên tự tạo tài khoản học sinh.'
      });
    }

    const cleanUsername = username.trim().toUpperCase();
    const existing = SERVER_ACCOUNTS.find(a => a.username.toUpperCase() === cleanUsername);
    if (existing) {
      return res.status(400).json({
        error: `Mã định danh ${cleanUsername} đã tồn tại trong hệ thống.`
      });
    }

    const initialPassword = password?.trim() || SCHOOL_CONFIG.defaultStudentPassword || 'ThptMath@2026';
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

    SERVER_ACCOUNTS.push(newAccount);
    saveAccounts(SERVER_ACCOUNTS);

    // Sync to Firestore /users for consistency
    try {
      await setDoc(doc(serverDb, 'users', newAccount.id), {
        uid: newAccount.id,
        username: newAccount.username,
        email: newAccount.email,
        displayName: newAccount.displayName,
        role: newAccount.role,
        classroom: newAccount.classroom,
        status: newAccount.status,
        createdAt: newAccount.createdAt
      });
    } catch (e: any) {
      console.warn('[server] Firestore account sync deferred:', e?.message || e);
    }

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
    const isTeacher = isRoot || authResult.user.role === 'teacher' ||
      SERVER_ADMINS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase()) ||
      SERVER_ACCOUNTS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase() && a.role === 'teacher');

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ Quản trị viên và Giáo viên mới có quyền Khóa hoặc Mở khóa tài khoản.'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const account = SERVER_ACCOUNTS.find(a => a.id === id || a.username.toLowerCase() === id.toLowerCase());
    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản tương ứng' });
    }

    if (!isRoot && account.role !== 'student') {
      return res.status(403).json({
        error: 'Giáo viên chỉ được phép khóa hoặc mở khóa tài khoản học sinh.'
      });
    }

    account.status = status === 'locked' ? 'locked' : 'active';
    saveAccounts(SERVER_ACCOUNTS);

    try {
      await setDoc(doc(serverDb, 'users', account.id), { status: account.status }, { merge: true });
    } catch (e: any) {
      // Deferred
    }

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
    const isTeacher = isRoot || authResult.user.role === 'teacher' ||
      SERVER_ADMINS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase()) ||
      SERVER_ACCOUNTS.some(a => a.email.toLowerCase() === authResult.user?.email.toLowerCase() && a.role === 'teacher');

    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: 'Chỉ Quản trị viên và Giáo viên mới có quyền Đặt lại mật khẩu tài khoản.'
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const account = SERVER_ACCOUNTS.find(a => a.id === id || a.username.toLowerCase() === id.toLowerCase());
    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản tương ứng' });
    }

    // Non-root teachers can only reset passwords for students
    if (!isRoot && account.role !== 'student') {
      return res.status(403).json({
        error: 'Giáo viên chỉ được phép đặt lại mật khẩu cho tài khoản học sinh.'
      });
    }

    const passwordToSet = newPassword?.trim() || SCHOOL_CONFIG.defaultStudentPassword || 'ThptMath@2026';
    const { hash, salt } = hashPassword(passwordToSet);

    account.passwordHash = hash;
    account.salt = salt;
    saveAccounts(SERVER_ACCOUNTS); // Immediately persist to disk

    return res.json({
      success: true,
      message: `Đã đặt lại mật khẩu thành công cho tài khoản ${account.username}`,
      newPassword: passwordToSet
    });
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
    if (typeof teachersCanCreateStudents === 'boolean') {
      SCHOOL_CONFIG.teachersCanCreateStudents = teachersCanCreateStudents;
    }

    return res.json({
      success: true,
      config: SCHOOL_CONFIG
    });
  });

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Mount Vite development middlewares
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[THPT MATH 360] Authoritative Grading Server listening at http://0.0.0.0:${PORT}`);
  });
}

// Only start listener if run directly (not imported in tests)
if (process.env.NODE_ENV !== 'test_runner') {
  startServer();
}
