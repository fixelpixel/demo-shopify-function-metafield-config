import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixtures } from '../scripts/fixtures.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const extension = 'extensions/market-discount';
const runner = `${root}node_modules/@shopify/cli/bin/function-runner-9.2.2${process.platform === 'win32' ? '.exe' : ''}`;
const cases = fixtures();

before(() => {
  assert.equal(existsSync(`${root}${extension}/dist/function.wasm`), true, 'Run npm run build first');
  if (!existsSync(runner)) {
    const bootstrap = spawnSync(process.execPath, [
      'node_modules/@shopify/cli/bin/run.js', 'app', 'function', 'run',
      '--path', extension, '--export', 'run', '--json'
    ], { cwd: root, input: JSON.stringify(cases.find((f) => f.name === 'eur-exact-threshold').input), encoding: 'utf8', timeout: 120000 });
    assert.equal(bootstrap.status, 0, bootstrap.stderr);
  }
  assert.equal(existsSync(runner), true, 'Pinned Shopify CLI must provide function-runner 9.2.2');
});

for (const fixture of cases) {
  test(`WASM: ${fixture.name}`, (t) => {
    const result = spawnSync(runner, ['--function', `${extension}/dist/function.wasm`, '--export', 'run', '--json'], {
      cwd: root, input: JSON.stringify(fixture.input), encoding: 'utf8', timeout: 10000
    });
    assert.equal(result.status, 0, result.stderr);
    const execution = JSON.parse(result.stdout);
    assert.equal(execution.success, true, result.stdout);
    assert.deepEqual(execution.output, fixture.expected);
    assert.ok(execution.instructions > 0 && execution.instructions < 11000000);
    t.diagnostic(`instructions=${execution.instructions}`);
  });
}
