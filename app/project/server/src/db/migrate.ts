import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getDb } from './connection';

export function migrate(): void {
  const ddl = readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');
  getDb().exec(ddl);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  migrate();
  console.log('Migration complete.');
}
