const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const Core=require('../src/core.js');
const content=require('../src/content.json');
const html=fs.readFileSync('dist/index.html','utf8');
const school=content.truong_lop[0].truong,klass=content.truong_lop[0].lop[0],key='xoaychieu_v2';
function open(snapshot=null,live=false,blocked=false){
 const dom=new JSDOM(html,{url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){
  w.setInterval=()=>0;w.scrollTo=()=>{};
  if(blocked)Object.defineProperty(w,'localStorage',{value:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
  else if(snapshot)w.localStorage.setItem(key,snapshot);
  if(live)w.google={script:{run:{}}};
 }});
 const w=dom.window,$=id=>w.document.getElementById(id);
 const login=(code='ZZ01-A')=>{$('code').value=code;$('school').value=school;$('school').dispatchEvent(new w.Event('change'));$('class').value=klass;$('loginStart').click();};
 return {dom,w,$,login};
}
function field(app){
 app.$('continueJourney').click();
 for(let i=0;i<content.weeks[0].steps.length&&!app.w.document.querySelector('textarea[data-field]');i++)app.$('next').click();
 return app.w.document.querySelector('textarea[data-field]');
}
(async()=>{
 let a=open();
 try{
  assert(a.$('sessionBar').classList.contains('hidden'));
  a.login();
  assert(!a.$('sessionBar').classList.contains('hidden'));
  assert.match(a.$('sessionIdentity').textContent,/ZZ01-A/);
  const input=field(a),raw='\n  Bản nháp cuối chưa kịp debounce.\n';input.value=raw;
  // A previously submitted, not-yet-acknowledged record must survive sign-out.
  const week=content.weeks[1],answers=Object.fromEntries(week.steps.flatMap(s=>s.fields).map(f=>[f.key,f.kind==='rating'?2:f.options?f.options[0]:'Mình đã thử cách học và giải thích điều nhận ra. '.repeat(5)]));
  a.w.pending=Core.record({id:'pending-logout-123456',started:new Date().toISOString(),activeMs:1000,version:content.phien_ban,answers},{ma:'ZZ01-A',truong:school,lop:klass},week);
  a.w.eval('person().history.push({record:pending,sent:false});db.queue.push({record:pending});persist();coordToken="test-coordinator-token-123456";coordUntil=Date.now()+999999;stageClock={running:true};teacherAuth={token:"test-teacher-token-123456",truong:profile.truong,lop:profile.lop,expires:Date.now()+999999}');
  a.$('logout').click();
  assert(a.$('login'));assert(a.$('sessionBar').classList.contains('hidden'));
  assert.equal(a.$('code').value,'');
  assert(a.w.eval('profile===null&&teacherAuth===null&&coordToken===""&&coordUntil===0&&stageClock===null'));
  const saved=JSON.parse(a.w.localStorage.getItem(key));
  assert(!Object.hasOwn(saved,'current'));
  const owner=Core.key({ma:'ZZ01-A',truong:school,lop:klass});
  assert.equal(saved.profiles[owner].drafts[1].answers.thu_lam,raw);
  assert.equal(saved.queue[0].record.id,'pending-logout-123456');
  assert.equal(saved.profiles[owner].history.length,1);
  const reloaded=open(JSON.stringify(saved));
  try{assert(reloaded.$('login'),'Reload does not sign back in after logout');}finally{reloaded.dom.window.close();}
  a.login('ZZ02-B');a.w.document.querySelector('[data-tab="notebook"]').click();
  assert(!a.$('page').textContent.includes(raw));assert.equal(a.w.eval('person().history.length'),0);
  a.$('logout').click();a.login('ZZ01-A');
  assert.equal(field(a).value,raw,'Same profile resumes its saved draft');
  assert.equal(a.w.eval('person().history.length'),1);assert.equal(a.w.eval('db.queue.length'),1);
  a.w.document.querySelector('[data-tab="settings"]').click();a.$('change').click();assert(a.$('login'),'Change profile uses the same safe logout path');
 }finally{a.dom.window.close();}
 a=open();
 try{
  a.login();const input=field(a);input.value='Nháp cần giữ khi bộ nhớ đầy.';
  a.w.Storage.prototype.setItem=()=>{throw Error('quota');};
  a.$('logout').click();
  assert(!a.$('login'),'A failed write cannot silently discard a pending draft');
  assert.equal(input.value,'Nháp cần giữ khi bộ nhớ đầy.');
  assert.equal(a.w.eval('profile.ma'),'ZZ01-A');
  assert.equal(a.w.eval('db.current.ma'),'ZZ01-A');
  assert.match(a.$('toast').textContent,/Chưa đăng xuất/);
 }finally{a.dom.window.close();}
 a=open(null,true,true);
 try{
  const calls=[];a.w.fakeRpc=(name,data)=>{calls.push({name,data});return Promise.resolve(name==='getClassProgress'?{ok:true,students:[]}:{ok:true});};
  a.w.eval('rpc=fakeRpc;teacherAuth={token:"teacher-only-token-1234567890",truong:CONTENT.truong_lop[0].truong,lop:CONTENT.truong_lop[0].lop[0],expires:Date.now()+999999};tab="teacher";render()');
  assert(!a.$('sessionBar').classList.contains('hidden'));
  a.$('logout').click();await new Promise(resolve=>setImmediate(resolve));
  assert(a.$('login'),'Teacher-only logout works even when browser storage is blocked');
  assert(calls.some(c=>c.name==='logoutTeacher'&&c.data==='teacher-only-token-1234567890'));
 }finally{a.dom.window.close();}
 console.log('PASS logout: immediate draft capture, durable sign-out, retained history/queue, profile isolation/resume, write failure rollback and teacher-only revocation');
})().catch(error=>{console.error(error);process.exitCode=1;});
