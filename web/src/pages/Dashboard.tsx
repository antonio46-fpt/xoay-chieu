import { useEffect, useState } from 'react';
import { ApiError, authApi, meApi, type PhienNguoiDung, type TongQuan } from '../api/client';
import { soBaiCho, theoDoi } from '../lib/queue';
import AppShell from '../components/AppShell';

type Props = {
  phien: PhienNguoiDung;
  onLoggedOut: () => void;
  onOpenWeek: (tuan: number) => void;
  onOpenReview: () => void;
  onOpenChangePassword: () => void;
};

const TUAN = [
  { so: 1, ten: 'Tự nhận thức', phut: 15, mo_ta: 'Mình đã thật sự hiểu chưa?' },
  { so: 2, ten: 'Linh hoạt thay đổi', phut: 15, mo_ta: 'Thử một cách khác' },
  { so: 3, ten: 'Linh hoạt con người', phut: 45, mo_ta: 'Thử đứng ở phía bạn' },
  { so: 4, ten: 'Linh hoạt kết quả', phut: 45, mo_ta: 'Mang điều gì đi tiếp?' }
] as const;

function ngay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function Dashboard({
  phien,
  onLoggedOut,
  onOpenWeek,
  onOpenReview,
  onOpenChangePassword
}: Props): JSX.Element {
  const [tongQuan, setTongQuan] = useState<TongQuan | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [soCho, setSoCho] = useState(soBaiCho());

  useEffect(() => theoDoi(setSoCho), []);

  useEffect(() => {
    let huy = false;
    meApi
      .overview()
      .then(kq => {
        if (!huy) setTongQuan(kq);
      })
      .catch(e => {
        if (huy) return;
        if (e instanceof ApiError && e.status === 401) {
          onLoggedOut();
          return;
        }
        setLoi(e instanceof ApiError ? e.message : 'Không tải được dữ liệu.');
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [onLoggedOut]);

  const hocSinh = tongQuan?.hocSinh ?? phien.student;
  const daNop = tongQuan?.soTuanDaNop ?? 0;
  const phanTram = Math.round((daNop / 4) * 100);

  const theThongKe = [
    { nhan: 'Tuần đã nộp', giaTri: `${daNop}/4`, mau: 'bg-primary-soft text-primary', icon: '✓' },
    { nhan: 'Hoàn thành', giaTri: `${phanTram}%`, mau: 'bg-success-soft text-success', icon: '▲' },
    { nhan: 'Tuần còn lại', giaTri: String(4 - daNop), mau: 'bg-warning-soft text-warning', icon: '◷' },
    { nhan: 'Bài chờ gửi', giaTri: String(soCho), mau: 'bg-info-soft text-info', icon: '⏳' }
  ];

  return (
    <AppShell
      tieuDe="Hành trình của tôi"
      phuDe={hocSinh ? `${hocSinh.truong} · ${hocSinh.lop}` : undefined}
      ma={hocSinh?.ma ?? phien.user.username}
      lop={hocSinh?.lop ?? ''}
      cacMuc={[
        { key: 'hanh-trinh', nhan: 'Hành trình', icon: '▦' },
        { key: 'bai-da-nop', nhan: 'Bài đã nộp', icon: '▤' },
        { key: 'doi-mat-khau', nhan: 'Đổi mật khẩu', icon: '⚿' }
      ]}
      dangChon="hanh-trinh"
      onChon={key => {
        if (key === 'bai-da-nop') onOpenReview();
        if (key === 'doi-mat-khau') onOpenChangePassword();
      }}
      onDangXuat={() => {
        void authApi.logout().finally(onLoggedOut);
      }}
    >
      {loi && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink-strong">
          {loi}
        </p>
      )}

      {soCho > 0 && (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-ink-strong">
          Còn {soCho} bài chưa gửi được. Hệ thống sẽ tự gửi lại khi có mạng.
        </p>
      )}

      {/* Bốn thẻ thống kê */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {theThongKe.map(t => (
          <div key={t.nhan} className="card">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="stat-label">{t.nhan}</p>
                <p className="stat-value mt-2 truncate">{dangTai ? '—' : t.giaTri}</p>
              </div>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lg ${t.mau}`} aria-hidden>
                {t.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tiến độ tổng */}
      <div className="card mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold">Tiến độ bốn tuần</h2>
            <p className="mt-0.5 text-[13px] text-ink">
              Mỗi tuần một cách nhìn khác. Không có đáp án đúng hay sai.
            </p>
          </div>
          <span className="rounded-pill bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary">
            {daNop}/4 tuần
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-pill bg-canvas">
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-700"
            style={{ width: `${phanTram}%` }}
            role="progressbar"
            aria-valuenow={daNop}
            aria-valuemin={0}
            aria-valuemax={4}
          />
        </div>
      </div>

      {/* Danh sách tuần */}
      <div className="card mt-4 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
          <h2 className="text-[17px] font-semibold">Bốn tuần, bốn trải nghiệm</h2>
          <button type="button" onClick={onOpenReview} className="text-[13px] font-semibold text-primary hover:underline">
            Xem bài đã nộp
          </button>
        </div>

        <ul className="divide-y divide-line">
          {TUAN.map(t => {
            const tt = tongQuan?.cacTuan.find(x => x.tuan === t.so);
            const nhan = tt?.daNop ? 'Đã nộp' : tt?.coBanNhap ? 'Có bản nháp' : 'Chưa bắt đầu';
            const mau = tt?.daNop
              ? 'bg-success-soft text-success'
              : tt?.coBanNhap
                ? 'bg-warning-soft text-warning'
                : 'bg-canvas text-ink';

            return (
              <li key={t.so} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-canvas/60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft font-bold text-primary">
                  {t.so}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink-strong">{t.mo_ta}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink">
                    {t.ten} · {t.phut} phút
                    {tt?.daNop ? ` · nộp ${ngay(tt.nopLuc)}` : ''}
                  </p>
                </div>
                <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${mau}`}>{nhan}</span>
                <button
                  type="button"
                  onClick={() => onOpenWeek(t.so)}
                  className={tt?.daNop ? 'btn-ghost min-h-[36px] px-3 py-1.5 text-[12px]' : 'btn-primary min-h-[36px] px-3 py-1.5 text-[12px]'}
                >
                  {tt?.daNop ? 'Làm lượt mới' : tt?.coBanNhap ? 'Tiếp tục' : 'Bắt đầu'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-5 text-center text-[12px] text-ink-muted">
        Bản nháp tự lưu trong lúc làm. Nộp xong vẫn xem lại được; muốn sửa thì làm lượt mới.
      </p>
    </AppShell>
  );
}
