# MASHUP ARENA — offline-first + optional LAN

Decision record, 3 October 2026. This supersedes the earlier account-and-cloud-server concept in this folder. The product is a casual single-player game first, with optional friend play over a physical or virtual LAN. No paid hosting, Steam integration, email account, or third-party VPN is required to play alone or on a normal local network.

## Agreed experience

`Splash → local profile → Home → 2D Game Select → Solo (bots fill seats) → result` is the default path. The player can choose **Open to LAN** from a supported game/session. Friends use **Join LAN** to find hosts on the same network or enter `IP:port` manually. Radmin VPN is an optional way to create a virtual LAN; automatic discovery may not work across it, so direct IP is mandatory. Gameplay rooms use first-person 3D with an accessible Focus Board view, starting with Chess. The current 2D game stays playable until its 3D replacement is actually complete.

Completed game modes should be playable solo, using bots where the rules require more seats. The 38-item catalog and 36 Fusion recipes are designs, not 38 playable games or a shipped Fusion Engine. Unfinished actions remain hidden in release builds. There are no ranked stakes, cash-out, or globally authoritative chips.

## What exists now

The repository now has seven playable offline 2D plugins and local saves. Chess also has a procedural first-person 3D room with Focus Board and a solo bot. The Chess catalog card opens this beta mode; it can save and resume a solo match. Chess host/client TCP, 90-second reconnect and best-effort UDP discovery are wired through Electron's narrow preload bridge in development **and** packaged builds. A guest can enter the host's IPv4 address manually when discovery fails. The bot fills an empty guest seat and can be replaced at a committed turn boundary. The app labels LAN as beta because a two-machine/Radmin test has not happened yet; do not treat the loopback tests as LAN certification.

The older **LAN LAB** diagnostic board remains available in development only. It is not the player-facing packaged interface. The packaged 3D beta is a vertical slice, not the whole envisioned game: animated remote avatars, timer/rematch/chat features, the remaining 3D games, Fusion execution and final polish remain to be built.

Open [prototype.html](prototype.html) locally. It demonstrates local-profile entry, Home, Game Select, Solo, Open to LAN, Join LAN (discovered list and direct IP), room, first-person/Focus Chess and result. All hosts, moves, and connection states in the prototype are simulated in the browser. No network request or account creation occurs.

Read [ARCHITECTURE.md](ARCHITECTURE.md), [PROTOCOL.md](PROTOCOL.md), [SECURITY.md](SECURITY.md), [VISUAL_DESIGN.md](VISUAL_DESIGN.md), and [ESTIMATE.md](ESTIMATE.md) for implementation boundaries and phase gates.

The current Chess 3D beta outputs are `release/MashupArena-Setup-0.3.0-beta.1.exe` and `release/MashupArena-0.3.0-beta.1-portable.exe`. The older `0.2.0` executables, if still present, contain only the 2D offline app. Installer and portable are alternatives, not files to install together. Each is roughly 84 MB largely because Electron packages its Chromium runtime. These local builds are unsigned; a Windows machine without symlink privilege omits executable icon/metadata editing, as documented in the root README.

## Revised phase gates

1. **Design:** agree on offline-first/LAN flow, protocol, security, 3D concept, cost and risks; clickable prototype only.
2. **Foundation:** preserve existing offline games; extract/test deterministic host logic, transport/discovery and local profile; ship installer only when the user-facing slice works. No mandatory login/database.
3. **Vertical slice:** two-player LAN 3D Chess (real LAN and Radmin/manual-IP tests), bot fallback, host validation, reconnect, Focus Board, result/rematch. This is the first networked 3D milestone.
4. **More games:** prioritize completed rulesets; give each an accurate 3D view, bot behavior and safe per-player projection before enabling LAN.
5. **Fusion:** executable local/host Fusion rules, identical rule sheet and tested balance/termination; no cloud required.
6. **Meta/social:** local progression, cosmetics and optional casual room affordances. Cloud friends/leaderboards only if explicitly chosen later; never gate the core game.
7. **Polish/release:** performance, accessibility, security, networking documentation, final Windows packages.

Stop for owner review at each completed phase. The Phase 3 gate requires a real two-machine test; a simulated HTML prototype or loopback-only test is not enough.
