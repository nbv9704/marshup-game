import type { GameDescriptor } from '../../contracts/types';

export const descriptor: GameDescriptor = {
  id: 'xiangqi',
  title: { vi: 'Cờ tướng', en: 'Xiangqi' },
  category: 'board',
  kind: 'competitive',
  minPlayers: 2,
  maxPlayers: 2,
  mechanicTags: ['capture'],
  rulesetId: 'xiangqi-standard',
  rulesetVersion: '1.0.0',
  tutorialId: 'xiangqi-guide',
  isReady: true
};
