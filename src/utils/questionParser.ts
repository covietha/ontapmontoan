import type { QuestionDifficulty } from '../types';

export type ParsedQType = 'mcq' | 'true_false' | 'short_answer' | 'essay';

export interface ParsedWordQuestion {
  type: ParsedQType;
  statements: string[];
  truths: boolean[];
  acceptedAnswers: string[];
  questionNumber: number;
  prompt: string;
  options: string[];
  correctOptionIndex: number; // 0..3, -1 nếu chưa rõ
  explanation: string;
  difficulty: QuestionDifficulty;
  grade: number;
  lessonCode: string;
  needsReview: boolean;
  reviewReason?: string;
}

export interface ParsedExamMeta {
  title?: string;
  durationMinutes?: number;
  grade?: number;
  examCode?: string;
}

/** Mức độ cho phép theo dạng câu ở đề lớp 10 và 11 (lớp 12 không ràng buộc). */
export const ALLOWED_LEVELS_10_11: Record<ParsedQType, QuestionDifficulty[]> = {
  mcq: ['nhan_biet', 'thong_hieu'],
  true_false: ['nhan_biet', 'thong_hieu'],
  short_answer: ['thong_hieu', 'van_dung'],
  essay: ['van_dung', 'van_dung_cao']
};
const LEVEL_LABEL: Record<string, string> = { nhan_biet: 'Nhận biết', thong_hieu: 'Thông hiểu', van_dung: 'Vận dụng', van_dung_cao: 'Vận dụng cao' };
const TYPE_LABEL: Record<ParsedQType, string> = { mcq: 'Trắc nghiệm 4 phương án', true_false: 'Đúng/Sai', short_answer: 'Trả lời ngắn', essay: 'Tự luận' };

const PART_RE = /^\s*PH[ẦA]N\s*(IV|III|II|I|[1-4])\b/i;
const Q_START = /^\s*(?:Câu|Bài)\s*(\d+)\s*[.:)\]]?\s*/i;

function partToType(label: string): ParsedQType {
  const v = label.toUpperCase();
  if (v === 'I' || v === '1') return 'mcq';
  if (v === 'II' || v === '2') return 'true_false';
  if (v === 'III' || v === '3') return 'short_answer';
  return 'essay';
}

function toTruth(token: string): boolean | null {
  const t = token.trim().toLowerCase();
  if (t === 'đ' || t === 'đúng' || t === 'd' || t === 'true') return true;
  if (t === 's' || t === 'sai' || t === 'false') return false;
  return null;
}

function parseTruths(answerText: string): boolean[] | null {
  const labelled: (boolean | null)[] = [null, null, null, null];
  const re = /\b([a-d])\s*[).:\-=]*\s*(Đúng|Sai|Đ|S)(?![a-zà-ỹ])/gi;
  let m;
  while ((m = re.exec(answerText)) !== null) labelled[m[1].toLowerCase().charCodeAt(0) - 97] = toTruth(m[2]);
  if (labelled.every(v => v !== null)) return labelled as boolean[];
  const letters = answerText.replace(/Đúng/gi, 'Đ').replace(/Sai/gi, 'S').match(/[ĐSđs]/g);
  if (letters && letters.length === 4) return letters.map(l => toTruth(l) as boolean);
  return null;
}

/** Đưa các dòng đánh dấu của hệ thống ("[Câu 1: Khối 12] Câu 1. …", "[PHẦN I - …] …") về dạng thường. */
function normalizeLines(raw: string): string[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (let line of lines) {
    if (/^\s*-{2,}\s*HẾT\s*-{2,}/i.test(line) || /^\s*HẾT\s*$/i.test(line)) break;
    if (/^\s*GHI CHÚ CHO HỆ THỐNG/i.test(line)) continue;
    const part = /^\s*\[\s*(PH[ẦA]N\s*(?:IV|III|II|I|[1-4])[^\]]*)\]/i.exec(line);
    if (part) { out.push(part[1].trim()); continue; }
    const q = /^\s*\[\s*(?:Câu|Bài)\s*(\d+)\s*:?\s*([^\]]*)\]\s*((?:!\[[^\]]*\]\([^)]*\)\s*)*)\s*(?:(?:Câu|Bài)\s*\d+\s*[.:)]?\s*)?(.*)$/i.exec(line);
    if (q) {
      const tags = q[2].split(/[,;|·]/).map(t => t.trim()).filter(Boolean).map(t => `[${t}]`).join(' ');
      out.push(`Câu ${q[1]}. ${tags} ${q[4]}`.replace(/\s+$/, ''));
      const imgs = q[3].trim();
      if (imgs) out.push(imgs);
      continue;
    }
    out.push(line);
  }
  return out;
}

