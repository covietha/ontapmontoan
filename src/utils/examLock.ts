/** Cho biết học sinh đang làm bài thi để các phần khác (như chatbox) tạm ẩn. */
let locked = false;
export const isExamLocked = () => locked;
export function setExamLock(v: boolean) {
  if (locked === v) return;
  locked = v;
  window.dispatchEvent(new CustomEvent('exam-lock', { detail: v }));
}
