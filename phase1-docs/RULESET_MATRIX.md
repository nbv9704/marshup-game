# Master Game Ruleset Matrix — Phase 1

**Intent:** This is the required QA definition for future complete plugins, not an assertion any plugin has been implemented. A plugin is only marked ready when all listed rules, localized tutorials, deterministic state, headless AI tests and UI smoke tests pass. Variants with disputed or regional house rules must be explicitly named in the product.

| # | Plugin | Chosen original ruleset | Seats / match | Essential rules to validate | Native terminal condition |
|---:|---|---|---|---|---|
| 1 | Chess | Classical standard Chess | 2 | castling through check rejected, en passant, underpromotion, pins, check evasions, repetition and 50/75 move policies | checkmate, stalemate or recognized draw |
| 2 | Xiangqi | Chinese Chess, named local repetition policy | 2 | general palace, facing generals, elephant river, horse leg, cannon capture screen, repetition | checkmate / inability to move / documented repetition |
| 3 | Go | Japanese territory rules, 19×19 and 9×9 practice, stated superko policy, komi 6.5 | 2 | liberty, capture, suicide legality, ko, passing, dead-stone settlement | two passes, settlement by territory + komi |
| 4 | Gomoku | Freestyle exact chosen variant (five or more wins) | 2 | cell occupancy, no overwrites, simultaneous win prevention; Renju is separate if offered | five-in-a-row or full-board draw |
| 5 | Ludo | Four-token Ludo; selected six-entry and exact-finish variant | 2–4 | enter tokens, legal captures, safe squares, home exactness, 6 bonus chain cap | first player home with all tokens; placement for other seats |
| 6 | Property Empire | Original published property-trading house rules | 2–4 | tile ledger, auctions/trade contracts, rent, jail equivalent, insolvency and finite mode | last solvent player or finite cash/net-worth session scoring |
| 7 | Checkers | English draughts 8×8 | 2 | forced captures, continuing jump, crown timing, draw/repetition rule | elimination, no legal moves or documented draw |
| 8 | Othello | Standard 8×8 | 2 | at least one flip per legal move, forced pass, flipping all axes | both passed or full board, disc majority/draw |
| 9 | Backgammon | Standard backgammon, 15 checkers | 2 | doubles, bearing off, bar entry, blocked points, maximize used dice, gammon/backgammon | all checkers borne off; match score and optional doubling cube |
| 10 | Snakes & Ladders | Published finite 100-square board | 2–4 | one move then one snake/ladder landing, start/finish choice, no retrigger loops | first to target exactly as specified |
| 11 | Connect Four | 7 columns × 6 rows | 2 | column not full, gravity, horizontal/vertical/diagonal detection | four-in-a-row or full-board draw |
| 12 | Extended Tic-Tac-Toe | 15×15, five-in-a-row freestyle | 2 | occupied-cell rejection, line scan, tie if full | five-in-a-row or full-board draw |
| 13 | Mancala | Kalah, 6 pits and 4 stones per pit | 2 | own store, extra turns, empty-pit capture, endgame sweep | no legal sow/one side empty; store majority/draw |
| 14 | Dominoes | Draw dominoes with double-six set | 2–4 | matching ends, doubles, boneyard draw/pass, no tile duplication | hand empty or blocked game; lowest pips specified |
| 15 | Color Clash | Original packaging of classic UNO-style rules | 2–4 | color/number/action matching, Wild Draw Four challenge and eligibility, penalty and hand declaration; no default stacking | first to zero cards, round scoring policy |
| 16 | Tiến Lên Miền Nam | Published Southern Vietnam local variant | 4 default | 3♠ start option, singles/pairs/triples/straights and chop priority, passes, four-of-a-kind rules, last-card conditions | first empty hand; settlement for remaining players |
| 17 | Phỏm | Named Northern-style 9-card Phỏm variant | 4 default | discard/draw order, eating card rules, sending, Ù declaration, deadwood scoring | Ù or end of fourth turn / agreed scoring |
| 18 | Mậu Binh | Thirteen-card Chinese Poker local rank table | 2–4 | lock 3/5/5 with legal hierarchy, foul-hand detection, special hands defined | round-wise head-to-head hand settlement |
| 19 | Texas Hold'em | No-limit Texas Hold'em, tournament-sized virtual stacks | 2–6 | blind order, 4 streets, legal min-raise, side-pots, folded hands hidden, kicker and ties | hand showdown/folds; match by virtual stack finish |
| 20 | Contract Bridge | Duplicate-style contract Bridge basic board scoring | 4 (two teams) | complete legal auction, vulnerability, double/redouble, 13 tricks, follow-suit legality, dummy visibility | settled contract result after all tricks |
| 21 | Hearts | Standard four-player, queen of spades 13 points | 4 | passing direction cycle, opening lead restriction, breaking hearts, shooting moon choice | agreed target point threshold; fewest penalty points |
| 22 | Klondike Solitaire | Draw-one with unlimited stock passes explicitly labelled | 1 | tableau descending alternating colors, foundation ascending suits, empty King slot, redeal | all 52 cards in foundations or player concede/no-move resolution |
| 23 | Crazy Eights | Stated basic 52-card rules | 2–4 | same suit/rank or wildcard eight, legal draw/pass policy, stock reshuffle | first empty hand / score threshold |
| 24 | Cheat / Bluff | Four-player published I Doubt It variant | 3–6 | declared rank cycle, face-down count/secret, full challenge window, reveal and pickup | empty hand surviving challenge resolution |
| 25 | Memory Match | Finite matching-pair deck | 1–2 | shuffle seed, reveal exactly two, match removal, timed hide mismatch | all pairs claimed; match count comparison |
| 26 | Xì Dách | Published Vietnamese blackjack variant (regional switches visible) | 2–5 | role-dependent threshold, five-card rule, ace variants, pair/hand ranking and payout | dealer-vs-player hand settlement |
| 27 | Blackjack | Six-deck, dealer stands soft-17, natural 3:2 | 1 player + house bot | ace values, stand/hit/double/split/resplit cap, optional insurance, bust and pushes | per-hand resolved virtual payout |
| 28 | Slots | Three-/five-reel themed virtual slots with visible exact tables | 1 | chosen stop distribution, paylines/scatters, reel weights, bonus re-spin hard cap | bounded complete spin and settled virtual chips |
| 29 | Roulette | European single-zero | 1+ house | bet coverage, inside/outside payout, zero treatment, spin fairness | settled spin wins/losses |
| 30 | Baccarat | Standard Punto Banco | 1+ house | natural 8/9 and fixed player/banker third-card drawing tableau, tie payout | settled hand and visible paytable |
| 31 | Craps | Pass Line / Don't Pass base plus selected proposition bets | 1+ house | come-out 7/11/2/3/12, point establish, seven-out, wager limits | come-out or point resolution |
| 32 | Video Poker | Jacks or Better, five-card draw | 1 | exact hand ranking/paytable and limited held-card redraw | one hand settled from fixed finite shoe |
| 33 | Sic Bo | Three-dice virtual Sic Bo, published bet odds | 1+ house | total, doubles, triples, payout table and three-dice sample | each roll settles all accepted bets |
| 34 | Keno | Stated 1–10 picks on 1–80 board | 1 | 20 nonrepeating numbers, ticket matching, visible fixed paytable | one complete ticket draw and payout |
| 35 | Plinko | Branded-original geometry with discrete visible bucket odds | 1 | finite pins, reproducible bucket resolution, visual simulation follows recorded outcome | each drop resolves a bucket reward |
| 36 | Dice Arena | Original three-round dice combination game | 2–4 | rerolls limited, locked dice, category scoring once only | all scoring rounds completed, highest total |
| 37 | Prize Wheel | Original finite weighted virtual wheel | 1 | exact published sector weights and reward rules, single bounded spin | spin stops and prize settles |
| 38 | Scratch Cards | Original fixed 3×3 virtual reveal/paytable | 1 | seed-fixed hidden outcome, reveal animations do not alter prize, no repeat settlement | all required cells revealed / ticket redeemed once |

