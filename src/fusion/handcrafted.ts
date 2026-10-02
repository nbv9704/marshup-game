import type { FusionRecipe } from '../contracts/fusion.js';
/** First two Phase-1 representative *design-data* recipes; execution is Phase 4 scope.
 * The complete 36-entry authored spec is in docs/handcrafted-recipes.json.
 */
export const CHROMATIC_CHESS: FusionRecipe = {
  schemaVersion: 1, id: 'HC-01', baseGameId: 'chess', modifierGameIds: ['uno'],
  displayName: { vi: 'Cờ Vua Sắc Màu', en: 'Chromatic Chess' },
  tier: 'handcrafted', recipeVersion: '0.1-design',
  effects: [
    { id: 'draw-one', sourceTag: 'draw', targetHook: 'turn.end', effectKind: 'draw-effect-card', parameters: { quantity: 1 }, priority: 10, oncePerTurn: true, descriptionKey: 'chess.uno.draw', fallbackEffectId: 'gain-1-energy' },
    { id: 'plus-two', sourceTag: 'draw', targetHook: 'card.played', effectKind: 'restore-captured', parameters: { max: 2, exclude: ['king'], requireKingSafety: true }, priority: 20, oncePerTurn: true, descriptionKey: 'chess.uno.plus2', fallbackEffectId: 'gain-1-energy' },
    { id: 'reverse', sourceTag: 'reverse', targetHook: 'card.played', effectKind: 'flip-pawn-orientation', parameters: { toggle: true, cameraRotationDegrees: 180, preserveKingSafety: true }, priority: 20, oncePerTurn: true, descriptionKey: 'chess.uno.reverse', fallbackEffectId: 'gain-1-energy' },
    { id: 'skip', sourceTag: 'skip', targetHook: 'card.played', effectKind: 'skip-if-not-in-check', parameters: { protectedIfInCheck: true }, priority: 20, oncePerTurn: true, descriptionKey: 'chess.uno.skip', fallbackEffectId: 'gain-1-energy' },
    { id: 'wild', sourceTag: 'swap', targetHook: 'card.played', effectKind: 'transform-non-king', parameters: { allowed: ['queen','rook','bishop','knight','pawn'], preserveKingSafety: true }, priority: 20, oncePerTurn: true, descriptionKey: 'chess.uno.wild', fallbackEffectId: 'gain-1-energy' },
    { id: 'plus-four', sourceTag: 'draw', targetHook: 'card.played', effectKind: 'remove-enemy-non-king', parameters: { max: 1, requireKingSafety: true }, priority: 20, oncePerTurn: true, descriptionKey: 'chess.uno.plus4', fallbackEffectId: 'gain-1-energy' }
  ],
  rulesTextKeys: ['chess.uno.base','chess.uno.derived','fusion.energy'],
  balanceConfig: { maxTurns: 180, maxEventsPerAction: 64, maxEffectChainDepth: 8, scoringPolicy: 'chess-fusion-maxturns-v1' }
};
export const TWENTY_ONE_SPRINT: FusionRecipe = {
  schemaVersion: 1, id: 'HC-02', baseGameId: 'ludo', modifierGameIds: ['blackjack'],
  displayName: { vi: 'Đua 21', en: 'Twenty-One Sprint' },
  tier: 'handcrafted', recipeVersion: '0.1-design',
  effects: [
    { id: 'card-steps', sourceTag: 'draw', targetHook: 'turn.start', effectKind: 'draw-for-steps', parameters: { softCap: 21, legalMovesOnly: true, exact21ExtraTurnCap: 1, bustForfeitsTurn: true }, priority: 10, oncePerTurn: true, descriptionKey: 'ludo.blackjack.draw', fallbackEffectId: 'end-turn' }
  ],
  rulesTextKeys: ['ludo.blackjack.base','ludo.blackjack.derived'],
  balanceConfig: { maxTurns: 360, maxEventsPerAction: 64, maxEffectChainDepth: 8, scoringPolicy: 'ludo-progress-v1' }
};
