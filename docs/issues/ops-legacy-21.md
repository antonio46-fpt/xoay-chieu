## Bối cảnh

Gói 2.1 có thể đã ghi nguyên văn ở Sheet nhưng mất ACK; bản mới che nội dung trước khi retry nên cùng ID có thể báo ID_CONFLICT. Đây là quy trình vận hành và quyết định nghiên cứu; không tự sửa dữ liệu thật hoặc đổi ID.

## Ưu tiên và trách nhiệm

**P2**; trở thành điều kiện chặn nâng cấp nếu chủ dự án xác nhận có dữ liệu/gói 2.1 cần xử lý. Tách từ #3. Chủ dự án/nhóm nghiên cứu quyết định cách xử lý; lập trình chỉ diễn tập trên dữ liệu giả. Người thực hiện, phê duyệt và lịch chờ chốt.

## Tiêu chí nghiệm thu

- [ ] Chủ dự án xác nhận có/không có gói 2.1 đã gửi hoặc đang chờ; không yêu cầu lập trình truy cập Sheet thật.
- [ ] Có bản sao được bảo vệ, người giữ bản sao, quy tắc chọn lượt và nhật ký quyết định; không đưa bản sao chứa dữ liệu thật vào Git/issue.
- [ ] Phân biệt chưa ghi, đã ghi chưa ACK, đã ACK và xung đột nội dung; đối chiếu ID trên dữ liệu giả.
- [ ] Nhóm nghiên cứu quyết định giữ/xử lý dữ liệu cũ và nguyên tắc che nội dung, khớp đồng thuận và phân tích.
- [ ] Diễn tập quy trình trên Sheet thử, nêu cách xác nhận bài đã nhận mà không tạo ID mới hoặc ghi đè âm thầm.
- [ ] Có người chịu trách nhiệm thao tác dữ liệu thật nếu được phép; người hỗ trợ lập trình không truy cập sau triển khai chính thức.

Chưa có migration tự động trong mã. Các ID_CONFLICT vẫn tạm dừng để kiểm tra, không được né bằng cách tạo ID mới.
