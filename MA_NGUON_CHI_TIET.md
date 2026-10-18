# Hướng dẫn đọc và sửa mã nguồn Xoay Chiều 2.2.0

## 1. Kiến trúc và nơi dữ liệu đi qua

Frontend là HTML/CSS/JavaScript thuần. `build.py` ghép cấu hình, nội dung và logic thành một HTML đầy đủ. `dist/index.html` là bản xem thử độc lập; `apps-script/Index.html` có cùng nội dung nhưng khi được Google Apps Script phục vụ sẽ có cầu nối `google.script.run`.

Backend gồm `Code.gs` và `Schema.gs`. `doGet()` trả giao diện. `submitRecord()` nhận bản ghi, kiểm tra lại và ghi vào Sheet. `loginCoordinator()` cấp phiên điều phối theo trường/lớp. Các hàm tên kết thúc `_` là hàm nội bộ, không gọi được từ `google.script.run`.

Không đặt Sheet ID hoặc PIN vào frontend. `setup_()` lưu Sheet ID vào Script Properties. PIN được chủ dự án cấu hình ở thuộc tính `COORDINATOR_PINS`.

| Thành phần | Lưu ở đâu | Khi nào thay đổi |
|---|---|---|
| Thư/câu hỏi/trường/lớp | `src/content.json` → HTML + Schema.gs | Người quản lý sửa và build lại |
| Nháp đang viết | `localStorage.xoaychieu_v2` | Khi nhập, chuyển bước, ẩn trang |
| Bài chờ gửi | `db.queue` trong cùng localStorage | Khi nộp, thất bại hoặc được xác nhận |
| Bài đã nộp trên máy | `db.profiles[key].history` | Khi nộp; khi máy chủ xác nhận |
| Dữ liệu nghiên cứu trung tâm | Google Sheets của chủ dự án | Chỉ khi backend ghi thành công |
| Phiên điều phối | RAM của tab + Google Script Cache | Đăng nhập, hết hạn hoặc đóng trang |

## 2. Nội dung bốn tuần bằng JSON

Mỗi phần tử `weeks` có `tuan`, `duration`, `quy_trinh`, `letter`, `steps`. Một `step` là một màn hình, có `stage`, `minutes`, `title`, `body`, `hints`, `fields`. Ba câu Nghĩ được đặt thành ba màn hình, nhưng cùng `stage` nên dùng chung thời lượng chặng.

Ví dụ cấu trúc một trường:

```json
{
  "key": "nghi_1",
  "label": "Điều gì khiến bạn nghĩ cách này phù hợp?",
  "kind": "text",
  "min": 5,
  "max": 6000
}
```

`key` là tên cột dữ liệu. `label` là câu học sinh đọc. `min` là số đơn vị ngăn bằng khoảng trắng, không phải phân tích từ vựng tiếng Việt. `max` là giới hạn ký tự JavaScript. Ô không bị cắt ngầm khi vượt giới hạn: app báo để học sinh tự chỉnh.

- Có `options`: tạo ô chọn; chỉ nhận một giá trị trong danh sách.
- `kind: "rating"`: tạo ba mức; không chọn sẵn mức nào.
- Còn lại: tạo textarea, đếm độ dài khi nhập.
- `hints`: gợi ý mở từng ý khi học sinh chủ động bấm.

Đổi chữ câu hỏi, lá thư hoặc ngưỡng độ dài chỉ cần sửa JSON rồi build. Nếu thêm khóa câu trả lời mới, còn phải cập nhật `Core.record()` và `HEADERS.chu_trinh`; không tự thêm cột giữa đợt nghiên cứu. Danh sách ngưỡng và lựa chọn được tự sinh sang backend, tránh frontend cho qua mà backend từ chối vì quy tắc khác nhau.

## 3. Trạng thái và các hàm frontend

| Hàm / biến | Công việc |
|---|---|
| `db`, `person()` | Truy cập hồ sơ hiện tại, nháp, lịch sử và hàng đợi |
| `persist()` | Ghi toàn bộ db; kiểm tra tab khác đã thay đổi; trả false nếu không lưu được |
| `login()` | Chuẩn hóa mã, kiểm tra trường/lớp rồi chọn hồ sơ |
| `render()`, `go()` | Dựng màn hình và chuyển trang, lưu nháp trước khi rời |
| `start(tuan)` | Mở nháp cũ hoặc tạo lượt mới bằng ID mới |
| `work()`, `fieldHTML()` | Dựng từng bước; gán textarea.value sau dựng để giữ dòng trống đầu |
| `collect()`, `flushDraft()` | Đọc giá trị ô nhập về bộ nhớ rồi ghi localStorage |
| `nextStep()` | Kiểm tra màn hình hiện tại; kiểm tra cả tuần trước khi nộp |
| `Core.record()` | Chốt gói gửi từ nháp và thông tin hồ sơ |
| `sync()` | Gửi tuần tự, kiểm tra ACK đúng ID, giữ gói khi lỗi |
| `oldProductHTML()` | Liệt kê sản phẩm tuần 1–3 đang có trên máy |
| `Backup.restore()` | Kiểm tra cấu trúc bản sao, giữ gói chờ ở trạng thái tạm dừng |
| `coord()`, `bindCoordinatorDrafts()` | Điều phối và lưu nháp phiếu buổi/ý kiến nhóm |
| `boot()` | Đăng ký sự kiện mở lại mạng, ẩn trang, thay đổi bộ nhớ và chu kỳ gửi |

