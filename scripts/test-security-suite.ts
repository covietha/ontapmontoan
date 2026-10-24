import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import config from '../firebase-applet-config.json';

export type TestStatus = 'ALLOWED' | 'DENIED' | 'PASSED' | 'FAILED' | 'SKIPPED_NEEDS_OAUTH_SESSION';

export interface SecurityTestCase {
  id: string;
  name: string;
  category: 'API_AUTH' | 'EXAM_INTEGRITY' | 'BUNDLE_AUDIT' | 'LIVE_FIRESTORE' | 'DRAFT_RULES_AUDIT';
  target: 'SERVER_API' | 'CLIENT_BUNDLE' | 'LIVE_FIRESTORE_PROD' | 'DRAFT_FIRESTORE_RULES';
  actor: 'UNAUTHENTICATED' | 'FORGED_TOKEN' | 'EXPIRED_TOKEN' | 'STUDENT' | 'TEACHER_ROOT';
  expected: string;
  actual: TestStatus;
  passed: boolean;
  notes: string;
  evidence?: string;
}

export async function runComprehensiveSecurityTests() {
  console.log('================================================================================');
  console.log('    BÁO CÁO TOÀN DIỆN BẢO MẬT & PHÂN QUYỀN – THPT MATH 360');
  console.log('================================================================================');
  console.log(`Dự án Firebase: ${config.projectId}`);
  console.log(`Firestore Database ID: ${config.firestoreDatabaseId}`);
  console.log(`Môi trường thực thi: Node.js Express Backend + Cloud Firestore Production`);
  console.log(`Thời gian thực hiện: ${new Date().toISOString()}`);
  console.log('--------------------------------------------------------------------------------\n');

  const results: SecurityTestCase[] = [];
  const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

  const fbApp = initializeApp(config);
  const db = getFirestore(fbApp, config.firestoreDatabaseId);

  try {
    // -------------------------------------------------------------------------
    // NHÓM 1: KIỂM THỬ XÁC THỰC & CHỐNG GIẢ MẠO ĐIỂM PHÍA SERVER API
    // -------------------------------------------------------------------------
    console.log('>>> [NHÓM 1] KIỂM THỬ XÁC THỰC & CHẤM THI ĐÁNG TIN CẬY PHÍA MÁY CHỦ (SERVER API)');

    // 1. Unauthenticated user calls /api/exams/grade
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: 'exam-chuyen-de-dao-ham-01', userAnswers: {} })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 401;
      results.push({
        id: 'TC-API-01',
        name: 'Chặn nộp bài thi khi chưa đăng nhập (Thiếu Authorization header)',
        category: 'API_AUTH',
        target: 'SERVER_API',
        actor: 'UNAUTHENTICATED',
        expected: 'HTTP 401 Unauthorized',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Máy chủ bắt buộc phải có Authorization Bearer token hợp lệ.',
        evidence: `Mã phản hồi HTTP: ${res.status} | Lỗi: ${data.error}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-01] Người chưa đăng nhập: HTTP ${res.status} (Kỳ vọng: 401)`);
    }

    // 2. Forged or invalid token
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-invalid'
        },
        body: JSON.stringify({ examId: 'exam-chuyen-de-dao-ham-01', userAnswers: {} })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 401;
      results.push({
        id: 'TC-API-02',
        name: 'Chặn nộp bài với Token giả mạo hoặc sai chữ ký',
        category: 'API_AUTH',
        target: 'SERVER_API',
        actor: 'FORGED_TOKEN',
        expected: 'HTTP 401 Unauthorized',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Máy chủ kiểm tra token và từ chối token giả mạo.',
        evidence: `Mã phản hồi HTTP: ${res.status} | Lỗi: ${data.error}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-02] Token giả mạo: HTTP ${res.status} (Kỳ vọng: 401)`);
    }

    // 3. Expired token
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-expired'
        },
        body: JSON.stringify({ examId: 'exam-chuyen-de-dao-ham-01', userAnswers: {} })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 401;
      results.push({
        id: 'TC-API-03',
        name: 'Chặn nộp bài với Token đã hết hạn',
        category: 'API_AUTH',
        target: 'SERVER_API',
        actor: 'EXPIRED_TOKEN',
        expected: 'HTTP 401 Unauthorized',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Máy chủ kiểm tra thời hạn exp của token và yêu cầu đăng nhập lại.',
        evidence: `Mã phản hồi HTTP: ${res.status} | Lỗi: ${data.error}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-03] Token hết hạn: HTTP ${res.status} (Kỳ vọng: 401)`);
    }

    // 4. UID Spoofing Guard: Student sending someone else's studentId
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          studentId: 'victim-student-uid-other', // Cố tình mạo danh học sinh khác
          userAnswers: {} 
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 403;
      results.push({
        id: 'TC-API-04',
        name: 'Chống giả mạo danh tính: Học sinh gửi studentId khác với UID trong Token',
        category: 'API_AUTH',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 403 Forbidden',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Máy chủ đối chiếu studentId trong body với UID giải mã từ token, từ chối nếu không trùng khớp.',
        evidence: `Mã phản hồi HTTP: ${res.status} | Lỗi: ${data.error}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-04] Mạo danh UID học sinh khác: HTTP ${res.status} (Kỳ vọng: 403)`);
    }

    // 5. Arbitrary examId prevention
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'malicious-unauthorized-exam-999', 
          userAnswers: {} 
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 404;
      results.push({
        id: 'TC-API-05',
        name: 'Chặn gửi mã examId tùy ý ngoài danh mục đề thi hợp lệ',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 404 Not Found',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Chỉ các đề thi được giáo viên phát hành chính thức mới được máy chủ chấp thuận chấm.',
        evidence: `Mã phản hồi HTTP: ${res.status} | Lỗi: ${data.error}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-05] Mã đề thi tùy ý: HTTP ${res.status} (Kỳ vọng: 404)`);
    }

    // 6. Student sending fake score & correctCount
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          score: 10.0, // Tự khai 10 điểm
          correctCount: 10, // Tự khai 10 câu đúng
          totalCount: 10,
          verificationStatus: 'server_verified',
          userAnswers: {
            // Chỉ trả lời câu 1 đúng (đáp án A = 0), các câu khác sai hoặc bỏ trống
            'Q-DH-001': 0,
            'Q-DH-002': 3 // Sai
          } 
        })
      });
      const data = await res.json().catch(() => ({}));
      // Máy chủ phải tự tính ra 1/10 = 1.0 điểm, không được nhận điểm 10 do client tự khai
      const passed = res.status === 200 && data.score === 1.0 && data.correctCount === 1;
      results.push({
        id: 'TC-API-06',
        name: 'Chống gian lận: Máy chủ tự tính điểm từ đáp án mật, bỏ qua điểm client tự khai',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'Điểm máy chủ tính = 1.0 (1/10 câu)',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Máy chủ tính điểm từ OFFICIAL_QUESTION_KEYS lưu riêng biệt trên server, bỏ qua hoàn toàn score tự khai.',
        evidence: `Điểm thực tế máy chủ trả về: ${data.score}/10 | Số câu đúng: ${data.correctCount}/${data.totalCount}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-06] Client tự khai điểm 10/10 -> Máy chủ chấm thực tế: ${data.score}/10`);
    }

    // 7. Legitimate student submitting valid exam answers
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          timeSpentSeconds: 650,
          userAnswers: {
            'Q-DH-001': 0, // Đúng (A)
            'Q-DH-002': 0, // Đúng (A)
            'Q-DH-003': 1, // Đúng (B)
            'Q-DH-004': 1, // Đúng (B)
            'Q-DH-005': 0  // Đúng (A)
          } 
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 200 && data.score === 5.0 && data.correctCount === 5 && data.verificationStatus === 'server_verified';
      results.push({
        id: 'TC-API-07',
        name: 'Học sinh hợp lệ nộp bài thi thành công qua API và nhận kết quả xác thực',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 200 OK, score: 5.0, status: server_verified',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Máy chủ trả về kết quả chính thức kèm lời giải chi tiết cho từng câu sau khi đã chấm.',
        evidence: `Score: ${data.score} | Status: ${data.verificationStatus} | GradedAt: ${data.gradedAt}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-07] Học sinh hợp lệ nộp bài: Score ${data.score}/10 (${data.verificationStatus})`);
    }

    // 8. Practice question check - Unauthenticated blocked
    {
      const res = await fetch(`${baseUrl}/api/practice/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: 'Q-DH-001', selectedOptionIndex: 0 })
      });
      const passed = res.status === 401;
      results.push({
        id: 'TC-API-PRAC-01',
        name: 'Chặn kiểm tra câu tự luyện khi chưa xác thực token',
        category: 'API_AUTH',
        target: 'SERVER_API',
        actor: 'UNAUTHENTICATED',
        expected: 'HTTP 401 Unauthorized',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'API tự luyện bắt buộc phải có Authorization Bearer token hợp lệ.',
        evidence: `Mã phản hồi HTTP: ${res.status}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-PRAC-01] Tự luyện không token: HTTP ${res.status} (Kỳ vọng: 401)`);
    }

    // 9. Practice question check - Authenticated succeeds
    {
      const res = await fetch(`${baseUrl}/api/practice/check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ questionId: 'Q-DH-001', selectedOptionIndex: 0 })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 200 && data.isCorrect === true && data.verifiedBy === 'server' && data.checkedByUid === 'student-an-uid-12345';
      results.push({
        id: 'TC-API-PRAC-02',
        name: 'Học sinh xác thực gọi API tự luyện thành công: Máy chủ trả về đáp án và lời giải',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 200 OK, isCorrect: true, verifiedBy: server',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Học sinh chỉ nhận được lời giải sau khi đã nộp đáp án với danh tính hợp lệ.',
        evidence: `isCorrect: ${data.isCorrect} | verifiedBy: ${data.verifiedBy} | checkedByUid: ${data.checkedByUid}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-PRAC-02] Tự luyện có token: isCorrect=${data.isCorrect} (verifiedBy=${data.verifiedBy})`);
    }

    // 10. Chấm thi: Tất cả câu trả lời đúng (10/10 câu -> 10.0 điểm)
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          timeSpentSeconds: 800,
          userAnswers: {
            'Q-DH-001': 0, // A
            'Q-DH-002': 0, // A
            'Q-DH-003': 1, // B
            'Q-DH-004': 1, // B
            'Q-DH-005': 0, // A
            'Q-DH-006': 1, // B
            'Q-DH-007': 0, // A
            'Q-DH-008': 1, // B
            'Q-DH-009': 1, // B
            'Q-DH-010': 0  // A
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 200 && data.score === 10.0 && data.correctCount === 10 && data.totalCount === 10;
      results.push({
        id: 'TC-SCORE-ALL-CORRECT',
        name: 'Kiểm tra tính điểm: Tất cả câu trả lời đúng (10/10 -> 10.0 điểm)',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'Điểm = 10.0 | Số câu đúng = 10/10',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Chấm đúng 100% câu hỏi theo barem chuẩn của đề thi.',
        evidence: `Score: ${data.score} | Correct: ${data.correctCount}/${data.totalCount}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-SCORE-ALL-CORRECT] Toàn bộ đúng: ${data.score}/10 (${data.correctCount}/${data.totalCount})`);
    }

    // 11. Chấm thi: Tất cả câu trả lời sai (0/10 câu -> 0.0 điểm)
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          timeSpentSeconds: 400,
          userAnswers: {
            'Q-DH-001': 3, // Sai (A là đúng)
            'Q-DH-002': 3, // Sai (A)
            'Q-DH-003': 3, // Sai (B)
            'Q-DH-004': 3, // Sai (B)
            'Q-DH-005': 3, // Sai (A)
            'Q-DH-006': 3, // Sai (B)
            'Q-DH-007': 3, // Sai (A)
            'Q-DH-008': 3, // Sai (B)
            'Q-DH-009': 3, // Sai (B)
            'Q-DH-010': 3  // Sai (A)
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 200 && data.score === 0.0 && data.correctCount === 0;
      results.push({
        id: 'TC-SCORE-ALL-WRONG',
        name: 'Kiểm tra tính điểm: Tất cả câu trả lời sai (0/10 -> 0.0 điểm)',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'Điểm = 0.0 | Số câu đúng = 0/10',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Không cộng điểm khi mọi câu trả lời đều sai.',
        evidence: `Score: ${data.score} | Correct: ${data.correctCount}/${data.totalCount}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-SCORE-ALL-WRONG] Toàn bộ sai: ${data.score}/10 (${data.correctCount}/${data.totalCount})`);
    }

    // 12. Chấm thi: Một phần câu trả lời đúng (3/10 câu -> 3.0 điểm)
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          timeSpentSeconds: 500,
          userAnswers: {
            'Q-DH-001': 0, // Đúng (A)
            'Q-DH-002': 0, // Đúng (A)
            'Q-DH-003': 1, // Đúng (B)
            'Q-DH-004': 2, // Sai
            'Q-DH-005': 2, // Sai
            'Q-DH-006': 2, // Sai
            'Q-DH-007': 2, // Sai
            'Q-DH-008': 2, // Sai
            'Q-DH-009': 2, // Sai
            'Q-DH-010': 2  // Sai
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 200 && data.score === 3.0 && data.correctCount === 3;
      results.push({
        id: 'TC-SCORE-PARTIAL',
        name: 'Kiểm tra tính điểm: Một phần câu đúng (3/10 -> 3.0 điểm)',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'Điểm = 3.0 | Số câu đúng = 3/10',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Chấm điểm tuyến tính chính xác theo tỷ lệ số câu đúng.',
        evidence: `Score: ${data.score} | Correct: ${data.correctCount}/${data.totalCount}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-SCORE-PARTIAL] Đúng 3/10 câu: ${data.score}/10 (${data.correctCount}/${data.totalCount})`);
    }

    // 13. Chấm thi: Thiếu câu trả lời (Chỉ làm 4 câu đúng, bỏ trống 6 câu -> 4.0 điểm)
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          timeSpentSeconds: 300,
          userAnswers: {
            'Q-DH-001': 0, // Đúng
            'Q-DH-002': 0, // Đúng
            'Q-DH-003': 1, // Đúng
            'Q-DH-004': 1  // Đúng
            // Các câu 5..10 bỏ trống
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 200 && data.score === 4.0 && data.correctCount === 4 && data.totalCount === 10;
      results.push({
        id: 'TC-SCORE-MISSING',
        name: 'Kiểm tra tính điểm: Thiếu câu trả lời (Chỉ làm 4 câu -> 4.0 điểm)',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'Điểm = 4.0 | Số câu đúng = 4/10',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Các câu không chọn đáp án được tính là chưa trả lời, không gây lỗi hệ thống.',
        evidence: `Score: ${data.score} | Correct: ${data.correctCount}/${data.totalCount}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-SCORE-MISSING] Thiếu câu (làm 4 câu): ${data.score}/10 (${data.correctCount}/${data.totalCount})`);
    }

    // 14. Chấm thi: Dữ liệu câu trả lời sai định dạng (số âm, chuỗi, giá trị ngoài phạm vi)
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          userAnswers: {
            'Q-DH-001': 0,       // Đúng (A)
            'Q-DH-002': -5,      // Sai định dạng (số âm)
            'Q-DH-003': 'text',  // Sai định dạng (chuỗi)
            'Q-DH-004': 99,      // Sai định dạng (vượt ngoài phạm vi lựa chọn 0..3)
            'Q-DH-005': null     // Sai định dạng (null)
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      // Chỉ câu 1 hợp lệ và đúng -> 1 câu đúng = 1.0 điểm
      const passed = res.status === 200 && data.score === 1.0 && data.correctCount === 1;
      results.push({
        id: 'TC-SCORE-MALFORMED',
        name: 'Chống phá hoại dữ liệu: Đáp án sai định dạng được làm sạch an toàn',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 200 OK, score: 1.0 (chỉ tính câu hợp lệ)',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Máy chủ lọc bỏ các giá trị dị thường, không làm sập server hay gây lỗi tính toán.',
        evidence: `Score: ${data.score} | Correct: ${data.correctCount}/${data.totalCount}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-SCORE-MALFORMED] Dữ liệu dị thường: Chấm an toàn ${data.score}/10`);
    }

    // 15. Chống payload rác: userAnswers không phải object (gửi chuỗi hoặc mảng)
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          userAnswers: 'corrupted-string-not-an-object'
        })
      });
      const passed = res.status === 400;
      results.push({
        id: 'TC-API-MALFORMED-PAYLOAD',
        name: 'Chặn payload độc hại: userAnswers không phải là key-value object',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 400 Bad Request',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Máy chủ từ chối tiếp nhận payload có cấu trúc bị làm sai lệch.',
        evidence: `Mã phản hồi HTTP: ${res.status}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-MALFORMED-PAYLOAD] Payload sai cấu trúc: HTTP ${res.status} (Kỳ vọng: 400)`);
    }

    // 16. Chống DoS: Gửi số lượng câu trả lời bất thường (vượt quá giới hạn đề thi)
    {
      const spamAnswers: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        spamAnswers[`FAKE-Q-${i}`] = 1;
      }
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          userAnswers: spamAnswers
        })
      });
      const passed = res.status === 400;
      results.push({
        id: 'TC-API-DOS-PAYLOAD',
        name: 'Chống DoS: Chặn payload chứa số lượng câu trả lời bất thường (> 30 câu)',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 400 Bad Request',
        actual: passed ? 'DENIED' : 'FAILED',
        passed,
        notes: 'Máy chủ phát hiện số lượng câu trả lời bất thường so với cấu trúc đề và từ chối xử lý.',
        evidence: `Mã phản hồi HTTP: ${res.status}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-DOS-PAYLOAD] DoS spam câu trả lời: HTTP ${res.status} (Kỳ vọng: 400)`);
    }

    // 17. Kiểm tra trạng thái đồng bộ Firestore trong kết quả chấm thi
    {
      const res = await fetch(`${baseUrl}/api/exams/grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-student-an'
        },
        body: JSON.stringify({ 
          examId: 'exam-chuyen-de-dao-ham-01', 
          userAnswers: { 'Q-DH-001': 0 }
        })
      });
      const data = await res.json().catch(() => ({}));
      const hasSyncReport = data.firestoreSync && typeof data.firestoreSync.documentId === 'string';
      const passed = res.status === 200 && hasSyncReport;
      results.push({
        id: 'TC-API-FIRESTORE-SYNC',
        name: 'Kiểm tra API lưu kết quả chính thức vào Firestore có báo cáo trạng thái ghi',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'Có trường firestoreSync với documentId và trạng thái rõ ràng',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Máy chủ thử ghi vào tài liệu /examResults và phản hồi rõ ràng kết quả ghi (thành công hoặc lỗi quyền truy cập).',
        evidence: `Document ID: ${data.firestoreSync?.documentId} | Synced: ${data.firestoreSync?.synced} | Ghi chú lỗi (nếu có): ${data.firestoreSync?.error || 'None'}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-FIRESTORE-SYNC] Báo cáo ghi Firestore: docId=${data.firestoreSync?.documentId} (synced=${data.firestoreSync?.synced})`);
    }

    // 18. Cách ly kết quả thi giữa các học sinh (Student Isolation)
    {
      const res = await fetch(`${baseUrl}/api/exams/results`, {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer test-token-student-an'
        }
      });
      const list = await res.json().catch(() => ([]));
      const isIsolated = Array.isArray(list) && list.every((item: any) => item.studentId === 'student-an-uid-12345');
      const passed = res.status === 200 && isIsolated;
      results.push({
        id: 'TC-API-STUDENT-ISOLATION',
        name: 'Bảo mật riêng tư: Học sinh chỉ xem được kết quả của chính mình, không xem được người khác',
        category: 'EXAM_INTEGRITY',
        target: 'SERVER_API',
        actor: 'STUDENT',
        expected: 'HTTP 200 OK, tất cả kết quả trả về đều có studentId trùng với token UID',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Máy chủ lọc triệt để kết quả thi theo UID của người yêu cầu; chỉ Quản trị viên mới xem được tất cả.',
        evidence: `Số kết quả trả về: ${Array.isArray(list) ? list.length : 0} | Tất cả khớp UID: ${isIsolated}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-API-STUDENT-ISOLATION] Cách ly kết quả thi: Khớp UID=${isIsolated} (${Array.isArray(list) ? list.length : 0} bản ghi)`);
    }

    // -------------------------------------------------------------------------
    // NHÓM 2: KIỂM TOÁN RÒ RỈ MÃ NGUỒN PHÍA TRÌNH DUYỆT (BUNDLE LEAK AUDIT)
    // -------------------------------------------------------------------------
    console.log('\n>>> [NHÓM 2] KIỂM TOÁN BẢO VỆ ĐÁP ÁN KHỎI BUNDLE TRÌNH DUYỆT (BUNDLE AUDIT)');

    {
      const oldKeysFileExists = fs.existsSync(path.resolve(process.cwd(), 'src/data/answerKeys.ts'));
      const serverKeysFileExists = fs.existsSync(path.resolve(process.cwd(), 'server/answerKeys.ts'));
      
      // Kiểm tra file initialData.ts có còn chứa đáp án kỳ thi không
      const initialDataContent = fs.readFileSync(path.resolve(process.cwd(), 'src/data/initialData.ts'), 'utf8');
      const hasQ001InInitial = initialDataContent.includes('Q-DH-001');
      const hasQ001SecretAnswerInInitial = initialDataContent.includes('ad - bc = 2 \\cdot (-3) - 1 \\cdot 1 = -6 - 1 = -7');

      const passed = !oldKeysFileExists && serverKeysFileExists && !hasQ001SecretAnswerInInitial;
      results.push({
        id: 'TC-BND-01',
        name: 'Cách ly đáp án thi: Loại bỏ hoàn toàn tệp đáp án mật khỏi thư mục src/',
        category: 'BUNDLE_AUDIT',
        target: 'CLIENT_BUNDLE',
        actor: 'STUDENT',
        expected: 'src/data/answerKeys.ts bị xóa; đáp án mật chuyển vào server/answerKeys.ts',
        actual: passed ? 'PASSED' : 'FAILED',
        passed,
        notes: 'Đảm bảo trình duyệt học sinh không tải về đáp án thi chính thức.',
        evidence: `oldKeysFileExists: ${oldKeysFileExists} | serverKeysFileExists: ${serverKeysFileExists} | secretInInitialData: ${hasQ001SecretAnswerInInitial}`
      });
      console.log(`  ${passed ? '✅' : '❌'} [TC-BND-01] Cách ly đáp án chuẩn thi khỏi bundle client: ${passed ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
    }

    // -------------------------------------------------------------------------
    // NHÓM 3: KIỂM THỬ TRỰC TIẾP TRÊN GOOGLE CLOUD FIRESTORE PRODUCTION
    // -------------------------------------------------------------------------
    console.log('\n>>> [NHÓM 3] KIỂM THỬ TRÊN GOOGLE CLOUD FIRESTORE THẬT (extreme-beacon-483d0)');

    // 1. Read topics
    try {
      const snap = await getDocs(collection(db, 'topics'));
      results.push({
        id: 'TC-FS-01',
        name: 'Đọc chuyên đề học liệu công khai (/topics)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'ALLOWED',
        actual: 'ALLOWED',
        passed: true,
        notes: 'Quy tắc công khai: allow read: if true;',
        evidence: `Đọc thành công collection topics (${snap.size} tài liệu)`
      });
      console.log(`  ✅ [TC-FS-01] Đọc topics: ALLOWED (${snap.size} tài liệu)`);
    } catch (e: any) {
      results.push({
        id: 'TC-FS-01',
        name: 'Đọc chuyên đề học liệu công khai (/topics)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'ALLOWED',
        actual: 'FAILED',
        passed: false,
        notes: 'Không đọc được chuyên đề công khai',
        evidence: e?.message
      });
      console.log(`  ❌ [TC-FS-01] Đọc topics: FAILED (${e?.message})`);
    }

    // 2. Read lessons
    try {
      const snap = await getDocs(collection(db, 'lessons'));
      results.push({
        id: 'TC-FS-02',
        name: 'Đọc bài học lý thuyết công khai (/lessons)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'ALLOWED',
        actual: 'ALLOWED',
        passed: true,
        notes: 'Quy tắc công khai: allow read: if true;',
        evidence: `Đọc thành công collection lessons (${snap.size} tài liệu)`
      });
      console.log(`  ✅ [TC-FS-02] Đọc lessons: ALLOWED (${snap.size} tài liệu)`);
    } catch (e: any) {
      results.push({
        id: 'TC-FS-02',
        name: 'Đọc bài học lý thuyết công khai (/lessons)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'ALLOWED',
        actual: 'FAILED',
        passed: false,
        notes: 'Không đọc được bài học công khai',
        evidence: e?.message
      });
      console.log(`  ❌ [TC-FS-02] Đọc lessons: FAILED (${e?.message})`);
    }

    // 3. Question keys protection
    try {
      await getDoc(doc(db, 'questionKeys', 'Q-DH-001'));
      results.push({
        id: 'TC-FS-03',
        name: 'Chặn đọc trực tiếp bảng đáp án mật (/questionKeys)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: 'ALLOWED',
        passed: false,
        notes: 'LỖ HỔNG: Học sinh đọc được bảng đáp án mật!',
        evidence: 'Thao tác đọc không bị chặn'
      });
      console.log(`  ❌ [TC-FS-03] Đọc questionKeys: LỖ HỔNG (ALLOWED)`);
    } catch (e: any) {
      const isDenied = e?.code === 'permission-denied' || String(e).includes('PERMISSION_DENIED');
      results.push({
        id: 'TC-FS-03',
        name: 'Chặn đọc trực tiếp bảng đáp án mật (/questionKeys)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: isDenied ? 'DENIED' : 'FAILED',
        passed: isDenied,
        notes: 'Firestore từ chối quyền đọc bảng questionKeys đối với người chưa được ủy quyền admin.',
        evidence: `Mã lỗi gRPC 7 PERMISSION_DENIED: ${e?.message}`
      });
      console.log(`  ${isDenied ? '✅' : '❌'} [TC-FS-03] Đọc questionKeys: DENIED (Mã lỗi: ${e?.code || 'permission-denied'})`);
    }

    // 4. Admins write protection
    try {
      await setDoc(doc(db, 'admins', 'unauthorized-admin-test-uid'), {
        email: 'attacker@test.com',
        role: 'admin',
        grantedAt: new Date().toISOString()
      });
      results.push({
        id: 'TC-FS-04',
        name: 'Chặn tự gán hồ sơ Quản trị viên (/admins write)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: 'ALLOWED',
        passed: false,
        notes: 'LỖ HỔNG: Người dùng ghi được vào /admins!',
        evidence: 'Thao tác ghi không bị chặn'
      });
      console.log(`  ❌ [TC-FS-04] Ghi /admins: LỖ HỔNG (ALLOWED)`);
    } catch (e: any) {
      const isDenied = e?.code === 'permission-denied' || String(e).includes('PERMISSION_DENIED');
      results.push({
        id: 'TC-FS-04',
        name: 'Chặn tự gán hồ sơ Quản trị viên (/admins write)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: isDenied ? 'DENIED' : 'FAILED',
        passed: isDenied,
        notes: 'Firestore từ chối ghi vào /admins đối với người dùng không được phép.',
        evidence: `Mã lỗi: ${e?.code || 'permission-denied'}`
      });
      console.log(`  ${isDenied ? '✅' : '❌'} [TC-FS-04] Ghi /admins: DENIED (Mã lỗi: ${e?.code || 'permission-denied'})`);
    }

    // 5. Users teacher role spoofing
    try {
      await setDoc(doc(db, 'users', 'fake-teacher-id'), {
        role: 'teacher',
        email: 'fraud@test.com'
      });
      results.push({
        id: 'TC-FS-05',
        name: 'Chặn tự gán role="teacher" trong /users',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: 'ALLOWED',
        passed: false,
        notes: 'LỖ HỔNG: Cho phép tạo user với role teacher!',
        evidence: 'Thao tác ghi không bị chặn'
      });
      console.log(`  ❌ [TC-FS-05] Tự nâng role teacher: LỖ HỔNG (ALLOWED)`);
    } catch (e: any) {
      const isDenied = e?.code === 'permission-denied' || String(e).includes('PERMISSION_DENIED');
      results.push({
        id: 'TC-FS-05',
        name: 'Chặn tự gán role="teacher" trong /users',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: isDenied ? 'DENIED' : 'FAILED',
        passed: isDenied,
        notes: 'Firestore từ chối ghi tài liệu người dùng mạo danh.',
        evidence: `Mã lỗi: ${e?.code || 'permission-denied'}`
      });
      console.log(`  ${isDenied ? '✅' : '❌'} [TC-FS-05] Tự nâng role teacher: DENIED (Mã lỗi: ${e?.code || 'permission-denied'})`);
    }

    // 6. Sửa câu hỏi /questions
    try {
      await setDoc(doc(db, 'questions', 'Q-DH-001'), { prompt: 'Hacker altered' });
      results.push({
        id: 'TC-FS-06',
        name: 'Chặn sửa ngân hàng câu hỏi (/questions write)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: 'ALLOWED',
        passed: false,
        notes: 'LỖ HỔNG: Cho phép sửa /questions!',
        evidence: 'Thao tác ghi không bị chặn'
      });
      console.log(`  ❌ [TC-FS-06] Sửa câu hỏi /questions: LỖ HỔNG (ALLOWED)`);
    } catch (e: any) {
      const isDenied = e?.code === 'permission-denied' || String(e).includes('PERMISSION_DENIED');
      results.push({
        id: 'TC-FS-06',
        name: 'Chặn sửa ngân hàng câu hỏi (/questions write)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: isDenied ? 'DENIED' : 'FAILED',
        passed: isDenied,
        notes: 'Firestore từ chối sửa đổi câu hỏi khi không có quyền admin.',
        evidence: `Mã lỗi: ${e?.code || 'permission-denied'}`
      });
      console.log(`  ${isDenied ? '✅' : '❌'} [TC-FS-06] Sửa câu hỏi /questions: DENIED (Mã lỗi: ${e?.code || 'permission-denied'})`);
    }

    // 7. Sửa attempts
    try {
      await setDoc(doc(db, 'attempts', 'tamper-attempt'), { isCorrect: true, studentId: 'victim' });
      results.push({
        id: 'TC-FS-07',
        name: 'Chặn sửa lượt làm bài (/attempts write)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: 'ALLOWED',
        passed: false,
        notes: 'LỖ HỔNG: Cho phép sửa attempts!',
        evidence: 'Thao tác ghi không bị chặn'
      });
      console.log(`  ❌ [TC-FS-07] Sửa lượt làm bài /attempts: LỖ HỔNG (ALLOWED)`);
    } catch (e: any) {
      const isDenied = e?.code === 'permission-denied' || String(e).includes('PERMISSION_DENIED');
      results.push({
        id: 'TC-FS-07',
        name: 'Chặn sửa lượt làm bài (/attempts write)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: isDenied ? 'DENIED' : 'FAILED',
        passed: isDenied,
        notes: 'Firestore từ chối thao tác sửa đổi lượt làm bài trái phép.',
        evidence: `Mã lỗi: ${e?.code || 'permission-denied'}`
      });
      console.log(`  ${isDenied ? '✅' : '❌'} [TC-FS-07] Sửa lượt làm bài /attempts: DENIED (Mã lỗi: ${e?.code || 'permission-denied'})`);
    }

    // 8. Đọc hồ sơ user khác
    try {
      await getDoc(doc(db, 'users', 'other-private-user'));
      results.push({
        id: 'TC-FS-08',
        name: 'Chặn đọc trộm hồ sơ người khác (/users read)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: 'ALLOWED',
        passed: false,
        notes: 'LỖ HỔNG: Cho phép đọc hồ sơ người khác!',
        evidence: 'Thao tác đọc không bị chặn'
      });
      console.log(`  ❌ [TC-FS-08] Đọc hồ sơ người khác: LỖ HỔNG (ALLOWED)`);
    } catch (e: any) {
      const isDenied = e?.code === 'permission-denied' || String(e).includes('PERMISSION_DENIED');
      results.push({
        id: 'TC-FS-08',
        name: 'Chặn đọc trộm hồ sơ người khác (/users read)',
        category: 'LIVE_FIRESTORE',
        target: 'LIVE_FIRESTORE_PROD',
        actor: 'UNAUTHENTICATED',
        expected: 'DENIED',
        actual: isDenied ? 'DENIED' : 'FAILED',
        passed: isDenied,
        notes: 'Firestore từ chối đọc hồ sơ người dùng không thuộc quyền sở hữu.',
        evidence: `Mã lỗi: ${e?.code || 'permission-denied'}`
      });
      console.log(`  ${isDenied ? '✅' : '❌'} [TC-FS-08] Đọc hồ sơ người khác: DENIED (Mã lỗi: ${e?.code || 'permission-denied'})`);
    }

    // -------------------------------------------------------------------------
    // NHÓM 4: MINH BẠCH CÁC CA ĐẶC BIỆT CẦN TÀI KHOẢN GOOGLE TƯƠNG TÁC / EMULATOR
    // -------------------------------------------------------------------------
    console.log('\n>>> [NHÓM 4] BÁO CÁO CÁC CA CẦN TÀI KHOẢN THỰC THẾ / EMULATOR CHƯA CHẠY TRÊN CLOUD THẬT');

    // TC-SPEC-01: Logged-in Google Student directly creating fake score in /examResults on Live Cloud Firestore
    results.push({
      id: 'TC-SPEC-01',
      name: 'Học sinh đã đăng nhập Google tự ghi đè điểm vào /examResults trên Firestore thật',
      category: 'DRAFT_RULES_AUDIT',
      target: 'DRAFT_FIRESTORE_RULES',
      actor: 'STUDENT',
      expected: 'DENIED (Quy tắc DRAFT đã sửa: allow create, update, delete: if isAdmin();)',
      actual: 'SKIPPED_NEEDS_OAUTH_SESSION',
      passed: false,
      notes: 'CHƯA THỰC THI TRÊN CLOUD THẬT: Do DRAFT_firestore.rules chưa được triển khai (theo yêu cầu bảo lưu của Thầy). Trong DRAFT_firestore.rules, quyền ghi của học sinh vào /examResults đã bị khóa hoàn toàn (allow write: if isAdmin()). Ca này cần tài khoản Google thật đăng nhập trên UI để kiểm thử end-to-end sau khi triển khai.',
      evidence: 'Quy tắc DRAFT: match /examResults/{resultId} { allow create, update, delete: if isAdmin(); }'
    });
    console.log('  ⚠️ [TC-SPEC-01] Học sinh đăng nhập ghi /examResults: SKIPPED (Chờ Thầy đồng ý triển khai DRAFT_firestore.rules)');

    // TC-SPEC-02: Only Root Admin can grant or revoke /admins on Live Cloud Firestore
    results.push({
      id: 'TC-SPEC-02',
      name: 'Chỉ Quản trị viên gốc (viethathd@gmail.com) mới được cấp hoặc thu hồi quyền admin trong /admins',
      category: 'DRAFT_RULES_AUDIT',
      target: 'DRAFT_FIRESTORE_RULES',
      actor: 'TEACHER_ROOT',
      expected: 'ALLOWED chỉ cho viethathd@gmail.com (isRootAdmin); DENIED cho tất cả người khác',
      actual: 'SKIPPED_NEEDS_OAUTH_SESSION',
      passed: false,
      notes: 'CHƯA THỰC THI TRÊN CLOUD THẬT: Quy tắc đang nằm trong DRAFT_firestore.rules với hàm isRootAdmin() kiểm tra email == viethathd@gmail.com && email_verified == true. Cần phiên đăng nhập Google thật của Thầy để xác nhận trên môi trường thực tế sau triển khai.',
      evidence: 'Quy tắc DRAFT: match /admins/{adminId} { allow read: if isAdmin(); allow write: if isRootAdmin(); }'
    });
    console.log('  ⚠️ [TC-SPEC-02] Quản trị gốc cấp quyền /admins: SKIPPED (Chờ Thầy đồng ý triển khai DRAFT_firestore.rules)');

    // -------------------------------------------------------------------------
    // BẢNG TỔNG KẾT
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log('                   BẢNG TỔNG HỢP KIỂM THỬ AN TOÀN TOÀN DIỆN');
    console.log('================================================================================');

    const totalRan = results.filter(r => r.actual !== 'SKIPPED_NEEDS_OAUTH_SESSION').length;
    const totalPassed = results.filter(r => r.passed).length;
    const totalSkipped = results.filter(r => r.actual === 'SKIPPED_NEEDS_OAUTH_SESSION').length;

    results.forEach(r => {
      const tag = r.passed ? 'PASS' : r.actual === 'SKIPPED_NEEDS_OAUTH_SESSION' ? 'CHƯA CHẠY (SKIPPED)' : 'FAIL';
      console.log(`[${tag}] ${r.id} - ${r.name}`);
      console.log(`       Đối tượng: ${r.actor} | Nhóm: ${r.category} | Mục tiêu: ${r.target}`);
      console.log(`       Kỳ vọng: ${r.expected}`);
      console.log(`       Thực tế: ${r.actual}`);
      console.log(`       Ghi chú: ${r.notes}`);
      if (r.evidence) {
        console.log(`       Bằng chứng thực nghiệm: ${r.evidence}`);
      }
      console.log('');
    });

    console.log('--------------------------------------------------------------------------------');
    console.log(`TỔNG KẾT THỰC NGHIỆM:`);
    console.log(`- Tổng số ca kiểm thử: ${results.length}`);
    console.log(`- Số ca đã thực hiện trực tiếp: ${totalRan}`);
    console.log(`- Số ca đạt chuẩn an toàn thực tế: ${totalPassed}/${totalRan}`);
    console.log(`- Số ca chưa chạy (chờ xác thực tài khoản Google thật hoặc triển khai Rules): ${totalSkipped}`);
    console.log('================================================================================\n');

  } catch (err) {
    console.error('Lỗi ngoài dự kiến trong quá trình kiểm thử:', err);
  }
}

// Run if called directly
runComprehensiveSecurityTests().then(() => {
  console.log('Hoàn tất chạy bộ kiểm thử.');
  process.exit(0);
}).catch(err => {
  console.error('Lỗi khi chạy bộ kiểm thử:', err);
  process.exit(1);
});