function readMeta(lines: string[], firstQuestion: number): ParsedExamMeta {
  const head = lines.slice(0, firstQuestion > 0 ? firstQuestion : 30).filter(l => l.trim());
  const meta: ParsedExamMeta = {};
  const titleLine = head.find(l => /^\s*ĐỀ\s+(?:KIỂM TRA|THI|ÔN|KHẢO SÁT)/i.test(l));
  if (titleLine) meta.title = titleLine.replace(/\s+/g, ' ').replace(/\s*[–-]\s*(NĂM HỌC)\s*(\d{4})\s*[–-]\s*(\d{4})/i, ' – NĂM HỌC $2–$3').trim();
  const dur = head.map(l => /(\d{2,3})\s*phút/i.exec(l)).find(Boolean);
  if (dur) meta.durationMinutes = Number(dur[1]);
  const grade = head.map(l => /Lớp\s*(10|11|12)/i.exec(l)).find(Boolean);
  if (grade) meta.grade = Number(grade[1]);
  const code = head.map(l => /Mã\s*đề\s*[:\s]*(\w+)/i.exec(l)).find(Boolean);
  if (code) meta.examCode = code[1];
  return meta;
}

const OPT_BOUNDARY = '(^|[\\s.;,:)\\]$])';
function optionRegex(letter: string) {
  return new RegExp(`${OPT_BOUNDARY}(\\*?\\(?${letter}(?:\\.|\\))(?=[\\s$!\\\\\\u0080-\\uffff]|$))`, 'g');
}

/** Tìm vị trí 4 phương án A, B, C, D theo thứ tự (chọn bộ A–D xuất hiện cuối cùng để không nhầm với chữ A trong đề). */
function findOptions(text: string): { start: number; end: number }[] | null {
  const cands = ['A', 'B', 'C', 'D'].map(l => {
    const re = optionRegex(l);
    const arr: { start: number; end: number }[] = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index + m[1].length;
      arr.push({ start, end: start + m[2].length });
      if (m[0].length === 0) re.lastIndex++;
    }
    return arr;
  });
  for (let ai = cands[0].length - 1; ai >= 0; ai--) {
    const chain = [cands[0][ai]];
    for (let k = 1; k < 4; k++) {
      const prev = chain[k - 1];
      const next = cands[k].find(c => c.start >= prev.end);
      if (!next) { chain.length = 0; break; }
      chain.push(next);
    }
    if (chain.length === 4) return chain;
  }
  return null;
}

const cleanOption = (s: string) =>
  s.replace(/\s+/g, ' ').trim()
    .replace(/(\$|!\[[^\]]*\]\([^)]*\))\s*[.;,]\s*$/, '$1')
    .replace(/\.\s*\$$/, '$');

function tagsOf(first: string) {
  const tags = Array.from(first.matchAll(/\[([^\]]+)\]/g)).map(m => m[1]);
  const t = tags.join(' | ');
  let difficulty: QuestionDifficulty = 'thong_hieu';
  if (/nhận\s*biết/i.test(t)) difficulty = 'nhan_biet';
  else if (/vận\s*dụng\s*cao/i.test(t)) difficulty = 'van_dung_cao';
  else if (/vận\s*dụng/i.test(t)) difficulty = 'van_dung';
  else if (/thông\s*hiểu/i.test(t)) difficulty = 'thong_hieu';
  const g = /(?:khối|lớp)\s*(10|11|12)/i.exec(t);
  let type: ParsedQType | null = null;
  if (/tự\s*luận/i.test(t)) type = 'essay';
  else if (/đúng\s*\/?\s*sai|\bĐS\b/i.test(t)) type = 'true_false';
  else if (/trả\s*lời\s*ngắn|\bTLN\b/i.test(t)) type = 'short_answer';
  else if (/trắc\s*nghiệm/i.test(t)) type = 'mcq';
  return { difficulty, grade: g ? Number(g[1]) : 12, type, hasGrade: !!g };
}

