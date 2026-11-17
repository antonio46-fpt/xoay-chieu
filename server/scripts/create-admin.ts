/**
 * Tạo tài khoản quản trị đầu tiên.
 *
 *   ADMIN_USERNAME=quantri ADMIN_PASSWORD='...' node scripts/create-admin.ts
 *
 * Không có tài khoản mặc định trong mã nguồn. Mật khẩu do người chạy tự đặt
 * và phải đạt quy tắc độ mạnh. Tài khoản tạo ra có vai super_admin.
 */
import { loadConfig } from '../src/config.ts';
import { getPool, closePool, queryOne, query } from '../src/db.ts';
import { hashPassword, passwordIssues } from '../src/security/password.ts';
import { UsernameSchema } from '../src/validation.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const usernameRaw = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!usernameRaw || !password) {
    throw new Error(
      'Thiếu biến môi trường. Ví dụ:\n' +
        "  ADMIN_USERNAME=quantri ADMIN_PASSWORD='MatKhauManh123' node scripts/create-admin.ts"
    );
  }

  const kiemUsername = UsernameSchema.safeParse(usernameRaw);
  if (!kiemUsername.success) throw new Error('Tên đăng nhập không hợp lệ: ' + kiemUsername.error.issues[0].message);

  const loiMatKhau = passwordIssues(password);
  if (loiMatKhau.length > 0) throw new Error(loiMatKhau.join(' '));

  const db = getPool(config.DATABASE_URL);
  const username = kiemUsername.data;

  const daCo = await queryOne<{ id: string }>(db, `select id from users where username = $1`, [username]);
  if (daCo) throw new Error('Tên đăng nhập đã tồn tại: ' + username);

  const hash = await hashPassword(password);
  const ketQua = await query<{ id: string }>(
    db,
    `insert into users (username, password_hash, role, phai_doi_mat_khau)
     values ($1, $2, 'super_admin', false) returning id`,
    [username, hash]
  );

  await query(
    db,
    `insert into audit_log (actor_id, hanh_dong, doi_tuong, doi_tuong_id, du_lieu)
     values (null, 'admin.bootstrap', 'user', $1, $2)`,
    [ketQua[0].id, JSON.stringify({ username, role: 'super_admin' })]
  );

  console.log('Đã tạo tài khoản quản trị: ' + username);
  console.log('Vai: super_admin. Đăng nhập tại /admin/login');
  await closePool();
}

main().catch(async loi => {
  console.error('Không tạo được tài khoản: ' + (loi instanceof Error ? loi.message : String(loi)));
  await closePool().catch(() => undefined);
  process.exit(1);
});
