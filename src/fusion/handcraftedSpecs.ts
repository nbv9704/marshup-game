/** All 36 authored *design specifications*; no executable mechanics in Phase 1. */
export interface HandcraftedSpec {
  readonly id: string;
  readonly base: string;
  readonly modifier: string;
  readonly name: string;
  readonly designClassification: 'hand-tuned' | 'additional';
  readonly trigger: string;
  readonly rule: string;
  readonly safetyFallback: string;
}
export const HANDCRAFTED_SPECS: readonly HandcraftedSpec[] = [
  {
    "id": "HC-01",
    "base": "chess",
    "modifier": "uno",
    "name": "Chromatic Chess",
    "designClassification": "hand-tuned",
    "trigger": "on turn end; max one drawn card per completed turn",
    "rule": "Chess moves stay legal; after a completed nonterminal move, draw one effect card. +2 restores up to two safely placeable captured non-king pieces; Reverse flips camera and pawn-forward orientation for future turns; Skip consumes the opponent action only if not in check; Wild transforms one non-king piece while preserving legal king safety; +4 attempts one safe non-king enemy removal. If an effect has no legal target, convert it to one capped Fusion Energy.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-02",
    "base": "ludo",
    "modifier": "blackjack",
    "name": "Twenty-One Sprint",
    "designClassification": "hand-tuned",
    "trigger": "at movement-roll replacement",
    "rule": "Replace the Ludo die with an optional blackjack-style draw sequence; hand value determines steps, capped by normal movement legality. Over 21 forfeits the turn; exactly 21 earns one extra turn only once in a row. Player chooses a legal pawn after value locks.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-03",
    "base": "holdem",
    "modifier": "slots",
    "name": "Jackpot River",
    "designClassification": "hand-tuned",
    "trigger": "at end of betting street",
    "rule": "At each betting street, a three-reel virtual slot spin gives one of: a bounded payout multiplier, two candidate community river cards (choose one before showdown), or no bonus. Exactly five community cards remain in play; all hands still use five-card poker evaluation.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-04",
    "base": "xiangqi",
    "modifier": "roulette",
    "name": "Roulette River",
    "designClassification": "hand-tuned",
    "trigger": "before legal capture resolution",
    "rule": "When a legally proposed capture would occur, spin red/black. Red completes it; black cancels the capture and uses a legal non-capture move instead chosen from available moves. If no substitute exists, original legal capture proceeds; never leave a general illegally exposed.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-05",
    "base": "property",
    "modifier": "uno",
    "name": "Chance Colors",
    "designClassification": "hand-tuned",
    "trigger": "on event tile landing",
    "rule": "Replace original event-deck draws on Chance-style property tiles with color-effect cards. Rent, bankruptcy, auctions and property ownership remain the base rules. Color effects are finite and can never force negative transactions without a bankruptcy settlement.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-06",
    "base": "snakes",
    "modifier": "plinko",
    "name": "Plinko Path",
    "designClassification": "hand-tuned",
    "trigger": "on move source selection",
    "rule": "Replace each movement die with a bounded offline Plinko drop into 1–6 step buckets; then process the original snake or ladder landing exactly once. Extra effects cannot recursively retrigger movement.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-07",
    "base": "gomoku",
    "modifier": "uno",
    "name": "Rainbow Five",
    "designClassification": "additional",
    "trigger": "after legal stone placement",
    "rule": "Place one legal stone first, then draw one color card. Skip prevents an opponent bonus card, not their required stone; Wild grants one predeclared blocked coordinate but only while at least two legal cells remain. Five-in-a-row remains primary victory.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-08",
    "base": "checkers",
    "modifier": "blackjack",
    "name": "Crown Twenty-One",
    "designClassification": "additional",
    "trigger": "after legal move",
    "rule": "Following a legal move, draw or hold for points. Exactly 21 grants one eligible man a crown at the end of the turn; bust grants none. Mandatory captures, multi-jumps and loss conditions remain valid.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-09",
    "base": "othello",
    "modifier": "slots",
    "name": "Reel Reversi",
    "designClassification": "additional",
    "trigger": "after legal flip",
    "rule": "Following a legal flipping move, spin; matching symbols add one short-lived disc shield which blocks one future bonus modification, never an ordinary legal flip. No legal placement is introduced.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-10",
    "base": "go",
    "modifier": "roulette",
    "name": "Red Stone Go",
    "designClassification": "additional",
    "trigger": "after capture",
    "rule": "After a valid group capture, spin for bonus endgame points (red +1, black +0), capped per match. Ko/superko and base captures never become optional.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-11",
    "base": "connect4",
    "modifier": "uno",
    "name": "Four-Color Drop",
    "designClassification": "additional",
    "trigger": "after legal gravity placement",
    "rule": "After dropping a legal disc, draw a card. Reverse swaps cosmetic lane controls, while Wild grants one skip-token preventing an opponent bonus only. Gravity and four-in-a-row stay unchanged.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-12",
    "base": "tictactoe",
    "modifier": "dice",
    "name": "Dice Grid",
    "designClassification": "additional",
    "trigger": "after legal placement",
    "rule": "A roll after each legal placement can award a once-per-match bonus token that replaces one empty cell with your mark on a separate bonus grid. Original line completion remains decisive.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-13",
    "base": "mancala",
    "modifier": "plinko",
    "name": "Plinko Seeds",
    "designClassification": "additional",
    "trigger": "after legal sow",
    "rule": "After a legal sow, drop a Plinko ball to add 0–2 stones to a separate score bank. Existing sowing and capture logic stays valid; bonus bank breaks tied games only.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-14",
    "base": "backgammon",
    "modifier": "roulette",
    "name": "Backgammon Royale",
    "designClassification": "additional",
    "trigger": "after hit",
    "rule": "On a legal hit, a roulette result may grant a one-use future payout shield in Fusion scoring; it never cancels a hit or changes checker movement.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-15",
    "base": "dominoes",
    "modifier": "slots",
    "name": "Jackpot Dominoes",
    "designClassification": "additional",
    "trigger": "round setup",
    "rule": "At the start of each round, slots optionally award one replacement tile from a legal finite reserve; if no legal use exists, convert award to capped points. Round ends normally when blocked or empty.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-16",
    "base": "snakes",
    "modifier": "uno",
    "name": "Colorful Ladders",
    "designClassification": "additional",
    "trigger": "after snake/ladder trigger",
    "rule": "Only after a snake or ladder triggers, draw one card that modifies the next movement by at most two squares; Skip cancels a rival bonus draw but not the rival move.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-17",
    "base": "chess",
    "modifier": "blackjack",
    "name": "Royal Twenty-One",
    "designClassification": "additional",
    "trigger": "after legal move",
    "rule": "After each legal move, optionally draw for a capped risk-reward Fusion shield usable by a non-king piece. Bust loses the shield; king checks, castling and promotion are unchanged.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-18",
    "base": "xiangqi",
    "modifier": "uno",
    "name": "Five-Color Generals",
    "designClassification": "additional",
    "trigger": "after legal move",
    "rule": "After each legal move, one card grants a temporary bonus. Skip suppresses an opponent bonus, not any mandatory general escape; no effect can breach palace or river movement legality.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-19",
    "base": "ludo",
    "modifier": "uno",
    "name": "Chromatic Ludo",
    "designClassification": "additional",
    "trigger": "after legal movement",
    "rule": "After a normal legal die move, draw once: +2 gives a capped optional extra track movement where legal; Reverse changes turn order after the current turn; Skip affects next eligible player.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-20",
    "base": "gomoku",
    "modifier": "roulette",
    "name": "Roulette Grid",
    "designClassification": "additional",
    "trigger": "after legal placement",
    "rule": "After placing a legal stone, spin to choose which of two optional neutral barrier locations appears for one turn. Neither can overwrite a stone or cause a full board soft lock.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-21",
    "base": "checkers",
    "modifier": "uno",
    "name": "Jump Colors",
    "designClassification": "additional",
    "trigger": "after full multi-jump sequence",
    "rule": "After a completed legal turn, +2 crowns one eligible man if available; Reverse toggles who receives the next optional bonus, not board ownership; all forced captures stand.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-22",
    "base": "othello",
    "modifier": "blackjack",
    "name": "Twenty-One Discs",
    "designClassification": "additional",
    "trigger": "after legal placement",
    "rule": "After legal flips, optionally draw for up to three capped Fusion points credited only after final disc scoring; over 21 earns zero bonus. Legal move/pass obligations remain.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-23",
    "base": "go",
    "modifier": "plinko",
    "name": "Zen Plinko",
    "designClassification": "additional",
    "trigger": "after captured group",
    "rule": "Each legal captured group unlocks one Plinko drop worth 0–2 bounded komi-style Fusion points; superko, passing and territory accounting remain the base rules.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-24",
    "base": "connect4",
    "modifier": "roulette",
    "name": "Roulette Four",
    "designClassification": "additional",
    "trigger": "before legal drop",
    "rule": "Before a normal legal drop, spin for a temporary point multiplier on a secondary challenge track. Spin never selects an illegal column or cancels gravity.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-25",
    "base": "hearts",
    "modifier": "roulette",
    "name": "Roulette Hearts",
    "designClassification": "additional",
    "trigger": "after trick completion",
    "rule": "At the end of each trick, a spin picks the next trick as worth 0 or 1 bonus points toward a capped side challenge. Standard Hearts penalty and shooting the moon are unaffected.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-26",
    "base": "tienlen",
    "modifier": "uno",
    "name": "Tiến Lên Colors",
    "designClassification": "additional",
    "trigger": "after legal lead",
    "rule": "After a valid lead, draw one modifier: Reverse rotates active player order; Skip counts as a pass only where passing is allowed and cannot remove the lead players mandatory action.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-27",
    "base": "phom",
    "modifier": "slots",
    "name": "Phỏm Reels",
    "designClassification": "additional",
    "trigger": "on hand setup",
    "rule": "A once-per-hand reel grant offers a single marked wildcard for constructing an optional Fusion side meld; primary Phỏm scoring and legal original discards remain separate.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-28",
    "base": "maubinh",
    "modifier": "roulette",
    "name": "Mậu Binh Roulette",
    "designClassification": "additional",
    "trigger": "pre-reveal arrangement",
    "rule": "A pre-reveal red result permits one additional rearrangement of the existing 13 cards before locking 3+5+5. Foul-hand detection still applies.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-29",
    "base": "bridge",
    "modifier": "dice",
    "name": "Contract Dice",
    "designClassification": "additional",
    "trigger": "after 13th trick",
    "rule": "At the end of each complete 13-trick board, roll for a small capped side-point award. Bidding, legal follows, declarer play and duplicate contract score are unchanged.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-30",
    "base": "solitaire",
    "modifier": "plinko",
    "name": "Klondike Plinko",
    "designClassification": "additional",
    "trigger": "after tableau streak",
    "rule": "On earning a legal tableau move streak, a Plinko drop chooses one of up to three eligible hints; if none are available, award zero. Hints never secretly change stock order.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-31",
    "base": "crazyeights",
    "modifier": "slots",
    "name": "Eight-Reel Mayhem",
    "designClassification": "additional",
    "trigger": "turn start",
    "rule": "At the start of each turn, a slot outcome grants a one-use avoidance of a penalty draw; if it has no legal use, grant score only. Matching rules remain intact.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-32",
    "base": "cheat",
    "modifier": "roulette",
    "name": "Roulette Bluff",
    "designClassification": "additional",
    "trigger": "after claim before challenge",
    "rule": "Following a normal valid card claim, roulette decides which eligible opponent gets first challenge priority; every player still has an opportunity according to defined challenge window.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-33",
    "base": "memory",
    "modifier": "plinko",
    "name": "Memory Drop",
    "designClassification": "additional",
    "trigger": "after matched pair",
    "rule": "After matching a pair, Plinko can award one short-lived peek at the back of one unrevealed card. Matched card removal and pair validation remain standard.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-34",
    "base": "blackjack",
    "modifier": "roulette",
    "name": "Double Color Twenty-One",
    "designClassification": "additional",
    "trigger": "after hand resolution",
    "rule": "A standard blackjack hand fully resolves first. Afterwards a red/black spin can multiply virtual bonus chips on a win within a stated cap; pushes and losses are never reclassified.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-35",
    "base": "slots",
    "modifier": "scratch",
    "name": "Scratch the Reels",
    "designClassification": "additional",
    "trigger": "after spin",
    "rule": "After each completed slot spin, a scratch card reveals one of three finite side-bonus tiles. One bonus respin maximum; no recursive free spins.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  },
  {
    "id": "HC-36",
    "base": "baccarat",
    "modifier": "plinko",
    "name": "Punto Plinko",
    "designClassification": "additional",
    "trigger": "after settled hand",
    "rule": "Play standard third-card tableau without interference; winning hands earn one bounded Plinko-based side-score modifier afterwards. Bankroll uses virtual chips only.",
    "safetyFallback": "If the effect would create an illegal or unavailable action, award at most one Fusion Energy (cap 3); after the configured action limit, resolve by documented match scoring."
  }
] as const;
