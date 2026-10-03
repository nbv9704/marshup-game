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
  lanListAdapters: () => ipcRenderer.invoke('lan:adapters'),
  lanStartHost: (input: unknown) => ipcRenderer.invoke('lan:host-start', input),
  lanHostView: () => ipcRenderer.invoke('lan:host-view'),
  lanHostMove: (input: unknown) => ipcRenderer.invoke('lan:host-move', input),
  lanHostBotTurn: (difficulty: string) => ipcRenderer.invoke('lan:host-bot-turn', difficulty),
  lanStopHost: () => ipcRenderer.invoke('lan:host-stop'),
  lanStartBrowsing: () => ipcRenderer.invoke('lan:browse-start'),
  lanDiscoveredRooms: () => ipcRenderer.invoke('lan:browse-list'),
  lanStopBrowsing: () => ipcRenderer.invoke('lan:browse-stop'),
  lanJoinDirect: (input: unknown) => ipcRenderer.invoke('lan:guest-join', input),
  lanRejoin: () => ipcRenderer.invoke('lan:guest-rejoin'),
  lanGuestView: () => ipcRenderer.invoke('lan:guest-view'),
  lanGuestMove: (input: unknown) => ipcRenderer.invoke('lan:guest-move', input),
  lanRequestGuestSnapshot: () => ipcRenderer.invoke('lan:guest-snapshot'),
  lanLeaveGuest: () => ipcRenderer.invoke('lan:guest-leave'),
  onLanHostView: (listener: (view:unknown)=>void) => {
    if (typeof listener !== 'function') return () => undefined;
    const handler=(_event:Electron.IpcRendererEvent,value:unknown)=>listener(value);
    ipcRenderer.on('lan:host-view',handler);
    return ()=>ipcRenderer.removeListener('lan:host-view',handler);
  },
  onLanGuestView: (listener: (view:unknown)=>void) => {
    if (typeof listener !== 'function') return () => undefined;
    const handler=(_event:Electron.IpcRendererEvent,value:unknown)=>listener(value);
    ipcRenderer.on('lan:guest-view',handler);
    return ()=>ipcRenderer.removeListener('lan:guest-view',handler);
  },
  onLanGuestClosed: (listener: (message:string)=>void) => {
    if (typeof listener !== 'function') return () => undefined;
    const handler=(_event:Electron.IpcRendererEvent,value:unknown)=>{if(typeof value==='string')listener(value);};
    ipcRenderer.on('lan:guest-closed',handler);
    return ()=>ipcRenderer.removeListener('lan:guest-closed',handler);
  },
  exportRecipe: (recipe: string) => ipcRenderer.invoke('recipe:export', recipe),
  importRecipe: () => ipcRenderer.invoke('recipe:import'),
  rendererReady: () => ipcRenderer.invoke('app:renderer-ready')
}));
