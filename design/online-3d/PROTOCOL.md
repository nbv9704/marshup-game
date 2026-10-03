# LAN protocol contract — proposed v1

Design contract plus a beta Chess implementation, **not yet LAN-certified on two machines**. The host EXE is authoritative. The first transport uses a bounded, newline-framed JSON stream over TCP (`src/lan/chess-tcp.ts` and `chess-client.ts`). `electron/lan-controller.ts` owns those sockets in Electron main and the preload exposes narrow commands/events; the renderer has no raw Node networking. Chess 3D exposes explicit Open/Join LAN controls in beta builds. The 2D diagnostic LAN Lab remains dev-only. Best-effort UDP discovery exists in `src/lan/discovery.ts`; it is **never required** for direct-IP joining. It advertises only game, room label, rules version, seat count and port; receiver derives the IP from the datagram source.

## Envelope and limits

The initial Chess transport sends one JSON object per line. `hello` carries `protocolMajor:1`, ruleset ID/version and optional rejoin token; `hello.accept` returns room epoch, assigned seat token and safe snapshot. The host rejects client lines over 16 KiB; the client rejects server lines over 64 KiB. The current code rejects unknown types, malformed JSON, unexpected intent keys and wrong versions, but full schema/rate/fuzz review is still required before public release. State changes use monotonic `revision` and idempotent `requestId`. Pose updates, not yet implemented, will be separately bounded (15–20 Hz) and discardable. Game result, RNG, seat identity and state are never accepted from a guest payload. Future protocol versions should include room epoch on all post-handshake messages.

| Status | Direction | Message | Purpose |
| --- | --- | --- | --- |
| Tested standalone | Host → UDP LAN | discovery JSON (`magic: MASHUP_ARENA_LAN`) | epoch, label, Chess/rules version, port, seats; expires after ~7 s |
| Tested standalone | Guest → host | `hello` | protocol/rules version, optional rejoin token; one guest seat |
| Tested standalone | Host → guest | `hello.accept` / `hello.reject` | seat token + safe view, or stable rejection |
| Tested standalone | Both | `ping` / `pong` | keepalive; RTT display later |
| Tested standalone | Guest → host | `game.intent`, `game.snapshot.request` | request ID, base revision and move; no client actor |
| Tested standalone | Guest → host | `room.leave` | explicit departure frees the guest seat immediately |
| Tested standalone | Host → guest | `game.result`, `game.snapshot`, `room.closed` | result/revision, Chess projection, host shutdown |
| Planned | Both | `room.ready`, `room.chat`, `room.emote`, `game.resign`, `game.draw`, `game.rematch` | lobby and social/game decisions |
| Planned | Host → guest | `game.rulesheet` | versioned Fusion rules/hash before start |
| Planned | Both | `avatar.pose` | bounded cosmetic position/look sync |

Discovery datagrams are untrusted hints. The UI must display host IP, network adapter and version, and a direct-IP path even when no room is discovered. A room shown via discovery is re-validated at connection. Never auto-connect merely because a broadcast arrived.

## Chess move transaction

Host binds each socket to a seat after `hello`; rejects a guest-supplied `actor`, outcome or state field. For `game.intent`, the standalone server checks rate, base revision, turn ownership and legal Chess move. It applies the pure reducer once, increments revision, retains a bounded duplicate-request cache, and sends a Chess-specific public projection without host repetition bookkeeping. Rejection never advances state. Room-epoch binding on every message, durable event sequence and recovery after missed snapshots remain Phase 2/3 work; the guest currently can request a fresh snapshot.

## Reconnect and host loss

Host issues an unpredictable room-scoped seat token after a successful handshake, rotates it on successful rejoin and reserves the seat ~90 s after an unexpected disconnect. Deliberate `room.leave` frees the guest seat immediately. Chess pauses during grace; the TCP host schedules expiry and returns the seat to a bot without silently making a move. The Chess 3D UI then asks the bot to act when its turn arrives. A new guest can replace an unoccupied bot at any committed turn boundary while the game is playing. The server currently keeps the live token in memory; hashed storage, optional forfeit policy and lobby choice are release hardening tasks. A rejoining guest receives current Chess projection and revision; clocks and peer poses are not implemented. Host departure closes connections; there is no automatic migration or cloud recovery. Because the first TCP transport is plaintext, use only on trusted physical/virtual LANs until encryption or stronger pairing is implemented.

## Visibility

Network projection is a separate audited adapter, not `serialize()` or `botObservation()` by default. For Chess the full board is public; for cards, own hand and public table are visible while opponent hand/deck are redacted. Casino RNG and Fusion private state remain host-only. Before a plugin gets a LAN toggle, automated tests must assert secret values never occur in that viewer's payload.

## Test matrix

Two clients on loopback and two real Windows machines: direct IP, discovery, no-broadcast fallback, multi-adapter/Radmin, firewall refusal, version mismatch, full Chess game, illegal and out-of-turn moves, forged actor/seat, stale and duplicate request, packet drop/reconnect before and after grace, host quit/crash, chat bounds, hidden-info projection, and bot-seat takeover. Loopback success alone does not certify real LAN.
