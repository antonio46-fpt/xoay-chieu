/**
 * Mã lớp, nhãn hiển thị và khóa lưu trên máy.
 *
 * Ba thứ này tách riêng có chủ đích:
 * - `labels` là chữ hiện ra; đổi tự do, không ảnh hưởng dữ liệu đã lưu.
 * - `keyLabels` là khóa lưu trong trình duyệt; PHẢI giữ nguyên giá trị cũ, nếu đổi
 *   thì nháp và bài đã lưu trên máy học sinh sẽ không tìm thấy nữa.
 * - `aliases` quy mã cũ về mã mới, chỉ áp dụng đúng trường để không lẫn lớp trùng
 *   tên giữa hai trường (Chu Văn An và Chi Lăng đều từng có 12A2).
 */
const ClassIds = (() => {
  // Nhãn hiển thị theo bảng TONG_QUAN của danh sách 8 lớp (28/10/2026).
  const labels = {
    '10A3': '10A3 (10 Tin)',
    '11E1': '11E1 (11 Văn)',
    '10D3': '10D3 (10 Trung)',
    '11 Lý': '11 Lý',
    'LB-11A': '11A – Lộc Bình',
    'LB-11B': '11B – Lộc Bình',
    'CL-12A2': '12A2 – Chi Lăng',
    'CL-12A7': '12A7 – Chi Lăng'
  };
  // Khóa lưu cũ, giữ đúng như bản 2.7.1 để không mất nháp đã có trên máy học sinh.
  const keyLabels = {
    '10A3': '10A3 (10 Tin)',
    '11E1': '11E1 (11 Văn)',
    'LB-11A': 'LB-11A (11A Lộc Bình)',
    'CL-12A2': '12A2'
  };
  const aliases = [['THPT Chi Lăng', '12A2', 'CL-12A2']];

  const code = (value, truong) => {
    const byLabel = Object.keys(labels).find(key => labels[key] === value);
    const current = byLabel || value;
    const alias = aliases.find(item => item[1] === current &&
      (truong === undefined || item[0] === truong));
    return alias ? alias[2] : current;
  };
  const label = value => labels[code(value)] || value;
  // Lớp mới chưa từng lưu trên máy thì dùng chính mã lớp làm khóa, ổn định lâu dài.
  const storeLabel = value => {
    const resolved = code(value);
    return keyLabels[resolved] || resolved;
  };
  const profile = value => value && typeof value === 'object' ?
    {...value, lop: code(value.lop, value.truong)} : value;
  // Không gửi khóa này lên Sheet; máy chủ luôn nhận mã lớp chuẩn.
  const storageKey = value => JSON.stringify([value.truong, storeLabel(value.lop), value.ma]);
  return {code, label, profile, storageKey};
})();
if (typeof module !== 'undefined') module.exports = ClassIds;
