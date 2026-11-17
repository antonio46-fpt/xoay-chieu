/**
 * Xem lại bài đã nộp.
 *
 * Học sinh chỉ thấy bài của chính mình: máy chủ lọc theo phiên, không theo
 * tham số từ trình duyệt. Nội dung đã được che từ lúc nộp nên ở đây không có
 * gì để che thêm.
 */
import { useEffect, useState } from 'react';
import { ApiError, meApi, type BaiNopChiTiet, type BaiNopTomTat } from '../api/client';
import { cacKhoaNoiDung, nhanCuaO } from '../content';

type Props = { onThoat: () => void };

function dinhDangNgay(iso: string): string {
  const ngay = new Date(iso);
  if (Number.isNaN(ngay.getTime())) return '';
  return ngay.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ReviewPage({ onThoat }: Props): JSX.Element {
  const [danhSach, setDanhSach] = useState<BaiNopTomTat[] | null>(null);
  const [dangChon, setDangChon] = useState<string | null>(null);
  const [chiTiet, setChiTiet] = useState<BaiNopChiTiet | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false);

  useEffect(() => {
    let huy = false;
    meApi
      .submissions()
      .then(kq => {
        if (huy) return;
        setDanhSach(kq.items);
        if (kq.items.length > 0) setDangChon(kq.items[kq.items.length - 1].id);
      })
      .catch(e => {
        if (!huy) setLoi(e instanceof ApiError ? e.message : 'Không tải được danh sách bài.');
      });
    return () => {
      huy = true;
    };
  }, []);

  useEffect(() => {
    if (!dangChon) return;
    let huy = false;
    setDangTaiChiTiet(true);
    meApi
      .submission(dangChon)
      .then(kq => {
        if (!huy) setChiTiet(kq.baiNop);
      })
      .catch(e => {
        if (!huy) setLoi(e instanceof ApiError ? e.message : 'Không tải được bài này.');
      })
      .finally(() => {
        if (!huy) setDangTaiChiTiet(false);
      });
    return () => {
      huy = true;
    };
  }, [dangChon]);

  const khoaCoNoiDung = chiTiet
    ? cacKhoaNoiDung().filter(k => typeof chiTiet[k] === 'string' && String(chiTiet[k]).trim() !== '')
    : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={onThoat}
            className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-muted transition hover:bg-ink/5 hover:text-ink"
          >
            ← Về trang chính
          </button>
          <span className="text-xs font-semibold text-ink-muted">Bài đã nộp</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold">Bài của mình</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Bài đã nộp không sửa được. Muốn làm khác thì vào tuần đó và chọn “Làm lượt mới”.
        </p>

        {loi && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loi}
          </p>
        )}

        {danhSach === null && (
          <p className="mt-6 flex items-center gap-3 text-sm text-ink-muted" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-gold" />
            Đang tải…
          </p>
        )}

        {danhSach !== null && danhSach.length === 0 && (
          <div className="card mt-6 text-center">
            <p className="text-sm text-ink-muted">Bạn chưa nộp tuần nào. Vào trang chính để bắt đầu tuần 1.</p>
          </div>
        )}

        {danhSach !== null && danhSach.length > 0 && (
          <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
            <ul className="space-y-2">
              {danhSach.map(bai => (
                <li key={bai.id}>
                  <button
                    type="button"
                    onClick={() => setDangChon(bai.id)}
                    aria-current={bai.id === dangChon ? 'true' : undefined}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      bai.id === dangChon
                        ? 'border-gold bg-gold/10 font-semibold'
                        : 'border-ink/10 bg-paper/70 hover:border-gold/40'
                    }`}
                  >
                    <span className="block font-semibold">Tuần {bai.tuan}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-muted">{dinhDangNgay(bai.nhanLuc)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <section className="card">
              {dangTaiChiTiet && <p className="text-sm text-ink-muted">Đang tải bài…</p>}

              {!dangTaiChiTiet && chiTiet && (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-3">
                    <h2 className="text-lg font-bold">Tuần {String(chiTiet.tuan)}</h2>
                    {chiTiet.da_che === true && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                        Có ô đã được che
                      </span>
                    )}
                  </div>

                  {khoaCoNoiDung.length === 0 && (
                    <p className="mt-4 text-sm text-ink-muted">Bài này không có nội dung trả lời.</p>
                  )}

                  <dl className="mt-4 space-y-5">
                    {khoaCoNoiDung.map(khoa => (
                      <div key={khoa}>
                        <dt className="text-[12px] font-semibold uppercase tracking-wide text-gold">
                          {nhanCuaO(khoa)}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/90">
                          {String(chiTiet[khoa])}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-6 border-t border-ink/10 pt-3 text-[11px] text-ink-muted">
                    Nộp lúc {dinhDangNgay(String(chiTiet.nhan_luc ?? ''))}
                    {typeof chiTiet.so_lan_dan === 'number' && chiTiet.so_lan_dan > 0
                      ? ` · Có ${chiTiet.so_lan_dan} lần dán nội dung`
                      : ''}
                  </p>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
