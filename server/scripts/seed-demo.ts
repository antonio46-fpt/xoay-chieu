/**
 * Tạo dữ liệu mẫu để phát triển giao diện.
 *
 *   node scripts/seed-demo.ts
 *
 * Chạy lại nhiều lần vẫn an toàn. KHÔNG dùng cho production.
 * Tài khoản: hs01 / hs02 / hs03, mật khẩu Demo12345.
 */
import { loadConfig } from '../src/config.ts';
import { getPool, closePool, query, queryOne } from '../src/db.ts';
import { hashPassword } from '../src/security/password.ts';

const MAT_KHAU = 'Demo12345';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = getPool(config.DATABASE_URL);

  const truong = await queryOne<{ id: string }>(db, `select id from schools where ma = 'CVA'`);
  const schoolId =
    truong?.id ??
    (
      await query<{ id: string }>(
        db,
        `insert into schools (ma, ten) values ('CVA', 'THPT Chuyên Chu Văn An') returning id`
      )
    )[0].id;

  const lopCu = await queryOne<{ id: string }>(db, `select id from classes where school_id = $1 and ma = '10A3'`, [
    schoolId
  ]);
  const classId =
    lopCu?.id ??
    (
      await query<{ id: string }>(
        db,
        `insert into classes (school_id, ma, ten) values ($1, '10A3', '10A3 (10 Tin)') returning id`,
        [schoolId]
      )
    )[0].id;

  const hash = await hashPassword(MAT_KHAU);

  for (const [ma, username] of [
    ['CH12-T', 'hs01'],
    ['CH13-T', 'hs02'],
    ['CH14-T', 'hs03']
  ] as const) {
    const daCo = await queryOne<{ id: string }>(db, `select id from users where username = $1`, [username]);
    if (daCo) {
      console.log(username + ': đã có, bỏ qua');
      continue;
    }
    const hs = await query<{ id: string }>(
      db,
      `insert into students (ma, school_id, class_id) values ($1, $2, $3)
       on conflict (school_id, ma) do update set cap_nhat_luc = now() returning id`,
      [ma, schoolId, classId]
    );
    await query(
      db,
      `insert into users (username, password_hash, role, student_id) values ($1, $2, 'student', $3)`,
      [username, hash, hs[0].id]
    );
    console.log(username + ': đã tạo');
  }

  console.log('Xong. Mật khẩu chung: ' + MAT_KHAU);
  await closePool();
}

main().catch(async loi => {
  console.error(loi instanceof Error ? loi.message : loi);
  await closePool().catch(() => undefined);
  process.exit(1);
});
