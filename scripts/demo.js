import assert from 'node:assert/strict';
import { fixtures } from './fixtures.js';
import { run } from '../extensions/market-discount/src/run.js';

for (const fixture of fixtures()) {
  const output = run(fixture.input);
  assert.deepEqual(output, fixture.expected);
  console.log(`${fixture.name}: ${JSON.stringify(output)}`);
}
