/**
 * CẤU HÌNH ỨNG DỤNG
 *
 * HTML/CSS/JavaScript chạy trên trình duyệt. Khi Index.html được phục vụ bởi
 * Google Apps Script, app tự dùng google.script.run để gọi máy chủ Code.gs.
 * Bản HTML độc lập không tự gửi dữ liệu vào một Sheet không xác định.
 * Nội dung giáo dục được sửa riêng trong content.json.
 */
const APP_CONFIG = Object.freeze({
  version: '2.8.0',
  authRequired: false, // build.py đặt true riêng cho bản Apps Script; mất bridge phải chặn đăng nhập.
  // Học sinh chỉ cần mã + trường/lớp, không cần mật khẩu. Đặt true để bắt buộc mật khẩu;
  // khi đó phải đặt Script Property STUDENT_LOGIN_MODE = mat_khau cho khớp với máy chủ.
  requireStudentPassword: false,
  storageKey: 'xoaychieu_v2', // Giữ khóa cũ để không mất bài phiên bản 2.0.
  rpcTimeoutMs: 30000,
  syncIntervalMs: 60000, // Tự đồng bộ nháp có thay đổi mỗi phút khi trang đang mở.
  retryBaseMs: 5000,
  retryMaxMs: 120000,
  maxBackupBytes: 10000000,
});
