const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),Core=require('../src/core.js'),content=require('../src/content.json');
const school=content.truong_lop[0].truong,klass=content.truong_lop[0].lop[0],key='xoaychieu_v2',database=new Map(),calls=[];
let offline=false,loseAck=false;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const clone=value=>JSON.parse(JSON.stringify(value));
function state(owner){if(!database.has(owner))database.set(owner,{drafts:{},records:[]});return database.get(owner);}
function open(snapshot){
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;w.google={script:{run:{}}};if(snapshot)w.localStorage.setItem(key,snapshot);}});
 const w=dom.window,$=id=>w.document.getElementById(id);
 w.fakeRpc=async(name,input)=>{
  calls.push({name,input:clone(input)});if(offline)throw Error('Fake network outage');
  const owner=typeof input==='object'?Core.key(input.record||input):'';
  if(name==='loginStudent')return {ok:true,token:'fake-cloud-session-'+input.ma,expires:Date.now()+600000};
  if(name==='logoutStudent')return {ok:true};
  const db=state(owner);
  if(name==='getStudentProgress')return {ok:true,weeks:[...new Set(db.records.map(record=>record.tuan))]};
  if(name==='getStudentLearning')return {ok:true,records:clone(db.records),states:Object.entries(db.drafts).map(([week,item])=>({week:Number(week),revision:item.revision,mutationId:item.mutationId,draft:db.records.some(record=>record.id===item.draft.id)?null:clone(item.draft)}))};
  if(name==='saveStudentDraft'){
   const before=db.drafts[input.week];
   if(before?.mutationId===input.mutationId)return {ok:true,revision:before.revision,mutationId:input.mutationId};
   if((before?.revision||0)!==input.expectedRevision)return {ok:false,code:'STATE_CONFLICT',revision:before?.revision||0,draft:before?.draft||null};
   db.drafts[input.week]={revision:input.expectedRevision+1,mutationId:input.mutationId,draft:clone(input.draft)};
   if(loseAck){loseAck=false;throw Error('Lost response after server commit');}
   return {ok:true,revision:input.expectedRevision+1,mutationId:input.mutationId};
  }
  if(name==='submitRecord'){if(!db.records.some(record=>record.id===input.record.id))db.records.push(clone(input.record));return {ok:true,id:input.record.id};}
  throw Error('Unexpected RPC: '+name);
 };
 w.eval('rpc=fakeRpc');
 async function login(ma='ZZ01-A'){$('code').value=ma;$('school').value=school;$('school').dispatchEvent(new w.Event('change'));$('class').value=klass;$('studentPin').value='12345678';$('loginStart').click();await tick();assert(w.eval('LearningSync.ready'));}
 function edit(text){const field=w.document.querySelector('textarea[data-field]');assert(field);field.value=text;field.dispatchEvent(new w.Event('input',{bubbles:true}));w.eval('collect();persist();LearningSync.remember()');return field;}
 return {dom,w,$,login,edit};
}
(async()=>{
 const devices=[];try{
  const a=open();devices.push(a);await a.login();a.w.eval('start(1)');while(!a.w.document.querySelector('textarea[data-field]'))a.$('next').click();
  a.edit('Bản nháp tuần đầu để tuần sau tiếp tục.');const initialId=a.w.eval('current().id'),initialStep=a.w.eval('current().step');
  await a.w.eval('LearningSync.flushBeforeLogout()');assert.equal(state(Core.key({ma:'ZZ01-A',truong:school,lop:klass})).drafts[1].draft.answers.thu_lam,'Bản nháp tuần đầu để tuần sau tiếp tục.');
  assert.equal(a.w.eval('studentProgress.weeks.length'),0,'Drafts do not count as submitted weeks');
  const b=open();devices.push(b);await b.login();assert.match(b.$('continueJourney').textContent,/Viết tiếp tuần 1/);b.$('continueJourney').click();assert.equal(b.w.eval('current().id'),initialId);assert.equal(b.w.eval('current().step'),initialStep);
  assert.equal(b.w.document.querySelector('textarea[data-field]').value,'Bản nháp tuần đầu để tuần sau tiếp tục.');
  b.edit('Bản mới trên thiết bị thứ hai.');await b.w.eval('LearningSync.flushBeforeLogout()');
  const field=a.edit('Phần viết mới trên thiết bị cũ.');await a.w.eval('LearningSync.flushBeforeLogout()');assert(a.$('learningNotice'));assert.equal(a.w.document.querySelector('textarea[data-field]'),field);assert.equal(field.value,'Phần viết mới trên thiết bị cũ.');
  a.w.document.querySelector('[data-cloud-local="1"]').click();await tick();assert.notEqual(a.w.eval('current().id'),initialId);assert(a.w.eval('person().cloud.backups.length>=2'));assert(!a.$('learningNotice'));
  a.edit('Nội dung bị bắt nạt cần được che khi lưu từ nháp.');await a.w.eval('LearningSync.flushBeforeLogout()');const wire=calls.filter(call=>call.name==='saveStudentDraft').at(-1);assert.equal(wire.input.draft.answers.thu_lam,'[đã ẩn – an toàn]');assert(a.w.eval('current().answers.thu_lam').includes('bắt nạt'));
  offline=true;a.edit('Nháp giữ trên máy khi mất mạng.');await a.w.eval('LearningSync.flushBeforeLogout()');assert.match(a.$('draftStatus').textContent,/trên máy/);const snapshot=a.w.localStorage.getItem(key);assert(snapshot.includes('Nháp giữ trên máy'));offline=false;
  // Lost ACK retains the exact mutation ID; reloading and fetching state recovers it.
  loseAck=true;await a.w.eval('LearningSync.flushBeforeLogout()');const pendingMutation=a.w.eval('person().cloud.pending[1].mutationId');assert(pendingMutation);
  const reload=open(a.w.localStorage.getItem(key));devices.push(reload);await reload.login();await reload.w.eval('LearningSync.flushBeforeLogout()');assert.equal(reload.w.eval('Object.keys(person().cloud.pending).length'),0);
  reload.$('continueJourney').click();assert.equal(reload.w.document.querySelector('textarea[data-field]').value,'Nháp giữ trên máy khi mất mạng.');
  // Submit week 1, then a fresh browser must restore the notebook and advance to week 2.
  const week=content.weeks[0],answers=Object.fromEntries(week.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'Mình đã thử cách học và nhìn nhận điều thay đổi. '.repeat(5)]));
  reload.w.record=Core.record({...clone(reload.w.eval('current()')),answers},{ma:'ZZ01-A',truong:school,lop:klass},week);
  reload.w.eval('person().history.push({record,sent:false});db.queue.push({record});delete person().drafts[1];persist();LearningSync.remember()');await reload.w.eval('sync(true)');
  const c=open();devices.push(c);await c.login();assert.match(c.$('continueJourney').textContent,/Khám phá tuần 2/);assert.equal(c.w.eval('person().history.length'),1);assert(c.w.eval('person().history[0].sent'));
  c.w.eval('start(4)');while(!c.w.document.querySelector('#oldProduct')){
   const fields=c.w.document.querySelectorAll('[data-field]');for(const field of fields){const definition=content.weeks[3].steps[c.w.eval('current().step')].fields.find(f=>f.key===field.dataset.field);if(field.type==='radio'){if(field.value==='2')field.checked=true;}else field.value=definition.options?definition.options[0]:'Mình thay đổi cách học và giải thích bằng ví dụ. '.repeat(5);}
   c.$('next').click();
  }
  assert.equal(c.$('oldProduct').options.length,2,'Week 4 can select the restored earlier product');
  c.w.eval('go("home");start(2)');while(!c.w.document.querySelector('textarea[data-field]'))c.$('next').click();c.edit('Viết tiếp tuần hai trước khi đăng xuất.');c.$('logout').click();for(let wait=0;wait<150&&!c.$('login');wait++)await new Promise(resolve=>setTimeout(resolve,10));assert(c.$('login'));assert.equal(state(Core.key({ma:'ZZ01-A',truong:school,lop:klass})).drafts[2].draft.answers.thu_lam,'Viết tiếp tuần hai trước khi đăng xuất.');
  const other=open();devices.push(other);await other.login('ZZ02-B');assert.equal(other.w.eval('person().history.length'),0);assert.equal(other.w.eval('Object.keys(person().drafts).length'),0);
  assert(!snapshot.includes('fake-cloud-session')&&!snapshot.includes('12345678'));
  console.log('PASS learning UI: next-session/new-device resume, exact step and draft, two-device conflict with backups, masked wire/raw local text, offline/lost-ACK recovery, week-2 progression, week-4 product recovery, logout flush and account isolation');
 }finally{for(const device of devices)device.dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
