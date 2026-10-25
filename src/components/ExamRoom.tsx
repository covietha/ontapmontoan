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
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});

  // Countdown timer in seconds
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [finalResultScore, setFinalResultScore] = useState<number | null>(null);
  const [serverCorrectCount, setServerCorrectCount] = useState<number>(0);
  const [serverDetailedResults, setServerDetailedResults] = useState<Record<string, { isCorrect: boolean; correctOptionIndex: number; explanation: string }>>({});
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
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isFinished) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
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
    let returnedDetails: Record<string, { isCorrect: boolean; correctOptionIndex: number; explanation: string }> = {};

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
      if (selected !== undefined && !activeExam.isCustom) {
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
                        {exam.totalQuestions} câu trắc nghiệm
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
  return (
    <div className="space-y-6 pb-16">
      {/* Top Test Header Bar with Sticky Timer */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-md flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {activeExam.code}
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1 line-clamp-1">
            {activeExam.title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Display */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-black border ${
            timeLeft <= 120 && !isFinished
              ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
              : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{isFinished ? 'ĐÃ HOÀN THÀNH' : formatTime(timeLeft)}</span>
          </div>

          {!isFinished ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài</span>
            </button>
          ) : (
            <button
              onClick={() => setIsInTestMode(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Thoát phòng thi</span>
            </button>
          )}
        </div>
      </div>

      {/* FINISHED SCORE CARD BANNER */}
      {isFinished && finalResultScore !== null && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in duration-500">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                <Award className="w-4 h-4 text-amber-300" />
                Kết quả thi thử của bạn
              </div>
              {verificationStatus === 'server_verified' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  🔒 Đã xác thực & Chấm điểm máy chủ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  ⚠️ Chế độ dự phòng máy khách (Chưa qua máy chủ)
                </span>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black">
              Điểm đạt được: <span className="text-amber-300">{finalResultScore}</span> / 10
            </h3>
            <p className="text-xs text-blue-100">
              Số câu làm đúng: <strong>{serverCorrectCount}</strong> / {examQuestions.length} câu.
              Xem lại từng câu bên dưới để chữa đề!
            </p>
          </div>

          <button
            onClick={() => handleStartExam(activeExam)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-900 font-bold text-xs shadow-md hover:bg-blue-50 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-blue-600" />
            <span>Làm lại đề này</span>
          </button>
        </div>
      )}

      {/* Main Grid: Question Content (8 cols) + Question Palette (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Question Display */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {currentQ ? (
            <>
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-blue-600 text-white">
                    Câu {currentQuestionIdx + 1}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {currentQ.code}
                  </span>
                </div>

                {!isFinished && (
                  <button
                    onClick={() => toggleMarkReview(currentQ.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      markedForReview[currentQ.id]
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {markedForReview[currentQ.id] ? '★ Đã đánh dấu xem lại' : '☆ Đánh dấu xem lại'}
                  </button>
                )}
              </div>

              {/* Question Prompt */}
              <div className="text-base font-semibold text-slate-900 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <MathRenderer content={currentQ.prompt} />
              </div>

              {/* 4 Choices */}
              <div className="space-y-3">
                {currentQ.options.map((optText, optIdx) => {
                  const letter = letters[optIdx];
                  const isSelected = answers[currentQ.id] === optIdx;
                  const srvDetail = serverDetailedResults[currentQ.id];
                  const isCorrect = srvDetail !== undefined && optIdx === srvDetail.correctOptionIndex;

                  let style = 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/20';

                  if (isFinished) {
                    if (isCorrect) {
                      style = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20';
                    } else if (isSelected && !isCorrect) {
                      style = 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20';
                    } else {
                      style = 'border-slate-200 opacity-60';
                    }
                  } else if (isSelected) {
                    style = 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20';
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isFinished}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${style}`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs transition-all ${
                          isFinished && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isFinished && isSelected && !isCorrect
                            ? 'bg-rose-600 text-white'
                            : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {letter}
                      </span>

                      <div className="text-sm font-medium flex-1 pt-0.5 overflow-x-auto">
                        <MathRenderer content={optText} inline />
                      </div>

                      {isFinished && (
                        <div className="shrink-0 pt-0.5">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : isSelected ? (
                            <XCircle className="w-5 h-5 text-rose-600" />
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Prev / Next navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    currentQuestionIdx === 0 
                      ? 'text-slate-300 cursor-not-allowed' 
                      : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Câu trước
                </button>

                <button
                  disabled={currentQuestionIdx === examQuestions.length - 1}
                  onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    currentQuestionIdx === examQuestions.length - 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  Câu tiếp theo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* IF FINISHED: DETAILED SOLUTION & THEORY REMEDIATION */}
              {isFinished && (
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-4 animate-in fade-in">
                  {serverGradingError && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <strong>Thông báo từ hệ thống chấm điểm:</strong> {serverGradingError}
                    </div>
                  )}

                  {serverDetailedResults[currentQ.id] && !serverDetailedResults[currentQ.id].isCorrect && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-rose-800">⚠️ Bạn đã làm sai câu này!</span>
                        <p className="text-rose-700 mt-0.5">{currentQ.hintOnWrong || 'Xem lời giải bên dưới để rút kinh nghiệm.'}</p>
                      </div>
                      {currentQ.lessonId && <button
                        onClick={() => onOpenLesson(currentQ.lessonId)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs whitespace-nowrap shadow-xs flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Ôn bài {currentQ.lessonCode}
                      </button>}
                    </div>
                  )}

                  {serverDetailedResults[currentQ.id]?.explanation && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Lời giải chi tiết câu {currentQuestionIdx + 1} (Máy chủ xác thực):
                      </h4>
                      <div className="text-xs sm:text-sm text-slate-700 leading-relaxed overflow-x-auto">
                        <MathRenderer content={serverDetailedResults[currentQ.id].explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Right Palette: Question Quick Navigation (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bảng câu hỏi ({examQuestions.length})
            </h4>
            <span className="text-xs text-slate-500 font-semibold">
              Đã làm: {Object.keys(answers).length}/{examQuestions.length}
            </span>
          </div>

          {/* Quick status legend */}
          <div className="grid grid-cols-2 gap-2 text-[13px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-600" />
              <span>Đã chọn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
              <span>Chưa làm</span>
            </div>
            {!isFinished && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Xem lại</span>
              </div>
            )}
            {isFinished && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Đúng</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500" />
                  <span>Sai</span>
                </div>
              </>
            )}
          </div>

          {/* Questions Grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {examQuestions.map((q, idx) => {
              const isSelectedIdx = currentQuestionIdx === idx;
              const hasAnswered = answers[q.id] !== undefined;
              const isMarked = markedForReview[q.id];
              const srvDetail = serverDetailedResults[q.id];
              const isCorrect = isFinished && srvDetail?.isCorrect === true;
              const isWrong = isFinished && hasAnswered && srvDetail?.isCorrect === false;

              let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';

              if (isFinished) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-500 text-white font-bold border-emerald-600';
                } else if (isWrong) {
                  btnStyle = 'bg-rose-500 text-white font-bold border-rose-600';
                } else {
                  btnStyle = 'bg-slate-200 text-slate-500 border-slate-300';
                }
              } else if (isMarked) {
                btnStyle = 'bg-amber-400 text-slate-900 font-bold border-amber-500';
              } else if (hasAnswered) {
                btnStyle = 'bg-blue-600 text-white font-bold border-blue-700';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={`h-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center relative ${btnStyle} ${
                    isSelectedIdx ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {!isFinished && (
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Nộp bài & Chấm điểm ngay</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Xác nhận nộp bài thi
            </h3>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Bạn đã trả lời <strong>{Object.keys(answers).length} / {examQuestions.length}</strong> câu hỏi.
              </p>
              {Object.keys(answers).length < examQuestions.length && (
                <p className="text-rose-600 font-semibold">
                  ⚠️ Còn {examQuestions.length - Object.keys(answers).length} câu chưa chọn đáp án. Bạn có chắc chắn muốn nộp?
                </p>
              )}
              <p>Thời gian còn lại: <strong>{formatTime(timeLeft)}</strong>.</p>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-all"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={handleFinishExam}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamRoom;
