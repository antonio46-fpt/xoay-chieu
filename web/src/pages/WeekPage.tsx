/**
 * Màn hình làm bài một tuần.
 *
 * Ba cơ chế được giữ nguyên từ bản 2.x vì chúng bảo vệ dữ liệu nghiên cứu:
 *   1. Mỗi lượt làm bài có một id cố định, dùng làm khoá chống trùng khi nộp.
 *   2. Bản nháp tự lưu, gửi kèm revision; lệch revision thì báo xung đột chứ
 *      không ghi đè.
 *   3. Nút nộp chỉ bật khi mọi ô bắt buộc đã đủ số từ tối thiểu.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api, type TongQuan } from '../api/client';
import { demTu, layTuan, PHIEN_BAN_NOI_DUNG, THANG_TU_DANH_GIA, type Buoc, type O } from '../content';

type Props = {
  tuan: number;
  onThoat: () => void;
  onDaNop: () => void;
  /** Trạng thái tuần này từ tổng quan, để biết đã nộp trước đó chưa. */
  trangThai?: TongQuan['cacTuan'][number];
};

type TrangThaiLuu = 'chua-luu' | 'dang-luu' | 'da-luu' | 'loi';

const NHAN_LUU: Record<TrangThaiLuu, string> = {
  'chua-luu': 'Chưa lưu',
  'dang-luu': 'Đang lưu…',
  'da-luu': 'Đã lưu',
  loi: 'Chưa lưu được – kiểm tra mạng'
};

