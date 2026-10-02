import type { JsonObject, PlayerId, RNG } from '../../contracts/types';

export type Suit = 'clubs'|'diamonds'|'hearts'|'spades';
export type Rank = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K';
export interface PlayingCard { readonly id:string; readonly suit:Suit; readonly rank:Rank; }
export interface BlackjackHand {
  readonly cards: readonly PlayingCard[];
  readonly wager: number;
  readonly finished: boolean;
  readonly doubled: boolean;
  readonly fromSplit: boolean;
  readonly result: 'blackjack'|'win'|'push'|'lose'|'bust'|null;
}
export interface BlackjackState {
  readonly phase:'playing'|'completed';
  readonly turnNumber:number;
  readonly activePlayer:PlayerId|null;
  readonly revision:number;
  readonly stage:'insurance'|'player'|'dealer'|'completed';
  readonly player:PlayerId;
  readonly shoe:readonly PlayingCard[];
  readonly dealer:readonly PlayingCard[];
  readonly hands:readonly BlackjackHand[];
  readonly activeHand:number;
  readonly balance:number;
  readonly insurance:number;
  readonly initialBalance:number;
}

const SUITS:readonly Suit[]=['clubs','diamonds','hearts','spades'];
const RANKS:readonly Rank[]=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export function createShoe(decks:number):PlayingCard[] {
  if (!Number.isInteger(decks) || decks<1 || decks>8) throw new Error('Shoe must contain 1-8 decks');
  const result:PlayingCard[]=[];
  for (let d=0;d<decks;d++) for (const suit of SUITS) for (const rank of RANKS) result.push({id:`${d}-${suit}-${rank}`,suit,rank});
  return result;
}
export function shuffle<T>(input:readonly T[],rng:RNG):T[] {
  const a=input.slice();
  for(let i=a.length-1;i>0;i--){const j=rng.nextInt(i+1);[a[i],a[j]]=[a[j]!,a[i]!];}
  return a;
}
export function handValue(cards:readonly PlayingCard[]):{total:number;soft:boolean} {
  let total=0,aces=0;
  for(const c of cards){if(c.rank==='A'){total+=11;aces++;} else total+=['J','Q','K'].includes(c.rank)?10:Number(c.rank);}
  while(total>21 && aces>0){total-=10;aces--;}
  return {total,soft:aces>0};
}
export function isBlackjack(hand:BlackjackHand):boolean { return !hand.fromSplit && hand.cards.length===2 && handValue(hand.cards).total===21; }
export function canSplit(hand:BlackjackHand):boolean {
  if(hand.cards.length!==2) return false;
  const value=(c:PlayingCard)=>['10','J','Q','K'].includes(c.rank)?10:c.rank;
  return value(hand.cards[0]!)===value(hand.cards[1]!);
}
export function setupBlackjack(player:PlayerId,rng:RNG,decks=6,initialBalance=1000,wager=10):BlackjackState {
  if(!Number.isFinite(initialBalance)||!Number.isFinite(wager)||wager<=0||wager>initialBalance) throw new Error('Invalid Blackjack bankroll or wager');
  const shoe=shuffle(createShoe(decks),rng);
  const take=()=>shoe.pop()!;
  const cards=[take(),take()];
  const dealer=[take(),take()];
  const state:BlackjackState={phase:'playing',turnNumber:1,activePlayer:player,revision:0,stage:dealer[0]!.rank==='A'?'insurance':'player',player,shoe,dealer,
    hands:[{cards,wager,finished:false,doubled:false,fromSplit:false,result:null}],activeHand:0,balance:initialBalance-wager,insurance:0,initialBalance};
  return dealer[0]!.rank!=='A' && (isBlackjack(state.hands[0]!) || handValue(dealer).total===21) ? settleBlackjack(state) : state;
}
function draw(shoe:readonly PlayingCard[]):{card:PlayingCard;shoe:PlayingCard[]} {
  const copy=shoe.slice(),card=copy.pop(); if(!card) throw new Error('Blackjack shoe exhausted'); return {card,shoe:copy};
}
export function settleBlackjack(state:BlackjackState):BlackjackState {
  let shoe=state.shoe.slice(),dealer=state.dealer.slice();
  if(!state.hands.every(h=>handValue(h.cards).total>21)) {
    while(true){const v=handValue(dealer);if(v.total>17 || v.total===17) break;const d=draw(shoe);shoe=d.shoe;dealer=[...dealer,d.card];}
  }
  const dealerValue=handValue(dealer).total,dealerBj=dealer.length===2&&dealerValue===21;
  let balance=state.balance;
  if(state.insurance>0 && dealerBj) balance+=state.insurance*3;
  const hands=state.hands.map(h=>{
    const total=handValue(h.cards).total;
    let result:BlackjackHand['result'];
    if(total>21) result='bust';
    else if(isBlackjack(h)&&!dealerBj) result='blackjack';
    else if(dealerBj) result=isBlackjack(h)?'push':'lose';
    else if(dealerValue>21||total>dealerValue) result='win';
    else if(total===dealerValue) result='push'; else result='lose';
    if(result==='blackjack') balance+=h.wager*2.5;
    else if(result==='win') balance+=h.wager*2;
    else if(result==='push') balance+=h.wager;
    return {...h,finished:true,result};
  });
  return {...state,shoe,dealer,hands,balance,phase:'completed',stage:'completed',activePlayer:null};
}
export function nextUnfinished(state:BlackjackState,hands:readonly BlackjackHand[]):BlackjackState {
  const next=hands.findIndex((h,i)=>i>state.activeHand&&!h.finished);
  return next>=0?{...state,hands,activeHand:next}:{...state,hands,stage:'dealer'};
}

