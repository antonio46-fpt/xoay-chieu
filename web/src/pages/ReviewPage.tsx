import { useEffect, useState } from 'react';
import { ApiError, authApi, meApi, type BaiNopChiTiet, type BaiNopTomTat, type PhienNguoiDung } from '../api/client';
import { cacKhoaNoiDung, nhanCuaO } from '../content';
import AppShell from '../components/AppShell';

type Props = {
  phien: PhienNguoiDung;
  onNavigate: (key: string) => void;
  onLoggedOut: () => void;
};

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

export default function ReviewPage({ phien, onNavigate, onLoggedOut }: Props): JSX.Element {
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

  const hocSinh = phien.student;
  const khoaCoNoiDung = chiTiet
    ? cacKhoaNoiDung().filter(k => typeof chiTiet[k] === 'string' && String(chiTiet[k]).trim() !== '')
    : [];

  return (
    <AppShell
      tieuDe="Bài của mình"
      phuDe={hocSinh ? `${hocSinh.truong} · ${hocSinh.lop}` : undefined}
      ma={hocSinh?.ma ?? phien.user.username}
      lop={hocSinh?.lop ?? ''}
      cacMuc={[
        { key: 'hanh-trinh', nhan: 'Hành trình', icon: '▦' },
        { key: 'bai-da-nop', nhan: 'Bài đã nộp', icon: '▤' },
        { key: 'doi-mat-khau', nhan: 'Đổi mật khẩu', icon: '⚿' }
      ]}
      dangChon="bai-da-nop"
      onChon={onNavigate}
      onDangXuat={() => {
        void authApi.logout().finally(onLoggedOut);
      }}
    >
      <p className="hint-mat-khau mb-5 text-[14px] font-medium">
        Bài đã nộp không sửa được. Muốn làm khác thì vào tuần đó và chọn “Làm lượt mới”.
      </p>

      {loi && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink-strong">
          {loi}
        </p>
      )}

      {danhSach === null && (
        <p className="flex items-center gap-3 text-sm text-ink-muted" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
          Đang tải…
        </p>
      )}

      {danhSach !== null && danhSach.length === 0 && (
        <div className="card text-center">
          <p className="text-[14px] font-semibold text-ink">Bạn chưa nộp tuần nào. Vào Hành trình để bắt đầu tuần 1.</p>
        </div>
      )}

      {danhSach !== null && danhSach.length > 0 && (
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <ul className="space-y-2">
            {danhSach.map(bai => (
              <li key={bai.id}>
                <button
                  type="button"
                  onClick={() => setDangChon(bai.id)}
                  aria-current={bai.id === dangChon ? 'true' : undefined}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    bai.id === dangChon
                      ? 'border-accent/40 bg-accent-soft font-semibold text-accent-hover'
                      : 'border-line bg-surface hover:border-accent/40'
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
                <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
                  <h2 className="font-display text-lg font-bold">Tuần {String(chiTiet.tuan)}</h2>
                  {chiTiet.da_che === true && (
                    <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                      Có ô đã được che
                    </span>
                  )}
                </div>

                {khoaCoNoiDung.length === 0 && <p className="mt-4 text-sm text-ink-muted">Bài này không có nội dung trả lời.</p>}

                <dl className="mt-4 space-y-5">
                  {khoaCoNoiDung.map(khoa => (
                    <div key={khoa}>
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-accent">{nhanCuaO(khoa)}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-strong">
                        {String(chiTiet[khoa])}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-6 border-t border-line pt-3 text-[11px] text-ink-muted">
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
    </AppShell>
  );
}
