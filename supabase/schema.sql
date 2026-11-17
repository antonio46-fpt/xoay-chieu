-- =====================================================================
-- Xoay Chiều — lược đồ Supabase, giai đoạn 1
--
-- Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ
-- tệp này → Run. Chạy lại nhiều lần cũng an toàn (idempotent).
--
-- Nguyên tắc bảo mật:
--   * Bật RLS trên mọi bảng và KHÔNG tạo policy nào cho anon.
--     Nghĩa là khoá công khai (anon key) không đọc/ghi trực tiếp được gì.
--   * Mọi thao tác đi qua hàm SECURITY DEFINER bên dưới. Hàm tự kiểm tra
--     phiên, tự kiểm tra dữ liệu, tự che nội dung nhạy cảm.
--   * Nhờ vậy phần "máy chủ" cũ vẫn tồn tại về mặt logic, chỉ là nó nằm
--     trong Postgres thay vì trong Apps Script.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- bảng
create table if not exists tai_khoan (
  ma        text        not null,
  truong    text        not null,
  lop       text        not null,
  trang_thai text       not null default 'hoat_dong',
  tao_luc   timestamptz not null default now(),
  primary key (ma, truong, lop)
);

create table if not exists phien (
  token    uuid        primary key default gen_random_uuid(),
  vai      text        not null check (vai in ('hoc_sinh', 'giao_vien', 'dieu_phoi')),
  ma       text,
  truong   text,
  lop      text,
  het_han  timestamptz not null,
  tao_luc  timestamptz not null default now()
);

create index if not exists phien_het_han_idx on phien (het_han);

-- Bài nộp của học sinh. Giữ đúng 27 cột như bản Google Sheets để dữ liệu
-- cũ chuyển sang được mà không phải ánh xạ lại.
create table if not exists chu_trinh (
  id                  uuid        primary key,
  thoi_gian_nhan      timestamptz not null default now(),
  thoi_gian           text,
  bat_dau             text,
  ma                  text        not null,
  truong              text        not null,
  lop                 text        not null,
  tuan                int         not null check (tuan between 1 and 4),
  thu_lam             text,
  nghi_1              text,
  nghi_2              text,
  nghi_3              text,
  noi                 text,
  dang_san_pham       text,
  san_pham            text,
  chia_se             text,
  tu_danh_gia         text,
  thoi_luong_giay     int,
  thoi_gian_troi_giay int,
  phe                 text,
  doi_hay_giu         text,
  kiem_soat           text,
  ngoai_kiem_soat     text,
  ban_goc_id          uuid,
  phien_ban_app       text,
  phien_ban_noi_dung  text,
  so_lan_dan          int not null default 0
);

create index if not exists chu_trinh_lop_tuan_idx on chu_trinh (lop, tuan);
create index if not exists chu_trinh_ma_idx on chu_trinh (ma, lop, tuan);

-- Bản nháp đồng bộ giữa các thiết bị. Cắt thành 16 ô như bản cũ.
create table if not exists nhap_hoc_tap (
  ma             text        not null,
  truong         text        not null,
  lop            text        not null,
  tuan           int         not null,
  revision       int         not null default 0,
  mutation_id    text,
  cap_nhat_luc   timestamptz not null default now(),
  o_01 text, o_02 text, o_03 text, o_04 text, o_05 text, o_06 text, o_07 text, o_08 text,
  o_09 text, o_10 text, o_11 text, o_12 text, o_13 text, o_14 text, o_15 text, o_16 text,
  primary key (ma, truong, lop, tuan)
);

create table if not exists tien_do (
  ma          text        not null,
  truong      text        not null,
  lop         text        not null,
  tuan        int         not null check (tuan between 1 and 4),
  cap_nhat_luc timestamptz not null default now(),
  primary key (ma, truong, lop, tuan)
);

-- Bật RLS, không tạo policy: anon không chạm được trực tiếp.
alter table tai_khoan    enable row level security;
alter table phien        enable row level security;
alter table chu_trinh    enable row level security;
alter table nhap_hoc_tap enable row level security;
alter table tien_do      enable row level security;

-- ------------------------------------------------------- hàm tiện ích
-- Che nội dung nhạy cảm ngay trong cơ sở dữ liệu, không tin trình duyệt.
create or replace function che_noi_dung(p_text text, p_tu_khoa text[])
returns text
language plpgsql
immutable
as $$
declare
  v_lower text;
begin
  if p_text is null or btrim(p_text) = '' then
    return p_text;
  end if;
  v_lower := lower(p_text);
  if exists (
    select 1 from unnest(p_tu_khoa) as khoa
    where khoa <> '' and strpos(v_lower, lower(khoa)) > 0
  ) then
    return '[đã ẩn – an toàn]';
  end if;
  return p_text;
end $$;

-- Số từ, tách theo khoảng trắng. Dùng để kiểm tra tối thiểu.
create or replace function dem_tu(p_text text)
returns int
language sql
immutable
as $$
  select coalesce(array_length(regexp_split_to_array(btrim(coalesce(p_text, '')), '\s+'), 1), 0)
  where btrim(coalesce(p_text, '')) <> '';
