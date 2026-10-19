## Bối cảnh và hiện trạng

Client đã che ô có từ khóa trước RPC; máy chủ áp dụng lại trước ghi RAW. Đã có mock tests cho bốn tuần, cột dẫn xuất, retry và xung đột ID. Cần kiểm chứng trên Sheets API/LockService thật của deployment thử, nhất là mất ACK và nộp đồng thời.

## Phạm vi và API

`submitRecord({record,token})` giữ `{ok,id,duplicate}` hoặc `{ok:false,code,error}`. Cùng ID + cùng bản đã che xác nhận lại; cùng ID + nội dung khác trả `ID_CONFLICT`; ID mới thêm dòng. Không sửa bản ghi cũ hay tự đổi ID để né xung đột.

## Tiêu chí nghiệm thu

- [ ] Request từ FE không chứa nguyên văn ô nhạy cảm; local history vẫn có bản gốc.
- [ ] Gọi máy chủ trực tiếp bỏ qua client vẫn không ghi nguyên văn ô có từ khóa.
- [ ] Tuần 3 giữ tiền tố, tuần 4 giữ cột tổng hợp nhưng không lộ lại nội dung đã che.
- [ ] RAW không thực thi chuỗi bắt đầu bằng `=`, `+`, `-`, `@` thành công thức.
- [ ] Retry sau mất ACK, reload và khôi phục bản sao tạo đúng một dòng cho cùng ID.
- [ ] Hai request cùng ID đồng thời không tạo hai dòng; nội dung khác bị từ chối.

## Kiểm thử

Chỉ dùng mã và nội dung giả trên Sheet thử. Mô phỏng mất ACK, tắt/bật mạng, gửi đồng thời, lỗi quota và BUSY. Không ghi request nguyên văn hoặc token vào log. Đính kèm kết quả đã loại credential.

## Ưu tiên và phụ thuộc theo góp ý chốt Backend

- Ưu tiên: **P1**, thực hiện đầu tiên; không phụ thuộc issue khác.
- Người phụ trách: chờ chủ dự án phân công; hạn dự kiến chờ lịch chạy thử.
- Quy trình gói 2.1 được tách sang #7 (https://github.com/antonio46-fpt/xoay-chieu/issues/7), không mặc định cho phép sửa dữ liệu cũ.

## Bổ sung nghiệm thu tích hợp (chưa chạy trên Google)

- [ ] Gửi **20 request cùng ID trong 2 giây** trên deployment thử: đúng 1 dòng; các lần còn lại duplicate:true hoặc BUSY. Nếu timeout/quota, ghi nhận là không đạt mục tiêu đề xuất; không bỏ khỏi báo cáo.
- [ ] Đối chiếu request kế tiếp ngay sau khi nhả khóa: đọc được dòng vừa append bằng cùng Sheets API.
- [ ] Gửi lại bản ghi có số, boolean, ô rỗng, xuống dòng, khoảng trắng cuối và chuỗi bắt đầu bằng dấu nháy đơn: duplicate:true, không ID_CONFLICT giả.
- [ ] Từng ô ở đúng độ dài tối đa JSON, kể cả cột tổng hợp tuần 4, ghi/đọc nguyên vẹn.

## Đã sửa và kiểm thử cục bộ

Đường submit đọc tiêu đề/ID/bản ghi và append cùng Sheets API, UNFORMATTED_VALUE, khóa bao trùm toàn bộ. So sánh đúng kiểu số/boolean, coi ô trống bị lược cuối hàng là rỗng; chuỗi không trim/chuyển kiểu. Build áp giới hạn nội bộ 13.000 UTF-16 code units, kiểm tra tiền tố tuần 3 và tổng hợp tuần 4. `tests/backend-review.cjs` đã kiểm tra burst **tuần tự trong fixture**, không thay cho 20 request đồng thời trên Google.
