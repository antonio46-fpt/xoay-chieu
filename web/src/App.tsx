import { useEffect, useState } from 'react';
import { authApi, type PhienNguoiDung } from './api/client';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import WeekPage from './pages/WeekPage';
import ReviewPage from './pages/ReviewPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminOverview from './pages/admin/AdminOverview';
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
  const [dangDoiMatKhau, setDangDoiMatKhau] = useState(false);

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

  // Bắt buộc đổi mật khẩu ở lần đăng nhập đầu: chặn mọi màn hình khác.
  if (phien.user.phaiDoiMatKhau) {
    return (
      <ChangePasswordPage
        batBuoc
        onXong={() => {
          setPhien({ ...phien, user: { ...phien.user, phaiDoiMatKhau: false } });
        }}
      />
    );
  }

  if (dangDoiMatKhau) {
    return (
      <ChangePasswordPage
        batBuoc={false}
        onXong={() => setDangDoiMatKhau(false)}
        onHuy={() => setDangDoiMatKhau(false)}
        phien={phien}
        onNavigate={key => {
          if (key === 'hanh-trinh') setDangDoiMatKhau(false);
          if (key === 'bai-da-nop') {
            setDangDoiMatKhau(false);
            setManHinh({ ten: 'review' });
          }
        }}
        onLoggedOut={() => setPhien(null)}
      />
    );
  }

  // Khu quản trị: cùng phiên đăng nhập, phân biệt bằng vai và đường dẫn /admin
  const laAdmin = ['admin', 'super_admin', 'research_viewer'].includes(phien.user.role);
  const vaoAdmin = window.location.pathname.startsWith('/admin');

  if (vaoAdmin) {
    if (!laAdmin) {
      return (
        <div className="grid min-h-screen place-items-center bg-canvas px-4">
          <div className="card max-w-md text-center">
            <p className="text-sm text-ink">Tài khoản này không có quyền vào khu quản trị.</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => window.location.assign('/')}>
              Về trang học sinh
            </button>
          </div>
        </div>
      );
    }
    return <AdminOverview phien={phien} />;
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
    return (
      <ReviewPage
        phien={phien}
        onNavigate={key => {
          if (key === 'hanh-trinh') setManHinh({ ten: 'dashboard' });
          if (key === 'doi-mat-khau') setDangDoiMatKhau(true);
        }}
        onLoggedOut={() => setPhien(null)}
      />
    );
  }

  return (
    <Dashboard
      phien={phien}
      onLoggedOut={() => setPhien(null)}
      onOpenWeek={tuan => setManHinh({ ten: 'week', tuan })}
      onOpenReview={() => setManHinh({ ten: 'review' })}
      onOpenChangePassword={() => setDangDoiMatKhau(true)}
    />
  );
}