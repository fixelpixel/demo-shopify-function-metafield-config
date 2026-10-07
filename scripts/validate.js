import { readFileSync } from 'node:fs';
import { validateConfig } from '../extensions/market-discount/src/config.js';

try {
  const file = process.argv[2] ?? 'config/rules.example.json';
  const result = validateConfig(JSON.parse(readFileSync(file, 'utf8')));
  if (!result.valid) throw new Error(result.errors.join('\n'));
  console.log('Configuration valid');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
