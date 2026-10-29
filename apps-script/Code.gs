/**
 * XOAY CHIỀU — MÁY CHỦ GOOGLE APPS SCRIPT, phiên bản 2.8.0.
 *
 * Các điểm vào từ trình duyệt:
 *   doGet()                  → phục vụ giao diện Index.html.
 *   submitRecord(payload)    → kiểm tra, chống trùng và ghi vào Google Sheets.
 *   loginCoordinator(input)  → xác thực PIN của đúng trường/lớp.
 *
 * Các hàm kết thúc bằng '_' là hàm nội bộ, không gọi được qua google.script.run.
 * API tiến độ chỉ trả mã và tuần, xác thực bằng phiên giáo viên của đúng lớp. Phiên giáo viên không đọc bài/nháp riêng; Learning.gs chỉ trả bài của chính học sinh đã xác thực.
 */
const SERVER_VERSION = '2.8.0';

const HEADERS = {
  chu_trinh: [
    'id', 'thoi_gian_nhan', 'thoi_gian', 'bat_dau', 'ma', 'truong', 'lop', 'tuan',
    'thu_lam', 'nghi_1', 'nghi_2', 'nghi_3', 'noi', 'dang_san_pham', 'san_pham',
    'chia_se', 'tu_danh_gia', 'thoi_luong_giay', 'thoi_gian_troi_giay', 'phe',
    'doi_hay_giu', 'kiem_soat', 'ngoai_kiem_soat', 'ban_goc_id',
    'phien_ban_app', 'phien_ban_noi_dung',
  ],
  phieu_buoi: [
    'id', 'thoi_gian_nhan', 'thoi_gian', 'truong', 'lop', 'tuan', 'ngay', 'khung_gio',
    'thoi_luong_thuc_te_phut', 'si_so', 'so_tham_gia', 'da_lam_mo_thu', 'da_lam_thu',
    'da_lam_nghi', 'da_lam_noi', 'da_lam_chia_se', 'dung_app_hay_giay',
    'dieu_tot', 'kho_khan', 'dieu_phoi_vien_viet_tat', 'phien_ban_app',
  ],
  doi_y: [
    'id', 'thoi_gian_nhan', 'thoi_gian', 'truong', 'lop', 'tuan', 'nhom',
    'doi_hay_giu', 'vi_sao', 'phien_ban_app',
  ],
};

/** Chạy MỘT LẦN trong editor, từ dự án Apps Script gắn với Sheet mới. */
function setup_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Hãy mở Apps Script từ Google Sheet mới.');

  // Kiểm tra dịch vụ trước khi sửa cấu hình. Cần Services → Google Sheets API.
  Sheets.Spreadsheets.get(spreadsheet.getId(), {
    fields: 'spreadsheetId'
  });
  for (const name of Object.keys(HEADERS)) {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    const columns = HEADERS[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, columns.length)
        .setFontWeight('bold').setBackground('#1e2a5e').setFontColor('#ffffff');
    } else if (!headersMatch_(sheet, columns)) {
      throw new Error('Cột ' + name + ' không khớp. Dùng Sheet mới; không ghi đè dữ liệu cũ.');
    }
  }
  setupStudentStorage_(spreadsheet);
  setupManagement_(spreadsheet);
  PropertiesService.getScriptProperties()
    .setProperty('SPREADSHEET_ID', spreadsheet.getId());
}

/** HTML Service hỗ trợ google.script.run và tự thực thi trong iframe bảo vệ. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Xoay Chiều — Hành trình 4 tuần')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function headersMatch_(sheet, columns) {
  return JSON.stringify(sheet.getRange(1, 1, 1, columns.length).getValues()[0]) ===
    JSON.stringify(columns);
}

function schoolOK_(data) {
  return SCHEMA.schools.some(s => s.truong === data.truong && s.lop.includes(ClassIds.code(data.lop)));
}

function count_(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function fail_(message, code = 'INVALID_RECORD') {
  const error = new Error(message);
  error.code = code;
  throw error;
}

/** Chỉ kiểm tra, không trim và không cắt văn bản sẽ được lưu. */
function text_(value, name, minWords, maxLength) {
  if (typeof value !== 'string' || (value !== Safety.hidden && count_(value) < minWords) || value.length > maxLength) {
    fail_('Phần ' + name + ' cần ít nhất ' + minWords + ' từ, tối đa ' + maxLength + ' ký tự.');
  }
}

