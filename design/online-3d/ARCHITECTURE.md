# Architecture and data design

## Design principles

1. **One authoritative rules implementation.** A pure TypeScript rules package is used by the server and by an embedded offline/bot session. The client may use rules to preview legal moves, but its opinion never commits an online move.
2. **One private state, several safe projections.** The server owns RNG seeds, deck order, hidden hands, and full Fusion state. It emits a projection for each player, plus a more restrictive spectator projection. Never serialize a full game snapshot to a network client merely because it is JSON-safe.
3. **3D is presentation.** Camera, collision, animation, and avatars are separate from turn rules. A player can walk while a match is paused without altering a Chess board.
4. **Offline preservation.** `main` keeps the currently working offline installer. This branch does not refactor it in Phase 1. Phase 2 migration is incremental with parity tests and an offline-bot pathway.
5. **Small vertical slice first.** Two online Chess clients and one room are the first playable online deliverable. The other catalog items and social/meta features remain hidden until implemented.

## System diagram

```text
  Electron client A                              Electron client B
  ┌─────────────────────────────┐                ┌─────────────────────────────┐
  │ React: auth/menu/HUD         │                │ React: auth/menu/HUD         │
  │ Three.js: FPS room/chess view│                │ Three.js: FPS room/chess view│
  │ preload: tiny OS bridge      │                │ preload: tiny OS bridge      │
  │ local bot session (offline)  │                │ local bot session (offline)  │
  └─────────────┬───────────────┘                └──────────────┬──────────────┘
                │ HTTPS REST + WSS                               │
                └──────────────────┬──────────────────────────────┘
                                   ▼
                         ┌───────────────────────┐
                         │ API + WebSocket gateway│
                         │ auth, rate limits,      │
                         │ protocol/version gate   │
                         └──────────┬────────────┘
                                    ▼
                         ┌───────────────────────┐
                         │ Authoritative room host│
                         │ intents → rules → event│
                         │ per-viewer projections  │
                         │ avatar pose relay       │
                         └──────┬─────────┬──────┘
                                │         │
                         ┌──────▼────┐ ┌──▼───────────────────┐
                         │ Postgres  │ │ Rules + Fusion       │
                         │ accounts, │ │ pure deterministic   │
                         │ sessions, │ │ TypeScript           │
                         │ matches   │ └──────────────────────┘
                         └───────────┘
```

The room host runs on the server process in the first deployment. A later multi-instance deployment needs a shared room directory and sticky/forwarded WebSockets; that is a scaling migration, not a v1 prerequisite.

## Proposed npm-workspaces layout (Phase 2 target)

```text
apps/
  client/                 Electron main/preload + Vite/React + plain Three.js
    src/3d/core/          renderer, scene lifetime, camera, input, raycast
    src/3d/rooms/         Board Hall first; other themes later
    src/3d/views/         chess view first; per-game views later
    src/ui/               auth, home, game select, room lobby, HUD
  server/                 Node HTTP REST + ws room host; Docker image
    src/auth/             password, sessions, reset, rate limits
    src/rooms/            lobby, match FSM, timers, reconnect
    src/persistence/      PostgreSQL in production, SQLite for local dev
packages/
  rules/                  core contracts, seeded RNG, completed game modules,
                          bot policies, executable Fusion when ready
  protocol/               versioned Zod schemas and discriminated messages
  design/                 tokens, copy, UI components, original asset metadata
tests/
  integration/            two simulated clients, hidden-info and reconnect tests
  load/                   reproducible room-load script and measured report
deploy/
  compose.yaml            server + local PostgreSQL / optional mail mock
  Dockerfile.server
```

The existing `src/games`, `src/core`, and `src/contracts` move to `packages/rules` in small batches. Render-only `scene()` adapters and React/Pixi files stay in the client. The current `PlayerId` union is p1–p4; it must be extended to p5/p6 before a six-seat game, without implying Chess has six players. Import-boundary checks must prohibit DOM, Electron, Node filesystem, wall-clock, and nondeterministic `Math.random` inside rules.

### Why plain Three.js and `ws`

