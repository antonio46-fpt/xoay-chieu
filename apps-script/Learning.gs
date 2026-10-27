/** Nháp riêng theo tài khoản/tuần. Không dùng nháp làm bài nộp hoặc điểm nghiên cứu. */
const LEARNING_HEADERS = ['ma','truong','lop','tuan','draft_id','revision','mutation_id','cap_nhat',
  ...Array.from({length:16},(_,index)=>'noi_dung_'+(index+1))];

function cleanStudentDraft_(draft, week) {
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const spec = SCHEMA.workflow && SCHEMA.workflow[week - 1];
  if (!spec) fail_('Cần cập nhật Schema.gs và Learning.gs cùng phiên bản.', 'SETUP_REQUIRED');
  if (!plain(draft) || Object.keys(draft).some(key => !['id','version','step','answers','started','activeMs','stageTimes','hints','sourceId'].includes(key)) ||
      typeof draft.id !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(draft.id) ||
      typeof draft.version !== 'string' || draft.version.length > 40 ||
      !Number.isInteger(draft.step) || draft.step < 0 || draft.step >= spec.length ||
      typeof draft.started !== 'string' || !isFinite(Date.parse(draft.started)) ||
      !num_(draft.activeMs, 0, 604800000) || !plain(draft.answers) || !plain(draft.stageTimes) || !plain(draft.hints)) fail_('Cấu trúc nháp không hợp lệ.');
  const fields = SCHEMA.weeks[week - 1], answers = {};
  if (Object.keys(draft.answers).some(key => !fields.some(field => field.key === key))) fail_('Nháp chứa câu trả lời ngoài nhiệm vụ.');
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(draft.answers, field.key)) continue;
    const value = draft.answers[field.key];
    if (field.kind === 'rating') {
      if (![1,2,3].includes(value)) fail_('Mức tự đánh giá không hợp lệ.');
    } else if (typeof value !== 'string' || value.length > field.max || (field.options && value !== '' && !field.options.includes(value))) fail_('Câu trả lời nháp vượt giới hạn hoặc sai lựa chọn.');
    answers[field.key] = typeof value === 'string' && !field.options && Safety.matches(value, SCHEMA.safety) ? Safety.hidden : value;
  }
  const stageTimes = {}, hints = {};
  for (const key of Object.keys(draft.stageTimes).sort()) {
    if (!spec.some(step => step.stage === key) || !num_(draft.stageTimes[key], 0, 604800000)) fail_('Thời gian chặng không hợp lệ.');
    stageTimes[key] = draft.stageTimes[key];
  }
  for (const key of Object.keys(draft.hints).sort()) {
    if (!/^(0|[1-9][0-9]*)$/.test(key) || !spec[Number(key)] || !Number.isInteger(draft.hints[key]) || draft.hints[key] < 0 || draft.hints[key] > spec[Number(key)].hints) fail_('Gợi ý không hợp lệ.');
    hints[key] = draft.hints[key];
  }
  const result = {id:draft.id,version:draft.version,step:draft.step,answers,started:draft.started,activeMs:draft.activeMs,stageTimes,hints};
  if (draft.sourceId !== undefined) {
    if (typeof draft.sourceId !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(draft.sourceId)) fail_('Liên kết sản phẩm gốc không hợp lệ.');
    result.sourceId = draft.sourceId;
  }
  if (JSON.stringify(result).length > 159000) fail_('Nháp quá lớn. Hãy tải bản sao trước khi tiếp tục.');
  return result;
}

function learningRows_(id) { return readSystemTable_(id, 'nhap_hoc_tap', LEARNING_HEADERS); }
function ownLearningRows_(rows, account) {
  const found = new Set();
  return rows.map((row,index) => ({row,index})).filter(item => {
    const row = item.row;
    if (row[0] !== account.ma || row[1] !== account.truong || ClassIds.code(row[2]) !== account.lop) return false;
    if (!Number.isInteger(row[3]) || row[3] < 1 || row[3] > 4 || found.has(row[3]) || !Number.isSafeInteger(row[5]) || row[5] < 1) fail_('Bảng nháp có tuần hoặc revision không hợp lệ/trùng. Chủ dự án cần kiểm tra.', 'SETUP_REQUIRED');
    found.add(row[3]); return true;
  });
}
function decodeLearningRow_(row) {
  let draft;
  try { draft = JSON.parse(row.slice(8).join('')); } catch { fail_('Không đọc được nháp trên Sheet; dữ liệu trên máy vẫn được giữ.', 'SETUP_REQUIRED'); }
  return cleanStudentDraft_(draft, row[3]);
}
function learningChunks_(value) {
  const chunks = [];
  while (value.length) {
    let size = Math.min(10000, value.length);
    if (size < value.length && /[\uD800-\uDBFF]/.test(value[size - 1])) size--;
    chunks.push(value.slice(0,size)); value = value.slice(size);
  }
  if (chunks.length > 16) fail_('Nháp quá lớn.');
  while (chunks.length < 16) chunks.push('');
  return chunks;
}

