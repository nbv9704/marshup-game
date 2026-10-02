import type { GameAction, GameEvent, IGameModule, JsonObject, Locale, Outcome, PlayerId, RuntimeContext, SetupConfig, Tutorial } from '../../contracts/types';
import { descriptor } from './descriptor';
import { MAX_ACTIONS, createLudoState, legalPawnMoves, ludoScore, moveLudoPawn, nextPlayer, restoreLudoState, type LudoState } from './rules';

export type LudoAction =
  | (GameAction & { readonly type: 'roll'; readonly payload: Record<string, never> })
  | (GameAction & { readonly type: 'move'; readonly payload: { readonly pawn: number } });

function scores(state: LudoState): JsonObject { return Object.fromEntries(state.players.map(p => [p.id, ludoScore(state, p.id)])); }
function result(state: LudoState): Outcome | null {
  if (state.phase !== 'completed') return null;
  const values = state.players.map(p => ({ id: p.id, score: ludoScore(state, p.id) }));
  const best = Math.max(...values.map(v => v.score));
  const winners = state.winner ? [state.winner] : values.filter(v => v.score === best).map(v => v.id);
  return { terminal: true, reason: state.terminalReason ?? 'safety-limit', winningPlayers: winners, scoreboard: scores(state) };
}
function safety(state: LudoState): LudoState {
  return state.revision >= MAX_ACTIONS ? { ...state, phase: 'completed', activePlayer: null, pendingRoll: null, terminalReason: 'safety-limit' } : state;
}

