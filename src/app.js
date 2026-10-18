'use strict';
/**
 * GIAO DIỆN VÀ ĐIỀU PHỐI DỮ LIỆU
 *
 * db.profiles: nháp + lịch sử theo bộ ba trường/lớp/mã.
 * db.queue: các gói nộp chưa nhận xác nhận, được lưu trước khi gọi mạng.
 * profile/tab/activeWeek: màn hình đang mở; không gửi thông tin thiết bị.
 * Các phần nội dung giáo dục đều đọc từ CONTENT, không nằm trong logic này.
 */
const $ = id => document.getElementById(id),
  E = Core.esc,
  KEY = APP_CONFIG.storageKey,
  LIVE = !!globalThis.google?.script?.run;
// Một snapshot dùng để phát hiện tab khác vừa ghi; không ghi đè âm thầm.
let storageSnapshot = null,
  storageConflict = false;
try {
  storageSnapshot = localStorage.getItem(KEY);
} catch {}
let db, loadBroken = false;
try {
  db = JSON.parse(localStorage.getItem(KEY) || 'null') || {
    profiles: {},
    queue: [],
    theme: 'light'
  };
  if (!db.profiles || !Array.isArray(db.queue)) throw Error('schema');
} catch {
  loadBroken = true;
  db = {
    profiles: {},
    queue: [],
    theme: 'light'
  };
}
let profile = db.current || null,
  tab = 'home',
  activeWeek = 1,
  coordToken = '',
  coordUntil = 0,
  teacherAuth = null,
  sending = false,
  lastTick = Date.now(),
  saveTimer = null,
  toastTimer, stageClock = null;
const person = () => profile ? (db.profiles[Core.key(profile)] ||= {
  drafts: {},
  history: []
}) : null;
/** Lưu nguyên trạng toàn bộ dữ liệu cục bộ; thất bại trả false để giữ nháp. */
function persist() {
  if (loadBroken) {
    toast('Dữ liệu cũ không đọc được. Hãy xuất bản sao trong Cài đặt.');
    return false;
  }
  try {
    if (storageConflict || localStorage.getItem(KEY) !== storageSnapshot) {
      storageConflict = true;
      showStorageConflict();
      return false;
    }
    const next = JSON.stringify(db);
    localStorage.setItem(KEY, next);
    storageSnapshot = next;
    return true;
  } catch {
    toast('Không lưu được trên máy. Hãy xuất bản sao ngay; đừng đóng trang.');
    return false;
  }
}

function showStorageConflict() {
  toast('Một tab khác đã thay đổi dữ liệu. Tab này tạm dừng lưu để tránh ghi đè.');
  if (!$('conflict')) return;
  $('conflict').classList.remove('hidden');
}

function toast(s) {
  $('toast').textContent = s;
  $('toast').classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 6000);
}

function rpc(name, data) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Error(
        'Chưa nhận xác nhận từ máy chủ. Bài vẫn nằm trong hàng đợi.')), APP_CONFIG
      .rpcTimeoutMs);
    google.script.run.withSuccessHandler(r => {
      clearTimeout(t);
      resolve(r)
    }).withFailureHandler(e => {
      clearTimeout(t);
      reject(Error(e.message || 'Không kết nối được máy chủ.'))
    })[name](data);
  });
}

function status() {
  if (!$('net')) return;
  const q = db.queue.length;
  $('net').textContent = LIVE ? (sending ? 'Đang gửi…' : q ? `${q} bản ghi chờ gửi` :
    'Đã đồng bộ hàng đợi') : 'Bản xem thử · lưu trên máy';
}
/**
 * Gửi tuần tự. Hàng đợi vẫn tồn tại trên đĩa trong suốt yêu cầu mạng.
 * ACK phải có đúng ID; timeout không có nghĩa bản ghi chưa đến máy chủ.
 * Vì vậy mọi lần thử lại gửi nguyên gói cũ, không sinh ID/thời gian mới.
 */
async function sync(force = false) {
  if (sending || !LIVE || !navigator.onLine || loadBroken || storageConflict || !db.queue.length)
    return;
  let changed = false;
  sending = true;
  status();
  try {
    for (const item of [...db.queue]) {
      if (force) {
        item.paused = false;
        item.nextTryAt = 0;
      }
      if (item.paused || Date.now() < (item.nextTryAt || 0)) continue;
      if (item.record.loai !== 'chu_trinh' && (!coordToken || Date.now() > coordUntil ||
          profile?.truong !== item.record.truong || profile?.lop !== item.record.lop)) {
        const message = 'Chọn đúng trường/lớp của phiếu, mở Điều phối và nhập lại PIN để gửi.';
        if (item.error !== message) {
          item.error = message;
          changed = true;
          persist();
        }
        continue;
      }
      try {
        item.record = Core.safeRecord(item.record, CONTENT.an_toan);
        if (!persist()) throw new Error('Chưa lưu được gói an toàn; chưa gửi.');
        const result = await rpc('submitRecord', {
          record: item.record,
          token: item.record.loai === 'chu_trinh' ? '' : coordToken,
        });
        if (!result?.ok || result.id !== item.record.id) {
          if (result?.code === 'AUTH_REQUIRED') {
            coordToken = '';
            coordUntil = 0;
          }
          const error = new Error(result?.error || 'Máy chủ chưa xác nhận đúng bản ghi.');
          error.permanent = result?.code === 'INVALID_RECORD' || result?.code === 'ID_CONFLICT';
          throw error;
        }
        db.queue = db.queue.filter(q => q.record.id !== item.record.id);
        changed = true;
        Object.values(db.profiles).forEach(p => p.history.forEach(h => {
          if (h.record.id === result.id) h.sent = true;
        }));
        // Nếu không lưu được ACK, trên đĩa vẫn còn gói: lần sau gửi lại cùng ID.
        persist();
      } catch (error) {
        changed = true;
        item.error = error.message;
        item.attempts = (item.attempts || 0) + 1;
        item.nextTryAt = Date.now() + Core.retryDelay(item.attempts, Math.random, APP_CONFIG);
        item.paused = !!error.permanent;
        persist();
        // Một bản ghi lỗi không chặn các bản ghi hợp lệ khác trong hàng đợi.
      }
      if (storageConflict) break;
    }
  } finally {
    sending = false;
    status();
    // Không dựng lại trang mỗi 5 giây nếu không có gì thay đổi: giữ trạng thái
    // mở bài cũ và hộp chọn tệp sao lưu của người dùng.
    if (changed && ['notebook', 'settings'].includes(tab)) render();
  }
}

function enqueue(record) {
  if (db.queue.some(q => q.record.id === record.id)) return true;
  db.queue.push({
    record
  });
  if (!persist()) {
    db.queue = db.queue.filter(q => q.record.id !== record.id);
    return false;
  }
  sync();
  return true;
}

