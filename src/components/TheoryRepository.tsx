import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Target, 
  ChevronRight, 
  Sparkles,
  Layers,
  HelpCircle,
  FileCode2,
  Edit3,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lesson, Topic } from '../types';
import MathRenderer from './MathRenderer';

interface TheoryRepositoryProps {
  initialLessonId?: string | null;
  onStartPracticeQuestion: (questionId: string) => void;
  onStartTopicPractice: (topicId: string) => void;
}

export const TheoryRepository: React.FC<TheoryRepositoryProps> = ({
  initialLessonId,
  onStartPracticeQuestion,
  onStartTopicPractice,
}) => {
  const { topics, lessons, questions } = useData();
  const { isTeacher } = useAuth();

  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [grade, setGrade] = useState<'all' | 10 | 11 | 12>('all');
  const [listOpen, setListOpen] = useState(true);

  const topicGrade = (topicId: string) => topics.find(t => t.id === topicId)?.grade;
  const gradeOf = (l: Lesson) => l.grade ?? topicGrade(l.topicId);
  const visibleTopics = topics.filter(t => grade === 'all' || t.grade === grade);
  const gradeLessons = lessons.filter(l => grade === 'all' || gradeOf(l) === grade);
  const chooseGrade = (g: 'all' | 10 | 11 | 12) => {
    setGrade(g);
    setSelectedTopicId('all');
  };
  
  // Currently opened lesson (default to initialLessonId if provided, or first lesson)
  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    if (initialLessonId) return initialLessonId;
    return lessons[0]?.id || '';
  });

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return gradeLessons.filter(l => {
      const matchTopic = selectedTopicId === 'all' || l.topicId === selectedTopicId;
      const matchSearch = 
        searchQuery.trim() === '' ||
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.lessonCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.theorySummary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTopic && matchSearch;
    });
  }, [gradeLessons, selectedTopicId, searchQuery]);

  const activeLesson = useMemo(() => {
    const chosen = filteredLessons.find(l => l.id === activeLessonId || l.lessonCode === activeLessonId);
    return chosen || filteredLessons[0] || lessons.find(l => l.id === activeLessonId || l.lessonCode === activeLessonId);
  }, [lessons, activeLessonId, filteredLessons]);

  const currentTopic = topics.find(t => t.id === activeLesson?.topicId);

  // Related questions for this lesson
  const relatedQuestions = useMemo(() => {
    if (!activeLesson) return [];
    return questions.filter(
      q => q.lessonId === activeLesson.id || q.lessonCode === activeLesson.lessonCode || activeLesson.relatedPracticeQuestionIds.includes(q.id)
    );
  }, [questions, activeLesson]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Kho lý thuyết & công thức trọng tâm</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp lý thuyết chuẩn theo chương trình Toán THPT, công thức giải nhanh, ví dụ từng bước và các bẫy sai kinh điển.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bài học, công thức, mã bài..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Chọn lớp */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn lớp">
        {([['all', 'Tất cả các lớp'], [10, 'Lớp 10'], [11, 'Lớp 11'], [12, 'Lớp 12']] as const).map(([g, label]) => {
          const n = lessons.filter(l => g === 'all' || gradeOf(l) === g).length;
          return (
            <button
              key={String(g)}
              onClick={() => chooseGrade(g)}
              aria-pressed={grade === g}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                grade === g ? 'bg-blue-950 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label} <span className="font-normal opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {/* Topic selection chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedTopicId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedTopicId === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tất cả chuyên đề ({gradeLessons.length})
        </button>
        {visibleTopics.map(t => {
          const count = gradeLessons.filter(l => l.topicId === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTopicId(t.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTopicId === t.id
                  ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.title} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Split Layout: Lesson sidebar + Lesson Detail */}
      <div className={`grid grid-cols-1 gap-6 items-start ${listOpen ? 'lg:grid-cols-12' : ''}`}>
        {/* Left: Lessons List (4 cols) */}
        <div className={`${listOpen ? 'lg:col-span-4' : 'hidden'} bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-2 max-h-[800px] overflow-y-auto`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">
              Danh sách bài học ({filteredLessons.length})
            </span>
            <button
              onClick={() => setListOpen(false)}
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100"
              aria-label="Thu gọn danh sách bài học"
            >
              <PanelLeftClose className="w-4 h-4" /> Thu gọn
            </button>
          </div>

          {filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {searchQuery.trim() ? 'Không tìm thấy bài học nào phù hợp từ khóa.' : 'Chưa có bài học cho lựa chọn này. Thầy cô sẽ cập nhật sớm.'}
            </div>
          ) : (
            filteredLessons.map(lesson => {
              const isSelected = activeLesson?.id === lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`cursor-pointer p-3.5 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-blue-700 border border-blue-200">
                      {lesson.lessonCode}
                    </span>
                    <span className="text-[12.5px] text-slate-400">
                      {lesson.formulas.length} công thức
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mt-1.5 line-clamp-2">
                    <MathRenderer content={lesson.title} inline />
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-500">
                    <span className="line-clamp-2"><MathRenderer content={lesson.objectives[0] || ''} inline /></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Active Lesson Full View (8 cols) */}
        <div className={`${listOpen ? 'lg:col-span-8' : ''} min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-8`}>
          {!listOpen && (
            <button
              onClick={() => setListOpen(true)}
              className="hidden lg:inline-flex items-center gap-2 text-sm font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
              aria-label="Mở danh sách bài học"
            >
              <PanelLeftOpen className="w-4 h-4" /> Danh sách bài học ({filteredLessons.length})
            </button>
          )}
          {activeLesson ? (
            <>
              {/* Lesson header */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded-md bg-blue-100 text-blue-800">
                    {activeLesson.lessonCode}
                  </span>
                  <span className="text-xs text-slate-500">
                    Chuyên đề: <strong className="text-slate-700">{currentTopic?.title}</strong>
                  </span>
                  {activeLesson.status !== 'verified' && (
                    <span className="px-2 py-0.5 rounded text-[12.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      MẪU – CẦN GIÁO VIÊN KIỂM DUYỆT
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  <MathRenderer content={activeLesson.title} inline />
                </h2>
              </div>

              {/* Objectives */}
              <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 space-y-2">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Mục tiêu cần đạt
                </h4>
                <ul className="space-y-1.5 text-xs text-blue-950">
                  {activeLesson.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span className="min-w-0"><MathRenderer content={obj} inline /></span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Formulas Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Công thức trọng tâm & Phương pháp giải
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {activeLesson.formulas.map((f, i) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all space-y-2"
                    >
                      <div className="text-sm font-semibold text-slate-700"><MathRenderer content={f.name} inline /></div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-100 text-center font-medium overflow-x-auto">
                        <MathRenderer content={`$$${f.latex}$$`} />
                      </div>
                      {f.note && (
                        <p className="text-[13px] text-slate-500 italic">💡 <MathRenderer content={f.note} inline /></p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Theory Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Tóm tắt lý thuyết chi tiết
                </h3>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                  <MathRenderer content={activeLesson.theorySummary} />
                </div>
              </div>

              {/* Step-by-Step Examples */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Ví dụ minh họa có lời giải từng bước
                </h3>
                <div className="space-y-4">
                  {activeLesson.stepByStepExamples.map((ex, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-3">
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-950"><MathRenderer content={ex.title} inline /></h4>
                      <div className="p-3 bg-white rounded-xl border border-emerald-200/60 text-xs sm:text-sm text-slate-800">
                        <MathRenderer content={ex.problem} />
                      </div>
                      <div className="space-y-1.5 pl-2 border-l-2 border-emerald-400">
                        {ex.solutionSteps.map((step, sIdx) => (
                          <div key={sIdx} className="text-xs text-slate-700">
                            <MathRenderer content={step} />
                          </div>
                        ))}
                      </div>
                      {ex.note && (
                        <p className="text-[13px] text-emerald-800 font-medium">⚠️ {ex.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Mistakes (Trọng tâm chống sai bẫy) */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Lỗi sai thường gặp (Bẫy đề thi)
                </h3>
                <div className="space-y-3">
                  {activeLesson.commonMistakes.map((m, i) => (
                    <div key={i} className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                        <span>❌ <MathRenderer content={m.mistakeTitle} inline /></span>
                      </div>
                      <div className="text-xs text-rose-800">
                        <span className="font-semibold">Học sinh hay sai:</span> <MathRenderer content={m.explanation} inline />
                      </div>
                      <div className="text-xs text-emerald-900 bg-white p-2.5 rounded-lg border border-rose-100">
                        <span className="font-bold text-emerald-700">✔️ Cách khắc phục đúng:</span> <MathRenderer content={m.correction} inline />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Practice Questions Direct Action */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Luyện tập củng cố ngay bài này
                  </h4>
                  <p className="text-xs text-slate-500">
                    Có {relatedQuestions.length} câu hỏi liên kết trực tiếp với bài học {activeLesson.lessonCode}
                  </p>
                </div>

                <div className="flex gap-2">
                  {relatedQuestions[0] && (
                    <button
                      onClick={() => onStartPracticeQuestion(relatedQuestions[0].id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                    >
                      <Target className="w-4 h-4" />
                      Luyện câu hỏi bài này
                    </button>
                  )}
                  {currentTopic && (
                    <button
                      onClick={() => onStartTopicPractice(currentTopic.id)}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                    >
                      Luyện cả chuyên đề
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 text-sm">
              Chưa có bài học để hiển thị. Chọn lớp hoặc chuyên đề khác.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheoryRepository;
