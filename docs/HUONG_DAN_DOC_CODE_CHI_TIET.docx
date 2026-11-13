# Xoay Chiều — giải thích toàn bộ mã nguồn (bản chi tiết)

Bản này đi sâu hơn `HUONG_DAN_DOC_CODE.md`: không chỉ nói hàm làm gì, mà chỉ **mã biến thành trang web như thế nào**, dữ liệu có hình dạng ra sao, và từng bước thực thi bên trong các hàm khó.

Đọc xong tài liệu này, bạn hiểu được toàn bộ dự án từ dòng CSS đầu tiên đến dòng cuối cùng trong Google Sheet.

---

# Phần A — Từ mã nguồn đến trang web

## A1. `shell.html` — 27 dòng quyết định mọi thứ

Đây là tệp HTML duy nhất của dự án, và nó **cố tình để trống** ở những chỗ quan trọng:

```html
<head>
  <style>/*CSS*/</style>
</head>
<body>
  <div class="stripe" aria-hidden="true"></div>
  <div id="app"></div>
  <noscript>Hãy bật JavaScript…</noscript>
  <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
  <dialog id="letterDialog" aria-label="Lá thư mở đầu"></dialog>
  <script>/*CONFIG*/</script>
  <script>/*DATA*/</script>
  <script>/*SAFETY*/</script>
  <script>/*CLASSES*/
/*CORE*/</script>
  <script>/*BACKUP*/</script>
  <script>/*LEARNING*/
/*APP*/</script>
</body>
```

Ba điều cần hiểu:

**Một: `<div id="app"></div>` là rỗng.** Toàn bộ giao diện do `render()` dựng bằng chuỗi HTML gán vào `innerHTML`. Không có React, không có template engine — chỉ là nối chuỗi. Đây là lý do bạn thấy rất nhiều dấu backtick trong `app.js`.

**Hai: thứ tự các `<script>` là thứ tự phụ thuộc.** `CORE` cần `CLASSES` và `SAFETY` đã tồn tại. `APP` cần `CORE`, `BACKUP`, `LEARNING` đã tồn tại. Nếu đảo thứ tự, trang trắng ngay.

**Ba: ba phần tử nằm ngoài `#app`** — `#toast`, `#letterDialog`, `#stripe`. Vì `render()` xoá sạch `#app`, nếu chúng nằm trong đó sẽ bị xoá mỗi lần chuyển trang.

## A2. `build.py` — bốn việc

```python
sections = {"CSS": style.css, "CONFIG": config.js, "DATA": content_json,
            "SAFETY": safety.js, "CLASSES": classes.js, "CORE": core.js,
            "BACKUP": backup.js, "LEARNING": learning.js, "APP": app.js}

html = read(shell.html)
for name, source in sections.items():
    marker = "/*" + name + "*/"
    assert html.count(marker) == 1        # mỗi dấu phải xuất hiện đúng một lần
    html = html.replace(marker, source)
```

Bốn việc theo thứ tự:

1. **Kiểm nội dung** (`validate_content`): đúng 4 tuần, thời lượng các chặng cộng đúng bằng `duration`, không trùng `key`, mỗi tuần có đúng một `tu_danh_gia`, mọi `max` ≤ 13.000 ký tự. Sai một điều là **dừng build** — cố ý, để không sinh ra bản lỗi.
2. **Ghép** như đoạn trên.
3. **Sinh hai bản HTML** — giống hệt nhau trừ một chữ:
   ```python
   (DIST / "index.html").write_text(html)
   (SERVER / "Index.html").write_text(html.replace("authRequired: false", "authRequired: true"))
   ```
   `dist/` là bản **demo** (mở trực tiếp bằng trình duyệt được, không gửi Sheet). `apps-script/` là bản **thật** (bắt buộc đăng nhập, chỉ chạy khi được Google phục vụ).
4. **Sinh `Schema.gs`** — chép nguyên `safety.js` và `classes.js`, rồi thêm một hằng `SCHEMA` chứa danh sách lớp, quy tắc an toàn, và **toàn bộ định nghĩa ô nhập của 4 tuần**. Nhờ vậy máy chủ kiểm tra bằng đúng luật mà giao diện đang dùng — không có chuyện client cho qua mà server từ chối.

> Vì `Schema.gs` được sinh từ `content.json` **và** `safety.js`, sửa hai tệp đó mà quên build là máy chủ vẫn dùng luật cũ.

## A3. Vì sao phải ghép thành một tệp

Apps Script chỉ phục vụ được **một** tệp HTML qua `HtmlService`. Không có cách nào phục vụ `app.js` riêng, `style.css` riêng. Nên toàn bộ phải nằm trong một trang.

Hệ quả cần nhớ:

- Mọi tệp trong `src/` là **script cổ điển**, không phải module. Không có `import`/`export`. Biến khai báo ở tệp này nhìn thấy được ở tệp khác trong cùng phạm vi.
- Các tệp vẫn chạy được trong Node nhờ `if (typeof module !== 'undefined') module.exports = ...` ở cuối. Đó là cách `tests/` dùng lại `core.js`, `safety.js`, `classes.js`.

## A4. `style.css` — token và đổi giao diện

Toàn bộ màu sắc là biến CSS khai báo ở `:root`. Đổi giao diện chỉ là **thay giá trị biến**, không đổi quy tắc:

```css
:root        { --bg:#ece3d3; --paper:#fffdf7; --ink:#1d2745; --gold:#c08b2a; ... }
body.dark    { --bg:#141b2b; --paper:#1f2940; --ink:#f2efe6; --gold:#eec579; ... }
```

Nút đổi giao diện chỉ làm một việc: bật/tắt class `dark` trên `<body>` rồi lưu vào `db.theme`.

