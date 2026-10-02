import { describe, expect, it } from 'vitest';
import { applyMove, legalMoves, newChessState, restoreChessState, serializeChessState, type ChessMove, type ChessPiece, type ChessState } from './rules';

const move = (state:ChessState,from:number,to:number,promotion?:ChessMove['promotion']) => applyMove(state,promotion?{from,to,promotion}:{from,to});

describe('chess rules',()=>{
  it('starts with twenty legal moves and survives serialization',()=>{
    const state=newChessState();expect(legalMoves(state)).toHaveLength(20);
    expect(restoreChessState(serializeChessState(state))).toEqual(state);
  });

  it('recognizes Fool’s Mate as checkmate',()=>{
    let s=newChessState();s=move(s,13,21);s=move(s,52,36);s=move(s,14,30);s=move(s,59,31);
    expect(s.phase).toBe('completed');expect(s.winner).toBe('p2');expect(s.resultReason).toBe('checkmate');
  });

  it('supports castling after the path is cleared',()=>{
    let s=newChessState();s=move(s,12,28);s=move(s,48,40);s=move(s,6,21);s=move(s,40,32);s=move(s,5,12);s=move(s,49,41);
    expect(legalMoves(s).some(m=>m.from===4&&m.to===6)).toBe(true);s=move(s,4,6);
    expect(s.board[6]?.kind).toBe('king');expect(s.board[5]?.kind).toBe('rook');expect(s.castling.whiteKingSide).toBe(false);
  });

  it('supports en passant and removes the passed pawn',()=>{
    let s=newChessState();s=move(s,12,28);s=move(s,48,40);s=move(s,28,36);s=move(s,51,35);
    expect(s.enPassant).toBe(43);s=move(s,36,43);expect(s.board[35]).toBeNull();expect(s.board[43]?.kind).toBe('pawn');
  });

  it('requires a promotion choice and applies it',()=>{
    const base=newChessState();const board=Array<ChessPiece|null>(64).fill(null);
    board[4]={color:'white',kind:'king'};board[60]={color:'black',kind:'king'};board[48]={color:'white',kind:'pawn'};
    const key=Object.keys(base.positionCounts)[0]!;
    const s:ChessState={...base,board,castling:{whiteKingSide:false,whiteQueenSide:false,blackKingSide:false,blackQueenSide:false},positionCounts:{[key]:1}};
    const promotions=legalMoves(s).filter(m=>m.from===48&&m.to===56);expect(promotions).toHaveLength(4);
    const next=move(s,48,56,'knight');expect(next.board[56]?.kind).toBe('knight');
  });
});
