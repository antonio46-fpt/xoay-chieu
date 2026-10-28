## Yêu cầu
Chủ dự án cần Google Sheets tự hiển thị dữ liệu từng tài khoản và câu trả lời theo tuần; cập nhật định kỳ 60 giây. Nguồn hiện có đã lưu nháp an toàn và bài nộp nhưng nháp là JSON chia ô, khó theo dõi.

## Phạm vi
- App gửi nháp có thay đổi theo chu kỳ 60.000ms; nộp bài/đăng xuất/chuyển bước vẫn có checkpoint giữ dữ liệu. Giữ hàng đợi offline, mutation ID, revision và xác thực tài khoản.
- Tạo hai trang Sheets quan_ly_hoc_sinh và quan_ly_hoc_tap qua setup riêng; tự tính từ tài khoản A:D, nháp và bài đã nộp, không trả PIN/hash/token.
- Custom functions chỉ xử lý các mảng ô được truyền vào, không tự đọc Sheet/Properties bằng RPC. Theo dõi mã/trường/lớp, tuần, trạng thái, số tuần nộp/%, bước, số ô đã điền/%, từng câu trả lời và thời điểm máy chủ cập nhật. Không dùng % này làm điểm năng lực hoặc khẳng định 100% đồng bộ khi học sinh offline.
- Giữ dữ liệu gốc và quyền GVCN hiện tại; view chỉ dành người có quyền Sheet do chủ dự án quản lý. Không truy cập Sheet thật.

## Nghiệm thu
Fake timer kiểm tra chưa gửi trước 60 giây, gửi tại mốc 60 giây và lặp khi còn thay đổi, lấy nội dung mới nhất dù đang gõ, không gửi khi offline/đăng xuất. Fake Sheet kiểm tra hai tài khoản, mã trùng khác lớp, bí danh lớp cũ, nháp bị che an toàn, bài đã nộp, lượt mới/ID cũ gửi lại, bảng tổng quan đầy đủ tài khoản, nội dung không có credential. Setup không xóa dữ liệu và có thể chạy lại. Kiểm tra deployment Google/quota thật vẫn cần Sheet thử của chủ dự án.

## Kiểm toán mã 2.8.0

Toàn bộ tiêu chí nghiệm thu kiểm được bằng mã đều đạt:

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Chỉ gửi sau mốc 60 giây, lặp lại khi còn thay đổi | Đạt | `src/learning.js:35` `setInterval(syncMinute, 60000)` |
| Chu kỳ không bị dời lại mỗi lần gõ | Đạt | `src/app.js:553-565` debounce 250ms chỉ gọi `remember()`; `src/learning.js:35` chỉ tạo timer khi chưa có |
| Lấy nội dung mới nhất trong ô tại kỳ gửi | Đạt | `src/learning.js:98` gọi `collect()` đọc thẳng DOM trước khi `remember()` |
| Không gửi khi offline; đăng xuất dừng timer | Đạt | `src/learning.js:107` chặn `!navigator.onLine`; `src/app.js:304` gọi `reset()` |
| Không ghi nháp khi nội dung không đổi | Đạt | `src/learning.js:31` bỏ qua khi fingerprint trùng bản đã lưu và không có gói chờ |
| Custom function không tự đọc Sheet/Properties | Đạt | `apps-script/Management.gs:67-77` chỉ nhận ba mảng tham số, không RPC |
| Không trả PIN/salt/hash/token | Đạt | `apps-script/Management.gs:3-4` hai danh sách cột không có trường credential |
| Mã giống nhau khác lớp không ghép chung | Đạt | `apps-script/Management.gs:8` khoá gồm `truong`, lớp đã chuẩn hoá và `ma` |
| Tài khoản chưa bắt đầu vẫn có dòng | Đạt | `apps-script/Management.gs:41-58` duyệt theo danh sách tài khoản, không chỉ theo bài |
| Nội dung câu trả lời được che lại trước hiển thị | Đạt | `apps-script/Management.gs:28` cho bài nộp, `:36` cho nháp |
| `setupManagement_` không ghi đè trang có nội dung riêng, chạy lại được | Đạt | `apps-script/Management.gs:93` yêu cầu `A1` phải là công thức của chính hàm tương ứng |
| Phần trăm chỉ là ô đã điền / tuần đã nộp | Đạt | `apps-script/Management.gs:42,51` tính từ `submitted.size` và số ô có nội dung |

Còn mở: cài thật trên Google, xác nhận thời gian tính lại bung mảng và quota theo [kế hoạch tải](../LOAD_TEST_PLAN.md). Lưu ý một ràng buộc cố định: `STUDENT_MANAGEMENT_HEADERS` và `managementModel_` đều giả định đúng 4 tuần; nếu chương trình đổi số tuần thì phải sửa cả hai cùng lúc, vì `build.py` đang chặn mọi cấu hình khác 4 tuần.