Ba điểm cần biết khi sửa CSS:

- **Thứ tự khai báo quyết định.** Cùng độ ưu tiên thì khối sau thắng. Dự án có `.card,.panel` khai báo hai lần (dòng ~417 và ~1140) — bản sau thắng.
- **Không dùng màu cứng trong khối component**, luôn dùng biến, nếu không chế độ tối sẽ hỏng.
- **Tôn trọng `prefers-reduced-motion`**: mọi chuyển động nằm trong khối điều kiện.

---

# Phần B — Dữ liệu trên máy

## B1. Hình dạng của `localStorage`

Toàn bộ dữ liệu phía học sinh nằm trong **một** khoá duy nhất, tên do `APP_CONFIG.storageKey` quyết định (`xoaychieu_v2`).

```json
{
  "profiles": {
    "[\"THPT Chuyên Chu Văn An\",\"10A3 (10 Tin)\",\"CH12-T\"]": {
      "drafts": {
        "1": {
          "id": "xc-m3k9-8f2a1c",
          "version": "2.2.3",
          "step": 3,
          "answers": { "thu_lam": "…", "nghi_1": "…" },
          "started": "2026-10-31T08:12:00.000Z",
          "activeMs": 184000,
          "stageTimes": { "Mở thư": 61000, "Thử": 123000 },
          "hints": { "3": 1 },
          "pastes": 2
        }
      },
      "history": [
        { "record": { "id": "…", "tuan": 1, "…": "…" }, "sent": true }
      ],
      "cloud": {
        "versions": { "1": 3 },
        "saved":    { "1": "hash-vân-tay" },
        "pending":  { "1": { "week":1, "mutationId":"…", "expectedRevision":2,
                             "draft": {…}, "attempted": true } },
        "conflicts":{},
        "backups":  []
      }
    }
  },
  "queue": [ { "record": {…}, "attempts": 2, "nextTryAt": 0, "paused": false } ],
  "theme": "light",
  "current": { "ma": "CH12-T", "truong": "…", "lop": "10A3" }
}
```

**Khoá của `profiles`** là `JSON.stringify([trường, nhãn-lưu-lớp, mã])`. Ba thành phần đó tạo ra phạm vi riêng: cùng một mã ở hai lớp là **hai hồ sơ khác nhau**, không trộn nháp.

**`drafts` khoá theo số tuần** (`"1"`…`"4"`), không theo ngày — một học sinh chỉ có tối đa một nháp mỗi tuần.

**`history`** là mảng bài đã tạo bản ghi, kể cả bài chưa gửi được. `sent: true` nghĩa là máy chủ đã xác nhận.

## B2. `persist()` — hàm ghi duy nhất

Mọi thay đổi dữ liệu đều phải đi qua hàm này. Nó làm bốn việc:

```js
function persist() {
  if (previewOnly && !LIVE) return true;        // chế độ xem thử: không ghi
  if (storageUnavailable) return false;
  if (storageConflict) return false;            // tab khác đã sửa: từ chối ghi
  const text = JSON.stringify(db);
  try { localStorage.setItem(KEY, text); }
  catch { storageUnavailable = true; return false; }   // đầy bộ nhớ
  storageSnapshot = text;
  return true;
}
```

Điểm quan trọng: **trả `false` thay vì ném lỗi**. Nhờ vậy mọi nơi gọi đều có thể hoàn tác:

```js
p.history.push({record, sent:false});
db.queue.push({record});
if (!persist()) {                    // ghi thất bại
  p.history.pop();                   // hoàn tác trong bộ nhớ
  db.queue.pop();
  return;                            // giữ nguyên nháp, không mất bài
}
```

Đây là lý do dự án **không bao giờ mất bài khi bộ nhớ đầy**: nó chỉ từ chối chuyển sang bước tiếp.

## B3. Phát hiện tab khác

Trình duyệt phát sự kiện `storage` khi **tab khác** sửa cùng khoá (không phát cho tab đã sửa).

```js
window.addEventListener('storage', event => {
  if (event.key === KEY && event.newValue !== storageSnapshot) {
    storageConflict = true;      // từ nay mọi persist() trả false
    showStorageConflict();       // bắt người dùng tải bản sao trước khi tải lại
  }
});
```

Đây là cơ chế **từ chối** làm việc đồng thời, không phải cơ chế hợp nhất. Dự án chọn cách an toàn: dừng lại và cho tải bản sao, thay vì cố gộp hai trạng thái.

---

# Phần C — Đăng nhập, từng bước

## C1. Màn hình

`login()` dựng form gồm mã, trường, lớp, mật khẩu (có thể ẩn). Bên trong nó định nghĩa `attemptLogin()` — hàm thật sự xử lý.

## C2. `attemptLogin()` làm gì, theo thứ tự

```js
const ma = Core.normalize($('code').value);     // viết hoa, bỏ khoảng trắng
if (!Core.validCode(ma)) { báo lỗi định dạng; return; }
if (Core.bannedCode(ma, CONTENT)) { báo "mã ví dụ"; return; }
if (!schools.some(s => s.truong===truong && s.lop.includes(lop))) { báo chọn lớp; return; }

if (AUTH_REQUIRED) {
  if (!LIVE) { báo "chưa kết nối máy chủ"; return; }   // mở file cục bộ
  const pin = $('studentPin').value;
  $('studentPin').value = '';                          // xoá khỏi DOM ngay
  if (NEEDS_PASSWORD && !validStudentPassword(pin)) { báo lỗi; return; }
  if (!navigator.onLine) { báo cần mạng; return; }
  const response = await rpc('loginStudent', {ma, truong, lop, password: pin});
  if (!response?.ok) throw Error(response.error);
  auth = {ma, truong, lop, token: response.token, expires: response.expires};
}

profile = {ma, truong, lop};
db.current = profile;
person();                                    // tạo hồ sơ nếu chưa có
if (!persist()) { /* hoàn tác, thu hồi token */ return; }
studentAuth = auth;
if (LIVE) { refreshStudentProgress(); sync(true); }
```

