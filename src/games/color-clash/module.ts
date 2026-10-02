import type { BotObservation, GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, PlayerId, RuntimeContext, SetupConfig, Tutorial } from '../../contracts/types';
import { descriptor } from './descriptor';
import { canLegallyPlayWildDrawFour, canPlay, drawCards, nextPlayer, restoreColorClash, setupColorClash, type ClashColor, type ColorClashState } from './rules';

export interface ColorClashAction extends GameAction {
  readonly type: 'play'|'draw'|'pass'|'accept-draw-four'|'challenge-wild-draw-four';
  readonly payload: { readonly cardId?: string; readonly chosenColor?: ClashColor };
}
const COLORS: readonly ClashColor[] = ['red','yellow','green','blue'];

function result(state:ColorClashState): Outcome|null {
  if (state.phase!=='completed' || !state.winner) return null;
  const scores: Record<string,number> = {};
  const points=(rank:string)=>rank==='wild'||rank==='wild-draw-four'?50:rank==='skip'||rank==='reverse'||rank==='draw-two'?20:Number(rank);
  const winningScore=state.players.filter(p=>p!==state.winner).reduce((total,p)=>total+state.hands[p].reduce((sum,c)=>sum+points(c.rank),0),0);
  for (const p of state.players) scores[p]=p===state.winner ? winningScore : 0;
  return { terminal:true, reason:'victory', winningPlayers:[state.winner], scoreboard:scores };
}
function withDraw(state:ColorClashState, player:PlayerId, count:number, context:RuntimeContext):ColorClashState {
  const d=drawCards(state,count,context.rng);
  return { ...state, hands:{...state.hands,[player]:[...state.hands[player],...d.cards]}, drawPile:d.drawPile, discardPile:d.discardPile };
}