function logo() {
  return `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="29" fill="var(--paper)" stroke="var(--gold)" stroke-width="1.2"/>
    <circle cx="32" cy="32" r="25" fill="none" stroke="var(--gold)" stroke-opacity=".35" stroke-dasharray="1 4"/>
    <g class="logo-orbit">
      <path d="M32 9C44 16 46 24 32 32C37 23 34 18 32 9Z" fill="var(--gold)"/>
      <path d="M55 32C48 44 40 46 32 32C41 37 46 34 55 32Z" fill="var(--green)"/>
      <path d="M32 55C20 48 18 40 32 32C27 41 30 46 32 55Z" fill="var(--rose)"/>
      <path d="M9 32C16 20 24 18 32 32C23 27 18 30 9 32Z" fill="var(--accent)"/>
    </g>
    <path d="M32 25L39 32L32 39L25 32Z" fill="var(--paper)" stroke="var(--gold)" stroke-width="1.2"/>
    <circle cx="32" cy="32" r="2.5" fill="var(--gold)"/>
  </svg>`;
}

function render() {
  document.body.classList.toggle('dark', db.theme === 'dark');
  const names = [
    ['home', '⌂', 'Hành trình'],
    ['notebook', '▤', 'Sổ của mình'],
    ['letters', '✉', 'Hộp thư'],
    ['coord', '◷', 'Điều phối'],
    ['teacher', '▦', 'Tiến độ lớp'],
    ['settings', '⚙', 'Cài đặt']
  ];
  $('app').innerHTML =
    `<div class="shell"><aside class="side"><a class="brand" id="brandHome" href="#home" aria-label="Xoay Chiều — về trang chính">${logo()}<div><strong>Xoay Chiều</strong><small>Mỗi góc nhìn, một điều mới</small></div></a><nav class="nav" aria-label="Chính">${names.map(([k,ic,n])=>`<button data-tab="${k}" class="${tab===k?'on':''}" ${tab===k?'aria-current="page"':''}><span>${ic}</span>${n}</button>`).join('')}</nav><div class="sidefoot"><p>THỬ · NGHĨ · NỐI · CHIA SẺ</p><p>Một hành trình nhỏ.<br>Nhiều cách nhìn mới.</p><div class="profile">${profile?`<strong>${E(profile.ma)}</strong><br>${E(profile.lop)}<br><small>${E(profile.truong)}</small>`:'Chưa chọn mã học sinh'}</div></div></aside><main class="main"><header class="top"><span class="caption">HÀNH TRÌNH HỌC TẬP / ${CONTENT.so_tuan} TUẦN</span><div class="row"><span id="net" class="status" aria-live="polite"></span><button class="small" id="theme" aria-label="Đổi giao diện sáng tối">${db.theme==='dark'?'☀':'☾'}</button></div></header><div id="conflict" class="notice hidden" role="alert">Dữ liệu đã đổi ở một tab khác. Tải bản sao của tab này trước khi tải lại trang. <button id="conflictBackup">Tải bản sao tab này</button><button id="conflictReload">Tải lại trang</button></div><div class="page" id="page"></div></main></div>`;
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
  $('brandHome').onclick = event => {
    event.preventDefault();
    go('home');
  };
  $('theme').onclick = () => {
    db.theme = db.theme === 'dark' ? 'light' : 'dark';
    persist();
    render();
  };
  status();
  $('conflictBackup').onclick = () => download('XoayChieu-tab-backup.json', JSON.stringify(db, null,
    2));
  $('conflictReload').onclick = () => location.reload();
  if (storageConflict) showStorageConflict();
  if (!profile && !['settings', 'letters', 'teacher'].includes(tab)) login();
  else({
    home,
    notebook,
    letters,
    coord,
    settings,
    teacher,
    work
  } [tab] || home)();
}

function go(t) {
  flushDraft();
  tab = t;
  render();
  window.scrollTo({
    top: 0
  });
}

function login() {
  const schools = CONTENT.truong_lop;
  $('page').innerHTML =
    `<div class="welcome"><p class="eyebrow">Chào bạn, rất vui được gặp</p><h1>Một góc nhìn mới<br>bắt đầu từ bạn.</h1><p class="muted">Không có câu trả lời đúng hay sai. Hãy thử, lắng nghe và ghi lại những điều mình nhận ra.</p><form id="login" class="panel"><label class="field"><span>Mã của bạn</span><input id="code" placeholder="Ví dụ định dạng: AB12-C" maxlength="8" autocomplete="off" autocapitalize="characters" required><small>Dùng đúng mã trên phiếu khảo sát. Không nhập họ tên.</small></label><label class="field"><span>Trường</span><select id="school"><option value="">Chọn trường</option>${schools.map(s=>`<option>${E(s.truong)}</option>`).join('')}</select></label><label class="field"><span>Lớp</span><select id="class"><option value="">Chọn lớp</option></select></label><p id="loginErr" class="error" role="alert"></p><button class="primary" style="width:100%">Bắt đầu hành trình →</button><details style="margin-top:18px"><summary>Cách tạo mã theo phiếu khảo sát</summary>${CONTENT.huong_dan_ma.buoc.map(b=>`<p class="caption">${E(b)}</p>`).join('')}</details></form><p class="caption">Câu trả lời lưu trên trình duyệt này${LIVE?' và được gửi về Google Sheet của nhóm nghiên cứu khi bạn nộp bài':''}. Không nhập số điện thoại, địa chỉ hay thông tin nhận diện người khác. Ô có từ khóa an toàn được thay bằng “[đã ẩn – an toàn]” trước khi gửi; bản gốc vẫn ở trên máy.</p></div>`;
  $('school').onchange = () => {
    $('class').innerHTML = '<option value="">Chọn lớp</option>' + (schools.find(s => s.truong ===
      $('school').value)?.lop || []).map(c => `<option>${E(c)}</option>`).join('');
  };
  $('login').onsubmit = e => {
    e.preventDefault();
    const ma = Core.normalize($('code').value),
      truong = $('school').value,
      lop = $('class').value;
    if (!Core.validCode(ma)) {
      $('loginErr').textContent = ma === 'HO07-T' ? 'Đây là mã ví dụ, hãy dùng mã của bạn.' :
        'Mã cần có dạng AB12-C (2 chữ, 2 số, dấu -, 1 chữ).';
      return;
    }
    if (!schools.some(s => s.truong === truong && s.lop.includes(lop))) {
      $('loginErr').textContent = 'Hãy chọn trường và lớp.';
      return;
    }
    profile = {
      ma,
      truong,
      lop
    };
    db.current = profile;
    person();
    if (!persist()) {
      profile = null;
      return;
    }
    tab = 'home';
    render();
  };
}

