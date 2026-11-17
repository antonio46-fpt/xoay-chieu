import { useEffect, useState } from 'react';
import { authApi, type PhienNguoiDung } from './api/client';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import WeekPage from './pages/WeekPage';
import ReviewPage from './pages/ReviewPage';
import { batDauTheoDoiMang } from './lib/queue';

type ManHinh = { ten: 'dashboard' } | { ten: 'week'; tuan: number } | { ten: 'review' };

/**
 * Trạng thái cấp cao nhất: đang kiểm tra phiên → chưa đăng nhập → đã đăng nhập.
 *
 * Không lưu thông tin đăng nhập ở localStorage. Mỗi lần mở trang đều hỏi
 * /api/auth/me để biết phiên còn hiệu lực hay không.
 */
export default function App(): JSX.Element {
  const [phien, setPhien] = useState<PhienNguoiDung | null>(null);
  const [dangKiemTra, setDangKiemTra] = useState(true);
  const [manHinh, setManHinh] = useState<ManHinh>({ ten: 'dashboard' });

  // Gửi lại bài còn trong hàng đợi mỗi khi có mạng.
  useEffect(() => batDauTheoDoiMang(), []);

  useEffect(() => {
    let huy = false;
    authApi
      .me()
      .then(kq => {
        if (!huy) setPhien(kq);
      })
      .catch(() => {
        if (!huy) setPhien(null);
      })
      .finally(() => {
        if (!huy) setDangKiemTra(false);
      });
    return () => {
      huy = true;
    };
  }, []);

  if (dangKiemTra) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-ink-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-gold" />
          Đang kiểm tra phiên đăng nhập…
        </div>
      </div>
    );
  }

  if (!phien) return <LoginPage onSuccess={setPhien} />;

  if (phien.user.role !== 'student') {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Khu vực quản trị</p>
          <h1 className="mt-3 text-2xl font-bold">Trang quản trị đang được xây</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Tài khoản <strong>{phien.user.username}</strong> có vai <code>{phien.user.role}</code>. Giao diện
            quản trị sẽ nằm ở đường dẫn <code>/admin</code>.
          </p>
          <button
            type="button"
            className="btn-primary mt-6 w-full"
            onClick={() => {
              void authApi.logout().finally(() => setPhien(null));
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  if (manHinh.ten === 'week') {
    return (
      <WeekPage
        tuan={manHinh.tuan}
        onThoat={() => setManHinh({ ten: 'dashboard' })}
        onDaNop={() => undefined}
      />
    );
  }

  if (manHinh.ten === 'review') {
    return <ReviewPage onThoat={() => setManHinh({ ten: 'dashboard' })} />;
  }

  return (
    <Dashboard
      phien={phien}
      onLoggedOut={() => setPhien(null)}
      onOpenWeek={tuan => setManHinh({ ten: 'week', tuan })}
      onOpenReview={() => setManHinh({ ten: 'review' })}
    />
  );
}