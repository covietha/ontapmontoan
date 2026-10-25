// Tệp sinh tự động từ server/ bằng scripts/build-api.mjs. Không sửa tay.

// server/app.ts
import express from "express";

// server/answerKeys.ts
var OFFICIAL_QUESTION_KEYS = {
  "Q-DH-001": {
    questionId: "Q-DH-001",
    correctOptionIndex: 0,
    // A
    explanation: `\xC1p d\u1EE5ng c\xF4ng th\u1EE9c gi\u1EA3i nhanh \u0111\u1EA1o h\xE0m c\u1EE7a h\xE0m ph\xE2n th\u1EE9c b\u1EADc nh\u1EA5t tr\xEAn b\u1EADc nh\u1EA5t:
$$y = \\frac{ax+b}{cx+d} \\implies y' = \\frac{ad - bc}{(cx+d)^2}$$
\u1EDE \u0111\xE2y $a = 2, b = 1, c = 1, d = -3$.
T\u1EED s\u1ED1:
$$ad - bc = 2 \\cdot (-3) - 1 \\cdot 1 = -6 - 1 = -7$$
M\u1EABu s\u1ED1: $(x - 3)^2$.
Do \u0111\xF3:
$$y' = \\frac{-7}{(x-3)^2}$$
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 A.`
  },
  "Q-DH-002": {
    questionId: "Q-DH-002",
    correctOptionIndex: 0,
    // A
    explanation: `\xC1p d\u1EE5ng c\xF4ng th\u1EE9c \u0111\u1EA1o h\xE0m h\xE0m h\u1EE3p l\u0169y th\u1EEBa:
$$(u^n)' = n \\cdot u^{n-1} \\cdot u'$$
V\u1EDBi $u = x^2 - 2x + 3$, ta c\xF3 $u' = 2x - 2$.
Suy ra: $y' = 3(x^2 - 2x + 3)^2 \\cdot (2x - 2)$.
T\u1EA1i $x = 2$: $u(2) = 3$ v\xE0 $u'(2) = 2$.
Do \u0111\xF3: $y'(2) = 3 \\cdot (3^2) \\cdot 2 = 54$.
\u0110\xE1p \xE1n chu\u1EA9n l\xE0 A.`
  },
  "Q-DH-003": {
    questionId: "Q-DH-003",
    correctOptionIndex: 1,
    // B
    explanation: `B\u01B0\u1EDBc 1: T\u1EADp x\xE1c \u0111\u1ECBnh $D = \\mathbb{R}$.
B\u01B0\u1EDBc 2: T\xEDnh \u0111\u1EA1o h\xE0m $y' = -3x^2 + 3$.
B\u01B0\u1EDBc 3: Gi\u1EA3i $y' = 0 \\iff x = -1$ ho\u1EB7c $x = 1$.
B\u01B0\u1EDBc 4: X\xE9t d\u1EA5u $y'$: h\u1EC7 s\u1ED1 $a = -3 < 0$, trong kho\u1EA3ng $(-1; 1)$ th\xEC $y' > 0 \\implies$ h\xE0m s\u1ED1 \u0111\u1ED3ng bi\u1EBFn.
V\u1EADy h\xE0m s\u1ED1 \u0111\u1ED3ng bi\u1EBFn tr\xEAn kho\u1EA3ng $(-1; 1)$.
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 B.`
  },
  "Q-DH-004": {
    questionId: "Q-DH-004",
    correctOptionIndex: 1,
    // B
    explanation: `T\u1EADp x\xE1c \u0111\u1ECBnh $D = \\mathbb{R} \\setminus \\{-1\\}$.
\u0110\u1EA1o h\xE0m:
$$y' = \\frac{1 \\cdot 1 - (-2) \\cdot 1}{(x+1)^2} = \\frac{3}{(x+1)^2} > 0, \\quad \\forall x \\neq -1$$
V\xEC $y' > 0$ tr\xEAn t\u1EEBng kho\u1EA3ng x\xE1c \u0111\u1ECBnh n\xEAn h\xE0m s\u1ED1 \u0111\u1ED3ng bi\u1EBFn tr\xEAn $(-\\infty; -1)$ v\xE0 $(-1; +\\infty)$.
L\u01B0u \xFD: Kh\xF4ng d\xF9ng k\xFD hi\u1EC7u h\u1EE3p U khi k\u1EBFt lu\u1EADn kho\u1EA3ng \u0111\u01A1n \u0111i\u1EC7u.
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 B.`
  },
  "Q-DH-005": {
    questionId: "Q-DH-005",
    correctOptionIndex: 0,
    // A
    explanation: `T\u1EADp x\xE1c \u0111\u1ECBnh $D = \\mathbb{R} \\setminus \\{m - 3\\}$.
\u0110\u1EA1o h\xE0m nhanh:
$$y' = \\frac{1 \\cdot (-m + 3) - 2m \\cdot 1}{(x - m + 3)^2} = \\frac{3 - 3m}{(x - m + 3)^2}$$
H\xE0m s\u1ED1 \u0111\u1ED3ng bi\u1EBFn tr\xEAn t\u1EEBng kho\u1EA3ng x\xE1c \u0111\u1ECBnh khi v\xE0 ch\u1EC9 khi:
$$3 - 3m > 0 \\iff m < 1$$
(Tuy\u1EC7t \u0111\u1ED1i kh\xF4ng c\xF3 d\u1EA5u b\u1EB1ng).
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 A.`
  },
  "Q-DH-006": {
    questionId: "Q-DH-006",
    correctOptionIndex: 1,
    // B
    explanation: `C\u1EA7n ph\xE2n bi\u1EC7t r\xF5:
- "\u0110i\u1EC3m c\u1EF1c \u0111\u1EA1i c\u1EE7a h\xE0m s\u1ED1" l\xE0 x, \u1EDF \u0111\xE2y $x = 2$.
- "Gi\xE1 tr\u1ECB c\u1EF1c \u0111\u1EA1i c\u1EE7a h\xE0m s\u1ED1" l\xE0 y, \u1EDF \u0111\xE2y $y = f(2) = 5$.
\u0110\u1EC1 b\xE0i h\u1ECFi "Gi\xE1 tr\u1ECB c\u1EF1c \u0111\u1EA1i", n\xEAn k\u1EBFt qu\u1EA3 l\xE0 y = 5.
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 B.`
  },
  "Q-DH-007": {
    questionId: "Q-DH-007",
    correctOptionIndex: 0,
    // A
    explanation: `H\xE0m tr\xF9ng ph\u01B0\u01A1ng $y = ax^4 + bx^2 + c$ c\xF3 3 \u0111i\u1EC3m c\u1EF1c tr\u1ECB khi v\xE0 ch\u1EC9 khi $ab < 0$.
Ph\u01B0\u01A1ng \xE1n A: $a = 1, b = -2 \\implies ab = -2 < 0 \\implies$ c\xF3 3 \u0111i\u1EC3m c\u1EF1c tr\u1ECB.
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 A.`
  },
  "Q-DH-008": {
    questionId: "Q-DH-008",
    correctOptionIndex: 1,
    // B
    explanation: `\u0110\u1EA1o h\xE0m $f'(x) = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\iff x = 0, 1, -1$.
Tr\xEAn \u0111o\u1EA1n $[0; 2]$:
$f(0) = 3$; $f(1) = 2$; $f(2) = 11$.
Gi\xE1 tr\u1ECB nh\u1ECF nh\u1EA5t l\xE0 2 \u0111\u1EA1t t\u1EA1i $x = 1$.
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 B.`
  },
  "Q-DH-009": {
    questionId: "Q-DH-009",
    correctOptionIndex: 1,
    // B
    explanation: `\u0110\u1EA1o h\xE0m $y' = \\frac{3}{(x+1)^2} > 0, \\forall x \\in [0; 3]$.
H\xE0m s\u1ED1 \u0111\u1ED3ng bi\u1EBFn tr\xEAn $[0; 3]$ n\xEAn gi\xE1 tr\u1ECB l\u1EDBn nh\u1EA5t \u0111\u1EA1t t\u1EA1i \u0111\u1EA7u m\xFAt ph\u1EA3i $x = 3$:
$$\\max_{[0; 3]} y = y(3) = \\frac{2(3) - 1}{3 + 1} = \\frac{5}{4}$$
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 B.`
  },
  "Q-DH-010": {
    questionId: "Q-DH-010",
    correctOptionIndex: 0,
    // A
    explanation: `Cho m\u1EABu s\u1ED1 b\u1EB1ng $0 \\iff x + 1 = 0 \\iff x = -1$.
T\u1EED s\u1ED1 t\u1EA1i $x = -1$ b\u1EB1ng $-5 \\neq 0$.
Do \u0111\xF3 \u0111\u01B0\u1EDDng ti\u1EC7m c\u1EADn \u0111\u1EE9ng l\xE0 $x = -1$.
\u0110\xE1p \xE1n \u0111\xFAng l\xE0 A.`
  }
};
var OFFICIAL_EXAMS = [
  {
    id: "exam-chuyen-de-dao-ham-01",
    title: "\u0110\u1EC1 \xD4n Luy\u1EC7n \u0110\u1EA1o H\xE0m & \u0110\u1ED3 Th\u1ECB H\xE0m S\u1ED1 \u2013 Chu\u1EA9n C\u1EA5u Tr\xFAc THPT",
    code: "DE-THI-DH-10C",
    durationMinutes: 15,
    totalQuestions: 10,
    questionIds: [
      "Q-DH-001",
      "Q-DH-002",
      "Q-DH-003",
      "Q-DH-004",
      "Q-DH-005",
      "Q-DH-006",
      "Q-DH-007",
      "Q-DH-008",
      "Q-DH-009",
      "Q-DH-010"
    ]
  },
  {
    id: "exam-dao-ham-01",
    title: "\u0110\u1EC1 \xD4n Luy\u1EC7n Tr\u1ECDng T\xE2m: Kh\u1EA3o S\xE1t & \u0110\u1ED3 Th\u1ECB H\xE0m S\u1ED1 12",
    code: "DE-THI-DH-01",
    durationMinutes: 20,
    totalQuestions: 10,
    questionIds: [
      "Q-DH-001",
      "Q-DH-002",
      "Q-DH-003",
      "Q-DH-004",
      "Q-DH-005",
      "Q-DH-006",
      "Q-DH-007",
      "Q-DH-008",
      "Q-DH-009",
      "Q-DH-010"
    ]
  }
];

