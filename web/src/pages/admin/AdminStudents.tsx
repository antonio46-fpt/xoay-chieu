import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';

type HocSinh = {
  id: string;
  username: string;
  ma: string;
  truong: string;
  lop: string;
  dangHoatDong: boolean;
  phaiDoiMatKhau: boolean;
  soTuanDaNop: number;
};

type KetQua = { page: number; pageSize: number; total: number; items: HocSinh[] };

const TRANG_THAI = [
  { key: 'all', nhan: 'Tất cả' },
  { key: 'active', nhan: 'Đang hoạt động' },
  { key: 'locked', nhan: 'Bị khoá' }
];

export default function AdminStudents(): JSX.Element {
  const [duLieu, setDuLieu] = useState<KetQua | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const thamSo = new URLSearchParams({ page: String(page), pageSize: '25', status });
      if (q.trim()) thamSo.set('q', q.trim());
      const kq = await api<KetQua>(`/api/admin/students?${thamSo.toString()}`);
      setDuLieu(kq);
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không tải được danh sách.');
    } finally {
      setDangTai(false);
    }
  }, [page, q, status]);

  useEffect(() => {
    void tai();
  }, [tai]);

  async function doiTrangThai(hs: HocSinh): Promise<void> {
    try {
      await api(`/api/admin/students/${hs.id}/status`, {
        method: 'POST',
        body: { active: !hs.dangHoatDong }
      });
      setThongBao(`${hs.dangHoatDong ? 'Đã khoá' : 'Đã mở khoá'} tài khoản ${hs.username}.`);
      await tai();
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không đổi được trạng thái.');
    }
  }

  async function datLaiMatKhau(hs: HocSinh): Promise<void> {
    const moi = window.prompt(`Mật khẩu mới cho ${hs.username} (≥ 8 ký tự, có chữ và số):`);
    if (!moi) return;
    try {
      await api(`/api/admin/students/${hs.id}/reset-password`, {
        method: 'POST',
        body: { password: moi }
      });
      setThongBao(`Đã đặt lại mật khẩu cho ${hs.username}. Hãy gửi mật khẩu mới cho học sinh.`);
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không đặt lại được mật khẩu.');
    }
  }

  const tongTrang = duLieu ? Math.max(1, Math.ceil(duLieu.total / duLieu.pageSize)) : 1;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
        <div>
          <h1 className="font-display text-[17px] font-bold text-ink-strong">Quản lý học sinh</h1>
          <p className="text-[12px] text-ink-muted">{duLieu ? `${duLieu.total} tài khoản` : 'Đang tải…'}</p>
        </div>
        <a href="/admin" className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink">
          ← Tổng quan
        </a>
      </header>

      <div className="p-6">
        {loi && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">{loi}</p>}
        {thongBao && (
          <p className="mb-4 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-ink-strong">{thongBao}</p>
        )}

        <div className="card mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="q" className="mb-1 block text-[12px] font-semibold text-ink-strong">
              Tìm theo tên đăng nhập hoặc mã
            </label>
            <input
              id="q"
              className="field-input"
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="hs01 hoặc CH12-T"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-[12px] font-semibold text-ink-strong">
              Trạng thái
            </label>
            <select
              id="status"
              className="field-input"
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {TRANG_THAI.map(t => (
                <option key={t.key} value={t.key}>
                  {t.nhan}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-line bg-canvas/60 text-[11px] uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Lớp</th>
                  <th className="px-4 py-3">Tuần</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(duLieu?.items ?? []).map(hs => (
                  <tr key={hs.id} className="border-b border-line/60 last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3 font-semibold text-ink-strong">{hs.username}</td>
                    <td className="px-4 py-3 text-ink">{hs.ma}</td>
                    <td className="px-4 py-3 text-ink">
                      {hs.truong} · {hs.lop}
                    </td>
                    <td className="px-4 py-3 text-ink">{hs.soTuanDaNop}/4</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${
                          hs.dangHoatDong ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                        }`}
                      >
                        {hs.dangHoatDong ? 'Hoạt động' : 'Bị khoá'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void datLaiMatKhau(hs)}
                        className="mr-2 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink"
                      >
                        Đặt lại MK
                      </button>
                      <button
                        type="button"
                        onClick={() => void doiTrangThai(hs)}
                        className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ${
                          hs.dangHoatDong ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'
                        }`}
                      >
                        {hs.dangHoatDong ? 'Khoá' : 'Mở khoá'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!dangTai && (duLieu?.items.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                      Không có tài khoản nào khớp bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="text-[12px] text-ink-muted">
              Trang {duLieu?.page ?? 1}/{tongTrang}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={(duLieu?.page ?? 1) <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn-ghost min-h-[32px] px-3 py-1 text-[12px]"
              >
                ← Trước
              </button>
              <button
                type="button"
                disabled={(duLieu?.page ?? 1) >= tongTrang}
                onClick={() => setPage(p => p + 1)}
                className="btn-ghost min-h-[32px] px-3 py-1 text-[12px]"
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
