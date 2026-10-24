// Đóng gói máy chủ Express thành một hàm serverless duy nhất cho Vercel: api/index.js
// Chạy tự động trong `npm run build`. File đầu ra được commit để Vercel luôn có sẵn.
import { build } from 'esbuild';

await build({
  entryPoints: ['server/vercel.ts'],
  outfile: 'api/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external', // các thư viện được Vercel cài từ package.json
  banner: { js: '// Tệp sinh tự động từ server/ bằng scripts/build-api.mjs. Không sửa tay.' },
  logLevel: 'info'
});
