import type { GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, RuntimeContext, SetupConfig } from '../../contracts/types';
import { descriptor } from './descriptor';
import { newSlotsState,payout,restoreSlotsState,spinSlots,stopSlots,type SlotsState } from './rules';

type SlotsAction =
  | GameAction & {readonly type:'spin';readonly actor:'p1';readonly payload:{readonly bet:number}}
  | GameAction & {readonly type:'stop';readonly actor:'p1';readonly payload:Record<string,never>};
const outcome=(s:SlotsState):Outcome|null=>s.phase==='completed'?{terminal:true,reason:'round-limit',winningPlayers:s.credits>=100?['p1']:[],scoreboard:{credits:s.credits,net:s.credits-100,spins:s.spins}}:null;
export const slots:IGameModule<SlotsState,SlotsAction>={
  descriptor,
  setup(_config:SetupConfig){return newSlotsState();},
  legalActions(s,actor){if(actor!=='p1'||s.phase!=='playing')return[];const actions:SlotsAction[]=[1,5,10].filter(b=>b<=s.credits).map(b=>({type:'spin',actor:'p1',payload:{bet:b}}));actions.push({type:'stop',actor:'p1',payload:{}});return actions;},
  parseAction(input){if(!input||typeof input!=='object')return null;const a=input as Record<string,unknown>,p=a['payload'];if(a['actor']!=='p1'||!p||typeof p!=='object')return null;
    if(a['type']==='stop')return{type:'stop',actor:'p1',payload:{}} as SlotsAction;
    const bet=(p as Record<string,unknown>)['bet'];return a['type']==='spin'&&typeof bet==='number'&&[1,5,10].includes(bet)?{type:'spin',actor:'p1',payload:{bet}}:null;},
  validate(s,a){return{valid:s.phase==='playing'&&a.actor==='p1'&&(a.type==='stop'||a.payload.bet<=s.credits),errorCode:'slots.action-illegal'};},
  reduce(s,a,context:RuntimeContext){const next=a.type==='spin'?spinSlots(s,a.payload.bet,context.rng):stopSlots(s);const events:GameEvent[]=[a.type==='spin'?{id:`spin-${next.revision}`,type:'spin.completed',turn:s.turnNumber,actor:'p1',payload:{reels:next.reels,bet:a.payload.bet,win:next.lastWin}}:{id:`end-${next.revision}`,type:'game.ended',turn:s.turnNumber,actor:'p1',payload:{credits:next.credits}}];return{state:next,events,outcome:outcome(next)};},
  outcome,
  botObservation(s){return{gameId:descriptor.id,playerId:'p1',visibleState:this.serialize(s),availableActions:this.legalActions(s,'p1')};},
  scene(s){return{boardType:'slot-machine',layers:[{kind:'reels',values:s.reels} as JsonObject,{kind:'bank',credits:s.credits,lastBet:s.lastBet,lastWin:s.lastWin,spins:s.spins} as JsonObject],accessibleDescription:`Three reels: ${s.reels.join(', ')}. ${s.credits} credits.`};},
  tutorial(locale:Locale){return{id:descriptor.tutorialId,locale,paragraphs:locale==='vi'?[{title:'Cách chơi',body:'Chọn mức cược 1, 5 hoặc 10 xu rồi quay ba cuộn. Ván kết thúc sau 20 lượt hoặc khi hết xu.'},{title:'Trả thưởng',body:'Ba số 7 trả 50×; kim cương 20×; chuông 10×; chanh 6×; cherry 4×. Hai cherry trả 2× và một cherry hoàn cược.'},{title:'Lưu ý',body:'Xu chỉ dùng để giải trí, không có giá trị tiền thật.'}]:[{title:'Play',body:'Choose a 1, 5 or 10 credit bet and spin three reels. A session ends after 20 spins or when credits run out.'},{title:'Paytable',body:'Three sevens pay 50×; diamonds 20×; bells 10×; lemons 6×; cherries 4×. Two cherries pay 2× and one cherry returns the bet.'},{title:'Notice',body:'Credits are for entertainment only and have no cash value.'}]};},
  serialize(s){return{...s} as unknown as JsonObject;},deserialize(v,version){if(version!==descriptor.rulesetVersion)throw new Error('Unsupported slots save version');return restoreSlotsState(v);}
};
