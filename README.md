# Xoay Chiều 3.0.0

**Hệ thống tổ chức hoạt động học tập 4 tuần và thu dữ liệu nghiên cứu — cho học sinh THPT Lạng Sơn**

Xoay Chiều là ứng dụng web chạy thật: frontend React, backend Fastify, cơ sở dữ liệu PostgreSQL, xác thực bằng tài khoản và mật khẩu. Học sinh làm bốn tuần hoạt động ngắn (15 – 15 – 45 – 45 phút), hệ thống giữ bài viết, che nội dung nhạy cảm ở backend, và chuyển dữ liệu về một nơi duy nhất cho nhóm nghiên cứu phân tích.

> **Không chấm điểm, không xếp hạng, không dùng AI đánh giá bài.** Hệ thống chỉ tổ chức hoạt động và lưu lại những gì học sinh viết.

> **Ghi chú kiến trúc:** bản 2.8.x chạy trên Google Apps Script + Google Sheets và vẫn còn trong kho mã (`apps-script/`, `src/`) làm đường lùi. Bản 3.0.0 thay hoàn toàn phần máy chủ và cơ sở dữ liệu.

---

## Ảnh minh chứng

![Dashboard học sinh](docs/preview/web-dashboard-sneat.png)

*Dashboard: sidebar thu gọn được, bốn thẻ KPI, danh sách bốn tuần với trạng thái thật từ máy chủ.*

![Màn hình làm bài](docs/preview/web-week.png)

*Màn hình làm bài: 9 bước của tuần 1 — lá thư, ô trả lời có đếm từ, tự lưu nháp sau 1,2 giây.*

![Trang đăng nhập](docs/preview/web-login.png)

*Đăng nhập: hai cột, chong chóng quay, nền vũ trụ.*

---

## Công nghệ sử dụng

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện | React 18, TypeScript, Vite 6, Tailwind CSS 3 | Build ra tệp tĩnh, Nginx phục vụ |
| Font | Plus Jakarta Sans (tiêu đề), Be Vietnam Pro (nội dung) | Google Fonts, `display=swap` |
| Máy chủ | Node.js 22+, Fastify 5, TypeScript chạy trực tiếp | Không bước build backend |
| Cơ sở dữ liệu | PostgreSQL 16 | 15 bảng, có trigger và ràng buộc |
| Xác thực | Cookie `httpOnly` + Argon2id | CSDL chỉ lưu băm SHA-256 của token |
| Truy vấn | `pg` với tham số hoá | Không nối chuỗi SQL |
| Kiểm thử | `node:test` | 59 test: 27 đơn vị + 32 tích hợp |
| Công cụ | Git, GitHub, Python (build, xử lý ảnh) | |

**Vì sao không dùng framework nặng hơn:** quy mô 226 học sinh, ba trường, máy chủ 2 CPU / 4 GB. Fastify + Postgres chạy trong khoảng 500 MB RAM, đủ thoải mái. Không có ORM để tránh lớp trừu tượng che mất câu SQL thật.

---

## Kiến trúc

```
Trình duyệt (React SPA)
      │  fetch kèm cookie phiên
      ▼
Fastify API  ────────────────────────────────
  auth/       đăng nhập, phiên, đổi mật khẩu
  routes/     student, admin, staff, import/export
  security/   argon2, token, che nội dung
  policy.ts   sáu vai, bảng quyền
      │  pg (tham số hoá)
      ▼
PostgreSQL 16 ── 15 bảng, trigger chặn sửa bài nộp
```

**Bốn quyết định bảo mật quan trọng:**

1. **Bài nộp bất biến ở tầng CSDL** — trigger chặn mọi `UPDATE` trên bảng `submissions`. Không phải quy ước, mà là ràng buộc.
2. **Che nội dung chạy ở backend** — học sinh sửa mã JavaScript cũng không bỏ qua được.
3. **Giáo viên không đọc được bài** — câu SQL tiến trình cố ý **không join** bảng bài nộp.
4. **Token chỉ lưu dạng băm** — lộ bảng `sessions` cũng không dựng lại được phiên.

---

## Cài đặt và chạy

### Yêu cầu

- Node.js ≥ 22.6
- PostgreSQL ≥ 14

### Các bước

