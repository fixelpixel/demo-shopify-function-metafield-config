import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../scripts/fixtures.js';
import { run } from '../extensions/market-discount/src/run.js';

for (const fixture of fixtures()) {
  test(fixture.name, () => {
    const before = JSON.stringify(fixture.input);
    assert.deepEqual(run(fixture.input), fixture.expected);
    assert.equal(JSON.stringify(fixture.input), before);
    assert.deepEqual(run(fixture.input), fixture.expected);
  });
}

test('missing input produces no operations', () => {
  for (const input of [undefined, null, {}, { discount: {} }]) {
    assert.deepEqual(run(input), { operations: [] });
  }
});

test('invalid line quantity and duplicate IDs fail safe', () => {
  const good = fixtures().find((f) => f.name === 'eur-exact-threshold').input;
  for (const quantity of [0, -1, 1.5, null]) {
    const input = structuredClone(good);
    input.cart.lines[0].quantity = quantity;
    assert.deepEqual(run(input), { operations: [] });
  }
  const duplicate = structuredClone(good);
  duplicate.cart.lines.push(structuredClone(duplicate.cart.lines[0]));
  assert.deepEqual(run(duplicate), { operations: [] });
});
