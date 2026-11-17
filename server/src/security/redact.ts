/**
 * Che nội dung nhạy cảm phía server.
 *
 * Quy tắc giữ nguyên từ bản 2.x: nếu một ô chứa từ khoá, thay TOÀN BỘ ô bằng
 * một dòng thông báo. Không che từng từ, vì phần còn lại vẫn đoán được nội dung.
 *
 * Hàm này chạy ở backend, không phụ thuộc trình duyệt: học sinh sửa mã
 * JavaScript cũng không bỏ qua được.
 */

export const NHAN_DA_CHE = '[đã ẩn – an toàn]';

/** Bỏ dấu tiếng Việt để so khớp không phụ thuộc cách gõ. */
function khongDau(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

export function chuaTuKhoa(text: string, tuKhoa: readonly string[]): boolean {
  const daChuanHoa = khongDau(text);
  return tuKhoa.some(khoa => {
    const chuan = khongDau(khoa).trim();
    return chuan.length > 0 && daChuanHoa.includes(chuan);
  });
}

export type KetQuaChe = { giaTri: string | null; daChe: boolean };

export function cheOText(text: string | null | undefined, tuKhoa: readonly string[]): KetQuaChe {
  if (text === null || text === undefined) return { giaTri: null, daChe: false };
  if (text.trim() === '') return { giaTri: text, daChe: false };
  if (chuaTuKhoa(text, tuKhoa)) return { giaTri: NHAN_DA_CHE, daChe: true };
  return { giaTri: text, daChe: false };
}

/** Các ô nội dung tự do của một bài nộp — chỉ những ô này mới bị che. */
export const O_NOI_DUNG = [
  'thu_lam',
  'nghi_1',
  'nghi_2',
  'nghi_3',
  'noi',
  'san_pham',
  'chia_se',
  'kiem_soat'
] as const;

export type BaiNopTho = Partial<Record<(typeof O_NOI_DUNG)[number], string | null | undefined>>;

export function cheBaiNop<T extends BaiNopTho>(
  bai: T,
  tuKhoa: readonly string[]
): { bai: T; daChe: boolean } {
  const ketQua: BaiNopTho = {};
  let daChe = false;
  for (const o of O_NOI_DUNG) {
    const che = cheOText(bai[o], tuKhoa);
    ketQua[o] = che.giaTri;
    if (che.daChe) daChe = true;
  }
  return { bai: { ...bai, ...ketQua } as T, daChe };
}
