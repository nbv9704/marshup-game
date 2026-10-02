import type { JsonObject, PlayerId, RNG } from '../../contracts/types';

export type ClashColor = 'red' | 'yellow' | 'green' | 'blue';
export type ClashRank = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'skip'|'reverse'|'draw-two'|'wild'|'wild-draw-four';
export interface ClashCard { readonly id: string; readonly color: ClashColor | null; readonly rank: ClashRank; }
export interface WildChallenge {
  readonly offender: PlayerId;
  readonly challenger: PlayerId;
  readonly wasLegal: boolean;
}
export interface ColorClashState {
  readonly phase: 'playing'|'completed';
  readonly turnNumber: number;
  readonly activePlayer: PlayerId | null;
  readonly revision: number;
  readonly players: readonly PlayerId[];
  readonly hands: Readonly<Record<PlayerId, readonly ClashCard[]>>;
  readonly drawPile: readonly ClashCard[];
  readonly discardPile: readonly ClashCard[];
  readonly activeColor: ClashColor;
  readonly direction: 1|-1;
  /** A just-drawn playable card; only this card may be played before passing. */
  readonly drawnCardId: string | null;
  readonly challenge: WildChallenge | null;
  readonly winner: PlayerId | null;
}

const COLORS: readonly ClashColor[] = ['red','yellow','green','blue'];
const EMPTY_HANDS: Record<PlayerId, readonly ClashCard[]> = { p1:[], p2:[], p3:[], p4:[] };

export function createDeck(): ClashCard[] {
  const cards: ClashCard[] = [];
  for (const color of COLORS) {
    cards.push({ id:`${color}-0-0`, color, rank:'0' });
    for (let copy=0; copy<2; copy++) {
      for (let n=1; n<=9; n++) cards.push({ id:`${color}-${n}-${copy}`, color, rank:String(n) as ClashRank });
      for (const rank of ['skip','reverse','draw-two'] as const) cards.push({ id:`${color}-${rank}-${copy}`, color, rank });
    }
  }
  for (let copy=0; copy<4; copy++) {
    cards.push({ id:`wild-${copy}`, color:null, rank:'wild' });
    cards.push({ id:`wild-draw-four-${copy}`, color:null, rank:'wild-draw-four' });
  }
  return cards;
}

