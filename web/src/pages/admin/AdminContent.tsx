import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type PhienNguoiDung } from '../../api/client';
import type { Tuan } from '../../content';
import AdminShell from './AdminShell';
import { toast } from '../../components/admin/toast';

type BanGhi = {
  tuan: number;
  tieuDe: string;
  noiDung: Tuan;
  capNhatLuc: string | null;
  capNhatBoi: string | null;
};

function ngay(iso: string | null): string {
  if (!iso) return 'chưa có';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'chưa có';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminContent({ phien }: { phien: PhienNguoiDung }): JSX.Element {
  const [danhSach, setDanhSach] = useState<BanGhi[] | null>(null);
  const [tuanChon, setTuanChon] = useState(1);
  const [banNhap, setBanNhap] = useState<Tuan | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const tai = useCallback(async () => {
    setLoi(null);
    try {
      const kq = await api<{ items: BanGhi[] }>('/api/admin/content');
      setDanhSach(kq.items);
      const muc = kq.items.find(i => i.tuan === tuanChon) ?? kq.items[0];
      if (muc) {
        setTuanChon(muc.tuan);
        setBanNhap(structuredClone(muc.noiDung));
      }
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không tải được nội dung.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void tai();
  }, [tai]);

  function chonTuan(so: number): void {
    const muc = danhSach?.find(i => i.tuan === so);
    if (!muc) return;
    setTuanChon(so);
    setBanNhap(structuredClone(muc.noiDung));
    setLoi(null);
  }

  function suaBuoc(index: number, truong: 'title' | 'stage' | 'body' | 'minutes', giaTri: string): void {
    setBanNhap(cur => {
      if (!cur) return cur;
      const steps = cur.steps.map((s, i) =>
        i === index ? { ...s, [truong]: truong === 'minutes' ? Number(giaTri) || 0 : giaTri } : s
      );
      return { ...cur, steps };
    });
  }

  async function luu(): Promise<void> {
    if (!banNhap) return;
    setDangLuu(true);
    setLoi(null);
    try {
      const kq = await api<BanGhi>(`/api/admin/content/${tuanChon}`, { method: 'PUT', body: banNhap });
      toast(`Đã lưu nội dung tuần ${tuanChon}.`);
      setDanhSach(cur => (cur ? cur.map(i => (i.tuan === kq.tuan ? kq : i)) : cur));
      setBanNhap(structuredClone(kq.noiDung));
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không lưu được nội dung.');
    } finally {
      setDangLuu(false);
    }
  }

  async function khoiPhuc(): Promise<void> {
    if (!window.confirm(`Khôi phục tuần ${tuanChon} về bản gốc? Mọi sửa đổi sẽ mất.`)) return;
    setDangLuu(true);
    try {
      const kq = await api<BanGhi>(`/api/admin/content/${tuanChon}/reset`, { method: 'POST' });
      setDanhSach(cur => (cur ? cur.map(i => (i.tuan === kq.tuan ? kq : i)) : cur));
      setBanNhap(structuredClone(kq.noiDung));
      toast(`Đã khôi phục tuần ${tuanChon} về bản gốc.`);
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : 'Không khôi phục được.');
    } finally {
      setDangLuu(false);
    }
  }

  const banGhi = danhSach?.find(i => i.tuan === tuanChon);

  return (
    <AdminShell
      phien={phien}
      tieuDe="Nội dung 4 tuần"
      phuDe="Sửa đề bài, lời dẫn và gợi ý — học sinh thấy ngay sau khi lưu"
      dangChon="noi-dung"
    >
      {loi && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          {loi}
        </p>
      )}

      {!danhSach && <p className="text-sm text-ink-muted">Đang tải nội dung…</p>}

      {danhSach && banNhap && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {danhSach.map(i => (
              <button
                key={i.tuan}
                type="button"
                onClick={() => chonTuan(i.tuan)}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition ${
                  i.tuan === tuanChon
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-ink hover:border-accent/40'
                }`}
              >
                Tuần {i.tuan}
              </button>
            ))}

            <span className="ml-auto text-[11.5px] text-ink-muted">
              Cập nhật {ngay(banGhi?.capNhatLuc ?? null)}
              {banGhi?.capNhatBoi ? ` · ${banGhi.capNhatBoi}` : ''}
            </span>
          </div>

          <div className="space-y-4">
            <section className="card space-y-3">
              <h2 className="font-display text-[15px] font-bold text-ink-strong">Thông tin tuần</h2>

              <div>
                <label htmlFor="tieu-de" className="mb-1 block text-[12px] font-semibold text-ink-strong">
                  Tiêu đề tuần
                </label>
                <input
                  id="tieu-de"
                  className="field-input"
                  value={banNhap.title}
                  onChange={e => setBanNhap({ ...banNhap, title: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <label htmlFor="focus" className="mb-1 block text-[12px] font-semibold text-ink-strong">
                    Trọng tâm
                  </label>
                  <input
                    id="focus"
                    className="field-input"
                    value={banNhap.focus}
                    onChange={e => setBanNhap({ ...banNhap, focus: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="duration" className="mb-1 block text-[12px] font-semibold text-ink-strong">
                    Thời lượng (phút)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min={0}
                    max={600}
                    className="field-input"
                    value={banNhap.duration}
                    onChange={e => setBanNhap({ ...banNhap, duration: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </section>

            <section className="card space-y-3">
              <h2 className="font-display text-[15px] font-bold text-ink-strong">Lá thư mở tuần</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="triet-gia" className="mb-1 block text-[12px] font-semibold text-ink-strong">
                    Triết gia
                  </label>
                  <input
                    id="triet-gia"
                    className="field-input"
                    value={banNhap.letter?.triet_gia ?? ''}
                    onChange={e =>
                      setBanNhap({ ...banNhap, letter: { ...banNhap.letter, triet_gia: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="lt-tieu-de" className="mb-1 block text-[12px] font-semibold text-ink-strong">
                    Tiêu đề thư
                  </label>
                  <input
                    id="lt-tieu-de"
                    className="field-input"
                    value={banNhap.letter?.tieu_de ?? ''}
                    onChange={e =>
                      setBanNhap({ ...banNhap, letter: { ...banNhap.letter, tieu_de: e.target.value } })
                    }
                  />
                </div>
              </div>

              <div>
                <label htmlFor="doan" className="mb-1 block text-[12px] font-semibold text-ink-strong">
                  Nội dung thư — mỗi đoạn cách nhau một dòng trống
                </label>
                <textarea
                  id="doan"
                  className="field-input min-h-[180px]"
                  value={(banNhap.letter?.doan ?? []).join('\n\n')}
                  onChange={e =>
                    setBanNhap({
                      ...banNhap,
                      letter: { ...banNhap.letter, doan: e.target.value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) }
                    })
                  }
                />
              </div>
            </section>

            <section className="card">
              <h2 className="font-display text-[15px] font-bold text-ink-strong">
                Các bước <span className="text-[12px] font-normal text-ink-muted">({banNhap.steps.length} bước)</span>
              </h2>

              <ul className="mt-3 space-y-4">
                {banNhap.steps.map((buoc, i) => (
                  <li key={`${buoc.title}-${i}`} className="rounded-xl border border-line p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-canvas text-[11px] font-bold text-ink">
                        {i + 1}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{buoc.stage}</span>
                      <span className="ml-auto text-[11px] text-ink-muted">{buoc.minutes} phút</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_80px]">
                      <input
                        aria-label={`Tiêu đề bước ${i + 1}`}
                        className="field-input"
                        value={buoc.title}
                        onChange={e => suaBuoc(i, 'title', e.target.value)}
                      />
                      <input
                        aria-label={`Giai đoạn bước ${i + 1}`}
                        className="field-input"
                        value={buoc.stage}
                        onChange={e => suaBuoc(i, 'stage', e.target.value)}
                      />
                      <input
                        aria-label={`Số phút bước ${i + 1}`}
                        type="number"
                        min={0}
                        max={600}
                        className="field-input"
                        value={buoc.minutes}
                        onChange={e => suaBuoc(i, 'minutes', e.target.value)}
                      />
                    </div>

                    <textarea
                      aria-label={`Nội dung bước ${i + 1}`}
                      className="field-input mt-2 min-h-[90px]"
                      value={buoc.body}
                      onChange={e => suaBuoc(i, 'body', e.target.value)}
                      placeholder="Lời dẫn hiển thị cho học sinh (để trống nếu bước chỉ có câu hỏi)"
                    />

                    <p className="mt-2 text-[11px] text-ink-muted">
                      {buoc.fields.length} ô trả lời: {buoc.fields.map(f => f.key).join(', ') || 'không có'} — cấu trúc ô
                      được giữ cố định để không làm lệch bài đã nộp.
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="btn-ghost min-h-[38px] px-3.5 py-1.5 text-[13px]" onClick={() => void khoiPhuc()} disabled={dangLuu}>
                Khôi phục bản gốc
              </button>
              <button type="button" className="btn-primary min-h-[38px] px-4 py-1.5 text-[13px]" onClick={() => void luu()} disabled={dangLuu}>
                {dangLuu ? 'Đang lưu…' : `Lưu tuần ${tuanChon}`}
              </button>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
