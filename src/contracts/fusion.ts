import type { EventKind, GameAction, GameEvent, GameState, JsonObject, MechanicTag, PlayerId, RNG, SetupConfig, Transition, ValidationResult } from './types.js';
export type FusionTier = 'handcrafted' | 'generated';
export type FusionStatus = 'unvalidated' | 'provisional' | 'verified' | 'quarantined';
export interface FusionEffect {
  readonly id: string;
  readonly sourceTag: MechanicTag;
  readonly targetHook: EventKind;
  readonly effectKind: string;
  readonly parameters: JsonObject;
  readonly priority: number;
  readonly oncePerTurn: boolean;
  readonly descriptionKey: string;
  readonly fallbackEffectId: string;
}
export interface FusionRecipe {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly baseGameId: string;
  readonly modifierGameIds: readonly string[]; // 1 by default; 2 after level 10.
  readonly displayName: { readonly vi: string; readonly en: string };
  readonly tier: FusionTier;
  readonly recipeVersion: string;
  readonly effects: readonly FusionEffect[];
  readonly rulesTextKeys: readonly string[];
  readonly balanceConfig: {
    readonly maxTurns: number;
    readonly maxEventsPerAction: number;
    readonly maxEffectChainDepth: number;
    readonly scoringPolicy: string;
  };
}
export interface EffectProposal {
  readonly effectId: string;
  readonly actor: PlayerId | null;
  readonly action: GameAction;
  readonly provenance: readonly string[];
}
/** Game-specific bindings keep generic fusion actions from violating base-game legality. */
export interface FusionAdapter<S extends GameState, A extends GameAction> {
  readonly baseGameId: string;
  readonly acceptedTags: readonly MechanicTag[];
  supports(effect: FusionEffect, state: S): boolean;
  propose(event: GameEvent, effect: FusionEffect, state: S, rng: RNG): readonly EffectProposal[];
  validateProposal(state: S, proposal: EffectProposal): ValidationResult;
  applyProposal(state: S, proposal: EffectProposal, config: SetupConfig, rng: RNG): Transition<S>;
  safeFallback(state: S, effect: FusionEffect, actor: PlayerId | null, rng: RNG): Transition<S>;
}
export interface BalanceReport {
  readonly recipeId: string;
  readonly simulationCount: number;
  readonly seatWinRates: readonly number[];
  readonly drawRate: number;
  readonly timeoutRate: number;
  readonly medianTurns: number;
  readonly maxTurnPercentile95: number;
  readonly confidence: 'low' | 'medium' | 'high';
  readonly status: FusionStatus;
  readonly parameterRevision: number;
}
