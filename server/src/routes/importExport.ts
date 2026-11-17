/**
 * Nhập danh sách học sinh từ CSV và xuất dữ liệu.
 *
 * Nhập theo hai bước: xem trước rồi mới ghi. Bước xem trước không chạm cơ sở
 * dữ liệu, nên Admin thấy hết lỗi từng dòng trước khi quyết định.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { query, queryOne, transaction } from '../db.ts';
import { can } from '../policy.ts';
import { phienHienTai, type PhuThuocRoute } from '../auth/routes.ts';
import { hashPassword } from '../security/password.ts';
import { docCsv, ghiCsv, matKhauNgauNhien } from '../lib/csv.ts';
import { MaHocSinhSchema, UsernameSchema } from '../validation.ts';

type DongLoi = { dong: number; loi: string };
type DongHopLe = {
  dong: number;
  ma: string;
  username: string;
  truong: string;
  lop: string;
  schoolId: string;
  classId: string;
  matKhau?: string;
};

const COT_BAT_BUOC = ['ma', 'username', 'truong', 'lop'];

async function kiemTraQuyen(
  request: FastifyRequest,
  reply: FastifyReply,
  db: pg.Pool,
  quyen: 'student.manage' | 'submission.export'
) {
  const phien = await phienHienTai(request, db);
  if (!phien) {
    reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });
    return null;
  }
  if (phien.user.role === 'student' || !can(phien.user.role, quyen)) {
    reply.code(403).send({ error: 'KHONG_DU_QUYEN', message: 'Tài khoản không có quyền cho thao tác này.' });
    return null;
  }
  return phien;
}

/**
 * Kiểm tra một tệp CSV, trả về danh sách dòng hợp lệ và dòng lỗi.
 * Hàm thuần: không ghi gì vào cơ sở dữ liệu.
 */
async function soatCsv(db: pg.Pool, vanBan: string) {
  const { tieuDe, dong } = docCsv(vanBan);
  const thieu = COT_BAT_BUOC.filter(cot => !tieuDe.includes(cot));
  if (thieu.length > 0) {
    return { loiTep: 'Thiếu cột: ' + thieu.join(', '), hopLe: [] as DongHopLe[], loi: [] as DongLoi[] };
  }

  const chiSo = (ten: string) => tieuDe.indexOf(ten);
  const truong = await query<{ id: string; ma: string; ten: string }>(db, `select id, ma, ten from schools`);
  const lop = await query<{ id: string; school_id: string; ma: string; ten: string }>(
    db,
    `select id, school_id, ma, ten from classes`
  );
  const daCoUsername = new Set(
    (await query<{ username: string }>(db, `select username from users`)).map(r => r.username)
  );
  const daCoMa = new Set(
    (await query<{ ma: string; school_id: string }>(db, `select ma, school_id from students`)).map(
      r => r.school_id + '|' + r.ma
    )
  );

  const hopLe: DongHopLe[] = [];
  const loi: DongLoi[] = [];
  const seenUsername = new Set<string>();
  const seenMa = new Set<string>();

  for (let i = 0; i < dong.length; i += 1) {
    const soDong = i + 2; // +2 vì dòng 1 là tiêu đề
    const hang = dong[i];
    const lay = (ten: string) => (hang[chiSo(ten)] ?? '').trim();

    const ma = lay('ma');
    const usernameRaw = lay('username').toLowerCase();
    const tenTruong = lay('truong');
    const tenLop = lay('lop');

    if (!ma) {
      loi.push({ dong: soDong, loi: 'Thiếu mã học sinh' });
      continue;
    }
    if (!MaHocSinhSchema.safeParse(ma).success) {
      loi.push({ dong: soDong, loi: 'Mã học sinh sai định dạng: ' + ma });
      continue;
    }
    const kiemUsername = UsernameSchema.safeParse(usernameRaw);
    if (!kiemUsername.success) {
      loi.push({ dong: soDong, loi: 'Tên đăng nhập không hợp lệ: ' + usernameRaw });
      continue;
    }
    const username = kiemUsername.data;

    const truongKhop = truong.find(
      t => t.ma.toLowerCase() === tenTruong.toLowerCase() || t.ten.toLowerCase() === tenTruong.toLowerCase()
    );
    if (!truongKhop) {
      loi.push({ dong: soDong, loi: 'Không tìm thấy trường: ' + tenTruong });
      continue;
    }
    const lopKhop = lop.find(
      l =>
        l.school_id === truongKhop.id &&
        (l.ma.toLowerCase() === tenLop.toLowerCase() || l.ten.toLowerCase() === tenLop.toLowerCase())
    );
    if (!lopKhop) {
      loi.push({ dong: soDong, loi: 'Không tìm thấy lớp ' + tenLop + ' trong trường ' + truongKhop.ma });
      continue;
    }
    if (seenUsername.has(username) || daCoUsername.has(username)) {
      loi.push({ dong: soDong, loi: 'Tên đăng nhập đã tồn tại: ' + username });
      continue;
    }
    const khoaMa = truongKhop.id + '|' + ma;
    if (seenMa.has(khoaMa) || daCoMa.has(khoaMa)) {
      loi.push({ dong: soDong, loi: 'Mã học sinh đã có trong trường này: ' + ma });
      continue;
    }

    seenUsername.add(username);
    seenMa.add(khoaMa);
    hopLe.push({
      dong: soDong,
      ma,
      username,
      truong: truongKhop.ten,
      lop: lopKhop.ten,
      schoolId: truongKhop.id,
      classId: lopKhop.id
    });
  }

  return { loiTep: null as string | null, hopLe, loi };
}

