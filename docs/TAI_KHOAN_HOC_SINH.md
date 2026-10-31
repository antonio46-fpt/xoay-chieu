# Nhập tài khoản từ Excel và cấp mật khẩu — 2.7.0

Bản mới dùng mã học sinh trong danh sách riêng làm tài khoản, mật khẩu ngẫu nhiên do chủ dự án cấp. Giao diện thật gửi `password` đến `loginStudent`, chỉ mở bài sau khi máy chủ xác nhận. Biết mã chưa đủ để vào học. Mật khẩu mới 8–64 ký tự; PIN số cũ 6–12 chữ số đã cấp vẫn dùng được, không tự đổi hash/PIN cũ.

## Cách làm nhanh với danh sách đã chuẩn bị

1. Dùng **Sheet thử/dữ liệu giả trước**. Cập nhật đủ `Code.gs`, `Accounts.gs`, **`Learning.gs`**, `Schema.gs`, `Index.html`, giữ nguyên Script Properties. Chạy `setup_` nếu chưa có bảng tài khoản. Các hàm quản trị tên kết thúc `_` chỉ chạy từ editor.
2. Chạy **prepareStudentImport_** để tạo bảng `nhap_tai_khoan` ba cột `ma, truong, lop`. Mở CSV danh sách riêng đã xuất, chép toàn bộ A:C (gồm dòng tiêu đề) vào A1 của **riêng bảng nhập này**. Không dán workbook khảo sát vào bảng tài khoản/bài làm, không thay thế toàn bộ Sheet.
3. Chạy **importStudentRoster_**. Máy chủ kiểm tra toàn bộ danh sách rồi thêm tài khoản mới, giữ nguyên mã/mật khẩu đã có; chạy lại không nhân đôi. Mã trùng giữa các lớp được giữ thành tài khoản khác theo bộ ba mã/trường/lớp. Mã trùng trong cùng lớp hoặc lớp ngoài cấu hình bị từ chối trước khi ghi.
4. Chạy **provisionStudentAccounts_**. Máy chủ sinh mật khẩu riêng cho mã mới chưa cấp, lưu salt + HMAC; `STUDENT_PIN_SECRET` nằm trong Script Properties và phải giữ nguyên. Quay về Sheet, hộp thoại có liên kết **Tải file tài khoản và mật khẩu (CSV)** và bảng để sao chép. Mật khẩu rõ chỉ hiện trong lần cấp này; file tải về do người phụ trách giữ và cấp riêng từng em. Không đăng file lên Git, nhóm lớp hoặc dữ liệu nghiên cứu. Nếu hộp thoại bị mất, chọn đúng dòng và chạy **resetSelectedStudentPin_** để cấp mật khẩu mới.
5. Deploy → Manage deployments → Edit → **New version** → Deploy. Cho học sinh dùng link `/exec`: nhập mã, chọn đúng trường/lớp, nhập mật khẩu. HTML độc lập chỉ là demo, ô mật khẩu vô hiệu hóa và nút ghi rõ **Vào bản xem thử**; không dùng bản đó để kiểm tra tài khoản thật.

## Tự chuẩn bị CSV từ workbook

Chạy `python tools/import_student_roster.py /đường/dẫn/danh_sach.xlsx --output /thư/mục/riêng/tai_khoan.csv`. Công cụ dùng thư viện chuẩn Python, chỉ nhận các sheet lớp khớp cấu hình; chỉ xuất `ma,truong,lop`, bỏ toàn bộ cột khảo sát và sheet hướng dẫn/tổng hợp. Không sửa mã, không sinh mật khẩu cục bộ, không ghi đè file đích đã có; đầu ra phải bên ngoài thư mục mã nguồn. Không đưa workbook, CSV hay mật khẩu thật vào repo/gói source.

Cấu hình lớp mới: **10A3 (10 Tin), 11E1 (11 Văn)** thuộc THPT Chuyên Chu Văn An và **LB-11A (11A Lộc Bình)** thuộc Trường PTDTNT THCS & THPT Lộc Bình. Giữ Chi Lăng / 12A2 trong nhóm lớp cũ; NT-10A6/NT-10A7 còn chờ chốt, chưa kích hoạt. Mã sinh viên/học sinh lấy đúng cột MÃ HS, không dùng STT làm tài khoản. Danh sách lớp đã đổi theo đợt triển khai mới; không tự đổi trường/lớp trong bài hoặc nháp cũ để chuyển danh tính. Chủ dự án xử lý dữ liệu lớp cũ riêng trước khi nâng bản nếu còn bài chờ gửi.

