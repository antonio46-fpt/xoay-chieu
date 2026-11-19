/**
 * Thông báo nổi ở góc màn hình.
 *
 * Dùng store ngoài React để bất kỳ chỗ nào cũng gọi được `toast('...')`
 * mà không cần bọc Context qua nhiều tầng component.
 */
import { useEffect, useState } from 'react';

export type LoaiToast = 'ok' | 'loi' | 'thong-tin';

type Muc = { id: number; noiDung: string; loai: LoaiToast };

let danhSach: Muc[] = [];
let demId = 0;
const nguoiNghe = new Set<(ds: Muc[]) => void>();

function phatLoa(): void {
  for (const nghe of nguoiNghe) nghe([...danhSach]);
}

/** Hiện một thông báo, tự biến mất sau 4 giây. */
export function toast(noiDung: string, loai: LoaiToast = 'ok'): void {
  const id = ++demId;
  danhSach = [...danhSach, { id, noiDung, loai }];
  phatLoa();
  window.setTimeout(() => {
    danhSach = danhSach.filter(m => m.id !== id);
    phatLoa();
  }, 4200);
}

const MAU: Record<LoaiToast, string> = {
  ok: 'border-success/40 bg-success-soft text-ink-strong',
  loi: 'border-danger/40 bg-danger-soft text-ink-strong',
  'thong-tin': 'border-line bg-surface text-ink-strong'
};

const BIEU_TUONG: Record<LoaiToast, string> = { ok: '✓', loi: '!', 'thong-tin': 'i' };

/** Gắn một lần ở khung trang quản trị. */
export function Toaster(): JSX.Element {
  const [ds, setDs] = useState<Muc[]>([]);

  useEffect(() => {
    nguoiNghe.add(setDs);
    setDs([...danhSach]);
    return () => {
      nguoiNghe.delete(setDs);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
      {ds.map(m => (
        <div
          key={m.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] font-medium shadow-[0_10px_25px_rgba(15,23,42,0.15)] ${MAU[m.loai]}`}
          style={{ animation: 'xc-menu-in 0.18s ease-out' }}
        >
          <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/70 text-[11px] font-bold">
            {BIEU_TUONG[m.loai]}
          </span>
          <span className="leading-snug">{m.noiDung}</span>
        </div>
      ))}
    </div>
  );
}
