const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const content = require('../src/content.json');
const html = fs.readFileSync('dist/index.html','utf8');
function open(mode,live=false) {
  const dom = new JSDOM(html,{url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){
    w.setInterval=()=>0;w.scrollTo=()=>{};
    Object.defineProperty(w,'localStorage',{value:{
      getItem(){if(mode==='blocked')throw new w.DOMException('Storage denied','SecurityError');return mode==='corrupt'?'{':null;},
      setItem(){throw new w.DOMException('Storage unavailable','QuotaExceededError');}
    }});
    if(live)w.google={script:{run:{}}};
  }});
  const w=dom.window,$=id=>w.document.getElementById(id);
  $('code').value='ZZ01-A';$('school').value=content.truong_lop[0].truong;
  $('school').dispatchEvent(new w.Event('change'));
  $('class').value=content.truong_lop[0].lop[0];
  return {dom,w,$};
}
for(const mode of ['blocked','quota']) {
  const {dom,w,$}=open(mode);
  try {
    $('loginStart').click();
    assert($('login'),'No silent switch to temporary mode');
    assert.match($('loginErr').textContent,/chặn lưu dữ liệu/);
    assert(!$('previewFallback').classList.contains('hidden'));
    assert.equal(w.eval('loadBroken'),false,'Storage access denied is distinct from corrupted data');
    $('code').value='bad';
    $('code').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    assert.match($('loginErr').textContent,/Mã cần có dạng/);
    $('code').value='ZZ01-A';
    $('previewStart').click();
    assert(w.document.querySelector('.cards'),'Explicit temporary preview enters the journey');
    assert.match(w.document.querySelector('.preview-notice').textContent,/mất khi tải lại hoặc đóng trang/);
    $('continueJourney').click();
    const week=content.weeks[0];
    for(const step of week.steps) {
      for(const f of step.fields) {
        if(f.kind==='rating') w.document.querySelector(`[data-field="${f.key}"][value="2"]`).click();
        else {
          const el=w.document.querySelector(`[data-field="${f.key}"]`);
          el.value=f.options?f.options[0]:'Mình thử một cách học mới và nhận ra điều cần thay đổi. '.repeat(5);
          el.dispatchEvent(new w.Event('input',{bubbles:true}));
        }
      }
      $('next').click();
    }
    assert.equal(w.eval('tab'),'notebook');
    assert.match($('page').textContent,/Chỉ giữ tạm trong phiên xem thử/);
    assert.equal(w.eval('person().history.length'),1);
  } finally {dom.window.close();}
}
for(const [mode,live] of [['blocked',true],['corrupt',false]]) {
  const {dom,w,$}=open(mode,live);
  try {
    $('login').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert($('previewFallback').classList.contains('hidden'));
    $('previewStart').click();
    assert($('login'));
    assert.equal(w.eval('previewOnly'),false,'No temporary mode for LIVE or corrupt data');
  } finally {dom.window.close();}
}
console.log('PASS preview: blocked reads/writes, explicit opt-in, complete week flow, accurate temporary labels, no LIVE/corrupt-data bypass');
