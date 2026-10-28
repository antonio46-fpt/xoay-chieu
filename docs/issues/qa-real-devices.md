## Bối cảnh

Nháp và hàng đợi nằm trong trình duyệt; test DOM/Chromium viewport không chứng minh hành vi trên điện thoại vật lý, trình duyệt trong app hoặc chế độ tiết kiệm pin.

## Phạm vi, ưu tiên và phụ thuộc

**P1** — có thể chuẩn bị/chạy thử giao diện song song #3; kiểm tra gửi/ACK dùng deployment thử của #3. Người phụ trách và hạn chờ nhóm nghiên cứu phân công. Chỉ dữ liệu giả, Sheet thử; không ghi thông tin nhận diện thiết bị/học sinh vào issue.

## Tiêu chí nghiệm thu

- [ ] Ít nhất Android giá rẻ, Android tầm trung và iPhone; ghi model/OS/browser đã loại thông tin cá nhân.
- [ ] Chrome/Safari và trình duyệt trong Zalo/Facebook: đọc/làm/lưu/khôi phục/gửi bài hoặc hướng dẫn mở trình duyệt ngoài nếu không hỗ trợ.
- [ ] Tiết kiệm pin, tắt màn hình giữa bài, thoát app, 4G mất rồi có lại; kiểm tra đúng ID, không mất/trùng.
- [ ] Hai học sinh mã khác nhau trên cùng trình duyệt: không lẫn nháp/lịch sử; nêu rõ người có quyền dùng máy vẫn có thể xem dữ liệu cục bộ.
- [ ] Cảnh báo lỗi lưu/bộ nhớ đầy rõ ràng; bản LIVE không cho chế độ demo bỏ qua lưu.
- [ ] Hướng dẫn một trang cho học sinh được đọc thử và xác nhận dễ hiểu: giữ mã, cùng trình duyệt trong 4 tuần, không xóa dữ liệu khi còn bài chờ.
- [ ] Báo cáo pass/fail/unrun theo từng tình huống, ảnh đã loại mã thật và nội dung thật.

Hướng dẫn học sinh: docs/HUONG_DAN_HOC_SINH.md. Chưa thực hiện các kiểm tra vật lý trong môi trường lập trình này.

## Kiểm toán mã 2.8.0

Bốn ô dưới đây kiểm được bằng mã; phần còn lại bắt buộc thử trên máy thật.

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Hai học sinh khác mã trên cùng trình duyệt không lẫn nháp/lịch sử | Đạt | `src/classes.js:8` khoá hồ sơ gồm cả `truong`, `lop`, `ma`; `db.profiles` tách theo khoá này |
| Cảnh báo lỗi lưu/bộ nhớ đầy rõ ràng | Đạt | `src/app.js:407-417` báo rõ nguyên nhân và giữ nguyên dữ liệu, không âm thầm mất bài |
| Bản LIVE không cho bỏ qua lưu bằng chế độ demo | Đạt | `src/app.js:14` đặt `AUTH_REQUIRED = APP_CONFIG.authRequired \|\| LIVE`; `src/app.js:379` chỉ bật `previewOnly` khi **không** ở bản LIVE |
| Không ghi thông tin nhận diện thiết bị | Đạt | `src/app.js:7` nêu rõ; `Core.record` không có trường thiết bị |

Còn mở: ma trận Android giá rẻ / Android tầm trung / iPhone, trình duyệt trong Zalo–Facebook, tiết kiệm pin và mất 4G giữa bài.