/** Đọc chỉ các dòng bài thuộc người đang xác thực; không trả bài của học sinh khác. */
function studentRecords_(id, account) {
  const options = {valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'SERIAL_NUMBER'};
  const metadata = Sheets.Spreadsheets.Values.get(id,"'chu_trinh'!E2:H",options).values || [];
  const ranges = [];
  metadata.forEach((row,index) => {
    if (row[0] === account.ma && row[1] === account.truong && ClassIds.code(row[2]) === account.lop) ranges.push("'chu_trinh'!" + (index + 2) + ':' + (index + 2));
  });
  const records = [];
  for (let offset = 0; offset < ranges.length; offset += 50) {
    const result = Sheets.Spreadsheets.Values.batchGet(id,{...options,ranges:ranges.slice(offset,offset+50)});
    for (const range of result.valueRanges || []) {
      const row = (range.values || [])[0];
      if (!row) continue;
      const record = {loai:'chu_trinh'};
      HEADERS.chu_trinh.forEach((key,index) => {record[key] = row[index] ?? '';});
      // Kiểm tra lần nữa trước khi trả, kể cả khi bảng nguồn bị chỉnh thủ công.
      if (record.ma === account.ma && record.truong === account.truong && ClassIds.code(record.lop) === account.lop) records.push(Safety.redactRecord(ClassIds.profile(record),SCHEMA.safety));
    }
  }
  return records;
}

function getStudentLearning(input) {
  let lock;
  try {
    if (!input) fail_('Cần đăng nhập để tải tiến trình.', 'AUTH_REQUIRED');
    const id = accountSheetId_(); lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Nháp trên máy vẫn được giữ.', 'BUSY');
    const account = authorizeStudent_(input.token,input,id), records = studentRecords_(id,account);
    const submitted = new Set(records.map(record => record.id));
    const states = ownLearningRows_(learningRows_(id),account).map(({row}) => ({week:row[3],revision:row[5],mutationId:row[6],updatedAt:row[7],
      draft:submitted.has(row[4]) ? null : decodeLearningRow_(row)}));
    return {ok:true,states,records};
  } catch (error) {
    return {ok:false,code:error.code || 'SERVER_ERROR',error:error.code ? error.message : 'Chưa tải được tiến trình. Bài và nháp trên máy vẫn được giữ.'};
  } finally {if (lock && lock.hasLock()) lock.releaseLock();}
}

function saveStudentDraft(input) {
  let lock;
  try {
    if (!input || !Number.isInteger(input.week) || input.week < 1 || input.week > 4 ||
        !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
        typeof input.mutationId !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(input.mutationId)) fail_('Yêu cầu lưu nháp không hợp lệ.');
    const id = accountSheetId_(); lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) fail_('Máy chủ đang bận. Nháp sẽ được gửi lại.', 'BUSY');
    const account = authorizeStudent_(input.token,input,id), draft = cleanStudentDraft_(input.draft,input.week);
    const json = JSON.stringify(draft), current = ownLearningRows_(learningRows_(id),account).find(item => item.row[3] === input.week);
    const revision = current ? current.row[5] : 0;
    const ids = Sheets.Spreadsheets.Values.get(id,"'chu_trinh'!A2:A",{valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'SERIAL_NUMBER'}).values || [];
    if (ids.some(row => row[0] === draft.id)) return {ok:false,code:'ALREADY_SUBMITTED',error:'Bài này đã nộp. Tải lại tiến trình trước khi làm lượt mới.'};
    if (current && current.row[6] === input.mutationId) {
      if (JSON.stringify(decodeLearningRow_(current.row)) !== json) fail_('Lần gửi nháp đã tồn tại với nội dung khác.', 'ID_CONFLICT');
      return {ok:true,week:input.week,revision,mutationId:input.mutationId,duplicate:true};
    }
    if (input.expectedRevision !== revision) return {ok:false,code:'STATE_CONFLICT',error:'Nháp đã thay đổi trên thiết bị khác. Cả hai bản được giữ để bạn chọn.',week:input.week,revision,draft:current && !ids.some(row=>row[0]===current.row[4]) ? decodeLearningRow_(current.row) : null};

    const values = [account.ma,account.truong,account.lop,input.week,draft.id,revision+1,input.mutationId,new Date().toISOString(),...learningChunks_(json)];
    if (current) {
      const number = current.index + 2;
      Sheets.Spreadsheets.Values.update({values:[values]},id,"'nhap_hoc_tap'!A"+number+':X'+number,{valueInputOption:'RAW'});
    } else Sheets.Spreadsheets.Values.append({values:[values]},id,"'nhap_hoc_tap'!A1",{valueInputOption:'RAW',insertDataOption:'INSERT_ROWS'});
    return {ok:true,week:input.week,revision:revision+1,mutationId:input.mutationId,duplicate:false};
  } catch (error) {
    return {ok:false,code:error.code || 'SERVER_ERROR',error:error.code ? error.message : 'Chưa lưu được nháp lên Sheet. Bản trên máy vẫn được giữ.'};
  } finally {if (lock && lock.hasLock()) lock.releaseLock();}
}
