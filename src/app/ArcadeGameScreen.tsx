import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import type { GameModuleBridge } from '../contracts/bridge';
import type { SaveDocument,SavedMatch } from '../contracts/persistence';
import type { GameAction,Json,JsonObject,Locale,PlayerId } from '../contracts/types';
import { SeededRng } from '../core/seededRng';
import { getReadyGame } from '../registry/registry';

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
function valueText(value:Json):string {
  if(Array.isArray(value))return value.map(item=>typeof item==='object'&&item!==null?Object.values(item).join('·'):String(item)).join('  ');
  if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):String(v)}`).join(' · ');
  return String(value);
}
function SceneView({bridge,state}:{bridge:GameModuleBridge;state:JsonObject}) {
  const scene=bridge.scene(state,null);
  return <div className={`generic-scene board-${scene.boardType}`} role="img" aria-label={scene.accessibleDescription}>
    <div className="scene-title">{scene.accessibleDescription}</div>
    {scene.layers.map((layer,index)=><section className="scene-layer" key={index}>
      <strong>{String(layer['kind']??`Layer ${index+1}`).replaceAll('-',' ').toUpperCase()}</strong>
      {Object.entries(layer).filter(([key])=>key!=='kind').map(([key,value])=><div className="scene-value" key={key}><small>{key}</small><span>{valueText(value)}</span></div>)}
    </section>)}
  </div>;
}
export function ArcadeGameScreen({gameId,doc,update,locale,onBack}:Props){
  const [bridge,setBridge]=useState<GameModuleBridge|null>(null),[warning,setWarning]=useState('');
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
  }catch(e){setWarning(String(e));}},[bridge,persist]);
  const active=(session?.state['activePlayer']??null) as PlayerId|null;
  const actions=useMemo(()=>bridge&&session&&active?bridge.legalActions(session.state,active):[],[bridge,session,active]);
  useEffect(()=>{if(!bridge||!session||session.mode!=='bot'||active!=='p2'||!actions.length)return;const timer=setTimeout(()=>dispatch(actions[Number(session.state['revision']??0)%actions.length]!),450);return()=>clearTimeout(timer);},[bridge,session,active,actions,dispatch]);
  const title=bridge?.descriptor.title[locale]??gameId;
  const solo=bridge?.descriptor.maxPlayers===1;
  return <main className="page match-page"><div className="section-heading"><div><span className="eyebrow">PHASE 3 / VERIFIED PLUGIN</span><h1>{title}</h1><p>{locale==='vi'?'Luật độc lập, tự lưu sau mỗi hành động và chơi hoàn toàn ngoại tuyến.':'Independent rules, per-action autosave and fully offline play.'}</p></div><button className="button ghost" onClick={onBack}>← {locale==='vi'?'Thư viện':'Library'}</button></div>
    {!session?<section className="panel phase3-setup"><div className="big-orb">◆</div><h2>{locale==='vi'?'Thiết lập ván':'Match setup'}</h2><div className="button-row">
      {solo?<button className="button primary" disabled={!bridge} onClick={()=>start('practice')}>{locale==='vi'?'Bắt đầu':'Start'}</button>:<><button className="button primary" disabled={!bridge} onClick={()=>start('bot')}>{locale==='vi'?'Đấu bot':'Versus bot'}</button><button className="button outline" disabled={!bridge} onClick={()=>start('hotseat')}>{locale==='vi'?'Hai người':'Local two-player'}</button></>}
    </div></section>:<div className="generic-game-layout"><section className="panel generic-board">{bridge&&<SceneView bridge={bridge} state={session.state}/>}</section><aside className="panel action-console"><span className="eyebrow">LEGAL ACTIONS</span><h2>{active?`${locale==='vi'?'Lượt':'Turn'} ${active.toUpperCase()}`:(locale==='vi'?'Hoàn thành':'Completed')}</h2><div className="action-list">{actions.map((action,index)=><button className="button outline" key={`${action.type}-${index}`} disabled={session.mode==='bot'&&active==='p2'} onClick={()=>dispatch(action)}>{actionLabel(action,locale)}</button>)}</div><button className="button ghost" onClick={()=>start(session.mode)}>{locale==='vi'?'Ván mới':'New match'}</button><p className="settings-note">{locale==='vi'?'Chỉ hành động hợp lệ do game engine cung cấp mới xuất hiện.':'Only engine-validated legal actions are shown.'}</p></aside></div>}
    {warning&&<div className="toast error" role="alert">{warning}</div>}
  </main>;
}