export const colorClash: IGameModule<ColorClashState,ColorClashAction> = {
  descriptor,
  setup(config,context) { return setupColorClash(config.players.map(p=>p.id),context.rng); },
  legalActions(s,actor) {
    if (s.phase!=='playing' || actor!==s.activePlayer) return [];
    if (s.challenge) return [
      {type:'accept-draw-four',actor,payload:{}},
      {type:'challenge-wild-draw-four',actor,payload:{}}
    ];
    if (s.drawnCardId) {
      const drawn=s.hands[actor].find(card=>card.id===s.drawnCardId);
      if (!drawn) return [];
      const plays:ColorClashAction[] = drawn.color===null
        ? COLORS.map(chosenColor=>({type:'play',actor,payload:{cardId:drawn.id,chosenColor}}))
        : [{type:'play',actor,payload:{cardId:drawn.id}}];
      return [...plays,{type:'pass',actor,payload:{}}];
    }
    const plays:ColorClashAction[]=[];
    for (const card of s.hands[actor]) if (canPlay(card,s)) {
      if (card.color===null) for (const chosenColor of COLORS) plays.push({type:'play',actor,payload:{cardId:card.id,chosenColor}});
      else plays.push({type:'play',actor,payload:{cardId:card.id}});
    }
    return [...plays,{type:'draw',actor,payload:{}}];
  },
  parseAction(input) {
    if (!input || typeof input!=='object') return null;
    const a=input as Record<string,unknown>, p=a['payload'];
    if (!['p1','p2','p3','p4'].includes(String(a['actor'])) || !p || typeof p!=='object') return null;
    if (!['play','draw','pass','accept-draw-four','challenge-wild-draw-four'].includes(String(a['type']))) return null;
    const payload=p as Record<string,unknown>;
    if (a['type']==='play' && typeof payload['cardId']!=='string') return null;
    if (payload['chosenColor']!==undefined && !COLORS.includes(payload['chosenColor'] as ClashColor)) return null;
    return {type:a['type'],actor:a['actor'],payload:{...(payload['cardId'] ? {cardId:payload['cardId']} : {}),...(payload['chosenColor'] ? {chosenColor:payload['chosenColor'] as ClashColor} : {})}} as ColorClashAction;
  },
  validate(s,a) {
    const legal=this.legalActions(s,a.actor);
    return {valid:legal.some(x=>x.type===a.type && x.payload.cardId===a.payload.cardId && x.payload.chosenColor===a.payload.chosenColor),errorCode:'color-clash.action.illegal'};
  },
  reduce(s,a,context) {
    if (!this.validate(s,a).valid) throw new Error('Illegal Color Clash action');
    let next:ColorClashState=s;
    const events:GameEvent[]=[];
    if (a.type==='draw') {
      next=withDraw(s,a.actor,1,context);
      const drawn=next.hands[a.actor].length>s.hands[a.actor].length ? next.hands[a.actor].at(-1) : undefined;
      const playable=drawn ? canPlay(drawn,s) : false;
      next={...next,drawnCardId:playable?drawn!.id:null,activePlayer:playable?a.actor:nextPlayer(next,a.actor),turnNumber:s.turnNumber+1,revision:s.revision+1};
      events.push({id:`draw-${next.revision}`,type:'card.drawn',turn:s.turnNumber,actor:a.actor,payload:{count:1}});
    } else if (a.type==='pass') {
      next={...s,drawnCardId:null,activePlayer:nextPlayer(s,a.actor),turnNumber:s.turnNumber+1,revision:s.revision+1};
    } else if (a.type==='accept-draw-four') {
      next=withDraw(s,a.actor,4,context);
      const winner=s.hands[s.challenge!.offender].length===0 ? s.challenge!.offender : null;
      next={...next,challenge:null,winner,phase:winner?'completed':'playing',activePlayer:winner?null:nextPlayer(next,a.actor),turnNumber:s.turnNumber+1,revision:s.revision+1};
      events.push({id:`draw4-${next.revision}`,type:'card.drawn',turn:s.turnNumber,actor:a.actor,payload:{count:4}});
    } else if (a.type==='challenge-wild-draw-four') {
      const c=s.challenge!;
      if (c.wasLegal) {
        next=withDraw(s,a.actor,6,context);
        const winner=s.hands[c.offender].length===0 ? c.offender : null;
        next={...next,challenge:null,winner,phase:winner?'completed':'playing',activePlayer:winner?null:nextPlayer(next,a.actor),turnNumber:s.turnNumber+1,revision:s.revision+1};
      } else {
        next=withDraw(s,c.offender,4,context);
        next={...next,challenge:null,activePlayer:a.actor,turnNumber:s.turnNumber+1,revision:s.revision+1};
      }
      events.push({id:`challenge-${next.revision}`,type:'card.drawn',turn:s.turnNumber,actor:c.wasLegal?a.actor:c.offender,payload:{count:c.wasLegal?6:4,challengeSucceeded:!c.wasLegal}});
    } else {
      const card=s.hands[a.actor].find(c=>c.id===a.payload.cardId)!;
      const wasLegal=card.rank==='wild-draw-four' ? canLegallyPlayWildDrawFour(s,a.actor) : true;
      const hands={...s.hands,[a.actor]:s.hands[a.actor].filter(c=>c.id!==card.id)};
      let direction=s.direction;
      if (card.rank==='reverse' && s.players.length>2) direction=direction===1?-1:1;
      next={...s,hands,discardPile:[...s.discardPile,card],activeColor:card.color ?? a.payload.chosenColor!,direction,drawnCardId:null,revision:s.revision+1,turnNumber:s.turnNumber+1};
      if (card.rank==='wild-draw-four') {
        const challenger=nextPlayer(next,a.actor);
        next={...next,activePlayer:challenger,challenge:{offender:a.actor,challenger,wasLegal}};
      } else if (hands[a.actor].length===0) next={...next,phase:'completed',activePlayer:null,winner:a.actor};
      else {
        const skip=card.rank==='skip' || (card.rank==='reverse' && s.players.length===2);
        const target=nextPlayer(next,a.actor);
        if (card.rank==='draw-two') {
          next=withDraw(next,target,2,context);
          next={...next,activePlayer:nextPlayer(next,target)};
        } else next={...next,activePlayer:nextPlayer(next,a.actor,skip?2:1)};
      }
      events.push({id:`play-${next.revision}`,type:'card.played',turn:s.turnNumber,actor:a.actor,payload:{cardId:card.id,rank:card.rank,color:next.activeColor}});
    }
    const out=result(next);
    if (out) events.push({id:`end-${next.revision}`,type:'game.ended',turn:next.turnNumber,actor:next.winner,payload:{winner:next.winner}});
    return {state:next,events,outcome:out};
  },
  outcome:result,
  botObservation(s,actor):BotObservation {
    const visible={...this.serialize(s),hands:{p1:s.hands.p1.length,p2:s.hands.p2.length,p3:s.hands.p3.length,p4:s.hands.p4.length,[actor]:s.hands[actor]}} as JsonObject;
    return {gameId:descriptor.id,playerId:actor,visibleState:visible,availableActions:this.legalActions(s,actor)};
  },
  scene(s,viewer) { return {boardType:'card-table',layers:[{kind:'discard',card:s.discardPile.at(-1)!,activeColor:s.activeColor} as unknown as JsonObject,{kind:'hands',counts:{p1:s.hands.p1.length,p2:s.hands.p2.length,p3:s.hands.p3.length,p4:s.hands.p4.length},viewerCards:viewer?s.hands[viewer]:[]} as unknown as JsonObject],accessibleDescription:`Color Clash. ${s.activePlayer ?? 'No player'} to act; active color ${s.activeColor}.`}; },
  tutorial(locale:Locale):Tutorial { return {id:descriptor.tutorialId,locale,paragraphs:locale==='vi' ? [
    {title:'Mục tiêu',body:'Đánh hết bài trước đối thủ bằng cách khớp màu, số hoặc biểu tượng. Đây là bộ bài và hình ảnh Color Clash nguyên bản.'},
    {title:'Lá hành động',body:'Khi rút được lá hợp lệ, bạn có thể đánh ngay lá vừa rút hoặc bỏ lượt. Skip bỏ lượt, Reverse đổi chiều (hoặc hoạt động như Skip khi có 2 người), Draw Two bắt người kế tiếp rút 2. Không cộng dồn hình phạt.'},
    {title:'Wild Draw Four',body:'Chỉ hợp lệ khi bạn không có lá trùng màu hiện tại. Người kế tiếp có thể nhận 4 lá hoặc thách thức; thách thức sai rút 6, đúng khiến người đánh rút 4.'}
  ]:[
    {title:'Goal',body:'Empty your hand first by matching color, number, or symbol. Color Clash uses original names and presentation.'},
    {title:'Action cards',body:'After drawing a playable card, you may immediately play only that card or pass. Skip misses a turn, Reverse changes direction (or acts as Skip with two players), and Draw Two makes the next player draw two. Penalties never stack.'},
    {title:'Wild Draw Four',body:'It is legal only with no card matching the active color. The next player may accept four cards or challenge; a failed challenge draws six, while a successful one makes the offender draw four.'}
  ]}; },
  serialize(s) { return s as unknown as JsonObject; },
  deserialize(serialized,fromVersion) { if (fromVersion!==descriptor.rulesetVersion) throw new Error('Unsupported Color Clash save version'); return restoreColorClash(serialized); }
};
