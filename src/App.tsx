import React, { useState, useEffect, useRef } from 'react';
import { isExamLocked, guardLeave, setLeaveGuard, submitExamNow } from './utils/examLock';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { BrandMark } from './components/BrandMark';
import { NavTab, NAV_BY_ID, PRACTICE_MODES, SUB_TABS, SCHOOL, pathForTab, resolvePath, defaultTab } from './config/navigation';
import Overview from './components/Overview';
import TheoryRepository from './components/TheoryRepository';
import TopicPractice from './components/TopicPractice';
import ExamRoom from './components/ExamRoom';
import MistakeNotebook from './components/MistakeNotebook';
import ProgressReport from './components/ProgressReport';
import { CurriculumManager } from './components/CurriculumManager';
import { ChatWidget } from './components/ChatWidget';
import { ExamManager } from './components/ExamManager';
import { TeacherManagement } from './components/TeacherManagement';
import { ClassroomManagement } from './components/ClassroomManagement';
import { QuestionBankManager } from './components/QuestionBankManager';
import { AccountManagement } from './components/AccountManagement';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import StudentExamHistory from './components/StudentExamHistory';
import LoginScreen from './components/LoginScreen';
import { useData } from './context/DataContext';
import { 
  Menu, LogOut, ShieldAlert, Target, FileText, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Wifi, WifiOff, CalendarDays, Key
} from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isTeacher, isRootAdmin, loading, profile, logout } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const { attempts, questions } = useData();
  // Chỉ hiện màn hình khởi động ở lần tải đầu. Khi đang đăng nhập, giữ nguyên màn hình đăng nhập
  // để không mất nội dung đã gõ và vẫn hiện được thông báo sai mật khẩu.
  const bootedRef = useRef(false);
  if (!loading) bootedRef.current = true;
  const [teacherSub, setTeacherSub] = useState<{ tab: NavTab; sub: string } | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Layout states
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Đang làm bài thi: ẩn thanh tiêu đề và thanh trạng thái, thu gọn menu để dành chỗ cho đề
  const [examFocus, setExamFocus] = useState(isExamLocked());
  useEffect(() => {
    const h = (e: Event) => setExamFocus(!!(e as CustomEvent).detail);
    window.addEventListener('exam-lock', h);
    return () => window.removeEventListener('exam-lock', h);
  }, []);

  // Active Tab state: defaulted by role
  const [activeTab, setActiveTabRaw] = useState<NavTab>(isTeacher ? 'teacher_overview' : 'student_home');
  const [practiceSubMode, setPracticeSubModeRaw] = useState<'topics' | 'exam'>('topics');
  const tabRef = useRef(activeTab);
  const modeRef = useRef(practiceSubMode);
  tabRef.current = activeTab;
  modeRef.current = practiceSubMode;

  // Đang làm bài thi: muốn sang trang khác phải nộp bài (hệ thống tự nộp và tính một lần thi)
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pendingLeave = useRef<(() => void)[]>([]);
  useEffect(() => {
    setLeaveGuard((action) => { pendingLeave.current.push(action); setLeaveOpen(true); });
    return () => setLeaveGuard(null);
  }, []);
  const cancelLeave = () => { pendingLeave.current = []; setLeaveOpen(false); };
  const confirmLeave = async () => {
    setLeaving(true);
    try { await submitExamNow(); } finally { setLeaving(false); }
    const todo = pendingLeave.current;
    pendingLeave.current = [];
    setLeaveOpen(false);
    todo.forEach(fn => fn());
  };
  const setActiveTab = (t: NavTab) => {
    if (t === tabRef.current) return;
    guardLeave(() => setActiveTabRaw(t));
  };
  const setPracticeSubMode = (m: 'topics' | 'exam') => {
    if (m === modeRef.current) return;
    guardLeave(() => setPracticeSubModeRaw(m));
  };

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('topic-dao-ham');

  // Địa chỉ trình duyệt <-> menu đang mở.
  // Khi đăng nhập xong: mở đúng menu theo địa chỉ (ví dụ /baihoc). Địa chỉ không hợp lệ
  // hoặc thuộc vai trò khác thì về trang mặc định của vai trò.
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { setRouteReady(false); return; }
    const hit = resolvePath(window.location.pathname);
    const allowed = hit && (isTeacher ? hit.tab.startsWith('teacher_') : hit.tab.startsWith('student_'));
    const target = allowed ? hit! : { tab: defaultTab(isTeacher), practiceMode: 'topics' as const };
    setActiveTabRaw(target.tab);
    setPracticeSubModeRaw(target.practiceMode);
    setRouteReady(true);
  }, [loading, isAuthenticated, isTeacher]);

  // Menu đổi thì địa chỉ đổi theo (và tab trình duyệt có tên riêng)
  useEffect(() => {
    if (!routeReady) return;
    const path = pathForTab(activeTab, practiceSubMode);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [routeReady, activeTab, practiceSubMode]);

  // Tên tab trình duyệt theo menu đang mở (đặt trước các lệnh return sớm để đúng quy tắc Hooks)
  useEffect(() => {
    const base = SCHOOL.name;
    if (!isAuthenticated) { document.title = `Đăng nhập · ${base}`; return; }
    const title = activeTab === 'student_practice' ? PRACTICE_MODES[practiceSubMode].title : NAV_BY_ID[activeTab].title;
    document.title = `${title} · ${base}`;
  }, [isAuthenticated, activeTab, practiceSubMode]);

  // Nút Quay lại / Tiến tới của trình duyệt
  useEffect(() => {
    const onPop = () => {
      const hit = resolvePath(window.location.pathname);
      if (!hit) return;
      if (isTeacher !== hit.tab.startsWith('teacher_')) return;
      if (isExamLocked() && (hit.tab !== tabRef.current || hit.practiceMode !== modeRef.current)) {
        // Nút Quay lại của trình duyệt: giữ nguyên trang làm bài, hỏi xác nhận trước khi rời
        window.history.pushState(null, '', pathForTab(tabRef.current, modeRef.current));
        guardLeave(() => { setActiveTabRaw(hit.tab); setPracticeSubModeRaw(hit.practiceMode); });
        return;
      }
      setActiveTabRaw(hit.tab);
      setPracticeSubModeRaw(hit.practiceMode);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isTeacher]);

  // Handlers for cross-component direct linking
  const handleOpenLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    if (isTeacher) {
      setActiveTab('teacher_curriculum');
    } else {
      setActiveTab('student_lessons');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPracticeQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
    setPracticeSubMode('topics');
    setActiveTab('student_practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartTopicPractice = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedQuestionId(null);
    setPracticeSubMode('topics');
    setActiveTab('student_practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToExamRoom = () => {
    setPracticeSubMode('exam');
    setActiveTab('student_practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && !bootedRef.current) {
    return (
      <div className="min-h-screen bg-blue-950 paper-grid-dark flex flex-col items-center justify-center text-blue-100 gap-4" role="status">
        <BrandMark size={56} className="text-blue-100" />
        <p className="text-sm text-blue-200">Đang mở hệ thống ôn tập môn Toán…</p>
      </div>
    );
  }

  // If unauthenticated: Strictly render LoginScreen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Thanh trạng thái: mọi thông tin đều lấy từ menu đang mở
  const nav = NAV_BY_ID[activeTab];
  const inPractice = activeTab === 'student_practice';
  const mode = inPractice ? PRACTICE_MODES[practiceSubMode] : null;
  const subKey = teacherSub && teacherSub.tab === activeTab ? teacherSub.sub : null;
  const sub = subKey ? SUB_TABS[activeTab]?.[subKey] ?? null : null;
  const statusTitle = mode ? mode.title : sub ? sub.title : nav.title;
  const statusDescription = mode ? mode.description : sub ? sub.description : nav.description;
  const StatusIcon = mode ? mode.icon : nav.icon;
  const roleLabel = isRootAdmin ? 'Quản trị viên gốc' : isTeacher ? 'Giáo viên Toán' : 'Học sinh';

  const studentId = profile?.uid || 'guest-student';
  const mistakeCount = new Set(
    attempts.filter(a => a.studentId === studentId && !a.isCorrect && !a.resolvedAfterReview).map(a => a.questionId)
  ).size;
  const pendingCount = questions.filter(q => (q.approvalStatus || 'approved') === 'pending').length;

  let statusMeta: string | null = null;
  if (activeTab === 'student_mistakes') statusMeta = mistakeCount ? `${mistakeCount} câu cần ôn lại` : 'Chưa có câu sai';
  if (activeTab === 'teacher_questions') statusMeta = pendingCount ? `${pendingCount} câu chờ duyệt` : 'Không có câu chờ duyệt';
  if (activeTab === 'student_practice' && practiceSubMode === 'exam') statusMeta = 'Chấm điểm bởi máy chủ';

  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen flex bg-[var(--paper)] text-slate-900" style={{ ['--tone' as any]: nav.tone }}>
      {leaveOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/60 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 id="leave-title" className="font-display font-semibold text-slate-900 text-lg">Em đang làm bài thi</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Muốn sang trang khác, em phải nộp bài trước. Nếu rời đi bây giờ, hệ thống sẽ <strong>nộp bài ngay</strong> với những câu em đã làm và <strong>tính là một lần thi</strong>.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={cancelLeave} disabled={leaving} className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5">Ở lại làm bài</button>
              <button type="button" onClick={confirmLeave} disabled={leaving} className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-sm font-semibold px-4 py-2.5">{leaving ? 'Đang nộp bài…' : 'Nộp bài và rời đi'}</button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(t) => { setActiveTab(t); window.scrollTo({ top: 0 }); }}
        collapsed={collapsed || examFocus}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ${
        collapsed || examFocus ? 'md:ml-[4.5rem]' : 'md:ml-66'
      }`}>

        {/* Thanh trạng thái trên cùng: đổi theo menu đang mở */}
        <header className={`sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 ${examFocus ? 'hidden' : ''}`}>
          <div className="tone-rule" />
          <div className="min-h-[3rem] px-4 sm:px-6 py-1.5 flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            {/* key đổi theo menu để chạy lại chuyển động vào của tiêu đề */}
            <div key={activeTab + (mode ? practiceSubMode : '') + (subKey ?? '')} className="status-in flex items-center gap-3 min-w-0 flex-1">
              <div className="tone-chip hidden sm:flex w-8 h-8 rounded-lg items-center justify-center shrink-0">
                <StatusIcon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <nav aria-label="Vị trí hiện tại" className="sr-only">
                  <span>{roleLabel}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
                  <span>{nav.section}</span>
                  {(mode || sub) && (<><ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" /><span>{nav.title}</span></>)}
                </nav>
                <h1 className="text-base sm:text-lg leading-tight text-slate-900 truncate" title={statusDescription}>{statusTitle}</h1>
                <p className="sr-only">{statusDescription}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {statusMeta && (
                <span className="tone-chip hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" aria-live="polite">
                  {statusMeta}
                </span>
              )}
              <button
                onClick={() => setPwOpen(true)}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg flex items-center gap-1.5"
                title="Đổi mật khẩu"
              >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi mật khẩu</span>
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg flex items-center gap-1.5"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}

        {/* Page Content Body */}
        <main className={examFocus ? 'flex-1 p-2 sm:p-2.5 w-full space-y-0' : 'flex-1 p-4 pb-24 sm:px-6 sm:py-4 sm:pb-6 lg:px-8 lg:py-5 max-w-[88rem] w-full mx-auto space-y-4'}>
          
          {/* ========================================================================= */}
          {/* STUDENT INTERFACE (Strictly 5 sections) */}
          {/* ========================================================================= */}
          {!isTeacher && (
            <>
              {/* 1. Trang chủ học tập */}
              {activeTab === 'student_home' && (
                <Overview
                  onNavigate={(tab) => {
                    setActiveTab(tab);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onOpenLesson={handleOpenLesson}
                  onOpenTopicPractice={handleStartTopicPractice}
                />
              )}

              {/* 2. Bài học và chuyên đề kiến thức */}
              {activeTab === 'student_lessons' && (
                <TheoryRepository
                  initialLessonId={selectedLessonId}
                  onStartPracticeQuestion={handleStartPracticeQuestion}
                  onStartTopicPractice={handleStartTopicPractice}
                />
              )}

              {/* 3. Luyện tập và thi thử */}
              {activeTab === 'student_practice' && (
                <div className="space-y-3">
                  {/* Switcher between Topic Practice and Exam Room */}
                  <div className={`bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 max-w-md mx-auto ${examFocus ? 'hidden' : ''}`}>
                    <button
                      onClick={() => setPracticeSubMode('topics')}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        practiceSubMode === 'topics'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      <span>Luyện tập theo dạng</span>
                    </button>

                    <button
                      onClick={() => setPracticeSubMode('exam')}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        practiceSubMode === 'exam'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Phòng thi thử bấm giờ</span>
                    </button>
                  </div>

                  {practiceSubMode === 'topics' ? (
                    <TopicPractice
                      initialTopicId={selectedTopicId}
                      initialQuestionId={selectedQuestionId}
                      onOpenLesson={handleOpenLesson}
                    />
                  ) : (
                    <ExamRoom
                      onOpenLesson={handleOpenLesson}
                    />
                  )}
                </div>
              )}

              {/* 4. Kết quả thi và lịch sử làm bài */}
              {activeTab === 'student_results' && (
                <StudentExamHistory
                  onOpenLesson={handleOpenLesson}
                  onNavigateToExam={handleNavigateToExamRoom}
                />
              )}

              {/* 5. Sổ tay lỗi sai, lời giải và nội dung cần ôn tập */}
              {activeTab === 'student_mistakes' && (
                <MistakeNotebook
                  onPracticeQuestion={handleStartPracticeQuestion}
                  onOpenLesson={handleOpenLesson}
                />
              )}

              {/* Strict Security Guard: If student attempts to reach teacher tabs */}
              {activeTab.startsWith('teacher_') && (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4 my-8">
                  <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Không Có Quyền Truy Cập</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tài khoản học sinh không có quyền truy cập khu vực nghiệp vụ sư phạm của giáo viên.
                  </p>
                  <button
                    onClick={() => setActiveTab('student_home')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Quay lại Trang chủ học tập
                  </button>
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* TEACHER & ADMIN INTERFACE */}
          {/* ========================================================================= */}
          {isTeacher && (
            <>
              {/* 1. Trang tổng quan */}
              {activeTab === 'teacher_overview' && (
                <ProgressReport
                  onOpenLesson={handleOpenLesson}
                  onOpenPractice={handleStartTopicPractice}
                />
              )}

              {/* 2. Quản lý lớp học & học sinh theo niên khóa */}
              {activeTab === 'teacher_classrooms' && (
                <ClassroomManagement />
              )}

              {/* 3. Ngân hàng câu hỏi & Duyệt 4 bước (.docx importer) */}
              {activeTab === 'teacher_questions' && (
                <QuestionBankManager />
              )}

              {/* 4. Bổ sung và quản lý kiến thức, chuyên đề */}
              {activeTab === 'teacher_curriculum' && (
                <CurriculumManager onModeChange={(m) => setTeacherSub({ tab: 'teacher_curriculum', sub: m })} />
              )}

              {/* Kiểm duyệt học liệu */}
              {activeTab === 'teacher_review' && (
                <TeacherManagement tabs={['review', 'addQuestion']} initialSubTab="review" onSubTabChange={(sub) => setTeacherSub({ tab: activeTab, sub })} />
              )}

              {/* 5. Soạn đề thi & Ngân hàng đề */}
              {activeTab === 'teacher_exams' && (
                <ExamManager onModeChange={(m) => setTeacherSub({ tab: 'teacher_exams', sub: m })} />
              )}

              {/* 6. Xem kết quả thi của học sinh, bài làm chi tiết */}
              {activeTab === 'teacher_results' && (
                <TeacherManagement tabs={['results']} initialSubTab="results" onSubTabChange={(sub) => setTeacherSub({ tab: activeTab, sub })} />
              )}

              {/* 7. Quản lý tài khoản trường & Phân quyền */}
              {activeTab === 'teacher_accounts' && (
                <AccountManagement />
              )}

              {/* 8. Phân quyền quản trị (Chỉ mở cho Root Admin viethathd@gmail.com) */}
              {activeTab === 'teacher_admins' && (
                isRootAdmin ? (
                  <TeacherManagement tabs={['admins', 'securityGuide', 'firebaseCheck']} initialSubTab="admins" onSubTabChange={(sub) => setTeacherSub({ tab: activeTab, sub })} />
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4 my-8">
                    <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Chỉ Dành Cho Quản Trị Viên Gốc</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Chức năng cấp hoặc thu hồi quyền quản trị viên chỉ dành riêng cho tài khoản gốc <strong>viethathd@gmail.com</strong>.
                    </p>
                  </div>
                )
              )}
            </>
          )}

        </main>
        <ChatWidget context={`Menu: ${statusTitle}`} />

        {/* Thanh trạng thái dưới cùng */}
        <footer className={`sticky bottom-0 z-20 mt-auto border-t border-slate-200 bg-white text-xs text-slate-600 ${examFocus ? 'hidden' : ''}`} role="contentinfo">
          <div className="px-4 sm:px-6 h-9 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--tone)' }} aria-hidden="true" />
              <span className="truncate"><span className="text-slate-400">Đang mở:</span> <span className="font-medium text-slate-800">{statusTitle}</span></span>
            </div>
            <div className="hidden md:flex items-center gap-4 text-slate-500">
              <span>{SCHOOL.name}</span>
              <span>{SCHOOL.year}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:flex items-center gap-1.5 capitalize"><CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />{today}</span>
              <span className={`flex items-center gap-1.5 font-medium ${online ? 'text-emerald-700' : 'text-rose-700'}`}>
                {online ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" /> : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
                {online ? 'Đã kết nối' : 'Mất kết nối'}
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
