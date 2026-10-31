const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const Core=require('../src/core.js'),content=require('../src/content.json');
const school=content.truong_lop[0].truong,klass=content.truong_lop[0].lop[0],hash='a'.repeat(64);
const a={ma:'ZZ01-A',truong:school,lop:klass,token:'fake-learning-student-session-123456'},b={...a,ma:'ZZ02-B',token:'fake-other-student-session-123456'};
const tables={},cache=new Map(),props={SPREADSHEET_ID:'fake-learning-sheet'};let locked=false,failWrite=false;
const api={
 get(id,range,options){assert.equal(options.valueRenderOption,'UNFORMATTED_VALUE');assert.equal(options.dateTimeRenderOption,'SERIAL_NUMBER');const [name,cells]=range.replaceAll("'",'').split('!'),rows=tables[name];assert(rows,range);
  if(cells==='E2:H')return {values:rows.slice(1).map(row=>row.slice(4,8))};
  if(cells==='A2:A')return {values:rows.slice(1).map(row=>[row[0]])};
  if(cells==='1:1')return {values:[rows[0]]};
  if(/^A1:[A-Z]$/.test(cells))return {values:rows};
  const match=cells.match(/^(\d+):\d+$/);assert(match,range);return {values:rows[Number(match[1])-1]?[rows[Number(match[1])-1]]:[]};},
 batchGet(id,options){return {valueRanges:options.ranges.map(range=>api.get(id,range,options))};},
 append(body,id,range,options){assert(locked);assert.equal(options.valueInputOption,'RAW');if(failWrite)throw Error('fake outage');tables[range.split('!')[0].replaceAll("'",'')].push(...body.values);},
 update(body,id,range,options){assert(locked);assert.equal(options.valueInputOption,'RAW');if(failWrite)throw Error('fake outage');const [name,cells]=range.replaceAll("'",'').split('!');tables[name][Number(cells.match(/^A(\d+)/)[1])-1]=body.values[0];}
};
const c=vm.createContext({Date,console:{error(){}},
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]})},
 CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
 LockService:{getScriptLock:()=>({tryLock:()=>locked=true,hasLock:()=>locked,releaseLock:()=>locked=false})},
 Sheets:{Spreadsheets:{Values:api}}
});
for(const name of ['Schema.gs','Code.gs','Accounts.gs','Learning.gs'])vm.runInContext(fs.readFileSync('apps-script/'+name,'utf8'),c);
for(const [name,header] of [['tai_khoan','ACCOUNT_HEADERS'],['tien_do','PROGRESS_HEADERS'],['nhap_hoc_tap','LEARNING_HEADERS'],['chu_trinh','HEADERS.chu_trinh']])tables[name]=[Array.from(vm.runInContext(header,c))];
for(const account of [a,b]){tables.tai_khoan.push([account.ma,account.truong,account.lop,'hoat_dong','fake-salt',hash,'']);cache.set('student:'+account.token,JSON.stringify({...account,credentialVersion:hash,expires:Date.now()+600000}));}
function call(name,input){c.input=input;return vm.runInContext(name+'(input)',c);}
const draft={id:crypto.randomUUID(),version:content.phien_ban,step:2,answers:{thu_lam:'Nháp có nội dung bị bắt nạt cần che.'},started:new Date().toISOString(),activeMs:8000,stageTimes:{},hints:{}};
const request={...a,week:1,draft,mutationId:crypto.randomUUID(),expectedRevision:0};
assert.equal(call('saveStudentDraft',{...request,token:b.token}).code,'AUTH_REQUIRED');
cache.set('teacher:fake-teacher-session-123456',JSON.stringify({...a,expires:Date.now()+60000}));
assert.equal(call('getStudentLearning',{...a,token:'fake-teacher-session-123456'}).code,'AUTH_REQUIRED');
assert.equal(call('saveStudentDraft',{...request,lop:content.truong_lop[0].lop[1]}).code,'AUTH_REQUIRED');
let saved=call('saveStudentDraft',request);assert(saved.ok,saved.error);assert.equal(saved.revision,1);
assert.equal(tables.nhap_hoc_tap.length,2);assert(!JSON.stringify(tables.nhap_hoc_tap).includes('bắt nạt'));assert(draft.answers.thu_lam.includes('bắt nạt'));
assert(call('saveStudentDraft',request).duplicate);assert.equal(tables.nhap_hoc_tap[1][5],1);
assert.equal(call('saveStudentDraft',{...request,draft:{...draft,step:3}}).code,'ID_CONFLICT');
let restored=call('getStudentLearning',a);assert(restored.ok,restored.error);assert.equal(restored.states[0].draft.step,2);assert.equal(restored.states[0].draft.answers.thu_lam,'[đã ẩn – an toàn]');
assert.equal(call('getStudentLearning',b).states.length,0);
const stale={...request,mutationId:crypto.randomUUID(),draft:{...draft,answers:{thu_lam:'Một bản khác từ thiết bị thứ hai.'}}};
assert.equal(call('saveStudentDraft',stale).code,'STATE_CONFLICT');
const changed={...stale,expectedRevision:1};assert.equal(call('saveStudentDraft',changed).revision,2);
assert.equal(call('saveStudentDraft',{...request,mutationId:crypto.randomUUID(),expectedRevision:1}).code,'STATE_CONFLICT');
failWrite=true;const recovery={...changed,expectedRevision:2,mutationId:crypto.randomUUID()};assert.equal(call('saveStudentDraft',recovery).code,'SERVER_ERROR');failWrite=false;assert.equal(call('saveStudentDraft',recovery).revision,3);
const week=content.weeks[0],answers=Object.fromEntries(week.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'Mình thay đổi cách học và giải thích bằng ví dụ. '.repeat(5)]));
const record=Core.record({...draft,answers},a,week);assert(call('submitRecord',{record,token:a.token}).ok);
restored=call('getStudentLearning',a);assert.equal(restored.states[0].draft,null,'Submitted draft must not reappear as unfinished');assert.equal(restored.records.length,1);assert.equal(restored.records[0].id,draft.id);
assert.equal(call('getStudentLearning',b).records.length,0);
assert.equal(call('saveStudentDraft',{...request,expectedRevision:3,mutationId:crypto.randomUUID()}).code,'ALREADY_SUBMITTED');
// Maximum-size multiline/emoji payload spans cells without cutting surrogate pairs.
const largeWeek=content.weeks[3],largeAnswers=Object.fromEntries(largeWeek.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'😀'.repeat(Math.floor(f.max/2))]));
const large={...draft,id:crypto.randomUUID(),answers:largeAnswers,step:4};
assert(call('saveStudentDraft',{...a,week:4,draft:large,expectedRevision:0,mutationId:crypto.randomUUID()}).ok);
const chunks=tables.nhap_hoc_tap.at(-1).slice(8);assert(chunks.filter(Boolean).length>1);assert(chunks.every(cell=>cell.length<=10000));
assert.equal(call('getStudentLearning',a).states.find(s=>s.week===4).draft.answers.san_pham,largeAnswers.san_pham);
assert(!call('saveStudentDraft',{...a,week:4,draft:{...large,answers:{...largeAnswers,unexpected:'bad'}},expectedRevision:1,mutationId:crypto.randomUUID()}).ok);
assert(!call('saveStudentDraft',{...a,week:4,draft:{...large,step:999},expectedRevision:1,mutationId:crypto.randomUUID()}).ok);
// Escaped quotes/backslashes at field limits must also survive chunked JSON.
const escaped=Object.fromEntries(largeWeek.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'\\'.repeat(f.max)]));
assert(call('saveStudentDraft',{...a,week:4,draft:{...large,answers:escaped},expectedRevision:1,mutationId:crypto.randomUUID()}).ok);
assert.equal(call('getStudentLearning',a).states.find(s=>s.week===4).draft.answers.san_pham,escaped.san_pham);
// Old labelled rows join the same canonical account and retain submission IDs/revisions.
const oldLabel=Core.classLabel(klass);tables.tai_khoan[1][2]=oldLabel;
tables.chu_trinh[1][6]=oldLabel;
for(const row of tables.nhap_hoc_tap.slice(1))row[2]=oldLabel;
for(const row of tables.tien_do.slice(1))row[2]=oldLabel;
assert(call('submitRecord',{record,token:a.token}).duplicate,'Canonical retry acknowledges an old labelled submission');
assert.equal(call('getStudentProgress',a).weeks[0],1);
const legacyState=call('getStudentLearning',a);assert.equal(legacyState.records[0].lop,klass);assert(legacyState.states.some(s=>s.week===4));
const nextRecord={...record,id:crypto.randomUUID()};assert(call('submitRecord',{record:nextRecord,token:a.token}).ok);assert.equal(tables.chu_trinh.at(-1)[6],klass,'New records write only the class code');
cache.delete('student:'+a.token);assert.equal(call('getStudentLearning',a).code,'AUTH_REQUIRED');assert(!locked);
console.log('PASS learning server: authenticated own drafts/history, safety, week/step validation, duplicate mutation, CAS conflict, outage recovery, submitted-draft suppression and maximum emoji/chunk round trip');
