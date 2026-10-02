import type { RegisteredGame } from '../contracts/types';
import { toGameModuleBridge } from '../contracts/bridge';
import { descriptor as tripleDescriptor } from '../games/triple-spark/descriptor';
import { descriptor as chessDescriptor } from '../games/chess/descriptor';
import { descriptor as colorClashDescriptor } from '../games/color-clash/descriptor';
import { descriptor as blackjackDescriptor } from '../games/blackjack/descriptor';
import { descriptor as slotsDescriptor } from '../games/slots/descriptor';
import { descriptor as ludoDescriptor } from '../games/ludo/descriptor';
import { descriptor as xiangqiDescriptor } from '../games/xiangqi/descriptor';
/** Design catalog entries do not imply a ready module. Only this registry drives Play. */
export const readyGames: readonly RegisteredGame[] = [
  { descriptor:tripleDescriptor, load: async () => {
    const mod = await import('../games/triple-spark/module');
    return toGameModuleBridge(mod.tripleSpark);
  } },
  { descriptor:chessDescriptor, load:async()=>{const mod=await import('../games/chess/module');return toGameModuleBridge(mod.chess);}},
  { descriptor:colorClashDescriptor, load:async()=>{const mod=await import('../games/color-clash/module');return toGameModuleBridge(mod.colorClash);}},
  { descriptor:blackjackDescriptor, load:async()=>{const mod=await import('../games/blackjack/module');return toGameModuleBridge(mod.blackjack);}},
  { descriptor:slotsDescriptor, load:async()=>{const mod=await import('../games/slots/module');return toGameModuleBridge(mod.slots);}},
  { descriptor:ludoDescriptor, load:async()=>{const mod=await import('../games/ludo/module');return toGameModuleBridge(mod.ludo);}},
  { descriptor:xiangqiDescriptor, load:async()=>{const mod=await import('../games/xiangqi/module');return toGameModuleBridge(mod.xiangqi);}}
];
export async function getReadyGame(gameId: string) {
  const entry = readyGames.find(g => g.descriptor.id === gameId);
  if (!entry) throw new Error(`Game not in verified playable registry: ${gameId}`);
  return entry.load();
}
