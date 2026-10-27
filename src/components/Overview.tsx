import { StatusBadge, toDocStatus } from './StatusBadge';
import MathRenderer from './MathRenderer';
import React from 'react';
import { 
  BookOpen, 
  Target, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  Compass, 
  Award,
  Sparkles,
  TrendingUp,
  BrainCircuit,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { NavTab } from '../config/navigation';

interface OverviewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenTopicPractice: (topicId: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ 
  onNavigate, 
  onOpenLesson,
  onOpenTopicPractice 
}) => {
  const { profile, isTeacher } = useAuth();
  const { topics, lessons, questions, attempts, exams } = useData();

  const studentId = profile?.uid || 'guest-student';
  const myAttempts = attempts.filter(a => a.studentId === studentId);
  const totalSolved = myAttempts.length;
  const correctCount = myAttempts.filter(a => a.isCorrect).length;
  const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;
  
  const unresolvedMistakes = myAttempts.filter(a => !a.isCorrect && !a.resolvedAfterReview);
  const uniqueMistakes = new Set(unresolvedMistakes.map(a => a.questionId)).size;

  const currentTopic = topics[0]; // Ứng dụng đạo hàm
  const topicLessons = lessons.filter(l => l.topicId === currentTopic?.id);

  return (
    <div className="space-y-8 pb-12">
      {/* Đầu trang: lời chào và hai việc chính */}
      <section className="relative overflow-hidden rounded-2xl bg-blue-900 paper-grid-dark text-white px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative max-w-3xl">
          <p className="text-sm text-blue-200">Hệ thống hỗ trợ ôn tập và thi thử môn Toán THPT</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold leading-[1.15]">
            Chào {profile?.displayName || 'bạn'}, hôm nay ôn phần nào?
          </h2>
          <p className="mt-3 text-base text-blue-100 leading-relaxed max-w-2xl">
            Câu nào làm sai sẽ được dẫn về đúng bài lý thuyết, kèm câu hỏi củng cố để làm lại ngay.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('student_practice')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white hover:bg-blue-50 text-blue-900 font-semibold text-sm transition-colors"
            >
              <Target className="w-4 h-4" aria-hidden="true" />
              Làm bài luyện tập
            </button>

            <button
              onClick={() => onNavigate('student_lessons')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-white font-medium text-sm border border-white/30 hover:bg-white/10 transition-colors"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              Xem bài học
            </button>
          </div>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Số câu đã làm</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalSolved}</span>
            <span className="text-xs text-slate-500">lượt</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Tích lũy qua các buổi học</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tỉ lệ chính xác</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{accuracy}%</span>
            <span className="text-xs text-emerald-700 font-medium">({correctCount}/{totalSolved})</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Độ chuẩn xác câu trả lời</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sổ tay lỗi sai</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">{uniqueMistakes}</span>
            <span className="text-xs text-rose-600 font-medium">câu cần ôn</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Trọng tâm cần khắc phục</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Học liệu chuẩn hóa</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{lessons.length}</span>
            <span className="text-xs text-slate-500">bài lý thuyết</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{questions.length} câu hỏi có giải chi tiết</p>
        </div>
      </div>

      {/* Core Workflow Pillars */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tính năng cốt lõi</h2>
            <p className="text-xs text-slate-500">Quy trình học tập khép kín giúp nâng điểm rõ rệt</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div 
            onClick={() => onNavigate('student_practice')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
              Luyện tập chuyên đề
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Làm từng câu theo từng mức độ: Nhận biết, Thông hiểu, Vận dụng. Chấm điểm sau khi nộp, giải thích cặn kẽ vì sao đúng hoặc sai.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600">
              Vào luyện tập →
            </div>
          </div>

          {/* Card 2 */}
          <div 
            onClick={() => onNavigate('student_mistakes')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-rose-300 transition-all relative overflow-hidden"
          >
            {uniqueMistakes > 0 && (
              <span className="absolute top-4 right-4 bg-rose-500 text-white text-[13px] font-bold px-2 py-0.5 rounded-full">
                {uniqueMistakes} câu chờ ôn
              </span>
            )}
            <div className="w-12 h-12 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors flex items-center justify-between">
              Sổ tay lỗi sai & Ôn bù
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Tự động lưu mọi câu làm sai. Dẫn trực tiếp đến bài lý thuyết liên quan để đọc lại công thức rồi cho làm câu tương tự củng cố.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-rose-600">
              Mở sổ tay lỗi sai →
            </div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => onNavigate('student_practice')}
            className="group cursor-pointer bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
              Phòng thi thử trực tuyến
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Luyện đề bấm giờ chuẩn theo cấu trúc THPT. Bảng điều hướng câu hỏi trực quan, nộp bài nhận điểm và bảng phân tích ngay tức thì.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600">
              Chọn đề thi ngay →
            </div>
          </div>
        </div>
      </div>

      {/* Featured Topic: Ứng dụng đạo hàm để khảo sát đồ thị */}
      {currentTopic && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                  Chuyên đề trọng tâm lớp 12
                </span>
                <StatusBadge status="pending" audience={isTeacher ? 'teacher' : 'student'} label={isTeacher ? 'Nội dung mẫu, chờ duyệt' : 'Nội dung mẫu, chờ giáo viên duyệt'} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                {currentTopic.title}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                <MathRenderer content={currentTopic.description} inline />
              </p>
            </div>

            <button
              onClick={() => onOpenTopicPractice(currentTopic.id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0"
            >
              <Target className="w-4 h-4" />
              Luyện đề chuyên đề này
            </button>
          </div>

          {/* Lessons list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {topicLessons.map(lesson => (
              <div
                key={lesson.id}
                onClick={() => onOpenLesson(lesson.id)}
                className="group cursor-pointer p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-start justify-between"
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {lesson.lessonCode}
                    </span>
                    <span className="text-[13px] text-slate-400">
                      {lesson.formulas.length} công thức • {lesson.commonMistakes.length} bẫy sai
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    <MathRenderer content={lesson.title} inline />
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    <MathRenderer content={lesson.objectives[0] || ''} inline />
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
