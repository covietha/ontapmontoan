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

export type ParsedQType = 'mcq' | 'true_false' | 'short_answer' | 'essay';

export interface ParsedWordQuestion {
  /** Dạng câu: trắc nghiệm, đúng/sai, trả lời ngắn, tự luận */
  type: ParsedQType;
  /** Câu đúng/sai: nội dung 4 ý a, b, c, d và đáp án đúng (true = Đúng) */
  statements: string[];
  truths: boolean[];
  /** Câu trả lời ngắn: các đáp án được chấp nhận */
  acceptedAnswers: string[];
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

  const sections = findSections(normalized);

  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    let block = normalized.substring(startIndex, endIndex).trim();
    // Dòng tiêu đề "PHẦN I/II/III/IV" nằm cuối khối trước: bỏ khỏi nội dung câu
    block = block.replace(PART_HEADER_LINE, '').trim();

    const parsed = parseBlock(block, matches[i].number, sectionAt(sections, startIndex));
    if (parsed) {
      questions.push(parsed);
    }
  }

  return { questions, errors };
}


/* ───────────── Nhận dạng 4 dạng câu hỏi ───────────── */

const PART_HEADER_LINE = /(?:^|\n)[ \t]*PH[ẦA]N\s*(?:IV|III|II|I|[1-4])\b[^\n]*/gi;

function partToType(label: string): ParsedQType {
  const v = label.toUpperCase();
  if (v === 'I' || v === '1') return 'mcq';
  if (v === 'II' || v === '2') return 'true_false';
  if (v === 'III' || v === '3') return 'short_answer';
  return 'essay';
}

function findSections(text: string): { index: number; type: ParsedQType }[] {
  const out: { index: number; type: ParsedQType }[] = [];
  const re = /(?:^|\n)[ \t]*PH[ẦA]N\s*(IV|III|II|I|[1-4])\b[^\n]*/gi;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ index: m.index, type: partToType(m[1]) });
  return out;
}

function sectionAt(sections: { index: number; type: ParsedQType }[], idx: number): ParsedQType | null {
  let t: ParsedQType | null = null;
  for (const s of sections) if (s.index <= idx) t = s.type;
  return t;
}

/** Đổi "Đúng/Sai/Đ/S" thành true/false */
function toTruth(token: string): boolean | null {
  const t = token.trim().toLowerCase();
  if (t === 'đ' || t === 'đúng' || t === 'd' || t === 'true') return true;
  if (t === 's' || t === 'sai' || t === 'false') return false;
  return null;
}

/** Đọc dòng đáp án đúng/sai: "a-Đ, b-S, c-Đ, d-S", "a) Đúng b) Sai ...", "ĐSĐS", "Đ S Đ S" */
function parseTruths(answerText: string): boolean[] | null {
  const labelled: (boolean | null)[] = [null, null, null, null];
  const re = /\b([a-d])\s*[).:\-=]*\s*(Đúng|Sai|Đ|S)(?![a-zà-ỹ])/gi;
  let m;
  while ((m = re.exec(answerText)) !== null) {
    labelled[m[1].toLowerCase().charCodeAt(0) - 97] = toTruth(m[2]);
  }
  if (labelled.every((v) => v !== null)) return labelled as boolean[];

  const letters = answerText
    .replace(/Đúng/gi, 'Đ').replace(/Sai/gi, 'S')
    .match(/[ĐSđs]/g);
  if (letters && letters.length === 4) return letters.map((l) => toTruth(l) as boolean);
  return null;
}

function cleanTags(prompt: string): string {
  return prompt
    .replace(/\[(?:Nhận biết|Thông hiểu|Vận dụng cao|Vận dụng)\]/gi, '')
    .replace(/\[(?:Khối|Lớp)\s*(?:10|11|12)\]/gi, '')
    .replace(/\[(?:Trắc nghiệm|Đúng\s*\/?\s*Sai|ĐS|Trả lời ngắn|TLN|Tự luận)\]/gi, '')
    .replace(/^(?:Câu|Bài|\[Câu)\s*\d+[\s:.\-\]]+/i, '')
    .trim();
}

function detectType(block: string, section: ParsedQType | null): ParsedQType {
  if (/\[\s*Tự luận\s*\]/i.test(block)) return 'essay';
  if (/\[\s*(?:Đúng\s*\/?\s*Sai|ĐS)\s*\]/i.test(block)) return 'true_false';
  if (/\[\s*(?:Trả lời ngắn|TLN)\s*\]/i.test(block)) return 'short_answer';
  if (/\[\s*Trắc nghiệm\s*\]/i.test(block)) return 'mcq';
  if (section) return section;
  if (/(?:^|\n)\s*a[).]\s*[\s\S]*?(?:^|\n)\s*b[).]\s*[\s\S]*?(?:^|\n)\s*c[).]\s*[\s\S]*?(?:^|\n)\s*d[).]/.test(block)) return 'true_false';
  if (/(?:^|\n|\s)A[).:]\s[\s\S]*(?:\n|\s)B[).:]\s[\s\S]*(?:\n|\s)C[).:]\s[\s\S]*(?:\n|\s)D[).:]\s/.test(block)) return 'mcq';
  if (/(?:Đáp án|Đ\/A|Kết quả)[\s:.\-]+\S/i.test(block)) return 'short_answer';
  return 'mcq';
}

