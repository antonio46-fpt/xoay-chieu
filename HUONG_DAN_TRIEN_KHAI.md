# Triển khai Xoay Chiều 2.1.0 vào Google Sheets

Bộ `apps-script/` đã có bản build sẵn; không cần cài Python hoặc Node chỉ để dán và triển khai. Bản Sites/HTML tĩnh dành cho xem thử, không phải link thu dữ liệu Google Sheets. Không sử dụng dữ liệu thật trong bước thử.

## A. Tạo nơi nhận dữ liệu

1. Tạo một Google Sheet MỚI trong tài khoản người quản lý nghiên cứu. Không dán đè vào Sheet cũ đang thu dữ liệu.
2. Trong Share / Chia sẻ, để Restricted / Hạn chế. Chỉ mời đúng tài khoản nhóm nghiên cứu cần xem/chỉnh sửa. Học sinh không cần quyền truy cập Sheet.
3. Mở Tiện ích mở rộng → Apps Script.
4. Thay nội dung `Code.gs` bằng `apps-script/Code.gs` của bộ này.
5. Tạo thêm tệp Script tên `Schema` rồi dán `apps-script/Schema.gs`.
6. Tạo thêm tệp HTML tên **Index** rồi dán toàn bộ `apps-script/Index.html` (tên phải đúng chữ hoa).
7. Bên trái, Services / Dịch vụ → dấu + → Google Sheets API → Add. Máy chủ dùng dịch vụ này để ghi RAW, giữ nguyên văn bản, không biến câu trả lời thành công thức. Nếu dự án Google Cloud riêng yêu cầu bật API, bật Google Sheets API cho chính dự án đó.

   Tệp `apps-script/appsscript.json` là manifest mẫu tương ứng. Với dự án MỚI, có thể bật “Show appsscript.json manifest file in editor” trong Project Settings rồi dán tệp này để đặt V8, múi giờ GMT+7 và Sheets v4. Không dán đè manifest của dự án đang có dịch vụ khác. Nếu đã thêm Sheets API bằng giao diện, giữ manifest Google tự tạo cũng được.

8. Lưu. Ở danh sách hàm trên thanh công cụ, chọn **setup_**, bấm Run và cấp quyền cho dự án do bạn quản lý. Hàm có dấu gạch dưới cuối để trình duyệt không gọi được qua google.script.run.
9. Kiểm tra Sheet có 3 trang: `chu_trinh`, `phieu_buoi`, `doi_y`. `SPREADSHEET_ID` tự lưu trong Script Properties. Nếu báo cột không khớp, dùng Sheet mới; đừng xóa dữ liệu cũ để chữa lỗi.

## B. PIN của điều phối viên

1. Apps Script → Project Settings → Script Properties → Add script property.
2. Tên thuộc tính: `COORDINATOR_PINS`.
3. Giá trị là đối tượng JSON với khóa `Tên trường|Tên lớp`, giá trị là chuỗi PIN 6–12 chữ số. Mẫu cấu trúc (THAY các chữ placeholder bằng PIN số riêng trước khi lưu):

```json
{
 "THPT Chuyên Chu Văn An|10 Trung": "PIN_RIENG_1",
 "THPT Chuyên Chu Văn An|10D2": "PIN_RIENG_2",
 "THPT Dân tộc nội trú tỉnh|10A6": "PIN_RIENG_3",
 "THPT Dân tộc nội trú tỉnh|10A7": "PIN_RIENG_4"
}
```

Không để PIN trong content.json, không gửi vào nhóm học sinh chung. Lớp không được cấu hình PIN sẽ không mở được chế độ điều phối trên bản thật. Phiên tối đa 6 giờ, có thể hết sớm do cache Google; nhập lại PIN sẽ gửi tiếp phiếu chờ. PIN/session không lưu trong bản sao hoặc localStorage.

## C. Xuất bản Web App

1. Deploy → New deployment → chọn Web app.
2. Execute as: Me / tài khoản chủ dự án.
3. Who has access: Anyone nếu chính sách tài khoản cho phép học sinh vào không đăng nhập Google. Nếu tùy chọn không có, hỏi quản trị tài khoản hoặc dùng tài khoản được phép triển khai; không coi đó là lỗi code.
4. Deploy, sao chép URL kết thúc `/exec`. Đó là link dùng cho học sinh. Không đưa link chỉnh sửa Sheet hoặc link `/dev`.
5. Mở URL `/exec` trong trình duyệt riêng để thử quyền truy cập. Bản thật hiển thị trạng thái gửi, thay vì “Bản xem thử”.
6. Dùng mã thử hợp lệ không thuộc học sinh thực nghiệm, hoàn thành một bài, đợi “Máy chủ đã xác nhận”. Mở Sheet kiểm tra nội dung, mức và thời gian.
7. Thử từ một tài khoản/trình duyệt không được cấp quyền Sheet: app vẫn nộp được nhưng không mở được Sheet. App không có chức năng tải bài người khác từ máy chủ.

