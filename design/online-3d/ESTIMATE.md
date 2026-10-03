# Effort, hosting, risks, and approval gates

Estimates are planning ranges, not commitments. They assume an experienced small team (3–4 people sharing game/client, backend/security, and art/QA roles), existing seven offline plugins as the starting point, original low-poly assets, and two-player Chess as the only Phase 3 online game. A solo developer's elapsed calendar time is much longer. Add external security/legal review before public accounts.

## Effort by phase

| Phase | Meaningful completion gate | Estimated team effort |
| --- | --- | --- |
| 1 Design & architecture | Reviewed docs, threat model, room/character concepts, clickable flow; **no game code** | 2–4 person-weeks |
| 2 Foundation | Workspaces, rules parity, secure auth/database, client flow, local dev, installable login-capable EXE | 10–18 person-weeks |
| 3 Two-player online 3D Chess | Two machines, 3D Board Hall/avatars, legal server moves, reconnection, chat, result/rematch, Docker, two-client tests | 20–36 person-weeks |
| 4 More 3D games | Completed plugin view + secret projection + UI/audio/test per game; new rule implementations for remaining catalog items | 4–10 person-weeks **per existing ready game**, more for games with unbuilt rules; 38-game catalog is a multi-year workstream |
| 5 Online Fusion | Executable/adapted rules, server simulation/cache, UI/reveal, redaction, tests | 16–30 person-weeks after base games are reliable |
| 6 Social/meta | Friends, matchmaking, server progression, shop, daily/roguelike, optional 3D lobby/co-op | 20–40 person-weeks, depending on feature depth |
| 7 Polish/release | Security/performance/balance/accessibility, deployment/runbooks, installer/update/signing | 12–24 person-weeks |

Through the first *good-feeling* online Chess milestone, allow roughly 3–5 months of calendar time for that small team, including integration/QA slack; a single developer may need 8–14 months. These are judgment estimates based on feature scope, not vendor promises. Completing all 38 games plus the entire social/Fusion roadmap is substantially larger—likely 18–36+ months for a focused small team—and should be re-estimated after Phase 3 measured velocity.

## Hosting estimate (USD, checked 3 Oct 2026)

Local development via Docker Compose on the developer machine costs no cloud hosting fee. The first public pilot should be budgeted separately from a 200-room load-test target.

| Scenario | Monthly infrastructure baseline | Exclusions / caution |
| --- | --- | --- |
| Small self-managed pilot | One 4 GiB / 2 vCPU DigitalOcean Basic Droplet: **$24/mo**; PostgreSQL in Docker on the same VM | Single point of failure; team owns backups, TLS, patching, monitoring, DB recovery. Not a mature production topology. |
| Safer small production starting point | 4 GiB Droplet **$24/mo** + managed PostgreSQL 1 GiB **$15.15/mo** = **$39.15/mo** | Still one app node; add backups, email delivery, domain, storage/bandwidth overage, taxes, monitoring, support and staging. |
| Two app nodes + managed DB | Two 4 GiB Droplets **$48/mo** + managed DB **$15.15/mo** + a load balancer (price to verify at purchase) | Roughly **$63+/mo** before LB and other services; multi-node room routing/sticky connection work is not in the initial server design. |

Vendor pages: [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets) lists 2 GiB at $12/mo and 4 GiB at $24/mo; [managed PostgreSQL pricing](https://www.digitalocean.com/pricing/managed-databases) lists the 1 GiB standard node at $15.15/mo. Prices/regions/taxes can change. These figures are **infrastructure baseline only**, not labor, art tools, email, domain, Windows code signing, or uptime SLA. Server capacity for 200 concurrent rooms is **unknown until measured**; do not buy a plan or advertise capacity from this estimate alone.

Operationally, 200 two-player rooms at 15–20 pose updates/s can generate thousands of inbound/outbound messages per second even before chat/game events. Pose quantization, interest filtering and packet-size measurement matter more than raw client connection count. The Phase 3 load report must record CPU/RAM, p95/p99 move latency, reconnect success, WebSocket disconnections, egress and database write throughput for the actual host.

## Highest risks and mitigation

| Risk | Why it matters | Early reduction |
| --- | --- | --- |
| Scope explosion | 38 designs are not 38 finished games; social/Fusion/3D art each multiply work | Ship Chess vertical slice, hide future features, re-estimate per phase |
| Rules extraction regression | Existing offline Chess and other modules must remain correct | Fixture/replay parity, old tests on every migration, preserve `main` |
| Hidden-info leakage | Reusing full serialized state online would reveal cards/seeds | Per-viewer projection contract and negative secret tests before each game |
| Auth/security | New accounts create real credential and privacy obligations | OWASP/Electron gates, external review, minimum data, token rotation |
| Network desync | Two clients, reconnect and timer races can corrupt match | Server event sequence/revision/idempotency, crash/rejoin tests |
| 3D readability and motion sickness | First-person board could be beautiful but hard to play | Focus Board, seated option, FOV/sensitivity/reduced motion, usability testing |
| Integrated GPU target | 60 FPS depends on exact hardware and room assets | One room first, low preset, GPU frame profiling, asset budgets |
| Hosting/operations | Single-node server outages and DB backups | Pilot before public release, restore drill, measured scale and alerting |
| No remote-code loading | Online services must not turn Electron into a remote web shell | Packaged UI/assets, origin-restricted API only, CSP and IPC audit |
| Art production throughput | Eight rigged avatars + four room kits is substantial | Shared rig, procedural props, original asset inventory and checkpoints |

## Approval/checkpoint policy

Stop after each phase. Phase 1 approval is approval of **architecture and look**, not a claim that auth or 3D online play works. Phase 2 approval requires a real local server login and installable EXE; Phase 3 requires two real machines/clients and the automated failure-path tests. Future screens are hidden until complete. Release notes at every gate must distinguish implemented, prototype, and planned work and provide artifact paths plus known risks.

No new server, cloud account, payment, domain, or credential is provisioned in Phase 1. The old offline EXE remains the only currently playable release.
