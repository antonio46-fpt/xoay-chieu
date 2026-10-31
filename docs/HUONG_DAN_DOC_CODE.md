# Đọc mã nguồn Xoay Chiều — hướng dẫn cho người mới

Tài liệu này giả định bạn **chưa từng đọc dự án này**, biết JavaScript cơ bản là đủ.
Đọc theo thứ tự từ trên xuống, mỗi phần dựa vào phần trước.

Phiên bản tài liệu: 2.8.1 · cập nhật 31/10/2026

---

## 0. Ba khái niệm phải nắm trước

Dự án này không phải web thông thường. Nó chạy ở **hai máy khác nhau**, và hiểu được điều đó là hiểu 70% dự án.

### 0.1 Hai phía

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  TRÌNH DUYỆT HỌC SINH   │         │   GOOGLE APPS SCRIPT     │
│  (điện thoại)           │  RPC    │   (máy chủ của Google)   │
│                         │ ──────► │                          │
│  src/*.js  ──ghép──►    │         │   apps-script/*.gs       │
│  Index.html             │ ◄────── │                          │
│                         │  JSON   │          │               │
│  localStorage           │         │          ▼               │
└─────────────────────────┘         │    Google Sheets         │
                                    └──────────────────────────┘
```

**Phía trình duyệt** là toàn bộ `src/`. Không có máy chủ riêng — `build.py` ghép các tệp JS thành **một** trang HTML duy nhất. Trình duyệt chỉ tải đúng một tệp đó.

**Phía máy chủ** là thư mục `apps-script/`. Đây là JavaScript chạy trên hạ tầng Google, không phải trên máy bạn. Nó ghi dữ liệu vào Google Sheets.

### 0.2 RPC là gì

Hai phía **không chạy liên tục cùng nhau**. Trình duyệt gọi một hàm phía máy chủ, Google chạy hàm đó, trả JSON về, rồi kết thúc. Mỗi lần gọi là một "lượt thực thi" độc lập, không có biến nào được giữ lại giữa hai lượt.

Cơ chế gọi tên là `google.script.run`. Hàm nào phía máy chủ muốn trình duyệt gọi được thì **không được có dấu gạch dưới ở cuối tên**:

```js
function submitRecord(payload) { ... }   // gọi được từ trình duyệt
function submitRecord_(payload) { ... }  // KHÔNG gọi được, chỉ dùng nội bộ
```

Đây là quy ước quan trọng nhất trong `apps-script/`. Khi bạn thấy hậu tố `_`, hiểu là "hàm phụ, không phải cửa vào".

### 0.3 localStorage là gì

Là bộ nhớ riêng của trình duyệt trên từng máy. Dự án dùng nó làm **nguồn sự thật phía học sinh**: nháp, bài đã nộp, hàng đợi chờ gửi, giao diện sáng/tối.

Điểm cốt lõi của toàn bộ thiết kế: **dữ liệu được ghi vào localStorage TRƯỚC khi gửi lên máy chủ**. Nếu máy chủ hỏng, mất mạng, hay học sinh đóng tab — bài vẫn còn trên máy.

---

## 1. Bản đồ dự án

```
xoay-chieu/
├── src/                     ← MÃ NGUỒN GIAO DIỆN (nguồn sự thật)
│   ├── content.json         Toàn bộ nội dung giáo dục: 4 tuần, thư, câu hỏi, lớp
│   ├── config.js            Hằng số: phiên bản, thời gian chờ, nhịp đồng bộ
│   ├── classes.js           Mã lớp, nhãn hiển thị, khoá lưu trên máy
│   ├── safety.js            Chính sách che nội dung nhạy cảm
│   ├── core.js              Logic thuần: kiểm tra ô nhập, tạo bản ghi
│   ├── backup.js            Kiểm tra bản sao trước khi khôi phục
│   ├── learning.js          Đồng bộ nháp lên Sheet, xử lý xung đột
│   ├── app.js               Toàn bộ giao diện và điều phối
│   ├── style.css            Giao diện
│   └── shell.html           Khung HTML, có các chỗ trống để build.py nhét mã vào
│
├── apps-script/             ← MÃ NGUỒN MÁY CHỦ
│   ├── Code.gs              Cửa vào, kiểm tra dữ liệu, ghi Sheet
│   ├── Schema.gs            TỰ SINH bởi build.py — KHÔNG SỬA TAY
│   ├── Accounts.gs          Tài khoản, đăng nhập, tiến độ
│   ├── Learning.gs          Nháp theo tuần, chống ghi đè
│   ├── Management.gs        Hai bảng báo cáo tự tính, sao lưu
│   ├── Index.html           TỰ SINH — bản ghép để dán vào Apps Script
│   └── appsscript.json      Manifest: quyền, runtime
│
├── dist/                    TỰ SINH — bản xem thử tĩnh
├── docs/                    Tài liệu vận hành và góp ý
├── tests/                   17 bộ kiểm thử tự động (Node.js + jsdom)
├── build.py                 Ghép src/ thành HTML + sinh Schema.gs
└── package_source.py        Đóng gói ZIP bàn giao
```

**Nguyên tắc số một:** sửa trong `src/` và `apps-script/`, **không bao giờ** sửa `dist/` hay `apps-script/Index.html` hay `Schema.gs` — chúng bị ghi đè mỗi lần build.

---

## 2. Luồng chạy trọn vẹn

Theo dấu một học sinh từ lúc mở link đến lúc bài nằm trong Sheet:

```
1. Học sinh mở /exec
   └─ doGet()  (Code.gs)  →  trả HtmlService từ tệp Index
   └─ Trình duyệt chạy Index.html = toàn bộ src/

2. boot() chạy  (app.js)
   └─ đọc localStorage  →  dựng khung  →  render()

3. Học sinh nhập mã + trường/lớp, bấm đăng nhập
   └─ attemptLogin()  →  rpc('loginStudent')
   └─ loginStudent()  (Accounts.gs)  →  kiểm mã, lớp đang mở
   └─ trả token  →  lưu trong bộ nhớ trang (KHÔNG lưu đĩa)

4. refreshStudentProgress()  (app.js)
   └─ LearningSync.load()  →  rpc('getStudentLearning')
   └─ getStudentLearning()  (Learning.gs)  →  trả bài đã nộp + nháp
   └─ tính tuần đã nộp ngay từ danh sách bài (không cần RPC riêng)

5. Học sinh làm bài
   └─ work()  dựng từng bước  →  mỗi lần gõ: persist() ghi localStorage
   └─ mỗi 60 giây: syncMinute()  →  saveStudentDraft()  lên Sheet

6. Bấm nộp ở bước cuối
   └─ nextStep()  kiểm tra mọi ô  →  Core.record()  tạo bản ghi
   └─ đẩy vào db.queue  →  persist()  GHI ĐĨA TRƯỚC
   └─ sync()  →  rpc('submitRecord')

7. submitRecord()  (Code.gs)
   └─ valid_()  kiểm tra cấu trúc
   └─ Safety.redactRecord()  che nội dung nhạy cảm
   └─ authorizeStudent_()  kiểm token
   └─ LockService  khoá  →  tìm ID  →  chưa có thì append
   └─ trả {ok, id, duplicate}

8. Nhận ACK
   └─ xoá gói khỏi hàng đợi  →  persist()
   └─ nếu persist() lỗi: gói vẫn còn trên đĩa, lần sau gửi lại CÙNG ID
```

Bước 8 là chỗ tinh tế nhất: **ACK về mà không ghi được đĩa thì bài vẫn được gửi lại**. Vì ID không đổi, máy chủ nhận ra và trả `duplicate: true` thay vì tạo dòng thứ hai. Đây là toàn bộ cơ chế chống trùng.

---

## 3. Đọc từng tệp

### 3.1 `src/config.js` — hằng số

18 dòng, không có logic. Mọi thứ cần chỉnh mà không muốn đụng mã đều ở đây.

| Khoá | Ý nghĩa |
|---|---|
| `version` | Phiên bản app, ghi vào cột `phien_ban_app` của mỗi bài |
| `authRequired` | `false` cho bản demo, `true` cho bản Apps Script (build.py tự đổi) |
| `requireStudentPassword` | `false` = chỉ cần mã. Đổi sang `true` phải đổi cả `STUDENT_LOGIN_MODE` phía máy chủ |
| `storageKey` | Tên khoá trong localStorage. **Không đổi** — đổi là mất sạch dữ liệu học sinh |
| `rpcTimeoutMs` | Chờ máy chủ bao lâu thì coi là timeout (30 giây) |
| `syncIntervalMs` | Nhịp đồng bộ nháp (60.000 ms) |
| `retryBaseMs` / `retryMaxMs` | Giãn cách thử lại: 5 giây tăng dần đến 2 phút |

### 3.2 `src/content.json` — nội dung giáo dục

1.100 dòng JSON. **Người không biết lập trình có thể sửa tệp này** rồi chạy `build.py`.

Cấu trúc chính:

```json
{
  "truong_lop": [ { "truong": "...", "lop": ["10A3", ...] } ],
  "weeks": [
    { "tuan": 1, "duration": 15, "quy_trinh": "chu_trinh_15",
      "letter": { ... },
      "steps": [
        { "stage": "Mở thư", "minutes": 3, "title": "...", "body": "...",
          "hints": ["..."],
          "fields": [ { "key": "thu_lam", "label": "...", "kind": "text",
                        "min": 5, "max": 6000 } ] }
      ] }
  ]
}
```

Quy tắc:

- `key` **là tên cột trong Sheet**. Đổi `key` = đổi cột = hỏng dữ liệu cũ.
- `min` tính bằng **số từ**, `max` tính bằng **ký tự**.
- `kind: "rating"` tạo ba mức; `options` tạo ô chọn; còn lại là textarea.
- Thời lượng các `stage` cộng lại phải bằng `duration`; `build.py` kiểm tra và **dừng** nếu sai.

### 3.3 `src/classes.js` — ba thứ tách rời

Đây là tệp nhỏ nhưng dễ gây mất dữ liệu nhất. Nó giữ **ba bảng khác nhau**:

| Bảng | Dùng cho | Đổi được không |
|---|---|---|
| `labels` | Chữ hiện trên màn hình | Đổi tự do |
| `keyLabels` | Khoá lưu trong localStorage | **Tuyệt đối không** |
| `aliases` | Quy mã cũ về mã mới | Chỉ thêm |

Các hàm:

- **`code(value, truong)`** — chuẩn hoá một giá trị lớp về mã chuẩn. Nhận cả nhãn cũ (`"10A3 (10 Tin)"` → `"10A3"`), nhận cả bí danh (`"12A2"` + trường Chi Lăng → `"CL-12A2"`).
- **`label(value)`** — trả chữ để hiện.
- **`profile(value)`** — chuẩn hoá cả đối tượng hồ sơ `{ma, truong, lop}`.
- **`storageKey(value)`** — tạo chuỗi khoá localStorage từ `[truong, nhãn-lưu, ma]`.

Vì sao phải tách: nếu đổi `labels['LB-11A']` từ `"LB-11A (11A Lộc Bình)"` sang `"11A – Lộc Bình"` mà `storageKey` cũng đọc từ đó, thì mọi nháp đã lưu sẽ **không tìm thấy** dù dữ liệu vẫn nằm trong trình duyệt.

### 3.4 `src/safety.js` — che nội dung nhạy cảm

Hai hàm, chạy **ở cả hai phía** (tệp này được build.py nhúng vào `Schema.gs`).

- **`matches(value, config)`** — chuẩn hoá chữ (bỏ dấu, bỏ khoảng trắng, viết thường) rồi tìm từ khoá. Bỏ dấu để "tự tử" và "tu tu" đều khớp.
- **`redactRecord(record, config)`** — thay **toàn bộ** ô có từ khoá bằng `[đã ẩn – an toàn]`. Không che một phần, không che từng từ — che cả ô, để không ai đoán được nội dung từ phần còn lại.

Điểm tinh tế ở tuần 3: máy chủ ghép tiền tố `"Phe A: "` vào câu trả lời. Nếu che cả ô thì mất cấu trúc. Nên `redactRecord` dựng lại `"Phe A: [đã ẩn – an toàn]"` — giữ phần khung, bỏ phần nội dung.

### 3.5 `src/core.js` — logic thuần, không đụng DOM

Đây là tệp dễ đọc nhất và là nơi nên bắt đầu.

- **`esc(value)`** — escape HTML. Mọi chữ do học sinh viết đều phải đi qua hàm này trước khi chèn vào giao diện, nếu không sẽ bị XSS.
- **`validate(field, value)`** — kiểm tra một ô nhập. Trả **chuỗi lỗi** hoặc chuỗi rỗng. Ba nhánh: rating phải là 1–3, options phải nằm trong danh sách, textarea phải đủ số từ và không vượt số ký tự.
- **`record(draft, profile, week, appVersion)`** — **chuyển nháp thành bản ghi để gửi**. Đây là hàm trung tâm. Nó:
  - gắn `id` (giữ nguyên ID của nháp, không tạo mới);
  - chép 13 trường câu trả lời;
  - tuần 3: ghép tiền tố phe và đổi/giữ ý;
  - tuần 4: ghép hai ô `kiem_soat` + `ngoai_kiem_soat` thành cột `thu_lam`;
  - thêm `so_lan_dan`.
- **`retryDelay(attempt, random, config)`** — tính thời gian chờ lần thử sau: nhân đôi mỗi lần, chặn trên 2 phút, cộng ngẫu nhiên đến 2 giây để 30 máy không thử lại cùng một giây.

### 3.6 `src/backup.js` — kiểm tra bản sao

- **`restore(value, content)`** — nhận một tệp JSON bản sao và kiểm tra **từng lớp**. Từ chối: khoá prototype nguy hiểm (`__proto__`), mã không đúng định dạng, lớp không có trong danh sách, ID lặp trong hàng đợi, nháp sai cấu trúc.

Điểm quan trọng: các gói chờ trong bản sao được giữ nguyên ID và nội dung nhưng chuyển `paused = true`. Nghĩa là **khôi phục xong không tự gửi** — người dùng phải bấm "Thử gửi lại". Nếu tự gửi, một bản sao cũ có thể ghi đè dữ liệu mới.

### 3.7 `src/learning.js` — đồng bộ nháp lên Sheet

Đây là tệp khó nhất phía trình duyệt. Nó giải bài toán: **hai thiết bị cùng sửa một tuần**.

Trạng thái nằm trong `person().cloud`:

```js
{ versions: {1: 3},    // revision máy chủ đã xác nhận cho từng tuần
  saved: {1: "hash"},  // dấu vân tay nháp đã đồng bộ
  pending: {1: {...}}, // gói đang chờ gửi
  conflicts: {1: {...}}, // hai bản khác nhau, chờ người học chọn
  backups: [] }        // bản sao trước khi ghi đè
```

| Hàm | Làm gì |
|---|---|
| `store(p)` | Lấy (hoặc tạo) khối `cloud` của hồ sơ |
| `safe(draft)` | Che nội dung nhạy cảm trước khi gửi máy chủ |
| `fingerprint(draft)` | Băm nháp thành chuỗi để so sánh nhanh |
| `remember()` | Ghi nhận nháp đã đổi vào `pending`; khởi động đồng hồ 60 giây |
| `load()` | Tải tiến trình từ máy chủ, đối chiếu với máy, phát hiện xung đột. Trả `true/false` để bên gọi biết có cần dự phòng không |
| `syncMinute()` | Một nhịp đồng bộ: bỏ qua nếu tab ẩn hoặc hết phiên |
| `flush()` | Gửi các gói trong `pending` lên `saveStudentDraft` |
| `flushBeforeLogout()` | Chờ lần gửi đang chạy xong rồi đẩy nốt, trước khi đăng xuất |
| `conflict()` | Ghi nhận hai bản khác nhau, giữ **cả hai** |
| `resolve(week, useRemote)` | Người học chọn bản trên máy hay bản trên Sheet |
| `view()` | Vẽ dòng trạng thái đồng bộ và hộp chọn khi có xung đột |
| `reset()` / `begin()` | Dọn sạch khi đăng xuất / chuẩn bị tải lúc đăng nhập |

### 3.8 `src/app.js` — toàn bộ giao diện

Khoảng 1.180 dòng, 60 hàm. Đọc theo **nhóm chức năng**, không đọc từ trên xuống.

#### Nhóm 1 — Lưu trữ và đồng bộ

| Hàm | Làm gì |
|---|---|
| `persist()` | Ghi **toàn bộ** `db` xuống localStorage. Trả `false` nếu không ghi được. Có phát hiện tab khác vừa sửa |
| `showStorageConflict()` | Báo tab khác đã đổi dữ liệu, cho tải bản sao trước khi tải lại |
| `toast(s)` | Hiện thông báo nổi |
| `rpc(name, data)` | Gọi một hàm máy chủ qua `google.script.run`, có timeout 30 giây, chuẩn hoá mã lớp trước khi gửi |
| `status()` | Cập nhật dòng trạng thái trên thanh trên ("Đang lưu…", "Đã lưu", "Chưa lưu được – kiểm tra mạng") |
| `sync(force)` | Gửi **tuần tự** các gói trong hàng đợi. Chỉ xoá gói khi nhận ACK đúng ID. Lỗi thì giãn thời gian thử lại |
| `enqueue(record)` | Thêm gói vào hàng đợi, ghi đĩa, rồi gọi `sync()` |

#### Nhóm 2 — Khung giao diện

| Hàm | Làm gì |
|---|---|
| `logo()` | Trả SVG logo |
| `render()` | Dựng **toàn bộ** khung: thanh bên, menu, thanh trên, rồi gọi hàm trang tương ứng |
| `updateSessionControls()` | Cập nhật dòng "Mã … · Lớp …" và nút đăng xuất |
| `go(t)` | Chuyển trang: lưu nháp trước, đổi `tab`, dựng lại |
| `logout(skipCloud)` | Lưu nháp, đẩy nốt gói chờ, xoá hồ sơ đang chọn, thu hồi token. **Không xoá** bài và hàng đợi |
| `showButtonRipple(event)` | Hiệu ứng gợn khi bấm nút |
| `boot()` | Đăng ký sự kiện vòng đời: mất mạng trở lại, ẩn trang, tab khác sửa dữ liệu |

#### Nhóm 3 — Đăng nhập

| Hàm | Làm gì |
|---|---|
| `login()` | Dựng màn hình nhập mã. Chứa `attemptLogin()` bên trong — nơi kiểm định dạng mã, chặn mã ví dụ, gọi `loginStudent`, lưu hồ sơ |
| `validStudentPassword(value)` | Kiểm tra mật khẩu 8–64 ký tự hoặc PIN số 6–12 |
| `studentAuthorized(record)` | Token còn hạn và đúng bộ ba trường/lớp/mã hay không |
| `refreshStudentProgress()` | Tải tiến trình từ máy chủ. Bản mới chỉ gọi **một** RPC; bản máy chủ cũ thì gọi thêm `getStudentProgress` |
| `showStudentReauth()` | Chèn form xác thực lại **ngay trên trang** mà không dựng lại ô đang viết |
| `showCoordinatorReauth()` | Như trên, cho điều phối viên khi cache Google bị xoá |

#### Nhóm 4 — Làm bài

| Hàm | Làm gì |
|---|---|
| `home()` | Trang hành trình: 4 thẻ tuần, tiến độ, nút khám phá |
| `start(n)` | Mở tuần `n`: dùng nháp cũ nếu có, nếu không thì tạo lượt mới với ID mới |
| `current()` | Trả nháp của tuần đang mở |
| `letterHTML(w)` | Nội dung lá thư mở đầu |
| `fieldHTML(f, a)` | Dựng **một** ô nhập: rating, select hay textarea, kèm bộ đếm từ |
| `work()` | Dựng màn hình làm bài: tiến trình bước, thư, ô nhập, nút điều hướng. Gắn sự kiện `input` và `paste` |
| `safety()` | Hiện cảnh báo an toàn ngay khi học sinh gõ từ khoá |
| `collect()` | Đọc giá trị từ DOM vào nháp trong bộ nhớ |
| `flushDraft()` | `collect()` + `persist()` + báo cho `LearningSync` |
| `nextStep(w, s, d)` | Kiểm tra ô hiện tại → sang bước sau; ở bước cuối thì kiểm tra cả tuần rồi **nộp** |
| `updateClock()` | Cập nhật đồng hồ gợi ý của chặng |
| `oldProductHTML()` | Liệt kê sản phẩm tuần 1–3 để dùng làm bản gốc tuần 4 |

#### Nhóm 5 — Các trang còn lại

| Hàm | Làm gì |
|---|---|
| `weekStatus(week)` | Trạng thái một tuần: nháp / đã nộp / chưa bắt đầu |
| `workflowSteps(week, step)` | Dải chấm tròn đánh dấu bước hiện tại |
| `notebook()` | Sổ của mình: danh sách bài đã nộp, tải bản sao từng bài |
| `letters()` | Hộp thư: bốn lá thư |
| `settings()` | Cài đặt: sao lưu toàn bộ, khôi phục, đổi giao diện |
| `download(name, text)` | Tạo tệp và tải về |
| `teacher()` | Trang tiến độ lớp cho giáo viên |
| `showStudents(students)` | Vẽ bảng mã × tuần |
| `refresh()` | Gọi `getClassProgress`, nạp bảng |
| `coord()` | Bảng điều phối: đồng hồ chặng, thẻ hỏi, phiếu buổi, phiếu đổi ý |
| `bindCoordinatorDrafts()` | Gắn các form điều phối với nháp cục bộ |
| `saveCoord(form, data)` | Đóng gói phiếu điều phối vào hàng đợi |
| `paintCoord()` | Cập nhật đồng hồ đếm ngược |
| `coordLogin()` / `bindCoordinatorLogin()` | Đăng nhập PIN điều phối/giáo viên |

### 3.9 `apps-script/Code.gs` — cửa vào và ghi Sheet

| Hàm | Làm gì | Ai gọi |
|---|---|---|
| `setup_()` | Tạo 8 trang, kiểm tra cột, lưu `SPREADSHEET_ID`. Chạy **một lần** | Chủ dự án, từ editor |
| `doGet()` | Trả giao diện HTML. Đây là cửa vào của Web App | Google |
| `migrateAddTrailingColumns_()` | Thêm cột mới vào **cuối** bảng đang chạy, chỉ khi header cũ khớp đúng thứ tự | Chủ dự án |
| `headersMatch_(sheet, columns)` | So tiêu đề hiện có với tiêu đề mong đợi | `setup_` |
| `schoolOK_(data)` | Trường/lớp có nằm trong danh sách không | Nhiều hàm |
| `fail_(message, code)` | Ném lỗi có mã. Mã lỗi là thứ trình duyệt dựa vào để xử lý | Mọi nơi |
| `text_(value, name, minWords, maxLength)` | Kiểm tra một ô văn bản. **Không trim, không cắt** — chỉ kiểm tra | `validateStudent_` |
| `num_(value, min, max)` | Kiểm tra một số nằm trong khoảng | Nhiều nơi |
| `valid_(data)` | Kiểm tra tổng thể bản ghi: loại, ID, trường/lớp, tuần, kiểu từng trường, độ dài | `submitRecord` |
| `validateStudent_(data)` | Kiểm tra riêng bài học sinh theo `SCHEMA` | `valid_` |
| `validateSession_(data)` | Kiểm tra phiếu ghi buổi | `valid_` |
| `validateDebate_(data)` | Kiểm tra phiếu đổi/giữ ý | `valid_` |
| `sameCell_(stored, expected)` | So một ô Sheet với giá trị gửi lên, **giữ đúng kiểu** số/chuỗi/boolean | `submitRecord` |
| `submitRecord(payload)` | **Hàm quan trọng nhất.** Xác thực → khoá → tìm ID → ACK lại hoặc thêm dòng → cập nhật tiến độ | Trình duyệt |
| `authorizeRole_(token, data, role)` | Kiểm token giáo viên/điều phối: hết hạn, đúng trường, đúng lớp | `authorizeCoordinator_` |
| `authorizeCoordinator_(token, data)` | Như trên cho vai điều phối | `submitRecord` |
| `loginCoordinator(input)` / `loginTeacher(input)` | Đăng nhập bằng PIN | Trình duyệt |
| `getClassProgress(input)` | Trả **chỉ** `{ma, weeks}` của đúng lớp | Trình duyệt (giáo viên) |
| `logoutTeacher(token)` / `logoutCoordinator(token)` / `logoutRole_()` | Thu hồi token khỏi cache | Trình duyệt |
| `loginRole_(input, role, property)` | Dùng chung cho hai vai: đọc PIN từ Script Properties, đếm lần sai, khoá 10 phút sau 8 lần | Hai hàm trên |

### 3.10 `apps-script/Accounts.gs` — tài khoản

| Hàm | Làm gì |
|---|---|
| `setupStudentStorage_()` | Tạo ba trang `tai_khoan`, `tien_do`, `nhap_hoc_tap` |
| `accountSheetId_()` | Đọc `SPREADSHEET_ID`, báo lỗi nếu chưa setup |
| `readSystemTable_(id, name, headers)` | Đọc cả một bảng hệ thống, kiểm tra tiêu đề khớp |
| `accountKey_(account)` | Tạo khoá từ bộ ba trường + lớp + mã |
| `normalizeAccounts_(rows)` | Đọc bảng tài khoản thành đối tượng, kiểm mã/lớp/trạng thái, chặn trùng |
| `studentAccounts_(id)` | Đọc bảng tài khoản **có nhớ tạm 20 giây**. Hàm này chạy ở mọi lượt đăng nhập và nộp bài, nên nó là điểm nóng hiệu năng |
| `clearAccountCache_()` | Xoá bản nhớ tạm sau khi cấp/đặt lại mật khẩu hoặc nhập danh sách |
| `classOpen_(lop)` | Đọc `LOP_DANG_MO`. Trống = mở tất cả; có giá trị = chỉ các lớp đó mở |
| `pinDigest_(pin, account)` | Băm mật khẩu bằng HMAC-SHA256 với salt và `STUDENT_PIN_SECRET` |
| `constantTimeEqual_(a, b)` | So sánh không phụ thuộc thời gian, chống dò từng byte |
| `studentPassword_(input)` | Nhận mật khẩu mới 8–64 ký tự **hoặc** PIN số cũ 6–12 |
| `studentLoginMode_()` | `'ma'` = chỉ cần mã; `'mat_khau'` = bắt buộc mật khẩu |
| `loginStudent(input)` | Đăng nhập học sinh: kiểm mã, chặn mã ví dụ, kiểm lớp đang mở, kiểm mật khẩu (nếu bật), cấp token |
| `authorizeStudent_(token, data, id)` | Kiểm token học sinh: hết hạn, đúng bộ ba, tài khoản còn hoạt động |
| `logoutStudent(token)` | Thu hồi token |
| `projectStudentProgress_(id, account)` | Tính lại các tuần đã nộp **từ chính bảng `chu_trinh`** rồi ghi `tien_do`. Không tin dữ liệu client gửi |
| `getStudentProgress(input)` | Trả tiến độ; có khoá vì hàm này **ghi** `tien_do` |
| `newStudentPassword_()` | Sinh mật khẩu ngẫu nhiên |
| `accountRow_(account)` | Chuyển đối tượng tài khoản thành một dòng Sheet |
| `showIssuedPins_(ui, issued)` | Hiện hộp thoại chứa mật khẩu **một lần duy nhất** kèm nút tải CSV |
| `provisionStudentAccounts_()` | Cấp mật khẩu cho mọi mã chưa có. Ghi một lần bằng `batchUpdate` để không vượt quota |
| `resetSelectedStudentPin_()` | Đặt lại mật khẩu cho dòng đang chọn; huỷ mọi phiên cũ của mã đó |
| `prepareStudentImport_()` | Tạo bảng trung gian ba cột |
| `importStudentRoster_()` | Đọc bảng trung gian, thêm tài khoản mới, **giữ nguyên** mật khẩu cũ |

### 3.11 `apps-script/Learning.gs` — nháp theo tuần

| Hàm | Làm gì |
|---|---|
| `cleanStudentDraft_(draft, week)` | Kiểm tra cấu trúc nháp, **che nội dung nhạy cảm**, giới hạn kích thước. Dùng cho cả ghi lẫn đọc |
| `learningRows_(id)` | Đọc bảng `nhap_hoc_tap` |
| `ownLearningRows_(rows, account)` | Lọc **chỉ** dòng của tài khoản đang xác thực; báo lỗi nếu có hai dòng cùng tuần |
| `decodeLearningRow_(row)` | Ghép 16 ô chữ thành JSON rồi kiểm tra lại |
| `learningChunks_(value)` | Cắt JSON thành các ô ≤ 10.000 ký tự, **không cắt giữa cặp emoji** |
| `studentRecords_(id, account)` | Đọc bài đã nộp của chính học sinh, kiểm lại quyền sở hữu từng dòng |
| `getStudentLearning(input)` | Trả bài đã nộp + nháp. **Không lấy khoá** vì chỉ đọc |
| `saveStudentDraft(input)` | Ghi nháp có kiểm `expectedRevision`: trùng thì bỏ qua, lệch thì trả `STATE_CONFLICT` kèm cả hai bản |

### 3.12 `apps-script/Management.gs` — báo cáo và sao lưu

| Hàm | Làm gì |
|---|---|
| `managementModel_(accounts, drafts, records)` | **Tính toàn bộ hai bảng** từ ba mảng ô được truyền vào. Không đọc Sheet, không gọi API — nhờ vậy dùng được làm custom function |
| `XOAY_MANAGEMENT(accounts, drafts, records)` | Custom function trả bảng chi tiết 27 cột |
| `XOAY_STUDENTS(...)` | Custom function trả bảng tổng quan 13 cột |
| `setupManagement_(spreadsheet)` | Đặt công thức vào hai trang báo cáo. Từ chối ghi đè trang có nội dung riêng |
| `backupFolder_()` / `backupStamp_()` | Thư mục và tên bản sao theo ngày Việt Nam |
| `dailyBackup()` | Tạo bản sao Sheet, chia sẻ cho `BACKUP_SHARE_EMAILS`, dọn bản cũ quá hạn |
| `installDailyBackup_()` / `removeDailyBackup_()` | Đặt và gỡ lịch chạy 23:30 hằng ngày |
| `listBackups_()` | Liệt kê bản sao đã có |

### 3.13 `build.py` và `package_source.py`

**`build.py`** (120 dòng) làm bốn việc:

1. `validate_content(content)` — kiểm tra `content.json` trước khi build: đúng 4 tuần, tổng thời lượng khớp, không trùng khoá, mỗi tuần đúng một tự đánh giá, không vượt giới hạn ô 13.000 ký tự.
2. Ghép các tệp trong `src/` vào `shell.html` tại các dấu `/*CSS*/`, `/*APP*/`… ra `dist/index.html`.
3. Sinh `apps-script/Index.html` — bản giống hệt nhưng đổi `authRequired: false` thành `true`.
4. Sinh `Schema.gs` — chép `safety.js` + `classes.js` rồi thêm `SCHEMA` để máy chủ kiểm tra **bằng đúng luật của giao diện**.

**`package_source.py`** tạo trang đọc mã và ZIP bàn giao. Nếu bạn sửa `src/` mà quên chạy nó, ZIP sẽ cũ — chuyện này đã xảy ra một lần.

### 3.14 `tests/` — 17 bộ

Chạy bằng `npm test` → `tests/run.cjs` chạy lần lượt:

| Tệp | Kiểm gì |
|---|---|
| `test.cjs` | Logic thuần, mapping cột, kiểm tra đầu vào |
| `queue.cjs` | Hàng đợi: mất mạng, ACK sai, thử lại |
| `recovery.cjs` | Khôi phục bản sao, phát hiện tab khác |
| `ui.cjs` | DOM bốn tuần, bắt buộc điền, escape HTML |
| `scope.cjs` | Phân quyền ba vai, che nội dung bốn tuần |
| `accounts.cjs` | Cấp mật khẩu, HMAC, khoá/mở, chế độ chỉ-cần-mã |
| `learning-server.cjs` | Nháp: trùng, xung đột, mất mạng |
| `management.cjs` | Hai bảng báo cáo, công thức theo locale |
| `minute-sync.cjs` | Nhịp 60 giây, không ghi khi không đổi |

Các tệp `*.gs` được nạp vào một `vm` của Node với Google API giả lập. Không có test nào chạy trên Google thật.

---

## 4. Bảy quy ước không được vi phạm

1. **Không đổi `storageKey`** trong `config.js` — mất toàn bộ dữ liệu học sinh.
2. **Không đổi `key` của field** trong `content.json` — lệch cột Sheet.
3. **Không đổi thứ tự cột** trong `HEADERS` (`Code.gs`) — chỉ được thêm vào cuối.
4. **Không đổi ID khi gửi lại** — đó là toàn bộ cơ chế chống trùng.
5. **Không dùng `||=`, `&&=`, `??=`** trong tệp `.gs` — Apps Script không hỗ trợ, cả dự án không chạy được.
6. **Không thêm chữ vào máy chủ mà chưa che** — phải che ở cả hai phía.
7. **Không sửa `dist/` hay `Schema.gs`** — chúng bị ghi đè.

---

## 5. Bốn cái bẫy đã gặp thật trong dự án

**Bẫy 1 — Nhãn hiển thị và khoá lưu.** Đổi chữ "LB-11A (11A Lộc Bình)" thành "11A – Lộc Bình" tưởng vô hại, nhưng `storageKey` cũng đọc từ đó → mất nháp. Đã tách thành `labels` và `keyLabels`.

**Bẫy 2 — Khoá toàn cục.** `LockService.getScriptLock()` là khoá **duy nhất** cho cả script. Lấy nó ở hàm chỉ đọc khiến 30 học sinh vào cùng lúc phải xếp hàng. Đã bỏ ở đường đọc.

**Bẫy 3 — Đọc lại cả bảng ở mỗi lượt.** `studentAccounts_` đọc toàn bộ `tai_khoan` mỗi lần đăng nhập, nộp bài, lưu nháp. Đã thêm nhớ tạm 20 giây.

**Bẫy 4 — Thêm khoá vào nháp.** `cleanStudentDraft_` từ chối mọi khoá lạ. Thêm `pastes` mà quên khai báo → **toàn bộ đồng bộ nháp chết** dù app vẫn chạy.

---

## 6. Bài tập cho người mới, theo thứ tự

1. Đọc `src/core.js` (115 dòng). Chạy `node -e "console.log(require('./src/core.js').validate(...))"` với vài giá trị.
2. Đọc `src/safety.js` (33 dòng). Thử `matches('tôi muốn tự tử', {tu_khoa:['tự tử']})`.
3. Đổi câu hỏi tuần 2 trong `content.json`, chạy `python build.py`, mở `dist/index.html` xem thay đổi.
4. Đọc `submitRecord` trong `Code.gs` theo từng bước đã liệt kê ở mục 2.
5. Đọc `learning.js` —— sau đó thử vẽ lại sơ đồ `pending → flush → ACK` ra giấy.
6. Đọc `tests/queue.cjs` để hiểu hàng đợi được kiểm thử thế nào.
7. Sửa một lỗi chính tả trong `docs/`, chạy `npm test`, rồi commit.

Sau bước 7 bạn đã đi qua toàn bộ vòng: sửa → build → test → commit.

---

## 7. Khi bị kẹt

- `python build.py` báo lỗi `assert` → sai trong `content.json`, đọc dòng lỗi nêu tên trường.
- `npm test` đỏ → chạy riêng tệp đang lỗi: `node tests/accounts.cjs`.
- Trên Windows, test dùng Python cần đặt `PYTHONUTF8=1` trước, nếu không sẽ gặp `UnicodeDecodeError` khó hiểu.
- Máy chủ trả `SETUP_REQUIRED` → chưa chạy `setup_` hoặc sai Sheet.
- Máy chủ trả `BUSY` → hết thời gian chờ khoá; client tự thử lại.
- Trình duyệt báo "Chưa kết nối được máy chủ xác thực" → đang mở tệp HTML cục bộ, không phải link `/exec`.
