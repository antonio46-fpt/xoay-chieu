# Tiếp tục hành trình qua các tuần — 2.7.0

Học sinh đăng nhập bằng đúng mã, trường/lớp và mật khẩu. App tải tiến độ đã nộp, nháp đã đồng bộ và bài cũ của chính tài khoản; không tải bài học sinh khác. Có thể tiếp tục đúng bước đang viết vào tuần sau hoặc trên thiết bị khác khi nháp đã được Sheet xác nhận.

## Những gì được giữ

- `chu_trinh`: bài đã nộp, giữ nguyên ID và nội dung đã xử lý an toàn. Chỉ bài có trong bảng này mới được tính là hoàn thành tuần.
- `tien_do`: các tuần đã nhận. Nháp, thời gian hoạt động và số gợi ý không trở thành điểm nghiên cứu.
- `nhap_hoc_tap`: một trạng thái theo mã/trường/lớp/tuần, gồm ID nháp, bước, câu trả lời chưa hoàn tất, thời gian hoạt động, gợi ý và sản phẩm gốc nếu có. Nội dung có từ khóa an toàn được che cả trước RPC và tại máy chủ. JSON chia thành các ô tối đa 10.000 ký tự, ghi RAW.
- Trình duyệt: nháp và bài gốc trước khi che; hàng đợi gửi; bản sao khi giải quyết hai nháp khác nhau. Không gửi toàn bộ bản sao trình duyệt lên máy chủ, không chứa PIN/token trong bản sao.

Nháp trên Sheet là bản đã che an toàn. Nếu dùng thiết bị mới, phần đã che không thể tự phục hồi nguyên văn; bản gốc vẫn trên thiết bị đã viết hoặc bản sao riêng. Sổ hiển thị bài cũ đã nộp sau khi đăng nhập, dùng được làm sản phẩm gốc ở tuần 4.

## Cách lưu và tiếp tục

1. Đăng nhập khi có mạng, chờ “Đang khôi phục…” hoàn tất trước khi mở tuần. Hệ thống đối chiếu dữ liệu trên máy và Sheet trước khi tự gửi nháp để tránh một thiết bị cũ ghi đè dữ liệu mới.
2. Khi viết, nháp lưu trên máy trước, rồi tự đồng bộ sau một khoảng ngắn khi có mạng; chuyển bước, rời màn hình hoặc đăng xuất cũng thử lưu. Trạng thái “chờ đồng bộ” chưa phải đã lưu lên Sheet. Không dựng lại ô đang viết khi nhận phản hồi mạng.
3. Lần sau đăng nhập cùng tài khoản, nút Hành trình ghi **Viết tiếp tuần…** nếu có nháp; nếu tuần trước đã nộp thành công thì gợi ý tuần tiếp theo. Mỗi tuần có nháp riêng, không bắt làm lại tuần cũ.
4. Mất mạng hoặc hết phiên: nháp vẫn trên máy; khi mạng trở lại/xác thực lại sẽ tiếp tục gửi. Nếu đóng trang trước khi nháp được xác nhận lên Sheet thì thiết bị khác chưa có phần mới đó. Giữ thiết bị/bản sao khi còn trạng thái chờ.
5. Hai thiết bị cùng sửa một tuần: máy chủ kiểm tra revision. Bản cũ bị từ chối ghi đè và app giữ cả hai. Người học chọn dùng bản trên Sheet hoặc giữ bản trên máy thành lượt mới. Các bản trước khi chọn được giữ trong bản sao JSON của thiết bị; bài đã nộp không bị thay đổi.
6. Cùng một lần gửi nháp được nhận lại sau timeout không làm tăng revision hay tạo thêm dòng. Nháp có ID đã nộp không xuất hiện lại như bài chưa hoàn thành.

Không dùng chung phiên của một mã cho nhiều học sinh. Mã giống nhau ở hai lớp là hai tài khoản; bài, nháp và phiên được cách ly theo bộ ba mã/trường/lớp.

## Cập nhật danh sách lớp

Theo xác nhận của chủ dự án, danh sách đang mở gồm 10A3 (10 Tin), 11E1 (11 Văn) ở THPT Chuyên Chu Văn An và LB-11A (11A Lộc Bình) ở Trường PTDTNT THCS & THPT Lộc Bình. Giữ Chi Lăng / 12A2 trong nhóm lớp cũ để đăng nhập, xem bài và tiếp tục dữ liệu đã có; không đổi danh tính của học sinh Chi Lăng thành Lộc Bình.

NT-10A6 và NT-10A7 còn chờ bốc thăm, chưa kích hoạt cả hai. Công cụ nhập workbook chỉ xuất các lớp đang mở; không tự đăng ký lớp ứng viên. Danh sách CSV riêng được nhập qua `nhap_tai_khoan` → `importStudentRoster_`; chỉ thêm mã mới, không xóa mã vắng trong workbook và không đổi mật khẩu cũ. `provisionStudentAccounts_` chỉ cấp mật khẩu cho mã mới chưa được cấp. Nhận diện tài khoản dựa trên danh sách được đăng ký + mật khẩu, không chặn một mã chỉ vì giống ví dụ trong tài liệu cũ.

## Nâng cấp Apps Script

1. Thử trên Sheet riêng với dữ liệu giả trước; giữ bản sao Sheet và Script Properties do chủ dự án quản lý.
2. Cập nhật **Code.gs, Accounts.gs, Learning.gs, Schema.gs, Index.html** từ cùng phiên bản. `Learning.gs` là tệp Script mới; dùng đúng Index trong thư mục `apps-script`, không dùng HTML demo trong `dist`.
3. Chạy `setup_`. Hàm thêm `nhap_hoc_tap` khi chưa có, kiểm tra header và dừng khi không khớp; không xóa bảng bài/tài khoản/tiến độ cũ. Không chạy hàm xóa hoặc đổi ID để sửa lỗi nâng cấp.
4. Nhập CSV danh sách riêng rồi chạy `importStudentRoster_`, sau đó `provisionStudentAccounts_` để nhận file mật khẩu **chỉ của các mã mới**. Giữ nguyên `STUDENT_PIN_SECRET`, `TEACHER_PINS`, `COORDINATOR_PINS`; bổ sung PIN giáo viên/điều phối riêng cho lớp mới nếu cần, không dùng chung PIN học sinh.
5. Deploy → Manage deployments → Edit → **New version**. Kiểm tra trên link `/exec` bằng hai trình duyệt thử: viết nửa tuần, đăng xuất/vào lại, đổi thiết bị, hoàn tất tuần, vào tuần tiếp theo, sửa sản phẩm tuần 4, mất mạng và hai thiết bị cùng sửa.

API `getStudentLearning`/`saveStudentDraft` chỉ dành cho phiên học sinh của chính tài khoản. Giáo viên vẫn chỉ xem mã đã nộp + tuần trong lớp được cấp; không đọc nháp hoặc bài riêng qua phiên giáo viên. Bảng nháp không được tự động gộp vào dữ liệu nghiên cứu bài đã nộp. Chủ dự án quản lý quyền Google với Sheet nguồn.

Unit/DOM/Chromium dùng dữ liệu giả; không phải bằng chứng Google deployment, quota hoặc tải cả đợt đã đạt. Các phép gọi mới cần nghiệm thu trong kế hoạch tải #4. Môi trường phát triển không truy cập/ghi vào Sheet thật.
