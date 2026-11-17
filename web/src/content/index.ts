/**
 * Nội dung bốn tuần.
 *
 * Tệp content.json được sao nguyên từ src/content.json của bản 2.x, không sửa
 * một chữ nào. Type ở đây chỉ mô tả hình dạng để TypeScript kiểm tra.
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

const noiDung = duLieu as unknown as NoiDung;

export const PHIEN_BAN_NOI_DUNG = noiDung.phien_ban;
export const SO_TUAN = noiDung.so_tuan;
export const THANG_TU_DANH_GIA = noiDung.tieu_chi_san_pham;

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
