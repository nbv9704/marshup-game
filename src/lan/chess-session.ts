import { descriptor } from '../games/chess/descriptor';
import { chooseChessMove } from '../games/chess/bot';
import { applyMove, legalMoves, newChessState, restoreChessState, serializeChessState, type ChessMove, type ChessState } from '../games/chess/rules';
import type { JsonObject } from '../contracts/types';

/** Pure host-side match authority. A future transport must bind each token to its connection. */
export interface ChessLanIntent {
  readonly requestId: string;
  readonly baseRevision: number;
  readonly from: number;
  readonly to: number;
  readonly promotion?: ChessMove['promotion'];
}
export type ChessLanError =
  | 'room.closed' | 'seat.unavailable' | 'version.unsupported' | 'session.invalid'
  | 'session.disconnected' | 'game.paused' | 'game.not-your-turn' | 'game.stale-revision'
  | 'game.illegal-move' | 'game.invalid-intent';
/** A deliberately separate network projection; repetition bookkeeping stays host-local. */
export type ChessLanPublicState = Omit<ChessState, 'positionCounts'>;
export type ChessLanResult =
  | { readonly ok: true; readonly revision: number; readonly state: ChessLanPublicState }
  | { readonly ok: false; readonly error: ChessLanError; readonly revision: number };
export interface ChessLanView {
  readonly roomEpoch: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly revision: number;
  readonly guest: 'bot' | 'connected' | 'disconnected';
  readonly state: ChessLanPublicState;
}

export const CHESS_LAN_GRACE_MS = 90_000;
const MAX_DEDUP = 128;
const idOk = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const error = (code: ChessLanError, revision: number): ChessLanResult => ({ ok: false, error: code, revision });
const project = (state: ChessState): ChessLanPublicState => {
  const { positionCounts: _hostOnly, ...visible } = state;
  return structuredClone(visible);
};

export class ChessLanHostSession {
  readonly roomEpoch = crypto.randomUUID();
  readonly hostToken = crypto.randomUUID();
  private guestToken: string | null = null;
  private guestConnected = false;
  private guestDeadline: number | null = null;
  private closed = false;
  private state: ChessState = newChessState();
  private readonly dedup = new Map<string, { fingerprint: string; result: ChessLanResult }>();

  /** Full state stays local; never send this snapshot to a LAN guest. */
  snapshotForLocalSave(): JsonObject { return serializeChessState(this.state); }

  static restoreLocalSave(input: unknown): ChessLanHostSession {
    const session = new ChessLanHostSession();
    session.state = restoreChessState(input);
    return session;
  }

  /** Each committed Chess move is a safe boundary for replacing the bot seat. */
  join(rulesetVersion: string): { ok: true; token: string; view: ChessLanView } | { ok: false; error: ChessLanError } {
    if (this.closed) return { ok: false, error: 'room.closed' };
    if (rulesetVersion !== descriptor.rulesetVersion) return { ok: false, error: 'version.unsupported' };
    if (this.guestToken || this.state.phase !== 'playing') return { ok: false, error: 'seat.unavailable' };
    this.guestToken = crypto.randomUUID();
    this.guestConnected = true;
    return { ok: true, token: this.guestToken, view: this.view() };
  }

  view(): ChessLanView {
    return { roomEpoch: this.roomEpoch, rulesetId: descriptor.rulesetId,
      rulesetVersion: descriptor.rulesetVersion, revision: this.state.revision,
      guest: this.guestToken ? this.guestConnected ? 'connected' : 'disconnected' : 'bot',
      state: project(this.state) };
  }

