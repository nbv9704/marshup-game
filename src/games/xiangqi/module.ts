import type { GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, PlayerId, SetupConfig, Tutorial } from '../../contracts/types';
import { descriptor } from './descriptor';
import { applyXiangqiMove, createXiangqiState, legalXiangqiMoves, materialScore, restoreXiangqiState, type XiangqiMove, type XiangqiState } from './rules';

export interface XiangqiAction extends GameAction { readonly type:'move'; readonly actor:'p1'|'p2'; readonly payload:{ readonly pieceId:string; readonly toX:number; readonly toY:number }; }
function outcome(state:XiangqiState):Outcome|null {
  if (state.phase!=='completed') return null;
  const scoreboard:JsonObject={p1:materialScore(state,'p1'),p2:materialScore(state,'p2')};
  let winners:PlayerId[]=[];
  if (state.winner) winners=[state.winner];
  else if (state.terminalReason==='safety-limit') {
    const a=materialScore(state,'p1'),b=materialScore(state,'p2');
    winners=a===b?[]:a>b?['p1']:['p2'];
  }
  return {terminal:true,reason:state.terminalReason==='victory'?'victory':state.terminalReason==='draw'?'draw':'safety-limit',winningPlayers:winners,scoreboard};
}

export const xiangqi:IGameModule<XiangqiState,XiangqiAction>={
  descriptor,
  setup(_config:SetupConfig){return createXiangqiState();},
  legalActions(state,actor){return legalXiangqiMoves(state,actor).map(move=>({type:'move',actor:actor as 'p1'|'p2',payload:move}));},
  parseAction(input){
    if (!input||typeof input!=='object') return null;
    const a=input as Record<string,unknown>,p=a['payload'];
    if (a['type']!=='move'||!['p1','p2'].includes(String(a['actor']))||!p||typeof p!=='object') return null;
    const payload=p as Record<string,unknown>;
    return typeof payload['pieceId']==='string'&&Number.isInteger(payload['toX'])&&Number.isInteger(payload['toY'])&&
      (payload['toX'] as number)>=0&&(payload['toX'] as number)<9&&(payload['toY'] as number)>=0&&(payload['toY'] as number)<10
      ?{type:'move',actor:a['actor'] as 'p1'|'p2',payload:{pieceId:payload['pieceId'],toX:payload['toX'] as number,toY:payload['toY'] as number}}:null;
  },
  validate(state,action){const valid=legalXiangqiMoves(state,action.actor).some(m=>m.pieceId===action.payload.pieceId&&m.toX===action.payload.toX&&m.toY===action.payload.toY);return{valid,errorCode:valid?undefined:'move.illegal'};},
  reduce(state,action){
    if(!this.validate(state,action).valid)throw new Error('Illegal Xiangqi action');
    const move:XiangqiMove=action.payload,next=applyXiangqiMove(state,action.actor,move);
    const events:GameEvent[]=[{id:`move-${next.revision}`,type:'piece.moved',actor:action.actor,turn:state.turnNumber,payload:{pieceId:move.pieceId,toX:move.toX,toY:move.toY}}];
    if(next.lastMove?.capturedId)events.push({id:`capture-${next.revision}`,type:'piece.captured',actor:action.actor,turn:state.turnNumber,payload:{pieceId:next.lastMove.capturedId}});
    if(next.phase==='completed')events.push({id:`end-${next.revision}`,type:'game.ended',actor:next.winner,turn:state.turnNumber,payload:{reason:next.terminalReason??'draw'}});
    else events.push({id:`turn-${next.revision}`,type:'turn.start',actor:next.activePlayer,turn:next.turnNumber,payload:{inCheck:next.inCheck}});
    return{state:next,events,outcome:outcome(next)};
  },
  outcome,
  botObservation(state,actor){return{gameId:descriptor.id,playerId:actor,visibleState:this.serialize(state),availableActions:this.legalActions(state,actor)};},
  scene(state){return{boardType:'xiangqi-grid',layers:[
    {kind:'river',betweenRows:[4,5]} as JsonObject,
    {kind:'palaces',areas:[[3,0,5,2],[3,7,5,9]]} as JsonObject,
    {kind:'pieces',values:state.pieces.map(p=>({id:p.id,player:p.player,type:p.type,x:p.x,y:p.y}))} as JsonObject
  ],accessibleDescription:`Xiangqi turn ${state.turnNumber}. Active ${state.activePlayer??'none'}${state.inCheck?' in check':''}.`};},
  tutorial(locale:Locale):Tutorial{return{id:descriptor.tutorialId,locale,paragraphs:locale==='vi'?[
    {title:'Mục tiêu',body:'Chiếu bí Tướng đối phương. Bên không còn nước hợp lệ cũng thua, kể cả khi không bị chiếu.'},
    {title:'Cung và sông',body:'Tướng và Sĩ ở trong cung 3×3. Tượng đi chéo hai điểm, bị chặn ở mắt tượng và không qua sông. Tốt đi thẳng; qua sông mới được đi ngang.'},
    {title:'Mã, Xe và Pháo',body:'Mã đi hình chữ L nhưng bị cản chân. Xe đi thẳng đến khi bị chặn. Pháo đi như Xe khi không ăn; để ăn phải nhảy qua đúng một quân làm ngòi.'},
    {title:'An toàn và lặp lại',body:'Không được tự để Tướng bị chiếu hoặc để hai Tướng nhìn thẳng nhau. Vị trí lặp lại ba lần được xử hòa trung lập; giới hạn an toàn 300 nước dùng điểm quân để kết thúc mô phỏng.'}
  ]:[
    {title:'Goal',body:'Checkmate the opposing general. A side with no legal move also loses, even when not in check.'},
    {title:'Palaces and river',body:'Generals and advisors stay in their 3×3 palace. Elephants move two points diagonally, have a blockable eye and cannot cross the river. Soldiers gain sideways movement after crossing.'},
    {title:'Horses, rooks and cannons',body:'A horse moves in an L but its orthogonal leg can be blocked. A rook slides. A cannon slides without capturing and must jump exactly one screen to capture.'},
    {title:'Safety and repetition',body:'A move cannot expose its own general or leave the generals facing. Threefold repetition is a neutral draw; a 300-ply simulation cap resolves by material.'}
  ]};},
  serialize(state){return{pieces:state.pieces.map(p=>({id:p.id,player:p.player,type:p.type,x:p.x,y:p.y})),winner:state.winner,terminalReason:state.terminalReason,positionHistory:[...state.positionHistory],
    lastMove:state.lastMove?{pieceId:state.lastMove.pieceId,toX:state.lastMove.toX,toY:state.lastMove.toY,capturedId:state.lastMove.capturedId}:null,
    inCheck:state.inCheck,phase:state.phase,activePlayer:state.activePlayer,revision:state.revision,turnNumber:state.turnNumber} as JsonObject;},
  deserialize(serialized,version){if(version!==descriptor.rulesetVersion)throw new Error('Unsupported Xiangqi save version');return restoreXiangqiState(serialized);}
};
