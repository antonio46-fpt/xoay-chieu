const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const root = path.resolve(__dirname, '..'),
  Core = require('../src/core.js'),
  D = JSON.parse(fs.readFileSync(root + '/src/content.json'));
let passed = 0;

function test(n, fn) {
  fn();
  passed++;
  console.log('PASS', n);
}

function answers(w) {
  return Object.fromEntries(w.steps.flatMap(s => s.fields).map(f => [f.key, f.kind === 'rating' ?
    2 : f.options ? f.options[0] : 'Mình đã thử giải thích bài học và nhận ra điều cần đổi. '
    .repeat(f.min === 30 ? 4 : 1)
  ]));
}

function rec(w) {
  return Core.record({
    id: 'test-record-000' + w.tuan,
    started: new Date().toISOString(),
    activeMs: 123456,
    answers: answers(w),
    version: '2.0.0'
  }, {
    ma: 'BI08-T',
    truong: D.truong_lop[0].truong,
    lop: D.truong_lop[0].lop[0]
  }, w);
}
test('Four unique workflows have correct total stage durations', () => {
  assert.equal(D.weeks.length, 4);
  D.weeks.forEach(w => assert.equal(Object.values(Object.fromEntries(w.steps.map(s => [s.stage,
    s.minutes
  ]))).reduce((a, b) => a + b, 0), w.duration));
});
test('Codes normalize; malformed and example codes rejected', () => {
  assert.equal(Core.normalize(' bi08-t '), 'BI08-T');
  assert(Core.validCode('BI08-T'));
  for (const c of ['HO07-T', 'ABC12-C', 'AB1-C', '<img>']) assert(!Core.validCode(c));
});
test('Blank, too short, missing rating and invalid selection rejected', () => {
  assert(Core.validate({
    min: 5,
    max: 6000
  }, '   '));
  assert(Core.validate({
    min: 5,
    max: 6000
  }, 'một hai'));
  assert(Core.validate({
    kind: 'rating'
  }, ''));
  assert(Core.validate({
    options: ['A']
  }, 'B'));
});
test('Raw text including leading formula characters and whitespace preserved', () => {
  const w = D.weeks[0],
    a = answers(w);
  a.san_pham = '  =SUM(1,2)\nTôi viết một bài thơ ngắn\n ';
  const r = Core.record({
    id: 'raw-123456789',
    started: new Date().toISOString(),
    answers: a,
    activeMs: 5000,
    version: '2'
  }, {
    ma: 'BI08-T'
  }, w);
  assert.equal(r.san_pham, a.san_pham);
  assert.equal(r.thoi_luong_giay, 5);
  assert.notEqual(r.noi, r.san_pham);
});
test('Week 3 prefixes and week 4 two columns map correctly', () => {
  assert(rec(D.weeks[2]).nghi_1.startsWith('Phe A: '));
  assert(rec(D.weeks[2]).chia_se.startsWith('Đổi ý: '));
  assert(rec(D.weeks[3]).thu_lam.includes('Phần mình không thay đổi được:'));
});
test('All four valid records pass server validation', () => {
  const c = vm.createContext({
    console,
    Date
  });
  vm.runInContext(fs.readFileSync(root + '/apps-script/Schema.gs', 'utf8') + '\n' + fs
    .readFileSync(root + '/apps-script/Code.gs', 'utf8'), c);
  D.weeks.forEach(w => {
    c.r = rec(w);
    vm.runInContext('valid_(r)', c);
  });
  for (const modify of [r => r.tu_danh_gia = 0, r => r.noi = '', r => r.ma = 'HO07-T', r => r
      .tuan = 8, r => r.lop = 'Other'
    ]) {
    c.r = rec(D.weeks[0]);
    modify(c.r);
    assert.throws(() => vm.runInContext('valid_(r)', c));
  }
});
test('Server RAW append, retry deduplication, conflicting IDs and unauthorized coordinator', () => {
  let rows = [],
    options, lock = false;
  const c = vm.createContext({
    console,
    Date,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => 'sheet-123'
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: () => null
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => lock = true,
        hasLock: () => lock,
        releaseLock: () => lock = false
      })
    },
    Sheets: {
      Spreadsheets: {
        Values: {
          get: require('./helpers/sheets.cjs').valuesReader(() => vm.runInContext('HEADERS.chu_trinh', c), () => rows),
          append: (body, id, range, opts) => {
            options = opts;
            rows.push(body.values[0]);
          }
        }
      }
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => ({
          getLastRow: () => rows.length + 1,
          getRange: (r, cnt, num, width) => ({
            getValues: () => r === 1 ? [vm.runInContext('HEADERS.chu_trinh',
              c)] : [rows[r - 2]],
            createTextFinder: id => ({
              matchEntireCell: () => ({
                findNext: () => {
                  let i = rows.findIndex(r => r[0] === id);
                  return i < 0 ? null : {
                    getRow: () => i + 2
                  }
                }
              })
            })
          })
        })
      })
    }
  });
  vm.runInContext(fs.readFileSync(root + '/apps-script/Schema.gs', 'utf8') + '\n' + fs
    .readFileSync(root + '/apps-script/Code.gs', 'utf8'), c);
  c.r = rec(D.weeks[0]);
  c.r.san_pham = '=HYPERLINK("https://example.invalid", "nội dung văn bản không chạy")';
  let out = vm.runInContext('submitRecord({record:r})', c);
  assert(out.ok);
  assert.equal(options.valueInputOption, 'RAW');
  assert.equal(rows[0][14], c.r.san_pham);
  assert(vm.runInContext('submitRecord({record:r})', c).duplicate);
  assert.equal(rows.length, 1);
  c.r.noi += ' thay đổi';
  assert(!vm.runInContext('submitRecord({record:r})', c).ok);
  assert.equal(rows.length, 1);
  c.r = {
    id: 'coord-record-123',
    loai: 'doi_y',
    truong: D.truong_lop[0].truong,
    lop: D.truong_lop[0].lop[0],
    tuan: 3,
    thoi_gian: new Date().toISOString(),
    nhom: 'Nhóm 1',
    doi_hay_giu: 'doi',
    vi_sao: 'Chúng mình nghe được một lý lẽ mới'
  };
  assert(!vm.runInContext('submitRecord({record:r,token:"fake"})', c).ok);
  assert(!lock);
});

