import crypto from 'crypto';
import { SchoolAccount } from '../src/types';

export interface StoredAccountRecord extends SchoolAccount {
  passwordHash: string;
  salt: string;
}

// Server HMAC secret for signing school session tokens
const SERVER_SECRET = process.env.SESSION_SECRET || 'thpt-math-360-authoritative-salt-key-2026';

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
  const hmac = crypto.createHmac('sha256', SERVER_SECRET).update(payload).digest('hex');
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

  const expectedHmac = crypto.createHmac('sha256', SERVER_SECRET).update(payloadStr).digest('hex');
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

import fs from 'fs';
import path from 'path';

// Generate deterministic initial password hashes for seeded school accounts (mật khẩu mặc định: 'ThptMath@2026')
const DEFAULT_SEED_PASSWORD = 'ThptMath@2026';
const seed1 = hashPassword(DEFAULT_SEED_PASSWORD);
const seed2 = hashPassword(DEFAULT_SEED_PASSWORD);
const seed3 = hashPassword(DEFAULT_SEED_PASSWORD);
const seed4 = hashPassword(DEFAULT_SEED_PASSWORD);

const INITIAL_SEEDS: StoredAccountRecord[] = [
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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ACCOUNTS_FILE_PATH = path.join(DATA_DIR, 'server_accounts.json');

/**
 * Load accounts from persistent file, or fallback to INITIAL_SEEDS
 */
function loadAccountsFromDisk(): StoredAccountRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
      const content = fs.readFileSync(ACCOUNTS_FILE_PATH, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // File not found or empty: initialize with seeds
    fs.writeFileSync(ACCOUNTS_FILE_PATH, JSON.stringify(INITIAL_SEEDS, null, 2), 'utf8');
    return [...INITIAL_SEEDS];
  } catch (err) {
    console.warn('[server/accounts] Failed to load accounts file, using memory seeds:', err);
    return [...INITIAL_SEEDS];
  }
}

/**
 * Persistently save accounts array to disk
 */
export function saveAccounts(accounts: StoredAccountRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE_PATH, JSON.stringify(accounts, null, 2), 'utf8');
  } catch (err) {
    console.error('[server/accounts] Failed to write accounts to disk:', err);
  }
}

/**
 * Live array of school accounts (persisted to disk)
 */
export const SERVER_ACCOUNTS: StoredAccountRecord[] = loadAccountsFromDisk();

export interface SchoolAccountConfig {
  teachersCanCreateStudents: boolean;
  defaultStudentPassword?: string;
}

export const SCHOOL_CONFIG: SchoolAccountConfig = {
  teachersCanCreateStudents: true,
  defaultStudentPassword: DEFAULT_SEED_PASSWORD
};
