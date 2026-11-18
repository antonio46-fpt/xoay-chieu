import { useEffect, useState } from 'react';
import { api, ApiError, authApi, type PhienNguoiDung } from '../../api/client';

type TongQuanAdmin = {
  tongQuan: {
    soTruong: number;
    soLop: number;
    soHocSinh: number;
    soDangHoatDong: number;
    soBiKhoa: number;
    soBaiNop: number;
  };
  theoTuan: { tuan: number; soBai: number }[];
  theoLop: { lop: string; truong: string; soBai: number }[];
};

const MUC = [
  { key: 'tong-quan', nhan: 'Tổng quan', icon: '▦' },
  { key: 'hoc-sinh', nhan: 'Học sinh', icon: '▤' },
  { key: 'nhap-xuat', nhan: 'Nhập / Xuất', icon: '⇅' },
  { key: 'nhat-ky', nhan: 'Nhật ký', icon: '☰' }
];

export default function AdminOverview({ phien }: { phien: PhienNguoiDung }): JSX.Element {
  const [duLieu, setDuLieu] = useState<TongQuanAdmin | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    api<TongQuanAdmin>('/api/admin/overview')
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
  const the = [
    { nhan: 'Trường', giaTri: t?.soTruong, icon: '🏫', mau: 'bg-primary-soft text-primary' },
    { nhan: 'Lớp', giaTri: t?.soLop, icon: '▤', mau: 'bg-accent-soft text-accent' },
    { nhan: 'Học sinh', giaTri: t?.soHocSinh, icon: '👥', mau: 'bg-success-soft text-success' },
    { nhan: 'Bài đã nộp', giaTri: t?.soBaiNop, icon: '✓', mau: 'bg-warning-soft text-warning' }
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex">
        <aside className="min-h-screen w-[240px] shrink-0 border-r border-line bg-surface">
          <div className="flex h-16 items-center gap-2 border-b border-line px-4">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-white">✦</span>
            <span className="font-display text-[15px] font-bold text-ink-strong">Xoay Chiều</span>
          </div>
          <p className="px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">Quản trị</p>
          <nav className="mt-2 space-y-1 p-2">
            {MUC.map(m => {
              const laHocSinh = m.key === 'hoc-sinh';
              const dangXay = m.key !== 'tong-quan' && !laHocSinh;
              return (
                <button
                  key={m.key}
                  type="button"
                  disabled={dangXay}
                  onClick={() => {
                    if (laHocSinh) window.location.assign('/admin/students');
                  }}
                  title={dangXay ? 'Mục này đang được xây' : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition ${
                    m.key === 'tong-quan'
                      ? 'bg-accent-soft font-semibold text-accent'
                      : dangXay
                        ? 'cursor-not-allowed text-ink-muted/60'
                        : 'text-ink hover:bg-canvas hover:text-ink-strong'
                  }`}
                >
                  <span aria-hidden className="w-4 text-center">
                    {m.icon}
                  </span>
                  {m.nhan}
                  {dangXay && <span className="ml-auto text-[10px] font-normal">đang xây</span>}
                </button>
              );
            })}
          </nav>
          <div className="absolute bottom-4 left-4 w-[200px]">
            <button
              type="button"
              onClick={() => {
                void authApi.logout().finally(() => window.location.assign('/'));
              }}
              className="w-full rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-ink"
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
            <div>
              <h1 className="font-display text-[17px] font-bold text-ink-strong">Tổng quan hệ thống</h1>
              <p className="text-[12px] text-ink-muted">Quản trị · {phien.user.username}</p>
            </div>
          </header>

          <div className="p-6">
            {loi && (
              <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
                {loi}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {the.map(x => (
                <div key={x.nhan} className="card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="stat-label">{x.nhan}</p>
                      <p className="stat-value mt-2">{x.giaTri ?? '—'}</p>
                    </div>
                    <span className={`grid h-11 w-11 place-items-center rounded-lg text-lg ${x.mau}`} aria-hidden>
                      {x.icon}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="card">
                <h2 className="font-display text-[15px] font-bold text-ink-strong">Bài nộp theo tuần</h2>
                <ul className="mt-3 space-y-2">
                  {(duLieu?.theoTuan ?? []).map(t2 => (
                    <li key={t2.tuan} className="flex items-center justify-between text-[14px]">
                      <span className="text-ink">Tuần {t2.tuan}</span>
                      <span className="font-semibold text-ink-strong">{t2.soBai}</span>
                    </li>
                  ))}
                  {(duLieu?.theoTuan ?? []).length === 0 && <li className="text-[13px] text-ink-muted">Chưa có dữ liệu.</li>}
                </ul>
              </div>

              <div className="card">
                <h2 className="font-display text-[15px] font-bold text-ink-strong">Theo lớp</h2>
                <ul className="mt-3 space-y-2">
                  {(duLieu?.theoLop ?? []).slice(0, 8).map(l => (
                    <li key={`${l.truong}-${l.lop}`} className="flex items-center justify-between text-[14px]">
                      <span className="truncate text-ink">
                        {l.truong} · {l.lop}
                      </span>
                      <span className="font-semibold text-ink-strong">{l.soBai}</span>
                    </li>
                  ))}
                  {(duLieu?.theoLop ?? []).length === 0 && <li className="text-[13px] text-ink-muted">Chưa có dữ liệu.</li>}
                </ul>
              </div>
            </div>

            <p className="mt-4 text-[12px] text-ink-muted">
              Trang này đọc dữ liệu thật từ <code>/api/admin/overview</code>. Các mục Học sinh, Nhập/Xuất, Nhật ký
              đang được xây tiếp.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
