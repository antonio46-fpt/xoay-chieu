import { useState, type FormEvent } from 'react';
import { ApiError, authApi, type PhienNguoiDung } from '../api/client';
import AppShell from '../components/AppShell';

type Props = {
  batBuoc: boolean;
  onXong: () => void;
  onHuy?: () => void;
  /** Có khi người dùng tự đổi mật khẩu; không có khi bị buộc đổi lần đầu. */
  phien?: PhienNguoiDung;
  onNavigate?: (key: string) => void;
  onLoggedOut?: () => void;
};

const LOI_MAU = 'Mật khẩu cần ít nhất 8 ký tự, có cả chữ cái và chữ số.';

export default function ChangePasswordPage({ batBuoc, onXong, onHuy, phien, onNavigate, onLoggedOut }: Props): JSX.Element {
  const [hienTai, setHienTai] = useState('');
  const [moi, setMoi] = useState('');
  const [nhacLai, setNhacLai] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (dangGui) return;

    if (moi !== nhacLai) {
      setLoi('Hai lần nhập mật khẩu mới không khớp nhau.');
      return;
    }
    if (moi.length < 8 || !/[a-zA-Z]/.test(moi) || !/[0-9]/.test(moi)) {
      setLoi(LOI_MAU);
      return;
    }

    setLoi(null);
    setDangGui(true);
    try {
      await authApi.changePassword(hienTai, moi);
      onXong();
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không đổi được mật khẩu. Kiểm tra mạng rồi thử lại.');
    } finally {
      setDangGui(false);
    }
  }

  const khoiForm = (
    <form onSubmit={gui} className="card w-full space-y-4" noValidate>
      <div>
        <label htmlFor="hienTai" className="mb-1.5 block text-[13px] font-semibold text-ink-strong">
          Mật khẩu hiện tại
        </label>
        <input
          id="hienTai"
          type="password"
          className="field-input"
          autoComplete="current-password"
          required
          value={hienTai}
          onChange={e => setHienTai(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="moi" className="mb-1.5 block text-[13px] font-semibold text-ink-strong">
          Mật khẩu mới
        </label>
        <input
          id="moi"
          type="password"
          className="field-input"
          autoComplete="new-password"
          required
          value={moi}
          onChange={e => setMoi(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="nhacLai" className="mb-1.5 block text-[13px] font-semibold text-ink-strong">
          Nhập lại mật khẩu mới
        </label>
        <input
          id="nhacLai"
          type="password"
          className="field-input"
          autoComplete="new-password"
          required
          value={nhacLai}
          onChange={e => setNhacLai(e.target.value)}
        />
      </div>

      {loi && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-ink-strong">
          {loi}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={dangGui || !hienTai || !moi || !nhacLai}>
        {dangGui ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
      </button>

      {!batBuoc && onHuy && (
        <button type="button" onClick={onHuy} className="w-full text-center text-xs font-semibold text-ink-muted hover:text-ink-strong">
          Để sau
        </button>
      )}
    </form>
  );

  // Bắt buộc đổi lần đầu: không có thanh bên, không lối thoát.
  if (batBuoc || !phien) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-canvas px-4 py-10">
        <main className="w-full max-w-[440px]">
          <header className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-xl text-white">🔑</div>
            <h1 className="font-display text-2xl font-bold text-ink-strong">Đổi mật khẩu lần đầu</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Tài khoản này dùng mật khẩu do giáo viên cấp. Hãy đặt mật khẩu riêng của bạn trước khi bắt đầu.
            </p>
          </header>
          {khoiForm}
        </main>
      </div>
    );
  }

  // Tự nguyện đổi: giữ nguyên khung điều hướng.
  return (
    <AppShell
      tieuDe="Đổi mật khẩu"
      phuDe={phien.student ? `${phien.student.truong} · ${phien.student.lop}` : undefined}
      ma={phien.student?.ma ?? phien.user.username}
      lop={phien.student?.lop ?? ''}
      cacMuc={[
        { key: 'hanh-trinh', nhan: 'Hành trình', icon: '▦' },
        { key: 'bai-da-nop', nhan: 'Bài đã nộp', icon: '▤' },
        { key: 'doi-mat-khau', nhan: 'Đổi mật khẩu', icon: '⚿' }
      ]}
      dangChon="doi-mat-khau"
      onChon={key => onNavigate?.(key)}
      onDangXuat={() => {
        void authApi.logout().finally(() => onLoggedOut?.());
      }}
    >
      <div className="mx-auto flex min-h-[72vh] w-full max-w-[440px] flex-col justify-center">
        <p className="hint-mat-khau mb-5 text-center text-[14px] font-medium">
          Mật khẩu mới cần ít nhất 8 ký tự, có cả chữ cái và chữ số.
        </p>
        {khoiForm}
      </div>
    </AppShell>
  );
}
