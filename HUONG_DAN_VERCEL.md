# Triển khai lên Vercel

Giao diện (Vite) và máy chủ chấm thi (Express) cùng chạy trên Vercel: giao diện là các tệp tĩnh, máy chủ là **một hàm serverless** `api/index.js` nhận mọi đường `/api/...`. Vì hàm serverless không có ổ đĩa lâu dài, tài khoản, quản trị viên và kết quả thi được lưu trong **Cloud Firestore** của dự án Firebase hiện có.

## 1. Tạo khóa dịch vụ Firebase (làm một lần)

1. Vào [Firebase Console](https://console.firebase.google.com/) › dự án `extreme-beacon-483d0`.
2. Biểu tượng bánh răng › **Project settings** › tab **Service accounts**.
3. Nhấn **Generate new private key** › tải về một tệp `.json`.
4. Giữ tệp này kín. Không đưa vào GitHub, không gửi qua tin nhắn.

Khóa này cho máy chủ quyền ghi Firestore bỏ qua `firestore.rules`, nên các quy tắc bảo mật vẫn chỉ áp dụng cho trình duyệt.

## 2. Biến môi trường trên Vercel

Project › **Settings** › **Environment Variables**, chọn Production và Preview:

| Tên | Giá trị |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Toàn bộ nội dung tệp `.json` ở bước 1 (mở bằng Notepad, chép hết, dán vào). |
| `SESSION_SECRET` | Một chuỗi ngẫu nhiên dài, ví dụ tạo bằng `openssl rand -hex 32`. Dùng để ký phiên đăng nhập; thiếu biến này máy chủ từ chối đăng nhập. |

Sau khi thêm biến, vào **Deployments** › **Redeploy** để có hiệu lực.

## 3. Cấu hình project

Dự án đã có `vercel.json`, không cần chỉnh gì trong màn hình Import: Preset **Vite**, Root Directory `./`. Lệnh cài đặt dùng `--legacy-peer-deps` (có sẵn trong `vercel.json` và `.npmrc`).

## 4. Cho phép đăng nhập Google trên tên miền mới

Chỉ cần nếu dùng nút "Cổng quản trị" (đăng nhập Google của quản trị viên gốc): Firebase Console › **Authentication** › **Settings** › **Authorized domains** › thêm tên miền Vercel (ví dụ `ontapmontoan.vercel.app`).

## 5. Kiểm tra sau khi deploy

- Mở `https://<tên-miền>/api/health`. Kết quả mong đợi: `"storage":"firestore"` và `"sessionSecretConfigured":true`.
- Đăng nhập `GV01` / `ThptMath@2026`, vào **Tài khoản & phân quyền**, tạo một tài khoản thử, tải lại trang và đăng nhập bằng tài khoản đó. Trong Firestore sẽ xuất hiện các bộ sưu tập `schoolAccounts`, `users`, `serverExamResults`, `examResults`, `admins`, `config`.
- **Đổi mật khẩu các tài khoản mẫu** (`GV01`, `HS12001`…) ngay sau lần đăng nhập đầu tiên: ở lần chạy đầu tiên hệ thống tự nạp 4 tài khoản mẫu với mật khẩu `ThptMath@2026`.

## Khi báo lỗi

| Hiện tượng | Nguyên nhân |
| --- | --- |
| `storage` là `memory` | Thiếu hoặc sai `FIREBASE_SERVICE_ACCOUNT`; tạo tài khoản báo lỗi 503. |
| Đăng nhập báo lỗi `SESSION_SECRET` | Chưa đặt `SESSION_SECRET`. |
| `PERMISSION_DENIED` trong log hàm | Khóa dịch vụ thuộc dự án khác với `extreme-beacon-483d0`. |

## Phát triển

`npm run dev` chạy cả giao diện và máy chủ ở cổng 3000; dữ liệu ghi vào thư mục `data/store` (không đưa lên GitHub). Sau khi sửa mã trong `server/`, chạy `npm run build:api` để cập nhật `api/index.js` rồi commit. `npm run build` cũng làm bước này.
