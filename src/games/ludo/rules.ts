import type { BotDifficulty, GameState, PlayerId } from '../../contracts/types';

export const PAWNS_PER_PLAYER = 4;
export const TRACK_LENGTH = 52;
export const FINISH_PROGRESS = 57;
export const MAX_ACTIONS = 2000;
export type PawnProgress = number; // -1 yard, 0..51 track, 52..56 home lane, 57 home.

export interface LudoPlayer {
  readonly id: PlayerId;
  readonly pawns: readonly PawnProgress[];
}
export interface LudoState extends GameState {
  readonly players: readonly LudoPlayer[];
  readonly pendingRoll: number | null;
  readonly consecutiveSixes: number;
  readonly winner: PlayerId | null;
  readonly terminalReason: 'victory' | 'safety-limit' | null;
}

const STARTS: Readonly<Record<PlayerId, number>> = { p1: 0, p2: 13, p3: 26, p4: 39 };
export const SAFE_SQUARES = new Set([0, 13, 26, 39]);

export function createLudoState(ids: readonly PlayerId[]): LudoState {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length) throw new Error('Ludo requires 2-4 unique players');
  return { players: ids.map(id => ({ id, pawns: [-1, -1, -1, -1] })), pendingRoll: null,
    consecutiveSixes: 0, winner: null, terminalReason: null, phase: 'playing', activePlayer: ids[0]!, revision: 0, turnNumber: 1 };
}

export function globalSquare(player: PlayerId, progress: number): number | null {
  return progress >= 0 && progress < TRACK_LENGTH ? (STARTS[player] + progress) % TRACK_LENGTH : null;
}

function occupancy(state: LudoState, square: number): Array<{ player: PlayerId; pawn: number }> {
  const found: Array<{ player: PlayerId; pawn: number }> = [];
  for (const p of state.players) p.pawns.forEach((progress, pawn) => {
    if (globalSquare(p.id, progress) === square) found.push({ player: p.id, pawn });
  });
  return found;
}

function blockedSquares(state: LudoState): Set<number> {
  const result = new Set<number>();
  for (let square = 0; square < TRACK_LENGTH; square++) {
    const occupants = occupancy(state, square);
    const counts = new Map<PlayerId, number>();
    occupants.forEach(o => counts.set(o.player, (counts.get(o.player) ?? 0) + 1));
    if ([...counts.values()].some(count => count >= 2)) result.add(square);
  }
  return result;
}

export function legalPawnMoves(state: LudoState, actor: PlayerId, roll = state.pendingRoll): number[] {
  if (state.phase !== 'playing' || actor !== state.activePlayer || roll === null || roll < 1 || roll > 6) return [];
  const player = state.players.find(p => p.id === actor);
  if (!player) return [];
  const blocks = blockedSquares(state);
  return player.pawns.flatMap((progress, pawn) => {
    const target = progress === -1 ? (roll === 6 ? 0 : -1) : progress + roll;
    if (target < 0 || target > FINISH_PROGRESS) return [];
    if (target < TRACK_LENGTH) {
      for (let step = progress < 0 ? 0 : progress + 1; step <= target; step++) {
        const square = globalSquare(actor, step);
        if (square !== null && blocks.has(square)) {
          const ownAtTarget = step === target && occupancy(state, square).filter(o => o.player === actor).length < 2;
          if (!ownAtTarget) return [];
        }
      }
      const square = globalSquare(actor, target)!;
      const occupants = occupancy(state, square);
      const ownCount = occupants.filter(o => o.player === actor).length;
      const opponents = occupants.filter(o => o.player !== actor).length;
      const opponentBlock = opponents >= 2;
      // Safe squares protect occupants; they are not shared by opposing colours.
      if (ownCount >= 2 || opponentBlock || (SAFE_SQUARES.has(square) && opponents > 0)) return [];
    }
    return [pawn];
  });
}

export interface LudoMoveResult { readonly state: LudoState; readonly captures: readonly { player: PlayerId; pawn: number }[]; }

export function moveLudoPawn(state: LudoState, actor: PlayerId, pawn: number): LudoMoveResult {
  const roll = state.pendingRoll;
  if (roll === null || !Number.isInteger(pawn) || !legalPawnMoves(state, actor, roll).includes(pawn)) throw new Error('Illegal Ludo move');
  const players = state.players.map(p => ({ id: p.id, pawns: [...p.pawns] }));
  const player = players.find(p => p.id === actor)!;
  const old = player.pawns[pawn]!;
  const target = old === -1 ? 0 : old + roll;
  player.pawns[pawn] = target;
  const captures: Array<{ player: PlayerId; pawn: number }> = [];
  const square = globalSquare(actor, target);
  if (square !== null && !SAFE_SQUARES.has(square)) {
    for (const opponent of players) if (opponent.id !== actor) opponent.pawns.forEach((progress, index) => {
      if (globalSquare(opponent.id, progress) === square) { opponent.pawns[index] = -1; captures.push({ player: opponent.id, pawn: index }); }
    });
  }
  const won = player.pawns.every(value => value === FINISH_PROGRESS);
  return { state: { ...state, players, pendingRoll: null, winner: won ? actor : null,
    terminalReason: won ? 'victory' : state.terminalReason, phase: won ? 'completed' : state.phase }, captures };
}

