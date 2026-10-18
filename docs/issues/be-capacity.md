## Bối cảnh và hiện trạng

Quy mô dự kiến khoảng 150 học sinh ở hai trường, bốn lớp. Hiện chỉ có kiểm thử chức năng và mock, chưa có số đo tải đồng thời với Apps Script/Sheets. Không coi quy mô dự kiến là cam kết năng lực hệ thống.

## Phạm vi

Đo `submitRecord` trên deployment/Sheet thử với dữ liệu giả, tăng tải theo bước do chủ dự án cho phép. Kiểm tra LockService, quota, backoff client và thời gian hàng đợi được xử lý. Không thực hiện stress test trên deployment chính thức.

## Tiêu chí nghiệm thu

- [ ] Có kế hoạch tải và mức dừng trước khi chạy; ghi rõ số người dùng/request đồng thời.
- [ ] Báo cáo tỷ lệ ACK, BUSY, lỗi quota/timeout, độ trễ p50/p95 và thời gian xử lý hết hàng đợi.
- [ ] Đối chiếu ID gửi/ID Sheet để chứng minh không mất bài hoặc ghi trùng.
- [ ] Kiểm tra retry sau lỗi vẫn giữ ID và nội dung đã che.
- [ ] Nếu chưa đạt tải dự kiến, ghi giới hạn và phương án điều phối buổi học; không báo sẵn sàng vô điều kiện.

## Kiểm thử

Chạy tải bằng mã giả, chỉ trên Sheet thử, trong giới hạn Google và mức được chủ dự án phê duyệt. Xóa dữ liệu thử chỉ theo quy trình của chủ dự án; không truy cập Sheet chính thức sau khi chạy thật.