/** Trạng thái hiển thị của tuần; lưu cục bộ không đồng nghĩa đã được máy chủ nhận. */
function weekStatus(week) {
  const p = person(), history = p.history.filter(item => item.record.tuan === week);
  if (p.drafts[week]) return { kind: 'draft', text: history.length ? 'Đang viết lượt mới' : 'Đang viết' };
  if (!history.length) return { kind: 'new', text: 'Chưa bắt đầu' };
  if (history.some(item => !item.sent)) return LIVE ?
    { kind: 'pending', text: 'Có bài chờ gửi' } : { kind: 'local', text: 'Bài lưu trên máy' };
  return { kind: 'sent', text: 'Máy chủ đã xác nhận' };
}

function workflowSteps(week, step) {
  const currentStage = week.steps[step].stage;
  const stages = [...new Set(week.steps.map(item => item.stage))];
  const active = stages.indexOf(currentStage);
  return `<ol class="workflow-steps" aria-label="Các chặng của tuần">${stages.map((stage, index) =>
    `<li class="${index < active ? 'done' : index === active ? 'current' : ''}" ${index === active ? 'aria-current="step"' : ''}><span aria-hidden="true">${index < active ? '✓' : index + 1}</span>${E(stage)}</li>`).join('')}</ol>`;
}

function home() {
  const p = person(),
    done = new Set(p.history.map(h => h.record.tuan)),
    confirmed = new Set(p.history.filter(h => h.sent).map(h => h.record.tuan)),
    nextWeek = CONTENT.weeks.find(w => p.drafts[w.tuan]) || CONTENT.weeks.find(w => !done.has(w.tuan));
  $('page').innerHTML =
    `<section class="hero"><div><p class="eyebrow">SỔ TRẢI NGHIỆM CỦA ${E(profile.ma)}</p><h1>Thử một chút.<br>Hiểu mình thêm.</h1><p>Bốn tuần để rèn cách nhìn, thử và điều chỉnh việc học: chu trình tuần 1–2, tranh luận tuần 3, chỉnh sửa sản phẩm tuần 4. Mỗi lần thử là một cơ hội để bạn tìm ra cách của mình.</p><div class="row between"><span class="caption">Hành trình của bạn</span><strong>${done.size}/${CONTENT.so_tuan} tuần đã lưu</strong></div><div class="progress" style="margin-top:10px"><i style="width:${done.size/CONTENT.so_tuan*100}%"></i></div><p class="caption sync-summary">${LIVE ? `${confirmed.size}/${CONTENT.so_tuan} tuần đã được máy chủ xác nhận` : 'Bản xem thử chỉ lưu trên thiết bị này, chưa gửi Google Sheets.'}</p>${nextWeek ? `<button class="primary journey-continue" id="continueJourney">${p.drafts[nextWeek.tuan] ? 'Viết tiếp' : 'Khám phá'} tuần ${nextWeek.tuan} →</button>` : '<p class="notice">Bạn đã lưu đủ bốn tuần. Mở Sổ của mình để nhìn lại hành trình.</p>'}</div><div class="compass" aria-hidden="true"><span class="n">BỐN TUẦN KHÁM PHÁ</span><span class="s">MỖI BƯỚC LÀ MỘT KHÁM PHÁ</span></div></section><div class="row between titleline"><h3 style="margin:0">Bốn tuần, bốn trải nghiệm</h3><span class="caption">Đi theo nhịp của lớp bạn</span></div><section class="cards">${CONTENT.weeks.map((w,i)=>`<article class="card" style="--cardcolor:${['#b7791f','#0f7c70','#a83f53','#4c51bf'][i]}"><div class="row between"><span class="num">0${w.tuan}</span><span class="tag">${w.duration} phút · ${E(w.focus)}</span></div><h2>${E(w.title)}</h2><p>${E(w.letter.triet_gia)} · ${E(w.letter.tieu_de)}</p><div class="row between"><span class="week-status ${weekStatus(w.tuan).kind}">${E(weekStatus(w.tuan).text)}</span><button data-week="${w.tuan}" class="${i===0?'primary':''}">${p.drafts[w.tuan]?'Viết tiếp':done.has(w.tuan)?'Làm lượt mới':w.tuan===4?'Tạo bản 2':'Khám phá'} →</button></div></article>`).join('')}</section><div class="five">${CONTENT.mat_nang_luc.map(m=>`<div style="border-color:${E(m.mau)}"><strong>${E(m.ten)}</strong><br>${E(m.mo_ta)}</div>`).join('')}</div><p class="caption">${E(CONTENT.scope.trien_lam)}</p><footer>Không xếp hạng · Không chấm đúng sai · Lắng nghe theo cách của bạn</footer>`;
  if ($('continueJourney')) $('continueJourney').onclick = () => start(nextWeek.tuan);
  document.querySelectorAll('[data-week]').forEach(b => b.onclick = () => start(+b.dataset.week));
}

function start(n) {
  if (storageConflict || loadBroken) {
    showStorageConflict();
    return;
  }
  const p = person();
  if (!p.drafts[n]) {
    if (p.history.some(h => h.record.tuan === n) && !confirm(
        'Tạo một lượt làm mới? Bài đã nộp vẫn được giữ nguyên.')) return;
    p.drafts[n] = {
      id: Core.id(),
      version: CONTENT.phien_ban,
      step: 0,
      answers: {},
      started: new Date().toISOString(),
      activeMs: 0,
      stageTimes: {},
      hints: {}
    };
    if (!persist()) return;
  }
  activeWeek = n;
  lastTick = Date.now();
  tab = 'work';
  render();
}

function current() {
  return person()?.drafts[activeWeek];
}

function letterHTML(w) {
  return `<article class="letter"><p class="eyebrow">LÁ THƯ ${w.tuan} · ${E(w.letter.triet_gia)}</p><h2>${E(w.letter.tieu_de)}</h2>${w.letter.doan.map(p=>`<p>${E(p)}</p>`).join('')}<p><strong>${E(w.letter.cau_hoi_lon)}</strong></p><p class="signature">Hộp thư Xoay Chiều<br>${E(w.letter.nguon)}</p></article>`;
}

/** Tạo ô nhập. Gán .value sau khi dựng DOM để không mất dòng trống đầu tiên. */
function fieldHTML(f, a) {
  const val = a[f.key] ?? '';
  let control;
  if (f.kind === 'rating') control =
    `<div class="rating">${CONTENT.tieu_chi_san_pham.map(([v,t])=>`<label><input type="radio" name="rating" data-field="${f.key}" value="${v}" ${+val===v?'checked':''}><span><strong>Mức ${v}</strong><br>${E(t)}</span></label>`).join('')}</div>`;
  else if (f.options) control =
    `<select id="f_${f.key}" data-field="${f.key}"><option value="">Chọn một phương án</option>${f.options.map(o=>`<option ${val===o?'selected':''}>${E(o)}</option>`).join('')}</select>`;
  else control =
    `<textarea id="f_${f.key}" data-field="${f.key}" aria-describedby="err_${f.key}" ${f.min===30?'style="min-height:260px"':''}></textarea><small id="count_${f.key}">${Core.words(val)} từ · tối thiểu ${f.min} từ · tối đa ${f.max} ký tự</small>`;
  if (f.kind === 'rating')
  return `<fieldset class="field ratingfield"><legend>${E(f.label)}</legend>${control}<div id="err_${f.key}" class="error" role="alert"></div></fieldset>`;
  return `<div class="field"><span><label for="f_${f.key}">${E(f.label)}</label></span>${control}<div id="err_${f.key}" class="error" role="alert"></div></div>`;
}

