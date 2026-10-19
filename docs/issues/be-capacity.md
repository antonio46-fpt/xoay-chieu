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

## Ưu tiên, phụ thuộc và kịch bản đề xuất

- Ưu tiên **P2**; chỉ đo sau #3 và #2 đạt trên deployment thử.
- Người phụ trách/hạn: chờ chủ dự án; chưa chạy tải và chưa tuyên bố đạt.

| Kịch bản | Tải đề xuất | Mục tiêu đề xuất, cần chủ dự án duyệt |
|---|---|---|
| Cuối buổi một lớp | 40 bài / 60 giây | 100% ID được ACK trong 5 phút; không mất/trùng |
| Hai lớp cùng giờ | 80 bài / 60 giây | 100% ID được ACK trong 10 phút; không mất/trùng |
| Đầu buổi điều phối | 4 đăng nhập điều phối + 40 bài cùng lúc | 4 đăng nhập thành công trong 30 giây; đo riêng ACK bài |

- [ ] Duyệt sĩ số, lịch trùng giờ, mức dừng và kịch bản trước khi chạy.
- [ ] Báo cáo end-to-end từ lúc bấm gửi đến ACK, p50/p95, BUSY, quota, timeout và thời gian hết hàng đợi cho từng kịch bản.
- [ ] Đối chiếu hạn mức Apps Script/Sheets từ tài liệu Google hiện hành và ghi ngày đối chiếu trong báo cáo.
- [ ] Nếu không đạt, đề xuất nộp lệch nhóm 1–2 phút và kiểm thử lại lịch mới.

`loginTeacher`/`loginCoordinator` vẫn dùng cùng script lock với submit; tryLock chờ tối đa 1,5 giây. Đây là điểm cần đo, chưa thay khóa bằng cơ chế không bảo đảm nguyên tử. Chi tiết kế hoạch và mẫu báo cáo ở [LOAD_TEST_PLAN.md](../LOAD_TEST_PLAN.md).
