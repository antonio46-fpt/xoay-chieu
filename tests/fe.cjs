const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const content = require('../src/content.json');
function open(live) {
  const dom = new JSDOM(fs.readFileSync('dist/index.html', 'utf8'), {url:'https://xoaychieu.test/',runScripts:'dangerously',beforeParse(w){
    w.setInterval=()=>0;w.scrollTo=()=>{};w.confirm=()=>true;
    if(live) w.google={script:{run:{}}};
  }});
  const w=dom.window;
  w.fixture={ma:'ZZ01-A',truong:content.truong_lop[0].truong,lop:content.truong_lop[0].lop[0]};
  w.eval('profile=fixture;studentAuth={...fixture,token:"fake-fe-auth-token-123456",expires:Date.now()+60000};person();tab="home";render()');
  return {dom,w,$:id=>w.document.getElementById(id)};
}
for(const live of [false,true]) {
  const {dom,w,$}=open(live);
  try {
    assert.match($('continueJourney').textContent,/Khám phá tuần 1/);
    $('continueJourney').click();
    assert.equal(w.document.querySelectorAll('.workflow-steps [aria-current="step"]').length,1);
    const stages=content.weeks[0].steps.map(s=>s.stage);
    assert.equal(w.document.querySelectorAll('.workflow-steps li').length,new Set(stages).size);
    $('brandHome').click();
    assert.match($('continueJourney').textContent,/Viết tiếp tuần 1/);
    assert.match(w.document.querySelector('.week-status.draft').textContent,/Đang viết/);
    w.eval(`delete person().drafts[1];person().history=[{record:{tuan:1,id:'fixture-record-123456',thoi_gian:new Date().toISOString(),thoi_luong_giay:1,tu_danh_gia:2},sent:false}];render()`);
    assert.match(w.document.querySelector('.week-status').textContent,live?/chờ gửi/:/lưu trên máy/);
    assert(!w.document.querySelector('.week-status.sent'));
    assert.match($('continueJourney').textContent,/Khám phá tuần 2/);
    w.eval('person().history[0].sent=true;render()');
    assert.match(w.document.querySelector('.week-status.sent').textContent,/Máy chủ đã xác nhận/);
    assert(w.document.querySelector('.nav [aria-current="page"][data-tab="home"]'));
    w.eval('person().history[0].record.tuan=4;person().history[0].record.ban_goc_id="original-record-123456";go("notebook")');
    assert.match(w.document.querySelector('.tag').textContent,/BẢN 2/);
    assert.match(w.document.querySelector('.revision-note').textContent,/Bài gốc được giữ nguyên/);
  } finally {dom.window.close();}
}
console.log('PASS FE: resume CTA, stage indicator, local/pending/confirmed states, current navigation, revision provenance');