## Khóa tài khoản và đặt lại mật khẩu

Chọn một dòng học sinh trong `tai_khoan`, chạy `resetSelectedStudentPin_` từ editor. Hàm giữ tên cũ để tương thích, nhưng tạo mật khẩu chữ/số mới. Mật khẩu cũ và phiên cũ mất hiệu lực khi gọi máy chủ tiếp theo. Đổi cột `trang_thai` thành `khoa` để dừng tài khoản, `hoat_dong` để mở. Không sửa các cột `pin_salt`, `pin_hash`, `ngay_cap` bằng tay hoặc nhập mật khẩu rõ vào Sheet. Tên cột/khóa còn chữ PIN để giữ tương thích dữ liệu hiện có.

Không tự thay mã, trường/lớp trên dòng đang dùng để di chuyển học sinh: đó là danh tính khác, cần quyết định cách liên kết dữ liệu trước. Nếu mất kết nối trong lúc cấp mật khẩu, lệnh có thể đã ghi; chọn đúng dòng để đặt lại, không xóa bảng hoặc cấp lại toàn bộ.

## Dữ liệu được lưu

- `chu_trinh`: bài đã xử lý an toàn, mã/trường/lớp, tuần, ID, thời gian và phiên bản. Không chứa PIN/token. Bản gốc trước khi che và nháp giữ trên thiết bị đã viết.
- `tien_do`: `ma, truong, lop, tuan_1, tuan_2, tuan_3, tuan_4, so_tuan_da_nop, cap_nhat`. Cờ tuần là TRUE/FALSE; số tuần là số đếm hoàn thành, **không phải điểm năng lực/nghiên cứu**. Được máy chủ tổng hợp từ bài đã nhận; không tin dữ liệu tiến độ client. Bảng có dòng khi học sinh **nộp bài**; tài khoản chưa nộp lần nào chưa có dòng tiến độ, vì tiến độ trên app được suy ra trực tiếp từ danh sách bài đã nộp nên không cần ghi trước.
- Gửi lại cùng ID/nội dung không thêm bài. Nếu ghi bài thành công nhưng cập nhật tiến độ lỗi, lần gửi lại cùng ID phục hồi tiến độ trước khi xác nhận.
- Đăng nhập trên thiết bị mới tải lại các tuần đã nộp từ Sheet. Khôi phục nháp/bài đã xử lý an toàn từ Sheet; phần chưa đồng bộ và bản gốc trước khi che vẫn cần thiết bị cũ/bản sao. Không coi thiếu bài trong Sổ là bài đã mất trên Sheet.
- GVCN vẫn chỉ thấy mã đã nộp và tuần trong đúng lớp qua API tiến độ giáo viên. Không trả danh sách tài khoản chưa nộp, hash hay bài riêng tư; quyết định roster ở #1 vẫn tạm dừng. Người có quyền trực tiếp với Sheet phải do chủ dự án kiểm soát.

## Đăng nhập, mất mạng và đăng xuất

Mã + trường/lớp + mật khẩu được xác thực trên máy chủ; biết đúng định dạng mã chưa đủ để nộp. Phiên tối đa 6 giờ, có thể hết sớm khi cache bị Google loại bỏ. Sau 8 lần mật khẩu sai, mã tạm khóa đăng nhập 10 phút; thử tiếp không kéo dài hạn đó. Đổi PIN/khóa mã/đăng xuất thu hồi quyền gọi API. Mật khẩu/PIN và token chỉ ở bộ nhớ của trang, không nằm trong localStorage hoặc bản sao.

Đăng nhập mới/tải lại trang cần mạng và PIN. Khi trang đang mở, mất mạng hoặc hết phiên vẫn có thể viết, lưu nháp và xếp bài chờ trên thiết bị nếu trình duyệt cho lưu. Xác thực lại ngay trên trang không dựng lại ô viết. Chỉ gửi hàng đợi của đúng tài khoản đang xác thực. Đăng xuất giữ nháp, bài cũ, hàng đợi và đưa về màn hình nhập mã; bài chờ của mã khác phải đăng nhập đúng mã mới gửi được.

