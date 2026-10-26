import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Key, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props { onClose: () => void; }

/** Hộp thoại tự đổi mật khẩu: dùng cho cả học sinh và giáo viên. Các ô luôn để trống. */
export const ChangePasswordModal: React.FC<Props> = ({ onClose }) => {
  const { getIdToken } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!oldPw) return setError('Nhập mật khẩu hiện tại.');
    if (newPw.trim().length < 8) return setError('Mật khẩu mới cần ít nhất 8 ký tự.');
    if (newPw !== newPw2) return setError('Hai lần nhập mật khẩu mới chưa giống nhau.');
    setBusy(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data?.error || `Máy chủ trả lỗi ${res.status}`);
      setDone(true);
    } catch (e: any) {
      setError('Lỗi mạng: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    { l: 'Mật khẩu hiện tại', v: oldPw, set: setOldPw, ac: 'current-password' },
    { l: 'Mật khẩu mới (ít nhất 8 ký tự)', v: newPw, set: setNewPw, ac: 'new-password' },
    { l: 'Nhập lại mật khẩu mới', v: newPw2, set: setNewPw2, ac: 'new-password' }
  ];

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Đổi mật khẩu">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Key className="w-4 h-4 text-blue-600" />Đổi mật khẩu của tôi</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Đóng">✕</button>
        </div>
        {done ? (
          <>
            <p className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> Đã lưu mật khẩu mới. Lần đăng nhập sau dùng mật khẩu này.
            </p>
            <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">Đóng</button></div>
          </>
        ) : (
          <>
            {fields.map(f => (
              <div key={f.l}>
                <label className="block text-xs font-bold text-slate-700 mb-1">{f.l}</label>
                <input type="password" autoComplete={f.ac} value={f.v} onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
            ))}
            {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Hủy</button>
              <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white">{busy ? 'Đang lưu…' : 'Xác nhận đổi'}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
