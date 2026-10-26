import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Search, X, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface Group {
  id: string; name: string; grade: number; academicYear: string; description: string;
  studentIds: string[]; createdBy: string; createdAt: string;
}
interface Form { id: string | null; name: string; grade: number; academicYear: string; description: string; ids: string[] }

const blank = (): Form => ({ id: null, name: '', grade: 12, academicYear: '2025-2026', description: '', ids: [] });

/** Lớp do giáo viên tự tạo: chọn học sinh từ danh sách các lớp đã cập nhật rồi đưa vào lớp mới. */
export const ClassGroups: React.FC = () => {
  const { getIdToken, profile, isRootAdmin } = useAuth();
  const { students } = useData();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [fromClass, setFromClass] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Group | null>(null);

  // Học sinh theo tài khoản (mã tài khoản dùng làm khóa)
  const byAcc = useMemo(() => {
    const m = new Map<string, (typeof students)[number]>();
    students.forEach(s => { if (s.accountId) m.set(s.accountId, s); });
    return m;
  }, [students]);
  const classCodes = useMemo(
    () => Array.from(new Set(students.map(s => s.classroomCode))).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true })),
    [students]
  );

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getIdToken();
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
    return data;
  }, [getIdToken]);

  const load = useCallback(async () => {
    try {
      setGroups((await api('/api/classes')).classes || []);
    } catch (e: any) {
      setNotice({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter(s => s.accountId && (!fromClass || s.classroomCode === fromClass))
      .filter(s => !q || s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q));
  }, [students, fromClass, query]);

  const chosen = form ? new Set(form.ids) : new Set<string>();
  const toggle = (id: string) => setForm(f => f && ({ ...f, ids: f.ids.includes(id) ? f.ids.filter(x => x !== id) : [...f.ids, id] }));
  const addAll = () => setForm(f => f && ({ ...f, ids: Array.from(new Set([...f.ids, ...pool.map(s => s.accountId!)])) }));
  const removeAllShown = () => setForm(f => f && ({ ...f, ids: f.ids.filter(id => !pool.some(s => s.accountId === id)) }));

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return setNotice({ ok: false, text: 'Vui lòng nhập tên lớp.' });
    setSaving(true); setNotice(null);
    try {
      const body = JSON.stringify({ name: form.name, grade: form.grade, academicYear: form.academicYear, description: form.description, studentIds: form.ids });
      await api(form.id ? `/api/classes/${form.id}` : '/api/classes', { method: form.id ? 'PUT' : 'POST', body });
      await load();
      setNotice({ ok: true, text: form.id ? 'Đã lưu thay đổi của lớp.' : `Đã tạo lớp "${form.name.trim()}" với ${form.ids.length} học sinh.` });
      setForm(null);
    } catch (e: any) {
      setNotice({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Group) => {
    try {
      await api(`/api/classes/${g.id}`, { method: 'DELETE' });
      setConfirmDel(null);
      await load();
      setNotice({ ok: true, text: `Đã xóa lớp "${g.name}". Tài khoản học sinh không bị ảnh hưởng.` });
    } catch (e: any) {
      setConfirmDel(null);
      setNotice({ ok: false, text: e.message });
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500';
  const canEdit = (g: Group) => isRootAdmin || g.createdBy === profile?.email;

  const NoticeBar = notice && (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
      {notice.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{notice.text}</span>
      <button onClick={() => setNotice(null)} aria-label="Đóng"><X className="w-4 h-4" /></button>
    </div>
  );

  if (form) {
    return (
      <div className="space-y-4">
        {NoticeBar}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-bold text-slate-900">{form.id ? 'Sửa lớp' : 'Tạo lớp mới'}</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <label className="md:col-span-2 text-xs font-bold text-slate-700">Tên lớp
              <input className={`${inputCls} mt-1 font-normal`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Ôn thi tốt nghiệp - nhóm 1" />
            </label>
            <label className="text-xs font-bold text-slate-700">Khối
              <select className={`${inputCls} mt-1 font-normal`} value={form.grade} onChange={e => setForm({ ...form, grade: Number(e.target.value) })}>
                {[12, 11, 10].map(g => <option key={g} value={g}>Khối {g}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">Năm học
              <input className={`${inputCls} mt-1 font-normal`} value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} />
            </label>
            <label className="md:col-span-4 text-xs font-bold text-slate-700">Ghi chú (không bắt buộc)
              <input className={`${inputCls} mt-1 font-normal`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Chọn học sinh từ danh sách lớp</h4>
            <div className="flex flex-wrap gap-2">
              <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={fromClass} onChange={e => setFromClass(e.target.value)} aria-label="Chọn lớp nguồn">
                <option value="">Tất cả các lớp</option>
                {classCodes.map(c => <option key={c} value={c}>Lớp {c}</option>)}
              </select>
              <div className="relative flex-1 min-w-[8rem]">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input className={`${inputCls} pl-8`} placeholder="Tìm tên hoặc mã" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={addAll} className="rounded-lg bg-blue-50 text-blue-700 font-bold px-3 py-1.5 hover:bg-blue-100">Thêm tất cả {pool.length} em đang hiện</button>
              <button type="button" onClick={removeAllShown} className="rounded-lg text-slate-600 font-bold px-3 py-1.5 hover:bg-slate-100">Bỏ các em đang hiện</button>
            </div>
            <ul className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {pool.length === 0 && <li className="p-4 text-sm text-slate-500">Không có học sinh phù hợp.</li>}
              {pool.map(s => (
                <li key={s.id}>
                  <label className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={chosen.has(s.accountId!)} onChange={() => toggle(s.accountId!)} />
                    <span className="flex-1 truncate">{s.fullName}</span>
                    <span className="font-mono text-xs text-slate-500">{s.studentCode}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Users className="w-4 h-4" />Học sinh trong lớp ({form.ids.length})</h4>
            {form.ids.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có em nào. Chọn lớp ở bên trái rồi tick từng em hoặc bấm "Thêm tất cả". Thầy có thể đổi sang lớp khác để thêm tiếp.</p>
            ) : (
              <ul className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {form.ids.map(id => {
                  const s = byAcc.get(id);
                  return (
                    <li key={id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{s?.fullName || id}</span>
                      <span className="text-xs text-slate-500">{s?.classroomCode}</span>
                      <button type="button" onClick={() => toggle(id)} className="text-slate-400 hover:text-rose-600" aria-label="Bỏ khỏi lớp"><X className="w-4 h-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-300 text-sm font-medium px-4 py-2">Hủy</button>
          <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2">{saving ? 'Đang lưu…' : 'Lưu lớp'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {NoticeBar}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setNotice(null); setFromClass(''); setQuery(''); setForm(blank()); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5">
          <Plus className="w-4 h-4" /> Tạo lớp mới
        </button>
        <p className="text-sm text-slate-600">Tạo lớp riêng (đội tuyển, nhóm ôn thi…) rồi chọn học sinh từ danh sách các lớp 12A1–12A10 đưa vào.</p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Đang tải…</p> : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Chưa có lớp nào do thầy cô tạo.</div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {groups.map(g => {
            const perClass = new Map<string, number>();
            g.studentIds.forEach(id => { const c = byAcc.get(id)?.classroomCode; if (c) perClass.set(c, (perClass.get(c) || 0) + 1); });
            return (
              <li key={g.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-semibold text-slate-900 flex-1">{g.name}</h4>
                  <span className="text-xs text-slate-500">Khối {g.grade} · {g.academicYear}</span>
                </div>
                {g.description && <p className="text-sm text-slate-600">{g.description}</p>}
                <p className="text-sm text-slate-700"><strong>{g.studentIds.length}</strong> học sinh{perClass.size > 0 && <span className="text-slate-500"> — {[...perClass].map(([c, n]) => `${c}: ${n}`).join(', ')}</span>}</p>
                <p className="text-xs text-slate-500">Tạo bởi {g.createdBy}</p>
                {canEdit(g) && (
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setNotice(null); setFromClass(''); setQuery(''); setForm({ id: g.id, name: g.name, grade: g.grade, academicYear: g.academicYear, description: g.description, ids: g.studentIds }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-1.5"><Pencil className="w-3.5 h-3.5" />Sửa</button>
                    <button type="button" onClick={() => setConfirmDel(g)} className="inline-flex items-center gap-1.5 rounded-lg text-rose-700 hover:bg-rose-50 text-sm font-medium px-3 py-1.5 ml-auto"><Trash2 className="w-3.5 h-3.5" />Xóa</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-display font-semibold text-slate-900">Xóa lớp này?</h3>
            <p className="text-sm text-slate-600">Lớp "{confirmDel.name}" sẽ bị xóa. Tài khoản học sinh và các lớp 12A1–12A10 không bị ảnh hưởng.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="rounded-lg border border-slate-300 text-sm font-medium px-4 py-2">Giữ lại</button>
              <button onClick={() => remove(confirmDel)} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2">Xóa lớp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassGroups;
