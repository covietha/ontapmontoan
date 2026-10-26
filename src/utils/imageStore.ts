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
