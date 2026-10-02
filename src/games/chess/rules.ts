import type { GameState, JsonObject, PlayerId } from '../../contracts/types';

export type ChessColor = 'white' | 'black';
export type PieceKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PromotionKind = 'queen' | 'rook' | 'bishop' | 'knight';
export interface ChessPiece { readonly color: ChessColor; readonly kind: PieceKind; }
export type ChessResultReason = 'checkmate' | 'stalemate' | 'fifty-move' | 'threefold-repetition' | 'insufficient-material';
export interface CastlingRights {
  readonly whiteKingSide: boolean;
  readonly whiteQueenSide: boolean;
  readonly blackKingSide: boolean;
  readonly blackQueenSide: boolean;
}
export interface ChessMove {
  readonly from: number;
  readonly to: number;
  readonly promotion?: PromotionKind;
}
export interface ChessState extends GameState {
  readonly board: readonly (ChessPiece | null)[];
  readonly activePlayer: 'p1' | 'p2' | null;
  readonly castling: CastlingRights;
  readonly enPassant: number | null;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
  readonly inCheck: boolean;
  readonly winner: 'p1' | 'p2' | 'draw' | null;
  readonly resultReason: ChessResultReason | null;
  readonly positionCounts: Readonly<Record<string, number>>;
}

const BACK: readonly PieceKind[] = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
const PROMOTIONS: readonly PromotionKind[] = ['queen','rook','bishop','knight'];
const KNIGHT_STEPS = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]] as const;
const KING_STEPS = [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]] as const;
const ROOK_DIRS = [[1,0],[-1,0],[0,1],[0,-1]] as const;
const BISHOP_DIRS = [[1,1],[1,-1],[-1,1],[-1,-1]] as const;

export const colorForPlayer = (player: PlayerId): ChessColor => player === 'p1' ? 'white' : 'black';
export const playerForColor = (color: ChessColor): 'p1' | 'p2' => color === 'white' ? 'p1' : 'p2';
const opposite = (color: ChessColor): ChessColor => color === 'white' ? 'black' : 'white';
const fileOf = (square: number) => square % 8;
const rankOf = (square: number) => Math.floor(square / 8);
const inside = (file: number, rank: number) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
const squareOf = (file: number, rank: number) => rank * 8 + file;
export const squareName = (square: number): string => `${'abcdefgh'[fileOf(square)]}${rankOf(square) + 1}`;

function initialBoard(): (ChessPiece | null)[] {
  const board = Array<ChessPiece | null>(64).fill(null);
  for (let file = 0; file < 8; file++) {
    board[file] = { color:'white', kind:BACK[file]! };
    board[8 + file] = { color:'white', kind:'pawn' };
    board[48 + file] = { color:'black', kind:'pawn' };
    board[56 + file] = { color:'black', kind:BACK[file]! };
  }
  return board;
}

function pieceToken(piece: ChessPiece | null): string {
  if (!piece) return '.';
  const token: Record<PieceKind,string> = {king:'k',queen:'q',rook:'r',bishop:'b',knight:'n',pawn:'p'};
  return piece.color === 'white' ? token[piece.kind]!.toUpperCase() : token[piece.kind]!;
}

export function positionKey(board: readonly (ChessPiece|null)[], active: ChessColor, castling: CastlingRights, enPassant: number|null): string {
  const rights = `${castling.whiteKingSide?'K':''}${castling.whiteQueenSide?'Q':''}${castling.blackKingSide?'k':''}${castling.blackQueenSide?'q':''}` || '-';
  return `${board.map(pieceToken).join('')}:${active[0]}:${rights}:${enPassant === null ? '-' : squareName(enPassant)}`;
}

export function newChessState(): ChessState {
  const board = initialBoard();
  const castling: CastlingRights = {whiteKingSide:true,whiteQueenSide:true,blackKingSide:true,blackQueenSide:true};
  const key = positionKey(board, 'white', castling, null);
  return { board, castling, enPassant:null, halfmoveClock:0, fullmoveNumber:1, inCheck:false,
    winner:null, resultReason:null, positionCounts:{[key]:1}, phase:'playing', activePlayer:'p1', revision:0, turnNumber:1 };
}

