/**
 * Kiểm tra dữ liệu đầu vào ở phía server.
 *
 * Mọi thứ đến từ trình duyệt đều không đáng tin. Các lược đồ dưới đây là
 * hàng rào thứ nhất; ràng buộc cơ sở dữ liệu là hàng rào thứ hai.
 */
import { z } from 'zod';

export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,63}$/, 'Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới, gạch nối');

export const PasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(128, 'Mật khẩu không được dài quá 128 ký tự');

export const LoginSchema = z.object({
  username: UsernameSchema,
  password: z.string().min(1).max(128)
});

export const MaHocSinhSchema = z
  .string()
  .trim()
  .min(3, 'Mã học sinh quá ngắn')
  .max(32, 'Mã học sinh quá dài')
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, 'Mã học sinh chỉ gồm chữ, số và gạch nối');

export const CreateStudentSchema = z.object({
  username: UsernameSchema,
  password: PasswordSchema,
  ma: MaHocSinhSchema,
  schoolId: z.string().uuid(),
  classId: z.string().uuid()
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(64).optional(),
  schoolId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  status: z.enum(['all', 'active', 'locked']).default('all')
});

export const TuanSchema = z.coerce.number().int().min(1).max(4);

/** Nội dung bài nộp: cho phép null nhưng không cho phép chuỗi quá dài. */
const BaiText = z.string().max(20_000).nullable().optional();

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  tuan: TuanSchema,
  bat_dau: z.string().max(40).nullable().optional(),
  thu_lam: BaiText,
  nghi_1: BaiText,
  nghi_2: BaiText,
  nghi_3: BaiText,
  noi: BaiText,
  dang_san_pham: z.string().max(20_000).nullable().optional(),
  san_pham: BaiText,
  chia_se: BaiText,
  tu_danh_gia: z.string().max(64).nullable().optional(),
  thoi_luong_giay: z.number().int().min(0).max(86_400).nullable().optional(),
  thoi_gian_troi_giay: z.number().int().min(0).max(86_400).nullable().optional(),
  phe: z.string().max(64).nullable().optional(),
  doi_hay_giu: z.string().max(64).nullable().optional(),
  kiem_soat: BaiText,
  ngoai_kiem_soat: z.string().max(20_000).nullable().optional(),
  ban_goc_id: z.string().uuid().nullable().optional(),
  phien_ban_app: z.string().max(32).nullable().optional(),
  phien_ban_noi_dung: z.string().max(32).nullable().optional(),
  so_lan_dan: z.number().int().min(0).max(100_000).optional()
});

export const DraftSchema = z.object({
  tuan: TuanSchema,
  mutationId: z.string().max(64),
  expectedRevision: z.number().int().min(0),
  cac_o: z.record(z.string(), z.string().max(20_000))
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SubmissionInput = z.infer<typeof SubmissionSchema>;
