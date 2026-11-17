/**
 * API cho giáo viên chủ nhiệm và điều phối viên.
 *
 * Ranh giới quyền phải giữ đúng thiết kế nghiên cứu:
 *   - Giáo viên chỉ thấy MÃ và TUẦN ĐÃ NỘP của lớp mình phụ trách.
 *     Không bao giờ trả về nội dung bài viết.
 *   - Điều phối viên ghi phiếu buổi và phiếu đổi ý, cũng không đọc bài.
 *   - Cả hai chỉ chạm được lớp được phân công, kiểm tra ở server.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { query } from '../db.ts';
import { phienHienTai, type PhuThuocRoute } from '../auth/routes.ts';

type Phien = NonNullable<Awaited<ReturnType<typeof phienHienTai>>>;

/** Kiểm tra người dùng có được phân công đúng vai vào lớp này không. */
async function duocPhanCong(
  db: pg.Pool,
  userId: string,
  classId: string,
  vai: 'teacher' | 'coordinator'
): Promise<boolean> {
  const rows = await query<{ ok: number }>(
    db,
    `select 1 as ok from staff_assignments
      where user_id = $1 and class_id = $2 and vai = $3 limit 1`,
    [userId, classId, vai]
  );
  return rows.length > 0;
}

async function layPhien(
  request: FastifyRequest,
  reply: FastifyReply,
  db: pg.Pool
): Promise<Phien | null> {
  const phien = await phienHienTai(request, db);
  if (!phien) {
    reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });
    return null;
  }
  if (phien.user.role === 'student') {
    reply.code(403).send({ error: 'KHONG_DU_QUYEN', message: 'Khu vực này không dành cho học sinh.' });
    return null;
  }
  return phien;
}

