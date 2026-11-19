import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PhienNguoiDung } from '../../api/client';
import { layTuan } from '../../content';
import AdminShell from './AdminShell';
import StudentDrawer from './StudentDrawer';

type BaiNop = {
  id: string;
  userId: string;
  username: string;
  ma: string;
  lop: string;
  truong: string;
  tuan: number;
  nhanLuc: string;
  thoiLuongGiay: number | null;
  soLanDan: number;
  daChe: boolean;
};

type KetQua = { page: number; pageSize: number; total: number; items: BaiNop[] };

function ngay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSubmissions({ phien }: { phien: PhienNguoiDung }): JSX.Element {
  const [duLieu, setDuLieu] = useState<KetQua | null>(null);
  const [tuan, setTuan] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [xemUserId, setXemUserId] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const ts = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (tuan !== 'all') ts.set('tuan', tuan);
      if (q.trim()) ts.set('q', q.trim());
      setDuLieu(await api<KetQua>(`/api/admin/submissions?${ts.toString()}`));
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không tải được danh sách bài nộp.');
    } finally {
      setDangTai(false);
    }
  }, [page, tuan, q]);

  useEffect(() => {
    void tai();
  }, [tai]);

  const tongTrang = duLieu ? Math.max(1, Math.ceil(duLieu.total / duLieu.pageSize)) : 1;

  return (
    <AdminShell
      phien={phien}
      tieuDe="Theo dõi bài nộp"
      phuDe={duLieu ? `${duLieu.total} bài nộp` : 'Đang tải…'}
      dangChon="bai-nop"
    >
      {loi && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          {loi}
        </p>
      )}

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="mb-1 block text-[12px] font-semibold text-ink-strong">
            Tìm theo tài khoản hoặc mã
          </label>
          <input
            id="q"
            className="field-input"
            value={q}
            placeholder="hs01 hoặc CH12-T"
            onChange={e => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div>
          <label htmlFor="tuan" className="mb-1 block text-[12px] font-semibold text-ink-strong">
            Tuần
          </label>
          <select
            id="tuan"
            className="field-input"
            value={tuan}
            onChange={e => {
              setTuan(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả tuần</option>
            {[1, 2, 3, 4].map(so => (
              <option key={so} value={so}>
                Tuần {so} · {layTuan(so)?.title ?? ''}
              </option>
            ))}
          </select>
        </div>
        <a href="/api/admin/export/submissions" className="btn-ghost min-h-[38px] px-3.5 py-1.5 text-[13px]" download>
          Xuất CSV
        </a>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13.5px]">
            <thead className="border-b border-line bg-canvas/60 text-[10.5px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Tuần</th>
                <th className="px-4 py-3">Nộp lúc</th>
                <th className="px-4 py-3">Thời lượng</th>
                <th className="px-4 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {dangTai &&
                [0, 1, 2, 3].map(i => (
                  <tr key={`sk-${i}`} className="border-b border-line/60">
                    {[0, 1, 2, 3, 4, 5].map(c => (
                      <td key={c} className="px-4 py-3.5">
                        <div className="h-3 w-full max-w-[110px] animate-pulse rounded bg-line" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!dangTai &&
                duLieu?.items.map(b => (
                  <tr key={b.id} className="border-b border-line/60 last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink-strong">{b.username}</span>
                      <span className="block text-[11.5px] text-ink-muted">{b.ma}</span>
                    </td>
                    <td className="px-4 py-3 text-ink">{b.lop}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                        Tuần {b.tuan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{ngay(b.nhanLuc)}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {b.thoiLuongGiay ? `${Math.round(b.thoiLuongGiay / 60)} phút` : '—'}
                      {b.soLanDan > 0 && <span className="ml-1.5 text-warning">{b.soLanDan} lần dán</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setXemUserId(b.userId)}
                        className="rounded-lg border border-line px-2.5 py-1 text-[12px] transition hover:border-accent/50 hover:text-accent"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}

              {!dangTai && (duLieu?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-[14px] font-semibold text-ink">
                      {tuan !== 'all' || q.trim() ? 'Không có bài nộp nào khớp bộ lọc.' : 'Chưa có bài nộp nào.'}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      Bài nộp chỉ xuất hiện khi học sinh bấm “Lưu và nộp bài”.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="text-[12px] text-ink-muted">
            Trang {duLieu?.page ?? 1}/{tongTrang} · {duLieu?.total ?? 0} bài
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={(duLieu?.page ?? 1) <= 1 || dangTai}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn-ghost min-h-[32px] px-3 py-1 text-[12px]"
            >
              ← Trước
            </button>
            <button
              type="button"
              disabled={(duLieu?.page ?? 1) >= tongTrang || dangTai}
              onClick={() => setPage(p => p + 1)}
              className="btn-ghost min-h-[32px] px-3 py-1 text-[12px]"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>

      <StudentDrawer userId={xemUserId} onDong={() => setXemUserId(null)} />
    </AdminShell>
  );
}