Bốn chi tiết đáng chú ý:

1. **Xoá ô mật khẩu ngay sau khi đọc** — để không còn trong DOM nếu người khác mở console.
2. **Token chỉ nằm trong biến bộ nhớ** (`studentAuth`), không vào localStorage, nên mở lại trang phải đăng nhập lại.
3. **`persist()` có thể thất bại** — khi đó token vừa lấy được phải thu hồi (`logoutStudent`), nếu không sẽ treo một phiên vô chủ trên máy chủ.
4. **`refreshStudentProgress()` và `sync(true)` chạy song song** sau khi vào — tải tiến trình và đẩy các bài đang chờ.

## C3. Máy chủ kiểm gì — `loginStudent`

```js
if (!input || !schoolOK_(input) || !/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(input.ma)) fail_(…);
input = ClassIds.profile(input);
if (SCHEMA.maCam.includes(input.ma)) fail_('mã ví dụ…', 'AUTH_REQUIRED');
if (!classOpen_(input.lop)) fail_('Lớp chưa mở…', 'LOP_CHUA_MO');

// chống dò: đếm lần sai theo từng mã, khoá 10 phút sau 8 lần
const state = cache.get(key) || {attempts:0, blockedUntil:0};
if (state.blockedUntil > Date.now()) return {code:'RATE_LIMITED', retryAfterSeconds};

const account = studentAccounts_(id).find(…);   // đọc bảng tai_khoan (có nhớ tạm)

if (studentLoginMode_() === 'ma') {             // chế độ chỉ cần mã
  if (account && account.status !== 'hoat_dong') fail_('Tài khoản bị khoá', 'AUTH_REQUIRED');
  cấp token; return {ok:true, token, expires};
}

// chế độ mật khẩu
const digest = pinDigest_(studentPassword_(input), candidate);
if (!account || !account.pinHash || !constantTimeEqual_(digest, account.pinHash)) {
  đếm lần sai; trả AUTH_REQUIRED hoặc RATE_LIMITED
}
cấp token; return {ok:true, token, expires};
```

**`constantTimeEqual_`** so sánh từng byte với thời gian không đổi — nếu so sánh chuỗi thông thường, kẻ tấn công có thể đo thời gian để dò dần.

**Token** là hai UUID ghép lại, lưu trong `CacheService` với hạn 6 giờ. Không lưu ở Sheet.

---

# Phần D — Làm bài

## D1. `start(n)` — mở một tuần

```js
if (LIVE && cloudSync()?.loading) { toast('Đang khôi phục…'); return; }   // tránh tạo trùng nháp
if (AUTH_REQUIRED && !studentAuthorized(profile)) { … return; }

const p = person();
if (!p.drafts[n]) {                                  // chưa có nháp
  if (p.history.some(h => h.record.tuan === n) && !confirm('Tạo lượt mới?')) return;
  p.drafts[n] = {
    id: Core.id(),                  // ID CẤP MỘT LẦN, dùng cho mọi lần gửi lại
    version: CONTENT.phien_ban,
    step: 0, answers: {}, started: new Date().toISOString(),
    activeMs: 0, stageTimes: {}, hints: {}
  };
  if (!persist()) return;
}
activeWeek = n; lastTick = Date.now(); tab = 'work'; render();
```

Điều quan trọng nhất: **`id` sinh lúc mở nháp, không sinh lúc nộp**. Toàn bộ cơ chế chống trùng dựa vào việc ID không đổi dù gửi bao nhiêu lần.

## D2. `work()` — dựng màn hình làm bài

Hàm này dài nhất dự án. Nó làm bốn việc theo thứ tự:

**Thứ nhất, dựng HTML** bằng một template lớn, gồm: nút quay lại, đầu trang (tuần, chặng, số bước, thanh tiến độ, dải chặng), rồi tới panel chứa nội dung.

**Thứ hai, chọn nội dung theo bước**:

```js
d.step === 0 ? letterHTML(w) : `<h2>${E(s.title)}</h2>`   // bước 0 hiện cả lá thư
w.quy_trinh === 'trien_lam_45' && … ? oldProductHTML() : '' // tuần 4 có ô chọn sản phẩm cũ
s.fields.map(f => fieldHTML(f, a)).join('')                 // các ô nhập của bước
```

**Thứ ba, gán `.value` sau khi đã có DOM**:

```js
document.querySelectorAll('[data-field]').forEach(el => {
  if (el.type !== 'radio') el.value = a[el.dataset.field] ?? '';
});
```

Vì sao không đặt `value` trong template? Vì nếu đặt trong thuộc tính HTML, ký tự xuống dòng đầu tiên sẽ bị chuẩn hoá mất. Học sinh viết đoạn văn mở đầu bằng dòng trống thì dòng đó phải còn.

**Thứ tư, gắn sự kiện** cho nút quay lại, nút tiếp tục, sự kiện `input`, `paste`, nút gợi ý.

## D3. `fieldHTML(f, a)` — ba nhánh

| Điều kiện | Tạo ra |
|---|---|
| `f.kind === 'rating'` | Ba nút radio, lấy nhãn từ `CONTENT.tieu_chi_san_pham` — chính là ba mức có mô tả |
| `f.options` | Một `<select>` với các phương án cố định |
| còn lại | Một `<textarea>` kèm bộ đếm "N từ · tối thiểu … từ · tối đa … ký tự" |

