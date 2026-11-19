import { useEffect, useState } from 'react';
import { api, ApiError, type PhienNguoiDung } from '../../api/client';
import { layTuan } from '../../content';
import AdminShell from './AdminShell';

type DuLieu = {
  tongQuan: {
    soTruong: number;
    soLop: number;
    soHocSinh: number;
    soDangHoatDong: number;
    soBiKhoa: number;
    soBaiNop: number;
    soHoanThanh4Tuan: number;
    chuaBatDau: number;
    baiNopHomNay: number;
    baiNop7Ngay: number;
    tyLeHoanThanh: number;
  };
  theoTuan: { tuan: number; soBai: number; soHocSinh: number }[];
  theoLop: { lop: string; truong: string; soBai: number }[];
};

export default function AdminOverview({ phien }: { phien: PhienNguoiDung }): JSX.Element {
  const [duLieu, setDuLieu] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    api<DuLieu>('/api/admin/overview')
      .then(kq => {
        if (!huy) setDuLieu(kq);
      })
      .catch(e => {
        if (!huy) setLoi(e instanceof ApiError ? e.message : 'Không tải được số liệu.');
      });
    return () => {
      huy = true;
    };
  }, []);

  const t = duLieu?.tongQuan;
  const tong = t?.soHocSinh ?? 0;

  return (
    <AdminShell phien={phien} tieuDe="Tổng quan hệ thống" phuDe={`${t?.soLop ?? 0} lớp · ${t?.soTruong ?? 0} trường`} dangChon="tong-quan">
      {loi && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          {loi}
        </p>
      )}

      {!duLieu && !loi && <TheSkeleton />}

      {duLieu && t && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <The
              nhan="Tổng số học sinh"
              giaTri={String(t.soHocSinh)}
              phu={`${t.soLop} lớp · ${t.soTruong} trường`}
              icon="👥"
              mau="bg-primary-soft text-primary"
            />
            <The
              nhan="Hoàn thành đủ 4 tuần"
              giaTri={`${t.tyLeHoanThanh}%`}
              phu={`${t.soHoanThanh4Tuan}/${t.soHocSinh} học sinh`}
              icon="▲"
              mau="bg-success-soft text-success"
              tienDo={t.tyLeHoanThanh}
            />
            <The
              nhan="Bài nộp 7 ngày qua"
              giaTri={String(t.baiNop7Ngay)}
              phu={`+${t.baiNopHomNay} hôm nay`}
              icon="✓"
              mau="bg-accent-soft text-accent"
              huyHieu={t.baiNopHomNay > 0 ? `+${t.baiNopHomNay}` : undefined}
            />
            <The
              nhan="Chưa bắt đầu"
              giaTri={String(t.chuaBatDau)}
              phu={t.soBiKhoa > 0 ? `${t.soBiKhoa} tài khoản bị khoá` : 'Không có tài khoản bị khoá'}
              icon="⏳"
              mau="bg-warning-soft text-warning"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="card">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[15px] font-bold text-ink-strong">Tiến độ theo 4 tuần</h2>
                <span className="text-[11px] font-medium text-ink-muted">{t.soBaiNop} bài nộp</span>
              </div>

              <ul className="mt-4 space-y-4">
                {[1, 2, 3, 4].map(so => {
                  const tuan = duLieu.theoTuan.find(x => x.tuan === so);
                  const soHs = tuan?.soHocSinh ?? 0;
                  const phanTram = tong > 0 ? Math.round((soHs / tong) * 100) : 0;
                  return (
                    <li key={so}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13px] font-semibold text-ink">
                          Tuần {so} · {layTuan(so)?.title ?? ''}
                        </span>
                        <span className="shrink-0 text-[11.5px] text-ink-muted">
                          {soHs}/{tong} · {phanTram}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-500"
                          style={{ width: `${phanTram}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
                Cột tính theo <strong>số học sinh đã nộp</strong> tuần đó, không phải số bài. Một học sinh làm lại tuần
                chỉ tính một lần.
              </p>
            </section>

            <section className="card">
              <h2 className="font-display text-[15px] font-bold text-ink-strong">Theo lớp</h2>
              <ul className="mt-3 divide-y divide-line">
                {duLieu.theoLop.map(l => (
                  <li key={`${l.truong}-${l.lop}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-strong">{l.lop}</span>
                      <span className="block truncate text-[11px] text-ink-muted">{l.truong}</span>
                    </span>
                    <span className="shrink-0 rounded-pill bg-canvas px-2.5 py-1 text-[11.5px] font-semibold text-ink">
                      {l.soBai} bài
                    </span>
                  </li>
                ))}
                {duLieu.theoLop.length === 0 && <li className="py-6 text-center text-[13px] text-ink-muted">Chưa có lớp nào.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </AdminShell>
  );
}

function The({
  nhan,
  giaTri,
  phu,
  icon,
  mau,
  tienDo,
  huyHieu
}: {
  nhan: string;
  giaTri: string;
  phu: string;
  icon: string;
  mau: string;
  tienDo?: number;
  huyHieu?: string;
}): JSX.Element {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="stat-label">{nhan}</p>
          <p className="stat-value mt-2">{giaTri}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lg ${mau}`} aria-hidden>
          {icon}
        </span>
      </div>

      {typeof tienDo === 'number' && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, tienDo)}%` }} />
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <p className="truncate text-[11.5px] text-ink-muted">{phu}</p>
        {huyHieu && (
          <span className="shrink-0 rounded-pill bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success">{huyHieu}</span>
        )}
      </div>
    </div>
  );
}

function TheSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="card">
          <div className="h-3 w-24 animate-pulse rounded bg-line" />
          <div className="mt-3 h-7 w-16 animate-pulse rounded bg-line" />
          <div className="mt-3 h-2 w-full animate-pulse rounded bg-line" />
        </div>
      ))}
    </div>
  );
}
