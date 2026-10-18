# Backend issue drafts

Trạng thái: **chưa đăng lên GitHub**. Git push hoạt động nhưng GitHub API trả `Forbidden`. Đề xuất mở `api.github.com` đã được lưu trong cấu hình môi trường; cần áp dụng và kiểm tra lại quyền API. Không đưa credential vào các tệp này.

| Tiêu đề issue theo convention | Nội dung |
|---|---|
| `feat(be): support approved class rosters in progress reports` | [Roster lớp](be-class-roster.md) |
| `test(be): verify class-scoped teacher permissions on Apps Script` | [Quyền tiến độ](be-progress-permissions.md) |
| `test(be): verify redaction and idempotent submissions on test Sheets` | [An toàn và chống trùng](be-submission-integrity.md) |
| `test(be): measure Apps Script capacity for the planned cohort` | [Tải dự kiến](be-capacity.md) |

Sau khi API hoạt động, kiểm tra issue đã có để tránh trùng trước khi tạo. Ví dụ:

```bash
gh issue create --repo antonio46-fpt/xoay-chieu \
  --title 'feat(be): support approved class rosters in progress reports' \
  --body-file docs/issues/be-class-roster.md
```

Không đánh dấu các bản nháp là issue đã đăng khi chưa có URL/số issue từ GitHub. Không cần viết lại backend hiện có chỉ để đóng issue kiểm chứng; ghi rõ lỗi thật nếu kiểm thử tích hợp phát hiện vấn đề.
