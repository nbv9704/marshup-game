import type { GameDescriptor } from '../../contracts/types';

export const descriptor: GameDescriptor = {
  id: 'blackjack',
  title: { vi: 'Blackjack 21', en: 'Blackjack 21' },
  category: 'casino',
  kind: 'round-scored',
  minPlayers: 1,
  maxPlayers: 1,
  mechanicTags: ['draw', 'bet', 'random'],
  rulesetId: 'blackjack-standard',
  rulesetVersion: '1.0.0',
  tutorialId: 'blackjack-guide',
  isReady: true
};