Mọi `label` và `body` đều đi qua `E()` = `Core.esc()` trước khi chèn. Không có ngoại lệ — đây là hàng rào XSS duy nhất.

## D4. `nextStep(w, s, d)` — kiểm tra và chuyển bước

```js
collect();                                   // DOM → d.answers
let bad = false;
s.fields.forEach(f => {
  const err = Core.validate(f, d.answers[f.key]);
  $('err_' + f.key).textContent = err;       // hiện lỗi ngay dưới ô
  if (err) bad = true;
});
if (bad) { cuộn tới lỗi đầu tiên; return; }

if (d.step < w.steps.length - 1) { d.step++; persist(); render(); return; }  // sang bước

// bước cuối: kiểm tra LẠI toàn tuần
for (let i = 0; i < w.steps.length; i++)
  if (w.steps[i].fields.some(f => Core.validate(f, d.answers[f.key]))) {
    d.step = i; render(); toast('Còn phần chưa hoàn thành'); return;
  }

const record = Core.record(d, profile, w, APP_CONFIG.version);
const p = person();
p.history.push({record, sent:false});
db.queue.push({record});
delete p.drafts[w.tuan];                     // xoá nháp KHỎI BỘ NHỚ trước
if (!persist()) {                            // ghi thất bại → hoàn tác tất cả
  p.drafts[w.tuan] = d;
  p.history = p.history.filter(h => h.record.id !== record.id);
  db.queue = db.queue.filter(q => q.record.id !== record.id);
  return;
}
tab = 'notebook'; render(); sync();
```

Ghi chú: phải kiểm tra lại **toàn tuần** vì học sinh có thể quay lại sửa một bước trước đó thành trống rồi nhảy tới bước cuối.

## D5. `Core.record()` — chuyển nháp thành bản ghi

Hàm này là ranh giới giữa "dữ liệu trên máy" và "dữ liệu gửi đi". Nó:

```js
const result = {
  id: draft.id,                          // KHÔNG sinh mới
  loai: 'chu_trinh',
  thoi_gian: new Date().toISOString(),
  bat_dau: draft.started,
  ma, truong, lop: ClassIds.code(lop),   // mã lớp chuẩn
  tuan: week.tuan,
  phien_ban_app, phien_ban_noi_dung,
  thoi_luong_giay: Math.round(draft.activeMs / 1000),
  thoi_gian_troi_giay: (now - started) / 1000,
  ban_goc_id: draft.sourceId || '',
  so_lan_dan: draft.pastes || 0
};

// 13 trường câu trả lời, thiếu thì để chuỗi rỗng
['thu_lam','nghi_1','nghi_2','nghi_3','noi','dang_san_pham','san_pham',
 'chia_se','tu_danh_gia','phe','doi_hay_giu','kiem_soat','ngoai_kiem_soat']
  .forEach(k => result[k] = answers[k] ?? '');

// tuần 3: ghép tiền tố
if (week.quy_trinh === 'tranh_luan_45') {
  result.nghi_1 = (answers.phe.startsWith('A') ? 'Phe A: ' : 'Phe B: ') + answers.nghi_1;
  result.chia_se = answers.doi_hay_giu + ': ' + answers.chia_se;
}
// tuần 4: ghép hai ô thành một cột
if (week.quy_trinh === 'trien_lam_45') {
  result.thu_lam = 'Phần mình thay đổi được:\n' + answers.kiem_soat +
                   '\n\nPhần mình không thay đổi được:\n' + answers.ngoai_kiem_soat;
}
result.tu_danh_gia = Number(result.tu_danh_gia);
```

Hai phép ghép ở tuần 3 và 4 là **yêu cầu phân tích dữ liệu**, không phải để đẹp: nhóm cần một cột định dạng thống nhất qua bốn tuần. Máy chủ kiểm tra lại phép ghép này (xem `validateStudent_`).

---

# Phần E — Đồng bộ nháp (`learning.js`)

Đây là tệp khó nhất phía giao diện. Nó giải bài toán: **một học sinh có thể dùng hai thiết bị**, và máy chủ phải biết bản nào là mới nhất mà không làm mất bản nào.

## E1. Ba khái niệm

| Khái niệm | Nghĩa |
|---|---|
| `revision` | Số phiên bản của nháp **trên Sheet**. Mỗi lần ghi thành công tăng 1 |
| `mutationId` | Mã của **một lần gửi**. Gửi lặp cùng `mutationId` thì máy chủ trả lại kết quả cũ, không ghi lần hai |
| `expectedRevision` | Revision mà client **tin** đang có. Lệch thì máy chủ trả `STATE_CONFLICT` |

Cơ chế này gọi là **CAS — compare and swap**: ghi chỉ thành công khi nền chưa bị người khác đổi.

## E2. `remember()` — ghi nhận thay đổi

```js
for (const [week, draft] of Object.entries(p.drafts)) {
  if (cloud.conflicts[week]) continue;                    // đang xung đột thì thôi
  if (p.history.some(item => item.sent && item.record.id === draft.id)) continue; // đã nộp
  const fp = fingerprint(draft);
  if (cloud.saved[week] === fp && !cloud.pending[week]) continue;   // không đổi
  if (!cloud.pending[week] || !cloud.pending[week].attempted)
    cloud.pending[week] = {
      week: Number(week),
      mutationId: cloud.pending[week]?.mutationId || Core.id(),  // giữ mã qua các lần thử
      expectedRevision: cloud.versions[week] || 0,
      draft: safe(draft),                                        // ĐÃ CHE
      attempted: false
    };
}
if (!timer) timer = setInterval(syncMinute, APP_CONFIG.syncIntervalMs || 60000);
```