function work() {
  const w = CONTENT.weeks.find(w => w.tuan === activeWeek),
    d = current();
  if (!d) {
    go('home');
    return;
  }
  d.step = Math.min(d.step, w.steps.length - 1);
  const s = w.steps[d.step],
    a = d.answers;
  $('page').innerHTML =
    `<div class="work"><button class="backlink" id="leave">← Hành trình của mình</button><header class="workhead"><p class="eyebrow">TUẦN ${w.tuan} · ${E(w.focus)}</p><h1>${E(w.title)}</h1><div class="row between"><span class="caption">${E(s.stage)} · ${d.step+1}/${w.steps.length} màn hình</span><span id="stepTimer" class="caption"></span></div><div class="progress" style="margin-top:10px"><i style="width:${(d.step+1)/w.steps.length*100}%"></i></div>${workflowSteps(w, d.step)}</header><section class="panel">${d.step===0?letterHTML(w):`<h2>${E(s.title)}</h2>`}${s.body?`<p>${E(s.body)}</p>`:''}${w.quy_trinh==='trien_lam_45'&&s.fields.some(f=>f.key==='san_pham')?oldProductHTML():''}${s.fields.map(f=>fieldHTML(f,a)).join('')}${s.dao_sau?.length?`<details class="probing"><summary>Thử nghĩ sâu hơn</summary>${s.dao_sau.map(q=>`<p>${E(q)}</p>`).join('')}<p class="caption">Câu hỏi gợi mở, không phải bài kiểm tra hay câu trả lời mẫu.</p></details>`:''}<div id="safety" class="hidden safety" role="status">${E(CONTENT.an_toan.loi_nhan)}${CONTENT.an_toan.lien_he?'<br>'+E(CONTENT.an_toan.lien_he):''}</div>${s.hints.length?`<button id="hint" class="small">Mình chưa biết bắt đầu thế nào</button><div id="hints">${s.hints.slice(0,d.hints[d.step]||0).map(h=>`<p class="hint">${E(h)}</p>`).join('')}</div>`:''}<div class="actions"><button id="prev" ${d.step===0?'disabled':''}>← Quay lại</button><button id="next" class="primary">${d.step===w.steps.length-1?'Lưu & nộp bài ✓':'Tiếp tục →'}</button></div><p class="caption" style="margin:18px 0 0" id="draftStatus">Bản nháp lưu trên máy · Đồng hồ chỉ gợi ý, không khóa bài</p></section></div>`;
  $('leave').onclick = () => go('home');
  $('prev').onclick = () => {
    flushDraft();
    d.step--;
    persist();
    render();
  };
  $('next').onclick = () => nextStep(w, s, d);
  document.querySelectorAll('[data-field]').forEach(el => {
    if (el.type !== 'radio') el.value = a[el.dataset.field] ?? '';
  });
  document.querySelectorAll('[data-field]').forEach(el => el.addEventListener('input', () => {
    d.answers[el.dataset.field] = el.type === 'radio' ? Number(el.value) : el.value;
    const f = s.fields.find(f => f.key === el.dataset.field);
    if ($('count_' + f.key)) $('count_' + f.key).textContent =
      `${Core.words(el.value)} từ · tối thiểu ${f.min} từ · tối đa ${f.max} ký tự`;
    $('err_' + f.key).textContent = '';
    safety();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (persist() && $('draftStatus')) $('draftStatus').textContent =
        'Đã lưu nháp trên máy · Đồng hồ chỉ gợi ý';
    }, 250);
  }));
  if ($('hint')) $('hint').onclick = () => {
    d.hints[d.step] = Math.min(s.hints.length, (d.hints[d.step] || 0) + 1);
    persist();
    $('hints').innerHTML = s.hints.slice(0, d.hints[d.step]).map(h =>
      `<p class="hint">${E(h)}</p>`).join('');
    $('hint').disabled = d.hints[d.step] >= s.hints.length;
  };
  if ($('reuse')) $('reuse').onclick = () => {
    const h = person().history.find(h => h.record.id === $('oldProduct').value);
    if (!h) {
      toast('Hãy chọn một sản phẩm trước.');
      return;
    }
    if (a.san_pham && !confirm('Thay nội dung đang sửa bằng sản phẩm đã chọn?')) return;
    d.sourceId = h.record.id;
    a.dang_san_pham = h.record.dang_san_pham;
    a.san_pham = h.record.san_pham;
    persist();
    render();
  };
  safety();
  updateClock();
}

function safety() {
  const d = current();
  if (!$('safety') || !d) return;
  const text = Object.values(d.answers).join(' ');
  $('safety').classList.toggle('hidden', !Core.safetyMatches(text, CONTENT.an_toan));
}

function oldProductHTML() {
  const hs = person().history.filter(h => h.record.tuan < 4);
  return `<div class="notice"><label for="oldProduct">Sản phẩm tuần 1–3 trên máy này</label><select id="oldProduct"><option value="">${hs.length?'Chọn sản phẩm để sửa':'Chưa có sản phẩm cũ trên máy này'}</option>${hs.map(h=>`<option value="${E(h.record.id)}">Tuần ${h.record.tuan} · ${new Date(h.record.thoi_gian).toLocaleString('vi-VN')}</option>`).join('')}</select><button id="reuse" class="small" style="margin-top:10px">Dùng làm bản gốc</button><p class="caption" style="margin:8px 0 0">Bài gốc vẫn được giữ nguyên. Nếu đổi máy, bạn có thể nhập lại sản phẩm từ bản giấy.</p></div>`;
}

function collect() {
  if (tab !== 'work' || !current()) return;
  document.querySelectorAll('[data-field]').forEach(el => {
    if (el.type === 'radio' && !el.checked) return;
    current().answers[el.dataset.field] = el.type === 'radio' ? +el.value : el.value;
  });
}

function flushDraft() {
  collect();
  clearTimeout(saveTimer);
  if (profile) persist();
}

