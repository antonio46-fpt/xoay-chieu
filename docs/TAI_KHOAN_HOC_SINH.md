# Tài khoản học sinh và tiến độ — 2.5.0

Bản này dùng mã học sinh có sẵn, PIN riêng được cấp, hai trường và bốn lớp hiện có. Không nhập họ tên, điện thoại, ảnh hoặc bảng đối chiếu mã–họ tên vào hệ thống. Issue triển khai và nghiệm thu: [#8](https://github.com/antonio46-fpt/xoay-chieu/issues/8).

## Chuẩn bị trên bản thử

1. Chủ dự án tạo Sheet thử riêng bằng dữ liệu giả, mở **Tiện ích mở rộng → Apps Script** để có dự án gắn với Sheet. Giữ Sheet ở chế độ Hạn chế; không cấp quyền Sheet cho học sinh/GVCN chỉ theo dõi tiến độ. Link editor không phải link web app.
2. Cập nhật đồng bộ `Code.gs`, tạo Script **Accounts** từ `apps-script/Accounts.gs`, Script **Schema** từ `Schema.gs` và HTML **Index** từ `Index.html`. Bật dịch vụ Google Sheets API. Chạy `setup_` từ editor. Hàm thêm bảng còn thiếu, kiểm tra cột và dừng nếu không khớp; không xóa hoặc sửa bài cũ.
3. Bảng `tai_khoan` có cột `ma, truong, lop, trang_thai, pin_salt, pin_hash, ngay_cap`. Chép **chỉ mã đã có, tên trường và lớp** vào A:C. Mỗi mã duy nhất trong cùng trường/lớp. Định dạng mã `AB12-C`; `HO07-T` là ví dụ bị từ chối. Không tự tạo lại mã đang dùng để liên kết khảo sát.
4. Trường/lớp phải đúng một trong bốn tổ hợp: THPT Chuyên Chu Văn An / 10 Trung, 10D2; THPT Chi Lăng / 10A6, 10A7. D trống hoặc `hoat_dong` cho phép đăng nhập; `khoa` khóa tài khoản. E:G do máy chủ quản lý, **không nhập PIN rõ vào bất kỳ cột nào**.
5. Chạy **provisionStudentAccounts_** trong editor. Máy chủ sinh PIN 8 chữ số cho mã đang hoạt động chưa cấp PIN, ghi salt + HMAC-SHA256 và ngày cấp. Bí mật HMAC tự tạo trong Script Properties với tên `STUDENT_PIN_SECRET`; giữ nguyên thuộc tính này khi cập nhật phiên bản. Không sao chép bí mật vào Git/chat hoặc thay khóa khi còn tài khoản đã cấp.
6. Quay về tab Sheet để xem hộp thoại PIN. Danh sách PIN chỉ hiện ở lần cấp đó; sao chép và giao riêng cho từng học sinh qua kênh do người phụ trách quản lý. PIN là **chuỗi**, giữ cả số 0 đầu; không đăng trong nhóm lớp, issue, dữ liệu nghiên cứu hoặc ảnh chụp. Chạy lại hàm không đổi PIN đã cấp. Nếu mất hộp thoại, đặt lại PIN cho mã bị mất; không thể đọc lại PIN từ hash.
7. Deploy → New deployment / Manage deployments → Web app, chạy dưới quyền chủ dự án, chọn đối tượng truy cập phù hợp tài khoản trường; tạo **New version** và mở link `/exec`. Thử bằng mã/PIN giả trước khi dùng bản thật. Bản HTML tải về chỉ là demo, không kiểm tra tài khoản hay ghi Sheet.

## Đặt lại PIN và khóa mã

Mở Sheet đúng dự án, chọn **một dòng** học sinh trong `tai_khoan`, vào Apps Script chạy **resetSelectedStudentPin_**. Hộp thoại hiện PIN mới; PIN cũ và mọi phiên cũ của mã này mất hiệu lực khi gọi máy chủ tiếp theo. Mất kết nối trong lúc cấp/đặt lại có thể khiến không nhận được hộp thoại dù máy chủ đã ghi; đặt lại đúng dòng, không xóa bảng hoặc cấp lại toàn bộ.

Đổi D thành `khoa` để dừng tài khoản; đổi lại `hoat_dong` để mở. Trước khi mở lại mã từng bị lộ PIN, đặt lại PIN. Không chỉnh ma/truong/lop trên dòng đang dùng để di chuyển học sinh: việc đổi bộ ba tạo danh tính khác; chủ dự án cần quyết định cách liên kết dữ liệu trước.

## Dữ liệu được lưu

- `chu_trinh`: bài đã xử lý an toàn, mã/trường/lớp, tuần, ID, thời gian và phiên bản. Không chứa PIN/token. Bản gốc trước khi che và nháp giữ trên thiết bị đã viết.
- `tien_do`: `ma, truong, lop, tuan_1, tuan_2, tuan_3, tuan_4, so_tuan_da_nop, cap_nhat`. Cờ tuần là TRUE/FALSE; số tuần là số đếm hoàn thành, **không phải điểm năng lực/nghiên cứu**. Được máy chủ tổng hợp từ bài đã nhận; không tin dữ liệu tiến độ client. Bảng có dòng khi học sinh đăng nhập/tải tiến độ hoặc nộp bài. Tài khoản chưa dùng có thể chưa có dòng tiến độ.
- Gửi lại cùng ID/nội dung không thêm bài. Nếu ghi bài thành công nhưng cập nhật tiến độ lỗi, lần gửi lại cùng ID phục hồi tiến độ trước khi xác nhận.
- Đăng nhập trên thiết bị mới tải lại các tuần đã nộp từ Sheet. **Không tải nội dung bài hoặc nháp cũ từ Sheet xuống Sổ của mình**; dùng cùng thiết bị hoặc khôi phục bản sao riêng để sửa sản phẩm ở tuần 4. Không coi thiếu bài trong Sổ là bài đã mất trên Sheet.
- GVCN vẫn chỉ thấy mã đã nộp và tuần trong đúng lớp qua API tiến độ giáo viên. Không trả danh sách tài khoản chưa nộp, hash hay bài riêng tư; quyết định roster ở #1 vẫn tạm dừng. Người có quyền trực tiếp với Sheet phải do chủ dự án kiểm soát.

## Đăng nhập, mất mạng và đăng xuất

Mã + trường/lớp + PIN được xác thực trên máy chủ; biết đúng định dạng mã chưa đủ để nộp. Phiên tối đa 6 giờ, có thể hết sớm khi cache bị Google loại bỏ. Sau 8 lần PIN sai, mã tạm khóa đăng nhập 10 phút; thử tiếp không kéo dài hạn đó. Đổi PIN/khóa mã/đăng xuất thu hồi quyền gọi API. PIN và token chỉ ở bộ nhớ của trang, không nằm trong localStorage hoặc bản sao.

Đăng nhập mới/tải lại trang cần mạng và PIN. Khi trang đang mở, mất mạng hoặc hết phiên vẫn có thể viết, lưu nháp và xếp bài chờ trên thiết bị nếu trình duyệt cho lưu. Xác thực lại ngay trên trang không dựng lại ô viết. Chỉ gửi hàng đợi của đúng tài khoản đang xác thực. Đăng xuất giữ nháp, bài cũ, hàng đợi và đưa về màn hình nhập mã; bài chờ của mã khác phải đăng nhập đúng mã mới gửi được.

Không dùng máy chung cho nội dung riêng tư: dữ liệu cục bộ/bản sao không được mã hóa; đăng xuất không xóa chúng. Giáo viên hỗ trợ học sinh giữ bản sao khi cần đổi máy, không gom bản sao có bài gốc vào nhóm chung.

## Chuyển bản đang dùng

Sao lưu cấu hình và dữ liệu do chủ dự án quản lý; thử trên Sheet riêng trước. Chủ dự án tự thêm bảng tài khoản và cấp PIN cho mã đã có, rồi cập nhật đủ bốn tệp và New version. Chỉ triển khai khi các học sinh cần sử dụng đã nhận PIN; bản mới từ chối bài chưa xác thực. Bài đang chờ vẫn giữ ID, đăng nhập đúng tài khoản để gửi lại. Không thay ID để vượt xung đột hoặc tự nhập lại bài cũ.

Môi trường phát triển không đọc/ghi Sheet có dữ liệu thật đã cung cấp. Unit/DOM/browser test dùng dữ liệu giả; chưa phải bằng chứng Google deployment, quota hoặc điện thoại thật đã đạt. Checklist trên Sheet thử: cấp PIN hai mã, đăng nhập sai/đúng, nộp bốn tuần, mất mạng/gửi lại, thử token sai mã/lớp/vai trò, đổi PIN, khóa mã, đăng xuất, dùng thiết bị khác xem tiến độ và kiểm tra quyền GVCN. Chỉ chủ dự án thực hiện bước chuyển sang Sheet thật theo quyền đã quản lý.
