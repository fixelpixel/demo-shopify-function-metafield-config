import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMetafieldPayload } from '../scripts/metafield-payload.js';
import { run } from '../extensions/market-discount/src/run.js';
import { fixtures } from '../scripts/fixtures.js';

const config = JSON.parse(readFileSync(new URL('../config/rules.example.json', import.meta.url)));

test('dry-run builds JSON metafield on the same owner namespace and key as the input', () => {
  const payload = buildMetafieldPayload(config);
  const field = payload.request.variables.metafields[0];
  assert.equal(payload.dryRun, true);
  assert.equal(payload.shop, 'demo-store.example');
  assert.equal(field.ownerId, 'gid://shopify/DiscountAutomaticNode/900901');
  assert.equal(field.namespace, '$app:demo-market-discount');
  assert.equal(field.key, 'rules');
  assert.equal(field.type, 'json');
  assert.deepEqual(JSON.parse(field.value), config);
});

test('rollback keeps rules, disables promotion, and produces no discount', () => {
  const before = JSON.stringify(config);
  const payload = buildMetafieldPayload(config, { rollback: true });
  const restored = JSON.parse(payload.request.variables.metafields[0].value);
  assert.deepEqual(restored, { ...config, enabled: false });
  assert.equal(JSON.stringify(config), before);
  const input = structuredClone(fixtures().find((f) => f.name === 'eur-exact-threshold').input);
  input.discount.metafield.jsonValue = restored;
  assert.deepEqual(run(input), { operations: [] });
});

test('invalid configuration cannot be turned into a save payload', () => {
  assert.throws(() => buildMetafieldPayload({ ...config, excludedTags: [42] }));
});