Ba điểm: `safe(draft)` che nội dung **trước khi** vào hàng đợi gửi; `mutationId` được giữ nguyên qua các lần thử để máy chủ nhận ra; đồng hồ 60 giây chỉ tạo một lần.

## E3. `load()` — tải và đối chiếu

Đây là hàm phức tạp nhất của tệp. Các bước:

```
1. rpc('getStudentLearning')  →  {states, records}
2. Với mỗi record: nếu máy chưa có thì thêm vào history với sent=true
3. Tính tuần đã nộp  →  studentProgress
4. Với mỗi tuần 1..4, so sánh (local, state):
   a. Có gói chờ VÀ mutationId + vân tay khớp máy chủ
      → ACK trước đó bị mất. Đánh dấu đã lưu, xoá pending
   b. Nháp trên máy đã nộp rồi
      → chuyển vào backups, xoá nháp (trừ khi đang mở chính tuần đó)
   c. Máy chủ có nháp, máy không có
      → nhận về, TRỪ KHI đang gõ dở chính tuần đó
   d. Hai bên giống nhau → cập nhật dấu vân tay
   e. Khác nhau, không rơi vào các ca trên → conflict(), giữ CẢ HAI
5. persist() — ghi đĩa; lỗi thì huỷ, không tự gửi
```

Nhánh `c` có điều kiện đặc biệt: **không dựng lại ô đang viết** nếu người dùng đang gõ. Nếu không, phản hồi mạng đến chậm sẽ xoá mất chữ vừa nhập.

Nhánh `e` là điểm cốt lõi: khi không chắc, **không chọn hộ**. Người học thấy hộp thoại "Giữ bản trên máy thành lượt mới" hoặc "Dùng bản trên Sheet", và cả hai bản đã được sao vào `backups`.

## E4. `flush()` — gửi

```js
for (const week of Object.keys(cloud.pending)) {
  if (cloud.conflicts[week]) continue;
  const item = cloud.pending[week];
  item.attempted = true;
  if (!persist()) break;                    // ghi trạng thái "sắp gửi" trước

  const result = await rpc('saveStudentDraft', {
    token, week, mutationId: item.mutationId,
    expectedRevision: item.expectedRevision, draft: item.draft
  });

  if (!identity(owner) || studentAuth !== auth) return;   // đổi tài khoản giữa chừng

  if (result.ok && result.mutationId === item.mutationId) {
    cloud.versions[week] = result.revision;
    cloud.saved[week] = fingerprint(item.draft);
    delete cloud.pending[week];
  } else if (result.code === 'STATE_CONFLICT') {
    conflict(cloud, week, result.draft, result.revision);
  } else if (result.code === 'ALREADY_SUBMITTED') {
    await load();                            // nháp này đã thành bài nộp
  } else {
    throw Error(...);                        // giữ gói, thử lại sau
  }
}
```

`item.attempted = true` trước khi gọi mạng là chi tiết quan trọng: nếu app sập giữa lúc gửi, lần sau `remember()` sẽ không ghi đè `mutationId`, nhờ vậy máy chủ nhận ra lần gửi trước đã đến hay chưa.

## E5. Máy chủ — `saveStudentDraft`

```js
authorizeStudent_(token, input, id);                    // đúng tài khoản
const draft = cleanStudentDraft_(input.draft, input.week);   // kiểm + che lại
const current = ownLearningRows_(…).find(r => r[3] === week);

if (current && current.mutationId === input.mutationId) {    // gửi lặp
  if (JSON.stringify(decode(current)) !== json) fail_('ID_CONFLICT');
  return {ok:true, duplicate:true, revision};                 // không ghi
}
if (input.expectedRevision !== revision)                     // CAS thất bại
  return {ok:false, code:'STATE_CONFLICT', revision, draft: currentDraft};

// ghi: revision + 1, một dòng
```

Thứ tự hai phép kiểm tra rất quan trọng: **kiểm trùng trước, kiểm revision sau**. Nếu đảo, lần gửi lại sau khi mất ACK sẽ luôn bị coi là xung đột.

---

# Phần F — Gửi bài

## F1. `sync()` — vòng lặp gửi

```js
if (sending || !LIVE || !navigator.onLine || loadBroken || storageConflict) return;
sending = true;
for (const item of [...db.queue]) {
  if (item.paused || Date.now() < item.nextTryAt) continue;      // đang chờ
  if (loai === 'chu_trinh' && !studentAuthorized(item.record)) {
    item.error = 'Đăng nhập đúng mã…'; showStudentReauth(); continue;
  }
  try {
    item.record = Core.safeRecord(item.record, CONTENT.an_toan); // CHE LẦN CUỐI
    if (!persist()) throw Error('Chưa lưu được gói an toàn; chưa gửi.');
    const result = await rpc('submitRecord', {record, token});
    if (!result?.ok || result.id !== item.record.id) throw Error(result?.error);
    db.queue = db.queue.filter(q => q.record.id !== item.record.id);  // XOÁ
    Object.values(db.profiles).forEach(p => p.history.forEach(h => {
      if (h.record.id === result.id) h.sent = true;
    }));
    persist();
  } catch (error) {
    item.error = error.message;
    item.attempts++;
    item.nextTryAt = Date.now() + Core.retryDelay(item.attempts, Math.random, APP_CONFIG);
    item.paused = error.permanent;      // ID_CONFLICT, INVALID_RECORD
    persist();
  }
}
```

Bốn điểm thiết kế:

- **Gửi tuần tự**, không song song. Gửi song song nhiều bài sẽ dồn tải máy chủ và làm khó gỡ lỗi.
- **Kiểm ACK đúng ID** trước khi xoá gói. Nếu chỉ kiểm `ok`, một phản hồi lạc sẽ xoá nhầm.
- **`error.permanent`** dừng hẳn gói: lỗi dữ liệu không hợp lệ thì thử lại nghìn lần vẫn sai.
- **Timeout không có nghĩa là chưa ghi.** Vì thế lần sau giữ nguyên ID và nội dung.

