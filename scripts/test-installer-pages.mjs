import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('Installer page probe requires Windows');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(root, 'release');
const makeNsis = path.join(process.env.LOCALAPPDATA ?? '', 'electron-builder',
  'Cache', 'nsis', 'nsis-3.0.4.1', 'Bin', 'makensis.exe');

function runProbe(mode) {
  const name = `nsis-directory-${mode}`;
  const args = ['/V1'];
  if (mode === 'fresh') args.push('/DPROBE_FRESH');
  args.push('tests\\nsis-directory-page-probe.nsi');
  const compile = spawnSync(makeNsis, args,
    { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  if (compile.error) throw compile.error;
  assert.equal(compile.status, 0, `NSIS ${name} compile failed:\n${compile.stdout}\n${compile.stderr}`);

  const before = path.join(release, `${name}-before.txt`);
  const after = path.join(release, `${name}-after.txt`);
  for (const marker of [before, after]) if (existsSync(marker)) unlinkSync(marker);
  const executable = path.join(release, `${name}-probe.exe`);
  const run = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    '$p = Start-Process -FilePath $env:MASHUP_PAGE_PROBE -ArgumentList "/S" ' +
    '-PassThru -WindowStyle Hidden; ' +
    'if (-not $p.WaitForExit(15000)) { Stop-Process -Id $p.Id -Force; throw "Probe timed out" }; ' +
    'exit $p.ExitCode'],
  { cwd: root, encoding: 'utf8', timeout: 25_000, windowsHide: true,
    env: { ...process.env, MASHUP_PAGE_PROBE: executable } });
  if (run.error) throw run.error;
  assert(existsSync(before), `${name} never reached the directory callback`);
  assert.equal(existsSync(after), mode === 'fresh',
    `${name} ${mode === 'fresh' ? 'blocked the fresh-install location page' : 'allowed the upgrade location page'}`);
  assert.equal(run.status, mode === 'fresh' ? 0 : 2,
    `${name} returned an unexpected status:\n${run.stdout}\n${run.stderr}`);
}

runProbe('upgrade');
runProbe('fresh');
console.log('PASS | upgrade skips location page | fresh install keeps location page');
