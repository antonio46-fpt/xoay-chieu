# Xoay Chiều — mã nguồn đầy đủ 2.8.1

Công cụ hoạt động và thu dữ liệu cho đề tài “Phát triển năng lực linh hoạt trong học tập của học sinh THPT tại Lạng Sơn”. Phạm vi bản bắt buộc: 3 lớp đang triển khai theo danh sách mới, giữ lớp Chi Lăng cũ; lớp thứ tư chờ chốt, 4 tuần can thiệp. Lịch triển khai và kết thúc chưa chốt. Không chấm đúng/sai, không xếp hạng, không tự suy ra điểm năng lực.

Xem [SCOPE.md](SCOPE.md) để đối chiếu yêu cầu, quyền dữ liệu và những điểm còn chờ chốt.

## Dùng bộ mã nguồn

- Mở `dist/index.html` để xem thử. Bản này và bản Sites lưu trên máy, **chưa gửi Google Sheets**.
- Để triển khai nhận dữ liệu thật, theo `HUONG_DAN_TRIEN_KHAI.md`; dùng các tệp đã ghép trong `apps-script/`.
- Để đọc và sửa code, theo `MA_NGUON_CHI_TIET.md`. Mở `dist/ma-nguon.html` để xem từng tệp, sao chép hoặc tải về.
- Nội dung bốn tuần nằm riêng tại `src/content.json`. Không cần sửa logic để thay thư/câu hỏi/ngưỡng độ dài.
- Các sản phẩm là văn bản hoặc phần mô tả sản phẩm. Bản này không tải ảnh, âm thanh hoặc video lên Drive.

## Chức năng đã lập trình

| Phần | Hành vi |
|---|---|
| Vào app | Mã dạng AB12-C, chọn trường/lớp, không hỏi họ tên |
| Tuần 1–2 | Mỗi tuần khoảng 15 phút; thư, Thử, từng câu Nghĩ, Nối, sản phẩm, Chia sẻ, tự đánh giá |
| Tuần 3 | Khoảng 45 phút; tranh luận, đổi góc nhìn, ghi lý lẽ và đổi/giữ ý |
| Tuần 4 | Khoảng 45 phút; chọn sản phẩm cũ trên máy, sửa bản mới và giữ nguyên bản gốc |
| Kiểm tra | Bắt buộc trả lời, độ dài tối thiểu/tối đa, lựa chọn hợp lệ; mức 1–3 do học sinh tự chọn |
| Lưu nháp | Lưu khi nhập, chuyển bước và ẩn trang; tiếp tục sau khi mở lại |
| Chờ gửi | Lưu gói vào máy trước; mất mạng vẫn giữ gói; tự thử lại với cùng ID |
| Chống trùng | Máy chủ khóa thao tác tìm ID và ghi; ID cũ + nội dung cũ chỉ xác nhận lại |
| Làm lại | Học sinh chủ động tạo lượt mới → ID mới, dòng mới, không sửa bài đã nộp |
| Khôi phục | Bản sao toàn bộ giữ bài chờ gửi; tạm dừng đến khi bấm Thử gửi lại |
| Giáo viên chủ nhiệm | PIN riêng theo lớp; chỉ xem mã và tuần đã nộp, không đọc bài hay mức tự đánh giá |
| Điều phối | PIN theo lớp, đồng hồ chặng, thẻ hỏi/vai, phiếu buổi, ý kiến nhóm tuần 3 |
| Giao diện | Điện thoại, chàm–kem, họa tiết thổ cẩm bằng CSS, sáng/tối |

## Cấu trúc tệp

