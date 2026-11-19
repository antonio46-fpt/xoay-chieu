/**
 * API quản trị.
 *
 * Mọi route ở đây kiểm tra quyền ở server. Ẩn nút trên giao diện không phải
 * là bảo mật: người dùng tự gọi được API bằng curl.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { can, type Quyen } from '../policy.ts';
import { CreateStudentSchema, PaginationSchema, ContentSchema } from '../validation.ts';
import { docTatCa, docMotTuan, luuTuan, khoiPhucMacDinh } from '../content/store.ts';
import { hashPassword } from '../security/password.ts';
import { query, queryOne, transaction } from '../db.ts';
import { phienHienTai, type PhuThuocRoute } from '../auth/routes.ts';
import { thuHoiMoiPhienCua } from '../auth/service.ts';

type PhienDayDu = NonNullable<Awaited<ReturnType<typeof phienHienTai>>>;

/** Trả về phiên nếu có đủ quyền; nếu không thì đã gửi lỗi và trả null. */
async function canQuyen(
  request: FastifyRequest,
  reply: FastifyReply,
  db: pg.Pool,
  quyen: Quyen
): Promise<PhienDayDu | null> {
  const phien = await phienHienTai(request, db);
  if (!phien) {
    reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });
    return null;
  }
  if (!can(phien.user.role, quyen)) {
    reply.code(403).send({ error: 'KHONG_DU_QUYEN', message: 'Tài khoản không có quyền cho thao tác này.' });
    return null;
  }
  // Tài khoản học sinh không bao giờ được đi tiếp trong khu vực quản trị,
  // kể cả khi bảng quyền bị cấu hình sai.
  if (phien.user.role === 'student') {
    reply.code(403).send({ error: 'KHONG_DU_QUYEN', message: 'Khu vực quản trị không dành cho học sinh.' });
    return null;
  }
  return phien;
}

async function ghiNhatKy(
  db: pg.Pool,
  actorId: string,
  hanhDong: string,
  doiTuong: string,
  doiTuongId: string | null,
  duLieu: Record<string, unknown>,
  ip: string | null
): Promise<void> {
  await query(
    db,
    `insert into audit_log (actor_id, hanh_dong, doi_tuong, doi_tuong_id, du_lieu, ip)
     values ($1, $2, $3, $4, $5, $6)`,
    [actorId, hanhDong, doiTuong, doiTuongId, JSON.stringify(duLieu), ip]
  );
}

