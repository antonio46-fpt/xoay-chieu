/**
 * Khung chung cho mọi trang quản trị: sidebar + topbar + menu tài khoản.
 */
import type { ReactNode } from 'react';
import type { PhienNguoiDung } from '../../api/client';
import { authApi } from '../../api/client';
import UserMenu from '../../components/UserMenu';
import { Toaster } from '../../components/admin/toast';

export type MucAdmin = 'tong-quan' | 'hoc-sinh' | 'bai-nop' | 'noi-dung';

type Props = {
  phien: PhienNguoiDung;
  tieuDe: string;
  phuDe?: string;
  dangChon: MucAdmin;
  onDoiMatKhau?: () => void;
  children: ReactNode;
};

const MUC: { key: MucAdmin; nhan: string; icon: string; duong: string; san: boolean }[] = [
  { key: 'tong-quan', nhan: 'Tổng quan', icon: '▦', duong: '/admin', san: true },
  { key: 'hoc-sinh', nhan: 'Học sinh & tài khoản', icon: '▤', duong: '/admin/students', san: true },
  { key: 'bai-nop', nhan: 'Theo dõi bài nộp', icon: '✎', duong: '/admin/submissions', san: true },
  { key: 'noi-dung', nhan: 'Nội dung 4 tuần', icon: '☰', duong: '/admin/content', san: true }
];

const NHAN_VAI: Record<string, string> = {
  teacher: 'GIÁO VIÊN',
  coordinator: 'ĐIỀU PHỐI',
  admin: 'ADMIN',
  super_admin: 'ADMIN',
  research_viewer: 'NGHIÊN CỨU'
};

export default function AdminShell({ phien, tieuDe, phuDe, dangChon, onDoiMatKhau, children }: Props): JSX.Element {
  const nhan = NHAN_VAI[phien.user.role] ?? 'ADMIN';

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-[74px] shrink-0 items-center gap-3 border-b border-line px-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-primary">
            <img src="/chong-chong-v3.png" alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-display text-[16px] font-bold leading-tight text-ink-strong">Xoay Chiều</span>
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-accent">
                {nhan}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-ink-muted">{phien.user.username}</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {MUC.map(m => {
            const chon = m.key === dangChon;
            return (
              <button
                key={m.key}
                type="button"
                disabled={!m.san}
                onClick={() => {
                  if (m.san) window.location.assign(m.duong);
                }}
                title={m.san ? undefined : 'Mục này đang được xây'}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition ${
                  chon
                    ? 'bg-accent-soft font-semibold text-accent'
                    : m.san
                      ? 'text-ink hover:bg-canvas hover:text-ink-strong'
                      : 'cursor-not-allowed text-ink-muted/60'
                }`}
              >
                <span aria-hidden className="w-4 shrink-0 text-center">
                  {m.icon}
                </span>
                <span className="truncate">{m.nhan}</span>
                {!m.san && <span className="ml-auto text-[10px]">đang xây</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-ink-muted transition hover:bg-canvas hover:text-ink-strong"
          >
            <span aria-hidden>←</span> Về giao diện học sinh
          </a>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[17px] font-bold text-ink-strong">{tieuDe}</h1>
            {phuDe && <p className="truncate text-[12px] font-medium text-ink-muted">{phuDe}</p>}
          </div>

          <div className="hidden items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[11px] font-semibold text-ink-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Khu quản trị
          </div>

          <UserMenu
            ma={phien.user.username}
            lop={NHAN_VAI[phien.user.role] ?? 'Quản trị'}
            vai={phien.user.role}
            onDoiMatKhau={onDoiMatKhau}
            onDangXuat={() => {
              void authApi.logout().finally(() => window.location.assign('/'));
            }}
          />
        </header>

        <main className="mx-auto max-w-[1240px] px-4 py-6 lg:px-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
