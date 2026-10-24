import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Question, QuestionDifficulty, QuestionType } from '../types';

/**
 * Mẫu dữ liệu học sinh Excel chuẩn
 */
export interface ExcelStudentRow {
  studentCode: string;
  fullName: string;
  classroomCode: string;
  dateOfBirth?: string;
  gender?: string;
}

/**
 * Tải file Excel mẫu để nhập danh sách học sinh
 */
export function downloadStudentTemplate() {
  const sampleData: ExcelStudentRow[] = [
    { studentCode: 'HS12006', fullName: 'Nguyễn Thùy Trang', classroomCode: '12A1', dateOfBirth: '2008-04-12', gender: 'Nữ' },
    { studentCode: 'HS12007', fullName: 'Vũ Đức Minh', classroomCode: '12A1', dateOfBirth: '2008-07-25', gender: 'Nam' },
    { studentCode: 'HS12008', fullName: 'Bùi Phương Thảo', classroomCode: '12A2', dateOfBirth: '2008-10-03', gender: 'Nữ' },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData, {
    header: ['studentCode', 'fullName', 'classroomCode', 'dateOfBirth', 'gender']
  });

  // Đặt tiêu đề cột tiếng Việt dễ hiểu
  XLSX.utils.sheet_add_aoa(ws, [
    ['Mã học sinh (*)', 'Họ và tên (*)', 'Lớp (*)', 'Ngày sinh (YYYY-MM-DD)', 'Giới tính']
  ], { origin: 'A1' });

  // Thiết lập độ rộng cột
  ws['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 12 },
    { wch: 22 },
    { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
  XLSX.writeFile(wb, 'Mau_Nhap_Hoc_Sinh_THPT_MATH_360.xlsx');
}

/**
 * Đọc file Excel / CSV nhập danh sách học sinh
 */
export async function parseStudentExcelFile(file: File): Promise<{
  rows: ExcelStudentRow[];
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rawRows.length < 2) {
    return { rows: [], errors: ['File Excel không có dữ liệu hoặc chỉ có dòng tiêu đề.'] };
  }

  const rows: ExcelStudentRow[] = [];
  const errors: string[] = [];

  // Bỏ qua dòng tiêu đề
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const studentCode = String(row[0] || '').trim();
    const fullName = String(row[1] || '').trim();
    const classroomCode = String(row[2] || '').trim();
    const dateOfBirth = row[3] ? String(row[3]).trim() : undefined;
    const gender = row[4] ? String(row[4]).trim() : undefined;

    if (!studentCode && !fullName && !classroomCode) continue;

    if (!studentCode) {
      errors.push(`Dòng ${i + 1}: Thiếu Mã học sinh.`);
      continue;
    }
    if (!fullName) {
      errors.push(`Dòng ${i + 1} (Mã ${studentCode}): Thiếu Họ và tên.`);
      continue;
    }
    if (!classroomCode) {
      errors.push(`Dòng ${i + 1} (Mã ${studentCode}): Thiếu Mã lớp.`);
      continue;
    }

    rows.push({
      studentCode,
      fullName,
      classroomCode,
      dateOfBirth,
      gender
    });
  }

  return { rows, errors };
}

/**
 * Xuất danh sách bàn giao tài khoản an toàn ra file Excel
 */