Tài liệu Google: https://developers.google.com/apps-script/guides/html/communication ; https://developers.google.com/apps-script/guides/web

## D. Kiểm tra trước buổi đầu

- Chốt danh sách lớp thực nghiệm, kiểm tra mã khảo sát không trùng trong cùng trường/lớp.
- Duyệt cả 4 thư, nhiệm vụ, gợi ý. Mẫu có AI hỗ trợ phải được ghi nhận đúng.
- Trên màn hình 360px và máy thật: đọc thư, các nút không tràn, sáng/tối dễ đọc, bàn phím không che thao tác.
- Thử bài tuần 1, 2, 3, 4; phần Nối khác phần sản phẩm; tự đánh giá không chọn thì không cho nộp.
- Gõ bài, quay lại, ẩn rồi mở lại trang: nháp còn. Kiểm tra khoảng trắng và xuống dòng, kể cả dòng trống đầu tiên, giữ nguyên trong Sheet. Không làm bài đồng thời bằng nhiều tab.
- Sau khi đã mở app, tắt mạng và nộp: hiển thị chờ; bật mạng: đúng một dòng sau xác nhận.
- Đóng trang khi chờ gửi rồi mở lại có mạng: bài vẫn gửi; bấm gửi lại không tăng số dòng cho cùng ID.
- Chủ động “Làm lượt mới”: tạo ID và dòng mới; không ghi đè lần trước.
- Xuất bản sao toàn bộ khi có bài chờ; khôi phục trên trình duyệt trống: gói còn nguyên ID và ở trạng thái tạm dừng. Bấm Thử gửi lại, kiểm tra chỉ một dòng cho ID đó.
- Thử PIN sai, PIN đúng; phiếu nhóm chỉ dành tuần 3; số tham gia không lớn hơn sĩ số.
- Trên thiết bị có bài tuần 1–3: tuần 4 chọn sản phẩm, sửa bản 2; kiểm tra bài gốc không đổi, `ban_goc_id` được lưu.
- Nhập văn bản bắt đầu `=`, dấu nháy và tiếng Việt: Sheet giữ dạng văn bản, không chạy công thức.
- Chạy thử một nhóm nhỏ, rồi kiểm tra tải nộp gần đồng thời với dữ liệu thử trong Sheet thử riêng. Chưa có xác nhận 70 người dùng đồng thời trong bản bàn giao.

## E. Khi cập nhật

1. Sửa nội dung trong `src/content.json` trên máy. Nên tăng `phien_ban` khi thay nội dung chính thức.
2. Chạy `python build.py`. Lần đầu cài thư viện kiểm thử bằng `npm ci --ignore-scripts`, sau đó chạy `npm test`. Chạy `python package_source.py` nếu cần tạo lại ZIP và trang đọc mã.
3. Dán lại `Index.html` và `Schema.gs`; nếu sửa máy chủ thì cập nhật `Code.gs`.
4. Deploy → Manage deployments → Edit → New version → Deploy để giữ URL cũ. Chỉ Save code chưa cập nhật bản `/exec`.
5. Không đổi cấu trúc câu hỏi/phiên bản giữa lúc học sinh đang làm. Thử trước trên bản sao.

## F. Sao lưu và xử lý lỗi

- Xuất bản sao JSON trong Cài đặt, hoặc từng mã trong Sổ của mình. JSON có câu trả lời, cần giữ riêng.
- Chỉ bản sao **toàn bộ** mới được nhập lại bằng Cài đặt; tệp từng mã dùng để đọc/lưu riêng. Chỉ nhập trên trình duyệt chưa có dữ liệu; bài chờ được giữ nhưng chưa tự gửi đến khi bạn bấm Thử gửi lại.
- Khi mất mạng, không xóa dữ liệu trình duyệt hay dùng chế độ ẩn danh. Không mở nhiều tab cùng một app trên một thiết bị khi đang làm.
- Nếu bài ở trạng thái chờ: xem lỗi ở Cài đặt → Thử gửi lại. Kiểm tra đã bật Sheets API, chạy setup_, đúng phiên bản triển khai và đúng Sheet.
- Dữ liệu Sheet là bản trung tâm để nghiên cứu; localStorage chỉ hỗ trợ thao tác và sản phẩm trên cùng máy, không đồng bộ lịch sử sang máy khác.
- Không xóa hàng đợi để làm mất thông báo lỗi. Với phiếu điều phối hết phiên, vào Điều phối nhập lại PIN.
- Lỗi ID xung đột hoặc dữ liệu không hợp lệ làm gói tạm dừng. Xuất bản sao, đối chiếu Sheet và phiên bản nội dung trước khi gửi lại; không đổi ID để né lỗi vì có thể tạo dữ liệu lặp.
- Sau thử nghiệm 4 tuần, giữ web chạy đến thời điểm thi theo lịch khoảng 8 tuần. Bốn tuần hoạt động không đổi thành tám tuần nội dung.
