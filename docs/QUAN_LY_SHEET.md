# Quản lý học sinh và đồng bộ 1 phút — 2.8.0

Google Sheet đã cấu hình trong SPREADSHEET_ID tiếp tục là nơi lưu dữ liệu trung tâm. Bản này thêm hai trang quản lý đọc trực tiếp dữ liệu nguồn, không tạo một Sheet công khai hoặc sao chép mật khẩu sang báo cáo.

## Hai trang quản lý

**quan_ly_hoc_sinh**: một dòng mỗi tài khoản, gồm mã học sinh, trường, mã lớp, trạng thái tài khoản, các tuần đã nộp, số tuần nộp/4, phần trăm hoàn thành chương trình, các tuần đang làm, lần cập nhật gần nhất và số bài đã nộp. Tài khoản chưa bắt đầu cũng có dòng nếu đã đăng ký trong tai_khoan. Mã giống nhau khác lớp không bị ghép chung.

**quan_ly_hoc_tap**: một dòng mỗi tài khoản/tuần. Hiện trạng thái chưa bắt đầu/đang làm/đã nộp/đang làm lượt mới; bước hiện tại/tổng bước; số ô đã điền/tổng ô; phần trăm ô đã điền; tiến độ chương trình; ID và thời điểm cập nhật; từng câu trả lời Thử, Nghĩ 1–3, Nối, sản phẩm, chia sẻ, tự đánh giá và các trường riêng của tuần 3–4.

Bảng chi tiết thể hiện trạng thái mới nhất phù hợp với thời điểm máy chủ nhận. Bài đã nộp không biến thành nháp vì một lần gửi lại cũ. Lượt mới đang viết vẫn hiển thị riêng trạng thái đang làm lượt mới, còn tuần đó vẫn được tính là đã nộp. Bài/lượt cũ giữ nguyên trong chu_trinh; hai bảng quản lý không phải nơi sửa bài gốc.

“Phần trăm ô đã điền” chỉ đếm ô có nội dung, không chứng minh nội dung đã đạt yêu cầu nộp. “Tiến độ chương trình” chỉ tính các tuần đã được máy chủ nhận bài, không tính nháp và không phải điểm năng lực hoặc điểm nghiên cứu. Không có chỉ số khẳng định 100% đồng bộ của một học sinh đang offline: máy chủ chưa biết phần chưa gửi của thiết bị đó.

## Chu kỳ đồng bộ

- Nháp lưu trên thiết bị trước. Khi trang đang mở, đã đăng nhập và tải tiến trình thành công, app kiểm tra nội dung mỗi **60.000ms**; chỉ gửi khi có thay đổi. Chu kỳ không bị dời lại mỗi lần gõ, nên người đang viết liên tục vẫn được lưu bản mới tại kỳ đồng bộ.
- Tại kỳ gửi, app lấy nội dung hiện tại trong ô viết, kể cả phần chưa kịp debounce. Nháp và gói chờ được giữ trên máy trước khi gọi mạng. Lần xác nhận gần nhất hiện trên màn hình.
- Nộp bài, chuyển bước, rời màn hình hoặc đăng xuất vẫn có checkpoint lưu ngay; không đợi hết phút. Đây là các lần lưu bổ sung để tránh mất phần đang làm, không phải một giới hạn cấm gửi trong vòng một phút.
- Mất mạng/Google trả lỗi/hết phiên: giữ nháp trên máy; gửi lại khi mạng và xác thực cho phép. Mutation ID/revision chống trùng và chống ghi đè giữa thiết bị. Đăng xuất dừng timer của tài khoản cũ.
- Đồng hồ trình duyệt có thể chạy chậm khi thiết bị ngủ hoặc tab bị hạn chế; không thể cam kết lưu khi trang đã đóng hoặc chưa có mạng. Chỉ đổi thiết bị sau trạng thái đã đồng bộ nếu muốn có toàn bộ phần mới trên máy khác.

Hai trang quản lý dùng custom functions XOAY_STUDENTS và XOAY_MANAGEMENT, nhận **trực tiếp ba vùng nguồn** tai_khoan!A2:D, nhap_hoc_tap!A2:X, chu_trinh!A2:Z. Khi nháp/bài thay đổi, Google Sheets tính lại báo cáo theo các vùng phụ thuộc; không cần trigger quét/ghi thêm từng học sinh mỗi phút. Google có thể cần thời gian tính lại sau khi nhận dữ liệu. Việc tính lại không truy cập API bên ngoài và không sửa bảng nguồn.

