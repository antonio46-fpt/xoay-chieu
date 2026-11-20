/**
 * Tạo tài khoản quản trị cho Xoay Chiều thông qua Arcane API.
 *
 * Arcane v3.1.1 không có endpoint exec, nên cách nhẹ nhất là chạy một
 * container dùng lại đúng image của service `api`, chạy script create-admin
 * rồi tự xoá. Container này nằm trong cùng network với database.
 *
 *   node tools/arcane-create-admin.cjs
 *
 * Cần biến môi trường: ARC_BASE, ARC_USER, ARC_PASS, XC_ADMIN_USER, XC_ADMIN_PASS
 */
const ARC_BASE = process.env.ARC_BASE || 'https://arcane.ducdz.top';
const ADMIN_USER = process.env.XC_ADMIN_USER || 'quantri';
const ADMIN_PASS = process.env.XC_ADMIN_PASS;

if (!ADMIN_PASS) {
  console.error('Thiếu XC_ADMIN_PASS');
  process.exit(1);
}

let token = '';

async function goi(duong, opts = {}) {
  const res = await fetch(ARC_BASE + duong, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + token,
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* không phải JSON */
  }
  if (!res.ok) {
    throw new Error(`${opts.method || 'GET'} ${duong} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

(async () => {
  // 1. Đăng nhập
  const login = await fetch(ARC_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: process.env.ARC_USER, password: process.env.ARC_PASS })
  });
  const lj = await login.json();
  token = lj?.data?.token;
  if (!token) throw new Error('Đăng nhập Arcane thất bại');
  console.log('đăng nhập:', lj.data.user.displayName);

  const envId = Object.keys(lj.data.user.permissionsByEnv || {})[0];
  if (!envId) throw new Error('Không tìm thấy môi trường nào');
  console.log('environment:', envId);

  // 2. Tìm container api
  const ds = await goi(`/api/agents/${envId}/containers`);
  const list = ds.data || ds.containers || ds;
  const api = list.find(c => String(c.image || '').includes('/api:'));
  if (!api) throw new Error('Không tìm thấy container api');
  console.log('container api:', api.id, api.image);

  // 3. Đọc env của container api (lấy DATABASE_URL)
  const chiTiet = await goi(`/api/agents/${envId}/containers/${api.id}`);
  const cfg = (chiTiet.data && chiTiet.data.config) || (chiTiet.data && chiTiet.data.Config) || {};
  const envList = cfg.Env || cfg.env || [];
  const dbUrl = envList.find(e => e.startsWith('DATABASE_URL='));
  const cookieSecret = envList.find(e => e.startsWith('COOKIE_SECRET='));
  if (!dbUrl) throw new Error('Không đọc được DATABASE_URL từ container api');
  console.log('đã đọc DATABASE_URL:', dbUrl.replace(/:[^:@/]+@/, ':***@'));

  const mang = Object.keys(api.networkSettings?.networks || {})[0];
  console.log('network:', mang);

  // 4. Tạo container một lần chạy
  const ten = 'xc-tao-admin-' + Date.now();
  const body = {
    name: ten,
    image: api.image,
    command: [
      'sh',
      '-lc',
      `cd /app/server && ADMIN_USERNAME=${ADMIN_USER} ADMIN_PASSWORD='${ADMIN_PASS}' node scripts/create-admin.ts`
    ],
    env: [dbUrl, ...(cookieSecret ? [cookieSecret] : [])],
    networks: mang ? [mang] : [],
    autoRemove: false,
    restartPolicy: 'no',
    labels: { 'xoaychieu.purpose': 'tao-admin-mot-lan' }
  };
  const tao = await goi(`/api/agents/${envId}/containers`, { method: 'POST', body: JSON.stringify(body) });
  const moi = tao.data || tao;
  console.log('đã tạo container:', moi.id, moI_ten(moi));

  function moI_ten(o) {
    return o.name || o.names || '(không tên)';
  }

  // 5. Chờ chạy xong rồi đọc logs
  let trangThai = '';
  for (let i = 0; i < 30; i += 1) {
    await new Promise(r => setTimeout(r, 2000));
    const t = await goi(`/api/agents/${envId}/containers/${moi.id}`);
    const t2 = t.data || t;
    trangThai = String(t2.state || t2.status || '');
    if (/exited|stopped|dead/i.test(trangThai)) break;
  }
  console.log('trạng thái cuối:', trangThai);

  try {
    const logs = await goi(`/api/agents/${envId}/containers/${moi.id}/logs?tail=50`);
    console.log('--- LOG ---');
    console.log(typeof logs === 'string' ? logs : JSON.stringify(logs).slice(0, 2000));
  } catch (e) {
    console.log('không đọc được log:', e.message);
  }
})();
