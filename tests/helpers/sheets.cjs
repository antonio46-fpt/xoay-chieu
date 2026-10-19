const assert = require('node:assert/strict');
/** Sheets values fixtures: types preserved, trailing blanks omitted as in Values.get. */
function valuesReader(headers, rows, onRead = () => {}) {
  return (spreadsheetId, range, options) => {
    onRead(range, options);
    assert.equal(options.valueRenderOption, 'UNFORMATTED_VALUE');
    assert.equal(options.dateTimeRenderOption, 'SERIAL_NUMBER');
    const cells = range.split('!')[1];
    let result;
    if(cells === '1:1') result = [headers()];
    else if(cells === 'A2:A') result = rows().map(row => [row[0]]);
    else {
      const match = cells.match(/^(\d+):(\d+)$/);
      assert(match && match[1] === match[2], range);
      const row = rows()[Number(match[1]) - 2];
      result = row ? [row] : [];
    }
    return { values: result.map(row => {
      const copy = [...row];
      while(copy.length && (copy.at(-1) === '' || copy.at(-1) === undefined)) copy.pop();
      return copy;
    }) };
  };
}
module.exports = {valuesReader};

/** Real account authorization + progress projection for older submission regression suites. */
function installStudentFixture(c, {school, klass, ma, rows, onRead = () => {}}) {
  const vm = require('node:vm');
  vm.runInContext(require('node:fs').readFileSync('apps-script/Accounts.gs','utf8'), c);
  const token = 'fixture-student-session-1234567890', hash = 'a'.repeat(64);
  const accounts = [[ma, school, klass, 'hoat_dong', 'fixture-salt', hash, '2026-01-01T00:00:00.000Z']];
  const progress = [];
  const originalCache = c.CacheService.getScriptCache();
  const sessions = new Map([['student:' + token, JSON.stringify({ma,truong:school,lop:klass,expires:Date.now()+86400000,credentialVersion:hash})]]);
  c.CacheService.getScriptCache = () => ({
    get: key => sessions.has(key) ? sessions.get(key) : originalCache.get(key),
    put: (key,value,ttl) => originalCache.put(key,value,ttl),
    remove: key => { sessions.delete(key); originalCache.remove?.(key); }
  });
  const values = c.Sheets.Spreadsheets.Values, originalGet = values.get, originalAppend = values.append;
  values.get = (id, range, options) => {
    if (!range.startsWith("'tai_khoan'!") && !range.startsWith("'tien_do'!") && range !== "'chu_trinh'!E2:H") return originalGet(id,range,options);
    onRead(range, options);
    assert.equal(options.valueRenderOption, 'UNFORMATTED_VALUE');
    assert.equal(options.dateTimeRenderOption, 'SERIAL_NUMBER');
    if (range === "'tai_khoan'!A1:G") return {values:[vm.runInContext('ACCOUNT_HEADERS',c),...accounts]};
    if (range === "'tien_do'!A1:I") return {values:[vm.runInContext('PROGRESS_HEADERS',c),...progress]};
    if (range === "'chu_trinh'!E2:H") return {values:rows().map(row=>row.slice(4,8))};
    throw Error('Unexpected system range: '+range);
  };
  values.append = (body,id,range,options) => {
    if(range.startsWith("'tien_do'!")){assert.equal(options.valueInputOption,'RAW');progress.push(...body.values);return;}
    return originalAppend(body,id,range,options);
  };
  values.update = (body,id,range,options) => {
    assert.equal(options.valueInputOption,'RAW');
    const match=range.match(/^'tien_do'!A(\d+):I\d+$/);assert(match,range);
    progress[Number(match[1])-2]=body.values[0];
  };
  c.studentFixtureToken = token;
  return {token, accounts, progress};
}
module.exports.installStudentFixture = installStudentFixture;
