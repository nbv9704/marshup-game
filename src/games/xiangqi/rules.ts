import type { BotDifficulty, GameState, PlayerId } from '../../contracts/types';

export type XiangqiPlayer = 'p1' | 'p2';
export type PieceType = 'general' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'soldier';
export interface XiangqiPiece { readonly id: string; readonly player: XiangqiPlayer; readonly type: PieceType; readonly x: number; readonly y: number; }
export interface XiangqiMove { readonly pieceId: string; readonly toX: number; readonly toY: number; }
export interface XiangqiState extends GameState {
  readonly activePlayer: XiangqiPlayer | null;
  readonly pieces: readonly XiangqiPiece[];
  readonly winner: XiangqiPlayer | null;
  readonly terminalReason: 'victory' | 'draw' | 'safety-limit' | null;
  readonly positionHistory: readonly string[];
  readonly lastMove: (XiangqiMove & { readonly capturedId: string | null }) | null;
  readonly inCheck: boolean;
}

export const MAX_PLIES = 300;
const VALUES: Readonly<Record<PieceType, number>> = { general:10000, rook:900, cannon:450, horse:400, elephant:200, advisor:200, soldier:100 };
const other = (player: XiangqiPlayer): XiangqiPlayer => player === 'p1' ? 'p2' : 'p1';
const inside = (x: number, y: number): boolean => x >= 0 && x < 9 && y >= 0 && y < 10;
const palace = (player: XiangqiPlayer, x: number, y: number): boolean => x >= 3 && x <= 5 &&
  (player === 'p1' ? y >= 7 && y <= 9 : y >= 0 && y <= 2);

function initialSide(player: XiangqiPlayer, y: number, pawnY: number, cannonY: number): XiangqiPiece[] {
  const back: PieceType[] = ['rook','horse','elephant','advisor','general','advisor','elephant','horse','rook'];
  const pieces = back.map((type, x) => ({ id:`${player}-${type}-${x}`, player, type, x, y }));
  pieces.push({ id:`${player}-cannon-1`, player, type:'cannon', x:1, y:cannonY }, { id:`${player}-cannon-7`, player, type:'cannon', x:7, y:cannonY });
  for (const x of [0,2,4,6,8]) pieces.push({ id:`${player}-soldier-${x}`, player, type:'soldier', x, y:pawnY });
  return pieces;
}

export function positionKey(pieces: readonly XiangqiPiece[], active: XiangqiPlayer): string {
  return `${active}|${[...pieces].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>`${p.id}:${p.x},${p.y}`).join('|')}`;
}
export function createXiangqiState(): XiangqiState {
  const pieces = [...initialSide('p2',0,3,2), ...initialSide('p1',9,6,7)];
  return { pieces, activePlayer:'p1', winner:null, terminalReason:null, lastMove:null, inCheck:false,
    positionHistory:[positionKey(pieces,'p1')], phase:'playing', revision:0, turnNumber:1 };
}

function at(state: Pick<XiangqiState,'pieces'>, x: number, y: number): XiangqiPiece | undefined { return state.pieces.find(p => p.x === x && p.y === y); }
function addIfAvailable(state: Pick<XiangqiState,'pieces'>, piece: XiangqiPiece, moves: XiangqiMove[], x: number, y: number): void {
  if (!inside(x,y)) return;
  const target = at(state,x,y);
  if (!target || target.player !== piece.player) moves.push({ pieceId:piece.id, toX:x, toY:y });
}

