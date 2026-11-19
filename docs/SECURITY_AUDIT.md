# Báo cáo kiểm tra bảo mật — Xoay Chiều 3.0.0

Ngày thực hiện: 19/11/2026
Phạm vi: `server/` (Fastify + PostgreSQL), `web/` (React), cấu hình CI/CD, kho mã Git.

---

## 1. Phương pháp

1. **Rà soát mã nguồn thủ công** toàn bộ `server/src` (routes, auth, security, policy) và `web/src`.
2. **Quét mẫu truy vấn**: tìm mọi chỗ nội suy chuỗi vào SQL.
3. **Quét XSS**: tìm `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`.
4. **Kiểm tra lịch sử Git**: có từng commit `.env` hoặc khoá bí mật nào chưa.
5. **Kiểm tra phụ thuộc**: `npm audit --omit=dev --audit-level=high`.
6. **Viết test tấn công thật** chạy trên PostgreSQL: SQL injection, IDOR, leo thang quyền, header.

---

## 2. Kết quả tổng quan

| Hạng mục | Trước kiểm tra | Sau khi vá |
|---|---|---|
| SQL injection (nối chuỗi) | 0 chỗ phát hiện | 0 |
| Truy vấn tham số hoá | 100% | 100% |
| Lỗ hổng phụ thuộc mức high | **1 (zod 3.x)** | **0** |
| CSP / chống clickjacking | CSP **tắt** | Bật, chặn toàn bộ |
| Rate limit đổi mật khẩu | **không có** | 5 lần / 15 phút |
| Test bảo mật tự động | 0 | **4 nhóm, 5 test** |
| CI/CD | **không có** | 3 job, chặn merge khi fail |
| Bí mật trong Git | không phát hiện | có Gitleaks chặn về sau |

---

## 3. Lỗ hổng đã khắc phục

### 3.1. CSP bị tắt, thiếu HSTS — 🔴 Cao

**Trước:** `helmet({ contentSecurityPolicy: false })`. Không có CSP, không có HSTS, `X-Frame-Options` để mặc định `SAMEORIGIN`.

**Hậu quả:** nếu có bất kỳ điểm XSS nào, không có lớp thứ hai chặn thực thi mã; trang có thể bị nhúng iframe để lừa bấm.

**Đã vá** — `server/src/app.ts`:

```ts
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'none'"], frameAncestors: ["'none'"],
    baseUri: ["'none'"], formAction: ["'none'"]
  }
},
frameguard: { action: 'deny' },
hsts: config.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
referrerPolicy: { policy: 'no-referrer' }
```

API chỉ trả JSON nên CSP chặt nhất (`default-src 'none'`) là đúng. Giao diện tĩnh cần CSP riêng ở Nginx — xem mục 6.

### 3.2. Không giới hạn tần suất đổi mật khẩu — 🟠 Trung bình

**Trước:** chỉ `/login` có rate limit. Kẻ tấn công đã có phiên (ví dụ máy dùng chung) có thể dò `currentPassword` không giới hạn.

**Đã vá** — `server/src/auth/routes.ts`:

```ts
app.post('/change-password',
  { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
  ...
```

### 3.3. Zod 3.x có lỗ hổng cạn bộ nhớ — 🔴 Cao (phụ thuộc)

**Khuyến cáo:** GHSA-mrhx-c7xc-m3w5 — Zod < 4.6.6 có thể cạn bộ nhớ khi validate collection lớn có ràng buộc.

**Đã vá:** nâng `zod` 3.24 → **4.6.7**. Toàn bộ 64 test vẫn đạt. `npm audit` sạch.

### 3.4. Thiếu quét bí mật và CI — 🟠 Trung bình

**Đã thêm:** `.github/workflows/ci-cd.yml`, `.gitleaks.toml`, `db/roles.sql`.

---

## 4. Những điểm đã đúng ngay từ đầu (kiểm chứng, không phải giả định)

