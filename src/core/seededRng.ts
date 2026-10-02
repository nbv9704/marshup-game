import type { JsonObject, RNG } from '../contracts/types.js';
/** FNV-1a 32-bit seed derivation followed by mulberry32; suitable for deterministic matches,
 * not cryptographic security. Production casino UX must show virtual chips only.
 */
function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
export class SeededRng implements RNG {
  private value: number;
  constructor(seed: string | number) {
    this.value = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  }
  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1) throw new RangeError('maxExclusive must be a positive safe integer');
    if (maxExclusive > 0x100000000) throw new RangeError('maxExclusive too large for 32-bit generator');
    this.value = (this.value + 0x6D2B79F5) >>> 0;
    let t = this.value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const fraction = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(fraction * maxExclusive);
  }
  snapshot(): JsonObject { return { algorithm: 'mulberry32', value: this.value }; }
  static restore(snapshot: JsonObject): SeededRng {
    if (snapshot['algorithm'] !== 'mulberry32' ||
      typeof snapshot['value'] !== 'number' ||
      !Number.isSafeInteger(snapshot['value']) || snapshot['value'] < 0 || snapshot['value'] > 0xffffffff) {
      throw new Error('Invalid RNG snapshot');
    }
    return new SeededRng(snapshot['value']);
  }
}
