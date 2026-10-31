/** Tài khoản theo mã có sẵn. Hàm quản trị kết thúc '_' chỉ chạy bởi chủ dự án trong editor. */
const ACCOUNT_HEADERS = ['ma', 'truong', 'lop', 'trang_thai', 'pin_salt', 'pin_hash', 'ngay_cap'];
const PROGRESS_HEADERS = ['ma', 'truong', 'lop', 'tuan_1', 'tuan_2', 'tuan_3', 'tuan_4', 'so_tuan_da_nop', 'cap_nhat'];

function setupStudentStorage_(spreadsheet) {
  for (const [name, headers] of [['tai_khoan', ACCOUNT_HEADERS], ['tien_do', PROGRESS_HEADERS], ['nhap_hoc_tap', LEARNING_HEADERS]]) {
    const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else if (!headersMatch_(sheet, headers)) {
      fail_('Cột ' + name + ' không khớp. Không ghi đè dữ liệu hiện có.', 'SETUP_REQUIRED');
    }
  }
}

function accountSheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) fail_('Chủ dự án cần chạy setup_ từ Sheet đã chọn.', 'SETUP_REQUIRED');
  return id;
}

function readSystemTable_(id, name, headers) {
  const end = String.fromCharCode(64 + headers.length);
  const rows = Sheets.Spreadsheets.Values.get(id, "'" + name + "'!A1:" + end, {
    valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER'
  }).values || [];
  if (JSON.stringify(rows[0] || []) !== JSON.stringify(headers)) fail_('Cần chuẩn bị đúng cấu trúc bảng ' + name + '.', 'SETUP_REQUIRED');
  return rows.slice(1);
}

function accountKey_(account) {
  return JSON.stringify([account.truong, ClassIds.code(account.lop), account.ma]);
}

function normalizeAccounts_(rows) {
  const seen = new Set(), result = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value !== '' && value !== null && value !== undefined)) return;
    const ma = String(row[0] || '').toUpperCase().replace(/\s/g, '');
    const account = { ma, truong: String(row[1] || '').trim(), lop: String(row[2] || '').trim(),
      status: String(row[3] || 'hoat_dong'), salt: String(row[4] || ''), pinHash: String(row[5] || ''),
      issuedAt: String(row[6] || ''), rowNumber: index + 2, credentialClass: String(row[2] || '').trim() };
    if (!/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(ma) || !schoolOK_(account) ||
        !['hoat_dong', 'khoa'].includes(account.status)) fail_('Kiểm tra mã, trường/lớp và trạng thái ở dòng ' + (index + 2) + ' của tai_khoan.', 'SETUP_REQUIRED');
    if (!!account.salt !== !!account.pinHash || (account.pinHash && !/^[a-f0-9]{64}$/.test(account.pinHash))) {
      fail_('Dữ liệu PIN không hoàn chỉnh ở dòng ' + (index + 2) + '. Dùng chức năng đặt lại PIN, không nhập PIN vào bảng này.', 'SETUP_REQUIRED');
    }
    account.lop = ClassIds.code(account.lop);
    const key = accountKey_(account);
    if (seen.has(key)) fail_('Mã trùng trong cùng trường/lớp ở dòng ' + (index + 2) + '.', 'SETUP_REQUIRED');
    seen.add(key); result.push(account);
  });
  return result;
}

/** Khoá nhớ tạm bảng tài khoản; đổi hậu tố nếu đổi cấu trúc cột. */
const ACCOUNT_CACHE_KEY = 'tai_khoan:v2';

/**
 * Đọc bảng tài khoản, nhớ tạm 20 giây.
 * Mỗi lần đăng nhập, nộp bài hay lưu nháp đều cần bảng này; đọc lại cả trang cho
 * từng yêu cầu là chi phí lớn nhất khi cả lớp vào cùng lúc. Bản nhớ tạm chấp nhận
 * trễ tối đa 20 giây khi khoá hoặc mở một tài khoản.
 */