| Kiểm soát | Bằng chứng |
|---|---|
| **Không nối chuỗi SQL** | Quét `\$\{(q\|username\|ma\|id\|tuan)\}` trong `server/src` → 0 kết quả. Mọi truy vấn dùng `$1, $2…` |
| **Bộ lọc admin an toàn** | `where` được dựng từ mảng điều kiện cố định; giá trị người dùng chỉ đi qua `thamSo.push()`, không vào chuỗi SQL |
| **Kiểm tra đầu vào** | `validation.ts`: username `^[a-z0-9][a-z0-9._-]{2,63}$`, mã HS `^[A-Za-z0-9][A-Za-z0-9-]*$`, mật khẩu 8–128, `tuan` 1–4, `pageSize` ≤ 100, UUID cho id |
| **Mật khẩu** | Argon2id (`@node-rs/argon2`), không log, không trả về API. Đặt lại mật khẩu cũng băm lại |
| **Token phiên** | 32 byte ngẫu nhiên; CSDL **chỉ lưu SHA-256**, lộ bảng `sessions` không dựng lại được phiên |
| **Cookie** | `httpOnly`, `sameSite=lax`, `secure` khi production, `maxAge` 12 giờ |
| **Thu hồi phiên** | Đổi mật khẩu và khoá tài khoản đều `update sessions set thu_hoi_luc = now()` |
| **IDOR** | Route học sinh lấy `student_id` **từ phiên**, không nhận từ body/query |
| **Phân quyền** | `policy.ts` + kiểm tra ở server trên **mọi** route admin; test chứng minh học sinh nhận `403` |
| **Che nội dung nhạy cảm** | Chạy ở backend (`security/redact.ts`), không phải ở giao diện |
| **Bài nộp bất biến** | Trigger CSDL `submissions_bat_bien` chặn `UPDATE` |
| **XSS** | React escape mặc định; quét `dangerouslySetInnerHTML`/`innerHTML` → 0 chỗ dùng |
| **Lỗi 500** | `setErrorHandler` ẩn chi tiết khi production, chỉ trả `LOI_MAY_CHU` |
| **Log** | `redact: ['req.headers.cookie', 'req.headers.authorization', 'body.password']` |
| **Bí mật** | `.env` chưa từng vào Git (`git log -- server/.env` rỗng); `.gitignore` chặn `.env`, `.env.*`, `docs/hvt.docx` |

---

## 5. Bộ test bảo mật mới

Chạy thật trên PostgreSQL, không mock. Nằm trong `server/test/integration/api.test.ts`.

| Test | Chứng minh |
|---|---|
| `SQL injection vào đăng nhập và ô tìm kiếm admin bị vô hiệu` | 4 payload kinh điển (`' OR '1'='1`, `admin'--`, `admin' OR 1=1 --`, `'; drop table users; --`) đều bị chặn; tìm kiếm trả `total = 0`; bảng còn nguyên |
| `IDOR — học sinh không đọc được bài của người khác` | Học sinh A gọi bài của B → không phải `200`; chủ bài đọc được; tham số `?studentId=` không có tác dụng |
| `học sinh bị chặn 403 ở mọi API quản trị` | 6 endpoint admin đều `403`; không phiên → `401`; phản hồi không chứa `password_hash` |
| `header phòng thủ được bật` | `Content-Security-Policy` có `default-src 'none'` và `frame-ancestors 'none'`; `X-Frame-Options: DENY`; `nosniff`; `referrer-policy: no-referrer`; không có `x-powered-by` |

Kết quả lần chạy cuối: **64/64 test đạt**.

---

## 6. CI/CD

`.github/workflows/ci-cd.yml` — chạy mỗi `push` và `pull_request` vào `main`.

