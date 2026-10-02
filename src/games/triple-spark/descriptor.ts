import type { GameDescriptor } from '../../contracts/types';
export const descriptor: GameDescriptor = {
  id: 'triple-spark', title: { vi:'Triple Spark · Luyện tập', en:'Triple Spark · Trainer' },
  category: 'board', kind: 'competitive', minPlayers: 2, maxPlayers: 2, mechanicTags: ['place'],
  rulesetId: 'triple-spark', rulesetVersion: '1.0.0', tutorialId: 'triple-spark-guide', isReady: true
};
