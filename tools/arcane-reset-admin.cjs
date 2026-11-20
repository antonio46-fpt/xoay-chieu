/**
 * Đặt lại mật khẩu tài khoản quản trị Xoay Chiều thông qua Arcane.
 *
 * Arcane không có endpoint exec, nên chạy một container dùng lại image của
 * service api: ghi script tạm vào /app/server, chạy bằng node, rồi thoát.
 * Script dùng đúng hàm hashPassword của dự án nên mật khẩu tương thích.
 *
 *   ARC_USER=... ARC_PASS=... XC_ADMIN_USER=quantri XC_ADMIN_PASS='...' \
 *   node tools/arcane-reset-admin.cjs
 */
const ARC_BASE = process.env.ARC_BASE || 'https://arcane.ducdz.top';
const USER = process.env.XC_ADMIN_USER || 'quantri';
const PASS = process.env.XC_ADMIN_PASS;

if (!PASS) {
  console.error('Thiếu XC_ADMIN_PASS');
  process.exit(1);
}

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
    /* không phải JSON */
  }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${duong} -> ${res.status}: ${text.slice(0, 200)}`);
  return json;
}

const kichBan = `import { hashPassword } from './src/security/password.ts';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const hash = await hashPassword(process.env.NEW_PASS);
const r = await client.query(
  "update users set password_hash = $1, phai_doi_mat_khau = false, so_lan_sai = 0, khoa_den = null where username = $2",
  [hash, process.env.NEW_USER]
);
console.log(r.rowCount ? 'DA_CAP_NHAT ' + process.env.NEW_USER : 'KHONG_TIM_THAY ' + process.env.NEW_USER);
await client.end();
`;

(async () => {
  const login = await fetch(ARC_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: process.env.ARC_USER, password: process.env.ARC_PASS })
  });
  const lj = await login.json();
  token = lj?.data?.token;
  envId = Object.keys(lj?.data?.user?.permissionsByEnv || {})[0];
  if (!token || !envId) throw new Error('Không đăng nhập được Arcane');

  const ds = await goi(`/api/agents/${envId}/containers`);
  const list = ds.data || ds.containers || ds;
  const api = list.find(c => String(c.image || '').includes('/api:'));
  if (!api) throw new Error('Không tìm thấy container api');

  const chiTiet = await goi(`/api/agents/${envId}/containers/${api.id}`);
  const cfg = chiTiet.data?.config || chiTiet.data?.Config || {};
  const envList = cfg.Env || cfg.env || [];
  const dbUrl = envList.find(e => e.startsWith('DATABASE_URL='));
  if (!dbUrl) throw new Error('Không đọc được DATABASE_URL');
  const mang = Object.keys(api.networkSettings?.networks || {})[0];

  // Ghi script qua heredoc rồi chạy; không để lại tệp trong image.
  const lenh = `set -e
cat > /app/server/_reset_admin.mjs <<'XCEOF'
${kichBan}XCEOF
cd /app/server
node _reset_admin.mjs
rm -f _reset_admin.mjs`;

  const body = {
    name: 'xc-reset-admin-' + Date.now(),
    image: api.image,
    command: ['sh', '-lc', lenh],
    env: [dbUrl, `NEW_USER=${USER}`, `NEW_PASS=${PASS}`],
    networks: mang ? [mang] : [],
    autoRemove: false,
    restartPolicy: 'no',
    labels: { 'xoaychieu.purpose': 'dat-lai-mat-khau-admin' }
  };

  const tao = await goi(`/api/agents/${envId}/containers`, { method: 'POST', body: JSON.stringify(body) });
  const moi = tao.data || tao;
  console.log('container:', moi.id);

  let trangThai = null;
  for (let i = 0; i < 40; i += 1) {
    await new Promise(r => setTimeout(r, 1500));
    const t = await goi(`/api/agents/${envId}/containers/${moi.id}`);
    trangThai = (t.data || t).state || {};
    if (/exited|dead/i.test(String(trangThai.status || ''))) break;
  }
  console.log('exit code:', trangThai?.exitCode, '| trạng thái:', trangThai?.status);

  try {
    const logs = await goi(`/api/agents/${envId}/containers/${moi.id}/logs/download`);
    console.log('--- LOG ---');
    console.log(String(typeof logs === 'string' ? logs : JSON.stringify(logs)).slice(0, 1500));
  } catch (e) {
    console.log('không đọc được log:', e.message);
  }
})().catch(e => {
  console.error('LOI:', e.message);
  process.exitCode = 1;
});
