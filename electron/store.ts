import { app } from 'electron';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type JsonRecord = Record<string, unknown>;
let writeQueue: Promise<void> = Promise.resolve();
let revision = 0;
function inUserData(file: string) { return path.join(app.getPath('userData'), file); }
export function defaultDocument(): JsonRecord {
  return JSON.parse(readFileSync(path.join(app.getAppPath(), 'assets', 'default-save.json'), 'utf8')) as JsonRecord;
}
function object(v: unknown): v is JsonRecord { return Boolean(v) && typeof v === 'object' && !Array.isArray(v); }
/** Strict boundary for renderer-controlled document, not for game-specific internal snapshots. */
export function validDocument(d: unknown): d is JsonRecord {
  if (!object(d) || d['schemaVersion'] !== 1 || !object(d['profile']) || !object(d['settings'])) return false;
  const p=d['profile'],s=d['settings'];
  if(!object(s['audio']) || !object(s['accessibility']) || !object(d['window']))return false;
  const a=s['audio'],access=s['accessibility'];
  return typeof p['id']==='string' && p['id'].length<80 && typeof p['displayName']==='string' &&
    p['displayName'].trim().length>0 && p['displayName'].length<=32 && typeof p['avatarId']==='string' && p['avatarId'].length<40 &&
    [p['xp'],p['level'],p['virtualChips']].every(n=>typeof n==='number' && Number.isSafeInteger(n) && n>=0 && n<1e10) &&
    Array.isArray(p['favorites']) && p['favorites'].length<=64 && p['favorites'].every((x:unknown)=>typeof x==='string' && x.length<50) &&
    Array.isArray(p['achievements']) && Array.isArray(p['purchasedCosmetics']) &&
    ['vi','en'].includes(String(s['locale'])) && ['easy','normal','hard'].includes(String(s['botDifficulty'])) &&
    typeof a['muted']==='boolean' && [a['music'],a['sfx']].every(n=>typeof n==='number'&&n>=0&&n<=1) &&
    typeof access['highContrast']==='boolean' && typeof access['reducedMotion']==='boolean' &&
    (access['colorblindSymbols']===undefined || typeof access['colorblindSymbols']==='boolean') &&
    [1,1.15,1.3].includes(Number(access['fontScale'])) && typeof s['fullscreen']==='boolean' &&
    Array.isArray(d['savedMatches']) && d['savedMatches'].length<=4 && Array.isArray(d['history']) && d['history'].length<=200 &&
    object(d['fusionDex']) && object(d['dailyChallenge']);
}
async function atomicWrite(filename: string, json: string): Promise<void> {
  const target = inUserData(filename), temp = `${target}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(target), {recursive:true});
  try { await fs.writeFile(temp, json, 'utf8'); await fs.rename(temp, target); }
  finally { await fs.rm(temp,{force:true}).catch(()=>undefined); }
}
export async function logError(error: unknown): Promise<void> {
  const message = error instanceof Error ? `${error.stack ?? error.message}` : String(error);
  const safe = message.slice(0, 3500).replace(/[\r\n]+/g, ' ');
  await fs.mkdir(app.getPath('userData'),{recursive:true});
  await fs.appendFile(inUserData('errors.log'), `${new Date().toISOString()} ${safe}\n`, 'utf8').catch(()=>undefined);
}
export async function loadSave(): Promise<JsonRecord> {
  for (const name of ['save.json','save.backup.json']) {
    try {
      const source = await fs.readFile(inUserData(name),'utf8');
      const doc: unknown = JSON.parse(source);
      if (validDocument(doc)) return doc;
      await logError(`Invalid ${name}: falling back to backup/default`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') await logError(error);
    }
  }
  return defaultDocument();
}
export function commitSave(doc: unknown): Promise<{revision:number}> {
  if (!validDocument(doc)) return Promise.reject(new TypeError('Invalid save document'));
  const encoded = JSON.stringify(doc);
  if (Buffer.byteLength(encoded,'utf8') > 1_000_000) return Promise.reject(new RangeError('Save size limit exceeded'));
  const task = writeQueue.then(async () => {
    const file = inUserData('save.json');
    try { await fs.copyFile(file,inUserData('save.backup.json')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') await logError(error); }
    await atomicWrite('save.json',encoded);
    revision += 1;
    return {revision};
  });
  writeQueue = task.then(()=>undefined, async error => { await logError(error); });
  return task;
}
export async function loadWindow(): Promise<JsonRecord> {
  try {
    const p: unknown = JSON.parse(await fs.readFile(inUserData('window.json'),'utf8'));
    if (object(p) && typeof p['width'] === 'number' && typeof p['height'] === 'number') return p;
  } catch { /* Fresh first launch. */ }
  return {width:1280,height:800,maximized:false};
}
export function saveWindow(b: JsonRecord): void {
  writeQueue = writeQueue.then(()=>atomicWrite('window.json',JSON.stringify(b))).catch(logError);
}
export async function flushWrites() { await writeQueue; }