| Tệp | Trách nhiệm |
|---|---|
| `src/content.json` | Toàn bộ thư, hoạt động, trường/lớp và định nghĩa ô nhập |
| `src/config.js` | Phiên bản, thời gian chờ RPC, nhịp gửi lại, khóa bộ nhớ |
| `src/core.js` | Kiểm tra đầu vào, giữ nguyên văn, tạo ID/bản ghi, thời gian gửi lại |
| `src/safety.js` | Chính sách che nội dung dùng chung cho trình duyệt và máy chủ |
| `src/backup.js` | Kiểm tra và khôi phục bản sao an toàn |
| `src/app.js` | Điều hướng, màn hình, nháp, hàng đợi, giao tiếp máy chủ |
| `src/style.css`, `src/shell.html` | CSS và khung HTML |
| `apps-script/Code.gs` | Máy chủ kiểm tra dữ liệu, xác thực điều phối, ghi Sheet RAW |
| `apps-script/Management.gs` | Hai bảng quản lý tự tính từ nguồn, không xuất PIN/hash/token |
| `apps-script/Learning.gs` | Nháp theo tuần, khôi phục Sổ riêng và chống ghi đè giữa thiết bị |
| `apps-script/Accounts.gs` | Cấp PIN riêng, xác thực học sinh, tổng hợp tiến độ trên Sheet |
| `apps-script/Schema.gs` | Schema kiểm tra tự sinh từ JSON; không sửa tay |
| `apps-script/Index.html` | App đã ghép để dán vào HTML Service |
| `apps-script/appsscript.json` | Manifest V8 và dịch vụ Google Sheets v4 |
| `build.py` | Tạo HTML, schema và cache từ mã nguồn |
| `package_source.py` | Tạo trang đọc mã và ZIP bàn giao |
| `tests/` | Kiểm thử logic, máy chủ giả lập, hàng đợi, khôi phục và DOM |

## Build và kiểm thử

Python 3 dùng để build. App không dùng framework, CDN, khóa AI hay thư viện JavaScript bên ngoài. Node.js và jsdom **chỉ phục vụ kiểm thử**, không được ghép vào app.

```bash
python build.py
npm ci --ignore-scripts
npm test
python package_source.py
```

Trên Windows có thể thay `python` bằng `py`. Bản build sẵn đã có trong ZIP, nên không cần cài các công cụ trên chỉ để triển khai Apps Script.

Nếu chỉ kiểm thử các phần không phụ thuộc thư viện DOM:

```bash
node tests/test.cjs
node tests/queue.cjs
node tests/recovery.cjs
```

Các kiểm thử tự động không thay cho thử trên điện thoại, Google Sheet thật và tải nộp của 150 học sinh dự kiến. Phạm vi chính xác ở `DU_LIEU_VA_TAP_HUAN.md`.

## Những điểm vận hành cần biết

Bản HTML tĩnh không thể dùng `google.script.run`; bản dùng thật phải được phục vụ từ Apps Script bằng URL `/exec`. App nhận biết môi trường và hiển thị trạng thái rõ ràng. Không có tình huống dùng `no-cors` rồi báo thành công khi chưa biết máy chủ đã ghi hay chưa.

Mỗi hồ sơ được tách bằng bộ ba trường/lớp/mã. Mã là mã giả danh, không phải mật khẩu. Bản ghi ứng dụng không chứa họ tên, email hay thông tin thiết bị. Các đoạn học sinh viết vẫn có thể chứa thông tin nhận diện nếu tự nhập; lời nhắc trên app yêu cầu tránh điều đó. Sheet cần để quyền Hạn chế, chỉ cấp cho nhóm nghiên cứu.

Đăng nhập đúng tài khoản để khôi phục nháp đã đồng bộ, bước đang làm và bài cũ từ Sheet. Bản gốc trước khi che và phần chưa được xác nhận đồng bộ vẫn cần thiết bị đã viết hoặc bản sao riêng. Tuần 4 có thể chọn sản phẩm cũ đã được khôi phục. Trên máy chung, người có quyền vào trình duyệt có thể truy cập dữ liệu cục bộ. Phát hiện tab khác ghi dữ liệu sẽ tạm dừng lưu tab này, cho tải bản sao rồi mở lại; đây không phải cơ chế làm việc đồng thời nhiều tab.

