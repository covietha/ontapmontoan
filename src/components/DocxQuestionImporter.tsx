import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Trash2, Edit3, 
  HelpCircle, Download, ArrowLeft, RefreshCw, Eye, Sparkles, Filter
} from 'lucide-react';
import { parseDocxFile, ParsedWordQuestion, downloadWordQuestionSampleGuide } from '../utils/fileParsers';
import { useData } from '../context/DataContext';
import { MathRenderer } from './MathRenderer';
import { QuestionDifficulty } from '../types';

interface DocxQuestionImporterProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const DocxQuestionImporter: React.FC<DocxQuestionImporterProps> = ({ onClose, onSuccess }) => {
  const { questions: existingQuestions, importWordQuestions } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedWordQuestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [filterReviewOnly, setFilterReviewOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Set of existing question prompts (normalized) for duplicate checking
  const existingSet = new Set(
    existingQuestions.map(q => q.prompt.trim().toLowerCase().replace(/\s+/g, ' '))
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setParseErrors(['Hệ thống chỉ hỗ trợ định dạng Word .docx hiện đại. Vui lòng lưu lại file sang đuôi .docx']);
      return;
    }

    setLoading(true);
    setFileName(file.name);
    setParseErrors([]);
    setStatusMessage(null);

    try {
      const result = await parseDocxFile(file);
      setParseErrors(result.errors);
      setParsedQuestions(result.questions);
      // Select all valid questions by default
      setSelectedIndices(new Set(result.questions.map((_, idx) => idx)));
    } catch (err: any) {
      setParseErrors([err?.message || 'Có lỗi khi phân tích file Word.']);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedQuestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedQuestions.map((_, idx) => idx)));
    }
  };

  const handleRemoveQuestion = (index: number) => {
    const next = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(next);
    const nextSelected = new Set<number>();
    selectedIndices.forEach(idx => {
      if (idx < index) nextSelected.add(idx);
      else if (idx > index) nextSelected.add(idx - 1);
    });
    setSelectedIndices(nextSelected);
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleUpdateQuestion = (index: number, patch: Partial<ParsedWordQuestion>) => {
    setParsedQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q;
      const updated = { ...q, ...patch };
      // Check if review can be cleared
      if (updated.options.length === 4 && updated.correctOptionIndex >= 0 && updated.correctOptionIndex <= 3) {
        updated.needsReview = false;
        updated.reviewReason = undefined;
      }
      return updated;
    }));
  };

  const isDuplicate = (prompt: string) => {
    const norm = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
    return existingSet.has(norm);
  };

  const handleSaveToBank = async () => {
    if (selectedIndices.size === 0) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một câu hỏi để lưu.' });
      return;
    }

    setLoading(true);
    try {
      const toImport = parsedQuestions
        .filter((_, idx) => selectedIndices.has(idx))
        .map((q, i) => ({
          code: `Q-DOCX-${Date.now()}-${i + 1}`,
          prompt: q.prompt,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          lessonCode: q.lessonCode || 'BD-01',
          lessonId: 'lesson-01',
          topicId: 'topic-dao-ham',
          questionType: 'mcq' as const,
          difficulty: q.difficulty,
          grade: (q.grade as 10 | 11 | 12) || 12,
          hintOnWrong: 'Kiểm tra lại công thức và các bước biến đổi trung gian.',
          prerequisiteKnowledge: 'Kiến thức trọng tâm chuyên đề',
          similarQuestionIds: [] as string[],
          status: 'verified' as const,
          approvalStatus: 'pending' as const,
          source: 'docx_import' as const,
        }));

      const res = await importWordQuestions(toImport);
      setStatusMessage({
        type: 'success',
        text: `Đã nhập thành công ${res.importedCount} câu hỏi vào trạng thái "Chờ duyệt". (${res.duplicateCount} câu bị trùng đã bỏ qua).`
      });

      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Không thể lưu câu hỏi: ${err?.message || 'Lỗi dữ liệu'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = filterReviewOnly
    ? parsedQuestions.map((q, idx) => ({ q, idx })).filter(item => item.q.needsReview)
    : parsedQuestions.map((q, idx) => ({ q, idx }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Trình nhập câu hỏi từ Microsoft Word (.docx)
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Tự động nhận diện LaTeX</span>
              </h2>
              <p className="text-xs text-slate-500">
                Tự động bóc tách mã câu, nội dung, 4 phương án A-B-C-D, đáp án đúng và lời giải chi tiết.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={downloadWordQuestionSampleGuide}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Tải hướng dẫn định dạng"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Hướng dẫn & Mẫu chuẩn
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/30">
          
          {/* Upload Area */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer group"
               onClick={() => fileInputRef.current?.click()}>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {fileName ? `File đã chọn: ${fileName}` : 'Kéo thả file .docx hoặc nhấp để tải lên đề thi'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Hỗ trợ các định dạng đề thi chuẩn Bộ GD&ĐT (Câu 1:... A. B. C. D. Lời giải:...)
            </p>
            {loading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang phân tích cấu trúc văn bản và công thức Toán...
              </div>
            )}
          </div>

          {/* Status / Errors */}
          {statusMessage && (
            <div className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Lưu ý khi phân tích file:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed List Section */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      checked={selectedIndices.size === parsedQuestions.length && parsedQuestions.length > 0}
                      onChange={toggleSelectAll}
                    />
                    Chọn tất cả ({selectedIndices.size}/{parsedQuestions.length})
                  </label>

                  <span className="text-slate-300">|</span>

                  <button
                    onClick={() => setFilterReviewOnly(!filterReviewOnly)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                      filterReviewOnly 
                        ? 'bg-amber-100 text-amber-800 font-semibold border border-amber-300' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Chỉ xem câu cần kiểm tra ({parsedQuestions.filter(q => q.needsReview).length})
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  Câu hỏi sẽ được nhập với trạng thái <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Chờ duyệt</span>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map(({ q, idx }) => {
                  const isDup = isDuplicate(q.prompt);
                  const isSelected = selectedIndices.has(idx);
                  const isEditing = editingIndex === idx;

                  return (
                    <div 
                      key={idx}
                      className={`bg-white rounded-xl border transition-all ${
                        isSelected ? 'border-blue-300 shadow-sm' : 'border-slate-200 opacity-75'
                      } ${q.needsReview ? 'border-l-4 border-l-amber-500' : isDup ? 'border-l-4 border-l-rose-500' : ''} p-4`}
                    >
                      {/* Item Top Bar */}
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 mb-3">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            checked={isSelected}
                            onChange={() => toggleSelect(idx)}
                          />
                          <span className="font-bold text-slate-800 text-sm">
                            Câu {q.questionNumber || idx + 1}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            Khối {q.grade}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            q.difficulty === 'nhan_biet' ? 'bg-emerald-100 text-emerald-800' :
                            q.difficulty === 'thong_hieu' ? 'bg-blue-100 text-blue-800' :
                            q.difficulty === 'van_dung' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {q.difficulty === 'nhan_biet' ? 'Nhận biết' :
                             q.difficulty === 'thong_hieu' ? 'Thông hiểu' :
                             q.difficulty === 'van_dung' ? 'Vận dụng' : 'Vận dụng cao'}
                          </span>

                          {q.needsReview && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {q.reviewReason || 'Cần kiểm tra lại'}
                            </span>
                          )}

                          {isDup && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Nội dung trùng ngân hàng
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="text-xs px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isEditing ? 'Đóng sửa' : 'Chỉnh sửa'}
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-xs p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Xóa khỏi danh sách nhập"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Editing Mode */}
                      {isEditing ? (
                        <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-600 font-semibold mb-1">Khối lớp:</label>
                              <select 
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                                value={q.grade}
                                onChange={e => handleUpdateQuestion(idx, { grade: parseInt(e.target.value, 10) })}
                              >
                                <option value={10}>Khối 10</option>
                                <option value={11}>Khối 11</option>
                                <option value={12}>Khối 12</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-600 font-semibold mb-1">Mức độ:</label>
                              <select 
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                                value={q.difficulty}
                                onChange={e => handleUpdateQuestion(idx, { difficulty: e.target.value as QuestionDifficulty })}
                              >
                                <option value="nhan_biet">Nhận biết</option>
                                <option value="thong_hieu">Thông hiểu</option>
                                <option value="van_dung">Vận dụng</option>
                                <option value="van_dung_cao">Vận dụng cao</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-600 font-semibold mb-1">Nội dung câu hỏi (hỗ trợ LaTeX $...$):</label>
                            <textarea 
                              rows={2}
                              className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono"
                              value={q.prompt}
                              onChange={e => handleUpdateQuestion(idx, { prompt: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-slate-600 font-semibold">4 Phương án (Chọn nút tròn để chỉ định đáp án đúng):</label>
                            {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                              <div key={letter} className="flex items-center gap-2">
                                <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-700 w-12 shrink-0">
                                  <input 
                                    type="radio" 
                                    name={`correct_${idx}`}
                                    checked={q.correctOptionIndex === optIdx}
                                    onChange={() => handleUpdateQuestion(idx, { correctOptionIndex: optIdx })}
                                    className="text-blue-600"
                                  />
                                  {letter}.
                                </label>
                                <input 
                                  type="text" 
                                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                                  value={q.options[optIdx] || ''}
                                  onChange={e => {
                                    const nextOpts = [...q.options];
                                    nextOpts[optIdx] = e.target.value;
                                    handleUpdateQuestion(idx, { options: nextOpts });
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-slate-600 font-semibold mb-1">Lời giải chi tiết:</label>
                            <textarea 
                              rows={2}
                              className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                              value={q.explanation}
                              onChange={e => handleUpdateQuestion(idx, { explanation: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        /* Normal View */
                        <div className="space-y-2">
                          <div className="text-sm text-slate-800 leading-relaxed font-medium">
                            <MathRenderer content={q.prompt} />
                          </div>

                          {/* Options grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctOptionIndex === optIdx;
                              const letters = ['A', 'B', 'C', 'D'];
                              return (
                                <div 
                                  key={optIdx} 
                                  className={`text-xs p-2 rounded-lg border flex items-start gap-2 ${
                                    isCorrect 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' 
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[12.5px] shrink-0 font-bold ${
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

                          {/* Explanation preview */}
                          {q.explanation && (
                            <div className="mt-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700">
                              <span className="font-bold text-blue-900">Lời giải: </span>
                              <MathRenderer content={q.explanation} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedQuestions.length > 0 ? (
              <span>
                Đã chọn <strong className="text-blue-600">{selectedIndices.size}</strong> / {parsedQuestions.length} câu hỏi để nhập
              </span>
            ) : (
              <span>Chưa có câu hỏi nào được tải lên.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSaveToBank}
              disabled={loading || selectedIndices.size === 0}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm ${
                loading || selectedIndices.size === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:shadow'
              }`}
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Lưu vào Ngân hàng ({selectedIndices.size} câu Chờ duyệt)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
