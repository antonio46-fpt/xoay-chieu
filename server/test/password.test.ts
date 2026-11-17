import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRehash, hashPassword, passwordIssues, verifyPassword } from '../src/security/password.ts';

test('băm mật khẩu không trả về chuỗi gốc', async () => {
  const daBam = await hashPassword('MatKhau123');
  assert.notEqual(daBam, 'MatKhau123');
  assert.ok(daBam.startsWith('$argon2id$'), 'phải dùng Argon2id');
  assert.ok(!daBam.includes('MatKhau123'), 'không được chứa mật khẩu gốc');
});

test('hai lần băm cùng mật khẩu cho hai chuỗi khác nhau', async () => {
  const a = await hashPassword('MatKhau123');
  const b = await hashPassword('MatKhau123');
  assert.notEqual(a, b, 'phải có muối ngẫu nhiên');
});

test('kiểm tra đúng và sai mật khẩu', async () => {
  const daBam = await hashPassword('MatKhau123');
  assert.equal(await verifyPassword(daBam, 'MatKhau123'), true);
  assert.equal(await verifyPassword(daBam, 'MatKhau124'), false);
  assert.equal(await verifyPassword(daBam, ''), false);
});

test('chuỗi băm hỏng không làm ném lỗi', async () => {
  assert.equal(await verifyPassword('khong-phai-hash', 'bat-ky'), false);
  assert.equal(await verifyPassword('', 'bat-ky'), false);
});

test('canRehash nhận ra tham số hiện tại', async () => {
  const daBam = await hashPassword('MatKhau123');
  assert.equal(canRehash(daBam), false);
  assert.equal(canRehash('$argon2id$v=19$m=4096,t=1,p=1$abc$def'), true);
});

test('quy tắc độ mạnh mật khẩu', () => {
  assert.deepEqual(passwordIssues('MatKhau123'), []);
  assert.equal(passwordIssues('abc1').length > 0, true, 'quá ngắn');
  assert.equal(passwordIssues('matkhaudai').some(x => x.includes('số')), true, 'thiếu chữ số');
  assert.equal(passwordIssues('12345678').some(x => x.includes('chữ cái')), true, 'thiếu chữ cái');
});
