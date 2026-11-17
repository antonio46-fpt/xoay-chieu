-- =====================================================================
-- Xoay Chiều 3.0.0 — migration 0001: lược đồ khởi tạo
--
-- Chạy:  psql "$DATABASE_URL" -f db/migrations/0001_init.sql
-- Hoặc:  npm run db:migrate  (xem server/README.md)
--
-- Nguyên tắc:
--   * Không có cột họ tên học sinh. Nghiệp vụ hiện tại không cần.
--   * Mọi bảng có khoá chính, khoá ngoại và ràng buộc rõ ràng.
--   * Bài nộp là bất biến: không có UPDATE trên bảng submissions.
--   * Mã học sinh chỉ duy nhất trong phạm vi một trường, nên danh tính
--     dùng users.username (duy nhất toàn hệ thống), không dùng mã.
-- =====================================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------- vai trò
create table if not exists roles (
  name        text primary key,
  mo_ta       text not null,
  tao_luc     timestamptz not null default now()
);

create table if not exists permissions (
  name        text primary key,
  mo_ta       text not null
);

create table if not exists role_permissions (
  role        text not null references roles(name) on delete cascade,
  permission  text not null references permissions(name) on delete cascade,
  primary key (role, permission)
);

insert into roles (name, mo_ta) values
  ('student',         'Học sinh — chỉ làm bài và xem bài của mình'),
  ('teacher',         'Giáo viên chủ nhiệm — xem mã và tiến trình của lớp mình'),
  ('coordinator',     'Điều phối viên — ghi phiếu buổi, phiếu đổi ý'),
  ('admin',           'Quản trị — quản lý tài khoản, trường lớp, bài nộp'),
  ('super_admin',     'Quản trị cấp cao — quản lý cả tài khoản quản trị'),
  ('research_viewer', 'Chỉ đọc dữ liệu nghiên cứu trong phạm vi được cấp')
on conflict (name) do nothing;

insert into permissions (name, mo_ta) values
  ('student.self',        'Xem và nộp bài của chính mình'),
  ('progress.class.read', 'Xem tiến trình của lớp được phân công'),
  ('session.note.write',  'Ghi phiếu buổi học'),
  ('student.manage',      'Tạo, sửa, khoá, đặt lại mật khẩu học sinh'),
  ('school.manage',       'Quản lý trường và lớp'),
  ('submission.read',     'Đọc nội dung bài nộp'),
  ('submission.export',   'Xuất dữ liệu nghiên cứu'),
  ('admin.manage',        'Quản lý tài khoản quản trị'),
  ('audit.read',          'Đọc nhật ký thao tác')
on conflict (name) do nothing;

insert into role_permissions (role, permission) values
  ('student', 'student.self'),
  ('teacher', 'progress.class.read'),
  ('coordinator', 'session.note.write'),
  ('coordinator', 'progress.class.read'),
  ('admin', 'student.manage'), ('admin', 'school.manage'),
  ('admin', 'submission.read'), ('admin', 'submission.export'),
  ('admin', 'audit.read'),
  ('super_admin', 'student.manage'), ('super_admin', 'school.manage'),
  ('super_admin', 'submission.read'), ('super_admin', 'submission.export'),
  ('super_admin', 'admin.manage'), ('super_admin', 'audit.read'),
  ('super_admin', 'progress.class.read'),
  ('research_viewer', 'submission.read'), ('research_viewer', 'submission.export')
on conflict do nothing;

-- ------------------------------------------------------ trường và lớp
create table if not exists schools (
  id          uuid primary key default gen_random_uuid(),
  ma          text not null unique,
  ten         text not null,
  dang_hoat_dong boolean not null default true,
  tao_luc     timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now()
);

create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete restrict,
  ma          text not null,
  ten         text not null,
  dang_hoat_dong boolean not null default true,
  tao_luc     timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  unique (school_id, ma)
);

create index if not exists classes_school_idx on classes (school_id);

-- ------------------------------------------------------- hồ sơ học sinh
-- Mã học sinh chỉ duy nhất trong một trường. Danh tính đăng nhập nằm ở
-- users.username, không dùng mã để xác thực.
create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  ma          text not null,
  school_id   uuid not null references schools(id) on delete restrict,
  class_id    uuid not null references classes(id) on delete restrict,
  tao_luc     timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  unique (school_id, ma)
);

create index if not exists students_class_idx on students (class_id);

-- ---------------------------------------------------------- tài khoản
create table if not exists users (
  id                uuid primary key default gen_random_uuid(),
  username          text not null unique,
  password_hash     text not null,
  role              text not null references roles(name) on delete restrict,
  student_id        uuid unique references students(id) on delete cascade,
  dang_hoat_dong    boolean not null default true,
  phai_doi_mat_khau boolean not null default false,
  so_lan_sai        int not null default 0 check (so_lan_sai >= 0),
  khoa_den          timestamptz,
  dang_nhap_cuoi    timestamptz,
  tao_luc           timestamptz not null default now(),
  cap_nhat_luc      timestamptz not null default now(),
  -- Tài khoản học sinh bắt buộc gắn hồ sơ; vai khác thì không.
  constraint users_student_link check (
    (role = 'student' and student_id is not null) or
    (role <> 'student' and student_id is null)
  ),
  constraint users_username_shape check (username ~ '^[a-z0-9][a-z0-9._-]{2,63}$')
);

