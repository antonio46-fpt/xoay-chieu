/** Bảng quản lý chỉ tính từ các mảng ô được truyền vào. Không đọc Sheet/Properties trong custom function. */
const MANAGEMENT_FIELDS = ['thu_lam','nghi_1','nghi_2','nghi_3','noi','dang_san_pham','san_pham','chia_se','tu_danh_gia','phe','doi_hay_giu','kiem_soat','ngoai_kiem_soat'];
const MANAGEMENT_HEADERS = ['ma','truong','lop','tuan','trang_thai','buoc_hien_tai','tong_so_buoc','so_o_da_dien','tong_so_o','ti_le_o_da_dien_pct','so_tuan_da_nop','tien_do_chuong_trinh_pct','draft_hoac_bai_id','cap_nhat',...MANAGEMENT_FIELDS];
const STUDENT_MANAGEMENT_HEADERS = ['ma','truong','lop','trang_thai_tai_khoan','tuan_1_da_nop','tuan_2_da_nop','tuan_3_da_nop','tuan_4_da_nop','so_tuan_da_nop','tien_do_chuong_trinh_pct','cac_tuan_dang_lam','cap_nhat_cuoi','so_bai_da_nop'];

function managementModel_(accountValues, draftValues, recordValues) {
  if (![accountValues,draftValues,recordValues].every(Array.isArray)) throw Error('Cần truyền đủ ba vùng tài khoản, nháp và bài nộp.');
  const key = value => JSON.stringify([value.truong,ClassIds.code(value.lop),value.ma]);
  const stamp = value => value instanceof Date ? value.toISOString() : typeof value === 'string' && isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
  const accounts = new Map();
  accountValues.forEach((row,index) => {
    if (!Array.isArray(row) || !row.some(value=>value!=='' && value!==null && value!==undefined)) return;
    const account={ma:String(row[0] || '').trim().toUpperCase().replace(/\s/g,''),truong:String(row[1] || '').trim(),lop:ClassIds.code(String(row[2] || '').trim()),status:String(row[3] || 'hoat_dong')};
    if (!/^[A-Z]{2}[0-9]{2}-[A-Z]$/.test(account.ma) || !schoolOK_(account) || !['hoat_dong','khoa'].includes(account.status)) throw Error('Kiểm tra dòng '+(index+2)+' của tai_khoan.');
    const id=key(account);
    if(accounts.has(id))throw Error('Trùng mã/trường/lớp trong tai_khoan ở dòng '+(index+2)+'.');
    accounts.set(id,{...account,drafts:new Map(),records:[],submitted:new Set(),ids:new Set()});
  });
  recordValues.forEach(row => {
    if (!Array.isArray(row) || !row[0]) return;
    const record={loai:'chu_trinh'};
    HEADERS.chu_trinh.forEach((name,index)=>{record[name]=row[index] ?? '';});
    record.lop=ClassIds.code(record.lop);
    const account=accounts.get(key(record));
    if(!account || !Number.isInteger(record.tuan) || record.tuan<1 || record.tuan>SCHEMA.weeks.length)return;
    if(account.ids.has(record.id))return;
    account.ids.add(record.id);account.submitted.add(record.tuan);
    account.records.push({record:Safety.redactRecord(record,SCHEMA.safety),updatedAt:stamp(record.thoi_gian_nhan)||stamp(record.thoi_gian)});
  });
  draftValues.forEach((row,index) => {
    if(!Array.isArray(row) || !row[0])return;
    const account=accounts.get(key({ma:row[0],truong:row[1],lop:row[2]}));
    if(!account)return;
    const week=row[3];
    if(!Number.isInteger(week)||week<1||week>SCHEMA.weeks.length||account.drafts.has(week))throw Error('Kiểm tra tuần/trùng nháp ở dòng '+(index+2)+' của nhap_hoc_tap.');
    const draft=decodeLearningRow_(row); // Kiểm tra và che an toàn lại, không đọc nguồn bên ngoài.
    if(draft.id!==row[4])throw Error('ID nháp không khớp ở dòng '+(index+2)+'.');
    account.drafts.set(week,{draft,updatedAt:stamp(row[7])});
  });
  const details=[],students=[];
  for(const account of accounts.values()) {
    const completed=account.submitted.size, programPct=Math.round(completed/SCHEMA.weeks.length*100), active=[];
    let lastUpdate='';
    for(let week=1;week<=SCHEMA.weeks.length;week++) {
      const submitted=account.records.filter(item=>item.record.tuan===week).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
      const latest=submitted[submitted.length-1], saved=account.drafts.get(week);
      // Gửi lại bài cũ không được làm mất lượt mới; nháp đã nộp không hiện lại như chưa xong.
      const current=saved && !account.ids.has(saved.draft.id) && (!latest || saved.updatedAt>=latest.updatedAt) ? saved : null;
      const values=current ? current.draft.answers : latest ? latest.record : {};
      const fields=SCHEMA.weeks[week-1], total=fields.length;
      const filled=fields.filter(field=>typeof values[field.key]==='number' || typeof values[field.key]==='string'&&values[field.key].trim()!=='').length;
      const status=current ? account.submitted.has(week)?'dang_lam_luot_moi':'dang_lam' : latest?'da_nop':'chua_bat_dau';
      const updatedAt=current ? current.updatedAt : latest?.updatedAt || '';
      if(updatedAt>lastUpdate)lastUpdate=updatedAt;
      if(current)active.push(week);
      details.push([account.ma,account.truong,account.lop,week,status,current?current.draft.step+1:latest?SCHEMA.workflow[week-1].length:0,SCHEMA.workflow[week-1].length,filled,total,Math.round(filled/total*100),completed,programPct,current?current.draft.id:latest?.record.id||'',updatedAt,...MANAGEMENT_FIELDS.map(name=>values[name] ?? '')]);
    }
    students.push([account.ma,account.truong,account.lop,account.status,...[1,2,3,4].map(week=>account.submitted.has(week)),completed,programPct,active.join(', '),lastUpdate,account.ids.size]);
  }
  return {details,students};
}