function appHarness(live = false) {
  const mem = {},
    els = {};
  const element = () => ({
    textContent: '',
    innerHTML: '',
    disabled: false,
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    scrollIntoView() {}
  });
  const c = vm.createContext({
    __XOAY_CHIEU_TEST__: true,
    APP_CONFIG: {
      storageKey: "xoaychieu_v2",
      version: "2.1.0",
      rpcTimeoutMs: 30000
    },
    Backup: require("../src/backup.js"),
    console,
    Date,
    Math,
    JSON,
    setTimeout,
    clearTimeout,
    setInterval: () => {},
    CONTENT: D,
    Core,
    localStorage: {
      getItem: k => mem[k] || null,
      setItem: (k, v) => mem[k] = v
    },
    navigator: {
      onLine: true
    },
    window: {
      addEventListener() {},
      scrollTo() {}
    },
    document: {
      hidden: false,
      addEventListener() {},
      getElementById: k => els[k] ||= element(),
      querySelectorAll: () => [],
      querySelector: () => null,
      body: {
        classList: {
          toggle() {}
        }
      }
    },
    location: {
      protocol: 'file:'
    },
    confirm: () => true
  });
  let src = fs.readFileSync(root + '/src/app.js', 'utf8').replace("render();if(loadBroken)",
    "if(loadBroken)");
  vm.runInContext(src, c);
  vm.runInContext(
    "render=()=>{};toast=()=>{};profile={ma:'BI08-T',truong:CONTENT.truong_lop[0].truong,lop:CONTENT.truong_lop[0].lop[0]};db.current=profile;person();",
    c);
  return {
    c,
    mem,
    els
  };
}
test('Complete all four weeks in state machine; reload preserves drafts; no implicit rating',
  () => {
    const {
      c,
      mem
    } = appHarness();
    for (const w of D.weeks) {
      c.w = w;
      c.a = answers(w);
      vm.runInContext('start(w.tuan);current().answers=a;persist();', c);
      assert(JSON.parse(mem.xoaychieu_v2).profiles[Core.key({
        ma: 'BI08-T',
        truong: D.truong_lop[0].truong,
        lop: D.truong_lop[0].lop[0]
      })].drafts[w.tuan]);
      for (let i = 0; i < w.steps.length; i++) vm.runInContext(
        'nextStep(w,w.steps[current().step],current())', c);
    }
    assert.equal(vm.runInContext('person().history.length', c), 4);
    assert.equal(vm.runInContext('db.queue.length', c), 4);
    assert.equal(vm.runInContext('Object.keys(person().drafts).length', c), 0);
  });
test('Local storage failure keeps draft and does not claim submission', () => {
  const {
    c
  } = appHarness();
  c.w = D.weeks[0];
  c.a = answers(c.w);
  vm.runInContext(
    'start(1);current().answers=a;current().step=w.steps.length-1;localStorage.setItem=()=>{throw Error("quota")};nextStep(w,w.steps[current().step],current());',
    c);
  assert.equal(vm.runInContext('person().history.length', c), 0);
  assert.equal(vm.runInContext('db.queue.length', c), 0);
  assert(vm.runInContext('!!current()', c));
});
console.log('\n' + passed +
  ' test groups passed. Browser visual QA and live Google deployment remain manual.');
