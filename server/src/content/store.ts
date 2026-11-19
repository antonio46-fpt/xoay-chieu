/**
 * Lưu trữ nội dung bốn tuần.
 *
 * Bản gốc nằm trong `content.json` (sao từ bản 2.x). Khi quản trị viên sửa,
 * nội dung được ghi vào bảng `contents`; cột `mac_dinh` giữ bản gốc để khôi
 * phục. Nếu bảng chưa có dòng nào, lần đọc đầu tiên sẽ tự nạp từ tệp.
 */
import type pg from 'pg';
import { readFileSync } from 'node:fs';
import { query, queryOne } from '../db.ts';

export type TuanNoiDung = {
  tuan: number;
  title: string;
  focus: string;
  duration: number;
  quy_trinh?: string;
  letter: Record<string, unknown>;
  steps: Record<string, unknown>[];
};

const tatCaGoc: TuanNoiDung[] = (
  JSON.parse(readFileSync(new URL('./content.json', import.meta.url), 'utf8')) as { weeks: TuanNoiDung[] }
).weeks;

export function noiDungMacDinh(): TuanNoiDung[] {
  return tatCaGoc;
}

export function tuanMacDinh(so: number): TuanNoiDung | undefined {
  return tatCaGoc.find(t => t.tuan === so);
}

/** Nạp bản gốc vào bảng nếu bảng còn trống. Chạy được nhiều lần. */
export async function damBaoCoDuLieu(db: pg.Pool): Promise<void> {
  const [dem] = await query<{ n: string }>(db, `select count(*)::text as n from contents`);
  if (Number(dem.n) > 0) return;

  for (const tuan of tatCaGoc) {
    await query(
      db,
      `insert into contents (tuan, tieu_de, noi_dung, mac_dinh)
       values ($1, $2, $3::jsonb, $3::jsonb)
       on conflict (tuan) do nothing`,
      [tuan.tuan, tuan.title, JSON.stringify(tuan)]
    );
  }
}

export type BanGhiNoiDung = {
  tuan: number;
  tieuDe: string;
  noiDung: TuanNoiDung;
  capNhatLuc: Date | null;
  capNhatBoi: string | null;
};

export async function docTatCa(db: pg.Pool): Promise<BanGhiNoiDung[]> {
  await damBaoCoDuLieu(db);
  const rows = await query<{
    tuan: number;
    tieu_de: string;
    noi_dung: TuanNoiDung;
    cap_nhat_luc: Date;
    username: string | null;
  }>(
    db,
    `select c.tuan, c.tieu_de, c.noi_dung, c.cap_nhat_luc, u.username
       from contents c
       left join users u on u.id = c.cap_nhat_boi
      order by c.tuan`
  );

  return rows.map(r => ({
    tuan: r.tuan,
    tieuDe: r.tieu_de,
    noiDung: r.noi_dung,
    capNhatLuc: r.cap_nhat_luc,
    capNhatBoi: r.username
  }));
}

/** Nội dung cho giao diện học sinh: chỉ phần cần thiết, bỏ cột quản trị. */
export async function docChoHocSinh(db: pg.Pool): Promise<TuanNoiDung[]> {
  const ds = await docTatCa(db);
  return ds.map(d => d.noiDung);
}

export async function docMotTuan(db: pg.Pool, so: number): Promise<BanGhiNoiDung | null> {
  await damBaoCoDuLieu(db);
  const row = await queryOne<{
    tuan: number;
    tieu_de: string;
    noi_dung: TuanNoiDung;
    cap_nhat_luc: Date;
    username: string | null;
  }>(
    db,
    `select c.tuan, c.tieu_de, c.noi_dung, c.cap_nhat_luc, u.username
       from contents c
       left join users u on u.id = c.cap_nhat_boi
      where c.tuan = $1`,
    [so]
  );
  if (!row) return null;
  return {
    tuan: row.tuan,
    tieuDe: row.tieu_de,
    noiDung: row.noi_dung,
    capNhatLuc: row.cap_nhat_luc,
    capNhatBoi: row.username
  };
}

export async function luuTuan(
  db: pg.Pool,
  so: number,
  noiDung: TuanNoiDung,
  boiUserId: string
): Promise<void> {
  await query(
    db,
    `insert into contents (tuan, tieu_de, noi_dung, mac_dinh, cap_nhat_luc, cap_nhat_boi)
     values ($1, $2, $3::jsonb, $3::jsonb, now(), $4)
     on conflict (tuan) do update
        set tieu_de = excluded.tieu_de,
            noi_dung = excluded.noi_dung,
            cap_nhat_luc = now(),
            cap_nhat_boi = excluded.cap_nhat_boi`,
    [so, noiDung.title, JSON.stringify(noiDung), boiUserId]
  );
}

/** Trả một tuần về đúng bản gốc trong content.json. */
export async function khoiPhucMacDinh(db: pg.Pool, so: number, boiUserId: string): Promise<TuanNoiDung | null> {
  const gocTuan = tuanMacDinh(so);
  if (!gocTuan) return null;
  await query(
    db,
    `update contents
        set tieu_de = $2, noi_dung = $3::jsonb, cap_nhat_luc = now(), cap_nhat_boi = $4
      where tuan = $1`,
    [so, gocTuan.title, JSON.stringify(gocTuan), boiUserId]
  );
  return gocTuan;
}
