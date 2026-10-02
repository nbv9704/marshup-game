# MASHUP ARENA — Phase 3

Windows 10/11 x64 offline arcade built with TypeScript, React, PixiJS, Vite and Electron. Phase 3 ships seven playable modules while keeping every unfinished catalog entry behind the verified registry.

## Playable now

- Chess: legal king safety, castling, en passant, promotion, checkmate/stalemate and standard draw conditions.
- Color Clash: original presentation over familiar color-matching mechanics, including action cards and Wild Draw Four challenge.
- Blackjack 21: virtual chips only, soft aces, insurance, double, split and dealer standing on soft 17.
- Neon Reels: deterministic three-reel slots with a bounded 20-spin session and virtual credits.
- Ludo: 2–4-player race rules, safe squares, captures, blocks, exact finish and three-six handling.
- Xiangqi: palace/river restrictions, horse leg, elephant eye, cannon screens, flying generals and check safety.
- Triple Spark: the Phase 2 pipeline trainer with bot and local hotseat modes.

All modules are deterministic, JSON-serializable, validated independently of React/PixiJS, bilingual, auto-saved after valid actions and available offline. Casino credits are entertainment-only and have no cash value.

## Run from source

Install Node.js 22 LTS, then in PowerShell:

```powershell
npm ci
npm run dev
npm test
npm run build
npm run dist
```

`npm test` runs rule/integration tests and strict TypeScript checks. `npm run dist` also creates the Windows installer and portable executable.

## Windows executables

Expected Phase 3 outputs:

```text
release/MashupArena-Setup-0.2.0.exe
release/MashupArena-0.2.0-portable.exe
release/win-unpacked/Mashup Arena.exe
```

The setup executable installs per user and can create a desktop shortcut. The portable executable extracts its application payload to a temporary folder when launched. Builds are unsigned unless an Authenticode certificate is configured, so Windows SmartScreen may show a warning.

To build through GitHub, open **Actions → Mashup Arena Windows x64 → Run workflow**. After the green run, download and unzip the `MashupArena-0.2.0-Windows-x64` artifact.

Each distributable is roughly 80–90 MB because Electron includes a Chromium renderer, Node/Electron runtime, application code, fonts and assets. The workflow ZIP is roughly twice that size because it contains both the installer and portable variants.

## Architecture

- `electron/`: sandboxed desktop lifecycle, narrow preload bridge and atomic offline persistence.
- `src/contracts/`: JSON-safe game/runtime contracts.
- `src/registry/registry.ts`: the only source of Play-enabled modules.
- `src/games/`: isolated deterministic rules, validation, scenes, tutorials and bot helpers.
- `src/app/`: React navigation, generic Phase 3 match screen, settings, profile and autosave.
- `src/graphics/`: PixiJS rendering with DOM fallback.
- `phase1-docs/`: architecture, recipe catalog and release design documents.
- `tests/`: catalog, rules, invalid-action and complete bot-simulation checks.

The next roadmap gate is Phase 4: the Fusion compiler, compatibility validation and the first audited fusion recipe, Chess + Color Clash. Unfinished fusion/catalog features are not exposed as playable UI.

## Keyboard and data

`F11` toggles fullscreen, `/` focuses library search, `Esc` goes back and `Alt+Left` returns home. Settings include Vietnamese/English, mute, high contrast, reduced motion and font scaling. Saves live locally in Electron's user-data folder and can be exported/imported from Settings.

Brand/legal: use original artwork and names for commercial distribution, and complete a rights review for third-party game references.