Khi trang đã tải, mất mạng vẫn có thể làm và lưu bài. Bản tĩnh HTTPS có cache sau lần mở online. Apps Script không bảo đảm tải mới/tải lại trang khi hoàn toàn offline. Không xóa dữ liệu trình duyệt trong lúc còn bài chờ. Bản sao nhập lại giữ nguyên ID và tạm dừng gửi; chỉ khôi phục trên trình duyệt chưa có dữ liệu.

Thời gian hoạt động chỉ tính khi màn hình làm bài hiển thị; thời gian trôi được lưu riêng. Hai số này không đo mức tập trung. Đồng hồ là gợi ý, không tự đóng bài. Tổng thời lượng chặng là 15/45 phút; tự đánh giá được làm theo nhịp lớp.

Tất cả tuần đang mở để thử/làm bù. Website không tự ngừng sau tám tuần; chủ dự án chủ động kết thúc triển khai theo lịch. Danh sách trường/lớp và nội dung hiện là bản cấu hình để duyệt, chưa phải xác nhận đã tuyển đủ số mã dự kiến. App không có danh sách mã được cấp riêng; nó kiểm tra định dạng mã và lớp hợp lệ.

Nội dung thư/gợi ý có phần AI hỗ trợ soạn từ các yêu cầu đã trao đổi. Nhóm nghiên cứu cần duyệt, chốt phiên bản và ghi nhận phần hỗ trợ trước can thiệp. Bộ app không tự chứng minh hiệu quả nghiên cứu; khảo sát trước/sau và phân tích do nhóm thực hiện.

Lời nhắn hỗ trợ dựa trên từ khóa là lời nhắc tìm người hỗ trợ, không chẩn đoán hay tự thông báo người khác. Trước khi gửi, toàn bộ ô văn bản có từ khóa được thay bằng `[đã ẩn – an toàn]`; bản gốc giữ riêng trên máy và trong bản sao cá nhân. Máy chủ kiểm tra và che lại trước khi ghi Sheet. Bộ lọc theo từ khóa không bảo đảm phát hiện mọi tình huống.


Nếu trình xem HTML chặn bộ nhớ, nút Bắt đầu hiển thị lỗi ngay trong biểu mẫu. Bản demo có lựa chọn **Xem thử không lưu** sau khi phát hiện lỗi lưu: cần chọn chủ động, bài chỉ ở phiên hiện tại, đóng/tải lại sẽ mất và không gửi Sheet. Bản Apps Script thật không cho bỏ qua yêu cầu lưu. Tải HTML về và mở trong Chrome/Edge cho phép lưu dữ liệu để thử lưu nháp lâu dài.


## Rà Backend theo góp ý chốt

Bản 2.3.0 chuyển đường đọc/ghi chống trùng sang cùng Sheets API, kiểm tra kích thước cả cột dẫn xuất và cho nhập lại PIN điều phối ngay trên phiếu khi cache mất. Xem [đối chiếu góp ý](docs/BACKEND_REVIEW.md), [issue thật](docs/issues/README.md), [checklist cấu hình](docs/DEPLOYMENT_CHECKLIST.md), [kế hoạch tải](docs/LOAD_TEST_PLAN.md) và [hướng dẫn học sinh](docs/HUONG_DAN_HOC_SINH.md). Không coi kiểm thử mô phỏng là xác nhận đạt tải hoặc đã triển khai Google.


## Đăng xuất (2.4.0)

Sau khi vào bằng mã, nút **Đăng xuất** xuất hiện trên thanh phiên ở cả máy tính và điện thoại. App thu lại nội dung đang nhập, lưu nháp và bỏ hồ sơ đang chọn trước khi về màn hình nhập mã. Nháp, lịch sử và hàng đợi không bị xóa; dùng lại đúng mã/trường/lớp để tiếp tục. Nếu không lưu được, app giữ màn hình để người dùng tải bản sao thay vì âm thầm mất bài.