/** Kiểm tra màn hình hiện tại; nộp chỉ khi mọi trường của cả tuần hợp lệ. */
function nextStep(w, s, d) {
  if (storageConflict || loadBroken) {
    showStorageConflict();
    return;
  }
  collect();
  let bad = false;
  s.fields.forEach(f => {
    const err = Core.validate(f, d.answers[f.key]);
    $('err_' + f.key).textContent = err;
    if (err) bad = true;
  });
  if (bad) {
    document.querySelector('.error:not(:empty)')?.scrollIntoView({
      block: 'center'
    });
    return;
  }
  if (d.step < w.steps.length - 1) {
    d.step++;
    persist();
    render();
    window.scrollTo({
      top: 0
    });
    return;
  }
  for (let i = 0; i < w.steps.length; i++)
    if (w.steps[i].fields.some(f => Core.validate(f, d.answers[f.key]))) {
      d.step = i;
      render();
      toast('Hãy hoàn thành phần còn thiếu trước khi nộp.');
      return;
    }
  const record = Core.record(d, profile, w, APP_CONFIG.version),
    p = person();
  $('next').disabled = true;
  p.history.push({
    record,
    sent: false
  });
  db.queue.push({
    record
  });
  delete p.drafts[w.tuan];
  if (!persist()) {
    p.drafts[w.tuan] = d;
    p.history = p.history.filter(h => h.record.id !== record.id);
    db.queue = db.queue.filter(q => q.record.id !== record.id);
    $('next').disabled = false;
    return;
  }
  tab = 'notebook';
  render();
  toast(LIVE ? 'Đã lưu trên máy. Đang chờ xác nhận gửi từ máy chủ.' :
    'Đã lưu bài trên máy. Bản xem thử chưa gửi Google Sheets.');
  sync();
}

function updateClock() {
  if (tab !== 'work' || !current()) return;
  const w = CONTENT.weeks.find(w => w.tuan === activeWeek),
    d = current(),
    s = w.steps[d.step];
  if (!$('stepTimer')) return;
  const left = Math.max(0, s.minutes * 60 - Math.floor((d.stageTimes[s.stage] || 0) / 1000));
  $('stepTimer').textContent = s.minutes ?
    `${s.stage} · ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} gợi ý` :
    'Tự đánh giá theo nhịp của bạn';
}
setInterval(() => {
  const now = Date.now(),
    dt = Math.min(now - lastTick, 2000);
  lastTick = now;
  if (tab === 'work' && current() && !document.hidden && !storageConflict && !loadBroken) {
    const d = current(),
      w = CONTENT.weeks.find(w => w.tuan === activeWeek),
      s = w.steps[d.step];
    d.activeMs += dt;
    d.stageTimes[s.stage] = (d.stageTimes[s.stage] || 0) + dt;
    updateClock();
    if (Math.floor(d.activeMs / 1000) % 5 === 0) persist();
  }
}, 1000);

function notebook() {
  const h = person().history.slice().reverse();
  $('page').innerHTML =
    `<p class="eyebrow">NHỮNG ĐIỀU BẠN ĐÃ NHẬN RA</p><div class="row between"><h1>Sổ của mình</h1><button id="exportMine">Tải bản sao JSON ↓</button></div><p class="muted">Bài đã nộp được giữ nguyên. Làm lượt mới tạo ID mới; bản 2 tuần 4 giữ liên kết với sản phẩm gốc. Dữ liệu ở đây chỉ thuộc mã đang chọn trên máy này.</p>${h.length?h.map(x=>`<article class="panel" style="margin:18px 0"><div class="row between"><span class="tag">TUẦN ${x.record.tuan}${x.record.ban_goc_id ? ' · BẢN 2' : ''}</span><span class="caption">${new Date(x.record.thoi_gian).toLocaleString('vi-VN')}</span></div><h2 style="margin:15px 0">${E(CONTENT.weeks.find(w=>w.tuan===x.record.tuan)?.title)}</h2>${x.record.ban_goc_id ? '<p class="caption revision-note">Bản chỉnh sửa liên kết với sản phẩm gốc trên máy. Bài gốc được giữ nguyên.</p>' : ''}<p class="badge">${x.sent?'✓ Máy chủ đã xác nhận':LIVE?'◌ Chờ gửi — bài còn trên máy':'◌ Chỉ lưu trên máy ở bản xem thử'}</p><p class="caption">${Math.floor(x.record.thoi_luong_giay/60)} phút ${x.record.thoi_luong_giay%60} giây hoạt động · Tự đánh giá mức ${x.record.tu_danh_gia}</p><details class="historydetails"><summary>Xem câu trả lời và sản phẩm</summary>${['thu_lam','nghi_1','nghi_2','nghi_3','noi','san_pham','chia_se'].map(k=>`<div class="entry"><strong>${({thu_lam:'Thử',nghi_1:'Nghĩ 1',nghi_2:'Nghĩ 2 / Thư gửi mình',nghi_3:'Nghĩ 3',noi:'Nối',san_pham:'Sản phẩm',chia_se:'Chia sẻ / Đổi hoặc giữ ý'})[k]}</strong><pre class="text">${E(x.record[k])}</pre></div>`).join('')}</details></article>`).join(''):'<div class="panel empty"><h2>Trang đầu đang chờ bạn.</h2><p>Hoàn thành một tuần để lưu trải nghiệm của mình ở đây.</p><button id="first" class="primary">Bắt đầu tuần 1 →</button></div>'}`;
  $('exportMine').onclick = () => download('XoayChieu-' + profile.ma + '.json', JSON.stringify({
    profile,
    ...person()
  }, null, 2));
  if ($('first')) $('first').onclick = () => start(1);
}

function letters() {
  $('page').innerHTML =
    `<p class="eyebrow">MỖI TUẦN, MỘT CÂU HỎI LỚN</p><h1>Hộp thư triết học</h1><p class="muted">Một lá thư nhỏ để mở đầu cuộc trò chuyện với chính mình.</p><div class="cards">${CONTENT.weeks.map(w=>`<article class="card"><span class="eyebrow">LÁ THƯ 0${w.tuan} · ${E(w.letter.triet_gia)}</span><h2>${E(w.letter.tieu_de)}</h2><p>${E(w.letter.cau_hoi_lon)}</p><button data-letter="${w.tuan}">Mở thư ↗</button></article>`).join('')}</div><div class="notice">${E(CONTENT.noi_dung_status)}</div>`;
  document.querySelectorAll('[data-letter]').forEach(b => b.onclick = () => {
    const w = CONTENT.weeks.find(w => w.tuan === +b.dataset.letter);
    $('letterDialog').innerHTML = letterHTML(w) + '<button id="closeLetter">Đóng thư</button>';
    $('closeLetter').onclick = () => $('letterDialog').close();
    $('letterDialog').showModal();
  });
}

