/**
 * KIỂM TRA BẢN SAO TRƯỚC KHI KHÔI PHỤC
 * Không bỏ hàng đợi chưa gửi, không tự gửi dữ liệu vừa nhập lại.
 * Khôi phục chỉ được phép khi máy đích chưa có dữ liệu ứng dụng.
 */
const Backup = (() => {
  const core = typeof module !== 'undefined' ? require('./core.js') : Core;
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const string = value => typeof value === 'string';
  const fail = message => {
    throw new Error(message);
  };

  function restore(value, content) {
    if (!plain(value) || !plain(value.profiles) || !Array.isArray(value.queue)) {
      fail('Không đúng bản sao toàn bộ Xoay Chiều.');
    }
    // Chỉ nhận cấu trúc dữ liệu thuần, không cho khóa prototype chen vào đối tượng.
    const clean = JSON.parse(JSON.stringify(value, (key, val) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail(
        'Tệp có khóa không hợp lệ.');
      return val;
    }));
    const validProfile = p => plain(p) && core.validCode(p.ma) &&
      core.schools(content).some(s => s.truong === p.truong && s.lop.includes(p.lop));
    const validRecord = record => {
      if (!plain(record) || !string(record.id) || !/^[a-zA-Z0-9-]{12,80}$/.test(record.id)) {
        fail('Bản ghi trong bản sao thiếu ID hợp lệ.');
      }
      if (!['chu_trinh', 'phieu_buoi', 'doi_y'].includes(record.loai)) fail(
        'Loại bản ghi không hợp lệ.');
      if (!Number.isInteger(record.tuan) || !content.weeks.some(w => w.tuan === record.tuan))
        fail('Tuần không hợp lệ.');
      if (record.loai === 'chu_trinh' && !validProfile(record)) fail(
        'Mã/trường/lớp không hợp lệ.');
      // Bản ghi máy chủ là đối tượng phẳng; không nhận HTML hay hàm để thực thi.
      Object.values(record).forEach(v => {
        if (!['string', 'number', 'boolean'].includes(typeof v)) fail(
          'Kiểu giá trị bản ghi không hợp lệ.');
      });
    };
    for (const [key, profile] of Object.entries(clean.profiles)) {
      let parts;
      try {
        parts = JSON.parse(key);
      } catch {
        fail('Khóa hồ sơ không hợp lệ.');
      }
      if (!Array.isArray(parts) || parts.length !== 3) fail('Khóa hồ sơ không hợp lệ.');
      const owner = {
        truong: parts[0],
        lop: parts[1],
        ma: parts[2]
      };
      if (!validProfile(owner) || !plain(profile) || !plain(profile.drafts) || !Array.isArray(
          profile.history)) {
        fail('Hồ sơ trong bản sao không hợp lệ.');
      }
      profile.history.forEach(item => {
        validRecord(item.record);
        if (core.key(item.record) !== key) fail('Bài không khớp hồ sơ sở hữu.');
        item.sent = item.sent === true;
      });
      for (const [weekId, draft] of Object.entries(profile.drafts)) {
        const week = content.weeks.find(w => w.tuan === Number(weekId));
        if (!week || !plain(draft) || !plain(draft.answers) || !string(draft.id) ||
          !/^[a-zA-Z0-9-]{12,80}$/.test(draft.id) || !isFinite(Date.parse(draft.started)) ||
          !Number.isInteger(draft.step) || draft.step < 0 || draft.step >= week.steps.length ||
          !Number.isFinite(draft.activeMs) || draft.activeMs < 0) fail(
          'Bản nháp không hợp lệ.');
        Object.values(draft.answers).forEach(v => {
          if (!['string', 'number'].includes(typeof v)) fail(
            'Câu trả lời nháp không hợp lệ.');
        });
        draft.stageTimes = plain(draft.stageTimes) ? draft.stageTimes : {};
        draft.hints = plain(draft.hints) ? draft.hints : {};
      }
    }
    const ids = new Set();
    clean.queue.forEach(item => {
      validRecord(item.record);
      if (ids.has(item.record.id)) fail('Hàng đợi có ID lặp.');
      ids.add(item.record.id);
      item.paused = true;
      item.attempts = 0;
      item.nextTryAt = 0;
      item.error = 'Được khôi phục từ bản sao. Bấm Gửi lại để tiếp tục.';
    });
    if (clean.current && !validProfile(clean.current)) fail('Mã hiện tại không hợp lệ.');
    clean.theme = clean.theme === 'dark' ? 'dark' : 'light';
    return clean;
  }
  return {
    restore
  };
})();
if (typeof module !== 'undefined') module.exports = Backup;
