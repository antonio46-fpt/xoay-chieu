/**
 * Nội dung bốn tuần.
 *
 * Tệp content.json là bản gốc đóng gói trong build. Sau khi đăng nhập, App
 * gọi `datNoiDungMoi()` để thay bằng bản trong cơ sở dữ liệu, nhờ đó quản trị
 * viên sửa đề bài mà không phải build lại giao diện.
 */
import duLieu from './content.json';

export type LoaiO = 'text' | 'select' | 'rating';

export type O = {
  key: string;
  label: string;
  min: number;
  max: number;
  kind: LoaiO;
  options?: string[];
};

export type Buoc = {
  title: string;
  stage: string;
  minutes: number;
  body: string;
  fields: O[];
  hints: string[];
};

export type LaThu = {
  tuan: number;
  triet_gia: string;
  tieu_de: string;
  doan: string[];
  ky?: string;
  nguon?: string;
};

export type Tuan = {
  tuan: number;
  title: string;
  focus: string;
  duration: number;
  quy_trinh?: string;
  letter: LaThu;
  steps: Buoc[];
};

type NoiDung = {
  phien_ban: string;
  so_tuan: number;
  tieu_chi_san_pham: [number, string][];
  weeks: Tuan[];
};

const noiDungGoc = duLieu as unknown as NoiDung;

/** Nội dung đang dùng: mặc định là bản đóng gói, thay được bằng bản từ máy chủ. */
let noiDung: NoiDung = noiDungGoc;

let bangNhan: Map<string, string> = new Map();

function dungLaiBangNhan(): void {
  const bang = new Map<string, string>();
  for (const tuan of noiDung.weeks) {
    for (const buoc of tuan.steps) {
      for (const o of buoc.fields) {
        if (!bang.has(o.key)) bang.set(o.key, o.label);
      }
    }
  }
  bangNhan = bang;
}

dungLaiBangNhan();

export const PHIEN_BAN_NOI_DUNG = noiDungGoc.phien_ban;
export const SO_TUAN = noiDungGoc.so_tuan;
export const THANG_TU_DANH_GIA = noiDungGoc.tieu_chi_san_pham;

/** Thay nội dung đang dùng bằng bản lấy từ máy chủ. */
export function datNoiDungMoi(weeks: Tuan[]): void {
  if (!Array.isArray(weeks) || weeks.length === 0) return;
  noiDung = { ...noiDung, weeks };
  dungLaiBangNhan();
}

export function layTuan(so: number): Tuan | undefined {
  return noiDung.weeks.find(t => t.tuan === so);
}

export function tatCaTuan(): Tuan[] {
  return noiDung.weeks;
}

/** Đếm từ theo khoảng trắng, giống quy tắc của bản 2.x. */
export function demTu(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function nhanCuaO(key: string): string {
  return bangNhan.get(key) ?? key;
}

/** Các khoá nội dung theo đúng thứ tự xuất hiện trong chương trình. */
export function cacKhoaNoiDung(): string[] {
  return [...bangNhan.keys()];
}