export default function WeekPage({ tuan, onThoat, onDaNop, trangThai }: Props): JSX.Element {
  const duLieuTuan = useMemo(() => layTuan(tuan), [tuan]);

  const [giaTri, setGiaTri] = useState<Record<string, string>>({});
  const [chiSoBuoc, setChiSoBuoc] = useState(0);
  const [hienGoiY, setHienGoiY] = useState(false);
  const [revision, setRevision] = useState(0);
  const [trangThaiLuu, setTrangThaiLuu] = useState<TrangThaiLuu>('chua-luu');
  const [dangTai, setDangTai] = useState(true);
  const [loiXungDot, setLoiXungDot] = useState<string | null>(null);
  const [dangNop, setDangNop] = useState(false);
  const [loiNop, setLoiNop] = useState<string | null>(null);
  const [daNopXong, setDaNopXong] = useState(false);
  const [soLanDan, setSoLanDan] = useState(0);

  const mutationId = useRef<string>(crypto.randomUUID());
  const submissionId = useRef<string>(crypto.randomUUID());
  const henGioLuu = useRef<number | null>(null);
  const giaTriMoiNhat = useRef<Record<string, string>>({});
  const daSuaLanDau = useRef(false);

  // ------------------------------------------------------- tải bản nháp
  useEffect(() => {
    let huy = false;
    setDangTai(true);
    api<{ revision: number; cacO: Record<string, string> }>(`/api/me/drafts/${tuan}`)
      .then(kq => {
        if (huy) return;
        setRevision(kq.revision);
        setGiaTri(kq.cacO ?? {});
        giaTriMoiNhat.current = kq.cacO ?? {};
      })
      .catch(() => {
        if (huy) return;
        setLoiXungDot('Không tải được bản nháp. Bạn vẫn có thể làm bài và nộp.');
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [tuan]);

  // ---------------------------------------------------------- lưu nháp
  const luuNhap = useCallback(async (): Promise<void> => {
    setTrangThaiLuu('dang-luu');
    try {
      const kq = await api<{ revision: number }>(`/api/me/drafts/${tuan}`, {
        method: 'PUT',
        body: {
          tuan,
          mutationId: mutationId.current,
          expectedRevision: revision,
          cac_o: giaTriMoiNhat.current
        }
      });
      setRevision(kq.revision);
      setTrangThaiLuu('da-luu');
      setLoiXungDot(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'XUNG_DOT_PHIEN_BAN') {
        setLoiXungDot(
          'Bản nháp của bạn đã được sửa ở một thiết bị khác. Bản trên máy chủ đang mới hơn — hãy tải lại để tránh ghi đè.'
        );
        setTrangThaiLuu('loi');
        return;
      }
      setTrangThaiLuu('loi');
    }
  }, [revision, tuan]);

  function datGiaTri(key: string, value: string): void {
    setGiaTri(truoc => {
      const moi = { ...truoc, [key]: value };
      giaTriMoiNhat.current = moi;
      return moi;
    });
    daSuaLanDau.current = true;
    if (henGioLuu.current !== null) window.clearTimeout(henGioLuu.current);
    henGioLuu.current = window.setTimeout(() => {
      void luuNhap();
    }, 1200);
  }

  // Lưu nốt khi rời trang.
  useEffect(() => {
    return () => {
      if (henGioLuu.current !== null) window.clearTimeout(henGioLuu.current);
    };
  }, []);

  // Đếm số lần dán: dữ liệu để nhóm nghiên cứu đối chiếu, không phải hình phạt.
  useEffect(() => {
    function khiDan(): void {
      setSoLanDan(n => n + 1);
    }
    document.addEventListener('paste', khiDan);
    return () => document.removeEventListener('paste', khiDan);
  }, []);

  if (!duLieuTuan) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <p className="card">Không tìm thấy nội dung tuần {tuan}.</p>
      </div>
    );
  }

  const buoc: Buoc = duLieuTuan.steps[chiSoBuoc];
  const laBuocCuoi = chiSoBuoc === duLieuTuan.steps.length - 1;
  const daNopTruocDo = trangThai?.daNop ?? false;
  const tongGiay = duLieuTuan.duration * 60;

  function loiCuaO(o: O): string | null {
    if (o.min === 0) return null;
    const giaTriO = giaTri[o.key] ?? '';
    if (demTu(giaTriO) < o.min) return `Cần ít nhất ${o.min} từ (hiện ${demTu(giaTriO)}).`;
    return null;
  }

  const oThieu = duLieuTuan.steps.flatMap(s => s.fields).filter(o => loiCuaO(o) !== null);

  async function nopBai(): Promise<void> {
    if (dangNop) return;
    setLoiNop(null);
    setDangNop(true);
    try {
      await api('/api/me/submissions', {
        method: 'POST',
        body: {
          id: submissionId.current,
          tuan,
          ...giaTri,
          thoi_luong_giay: tongGiay,
          phien_ban_app: '3.0.0',
          phien_ban_noi_dung: PHIEN_BAN_NOI_DUNG,
          so_lan_dan: soLanDan
        }
      });
      setDaNopXong(true);
      onDaNop();
    } catch (e) {
      setLoiNop(
        e instanceof ApiError
          ? e.message
          : 'Chưa nộp được. Bài vẫn còn trên máy — thử lại khi có mạng.'
      );
    } finally {
      setDangNop(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onThoat}
            className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-muted transition hover:bg-ink/5 hover:text-ink"
          >
            ← Về trang chính
          </button>
          <span className="text-xs font-semibold text-ink-muted" aria-live="polite">
            {NHAN_LUU[trangThaiLuu]}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Tuần {tuan} · {duLieuTuan.title}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">{buoc.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {duLieuTuan.steps.map((s, i) => (
            <button
              key={`${s.title}-${i}`}
              type="button"
              onClick={() => {
                setChiSoBuoc(i);
                setHienGoiY(false);
              }}
              aria-current={i === chiSoBuoc ? 'step' : undefined}
              className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-bold transition ${
                i === chiSoBuoc
                  ? 'border-gold bg-gold/15 text-ink'
                  : 'border-ink/10 bg-paper/70 text-ink-muted hover:border-gold/40'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <span className="ml-1 text-xs text-ink-muted">
            {chiSoBuoc + 1}/{duLieuTuan.steps.length}
          </span>
        </div>

        {loiXungDot && (
          <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loiXungDot}
          </div>
        )}

        <section className="card mt-4 space-y-5">
          {chiSoBuoc === 0 && duLieuTuan.letter?.doan && (
            <article className="space-y-3 border-b border-ink/10 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                {duLieuTuan.letter.triet_gia}
              </p>
              <h2 className="text-xl font-bold">{duLieuTuan.letter.tieu_de}</h2>
              {duLieuTuan.letter.doan.map((doan, i) => (
                <p key={i} className="text-[15px] leading-[1.75] text-ink/90">
                  {doan}
                </p>
              ))}
            </article>
          )}

          {buoc.body && <p className="text-[15px] leading-[1.75] text-ink/90">{buoc.body}</p>}

          {buoc.fields.map(o => (
            <div key={o.key}>
              <label htmlFor={o.key} className="mb-1.5 block text-[13px] font-semibold">
                {o.label}
                {o.min > 0 && <span className="ml-1 font-normal text-ink-muted">(ít nhất {o.min} từ)</span>}
              </label>

              {o.kind === 'select' && (
                <select
                  id={o.key}
                  className="field-input"
                  value={giaTri[o.key] ?? ''}
                  onChange={e => datGiaTri(o.key, e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {(o.options ?? []).map(luaChon => (
                    <option key={luaChon} value={luaChon}>
                      {luaChon}
                    </option>
                  ))}
                </select>
              )}

              {o.kind === 'rating' && (
                <div className="grid gap-2">
                  {THANG_TU_DANH_GIA.map(([muc, moTa]) => (
                    <label
                      key={muc}
                      className={`cursor-pointer rounded-xl border p-3 text-[13px] transition ${
                        giaTri[o.key] === String(muc)
                          ? 'border-gold bg-gold/10'
                          : 'border-ink/10 bg-paper hover:border-gold/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name={o.key}
                        value={String(muc)}
                        className="sr-only"
                        checked={giaTri[o.key] === String(muc)}
                        onChange={() => datGiaTri(o.key, String(muc))}
                      />
                      <span className="font-bold text-gold">Mức {muc}</span>
                      <span className="mt-1 block leading-relaxed text-ink/85">{moTa}</span>
                    </label>
                  ))}
                </div>
              )}

              {o.kind === 'text' && (
                <>
                  <textarea
                    id={o.key}
                    className="field-input min-h-[120px] resize-y leading-relaxed"
                    maxLength={o.max}
                    value={giaTri[o.key] ?? ''}
                    onChange={e => datGiaTri(o.key, e.target.value)}
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
                    <span>{loiCuaO(o) ?? ' '}</span>
                    <span className="tabular-nums">
                      {(giaTri[o.key] ?? '').length}/{o.max}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}

          {buoc.hints.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white/50 p-4">
              <button
                type="button"
                onClick={() => setHienGoiY(v => !v)}
                className="text-sm font-semibold text-indigo-mid hover:underline"
                aria-expanded={hienGoiY}
              >
                {hienGoiY ? 'Ẩn gợi ý' : 'Mình chưa biết bắt đầu thế nào'}
              </button>
              {hienGoiY && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink/85">
                  {buoc.hints.map((goiY, i) => (
                    <li key={i}>{goiY}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {daNopXong && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Đã nộp tuần {tuan}. Bạn có thể quay lại xem hoặc làm lượt mới bất cứ lúc nào.
          </p>
        )}

        {loiNop && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loiNop}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-ink/5 disabled:opacity-40"
            onClick={() => {
              setChiSoBuoc(i => Math.max(0, i - 1));
              setHienGoiY(false);
            }}
            disabled={chiSoBuoc === 0}
          >
            ← Quay lại
          </button>

          {laBuocCuoi ? (
            <button
              type="button"
              className="btn-primary"
              disabled={dangNop || oThieu.length > 0}
              onClick={() => {
                void nopBai();
              }}
            >
              {dangNop ? 'Đang nộp…' : 'Lưu và nộp bài'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setChiSoBuoc(i => Math.min(duLieuTuan.steps.length - 1, i + 1));
                setHienGoiY(false);
              }}
            >
              Tiếp tục →
            </button>
          )}
        </div>

        {laBuocCuoi && oThieu.length > 0 && (
          <p className="mt-3 text-right text-xs text-ink-muted">
            Còn {oThieu.length} ô chưa đủ số từ tối thiểu.
            {daNopTruocDo && ' Tuần này bạn đã nộp trước đó; nộp lại sẽ tạo lượt mới.'}
          </p>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-ink-muted">
          Nội dung chỉ nằm trên thiết bị này cho tới khi bạn bấm nộp. Ô có nội dung nhạy cảm sẽ được máy chủ che
          trước khi lưu. Không ghi họ tên bạn bè, số điện thoại hay địa chỉ.
        </p>

        {dangTai && <p className="mt-2 text-center text-xs text-ink-muted">Đang tải bản nháp…</p>}
      </main>
    </div>
  );
}
