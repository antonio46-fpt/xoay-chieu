/**
 * Đổi mật khẩu.
 *
 * Dùng cho hai trường hợp:
 *   - Bắt buộc ở lần đăng nhập đầu (tài khoản do quản trị cấp).
 *   - Tự nguyện đổi từ trang chính.
 *
 * Kiểm tra độ mạnh ở đây chỉ để báo lỗi sớm. Backend luôn kiểm tra lại.
 */
import { useState, type FormEvent } from 'react';
import { ApiError, authApi } from '../api/client';

type Props = {
  batBuoc: boolean;
  onXong: () => void;
  onHuy?: () => void;
};

const LOI_MAU = 'Mật khẩu cần ít nhất 8 ký tự, có cả chữ cái và chữ số.';

export default function ChangePasswordPage({ batBuoc, onXong, onHuy }: Props): JSX.Element {
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

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      {/* Nền Starry Night, phủ lớp sáng để chữ tối vẫn đọc rõ */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        aria-hidden
        style={{ backgroundImage: 'url(/nen2.jpg)' }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{ background: 'rgba(245,245,249,0.94)' }}
      />

      <main className="relative z-10 w-full max-w-[440px]">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo to-indigo-mid text-xl text-paper shadow-soft">
            <span aria-hidden>🔑</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#4b5563' }}>
            {batBuoc ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#6b7280' }}>
            {batBuoc
              ? 'Tài khoản này dùng mật khẩu do giáo viên cấp. Hãy đặt mật khẩu riêng của bạn trước khi bắt đầu.'
              : 'Mật khẩu mới cần ít nhất 8 ký tự, có cả chữ cái và chữ số.'}
          </p>
        </header>

        <form onSubmit={gui} className="card space-y-4" noValidate>
          <div>
            <label htmlFor="hienTai" className="mb-1.5 block text-[13px] font-semibold">
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
            <label htmlFor="moi" className="mb-1.5 block text-[13px] font-semibold">
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
            <label htmlFor="nhacLai" className="mb-1.5 block text-[13px] font-semibold">
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
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              {loi}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={dangGui || !hienTai || !moi || !nhacLai}>
            {dangGui ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
          </button>

          {!batBuoc && onHuy && (
            <button type="button" onClick={onHuy} className="w-full text-center text-xs font-semibold text-ink-muted hover:text-ink">
              Để sau
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
