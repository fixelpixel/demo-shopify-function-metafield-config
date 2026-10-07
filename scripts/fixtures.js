import { readFileSync, readdirSync } from 'node:fs';

export function fixtures() {
  const folder = new URL('../fixtures/', import.meta.url);
  return readdirSync(folder).filter((name) => name.endsWith('.json')).sort()
    .map((name) => JSON.parse(readFileSync(new URL(name, folder), 'utf8')));
}