function num_(value, min, max) {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

function valid_(data) {
  if (SCHEMA.cellMax !== 13000) fail_('Schema không cùng phiên bản. Hãy cập nhật đồng bộ Code.gs, Schema.gs và Index.html.', 'SETUP_REQUIRED');
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
    JSON.stringify(data).length > 100000) fail_('Bản ghi không hợp lệ hoặc quá lớn.');
  if (!Object.prototype.hasOwnProperty.call(HEADERS, data.loai)) fail_(
    'Loại bản ghi không hợp lệ.');
  if (typeof data.id !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(data.id)) fail_(
    'ID bản ghi không hợp lệ.');
  if (!schoolOK_(data)) fail_('Trường/lớp không thuộc danh sách.');
  if (!Number.isInteger(data.tuan) || data.tuan < 1 || data.tuan > SCHEMA.weeks.length) {
    fail_('Tuần không hợp lệ.');
  }
  if (typeof data.thoi_gian !== 'string' || !isFinite(Date.parse(data.thoi_gian))) fail_(
    'Thời gian không hợp lệ.');

  // Mỗi ô chỉ được là kiểu đơn giản; từ chối đối tượng lồng nhau bất thường.
  Object.entries(data).forEach(([name, value]) => {
    if (!HEADERS[data.loai].includes(name) && name !== 'loai') fail_(
      'Trường dữ liệu không được hỗ trợ: ' + name);
    if (!['string', 'number', 'boolean'].includes(typeof value)) fail_(
      'Kiểu dữ liệu không hợp lệ: ' + name);
    if (typeof value === 'string' && value.length > SCHEMA.cellMax) fail_('Giá trị quá dài: ' + name);
  });

  if (data.loai === 'chu_trinh') validateStudent_(data);
  else if (data.loai === 'phieu_buoi') validateSession_(data);
  else validateDebate_(data);
}

function validateStudent_(data) {
  if (typeof data.ma !== 'string' || !/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(data.ma)) {
    fail_('Mã học sinh không hợp lệ.');
  }
  // Schema sinh từ cùng content.json với giao diện, tránh lệch quy tắc hai phía.
  SCHEMA.weeks[data.tuan - 1].forEach(field => {
    const value = data[field.key];
    if (field.kind === 'rating') {
      if (![1, 2, 3].includes(value)) fail_('Chưa chọn mức tự đánh giá.');
    } else if (field.options) {
      if (!field.options.includes(value)) fail_('Lựa chọn ' + field.key + ' không hợp lệ.');
    } else {
      // Chỉ đếm phần học sinh viết, không tính phần tiền tố do app thêm.
      let raw = value;
      if (data.tuan === 3 && field.key === 'nghi_1') raw = String(value ?? '').replace(
        /^Phe [AB]: /, '');
      if (data.tuan === 3 && field.key === 'chia_se') raw = String(value ?? '').replace(
        /^(Đổi ý|Giữ ý): /, '');
      text_(raw, field.key, field.min, field.max);
    }
  });
  if (data.tuan === 3) {
    if (!data.nghi_1.startsWith(data.phe.startsWith('A') ? 'Phe A: ' : 'Phe B: ')) fail_(
      'Phe không khớp câu trả lời.');
    if (!data.chia_se.startsWith(data.doi_hay_giu + ': ')) fail_('Lựa chọn đổi/giữ không khớp.');
  }
  if (data.tuan === 4) {
    const expected = 'Phần mình thay đổi được:\n' + data.kiem_soat +
      '\n\nPhần mình không thay đổi được:\n' + data.ngoai_kiem_soat;
    if (data.thu_lam !== expected) fail_('Hai phần của bước Thử không khớp.');
  }
  if (!num_(data.thoi_luong_giay, 0, 604800) ||
    !num_(data.thoi_gian_troi_giay, 0, 31536000) ||
    !isFinite(Date.parse(data.bat_dau))) fail_('Thời lượng không hợp lệ.');
}

