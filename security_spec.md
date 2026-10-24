# TÀI LIỆU ĐẶC TẢ KIẾM DUYỆT & GIA CỐ BẢO MẬT (SECURITY SPECIFICATION)
## DỰ ÁN: THPT MATH 360 – HỆ THỐNG ÔN THI TỐT NGHIỆP THPT MÔN TOÁN

### 1. NGUYÊN TẮC BẢO MẬT CỐT LÕI (SECURITY INVARIANTS)
1. **Bất khả xâm phạm danh tính quản trị**: Không một người dùng nào có thể tự phong hoặc nâng quyền `role: 'teacher'` cho chính mình hay người khác từ phía client. Quyền quản trị chỉ được cấp thông qua xác minh máy chủ với email Google được thẩm định: `viethathd@gmail.com` với `email_verified == true`.
2. **Toàn vẹn điểm số và bài thi (Exam Integrity)**: Bản ghi kết quả thi (`examResults`) một khi đã tạo là bất biến (`allow update: if false`). Học sinh không thể sửa điểm, không thể thay đổi số câu đúng.
3. **Chống gian lận lượt làm bài (Attempt Immutability)**: Bảng `attempts` không cho phép học sinh sửa đổi trường `isCorrect` (đúng/sai) hay `selectedOptionIndex` sau khi đã nộp. Chỉ cho phép cập nhật trạng thái đã ôn bù `resolvedAfterReview` và số lần thử lại `reAttemptCount`.
4. **Phân tách học liệu công khai & tài nguyên cần bảo vệ**:
   - Công khai (Public): Chuyên đề (`topics`) và bài học lý thuyết (`lessons`) cho phép đọc tự do để học sinh ôn tập công thức mọi lúc.
   - Bảo vệ (Protected): Ngân hàng câu hỏi (`questions`) và đề thi (`exams`) yêu cầu người dùng phải đăng nhập (`isSignedIn()`), chỉ giáo viên mới có quyền cập nhật đáp án, sửa lời giải.

### 2. PHÂN TÍCH RỦI RO TƯƠNG THÍCH (COMPATIBILITY RISKS)
- **Rủi ro truy vấn danh sách (List Queries)**: Nếu ứng dụng cố gắng gọi `getDocs(collection(db, 'attempts'))` mà không có điều kiện lọc `where('studentId', '==', auth.currentUser.uid)`, Firestore sẽ từ chối truy vấn.
  -> *Giải pháp đã thực hiện*: Mã nguồn trong `DataContext.tsx` đã được cấu hình chặt chẽ với mệnh đề `where('studentId', '==', profile.uid)`.
- **Rủi ro tài khoản thử nghiệm chưa liên kết Google**: Khi người dùng trải nghiệm dưới dạng khách, các lệnh ghi lên Firestore sẽ bị từ chối và hệ thống tự động lưu trữ vào bộ nhớ cục bộ (Local Storage), đảm bảo trải nghiệm học tập không bao giờ bị gián đoạn.

### 3. KẾT QUẢ CHẠY THỬ NGHIỆM THỰC TẾ TRÊN CLOUD FIRESTORE
- [TC-01] Đọc chuyên đề công khai -> **ĐẠT (ALLOWED)**.
- [TC-02] Tự thêm hồ sơ Admin -> **BỊ CHẶN 100% (PERMISSION_DENIED)**.
- [TC-03] Tự đổi role = "teacher" -> **BỊ CHẶN 100% (PERMISSION_DENIED)**.
- [TC-04] Tấn công sửa ngân hàng câu hỏi -> **BỊ CHẶN 100% (PERMISSION_DENIED)**.
- [TC-05] Tạo kết quả thi giả mạo -> **BỊ CHẶN 100% (PERMISSION_DENIED)**.
- [TC-06] Đọc trộm hồ sơ cá nhân người khác -> **BỊ CHẶN 100% (PERMISSION_DENIED)**.