## Important product decisions to resolve in a game-specific specification

1. **Named local variants are not silent approximations.** Different houses disagree about Xì Dách, Phỏm and Tiến Lên details; show the variant name/setting and publish exact ranking and scoring tables before implementing the corresponding plugin.
2. **Original intellectual property:** original artwork, audio, card layout and product branding are mandatory wherever third-party source games or casino brand-like names might be protected; obtain permission if the final commercial release uses protected marks/assets. Basic traditional games do not imply rights to somebody else's artwork.
3. **Single-player originals:** preserve their native solo rules. For fusion tournament and bot-vs-bot comparisons, pair parallel seeded solo sessions and compare published progress metrics without claiming it is a standard multiplayer version.
4. **Forfeit/stalemate:** if there is no legal action but native game allows a pass or draw, expose that correctly. Player inactivity is handled separately by a user-controlled local session timeout option, not an invented original game rule.
5. **Casino disclosure:** there is no monetary redemption. Every virtual game discloses table/reel odds and the "for entertainment only" message. Randomness must be replayable by seed for internal QA, and impossible states/paytables receive invariant tests.

## Per-plugin artifact checklist

Before flipping a plugin to ready: bilingual tutorial and exact variant disclosure; named action schema and validator; immutable deterministic reducer; valid action/terminal fixtures; seeded versus seeded worker smoke; golden board state snapshots; native module serialization migration; accessible legal-target representation; Pixi 60-FPS budget target; headless draw/pass edge cases; enabled Fusion adapter capability list; bundled asset licenses; offline packaged app walkthrough.