function validateSession_(data) {
  ['khung_gio', 'dieu_tot', 'kho_khan', 'dieu_phoi_vien_viet_tat'].forEach(key => {
    text_(data[key], key, 1, key === 'dieu_phoi_vien_viet_tat' ? 30 : 6000);
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.ngay) || !isFinite(Date.parse(data.ngay))) fail_(
    'Ngày không hợp lệ.');
  if (!num_(data.si_so, 1, 200) || !Number.isInteger(data.si_so) ||
    !num_(data.so_tham_gia, 0, data.si_so) || !Number.isInteger(data.so_tham_gia) ||
    !num_(data.thoi_luong_thuc_te_phut, 1, 240)) fail_('Sĩ số/thời lượng không hợp lệ.');
  if (!['App', 'Giấy', 'Kết hợp'].includes(data.dung_app_hay_giay)) fail_(
    'Hình thức không hợp lệ.');
  ['mo_thu', 'thu', 'nghi', 'noi', 'chia_se'].forEach(key => {
    if (typeof data['da_lam_' + key] !== 'boolean') fail_('Thiếu trạng thái bước ' + key);
  });
}

function validateDebate_(data) {
  if (data.tuan !== 3 || !['doi', 'giu'].includes(data.doi_hay_giu)) fail_(
    'Phiếu đổi ý chỉ dành cho tuần 3.');
  text_(data.nhom, 'nhóm', 1, 60);
  text_(data.vi_sao, 'vì sao', 5, 6000);
}

/** RAW + UNFORMATTED_VALUE: bỏ ô trống cuối hàng là bình thường; chuỗi giữ nguyên từng ký tự. */
function sameCell_(stored, expected) {
  if (expected === undefined || expected === null || expected === '') return stored === undefined || stored === null || stored === '';
  if (typeof expected === 'number') return typeof stored === 'number' && Number.isFinite(stored) && stored === expected;
  if (typeof expected === 'boolean') return stored === expected;
  return typeof stored === 'string' && stored === expected;
}

/**
 * Đảm bảo tính idempotent:
 * - Cùng ID + cùng nội dung → ACK lại, không tạo dòng mới.
 * - Cùng ID + khác nội dung → báo xung đột, không ghi đè.
 * - ID mới → thêm đúng một dòng bằng API RAW.
 *
 * Khóa bao trùm thao tác tìm ID và ghi. Chờ khóa ngắn để nhiều yêu cầu không
 * giữ các slot thực thi quá lâu. Client tự giãn lần thử sau nếu máy chủ bận.
 */
