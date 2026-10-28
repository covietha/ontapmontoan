import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { 
  Topic, 
  Lesson, 
  Question, 
  Exam, 
  QuestionAttempt, 
  ExamResult, 
  ContentStatus,
  GradeVerificationStatus,
  QuestionApprovalStatus,
  Classroom,
  GradeLevel,
  StudentProfile,
  QuestionSnapshot
} from '../types';
import { 
  INITIAL_TOPICS, 
  INITIAL_LESSONS, 
  INITIAL_QUESTIONS, 
  INITIAL_EXAMS,
  INITIAL_CLASSROOMS,
  INITIAL_STUDENTS
} from '../data/initialData';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
  topics: Topic[];
  lessons: Lesson[];
  questions: Question[];
  exams: Exam[];
  /** Tải lại các đề giáo viên đã phát hành từ máy chủ. */
  refreshExams: () => Promise<void>;
  refreshRoster: () => Promise<void>;
  saveClassInfo: (cls: Classroom) => Promise<void>;
  /** Xóa lớp và toàn bộ tài khoản học sinh của lớp; trả về số học sinh đã xóa. */
  deleteClassroom: (code: string) => Promise<number>;
  teacherOptions: { id: string; displayName: string }[];
  allOfficialExams: Exam[];
  hiddenOfficialIds: string[];
  /** Giáo viên lưu/xóa chuyên đề và bài học trên máy chủ; mọi học sinh thấy ngay sau khi tải lại. */
  saveTopic: (topic: Topic) => Promise<void>;
  saveLesson: (lesson: Lesson) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  attempts: QuestionAttempt[];
  examResults: ExamResult[];
  classrooms: Classroom[];
  students: StudentProfile[];
  loading: boolean;
  
  // Lookups
  getLessonById: (lessonId: string) => Lesson | undefined;
  getQuestionById: (questionId: string) => Question | undefined;
  getSimilarQuestions: (questionId: string) => Question[];
  getClassroomById: (classroomId: string) => Classroom | undefined;
  getStudentsByClassroom: (classroomId: string) => StudentProfile[];
  
  // Student actions
  recordQuestionAttempt: (params: {
    questionId: string;
    lessonId: string;
    topicId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
    isReAttempt?: boolean;
  }) => Promise<QuestionAttempt>;
  
  recordExamResult: (params: {
    examId: string;
    examTitle: string;
    score: number;
    correctCount: number;
    totalCount: number;
    timeSpentSeconds: number;
    userAnswers: Record<string, any>;
    verificationStatus?: GradeVerificationStatus;
  }) => Promise<ExamResult>;
  
  markMistakeResolved: (attemptId: string) => void;
  
  // Teacher & Content actions
  updateLesson: (lesson: Lesson) => Promise<void>;
  addLesson: (lesson: Omit<Lesson, 'id'>) => Promise<void>;
  updateQuestion: (question: Question) => Promise<void>;
  addQuestion: (question: Omit<Question, 'id'>) => Promise<void>;
  verifyContent: (type: 'lesson' | 'question' | 'exam', id: string) => Promise<void>;
  
  // Question Workflow (4 states: pending, approved, rejected, trash)
  approveQuestion: (questionId: string) => Promise<void>;
  rejectQuestion: (questionId: string, reason: string) => Promise<void>;
  moveToTrashQuestion: (questionId: string) => Promise<void>;
  restoreQuestion: (questionId: string) => Promise<void>;
  deleteQuestionPermanently: (questionId: string) => Promise<{ success: boolean; error?: string }>;
  importWordQuestions: (parsedQuestions: Omit<Question, 'id' | 'createdAt'>[]) => Promise<{ importedCount: number; duplicateCount: number }>;
  
  // Exam creation with Snapshot
  createExamWithSnapshot: (examData: {
    title: string;
    code: string;
    description: string;
    durationMinutes: number;
    questionIds: string[];
    grade?: number;
  }) => Promise<Exam>;

  // Classroom Management
  addClassroom: (classroomData: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string; classroom?: Classroom }>;
  updateClassroom: (classroom: Classroom) => Promise<void>;
  archiveClassroom: (classroomId: string) => Promise<void>;
  addStudentsBatch: (newStudents: Omit<StudentProfile, 'id' | 'createdAt'>[]) => Promise<{ addedCount: number; duplicateCount: number; errors: string[] }>;
  transferStudent: (studentId: string, targetClassroomId: string, targetClassroomCode: string) => Promise<void>;
  createAccountsBatchForClassroom: (classroomId: string, studentIds: string[], defaultPassword?: string) => Promise<{ createdCount: number; existedCount: number; failedCount: number; accounts: any[] }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isTeacher, isRootAdmin, getIdToken } = useAuth();
  
  const [baseTopics, setBaseTopics] = useState<Topic[]>(() => {
    const saved = localStorage.getItem('thpt_math_topics');
    return saved ? JSON.parse(saved) : INITIAL_TOPICS;
  });

  const [baseLessons, setBaseLessons] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('thpt_math_lessons');
    return saved ? JSON.parse(saved) : INITIAL_LESSONS;
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('thpt_math_questions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((q: any) => ({
          ...q,
          approvalStatus: q.approvalStatus || (q.status === 'verified' ? 'approved' : 'pending'),
          grade: q.grade || 12
        }));
      } catch {
        // Fallback
      }
    }
    return INITIAL_QUESTIONS.map(q => ({
      ...q,
      approvalStatus: 'approved' as QuestionApprovalStatus,
      grade: 12
    }));
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('thpt_math_exams');
    return saved ? JSON.parse(saved) : INITIAL_EXAMS;
  });

  const [publishedExams, setPublishedExams] = useState<Exam[]>([]);
  const [hiddenOfficial, setHiddenOfficial] = useState<string[]>([]);

  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    const saved = localStorage.getItem('thpt_math_classrooms');
    return saved ? JSON.parse(saved) : INITIAL_CLASSROOMS;
  });

  const [students, setStudents] = useState<StudentProfile[]>(() => {
    const saved = localStorage.getItem('thpt_math_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [attempts, setAttempts] = useState<QuestionAttempt[]>(() => {
    const saved = localStorage.getItem('thpt_math_attempts');
    return saved ? JSON.parse(saved) : [];
  });

  const [examResults, setExamResults] = useState<ExamResult[]>(() => {
    const saved = localStorage.getItem('thpt_math_exam_results');
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('thpt_math_topics', JSON.stringify(baseTopics));
  }, [baseTopics]);

  useEffect(() => {
    localStorage.setItem('thpt_math_lessons', JSON.stringify(baseLessons));
  }, [baseLessons]);

  useEffect(() => {
    localStorage.setItem('thpt_math_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('thpt_math_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('thpt_math_classrooms', JSON.stringify(classrooms));
  }, [classrooms]);

  useEffect(() => {
    localStorage.setItem('thpt_math_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('thpt_math_attempts', JSON.stringify(attempts));
  }, [attempts]);

  useEffect(() => {
    localStorage.setItem('thpt_math_exam_results', JSON.stringify(examResults));
  }, [examResults]);

  // Sync exam results from server endpoint
  useEffect(() => {
    const syncServerResults = async () => {
      try {
        const token = await getIdToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/exams/results', { headers });
        if (res.ok) {
          const serverData = await res.json();
          if (Array.isArray(serverData)) {
            setExamResults(prev => {
              const ids = new Set(prev.map(r => r.id));
              const merged = [...prev];
              serverData.forEach((raw: any) => {
                const s = { ...raw, completedAt: raw.completedAt || raw.gradedAt } as ExamResult;
                if (!ids.has(s.id)) {
                  merged.push(s);
                  ids.add(s.id);
                }
              });
              return merged;
            });
          }
        }
      } catch (e) {
        // Safe offline
      }
    };

    if (profile?.uid) {
      syncServerResults();
    }
  }, [profile?.uid, getIdToken]);

  // Chuyên đề, bài học giáo viên đã thêm/sửa/xóa trên máy chủ: ghép lên dữ liệu mẫu, dùng chung cho mọi máy
  const [curriculum, setCurriculum] = useState<{ topics: Topic[]; lessons: Lesson[]; deletedTopicIds: string[]; deletedLessonIds: string[] }>(
    { topics: [], lessons: [], deletedTopicIds: [], deletedLessonIds: [] }
  );

  const topics = React.useMemo(() => {
    const over = new Map(curriculum.topics.map(t => [t.id, t]));
    const gone = new Set(curriculum.deletedTopicIds);
    const merged = baseTopics.filter(t => !gone.has(t.id)).map(t => over.get(t.id) || t);
    curriculum.topics.forEach(t => { if (!baseTopics.some(b => b.id === t.id)) merged.push(t); });
    return merged.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [baseTopics, curriculum]);

  const lessons = React.useMemo(() => {
    const over = new Map(curriculum.lessons.map(l => [l.id, l]));
    const gone = new Set(curriculum.deletedLessonIds);
    const merged = baseLessons.filter(l => !gone.has(l.id)).map(l => over.get(l.id) || l);
    curriculum.lessons.forEach(l => { if (!baseLessons.some(b => b.id === l.id)) merged.push(l); });
    return merged;
  }, [baseLessons, curriculum]);

  const refreshCurriculum = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/curriculum', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const d = await res.json();
      setCurriculum({
        topics: d.topics || [], lessons: d.lessons || [],
        deletedTopicIds: d.deletedTopicIds || [], deletedLessonIds: d.deletedLessonIds || []
      });
    } catch {
      // Không có mạng: dùng dữ liệu đang có
    }
  }, [getIdToken]);

  useEffect(() => {
    if (profile?.uid) refreshCurriculum();
  }, [profile?.uid, refreshCurriculum]);

  const curriculumRequest = async (method: 'PUT' | 'DELETE', kind: 'topics' | 'lessons', id: string, body?: unknown) => {
    const token = await getIdToken();
    const res = await fetch(`/api/curriculum/${kind}/${id}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
    await refreshCurriculum();
  };

  const saveTopic = (t: Topic) => curriculumRequest('PUT', 'topics', t.id, t);
  const saveLesson = (l: Lesson) => curriculumRequest('PUT', 'lessons', l.id, l);
  const deleteTopic = (id: string) => curriculumRequest('DELETE', 'topics', id);
  const deleteLesson = (id: string) => curriculumRequest('DELETE', 'lessons', id);

  // Đề do giáo viên soạn: lấy từ máy chủ, không lưu vào localStorage
  const refreshExams = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      try {
        const h = await fetch('/api/exams/official/hidden', { headers: { Authorization: `Bearer ${token}` } });
        if (h.ok) { const j = await h.json(); if (Array.isArray(j?.ids)) setHiddenOfficial(j.ids); }
      } catch { /* giữ danh sách cũ */ }
      const res = await fetch('/api/exams/published', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const rows = await res.json();
      if (!Array.isArray(rows)) return;
      setPublishedExams(rows.map((e: any): Exam => ({
        id: e.id,
        title: e.title,
        code: e.code,
        description: e.description || '',
        durationMinutes: e.durationMinutes,
        totalQuestions: e.questions.length,
        grade: e.grade,
        questionIds: e.questions.map((q: any) => q.id),
        status: 'verified',
        createdAt: e.createdAt,
        isCustom: true,
        customQuestions: e.questions.map((q: any): Question => ({
          id: q.id,
          code: q.code,
          topicId: '',
          lessonId: '',
          lessonCode: q.lessonCode || '',
          grade: e.grade,
          questionType: q.type || 'mcq',
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options || [],
          statements: q.statements,
          hintOnWrong: '',
          prerequisiteKnowledge: '',
          similarQuestionIds: [],
          status: 'verified',
          approvalStatus: 'approved',
          source: 'manual',
          createdAt: e.createdAt
        }))
      })));
    } catch {
      // Không có mạng: giữ danh sách hiện có
    }
  }, [getIdToken]);

  useEffect(() => {
    if (profile?.uid) refreshExams();
    else setPublishedExams([]);
  }, [profile?.uid, refreshExams]);

  // Danh sách học sinh và lớp: lấy từ tài khoản học sinh trên máy chủ (nguồn duy nhất, mọi giáo viên thấy như nhau)
  const [classInfo, setClassInfo] = useState<Record<string, any>>({});
  const [teacherOptions, setTeacherOptions] = useState<{ id: string; displayName: string }[]>([]);

  const saveClassInfo = async (cls: Classroom) => {
    const token = await getIdToken();
    const res = await fetch(`/api/classes/info/${encodeURIComponent(cls.code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name: cls.name, academicYear: cls.academicYear, grade: cls.grade, homeroomTeacherId: cls.homeroomTeacherId, homeroomTeacherName: cls.homeroomTeacherName })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
    setClassInfo(prev => ({ ...prev, [cls.code]: data }));
    setClassrooms(prev => prev.map(c => (c.code === cls.code ? { ...c, ...cls, updatedAt: new Date().toISOString() } : c)));
  };

  const deleteClassroom = async (code: string): Promise<number> => {
    const token = await getIdToken();
    const res = await fetch(`/api/classes/roster/${encodeURIComponent(code)}?confirm=${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
    await refreshRoster();
    return data.deletedStudents ?? 0;
  };

  const refreshRoster = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      let info: Record<string, any> = {};
      try {
        const ri = await fetch('/api/classes/info', { headers: { Authorization: `Bearer ${token}` } });
        if (ri.ok) { const j = await ri.json(); info = j.info || {}; setClassInfo(info); setTeacherOptions(j.teachers || []); }
      } catch { /* dùng thông tin đã có */ }
      const res = await fetch('/api/accounts', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const accs: any[] = (data?.accounts || []).filter((a: any) => a.role === 'student');
      if (accs.length === 0) return;
      const iso = (d?: string) => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || '');
        return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
      };
      const codes = Array.from(new Set(accs.map(a => String(a.classroom || '').toUpperCase()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
      const now = new Date().toISOString();
      setClassrooms(prev => codes.map(code => {
        const old0 = prev.find(c => c.code === code);
        const saved = info[code];
        const old = old0 && saved ? { ...old0, name: saved.name, academicYear: saved.academicYear, grade: saved.grade || old0.grade, homeroomTeacherId: saved.homeroomTeacherId, homeroomTeacherName: saved.homeroomTeacherName } : old0;
        if (!old && saved) {
          return { id: `cls-2025-${code.toLowerCase()}`, code, name: saved.name, academicYear: saved.academicYear, grade: saved.grade || 12,
            homeroomTeacherId: saved.homeroomTeacherId || '', homeroomTeacherName: saved.homeroomTeacherName || '', subjectTeacherIds: [], status: 'active', createdAt: now, updatedAt: now } as Classroom;
        }
        if (saved) return old as Classroom;
        if (old) {
          // Tên lớp theo danh sách nhà trường; xóa giáo viên chủ nhiệm mẫu cũ chưa do thầy cô tự gán
          const demo = INITIAL_CLASSROOMS.find(c => c.code === code);
          const isDemoTeacher = !!demo && old.homeroomTeacherId === demo.homeroomTeacherId;
          return { ...old, name: `Lớp ${code}`, academicYear: '2026-2027', grade: (parseInt(code, 10) as GradeLevel) || old.grade,
            homeroomTeacherId: isDemoTeacher ? '' : old.homeroomTeacherId, homeroomTeacherName: isDemoTeacher ? '' : old.homeroomTeacherName,
            subjectTeacherIds: isDemoTeacher ? [] : old.subjectTeacherIds } as Classroom;
        }
        return {
          id: `cls-2025-${code.toLowerCase()}`, code, name: `Lớp ${code}`, academicYear: '2026-2027',
          grade: (parseInt(code, 10) as GradeLevel) || 12, homeroomTeacherId: '', homeroomTeacherName: '',
          subjectTeacherIds: [], status: 'active', createdAt: now, updatedAt: now
        } as Classroom;
      }));
      setStudents(accs.map((a): StudentProfile => ({
        id: `std_${a.username}`, studentCode: a.username, fullName: a.displayName,
        classroomId: `cls-2025-${String(a.classroom).toLowerCase()}`, classroomCode: String(a.classroom).toUpperCase(),
        academicYear: '2026-2027', dateOfBirth: iso(a.dateOfBirth), accountId: a.id, hasAccount: true,
        status: a.status === 'locked' ? 'transferred' : 'active', createdAt: a.createdAt
      })));
    } catch {
      // Không có mạng: giữ danh sách hiện có
    }
  }, [getIdToken]);

  useEffect(() => {
    if (profile?.uid && isTeacher) refreshRoster();
  }, [profile?.uid, isTeacher, refreshRoster]);

  // Lookups
  const getLessonById = (lessonId: string): Lesson | undefined => {
    return lessons.find(l => l.id === lessonId || l.lessonCode === lessonId);
  };

  const getQuestionById = (questionId: string): Question | undefined => {
    return questions.find(q => q.id === questionId || q.code === questionId);
  };

  const getSimilarQuestions = (questionId: string): Question[] => {
    const target = getQuestionById(questionId);
    if (!target) return [];
    return questions.filter(
      q => q.id !== questionId && 
           q.approvalStatus !== 'trash' &&
           (q.lessonId === target.lessonId || target.similarQuestionIds?.includes(q.id))
    );
  };

  const getClassroomById = (classroomId: string): Classroom | undefined => {
    return classrooms.find(c => c.id === classroomId || c.code === classroomId);
  };

  const getStudentsByClassroom = (classroomId: string): StudentProfile[] => {
    return students.filter(s => s.classroomId === classroomId || s.classroomCode === classroomId);
  };

  // Student Actions
  const recordQuestionAttempt = async (params: {
    questionId: string;
    lessonId: string;
    topicId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
    isReAttempt?: boolean;
  }): Promise<QuestionAttempt> => {
    const studentId = profile?.uid || 'guest-student';
    const studentEmail = profile?.email || 'student@thptmath360.vn';

    const prevAttempts = attempts.filter(
      a => a.studentId === studentId && a.questionId === params.questionId
    );

    const attemptNumber = prevAttempts.length + 1;
    const reAttemptCount = params.isReAttempt ? (prevAttempts[0]?.reAttemptCount || 0) + 1 : 0;

    const newAttempt: QuestionAttempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentId,
      studentEmail,
      questionId: params.questionId,
      lessonId: params.lessonId,
      topicId: params.topicId,
      selectedOptionIndex: params.selectedOptionIndex,
      isCorrect: params.isCorrect,
      attemptNumber,
      reAttemptCount,
      resolvedAfterReview: params.isCorrect && prevAttempts.some(a => !a.isCorrect),
      timestamp: new Date().toISOString(),
    };

    setAttempts(prev => [newAttempt, ...prev]);
    return newAttempt;
  };

  const recordExamResult = async (params: {
    examId: string;
    examTitle: string;
    score: number;
    correctCount: number;
    totalCount: number;
    timeSpentSeconds: number;
    userAnswers: Record<string, any>;
    verificationStatus?: GradeVerificationStatus;
  }): Promise<ExamResult> => {
    const studentId = profile?.uid || 'guest-student';
    const studentEmail = profile?.email || 'student@thptmath360.vn';

    const newResult: ExamResult = {
      id: `exr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      examId: params.examId,
      examTitle: params.examTitle,
      studentId,
      studentEmail,
      score: params.score,
      correctCount: params.correctCount,
      totalCount: params.totalCount,
      timeSpentSeconds: params.timeSpentSeconds,
      userAnswers: params.userAnswers,
      verificationStatus: params.verificationStatus || 'server_verified',
      completedAt: new Date().toISOString(),
    };

    setExamResults(prev => [newResult, ...prev]);
    return newResult;
  };

  const markMistakeResolved = (attemptId: string) => {
    setAttempts(prev =>
      prev.map(a => (a.id === attemptId ? { ...a, resolvedAfterReview: true } : a))
    );
  };

  // Teacher / Curriculum Actions
  const updateLesson = async (updatedLesson: Lesson) => {
    setBaseLessons(prev => prev.map(l => (l.id === updatedLesson.id ? updatedLesson : l)));
  };

  const addLesson = async (newLessonData: Omit<Lesson, 'id'>) => {
    const id = `lesson-${Date.now().toString().slice(-4)}`;
    const newLesson: Lesson = { ...newLessonData, id };
    setBaseLessons(prev => [...prev, newLesson]);
  };

  const updateQuestion = async (updatedQuestion: Question) => {
    // When editing an already approved question, move modified copy to 'pending' to require re-approval!
    const questionToSave: Question = {
      ...updatedQuestion,
      approvalStatus: updatedQuestion.approvalStatus === 'approved' ? 'pending' : (updatedQuestion.approvalStatus || 'pending'),
      updatedAt: new Date().toISOString(),
      updatedBy: profile?.displayName || profile?.email || 'Giáo viên'
    };

    setQuestions(prev => prev.map(q => (q.id === questionToSave.id ? questionToSave : q)));
  };

  const addQuestion = async (newQuestionData: Omit<Question, 'id'>) => {
    const id = `Q-USER-${Date.now().toString().slice(-4)}`;
    const newQuestion: Question = { 
      ...newQuestionData, 
      id,
      approvalStatus: 'pending', // Default to pending review
      createdAt: new Date().toISOString()
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const verifyContent = async (type: 'lesson' | 'question' | 'exam', id: string) => {
    if (type === 'lesson') {
      setBaseLessons(prev => prev.map(l => (l.id === id ? { ...l, status: 'verified' as ContentStatus } : l)));
    } else if (type === 'question') {
      await approveQuestion(id);
    } else if (type === 'exam') {
      setExams(prev => prev.map(e => (e.id === id ? { ...e, status: 'verified' as ContentStatus } : e)));
    }
  };

  // Question Workflow Implementation
  const approveQuestion = async (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          approvalStatus: 'approved',
          status: 'verified',
          approvedBy: profile?.displayName || 'Tổ trưởng chuyên môn',
          approvedAt: new Date().toISOString(),
          rejectedReason: undefined
        };
      }
      return q;
    }));
  };

  const rejectQuestion = async (questionId: string, reason: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          approvalStatus: 'rejected',
          status: 'sample_needs_review',
          rejectedReason: reason,
          updatedAt: new Date().toISOString(),
          updatedBy: profile?.displayName || 'Giáo viên duyệt'
        };
      }
      return q;
    }));
  };

  const moveToTrashQuestion = async (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          approvalStatus: 'trash',
          updatedAt: new Date().toISOString()
        };
      }
      return q;
    }));
  };

  const restoreQuestion = async (questionId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          approvalStatus: 'pending', // Restore to pending review
          updatedAt: new Date().toISOString()
        };
      }
      return q;
    }));
  };

  const deleteQuestionPermanently = async (questionId: string): Promise<{ success: boolean; error?: string }> => {
    // Check if question was ever used in an existing exam or result
    const isUsedInExam = exams.some(e => e.questionIds.includes(questionId));
    const isUsedInAttempts = attempts.some(a => a.questionId === questionId);

    if (isUsedInExam || isUsedInAttempts) {
      return {
        success: false,
        error: 'Câu hỏi này đã từng được sử dụng trong đề thi hoặc có bài làm học sinh. Để bảo toàn lịch sử khảo thí, hệ thống chỉ cho phép xóa mềm vào thùng rác.'
      };
    }

    setQuestions(prev => prev.filter(q => q.id !== questionId));
    return { success: true };
  };

  const importWordQuestions = async (parsedQuestions: Omit<Question, 'id' | 'createdAt'>[]): Promise<{ importedCount: number; duplicateCount: number }> => {
    const existingPrompts = new Set(questions.map(q => q.prompt.trim().toLowerCase().replace(/\s+/g, ' ')));
    let imported = 0;
    let duplicate = 0;

    const newItems: Question[] = [];

    parsedQuestions.forEach((q, idx) => {
      const normalizedPrompt = q.prompt.trim().toLowerCase().replace(/\s+/g, ' ');
      if (existingPrompts.has(normalizedPrompt)) {
        duplicate++;
        return;
      }

      existingPrompts.add(normalizedPrompt);
      imported++;

      const newQ: Question = {
        ...q,
        id: `Q-DOCX-${Date.now()}-${idx + 1}`,
        code: q.code || `Q-DOCX-${(questions.length + imported).toString().padStart(3, '0')}`,
        approvalStatus: 'pending', // Default strictly to pending
        status: 'sample_needs_review',
        source: 'docx_import',
        createdAt: new Date().toISOString(),
        grade: q.grade || 12
      };

      newItems.push(newQ);
    });

    if (newItems.length > 0) {
      setQuestions(prev => [...prev, ...newItems]);
    }

    return { importedCount: imported, duplicateCount: duplicate };
  };

  // Exam Creation with Question Snapshot
  const createExamWithSnapshot = async (examData: {
    title: string;
    code: string;
    description: string;
    durationMinutes: number;
    questionIds: string[];
    grade?: number;
  }): Promise<Exam> => {
    // Only approved questions are permitted in official exams!
    const snapshots: Record<string, QuestionSnapshot> = {};

    examData.questionIds.forEach(qId => {
      const target = questions.find(q => q.id === qId);
      if (target) {
        snapshots[qId] = {
          questionId: target.id,
          code: target.code,
          prompt: target.prompt,
          options: [...target.options],
          correctOptionIndex: target.correctOptionIndex,
          explanation: target.explanation,
          difficulty: target.difficulty,
          lessonCode: target.lessonCode
        };
      }
    });

    const newExam: Exam = {
      id: `exam-${Date.now().toString().slice(-6)}`,
      title: examData.title,
      code: examData.code,
      description: examData.description,
      durationMinutes: examData.durationMinutes,
      totalQuestions: examData.questionIds.length,
      grade: examData.grade || 12,
      questionIds: examData.questionIds,
      questionSnapshots: snapshots,
      status: 'verified',
      createdAt: new Date().toISOString()
    };

    setExams(prev => [newExam, ...prev]);
    return newExam;
  };

  // Classroom Management Actions
  const addClassroom = async (classroomData: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string; classroom?: Classroom }> => {
    // Check duplicate code in same academic year
    const isDuplicate = classrooms.some(
      c => c.code.toUpperCase() === classroomData.code.toUpperCase() && 
           c.academicYear === classroomData.academicYear &&
           c.status !== 'archived'
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `Mã lớp ${classroomData.code} đã tồn tại trong năm học ${classroomData.academicYear}.`
      };
    }

    const newClass: Classroom = {
      ...classroomData,
      id: `cls-${classroomData.academicYear.replace(/[^a-zA-Z0-9]/g, '')}-${classroomData.code.toLowerCase()}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setClassrooms(prev => [...prev, newClass]);
    return { success: true, classroom: newClass };
  };

  const updateClassroom = async (cls: Classroom) => {
    const updated = { ...cls, updatedAt: new Date().toISOString() };
    setClassrooms(prev => prev.map(c => (c.id === cls.id ? updated : c)));
  };

  const archiveClassroom = async (classroomId: string) => {
    setClassrooms(prev => prev.map(c => (c.id === classroomId ? { ...c, status: 'archived', updatedAt: new Date().toISOString() } : c)));
  };

  const addStudentsBatch = async (newStudents: Omit<StudentProfile, 'id' | 'createdAt'>[]): Promise<{ addedCount: number; duplicateCount: number; errors: string[] }> => {
    const existingCodes = new Set(students.map(s => s.studentCode.toUpperCase()));
    let added = 0;
    let duplicate = 0;
    const errors: string[] = [];
    const validStudents: StudentProfile[] = [];

    newStudents.forEach(item => {
      const codeUpper = item.studentCode.trim().toUpperCase();
      if (!codeUpper || !item.fullName.trim()) {
        errors.push(`Học sinh thiếu thông tin bắt buộc (mã: "${item.studentCode}", tên: "${item.fullName}")`);
        return;
      }

      if (existingCodes.has(codeUpper)) {
        duplicate++;
        return;
      }

      existingCodes.add(codeUpper);
      added++;

      validStudents.push({
        ...item,
        id: `std_${codeUpper}`,
        studentCode: codeUpper,
        fullName: item.fullName.trim(),
        hasAccount: !!item.hasAccount,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    });

    if (validStudents.length > 0) {
      setStudents(prev => [...prev, ...validStudents]);
    }

    return { addedCount: added, duplicateCount: duplicate, errors };
  };

  const transferStudent = async (studentId: string, targetClassroomId: string, targetClassroomCode: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          classroomId: targetClassroomId,
          classroomCode: targetClassroomCode
        };
      }
      return s;
    }));
  };

  const createAccountsBatchForClassroom = async (
    classroomId: string, 
    studentIds: string[], 
    defaultPassword = 'ThptMath@2026'
  ): Promise<{ createdCount: number; existedCount: number; failedCount: number; accounts: any[] }> => {
    const token = await getIdToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const targetStudents = students.filter(s => studentIds.includes(s.id));
    let created = 0;
    let existed = 0;
    let failed = 0;
    const generatedAccounts: any[] = [];

    for (const std of targetStudents) {
      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            username: std.studentCode,
            displayName: std.fullName,
            role: 'student',
            classroom: std.classroomCode,
            password: defaultPassword
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          created++;
          generatedAccounts.push({
            username: data.account.username,
            displayName: data.account.displayName,
            classroom: data.account.classroom,
            password: data.initialPasswordProvided
          });

          // Mark student as having account
          setStudents(prev => prev.map(s => s.id === std.id ? { ...s, hasAccount: true, accountId: data.account.id } : s));
        } else if (res.status === 400 && data.error?.includes('đã tồn tại')) {
          existed++;
          setStudents(prev => prev.map(s => s.id === std.id ? { ...s, hasAccount: true } : s));
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }
    }

    return { createdCount: created, existedCount: existed, failedCount: failed, accounts: generatedAccounts };
  };

  return (
    <DataContext.Provider
      value={{
        topics,
        lessons,
        questions,
        exams: [...publishedExams, ...exams.filter(e => !hiddenOfficial.includes(e.id))],
        allOfficialExams: exams,
        hiddenOfficialIds: hiddenOfficial,
        refreshExams,
        refreshRoster,
        saveClassInfo,
        deleteClassroom,
        teacherOptions,
        saveTopic,
        saveLesson,
        deleteTopic,
        deleteLesson,
        attempts,
        examResults,
        classrooms,
        students,
        loading,
        getLessonById,
        getQuestionById,
        getSimilarQuestions,
        getClassroomById,
        getStudentsByClassroom,
        recordQuestionAttempt,
        recordExamResult,
        markMistakeResolved,
        updateLesson,
        addLesson,
        updateQuestion,
        addQuestion,
        verifyContent,
        approveQuestion,
        rejectQuestion,
        moveToTrashQuestion,
        restoreQuestion,
        deleteQuestionPermanently,
        importWordQuestions,
        createExamWithSnapshot,
        addClassroom,
        updateClassroom,
        archiveClassroom,
        addStudentsBatch,
        transferStudent,
        createAccountsBatchForClassroom,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataContext;
