const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const content=require('../src/content.json'),Classes=require('../src/classes.js');
const c=vm.createContext({Date,console});
for(const name of ['Schema.gs','Code.gs','Accounts.gs','Learning.gs','Management.gs'])vm.runInContext(fs.readFileSync('apps-script/'+name,'utf8'),c);
const school=content.truong_lop[0].truong,klass=content.truong_lop[0].lop[0],other=content.truong_lop[0].lop[1];
const accounts=[['ZZ01-A',school,Classes.label(klass),'hoat_dong','DO_NOT_EXPORT_SALT','DO_NOT_EXPORT_HASH'],['ZZ01-A',school,other,'khoa'],['','','','']];
const draft={id:'management-draft-123456',version:content.phien_ban,step:2,answers:{thu_lam:'Nội dung bị bắt nạt cần che.',nghi_1:'=HYPERLINK("example.invalid")'},started:'2026-01-01T00:00:00.000Z',activeMs:1000,stageTimes:{},hints:{}};
c.draft=draft;const chunks=Array.from(vm.runInContext('learningChunks_(JSON.stringify(draft))',c));
let drafts=[['ZZ01-A',school,Classes.label(klass),1,draft.id,1,'fake-mutation-123456','2026-01-02T00:00:00.000Z',...chunks]];
const headers=Array.from(vm.runInContext('HEADERS.chu_trinh',c));
function row(data){return headers.map(name=>data[name]??'');}
let records=[];
function report(){c.a=accounts;c.d=drafts;c.r=records;return JSON.parse(JSON.stringify(vm.runInContext('XOAY_MANAGEMENT(a,d,r)',c)));}
let result=report();const idx=name=>result[0].indexOf(name);assert.equal(result.length,9);
let first=result[1];assert.equal(first[idx('lop')],klass);assert.equal(first[idx('trang_thai')],'dang_lam');assert.equal(first[idx('thu_lam')],'[đã ẩn – an toàn]');assert.equal(first[idx('nghi_1')],draft.answers.nghi_1);assert.equal(first[idx('so_tuan_da_nop')],0);assert.equal(first[idx('buoc_hien_tai')],3);assert(first[idx('ti_le_o_da_dien_pct')]>0);
assert(!JSON.stringify(result).includes('DO_NOT_EXPORT'));assert.equal(result[5][idx('trang_thai')],'chua_bat_dau');
const submitted={id:draft.id,ma:'ZZ01-A',truong:school,lop:klass,tuan:1,thoi_gian_nhan:'2026-01-03T00:00:00.000Z',thu_lam:'Sản phẩm đã nộp',san_pham:'Nội dung bị bắt nạt được che'};
records=[row(submitted),row(submitted)];result=report();assert.equal(result[1][idx('trang_thai')],'da_nop');assert.equal(result[1][idx('san_pham')],'[đã ẩn – an toàn]');assert.equal(result[1][idx('tien_do_chuong_trinh_pct')],25);
let summary=JSON.parse(JSON.stringify(vm.runInContext('XOAY_STUDENTS(a,d,r)',c)));assert.equal(summary.length,3);assert.equal(summary[1][summary[0].indexOf('so_bai_da_nop')],1);assert.equal(summary[2][summary[0].indexOf('so_tuan_da_nop')],0);
// A newer draft is visible while the completed week remains counted; an older draft loses to a newer submission.
draft.id='new-management-draft-123456';c.draft=draft;drafts=[['ZZ01-A',school,klass,1,draft.id,2,'new-management-mutation-123456','2026-01-04T00:00:00.000Z',...Array.from(vm.runInContext('learningChunks_(JSON.stringify(draft))',c))]];
result=report();assert.equal(result[1][idx('trang_thai')],'dang_lam_luot_moi');assert.equal(result[1][idx('so_tuan_da_nop')],1);
drafts[0][7]='2026-01-01T00:00:00.000Z';result=report();assert.equal(result[1][idx('trang_thai')],'da_nop');
c.a=[...accounts,accounts[0]];assert.throws(()=>vm.runInContext('XOAY_STUDENTS(a,d,r)',c),/Trùng/);
// Installer owns only the two derived tabs, uses safe source columns and preserves existing content.
let locale='vi_VN';const sheets=new Map();
function sheet(name){const s={name,formula:'',rows:1000,cols:26,lastRow:0,filter:false,getLastRow(){return this.lastRow;},getMaxRows(){return this.rows;},getMaxColumns(){return this.cols;},insertRowsAfter(_,n){this.rows+=n;},insertColumnsAfter(_,n){this.cols+=n;},setFrozenRows(){},setFrozenColumns(){},getFilter(){return this.filter;},getRange(){return {getFormula:()=>s.formula,setFormula:value=>{s.formula=value;s.lastRow=1;},setFontWeight(){return this;},setBackground(){return this;},setFontColor(){return this;},setVerticalAlignment(){return this;},setWrap(){return this;},createFilter(){s.filter=true;}};}};sheets.set(name,s);return s;}
for(const name of ['tai_khoan','nhap_hoc_tap','chu_trinh'])sheet(name);sheets.get('tai_khoan').lastRow=3;
const book={getId:()=> 'fake-management-sheet',getSpreadsheetLocale:()=>locale,getSheetByName:name=>sheets.get(name),insertSheet:sheet};
c.PropertiesService={getScriptProperties:()=>({getProperty:()=>book.getId()})};c.SpreadsheetApp={getActiveSpreadsheet:()=>book};
assert(vm.runInContext('setupManagement_()',c).ok);assert.equal(sheets.get('quan_ly_hoc_tap').formula,'=XOAY_MANAGEMENT(tai_khoan!A2:D;nhap_hoc_tap!A2:X;chu_trinh!A2:Z)');assert.equal(sheets.get('quan_ly_hoc_tap').cols,27);
assert(vm.runInContext('setupManagement_()',c).ok);locale='en_US';vm.runInContext('setupManagement_()',c);assert(sheets.get('quan_ly_hoc_tap').formula.includes('A2:D,nhap'));
sheets.get('quan_ly_hoc_sinh').formula='';const before=sheets.get('quan_ly_hoc_tap').formula;assert.throws(()=>vm.runInContext('setupManagement_()',c),/không ghi đè/);assert.equal(sheets.get('quan_ly_hoc_tap').formula,before);
console.log('PASS management Sheets: per-account/week data, class aliases, masked readable text, no credentials, completion vs drafts, replay/new-attempt ordering, locale formulas and non-destructive repeatable setup');
