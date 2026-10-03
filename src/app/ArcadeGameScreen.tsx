import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import type { GameModuleBridge } from '../contracts/bridge';
import type { SaveDocument,SavedMatch } from '../contracts/persistence';
import type { GameAction,Json,JsonObject,Locale,PlayerId } from '../contracts/types';
import { SeededRng } from '../core/seededRng';
import { getReadyGame } from '../registry/registry';
import { MascotAvatar, PartyBadge } from './PartyUi';
import { TableScene } from './TableScene';
import { playGameCue } from './sound';

interface Session {id:string;state:JsonObject;mode:'bot'|'hotseat'|'practice';awarded:boolean;}
interface Props {gameId:string;doc:SaveDocument;update:(fn:(d:SaveDocument)=>SaveDocument)=>void;locale:Locale;onBack:()=>void;}
function restored(match:SavedMatch|undefined):Session|null {
  if(!match)return null;const data=match.snapshot as {state?:Json;mode?:Json;awarded?:Json};
  if(!data.state||typeof data.state!=='object'||Array.isArray(data.state)||!['bot','hotseat','practice'].includes(String(data.mode)))return null;
  return{id:match.id,state:data.state as JsonObject,mode:data.mode as Session['mode'],awarded:data.awarded===true};
}
function actionLabel(action:GameAction,locale:Locale):string {
  const labels:Record<string,[string,string]>={move:['Di chuyển','Move'],play:['Đánh bài','Play card'],draw:['Rút bài','Draw'],hit:['Rút','Hit'],stand:['Dừng','Stand'],double:['Gấp đôi','Double'],spin:['Quay','Spin'],stop:['Dừng ván','Stop'],roll:['Đổ xúc xắc','Roll'],promote:['Phong cấp','Promote']};
  const base=labels[action.type]?.[locale==='vi'?0:1]??action.type.replaceAll('-',' ');
  const details=Object.entries(action.payload).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(','):String(v)}`).join(' · ');
  return details?`${base} — ${details}`:base;
}
export function ArcadeGameScreen({gameId,doc,update,locale,onBack}:Props){
  const [bridge,setBridge]=useState<GameModuleBridge|null>(null),[warning,setWarning]=useState('');
  const [showRules,setShowRules]=useState(false);
  const [session,setSession]=useState<Session|null>(()=>restored(doc.savedMatches.find(m=>m.gameId===gameId)));
  const live=useRef(session);live.current=session;
  useEffect(()=>{let dead=false;void getReadyGame(gameId).then(g=>{if(!dead)setBridge(g);}).catch(e=>setWarning(String(e)));return()=>{dead=true;};},[gameId]);
  const persist=useCallback((next:Session,reward=false)=>{live.current=next;setSession(next);update(d=>{
    const xp=reward?40:0,newXp=d.profile.xp+xp;
    const saved:SavedMatch={id:next.id,gameId,fusionRecipeId:null,gameRulesetVersion:bridge?.descriptor.rulesetVersion??'1.0.0',fusionRecipeVersion:null,
      rngSnapshot:{seed:next.id},snapshot:{state:next.state,mode:next.mode,awarded:next.awarded},commandSequence:Number(next.state['revision']??0),updatedAt:new Date().toISOString()};
    return{...d,profile:reward?{...d.profile,xp:newXp,level:Math.floor(newXp/150)+1,virtualChips:d.profile.virtualChips+15}:d.profile,
      history:reward?[{gameId,result:'completed',mode:next.mode,date:new Date().toISOString()},...d.history].slice(0,200):d.history,
      savedMatches:[...d.savedMatches.filter(m=>m.gameId!==gameId),saved].slice(-4)};
  });},[bridge?.descriptor.rulesetVersion,gameId,update]);
  const start=useCallback((mode:Session['mode'])=>{if(!bridge)return;const id=crypto.randomUUID();const players=bridge.descriptor.maxPlayers===1
    ? [{id:'p1' as const,controller:'human' as const,displayName:doc.profile.displayName}]
    : [{id:'p1' as const,controller:'human' as const,displayName:doc.profile.displayName},{id:'p2' as const,controller:(mode==='bot'?'bot':'human') as 'bot'|'human',difficulty:doc.settings.botDifficulty,displayName:mode==='bot'?'Bot':'Player 2'}];
    const state=bridge.setup({matchId:id,mode:mode==='practice'?'practice':mode,seed:id,locale,players,options:{}},
    {rng:new SeededRng(id),rulesetVersion:bridge.descriptor.rulesetVersion,fusionId:null});persist({id,state,mode,awarded:false});setWarning('');},[bridge,doc.profile.displayName,doc.settings.botDifficulty,locale,persist]);
  const dispatch=useCallback((action:GameAction)=>{const cur=live.current;if(!bridge||!cur)return;try{
    const result=bridge.dispatch(cur.state,action,{rng:new SeededRng(`${cur.id}:${String(cur.state['revision']??0)}`),rulesetVersion:bridge.descriptor.rulesetVersion,fusionId:null});
    const ended=Boolean(result.outcome)&&!cur.awarded;persist({...cur,state:result.state,awarded:cur.awarded||ended},ended);
    playGameCue(doc.settings.audio.muted?0:doc.settings.audio.sfx,action.type,ended);
  }catch(e){setWarning(String(e));}},[bridge,persist,doc.settings.audio.muted,doc.settings.audio.sfx]);
  const active=(session?.state['activePlayer']??null) as PlayerId|null;
  const actions=useMemo(()=>bridge&&session&&active?bridge.legalActions(session.state,active):[],[bridge,session,active]);
  useEffect(()=>{if(!bridge||!session||session.mode!=='bot'||active!=='p2'||!actions.length)return;const timer=setTimeout(()=>dispatch(actions[Number(session.state['revision']??0)%actions.length]!),450);return()=>clearTimeout(timer);},[bridge,session,active,actions,dispatch]);
  const title=bridge?.descriptor.title[locale]??gameId;
  const solo=bridge?.descriptor.maxPlayers===1;
  const outcome=bridge&&session?bridge.outcome(session.state):null;
  const visibleActions=gameId==='chess'||gameId==='xiangqi'||gameId==='uno'?actions.filter(a=>a.type!=='move'&&a.type!=='play'):actions;
  return <main className="page match-page party-match"><div className="section-heading"><div><span className="eyebrow">MASHUP ARENA / PARTY TABLE</span><h1>{title}</h1><p>{locale==='vi'?'Chọn quân hoặc lá bài trên bàn. Các nút bên cạnh chỉ hiển thị hành động hợp lệ.':'Choose a piece or card on the table. The buttons show available actions.'}</p></div><div className="button-row"><button className="button outline" onClick={()=>setShowRules(true)}>？ {locale==='vi'?'Luật chơi':'Rules'}</button><button className="button ghost" onClick={onBack}>← {locale==='vi'?'Thư viện':'Library'}</button></div></div>
    {!session?<section className="panel party-match-setup"><div className="setup-mini-table"><MascotAvatar id="crown" size={72}/><span>✦</span><MascotAvatar id={doc.profile.avatarId} size={72}/></div><div className="setup-actions"><PartyBadge tone="gold">{locale==='vi'?'CHỌN CHẾ ĐỘ':'CHOOSE MODE'}</PartyBadge><h2>{locale==='vi'?'Sẵn sàng vào bàn?':'Ready to play?'}</h2><p>{locale==='vi'?'Tất cả ván chơi tự lưu trên máy. Chọn chế độ và bắt đầu.':'Every match saves locally. Pick a mode and start.'}</p><div className="button-row">
      {solo?<button className="button primary" disabled={!bridge} onClick={()=>start('practice')}>{locale==='vi'?'BẮT ĐẦU':'START'}</button>:<><button className="button primary" disabled={!bridge} onClick={()=>start('bot')}>{locale==='vi'?'ĐẤU BOT':'VERSUS BOT'}</button><button className="button outline" disabled={!bridge} onClick={()=>start('hotseat')}>{locale==='vi'?'HAI NGƯỜI':'LOCAL 2P'}</button></>}
    </div></div></section>:<div className="party-match-layout">{bridge&&<TableScene gameId={gameId} category={bridge.descriptor.category} title={title} state={session.state} actions={actions} active={active} mode={session.mode} locale={locale} playerName={doc.profile.displayName} onAction={dispatch}/>}<aside className="panel party-action-console">
      {outcome&&<div className="party-result" role="status"><span>✦ ✦ ✦</span><h2>{outcome.winningPlayers.includes('p1')?(locale==='vi'?'CHIẾN THẮNG!':'VICTORY!'):outcome.winningPlayers.length===0?(locale==='vi'?'HÒA!':'DRAW!'):(locale==='vi'?'KẾT THÚC!':'GAME OVER!')}</h2><p>+40 XP　◈ +15</p></div>}
      <span className="eyebrow">{locale==='vi'?'BÀN ĐIỀU KHIỂN':'ACTION CONSOLE'}</span><h2>{active?`${locale==='vi'?'Lượt':'Turn'} ${active.toUpperCase()}`:(locale==='vi'?'Hoàn thành':'Completed')}</h2><p>{gameId==='uno'?(locale==='vi'?'Chạm lá bài sáng để đánh, hoặc rút từ bộ bài.':'Tap a glowing card to play, or draw from the deck.'):gameId==='chess'||gameId==='xiangqi'?(locale==='vi'?'Chọn quân rồi chọn ô đích đang sáng.':'Select a piece, then a highlighted destination.'):(locale==='vi'?'Chọn hành động bên dưới.':'Choose an action below.')}</p>
      <div className="action-list">{visibleActions.map((action,index)=><button className={`button ${['roll','spin','hit','play'].includes(action.type)?'play-action':'outline'}`} key={`${action.type}-${index}`} disabled={session.mode==='bot'&&active==='p2'} onClick={()=>dispatch(action)}>{actionLabel(action,locale)}</button>)}</div>
      {(gameId==='chess'||gameId==='xiangqi')&&<details className="legal-moves"><summary>{actions.length} {locale==='vi'?'nước hợp lệ':'legal moves'}</summary><div className="action-list">{actions.map((action,index)=><button className="button outline" key={index} disabled={session.mode==='bot'&&active==='p2'} onClick={()=>dispatch(action)}>{actionLabel(action,locale)}</button>)}</div></details>}
      <div className="button-row"><button className="button ghost" onClick={()=>start(session.mode)}>{locale==='vi'?'Ván mới':'New match'}</button><button className="button outline" onClick={()=>setShowRules(true)}>？ {locale==='vi'?'Hướng dẫn':'How to play'}</button></div>
    </aside></div>}
    {showRules&&bridge&&<div className="modal-backdrop" onClick={()=>setShowRules(false)}><section className="modal panel" role="dialog" aria-modal="true" aria-label={locale==='vi'?'Luật chơi':'Rules'} onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowRules(false)}>×</button><PartyBadge tone="gold">{title}</PartyBadge><h2>{locale==='vi'?'Luật chơi':'How to play'}</h2>{bridge.tutorial(locale).paragraphs.map((part,index)=><div className="tutorial-paragraph" key={index}><h3>{part.title}</h3><p>{part.body}</p></div>)}</section></div>}
    {warning&&<div className="toast error" role="alert">{warning}</div>}
  </main>;
}
