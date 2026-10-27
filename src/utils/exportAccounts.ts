import * as XLSX from 'xlsx';

export interface ExportAccount {
  id: string; username: string; displayName: string; role: 'teacher' | 'student';
  classroom?: string; dateOfBirth?: string; studentNumber?: string; status: string; lastLoginAt?: string;
}

const sortAcc = (a: ExportAccount, b: ExportAccount) =>
  (a.classroom || '').localeCompare(b.classroom || '', 'vi', { numeric: true }) || a.username.localeCompare(b.username, 'vi', { numeric: true });

const dobText = (d?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || '';
};

const studentRows = (list: ExportAccount[]) => [
  ['STT', 'Mã đăng nhập', 'Họ và tên', 'Lớp', 'Ngày sinh', 'Mã học sinh (Sở)', 'Trạng thái'],
  ...[...list].sort(sortAcc).map((a, i) => [i + 1, a.username, a.displayName, a.classroom || '', dobText(a.dateOfBirth), a.studentNumber || '', a.status === 'locked' ? 'Đã khóa' : 'Hoạt động'])
];

const sheet = (rows: (string | number)[][], widths: number[]) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = widths.map(wch => ({ wch }));
  return ws;
};

const safeName = (s: string) => s.replace(/[\\/?*\[\]:]/g, '_').slice(0, 31);

/** Danh sách tài khoản của một lớp. Không có mật khẩu: máy chủ chỉ lưu mật khẩu đã mã hóa. */
export function exportClassAccounts(classCode: string, accounts: ExportAccount[]) {
  const list = accounts.filter(a => a.role === 'student' && (a.classroom || '').toUpperCase() === classCode.toUpperCase());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(studentRows(list), [6, 16, 30, 8, 14, 18, 14]), safeName(`Lớp ${classCode}`));
  XLSX.writeFile(wb, `tai_khoan_lop_${classCode}.xlsx`);
  return list.length;
}

/** Toàn trường: một sheet tổng, mỗi lớp một sheet, và một sheet giáo viên (khi có). */
export function exportSchoolAccounts(accounts: ExportAccount[]) {
  const students = accounts.filter(a => a.role === 'student');
  const teachers = accounts.filter(a => a.role === 'teacher');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(studentRows(students), [6, 16, 30, 8, 14, 18, 14]), 'Tất cả học sinh');
  const codes = Array.from(new Set(students.map(s => s.classroom || ''))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  codes.forEach(c => XLSX.utils.book_append_sheet(wb, sheet(studentRows(students.filter(s => s.classroom === c)), [6, 16, 30, 8, 14, 18, 14]), safeName(c)));
  if (teachers.length) {
    XLSX.utils.book_append_sheet(wb, sheet([
      ['STT', 'Mã đăng nhập', 'Họ và tên', 'Trạng thái'],
      ...[...teachers].sort((a, b) => a.username.localeCompare(b.username, 'vi', { numeric: true })).map((a, i) => [i + 1, a.username, a.displayName, a.status === 'locked' ? 'Đã khóa' : 'Hoạt động'])
    ], [6, 16, 30, 14]), 'Giáo viên');
  }
  XLSX.writeFile(wb, 'tai_khoan_toan_truong.xlsx');
  return { students: students.length, teachers: teachers.length };
}

export async function fetchAccounts(token: string | null): Promise<ExportAccount[]> {
  const res = await fetch('/api/accounts', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
  return data.accounts || [];
}
