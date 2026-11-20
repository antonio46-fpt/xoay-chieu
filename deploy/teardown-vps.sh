#!/usr/bin/env bash
# Tắt bản triển khai trên VPS này (không xoá dữ liệu).
#   bash deploy/teardown-vps.sh
#
# Dùng khi chuyển sang hạ tầng khác. Giữ lại mã nguồn, database và .env để có
# thể bật lại bằng deploy/setup-vps.sh bất cứ lúc nào.
set -uo pipefail

echo "== 1. Dừng API =="
pm2 delete xoaychieu-api >/dev/null 2>&1 && echo "   đã dừng xoaychieu-api" || echo "   không có tiến trình nào"
pm2 save --force >/dev/null 2>&1
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "== 2. Gỡ cấu hình nginx =="
rm -f /etc/nginx/sites-enabled/xoaychieu
nginx -t >/dev/null 2>&1 && systemctl reload nginx
echo "   nginx đã gỡ site xoaychieu"

echo "== 3. Giữ nguyên dữ liệu =="
echo "   database xoaychieu: $(runuser -u postgres -- psql -tAc "select count(*) from students" -d xoaychieu 2>/dev/null || echo '?') học sinh"
echo "   mã nguồn: /var/www/xoay-chieu"
echo "   bí mật  : /root/xc-credentials.txt"

echo "== 4. Cổng còn nghe =="
ss -ltnp 2>/dev/null | grep -E ':80 |:443 |:3000 ' || echo "   không còn cổng nào của ứng dụng"

echo "== XONG =="
echo "Muốn xoá sạch hoàn toàn (KHÔNG hoàn tác được):"
echo "  pm2 delete all; rm -rf /var/www/xoay-chieu /root/xc-credentials.txt"
echo "  runuser -u postgres -- dropdb xoaychieu; runuser -u postgres -- dropuser xoaychieu"