export function exportAccountsHandoverExcel(accounts: {
  username: string;
  displayName: string;
  classroom?: string;
  role: string;
  password?: string;
}[], classroomName: string = 'ToanTruong') {
  const exportData = accounts.map((acc, index) => ({
    STT: index + 1,
    'Mã đăng nhập': acc.username,
    'Họ và tên': acc.displayName,
    'Lớp / Bộ môn': acc.classroom || '—',
    'Vai trò': acc.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
    'Mật khẩu bàn giao': acc.password || 'ThptMath@2026',
    'Ghi chú': 'Đổi mật khẩu sau lần đăng nhập đầu tiên'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 25 },
    { wch: 15 },
    { wch: 14 },
    { wch: 20 },
    { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BanGiaoTaiKhoan');
  XLSX.writeFile(wb, `Ban_Giao_Tai_Khoan_${classroomName}_THPT_MATH_360.xlsx`);
}

/**
 * Tải file văn bản mẫu soạn câu hỏi Word (.docx format guide)
 */
export function downloadWordQuestionSampleGuide() {
  const sampleContent = `BỘ CÂU HỎI MẪU ÔN THI TỐT NGHIỆP THPT MÔN TOÁN 2026

Câu 1: [Nhận biết] [Khối 12] Đạo hàm của hàm số $y = \\frac{2x + 1}{x - 3}$ trên tập xác định là:
A. $y' = \\frac{-7}{(x-3)^2}$
B. $y' = \\frac{7}{(x-3)^2}$
C. $y' = \\frac{-5}{(x-3)^2}$
D. $y' = \\frac{2}{(x-3)^2}$
Đáp án: A
Lời giải: Áp dụng công thức đạo hàm phân thức bậc nhất trên bậc nhất:
$y' = \\frac{ad - bc}{(cx+d)^2} = \\frac{2(-3) - 1(1)}{(x-3)^2} = \\frac{-7}{(x-3)^2}$.
Chọn A.

Câu 2: [Thông hiểu] [Khối 12] Cho hàm số $y = f(x)$ có bảng biến thiên trên đoạn [-2; 3]. Giá trị cực đại của hàm số đã cho bằng:
A. 4
B. -2
C. 3
D. 0
Đáp án: A
Lời giải: Dựa vào bảng biến thiên, tại điểm $x = 1$, đạo hàm $f'(x)$ đổi dấu từ dương sang âm, do đó hàm số đạt cực đại tại $x = 1$ và giá trị cực đại $y_{CĐ} = 4$.
Chọn A.

Câu 3: [Vận dụng] [Khối 12] Tìm tất cả các giá trị của tham số m để hàm số $y = x^3 - 3mx^2 + 3(m^2 - 1)x$ đạt cực tiểu tại $x = 2$.
A. $m = 1$
B. $m = 3$
C. $m = 2$
D. Không tồn tại m
Đáp án: B
Lời giải: Ta có $y' = 3x^2 - 6mx + 3(m^2 - 1)$. 
Hàm số đạt cực tiểu tại $x = 2 \\implies y'(2) = 0 \\iff 3(4) - 12m + 3(m^2 - 1) = 0 \\iff 3m^2 - 12m + 9 = 0 \\iff m = 1$ hoặc $m = 3$.
Thử lại với $y'' = 6x - 6m$:
- Với $m = 1$: $y''(2) = 6(2) - 6(1) = 6 > 0 \\implies x = 2$ là điểm cực tiểu (thỏa mãn).
- Với $m = 3$: $y''(2) = 12 - 18 = -6 < 0 \\implies$ cực đại (loại).
Chọn A.`;

  const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Huong_Dan_Soan_Cau_Hoi_THPT_MATH_360.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParsedWordQuestion {
  questionNumber: number;
  prompt: string;
  options: string[];
  correctOptionIndex: number; // 0, 1, 2, 3 (-1 nếu không rõ)
  explanation: string;
  difficulty: QuestionDifficulty;
  grade: number;
  lessonCode: string;
  needsReview: boolean;
  reviewReason?: string;
}

/**
 * Trình phân tích câu hỏi Word (.docx) chuyên dụng cho đề thi Toán THPT
 */
export async function parseDocxFile(file: File): Promise<{
  questions: ParsedWordQuestion[];
  rawText: string;
  errors: string[];
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value;

    const parsed = parseQuestionText(rawText);
    return {
      questions: parsed.questions,
      rawText,
      errors: parsed.errors
    };
  } catch (err: any) {
    return {
      questions: [],
      rawText: '',
      errors: [`Không thể đọc file Word: ${err?.message || 'File hỏng hoặc không đúng định dạng .docx'}`]
    };
  }
}

/**
 * Phân tích chuỗi văn bản chứa nhiều câu hỏi trắc nghiệm
 */
export function parseQuestionText(text: string): {
  questions: ParsedWordQuestion[];
  errors: string[];
} {
  const errors: string[] = [];
  const questions: ParsedWordQuestion[] = [];

  // Chuẩn hóa ngắt dòng
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Tách các câu dựa theo mẫu "Câu 1:", "Câu 2.", "[Câu 1]", "Bài 1:"
  const questionRegex = /(?:^|\n)(?:Câu|Bài|\[Câu)\s*(\d+)[\s:.\-\]]+/gi;
  const matches: { index: number; number: number }[] = [];
  let match;

  while ((match = questionRegex.exec(normalized)) !== null) {
    matches.push({
      index: match.index,
      number: parseInt(match[1], 10)
    });
  }

  if (matches.length === 0) {
    // Thử tách theo từng khối đoạn văn nếu không có từ khóa "Câu X"
    return {
      questions: [],
      errors: ['Không tìm thấy định dạng "Câu 1:", "Câu 2:"... trong tài liệu Word. Vui lòng tham khảo mẫu chuẩn.']
    };
  }

  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    const block = normalized.substring(startIndex, endIndex).trim();

    const parsed = parseSingleQuestionBlock(block, matches[i].number);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return { questions, errors };
}

function parseSingleQuestionBlock(block: string, qNum: number): ParsedWordQuestion | null {
  // 1. Nhận diện Mức độ & Khối lớp từ thẻ đầu câu (ví dụ [Nhận biết], [Khối 12])
  let difficulty: QuestionDifficulty = 'thong_hieu';
  if (/nhận\s*biết/i.test(block)) difficulty = 'nhan_biet';
  else if (/vận\s*dụng\s*cao/i.test(block)) difficulty = 'van_dung_cao';
  else if (/vận\s*dụng/i.test(block)) difficulty = 'van_dung';

  let grade = 12;
  const gradeMatch = /khối\s*(10|11|12)|lớp\s*(10|11|12)/i.exec(block);
  if (gradeMatch) {
    grade = parseInt(gradeMatch[1] || gradeMatch[2], 10);
  }

  // 2. Tách phần Lời giải (Explanation)
  let explanation = '';
  let mainContent = block;
  const expMatch = /(?:Lời giải|Hướng dẫn giải|HDG)[\s:.\-]+([\s\S]*)$/i.exec(block);
  if (expMatch) {
    explanation = expMatch[1].trim();
    mainContent = block.substring(0, expMatch.index).trim();
  }

  // 3. Tách Đáp án chuẩn (A, B, C, D)
  let correctOptionIndex = -1;
  const ansMatch = /(?:Đáp án|Chọn|Đ\/A)[\s:.\-]+([A-D])/i.exec(block);
  if (ansMatch) {
    const letter = ansMatch[1].toUpperCase();
    correctOptionIndex = ['A', 'B', 'C', 'D'].indexOf(letter);
  }

  // 4. Tìm 4 phương án A, B, C, D
  // Hỗ trợ cả định dạng "A. ... B. ...", "*A. ...", "(A) ..."
  const optARegex = /(?:^|\n|\s)(?:\*|\()?[A][\s.)\-:]\s*/i;
  const optBRegex = /(?:^|\n|\s)(?:\*|\()?[B][\s.)\-:]\s*/i;
  const optCRegex = /(?:^|\n|\s)(?:\*|\()?[C][\s.)\-:]\s*/i;
  const optDRegex = /(?:^|\n|\s)(?:\*|\()?[D][\s.)\-:]\s*/i;

  const aPos = mainContent.search(optARegex);
  const bPos = mainContent.search(optBRegex);
  const cPos = mainContent.search(optCRegex);
  const dPos = mainContent.search(optDRegex);

  let prompt = mainContent;
  const options: string[] = ['', '', '', ''];
  let needsReview = false;
  let reviewReason = '';

  if (aPos !== -1 && bPos !== -1 && cPos !== -1 && dPos !== -1 && aPos < bPos && bPos < cPos && cPos < dPos) {
    // Tách prompt
    prompt = mainContent.substring(0, aPos).replace(/^(?:Câu|Bài|\[Câu)\s*\d+[\s:.\-\]]+/i, '').trim();

    // Làm sạch các thẻ phân loại nếu có trong prompt
    prompt = prompt.replace(/\[(?:Nhận biết|Thông hiểu|Vận dụng|Vận dụng cao)\]/gi, '')
                   .replace(/\[(?:Khối|Lớp)\s*(?:10|11|12)\]/gi, '').trim();

    // Tách phương án
    options[0] = mainContent.substring(aPos, bPos).replace(optARegex, '').trim();
    options[1] = mainContent.substring(bPos, cPos).replace(optBRegex, '').trim();
    options[2] = mainContent.substring(cPos, dPos).replace(optCRegex, '').trim();
    options[3] = mainContent.substring(dPos).replace(optDRegex, '').trim();

    // Làm sạch đáp án thừa nếu dính vào option D
    options[3] = options[3].replace(/(?:Đáp án|Chọn|Đ\/A)[\s:.\-]+[A-D].*$/i, '').trim();
  } else {
    // Không tách được 4 phương án chuẩn
    needsReview = true;
    reviewReason = 'Chưa nhận diện đầy đủ 4 phương án A, B, C, D';
    prompt = mainContent.replace(/^(?:Câu|Bài|\[Câu)\s*\d+[\s:.\-\]]+/i, '').trim();
    options[0] = 'Phương án A (cần kiểm tra lại)';
    options[1] = 'Phương án B (cần kiểm tra lại)';
    options[2] = 'Phương án C (cần kiểm tra lại)';
    options[3] = 'Phương án D (cần kiểm tra lại)';
  }

  // Nếu chưa nhận diện được đáp án
  if (correctOptionIndex === -1) {
    needsReview = true;
    reviewReason = reviewReason ? `${reviewReason} • Chưa nhận diện đáp án đúng` : 'Chưa nhận diện đáp án đúng';
    correctOptionIndex = 0; // Tạm mặc định A để giáo viên sửa
  }

  return {
    questionNumber: qNum,
    prompt: prompt || `Nội dung câu hỏi ${qNum}`,
    options,
    correctOptionIndex,
    explanation: explanation || 'Lời giải chi tiết đang được cập nhật.',
    difficulty,
    grade,
    lessonCode: 'BD-01',
    needsReview,
    reviewReason: reviewReason || undefined
  };
}