export const ludo: IGameModule<LudoState, LudoAction> = {
  descriptor,
  setup(config: SetupConfig) {
    const ids = config.players.map(p => p.id);
    return createLudoState(ids.length >= 2 && ids.length <= 4 ? ids : ['p1','p2']);
  },
  legalActions(state, actor) {
    if (state.phase !== 'playing' || actor !== state.activePlayer) return [];
    if (state.pendingRoll === null) return [{ type: 'roll', actor, payload: {} }];
    return legalPawnMoves(state, actor).map(pawn => ({ type: 'move', actor, payload: { pawn } }));
  },
  parseAction(input) {
    if (!input || typeof input !== 'object') return null;
    const a = input as Record<string, unknown>, actor = a['actor'], payload = a['payload'];
    if (!['p1','p2','p3','p4'].includes(String(actor)) || !payload || typeof payload !== 'object') return null;
    if (a['type'] === 'roll') {
      const parsed: LudoAction = { type: 'roll', actor: actor as PlayerId, payload: {} };
      return parsed;
    }
    const pawn = (payload as Record<string, unknown>)['pawn'];
    if (a['type'] !== 'move' || !Number.isInteger(pawn) || (pawn as number) < 0 || (pawn as number) >= 4) return null;
    const parsed: LudoAction = { type: 'move', actor: actor as PlayerId, payload: { pawn: pawn as number } };
    return parsed;
  },
  validate(state, action) {
    const valid = action.actor === state.activePlayer && (action.type === 'roll'
      ? state.phase === 'playing' && state.pendingRoll === null
      : legalPawnMoves(state, action.actor).includes(action.payload.pawn));
    return { valid, errorCode: valid ? undefined : 'move.illegal' };
  },
  reduce(state, action, context: RuntimeContext) {
    if (!this.validate(state, action).valid) throw new Error('Illegal Ludo action');
    const revision = state.revision + 1, turnNumber = state.turnNumber + 1;
    const events: GameEvent[] = [];
    let next: LudoState;
    if (action.type === 'roll') {
      const roll = context.rng.nextInt(6) + 1;
      events.push({ id:`roll-${revision}`, type:'dice.rolled', actor:action.actor, turn:state.turnNumber, payload:{ roll } });
      const thirdSix = roll === 6 && state.consecutiveSixes === 2;
      const sixes = roll === 6 ? state.consecutiveSixes + 1 : 0;
      const available = thirdSix ? [] : legalPawnMoves({ ...state, pendingRoll: roll }, action.actor, roll);
      if (available.length) next = { ...state, pendingRoll: roll, consecutiveSixes: sixes, revision, turnNumber };
      else {
        const bonus = roll === 6 && !thirdSix;
        const activePlayer = bonus ? action.actor : nextPlayer(state, action.actor);
        next = { ...state, pendingRoll: null, consecutiveSixes: bonus ? sixes : 0, activePlayer, revision, turnNumber };
        events.push({ id:`turn-${revision}`, type:'turn.start', actor:activePlayer, turn:turnNumber, payload:{} });
      }
    } else {
      const moved = moveLudoPawn(state, action.actor, action.payload.pawn);
      events.push({ id:`move-${revision}`, type:'piece.moved', actor:action.actor, turn:state.turnNumber,
        payload:{ pawn:action.payload.pawn, roll:state.pendingRoll! } });
      moved.captures.forEach((capture, i) => events.push({ id:`capture-${revision}-${i}`, type:'piece.captured', actor:action.actor,
        turn:state.turnNumber, payload:{ player:capture.player, pawn:capture.pawn } }));
      const won = moved.state.winner !== null;
      const bonus = state.pendingRoll === 6 && !won;
      const activePlayer = won ? null : bonus ? action.actor : nextPlayer(state, action.actor);
      next = { ...moved.state, activePlayer, consecutiveSixes: bonus ? state.consecutiveSixes : 0, revision, turnNumber };
      if (won) events.push({ id:`end-${revision}`, type:'game.ended', actor:action.actor, turn:state.turnNumber, payload:{ winner:action.actor } });
      else events.push({ id:`turn-${revision}`, type:'turn.start', actor:activePlayer, turn:turnNumber, payload:{} });
    }
    next = safety(next);
    if (next.terminalReason === 'safety-limit') events.push({ id:`end-${revision}`, type:'game.ended', actor:null, turn:turnNumber, payload:{ reason:'safety-limit' } });
    return { state: next, events, outcome: result(next) };
  },
  outcome: result,
  botObservation(state, actor) { return { gameId:descriptor.id, playerId:actor, visibleState:this.serialize(state), availableActions:this.legalActions(state, actor) }; },
  scene(state) { return { boardType:'ludo-cross', layers:[
    { kind:'pawns', players:state.players.map(p => ({ id:p.id, pawns:[...p.pawns] })) } as JsonObject,
    { kind:'die', value:state.pendingRoll } as JsonObject
  ],
    accessibleDescription:`Ludo turn ${state.turnNumber}. Active ${state.activePlayer ?? 'none'}; die ${state.pendingRoll ?? 'not rolled'}.` }; },
  tutorial(locale: Locale): Tutorial { return { id:descriptor.tutorialId, locale, paragraphs: locale === 'vi' ? [
    { title:'Mục tiêu', body:'Đưa cả bốn quân từ chuồng đi hết vòng bàn rồi vào ô đích 57. Người đầu tiên đưa đủ bốn quân về đích thắng.' },
    { title:'Đổ xúc xắc', body:'Cần đổ 6 để xuất quân. Đổ 6 được thêm lượt; lần 6 thứ ba liên tiếp làm mất lượt. Mỗi lần đổ phải chọn một nước hợp lệ nếu có.' },
    { title:'Bắt và chặn', body:'Đáp vào quân đối thủ ở ô thường sẽ bắt quân đó về chuồng. Bốn ô xuất phát là ô an toàn. Hai quân cùng màu tạo chặn: không quân nào được đi xuyên hoặc đáp lên chặn.' },
    { title:'Về đích', body:'Phải đổ đúng số để tới ô 57. Để bảo đảm ván mô phỏng luôn kết thúc, giới hạn an toàn 2.000 hành động sẽ xếp hạng theo tổng quãng đường.' }
  ] : [
    { title:'Goal', body:'Race all four pawns out of the yard, around the track and to home space 57. The first player to bring all four home wins.' },
    { title:'Rolling', body:'A six enters a pawn and grants another turn. A third consecutive six forfeits the turn. After each roll, choose a legal pawn when one exists.' },
    { title:'Capture and blocks', body:'Landing on an opponent on an ordinary square sends it to the yard. The four starting squares are safe. Two friendly pawns form a block that cannot be crossed or landed on.' },
    { title:'Home', body:'Home requires an exact roll. A 2,000-action simulation safety cap ranks players by total progress so automated matches always terminate.' }
  ] }; },
  serialize(state) { return { players:state.players.map(p => ({ id:p.id, pawns:[...p.pawns] })), pendingRoll:state.pendingRoll, consecutiveSixes:state.consecutiveSixes, winner:state.winner,
    terminalReason:state.terminalReason, phase:state.phase, activePlayer:state.activePlayer, revision:state.revision, turnNumber:state.turnNumber } as JsonObject; },
  deserialize(serialized, version) { if (version !== descriptor.rulesetVersion) throw new Error('Unsupported Ludo save version'); return restoreLudoState(serialized); }
};
