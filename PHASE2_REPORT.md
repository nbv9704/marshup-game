# Phase 2 acceptance / known limitations

## Verified locally on 2026-10-03

- Created TypeScript Electron host, preload bridge, secure content settings, JSON store, app icon + splash, and explicit NSIS/portable electron-builder configuration.
- Created React bilingual lobby/catalog/profile/settings and a playable deterministic Triple Spark trainer (hotseat or worker bot); PixiJS board module and a no-WebGL DOM fallback are implemented in source.
- Real dependency-free TypeScript compilation of the shared game module and contracts completed; `npm run test:core-offline` passed catalog uniqueness, plugin validation/rejection, invalid state detection, 240 complete bot-vs-bot matches and additional hard-bot fixtures.
- Static parse of all 24+ TypeScript/TSX source files completed. Additional semantic dry checks used temporary third-party API stubs; these **do not count as a real full dependency-based TypeScript check**.
- Standalone HTML review was executed in a Node VM: lobby, 38 catalog cards, category filtering, favorite persistence and a complete bot response after a player move. This HTML review is separate from the production React/PixiJS application.
- The CI workflow and installer output names are configured, but the workflow has not yet been executed in an actual Windows runner by this authoring session.

## NOT verified / blocked

- Initial npm registry access failed with `EAI_AGAIN`. A direct `npm run dist` attempt failed at the first `vitest` command because dependencies are unavailable (`vitest: not found`, exit 127).
- No local Electron dependencies, Electron production bundle, Windows NSIS installer or portable executable were generated in this environment.
- No real Windows packaged-app launch or gameplay QA has passed yet. The GitHub Actions workflow runs real `npm test`, production compilation and `electron-builder`, verifies BOTH requested `.exe` names, and launches the unpacked app and portable EXE with a renderer-ready startup marker. Treat it as a prospective gate, not proof that it already ran.

## Phase 2 release paths, after a successful Windows CI run

`release/MashupArena-Setup-0.1.0.exe`

`release/MashupArena-0.1.0-portable.exe`

The downloadable artifact in GitHub Actions is `MashupArena-0.1.0-Windows-x64`. A first successful `npm install` creates a transitive lockfile; commit it for reproducible future builds. See README.md.

## Phase 3 remains

The requested first six independent original game modules: Chess (including castling, en passant, promotion), UNO-rule Color Clash, Blackjack, Slots, Ludo, Xiangqi, associated tutorials, completed bot gameplay and standard-rule tests; plus a rebuilt and Windows-tested pair of EXEs.
