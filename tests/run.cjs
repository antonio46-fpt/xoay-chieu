// Run serially so failures name the exact layer; Node.js + dev dependency jsdom.
const {
  spawnSync
} = require('node:child_process');
const path = require('node:path');
for (const file of ['test.cjs', 'queue.cjs', 'recovery.cjs', 'ui.cjs', 'scope.cjs', 'fe.cjs', 'preview.cjs', 'backend-review.cjs', 'reauth.cjs', 'logout.cjs', 'accounts.cjs', 'student-ui.cjs', 'password-gate.cjs', 'learning-server.cjs', 'learning-ui.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], {
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
  '\nAll automated checks passed. Real phone layout and a live Google deployment still need verification.'
  );