Đăng xuất chung xóa token điều phối/giáo viên trong trình duyệt và yêu cầu máy chủ thu hồi token khi kết nối cho phép. Mất mạng hoặc deployment cũ có thể khiến việc thu hồi chưa được xác nhận; token máy chủ còn hạn vẫn tuân theo thời gian hết phiên. Đây không phải mật khẩu bảo vệ dữ liệu cục bộ: người có quyền dùng trình duyệt và biết mã vẫn có thể vào hồ sơ trên máy. Với Xem thử không lưu, dữ liệu chỉ còn đến khi đóng/tải lại trang.

## Tài khoản học sinh (2.5.0)

Bản Apps Script đăng nhập bằng mã có sẵn + mật khẩu riêng được cấp (giữ PIN cũ), kiểm tra đúng trường/lớp trước khi nhận bài; Sheet lưu bài đã che an toàn và bảng tiến độ bốn tuần. Đăng xuất giữ nháp/hàng đợi; đăng nhập trên máy mới tải tiến độ, Sổ khôi phục bài đã xử lý an toàn; bản gốc trước khi che vẫn trên thiết bị cũ/bản sao. Xem [cấp tài khoản và triển khai](docs/TAI_KHOAN_HOC_SINH.md), [issue #8](https://github.com/antonio46-fpt/xoay-chieu/issues/8). Chưa triển khai hay kiểm thử vào Sheet thật.

## Mật khẩu theo danh sách Excel (2.6.0)

Cấu hình lớp được cập nhật theo đợt triển khai (xem mục 2.7 bên dưới); không chứa mã học sinh thật trong source. [Công cụ xuất CSV riêng](tools/import_student_roster.py) chỉ lấy mã/trường/lớp. Chủ dự án nhập CSV qua `importStudentRoster_`, cấp mật khẩu riêng bằng `provisionStudentAccounts_` và tải bảng tài khoản/mật khẩu trong hộp thoại Sheet. Máy chủ xác thực trước khi FE vào học, giữ tương thích PIN cũ; bản HTML ghi rõ demo. Xem [hướng dẫn](docs/TAI_KHOAN_HOC_SINH.md), [issue #9](https://github.com/antonio46-fpt/xoay-chieu/issues/9).

## Tiến trình qua các tuần (2.7.0)

[Hướng dẫn lưu/khôi phục tiến trình](docs/TIEN_TRINH_HOC_TAP.md): nháp và bài cũ của chính tài khoản được tải từ Sheet, tiếp tục đúng bước khi vào tuần sau; đồng bộ có revision để tránh thiết bị cũ ghi đè. Cập nhật thêm **Learning.gs** và chạy setup_ trước New version. Giữ tài khoản/tiến trình Chi Lăng cũ, thêm Lộc Bình; chưa kích hoạt NT-10A6/NT-10A7 khi chưa bốc thăm. [Issue #10](https://github.com/antonio46-fpt/xoay-chieu/issues/10).

## Mã lớp 2.7.1

Giá trị dữ liệu dùng 10A3, 11E1, LB-11A; chú thích chỉ hiển thị. Giữ tương thích tài khoản, mật khẩu, bài và nháp cũ. Cập nhật đồng bộ đủ 5 tệp Apps Script rồi New version, không đổi hàng loạt Sheet gốc. Xem [mã lớp và nâng cấp](docs/MA_LOP.md).

## Quản lý trên Sheet và đồng bộ 1 phút (2.8.0)

Thêm Management.gs, cập nhật đủ sáu tệp Apps Script và chạy setup_ hoặc setupManagement_, rồi New version. Hai trang quan_ly_hoc_sinh và quan_ly_hoc_tap tự hiện tiến độ và câu trả lời an toàn của từng tài khoản. Nháp tự gửi mỗi 60 giây khi có thay đổi; checkpoint nộp/thoát vẫn lưu ngay. Xem [hướng dẫn quản lý Sheet](docs/QUAN_LY_SHEET.md).
