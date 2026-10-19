const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const content=require('../src/content.json');
(async()=>{
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){w.setInterval=()=>0;w.scrollTo=()=>{};w.google={script:{run:{}}};}});
 const w=dom.window,$=id=>w.document.getElementById(id);
 try{
  w.fixture={ma:'ZZ01-A',truong:content.truong_lop[0].truong,lop:content.truong_lop[0].lop[0]};
  w.eval('profile=fixture;person();coordToken="old-token";coordUntil=Date.now()+600000;tab="coord";render()');
  const session=$('sessionForm'), debate=$('debateForm');
  session.elements.dieu_tot.value='Bản nháp cần giữ nguyên.';
  session.elements.dieu_tot.dispatchEvent(new w.Event('input',{bubbles:true}));
  debate.elements.vi_sao.value='Nhóm vẫn đang điền lý lẽ.';
  debate.elements.vi_sao.dispatchEvent(new w.Event('input',{bubbles:true}));
  w.eval('stageClock.remaining=123;coordToken="";coordUntil=0;showCoordinatorReauth()');
  assert($('coordReauthForm'));
  assert.equal($('sessionForm'),session,'No form rerender on token eviction');
  assert.equal($('debateForm'),debate);
  let calls=[];w.fakeRpc=(name,payload)=>{calls.push([name,payload]);return Promise.resolve({ok:true,token:'new-token',expires:Date.now()+600000});};
  w.eval('rpc=fakeRpc');
  $('coordReauthPin').value='123456';
  $('coordReauthForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert(!$('coordReauth'));
  assert.equal(session.elements.dieu_tot.value,'Bản nháp cần giữ nguyên.');
  assert.equal(debate.elements.vi_sao.value,'Nhóm vẫn đang điền lý lẽ.');
  assert.equal(w.eval('stageClock.remaining'),123);
  assert.equal(calls[0][0],'loginCoordinator');
  assert(!JSON.stringify(w.localStorage).includes('123456'),'PIN is not persisted');
  // An AUTH_REQUIRED response on a real queued form must display inline reauthentication.
  w.fakeRpc=()=>Promise.resolve({ok:false,code:'AUTH_REQUIRED',error:'Phiên hết hạn'});
  w.eval('rpc=fakeRpc;db.queue=[{record:{id:"expired-record-123456",loai:"doi_y",truong:profile.truong,lop:profile.lop,tuan:3,vi_sao:"Lý lẽ được giữ nguyên"}}]');
  await w.eval('sync(true)');
  assert($('coordReauthForm'));
  assert.equal($('sessionForm'),session);
  assert.equal(w.eval('db.queue.length'),1);
  console.log('PASS reauth: cache token eviction, inline PIN, same form DOM, preserved notes/timer/queue, no stored PIN');
 }finally{dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
