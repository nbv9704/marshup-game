import type { ChessMove, ChessState, PieceKind } from './rules';
import { applyMove, legalMoves } from './rules';

const VALUE:Record<PieceKind,number>={king:0,queen:900,rook:500,bishop:330,knight:320,pawn:100};
function score(state:ChessState,perspective:'p1'|'p2'):number {
  if(state.winner)return state.winner==='draw'?0:state.winner===perspective?100000:-100000;
  return state.board.reduce((sum,p)=>sum+(p?(p.color===(perspective==='p1'?'white':'black')?1:-1)*VALUE[p.kind]:0),0);
}

/** Deterministic selector: easy rotates through legal moves; normal prefers material; hard searches two plies. */
export function chooseChessMove(state:ChessState,difficulty:'easy'|'normal'|'hard',salt=0):ChessMove {
  const moves=legalMoves(state);if(!moves.length)throw new Error('No legal chess moves');
  if(difficulty==='easy')return moves[Math.abs(salt)%moves.length]!;
  const actor=state.activePlayer!;
  const ranked=moves.map((move,index)=>{const next=applyMove(state,move);let value=score(next,actor);
    if(difficulty==='hard'&&next.phase==='playing'){const replies=legalMoves(next);if(replies.length)value=Math.min(...replies.map(reply=>score(applyMove(next,reply),actor)));}
    return{move,value,index};});
  ranked.sort((a,b)=>b.value-a.value||a.index-b.index);return ranked[0]!.move;
}
