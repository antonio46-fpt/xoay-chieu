## Yêu cầu
Chủ dự án cần Google Sheets tự hiển thị dữ liệu từng tài khoản và câu trả lời theo tuần; cập nhật định kỳ 60 giây. Nguồn hiện có đã lưu nháp an toàn và bài nộp nhưng nháp là JSON chia ô, khó theo dõi.

## Phạm vi
- App gửi nháp có thay đổi theo chu kỳ 60.000ms; nộp bài/đăng xuất/chuyển bước vẫn có checkpoint giữ dữ liệu. Giữ hàng đợi offline, mutation ID, revision và xác thực tài khoản.
- Tạo hai trang Sheets quan_ly_hoc_sinh và quan_ly_hoc_tap qua setup riêng; tự tính từ tài khoản A:D, nháp và bài đã nộp, không trả PIN/hash/token.
- Custom functions chỉ xử lý các mảng ô được truyền vào, không tự đọc Sheet/Properties bằng RPC. Theo dõi mã/trường/lớp, tuần, trạng thái, số tuần nộp/%, bước, số ô đã điền/%, từng câu trả lời và thời điểm máy chủ cập nhật. Không dùng % này làm điểm năng lực hoặc khẳng định 100% đồng bộ khi học sinh offline.
- Giữ dữ liệu gốc và quyền GVCN hiện tại; view chỉ dành người có quyền Sheet do chủ dự án quản lý. Không truy cập Sheet thật.

## Nghiệm thu
Fake timer kiểm tra chưa gửi trước 60 giây, gửi tại mốc 60 giây và lặp khi còn thay đổi, lấy nội dung mới nhất dù đang gõ, không gửi khi offline/đăng xuất. Fake Sheet kiểm tra hai tài khoản, mã trùng khác lớp, bí danh lớp cũ, nháp bị che an toàn, bài đã nộp, lượt mới/ID cũ gửi lại, bảng tổng quan đầy đủ tài khoản, nội dung không có credential. Setup không xóa dữ liệu và có thể chạy lại. Kiểm tra deployment Google/quota thật vẫn cần Sheet thử của chủ dự án.
