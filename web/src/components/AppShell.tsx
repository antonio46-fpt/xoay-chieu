/**
 * Khung giao diện: sidebar trái cố định + navbar trên, kiểu dashboard quản trị.
 *
 * Trên điện thoại, sidebar ẩn thành ngăn kéo mở bằng nút menu.
 */
import { useState, type ReactNode } from 'react';
import StarFall from './StarFall';
import ThemeToggle from './ThemeToggle';

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
    <div className="relative min-h-screen">
      {/* Ảnh nền WebP: nhẹ hơn JPEG cùng độ nét, phủ kín màn hình */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        aria-hidden
        style={{ backgroundImage: 'image-set(url(/nen3.webp) type("image/webp"), url(/nen3.jpg) type("image/jpeg"))' }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{ background: 'rgba(4,12,30,0.68)' }}
      />

      {/* Sao vàng rơi tự do */}
      <StarFall />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-white/15 bg-white/60 backdrop-blur-md transition-transform duration-200 ${
          moMenu ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Banner thương hiệu */}
        <div className="relative flex h-[74px] items-center gap-3 border-b border-white/15 px-4">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#7b7eff] to-[#3b3ec8] shadow-[0_10px_22px_-8px_rgba(90,94,255,0.9)]">
            <span
              className="absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/25"
              aria-hidden
            />
            <img
              src="/chong-chong-v3.png"
              alt=""
              width={30}
              height={30}
              className="h-[26px] w-[26px] animate-spin object-contain [animation-duration:18s]"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-ink-strong">
              Xoay Chiều
            </span>
            <span className="mt-0.5 block truncate text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Bốn tuần · một góc nhìn
            </span>
          </span>
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

      {/* Vùng nội dung: phải nằm trên các lớp nền fixed */}
      <div className="relative z-10 lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/20 bg-white/85 px-4 backdrop-blur-md lg:px-6">
          <button
            type="button"
            onClick={() => setMoMenu(true)}
            className="rounded-lg p-2 text-ink transition hover:bg-canvas lg:hidden"
            aria-label="Mở menu"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold text-[#0f2340]">{tieuDe}</h1>
            {phuDe && <p className="truncate text-[12px] font-medium text-[#41597a]">{phuDe}</p>}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
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
