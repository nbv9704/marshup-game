import type { GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, PlayerId, RuntimeContext, SetupConfig, Tutorial } from '../../contracts/types';
import { descriptor } from './descriptor';
import { legalCells, newTripleState, placeMark, restoreTripleState, type TripleState } from './rules';
interface PlaceAction extends GameAction { type: 'place'; actor: 'p1'|'p2'; payload: { cell: number }; }

function endResult(state: TripleState): Outcome | null {
  if (state.phase !== 'completed') return null;
  return { terminal: true, reason: state.winner === 'draw' ? 'draw' : 'victory',
    winningPlayers: state.winner === 'draw' || state.winner === null ? [] : [state.winner],
    scoreboard: { p1: state.winner === 'p1' ? 1 : 0, p2: state.winner === 'p2' ? 1 : 0 } };
}
export const tripleSpark: IGameModule<TripleState, PlaceAction> = {
  descriptor,
  setup(_config: SetupConfig, _context: RuntimeContext) { return newTripleState(); },
  legalActions(s, actor) { return actor !== s.activePlayer ? [] : legalCells(s).map(cell => ({type:'place' as const,actor, payload:{cell}})) as PlaceAction[]; },
  parseAction(input) {
    if (!input || typeof input !== 'object') return null;
    const a = input as Record<string, unknown>;
    const p = a['payload'];
    if (a['type'] !== 'place' || (a['actor'] !== 'p1' && a['actor'] !== 'p2') || !p || typeof p !== 'object') return null;
    const cell = (p as Record<string,unknown>)['cell'];
    return typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell <= 8
      ? { type: 'place', actor: a['actor'], payload: {cell} } : null;
  },
  validate(s,a) { return { valid: s.activePlayer === a.actor && legalCells(s).includes(a.payload.cell), errorCode: 'move.illegal' }; },
  reduce(s,a,_context) {
    const next = placeMark(s,a.payload.cell,a.actor);
    const events: GameEvent[] = [
      { id:`place-${next.revision}`, type:'piece.moved', actor:a.actor, turn:s.turnNumber, payload:{cell:a.payload.cell} },
      ...(next.winner ? [{ id:`end-${next.revision}`, type:'game.ended' as const, actor:a.actor, turn:s.turnNumber, payload:{winner: next.winner} }] :
      [{ id:`turn-${next.revision}`, type:'turn.start' as const, actor:next.activePlayer, turn:next.turnNumber, payload:{} }])
    ];
    return { state:next, events, outcome:endResult(next) };
  },
  outcome: endResult,
  botObservation(s,actor: PlayerId) { return { gameId:descriptor.id, playerId:actor, visibleState:this.serialize(s), availableActions:this.legalActions(s,actor) }; },
  scene(s) { return { boardType:'square-grid', layers:[{kind:'cells',columns:3,rows:3,values:s.cells}], accessibleDescription:`3x3 board. Active ${s.activePlayer ?? 'none'}.` }; },
  tutorial(locale: Locale): Tutorial {
    return { id:descriptor.tutorialId, locale, paragraphs: locale === 'vi' ? [
      {title:'Mục tiêu',body:'Lần lượt đặt dấu vào bảng 3×3. Người đầu tiên tạo được 3 dấu liên tiếp theo hàng, cột hoặc đường chéo chiến thắng.'},
      {title:'Lượt chơi',body:'Người chơi 1 (✕) đi trước. Chỉ có thể đặt dấu vào ô trống. Nếu bảng đầy mà không ai thắng, ván đấu hòa.'},
      {title:'Điều khiển',body:'Nhấp/chạm vào ô hoặc dùng phím 1–9. Nhấn H để gợi ý; Ctrl+Z để hoàn tác. Chế độ đấu máy có 3 độ khó.'}
    ] : [
      {title:'Goal',body:'Take turns placing marks on a 3×3 grid. First to form three in a row, column or diagonal wins.'},
      {title:'Turns',body:'Player 1 (✕) starts. Only vacant cells are legal. A full grid without a winner is a draw.'},
      {title:'Controls',body:'Click/tap a cell or press 1–9. H hints, Ctrl+Z undoes. Bot mode has three difficulties.'}
    ] };
  },
  serialize(s) { return { cells:s.cells, phase:s.phase, activePlayer:s.activePlayer, winner:s.winner,
    winningLine:s.winningLine, revision:s.revision, turnNumber:s.turnNumber } as JsonObject; },
  deserialize(serialized, fromVersion) {
    if (fromVersion !== descriptor.rulesetVersion) throw new Error('Unsupported trainer save version');
    return restoreTripleState(serialized);
  }
};