function submitRecord(payload) {
  let lock;
  try {
    valid_(payload && payload.record);
    const data = Safety.redactRecord(payload.record, SCHEMA.safety);
    valid_(data);
    data.lop = ClassIds.code(data.lop);
    if (data.loai !== 'chu_trinh') authorizeCoordinator_(payload.token, data);

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) fail_('Máy chủ chưa chạy setup_.', 'SETUP_REQUIRED');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) return {
      ok: false,
      code: 'BUSY',
      error: 'Máy chủ đang bận; bài được giữ để gửi lại.'
    };

    const student = data.loai === 'chu_trinh' ? authorizeStudent_(payload.token, data, spreadsheetId) : null;
    // Đọc ID, đọc bản ghi và append qua cùng Sheets API; khóa giữ đến khi append trả về.
    const columns = HEADERS[data.loai], range = "'" + data.loai + "'!";
    const readOptions = { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' };
    const headers = Sheets.Spreadsheets.Values.get(spreadsheetId, range + '1:1', readOptions).values || [];
    if (JSON.stringify(headers[0] || []) !== JSON.stringify(columns)) fail_(
      'Cấu trúc Sheet không khớp; liên hệ người quản lý.', 'SETUP_REQUIRED');
    const ids = Sheets.Spreadsheets.Values.get(spreadsheetId, range + 'A2:A', readOptions).values || [];
    const found = ids.findIndex(row => row[0] === data.id);
    if (found >= 0) {
      const rowNumber = found + 2;
      const existing = (Sheets.Spreadsheets.Values.get(spreadsheetId,
        range + rowNumber + ':' + rowNumber, readOptions).values || [])[0] || [];
      const identical = columns.every((key, index) => key === 'thoi_gian_nhan' ||
        (key === 'lop' ? ClassIds.code(existing[index]) === data.lop : sameCell_(existing[index], data[key])));
      if (!identical) fail_('ID đã tồn tại với nội dung khác. Không ghi đè.', 'ID_CONFLICT');
      if (student) projectStudentProgress_(spreadsheetId, student);
      return { ok: true, id: data.id, duplicate: true };
    }

    const row = columns.map(key => key === 'thoi_gian_nhan' ?
      new Date().toISOString() : (data[key] ?? ''));
    // RAW giữ cả =, +, -, @, dấu nháy và xuống dòng như văn bản, không chạy công thức.
    Sheets.Spreadsheets.Values.append({
      values: [row]
    }, spreadsheetId, "'" + data.loai + "'!A1", {
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS'
    }, );
    if (student) projectStudentProgress_(spreadsheetId, student);
    return {
      ok: true,
      id: data.id,
      duplicate: false
    };
  } catch (error) {
    // Lỗi do Google/quota: log phía chủ dự án, không log câu trả lời học sinh.
    if (!error.code) console.error('submitRecord: ' + String(error.message));
    return {
      ok: false,
      code: error.code || 'SERVER_ERROR',
      error: error.code ? error.message :
        'Chưa ghi được vào Google Sheets. Bài vẫn chờ gửi; kiểm tra dịch vụ và quyền của dự án.',
    };
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function authorizeRole_(token, data, role) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 160 || !schoolOK_(data)) {
    fail_('Phiên truy cập không hợp lệ. Hãy đăng nhập lại.', 'AUTH_REQUIRED');
  }
  let auth;
  try {
    auth = JSON.parse(CacheService.getScriptCache().get(role + ':' + token) || 'null');
  } catch { auth = null; }
  if (!auth || !Number.isFinite(auth.expires) || auth.expires <= Date.now() ||
      auth.truong !== data.truong || ClassIds.code(auth.lop) !== ClassIds.code(data.lop)) {
    fail_('Phiên hết hạn hoặc không có quyền với lớp này. Hãy đăng nhập lại.', 'AUTH_REQUIRED');
  }
}

function authorizeCoordinator_(token, data) {
  authorizeRole_(token, data, 'coord');
}

function loginCoordinator(input) {
  return loginRole_(input, 'coord', 'COORDINATOR_PINS');
}

function loginTeacher(input) {
  return loginRole_(input, 'teacher', 'TEACHER_PINS');
}

/** Giáo viên chỉ được đọc phép chiếu mã + tuần đã xác nhận của đúng lớp. */
function getClassProgress(input) {
  try {
    if (!input) fail_('Thiếu thông tin lớp.', 'AUTH_REQUIRED');
    authorizeRole_(input.token, input, 'teacher');
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) fail_('Chưa cấu hình Sheet.', 'SETUP_REQUIRED');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('chu_trinh');
    const columns = HEADERS.chu_trinh;
    if (!sheet || !headersMatch_(sheet, columns)) fail_('Cấu trúc Sheet không khớp.', 'SETUP_REQUIRED');
    const byCode = new Map();
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, columns.length).getValues() : [];
    const index = key => columns.indexOf(key);
    rows.forEach(row => {
      if (row[index('truong')] !== input.truong || ClassIds.code(row[index('lop')]) !== ClassIds.code(input.lop)) return;
      const code = row[index('ma')], week = Number(row[index('tuan')]);
      if (!/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(String(code)) || !Number.isInteger(week) || week < 1 || week > 4) return;
      if (!byCode.has(code)) byCode.set(code, new Set());
      byCode.get(code).add(week);
    });
    return { ok: true, students: Array.from(byCode, ([ma, weeks]) => ({ ma, weeks: [...weeks].sort() }))
      .sort((a, b) => a.ma.localeCompare(b.ma)) };
  } catch (error) {
    return { ok: false, code: error.code || 'SERVER_ERROR',
      error: error.code ? error.message : 'Chưa tải được tiến độ lớp. Vui lòng thử lại.' };
  }
}