function studentAccounts_(id) {
  // Nhớ tạm chỉ là tối ưu: cache lỗi hoặc thiếu hàm thì vẫn đọc thẳng, không chặn đăng nhập.
  let cache = null;
  try { cache = CacheService.getScriptCache(); } catch (error) { cache = null; }
  if (cache) {
    let hit = null;
    try { hit = cache.get(ACCOUNT_CACHE_KEY); } catch (error) { hit = null; }
    if (hit) {
      try { return JSON.parse(hit); } catch (error) { /* hỏng thì đọc lại */ }
    }
  }
  const accounts = normalizeAccounts_(readSystemTable_(id, 'tai_khoan', ACCOUNT_HEADERS));
  if (cache) {
    try {
      const text = JSON.stringify(accounts);
      if (text.length < 90000 && typeof cache.put === 'function') cache.put(ACCOUNT_CACHE_KEY, text, 20);
    } catch (error) { /* bỏ qua */ }
  }
  return accounts;
}

/** Xoá bản nhớ tạm sau khi cấp/đặt lại mật khẩu hoặc nhập danh sách mới. */
function clearAccountCache_() {
  CacheService.getScriptCache().remove(ACCOUNT_CACHE_KEY);
}

/**
 * Công tắc mở/khoá lớp, điều khiển bằng Script Property LOP_DANG_MO.
 * Giá trị là danh sách mã lớp cách nhau dấu phẩy, ví dụ: "10A3,11E1,LB-11A,CL-12A2".
 * Để trống hoặc không đặt thì mọi lớp trong danh sách đều mở.
 * Học sinh lớp đang khoá nhận mã lỗi LOP_CHUA_MO và không vào được bài.
 */
function classOpen_(lop) {
  const raw = String(PropertiesService.getScriptProperties().getProperty('LOP_DANG_MO') || '').trim();
  if (!raw) return true;
  const codes = raw.split(',').map(value => ClassIds.code(value.trim())).filter(Boolean);
  return codes.includes(ClassIds.code(lop));
}

