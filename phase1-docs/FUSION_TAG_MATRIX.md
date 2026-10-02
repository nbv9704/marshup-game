# Fusion Mechanic Mapping and Conflict Resolution — Phase 1

A source modifier's tags indicate **expressible mechanic inspiration**, not permission to bypass base-game legality. The generator ranks effect *adapters* supplied by Game A, not arbitrary JavaScript or unvalidated changes to its private state. All generated recipes must have a full rule sheet before they become playable. The Phase 1 TypeScript models are `src/contracts/fusion.ts`, with two typed example recipes in `src/fusion/handcrafted.ts` and 36 authored descriptions in `src/fusion/handcraftedSpecs.ts`.

## Automatic tag mapping

| Source tag | Preferred adapter when base supports it | Universal fallback if base cannot safely support it | Typical trigger |
|---|---|---|---|
| draw | receive bounded temporary action card / choose among permitted reward offers | earn capped Energy on round completion | card drawn or turn start |
| reverse | invert legal direction of seat order at a safe boundary | choose a reversible secondary objective instead | card played / round boundary |
| skip | suppress an optional rival bonus or one nonmandatory action | suppress rival bonus only; in-check defenses never skipped | card played |
| capture | legal capture bonus, bounty or captured reserve token | +1 energy on eligible primary event | after capture |
| bet | wager a bounded **virtual side score** with published odds | optional capped stake against known objective | bet placed / match start |
| random | bounded choice from seeded PRNG and explicit distribution | random bonus 0–1 Energy, no extra event chain | turn / round boundary |
| resurrect | restore valid captured or exhausted component | revive one spent bonus token, never a king | pre-turn / card effect |
| swap | trade selected legal equivalent targets | swap selected side-objective, not board state | card / turn boundary |
| shield | one-use protection against a Fusion effect | guard one future bonus-side-score penalty | after scoring |
| roll | die-derived legal action selection | 0–2 virtual side-points | dice rolled |
| spin | bounded wheel/reel result with explicit probability | virtual side-score choice after round | spin completed |
| peek | temporarily reveal base-authorized hidden information | reveal current available public legal hint | after supported event |
| place | place a legal optional token where a base adapter allows | occupy a cell on a separate side-objective grid | action boundary |
| discard | sacrifice one eligible bonus card/item for energy | trade one secondary objective token | card discarded |
| race | movement boost *only if the base supports bonus movement* | score side-progress toward a public finite goal | round boundary |
| collect | capture/share one base-approved resource | capped Energy or side-score | end of turn |
| challenge | optional stake/response only within a real challenge window | choose risk-reward side objective | challenge opened |
| multiply | bounded multiplier on virtual side reward, not ordinary legal winnings | +1 score up to 10%-of-match side cap | spin or wager settlement |

**No-op warning:** A fallback must be noncosmetic and observable. A game that lacks a safe primary adapter still grants a capped resource choice and a transparent tournament side-score effect. If this cannot legally work with its chosen base adapter, the compiler switches to a verified base-legal fallback, records why, and marks the recipe provisional. Any failed fallback invariant quarantines the hybrid instead of presenting an unwinnable match.

## Priority and safety order

```text
pre-compile:
  verify source/base IDs and ruleset versions
  choose handcrafted recipe if one exists; otherwise select source tags
  resolve tag -> base adapter by capability and safety tier
  compile finite event graph with explicit effect priorities/fallbacks
  static checks: forbid self-loop; duplicate action hooks; illegal terminal handlers
  quick seeded smoke on worker and synthesize rule-sheet text

action-time:
  reject duplicate/replayed command ID and invalid actor/phase
  validate base action first (except explicitly authored pre-action substitutions)
  fire <=64 events; each has stable ID, once-per-turn flags, max depth 8
  resolve outcome > required king/legal defense > mandatory move > fusion bonus
  apply only adapter-validated effect; otherwise bounded one-shot fallback
  assert base invariants and commit event journal / RNG
  terminal if base ends; otherwise cap-match published safety resolver
```

| Conflict | Mandatory handling |
|---|---|
| Skip tries to skip checked king's defensive turn | cancel primary skip; side-resource fallback |
| Resurrect tries invalid/occupied coordinate | enumerate deterministic legal targets; restore eligible subset or fallback |
| Reverse changes pawn direction and affects en passant | invalidate obsolete time-sensitive en passant rights and recalculate legal forward/promotion boundaries |
| Capture roulette cancels mandatory capture | choose a permitted noncapture only when its base rules allow one, or complete the original capture |
| Bonus draw recursively triggers another bonus draw | cap bonus-generated card triggers and prevent self-reentry via event provenance |
| Extra turn indefinitely grants additional extra turns | limit consecutive bonus turns to 3; suppress subsequent extras into side-resource |
| Spin-generated multiplier risks unbounded chips | fixed per-round bonus cap; transactions settle only once |
| Hidden-card reveal is sent to wrong player/bot worker | game module produces per-seat redacted observation; privileged evaluator runs privately |
| Modifier conflicts with primary terminal event | native primary terminal wins; post-game side reward only where it cannot change original legality |
| Both modifiers claim same hook in three-game mode | priority plus deterministic tie-break; only one primary mutation, second degrades to safe side effect |
| No legal actions but game not terminal | invoke base pass rule if legal; otherwise documented emergency draw/score resolver |
| Match repeatedly cycles | seeded repeated-state detector plus action budget, announced deterministic score/draw safety exit |

## Balance acceptance thresholds (initial engineering proposal)

These are configurable targets to review, not statistical guarantees. CI first rejects *any* invalid move or terminal invariant violation. On mirrored bot play, flag >65% seat win proportion or >5% watchdog resolutions in 200 matches for parameter tuning (these thresholds can be adjusted after collecting observed baseline first-player advantage for that underlying game); benchmark native game with same bot pair before attributing skew to fusion. For high-randomness casino hybrids use chips-normalized expected-value variance and fixed-round completion instead of naive win-rate symmetry. Handcrafted highly visible pairs should pass 1,000 seeds in release QA with a clear confidence label. Every pair must compile for the complete 38-game release, while full deep-balance simulation is prioritized and cached to manage offline CPU cost.
