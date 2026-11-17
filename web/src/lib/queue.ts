/**
 * Hàng đợi nộp bài khi mất mạng.
 *
 * Bài chưa gửi được giữ trong localStorage, kèm đúng id đã dùng. Khi có mạng
 * trở lại, hàng đợi tự gửi lại với cùng id — máy chủ nhận ra và không tạo
 * bài trùng.
 *
 * Mỗi mục có số lần thử và mốc thử kế tiếp tăng dần, để 30 máy trong lớp
 * không cùng dội lên máy chủ một lúc.
 */
import { ApiError, api } from '../api/client';

const KHOA = 'xoaychieu_queue_v1';
const THU_TOI_DA = 12;

export type MucCho = {
  id: string;
  tuan: number;
  duLieu: Record<string, unknown>;
  soLanThu: number;
  thuLuc: number;
  taoLuc: number;
};

type NgheThayDoi = (soCho: number) => void;

let dangGui = false;
const nguoiNghe = new Set<NgheThayDoi>();

function doc(): MucCho[] {
  try {
    const raw = localStorage.getItem(KHOA);
    if (!raw) return [];
    const duLieu = JSON.parse(raw);
    return Array.isArray(duLieu) ? (duLieu as MucCho[]) : [];
  } catch {
    return [];
  }
}

function ghi(danhSach: MucCho[]): void {
  try {
    localStorage.setItem(KHOA, JSON.stringify(danhSach));
  } catch {
    // Bộ nhớ đầy: không làm hỏng luồng nộp bài đang chạy.
  }
  for (const nghe of nguoiNghe) nghe(danhSach.length);
}

export function soBaiCho(): number {
  return doc().length;
}

export function theoDoi(callback: NgheThayDoi): () => void {
  nguoiNghe.add(callback);
  callback(soBaiCho());
  return () => {
    nguoiNghe.delete(callback);
  };
}

export function xepCho(id: string, tuan: number, duLieu: Record<string, unknown>): void {
  const danhSach = doc();
  if (danhSach.some(muc => muc.id === id)) return;
  danhSach.push({ id, tuan, duLieu, soLanThu: 0, thuLuc: 0, taoLuc: Date.now() });
  ghi(danhSach);
}

function choKhiLau(soLanThu: number): number {
  // 5s, 10s, 20s, 40s… tối đa 2 phút, kèm nhiễu ngẫu nhiên.
  const co = Math.min(120_000, 5_000 * 2 ** soLanThu);
  return co * (0.7 + Math.random() * 0.6);
}

/**
 * Gửi lại toàn bộ hàng đợi. An toàn khi gọi nhiều lần cùng lúc:
 * chỉ một lượt chạy tại mỗi thời điểm.
 */
export async function guiLai(): Promise<{ daGui: number; conLai: number }> {
  if (dangGui) return { daGui: 0, conLai: soBaiCho() };
  if (!navigator.onLine) return { daGui: 0, conLai: soBaiCho() };

  dangGui = true;
  let daGui = 0;
  try {
    let danhSach = doc();
    for (const muc of [...danhSach]) {
      if (muc.soLanThu >= THU_TOI_DA) continue;
      if (muc.thuLuc > Date.now()) continue;

      try {
        await api('/api/me/submissions', { method: 'POST', body: { id: muc.id, tuan: muc.tuan, ...muc.duLieu } });
        danhSach = danhSach.filter(x => x.id !== muc.id);
        daGui += 1;
      } catch (loi) {
        // 4xx là lỗi dữ liệu: gửi lại mãi cũng vô ích, bỏ khỏi hàng đợi.
        if (loi instanceof ApiError && loi.status >= 400 && loi.status < 500) {
          danhSach = danhSach.filter(x => x.id !== muc.id);
          continue;
        }
        const moi = danhSach.find(x => x.id === muc.id);
        if (moi) {
          moi.soLanThu += 1;
          moi.thuLuc = Date.now() + choKhiLau(moi.soLanThu);
        }
      }
      ghi(danhSach);
    }
    return { daGui, conLai: danhSach.length };
  } finally {
    dangGui = false;
  }
}

/** Gọi một lần khi ứng dụng khởi động. */
export function batDauTheoDoiMang(): () => void {
  const khiCoMang = (): void => {
    void guiLai();
  };
  window.addEventListener('online', khiCoMang);
  const hen = window.setInterval(() => {
    if (navigator.onLine && soBaiCho() > 0) void guiLai();
  }, 20_000);
  return () => {
    window.removeEventListener('online', khiCoMang);
    window.clearInterval(hen);
  };
}