Bộ ba trường/lớp/mã được JSON.stringify thành khóa. Hai lớp dùng cùng một mã sẽ không trộn hồ sơ. Khi đổi mã, dữ liệu cũ vẫn còn trên máy. App không dùng cookie đăng nhập hay mật khẩu cho học sinh.

## 4. Lưu nháp, nộp và chống mất dữ liệu

Một nháp có `id`, `version`, `step`, `answers`, `started`, `activeMs`, `stageTimes`, `hints`; tuần 4 có thêm `sourceId` khi chọn sản phẩm cũ.

Khi bấm nộp ở bước cuối:

1. Thu giá trị trên màn hình và kiểm tra tất cả trường của tuần.
2. Tạo một bản ghi với ID đã cấp từ lúc mở nháp.
3. Thêm cùng gói đó vào lịch sử và hàng đợi, xóa nháp trong RAM.
4. Ghi localStorage. Nếu ghi thất bại, hoàn tác bước 3 và giữ nháp.
5. Chuyển sang sổ bài, hiển thị chờ gửi rồi gọi mạng.
6. Chỉ khi nhận `{ok: true, id: đúng_ID}` mới xóa gói khỏi hàng đợi.

Timeout không chứng minh máy chủ chưa ghi. Vì vậy lần thử lại luôn giữ nguyên ID, thời điểm nộp và toàn bộ nội dung. Nếu máy chủ đã ghi nhưng phản hồi bị mất, lần gửi sau chỉ xác nhận lại dòng cũ.

Tự kiểm tra hàng đợi mỗi 5 giây, đồng thời mỗi gói có thời điểm được thử lại riêng. Sau lỗi, khoảng chờ tăng dần từ khoảng 5 giây tới 2 phút, cộng dao động ngẫu nhiên nhỏ. Điều này giảm việc nhiều máy thử lại cùng lúc. Bấm “Thử gửi lại” chủ động bỏ thời gian chờ.

Lỗi dữ liệu không hợp lệ hoặc ID xung đột tạm dừng gói; gói vẫn được giữ để xuất bản sao và kiểm tra. Phiếu điều phối chỉ được gửi khi đang chọn đúng trường/lớp và còn phiên hợp lệ. Phiên hết sớm ở Google Cache thì app yêu cầu đăng nhập lại.

`storage` event và snapshot giúp phát hiện tab khác sửa db. Tab xung đột dừng lưu, cho xuất bản sao trước khi tải lại. Không dùng cơ chế này để cho nhiều tab cùng làm một bài; vẫn vận hành một tab cho một thiết bị.

## 5. Máy chủ ghi Sheet như thế nào

`setup_()` chỉ chạy trong Apps Script editor. Nó kiểm tra Sheets API, tạo ba sheet/header nếu còn trống, sau đó lưu `SPREADSHEET_ID`. Không âm thầm ghi đè header khác.

`submitRecord({record, token})` thực hiện:

1. Kiểm tra loại bản ghi, ID, tuần, trường/lớp, kiểu dữ liệu và kích thước.
2. Với bài học sinh, kiểm tra toàn bộ trường theo SCHEMA, mã và tự đánh giá.
3. Với phiếu điều phối, kiểm tra token đúng lớp trước khi chạm dữ liệu Sheet.
4. Xin Script Lock với khoảng chờ ngắn; nếu bận thì trả `BUSY`, để client thử lại.
5. Tìm ID bằng khớp cả ô. Nếu có, so toàn bộ dữ liệu trừ thời gian máy chủ nhận.
6. Cùng ID + cùng nội dung → ACK lại. Cùng ID + khác nội dung → `ID_CONFLICT`.
7. Chưa có ID → append một dòng với `valueInputOption: 'RAW'` rồi trả ACK.
8. Luôn nhả lock trong `finally`.

Đoạn ghi chính:

```javascript
Sheets.Spreadsheets.Values.append(
  { values: [row] },
  spreadsheetId,
  "'" + data.loai + "'!A1",
  { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' }
);
```

RAW giúp chuỗi học sinh nhập được lưu như chuỗi, kể cả khi bắt đầu bằng `=`. Code không sửa chính tả, trim, chấm điểm, tóm tắt hoặc gọi AI để xử lý bài. `trim()` chỉ xuất hiện trong bước kiểm tra độ dài, không thay giá trị đem lưu.

Tiền tố tuần 3 được ghép vào các cột theo quy ước hiện tại: `Phe A: ` / `Phe B: ` trong `nghi_1`, `Đổi ý: ` / `Giữ ý: ` trong `chia_se`; phần học sinh viết giữ nguyên sau tiền tố. Hai lựa chọn cũng được lưu riêng. Tuần 4 giữ riêng `kiem_soat`, `ngoai_kiem_soat` và ghép bản đọc chung vào `thu_lam`. Chi tiết mapping ở `DU_LIEU_VA_TAP_HUAN.md`.

