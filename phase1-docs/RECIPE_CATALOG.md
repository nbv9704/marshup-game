# Handcrafted Fusion Recipe Catalog

> PHASE 1 SPECIFICATION, not executable gameplay. The first 6 entries instantiate the user-provided examples; 30 additional entries are original designs. Ordered pairs are distinct.

All handcrafted recipes are validated against base-game move legality, include bounded event chains, and must have deterministic legal fallbacks before their cards appear in a shipping build. The same source names are implementation labels rather than any assertion of endorsement by game IP owners.

## HC-01 — Chromatic Chess (chess + uno)

**Event trigger:** on turn end; max one drawn card per completed turn

Chess moves stay legal; after a completed nonterminal move, draw one effect card. +2 restores up to two safely placeable captured non-king pieces; Reverse flips camera and pawn-forward orientation for future turns; Skip consumes the opponent action only if not in check; Wild transforms one non-king piece while preserving legal king safety; +4 attempts one safe non-king enemy removal. If an effect has no legal target, convert it to one capped Fusion Energy.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-02 — Twenty-One Sprint (ludo + blackjack)

**Event trigger:** at movement-roll replacement

Replace the Ludo die with an optional blackjack-style draw sequence; hand value determines steps, capped by normal movement legality. Over 21 forfeits the turn; exactly 21 earns one extra turn only once in a row. Player chooses a legal pawn after value locks.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-03 — Jackpot River (holdem + slots)

**Event trigger:** at end of betting street

At each betting street, a three-reel virtual slot spin gives one of: a bounded payout multiplier, two candidate community river cards (choose one before showdown), or no bonus. Exactly five community cards remain in play; all hands still use five-card poker evaluation.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-04 — Roulette River (xiangqi + roulette)

**Event trigger:** before legal capture resolution

When a legally proposed capture would occur, spin red/black. Red completes it; black cancels the capture and uses a legal non-capture move instead chosen from available moves. If no substitute exists, original legal capture proceeds; never leave a general illegally exposed.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-05 — Chance Colors (property + uno)

**Event trigger:** on event tile landing

Replace original event-deck draws on Chance-style property tiles with color-effect cards. Rent, bankruptcy, auctions and property ownership remain the base rules. Color effects are finite and can never force negative transactions without a bankruptcy settlement.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-06 — Plinko Path (snakes + plinko)

**Event trigger:** on move source selection

Replace each movement die with a bounded offline Plinko drop into 1–6 step buckets; then process the original snake or ladder landing exactly once. Extra effects cannot recursively retrigger movement.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-07 — Rainbow Five (gomoku + uno)

**Event trigger:** after legal stone placement

Place one legal stone first, then draw one color card. Skip prevents an opponent bonus card, not their required stone; Wild grants one predeclared blocked coordinate but only while at least two legal cells remain. Five-in-a-row remains primary victory.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-08 — Crown Twenty-One (checkers + blackjack)

**Event trigger:** after legal move

Following a legal move, draw or hold for points. Exactly 21 grants one eligible man a crown at the end of the turn; bust grants none. Mandatory captures, multi-jumps and loss conditions remain valid.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-09 — Reel Reversi (othello + slots)

**Event trigger:** after legal flip

Following a legal flipping move, spin; matching symbols add one short-lived disc shield which blocks one future bonus modification, never an ordinary legal flip. No legal placement is introduced.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-10 — Red Stone Go (go + roulette)

**Event trigger:** after capture

After a valid group capture, spin for bonus endgame points (red +1, black +0), capped per match. Ko/superko and base captures never become optional.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-11 — Four-Color Drop (connect4 + uno)

**Event trigger:** after legal gravity placement

After dropping a legal disc, draw a card. Reverse swaps cosmetic lane controls, while Wild grants one skip-token preventing an opponent bonus only. Gravity and four-in-a-row stay unchanged.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-12 — Dice Grid (tictactoe + dice)

**Event trigger:** after legal placement

A roll after each legal placement can award a once-per-match bonus token that replaces one empty cell with your mark on a separate bonus grid. Original line completion remains decisive.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-13 — Plinko Seeds (mancala + plinko)

**Event trigger:** after legal sow

After a legal sow, drop a Plinko ball to add 0–2 stones to a separate score bank. Existing sowing and capture logic stays valid; bonus bank breaks tied games only.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-14 — Backgammon Royale (backgammon + roulette)

**Event trigger:** after hit

On a legal hit, a roulette result may grant a one-use future payout shield in Fusion scoring; it never cancels a hit or changes checker movement.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-15 — Jackpot Dominoes (dominoes + slots)

**Event trigger:** round setup

At the start of each round, slots optionally award one replacement tile from a legal finite reserve; if no legal use exists, convert award to capped points. Round ends normally when blocked or empty.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-16 — Colorful Ladders (snakes + uno)

**Event trigger:** after snake/ladder trigger

