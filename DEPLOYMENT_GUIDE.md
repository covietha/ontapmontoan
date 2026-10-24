# HƯỚNG DẪN TRIỂN KHAI QUY TẮC BẢO MẬT FIRESTORE - THPT MATH 360

Tài liệu này hướng dẫn chi tiết quy trình triển khai có kiểm soát bộ quy tắc bảo mật (`Security Rules`) cho ứng dụng THPT MATH 360 trực tiếp trên **Firebase Console**.

---

## 1. THÔNG TIN HỆ THỐNG
* **Firebase Project ID:** `extreme-beacon-483d0`
* **Firestore Database ID:** `ai-studio-thptmath360-20eebd27-97f9-4350-9af7-ad32af22ffcf`
* **Tệp quy tắc cần triển khai:** `DRAFT_firestore.rules` (nằm ở thư mục gốc của dự án)
* **Tài khoản quản trị gốc (Root Admin):** `viethathd@gmail.com` (phải là email đã xác minh của Google)

---

## 2. CHUẨN BỊ VÀ SAO LƯU QUY TẮC HIỆN HÀNH (BẮT BUỘC)

Trước khi thực hiện bất kỳ thay đổi nào, hãy sao lưu cấu hình quy tắc hiện tại:

1. Đăng nhập vào [Firebase Console](https://console.firebase.google.com/) bằng tài khoản quản trị `viethathd@gmail.com`.
2. Chọn dự án: **`extreme-beacon-483d0`**.
3. Tại menu bên trái, vào mục **Build** ➜ **Firestore Database**.
4. Tại thanh công cụ trên cùng của trang Firestore, kiểm tra mục chọn Database:
   * Chuyển sang đúng cơ sở dữ liệu: **`ai-studio-thptmath360-20eebd27-97f9-4350-9af7-ad32af22ffcf`**.
5. Nhấp vào tab **Rules** (Quy tắc).
6. **Sao lưu:**
   * Chọn toàn bộ mã trong khung soạn thảo (`Ctrl + A` hoặc `Cmd + A`), sao chép (`Ctrl + C`).
   * Dán và lưu vào một tệp văn bản dự phòng trên máy tính cá nhân của Thầy (ví dụ: `firestore.rules.backup-YYYYMMDD.txt`).
   * *Lưu ý:* Firebase Console cũng tự động lưu lịch sử quy tắc trong tab phụ **Rules history** (Lịch sử quy tắc).

---

## 3. CÁC BƯỚC TRIỂN KHAI BẢN QUY TẮC MỚI

1. Mở tệp `DRAFT_firestore.rules` trong dự án THPT MATH 360.
2. Sao chép toàn bộ nội dung trong tệp `DRAFT_firestore.rules`.
3. Quay lại trình duyệt tại tab **Rules** của cơ sở dữ liệu Firestore (`ai-studio-thptmath360-20eebd27-97f9-4350-9af7-ad32af22ffcf`).
4. Xóa toàn bộ nội dung cũ trong khung soạn thảo trên Console và dán nội dung mới từ `DRAFT_firestore.rules` vào.
5. Nhấp vào nút **Publish** (Phát hành) ở góc trên bên phải khung soạn thảo.
6. Chờ thông báo xác nhận quy tắc đã được phát hành thành công (thường mất 2 - 5 giây để có hiệu lực trên toàn cầu).

---

## 4. QUY TRÌNH KHÔI PHỤC KHI GẶP LỖI (ROLLBACK)

Nếu sau khi xuất bản quy tắc mới mà ứng dụng phát sinh lỗi quyền truy cập ngoài ý muốn:

### Cách 1: Sử dụng tính năng Rules History trên Console (Nhanh nhất)
1. Tại tab **Rules**, nhấp vào mục **Rules history** (nằm cạnh nút Publish hoặc tab con).
2. Tìm phiên bản quy tắc ngay trước khi phát hành (có ghi rõ ngày giờ phát hành).
3. Nhấp vào dấu 3 chấm (`...`) hoặc nút xem phiên bản đó và chọn **Restore** (Khôi phục) hoặc **Publish to current**.

### Cách 2: Khôi phục từ tệp dự phòng đã sao lưu
1. Mở tệp sao lưu `firestore.rules.backup-YYYYMMDD.txt` đã lưu ở Bước 2.
2. Sao chép toàn bộ nội dung, dán đè vào khung soạn thảo Rules trên Firebase Console.
3. Nhấp **Publish**.

---

## 5. CÁC THAO TÁC KIỂM TRA NHANH SAU TRIỂN KHAI (QUICK CHECKLIST)

Sau khi phát hành, thực hiện kiểm tra 4 nghiệp vụ chính:

1. **Khóa ghi điểm từ Client SDK đối với học sinh:**
   - Học sinh hoàn thành bài thi thử và bấm **Nộp bài**:
     - Client gửi bài nộp đến API máy chủ (`/api/submit-exam`).
     - Máy chủ tự xác thực ID token, chấm điểm độc lập từ đáp án chuẩn mật, ghi điểm vào Firestore qua quyền máy chủ an toàn.
     - Điểm hiển thị chính xác trên giao diện học sinh.
   - Nếu dùng DevTools hoặc script ngoài cố ý gửi yêu cầu ghi trực tiếp `setDoc`/`addDoc` vào bộ sưu tập `/examResults`, Firestore phải chặn ngay lập tức với lỗi `PERMISSION_DENIED`.

2. **Bảo mật đáp án và lời giải mật:**
   - Học sinh khi tham gia thi thử không thể đọc được bộ sưu tập `/questionKeys`.
   - Đáp án câu hỏi kỳ thi chỉ được trả về từng phần theo đúng tiến độ sau khi máy chủ đã hoàn tất chấm điểm.

3. **Bảo vệ quyền riêng tư kết quả thi:**
   - Học sinh A đăng nhập chỉ xem được lịch sử thi và kết quả của chính mình trong `/examResults`.
   - Học sinh A truy vấn kết quả của Học sinh B sẽ bị Firestore từ chối truy cập.

4. **Bảo vệ cấp quyền quản trị viên (Admin Privilege):**
   - Đăng nhập tài khoản `viethathd@gmail.com`: Quản trị viên gốc có quyền xem toàn bộ danh sách điểm thi, ngân hàng câu hỏi, và có quyền chỉ định thêm tài khoản phụ trách vào `/admins`.
   - Tài khoản người dùng bình thường hoặc tài khoản học sinh không thể tự tạo tài liệu trong `/admins` để leo thang đặc quyền.

---

## 6. LƯU Ý BẢO MẬT BẮT BUỘC
* Tuyệt đối không chia sẻ Service Account Key hoặc Firebase Admin Credentials lên repository công khai.
* Bản quy tắc đang lưu tại tệp `firestore.rules` trên môi trường phát triển cục bộ vẫn được giữ nguyên an toàn, chỉ bản `DRAFT_firestore.rules` đã qua kiểm định mới được đưa lên Console theo hướng dẫn trên.
