# MASHUP ARENA — offline-first + optional LAN

Decision record, 3 October 2026. This supersedes the earlier account-and-cloud-server concept in this folder. The product is a casual single-player game first, with optional friend play over a physical or virtual LAN. No paid hosting, Steam integration, email account, or third-party VPN is required to play alone or on a normal local network.

## Agreed experience

`Splash → local profile → Home → 2D Game Select → Solo (bots fill seats) → result` is the default path. The player can choose **Open to LAN** from a supported game/session. Friends use **Join LAN** to find hosts on the same network or enter `IP:port` manually. Radmin VPN is an optional way to create a virtual LAN; automatic discovery may not work across it, so direct IP is mandatory. Gameplay rooms use first-person 3D with an accessible Focus Board view, starting with Chess. The current 2D game stays playable until its 3D replacement is actually complete.

Completed game modes should be playable solo, using bots where the rules require more seats. The 38-item catalog and 36 Fusion recipes are designs, not 38 playable games or a shipped Fusion Engine. Unfinished actions remain hidden in release builds. There are no ranked stakes, cash-out, or globally authoritative chips.

## What exists now

The repository's 0.2.0 Electron app has seven playable offline 2D plugins and local saves. This package contains a clickable **concept**, not production 3D. The earlier server/auth prototype and documents have been replaced so they do not misrepresent the approved direction. Phase 2 now has standalone Chess host/client TCP, 90-second reconnect logic and best-effort UDP discovery with loopback tests. These are **not yet connected to the Electron UI or installer**, and a two-machine/Radmin test is still required. There is no new executable from this design/foundation update.

Open [prototype.html](prototype.html) locally. It demonstrates local-profile entry, Home, Game Select, Solo, Open to LAN, Join LAN (discovered list and direct IP), room, first-person/Focus Chess and result. All hosts, moves, and connection states in the prototype are simulated in the browser. No network request or account creation occurs.

Read [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md), [SECURITY.md](SECURITY.md), [VISUAL_DESIGN.md](VISUAL_DESIGN.md), and [ESTIMATE.md](ESTIMATE.md) for implementation boundaries and phase gates.

The existing offline executables, if present locally, are `release/ci-artifact-0.2.0/release/MashupArena-Setup-0.2.0.exe` and `MashupArena-0.2.0-portable.exe`. They are offline 2D, **not** the LAN/3D design. Each is about 85–90 MB largely because Electron packages a Chromium runtime; the installer and portable build are alternatives, not files to install together.

## Revised phase gates

1. **Design:** agree on offline-first/LAN flow, protocol, security, 3D concept, cost and risks; clickable prototype only.
2. **Foundation:** preserve existing offline games; extract/test deterministic host logic, transport/discovery and local profile; ship installer only when the user-facing slice works. No mandatory login/database.
3. **Vertical slice:** two-player LAN 3D Chess (real LAN and Radmin/manual-IP tests), bot fallback, host validation, reconnect, Focus Board, result/rematch. This is the first networked 3D milestone.
4. **More games:** prioritize completed rulesets; give each an accurate 3D view, bot behavior and safe per-player projection before enabling LAN.
5. **Fusion:** executable local/host Fusion rules, identical rule sheet and tested balance/termination; no cloud required.
6. **Meta/social:** local progression, cosmetics and optional casual room affordances. Cloud friends/leaderboards only if explicitly chosen later; never gate the core game.
7. **Polish/release:** performance, accessibility, security, networking documentation, final Windows packages.

Stop for owner review at each completed phase. The Phase 3 gate requires a real two-machine test; a simulated HTML prototype or loopback-only test is not enough.
