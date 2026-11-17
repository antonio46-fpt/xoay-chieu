/**
 * Token phiên.
 *
 * Token gốc chỉ tồn tại trong cookie của người dùng. Cơ sở dữ liệu chỉ lưu
 * băm SHA-256, nên nếu lộ bảng sessions cũng không dựng lại được token.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'xc_session';

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** So sánh hai chuỗi băm trong thời gian hằng để tránh rò rỉ qua thời gian. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
