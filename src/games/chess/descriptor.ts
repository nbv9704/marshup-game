import type { GameDescriptor } from '../../contracts/types';

export const descriptor: GameDescriptor = {
  id: 'chess',
  title: { vi: 'Cờ vua', en: 'Chess' },
  category: 'board',
  kind: 'competitive',
  minPlayers: 2,
  maxPlayers: 2,
  mechanicTags: ['capture', 'resurrect', 'shield', 'swap'],
  rulesetId: 'chess-standard',
  rulesetVersion: '1.0.0',
  tutorialId: 'chess-guide',
  isReady: true
};
