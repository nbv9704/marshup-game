import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveDocument, SavedMatch } from '../contracts/persistence';
import type { GameModuleBridge } from '../contracts/bridge';
import type { JsonObject, Locale, PlayerId } from '../contracts/types';
import { getReadyGame } from '../registry/registry';
import { chooseBotCell, restoreTripleState, type TripleState } from '../games/triple-spark/rules';
import { SeededRng } from '../core/seededRng';
import { PixiBoard } from '../graphics/PixiBoard';
import { playTone } from './sound';
interface Session { id:string; state:TripleState; past:TripleState[]; mode:'bot'|'hotseat'; awarded:boolean; }
interface Props {
  doc:SaveDocument; update:(fn:(d:SaveDocument)=>SaveDocument)=>void; t:(key:string)=>string;
  locale:Locale; onBack:()=>void;
}
function fromMatch(match:SavedMatch|undefined):Session|null {
  if(!match || match.gameRulesetVersion!=='1.0.0')return null;
  try {
    const saved=match.snapshot as { state?:unknown;past?:unknown;mode?:unknown;awarded?:unknown };
    if(saved.mode!=='bot' && saved.mode!=='hotseat')return null;
    return {id:match.id,state:restoreTripleState(saved.state),past:Array.isArray(saved.past)?saved.past.map(restoreTripleState).slice(-12):[],
      mode:saved.mode,awarded:saved.awarded===true};
  }catch{return null;}
}
export function TripleSparkScreen({doc,update,t,locale,onBack}:Props) {
  const [bridge,setBridge]=useState<GameModuleBridge|null>(null);
  const [session,setSession]=useState<Session|null>(()=>fromMatch(doc.savedMatches.find(m=>m.gameId==='triple-spark')));
  const live=useRef(session),worker=useRef<Worker|null>(null),pending=useRef<string|null>(null),serial=useRef(0),playRef=useRef<(i:number,a:PlayerId)=>void>(()=>{});
  const [hint,setHint]=useState<number|null>(null),[guide,setGuide]=useState(false),[warning,setWarning]=useState(''),[seconds,setSeconds]=useState(0);
  const volume=doc.settings.audio.muted?0:doc.settings.audio.sfx;
  useEffect(()=>{let dead=false;void getReadyGame('triple-spark').then(b=>{if(!dead)setBridge(b);}).catch(e=>setWarning(String(e)));
    return()=>{dead=true;};},[]);
  const persist=useCallback((next:Session, reward?:{winner:TripleState['winner'];mode:Session['mode']})=>{
    live.current=next;setSession(next);
    update(d=>{
      const result=reward?.winner,win=reward?.mode==='bot' && result==='p1';
      const xp=win?65:result==='draw'?25:15;
      const newXp=d.profile.xp+(reward?xp:0);
      return { ...d,
        profile:reward?{...d.profile,xp:newXp,level:Math.floor(newXp/150)+1,
          virtualChips:d.profile.virtualChips+(win?30:result==='draw'?10:5)}:d.profile,
        history:reward?[{gameId:'triple-spark',result:reward.winner,mode:reward.mode,date:new Date().toISOString()},...d.history].slice(0,200):d.history,
        savedMatches:[...d.savedMatches.filter(m=>m.gameId!=='triple-spark'),{
          id:next.id,gameId:'triple-spark',fusionRecipeId:null,gameRulesetVersion:'1.0.0',fusionRecipeVersion:null,
          rngSnapshot:{algorithm:'mulberry32',value:1},snapshot:{state:next.state,past:next.past,mode:next.mode,awarded:next.awarded} as unknown as JsonObject,
          commandSequence:next.state.revision,updatedAt:new Date().toISOString()
        }]
      };
    });
  },[update]);
  const playCell=useCallback((i:number,actor:PlayerId)=>{
    const cur=live.current;
    if(!bridge || !cur || cur.state.phase!=='playing' || cur.state.activePlayer!==actor)return;
    const action={type:'place',actor,payload:{cell:i}};
    if(!bridge.validate(cur.state as unknown as Parameters<typeof bridge.validate>[0],action).valid)return;
    const result=bridge.dispatch(cur.state as unknown as Parameters<typeof bridge.dispatch>[0],action,
      {rng:new SeededRng(cur.id),rulesetVersion:'1.0.0',fusionId:null});
    const state=restoreTripleState(result.state),next:Session={...cur,state,past:[...cur.past,cur.state].slice(-12)};
    setHint(null);playTone(volume,state.winner?760:actor==='p1'?440:340,state.winner?'win':'place');
    const ended=state.phase==='completed'&&!cur.awarded;
    persist(ended?{...next,awarded:true}:next,ended?{winner:state.winner,mode:cur.mode}:undefined);
  },[bridge,volume,persist]);
  playRef.current=playCell;
  useEffect(()=>{
    let w:Worker|null=null;
    try {
      w=new Worker(new URL('../workers/tripleBot.ts',import.meta.url),{type:'module'});worker.current=w;
      w.onmessage=(e:MessageEvent<{id:string;cell?:number;error?:string}>)=>{
        if(e.data.id!==pending.current)return;
        pending.current=null;
        if(typeof e.data.cell==='number')playRef.current(e.data.cell,'p2');
        else if(e.data.error)setWarning(e.data.error);
      };
      w.onerror=()=>{
        worker.current=null;pending.current=null;
        setWarning('Background worker unavailable: local fallback enabled');
        const current=live.current;
        if(current?.mode==='bot' && current.state.activePlayer==='p2') {
          const cell=chooseBotCell(current.state.cells,'normal',current.state.turnNumber,'p2');
          queueMicrotask(()=>playRef.current(cell,'p2'));
        }
      };
    } catch {
      worker.current=null;setWarning('Background worker unavailable: local fallback enabled');
    }
    return()=>{pending.current=null;w?.terminate();worker.current=null;};
  },[]);
  useEffect(()=>{
    if(!session || session.mode!=='bot' || session.state.activePlayer!=='p2' || !bridge)return;
    if(!worker.current) {
      const cell=chooseBotCell(session.state.cells,'normal',session.state.turnNumber,'p2');
      queueMicrotask(()=>playRef.current(cell,'p2'));return;
    }
    const id=`${session.id}:${++serial.current}`;pending.current=id;
    worker.current.postMessage({id,cells:session.state.cells,difficulty:doc.settings.botDifficulty,as:'p2',salt:session.state.turnNumber});
  },[session?.id,session?.state.revision,session?.state.activePlayer,doc.settings.botDifficulty,bridge]);
  useEffect(()=>{
    const id=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id);
  },[]);
  const newMatch=(mode:'bot'|'hotseat')=>{
    if(!bridge)return;
    pending.current=null;setHint(null);setSeconds(0);setWarning('');
    const id=crypto.randomUUID();
    const state=restoreTripleState(bridge.setup({matchId:id,mode,seed:id,locale,
      players:[{id:'p1',controller:'human',displayName:doc.profile.displayName},
        {id:'p2',controller:mode==='bot'?'bot':'human',difficulty:doc.settings.botDifficulty,displayName:mode==='bot'?'Bot':'Player 2'}],options:{}},
      {rng:new SeededRng(id),rulesetVersion:'1.0.0',fusionId:null}));
    persist({id,state,mode,past:[],awarded:false});
  };
  const undo=()=>{
    const cur=live.current;if(!cur || !cur.past.length || cur.state.phase==='completed' && cur.awarded)return;
    pending.current=null;
    const count=cur.mode==='bot' && cur.past.length>=2 && cur.state.activePlayer!=='p2'?2:1;
    const earlier=cur.past[cur.past.length-count];if(!earlier)return;
    const restored={...earlier,revision:cur.state.revision+1};
    persist({...cur,state:restored,past:cur.past.slice(0,-count)});
    setHint(null);
  };
  const suggest=()=>{
    const cur=live.current;if(!cur || cur.state.phase!=='playing' || cur.mode==='bot' && cur.state.activePlayer==='p2')return;
    const cell=chooseBotCell(cur.state.cells,'hard',0,cur.state.activePlayer!);
    setHint(cell);playTone(volume,640);
  };
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(!live.current || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || guide)return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
      if(e.key.toLowerCase()==='h'){e.preventDefault();suggest();return;}
      const i=Number(e.key)-1;
      if(e.key>='1'&&e.key<='9'){
        const s=live.current;
        if(s && (s.mode==='hotseat'||s.state.activePlayer==='p1'))playRef.current(i,s.state.activePlayer!);
      }
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  const canPlay=Boolean(session && session.state.phase==='playing' && (session.mode==='hotseat'||session.state.activePlayer==='p1'));
  const recent=doc.history.filter(i=>i['gameId']==='triple-spark').length;
  return <main className="page match-page">
    <div className="section-heading"><div><span className="eyebrow">REAL GAME ENGINE / #01</span><h1>{t('trainerTitle')}</h1>
      <p>{t('trainerBody')}</p></div><button className="button ghost" onClick={onBack}>← {t('home')}</button></div>
    <div className="arena-layout">
      <section className="arena-main panel">
        <div className="arena-status"><div><span className="live-dot"/> {session?.state.phase==='completed'?
          (session.state.winner==='draw'?t('draw'):session.state.winner==='p1'?t('won'):t('lost')):
          !session?t('setup'):session.state.activePlayer==='p1'?t('turn1'):t('turn2')}</div>
          <span>{session?t('move')+ ' '+session.state.turnNumber:'READY'}</span></div>
        {session ? <PixiBoard cells={session.state.cells} winningLine={session.state.winningLine}
          hint={hint} enabled={canPlay} onCell={i=>{const s=live.current;if(s?.state.activePlayer)playCell(i,s.state.activePlayer);}}
          reducedMotion={doc.settings.accessibility.reducedMotion} highContrast={doc.settings.accessibility.highContrast}/> :
          <div className="setup-center"><div className="big-orb">✦</div><h2>{t('setup')}</h2>
            <p>{t('helpText')}</p><div className="button-row"><button className="button primary" disabled={!bridge} onClick={()=>newMatch('bot')}>{t('bot')}</button>
            <button className="button outline" disabled={!bridge} onClick={()=>newMatch('hotseat')}>{t('hotseat')}</button></div></div>}
        {session && <div className="arena-toolbar"><button className="button outline" onClick={()=>newMatch(session.mode)}>{t('newMatch')}</button>
          <button className="button ghost" disabled={!session.past.length || Boolean(session.state.phase==='completed' && session.awarded)} onClick={undo}>↶ {t('undo')}</button>
          <button className="button ghost" disabled={!canPlay} onClick={suggest}>✧ {t('hint')}</button>
          <button className="button ghost" onClick={()=>setGuide(true)}>ⓘ {t('tutorial')}</button></div>}
      </section>
      <aside className="arena-sidebar">
        <div className="panel inset"><span className="eyebrow">MATCH CONSOLE</span>
          <h3>{session?.mode==='hotseat'?t('hotseat'):t('bot')}</h3>
          <div className="player-line"><span className="player-icon one">✕</span><span>{doc.profile.displayName}</span><span className={session?.state.activePlayer==='p1'?'status-pill':''}>{session?.state.activePlayer==='p1'?'●':''}</span></div>
          <div className="player-line"><span className="player-icon two">◯</span><span>{session?.mode==='hotseat'?t('player2'):t('botName')}</span><span className={session?.state.activePlayer==='p2'?'status-pill':''}>{session?.state.activePlayer==='p2'?'●':''}</span></div>
          <div className="detail-row"><span>TIME</span><strong>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></div>
          <div className="detail-row"><span>{t('difficulty')}</span><strong>{t(doc.settings.botDifficulty)}</strong></div>
          <div className="detail-row"><span>{t('completed')}</span><strong>{recent}</strong></div>
        </div>
        <div className="panel inset"><span className="eyebrow">HOW IT WORKS</span><p>{t('helpText')}</p>
          <button className="text-link" onClick={()=>setGuide(true)}>{t('tutorial')} ↗</button></div>
        <div className="panel inset subtle"><div className="notice-icon">▣</div><small>{t('saveInfo')}</small><small>{t('press')}</small></div>
      </aside>
    </div>
    {warning && <div role="alert" className="toast error">{warning}</div>}
    {guide && <div className="modal-backdrop" onClick={()=>setGuide(false)}><section className="modal panel" role="dialog" aria-modal="true" aria-label={t('tutorial')} onClick={e=>e.stopPropagation()}>
      <button className="modal-close" onClick={()=>setGuide(false)} aria-label={t('close')}>×</button><span className="eyebrow">TRIPLE SPARK</span><h2>{t('tutorial')}</h2>
      {bridge?.tutorial(locale).paragraphs.map((p,i)=><div className="tutorial-paragraph" key={i}><h3>{p.title}</h3><p>{p.body}</p></div>)}
      <button className="button primary" onClick={()=>setGuide(false)}>{t('close')}</button></section></div>}
  </main>;
}