function logoutTeacher(token) {
  return logoutRole_(token, 'teacher');
}

function logoutCoordinator(token) {
  return logoutRole_(token, 'coord');
}

function logoutRole_(token, role) {
  if (typeof token === 'string' && token.length >= 20 && token.length <= 160) {
    CacheService.getScriptCache().remove(role + ':' + token);
  }
  return { ok: true };
}

/** PIN ở Script Properties, không nằm trong HTML/JSON người học tải về. */
function loginRole_(input, role, property) {
  let lock;
  try {
    if (!input || !schoolOK_(input)) fail_('Lớp không hợp lệ.', 'AUTH_REQUIRED');
    input = ClassIds.profile(input);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau vài giây.', 'BUSY');
    const cache = CacheService.getScriptCache();
    const key = 'login:' + role + ':' + input.truong + '|' + input.lop;
    let state;
    try { state = JSON.parse(cache.get(key) || 'null'); } catch { state = null; }
    // Đọc cả bộ đếm cũ khi nâng cấp; không vô tình bỏ qua thời gian khóa còn lại.
    if (typeof state === 'number') state = { attempts: state, blockedUntil: state >= 8 ? Date.now() + 600000 : 0 };
    if (!state) state = { attempts: 0, blockedUntil: 0 };
    if (state.blockedUntil > Date.now()) {
      const seconds = Math.max(1, Math.ceil((state.blockedUntil - Date.now()) / 1000));
      cache.put(key, JSON.stringify(state), seconds);
      const error = new Error('Lớp đang tạm khóa đăng nhập. Thử lại sau ' + seconds + ' giây; liên hệ chủ dự án nếu cần hỗ trợ.');
      error.code = 'RATE_LIMITED'; error.retryAfterSeconds = seconds; throw error;
    }
    if (state.blockedUntil) state = { attempts: 0, blockedUntil: 0 };
    const raw = PropertiesService.getScriptProperties().getProperty(property) || '{}';
    const pins = JSON.parse(raw);
    const keys = [...new Set([input.lop,ClassIds.label(input.lop)])];
    const configured = keys.map(lop=>pins[input.truong+'|'+lop]).filter(value=>value!==undefined);
    if (new Set(configured.map(String)).size > 1) fail_('PIN mã lớp và tên lớp cũ không khớp; chủ dự án cần kiểm tra cấu hình.', 'SETUP_REQUIRED');
    const expected = configured[0];
    if (!expected || !/^\d{6,12}$/.test(String(expected)) || String(input.pin) !== String(
        expected)) {
      state.attempts++;
      if (state.attempts >= 8) state.blockedUntil = Date.now() + 600000;
      cache.put(key, JSON.stringify(state), 600);
      if (state.blockedUntil) {
        const error = new Error('Đã nhập sai PIN 8 lần. Lớp tạm khóa trong 600 giây; liên hệ chủ dự án nếu cần hỗ trợ.');
        error.code = 'RATE_LIMITED'; error.retryAfterSeconds = 600; throw error;
      }
      fail_('PIN chưa được cấu hình hoặc không đúng. Còn ' + (8 - state.attempts) + ' lần thử trước khi tạm khóa.', 'AUTH_REQUIRED');
    }
    cache.remove(key);
    const token = Utilities.getUuid() + Utilities.getUuid();
    const expires = Date.now() + 21600000;
    cache.put(role + ':' + token, JSON.stringify({
      truong: input.truong,
      lop: input.lop,
      expires
    }), 21600);
    return {
      ok: true,
      token,
      expires
    };
  } catch (error) {
    return {
      ok: false,
      code: error.code || 'SERVER_ERROR',
      error: error.code ? error.message : 'Chưa xác thực được quyền truy cập.',
      ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {})
    };
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
