import type { GameDescriptor } from '../../contracts/types';

export const descriptor: GameDescriptor = {
  id: 'uno',
  title: { vi: 'Color Clash', en: 'Color Clash' },
  category: 'card',
  kind: 'competitive',
  minPlayers: 2,
  maxPlayers: 4,
  mechanicTags: ['draw', 'reverse', 'skip', 'discard'],
  rulesetId: 'color-clash',
  rulesetVersion: '1.0.0',
  tutorialId: 'color-clash-guide',
  isReady: true
};
