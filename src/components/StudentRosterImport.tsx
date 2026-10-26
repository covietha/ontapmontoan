import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** code: mã đăng nhập theo lớp (12A101…); nationalId: mã học sinh trong sổ điểm của Sở. */
interface RosterStudent { code: string; nationalId: string; name: string; dob: string }
interface RosterClass { classroom: string; fileName: string; students: RosterStudent[] }
interface Created { classroom: string; code: string; name: string; password: string }

/** Mã đăng nhập theo lớp: 12A1 + số thứ tự 2 chữ số = 12A101. */
const loginCode = (cls: string, stt: number) => `${cls}${String(stt).padStart(2, '0')}`;
const classOk = (c: string) => /^[0-9]{2}[A-Z]{1,3}[0-9]{0,2}$/.test(c);

/**
 * Đọc file danh sách. Hai dạng:
 *  1) Mẫu nhập học sinh của hệ thống: Mã học sinh (*) | Họ và tên (*) | Lớp (*) | Ngày sinh | Giới tính, nhiều lớp trong một file.
 *     Nếu ô mã để trống thì tự đặt theo lớp + số thứ tự (12A101…).
 *  2) Bảng điểm từng lớp: tiêu đề "Khối 12 - Lớp 12A1", cột 2 là mã học sinh, cột 3-4 là họ đệm và tên.
 */
function parseSheet(buf: ArrayBuffer, fileName: string): RosterClass[] {
  const wb = XLSX.read(buf, { type: 'array' });
  const out = new Map<string, RosterClass>();
  const add = (classroom: string, s: RosterStudent) => {
    if (!out.has(classroom)) out.set(classroom, { classroom, fileName, students: [] });
    out.get(classroom)!.students.push(s);
  };
  for (const sheetName of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    const norm = (x: unknown) => String(x ?? '').trim().toLowerCase();
    const head = rows.findIndex(r => {
      const h = r.map(norm);
      return h.some(x => x === 'lớp' || x.startsWith('lớp (')) && h.some(x => x.startsWith('họ và tên')) && h.some(x => x.startsWith('mã'));
    });
    if (head >= 0) {
      const h = rows[head].map(norm);
      const ci = h.findIndex(x => x === 'lớp' || x.startsWith('lớp ('));
      const ni = h.findIndex(x => x.startsWith('họ và tên'));
      const di = h.findIndex(x => x.startsWith('ngày'));
      const si = h.findIndex(x => x === 'stt');
      const nidI = h.findIndex(x => x.startsWith('mã') && x.includes('sở'));
      let li = h.findIndex(x => x.startsWith('mã đăng nhập'));
      if (li < 0) li = h.findIndex((x, i) => x.startsWith('mã học sinh') && i !== nidI);
      const perClass = new Map<string, number>();
      for (const r of rows.slice(head + 1)) {
        const cls = String(r[ci] ?? '').trim().toUpperCase();
        const name = String(r[ni] ?? '').replace(/\s+/g, ' ').trim();
        if (!classOk(cls) || !name) continue;
        const n = (perClass.get(cls) || 0) + 1;
        perClass.set(cls, n);
        const given = li >= 0 ? String(r[li] ?? '').trim().toUpperCase().replace(/\.0$/, '') : '';
        const stt = si >= 0 && Number(r[si]) > 0 ? Number(r[si]) : n;
        const code = given || loginCode(cls, stt);
        add(cls, {
          code, nationalId: nidI >= 0 ? String(r[nidI] ?? '').trim().replace(/\.0$/, '') : '', name,
          dob: String(di >= 0 ? r[di] ?? '' : '').trim()
        });
      }
      continue;
    }
    let classroom = '';
    for (const r of rows.slice(0, 10)) {
      const m = /Lớp\s+([0-9]{2}[A-Za-z]{1,3}[0-9]{0,2})/i.exec(String(r[0] ?? ''));
      if (m) { classroom = m[1].toUpperCase(); break; }
    }
    if (!classroom) {
      const m = /lop[_\s-]*([0-9]{2}[a-z]{1,3}[0-9]{0,2})/i.exec(fileName);
      if (m) classroom = m[1].toUpperCase();
    }
    if (!classroom) continue;
    for (const r of rows) {
      const nid = String(r[1] ?? '').trim().replace(/\.0$/, '');
      if (!/^\d{6,12}$/.test(nid)) continue;
      const name = `${String(r[2] ?? '').trim()} ${String(r[3] ?? '').trim()}`.replace(/\s+/g, ' ').trim();
      const stt = Number(r[0]) > 0 ? Number(r[0]) : (out.get(classroom)?.students.length || 0) + 1;
      if (name) add(classroom, { code: loginCode(classroom, stt), nationalId: nid, name, dob: String(r[4] ?? '').trim() });
    }
  }
  if (out.size === 0) throw new Error(`File "${fileName}" không đúng mẫu hoặc không có dòng học sinh nào.`);
  return [...out.values()];
}

interface Props { onDone?: () => void; }

