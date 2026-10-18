# Phạm vi Xoay Chiều 2.2.0

Mục tiêu: giúp học sinh THPT rèn năng lực linh hoạt trong học tập qua trải nghiệm, phản tư và điều chỉnh. Bản đầu có 4 tuần, 2 trường và **4 lớp đã chốt**: THPT Chuyên Chu Văn An (10 Trung, 10D2), THPT Dân tộc nội trú tỉnh (10A6, 10A7). Khoảng 150 học sinh là quy mô dự kiến, chưa phải số người dùng đồng thời đã kiểm chứng.

| Yêu cầu bắt buộc | Thực hiện |
|---|---|
| Vào bằng mã + trường/lớp | Không hỏi họ tên, số điện thoại; không tải ảnh/âm thanh/video |
| Tuần 1–2 | Thử – Nghĩ – Nối – Chia sẻ, từng bước, gợi ý và câu hỏi đào sâu cấu hình trong JSON |
| Tuần 3 | Tranh luận, đổi góc nhìn, giữ/đổi ý và ghi lý lẽ |
| Tuần 4 | Chọn bài của mình, tạo bản 2 có `ban_goc_id`; không sửa bản gốc |
| Nháp và mất mạng | Lưu trên trình duyệt, giữ hàng đợi; chỉ xóa khi ACK đúng ID; retry không sinh ID mới |
| An toàn | Lời nhắn hỗ trợ; ô có từ khóa thay bằng `[đã ẩn – an toàn]` trước RPC; máy chủ áp dụng lại trước ghi RAW |
| Sổ của mình | Chỉ lịch sử của bộ ba mã/trường/lớp hiện tại trên máy; không tải bài người khác |
| Điều phối | Đồng hồ, vai, thẻ hỏi, phiếu buổi, phiếu đổi ý; PIN riêng theo lớp trên máy chủ |
| Giáo viên chủ nhiệm | PIN giáo viên riêng; chỉ `ma` và các tuần được máy chủ xác nhận của đúng lớp |
| Nghiên cứu và GV hướng dẫn | Xem/xuất dữ liệu Sheet qua quyền Google do chủ dự án cấp; không mở Sheet cho học sinh/GVCN chỉ cần tiến độ |
| Điện thoại và nội dung | Bố cục 360px, sáng/tối, giảm chuyển động; nhiệm vụ/gợi ý/từ khóa/lớp nằm trong `src/content.json` |

## Quy tắc dữ liệu

- Bài đã nộp bất biến. “Làm lượt mới” tạo ID/dòng mới; retry vẫn cùng ID. Nhóm nghiên cứu phải chốt quy tắc chọn lượt để phân tích; app không tự chọn lượt cuối.
- Ô không có từ khóa giữ nguyên văn. Ô có từ khóa che toàn bộ; cột dẫn xuất tuần 3–4 giữ cấu trúc nhưng không chứa lại phần nhạy cảm. Bộ lọc không thay thế người hỗ trợ và không tự gửi cảnh báo.
- Bản gốc vẫn ở nháp/lịch sử trên thiết bị, có thể nằm trong bản sao cá nhân; cần giữ riêng. Dữ liệu cũ trên Sheet không tự được làm sạch bởi bản nâng cấp này.
- GVCN không được cấp quyền Sheet nguồn nếu chỉ có quyền xem tiến độ. Bảng tiến độ chỉ bao gồm mã có bài đã được xác nhận, chưa có roster để liệt kê mọi mã chưa nộp.
- Không thu điểm La bàn, không tự tính điểm năng lực, không dùng tiến độ hay mức tự đánh giá làm điểm nghiên cứu. Mã chỉ liên kết khảo sát Google Forms trước/sau; phân tích Sheets/SPSS do nhóm thực hiện.
- Chỉ phát triển với Sheet thử/dữ liệu giả. Không truy cập Sheet thật sau khi chạy chính thức. Phiên phát triển này không truy cập bất kỳ Google Sheet nào.

## Giai đoạn sau và điểm chờ chốt

- Để sau: La bàn cá nhân chỉ trên máy, bản ghi `thanh_to`, chatbot kịch bản. Không có chatbot AI tạo sinh. Hình la bàn trang trí không phải công cụ chấm điểm.
- Ngoài phạm vi: tuần 5–8, app Android/iOS riêng, phân tích nghiên cứu tự động.
- Chưa chốt ngày bắt đầu/chạy thử/kết thúc: không tự gán 19/10 hoặc 19/11, không khóa nội dung theo ngày.
- Chưa chốt hình thức trưng bày: app chỉ cho xem bài của mình; không công khai sản phẩm người khác. Cần quyết định riêng nếu muốn thư viện có sự đồng ý.
- Trước khi dùng thật: cấu hình `TEACHER_PINS`, `COORDINATOR_PINS` trên Apps Script; xác minh quyền trên Sheet thử, thử thiết bị thật và đo tải gần quy mô dự kiến. Không coi test mô phỏng là bằng chứng Google deployment hoặc tải đồng thời đã đạt.

## Kiểm tra

`python build.py` → `npm test` → `python package_source.py`.

`tests/scope.cjs` kiểm tra che nội dung cả bốn tuần và cột dẫn xuất, giữ nguyên bản cục bộ, chống trùng, phân tách quyền điều phối/giáo viên, ngăn xem sang lớp khác, thu hồi phiên, giới hạn thử PIN và bản demo chỉ dùng dữ liệu giả. Các test sẵn có kiểm tra quy trình bốn tuần, hàng đợi, khôi phục và DOM.

Đã kiểm tra phiên bản này bằng Chromium thật ở viewport 360×800: đăng nhập học sinh, bốn tuần, lời nhắn an toàn, sáng/tối, điều phối, cài đặt và demo tiến độ không tràn chiều ngang. Đăng nhập PIN sai/đúng, hết phiên và đăng xuất giáo viên đã được kiểm tra trong trình duyệt với RPC giả. Không có truy cập Sheet thật, đo tải 150 người đồng thời hoặc thử thiết bị điện thoại vật lý.
