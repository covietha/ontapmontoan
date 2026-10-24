import fs from 'fs';
import path from 'path';
import firebaseConfig from '../firebase-applet-config.json';

/**
 * Lớp lưu trữ dùng chung cho máy chủ (tài khoản, quản trị viên, kết quả thi, cấu hình).
 *
 * - Trên Vercel (hoặc khi có FIREBASE_SERVICE_ACCOUNT): ghi vào Cloud Firestore bằng firebase-admin.
 *   Hàm serverless không có ổ đĩa lâu dài nên không thể lưu vào file.
 * - Chạy trên máy (npm run dev) mà chưa có khóa dịch vụ: ghi vào thư mục data/store.
 * - Trên Vercel mà thiếu khóa dịch vụ: chỉ đọc được dữ liệu mẫu, mọi thao tác ghi báo lỗi rõ ràng
 *   thay vì lưu tạm rồi mất.
 */

export type Doc = Record<string, any>;

export interface Store {
  readonly backend: 'firestore' | 'file' | 'memory';
  get(collection: string, id: string): Promise<Doc | null>;
  list(collection: string): Promise<Doc[]>;
  where(collection: string, field: string, value: unknown): Promise<Doc[]>;
  set(collection: string, id: string, data: Doc, options?: { merge?: boolean }): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  /** Ghi dữ liệu mẫu ban đầu, chỉ khi bộ sưu tập còn trống. Luôn được phép, kể cả khi chưa cấu hình lưu trữ. */
  seedIfEmpty(collection: string, docs: { id: string; data: Doc }[]): Promise<void>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Máy chủ chưa được cấu hình nơi lưu dữ liệu. Hãy thêm biến môi trường FIREBASE_SERVICE_ACCOUNT trên Vercel (xem HUONG_DAN_VERCEL.md).'
    );
    this.name = 'StorageNotConfiguredError';
  }
}

const ON_VERCEL = !!process.env.VERCEL;

function parseServiceAccount(raw: string): Doc {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const parsed = JSON.parse(text);
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

/* ───────────────────────── Firestore ───────────────────────── */

function createFirestoreStore(serviceAccount: Doc): Store {
  let dbPromise: Promise<any> | null = null;

  const getDb = () => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const { initializeApp, getApps, getApp, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');
        const app = getApps().length
          ? getApp()
          : initializeApp({ credential: cert(serviceAccount as any), projectId: firebaseConfig.projectId });
        return getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
      })();
    }
    return dbPromise;
  };

  // Firestore từ chối giá trị undefined
  const clean = (data: Doc): Doc => JSON.parse(JSON.stringify(data));

  return {
    backend: 'firestore',
    async get(collection, id) {
      const snap = await (await getDb()).collection(collection).doc(id).get();
      return snap.exists ? (snap.data() as Doc) : null;
    },
    async list(collection) {
      const snap = await (await getDb()).collection(collection).get();
      return snap.docs.map((d: any) => d.data() as Doc);
    },
    async where(collection, field, value) {
      const snap = await (await getDb()).collection(collection).where(field, '==', value).get();
      return snap.docs.map((d: any) => d.data() as Doc);
    },
    async set(collection, id, data, options) {
      await (await getDb()).collection(collection).doc(id).set(clean(data), { merge: !!options?.merge });
    },
    async delete(collection, id) {
      await (await getDb()).collection(collection).doc(id).delete();
    },
    async seedIfEmpty(collection, docs) {
      const db = await getDb();
      const existing = await db.collection(collection).limit(1).get();
      if (!existing.empty) return;
      const batch = db.batch();
      docs.forEach((d) => batch.set(db.collection(collection).doc(d.id), clean(d.data)));
      await batch.commit();
    }
  };
}

/* ───────────────────────── File / memory ───────────────────────── */

function createLocalStore(mode: 'file' | 'memory'): Store {
  const dir = path.resolve(process.cwd(), 'data', 'store');
  const cache = new Map<string, Record<string, Doc>>();

  const load = (collection: string): Record<string, Doc> => {
    const hit = cache.get(collection);
    if (hit) return hit;
    let data: Record<string, Doc> = {};
    if (mode === 'file') {
      try {
        const file = path.join(dir, `${collection}.json`);
        if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (err) {
        console.warn(`[store] Không đọc được ${collection}:`, err);
      }
    }
    cache.set(collection, data);
    return data;
  };

  const persist = (collection: string) => {
    if (mode !== 'file') return;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${collection}.json`), JSON.stringify(load(collection), null, 2), 'utf8');
  };

  const assertWritable = () => {
    if (mode === 'memory') throw new StorageNotConfiguredError();
  };

  return {
    backend: mode,
    async get(collection, id) {
      return load(collection)[id] ?? null;
    },
    async list(collection) {
      return Object.values(load(collection));
    },
    async where(collection, field, value) {
      return Object.values(load(collection)).filter((d) => d[field] === value);
    },
    async set(collection, id, data, options) {
      assertWritable();
      const col = load(collection);
      col[id] = options?.merge ? { ...(col[id] || {}), ...data } : { ...data };
      persist(collection);
    },
    async delete(collection, id) {
      assertWritable();
      delete load(collection)[id];
      persist(collection);
    },
    async seedIfEmpty(collection, docs) {
      const col = load(collection);
      if (Object.keys(col).length > 0) return;
      docs.forEach((d) => { col[d.id] = { ...d.data }; });
      persist(collection);
    }
  };
}

/* ───────────────────────── Chọn nơi lưu ───────────────────────── */

function createStore(): Store {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return createFirestoreStore(parseServiceAccount(raw));
    } catch (err: any) {
      console.error('[store] FIREBASE_SERVICE_ACCOUNT không đọc được:', err?.message || err);
      if (ON_VERCEL) return createLocalStore('memory');
    }
  }
  return createLocalStore(ON_VERCEL ? 'memory' : 'file');
}

export const store: Store = createStore();
