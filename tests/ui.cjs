/** DOM integration tests. jsdom is not a real browser and does not check layout. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  JSDOM
} = require('jsdom');
const content = require('../src/content.json');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const storageKey = 'xoaychieu_v2';
const raw = '\n  Mình thử nhìn vấn đề từ một cách khác, lắng nghe bạn và chọn điều phù hợp.\n' +
  'Mình sẽ giải thích suy nghĩ bằng ví dụ và điều chỉnh khi cách cũ chưa hiệu quả.\n' +
  '<script>window.injected = true</script>  ';

function open(snapshot) {
  const dom = new JSDOM(html, {
    url: 'https://xoaychieu.test/',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.confirm = () => true;
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.setInterval = () => 0;
      if (snapshot) window.localStorage.setItem(storageKey, snapshot);
    },
  });
  const window = dom.window;
  const $ = id => window.document.getElementById(id);
  const input = (el, value) => {
    if (el.type === 'radio') el.checked = true;
    else el.value = value;
    el.dispatchEvent(new window.Event('input', {
      bubbles: true
    }));
  };
  return {
    dom,
    window,
    $,
    input,
    get: code => window.eval(code)
  };
}

let app = open();
try {
  const {
    $,
    window
  } = app;
  $('code').value = 'bi08-t';
  $('school').value = content.truong_lop[0].truong;
  $('school').dispatchEvent(new window.Event('change'));
  $('class').value = content.truong_lop[0].lop[0];
  $('login').dispatchEvent(new window.Event('submit', {
    cancelable: true,
    bubbles: true
  }));
  assert.equal(app.get('profile.ma'), 'BI08-T');

  for (const week of content.weeks) {
    window.document.querySelector(`[data-week="${week.tuan}"]`).click();
    for (let index = 0; index < week.steps.length; index++) {
      const step = week.steps[index];
      assert.equal(app.get('current().step'), index);
      // A displayed question may not be silently passed while empty.
      if (step.fields.length) {
        $('next').click();
        assert.equal(app.get('current().step'), index);
      }
      for (const field of step.fields) {
        const elements = [...window.document.querySelectorAll(`[data-field="${field.key}"]`)];
        if (field.kind === 'rating') {
          assert(!elements.some(el => el.checked), 'Rating has no default selection');
          app.input(elements[1]);
        } else {
          app.input(elements[0], field.options ? field.options[0] : raw);
        }
      }
      if (week.tuan === 1 && step.fields.some(field => field.key === 'thu_lam')) {
        $('prev').click();
        $('next').click();
        assert.equal($('f_thu_lam').value, raw, 'Rerender preserves leading newline and spaces');
        app.get('flushDraft()');
        const snapshot = window.localStorage.getItem(storageKey);
        const reloaded = open(snapshot);
        try {
          reloaded.window.document.querySelector('[data-week="1"]').click();
          assert.equal(reloaded.$('f_thu_lam').value, raw, 'Reload resumes raw draft');
        } finally {
          reloaded.dom.window.close();
        }
      }
      if (week.tuan === 4 && step.fields.some(field => field.key === 'san_pham')) {
        const original = app.get('person().history[0].record.san_pham');
        $('oldProduct').selectedIndex = 1;
        $('reuse').click();
        assert.equal($('f_san_pham').value, original);
        app.input($('f_san_pham'), original + '\nBản sửa thứ hai của mình.');
        assert.equal(app.get('person().history[0].record.san_pham'), original,
          'Original is unchanged');
      }
      $('next').click();
    }
    assert.equal(app.get('tab'), 'notebook');
    assert.equal(app.get('person().history.length'), week.tuan);
    assert.equal(app.get('db.queue.length'), week.tuan);
    assert.equal(window.injected, undefined, 'User HTML is displayed as text');
    window.document.querySelector('[data-tab="home"]').click();
  }
  assert.equal(app.get('person().history[0].record.thu_lam'), raw);
  assert.equal(app.get('person().history[3].record.ban_goc_id'), app.get(
    'person().history[0].record.id'));
  const previousId = app.get('person().history[0].record.id');
  window.document.querySelector('[data-week="1"]').click();
  assert.notEqual(app.get('current().id'), previousId, 'Intentional repeat creates a new ID');
  window.document.querySelector('[data-tab="coord"]').click();
  $('coordWeek').value = '3';
  $('coordWeek').dispatchEvent(new window.Event('change'));
  app.input($('sessionForm').elements.dieu_tot, raw);
  window.document.querySelector('[data-tab="home"]').click();
  window.document.querySelector('[data-tab="coord"]').click();
  assert.equal($('coordWeek').value, '3');
  assert.equal($('sessionForm').elements.dieu_tot.value, raw, 'Coordinator draft persists');
  console.log(
    'PASS DOM: four week flows, required fields, explicit rating, draft reload, raw newlines, HTML escaping, week 4 revision, new attempt ID, coordinator draft'
    );
} finally {
  app.dom.window.close();
}