$$;

-- --------------------------------------------------------- đăng nhập
create or replace function hoc_sinh_dang_nhap(p_ma text, p_truong text, p_lop text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
  v_het_han timestamptz := now() + interval '6 hours';
begin
  if coalesce(btrim(p_ma), '') = '' or coalesce(btrim(p_truong), '') = '' or coalesce(btrim(p_lop), '') = '' then
    return jsonb_build_object('status', 'error', 'code', 'THIEU_THONG_TIN');
  end if;

  if not exists (
    select 1 from tai_khoan
    where ma = btrim(p_ma) and truong = btrim(p_truong) and lop = btrim(p_lop)
      and trang_thai = 'hoat_dong'
  ) then
    return jsonb_build_object('status', 'error', 'code', 'MA_KHONG_DUNG');
  end if;

  insert into phien (vai, ma, truong, lop, het_han)
  values ('hoc_sinh', btrim(p_ma), btrim(p_truong), btrim(p_lop), v_het_han)
  returning token into v_token;

  return jsonb_build_object(
    'status', 'ok',
    'token', v_token,
    'vai', 'hoc_sinh',
    'ma', btrim(p_ma),
    'truong', btrim(p_truong),
    'lop', btrim(p_lop),
    'het_han', v_het_han
  );
end $$;

-- ------------------------------------------------------- nộp bài
-- Chống trùng bằng chính khoá chính id: gửi lại nhiều lần vẫn một dòng.
create or replace function nop_bai(p_token uuid, p_payload jsonb, p_tu_khoa text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s phien%rowtype;
  v_id uuid;
  v_cu chu_trinh%rowtype;
  v_tuan int;
begin
  select * into s from phien where token = p_token and het_han > now();
  if not found then
    return jsonb_build_object('status', 'error', 'code', 'PHIEN_HET_HAN');
  end if;

  begin
    v_id := (p_payload->>'id')::uuid;
  exception when others then
    return jsonb_build_object('status', 'error', 'code', 'ID_KHONG_HOP_LE');
  end;

  v_tuan := coalesce((p_payload->>'tuan')::int, 0);
  if v_tuan < 1 or v_tuan > 4 then
    return jsonb_build_object('status', 'error', 'code', 'TUAN_KHONG_HOP_LE');
  end if;

  -- Đã có dòng cùng id: so nội dung để quyết định ACK hay xung đột.
  select * into v_cu from chu_trinh where id = v_id;
  if found then
    if v_cu.tuan = v_tuan and v_cu.ma = s.ma then
      return jsonb_build_object('status', 'ok', 'code', 'DA_NHAN_TRUOC_DO', 'id', v_id);
    end if;
    return jsonb_build_object('status', 'error', 'code', 'XUNG_DOT_ID', 'id', v_id);
  end if;

  insert into chu_trinh (
    id, thoi_gian, bat_dau, ma, truong, lop, tuan,
    thu_lam, nghi_1, nghi_2, nghi_3, noi, dang_san_pham, san_pham, chia_se,
    tu_danh_gia, thoi_luong_giay, thoi_gian_troi_giay, phe, doi_hay_giu,
    kiem_soat, ngoai_kiem_soat, ban_goc_id,
    phien_ban_app, phien_ban_noi_dung, so_lan_dan
  ) values (
    v_id,
    p_payload->>'thoi_gian',
    p_payload->>'bat_dau',
    s.ma, s.truong, s.lop, v_tuan,
    che_noi_dung(p_payload->>'thu_lam', p_tu_khoa),
    che_noi_dung(p_payload->>'nghi_1', p_tu_khoa),
    che_noi_dung(p_payload->>'nghi_2', p_tu_khoa),
    che_noi_dung(p_payload->>'nghi_3', p_tu_khoa),
    che_noi_dung(p_payload->>'noi', p_tu_khoa),
    p_payload->>'dang_san_pham',
    che_noi_dung(p_payload->>'san_pham', p_tu_khoa),
    che_noi_dung(p_payload->>'chia_se', p_tu_khoa),
    p_payload->>'tu_danh_gia',
    nullif(p_payload->>'thoi_luong_giay', '')::int,
    nullif(p_payload->>'thoi_gian_troi_giay', '')::int,
    p_payload->>'phe',
    p_payload->>'doi_hay_giu',
    che_noi_dung(p_payload->>'kiem_soat', p_tu_khoa),
    p_payload->>'ngoai_kiem_soat',
    nullif(p_payload->>'ban_goc_id', '')::uuid,
    p_payload->>'phien_ban_app',
    p_payload->>'phien_ban_noi_dung',
    coalesce(nullif(p_payload->>'so_lan_dan', '')::int, 0)
  );

  insert into tien_do (ma, truong, lop, tuan)
  values (s.ma, s.truong, s.lop, v_tuan)
  on conflict (ma, truong, lop, tuan) do update set cap_nhat_luc = now();

  return jsonb_build_object('status', 'ok', 'code', 'DA_GHI', 'id', v_id);
end $$;

-- --------------------------------------------------- nháp: lưu và đọc
create or replace function luu_nhap(
  p_token uuid,
  p_tuan int,
  p_mutation_id text,
  p_expected_revision int,
  p_cac_o jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s phien%rowtype;
  v_revision int;
begin
  select * into s from phien where token = p_token and het_han > now();
  if not found then
    return jsonb_build_object('status', 'error', 'code', 'PHIEN_HET_HAN');
  end if;

  select revision into v_revision
  from nhap_hoc_tap
  where ma = s.ma and truong = s.truong and lop = s.lop and tuan = p_tuan;

  if found and v_revision <> p_expected_revision then
    return jsonb_build_object('status', 'conflict', 'revision', v_revision);
  end if;

  if not found and p_expected_revision <> 0 then
    return jsonb_build_object('status', 'conflict', 'revision', 0);
  end if;

  insert into nhap_hoc_tap (
    ma, truong, lop, tuan, revision, mutation_id, cap_nhat_luc,
    o_01, o_02, o_03, o_04, o_05, o_06, o_07, o_08,
    o_09, o_10, o_11, o_12, o_13, o_14, o_15, o_16
  ) values (
    s.ma, s.truong, s.lop, p_tuan, coalesce(v_revision, 0) + 1, p_mutation_id, now(),
    p_cac_o->>'o_01', p_cac_o->>'o_02', p_cac_o->>'o_03', p_cac_o->>'o_04',
    p_cac_o->>'o_05', p_cac_o->>'o_06', p_cac_o->>'o_07', p_cac_o->>'o_08',
    p_cac_o->>'o_09', p_cac_o->>'o_10', p_cac_o->>'o_11', p_cac_o->>'o_12',
    p_cac_o->>'o_13', p_cac_o->>'o_14', p_cac_o->>'o_15', p_cac_o->>'o_16'
  )
  on conflict (ma, truong, lop, tuan) do update set
    revision = nhap_hoc_tap.revision + 1,
    mutation_id = excluded.mutation_id,
    cap_nhat_luc = now(),
    o_01 = excluded.o_01, o_02 = excluded.o_02, o_03 = excluded.o_03, o_04 = excluded.o_04,
    o_05 = excluded.o_05, o_06 = excluded.o_06, o_07 = excluded.o_07, o_08 = excluded.o_08,
    o_09 = excluded.o_09, o_10 = excluded.o_10, o_11 = excluded.o_11, o_12 = excluded.o_12,
    o_13 = excluded.o_13, o_14 = excluded.o_14, o_15 = excluded.o_15, o_16 = excluded.o_16;

  return jsonb_build_object('status', 'ok', 'revision', coalesce(v_revision, 0) + 1);
end $$;

create or replace function doc_nhap(p_token uuid, p_tuan int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s phien%rowtype;
  v_row nhap_hoc_tap%rowtype;
begin
  select * into s from phien where token = p_token and het_han > now();
  if not found then
    return jsonb_build_object('status', 'error', 'code', 'PHIEN_HET_HAN');
  end if;

  select * into v_row from nhap_hoc_tap
  where ma = s.ma and truong = s.truong and lop = s.lop and tuan = p_tuan;

  if not found then
    return jsonb_build_object('status', 'ok', 'revision', 0, 'cac_o', '{}'::jsonb);
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'revision', v_row.revision,
    'cac_o', jsonb_build_object(
      'o_01', v_row.o_01, 'o_02', v_row.o_02, 'o_03', v_row.o_03, 'o_04', v_row.o_04,
      'o_05', v_row.o_05, 'o_06', v_row.o_06, 'o_07', v_row.o_07, 'o_08', v_row.o_08,
      'o_09', v_row.o_09, 'o_10', v_row.o_10, 'o_11', v_row.o_11, 'o_12', v_row.o_12,
      'o_13', v_row.o_13, 'o_14', v_row.o_14, 'o_15', v_row.o_15, 'o_16', v_row.o_16
    )
  );
end $$;

-- ------------------------------------------------- quyền gọi hàm
-- anon chỉ được gọi đúng những hàm này, không đọc bảng.
revoke all on function hoc_sinh_dang_nhap(text, text, text) from public;
revoke all on function nop_bai(uuid, jsonb, text[]) from public;
revoke all on function luu_nhap(uuid, int, text, int, jsonb) from public;
revoke all on function doc_nhap(uuid, int) from public;

grant execute on function hoc_sinh_dang_nhap(text, text, text) to anon, authenticated;
grant execute on function nop_bai(uuid, jsonb, text[]) to anon, authenticated;
grant execute on function luu_nhap(uuid, int, text, int, jsonb) to anon, authenticated;
grant execute on function doc_nhap(uuid, int) to anon, authenticated;
