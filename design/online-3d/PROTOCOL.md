# Versioned network protocol — design contract v1

This is a specification for `packages/protocol`, not an implemented wire service. All inbound bodies receive strict schema validation (Zod or equivalent), byte limits, authentication, authorization, rate limits, and monotonic sequence checks before reaching game rules.

## Transport and envelope

- REST over HTTPS for accounts, profile, export/delete, version manifest, and health. WebSocket over WSS for room and match events. Loopback HTTP/WS is allowed only by explicit development config.
- JSON initially. `protocol.major=1` is incompatible across major versions; minor additions must be optional and ignored safely. Server sends `version.mismatch` and closes before joining a room if client build/ruleset is unsupported.
- Browser WebSocket API cannot set arbitrary authorization headers. After socket open, the first and only permitted message is `auth.hello` with a short-lived access token in the body over WSS; do not put tokens in URLs or log bodies. Fail closed if not authenticated within five seconds.
- Maximum v1 message body: 16 KiB for ordinary intents, 2 KiB for pose, 1 KiB for emote. Snapshot chunks are server-only and separately bounded. Reject unknown message types/fields at trust boundaries.

```json
{
  "v": 1,
  "type": "game.move.intent",
  "messageId": "uuid",
  "roomId": "uuid",
  "clientSeq": 42,
  "sentAt": 1791000000000,
  "payload": {
    "intentId": "uuid",
    "baseRevision": 17,
    "action": { "type": "move", "actor": "p1", "payload": { "from": 12, "to": 28 } }
  }
}
```

`actor` in the example is a compatibility field for the existing rules contract, not a claim of identity: the server replaces/checks it against the authenticated room seat. Server responses include `serverSeq`, `roomEpoch`, and `gameRevision`. A new room epoch invalidates stale messages after restart/migration.

## REST surface

| Endpoint | Request → response | Guard |
| --- | --- | --- |
| `POST /v1/auth/register` | email, display name, password → pending verification | rate-limit IP/email; Argon2id server-side; neutral error wording |
| `POST /v1/auth/verify` | one-use token → verified | token hash/expiry and one-use transaction |
| `POST /v1/auth/login` | email/password → access + opaque refresh | uniform failure, account/IP backoff, optional remember-me TTL |
| `POST /v1/auth/refresh` | refresh → new access + rotated refresh | atomic rotation, reuse revokes token family |
| `POST /v1/auth/logout` | refresh family/session id → revoked | authenticated; idempotent |
| `POST /v1/auth/forgot` | email → generic accepted | one-use reset via production mailer/dev mock |
| `POST /v1/auth/reset` | reset token, new password → revoked old sessions | token/strength checks |
| `GET/PATCH /v1/me` | own profile; allowlisted updates | authenticated, display-name filter |
| `GET /v1/me/export` | own portable JSON | reauthentication, rate limit |
| `DELETE /v1/me` | deletion request → status | recent auth + confirmation; revoke sessions |
| `GET /v1/version` | protocol/client/rules compatibility | signed or HTTPS-delivered manifest |
| `GET /health/live`, `/health/ready` | process and dependency readiness | no secrets or personal data |

No REST endpoint accepts a game outcome or chip balance from a client.

## WebSocket message catalog

| Direction | Type | Payload essentials and behavior |
| --- | --- | --- |
| C→S | `auth.hello` | access token, client build, supported protocol/rules versions |
| S→C | `auth.ready`, `version.mismatch`, `error` | session identity/capabilities or terminal problem |
| C→S | `room.create`, `room.join`, `room.list` | game id/visibility/seats/settings, invite code, filters |
| C→S | `room.ready`, `room.start`, `room.kick`, `room.leave` | host/seat permission checked; start requires all required ready |
| S→C | `room.state`, `room.closed`, `room.kicked` | member-safe lobby projection and reason |
| C→S | `match.rejoin`, `match.snapshot.request` | previous match id, last serverSeq; server validates same account/seat |
| S→C | `match.snapshot`, `match.event`, `match.timer` | per-viewer projection, confirmed revision/event, server clock |
| C→S | `game.move.intent`, `game.resign` | idempotent intent id + expected revision; resign actor derived from session |
| S→C | `game.move.accepted`, `game.move.rejected` | authoritative revision or stable error code; no secret details |
| C→S | `game.draw.offer`, `game.draw.respond`, `game.rematch.request`, `game.rematch.respond` | player decisions, timeout and duplicate handling |
| C→S | `avatar.pose` | quantized position/yaw/pitch/input seq; max 20 Hz; no trust for Chess turn |
| S→C | `avatar.pose.batch` | validated visible peers; timestamp for interpolation |
| C→S | `chat.send`, `emote.play`, `social.mute`, `social.block`, `social.report` | bounded text/emote id; moderation/rate limits |
| S→C | `chat.message`, `emote.played`, `presence.changed` | filtered by blocks/mutes/room membership |
| C↔S | `ping`, `pong` | latency estimate and dead-connection detection |

