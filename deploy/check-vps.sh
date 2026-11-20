#!/bin/bash
# Kiểm tra tài khoản trên VPS và tạo dữ liệu mẫu nếu còn trống.
cd /var/www/xoay-chieu/server || exit 1
Q() { runuser -u postgres -- psql -d xoaychieu -At -c "$1" 2>/dev/null; }

echo "=== TÀI KHOẢN ==="
Q "select username || ' | ' || role || ' | hoat_dong=' || dang_hoat_dong || ' | sai=' || so_lan_sai || ' | khoa=' || coalesce(khoa_den::text, 'khong') from users order by role, username;"

echo "=== SỐ LIỆU ==="
echo "students=$(Q 'select count(*) from students;')"
echo "submissions=$(Q 'select count(*) from submissions;')"

echo "=== MỞ KHOÁ TÀI KHOẢN (nếu bị khoá do gõ sai nhiều lần) ==="
Q "update users set so_lan_sai = 0, khoa_den = null where khoa_den is not null;"

if [ "$(Q 'select count(*) from students;')" = "0" ]; then
  echo "=== CHƯA CÓ HỌC SINH — tạo dữ liệu mẫu ==="
  node --env-file=.env scripts/seed-demo.ts 2>&1 | tail -6
else
  echo "=== ĐÃ CÓ HỌC SINH — bỏ qua tạo mẫu ==="
fi

echo "=== DANH SÁCH SAU KHI XONG ==="
Q "select username || ' | ' || role from users order by role, username;"