## F2. `submitRecord` trên máy chủ — tám bước

```
1. valid_(payload.record)                     cấu trúc, độ dài, kiểu
2. data = Safety.redactRecord(record)         CHE LẠI (không tin client)
3. valid_(data)                               kiểm lại sau khi che
4. data.lop = ClassIds.code(lop, truong)      chuẩn hoá mã lớp
5. authorizeCoordinator_ nếu là phiếu điều phối
6. authorizeStudent_ nếu là bài học sinh      ← TRƯỚC khi lấy khoá
7. lock.tryLock(1500)                         ← chỉ bao phần đọc-ghi
8. đọc tiêu đề → đọc cột ID → tìm ID
   ├─ có: so từng ô (bỏ qua thoi_gian_nhan)
   │      giống → ACK lại; khác → ID_CONFLICT
   └─ chưa: append một dòng RAW
   → projectStudentProgress_()  →  nhả khoá  →  trả {ok, id, duplicate}
```

Vì sao phải che **hai lần** (bước 2 và bước 3)? Vì client có thể bị sửa. Máy chủ không bao giờ tin dữ liệu đến từ trình duyệt.

Vì sao `authorizeStudent_` đứng **trước** khoá? Đó là lệnh đọc; nếu nằm trong khoá thì cả lớp sẽ xếp hàng chờ nhau lúc đăng nhập.

---

# Phần G — Kiểm tra dữ liệu trên máy chủ

## G1. `valid_(data)` — kiểm tổng thể

Theo thứ tự: phiên bản Schema → kích thước ≤ 100 KB → `loai` có trong `HEADERS` → `id` khớp `^[a-zA-Z0-9-]{12,80}$` → trường/lớp hợp lệ → `tuan` 1–4 → `thoi_gian` parse được → **mọi trường phải là string/number/boolean và không vượt 13.000 ký tự** → gọi hàm kiểm riêng theo loại.

## G2. `validateStudent_(data)` — theo Schema

Với mỗi trường khai báo trong `SCHEMA.weeks[tuan-1]`:

| Loại | Kiểm gì |
|---|---|
| `kind: 'rating'` | Phải là 1, 2 hoặc 3 |
| có `options` | Phải nằm trong danh sách |
| còn lại | `text_(raw, min từ, max ký tự)` |

Hai phép đặc biệt:

```js
// Bỏ tiền tố trước khi đếm từ, để không "ăn gian" độ dài
if (data.tuan === 3 && key === 'nghi_1') raw = value.replace(/^Phe [AB]: /, '');
if (data.tuan === 3 && key === 'chia_se') raw = value.replace(/^(Đổi ý|Giữ ý): /, '');
```

```js
// tuần 4: cột tổng hợp phải khớp đúng hai ô gốc
const expected = 'Phần mình thay đổi được:\n' + data.kiem_soat +
                 '\n\nPhần mình không thay đổi được:\n' + data.ngoai_kiem_soat;
if (data.thu_lam !== expected) fail_('Hai phần của bước Thử không khớp.');
```

Và `text_` có một ngoại lệ: nếu giá trị **đúng bằng** `[đã ẩn – an toàn]` thì bỏ qua kiểm số từ, vì ô đó đã bị che, không còn nội dung để đếm.

## G3. `sameCell_(stored, expected)` — so ô Sheet

```js
if (expected === '' ) return stored === '' || stored == null;
if (typeof expected === 'number')  return typeof stored === 'number'  && stored === expected;
if (typeof expected === 'boolean') return stored === expected;
return typeof stored === 'string'  && stored === expected;
```

Không dùng `String()` để so, vì `String(5) === String('5')` sẽ làm một ô số và một ô chữ bị coi là giống nhau — dẫn tới ACK nhầm cho bản ghi khác nội dung.

---

# Phần H — Bảng Sheet và ý nghĩa từng cột

## H1. `chu_trinh` — bài nộp, 27 cột

| # | Cột | Nghĩa |
|---|---|---|
| 1 | `id` | Mã bản ghi, dùng chống trùng |
| 2 | `thoi_gian_nhan` | Máy chủ nhận, **ISO UTC**. Cột duy nhất được bỏ qua khi so trùng |
| 3 | `thoi_gian` | Lúc máy học sinh tạo bản ghi |
| 4 | `bat_dau` | Lúc mở nháp |
| 5–7 | `ma`, `truong`, `lop` | Bộ ba định danh |
| 8 | `tuan` | 1–4 |
| 9 | `thu_lam` | Tuần 1–3: ô Thử. Tuần 4: cột ghép hai phần |
| 10–12 | `nghi_1..3` | Ba câu Nghĩ. Tuần 3 có tiền tố phe |
| 13 | `noi` | Phần Nối |
| 14 | `dang_san_pham` | Hình thức sản phẩm (tuần 1–3) |
| 15 | `san_pham` | Nội dung sản phẩm |
| 16 | `chia_se` | Chia sẻ, hoặc cột đổi/giữ ý ở tuần 3 |
| 17 | `tu_danh_gia` | 1–3, số |
| 18 | `thoi_luong_giay` | Thời gian màn hình hiển thị |
| 19 | `thoi_gian_troi_giay` | Thời gian thực đã trôi |
| 20 | `phe` | Phe A/B, chỉ tuần 3 |
| 21 | `doi_hay_giu` | `doi` hoặc `giu`, chỉ tuần 3 |
| 22–23 | `kiem_soat`, `ngoai_kiem_soat` | Chỉ tuần 4 |
| 24 | `ban_goc_id` | ID sản phẩm gốc ở tuần 4 |
| 25–26 | `phien_ban_app`, `phien_ban_noi_dung` | Phiên bản để truy vết |
| 27 | `so_lan_dan` | Số lần dán, thêm ở 2.8.1 |

