export interface ServerQuestionKey {
  questionId: string;
  correctOptionIndex: number; // 0=A, 1=B, 2=C, 3=D
  explanation: string;
}

export interface ServerExam {
  id: string;
  title: string;
  code: string;
  durationMinutes: number;
  totalQuestions: number;
  questionIds: string[];
}

/**
 * BẢNG ĐÁP ÁN CHUẨN VÀ LỜI GIẢI MẬT (SERVER-ONLY SECRET QUESTION KEYS)
 * Lưu trữ độc quyền phía máy chủ đáng tin cậy.
 * Tuyệt đối không được import vào bất kỳ file nào trong thư mục src/ của frontend.
 */
export const OFFICIAL_QUESTION_KEYS: Record<string, ServerQuestionKey> = {
  'Q-DH-001': {
    questionId: 'Q-DH-001',
    correctOptionIndex: 0, // A
    explanation: `Áp dụng công thức giải nhanh đạo hàm của hàm phân thức bậc nhất trên bậc nhất:
$$y = \\frac{ax+b}{cx+d} \\implies y' = \\frac{ad - bc}{(cx+d)^2}$$
Ở đây $a = 2, b = 1, c = 1, d = -3$.
Tử số:
$$ad - bc = 2 \\cdot (-3) - 1 \\cdot 1 = -6 - 1 = -7$$
Mẫu số: $(x - 3)^2$.
Do đó:
$$y' = \\frac{-7}{(x-3)^2}$$
Đáp án đúng là A.`
  },
  'Q-DH-002': {
    questionId: 'Q-DH-002',
    correctOptionIndex: 0, // A
    explanation: `Áp dụng công thức đạo hàm hàm hợp lũy thừa:
$$(u^n)' = n \\cdot u^{n-1} \\cdot u'$$
Với $u = x^2 - 2x + 3$, ta có $u' = 2x - 2$.
Suy ra: $y' = 3(x^2 - 2x + 3)^2 \\cdot (2x - 2)$.
Tại $x = 2$: $u(2) = 3$ và $u'(2) = 2$.
Do đó: $y'(2) = 3 \\cdot (3^2) \\cdot 2 = 54$.
Đáp án chuẩn là A.`
  },
  'Q-DH-003': {
    questionId: 'Q-DH-003',
    correctOptionIndex: 1, // B
    explanation: `Bước 1: Tập xác định $D = \\mathbb{R}$.
Bước 2: Tính đạo hàm $y' = -3x^2 + 3$.
Bước 3: Giải $y' = 0 \\iff x = -1$ hoặc $x = 1$.
Bước 4: Xét dấu $y'$: hệ số $a = -3 < 0$, trong khoảng $(-1; 1)$ thì $y' > 0 \\implies$ hàm số đồng biến.
Vậy hàm số đồng biến trên khoảng $(-1; 1)$.
Đáp án đúng là B.`
  },
  'Q-DH-004': {
    questionId: 'Q-DH-004',
    correctOptionIndex: 1, // B
    explanation: `Tập xác định $D = \\mathbb{R} \\setminus \\{-1\\}$.
Đạo hàm:
$$y' = \\frac{1 \\cdot 1 - (-2) \\cdot 1}{(x+1)^2} = \\frac{3}{(x+1)^2} > 0, \\quad \\forall x \\neq -1$$
Vì $y' > 0$ trên từng khoảng xác định nên hàm số đồng biến trên $(-\\infty; -1)$ và $(-1; +\\infty)$.
Lưu ý: Không dùng ký hiệu hợp U khi kết luận khoảng đơn điệu.
Đáp án đúng là B.`
  },
  'Q-DH-005': {
    questionId: 'Q-DH-005',
    correctOptionIndex: 0, // A
    explanation: `Tập xác định $D = \\mathbb{R} \\setminus \\{m - 3\\}$.
Đạo hàm nhanh:
$$y' = \\frac{1 \\cdot (-m + 3) - 2m \\cdot 1}{(x - m + 3)^2} = \\frac{3 - 3m}{(x - m + 3)^2}$$
Hàm số đồng biến trên từng khoảng xác định khi và chỉ khi:
$$3 - 3m > 0 \\iff m < 1$$
(Tuyệt đối không có dấu bằng).
Đáp án đúng là A.`
  },
  'Q-DH-006': {
    questionId: 'Q-DH-006',
    correctOptionIndex: 1, // B
    explanation: `Cần phân biệt rõ:
- "Điểm cực đại của hàm số" là x, ở đây $x = 2$.
- "Giá trị cực đại của hàm số" là y, ở đây $y = f(2) = 5$.
Đề bài hỏi "Giá trị cực đại", nên kết quả là y = 5.
Đáp án đúng là B.`
  },
  'Q-DH-007': {
    questionId: 'Q-DH-007',
    correctOptionIndex: 0, // A
    explanation: `Hàm trùng phương $y = ax^4 + bx^2 + c$ có 3 điểm cực trị khi và chỉ khi $ab < 0$.
Phương án A: $a = 1, b = -2 \\implies ab = -2 < 0 \\implies$ có 3 điểm cực trị.
Đáp án đúng là A.`
  },
  'Q-DH-008': {
    questionId: 'Q-DH-008',
    correctOptionIndex: 1, // B
    explanation: `Đạo hàm $f'(x) = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\iff x = 0, 1, -1$.
Trên đoạn $[0; 2]$:
$f(0) = 3$; $f(1) = 2$; $f(2) = 11$.
Giá trị nhỏ nhất là 2 đạt tại $x = 1$.
Đáp án đúng là B.`
  },
  'Q-DH-009': {
    questionId: 'Q-DH-009',
    correctOptionIndex: 1, // B
    explanation: `Đạo hàm $y' = \\frac{3}{(x+1)^2} > 0, \\forall x \\in [0; 3]$.
Hàm số đồng biến trên $[0; 3]$ nên giá trị lớn nhất đạt tại đầu mút phải $x = 3$:
$$\\max_{[0; 3]} y = y(3) = \\frac{2(3) - 1}{3 + 1} = \\frac{5}{4}$$
Đáp án đúng là B.`
  },
  'Q-DH-010': {
    questionId: 'Q-DH-010',
    correctOptionIndex: 0, // A
    explanation: `Cho mẫu số bằng $0 \\iff x + 1 = 0 \\iff x = -1$.
Tử số tại $x = -1$ bằng $-5 \\neq 0$.
Do đó đường tiệm cận đứng là $x = -1$.
Đáp án đúng là A.`
  }
};