export function shuffle<T>(values: readonly T[], rng: RNG): T[] {
  const result = values.slice();
  for (let i=result.length-1; i>0; i--) {
    const j = rng.nextInt(i+1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function nextIndex(state: ColorClashState, from: PlayerId, steps=1): number {
  const start = state.players.indexOf(from);
  return (start + state.direction * steps % state.players.length + state.players.length) % state.players.length;
}
export function nextPlayer(state: ColorClashState, from: PlayerId, steps=1): PlayerId {
  return state.players[nextIndex(state, from, steps)]!;
}
export function isWild(card: ClashCard): boolean { return card.color === null; }
export function canPlay(card: ClashCard, state: ColorClashState): boolean {
  const top = state.discardPile[state.discardPile.length-1]!;
  return isWild(card) || card.color === state.activeColor || card.rank === top.rank;
}
export function canLegallyPlayWildDrawFour(state: ColorClashState, actor: PlayerId): boolean {
  return !state.hands[actor].some(card => card.color === state.activeColor);
}

export function drawCards(state: ColorClashState, count: number, rng: RNG): { cards: ClashCard[]; drawPile: ClashCard[]; discardPile: ClashCard[] } {
  let drawPile = state.drawPile.slice();
  let discardPile = state.discardPile.slice();
  const cards: ClashCard[] = [];
  while (cards.length < count) {
    if (!drawPile.length) {
      if (discardPile.length <= 1) break;
      const top = discardPile[discardPile.length-1]!;
      drawPile = shuffle(discardPile.slice(0,-1), rng);
      discardPile = [top];
    }
    const card = drawPile.pop();
    if (card) cards.push(card);
  }
  return { cards, drawPile, discardPile };
}

export function setupColorClash(players: readonly PlayerId[], rng: RNG): ColorClashState {
  if (players.length < 2 || players.length > 4 || new Set(players).size !== players.length) throw new Error('Color Clash needs 2-4 unique players');
  let pile = shuffle(createDeck(), rng);
  const hands: Record<PlayerId, ClashCard[]> = { p1:[], p2:[], p3:[], p4:[] };
  for (let round=0; round<7; round++) for (const player of players) hands[player].push(pile.pop()!);
  let first = pile.pop()!;
  while (first.color === null || first.rank === 'draw-two') {
    pile.unshift(first);
    first = pile.pop()!;
  }
  const base: ColorClashState = {
    phase:'playing', turnNumber:1, activePlayer:players[0]!, revision:0, players:[...players],
    hands:{ ...EMPTY_HANDS, ...hands }, drawPile:pile, discardPile:[first], activeColor:first.color!,
    direction: first.rank === 'reverse' ? -1 : 1, drawnCardId:null, challenge:null, winner:null
  };
  return { ...base, activePlayer: first.rank === 'skip' || (first.rank === 'reverse' && players.length === 2)
    ? nextPlayer(base, players[0]!) : players[0]! };
}

export function restoreColorClash(input: JsonObject): ColorClashState {
  const s = input as Record<string, unknown>;
  const validCard = (value: unknown): value is ClashCard => {
    if (!value || typeof value !== 'object') return false;
    const c=value as Record<string,unknown>;
    return typeof c['id']==='string' && (c['color']===null || COLORS.includes(c['color'] as ClashColor)) &&
      ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw-two','wild','wild-draw-four'].includes(String(c['rank']));
  };
  if (!Array.isArray(s['players']) || s['players'].length<2 || s['players'].length>4 ||
      !s['players'].every(p => ['p1','p2','p3','p4'].includes(String(p)))) throw new Error('Invalid Color Clash players');
  const hands=s['hands'];
  if (!hands || typeof hands!=='object') throw new Error('Invalid Color Clash hands');
  for (const id of ['p1','p2','p3','p4']) if (!Array.isArray((hands as Record<string,unknown>)[id]) || !((hands as Record<string,unknown>)[id] as unknown[]).every(validCard)) throw new Error('Invalid Color Clash hand');
  if (!Array.isArray(s['drawPile']) || !s['drawPile'].every(validCard) || !Array.isArray(s['discardPile']) || !s['discardPile'].every(validCard) || !s['discardPile'].length)
    throw new Error('Invalid Color Clash piles');
  if (!COLORS.includes(s['activeColor'] as ClashColor) || (s['direction']!==1 && s['direction']!==-1) || !Number.isSafeInteger(s['turnNumber']) || !Number.isSafeInteger(s['revision'])) throw new Error('Invalid Color Clash metadata');
  if (s['drawnCardId']!==null && typeof s['drawnCardId']!=='string') throw new Error('Invalid Color Clash drawn card');
  if (s['phase']!=='playing' && s['phase']!=='completed') throw new Error('Invalid Color Clash phase');
  if (s['activePlayer']!==null && !(s['players'] as unknown[]).includes(s['activePlayer'])) throw new Error('Invalid Color Clash turn');
  return input as unknown as ColorClashState;
}

export function chooseColorClashAction<T extends { readonly type:string; readonly payload: JsonObject }>(actions: readonly T[], hand: readonly ClashCard[]): T {
  if (!actions.length) throw new Error('No legal Color Clash action');
  const value = (a:T) => {
    if (a.type !== 'play') return -1;
    const card=hand.find(c => c.id === a.payload['cardId']);
    return card?.rank==='wild-draw-four' ? 50 : card?.rank==='draw-two' ? 40 : card?.rank==='skip' || card?.rank==='reverse' ? 30 : card?.rank==='wild' ? 10 : Number(card?.rank ?? 0);
  };
  return actions.slice().sort((a,b)=>value(b)-value(a))[0]!;
}
