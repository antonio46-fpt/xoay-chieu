import { useState, type FormEvent } from 'react';
import { ApiError, authApi, type PhienNguoiDung } from '../api/client';

type Props = { onSuccess: (phien: PhienNguoiDung) => void };

export default function LoginPage({ onSuccess }: Props): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (dangGui) return;
    setLoi(null);
    setDangGui(true);
    try {
      const phien = await authApi.login(username.trim(), password);
      onSuccess(phien);
    } catch (e) {
      const thongBao =
        e instanceof ApiError
          ? e.message
          : 'Không đăng nhập được. Kiểm tra kết nối mạng rồi thử lại.';
      setLoi(thongBao);
      setPassword('');
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <main className="w-full max-w-[420px]">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo to-indigo-mid text-2xl text-paper shadow-soft">
            <span aria-hidden>✦</span>
          </div>
          <h1 className="text-[26px] font-bold leading-tight">Xoay Chiều</h1>
          <p className="mt-1 text-sm text-ink-muted">Mỗi góc nhìn, một điều mới</p>
        </header>

        <form onSubmit={gui} className="card space-y-5" noValidate>
          <div>
            <label htmlFor="username" className="mb-1.5 block text-[13px] font-semibold">
              Tên đăng nhập
            </label>
            <input
              id="username"
              name="username"
              className="field-input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ví dụ: hs10a3-01"
              aria-invalid={loi ? true : undefined}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={hienMatKhau ? 'text' : 'password'}
                className="field-input pr-24"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-invalid={loi ? true : undefined}
              />
              <button
                type="button"
                onClick={() => setHienMatKhau(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-ink/5 hover:text-ink"
                aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {hienMatKhau ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          {loi && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-800"
            >
              {loi}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={dangGui || !username || !password}>
            {dangGui ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Đang đăng nhập…
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>

          <p className="text-center text-xs leading-relaxed text-ink-muted">
            Tài khoản do giáo viên cấp. Quên mật khẩu thì báo giáo viên chủ nhiệm để được cấp lại.
          </p>
        </form>
      </main>
    </div>
  );
}
