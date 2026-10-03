import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('Windows executables must be packaged on Windows');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builder = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
const args = [builder, '--win', 'nsis', 'portable', '--x64', '--publish', 'never'];
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
