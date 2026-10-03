import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { GAME_CATALOG, type CatalogDesignEntry } from '../catalog/gameCatalog';
import type { SaveDocument, Settings } from '../contracts/persistence';
import type { Locale } from '../contracts/types';
import { AmbientStage } from '../graphics/AmbientStage';
import { TripleSparkScreen } from './TripleSparkScreen';
import { ArcadeGameScreen } from './ArcadeGameScreen';
import { tFor } from './i18n';
import { backupSave, importSave, loadDocument, logClientError, persistDocument } from '../persistence/client';
import { configureMusic,playTone } from './sound';
import { readyGames } from '../registry/registry';
import { MASCOTS, MascotAvatar, PartyLogo, PartyProgress } from './PartyUi';
import { StyleGuide } from './StyleGuide';
import '../styles/main.css';
import '../styles/party.css';
const LanChessDevScreen = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./LanChessDevScreen')).LanChessDevScreen })) : null;
type Page = 'home'|'library'|'trainer'|'game'|'profile'|'settings'|'styleGuide'|'lanDev';
type Category = 'all'|'board'|'card'|'casino'|'favorites';
const ICONS:Record<string,string>={chess:'♚',xiangqi:'帥',go:'◉',gomoku:'✣',ludo:'♟',property:'◆',
  checkers:'◈',othello:'◑',backgammon:'⚄',snakes:'↝',connect4:'●',tictactoe:'✕',mancala:'◐',dominoes:'▦',
  uno:'▣',tienlen:'♠',phom:'♣',maubinh:'♢',holdem:'♥',bridge:'♧',hearts:'♥',solitaire:'♤',crazyeights:'⑧',cheat:'?',memory:'▤',xidach:'♠',
  blackjack:'21',slots:'777',roulette:'◉',baccarat:'♠',craps:'⚄',videopoker:'♢',sicbo:'⚅',keno:'10',plinko:'⋮',dice:'⚂',wheel:'✦',scratch:'▧'};