function download(name, text) {
  const u = URL.createObjectURL(new Blob([text], {
      type: 'application/json;charset=utf-8'
    })),
    a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function settings() {
  $('page').innerHTML =
    `<h1>Cài đặt & dữ liệu</h1><section class="panel"><h3>${profile?'Mã đang dùng: '+E(profile.ma):'Chưa chọn mã'}</h3><p class="muted">Đổi mã không xóa bài của mã cũ trên máy. Trên máy dùng chung, người khác có quyền truy cập trình duyệt có thể xem dữ liệu đã lưu.</p><button id="change">${profile?'Đổi mã / trường / lớp':'Nhập mã'}</button><div class="divider"></div><h3>${LIVE?'Kết nối Google Sheets':'Bản xem thử trên máy'}</h3><p>${LIVE?'Chỉ xóa bài khỏi hàng đợi sau khi máy chủ xác nhận đúng mã bản ghi.':'Bản này không gửi dữ liệu nghiên cứu. Hãy triển khai bộ Apps Script đi kèm để sử dụng chính thức.'}</p><p>${db.queue.length} bản ghi đang chờ.</p><button id="retry">Thử gửi lại</button>${db.queue.filter(q=>q.error).map(q=>`<p class="error">${E(q.record.loai)}: ${E(q.error)}</p>`).join('')}<div class="divider"></div><h3>Bản sao trên máy</h3><p class="caption">Tải bản sao trước khi đổi máy hoặc xóa dữ liệu trình duyệt. Bản sao toàn bộ có dữ liệu của mọi mã từng dùng trên máy này, hãy giữ riêng.</p><button id="backup">Tải bản sao toàn bộ</button><label class="field"><span>Khôi phục bản sao toàn bộ trên máy mới</span><input type="file" id="import" accept=".json,application/json"></label><p class="caption">Khôi phục chỉ áp dụng trên trình duyệt chưa có dữ liệu; bài chưa gửi được giữ ở trạng thái tạm dừng. Bấm Thử gửi lại để tiếp tục.</p><div class="divider"></div><details><summary>Thông tin phiên bản</summary><p>Ứng dụng ${E(APP_CONFIG.version)} · Nội dung ${E(CONTENT.phien_ban)} · ${E(CONTENT.noi_dung_status)}</p><p>Thời gian hoạt động chỉ tính khi màn hình làm bài đang mở và hiển thị; không phải thước đo mức độ tập trung. Học sinh tự giữ mã; mã không phải mật khẩu.</p></details></section>`;
  $('change').onclick = () => {
    flushDraft();
    profile = null;
    delete db.current;
    coordToken = '';
    persist();
    tab = 'home';
    render();
  };
  $('retry').onclick = () => LIVE ? sync(true) : toast('Bản xem thử chưa kết nối Google Sheets.');
  $('backup').onclick = () => download('XoayChieu-backup.json', loadBroken ? (localStorage.getItem(
    KEY) || '{}') : JSON.stringify(db, null, 2));
  $('import').onchange = async e => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (Object.keys(db.profiles).length || db.queue.length) throw Error(
        'Hãy dùng trình duyệt mới chưa có dữ liệu để khôi phục, tránh ghi đè.');
      if (file.size > APP_CONFIG.maxBackupBytes) throw Error('Tệp quá lớn.');
      const v = Backup.restore(JSON.parse(await file.text()), CONTENT);
      if (!confirm(
          'Khôi phục dữ liệu? Bài chưa gửi sẽ được giữ và tạm dừng; bấm Thử gửi lại khi sẵn sàng.'
        )) return;
      const oldDb = db,
        oldProfile = profile;
      db = v;
      profile = db.current || null;
      loadBroken = false;
      if (!persist()) {
        db = oldDb;
        profile = oldProfile;
        throw Error('Không ghi được bản khôi phục. Dữ liệu hiện tại chưa bị thay.');
      }
      render();
      toast('Đã khôi phục, giữ nguyên các bài chờ gửi. Chưa tự gửi lên máy chủ.');
    } catch (err) {
      toast(err.message);
    }
  };
}

