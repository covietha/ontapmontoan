import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  Send, 
  ArrowLeft, 
  ArrowRight,
  BookOpen,
  Award,
  Sparkles,
  BarChart2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Exam, Question } from '../types';
import MathRenderer from './MathRenderer';

/** Kết quả chấm từng câu do máy chủ trả về. */
interface Detail {
  type?: 'mcq' | 'true_false' | 'short_answer' | 'essay';
  isCorrect: boolean;
  points?: number;
  maxPoints?: number;
  correctOptionIndex: number;
  correctTruths?: boolean[];
  correctAnswers?: string[];
  statementCorrect?: boolean[];
  pendingReview?: boolean;
  explanation: string;
}

type QKind = 'mcq' | 'true_false' | 'short_answer' | 'essay';
const kindOf = (q: Question): QKind => (q.questionType === 'true_false' || q.questionType === 'short_answer' || q.questionType === 'essay' ? q.questionType : 'mcq');
const PARTS: { kind: QKind; title: string }[] = [
  { kind: 'mcq', title: 'Phần 1: Trắc nghiệm lựa chọn' },
  { kind: 'true_false', title: 'Phần 2: Trắc nghiệm Đúng/Sai' },
  { kind: 'short_answer', title: 'Phần 3: Trả lời ngắn' },
  { kind: 'essay', title: 'Phần 4: Tự luận' }
];

/** Câu đã có trả lời hay chưa, theo từng dạng. */
function isAnswered(q: Question, a: unknown): boolean {
  const k = kindOf(q);
  if (k === 'mcq') return typeof a === 'number';
  if (k === 'true_false') return Array.isArray(a) && a.some(v => typeof v === 'boolean');
  return typeof a === 'string' && a.trim().length > 0;
}

