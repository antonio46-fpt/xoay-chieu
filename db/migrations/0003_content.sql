-- =====================================================================
--  0003 — Nội dung bốn tuần lưu trong cơ sở dữ liệu
--
--  Trước đây đề bài nằm trong content.json đóng gói vào bản build. Bảng này
--  cho phép quản trị viên sửa qua giao diện, có lưu vết người sửa và thời
--  điểm, và khôi phục được về bản gốc.
-- =====================================================================

create table if not exists contents (
  tuan          int primary key check (tuan between 1 and 4),
  tieu_de       text not null,
  noi_dung      jsonb not null,
  -- Bản gốc để khôi phục; giữ nguyên không cho sửa.
  mac_dinh      jsonb not null,
  cap_nhat_luc  timestamptz not null default now(),
  cap_nhat_boi  uuid references users(id) on delete set null
);

comment on table contents is 'Đề bài và các bước của bốn tuần, sửa được qua trang quản trị';
comment on column contents.mac_dinh is 'Nội dung gốc từ content.json, dùng cho chức năng khôi phục';
