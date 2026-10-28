# Checklist cấu hình deployment thử

Đây là các thao tác chủ tài khoản Google phải xác nhận, tách khỏi test mã. Chỉ dùng Sheet thử/dữ liệu giả. Chưa mục nào được coi là đạt trong phiên lập trình này.

- [ ] Sheet để Hạn chế; học sinh và GVCN chỉ cần tiến độ không có quyền mở Sheet nguồn.
- [ ] Nhóm nghiên cứu/GV hướng dẫn có quyền đúng phạm vi; ghi người có quyền sửa và người chỉ đọc bằng vai trò trong báo cáo, không đưa tài khoản cá nhân lên Git.
- [ ] Web app Execute as: tài khoản chủ dự án; Who has access đúng đối tượng được duyệt (Anyone nếu chính sách cho phép).
- [ ] `TEACHER_PINS`/`COORDINATOR_PINS` ở Script Properties, tách vai trò và đúng trường/lớp; không có PIN trong JSON/HTML/source/log.
- [ ] Ghi rõ ai có quyền chỉnh Apps Script/Script Properties; quyền editor là quyền nhạy cảm, không chỉ là quyền xem tiến độ.
- [ ] Google Sheets API bật; Code.gs, Accounts.gs, Learning.gs, Schema.gs, Index.html cùng phiên bản; deploy New version và thử `/exec` bằng cửa sổ riêng.
- [ ] Thử PIN sai/đúng, thời gian chờ, hết cache, đăng nhập lại và đăng xuất; giữ phiếu/đồng hồ khi hết phiên.
- [ ] Tài liệu hóa trường hợp Google không cho phép Anyone; không tự đổi tài khoản/quyền thay chủ dự án.
- [ ] Có ảnh hoặc mô tả cấu hình đã che email, Sheet ID, project ID, PIN, token và URL quản trị.
- [ ] Chủ dự án chốt lịch chạy, người hỗ trợ, cách giữ mã và cách xử lý dữ liệu thử trước triển khai thật.

Đính kèm báo cáo đã loại thông tin nhận diện vào issue #2. Không ghi giá trị credential vào repo hoặc chat.

- [ ] Tài khoản thử được cấp PIN riêng bằng `provisionStudentAccounts_`; không có PIN rõ trong Sheet. Giữ `STUDENT_PIN_SECRET` trong Script Properties; thử cấp lại không đổi PIN và đặt lại/khóa mã thu hồi phiên cũ.
- [ ] Học sinh mã khác/lớp khác/đổi vai trò không nộp hoặc xem tiến độ thay mã khác. Bài bị che trước ghi; `tien_do` đúng các tuần đã nhận kể cả sau lỗi cập nhật tiến độ và gửi lại cùng ID.
- [ ] Đăng nhập thiết bị mới nhận tiến độ; không nhầm tiến độ với nháp/bài gốc chỉ ở thiết bị cũ. Hết phiên khi viết vẫn giữ nháp/DOM; đăng xuất giữ hàng đợi và chỉ gửi khi đúng mã đăng nhập lại.

- [ ] Ba lớp đúng workbook triển khai; nhập CSV qua `nhap_tai_khoan`, chạy lại không nhân đôi hoặc đổi mật khẩu cũ. File CSV tài khoản/mật khẩu chỉ do người phụ trách giữ, không lưu trong Sheet nguồn hoặc Git.
- [ ] Dùng đúng `apps-script/Index.html` có `authRequired: true`; khi thiếu bridge Google không có đường vào demo. Thử mật khẩu chữ/số, mã trùng khác lớp, Enter, hiện/ẩn mật khẩu và chặn mở tuần khi hết phiên.

- [ ] Chạy setup_ thêm nhap_hoc_tap; kiểm tra vào lại đúng bước, đổi thiết bị, tuần sau còn bài tuần trước, tuần 4 dùng được sản phẩm cũ. Chỉ học sinh có token đúng tài khoản đọc được nháp/Sổ; token giáo viên/điều phối bị từ chối.
- [ ] Gửi nháp lặp không tạo thêm dòng; hai thiết bị sửa có xung đột rõ ràng và giữ bản sao; đóng khi offline không được báo đã đồng bộ. Nháp không xuất hiện trong số tuần hoàn thành hay dữ liệu bài nộp nghiên cứu.
- [ ] Thêm tài khoản theo CSV mới không đổi mật khẩu cũ. Giữ nhóm Chi Lăng cũ; chưa bật NT-10A6/NT-10A7 trước khi có quyết định bốc thăm.

- [ ] Cập nhật Management.gs, chạy setupManagement_ và kiểm tra hai bảng quan_ly_hoc_sinh/quan_ly_hoc_tap: mã/trường/lớp đúng, câu trả lời an toàn hiện theo tuần; không có PIN/hash/token.
- [ ] Gõ liên tục qua mốc 60 giây; xác nhận nội dung mới nhất, offline vẫn giữ trên máy, không có ghi nháp khi không đổi, đăng xuất dừng timer.
- [ ] Kiểm tra công thức ba vùng nguồn, locale, vùng bung mảng và quyền Sheet; thử quota/thời gian tính lại theo kế hoạch tải #4 trước dùng cả đợt.
