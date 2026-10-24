import React, { useState, useMemo } from 'react';
import { 
  Award, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  Search, 
  ChevronRight, 
  ShieldCheck, 
  BookOpen,
  Filter,
  BarChart3,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ExamResult, Question } from '../types';
import MathRenderer from './MathRenderer';

interface StudentExamHistoryProps {
  onOpenLesson: (lessonId: string) => void;
  onNavigateToExam: () => void;
}

export const StudentExamHistory: React.FC<StudentExamHistoryProps> = ({ 
  onOpenLesson,
  onNavigateToExam 
}) => {
  const { examResults, questions, exams, getLessonById } = useData();
  const { profile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  const studentId = profile?.uid || 'guest-student';
  const studentEmail = profile?.email || '';

  // Filter only this student's exam results
  const myResults = useMemo(() => {
    return examResults.filter(
      r => r.studentId === studentId || (studentEmail && r.studentEmail === studentEmail)
    ).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [examResults, studentId, studentEmail]);

  // Statistics
  const totalExamsTaken = myResults.length;
  const bestScore = totalExamsTaken > 0 ? Math.max(...myResults.map(r => r.score)) : 0;
  const averageScore = totalExamsTaken > 0 
    ? (myResults.reduce((sum, r) => sum + r.score, 0) / totalExamsTaken).toFixed(1) 
    : '0.0';
  const totalCorrectQuestions = myResults.reduce((sum, r) => sum + r.correctCount, 0);
  const totalQuestionsDone = myResults.reduce((sum, r) => sum + r.totalCount, 0);
  const overallAccuracy = totalQuestionsDone > 0 
    ? Math.round((totalCorrectQuestions / totalQuestionsDone) * 100) 
    : 0;

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return myResults;
    const q = searchQuery.toLowerCase();
    return myResults.filter(r => 
      r.examTitle.toLowerCase().includes(q) || 
      r.examId.toLowerCase().includes(q)
    );
  }, [myResults, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Kết quả thi & lịch sử làm bài</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bảng điểm chính thức được máy chủ THPT MATH 360 bảo mật và xác thực độc lập.
          </p>
        </div>

        <button
          onClick={onNavigateToExam}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Vào phòng thi thử mới</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Số đề đã thi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalExamsTaken}</div>
          <span className="text-[11px] text-slate-400">lượt làm bài</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Điểm cao nhất</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{bestScore} <span className="text-xs text-slate-400 font-normal">/ 10</span></div>
          <span className="text-[11px] text-emerald-600 font-medium">Thành tích tốt nhất</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Điểm trung bình</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">{averageScore} <span className="text-xs text-slate-400 font-normal">/ 10</span></div>
          <span className="text-[11px] text-slate-400">trên tất cả đề thi</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Độ chính xác</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{overallAccuracy}%</div>
          <span className="text-[11px] text-slate-400">{totalCorrectQuestions}/{totalQuestionsDone} câu đúng</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên đề thi..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <strong>{filteredResults.length}</strong> kết quả
        </div>
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có kết quả làm bài nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Bạn chưa hoàn thành bài thi thử nào trên hệ thống. Hãy vào phòng luyện đề để kiểm tra năng lực và nhận phân tích chi tiết.
          </p>
          <button
            onClick={onNavigateToExam}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <span>Bắt đầu thi thử ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => {
            const isGood = result.score >= 8;
            const isAverage = result.score >= 5 && result.score < 8;
            const scoreBadgeColor = isGood 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
              : isAverage 
                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                : 'bg-rose-100 text-rose-800 border-rose-200';

            return (
              <div
                key={result.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {result.examId}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      {result.verificationStatus === 'server_verified' ? 'Xác thực máy chủ' : 'Bản nháp dự phòng'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(result.completedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {result.examTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Số câu đúng: <strong className="text-slate-800">{result.correctCount}/{result.totalCount}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Thời gian: <strong className="text-slate-800">{Math.round(result.timeSpentSeconds / 60)} phút</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className={`inline-block px-3 py-1 rounded-xl text-lg font-black border ${scoreBadgeColor}`}>
                      {result.score} <span className="text-xs font-semibold">/ 10</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {isGood ? 'Xếp loại: Giỏi' : isAverage ? 'Xếp loại: Khá' : 'Cần cố gắng'}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedResult(result)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Xem bài làm</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Answer Review Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[11px] font-bold">
                    {selectedResult.examId}
                  </span>
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đã xác thực máy chủ
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedResult.examTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Score Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Điểm số chính thức:</p>
                <div className="text-2xl font-black text-blue-700">
                  {selectedResult.score} <span className="text-sm font-normal text-slate-500">/ 10 điểm</span>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <div>Số câu đúng: <strong className="text-emerald-700">{selectedResult.correctCount} / {selectedResult.totalCount}</strong></div>
                <div className="text-slate-500">Thời gian làm: <strong>{Math.round(selectedResult.timeSpentSeconds / 60)} phút</strong></div>
              </div>
            </div>

            {/* Answer List */}
            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chi tiết phương án lựa chọn và đáp án đúng:
              </h4>

              <div className="space-y-4">
                {Object.entries(selectedResult.userAnswers || {}).map(([qId, selectedIdx], index) => {
                  const targetQ = questions.find(q => q.id === qId);
                  const isCorrect = typeof targetQ?.correctOptionIndex === 'number' 
                    ? targetQ.correctOptionIndex === selectedIdx 
                    : true;
                  const letters = ['A', 'B', 'C', 'D'];
                  const lesson = targetQ ? getLessonById(targetQ.lessonId) : null;

                  return (
                    <div 
                      key={qId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCorrect 
                          ? 'border-emerald-200 bg-emerald-50/20' 
                          : 'border-rose-200 bg-rose-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {targetQ?.code || qId}
                          </span>
                          {lesson && (
                            <span className="text-[11px] text-slate-500">
                              [{lesson.lessonCode}] {lesson.title}
                            </span>
                          )}
                        </div>

                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCorrect ? 'Đúng' : 'Sai'}
                        </span>
                      </div>

                      {/* Question prompt */}
                      {targetQ && (
                        <div className="mt-2 text-xs text-slate-800">
                          <MathRenderer content={targetQ.prompt} />
                        </div>
                      )}

                      {/* User's Choice vs Correct Answer */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Phương án bạn chọn:</span>
                          <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                            isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                          }`}>
                            {letters[selectedIdx] ?? 'Chưa chọn'}
                          </span>
                        </div>

                        {targetQ && typeof targetQ.correctOptionIndex === 'number' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">Đáp án chuẩn:</span>
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {letters[targetQ.correctOptionIndex]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Explanation if wrong or reviewable */}
                      {targetQ?.explanation && (
                        <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-1">
                          <span className="font-bold text-slate-900 block">Lời giải chi tiết:</span>
                          <MathRenderer content={targetQ.explanation} />
                        </div>
                      )}

                      {/* Direct Link to Lesson if Incorrect */}
                      {!isCorrect && targetQ?.lessonId && (
                        <div className="mt-3 pt-2 border-t border-rose-100 flex items-center justify-between">
                          <span className="text-[11px] text-rose-600 font-medium">
                            {targetQ.hintOnWrong ? `Bẫy: ${targetQ.hintOnWrong}` : 'Ôn lại lý thuyết để củng cố dạng này'}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedResult(null);
                              onOpenLesson(targetQ.lessonId);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Đọc bài giảng
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamHistory;