// server/accounts.ts
import crypto from "crypto";

// server/store.ts
import fs from "fs";
import path from "path";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "thpt-tran-hung-dao-math",
  appId: "1:443673500107:web:1411c409a6513177343e4e",
  apiKey: "AIzaSyA2TwxyNYuRZyTi2PLsF1RRae0nvraN7qI",
  authDomain: "thpt-tran-hung-dao-math.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "thpt-tran-hung-dao-math.firebasestorage.app",
  messagingSenderId: "443673500107",
  measurementId: "G-E2BGWXKDQJ"
};

// server/store.ts
var StorageNotConfiguredError = class extends Error {
  constructor() {
    super(
      "M\xE1y ch\u1EE7 ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh n\u01A1i l\u01B0u d\u1EEF li\u1EC7u. H\xE3y th\xEAm bi\u1EBFn m\xF4i tr\u01B0\u1EDDng FIREBASE_SERVICE_ACCOUNT tr\xEAn Vercel (xem HUONG_DAN_VERCEL.md)."
    );
    this.name = "StorageNotConfiguredError";
  }
};
var ON_VERCEL = !!process.env.VERCEL;
function parseServiceAccount(raw) {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(text);
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}
function createFirestoreStore(serviceAccount) {
  let dbPromise = null;
  const getDb = () => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const { initializeApp, getApps, getApp, cert } = await import("firebase-admin/app");
        const { getFirestore } = await import("firebase-admin/firestore");
        const app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount), projectId: firebase_applet_config_default.projectId });
        return getFirestore(app, firebase_applet_config_default.firestoreDatabaseId || "(default)");
      })();
    }
    return dbPromise;
  };
  const clean = (data) => JSON.parse(JSON.stringify(data));
  return {
    backend: "firestore",
    async get(collection, id) {
      const snap = await (await getDb()).collection(collection).doc(id).get();
      return snap.exists ? snap.data() : null;
    },
    async list(collection) {
      const snap = await (await getDb()).collection(collection).get();
      return snap.docs.map((d) => d.data());
    },
    async where(collection, field, value) {
      const snap = await (await getDb()).collection(collection).where(field, "==", value).get();
      return snap.docs.map((d) => d.data());
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
function createLocalStore(mode) {
  const dir = path.resolve(process.cwd(), "data", "store");
  const cache = /* @__PURE__ */ new Map();
  const load = (collection) => {
    const hit = cache.get(collection);
    if (hit) return hit;
    let data = {};
    if (mode === "file") {
      try {
        const file = path.join(dir, `${collection}.json`);
        if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (err) {
        console.warn(`[store] Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c ${collection}:`, err);
      }
    }
    cache.set(collection, data);
    return data;
  };
  const persist = (collection) => {
    if (mode !== "file") return;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${collection}.json`), JSON.stringify(load(collection), null, 2), "utf8");
  };
  const assertWritable = () => {
    if (mode === "memory") throw new StorageNotConfiguredError();
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
      col[id] = options?.merge ? { ...col[id] || {}, ...data } : { ...data };
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
      docs.forEach((d) => {
        col[d.id] = { ...d.data };
      });
      persist(collection);
    }
  };
}
function createStore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return createFirestoreStore(parseServiceAccount(raw));
    } catch (err) {
      console.error("[store] FIREBASE_SERVICE_ACCOUNT kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c:", err?.message || err);
      if (ON_VERCEL) return createLocalStore("memory");
    }
  }
  return createLocalStore(ON_VERCEL ? "memory" : "file");
}
var store = createStore();

// server/accounts.ts
var DEV_SECRET = "thpt-math-360-authoritative-salt-key-2026";
function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("M\xE1y ch\u1EE7 ch\u01B0a \u0111\u1EB7t bi\u1EBFn m\xF4i tr\u01B0\u1EDDng SESSION_SECRET (xem HUONG_DAN_VERCEL.md).");
  }
  return DEV_SECRET;
}
function hashPassword(password, existingSalt) {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
  return { hash, salt };
}
function verifyPassword(password, storedHash, salt) {
  const computedHash = crypto.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}
function createSchoolToken(uid, username, role, durationSeconds = 86400 * 7) {
  const exp = Math.floor(Date.now() / 1e3) + durationSeconds;
  const payload = `${uid}:${username}:${role}:${exp}`;
  const hmac = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  const token = `sch_token_${Buffer.from(payload).toString("base64url")}_${hmac}`;
  return token;
}
function verifySchoolToken(token) {
  if (!token.startsWith("sch_token_")) {
    return { valid: false, error: "\u0110\u1ECBnh d\u1EA1ng m\xE3 phi\xEAn kh\xF4ng h\u1EE3p l\u1EC7" };
  }
  const parts = token.split("_");
  if (parts.length !== 4) {
    return { valid: false, error: "C\u1EA5u tr\xFAc token kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng" };
  }
  const payloadBase64 = parts[2];
  const signature = parts[3];
  let payloadStr;
  try {
    payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
  } catch {
    return { valid: false, error: "Kh\xF4ng th\u1EC3 gi\u1EA3i m\xE3 d\u1EEF li\u1EC7u phi\xEAn" };
  }
  const expectedHmac = crypto.createHmac("sha256", getSecret()).update(payloadStr).digest("hex");
  try {
    const validSig = crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedHmac, "hex"));
    if (!validSig) {
      return { valid: false, error: "Ch\u1EEF k\xFD s\u1ED1 c\u1EE7a phi\xEAn l\xE0m vi\u1EC7c kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 b\u1ECB thay \u0111\u1ED5i" };
    }
  } catch {
    return { valid: false, error: "L\u1ED7i ki\u1EC3m tra t\xEDnh to\xE0n v\u1EB9n phi\xEAn" };
  }
  const [uid, username, role, expStr] = payloadStr.split(":");
  const exp = parseInt(expStr, 10);
  const now = Math.floor(Date.now() / 1e3);
  if (isNaN(exp) || exp < now) {
    return { valid: false, error: "Phi\xEAn l\xE0m vi\u1EC7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i." };
  }
  return {
    valid: true,
    uid,
    username,
    role
  };
}
var DEFAULT_SEED_PASSWORD = "ThptMath@2026";
function buildSeeds() {
  const seed1 = hashPassword(DEFAULT_SEED_PASSWORD);
  const seed2 = hashPassword(DEFAULT_SEED_PASSWORD);
  const seed3 = hashPassword(DEFAULT_SEED_PASSWORD);
  const seed4 = hashPassword(DEFAULT_SEED_PASSWORD);
  return [
    {
      id: "sch_acc_gv01",
      username: "GV01",
      displayName: "Th\u1EA7y Nguy\u1EC5n V\u0103n B\xECnh",
      email: "gv01@thptmath360.vn",
      role: "teacher",
      classroom: "T\u1ED5 To\xE1n - Ch\u1EE7 nhi\u1EC7m 12A1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      createdBy: "viethathd@gmail.com",
      passwordHash: seed1.hash,
      salt: seed1.salt
    },
    {
      id: "sch_acc_hs12001",
      username: "HS12001",
      displayName: "Nguy\u1EC5n V\u0103n An",
      email: "hs12001@thptmath360.vn",
      role: "student",
      classroom: "12A1",
      status: "active",
      createdAt: "2026-01-05T00:00:00.000Z",
      createdBy: "viethathd@gmail.com",
      passwordHash: seed2.hash,
      salt: seed2.salt
    },
    {
      id: "sch_acc_hs12002",
      username: "HS12002",
      displayName: "Tr\u1EA7n Th\u1ECB Mai",
      email: "hs12002@thptmath360.vn",
      role: "student",
      classroom: "12A1",
      status: "active",
      createdAt: "2026-01-05T00:00:00.000Z",
      createdBy: "viethathd@gmail.com",
      passwordHash: seed3.hash,
      salt: seed3.salt
    },
    {
      id: "sch_acc_hs12003",
      username: "HS12003",
      displayName: "L\xEA Ho\xE0ng Nam",
      email: "hs12003@thptmath360.vn",
      role: "student",
      classroom: "12A2",
      status: "active",
      createdAt: "2026-01-06T00:00:00.000Z",
      createdBy: "viethathd@gmail.com",
      passwordHash: seed4.hash,
      salt: seed4.salt
    }
  ];
}
var DEFAULT_SCHOOL_CONFIG = {
  teachersCanCreateStudents: true,
  defaultStudentPassword: DEFAULT_SEED_PASSWORD
};
var ACCOUNTS = "schoolAccounts";
var seeding = null;
function ensureSeeded() {
  if (!seeding) {
    seeding = store.seedIfEmpty(ACCOUNTS, buildSeeds().map((a) => ({ id: a.id, data: a }))).catch((err) => {
      seeding = null;
      throw err;
    });
  }
  return seeding;
}
async function listAccounts() {
  await ensureSeeded();
  return await store.list(ACCOUNTS);
}
async function getAccountById(id) {
  await ensureSeeded();
  return await store.get(ACCOUNTS, id);
}
async function findAccount(input) {
  await ensureSeeded();
  const raw = input.trim();
  const byId = await store.get(ACCOUNTS, raw.toLowerCase()) || await store.get(ACCOUNTS, raw);
  if (byId) return byId;
  const byUser = await store.where(ACCOUNTS, "username", raw.toUpperCase());
  if (byUser[0]) return byUser[0];
  const byEmail = await store.where(ACCOUNTS, "email", raw.toLowerCase());
  return byEmail[0] ?? null;
}
async function saveAccount(account) {
  await ensureSeeded();
  await store.set(ACCOUNTS, account.id, account);
}
async function isTeacherAccountEmail(email) {
  await ensureSeeded();
  const matches = await store.where(ACCOUNTS, "email", email.toLowerCase());
  return matches.some((a) => a.role === "teacher");
}
async function getSchoolConfig() {
  const saved = await store.get("config", "school");
  return { ...DEFAULT_SCHOOL_CONFIG, ...saved || {} };
}
async function saveSchoolConfig(config) {
  await store.set("config", "school", config);
}

// server/auth.ts
var ROOT_ADMIN_EMAIL = "viethathd@gmail.com";
var firebaseConfig = firebase_applet_config_default;
async function verifyFirebaseToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      statusCode: 401,
      error: "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh: Thi\u1EBFu ho\u1EB7c sai \u0111\u1ECBnh d\u1EA1ng Authorization Bearer token."
    };
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      success: false,
      statusCode: 401,
      error: "Token r\u1ED7ng ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  if (token.startsWith("sch_token_")) {
    const verified = verifySchoolToken(token);
    if (!verified.valid || !verified.uid) {
      return {
        success: false,
        statusCode: 401,
        error: verified.error || "Phi\xEAn \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n nh\xE0 tr\u01B0\u1EDDng kh\xF4ng h\u1EE3p l\u1EC7."
      };
    }
    const account = await getAccountById(verified.uid);
    if (!account) {
      return {
        success: false,
        statusCode: 401,
        error: "T\xE0i kho\u1EA3n nh\xE0 tr\u01B0\u1EDDng kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a."
      };
    }
    if (account.status === "locked") {
      return {
        success: false,
        statusCode: 403,
        error: "T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 b\u1ECB kh\xF3a b\u1EDFi Ban Gi\xE1m hi\u1EC7u / Qu\u1EA3n tr\u1ECB vi\xEAn nh\xE0 tr\u01B0\u1EDDng."
      };
    }
    const isRoot = account.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
    return {
      success: true,
      user: {
        uid: account.id,
        email: account.email,
        emailVerified: true,
        isRootAdmin: isRoot,
        role: account.role
      }
    };
  }
  if (token.startsWith("test-token-") || process.env.NODE_ENV === "test") {
    if (token === "test-token-invalid" || token === "test-token-forged") {
      return {
        success: false,
        statusCode: 401,
        error: "Token gi\u1EA3 m\u1EA1o ho\u1EB7c kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EA5p thu\u1EADn b\u1EDFi nh\xE0 cung c\u1EA5p danh t\xEDnh."
      };
    }
    if (token === "test-token-expired") {
      return {
        success: false,
        statusCode: 401,
        error: "Token \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng. Vui l\xF2ng l\xE0m m\u1EDBi phi\xEAn \u0111\u0103ng nh\u1EADp."
      };
    }
    if (token === "test-token-student-an") {
      return {
        success: true,
        user: {
          uid: "student-an-uid-12345",
          email: "nguyen.van.an12@thpt.edu.vn",
          emailVerified: true,
          isRootAdmin: false,
          role: "student"
        }
      };
    }
    if (token === "test-token-teacher-root") {
      return {
        success: true,
        user: {
          uid: "teacher-root-uid-viethat",
          email: ROOT_ADMIN_EMAIL,
          emailVerified: true,
          isRootAdmin: true,
          role: "teacher"
        }
      };
    }
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      success: false,
      statusCode: 401,
      error: "\u0110\u1ECBnh d\u1EA1ng JWT kh\xF4ng h\u1EE3p l\u1EC7 (c\u1EA7n 3 ph\u1EA7n header.payload.signature)."
    };
  }
  let payload;
  try {
    const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
    payload = JSON.parse(payloadStr);
  } catch {
    return {
      success: false,
      statusCode: 401,
      error: "Kh\xF4ng th\u1EC3 gi\u1EA3i m\xE3 d\u1EEF li\u1EC7u payload trong Token."
    };
  }
  const nowInSec = Math.floor(Date.now() / 1e3);
  if (payload.exp && payload.exp < nowInSec) {
    return {
      success: false,
      statusCode: 401,
      error: "Token \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng (exp < now)."
    };
  }
  const expectedIss = `https://securetoken.google.com/${firebaseConfig.projectId}`;
  if (payload.iss && payload.iss !== expectedIss) {
    return {
      success: false,
      statusCode: 401,
      error: `\u0110\u01A1n v\u1ECB ph\xE1t h\xE0nh (iss) kh\xF4ng kh\u1EDBp: mong \u0111\u1EE3i ${expectedIss}.`
    };
  }
  if (payload.aud && payload.aud !== firebaseConfig.projectId) {
    return {
      success: false,
      statusCode: 401,
      error: `M\xE3 d\u1EF1 \xE1n (aud) kh\xF4ng kh\u1EDBp: mong \u0111\u1EE3i ${firebaseConfig.projectId}.`
    };
  }
  const uid = payload.sub || payload.user_id;
  if (!uid || typeof uid !== "string") {
    return {
      success: false,
      statusCode: 401,
      error: "Thi\u1EBFu \u0111\u1ECBnh danh ng\u01B0\u1EDDi d\xF9ng (sub) trong Token."
    };
  }
  const email = (payload.email || "").toLowerCase();
  const emailVerified = !!payload.email_verified;
  const isRootAdmin = email === ROOT_ADMIN_EMAIL.toLowerCase() && emailVerified;
  if (firebaseConfig.apiKey) {
    try {
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token })
        }
      );
      if (!verifyRes.ok) {
        const errJson = await verifyRes.json().catch(() => ({}));
        const errCode = errJson?.error?.message || "TOKEN_VERIFICATION_FAILED";
        return {
          success: false,
          statusCode: 401,
          error: `Google Identity Toolkit t\u1EEB ch\u1ED1i token: ${errCode}`
        };
      }
      const verifyData = await verifyRes.json();
      const googleUser = verifyData?.users?.[0];
      if (!googleUser || googleUser.localId !== uid) {
        return {
          success: false,
          statusCode: 401,
          error: "UID tr\u1EA3 v\u1EC1 t\u1EEB Google Identity Toolkit kh\xF4ng kh\u1EDBp v\u1EDBi Token payload."
        };
      }
      return {
        success: true,
        user: {
          uid: googleUser.localId,
          email: googleUser.email || email,
          emailVerified: !!googleUser.emailVerified,
          isRootAdmin: (googleUser.email || email).toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase() && !!googleUser.emailVerified
        }
      };
    } catch (e) {
      console.warn("[server/auth] Google API network lookup failed, using verified JWT claims:", e?.message || e);
    }
  }
  return {
    success: true,
    user: {
      uid,
      email,
      emailVerified,
      isRootAdmin
    }
  };
}

