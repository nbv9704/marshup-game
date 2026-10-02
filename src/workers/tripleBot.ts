import { chooseBotCell, type Cell, type Mark } from '../games/triple-spark/rules';
type Request = { id: string; cells: Cell[]; difficulty: 'easy'|'normal'|'hard'; as: Mark; salt: number };
self.onmessage = (event: MessageEvent<Request>) => {
  const {id,cells,difficulty,as,salt} = event.data;
  try { self.postMessage({ id, cell:chooseBotCell(cells,difficulty,salt,as) }); }
  catch (error) { self.postMessage({id,error:String(error)}); }
};
