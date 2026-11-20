/**
 * Kiểm tra container vừa tạo trong Arcane: trạng thái, khởi động nếu chưa
 * chạy, đọc log, rồi xoá.
 *
 *   node tools/arcane-container-doctor.cjs <containerId>
 */
const ARC_BASE = process.env.ARC_BASE || 'https://arcane.ducdz.top';
const CID = process.argv[2];
let token = '';
let envId = '';

async function goi(duong, opts = {}) {
  const res = await fetch(ARC_BASE + duong, {
    ...opts,
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, ...(opts.headers || {}) }
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* text */
  }
  return { ok: res.ok, status: res.status, json, text };
}

(async () => {
  const login = await fetch(ARC_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: process.env.ARC_USER, password: process.env.ARC_PASS })
  });
  const lj = await login.json();
  token = lj?.data?.token;
  envId = Object.keys(lj?.data?.user?.permissionsByEnv || {})[0];

  const base = `/api/agents/${envId}/containers/${CID}`;

  const truoc = await goi(base);
  const c = truoc.json?.data || truoc.json || {};
  console.log('trạng thái ban đầu:', JSON.stringify(c.state || c.status || c).slice(0, 300));

  // POST trên đường dẫn container = bật container
  const bat = await goi(base, { method: 'POST' });
  console.log('gọi start ->', bat.status, bat.text.slice(0, 200));

  await new Promise(r => setTimeout(r, 6000));

  const sau = await goi(base);
  const c2 = sau.json?.data || sau.json || {};
  console.log('trạng thái sau:', JSON.stringify(c2.state || c2.status || c2).slice(0, 300));

  const logs = await goi(base + '/logs/download');
  console.log('--- LOG (status ' + logs.status + ') ---');
  console.log((logs.json ? JSON.stringify(logs.json) : logs.text).slice(0, 3000));
})().catch(e => {
  console.error('LOI:', e.message);
  process.exitCode = 1;
});