export const StudentRosterImport: React.FC<Props> = ({ onDone }) => {
  const { getIdToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [classes, setClasses] = useState<RosterClass[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [created, setCreated] = useState<Created[] | null>(null);
  const [result, setResult] = useState<{ removed: number; updated: number } | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const ok: RosterClass[] = [];
    const errs: string[] = [];
    for (const f of files) {
      try { ok.push(...parseSheet(await f.arrayBuffer(), f.name)); } catch (err: any) { errs.push(err.message || String(err)); }
    }
    // Gộp theo lớp (nếu chọn trùng file), bỏ mã học sinh trùng
    const byClass = new Map<string, RosterClass>();
    ok.forEach(c => byClass.set(c.classroom, c));
    const seen = new Set<string>();
    const list = [...byClass.values()].sort((a, b) => a.classroom.localeCompare(b.classroom, 'vi', { numeric: true }));
    list.forEach(c => {
      c.students = c.students.filter(s => { if (seen.has(s.code)) { errs.push(`Mã ${s.code} (${s.name}) bị trùng, chỉ giữ một lần.`); return false; } seen.add(s.code); return true; });
    });
    setClasses(list); setErrors(errs); setCreated(null); setResult(null); setFatal(null); setConfirm(false);
  };

  const total = classes.reduce((n, c) => n + c.students.length, 0);

  const run = async () => {
    setBusy(true); setFatal(null); setConfirm(false);
    const all: Created[] = [];
    let updated = 0;
    try {
      const token = await getIdToken();
      const call = async (body: unknown) => {
        const res = await fetch('/api/accounts/import-students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Máy chủ trả lỗi ${res.status}`);
        return data;
      };
      for (const c of classes) {
        setProgress(`Đang nhập lớp ${c.classroom} (${c.students.length} học sinh)…`);
        const data = await call({ classroom: c.classroom, students: c.students });
        (data.created as { code: string; name: string; password: string }[]).forEach(x => all.push({ classroom: c.classroom, ...x }));
        updated += data.updatedCount || 0;
      }
      setProgress('Đang xóa học sinh cũ không còn trong danh sách…');
      const fin = await call({ finalize: true, keepCodes: classes.flatMap(c => c.students.map(s => s.code)) });
      setCreated(all);
      setResult({ removed: fin.removed || 0, updated });
      setProgress('');
      onDone?.();
    } catch (e: any) {
      setFatal(`${e.message} — Danh sách có thể mới nhập được một phần. Thầy chọn lại file và nhập lại, học sinh đã có sẽ không bị tạo trùng.`);
      if (all.length) setCreated(all);
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!created) return;
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Lớp', 'STT', 'Mã đăng nhập', 'Họ và tên', 'Mật khẩu ban đầu'],
      ...created.map((c, i, arr) => [c.classroom, arr.slice(0, i).filter(x => x.classroom === c.classroom).length + 1, c.code, c.name, c.password])
    ]);
    sheet['!cols'] = [{ wch: 8 }, { wch: 6 }, { wch: 26 }, { wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, sheet, 'Tài khoản học sinh');
    XLSX.writeFile(wb, 'tai_khoan_hoc_sinh.xlsx');
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div>
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-blue-600" />Nhập danh sách học sinh từ file Excel</h3>
        <p className="text-xs text-slate-600 mt-1">
          Chọn file danh sách học sinh (.xls hoặc .xlsx): một file gộp các lớp theo mẫu của hệ thống, hoặc các file bảng điểm từng lớp. Hệ thống lấy tên lớp, mã học sinh và họ tên, tạo tài khoản
          (tên đăng nhập là <strong>mã theo lớp</strong>, ví dụ 12A101, 12A102…, mật khẩu ngẫu nhiên riêng từng em) và xóa các học sinh cũ không còn trong danh sách.
        </p>
      </div>

      <input ref={fileRef} type="file" accept=".xls,.xlsx" multiple className="hidden" onChange={onFiles} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-3 py-2">
        <Upload className="w-4 h-4" /> Chọn các file Excel
      </button>

      {errors.length > 0 && (
        <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          {errors.map((e, i) => <li key={i} className="flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{e}</li>)}
        </ul>
      )}

      {classes.length > 0 && !created && (
        <>
          <div className="overflow-x-auto">
            <table className="text-xs border border-slate-200 rounded-lg">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-1.5 text-left">Lớp</th><th className="px-3 py-1.5 text-right">Số học sinh</th><th className="px-3 py-1.5 text-left">Học sinh đầu danh sách</th></tr></thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.classroom} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 font-mono font-bold">{c.classroom}</td>
                    <td className="px-3 py-1.5 text-right">{c.students.length}</td>
                    <td className="px-3 py-1.5 text-slate-600">{c.students[0].name} ({c.students[0].code} … {c.students[c.students.length - 1].code})</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50 font-bold"><td className="px-3 py-1.5">Tổng</td><td className="px-3 py-1.5 text-right">{total}</td><td /></tr>
              </tbody>
            </table>
          </div>
          {!confirm ? (
            <button type="button" disabled={busy} onClick={() => setConfirm(true)} className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2">
              Nhập {total} học sinh và thay thế danh sách cũ
            </button>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
              <p className="text-sm text-rose-900"><strong>Xác nhận:</strong> toàn bộ tài khoản học sinh cũ không có trong danh sách mới sẽ bị xóa, không khôi phục được. Điểm các em đã thi vẫn được giữ.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-4 py-2">Hủy</button>
                <button type="button" onClick={run} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2">Đồng ý, nhập và thay thế</button>
              </div>
            </div>
          )}
        </>
      )}

      {busy && <p role="status" className="text-sm text-blue-800">{progress}</p>}
      {fatal && <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{fatal}</p>}

      {created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          {result && (
            <p className="text-sm text-emerald-900 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              Đã tạo {created.length} tài khoản mới{result.updated ? `, cập nhật ${result.updated} tài khoản đã có` : ''}, xóa {result.removed} tài khoản học sinh cũ.
            </p>
          )}
          <p className="text-sm text-emerald-900"><strong>Tải file mật khẩu ngay bây giờ.</strong> Hệ thống chỉ lưu mật khẩu đã mã hóa nên sau này không xem lại được; nếu em nào quên, thầy dùng "Đặt lại MK".</p>
          <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2"><Download className="w-4 h-4" />Tải file tài khoản (Excel)</button>
        </div>
      )}
    </section>
  );
};

export default StudentRosterImport;
