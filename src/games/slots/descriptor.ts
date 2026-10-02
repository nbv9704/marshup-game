import type { GameDescriptor } from '../../contracts/types';

export const descriptor: GameDescriptor = {
  id:'slots', title:{vi:'Neon Reels',en:'Neon Reels'}, category:'casino', kind:'solo',
  minPlayers:1,maxPlayers:1,mechanicTags:['spin','random','multiply'],
  rulesetId:'slots-classic-3x3',rulesetVersion:'1.0.0',tutorialId:'slots-guide',isReady:true
};
