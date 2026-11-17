/**
 * Nghiệp vụ phiên đăng nhập và đăng nhập.
 *
 * Quy tắc bảo mật đang áp dụng:
 *   - Sai tài khoản và sai mật khẩu trả về CÙNG một thông báo, để không dò
 *     được tài khoản nào tồn tại.
 *   - Sai quá số lần cho phép thì khoá tạm, mốc khoá cố định (không kéo dài
 *     khi tiếp tục thử).
 *   - Phiên lưu băm token; thu hồi bằng cách đặt thu_hoi_luc.
 */
import type pg from 'pg';
import { query, queryOne } from '../db.ts';
import { hashPassword, verifyPassword } from '../security/password.ts';
import { hashToken, newSessionToken } from '../security/token.ts';
import type { Vai } from '../policy.ts';

export type NguoiDung = {
  id: string;
  username: string;
  role: Vai;
  student_id: string | null;
  dang_hoat_dong: boolean;
  phai_doi_mat_khau: boolean;
  so_lan_sai: number;
  khoa_den: Date | null;
};

const COT_NGUOI_DUNG = `id, username, password_hash, role, student_id,
  dang_hoat_dong, phai_doi_mat_khau, so_lan_sai, khoa_den`;

export async function timNguoiDungTheoUsername(
  db: pg.Pool,
  username: string
): Promise<(NguoiDung & { password_hash: string }) | null> {
  return queryOne<NguoiDung & { password_hash: string }>(
    db,
    `select ${COT_NGUOI_DUNG}, password_hash from users where username = $1`,
    [username]
  );
}

export type KetQuaDangNhap =
  | { ok: true; token: string; nguoiDung: NguoiDung }
  | { ok: false; code: 'SAI_THONG_TIN' | 'BI_KHOA' | 'TAM_KHOA'; khoaDen?: Date };

export async function dangNhap(
  db: pg.Pool,
  username: string,
  matKhau: string,
  soLanSaiToiDa: number,
  phutKhoa: number,
  gioPhien: number,
  ip: string | null,
  userAgent: string | null
): Promise<KetQuaDangNhap> {
  const nguoiDung = await timNguoiDungTheoUsername(db, username);

  // Không có tài khoản: vẫn băm một chuỗi giả để thời gian phản hồi tương đương,
  // tránh lộ tài khoản nào tồn tại.
  if (!nguoiDung) {
    await hashPassword('khong-ton-tai-' + matKhau).catch(() => undefined);
    return { ok: false, code: 'SAI_THONG_TIN' };
  }

  if (nguoiDung.khoa_den && nguoiDung.khoa_den.getTime() > Date.now()) {
    return { ok: false, code: 'TAM_KHOA', khoaDen: nguoiDung.khoa_den };
  }

  if (!nguoiDung.dang_hoat_dong) {
    return { ok: false, code: 'BI_KHOA' };
  }

  const khop = await verifyPassword(nguoiDung.password_hash, matKhau);

  if (!khop) {
    const saiMoi = nguoiDung.so_lan_sai + 1;
    if (saiMoi >= soLanSaiToiDa) {
      await query(
        db,
        `update users set so_lan_sai = 0, khoa_den = now() + ($2 || ' minutes')::interval,
           cap_nhat_luc = now() where id = $1`,
        [nguoiDung.id, String(phutKhoa)]
      );
      return { ok: false, code: 'TAM_KHOA' };
    }
    await query(db, `update users set so_lan_sai = $2, cap_nhat_luc = now() where id = $1`, [
      nguoiDung.id,
      saiMoi
    ]);
    return { ok: false, code: 'SAI_THONG_TIN' };
  }

  await query(
    db,
    `update users set so_lan_sai = 0, khoa_den = null, dang_nhap_cuoi = now(),
       cap_nhat_luc = now() where id = $1`,
    [nguoiDung.id]
  );

  const token = newSessionToken();
  await query(
    db,
    `insert into sessions (user_id, token_hash, ip, user_agent, het_han)
     values ($1, $2, $3, $4, now() + ($5 || ' hours')::interval)`,
    [nguoiDung.id, hashToken(token), ip, userAgent, String(gioPhien)]
  );

  const { password_hash: _bo, ...sach } = nguoiDung;
  return { ok: true, token, nguoiDung: sach };
}

export type PhienHopLe = {
  sessionId: string;
  user: NguoiDung;
  student: { id: string; ma: string; truong: string; lop: string } | null;
};

export async function docPhien(db: pg.Pool, token: string): Promise<PhienHopLe | null> {
  const rows = await query<{
    session_id: string;
    id: string;
    username: string;
    role: Vai;
    student_id: string | null;
    dang_hoat_dong: boolean;
    phai_doi_mat_khau: boolean;
    so_lan_sai: number;
    khoa_den: Date | null;
    ma: string | null;
    truong: string | null;
    lop: string | null;
  }>(
    db,
    `select s.id as session_id, u.id, u.username, u.role, u.student_id,
            u.dang_hoat_dong, u.phai_doi_mat_khau, u.so_lan_sai, u.khoa_den,
            st.ma, sc.ten as truong, c.ten as lop
       from sessions s
       join users u on u.id = s.user_id
       left join students st on st.id = u.student_id
       left join schools sc on sc.id = st.school_id
       left join classes c on c.id = st.class_id
      where s.token_hash = $1
        and s.thu_hoi_luc is null
        and s.het_han > now()
        and u.dang_hoat_dong
      limit 1`,
    [hashToken(token)]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    sessionId: row.session_id,
    user: {
      id: row.id,
      username: row.username,
      role: row.role,
      student_id: row.student_id,
      dang_hoat_dong: row.dang_hoat_dong,
      phai_doi_mat_khau: row.phai_doi_mat_khau,
      so_lan_sai: row.so_lan_sai,
      khoa_den: row.khoa_den
    },
    student:
      row.student_id && row.ma
        ? { id: row.student_id, ma: row.ma, truong: row.truong ?? '', lop: row.lop ?? '' }
        : null
  };
}

export async function thuHoiPhien(db: pg.Pool, token: string): Promise<void> {
  await query(
    db,
    `update sessions set thu_hoi_luc = now() where token_hash = $1 and thu_hoi_luc is null`,
    [hashToken(token)]
  );
}

export async function thuHoiMoiPhienCua(db: pg.Pool, userId: string): Promise<void> {
  await query(db, `update sessions set thu_hoi_luc = now() where user_id = $1 and thu_hoi_luc is null`, [
    userId
  ]);
}
