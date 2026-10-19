# Kế hoạch đo tải đề xuất — chưa được duyệt/chưa chạy

Phụ thuộc #3 (đúng dữ liệu/không trùng) và #2 (đúng quyền) đạt trên deployment thử. Phải có chủ dự án duyệt sĩ số, lịch trùng giờ, người chạy, thời gian chạy và mức dừng. Không chạy lên hệ thống chính thức.

| Kịch bản | Tải | Mục tiêu đề xuất |
|---|---|---|
| Một lớp cuối buổi | 40 bài trong 60 giây | ACK đủ ID trong 5 phút; không mất/trùng |
| Hai lớp cùng giờ | 80 bài trong 60 giây | ACK đủ ID trong 10 phút; không mất/trùng |
| Đầu buổi điều phối | 4 đăng nhập + 40 bài cùng lúc | đăng nhập đủ trong 30 giây; đo riêng thời gian ACK bài |
| Chống trùng | 20 request cùng ID trong 2 giây | 1 dòng, còn lại duplicate:true/BUSY; báo riêng timeout/quota |

Trước chạy: dùng mã giả, ID duy nhất, nội dung không nhạy cảm; ghi thời điểm bấm gửi, lần retry và ACK. Dùng nhịp retry/backoff của app, không vô hiệu hóa giới hạn. Dừng nếu quota liên tục, lỗi quyền, sai dữ liệu hoặc vượt mức đã duyệt. Không chạy một batch 150 request chỉ để suy ra năng lực 150 học sinh.

Báo cáo từng kịch bản: số ID dự kiến, số ACK, ID thiếu/trùng, p50/p95 từ bấm đến ACK, số BUSY/quota/timeout, số retry và thời gian xử lý hết hàng đợi. Đối chiếu ID với Sheet thử. Nếu chưa đạt, đề xuất nộp lệch nhóm 1–2 phút và chạy lại kịch bản đã duyệt.

## Nguồn cần đối chiếu trước chạy

- Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas
- Sheets API usage limits: https://developers.google.com/workspace/sheets/api/limits
- Values.get và UNFORMATTED_VALUE: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- Giới hạn tệp Google Sheets: https://support.google.com/drive/answer/37603

Ngày rà nguồn trong môi trường này: 19/10/2026. Các trang Google trả lỗi mạng proxy 403, nên chưa xác minh được hạn mức hiện hành. Không coi con số 30 lượt thực thi/tài khoản hoặc 50.000 ký tự/ô trong góp ý là số đã xác minh. Mã áp giới hạn nội bộ bảo thủ 13.000 UTF-16 code units, không phụ thuộc việc mặc định hạn mức Google. `login*` và submit vẫn dùng chung script lock với tryLock 1,5 giây; phải ghi tác động này trong báo cáo.

## Mẫu kết quả

Trạng thái: UNRUN. Người chạy: chờ phân công. Deployment/Sheet thử: ghi trong hồ sơ riêng. Kịch bản được duyệt: chờ. Số liệu ACK/độ trễ/lỗi/ID: chưa có. Kết luận: chưa được tuyên bố đạt tải dự kiến.