function parseBlock(block: string, qNum: number, section: ParsedQType | null): ParsedWordQuestion | null {
  const type = detectType(block, section);
  const base = parseSingleQuestionBlock(block, qNum);
  if (!base) return null;
  const empty = { statements: [] as string[], truths: [] as boolean[], acceptedAnswers: [] as string[] };

  if (type === 'mcq') return { ...base, type, ...empty };

  // Tách phần lời giải để không lẫn vào đáp án
  let explanation = base.explanation;
  let main = block;
  const expMatch = /(?:Lời giải|Hướng dẫn giải|HDG)[\s:.\-]+([\s\S]*)$/i.exec(block);
  if (expMatch) main = block.substring(0, expMatch.index).trim();
  if (!expMatch) explanation = '';

  if (type === 'essay') {
    const prompt = cleanTags(main.replace(/(?:Đáp án|Đ\/A)[\s:.\-]+[\s\S]*$/i, ''));
    return {
      ...base, type, ...empty, prompt: prompt || base.prompt, options: ['', '', '', ''], correctOptionIndex: -1,
      explanation: explanation || 'Chưa có hướng dẫn chấm.', needsReview: false, reviewReason: undefined
    };
  }

  const ansMatch = /(?:Đáp án|Đ\/A|Kết quả)[\s:.\-]+([^\n]*(?:\n(?!\s*(?:Câu|Bài|Lời giải|HDG))[^\n]*)?)/i.exec(main);
  const answerText = ansMatch ? ansMatch[1].trim() : '';
  const beforeAnswer = ansMatch ? main.substring(0, ansMatch.index).trim() : main;

  if (type === 'true_false') {
    const re = /(?:^|\n)[ \t]*([a-d])[).][ \t]*/g;
    const marks: { idx: number; len: number; letter: string }[] = [];
    let m;
    while ((m = re.exec(beforeAnswer)) !== null) marks.push({ idx: m.index, len: m[0].length, letter: m[1] });
    const inOrder = marks.length >= 4 && ['a', 'b', 'c', 'd'].every((l, i) => marks[i]?.letter === l);
    const statements = ['', '', '', ''];
    let prompt = beforeAnswer;
    let review = '';
    if (inOrder) {
      prompt = beforeAnswer.substring(0, marks[0].idx);
      for (let i = 0; i < 4; i++) {
        const end = i < 3 ? marks[i + 1].idx : beforeAnswer.length;
        statements[i] = beforeAnswer.substring(marks[i].idx + marks[i].len, end).trim();
      }
    } else {
      review = 'Chưa nhận diện đủ 4 ý a), b), c), d)';
      statements.fill('(cần nhập lại)');
    }
    const truths = parseTruths(answerText);
    if (!truths) review = review ? `${review} • Chưa nhận diện đáp án Đúng/Sai của 4 ý` : 'Chưa nhận diện đáp án Đúng/Sai của 4 ý';
    return {
      ...base, type, acceptedAnswers: [], statements, truths: truths || [true, true, true, true],
      prompt: cleanTags(prompt) || base.prompt, options: ['', '', '', ''], correctOptionIndex: -1,
      explanation: explanation || 'Lời giải chi tiết đang được cập nhật.',
      needsReview: !!review, reviewReason: review || undefined
    };
  }

  // short_answer
  const accepted = answerText.split(/[;|]|\s+hoặc\s+/i).map((a) => a.replace(/^\$|\$$/g, '').trim()).filter(Boolean);
  const review = accepted.length === 0 ? 'Chưa nhận diện đáp án của câu trả lời ngắn' : '';
  return {
    ...base, type, statements: [], truths: [], acceptedAnswers: accepted,
    prompt: cleanTags(beforeAnswer) || base.prompt, options: ['', '', '', ''], correctOptionIndex: -1,
    explanation: explanation || 'Lời giải chi tiết đang được cập nhật.',
    needsReview: !!review, reviewReason: review || undefined
  };
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
    type: 'mcq',
    statements: [],
    truths: [],
    acceptedAnswers: [],
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

/** Hiển thị câu trả lời của học sinh ở mọi dạng câu hỏi: A–D, Đ/S theo từng ý, hoặc chuỗi đã nhập. */
export function formatAnswer(v: unknown): string {
  if (typeof v === 'number') return ['A', 'B', 'C', 'D'][v] ?? String(v);
  if (Array.isArray(v)) return v.map((x, i) => `${'abcd'[i]}-${x === true ? 'Đ' : x === false ? 'S' : '?'}`).join('  ');
  if (typeof v === 'string' && v.trim()) return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  return 'Chưa trả lời';
}
