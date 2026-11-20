import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PhienNguoiDung } from '../../api/client';
import AdminShell from './AdminShell';
import StudentDrawer from './StudentDrawer';
import { toast } from '../../components/admin/toast';

type HocSinh = {
  id: string;
  username: string;
  ma: string;
  truong: string;
  lop: string;
  dangHoatDong: boolean;
  phaiDoiMatKhau: boolean;
  dangNhapCuoi: string | null;
  soTuanDaNop: number;
  cacTuan: number[];
  hoatDongCuoi: string | null;
};

type KetQua = { page: number; pageSize: number; total: number; items: HocSinh[] };
type Lop = { id: string; ten: string; truong: string; soHocSinh: number };

const TIEN_DO = [
  { key: 'all', nhan: 'Mọi tiến độ' },
  { key: 'done', nhan: 'Hoàn thành 4/4' },
  { key: 'doing', nhan: 'Đang làm' },
  { key: 'new', nhan: 'Chưa bắt đầu' }
];

const TRANG_THAI = [
  { key: 'all', nhan: 'Mọi trạng thái' },
  { key: 'active', nhan: 'Đang hoạt động' },
  { key: 'locked', nhan: 'Bị khoá' }
];

function ngay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function matKhauNgauNhien(): string {
  const chu = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const so = '23456789';
  const lay = (nguon: string, n: number): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    return Array.from(bytes, b => nguon[b % nguon.length]).join('');
  };
  return lay(chu, 7) + lay(so, 3);
}

