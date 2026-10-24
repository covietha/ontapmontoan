# Tổ Toán - THPT Trần Hưng Đạo · Ôn tập môn Toán THPT

Hệ thống ôn tập môn Toán THPT cho học sinh và Tổ Toán: học lý thuyết theo chuyên đề, luyện tập theo dạng, thi thử có bấm giờ (máy chủ chấm điểm), sổ tay lỗi sai, và khu quản lý lớp, ngân hàng câu hỏi, tài khoản cho giáo viên.

## Chạy trên máy

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # điền GEMINI_API_KEY nếu dùng tính năng AI
npm run dev                  # http://localhost:3000 (dữ liệu lưu ở data/store)
```

Tài khoản mẫu (mật khẩu `ThptMath@2026`): `GV01` (giáo viên), `HS12001` (học sinh). Đổi mật khẩu trước khi triển khai thật.

## Giao diện

- **Thanh trạng thái đổi theo menu.** Mỗi menu (và mỗi tab con) khai báo tiêu đề, mô tả, nhóm, biểu tượng và màu nhấn trong `src/config/navigation.ts`. Thanh trên cùng hiện đường dẫn, tiêu đề, mô tả và màu của mục đang mở; thanh dưới cùng hiện mục đang mở, năm học, ngày và trạng thái kết nối.
- **Hệ thống thiết kế** nằm ở `src/index.css` (token màu, chữ, bo góc, đổ bóng). Chủ đề: giấy kẻ ô li, mực xanh, bút đỏ của thầy cô. Chữ: Newsreader (tiêu đề) và IBM Plex Sans (nội dung), đều hỗ trợ tiếng Việt.
- Thêm một menu mới chỉ cần thêm một mục vào `NAV_ITEMS`.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/config` | Cấu hình menu và thanh trạng thái |
| `src/components` | Các màn hình và thành phần giao diện |
| `src/context` | Đăng nhập và dữ liệu |
| `server`, `server.ts` | Máy chủ chấm điểm, tài khoản trường (`server/app.ts`); `server/store.ts` lưu vào Firestore hoặc file |
| `api` | Hàm serverless cho Vercel, sinh bằng `npm run build:api` |
| `firestore.rules`, `security_spec.md` | Quy tắc bảo mật |

Triển khai lên Vercel: `HUONG_DAN_VERCEL.md`. Quy tắc bảo mật Firestore: `DEPLOYMENT_GUIDE.md`.
