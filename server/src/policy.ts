/**
 * Phân quyền theo vai.
 *
 * Bảng role_permissions trong cơ sở dữ liệu là nguồn tham chiếu cho quản trị,
 * nhưng việc kiểm tra mỗi yêu cầu dùng bảng tĩnh dưới đây để không phải truy
 * vấn cơ sở dữ liệu trên từng request. Khi sửa quyền, sửa cả hai nơi.
 */

export type Vai =
  | 'student'
  | 'teacher'
  | 'coordinator'
  | 'admin'
  | 'super_admin'
  | 'research_viewer';

export type Quyen =
  | 'student.self'
  | 'progress.class.read'
  | 'session.note.write'
  | 'student.manage'
  | 'school.manage'
  | 'submission.read'
  | 'submission.export'
  | 'admin.manage'
  | 'content.manage'
  | 'content.read'
  | 'audit.read';

const BANG_QUYEN: Record<Vai, readonly Quyen[]> = {
  student: ['student.self'],
  teacher: ['progress.class.read'],
  coordinator: ['progress.class.read', 'session.note.write', 'content.read'],
  admin: [
    'student.manage',
    'school.manage',
    'submission.read',
    'submission.export',
    'content.manage',
    'content.read',
    'audit.read'
  ],
  super_admin: [
    'student.manage',
    'school.manage',
    'submission.read',
    'submission.export',
    'admin.manage',
    'content.manage',
    'content.read',
    'audit.read',
    'progress.class.read'
  ],
  research_viewer: ['submission.read', 'submission.export', 'content.read']
};

export function permissionsOf(vai: Vai): readonly Quyen[] {
  return BANG_QUYEN[vai] ?? [];
}

export function can(vai: Vai, quyen: Quyen): boolean {
  return permissionsOf(vai).includes(quyen);
}

/** Chỉ tài khoản quản trị được vào khu vực /admin; học sinh tuyệt đối không. */
export function isStaff(vai: Vai): boolean {
  return vai === 'admin' || vai === 'super_admin' || vai === 'research_viewer';
}

/** Chỉ super_admin được tạo hoặc sửa tài khoản quản trị khác. */
export function canManageAdmins(vai: Vai): boolean {
  return vai === 'super_admin';
}
