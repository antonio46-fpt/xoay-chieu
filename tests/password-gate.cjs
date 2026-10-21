const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),{spawnSync}=require('node:child_process');
const content=require('../src/content.json');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function open(live,production=false){
 const dom=new JSDOM(fs.readFileSync(production?'apps-script/Index.html':'dist/index.html','utf8'),{url:'https://xoaychieu.test',runScripts:'dangerously',beforeParse(w){w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;if(live)w.google={script:{run:{}}};}});
 const w=dom.window,$=id=>w.document.getElementById(id);
 return {dom,w,$};
}
(async()=>{
 const a=open(true);try{
  let resolve;const calls=[];
  a.w.mockRpc=(name,input)=>{calls.push({name,input});if(name==='loginStudent')return new Promise(r=>resolve=r);return Promise.resolve(name==='getStudentProgress'?{ok:true,weeks:[]}:{ok:true});};a.w.eval('rpc=mockRpc');
  assert.equal(a.$('studentPin').type,'password');assert.equal(a.$('studentPin').disabled,false);
  a.$('toggleStudentPassword').click();assert.equal(a.$('studentPin').type,'text');assert.equal(a.$('toggleStudentPassword').getAttribute('aria-pressed'),'true');a.$('toggleStudentPassword').click();
  a.w.eval('start(1)');assert(a.$('login'));assert(!a.w.eval('profile'));
  a.$('code').value='ZZ01-A';a.$('school').value=content.truong_lop[0].truong;a.$('school').dispatchEvent(new a.w.Event('change'));a.$('class').value=content.truong_lop[0].lop[0];
  a.$('studentPin').value='XcSyntheticPassword2026';a.$('loginStart').click();assert(a.$('login'));assert(a.$('loginStart').disabled);assert.equal(a.$('studentPin').value,'');
  assert.equal(calls[0].input.password,'XcSyntheticPassword2026');assert(!Object.hasOwn(calls[0].input,'pin'));
  resolve({ok:false,code:'AUTH_REQUIRED',error:'Mã hoặc mật khẩu không đúng.'});await tick();assert(a.$('login'));assert(!a.w.eval('profile'));
  a.$('studentPin').value='XcSyntheticPassword2026';a.$('loginStart').click();resolve({ok:true,token:'fake-password-session-token-123456',expires:Date.now()+60000});await tick();
  assert(a.$('continueJourney'));assert(!a.w.localStorage.getItem('xoaychieu_v2').includes('XcSyntheticPassword2026'));
  a.w.eval('studentAuth=null;start(2)');assert(a.$('studentReauth'));assert.equal(a.w.eval('Object.keys(person().drafts).length'),0,'New lesson cannot open without authentication');
 }finally{a.dom.window.close();}
 const b=open(false);try{assert(b.$('studentPin').disabled);assert.match(b.$('loginStart').textContent,/xem thử/);assert(!b.$('toggleStudentPassword'));}finally{b.dom.window.close();}
 const c=open(false,true);try{assert(!c.$('studentPin').disabled);c.$('code').value='ZZ01-A';c.$('school').value=content.truong_lop[0].truong;c.$('school').dispatchEvent(new c.w.Event('change'));c.$('class').value=content.truong_lop[0].lop[0];c.$('studentPin').value='XcSyntheticPassword2026';c.$('loginStart').click();await tick();assert(c.$('login'));assert.match(c.$('loginErr').textContent,/máy chủ xác thực/);assert(!c.w.eval('profile'));c.w.eval('start(1)');assert(c.$('login'));}finally{c.dom.window.close();}
 const python=spawnSync('python',['tests/roster_import.py'],{stdio:'inherit'});assert.equal(python.status,0);
 console.log('PASS password gate: explicit password field/toggle, wait for server, reject failed auth, password payload, no saved secrets, block new lesson without session, honest static demo and private XLSX importer');
})().catch(error=>{console.error(error);process.exitCode=1;});
