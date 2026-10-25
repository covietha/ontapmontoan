import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  RefreshCw, 
  ArrowRight, 
  HelpCircle, 
  Lightbulb, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  Award,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionDifficulty } from '../types';
import MathRenderer from './MathRenderer';

interface TopicPracticeProps {
  initialTopicId?: string;
  initialQuestionId?: string | null;
  onOpenLesson: (lessonId: string) => void;
}

export const TopicPractice: React.FC<TopicPracticeProps> = ({
  initialTopicId,
  initialQuestionId,
  onOpenLesson,
}) => {
  const { topics, lessons, questions, recordQuestionAttempt, getLessonById, getSimilarQuestions, attempts } = useData();
  const { profile, getIdToken } = useAuth();

  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || topics[0]?.id || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  
  // Active Question ID
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(() => {
    if (initialQuestionId) return initialQuestionId;
    const initialPool = questions.filter(q => q.topicId === selectedTopicId);
    return initialPool[0]?.id || questions[0]?.id || '';
  });

  // User's currently selected option (0=A, 1=B, 2=C, 3=D)
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  // Whether the student has clicked "Nộp câu trả lời"
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync if initialQuestionId changes
  useEffect(() => {
    if (initialQuestionId) {
      setCurrentQuestionId(initialQuestionId);
      setSelectedOption(null);
      setSubmitted(false);
      const q = questions.find(item => item.id === initialQuestionId);
      if (q) setSelectedTopicId(q.topicId);
    }
  }, [initialQuestionId, questions]);

  // Available questions for current filter
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchTopic = selectedTopicId === 'all' || q.topicId === selectedTopicId;
      const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      return matchTopic && matchDiff;
    });
  }, [questions, selectedTopicId, selectedDifficulty]);

  const currentQuestion: Question | undefined = useMemo(() => {
    return questions.find(q => q.id === currentQuestionId) || filteredQuestions[0];
  }, [questions, currentQuestionId, filteredQuestions]);

  const relatedLesson = useMemo(() => {
    if (!currentQuestion) return undefined;
    return getLessonById(currentQuestion.lessonId) || getLessonById(currentQuestion.lessonCode);
  }, [currentQuestion, getLessonById]);

  const similarQuestions = useMemo(() => {
    if (!currentQuestion) return [];
    return getSimilarQuestions(currentQuestion.id);
  }, [currentQuestion, getSimilarQuestions]);

  // History of attempts for current question
  const currentAttempts = useMemo(() => {
    const uid = profile?.uid || 'guest-student';
    return attempts.filter(a => a.studentId === uid && a.questionId === currentQuestion?.id);
  }, [attempts, profile?.uid, currentQuestion?.id]);

  const [serverCheckResult, setServerCheckResult] = useState<{
    isCorrect: boolean;
    correctOptionIndex: number;
    explanation: string;
  } | null>(null);

  const isCorrect = submitted && serverCheckResult ? serverCheckResult.isCorrect : false;

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentQuestion || submitted) return;

    setIsSubmitting(true);
    let correct = false;

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = profile?.role === 'teacher' 
          ? 'Bearer test-token-teacher-root' 
          : 'Bearer test-token-student-an';
      }

      const resp = await fetch('/api/practice/check', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionIndex: selectedOption
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setServerCheckResult(data);
        correct = data.isCorrect;
      } else {
        // Fallback for custom user questions that might have client correctOptionIndex
        const fallbackCorrect = typeof currentQuestion.correctOptionIndex === 'number' && selectedOption === currentQuestion.correctOptionIndex;
        correct = fallbackCorrect;
        if (typeof currentQuestion.correctOptionIndex === 'number') {
          setServerCheckResult({
            isCorrect: fallbackCorrect,
            correctOptionIndex: currentQuestion.correctOptionIndex,
            explanation: currentQuestion.explanation || currentQuestion.hintOnWrong
          });
        }
      }
    } catch {
      const fallbackCorrect = typeof currentQuestion.correctOptionIndex === 'number' && selectedOption === currentQuestion.correctOptionIndex;
      correct = fallbackCorrect;
      if (typeof currentQuestion.correctOptionIndex === 'number') {
        setServerCheckResult({
          isCorrect: fallbackCorrect,
          correctOptionIndex: currentQuestion.correctOptionIndex,
          explanation: currentQuestion.explanation || currentQuestion.hintOnWrong
        });
      }
    }

    const hadPreviousFail = currentAttempts.some(a => !a.isCorrect);

    await recordQuestionAttempt({
      questionId: currentQuestion.id,
      lessonId: currentQuestion.lessonId,
      topicId: currentQuestion.topicId,
      selectedOptionIndex: selectedOption,
      isCorrect: correct,
      isReAttempt: currentAttempts.length > 0,
    });

    setSubmitted(true);
    setIsSubmitting(false);

    if (correct) {
      try {
        confetti({
          particleCount: hadPreviousFail ? 70 : 40,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {
        // Safe if canvas unavailable
      }
    }
  };

  const handleNextQuestion = () => {
    const currentIndex = filteredQuestions.findIndex(q => q.id === currentQuestion?.id);
    const nextQuestion = filteredQuestions[currentIndex + 1] || filteredQuestions[0];
    if (nextQuestion) {
      setCurrentQuestionId(nextQuestion.id);
      setSelectedOption(null);
      setSubmitted(false);
      setServerCheckResult(null);
    }
  };

  const handleLoadSimilarQuestion = (similarId: string) => {
    setCurrentQuestionId(similarId);
    setSelectedOption(null);
    setSubmitted(false);
    setServerCheckResult(null);
  };

  const handleResetCurrent = () => {
    setSelectedOption(null);
    setSubmitted(false);
    setServerCheckResult(null);
  };

  const letters = ['A', 'B', 'C', 'D'];

  const getDifficultyLabel = (diff: QuestionDifficulty) => {
    switch (diff) {
      case 'nhan_biet': return { text: 'Nhận biết', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'thong_hieu': return { text: 'Thông hiểu', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'van_dung': return { text: 'Vận dụng', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'van_dung_cao': return { text: 'Vận dụng cao', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header filter controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Luyện tập thông minh theo chuyên đề
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chấm điểm sau khi nộp. Sai câu nào sẽ được chỉ rõ bài lý thuyết cần đọc và gợi ý làm câu tương tự.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full [&>select]:max-w-full [&>select]:min-w-0 [&>select]:truncate">
          <select
            value={selectedTopicId}
            onChange={(e) => {
              setSelectedTopicId(e.target.value);
              setSelectedOption(null);
              setSubmitted(false);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Tất cả chuyên đề</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value);
              setSelectedOption(null);
              setSubmitted(false);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Mọi mức độ</option>
            <option value="nhan_biet">Nhận biết</option>
            <option value="thong_hieu">Thông hiểu</option>
            <option value="van_dung">Vận dụng</option>
            <option value="van_dung_cao">Vận dụng cao</option>
          </select>
        </div>
      </div>

      {/* Main Question Card */}
      {currentQuestion ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Question Meta top row */}
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
                {currentQuestion.code}
              </span>
              {(() => {
                const badge = getDifficultyLabel(currentQuestion.difficulty);
                return (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.text}
                  </span>
                );
              })()}
              <span className="text-[13px] text-slate-400 hidden sm:inline">
                Liên kết: <strong className="text-slate-600 font-mono">{currentQuestion.lessonCode}</strong>
              </span>
            </div>

            {/* Previous attempt counter */}
            <div className="flex items-center gap-2">
              {currentAttempts.length > 0 && (
                <span className="text-xs text-slate-500">
                  Đã làm: <strong>{currentAttempts.length} lần</strong>
                  {currentAttempts.some(a => a.isCorrect) ? (
                    <span className="ml-1 text-emerald-600 font-bold">(Đã có lần đúng)</span>
                  ) : (
                    <span className="ml-1 text-rose-500 font-bold">(Chưa vượt qua)</span>
                  )}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[12.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                MẪU – CẦN GIÁO VIÊN KIỂM DUYỆT
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Question Prompt */}
            <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed bg-slate-50/40 p-4 sm:p-6 rounded-2xl border border-slate-100">
              <MathRenderer content={currentQuestion.prompt} />
            </div>

            {/* 4 Choices */}
            <div className="space-y-3">
              {currentQuestion.options.map((optText, index) => {
                const letter = letters[index];
                const isSelected = selectedOption === index;
                const isCorrectOption = serverCheckResult
                  ? index === serverCheckResult.correctOptionIndex
                  : (typeof currentQuestion.correctOptionIndex === 'number' && index === currentQuestion.correctOptionIndex);

                let stateClasses = 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/20';

                if (submitted) {
                  if (isCorrectOption) {
                    stateClasses = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrectOption) {
                    stateClasses = 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20';
                  } else {
                    stateClasses = 'border-slate-200 opacity-60';
                  }
                } else if (isSelected) {
                  stateClasses = 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20';
                }

                return (
                  <button
                    key={index}
                    disabled={submitted}
                    onClick={() => setSelectedOption(index)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${stateClasses}`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-sm transition-all ${
                        submitted && isCorrectOption
                          ? 'bg-emerald-600 text-white'
                          : submitted && isSelected && !isCorrectOption
                          ? 'bg-rose-600 text-white'
                          : isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {letter}
                    </span>

                    <div className="text-sm sm:text-base font-medium flex-1 pt-1 overflow-x-auto">
                      <MathRenderer content={optText} inline />
                    </div>

                    {submitted && (
                      <div className="shrink-0 pt-1">
                        {isCorrectOption ? (
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

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {submitted ? (
                  isCorrect ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Chính xác! Bạn đã nắm chắc kiến thức câu này.
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Chưa chính xác. Hãy xem phân tích lỗi và bài lý thuyết bên dưới!
                    </span>
                  )
                ) : (
                  <span>Hãy chọn một phương án rồi bấm <strong>Nộp câu trả lời</strong> để chấm.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!submitted ? (
                  <button
                    disabled={selectedOption === null || isSubmitting}
                    onClick={handleSubmitAnswer}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
                      selectedOption !== null && !isSubmitting
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer hover:scale-[1.02]'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'Đang chấm...' : 'Nộp câu trả lời'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleResetCurrent}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Làm lại câu này
                    </button>
                    <button
                      onClick={handleNextQuestion}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                    >
                      <span>Câu tiếp theo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* AFTER SUBMISSION: INTELLIGENT FEEDBACK & LESSON LINK */}
            {submitted && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* 1. IF WRONG: BIG REMEDIATION BOX */}
                {!isCorrect && (
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50/80 via-amber-50/50 to-orange-50/60 border-2 border-rose-300 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <span>Định hướng khắc phục lỗ hổng kiến thức</span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                      <p>
                        <strong>Kiến thức tiên quyết cần xem lại:</strong>{' '}
                        <span className="text-blue-900 font-semibold">{currentQuestion.prerequisiteKnowledge}</span>
                      </p>
                      <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 text-amber-900">
                        <span className="font-bold flex items-center gap-1.5 text-xs text-amber-800 mb-1">
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          Gợi ý tư duy khi làm sai:
                        </span>
                        <MathRenderer content={currentQuestion.hintOnWrong} />
                      </div>
                    </div>

                    {/* CALL-TO-ACTION BUTTONS (Crucial requirement from prompt) */}
                    <div className="pt-2 flex flex-wrap gap-3">
                      {relatedLesson && (
                        <button
                          onClick={() => onOpenLesson(relatedLesson.id)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>👉 Mở bài lý thuyết cần ôn: {relatedLesson.lessonCode}</span>
                        </button>
                      )}

                      {similarQuestions.length > 0 && (
                        <button
                          onClick={() => handleLoadSimilarQuestion(similarQuestions[0].id)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02]"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-900" />
                          <span>Luyện câu hỏi tương tự ngay</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. DETAILED STEP-BY-STEP VERIFIED SOLUTION */}
                {serverCheckResult && (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Lời giải chi tiết chuẩn xác (Máy chủ cung cấp)
                      </h4>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Đáp án đúng: {letters[serverCheckResult.correctOptionIndex]}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed overflow-x-auto space-y-2">
                      <MathRenderer content={serverCheckResult.explanation || currentQuestion.hintOnWrong} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-sm">
          Không có câu hỏi nào thỏa mãn bộ lọc đã chọn. Hãy chọn lại chuyên đề hoặc mức độ.
        </div>
      )}
    </div>
  );
};

export default TopicPractice;
