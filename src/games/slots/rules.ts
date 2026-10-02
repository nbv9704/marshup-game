import type { GameState, PlayerId, RNG } from '../../contracts/types';

export const SLOT_SYMBOLS = ['cherry','lemon','bell','diamond','seven'] as const;
export type SlotSymbol = typeof SLOT_SYMBOLS[number];
export interface SlotsState extends GameState {
  readonly activePlayer:'p1'|null;
  readonly credits:number;
  readonly reels:readonly SlotSymbol[];
  readonly spins:number;
  readonly lastBet:number;
  readonly lastWin:number;
  readonly totalWagered:number;
  readonly totalWon:number;
}
const weights:readonly SlotSymbol[]=['cherry','cherry','cherry','lemon','lemon','lemon','bell','bell','diamond','seven'];
export function newSlotsState(credits=100):SlotsState {
  return {phase:'playing',turnNumber:1,activePlayer:'p1',revision:0,credits,reels:['cherry','lemon','bell'],spins:0,lastBet:0,lastWin:0,totalWagered:0,totalWon:0};
}
export function payout(reels:readonly SlotSymbol[],bet:number):number {
  const [a,b,c]=reels;
  if(a===b&&b===c) return bet*({cherry:4,lemon:6,bell:10,diamond:20,seven:50}[a!] ?? 0);
  if(reels.filter(x=>x==='cherry').length===2)return bet*2;
  if(reels.includes('cherry'))return bet;
  return 0;
}
export function spinSlots(state:SlotsState,bet:number,rng:RNG):SlotsState {
  if(state.phase!=='playing'||state.activePlayer!=='p1'||![1,5,10].includes(bet)||bet>state.credits)throw new Error('Illegal slot spin');
  const reels=Array.from({length:3},()=>weights[rng.nextInt(weights.length)]!) as SlotSymbol[];
  const win=payout(reels,bet),credits=state.credits-bet+win,spins=state.spins+1;
  const completed=spins>=20||credits<1;
  return {...state,reels,credits,spins,lastBet:bet,lastWin:win,totalWagered:state.totalWagered+bet,totalWon:state.totalWon+win,
    phase:completed?'completed':'playing',activePlayer:completed?null:'p1',turnNumber:state.turnNumber+1,revision:state.revision+1};
}
export function stopSlots(state:SlotsState):SlotsState {
  if(state.phase!=='playing')throw new Error('Slots already completed');
  return {...state,phase:'completed',activePlayer:null,revision:state.revision+1};
}
export function restoreSlotsState(value:unknown):SlotsState {
  if(!value||typeof value!=='object')throw new Error('Invalid slots state');
  const s=value as Record<string,unknown>,reels=s['reels'];
  if(!Array.isArray(reels)||reels.length!==3||!reels.every(x=>SLOT_SYMBOLS.includes(x as SlotSymbol)))throw new Error('Invalid reels');
  for(const key of ['credits','spins','lastBet','lastWin','totalWagered','totalWon','turnNumber','revision'])
    if(!Number.isSafeInteger(s[key])||Number(s[key])<0)throw new Error(`Invalid ${key}`);
  if(!['playing','completed'].includes(String(s['phase']))||!((s['phase']==='playing'&&s['activePlayer']==='p1')||(s['phase']==='completed'&&s['activePlayer']===null)))throw new Error('Invalid slots phase');
  return {phase:s['phase'] as SlotsState['phase'],activePlayer:s['activePlayer'] as SlotsState['activePlayer'],reels:[...reels] as SlotSymbol[],
    credits:Number(s['credits']),spins:Number(s['spins']),lastBet:Number(s['lastBet']),lastWin:Number(s['lastWin']),
    totalWagered:Number(s['totalWagered']),totalWon:Number(s['totalWon']),turnNumber:Number(s['turnNumber']),revision:Number(s['revision'])};
}
export function slotsActor(state:SlotsState):PlayerId|null{return state.activePlayer;}
