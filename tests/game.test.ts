import { describe, expect, test } from 'vitest';
import { chooseBotCell, legalCells, newTripleState, placeMark, restoreTripleState } from '../src/games/triple-spark/rules';
import { getReadyGame, readyGames } from '../src/registry/registry';
import { GAME_CATALOG } from '../src/catalog/gameCatalog';
import { SeededRng } from '../src/core/seededRng';
const context={rng:new SeededRng('test'),rulesetVersion:'1.0.0',fusionId:null};
describe('design catalog + Phase 2 registry',()=>{
  test('catalog stays a design catalog and ready registry contains only verified plugin',()=>{
    expect(GAME_CATALOG).toHaveLength(38);expect(new Set(GAME_CATALOG.map(g=>g.id)).size).toBe(38);
    expect(readyGames.map(x=>x.descriptor.id)).toEqual(['triple-spark']);
    expect(GAME_CATALOG.every(g=>g.id!=='triple-spark')).toBe(true);
  });
  test('lazy plugin strictly validates untrusted actions',async()=>{
    const game=await getReadyGame('triple-spark');
    const start=game.setup({matchId:'t',seed:'t',mode:'bot',players:[],locale:'vi',options:{}},context);
    expect(game.legalActions(start,'p1')).toHaveLength(9);
    expect(game.legalActions(start,'p2')).toHaveLength(0);
    expect(game.validate(start,{type:'place',actor:'p2',payload:{cell:1}}).valid).toBe(false);
    expect(()=>game.dispatch(start,{type:'place',actor:'p2',payload:{cell:1}},context)).toThrow();
    expect(game.dispatch(start,{type:'place',actor:'p1',payload:{cell:4}},context).state['revision']).toBe(1);
    expect(game.tutorial('vi').paragraphs.length).toBeGreaterThan(0);
    expect(game.tutorial('en').paragraphs.length).toBeGreaterThan(0);
  });
});
describe('Triple Spark correct terminal rules',()=>{
  test('each winning direction and full-board draw',()=>{
    const orders=[[0,3,1,4,2],[0,1,3,2,6],[0,1,4,2,8],[2,0,4,1,6]];
    for(const order of orders){let state=newTripleState();for(const cell of order)state=placeMark(state,cell,state.activePlayer!);
      expect(state.winner).toBe('p1');expect(state.phase).toBe('completed');expect(legalCells(state)).toHaveLength(0);}
    let state=newTripleState();for(const cell of [0,1,2,4,3,5,7,6,8]) state=placeMark(state,cell,state.activePlayer!);
    expect(state.winner).toBe('draw');
  });
  test('illegal moves do not mutate state',()=>{
    const origin=newTripleState(),after=placeMark(origin,4,'p1');
    expect(()=>placeMark(after,4,'p2')).toThrow();
    expect(()=>placeMark(after,2,'p1')).toThrow();
    expect(origin.cells.every(x=>x===null)).toBe(true);
    expect(()=>restoreTripleState({...origin,cells:Array(9).fill('p2')})).toThrow();
  });
  test('deterministic bot-vs-bot always terminates within nine turns',()=>{
    for(let seed=0;seed<150;seed++){
      let state=newTripleState();let turns=0;
      while(state.phase==='playing'){
        const difficulty=seed%3===0?'easy':seed%3===1?'normal':'hard';
        const cell=chooseBotCell(state.cells,difficulty,seed+turns,state.activePlayer!);
        state=placeMark(state,cell,state.activePlayer!);turns++;
        expect(turns).toBeLessThanOrEqual(9);
      }
      expect(state.winner).not.toBeNull();
      expect(restoreTripleState(state).cells).toEqual(state.cells);
    }
  });
});
