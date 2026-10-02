import defaults from '../../assets/default-save.json';
import type { DesktopBridge, SaveDocument } from '../contracts/persistence';
export type NativeBridge = DesktopBridge & { rendererReady(): Promise<void>; onFullscreenChanged(callback:(fullscreen:boolean)=>void):()=>void };
declare global { interface Window { arena?: NativeBridge } }
const KEY = 'mashup-arena-save-v1';
export function isDocument(doc: unknown): doc is SaveDocument {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Partial<SaveDocument>,p=d.profile,s=d.settings;
  if(d.schemaVersion!==1 || !p || !s || !s.audio || !s.accessibility || !d.window) return false;
  return typeof p.id==='string' && p.id.length<80 && typeof p.avatarId==='string' && p.avatarId.length<40 &&
    typeof p.displayName==='string' && p.displayName.trim().length>0 && p.displayName.length<=32 &&
    [p.xp,p.level,p.virtualChips].every(n=>Number.isSafeInteger(n) && n>=0 && n<1e10) &&
    Array.isArray(p.favorites) && p.favorites.length<=64 && p.favorites.every(x=>typeof x==='string' && x.length<50) &&
    Array.isArray(p.achievements) && Array.isArray(p.purchasedCosmetics) &&
    ['vi','en'].includes(s.locale) && ['easy','normal','hard'].includes(s.botDifficulty) &&
    typeof s.audio.muted==='boolean' && [s.audio.music,s.audio.sfx].every(n=>typeof n==='number' && n>=0 && n<=1) &&
    typeof s.accessibility.highContrast==='boolean' && typeof s.accessibility.reducedMotion==='boolean' &&
    [1,1.15,1.3].includes(s.accessibility.fontScale) && typeof s.fullscreen==='boolean' &&
    Array.isArray(d.savedMatches) && d.savedMatches.length<=4 && Array.isArray(d.history) && d.history.length<=200 &&
    d.fusionDex!==null && typeof d.fusionDex==='object' && d.dailyChallenge!==null && typeof d.dailyChallenge==='object';
}
const initial = (): SaveDocument => structuredClone(defaults) as unknown as SaveDocument;
export async function loadDocument(): Promise<SaveDocument> {
  if (window.arena) {
    const native = await window.arena.loadSave();
    if (!isDocument(native)) throw new Error('Invalid native save');
    return native;
  }
  try { const value = localStorage.getItem(KEY); if (value) {const doc: unknown=JSON.parse(value);if(isDocument(doc))return doc;} }
  catch { /* localStorage can be disabled in private browsing. */ }
  return initial();
}
export async function persistDocument(doc: SaveDocument): Promise<void> {
  if (window.arena) { await window.arena.commitSave(doc); return; }
  localStorage.setItem(KEY,JSON.stringify(doc));
}
export async function logClientError(error: unknown) {
  const payload = error instanceof Error ? {message:error.message,stack:error.stack} : {message:String(error)};
  try { await window.arena?.logError(payload); }
  catch { console.error(payload); }
}
export async function backupSave(doc: SaveDocument): Promise<string | null> {
  const value=JSON.stringify(doc,null,2);
  if (window.arena) return window.arena.exportRecipe(value);
  const blob=new Blob([value],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download='mashup-profile-backup.txt';link.click();URL.revokeObjectURL(url);return 'download';
}
export async function importSave(): Promise<SaveDocument | null> {
  if (!window.arena) throw new Error('Import backup is available in the Windows desktop app.');
  const text=await window.arena.importRecipe();
  if (text===null) return null;
  const document: unknown=JSON.parse(text);
  if (!isDocument(document)) throw new Error('Unrecognized or incompatible backup');
  return document;
}
