/** Tài khoản theo mã có sẵn. Hàm quản trị kết thúc '_' chỉ chạy bởi chủ dự án trong editor. */
const ACCOUNT_HEADERS = ['ma', 'truong', 'lop', 'trang_thai', 'pin_salt', 'pin_hash', 'ngay_cap'];
const PROGRESS_HEADERS = ['ma', 'truong', 'lop', 'tuan_1', 'tuan_2', 'tuan_3', 'tuan_4', 'so_tuan_da_nop', 'cap_nhat'];

function setupStudentStorage_(spreadsheet) {
  for (const [name, headers] of [['tai_khoan', ACCOUNT_HEADERS], ['tien_do', PROGRESS_HEADERS]]) {
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
  return JSON.stringify([account.truong, account.lop, account.ma]);
}

function normalizeAccounts_(rows) {
  const seen = new Set(), result = [];
  rows.forEach((row, index) => {
    if (!row.some(value => value !== '' && value !== null && value !== undefined)) return;
    const ma = String(row[0] || '').toUpperCase().replace(/\s/g, '');
    const account = { ma, truong: String(row[1] || '').trim(), lop: String(row[2] || '').trim(),
      status: String(row[3] || 'hoat_dong'), salt: String(row[4] || ''), pinHash: String(row[5] || ''),
      issuedAt: String(row[6] || ''), rowNumber: index + 2 };
    if (!/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(ma) || ma === 'HO07-T' || !schoolOK_(account) ||
        !['hoat_dong', 'khoa'].includes(account.status)) fail_('Kiểm tra mã, trường/lớp và trạng thái ở dòng ' + (index + 2) + ' của tai_khoan.', 'SETUP_REQUIRED');
    if (!!account.salt !== !!account.pinHash || (account.pinHash && !/^[a-f0-9]{64}$/.test(account.pinHash))) {
      fail_('Dữ liệu PIN không hoàn chỉnh ở dòng ' + (index + 2) + '. Dùng chức năng đặt lại PIN, không nhập PIN vào bảng này.', 'SETUP_REQUIRED');
    }
    const key = accountKey_(account);
    if (seen.has(key)) fail_('Mã trùng trong cùng trường/lớp ở dòng ' + (index + 2) + '.', 'SETUP_REQUIRED');
    seen.add(key); result.push(account);
  });
  return result;
}

function studentAccounts_(id) {
  return normalizeAccounts_(readSystemTable_(id, 'tai_khoan', ACCOUNT_HEADERS));
}

function pinDigest_(pin, account) {
  const secret = PropertiesService.getScriptProperties().getProperty('STUDENT_PIN_SECRET');
  if (!secret) fail_('Chủ dự án cần cấp PIN trước khi đăng nhập học sinh.', 'SETUP_REQUIRED');
  const message = JSON.stringify([accountKey_(account), account.salt, pin]);
  return Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8)
    .map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual_(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function loginStudent(input) {
  let lock;
  try {
    if (!input || !schoolOK_(input) || typeof input.ma !== 'string' || !/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(input.ma)) fail_('Mã, trường/lớp hoặc PIN không đúng.', 'AUTH_REQUIRED');
    const id = accountSheetId_();
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau vài giây.', 'BUSY');
    const cache = CacheService.getScriptCache(), key = 'login:student:' + accountKey_(input);
    let state;
    try { state = JSON.parse(cache.get(key) || 'null'); } catch { state = null; }
    state ||= { attempts: 0, blockedUntil: 0 };
    if (state.blockedUntil > Date.now()) return { ok: false, code: 'RATE_LIMITED',
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - Date.now()) / 1000)),
      error: 'Mã này đang tạm khóa đăng nhập. Thử lại sau ' + Math.max(1, Math.ceil((state.blockedUntil - Date.now()) / 1000)) + ' giây.' };
    if (state.blockedUntil) state = { attempts: 0, blockedUntil: 0 };
    const account = studentAccounts_(id).find(item => accountKey_(item) === accountKey_(input));
    // Tính digest cả với tài khoản không tồn tại để không trả thông tin danh sách mã.
    const candidate = account || { ...input, salt: 'unregistered' };
    const suppliedPin = typeof input.pin === 'string' && /^[0-9]{6,12}$/.test(input.pin) ? input.pin : '';
    const digest = pinDigest_(suppliedPin, candidate);
    if (!account || account.status !== 'hoat_dong' || !account.pinHash ||
        !/^[0-9]{6,12}$/.test(String(input.pin || '')) || !constantTimeEqual_(digest, account.pinHash)) {
      state.attempts++;
      if (state.attempts >= 8) state.blockedUntil = Date.now() + 600000;
      cache.put(key, JSON.stringify(state), 600);
      return { ok: false, code: state.blockedUntil ? 'RATE_LIMITED' : 'AUTH_REQUIRED',
        ...(state.blockedUntil ? { retryAfterSeconds: 600 } : {}),
        error: state.blockedUntil ? 'Đã thử sai 8 lần. Mã này tạm khóa 600 giây.' : 'Mã, trường/lớp hoặc PIN không đúng.' };
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
  if (typeof token !== 'string' || token.length < 20 || token.length > 160) fail_('Hãy đăng nhập lại bằng mã và PIN để đồng bộ.', 'AUTH_REQUIRED');
  let auth;
  try { auth = JSON.parse(CacheService.getScriptCache().get('student:' + token) || 'null'); } catch { auth = null; }
  if (!auth || !Number.isFinite(auth.expires) || auth.expires <= Date.now() || accountKey_(auth) !== accountKey_(data)) fail_('Phiên học sinh hết hạn hoặc không đúng mã/trường/lớp.', 'AUTH_REQUIRED');
  const account = studentAccounts_(id).find(item => accountKey_(item) === accountKey_(data));
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
  const weeks = [...new Set(raw.filter(row => row[0] === account.ma && row[1] === account.truong && row[2] === account.lop)
    .map(row => Number(row[3])).filter(week => Number.isInteger(week) && week >= 1 && week <= 4))].sort();
  const rows = readSystemTable_(id, 'tien_do', PROGRESS_HEADERS), matches = [];
  rows.forEach((row, index) => { if (row[0] === account.ma && row[1] === account.truong && row[2] === account.lop) matches.push(index); });
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
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Thử lại sau vài giây.', 'BUSY');
    const account = authorizeStudent_(input.token, input, id);
    return { ok: true, ...projectStudentProgress_(id, account) };
  } catch (error) {
    return { ok: false, code: error.code || 'SERVER_ERROR', error: error.code ? error.message : 'Chưa tải được tiến độ. Hãy thử lại.' };
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function newStudentPin_() {
  let result = '';
  while (result.length < 8) {
    const hex = Utilities.getUuid().replace(/-/g, '');
    for (let i = 0; i < hex.length && result.length < 8; i += 2) {
      const byte = parseInt(hex.slice(i, i + 2), 16);
      if (byte < 250) result += String(byte % 10);
    }
  }
  return result;
}

function accountRow_(account) {
  return [account.ma, account.truong, account.lop, account.status, account.salt, account.pinHash, account.issuedAt];
}

function showIssuedPins_(ui, issued, note = '') {
  const quote = value => '"' + String(value).replace(/"/g, '""') + '"';
  const csv = [['ma','truong','lop','pin'], ...issued.map(item => [item.ma,item.truong,item.lop,item.pin])].map(row => row.map(quote).join(',')).join('\n');
  const escape = value => String(value).replace(/[&<>\"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  ui.showModalDialog(HtmlService.createHtmlOutput('<h2>PIN mới — chỉ hiện ở lần cấp này</h2><p>Sao chép và giao riêng cho từng học sinh. Không đăng Git, nhóm lớp hoặc lưu chung với dữ liệu nghiên cứu. Giữ PIN dưới dạng văn bản để không mất số 0 đầu.</p><p>' + escape(note) + '</p><textarea readonly style="width:100%;height:300px">' + escape(csv) + '</textarea>').setWidth(650).setHeight(470), 'Cấp tài khoản học sinh');
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
      const pin = newStudentPin_(); account.salt = Utilities.getUuid();
      account.pinHash = pinDigest_(pin, account); account.issuedAt = new Date().toISOString();
      data.push({ range: "'tai_khoan'!A" + account.rowNumber + ':G' + account.rowNumber, values: [accountRow_(account)] });
      pending.push({ ma: account.ma, truong: account.truong, lop: account.lop, pin });
    }
    if (data.length) {
      // Một yêu cầu cho cả đợt, tránh 150 lệnh ghi riêng vượt quota theo phút.
      Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data }, id);
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
    const pin = newStudentPin_(); account.salt = Utilities.getUuid();
    account.pinHash = pinDigest_(pin, account); account.issuedAt = new Date().toISOString();
    Sheets.Spreadsheets.Values.update({ values: [accountRow_(account)] }, id,
      "'tai_khoan'!A" + account.rowNumber + ':G' + account.rowNumber, { valueInputOption: 'RAW' });
    issued = { ma: account.ma, truong: account.truong, lop: account.lop, pin };
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
  showIssuedPins_(ui, [issued], 'Các phiên cũ của mã này phải nhập lại PIN.');
  return { reset: true };
}
