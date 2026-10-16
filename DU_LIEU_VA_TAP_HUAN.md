# Dữ liệu và tập huấn

## Trang chu_trinh

Mỗi lần nộp chủ động là một dòng. `id` là mã duy nhất của lượt, dùng chống gửi lại; không phải mã học sinh. Bộ ba `truong`, `lop`, `ma` dùng phân biệt hồ sơ. Không thu họ tên, email, vị trí hay thông tin thiết bị trong bản ghi ứng dụng.

| Cột | Ý nghĩa |
|---|---|
| thoi_gian_nhan | Thời gian máy chủ nhận, ISO UTC |
| thoi_gian | Thời điểm bấm nộp trên thiết bị, ISO UTC |
| bat_dau | Lúc tạo nháp |
| thoi_luong_giay | Thời gian màn hình làm bài hiển thị, không phải đo tập trung |
| thoi_gian_troi_giay | Thời gian trôi từ tạo nháp đến nộp, gồm nghỉ |
| thu_lam | Kết quả Thử; tuần 4 ghép hai phần thay đổi được/không được |
| nghi_1..3 | Các câu Nghĩ; xem bảng tuần dưới |
| noi | Câu trả lời liên hệ môn khác/đời sống, tách khỏi sản phẩm |
| dang_san_pham, san_pham | Dạng và toàn văn sản phẩm, tuần 4 là bản 2 |
| chia_se | Ý nghe từ bạn; tuần 3 là Đổi/Giữ ý và lý do |
| tu_danh_gia | Mức học sinh tự chọn 1–3, không phải điểm giáo viên hay AI |
| phe, doi_hay_giu | Lựa chọn nguyên trạng tuần 3; đồng thời có tiền tố trong nghi_1/chia_se theo yêu cầu |
| kiem_soat, ngoai_kiem_soat | Hai câu trả lời nguyên văn riêng tuần 4 |
| ban_goc_id | ID sản phẩm đã chọn để sửa; trống nếu nhập lại từ giấy |
| phien_ban_app, phien_ban_noi_dung | Phiên bản app và nội dung của lượt làm |

| Tuần | nghi_1 | nghi_2 | nghi_3 |
|---|---|---|---|
|1|Chỗ vấp khi giải thích|Vì sao tưởng đã hiểu|Cách kiểm tra mình hiểu|
|2|So sánh hai cách học|Lý do giữ cách quen|Thói quen định đổi|
|3|Phe A/B và 2 lý do|Lý lẽ mạnh của phía kia|Điểm chung và điều chưa chắc|
|4|Bước nhỏ sẽ làm|Thư gửi chính mình (>=30 từ)|Thói quen muốn giữ và vì sao|

`phieu_buoi`: buổi thực hiện theo lớp, tuần, ngày, khung giờ, thời lượng thực tế, sĩ số, số tham gia, các bước hoàn thành, app/giấy/kết hợp, điều tốt, khó khăn, tên viết tắt điều phối viên. `doi_y`: tuần 3, nhóm, đổi/giữ, lý do.

Không cộng mức 1–3 thành điểm năng lực hay coi phần trăm hoàn thành là hiệu quả can thiệp. Nhóm nghiên cứu tự xác định cách xử lý lượt làm lại, thiếu dữ liệu và đối chiếu khảo sát trước/sau. Giữ dữ liệu gốc, ghi rõ quy tắc chọn bản ghi trước khi phân tích.

## Tập huấn đề xuất

### Buổi 1 — hiểu công cụ (30–45 phút)

Giải thích mục tiêu nghiên cứu và 5 thành tố. Mở tuần 1, thực hiện trọn chu trình. Học sinh giải thích vì sao mỗi câu hiện riêng, vì sao cần ghi lại suy nghĩ, vì sao không chấm đúng/sai. Không suy ra năng lực thật từ việc bấm hoàn thành.

### Buổi 2 — dữ liệu và vận hành (30–45 phút)

Nhập mã thử, ghi một đoạn có xuống dòng, nộp và tìm dòng trong Sheet dưới sự hướng dẫn của người có quyền. Tắt mạng sau khi trang đã tải, thử lưu chờ rồi bật lại. Xem 2 lượt chủ động và phân biệt với gửi lại cùng ID. Mở tuần 3 thử điều phối, tuần 4 sửa sản phẩm.

### Buổi 3 — trình bày và demo (30 phút)

Demo trên điện thoại: mã → thư → câu hỏi → sản phẩm → tự đánh giá → xác nhận. Học sinh nói rõ vai trò của nhóm và người hỗ trợ kỹ thuật, phần có AI hỗ trợ; không học thuộc tuyên bố tự viết code nếu không đúng. Không bảo đảm hội đồng sẽ không hỏi code.

Câu hỏi luyện tập:
- Vì sao app dùng chu trình Thử–Nghĩ–Nối–Chia sẻ?
- Vì sao lưu nguyên văn, tách câu Nối và sản phẩm?
- Dữ liệu gửi đi đâu, ai có quyền xem? Mã khác mật khẩu thế nào?
- Khi mất mạng, làm sao biết bài chỉ lưu trên máy hay đã vào Sheet?
- Tuần 4 làm sao giữ bản gốc khi sửa sản phẩm?
- Điều gì do nhóm tự thực hiện, điều gì có hỗ trợ?

## Phạm vi kiểm tra bàn giao

Có kiểm tra cú pháp, build, hàm kiểm tra đầu vào và ánh xạ bốn tuần, mô phỏng máy chủ ghi RAW/chống trùng/PIN, mô phỏng trạng thái nộp bài và lỗi bộ nhớ, kiểm tra hàng đợi mất mạng và gửi lại. Có kiểm tra khôi phục giữ gói chờ và phát hiện tab khác thay đổi dữ liệu.

Kiểm thử DOM bằng jsdom đi qua giao diện bốn tuần, kiểm tra không bỏ trống, tự đánh giá không chọn sẵn, quay lại và tải lại nháp, giữ dòng trống đầu, hiển thị văn bản có thẻ HTML, tạo lượt mới và sửa sản phẩm tuần 4. Đây là mô phỏng DOM trong Node.js, không phải kiểm tra bố cục bằng trình duyệt thật.

Chưa kiểm tra trực quan bằng trình duyệt trong môi trường tạo bản này; chưa xác thực trên Google Apps Script/Sheet thật của bạn và chưa đo tải 70 máy. Các bước đó nằm trong checklist triển khai, phải hoàn thành trước dùng nghiên cứu thật.
