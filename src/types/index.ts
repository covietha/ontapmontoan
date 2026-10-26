export type UserRole = 'teacher' | 'student';
export type AccountStatus = 'active' | 'locked';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  username?: string; // Mã học sinh / giáo viên (ví dụ: HS12001, GV01)
  classroom?: string;
  classroomId?: string;
  status?: AccountStatus;
  createdAt: string;
}

export interface SchoolAccount {
  id: string;
  username: string; // Mã học sinh hoặc mã giáo viên (ví dụ: HS12001, GV01)
  displayName: string;
  email: string;
  role: UserRole;
  classroom?: string;
  classroomId?: string;
  dateOfBirth?: string;
  status: AccountStatus;
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
}

export type GradeLevel = 10 | 11 | 12;
export type ClassroomStatus = 'active' | 'archived';

export interface Classroom {
  id: string; // Unique ID (e.g. 'cls-2025-12a1')
  code: string; // Mã lớp (e.g. '12A1', '10A2')
  name: string; // Tên lớp (e.g. 'Lớp 12A1')
  academicYear: string; // Năm học (e.g. '2025-2026')
  grade: GradeLevel; // 10, 11, 12
  homeroomTeacherId: string; // UID/Mã giáo viên chủ nhiệm
  homeroomTeacherName: string;
  subjectTeacherIds: string[]; // Danh sách giáo viên bộ môn được phân công
  status: ClassroomStatus; // 'active' | 'archived'
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string; // e.g. 'std_HS12001'
  studentCode: string; // Mã học sinh (e.g. 'HS12001')
  fullName: string;
  classroomId: string;
  classroomCode: string;
  academicYear: string;
  dateOfBirth?: string;
  gender?: 'Nam' | 'Nữ';
  accountId?: string; // Links to SchoolAccount
  hasAccount: boolean;
  status: 'active' | 'transferred' | 'graduated';
  createdAt: string;
}

export type QuestionDifficulty = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';
export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay';
export type ContentStatus = 'sample_needs_review' | 'verified';
export type QuestionApprovalStatus = 'pending' | 'approved' | 'rejected' | 'trash';

export interface Topic {
  id: string;
  title: string;
  description: string;
  order: number;
  grade: number; // 10, 11, 12
  icon?: string;
  status: ContentStatus;
}

export interface StepByStepExample {
  title: string;
  problem: string;
  solutionSteps: string[];
  note?: string;
}

export interface CommonMistake {
  mistakeTitle: string;
  explanation: string;
  correction: string;
  formulaNote?: string;
}

export interface Lesson {
  id: string;
  topicId: string;
  lessonCode: string; // e.g., 'BD-01-QUY-TAC-DAO-HAM'
  title: string;
  grade?: number; // 10, 11, 12
  objectives: string[];
  theorySummary: string; // formatted text / markdown / LaTeX
  formulas: {
    name: string;
    latex: string;
    note?: string;
  }[];
  stepByStepExamples: StepByStepExample[];
  commonMistakes: CommonMistake[];
  relatedPracticeQuestionIds: string[];
  status: ContentStatus;
  updatedAt: string;
  createdBy?: string;
}

export interface Question {
  id: string;
  code: string; // e.g., 'Q-DH-001'
  topicId: string;
  lessonId: string; // directly links to specific Lesson
  lessonCode: string;
  grade?: number; // 10, 11, 12
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string; // LaTeX formatted text
  options: string[]; // 4 options with LaTeX
  statements?: string[]; // câu đúng/sai: 4 ý a, b, c, d
  correctOptionIndex?: number; // 0, 1, 2, 3 (chỉ có ở câu tự luyện công khai, không có ở đề thi)
  explanation?: string; // step-by-step verified solution
  hintOnWrong: string; // heuristic advice or formula reminder
  prerequisiteKnowledge: string; // What concept is needed
  similarQuestionIds: string[]; // Linked similar questions
  status: ContentStatus;
  approvalStatus?: QuestionApprovalStatus; // 'pending' | 'approved' | 'rejected' | 'trash'
  rejectedReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  source?: 'manual' | 'docx_import' | 'initial_bank';
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface QuestionSnapshot {
  questionId: string;
  code: string;
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
  explanation?: string;
  difficulty: QuestionDifficulty;
  lessonCode?: string;
}

export interface Exam {
  id: string;
  title: string;
  code: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  grade?: number; // 10, 11, 12
  questionIds: string[];
  questionSnapshots?: Record<string, QuestionSnapshot>; // Snapshot of questions at publishing time
  status: ContentStatus;
  createdAt: string;
  /** Đề do giáo viên soạn và phát hành trên máy chủ: câu hỏi đi kèm, không có đáp án. */
  isCustom?: boolean;
  customQuestions?: Question[];
}

export interface QuestionAttempt {
  id: string;
  studentId: string;
  studentEmail: string;
  questionId: string;
  lessonId: string;
  topicId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  attemptNumber: number;
  reAttemptCount: number;
  resolvedAfterReview: boolean;
  timestamp: string;
}

export interface QuestionKey {
  questionId: string;
  correctOptionIndex: number; // 0, 1, 2, 3
  explanation: string; // step-by-step verified solution
}

export type GradeVerificationStatus = 'server_verified' | 'client_preview_unverified';

export interface ExamResult {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentEmail: string;
  score: number; // Scale of 10
  correctCount: number;
  totalCount: number;
  timeSpentSeconds: number;
  userAnswers: Record<string, any>; // questionId -> số (trắc nghiệm) | mảng đúng/sai | chuỗi (trả lời ngắn, tự luận)
  verificationStatus: GradeVerificationStatus;
  completedAt: string;
}