```bash
git clone https://github.com/antonio46-fpt/xoay-chieu.git
cd xoay-chieu/server
npm install
cp .env.example .env
```

Sửa `.env`:

```env
DATABASE_URL=postgres://user:matkhau@127.0.0.1:5432/xoaychieu
COOKIE_SECRET=<chuỗi ngẫu nhiên ≥ 32 ký tự>
PORT=3000
```

Tạo bảng và chạy máy chủ:

```bash
npm run db:migrate     # áp dụng db/migrations/*.sql
npm start              # API tại http://127.0.0.1:3000
```

Chạy giao diện (cửa sổ khác):

```bash
cd ../web
npm install
npm run dev            # http://localhost:5173
```

### Tạo tài khoản quản trị đầu tiên

Không có tài khoản mặc định trong mã nguồn:

```bash
cd server
ADMIN_USERNAME=quantri ADMIN_PASSWORD='MatKhauManh123' node --env-file=.env scripts/create-admin.ts
```

### Tạo dữ liệu mẫu để xem giao diện

```bash
node --env-file=.env scripts/seed-demo.ts
# hs01 / hs02 / hs03 / hs10 — mật khẩu Demo12345
```

---

## Kiểm thử

```bash
cd server
npx tsc --noEmit      # kiểm tra kiểu
npm test              # 27 test đơn vị, chạy không cần CSDL

TEST_DATABASE_URL=postgres://... npm test   # thêm 32 test tích hợp
```

Test tích hợp chứng minh những điều chỉ là lời hứa ở bản cũ:

| Điều được chứng minh | Cách kiểm |
|---|---|
| Gửi lại cùng `id` không tạo bài trùng | Đếm số dòng sau hai lần gửi |
| Trigger chặn sửa bài nộp | `UPDATE` phải ném lỗi |
| Che nội dung chạy ở backend | Từ khoá bị thay trong CSDL, không chỉ ở giao diện |
| Học sinh không vào được API admin | Gọi trực tiếp phải nhận `403` |
| Giáo viên không đọc được nội dung bài | Kiểm chuỗi nội dung không xuất hiện trong phản hồi |
| Lệch `revision` thì báo xung đột | Gửi sai số phiên bản phải nhận `409` |

---

## Cấu trúc kho mã

```
server/            API Fastify (đang dùng)
  src/routes/      student, admin, staff, importExport
  src/auth/        đăng nhập, phiên
  src/security/    argon2, token, che nội dung
  scripts/         migrate, create-admin, seed-demo
  test/            27 đơn vị + 32 tích hợp
web/               React + Vite + Tailwind (đang dùng)
  src/components/  AppShell, UserMenu, StarFall
  src/pages/       Login, Dashboard, Week, Review, ChangePassword
  src/content/     nội dung 4 tuần (chép nguyên từ bản 2.x)
db/migrations/     SQL có phiên bản
supabase/          lược đồ tham chiếu (chưa dùng)
src/, apps-script/ bản 2.8.1 — đường lùi, không còn là backend chính
tests/             17 bộ kiểm thử của bản 2.x
docs/              tài liệu, ảnh minh chứng
```

---

## Các bảng dữ liệu

| Bảng | Nội dung |
|---|---|
| `students` | Hồ sơ học sinh: mã, trường, lớp — **không có họ tên** |
| `users` | Tài khoản, mật khẩu băm, vai, liên kết hồ sơ |
| `sessions` | Phiên đăng nhập, chỉ lưu băm token |
| `submissions` | Bài nộp 4 tuần, bất biến sau khi ghi |
| `drafts` | Bản nháp đồng bộ, có `revision` chống ghi đè |
| `progress` | Tuần đã nộp, chỉ sinh từ dữ liệu backend xác nhận |
| `schools`, `classes` | Trường và lớp |
| `staff_assignments` | Giáo viên / điều phối viên phụ trách lớp nào |
| `phieu_buoi`, `doi_y` | Phiếu ghi buổi học và phiếu đổi ý |
| `audit_log` | Nhật ký thao tác quản trị |
| `roles`, `permissions`, `role_permissions` | Phân quyền |
| `settings` | Cấu hình hệ thống |

---

## API chính

**Xác thực**

