import { useState } from 'react';
import type { JsonObject, Locale } from '../contracts/types';
import { GlossyButton, MASCOTS, MascotAvatar, PartyBadge, PartyLogo, PartyProgress, PlayerSeat } from './PartyUi';
import { TableScene } from './TableScene';

const sample:JsonObject={
  phase:'playing',activePlayer:'p1',turnNumber:8,revision:7,activeColor:'red',direction:1,
  hands:{p1:[{id:'a',color:'yellow',rank:'7'},{id:'b',color:'red',rank:'reverse'},{id:'c',color:'blue',rank:'2'},{id:'d',color:null,rank:'wild'}],p2:[{id:'e'},{id:'f'},{id:'g'},{id:'h'},{id:'i'}],p3:[],p4:[]},
  discardPile:[{id:'top',color:'red',rank:'5'}],drawPile:Array(31).fill({id:'back'})
};
const modes=[{icon:'⚔',name:'VS BOT',color:'blue'},{icon:'♙',name:'LOCAL 2P',color:'green'},{icon:'✦',name:'PRACTICE',color:'gold'}];

export function FusionVisualPreview({locale}:{locale:Locale}) {
  const [revealed,setRevealed]=useState(false);
  return <div className="fusion-visual theme-fusion"><div className="fusion-rays"/><div className="fusion-pod"><span>GAME A</span><div className="fusion-token">♚</div><b>CHESS</b></div><div className="fusion-reactor"><span>✦</span><GlossyButton kind="special" onClick={()=>setRevealed(!revealed)}>{locale==='vi'?'HỢP NHẤT':'FUSE'}</GlossyButton></div><div className="fusion-pod"><span>GAME B</span><div className="fusion-token rainbow">▣</div><b>COLOR CLASH</b></div>{revealed&&<div className="fusion-reveal" role="status"><PartyBadge tone="gold">EPIC</PartyBadge><strong>ROYAL RAINBOW</strong><small>{locale==='vi'?'Bản xem trước giao diện · chưa có luật Fusion':'Visual preview · Fusion rules not active'}</small></div>}</div>;
}

export function StyleGuide({locale,onBack}:{locale:Locale;onBack:()=>void}) {
  const [tab,setTab]=useState<'components'|'table'|'fusion'>('components');
  return <main className="page style-guide-page"><div className="section-heading"><div><span className="eyebrow">DEVELOPMENT / DESIGN SYSTEM</span><h1>{locale==='vi'?'Style Guide: Glossy Cartoon Party':'Style Guide: Glossy Cartoon Party'}</h1><p>{locale==='vi'?'Bản xem trước thiết kế. Chỉ hiển thị trong chế độ phát triển.':'Visual preview. Available only in development mode.'}</p></div><button className="button ghost" onClick={onBack}>← {locale==='vi'?'Trở về':'Back'}</button></div>
    <div className="filter-list style-tabs">{(['components','table','fusion'] as const).map(name=><button key={name} className={`filter ${tab===name?'selected':''}`} onClick={()=>setTab(name)}>{name.toUpperCase()}</button>)}</div>
    {tab==='components'&&<div className="style-components">
      <section className="panel style-card"><PartyLogo/><h2>Original party identity</h2><p>Sunburst light, juicy color, thick white edges and soft 3D depth.</p></section>
      <section className="panel style-card"><h2>Buttons</h2><div className="button-row"><GlossyButton>PLAY</GlossyButton><GlossyButton kind="special">SPECIAL</GlossyButton><GlossyButton kind="info">INFO</GlossyButton><GlossyButton kind="danger">CANCEL</GlossyButton></div></section>
      <section className="panel style-card"><h2>Palette & badges</h2><div className="style-swatches">{['red','yellow','green','blue','purple','orange'].map(color=><span key={color} className={`swatch swatch-${color}`}>{color}</span>)}</div><div className="button-row"><PartyBadge tone="blue">NEW</PartyBadge><PartyBadge tone="gold">EPIC</PartyBadge><PartyBadge tone="green">READY</PartyBadge></div></section>
      <section className="panel style-card"><h2>Eight original mascots</h2><div className="mascot-gallery">{MASCOTS.map(m=><div key={m.id}><MascotAvatar id={m.id} size={76}/><b>{m.name}</b></div>)}</div></section>
      <section className="panel style-card"><h2>Seat, progress and controls</h2><div className="style-seat"><PlayerSeat name="PLAYER ONE" avatarId="comet" stat={7} active side="left"/></div><PartyProgress value={64} max={100} label="Example progress"/><div className="style-modes">{modes.map(m=><div key={m.name} className={`mode-preview mode-${m.color}`}><span>{m.icon}</span><b>{m.name}</b></div>)}</div></section>
    </div>}
    {tab==='table'&&<><p className="style-caption">COLOR CLASH / SHARED TABLESCENE / HAND / SEATS / HUD</p><TableScene gameId="uno" category="card" title="Color Clash" state={sample} actions={[]} active="p1" mode="bot" locale={locale} playerName="PLAYER ONE" onAction={()=>undefined}/></>}
    {tab==='fusion'&&<><p className="style-caption">FUSION LAB / VISUAL PROTOTYPE</p><FusionVisualPreview locale={locale}/></>}
  </main>;
}
