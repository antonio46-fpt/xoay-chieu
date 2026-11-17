import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashToken, newSessionToken, safeEqual } from '../src/security/token.ts';

test('token phiên đủ dài và không trùng nhau', () => {
  const ds = new Set<string>();
  for (let i = 0; i < 200; i += 1) ds.add(newSessionToken());
  assert.equal(ds.size, 200);
  assert.ok(newSessionToken().length >= 40, 'token phải đủ dài');
});

test('băm token ổn định và không trả lại token gốc', () => {
  const token = newSessionToken();
  const lan1 = hashToken(token);
  const lan2 = hashToken(token);
  assert.equal(lan1, lan2);
  assert.notEqual(lan1, token);
  assert.equal(lan1.length, 64, 'SHA-256 dạng hex dài 64 ký tự');
});

test('safeEqual so sánh đúng và sai', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});
