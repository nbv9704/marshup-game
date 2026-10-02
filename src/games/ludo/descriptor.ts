import type { GameDescriptor } from '../../contracts/types';

export const descriptor: GameDescriptor = {
  id: 'ludo',
  title: { vi: 'Cờ cá ngựa', en: 'Ludo' },
  category: 'board',
  kind: 'competitive',
  minPlayers: 2,
  maxPlayers: 4,
  mechanicTags: ['roll', 'race', 'capture'],
  rulesetId: 'ludo-four-token',
  rulesetVersion: '1.0.0',
  tutorialId: 'ludo-guide',
  isReady: true
};
