# Casual LAN threat model

This is a design-stage contract. The current offline app does not expose a LAN listener. Casual play removes account/competitive infrastructure, **not** network input risks. Hosts and guests choose to trust one another socially; the app must still protect each PC and keep private game information separated.

| Risk | Control / acceptance gate |
| --- | --- |
| Unexpected network exposure | Listener only after explicit Open to LAN; choose/show adapter and port; default to private/virtual local addresses, never router port-forward automatically; close listener when room closes. Windows firewall guidance, not disabling firewall. |
| Malicious LAN packets | Strict versioned schemas, 16 KiB max body, bounded nesting/text, connection and rate limits, heartbeat timeouts, no dynamic code/eval. Fuzz malformed input. |
| Guest forges moves or seat | Host derives actor from connection, checks turn/revision/legal action, ignores client result/RNG/chips, idempotent request IDs. Two-client tests. |
| Hidden card/deck information | Viewer-specific allowlist projection; test forbidden values for each plugin. Do not send `serialize()` or bot observation wholesale. |
| Room hijack/reconnect theft | Unpredictable room-scoped rejoin token, host-side hash, rotation, seat binding, short grace. Invite code is not a password; direct IP/code may be shared by friends. |
| Host cheating / crash | The host controls the machine and could alter the game; no competitive guarantee. Host-local checkpoint may recover solo progress; guests lose session when host exits. Disclose this rather than promising anti-cheat or migration. |
| Chat abuse | Short plain text, escaping, rate limit, mute/block locally; optional host-local report with bounded retention. No links/HTML rendering. |
| Electron compromise | Packaged local UI only; sandbox, context isolation, no Node integration in renderer; narrow validated preload IPC; deny navigation/new windows; audit CSP when adding transport. |
| Local data loss/privacy | Keep profile and full state on owner PC, atomic saves/backups; never transmit local save contents as a shortcut. No email/password database. |
| Outdated/incompatible versions | Handshake checks protocol major and ruleset hash/version before seat assignment; reject safely with update instructions, not undefined behavior. |

Peer-to-peer LAN traffic is not automatically end-to-end encrypted. On an untrusted Wi-Fi network, a local attacker may inspect or interfere with an unencrypted session. Before a public release, choose between application-layer authenticated encryption, OS/VPN-provided protection with explicit warning, or a constrained private-network-only feature; do not claim confidentiality without implementing and testing it. Radmin VPN is optional and third-party, not a security guarantee made by this app.

No central server means server-side global reports, identity-based bans, global leaderboard integrity and off-device recovery do not exist in v1. Those features must not appear as working UI until an explicit later architecture decision.
