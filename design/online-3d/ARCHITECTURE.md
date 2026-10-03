# Offline-first architecture

## Source of truth

One deterministic TypeScript rules implementation runs in the local game session. In solo mode it manages the human and bots. When **Open to LAN** is enabled, the same session becomes the authoritative listen host; guests submit intents, never state or random outcomes. Visual 3D, animation and avatar movement do not change rules. A host can be trusted for a casual friend game, but guests must not accidentally receive hidden hands or deck order.

```text
                             physical LAN / optional virtual LAN
  Host Windows EXE  <------------------------------------------------>  Guest Windows EXE
  ┌────────────────────────────────┐       direct IP + discovery       ┌────────────────────────────┐
  │ React menus/HUD + Three.js room│                                   │ React menus/HUD + 3D view │
  │ Electron restricted preload    │                                   │ Electron restricted preload│
  │ local profile/save             │                                   │ local profile/save         │
  │ authoritative rules + bots     │ -- viewer-specific snapshots --> │ intent + rendering only    │
  │ bounded LAN listener          │                                   │ reconnect by session key   │
  └────────────────────────────────┘                                   └────────────────────────────┘
```

No cloud backend or public identity service exists in the initial architecture. Windows firewall may prompt the host; the app must explain a private-network exception and still work offline if declined. Bind only to the selected network interface, never expose a public-facing port silently. Port and invite code are displayed in the lobby. Discovery is a best-effort UDP advertisement/listen within a local subnet; **manual `IP:port` is always available**, including for Radmin VPN and routers that suppress broadcast. Scanning public internet addresses is out of scope. Joining outside a LAN requires the users' own virtual-LAN solution; the game does not bypass NAT by itself.

## Boundaries

| Concern | Owner | Persistence / visibility |
| --- | --- | --- |
| Local profile and settings | Each EXE | Current local save format; no password/email/account server |
| Solo rules, RNG and bots | Local session | Saves/checkpoints on that PC |
| LAN rules, RNG and seats | Host EXE | Host-local save/checkpoint; guests receive safe projections |
| Menu/HUD and 3D room | Each EXE | Cosmetic only; never determines outcomes |
| Fusion recipe and result | Host session | Versioned shared rule sheet before start; cache local to host |

The current `src/contracts` and game plugins are the migration baseline. A proposed workspaces split (`apps/client`, `packages/rules`, `packages/lan-protocol`, `packages/3d`) is deferred until its value exceeds migration risk. First isolate pure host-session/protocol code *without moving all seven working plugins*. Existing 2D UI remains as a fallback while each 3D view reaches feature parity. Assets are lazy-loaded per room.

## Lifecycle and policies

1. Boot a local profile. There is **no mandatory Register/Login or post-login server fetch**. The player can edit a display name and choose an avatar locally. Same names are allowed; a session-specific peer ID distinguishes them.
2. Choose a completed game in the 2D grid. Solo starts immediately with bots where needed. From a game or setup, Open to LAN starts the bounded listener, advertises the room, displays `IP:port` and an invite code, and allows a friend to take a bot seat at a safe boundary.
3. Join LAN shows discovered rooms and a manual address field; a failed discovery does not imply no host exists. Before joining, compare protocol major, app/ruleset version and Fusion sheet hash. Unsupported versions show an update/mismatch screen, never attempt divergent play.
4. Host validates seat, turn, expected revision and legal move. Snapshot/event sequence resynchronizes guests after packet loss. The host keeps a disconnected guest's seat for ~90 seconds; the pre-match choice is pause or bot takeover. On return, the guest receives a fresh safe projection. After timeout, game-specific forfeit or bot takeover applies. Rejoin is invalid if the host closed the room.
5. If the host quits/crashes, the session ends for guests. Host-local recovery may restart a saved solo match; **no automatic host migration** in v1. Host should see a confirm/forfeit dialog before leaving a LAN match. A guest leaving returns host control of that seat to a bot or applies the selected rule.
6. Late joiners cannot become active players in an arbitrary mid-turn state; they wait for a safe round boundary or take a reserved bot seat when that game explicitly supports it.

## 3D room

React owns menus and readable HUD, Three.js owns one scene/canvas with explicit disposal. First-person WASD/mouse look and collision are local presentation. The Chess view mounts Board Hall, two avatars, piece picking and the Focus Board camera; clicks become host intents. The existing pure Chess rules remain independent of Three.js. More views follow only after accuracy, redaction and performance checks. See [VISUAL_DESIGN.md](VISUAL_DESIGN.md).

## Local data layout (logical, not a new database)

`profile` (display name, avatar, locale, settings), `save` (game id, ruleset version, full local state, timestamp), `room-checkpoint` (host-only full state and epoch, bounded retention), `cosmetics` (local ownership), `report` (optional host-local moderation record). Guests do not get host-only checkpoints. No email, password, refresh token, PostgreSQL, Docker or cloud account tables are needed for this product direction. Backups/export can use the existing local save mechanism after schema review.

## Verification gates

Keep all existing offline tests green. Add host-session tests for legal/illegal/out-of-turn/duplicate intents, disconnect, bot replacement and version gates. Transport tests require two simulated clients and, before declaring LAN ready, two physical Windows machines plus direct-IP over Radmin or equivalent virtual LAN. Observe discovery failure/fallback, Windows firewall, multiple adapters, host-exit behavior and hidden-information projection. Target 60 FPS on integrated graphics with low preset and Focus Board readability; measure on real hardware, do not assert it from a design mockup.
