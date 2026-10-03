import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const assets = join('dist', 'assets');
const scripts = readdirSync(assets).filter(file => file.endsWith('.js'));
if (!scripts.length) throw new Error('Production bundle has no JavaScript assets');
for (const file of scripts) {
  const source = readFileSync(join(assets, file), 'utf8');
  if (source.includes('LAN CHESS LAB') || source.includes('LAN LAB ↗'))
    throw new Error(`Development-only LAN Lab leaked into production asset: ${file}`);
}
console.log('PASS | Development-only LAN Lab excluded from production JavaScript');
