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
- [ ] Có hướng dẫn xử lý gói 2.1 đã ghi nguyên văn nhưng chưa nhận ACK trước nâng cấp; không tự sửa Sheet hoặc đổi ID.

## Kiểm thử

Chỉ dùng mã và nội dung giả trên Sheet thử. Mô phỏng mất ACK, tắt/bật mạng, gửi đồng thời, lỗi quota và BUSY. Không ghi request nguyên văn hoặc token vào log. Đính kèm kết quả đã loại credential.
