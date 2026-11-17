/**
 * Khung giao diện: sidebar trái cố định + navbar trên, kiểu dashboard quản trị.
 *
 * Trên điện thoại, sidebar ẩn thành ngăn kéo mở bằng nút menu.
 */
import { useState, type ReactNode } from 'react';

export type MucDieuHuong = { key: string; nhan: string; icon: string };

type Props = {
  tieuDe: string;
  phuDe?: string;
  ma: string;
  lop: string;
  cacMuc: MucDieuHuong[];
  dangChon: string;
  onChon: (key: string) => void;
  onDangXuat: () => void;
  children: ReactNode;
};

export default function AppShell({
  tieuDe,
  phuDe,
  ma,
  lop,
  cacMuc,
  dangChon,
  onChon,
  onDangXuat,
  children
}: Props): JSX.Element {
  const [moMenu, setMoMenu] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-line bg-surface transition-transform duration-200 ${
          moMenu ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white">
            <span aria-hidden>✦</span>
          </span>
          <span className="text-[18px] font-bold text-ink-strong">Xoay Chiều</span>
        </div>

        <nav className="space-y-1 p-3">
          {cacMuc.map(muc => {
            const chon = muc.key === dangChon;
            return (
              <button
                key={muc.key}
                type="button"
                onClick={() => {
                  onChon(muc.key);
                  setMoMenu(false);
                }}
                aria-current={chon ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition ${
                  chon
                    ? 'bg-primary-soft font-semibold text-primary'
                    : 'text-ink hover:bg-canvas hover:text-ink-strong'
                }`}
              >
                <span aria-hidden className="w-5 text-center">
                  {muc.icon}
                </span>
                {muc.nhan}
              </button>
            );
          })}
        </nav>
      </aside>

      {moMenu && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMoMenu(false)}
          className="fixed inset-0 z-30 bg-ink-strong/20 lg:hidden"
        />
      )}

      {/* Vùng nội dung */}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setMoMenu(true)}
            className="rounded-lg p-2 text-ink transition hover:bg-canvas lg:hidden"
            aria-label="Mở menu"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold text-ink-strong">{tieuDe}</h1>
            {phuDe && <p className="truncate text-[12px] text-ink-muted">{phuDe}</p>}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-tight text-ink-strong">{ma}</p>
              <p className="text-[11px] leading-tight text-ink-muted">{lop}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {ma.slice(0, 2)}
            </span>
            <button
              type="button"
              onClick={onDangXuat}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-primary/40 hover:text-primary"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