function stripTags(first: string) {
  return first
    .replace(/\[(?:Nhận biết|Thông hiểu|Vận dụng cao|Vận dụng)\]/gi, '')
    .replace(/\[(?:Khối|Lớp)\s*(?:10|11|12)\]/gi, '')
    .replace(/\[(?:Trắc nghiệm|Đúng\s*\/?\s*Sai|ĐS|Trả lời ngắn|TLN|Tự luận)\]/gi, '')
    .replace(/\s+/g, ' ').trim();
}

function parseBlock(blockLines: string[], qNum: number, section: ParsedQType | null): ParsedWordQuestion {
  const firstLine = blockLines[0].replace(Q_START, '');
  const tg = tagsOf(firstLine);
  const lines = [stripTags(firstLine), ...blockLines.slice(1)];

  // Tách Lời giải
  let explanation = '';
  const expIdx = lines.findIndex(l => /^\s*(?:Lời giải|Hướng dẫn giải|HDG|Hướng dẫn chấm)\b/i.test(l));
  let main = lines;
  if (expIdx >= 0) {
    explanation = [lines[expIdx].replace(/^\s*(?:Lời giải|Hướng dẫn giải|HDG|Hướng dẫn chấm)\s*[:.\-]?\s*/i, ''), ...lines.slice(expIdx + 1)].join('\n').trim();
    main = lines.slice(0, expIdx);
  }
  // Tách dòng Đáp án
  let answerText = '';
  const ansIdx = main.findIndex(l => /^\s*(?:Đáp án|Đ\/A|Kết quả)\b/i.test(l));
  if (ansIdx >= 0) {
    answerText = main[ansIdx].replace(/^\s*(?:Đáp án|Đ\/A|Kết quả)\s*[:.\-]?\s*/i, '').trim();
    main = [...main.slice(0, ansIdx), ...main.slice(ansIdx + 1)];
  }
  const body = main.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // Dạng câu
  let type: ParsedQType = tg.type || section || 'mcq';
  if (!tg.type && !section) {
    if (/(?:^|\n)\s*a[).]\s[\s\S]*?\n\s*b[).]\s[\s\S]*?\n\s*c[).]\s[\s\S]*?\n\s*d[).]\s/.test(body)) type = 'true_false';
    else if (findOptions(body)) type = 'mcq';
    else if (answerText) type = 'short_answer';
  }

  const base = {
    questionNumber: qNum, difficulty: tg.difficulty, grade: tg.grade, lessonCode: 'BD-01',
    statements: [] as string[], truths: [] as boolean[], acceptedAnswers: [] as string[]
  };
  const noExp = 'Lời giải chi tiết đang được cập nhật.';

  if (type === 'essay') {
    return {
      ...base, type, prompt: stripTags(body) ? body : body, options: ['', '', '', ''], correctOptionIndex: -1,
      explanation: explanation || 'Chưa có hướng dẫn chấm.', needsReview: false
    };
  }

  if (type === 'true_false') {
    const bodyLines = body.split('\n');
    const marks: { line: number; letter: string }[] = [];
    bodyLines.forEach((l, i) => { const m = /^\s*([a-d])\s*[).]\s*/.exec(l); if (m) marks.push({ line: i, letter: m[1] }); });
    const seq = ['a', 'b', 'c', 'd'];
    // chọn bộ a,b,c,d xuất hiện cuối cùng đúng thứ tự
    let chosen: typeof marks = [];
    for (let s = marks.length - 1; s >= 0; s--) {
      if (marks[s].letter !== 'a') continue;
      const c = [marks[s]];
      for (let k = 1; k < 4; k++) { const n = marks.find(m => m.line > c[k - 1].line && m.letter === seq[k]); if (!n) break; c.push(n); }
      if (c.length === 4) { chosen = c; break; }
    }
    const statements = ['', '', '', ''];
    let prompt = body;
    let review = '';
    if (chosen.length === 4) {
      prompt = bodyLines.slice(0, chosen[0].line).join('\n').trim();
      for (let i = 0; i < 4; i++) {
        const end = i < 3 ? chosen[i + 1].line : bodyLines.length;
        statements[i] = bodyLines.slice(chosen[i].line, end).join('\n').replace(/^\s*[a-d]\s*[).]\s*/, '').trim();
      }
    } else {
      review = 'Chưa nhận diện đủ 4 ý a), b), c), d)';
      statements.fill('(cần nhập lại)');
    }
    const truths = parseTruths(answerText);
    if (!truths) review = review ? `${review} • Chưa có đáp án Đúng/Sai của 4 ý` : 'Chưa có đáp án Đúng/Sai của 4 ý';
    return {
      ...base, type, statements, truths: truths || [],
      prompt, options: ['', '', '', ''], correctOptionIndex: -1,
      explanation: explanation || noExp, needsReview: !!review, reviewReason: review || undefined
    };
  }

  if (type === 'short_answer') {
    const accepted = answerText.split(/[;|]|\s+hoặc\s+/i).map(a => a.replace(/^\$|\$$/g, '').trim()).filter(Boolean);
    return {
      ...base, type, acceptedAnswers: accepted, prompt: body, options: ['', '', '', ''], correctOptionIndex: -1,
      explanation: explanation || noExp,
      needsReview: accepted.length === 0, reviewReason: accepted.length === 0 ? 'Chưa có đáp án của câu trả lời ngắn' : undefined
    };
  }

  // mcq
  const opts = findOptions(body);
  const options = ['', '', '', ''];
  let prompt = body;
  let review = '';
  if (opts) {
    prompt = body.substring(0, opts[0].start).trim();
    for (let i = 0; i < 4; i++) {
      const to = i < 3 ? opts[i + 1].start : body.length;
      options[i] = cleanOption(body.substring(opts[i].end, to));
    }
  } else {
    review = 'Chưa nhận diện đủ 4 phương án A, B, C, D';
    options.fill('(cần nhập lại)');
  }
  let correct = -1;
  const am = /^\s*\*?\(?([A-D])\b/i.exec(answerText);
  if (am) correct = 'ABCD'.indexOf(am[1].toUpperCase());
  if (correct < 0) review = review ? `${review} • Chưa có đáp án đúng` : 'Chưa có đáp án đúng';
  return {
    ...base, type: 'mcq', prompt, options, correctOptionIndex: correct,
    explanation: explanation || noExp, needsReview: !!review, reviewReason: review || undefined
  };
}

