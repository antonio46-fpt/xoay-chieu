## Bối cảnh và hiện trạng

Đã có `loginTeacher`, `getClassProgress`, `logoutTeacher`, `TEACHER_PINS`, phiên teacher/coord tách nhau và test mock. FE đã nối RPC. Chưa xác minh trên deployment Google Apps Script và quyền Google thật của Sheet thử. Issue này kiểm chứng tích hợp, không yêu cầu viết lại API đã có.

## Phạm vi và API

- `loginTeacher({truong,lop,pin})` → `{ok,token,expires}` hoặc `{ok:false,code,error}`.
- `getClassProgress({token,truong,lop})` → `{ok:true,students:[{ma,weeks}]}`.
- `logoutTeacher(token)` → `{ok:true}` và thu hồi phiên.
- `loginCoordinator`/`submitRecord` giữ quyền độc lập; không thêm API đọc bài riêng tư.

## Tiêu chí nghiệm thu

- [ ] PIN giáo viên đúng/sai và giới hạn thử PIN hoạt động trên deployment thử.
- [ ] Token sai, hết hạn, bị thu hồi, token điều phối và yêu cầu đổi lớp đều bị từ chối.
- [ ] Giáo viên chỉ nhận mã + tuần của đúng lớp, không nhận bài, sản phẩm, mức tự đánh giá hoặc metadata ngoài contract.
- [ ] Token giáo viên không nộp được phiếu điều phối.
- [ ] GVCN không có quyền mở Sheet nguồn; nhóm nghiên cứu/GV hướng dẫn chỉ có quyền do chủ dự án cấp.
- [ ] Ghi bằng chứng request/response đã loại credential và chỉ chứa mã thử.

## Kiểm thử

Tạo Sheet/deployment thử, cấu hình PIN thử bằng Script Properties ngoài Git, dùng trình duyệt riêng cho từng vai trò. Test luồng đăng nhập/làm mới/hết phiên/đăng xuất. Không kiểm thử với Sheet chính thức hoặc dữ liệu học sinh thật.
