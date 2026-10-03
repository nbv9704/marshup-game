import type { BotDifficulty, JsonObject, Locale } from './types.js';
import type { ChessLanIntent, ChessLanResult, ChessLanView } from '../lan/chess-session.js';
import type { DiscoveredLanRoom } from '../lan/discovery.js';
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
  readonly accessibility: { readonly highContrast: boolean; readonly fontScale: 1 | 1.15 | 1.3; readonly reducedMotion: boolean; readonly colorblindSymbols?: boolean };
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
  /** Development-only until the complete 3D Chess LAN vertical slice is ready. */
  lanListAdapters(): Promise<readonly { name:string; address:string; netmask:string; broadcast:string }[]>;
  lanStartHost(input:{adapterAddress:string;port:number;roomName:string}): Promise<{address:string;port:number;roomEpoch:string;discoveryAvailable:boolean}>;
  lanHostView(): Promise<ChessLanView|null>;
  lanHostMove(intent:ChessLanIntent): Promise<ChessLanResult>;
  lanHostBotTurn(difficulty:BotDifficulty): Promise<ChessLanResult>;
  lanStopHost(): Promise<void>;
  lanStartBrowsing(): Promise<void>;
  lanDiscoveredRooms(): Promise<readonly DiscoveredLanRoom[]>;
  lanStopBrowsing(): Promise<void>;
  lanJoinDirect(input:{address:string;port:number}): Promise<ChessLanView>;
  lanRejoin(): Promise<ChessLanView>;
  lanGuestView(): Promise<ChessLanView|null>;
  lanGuestMove(intent:ChessLanIntent): Promise<ChessLanResult>;
  lanRequestGuestSnapshot(): Promise<void>;
  lanLeaveGuest(): Promise<void>;
  onLanHostView(listener:(view:ChessLanView)=>void):()=>void;
  onLanGuestView(listener:(view:ChessLanView)=>void):()=>void;
  onLanGuestClosed(listener:(message:string)=>void):()=>void;
}