Mốc cập nhật trên Sheet là chuỗi ISO UTC (đuôi Z); trạng thái trên trình duyệt hiển thị giờ thiết bị. PIN/salt/hash/token không được đưa vào báo cáo hoặc HTML. Nội dung từ nháp/bài được kiểm tra an toàn lại trước hiển thị. Bản gốc trước khi che vẫn chỉ trên thiết bị đã viết/bản sao riêng. Các công thức không phân tích AI hay tự chấm câu trả lời.

## Bật trên dự án Apps Script

1. Thử trên Sheet riêng với tài khoản và dữ liệu giả trước. Giữ cấu hình, mật khẩu và bảng dữ liệu hiện có do chủ dự án quản lý.
2. Cập nhật đủ **Code.gs, Accounts.gs, Learning.gs, Management.gs, Schema.gs, Index.html** từ cùng bộ 2.8.0. Management.gs là tệp Script mới; manifest không thêm quyền mới.
3. Chạy setup_ để tạo các bảng còn thiếu và hai trang quản lý. Nếu đã có các bảng nguồn, có thể chạy riêng setupManagement_. Hàm chỉ đặt công thức trong hai trang do ứng dụng quản lý; gặp trang cùng tên có nội dung riêng thì dừng, không xóa/ghi đè dữ liệu đó.
4. Trang chi tiết có 27 cột; hàm tự thêm cột/hàng khi cần, cố định tiêu đề và tạo bộ lọc. Đừng gõ vào vùng kết quả công thức. Nếu báo #REF vì có ô cản vùng bung mảng, giữ bản sao nội dung riêng rồi xử lý trên đúng trang báo cáo, không xóa dữ liệu nguồn.
5. Công thức được chọn dấu phân cách theo locale Sheet (vi_VN dùng dấu chấm phẩy; en_US dùng dấu phẩy). Nếu tài khoản có locale đặc biệt và Sheets báo lỗi phân tích, kiểm tra dấu phân cách trong A1; dùng đủ ba vùng nguồn ở trên. Nếu báo không tìm thấy custom function, kiểm tra đã lưu Management.gs trong đúng dự án **gắn với Sheet**.
6. Deploy → Manage deployments → Edit → **New version**. Học sinh dùng link /exec; HTML/GitHub Pages xem thử không ghi vào Sheet.
7. Mở Sheet bằng tài khoản được cấp quyền quản lý: lọc theo lớp, mã hoặc tuần; gõ bài ở trình duyệt thử và chờ một chu kỳ 60 giây để kiểm tra câu trả lời và thời điểm cập nhật. Thử nộp tuần 1 rồi vào tuần 2; dữ liệu và tiến độ tuần 1 vẫn còn.

Giữ Sheet ở chế độ Hạn chế. Cấp quyền mở Sheet cho chủ dự án/nhóm nghiên cứu/GV hướng dẫn đúng phạm vi; một tab báo cáo trong cùng tệp không phải cơ chế che các tab nguồn. GVCN chỉ được xem tiến độ lớp vẫn dùng API/màn hình Tiến độ lớp hiện có; không vì có bảng quản lý mà được đọc toàn bộ câu trả lời hoặc nháp. Không cung cấp link Sheet nguồn cho học sinh.

## Kiểm chứng

Test giả lập đã kiểm tra mốc 59.999/60.000ms, nội dung mới nhất khi đang gõ, chu kỳ sau, không ghi lại dữ liệu không đổi, offline/reconnect, dừng timer khi đăng xuất; bảng quản lý kiểm tra hai tài khoản, mã trùng khác lớp, mã lớp cũ, nội dung bị che, bài/lượt mới, công thức và setup không xóa dữ liệu.

Chưa chạy trên Sheet thật; cần nghiệm thu custom functions/locale/quyền Google, quota ghi và thời gian tính lại với nhóm nhỏ rồi quy mô dự kiến theo kế hoạch tải #4. Đặt timer 60 giây không tự chứng minh cả đợt học sinh đều được phục vụ đúng mỗi phút khi Google giới hạn tài nguyên. Không có credential hoặc danh sách thật trong mã nguồn.
