import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Lock, 
  User, 
  Key, 
  AlertCircle,
  Briefcase,
  X
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { SCHOOL } from '../config/navigation';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { loginWithSchoolAccount, loginWithGoogle } = useAuth();
  
  // Active Tab: strictly 'student' or 'teacher'
  const [activePortal, setActivePortal] = useState<'student' | 'teacher'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discreet Admin Modal
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await loginWithSchoolAccount(username.trim(), password, activePortal);
    if (!result.success) {
      setErrorMessage(result.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
    setLoading(false);
  };

  const handleGoogleAdminLogin = async () => {
    setLoadingGoogle(true);
    setAdminError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAdminError(err?.message || 'Đăng nhập Google Quản trị chưa hoàn tất hoặc bị hủy.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 text-slate-900 placeholder:text-slate-400';

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] bg-[var(--paper)]">
      {/* Bên trái: đồ thị hàm số, đúng chủ đề ôn thi (ứng dụng đạo hàm) */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-blue-950 paper-grid-dark text-blue-100 p-12 xl:p-16">
        <div className="flex items-center gap-3">
          <BrandMark size={44} className="text-blue-100" />
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-white">{SCHOOL.name}</div>
            <div className="text-sm text-blue-300">{SCHOOL.product}</div>
          </div>
        </div>

        <div className="relative">
          <svg viewBox="0 0 520 300" className="w-full max-w-xl" role="img" aria-label="Đồ thị hàm số bậc ba và tiếp tuyến tại điểm cực tiểu">
            <g stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.2">
              <line x1="20" y1="170" x2="505" y2="170" />
              <line x1="260" y1="285" x2="260" y2="15" />
            </g>
            <path d="M500 170l-9-4v8zM260 14l-4 9h8z" fill="rgb(255 255 255 / 0.5)" />
            {/* y = x^3 - 3x, tỉ lệ 60px / đơn vị */}
            <path
              d="M 98 282 Q 150 60 200 71 T 260 170 T 320 269 Q 370 280 422 58"
              fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"
            />
            {/* tiếp tuyến nằm ngang tại điểm cực tiểu và nét bút đỏ */}
            <line x1="250" y1="269" x2="440" y2="269" stroke="#ff7a70" strokeWidth="2" strokeDasharray="6 5" />
            <circle cx="320" cy="269" r="5.5" fill="#ff7a70" />
            <circle cx="200" cy="71" r="5.5" fill="none" stroke="#ff7a70" strokeWidth="2" />
            <text x="345" y="292" fill="#ffb4ad" fontSize="15" fontFamily="Newsreader, serif" fontStyle="italic">f′(x) = 0</text>
            <text x="212" y="62" fill="#ffb4ad" fontSize="15" fontFamily="Newsreader, serif" fontStyle="italic">cực đại</text>
          </svg>

          <h1 className="mt-8 font-display text-4xl xl:text-5xl font-semibold text-white leading-[1.12] max-w-xl">
            Ôn đúng chỗ còn yếu, vào phòng thi tự tin hơn.
          </h1>
          <p className="mt-4 text-base text-blue-200 max-w-lg leading-relaxed">
            Mỗi câu làm sai được dẫn về bài lý thuyết tương ứng. Điểm thi thử do máy chủ chấm, giáo viên theo dõi được tiến bộ của từng em.
          </p>
        </div>

        <div className="text-sm text-blue-300">{SCHOOL.year} · Tổ Toán</div>
      </section>

      {/* Bên phải: biểu mẫu đăng nhập */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <BrandMark size={40} className="text-blue-900" />
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold text-slate-900">{SCHOOL.name}</div>
              <div className="text-sm text-slate-500">{SCHOOL.product}</div>
            </div>
          </div>

          <h2 className="font-display text-3xl font-semibold text-slate-900">Đăng nhập</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Dùng tài khoản do nhà trường hoặc Tổ Toán cấp.
          </p>

          <div role="tablist" aria-label="Loại tài khoản" className="mt-6 grid grid-cols-2 p-1 bg-slate-200/70 rounded-xl gap-1">
            {([
              { id: 'student', label: 'Học sinh', Icon: GraduationCap },
              { id: 'teacher', label: 'Giáo viên', Icon: Briefcase }
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activePortal === id}
                onClick={() => { setActivePortal(id); setErrorMessage(null); }}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activePortal === id ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div role="alert" className="mt-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-800 mb-1.5">
                {activePortal === 'student' ? 'Mã học sinh' : 'Mã giáo viên'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activePortal === 'student' ? 'Ví dụ: HS12001' : 'Ví dụ: GV01'}
                  required
                  autoFocus
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-800 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</span>
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600 leading-relaxed">
            Quên mật khẩu hoặc chưa có tài khoản? Liên hệ Văn phòng Tổ Toán để được cấp lại.
          </p>

          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />
              Tài khoản do nhà trường quản lý
            </span>
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="font-medium text-blue-800 hover:underline"
            >
              Cổng quản trị
            </button>
          </div>
        </div>
      </main>

      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-title">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between">
              <h3 id="admin-title" className="font-display text-xl font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" aria-hidden="true" />
                Đăng nhập quản trị viên
              </h3>
              <button type="button" onClick={() => setShowAdminModal(false)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Dành cho quản trị viên hệ thống. Máy chủ sẽ xác thực tài khoản Google của quản trị viên gốc <span className="font-mono text-slate-900 font-medium">viethathd@gmail.com</span>.
            </p>

            {adminError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">{adminError}</div>
            )}

            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={loadingGoogle}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-70"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{loadingGoogle ? 'Đang mở cửa sổ Google…' : 'Tiếp tục với Google'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
