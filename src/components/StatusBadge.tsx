import React from 'react';
import { PencilLine, Clock, CheckCircle2, XCircle, Send, Trash2 } from 'lucide-react';

/**
 * Nhãn trạng thái tài liệu dùng chung: luôn có CHỮ + BIỂU TƯỢNG + màu (không chỉ dựa vào màu).
 * Học sinh thấy lời giải thích ngắn gọn, giáo viên thấy nhãn đầy đủ.
 */
export type DocStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'published' | 'trash';

const META: Record<DocStatus, { label: string; studentLabel: string; hint: string; studentHint: string; Icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  draft: {
    label: 'Bản nháp', studentLabel: 'Bản nháp',
    hint: 'Chỉ giáo viên thấy, chưa gửi duyệt.', studentHint: 'Chưa dùng cho học sinh.',
    Icon: PencilLine, cls: 'bg-slate-100 text-slate-700 border-slate-300'
  },
  pending: {
    label: 'Chờ duyệt', studentLabel: 'Chờ giáo viên duyệt',
    hint: 'Cần giáo viên kiểm tra đề bài, công thức và đáp án.', studentHint: 'Dùng để luyện tập, chưa phải nội dung chính thức. Đáp án có thể được điều chỉnh.',
    Icon: Clock, cls: 'bg-amber-50 text-amber-900 border-amber-300'
  },
  approved: {
    label: 'Đã duyệt', studentLabel: 'Đã duyệt',
    hint: 'Đã được giáo viên kiểm tra, dùng chính thức.', studentHint: 'Nội dung chính thức do giáo viên kiểm tra.',
    Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-900 border-emerald-300'
  },
  rejected: {
    label: 'Từ chối', studentLabel: 'Từ chối',
    hint: 'Chưa đạt, xem lý do giáo viên ghi và sửa lại.', studentHint: 'Không dùng cho học sinh.',
    Icon: XCircle, cls: 'bg-rose-50 text-rose-900 border-rose-300'
  },
  published: {
    label: 'Đã phát hành', studentLabel: 'Đề của giáo viên',
    hint: 'Học sinh đang thấy đề này ở Phòng thi thử.', studentHint: 'Đề do giáo viên phát hành.',
    Icon: Send, cls: 'bg-emerald-50 text-emerald-900 border-emerald-300'
  },
  trash: {
    label: 'Thùng rác', studentLabel: 'Thùng rác',
    hint: 'Đã xóa mềm, có thể khôi phục.', studentHint: 'Không dùng cho học sinh.',
    Icon: Trash2, cls: 'bg-slate-100 text-slate-600 border-slate-300'
  }
};

/** Chuyển trạng thái cũ của hệ thống sang nhãn chung. */
export function toDocStatus(opts: { approvalStatus?: string; status?: string }): DocStatus {
  const a = opts.approvalStatus;
  if (a === 'pending' || a === 'rejected' || a === 'trash') return a;
  if (opts.status === 'sample_needs_review') return 'pending';
  return 'approved';
}

interface Props {
  status: DocStatus;
  /** 'student' dùng chữ dễ hiểu cho học sinh. Mặc định: giáo viên. */
  audience?: 'student' | 'teacher';
  /** Đổi chữ hiển thị (vẫn giữ biểu tượng và màu). */
  label?: string;
  /** Hiện thêm dòng giải thích bên dưới nhãn. */
  showHint?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<Props> = ({ status, audience = 'teacher', label, showHint = false, className = '' }) => {
  const m = META[status];
  const text = label ?? (audience === 'student' ? m.studentLabel : m.label);
  const hint = audience === 'student' ? m.studentHint : m.hint;
  const badge = (
    <span title={hint} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold leading-none whitespace-nowrap ${m.cls} ${className}`}>
      <m.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
  if (!showHint) return badge;
  return (
    <span className="inline-flex flex-col gap-1 items-start">
      {badge}
      <span className="text-xs text-slate-600 leading-snug">{hint}</span>
    </span>
  );
};

export default StatusBadge;