```
POST /api/auth/login              đăng nhập
POST /api/auth/logout             đăng xuất, thu hồi phiên
GET  /api/auth/me                 phiên hiện tại
POST /api/auth/change-password    đổi mật khẩu
```

**Học sinh**

```
GET  /api/me/overview             tiến độ bốn tuần
POST /api/me/submissions          nộp bài (chống trùng theo id)
GET  /api/me/submissions          bài của chính mình
GET  /api/me/submissions/:id      chi tiết một bài
GET  /api/me/drafts/:tuan         đọc bản nháp
PUT  /api/me/drafts/:tuan         lưu bản nháp (CAS theo revision)
```

**Giáo viên và điều phối**

```
GET  /api/staff/classes                      lớp được phân công
GET  /api/staff/classes/:id/progress         mã + tuần đã nộp (KHÔNG có nội dung)
POST /api/staff/session-notes                phiếu buổi học
POST /api/staff/decisions                    phiếu đổi ý
```

**Quản trị**

```
GET  /api/admin/overview                     thống kê tổng quan
GET  /api/admin/students                     danh sách, lọc, phân trang
POST /api/admin/students                     tạo tài khoản
POST /api/admin/students/:id/reset-password  đặt lại mật khẩu
POST /api/admin/students/:id/status          khoá / mở khoá
POST /api/admin/import/preview               xem trước CSV, báo lỗi từng dòng
POST /api/admin/import/commit                ghi danh sách, trả mật khẩu một lần
GET  /api/admin/export/students              xuất CSV (có BOM cho Excel)
GET  /api/admin/export/submissions           xuất bài nộp theo tuần / lớp
GET  /api/admin/assignments                  phân công nhân sự
```

---

## Triển khai

```bash
# Build giao diện
cd web && npm run build          # ra web/dist

# Chạy API nền
cd ../server
pm2 start npm --name xoaychieu-api -- start
```

Nginx làm reverse proxy: phục vụ `web/dist` ở `/`, chuyển `/api` sang cổng 3000. HTTPS bằng Let's Encrypt.

Sao lưu hằng ngày:

```bash
pg_dump "$DATABASE_URL" | gzip > /backup/xoaychieu-$(date +%F).sql.gz
```

Xem `docs/DEPLOYMENT_CHECKLIST.md` để có danh sách đầy đủ.

---

## Trạng thái dự án

| Hạng mục | Trạng thái |
|---|---|
| Backend: đăng nhập, nộp bài, nháp, CSV, giáo viên, điều phối, đổi mật khẩu | ✅ 59 test đạt |
| Giao diện học sinh: đăng nhập, dashboard, làm bài, xem lại, đổi mật khẩu | ✅ chạy được |
| Chế độ tối | ✅ |
| Trang giáo viên | ⬜ API xong, chưa có giao diện |
| Trang admin | ⬜ API phần lớn xong, chưa có giao diện |
| Triển khai VPS | ⬜ chưa |
| Chuyển dữ liệu từ Google Sheets | ⬜ chưa |

---

## Tài liệu

| Tệp | Nội dung |
|---|---|
| [SCOPE.md](SCOPE.md) | Phạm vi, quyền dữ liệu, điểm chờ chốt |
| [docs/HUONG_DAN_DOC_CODE_CHI_TIET.md](docs/HUONG_DAN_DOC_CODE_CHI_TIET.md) | Hướng dẫn đọc mã nguồn từ A đến Z |
| [docs/Xoay_Chieu_Cong_nghe_Chi_tiet.docx](docs/Xoay_Chieu_Cong_nghe_Chi_tiet.docx) | Tài liệu công nghệ cho hội đồng |
| [docs/Lo_trinh_day_doc_code_3_tuan.docx](docs/Lo_trinh_day_doc_code_3_tuan.docx) | Giáo án 15 buổi dạy người mới |
| [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) | Danh sách kiểm triển khai |
| [docs/GOP_Y_31-10.md](docs/GOP_Y_31-10.md) | Đối chiếu 19 góp ý của nhóm |

---

## Giấy phép và dữ liệu

Mã nguồn công khai để nhóm nghiên cứu và đơn vị tiếp nhận tham chiếu. **Dữ liệu học sinh không nằm trong kho mã** — bảng đối chiếu mã với họ tên do nhóm giữ riêng, ngoài hệ thống.
