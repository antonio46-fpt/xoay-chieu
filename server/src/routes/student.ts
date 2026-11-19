/**
 * API dành cho học sinh.
 *
 * Nguyên tắc: học sinh chỉ chạm được dữ liệu của chính mình. Không endpoint
 * nào nhận mã học sinh hay lớp từ trình duyệt — danh tính lấy từ phiên đăng
 * nhập, nên sửa request cũng không đổi được người.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { query, queryOne, transaction } from '../db.ts';
import { phienHienTai, type PhuThuocRoute } from '../auth/routes.ts';
import { cheBaiNop } from '../security/redact.ts';
import { DraftSchema, SubmissionSchema } from '../validation.ts';
import { docChoHocSinh } from '../content/store.ts';

type PhienHocSinh = {
  userId: string;
  studentId: string;
  ma: string;
  truong: string;
  lop: string;
};

async function hocSinhCuaPhien(request: FastifyRequest, db: pg.Pool): Promise<PhienHocSinh | null> {
  const phien = await phienHienTai(request, db);
  if (!phien || phien.user.role !== 'student' || !phien.student) return null;
  return {
    userId: phien.user.id,
    studentId: phien.student.id,
    ma: phien.student.ma,
    truong: phien.student.truong,
    lop: phien.student.lop
  };
}

const TU_KHOA_MAC_DINH = [
  'tự tử',
  'tu tu',
  'tự sát',
  'tự hại',
  'cắt tay',
  'muốn chết',
  'bạo lực',
  'đánh nhau',
  'xâm hại',
  'bắt nạt'
];

async function docTuKhoa(db: pg.Pool): Promise<string[]> {
  const row = await queryOne<{ gia_tri: unknown }>(
    db,
    `select gia_tri from settings where khoa = 'tu_khoa_an_toan'`
  );
  const giaTri = row?.gia_tri;
  if (Array.isArray(giaTri) && giaTri.every(x => typeof x === 'string') && giaTri.length > 0) {
    return giaTri as string[];
  }
  return TU_KHOA_MAC_DINH;
}

export async function studentRoutes(app: FastifyInstance, opts: PhuThuocRoute): Promise<void> {
  const { db } = opts;

  // ------------------------------------------------- nội dung bốn tuần
  app.get('/content', async (request: FastifyRequest, reply: FastifyReply) => {
    const phien = await phienHienTai(request, db);
    if (!phien) {
      return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });
    }

    const weeks = await docChoHocSinh(db);
    return reply.send({ weeks });
  });

  // ------------------------------------------------------- tổng quan
  app.get('/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const hs = await hocSinhCuaPhien(request, db);
    if (!hs) return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });

    const tienDo = await query<{ tuan: number; luc: Date; submission_id: string }>(
      db,
      `select tuan, luc, submission_id from progress where student_id = $1 order by tuan`,
      [hs.studentId]
    );
    const nhap = await query<{ tuan: number; cap_nhat_luc: Date }>(
      db,
      `select tuan, cap_nhat_luc from drafts where student_id = $1 order by tuan`,
      [hs.studentId]
    );

    const daNop = new Map(tienDo.map(row => [row.tuan, row.luc]));
    const banNhap = new Map(nhap.map(row => [row.tuan, row.cap_nhat_luc]));

    return reply.send({
      hocSinh: { ma: hs.ma, truong: hs.truong, lop: hs.lop },
      soTuanDaNop: tienDo.length,
      cacTuan: [1, 2, 3, 4].map(tuan => ({
        tuan,
        daNop: daNop.has(tuan),
        nopLuc: daNop.get(tuan) ?? null,
        coBanNhap: banNhap.has(tuan),
        capNhatNhapLuc: banNhap.get(tuan) ?? null
      }))
    });
  });

  // --------------------------------------------------- danh sách bài
  app.get('/submissions', async (request: FastifyRequest, reply: FastifyReply) => {
    const hs = await hocSinhCuaPhien(request, db);
    if (!hs) return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });

    const rows = await query<{ id: string; tuan: number; nhan_luc: Date; da_che: boolean }>(
      db,
      `select id, tuan, nhan_luc, da_che from submissions
        where student_id = $1 order by tuan, nhan_luc`,
      [hs.studentId]
    );
    return reply.send({
      items: rows.map(row => ({
        id: row.id,
        tuan: row.tuan,
        nhanLuc: row.nhan_luc,
        daChe: row.da_che
      }))
    });
  });

  // ------------------------------------------------------ nộp bài
  app.post('/submissions', async (request: FastifyRequest, reply: FastifyReply) => {
    const hs = await hocSinhCuaPhien(request, db);
    if (!hs) return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });

    const daKiem = SubmissionSchema.safeParse(request.body);
    if (!daKiem.success) {
      return reply.code(400).send({
        error: 'DU_LIEU_KHONG_HOP_LE',
        message: 'Bài nộp thiếu hoặc sai định dạng.',
        chiTiet: daKiem.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      });
    }
    const bai = daKiem.data;

    // Đã có bài cùng id: gửi lại thì xác nhận, không tạo dòng mới.
    const daCo = await queryOne<{ id: string; tuan: number; student_id: string }>(
      db,
      `select id, tuan, student_id from submissions where id = $1`,
      [bai.id]
    );
    if (daCo) {
      if (daCo.student_id === hs.studentId && daCo.tuan === bai.tuan) {
        return reply.code(200).send({ ok: true, id: bai.id, daNhanTruocDo: true });
      }
      return reply.code(409).send({
        error: 'XUNG_DOT_ID',
        message: 'Mã bài này đã được dùng cho bài khác.'
      });
    }

    const tuKhoa = await docTuKhoa(db);
    const { bai: baiSach, daChe } = cheBaiNop(bai, tuKhoa);

    const ketQua = await transaction(db, async client => {
      const sv = await client.query<{ school_id: string; class_id: string }>(
        `select school_id, class_id from students where id = $1`,
        [hs.studentId]
      );
      if (sv.rows.length === 0) throw new Error('STUDENT_NOT_FOUND');
      const { school_id, class_id } = sv.rows[0];

      await client.query(
        `insert into submissions (
           id, student_id, school_id, class_id, tuan, bat_dau,
           thu_lam, nghi_1, nghi_2, nghi_3, noi, dang_san_pham, san_pham, chia_se,
           tu_danh_gia, thoi_luong_giay, thoi_gian_troi_giay, phe, doi_hay_giu,
           kiem_soat, ngoai_kiem_soat, ban_goc_id,
           phien_ban_app, phien_ban_noi_dung, so_lan_dan, da_che
         ) values (
           $1,$2,$3,$4,$5,$6,
           $7,$8,$9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,
           $20,$21,$22,
           $23,$24,$25,$26
         )`,
        [
          bai.id,
          hs.studentId,
          school_id,
          class_id,
          bai.tuan,
          bai.bat_dau ?? null,
          baiSach.thu_lam ?? null,
          baiSach.nghi_1 ?? null,
          baiSach.nghi_2 ?? null,
          baiSach.nghi_3 ?? null,
          baiSach.noi ?? null,
          bai.dang_san_pham ?? null,
          baiSach.san_pham ?? null,
          baiSach.chia_se ?? null,
          bai.tu_danh_gia ?? null,
          bai.thoi_luong_giay ?? null,
          bai.thoi_gian_troi_giay ?? null,
          bai.phe ?? null,
          bai.doi_hay_giu ?? null,
          baiSach.kiem_soat ?? null,
          bai.ngoai_kiem_soat ?? null,
          bai.ban_goc_id ?? null,
          bai.phien_ban_app ?? null,
          bai.phien_ban_noi_dung ?? null,
          bai.so_lan_dan ?? 0,
          daChe
        ]
      );

      await client.query(
        `insert into progress (student_id, tuan, submission_id)
         values ($1, $2, $3)
         on conflict (student_id, tuan) do update
           set submission_id = excluded.submission_id, luc = now()`,
        [hs.studentId, bai.tuan, bai.id]
      );

      return { id: bai.id };
    });

    return reply.code(201).send({ ok: true, id: ketQua.id, daChe });
  });

  // ------------------------------------------- chi tiết một bài đã nộp
  // Chỉ chủ nhân đọc được. Điều kiện student_id nằm trong câu SQL, nên đoán
  // id của người khác cũng không lấy được gì.
  app.get('/submissions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const hs = await hocSinhCuaPhien(request, db);
    if (!hs) return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });

    const { id } = request.params as { id: string };
    const row = await queryOne<Record<string, unknown>>(
      db,
      `select id, tuan, nhan_luc, da_che, bat_dau,
              thu_lam, nghi_1, nghi_2, nghi_3, noi, dang_san_pham, san_pham,
              chia_se, tu_danh_gia, phe, doi_hay_giu, kiem_soat, ngoai_kiem_soat,
              thoi_luong_giay, thoi_gian_troi_giay, ban_goc_id, so_lan_dan
         from submissions where id = $1 and student_id = $2`,
      [id, hs.studentId]
    );

    if (!row) {
      return reply.code(404).send({ error: 'KHONG_TIM_THAY', message: 'Không tìm thấy bài nộp của bạn.' });
    }

    return reply.send({ baiNop: row });
  });

  // -------------------------------------------------------- bản nháp
  app.get('/drafts/:tuan', async (request: FastifyRequest, reply: FastifyReply) => {
    const hs = await hocSinhCuaPhien(request, db);
    if (!hs) return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });

    const tuan = Number((request.params as { tuan: string }).tuan);
    if (!Number.isInteger(tuan) || tuan < 1 || tuan > 4) {
      return reply.code(400).send({ error: 'TUAN_KHONG_HOP_LE', message: 'Tuần phải từ 1 đến 4.' });
    }

    const row = await queryOne<{ revision: number; du_lieu: Record<string, string>; mutation_id: string }>(
      db,
      `select revision, du_lieu, mutation_id from drafts where student_id = $1 and tuan = $2`,
      [hs.studentId, tuan]
    );

    return reply.send({
      tuan,
      revision: row?.revision ?? 0,
      cacO: row?.du_lieu ?? {},
      mutationId: row?.mutation_id ?? null
    });
  });

  app.put('/drafts/:tuan', async (request: FastifyRequest, reply: FastifyReply) => {
    const hs = await hocSinhCuaPhien(request, db);
    if (!hs) return reply.code(401).send({ error: 'CHUA_DANG_NHAP', message: 'Chưa đăng nhập.' });

    const daKiem = DraftSchema.safeParse(request.body);
    if (!daKiem.success) {
      return reply.code(400).send({ error: 'DU_LIEU_KHONG_HOP_LE', message: 'Bản nháp sai định dạng.' });
    }
    const { tuan, mutationId, expectedRevision, cac_o } = daKiem.data;

    // Chỉ nhận các ô có tên hợp lệ, tránh ghi rác vào JSON.
    const oHopLe = Object.entries(cac_o).filter(([ten]) => /^[a-z0-9_]{1,32}$/.test(ten));
    const duLieu = Object.fromEntries(oHopLe);

    const hienTai = await queryOne<{ revision: number; mutation_id: string | null }>(
      db,
      `select revision, mutation_id from drafts where student_id = $1 and tuan = $2`,
      [hs.studentId, tuan]
    );
    const revisionNow = hienTai?.revision ?? 0;

    // Gửi lặp cùng mutationId: trả lại kết quả cũ, không tăng revision.
    if (hienTai && hienTai.mutation_id === mutationId) {
      return reply.send({ ok: true, revision: hienTai.revision, lapLai: true });
    }

    if (revisionNow !== expectedRevision) {
      return reply.code(409).send({
        error: 'XUNG_DOT_PHIEN_BAN',
        message: 'Bản nháp đã đổi ở thiết bị khác.',
        revision: revisionNow
      });
    }

    await query(
      db,
      `insert into drafts (student_id, tuan, revision, mutation_id, du_lieu, cap_nhat_luc)
       values ($1, $2, 1, $3, $4, now())
       on conflict (student_id, tuan) do update
         set revision = drafts.revision + 1,
             mutation_id = excluded.mutation_id,
             du_lieu = excluded.du_lieu,
             cap_nhat_luc = now()`,
      [hs.studentId, tuan, mutationId, JSON.stringify(duLieu)]
    );

    return reply.send({ ok: true, revision: revisionNow + 1 });
  });
}
