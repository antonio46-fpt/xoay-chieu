/**
 * Quét bí mật bị lộ trong mã nguồn — thay cho gitleaks khi không muốn phụ
 * thuộc license hoặc phải tải binary trong CI.
 *
 * Quét mọi tệp đã commit (đọc từ `git ls-files`), bỏ qua các tệp trong danh
 * sách cho phép. Trả mã thoát 1 nếu tìm thấy.
 *
 * Chạy: node tools/scan-secrets.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Mẫu nhận diện bí mật. Đặt tên rõ để khi báo lỗi biết đang bắt cái gì. */
const MAU = [
  { ten: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { ten: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { ten: 'GitHub PAT (fine-grained)', re: /github_pat_[A-Za-z0-9_]{50,}/ },
  { ten: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { ten: 'Stripe secret key', re: /sk_live_[0-9A-Za-z]{20,}/ },
  { ten: 'Slack token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { ten: 'Private key', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    ten: 'Chuỗi kết nối CSDL có mật khẩu',
    re: /postgres(?:ql)?:\/\/[^\s"'@/:]+:(?!matkhau|password|doi_mat|thay_bang|test_password)[^\s"'@/]{6,}@/
  }
];

/** Tệp không quét: tài liệu mẫu, khoá thử nghiệm, chính bộ quét này. */
const BO_QUA = [
  /^server\/\.env\.example$/,
  /^\.gitleaks\.toml$/,
  /^tools\/scan-secrets\.mjs$/,
  /^README\.md$/,
  /^docs\//,
  /^\.github\/workflows\//,
  /^server\/scripts\/(seed-demo|create-admin)\.ts$/,
  /package-lock\.json$/,
  /^web\/src\/content\/content\.json$/
];

/** Giá trị thử nghiệm được phép xuất hiện trong mã. */
const GIA_TRI_THU = [
  'dev-secret-khong-dung-cho-production',
  'test-secret-phai-dai-hon-32-ky-tu',
  'ci-secret-phai-dai-hon-32-ky-tu',
  'Demo12345',
  'MatKhau123',
  'MatKhau456',
  'MatKhau789',
  'XoayChieu_Dev_2026'
];

const tep = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map(t => t.trim())
  .filter(Boolean)
  .filter(t => !BO_QUA.some(re => re.test(t)));

const phatHien = [];

for (const duong of tep) {
  let noiDung;
  try {
    noiDung = readFileSync(duong, 'utf8');
  } catch {
    continue; // tệp nhị phân hoặc không đọc được: bỏ qua
  }

  const dong = noiDung.split('\n');
  for (let i = 0; i < dong.length; i += 1) {
    const d = dong[i];
    if (GIA_TRI_THU.some(v => d.includes(v))) continue;
    if (d.length > 500) continue;

    for (const { ten, re } of MAU) {
      if (re.test(d)) {
        phatHien.push({ duong, dong: i + 1, ten });
      }
    }
  }
}

if (phatHien.length === 0) {
  console.log(`Quét ${tep.length} tệp: không tìm thấy bí mật.`);
  process.exit(0);
}

console.error(`Phát hiện ${phatHien.length} chỗ nghi lộ bí mật:`);
for (const p of phatHien) {
  console.error(`  ${p.duong}:${p.dong}  → ${p.ten}`);
}
console.error('\nSửa: chuyển giá trị sang biến môi trường và thêm vào .env.example.');
process.exit(1);
