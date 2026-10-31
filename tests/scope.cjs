const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const Core = require('../src/core.js');
const Safety = require('../src/safety.js');
const content = require('../src/content.json');
const { JSDOM } = require('jsdom');
const school = content.truong_lop[0].truong, klass = content.truong_lop[0].lop[0];
const records = [];
const cache = new Map();
const props = { SPREADSHEET_ID: 'test-sheet-only', TEACHER_PINS: JSON.stringify({ [school + '|' + klass]: '123456' }), COORDINATOR_PINS: JSON.stringify({ [school + '|' + klass]: '654321' }) };
let locked = false, c;
const context = {
  Date, console,
  PropertiesService: { getScriptProperties: () => ({ getProperty: key => props[key] }) },
  CacheService: { getScriptCache: () => ({ get: key => cache.get(key) || null, put: (k,v) => cache.set(k,v), remove: k => cache.delete(k) }) },
  LockService: { getScriptLock: () => ({ tryLock: () => locked = true, hasLock: () => locked, releaseLock: () => locked = false }) },
  Utilities: { getUuid: () => crypto.randomUUID() },
  Sheets: { Spreadsheets: { Values: { get: require('./helpers/sheets.cjs').valuesReader(() => vm.runInContext('HEADERS.chu_trinh', c), () => records), append: body => records.push(body.values[0]) } } },
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({
    getLastRow: () => records.length + 1,
    getRange: (start, column, count) => ({
      getValues: () => start === 1 ? [vm.runInContext('HEADERS.chu_trinh', c)] : records.slice(start - 2, start - 2 + count),
      createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => {
        const index = records.findIndex(row => row[0] === id);
        return index < 0 ? null : { getRow: () => index + 2 };
      } }) })
    })
  }) }) }
};
c = vm.createContext(context);
vm.runInContext(fs.readFileSync('apps-script/Schema.gs','utf8') + '\n' + fs.readFileSync('apps-script/Code.gs','utf8'),c);
require('./helpers/sheets.cjs').installStudentFixture(c,{school,klass,ma:'ZZ01-A',rows:()=>records});
function call(name, payload) { c.input = payload; return vm.runInContext(`${name}(input)`, c); }
function record(week) {
  const answers = Object.fromEntries(week.steps.flatMap(s => s.fields).map(f => [f.key, f.kind === 'rating' ? 2 : f.options ? f.options[0] : 'Mình đã thử thay đổi cách học để hiểu bài rõ hơn. '.repeat(5)]));
  // Bất kỳ ô văn bản nào cũng có thể chứa nội dung cần che, kể cả cột dẫn xuất.
  week.steps.flatMap(s => s.fields).filter(f => f.kind !== 'rating' && !f.options).forEach(f => { answers[f.key] += ' Mình bị bắt nạt.'; });
  return Core.record({ id: crypto.randomUUID(), started: new Date().toISOString(), activeMs: 1000, version: content.phien_ban, answers }, { ma: 'ZZ01-A', truong: school, lop: klass }, week);
}
for (const week of content.weeks) {
  const original = record(week), copy = JSON.stringify(original);
  const safe = Core.safeRecord(original, content.an_toan);
  assert.equal(JSON.stringify(original), copy, 'Local original stays intact');
  assert(!JSON.stringify(safe).includes('bắt nạt'), 'No keyword-containing field reaches the wire');
  assert.deepEqual(Core.safeRecord(safe, content.an_toan), safe, 'Redaction is repeatable');
  c.record = safe;
  vm.runInContext('valid_(record)', c);
  const result = call('submitRecord', { record: original, token: c.studentFixtureToken });
  assert(result.ok, result.error);
  assert(call('submitRecord', { record: original, token: c.studentFixtureToken }).duplicate, 'Redacted retry does not create a new row');
}
assert.equal(records.length,4);
assert(!JSON.stringify(records).includes('bắt nạt'), 'Server redacts even when client is bypassed');
assert(Safety.matches('BI BAT NAT', content.an_toan), 'Unaccented uppercase keyword matches');
assert(Safety.matches('bị\u200b bắt\n nạt', content.an_toan), 'Invisible characters and line breaks match');
assert(!Safety.matches('Mình thích học theo nhóm', content.an_toan));
assert.equal(Core.safeRecord({loai:'doi_y',vi_sao:'bị đánh',nhom:'Nhóm thử'},content.an_toan).vi_sao,Safety.hidden);
assert.equal(Core.safeRecord({loai:'phieu_buoi',kho_khan:'bị đánh'},content.an_toan).kho_khan,Safety.hidden);
console.log('PASS scope safety: four weeks, derived fields, immutable local text, server defense, retry deduplication, coordinator notes');
const login = input => call('loginTeacher', {truong:school,lop:klass,...input});
assert(!login({pin:'wrong'}).ok);
const teacher = login({pin:'123456'}); assert(teacher.ok);
const coord = call('loginCoordinator',{truong:school,lop:klass,pin:'654321'}); assert(coord.ok);
const input = {truong:school,lop:klass,token:teacher.token};
assert(!call('getClassProgress',{...input,token:coord.token}).ok, 'Coordinator cannot read class progress');
assert(!call('getClassProgress',{...input,token:'invalid-token-1234567890'}).ok);
assert(!call('getClassProgress',{...input,lop:content.truong_lop[0].lop[1]}).ok, 'No access to another class');
const headers = vm.runInContext('HEADERS.chu_trinh',c);
const other = [...records[0]]; other[headers.indexOf('lop')] = content.truong_lop[0].lop[1]; other[headers.indexOf('ma')] = 'ZZ99-C'; records.push(other);
const result = call('getClassProgress',input);
assert(result.ok);
assert.deepEqual(JSON.parse(JSON.stringify(result.students)),[{ma:'ZZ01-A',weeks:[1,2,3,4]}]);
assert.deepEqual(Object.keys(result.students[0]).sort(), ['ma','weeks']);
const forbidden = { id:'coord-test-123456', loai:'doi_y',truong:school,lop:klass,tuan:3,thoi_gian:new Date().toISOString(),nhom:'Nhóm thử',doi_hay_giu:'doi',vi_sao:'Chúng mình nghe được một lý lẽ mới' };
assert(!call('submitRecord',{record:forbidden,token:teacher.token}).ok, 'Teacher cannot submit coordinator forms');
const expiredSession = login({pin:'123456'});
const sessionKey = 'teacher:' + expiredSession.token;
cache.set(sessionKey, JSON.stringify({truong:school,lop:klass,expires:Date.now()-1}));
assert(!call('getClassProgress',{...input,token:expiredSession.token}).ok, 'Server rejects an expired session even if cached');
c.coordToken=coord.token;c.coordClass={truong:school,lop:klass};
vm.runInContext('authorizeCoordinator_(coordToken,coordClass)',c);
call('logoutCoordinator',coord.token);
assert.throws(()=>vm.runInContext('authorizeCoordinator_(coordToken,coordClass)',c),'Coordinator token is revoked on logout');
assert(call('logoutCoordinator',coord.token).ok,'Coordinator logout is idempotent');
// Old labelled submission rows still appear in canonical class reports.
const oldLabel=Core.classLabel(klass);records[0][headers.indexOf('lop')]=oldLabel;
assert.equal(call('getClassProgress',input).students[0].weeks.length,4);
props.TEACHER_PINS=JSON.stringify({[school+'|'+oldLabel]:'123456'});
assert(login({pin:'123456'}).ok,'Canonical login accepts an old property key');
props.TEACHER_PINS=JSON.stringify({[school+'|'+oldLabel]:'123456',[school+'|'+klass]:'654321'});
assert.equal(login({pin:'123456'}).code,'SETUP_REQUIRED','Ambiguous PIN configuration fails safely');
props.TEACHER_PINS=JSON.stringify({[school+'|'+klass]:'123456'});
call('logoutTeacher',teacher.token);
assert(!call('getClassProgress',input).ok,'Logged out teacher session is rejected');
for(let i=0;i<8;i++) assert(!login({pin:'wrong'}).ok);
assert(!login({pin:'123456'}).ok,'Throttling blocks repeated incorrect PIN attempts');
console.log('PASS scope permissions: role separation, wrong class, filtered response, invalid/revoked sessions, PIN throttling');
const dom = new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){w.setInterval=()=>0;w.scrollTo=()=>{};}});
try {
  dom.window.document.querySelector('#staffEntry').click();
  assert(dom.window.document.querySelector('#teacherLogin'));
  assert.equal(dom.window.document.querySelector('#teacherPin').disabled,true);
  assert(dom.window.document.querySelector('.progress-table').textContent.includes('ZZ01-A'));
  assert(!dom.window.localStorage.getItem('xoaychieu_v2'), 'Teacher demo stores no credential or student data');
} finally {dom.window.close();}
console.log('PASS scope teacher demo: accessible without student profile, fake data clearly labeled, no credentials stored');
