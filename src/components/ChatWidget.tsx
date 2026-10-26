import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MathRenderer } from './MathRenderer';
import { isExamLocked } from '../utils/examLock';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Status { configured: boolean; enabled: boolean; available: boolean; remaining: number; dailyLimit: number }

const TEACHER_SUGGESTIONS = [
  'Gợi ý 3 câu vận dụng về cực trị hàm số kèm lời giải',
  'Lỗi sai thường gặp của học sinh khi giải bài tiệm cận',
  'Soạn câu đúng/sai về tính đơn điệu có 4 ý a, b, c, d'
];
const SUGGESTIONS = [
  'Nhắc em quy tắc đạo hàm của hàm hợp',
  'Cách tìm giá trị lớn nhất, nhỏ nhất trên một đoạn?',
  'Em hay quên xét dấu y′ khi tìm cực trị, làm sao nhớ?'
];

/** Trợ lý Toán ở góc màn hình. Tự ẩn khi học sinh đang làm bài thi thử. */
export const ChatWidget: React.FC<{ context: string }> = ({ context }) => {
  const { getIdToken, isTeacher } = useAuth();
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(isExamLocked());
  const [status, setStatus] = useState<Status | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: Event) => setLocked(!!(e as CustomEvent).detail);
    window.addEventListener('exam-lock', h);
    return () => window.removeEventListener('exam-lock', h);
  }, []);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getIdToken();
    const res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data?.error || `Lỗi ${res.status}`), { data });
    return data;
  }, [getIdToken]);

  const loadStatus = useCallback(async () => {
    try { setStatus(await call('/api/chat/status')); } catch { setStatus(null); }
  }, [call]);

  useEffect(() => { if (open && !status) loadStatus(); }, [open, status, loadStatus]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, busy, open]);
  useEffect(() => { if (locked) setOpen(false); }, [locked]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setError('');
    setBusy(true);
    try {
      const data = await call('/api/chat', { method: 'POST', body: JSON.stringify({ messages: next, context }) });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
      setStatus(s => (s ? { ...s, remaining: data.remaining } : s));
    } catch (e: any) {
      setError(e.message);
      if (typeof e.data?.remaining === 'number') setStatus(s => (s ? { ...s, remaining: e.data.remaining } : s));
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async () => {
    if (!status) return;
    try {
      await call('/api/chat/config', { method: 'PUT', body: JSON.stringify({ enabled: !status.enabled }) });
      await loadStatus();
    } catch (e: any) { setError(e.message); }
  };

  if (locked) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 right-4 bottom-14 md:bottom-16 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-flame-500 hover:bg-flame-600 text-white font-semibold text-sm shadow-lg shadow-flame-500/30 cursor-pointer"
          aria-label="Mở trợ lý Toán"
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" /> Hỏi trợ lý Toán
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Trợ lý Toán"
          className="fixed z-50 right-3 bottom-12 w-[calc(100vw-1.5rem)] sm:w-[26rem] h-[min(36rem,calc(100vh-5rem))] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
        >
          <header className="flex items-center gap-2 px-4 py-3 bg-blue-950 text-white">
            <Sparkles className="w-4 h-4 text-flame-500" aria-hidden="true" />
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-semibold">Trợ lý Toán</div>
              {status?.available && <div className="text-xs text-blue-200">Còn {status.remaining}/{status.dailyLimit} câu hỏi hôm nay</div>}
            </div>
            {isTeacher && status?.configured && (
              <button onClick={toggleEnabled} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
                title="Bật hoặc tắt trợ lý cho toàn trường">
                <Power className="w-3.5 h-3.5" /> {status.enabled ? 'Đang bật' : 'Đang tắt'}
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Đóng trợ lý" className="p-1.5 rounded-md hover:bg-white/10"><X className="w-5 h-5" /></button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {status && !status.available ? (
              <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl p-4 leading-relaxed">
                {!status.configured
                  ? 'Trợ lý Toán chưa được bật. Thầy cô cần thêm khóa GEMINI_API_KEY trên máy chủ (xem HUONG_DAN_VERCEL.md).'
                  : (isTeacher ? 'Trợ lý Toán đang tạm tắt. Thầy, cô bật lại ở nút phía trên.' : 'Trợ lý Toán đang tạm tắt. Em hỏi thầy cô nhé.')}
              </p>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl p-3 leading-relaxed">
                      {isTeacher
                        ? 'Chào thầy, cô! Thầy, cô cần hỗ trợ gì về môn Toán: giải bài, soạn câu hỏi, lời giải mẫu hay nhận xét cách dạy?'
                        : 'Chào em! Em hỏi bất cứ điều gì về bài Toán đang học. Trợ lý sẽ gợi ý từng bước trước, cần thì giải chi tiết.'}
                    </p>
                    <div className="flex flex-col gap-2">
                      {(isTeacher ? TEACHER_SUGGESTIONS : SUGGESTIONS).map(s => (
                        <button key={s} onClick={() => send(s)} className="text-left text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed overflow-x-auto ${
                      m.role === 'user' ? 'bg-blue-700 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                    }`}>
                      {m.role === 'user' ? m.content : <MathRenderer content={m.content} />}
                    </div>
                  </div>
                ))}
                {busy && <div className="text-sm text-slate-500 px-1" aria-live="polite">Trợ lý đang soạn câu trả lời…</div>}
                {error && <div role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
              </>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); send(input); }} className="p-3 border-t border-slate-200 bg-white flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={2}
              maxLength={2000}
              disabled={!!status && !status.available}
              placeholder={isTeacher ? "Nhập câu hỏi Toán của thầy, cô…" : "Nhập câu hỏi Toán của em…"}
              aria-label="Câu hỏi gửi trợ lý"
              className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
            />
            <button type="submit" disabled={busy || !input.trim() || (!!status && !status.available)}
              className="h-11 w-11 shrink-0 rounded-xl bg-flame-500 hover:bg-flame-600 text-white flex items-center justify-center disabled:opacity-50" aria-label="Gửi">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </section>
      )}
    </>
  );
};

export default ChatWidget;
