/**
 * Chụp ảnh minh chứng cho báo cáo — dùng giao diện 3.0 đang chạy.
 *
 *   node tools/capture-evidence.cjs
 *
 * Yêu cầu: Vite (5173) và API (3000) đang chạy; playwright-core cài trong
 * node_modules của chính thư mục gọi hoặc trong NODE_PATH.
 * Ảnh ghi vào docs/evidence/.
 */
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require(process.env.XC_PW || 'playwright-core');

const WEB = process.env.XC_WEB || 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'docs', 'evidence');
const ADMIN = { username: 'admin', password: 'Demo12345' };
const STUDENT = { username: 'hs01', password: 'Demo12345' };

fs.mkdirSync(OUT, { recursive: true });

async function dangNhap(page, taiKhoan) {
  await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
  await page.fill('input[name="username"], #username, input[type="text"]', taiKhoan.username);
  await page.fill('input[type="password"]', taiKhoan.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
}

async function chup(page, ten) {
  const file = path.join(OUT, `${ten}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('  ' + path.basename(file));
  return file;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const loi = [];

  // ------------------------------------------------------------- học sinh
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: 'vi-VN',
    colorScheme: 'light'
  });
  const page = await context.newPage();
  page.on('pageerror', e => loi.push('HS pageerror: ' + e.message));

  console.log('Học sinh:');
  // Phải mở trang và chờ form hiện ra trước khi chụp, nếu không sẽ ra ảnh trắng.
  await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('input[type="password"]', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await chup(page, '01-dang-nhap');

  await dangNhap(page, STUDENT);
  await chup(page, '02-dashboard-hoc-sinh');

  // Mở tuần 1
  const nutTuan = page.locator('button:has-text("Bắt đầu"), button:has-text("Tiếp tục"), button:has-text("Làm lượt mới")').first();
  await nutTuan.click();
  await page.waitForTimeout(1800);
  await chup(page, '03-lam-bai-tuan-1');

  await context.close();

  // --------------------------------------------------------------- quản trị
  const contextAdmin = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: 'vi-VN',
    colorScheme: 'light'
  });
  const pageAdmin = await contextAdmin.newPage();
  pageAdmin.on('pageerror', e => loi.push('AD pageerror: ' + e.message));

  console.log('Quản trị:');
  await dangNhap(pageAdmin, ADMIN);
  await pageAdmin.waitForTimeout(1500);
  await chup(pageAdmin, '04-admin-tong-quan');

  await pageAdmin.goto(WEB + '/admin/students', { waitUntil: 'networkidle', timeout: 45000 });
  await pageAdmin.waitForTimeout(1200);
  await chup(pageAdmin, '05-admin-hoc-sinh');

  await pageAdmin.goto(WEB + '/admin/submissions', { waitUntil: 'networkidle', timeout: 45000 });
  await pageAdmin.waitForTimeout(1200);
  await chup(pageAdmin, '06-admin-bai-nop');

  await pageAdmin.goto(WEB + '/admin/content', { waitUntil: 'networkidle', timeout: 45000 });
  await pageAdmin.waitForTimeout(1200);
  await chup(pageAdmin, '07-admin-noi-dung');

  await contextAdmin.close();
  await browser.close();

  console.log('thu mục ảnh: ' + OUT);
  console.log('lỗi trang: ' + (loi.length ? loi.join(' | ') : 'không có'));
})().catch(error => {
  console.error('THẤT BẠI:', error.message);
  process.exitCode = 1;
});
