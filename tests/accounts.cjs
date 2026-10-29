const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const Core=require('../src/core.js'),content=require('../src/content.json');
let now=Date.now(),locked=false,failProgress=false,batchCalls=0,display='',selected=2;
class Clock extends Date {static now(){return now;}}
const school=content.truong_lop[0].truong,klass=content.truong_lop[0].lop[0];
const props={SPREADSHEET_ID:'fake-account-sheet',STUDENT_LOGIN_MODE:'mat_khau'},cache=new Map(),tables={tai_khoan:[],tien_do:[],chu_trinh:[]};
const ui={showModalDialog:html=>display=html.value,alert:()=>assert(!locked,'Release lock before a blocking UI alert')};
const api={
 get:(id,range,opts)=>{
  assert(locked);assert.equal(opts.valueRenderOption,'UNFORMATTED_VALUE');assert.equal(opts.dateTimeRenderOption,'SERIAL_NUMBER');
  const [name,cells]=range.replaceAll("'",'').split('!'),table=tables[name]; assert(table,range);
  if(cells==='E2:H')return {values:table.slice(1).map(row=>row.slice(4,8))};
  if(/^A1:[A-Z]$/.test(cells))return {values:table};
  if(cells==='1:1')return {values:[table[0]]};
  if(cells==='A2:A')return {values:table.slice(1).map(row=>[row[0]])};
  const match=cells.match(/^(\d+):\d+$/);assert(match,range);return {values:table[Number(match[1])-1]?[table[Number(match[1])-1]]:[]};
 },
 update:(body,id,range,opts)=>{
  assert(locked);assert.equal(opts.valueInputOption,'RAW');const [name,cells]=range.replaceAll("'",'').split('!');
  if(name==='tien_do'&&failProgress)throw Error('fixture progress write failed');
  tables[name][Number(cells.match(/^A(\d+)/)[1])-1]=body.values[0];
 },
 append:(body,id,range,opts)=>{
  assert(locked);assert.equal(opts.valueInputOption,'RAW');const name=range.split('!')[0].replaceAll("'",'');
  if(name==='tien_do'&&failProgress)throw Error('fixture progress write failed');
  tables[name].push(...body.values);
 },
 batchUpdate:(body,id)=>{assert(locked);batchCalls++;for(const data of body.data)api.update(data,id,data.range,{valueInputOption:body.valueInputOption});}
};
const c=vm.createContext({Date:Clock,console:{error(){}},
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(k,v)=>props[k]=v})},
 CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
 Utilities:{getUuid:()=>crypto.randomUUID(),Charset:{UTF_8:'UTF-8'},computeHmacSha256Signature:(message,secret)=>Array.from(crypto.createHmac('sha256',secret).update(message).digest())},
 LockService:{getScriptLock:()=>({tryLock:()=>locked=true,hasLock:()=>locked,releaseLock:()=>locked=false})},
 Sheets:{Spreadsheets:{Values:api}},
 SpreadsheetApp:{getUi:()=>ui,getActiveSpreadsheet:()=>({getId:()=>props.SPREADSHEET_ID,getActiveSheet:()=>({getName:()=> 'tai_khoan',getActiveRange:()=>({getNumRows:()=>1,getRow:()=>selected})})})},
 HtmlService:{createHtmlOutput:value=>({value,setWidth(){return this;},setHeight(){return this;}})}
});
for(const file of ['Schema.gs','Code.gs','Accounts.gs'])vm.runInContext(fs.readFileSync('apps-script/'+file,'utf8'),c);
tables.tai_khoan=[Array.from(vm.runInContext('ACCOUNT_HEADERS',c)),['ZZ01-A',school,klass],['ZZ02-B',school,klass]];
tables.tien_do=[Array.from(vm.runInContext('PROGRESS_HEADERS',c))];tables.chu_trinh=[Array.from(vm.runInContext('HEADERS.chu_trinh',c))];
function call(name,input){c.input=input;return vm.runInContext(name+'(input)',c);}
function login(ma,pin,extra={}){return call('loginStudent',{ma,truong:school,lop:klass,pin,...extra});}
const provision=call('provisionStudentAccounts_');assert.equal(provision.created,2);assert.equal(batchCalls,1);
const lines=display.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1].replaceAll('&quot;','"').split('\n');
const pins=Object.fromEntries(lines.slice(1).map(line=>{const cells=JSON.parse('['+line+']');return [cells[0],cells[3]];}));
assert.match(pins['ZZ01-A'],/^Xc[a-f0-9]{24}$/);assert.notEqual(tables.tai_khoan[1][4],tables.tai_khoan[2][4]);
assert(!JSON.stringify(tables).includes(pins['ZZ01-A']),'Plain PIN is never stored in Sheets');
const hash=tables.tai_khoan[1][5],secret=props.STUDENT_PIN_SECRET;
assert.equal(call('provisionStudentAccounts_').created,0);assert.equal(tables.tai_khoan[1][5],hash);assert.equal(props.STUDENT_PIN_SECRET,secret);
// Password field is canonical; numeric PIN requests issued by older versions stay valid.
assert(call('loginStudent',{ma:'ZZ01-A',truong:school,lop:klass,password:pins['ZZ01-A']}).ok);
assert(!call('loginStudent',{ma:'ZZ01-A',truong:school,lop:klass,password:pins['ZZ01-A'].toUpperCase()}).ok);
c.legacyAccount={ma:'ZZ02-B',truong:school,lop:klass,salt:tables.tai_khoan[2][4]};
const originalSecondHash=tables.tai_khoan[2][5];tables.tai_khoan[2][5]=vm.runInContext("pinDigest_('012345',legacyAccount)",c);
assert(login('ZZ02-B','012345').ok);assert(call('loginStudent',{ma:'ZZ02-B',truong:school,lop:klass,password:'012345'}).ok);
tables.tai_khoan[2][5]=originalSecondHash;
assert(!login('ZZ99-Z','XcUnknownSynthetic2026').ok,'A formatted but unregistered code cannot log in');
const owner=login('ZZ01-A',pins['ZZ01-A']);assert(owner.ok);const other=login('ZZ02-B',pins['ZZ02-B']);assert(other.ok);
const auth={ma:'ZZ01-A',truong:school,lop:klass,token:owner.token};
assert.equal(call('getStudentProgress',{...auth,token:other.token}).code,'AUTH_REQUIRED');
cache.set('teacher:fake-teacher-token-1234567890',JSON.stringify({...auth,expires:now+60000}));
assert.equal(call('getStudentProgress',{...auth,token:'fake-teacher-token-1234567890'}).code,'AUTH_REQUIRED');
assert.equal(call('getClassProgress',auth).code,'AUTH_REQUIRED','Student session cannot be used as teacher');
assert.equal(call('getStudentProgress',{...auth,lop:content.truong_lop[0].lop[1]}).code,'AUTH_REQUIRED');
assert.deepEqual(Array.from(call('getStudentProgress',auth).weeks),[]);
function record(week){const answers=Object.fromEntries(week.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'Mình đã thử thay đổi cách học để hiểu rõ hơn. '.repeat(5)]));answers.noi+=' Mình bị bắt nạt.';return Core.record({id:crypto.randomUUID(),started:new Date().toISOString(),activeMs:1000,version:content.phien_ban,answers},auth,week);}
const data=record(content.weeks[0]);
assert.equal(call('submitRecord',{record:data}).code,'AUTH_REQUIRED');
assert.equal(call('submitRecord',{record:data,token:other.token}).code,'AUTH_REQUIRED');
failProgress=true;assert.equal(call('submitRecord',{record:data,token:owner.token}).code,'SERVER_ERROR');assert.equal(tables.chu_trinh.length,2);
failProgress=false;const retry=call('submitRecord',{record:data,token:owner.token});assert(retry.ok&&retry.duplicate);assert.equal(tables.chu_trinh.length,2,'Retry repairs projection without another raw row');
assert(!JSON.stringify(tables.chu_trinh).includes('bắt nạt'));
assert.deepEqual(Array.from(call('getStudentProgress',auth).weeks),[1]);
assert.equal(tables.tien_do.length,2);assert.equal(tables.tien_do[1][3],true);assert.equal(tables.tien_do[1][7],1);
for(const week of content.weeks.slice(1))assert(call('submitRecord',{record:record(week),token:owner.token}).ok);
const newDevice=login('ZZ01-A',pins['ZZ01-A']);assert.deepEqual(Array.from(call('getStudentProgress',{...auth,token:newDevice.token}).weeks),[1,2,3,4]);
assert.deepEqual(Object.keys(call('getStudentProgress',auth)).sort(),['ok','ma','truong','lop','weeks','updatedAt'].sort(),'No work text or PIN digest returned');
call('logoutStudent',newDevice.token);assert.equal(call('getStudentProgress',{...auth,token:newDevice.token}).code,'AUTH_REQUIRED');
tables.tai_khoan[1][3]='khoa';assert.equal(call('getStudentProgress',auth).code,'AUTH_REQUIRED');assert.equal(login('ZZ01-A',pins['ZZ01-A']).code,'AUTH_REQUIRED');tables.tai_khoan[1][3]='hoat_dong';
call('resetSelectedStudentPin_');assert.notEqual(tables.tai_khoan[1][5],hash);assert.equal(call('getStudentProgress',auth).code,'AUTH_REQUIRED');assert.equal(login('ZZ01-A',pins['ZZ01-A']).code,'AUTH_REQUIRED');
for(let i=0;i<7;i++)login('ZZ02-B','000000');const blocked=login('ZZ02-B','000000');assert.equal(blocked.code,'RATE_LIMITED');assert.equal(blocked.retryAfterSeconds,600);
now+=120000;assert.equal(login('ZZ02-B',pins['ZZ02-B']).retryAfterSeconds,480);now+=480001;assert(login('ZZ02-B',pins['ZZ02-B']).ok);
now+=21600001;assert.equal(call('getStudentProgress',{...auth,ma:'ZZ02-B',token:other.token}).code,'AUTH_REQUIRED');
tables.nhap_tai_khoan=[['ma','truong','lop'],['ZZ01-A',school,klass],['ZZ03-C',school,klass],['ZZ01-A',school,content.truong_lop[0].lop[1]]];
assert.equal(call('importStudentRoster_').created,2);assert.equal(call('importStudentRoster_').created,0);
const previousRoster=JSON.stringify(tables.tai_khoan);tables.nhap_tai_khoan.push(['bad-code',school,klass]);
assert.throws(()=>call('importStudentRoster_'));assert.equal(JSON.stringify(tables.tai_khoan),previousRoster);tables.nhap_tai_khoan.pop();
const before=JSON.stringify(tables.tai_khoan);tables.tai_khoan.push([...tables.tai_khoan[1]]);assert.throws(()=>call('provisionStudentAccounts_'));tables.tai_khoan.pop();assert.equal(JSON.stringify(tables.tai_khoan),before);
// Same code in another class is a separate password/account, never a merged identity.
assert.equal(call('provisionStudentAccounts_').created,2);
const newlyIssued=display.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1].replaceAll('&quot;','"').split('\n').slice(1).map(line=>JSON.parse('['+line+']'));
const sibling=newlyIssued.find(row=>row[0]==='ZZ01-A'&&row[2]!==klass);
assert(sibling);assert(call('loginStudent',{ma:sibling[0],truong:sibling[1],lop:sibling[2],password:sibling[3]}).ok);
assert(!call('loginStudent',{ma:sibling[0],truong:sibling[1],lop:klass,password:sibling[3]}).ok);
// Existing Chi Lang credentials remain valid when a new school is added.
const legacy=content.truong_lop_cu?.[0];
if(legacy){
 c.legacyExisting={ma:'ZZ88-Z',truong:legacy.truong,lop:legacy.lop[0],salt:'legacy-test-salt'};
 const legacyHash=vm.runInContext("pinDigest_('XcLegacySynthetic2026',legacyExisting)",c);
 tables.tai_khoan.push(['ZZ88-Z',legacy.truong,legacy.lop[0],'hoat_dong','legacy-test-salt',legacyHash,'']);
 assert(call('loginStudent',{...c.legacyExisting,password:'XcLegacySynthetic2026'}).ok);
 call('importStudentRoster_');assert.equal(tables.tai_khoan.at(-1)[5],legacyHash);
 assert(Core.schools(content).some(s=>s.truong===legacy.truong&&s.lop.includes(legacy.lop[0])));
}
// Independent pre-upgrade HMAC: old label must not invalidate assigned passwords.
const label=Core.classLabel(klass), oldPin='XcOldLabelSynthetic2026', oldMa='ZZ77-Y', oldSalt='old-class-salt';
const oldMessage=JSON.stringify([JSON.stringify([school,label,oldMa]),oldSalt,oldPin]);
const oldHash=crypto.createHmac('sha256',props.STUDENT_PIN_SECRET).update(oldMessage).digest('hex');
const oldRow=[oldMa,school,label,'hoat_dong',oldSalt,oldHash,''];tables.tai_khoan.push(oldRow);
assert(call('loginStudent',{ma:oldMa,truong:school,lop:klass,password:oldPin}).ok,'Short class authenticates an old labelled account');
assert(call('loginStudent',{ma:oldMa,truong:school,lop:label,password:oldPin}).ok);
oldRow[2]=klass;assert(call('loginStudent',{ma:oldMa,truong:school,lop:klass,password:oldPin}).ok,'Renamed cell retains its old HMAC');
assert.equal(oldRow[5],oldHash);
assert(!call('loginStudent',{ma:oldMa,truong:school,lop:klass+' (unapproved)',password:oldPin}).ok);
// Full planned cohort uses one write request, without copying any real roster.
tables.tai_khoan=[tables.tai_khoan[0],...Array.from({length:150},(_,i)=>['AA'+String(Math.floor(i/26)).padStart(2,'0')+'-'+String.fromCharCode(65+i%26),school,klass])];
const batchesBefore=batchCalls;assert.equal(call('provisionStudentAccounts_').created,150);assert.equal(batchCalls-batchesBefore,1);
assert(tables.tai_khoan.slice(1).every(row=>/^[a-f0-9]{64}$/.test(row[5])));
// Chế độ chỉ cần mã (mặc định): học sinh vào bằng mã + trường/lớp, không cần mật khẩu.
props.STUDENT_LOGIN_MODE='ma';
assert.equal(vm.runInContext('studentLoginMode_()',c),'ma');
const codeOnly=call('loginStudent',{ma:'AA00-A',truong:school,lop:klass});
assert(codeOnly.ok,'Code-only mode accepts a rostered code without a password');
assert(typeof codeOnly.token==='string'&&codeOnly.token.length>=20);
assert(call('loginStudent',{ma:'ZZ99-Z',truong:school,lop:klass}).ok,'Code-only mode does not need a tai_khoan row');
assert(!call('loginStudent',{ma:'AA00-A',truong:'Trường không có trong danh sách',lop:klass}).ok,'Code-only mode still enforces the school list');
assert(!call('loginStudent',{ma:'ZZ99',truong:school,lop:klass}).ok,'Code-only mode still enforces the AB12-C format');
tables.tai_khoan.push(['ZZ66-X',school,klass,'khoa']);
assert.equal(call('loginStudent',{ma:'ZZ66-X',truong:school,lop:klass}).code,'AUTH_REQUIRED','Code-only mode rejects a locked account');
props.STUDENT_LOGIN_MODE='mat_khau';
assert.equal(vm.runInContext('studentLoginMode_()',c),'mat_khau');
assert(!call('loginStudent',{ma:'AA00-A',truong:school,lop:klass}).ok,'Password mode still rejects a passwordless request');
assert(!locked);
console.log('PASS student accounts: batched one-time PIN provisioning, HMAC, exact account scope, lock/reset/revoke/expiry, cooldown, safe submission, progress recovery after partial failure, four-week progress on new device, duplicate roster rejection');