export function parseQuestionText(text: string): { questions: ParsedWordQuestion[]; errors: string[]; meta: ParsedExamMeta } {
  const lines = normalizeLines(text);
  const starts: { line: number; num: number; section: ParsedQType | null }[] = [];
  let section: ParsedQType | null = null;
  const partLines = new Set<number>();
  lines.forEach((l, i) => {
    const p = PART_RE.exec(l);
    if (p) { section = partToType(p[1]); partLines.add(i); return; }
    const q = Q_START.exec(l);
    if (q && /^\s*(?:Câu|Bài)\s*\d+/i.test(l)) starts.push({ line: i, num: Number(q[1]), section });
  });
  if (starts.length === 0) {
    return { questions: [], meta: {}, errors: ['Không tìm thấy định dạng "Câu 1.", "Câu 2."… trong file Word. Xem "Mẫu định dạng Word" để soạn đúng cấu trúc.'] };
  }
  const meta = readMeta(lines, starts[0].line);
  const questions: ParsedWordQuestion[] = [];
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].line : lines.length;
    const blockLines = lines.slice(s.line, end).filter((_, k) => !partLines.has(s.line + k));
    questions.push(parseBlock(blockLines, s.num, s.section));
  });
  // Đề lớp 10/11: gán khối của đề cho các câu không ghi khối; mức độ mặc định theo dạng; cảnh báo mức độ lệch cấu trúc
  const errors: string[] = [];
  const g = meta.grade;
  if (g === 10 || g === 11) {
    const explicit = new Set(starts.map((_, i) => i).filter(i => /\[(?:Nhận biết|Thông hiểu|Vận dụng)/i.test(lines.slice(starts[i].line, starts[i].line + 1).join(' '))));
    questions.forEach((q, i) => {
      q.grade = g;
      const allowed = ALLOWED_LEVELS_10_11[q.type];
      if (!explicit.has(i)) q.difficulty = allowed[0] === 'nhan_biet' ? 'thong_hieu' : allowed[0];
      else if (!allowed.includes(q.difficulty)) errors.push(`Câu ${q.questionNumber} (${TYPE_LABEL[q.type]}): mức "${LEVEL_LABEL[q.difficulty]}" ngoài cấu trúc đề lớp ${g} (${allowed.map(l => LEVEL_LABEL[l]).join(' hoặc ')}). Thầy kiểm tra lại mức độ.`);
    });
  }
  return { questions, errors, meta };
}
