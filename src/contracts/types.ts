/** Public, JSON-safe contracts shared by runtime, workers, persistence and game modules. */
export type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };
export type JsonObject = { readonly [key: string]: Json };
export type Locale = 'vi' | 'en';
export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4';
export type GameCategory = 'board' | 'card' | 'casino';
export type GameKind = 'competitive' | 'solo' | 'round-scored';
export type Phase = 'setup' | 'playing' | 'resolving' | 'completed';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type MechanicTag =
  | 'draw' | 'reverse' | 'skip' | 'capture' | 'bet' | 'random'
  | 'resurrect' | 'swap' | 'shield' | 'roll' | 'spin' | 'peek'
  | 'place' | 'discard' | 'race' | 'collect' | 'challenge' | 'multiply';
export type EventKind =
  | 'turn.start' | 'turn.end' | 'card.drawn' | 'card.played'
  | 'piece.moved' | 'piece.captured' | 'dice.rolled' | 'bet.placed'
  | 'spin.completed' | 'score.changed' | 'round.ended' | 'game.ended';
export interface PlayerConfig {
  readonly id: PlayerId;
  readonly controller: 'human' | 'bot';
  readonly difficulty?: BotDifficulty;
  readonly displayName: string;
}
export interface SetupConfig {
  readonly matchId: string;
  readonly players: readonly PlayerConfig[];
  readonly mode: 'bot' | 'hotseat' | 'practice' | 'daily' | 'survival';
  readonly seed: string;
  readonly locale: Locale;
  readonly options: JsonObject;
}
export interface GameDescriptor {
  readonly id: string;
  readonly title: { readonly vi: string; readonly en: string };
  readonly category: GameCategory;
  readonly kind: GameKind;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly mechanicTags: readonly MechanicTag[];
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly tutorialId: string;
  readonly isReady: boolean; // Registry excludes unfinished plugins from shipped navigation.
}
export interface GameAction {
  readonly type: string;
  readonly actor: PlayerId;
  readonly payload: JsonObject;
}
export interface ValidationResult {
  readonly valid: boolean;
  readonly errorCode?: string;
  readonly i18nArgs?: JsonObject;
}
export interface GameEvent {
  readonly id: string;
  readonly type: EventKind;
  readonly turn: number;
  readonly actor: PlayerId | null;
  readonly payload: JsonObject;
}
export interface GameState {
  readonly phase: Phase;
  readonly turnNumber: number;
  readonly activePlayer: PlayerId | null;
  readonly revision: number;
}
export interface Outcome {
  readonly terminal: true;
  readonly reason: 'victory' | 'draw' | 'forfeit' | 'round-limit' | 'safety-limit';
  readonly winningPlayers: readonly PlayerId[];
  readonly scoreboard: JsonObject;
}
export interface Transition<S extends GameState> {
  readonly state: S;
  readonly events: readonly GameEvent[];
  readonly outcome: Outcome | null;
}
export interface RuleParagraph {
  readonly title: string;
  readonly body: string;
}
export interface Tutorial {
  readonly id: string;
  readonly locale: Locale;
  readonly paragraphs: readonly RuleParagraph[];
}
export interface SceneModel {
  readonly boardType: string;
  readonly layers: readonly JsonObject[];
  readonly accessibleDescription: string;
}
export interface RNG {
  /** Integer from 0 inclusive to maxExclusive exclusive; deterministic. */
  nextInt(maxExclusive: number): number;
  snapshot(): JsonObject;
}
export interface RuntimeContext {
  readonly rng: RNG;
  readonly rulesetVersion: string;
  readonly fusionId: string | null;
}
export interface BotObservation {
  readonly gameId: string;
  readonly playerId: PlayerId;
  /** Private cards and hidden data are redacted by the game module. */
  readonly visibleState: JsonObject;
  readonly availableActions: readonly GameAction[];
}
export interface IGameModule<S extends GameState, A extends GameAction> {
  readonly descriptor: GameDescriptor;
  setup(config: SetupConfig, context: RuntimeContext): S;
  legalActions(state: S, actor: PlayerId): readonly A[];
  /** Validate untrusted actions received from UI, worker, replay or recipe. */
  parseAction(input: unknown): A | null;
  validate(state: S, action: A): ValidationResult;
  /** A pure deterministic function. Does not mutate input or touch the DOM/clock/filesystem. */
  reduce(state: S, action: A, context: RuntimeContext): Transition<S>;
  outcome(state: S): Outcome | null;
  botObservation(state: S, actor: PlayerId): BotObservation;
  scene(state: S, viewer: PlayerId | null): SceneModel;
  tutorial(locale: Locale): Tutorial;
  serialize(state: S): JsonObject;
  deserialize(serialized: JsonObject, fromVersion: string): S;
}
/** Runtime registry uses the validated serialized bridge, never unsafe generic function variance. */
export interface RegisteredGame {
  readonly descriptor: GameDescriptor;
  readonly load: () => Promise<import('./bridge.js').GameModuleBridge>;
}
