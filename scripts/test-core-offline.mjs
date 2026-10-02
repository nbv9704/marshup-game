// Uses the project-local TypeScript compiler when dependencies are installed,
// with the global compiler retained as a fallback for restricted environments.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=createRequire(import.meta.url);
let localTsc=null;
try { localTsc=load.resolve('typescript/bin/tsc'); }
catch { /* The source-only offline environment may provide a global tsc. */ }
if(localTsc) execFileSync(process.execPath,[localTsc,'-p','tsconfig.offline.json'],{cwd:root,stdio:'inherit'});
else execFileSync('tsc',['-p','tsconfig.offline.json'],{cwd:root,stdio:'inherit'});
const {newTripleState,placeMark,legalCells,chooseBotCell,restoreTripleState}=load(path.join(root,'.core-test-build/games/triple-spark/rules.js'));
const {tripleSpark}=load(path.join(root,'.core-test-build/games/triple-spark/module.js'));
const {toGameModuleBridge}=load(path.join(root,'.core-test-build/contracts/bridge.js'));
const {SeededRng}=load(path.join(root,'.core-test-build/core/seededRng.js'));
const {GAME_CATALOG}=load(path.join(root,'.core-test-build/catalog/gameCatalog.js'));
const ctx={rng:new SeededRng('offline-test'),rulesetVersion:'1.0.0',fusionId:null};
assert.equal(GAME_CATALOG.length,38);
assert.equal(new Set(GAME_CATALOG.map(g=>g.id)).size,38);
assert.equal(legalCells(newTripleState()).length,9);
let s=newTripleState();
for(const [cell,actor] of [[0,'p1'],[3,'p2'],[1,'p1'],[4,'p2'],[2,'p1']])s=placeMark(s,cell,actor);
assert.equal(s.winner,'p1');assert.equal(s.phase,'completed');
assert.throws(()=>placeMark(s,7,'p2'));
assert.deepEqual(restoreTripleState(s).cells,s.cells);
const b=toGameModuleBridge(tripleSpark);
const initial=b.setup({matchId:'a',mode:'bot',seed:'a',locale:'vi',players:[],options:{}},ctx);
assert.equal(b.legalActions(initial,'p1').length,9);
assert.equal(b.legalActions(initial,'p2').length,0);
assert.equal(b.validate(initial,{type:'place',actor:'p2',payload:{cell:4}}).valid,false);
assert.throws(()=>b.dispatch(initial,{type:'place',actor:'p2',payload:{cell:0}},ctx));
assert.equal(b.dispatch(initial,{type:'place',actor:'p1',payload:{cell:4}},ctx).state.cells[4],'p1');
let finished=0;let draws=0;
for(let i=0;i<240;i++){
  let m=newTripleState();let steps=0;
  while(m.phase==='playing'){
    const mark=m.activePlayer;
    const cell=chooseBotCell(m.cells,i%3===0?'easy':i%3===1?'normal':'hard',i+steps,mark);
    m=placeMark(m,cell,mark);steps++;assert.ok(steps<=9,'No match may deadlock');
  }
  assert.ok(m.winner==='p1'||m.winner==='p2'||m.winner==='draw');
  draws+=m.winner==='draw'?1:0;finished++;
}
for(let i=0;i<8;i++){
  let match=newTripleState();
  // A hard bot may not lose against an easy deterministic opponent in a 3x3 game.
  while(match.phase==='playing'){
    const actor=match.activePlayer,cell=chooseBotCell(match.cells,actor==='p1'?'hard':'easy',i+match.turnNumber,actor);
    match=placeMark(match,cell,actor);
  }
  assert.notEqual(match.winner,'p2');
}
console.log(`PASS | Catalog ${GAME_CATALOG.length} unique | plugin validation | recovery | 240 bot matches (${draws} draws) | hard-bot fixtures`);