**Cột 22–23 luôn trống ở tuần 1–3.** Đây không phải lỗi (nhóm từng tưởng vậy) — chúng chỉ thuộc tuần 4.

## H2. Các bảng còn lại

| Bảng | Cột | Ghi chú |
|---|---|---|
| `phieu_buoi` | 21 | id, thời gian, trường/lớp, tuần, ngày, khung giờ, thời lượng thực, sĩ số, số tham gia, 5 cờ `da_lam_*`, hình thức app/giấy, điều tốt, khó khăn, ghi chú điều phối viên |
| `doi_y` | 10 | Phiếu đổi/giữ ý của nhóm ở tuần 3 |
| `tai_khoan` | 7 | ma, trường, lớp, trạng thái (`hoat_dong`/`khoa`), salt, hash, ngày cấp |
| `tien_do` | 9 | 4 cờ tuần + số tuần + thời điểm cập nhật |
| `nhap_hoc_tap` | 24 | 8 cột định danh + 16 ô chứa JSON nháp đã che |
| `quan_ly_hoc_sinh` | 13 | Công thức `XOAY_STUDENTS` |
| `quan_ly_hoc_tap` | 27 | Công thức `XOAY_MANAGEMENT` |

## H3. Vì sao nháp chia 16 ô

Một ô Google Sheets giới hạn 50.000 ký tự, nhưng API có giới hạn thực tế thấp hơn. Dự án chọn 10.000 ký tự mỗi ô, tối đa 16 ô = 160.000 ký tự, dư so với giới hạn nháp 159.000.

`learningChunks_` cắt chuỗi nhưng **không cắt giữa cặp surrogate** (emoji): nếu cắt đúng giữa, ký tự sẽ hỏng khi ghép lại.

---

# Phần I — Giáo viên và điều phối

## I1. Ba vai, ba cơ chế khác nhau

| Vai | Xác thực bằng | Lưu ở đâu | Thấy gì |
|---|---|---|---|
| Học sinh | mã + trường/lớp (+ mật khẩu nếu bật) | `CacheService['student:token']` | Bài của chính mình |
| Giáo viên | PIN lớp | `CacheService['teacher:token']` | Chỉ `ma` + tuần đã nộp của đúng lớp |
| Điều phối | PIN lớp | `CacheService['coord:token']` | Gửi được phiếu buổi, phiếu đổi ý |

Tiền tố khác nhau trong cache là **cơ chế phân quyền**: token giáo viên tra vào khoá `coord:` sẽ không thấy gì. Đây là lý do một token không thể dùng chéo vai.

## I2. `getClassProgress` — chỉ trả phép chiếu

```js
const byCode = new Map();
rows.forEach(row => {
  if (row[truong] !== input.truong || ClassIds.code(row[lop]) !== ClassIds.code(input.lop)) return;
  …
  byCode.get(code).add(week);
});
return {ok:true, students:[{ma, weeks:[…]}]};
```

Hàm **không** trả câu trả lời, sản phẩm, thời lượng hay mức tự đánh giá. Chỉ hai trường. Đây là ràng buộc về đạo đức nghiên cứu, không chỉ kỹ thuật.

