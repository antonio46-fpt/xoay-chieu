-- =====================================================================
--  Tạo tài khoản PostgreSQL theo nguyên tắc đặc quyền tối thiểu.
--
--  Ứng dụng KHÔNG được kết nối bằng tài khoản superuser hay chủ sở hữu
--  cluster. Chạy tệp này một lần bằng tài khoản quản trị:
--
--     sudo -u postgres psql -f db/roles.sql
--
--  Sau đó trỏ DATABASE_URL vào tài khoản xoaychieu_app.
-- =====================================================================

-- Tài khoản ứng dụng: chỉ được đăng nhập, không tạo database, không tạo role.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'xoaychieu_app') then
    create role xoaychieu_app login password 'THAY_BANG_MAT_KHAU_MANH'
      nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end
$$;

-- Quyền tối thiểu trên database: kết nối và dùng schema public.
grant connect on database xoaychieu to xoaychieu_app;
grant usage on schema public to xoaychieu_app;

-- Chỉ đọc/ghi dữ liệu, không được sửa cấu trúc bảng (DDL do migration chạy
-- bằng tài khoản chủ sở hữu riêng).
grant select, insert, update, delete on all tables in schema public to xoaychieu_app;
grant usage, select on all sequences in schema public to xoaychieu_app;

-- Áp dụng cho cả bảng tạo sau này.
alter default privileges in schema public
  grant select, insert, update, delete on tables to xoaychieu_app;
alter default privileges in schema public
  grant usage, select on sequences to xoaychieu_app;

-- Không cho tạo đối tượng mới trong schema public.
revoke create on schema public from public;
revoke create on schema public from xoaychieu_app;

-- Ghi chú: tài khoản chạy migration cần quyền DDL, nên dùng tài khoản
-- chủ sở hữu database chứ không dùng xoaychieu_app.