function coord() {
  if (LIVE && (!coordToken || Date.now() > coordUntil)) {
    coordLogin();
    return;
  }
  const p = profile;
  $('page').innerHTML =
    `<p class="eyebrow">GIỮ NHỊP · LẮNG NGHE · CÙNG SUY NGHĨ</p><h1>Góc điều phối</h1>${LIVE?'':'<div class="notice">Chế độ xem thử. Phiếu chỉ lưu trên máy; khi triển khai thật cần PIN do giáo viên cấp.</div>'}<section class="panel"><label class="field"><span>Buổi của tuần</span><select id="coordWeek">${CONTENT.weeks.map(w=>`<option value="${w.tuan}">Tuần ${w.tuan} · ${w.duration} phút</option>`).join('')}</select></label><div class="row between"><div><span id="stageName" class="eyebrow"></span><div id="coordTime" class="timer">00:00</div></div><div class="row"><button id="timerPlay">Bắt đầu / Tạm dừng</button><button id="timerNext">Chặng tiếp →</button></div></div><p class="caption">Thời gian gợi ý. Điều phối viên chủ động chuyển chặng.</p><div id="coordStages" class="caption"></div><div class="divider"></div><div class="row between"><h3>Thẻ câu hỏi</h3><button id="draw" class="small">Rút thẻ khác</button></div><p id="questionCard"></p><details><summary>Vai trò & luật trao đổi</summary>${CONTENT.vai.map(v=>`<p><strong>${E(v[0])}</strong>: ${E(v[1])}</p>`).join('')}<p>${CONTENT.luat_vong_tron.map(E).join(' · ')}</p></details></section><section class="panel" style="margin-top:20px"><h2>Phiếu ghi buổi</h2><p class="caption">${E(p.truong)} · ${E(p.lop)}. Điền sau khi buổi hoạt động kết thúc.</p><form id="sessionForm"><div class="cards"><label class="field"><span>Ngày</span><input name="ngay" type="date" required value="${localDate()}"></label><label class="field"><span>Khung giờ</span><input name="khung_gio" placeholder="Ví dụ 08:00–08:45" required maxlength="60"></label><label class="field"><span>Thời lượng thực tế (phút)</span><input name="thoi_luong_thuc_te_phut" type="number" min="1" max="240" required></label><label class="field"><span>Sĩ số</span><input name="si_so" type="number" min="1" max="200" required></label><label class="field"><span>Số bạn tham gia</span><input name="so_tham_gia" type="number" min="0" max="200" required></label><label class="field"><span>Hình thức</span><select name="dung_app_hay_giay"><option>App</option><option>Giấy</option><option>Kết hợp</option></select></label></div><div class="checks">${['mo_thu','thu','nghi','noi','chia_se'].map((k,i)=>`<label><input type="checkbox" name="da_lam_${k}">${['Đã mở thư','Đã Thử','Đã Nghĩ','Đã Nối','Đã Chia sẻ'][i]}</label>`).join('')}</div><label class="field"><span>Điều diễn ra tốt</span><textarea name="dieu_tot" required maxlength="6000"></textarea></label><label class="field"><span>Khó khăn (ghi “Không có” nếu không có)</span><textarea name="kho_khan" required maxlength="6000"></textarea></label><label class="field"><span>Điều phối viên — viết tắt</span><input name="dieu_phoi_vien_viet_tat" required maxlength="30"></label><button class="primary">Lưu phiếu ghi buổi</button></form></section><section class="panel" style="margin-top:20px" id="debatePanel"><h2>Đổi / giữ ý của nhóm — tuần 3</h2><form id="debateForm"><label class="field"><span>Mã hoặc tên nhóm (không ghi họ tên)</span><input name="nhom" required maxlength="60"></label><label class="field"><span>Lựa chọn</span><select name="doi_hay_giu"><option value="doi">Đổi ý</option><option value="giu">Giữ ý</option></select></label><label class="field"><span>Vì sao?</span><textarea name="vi_sao" required maxlength="6000"></textarea></label><button class="primary">Lưu ý kiến nhóm</button></form></section>`;

  function resetTimer() {
    if (stageClock?.interval) clearInterval(stageClock.interval);
    const w = CONTENT.weeks.find(w => w.tuan === +$('coordWeek').value),
      map = new Map();
    w.steps.forEach(s => {
      if (s.minutes && !map.has(s.stage)) map.set(s.stage, s.minutes)
    });
    stageClock = {
      stages: [...map],
      idx: 0,
      remaining: [...map][0][1] * 60,
      running: false
    };
    $('debatePanel').classList.toggle('hidden', w.tuan !== 3);
    $('coordStages').textContent = [...map].map(([s, m]) => `${s} ${m}′`).join(' → ');
    paintCoord();
  }
  $('coordWeek').onchange = resetTimer;
  resetTimer();
  $('timerPlay').onclick = () => {
    stageClock.running = !stageClock.running;
    stageClock.last = Date.now();
  };
  $('timerNext').onclick = () => {
    if (stageClock.idx >= stageClock.stages.length - 1) {
      stageClock.running = false;
      toast('Đã đến chặng cuối. Hãy ghi phiếu buổi.');
      return;
    }
    stageClock.idx++;
    stageClock.remaining = stageClock.stages[stageClock.idx][1] * 60;
    stageClock.last = Date.now();
    paintCoord();
  };
  const qs = Object.values(CONTENT.loai_cau_hoi_socrates).flatMap(x => x.mau_cau.map(q => x.ten +
    ': ' + q));
  const draw = () => {
    $('questionCard').textContent = qs[Math.floor(Math.random() * qs.length)];
  };
  $('draw').onclick = draw;
  draw();
  $('sessionForm').onsubmit = e => {
    e.preventDefault();
    const form = e.target,
      d = Object.fromEntries(new FormData(form));
    for (const k of ['thoi_luong_thuc_te_phut', 'si_so', 'so_tham_gia']) d[k] = Number(d[k]);
    if (d.so_tham_gia > d.si_so) {
      toast('Số tham gia không được lớn hơn sĩ số.');
      return;
    } ['mo_thu', 'thu', 'nghi', 'noi', 'chia_se'].forEach(k => d['da_lam_' + k] = !!form.elements[
      'da_lam_' + k].checked);
    saveCoord(form, {
      ...d,
      loai: 'phieu_buoi',
      tuan: +$('coordWeek').value
    });
  };
  $('debateForm').onsubmit = e => {
    e.preventDefault();
    const form = e.target,
      d = Object.fromEntries(new FormData(form));
    if (Core.words(d.vi_sao) < 5) {
      toast('Hãy ghi ít nhất 5 từ giải thích.');
      return;
    }
    saveCoord(form, {
      ...d,
      loai: 'doi_y',
      tuan: 3
    });
  };
  bindCoordinatorDrafts();
}
/** Lưu nháp phiếu điều phối giống bài học sinh, tách theo hồ sơ và form. */
function bindCoordinatorDrafts() {
  const p = person();
  p.coordDrafts ||= {};
  for (const formId of ['sessionForm', 'debateForm']) {
    const form = $(formId),
      draft = p.coordDrafts[formId];
    if (draft) {
      for (const [name, value] of Object.entries(draft.fields)) {
        const el = form.elements[name];
        if (!el) continue;
        if (el.type === 'checkbox') el.checked = value === true;
        else el.value = value;
      }
      if (formId === 'sessionForm' && draft.week) {
        $('coordWeek').value = draft.week;
        $('coordWeek').dispatchEvent(new Event('change'));
      }
    }
    const save = () => {
      const fields = {};
      for (const el of form.elements) {
        if (!el.name) continue;
        fields[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      }
      p.coordDrafts[formId] = {
        fields,
        week: Number($('coordWeek').value)
      };
      persist();
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    if (formId === 'sessionForm') $('coordWeek').addEventListener('change', save);
  }
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function saveCoord(form, data) {
  form.dataset.id ||= Core.id();
  const record = {
    ...data,
    id: form.dataset.id,
    truong: profile.truong,
    lop: profile.lop,
    thoi_gian: new Date().toISOString(),
    phien_ban_app: APP_CONFIG.version
  };
  if (enqueue(record)) {
    delete person().coordDrafts?.[form.id];
    form.reset();
    delete form.dataset.id;
    persist();
    toast('Đã lưu phiếu trên máy. ' + (LIVE ? 'Đang chờ gửi.' : 'Bản xem thử chưa gửi.'));
  }
}

function paintCoord() {
  if (!$('coordTime') || !stageClock) return;
  const t = Math.max(0, Math.ceil(stageClock.remaining));
  $('stageName').textContent = stageClock.stages[stageClock.idx][0];
  $('coordTime').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  $('timerPlay').textContent = stageClock.running ? 'Tạm dừng' : 'Bắt đầu / Tiếp tục';
}
setInterval(() => {
  if (stageClock?.running) {
    const n = Date.now();
    stageClock.remaining = Math.max(0, stageClock.remaining - (n - stageClock.last) / 1000);
    stageClock.last = n;
    if (!stageClock.remaining) {
      stageClock.running = false;
      toast('Hết thời gian gợi ý của chặng.');
    }
  }
  paintCoord();
}, 500);

/** Tiến độ lớp không tải câu trả lời hay điểm tự đánh giá về trình duyệt. */
function teacher() {
  const page = $('page');
  const active = teacherAuth && Date.now() < teacherAuth.expires;
  if (!active) teacherAuth = null;
  page.innerHTML = `<p class="eyebrow">DÀNH CHO GIÁO VIÊN CHỦ NHIỆM</p><h1>Tiến độ lớp</h1><p class="muted">Chỉ xem mã và tuần đã được máy chủ xác nhận. Không đọc câu trả lời, sản phẩm hay mức tự đánh giá.</p>${!LIVE ? '<div class="notice">Bản xem thử chưa kết nối Sheet. Bảng dưới đây chỉ dùng dữ liệu giả để minh họa.</div>' : ''}${active ? `<section class="panel"><div class="row between"><h2>${E(teacherAuth.lop)}</h2><button id="teacherLogout">Đăng xuất</button></div><p>${E(teacherAuth.truong)}</p><button id="teacherRefresh">Làm mới tiến độ</button><div id="teacherResult" aria-live="polite"></div></section>` : `<form id="teacherLogin" class="panel"><label class="field"><span>Trường phụ trách</span><select id="teacherSchool">${CONTENT.truong_lop.map(s => `<option>${E(s.truong)}</option>`).join('')}</select></label><label class="field"><span>Lớp phụ trách</span><select id="teacherClass"></select></label><label class="field"><span>PIN giáo viên</span><input id="teacherPin" type="password" inputmode="numeric" pattern="[0-9]{6,12}" required autocomplete="off" ${LIVE ? '' : 'disabled'}></label><button class="primary" ${LIVE ? '' : 'disabled'}>Xem tiến độ lớp</button><p id="teacherError" class="error" role="alert"></p></form>${!LIVE ? '<section class="panel" style="margin-top:20px"><h2>Minh họa bằng dữ liệu giả</h2><div id="teacherResult"></div></section>' : ''}`}<p class="caption">Bảng chỉ liệt kê mã đã có ít nhất một bài được xác nhận. Chưa có danh sách mã được cấp để kết luận các mã chưa xuất hiện là chưa làm bài. Giáo viên không được chia sẻ PIN hoặc dùng chung thiết bị đang mở Sổ của mình với học sinh.</p>`;
  function showStudents(students) {
    const result = $('teacherResult');
    if (!result || $('page') !== page) return;
    result.innerHTML = students.length ? `<div class="table-scroll"><table class="progress-table"><caption>Tuần đã nộp — ${LIVE ? 'dữ liệu được xác nhận' : 'dữ liệu giả'}</caption><thead><tr><th scope="col">Mã</th>${[1,2,3,4].map(w => `<th scope="col">Tuần ${w}</th>`).join('')}</tr></thead><tbody>${students.map(student => `<tr><th scope="row">${E(student.ma)}</th>${[1,2,3,4].map(w => `<td>${student.weeks.includes(w) ? '<span class="badge">Đã nộp</span>' : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="notice">Chưa có bài được máy chủ xác nhận cho lớp này.</p>';
  }
  async function refresh() {
    const auth = teacherAuth;
    const button = $('teacherRefresh');
    button.disabled = true;
    $('teacherResult').textContent = 'Đang tải tiến độ…';
    try {
      const response = await rpc('getClassProgress', { token: auth.token, truong: auth.truong, lop: auth.lop });
      if ($('page') !== page || teacherAuth !== auth) return;
      if (!response?.ok) {
        if (response?.code === 'AUTH_REQUIRED') { teacherAuth = null; teacher(); toast('Phiên giáo viên hết hạn. Hãy đăng nhập lại.'); return; }
        throw Error(response?.error || 'Chưa tải được tiến độ.');
      }
      showStudents(response.students);
    } catch (error) {
      if ($('page') === page && $('teacherResult')) $('teacherResult').textContent = error.message;
    } finally { if (button.isConnected) button.disabled = false; }
  }
  if (active) {
    $('teacherRefresh').onclick = refresh;
    $('teacherLogout').onclick = () => {
      const token = teacherAuth.token;
      teacherAuth = null;
      teacher();
      rpc('logoutTeacher', token).catch(() => {});
    };
    refresh();
  } else {
    const school = $('teacherSchool'), klass = $('teacherClass');
    const choose = () => {
      klass.innerHTML = CONTENT.truong_lop.find(s => s.truong === school.value).lop.map(lop => `<option>${E(lop)}</option>`).join('');
    };
    school.onchange = choose;
    choose();
    $('teacherLogin').onsubmit = async event => {
      event.preventDefault();
      if (!LIVE) return;
      const button = event.target.querySelector('button');
      button.disabled = true;
      const input = { truong: school.value, lop: klass.value, pin: $('teacherPin').value };
      $('teacherPin').value = '';
      $('teacherError').textContent = '';
      try {
        const response = await rpc('loginTeacher', input);
        if ($('page') !== page) return;
        if (!response?.ok) throw Error(response?.error || 'Chưa đăng nhập được.');
        teacherAuth = { token: response.token, expires: response.expires, truong: input.truong, lop: input.lop };
        teacher();
      } catch (error) { if ($('page') === page) $('teacherError').textContent = error.message; }
      finally { if (button.isConnected) button.disabled = false; }
    };
    if (!LIVE) showStudents([{ ma: 'ZZ01-A', weeks: [1, 2] }, { ma: 'ZZ02-B', weeks: [1] }]);
  }
}

function coordLogin() {
  $('page').innerHTML =
    `<div class="welcome panel"><h2>Chế độ điều phối</h2><p>${E(profile.truong)} · ${E(profile.lop)}</p><p class="muted">Nhập PIN được giáo viên cấp cho lớp. PIN được kiểm tra trên máy chủ.</p><form id="pinForm"><label class="field"><span>PIN điều phối</span><input id="pin" type="password" inputmode="numeric" minlength="6" maxlength="12" required autocomplete="off"></label><button class="primary">Mở chế độ điều phối</button><p id="pinErr" class="error" role="alert"></p></form></div>`;
  $('pinForm').onsubmit = async e => {
    e.preventDefault();
    const b = e.target.querySelector('button');
    b.disabled = true;
    try {
      const r = await rpc('loginCoordinator', {
        truong: profile.truong,
        lop: profile.lop,
        pin: $('pin').value
      });
      if (!r.ok) throw Error(r.error || 'PIN không đúng.');
      coordToken = r.token;
      coordUntil = r.expires;
      render();
      sync(true);
    } catch (err) {
      $('pinErr').textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
}
/** Hiệu ứng nhấn dùng chung; không can thiệp xử lý nút hay dữ liệu bài làm. */
function showButtonRipple(event) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const button = event.target.closest?.('button');
  if (!button || button.disabled) return;
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'button-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  // Click từ bàn phím đặt vòng sáng ở giữa nút.
  ripple.style.left = `${event.detail ? event.clientX - rect.left : rect.width / 2}px`;
  ripple.style.top = `${event.detail ? event.clientY - rect.top : rect.height / 2}px`;
  ripple.style.setProperty('--ripple-scale', Math.max(2, Math.hypot(rect.width, rect.height) / 6));
  button.querySelectorAll('.button-ripple').forEach(node => node.remove());
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
}

/** Đăng ký vòng đời sau khi giao diện được dựng. */
function boot() {
  document.addEventListener('click', showButtonRipple);
  window.addEventListener('online', () => {
    status();
    sync();
  });
  window.addEventListener('pagehide', flushDraft);
  window.addEventListener('storage', event => {
    if (event.key === KEY && event.newValue !== storageSnapshot) {
      storageConflict = true;
      showStorageConflict();
    }
  });
  document.addEventListener('visibilitychange', () => {
    lastTick = Date.now();
    if (document.hidden) flushDraft();
  });
  render();
  if (loadBroken) toast('Dữ liệu trên máy không đọc được. Chưa ghi đè dữ liệu cũ.');
  if (LIVE) sync();
  // Kiểm tra định kỳ, nhưng mỗi bản ghi có backoff riêng sau lỗi mạng/quota.
  setInterval(() => sync(), 5000);
  if ('serviceWorker' in navigator && !LIVE && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
if (!globalThis.__XOAY_CHIEU_TEST__) boot();
