/**
 * Server tĩnh để xem bản dựng trong dist/ khi phát triển.
 * Chỉ dùng cho máy cá nhân; không phải thành phần của ứng dụng.
 *
 *   node tools/serve.cjs [cổng]
 *
 * Mặc định cổng 4173. Dừng bằng Ctrl+C.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.argv[2] || 4173);
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const server = http.createServer((request, response) => {
  const url = decodeURIComponent((request.url || '/').split('?')[0]);
  const relative = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.resolve(DIST, relative);

  // Chặn đường dẫn thoát khỏi thư mục dist.
  if (!file.startsWith(DIST)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return response.end('Không được phép.');
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return response.end('<meta charset="utf-8"><p>Không tìm thấy tệp. <a href="/">Về trang chính</a></p>');
    }
    response.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(data);
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cổng ${PORT} đang bận. Thử: node tools/serve.cjs 4174`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('Xoay Chiều đang chạy tại: http://' + HOST + ':' + PORT + '/');
  console.log('Thư mục phục vụ: ' + DIST);
  console.log('Dừng: Ctrl+C');
});