export function pseudoMoves(state: Pick<XiangqiState,'pieces'>, piece: XiangqiPiece): XiangqiMove[] {
  const moves: XiangqiMove[] = [];
  if (piece.type === 'rook' || piece.type === 'cannon') {
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
      let x=piece.x+dx, y=piece.y+dy, screen=false;
      while (inside(x,y)) {
        const target=at(state,x,y);
        if (piece.type === 'rook') {
          if (!target) moves.push({pieceId:piece.id,toX:x,toY:y});
          else { if (target.player!==piece.player) moves.push({pieceId:piece.id,toX:x,toY:y}); break; }
        } else if (!screen) {
          if (!target) moves.push({pieceId:piece.id,toX:x,toY:y}); else screen=true;
        } else if (target) {
          if (target.player!==piece.player) moves.push({pieceId:piece.id,toX:x,toY:y});
          break;
        }
        x+=dx; y+=dy;
      }
    }
  } else if (piece.type === 'horse') {
    for (const [dx,dy,lx,ly] of [[2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0],[1,2,0,1],[-1,2,0,1],[1,-2,0,-1],[-1,-2,0,-1]] as const)
      if (!at(state,piece.x+lx,piece.y+ly)) addIfAvailable(state,piece,moves,piece.x+dx,piece.y+dy);
  } else if (piece.type === 'elephant') {
    for (const [dx,dy] of [[2,2],[2,-2],[-2,2],[-2,-2]] as const) {
      const x=piece.x+dx,y=piece.y+dy;
      const ownSide = piece.player === 'p1' ? y >= 5 : y <= 4;
      if (ownSide && !at(state,piece.x+dx/2,piece.y+dy/2)) addIfAvailable(state,piece,moves,x,y);
    }
  } else if (piece.type === 'advisor') {
    for (const [dx,dy] of [[1,1],[1,-1],[-1,1],[-1,-1]] as const) {
      const x=piece.x+dx,y=piece.y+dy;
      if (palace(piece.player,x,y)) addIfAvailable(state,piece,moves,x,y);
    }
  } else if (piece.type === 'general') {
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
      const x=piece.x+dx,y=piece.y+dy;
      if (palace(piece.player,x,y)) addIfAvailable(state,piece,moves,x,y);
    }
    for (const dy of [-1,1] as const) {
      let y=piece.y+dy;
      while (inside(piece.x,y) && !at(state,piece.x,y)) y+=dy;
      const target=at(state,piece.x,y);
      if (target?.type==='general' && target.player!==piece.player) moves.push({pieceId:piece.id,toX:piece.x,toY:y});
    }
  } else {
    const forward = piece.player === 'p1' ? -1 : 1;
    addIfAvailable(state,piece,moves,piece.x,piece.y+forward);
    const crossed = piece.player === 'p1' ? piece.y <= 4 : piece.y >= 5;
    if (crossed) { addIfAvailable(state,piece,moves,piece.x-1,piece.y); addIfAvailable(state,piece,moves,piece.x+1,piece.y); }
  }
  return moves;
}

function applyUnchecked(state: XiangqiState, move: XiangqiMove): { pieces: XiangqiPiece[]; captured: XiangqiPiece | null } {
  const moving=state.pieces.find(p=>p.id===move.pieceId)!;
  const captured=at(state,move.toX,move.toY) ?? null;
  return { pieces:state.pieces.filter(p=>p.id!==captured?.id).map(p=>p.id===moving.id?{...p,x:move.toX,y:move.toY}:p), captured };
}

export function isInCheck(state: Pick<XiangqiState,'pieces'>, player: XiangqiPlayer): boolean {
  const general=state.pieces.find(p=>p.player===player&&p.type==='general');
  if (!general) return true;
  return state.pieces.some(piece => piece.player!==player && pseudoMoves(state,piece).some(m=>m.toX===general.x&&m.toY===general.y));
}

export function legalXiangqiMoves(state: XiangqiState, actor: PlayerId): XiangqiMove[] {
  if (state.phase!=='playing' || actor!==state.activePlayer || (actor!=='p1'&&actor!=='p2')) return [];
  return state.pieces.filter(p=>p.player===actor).flatMap(piece=>pseudoMoves(state,piece).filter(move=>{
    const applied=applyUnchecked(state,move);
    return !isInCheck({pieces:applied.pieces},actor);
  }));
}

export function materialScore(state: Pick<XiangqiState,'pieces'>, player: XiangqiPlayer): number {
  return state.pieces.filter(p=>p.player===player).reduce((sum,p)=>sum+VALUES[p.type],0);
}

export function applyXiangqiMove(state: XiangqiState, actor: XiangqiPlayer, move: XiangqiMove): XiangqiState {
  if (!legalXiangqiMoves(state,actor).some(m=>m.pieceId===move.pieceId&&m.toX===move.toX&&m.toY===move.toY)) throw new Error('Illegal Xiangqi move');
  const applied=applyUnchecked(state,move), opponent=other(actor), revision=state.revision+1;
  let winner: XiangqiPlayer|null = applied.captured?.type==='general' ? actor : null;
  let terminalReason: XiangqiState['terminalReason'] = winner ? 'victory' : null;
  let next: XiangqiState = { ...state, pieces:applied.pieces, activePlayer:winner?null:opponent, winner, terminalReason,
    lastMove:{...move,capturedId:applied.captured?.id??null}, revision, turnNumber:state.turnNumber+1, inCheck:winner?false:isInCheck({pieces:applied.pieces},opponent) };
  if (!winner) {
    const key=positionKey(applied.pieces,opponent), history=[...state.positionHistory,key];
    next={...next,positionHistory:history};
    if (history.filter(k=>k===key).length>=3) next={...next,phase:'completed',activePlayer:null,terminalReason:'draw'};
    else if (legalXiangqiMoves(next,opponent).length===0) next={...next,phase:'completed',activePlayer:null,winner:actor,terminalReason:'victory'};
    else if (revision>=MAX_PLIES) next={...next,phase:'completed',activePlayer:null,terminalReason:'safety-limit'};
  } else next={...next,phase:'completed'};
  return next;
}

