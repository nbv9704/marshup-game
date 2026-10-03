import { app, BrowserWindow, dialog, ipcMain, screen, session } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as fs from 'node:fs/promises';
import { commitSave, flushWrites, loadSave, loadWindow, logError, saveWindow } from './store';
import { LanController } from './lan-controller';

const APP_ID = 'games.mashuparena.desktop';
const isVisualSmoke = process.argv.includes('--chess-visual-smoke');
const isSmoke = process.argv.includes('--smoke-test') || isVisualSmoke;
const devServer = !app.isPackaged && process.env['VITE_DEV_SERVER_URL'] === 'http://127.0.0.1:5173'
  ? 'http://127.0.0.1:5173' : undefined;
if (isVisualSmoke && process.env['MASHUP_SMOKE_DATA_DIR'])
  app.setPath('userData', process.env['MASHUP_SMOKE_DATA_DIR']);
const single = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;
let splash: BrowserWindow | null = null;
let ready = false;
let quitting = false;
let boundsTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryAttempts = 0;
const lan = new LanController((channel, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
});
if (!single) app.quit();
if (isSmoke && !isVisualSmoke) app.disableHardwareAcceleration();
app.setAppUserModelId(APP_ID);
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }
});

function entryUrl(): string {
  return devServer ?? pathToFileURL(path.join(app.getAppPath(),'dist','index.html')).href;
}
function trusted(event: Electron.IpcMainInvokeEvent): boolean {
  const url=event.sender.getURL();
  return !!mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents &&
    (devServer ? new URL(url).origin===new URL(devServer).origin : url===entryUrl());
}
function safeBounds(previous: Record<string,unknown>): Electron.Rectangle {
  const primary = screen.getPrimaryDisplay().workArea;
  const width = Math.max(1024,Math.min(2200,Number(previous['width']) || 1280));
  const height = Math.max(600,Math.min(1500,Number(previous['height']) || 800));
  const x = Number(previous['x']), y = Number(previous['y']);
  const match = screen.getAllDisplays().find(d => Number.isFinite(x) && Number.isFinite(y) &&
    x + 90 >= d.workArea.x && x + 90 <= d.workArea.x + d.workArea.width &&
    y + 70 >= d.workArea.y && y + 70 <= d.workArea.y + d.workArea.height);
  return { width, height, x: match ? x : Math.round(primary.x+(primary.width-width)/2),
    y: match ? y : Math.round(primary.y+(primary.height-height)/2) };
}
function queueBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || isSmoke) return;
  const normal = mainWindow.getNormalBounds();
  saveWindow({...normal, maximized:mainWindow.isMaximized()});
}
function installCsp() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const dev = Boolean(devServer);
    const connect = dev ? "'self' http://127.0.0.1:5173 ws://127.0.0.1:5173" : "'none'";
    const scripts = dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
    const policy = ["default-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-src 'none'",
      scripts, "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
      "img-src 'self' data:", `connect-src ${connect}`, "worker-src 'self' blob:"].join('; ');
    callback({responseHeaders:{...details.responseHeaders, 'Content-Security-Policy':[policy]}});
  });
}
async function runChessVisualSmoke(page: Electron.WebContents): Promise<void> {
  try {
    const marker = process.env['MASHUP_SMOKE_MARKER'];
    if (!marker) throw new Error('Visual smoke marker missing');
    const waitFor = async (selector: string) => {
      for (let attempt = 0; attempt < 150; attempt++) {
        if (await page.executeJavaScript(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const body = await page.executeJavaScript('document.body.innerText.slice(0,1000)');
      throw new Error(`Visual smoke selector missing: ${selector}; page=${body}`);
    };
    const click = async (selector: string) => {
      await waitFor(selector);
      await page.executeJavaScript(`document.querySelector(${JSON.stringify(selector)}).click()`);
    };
    await click('.hero .button.outline.large');
    await click('.game-grid .game-tile button[aria-label^="Chess:"]');
    await click('.game-detail .button.primary');
    await click('.chess3d-setup .panel:first-child .button.primary');
    await waitFor('.chess3d-canvas canvas');
    await click('.chess3d-hud .button.primary');
    await page.executeJavaScript("document.querySelector('.chess3d-shell').scrollIntoView({block:'center'})");
    await new Promise(resolve => setTimeout(resolve, 1_000));
    await fs.writeFile(marker, (await page.capturePage()).toPNG());
  } catch (err) { await logError(err); process.exitCode=1; }
  app.quit();
}
function registerIpc() {
  const guard = (event:Electron.IpcMainInvokeEvent) => { if (!trusted(event)) throw new Error('Untrusted IPC sender'); };
  const guardLan = guard;
  ipcMain.handle('save:load', async e => { guard(e); return loadSave(); });
  ipcMain.handle('save:commit', async (e, doc: unknown) => { guard(e); return commitSave(doc); });
  ipcMain.handle('error:log', async (e, error: unknown) => {
    guard(e);
    if (!error || typeof error !== 'object') return;
    const v = error as { message?: unknown; stack?: unknown };
    return logError(`${typeof v.message === 'string' ? v.message.slice(0,1000) : 'Renderer error'} ${typeof v.stack === 'string' ? v.stack.slice(0,2500) : ''}`);
  });
  ipcMain.handle('window:fullscreen', e => {
    guard(e); if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    mainWindow.webContents.send('window:fullscreen-changed',mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });
  ipcMain.handle('app:version',e => {guard(e);return app.getVersion();});
  ipcMain.handle('lan:adapters', e => { guardLan(e); return lan.listAdapters(); });
  ipcMain.handle('lan:host-start', (e, input:unknown) => { guardLan(e); return lan.startHost(input); });
  ipcMain.handle('lan:host-view', e => { guardLan(e); return lan.hostView(); });
  ipcMain.handle('lan:host-move', (e, input:unknown) => { guardLan(e); return lan.hostMove(input); });
  ipcMain.handle('lan:host-bot-turn', (e, difficulty:unknown) => { guardLan(e); return lan.hostBotTurn(difficulty); });
  ipcMain.handle('lan:host-stop', e => { guardLan(e); return lan.stopHost(); });
  ipcMain.handle('lan:browse-start', e => { guardLan(e); return lan.startBrowsing(); });
  ipcMain.handle('lan:browse-list', e => { guardLan(e); return lan.discoveredRooms(); });
  ipcMain.handle('lan:browse-stop', e => { guardLan(e); return lan.stopBrowsing(); });
  ipcMain.handle('lan:guest-join', (e, input:unknown) => { guardLan(e); return lan.joinDirect(input); });
  ipcMain.handle('lan:guest-rejoin', e => { guardLan(e); return lan.rejoin(); });
  ipcMain.handle('lan:guest-view', e => { guardLan(e); return lan.guestView(); });
  ipcMain.handle('lan:guest-move', (e, input:unknown) => { guardLan(e); return lan.guestMove(input); });
  ipcMain.handle('lan:guest-snapshot', e => { guardLan(e); return lan.requestGuestSnapshot(); });
  ipcMain.handle('lan:guest-leave', e => { guardLan(e); return lan.leaveGuest(); });
  ipcMain.handle('recipe:export', async (e, code:unknown) => {
    guard(e);
    if (typeof code !== 'string' || code.length > 16_000) throw new TypeError('Invalid recipe code');
    const choice = await dialog.showSaveDialog(mainWindow!, { title:'Export recipe', defaultPath:'mashup-recipe.txt', filters:[{name:'Recipe',extensions:['txt']}] });
    if (choice.canceled || !choice.filePath) return null;
    await fs.writeFile(choice.filePath,code,'utf8'); return choice.filePath;
  });
  ipcMain.handle('recipe:import', async e => {
    guard(e);
    const choice = await dialog.showOpenDialog(mainWindow!,{title:'Import recipe',properties:['openFile'],filters:[{name:'Recipe',extensions:['txt']}]});
    if (choice.canceled || !choice.filePaths[0]) return null;
    const stat = await fs.stat(choice.filePaths[0]);
    if (stat.size > 16_000) throw new RangeError('Recipe too large');
    return fs.readFile(choice.filePaths[0],'utf8');
  });
  ipcMain.handle('app:renderer-ready', async e => {
    guard(e);
    if (ready) return;
    ready = true;
    if (splash && !splash.isDestroyed()) { splash.close(); splash=null; }
    if (!isSmoke) { mainWindow?.show(); mainWindow?.focus(); }
    else if (!isVisualSmoke) {
      try {
        const marker = process.env['MASHUP_SMOKE_MARKER'];
        if (!marker) throw new Error('MASHUP_SMOKE_MARKER is not set');
        await fs.writeFile(marker,JSON.stringify({renderer:true,at:new Date().toISOString()}));
      } catch (err) { await logError(err); process.exitCode=1; }
      app.quit();
    }
  });
}
async function createWindows() {
  const bounds = safeBounds(await loadWindow());
  if (!isSmoke) {
    splash = new BrowserWindow({ width:450,height:300,frame:false,transparent:false,center:true,alwaysOnTop:true,
      show:false, resizable:false, icon:path.join(app.getAppPath(),'build','icon.png'),
      webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true} });
    await splash.loadFile(path.join(app.getAppPath(),'electron','splash.html'));
    splash.show();
  }
  mainWindow = new BrowserWindow({ ...bounds, title:'Mashup Arena · Offline / LAN',show:false,
    minWidth:1024,minHeight:600, backgroundColor:'#a52342',autoHideMenuBar:true,
    icon:path.join(app.getAppPath(),'build','icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,
      webSecurity:true,devTools: Boolean(devServer)} });
  if (!isSmoke && !devServer && (await loadWindow())['maximized']) mainWindow.maximize();
  if (!isSmoke) {
    const settings=(await loadSave())['settings'];
    if(settings && typeof settings==='object' && (settings as {fullscreen?:unknown}).fullscreen===true) mainWindow.setFullScreen(true);
  }
  mainWindow.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(event,url) => {
    if (url!==entryUrl()) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
  mainWindow.webContents.on('did-fail-load', async (_event,code,description,validatedUrl,isMainFrame)=>{
    if (!isMainFrame)return;
    await logError(`Renderer main-frame load failed: ${code} ${description} ${validatedUrl}`);
    if(isSmoke){process.exitCode=1;app.quit();}
    else dialog.showErrorBox('Mashup Arena', 'The local interface failed to load. Check errors.log and restart.');
  });
  mainWindow.webContents.on('before-input-event', (event,input) => {
    if (input.type==='keyDown' && input.key==='F11') {
      if(mainWindow){mainWindow.setFullScreen(!mainWindow.isFullScreen());
        mainWindow.webContents.send('window:fullscreen-changed',mainWindow.isFullScreen());}
      event.preventDefault();
    }
    if (input.type==='keyDown' && (input.control || input.meta) && input.key.toLowerCase()==='r' && !devServer) event.preventDefault();
  });
  mainWindow.webContents.on('render-process-gone', async (_event, details) => {
    await logError(`Renderer crashed: ${details.reason}, code ${details.exitCode}`);
    if (isSmoke) {process.exitCode=1;app.quit();return;}
    if (recoveryAttempts++ < 1 && mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
    else dialog.showErrorBox('Mashup Arena', 'A renderer error occurred. Your last saved progress is available on restart.');
  });
  mainWindow.on('resize',()=>{if(boundsTimer)clearTimeout(boundsTimer);boundsTimer=setTimeout(queueBounds,350);});
  mainWindow.on('move',()=>{if(boundsTimer)clearTimeout(boundsTimer);boundsTimer=setTimeout(queueBounds,350);});
  mainWindow.on('close',()=>{if(boundsTimer)clearTimeout(boundsTimer);queueBounds();});
  if (devServer) await mainWindow.loadURL(devServer);
  else await mainWindow.loadFile(path.join(app.getAppPath(),'dist','index.html'));
  if (isVisualSmoke && !mainWindow.isDestroyed()) {
    mainWindow.showInactive();
    void runChessVisualSmoke(mainWindow.webContents);
  }
}
app.whenReady().then(async () => {
  if (!single) return;
  installCsp(); registerIpc();
  await createWindows();
}).catch(async error=> { await logError(error);process.exitCode=1;app.quit(); });
app.on('window-all-closed',()=> { if (process.platform!=='darwin' || isSmoke) app.quit(); });
app.on('activate',()=> { if (BrowserWindow.getAllWindows().length===0) void createWindows().catch(logError); });
app.on('before-quit',event => {
  if (quitting) return;
  quitting = true; event.preventDefault();
  if (boundsTimer) clearTimeout(boundsTimer);
  queueBounds();
  void Promise.allSettled([flushWrites(), lan.shutdown()]).finally(()=>app.quit());
});
process.on('uncaughtException',error=>{void logError(error);process.exitCode=1;app.quit();});
process.on('unhandledRejection',error=>{void logError(error);});
