# Backend và kiểm chứng triển khai

Đã đăng và xác minh 7 issue thật trên GitHub, cập nhật theo góp ý chốt Backend. Thứ tự #3 → #2 → #4 → #1; thử thiết bị làm song song. Các kiểm tra Google/điện thoại chưa chạy nên issue vẫn Open. Người phụ trách và hạn chờ chủ dự án chốt; không tự gán.

| Issue | Ưu tiên | Tiêu đề | Nội dung tham chiếu |
|---|---|---|---|
| [#1](https://github.com/antonio46-fpt/xoay-chieu/issues/1) | P3 | `feat(be): support approved class rosters in progress reports` | [Nội dung](be-class-roster.md) |
| [#2](https://github.com/antonio46-fpt/xoay-chieu/issues/2) | P1 | `test(be): verify class-scoped teacher permissions on Apps Script` | [Nội dung](be-progress-permissions.md) |
| [#3](https://github.com/antonio46-fpt/xoay-chieu/issues/3) | P1 | `test(be): verify redaction and idempotent submissions on test Sheets` | [Nội dung](be-submission-integrity.md) |
| [#4](https://github.com/antonio46-fpt/xoay-chieu/issues/4) | P2 | `test(be): measure Apps Script capacity for the planned cohort` | [Nội dung](be-capacity.md) |
| [#6](https://github.com/antonio46-fpt/xoay-chieu/issues/6) | P1 | `test(fe): verify real phones and shared-device workflows` | [Nội dung](qa-real-devices.md) |
| [#8](https://github.com/antonio46-fpt/xoay-chieu/issues/8) | P1 | `feat(be): authenticate student accounts and persist learning progress` | [Tài khoản và nghiệm thu](../TAI_KHOAN_HOC_SINH.md) |
| [#7](https://github.com/antonio46-fpt/xoay-chieu/issues/7) | P2 | `docs(be): define handling of pending version 2.1 records` | [Nội dung](ops-legacy-21.md) |

#1 tạm dừng code, chờ quyết định tự nguyện/đồng thuận. #4 chờ duyệt tải; xử lý 2.1 có quyết định nghiên cứu riêng. Không đưa credential hoặc dữ liệu thật vào issue. Xem [đối chiếu góp ý](../BACKEND_REVIEW.md), [checklist cấu hình](../DEPLOYMENT_CHECKLIST.md), [kế hoạch tải](../LOAD_TEST_PLAN.md) và [hướng dẫn học sinh](../HUONG_DAN_HOC_SINH.md).
