const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const Core = require('../src/core.js');
const content = require('../src/content.json');
const {valuesReader} = require('./helpers/sheets.cjs');
let clock = Date.now(), locked = false, busy = false;
const rows = [], cache = new Map();
class TestDate extends Date { static now(){return clock;} }
const school=content.truong_lop[0].truong, klass=content.truong_lop[0].lop[0];
const props={SPREADSHEET_ID:'fake-sheet',TEACHER_PINS:JSON.stringify({[school+'|'+klass]:'123456'})};
const c=vm.createContext({console,Date:TestDate,
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]})},
 CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
 Utilities:{getUuid:()=>crypto.randomUUID()},
 LockService:{getScriptLock:()=>({tryLock:()=>busy?false:(locked=true),hasLock:()=>locked,releaseLock:()=>locked=false})},
 Sheets:{Spreadsheets:{Values:{
  get:valuesReader(()=>vm.runInContext('HEADERS.chu_trinh',c),()=>rows,()=>assert(locked,'Read must hold the lock')),
  append:(body,id,range,options)=>{assert(locked);assert.equal(options.valueInputOption,'RAW');rows.push(body.values[0]);}
 }}},
 // Any accidental regression to the mixed SpreadsheetApp read path must fail this suite.
 SpreadsheetApp:{openById(){throw Error('Mixed read/write path is forbidden in submission');}}
});
vm.runInContext(fs.readFileSync('apps-script/Schema.gs','utf8')+'\n'+fs.readFileSync('apps-script/Code.gs','utf8'),c);
require('./helpers/sheets.cjs').installStudentFixture(c,{school,klass,ma:'ZZ01-A',rows:()=>rows,onRead:()=>assert(locked)});
function record(week,max=false){
 const answers=Object.fromEntries(week.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:max?('x '.repeat(Math.ceil(f.max/2))).slice(0,f.max):'Mình thay đổi cách học và thử giải thích bằng ví dụ mới. '.repeat(5)]));
 return Core.record({id:crypto.randomUUID(),started:new Date().toISOString(),activeMs:12000,version:content.phien_ban,answers},{ma:'ZZ01-A',truong:school,lop:klass},week);
}
function submit(record){c.payload={record,token:c.studentFixtureToken};return vm.runInContext('submitRecord(payload)',c);}
const special=record(content.weeks[0]);
special.san_pham="'Một dòng đầu\nMột dòng sau có khoảng trắng cuối   \n";
special.ban_goc_id='';special.thoi_luong_giay=12.5;
assert(submit(special).ok);
for(let i=0;i<19;i++){clock+=50;assert(submit(special).duplicate);}
assert.equal(rows.length,1,'Twenty sequential requests using same ID produce one row in the API fixture');
assert.equal(rows[0][14],special.san_pham);
assert(submit({...special,san_pham:special.san_pham+' '}).code==='ID_CONFLICT','Trailing whitespace is significant');
busy=true;assert.equal(submit({...special,id:crypto.randomUUID()}).code,'BUSY');busy=false;
for(const week of content.weeks){
 const data=record(week,true),result=submit(data);
 assert(result.ok,result.error);
 assert(submit(data).duplicate);
 const stored=rows.at(-1), headers=vm.runInContext('HEADERS.chu_trinh',c);
 for(const f of week.steps.flatMap(s=>s.fields).filter(f=>f.kind!=='rating'&&!f.options)){
  const expected=week.tuan===3&&f.key==='nghi_1'?'Phe A: '+data[f.key].slice(7):data[f.key];
  assert.equal(stored[headers.indexOf(f.key)],expected);
 }
 assert(Math.max(...stored.map(value=>typeof value==='string'?value.length:0))<=13000);
}
c.oversized=record(content.weeks[3]);c.oversized.thu_lam='x'.repeat(13001);
assert.throws(()=>vm.runInContext('valid_(oversized)',c));
assert.equal(vm.runInContext("sameCell_(undefined, '')",c),true);
assert.equal(vm.runInContext('sameCell_(12.5,12.5)',c),true);
assert.equal(vm.runInContext("sameCell_('12.5',12.5)",c),false,'Do not confuse user text with numbers');
assert.equal(vm.runInContext('sameCell_(false,false)',c),true);
console.log('PASS review submission: single API path under lock, sequential duplicate burst, RAW types/blanks/apostrophe/newlines/spaces, exact max-length fields and derived cells');
function login(pin){c.input={truong:school,lop:klass,pin};return vm.runInContext('loginTeacher(input)',c);}
for(let i=0;i<7;i++)assert.equal(login('000000').code,'AUTH_REQUIRED');
const blocked=login('000000');assert.equal(blocked.code,'RATE_LIMITED');assert.equal(blocked.retryAfterSeconds,600);
clock+=120000;
const waiting=login('123456');assert.equal(waiting.retryAfterSeconds,480);
const waitingAgain=login('000000');assert.equal(waitingAgain.retryAfterSeconds,480,'Further attempts cannot extend the cooldown');
clock+=480001;assert(login('123456').ok);
console.log('PASS review PIN: eighth failure, remaining wait, fixed deadline, successful retry after cooldown');

c.schemaRecord=record(content.weeks[0]);
vm.runInContext('SCHEMA.cellMax=undefined',c);
assert.equal(submit(c.schemaRecord).code,'SETUP_REQUIRED','An outdated Schema must fail closed');
vm.runInContext('SCHEMA.cellMax=13000',c);
const {spawnSync}=require('node:child_process');
const checked=spawnSync('python',['-c', `import build,copy,json
c=json.load(open('src/content.json'))
build.validate_content(c)
for mode in ('field','derived'):
 bad=copy.deepcopy(c)
 for step in bad['weeks'][3]['steps']:
  for field in step['fields']:
   if field['key'] in ('kiem_soat','ngoai_kiem_soat'): field['max']=13001 if mode=='field' else 6500
 try: build.validate_content(bad)
 except AssertionError: pass
 else: raise AssertionError(mode+' limit was not enforced')
`],{encoding:'utf8'});
assert.equal(checked.status,0,checked.stderr);
console.log('PASS review build: rejects excessive individual cells and derived week-four cells');
