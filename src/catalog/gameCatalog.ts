import type { GameCategory, GameKind, MechanicTag } from '../contracts/types.js';
export interface CatalogDesignEntry {
  readonly id: string;
  readonly name: string;
  readonly category: GameCategory;
  readonly kind: GameKind;
  readonly tags: readonly MechanicTag[];
  readonly phase: 3 | 5;
}
/** This is a planned catalog, NOT a claim these games are implemented in Phase 1. */
export const GAME_CATALOG: readonly CatalogDesignEntry[] = [
  { id:'chess',name:'Chess',category:'board',kind:'competitive',tags:['capture','resurrect','shield','swap'],phase:3 },
  { id:'xiangqi',name:'Xiangqi',category:'board',kind:'competitive',tags:['capture','shield','swap'],phase:3 },
  { id:'go',name:'Go',category:'board',kind:'competitive',tags:['capture','place','collect'],phase:5 },
  { id:'gomoku',name:'Gomoku',category:'board',kind:'competitive',tags:['place','skip'],phase:5 },
  { id:'ludo',name:'Ludo',category:'board',kind:'competitive',tags:['roll','race','capture'],phase:3 },
  { id:'property',name:'Property Empire',category:'board',kind:'competitive',tags:['roll','bet','collect'],phase:5 },
  { id:'checkers',name:'Checkers',category:'board',kind:'competitive',tags:['capture','swap'],phase:5 },
  { id:'othello',name:'Othello',category:'board',kind:'competitive',tags:['place','capture'],phase:5 },
  { id:'backgammon',name:'Backgammon',category:'board',kind:'competitive',tags:['roll','race','capture'],phase:5 },
  { id:'snakes',name:'Snakes & Ladders',category:'board',kind:'round-scored',tags:['roll','race'],phase:5 },
  { id:'connect4',name:'Connect Four',category:'board',kind:'competitive',tags:['place'],phase:5 },
  { id:'tictactoe',name:'Extended Tic-Tac-Toe',category:'board',kind:'competitive',tags:['place'],phase:5 },
  { id:'mancala',name:'Mancala',category:'board',kind:'competitive',tags:['collect','place'],phase:5 },
  { id:'dominoes',name:'Dominoes',category:'board',kind:'round-scored',tags:['place','draw','collect'],phase:5 },
  { id:'uno',name:'Color Clash (UNO ruleset)',category:'card',kind:'competitive',tags:['draw','reverse','skip','swap'],phase:3 },
  { id:'tienlen',name:'Tiến Lên Miền Nam',category:'card',kind:'competitive',tags:['discard','challenge'],phase:5 },
  { id:'phom',name:'Phỏm',category:'card',kind:'round-scored',tags:['draw','discard','collect'],phase:5 },
  { id:'maubinh',name:'Mậu Binh',category:'card',kind:'round-scored',tags:['swap','collect'],phase:5 },
  { id:'holdem',name:'Texas Hold’em',category:'card',kind:'round-scored',tags:['draw','bet','challenge'],phase:5 },
  { id:'bridge',name:'Contract Bridge',category:'card',kind:'round-scored',tags:['bet','collect'],phase:5 },
  { id:'hearts',name:'Hearts',category:'card',kind:'round-scored',tags:['collect','swap'],phase:5 },
  { id:'solitaire',name:'Klondike Solitaire',category:'card',kind:'solo',tags:['draw','place','peek'],phase:5 },
  { id:'crazyeights',name:'Crazy Eights',category:'card',kind:'competitive',tags:['draw','swap'],phase:5 },
  { id:'cheat',name:'Cheat / Bluff',category:'card',kind:'competitive',tags:['challenge','discard'],phase:5 },
  { id:'memory',name:'Memory Match',category:'card',kind:'round-scored',tags:['peek','collect'],phase:5 },
  { id:'xidach',name:'Xì Dách',category:'card',kind:'round-scored',tags:['draw','bet'],phase:5 },
  { id:'blackjack',name:'Blackjack',category:'casino',kind:'round-scored',tags:['draw','bet','random'],phase:3 },
  { id:'slots',name:'Slots',category:'casino',kind:'solo',tags:['spin','random','multiply'],phase:3 },
  { id:'roulette',name:'Roulette',category:'casino',kind:'round-scored',tags:['spin','bet','random'],phase:5 },
  { id:'baccarat',name:'Baccarat',category:'casino',kind:'round-scored',tags:['draw','bet','random'],phase:5 },
  { id:'craps',name:'Craps',category:'casino',kind:'round-scored',tags:['roll','bet','random'],phase:5 },
  { id:'videopoker',name:'Video Poker',category:'casino',kind:'solo',tags:['draw','bet','swap'],phase:5 },
  { id:'sicbo',name:'Sic Bo',category:'casino',kind:'round-scored',tags:['roll','bet','random'],phase:5 },
  { id:'keno',name:'Keno',category:'casino',kind:'round-scored',tags:['draw','bet','random'],phase:5 },
  { id:'plinko',name:'Plinko',category:'casino',kind:'solo',tags:['roll','random','multiply'],phase:5 },
  { id:'dice',name:'Dice Arena',category:'casino',kind:'round-scored',tags:['roll','random'],phase:5 },
  { id:'wheel',name:'Prize Wheel',category:'casino',kind:'solo',tags:['spin','random','multiply'],phase:5 },
  { id:'scratch',name:'Scratch Cards',category:'casino',kind:'solo',tags:['random','peek','collect'],phase:5 }
] as const;
export const KNOWN_GAME_IDS: ReadonlySet<string> = new Set(GAME_CATALOG.map(g => g.id));