export async function adminRoutes(app: FastifyInstance, opts: PhuThuocRoute): Promise<void> {
  const { db } = opts;

  // ------------------------------------------------------- tổng quan
  app.get('/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'student.manage'))) return;

    const [dem] = await query<{
      so_truong: string;
      so_lop: string;
      so_hoc_sinh: string;
      so_dang_hoat_dong: string;
      so_bi_khoa: string;
      so_bai_nop: string;
      so_hoan_thanh: string;
      chua_bat_dau: string;
      hom_nay: string;
      tuan_nay: string;
    }>(
      db,
      `select
         (select count(*) from schools)::text as so_truong,
         (select count(*) from classes)::text as so_lop,
         (select count(*) from students)::text as so_hoc_sinh,
         (select count(*) from users where role = 'student' and dang_hoat_dong)::text as so_dang_hoat_dong,
         (select count(*) from users where role = 'student' and not dang_hoat_dong)::text as so_bi_khoa,
         (select count(*) from submissions)::text as so_bai_nop,
         (select count(*) from (
            select student_id from progress group by student_id having count(*) = 4
          ) x)::text as so_hoan_thanh,
         (select count(*) from students st
           where not exists (select 1 from progress p where p.student_id = st.id))::text as chua_bat_dau,
         (select count(*) from submissions
           where nhan_luc >= date_trunc('day', now()))::text as hom_nay,
         (select count(*) from submissions
           where nhan_luc >= now() - interval '7 days')::text as tuan_nay`
    );

    const theo_tuan = await query<{ tuan: number; so_bai: string; so_hs: string }>(
      db,
      `select tuan, count(*)::text as so_bai, count(distinct student_id)::text as so_hs
         from submissions group by tuan order by tuan`
    );

    const theo_lop = await query<{ lop: string; truong: string; so_bai: string }>(
      db,
      `select c.ten as lop, s.ten as truong, count(sub.id)::text as so_bai
         from classes c
         join schools s on s.id = c.school_id
         left join submissions sub on sub.class_id = c.id
        group by c.id, c.ten, s.ten
        order by s.ten, c.ten`
    );

    return reply.send({
      tongQuan: {
        soTruong: Number(dem.so_truong),
        soLop: Number(dem.so_lop),
        soHocSinh: Number(dem.so_hoc_sinh),
        soDangHoatDong: Number(dem.so_dang_hoat_dong),
        soBiKhoa: Number(dem.so_bi_khoa),
        soBaiNop: Number(dem.so_bai_nop),
        soHoanThanh4Tuan: Number(dem.so_hoan_thanh),
        chuaBatDau: Number(dem.chua_bat_dau),
        baiNopHomNay: Number(dem.hom_nay),
        baiNop7Ngay: Number(dem.tuan_nay),
        tyLeHoanThanh:
          Number(dem.so_hoc_sinh) > 0
            ? Math.round((Number(dem.so_hoan_thanh) / Number(dem.so_hoc_sinh)) * 100)
            : 0
      },
      theoTuan: theo_tuan.map(row => ({
        tuan: row.tuan,
        soBai: Number(row.so_bai),
        soHocSinh: Number(row.so_hs)
      })),
      theoLop: theo_lop.map(row => ({ lop: row.lop, truong: row.truong, soBai: Number(row.so_bai) }))
    });
  });

  // ------------------------------------------------------- danh sách lớp
  app.get('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'student.manage'))) return;

    const rows = await query<{ id: string; ten: string; truong: string; so_hs: string }>(
      db,
      `select c.id, c.ten, s.ten as truong,
              (select count(*) from students st where st.class_id = c.id)::text as so_hs
         from classes c
         join schools s on s.id = c.school_id
        order by s.ten, c.ten`
    );

    return reply.send({
      items: rows.map(r => ({ id: r.id, ten: r.ten, truong: r.truong, soHocSinh: Number(r.so_hs) }))
    });
  });

  // -------------------------------------------------- danh sách học sinh
  app.get('/students', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'student.manage'))) return;

    const daKiem = PaginationSchema.safeParse(request.query);
    if (!daKiem.success) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Tham số lọc không hợp lệ.' });
    }
    const { page, pageSize, q, schoolId, classId, status, tienDo } = daKiem.data;
    const dieuKien: string[] = [];
    const thamSo: unknown[] = [];

    if (q) {
      thamSo.push(`%${q.toLowerCase()}%`);
      dieuKien.push(`(lower(u.username) like $${thamSo.length} or lower(st.ma) like $${thamSo.length})`);
    }
    if (schoolId) {
      thamSo.push(schoolId);
      dieuKien.push(`st.school_id = $${thamSo.length}`);
    }
    if (classId) {
      thamSo.push(classId);
      dieuKien.push(`st.class_id = $${thamSo.length}`);
    }
    if (status === 'active') dieuKien.push('u.dang_hoat_dong');
    if (status === 'locked') dieuKien.push('not u.dang_hoat_dong');

    // Lọc theo số tuần đã nộp: 0 = chưa bắt đầu, 4 = hoàn thành, còn lại = đang làm.
    const soTuan = '(select count(*) from progress p where p.student_id = st.id)';
    if (tienDo === 'new') dieuKien.push(`${soTuan} = 0`);
    if (tienDo === 'doing') dieuKien.push(`${soTuan} between 1 and 3`);
    if (tienDo === 'done') dieuKien.push(`${soTuan} = 4`);

    const where = dieuKien.length ? 'where ' + dieuKien.join(' and ') : '';
    thamSo.push(pageSize, (page - 1) * pageSize);

    const rows = await query<{
      id: string;
      username: string;
      ma: string;
      truong: string;
      lop: string;
      dang_hoat_dong: boolean;
      phai_doi_mat_khau: boolean;
      dang_nhap_cuoi: Date | null;
      tao_luc: Date;
      so_tuan: string;
      cac_tuan: number[] | null;
      luc_cuoi: Date | null;
    }>(
      db,
      `select u.id, u.username, st.ma, sc.ten as truong, c.ten as lop,
              u.dang_hoat_dong, u.phai_doi_mat_khau, u.dang_nhap_cuoi, u.tao_luc,
              (select count(*) from progress p where p.student_id = st.id)::text as so_tuan,
              array(select p.tuan from progress p where p.student_id = st.id order by p.tuan) as cac_tuan,
              (select max(p.luc) from progress p where p.student_id = st.id) as luc_cuoi
         from users u
         join students st on st.id = u.student_id
         join schools sc on sc.id = st.school_id
         join classes c on c.id = st.class_id
         ${where}
        order by sc.ten, c.ten, st.ma
        limit $${thamSo.length - 1} offset $${thamSo.length}`,
      thamSo
    );

    const [tong] = await query<{ n: string }>(
      db,
      `select count(*)::text as n from users u
         join students st on st.id = u.student_id ${where}`,
      thamSo.slice(0, thamSo.length - 2)
    );

    return reply.send({
      page,
      pageSize,
      total: Number(tong.n),
      items: rows.map(row => ({
        id: row.id,
        username: row.username,
        ma: row.ma,
        truong: row.truong,
        lop: row.lop,
        dangHoatDong: row.dang_hoat_dong,
        phaiDoiMatKhau: row.phai_doi_mat_khau,
        dangNhapCuoi: row.dang_nhap_cuoi,
        taoLuc: row.tao_luc,
        soTuanDaNop: Number(row.so_tuan),
        cacTuan: row.cac_tuan ?? [],
        hoatDongCuoi: row.luc_cuoi
      }))
    });
  });

  // ----------------------------------------------------- tạo học sinh
  app.post('/students', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await canQuyen(request, reply, db, 'student.manage');
    if (!phien) return;

    const daKiem = CreateStudentSchema.safeParse(request.body);
    if (!daKiem.success) {
      return reply.code(400).send({
        error: 'INVALID_INPUT',
        message: 'Dữ liệu không hợp lệ.',
        chiTiet: daKiem.error.issues.map(issue => issue.message)
      });
    }
    const { username, password, ma, schoolId, classId } = daKiem.data;

    const lopThuocTruong = await queryOne<{ id: string }>(
      db,
      `select id from classes where id = $1 and school_id = $2`,
      [classId, schoolId]
    );
    if (!lopThuocTruong) {
      return reply.code(400).send({ error: 'LOP_KHONG_THUOC_TRUONG', message: 'Lớp không thuộc trường đã chọn.' });
    }

    const daTonTai = await queryOne<{ id: string }>(db, `select id from users where username = $1`, [username]);
    if (daTonTai) {
      return reply.code(409).send({ error: 'TRUNG_USERNAME', message: 'Tên đăng nhập đã tồn tại.' });
    }

    const hash = await hashPassword(password);

    const ketQua = await transaction(db, async client => {
      const hocSinh = await client.query<{ id: string }>(
        `insert into students (ma, school_id, class_id) values ($1, $2, $3)
         on conflict (school_id, ma) do update set cap_nhat_luc = now()
         returning id`,
        [ma, schoolId, classId]
      );
      const studentId = hocSinh.rows[0].id;
      const nguoiDung = await client.query<{ id: string }>(
        `insert into users (username, password_hash, role, student_id, phai_doi_mat_khau)
         values ($1, $2, 'student', $3, true) returning id`,
        [username, hash, studentId]
      );
      return { studentId, userId: nguoiDung.rows[0].id };
    });

    await ghiNhatKy(db, phien.user.id, 'student.create', 'student', ketQua.studentId, { username, ma }, request.ip);

    return reply.code(201).send({ id: ketQua.userId, studentId: ketQua.studentId });
  });

  // ------------------------------------------------- đặt lại mật khẩu
  // ------------------------------------------------- nội dung bốn tuần
  app.get('/content', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'content.read'))) return;
    const ds = await docTatCa(db);
    return reply.send({ items: ds });
  });

  app.get('/content/:tuan', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'content.read'))) return;
    const so = Number((request.params as { tuan: string }).tuan);
    if (![1, 2, 3, 4].includes(so)) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Tuần phải từ 1 đến 4.' });
    }
    const muc = await docMotTuan(db, so);
    if (!muc) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Không có nội dung tuần này.' });
    return reply.send(muc);
  });

  app.put('/content/:tuan', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await canQuyen(request, reply, db, 'content.manage');
    if (!phien) return;

    const so = Number((request.params as { tuan: string }).tuan);
    if (![1, 2, 3, 4].includes(so)) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Tuần phải từ 1 đến 4.' });
    }

    const daKiem = ContentSchema.safeParse({ ...(request.body as object), tuan: so });
    if (!daKiem.success) {
      const loiDau = daKiem.error.issues[0];
      return reply.code(400).send({
        error: 'DU_LIEU_KHONG_HOP_LE',
        message: loiDau ? `${loiDau.path.join('.')}: ${loiDau.message}` : 'Nội dung không hợp lệ.'
      });
    }

    await luuTuan(db, so, daKiem.data as never, phien.user.id);
    await ghiNhatKy(db, phien.user.id, 'content.update', 'content', String(so), {}, request.ip);

    const moi = await docMotTuan(db, so);
    return reply.send(moi);
  });

  app.post('/content/:tuan/reset', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await canQuyen(request, reply, db, 'content.manage');
    if (!phien) return;

    const so = Number((request.params as { tuan: string }).tuan);
    if (![1, 2, 3, 4].includes(so)) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Tuần phải từ 1 đến 4.' });
    }

    const goc = await khoiPhucMacDinh(db, so, phien.user.id);
    if (!goc) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Không có bản gốc cho tuần này.' });

    await ghiNhatKy(db, phien.user.id, 'content.reset', 'content', String(so), {}, request.ip);
    const moi = await docMotTuan(db, so);
    return reply.send(moi);
  });

  // ------------------------------------------- danh sách bài nộp 4 tuần
  app.get('/submissions', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'submission.read'))) return;

    const daKiem = PaginationSchema.safeParse(request.query);
    if (!daKiem.success) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Tham số lọc không hợp lệ.' });
    }
    const { page, pageSize, q, classId } = daKiem.data;
    const tuanRaw = (request.query as { tuan?: string }).tuan;
    const tuan = tuanRaw && /^[1-4]$/.test(tuanRaw) ? Number(tuanRaw) : null;

    const dieuKien: string[] = [];
    const thamSo: unknown[] = [];

    if (tuan) {
      thamSo.push(tuan);
      dieuKien.push(`s.tuan = $${thamSo.length}`);
    }
    if (classId) {
      thamSo.push(classId);
      dieuKien.push(`s.class_id = $${thamSo.length}`);
    }
    if (q) {
      thamSo.push(`%${q.toLowerCase()}%`);
      dieuKien.push(`(lower(u.username) like $${thamSo.length} or lower(st.ma) like $${thamSo.length})`);
    }

    const where = dieuKien.length ? 'where ' + dieuKien.join(' and ') : '';
    thamSo.push(pageSize, (page - 1) * pageSize);

    const rows = await query<{
      id: string;
      user_id: string;
      username: string;
      ma: string;
      lop: string;
      truong: string;
      tuan: number;
      nhan_luc: Date;
      thoi_luong_giay: number | null;
      so_lan_dan: number;
      da_che: boolean;
    }>(
      db,
      `select s.id, u.id as user_id, u.username, st.ma, c.ten as lop, sc.ten as truong,
              s.tuan, s.nhan_luc, s.thoi_luong_giay, s.so_lan_dan, s.da_che
         from submissions s
         join students st on st.id = s.student_id
         join users u on u.student_id = st.id
         join classes c on c.id = st.class_id
         join schools sc on sc.id = st.school_id
         ${where}
        order by s.nhan_luc desc
        limit $${thamSo.length - 1} offset $${thamSo.length}`,
      thamSo
    );

    const [tong] = await query<{ n: string }>(
      db,
      `select count(*)::text as n
         from submissions s
         join students st on st.id = s.student_id
         join users u on u.student_id = st.id
         ${where}`,
      thamSo.slice(0, thamSo.length - 2)
    );

    return reply.send({
      page,
      pageSize,
      total: Number(tong.n),
      items: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        ma: r.ma,
        lop: r.lop,
        truong: r.truong,
        tuan: r.tuan,
        nhanLuc: r.nhan_luc,
        thoiLuongGiay: r.thoi_luong_giay,
        soLanDan: r.so_lan_dan,
        daChe: r.da_che
      }))
    });
  });

  // ------------------------------------- xem chi tiết bài làm một học sinh
  app.get('/students/:id/submissions', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'submission.read'))) return;

    const { id } = request.params as { id: string };
    if (!id) return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Thiếu mã học sinh.' });

    const hocSinh = await queryOne<{
      id: string;
      ma: string;
      truong: string;
      lop: string;
      username: string;
      dang_hoat_dong: boolean;
    }>(
      db,
      `select st.id, st.ma, sc.ten as truong, c.ten as lop, u.username, u.dang_hoat_dong
         from users u
         join students st on st.id = u.student_id
         join schools sc on sc.id = st.school_id
         join classes c on c.id = st.class_id
        where u.id = $1 and u.role = 'student'`,
      [id]
    );

    if (!hocSinh) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Không tìm thấy học sinh.' });
    }

    const baiNop = await query<{
      id: string;
      tuan: number;
      nhan_luc: Date;
      bat_dau: Date | null;
      thoi_luong_giay: number | null;
      so_lan_dan: number;
      da_che: boolean;
      thu_lam: string | null;
      nghi_1: string | null;
      nghi_2: string | null;
      nghi_3: string | null;
      noi: string | null;
      dang_san_pham: string | null;
      san_pham: string | null;
      chia_se: string | null;
      tu_danh_gia: string | null;
      phe: string | null;
      doi_hay_giu: string | null;
      kiem_soat: string | null;
      ngoai_kiem_soat: string | null;
    }>(
      db,
      `select id, tuan, nhan_luc, bat_dau, thoi_luong_giay, so_lan_dan, da_che,
              thu_lam, nghi_1, nghi_2, nghi_3, noi, dang_san_pham, san_pham,
              chia_se, tu_danh_gia, phe, doi_hay_giu, kiem_soat, ngoai_kiem_soat
         from submissions
        where student_id = $1
        order by tuan, nhan_luc desc`,
      [hocSinh.id]
    );

    const nhap = await query<{ tuan: number; du_lieu: Record<string, unknown>; revision: number; cap_nhat_luc: Date }>(
      db,
      `select tuan, du_lieu, revision, cap_nhat_luc from drafts where student_id = $1 order by tuan`,
      [hocSinh.id]
    );

    return reply.send({
      hocSinh: {
        id: hocSinh.id,
        ma: hocSinh.ma,
        truong: hocSinh.truong,
        lop: hocSinh.lop,
        username: hocSinh.username,
        dangHoatDong: hocSinh.dang_hoat_dong
      },
      baiNop: baiNop.map(b => ({
        id: b.id,
        tuan: b.tuan,
        nhanLuc: b.nhan_luc,
        batDau: b.bat_dau,
        thoiLuongGiay: b.thoi_luong_giay,
        soLanDan: b.so_lan_dan,
        daChe: b.da_che,
        noiDung: {
          thu_lam: b.thu_lam,
          nghi_1: b.nghi_1,
          nghi_2: b.nghi_2,
          nghi_3: b.nghi_3,
          noi: b.noi,
          dang_san_pham: b.dang_san_pham,
          san_pham: b.san_pham,
          chia_se: b.chia_se,
          tu_danh_gia: b.tu_danh_gia,
          phe: b.phe,
          doi_hay_giu: b.doi_hay_giu,
          kiem_soat: b.kiem_soat,
          ngoai_kiem_soat: b.ngoai_kiem_soat
        }
      })),
      nhap: nhap.map(n => ({ tuan: n.tuan, duLieu: n.du_lieu, revision: n.revision, capNhatLuc: n.cap_nhat_luc }))
    });
  });

  app.post('/students/:id/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await canQuyen(request, reply, db, 'student.manage');
    if (!phien) return;

    const { id } = request.params as { id: string };
    const body = request.body as { password?: unknown };
    if (typeof body?.password !== 'string' || body.password.length < 8) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
    }

    const hash = await hashPassword(body.password);
    const ketQua = await query(
      db,
      `update users set password_hash = $2, phai_doi_mat_khau = true, so_lan_sai = 0,
         khoa_den = null, cap_nhat_luc = now()
        where id = $1 and role = 'student' returning id`,
      [id, hash]
    );
    if (ketQua.length === 0) {
      return reply.code(404).send({ error: 'KHONG_TIM_THAY', message: 'Không tìm thấy tài khoản học sinh.' });
    }

    // Đặt lại mật khẩu phải đăng xuất mọi thiết bị đang dùng.
    await thuHoiMoiPhienCua(db, id);
    await ghiNhatKy(db, phien.user.id, 'student.reset_password', 'user', id, {}, request.ip);

    return reply.send({ ok: true });
  });

  // ------------------------------------------------ khoá / mở khoá
  app.post('/students/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await canQuyen(request, reply, db, 'student.manage');
    if (!phien) return;

    const { id } = request.params as { id: string };
    const body = request.body as { active?: unknown };
    if (typeof body?.active !== 'boolean') {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Trường active phải là true hoặc false.' });
    }

    const ketQua = await query(
      db,
      `update users set dang_hoat_dong = $2, cap_nhat_luc = now()
        where id = $1 and role = 'student' returning id`,
      [id, body.active]
    );
    if (ketQua.length === 0) {
      return reply.code(404).send({ error: 'KHONG_TIM_THAY', message: 'Không tìm thấy tài khoản học sinh.' });
    }

    if (!body.active) await thuHoiMoiPhienCua(db, id);
    await ghiNhatKy(db, phien.user.id, body.active ? 'student.unlock' : 'student.lock', 'user', id, {}, request.ip);

    return reply.send({ ok: true });
  });

  // ------------------------------------------------ phân công nhân sự
  // Gán giáo viên hoặc điều phối viên vào một lớp. Không có phân công thì
  // hai vai đó không xem được gì, kể cả khi tài khoản hợp lệ.
  app.get('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'school.manage'))) return;

    const rows = await query<{
      user_id: string;
      username: string;
      vai: string;
      class_id: string;
      lop: string;
      truong: string;
    }>(
      db,
      `select a.user_id, u.username, a.vai, a.class_id, c.ten as lop, s.ten as truong
         from staff_assignments a
         join users u on u.id = a.user_id
         join classes c on c.id = a.class_id
         join schools s on s.id = c.school_id
        order by s.ten, c.ten, u.username`
    );

    return reply.send({
      items: rows.map(r => ({
        userId: r.user_id,
        username: r.username,
        vai: r.vai,
        classId: r.class_id,
        lop: r.lop,
        truong: r.truong
      }))
    });
  });

  app.post('/assignments', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await canQuyen(request, reply, db, 'school.manage');
    if (!phien) return;

    const body = request.body as { userId?: unknown; classId?: unknown; vai?: unknown };
    const vai = String(body?.vai ?? '');
    if (
      typeof body?.userId !== 'string' ||
      typeof body?.classId !== 'string' ||
      !['teacher', 'coordinator'].includes(vai)
    ) {
      return reply.code(400).send({
        error: 'INVALID_INPUT',
        message: 'Cần userId, classId và vai là teacher hoặc coordinator.'
      });
    }

    try {
      await query(
        db,
        `insert into staff_assignments (user_id, class_id, vai) values ($1, $2, $3)
         on conflict do nothing`,
        [body.userId, body.classId, vai]
      );
    } catch (loi) {
      // Trigger trong CSDL chặn khi vai phân công khác vai tài khoản.
      return reply.code(400).send({ error: 'KHONG_HOP_LE', message: (loi as Error).message });
    }

    await ghiNhatKy(db, phien.user.id, 'staff.assign', 'class', body.classId, { userId: body.userId, vai }, request.ip);
    return reply.code(201).send({ ok: true });
  });

  // ------------------------------------------------------- nhật ký
  app.get('/audit', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await canQuyen(request, reply, db, 'audit.read'))) return;

    const daKiem = PaginationSchema.safeParse(request.query);
    if (!daKiem.success) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Tham số lọc không hợp lệ.' });
    }
    const { page, pageSize } = daKiem.data;

    const rows = await query<{
      id: string;
      luc: Date;
      hanh_dong: string;
      doi_tuong: string | null;
      doi_tuong_id: string | null;
      du_lieu: unknown;
      ip: string | null;
      username: string | null;
    }>(
      db,
      `select a.id, a.luc, a.hanh_dong, a.doi_tuong, a.doi_tuong_id, a.du_lieu, a.ip, u.username
         from audit_log a
         left join users u on u.id = a.actor_id
        order by a.luc desc
        limit $1 offset $2`,
      [pageSize, (page - 1) * pageSize]
    );

    const [tong] = await query<{ n: string }>(db, `select count(*)::text as n from audit_log`);

    return reply.send({
      page,
      pageSize,
      total: Number(tong.n),
      items: rows.map(r => ({
        id: r.id,
        luc: r.luc,
        hanhDong: r.hanh_dong,
        doiTuong: r.doi_tuong,
        doiTuongId: r.doi_tuong_id,
        duLieu: r.du_lieu,
        ip: r.ip,
        nguoiThucHien: r.username
      }))
    });
  });
}