export async function importRoutes(app: FastifyInstance, opts: PhuThuocRoute): Promise<void> {
  const { db } = opts;

  // ---------------------------------------------------- xem trước
  app.post('/import/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await kiemTraQuyen(request, reply, db, 'student.manage'))) return;

    const body = request.body as { csv?: unknown };
    if (typeof body?.csv !== 'string' || body.csv.trim() === '') {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Chưa gửi nội dung CSV.' });
    }

    const ketQua = await soatCsv(db, body.csv);
    if (ketQua.loiTep) {
      return reply.code(400).send({ error: 'TEP_KHONG_HOP_LE', message: ketQua.loiTep });
    }

    return reply.send({
      tongSo: ketQua.hopLe.length + ketQua.loi.length,
      hopLe: ketQua.hopLe.length,
      loi: ketQua.loi.length,
      danhSachLoi: ketQua.loi.slice(0, 200),
      xemTruoc: ketQua.hopLe.slice(0, 50).map(d => ({
        dong: d.dong,
        ma: d.ma,
        username: d.username,
        truong: d.truong,
        lop: d.lop
      }))
    });
  });

  // -------------------------------------------------------- ghi
  app.post('/import/commit', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await kiemTraQuyen(request, reply, db, 'student.manage'))) return;

    const body = request.body as { csv?: unknown };
    if (typeof body?.csv !== 'string' || body.csv.trim() === '') {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Chưa gửi nội dung CSV.' });
    }

    const ketQua = await soatCsv(db, body.csv);
    if (ketQua.loiTep) {
      return reply.code(400).send({ error: 'TEP_KHONG_HOP_LE', message: ketQua.loiTep });
    }
    if (ketQua.loi.length > 0) {
      return reply.code(400).send({
        error: 'CON_DONG_LOI',
        message: 'Còn ' + ketQua.loi.length + ' dòng lỗi. Sửa hết rồi mới nhập.',
        danhSachLoi: ketQua.loi.slice(0, 200)
      });
    }
    if (ketQua.hopLe.length === 0) {
      return reply.code(400).send({ error: 'KHONG_CO_DONG', message: 'Tệp không có dòng hợp lệ nào.' });
    }

    // Mật khẩu chỉ hiện đúng một lần trong phản hồi này, không lưu dạng thô.
    const capTaiKhoan: { ma: string; username: string; matKhau: string; lop: string; truong: string }[] = [];

    await transaction(db, async client => {
      for (const d of ketQua.hopLe) {
        const matKhau = matKhauNgauNhien(10);
        const hash = await hashPassword(matKhau);

        const hs = await client.query<{ id: string }>(
          `insert into students (ma, school_id, class_id) values ($1, $2, $3) returning id`,
          [d.ma, d.schoolId, d.classId]
        );
        await client.query(
          `insert into users (username, password_hash, role, student_id, phai_doi_mat_khau)
           values ($1, $2, 'student', $3, true)`,
          [d.username, hash, hs.rows[0].id]
        );
        capTaiKhoan.push({
          ma: d.ma,
          username: d.username,
          matKhau,
          lop: d.lop,
          truong: d.truong
        });
      }

      await client.query(
        `insert into audit_log (actor_id, hanh_dong, doi_tuong, du_lieu, ip)
         values ($1, 'students.import', 'user', $2, $3)`,
        [null, JSON.stringify({ soLuong: capTaiKhoan.length }), null]
      );
    });

    return reply.code(201).send({
      soLuong: capTaiKhoan.length,
      taiKhoan: capTaiKhoan
    });
  });

  // ------------------------------------------- xuất danh sách tài khoản
  app.get('/export/students', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await kiemTraQuyen(request, reply, db, 'student.manage'))) return;

    const rows = await query<{
      username: string;
      ma: string;
      truong: string;
      lop: string;
      dang_hoat_dong: boolean;
      tao_luc: Date;
      so_tuan: string;
    }>(
      db,
      `select u.username, st.ma, sc.ten as truong, c.ten as lop, u.dang_hoat_dong, u.tao_luc,
              (select count(*) from progress p where p.student_id = st.id)::text as so_tuan
         from users u
         join students st on st.id = u.student_id
         join schools sc on sc.id = st.school_id
         join classes c on c.id = st.class_id
        where u.role = 'student'
        order by sc.ten, c.ten, st.ma`
    );

    const csv = ghiCsv(
      ['username', 'ma', 'truong', 'lop', 'trang_thai', 'so_tuan_da_nop', 'tao_luc'],
      rows.map(r => [
        r.username,
        r.ma,
        r.truong,
        r.lop,
        r.dang_hoat_dong ? 'hoat_dong' : 'bi_khoa',
        r.so_tuan,
        r.tao_luc.toISOString()
      ])
    );

    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', 'attachment; filename="hoc-sinh.csv"');
    return reply.send(csv);
  });

  // -------------------------------------------------- xuất bài nộp
  app.get('/export/submissions', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await kiemTraQuyen(request, reply, db, 'submission.export'))) return;

    const q = request.query as { tuan?: string; classId?: string };
    const dieuKien: string[] = [];
    const thamSo: unknown[] = [];
    if (q.tuan) {
      const tuan = Number(q.tuan);
      if (!Number.isInteger(tuan) || tuan < 1 || tuan > 4) {
        return reply.code(400).send({ error: 'TUAN_KHONG_HOP_LE', message: 'Tuần phải từ 1 đến 4.' });
      }
      thamSo.push(tuan);
      dieuKien.push(`s.tuan = $${thamSo.length}`);
    }
    if (q.classId) {
      thamSo.push(q.classId);
      dieuKien.push(`s.class_id = $${thamSo.length}`);
    }
    const where = dieuKien.length ? 'where ' + dieuKien.join(' and ') : '';

    const rows = await query<Record<string, string | null>>(
      db,
      `select sub.ma, sc.ten as truong, c.ten as lop, s.tuan, s.nhan_luc,
              s.thu_lam, s.nghi_1, s.nghi_2, s.nghi_3, s.noi, s.dang_san_pham, s.san_pham,
              s.chia_se, s.tu_danh_gia, s.phe, s.doi_hay_giu, s.kiem_soat,
              s.ngoai_kiem_soat, s.da_che
         from submissions s
         join students sub on sub.id = s.student_id
         join schools sc on sc.id = s.school_id
         join classes c on c.id = s.class_id
         ${where}
        order by sc.ten, c.ten, sub.ma, s.tuan`,
      thamSo
    );

    const tieuDe = [
      'ma', 'truong', 'lop', 'tuan', 'nhan_luc', 'thu_lam', 'nghi_1', 'nghi_2', 'nghi_3',
      'noi', 'dang_san_pham', 'san_pham', 'chia_se', 'tu_danh_gia', 'phe', 'doi_hay_giu',
      'kiem_soat', 'ngoai_kiem_soat', 'da_che'
    ];
    const csv = ghiCsv(tieuDe, rows.map(r => tieuDe.map(cot => r[cot] ?? '')));

    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', 'attachment; filename="bai-nop.csv"');
    return reply.send(csv);
  });
}

export { soatCsv };