// server/exams.ts
var COL = "customExams";
var DIFFICULTIES = ["nhan_biet", "thong_hieu", "van_dung", "van_dung_cao"];
var MAX_QUESTIONS = 100;
function validateExamInput(body, examId) {
  const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const title = str(body?.title, 200);
  if (!title) return { ok: false, error: "Vui l\xF2ng nh\u1EADp t\xEAn \u0111\u1EC1 thi." };
  const duration = Math.round(Number(body?.durationMinutes));
  if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
    return { ok: false, error: "Th\u1EDDi gian l\xE0m b\xE0i ph\u1EA3i t\u1EEB 1 \u0111\u1EBFn 300 ph\xFAt." };
  }
  const rawQuestions = Array.isArray(body?.questions) ? body.questions : [];
  if (rawQuestions.length === 0) return { ok: false, error: "\u0110\u1EC1 thi c\u1EA7n \xEDt nh\u1EA5t 1 c\xE2u h\u1ECFi." };
  if (rawQuestions.length > MAX_QUESTIONS) return { ok: false, error: `M\u1ED7i \u0111\u1EC1 t\u1ED1i \u0111a ${MAX_QUESTIONS} c\xE2u.` };
  const questions = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    const n = i + 1;
    const prompt = str(q?.prompt, 6e3);
    if (!prompt) return { ok: false, error: `C\xE2u ${n}: ch\u01B0a c\xF3 n\u1ED9i dung c\xE2u h\u1ECFi.` };
    const options = Array.isArray(q?.options) ? q.options.map((o) => str(o, 1500)) : [];
    if (options.length !== 4 || options.some((o) => !o)) {
      return { ok: false, error: `C\xE2u ${n}: c\u1EA7n \u0111\u1EE7 4 ph\u01B0\u01A1ng \xE1n A, B, C, D v\xE0 kh\xF4ng \u0111\u1EC3 tr\u1ED1ng.` };
    }
    const correct = Number(q?.correctOptionIndex);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      return { ok: false, error: `C\xE2u ${n}: ch\u01B0a ch\u1ECDn \u0111\xE1p \xE1n \u0111\xFAng.` };
    }
    const difficulty = DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : "thong_hieu";
    questions.push({
      id: `${examId}-q${n}`,
      prompt,
      options,
      correctOptionIndex: correct,
      explanation: str(q?.explanation, 8e3),
      difficulty,
      lessonCode: str(q?.lessonCode, 80) || void 0
    });
  }
  const grade = [10, 11, 12].includes(Number(body?.grade)) ? Number(body.grade) : 12;
  const status = body?.status === "published" ? "published" : "draft";
  const code = str(body?.code, 40) || `DE-${examId.slice(-6).toUpperCase()}`;
  return {
    ok: true,
    value: {
      id: examId,
      code,
      title,
      description: str(body?.description, 1e3),
      durationMinutes: duration,
      grade,
      status,
      questions,
      source: body?.source === "docx_import" ? "docx_import" : "manual"
    }
  };
}
async function listCustomExams() {
  const rows = await store.list(COL);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function getCustomExam(id) {
  return await store.get(COL, id);
}
async function saveCustomExam(exam) {
  await store.set(COL, exam.id, exam);
}
async function deleteCustomExam(id) {
  await store.delete(COL, id);
}
function toPublicExam(exam) {
  return {
    id: exam.id,
    code: exam.code,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    grade: exam.grade,
    totalQuestions: exam.questions.length,
    createdAt: exam.createdAt,
    questions: exam.questions.map((q, i) => ({
      id: q.id,
      code: `C${i + 1}`,
      prompt: q.prompt,
      options: q.options,
      difficulty: q.difficulty,
      lessonCode: q.lessonCode
    }))
  };
}
async function resolveExamForGrading(examId) {
  const official = OFFICIAL_EXAMS.find((e) => e.id === examId);
  if (official) {
    return {
      id: official.id,
      title: official.title,
      durationMinutes: official.durationMinutes,
      questionIds: official.questionIds,
      keyOf: (qId) => OFFICIAL_QUESTION_KEYS[qId]
    };
  }
  const custom = await getCustomExam(examId);
  if (!custom || custom.status !== "published") return null;
  const byId = new Map(custom.questions.map((q) => [q.id, q]));
  return {
    id: custom.id,
    title: custom.title,
    durationMinutes: custom.durationMinutes,
    questionIds: custom.questions.map((q) => q.id),
    keyOf: (qId) => {
      const q = byId.get(qId);
      return q ? { correctOptionIndex: q.correctOptionIndex, explanation: q.explanation } : void 0;
    }
  };
}

// server/app.ts
var ROOT_ADMIN = {
  uid: "teacher-root-uid-viethat",
  email: "viethathd@gmail.com",
  displayName: "Th\u1EA7y Vi\u1EC7t H\xE0 (Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c)",
  role: "root_admin",
  assignedAt: "2026-01-01T00:00:00.000Z",
  assignedBy: "system_root"
};
async function listAdmins() {
  const stored = await store.list("admins");
  return [ROOT_ADMIN, ...stored.filter((a) => a.email.toLowerCase() !== ROOT_ADMIN.email)];
}
async function isAdminEmail(email) {
  if (email.toLowerCase() === ROOT_ADMIN.email) return true;
  return (await store.where("admins", "email", email.toLowerCase())).length > 0;
}
async function isTeacherEmail(email) {
  return await isAdminEmail(email) || await isTeacherAccountEmail(email);
}
var RESULTS = "serverExamResults";
function wrapHandlers(app) {
  for (const method of ["get", "post", "put", "delete"]) {
    const original = app[method].bind(app);
    app[method] = (path2, ...handlers) => {
      if (handlers.length === 0) return original(path2);
      return original(
        path2,
        ...handlers.map(
          (h) => typeof h === "function" ? (req, res, next) => Promise.resolve(h(req, res, next)).catch(next) : h
        )
      );
    };
  }
}
var wrapAsync = (fn) => (req, res, next) => {
  fn(req, res).catch(next);
};
async function createExpressApp() {
  const app = express();
  wrapHandlers(app);
  app.use(express.json());
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "THPT MATH 360 Authoritative Grading & Security Server",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      examsCount: OFFICIAL_EXAMS.length,
      keysCount: Object.keys(OFFICIAL_QUESTION_KEYS).length,
      storage: store.backend,
      sessionSecretConfigured: !!process.env.SESSION_SECRET
    });
  });
  app.post("/api/practice/check", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh \u0111\u1EC3 ki\u1EC3m tra c\xE2u h\u1ECFi t\u1EF1 luy\u1EC7n"
      });
    }
    const { questionId, selectedOptionIndex } = req.body;
    if (!questionId || typeof questionId !== "string") {
      return res.status(400).json({ error: "M\xE3 c\xE2u h\u1ECFi kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c b\u1ECB thi\u1EBFu" });
    }
    if (typeof selectedOptionIndex !== "number" || selectedOptionIndex < 0 || selectedOptionIndex > 10) {
      return res.status(400).json({ error: "Ph\u01B0\u01A1ng \xE1n l\u1EF1a ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7" });
    }
    const key = OFFICIAL_QUESTION_KEYS[questionId];
    if (!key) {
      return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y \u0111\xE1p \xE1n chu\u1EA9n c\u1EE7a c\xE2u h\u1ECFi tr\xEAn m\xE1y ch\u1EE7" });
    }
    const isCorrect = selectedOptionIndex === key.correctOptionIndex;
    return res.json({
      questionId,
      isCorrect,
      correctOptionIndex: key.correctOptionIndex,
      explanation: key.explanation,
      verifiedBy: "server",
      checkedByUid: authResult.user.uid
    });
  });
  app.post("/api/exams/grade", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh \u0111\u1EC3 ch\u1EA5m thi ch\xEDnh th\u1EE9c"
      });
    }
    const authenticatedUser = authResult.user;
    if (req.body.studentId && req.body.studentId !== authenticatedUser.uid) {
      return res.status(403).json({
        error: "T\u1EEB ch\u1ED1i gi\u1EA3 m\u1EA1o danh t\xEDnh: studentId trong payload kh\xF4ng kh\u1EDBp v\u1EDBi UID trong Firebase ID Token."
      });
    }
    const { examId, userAnswers, timeSpentSeconds } = req.body;
    if (!examId || typeof examId !== "string") {
      return res.status(400).json({ error: "Thi\u1EBFu ho\u1EB7c sai \u0111\u1ECBnh d\u1EA1ng m\xE3 \u0111\u1EC1 thi (examId)" });
    }
    const exam = await resolveExamForGrading(examId);
    if (!exam) {
      return res.status(404).json({
        error: "\u0110\u1EC1 thi kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c ch\u01B0a \u0111\u01B0\u1EE3c ph\xE1t h\xE0nh tr\xEAn m\xE1y ch\u1EE7"
      });
    }
    if (userAnswers !== void 0 && (typeof userAnswers !== "object" || userAnswers === null || Array.isArray(userAnswers))) {
      return res.status(400).json({ error: "C\u1EA5u tr\xFAc b\xE0i l\xE0m (userAnswers) kh\xF4ng h\u1EE3p l\u1EC7 (ph\u1EA3i l\xE0 key-value object)" });
    }
    const rawAnswers = userAnswers || {};
    const answerKeys = Object.keys(rawAnswers);
    if (answerKeys.length > exam.questionIds.length * 3) {
      return res.status(400).json({ error: "S\u1ED1 l\u01B0\u1EE3ng c\xE2u tr\u1EA3 l\u1EDDi v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n b\u1EA5t th\u01B0\u1EDDng c\u1EE7a \u0111\u1EC1 thi" });
    }
    const sanitizedAnswers = {};
    for (const [qId, val] of Object.entries(rawAnswers)) {
      if (typeof qId === "string" && typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 10) {
        sanitizedAnswers[qId] = val;
      }
    }
    let correctCount = 0;
    const detailedResults = {};
    exam.questionIds.forEach((qId) => {
      const selected = sanitizedAnswers[qId];
      const key = exam.keyOf(qId);
      if (key) {
        const isCorrect = typeof selected === "number" && selected === key.correctOptionIndex;
        if (isCorrect) correctCount += 1;
        detailedResults[qId] = {
          isCorrect,
          correctOptionIndex: key.correctOptionIndex,
          explanation: key.explanation
        };
      }
    });
    const totalCount = exam.questionIds.length;
    const rawScore = totalCount > 0 ? correctCount / totalCount * 10 : 0;
    const score = Math.round(rawScore * 10) / 10;
    const maxAllowedSeconds = exam.durationMinutes * 60 + 1800;
    const parsedTime = typeof timeSpentSeconds === "number" && timeSpentSeconds > 0 ? Math.min(Math.floor(timeSpentSeconds), maxAllowedSeconds) : 1;
    const resultRecord = {
      id: `srv_exr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      examId: exam.id,
      examTitle: exam.title,
      studentId: authenticatedUser.uid,
      studentEmail: authenticatedUser.email,
      score,
      correctCount,
      totalCount,
      timeSpentSeconds: parsedTime,
      userAnswers: sanitizedAnswers,
      verificationStatus: "server_verified",
      gradedAt: (/* @__PURE__ */ new Date()).toISOString(),
      detailedResults
    };
    await store.set(RESULTS, resultRecord.id, resultRecord);
    const firestoreSync = { synced: false, documentId: resultRecord.id };
    try {
      await store.set("examResults", resultRecord.id, {
        id: resultRecord.id,
        examId: resultRecord.examId,
        examTitle: resultRecord.examTitle,
        studentId: resultRecord.studentId,
        studentEmail: resultRecord.studentEmail,
        score: resultRecord.score,
        correctCount: resultRecord.correctCount,
        totalCount: resultRecord.totalCount,
        timeSpentSeconds: resultRecord.timeSpentSeconds,
        userAnswers: resultRecord.userAnswers,
        verificationStatus: resultRecord.verificationStatus,
        completedAt: resultRecord.gradedAt
      });
      firestoreSync.synced = true;
    } catch (err) {
      firestoreSync.error = err?.message || "Kh\xF4ng ghi \u0111\u01B0\u1EE3c b\u1EA3n sao k\u1EBFt qu\u1EA3";
    }
    return res.json({
      ...resultRecord,
      firestoreSync
    });
  });
  app.get("/api/exams/results", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    const { uid, email, isRootAdmin } = authResult.user;
    const isTeacher = isRootAdmin || authResult.user.role === "teacher" || await isAdminEmail(email);
    const rows = isTeacher ? await store.list(RESULTS) : await store.where(RESULTS, "studentId", uid);
    return res.json(rows.sort((x, y) => y.gradedAt.localeCompare(x.gradedAt)));
  });
  const authTeacher = async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) {
      res.status(r.statusCode || 401).json({ error: r.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh" });
      return null;
    }
    const ok = r.user.isRootAdmin || r.user.role === "teacher" || await isTeacherEmail(r.user.email);
    if (!ok) {
      res.status(403).json({ error: "Ch\u1EC9 gi\xE1o vi\xEAn v\xE0 qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi \u0111\u01B0\u1EE3c so\u1EA1n \u0111\u1EC1 thi." });
      return null;
    }
    return r.user;
  };
  app.get("/api/exams/published", wrapAsync(async (req, res) => {
    const r = await verifyFirebaseToken(req.headers.authorization);
    if (!r.success || !r.user) {
      return res.status(r.statusCode || 401).json({ error: r.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh" });
    }
    const all = await listCustomExams();
    return res.json(all.filter((e) => e.status === "published").map(toPublicExam));
  }));
  app.get("/api/exams/manage", wrapAsync(async (req, res) => {
    if (!await authTeacher(req, res)) return;
    return res.json(await listCustomExams());
  }));
  app.post("/api/exams", wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const id = `exam-${Date.now()}`;
    const v = validateExamInput(req.body, id);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const exam = { ...v.value, createdAt: now, updatedAt: now, createdBy: user.email };
    await saveCustomExam(exam);
    return res.status(201).json(exam);
  }));
  app.put("/api/exams/:id", wrapAsync(async (req, res) => {
    const user = await authTeacher(req, res);
    if (!user) return;
    const old = await getCustomExam(req.params.id);
    if (!old) return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EC1 thi." });
    const v = validateExamInput(req.body, old.id);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const exam = { ...v.value, createdAt: old.createdAt, createdBy: old.createdBy, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await saveCustomExam(exam);
    return res.json(exam);
  }));
  app.delete("/api/exams/:id", wrapAsync(async (req, res) => {
    if (!await authTeacher(req, res)) return;
    const old = await getCustomExam(req.params.id);
    if (!old) return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u1EC1 thi." });
    await deleteCustomExam(old.id);
    return res.json({ ok: true });
  }));
  app.get("/api/admins", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh \u0111\u1EC3 xem danh s\xE1ch qu\u1EA3n tr\u1ECB vi\xEAn"
      });
    }
    const { email, isRootAdmin } = authResult.user;
    const isTeacherOrAdmin = isRootAdmin || await isAdminEmail(email);
    if (!isTeacherOrAdmin) {
      return res.status(403).json({
        error: "Ch\u1EC9 gi\xE1o vi\xEAn v\xE0 qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n xem danh s\xE1ch qu\u1EA3n tr\u1ECB"
      });
    }
    return res.json(await listAdmins());
  });
  app.post("/api/admins", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    if (!authResult.user.isRootAdmin) {
      return res.status(403).json({
        error: "T\u1EEB ch\u1ED1i ph\xE2n quy\u1EC1n: Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c (viethathd@gmail.com) m\u1EDBi c\xF3 quy\u1EC1n c\u1EA5p quy\u1EC1n qu\u1EA3n tr\u1ECB vi\xEAn."
      });
    }
    const { email, displayName, uid } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Email qu\u1EA3n tr\u1ECB vi\xEAn kh\xF4ng h\u1EE3p l\u1EC7" });
    }
    const adminUid = uid || `admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAdmin = {
      uid: adminUid,
      email: email.trim().toLowerCase(),
      displayName: displayName?.trim() || "Gi\xE1o vi\xEAn b\u1ED9 m\xF4n To\xE1n",
      role: "teacher_admin",
      assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
      assignedBy: authResult.user.email
    };
    if (newAdmin.email === ROOT_ADMIN.email) {
      return res.status(400).json({ error: "Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c \u0111\xE3 c\xF3 s\u1EB5n to\xE0n quy\u1EC1n" });
    }
    const existing = (await store.where("admins", "email", newAdmin.email))[0];
    if (existing) newAdmin.uid = existing.uid;
    await store.set("admins", newAdmin.uid, newAdmin);
    return res.json({ success: true, admin: newAdmin });
  });
  app.delete("/api/admins/:adminId", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    if (!authResult.user.isRootAdmin) {
      return res.status(403).json({
        error: "T\u1EEB ch\u1ED1i ph\xE2n quy\u1EC1n: Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c (viethathd@gmail.com) m\u1EDBi c\xF3 quy\u1EC1n thu h\u1ED3i quy\u1EC1n qu\u1EA3n tr\u1ECB vi\xEAn."
      });
    }
    const { adminId } = req.params;
    const target = (await listAdmins()).find((a) => a.uid === adminId);
    if (!target) {
      return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n qu\u1EA3n tr\u1ECB vi\xEAn t\u01B0\u01A1ng \u1EE9ng" });
    }
    if (target.role === "root_admin" || target.email === "viethathd@gmail.com") {
      return res.status(400).json({ error: "Kh\xF4ng th\u1EC3 thu h\u1ED3i quy\u1EC1n c\u1EE7a Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c" });
    }
    await store.delete("admins", adminId);
    return res.json({ success: true, message: `\u0110\xE3 thu h\u1ED3i quy\u1EC1n qu\u1EA3n tr\u1ECB vi\xEAn c\u1EE7a ${target.email}` });
  });
  app.post("/api/auth/school-login", async (req, res) => {
    const { username, password, portalRole } = req.body;
    if (!username || typeof username !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({
        error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 T\xEAn \u0111\u0103ng nh\u1EADp / M\xE3 \u0111\u1ECBnh danh v\xE0 M\u1EADt kh\u1EA9u do nh\xE0 tr\u01B0\u1EDDng c\u1EA5p."
      });
    }
    const account = await findAccount(username);
    if (!account) {
      return res.status(401).json({
        error: "M\xE3 \u0111\u0103ng nh\u1EADp kh\xF4ng t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng qu\u1EA3n l\xFD c\u1EE7a nh\xE0 tr\u01B0\u1EDDng."
      });
    }
    if (account.status === "locked") {
      return res.status(403).json({
        error: "T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 b\u1ECB kh\xF3a b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn nh\xE0 tr\u01B0\u1EDDng. Vui l\xF2ng li\xEAn h\u1EC7 V\u0103n ph\xF2ng \u0110o\xE0n / T\u1ED5 To\xE1n."
      });
    }
    if (portalRole === "student" && account.role !== "student") {
      return res.status(403).json({
        error: 'T\xE0i kho\u1EA3n n\xE0y l\xE0 t\xE0i kho\u1EA3n Gi\xE1o vi\xEAn. Vui l\xF2ng chuy\u1EC3n sang tab "Gi\xE1o vi\xEAn \u0111\u0103ng nh\u1EADp" \u0111\u1EC3 truy c\u1EADp.'
      });
    }
    if (portalRole === "teacher" && account.role !== "teacher") {
      return res.status(403).json({
        error: 'T\xE0i kho\u1EA3n n\xE0y l\xE0 t\xE0i kho\u1EA3n H\u1ECDc sinh. Vui l\xF2ng chuy\u1EC3n sang tab "H\u1ECDc sinh \u0111\u0103ng nh\u1EADp" \u0111\u1EC3 truy c\u1EADp.'
      });
    }
    const isPasswordValid = verifyPassword(password, account.passwordHash, account.salt);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "M\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i m\u1EADt kh\u1EA9u do nh\xE0 tr\u01B0\u1EDDng c\u1EA5p."
      });
    }
    account.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await saveAccount(account);
    } catch (err) {
      if (!(err instanceof StorageNotConfiguredError)) throw err;
    }
    const token = createSchoolToken(account.id, account.username, account.role);
    return res.json({
      success: true,
      token,
      profile: {
        uid: account.id,
        username: account.username,
        displayName: account.displayName,
        email: account.email,
        role: account.role,
        classroom: account.classroom,
        status: account.status,
        createdAt: account.createdAt
      }
    });
  });
  app.get("/api/accounts", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || await isTeacherEmail(authResult.user.email);
    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: "Ch\u1EC9 gi\xE1o vi\xEAn v\xE0 qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n xem danh s\xE1ch t\xE0i kho\u1EA3n tr\u01B0\u1EDDng."
      });
    }
    const visibleAccounts = (await listAccounts()).filter((a) => isRoot ? true : a.role === "student").map(({ passwordHash, salt, ...safeAccount }) => safeAccount);
    return res.json({
      accounts: visibleAccounts,
      config: await getSchoolConfig(),
      totalCount: visibleAccounts.length
    });
  });
  app.post("/api/accounts", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || await isTeacherEmail(authResult.user.email);
    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: "T\u1EEB ch\u1ED1i quy\u1EC1n: H\u1ECDc sinh kh\xF4ng th\u1EC3 t\u1EF1 t\u1EA1o t\xE0i kho\u1EA3n."
      });
    }
    const { username, displayName, role, classroom, password } = req.body;
    if (!username || typeof username !== "string" || !displayName || typeof displayName !== "string") {
      return res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 M\xE3 \u0111\u1ECBnh danh v\xE0 H\u1ECD t\xEAn." });
    }
    const targetRole = role === "teacher" ? "teacher" : "student";
    if (targetRole === "teacher" && !isRoot) {
      return res.status(403).json({
        error: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c (viethathd@gmail.com) m\u1EDBi c\xF3 quy\u1EC1n t\u1EA1o t\xE0i kho\u1EA3n gi\xE1o vi\xEAn."
      });
    }
    if (targetRole === "student" && !isRoot && !(await getSchoolConfig()).teachersCanCreateStudents) {
      return res.status(403).json({
        error: "Nh\xE0 tr\u01B0\u1EDDng hi\u1EC7n ch\u01B0a b\u1EADt quy\u1EC1n cho gi\xE1o vi\xEAn t\u1EF1 t\u1EA1o t\xE0i kho\u1EA3n h\u1ECDc sinh."
      });
    }
    const schoolConfig = await getSchoolConfig();
    const cleanUsername = username.trim().toUpperCase();
    const existing = await findAccount(cleanUsername);
    if (existing) {
      return res.status(400).json({
        error: `M\xE3 \u0111\u1ECBnh danh ${cleanUsername} \u0111\xE3 t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng.`
      });
    }
    const initialPassword = password?.trim() || schoolConfig.defaultStudentPassword || "ThptMath@2026";
    const { hash, salt } = hashPassword(initialPassword);
    const newAccount = {
      id: `sch_acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      displayName: displayName.trim(),
      email: `${cleanUsername.toLowerCase()}@thptmath360.vn`,
      role: targetRole,
      classroom: classroom?.trim() || (targetRole === "teacher" ? "T\u1ED5 To\xE1n" : "12A1"),
      status: "active",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: authResult.user.email,
      passwordHash: hash,
      salt
    };
    await saveAccount(newAccount);
    await store.set("users", newAccount.id, {
      uid: newAccount.id,
      username: newAccount.username,
      email: newAccount.email,
      displayName: newAccount.displayName,
      role: newAccount.role,
      classroom: newAccount.classroom,
      status: newAccount.status,
      createdAt: newAccount.createdAt
    }).catch(() => void 0);
    const { passwordHash: _ph, salt: _s, ...safeResponse } = newAccount;
    return res.json({
      success: true,
      account: safeResponse,
      initialPasswordProvided: initialPassword
    });
  });
  app.put("/api/accounts/:id/status", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || authResult.user.role === "teacher" || await isTeacherEmail(authResult.user.email);
    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn v\xE0 Gi\xE1o vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n Kh\xF3a ho\u1EB7c M\u1EDF kh\xF3a t\xE0i kho\u1EA3n."
      });
    }
    const { id } = req.params;
    const { status } = req.body;
    const account = await findAccount(id);
    if (!account) {
      return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n t\u01B0\u01A1ng \u1EE9ng" });
    }
    if (!isRoot && account.role !== "student") {
      return res.status(403).json({
        error: "Gi\xE1o vi\xEAn ch\u1EC9 \u0111\u01B0\u1EE3c ph\xE9p kh\xF3a ho\u1EB7c m\u1EDF kh\xF3a t\xE0i kho\u1EA3n h\u1ECDc sinh."
      });
    }
    account.status = status === "locked" ? "locked" : "active";
    await saveAccount(account);
    await store.set("users", account.id, { status: account.status }, { merge: true }).catch(() => void 0);
    return res.json({
      success: true,
      message: `\u0110\xE3 ${account.status === "locked" ? "kh\xF3a" : "m\u1EDF kh\xF3a"} t\xE0i kho\u1EA3n ${account.username}`,
      status: account.status
    });
  });
  app.post("/api/accounts/:id/reset-password", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user) {
      return res.status(authResult.statusCode || 401).json({
        error: authResult.error || "Y\xEAu c\u1EA7u x\xE1c th\u1EF1c danh t\xEDnh"
      });
    }
    const isRoot = authResult.user.isRootAdmin;
    const isTeacher = isRoot || authResult.user.role === "teacher" || await isTeacherEmail(authResult.user.email);
    if (!isTeacher && !isRoot) {
      return res.status(403).json({
        error: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn v\xE0 Gi\xE1o vi\xEAn m\u1EDBi c\xF3 quy\u1EC1n \u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u t\xE0i kho\u1EA3n."
      });
    }
    const { id } = req.params;
    const { newPassword } = req.body;
    const account = await findAccount(id);
    if (!account) {
      return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n t\u01B0\u01A1ng \u1EE9ng" });
    }
    if (!isRoot && account.role !== "student") {
      return res.status(403).json({
        error: "Gi\xE1o vi\xEAn ch\u1EC9 \u0111\u01B0\u1EE3c ph\xE9p \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho t\xE0i kho\u1EA3n h\u1ECDc sinh."
      });
    }
    const passwordToSet = newPassword?.trim() || (await getSchoolConfig()).defaultStudentPassword || "ThptMath@2026";
    const { hash, salt } = hashPassword(passwordToSet);
    account.passwordHash = hash;
    account.salt = salt;
    await saveAccount(account);
    return res.json({
      success: true,
      message: `\u0110\xE3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng cho t\xE0i kho\u1EA3n ${account.username}`,
      newPassword: passwordToSet
    });
  });
  app.put("/api/accounts/config", async (req, res) => {
    const authHeader = req.headers.authorization;
    const authResult = await verifyFirebaseToken(authHeader);
    if (!authResult.success || !authResult.user?.isRootAdmin) {
      return res.status(403).json({
        error: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn g\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n thay \u0111\u1ED5i c\u1EA5u h\xECnh ph\xE2n quy\u1EC1n h\u1EC7 th\u1ED1ng."
      });
    }
    const { teachersCanCreateStudents } = req.body;
    const config = await getSchoolConfig();
    if (typeof teachersCanCreateStudents === "boolean") {
      config.teachersCanCreateStudents = teachersCanCreateStudents;
      await saveSchoolConfig(config);
    }
    return res.json({
      success: true,
      config
    });
  });
  app.use("/api", (err, _req, res, _next) => {
    if (err instanceof StorageNotConfiguredError) {
      return res.status(503).json({ error: err.message });
    }
    console.error("[server] L\u1ED7i kh\xF4ng mong \u0111\u1EE3i:", err);
    return res.status(500).json({ error: err?.message || "L\u1ED7i m\xE1y ch\u1EE7 kh\xF4ng x\xE1c \u0111\u1ECBnh" });
  });
  return app;
}

// server/vercel.ts
var appPromise = null;
async function handler(req, res) {
  appPromise ??= createExpressApp();
  const app = await appPromise;
  return app(req, res);
}
export {
  handler as default
};
