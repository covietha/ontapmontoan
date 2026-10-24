/**
 * Chạy trên máy: Express + Vite (npm run dev) hoặc phục vụ thư mục dist (production).
 * Trên Vercel, mã máy chủ được đóng gói thành api/index.js (xem scripts/build-api.mjs).
 */
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app';

export { createExpressApp };

async function startServer() {
  const app = await createExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    // Mỗi menu có địa chỉ riêng (/baihoc, /tongquan...): trả về trang ứng dụng để nó tự mở đúng menu
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.resolve('dist', 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[THPT Trần Hưng Đạo] Máy chủ chấm thi và giao diện chạy tại http://0.0.0.0:${PORT}`);
  });
}

// Chỉ mở cổng khi chạy trực tiếp (không phải khi được import trong kiểm thử)
if (process.env.NODE_ENV !== 'test_runner') {
  startServer();
}