export default function AdminStudents({ phien }: { phien: PhienNguoiDung }): JSX.Element {
  const [duLieu, setDuLieu] = useState<KetQua | null>(null);
  const [lopDanhSach, setLopDanhSach] = useState<Lop[]>([]);
  const [q, setQ] = useState('');
  const [tienDo, setTienDo] = useState('all');
  const [trangThai, setTrangThai] = useState('all');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);

  const [xemUserId, setXemUserId] = useState<string | null>(null);
  const [resetCho, setResetCho] = useState<HocSinh | null>(null);
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const [moTao, setMoTao] = useState(false);
  const [moNhap, setMoNhap] = useState(false);

  const tai = useCallback(async () => {
    setDangTai(true);
    setLoi(null);
    try {
      const ts = new URLSearchParams({ page: String(page), pageSize: '25', tienDo, status: trangThai });
      if (q.trim()) ts.set('q', q.trim());
      if (classId) ts.set('classId', classId);
      setDuLieu(await api<KetQua>(`/api/admin/students?${ts.toString()}`));
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không tải được danh sách.');
    } finally {
      setDangTai(false);
    }
  }, [page, q, tienDo, trangThai, classId]);

  useEffect(() => {
    void tai();
  }, [tai]);

  useEffect(() => {
    api<{ items: Lop[] }>('/api/admin/classes')
      .then(kq => setLopDanhSach(kq.items))
      .catch(() => setLopDanhSach([]));
  }, []);

  async function doiTrangThai(hs: HocSinh): Promise<void> {
    try {
      await api(`/api/admin/students/${hs.id}/status`, { method: 'POST', body: { active: !hs.dangHoatDong } });
      toast(`${hs.dangHoatDong ? 'Đã khoá' : 'Đã mở khoá'} tài khoản ${hs.username}.`);
      await tai();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không đổi được trạng thái.', 'loi');
    }
  }

  async function xacNhanReset(): Promise<void> {
    if (!resetCho || matKhauMoi.length < 8) return;
    setDangGui(true);
    try {
      await api(`/api/admin/students/${resetCho.id}/reset-password`, {
        method: 'POST',
        body: { password: matKhauMoi }
      });
      toast(`Đã cấp mật khẩu mới cho ${resetCho.username}.`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Không đặt lại được mật khẩu.', 'loi');
    } finally {
      setDangGui(false);
    }
  }

  const tongTrang = duLieu ? Math.max(1, Math.ceil(duLieu.total / duLieu.pageSize)) : 1;
  const coBoLoc = Boolean(q.trim() || classId || tienDo !== 'all' || trangThai !== 'all');

  return (
    <AdminShell
      phien={phien}
      tieuDe="Học sinh & tài khoản"
      phuDe={duLieu ? `${duLieu.total} tài khoản${coBoLoc ? ' khớp bộ lọc' : ''}` : 'Đang tải…'}
      dangChon="hoc-sinh"
    >
      {loi && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          {loi}
        </p>
      )}

      {/* Thanh công cụ */}
      <div className="card mb-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <label htmlFor="q" className="mb-1 block text-[12px] font-semibold text-ink-strong">
              Tìm kiếm
            </label>
            <input
              id="q"
              className="field-input"
              placeholder="Tên đăng nhập hoặc mã học sinh"
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="lop" className="mb-1 block text-[12px] font-semibold text-ink-strong">
              Lớp
            </label>
            <select
              id="lop"
              className="field-input"
              value={classId}
              onChange={e => {
                setClassId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả lớp</option>
              {lopDanhSach.map(l => (
                <option key={l.id} value={l.id}>
                  {l.ten} · {l.truong}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tienDo" className="mb-1 block text-[12px] font-semibold text-ink-strong">
              Tiến độ
            </label>
            <select
              id="tienDo"
              className="field-input"
              value={tienDo}
              onChange={e => {
                setTienDo(e.target.value);
                setPage(1);
              }}
            >
              {TIEN_DO.map(t => (
                <option key={t.key} value={t.key}>
                  {t.nhan}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Trạng thái tài khoản"
            className="field-input max-w-[190px]"
            value={trangThai}
            onChange={e => {
              setTrangThai(e.target.value);
              setPage(1);
            }}
          >
            {TRANG_THAI.map(t => (
              <option key={t.key} value={t.key}>
                {t.nhan}
              </option>
            ))}
          </select>

          <button type="button" className="btn-primary ml-auto min-h-[38px] px-3.5 py-1.5 text-[13px]" onClick={() => setMoTao(true)}>
            + Thêm học sinh
          </button>
          <button
            type="button"
            className="btn-ghost min-h-[38px] px-3.5 py-1.5 text-[13px]"
            onClick={() => setMoNhap(true)}
          >
            Nhập CSV
          </button>
          <a
            href="/api/admin/export/students"
            className="btn-ghost min-h-[38px] px-3.5 py-1.5 text-[13px]"
            download
          >
            Xuất CSV
          </a>
        </div>
      </div>

      {/* Bảng */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead className="border-b border-line bg-canvas/60 text-[10.5px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Tài khoản / Mã</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Tiến độ 4 tuần</th>
                <th className="px-4 py-3">Hoạt động gần nhất</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dangTai &&
                [0, 1, 2, 3, 4].map(i => (
                  <tr key={`sk-${i}`} className="border-b border-line/60">
                    {[0, 1, 2, 3, 4, 5].map(c => (
                      <td key={c} className="px-4 py-3.5">
                        <div className="h-3 w-full max-w-[120px] animate-pulse rounded bg-line" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!dangTai &&
                duLieu?.items.map((hs, i) => (
                  <tr key={hs.id} className="border-b border-line/60 last:border-0 hover:bg-canvas/50">
                    <td className="px-4 py-3 text-ink-muted">{(duLieu.page - 1) * duLieu.pageSize + i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-ink-strong">{hs.username}</span>
                      <span className="block text-[11.5px] text-ink-muted">{hs.ma}</span>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {hs.lop}
                      <span className="block text-[11px] text-ink-muted">{hs.truong}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map(so => (
                          <span
                            key={so}
                            title={`Tuần ${so}: ${hs.cacTuan.includes(so) ? 'đã nộp' : 'chưa nộp'}`}
                            className={`h-2.5 w-2.5 rounded-full ${hs.cacTuan.includes(so) ? 'bg-success' : 'bg-line'}`}
                          />
                        ))}
                        <span className="ml-1.5 text-[11.5px] text-ink-muted">{hs.soTuanDaNop}/4</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{ngay(hs.hoatDongCuoi ?? hs.dangNhapCuoi)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {!hs.dangHoatDong && (
                          <span className="rounded-pill bg-danger-soft px-2 py-0.5 text-[10.5px] font-semibold text-danger">khoá</span>
                        )}
                        <button
                          type="button"
                          title="Xem bài làm"
                          onClick={() => setXemUserId(hs.id)}
                          className="rounded-lg border border-line px-2 py-1 text-[12px] transition hover:border-accent/50 hover:text-accent"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          title="Cấp lại mật khẩu"
                          onClick={() => {
                            setResetCho(hs);
                            setMatKhauMoi(matKhauNgauNhien());
                          }}
                          className="rounded-lg border border-line px-2 py-1 text-[12px] transition hover:border-accent/50 hover:text-accent"
                        >
                          Cấp MK
                        </button>
                        <button
                          type="button"
                          title={hs.dangHoatDong ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                          onClick={() => void doiTrangThai(hs)}
                          className={`rounded-lg px-2 py-1 text-[12px] font-semibold ${
                            hs.dangHoatDong ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'
                          }`}
                        >
                          {hs.dangHoatDong ? 'Khoá' : 'Mở'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!dangTai && (duLieu?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-[14px] font-semibold text-ink">
                      {coBoLoc ? 'Không tìm thấy học sinh nào khớp bộ lọc.' : 'Chưa có học sinh nào.'}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      {coBoLoc ? 'Thử xoá bớt điều kiện lọc.' : 'Bấm “+ Thêm học sinh” hoặc “Nhập CSV” để bắt đầu.'}
                    </p>
                    {coBoLoc && (
                      <button
                        type="button"
                        className="btn-ghost mt-3 min-h-[34px] px-3 py-1 text-[12px]"
                        onClick={() => {
                          setQ('');
                          setClassId('');
                          setTienDo('all');
                          setTrangThai('all');
                          setPage(1);
                        }}
                      >
                        Xoá bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="text-[12px] text-ink-muted">
            Trang {duLieu?.page ?? 1}/{tongTrang} · {duLieu?.total ?? 0} tài khoản
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

      {/* Hộp thoại cấp lại mật khẩu */}
      {resetCho && (
        <HopThoai onDong={() => setResetCho(null)} tieuDe={`Cấp lại mật khẩu · ${resetCho.username}`}>
          <p className="text-[13px] leading-relaxed text-ink">
            Mật khẩu mới hiển thị bên dưới. Hãy sao chép và gửi cho học sinh — hệ thống <strong>không</strong> gửi
            email tự động.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-[15px] font-bold tracking-wider text-ink-strong">
              {matKhauMoi}
            </code>
            <button
              type="button"
              className="btn-ghost min-h-[38px] px-3 py-1.5 text-[12px]"
              onClick={() => {
                void navigator.clipboard.writeText(matKhauMoi).then(() => toast('Đã sao chép mật khẩu.'));
              }}
            >
              Sao chép
            </button>
          </div>

          <button
            type="button"
            className="mt-2 text-[12px] font-semibold text-accent hover:text-accent-hover"
            onClick={() => setMatKhauMoi(matKhauNgauNhien())}
          >
            Tạo mật khẩu khác
          </button>

          <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-[11.5px] leading-relaxed text-warning">
            Học sinh sẽ bị buộc đổi mật khẩu ngay lần đăng nhập kế tiếp. Mọi phiên đang mở sẽ bị thu hồi.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-ghost min-h-[36px] px-3 py-1.5 text-[13px]" onClick={() => setResetCho(null)}>
              Đóng
            </button>
            <button
              type="button"
              className="btn-primary min-h-[36px] px-3.5 py-1.5 text-[13px]"
              disabled={dangGui || matKhauMoi.length < 8}
              onClick={() => void xacNhanReset()}
            >
              {dangGui ? 'Đang lưu…' : 'Áp dụng mật khẩu này'}
            </button>
          </div>
        </HopThoai>
      )}

      {moTao && (
        <FormTaoHocSinh
          lopDanhSach={lopDanhSach}
          onDong={() => setMoTao(false)}
          onXong={() => {
            setMoTao(false);
            void tai();
          }}
        />
      )}

      {moNhap && (
        <FormNhapCsv
          onDong={() => setMoNhap(false)}
          onXong={() => {
            setMoNhap(false);
            void tai();
          }}
        />
      )}
    </AdminShell>
  );
}

/* ----------------------------------------------------------- hộp thoại */

function HopThoai({
  tieuDe,
  onDong,
  children
}: {
  tieuDe: string;
  onDong: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-[55] grid place-items-center px-4" role="dialog" aria-modal="true" aria-label={tieuDe}>
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-ink-strong/45" onClick={onDong} />
      <div
        className="relative w-full max-w-[460px] rounded-[14px] border border-line bg-surface p-5 shadow-[0_10px_25px_rgba(15,23,42,0.2)]"
        style={{ animation: 'xc-menu-in 0.16s ease-out' }}
      >
        <h2 className="font-display text-[15px] font-bold text-ink-strong">{tieuDe}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function FormTaoHocSinh({
  lopDanhSach,
  onDong,
  onXong
}: {
  lopDanhSach: Lop[];
  onDong: () => void;
  onXong: () => void;
}): JSX.Element {
  const [username, setUsername] = useState('');
  const [ma, setMa] = useState('');
  const [classId, setClassId] = useState(lopDanhSach[0]?.id ?? '');
  const [matKhau, setMatKhau] = useState(matKhauNgauNhien());
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function gui(): Promise<void> {
    setDangGui(true);
    setLoi(null);
    try {
      await api('/api/admin/students', {
        method: 'POST',
        body: { username: username.trim(), password: matKhau, ma: ma.trim().toUpperCase(), classId }
      });
      toast(`Đã tạo tài khoản ${username.trim()} với mật khẩu ${matKhau}.`);
      onXong();
    } catch (e) {
      const loi = e instanceof ApiError ? e : null;
      setLoi(loi ? [loi.message, ...loi.chiTiet].join(' · ') : 'Không tạo được tài khoản.');
    } finally {
      setDangGui(false);
    }
  }

  return (
    <HopThoai tieuDe="Thêm học sinh" onDong={onDong}>
      <div className="space-y-3">
        <div>
          <label htmlFor="u" className="mb-1 block text-[12px] font-semibold text-ink-strong">
            Tên đăng nhập
          </label>
          <input id="u" className="field-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="hs10a3-01" />
        </div>
        <div>
          <label htmlFor="m" className="mb-1 block text-[12px] font-semibold text-ink-strong">
            Mã học sinh
          </label>
          <input id="m" className="field-input" value={ma} onChange={e => setMa(e.target.value)} placeholder="CH12-T-01" />
        </div>
        <div>
          <label htmlFor="l" className="mb-1 block text-[12px] font-semibold text-ink-strong">
            Lớp
          </label>
          <select id="l" className="field-input" value={classId} onChange={e => setClassId(e.target.value)}>
            {lopDanhSach.map(l => (
              <option key={l.id} value={l.id}>
                {l.ten} · {l.truong}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p" className="mb-1 block text-[12px] font-semibold text-ink-strong">
            Mật khẩu ban đầu
          </label>
          <div className="flex gap-2">
            <input id="p" className="field-input" value={matKhau} onChange={e => setMatKhau(e.target.value)} />
            <button type="button" className="btn-ghost min-h-[38px] shrink-0 px-2.5 py-1 text-[12px]" onClick={() => setMatKhau(matKhauNgauNhien())}>
              Tạo
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">Học sinh sẽ buộc đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
        </div>

        {loi && <p className="rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-ink-strong">{loi}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost min-h-[36px] px-3 py-1.5 text-[13px]" onClick={onDong}>
            Huỷ
          </button>
          <button
            type="button"
            className="btn-primary min-h-[36px] px-3.5 py-1.5 text-[13px]"
            disabled={dangGui || !username.trim() || !ma.trim() || !classId || matKhau.length < 8}
            onClick={() => void gui()}
          >
            {dangGui ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </HopThoai>
  );
}

type XemTruoc = {
  tongSo: number;
  hopLe: number;
  loi: number;
  danhSachLoi: { dong: number; loi: string }[];
  xemTruoc: { dong: number; ma: string; username: string; truong: string; lop: string }[];
};

type TaiKhoanMoi = { ma: string; username: string; matKhau: string; lop: string; truong: string };

function FormNhapCsv({ onDong, onXong }: { onDong: () => void; onXong: () => void }): JSX.Element {
  const [csv, setCsv] = useState('');
  const [tenTep, setTenTep] = useState('');
  const [xemTruoc, setXemTruoc] = useState<XemTruoc | null>(null);
  const [ketQua, setKetQua] = useState<TaiKhoanMoi[] | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function chonTep(tep: File): Promise<void> {
    setTenTep(tep.name);
    setCsv(await tep.text());
    setXemTruoc(null);
    setKetQua(null);
    setLoi(null);
  }

  async function xem(): Promise<void> {
    setDangGui(true);
    setLoi(null);
    try {
      setXemTruoc(await api<XemTruoc>('/api/admin/import/preview', { method: 'POST', body: { csv } }));
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không đọc được tệp.');
    } finally {
      setDangGui(false);
    }
  }

  async function nhapThat(): Promise<void> {
    setDangGui(true);
    setLoi(null);
    try {
      const kq = await api<{ soLuong: number; taiKhoan: TaiKhoanMoi[] }>('/api/admin/import/commit', {
        method: 'POST',
        body: { csv }
      });
      // Mật khẩu chỉ trả về đúng một lần: phải hiện ra cho quản trị viên chép.
      setKetQua(kq.taiKhoan);
      toast(`Đã tạo ${kq.soLuong} tài khoản. Hãy tải danh sách mật khẩu bên dưới.`);
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Nhập thất bại.');
    } finally {
      setDangGui(false);
    }
  }

  function taiCsv(): void {
    if (!ketQua) return;
    const dong = [
      ['ma', 'username', 'matKhau', 'lop', 'truong'],
      ...ketQua.map(t => [t.ma, t.username, t.matKhau, t.lop, t.truong])
    ];
    const noiDung = '\uFEFF' + dong.map(d => d.map(o => `"${o.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([noiDung], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tai-khoan-hoc-sinh.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Sau khi nhập xong: hiện danh sách tài khoản, không tự đóng hộp thoại.
  if (ketQua) {
    return (
      <HopThoai tieuDe={`Đã tạo ${ketQua.length} tài khoản`} onDong={onXong}>
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] leading-relaxed text-warning">
          Mật khẩu dưới đây <strong>chỉ hiện một lần</strong>. Tải tệp về trước khi đóng hộp thoại — đóng rồi không
          lấy lại được, chỉ có thể cấp lại từng tài khoản.
        </p>

        <div className="mt-3 max-h-[240px] overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 bg-canvas text-[10.5px] uppercase text-ink-muted">
              <tr>
                <th className="px-2 py-2">Tài khoản</th>
                <th className="px-2 py-2">Mã</th>
                <th className="px-2 py-2">Mật khẩu</th>
              </tr>
            </thead>
            <tbody>
              {ketQua.map(t => (
                <tr key={t.username} className="border-t border-line/60">
                  <td className="px-2 py-1.5 font-semibold text-ink-strong">{t.username}</td>
                  <td className="px-2 py-1.5 text-ink-muted">{t.ma}</td>
                  <td className="px-2 py-1.5 font-mono text-ink-strong">{t.matKhau}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost min-h-[36px] px-3 py-1.5 text-[13px]" onClick={taiCsv}>
            Tải CSV
          </button>
          <button type="button" className="btn-primary min-h-[36px] px-3.5 py-1.5 text-[13px]" onClick={onXong}>
            Đã lưu, đóng
          </button>
        </div>
      </HopThoai>
    );
  }

  return (
    <HopThoai tieuDe="Nhập danh sách từ CSV" onDong={onDong}>
      <p className="text-[12.5px] leading-relaxed text-ink">
        Tệp cần các cột: <code>ma</code>, <code>username</code>, <code>truong</code>, <code>lop</code>. Hệ thống tự sinh
        mật khẩu cho từng tài khoản.
      </p>

      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-4 py-5 text-[13px] text-ink-muted hover:border-accent/50">
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => {
            const tep = e.target.files?.[0];
            if (tep) void chonTep(tep);
          }}
        />
        {tenTep || 'Bấm để chọn tệp CSV'}
      </label>

      {loi && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-ink-strong">{loi}</p>}

      {xemTruoc && (
        <div className="mt-3 rounded-lg bg-canvas p-3 text-[12.5px]">
          <p className="font-semibold text-ink-strong">
            {xemTruoc.tongSo} dòng · {xemTruoc.hopLe} hợp lệ · {xemTruoc.loi} lỗi
          </p>
          {xemTruoc.danhSachLoi.length > 0 && (
            <ul className="mt-2 max-h-[140px] space-y-1 overflow-y-auto">
              {xemTruoc.danhSachLoi.map(l => (
                <li key={l.dong} className="text-[11.5px] text-danger">
                  Dòng {l.dong}: {l.loi}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost min-h-[36px] px-3 py-1.5 text-[13px]" onClick={onDong}>
          Huỷ
        </button>
        {!xemTruoc ? (
          <button
            type="button"
            className="btn-primary min-h-[36px] px-3.5 py-1.5 text-[13px]"
            disabled={!csv || dangGui}
            onClick={() => void xem()}
          >
            {dangGui ? 'Đang đọc…' : 'Xem trước'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary min-h-[36px] px-3.5 py-1.5 text-[13px]"
            disabled={dangGui || xemTruoc.loi > 0 || xemTruoc.hopLe === 0}
            onClick={() => void nhapThat()}
          >
            {dangGui ? 'Đang nhập…' : `Nhập ${xemTruoc.hopLe} tài khoản`}
          </button>
        )}
      </div>
    </HopThoai>
  );
}