function pinDigest_(pin, account) {
  const secret = PropertiesService.getScriptProperties().getProperty('STUDENT_PIN_SECRET');
  if (!secret) fail_('Chủ dự án cần cấp mật khẩu trước khi đăng nhập học sinh.', 'SETUP_REQUIRED');
  const message = JSON.stringify([JSON.stringify([account.truong, account.credentialClass || account.lop, account.ma]), account.salt, pin]);
  return Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8)
    .map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual_(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

/** Mật khẩu mới là chuỗi 8–64 ký tự; PIN số 6–12 đã cấp vẫn dùng được. */
function studentPassword_(input) {
  const value = Object.prototype.hasOwnProperty.call(input, 'password') ? input.password : input.pin;
  return typeof value === 'string' && (/^[0-9]{6,12}$/.test(value) ||
    (value.length >= 8 && value.length <= 64 && !/[\x00-\x20\x7f]/.test(value))) ? value : '';
}

/**
 * Chế độ đăng nhập của học sinh:
 *   'ma' (mặc định) — chỉ cần mã + trường/lớp, không kiểm tra mật khẩu.
 *   'mat_khau'      — bắt buộc mật khẩu đã cấp; phải khớp cờ requireStudentPassword ở frontend.
 */
function studentLoginMode_() {
  return String(PropertiesService.getScriptProperties()
    .getProperty('STUDENT_LOGIN_MODE') || 'ma').toLowerCase() === 'mat_khau' ? 'mat_khau' : 'ma';
}

function loginStudent(input) {
  let lock;
  try {
    if (!input || !schoolOK_(input) || typeof input.ma !== 'string' || !/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(input.ma)) fail_('Mã, trường/lớp hoặc mật khẩu không đúng.', 'AUTH_REQUIRED');
    input = ClassIds.profile(input);
    if ((SCHEMA.maCam || []).includes(input.ma)) fail_('Đây là mã ví dụ trong tài liệu, không dùng để vào học. Hãy tạo mã theo phiếu khảo sát.', 'AUTH_REQUIRED');
    if (!classOpen_(input.lop)) fail_('Lớp của em chưa mở đợt dùng app. Liên hệ người phụ trách để biết lịch.', 'LOP_CHUA_MO');
    const id = accountSheetId_();
    // Không lấy khoá ở đây: bộ đếm chống dò chỉ cần đúng tương đối, còn khoá toàn
    // cục biến 30 lượt đăng nhập đồng thời thành 30 lượt xếp hàng.
    const cache = CacheService.getScriptCache(), key = 'login:student:' + accountKey_(input);
    let state;
    try { state = JSON.parse(cache.get(key) || 'null'); } catch { state = null; }
    if (!state) state = { attempts: 0, blockedUntil: 0 };
    if (state.blockedUntil > Date.now()) return { ok: false, code: 'RATE_LIMITED',
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - Date.now()) / 1000)),
      error: 'Mã này đang tạm khóa đăng nhập. Thử lại sau ' + Math.max(1, Math.ceil((state.blockedUntil - Date.now()) / 1000)) + ' giây.' };
    if (state.blockedUntil) state = { attempts: 0, blockedUntil: 0 };
    const account = studentAccounts_(id).find(item => accountKey_(item) === accountKey_(input));
    // Chế độ chỉ cần mã: bỏ kiểm tra mật khẩu. Dòng tai_khoan (nếu có) chỉ dùng để biết mã bị khóa.
    if (studentLoginMode_() === 'ma') {
      if (account && account.status !== 'hoat_dong') fail_('Tài khoản này đang bị khóa. Liên hệ người phụ trách.', 'AUTH_REQUIRED');
      cache.remove(key);
      const codeToken = Utilities.getUuid() + Utilities.getUuid(), codeExpires = Date.now() + 21600000;
      cache.put('student:' + codeToken, JSON.stringify({
        ma: account ? account.ma : input.ma,
        truong: account ? account.truong : input.truong,
        lop: account ? account.lop : ClassIds.code(input.lop),
        expires: codeExpires,
        credentialVersion: account ? account.pinHash : ''
      }), 21600);
      return { ok: true, token: codeToken, expires: codeExpires };
    }
    // Tính digest cả với tài khoản không tồn tại để không trả thông tin danh sách mã.
    const candidate = account || { ...input, salt: 'unregistered' };
    const suppliedPin = studentPassword_(input);
    const digest = pinDigest_(suppliedPin, candidate);
    const alternateClass = (candidate.credentialClass || candidate.lop) === ClassIds.code(candidate.lop) ? ClassIds.label(candidate.lop) : ClassIds.code(candidate.lop);
    const alternateDigest = pinDigest_(suppliedPin, {...candidate,credentialClass:alternateClass});
    if (!account || account.status !== 'hoat_dong' || !account.pinHash ||
        !suppliedPin || !(constantTimeEqual_(digest, account.pinHash) || constantTimeEqual_(alternateDigest, account.pinHash))) {
      state.attempts++;
      if (state.attempts >= 8) state.blockedUntil = Date.now() + 600000;
      cache.put(key, JSON.stringify(state), 600);
      return { ok: false, code: state.blockedUntil ? 'RATE_LIMITED' : 'AUTH_REQUIRED',
        ...(state.blockedUntil ? { retryAfterSeconds: 600 } : {}),
        error: state.blockedUntil ? 'Đã thử sai 8 lần. Mã này tạm khóa 600 giây.' : 'Mã, trường/lớp hoặc mật khẩu không đúng.' };
    }
    cache.remove(key);
    const token = Utilities.getUuid() + Utilities.getUuid(), expires = Date.now() + 21600000;
    cache.put('student:' + token, JSON.stringify({ ma: account.ma, truong: account.truong, lop: account.lop,
      expires, credentialVersion: account.pinHash }), 21600);
    return { ok: true, token, expires };
  } catch (error) {
    return { ok: false, code: error.code || 'SERVER_ERROR', error: error.code ? error.message : 'Chưa đăng nhập được. Bài cũ trên máy vẫn được giữ.' };
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function authorizeStudent_(token, data, id) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 160) fail_('Hãy đăng nhập lại bằng mã và mật khẩu để đồng bộ.', 'AUTH_REQUIRED');
  let auth;
  try { auth = JSON.parse(CacheService.getScriptCache().get('student:' + token) || 'null'); } catch { auth = null; }
  if (!auth || !Number.isFinite(auth.expires) || auth.expires <= Date.now() || accountKey_(auth) !== accountKey_(data)) fail_('Phiên học sinh hết hạn hoặc không đúng mã/trường/lớp.', 'AUTH_REQUIRED');
  const account = studentAccounts_(id).find(item => accountKey_(item) === accountKey_(data));
  if (studentLoginMode_() === 'ma') {
    if (account && account.status !== 'hoat_dong') fail_('Tài khoản đã khóa. Hãy đăng nhập lại.', 'AUTH_REQUIRED');
    return account || { ma: data.ma, truong: data.truong, lop: ClassIds.code(data.lop), status: 'hoat_dong' };
  }
  if (!account || account.status !== 'hoat_dong' || !account.pinHash || account.pinHash !== auth.credentialVersion) fail_('Tài khoản đã khóa hoặc PIN đã thay đổi. Hãy đăng nhập lại.', 'AUTH_REQUIRED');
  return account;
}