export function nextPlayer(state: LudoState, actor: PlayerId): PlayerId {
  const index = state.players.findIndex(p => p.id === actor);
  return state.players[(index + 1) % state.players.length]!.id;
}

export function ludoScore(state: LudoState, player: PlayerId): number {
  const p = state.players.find(item => item.id === player);
  return p ? p.pawns.reduce((sum, value) => sum + (value < 0 ? 0 : value + 1), 0) : 0;
}

export function chooseLudoBotPawn(state: LudoState, difficulty: BotDifficulty, salt = 0): number {
  const actor = state.activePlayer;
  if (!actor) throw new Error('No active player');
  const legal = legalPawnMoves(state, actor);
  if (!legal.length) throw new Error('No legal pawn move');
  if (difficulty === 'easy') return legal[Math.abs(salt) % legal.length]!;
  const player = state.players.find(p => p.id === actor)!;
  const roll = state.pendingRoll!;
  const value = (pawn: number): number => {
    const old = player.pawns[pawn]!;
    const target = old < 0 ? 0 : old + roll;
    const square = globalSquare(actor, target);
    const captures = square !== null && !SAFE_SQUARES.has(square)
      ? occupancy(state, square).filter(o => o.player !== actor).length : 0;
    return captures * 1000 + (target === FINISH_PROGRESS ? 500 : 0) + (old < 0 ? 80 : 0) + target;
  };
  return [...legal].sort((a, b) => value(b) - value(a) || a - b)[0]!;
}

export function restoreLudoState(input: unknown): LudoState {
  if (!input || typeof input !== 'object') throw new Error('Invalid Ludo state');
  const s = input as Record<string, unknown>;
  if (!Array.isArray(s['players']) || s['players'].length < 2 || s['players'].length > 4) throw new Error('Invalid Ludo players');
  const players = s['players'].map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid Ludo player');
    const p = raw as Record<string, unknown>, id = p['id'];
    if (!['p1','p2','p3','p4'].includes(String(id)) || !Array.isArray(p['pawns']) || p['pawns'].length !== 4 ||
      !p['pawns'].every(v => Number.isInteger(v) && (v as number) >= -1 && (v as number) <= FINISH_PROGRESS)) throw new Error('Invalid Ludo pawns');
    return { id: id as PlayerId, pawns: [...p['pawns']] as number[] };
  });
  if (new Set(players.map(p => p.id)).size !== players.length) throw new Error('Duplicate Ludo player');
  const active = s['activePlayer'];
  if (active !== null && !players.some(p => p.id === active)) throw new Error('Invalid active player');
  const pending = s['pendingRoll'];
  if (pending !== null && (!Number.isInteger(pending) || (pending as number) < 1 || (pending as number) > 6)) throw new Error('Invalid die');
  if (!Number.isSafeInteger(s['revision']) || (s['revision'] as number) < 0 || !Number.isSafeInteger(s['turnNumber']) || (s['turnNumber'] as number) < 1) throw new Error('Invalid counters');
  const phase = s['phase'];
  if (phase !== 'playing' && phase !== 'completed') throw new Error('Invalid phase');
  const winner = s['winner'];
  if (winner !== null && !players.some(p => p.id === winner)) throw new Error('Invalid winner');
  const terminalReason = s['terminalReason'];
  if (terminalReason !== null && terminalReason !== 'victory' && terminalReason !== 'safety-limit') throw new Error('Invalid terminal reason');
  if ((phase === 'completed') !== (terminalReason !== null) || (winner !== null && terminalReason !== 'victory')) throw new Error('Inconsistent result');
  const sixes = s['consecutiveSixes'];
  if (!Number.isInteger(sixes) || (sixes as number) < 0 || (sixes as number) > 2) throw new Error('Invalid six counter');
  return { players, pendingRoll: pending as number | null, consecutiveSixes: sixes as number, winner: winner as PlayerId | null,
    terminalReason, phase, activePlayer: active as PlayerId | null, revision: s['revision'] as number, turnNumber: s['turnNumber'] as number };
}
