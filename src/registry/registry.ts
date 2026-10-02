import type { RegisteredGame } from '../contracts/types';
import { toGameModuleBridge } from '../contracts/bridge';
import { descriptor } from '../games/triple-spark/descriptor';
/** Design catalog entries do not imply a ready module. Only this registry drives Play. */
export const readyGames: readonly RegisteredGame[] = [
  { descriptor, load: async () => {
    const mod = await import('../games/triple-spark/module');
    return toGameModuleBridge(mod.tripleSpark);
  } }
];
export async function getReadyGame(gameId: string) {
  const entry = readyGames.find(g => g.descriptor.id === gameId);
  if (!entry) throw new Error(`Game not in verified playable registry: ${gameId}`);
  return entry.load();
}
