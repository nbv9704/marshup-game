export const BOARD_SQUARE_SIZE = 0.54;

/** White's first rank is the near (+z) edge of the shared 3D board. */
export function squarePosition(square: number): { x: number; z: number } {
  if (!Number.isInteger(square) || square < 0 || square > 63) throw new RangeError('Invalid Chess square');
  return { x: ((square % 8) - 3.5) * BOARD_SQUARE_SIZE,
    z: (3.5 - Math.floor(square / 8)) * BOARD_SQUARE_SIZE };
}

/** Keep the walk camera inside the room and outside the central table. */
export function canStandAt(x: number, z: number): boolean {
  return Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 5.1 && Math.abs(z) <= 5.1 &&
    (Math.abs(x) >= 2.75 || Math.abs(z) >= 2.75);
}
