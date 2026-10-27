/** Mã dữ liệu và nhãn hiển thị. Chỉ các bí danh liệt kê chính xác mới được quy đổi. */
const ClassIds = (() => {
  const labels = {'10A3':'10A3 (10 Tin)','11E1':'11E1 (11 Văn)','LB-11A':'LB-11A (11A Lộc Bình)'};
  const code = value => Object.keys(labels).find(key => labels[key] === value) || value;
  const label = value => labels[code(value)] || value;
  const profile = value => value && typeof value === 'object' ? {...value,lop:code(value.lop)} : value;
  // Khóa trên máy giữ nguyên để không tách hồ sơ đã lưu trước 2.7.1. Không gửi khóa này lên Sheet.
  const storageKey = value => JSON.stringify([value.truong,label(value.lop),value.ma]);
  return {code,label,profile,storageKey};
})();
if (typeof module !== 'undefined') module.exports = ClassIds;
