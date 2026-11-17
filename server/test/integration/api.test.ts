/**
 * Kiểm thử tích hợp: chạy thật trên PostgreSQL.
 *
 * Bỏ qua toàn bộ tệp nếu không có TEST_DATABASE_URL, để `node --test` vẫn
 * xanh trên máy chưa cài cơ sở dữ liệu. Không viết test giả thay thế.
 */
import assert from 'node:assert/strict';
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
  let studentId = '';

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

    const hash = await hashPassword('MatKhau123');
    await db.query(
      `insert into users (username, password_hash, role, student_id) values ('ch12-t', $1, 'student', $2)`,
      [hash, studentId]
    );

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

  test('bài nộp không sửa được ở tầng cơ sở dữ liệu', async () => {
    await assert.rejects(
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
});