function logoutStudent(token) {
  return logoutRole_(token, 'student');
}

/** Chỉ tổng hợp từ bài đã ghi vào chu_trinh; không tin tiến độ do client gửi lên. */
function projectStudentProgress_(id, account) {
  const raw = Sheets.Spreadsheets.Values.get(id, "'chu_trinh'!E2:H", {
    valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER'
  }).values || [];
  const weeks = [...new Set(raw.filter(row => row[0] === account.ma && row[1] === account.truong && ClassIds.code(row[2]) === account.lop)
    .map(row => Number(row[3])).filter(week => Number.isInteger(week) && week >= 1 && week <= 4))].sort();
  const rows = readSystemTable_(id, 'tien_do', PROGRESS_HEADERS), matches = [];
  rows.forEach((row, index) => { if (row[0] === account.ma && row[1] === account.truong && ClassIds.code(row[2]) === account.lop) matches.push(index); });
  if (matches.length > 1) fail_('Bảng tien_do có mã trùng trong cùng trường/lớp. Chủ dự án cần kiểm tra.', 'SETUP_REQUIRED');
  const updatedAt = new Date().toISOString();
  const values = [account.ma, account.truong, account.lop, ...[1,2,3,4].map(week => weeks.includes(week)), weeks.length, updatedAt];
  if (matches.length) {
    const rowNumber = matches[0] + 2;
    Sheets.Spreadsheets.Values.update({ values: [values] }, id, "'tien_do'!A" + rowNumber + ':I' + rowNumber, { valueInputOption: 'RAW' });
  } else {
    Sheets.Spreadsheets.Values.append({ values: [values] }, id, "'tien_do'!A1", { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' });
  }
  return { ma: account.ma, truong: account.truong, lop: account.lop, weeks, updatedAt };
}

function getStudentProgress(input) {
  let lock;
  try {
    if (!input) fail_('Hãy đăng nhập để xem tiến độ.', 'AUTH_REQUIRED');
    const id = accountSheetId_();
    // Giữ khoá vì hàm này vừa đọc vừa ghi bảng tien_do.
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau vài giây.', 'BUSY');
    const account = authorizeStudent_(input.token, input, id);
    return { ok: true, ...projectStudentProgress_(id, account) };
  } catch (error) {
    return { ok: false, code: error.code || 'SERVER_ERROR', error: error.code ? error.message : 'Chưa tải được tiến độ. Hãy thử lại.' };
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function newStudentPassword_() {
  // Sinh từ UUID ngẫu nhiên; không lấy mã học sinh hoặc dùng chung cho cả lớp.
  return 'Xc' + Utilities.getUuid().replace(/-/g, '').slice(0, 24);
}

function newStudentPin_() { return newStudentPassword_(); }

function accountRow_(account) {
  return [account.ma, account.truong, account.lop, account.status, account.salt, account.pinHash, account.issuedAt];
}

function showIssuedPins_(ui, issued, note = '') {
  const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
  const csv = [['ma','truong','lop','mat_khau'], ...issued.map(item => [item.ma,item.truong,item.lop,item.pin])].map(row => row.map(quote).join(',')).join('\n');
  const download = '<p><a download="Tai_khoan_mat_khau.csv" href="data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csv) + '">Tải file tài khoản và mật khẩu (CSV)</a></p>';
  const escape = value => String(value).replace(/[&<>\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  ui.showModalDialog(HtmlService.createHtmlOutput('<h2>Mật khẩu mới — chỉ hiện ở lần cấp này</h2><p>Sao chép và giao riêng cho từng học sinh. Không đăng Git, nhóm lớp hoặc lưu chung với dữ liệu nghiên cứu. Giữ mật khẩu nguyên chữ hoa/thường, không thêm khoảng trắng.</p><p>' + escape(note) + '</p>' + download + '<textarea readonly style="width:100%;height:300px">' + escape(csv) + '</textarea>').setWidth(650).setHeight(470), 'Cấp mật khẩu học sinh');
}

/** Chạy sau khi chép mã có sẵn vào A:C của tai_khoan. Không sinh lại mã, không đổi PIN đã cấp. */
function provisionStudentAccounts_() {
  const ui = SpreadsheetApp.getUi();
  let lock, issued = [];
  try {
    const id = accountSheetId_();
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau.', 'BUSY');
    const accounts = studentAccounts_(id);
    if (!accounts.length) fail_('Chép danh sách mã, trường, lớp vào A:C của tai_khoan trước.', 'SETUP_REQUIRED');
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('STUDENT_PIN_SECRET')) {
      if (accounts.some(account => account.pinHash)) fail_('Thiếu bí mật PIN của tài khoản đã cấp. Khôi phục Script Properties trước; không tự đổi khóa.', 'SETUP_REQUIRED');
      props.setProperty('STUDENT_PIN_SECRET', Utilities.getUuid() + Utilities.getUuid());
    }
    const pending = [], data = [];
    for (const account of accounts) {
      if (account.pinHash || account.status !== 'hoat_dong') continue;
      const pin = newStudentPin_(); delete account.credentialClass; account.salt = Utilities.getUuid();
      account.pinHash = pinDigest_(pin, account); account.issuedAt = new Date().toISOString();
      data.push({ range: "'tai_khoan'!A" + account.rowNumber + ':G' + account.rowNumber, values: [accountRow_(account)] });
      pending.push({ ma: account.ma, truong: account.truong, lop: account.lop, pin });
    }
    if (data.length) {
      // Một yêu cầu cho cả đợt, tránh 150 lệnh ghi riêng vượt quota theo phút.
      Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data }, id);
      clearAccountCache_();
      issued = pending;
    }
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
    if (issued.length) showIssuedPins_(ui, issued);
  }
  if (!issued.length) ui.alert('Không có mã đang hoạt động mới cần cấp PIN. PIN đã cấp được giữ nguyên.');
  return { created: issued.length };
}

/** Chọn đúng dòng tai_khoan trong Sheet rồi chạy; PIN cũ và mọi token cũ của mã đó bị vô hiệu hóa. */
function resetSelectedStudentPin_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet(), sheet = spreadsheet && spreadsheet.getActiveSheet();
  if (!sheet || sheet.getName() !== 'tai_khoan') fail_('Chọn một dòng học sinh trong bảng tai_khoan trước.', 'SETUP_REQUIRED');
  const range = sheet.getActiveRange();
  if (!range || range.getNumRows() !== 1 || range.getRow() < 2) fail_('Chỉ chọn một dòng học sinh.', 'INVALID_RECORD');
  const ui = SpreadsheetApp.getUi();
  let lock, issued;
  try {
    const id = accountSheetId_();
    if (id !== spreadsheet.getId()) fail_('Sheet đang mở không khớp cấu hình dự án.', 'SETUP_REQUIRED');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau.', 'BUSY');
    const account = studentAccounts_(id).find(item => item.rowNumber === range.getRow());
    if (!account) fail_('Dòng được chọn chưa có tài khoản hợp lệ.', 'INVALID_RECORD');
    const pin = newStudentPin_(); delete account.credentialClass; account.salt = Utilities.getUuid();
    account.pinHash = pinDigest_(pin, account); account.issuedAt = new Date().toISOString();
    Sheets.Spreadsheets.Values.update({ values: [accountRow_(account)] }, id,
      "'tai_khoan'!A" + account.rowNumber + ':G' + account.rowNumber, { valueInputOption: 'RAW' });
    clearAccountCache_();
    issued = { ma: account.ma, truong: account.truong, lop: account.lop, pin };
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
  showIssuedPins_(ui, [issued], 'Các phiên cũ của mã này phải nhập lại mật khẩu.');
  return { reset: true };
}

/** Chuẩn bị bảng trung gian chỉ 3 cột, không nhập dữ liệu khảo sát vào hệ thống. */
function prepareStudentImport_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet || spreadsheet.getId() !== accountSheetId_()) fail_('Mở đúng Sheet đã cấu hình.', 'SETUP_REQUIRED');
  const headers = ['ma', 'truong', 'lop'];
  const sheet = spreadsheet.getSheetByName('nhap_tai_khoan') || spreadsheet.insertSheet('nhap_tai_khoan');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 3).setValues([headers]); sheet.setFrozenRows(1);
  } else if (!headersMatch_(sheet, headers)) fail_('Bảng nhập cần đúng ba cột ma, truong, lop. Không ghi đè dữ liệu cũ.', 'SETUP_REQUIRED');
  SpreadsheetApp.getUi().alert('Dán dữ liệu CSV mã/trường/lớp vào nhap_tai_khoan, không dán các cột khảo sát. Sau đó chạy importStudentRoster_.');
}

