import React, { useState } from 'react';
import { 
  FileText, Plus, Search, Filter, CheckCircle2, XCircle, Trash2, 
  RotateCcw, AlertTriangle, Eye, Edit3, Upload, HelpCircle, ShieldAlert,
  ChevronDown, BookOpen, Layers
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionApprovalStatus, QuestionDifficulty } from '../types';
import { MathRenderer } from './MathRenderer';
import { DocxQuestionImporter } from './DocxQuestionImporter';

export const QuestionBankManager: React.FC = () => {
  const { profile, isTeacher, isRootAdmin } = useAuth();
  const { 
    questions, topics, lessons, 
    approveQuestion, rejectQuestion, moveToTrashQuestion, 
    restoreQuestion, deleteQuestionPermanently, addQuestion, updateQuestion
  } = useData();

  // Active Tab: pending | approved | rejected | trash
  const [activeTab, setActiveTab] = useState<QuestionApprovalStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  // Modals
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [rejectingQuestionId, setRejectingQuestionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state for manual create
  const [manualForm, setManualForm] = useState<{
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    difficulty: QuestionDifficulty;
    grade: 10 | 11 | 12;
    lessonCode: string;
  }>({
    prompt: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    difficulty: 'thong_hieu',
    grade: 12,
    lessonCode: 'BD-01'
  });

  // Calculate counts for badges
  const counts = {
    pending: questions.filter(q => (q.approvalStatus || 'approved') === 'pending').length,
    approved: questions.filter(q => (q.approvalStatus || 'approved') === 'approved').length,
    rejected: questions.filter(q => q.approvalStatus === 'rejected').length,
    trash: questions.filter(q => q.approvalStatus === 'trash').length,
  };

  // Filtered list
  const filteredQuestions = questions.filter(q => {
    const status = q.approvalStatus || 'approved';
    if (status !== activeTab) return false;

    if (selectedGrade !== 'all' && (q.grade || 12) !== selectedGrade) {
      return false;
    }

    if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) {
      return false;
    }

    if (selectedTopic !== 'all') {
      // Find lesson and topic
      const lesson = lessons.find(l => l.lessonCode === q.lessonCode);
      if (!lesson || lesson.topicId !== selectedTopic) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const qText = searchQuery.toLowerCase();
      const matchPrompt = q.prompt.toLowerCase().includes(qText);
      const matchOptions = q.options.some(opt => opt.toLowerCase().includes(qText));
      const matchCode = q.id.toLowerCase().includes(qText) || q.lessonCode.toLowerCase().includes(qText);
      if (!matchPrompt && !matchOptions && !matchCode) return false;
    }

    return true;
  });

  const notify = (type: 'success' | 'error', message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // Approval actions
  const handleApprove = async (id: string) => {
    await approveQuestion(id);
    notify('success', 'Đã phê duyệt câu hỏi thành công. Câu hỏi đã sẵn sàng để đưa vào đề thi.');
  };

  const handleOpenReject = (id: string) => {
    setRejectingQuestionId(id);
    setRejectionReason('Nội dung câu hỏi chưa đạt chuẩn định dạng hoặc sai sót kiến thức.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingQuestionId) return;
    await rejectQuestion(rejectingQuestionId, rejectionReason || 'Từ chối duyệt theo đánh giá chuyên môn.');
    setRejectingQuestionId(null);
    setRejectionReason('');
    notify('success', 'Đã chuyển câu hỏi sang danh sách "Từ chối" kèm lý do phản hồi.');
  };

  const handleMoveToTrash = async (id: string) => {
    await moveToTrashQuestion(id);
    notify('success', 'Đã chuyển câu hỏi vào Thùng rác (xóa mềm).');
  };

  const handleRestore = async (id: string) => {
    await restoreQuestion(id);
    notify('success', 'Đã khôi phục câu hỏi về trạng thái "Chờ duyệt".');
  };

  const handleDeletePermanent = async (id: string) => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn câu hỏi này? Hành động này không thể hoàn tác.')) {
      return;
    }
    const res = await deleteQuestionPermanently(id);
    if (res.success) {
      notify('success', 'Đã xóa vĩnh viễn câu hỏi khỏi cơ sở dữ liệu.');
    } else {
      notify('error', res.error || 'Không thể xóa câu hỏi này.');
    }
  };

  const handleSaveManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.prompt.trim() || manualForm.options.some(o => !o.trim())) {
      notify('error', 'Vui lòng nhập đầy đủ nội dung câu hỏi và 4 phương án.');
      return;
    }

    await addQuestion({
      code: `Q-MAN-${Date.now()}`,
      prompt: manualForm.prompt,
      options: manualForm.options,
      correctOptionIndex: manualForm.correctOptionIndex,
      explanation: manualForm.explanation || 'Lời giải chi tiết đang được cập nhật.',
      lessonCode: manualForm.lessonCode,
      lessonId: 'lesson-01',
      topicId: 'topic-dao-ham',
      questionType: 'mcq',
      difficulty: manualForm.difficulty,
      grade: manualForm.grade,
      hintOnWrong: 'Kiểm tra lại công thức và các bước tính toán.',
      prerequisiteKnowledge: 'Kiến thức trọng tâm chương trình',
      similarQuestionIds: [],
      status: 'verified',
      approvalStatus: 'pending',
      source: 'manual',
      createdAt: new Date().toISOString()
    });

    setShowAddManualModal(false);
    setManualForm({
      prompt: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      explanation: '',
      difficulty: 'thong_hieu',
      grade: 12,
      lessonCode: 'BD-01'
    });
    setActiveTab('pending');
    notify('success', 'Đã thêm câu hỏi mới thành công vào trạng thái "Chờ duyệt".');
  };

  const handleSaveEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    // Enforce approval workflow: editing an approved question reverts it to pending review
    const updated: Question = {
      ...editingQuestion,
      approvalStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await updateQuestion(updated);
    setEditingQuestion(null);
    notify('success', 'Đã cập nhật nội dung câu hỏi. Câu hỏi được đưa về trạng thái "Chờ duyệt" để đảm bảo tính chính xác.');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Ngân hàng câu hỏi & Quy trình kiểm duyệt 4 bước
              </h2>
              <p className="text-xs text-slate-500">
                Kiểm soát chất lượng học liệu theo 4 trạng thái: Chờ duyệt ➔ Đã duyệt ➔ Từ chối ➔ Thùng rác.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowDocxModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Nhập từ Word (.docx)
            </button>
            <button
              onClick={() => setShowAddManualModal(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              Soạn câu hỏi mới
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusNotification && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
            statusNotification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {statusNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{statusNotification.message}</span>
          </div>
        )}
      </div>

      {/* Tabs navigation: 4 states */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Chờ duyệt</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã duyệt (Vào đề thi)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'approved' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {counts.approved}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Từ chối</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'rejected' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
          }`}>
            {counts.rejected}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trash')}
          className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'trash'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Thùng rác</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
            activeTab === 'trash' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {counts.trash}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm nội dung, công thức, mã câu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Grade filter */}
          <div>
            <select
              value={selectedGrade}
              onChange={e => setSelectedGrade(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">Tất cả các khối (10, 11, 12)</option>
              <option value={10}>Khối 10</option>
              <option value={11}>Khối 11</option>
              <option value={12}>Khối 12</option>
            </select>
          </div>

          {/* Difficulty filter */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="nhan_biet">Nhận biết</option>
              <option value="thong_hieu">Thông hiểu</option>
              <option value="van_dung">Vận dụng</option>
              <option value="van_dung_cao">Vận dụng cao</option>
            </select>
          </div>

          {/* Topic filter */}
          <div>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">Tất cả chuyên đề kiến thức</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Tìm thấy <strong className="text-slate-800">{filteredQuestions.length}</strong> câu hỏi phù hợp
          </span>
          {activeTab === 'approved' && (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Chỉ các câu hỏi ở trạng thái này mới được đưa vào đề thi của học sinh.
            </span>
          )}
          {activeTab === 'pending' && (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Giáo viên cần kiểm tra kỹ đề bài, đáp án và lời giải trước khi phê duyệt.
            </span>
          )}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Không có câu hỏi nào trong danh mục này</p>
            <p className="text-xs text-slate-400 mt-1">Hãy thử đổi bộ lọc hoặc thêm câu hỏi mới từ file Word</p>
          </div>
        ) : (
          filteredQuestions.map((q, index) => {
            const lesson = lessons.find(l => l.lessonCode === q.lessonCode);
            const topic = lesson ? topics.find(t => t.id === lesson.topicId) : null;

            return (
              <div 
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                {/* Question meta header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      #{index + 1}
                    </span>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {q.id}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Khối {q.grade || 12}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      q.difficulty === 'nhan_biet' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      q.difficulty === 'thong_hieu' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      q.difficulty === 'van_dung' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {q.difficulty === 'nhan_biet' ? 'Nhận biết' :
                       q.difficulty === 'thong_hieu' ? 'Thông hiểu' :
                       q.difficulty === 'van_dung' ? 'Vận dụng' : 'Vận dụng cao'}
                    </span>
                    {topic && (
                      <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {topic.title}
                      </span>
                    )}
                  </div>

                  {/* Actions for this question */}
                  <div className="flex items-center gap-2">
                    {/* If pending: Approve, Reject, Edit, Trash */}
                    {activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(q.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleOpenReject(q.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Từ chối
                        </button>
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleMoveToTrash(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Bỏ vào thùng rác"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* If approved: Edit (reverts to pending), Trash */}
                    {activeTab === 'approved' && (
                      <>
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                          title="Sửa câu hỏi sẽ chuyển lại trạng thái Chờ duyệt"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => handleMoveToTrash(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Bỏ vào thùng rác"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* If rejected: Edit (reverts to pending), Restore, Trash */}
                    {activeTab === 'rejected' && (
                      <>
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Sửa & Gửi duyệt lại
                        </button>
                        <button
                          onClick={() => handleRestore(q.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Đưa về Chờ duyệt
                        </button>
                        <button
                          onClick={() => handleMoveToTrash(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* If trash: Restore, Delete Permanent */}
                    {activeTab === 'trash' && (
                      <>
                        <button
                          onClick={() => handleRestore(q.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Khôi phục
                        </button>
                        <button
                          onClick={() => handleDeletePermanent(q.id)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xóa vĩnh viễn
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Rejection notice if present */}
                {q.approvalStatus === 'rejected' && q.rejectedReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Lý do từ chối: </span>
                      <span>{q.rejectedReason}</span>
                    </div>
                  </div>
                )}

                {/* Question Prompt */}
                <div className="text-sm font-medium text-slate-900 leading-relaxed">
                  <MathRenderer content={q.prompt} />
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctOptionIndex === optIdx;
                    const letters = ['A', 'B', 'C', 'D'];
                    return (
                      <div 
                        key={optIdx}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          isCorrect 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold' 
                            : 'bg-slate-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {letters[optIdx]}
                        </span>
                        <div className="flex-1 pt-0.5">
                          <MathRenderer content={opt} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-blue-900">Hướng dẫn giải: </span>
                    <MathRenderer content={q.explanation} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Docx Importer Modal */}
      {showDocxModal && (
        <DocxQuestionImporter
          onClose={() => setShowDocxModal(false)}
          onSuccess={() => {
            setShowDocxModal(false);
            setActiveTab('pending');
            notify('success', 'Đã nhập danh sách câu hỏi Word thành công vào trạng thái "Chờ duyệt".');
          }}
        />
      )}

      {/* Reject Modal */}
      {rejectingQuestionId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Lý do từ chối phê duyệt câu hỏi
            </h3>
            <p className="text-xs text-slate-500">
              Vui lòng ghi rõ lý do để giáo viên soạn đề nắm được sai sót và chỉnh sửa lại:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Ví dụ: Sai đáp án câu C, thiếu điều kiện hàm số..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingQuestionId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Soạn câu hỏi mới vào Ngân hàng (Chờ duyệt)
              </h3>
              <button onClick={() => setShowAddManualModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveManualQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khối lớp:</label>
                  <select
                    value={manualForm.grade}
                    onChange={e => setManualForm({ ...manualForm, grade: parseInt(e.target.value, 10) as 10 | 11 | 12 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={10}>Khối 10</option>
                    <option value={11}>Khối 11</option>
                    <option value={12}>Khối 12</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ:</label>
                  <select
                    value={manualForm.difficulty}
                    onChange={e => setManualForm({ ...manualForm, difficulty: e.target.value as QuestionDifficulty })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="nhan_biet">Nhận biết</option>
                    <option value="thong_hieu">Thông hiểu</option>
                    <option value="van_dung">Vận dụng</option>
                    <option value="van_dung_cao">Vận dụng cao</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung câu hỏi (hỗ trợ LaTeX $...$):</label>
                <textarea
                  rows={3}
                  required
                  value={manualForm.prompt}
                  onChange={e => setManualForm({ ...manualForm, prompt: e.target.value })}
                  placeholder="Ví dụ: Tìm tập nghiệm của phương trình $\log_2(x-1) = 3$..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">4 Phương án (Chọn đáp án đúng):</label>
                {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <label className="flex items-center gap-1 font-bold text-slate-700 w-12 shrink-0 cursor-pointer">
                      <input 
                        type="radio"
                        name="manual_correct"
                        checked={manualForm.correctOptionIndex === optIdx}
                        onChange={() => setManualForm({ ...manualForm, correctOptionIndex: optIdx })}
                        className="text-blue-600"
                      />
                      {letter}.
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder={`Nội dung phương án ${letter}...`}
                      value={manualForm.options[optIdx]}
                      onChange={e => {
                        const next = [...manualForm.options];
                        next[optIdx] = e.target.value;
                        setManualForm({ ...manualForm, options: next });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lời giải chi tiết:</label>
                <textarea
                  rows={2}
                  value={manualForm.explanation}
                  onChange={e => setManualForm({ ...manualForm, explanation: e.target.value })}
                  placeholder="Hướng dẫn cách giải chi tiết từng bước..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  Lưu vào Chờ duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  Chỉnh sửa câu hỏi
                </h3>
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  Lưu ý: Lưu chỉnh sửa sẽ tự động chuyển câu hỏi về trạng thái "Chờ duyệt" để đảm bảo tính chính xác.
                </p>
              </div>
              <button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveEditQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Khối lớp:</label>
                  <select
                    value={editingQuestion.grade || 12}
                    onChange={e => setEditingQuestion({ ...editingQuestion, grade: parseInt(e.target.value, 10) as 10 | 11 | 12 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={10}>Khối 10</option>
                    <option value={11}>Khối 11</option>
                    <option value={12}>Khối 12</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ:</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as QuestionDifficulty })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="nhan_biet">Nhận biết</option>
                    <option value="thong_hieu">Thông hiểu</option>
                    <option value="van_dung">Vận dụng</option>
                    <option value="van_dung_cao">Vận dụng cao</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung câu hỏi (LaTeX):</label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.prompt}
                  onChange={e => setEditingQuestion({ ...editingQuestion, prompt: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">4 Phương án (Chọn đáp án đúng):</label>
                {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <label className="flex items-center gap-1 font-bold text-slate-700 w-12 shrink-0 cursor-pointer">
                      <input 
                        type="radio"
                        name="edit_correct"
                        checked={editingQuestion.correctOptionIndex === optIdx}
                        onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionIndex: optIdx })}
                        className="text-blue-600"
                      />
                      {letter}.
                    </label>
                    <input 
                      type="text"
                      required
                      value={editingQuestion.options[optIdx] || ''}
                      onChange={e => {
                        const next = [...editingQuestion.options];
                        next[optIdx] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: next });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lời giải chi tiết:</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation}
                  onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  Lưu & Đưa về Chờ duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
