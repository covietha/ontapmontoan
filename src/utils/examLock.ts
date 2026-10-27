/** Cho biết học sinh đang làm bài thi để các phần khác (như chatbox) tạm ẩn. */
let locked = false;
export const isExamLocked = () => locked;
export function setExamLock(v: boolean) {
  if (locked === v) return;
  locked = v;
  window.dispatchEvent(new CustomEvent('exam-lock', { detail: v }));
}

/** Nộp bài ngay (do ExamRoom đăng ký khi đang làm bài). */
let submitter: (() => Promise<void>) | null = null;
export function registerExamSubmitter(fn: () => Promise<void>) {
  submitter = fn;
  return () => { if (submitter === fn) submitter = null; };
}
export async function submitExamNow() {
  if (submitter) await submitter();
}

/**
 * Chặn việc rời phòng thi khi đang làm bài: App đăng ký hộp thoại xác nhận.
 * Mọi thao tác chuyển trang hoặc đăng xuất đi qua guardLeave().
 */
let leaveGuard: ((action: () => void) => void) | null = null;
export function setLeaveGuard(fn: ((action: () => void) => void) | null) { leaveGuard = fn; }
export function guardLeave(action: () => void) {
  if (locked && leaveGuard) leaveGuard(action);
  else action();
}