const READY_IDS=new Set(readyGames.map(game=>game.descriptor.id));
const READY_DESCRIPTORS=new Map(readyGames.map(game=>[game.descriptor.id,game.descriptor]));
function GameTile({entry,locale,favored,onToggle,onDetails}:{entry:CatalogDesignEntry;locale:Locale;favored:boolean;onToggle:()=>void;onDetails:()=>void}) {
  return <article className={`game-tile type-${entry.category}`}>
    <div className="tile-top"><span className="small-badge">{READY_IDS.has(entry.id)?(locale==='vi'?'CHƠI NGAY':'PLAY NOW'):entry.category.toUpperCase()}</span>
      <button className={`favorite ${favored?'active':''}`} aria-label={favored?'Remove favorite':'Add favorite'}
        onClick={onToggle}>{favored?'♥':'♡'}</button></div>
    <button className="tile-interior" onClick={onDetails} aria-label={`${entry.name}: ${locale==='vi'?'Xem thông tin':'View details'}`}>
      <div className="tile-glyph" aria-hidden="true">{ICONS[entry.id]??'✦'}</div>
      <div className="tile-title">{entry.name}</div>
      <div className="tile-tags">{READY_DESCRIPTORS.get(entry.id)?.maxPlayers===1||entry.kind==='solo'?'1P':'2P+'} · {entry.tags.slice(0,2).join(' · ')}</div>
    </button>
  </article>;
}
export default function App(){
  const [doc,setDoc]=useState<SaveDocument|null>(null),ref=useRef<SaveDocument|null>(null);
  const [page,setPage]=useState<Page>('home'),[category,setCategory]=useState<Category>('all'),
    [search,setSearch]=useState(''),[selected,setSelected]=useState<CatalogDesignEntry|null>(null),
    [activeGame,setActiveGame]=useState<string|null>(null),
    [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loadError,setLoadError]=useState('');
  const chain=useRef(Promise.resolve()),input=useRef<HTMLInputElement|null>(null),initialized=useRef(false);
  useEffect(()=>{
    void loadDocument().then(d=>{ref.current=d;setDoc(d);}).catch(e=>{setLoadError(String(e));void logClientError(e);});
    window.addEventListener('error',e=>{void logClientError(e.error??e.message);});
    window.addEventListener('unhandledrejection',e=>{void logClientError(e.reason);});
  },[]);
  const update=useCallback((fn:(d:SaveDocument)=>SaveDocument)=>{
    if(!ref.current)return;
    const next=fn(ref.current);ref.current=next;setDoc(next);setBusy(true);setMessage('');
    chain.current=chain.current.then(()=>persistDocument(next)).then(()=>{setBusy(false);}).catch(error=>{
      setBusy(false);setMessage(`SAVE ERROR: ${String(error)}`);void logClientError(error);
    });
  },[]);
  useEffect(()=>{
    if(!window.arena?.onFullscreenChanged)return;
    return window.arena.onFullscreenChanged(fullscreen=>{
      if(ref.current?.settings.fullscreen !== fullscreen)
        update(d=>({...d,settings:{...d.settings,fullscreen}}));
    });
  },[update]);
  const replace=useCallback((d:SaveDocument)=>update(()=>d),[update]);
  const go=useCallback((target:Page)=>{setSelected(null);setPage(target);if(target==='library')setCategory('all');},[]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement;
      if(e.key==='Escape'){setSelected(null);if(page!=='home')setPage('home');return;}
      if(e.key==='/'&&!typing){e.preventDefault();setPage('library');requestAnimationFrame(()=>input.current?.focus());}
      if(e.key==='F11'&&!window.arena){e.preventDefault();if(!document.fullscreenElement)void document.documentElement.requestFullscreen();else void document.exitFullscreen();}
      if(e.altKey && e.key==='ArrowLeft')go('home');
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[page,go]);
  const hydrated=useCallback(()=>{
    if(initialized.current)return;initialized.current=true;
    void window.arena?.rendererReady().catch(logClientError);
  },[]);
  useEffect(()=>{
    if(!doc)return;
    const category=page==='game'&&activeGame?readyGames.find(game=>game.descriptor.id===activeGame)?.descriptor.category:page==='styleGuide'?'fusion':'card';
    configureMusic(category??'card',doc.settings.audio.music,doc.settings.audio.muted);
  },[doc?.settings.audio.music,doc?.settings.audio.muted,page,activeGame]);
  if(loadError)return <div className="boot-error"><h2>Unable to load saved data</h2><p>{loadError}</p><p>Check errors.log in the application's userData folder.</p></div>;
  if(!doc)return <div className="loading-screen"><MascotAvatar id="comet" size={116} className="loading-mascot"/><h1>MASHUP ARENA</h1><p>INITIALIZING PARTY TABLE</p><div className="loading-party-bar"><span/></div></div>;
  const locale=doc.settings.locale,t=tFor(locale), sound=()=>playTone(doc.settings.audio.muted?0:doc.settings.audio.sfx);
  const avatar=doc.profile.avatarId;
  const toggleFavorite=(id:string)=>{sound();update(d=>({...d,profile:{...d.profile,favorites:d.profile.favorites.includes(id)?d.profile.favorites.filter(x=>x!==id):[...d.profile.favorites,id]}}));};
  const visible=GAME_CATALOG.filter(g=>(category==='all'||(category==='favorites'?doc.profile.favorites.includes(g.id):g.category===category)) &&
    (g.name.toLowerCase().includes(search.trim().toLowerCase())||g.tags.some(tag=>tag.includes(search.trim().toLowerCase()))));
  const nav:readonly [Page,string,string][]=[['home','◈','home'],['library','▦','library'],['trainer','✦','trainer'],['profile','♙','profile'],['settings','⚙','settings']];
  return <div className={`app ${doc.settings.accessibility.highContrast?'high-contrast':''} ${doc.settings.accessibility.reducedMotion?'reduce-motion':''} ${doc.settings.accessibility.colorblindSymbols?'colorblind-symbols':''}`}
    style={{'--font-zoom':String(doc.settings.accessibility.fontScale)} as React.CSSProperties}>
    <aside className="side-nav"><button className="brand-mark" onClick={()=>go('home')} aria-label="Mashup Arena home"><span>✦</span></button>
      <div className="nav-divider"/>
      {nav.map(([id,icon,label])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>{sound();go(id);}}
        aria-label={t(label)} title={t(label)}><span>{icon}</span><small>{t(label)}</small></button>)}
      <div className="side-bottom"><span className="status-light"/><small>{t('offline')}</small></div>
    </aside>
    <div className="shell"><header className="app-topbar">
      <button className="mobile-brand" onClick={()=>go('home')}>✦ MASHUP ARENA</button>
      <div className="breadcrumb"><PartyLogo compact/><span className="breadcrumb-divider">/</span>{page==='lanDev'?'LAN LAB':t(page)}</div>
      <div className="topbar-actions"><div className="connection"><span className="status-light"/> LOCAL SYSTEM</div>
        <span className="chips-pill" title={t('chips')}>◈ {doc.profile.virtualChips.toLocaleString()}</span>
        <button className="profile-pill" onClick={()=>go('profile')} title={t('profile')}><span><MascotAvatar id={avatar} size={34}/></span><b>{doc.profile.displayName}</b>
          <small>LV {doc.profile.level}</small></button></div>
    </header>
    {page==='home' && <main className="page">
      <section className="hero">
        <AmbientStage onReady={hydrated} reducedMotion={doc.settings.accessibility.reducedMotion}/>
        <div className="hero-aura"/><div className="hero-content">
          <div className="eyebrow hero-label"><span className="status-light"/> {t('subtitle')} <span className="hero-slash">//</span> VERSION 0.2</div>
          <PartyLogo/><h1>{t('heroTitle')}</h1><p>{t('heroBody')}</p>
          <div className="button-row"><button className="button primary large" onClick={()=>{sound();go('trainer');}}>✦ {t('play')}</button>
            <button className="button outline large" onClick={()=>{sound();go('library');}}>{t('explore')} ↗</button></div>
          <div className="hero-foot"><span className="live-dot"/>{t('phase')}</div>
        </div><div className="floating-card" aria-hidden="true"><MascotAvatar id="comet" size={98}/><span className="float-divider">MEET THE PARTY</span>
          <MascotAvatar id="crown" size={88}/><div className="float-caption">LET'S<br/>PLAY!</div></div>
      </section>
      <div className="section-heading"><div><span className="eyebrow">READY TO RUN</span><h2>{t('available')}</h2></div>
        <button className="text-link" onClick={()=>go('trainer')}>{t('play')} →</button></div>
      <section className="feature-row">
        <button className="featured-game" onClick={()=>go('trainer')}><span className="triple-icon">✕ <i>◯</i> ✕</span>
          <span className="featured-title">TRIPLE SPARK</span><span className="feature-sub">REAL GAME ENGINE · BOT / HOTSEAT</span>
          <span className="play-disc">↗</span></button>
        <div className="feature-meta panel"><div className="eyebrow">38 DESIGN BLUEPRINTS</div><h3>{t('discover')}</h3><p>{t('phaseInfo')}</p>
          <div className="category-preview">{(['board','card','casino'] as const).map(c=><button key={c} onClick={()=>{setPage('library');setCategory(c);}}>
            <span>{c==='board'?'♟':c==='card'?'♠':'◆'}</span><b>{t(c)}</b><small>{GAME_CATALOG.filter(g=>g.category===c).length} GAMES</small></button>)}</div></div>
      </section>
      <div className="section-heading"><div><span className="eyebrow">DISCOVERY</span><h2>{t('favorites')}</h2></div><button className="text-link" onClick={()=>{setCategory('favorites');setPage('library');}}>{t('explore')} →</button></div>
      {doc.profile.favorites.length ? <div className="game-grid compact">{GAME_CATALOG.filter(g=>doc.profile.favorites.includes(g.id)).slice(0,4).map(entry=><GameTile key={entry.id} entry={entry} locale={locale}
        favored={true} onToggle={()=>toggleFavorite(entry.id)} onDetails={()=>setSelected(entry)}/>)}</div>:
        <div className="empty-state">♡ &nbsp; {locale==='vi'?'Đánh dấu ♥ trong thư viện để lưu game bạn quan tâm.':'Tap ♥ in the library to bookmark games you want to follow.'}</div>}
    </main>}
    {page==='library' && <main className="page">
      <div className="section-heading"><div><span className="eyebrow">DISCOVER / CATALOG</span><h1>{t('library')}</h1><p>{t('phaseInfo')}</p></div><span className="counter-badge">38 DESIGNS</span></div>
      <div className="catalog-tools"><div className="search-wrap"><span>⌕</span><input ref={input} aria-label={t('search')} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('search')}/></div>
        <div className="filter-list">{(['all','board','card','casino','favorites'] as const).map(c=><button key={c}
          className={`filter ${category===c?'selected':''}`} onClick={()=>{sound();setCategory(c);}}>{t(c)}</button>)}</div></div>
      <div className="listing-meta"><span>{t('gameDesign')}</span><span>{visible.length} / {GAME_CATALOG.length}</span></div>
      {visible.length?<div className="game-grid">{visible.map(entry=><GameTile key={entry.id} entry={entry} locale={locale}
        favored={doc.profile.favorites.includes(entry.id)} onToggle={()=>toggleFavorite(entry.id)} onDetails={()=>{sound();setSelected(entry);}}/>)}</div>:
        <div className="empty-state">{t('noResults')}</div>}
      <div className="legal-note">{t('entertainment')}</div>
    </main>}
    {page==='trainer' && <TripleSparkScreen doc={doc} update={update} locale={locale} t={t} onBack={()=>go('home')}/>}
    {page==='game' && activeGame && <ArcadeGameScreen gameId={activeGame} doc={doc} update={update} locale={locale} onBack={()=>go('library')}/>}
    {page==='profile' && <ProfileView doc={doc} update={update} t={t} avatar={avatar} />}
    {page==='settings' && <SettingsView doc={doc} update={update} replace={replace} t={t} />}
    {import.meta.env.DEV&&page==='styleGuide'&&<StyleGuide locale={locale} onBack={()=>go('home')}/>}
    {LanChessDevScreen&&page==='lanDev'&&<Suspense fallback={<main className="page"><p>Đang tải LAN Lab…</p></main>}><LanChessDevScreen onBack={()=>go('home')}/></Suspense>}
    <footer className="shell-footer"><span>© MASHUP ARENA / BUILD 0.2.0</span><span>{busy?t('saving'):message?t('error'):t('saved')} <b>●</b></span>
      <span>{t('entertainment')}</span>{import.meta.env.DEV&&<><button className="style-guide-link" onClick={()=>go('styleGuide')}>STYLE GUIDE ↗</button><button className="style-guide-link" onClick={()=>go('lanDev')}>LAN LAB ↗</button></>}</footer>
    </div>
    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}>
      <section role="dialog" aria-modal="true" aria-label={selected.name} className="modal panel game-detail" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={()=>setSelected(null)} aria-label={t('close')}>×</button>
        <div className={`detail-hero type-${selected.category}`}><span>{ICONS[selected.id]}</span><small>{selected.category.toUpperCase()}</small></div>
        <span className="eyebrow">{t('preview')}</span><h2>{selected.name}</h2>
        <div className="detail-row"><span>{t('gameDesign')}</span><strong>{readyGames.some(game=>game.descriptor.id===selected.id)?t('ready'):t('planned')}</strong></div>
        <div className="detail-row"><span>{t('release')}</span><strong>{READY_IDS.has(selected.id)?t('ready'):`PHASE ${selected.phase}`}</strong></div>
        <p>{t('ruleNote')}</p><div className="mechanic-tags">{selected.tags.map(x=><span key={x}>#{x}</span>)}</div>
        <div className="button-row">{READY_IDS.has(selected.id)&&<button className="button primary" onClick={()=>{setActiveGame(selected.id);setSelected(null);setPage('game');}}>{t('playNow')}</button>}<button className="button outline" onClick={()=>toggleFavorite(selected.id)}>
          {doc.profile.favorites.includes(selected.id)?'♥':'♡'} {t('favorites')}</button>
          <button className="button ghost" onClick={()=>setSelected(null)}>{t('close')}</button></div>
      </section></div>}
    {message && <div className="toast error" role="alert">{message}</div>}
  </div>;
}
function ProfileView({doc,update,t,avatar}:{doc:SaveDocument;update:(fn:(d:SaveDocument)=>SaveDocument)=>void;t:(s:string)=>string;avatar:string}){
  const [name,setName]=useState(doc.profile.displayName),[selected,setSelected]=useState(doc.profile.avatarId),[notice,setNotice]=useState('');
  const complete=doc.history.filter(x=>x['gameId']==='triple-spark').length;
  const wins=doc.history.filter(x=>x['gameId']==='triple-spark'&&x['mode']==='bot'&&x['result']==='p1').length;
  const save=()=>{const cleaned=name.trim().slice(0,24);if(!cleaned){setNotice('Name required');return;}
    update(d=>({...d,profile:{...d.profile,displayName:cleaned,avatarId:selected}}));setNotice('✓');};
  return <main className="page narrow-page"><div className="section-heading"><div><span className="eyebrow">PLAYER / LOCAL PROFILE</span><h1>{t('profileTitle')}</h1></div></div>
    <section className="profile-banner panel"><div className="avatar-large"><MascotAvatar id={avatar} size={104}/></div><div><span className="eyebrow">OFFLINE PLAYER</span>
      <h2>{doc.profile.displayName}</h2><p>{t('level')} {doc.profile.level} · {doc.profile.xp} XP</p>
      <PartyProgress value={doc.profile.xp%150} max={150} label="Level progress"/></div></section>
    <div className="stat-grid"><div className="stat panel"><small>{t('completed')}</small><strong>{complete}</strong></div>
      <div className="stat panel"><small>{t('wins')}</small><strong>{wins}</strong></div>
      <div className="stat panel"><small>{t('faves')}</small><strong>{doc.profile.favorites.length}</strong></div>
      <div className="stat panel"><small>{t('chips')}</small><strong>{doc.profile.virtualChips.toLocaleString()}</strong></div></div>
    <section className="panel editor"><h2>{t('edit')}</h2><label htmlFor="displayName">{t('name')}</label>
      <input id="displayName" value={name} maxLength={24} onChange={e=>setName(e.target.value)} />
      <label>{t('avatar')}</label><div className="avatar-picker">{MASCOTS.map(({id,name})=><button key={id}
        className={selected===id?'selected':''} aria-label={name} aria-pressed={selected===id} onClick={()=>setSelected(id)}><MascotAvatar id={id} size={48}/></button>)}</div>
      <button className="button primary" onClick={save}>{t('saveName')}</button>{notice&&<span role="status">{notice}</span>}</section>
  </main>;
}
function SettingsView({doc,update,replace,t}:{doc:SaveDocument;update:(fn:(d:SaveDocument)=>SaveDocument)=>void;replace:(d:SaveDocument)=>void;t:(s:string)=>string}){
  const [note,setNote]=useState('');
  const settings=doc.settings;
  const patch=(changes:Partial<Settings>)=>update(d=>({...d,settings:{...d.settings,...changes}}));
  const toggleFullscreen=async()=>{try{
    if(window.arena){await window.arena.toggleFullscreen();}
    else {if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();patch({fullscreen:Boolean(document.fullscreenElement)});}
  }catch(e){setNote(String(e));}};
  return <main className="page narrow-page"><div className="section-heading"><div><span className="eyebrow">USER PREFERENCES</span><h1>{t('settingsTitle')}</h1></div></div>
    <section className="settings-panel panel"><h2>{t('language')}</h2><div className="segmented"><button className={settings.locale==='vi'?'on':''} onClick={()=>patch({locale:'vi'})}>Tiếng Việt</button>
      <button className={settings.locale==='en'?'on':''} onClick={()=>patch({locale:'en'})}>English</button></div>
      <div className="settings-separator"/><h2>{t('audio')}</h2>
      <label className="switch-row"><span>{t('mute')}</span><input type="checkbox" checked={settings.audio.muted} onChange={e=>patch({audio:{...settings.audio,muted:e.target.checked}})}/></label>
      <label className="range-row"><span>{t('sfx')}</span><input type="range" min="0" max="1" step="0.05" value={settings.audio.sfx}
        onChange={e=>patch({audio:{...settings.audio,sfx:Number(e.target.value)}})} /><b>{Math.round(settings.audio.sfx*100)}%</b></label>
      <label className="range-row"><span>{t('music')}</span><input type="range" min="0" max="1" step="0.05" value={settings.audio.music}
        onChange={e=>patch({audio:{...settings.audio,music:Number(e.target.value)}})} /><b>{Math.round(settings.audio.music*100)}%</b></label>
      <div className="settings-separator"/><h2>ACCESSIBILITY</h2>
      <label className="switch-row"><span>{t('contrast')}</span><input type="checkbox" checked={settings.accessibility.highContrast} onChange={e=>patch({accessibility:{...settings.accessibility,highContrast:e.target.checked}})}/></label>
      <label className="switch-row"><span>{t('motion')}</span><input type="checkbox" checked={settings.accessibility.reducedMotion} onChange={e=>patch({accessibility:{...settings.accessibility,reducedMotion:e.target.checked}})}/></label>
      <label className="switch-row"><span>{t('colorblind')}</span><input type="checkbox" checked={settings.accessibility.colorblindSymbols??false} onChange={e=>patch({accessibility:{...settings.accessibility,colorblindSymbols:e.target.checked}})}/></label>
      <div className="setting-label">{t('font')}</div><div className="segmented">{([1,1.15,1.3] as const).map(scale=><button key={scale} className={settings.accessibility.fontScale===scale?'on':''}
        onClick={()=>patch({accessibility:{...settings.accessibility,fontScale:scale}})}>{scale===1?'100':scale===1.15?'115':'130'}%</button>)}</div>
      <div className="settings-separator"/><h2>{t('difficulty')}</h2><div className="segmented">{(['easy','normal','hard'] as const).map(d=><button key={d}
        className={settings.botDifficulty===d?'on':''} onClick={()=>patch({botDifficulty:d})}>{t(d)}</button>)}</div>
      <div className="settings-separator"/><h2>DESKTOP & DATA</h2><div className="button-row"><button className="button outline" onClick={()=>void toggleFullscreen()}>{t('fullscreen')} (F11)</button>
        <button className="button outline" onClick={()=>void backupSave(doc).then(p=>{if(p)setNote('Backup exported');}).catch(e=>setNote(String(e)))}>{t('export')}</button>
        {window.arena && <button className="button outline" onClick={()=>void importSave().then(d=>{if(d){replace(d);setNote('Backup restored');}}).catch(e=>setNote(String(e)))}>{t('import')}</button>}</div>
      <p className="settings-note">{t('keyboard')}</p>{note&&<p role="status" className="settings-note">{note}</p>}
    </section>
  </main>;
}