Plain Three.js inside a single React-owned canvas is selected for the first-person loop: camera/input/raycast and network interpolation have explicit lifetimes and need not trigger React renders every frame. React remains for accessible menus and HUD. `react-three-fiber` can be reconsidered if scene authoring volume later outweighs loop control. Three.js provides documented [PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html) and [Raycaster](https://threejs.org/docs/pages/Raycaster.html).

`ws` is selected for a small, auditable, versioned intent/event protocol. Its official examples cover HTTP-server upgrades and ping/pong [heartbeats](https://github.com/websockets/ws/blob/master/README.md). The team must implement room lifecycle, reconnect, and per-viewer projection itself; that is real work included in the estimate. No positional messages are trusted as game actions.

## Domain boundaries

| Boundary | Source of truth | Client receives |
| --- | --- | --- |
| Account/profile | Auth/database service | Own profile, short-lived access token, server-issued entitlements |
| Room lobby | Room host | Public room settings, seats, ready states, invite code only to members |
| Chess/Fusion match | Server `packages/rules` | Own/public projection, legal affordance hints, confirmed events |
| Hidden card/casino state | Server only | Redacted per-viewer hand, public discards/outcomes; never seeds or deck order |
| Avatar pose | Server-bounded relay | Interpolated poses of visible peers, ephemeral |
| Audio/camera/particles | Local client | Cosmetic; cannot determine a result |
| Offline bot | Embedded local session | Local state only; cannot write online ranks/rewards |

## Authentication and startup

1. A minimal packaged local UI boots and checks the configured server origin. Login/Register and **Play vs Bot (Offline)** are shown. No remote HTML or JavaScript is loaded in Electron.
2. Register takes verified email, display name and password. The server validates and hashes password with Argon2id. Email verification and reset use single-use expiring links; responses do not reveal whether an email exists.
3. Login returns a short access token (design target 10–15 minutes) plus a rotating opaque refresh token. The renderer holds access token in memory. Electron main encrypts the refresh token via `safeStorage` and exposes only narrowly scoped `storeRefreshToken` / `getSession` / `clearSession` IPC; no generic filesystem or token-read bridge.
4. Post-login Loading fetches profile and version manifest, preloads common UI assets, then shows Home. Entering a 3D room lazy-loads its models/textures and shows a second progress indicator.
5. Logout revokes the refresh family server-side and deletes local encrypted material. Offline guest uses a separate local profile namespace and cannot join online rooms.

On Windows, Electron `safeStorage` uses DPAPI, protecting against other OS accounts but not necessarily hostile software running as the same Windows user; this is defense in depth, not a password vault guarantee. See [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage). Production uses HTTPS/WSS and a restrictive CSP. Electron's [security checklist](https://www.electronjs.org/docs/latest/tutorial/security) is the release gate.

## Logical database schema

PostgreSQL is production source of truth; SQLite is a local-development adapter with the same logical constraints and migration tests. Identifiers are UUID strings; timestamps UTC; passwords and tokens never plaintext. Room pose streams are not stored. All queries parameterized.

| Table | Key fields and constraints | Purpose |
| --- | --- | --- |
| `accounts` | `id PK`, `email_normalized UNIQUE`, `password_hash`, `email_verified_at`, `created_at`, `deleted_at` | Login identity; deleted accounts revoked and anonymized per policy |
| `profiles` | `account_id PK/FK`, `display_name`, `avatar_id`, `locale`, `chips CHECK >=0`, `xp CHECK >=0`, `level`, `settings_json`, `updated_at` | Public/private player data |
| `refresh_sessions` | `id PK`, `account_id FK`, `family_id`, `token_hash UNIQUE`, `issued_at`, `expires_at`, `rotated_at`, `revoked_at`, `device_label` | Rotating refresh with reuse detection; indexed by account/family |
| `password_resets` | `id PK`, `account_id FK`, `token_hash UNIQUE`, `expires_at`, `used_at` | One-use recovery, short TTL |
| `rooms` | `id PK`, `invite_code_hash UNIQUE`, `host_account_id FK`, `game_id`, `ruleset_version`, `visibility`, `max_players CHECK 2..6`, `phase`, `created_at`, `closed_at` | Durable room identity; live seat/pose state in memory |
| `room_members` | `(room_id,account_id) PK`, `seat_no UNIQUE per room`, `role`, `ready`, `joined_at`, `left_at` | Seats, host migration, reconnection eligibility |
| `matches` | `id PK`, `room_id FK`, `game_id`, `ruleset_version`, `fusion_recipe_id/version nullable`, `status`, `snapshot_ciphertext`, `snapshot_revision`, `started_at`, `ended_at` | Recovery; private snapshot encrypted at rest and never networked wholesale |
| `match_events` | `(match_id,seq) PK`, `actor_account_id`, `intent_id UNIQUE per match/actor`, `event_type`, `event_json`, `created_at` | Ordered audit/replay; secret event payloads protected/redacted in API |
| `match_participants` | `(match_id,account_id) PK`, `seat_no`, `result`, `xp_delta`, `chips_delta` | Idempotent reward finalization |
| `reports` | `id PK`, `reporter_id FK`, `target_id FK`, `room_id nullable`, `reason`, `text`, `status`, `created_at` | Server-local moderation queue with retention controls |
| `account_blocks` | `(owner_id,blocked_id) PK`, `created_at` | Chat/room-list suppression |
| `friends` | `(requester_id,addressee_id) PK`, `status`, `updated_at` | Phase 6 social feature; no Phase 3 UI until implemented |
| `cosmetic_ownership` | `(account_id,item_id) PK`, `acquired_at` | Phase 6 virtual-only items |
| `fusion_balance_cache` | `(recipe_id,recipe_version,simulator_version) PK`, `report_json`, `created_at` | Reuse validated server simulations; not client authority |

Use separate restricted database credentials for migrations and runtime. `match_events` and reports have retention windows; account export/deletion operate by account id and remove or anonymize linked personal data without corrupting aggregate game statistics. Exact legal text is a product/legal review item, not assumed here.

## 3D room and interaction lifecycle

The client owns one renderer/canvas; a scene manager swaps category rooms and game view modules. A room kit contains static low-cost geometry, baked lightmaps where possible, collision bounds, seat transforms, interaction anchors, and lazy-loaded GLB/texture bundles. The Chess view mounts a board/pieces/trays and subscribes to public confirmed match events. On leaving, dispose geometry/materials/textures/listeners to prevent GPU leaks.

Camera modes: `free` (WASD + pointer lock), `focus` (smooth transition to readable elevated board view), `seated` (optional), `menu` (cursor released). Press F to toggle focus; Esc releases pointer lock and opens pause; E/click raycasts table/seat/pieces. Board focus does not change the rules or hide the other avatar. Movement is cosmetic and server-bounded. Chess move intent is sent only after selecting a legal destination; the move animates as pending and commits only on server confirmation.

## Phase gates and migration sequence

Phase 2 extracts one rules module at a time, establishes protocol/auth/database, and ships an installable client that can reach a dev server. Before moving a plugin, capture deterministic fixture snapshots and replay parity. Phase 3 delivers two-client online 3D Chess, reconnect, chat, result, and Docker server. Later phases add completed game views, executable Fusion online, social/meta, and release hardening. Do not expose any screen as usable merely because this document describes it.
