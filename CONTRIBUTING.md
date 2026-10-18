# Quy ước đóng góp

## Phạm vi

FE gồm giao diện trong `src/app.js`, `src/style.css`, `src/shell.html`, cấu hình nội dung và các kiểm thử trình duyệt/DOM. Thay đổi logic BE trong `apps-script/Code.gs`, chính sách dùng chung hoặc schema phải có issue mô tả trước. `apps-script/Index.html` là HTML frontend được build; cập nhật tệp này không có nghĩa đã sửa logic máy chủ.

Không trộn thay đổi FE và triển khai BE trong một commit. Các thay đổi BE đã có ở commit trước không được tự ý xóa hoặc coi là đã xác minh với Google chỉ vì test mock đạt.

## Commit

Dùng Conventional Commits: `<type>(<scope>): <mô tả ngắn>`.

- Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
- Scope: `fe`, `be`, `build`, `repo`.
- Ví dụ: `fix(fe): distinguish pending submissions from confirmed records`.
- Body nêu lý do, hành vi thay đổi và cách kiểm tra khi cần.
- Chỉ ghi `Closes #123` khi đã có issue thật và commit giải quyết đủ tiêu chí. Tệp trong `docs/issues/` là bản nháp, không phải issue đã đăng.

## Issue BE

Tiêu đề: `<type>(be): <kết quả cần đạt>`. Dùng mẫu Backend task, có bối cảnh, hiện trạng, phạm vi, API/payload, tiêu chí nghiệm thu và cách kiểm thử. Dùng số issue thật khi liên kết phụ thuộc. Không tự gán nhãn chưa tồn tại hoặc người phụ trách chưa được thống nhất.

Mọi kiểm thử triển khai dùng Sheet thử và dữ liệu giả. Không ghi PIN/token/Sheet ID thật vào issue, source, log hay ảnh. GVCN chỉ được xem mã + tuần của đúng lớp; nghiên cứu/GV hướng dẫn xem dữ liệu qua quyền Google do chủ dự án quản lý. Không truy cập Sheet thật sau khi chạy chính thức.

## Kiểm tra FE

Chạy `python build.py`, `npm test`, sau đó `python package_source.py`. Tệp đầu ra phải được cập nhật cùng source. Kiểm tra 360px ở sáng/tối, bàn phím và giảm chuyển động. Bài lưu cục bộ/chờ gửi/đã được xác nhận phải hiển thị khác nhau. Không xóa nháp hay đổi ID chỉ để làm test đạt.

## Theo dõi issue BE

Xem [danh sách issue BE](docs/issues/README.md) để mở các issue đã đăng và nội dung tham chiếu. Chỉ đánh dấu đã đăng sau khi nhận được số và URL issue từ GitHub. Nếu API bị chặn, giữ nguyên bản nháp và báo đúng blocker.
