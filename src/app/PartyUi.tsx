import type { CSSProperties, ReactNode } from 'react';

export const MASCOTS = [
  {id:'comet',name:'Comet',body:'#ffbb47',light:'#ffe986',detail:'#e15a4e',ears:'round'},
  {id:'crown',name:'Crown',body:'#7bcaff',light:'#d7f5ff',detail:'#485fca',ears:'point'},
  {id:'spark',name:'Spark',body:'#b39bff',light:'#f0e8ff',detail:'#6a4bd2',ears:'zig'},
  {id:'heart',name:'Pip',body:'#ff91ad',light:'#ffe1e9',detail:'#e64370',ears:'round'},
  {id:'moon',name:'Mochi',body:'#b2e8bd',light:'#efffe7',detail:'#419e89',ears:'long'},
  {id:'diamond',name:'Gem',body:'#75dfe2',light:'#d9ffff',detail:'#4087c7',ears:'point'},
  {id:'bolt',name:'Bolt',body:'#ffad61',light:'#fff0ad',detail:'#e56240',ears:'zig'},
  {id:'starfish',name:'Nova',body:'#dd9eea',light:'#ffe5fa',detail:'#a94cba',ears:'long'}
] as const;

export type MascotId = typeof MASCOTS[number]['id'];

export function MascotAvatar({id='comet',size=64,className=''}:{id?:string;size?:number;className?:string}) {
  const mascot=MASCOTS.find(item=>item.id===id)??MASCOTS[0];
  const leftEar=mascot.ears==='round'?'M14 28 C0 21 5 5 18 10 L28 26':mascot.ears==='long'?'M15 29 C3 4 6 -2 17 5 L29 26':mascot.ears==='zig'?'M14 29 L5 8 L23 16 L29 27':'M13 29 L8 7 L31 24';
  const rightEar=mascot.ears==='round'?'M50 28 C64 21 59 5 46 10 L36 26':mascot.ears==='long'?'M49 29 C61 4 58 -2 47 5 L35 26':mascot.ears==='zig'?'M50 29 L59 8 L41 16 L35 27':'M51 29 L56 7 L33 24';
  return <svg className={`mascot-avatar ${className}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={mascot.name}>
    <defs><linearGradient id={`body-${mascot.id}`} x1="0" x2=".85" y1="0" y2="1"><stop stopColor={mascot.light}/><stop offset=".55" stopColor={mascot.body}/><stop offset="1" stopColor={mascot.detail}/></linearGradient></defs>
    <path d={leftEar} fill={mascot.body} stroke="#5c2b48" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d={rightEar} fill={mascot.body} stroke="#5c2b48" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M8 36 C8 18 20 14 32 14 C44 14 56 18 56 36 C56 51 45 58 32 58 C19 58 8 51 8 36Z" fill={`url(#body-${mascot.id})`} stroke="#5c2b48" strokeWidth="3"/>
    <ellipse cx="21" cy="27" rx="7" ry="3" fill="#fff" opacity=".48" transform="rotate(-28 21 27)"/>
    <ellipse cx="23" cy="37" rx="3.2" ry="4.4" fill="#302132"/><ellipse cx="41" cy="37" rx="3.2" ry="4.4" fill="#302132"/>
    <circle cx="24" cy="35.5" r="1.1" fill="white"/><circle cx="42" cy="35.5" r="1.1" fill="white"/>
    <path d="M28 45 Q32 49 36 45" fill="none" stroke="#5c2b48" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="16.8" cy="43" r="3.2" fill="#ff7d8b" opacity=".58"/><circle cx="47.2" cy="43" r="3.2" fill="#ff7d8b" opacity=".58"/>
    <path d="M25 19 Q32 14 39 19" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".5" strokeLinecap="round"/>
  </svg>;
}

export function PartyLogo({compact=false}:{compact?:boolean}) {
  return <span className={`party-logo ${compact?'compact':''}`} aria-label="Mashup Arena"><span className="party-logo-spark" aria-hidden="true">✦</span><span>MASHUP <b>ARENA</b></span></span>;
}

export function GlossyButton({children,kind='play',className='',...props}:{children:ReactNode;kind?:'play'|'special'|'danger'|'info'|'ghost';className?:string} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`glossy-button glossy-${kind} ${className}`}>{children}</button>;
}

export function PartyBadge({children,tone='blue'}:{children:ReactNode;tone?:'blue'|'gold'|'red'|'green'}) {
  return <span className={`party-badge badge-${tone}`}>{children}</span>;
}

export function PlayerSeat({name,avatarId,stat,active,side='top',label}:{name:string;avatarId?:string;stat?:string|number;active?:boolean;side?:'top'|'bottom'|'left'|'right';label?:string}) {
  return <div className={`player-seat seat-${side} ${active?'is-active':''}`} aria-label={`${name}${active?' — active':''}`}>
    <div className="seat-avatar"><MascotAvatar id={avatarId} size={62}/></div>
    <div className="seat-name"><span>{name}</span>{label&&<small>{label}</small>}</div>
    {stat!==undefined&&<span className="seat-stat">{stat}</span>}
  </div>;
}

export function PartyProgress({value,max,label}:{value:number;max:number;label?:string}) {
  const ratio=max>0?Math.max(0,Math.min(100,value/max*100)):0;
  return <div className="party-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
    <span style={{'--progress':`${ratio}%`} as CSSProperties}/>
  </div>;
}