interface ExamRoomProps {
  onOpenLesson: (lessonId: string) => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({ onOpenLesson }) => {
  const { exams, questions, recordExamResult, examResults, recordQuestionAttempt, refreshExams } = useData();

  useEffect(() => { refreshExams(); }, [refreshExams]);
  const { profile, getIdToken } = useAuth();

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [isInTestMode, setIsInTestMode] = useState<boolean>(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  
  // Student answers: questionId -> selectedIndex
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [fontPx, setFontPx] = useState<number>(17);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // Countdown timer in seconds
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [finalResultScore, setFinalResultScore] = useState<number | null>(null);
  const [serverCorrectCount, setServerCorrectCount] = useState<number>(0);
  const [serverDetailedResults, setServerDetailedResults] = useState<Record<string, Detail>>({});
  const [essayCount, setEssayCount] = useState(0);
  const [gradedTotal, setGradedTotal] = useState(0);
  const [serverGradingError, setServerGradingError] = useState<string | null>(null);

  // Questions in current exam
  const examQuestions: Question[] = useMemo(() => {
    if (!activeExam) return [];
    if (activeExam.customQuestions) return activeExam.customQuestions;
    return activeExam.questionIds
      .map(id => questions.find(q => q.id === id))
      .filter((q): q is Question => q !== undefined);
  }, [activeExam, questions]);

  // Timer effect
  useEffect(() => {
    if (!isInTestMode || isFinished || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInTestMode, isFinished, timeLeft]);

  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setIsInTestMode(true);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setMarkedForReview({});
    setTimeLeft(exam.durationMinutes * 60);
    setIsFinished(false);
    setFinalResultScore(null);
    setServerDetailedResults({});
    setServerGradingError(null);
    setEssayCount(0);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isFinished) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const setTruth = (questionId: string, stmtIdx: number, value: boolean) => {
    if (isFinished) return;
    setAnswers(prev => {
      const cur: (boolean | null)[] = Array.isArray(prev[questionId]) ? [...prev[questionId]] : [null, null, null, null];
      cur[stmtIdx] = cur[stmtIdx] === value ? null : value;
      return { ...prev, [questionId]: cur };
    });
  };

  const setText = (questionId: string, value: string) => {
    if (isFinished) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleMarkReview = (questionId: string) => {
    setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const [verificationStatus, setVerificationStatus] = useState<'server_verified' | 'client_preview_unverified'>('client_preview_unverified');

  const handleFinishExam = async () => {
    if (!activeExam || isFinished) return;
    setShowSubmitModal(false);
    setIsFinished(true);
    setServerGradingError(null);

    const timeSpent = activeExam.durationMinutes * 60 - timeLeft;
    let finalScore = 0;
    let correct = 0;
    const total = examQuestions.length;
    let status: 'server_verified' | 'client_preview_unverified' = 'client_preview_unverified';
    let returnedDetails: Record<string, Detail> = {};

    try {
      // Lấy Firebase ID Token chính thực của học sinh
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Dùng token thử nghiệm tương ứng nếu đang ở tài khoản demo
        headers['Authorization'] = profile?.role === 'teacher' 
          ? 'Bearer test-token-teacher-root' 
          : 'Bearer test-token-student-an';
      }

      // 1. Gửi lên máy chủ chấm thi độc lập & xác thực danh tính
      // Máy chủ tự xác thực danh tính từ Bearer Token, không phụ thuộc studentId do client gửi
      const resp = await fetch('/api/exams/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          examId: activeExam.id,
          userAnswers: answers,
          timeSpentSeconds: timeSpent > 0 ? timeSpent : 1,
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        finalScore = data.score;
        correct = data.correctCount;
        status = 'server_verified';
        returnedDetails = data.detailedResults || {};
        setServerDetailedResults(returnedDetails);
        setServerCorrectCount(data.correctCount);
        setEssayCount(data.essayCount || 0);
        setGradedTotal(data.totalCount ?? total);
      } else {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Máy chủ chấm điểm phản hồi mã lỗi ${resp.status}`);
      }
    } catch (err: any) {
      console.warn('Server grading failed or not authenticated:', err);
      status = 'client_preview_unverified';
      setServerGradingError(err?.message || 'Không thể kết nối máy chủ chấm điểm chính thức.');
    }

    setFinalResultScore(finalScore);
    setVerificationStatus(status);

    // Ghi nhận lượt làm câu hỏi để đưa câu sai vào sổ tay lỗi sai dựa trên kết quả máy chủ trả về
    examQuestions.forEach(q => {
      const selected = answers[q.id];
      if (typeof selected === 'number' && !activeExam.isCustom) {
        const srvDetail = returnedDetails[q.id];
        const isQCorrect = srvDetail ? srvDetail.isCorrect : false;
        recordQuestionAttempt({
          questionId: q.id,
          lessonId: q.lessonId,
          topicId: q.topicId,
          selectedOptionIndex: selected,
          isCorrect: isQCorrect,
          isReAttempt: false
        });
      }
    });

    await recordExamResult({
      examId: activeExam.id,
      examTitle: activeExam.title,
      score: finalScore,
      correctCount: correct,
      totalCount: total,
      timeSpentSeconds: timeSpent > 0 ? timeSpent : 1,
      userAnswers: answers,
      verificationStatus: status,
    });

    if (finalScore >= 8) {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {}
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = examQuestions[currentQuestionIdx];
  const letters = ['A', 'B', 'C', 'D'];

  // Current user's past exam results
  const studentId = profile?.uid || 'guest-student';
  const myResults = examResults.filter(r => r.studentId === studentId);

  // If not currently in a test, show exam list and history
  if (!isInTestMode || !activeExam) {
    return (
      <div className="space-y-8 pb-12">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Phòng luyện đề chuẩn cấu trúc THPT</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Các bộ đề được giáo viên thẩm định đáp án, có đồng hồ đếm ngược, chấm điểm chuẩn xác và chữa bài chi tiết.
            </p>
          </div>
        </div>

        {/* Exam Cards Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Danh sách đề thi tuyển chọn
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {exams.map(exam => {
              const pastAttempts = myResults.filter(r => r.examId === exam.id);
              const bestScore = pastAttempts.length > 0 
                ? Math.max(...pastAttempts.map(r => r.score)) 
                : null;

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                        {exam.code}
                      </span>
                      {exam.isCustom ? (
                        <span className="px-2 py-0.5 rounded text-[12.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đề của giáo viên
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[12.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          MẪU – CẦN GIÁO VIÊN KIỂM DUYỆT
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {exam.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {exam.durationMinutes} phút
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {exam.totalQuestions} câu
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {bestScore !== null ? (
                        <div className="text-xs">
                          <span className="text-slate-500">Điểm cao nhất: </span>
                          <span className="font-bold text-blue-600">{bestScore}/10</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa làm đề này</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartExam(exam)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Bắt đầu làm bài</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Exam Results History */}
        {myResults.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Lịch sử làm bài thi thử của bạn
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Tên đề thi</th>
                    <th className="py-2.5 px-3">Điểm số</th>
                    <th className="py-2.5 px-3">Số câu đúng</th>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Ngày nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {myResults.map(res => (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{res.examTitle}</td>
                      <td className="py-3 px-3">
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          res.score >= 8 ? 'bg-emerald-100 text-emerald-800' :
                          res.score >= 5 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {res.score}/10
                        </span>
                      </td>
                      <td className="py-3 px-3">{res.correctCount}/{res.totalCount}</td>
                      <td className="py-3 px-3">{Math.round(res.timeSpentSeconds / 60)} phút</td>
                      <td className="py-3 px-3 text-slate-400">{new Date(res.completedAt).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TEST ROOM VIEW (Active exam in progress or finished review)
  const answeredCount = examQuestions.filter(q => isAnswered(q, answers[q.id])).length;
  const ordered = examQuestions; // đã sắp theo phần khi lưu đề

  const statusOf = (q: Question) => {
    const d = serverDetailedResults[q.id];
    if (!isFinished || !d) return 'none' as const;
    if (d.pendingReview) return 'pending' as const;
    if (d.isCorrect) return 'correct' as const;
    if ((d.points || 0) > 0) return 'partial' as const;
    return isAnswered(q, answers[q.id]) ? ('wrong' as const) : ('none' as const);
  };

  const goTo = (idx: number) => {
    setCurrentQuestionIdx(idx);
    if (viewMode === 'all') {
      document.getElementById(`q-${examQuestions[idx]?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderQuestion = (q: Question, idx: number) => {
    const kind = kindOf(q);
    const detail = serverDetailedResults[q.id];
    const ans = answers[q.id];

    return (
      <div key={q.id} id={`q-${q.id}`} className="space-y-5 scroll-mt-24">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold px-3 py-1 rounded-lg bg-blue-600 text-white">Câu {idx + 1}</span>
            <span className="text-sm text-slate-500">{PARTS.find(p => p.kind === kind)?.title.split(':')[1]?.trim()}</span>
            {isFinished && detail && !detail.pendingReview && (
              <span className="text-sm font-semibold text-slate-700">· {detail.points}/{detail.maxPoints} điểm thô</span>
            )}
          </div>
          {!isFinished && (
            <button
              onClick={() => toggleMarkReview(q.id)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold border transition-all ${
                markedForReview[q.id] ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {markedForReview[q.id] ? '★ Đã đánh dấu xem lại' : '☆ Đánh dấu xem lại'}
            </button>
          )}
        </div>

        <div className="font-medium text-slate-900 leading-relaxed" style={{ fontSize: fontPx }}>
          <MathRenderer content={q.prompt} />
        </div>

        {kind === 'mcq' && (
          <div className="space-y-3" style={{ fontSize: fontPx }}>
            {q.options.map((optText, optIdx) => {
              const isSelected = ans === optIdx;
              const isCorrect = detail !== undefined && optIdx === detail.correctOptionIndex;
              let style = 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20';
              if (isFinished) {
                if (isCorrect) style = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20';
                else if (isSelected) style = 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20';
                else style = 'border-slate-200 opacity-60';
              } else if (isSelected) {
                style = 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20';
              }
              return (
                <button
                  key={optIdx}
                  disabled={isFinished}
                  onClick={() => handleSelectOption(q.id, optIdx)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${style}`}
                >
                  <span className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-sm ${
                    isFinished && isCorrect ? 'bg-emerald-600 text-white' : isFinished && isSelected ? 'bg-rose-600 text-white' : isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>{letters[optIdx]}</span>
                  <div className="font-medium flex-1 pt-0.5 overflow-x-auto"><MathRenderer content={optText} inline /></div>
                  {isFinished && (isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : isSelected ? <XCircle className="w-5 h-5 text-rose-600 shrink-0" /> : null)}
                </button>
              );
            })}
          </div>
        )}

        {kind === 'true_false' && (
          <div className="space-y-3" style={{ fontSize: fontPx }}>
            {(q.statements || []).map((st, si) => {
              const given: boolean | null = Array.isArray(ans) ? (typeof ans[si] === 'boolean' ? ans[si] : null) : null;
              const right = detail?.statementCorrect?.[si];
              const rowStyle = isFinished && detail
                ? right ? 'border-emerald-300 bg-emerald-50/50' : 'border-rose-300 bg-rose-50/50'
                : 'border-slate-200';
              return (
                <div key={si} className={`rounded-2xl border-2 p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 ${rowStyle}`}>
                  <div className="flex gap-2 shrink-0" role="group" aria-label={`Ý ${'abcd'[si]}`}>
                    {([true, false] as const).map(v => {
                      const on = given === v;
                      const correctOne = isFinished && detail?.correctTruths?.[si] === v;
                      return (
                        <button
                          key={String(v)}
                          disabled={isFinished}
                          aria-pressed={on}
                          aria-label={`Ý ${'abcd'[si]}: ${v ? 'Đúng' : 'Sai'}`}
                          onClick={() => setTruth(q.id, si, v)}
                          className={`w-12 h-12 rounded-xl border-2 font-bold transition-all ${
                            on
                              ? isFinished ? (right ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-rose-600 border-rose-600 text-white') : 'bg-blue-600 border-blue-600 text-white'
                              : correctOne ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-slate-300 text-slate-600 bg-white hover:border-blue-400'
                          }`}
                        >
                          {v ? 'Đ' : 'S'}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex-1 min-w-0 overflow-x-auto">
                    <span className="font-semibold text-slate-600 mr-2">{'abcd'[si]})</span>
                    <MathRenderer content={st} inline />
                  </div>
                  {isFinished && detail && (right ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />)}
                </div>
              );
            })}
          </div>
        )}

        {kind === 'short_answer' && (
          <div className="space-y-2">
            <label htmlFor={`sa-${q.id}`} className="block text-sm font-semibold text-slate-600">Nhập đáp án (một số)</label>
            <input
              id={`sa-${q.id}`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              disabled={isFinished}
              value={typeof ans === 'string' ? ans : ''}
              onChange={e => setText(q.id, e.target.value)}
              placeholder="Ví dụ: 12,5"
              maxLength={60}
              style={{ fontSize: fontPx }}
              className={`w-full sm:max-w-sm rounded-2xl border-2 px-4 py-3 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 ${
                isFinished && detail ? (detail.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50') : 'border-slate-300 bg-white'
              }`}
            />
            {isFinished && detail && !detail.isCorrect && (
              <p className="text-base text-emerald-800 font-semibold">Đáp án đúng: {(detail.correctAnswers || []).join('  hoặc  ')}</p>
            )}
          </div>
        )}

        {kind === 'essay' && (
          <div className="space-y-2">
            <label htmlFor={`es-${q.id}`} className="block text-sm font-semibold text-slate-600">Bài làm của em</label>
            <textarea
              id={`es-${q.id}`}
              disabled={isFinished}
              value={typeof ans === 'string' ? ans : ''}
              onChange={e => setText(q.id, e.target.value)}
              maxLength={8000}
              placeholder="Trình bày lời giải..."
              style={{ fontSize: fontPx }}
              className="w-full min-h-[10rem] rounded-2xl border-2 border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
            />
            {isFinished && <p className="text-base text-amber-800 font-medium">Câu tự luận do giáo viên chấm, chưa tính vào điểm tự động.</p>}
          </div>
        )}

        {isFinished && (
          <div className="space-y-4">
            {detail && !detail.isCorrect && !detail.pendingReview && q.lessonId && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-rose-800">Câu này chưa đúng hoàn toàn</span>
                  <p className="text-rose-700 mt-0.5 text-sm">{q.hintOnWrong || 'Xem lời giải bên dưới để rút kinh nghiệm.'}</p>
                </div>
                <button onClick={() => onOpenLesson(q.lessonId)} className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm whitespace-nowrap flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Ôn bài {q.lessonCode}
                </button>
              </div>
            )}
            {detail?.explanation && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  {detail.type === 'essay' ? 'Hướng dẫn chấm' : `Lời giải chi tiết câu ${idx + 1}`}
                </h4>
                <div className="text-slate-700 leading-relaxed overflow-x-auto" style={{ fontSize: fontPx }}>
                  <MathRenderer content={detail.explanation} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Thanh đề thi: mã đề, đồng hồ, nộp bài */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur px-4 py-2.5 rounded-2xl border border-slate-200 shadow-md flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{activeExam.code}</span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate">{activeExam.title}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-base font-black border ${
            timeLeft <= 120 && !isFinished ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{isFinished ? 'ĐÃ HOÀN THÀNH' : formatTime(timeLeft)}</span>
          </div>
          {!isFinished ? (
            <button onClick={() => setShowSubmitModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 cursor-pointer">
              <Send className="w-4 h-4" /><span>Nộp bài</span>
            </button>
          ) : (
            <button onClick={() => setIsInTestMode(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm">
              <ArrowLeft className="w-4 h-4" /><span>Thoát phòng thi</span>
            </button>
          )}
        </div>
      </div>

      {isFinished && finalResultScore !== null && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in duration-500">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm font-semibold">
                <Award className="w-4 h-4 text-amber-300" /> Kết quả thi thử của bạn
              </div>
              {verificationStatus === 'server_verified' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">🔒 Đã xác thực & Chấm điểm máy chủ</span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">⚠️ Chế độ dự phòng máy khách (Chưa qua máy chủ)</span>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black">Điểm đạt được: <span className="text-amber-300">{finalResultScore}</span> / 10</h3>
            <p className="text-sm text-blue-100">
              Số câu làm đúng hoàn toàn: <strong>{serverCorrectCount}</strong> / {gradedTotal || examQuestions.length} câu.
              {essayCount > 0 && <> Còn {essayCount} câu tự luận chờ giáo viên chấm.</>} Xem lại từng câu bên dưới để chữa đề!
            </p>
          </div>
          <button onClick={() => handleStartExam(activeExam)} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-900 font-bold text-sm shadow-md hover:bg-blue-50">
            <RotateCcw className="w-4 h-4 text-blue-600" /><span>Làm lại đề này</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Nội dung câu hỏi */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-8">
          {serverGradingError && isFinished && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <strong>Thông báo từ hệ thống chấm điểm:</strong> {serverGradingError}
            </div>
          )}

          {viewMode === 'all' ? (
            ordered.map((q, idx) => (
              <div key={q.id} className={idx > 0 ? 'pt-8 border-t border-slate-200' : ''}>{renderQuestion(q, idx)}</div>
            ))
          ) : currentQ ? (
            <>
              {renderQuestion(currentQ, currentQuestionIdx)}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${currentQuestionIdx === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
                >
                  <ArrowLeft className="w-4 h-4" /> Câu trước
                </button>
                <button
                  disabled={currentQuestionIdx === examQuestions.length - 1}
                  onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${currentQuestionIdx === examQuestions.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'}`}
                >
                  Câu tiếp theo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Bảng điều khiển bên phải */}
        <div className="lg:col-span-4 lg:sticky lg:top-32 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Cỡ chữ</span>
              <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
                <button onClick={() => setFontPx(f => Math.max(14, f - 1))} className="px-3 py-1 font-bold hover:bg-slate-100" aria-label="Giảm cỡ chữ">A−</button>
                <span className="px-2 font-semibold tabular-nums">{fontPx}px</span>
                <button onClick={() => setFontPx(f => Math.min(26, f + 1))} className="px-3 py-1 font-bold hover:bg-slate-100" aria-label="Tăng cỡ chữ">A+</button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Cách xem</span>
              <div className="flex rounded-lg border border-slate-300 bg-white overflow-hidden" role="group" aria-label="Cách xem">
                {([['single', 'Từng câu'], ['all', 'Tất cả']] as const).map(([m, label]) => (
                  <button key={m} onClick={() => setViewMode(m)} aria-pressed={viewMode === m}
                    className={`px-3 py-1 font-semibold ${viewMode === m ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Bảng câu hỏi ({examQuestions.length})</h4>
            <span className="text-sm text-slate-600 font-semibold">Đã làm: {answeredCount}/{examQuestions.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600" /><span>Đã làm</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" /><span>Chưa làm</span></div>
            {!isFinished ? (
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /><span>Xem lại</span></div>
            ) : (
              <>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /><span>Đúng</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500" /><span>Sai</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /><span>Đúng một phần</span></div>
              </>
            )}
          </div>

          {PARTS.map(part => {
            const items = examQuestions.map((q, idx) => ({ q, idx })).filter(x => kindOf(x.q) === part.kind);
            if (items.length === 0) return null;
            return (
              <div key={part.kind} className="space-y-2">
                <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1">{part.title}</div>
                <div className="grid grid-cols-5 gap-2">
                  {items.map(({ q, idx }) => {
                    const st = statusOf(q);
                    const answered = isAnswered(q, answers[q.id]);
                    let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
                    if (isFinished) {
                      btnStyle = st === 'correct' ? 'bg-emerald-500 text-white font-bold border-emerald-600'
                        : st === 'wrong' ? 'bg-rose-500 text-white font-bold border-rose-600'
                        : st === 'partial' ? 'bg-amber-400 text-slate-900 font-bold border-amber-500'
                        : st === 'pending' ? 'bg-sky-100 text-sky-800 border-sky-300'
                        : 'bg-slate-200 text-slate-500 border-slate-300';
                    } else if (markedForReview[q.id]) btnStyle = 'bg-amber-400 text-slate-900 font-bold border-amber-500';
                    else if (answered) btnStyle = 'bg-blue-600 text-white font-bold border-blue-700';
                    return (
                      <button
                        key={q.id}
                        onClick={() => goTo(idx)}
                        aria-label={`Câu ${idx + 1}`}
                        className={`h-10 rounded-xl text-sm font-bold border transition-all flex items-center justify-center ${btnStyle} ${currentQuestionIdx === idx ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!isFinished && (
            <div className="pt-3 border-t border-slate-100">
              <button onClick={() => setShowSubmitModal(true)} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer">
                <Send className="w-4 h-4" /><span>Nộp bài & Chấm điểm ngay</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> Xác nhận nộp bài thi
            </h3>
            <div className="text-sm text-slate-600 space-y-2">
              <p>Bạn đã trả lời <strong>{answeredCount} / {examQuestions.length}</strong> câu hỏi.</p>
              {answeredCount < examQuestions.length && (
                <p className="text-rose-600 font-semibold">⚠️ Còn {examQuestions.length - answeredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp?</p>
              )}
              <p>Thời gian còn lại: <strong>{formatTime(timeLeft)}</strong>.</p>
            </div>
            <div className="flex gap-3 pt-3">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50">Tiếp tục làm bài</button>
              <button onClick={handleFinishExam} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md">Xác nhận nộp bài</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRoom;
