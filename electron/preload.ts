import { contextBridge, ipcRenderer } from 'electron';
// Explicit method allowlist: NEVER expose raw ipcRenderer or Node APIs.
contextBridge.exposeInMainWorld('arena', Object.freeze({
  loadSave: () => ipcRenderer.invoke('save:load'),
  commitSave: (doc: unknown) => ipcRenderer.invoke('save:commit', doc),
  logError: (error: {message: string; stack?: string}) => ipcRenderer.invoke('error:log', error),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  onFullscreenChanged: (listener: (fullscreen:boolean)=>void) => {
    if (typeof listener !== 'function') return () => undefined;
    const handler=(_event:Electron.IpcRendererEvent,value:unknown)=>{
      if(typeof value==='boolean')listener(value);
    };
    ipcRenderer.on('window:fullscreen-changed',handler);
    return ()=>ipcRenderer.removeListener('window:fullscreen-changed',handler);
  },
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  exportRecipe: (recipe: string) => ipcRenderer.invoke('recipe:export', recipe),
  importRecipe: () => ipcRenderer.invoke('recipe:import'),
  rendererReady: () => ipcRenderer.invoke('app:renderer-ready')
}));
