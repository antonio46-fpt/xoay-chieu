/**
 * Đọc và ghi CSV không phụ thuộc thư viện ngoài.
 *
 * Hỗ trợ: BOM, xuống dòng CRLF, ô có dấu ngoặc kép, dấu ngoặc kép lặp "".
 * Đủ cho tệp xuất từ Excel và Google Sheets.
 */

export type CsvDaDoc = { tieuDe: string[]; dong: string[][] };

export function docCsv(vanBan: string): CsvDaDoc {
  const sach = vanBan.replace(/^\uFEFF/, '');
  const o: string[] = [];
  const dong: string[][] = [];
  let giaTri = '';
  let trongNgoac = false;

  for (let i = 0; i < sach.length; i += 1) {
    const kyTu = sach[i];

    if (trongNgoac) {
      if (kyTu === '"') {
        if (sach[i + 1] === '"') {
          giaTri += '"';
          i += 1;
        } else {
          trongNgoac = false;
        }
      } else {
        giaTri += kyTu;
      }
      continue;
    }

    if (kyTu === '"') {
      trongNgoac = true;
    } else if (kyTu === ',') {
      o.push(giaTri);
      giaTri = '';
    } else if (kyTu === '\n') {
      o.push(giaTri);
      dong.push(o.splice(0, o.length));
      giaTri = '';
    } else if (kyTu !== '\r') {
      giaTri += kyTu;
    }
  }

  if (giaTri !== '' || o.length > 0) {
    o.push(giaTri);
    dong.push(o.splice(0, o.length));
  }

  const daLoc = dong.filter(hang => hang.some(trong => trong.trim() !== ''));
  if (daLoc.length === 0) return { tieuDe: [], dong: [] };

  const [tieuDe, ...conLai] = daLoc;
  return {
    tieuDe: tieuDe.map(ten => ten.trim().toLowerCase()),
    dong: conLai
  };
}

function bocO(giaTri: string): string {
  if (/[",\r\n]/.test(giaTri)) {
    return '"' + giaTri.replace(/"/g, '""') + '"';
  }
  return giaTri;
}

/**
 * Xuất CSV kèm BOM để Excel mở đúng tiếng Việt.
 * Dùng CRLF vì Excel trên Windows quen với kiểu này.
 */
export function ghiCsv(tieuDe: string[], cacDong: (string | number | null | undefined)[][]): string {
  const dong = [tieuDe.map(bocO).join(',')];
  for (const hang of cacDong) {
    dong.push(hang.map(o => bocO(o === null || o === undefined ? '' : String(o))).join(','));
  }
  return '\uFEFF' + dong.join('\r\n') + '\r\n';
}

/** Sinh mật khẩu ngẫu nhiên đủ mạnh để phát cho học sinh. */
export function matKhauNgauNhien(doDai = 10): string {
  const chu = 'abcdefghjkmnpqrstuvwxyz';
  const so = '23456789';
  const tatCa = chu + chu.toUpperCase() + so;
  const bytes = new Uint8Array(doDai);
  crypto.getRandomValues(bytes);
  const phan = Array.from(bytes, b => tatCa[b % tatCa.length]);
  // Bảo đảm luôn có ít nhất một chữ và một số theo quy tắc mật khẩu.
  phan[0] = chu[bytes[0] % chu.length];
  phan[1] = so[bytes[1] % so.length];
  return phan.join('');
}
