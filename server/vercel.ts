import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from './app';

let appPromise: ReturnType<typeof createExpressApp> | null = null;

/** Điểm vào của hàm serverless trên Vercel: dùng lại một ứng dụng Express cho các lần gọi kế tiếp. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appPromise ??= createExpressApp();
  const app = await appPromise;
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
