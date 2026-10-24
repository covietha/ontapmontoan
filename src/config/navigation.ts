import type { LucideIcon } from 'lucide-react';
import {
  Home, BookOpen, Target, Award, AlertCircle, BarChart3,
  Users, School, ShieldCheck, HelpCircle, FileText, ClipboardCheck,
  Timer, Layers
} from 'lucide-react';

export type NavTab =
  | 'student_home'
  | 'student_lessons'
  | 'student_practice'
  | 'student_results'
  | 'student_mistakes'
  | 'teacher_overview'
  | 'teacher_classrooms'
  | 'teacher_questions'
  | 'teacher_curriculum'
  | 'teacher_exams'
  | 'teacher_results'
  | 'teacher_review'
  | 'teacher_accounts'
  | 'teacher_admins';

export type Audience = 'student' | 'teacher';

export interface NavItem {
  id: NavTab;
  audience: Audience;
  /** Tên hiển thị ở menu bên trái */
  label: string;
  /** Tiêu đề lớn trên thanh trạng thái */
  title: string;
  /** Một câu nói rõ trang này dùng để làm gì */
  description: string;
  /** Nhóm trong menu và trong đường dẫn breadcrumb */
  section: string;
  icon: LucideIcon;
  /** Màu nhấn của menu: thanh trạng thái đổi màu theo */
  tone: string;
  rootOnly?: boolean;
  /** Không hiện trong menu nhưng vẫn là một trang hợp lệ */
  hidden?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // ───────────── Học sinh ─────────────
  {
    id: 'student_home', audience: 'student', label: 'Trang chủ học tập',
    title: 'Trang chủ học tập',
    description: 'Lộ trình ôn thi 2026 và những việc nên làm tiếp theo.',
    section: 'Học tập', icon: Home, tone: '#2c4f9b'
  },
  {
    id: 'student_lessons', audience: 'student', label: 'Bài học & chuyên đề',
    title: 'Bài học và chuyên đề',
    description: 'Lý thuyết, công thức và ví dụ mẫu theo từng chuyên đề.',
    section: 'Học tập', icon: BookOpen, tone: '#0f766e'
  },
  {
    id: 'student_practice', audience: 'student', label: 'Luyện tập & thi thử',
    title: 'Luyện tập và thi thử',
    description: 'Làm bài theo dạng hoặc vào phòng thi thử có bấm giờ.',
    section: 'Ôn luyện', icon: Target, tone: '#a35200'
  },
  {
    id: 'student_results', audience: 'student', label: 'Kết quả & lịch sử thi',
    title: 'Kết quả và lịch sử thi',
    description: 'Điểm từng lần thi, thời gian làm bài và câu đã sai.',
    section: 'Theo dõi', icon: Award, tone: '#6d3fb8'
  },
  {
    id: 'student_mistakes', audience: 'student', label: 'Sổ tay lỗi sai',
    title: 'Sổ tay lỗi sai',
    description: 'Các câu làm sai kèm lời giải và bài lý thuyết cần ôn lại.',
    section: 'Theo dõi', icon: AlertCircle, tone: '#b42318'
  },

