import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  BookOpen, 
  Users, 
  Target,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import MathRenderer from './MathRenderer';

interface ProgressReportProps {
  onOpenLesson: (lessonId: string) => void;
  onOpenPractice: (topicId: string) => void;
}

export const ProgressReport: React.FC<ProgressReportProps> = ({ onOpenLesson, onOpenPractice }) => {
  const { topics, lessons, questions, attempts, examResults, getLessonById } = useData();
  const { profile, isTeacher } = useAuth();

  const studentId = profile?.uid || 'guest-student';

  // Student specific stats
  const studentAttempts = useMemo(() => {
    return attempts.filter(a => a.studentId === studentId);
  }, [attempts, studentId]);

  // Overall student mastery by topic
  const topicStats = useMemo(() => {
    return topics.map(topic => {
      const topicQuestions = questions.filter(q => q.topicId === topic.id);
      const questionIds = new Set(topicQuestions.map(q => q.id));

      const relevantAttempts = studentAttempts.filter(a => questionIds.has(a.questionId));
      const totalAttempts = relevantAttempts.length;
      const correctAttempts = relevantAttempts.filter(a => a.isCorrect).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // Unique questions mastered (at least 1 correct attempt)
      const masteredQuestionIds = new Set(relevantAttempts.filter(a => a.isCorrect).map(a => a.questionId));
      const completionRate = topicQuestions.length > 0 
        ? Math.round((masteredQuestionIds.size / topicQuestions.length) * 100) 
        : 0;

      return {
        topic,
        totalQuestions: topicQuestions.length,
        masteredCount: masteredQuestionIds.size,
        accuracy,
        completionRate,
      };
    });
  }, [topics, questions, studentAttempts]);

  // TEACHER VIEW: Aggregate data across all students to identify weak topics & hardest questions
  const teacherAnalytics = useMemo(() => {
    if (!isTeacher) return null;

    // Failure rate per question
    const questionFails = new Map<string, { total: number; fails: number }>();
    attempts.forEach(att => {
      const current = questionFails.get(att.questionId) || { total: 0, fails: 0 };
      current.total += 1;
      if (!att.isCorrect) current.fails += 1;
      questionFails.set(att.questionId, current);
    });

    const hardestQuestions = Array.from(questionFails.entries())
      .map(([qId, stat]) => {
        const q = questions.find(item => item.id === qId);
        const failRate = stat.total > 0 ? Math.round((stat.fails / stat.total) * 100) : 0;
        return {
          question: q,
          total: stat.total,
          fails: stat.fails,
          failRate,
        };
      })
      .filter(item => item.question !== undefined && item.total > 0)
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, 5);

    return {
      totalStudentAttempts: attempts.length,
      totalExamsTaken: examResults.length,
      averageExamScore: examResults.length > 0 
        ? (examResults.reduce((sum, r) => sum + r.score, 0) / examResults.length).toFixed(1)
        : '0.0',
      hardestQuestions,
    };
  }, [isTeacher, attempts, examResults, questions]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {isTeacher ? 'Báo cáo học tập lớp & lỗ hổng kiến thức' : 'Tiến độ học tập & năng lực Toán'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isTeacher 
              ? 'Phân tích điểm yếu của học sinh theo từng chuyên đề để giáo viên có kế hoạch bổ trợ kiến thức kịp thời.'
              : 'Theo dõi mức độ hoàn thành chuyên đề, tỉ lệ trả lời đúng và kết quả thi thử.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            {isTeacher ? 'Chế độ Thống kê Giáo viên' : `Học sinh: ${profile?.displayName}`}
          </span>
        </div>
      </div>

      {/* STUDENT PROGRESS VIEW */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          Tiến độ nắm vững theo từng chuyên đề
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {topicStats.map(stat => (
            <div
              key={stat.topic.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    Chuyên đề {stat.topic.order}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                    {stat.topic.title}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-blue-600">{stat.completionRate}%</div>
                  <span className="text-[10px] text-slate-400">hoàn thành</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stat.completionRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Đã làm đúng: {stat.masteredCount}/{stat.totalQuestions} câu</span>
                  <span>Độ chính xác: <strong>{stat.accuracy}%</strong></span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {stat.totalQuestions} câu hỏi đã thẩm định
                </span>
                <button
                  onClick={() => onOpenPractice(stat.topic.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Luyện tập chuyên đề này
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TEACHER ANALYTICS & WEAK AREAS (Visible when Teacher is active) */}
      {isTeacher && teacherAnalytics && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold">
                Báo cáo Chẩn đoán Dành riêng cho Giáo viên
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Các nội dung & câu hỏi học sinh có tỉ lệ làm sai cao nhất
              </h3>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-xs text-slate-500">Tổng lượt làm bài ghi nhận:</span>
              <div className="text-xl font-black text-slate-900">{teacherAnalytics.totalStudentAttempts} lượt</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500">Tổng số lượt làm bài</div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {teacherAnalytics.totalStudentAttempts}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500">Số bài thi thử đã nộp</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {teacherAnalytics.totalExamsTaken}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500">Điểm thi thử trung bình</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {teacherAnalytics.averageExamScore} / 10
              </div>
            </div>
          </div>

          {/* Table of Hardest Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Top các câu hỏi học sinh vấp phải bẫy nhiều nhất (Cần giảng kỹ trên lớp):
            </h4>

            {teacherAnalytics.hardestQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có đủ dữ liệu bài làm để tổng hợp lỗ hổng.</p>
            ) : (
              <div className="space-y-3">
                {teacherAnalytics.hardestQuestions.map(({ question, total, fails, failRate }) => {
                  if (!question) return null;
                  const lesson = getLessonById(question.lessonId);
                  return (
                    <div
                      key={question.id}
                      className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                            {question.code}
                          </span>
                          <span className="text-xs text-slate-600">
                            Bài học: <strong>{lesson?.title || question.lessonCode}</strong>
                          </span>
                        </div>
                        <div className="text-xs text-slate-800 line-clamp-2">
                          <MathRenderer content={question.prompt} inline />
                        </div>
                        <div className="text-[11px] text-rose-700">
                          <strong>Bẫy học sinh hay mắc:</strong> {question.hintOnWrong}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-black text-rose-600">{failRate}% sai</div>
                          <span className="text-[11px] text-slate-400">({fails}/{total} lượt sai)</span>
                        </div>
                        <button
                          onClick={() => onOpenLesson(question.lessonId)}
                          className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all"
                        >
                          Xem bài giảng
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressReport;
