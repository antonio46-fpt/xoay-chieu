import { useEffect, useState } from 'react';
import { ApiError, authApi, meApi, type PhienNguoiDung, type TongQuan } from '../api/client';
import { soBaiCho, theoDoi } from '../lib/queue';

type Props = {
  phien: PhienNguoiDung;
  onLoggedOut: () => void;
  onOpenWeek: (tuan: number) => void;
  onOpenReview: () => void;
};

const TUAN = [
  { so: 1, ten: 'Tự nhận thức', phut: 15, mo_ta: 'Mình đã thật sự hiểu chưa?' },
  { so: 2, ten: 'Linh hoạt thay đổi', phut: 15, mo_ta: 'Thử một cách khác' },
  { so: 3, ten: 'Linh hoạt con người', phut: 45, mo_ta: 'Thử đứng ở phía bạn' },
  { so: 4, ten: 'Linh hoạt kết quả', phut: 45, mo_ta: 'Mang điều gì đi tiếp?' }
] as const;

function dinhDangNgay(iso: string | null): string {
  if (!iso) return '';
  const ngay = new Date(iso);
  if (Number.isNaN(ngay.getTime())) return '';
  return ngay.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Dashboard({ phien, onLoggedOut, onOpenWeek, onOpenReview }: Props): JSX.Element {
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-paper/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo to-indigo-mid text-paper">
              <span aria-hidden>✦</span>
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Xoay Chiều</p>
              <p className="text-[11px] text-ink-muted">
                {hocSinh ? `${hocSinh.ma} · ${hocSinh.lop}` : phien.user.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-semibold text-ink-muted transition hover:border-gold/50 hover:text-ink"
            onClick={() => {
              void authApi.logout().finally(onLoggedOut);
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Hành trình của {hocSinh?.ma ?? 'bạn'}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Thử một chút. Hiểu mình thêm.</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Bốn tuần, mỗi tuần một cách nhìn khác. Không có đáp án đúng hay sai — chỉ có điều bạn nhận ra.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-indigo-mid transition-[width] duration-700"
                style={{ width: `${phanTram}%` }}
                role="progressbar"
                aria-valuenow={daNop}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label="Số tuần đã nộp"
              />
            </div>
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{daNop}/4 tuần</span>
          </div>
          {hocSinh && (
            <p className="mt-2 text-xs text-ink-muted">
              {hocSinh.truong} · Lớp {hocSinh.lop}
            </p>
          )}
        </section>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenReview}
            className="rounded-xl border border-ink/10 bg-paper/70 px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold/50 hover:text-ink"
          >
            Xem bài đã nộp
          </button>
          {soCho > 0 && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900">
              Còn {soCho} bài chờ gửi lại
            </span>
          )}
        </div>

        {dangTai && (
          <p className="mt-8 flex items-center gap-3 text-sm text-ink-muted" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-gold" />
            Đang tải tiến trình…
          </p>
        )}

        {loi && !dangTai && (
          <p role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loi}
          </p>
        )}

        {tongQuan && (
          <>
            <h2 className="mt-8 text-lg font-bold">Bốn tuần, bốn trải nghiệm</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {TUAN.map(t => {
                const trangThai = tongQuan.cacTuan.find(x => x.tuan === t.so);
                const nhan = trangThai?.daNop
                  ? `Đã nộp · ${dinhDangNgay(trangThai.nopLuc)}`
                  : trangThai?.coBanNhap
                    ? 'Có bản nháp'
                    : 'Chưa bắt đầu';
                const mau = trangThai?.daNop
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : trangThai?.coBanNhap
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-ink/5 text-ink-muted border-ink/10';

                return (
                  <li key={t.so} className="card transition hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-display text-2xl font-bold tabular-nums text-gold">
                        {String(t.so).padStart(2, '0')}
                      </span>
                      <span className="rounded-full border border-ink/10 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                        {t.phut} phút
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold">{t.mo_ta}</h3>
                    <p className="mt-1 text-[13px] text-ink-muted">{t.ten}</p>
                    <p className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${mau}`}>
                      {nhan}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenWeek(t.so)}
                      className={
                        trangThai?.daNop
                          ? 'mt-4 w-full rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold/50 hover:text-ink'
                          : 'btn-primary mt-4 w-full'
                      }
                    >
                      {trangThai?.daNop
                        ? 'Làm lượt mới'
                        : trangThai?.coBanNhap
                          ? 'Tiếp tục làm'
                          : 'Bắt đầu'}
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 rounded-xl border border-ink/10 bg-paper/60 px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
              Bản nháp tự lưu trong lúc bạn làm. Nộp xong vẫn xem lại được; muốn sửa thì làm lượt mới, bài cũ
              giữ nguyên.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