export function restoreBlackjack(input:JsonObject):BlackjackState {
  const s=input as Record<string,unknown>;
  const card=(v:unknown):v is PlayingCard=>!!v&&typeof v==='object'&&typeof (v as Record<string,unknown>)['id']==='string'&&SUITS.includes((v as Record<string,unknown>)['suit'] as Suit)&&RANKS.includes((v as Record<string,unknown>)['rank'] as Rank);
  if(!['playing','completed'].includes(String(s['phase']))||!['insurance','player','dealer','completed'].includes(String(s['stage']))||!['p1','p2','p3','p4'].includes(String(s['player']))) throw new Error('Invalid Blackjack state');
  if(!Array.isArray(s['shoe'])||!s['shoe'].every(card)||!Array.isArray(s['dealer'])||s['dealer'].length<2||!s['dealer'].every(card)||!Array.isArray(s['hands'])||!s['hands'].length) throw new Error('Invalid Blackjack cards');
  for(const raw of s['hands']) { const h=raw as Record<string,unknown>; if(!h||!Array.isArray(h['cards'])||!h['cards'].every(card)||typeof h['wager']!=='number'||h['wager']<=0||typeof h['finished']!=='boolean') throw new Error('Invalid Blackjack hand'); }
  for(const key of ['turnNumber','revision','activeHand','balance','insurance','initialBalance']) if(typeof s[key]!=='number'||!Number.isFinite(s[key] as number)) throw new Error('Invalid Blackjack number');
  return input as unknown as BlackjackState;
}

export function chooseBlackjackAction<T extends {readonly type:string}>(state:BlackjackState,actions:readonly T[]):T {
  if(!actions.length) throw new Error('No legal Blackjack action');
  const get=(type:string)=>actions.find(a=>a.type===type);
  if(state.stage==='insurance') return (get('decline-insurance')??actions[0])!;
  const hand=state.hands[state.activeHand]!,value=handValue(hand.cards).total;
  if(get('split') && hand.cards[0]!.rank==='A') return get('split')!;
  if(get('double') && (value===10||value===11)) return get('double')!;
  return ((value<17?get('hit'):get('stand'))??actions[0])!;
}
