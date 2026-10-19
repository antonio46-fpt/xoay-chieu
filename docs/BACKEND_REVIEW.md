# Đối chiếu góp ý Backend và trạng thái thực hiện

Nguồn: tài liệu Word “Góp ý chốt Backend – Xoay Chiều 2.2.0”, tham chiếu commit 2999a66. Tài liệu là nguồn góp ý; các quyết định nghiên cứu/chấp thuận triển khai không được suy ra chỉ từ việc sửa mã.

Thứ tự: #3 → #2 → #4 → #1. Thử thiết bị làm song song; xử lý gói 2.1 tách khỏi kiểm thử mã. Chưa có người phụ trách/hạn được nhóm nghiên cứu chốt.

| Góp ý | Đã thực hiện | Còn phải kiểm chứng/quyết định |
|---|---|---|
| Hai đường đọc/ghi | Submit đọc/append cùng Sheets API, giữ khóa | Kiểm tra visibility của request kế tiếp trên Sheet thử |
| String() so sánh | UNFORMATTED_VALUE, so sánh số/boolean đúng kiểu; ô rỗng bị lược được chuẩn hóa; không trim chuỗi | Retry với dấu nháy, newline, khoảng trắng trên Google thật |
| Giới hạn ô | Build chặn field/prefix/tổng hợp vượt 13.000 UTF-16 code units; server chặn quá mức | Đối chiếu nguồn Google hiện hành, ghi ở mức max trên Sheet thử |
| Khóa PIN lớp | RATE_LIMITED + số giây còn lại; lần nhấn tiếp không kéo dài hạn | Phương án mặc định chờ cần chủ dự án duyệt; nguy cơ cố tình khóa lớp vẫn tồn tại |
| Cache rớt sớm | Điều phối nhập lại PIN trên cùng DOM; giữ phiếu, đồng hồ, hàng đợi. Giáo viên giữ lựa chọn lớp | Thử cache eviction trên deployment thử |
| Quyền Google | Checklist cấu hình tách khỏi test mã | Chủ tài khoản xác minh Drive/deployment/Script Properties |
| Đo tải | Có kịch bản 40/80 bài và đăng nhập + bài, mẫu báo cáo và nguồn cần rà | Chưa được duyệt, chưa đo tải Google |
| Roster | Tạm dừng code | Quyết định tự nguyện/đồng thuận và bảng mã–họ tên ngoài hệ thống |
| Điện thoại | Issue và hướng dẫn một trang | Chưa thử thiết bị vật lý |
| Gói 2.1 | Issue vận hành riêng | Nhóm nghiên cứu quyết định; không tự sửa dữ liệu cũ |

## Các quyết định đang chờ

1. GVCN có được xem mã chưa nộp không, khớp phiếu đồng thuận?
2. Ai giữ bảng mã–họ tên, lưu ở đâu ngoài hệ thống?
3. Sĩ số thực tế và lịch các lớp có trùng giờ?
4. Duyệt cách chờ khi PIN bị khóa hay cần phương án dự phòng?
5. Quy tắc chọn lượt khi một mã có nhiều lần nộp?
6. Người phụ trách, ngày chạy thử/bắt đầu/kết thúc?

Phản hồi “ok” chưa cung cấp các quyết định này, nên không tự thêm roster, PIN dự phòng, assignee hoặc deadline.
