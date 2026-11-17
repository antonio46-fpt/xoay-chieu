import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NHAN_DA_CHE, cheBaiNop, cheOText, chuaTuKhoa } from '../src/security/redact.ts';

const TU_KHOA = ['tự tử', 'bắt nạt', 'bạo lực'];

test('phát hiện từ khoá, kể cả khi gõ không dấu', () => {
  assert.equal(chuaTuKhoa('em muốn tự tử', TU_KHOA), true);
  assert.equal(chuaTuKhoa('em muon tu tu', TU_KHOA), true);
  assert.equal(chuaTuKhoa('em bị bắt nạt ở lớp', TU_KHOA), true);
  assert.equal(chuaTuKhoa('hôm nay trời đẹp', TU_KHOA), false);
});

test('che cả ô, không che từng từ', () => {
  const ketQua = cheOText('Em thấy rất mệt và nghĩ đến tự tử mỗi ngày', TU_KHOA);
  assert.equal(ketQua.daChe, true);
  assert.equal(ketQua.giaTri, NHAN_DA_CHE);
  assert.ok(!ketQua.giaTri.includes('mệt'), 'không được giữ lại phần còn lại');
});

test('ô rỗng và null giữ nguyên, không bị che', () => {
  assert.deepEqual(cheOText('', TU_KHOA), { giaTri: '', daChe: false });
  assert.deepEqual(cheOText('   ', TU_KHOA), { giaTri: '   ', daChe: false });
  assert.deepEqual(cheOText(null, TU_KHOA), { giaTri: null, daChe: false });
  assert.deepEqual(cheOText(undefined, TU_KHOA), { giaTri: null, daChe: false });
});

test('cheBaiNop chỉ chạm các ô nội dung, báo đúng cờ', () => {
  const bai = {
    thu_lam: 'em học được cách hỏi lại',
    nghi_1: 'em thấy mình bị bắt nạt',
    san_pham: 'bài của em',
    tu_danh_gia: 'muc_2'
  };
  const ketQua = cheBaiNop(bai, TU_KHOA);
  assert.equal(ketQua.daChe, true);
  assert.equal(ketQua.bai.nghi_1, NHAN_DA_CHE);
  assert.equal(ketQua.bai.thu_lam, 'em học được cách hỏi lại');
  assert.equal(ketQua.bai.san_pham, 'bài của em');
  assert.equal(ketQua.bai.tu_danh_gia, 'muc_2');
});

test('bài không có từ khoá thì không bị che', () => {
  const ketQua = cheBaiNop({ thu_lam: 'em hiểu ra rồi', nghi_1: 'không' }, TU_KHOA);
  assert.equal(ketQua.daChe, false);
  assert.equal(ketQua.bai.thu_lam, 'em hiểu ra rồi');
});
