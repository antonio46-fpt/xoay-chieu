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
