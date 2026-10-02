# Build, packaging, and verification plan

## Phase 1 deliverable (this archive)
Run on Windows PowerShell (or macOS/Linux for architecture inspection):

```powershell
cd mashup-arena-phase1
node --version             # recommended Node 22 LTS or another active compatible LTS
npm install
npm test                   # strict TypeScript + game/recipe/RNG architecture audit
npm run build              # JS + .d.ts design contracts in dist/contracts
# Open preview/index.html in any modern browser to inspect static wireframes
```

The Phase 1 zip is **not** the playable Electron app, so `npm run dist` intentionally fails with a clear Phase 1 message rather than falsely succeeding without an EXE. The first packaged Windows executable belongs to Phase 2, as in the requested roadmap. A production lockfile will be generated and committed in Phase 2; use `npm ci` in Windows CI after that point.

## Phase 2 final package versions and wiring

Use Vite + React + TypeScript with a separate Electron main/preload compiler or electron-vite integration, PixiJS 8 through standalone canvas stage, `electron-builder` v26 stable, and a `preload.ts` with a narrow bridge. Pin exact releases in `package-lock.json` rather than floating latest versions during build. Choose explicit build config (template below) and verify actual versions for compatibility at implementation time.

Proposed `package.json` script contract (becomes executable when Phase 2 code is present):

```json
{
  "scripts": {
    "dev": "concurrently -k \"vite --host 127.0.0.1\" \"npm:dev:electron\"",
    "dev:electron": "wait-on tcp:127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .",
    "test": "vitest run && npm run typecheck",
    "typecheck": "tsc --noEmit && tsc -p electron/tsconfig.json --noEmit",
    "build": "vite build && tsc -p electron/tsconfig.build.json",
    "dist": "npm run test && npm run build && electron-builder --win nsis portable --x64"
  }
}
```

Do not copy these future scripts over the Phase 1 package: they require the Phase 2 source and dependencies first. CI must execute all verification steps on Windows. For cross-platform local `npm run dev`, shell helpers `concurrently`, `wait-on`, `cross-env` are devDependencies.

Proposed `electron-builder.yml` (future app root):

```yaml
appId: games.mashuparena.desktop
productName: Mashup Arena
asar: true
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - dist-electron/**/*
  - package.json
extraResources:
  - from: assets
    to: assets
win:
  icon: build/icon.ico
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]
nsis:
  artifactName: MashupArena-Setup-${version}.${ext}
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
portable:
  artifactName: MashupArena-${version}-portable.${ext}
```

A future Electron `main.ts` must implement: single instance via `app.requestSingleInstanceLock()`, `app.setAppUserModelId(...)`, `app.getPath('userData')` persistence, secure sandboxed BrowserWindow, custom CSP, preload absolute path, `F11`/window shortcuts through `before-input-event`, prevent `window.open`, disallow external `webContents` navigation, splash on boot, window restore/clamping, bounded quit save. IPC validation is mandatory.

### Executable location and signing

Expected **Phase 2** outputs:

```text
release/MashupArena-Setup-0.1.0.exe
release/MashupArena-0.1.0-portable.exe
release/win-unpacked/Mashup Arena.exe  # only when preserved by builder/CI
```

Output naming is case- and version-sensitive, with the two user-requested names set explicitly by target. If Windows SmartScreen warns on an unsigned program, do not claim it is signed or bypass warnings; optional Authenticode signing requires a publisher certificate and release procedure. Offline use is tested *after* install; packages are locally bundled NSIS and portable, not `nsis-web`.

## Real Windows CI

Copy `ci/windows-release.workflow.yml` to `.github/workflows/windows-release.yml` **in the Phase 2 app repository**, after Phase 2 npm scripts, build configuration and committed `package-lock.json` exist. CI builds/test/copies both EXEs, launches the unpacked packaged Electron binary with `--smoke-test`, checks a generated marker, and uploads artifact files. Boot's marker must only be written when renderer has initialized the lobby and save migration/loading passed. A boot-marker check is narrower than manual 60-FPS/gameplay QA and cannot replace it.

Check bootstrap smoke-test pseudocode that Phase 2 will implement:

```ts
// Electron main process, when --smoke-test is present:
// create a hidden window; after typed IPC "renderer-ready" confirms
// React mount, local save load and Pixi initialization, write the marker
// to path from MASHUP_SMOKE_MARKER, then app.quit() with exit code 0.
// On failure set exitCode=1, write an error log, and quit.
// No unlimited timeout or fake marker at process spawn.
```

PowerShell local (once Phase 2 exists):

```powershell
npm ci
npm test
npm run build
npm run dist
Get-ChildItem .\release\MashupArena*.exe
$env:MASHUP_SMOKE_MARKER = "$env:TEMP\mashup-renderer-ready.txt"
Remove-Item $env:MASHUP_SMOKE_MARKER -ErrorAction SilentlyContinue
$p = Start-Process -FilePath ".\release\win-unpacked\Mashup Arena.exe" -ArgumentList "--smoke-test" -PassThru
if (-not $p.WaitForExit(45000)) { Stop-Process -Id $p.Id -Force; throw "Packaged application launch timed out" }
if ($p.ExitCode -ne 0 -or -not (Test-Path $env:MASHUP_SMOKE_MARKER)) { throw "Packaged app boot/renderer check failed" }
```

After CI, do manual Windows 10 and 11 x64 acceptance (window restoration after monitor unplug, touch/mouse/focus, F11, local autosave, clean startup, installed app and portable app). For production `npm run dist`, scripted tests, build and electron-builder must all succeed or exit nonzero, leaving no partially labelled release.

References consulted for this packaging design: Electron context isolation/security documentation and electron-builder v26 NSIS/portable target docs. URLs are also provided in `REFERENCES.md`.
