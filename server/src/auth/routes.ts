/**
 * API xác thực.
 *
 * Cookie phiên là httpOnly, sameSite=lax, chỉ secure khi chạy production.
 * Không trả token trong thân phản hồi — trình duyệt không bao giờ đọc được nó
 * bằng JavaScript, nên một lỗ hổng XSS cũng không lấy được phiên.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import type { AppConfig } from '../config.ts';
import { COOKIE_NAME } from '../security/token.ts';
import { LoginSchema } from '../validation.ts';
import { dangNhap, docPhien, thuHoiPhien } from './service.ts';

export type PhuThuocRoute = { db: pg.Pool; config: AppConfig };

/** Đọc phiên hiện tại từ cookie. Trả null nếu không có hoặc đã hết hạn. */
export async function phienHienTai(request: FastifyRequest, db: pg.Pool) {
  const token = request.cookies?.[COOKIE_NAME];
  if (!token) return null;
  return docPhien(db, token);
}

export async function authRoutes(app: FastifyInstance, opts: PhuThuocRoute): Promise<void> {
  const { db, config } = opts;

  app.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const daKiem = LoginSchema.safeParse(request.body);
      if (!daKiem.success) {
        return reply.code(400).send({
          error: 'INVALID_INPUT',
          message: 'Tên đăng nhập hoặc mật khẩu không hợp lệ.'
        });
      }

      const { username, password } = daKiem.data;
      const ketQua = await dangNhap(
        db,
        username,
        password,
        8,
        15,
        config.SESSION_HOURS,
        request.ip,
        request.headers['user-agent'] ?? null
      );

      if (!ketQua.ok) {
        if (ketQua.code === 'TAM_KHOA') {
          return reply.code(423).send({
            error: 'TAM_KHOA',
            message: 'Tài khoản tạm khoá do đăng nhập sai nhiều lần. Vui lòng thử lại sau.'
          });
        }
        if (ketQua.code === 'BI_KHOA') {
          return reply.code(403).send({
            error: 'BI_KHOA',
            message: 'Tài khoản đã bị khoá. Liên hệ giáo viên hoặc quản trị viên.'
          });
        }
        return reply.code(401).send({
          error: 'SAI_THONG_TIN',
          message: 'Tên đăng nhập hoặc mật khẩu không đúng.'
        });
      }

      reply.setCookie(COOKIE_NAME, ketQua.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.NODE_ENV === 'production',
        path: '/',
        maxAge: config.SESSION_HOURS * 3600
      });

      const phien = await docPhien(db, ketQua.token);
      return reply.send({
        user: {
          username: ketQua.nguoiDung.username,
          role: ketQua.nguoiDung.role,
          phaiDoiMatKhau: ketQua.nguoiDung.phai_doi_mat_khau
        },
        student: phien?.student ?? null
      });
    }
  );

  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (token) await thuHoiPhien(db, token);
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await phienHienTai(request, db);
    if (!phien) {
      return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });
    }
    return reply.send({
      user: {
        username: phien.user.username,
        role: phien.user.role,
        phaiDoiMatKhau: phien.user.phai_doi_mat_khau
      },
      student: phien.student
    });
  });
}
