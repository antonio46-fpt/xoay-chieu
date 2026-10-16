const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Core = require('../src/core.js');
const Backup = require('../src/backup.js');
const CONTENT = require('../src/content.json');
const profile = {
  ma: 'BI08-T',
  truong: CONTENT.truong_lop[0].truong,
  lop: CONTENT.truong_lop[0].lop[0]
};
const record = {
  id: 'backup-record-0001',
  loai: 'chu_trinh',
  ...profile,
  tuan: 1,
  san_pham: '  Dòng thứ nhất\nDòng thứ hai  '
};
const original = {
  current: profile,
  profiles: {
    [Core.key(profile)]: {
      drafts: {},
      history: [{
        record,
        sent: false
      }]
    }
  },
  queue: [{
    record
  }],
  theme: 'light',
};
const restored = Backup.restore(original, CONTENT);
assert.equal(restored.queue.length, 1);
assert.equal(restored.queue[0].paused, true);
assert.equal(restored.queue[0].record.id, record.id);
assert.equal(restored.queue[0].record.san_pham, record.san_pham);
assert.equal(original.queue[0].paused, undefined, 'Restore must not mutate the input');
assert.throws(() => Backup.restore(JSON.parse('{"profiles":{},"queue":[],"__proto__":{}}'),
  CONTENT));
assert.throws(() => Backup.restore({
  ...original,
  current: {
    ...profile,
    ma: '<script>'
  }
}, CONTENT));
assert.throws(() => Backup.restore({
  ...original,
  queue: [{
    record
  }, {
    record
  }]
}, CONTENT));

// Two open tabs must not silently overwrite the stored snapshot.
const disk = {};
const el = {
  textContent: '',
  classList: {
    add() {},
    remove() {}
  }
};
const c = vm.createContext({
  __XOAY_CHIEU_TEST__: true,
  APP_CONFIG: {
    storageKey: 'xoaychieu_v2'
  },
  Core,
  Backup,
  CONTENT,
  console,
  Date,
  JSON,
  setInterval() {},
  setTimeout,
  clearTimeout,
  navigator: {
    onLine: false
  },
  window: {},
  localStorage: {
    getItem: key => disk[key] || null,
    setItem: (key, value) => disk[key] = value
  },
  document: {
    getElementById: () => el
  },
});
vm.runInContext(fs.readFileSync(__dirname + '/../src/app.js', 'utf8'), c);
vm.runInContext('toast=()=>{};persist()', c);
const external = JSON.stringify({
  profiles: {},
  queue: [],
  theme: 'dark',
  newer: true
});
disk.xoaychieu_v2 = external;
assert.equal(vm.runInContext('persist()', c), false);
assert.equal(disk.xoaychieu_v2, external);
assert.equal(vm.runInContext('storageConflict', c), true);

// Retry delays grow but remain bounded, with deterministic test jitter.
assert.equal(Core.retryDelay(1, () => 0), 5000);
assert.equal(Core.retryDelay(2, () => 0), 10000);
assert.equal(Core.retryDelay(20, () => 0), 120000);
console.log(
  'PASS recovery: preserves pending/ID/raw text, pauses resends, validates backups, rejects duplicates, detects another tab, bounded retry'
);
