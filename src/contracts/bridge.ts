import type {
  BotObservation, GameAction, GameDescriptor, GameEvent, GameState, IGameModule,
  JsonObject, Locale, Outcome, PlayerId, RuntimeContext, SceneModel,
  SetupConfig, Tutorial, ValidationResult
} from './types.js';
/** Registry only exposes JSON-serializable, revision-safe calls across module boundaries. */
export interface SerializedTransition {
  readonly state: JsonObject;
  readonly events: readonly GameEvent[];
  readonly outcome: Outcome | null;
}
export interface GameModuleBridge {
  readonly descriptor: GameDescriptor;
  setup(config: SetupConfig, context: RuntimeContext): JsonObject;
  legalActions(snapshot: JsonObject, actor: PlayerId): readonly GameAction[];
  validate(snapshot: JsonObject, untrustedInput: unknown): ValidationResult;
  dispatch(snapshot: JsonObject, untrustedInput: unknown, context: RuntimeContext): SerializedTransition;
  outcome(snapshot: JsonObject): Outcome | null;
  observe(snapshot: JsonObject, actor: PlayerId): BotObservation;
  scene(snapshot: JsonObject, viewer: PlayerId | null): SceneModel;
  tutorial(locale: Locale): Tutorial;
}
/** Only this audited adapter erases a concrete plugin's internal action/state types. */
export function toGameModuleBridge<S extends GameState, A extends GameAction>(module: IGameModule<S, A>): GameModuleBridge {
  const restore = (state: JsonObject): S => module.deserialize(state, module.descriptor.rulesetVersion);
  return {
    descriptor: module.descriptor,
    setup(config, context) { return module.serialize(module.setup(config, context)); },
    legalActions(snapshot, actor) { return module.legalActions(restore(snapshot), actor); },
    validate(snapshot, untrustedInput) {
      const action = module.parseAction(untrustedInput);
      return action === null ? { valid: false, errorCode: 'action.invalid-shape' } : module.validate(restore(snapshot), action);
    },
    dispatch(snapshot, untrustedInput, context) {
      const state = restore(snapshot);
      const action = module.parseAction(untrustedInput);
      if (action === null || !module.validate(state, action).valid) throw new Error('Illegal or untrusted game action');
      // External dispatcher separately validates current actor/revision and possible legalActions.
      const result = module.reduce(state, action, context);
      return { state: module.serialize(result.state), events: result.events, outcome: result.outcome };
    },
    outcome(snapshot) { return module.outcome(restore(snapshot)); },
    observe(snapshot, actor) { return module.botObservation(restore(snapshot), actor); },
    scene(snapshot, viewer) { return module.scene(restore(snapshot), viewer); },
    tutorial(locale) { return module.tutorial(locale); }
  };
}
