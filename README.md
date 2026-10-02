# MASHUP ARENA — Phase 2 (Windows Desktop Foundation)

**Status: source implementation + dependency-free core checks complete.** The Windows NSIS installer and portable executable MUST be built by the included GitHub Actions Windows runner (or on a Windows development PC). They are **NOT included in this source archive**: this isolated authoring environment cannot access npm's package registry and cannot run or visually certify an Electron build on Windows. Do not mistake the ZIP for a prebuilt installer.

## What you can actually use in Phase 2

- Electron desktop host with explicit preload-only bridge, CSP, single-instance protection, native icon + splash, F11, window bounds recovery, graceful queued writes, logged renderer errors, app version, backup import/export, atomic JSON persistence with previous-file backup.
- Vite + React lobby, 38-entry **design catalog** with live search/category filters and working favorites, bilingual profile with editable avatar/name, leveling, virtual-chip score, persisted settings (sound, language, accessibility, bot difficulty), full keyboard shortcuts.
- PixiJS 8 board renderer and ambient lobby particles, DOM fallback if WebGL is unavailable. Original self-contained oscillator sound effects and locally compiled open-licensed fonts through `@fontsource` imports (no CDN at runtime).
- **Triple Spark training game**, an original fully playable 3×3 three-in-a-row trainer with hotseat and Easy/Normal/Hard bot worker, rule validation, hint/undo, localization, outcome and XP, per-move auto-save and resume. This is a *pipeline smoke game* and not one of the 38 advertised originals; the first six requested originals are scheduled for Phase 3.
- Strict TypeScript game plugin contract carried forward from Phase 1; lazy-loadable verified registry. Phase 1's 36 handcrafted fusion recipe *designs* remain documented; the Fusion Engine is not implemented until Phase 4.
- `npm run dev`, `npm test`, `npm run build`, `npm run dist`, Windows release + packaged-renderer smoke-test workflow.

Visible game cards are labeled **design catalog**; they provide real information and favorite actions but have **no fake Play buttons**. The current Play button launches only the complete Triple Spark trainer. There is no live backend, no real money, no external runtime service and no dormant broken Fusion/Shop navigation.

## Windows 10/11 x64: build and run

1. Install [Node.js 22 LTS](https://nodejs.org/) and Git on Windows, then open PowerShell.
2. Extract the archive and `cd` into `mashup-arena-phase2`.
3. Run:

```powershell
node --version
npm install --no-audit --no-fund  # first network-connected install also creates package-lock.json
npm run dev                      # React/Vite hot reload + Electron window
npm test                         # Vitest + strict UI/Electron TypeScript check
npm run build                    # generates dist/ and dist-electron/
npm run dist                     # tests/builds, NSIS + portable x64 EXEs in release/
```

Renderer libraries are build-time devDependencies because Vite embeds them in the output, reducing unnecessary packaged Node modules. The build expects network connectivity for the *initial dependency install*. After that, the packaged application plays, persists and renders **offline**. Fonts are compiled into the local Vite bundle; no runtime CDN calls. For a reproducible release, commit the generated `package-lock.json` and use `npm ci` subsequently.

Expected outputs (these paths do not exist until a successful Windows build):

```
release/MashupArena-Setup-0.1.0.exe
release/MashupArena-0.1.0-portable.exe
release/win-unpacked/Mashup Arena.exe
```

The NSIS installer is per-user by default. The portable EXE extracts itself at runtime; it is a single-file distribution, not a single Windows process image. These builds are **unsigned** without your Authenticode certificate; Windows SmartScreen may warn. The actual build + startup smoke test in `.github/workflows/windows-release.yml` is the verification gate.

## GitHub Actions: create and download the actual Windows EXEs

1. Create a **private GitHub repository** and upload the *contents* of this folder to the repository root. Preserve `.github/workflows/windows-release.yml`.
2. Open the repo's **Actions → Mashup Arena Windows x64 → Run workflow**.
3. Wait for that run's build, TypeScript tests, packaged-app startup smoke test and portable startup smoke test. If any fails, the job fails; it must not be treated as a valid release.
4. On a green run, download the **MashupArena-0.1.0-Windows-x64** workflow artifact. Unzip to obtain the exact two named `.exe` files plus the generated lockfile.
5. Test installing and launching the setup EXE on your actual Windows computer as a final hardware-specific manual check; the CI boot marker is not full gameplay QA.

CLI alternative after installing GitHub CLI (`gh`): `gh workflow run windows-release.yml`, then `gh run list`, `gh run download <RUN_ID>`.

## Verification in the restricted authoring environment

`npm run test:core-offline` uses the existing global `tsc` and built-in Node assertion. It compiles the real shared game/plugin code and verifies the 38 unique design entries, action validation and invalid-action rejection, state recovery and 240 complete deterministic bot-vs-bot matches including hard-AI non-loss fixtures. This is a **partial offline check**, not a substitute for `npm test`, renderer QA, Electron packaging or Windows launch verification.

The full dependency-based checks and Windows packaging cannot be claimed to have passed here because registry.npmjs.org is unreachable (`EAI_AGAIN`). The CI workflow is executable, not a record of a completed remote run.

## Important architecture details

- `electron/main.ts`: sandboxed window, popup/navigation blocking, same-app IPC sender checks, restrictive CSP and lifecycle.
- `electron/preload.ts`: exposes a small typed `window.arena` surface via `contextBridge`; raw Node and raw IPC are never available in the renderer.
- `electron/store.ts` + `assets/default-save.json`: versioned JSON under Electron `app.getPath('userData')`, serialized atomic writes, `.backup.json`, separate `window.json` and `errors.log`.
- `src/contracts`: Phase 1 `IGameModule`, JSON-compatible events, storage and design-safe effect records.
- `src/registry/registry.ts`: visible playable games are declared exclusively through this registry. The planned catalog cannot create an unfinished Play route.
- `src/games/triple-spark`: deterministic headless original training rules wrapped by `IGameModule` adapter and Pixi board adapter.
- `src/workers/tripleBot.ts`: per-game isolated AI on a browser Web Worker.
- `src/app`: React UX and local state; profile saves enqueue in order, game progress saves on every valid move.
- `phase1-docs`: complete original architecture, recipe specifications, ruleset matrix, release plan and visual language documentation.

## Controls

Click/tap to play. In a match, use keys `1`–`9` to place, `H` for a hint, `Ctrl+Z` to undo. App: `F11` toggle fullscreen; `/` focus search; `Esc` back; `Alt+Left` back. Muting/high contrast/large text and reduced-motion are in Settings. Favorites and profile persist after restarting. In an unbundled browser without the native bridge, `localStorage` is the persistence fallback.

## Known Phase 2 limits and Phase 3 gate

Phase 3 will implement the six **requested** original game plugins in priority order: Chess, Color Clash (standard UNO mechanics under original presentation), Blackjack, Slots, Ludo and Xiangqi, including legal-rule fixtures, tutorials and completed bot games. Their catalog cards in Phase 2 are planning entries, not playable modules. Phase 4 adds the actual Fusion compiler and audited handcrafted recipe activation, starting with Chess + UNO. Phases 5–6 expand the catalog/fusion/bots and perform final sound, gameplay and packaged Windows 10/11 QA. No numerical 60 FPS or installer-size claim is made until measured on actual Windows hardware.

**Brand/legal:** use only original symbols/artwork for the arcade. For third-party branded games, perform rights review before commercial sale. Chips have no monetary value.
