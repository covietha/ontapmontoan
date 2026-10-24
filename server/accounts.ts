import crypto from 'crypto';
import { SchoolAccount } from '../src/types';

export interface StoredAccountRecord extends SchoolAccount {
  passwordHash: string;
  salt: string;
}

import { store, Doc } from './store';

// Khóa ký phiên đăng nhập. Ở môi trường chạy thật bắt buộc phải đặt SESSION_SECRET,
// nếu không ai đọc được mã nguồn cũng ký giả được phiên của giáo viên.
const DEV_SECRET = 'thpt-math-360-authoritative-salt-key-2026';
function getSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('Máy chủ chưa đặt biến môi trường SESSION_SECRET (xem HUONG_DAN_VERCEL.md).');
  }
  return DEV_SECRET;
}

/**
 * Hash password using PBKDF2 with SHA-512 and random 16-byte salt
 * Zero external libraries, standard node:crypto, NIST-recommended
 */
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Timing-safe password verification against stored cryptographic hash
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Issue a secure HMAC-signed school session token
 * Format: sch_token_<uid>_<expTimestamp>_<hmacSignature>
 */
export function createSchoolToken(uid: string, username: string, role: string, durationSeconds: number = 86400 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + durationSeconds;
  const payload = `${uid}:${username}:${role}:${exp}`;
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  const token = `sch_token_${Buffer.from(payload).toString('base64url')}_${hmac}`;
  return token;
}

/**
 * Authoritatively verify HMAC-signed school session token
 */
export function verifySchoolToken(token: string): { valid: boolean; uid?: string; username?: string; role?: string; error?: string } {
  if (!token.startsWith('sch_token_')) {
    return { valid: false, error: 'Định dạng mã phiên không hợp lệ' };
  }

  const parts = token.split('_');
  if (parts.length !== 4) { // ['sch', 'token', payloadBase64, hmac]
    return { valid: false, error: 'Cấu trúc token không đúng định dạng' };
  }

  const payloadBase64 = parts[2];
  const signature = parts[3];

  let payloadStr: string;
  try {
    payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf8');
  } catch {
    return { valid: false, error: 'Không thể giải mã dữ liệu phiên' };
  }

  const expectedHmac = crypto.createHmac('sha256', getSecret()).update(payloadStr).digest('hex');
  try {
    const validSig = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedHmac, 'hex'));
    if (!validSig) {
      return { valid: false, error: 'Chữ ký số của phiên làm việc không hợp lệ hoặc đã bị thay đổi' };
    }
  } catch {
    return { valid: false, error: 'Lỗi kiểm tra tính toàn vẹn phiên' };
  }

  const [uid, username, role, expStr] = payloadStr.split(':');
  const exp = parseInt(expStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(exp) || exp < now) {
    return { valid: false, error: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  return {
    valid: true,
    uid,
    username,
    role
  };
}

// Mật khẩu mặc định của các tài khoản mẫu: 'ThptMath@2026'
const DEFAULT_SEED_PASSWORD = 'ThptMath@2026';
function buildSeeds(): StoredAccountRecord[] {
  const seed1 = hashPassword(DEFAULT_SEED_PASSWORD);
  const seed2 = hashPassword(DEFAULT_SEED_PASSWORD);
  const seed3 = hashPassword(DEFAULT_SEED_PASSWORD);
  const seed4 = hashPassword(DEFAULT_SEED_PASSWORD);
  return [
  {
    id: 'sch_acc_gv01',
    username: 'GV01',
    displayName: 'Thầy Nguyễn Văn Bình',
    email: 'gv01@thptmath360.vn',
    role: 'teacher',
    classroom: 'Tổ Toán - Chủ nhiệm 12A1',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'viethathd@gmail.com',
    passwordHash: seed1.hash,
    salt: seed1.salt
  },
  {
    id: 'sch_acc_hs12001',
    username: 'HS12001',
    displayName: 'Nguyễn Văn An',
    email: 'hs12001@thptmath360.vn',
    role: 'student',
    classroom: '12A1',
    status: 'active',
    createdAt: '2026-01-05T00:00:00.000Z',
    createdBy: 'viethathd@gmail.com',
    passwordHash: seed2.hash,
    salt: seed2.salt
  },
  {
    id: 'sch_acc_hs12002',
    username: 'HS12002',
    displayName: 'Trần Thị Mai',
    email: 'hs12002@thptmath360.vn',
    role: 'student',
    classroom: '12A1',
    status: 'active',
    createdAt: '2026-01-05T00:00:00.000Z',
    createdBy: 'viethathd@gmail.com',
    passwordHash: seed3.hash,
    salt: seed3.salt
  },
  {
    id: 'sch_acc_hs12003',
    username: 'HS12003',
    displayName: 'Lê Hoàng Nam',
    email: 'hs12003@thptmath360.vn',
    role: 'student',
    classroom: '12A2',
    status: 'active',
    createdAt: '2026-01-06T00:00:00.000Z',
    createdBy: 'viethathd@gmail.com',
    passwordHash: seed4.hash,
    salt: seed4.salt
  }
];
}

export interface SchoolAccountConfig {
  teachersCanCreateStudents: boolean;
  defaultStudentPassword?: string;
}

export const DEFAULT_SCHOOL_CONFIG: SchoolAccountConfig = {
  teachersCanCreateStudents: true,
  defaultStudentPassword: DEFAULT_SEED_PASSWORD
};

const ACCOUNTS = 'schoolAccounts';

let seeding: Promise<void> | null = null;
/** Nạp tài khoản mẫu một lần khi hệ thống mới chạy lần đầu. */
function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = store
      .seedIfEmpty(ACCOUNTS, buildSeeds().map((a) => ({ id: a.id, data: a })))
      .catch((err) => { seeding = null; throw err; });
  }
  return seeding;
}

export async function listAccounts(): Promise<StoredAccountRecord[]> {
  await ensureSeeded();
  return (await store.list(ACCOUNTS)) as StoredAccountRecord[];
}

export async function getAccountById(id: string): Promise<StoredAccountRecord | null> {
  await ensureSeeded();
  return (await store.get(ACCOUNTS, id)) as StoredAccountRecord | null;
}

/** Tìm theo id, mã đăng nhập hoặc email (không phân biệt hoa thường). */
export async function findAccount(input: string): Promise<StoredAccountRecord | null> {
  await ensureSeeded();
  const raw = input.trim();
  const byId = await store.get(ACCOUNTS, raw.toLowerCase()) || await store.get(ACCOUNTS, raw);
  if (byId) return byId as StoredAccountRecord;
  const byUser = await store.where(ACCOUNTS, 'username', raw.toUpperCase());
  if (byUser[0]) return byUser[0] as StoredAccountRecord;
  const byEmail = await store.where(ACCOUNTS, 'email', raw.toLowerCase());
  return (byEmail[0] as StoredAccountRecord) ?? null;
}

export async function saveAccount(account: StoredAccountRecord): Promise<void> {
  await ensureSeeded();
  await store.set(ACCOUNTS, account.id, account as unknown as Doc);
}

export async function isTeacherAccountEmail(email: string): Promise<boolean> {
  await ensureSeeded();
  const matches = await store.where(ACCOUNTS, 'email', email.toLowerCase());
  return matches.some((a) => a.role === 'teacher');
}

export async function getSchoolConfig(): Promise<SchoolAccountConfig> {
  const saved = await store.get('config', 'school');
  return { ...DEFAULT_SCHOOL_CONFIG, ...(saved || {}) };
}

export async function saveSchoolConfig(config: SchoolAccountConfig): Promise<void> {
  await store.set('config', 'school', config as unknown as Doc);
}