export function isSquareAttacked(board: readonly (ChessPiece|null)[], square: number, by: ChessColor): boolean {
  const sf = fileOf(square), sr = rankOf(square);
  const pawnRank = sr + (by === 'white' ? -1 : 1);
  for (const df of [-1,1]) {
    const f = sf + df;
    if (inside(f,pawnRank)) { const p=board[squareOf(f,pawnRank)]; if (p?.color===by && p.kind==='pawn') return true; }
  }
  for (const [df,dr] of KNIGHT_STEPS) {
    const f=sf+df,r=sr+dr; if (inside(f,r)) { const p=board[squareOf(f,r)]; if (p?.color===by && p.kind==='knight') return true; }
  }
  for (const [df,dr] of KING_STEPS) {
    const f=sf+df,r=sr+dr; if (inside(f,r)) { const p=board[squareOf(f,r)]; if (p?.color===by && p.kind==='king') return true; }
  }
  for (const [dirs,kinds] of [[ROOK_DIRS,['rook','queen']], [BISHOP_DIRS,['bishop','queen']]] as const) {
    for (const [df,dr] of dirs) {
      let f=sf+df,r=sr+dr;
      while (inside(f,r)) {
        const p=board[squareOf(f,r)];
        if (p) { if (p.color===by && (kinds as readonly PieceKind[]).includes(p.kind)) return true; break; }
        f+=df; r+=dr;
      }
    }
  }
  return false;
}

export function isInCheck(board: readonly (ChessPiece|null)[], color: ChessColor): boolean {
  const king = board.findIndex(p => p?.color === color && p.kind === 'king');
  return king >= 0 && isSquareAttacked(board, king, opposite(color));
}

function pseudoMoves(state: ChessState, color: ChessColor): ChessMove[] {
  const moves: ChessMove[]=[];
  const add = (from:number,to:number,promotion?:PromotionKind) => promotion ? moves.push({from,to,promotion}) : moves.push({from,to});
  const slide = (from:number, dirs: readonly (readonly [number,number])[]) => {
    for (const [df,dr] of dirs) { let f=fileOf(from)+df,r=rankOf(from)+dr; while(inside(f,r)) {
      const to=squareOf(f,r), target=state.board[to];
      if (!target) add(from,to); else { if(target.color!==color && target.kind!=='king') add(from,to); break; }
      f+=df;r+=dr;
    }}
  };
  for (let from=0;from<64;from++) {
    const piece=state.board[from]; if (!piece || piece.color!==color) continue;
    const f=fileOf(from),r=rankOf(from);
    if (piece.kind==='pawn') {
      const dr=color==='white'?1:-1, start=color==='white'?1:6, last=color==='white'?7:0;
      const oneR=r+dr;
      if (inside(f,oneR) && !state.board[squareOf(f,oneR)]) {
        const to=squareOf(f,oneR); if(oneR===last) PROMOTIONS.forEach(p=>add(from,to,p)); else add(from,to);
        const twoR=r+2*dr; if(r===start && !state.board[squareOf(f,twoR)]) add(from,squareOf(f,twoR));
      }
      for (const df of [-1,1]) { const tf=f+df,tr=r+dr;if(!inside(tf,tr))continue;const to=squareOf(tf,tr),target=state.board[to];
        if ((target && target.color!==color && target.kind!=='king') || to===state.enPassant) {
          if(tr===last) PROMOTIONS.forEach(p=>add(from,to,p)); else add(from,to);
        }
      }
    } else if (piece.kind==='knight') {
      for(const [df,dr] of KNIGHT_STEPS){const tf=f+df,tr=r+dr;if(inside(tf,tr)){const to=squareOf(tf,tr),t=state.board[to];if(!t||(t.color!==color&&t.kind!=='king'))add(from,to);}}
    } else if (piece.kind==='bishop') slide(from,BISHOP_DIRS);
    else if (piece.kind==='rook') slide(from,ROOK_DIRS);
    else if (piece.kind==='queen') slide(from,[...ROOK_DIRS,...BISHOP_DIRS]);
    else {
      for(const [df,dr] of KING_STEPS){const tf=f+df,tr=r+dr;if(inside(tf,tr)){const to=squareOf(tf,tr),t=state.board[to];if(!t||(t.color!==color&&t.kind!=='king'))add(from,to);}}
      const home=color==='white'?4:60, enemy=opposite(color);
      if(from===home && !isSquareAttacked(state.board,home,enemy)) {
        const ks=color==='white'?state.castling.whiteKingSide:state.castling.blackKingSide;
        const qs=color==='white'?state.castling.whiteQueenSide:state.castling.blackQueenSide;
        if(ks && !state.board[home+1] && !state.board[home+2] && state.board[home+3]?.kind==='rook' && state.board[home+3]?.color===color &&
          !isSquareAttacked(state.board,home+1,enemy) && !isSquareAttacked(state.board,home+2,enemy)) add(from,home+2);
        if(qs && !state.board[home-1] && !state.board[home-2] && !state.board[home-3] && state.board[home-4]?.kind==='rook' && state.board[home-4]?.color===color &&
          !isSquareAttacked(state.board,home-1,enemy) && !isSquareAttacked(state.board,home-2,enemy)) add(from,home-2);
      }
    }
  }
  return moves;
}