  // ───────────── Giáo viên / quản trị ─────────────
  {
    id: 'teacher_overview', audience: 'teacher', label: 'Tổng quan',
    title: 'Tổng quan giảng dạy',
    description: 'Tình hình làm bài của các lớp và các chuyên đề học sinh còn yếu.',
    section: 'Tổng quan', icon: BarChart3, tone: '#2c4f9b'
  },
  {
    id: 'teacher_classrooms', audience: 'teacher', label: 'Lớp học & học sinh',
    title: 'Lớp học và học sinh',
    description: 'Danh sách lớp theo niên khóa và học sinh trong từng lớp.',
    section: 'Học đường', icon: School, tone: '#0f766e'
  },
  {
    id: 'teacher_questions', audience: 'teacher', label: 'Ngân hàng câu hỏi',
    title: 'Ngân hàng câu hỏi',
    description: 'Nhập câu hỏi từ Word, kiểm tra và duyệt trước khi cho học sinh làm.',
    section: 'Học liệu', icon: HelpCircle, tone: '#a35200'
  },
  {
    id: 'teacher_curriculum', audience: 'teacher', label: 'Bài học & chuyên đề',
    title: 'Bài học và chuyên đề',
    description: 'Soạn, sửa và duyệt nội dung lý thuyết theo chuyên đề.',
    section: 'Học liệu', icon: Layers, tone: '#0f766e'
  },
  {
    id: 'teacher_exams', audience: 'teacher', label: 'Soạn đề thi',
    title: 'Soạn đề thi',
    description: 'Thêm câu hỏi, ghép đề và quản lý kho đề thi thử.',
    section: 'Học liệu', icon: FileText, tone: '#6d3fb8'
  },
  {
    id: 'teacher_review', audience: 'teacher', label: 'Kiểm duyệt học liệu',
    title: 'Kiểm duyệt học liệu',
    description: 'Xem lại học liệu đang chờ duyệt.',
    section: 'Học liệu', icon: ClipboardCheck, tone: '#a35200', hidden: true
  },
  {
    id: 'teacher_results', audience: 'teacher', label: 'Kết quả thi',
    title: 'Kết quả thi của học sinh',
    description: 'Điểm đã được máy chủ chấm và bài làm chi tiết của từng em.',
    section: 'Khảo thí', icon: Timer, tone: '#6d3fb8'
  },
  {
    id: 'teacher_accounts', audience: 'teacher', label: 'Tài khoản & phân quyền',
    title: 'Tài khoản và phân quyền',
    description: 'Cấp, khóa và đặt lại mật khẩu tài khoản học sinh, giáo viên.',
    section: 'Hệ thống', icon: Users, tone: '#364358'
  },
  {
    id: 'teacher_admins', audience: 'teacher', label: 'Quản trị viên gốc',
    title: 'Cổng quản trị viên gốc',
    description: 'Cấp hoặc thu hồi quyền quản trị. Chỉ tài khoản gốc được vào.',
    section: 'Hệ thống', icon: ShieldCheck, tone: '#b42318', rootOnly: true
  }
];

export const NAV_BY_ID: Record<NavTab, NavItem> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.id, i])
) as Record<NavTab, NavItem>;

/** Trang con trong "Luyện tập & thi thử": thanh trạng thái đổi theo từng chế độ */
export const PRACTICE_MODES = {
  topics: {
    title: 'Luyện tập theo dạng',
    description: 'Chọn chuyên đề, làm từng câu và xem lời giải ngay sau khi trả lời.',
    icon: Target
  },
  exam: {
    title: 'Phòng thi thử',
    description: 'Làm đề có bấm giờ như thi thật. Bài nộp được máy chủ chấm điểm.',
    icon: Timer
  }
} as const;

export const SCHOOL = {
  name: 'THPT Trần Hưng Đạo',
  product: 'Ôn thi Toán 360',
  year: 'Năm học 2026–2027'
};

/**
 * Tab con bên trong một menu giáo viên. Khi giáo viên đổi tab con,
 * thanh trạng thái hiện đúng tên và mô tả của tab đó.
 * Tab con trùng với tab mặc định của menu thì dùng tiêu đề của menu.
 */
export const SUB_TABS: Partial<Record<NavTab, Record<string, { title: string; description: string }>>> = Object.fromEntries(
  (['teacher_curriculum', 'teacher_exams', 'teacher_results', 'teacher_admins', 'teacher_review'] as NavTab[]).map((tab) => {
    const defaults: Record<string, string> = {
      teacher_curriculum: 'review', teacher_review: 'review', teacher_exams: 'addQuestion',
      teacher_results: 'results', teacher_admins: 'admins'
    };
    const all: Record<string, { title: string; description: string }> = {
      review: { title: 'Kiểm duyệt học liệu', description: 'Xem lại bài học và câu hỏi đang chờ duyệt.' },
      addQuestion: { title: 'Soạn câu hỏi mới', description: 'Thêm từng câu hỏi, đáp án và lời giải vào kho đề.' },
      results: { title: 'Kết quả thi của học sinh', description: 'Điểm đã được máy chủ chấm và bài làm chi tiết của từng em.' },
      admins: { title: 'Quản trị viên và phân quyền', description: 'Cấp hoặc thu hồi quyền quản trị cho giáo viên.' },
      accounts: { title: 'Quản lý tài khoản trường', description: 'Cấp, khóa và đặt lại mật khẩu tài khoản học sinh, giáo viên.' },
      securityGuide: { title: 'Chính sách bảo mật', description: 'Quy tắc truy cập dữ liệu và cách hệ thống bảo vệ điểm thi.' },
      firebaseCheck: { title: 'Kiểm tra Firebase và đồng bộ', description: 'Kiểm tra kết nối Cloud Firestore và đồng bộ dữ liệu mẫu.' }
    };
    const own = Object.fromEntries(Object.entries(all).filter(([k]) => k !== defaults[tab]));
    return [tab, own];
  })
);