export async function staffRoutes(app: FastifyInstance, opts: PhuThuocRoute): Promise<void> {
  const { db } = opts;

  // ------------------------------------------- lớp tôi đang phụ trách
  app.get('/classes', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await layPhien(request, reply, db);
    if (!phien) return;

    const rows = await query<{ class_id: string; lop: string; truong: string; vai: string }>(
      db,
      `select a.class_id, c.ten as lop, s.ten as truong, a.vai
         from staff_assignments a
         join classes c on c.id = a.class_id
         join schools s on s.id = c.school_id
        where a.user_id = $1
        order by s.ten, c.ten`,
      [phien.user.id]
    );

    return reply.send({
      items: rows.map(r => ({ classId: r.class_id, lop: r.lop, truong: r.truong, vai: r.vai }))
    });
  });

  // ------------------------------- tiến trình lớp (không có nội dung bài)
  app.get('/classes/:classId/progress', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await layPhien(request, reply, db);
    if (!phien) return;

    const { classId } = request.params as { classId: string };
    const vai = phien.user.role === 'teacher' ? 'teacher' : 'coordinator';
    if (!(await duocPhanCong(db, phien.user.id, classId, vai))) {
      return reply.code(403).send({
        error: 'KHONG_PHU_TRACH',
        message: 'Bạn không được phân công phụ trách lớp này.'
      });
    }

    // Cố ý chỉ chọn mã và tuần. Không join bảng submissions để không có
    // đường nào trả nội dung bài ra ngoài.
    const rows = await query<{ ma: string; tuan: number[] | null; luc_cuoi: Date | null }>(
      db,
      `select st.ma,
              array_agg(p.tuan order by p.tuan) filter (where p.tuan is not null) as tuan,
              max(p.luc) as luc_cuoi
         from students st
         left join progress p on p.student_id = st.id
        where st.class_id = $1
        group by st.id, st.ma
        order by st.ma`,
      [classId]
    );

    return reply.send({
      classId,
      hocSinh: rows.map(r => ({
        ma: r.ma,
        cacTuan: r.tuan ?? [],
        soTuan: (r.tuan ?? []).length,
        lucCuoi: r.luc_cuoi
      }))
    });
  });

  // --------------------------------------------------- phiếu buổi
  app.post('/session-notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await layPhien(request, reply, db);
    if (!phien) return;

    const body = request.body as Record<string, unknown>;
    const classId = typeof body?.classId === 'string' ? body.classId : '';
    const id = typeof body?.id === 'string' ? body.id : '';
    const tuan = Number(body?.tuan);

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Thiếu id phiếu (uuid).' });
    }
    if (!Number.isInteger(tuan) || tuan < 1 || tuan > 4) {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Tuần phải từ 1 đến 4.' });
    }
    if (!(await duocPhanCong(db, phien.user.id, classId, 'coordinator'))) {
      return reply.code(403).send({ error: 'KHONG_PHU_TRACH', message: 'Bạn không phụ trách lớp này.' });
    }

    const soNguyen = (giaTri: unknown, toiDa: number): number | null => {
      const n = Number(giaTri);
      return Number.isInteger(n) && n >= 0 && n <= toiDa ? n : null;
    };
    const chuoi = (giaTri: unknown, toiDa: number): string | null =>
      typeof giaTri === 'string' ? giaTri.slice(0, toiDa) : null;

    const daCo = await query<{ id: string }>(db, `select id from phieu_buoi where id = $1`, [id]);
    if (daCo.length > 0) {
      return reply.code(200).send({ ok: true, id, daNhanTruocDo: true });
    }

    const lop = await query<{ school_id: string }>(db, `select school_id from classes where id = $1`, [classId]);
    if (lop.length === 0) {
      return reply.code(404).send({ error: 'KHONG_TIM_THAY', message: 'Không tìm thấy lớp.' });
    }

    await query(
      db,
      `insert into phieu_buoi (
         id, class_id, school_id, tuan, ngay, khung_gio, thoi_luong_thuc_te_phut,
         si_so, so_tham_gia, da_lam_mo_thu, da_lam_thu, da_lam_nghi, da_lam_noi, da_lam_chia_se,
         dung_app_hay_giay, dieu_tot, kho_khan, ghi_chu, phien_ban_app, nguoi_ghi
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id,
        classId,
        lop[0].school_id,
        tuan,
        chuoi(body.ngay, 10),
        chuoi(body.khungGio, 40),
        soNguyen(body.thoiLuongThucTePhut, 600),
        soNguyen(body.siSo, 500),
        soNguyen(body.soThamGia, 500),
        body.daLamMoThu === true,
        body.daLamThu === true,
        body.daLamNghi === true,
        body.daLamNoi === true,
        body.daLamChiaSe === true,
        ['app', 'giay', 'ca_hai'].includes(String(body.dungAppHayGiay)) ? String(body.dungAppHayGiay) : null,
        chuoi(body.dieuTot, 2000),
        chuoi(body.khoKhan, 2000),
        chuoi(body.ghiChu, 2000),
        chuoi(body.phienBanApp, 32),
        phien.user.id
      ]
    );

    return reply.code(201).send({ ok: true, id });
  });

  // --------------------------------------------------- phiếu đổi ý
  app.post('/decisions', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await layPhien(request, reply, db);
    if (!phien) return;

    const body = request.body as Record<string, unknown>;
    const classId = typeof body?.classId === 'string' ? body.classId : '';
    const id = typeof body?.id === 'string' ? body.id : '';
    const tuan = Number(body?.tuan);

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Thiếu id phiếu (uuid).' });
    }
    if (!Number.isInteger(tuan) || tuan < 1 || tuan > 4) {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Tuần phải từ 1 đến 4.' });
    }
    if (!(await duocPhanCong(db, phien.user.id, classId, 'coordinator'))) {
      return reply.code(403).send({ error: 'KHONG_PHU_TRACH', message: 'Bạn không phụ trách lớp này.' });
    }

    const daCo = await query<{ id: string }>(db, `select id from doi_y where id = $1`, [id]);
    if (daCo.length > 0) {
      return reply.code(200).send({ ok: true, id, daNhanTruocDo: true });
    }

    const lop = await query<{ school_id: string }>(db, `select school_id from classes where id = $1`, [classId]);
    if (lop.length === 0) {
      return reply.code(404).send({ error: 'KHONG_TIM_THAY', message: 'Không tìm thấy lớp.' });
    }

    const chuoi = (giaTri: unknown, toiDa: number): string | null =>
      typeof giaTri === 'string' ? giaTri.slice(0, toiDa) : null;

    await query(
      db,
      `insert into doi_y (id, class_id, school_id, tuan, nhom, doi_hay_giu, vi_sao, phien_ban_app, nguoi_ghi)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        classId,
        lop[0].school_id,
        tuan,
        chuoi(body.nhom, 64),
        ['doi', 'giu'].includes(String(body.doiHayGiu)) ? String(body.doiHayGiu) : null,
        chuoi(body.viSao, 2000),
        chuoi(body.phienBanApp, 32),
        phien.user.id
      ]
    );

    return reply.code(201).send({ ok: true, id });
  });

  // ------------------------------------------- xem phiếu của lớp mình
  app.get('/classes/:classId/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await layPhien(request, reply, db);
    if (!phien) return;

    const { classId } = request.params as { classId: string };
    const vai = phien.user.role === 'teacher' ? 'teacher' : 'coordinator';
    if (!(await duocPhanCong(db, phien.user.id, classId, vai))) {
      return reply.code(403).send({ error: 'KHONG_PHU_TRACH', message: 'Bạn không phụ trách lớp này.' });
    }

    const phieu = await query(
      db,
      `select id, tuan, ngay, khung_gio, thoi_luong_thuc_te_phut, si_so, so_tham_gia,
              dung_app_hay_giay, dieu_tot, kho_khan, nhan_luc
         from phieu_buoi where class_id = $1 order by tuan, nhan_luc`,
      [classId]
    );
    const doiY = await query(
      db,
      `select id, tuan, nhom, doi_hay_giu, vi_sao, nhan_luc
         from doi_y where class_id = $1 order by tuan, nhan_luc`,
      [classId]
    );

    return reply.send({ classId, phieuBuoi: phieu, doiY });
  });
}
