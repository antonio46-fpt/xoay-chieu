const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),content=require('../src/content.json'),Core=require('../src/core.js');
const school=content.truong_lop[0].truong,klass=content.truong_lop[0].lop[0],storageKey='xoaychieu_v2';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function open(snapshot){
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;w.google={script:{run:{}}};if(snapshot)w.localStorage.setItem(storageKey,snapshot);}});
 const w=dom.window,$=id=>w.document.getElementById(id),calls=[];
 let session=0,rejectProgress=false,submitResult=null;
 w.fakeRpc=async(name,input)=>{
  calls.push({name,input});
  if(name==='loginStudent')return input.pin==='12345678'?{ok:true,token:'fake-student-token-'+(++session),expires:Date.now()+600000}:{ok:false,code:'AUTH_REQUIRED',error:'Mã hoặc PIN không đúng.'};
  if(name==='getStudentProgress'){if(rejectProgress)throw Error('Mất mạng thử');return {ok:true,weeks:[1,2],updatedAt:new Date().toISOString()};}
  if(name==='submitRecord')return submitResult||{ok:true,id:input.record.id};
  return {ok:true};
 };
 w.eval('rpc=fakeRpc');
 async function login(ma='ZZ01-A',pin='12345678'){$('code').value=ma;$('school').value=school;$('school').dispatchEvent(new w.Event('change'));$('class').value=klass;$('studentPin').value=pin;$('loginStart').click();await tick();}
 return {dom,w,$,calls,login,set rejectProgress(v){rejectProgress=v;},set submitResult(v){submitResult=v;}};
}
(async()=>{
 const a=open();try{
  await a.login('ZZ01-A','87654321');assert(a.$('login'));assert.match(a.$('loginErr').textContent,/không đúng/);assert.equal(a.$('studentPin').value,'');
  await a.login();assert(!a.$('login'));assert.match(a.w.document.querySelector('.sync-summary').textContent,/2\/4/);assert.match(a.$('continueJourney').textContent,/tuần 3/);
  assert.equal(a.w.document.querySelectorAll('.week-status.sent').length,2,'Progress from Sheet appears with no local history');
  assert.equal(a.w.eval('person().history.length'),0);
  let saved=a.w.localStorage.getItem(storageKey);assert(!saved.includes('12345678')&&!saved.includes('fake-student-token'));
  const reload=open(saved);try{assert(reload.$('studentPin'),'Reload requires PIN even if db.current exists');}finally{reload.dom.window.close();}
  a.w.eval('start(1)');for(let i=0;i<content.weeks[0].steps.length&&!a.w.document.querySelector('textarea[data-field]');i++)a.$('next').click();
  const field=a.w.document.querySelector('textarea[data-field]');field.value='Nháp chưa kịp lưu cần giữ.';field.dispatchEvent(new a.w.Event('input',{bubbles:true}));
  const draftId=a.w.eval('current().id');
  a.w.eval('studentAuth=null;showStudentReauth()');assert(a.$('studentReauth'));
  a.$('studentReauthPin').value='12345678';a.$('studentReauthForm').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(a.w.document.querySelector('textarea[data-field]'),field,'Reauth/progress refresh must preserve work DOM');assert.equal(field.value,'Nháp chưa kịp lưu cần giữ.');assert.equal(a.w.eval('current().id'),draftId);
  a.w.eval('var otherRecord={id:"other-account-pending-123",loai:"chu_trinh",ma:"ZZ02-B",truong:profile.truong,lop:profile.lop,tuan:1};db.queue.push({record:otherRecord});persist()');
  const n=a.calls.filter(c=>c.name==='submitRecord').length;await a.w.eval('sync(true)');assert.equal(a.calls.filter(c=>c.name==='submitRecord').length,n,'Cannot send another account queue using current token');
  a.w.eval('db.queue=[];persist()');
  const answers=Object.fromEntries(content.weeks[0].steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'Mình thay đổi cách học và giải thích bằng ví dụ mới. '.repeat(5)]));
  a.w.record=Core.record({id:'student-expire-123456',started:new Date().toISOString(),activeMs:1000,version:content.phien_ban,answers},{ma:'ZZ01-A',truong:school,lop:klass},content.weeks[0]);
  a.submitResult={ok:false,code:'AUTH_REQUIRED',error:'Phiên hết hạn'};a.w.eval('db.queue.push({record});persist()');await a.w.eval('sync(true)');
  assert(a.$('studentReauth'));assert.equal(a.w.document.querySelector('textarea[data-field]'),field);assert.equal(a.w.eval('db.queue.length'),1);
  a.submitResult=null;a.$('studentReauthPin').value='12345678';a.$('studentReauthForm').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(a.w.eval('db.queue.length'),0);assert(a.calls.some(c=>c.name==='submitRecord'&&c.input.token.startsWith('fake-student-token-')));
  a.rejectProgress=true;a.w.eval('go("home")');await a.w.eval('refreshStudentProgress()');assert.match(a.$('page').textContent,/Mất mạng thử/);assert.match(a.w.document.querySelector('.sync-summary').textContent,/2\/4/,'Failed refresh keeps known progress');
  a.$('logout').click();await tick();assert(a.$('login'));assert(a.w.eval('studentAuth===null&&studentProgress===null'));
  assert(a.calls.some(c=>c.name==='logoutStudent'));saved=a.w.localStorage.getItem(storageKey);assert(!saved.includes('12345678')&&!saved.includes('fake-student-token'));
  await a.login();assert.equal(a.w.eval('person().drafts[1].answers.thu_lam'),'Nháp chưa kịp lưu cần giữ.');
  a.$('logout').click();await tick();await a.login('ZZ02-B');assert.equal(a.w.eval('Object.keys(person().drafts).length'),0,'Different account never gets previous drafts');
 }finally{a.dom.window.close();}
 // A late login response must not resurrect a session after navigating away.
 const b=open();try{
  let resolve;b.w.deferRpc=()=>new Promise(r=>resolve=r);b.w.eval('rpc=deferRpc');
  b.$('code').value='ZZ01-A';b.$('school').value=school;b.$('school').dispatchEvent(new b.w.Event('change'));b.$('class').value=klass;b.$('studentPin').value='12345678';b.$('loginStart').click();
  b.w.eval('go("letters")');b.w.eval('rpc=fakeRpc');resolve({ok:true,token:'late-student-token-123456',expires:Date.now()+60000});await tick();assert(b.w.eval('profile===null&&studentAuth===null'));assert(b.calls.some(c=>c.name==='logoutStudent'));
 }finally{b.dom.window.close();}
 console.log('PASS student UI: PIN login, fresh-device progress, no persistent secrets, reload/reauth, draft DOM preservation, queue isolation/expiry/retry, refresh failure, logout and stale login revocation');
})().catch(error=>{console.error(error);process.exitCode=1;});
