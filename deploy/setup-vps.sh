#!/usr/bin/env bash
# Cài đặt Xoay Chiều trên VPS Debian 12 (chạy một lần, chạy lại được nhiều lần).
#   bash deploy/setup-vps.sh
set -euo pipefail

APP_DIR=/var/www/xoay-chieu
DB_NAME=xoaychieu
DB_USER=xoaychieu
CRED=/root/xc-credentials.txt

echo "== 1. Cơ sở dữ liệu =="
cd /var/www
DB_PASS=$(openssl rand -hex 16)
SECRET=$(openssl rand -hex 32)

if runuser -u postgres -- psql -tAc "select 1 from pg_roles where rolname='${DB_USER}'" | grep -q 1; then
  runuser -u postgres -- psql -q -c "alter role ${DB_USER} with password '${DB_PASS}'"
  echo "   role đã có, đặt lại mật khẩu"
else
  runuser -u postgres -- psql -q -c "create role ${DB_USER} login password '${DB_PASS}'"
  echo "   đã tạo role ${DB_USER}"
fi

if runuser -u postgres -- psql -tAc "select 1 from pg_database where datname='${DB_NAME}'" | grep -q 1; then
  echo "   database đã có"
else
  runuser -u postgres -- createdb -O "${DB_USER}" "${DB_NAME}"
  echo "   đã tạo database ${DB_NAME}"
fi

echo "== 2. Lấy mã nguồn =="
mkdir -p /var/www
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone -q https://github.com/antonio46-fpt/xoay-chieu.git "${APP_DIR}"
  echo "   đã clone"
else
  cd "${APP_DIR}" && git fetch -q origin main && git reset -q --hard origin/main
  echo "   đã cập nhật"
fi
cd "${APP_DIR}"

echo "== 3. Cấu hình .env =="
SERVER_IP=$(hostname -I | awk '{print $1}')
cat > "${APP_DIR}/server/.env" <<ENVFILE
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
COOKIE_SECRET=${SECRET}
SESSION_HOURS=12
TRUST_PROXY=true
CORS_ORIGIN=http://${SERVER_IP}
ENVFILE
chmod 600 "${APP_DIR}/server/.env"
cat > "${CRED}" <<CREDFILE
# Thông tin triển khai Xoay Chiều — giữ kín, không commit.
DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
COOKIE_SECRET=${SECRET}
CREDFILE
chmod 600 "${CRED}"
echo "   đã ghi .env (xem lại ở ${CRED})"

echo "== 4. Cài phụ thuộc và build =="
cd "${APP_DIR}/server"
npm ci --omit=dev --no-audit --no-fund >/dev/null 2>&1
echo "   server deps xong"
node --env-file=.env scripts/migrate.ts

cd "${APP_DIR}/web"
npm ci --no-audit --no-fund >/dev/null 2>&1
npm run build >/dev/null 2>&1
echo "   web build xong"

echo "== 5. PM2 =="
npm i -g pm2 >/dev/null 2>&1
cd "${APP_DIR}/server"
pm2 delete xoaychieu-api >/dev/null 2>&1 || true
pm2 start npm --name xoaychieu-api -- start >/dev/null 2>&1
pm2 save >/dev/null 2>&1
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
echo "   pm2 chạy: $(pm2 pid xoaychieu-api 2>/dev/null | head -1)"

echo "== 6. Nginx =="
cat > /etc/nginx/sites-available/xoaychieu <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/xoay-chieu/web/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(jpg|png|webp|svg|woff2|js|css)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 3m;
}
NGINX
ln -sf /etc/nginx/sites-available/xoaychieu /etc/nginx/sites-enabled/xoaychieu
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1
systemctl reload nginx
echo "   nginx đã nạp cấu hình"

echo "== 7. Tường lửa =="
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
echo "   $(ufw status | head -1)"

echo "== XONG =="
echo "IP=${SERVER_IP}"