Hệ quả: bảng chỉ liệt kê mã **đã có ít nhất một bài**. Chưa có danh sách mã được cấp nên không thể kết luận mã vắng mặt là chưa làm bài (issue #1, đang chờ quyết định).

## I3. Chống dò PIN — `loginRole_`

```js
const key = 'login:' + role + ':' + truong + '|' + lop;   // đếm theo LỚP, không theo máy
let state = cache.get(key) || {attempts:0, blockedUntil:0};

if (state.blockedUntil > Date.now()) {
  cache.put(key, state, secondsRemaining);      // TTL = số giây còn lại → KHÔNG kéo dài
  throw {code:'RATE_LIMITED', retryAfterSeconds};
}
if (String(input.pin) !== String(expected)) {
  state.attempts++;
  if (state.attempts >= 8) state.blockedUntil = Date.now() + 600000;   // 10 phút
  …
}
```

Chi tiết `cache.put(…, secondsRemaining)`: nếu đặt TTL cố định 600 giây mỗi lần thử, kẻ tấn công chỉ cần bấm liên tục là khoá lớp vĩnh viễn. Đặt bằng số giây còn lại thì việc bấm thêm không kéo dài hạn.

Bộ đếm theo **lớp** nên vẫn còn nguy cơ: một người cố tình nhập sai 8 lần sẽ khoá cả lớp trong 10 phút. Đây là đánh đổi đã được nhóm ghi nhận.

---

# Phần J — Báo cáo và sao lưu

## J1. Custom function

`XOAY_STUDENTS` và `XOAY_MANAGEMENT` là **custom function** của Google Sheets — chạy khi bảng tính lại. Chúng chỉ nhận **ba mảng ô** làm tham số:

```
=XOAY_STUDENTS(tai_khoan!A2:D, nhap_hoc_tap!A2:X, chu_trinh!A2:Z)
```

Vì sao phải truyền mảng thay vì để hàm tự đọc Sheet? Vì custom function **không được gọi API bên ngoài**. Nếu tự đọc, Google sẽ trả lỗi. Cách duy nhất là nhận dữ liệu qua tham số.

`managementModel_` là hàm thuần: đưa ba mảng vào, nhận hai mảng ra. Nhờ vậy nó kiểm thử được bằng Node mà không cần Google.

## J2. Sao lưu

```js
function dailyBackup() {
  const folder = backupFolder_();                    // tạo nếu chưa có
  const name = 'XoayChieu_backup_' + backupStamp_(); // yyyy-MM-dd giờ VN
  if (folder.getFilesByName(name).hasNext()) return {skipped:true};  // chống trùng
  const file = DriveApp.getFileById(id).makeCopy(name, folder);
  emails.forEach(email => file.addViewer(email));
  // dọn bản cũ quá BACKUP_KEEP_DAYS (mặc định 120)
}
```

Hai điểm an toàn: **chống trùng theo ngày** (chạy tay nhiều lần cũng không sinh thêm tệp) và **chỉ đọc để sao chép**, không sửa Sheet gốc.

---

# Phần K — Giao diện điều phối

`coord()` dựng bảng điều phối, gồm bốn khối:

1. **Đồng hồ chặng.** `resetTimer()` đọc tuần đang chọn, gom các `stage` duy nhất và số phút của chúng thành mảng `[tên, phút]`, rồi chạy đếm ngược. `paintCoord()` cập nhật chữ mỗi 500 ms.
2. **Thẻ câu hỏi.** Rút ngẫu nhiên từ `CONTENT.loai_cau_hoi_socrates`, chỉ để gợi ý.
3. **Phiếu ghi buổi.** Form gồm ngày, khung giờ, thời lượng thực, sĩ số, số tham gia, năm cờ bước, hình thức. `saveCoord()` đóng gói thành `loai: 'phieu_buoi'` và đẩy vào hàng đợi.
4. **Phiếu đổi ý.** Chỉ mở ở tuần 3, `loai: 'doi_y'`.

Điều đáng chú ý: phiếu điều phối dùng **cùng hàng đợi** với bài học sinh, nên cũng được hưởng cơ chế chống mất dữ liệu và tự gửi lại.

`bindCoordinatorDrafts()` gắn mỗi form với khoá nháp riêng trong `person().coordDrafts`, để điều phối viên gõ dở mà lỡ tải lại trang vẫn còn.

---

# Phần L — Kiểm thử

`npm test` chạy `tests/run.cjs`, lần lượt 17 tệp, dừng ngay ở tệp đầu tiên lỗi.

Kiến trúc chung của một test máy chủ (ví dụ `tests/accounts.cjs`):

```js
const c = vm.createContext({        // giả lập môi trường Google
  PropertiesService: { … },
  CacheService:      { … },
  LockService:       { … },
  Sheets:            { Spreadsheets: { Values: api } },   // bảng giả trong bộ nhớ
  SpreadsheetApp:    { … },
  Utilities:         { computeHmacSha256Signature: … }
});
vm.runInContext(fs.readFileSync('apps-script/Schema.gs'), c);
vm.runInContext(fs.readFileSync('apps-script/Accounts.gs'), c);
const call = (name, input) => { c.input = input; return vm.runInContext(name + '(input)', c); };
```

Nhờ đó chạy được hàm thật của Apps Script bằng Node, không cần Google.

Ba loại khẳng định có giá trị nhất:

| Kiểu | Ví dụ |
|---|---|
| **Bất biến dữ liệu** | `assert(!JSON.stringify(tables).includes(pin))` — mật khẩu rõ không bao giờ vào Sheet |
| **Đếm lời gọi API** | `assert.equal(batchCalls, 1)` — cấp 150 tài khoản chỉ một lệnh ghi |
| **Thứ tự thao tác** | `assert(!locked)` — khoá phải nhả trước khi hiện hộp thoại chặn |

Test phía giao diện dùng `jsdom`: nạp `dist/index.html`, gõ vào ô, bấm nút, rồi kiểm DOM. Chúng **không** kiểm thị giác — muốn xem giao diện phải dùng `tools/screenshot.cjs` với Chrome thật.

---

# Phần M — Bảng tra: muốn sửa gì thì vào đâu

| Muốn | Sửa ở |
|---|---|
| Đổi câu hỏi, lá thư, ngưỡng độ dài | `src/content.json` → chạy `build.py` |
| Thêm trường/lớp | `src/content.json` → `truong_lop`, và `classes.js` nếu cần nhãn riêng |
| Đổi màu, khoảng cách | `src/style.css` → biến ở `:root` |
| Đổi thời gian chờ mạng | `src/config.js` |
| Đổi nhịp đồng bộ nháp | `src/config.js` → `syncIntervalMs` |
| Đổi câu chữ thông báo trên giao diện | tìm chuỗi trong `src/app.js` |
| Đổi PIN | Script Properties, **không build lại** |
| Mở/khoá lớp | Script Property `LOP_DANG_MO` |
| Bật lại mật khẩu học sinh | `STUDENT_LOGIN_MODE=mat_khau` **và** `requireStudentPassword: true` |
| Thêm cột dữ liệu | cuối `HEADERS.chu_trinh` + `Core.record` + chạy `migrateAddTrailingColumns_` |
| Đổi Sheet nhận dữ liệu | tạo dự án Apps Script mới gắn Sheet mới, chạy `setup_` |
| Đổi nội dung trang chủ | `src/app.js` → hàm `home()` |
| Đổi bố cục màn hình làm bài | `src/app.js` → hàm `work()` |

## Năm điều tuyệt đối không làm

1. Đổi `storageKey` — mất toàn bộ dữ liệu học sinh.
2. Đổi `key` của một field trong `content.json` — lệch cột Sheet.
3. Đổi thứ tự cột trong `HEADERS` — chỉ được thêm vào cuối.
4. Dùng `||=`, `&&=`, `??=` trong tệp `.gs` — Apps Script không hỗ trợ.
5. Sửa trực tiếp `dist/`, `apps-script/Index.html`, `apps-script/Schema.gs` — bị ghi đè khi build.
