import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Lock, 
  User, 
  Key, 
  AlertCircle,
  Briefcase,
  Eye,
  EyeOff,
  ArrowRight,
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
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] bg-[var(--paper)]">
      {/* Bên trái: huy hiệu gọn ở góc, đồ thị hàm số làm hình chính */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-blue-950 text-blue-100 p-12 xl:p-16">
        <div className="absolute inset-0 paper-grid-dark opacity-80" aria-hidden="true" />
        <div
          className="absolute -left-20 -top-20 w-[26rem] h-[26rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgb(232 67 15 / 0.22), transparent)' }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3.5">
          <BrandMark size={52} glow />
          <div className="leading-tight">
            <div className="font-display text-xl font-semibold text-white">{SCHOOL.name}</div>
            <div className="text-sm text-blue-200">Hệ thống ôn tập môn Toán THPT</div>
          </div>
        </div>

        <svg viewBox="0 0 520 300" className="relative w-full max-w-xl self-center my-8" role="img" aria-label="Đồ thị hàm số bậc ba có cực đại và cực tiểu">
          <g stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.2">
            <line x1="20" y1="170" x2="505" y2="170" />
            <line x1="260" y1="285" x2="260" y2="15" />
          </g>
          <path d="M500 170l-9-4v8zM260 14l-4 9h8z" fill="rgb(255 255 255 / 0.5)" />
          <path d="M 98 282 Q 150 60 200 71 T 260 170 T 320 269 Q 370 280 422 58" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="250" y1="269" x2="440" y2="269" stroke="#ff8a63" strokeWidth="2" strokeDasharray="6 5" />
          <circle cx="320" cy="269" r="5.5" fill="#ff8a63" />
          <circle cx="200" cy="71" r="5.5" fill="none" stroke="#ff8a63" strokeWidth="2" />
          <text x="345" y="292" fill="#ffc2ad" fontSize="15" fontFamily="Newsreader, serif" fontStyle="italic">f′(x) = 0</text>
          <text x="212" y="62" fill="#ffc2ad" fontSize="15" fontFamily="Newsreader, serif" fontStyle="italic">cực đại</text>
        </svg>

        <div className="relative max-w-xl">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold text-white leading-[1.12]">
            Ôn đúng chỗ còn yếu, vào phòng thi tự tin hơn.
          </h1>
          <p className="mt-4 text-base text-blue-200 leading-relaxed max-w-lg">
            Mỗi câu làm sai được dẫn về bài lý thuyết tương ứng. Điểm thi thử do máy chủ chấm, giáo viên theo dõi được tiến bộ của từng em.
          </p>
        </div>
      </section>

      {/* Bên phải: biểu mẫu */}
      <main className="relative flex flex-col justify-center px-5 py-10 sm:px-10 bg-[radial-gradient(ellipse_at_top_right,rgb(232_67_15/0.07),transparent_55%)]">
        <div className="w-full max-w-[28rem] mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-7">
            <BrandMark size={52} glow />
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold text-slate-900">{SCHOOL.name}</div>
              <div className="text-sm text-slate-600">Hệ thống ôn tập môn Toán THPT</div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white border border-slate-200 shadow-[0_24px_60px_-24px_rgb(20_28_44/0.35),0_2px_6px_rgb(20_28_44/0.06)] p-6 sm:p-9">
            <h2 className="font-display text-4xl font-semibold text-slate-900">Đăng nhập</h2>
            <p className="mt-1.5 text-base text-slate-600">Dùng tài khoản do nhà trường hoặc Tổ Toán cấp.</p>

            <div role="tablist" aria-label="Loại tài khoản" className="seg mt-6">
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
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div role="alert" className="mt-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-base flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-base font-medium text-slate-800 mb-2 ml-1">
                  {activePortal === 'student' ? 'Mã học sinh' : 'Mã giáo viên'}
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={activePortal === 'student' ? 'Ví dụ: HS12001' : 'Ví dụ: GV01'}
                    required
                    autoFocus
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-base font-medium text-slate-800 mb-2 ml-1">Mật khẩu</label>
                <div className="relative">
                  <Key className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    className="field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-flame !mt-6">
                <Lock className="w-5 h-5" aria-hidden="true" />
                <span>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</span>
                {!loading && <ArrowRight className="w-5 h-5" aria-hidden="true" />}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-sm text-slate-500" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200" />
              <span>hoặc</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button type="button" onClick={() => setShowAdminModal(true)} className="btn-pill">
              <ShieldCheck className="w-5 h-5 text-blue-700" aria-hidden="true" />
              Đăng nhập quản trị viên
            </button>
          </div>

          <p className="mt-5 px-2 text-center text-base text-slate-600 leading-relaxed">
            Quên mật khẩu hoặc chưa có tài khoản? Liên hệ Văn phòng Tổ Toán để được cấp lại.
          </p>
        </div>
      </main>

      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-title">
          <div className="bg-white rounded-[1.75rem] max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-start justify-between gap-3">
              <h3 id="admin-title" className="font-display text-2xl font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" aria-hidden="true" />
                Đăng nhập quản trị viên
              </h3>
              <button type="button" onClick={() => setShowAdminModal(false)} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-base text-slate-600 leading-relaxed">
              Dành cho quản trị viên hệ thống. Máy chủ sẽ xác thực tài khoản Google của quản trị viên gốc <span className="font-mono text-slate-900 font-medium">viethathd@gmail.com</span>.
            </p>

            {adminError && (
              <div role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-base">{adminError}</div>
            )}

            <button type="button" onClick={handleGoogleAdminLogin} disabled={loadingGoogle} className="btn-pill btn-pill-dark">
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
