-- =====================================================================
-- Xoay Chiều 3.0.0 — migration 0002: phân công nhân sự, phiếu buổi, đổi ý
--
-- Bổ sung hai bảng nghiệp vụ có ở bản 2.x nhưng thiếu trong 0001:
--   phieu_buoi  — điều phối viên ghi lại buổi học
--   doi_y       — nhóm đổi hoặc giữ ý ở tuần 3
-- và bảng phân công để biết giáo viên / điều phối viên phụ trách lớp nào.
-- =====================================================================

begin;

-- ------------------------------------------------------- phân công
-- Một người có thể phụ trách nhiều lớp, một lớp có nhiều người.
create table if not exists staff_assignments (
  user_id  uuid not null references users(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  vai      text not null check (vai in ('teacher', 'coordinator')),
  tao_luc  timestamptz not null default now(),
  primary key (user_id, class_id, vai)
);

create index if not exists staff_assignments_class_idx on staff_assignments (class_id);

-- Vai trong bảng phân công phải khớp vai của tài khoản.
create or replace function kiem_vai_phan_cong() returns trigger
language plpgsql as $$
declare
  vai_that text;
begin
  select role into vai_that from users where id = new.user_id;
  if vai_that is distinct from new.vai then
    raise exception 'Vai phân công (%) không khớp vai tài khoản (%).', new.vai, coalesce(vai_that, 'không có')
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists staff_assignments_kiem_vai on staff_assignments;
create trigger staff_assignments_kiem_vai
  before insert or update on staff_assignments
  for each row execute function kiem_vai_phan_cong();

-- ------------------------------------------------------ phiếu buổi
-- id do trình duyệt sinh để chống trùng khi gửi lại.
create table if not exists phieu_buoi (
  id                      uuid primary key,
  class_id                uuid not null references classes(id) on delete restrict,
  school_id               uuid not null references schools(id) on delete restrict,
  tuan                    int not null check (tuan between 1 and 4),
  ngay                    date,
  khung_gio               text,
  thoi_luong_thuc_te_phut int check (thoi_luong_thuc_te_phut is null or thoi_luong_thuc_te_phut between 0 and 600),
  si_so                   int check (si_so is null or si_so between 0 and 500),
  so_tham_gia             int check (so_tham_gia is null or so_tham_gia between 0 and 500),
  da_lam_mo_thu           boolean not null default false,
  da_lam_thu              boolean not null default false,
  da_lam_nghi             boolean not null default false,
  da_lam_noi              boolean not null default false,
  da_lam_chia_se          boolean not null default false,
  dung_app_hay_giay       text check (dung_app_hay_giay is null or dung_app_hay_giay in ('app', 'giay', 'ca_hai')),
  dieu_tot                text,
  kho_khan                text,
  ghi_chu                 text,
  phien_ban_app           text,
  nguoi_ghi               uuid references users(id) on delete set null,
  nhan_luc                timestamptz not null default now()
);

create index if not exists phieu_buoi_class_idx on phieu_buoi (class_id, tuan);
create index if not exists phieu_buoi_ngay_idx on phieu_buoi (ngay desc);

-- --------------------------------------------------------- đổi ý
create table if not exists doi_y (
  id            uuid primary key,
  class_id      uuid not null references classes(id) on delete restrict,
  school_id     uuid not null references schools(id) on delete restrict,
  tuan          int not null check (tuan between 1 and 4),
  nhom          text,
  doi_hay_giu   text check (doi_hay_giu is null or doi_hay_giu in ('doi', 'giu')),
  vi_sao        text,
  phien_ban_app text,
  nguoi_ghi     uuid references users(id) on delete set null,
  nhan_luc      timestamptz not null default now()
);

create index if not exists doi_y_class_idx on doi_y (class_id, tuan);

commit;
