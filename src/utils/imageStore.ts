/**
 * Hình trong câu hỏi được ghi trong văn bản dưới dạng ![w=300](nguồn).
 *  - "img:ID"           : hình vừa đọc từ file Word, còn nằm trong trình duyệt (chưa lưu lên máy chủ)
 *  - "/api/exam-images/…": hình đã lưu trên máy chủ, dùng chung cho mọi máy
 */
const mem = new Map<string, string>();

export const IMG_MD = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

export function registerImage(id: string, dataUrl: string) {
  mem.set(id, dataUrl);
}

export function resolveImageSrc(ref: string): string | null {
  if (ref.startsWith('img:')) return mem.get(ref.slice(4)) || null;
  if (/^\/api\/exam-images\/[a-f0-9]{8,64}$/.test(ref)) return ref;
  return null;
}

/** Số hình còn nằm trong trình duyệt trong các đoạn văn bản này. */
export function countLocalImages(texts: string[]): number {
  const ids = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(IMG_MD)) if (m[2].startsWith('img:')) ids.add(m[2]);
  return ids.size;
}

/** Tải các hình "img:ID" lên máy chủ và thay bằng đường dẫn chính thức. */
export async function uploadLocalImages(texts: string[], token: string | null): Promise<string[]> {
  const map = new Map<string, string>();
  for (const t of texts) for (const m of t.matchAll(IMG_MD)) if (m[2].startsWith('img:')) map.set(m[2], '');
  for (const ref of map.keys()) {
    const dataUrl = mem.get(ref.slice(4));
    if (!dataUrl) throw new Error('Một hình trong đề không còn dữ liệu, thầy nhập lại file Word nhé.');
    const res = await fetch('/api/exam-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ dataUrl })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j?.url) throw new Error(j?.error || `Không lưu được hình lên máy chủ (${res.status})`);
    map.set(ref, j.url);
  }
  return texts.map(t => t.replace(IMG_MD, (all, alt, src) => (map.has(src) ? `![${alt}](${map.get(src)})` : all)));
}

/** Thu nhỏ ảnh lớn để lưu gọn (chỉ chạy trong trình duyệt). */
export async function shrinkImage(dataUrl: string, force = false): Promise<string> {
  if (typeof document === 'undefined' || dataUrl.startsWith('data:image/svg')) return dataUrl;
  if (!force && dataUrl.length < 600_000) return dataUrl;
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const scale = Math.min(1, 1100 / Math.max(img.width, img.height));
    if (!force || scale < 1 || dataUrl.length > 600_000) {
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL('image/jpeg', 0.85);
      return out.length < dataUrl.length ? out : dataUrl;
    }
    return dataUrl;
  } catch { return dataUrl; }
}

/** Đọc một file hình do giáo viên chọn: trả về thẻ markdown ![w=…](img:ID) đã đăng ký trong trình duyệt. */
export async function imageFileToToken(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(file.type)) throw new Error('Chỉ nhận hình PNG, JPEG, GIF, WEBP hoặc SVG.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Hình quá lớn (tối đa 8MB).');
  const raw = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Không đọc được file hình.'));
    fr.readAsDataURL(file);
  });
  const url = await shrinkImage(raw, true);
  let w = 300;
  try {
    const img = new Image(); img.src = url; await img.decode();
    w = Math.max(40, Math.min(420, img.naturalWidth || 300));
  } catch { /* giữ mặc định */ }
  const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  registerImage(id, url);
  return `![w=${w}](img:${id})`;
}
