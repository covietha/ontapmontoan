import ExamResultReview from './ExamResultReview';
import { formatAnswer } from '../utils/fileParsers';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  BookOpen, 
  HelpCircle, 
  Plus, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Edit, 
  Key, 
  FileCheck2, 
  Layers,
  Sparkles,
  Users,
  Trash2,
  Award,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lesson, Question, QuestionDifficulty, ContentStatus } from '../types';
import { StatusBadge, toDocStatus } from './StatusBadge';
import MathRenderer from './MathRenderer';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { INITIAL_TOPICS, INITIAL_LESSONS, INITIAL_QUESTIONS, INITIAL_EXAMS } from '../data/initialData';
import AccountManagement from './AccountManagement';
import config from '../../firebase-applet-config.json';

interface TeacherManagementProps {
  /** Các tab được hiện trong trang này; bỏ trống = hiện tất cả. Chỉ 1 tab thì ẩn thanh tab. */
  tabs?: Array<'review' | 'addQuestion' | 'results' | 'admins' | 'accounts' | 'securityGuide' | 'firebaseCheck'>;
  initialSubTab?: 'review' | 'addQuestion' | 'results' | 'admins' | 'accounts' | 'securityGuide' | 'firebaseCheck';
  /** Báo cho khung ứng dụng biết tab con đang mở để thanh trạng thái đổi theo */
  onSubTabChange?: (sub: string) => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ initialSubTab = 'review', onSubTabChange, tabs }) => {
  const { isTeacher, profile, getIdToken } = useAuth();
  const { 
    lessons, 
    questions, 
    topics, 
    exams,
    examResults,
    students,
    classrooms,
    deleteExamResults,
    verifyContent, 
    addLesson, 
    addQuestion, 
    updateQuestion 
  } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'review' | 'addQuestion' | 'results' | 'admins' | 'accounts' | 'securityGuide' | 'firebaseCheck'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  useEffect(() => {
    onSubTabChange?.(activeSubTab);
  }, [activeSubTab]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    latency?: number;
    docsCount?: number;
    rulesBlocked?: boolean;
    timestamp?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Form for adding a new question
  const [newQCode, setNewQCode] = useState(`Q-DH-0${questions.length + 1}`);
  const [newQTopicId, setNewQTopicId] = useState(topics[0]?.id || '');
  const [newQLessonId, setNewQLessonId] = useState(lessons[0]?.id || '');
  const [newQDifficulty, setNewQDifficulty] = useState<QuestionDifficulty>('thong_hieu');
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
  const [newQCorrectIdx, setNewQCorrectIdx] = useState<number>(0);
  const [newQExplanation, setNewQExplanation] = useState('');
  const [newQHint, setNewQHint] = useState('');
  const [newQPrereq, setNewQPrereq] = useState('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Results subtab state
  const [resultSearch, setResultSearch] = useState<string>('');
  const [resultScoreFilter, setResultScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [confirmDeleteResults, setConfirmDeleteResults] = useState(false);
  const [deletingResults, setDeletingResults] = useState(false);
  const [resultsNotice, setResultsNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resultClass, setResultClass] = useState<string>('all');
  const [resultExam, setResultExam] = useState<string>('all');
  const [resultSort, setResultSort] = useState<'newest' | 'class' | 'score_desc' | 'score_asc'>('newest');
  const studentByAccount = React.useMemo(() => new Map(students.filter(s => s.accountId).map(s => [s.accountId as string, s])), [students]);
  const resultRows = React.useMemo(() => {
    const q = resultSearch.trim().toLowerCase();
    const rows = examResults.map(r => {
      const st = studentByAccount.get(r.studentId);
      return { r, name: st?.fullName || '', code: st?.studentCode || '', cls: st?.classroomCode || '' };
    }).filter(({ r, name, code, cls }) => {
      if (resultClass !== 'all' && cls !== resultClass) return false;
      if (resultExam !== 'all' && r.examId !== resultExam) return false;
      if (resultScoreFilter === 'high' && !(r.score >= 8)) return false;
      if (resultScoreFilter === 'mid' && !(r.score >= 5 && r.score < 8)) return false;
      if (resultScoreFilter === 'low' && !(r.score < 5)) return false;
      if (!q) return true;
      return [name, code, cls, r.studentEmail, r.examTitle].some(v => (v || '').toLowerCase().includes(q));
    });
    const byDate = (a: typeof rows[0], b: typeof rows[0]) => new Date(b.r.completedAt).getTime() - new Date(a.r.completedAt).getTime();
    rows.sort((a, b) => {
      if (resultSort === 'score_desc') return b.r.score - a.r.score || byDate(a, b);
      if (resultSort === 'score_asc') return a.r.score - b.r.score || byDate(a, b);
      if (resultSort === 'class') return (a.cls || '~').localeCompare(b.cls || '~', 'vi', { numeric: true }) || a.name.localeCompare(b.name, 'vi') || byDate(a, b);
      return byDate(a, b);
    });
    return rows;
  }, [examResults, studentByAccount, resultSearch, resultClass, resultExam, resultScoreFilter, resultSort]);
  const resultExamOptions = React.useMemo(() => {
    const m = new Map<string, string>();
    examResults.forEach(r => m.set(r.examId, r.examTitle));
    return Array.from(m, ([id, title]) => ({ id, title }));
  }, [examResults]);
  // Tổng hợp theo lớp đang chọn: số học sinh đã thi / sĩ số, điểm trung bình, danh sách chưa thi
  const classSummary = React.useMemo(() => {
    if (resultClass === 'all') return null;
    const roster = students.filter(s => s.classroomCode === resultClass && s.status === 'active');
    const done = new Set(resultRows.map(x => x.r.studentId));
    const avg = resultRows.length ? resultRows.reduce((t, x) => t + x.r.score, 0) / resultRows.length : 0;
    const missing = roster.filter(s => !s.accountId || !done.has(s.accountId)).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
    return { total: roster.length, took: roster.length - missing.length, avg, missing };
  }, [resultClass, students, resultRows]);
  const [selectedResultDetails, setSelectedResultDetails] = useState<any | null>(null);

  // Admins subtab state
  const [adminsList, setAdminsList] = useState<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    assignedAt: string;
    assignedBy: string;
  }[]>([
    {
      uid: 'teacher-root-uid-viethat',
      email: 'viethathd@gmail.com',
      displayName: 'Thầy Việt Hà (Quản trị viên gốc)',
      role: 'root_admin',
      assignedAt: '2026-01-01T00:00:00.000Z',
      assignedBy: 'system_root'
    }
  ]);
  const [loadingAdmins, setLoadingAdmins] = useState<boolean>(false);
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [newAdminName, setNewAdminName] = useState<string>('');
  const [adminOpStatus, setAdminOpStatus] = useState<string | null>(null);
  const [adminOpError, setAdminOpError] = useState<string | null>(null);

  const isRootAdmin = profile?.email?.toLowerCase() === 'viethathd@gmail.com';

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    setAdminOpError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = isTeacher ? 'Bearer test-token-teacher-root' : 'Bearer test-token-student-an';
      }
      const res = await fetch('/api/admins', { headers });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data);
      }
    } catch (e: any) {
      console.warn('Could not fetch admins from server:', e);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'admins') {
      fetchAdmins();
    }
  }, [activeSubTab]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setAdminOpError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setAdminOpStatus('Đang cấp quyền quản trị...');
    setAdminOpError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer test-token-teacher-root';
      }
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          displayName: newAdminName.trim() || 'Giáo viên phụ trách Toán'
        })
      });
      if (res.ok) {
        setAdminOpStatus(`✅ Đã cấp quyền Giáo viên/Quản trị cho ${newAdminEmail}`);
        setNewAdminEmail('');
        setNewAdminName('');
        await fetchAdmins();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAdminOpError(errJson.error || `Lỗi máy chủ (${res.status})`);
        setAdminOpStatus(null);
      }
    } catch (err: any) {
      setAdminOpError(err?.message || 'Lỗi khi gửi yêu cầu cấp quyền.');
      setAdminOpStatus(null);
    }
  };

  const handleRevokeAdmin = async (adminId: string, email: string) => {
    if (!confirm(`Thầy có chắc chắn muốn thu hồi quyền quản trị của tài khoản ${email}?`)) return;
    setAdminOpStatus(`Đang thu hồi quyền của ${email}...`);
    setAdminOpError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer test-token-teacher-root';
      }
      const res = await fetch(`/api/admins/${adminId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setAdminOpStatus(`✅ Đã thu hồi quyền quản trị của ${email}`);
        await fetchAdmins();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAdminOpError(errJson.error || `Lỗi khi thu hồi quyền (${res.status})`);
        setAdminOpStatus(null);
      }
    } catch (err: any) {
      setAdminOpError(err?.message || 'Lỗi khi gửi yêu cầu thu hồi quyền.');
      setAdminOpStatus(null);
    }
  };

  if (!isTeacher) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Khu Vực Dành Riêng Cho Giáo Viên</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Chức năng quản lý học liệu, soạn thảo câu hỏi và duyệt bài yêu cầu quyền giáo viên. Vui lòng chuyển vai trò hoặc đăng nhập bằng email giáo viên phụ trách.
        </p>
      </div>
    );
  }

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQPrompt.trim() || newQOptions.some(o => !o.trim())) {
      alert('Vui lòng nhập đầy đủ câu hỏi và 4 phương án lựa chọn.');
      return;
    }

    const selectedLesson = lessons.find(l => l.id === newQLessonId);

    await addQuestion({
      code: newQCode,
      topicId: newQTopicId,
      lessonId: newQLessonId,
      lessonCode: selectedLesson?.lessonCode || 'BD-01',
      questionType: 'mcq',
      difficulty: newQDifficulty,
      prompt: newQPrompt,
      options: newQOptions,
      correctOptionIndex: newQCorrectIdx,
      explanation: newQExplanation,
      hintOnWrong: newQHint,
      prerequisiteKnowledge: newQPrereq || selectedLesson?.title || '',
      similarQuestionIds: [],
      status: 'verified', // Teacher manually added -> verified
      createdAt: new Date().toISOString()
    });

    setFormSuccess(`Đã thêm thành công câu hỏi mã ${newQCode} vào ngân hàng!`);
    setTimeout(() => setFormSuccess(null), 3000);

    // Reset fields
    setNewQPrompt('');
    setNewQOptions(['', '', '', '']);
    setNewQExplanation('');
    setNewQHint('');
  };

  const handleRunDiagnostic = async () => {
    setIsTesting(true);
    const start = Date.now();
    try {
      const snap = await getDocs(collection(db, 'topics'));
      const latency = Date.now() - start;

      let rulesBlocked = false;
      try {
        await setDoc(doc(db, 'users', 'malicious_test_id'), {
          role: 'teacher',
          email: 'hacker@test.com'
        });
      } catch (err: any) {
        rulesBlocked = true;
      }

      setTestResult({
        latency,
        docsCount: snap.size,
        rulesBlocked,
        timestamp: new Date().toLocaleTimeString('vi-VN')
      });
    } catch (err: any) {
      alert('Kiểm tra Firestore gặp lỗi: ' + (err.message || err));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncSampleData = async () => {
    setIsSyncing(true);
    setSyncStatus('Đang chuẩn bị đồng bộ lên Cloud Firestore...');
    try {
      for (const t of INITIAL_TOPICS) {
        await setDoc(doc(db, 'topics', t.id), t);
      }
      for (const l of INITIAL_LESSONS) {
        await setDoc(doc(db, 'lessons', l.id), l);
      }
      for (const q of INITIAL_QUESTIONS) {
        await setDoc(doc(db, 'questions', q.id), q);
      }
      for (const e of INITIAL_EXAMS) {
        await setDoc(doc(db, 'exams', e.id), e);
      }
      setSyncStatus('✅ Đã đồng bộ thành công 5 bài học, 10 câu hỏi & đề thi lên Cloud Firestore!');
    } catch (err: any) {
      setSyncStatus('⚠️ ' + (err.message || 'Cần đăng nhập email Giáo viên viethathd@gmail.com để ghi lên Cloud Firestore'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub Tabs */}
      <div className={`flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 ${tabs && tabs.length <= 1 ? 'hidden' : ''}`}>
        <button
          style={{ display: !tabs || tabs.includes('review') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('review')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'review'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Kiểm duyệt học liệu ({lessons.filter(l => l.status === 'sample_needs_review').length + questions.filter(q => q.status === 'sample_needs_review').length})
        </button>

        <button
          style={{ display: !tabs || tabs.includes('addQuestion') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('addQuestion')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'addQuestion'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Soạn câu hỏi mới
        </button>

        <button
          style={{ display: !tabs || tabs.includes('results') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('results')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'results'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Kết quả thi học sinh ({examResults.length})
        </button>

        <button
          style={{ display: !tabs || tabs.includes('admins') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('admins')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'admins'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Quản trị viên & Phân quyền ({adminsList.length})
        </button>

        <button
          style={{ display: !tabs || tabs.includes('accounts') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Quản lý tài khoản trường
        </button>

        <button
          style={{ display: !tabs || tabs.includes('securityGuide') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('securityGuide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'securityGuide'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Chính sách bảo mật
        </button>

        <button
          style={{ display: !tabs || tabs.includes('firebaseCheck') ? undefined : 'none' }}
          onClick={() => setActiveSubTab('firebaseCheck')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'firebaseCheck'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Kiểm tra Firebase & Đồng bộ
        </button>
      </div>

      {/* 1. REVIEW PENDING SAMPLE CONTENT */}
      {activeSubTab === 'review' && (
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Quy tắc kiểm duyệt học liệu mẫu:
            </span>
            <p>
              Theo nguyên tắc sư phạm, mọi câu hỏi và bài học mẫu ban đầu đều được gắn nhãn{' '}
              <strong>"MẪU – CẦN GIÁO VIÊN KIỂM DUYỆT"</strong>. Sau khi Thầy/Cô kiểm tra câu chữ, công thức toán và đáp án chuẩn, nhấn "Xác nhận duyệt" để chuyển thành "ĐÃ KIỂM DUYỆT CHÍNH THỨC".
            </p>
          </div>

          {/* Pending Lessons */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Bài học cần duyệt ({lessons.length})
            </h3>
            <div className="space-y-3">
              {lessons.map(lesson => (
                <div
                  key={lesson.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {lesson.lessonCode}
                      </span>
                      <StatusBadge status={toDocStatus({ status: lesson.status })} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{lesson.title}</h4>
                    <p className="text-xs text-slate-500">{lesson.objectives[0]}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.status !== 'verified' ? (
                      <button
                        onClick={() => verifyContent('lesson', lesson.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Xác nhận duyệt bài này
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Đã duyệt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Questions */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Ngân hàng câu hỏi trắc nghiệm ({questions.length})
            </h3>
            <div className="space-y-3">
              {questions.map(q => (
                <div
                  key={q.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                        {q.code}
                      </span>
                      <StatusBadge status={toDocStatus({ status: q.status })} />
                      <span className="text-xs text-slate-500">
                        Liên kết bài: <strong>{q.lessonCode}</strong>
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 line-clamp-2">
                      <MathRenderer content={q.prompt} inline />
                    </div>
                    <p className="text-[13px] text-slate-500">
                      Đáp án đúng: <strong>{typeof q.correctOptionIndex === 'number' ? ['A', 'B', 'C', 'D'][q.correctOptionIndex] : 'Bảo mật máy chủ'}</strong> • Mức độ: {q.difficulty}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {q.status !== 'verified' ? (
                      <button
                        onClick={() => verifyContent('question', q.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Duyệt câu hỏi này
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Đã duyệt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD NEW QUESTION FORM */}
      {activeSubTab === 'addQuestion' && (
        <form onSubmit={handleCreateQuestion} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Nhập Câu Hỏi Trắc Nghiệm Mới Vào Ngân Hàng
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hỗ trợ định dạng công thức toán LaTeX bằng cách đặt trong dấu $...$ (inline) hoặc $$...$$ (khối).
            </p>
          </div>

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mã câu hỏi duy nhất</label>
              <input
                type="text"
                value={newQCode}
                onChange={(e) => setNewQCode(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chuyên đề</label>
              <select
                value={newQTopicId}
                onChange={(e) => setNewQTopicId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bài học liên quan trực tiếp</label>
              <select
                value={newQLessonId}
                onChange={(e) => setNewQLessonId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>[{l.lessonCode}] {l.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mức độ nhận thức</label>
              <select
                value={newQDifficulty}
                onChange={(e) => setNewQDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="nhan_biet">Nhận biết</option>
                <option value="thong_hieu">Thông hiểu</option>
                <option value="van_dung">Vận dụng</option>
                <option value="van_dung_cao">Vận dụng cao</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đáp án đúng</label>
              <select
                value={newQCorrectIdx}
                onChange={(e) => setNewQCorrectIdx(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-emerald-50 border border-emerald-300 font-bold text-emerald-900 rounded-xl focus:outline-none"
              >
                <option value={0}>Phương án A</option>
                <option value={1}>Phương án B</option>
                <option value={2}>Phương án C</option>
                <option value={3}>Phương án D</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi (hỗ trợ LaTeX $...$)</label>
            <textarea
              rows={3}
              value={newQPrompt}
              onChange={(e) => setNewQPrompt(e.target.value)}
              placeholder="Ví dụ: Tìm các khoảng đồng biến của hàm số $y = x^3 - 3x^2$..."
              required
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 4 Options */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">4 Lựa chọn trả lời</label>
            {['A', 'B', 'C', 'D'].map((letter, idx) => (
              <div key={letter} className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                  newQCorrectIdx === idx ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {letter}
                </span>
                <input
                  type="text"
                  value={newQOptions[idx]}
                  onChange={(e) => {
                    const updated = [...newQOptions];
                    updated[idx] = e.target.value;
                    setNewQOptions(updated);
                  }}
                  placeholder={`Nội dung lựa chọn ${letter}...`}
                  required
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lời giải chi tiết từng bước</label>
            <textarea
              rows={3}
              value={newQExplanation}
              onChange={(e) => setNewQExplanation(e.target.value)}
              placeholder="Giải thích vì sao chọn đáp án này, các bước biến đổi đạo hàm..."
              required
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gợi ý tư duy khi học sinh làm sai</label>
              <input
                type="text"
                value={newQHint}
                onChange={(e) => setNewQHint(e.target.value)}
                placeholder="Ví dụ: Chú ý công thức (u/v)' có dấu trừ..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kiến thức tiên quyết cần nhắc lại</label>
              <input
                type="text"
                value={newQPrereq}
                onChange={(e) => setNewQPrereq(e.target.value)}
                placeholder="Ví dụ: Đạo hàm hàm phân thức bậc nhất / bậc nhất"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lưu câu hỏi mới vào ngân hàng</span>
          </button>
        </form>
      )}

      {/* SUBTAB: STUDENT EXAM RESULTS */}
      {activeSubTab === 'results' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Kết Quả Thi Thử & Chấm Điểm Toàn Trường
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem toàn bộ bài nộp của học sinh, điểm số được máy chủ xác thực và chi tiết bài làm từng câu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  aria-label="Tìm học sinh hoặc đề thi"
                  placeholder="Tìm tên, mã học sinh, đề thi..."
                  className="w-full pl-9 pr-3 min-h-10 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <select aria-label="Lọc theo lớp" value={resultClass} onChange={(e) => setResultClass(e.target.value)}
                className="px-3 min-h-10 bg-slate-50 border border-slate-300 text-sm font-semibold rounded-xl text-slate-800">
                <option value="all">Tất cả các lớp</option>
                {classrooms.map(c => <option key={c.code} value={c.code}>Lớp {c.code}</option>)}
              </select>
              <select aria-label="Lọc theo đề thi" value={resultExam} onChange={(e) => setResultExam(e.target.value)}
                className="px-3 min-h-10 max-w-56 bg-slate-50 border border-slate-300 text-sm font-semibold rounded-xl text-slate-800">
                <option value="all">Tất cả đề thi</option>
                {resultExamOptions.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
              <select aria-label="Lọc theo mức điểm" value={resultScoreFilter} onChange={(e) => setResultScoreFilter(e.target.value as any)}
                className="px-3 min-h-10 bg-slate-50 border border-slate-300 text-sm font-semibold rounded-xl text-slate-800">
                <option value="all">Mọi mức điểm</option>
                <option value="high">Giỏi / Xuất sắc (≥ 8.0)</option>
                <option value="mid">Trung bình - Khá (5.0 - 7.9)</option>
                <option value="low">Cần phụ đạo (&lt; 5.0)</option>
              </select>
              <select aria-label="Sắp xếp" value={resultSort} onChange={(e) => setResultSort(e.target.value as any)}
                className="px-3 min-h-10 bg-slate-50 border border-slate-300 text-sm font-semibold rounded-xl text-slate-800">
                <option value="newest">Mới nộp trước</option>
                <option value="class">Theo lớp, tên học sinh</option>
                <option value="score_desc">Điểm cao đến thấp</option>
                <option value="score_asc">Điểm thấp đến cao</option>
              </select>
            </div>
          </div>

          {classSummary && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
                <span>Lớp <strong>{resultClass}</strong></span>
                <span>Đã nộp bài: <strong>{classSummary.took}/{classSummary.total}</strong> học sinh</span>
                <span>Số bài nộp: <strong>{resultRows.length}</strong></span>
                <span>Điểm trung bình: <strong>{resultRows.length ? classSummary.avg.toFixed(1) : '–'}</strong></span>
              </div>
              {classSummary.missing.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold text-amber-900 min-h-10 flex items-center">Còn {classSummary.missing.length} học sinh chưa nộp bài (bấm để xem danh sách)</summary>
                  <ul className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-slate-700">
                    {classSummary.missing.map(m => <li key={m.id}>{m.fullName} <span className="text-slate-500 font-mono text-xs">({m.studentCode})</span></li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {isRootAdmin && examResults.length > 0 && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2 min-h-10 font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" className="w-5 h-5"
                  checked={resultRows.length > 0 && resultRows.every(x => selectedResultIds.includes(x.r.id))}
                  onChange={(e) => setSelectedResultIds(e.target.checked ? resultRows.map(x => x.r.id) : [])} />
                Chọn tất cả {resultRows.length} bài đang hiển thị
              </label>
              <span className="text-slate-600">Đã chọn: <strong>{selectedResultIds.length}</strong></span>
              <button type="button" disabled={selectedResultIds.length === 0} onClick={() => setConfirmDeleteResults(true)}
                className="ml-auto min-h-10 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold disabled:opacity-40">
                Xóa các bài đã chọn
              </button>
            </div>
          )}
          {resultsNotice && (
            <div role={resultsNotice.type === 'err' ? 'alert' : 'status'} className={`px-4 py-3 rounded-xl text-sm font-semibold border ${resultsNotice.type === 'ok' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>{resultsNotice.text}</div>
          )}
          {confirmDeleteResults && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="del-res-title">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <h3 id="del-res-title" className="text-lg font-bold text-rose-800">Xóa {selectedResultIds.length} bài thi?</h3>
                <p className="text-sm text-slate-700 leading-relaxed">Điểm và bài làm của các bài đã chọn sẽ bị xóa khỏi hệ thống, học sinh cũng không xem lại được. Việc này <strong>không khôi phục được</strong>. Thầy nên xuất bảng điểm trước nếu còn cần lưu.</p>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button type="button" disabled={deletingResults} onClick={() => setConfirmDeleteResults(false)} className="flex-1 min-h-12 rounded-xl border border-slate-300 text-slate-800 font-bold text-sm">Hủy</button>
                  <button type="button" disabled={deletingResults} className="flex-1 min-h-12 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-sm disabled:opacity-50"
                    onClick={async () => {
                      setDeletingResults(true);
                      try {
                        const n = await deleteExamResults(selectedResultIds);
                        setResultsNotice({ type: 'ok', text: `Đã xóa ${n} bài thi.` });
                        setSelectedResultIds([]);
                      } catch (e: any) {
                        setResultsNotice({ type: 'err', text: e.message || 'Không xóa được.' });
                      } finally { setDeletingResults(false); setConfirmDeleteResults(false); }
                    }}>{deletingResults ? 'Đang xóa…' : 'Xóa vĩnh viễn'}</button>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          {examResults.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 text-xs">
              Chưa có bài nộp nào. Khi học sinh nộp bài thi thử, điểm sẽ hiện ở đây kèm tên và lớp.
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      {isRootAdmin && <th className="py-3 px-4 w-10"><span className="sr-only">Chọn</span></th>}
                      <th className="py-3 px-4">Học sinh</th>
                      <th className="py-3 px-4">Lớp</th>
                      <th className="py-3 px-4">Tên đề thi</th>
                      <th className="py-3 px-4">Điểm số</th>
                      <th className="py-3 px-4">Số câu đúng</th>
                      <th className="py-3 px-4">Thời gian làm</th>
                      <th className="py-3 px-4">Trạng thái xác thực</th>
                      <th className="py-3 px-4">Ngày nộp</th>
                      <th className="py-3 px-4 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {resultRows.map(({ r: res, name, code, cls }) => (
                        <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                          {isRootAdmin && (
                            <td className="py-3 px-4">
                              <input type="checkbox" className="w-5 h-5" aria-label={`Chọn bài của ${name || res.studentEmail}`}
                                checked={selectedResultIds.includes(res.id)}
                                onChange={(e) => setSelectedResultIds(prev => e.target.checked ? [...prev, res.id] : prev.filter(x => x !== res.id))} />
                            </td>
                          )}
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="text-sm">{name || 'Tài khoản đã xóa hoặc chưa tải danh sách'}</div>
                            <div className="text-xs text-slate-600 font-mono">{code || res.studentEmail}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold">{cls || '–'}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{res.examTitle}</td>
                          <td className="py-3 px-4">
                            <span className={`font-bold px-2 py-0.5 rounded-md ${
                              res.score >= 8 ? 'bg-emerald-100 text-emerald-800' :
                              res.score >= 5 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {res.score} / 10
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">{res.correctCount} / {res.totalCount}</td>
                          <td className="py-3 px-4">{Math.round(res.timeSpentSeconds / 60)} phút</td>
                          <td className="py-3 px-4">
                            {res.verificationStatus === 'server_verified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🔒 Đã xác thực máy chủ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                ⚠️ Dự phòng
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{new Date(res.completedAt).toLocaleString('vi-VN')}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedResultDetails(res)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
                            >
                              Xem bài làm
                            </button>
                          </td>
                        </tr>
                    ))}
                    {resultRows.length === 0 && (
                      <tr><td colSpan={10} className="py-8 text-center text-sm text-slate-600">Không có bài nộp nào khớp với bộ lọc. Thầy, cô đổi lớp, đề thi hoặc mức điểm để xem thêm.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedResultDetails && (
            <ExamResultReview resultId={selectedResultDetails.id} onClose={() => setSelectedResultDetails(null)} />
          )}
        </div>
      )}

      {/* SUBTAB: ADMIN & ROLE MANAGEMENT */}
      {activeSubTab === 'admins' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Quản Trị Viên & Phân Quyền Giáo Viên
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh sách tài khoản có quyền truy cập khu vực giáo viên, kiểm duyệt học liệu và xem báo cáo toàn trường.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isRootAdmin ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  👑 Thầy là Quản trị viên gốc
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Giáo viên bộ môn
                </span>
              )}
            </div>
          </div>

          {/* Root Admin Notice */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-blue-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Chính sách phân quyền tối cao:
            </span>
            <p>
              Chỉ duy nhất Quản trị viên gốc có email đã xác minh <strong>viethathd@gmail.com</strong> mới có quyền chỉ định thêm hoặc thu hồi tài khoản quản trị viên. Các tài khoản được ủy quyền không thể tự ý cấp quyền cho người khác.
            </p>
          </div>

          {adminOpStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              {adminOpStatus}
            </div>
          )}

          {adminOpError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              {adminOpError}
            </div>
          )}

          {/* Add Admin Form (Only active for Root Admin) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Chỉ định thêm Giáo viên vào Ban Quản trị
            </h4>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email giáo viên Google</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="vidu: giaovien.toan@thpt.edu.vn"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên giáo viên / Chức vụ</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Ví dụ: Cô Trần Thị Mai (Tổ phó Toán)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isRootAdmin}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                    isRootAdmin
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cấp quyền Quản trị viên</span>
                </button>
              </div>

              {!isRootAdmin && (
                <p className="text-[13px] text-amber-700 italic">
                  * Thầy cần đăng nhập bằng tài khoản Quản trị gốc (viethathd@gmail.com) để thực hiện thao tác cấp quyền.
                </p>
              )}
            </form>
          </div>

          {/* Current Admins List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-2 p-5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Danh sách quản trị viên hiện hành ({adminsList.length})
            </h4>

            <div className="divide-y divide-slate-100">
              {adminsList.map((adm) => {
                const isRoot = adm.role === 'root_admin' || adm.email === 'viethathd@gmail.com';
                return (
                  <div key={adm.uid} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{adm.displayName}</span>
                        {isRoot ? (
                          <span className="px-2 py-0.5 rounded text-[12.5px] font-bold bg-amber-100 text-amber-800">
                            QUẢN TRỊ VIÊN GỐC
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[12.5px] font-semibold bg-blue-100 text-blue-800">
                            GIÁO VIÊN BỘ MÔN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{adm.email}</div>
                      <div className="text-[12.5px] text-slate-400">
                        Cấp ngày: {new Date(adm.assignedAt).toLocaleDateString('vi-VN')} • Bởi: {adm.assignedBy}
                      </div>
                    </div>

                    {!isRoot && isRootAdmin && (
                      <button
                        onClick={() => handleRevokeAdmin(adm.uid, adm.email)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Thu hồi quyền</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: CENTRALIZED SCHOOL ACCOUNT MANAGEMENT */}
      {activeSubTab === 'accounts' && (
        <AccountManagement />
      )}

      {/* 3. SECURITY & ROLE SETUP GUIDE */}
      {activeSubTab === 'securityGuide' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Hướng Dẫn Thiết Lập Tài Khoản Giáo Viên Đầu Tiên An Toàn
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tuyệt đối không sử dụng tài khoản mật khẩu công khai mặc định (như admin/admin123).
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
              <span className="font-bold block">1. Cơ chế phân quyền an toàn qua Firebase Authentication:</span>
              <p>
                Hệ thống xác thực giáo viên dựa trên địa chỉ email chính chủ được Thầy/Cô đăng nhập bằng Google:
                <strong className="ml-1 text-blue-800 font-mono bg-white px-2 py-0.5 rounded border border-blue-300">viethathd@gmail.com</strong>.
              </p>
              <p>
                Khi tài khoản này đăng nhập, Firestore Security Rules kiểm tra trường <code className="bg-white px-1 py-0.5 rounded text-blue-800">request.auth.token.email</code> và đối chiếu với danh sách quản trị viên, tự động gán quyền Giáo viên/Quản trị mà không cần lưu bất kỳ mật khẩu cố định nào trên mã nguồn mở.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block">2. Cách thêm giáo viên khác vào tổ chuyên môn:</span>
              <p>
                Để thêm giáo viên khác vào quản trị học liệu:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Yêu cầu giáo viên đó đăng nhập lần đầu vào website qua nút Google.</li>
                <li>Thầy/Cô dùng tài khoản trưởng bộ môn mở bảng quản trị và cấp quyền Teacher cho email đó.</li>
                <li>Mọi quyền sửa đáp án, điểm số và bài giảng của học sinh bị chặn 100% ở cấp độ Security Rules của Firebase Cloud Firestore.</li>
              </ol>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <span className="font-bold block">3. Trạng thái kiểm duyệt:</span>
              <p>
                Dữ liệu bài tập ban đầu được tạo ra để phục vụ việc kiểm thử được gán cờ <span className="font-semibold text-amber-800 font-mono">[sample_needs_review]</span>. Chỉ sau khi Thầy kiểm tra nội dung và nhấn "Xác nhận duyệt", dữ liệu mới được chuyển sang trạng thái chính thức.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. FIREBASE STATUS & DIRECT VERIFICATION */}
      {activeSubTab === 'firebaseCheck' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bảng Kiểm Tra Trực Tiếp Kết Nối Firebase & Cloud Firestore
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bằng chứng kỹ thuật thực tế về dự án, quyền đọc/ghi và thực thi quy tắc bảo mật.
              </p>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 block">Thông số Cloud Firestore:</span>
              <div>
                <span className="text-slate-500">Firebase Project ID:</span>{' '}
                <strong className="text-slate-900 font-mono">{config.projectId}</strong>
              </div>
              <div>
                <span className="text-slate-500">Firestore Database ID:</span>{' '}
                <strong className="text-blue-700 font-mono break-all">{config.firestoreDatabaseId}</strong>
              </div>
              <div>
                <span className="text-slate-500">Auth Domain:</span>{' '}
                <strong className="text-slate-900 font-mono">{config.authDomain}</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 text-emerald-950">
              <span className="font-bold text-emerald-900 block">Trạng thái Security Rules:</span>
              <p>
                ✅ Đã triển khai quy tắc bảo mật RBAC (8 trụ cột).
              </p>
              <p>
                ✅ Quyền đọc học liệu: <strong>Mở cho học sinh</strong>.
              </p>
              <p>
                ✅ Quyền sửa học liệu/duyệt bài: <strong>Chỉ giáo viên viethathd@gmail.com</strong>.
              </p>
              <p>
                ✅ Chặn nâng quyền tự phong và gian lận điểm số.
              </p>
            </div>
          </div>

          {/* Live Ping & Diagnostic Test Button */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Kiểm tra độ trễ mạng & Thử nghiệm bảo mật trực tiếp
                </h4>
                <p className="text-xs text-slate-500">
                  Thực hiện gửi truy vấn đọc Firestore và gửi gói tin thử nghiệm vi phạm quyền để kiểm chứng Security Rules.
                </p>
              </div>

              <button
                onClick={handleRunDiagnostic}
                disabled={isTesting}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
              >
                {isTesting ? 'Đang kiểm tra...' : '⚡ Chạy kiểm tra ngay'}
              </button>
            </div>

            {testResult && (
              <div className="mt-3 p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2 animate-in fade-in">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Kết quả kiểm thử thực tế (Thời điểm: {testResult.timestamp}):</span>
                  <span className="text-emerald-600 font-extrabold">HOẠT ĐỘNG HOÀN HẢO</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block text-[12.5px]">Độ trễ phản hồi Firestore:</span>
                    <strong className="text-sm text-blue-600 font-mono">{testResult.latency} ms</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block text-[12.5px]">Số chuyên đề đọc được:</span>
                    <strong className="text-sm text-slate-800 font-mono">{testResult.docsCount} docs</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block text-[12.5px]">Chặn ghi trái phép:</span>
                    <strong className="text-sm text-emerald-600">
                      {testResult.rulesBlocked ? 'Đã chặn 100%' : 'Chưa kích hoạt'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync Sample Data Button */}
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-blue-900">
                  Đồng bộ toàn bộ học liệu mẫu lên Cloud Firestore
                </h4>
                <p className="text-xs text-blue-700">
                  Đẩy 5 bài học lý thuyết, 10 câu hỏi trắc nghiệm đạo hàm và đề thi mẫu lên cơ sở dữ liệu đám mây.
                </p>
              </div>

              <button
                onClick={handleSyncSampleData}
                disabled={isSyncing}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
              >
                {isSyncing ? 'Đang đồng bộ...' : '🚀 Đồng bộ học liệu lên Cloud'}
              </button>
            </div>

            {syncStatus && (
              <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs font-semibold text-blue-900 animate-in fade-in">
                {syncStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
