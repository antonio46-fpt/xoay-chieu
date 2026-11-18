import { useState, type FormEvent } from 'react';
import { ApiError, authApi, type PhienNguoiDung } from '../api/client';

type Props = { onSuccess: (phien: PhienNguoiDung) => void };

const DIEM_NHAN = [
  { icon: '✦', tieuDe: 'Bốn tuần, bốn cách nhìn', moTa: 'Mỗi tuần một trải nghiệm ngắn, không chấm điểm.' },
  { icon: '⏱', tieuDe: '15 đến 45 phút mỗi tuần', moTa: 'Làm trên lớp, tự lưu tiến độ khi mất mạng.' },
  { icon: '🔒', tieuDe: 'Riêng tư theo thiết kế', moTa: 'Không lưu họ tên; nội dung nhạy cảm được che.' }
];

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
      setLoi(e instanceof ApiError ? e.message : 'Không đăng nhập được. Kiểm tra kết nối mạng rồi thử lại.');
      setPassword('');
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04141f] text-[#e6f6fa]">
      {/* Nền */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ background: 'radial-gradient(70% 60% at 22% 40%, #12566b 0%, #0a2b3d 45%, #04141f 100%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 10% 20%, #d6f4fb 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 84% 14%, #ffffff 50%, transparent 51%),' +
            'radial-gradient(1.5px 1.5px at 28% 72%, #bfeaf5 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 92% 58%, #e8fbff 50%, transparent 51%),' +
            'radial-gradient(1px 1px at 62% 38%, #ffffff 50%, transparent 51%)',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8">
        {/* Cột trái: thương hiệu */}
        <section className="text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <img
              src="/chong-chong-v3.png"
              alt=""
              width={176}
              height={176}
              className="h-[128px] w-[128px] animate-spin object-contain drop-shadow-[0_16px_30px_rgba(3,20,28,0.7)] [animation-duration:14s] lg:h-[176px] lg:w-[176px]"
            />
          </div>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#7fd6e6]">Xoay Chiều</p>
          <h1 className="mt-4 text-[34px] font-black leading-[1.08] tracking-tight text-white sm:text-[42px] lg:text-[46px]">
            Mỗi góc nhìn
            <br />
            <span className="bg-gradient-to-r from-[#7ff0ff] to-[#3fb8d4] bg-clip-text text-transparent">
              một điều mới
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[38ch] text-[14px] leading-relaxed text-[#9cc4d0] lg:mx-0">
            Hành trình học tập bốn tuần: thử, nghĩ, nối và chia sẻ. Không có đáp án đúng hay sai.
          </p>

          <ul className="mx-auto mt-8 max-w-[42ch] space-y-3 text-left lg:mx-0">
            {DIEM_NHAN.map(d => (
              <li key={d.tieuDe} className="flex gap-3">
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.07] text-[15px] text-[#7fd6e6]"
                  aria-hidden
                >
                  {d.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-white">{d.tieuDe}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#8fb3c0]">{d.moTa}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Cột phải: form */}
        <section className="w-full">
          <form
            onSubmit={gui}
            noValidate
            className="mx-auto w-full max-w-[420px] rounded-2xl border border-white/15 bg-[#06232e]/70 p-6 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8"
          >
            <h2 className="text-[20px] font-bold text-white">Đăng nhập</h2>
            <p className="mt-1 text-[13px] text-[#9cc4d0]">Dùng tài khoản do giáo viên cấp.</p>

            <div className="mt-6">
              <label htmlFor="username" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7fd6e6]">
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5f8b99]" aria-hidden>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="3.6" />
                    <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="username"
                  name="username"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-3 pl-10 pr-3.5 text-[15px] text-white outline-none transition placeholder:text-[#6f929f] hover:border-white/25 focus:border-[#3fd4e8] focus:bg-white/[0.1] focus:ring-4 focus:ring-[#3fd4e8]/20"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="hs10a3-01"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#7fd6e6]">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5f8b99]" aria-hidden>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="4" y="10.5" width="16" height="9.5" rx="2.4" />
                    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={hienMatKhau ? 'text' : 'password'}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-3 pl-10 pr-16 text-[15px] text-white outline-none transition placeholder:text-[#6f929f] hover:border-white/25 focus:border-[#3fd4e8] focus:bg-white/[0.1] focus:ring-4 focus:ring-[#3fd4e8]/20"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setHienMatKhau(v => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#7fd6e6] transition hover:bg-white/10"
                  aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {hienMatKhau ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            {loi && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-[#ff8f7a]/40 bg-[#ff5f47]/15 px-3.5 py-2.5 text-[13px] font-medium text-[#ffc9bf]"
              >
                <span aria-hidden>⚠</span>
                <span>{loi}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={dangGui || !username || !password}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#63e6f5] to-[#1a9fb8] px-4 py-3.5 text-[15px] font-bold text-[#04141f] shadow-[0_12px_30px_-10px_rgba(60,220,240,0.9)] transition hover:-translate-y-0.5 hover:from-[#8bf3ff] hover:to-[#23b8d2] active:translate-y-0 disabled:pointer-events-none disabled:from-[#17323c] disabled:to-[#132a33] disabled:text-[#5f828d] disabled:shadow-none"
            >
              {dangGui ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#04141f]/30 border-t-[#04141f]" />
                  Đang đăng nhập…
                </>
              ) : (
                'Vào hành trình →'
              )}
            </button>

            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-[#7fa3af]">
              Quên mật khẩu thì báo giáo viên chủ nhiệm để được cấp lại.
            </p>
          </form>

          <p className="mx-auto mt-6 max-w-[420px] text-center text-[11px] text-[#5c7d89]">
            Tài khoản chỉ dùng cho nghiên cứu. Không ghi họ tên bạn bè hay thông tin cá nhân vào bài.
          </p>
        </section>
      </div>
    </div>
  );
}
