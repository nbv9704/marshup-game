# MASHUP ARENA Online 3D — Phase 1 review package

Status: **design only, awaiting approval**. No account service, network match, 3D game rules, or new executable is implemented by this package.

Open [prototype.html](prototype.html) in a browser. Its controls are clickable and demonstrate Login/Register, Home, Game Select, Room Lobby, first-person Chess room, Focus Board, and Result. It uses only local HTML/CSS/SVG/JavaScript; sample credentials and match events are fictional and never transmitted or saved. The prototype is not a chess game.

For a local preview, double-click `prototype.html`, or run `python -m http.server 8765 --bind 127.0.0.1` from the repository root and open `http://127.0.0.1:8765/design/online-3d/prototype.html`. Use any fictional email/password to explore the simulated online path. “Chơi offline” intentionally disables online room controls and opens only the bot concept. No package install or server setup is needed for this review.

Review in this order:

1. [ARCHITECTURE.md](ARCHITECTURE.md): system diagram, phased migration, monorepo, database, auth, 3D runtime.
2. [PROTOCOL.md](PROTOCOL.md): messages, validation, visibility, synchronization, reconnection.
3. [SECURITY.md](SECURITY.md): threat model and privacy/security gates.
4. [VISUAL_DESIGN.md](VISUAL_DESIGN.md): scene/camera/interaction design and original character/room concepts.
5. [ESTIMATE.md](ESTIMATE.md): effort, hosting costs, risks, and approval gates.

## Phase 1 delivery status

| Item | Status |
| --- | --- |
| Architecture, monorepo plan, protocol, schema, auth and threat model | Designed in the documents above; not implemented |
| First-person room/Focus Board art and interaction, original mascots and four room concepts | Designed; Board Hall shown in HTML/CSS concept only |
| Login → Home → Game Select → Room Lobby → Chess room → Result | Clickable local prototype; fake events, no real rules or network |
| New Windows installer / Docker server | **None in Phase 1**; planned Phase 2 installer and Phase 3 server image |
| Existing playable offline Windows release | `release/ci-artifact-0.2.0/release/MashupArena-Setup-0.2.0.exe` and `MashupArena-0.2.0-portable.exe` in the same folder; these are **offline 2D**, not this online/3D design |

The old installer may be around 85–90 MB because it bundles the Electron/Chromium runtime; Phase 1 adds no packaged weight. Production 3D assets and a server will be measured separately in later phases. Full build/deploy commands belong to the implementation phase that creates each artifact.

## Baseline and boundaries

The existing Windows offline app remains on `main` and the Glossy Cartoon Party visual review remains on `codex/glossy-party-design`. This `codex/online-3d-phase1` branch starts from the visual review branch and adds only design artifacts. Existing source, tests, and build scripts are not migrated here.

The existing project has seven playable offline plugins: Triple Spark, Chess, Color Clash, Blackjack, Slots, Ludo, and Xiangqi. The 38-item catalog contains additional designs, not 38 completed rulesets. The 36 handcrafted Fusion recipes are design specifications; a complete executable online Fusion Engine is future work. Phase 2 must preserve and test the completed rules while extracting them; it must not represent designs as shipped games.

## Approved sequence requested by the owner

`Register/Login (or offline guest) → Loading → Home → Game Select → Room Lobby → 3D Play Room → Result → Rematch / Game Select / Home`

The UI grid is the primary game selector. A walkable 3D selection lobby, shared casino bankroll, spectators, gamepad, and voice are not part of the first online Chess milestone. In shipping builds, unfinished options remain hidden rather than opening placeholders.

## Explicit assumptions to review

- Online account: unique verified email + password, separate display name; username search/friends can be added later. Offline guest does not create a server account.
- First online game: two-player Chess by private invite code. Room data model allows two to six seats; public rooms/Quick Match are later work despite being represented in the long-term protocol.
- Server grace after disconnect: 90 seconds by default, configurable 60–120 seconds; a ranked/fair Chess room pauses the turn timer, while future casual modes may opt into bot takeover before match start. No bot silently changes a ranked Chess position.
- Chess board room: small Board Hall; two players move freely and can press F to focus the board. A seated view is optional. Both modes operate on the same server match.
- Password reset: one-use email link via a real mail provider in production and a log-free local mock mailer in development.
- Phase 1 prototype uses sample text and art as a visual demonstration only. It has no actual authentication, WebSocket, persistence, or rules validation.

These assumptions minimize scope while keeping the requested full architecture extensible. Any change to them should be settled before Phase 2.
