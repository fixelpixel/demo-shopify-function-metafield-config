import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSchema, parse, validate, coerceInputValue, getVariableValues, execute } from 'graphql';
import { fixtures } from '../scripts/fixtures.js';

const extension = new URL('../extensions/market-discount/', import.meta.url);
const schema = buildSchema(readFileSync(new URL('schema.graphql', extension), 'utf8'));
const query = parse(readFileSync(new URL('src/run.graphql', extension), 'utf8'));

test('run.graphql is valid against documented API subset', () => {
  assert.deepEqual(validate(schema, query), []);
});

test('metafield excludedTags bind to nullable query variable', () => {
  const definitions = query.definitions[0].variableDefinitions;
  for (const config of [{ excludedTags: null }, { excludedTags: [] }, { excludedTags: ['demo-new-tag'] }, {}]) {
    const values = getVariableValues(schema, definitions, config);
    assert.equal(values.errors, undefined);
  }
});

test('null tag argument fails before Function invocation; defaults allow omitted variables', () => {
  const fixture = fixtures().find((f) => f.name === 'eur-exact-threshold');
  const rootValue = structuredClone(fixture.input);
  rootValue.cart.lines[0].merchandise.product.hasTags = ({ tags }) => tags.map((tag) => ({ tag, hasTag: false }));
  const valid = execute({ schema, document: query, rootValue, variableValues: { excludedTags: ['demo-new-tag'] } });
  assert.equal(valid.errors, undefined);
  assert.deepEqual(valid.data.cart.lines[0].merchandise.product.hasTags.map((t) => t.tag), ['demo-new-tag']);
  const empty = execute({ schema, document: query, rootValue, variableValues: {} });
  assert.equal(empty.errors, undefined);
  const invalid = execute({ schema, document: query, rootValue, variableValues: { excludedTags: null } });
  assert.ok(invalid.errors.length > 0);
});

for (const fixture of fixtures()) {
  test(`output API contract: ${fixture.name}`, () => {
    const errors = [];
    coerceInputValue(fixture.expected, schema.getType('CartLinesDiscountsGenerateRunResult'), (path, value, error) => errors.push(error.message));
    assert.deepEqual(errors, []);
  });
}