create index if not exists users_role_idx on users (role);
create index if not exists users_student_idx on users (student_id);

-- ------------------------------------------------------------ phiên
-- Chỉ lưu băm của token. Lộ bảng phiên cũng không dùng lại được token.
create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  token_hash    text not null unique,
  ip            text,
  user_agent    text,
  tao_luc       timestamptz not null default now(),
  het_han       timestamptz not null,
  thu_hoi_luc   timestamptz
);

create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_het_han_idx on sessions (het_han);

-- --------------------------------------------------------- bài nộp
-- id do trình duyệt sinh, dùng làm khoá chống trùng: gửi lại cùng id
-- thì chỉ một dòng. Không có cột nào cho phép sửa về sau.
create table if not exists submissions (
  id                  uuid primary key,
  student_id          uuid not null references students(id) on delete restrict,
  school_id           uuid not null references schools(id) on delete restrict,
  class_id            uuid not null references classes(id) on delete restrict,
  tuan                int not null check (tuan between 1 and 4),
  nhan_luc            timestamptz not null default now(),
  bat_dau             timestamptz,
  thu_lam             text,
  nghi_1              text,
  nghi_2              text,
  nghi_3              text,
  noi                 text,
  dang_san_pham       text,
  san_pham            text,
  chia_se             text,
  tu_danh_gia         text,
  thoi_luong_giay     int check (thoi_luong_giay is null or thoi_luong_giay >= 0),
  thoi_gian_troi_giay int check (thoi_gian_troi_giay is null or thoi_gian_troi_giay >= 0),
  phe                 text,
  doi_hay_giu         text,
  kiem_soat           text,
  ngoai_kiem_soat     text,
  ban_goc_id          uuid references submissions(id) on delete set null,
  phien_ban_app       text,
  phien_ban_noi_dung  text,
  so_lan_dan          int not null default 0 check (so_lan_dan between 0 and 100000),
  -- Vết kiểm toán: nội dung đã bị che bởi backend hay không.
  da_che              boolean not null default false
);

create index if not exists submissions_student_idx on submissions (student_id, tuan);
create index if not exists submissions_class_idx on submissions (class_id, tuan);
create index if not exists submissions_nhan_luc_idx on submissions (nhan_luc desc);

-- Bài nộp là bất biến. Chặn mọi UPDATE ở tầng cơ sở dữ liệu.
create or replace function chan_sua_bai_nop() returns trigger
language plpgsql as $$
begin
  raise exception 'Bài nộp là bất biến: không được sửa (id=%).', old.id
    using errcode = 'restrict_violation';
end $$;

drop trigger if exists submissions_bat_bien on submissions;
create trigger submissions_bat_bien
  before update on submissions
  for each row execute function chan_sua_bai_nop();

-- ------------------------------------------------------------ bản nháp
create table if not exists drafts (
  student_id   uuid not null references students(id) on delete cascade,
  tuan         int not null check (tuan between 1 and 4),
  revision     int not null default 1 check (revision >= 0),
  mutation_id  text,
  du_lieu      jsonb not null default '{}'::jsonb,
  cap_nhat_luc timestamptz not null default now(),
  primary key (student_id, tuan)
);

-- ----------------------------------------------------------- tiến độ
-- Chỉ sinh ra từ dữ liệu backend đã xác nhận, không nhận từ trình duyệt.
create table if not exists progress (
  student_id    uuid not null references students(id) on delete cascade,
  tuan          int not null check (tuan between 1 and 4),
  submission_id uuid not null references submissions(id) on delete cascade,
  luc           timestamptz not null default now(),
  primary key (student_id, tuan)
);

-- --------------------------------------------------------- nhật ký
create table if not exists audit_log (
  id          bigserial primary key,
  actor_id    uuid references users(id) on delete set null,
  hanh_dong   text not null,
  doi_tuong   text,
  doi_tuong_id text,
  du_lieu     jsonb not null default '{}'::jsonb,
  ip          text,
  luc         timestamptz not null default now()
);

create index if not exists audit_log_luc_idx on audit_log (luc desc);
create index if not exists audit_log_actor_idx on audit_log (actor_id);

-- --------------------------------------------------------- cấu hình
create table if not exists settings (
  khoa      text primary key,
  gia_tri   jsonb not null,
  cap_nhat_luc timestamptz not null default now()
);

insert into settings (khoa, gia_tri) values
  ('phien_ban_app', '"3.0.0"'::jsonb),
  ('thoi_han_phien_gio', '12'::jsonb),
  ('so_lan_sai_toi_da', '8'::jsonb),
  ('phut_khoa_sai', '15'::jsonb)
on conflict (khoa) do nothing;

commit;
