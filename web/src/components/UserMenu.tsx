import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../lib/theme';

type Props = {
  ma: string;
  lop: string;
  vai: string;
  onDoiMatKhau?: () => void;
  onDangXuat: () => void;
};

const NHAN_VAI: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  coordinator: 'Điều phối viên',
  admin: 'Quản trị',
  super_admin: 'Quản trị cấp cao',
  research_viewer: 'Nghiên cứu'
};

/** Cụm người dùng ở góc phải topbar: avatar + menu thả xuống. */
export default function UserMenu({ ma, lop, vai, onDoiMatKhau, onDangXuat }: Props): JSX.Element {
  const [mo, setMo] = useState(false);
  const khung = useRef<HTMLDivElement>(null);
  const { dark, doi: doiTheme } = useTheme();

  useEffect(() => {
    if (!mo) return;

    function khiBamNgoai(event: MouseEvent): void {
      if (khung.current && !khung.current.contains(event.target as Node)) setMo(false);
    }
    function khiPhim(event: KeyboardEvent): void {
      if (event.key === 'Escape') setMo(false);
    }

    document.addEventListener('mousedown', khiBamNgoai);
    document.addEventListener('keydown', khiPhim);
    return () => {
      document.removeEventListener('mousedown', khiBamNgoai);
      document.removeEventListener('keydown', khiPhim);
    };
  }, [mo]);

  return (
    <div className="relative" ref={khung}>
      {/* Nút kích hoạt */}
      <button
        type="button"
        onClick={() => setMo(v => !v)}
        aria-haspopup="menu"
        aria-expanded={mo}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 transition hover:border-accent/40 hover:bg-canvas"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] text-[13px] font-bold text-white">
          {ma.slice(0, 2)}
        </span>
        <span className="hidden text-[13px] font-semibold text-ink-strong sm:block">{ma}</span>
        <span
          aria-hidden
          className={`hidden text-[10px] text-ink-muted transition-transform duration-200 sm:block ${mo ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {/* Menu thả xuống */}
      {mo && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[260px] origin-top-right overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
          style={{ animation: 'xc-menu-in 0.16s ease-out' }}
        >
          {/* Phần 1: thông tin */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0D9488] text-sm font-bold text-white">
              {ma.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-ink-strong">{ma}</p>
              <p className="truncate text-[11.5px] text-ink-muted">{lop}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                {NHAN_VAI[vai] ?? vai}
              </p>
            </div>
          </div>

          <div className="h-px bg-line" />

          {/* Phần 2: tiện ích */}
          <div className="py-1.5">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={dark}
              onClick={doiTheme}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13.5px] text-ink transition hover:bg-canvas"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden>{dark ? '☀' : '☾'}</span>
                Giao diện tối
              </span>
              <span
                aria-hidden
                className={`relative h-5 w-9 rounded-full transition ${dark ? 'bg-accent' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    dark ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            {onDoiMatKhau && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMo(false);
                  onDoiMatKhau();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] text-ink transition hover:bg-canvas"
              >
                <span aria-hidden>⚿</span>
                Đổi mật khẩu
              </button>
            )}
          </div>

          <div className="h-px bg-line" />

          {/* Phần 3: thoát */}
          <div className="py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMo(false);
                onDangXuat();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-medium text-[#EF4444] transition hover:bg-[rgba(239,68,68,0.1)]"
            >
              <span aria-hidden>⏻</span>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
