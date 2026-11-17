/**
 * Kết nối PostgreSQL. Dùng pool dùng chung, và một hàm truy vấn có kiểu.
 * Không bao giờ nối chuỗi SQL từ dữ liệu người dùng: mọi tham số đi qua $1, $2.
 */
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(databaseUrl: string): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Không log câu lệnh: có thể chứa dữ liệu học sinh.
      application_name: 'xoay-chieu-api'
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow>(
  db: pg.Pool,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const ketQua = await db.query<T>(sql, params);
  return ketQua.rows;
}

export async function queryOne<T extends pg.QueryResultRow>(
  db: pg.Pool,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(db, sql, params);
  return rows[0] ?? null;
}

/** Chạy nhiều câu lệnh trong một giao dịch, tự động rollback khi lỗi. */
export async function transaction<T>(
  db: pg.Pool,
  viec: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const ketQua = await viec(client);
    await client.query('COMMIT');
    return ketQua;
  } catch (loi) {
    await client.query('ROLLBACK');
    throw loi;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
