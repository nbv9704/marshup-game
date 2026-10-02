import type { BotDifficulty, JsonObject, Locale } from './types.js';
export interface Profile {
  readonly id: string;
  readonly avatarId: string;
  readonly displayName: string;
  readonly level: number;
  readonly xp: number;
  readonly virtualChips: number;
  readonly favorites: readonly string[];
  readonly purchasedCosmetics: readonly string[];
  readonly achievements: readonly string[];
}
export interface Settings {
  readonly locale: Locale;
  readonly audio: { readonly music: number; readonly sfx: number; readonly muted: boolean };
  readonly accessibility: { readonly highContrast: boolean; readonly fontScale: 1 | 1.15 | 1.3; readonly reducedMotion: boolean };
  readonly botDifficulty: BotDifficulty;
  readonly fullscreen: boolean;
}
export interface WindowBounds {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
  readonly maximized: boolean;
}
export interface SavedMatch {
  readonly id: string;
  readonly gameId: string;
  readonly fusionRecipeId: string | null;
  readonly gameRulesetVersion: string;
  readonly fusionRecipeVersion: string | null;
  readonly rngSnapshot: JsonObject;
  readonly snapshot: JsonObject;
  readonly commandSequence: number;
  readonly updatedAt: string;
}
export interface SaveDocument {
  readonly schemaVersion: 1;
  readonly profile: Profile;
  readonly settings: Settings;
  readonly window: WindowBounds;
  readonly savedMatches: readonly SavedMatch[];
  readonly fusionDex: JsonObject;
  readonly history: readonly JsonObject[];
  readonly dailyChallenge: JsonObject;
}
export interface DesktopBridge {
  loadSave(): Promise<SaveDocument>;
  commitSave(next: SaveDocument): Promise<{ revision: number }>;
  logError(error: { message: string; stack?: string }): Promise<void>;
  toggleFullscreen(): Promise<boolean>;
  onFullscreenChanged?(callback: (fullscreen: boolean) => void): () => void;
  exportRecipe(code: string): Promise<string | null>;
  importRecipe(): Promise<string | null>;
  getAppVersion(): Promise<string>;
}