export function chooseXiangqiBotMove(state: XiangqiState, difficulty: BotDifficulty, salt=0): XiangqiMove {
  const actor=state.activePlayer;
  if (!actor) throw new Error('No active player');
  const legal=legalXiangqiMoves(state,actor);
  if (!legal.length) throw new Error('No legal moves');
  if (difficulty==='easy') return legal[Math.abs(salt)%legal.length]!;
  const rank=(move:XiangqiMove):number=>{
    const target=at(state,move.toX,move.toY);
    const after=applyXiangqiMove(state,actor,move);
    let score=(target?VALUES[target.type]:0)*10+(after.inCheck?50:0);
    if (after.winner===actor) return 1_000_000;
    if (difficulty==='hard' && after.activePlayer) {
      const replies=legalXiangqiMoves(after,after.activePlayer);
      const worst=replies.reduce((best,reply)=>{
        const captured=at(after,reply.toX,reply.toY);
        return Math.max(best,captured?VALUES[captured.type]:0);
      },0);
      score-=worst*8;
    }
    return score;
  };
  return [...legal].sort((a,b)=>rank(b)-rank(a)||a.pieceId.localeCompare(b.pieceId)||a.toY-b.toY||a.toX-b.toX)[0]!;
}

export function restoreXiangqiState(input: unknown): XiangqiState {
  if (!input||typeof input!=='object') throw new Error('Invalid Xiangqi state');
  const s=input as Record<string,unknown>;
  if (!Array.isArray(s['pieces'])||!s['pieces'].every(raw=>{
    if (!raw||typeof raw!=='object') return false;
    const p=raw as Record<string,unknown>;
    return typeof p['id']==='string'&&['p1','p2'].includes(String(p['player']))&&['general','advisor','elephant','horse','rook','cannon','soldier'].includes(String(p['type']))&&
      Number.isInteger(p['x'])&&Number.isInteger(p['y'])&&inside(p['x'] as number,p['y'] as number);
  })) throw new Error('Invalid Xiangqi pieces');
  const pieces=s['pieces'].map(p=>({...p})) as unknown as XiangqiPiece[];
  if (new Set(pieces.map(p=>p.id)).size!==pieces.length||new Set(pieces.map(p=>`${p.x},${p.y}`)).size!==pieces.length) throw new Error('Duplicate Xiangqi piece');
  const phase=s['phase'], active=s['activePlayer'], winner=s['winner'], reason=s['terminalReason'];
  if (!['playing','completed'].includes(String(phase))||(active!==null&&!['p1','p2'].includes(String(active)))||(winner!==null&&!['p1','p2'].includes(String(winner)))||
    (reason!==null&&!['victory','draw','safety-limit'].includes(String(reason)))) throw new Error('Invalid Xiangqi status');
  if ((phase==='completed')!==(reason!==null)||(phase==='playing'&&active===null)) throw new Error('Inconsistent Xiangqi result');
  if (!Number.isSafeInteger(s['revision'])||(s['revision'] as number)<0||!Number.isSafeInteger(s['turnNumber'])||(s['turnNumber'] as number)<1||
    !Array.isArray(s['positionHistory'])||!s['positionHistory'].every(v=>typeof v==='string')) throw new Error('Invalid Xiangqi counters');
  const last=s['lastMove'];
  if (last!==null&&(!last||typeof last!=='object')) throw new Error('Invalid last move');
  const state: XiangqiState={ pieces, phase:phase as XiangqiState['phase'], activePlayer:active as XiangqiPlayer|null, winner:winner as XiangqiPlayer|null,
    terminalReason:reason as XiangqiState['terminalReason'], positionHistory:[...(s['positionHistory'] as string[])], lastMove:last as XiangqiState['lastMove'],
    inCheck:Boolean(s['inCheck']), revision:s['revision'] as number, turnNumber:s['turnNumber'] as number };
  if (state.phase==='playing'&&state.activePlayer&&state.inCheck!==isInCheck(state,state.activePlayer)) throw new Error('Invalid check status');
  return state;
}
