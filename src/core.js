/**
 * LOGIC THUẦN — dùng trên trình duyệt và trong các kiểm thử Node.js.
 *
 * Không chỉnh sửa văn bản đầu vào. trim() chỉ phục vụ kiểm tra độ dài.
 * Bản ghi giữ nguyên khoảng trắng, dấu câu và xuống dòng của học sinh.
 */
const Core = (() => {
  const words = value => String(value ?? '').trim().split(/\s+/u).filter(Boolean).length;
  const normalize = value => String(value ?? '').toUpperCase().replace(/\s/g, '');
  const validCode = value => /^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(value);

  // Mọi văn bản tự do đều được escape trước khi chèn vào HTML.
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  } [char]));

  function validate(field, value) {
    if (field.kind === 'rating') {
      return [1, 2, 3].includes(Number(value)) ? '' : 'Hãy chọn một mức tự đánh giá.';
    }
    if (field.options) {
      return field.options.includes(value) ? '' : 'Hãy chọn một phương án.';
    }
    if (!String(value ?? '').trim()) return 'Bạn chưa viết phần này.';
    if (String(value).length > field.max) {
      return `Tối đa ${field.max} ký tự. Nội dung của bạn chưa bị cắt.`;
    }
    return words(value) < field.min ?
      `Hãy viết ít nhất ${field.min} từ (hiện có ${words(value)}).` :
      '';
  }

  // Cùng một mã ở hai lớp khác nhau không trộn bản nháp và sản phẩm.
  const key = profile => JSON.stringify([profile.truong, profile.lop, profile.ma]);
  const id = () => globalThis.crypto?.randomUUID?.() ||
    'xc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

  /** Tạo gói bất biến cho một lần nộp. Không tạo lại gói khi gửi lại vì lỗi mạng. */
  function record(draft, profile, week, appVersion = '2.4.0') {
    const answers = draft.answers;
    const result = {
      id: draft.id,
      loai: 'chu_trinh',
      thoi_gian: new Date().toISOString(),
      bat_dau: draft.started,
      ma: profile.ma,
      truong: profile.truong,
      lop: profile.lop,
      tuan: week.tuan,
      phien_ban_app: appVersion,
      phien_ban_noi_dung: draft.version,
      thoi_luong_giay: Math.round(draft.activeMs / 1000),
      thoi_gian_troi_giay: Math.max(0, Math.round((Date.now() - Date.parse(draft.started)) /
        1000)),
      ban_goc_id: draft.sourceId || '',
    };
    const fields = [
      'thu_lam', 'nghi_1', 'nghi_2', 'nghi_3', 'noi', 'dang_san_pham',
      'san_pham', 'chia_se', 'tu_danh_gia', 'phe', 'doi_hay_giu',
      'kiem_soat', 'ngoai_kiem_soat',
    ];
    fields.forEach(field => {
      result[field] = answers[field] ?? '';
    });

    // Tuần 3: tiền tố được quy định trong yêu cầu DOCX; phần học sinh viết
    // vẫn giữ nguyên. Không sửa chính tả, tóm tắt hoặc đánh giá nội dung.
    if (week.quy_trinh === 'tranh_luan_45') {
      result.nghi_1 = (answers.phe.startsWith('A') ? 'Phe A: ' : 'Phe B: ') + answers.nghi_1;
      result.chia_se = answers.doi_hay_giu + ': ' + answers.chia_se;
    }
    // Tuần 4: giữ cả hai ô gốc và một cột thu_lam để nhóm phân tích cùng schema.
    if (week.quy_trinh === 'trien_lam_45') {
      result.thu_lam = 'Phần mình thay đổi được:\n' + answers.kiem_soat +
        '\n\nPhần mình không thay đổi được:\n' + answers.ngoai_kiem_soat;
    }
    result.tu_danh_gia = Number(result.tu_danh_gia);
    return result;
  }

  /** Giãn lần thử sau khi lỗi, thêm jitter để các máy không thử cùng một lúc. */
  function retryDelay(attempt, random = Math.random, config = {}) {
    const base = config.retryBaseMs || 5000;
    const maximum = config.retryMaxMs || 120000;
    return Math.min(maximum, base * 2 ** Math.min(5, Math.max(0, attempt - 1))) +
      Math.floor(random() * 2000);
  }

  const safety = typeof module !== 'undefined' ? require('./safety.js') : Safety;
  return {
    schools: content => [...content.truong_lop, ...(content.truong_lop_cu || [])],
    safeRecord: safety.redactRecord,
    safetyMatches: safety.matches,
    words,
    normalize,
    validCode,
    esc,
    validate,
    key,
    id,
    record,
    retryDelay
  };
})();
if (typeof module !== 'undefined') module.exports = Core;
