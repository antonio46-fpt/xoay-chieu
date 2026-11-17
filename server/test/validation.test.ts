import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CreateStudentSchema, LoginSchema, PaginationSchema, SubmissionSchema, UsernameSchema } from '../src/validation.ts';

test('username được chuyển về chữ thường', () => {
  assert.equal(UsernameSchema.parse('  CH12-T  '), 'ch12-t');
  assert.equal(UsernameSchema.safeParse('ab').success, false, 'quá ngắn');
  assert.equal(UsernameSchema.safeParse('có dấu').success, false);
  assert.equal(UsernameSchema.safeParse('hs.10a3-01').success, true);
});

test('đăng nhập thiếu trường thì bị từ chối', () => {
  assert.equal(LoginSchema.safeParse({ username: 'abc123' }).success, false);
  assert.equal(LoginSchema.safeParse({ username: 'abc123', password: '' }).success, false);
  assert.equal(LoginSchema.safeParse({ username: 'abc123', password: 'x' }).success, true);
});

test('phân trang có mặc định và chặn giá trị xấu', () => {
  const mac = PaginationSchema.parse({});
  assert.equal(mac.page, 1);
  assert.equal(mac.pageSize, 25);
  assert.equal(mac.status, 'all');
  assert.equal(PaginationSchema.safeParse({ pageSize: 1000 }).success, false);
});

test('tạo học sinh đòi hỏi uuid hợp lệ cho trường và lớp', () => {
  const nen = {
    username: 'hs01',
    password: 'MatKhau123',
    ma: 'CH12-T',
    schoolId: 'khong-phai-uuid',
    classId: 'cung-khong'
  };
  assert.equal(CreateStudentSchema.safeParse(nen).success, false);
});

test('mã học sinh chặn ký tự lạ', () => {
  const nen = {
    username: 'hs01',
    password: 'MatKhau123',
    schoolId: '11111111-1111-4111-8111-111111111111',
    classId: '22222222-2222-4222-8222-222222222222'
  };
  assert.equal(CreateStudentSchema.safeParse({ ...nen, ma: 'CH12-T' }).success, true);
  assert.equal(CreateStudentSchema.safeParse({ ...nen, ma: 'CH 12' }).success, false);
  assert.equal(CreateStudentSchema.safeParse({ ...nen, ma: '<script>' }).success, false);
});

test('bài nộp bắt buộc id dạng uuid và tuần 1..4', () => {
  const id = '33333333-3333-4333-8333-333333333333';
  assert.equal(SubmissionSchema.safeParse({ id, tuan: 2 }).success, true);
  assert.equal(SubmissionSchema.safeParse({ id: 'abc', tuan: 2 }).success, false);
  assert.equal(SubmissionSchema.safeParse({ id, tuan: 5 }).success, false);
});
