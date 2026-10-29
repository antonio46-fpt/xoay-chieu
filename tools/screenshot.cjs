/**
 * Chụp ảnh giao diện để kiểm tra bằng mắt.
 * Chỉ dùng cho phát triển: cần playwright-core và Chrome cài sẵn trên máy.
 *
 *   node tools/screenshot.cjs
 *
 * Ảnh ghi ra thư mục tạm của hệ điều hành, không nằm trong repo.
 */
const { chromium } = require('playwright-core');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist');
const OUT = process.env.XC_SHOTS || path.join(os.tmpdir(), 'xc-shots');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((request, response) => {
      const target = decodeURIComponent((request.url || '/').split('?')[0]);
      const file = path.join(DIST, target === '/' ? 'index.html' : target);
      if (!file.startsWith(DIST)) return response.writeHead(403).end();
      fs.readFile(file, (error, data) => {
        if (error) return response.writeHead(404).end('not found');
        response.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        response.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const fillLogin = async page => {
  await page.fill('#code', 'CH12-T');
  await page.selectOption('#school', { index: 1 });
  await page.waitForTimeout(120);
  await page.selectOption('#class', { index: 1 });
  await page.click('#loginStart');
  await page.waitForTimeout(400);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, port } = await serve();
  const url = `http://127.0.0.1:${port}/index.html`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const problems = [];
  const shots = [];

  const capture = async (name, viewport, prepare) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => problems.push(`${name} pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') problems.push(`${name} console: ${message.text()}`);
    });
    await page.goto(url, { waitUntil: 'load' });
    if (prepare) await prepare(page);
    await page.waitForTimeout(300);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
    await context.close();
  };

  await capture('01-login-desktop', { width: 1280, height: 900 });
  await capture('02-login-dark', { width: 1280, height: 900 }, async page => {
    await page.click('#theme');
  });
  await capture('03-login-mobile', { width: 390, height: 844 }, async page => {
    await page.fill('#code', 'CH12-T');
    await page.selectOption('#school', { index: 1 });
    await page.waitForTimeout(120);
  });
  await capture('04-home', { width: 1280, height: 900 }, fillLogin);
  await capture('05-work-week1', { width: 1280, height: 900 }, async page => {
    await fillLogin(page);
    await page.evaluate(() => start(1));
    await page.waitForTimeout(400);
  });
  await capture('06-work-mobile', { width: 390, height: 844 }, async page => {
    await fillLogin(page);
    await page.evaluate(() => start(1));
    await page.waitForTimeout(400);
  });

  await browser.close();
  server.close();
  console.log('shots=' + OUT);
  shots.forEach(file => console.log('  ' + path.basename(file)));
  if (problems.length) {
    console.log('problems=' + problems.length);
    problems.forEach(line => console.log('  ! ' + line));
  } else {
    console.log('problems=0');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
