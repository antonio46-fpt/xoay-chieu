/**
 * Lắp ráp ứng dụng Fastify.
 *
 * Tách khỏi server.ts để test có thể dựng app mà không cần mở cổng.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { AppConfig } from './config.ts';
import { closePool, getPool } from './db.ts';
import { authRoutes } from './auth/routes.ts';
import { studentRoutes } from './routes/student.ts';
import { adminRoutes } from './routes/admin.ts';
import { importRoutes } from './routes/importExport.ts';
import { staffRoutes } from './routes/staff.ts';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: config.TRUST_PROXY,
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      // Không bao giờ ghi cookie hay mật khẩu vào log.
      redact: ['req.headers.cookie', 'req.headers.authorization', 'body.password']
    }
  });

  const db = getPool(config.DATABASE_URL);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' }
  });

  await app.register(cookie, { secret: config.COOKIE_SECRET });

  // Frontend chạy khác cổng khi phát triển, nên cần CORS kèm credentials.
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map(item => item.trim()),
    credentials: true
  });

  await app.register(rateLimit, {
    // Bộ kiểm thử đăng nhập nhiều lần liên tiếp nên dùng hạn mức rộng hơn.
    max: config.NODE_ENV === 'test' ? 10000 : 120,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'QUA_NHIEU_YEU_CAU',
      message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
    })
  });

  app.get('/api/health', async () => {
    const batDau = Date.now();
    let dbOk = false;
    try {
      await db.query('select 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      ok: dbOk,
      database: dbOk ? 'ok' : 'unreachable',
      uptimeGiay: Math.round(process.uptime()),
      doTreMs: Date.now() - batDau
    };
  });

  await app.register(authRoutes, { prefix: '/api/auth', db, config });
  await app.register(studentRoutes, { prefix: '/api/me', db, config });
  await app.register(adminRoutes, { prefix: '/api/admin', db, config });
  await app.register(importRoutes, { prefix: '/api/admin', db, config });
  await app.register(staffRoutes, { prefix: '/api/staff', db, config });

  // Phản hồi lỗi thống nhất. Không lộ stack trace ra ngoài khi production.
  app.setErrorHandler((loi: Error & { statusCode?: number }, request, reply) => {
    request.log.error({ err: loi }, 'Lỗi xử lý yêu cầu');
    const ma = loi.statusCode ?? 500;
    return reply.code(ma).send({
      error: ma === 500 ? 'LOI_MAY_CHU' : 'LOI_YEU_CAU',
      message:
        ma === 500 && config.NODE_ENV === 'production'
          ? 'Máy chủ gặp lỗi. Vui lòng thử lại.'
          : loi.message
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: 'KHONG_TIM_THAY', message: 'Đường dẫn không tồn tại.' })
  );

  app.addHook('onClose', async () => {
    await closePool();
  });

  return app;
}
