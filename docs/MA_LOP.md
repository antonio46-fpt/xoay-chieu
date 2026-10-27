# Mã lớp thống nhất — 2.7.1

Dữ liệu mới gửi và ghi Sheet dùng mã ngắn. Phần chú thích chỉ là nhãn hiển thị:

| Giá trị lop | Nhãn giao diện / bí danh cũ được nhận |
|---|---|
| 10A3 | 10A3 (10 Tin) |
| 11E1 | 11E1 (11 Văn) |
| LB-11A | LB-11A (11A Lộc Bình) |
| 12A2 | 12A2, nhóm Chi Lăng cũ |

Bản 2.7 trước đây FE và Schema đều dùng nhãn nên không tự lệch khi cùng phiên bản. Tuy nhiên, dữ liệu đó không khớp hệ thống ngoài dùng mã ngắn. Bản 2.7.1 chuẩn hóa đăng nhập, bài nộp, nháp, tiến độ, CSV và báo cáo; chỉ nhận các bí danh đã khai báo chính xác, không cắt hậu tố tùy ý hoặc bỏ kiểm tra trường.

Không cần đổi mật khẩu, xóa nháp hoặc nộp lại bài. Máy chủ ghép cả dữ liệu lớp cũ/mới về cùng mã, giữ nguyên ID chống trùng; gửi lại một bài có lớp dạng cũ được ACK nếu nội dung còn lại giống nhau. Mật khẩu cũ được kiểm tra với HMAC gắn tên lớp cũ hoặc mã chuẩn. Tài khoản trùng sau chuẩn hóa sẽ báo cấu hình lỗi thay vì ghép nhầm hai tài khoản. Bản trên trình duyệt giữ khóa lưu cũ để bài/nháp không biến mất; khóa nội bộ này không phải giá trị lop gửi lên Sheet.

TEACHER_PINS và COORDINATOR_PINS ưu tiên dùng khóa Tên trường|mã lớp. Khóa tên lớp cũ vẫn được nhận nếu chưa chuyển đổi. Nếu cả hai khóa có PIN khác nhau, máy chủ yêu cầu chủ dự án sửa cấu hình thay vì tự chọn.

Cập nhật đồng bộ Code.gs, Accounts.gs, Learning.gs, Schema.gs, Index.html từ cùng bộ 2.7.1, rồi Deploy New version. ClassIds được build sẵn trong Schema.gs và HTML, không cần thêm file Script riêng. Không dán đè hoặc đổi hàng loạt các cột trên Sheet thật để nâng cấp. Các bảng cũ được đọc tương thích; bản ghi mới dùng mã chuẩn. Nếu xuất dữ liệu cũ sang hệ thống nghiên cứu bên ngoài, chuẩn hóa cột lớp trong bản xuất riêng theo bảng trên, không sửa ID hoặc bản gốc.

Đã kiểm thử bằng dữ liệu giả: mật khẩu theo HMAC cũ, ô lớp đã đổi sang mã, phiên/PIN giáo viên, tiến độ và Sổ/nháp cũ, gửi lại cùng ID, dữ liệu mới chỉ ghi mã, giá trị select khác nhãn hiển thị, CSV không có chú thích. Chưa kiểm chứng triển khai Google hoặc truy cập Sheet thật. Tham chiếu issue #11.