Only after a snake or ladder triggers, draw one card that modifies the next movement by at most two squares; Skip cancels a rival bonus draw but not the rival move.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-17 — Royal Twenty-One (chess + blackjack)

**Event trigger:** after legal move

After each legal move, optionally draw for a capped risk-reward Fusion shield usable by a non-king piece. Bust loses the shield; king checks, castling and promotion are unchanged.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-18 — Five-Color Generals (xiangqi + uno)

**Event trigger:** after legal move

After each legal move, one card grants a temporary bonus. Skip suppresses an opponent bonus, not any mandatory general escape; no effect can breach palace or river movement legality.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-19 — Chromatic Ludo (ludo + uno)

**Event trigger:** after legal movement

After a normal legal die move, draw once: +2 gives a capped optional extra track movement where legal; Reverse changes turn order after the current turn; Skip affects next eligible player.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-20 — Roulette Grid (gomoku + roulette)

**Event trigger:** after legal placement

After placing a legal stone, spin to choose which of two optional neutral barrier locations appears for one turn. Neither can overwrite a stone or cause a full board soft lock.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-21 — Jump Colors (checkers + uno)

**Event trigger:** after full multi-jump sequence

After a completed legal turn, +2 crowns one eligible man if available; Reverse toggles who receives the next optional bonus, not board ownership; all forced captures stand.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-22 — Twenty-One Discs (othello + blackjack)

**Event trigger:** after legal placement

After legal flips, optionally draw for up to three capped Fusion points credited only after final disc scoring; over 21 earns zero bonus. Legal move/pass obligations remain.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-23 — Zen Plinko (go + plinko)

**Event trigger:** after captured group

Each legal captured group unlocks one Plinko drop worth 0–2 bounded komi-style Fusion points; superko, passing and territory accounting remain the base rules.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-24 — Roulette Four (connect4 + roulette)

**Event trigger:** before legal drop

Before a normal legal drop, spin for a temporary point multiplier on a secondary challenge track. Spin never selects an illegal column or cancels gravity.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-25 — Roulette Hearts (hearts + roulette)

**Event trigger:** after trick completion

At the end of each trick, a spin picks the next trick as worth 0 or 1 bonus points toward a capped side challenge. Standard Hearts penalty and shooting the moon are unaffected.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-26 — Tiến Lên Colors (tienlen + uno)

**Event trigger:** after legal lead

After a valid lead, draw one modifier: Reverse rotates active player order; Skip counts as a pass only where passing is allowed and cannot remove the lead players mandatory action.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-27 — Phỏm Reels (phom + slots)

**Event trigger:** on hand setup

A once-per-hand reel grant offers a single marked wildcard for constructing an optional Fusion side meld; primary Phỏm scoring and legal original discards remain separate.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-28 — Mậu Binh Roulette (maubinh + roulette)

**Event trigger:** pre-reveal arrangement

A pre-reveal red result permits one additional rearrangement of the existing 13 cards before locking 3+5+5. Foul-hand detection still applies.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-29 — Contract Dice (bridge + dice)

**Event trigger:** after 13th trick

At the end of each complete 13-trick board, roll for a small capped side-point award. Bidding, legal follows, declarer play and duplicate contract score are unchanged.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-30 — Klondike Plinko (solitaire + plinko)

**Event trigger:** after tableau streak

On earning a legal tableau move streak, a Plinko drop chooses one of up to three eligible hints; if none are available, award zero. Hints never secretly change stock order.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-31 — Eight-Reel Mayhem (crazyeights + slots)

**Event trigger:** turn start

At the start of each turn, a slot outcome grants a one-use avoidance of a penalty draw; if it has no legal use, grant score only. Matching rules remain intact.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-32 — Roulette Bluff (cheat + roulette)

**Event trigger:** after claim before challenge

Following a normal valid card claim, roulette decides which eligible opponent gets first challenge priority; every player still has an opportunity according to defined challenge window.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-33 — Memory Drop (memory + plinko)

**Event trigger:** after matched pair

After matching a pair, Plinko can award one short-lived peek at the back of one unrevealed card. Matched card removal and pair validation remain standard.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-34 — Double Color Twenty-One (blackjack + roulette)

**Event trigger:** after hand resolution

A standard blackjack hand fully resolves first. Afterwards a red/black spin can multiply virtual bonus chips on a win within a stated cap; pushes and losses are never reclassified.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-35 — Scratch the Reels (slots + scratch)

**Event trigger:** after spin

After each completed slot spin, a scratch card reveals one of three finite side-bonus tiles. One bonus respin maximum; no recursive free spins.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.

## HC-36 — Punto Plinko (baccarat + plinko)

**Event trigger:** after settled hand

Play standard third-card tableau without interference; winning hands earn one bounded Plinko-based side-score modifier afterwards. Bankroll uses virtual chips only.

**Illegal-action fallback:** If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring.
