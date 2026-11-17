import assert from 'node:assert/strict';
import { test } from 'node:test';
import { can, canManageAdmins, isStaff, permissionsOf } from '../src/policy.ts';

test('học sinh chỉ có quyền của chính mình', () => {
  assert.deepEqual(permissionsOf('student'), ['student.self']);
  assert.equal(can('student', 'student.manage'), false);
  assert.equal(can('student', 'submission.read'), false);
  assert.equal(can('student', 'admin.manage'), false);
});

test('giáo viên chỉ xem tiến trình, không đọc bài', () => {
  assert.equal(can('teacher', 'progress.class.read'), true);
  assert.equal(can('teacher', 'submission.read'), false);
});

test('điều phối viên ghi được phiếu buổi nhưng không đọc bài', () => {
  assert.equal(can('coordinator', 'session.note.write'), true);
  assert.equal(can('coordinator', 'submission.read'), false);
});

test('admin quản lý học sinh nhưng không quản lý admin khác', () => {
  assert.equal(can('admin', 'student.manage'), true);
  assert.equal(can('admin', 'admin.manage'), false);
  assert.equal(canManageAdmins('admin'), false);
});

test('chỉ super_admin quản lý tài khoản quản trị', () => {
  assert.equal(can('super_admin', 'admin.manage'), true);
  assert.equal(canManageAdmins('super_admin'), true);
});

test('research_viewer chỉ đọc và xuất dữ liệu', () => {
  assert.equal(can('research_viewer', 'submission.read'), true);
  assert.equal(can('research_viewer', 'submission.export'), true);
  assert.equal(can('research_viewer', 'student.manage'), false);
});

test('khu vực quản trị loại học sinh và giáo viên', () => {
  assert.equal(isStaff('student'), false);
  assert.equal(isStaff('teacher'), false);
  assert.equal(isStaff('admin'), true);
  assert.equal(isStaff('research_viewer'), true);
});
