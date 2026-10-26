import { Topic, Lesson, Question, Exam, Classroom, StudentProfile } from '../types';

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'topic-dao-ham',
    title: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
    description: 'Chuyên đề trọng tâm chiếm 10-12 câu trong đề thi tốt nghiệp THPT (Đơn điệu, Cực trị, Max-Min, Tiệm cận, Đồ thị và Tham số m)',
    order: 1,
    grade: 12,
    icon: 'Activity',
    status: 'sample_needs_review',
  },
  {
    id: 'topic-mu-logarit',
    title: 'Hàm số luỹ thừa, hàm số mũ và hàm số logarit',
    description: 'Công thức lũy thừa, logarit, đạo hàm, đồ thị và phương trình - bất phương trình mũ/logarit',
    order: 2,
    grade: 12,
    icon: 'TrendingUp',
    status: 'sample_needs_review',
  },
  {
    id: 'topic-nguyen-ham',
    title: 'Nguyên hàm, tích phân và ứng dụng hình học',
    description: 'Bảng nguyên hàm, phương pháp đổi biến, từng phần, tính diện tích hình phẳng và thể tích khối tròn xoay',
    order: 3,
    grade: 12,
    icon: 'Maximize2',
    status: 'sample_needs_review',
  },
  {
    id: 'topic-toa-do-khong-gian',
    title: 'Phương pháp toạ độ trong không gian Oxyz',
    description: 'Toạ độ vectơ, điểm, phương trình mặt phẳng, đường thẳng và mặt cầu',
    order: 4,
    grade: 12,
    icon: 'Box',
    status: 'sample_needs_review',
  },
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'lesson-quy-tac-dao-ham',
    topicId: 'topic-dao-ham',
    lessonCode: 'BD-01-QUY-TAC-DAO-HAM',
    title: 'Quy tắc và công thức tính đạo hàm trọng tâm',
    objectives: [
      'Nắm vững bảng đạo hàm hàm số sơ cấp cơ bản và đạo hàm hàm hợp.',
      'Sử dụng thành thạo quy tắc đạo hàm tổng, hiệu, tích, thương.',
      'Áp dụng công thức giải nhanh đạo hàm phân thức bậc nhất trên bậc nhất: $( \\frac{ax+b}{cx+d} )\' = \\frac{ad - bc}{(cx+d)^2}$.',
      'Tránh lỗi sai kinh điển: quên nhân $u\'$ khi tính đạo hàm hàm hợp.'
    ],
    theorySummary: `Đạo hàm là công cụ nền tảng xuyên suốt toàn bộ chương trình Toán 12. Khi học sinh làm sai các bài toán về tính đơn điệu, cực trị hay tiếp tuyến, hơn 60% nguyên nhân xuất phát từ việc tính sai biểu thức đạo hàm $y'$.
    
Quy tắc cơ bản:
1. Đạo hàm hàm hợp: Nếu $y = f(u)$ và $u = u(x)$ thì $y'_x = y'_u \\cdot u'_x$.
2. Đạo hàm của tích: $(u \\cdot v)' = u'v + uv'$.
3. Đạo hàm của thương: $(\\frac{u}{v})' = \\frac{u'v - uv'}{v^2}$ ($v \\neq 0$).`,
    formulas: [
      {
        name: 'Đạo hàm lũy thừa hàm hợp',
        latex: '(u^n)\' = n \\cdot u^{n-1} \\cdot u\' \\quad (n \\in \\mathbb{R})',
        note: 'Bắt buộc nhân thêm u\'(x)'
      },
      {
        name: 'Đạo hàm căn bậc hai hàm hợp',
        latex: '(\\sqrt{u})\' = \\frac{u\'}{2\\sqrt{u}} \\quad (u > 0)',
        note: 'Lỗi thường gặp: quên số 2 ở mẫu hoặc thiếu u\''
      },
      {
        name: 'Công thức giải nhanh phân thức bậc nhất / bậc nhất',
        latex: 'y = \\frac{ax+b}{cx+d} \\implies y\' = \\frac{ad - bc}{(cx+d)^2}',
        note: 'Nhớ quy tắc nhân chéo: huyền trừ sắc (ad - bc). Không có biến x trên tử!'
      },
      {
        name: 'Đạo hàm phân thức bậc hai / bậc nhất',
        latex: 'y = \\frac{ax^2+bx+c}{dx+e} \\implies y\' = \\frac{ad x^2 + 2ae x + (be - cd)}{(dx+e)^2}',
        note: 'Áp dụng định thức nhanh'
      }
    ],
    stepByStepExamples: [
      {
        title: 'Ví dụ 1: Tính đạo hàm của hàm hợp lũy thừa',
        problem: 'Tính đạo hàm của hàm số $y = (3x^2 - 2x + 1)^4$.',
        solutionSteps: [
          'Bước 1: Xác định hàm hợp với $u = 3x^2 - 2x + 1$, khi đó $y = u^4$.',
          'Bước 2: Tính $u\' = (3x^2 - 2x + 1)\' = 6x - 2$.',
          'Bước 3: Áp dụng $(u^4)\' = 4 u^3 \\cdot u\'$, ta được: $y\' = 4(3x^2 - 2x + 1)^3 \\cdot (6x - 2) = 8(3x - 1)(3x^2 - 2x + 1)^3$.'
        ],
        note: 'Học sinh rất hay quên nhân thêm (6x - 2).'
      },
      {
        title: 'Ví dụ 2: Đạo hàm nhanh hàm phân thức $y = \\frac{2x - 3}{x + 1}$',
        problem: 'Tính đạo hàm của hàm số $y = \\frac{2x - 3}{x + 1}$ trên từng khoảng xác định.',
        solutionSteps: [
          'Bước 1: Xác định các hệ số: $a = 2, b = -3, c = 1, d = 1$.',
          'Bước 2: Tính định thức chéo ở tử số: $ad - bc = 2 \\cdot 1 - (-3) \\cdot 1 = 2 + 3 = 5$.',
          'Bước 3: Viết kết quả: $y\' = \\frac{5}{(x+1)^2}$. Nhận xét: $y\' > 0, \\forall x \\neq -1$.'
        ]
      }
    ],
    commonMistakes: [
      {
        mistakeTitle: 'Quên nhân u\' khi lấy đạo hàm hàm hợp',
        explanation: 'Học sinh tính $((2x+1)^3)\' = 3(2x+1)^2$. Đây là sai sót nghiêm trọng.',
        correction: 'Chính xác phải là $3(2x+1)^2 \\cdot (2x+1)\' = 6(2x+1)^2$.'
      },
      {
        mistakeTitle: 'Nhầm dấu âm / dương khi tính ad - bc',
        explanation: 'Với $y = \\frac{x - 4}{2x + 1}$, học sinh tính $ad - bc = 1 \\cdot 1 - 2 \\cdot 4 = -7$ (nhầm dấu $b = -4$).',
        correction: 'Chính xác: $a=1, b=-4, c=2, d=1 \\implies ad - bc = 1 \\cdot 1 - (-4) \\cdot 2 = 1 + 8 = 9$.'
      }
    ],
    relatedPracticeQuestionIds: ['Q-DH-001', 'Q-DH-002'],
    status: 'sample_needs_review',
    updatedAt: '2026-10-22',
  },
  {
    id: 'lesson-tinh-don-dieu',
    topicId: 'topic-dao-ham',
    lessonCode: 'BD-02-TINH-DON-DIEU',
    title: 'Xét dấu đạo hàm và tính đơn điệu của hàm số',
    objectives: [
      'Hiểu rõ mối liên hệ giữa dấu của $y\'$ và chiều biến thiên của hàm số.',
      'Lập thành thạo bảng xét dấu $y\'$ và bảng biến thiên.',
      'Tìm đúng các khoảng đồng biến, nghịch biến của hàm đa thức, phân thức.',
      'Giải bài toán tìm tham số $m$ để hàm số đơn điệu trên khoảng/tập xác định.',
      'Tránh lỗi dùng ký hiệu hợp $\\cup$ hoặc hiệu $\\setminus$ khi kết luận khoảng đơn điệu.'
    ],
    theorySummary: `Định lý quan trọng (Tính đơn điệu):
Cho hàm số $y = f(x)$ có đạo hàm trên khoảng $K$:
- Nếu $f'(x) > 0, \\forall x \\in K$ thì hàm số $f(x)$ đồng biến trên $K$.
- Nếu $f'(x) < 0, \\forall x \\in K$ thì hàm số $f(x)$ nghịch biến trên $K$.
- Định lý mở rộng: Nếu $f'(x) \\ge 0$ (hoặc $f'(x) \\le 0$), $\\forall x \\in K$ và đẳng thức $f'(x) = 0$ chỉ xảy ra tại một số hữu hạn điểm thì hàm số đồng biến (hoặc nghịch biến) trên $K$.
* LƯU Ý ĐẶC BIỆT: Với hàm phân thức bậc nhất / bậc nhất $y = \\frac{ax+b}{cx+d}$, đạo hàm $y' = \\frac{ad-bc}{(cx+d)^2}$ KHÔNG BAO GIỜ có dấu bằng, tức chỉ có $y' > 0$ hoặc $y' < 0$.`,
    formulas: [
      {
        name: 'Điều kiện đồng biến trên khoảng K',
        latex: 'y\' \\ge 0, \\forall x \\in K \\quad (y\' = 0 \\text{ tại hữu hạn điểm})',
        note: 'Đồ thị đi lên từ trái sang phải'
      },
      {
        name: 'Điều kiện nghịch biến trên khoảng K',
        latex: 'y\' \\le 0, \\forall x \\in K \\quad (y\' = 0 \\text{ tại hữu hạn điểm})',
        note: 'Đồ thị đi xuống từ trái sang phải'
      },
      {
        name: 'Hàm bậc nhất / bậc nhất đồng biến',
        latex: 'y = \\frac{ax+b}{cx+d} \\text{ đồng biến trên từng khoảng TXĐ} \\iff ad - bc > 0',
        note: 'Tuyệt đối KHÔNG có dấu bằng (ad - bc > 0)'
      },
      {
        name: 'Hàm bậc ba đồng biến trên R',
        latex: 'y = ax^3 + bx^2 + cx + d \\ (a \\neq 0) \\text{ đồng biến trên } \\mathbb{R} \\iff \\begin{cases} a > 0 \\\\ \\Delta_{y\'} \\le 0 \\end{cases}',
        note: 'Nếu a chứa tham số thì phải xét riêng trường hợp a = 0'
      }
    ],
    stepByStepExamples: [
      {
        title: 'Ví dụ 1: Tìm khoảng đơn điệu của hàm bậc ba',
        problem: 'Tìm các khoảng đồng biến và nghịch biến của hàm số $y = x^3 - 3x^2 - 9x + 5$.',
        solutionSteps: [
          'Bước 1: Tập xác định $D = \\mathbb{R}$.',
          'Bước 2: Tính đạo hàm: $y\' = 3x^2 - 6x - 9$.',
          'Bước 3: Giải phương trình $y\' = 0 \\iff 3(x^2 - 2x - 3) = 0 \\iff x = -1$ hoặc $x = 3$.',
          'Bước 4: Xét dấu $y\'$ (tam thức bậc hai có $a = 3 > 0$): trong khoảng $(-1; 3)$ thì $y\' < 0$; ngoài khoảng $(-\\infty; -1)$ và $(3; +\\infty)$ thì $y\' > 0$.',
          'Bước 5: Kết luận: Hàm số đồng biến trên mỗi khoảng $(-\\infty; -1)$ và $(3; +\\infty)$; nghịch biến trên khoảng $(-1; 3)$.'
        ],
        note: 'Dùng từ "và" hoặc chấm phẩy giữa các khoảng, không dùng dấu hợp U.'
      }
    ],
    commonMistakes: [
      {
        mistakeTitle: 'Dùng ký hiệu hợp (U) khi kết luận khoảng đồng biến',
        explanation: 'Học sinh viết: "Hàm số đồng biến trên $(-\\infty; -1) \\cup (3; +\\infty)$". Định nghĩa đơn điệu chỉ xét trên từng khoảng rời nhau.',
        correction: 'Phải viết: "Hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(3; +\\infty)$".'
      },
      {
        mistakeTitle: 'Thêm dấu bằng cho hàm phân thức bậc nhất / bậc nhất',
        explanation: 'Khi tìm m để hàm $y = \\frac{x+m}{x+1}$ đồng biến, học sinh cho $ad - bc \\ge 0$. Nếu $ad - bc = 0$ thì hàm trở thành hàm hằng (suy biến), không đơn điệu.',
        correction: 'Bắt buộc $ad - bc > 0$ (nghiêm ngặt).'
      }
    ],
    relatedPracticeQuestionIds: ['Q-DH-003', 'Q-DH-004', 'Q-DH-005'],
    status: 'sample_needs_review',
    updatedAt: '2026-10-22',
  },
  {
    id: 'lesson-cuc-tri',
    topicId: 'topic-dao-ham',
    lessonCode: 'BD-03-CUC-TRI',
    title: 'Cực trị của hàm số và các dạng toán thường gặp',
    objectives: [
      'Phân biệt rõ: Điểm cực trị của hàm số ($x$), Cực trị / Giá trị cực trị ($y$), và Điểm cực trị của đồ thị hàm số ($(x; y)$).',
      'Áp dụng thành thạo dấu hiệu 1 (đạo hàm đổi dấu) và dấu hiệu 2 ($y\'\'$).',
      'Đọc chính xác điểm cực đại, cực tiểu từ đồ thị $f(x)$ và từ đồ thị đạo hàm $f\'(x)$.',
      'Tìm điều kiện để hàm số bậc ba, hàm trùng phương có số điểm cực trị thỏa mãn điều kiện.'
    ],
    theorySummary: `Định nghĩa và Dấu hiệu Cực trị:
1. Dấu hiệu 1 (Quy tắc đổi dấu):
Nếu $f'(x)$ đổi dấu từ DƯƠNG (+) sang ÂM (-) khi $x$ đi qua $x_0$ theo chiều tăng dần $\\implies x_0$ là điểm CỰC ĐẠI.
Nếu $f'(x)$ đổi dấu từ ÂM (-) sang DƯƠNG (+) khi qua $x_0$ $\\implies x_0$ là điểm CỰC TIỂU.
* Lưu ý: Nếu $f'(x_0) = 0$ nhưng $f'(x)$ không đổi dấu khi qua $x_0$ thì $x_0$ KHÔNG PHẢI là điểm cực trị (ví dụ $y = x^3$).

2. Dấu hiệu 2: Giả sử $f'(x_0) = 0$ và có $f''(x_0)$:
- Nếu $f''(x_0) < 0 \\implies x_0$ là điểm CỰC ĐẠI.
- Nếu $f''(x_0) > 0 \\implies x_0$ là điểm CỰC TIỂU.`,
    formulas: [
      {
        name: 'Điều kiện cực đại (Dấu hiệu 2)',
        latex: '\\begin{cases} f\'(x_0) = 0 \\\\ f\'\'(x_0) < 0 \\end{cases} \\implies x_0 \\text{ là điểm cực đại}',
        note: 'f\'\' âm thì là cực đại (ngược với cảm tính)'
      },
      {
        name: 'Điều kiện cực tiểu (Dấu hiệu 2)',
        latex: '\\begin{cases} f\'(x_0) = 0 \\\\ f\'\'(x_0) > 0 \\end{cases} \\implies x_0 \\text{ là điểm cực tiểu}',
        note: 'f\'\' dương thì là cực tiểu'
      },
      {
        name: 'Số điểm cực trị của hàm trùng phương $y = ax^4 + bx^2 + c$',
        latex: 'ab < 0 \\implies 3 \\text{ điểm cực trị}; \\quad ab \\ge 0 \\implies 1 \\text{ điểm cực trị}',
        note: 'Áp dụng nhanh khi a != 0'
      }
    ],
    stepByStepExamples: [
      {
        title: 'Ví dụ 1: Tìm cực trị từ hàm số đa thức',
        problem: 'Tìm điểm cực tiểu và giá trị cực tiểu của hàm số $y = x^3 - 3x + 2$.',
        solutionSteps: [
          'Bước 1: $y\' = 3x^2 - 3 = 3(x^2 - 1)$.',
          'Bước 2: $y\' = 0 \\iff x = 1$ hoặc $x = -1$.',
          'Bước 3: Qua $x = -1$, $y\'$ đổi dấu từ (+) sang (-) $\\implies x = -1$ là điểm cực đại, $y_{CĐ} = y(-1) = 4$.',
          'Bước 4: Qua $x = 1$, $y\'$ đổi dấu từ (-) sang (+) $\\implies x = 1$ là điểm cực tiểu, $y_{CT} = y(1) = 0$.'
        ]
      }
    ],
    commonMistakes: [
      {
        mistakeTitle: 'Nhầm lẫn giữa x cực trị và y cực trị',
        explanation: 'Đề bài hỏi: "Giá trị cực đại của hàm số bằng bao nhiêu?". Học sinh khoanh đáp án $x = -1$ thay vì $y = 4$.',
        correction: '"Điểm cực trị của hàm số" là x. "Giá trị cực trị" (hoặc cực trị) là y. "Điểm cực trị của đồ thị" là cặp (x; y).'
      },
      {
        mistakeTitle: 'Đọc nhầm đồ thị f\'(x) thành đồ thị f(x)',
        explanation: 'Khi đề cho đồ thị đạo hàm y = f\'(x), học sinh lại nhìn đỉnh lồi/lõm của hình vẽ để tìm cực trị.',
        correction: 'Cực trị của f(x) là các giao điểm mà đồ thị f\'(x) CẮT (băng qua) trục hoành Ox.'
      }
    ],
    relatedPracticeQuestionIds: ['Q-DH-006', 'Q-DH-007'],
    status: 'sample_needs_review',
    updatedAt: '2026-10-22',
  },
  {
    id: 'lesson-gtln-gtnn',
    topicId: 'topic-dao-ham',
    lessonCode: 'BD-04-GTLN-GTNN',
    title: 'Giá trị lớn nhất và nhỏ nhất của hàm số (Max - Min)',
    objectives: [
      'Nắm vững phương pháp tìm Max, Min trên đoạn $[a; b]$.',
      'Tìm Max, Min trên khoảng mở $(a; b)$ hoặc trên tập xác định bằng bảng biến thiên.',
      'Sử dụng phương pháp đặt ẩn phụ và khảo sát hàm số.',
      'Tránh lỗi quên so sánh giá trị tại hai đầu mút $a$ và $b$.'
    ],
    theorySummary: `Quy tắc tìm GTLN, GTNN trên đoạn $[a; b]$:
Cho hàm số $y = f(x)$ liên tục trên đoạn $[a; b]$:
1. Tính đạo hàm $f'(x)$.
2. Tìm các nghiệm $x_1, x_2, \\dots, x_n$ của phương trình $f'(x) = 0$ thuộc khoảng $(a; b)$ (bỏ các nghiệm nằm ngoài đoạn).
3. Tính các giá trị: $f(a), f(b), f(x_1), f(x_2), \\dots, f(x_n)$.
4. So sánh các giá trị đã tính:
   - Số lớn nhất trong các số đó là $\\max_{[a; b]} f(x)$.
   - Số nhỏ nhất trong các số đó là $\\min_{[a; b]} f(x)$.`,
    formulas: [
      {
        name: 'GTLN trên đoạn [a; b]',
        latex: 'M = \\max_{[a; b]} f(x) = \\max \\{ f(a), f(b), f(x_i) \\}',
        note: 'Chỉ lấy x_i thuộc khoảng (a; b)'
      },
      {
        name: 'GTNN trên đoạn [a; b]',
        latex: 'm = \\min_{[a; b]} f(x) = \\min \\{ f(a), f(b), f(x_i) \\}',
        note: 'Chỉ lấy x_i thuộc khoảng (a; b)'
      }
    ],
    stepByStepExamples: [
      {
        title: 'Ví dụ: Tìm Max-Min của hàm bậc ba trên đoạn [-1; 2]',
        problem: 'Tìm giá trị lớn nhất và giá trị nhỏ nhất của hàm số $f(x) = x^3 - 3x^2 - 9x + 1$ trên đoạn $[-1; 2]$.',
        solutionSteps: [
          'Bước 1: Hàm số liên tục trên $[-1; 2]$.',
          'Bước 2: Tính $f\'(x) = 3x^2 - 6x - 9$. Giải $f\'(x) = 0 \\iff x = -1$ hoặc $x = 3$.',
          'Bước 3: Nghiệm $x = 3$ không thuộc $(-1; 2)$ nên LOẠI. Nghiệm $x = -1$ trùng đầu mút.',
          'Bước 4: Tính giá trị tại 2 đầu mút: $f(-1) = (-1)^3 - 3(-1)^2 - 9(-1) + 1 = 6$; $f(2) = 2^3 - 3(4) - 9(2) + 1 = -21$.',
          'Bước 5: Kết luận: $\\max_{[-1; 2]} f(x) = 6$ (tại $x = -1$) và $\\min_{[-1; 2]} f(x) = -21$ (tại $x = 2$).'
        ]
      }
    ],
    commonMistakes: [
      {
        mistakeTitle: 'Lấy nghiệm f\'(x)=0 nằm ngoài đoạn [a; b]',
        explanation: 'Tính được nghiệm $x=3$ nằm ngoài $[-1; 2]$ nhưng vẫn tính $f(3) = -26$ rồi kết luận min là $-26$.',
        correction: 'Chỉ giữ các nghiệm thuộc khoảng $(a; b)$, nghiệm ngoài đoạn phải loại ngay.'
      }
    ],
    relatedPracticeQuestionIds: ['Q-DH-008', 'Q-DH-009'],
    status: 'sample_needs_review',
    updatedAt: '2026-10-22',
  },
  {
    id: 'lesson-duong-tiem-can',
    topicId: 'topic-dao-ham',
    lessonCode: 'BD-05-DUONG-TIEM-CAN',
    title: 'Đường tiệm cận của đồ thị hàm số (Đứng, Ngang, Xiên)',
    objectives: [
      'Nắm chắc định nghĩa tiệm cận đứng và tiệm cận ngang thông qua giới hạn $\\lim$.',
      'Tìm nhanh tiệm cận đứng, ngang của đồ thị hàm phân thức $y = \\frac{ax+b}{cx+d}$.',
      'Nắm được tiệm cận xiên theo chương trình mới GDPT 2018 ($y = ax + b$).',
      'Tránh bẫy nghiệm của mẫu triệt tiêu nghiệm của tử số.'
    ],
    theorySummary: `1. Tiệm cận ngang:
Đường thẳng $y = y_0$ là tiệm cận ngang nếu ít nhất một trong các điều kiện sau thỏa mãn:
$\\lim_{x \\to +\\infty} f(x) = y_0$ hoặc $\\lim_{x \\to -\\infty} f(x) = y_0$.

2. Tiệm cận đứng:
Đường thẳng $x = x_0$ là tiệm cận đứng nếu ít nhất một trong các giới hạn sau bằng vô cực:
$\\lim_{x \\to x_0^+} f(x) = \\pm\\infty$ hoặc $\\lim_{x \\to x_0^-} f(x) = \\pm\\infty$.

3. Phân thức hữu tỉ $y = \\frac{P(x)}{Q(x)}$:
- Điểm $x_0$ làm $Q(x_0) = 0$ và $P(x_0) \\neq 0$ thì $x = x_0$ là TC đứng.
- Bậc tử = bậc mẫu: TCN $y = \\frac{\\text{hệ số cao nhất tử}}{\\text{hệ số cao nhất mẫu}}$.
- Bậc tử < bậc mẫu: TCN $y = 0$.
- Bậc tử > bậc mẫu (hơn 1 bậc): Có tiệm cận xiên.`,
    formulas: [
      {
        name: 'Tiệm cận hàm phân thức bậc nhất / bậc nhất',
        latex: 'y = \\frac{ax+b}{cx+d} \\implies \\text{TCĐ: } x = -\\frac{d}{c}; \\quad \\text{TCN: } y = \\frac{a}{c}',
        note: 'Áp dụng ngay không cần tính giới hạn'
      }
    ],
    stepByStepExamples: [
      {
        title: 'Ví dụ: Tìm tiệm cận của đồ thị hàm số',
        problem: 'Tìm số đường tiệm cận của đồ thị hàm số $y = \\frac{2x - 1}{x + 2}$.',
        solutionSteps: [
          'Bước 1: Tiệm cận đứng: Cho mẫu số $x + 2 = 0 \\iff x = -2$. Khi $x = -2$, tử số bằng $2(-2) - 1 = -5 \\neq 0$. Vậy TCĐ là đường thẳng $x = -2$.',
          'Bước 2: Tiệm cận ngang: $\\lim_{x \\to \\pm\\infty} \\frac{2x-1}{x+2} = 2$. Vậy TCN là đường thẳng $y = 2$.',
          'Bước 3: Kết luận: Đồ thị hàm số có 2 đường tiệm cận (1 đứng, 1 ngang).'
        ]
      }
    ],
    commonMistakes: [
      {
        mistakeTitle: 'Nhầm lẫn phương trình TCĐ (x=) và TCN (y=)',
        explanation: 'Học sinh viết: "Tiệm cận đứng là $y = -2$". Tiệm cận đứng song song với Oy nên phải có dạng $x = x_0$.',
        correction: 'TCĐ: $x = x_0$; TCN: $y = y_0$.'
      },
      {
        mistakeTitle: 'Không kiểm tra nghiệm tử triệt tiêu nghiệm mẫu',
        explanation: 'Với hàm $y = \\frac{x - 1}{x^2 - 1}$, học sinh cho rằng có 2 TCĐ là $x = 1$ và $x = -1$. Nhưng tại $x = 1$ hàm rút gọn thành $\\frac{1}{x+1}$, nên $x=1$ không phải TCĐ.',
        correction: 'Chỉ có 1 TCĐ là $x = -1$.'
      }
    ],
    relatedPracticeQuestionIds: ['Q-DH-010'],
    status: 'sample_needs_review',
    updatedAt: '2026-10-22',
  }
];

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'Q-DH-001',
    code: 'Q-DH-001',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-quy-tac-dao-ham',
    lessonCode: 'BD-01-QUY-TAC-DAO-HAM',
    questionType: 'mcq',
    difficulty: 'nhan_biet',
    prompt: 'Đạo hàm của hàm số $y = \\frac{2x + 1}{x - 3}$ trên tập xác định $D = \\mathbb{R} \\setminus \\{3\\}$ là:',
    options: [
      '$y\' = \\frac{-7}{(x-3)^2}$',
      '$y\' = \\frac{7}{(x-3)^2}$',
      '$y\' = \\frac{-5}{(x-3)^2}$',
      '$y\' = \\frac{2}{(x-3)^2}$'
    ],
    hintOnWrong: 'Hãy nhớ công thức tính đạo hàm phân thức bậc nhất/bậc nhất: tử số là ad - bc. Chú ý dấu của hệ số d = -3, ta có: 2*(-3) - 1*1 = -7.',
    prerequisiteKnowledge: 'Quy tắc tính đạo hàm hàm phân thức hữu tỉ bậc nhất trên bậc nhất (BD-01-QUY-TAC-DAO-HAM)',
    similarQuestionIds: ['Q-DH-002'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-002',
    code: 'Q-DH-002',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-quy-tac-dao-ham',
    lessonCode: 'BD-01-QUY-TAC-DAO-HAM',
    questionType: 'mcq',
    difficulty: 'thong_hieu',
    prompt: 'Tính đạo hàm của hàm số $y = (x^2 - 2x + 3)^3$ tại điểm $x = 2$.',
    options: [
      '$y\'(2) = 54$',
      '$y\'(2) = 162$',
      '$y\'(2) = 27$',
      '$y\'(2) = 108$'
    ],
    hintOnWrong: 'Đừng quên nhân thêm u\' = 2x - 2. Tại x = 2, ta có u = 3 và u\' = 2. Vậy y\'(2) = 3 * 3^2 * 2 = 54.',
    prerequisiteKnowledge: 'Đạo hàm của hàm hợp (u^n)\' = n*u^(n-1)*u\' (BD-01-QUY-TAC-DAO-HAM)',
    similarQuestionIds: ['Q-DH-001'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-003',
    code: 'Q-DH-003',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-tinh-don-dieu',
    lessonCode: 'BD-02-TINH-DON-DIEU',
    questionType: 'mcq',
    difficulty: 'nhan_biet',
    prompt: 'Hàm số $y = -x^3 + 3x - 2$ đồng biến trên khoảng nào dưới đây?',
    options: [
      '$(-\\infty; -1)$',
      '$(-1; 1)$',
      '$(1; +\\infty)$',
      '$(-\\infty; 1)$'
    ],
    hintOnWrong: 'Hàm số đồng biến khi y\' > 0. Đạo hàm y\' = -3x^2 + 3 có 2 nghiệm x = -1 và x = 1 với hệ số a = -3 < 0. Do đó y\' > 0 ở khoảng giữa 2 nghiệm (-1; 1).',
    prerequisiteKnowledge: 'Định lý về dấu đạo hàm và tính đồng biến của hàm số (BD-02-TINH-DON-DIEU)',
    similarQuestionIds: ['Q-DH-004', 'Q-DH-005'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-004',
    code: 'Q-DH-004',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-tinh-don-dieu',
    lessonCode: 'BD-02-TINH-DON-DIEU',
    questionType: 'mcq',
    difficulty: 'thong_hieu',
    prompt: 'Cho hàm số $y = \\frac{x - 2}{x + 1}$. Khẳng định nào sau đây là khẳng định ĐÚNG?',
    options: [
      'Hàm số đồng biến trên $\\mathbb{R} \\setminus \\{-1\\}$.',
      'Hàm số đồng biến trên các khoảng $(-\\infty; -1)$ và $(-1; +\\infty)$.',
      'Hàm số nghịch biến trên các khoảng $(-\\infty; -1)$ và $(-1; +\\infty)$.',
      'Hàm số đồng biến trên khoảng $(-\\infty; -1) \\cup (-1; +\\infty)$.'
    ],
    hintOnWrong: 'Hãy xem lại bài lý thuyết BD-02-TINH-DON-DIEU: Tuyệt đối không kết luận đồng biến dùng ký hiệu hợp (U) hay tập trừ (R \\ {-1}). Phải kết luận đồng biến trên từng khoảng riêng biệt.',
    prerequisiteKnowledge: 'Cách kết luận khoảng đơn điệu của hàm phân thức (BD-02-TINH-DON-DIEU)',
    similarQuestionIds: ['Q-DH-003', 'Q-DH-005'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-005',
    code: 'Q-DH-005',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-tinh-don-dieu',
    lessonCode: 'BD-02-TINH-DON-DIEU',
    questionType: 'mcq',
    difficulty: 'van_dung',
    prompt: 'Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = \\frac{x + 2m}{x - m + 3}$ đồng biến trên từng khoảng xác định.',
    options: [
      '$m < 1$',
      '$m \\le 1$',
      '$m > 1$',
      '$m \\ge 1$'
    ],
    hintOnWrong: 'Hàm số phân thức bậc nhất/bậc nhất đồng biến trên từng khoảng xác định <=> ad - bc > 0 (không lấy dấu bằng). Ta có 1*(-m + 3) - 2m > 0 <=> 3 - 3m > 0 <=> m < 1.',
    prerequisiteKnowledge: 'Điều kiện tham số m để hàm bậc nhất trên bậc nhất đơn điệu (BD-02-TINH-DON-DIEU)',
    similarQuestionIds: ['Q-DH-004'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-006',
    code: 'Q-DH-006',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-cuc-tri',
    lessonCode: 'BD-03-CUC-TRI',
    questionType: 'mcq',
    difficulty: 'nhan_biet',
    prompt: 'Cho hàm số $y = f(x)$ có bảng biến thiên với $f\'(x)$ đổi dấu từ $(+)$ sang $(-)$ tại $x = 2$, và $f(2) = 5$. Giá trị cực đại của hàm số đã cho là:',
    options: [
      '$2$',
      '$5$',
      '$(2; 5)$',
      '$-2$'
    ],
    hintOnWrong: 'Đề bài hỏi "Giá trị cực đại" (tức là y), không phải "Điểm cực đại của hàm số" (là x). Do đó đáp án là y = 5.',
    prerequisiteKnowledge: 'Phân biệt điểm cực trị của hàm số và giá trị cực trị (BD-03-CUC-TRI)',
    similarQuestionIds: ['Q-DH-007'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-007',
    code: 'Q-DH-007',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-cuc-tri',
    lessonCode: 'BD-03-CUC-TRI',
    questionType: 'mcq',
    difficulty: 'thong_hieu',
    prompt: 'Đồ thị hàm số nào dưới đây có đúng $3$ điểm cực trị?',
    options: [
      '$y = x^4 - 2x^2 + 1$',
      '$y = x^4 + 2x^2 - 3$',
      '$y = -x^4 - 4x^2 + 2$',
      '$y = x^3 - 3x^2 + 1$'
    ],
    hintOnWrong: 'Nhớ công thức giải nhanh cực trị hàm trùng phương y = ax^4 + bx^2 + c: có 3 cực trị <=> ab < 0 (a và b trái dấu).',
    prerequisiteKnowledge: 'Điều kiện cực trị của hàm trùng phương (BD-03-CUC-TRI)',
    similarQuestionIds: ['Q-DH-006'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-008',
    code: 'Q-DH-008',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-gtln-gtnn',
    lessonCode: 'BD-04-GTLN-GTNN',
    questionType: 'mcq',
    difficulty: 'nhan_biet',
    prompt: 'Giá trị nhỏ nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:',
    options: [
      '$3$',
      '$2$',
      '$11$',
      '$1$'
    ],
    hintOnWrong: 'Quy tắc tìm max-min trên [0; 2]: Tính f(0) = 3, f(1) = 2, f(2) = 11. Số nhỏ nhất trong 3 số này là 2.',
    prerequisiteKnowledge: 'Quy tắc tìm GTLN, GTNN trên đoạn (BD-04-GTLN-GTNN)',
    similarQuestionIds: ['Q-DH-009'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-009',
    code: 'Q-DH-009',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-gtln-gtnn',
    lessonCode: 'BD-04-GTLN-GTNN',
    questionType: 'mcq',
    difficulty: 'thong_hieu',
    prompt: 'Giá trị lớn nhất của hàm số $y = \\frac{2x - 1}{x + 1}$ trên đoạn $[0; 3]$ bằng:',
    options: [
      '$-1$',
      '$\\frac{5}{4}$',
      '$2$',
      '$\\frac{1}{2}$'
    ],
    hintOnWrong: 'Vì hàm phân thức bậc nhất/bậc nhất luôn đồng biến hoặc luôn nghịch biến trên đoạn [a; b], nên max và min chỉ rơi vào hai đầu mút f(0) hoặc f(3). Ta có y\' > 0 => max = y(3) = 5/4.',
    prerequisiteKnowledge: 'Tính chất đơn điệu để tìm nhanh GTLN-GTNN hàm phân thức (BD-04-GTLN-GTNN)',
    similarQuestionIds: ['Q-DH-008'],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  },
  {
    id: 'Q-DH-010',
    code: 'Q-DH-010',
    topicId: 'topic-dao-ham',
    lessonId: 'lesson-duong-tiem-can',
    lessonCode: 'BD-05-DUONG-TIEM-CAN',
    questionType: 'mcq',
    difficulty: 'nhan_biet',
    prompt: 'Đường tiệm cận đứng của đồ thị hàm số $y = \\frac{3x - 2}{x + 1}$ là đường thẳng:',
    options: [
      '$x = -1$',
      '$x = 3$',
      '$y = -1$',
      '$y = 3$'
    ],
    hintOnWrong: 'Tiệm cận ĐỨNG song song với trục tung Oy, có phương trình dạng x = x_0 (nghiệm của mẫu số x + 1 = 0 => x = -1). Còn y = 3 là tiệm cận NGANG.',
    prerequisiteKnowledge: 'Định nghĩa và cách tìm tiệm cận đứng (BD-05-DUONG-TIEM-CAN)',
    similarQuestionIds: [],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  }
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-chuyen-de-dao-ham-01',
    title: 'Đề Ôn Luyện Đạo Hàm & Đồ Thị Hàm Số – Chuẩn Cấu Trúc THPT',
    code: 'DE-THI-DH-10C',
    description: 'Đề kiểm tra nhanh 10 câu trắc nghiệm bao quát các bài: Quy tắc đạo hàm, Tính đơn điệu, Cực trị, Max-Min và Tiệm cận. Được kiểm duyệt đáp án chuẩn xác.',
    durationMinutes: 15,
    totalQuestions: 10,
    questionIds: [
      'Q-DH-001',
      'Q-DH-002',
      'Q-DH-003',
      'Q-DH-004',
      'Q-DH-005',
      'Q-DH-006',
      'Q-DH-007',
      'Q-DH-008',
      'Q-DH-009',
      'Q-DH-010'
    ],
    status: 'sample_needs_review',
    createdAt: '2026-10-22',
  }
];

export const INITIAL_CLASSROOMS: Classroom[] = [
  {
    id: 'cls-2025-12a1',
    code: '12A1',
    name: 'Lớp 12A1 Chuyên Toán',
    academicYear: '2025-2026',
    grade: 12,
    homeroomTeacherId: 'sch_acc_gvt2',
    homeroomTeacherName: 'Nguyễn Văn Đăng',
    subjectTeacherIds: ['sch_acc_gvt2', 'teacher-root-uid-viethat'],
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'cls-2025-12a2',
    code: '12A2',
    name: 'Lớp 12A2 Khoa học Tự nhiên',
    academicYear: '2025-2026',
    grade: 12,
    homeroomTeacherId: 'teacher-root-uid-viethat',
    homeroomTeacherName: 'Thầy Nguyễn Việt Hà',
    subjectTeacherIds: ['teacher-root-uid-viethat'],
    status: 'active',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z'
  },
  {
    id: 'cls-2025-11a1',
    code: '11A1',
    name: 'Lớp 11A1 Chuẩn bị tốt nghiệp',
    academicYear: '2025-2026',
    grade: 11,
    homeroomTeacherId: 'sch_acc_gvt2',
    homeroomTeacherName: 'Nguyễn Văn Đăng',
    subjectTeacherIds: ['sch_acc_gvt2'],
    status: 'active',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z'
  },
  {
    id: 'cls-2025-10a1',
    code: '10A1',
    name: 'Lớp 10A1 Cơ bản Toán',
    academicYear: '2025-2026',
    grade: 10,
    homeroomTeacherId: 'sch_acc_gvt2',
    homeroomTeacherName: 'Nguyễn Văn Đăng',
    subjectTeacherIds: ['sch_acc_gvt2'],
    status: 'active',
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z'
  }
];

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'std_HS12001',
    studentCode: 'HS12001',
    fullName: 'Nguyễn Văn An',
    classroomId: 'cls-2025-12a1',
    classroomCode: '12A1',
    academicYear: '2025-2026',
    dateOfBirth: '2008-03-15',
    gender: 'Nam',
    accountId: 'sch_acc_hs12001',
    hasAccount: true,
    status: 'active',
    createdAt: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'std_HS12002',
    studentCode: 'HS12002',
    fullName: 'Trần Thị Mai',
    classroomId: 'cls-2025-12a1',
    classroomCode: '12A1',
    academicYear: '2025-2026',
    dateOfBirth: '2008-08-22',
    gender: 'Nữ',
    accountId: 'sch_acc_hs12002',
    hasAccount: true,
    status: 'active',
    createdAt: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'std_HS12003',
    studentCode: 'HS12003',
    fullName: 'Lê Hoàng Nam',
    classroomId: 'cls-2025-12a2',
    classroomCode: '12A2',
    academicYear: '2025-2026',
    dateOfBirth: '2008-11-09',
    gender: 'Nam',
    accountId: 'sch_acc_hs12003',
    hasAccount: true,
    status: 'active',
    createdAt: '2026-01-06T00:00:00.000Z'
  },
  {
    id: 'std_HS12004',
    studentCode: 'HS12004',
    fullName: 'Phạm Minh Tuấn',
    classroomId: 'cls-2025-12a1',
    classroomCode: '12A1',
    academicYear: '2025-2026',
    dateOfBirth: '2008-05-18',
    gender: 'Nam',
    hasAccount: false,
    status: 'active',
    createdAt: '2026-01-07T00:00:00.000Z'
  },
  {
    id: 'std_HS12005',
    studentCode: 'HS12005',
    fullName: 'Đỗ Thùy Linh',
    classroomId: 'cls-2025-12a2',
    classroomCode: '12A2',
    academicYear: '2025-2026',
    dateOfBirth: '2008-09-30',
    gender: 'Nữ',
    hasAccount: false,
    status: 'active',
    createdAt: '2026-01-07T00:00:00.000Z'
  }
];
