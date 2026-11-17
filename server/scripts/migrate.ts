/**
 * Chạy migration theo thứ tự tên tệp, ghi lại phiên bản đã áp dụng.
 *
 *   node scripts/migrate.ts            (đọc DATABASE_URL từ môi trường)
 *
 * Mỗi tệp SQL tự chứa begin/commit. Tệp đã chạy thì bỏ qua, nên chạy lại
 * nhiều lần vẫn an toàn. Lỗi giữa đường thì không ghi phiên bản, lần sau
 * chạy lại từ đầu tệp đó.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

export async function applyMigrations(connectionString: string): Promise<string[]> {
  const client = new Client({ connectionString });
  await client.connect();
  const daAp: string[] = [];
  try {
    await client.query(`
      create table if not exists schema_migrations (
        version    text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const thuMuc = path.resolve(import.meta.dirname, '..', '..', 'db', 'migrations');
    const tep = (await readdir(thuMuc)).filter(ten => ten.endsWith('.sql')).sort();

    for (const ten of tep) {
      const version = ten.replace(/\.sql$/, '');
      const daCo = await client.query('select 1 from schema_migrations where version = $1', [version]);
      if (daCo.rowCount > 0) continue;

      const sql = await readFile(path.join(thuMuc, ten), 'utf8');
      await client.query(sql);
      await client.query('insert into schema_migrations (version) values ($1)', [version]);
      daAp.push(version);
    }
    return daAp;
  } finally {
    await client.end();
  }
}

// Cho phép chạy trực tiếp:  node scripts/migrate.ts
// Trên Windows, import.meta.url có dạng file:///G:/... nên phải dùng pathToFileURL
// thay vì tự ghép chuỗi.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Thiếu DATABASE_URL.');
    process.exit(1);
  }
  applyMigrations(url)
    .then(daAp => {
      console.log(daAp.length === 0 ? 'Không có migration mới.' : 'Đã áp dụng: ' + daAp.join(', '));
    })
    .catch(loi => {
      console.error('Migration thất bại:', loi.message);
      process.exit(1);
    });
}
