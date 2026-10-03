# Effort, cost and risks — offline-first revision

Planning ranges, not promises. One experienced developer can make a playable LAN Chess vertical slice, but full 38-game 3D parity remains a large multi-year scope. Original rigged avatars, room art, sound, bot balance and accessibility are substantial production work even without hosting bills.

| Gate | Deliverable | Rough effort (experienced solo developer) |
| --- | --- | --- |
| Phase 1 | Revised design, clickable concept, risks | 1–2 weeks |
| Phase 2 | Local-profile/offline preservation, host core, bounded transport/discovery, installer | 4–8 weeks |
| Phase 3 | Polished two-machine 3D Chess, reconnect, bot fallback, 3D interactions, tests | 3–6 months |
| Phase 4 | Additional games with 3D views and LAN-safe projections | 2–8+ weeks **per ready game**; new rules take longer |
| Phase 5 | Executable Fusion, host rulesheet, balance testing | 3–6 months after base games stabilize |
| Phases 6–7 | Local meta, art, accessibility, performance and release polish | Re-estimate after Phase 3 |

Infrastructure fee for solo and friend LAN play: **$0/month**. Each player runs a Windows copy; host supplies compute and network. No Vercel/Render deployment, domain, database or Steam fee is intrinsic to this architecture. Users still pay their own PC/electricity/internet; optional Radmin VPN is a separate third-party choice. Internet play without a shared LAN/virtual LAN or NAT traversal is **not** provided. Commercial code signing, paid assets, storefront fees and cloud social/relay services would be optional extra costs if chosen later. Free hosting should not be used as a hidden reliability dependency.

Highest risks: scope explosion (38 designs vs seven playable games), existing rules regression, secret leakage in card games, Windows firewall/multiple adapters, Radmin broadcast behavior, host departure, casual host trust, integrated-GPU frame rate, 3D readability/motion sickness and asset-production time. Reduce them by preserving old tests and 2D play, building one real Chess vertical slice, keeping manual IP, measuring on target laptops and hiding incomplete content.

Approval gate: Phase 1 confirms this product direction. Phase 2 is not complete until its named deliverables work in an installable EXE; Phase 3 is not complete until two physical clients play a full LAN Chess game including disconnect/rejoin. A concept/mockup is never counted as gameplay.
