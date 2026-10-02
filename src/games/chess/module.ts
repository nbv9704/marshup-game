import type { GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, PlayerId, RuntimeContext, SetupConfig, Tutorial } from '../../contracts/types';
import { descriptor } from './descriptor';
import { applyMove, legalMoves, newChessState, restoreChessState, serializeChessState, squareName, type ChessState, type PromotionKind } from './rules';

export interface ChessAction extends GameAction { readonly type:'move'; readonly actor:'p1'|'p2'; readonly payload:{readonly from:number;readonly to:number;readonly promotion?:PromotionKind}; }
const result=(s:ChessState):Outcome|null=>s.phase!=='completed'?null:{terminal:true,reason:s.winner==='draw'?'draw':'victory',winningPlayers:s.winner==='p1'||s.winner==='p2'?[s.winner]:[],scoreboard:{p1:s.winner==='p1'?1:0,p2:s.winner==='p2'?1:0,detail:s.resultReason??'unknown'}};

export const chess:IGameModule<ChessState,ChessAction>={
  descriptor,
  setup(config:SetupConfig,_context:RuntimeContext){if(config.players.length!==2||!config.players.some(p=>p.id==='p1')||!config.players.some(p=>p.id==='p2'))throw new Error('Chess requires players p1 and p2');return newChessState();},
  legalActions(s,actor){if(actor!==s.activePlayer)return[];return legalMoves(s).map(m=>({type:'move' as const,actor,payload:m}));},
  parseAction(input){if(!input||typeof input!=='object')return null;const a=input as Record<string,unknown>,p=a.payload;if(a.type!=='move'||(a.actor!=='p1'&&a.actor!=='p2')||!p||typeof p!=='object')return null;
    const q=p as Record<string,unknown>,promotion=q.promotion;if(!Number.isInteger(q.from)||!Number.isInteger(q.to)||(promotion!==undefined&&!['queen','rook','bishop','knight'].includes(String(promotion))))return null;
    const from=q.from as number,to=q.to as number;if(from<0||from>63||to<0||to>63)return null;return promotion===undefined?{type:'move',actor:a.actor,payload:{from,to}}:{type:'move',actor:a.actor,payload:{from,to,promotion:promotion as PromotionKind}};},
  validate(s,a){const valid=a.actor===s.activePlayer&&legalMoves(s).some(m=>m.from===a.payload.from&&m.to===a.payload.to&&m.promotion===a.payload.promotion);return valid?{valid:true}:{valid:false,errorCode:'move.illegal'};},
  reduce(s,a,_context){if(!this.validate(s,a).valid)throw new Error('Illegal chess action');const moved=s.board[a.payload.from]!;
    const captured=s.board[a.payload.to]??(moved.kind==='pawn'&&a.payload.to===s.enPassant?s.board[a.payload.to+(moved.color==='white'?-8:8)]:null),next=applyMove(s,a.payload);
    const events:GameEvent[]=[{id:`move-${next.revision}`,type:'piece.moved',turn:s.turnNumber,actor:a.actor,payload:{from:a.payload.from,to:a.payload.to,fromName:squareName(a.payload.from),toName:squareName(a.payload.to),piece:moved.kind,promotion:a.payload.promotion??null}},
      ...(captured?[{id:`capture-${next.revision}`,type:'piece.captured' as const,turn:s.turnNumber,actor:a.actor,payload:{square:a.payload.to,piece:captured.kind}}]:[]),
      ...(next.phase==='completed'?[{id:`end-${next.revision}`,type:'game.ended' as const,turn:next.turnNumber,actor:a.actor,payload:{winner:next.winner,reason:next.resultReason}}]:[{id:`turn-${next.revision}`,type:'turn.start' as const,turn:next.turnNumber,actor:next.activePlayer,payload:{check:next.inCheck}}])];
    return{state:next,events,outcome:result(next)};},
  outcome:result,
  botObservation(s,actor){return{gameId:descriptor.id,playerId:actor,visibleState:this.serialize(s),availableActions:this.legalActions(s,actor)};},
  scene(s,_viewer){return{boardType:'chess-8x8',layers:[{kind:'pieces',columns:8,rows:8,values:s.board} as unknown as JsonObject,{kind:'last-state',inCheck:s.inCheck,activePlayer:s.activePlayer}],accessibleDescription:`Chess board. ${s.activePlayer??'No player'} to move${s.inCheck?' in check':''}.`};},
  tutorial(locale:Locale):Tutorial{return{id:descriptor.tutorialId,locale,paragraphs:locale==='vi'?
    [{title:'Mục tiêu',body:'Chiếu hết vua đối phương. Trắng đi trước; mỗi quân đi và bắt quân theo luật cờ vua chuẩn.'},{title:'Nước đặc biệt',body:'Plugin hỗ trợ nhập thành, bắt tốt qua đường và phong cấp thành hậu, xe, tượng hoặc mã.'},{title:'Kết thúc',body:'Ván đấu kết thúc khi chiếu hết, hết nước hợp lệ, luật 50 nước, lặp lại thế cờ ba lần hoặc không đủ quân chiếu hết.'}]:
    [{title:'Goal',body:'Checkmate the opposing king. White moves first; every piece moves and captures under standard chess rules.'},{title:'Special moves',body:'Castling, en passant and promotion to queen, rook, bishop or knight are supported.'},{title:'Game end',body:'The game ends by checkmate, stalemate, the fifty-move rule, threefold repetition or insufficient mating material.'}]};},
  serialize:serializeChessState,
  deserialize(serialized,fromVersion){if(fromVersion!==descriptor.rulesetVersion)throw new Error('Unsupported chess save version');return restoreChessState(serialized);}
};