function movedBoard(state: ChessState, move: ChessMove): (ChessPiece|null)[] {
  const board=state.board.slice(), piece=board[move.from]; if(!piece) return board;
  board[move.from]=null;
  if(piece.kind==='pawn' && move.to===state.enPassant && !board[move.to]) board[move.to+(piece.color==='white'?-8:8)]=null;
  board[move.to]=move.promotion ? {color:piece.color,kind:move.promotion} : piece;
  if(piece.kind==='king' && Math.abs(move.to-move.from)===2) {
    const rookFrom=move.to>move.from?move.from+3:move.from-4, rookTo=move.to>move.from?move.from+1:move.from-1;
    board[rookTo]=board[rookFrom] ?? null; board[rookFrom]=null;
  }
  return board;
}

export function legalMoves(state: ChessState, color: ChessColor = state.activePlayer ? colorForPlayer(state.activePlayer) : 'white'): ChessMove[] {
  if(state.phase!=='playing') return [];
  return pseudoMoves(state,color).filter(move=>!isInCheck(movedBoard(state,move),color));
}

function nextCastling(state:ChessState,move:ChessMove,piece:ChessPiece,captured:ChessPiece|null):CastlingRights {
  let {whiteKingSide,whiteQueenSide,blackKingSide,blackQueenSide}=state.castling;
  if(piece.kind==='king'){if(piece.color==='white'){whiteKingSide=false;whiteQueenSide=false;}else{blackKingSide=false;blackQueenSide=false;}}
  if(piece.kind==='rook'||captured?.kind==='rook') {
    if(move.from===0||move.to===0)whiteQueenSide=false;if(move.from===7||move.to===7)whiteKingSide=false;
    if(move.from===56||move.to===56)blackQueenSide=false;if(move.from===63||move.to===63)blackKingSide=false;
  }
  return {whiteKingSide,whiteQueenSide,blackKingSide,blackQueenSide};
}

function insufficientMaterial(board:readonly (ChessPiece|null)[]):boolean {
  const pieces=board.flatMap((p,i)=>p?[{...p,square:i}]:[]).filter(p=>p.kind!=='king');
  if(pieces.length===0)return true;
  if(pieces.length===1 && (pieces[0]!.kind==='bishop'||pieces[0]!.kind==='knight'))return true;
  if(pieces.every(p=>p.kind==='bishop')) return new Set(pieces.map(p=>(fileOf(p.square)+rankOf(p.square))%2)).size===1;
  return false;
}

export function applyMove(state:ChessState,move:ChessMove):ChessState {
  const legal=legalMoves(state); if(!legal.some(m=>m.from===move.from&&m.to===move.to&&m.promotion===move.promotion))throw new Error('Illegal chess move');
  const piece=state.board[move.from]!, captured=state.board[move.to] ?? (piece.kind==='pawn'&&move.to===state.enPassant?(state.board[move.to+(piece.color==='white'?-8:8)] ?? null):null);
  const board=movedBoard(state,move), castling=nextCastling(state,move,piece,captured);
  const enPassant=piece.kind==='pawn'&&Math.abs(move.to-move.from)===16?(move.from+move.to)/2:null;
  const nextColor=opposite(piece.color), nextPlayer=playerForColor(nextColor), inCheck=isInCheck(board,nextColor);
  const halfmoveClock=piece.kind==='pawn'||captured?0:state.halfmoveClock+1;
  const key=positionKey(board,nextColor,castling,enPassant), positionCounts={...state.positionCounts,[key]:(state.positionCounts[key]??0)+1};
  const draft:ChessState={...state,board,castling,enPassant,halfmoveClock,fullmoveNumber:state.fullmoveNumber+(piece.color==='black'?1:0),
    inCheck,positionCounts,activePlayer:nextPlayer,revision:state.revision+1,turnNumber:state.turnNumber+1};
  const replies=legalMoves(draft,nextColor);
  let winner:ChessState['winner']=null, resultReason:ChessResultReason|null=null;
  if(replies.length===0){resultReason=inCheck?'checkmate':'stalemate';winner=inCheck?playerForColor(piece.color):'draw';}
  else if(halfmoveClock>=100){resultReason='fifty-move';winner='draw';}
  else if(positionCounts[key]!>=3){resultReason='threefold-repetition';winner='draw';}
  else if(insufficientMaterial(board)){resultReason='insufficient-material';winner='draw';}
  return {...draft,phase:winner?'completed':'playing',activePlayer:winner?null:nextPlayer,winner,resultReason};
}

