# Phase 1 threat model and privacy decisions

This is a design-stage threat model, not a claim that mitigations are deployed. The live offline client has no online account service. Phase 2/3 tests and review must verify each control before a public release.

## Assets and trust boundaries

Protect: account credentials, refresh tokens, email/display identity, private game state (hands/decks/RNG), match integrity, virtual chips/progression, chat/report data, and desktop host capabilities. Untrusted surfaces: every client message, uploaded/profile text, public room names, chat, invite codes, remote API responses, WebSocket data, downloaded updates, and 3D asset metadata. The server owns outcomes. Electron main/preload must not expose native capabilities to remote or untrusted render content.

| Threat | Attack path | Control to implement | Verification / residual risk |
| --- | --- | --- | --- |
| Cheating / forged moves | Client sends out-of-turn, illegal, altered `actor`, stale revision, fake outcome | Resolve actor from authenticated seat; parse and validate in shared rules; server RNG; idempotent event transaction | Two-client tests for forged/illegal moves and server crash replay; collusion outside app cannot be prevented |
| Hidden-information leak | Full snapshot, verbose error, log, bot observation or spectator projection reveals cards/seed | Per-viewer network projection allowlists; encrypted full snapshot at rest; sanitized errors/logs | Golden projection tests for every game and spectator; code review before each plugin ships |
| Account impersonation | Stolen/reused password or token | Argon2id, HTTPS/WSS, short access lifetime, rotating hashed refresh family, revocation, login backoff | Auth integration tests and security review; malware in same OS account can still act as user |
| Replay / duplicate action | Re-send a valid move, old socket acts after reconnect | Unique intent id, expected revision, room epoch, account/seat binding, old-socket invalidation | Duplicate and reordered packet tests; persisted event uniqueness |
| Invite-code guessing | Brute force short readable room codes | Sufficient random entropy, rate limit per IP/account, hashed code index, expiry/rotation on closure | Code collision/guess-rate tests; a leaked code still allows attempted join until revoked |
| Spam / DoS | Flood login, chat, room creation, pose, snapshots | Per-IP/account/room token buckets, size limits, connection caps, backpressure, bounded room count, heartbeat timeout | Load and abuse tests; distributed attacks still need infrastructure-level protection |
| Chat/report abuse | Harassment, malicious links, repeated reports | Mute/block, text length/format limits, no rich HTML, report queue with rate limits and retention, moderator audit | UI tests and moderation process; automated profanity filtering is imperfect |
| Renderer compromise / XSS | Profile/chat text injected into Electron UI | React escaping, no raw HTML, local packaged UI only, CSP, sandbox, context isolation, no Node integration, IPC sender validation, navigation/window blocking | Electron security checklist and penetration review; OS compromise out of scope |
| Token theft from local disk | Read refresh/session storage | Electron main-only `safeStorage`, encrypted-at-rest blob, no renderer `localStorage` token, clear on logout | Windows DPAPI protects across user accounts, not same-user malware |
| Password reset abuse | Enumerate emails, reuse reset link | Neutral response, short-lived one-use hashed reset token, throttling, revoke sessions after success | Tests for token expiry, reuse, enumeration timing |
| Supply-chain / asset injection | Compromised package or remote GLB/script | Lockfile/CI dependency audit, allowlisted local packaged assets, no remote code, signed updates later | Security scan, license inventory; maintainers must still review updates |
| Data loss / corrupt match | Server crash mid-transition | Transactional event + checkpoint, replay with ruleset version, DB backup and restore drills | Crash-injection test; affordable single-node hosting still has outage risk |
| Privacy overcollection | Store chat/poses forever or leak reports | No pose persistence, bounded chat/report retention, data export/deletion, minimum profile fields | Retention audit; legal text and age notice need product/legal approval |

## Minimum auth/security implementation gate

- Passwords are never logged, sent back, or stored in the client. Server-side Argon2id with a reviewed configuration and per-password salt; do not use plain SHA-256. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- Password strength and recovery UX follow [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): long passphrases accepted, common passwords blocked, copy/paste allowed, reset cannot enumerate accounts.
- Refresh token is opaque, hashed server-side and rotated atomically. Detect reuse of an old token and revoke the family. Renderer receives access token only in memory; main process mediates refresh through a narrow bridge. `safeStorage` is OS-backed but not absolute protection against same-user malware on Windows. [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage).
- Renderer `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; HTTPS/WSS production origin allowlist; restrictive CSP; no `eval`, remote code or untrusted navigation/new windows. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).
- REST and WebSocket inputs validated by versioned strict schemas. Authorization checked on every message, not only on connection. Parameterized DB queries, bounded text, safe structured logs with token/password redaction.
- Terms/Privacy placeholders and age notice are visible design elements, not legal compliance by themselves. Account deletion must revoke sessions and schedule actual data deletion/anonymization before public launch.

## Data retention proposal for review

Raw pose packets: never stored. Chat: 30 days in report context only, otherwise ephemeral room lifetime; users may block/mute immediately. Match event/replay: 90 days for dispute/debug then aggregate or delete. Reports: 180 days pending moderation; resolved reports retained only as policy requires. Password reset tokens: minutes, removed after use/expiry. Refresh sessions: remove on expiry/revocation. These numbers are assumptions and require a privacy/legal decision before production.

## Security acceptance tests

1. Unauthenticated/expired client cannot call account or room actions; version mismatch cannot enter match.
2. Client cannot choose another account, room seat, actor, RNG seed, chip balance, result, or hidden hand.
3. Every completed plugin has redaction fixtures proving its per-viewer payload excludes opponent secrets.
4. Duplicate/replayed moves and concurrent requests commit at most one transition.
5. Renderer cannot reach Node/Electron APIs beyond the typed preload bridge; external URLs do not replace the packaged renderer.
6. Access/refresh tokens, passwords and reset links do not appear in app logs or crash reports.
7. Load/abuse script covers at least 200 simulated two-player rooms before claiming that scale; any capacity claim uses measured latency, memory and CPU, not only a successful connection count.
