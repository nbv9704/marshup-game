import { expect, test } from 'vitest';
import { GAME_CATALOG } from '../src/catalog/gameCatalog';
import { HANDCRAFTED_SPECS } from '../src/fusion/handcraftedSpecs';
import { SeededRng } from '../src/core/seededRng';
test('Phase 1 blueprint remains intact',()=>{
  expect(GAME_CATALOG).toHaveLength(38);
  expect(HANDCRAFTED_SPECS).toHaveLength(36);
  const one=new SeededRng('same'),two=new SeededRng('same');
  expect(Array.from({length:20},()=>one.nextInt(1000))).toEqual(Array.from({length:20},()=>two.nextInt(1000)));
});
