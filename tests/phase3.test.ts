import { describe, expect, test } from 'vitest';
import type { JsonObject, PlayerConfig } from '../src/contracts/types';
import { SeededRng } from '../src/core/seededRng';
import { getReadyGame } from '../src/registry/registry';

const phase3Ids = ['chess','uno','blackjack','slots','ludo','xiangqi'] as const;

function players(count:number):PlayerConfig[] {
  return Array.from({length:count},(_,index)=>({
    id:(`p${index+1}`) as PlayerConfig['id'],
    controller:'bot',
    difficulty:'normal',
    displayName:`Bot ${index+1}`
  }));
}

describe('Phase 3 playable plugins',()=>{
  test.each(phase3Ids)('%s loads, round-trips and rejects an invalid action',async gameId=>{
    const game=await getReadyGame(gameId);
    const count=game.descriptor.maxPlayers===1?1:2;
    const context={rng:new SeededRng(`smoke-${gameId}`),rulesetVersion:game.descriptor.rulesetVersion,fusionId:null};
    const state=game.setup({matchId:`smoke-${gameId}`,seed:`smoke-${gameId}`,mode:count===1?'practice':'bot',players:players(count),locale:'vi',options:{}},context);
    const restored=JSON.parse(JSON.stringify(state)) as JsonObject;
    expect(restored).toEqual(state);
    expect(game.scene(restored,null).layers.length).toBeGreaterThan(0);
    expect(game.tutorial('vi').paragraphs.length).toBeGreaterThan(0);
    expect(game.tutorial('en').paragraphs.length).toBeGreaterThan(0);
    expect(game.validate(state,{type:'definitely-invalid',actor:'p1',payload:{}}).valid).toBe(false);
  });

  test.each(phase3Ids)('%s deterministic first-action bots reach a terminal outcome',async gameId=>{
    const game=await getReadyGame(gameId);
    const count=game.descriptor.maxPlayers===1?1:2;
    const seed=`complete-${gameId}`;
    const context={rng:new SeededRng(seed),rulesetVersion:game.descriptor.rulesetVersion,fusionId:null};
    let state:JsonObject=game.setup({matchId:seed,seed,mode:count===1?'practice':'bot',players:players(count),locale:'en',options:{}},context);
    let outcome=game.outcome(state);
    const limit=gameId==='ludo'?2100:gameId==='xiangqi'?350:500;
    for(let step=0;!outcome&&step<limit;step++){
      const actor=state['activePlayer'];
      expect(typeof actor).toBe('string');
      const actions=game.legalActions(state,actor as PlayerConfig['id']);
      expect(actions.length).toBeGreaterThan(0);
      const transition=game.dispatch(state,actions[0]!,context);
      state=transition.state;
      outcome=transition.outcome??game.outcome(state);
    }
    expect(outcome,`${gameId} did not terminate`).not.toBeNull();
    expect(state['phase']).toBe('completed');
  },15_000);
});
