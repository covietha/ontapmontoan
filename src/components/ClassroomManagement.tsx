import { ClassGroups } from './ClassGroups';
import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Users, 
  UserPlus, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Archive, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Edit, 
  Key, 
  FileText,
  Clock,
  Filter
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Classroom, StudentProfile, GradeLevel } from '../types';
import { 
  downloadStudentTemplate, 
  parseStudentExcelFile, 
  exportAccountsHandoverExcel, 
  ExcelStudentRow 
} from '../utils/fileParsers';

export const ClassroomManagement: React.FC = () => {
  const { isTeacher, isRootAdmin, profile } = useAuth();
  const { 
    classrooms, 
    students, 
    addClassroom, 
    updateClassroom, 
    saveClassInfo,
    teacherOptions,
    archiveClassroom, 
    addStudentsBatch, 
    transferStudent,
    createAccountsBatchForClassroom 
  } = useData();

  // Tab: 'classrooms' | 'students' | 'import_excel' | 'batch_accounts' | 'groups'
  const [activeTab, setActiveTab] = useState<'classrooms' | 'students' | 'import_excel' | 'batch_accounts' | 'groups'>('classrooms');

  // Selected Classroom for viewing students or batch actions
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(classrooms[0]?.id || '');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026-2027');
  const [selectedGrade, setSelectedGrade] = useState<'all' | GradeLevel>('all');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Form: Create/Edit Classroom
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [classYear, setClassYear] = useState('2026-2027');
  const [classGrade, setClassGrade] = useState<GradeLevel>(12);
  const [homeroomTeacherName, setHomeroomTeacherName] = useState('Nguyễn Văn Đăng');
  const [classModalError, setClassModalError] = useState<string | null>(null);

  // Form: Add Single Student
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [singleStudentCode, setSingleStudentCode] = useState('');
  const [singleStudentName, setSingleStudentName] = useState('');
  const [singleStudentClass, setSingleStudentClass] = useState(classrooms[0]?.code || '12A1');
  const [singleStudentDob, setSingleStudentDob] = useState('');
  const [singleStudentGender, setSingleStudentGender] = useState<'Nam' | 'Nữ'>('Nam');

  // Excel Import State
  const [excelRows, setExcelRows] = useState<ExcelStudentRow[]>([]);
  const [excelErrors, setExcelErrors] = useState<string[]>([]);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<{ addedCount: number; duplicateCount: number; errors: string[] } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Batch Account Creation State
  const [selectedStudentIdsForAccount, setSelectedStudentIdsForAccount] = useState<string[]>([]);
  const [batchDefaultPassword, setBatchDefaultPassword] = useState('ThptMath@2026');
  const [batchReport, setBatchReport] = useState<{ createdCount: number; existedCount: number; failedCount: number; accounts: any[] } | null>(null);
  const [isCreatingBatchAccounts, setIsCreatingBatchAccounts] = useState(false);

  // Filtered Classrooms
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(c => {
      const matchYear = selectedAcademicYear === 'all' || c.academicYear === selectedAcademicYear;
      const matchGrade = selectedGrade === 'all' || c.grade === selectedGrade;
      return matchYear && matchGrade;
    });
  }, [classrooms, selectedAcademicYear, selectedGrade]);

  const selectedClassroom = useMemo(() => {
    return classrooms.find(c => c.id === selectedClassroomId) || classrooms[0];
  }, [classrooms, selectedClassroomId]);

  // Students of current selected class
  const classStudents = useMemo(() => {
    if (!selectedClassroom) return [];
    return students.filter(s => s.classroomId === selectedClassroom.id || s.classroomCode === selectedClassroom.code);
  }, [students, selectedClassroom]);

  // Filtered Students for the Search table
  const filteredStudents = useMemo(() => {
    return classStudents.filter(s => {
      const q = searchStudentQuery.toLowerCase().trim();
      if (!q) return true;
      return s.studentCode.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q);
    });
  }, [classStudents, searchStudentQuery]);

  // Handle Class Creation/Update
  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassModalError(null);

    if (!classCode.trim() || !className.trim()) {
      setClassModalError('Vui lòng nhập đầy đủ Mã lớp và Tên lớp.');
      return;
    }

    if (editingClassroom) {
      const hrName = homeroomTeacherName.trim();
      const match = teacherOptions.find(t => t.displayName.toLowerCase() === hrName.toLowerCase());
      try {
        await saveClassInfo({
          ...editingClassroom,
          name: className.trim(),
          academicYear: classYear.trim(),
          grade: classGrade,
          homeroomTeacherName: hrName,
          homeroomTeacherId: match ? match.id : '',
          subjectTeacherIds: match && !editingClassroom.subjectTeacherIds.includes(match.id) ? [...editingClassroom.subjectTeacherIds, match.id] : editingClassroom.subjectTeacherIds
        });
      } catch (err: any) {
        setClassModalError(err.message || 'Không lưu được thông tin lớp.');
        return;
      }
      setShowClassModal(false);
      setEditingClassroom(null);
    } else {
      const res = await addClassroom({
        code: classCode.trim().toUpperCase(),
        name: className.trim(),
        academicYear: classYear.trim(),
        grade: classGrade,
        homeroomTeacherId: 'sch_acc_gvt2',
        homeroomTeacherName: homeroomTeacherName.trim(),
        subjectTeacherIds: ['sch_acc_gvt2'],
        status: 'active'
      });

      if (!res.success) {
        setClassModalError(res.error || 'Lỗi khi tạo lớp.');
      } else {
        setShowClassModal(false);
        if (res.classroom) {
          setSelectedClassroomId(res.classroom.id);
        }
      }
    }
  };

  // Handle Single Student Creation
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStudentCode.trim() || !singleStudentName.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin học sinh.');
      return;
    }

    const targetClass = classrooms.find(c => c.code === singleStudentClass) || selectedClassroom;

    const res = await addStudentsBatch([{
      studentCode: singleStudentCode.trim().toUpperCase(),
      fullName: singleStudentName.trim(),
      classroomId: targetClass.id,
      classroomCode: targetClass.code,
      academicYear: targetClass.academicYear,
      dateOfBirth: singleStudentDob || undefined,
      gender: singleStudentGender,
      hasAccount: false,
      status: 'active'
    }]);

    if (res.addedCount > 0) {
      setShowStudentModal(false);
      setSingleStudentCode('');
      setSingleStudentName('');
    } else if (res.duplicateCount > 0) {
      alert(`Mã học sinh ${singleStudentCode} đã tồn tại trong hệ thống.`);
    } else {
      alert('Lỗi: ' + res.errors.join('; '));
    }
  };

  // Handle Excel Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setExcelFileName(file.name);
    setImportReport(null);

    const { rows, errors } = await parseStudentExcelFile(file);
    setExcelRows(rows);
    setExcelErrors(errors);
    setIsProcessingFile(false);
  };

  const handleConfirmExcelImport = async () => {
    if (excelRows.length === 0) return;

    const toImport = excelRows.map(row => {
      const matchedClass = classrooms.find(c => c.code.toUpperCase() === row.classroomCode.toUpperCase());
      return {
        studentCode: row.studentCode,
        fullName: row.fullName,
        classroomId: matchedClass ? matchedClass.id : selectedClassroom?.id || 'cls-default',
        classroomCode: matchedClass ? matchedClass.code : row.classroomCode,
        academicYear: matchedClass ? matchedClass.academicYear : '2026-2027',
        dateOfBirth: row.dateOfBirth,
        gender: (row.gender === 'Nữ' ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
        hasAccount: false,
        status: 'active' as const
      };
    });

    const report = await addStudentsBatch(toImport);
    setImportReport(report);
    setExcelRows([]);
  };

  // Handle Batch Accounts
  const handleRunBatchAccounts = async () => {
    if (selectedStudentIdsForAccount.length === 0) {
      alert('Vui lòng chọn ít nhất một học sinh để cấp tài khoản.');
      return;
    }

    setIsCreatingBatchAccounts(true);
    setBatchReport(null);

    const report = await createAccountsBatchForClassroom(
      selectedClassroom.id,
      selectedStudentIdsForAccount,
      batchDefaultPassword
    );

    setBatchReport(report);
    setIsCreatingBatchAccounts(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Quản lý lớp học & danh sách học sinh</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập danh mục lớp theo năm học, khối 10-12, nhập Excel và cấp tài khoản hàng loạt an toàn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRootAdmin && (
            <button
              onClick={() => {
                setEditingClassroom(null);
                setClassCode('');
                setClassName('');
                setClassYear('2026-2027');
                setClassGrade(12);
                setShowClassModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo lớp học mới</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowStudentModal(true);
              setSingleStudentClass(selectedClassroom?.code || '12A1');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>+ Thêm học sinh</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('classrooms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'classrooms'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Danh sách lớp học ({classrooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'students'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Học sinh theo lớp ({classStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'groups'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Lớp do thầy cô tạo</span>
        </button>

        <button
          onClick={() => setActiveTab('import_excel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'import_excel'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Nhập Excel danh sách học sinh</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('batch_accounts');
            // Select all students without account by default
            setSelectedStudentIdsForAccount(classStudents.filter(s => !s.hasAccount).map(s => s.id));
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'batch_accounts'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Cấp tài khoản hàng loạt cho lớp</span>
        </button>
      </div>

      {/* TAB 1: CLASSROOMS DIRECTORY */}
      {activeTab === 'classrooms' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Năm học:</span>
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="all">Tất cả năm học</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Khối:</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value) as GradeLevel)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="all">Tất cả khối</option>
                  <option value={12}>Khối 12</option>
                  <option value={11}>Khối 11</option>
                  <option value={10}>Khối 10</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Tìm thấy {filteredClassrooms.length} lớp học
            </span>
          </div>

          {/* Classroom Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredClassrooms.map(c => {
              const studentsInClass = students.filter(s => s.classroomId === c.id || s.classroomCode === c.code);
              const withAccount = studentsInClass.filter(s => s.hasAccount).length;
              const isSelected = c.id === selectedClassroomId;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClassroomId(c.id);
                    setActiveTab('students');
                  }}
                  className={`bg-white rounded-2xl p-5 border shadow-xs transition-all cursor-pointer hover:border-blue-400 space-y-3 ${
                    isSelected ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-black bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                        {c.code}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-2">{c.name}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[12.5px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap bg-slate-100 text-slate-600">
                        Khối {c.grade}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClassroom(c);
                          setClassCode(c.code);
                          setClassName(c.name);
                          setClassYear(c.academicYear);
                          setClassGrade(c.grade);
                          setHomeroomTeacherName(c.homeroomTeacherName || '');
                          setClassModalError(null);
                          setShowClassModal(true);
                        }}
                        className="text-[12.5px] font-bold px-2.5 py-0.5 rounded-full text-blue-700 bg-blue-50 hover:bg-blue-100"
                      >
                        Sửa lớp
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div>GVPT: <strong className="text-slate-800">{c.homeroomTeacherName}</strong></div>
                    <div>Năm học: <span className="font-mono">{c.academicYear}</span></div>
                  </div>

                  {/* Account stats badge */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Sĩ số: <strong>{studentsInClass.length} HS</strong></span>
                    <span className="text-[13px] font-bold text-emerald-600">
                      {withAccount}/{studentsInClass.length} có TK
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS OF SELECTED CLASSROOM */}
      {activeTab === 'students' && selectedClassroom && (
        <div className="space-y-4">
          {/* Class Switcher & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Chọn lớp:</span>
              <select
                value={selectedClassroom.id}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs rounded-xl focus:outline-none"
              >
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>[{c.code}] {c.name} ({c.academicYear})</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Tìm mã hoặc họ tên học sinh..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã học sinh</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Lớp</th>
                    <th className="py-3 px-4">Ngày sinh</th>
                    <th className="py-3 px-4">Giới tính</th>
                    <th className="py-3 px-4">Trạng thái tài khoản</th>
                    <th className="py-3 px-4 text-right">Chuyển lớp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Chưa có học sinh nào trong danh sách lớp này. Thầy có thể thêm từng học sinh hoặc nhập hàng loạt từ Excel.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => (
                      <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{std.studentCode}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{std.fullName}</td>
                        <td className="py-3 px-4 font-semibold text-blue-700">{std.classroomCode}</td>
                        <td className="py-3 px-4 text-slate-500">{std.dateOfBirth || '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{std.gender || '—'}</td>
                        <td className="py-3 px-4">
                          {std.hasAccount ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã cấp tài khoản
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Chờ cấp tài khoản
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={std.classroomCode}
                            onChange={(e) => {
                              const target = classrooms.find(c => c.code === e.target.value);
                              if (target) {
                                transferStudent(std.id, target.id, target.code);
                              }
                            }}
                            className="text-[13px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-none"
                          >
                            {classrooms.map(c => (
                              <option key={c.id} value={c.code}>{c.code}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT EXCEL */}
      {activeTab === 'groups' && <ClassGroups />}

      {activeTab === 'import_excel' && (
        <div className="space-y-6">
          {/* Guide & Template Download */}
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                Mẫu Excel Nhập Danh Sách Học Sinh Chuẩn
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Tải file mẫu Excel chuẩn gồm các cột: <strong>Mã học sinh (*), Họ và tên (*), Lớp (*), Ngày sinh, Giới tính</strong>. Hệ thống tự động kiểm tra mã trùng và định dạng trước khi lưu.
              </p>
            </div>

            <button
              onClick={downloadStudentTemplate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Excel mẫu</span>
            </button>
          </div>

          {/* File Upload Box */}
          <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {excelFileName ? `Đã chọn: ${excelFileName}` : 'Chọn file Excel (.xlsx / .csv) chứa danh sách học sinh'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Dung lượng tối đa 10MB</p>
            </div>

            <label className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all">
              <span>{excelRows.length > 0 ? 'Chọn file khác' : 'Chọn file Excel từ máy'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Import Report if completed */}
          {importReport && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Kết quả nhập dữ liệu:
              </p>
              <p>• Thêm mới thành công: <strong>{importReport.addedCount} học sinh</strong></p>
              {importReport.duplicateCount > 0 && (
                <p className="text-amber-700">• Bị bỏ qua do trùng mã: <strong>{importReport.duplicateCount} học sinh</strong></p>
              )}
            </div>
          )}

          {/* Preview Table */}
          {excelRows.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Xem trước dữ liệu ({excelRows.length} bản ghi)
                </h3>
                <button
                  onClick={handleConfirmExcelImport}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Xác nhận lưu danh sách này vào trường
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">STT</th>
                      <th className="py-2.5 px-3">Mã học sinh</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Lớp</th>
                      <th className="py-2.5 px-3">Ngày sinh</th>
                      <th className="py-2.5 px-3">Giới tính</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {excelRows.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.studentCode}</td>
                        <td className="py-2 px-3 font-bold">{r.fullName}</td>
                        <td className="py-2 px-3 text-blue-700 font-semibold">{r.classroomCode}</td>
                        <td className="py-2 px-3 text-slate-500">{r.dateOfBirth || '—'}</td>
                        <td className="py-2 px-3">{r.gender || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BATCH ACCOUNT CREATION FOR CLASSROOM */}
      {activeTab === 'batch_accounts' && selectedClassroom && (
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-200 space-y-2">
            <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-700" />
              Cấp tài khoản hàng loạt cho lớp {selectedClassroom.code}
            </h3>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Hệ thống sẽ tự động tạo tài khoản theo Mã học sinh cho các em được chọn, băm mật khẩu bảo mật PBKDF2-SHA512 và hỗ trợ xuất danh sách bàn giao ra Excel cho giáo viên phụ trách.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-700">Mật khẩu khởi tạo chung:</span>
                <input
                  type="text"
                  value={batchDefaultPassword}
                  onChange={(e) => setBatchDefaultPassword(e.target.value)}
                  className="ml-2 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStudentIdsForAccount(classStudents.map(s => s.id))}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Chọn tất cả ({classStudents.length})
                </button>
                <span>•</span>
                <button
                  onClick={() => setSelectedStudentIdsForAccount(classStudents.filter(s => !s.hasAccount).map(s => s.id))}
                  className="text-xs text-amber-600 font-bold hover:underline"
                >
                  Chỉ chọn em chưa có TK ({classStudents.filter(s => !s.hasAccount).length})
                </button>
              </div>
            </div>

            {/* Student selection table */}
            <div className="overflow-x-auto max-h-80 border rounded-2xl border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-10">Chọn</th>
                    <th className="py-2 px-3">Mã học sinh</th>
                    <th className="py-2 px-3">Họ và tên</th>
                    <th className="py-2 px-3">Tình trạng tài khoản</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map(std => {
                    const isSelected = selectedStudentIdsForAccount.includes(std.id);
                    return (
                      <tr key={std.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIdsForAccount(prev => [...prev, std.id]);
                              } else {
                                setSelectedStudentIdsForAccount(prev => prev.filter(id => id !== std.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{std.studentCode}</td>
                        <td className="py-2 px-3 font-medium">{std.fullName}</td>
                        <td className="py-2 px-3">
                          {std.hasAccount ? (
                            <span className="text-emerald-700 font-bold text-[13px]">✓ Đã có tài khoản</span>
                          ) : (
                            <span className="text-amber-700 font-bold text-[13px]">Chờ tạo tài khoản</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleRunBatchAccounts}
                disabled={isCreatingBatchAccounts || selectedStudentIdsForAccount.length === 0}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>{isCreatingBatchAccounts ? 'Đang tạo hàng loạt...' : `Tiến hành cấp tài khoản (${selectedStudentIdsForAccount.length} em)`}</span>
              </button>
            </div>
          </div>

          {/* Batch Result Report & Handover Excel Download */}
          {batchReport && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Báo cáo cấp tài khoản hàng loạt
                </h4>

                {batchReport.accounts.length > 0 && (
                  <button
                    onClick={() => exportAccountsHandoverExcel(batchReport.accounts, selectedClassroom.code)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất file bàn giao tài khoản (Excel)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <span>Tạo mới thành công:</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">{batchReport.createdCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200">
                  <span>Đã tồn tại trước đó:</span>
                  <div className="text-xl font-black text-blue-700 mt-1">{batchReport.existedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-200">
                  <span>Thất bại:</span>
                  <div className="text-xl font-black text-rose-700 mt-1">{batchReport.failedCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT CLASSROOM */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveClassroom} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingClassroom ? 'Cập nhật thông tin lớp học' : 'Thêm lớp học mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {classModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {classModalError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã lớp</label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="12A1"
                  required
                  readOnly={!!editingClassroom}
                  title={editingClassroom ? 'Mã lớp gắn với tài khoản học sinh nên không đổi được' : undefined}
                  className={`w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono uppercase ${editingClassroom ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối</label>
                <select
                  value={classGrade}
                  onChange={(e) => setClassGrade(Number(e.target.value) as GradeLevel)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value={12}>Khối 12</option>
                  <option value={11}>Khối 11</option>
                  <option value={10}>Khối 10</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp đầy đủ</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ví dụ: Lớp 12A1 Chuyên Toán"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
                <input
                  type="text"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  placeholder="2026-2027"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GV Phụ trách</label>
                <input
                  type="text"
                  value={homeroomTeacherName}
                  onChange={(e) => setHomeroomTeacherName(e.target.value)}
                  placeholder="Chọn hoặc nhập tên giáo viên"
                  list="homeroom-teachers"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <datalist id="homeroom-teachers">
              {teacherOptions.map(t => <option key={t.id} value={t.displayName} />)}
            </datalist>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                Lưu lớp học
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD SINGLE STUDENT */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleAddSingleStudent} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Thêm học sinh vào danh sách
              </h3>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã học sinh (*)</label>
                <input
                  type="text"
                  value={singleStudentCode}
                  onChange={(e) => setSingleStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS12009"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Xếp vào lớp</label>
                <select
                  value={singleStudentClass}
                  onChange={(e) => setSingleStudentClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.code}>{c.code} ({c.name})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên học sinh (*)</label>
              <input
                type="text"
                value={singleStudentName}
                onChange={(e) => setSingleStudentName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={singleStudentDob}
                  onChange={(e) => setSingleStudentDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giới tính</label>
                <select
                  value={singleStudentGender}
                  onChange={(e) => setSingleStudentGender(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                Thêm học sinh
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClassroomManagement;
