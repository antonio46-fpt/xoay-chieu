# Checklist cấu hình deployment thử

Đây là các thao tác chủ tài khoản Google phải xác nhận, tách khỏi test mã. Chỉ dùng Sheet thử/dữ liệu giả. Chưa mục nào được coi là đạt trong phiên lập trình này.

- [ ] Sheet để Hạn chế; học sinh và GVCN chỉ cần tiến độ không có quyền mở Sheet nguồn.
- [ ] Nhóm nghiên cứu/GV hướng dẫn có quyền đúng phạm vi; ghi người có quyền sửa và người chỉ đọc bằng vai trò trong báo cáo, không đưa tài khoản cá nhân lên Git.
- [ ] Web app Execute as: tài khoản chủ dự án; Who has access đúng đối tượng được duyệt (Anyone nếu chính sách cho phép).
- [ ] `TEACHER_PINS`/`COORDINATOR_PINS` ở Script Properties, tách vai trò và đúng trường/lớp; không có PIN trong JSON/HTML/source/log.
- [ ] Ghi rõ ai có quyền chỉnh Apps Script/Script Properties; quyền editor là quyền nhạy cảm, không chỉ là quyền xem tiến độ.
- [ ] Google Sheets API bật; Code.gs, Schema.gs, Index.html cùng phiên bản; deploy New version và thử `/exec` bằng cửa sổ riêng.
- [ ] Thử PIN sai/đúng, thời gian chờ, hết cache, đăng nhập lại và đăng xuất; giữ phiếu/đồng hồ khi hết phiên.
- [ ] Tài liệu hóa trường hợp Google không cho phép Anyone; không tự đổi tài khoản/quyền thay chủ dự án.
- [ ] Có ảnh hoặc mô tả cấu hình đã che email, Sheet ID, project ID, PIN, token và URL quản trị.
- [ ] Chủ dự án chốt lịch chạy, người hỗ trợ, cách giữ mã và cách xử lý dữ liệu thử trước triển khai thật.

Đính kèm báo cáo đã loại thông tin nhận diện vào issue #2. Không ghi giá trị credential vào repo hoặc chat.
