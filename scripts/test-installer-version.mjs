import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') throw new Error('Installer-version probe requires Windows');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = createRequire(import.meta.url);
const packageJson = load(path.join(root, 'package.json'));
assert.equal(packageJson.version, '0.3.0-beta.2', 'Update NSIS probe fixtures when the installer version changes');
const { UUID } = load('builder-util-runtime');
const historicalGuid = UUID.v5(packageJson.build.appId, UUID.parse('50e065bc-3134-11e6-9bab-38c9862bdaf3'));
assert.equal(packageJson.build.nsis.guid, historicalGuid, 'NSIS GUID must continue to match 0.1/0.2 installs');

const makeNsis = path.join(process.env.LOCALAPPDATA ?? '', 'electron-builder', 'Cache',
  'nsis', 'nsis-3.0.4.1', 'Bin', 'makensis.exe');
function checkProbe(name, compileArgs) {
  const compile = spawnSync(makeNsis, ['/V1', ...compileArgs],
    { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  if (compile.error) throw compile.error;
  assert.equal(compile.status, 0, `NSIS ${name} compile failed:\n${compile.stdout}\n${compile.stderr}`);
  const marker = path.join(root, 'release', `${name}.txt`);
  if (existsSync(marker)) unlinkSync(marker);
  const probe = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    '$p = Start-Process -FilePath $env:MASHUP_NSIS_PROBE -ArgumentList "/S" -PassThru -WindowStyle Hidden; ' +
    'if (-not $p.WaitForExit(15000)) { throw "NSIS probe timed out" }; exit $p.ExitCode'],
  { cwd: root, encoding: 'utf8', timeout: 20_000, windowsHide: true,
    env: { ...process.env, MASHUP_NSIS_PROBE: path.join(root, 'release', `${name}.exe`) } });
  if (probe.error) throw probe.error;
  assert.equal(probe.status, 0, `NSIS ${name} failed: ${probe.stderr}`);
  return readFileSync(marker, 'utf8').replace(/\r\n/g, '\n').trim();
}

const actual = checkProbe('nsis-version-probe', ['tests\\nsis-version-probe.nsi']);
assert.equal(actual, ['old-stable=2', 'old-beta=2', 'same=0', 'newer-beta=1',
  'stable-vs-beta=1', 'beta-vs-stable=2'].join('\n'));
const fresh = checkProbe('nsis-fresh-probe', ['/DPROBE_FRESH', 'tests\\nsis-upgrade-probe.nsi']);
assert.match(fresh, /^upgrade=0(?:\n|$)/);
console.log('PASS | NSIS GUID stable | upgrade/downgrade ordering | fresh-install path');
