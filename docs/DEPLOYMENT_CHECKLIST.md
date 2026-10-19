# Checklist cấu hình deployment thử

Đây là các thao tác chủ tài khoản Google phải xác nhận, tách khỏi test mã. Chỉ dùng Sheet thử/dữ liệu giả. Chưa mục nào được coi là đạt trong phiên lập trình này.

- [ ] Sheet để Hạn chế; học sinh và GVCN chỉ cần tiến độ không có quyền mở Sheet nguồn.
- [ ] Nhóm nghiên cứu/GV hướng dẫn có quyền đúng phạm vi; ghi người có quyền sửa và người chỉ đọc bằng vai trò trong báo cáo, không đưa tài khoản cá nhân lên Git.
- [ ] Web app Execute as: tài khoản chủ dự án; Who has access đúng đối tượng được duyệt (Anyone nếu chính sách cho phép).
- [ ] `TEACHER_PINS`/`COORDINATOR_PINS` ở Script Properties, tách vai trò và đúng trường/lớp; không có PIN trong JSON/HTML/source/log.
- [ ] Ghi rõ ai có quyền chỉnh Apps Script/Script Properties; quyền editor là quyền nhạy cảm, không chỉ là quyền xem tiến độ.
- [ ] Google Sheets API bật; Code.gs, Accounts.gs, Schema.gs, Index.html cùng phiên bản; deploy New version và thử `/exec` bằng cửa sổ riêng.
- [ ] Thử PIN sai/đúng, thời gian chờ, hết cache, đăng nhập lại và đăng xuất; giữ phiếu/đồng hồ khi hết phiên.
- [ ] Tài liệu hóa trường hợp Google không cho phép Anyone; không tự đổi tài khoản/quyền thay chủ dự án.
- [ ] Có ảnh hoặc mô tả cấu hình đã che email, Sheet ID, project ID, PIN, token và URL quản trị.
- [ ] Chủ dự án chốt lịch chạy, người hỗ trợ, cách giữ mã và cách xử lý dữ liệu thử trước triển khai thật.

Đính kèm báo cáo đã loại thông tin nhận diện vào issue #2. Không ghi giá trị credential vào repo hoặc chat.

- [ ] Tài khoản thử được cấp PIN riêng bằng `provisionStudentAccounts_`; không có PIN rõ trong Sheet. Giữ `STUDENT_PIN_SECRET` trong Script Properties; thử cấp lại không đổi PIN và đặt lại/khóa mã thu hồi phiên cũ.
- [ ] Học sinh mã khác/lớp khác/đổi vai trò không nộp hoặc xem tiến độ thay mã khác. Bài bị che trước ghi; `tien_do` đúng các tuần đã nhận kể cả sau lỗi cập nhật tiến độ và gửi lại cùng ID.
- [ ] Đăng nhập thiết bị mới nhận tiến độ; không nhầm tiến độ với nháp/bài gốc chỉ ở thiết bị cũ. Hết phiên khi viết vẫn giữ nháp/DOM; đăng xuất giữ hàng đợi và chỉ gửi khi đúng mã đăng nhập lại.
