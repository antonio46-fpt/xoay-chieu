const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),content=require('../src/content.json');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
let now=0,nextId=0,online=true;const intervals=new Map(),calls=[];
const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://xoaychieu.test',runScripts:'dangerously',beforeParse(w){
 w.scrollTo=()=>{};w.confirm=()=>true;w.google={script:{run:{}}};
 Object.defineProperty(w.navigator,'onLine',{get:()=>online});
 w.setInterval=(fn,ms)=>{const id=++nextId;intervals.set(id,{fn,ms,next:now+ms});return id;};w.clearInterval=id=>intervals.delete(id);
}});
const w=dom.window,$=id=>w.document.getElementById(id);
async function advance(ms){const target=now+ms;while(true){let chosen;for(const [id,item] of intervals)if(item.next<=target&&(!chosen||item.next<chosen[1].next))chosen=[id,item];if(!chosen)break;now=chosen[1].next;chosen[1].next+=chosen[1].ms;await chosen[1].fn();await tick();}now=target;}
(async()=>{try{
 w.fakeRpc=async(name,input)=>{calls.push({name,input:JSON.parse(JSON.stringify(input))});if(name==='loginStudent')return {ok:true,token:'fake-minute-token-123456789',expires:Date.now()+3600000};if(name==='getStudentProgress')return {ok:true,weeks:[]};if(name==='getStudentLearning')return {ok:true,states:[],records:[]};if(name==='saveStudentDraft')return {ok:true,revision:input.expectedRevision+1,mutationId:input.mutationId,updatedAt:new Date().toISOString()};return {ok:true};};w.eval('rpc=fakeRpc');
 $('code').value='ZZ01-A';$('school').value=content.truong_lop[0].truong;$('school').dispatchEvent(new w.Event('change'));$('class').value=content.truong_lop[0].lop[0];$('studentPin').value='XcMinuteSynthetic2026';$('loginStart').click();await tick();assert(w.eval('LearningSync.ready'));
 assert([...intervals.values()].some(item=>item.ms===60000),'Minute schedule must exist');
 w.eval('start(1)');while(!w.document.querySelector('textarea[data-field]'))$('next').click();await w.eval('LearningSync.flushBeforeLogout()');calls.length=0;
 const field=w.document.querySelector('textarea[data-field]');field.value='Đang gõ, chưa kịp debounce.';
 await advance(59999);assert.equal(calls.filter(call=>call.name==='saveStudentDraft').length,0);
 field.value='Nội dung mới nhất tại phút đầu.';await advance(1);let saves=calls.filter(call=>call.name==='saveStudentDraft');assert.equal(saves.length,1);assert.equal(saves[0].input.draft.answers.thu_lam,field.value);assert.match($('draftStatus').textContent,/60 giây/);assert.match($('draftStatus').textContent,/Xác nhận gần nhất/);
 await advance(60000);assert.equal(calls.filter(call=>call.name==='saveStudentDraft').length,1,'Unchanged text must not generate duplicate writes');
 field.value='Thay đổi ở phút tiếp theo.';await advance(60000);assert.equal(calls.filter(call=>call.name==='saveStudentDraft').length,2);
 online=false;field.value='Phần mới khi mất mạng.';await advance(60000);assert.equal(calls.filter(call=>call.name==='saveStudentDraft').length,2);assert(w.localStorage.getItem('xoaychieu_v2').includes(field.value));
 online=true;await advance(60000);saves=calls.filter(call=>call.name==='saveStudentDraft');assert.equal(saves.length,3);assert.equal(saves.at(-1).input.draft.answers.thu_lam,field.value);
 $('logout').click();for(let i=0;i<100&&!$('login');i++)await new Promise(resolve=>setTimeout(resolve,10));assert($('login'));const total=calls.filter(call=>call.name==='saveStudentDraft').length;await advance(120000);assert.equal(calls.filter(call=>call.name==='saveStudentDraft').length,total,'Logout must stop the old account timer');
 console.log('PASS minute synchronization: 59,999/60,000ms boundary, latest text during typing, repeated minutes, no unchanged writes, offline durability/reconnect, acknowledged timestamp and timer stop on logout');
 }finally{dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
