import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { demTu, layTuan, nhanCuaO } from '../../content';
import Drawer from '../../components/admin/Drawer';

type ChiTiet = {
  hocSinh: { id: string; ma: string; truong: string; lop: string; username: string; dangHoatDong: boolean };
  baiNop: {
    id: string;
    tuan: number;
    nhanLuc: string;
    thoiLuongGiay: number | null;
    soLanDan: number;
    daChe: boolean;
    noiDung: Record<string, string | null>;
  }[];
  nhap: { tuan: number; duLieu: Record<string, unknown>; revision: number; capNhatLuc: string }[];
};

function ngay(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function phut(giay: number | null): string {
  if (!giay || giay <= 0) return '';
  const m = Math.round(giay / 60);
  return m < 1 ? 'dưới 1 phút' : `${m} phút`;
}

export default function StudentDrawer({
  userId,
  onDong
}: {
  userId: string | null;
  onDong: () => void;
}): JSX.Element {
  const [duLieu, setDuLieu] = useState<ChiTiet | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tuanChon, setTuanChon] = useState(1);

  useEffect(() => {
    if (!userId) {
      setDuLieu(null);
      setLoi(null);
      return;
    }
    let huy = false;
    setDuLieu(null);
    setLoi(null);
    setTuanChon(1);
    api<ChiTiet>(`/api/admin/students/${userId}/submissions`)
      .then(kq => {
        if (!huy) setDuLieu(kq);
      })
      .catch(e => {
        if (!huy) setLoi(e instanceof ApiError ? e.message : 'Không tải được bài làm.');
      });
    return () => {
      huy = true;
    };
  }, [userId]);

  const baiTuan = duLieu?.baiNop.filter(b => b.tuan === tuanChon).at(-1);
  const nhapTuan = duLieu?.nhap.find(n => n.tuan === tuanChon);

  return (
    <Drawer
      mo={Boolean(userId)}
      onDong={onDong}
      tieuDe={duLieu ? `${duLieu.hocSinh.username} · ${duLieu.hocSinh.ma}` : 'Đang tải…'}
      phuDe={duLieu ? `${duLieu.hocSinh.truong} · ${duLieu.hocSinh.lop}` : undefined}
    >
      {loi && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          {loi}
        </p>
      )}

      {!duLieu && !loi && <p className="text-sm text-ink-muted">Đang tải bài làm…</p>}

      {duLieu && (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-[12px] text-ink-muted">
            <span>
              <strong className="text-ink-strong">{duLieu.baiNop.length}</strong>/4 tuần đã nộp
            </span>
            <span>·</span>
            <span>
              <strong className="text-ink-strong">{duLieu.nhap.length}</strong> bản nháp
            </span>
            <span>·</span>
            <span className={duLieu.hocSinh.dangHoatDong ? 'text-success' : 'text-danger'}>
              {duLieu.hocSinh.dangHoatDong ? 'Đang hoạt động' : 'Bị khoá'}
            </span>
          </div>

          <div className="mb-4 flex gap-1.5" role="tablist" aria-label="Chọn tuần">
            {[1, 2, 3, 4].map(so => {
              const daNop = duLieu.baiNop.some(b => b.tuan === so);
              const coNhap = duLieu.nhap.some(n => n.tuan === so);
              return (
                <button
                  key={so}
                  type="button"
                  role="tab"
                  aria-selected={so === tuanChon}
                  onClick={() => setTuanChon(so)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition ${
                    so === tuanChon
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-ink hover:border-accent/40'
                  }`}
                >
                  Tuần {so}
                  <span className="mt-0.5 block text-[10px] font-normal">
                    {daNop ? '● đã nộp' : coNhap ? '◐ có nháp' : '○ chưa làm'}
                  </span>
                </button>
              );
            })}
          </div>

          <h3 className="font-display text-[14px] font-bold text-ink-strong">
            Tuần {tuanChon} · {layTuan(tuanChon)?.title ?? ''}
          </h3>

          {baiTuan && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="rounded-pill bg-success-soft px-2.5 py-1 font-semibold text-success">Đã nộp</span>
              <span className="text-ink-muted">Nộp lúc {ngay(baiTuan.nhanLuc)}</span>
              {phut(baiTuan.thoiLuongGiay) && <span className="text-ink-muted">· {phut(baiTuan.thoiLuongGiay)}</span>}
              {baiTuan.soLanDan > 0 && (
                <span className="rounded-pill bg-warning-soft px-2 py-0.5 font-semibold text-warning">
                  {baiTuan.soLanDan} lần dán
                </span>
              )}
              {baiTuan.daChe && (
                <span className="rounded-pill bg-warning-soft px-2 py-0.5 font-semibold text-warning">có ô bị che</span>
              )}
            </div>
          )}

          {!baiTuan && nhapTuan && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="rounded-pill bg-warning-soft px-2.5 py-1 font-semibold text-warning">Bản nháp</span>
              <span className="text-ink-muted">
                Lưu lúc {ngay(nhapTuan.capNhatLuc)} · phiên bản {nhapTuan.revision}
              </span>
            </div>
          )}

          {!baiTuan && !nhapTuan && (
            <p className="mt-3 rounded-lg bg-canvas px-4 py-6 text-center text-[13px] text-ink-muted">
              Học sinh chưa làm tuần này.
            </p>
          )}

          {baiTuan && (
            <dl className="mt-4 space-y-4">
              {Object.entries(baiTuan.noiDung)
                .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10.5px] font-bold uppercase tracking-wide text-accent">{nhanCuaO(k)}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-strong">{v}</dd>
                    <dd className="mt-0.5 text-[10.5px] text-ink-muted">{demTu(String(v))} từ</dd>
                  </div>
                ))}
              {Object.values(baiTuan.noiDung).every(v => !v || String(v).trim() === '') && (
                <p className="text-[13px] text-ink-muted">Bài nộp này không có nội dung trả lời.</p>
              )}
            </dl>
          )}

          {!baiTuan && nhapTuan && (
            <dl className="mt-4 space-y-4">
              {Object.entries(nhapTuan.duLieu)
                .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">{nhanCuaO(k)}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{String(v)}</dd>
                  </div>
                ))}
              {Object.values(nhapTuan.duLieu).every(v => !v || String(v).trim() === '') && (
                <p className="text-[13px] text-ink-muted">Bản nháp để trống.</p>
              )}
            </dl>
          )}

          <p className="mt-6 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-muted">
            Nội dung đã được máy chủ che các từ nhạy cảm trước khi lưu. Giáo viên chủ nhiệm chỉ xem được phần tiến độ,
            không xem nội dung chi tiết.
          </p>
        </>
      )}
    </Drawer>
  );
}