/**
 * DANH SÁCH ĐỀ THI ĐƯỢC PHÁT HÀNH HỢP LỆ TRÊN MÁY CHỦ
 * Giới hạn chặt chẽ danh sách đề, chống gửi mã examId tùy ý
 */
export const OFFICIAL_EXAMS: ServerExam[] = [
  {
    id: 'exam-chuyen-de-dao-ham-01',
    title: 'Đề Ôn Luyện Đạo Hàm & Đồ Thị Hàm Số – Chuẩn Cấu Trúc THPT',
    code: 'DE-THI-DH-10C',
    durationMinutes: 15,
    totalQuestions: 10,
    questionIds: [
      'Q-DH-001', 'Q-DH-002', 'Q-DH-003', 'Q-DH-004', 'Q-DH-005',
      'Q-DH-006', 'Q-DH-007', 'Q-DH-008', 'Q-DH-009', 'Q-DH-010'
    ]
  },
  {
    id: 'exam-dao-ham-01',
    title: 'Đề Ôn Luyện Trọng Tâm: Khảo Sát & Đồ Thị Hàm Số 12',
    code: 'DE-THI-DH-01',
    durationMinutes: 20,
    totalQuestions: 10,
    questionIds: [
      'Q-DH-001', 'Q-DH-002', 'Q-DH-003', 'Q-DH-004', 'Q-DH-005',
      'Q-DH-006', 'Q-DH-007', 'Q-DH-008', 'Q-DH-009', 'Q-DH-010'
    ]
  }
];