Không dùng máy chung cho nội dung riêng tư: dữ liệu cục bộ/bản sao không được mã hóa; đăng xuất không xóa chúng. Giáo viên hỗ trợ học sinh giữ bản sao khi cần đổi máy, không gom bản sao có bài gốc vào nhóm chung.

## Chuyển bản đang dùng

Sao lưu cấu hình và dữ liệu do chủ dự án quản lý; thử trên Sheet riêng trước. Chủ dự án tự thêm bảng tài khoản và cấp PIN cho mã đã có, rồi cập nhật đủ năm tệp gồm Learning.gs và New version. Chỉ triển khai khi các học sinh cần sử dụng đã nhận PIN; bản mới từ chối bài chưa xác thực. Bài đang chờ vẫn giữ ID, đăng nhập đúng tài khoản để gửi lại. Không thay ID để vượt xung đột hoặc tự nhập lại bài cũ.

Môi trường phát triển không đọc/ghi Sheet có dữ liệu thật đã cung cấp. Unit/DOM/browser test dùng dữ liệu giả; chưa phải bằng chứng Google deployment, quota hoặc điện thoại thật đã đạt. Checklist trên Sheet thử: cấp PIN hai mã, đăng nhập sai/đúng, nộp bốn tuần, mất mạng/gửi lại, thử token sai mã/lớp/vai trò, đổi PIN, khóa mã, đăng xuất, dùng thiết bị khác xem tiến độ và kiểm tra quyền GVCN. Chỉ chủ dự án thực hiện bước chuyển sang Sheet thật theo quyền đã quản lý.

Bản Apps Script được build với `authRequired: true`: nếu bridge Google chưa có, màn hình báo chưa kết nối máy chủ và chặn mở bài, không chuyển sang demo. Khi triển khai phải dùng đúng `apps-script/Index.html`, không dùng `dist/index.html`.

Chi tiết tiến trình, lớp cũ và lớp chờ chọn: [tiếp tục hành trình qua các tuần](TIEN_TRINH_HOC_TAP.md). Không tự đổi mật khẩu tài khoản đã có hoặc chuyển mã Chi Lăng sang Lộc Bình.

## Đổi chế độ đăng nhập: chỉ cần mã (29/10/2026)

Chủ dự án quyết định học sinh đăng nhập bằng **mã + trường/lớp**, không cần mật khẩu. Thay đổi này đảo ngược yêu cầu chính của issue #9 ("biết mã chưa đủ để vào học").

- Máy chủ đọc Script Property `STUDENT_LOGIN_MODE`. Giá trị `ma` (**mặc định**) bỏ hoàn toàn bước kiểm tra mật khẩu; giá trị `mat_khau` quay lại hành vi cũ.
- Ở chế độ `ma`, dòng trong `tai_khoan` là **không bắt buộc**. Nếu có dòng và `trang_thai = khoa` thì vẫn bị từ chối.
- Frontend điều khiển bằng cờ `requireStudentPassword` trong `src/config.js`. **Đổi một phía mà không đổi phía kia sẽ khoá toàn bộ học sinh**, vì frontend gửi mật khẩu rỗng còn máy chủ lại đòi mật khẩu.

Hệ quả cần chấp nhận: mã học sinh thường in trên phiếu khảo sát và học sinh cùng lớp biết mã của nhau. Ai biết mã đều nộp bài thay được và đọc được nháp, tiến độ của mã đó. Nếu dùng cho dữ liệu thật, nên bật lại `mat_khau` trước buổi chính thức.

Bật lại mật khẩu: đặt `STUDENT_LOGIN_MODE = mat_khau`, đặt `requireStudentPassword: true` trong `src/config.js`, chạy `python build.py`, dán lại `apps-script/Index.html`, rồi Deploy New version.

## Sửa lỗi cú pháp `||=` (29/10/2026)

Apps Script V8 trả `ParseError: Unexpected token =` và chặn **toàn bộ** tệp `.gs` khi gặp toán tử gán logic `||=` (ES2021). Đã thay cả 8 chỗ dùng `||=`, `&&=`, `??=` trong `Accounts.gs`, `Code.gs`, `Management.gs`, `src/app.js`, `src/learning.js` bằng cấu trúc `if`. Các toán tử ES2020 như `??` và `?.` vẫn dùng được.
