const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const Core = require('../src/core.js'),
  CONTENT = require('../src/content.json');
const raw = fs.readFileSync(__dirname + '/../src/app.js', 'utf8').replace("render();if(loadBroken)",
  "if(loadBroken)");

function harness() {
  const mem = {},
    elements = {};
  let respond, attempts = 0, lastPayload;
  const c = vm.createContext({
    __XOAY_CHIEU_TEST__: true,
    APP_CONFIG: {
      storageKey: "xoaychieu_v2",
      version: "2.1.0",
      rpcTimeoutMs: 30000
    },
    Backup: require("../src/backup.js"),
    Core,
    CONTENT,
    Date,
    JSON,
    console,
    Math,
    setInterval() {},
    setTimeout,
    clearTimeout,
    google: {
      script: {
        run: {}
      }
    },
    navigator: {
      onLine: false
    },
    localStorage: {
      getItem: k => mem[k] || null,
      setItem: (k, v) => mem[k] = v
    },
    window: {
      addEventListener() {}
    },
    document: {
      hidden: false,
      addEventListener() {},
      getElementById: k => elements[k] ||= {
        textContent: '',
        classList: {
          add() {},
          remove() {}
        }
      },
      querySelectorAll: () => []
    },
    location: {
      protocol: 'file:'
    }
  });
  vm.runInContext(raw, c);
  c.testRpc = (name, payload) => {
    lastPayload = JSON.parse(JSON.stringify(payload));
    attempts++;
    return new Promise((res, rej) => respond = {
      res,
      rej
    });
  };
  vm.runInContext('rpc=testRpc;render=()=>{};toast=()=>{};tab="home";', c);
  return {
    c,
    mem,
    get respond() {
      return respond
    },
    get lastPayload() { return lastPayload; },
    get attempts() {
      return attempts
    }
  };
}
(async () => {
  const h = harness();
  h.c.item = {
    id: 'stable-id-123456',
    loai: 'chu_trinh',
    noi: 'Mình bị bắt nạt nên cần hỗ trợ'
  };
  vm.runInContext('enqueue(item)', h.c);
  assert.equal(h.attempts, 0);
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue.length, 1);
  h.c.navigator.onLine = true;
  const wait = vm.runInContext('sync()', h.c);
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue.length, 1, 'queue persists while sending');
  await vm.runInContext('sync()', h.c);
  assert.equal(h.attempts, 1, 'concurrent sync blocked');
  assert.equal(h.lastPayload.record.noi, '[đã ẩn – an toàn]', 'RPC never sends the sensitive field');
  assert(h.c.item.noi.includes('bắt nạt'), 'Original object is not overwritten');
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue[0].record.noi, '[đã ẩn – an toàn]');
  h.respond.rej(Error('network failed'));
  await wait;
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue.length, 1, 'failed send retained');
  const firstWire = JSON.stringify(h.lastPayload.record);
  const mismatch = vm.runInContext('sync(true)', h.c);
  assert.equal(JSON.stringify(h.lastPayload.record), firstWire, 'Retry uses the same redacted payload');
  h.respond.res({
    ok: true,
    id: 'wrong-id'
  });
  await mismatch;
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue.length, 1, 'wrong ACK retained');
  const success = vm.runInContext('sync(true)', h.c);
  h.respond.res({
    ok: true,
    id: h.c.item.id
  });
  await success;
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue.length, 0, 'matching ACK removes');
  h.c.navigator.onLine = false;
  h.c.item = {
    id: 'coord-id-123456',
    loai: 'phieu_buoi'
  };
  vm.runInContext('enqueue(item)', h.c);
  h.c.navigator.onLine = true;
  const n = h.attempts;
  await vm.runInContext('sync()', h.c);
  assert.equal(h.attempts, n);
  assert.equal(JSON.parse(h.mem.xoaychieu_v2).queue.length, 1);

  // A Google cache token can expire before the local six-hour deadline.
  const expired = harness();
  expired.c.item = {
    id: 'expired-coord-12345',
    loai: 'phieu_buoi',
    truong: 'Trường thử',
    lop: '10A'
  };
  vm.runInContext(
    'profile={truong:item.truong,lop:item.lop,ma:"AB12-C"};coordToken="token";coordUntil=Date.now()+60000;enqueue(item)',
    expired.c);
  expired.c.navigator.onLine = true;
  const expiredRequest = vm.runInContext('sync()', expired.c);
  expired.respond.res({
    ok: false,
    code: 'AUTH_REQUIRED',
    error: 'Phiên hết hạn'
  });
  await expiredRequest;
  assert.equal(vm.runInContext('coordToken', expired.c), '');
  assert.equal(JSON.parse(expired.mem.xoaychieu_v2).queue.length, 1);

  // Periodic sync must not close expanded answers or a backup file picker.
  const idle = harness();
  idle.c.navigator.onLine = true;
  vm.runInContext('var renderCount=0;render=()=>{renderCount++};tab="settings";', idle.c);
  await vm.runInContext('sync()', idle.c);
  assert.equal(vm.runInContext('renderCount', idle.c), 0);
  console.log(
    'PASS offline queue, in-flight durability, concurrent-send guard, failed send, mismatched ACK, success ACK, coordinator reauthentication, token expiry, idle UI (9 cases)'
  );
})().catch(e => {
  console.error(e);
  process.exitCode = 1
});
