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

## Ưu tiên, phụ thuộc và cấu hình

- Ưu tiên **P1**, sau #3 có deployment thử đạt các kiểm tra nền tảng.
- Người phụ trách và hạn dự kiến: chờ chủ dự án phân công/chốt lịch.
- Quyền Drive, Execute as, Who has access, Script Properties và người được sửa thuộc [checklist cấu hình](../DEPLOYMENT_CHECKLIST.md), không được coi là hoàn tất chỉ bằng sửa mã.

## Bổ sung nghiệm thu

- [ ] Sai PIN 8 lần từ máy học sinh: lần thứ 8 trả RATE_LIMITED và retryAfterSeconds; thử trong thời gian khóa trả số giây còn lại, không kéo dài hạn khóa vì nhấn lại.
- [ ] Hết thời gian chờ, PIN hợp lệ đăng nhập được; mô tả rõ phương án vận hành cho GVCN.
- [ ] Xóa token cache giữa buổi: điều phối được nhập lại PIN ngay trên màn hình; các phiếu, hàng đợi và đồng hồ giữ nguyên. Giáo viên trở lại đúng trường/lớp đã chọn khi yêu cầu PIN lại.
- [ ] Có ảnh chụp hoặc mô tả cấu hình deployment/Sheet thử đã loại thông tin nhận diện và credential.

## Phương án hiện tại

Giữ giới hạn 8 lần/10 phút, chọn cách **hiển thị thời gian chờ còn lại** và chờ hết khóa; không tự thêm PIN dự phòng. Bộ đếm vẫn theo lớp nên chưa loại bỏ được nguy cơ bị cố tình khóa lớp. Cần nhóm nghiên cứu chấp thuận phương án hoặc yêu cầu quy trình dự phòng trước triển khai thật. Cache token/bộ đếm có thể bị Google loại sớm: không bảo đảm phiên đủ 6 giờ hay giữ bộ đếm đủ 10 phút. Test cục bộ đã kiểm tra hết phiên và khôi phục phiếu, tích hợp Google vẫn để mở.
