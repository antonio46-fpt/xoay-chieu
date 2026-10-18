/** Chính sách dùng chung trước khi gửi và trước khi ghi Sheet. Không sửa bản gốc trên máy. */
const Safety = (() => {
  const hidden = '[đã ẩn – an toàn]';
  const normalize = value => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .replace(/[\u200b-\u200d\ufeff]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  function matches(value, config) {
    const text = normalize(value);
    return (config?.tu_khoa || []).some(word => normalize(word) && text.includes(normalize(word)));
  }
  function redactRecord(record, config) {
    const result = { ...record };
    const fields = record.loai === 'chu_trinh' ?
      ['thu_lam', 'nghi_1', 'nghi_2', 'nghi_3', 'noi', 'san_pham', 'chia_se', 'kiem_soat', 'ngoai_kiem_soat'] :
      record.loai === 'phieu_buoi' ? ['khung_gio', 'dieu_tot', 'kho_khan', 'dieu_phoi_vien_viet_tat'] :
      ['nhom', 'vi_sao'];
    fields.forEach(key => {
      if (typeof result[key] === 'string' && matches(result[key], config)) result[key] = hidden;
    });
    // Giữ quy tắc ánh xạ, đồng thời tránh rò nội dung qua cột tổng hợp.
    if (record.loai === 'chu_trinh' && record.tuan === 3) {
      if (result.nghi_1 === hidden) result.nghi_1 = (String(record.phe).startsWith('A') ? 'Phe A: ' : 'Phe B: ') + hidden;
      if (result.chia_se === hidden) result.chia_se = record.doi_hay_giu + ': ' + hidden;
    }
    if (record.loai === 'chu_trinh' && record.tuan === 4) {
      result.thu_lam = 'Phần mình thay đổi được:\n' + result.kiem_soat +
        '\n\nPhần mình không thay đổi được:\n' + result.ngoai_kiem_soat;
    }
    return result;
  }
  return { hidden, matches, redactRecord };
})();
if (typeof module !== 'undefined') module.exports = Safety;
