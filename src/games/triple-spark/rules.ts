/** Triple Spark: a complete, deterministic 3×3 placement game used to exercise
 * the Phase 2 plugin, renderer, worker, autosave and progression pipeline.
 * This trainer is NOT represented as one of the 38 planned catalog games.
 */
import type { GameState, PlayerId } from '../../contracts/types';
export type Mark = 'p1' | 'p2';
export type Cell = Mark | null;
export interface TripleState extends GameState {
  readonly cells: readonly Cell[];
  readonly activePlayer: Mark | null;
  readonly winner: Mark | 'draw' | null;
  readonly winningLine: readonly number[] | null;
}
const LINES: readonly (readonly number[])[] = [
  [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
];
export function newTripleState(): TripleState {
  return { cells: Array<Cell>(9).fill(null), activePlayer: 'p1', winner: null, winningLine: null,
    phase: 'playing', revision: 0, turnNumber: 1 };
}
export function winningCells(cells: readonly Cell[]): { mark: Mark; line: readonly number[] } | null {
  for (const line of LINES) {
    const m = cells[line[0]!] ?? null;
    if (m !== null && line.every(i => cells[i] === m)) return { mark: m, line };
  }
  return null;
}
export function legalCells(state: TripleState): number[] {
  return state.phase === 'playing' ? state.cells.flatMap((m, i) => m === null ? [i] : []) : [];
}
export function placeMark(state: TripleState, cell: number, actor: PlayerId): TripleState {
  if (state.phase !== 'playing' || actor !== state.activePlayer || !Number.isInteger(cell) || cell < 0 || cell > 8 || state.cells[cell] !== null)
    throw new Error('Illegal Triple Spark move');
  const cells = state.cells.slice();
  cells[cell] = actor;
  const victory = winningCells(cells);
  const draw = victory === null && cells.every(m => m !== null);
  return {
    cells, phase: victory || draw ? 'completed' : 'playing',
    activePlayer: victory || draw ? null : actor === 'p1' ? 'p2' : 'p1',
    winner: victory?.mark ?? (draw ? 'draw' : null), winningLine: victory?.line ?? null,
    revision: state.revision + 1, turnNumber: state.turnNumber + 1
  };
}
/** Validates recovery snapshots and prevents corrupted/untrusted JSON from entering a match. */
export function restoreTripleState(input: unknown): TripleState {
  if (!input || typeof input !== 'object') throw new Error('Invalid match state');
  const s = input as Record<string, unknown>;
  if (!Array.isArray(s['cells']) || s['cells'].length !== 9 || !s['cells'].every(c => c === 'p1' || c === 'p2' || c === null))
    throw new Error('Invalid board');
  const cells = s['cells'] as Cell[];
  const n1 = cells.filter(c => c === 'p1').length, n2 = cells.filter(c => c === 'p2').length;
  if (n2 > n1 || n1 > n2 + 1) throw new Error('Impossible turn counts');
  const win = winningCells(cells), full = cells.every(c => c !== null);
  const completed = win !== null || full;
  const correctTurn = n1 === n2 ? 'p1' : 'p2';
  if ((win && (win.mark === 'p1' ? n1 !== n2+1 : n1 !== n2)) ||
      (completed ? s['phase'] !== 'completed' || s['activePlayer'] !== null : s['phase'] !== 'playing' || s['activePlayer'] !== correctTurn) ||
      s['winner'] !== (win?.mark ?? (full ? 'draw' : null))) throw new Error('Inconsistent game result');
  const rev = s['revision'];
  if (!Number.isSafeInteger(rev) || (rev as number) < 0 || !Number.isSafeInteger(s['turnNumber']) || s['turnNumber'] !== n1+n2+1)
    throw new Error('Invalid move counter');
  return {
    cells: [...cells], phase: s['phase'] as TripleState['phase'],
    activePlayer: s['activePlayer'] as TripleState['activePlayer'],
    winner: s['winner'] as TripleState['winner'], winningLine: win?.line ?? null,
    revision: rev as number, turnNumber: s['turnNumber'] as number
  };
}
export function chooseBotCell(cells: readonly Cell[], difficulty: 'easy'|'normal'|'hard', salt = 0, as: Mark = 'p2'): number {
  const free = cells.flatMap((c, i) => c === null ? [i] : []);
  if (!free.length) throw new Error('No legal moves');
  if (difficulty === 'easy') return free[Math.abs(salt) % free.length]!;
  const opponent: Mark = as === 'p1' ? 'p2' : 'p1';
  const completes = (mark: Mark): number | undefined => free.find(i => {
    const copy = cells.slice(); copy[i] = mark; return winningCells(copy)?.mark === mark;
  });
  const immediate = completes(as) ?? completes(opponent);
  if (immediate !== undefined) return immediate;
  if (difficulty === 'normal') return [4,0,2,6,8,1,3,5,7].find(i => free.includes(i))!;
  const cache = new Map<string, number>();
  const minimax = (board: readonly Cell[], turn: Mark, depth: number): number => {
    const w = winningCells(board);
    if (w) return w.mark === as ? 10-depth : depth-10;
    if (board.every(c => c !== null)) return 0;
    const key = `${turn}:${board.map(cell => cell === 'p1' ? '1' : cell === 'p2' ? '2' : '0').join('')}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const scores = board.flatMap((m, i) => {
      if (m !== null) return [];
      const copy = board.slice(); copy[i] = turn;
      return [minimax(copy, turn === 'p1' ? 'p2' : 'p1', depth+1)];
    });
    const score = turn === as ? Math.max(...scores) : Math.min(...scores);
    cache.set(key, score);
    return score;
  };
  const priorities = [4,0,2,6,8,1,3,5,7].filter(i => free.includes(i));
  const ranked = priorities.map(i => {
    const copy = cells.slice(); copy[i] = as;
    return { i, score: minimax(copy, opponent, 1) };
  });
  ranked.sort((a,b)=>b.score-a.score);
  return ranked[0]!.i;
}