Future `friend.*`, `quickmatch.*`, spectator, casino co-op, and Fusion-specific messages use the same envelope but remain hidden until their phases. The pre-match online Fusion rule sheet is a server-published, versioned `match.rulesheet` projection; both players acknowledge it before ready/start.

## Chess intent transaction

1. Client sends `game.move.intent` with UUID `intentId`, current `baseRevision`, and a parsed action. UI displays a pending highlight only.
2. Server authenticates socket, resolves room/seat, rejects nonplaying/spectator identities, verifies room epoch and revision, and checks it is that seat's turn.
3. Server parses the action through shared rules, checks legal action/promotion choice and timers, runs deterministic reducer with server context, appends event and snapshot/checkpoint transactionally, and advances `gameRevision`.
4. Server replies accepted/rejected to sender and broadcasts viewer-specific event/projection to members. Client commits animation on acceptance; rejection removes pending effect and displays a localized reason.
5. Duplicate `intentId` returns the original result; stale revision asks the client to resync. No client can provide RNG, board snapshot, result, XP, or chip delta.

Use `(match_id, actor_account_id, intent_id)` uniqueness so retries cannot make two moves. Result and reward finalization are one idempotent server transaction. For hidden games, no rejection detail reveals private hands or deck order.

## State visibility

`packages/rules` owns a full serializable state but **network projection is a separate audited adapter**. Player `p1` sees own hand, public table and counts of opponent hands; `p2` gets its own view. Spectators get public information only and are read-only. Casino outcome seed, deck order, bot private observation, and unrevealed cards remain on server. Full snapshots are encrypted at rest for crash recovery, not sent to clients.

The existing `botObservation()` is useful but is not automatically a safe network DTO; projection tests must assert forbidden keys/values are absent for every playable plugin before it goes online.

## Ordered sync and reconnection

- Game events have monotonic `serverSeq` and `gameRevision`; client acks last applied sequence. Pose packets have separate ephemeral sequence and can be dropped; do not mix them into the durable event log.
- On a missing event gap, client freezes board interaction and requests a per-viewer snapshot plus recent events. It never guesses the result. Other players see a reconnecting indicator.
- `match.rejoin` requires a freshly authenticated session for the same account. Server reserves the seat for 90 s by default (configurable 60–120 s). A new socket invalidates the old socket for that seat.
- For v1 online Chess, pause the turn clock during the grace window, then apply documented forfeit on expiry; do not let an unapproved bot make a competitive move. Future casual rooms may allow a host-selected takeover policy that is fixed in lobby settings before start.
- After reconnect, server returns room epoch, current revision, safe snapshot, clock anchor, and peer poses. Client fast-forwards confirmed events and clears stale pending intents. Server decides whether an old move intent already committed.
- Heartbeats detect dead peers; UI shows RTT and reconnect/backoff state. Repeated reconnect uses bounded exponential backoff with jitter, never infinite hot-looping.
- Host leaving before start transfers host to the oldest present eligible member or closes an empty room. During an active match, server—not host—owns match continuation.

## Avatar sync

Client sends quantized pose at 15–20 Hz; server validates finite coordinates, room bounds, plausible speed/teleport delta, seat ownership, and message budget, then relays at a bounded rate. Recipients interpolate by timestamp with a small render delay; brief packet loss extrapolates only cosmetically and clamps to bounds. Collision remains local for responsiveness but server correction wins. Pose does not alter rules.

## Error codes and test matrix

Stable codes include `auth.required`, `auth.expired`, `version.unsupported`, `room.not-found`, `room.full`, `room.kicked`, `game.not-your-turn`, `game.illegal-move`, `game.stale-revision`, `rate.limit`, and `server.unavailable`. Errors are translated in VI/EN client copy; raw server exceptions are never shown.

Protocol tests must cover malformed/oversized/unknown messages, stale and duplicate intents, forged actor/room, out-of-turn/illegal Chess move, simultaneous retry, dropped/out-of-order event, secret projection leaks, expired auth, version mismatch, reconnect before/after grace, host departure, mute/block and chat limits. The two-client Phase 3 test plays a full legal Chess game and repeats it with a forced mid-game disconnect.
