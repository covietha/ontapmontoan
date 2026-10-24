import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  BookOpen, 
  ArrowRight, 
  Search, 
  Filter, 
  Sparkles,
  Award,
  Clock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import MathRenderer from './MathRenderer';
import { Question } from '../types';

interface MistakeNotebookProps {
  onPracticeQuestion: (questionId: string) => void;
  onOpenLesson: (lessonId: string) => void;
}

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({
  onPracticeQuestion,
  onOpenLesson,
}) => {
  const { profile } = useAuth();
  const { attempts, questions, lessons, topics, getLessonById } = useData();

  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const studentId = profile?.uid || 'guest-student';

  // Group attempts by question
  const mistakeItems = useMemo(() => {
    const studentAttempts = attempts.filter(a => a.studentId === studentId);
    
    // Find questions that have had at least one wrong attempt
    const questionsWithFails = new Map<string, {
      question: Question;
      totalAttempts: number;
      wrongAttempts: number;
      isResolved: boolean;
      lastAttemptTime: string;
      lessonTitle: string;
      lessonCode: string;
      lessonId: string;
    }>();

    studentAttempts.forEach(att => {
      const q = questions.find(item => item.id === att.questionId);
      if (!q) return;

      const existing = questionsWithFails.get(q.id);
      const isWrong = !att.isCorrect;

      if (!existing) {
        if (isWrong) {
          const les = getLessonById(q.lessonId) || getLessonById(q.lessonCode);
          questionsWithFails.set(q.id, {
            question: q,
            totalAttempts: 1,
            wrongAttempts: 1,
            isResolved: att.resolvedAfterReview || false,
            lastAttemptTime: att.timestamp,
            lessonTitle: les?.title || q.lessonCode,
            lessonCode: q.lessonCode,
            lessonId: q.lessonId,
          });
        }
      } else {
        existing.totalAttempts += 1;
        if (isWrong) existing.wrongAttempts += 1;
        if (att.isCorrect) existing.isResolved = true;
        if (new Date(att.timestamp) > new Date(existing.lastAttemptTime)) {
          existing.lastAttemptTime = att.timestamp;
        }
      }
    });

    return Array.from(questionsWithFails.values());
  }, [attempts, questions, studentId, getLessonById]);

  // Filtered list
  const filteredMistakes = useMemo(() => {
    return mistakeItems.filter(item => {
      const matchTopic = filterTopic === 'all' || item.question.topicId === filterTopic;
      const matchStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'unresolved' && !item.isResolved) ||
        (filterStatus === 'resolved' && item.isResolved);
      const matchSearch = 
        searchQuery.trim() === '' ||
        item.question.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.question.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lessonCode.toLowerCase().includes(searchQuery.toLowerCase());

      return matchTopic && matchStatus && matchSearch;
    });
  }, [mistakeItems, filterTopic, filterStatus, searchQuery]);

  const unresolvedCount = mistakeItems.filter(i => !i.isResolved).length;
  const resolvedCount = mistakeItems.filter(i => i.isResolved).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Sổ tay lỗi sai & định hướng khắc phục</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mỗi câu làm sai là một cơ hội để phát hiện lỗ hổng kiến thức. Hãy mở bài lý thuyết tương ứng và luyện lại đến khi nắm vững.
          </p>
        </div>

        {/* Stats badge */}
        <div className="flex items-center gap-3">
          <div className="bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl text-center">
            <div className="text-xs text-rose-600 font-semibold">Chưa sửa</div>
            <div className="text-lg font-black text-rose-700">{unresolvedCount}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
            <div className="text-xs text-emerald-600 font-semibold">Đã khắc phục</div>
            <div className="text-lg font-black text-emerald-700">{resolvedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tất cả ({mistakeItems.length})
            </button>
            <button
              onClick={() => setFilterStatus('unresolved')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterStatus === 'unresolved' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Cần ôn ({unresolvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterStatus === 'resolved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Đã vượt qua ({resolvedCount})
            </button>
          </div>

          {/* Topic filter */}
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả chuyên đề</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã câu, nội dung..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Mistakes List */}
      {filteredMistakes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {mistakeItems.length === 0
              ? 'Tuyệt vời! Bạn chưa có câu hỏi nào bị làm sai.'
              : 'Không có câu hỏi nào khớp với bộ lọc.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Khi bạn làm bài tập hoặc thi thử và chọn chưa đúng đáp án, hệ thống sẽ tự động tổng hợp vào sổ tay này cùng chỉ dẫn ôn tập chi tiết.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map(item => (
            <div
              key={item.question.id}
              className={`p-6 rounded-2xl bg-white border-2 transition-all space-y-4 ${
                item.isResolved
                  ? 'border-emerald-200/80 hover:border-emerald-300'
                  : 'border-rose-200/80 hover:border-rose-300 shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-slate-900 text-white">
                    {item.question.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Bài: <strong className="text-slate-700">{item.lessonCode}</strong> – {item.lessonTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Đã thử {item.totalAttempts} lần ({item.wrongAttempts} lần sai)
                  </span>
                  {item.isResolved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã khắc phục
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Cần ôn lại
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm font-semibold text-slate-800 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <MathRenderer content={item.question.prompt} />
              </div>

              {/* Diagnostic Guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-900">
                  <span className="font-bold block mb-1">💡 Gợi ý tư duy khi làm sai:</span>
                  <MathRenderer content={item.question.hintOnWrong} />
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-900">
                  <span className="font-bold block mb-1">📚 Kiến thức liên quan cần xem:</span>
                  <span>{item.question.prerequisiteKnowledge}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => onOpenLesson(item.lessonId)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Mở bài lý thuyết: {item.lessonCode}</span>
                </button>

                <button
                  onClick={() => onPracticeQuestion(item.question.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại câu này ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MistakeNotebook;