/** Chỉ chạy từ editor; kiểm tra cả danh sách trước khi ghi, thêm mới và giữ mật khẩu cũ. */
function importStudentRoster_() {
  const ui = SpreadsheetApp.getUi();
  let lock, result;
  try {
    const id = accountSheetId_();
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau.', 'BUSY');
    const incoming = normalizeAccounts_(readSystemTable_(id, 'nhap_tai_khoan', ['ma', 'truong', 'lop']).map(row => row.slice(0, 3)));
    if (!incoming.length) fail_('Bảng nhập chưa có mã học sinh.', 'SETUP_REQUIRED');
    const existing = new Set(studentAccounts_(id).map(accountKey_));
    const fresh = incoming.filter(account => !existing.has(accountKey_(account)));
    if (fresh.length) Sheets.Spreadsheets.Values.append({values: fresh.map(accountRow_)}, id,
      "'tai_khoan'!A1", {valueInputOption:'RAW', insertDataOption:'INSERT_ROWS'});
    if (fresh.length) clearAccountCache_();
    result = {created: fresh.length, existing: incoming.length - fresh.length};
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
  // Ui.alert tạm dừng server: phải thả khóa trước khi chờ người dùng.
  ui.alert('Đã thêm ' + result.created + ' tài khoản; giữ nguyên ' + result.existing + ' tài khoản đã có. Chạy provisionStudentAccounts_ để cấp mật khẩu cho mã mới.');
  return result;
}
