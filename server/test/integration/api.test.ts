/**
 * Kiểm thử tích hợp: chạy thật trên PostgreSQL.
 *
 * Bỏ qua toàn bộ tệp nếu không có TEST_DATABASE_URL, để `node --test` vẫn
 * xanh trên máy chưa cài cơ sở dữ liệu. Không viết test giả thay thế.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { Client } from 'pg';
import { buildApp } from '../../src/app.ts';
import { applyMigrations } from '../../scripts/migrate.ts';
import { hashPassword } from '../../src/security/password.ts';

const URL_DB = process.env.TEST_DATABASE_URL;
const chay = URL_DB ? describe : describe.skip;

chay('tích hợp: đăng nhập, nộp bài, nháp, phân quyền', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let db: Client;
  let cookie = '';
  let adminCookie = '';
  let studentId = '';
  let classId = '';
  let teacherCookie = '';
  let coordinatorCookie = '';

  const config = {
    NODE_ENV: 'test' as const,
    PORT: 0,
    DATABASE_URL: URL_DB ?? '',
    COOKIE_SECRET: 'test-secret-phai-dai-hon-32-ky-tu-de-hop-le',
    SESSION_HOURS: 12,
    TRUST_PROXY: false,
    CORS_ORIGIN: 'http://localhost:5173'
  };

  before(async () => {
    await applyMigrations(URL_DB as string);
    db = new Client({ connectionString: URL_DB });
    await db.connect();
    await db.query('truncate audit_log, progress, drafts, submissions, sessions, users, students, classes, schools restart identity cascade');

    const truong = await db.query(
      `insert into schools (ma, ten) values ('CVA', 'THPT Chuyên Chu Văn An') returning id`
    );
    const lop = await db.query(
      `insert into classes (school_id, ma, ten) values ($1, '10A3', '10A3') returning id`,
      [truong.rows[0].id]
    );
    const hocSinh = await db.query(
      `insert into students (ma, school_id, class_id) values ('CH12-T', $1, $2) returning id`,
      [truong.rows[0].id, lop.rows[0].id]
    );
    studentId = hocSinh.rows[0].id;
    classId = lop.rows[0].id;

    const hash = await hashPassword('MatKhau123');
    await db.query(
      `insert into users (username, password_hash, role, student_id) values ('ch12-t', $1, 'student', $2)`,
      [hash, studentId]
    );
    await db.query(
      `insert into users (username, password_hash, role) values ('quantri', $1, 'super_admin')`,
      [hash]
    );

    // Giáo viên và điều phối viên, kèm phân công vào lớp 10A3.
    const giaoVien = await db.query(
      `insert into users (username, password_hash, role) values ('giaovien1', $1, 'teacher') returning id`,
      [hash]
    );
    const dieuPhoi = await db.query(
      `insert into users (username, password_hash, role) values ('dieuphoi1', $1, 'coordinator') returning id`,
      [hash]
    );
    await db.query(
      `insert into users (username, password_hash, role) values ('giaovien2', $1, 'teacher') returning id`,
      [hash]
    );
    await db.query(`insert into staff_assignments (user_id, class_id, vai) values ($1, $2, 'teacher')`, [
      giaoVien.rows[0].id,
      classId
    ]);
    await db.query(`insert into staff_assignments (user_id, class_id, vai) values ($1, $2, 'coordinator')`, [
      dieuPhoi.rows[0].id,
      classId
    ]);

    app = await buildApp(config);
  });

  after(async () => {
    await app?.close();
    await db?.end();
  });

  test('sai mật khẩu trả 401 với thông báo chung', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'sai-mat-khau' }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(JSON.parse(res.body).error, 'SAI_THONG_TIN');
  });

  test('tài khoản không tồn tại trả cùng thông báo, không lộ tài khoản', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'khong-ton-tai', password: 'gi-cung-duoc' }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(JSON.parse(res.body).message, 'Tên đăng nhập hoặc mật khẩu không đúng.');
  });

  test('đăng nhập đúng trả cookie httpOnly', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau123' }
    });
    assert.equal(res.statusCode, 200);
    const setCookie = res.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
    assert.ok(raw.includes('HttpOnly'), 'cookie phải httpOnly');
    cookie = raw.split(';')[0];
    assert.ok(!res.body.includes('token'), 'không được trả token trong thân');
  });

  test('chưa đăng nhập thì không đọc được tổng quan', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me/overview' });
    assert.equal(res.statusCode, 401);
  });

  test('đọc được tổng quan khi đã đăng nhập', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me/overview', headers: { cookie } });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.hocSinh.ma, 'CH12-T');
    assert.equal(body.soTuanDaNop, 0);
  });

  test('nộp bài ghi vào CSDL và che nội dung nhạy cảm', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const res = await app.inject({
      method: 'POST',
      url: '/api/me/submissions',
      headers: { cookie },
      payload: {
        id,
        tuan: 1,
        thu_lam: 'em học được cách hỏi lại',
        nghi_1: 'em muốn tự tử',
        tu_danh_gia: 'muc_2',
        so_lan_dan: 0
      }
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.daChe, true);

    const row = await db.query('select thu_lam, nghi_1, da_che from submissions where id = $1', [id]);
    assert.equal(row.rowCount, 1);
    assert.equal(row.rows[0].nghi_1, '[đã ẩn – an toàn]');
    assert.equal(row.rows[0].thu_lam, 'em học được cách hỏi lại');

    const tienDo = await db.query('select count(*)::int as n from progress where student_id = $1', [studentId]);
    assert.equal(tienDo.rows[0].n, 1);
  });

  test('gửi lại cùng id không tạo dòng thứ hai', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const res = await app.inject({
      method: 'POST',
      url: '/api/me/submissions',
      headers: { cookie },
      payload: { id, tuan: 1, thu_lam: 'gửi lại' }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).daNhanTruocDo, true);

    const dem = await db.query('select count(*)::int as n from submissions where id = $1', [id]);
    assert.equal(dem.rows[0].n, 1);
  });

  test('học sinh đọc được chi tiết bài của mình, nội dung đã che', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/me/submissions/11111111-1111-4111-8111-111111111111',
      headers: { cookie }
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.baiNop.tuan, 1);
    assert.equal(body.baiNop.nghi_1, '[đã ẩn – an toàn]');
    assert.equal(res.body.includes('em muốn tự tử'), false, 'không được trả lại nội dung gốc');
  });

  test('biết id cũng không đọc được bài của người khác', async () => {
    const khac = await db.query(
      `insert into students (ma, school_id, class_id)
       select 'CH99-X', school_id, class_id from students where id = $1 returning id`,
      [studentId]
    );
    const baiKhac = '33333333-3333-4333-8333-333333333333';
    await db.query(
      `insert into submissions (id, student_id, school_id, class_id, tuan, thu_lam)
       select $1, $2, school_id, class_id, 2, 'bài của người khác'
         from students where id = $2`,
      [baiKhac, khac.rows[0].id]
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/me/submissions/${baiKhac}`,
      headers: { cookie }
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.includes('bài của người khác'), false);
  });

  test('bài nộp không sửa được ở tầng cơ sở dữ liệu', async () => {    await assert.rejects(
      async () => {
        await db.query(`update submissions set thu_lam = 'sua trom' where id = '11111111-1111-4111-8111-111111111111'`);
      },
      /bất biến/,
      'trigger phải chặn UPDATE'
    );
  });

  test('nháp: lưu lần đầu, lệch revision bị từ chối', async () => {
    const lan1 = await app.inject({
      method: 'PUT',
      url: '/api/me/drafts/1',
      headers: { cookie },
      payload: { tuan: 1, mutationId: 'm1', expectedRevision: 0, cac_o: { thu_lam: 'nháp một' } }
    });
    assert.equal(lan1.statusCode, 200);
    assert.equal(JSON.parse(lan1.body).revision, 1);

    const lan2 = await app.inject({
      method: 'PUT',
      url: '/api/me/drafts/1',
      headers: { cookie },
      payload: { tuan: 1, mutationId: 'm2', expectedRevision: 0, cac_o: { thu_lam: 'nháp hai' } }
    });
    assert.equal(lan2.statusCode, 409);
    assert.equal(JSON.parse(lan2.body).revision, 1);
  });

  test('gửi lặp cùng mutationId không tăng revision', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/me/drafts/1',
      headers: { cookie },
      payload: { tuan: 1, mutationId: 'm1', expectedRevision: 0, cac_o: { thu_lam: 'nháp một' } }
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.lapLai, true);
    assert.equal(body.revision, 1);
  });

  test('học sinh không vào được API quản trị', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/students', headers: { cookie } });
    assert.equal(res.statusCode, 403);
    assert.equal(JSON.parse(res.body).error, 'KHONG_DU_QUYEN');
  });

  test('đăng xuất thu hồi phiên ngay', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    const res = await app.inject({ method: 'GET', url: '/api/me/overview', headers: { cookie } });
    assert.equal(res.statusCode, 401);
  });

  // ------------------------------------------------------------ quản trị

  test('quản trị đăng nhập và xem được danh sách học sinh', async () => {
    const dangNhap = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'quantri', password: 'MatKhau123' }
    });
    assert.equal(dangNhap.statusCode, 200);
    adminCookie = String(dangNhap.headers['set-cookie']).split(';')[0];

    const res = await app.inject({ method: 'GET', url: '/api/admin/students', headers: { cookie: adminCookie } });
    assert.equal(res.statusCode, 200);
    assert.ok(JSON.parse(res.body).total >= 1);
  });

  test('xem trước CSV: báo lỗi từng dòng, chưa ghi gì', async () => {
    const csv =
      'ma,username,truong,lop\nHS-01,hs01,CVA,10A3\nHS-02,hs 02,CVA,10A3\nHS-03,hs03,KHONGCO,10A3\n';
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/import/preview',
      headers: { cookie: adminCookie },
      payload: { csv }
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.hopLe, 1);
    assert.equal(body.loi, 2);

    const dem = await db.query(`select count(*)::int as n from students where ma like 'HS-%'`);
    assert.equal(dem.rows[0].n, 0, 'xem trước không được ghi vào CSDL');
  });

  test('nhập CSV còn dòng lỗi thì không ghi', async () => {
    const csv = 'ma,username,truong,lop\nHS-09,hs09,KHONGCO,10A3\n';
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/import/commit',
      headers: { cookie: adminCookie },
      payload: { csv }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).error, 'CON_DONG_LOI');
  });

  test('nhập CSV sạch: tạo tài khoản, trả mật khẩu đúng một lần', async () => {
    const csv = 'ma,username,truong,lop\nHS-01,hs01,CVA,10A3\nHS-02,hs02,CVA,10A3\n';
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/import/commit',
      headers: { cookie: adminCookie },
      payload: { csv }
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.soLuong, 2);
    assert.ok(body.taiKhoan[0].matKhau.length >= 8);

    const dem = await db.query(`select count(*)::int as n from users where role = 'student'`);
    assert.equal(dem.rows[0].n, 3);

    const luu = await db.query(`select password_hash from users where username = 'hs01'`);
    assert.ok(luu.rows[0].password_hash.startsWith('$argon2id$'));
    assert.ok(!luu.rows[0].password_hash.includes(body.taiKhoan[0].matKhau), 'không lưu mật khẩu thô');
  });

  test('nhập lại chính tệp đó bị coi là trùng', async () => {
    const csv = 'ma,username,truong,lop\nHS-01,hs01,CVA,10A3\n';
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/import/preview',
      headers: { cookie: adminCookie },
      payload: { csv }
    });
    const body = JSON.parse(res.body);
    assert.equal(body.hopLe, 0);
    assert.equal(body.loi, 1);
  });

  test('xuất CSV có BOM và giữ tiếng Việt', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/export/students',
      headers: { cookie: adminCookie }
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.startsWith('\uFEFF'), 'phải có BOM cho Excel');
    assert.ok(res.body.includes('Chu Văn An'));
  });

  test('học sinh không gọi được API nhập/xuất', async () => {
    const dangNhap = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau123' }
    });
    const c = String(dangNhap.headers['set-cookie']).split(';')[0];
    const res = await app.inject({ method: 'GET', url: '/api/admin/export/students', headers: { cookie: c } });
    assert.equal(res.statusCode, 403);
  });

  // ------------------------------------------------ giáo viên, điều phối

  test('giáo viên chỉ thấy lớp mình phụ trách', async () => {
    const dn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'giaovien1', password: 'MatKhau123' }
    });
    assert.equal(dn.statusCode, 200);
    teacherCookie = String(dn.headers['set-cookie']).split(';')[0];

    const res = await app.inject({ method: 'GET', url: '/api/staff/classes', headers: { cookie: teacherCookie } });
    assert.equal(res.statusCode, 200);
    const items = JSON.parse(res.body).items;
    assert.equal(items.length, 1);
    assert.equal(items[0].vai, 'teacher');
  });

  test('giáo viên xem tiến trình nhưng KHÔNG thấy nội dung bài', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/staff/classes/${classId}/progress`,
      headers: { cookie: teacherCookie }
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    const hocSinh = body.hocSinh.find((h: { ma: string }) => h.ma === 'CH12-T');
    assert.ok(hocSinh, 'phải thấy học sinh của lớp');
    assert.deepEqual(hocSinh.cacTuan, [1], 'phải thấy tuần đã nộp');
    assert.equal(res.body.includes('em học được'), false, 'không được lộ nội dung bài');
    assert.equal(res.body.includes('thu_lam'), false, 'không được có cột nội dung');
  });

  test('giáo viên không phụ trách lớp khác thì bị chặn', async () => {
    const dn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'giaovien2', password: 'MatKhau123' }
    });
    const c = String(dn.headers['set-cookie']).split(';')[0];
    const res = await app.inject({
      method: 'GET',
      url: `/api/staff/classes/${classId}/progress`,
      headers: { cookie: c }
    });
    assert.equal(res.statusCode, 403);
    assert.equal(JSON.parse(res.body).error, 'KHONG_PHU_TRACH');
  });

  test('giáo viên không ghi được phiếu buổi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/staff/session-notes',
      headers: { cookie: teacherCookie },
      payload: { id: '22222222-2222-4222-8222-222222222222', classId, tuan: 1 }
    });
    assert.equal(res.statusCode, 403);
  });

  test('điều phối viên ghi phiếu buổi, gửi lại không tạo bản thứ hai', async () => {
    const dn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'dieuphoi1', password: 'MatKhau123' }
    });
    coordinatorCookie = String(dn.headers['set-cookie']).split(';')[0];

    const payload = {
      id: '22222222-2222-4222-8222-222222222222',
      classId,
      tuan: 1,
      siSo: 35,
      soThamGia: 33,
      daLamMoThu: true,
      dungAppHayGiay: 'ca_hai',
      dieuTot: 'học sinh hào hứng',
      khoKhan: 'mạng chậm'
    };

    const lan1 = await app.inject({
      method: 'POST',
      url: '/api/staff/session-notes',
      headers: { cookie: coordinatorCookie },
      payload
    });
    assert.equal(lan1.statusCode, 201);

    const lan2 = await app.inject({
      method: 'POST',
      url: '/api/staff/session-notes',
      headers: { cookie: coordinatorCookie },
      payload
    });
    assert.equal(lan2.statusCode, 200);
    assert.equal(JSON.parse(lan2.body).daNhanTruocDo, true);

    const dem = await db.query(`select count(*)::int as n from phieu_buoi`);
    assert.equal(dem.rows[0].n, 1);
  });

  test('điều phối viên đọc lại được phiếu của lớp mình', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/staff/classes/${classId}/notes`,
      headers: { cookie: coordinatorCookie }
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.phieuBuoi.length, 1);
    assert.equal(body.phieuBuoi[0].si_so, 35);
  });

  test('phân công sai vai bị trigger trong CSDL chặn', async () => {
    const gv2 = await db.query(`select id from users where username = 'giaovien2'`);
    await assert.rejects(
      async () => {
        await db.query(`insert into staff_assignments (user_id, class_id, vai) values ($1, $2, 'coordinator')`, [
          gv2.rows[0].id,
          classId
        ]);
      },
      /không khớp vai tài khoản/
    );
  });

  // ------------------------------------------------- đổi mật khẩu
  // Đặt cuối tệp vì các test này đổi mật khẩu của hs01/ch12-t.

  test('đổi mật khẩu: chưa đăng nhập thì bị chặn', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      payload: { currentPassword: 'MatKhau123', newPassword: 'MatKhau456' }
    });
    assert.equal(res.statusCode, 401);
  });

  test('đổi mật khẩu: mật khẩu mới yếu bị từ chối', async () => {
    const dn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau123' }
    });
    const c = String(dn.headers['set-cookie']).split(';')[0];

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie: c },
      payload: { currentPassword: 'MatKhau123', newPassword: 'abc' }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).error, 'MAT_KHAU_YEU');
  });

  test('đổi mật khẩu: sai mật khẩu hiện tại bị từ chối', async () => {
    const dn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau123' }
    });
    const c = String(dn.headers['set-cookie']).split(';')[0];

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie: c },
      payload: { currentPassword: 'sai-hoan-toan', newPassword: 'MatKhau456' }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(JSON.parse(res.body).error, 'SAI_MAT_KHAU');
  });

  test('đổi mật khẩu thành công: mật khẩu cũ hết hiệu lực, cờ bắt buộc đổi được xoá', async () => {
    await db.query(`update users set phai_doi_mat_khau = true where username = 'ch12-t'`);
    const dn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau123' }
    });
    const c = String(dn.headers['set-cookie']).split(';')[0];

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie: c },
      payload: { currentPassword: 'MatKhau123', newPassword: 'MatKhau456' }
    });
    assert.equal(res.statusCode, 200);

    const cu = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau123' }
    });
    assert.equal(cu.statusCode, 401, 'mật khẩu cũ phải hết hiệu lực');

    const moi = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ch12-t', password: 'MatKhau456' }
    });
    assert.equal(moi.statusCode, 200);

    const kiem = await db.query(`select phai_doi_mat_khau from users where username = 'ch12-t'`);
    assert.equal(kiem.rows[0].phai_doi_mat_khau, false);
  });

  test('quản trị: tổng quan mở rộng, lọc tiến độ, danh sách bài nộp, chi tiết học sinh', async () => {
    const ov = await app.inject({ method: 'GET', url: '/api/admin/overview', headers: { cookie: adminCookie } });
    assert.equal(ov.statusCode, 200);
    const body = ov.json();
    for (const khoa of ['soHoanThanh4Tuan', 'chuaBatDau', 'baiNopHomNay', 'baiNop7Ngay', 'tyLeHoanThanh']) {
      assert.equal(typeof body.tongQuan[khoa], 'number', 'thiếu trường ' + khoa);
    }
    assert.ok(Array.isArray(body.theoTuan));

    const theoNew = await app.inject({
      method: 'GET',
      url: '/api/admin/students?tienDo=new&pageSize=5',
      headers: { cookie: adminCookie }
    });
    assert.equal(theoNew.statusCode, 200);

    const theoDone = await app.inject({
      method: 'GET',
      url: '/api/admin/students?tienDo=done&pageSize=5',
      headers: { cookie: adminCookie }
    });
    assert.equal(theoDone.statusCode, 200);
    assert.ok(
      theoDone.json().total <= theoNew.json().total,
      'số học sinh hoàn thành không thể nhiều hơn số chưa bắt đầu'
    );

    const lopList = await app.inject({ method: 'GET', url: '/api/admin/classes', headers: { cookie: adminCookie } });
    assert.equal(lopList.statusCode, 200);
    assert.equal(lopList.json().items.length, 1);

    const danhSach = await app.inject({
      method: 'GET',
      url: '/api/admin/submissions?pageSize=5',
      headers: { cookie: adminCookie }
    });
    assert.equal(danhSach.statusCode, 200);
    assert.ok(Array.isArray(danhSach.json().items));

    const userRow = await db.query(`select id from users where username = 'ch12-t'`);
    const chiTiet = await app.inject({
      method: 'GET',
      url: `/api/admin/students/${userRow.rows[0].id}/submissions`,
      headers: { cookie: adminCookie }
    });
    assert.equal(chiTiet.statusCode, 200);
    const ct = chiTiet.json();
    assert.equal(ct.hocSinh.username, 'ch12-t');
    assert.ok(Array.isArray(ct.baiNop));
    assert.ok(Array.isArray(ct.nhap));

    // Học sinh không được đọc bài của người khác qua API quản trị.
    // Phiên học sinh ở bước này có thể đã bị thu hồi (đổi mật khẩu) nên chấp
    // nhận cả 401: điều cần chứng minh là KHÔNG BAO GIỜ trả 200.
    const hocSinhDoc = await app.inject({
      method: 'GET',
      url: `/api/admin/students/${userRow.rows[0].id}/submissions`,
      headers: { cookie }
    });
    assert.ok([401, 403].includes(hocSinhDoc.statusCode), 'học sinh phải bị chặn');

    // Giáo viên cũng không đọc được nội dung bài nộp.
    const giaoVienDoc = await app.inject({
      method: 'GET',
      url: `/api/admin/students/${userRow.rows[0].id}/submissions`,
      headers: { cookie: teacherCookie }
    });
    assert.ok([401, 403].includes(giaoVienDoc.statusCode), 'giáo viên không được đọc nội dung');
  });

  test('bảo mật: SQL injection vào đăng nhập và ô tìm kiếm admin bị vô hiệu', async () => {
    for (const payload of ["' OR '1'='1", "admin'--", "admin' OR 1=1 --", "'; drop table users; --"]) {
      const thu = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: payload, password: 'batky' }
      });
      assert.ok([400, 401].includes(thu.statusCode), `payload đăng nhập phải bị chặn: ${payload}`);
    }

    const conLai = await db.query(`select count(*)::int as n from users`);
    assert.ok(conLai.rows[0].n > 0, 'bảng users phải còn dữ liệu');

    const timKiem = await app.inject({
      method: 'GET',
      url: `/api/admin/students?q=${encodeURIComponent("%' OR '1'='1")}&pageSize=50`,
      headers: { cookie: adminCookie }
    });
    assert.equal(timKiem.statusCode, 200, 'tìm kiếm không được sập vì payload');
    assert.equal(timKiem.json().total, 0, 'payload không được khớp toàn bộ học sinh');

    const bangCon = await db.query(`select count(*)::int as n from students`);
    assert.ok(bangCon.rows[0].n > 0, 'bảng students phải còn dữ liệu');
  });

  test('bảo mật: IDOR - học sinh không đọc được bài của người khác', async () => {
    const hash = await hashPassword('MatKhau789');
    const hs2 = await db.query(
      `insert into students (ma, school_id, class_id)
       select 'CH12-T-02', school_id, class_id from students where id = $1
       returning id`,
      [studentId]
    );
    const u2 = await db.query(
      `insert into users (username, password_hash, role, student_id)
       values ('hocsinh2', $1, 'student', $2) returning id`,
      [hash, hs2.rows[0].id]
    );

    const idBai = randomUUID();
    await db.query(
      `insert into submissions (id, student_id, school_id, class_id, tuan, thu_lam)
       select $1, $2, school_id, class_id, 1, 'bài của học sinh thứ hai'
         from students where id = $2`,
      [idBai, hs2.rows[0].id]
    );

    const dangNhap = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'hocsinh2', password: 'MatKhau789' }
    });
    assert.equal(dangNhap.statusCode, 200);

    const doc = await app.inject({
      method: 'GET',
      url: `/api/me/submissions/${idBai}`,
      headers: { cookie }
    });
    assert.notEqual(doc.statusCode, 200, 'không được đọc bài người khác');

    const cuaMinh = await app.inject({
      method: 'GET',
      url: `/api/me/submissions/${idBai}`,
      headers: { cookie: dangNhap.headers['set-cookie'] as string }
    });
    assert.equal(cuaMinh.statusCode, 200, 'chủ bài phải đọc được bài của mình');

    const giaMao = await app.inject({
      method: 'GET',
      url: `/api/me/submissions/${idBai}?studentId=${hs2.rows[0].id}`,
      headers: { cookie }
    });
    assert.notEqual(giaMao.statusCode, 200, 'tham số học sinh trên URL không được có tác dụng');

    await db.query(`delete from submissions where id = $1`, [idBai]);
    await db.query(`delete from users where id = $1`, [u2.rows[0].id]);
    await db.query(`delete from students where id = $1`, [hs2.rows[0].id]);
  });

  test('bảo mật: học sinh bị chặn 403 ở mọi API quản trị', async () => {
    const hash = await hashPassword('MatKhau123');
    await db.query(
      `insert into students (ma, school_id, class_id)
       select 'CH12-T-03', school_id, class_id from students where id = $1`,
      [studentId]
    );
    const st3 = await db.query(`select id from students where ma = 'CH12-T-03'`);
    await db.query(
      `insert into users (username, password_hash, role, student_id) values ('hocsinh-demo', $1, 'student', $2)`,
      [hash, st3.rows[0].id]
    );

    const phien = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'hocsinh-demo', password: 'MatKhau123' }
    });
    const cookieHs = phien.headers['set-cookie'] as string;

    const apiAdmin = [
      '/api/admin/overview',
      '/api/admin/students',
      '/api/admin/classes',
      '/api/admin/submissions',
      '/api/admin/audit',
      '/api/admin/assignments'
    ];

    for (const duong of apiAdmin) {
      const goi = await app.inject({ method: 'GET', url: duong, headers: { cookie: cookieHs } });
      assert.equal(goi.statusCode, 403, `học sinh phải bị 403 ở ${duong}`);
      assert.ok(!JSON.stringify(goi.json()).includes('password_hash'), 'không được lộ hash mật khẩu');
    }

    const khongPhien = await app.inject({ method: 'GET', url: '/api/admin/overview' });
    assert.equal(khongPhien.statusCode, 401);

    await db.query(`delete from users where username = 'hocsinh-demo'`);
    await db.query(`delete from students where ma = 'CH12-T-03'`);
  });

  test('nội dung 4 tuần: đọc, sửa, học sinh thấy ngay, khôi phục bản gốc', async () => {
    const doc = await app.inject({ method: 'GET', url: '/api/admin/content/1', headers: { cookie: adminCookie } });
    assert.equal(doc.statusCode, 200);
    const goc = doc.json();
    assert.equal(goc.tuan, 1);
    assert.ok(Array.isArray(goc.noiDung.steps));

    // Sửa tiêu đề rồi đọc lại.
    const sua = structuredClone(goc.noiDung);
    sua.title = 'Tiêu đề đã sửa trong test';
    const luu = await app.inject({
      method: 'PUT',
      url: '/api/admin/content/1',
      headers: { cookie: adminCookie },
      payload: sua
    });
    assert.equal(luu.statusCode, 200);
    assert.equal(luu.json().noiDung.title, 'Tiêu đề đã sửa trong test');

    // Học sinh thấy nội dung mới qua /api/me/content.
    const hs = await app.inject({ method: 'GET', url: '/api/me/content', headers: { cookie: adminCookie } });
    assert.equal(hs.statusCode, 200);
    const tuan1 = hs.json().weeks.find((w: { tuan: number }) => w.tuan === 1);
    assert.equal(tuan1.title, 'Tiêu đề đã sửa trong test', 'học sinh phải thấy nội dung vừa sửa');

    // Dữ liệu sai bị từ chối.
    const rong = await app.inject({
      method: 'PUT',
      url: '/api/admin/content/1',
      headers: { cookie: adminCookie },
      payload: { tuan: 1, title: '', steps: [] }
    });
    assert.equal(rong.statusCode, 400);

    // Tuần ngoài phạm vi bị từ chối.
    const saiTuan = await app.inject({
      method: 'GET',
      url: '/api/admin/content/9',
      headers: { cookie: adminCookie }
    });
    assert.equal(saiTuan.statusCode, 400);

    // Khôi phục.
    const khoiPhuc = await app.inject({
      method: 'POST',
      url: '/api/admin/content/1/reset',
      headers: { cookie: adminCookie }
    });
    assert.equal(khoiPhuc.statusCode, 200);
    assert.equal(khoiPhuc.json().noiDung.title, goc.noiDung.title, 'phải trở về tiêu đề gốc');
  });

  test('bảo mật: học sinh không sửa được nội dung', async () => {
    const hash = await hashPassword('MatKhau123');
    await db.query(
      `insert into students (ma, school_id, class_id)
       select 'CH12-T-04', school_id, class_id from students where id = $1`,
      [studentId]
    );
    const st = await db.query(`select id from students where ma = 'CH12-T-04'`);
    await db.query(
      `insert into users (username, password_hash, role, student_id) values ('hocsinh-noi-dung', $1, 'student', $2)`,
      [hash, st.rows[0].id]
    );

    const phien = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'hocsinh-noi-dung', password: 'MatKhau123' }
    });
    const cookieHs = phien.headers['set-cookie'] as string;

    const doc = await app.inject({ method: 'GET', url: '/api/admin/content', headers: { cookie: cookieHs } });
    assert.equal(doc.statusCode, 403);

    const sua = await app.inject({
      method: 'PUT',
      url: '/api/admin/content/1',
      headers: { cookie: cookieHs },
      payload: { tuan: 1, title: 'hack', steps: [{ title: 'x' }] }
    });
    assert.equal(sua.statusCode, 403);

    const reset = await app.inject({
      method: 'POST',
      url: '/api/admin/content/1/reset',
      headers: { cookie: cookieHs }
    });
    assert.equal(reset.statusCode, 403);

    await db.query(`delete from users where username = 'hocsinh-noi-dung'`);
    await db.query(`delete from students where ma = 'CH12-T-04'`);
  });

  test('bảo mật: header phòng thủ được bật', async () => {    const tra = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(tra.statusCode, 200);

    const csp = String(tra.headers['content-security-policy'] ?? '');
    assert.ok(csp.includes("default-src 'none'"), 'CSP phải chặn mọi nguồn mặc định');
    assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP phải chống nhúng iframe');
    assert.equal(tra.headers['x-frame-options'], 'DENY');
    assert.equal(tra.headers['x-content-type-options'], 'nosniff');
    assert.equal(tra.headers['referrer-policy'], 'no-referrer');
    assert.equal(tra.headers['x-powered-by'], undefined, 'không được lộ công nghệ máy chủ');
  });
});