**Job 1 — Kiểm tra chất lượng & bảo mật tĩnh**
- `tsc --noEmit` cho server và web (kiểm tra kiểu chặt)
- `npm audit --omit=dev --audit-level=high` cho cả hai gói
- SAST nhanh của dự án: chặn `dangerouslySetInnerHTML`, `eval(`, `new Function(`
- **Gitleaks** — quét bí mật, cấu hình ở `.gitleaks.toml`
- **Semgrep** với `p/owasp-top-ten`, `p/sql-injection`, `p/xss`, chỉ fail ở mức ERROR

**Job 2 — Kiểm thử tự động**
- PostgreSQL 16 service, migration thật, rồi `npm test`
- Bao gồm cả 5 test bảo mật ở mục 5

**Job 3 — Build**
- Chỉ chạy khi Job 1 và 2 xanh
- `vite build`, lưu `web/dist` làm artifact 14 ngày

> **Vì sao không dùng ESLint:** dự án chưa từng có cấu hình ESLint; bật `recommended` ngay sẽ báo hàng nghìn lỗi định dạng có sẵn và chặn CI vì lý do thẩm mỹ, không phải bảo mật. Thay vào đó CI dùng kiểm tra kiểu (`tsc`) + Semgrep (quy tắc bảo mật) + grep mẫu nguy hiểm. Khi muốn thêm ESLint, nên làm thành một lần riêng, chấp nhận sửa toàn bộ mã nguồn.

---

## 7. Cấu hình biến môi trường

Xem `server/.env.example`. Bốn biến bắt buộc phải đổi khi lên production:

| Biến | Production | Ghi chú |
|---|---|---|
| `NODE_ENV` | `production` | Bật cookie `Secure`, HSTS, ẩn lỗi 500 |
| `COOKIE_SECRET` | ≥ 32 ký tự ngẫu nhiên | Đổi sẽ đăng xuất toàn bộ người dùng |
| `DATABASE_URL` | tài khoản **không phải superuser** | Xem `db/roles.sql` |
| `TRUST_PROXY` | `true` khi sau Nginx/Cloudflare | Sai giá trị này làm rate limit tính chung một IP cho mọi người |
| `CORS_ORIGIN` | tên miền thật, không dùng `*` | Cookie phiên được gửi kèm |

---

## 8. Rủi ro còn lại (chấp nhận có ý thức)

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| `SameSite=lax` thay vì `strict` | Thấp | `strict` làm hỏng luồng mở link từ email/chat; `lax` vẫn chặn CSRF cho `POST`. Đã có kiểm tra Origin qua CORS |
| Mật khẩu demo `Demo12345` cho 54 tài khoản | **Cao nếu dùng thật** | Chỉ dùng cho dữ liệu mẫu. Trước khi dùng thật phải đặt lại toàn bộ |
| Cloudflare quick tunnel không có SLA, ai có link đều vào được | **Cao nếu demo công khai** | Chỉ dùng để trình diễn ngắn; production phải có tên miền riêng |
| Chưa có WAF / chống DDoS | Thấp | Nên đặt sau Cloudflare Proxy hoặc Nginx `limit_req` |
| Chưa có 2FA cho quản trị | Thấp | Nên thêm khi có nhiều quản trị viên |
| Giao diện tĩnh chưa có CSP riêng | Trung bình | Thêm ở Nginx, xem bên dưới |

### CSP nên thêm ở Nginx cho giao diện

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
```

`'unsafe-inline'` cho `style-src` là cần thiết vì Tailwind và inline style của React; có thể bỏ nếu chuyển sang nonce.

---

## 9. Việc cần làm trước khi vận hành thật

1. Chạy `db/roles.sql` và trỏ `DATABASE_URL` sang `xoaychieu_app`.
2. Đặt `NODE_ENV=production`, `TRUST_PROXY=true`, `COOKIE_SECRET` mới.
3. Đăng xuất và **đặt lại mật khẩu toàn bộ tài khoản demo**.
4. Thêm CSP ở Nginx (mục 8).
5. Bật nhánh `main` protected: bắt buộc CI xanh mới merge.
6. Bật sao lưu `pg_dump` hằng ngày và **đã thử khôi phục một lần**.