Các mã lỗi có chủ đích: `INVALID_RECORD`, `ID_CONFLICT`, `BUSY`, `SETUP_REQUIRED`, `AUTH_REQUIRED`, `SERVER_ERROR`. Lỗi không xóa bài chờ trên máy. Không có API công khai đọc danh sách câu trả lời từ Sheet.

## 6. Sửa sản phẩm ở tuần 4

Nút “Dùng làm bản gốc” sao chép chuỗi sản phẩm từ một bản ghi cũ vào nháp tuần 4. Nó lưu ID cũ ở `sourceId`; khi nộp, chuyển thành `ban_goc_id`. Sau đó học sinh chỉnh bản sao. Bản ghi cũ trong lịch sử và Sheet không bị thay đổi. Bài tuần 4 có ID riêng.

Nếu đổi thiết bị, không có chức năng tra bài chỉ bằng mã vì mã không phải cơ chế xác thực. Dùng bản sao toàn bộ trên máy mới đáng tin hoặc nhập lại sản phẩm giấy; trường hợp nhập lại, `ban_goc_id` để trống.

## 7. Bản sao và kiểm thử

Bản sao toàn bộ gồm profiles, queue, theme và hồ sơ đang chọn. `Backup.restore()` từ chối khóa prototype nguy hiểm, hồ sơ sai, ID lặp trong hàng đợi và bản nháp sai cấu trúc. Các gói pending được giữ đúng ID/nội dung nhưng chuyển `paused: true` để người quản lý chủ động gửi lại. Không ghép tự động bản sao vào máy đã có dữ liệu vì dễ ghi đè bài.

| Tệp kiểm thử | Rủi ro được kiểm tra |
|---|---|
| `test.cjs` | Cấu hình tuần, kiểm tra đầu vào, raw text, mapping, máy chủ RAW/ID/PIN, lỗi bộ nhớ |
| `queue.cjs` | Offline, gói tồn tại lúc đang gửi, không gửi chồng, ACK sai, retry, hết phiên |
| `recovery.cjs` | Khôi phục giữ gói, không tự gửi, chống ID lặp, phát hiện tab khác |
| `ui.cjs` | DOM bốn tuần, bắt buộc chọn mức, trở lại/reload nháp, dòng trống, escape HTML, sửa bản 2 |

Google services trong test được mô phỏng. jsdom chạy DOM trong Node, không dựng giao diện điện thoại, không phải trình duyệt thật. Chưa có kiểm tra trên tài khoản Google thật hay đo 150 thiết bị đồng thời. Dùng hướng dẫn triển khai để hoàn tất hai bước này trước buổi thực nghiệm.

## 8. Những thay đổi thường gặp

| Muốn sửa | Sửa ở đâu |
|---|---|
| Thêm trường/lớp | `content.json → truong_lop`; build lại cả Index và Schema |
| Đổi lá thư/câu hỏi | `content.json → weeks`; tăng phien_ban nội dung |
| Đổi số từ tối thiểu | `fields[].min`; build lại |
| Đổi màu/chữ/khoảng cách | `src/style.css` |
| Đổi khoảng chờ khi lỗi mạng | `src/config.js` |
| Thêm loại dữ liệu | Đồng bộ Core.record, HEADERS và backend validator |
| Đổi PIN | Script Properties, không build lại app |
| Đổi Google Sheet nhận | Triển khai một dự án gắn Sheet mới và chạy setup_ |
| Giữ URL khi cập nhật | Apps Script → Manage deployments → Edit → New version |

Không đổi `storageKey` chỉ để tăng số phiên bản: sẽ làm app không nhìn thấy nháp cũ. Không xóa queue để bỏ lỗi. Không chỉnh ID khi retry. Không thêm khóa hoặc PIN vào JSON công khai.

Tài liệu nền tảng chính thức: [HTML Service communication](https://developers.google.com/apps-script/guides/html/communication), [Web Apps](https://developers.google.com/apps-script/guides/web), [Sheets values](https://developers.google.com/workspace/sheets/api/guides/values).


## Chính sách và quyền trong 2.2.0

`src/safety.js` là chính sách dùng chung: build nhúng vào HTML và `Schema.gs`. `sync()` thay gói hàng đợi bằng bản đã che trước khi lưu và gọi RPC; lịch sử cục bộ vẫn giữ nguyên bản gốc. Máy chủ kiểm tra cấu trúc, che nội dung và kiểm tra lại trước ghi Sheet. Ô có từ khóa thay toàn bộ bằng `[đã ẩn – an toàn]`; các mô tả giữ nguyên văn ở trên chỉ áp dụng cho ô không có từ khóa.

`loginTeacher()` và `getClassProgress()` sử dụng `TEACHER_PINS`/phiên `teacher:` độc lập với `COORDINATOR_PINS`/phiên `coord:`. API tiến độ chỉ trả `ma`, `weeks` của đúng trường/lớp; không có API đọc bài nghiên cứu. Xem SCOPE.md và hướng dẫn triển khai về quyền Sheet.
