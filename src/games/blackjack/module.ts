import type { BotObservation, GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, RuntimeContext, SetupConfig, Tutorial } from '../../contracts/types';
import { descriptor } from './descriptor';
import { canSplit, handValue, isBlackjack, nextUnfinished, restoreBlackjack, settleBlackjack, setupBlackjack, type BlackjackHand, type BlackjackState } from './rules';

export interface BlackjackAction extends GameAction { readonly type:'hit'|'stand'|'double'|'split'|'insurance'|'decline-insurance'; readonly payload:{}; }
function optionNumber(options:JsonObject,key:string,fallback:number):number { const v=options[key]; return typeof v==='number'?v:fallback; }
function outcome(state:BlackjackState):Outcome|null {
  if(state.phase!=='completed') return null;
  return {terminal:true,reason:state.balance>state.initialBalance?'victory':state.balance===state.initialBalance?'draw':'round-limit',winningPlayers:state.balance>state.initialBalance?[state.player]:[],scoreboard:{[state.player]:state.balance,net:state.balance-state.initialBalance}};
}
function finishIfNeeded(state:BlackjackState):BlackjackState { return state.stage==='dealer'?settleBlackjack(state):state; }

export const blackjack:IGameModule<BlackjackState,BlackjackAction>={
  descriptor,
  setup(config:SetupConfig,context:RuntimeContext){if(config.players.length!==1)throw new Error('Blackjack requires exactly one player');return setupBlackjack(config.players[0]!.id,context.rng,optionNumber(config.options,'decks',6),optionNumber(config.options,'chips',1000),optionNumber(config.options,'wager',10));},
  legalActions(s,actor){
    if(s.phase!=='playing'||actor!==s.activePlayer)return [];
    if(s.stage==='insurance')return s.balance>=s.hands[0]!.wager/2 ? [{type:'insurance',actor,payload:{}},{type:'decline-insurance',actor,payload:{}}] : [{type:'decline-insurance',actor,payload:{}}];
    if(s.stage!=='player')return [];
    const h=s.hands[s.activeHand]!,actions:BlackjackAction[]=[{type:'hit',actor,payload:{}},{type:'stand',actor,payload:{}}];
    if(h.cards.length===2&&s.balance>=h.wager)actions.push({type:'double',actor,payload:{}});
    if(canSplit(h)&&s.balance>=h.wager&&s.hands.length<4)actions.push({type:'split',actor,payload:{}});
    return actions;
  },
  parseAction(input){if(!input||typeof input!=='object')return null;const a=input as Record<string,unknown>;if(!['hit','stand','double','split','insurance','decline-insurance'].includes(String(a['type']))||!['p1','p2','p3','p4'].includes(String(a['actor']))||!a['payload']||typeof a['payload']!=='object')return null;return {type:a['type'],actor:a['actor'],payload:{}} as BlackjackAction;},
  validate(s,a){return {valid:this.legalActions(s,a.actor).some(x=>x.type===a.type),errorCode:'blackjack.action.illegal'};},
  reduce(s,a,_context){
    if(!this.validate(s,a).valid)throw new Error('Illegal Blackjack action');
    let next:BlackjackState=s; const events:GameEvent[]=[];
    const take=()=>{const shoe=next.shoe.slice(),card=shoe.pop();if(!card)throw new Error('Blackjack shoe exhausted');next={...next,shoe};return card;};
    if(a.type==='insurance'||a.type==='decline-insurance'){
      const amount=a.type==='insurance'?s.hands[0]!.wager/2:0;
      next={...s,insurance:amount,balance:s.balance-amount,stage:'player',revision:s.revision+1,turnNumber:s.turnNumber+1};
      if(handValue(s.dealer).total===21||isBlackjack(s.hands[0]!))next=settleBlackjack(next);
      events.push({id:`insurance-${next.revision}`,type:'bet.placed',turn:s.turnNumber,actor:a.actor,payload:{insurance:amount}});
    } else if(a.type==='hit'){
      const card=take(),hands=next.hands.slice(),h=hands[s.activeHand]!;const updated:BlackjackHand={...h,cards:[...h.cards,card],finished:handValue([...h.cards,card]).total>=21};hands[s.activeHand]=updated;
      next={...next,hands,revision:s.revision+1,turnNumber:s.turnNumber+1};if(updated.finished)next=nextUnfinished(next,hands);next=finishIfNeeded(next);
      events.push({id:`hit-${next.revision}`,type:'card.drawn',turn:s.turnNumber,actor:a.actor,payload:{count:1}});
    } else if(a.type==='stand'){
      const hands=s.hands.slice();hands[s.activeHand]={...hands[s.activeHand]!,finished:true};next=nextUnfinished({...s,revision:s.revision+1,turnNumber:s.turnNumber+1},hands);next=finishIfNeeded(next);
    } else if(a.type==='double'){
      const card=take(),hands=next.hands.slice(),h=hands[s.activeHand]!;hands[s.activeHand]={...h,cards:[...h.cards,card],wager:h.wager*2,doubled:true,finished:true};next={...next,balance:s.balance-h.wager,revision:s.revision+1,turnNumber:s.turnNumber+1};next=nextUnfinished(next,hands);next=finishIfNeeded(next);
      events.push({id:`double-${next.revision}`,type:'bet.placed',turn:s.turnNumber,actor:a.actor,payload:{wager:h.wager*2}});
    } else {
      const h=s.hands[s.activeHand]!,left=h.cards[0]!,right=h.cards[1]!;const leftCard=take(),rightCard=take();
      const splitAces=left.rank==='A'&&right.rank==='A';
      const hands=s.hands.slice();hands.splice(s.activeHand,1,{cards:[left,leftCard],wager:h.wager,finished:splitAces,doubled:false,fromSplit:true,result:null},{cards:[right,rightCard],wager:h.wager,finished:splitAces,doubled:false,fromSplit:true,result:null});
      next={...next,hands,balance:s.balance-h.wager,revision:s.revision+1,turnNumber:s.turnNumber+1};
      if(splitAces)next=finishIfNeeded(nextUnfinished(next,hands));
      events.push({id:`split-${next.revision}`,type:'bet.placed',turn:s.turnNumber,actor:a.actor,payload:{split:true}});
    }
    const out=outcome(next);if(out)events.push({id:`end-${next.revision}`,type:'round.ended',turn:next.turnNumber,actor:a.actor,payload:{balance:next.balance}});
    return {state:next,events,outcome:out};
  },
  outcome,
  botObservation(s,actor):BotObservation {const visible={...this.serialize(s),dealer:[s.dealer[0]!,{hidden:true}]} as JsonObject;return {gameId:descriptor.id,playerId:actor,visibleState:visible,availableActions:this.legalActions(s,actor)};},
  scene(s,viewer){const reveal=s.phase==='completed';return {boardType:'blackjack-table',layers:[{kind:'dealer',cards:reveal?s.dealer:[s.dealer[0]!,{hidden:true}]} as unknown as JsonObject,{kind:'player-hands',hands:viewer===s.player?s.hands.map(h=>({cards:h.cards,wager:h.wager,result:h.result})):[]} as unknown as JsonObject],accessibleDescription:`Blackjack round. ${s.hands.length} player hand(s); dealer shows ${s.dealer[0]?.rank}. For entertainment only; no real-money gambling.`};},
  tutorial(locale:Locale):Tutorial{return {id:descriptor.tutorialId,locale,paragraphs:locale==='vi'?[
    {title:'Chỉ để giải trí',body:'Toàn bộ chip là ảo, không thể mua, rút hoặc đổi thành tiền thật.'},
    {title:'Mục tiêu',body:'Đạt gần 21 hơn nhà cái mà không vượt 21. Át tính 1 hoặc 11; nhà cái đứng ở mọi 17, kể cả soft 17.'},
    {title:'Tùy chọn',body:'Blackjack tự nhiên trả 3:2. Có thể double với hai lá (kể cả sau split), split tối đa bốn tay; mỗi tay split Át chỉ nhận thêm một lá. Insurance bằng nửa cược khi nhà cái lộ Át và trả 2:1.'}
  ]:[
    {title:'Entertainment only',body:'All chips are virtual and cannot be bought, withdrawn, or exchanged for money.'},
    {title:'Goal',body:'Get closer to 21 than the dealer without going over. Aces count as 1 or 11; the dealer stands on every 17, including soft 17.'},
    {title:'Options',body:'A natural blackjack pays 3:2. You may double any two-card hand (including after a split) and split up to four hands; split Aces receive one card each. Half-bet insurance against a dealer Ace pays 2:1.'}
  ]};},
  serialize(s){return s as unknown as JsonObject;},
  deserialize(serialized,fromVersion){if(fromVersion!==descriptor.rulesetVersion)throw new Error('Unsupported Blackjack save version');return restoreBlackjack(serialized);}
};
