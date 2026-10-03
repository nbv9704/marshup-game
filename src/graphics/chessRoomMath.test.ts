import { describe, expect, it } from 'vitest';
import { canStandAt, squarePosition } from './chessRoomMath';

describe('Chess room coordinate and collision contract', () => {
  it('maps algebraic corners to opposite sides of the 3D table', () => {
    expect(squarePosition(0).x).toBeCloseTo(-1.89);
    expect(squarePosition(0).z).toBeCloseTo(1.89);
    expect(squarePosition(7).x).toBeCloseTo(1.89);
    expect(squarePosition(56).z).toBeCloseTo(-1.89);
    expect(() => squarePosition(64)).toThrow();
  });
  it('prevents walking through the table and walls', () => {
    expect(canStandAt(0, 4)).toBe(true);
    expect(canStandAt(0, 0)).toBe(false);
    expect(canStandAt(5.2, 4)).toBe(false);
    expect(canStandAt(Number.NaN, 4)).toBe(false);
  });
});
