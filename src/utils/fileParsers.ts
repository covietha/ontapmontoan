import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Question, QuestionDifficulty, QuestionType } from '../types';
import { readDocxRich, type RichDocx } from './docxReader';
import { registerImage } from './imageStore';
import { parseQuestionText, type ParsedWordQuestion, type ParsedExamMeta } from './questionParser';

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
  const sampleContent = `MẪU SOẠN ĐỀ THI TOÁN THPT (cấu trúc đề tốt nghiệp: 3 dạng câu hỏi)

Quy ước chung:
- Mỗi câu bắt đầu bằng "Câu 1:", "Câu 2:"... Có thể ghi thêm thẻ [Nhận biết] [Thông hiểu] [Vận dụng] [Vận dụng cao] và [Khối 12].
- Công thức viết trong $...$, ví dụ $y = \\frac{2x + 1}{x - 3}$.
- Dòng "PHẦN I", "PHẦN II", "PHẦN III", "PHẦN IV" cho hệ thống biết dạng câu hỏi (có thể không ghi, hệ thống tự nhận dạng).
- Dòng "Đáp án:" và "Lời giải:" nằm cuối mỗi câu.

PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn (4 phương án, chọn 1)

Câu 1: [Nhận biết] [Khối 12] Đạo hàm của hàm số $y = x^3$ là:
A. $y' = 3x^2$
B. $y' = x^2$
C. $y' = 3x$
D. $y' = x^3$
Đáp án: A
Lời giải: Áp dụng $(x^n)' = nx^{n-1}$.

PHẦN II. Câu trắc nghiệm đúng sai (mỗi câu có 4 ý a, b, c, d)

Câu 2: [Thông hiểu] [Khối 12] Cho hàm số $y = x^3 - 3x$. Xét tính đúng sai của các mệnh đề sau:
a) Hàm số có đạo hàm $y' = 3x^2 - 3$.
b) Hàm số đồng biến trên $\\mathbb{R}$.
c) Hàm số có hai điểm cực trị.
d) Giá trị cực đại của hàm số bằng $2$.
Đáp án: a-Đ, b-S, c-Đ, d-Đ
Lời giải: $y' = 3x^2 - 3$ đổi dấu tại $x = \\pm 1$ nên có hai cực trị, $y_{CĐ} = y(-1) = 2$.

PHẦN III. Câu trả lời ngắn (đáp án là một số)

Câu 3: [Vận dụng] [Khối 12] Giá trị lớn nhất của hàm số $y = -x^2 + 4x + 1$ bằng bao nhiêu?
Đáp án: 5
Lời giải: $y = -(x-2)^2 + 5$ nên giá trị lớn nhất bằng $5$.

(Có thể ghi nhiều đáp án chấp nhận, ngăn cách bằng dấu chấm phẩy: Đáp án: 12,5; 12.5)

PHẦN IV. Tự luận (chỉ dùng cho đề lớp 10, lớp 11; giáo viên chấm)

(Đề lớp 10, 11: PHẦN I và II ghi mức Nhận biết hoặc Thông hiểu; PHẦN III ghi Thông hiểu hoặc Vận dụng; PHẦN IV ghi Vận dụng hoặc Vận dụng cao. Mỗi ý tự luận có thể ghi điểm, ví dụ "a) (0,5 điểm) …".)

Câu 4: [Vận dụng] [Khối 10] Giải phương trình $x^2 - 5x + 6 = 0$.
Lời giải: $\\Delta = 1$, nên $x = 2$ hoặc $x = 3$.`;

  const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mau_Soan_De_Toan_THPT.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type { ParsedQType, ParsedWordQuestion, ParsedExamMeta } from './questionParser';
export { parseQuestionText } from './questionParser';

/**
 * Đọc file Word (.docx) chứa đề thi / câu hỏi: giữ hình vẽ, bảng biến thiên, đồ thị
 * và nhận dạng công thức (MathType, Equation Word) chuyển thành LaTeX.
 */
export async function parseDocxFile(file: File): Promise<{
  questions: ParsedWordQuestion[];
  rawText: string;
  errors: string[];
  meta: ParsedExamMeta;
  stats?: RichDocx['stats'];
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    let rawText = '';
    let stats: RichDocx['stats'] | undefined;
    const warnings: string[] = [];
    try {
      const rich = await readDocxRich(arrayBuffer);
      rawText = rich.text;
      stats = rich.stats;
      warnings.push(...rich.warnings);
      for (const [id, url] of Object.entries(rich.images)) registerImage(id, url);
    } catch (e: any) {
      // Dự phòng: chỉ lấy chữ thuần
      const result = await mammoth.extractRawText({ arrayBuffer });
      rawText = result.value;
      warnings.push(`Không đọc được hình và công thức (${e?.message || 'lỗi lạ'}); chỉ lấy được chữ.`);
    }
    const parsed = parseQuestionText(rawText);
    return { questions: parsed.questions, rawText, errors: [...parsed.errors, ...warnings], meta: parsed.meta, stats };
  } catch (err: any) {
    return {
      questions: [], rawText: '', meta: {},
      errors: [`Không thể đọc file Word: ${err?.message || 'File hỏng hoặc không đúng định dạng .docx'}`]
    };
  }
}

/** Hiển thị câu trả lời của học sinh ở mọi dạng câu hỏi: A–D, Đ/S theo từng ý, hoặc chuỗi đã nhập. */
export function formatAnswer(v: unknown): string {
  if (typeof v === 'number') return ['A', 'B', 'C', 'D'][v] ?? String(v);
  if (Array.isArray(v)) return v.map((x, i) => `${'abcd'[i]}-${x === true ? 'Đ' : x === false ? 'S' : '?'}`).join('  ');
  if (typeof v === 'string' && v.trim()) return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  return 'Chưa trả lời';
}
