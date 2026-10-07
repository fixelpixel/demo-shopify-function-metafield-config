import { readFileSync } from 'node:fs';
import { buildMetafieldPayload } from './metafield-payload.js';

try {
  const args = process.argv.slice(2);
  const file = args.find((arg) => arg !== '--rollback') ?? 'config/rules.example.json';
  const config = JSON.parse(readFileSync(file, 'utf8'));
  console.log(JSON.stringify(buildMetafieldPayload(config, { rollback: args.includes('--rollback') }), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
