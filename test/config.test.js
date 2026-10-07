import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';
import { validateConfig, cents } from '../extensions/market-discount/src/config.js';

const example = JSON.parse(readFileSync(new URL('../config/rules.example.json', import.meta.url)));
const schema = JSON.parse(readFileSync(new URL('../config/schema.json', import.meta.url)));
const checkSchema = new Ajv({ allErrors: true }).compile(schema);

test('example passes JSON Schema and runtime validator', () => {
  assert.equal(checkSchema(example), true);
  assert.deepEqual(validateConfig(example), { valid: true, errors: [] });
});

const mutations = {
  'unknown version': c => c.version = 2,
  'extra key': c => c.secret = 'demo',
  'missing key': c => delete c.enabled,
  'wrong boolean': c => c.enabled = 'true',
  'empty tag': c => c.excludedTags = [''],
  'duplicate tags': c => c.excludedTags = ['demo', 'demo'],
  'oversized tags': c => c.excludedTags = Array.from({ length: 21 }, (_, i) => `demo-${i}`),
  'non-string tag': c => c.excludedTags = [2],
  'no markets': c => c.markets = [],
  'invalid market': c => c.markets[0].marketId = 'demo-market',
  'unsupported currency': c => c.markets[0].currencyCode = 'JPY',
  'no tiers': c => c.markets[0].tiers = [],
  'float percent': c => c.markets[0].tiers[0].percentage = 10.5,
  'zero percent': c => c.markets[0].tiers[0].percentage = 0,
  'over 100 percent': c => c.markets[0].tiers[0].percentage = 101,
  'negative amount': c => c.markets[0].tiers[0].minimumSubtotal = '-1.00',
  'three decimals': c => c.markets[0].tiers[0].minimumSubtotal = '100.001',
  'numeric amount': c => c.markets[0].tiers[0].minimumSubtotal = 100,
  'leading zero': c => c.markets[0].tiers[0].minimumSubtotal = '0100.00',
  'extra tier key': c => c.markets[0].tiers[0].debug = true
};

for (const [name, mutate] of Object.entries(mutations)) {
  test(`schema and validator reject ${name}`, () => {
    const c = structuredClone(example);
    mutate(c);
    assert.equal(checkSchema(c), false);
    assert.equal(validateConfig(c).valid, false);
  });
}

test('semantic validator rejects duplicates and nonascending tiers beyond schema', () => {
  const changes = [
    c => c.markets.push(structuredClone(c.markets[0])),
    c => c.markets[0].tiers.reverse(),
    c => c.markets[0].tiers[1].minimumSubtotal = '100.00',
    c => c.markets[0].tiers[1].percentage = 5
  ];
  for (const mutate of changes) {
    const c = structuredClone(example);
    mutate(c);
    assert.equal(validateConfig(c).valid, false);
  }
});

test('nonobject configurations and nested invalid values fail validation', () => {
  for (const c of [null, [], 'invalid json', 0, {}, { ...example, markets: [null] }, { ...example, excludedTags: null }]) {
    assert.equal(validateConfig(c).valid, false);
  }
});

test('integer money parser is exact and rejects noncanonical values', () => {
  assert.equal(cents('99.99'), 9999);
  assert.equal(cents('0.00'), 0);
  assert.equal(cents('1.1'), 110);
  assert.equal(cents('100'), 10000);
  assert.equal(cents('100.0000'), 10000);
  for (const value of ['NaN', 'Infinity', '1e2', '1.001', '-1.00', ' 1.00', 100]) {
    assert.equal(cents(value), null);
  }
});

test('merchant validation CLI reports success and rejects malformed JSON', () => {
  const cwd = new URL('../', import.meta.url);
  const good = spawnSync(process.execPath, ['scripts/validate.js'], { cwd, encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr);
  const bad = spawnSync(process.execPath, ['scripts/validate.js', 'LICENSE'], { cwd, encoding: 'utf8' });
  assert.equal(bad.status, 1);
});
