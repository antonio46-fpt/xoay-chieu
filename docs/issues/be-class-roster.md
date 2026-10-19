## Bối cảnh và hiện trạng

`getClassProgress` hiện chỉ trả mã đã có bài được máy chủ xác nhận. FE đã ghi rõ giới hạn này. Chưa thể liệt kê mọi học sinh chưa nộp, vì chưa có danh sách mã được cấp theo bốn lớp.

## Phạm vi và API

Bổ sung nguồn danh sách mã được chủ dự án duyệt, gắn với đúng trường/lớp, không có họ tên, số điện thoại hoặc ảnh. Duy trì RPC `getClassProgress({token, truong, lop})`, response `{ok:true, students:[{ma, weeks:[1,2]}]}`. Mã hợp lệ chưa nộp phải có `weeks:[]`. Thiết kế nguồn roster riêng ở máy chủ; không nhúng danh sách các lớp vào HTML phát cho học sinh. Khi chưa cấu hình roster, tiếp tục thông báo chế độ chỉ liệt kê mã có bài; không âm thầm suy luận các mã còn lại.

## Tiêu chí nghiệm thu

- [ ] Có đặc tả nguồn roster và cách chủ dự án nhập/cập nhật bằng dữ liệu giả.
- [ ] Chặn mã trùng trong cùng trường/lớp; cho phép cùng mã ở lớp khác nếu đúng chính sách.
- [ ] Trả đủ roster đúng lớp, kể cả `weeks:[]`, không lộ mã lớp khác.
- [ ] Chỉ trả `ma`, `weeks`; không thêm nội dung, tự đánh giá, thời lượng hay thông tin nhận diện.
- [ ] Có đường chuyển tiếp rõ ràng cho dữ liệu đã ghi và lớp chưa cấu hình roster.
- [ ] Nhóm nghiên cứu duyệt danh sách thực tế ngoài Git trước khi sử dụng thật.

## Kiểm thử

Fixture hai trường, bốn lớp; có mã chưa nộp, nộp nhiều lượt, trùng mã khác lớp, roster sai cấu trúc. Test cả quyền giáo viên, PIN sai và đổi lớp. Kiểm thử tích hợp trên Sheet thử; không truy cập Sheet thật.

## Trạng thái: tạm dừng triển khai, chờ quyết định nghiên cứu

- Ưu tiên **P3**. Không lập trình roster ở đợt sửa này; giữ API chỉ liệt kê mã đã có bài xác nhận.
- Người phụ trách, hạn: chờ phân công và quyết định bằng văn bản của nhóm nghiên cứu.
- [ ] Có quyết định cho phép/không cho phép GVCN xem mã chưa nộp, khớp phiếu đồng thuận và nguyên tắc tham gia tự nguyện.
- [ ] Xác định ai giữ bảng mã ↔ họ tên và nơi lưu ngoài hệ thống.
- [ ] Bảng mã ↔ họ tên không nằm trong Sheet nghiên cứu, Script Properties, HTML, Git hoặc issue.
- [ ] Nếu GVCN giữ bảng đối chiếu, đánh giá rõ việc xem tiến độ theo mã có thể trở thành xem theo tên và gây áp lực.
- [ ] Chỉ sau khi được duyệt, chọn nguồn roster chỉ gồm mã và quy trình chủ dự án cấp mã sẵn để tránh trùng. Không tự đưa danh sách học sinh vào repo.

Nguồn roster chỉ gồm mã có thể được thiết kế sau quyết định; bảng đối chiếu có họ tên luôn nằm ngoài hệ thống. Đây là hai loại dữ liệu khác nhau.
