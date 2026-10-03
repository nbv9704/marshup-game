# MASHUP ARENA — Chess 3D / LAN beta

Windows 10/11 x64 offline-first arcade built with TypeScript, React, PixiJS, Three.js, Vite and Electron. Seven 2D games remain playable. Chess additionally has a procedural first-person 3D room with Focus Board, a solo bot, local resume, and optional host-authoritative LAN beta. This is **not** a final release: two-machine/Radmin testing, rematch, timers and further polish are still required.

## Playable now

- Chess: legal king safety, castling, en passant, promotion, checkmate/stalemate and standard draw conditions.
- Color Clash: original presentation over familiar color-matching mechanics, including action cards and Wild Draw Four challenge.
- Blackjack 21: virtual chips only, soft aces, insurance, double, split and dealer standing on soft 17.
- Neon Reels: deterministic three-reel slots with a bounded 20-spin session and virtual credits.
- Ludo: 2–4-player race rules, safe squares, captures, blocks, exact finish and three-six handling.
- Xiangqi: palace/river restrictions, horse leg, elephant eye, cannon screens, flying generals and check safety.
- Triple Spark: the Phase 2 pipeline trainer with bot and local hotseat modes.
- Chess 3D beta: enter from the Chess catalog card; walk with WASD, click to look, press F for Focus Board, pick a piece and highlighted destination. Solo progress saves locally. Open/Join LAN uses an explicit adapter or IPv4:port; discovery is optional and reconnection holds a dropped guest seat for 90 seconds.

The original seven modules are deterministic, JSON-serializable, validated independently of React/PixiJS, bilingual, auto-saved after valid actions and available offline. The Chess 3D solo mode uses the same validated Chess rules and stores a full local snapshot. LAN sends only the public Chess projection and must be used on a trusted physical or virtual LAN; traffic is not encrypted. Casino credits are entertainment-only and have no cash value.

## Run from source

Install Node.js 22 LTS, then in PowerShell:

```powershell
npm ci
npm run dev
npm test
npm run build
npm run dist
```

`npm test` runs rule/integration tests and strict TypeScript checks. `npm run dist` also creates the Windows installer and portable executable. The Windows app executable is branded during packaging without requiring Developer Mode or symlink permission. The binaries remain unsigned; code signing needs a separate certificate.

## Windows executables

Expected beta outputs after `npm run dist`:

```text
release/MashupArena-Setup-0.3.0-beta.3.exe
release/MashupArena-0.3.0-beta.3-portable.exe
release/win-unpacked/Mashup Arena.exe
```

The setup executable detects an older NSIS installation by its pinned app GUID, uninstall entry, version and existing executable. It keeps the previous per-user/per-machine mode and installation folder, then presents **Cập nhật → installation progress → Cập nhật hoàn tất** instead of the first-install choices. The old uninstaller is called with app-data preservation; matching/newer versions are not overwritten. A fresh install still shows the normal setup choices. Portable copies do not register an installation and cannot be detected for this update flow. Builds are unsigned unless an Authenticode certificate is configured, so Windows SmartScreen may show a warning.

To build through GitHub, open **Actions → Mashup Arena Windows x64 → Run workflow**. After the green run, download and unzip the `MashupArena-Windows-x64` artifact. Do not call this beta LAN-certified until two real machines have completed the test matrix in `design/online-3d/PROTOCOL.md`.

Each distributable is roughly 80–90 MB because Electron includes a Chromium renderer, Node/Electron runtime, application code, fonts and assets. The workflow ZIP is roughly twice that size because it contains both the installer and portable variants.

## Architecture

- `electron/`: sandboxed desktop lifecycle, narrow preload bridge, LAN socket ownership and atomic offline persistence.
- `src/contracts/`: JSON-safe game/runtime contracts.
- `src/registry/registry.ts`: the only source of Play-enabled modules.
- `src/games/`: isolated deterministic rules, validation, scenes, tutorials and bot helpers.
- `src/app/`: React navigation, generic Phase 3 match screen, settings, profile and autosave.
- `src/graphics/`: PixiJS rendering with DOM fallback, plus the procedural Three.js Chess room.
- `src/lan/`: pure Chess host authority, bounded TCP transport and best-effort UDP discovery.
- `phase1-docs/`: architecture, recipe catalog and release design documents.
- `tests/`: catalog, rules, invalid-action and complete bot-simulation checks.

The next gate is to finish and certify the Chess 3D LAN slice on two real machines: direct IP, discovery fallback, reconnect, host/guest lifecycle, rematch, accessibility and performance. Only then should more 3D games and the Fusion compiler expand. Unfinished fusion/catalog features are not exposed as playable UI.

## Keyboard and data

`F11` toggles fullscreen, `/` focuses library search, and `Alt+Left` returns home. Outside Chess 3D, `Esc` goes back; inside Chess 3D it releases the cursor and opens pause. Settings include Vietnamese/English, mute, high contrast, reduced motion and font scaling. Saves live locally in Electron's user-data folder and can be exported/imported from Settings.

Brand/legal: use original artwork and names for commercial distribution, and complete a rights review for third-party game references.
