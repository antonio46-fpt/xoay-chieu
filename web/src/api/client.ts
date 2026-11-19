/**
 * Lớp gọi API.
 *
 * Quy ước:
 *   - Luôn gửi kèm cookie phiên (credentials: 'include').
 *   - Lỗi mạng và lỗi máy chủ đều ném ra một ApiError có mã và thông báo
 *     tiếng Việt, để giao diện không phải tự đoán.
 *   - Không bao giờ đọc token: token nằm trong cookie httpOnly.
 */

export type ApiErrorCode =
  | 'SAI_THONG_TIN'
  | 'TAM_KHOA'
  | 'BI_KHOA'
  | 'CHUA_DANG_NHAP'
  | 'KHONG_DU_QUYEN'
  | 'MAT_KHAU_YEU'
  | 'SAI_MAT_KHAU'
  | 'MAT_KHAU_TRUNG'
  | 'DU_LIEU_KHONG_HOP_LE'
  | 'XUNG_DOT_ID'
  | 'XUNG_DOT_PHIEN_BAN'
  | 'QUA_NHIEU_YEU_CAU'
  | 'LOI_MAY_CHU'
  | 'LOI_MANG'
  | string;

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  /** Chi tiết từng lỗi kiểm tra dữ liệu, nếu máy chủ trả về. */
  chiTiet: string[];

  constructor(code: ApiErrorCode, message: string, status: number, chiTiet: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.chiTiet = chiTiet;
  }
}

const BASE = import.meta.env.VITE_API_BASE ?? '';

type YeuCau = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export async function api<T>(path: string, yeuCau: YeuCau = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: yeuCau.method ?? 'GET',
      credentials: 'include',
      headers: yeuCau.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: yeuCau.body === undefined ? undefined : JSON.stringify(yeuCau.body),
      signal: yeuCau.signal
    });
  } catch (loi) {
    if ((loi as Error).name === 'AbortError') throw loi;
    throw new ApiError('LOI_MANG', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0);
  }

  const laJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const duLieu = laJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const code = (duLieu?.error as string) ?? 'LOI_MAY_CHU';
    const message = (duLieu?.message as string) ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
    const chiTiet = Array.isArray(duLieu?.chiTiet) ? (duLieu.chiTiet as string[]) : [];
    throw new ApiError(code, message, res.status, chiTiet);
  }

  return duLieu as T;
}

export type Vai = 'student' | 'teacher' | 'coordinator' | 'admin' | 'super_admin' | 'research_viewer';

export type PhienNguoiDung = {
  user: { username: string; role: Vai; phaiDoiMatKhau: boolean };
  student: { ma: string; truong: string; lop: string } | null;
};

export type TuanTrangThai = {
  tuan: number;
  daNop: boolean;
  nopLuc: string | null;
  coBanNhap: boolean;
  capNhatNhapLuc: string | null;
};

export type TongQuan = {
  hocSinh: { ma: string; truong: string; lop: string };
  soTuanDaNop: number;
  cacTuan: TuanTrangThai[];
};

export const authApi = {
  me: () => api<PhienNguoiDung>('/api/auth/me'),
  login: (username: string, password: string) =>
    api<PhienNguoiDung>('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => api<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ ok: true }>('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
};

export type BaiNopTomTat = { id: string; tuan: number; nhanLuc: string; daChe: boolean };

export type BaiNopChiTiet = Record<string, unknown>;

export const meApi = {
  overview: () => api<TongQuan>('/api/me/overview'),
  submissions: () => api<{ items: BaiNopTomTat[] }>('/api/me/submissions'),
  submission: (id: string) => api<{ baiNop: BaiNopChiTiet }>(`/api/me/submissions/${id}`)
};
