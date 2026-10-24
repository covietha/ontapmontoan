import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Lock, 
  Unlock, 
  Key, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Filter,
  GraduationCap,
  BookOpen,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolAccount } from '../types';

export const AccountManagement: React.FC = () => {
  const { isTeacher, isRootAdmin, profile, getIdToken } = useAuth();

  const [accounts, setAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [teachersCanCreate, setTeachersCanCreate] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');

  // Form state
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'teacher'>('student');
  const [newClassroom, setNewClassroom] = useState('12A1');
  const [newPassword, setNewPassword] = useState('ThptMath@2026');
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset password modal state
  const [resetModalAccount, setResetModalAccount] = useState<SchoolAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('ThptMath@2026');
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = isRootAdmin ? 'Bearer test-token-teacher-root' : 'Bearer test-token-student-an';
      }

      const res = await fetch('/api/accounts', { headers });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.config) {
          setTeachersCanCreate(data.config.teachersCanCreateStudents);
        }
      }
    } catch (e) {
      console.warn('Could not fetch accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);
    setFormError(null);

    if (!newUsername.trim() || !newDisplayName.trim()) {
      setFormError('Vui lòng nhập đầy đủ Mã định danh và Họ tên.');
      return;
    }

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer test-token-teacher-root';
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: newUsername.trim(),
          displayName: newDisplayName.trim(),
          role: newRole,
          classroom: newClassroom.trim(),
          password: newPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormStatus(`✅ Đã cấp thành công tài khoản mã ${data.account.username} (${data.account.displayName})! Mật khẩu khởi tạo: ${data.initialPasswordProvided}`);
        setNewUsername('');
        setNewDisplayName('');
        fetchAccounts();
      } else {
        setFormError(data.error || 'Lỗi khi tạo tài khoản.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Lỗi mạng khi tạo tài khoản.');
    }
  };

  const handleToggleStatus = async (account: SchoolAccount) => {
    const nextStatus = account.status === 'locked' ? 'active' : 'locked';
    const actionLabel = nextStatus === 'locked' ? 'khóa' : 'mở khóa';

    if (!confirm(`Thầy/Cô có chắc chắn muốn ${actionLabel} tài khoản ${account.username} (${account.displayName})?`)) {
      return;
    }

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer test-token-teacher-root';
      }

      const res = await fetch(`/api/accounts/${account.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setActionStatus(`Đã ${actionLabel} thành công tài khoản ${account.username}`);
        fetchAccounts();
        setTimeout(() => setActionStatus(null), 3000);
      }
    } catch (err: any) {
      alert('Lỗi thao tác: ' + (err.message || err));
    }
  };

  const handleResetPassword = async () => {
    if (!resetModalAccount) return;

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer test-token-teacher-root';
      }

      const res = await fetch(`/api/accounts/${resetModalAccount.id}/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newPassword: resetPasswordInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionStatus(`✅ Đã đặt lại mật khẩu cho tài khoản ${resetModalAccount.username}: "${data.newPassword}"`);
        setResetModalAccount(null);
        setResetPasswordInput('ThptMath@2026');
        fetchAccounts();
        setTimeout(() => setActionStatus(null), 8000);
      } else {
        alert(data.error || 'Lỗi khi đặt lại mật khẩu');
      }
    } catch (err: any) {
      alert('Lỗi mạng: ' + (err.message || err));
    }
  };

  const handleToggleTeacherPermission = async () => {
    if (!isRootAdmin) return;
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = 'Bearer test-token-teacher-root';
      }

      const res = await fetch('/api/accounts/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ teachersCanCreateStudents: !teachersCanCreate })
      });

      if (res.ok) {
        const data = await res.json();
        setTeachersCanCreate(data.config.teachersCanCreateStudents);
      }
    } catch (err) {
      console.warn('Config toggle failed:', err);
    }
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = searchQuery === '' || 
        acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.classroom && acc.classroom.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = roleFilter === 'all' || acc.role === roleFilter;
      const matchStatus = statusFilter === 'all' || acc.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchQuery, roleFilter, statusFilter]);

  const studentCount = accounts.filter(a => a.role === 'student').length;
  const teacherCount = accounts.filter(a => a.role === 'teacher').length;
  const lockedCount = accounts.filter(a => a.status === 'locked').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Quản lý tài khoản tập trung nhà trường</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Học sinh không tự đăng ký. Mọi tài khoản giáo viên và học sinh được cấp, quản lý mật khẩu và khóa/mở khóa tại đây.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRootAdmin ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              👑 Quản trị viên gốc
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              👨‍🏫 Giáo viên được ủy quyền
            </span>
          )}
        </div>
      </div>

      {actionStatus && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Tổng số tài khoản</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{accounts.length}</div>
          <span className="text-[13px] text-slate-400">do nhà trường quản lý</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Tài khoản học sinh</div>
          <div className="text-2xl font-black text-blue-600 mt-2">{studentCount}</div>
          <span className="text-[13px] text-slate-400">thuộc các lớp 12</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Giáo viên Toán</div>
          <div className="text-2xl font-black text-amber-600 mt-2">{teacherCount}</div>
          <span className="text-[13px] text-slate-400">tham gia giảng dạy</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Tài khoản đang khóa</div>
          <div className="text-2xl font-black text-rose-600 mt-2">{lockedCount}</div>
          <span className="text-[13px] text-rose-500 font-medium">tạm ngưng truy cập</span>
        </div>
      </div>

      {/* Delegation Policy Card (Root Admin Configuration) */}
      {isRootAdmin && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 p-5 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Cấu hình phân quyền cấp tài khoản học sinh:
            </h3>
            <p className="text-[13px] text-blue-700">
              Cho phép các giáo viên bộ môn Toán trong trường được tạo danh sách tài khoản cho học sinh lớp phụ trách.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleTeacherPermission}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              teachersCanCreate 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {teachersCanCreate ? '✓ Đang cho phép giáo viên tạo học sinh' : '✕ Đang tắt (chỉ quản trị viên tạo)'}
          </button>
        </div>
      )}

      {/* Create Account Form */}
      <form onSubmit={handleCreateAccount} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            Cấp tài khoản mới do nhà trường ban hành
          </h3>
          <span className="text-[13px] text-slate-400">
            Mật khẩu được mã hóa an toàn bằng PBKDF2-SHA512
          </span>
        </div>

        {formStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
            {formStatus}
          </div>
        )}

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mã định danh</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Ví dụ: HS12004"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Ví dụ: Hoàng Văn Khang"
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              disabled={!isRootAdmin}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="student">🎓 Học sinh</option>
              {isRootAdmin && <option value="teacher">👨‍🏫 Giáo viên</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lớp / Bộ môn</label>
            <input
              type="text"
              value={newClassroom}
              onChange={(e) => setNewClassroom(e.target.value)}
              placeholder="12A1"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500">
            Mật khẩu khởi tạo: <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{newPassword}</span> (Có thể đổi sau)
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cấp tài khoản vào hệ thống</span>
          </button>
        </div>
      </form>

      {/* Account Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã, tên, lớp..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>

            <button
              onClick={fetchAccounts}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã định danh</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Lớp / Đơn vị</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ngày cấp</th>
                <th className="py-3 px-4 text-right">Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAccounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {account.username}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {account.displayName}
                    <div className="text-[12.5px] text-slate-400 font-mono font-normal">{account.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[12.5px] ${
                      account.role === 'teacher' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {account.role === 'teacher' ? '👨‍🏫 Giáo viên' : '🎓 Học sinh'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600">
                    {account.classroom || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {account.status === 'locked' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Lock className="w-3 h-3" />
                        Đã khóa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Hoạt động
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(account.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setResetModalAccount(account);
                          setResetPasswordInput('ThptMath@2026');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] transition-colors"
                        title="Đặt lại mật khẩu"
                      >
                        <Key className="w-3 h-3 inline mr-1" />
                        Đổi MK
                      </button>

                      {isRootAdmin && (
                        <button
                          onClick={() => handleToggleStatus(account)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[13px] transition-colors ${
                            account.status === 'locked'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {account.status === 'locked' ? 'Mở khóa' : 'Khóa'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                Đặt lại mật khẩu tài khoản
              </h3>
              <button
                onClick={() => setResetModalAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1">
              <div>Tài khoản: <strong className="font-mono text-slate-900">{resetModalAccount.username}</strong></div>
              <div>Họ tên: <strong>{resetModalAccount.displayName}</strong></div>
              <div>Vai trò: <strong>{resetModalAccount.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu mới do nhà trường cấp
              </label>
              <input
                type="text"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalAccount(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleResetPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Xác nhận đặt lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