/**
 * Câu trả lời an toàn từng tài khoản/tuần; tự tính lại khi các vùng nguồn đổi.
 * @customfunction
 */
function XOAY_MANAGEMENT(accounts, drafts, records) {
  return [MANAGEMENT_HEADERS,...managementModel_(accounts,drafts,records).details];
}

/**
 * Tổng quan tài khoản; không có PIN/hash/token, không phải điểm năng lực.
 * @customfunction
 */
function XOAY_STUDENTS(accounts, drafts, records) {
  return [STUDENT_MANAGEMENT_HEADERS,...managementModel_(accounts,drafts,records).students];
}

/** Chỉ chủ dự án chạy từ editor; không xóa bảng nguồn hay nội dung có sẵn. */
function setupManagement_(spreadsheet) {
  const supplied=!!spreadsheet;
  spreadsheet ||= SpreadsheetApp.getActiveSpreadsheet();
  if(!spreadsheet)fail_('Mở Apps Script từ Sheet của dự án.', 'SETUP_REQUIRED');
  const configured=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!supplied && (!configured || configured!==spreadsheet.getId()))fail_('Sheet không khớp cấu hình. Chạy setup_ trên đúng dự án trước.', 'SETUP_REQUIRED');
  for(const name of ['tai_khoan','nhap_hoc_tap','chu_trinh'])if(!spreadsheet.getSheetByName(name))fail_('Thiếu bảng nguồn '+name+'. Chạy setup_ trước.', 'SETUP_REQUIRED');
  const locale=spreadsheet.getSpreadsheetLocale() || 'en_US';
  const separator=/^(vi|de|fr|it|es|pt|ru|pl|nl|da|fi|sv|tr|uk|cs|sk|hu|ro|el|id)(_|-|$)/i.test(locale)?';':',';
  const sources=['tai_khoan!A2:D','nhap_hoc_tap!A2:X','chu_trinh!A2:Z'].join(separator);
  const count=Math.max(0,spreadsheet.getSheetByName('tai_khoan').getLastRow()-1);
  const targets=[['quan_ly_hoc_sinh','XOAY_STUDENTS',STUDENT_MANAGEMENT_HEADERS,count+1],['quan_ly_hoc_tap','XOAY_MANAGEMENT',MANAGEMENT_HEADERS,count*4+1]];
  // Kiểm tra tất cả bảng trước, tránh sửa một bảng rồi mới phát hiện bảng kia có dữ liệu riêng.
  for(const [name,fn] of targets){const sheet=spreadsheet.getSheetByName(name);if(sheet&&sheet.getLastRow()>0&&!sheet.getRange('A1').getFormula().startsWith('='+fn+'('))fail_('Bảng '+name+' đã có nội dung riêng; không ghi đè.', 'SETUP_REQUIRED');}
  for(const [name,fn,headers,needed] of targets) {
    const sheet=spreadsheet.getSheetByName(name)||spreadsheet.insertSheet(name);
    if(sheet.getMaxColumns()<headers.length)sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
    if(sheet.getMaxRows()<Math.max(2,needed))sheet.insertRowsAfter(sheet.getMaxRows(),Math.max(2,needed)-sheet.getMaxRows());
    sheet.getRange('A1').setFormula('='+fn+'('+sources+')');
    sheet.setFrozenRows(1);sheet.setFrozenColumns(3);
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1e2a5e').setFontColor('#ffffff');
    sheet.getRange(1,1,sheet.getMaxRows(),headers.length).setVerticalAlignment('top').setWrap(true);
    if(!sheet.getFilter())sheet.getRange(1,1,sheet.getMaxRows(),headers.length).createFilter();
  }
  return {ok:true,tabs:targets.map(item=>item[0]),intervalSeconds:60};
}
