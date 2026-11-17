/**
 * Băm mật khẩu bằng Argon2id.
 *
 * Tham số theo khuyến nghị OWASP 2024 cho Argon2id:
 *   memory 19 MiB, iterations 2, parallelism 1.
 * Chuỗi băm chứa sẵn tham số nên đổi tham số về sau vẫn kiểm tra được
 * mật khẩu cũ; hàm canRehash cho biết khi nào nên băm lại.
 */
import { hash, verify } from '@node-rs/argon2';

// 2 = Argon2id trong @node-rs/argon2. Dùng số trực tiếp vì thư viện khai báo
// Algorithm dưới dạng const enum, không dùng được với verbatimModuleSyntax.
const ARGON2ID = 2;

const THAM_SO = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1
} as const;

export async function hashPassword(matKhau: string): Promise<string> {
  return hash(matKhau, THAM_SO);
}

export async function verifyPassword(daBam: string, matKhau: string): Promise<boolean> {
  try {
    return await verify(daBam, matKhau);
  } catch {
    // Chuỗi băm hỏng hoặc sai định dạng: coi như không khớp, không ném lỗi ra ngoài.
    return false;
  }
}

/** true khi chuỗi băm dùng tham số yếu hơn hiện tại, nên băm lại sau khi đăng nhập. */
export function canRehash(daBam: string): boolean {
  return !daBam.includes(`m=${THAM_SO.memoryCost},t=${THAM_SO.timeCost},p=${THAM_SO.parallelism}`);
}

/** Kiểm tra độ mạnh tối thiểu của mật khẩu mới. */
export function passwordIssues(matKhau: string): string[] {
  const loi: string[] = [];
  if (matKhau.length < 8) loi.push('Mật khẩu phải có ít nhất 8 ký tự.');
  if (matKhau.length > 128) loi.push('Mật khẩu không được dài quá 128 ký tự.');
  if (!/[a-zA-Z]/.test(matKhau)) loi.push('Mật khẩu phải có ít nhất một chữ cái.');
  if (!/[0-9]/.test(matKhau)) loi.push('Mật khẩu phải có ít nhất một chữ số.');
  return loi;
}
