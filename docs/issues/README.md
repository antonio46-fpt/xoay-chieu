# Backend và kiểm chứng triển khai

Cập nhật theo bản **2.8.0**. Có 10 issue đang mở trên GitHub, nhưng chúng chia làm ba loại khác nhau và chỉ một phần có thể đóng bằng sửa mã:

- **Đã xong phần mã (4 issue)** — #8, #9, #10, #11. Chức năng đã hiện thực từ 2.5.0–2.7.1 và có kiểm thử cục bộ; issue còn mở vì chưa nghiệm thu trên Google thật.
- **Việc kiểm thử, không sửa được bằng mã (4 issue)** — #2, #3, #4, #6. Cần deployment Apps Script thật, Sheet thử và điện thoại vật lý.
- **Chờ quyết định nghiên cứu (2 issue)** — #1, #7. Không được tự quyết thay chủ dự án.

## Bảng trạng thái

| Issue | Ưu tiên | Loại | Trạng thái mã 2.8.0 | Còn cần |
|---|---|---|---|---|
| [#3](https://github.com/antonio46-fpt/xoay-chieu/issues/3) `test(be): verify redaction and idempotent submissions` | P1 | Kiểm thử | Đủ 6 tiêu chí kiểm được bằng mã | 20 request đồng thời/2 giây, đọc-sau-ghi liền kề, độ dài ô tối đa trên Sheet thử |
| [#2](https://github.com/antonio46-fpt/xoay-chieu/issues/2) `test(be): verify class-scoped teacher permissions` | P1 | Kiểm thử | Đủ 4 tiêu chí kiểm được bằng mã | Deployment thử, 2 trình duyệt riêng vai trò, cấu hình quyền Google |
| [#4](https://github.com/antonio46-fpt/xoay-chieu/issues/4) `test(be): measure Apps Script capacity` | P2 | Kiểm thử | Khoá và `tryLock(1500)` đã đúng thiết kế | Chủ dự án duyệt mức dừng; đo 40/80 bài đồng thời |
| [#6](https://github.com/antonio46-fpt/xoay-chieu/issues/6) `test(fe): verify real phones and shared-device workflows` | P1 | Kiểm thử | Cảnh báo lưu, tách hồ sơ theo mã, bản LIVE chặn chế độ demo | Android giá rẻ, Android tầm trung, iPhone vật lý |
| [#8](https://github.com/antonio46-fpt/xoay-chieu/issues/8) `feat(be): authenticate student accounts and persist learning progress` | P1 | Đã có mã | `Accounts.gs` — `loginStudent`, `projectStudentProgress_` (từ 2.5.0) | Nghiệm thu trên Sheet thử |
| [#9](https://github.com/antonio46-fpt/xoay-chieu/issues/9) `feat(be): provision roster passwords and require authenticated lesson access` | P1 | Đã có mã | `Accounts.gs` — `importStudentRoster_`, `provisionStudentAccounts_` (từ 2.6.0) | Nghiệm thu trên Sheet thử |
| [#10](https://github.com/antonio46-fpt/xoay-chieu/issues/10) `feat(be): restore weekly learning drafts across student sessions` | P1 | Đã có mã | `Learning.gs` — `getStudentLearning`, `saveStudentDraft` (từ 2.7.0) | Xung đột hai thiết bị trên Google thật |
| [#11](https://github.com/antonio46-fpt/xoay-chieu/issues/11) `fix(be): canonicalize class codes without losing legacy credentials or progress` | P1 | Đã có mã | [classes.js](../../src/classes.js) + `ClassIds` trong `Schema.gs` (từ 2.7.1) | Nghiệm thu tài khoản/bài cũ sau chuẩn hoá |
| [#1](https://github.com/antonio46-fpt/xoay-chieu/issues/1) `feat(be): support approved class rosters in progress reports` | P3 | Chờ quyết định | Cố ý **chưa** lập trình; API vẫn chỉ liệt kê mã đã có bài | Quyết định đồng thuận + ai giữ bảng mã ↔ họ tên |
| [#7](https://github.com/antonio46-fpt/xoay-chieu/issues/7) `docs(be): define handling of pending version 2.1 records` | P2 | Chờ quyết định | Không có migration tự động — đúng thiết kế | Chủ dự án xác nhận có/không có gói 2.1 |

## Những gì không thể đóng bằng sửa mã

Bốn issue kiểm thử (#2, #3, #4, #6) và hai issue chờ quyết định (#1, #7) không có mã để viết thêm. Đóng chúng khi chưa chạy kiểm chứng sẽ trái với nguyên tắc đã ghi trong [BACKEND_REVIEW.md](../BACKEND_REVIEW.md): không coi kiểm thử mô phỏng là xác nhận đạt. Vì vậy các đặc tả dưới đây giữ nguyên tiêu chí nghiệm thu và bổ sung mục **Kiểm toán mã 2.8.0** ghi rõ ô nào đã đạt bằng mã, ô nào còn phải chạy thật.

## Thứ tự thực hiện

1. **#3** — dựng deployment thử và Sheet thử; đây là điều kiện nền cho mọi issue khác.
2. **#2** — dùng chung deployment của #3, thêm `TEACHER_PINS`.
3. **#4** — chỉ đo sau khi #3 và #2 đạt.
4. **#1** — chờ quyết định; #7 chờ chủ dự án xác nhận dữ liệu 2.1.
5. **#6** — thử thiết bị làm song song #3, không phụ thuộc #2.

Người phụ trách và hạn chót vẫn chờ chủ dự án phân công; bản rà soát này không tự gán. Không đưa credential hoặc dữ liệu thật vào issue. Xem [đối chiếu góp ý](../BACKEND_REVIEW.md), [checklist cấu hình](../DEPLOYMENT_CHECKLIST.md), [kế hoạch tải](../LOAD_TEST_PLAN.md) và [hướng dẫn học sinh](../HUONG_DAN_HOC_SINH.md).

## Nội dung chưa đăng được thành issue

[Quản lý Sheet + đồng bộ phút](be-minute-management.md) đã hiện thực trong 2.8.0 và có kiểm thử cục bộ, nhưng **vẫn chưa đăng được issue**: GitHub API trả `Forbidden` cho cả GraphQL và REST. Không có số issue để dẫn hoặc đóng. Khi đăng được, đây sẽ là issue thứ 11 và nên mở ở trạng thái "code complete, chờ nghiệm thu".
