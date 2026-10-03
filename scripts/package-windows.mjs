import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('Windows executables must be packaged on Windows');

// electron-builder's optional icon/metadata tool includes macOS symlinks in its archive.
// Windows machines without Developer Mode cannot extract those links; skip only that
// executable-editing step there, while keeping normal branded builds on CI/dev boxes.
const temp = mkdtempSync(path.join(tmpdir(), 'mashup-symlink-check-'));
const target = path.join(temp, 'target');
const link = path.join(temp, 'link');
let canCreateSymlink = false;
try {
  writeFileSync(target, 'ok');
  symlinkSync(target, link, 'file');
  canCreateSymlink = true;
} catch (error) {
  if (error?.code !== 'EPERM' && error?.code !== 'EACCES') throw error;
} finally {
  if (existsSync(link)) unlinkSync(link);
  if (existsSync(target)) unlinkSync(target);
  rmdirSync(temp);
}

if (!canCreateSymlink) console.warn('Windows symlink privilege unavailable: packaging without executable icon/metadata editing.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builder = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
const args = [builder, '--win', 'nsis', 'portable', '--x64', '--publish', 'never'];
if (!canCreateSymlink) args.push('--config.win.signAndEditExecutable=false');
const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
