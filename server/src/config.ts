/**
 * Cấu hình đọc từ biến môi trường. Không có giá trị mặc định cho bí mật.
 * Thiếu biến bắt buộc thì tiến trình dừng ngay, không chạy với cấu hình sai.
 */
import { z } from 'zod';

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'Thiếu DATABASE_URL'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET phải dài ít nhất 32 ký tự'),
  SESSION_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  TRUST_PROXY: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

export type AppConfig = z.infer<typeof Schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const ketQua = Schema.safeParse(env);
  if (!ketQua.success) {
    const chiTiet = ketQua.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error('Cấu hình không hợp lệ:\n' + chiTiet);
  }
  return ketQua.data;
}
