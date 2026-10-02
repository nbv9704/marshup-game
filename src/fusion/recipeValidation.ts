import type { FusionRecipe } from '../contracts/fusion.js';
/** Schema-level checks only. Rule legality and balance validation are performed by the Phase 4 engine. */
export function validateRecipe(recipe: FusionRecipe, knownGameIds: ReadonlySet<string>): readonly string[] {
  const errors: string[] = [];
  if (recipe.schemaVersion !== 1) errors.push('schema-version');
  if (!knownGameIds.has(recipe.baseGameId)) errors.push('unknown-base');
  if (recipe.modifierGameIds.length < 1 || recipe.modifierGameIds.length > 2) errors.push('modifier-count');
  if (recipe.modifierGameIds.some(id => !knownGameIds.has(id))) errors.push('unknown-modifier');
  if (new Set([recipe.baseGameId, ...recipe.modifierGameIds]).size !== 1 + recipe.modifierGameIds.length) {
    errors.push('duplicate-game');
  }
  if (!Number.isSafeInteger(recipe.balanceConfig.maxTurns) || recipe.balanceConfig.maxTurns < 1) errors.push('bad-max-turns');
  if (recipe.balanceConfig.maxEventsPerAction < 1 || recipe.balanceConfig.maxEventsPerAction > 128) errors.push('bad-event-limit');
  if (recipe.balanceConfig.maxEffectChainDepth < 1 || recipe.balanceConfig.maxEffectChainDepth > 16) errors.push('bad-depth-limit');
  if (!recipe.effects.every(effect => effect.fallbackEffectId.length > 0 && effect.priority >= 0)) errors.push('effect-fallback-or-priority');
  return errors;
}
