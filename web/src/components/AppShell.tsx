/**
 * Khung giao diện: sidebar trắng (thu gọn được) + topbar trắng.
 *
 * Thu gọn: trên máy tính, bấm nút ở chân sidebar để chuyển giữa dải rộng
 * 260px có nhãn và dải hẹp 76px chỉ còn icon. Trạng thái được ghi nhớ.
 */
import { useEffect, useState, type ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';
import StarFall from './StarFall';

export type MucDieuHuong = { key: string; nhan: string; icon: string };

type Props = {
  tieuDe: string;
  phuDe?: string;
  ma: string;
  lop: string;
  vai?: string;
  cacMuc: MucDieuHuong[];
  dangChon: string;
  onChon: (key: string) => void;
  onDoiMatKhau?: () => void;
  onDangXuat: () => void;
  children: ReactNode;
};

const KHOA_THU_GON = 'xoaychieu_sidebar_thu_gon';

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
  const [thuGon, setThuGon] = useState(false);
  const [quayNhanh, setQuayNhanh] = useState(false);

  /** Báº¥m logo: xoay má»™t vĂ²ng rĂµ rá»‡t rá»“i vá» trang chá»§. */
  function bamLogo(): void {
    setQuayNhanh(true);
    onChon('hanh-trinh');
    setMoMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    setThuGon(localStorage.getItem(KHOA_THU_GON) === '1');
  }, []);

  function doiThuGon(): void {
    setThuGon(v => {
      localStorage.setItem(KHOA_THU_GON, v ? '0' : '1');
      return !v;
    });
  }

  return (
    <div className="relative min-h-screen">
      {/* Ná»n trá»i sao má»›i + lá»›p tá»‘i nháº¹ */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-repeat"
        aria-hidden
        style={{ backgroundImage: 'url(/nen-sao.jpg)', backgroundSize: 'min(100%, 900px) auto' }}
      />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden style={{ background: 'rgba(4,14,26,0.35)' }} />

      {/* Sao vĂ ng rÆ¡i trĂªn ná»n */}
      <StarFall soLuong={44} />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-all duration-200 ${
          thuGon ? 'lg:w-[76px]' : 'lg:w-[260px]'
        } w-[260px] ${moMenu ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div
          className={`flex h-[74px] shrink-0 items-center gap-3 border-b border-line ${
            thuGon ? 'lg:justify-center lg:px-0' : ''
          } px-4`}
        >
          <button
            type="button"
            onClick={bamLogo}
            onAnimationEnd={() => setQuayNhanh(false)}
            aria-label="Vá» trang chá»§"
            title="Vá» trang chá»§"
            className={`group grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-primary transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent/60 ${
              quayNhanh ? 'logo-bam' : ''
            }`}
          >
            <img
              src="/chong-chong-v3.png"
              alt=""
              width={30}
              height={30}
              className="h-[26px] w-[26px] animate-spin object-contain [animation-duration:18s]"
            />
          </button>
          <span className={`min-w-0 ${thuGon ? 'lg:hidden' : ''}`}>
            <span className="block truncate font-display text-[17px] font-bold leading-tight text-ink-strong">
              Xoay Chiá»u
            </span>
            <span className="mt-0.5 block truncate text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Bá»‘n tuáº§n Â· má»™t gĂ³c nhĂ¬n
            </span>
          </span>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto p-3 ${thuGon ? 'lg:px-2' : ''}`}>
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
                title={thuGon ? muc.nhan : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition ${
                  thuGon ? 'lg:justify-center lg:px-0' : ''
                } ${chon ? 'bg-accent-soft font-semibold text-accent' : 'text-ink hover:bg-canvas hover:text-ink-strong'}`}
              >
                <span aria-hidden className="w-5 shrink-0 text-center">
                  {muc.icon}
                </span>
                <span className={`truncate ${thuGon ? 'lg:hidden' : ''}`}>{muc.nhan}</span>
              </button>
            );
          })}
        </nav>

        {/* NĂºt thu gá»n, chá»‰ hiá»‡n trĂªn mĂ¡y tĂ­nh */}
        <div className="hidden shrink-0 border-t border-line p-2 lg:block">
          <button
            type="button"
            onClick={doiThuGon}
            aria-label={thuGon ? 'Má»Ÿ rá»™ng thanh bĂªn' : 'Thu gá»n thanh bĂªn'}
            title={thuGon ? 'Má»Ÿ rá»™ng' : 'Thu gá»n'}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink-muted transition hover:bg-canvas hover:text-ink-strong ${
              thuGon ? 'justify-center px-0' : ''
            }`}
          >
            <span aria-hidden className="w-5 shrink-0 text-center">
              {thuGon ? 'Â»' : 'Â«'}
            </span>
            <span className={thuGon ? 'lg:hidden' : ''}>Thu gá»n</span>
          </button>
        </div>
      </aside>

      {moMenu && (
        <button
          type="button"
          aria-label="ÄĂ³ng menu"
          onClick={() => setMoMenu(false)}
          className="fixed inset-0 z-30 bg-ink-strong/20 lg:hidden"
        />
      )}

      {/* VĂ¹ng ná»™i dung */}
      <div className={`relative z-10 transition-all duration-200 ${thuGon ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMoMenu(true)}
            className="rounded-lg p-2 text-ink transition hover:bg-canvas lg:hidden"
            aria-label="Má»Ÿ menu"
          >
            â˜°
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[17px] font-bold text-ink-strong">{tieuDe}</h1>
            {phuDe && <p className="truncate text-[12px] font-medium text-ink-muted">{phuDe}</p>}
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
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-accent/50 hover:text-accent-hover"
            >
              ÄÄƒng xuáº¥t
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