  /** Connection is established by a transport; this class never accepts a client-supplied actor. */
  submit(token: string, intent: ChessLanIntent): ChessLanResult {
    if (this.closed) return error('room.closed', this.state.revision);
    const seat = token === this.hostToken ? 'p1' : token === this.guestToken ? 'p2' : null;
    if (!seat) return error('session.invalid', this.state.revision);
    if (seat === 'p2' && !this.guestConnected) return error('session.disconnected', this.state.revision);
    if (this.guestToken && !this.guestConnected) return error('game.paused', this.state.revision);
    if (!intent || !idOk(intent.requestId) || !Number.isSafeInteger(intent.baseRevision) ||
      !Number.isInteger(intent.from) || !Number.isInteger(intent.to) || intent.from < 0 || intent.from > 63 ||
      intent.to < 0 || intent.to > 63 ||
      (intent.promotion !== undefined && !['queen', 'rook', 'bishop', 'knight'].includes(intent.promotion))) {
      return error('game.invalid-intent', this.state.revision);
    }
    const key = `${seat}:${intent.requestId}`;
    const fingerprint = JSON.stringify([intent.baseRevision, intent.from, intent.to, intent.promotion ?? null]);
    const prior = this.dedup.get(key);
    if (prior) return prior.fingerprint === fingerprint ? prior.result : error('game.invalid-intent', this.state.revision);
    let result: ChessLanResult;
    if (intent.baseRevision !== this.state.revision) result = error('game.stale-revision', this.state.revision);
    else if (this.state.activePlayer !== seat) result = error('game.not-your-turn', this.state.revision);
    else {
      const move: ChessMove = intent.promotion === undefined ? { from: intent.from, to: intent.to } :
        { from: intent.from, to: intent.to, promotion: intent.promotion };
      const legal = legalMoves(this.state).some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion);
      if (!legal) result = error('game.illegal-move', this.state.revision);
      else {
        this.state = applyMove(this.state, move);
        result = { ok: true, revision: this.state.revision, state: project(this.state) };
      }
    }
    this.dedup.set(key, { fingerprint, result });
    if (this.dedup.size > MAX_DEDUP) this.dedup.delete(this.dedup.keys().next().value!);
    return result;
  }

  disconnect(token: string, now = Date.now()): boolean {
    if (this.closed || token !== this.guestToken || !this.guestConnected || !Number.isFinite(now)) return false;
    this.guestConnected = false;
    this.guestDeadline = now + CHESS_LAN_GRACE_MS;
    return true;
  }

  /** A deliberate leave frees the seat immediately; an unexpected drop keeps its grace period. */
  leave(token: string): boolean {
    if (this.closed || token !== this.guestToken) return false;
    this.guestToken = null;
    this.guestConnected = false;
    this.guestDeadline = null;
    return true;
  }

  rejoin(token: string, rulesetVersion: string, now = Date.now()): { token: string; view: ChessLanView } | null {
    if (this.closed || rulesetVersion !== descriptor.rulesetVersion || token !== this.guestToken ||
      this.guestConnected || this.guestDeadline === null || !Number.isFinite(now) || now > this.guestDeadline) return null;
    this.guestConnected = true;
    this.guestDeadline = null;
    this.guestToken = crypto.randomUUID();
    return { token: this.guestToken, view: this.view() };
  }

  /** Local bot can fill the unoccupied seat; guests can never call this through transport. */
  botTurn(difficulty: 'easy' | 'normal' | 'hard' = 'normal'): ChessLanResult {
    if (this.closed) return error('room.closed', this.state.revision);
    if (this.guestToken || this.state.activePlayer !== 'p2') return error('game.not-your-turn', this.state.revision);
    const move = chooseChessMove(this.state, difficulty, this.state.revision);
    this.state = applyMove(this.state, move);
    return { ok: true, revision: this.state.revision, state: project(this.state) };
  }

  /** After grace, revert to a bot-controlled seat; no hidden automatic move is made. */
  expire(now = Date.now()): boolean {
    if (this.closed || this.guestDeadline === null || !Number.isFinite(now) || now <= this.guestDeadline) return false;
    this.guestToken = null;
    this.guestConnected = false;
    this.guestDeadline = null;
    return true;
  }

  close(): void {
    this.closed = true;
    this.guestToken = null;
    this.guestConnected = false;
    this.guestDeadline = null;
    this.dedup.clear();
  }
}