function isPiece(value:unknown):value is ChessPiece { if(!value||typeof value!=='object')return false;const p=value as Record<string,unknown>;return(p.color==='white'||p.color==='black')&&['king','queen','rook','bishop','knight','pawn'].includes(String(p.kind)); }
export function restoreChessState(input:unknown):ChessState {
  if(!input||typeof input!=='object')throw new Error('Invalid chess state');const s=input as Record<string,unknown>;
  if(!Array.isArray(s.board)||s.board.length!==64||!s.board.every(p=>p===null||isPiece(p)))throw new Error('Invalid chess board');
  const board=(s.board as (ChessPiece|null)[]).map(p=>p?{...p}:null);
  for(const color of ['white','black'] as const)if(board.filter(p=>p?.color===color&&p.kind==='king').length!==1)throw new Error('Each side must have one king');
  const castling=s.castling;if(!castling||typeof castling!=='object'||!['whiteKingSide','whiteQueenSide','blackKingSide','blackQueenSide'].every(k=>typeof(castling as Record<string,unknown>)[k]==='boolean'))throw new Error('Invalid castling rights');
  const active=s.activePlayer;if(active!==null&&active!=='p1'&&active!=='p2')throw new Error('Invalid active player');
  if(s.phase!=='playing'&&s.phase!=='completed')throw new Error('Invalid phase');if((s.phase==='playing')!==(active!==null))throw new Error('Inconsistent phase');
  const ints=['halfmoveClock','fullmoveNumber','revision','turnNumber'];if(!ints.every(k=>Number.isSafeInteger(s[k])&&(s[k] as number)>=0))throw new Error('Invalid counters');
  if(s.enPassant!==null&&(!Number.isInteger(s.enPassant)||(s.enPassant as number)<0||(s.enPassant as number)>63))throw new Error('Invalid en passant square');
  if(typeof s.inCheck!=='boolean'||(s.winner!==null&&s.winner!=='p1'&&s.winner!=='p2'&&s.winner!=='draw'))throw new Error('Invalid result');
  if(s.resultReason!==null&&!['checkmate','stalemate','fifty-move','threefold-repetition','insufficient-material'].includes(String(s.resultReason)))throw new Error('Invalid result reason');
  if(!s.positionCounts||typeof s.positionCounts!=='object'||Array.isArray(s.positionCounts)||!Object.values(s.positionCounts as object).every(v=>Number.isSafeInteger(v)&&Number(v)>0))throw new Error('Invalid repetition data');
  const state:ChessState={board,castling:{...(castling as CastlingRights)},enPassant:s.enPassant as number|null,halfmoveClock:s.halfmoveClock as number,fullmoveNumber:s.fullmoveNumber as number,
    inCheck:s.inCheck, winner:s.winner as ChessState['winner'],resultReason:s.resultReason as ChessResultReason|null,positionCounts:{...(s.positionCounts as Record<string,number>)},
    phase:s.phase,activePlayer:active,revision:s.revision as number,turnNumber:s.turnNumber as number};
  if(state.phase==='playing'&&state.activePlayer&&state.inCheck!==isInCheck(board,colorForPlayer(state.activePlayer)))throw new Error('Inconsistent check state');
  return state;
}

export function serializeChessState(state:ChessState):JsonObject {
  return {board:state.board,castling:state.castling,enPassant:state.enPassant,halfmoveClock:state.halfmoveClock,fullmoveNumber:state.fullmoveNumber,
    inCheck:state.inCheck,winner:state.winner,resultReason:state.resultReason,positionCounts:state.positionCounts,phase:state.phase,
    activePlayer:state.activePlayer,revision:state.revision,turnNumber:state.turnNumber} as unknown as JsonObject;
}
