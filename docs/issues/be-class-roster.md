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
