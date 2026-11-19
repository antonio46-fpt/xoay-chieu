/**
 * Ngăn kéo trượt từ bên phải, dùng để xem chi tiết mà không rời trang.
 *
 * Đóng bằng: nút X, phím Esc, hoặc bấm vùng tối bên ngoài.
 */
import { useEffect, type ReactNode } from 'react';

type Props = {
  mo: boolean;
  onDong: () => void;
  tieuDe: string;
  phuDe?: string;
  children: ReactNode;
};

export default function Drawer({ mo, onDong, tieuDe, phuDe, children }: Props): JSX.Element | null {
  useEffect(() => {
    if (!mo) return;
    function khiPhim(e: KeyboardEvent): void {
      if (e.key === 'Escape') onDong();
    }
    document.addEventListener('keydown', khiPhim);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', khiPhim);
      document.body.style.overflow = '';
    };
  }, [mo, onDong]);

  if (!mo) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={tieuDe}>
      <button type="button" aria-label="Đóng" onClick={onDong} className="absolute inset-0 bg-ink-strong/40" />

      <section
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-line bg-surface shadow-[-10px_0_30px_rgba(15,23,42,0.18)]"
        style={{ animation: 'xc-drawer-in 0.22s cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[16px] font-bold text-ink-strong">{tieuDe}</h2>
            {phuDe && <p className="truncate text-[12px] text-ink-muted">{phuDe}</p>}
          </div>
          <button
            type="button"
            onClick={onDong}
            aria-label="Đóng"
            className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[13px] text-ink transition hover:border-accent/50 hover:text-accent"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </section>
    </div>
  );
}
