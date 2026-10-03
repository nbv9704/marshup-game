import { useState, type ReactNode } from 'react';
import type { GameAction, Json, JsonObject, Locale, PlayerId } from '../contracts/types';
import { PlayerSeat, PartyBadge } from './PartyUi';

type Category = 'card'|'board'|'casino';
interface Props {
  gameId:string;
  category:Category;
  title:string;
  state:JsonObject;
  actions:readonly GameAction[];
  active:PlayerId|null;
  mode:'bot'|'hotseat'|'practice';
  locale:Locale;
  playerName:string;
  onAction:(action:GameAction)=>void;
  children?:ReactNode;
}
type R = Record<string,Json>;
const object=(value:Json|undefined):R => value && typeof value==='object' && !Array.isArray(value) ? value as R : {};
const list=(value:Json|undefined):readonly Json[] => Array.isArray(value)?value:[];
const word=(value:Json|undefined):string => typeof value==='string'?value:'';
const number=(value:Json|undefined):number => typeof value==='number'?value:0;
const SYMBOLS:Record<string,string>={skip:'⊘',reverse:'⇄','draw-two':'+2',wild:'✦','wild-draw-four':'+4',cherry:'🍒',lemon:'✦',bell:'🔔',diamond:'◆',seven:'7'};
const PIECES:Record<string,string>={
  'white-king':'♔','white-queen':'♕','white-rook':'♖','white-bishop':'♗','white-knight':'♘','white-pawn':'♙',
  'black-king':'♚','black-queen':'♛','black-rook':'♜','black-bishop':'♝','black-knight':'♞','black-pawn':'♟'
};
const XIANGQI:Record<string,string>={general:'將',advisor:'士',elephant:'象',horse:'馬',rook:'車',cannon:'炮',soldier:'卒'};
const SUITS:Record<string,string>={hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'};
const COLORS=['red','yellow','green','blue'] as const;
const COLOR_SHAPES:Record<string,string>={red:'◆',yellow:'☀',green:'●',blue:'▲',wild:'✦'};

function ColorCard({card,onClick,playable=false,small=false}:{card:R;onClick?:()=>void;playable?:boolean;small?:boolean}) {
  const color=word(card['color'])||'wild';
  const rank=word(card['rank']);
  return <button type="button" className={`party-color-card card-${color} ${small?'small':''} ${playable?'playable':''}`} onClick={onClick} disabled={!onClick} aria-label={`${color} ${rank}`}>
    <span className="card-corner">{SYMBOLS[rank]??rank}</span><span className="card-mark">{SYMBOLS[rank]??rank}</span><span className="card-color-symbol" aria-hidden="true">{COLOR_SHAPES[color]}</span><span className="card-corner bottom">{SYMBOLS[rank]??rank}</span>
  </button>;
}

function PlayingCard({card,hidden=false}:{card?:R;hidden?:boolean}) {
  if(hidden)return <span className="playing-card is-back">✦</span>;
  const suit=word(card?.['suit']);
  return <span className={`playing-card suit-${suit}`}><b>{word(card?.['rank'])}</b><strong>{SUITS[suit]??'◆'}</strong><small>{word(card?.['rank'])}</small></span>;
}

function ColorCenter({state,actions,onAction,viewer,opponent}:{state:JsonObject;actions:readonly GameAction[];onAction:(a:GameAction)=>void;viewer:PlayerId;opponent:PlayerId}) {
  const [wildChoice,setWildChoice]=useState<string|null>(null);
  const top=object(list(state['discardPile']).at(-1));
  const hand=list(object(state['hands'])[viewer]).map(object);
  const activeColor=word(state['activeColor']);
  const play=(cardId:string)=>{
    const options=actions.filter(a=>a.type==='play'&&a.payload['cardId']===cardId);
    if(options.length===1)onAction(options[0]!);
    else if(options.length>1)setWildChoice(cardId);
  };
  return <div className="color-game">
    <div className="opponent-fan" aria-label="Opponent face-down cards">{Array.from({length:Math.min(6,list(object(state['hands'])[opponent]).length)},(_,i)=><PlayingCard key={i} hidden/>)}</div>
    <div className={`color-wheel wheel-${activeColor}`} aria-label={`Active color ${activeColor}`}><span>{SYMBOLS[word(top['rank'])]??word(top['rank'])}</span><small>{activeColor.toUpperCase()}</small></div>
    <div className="table-decks"><button className="card-deck" disabled={!actions.some(a=>a.type==='draw')} onClick={()=>{const a=actions.find(x=>x.type==='draw');if(a)onAction(a);}} aria-label="Draw one card"><span>✦</span><small>{list(state['drawPile']).length}</small></button><div className="discard-pile"><ColorCard card={top} small/></div></div>
    <div className="direction-arrow" aria-label={number(state['direction'])===-1?'Counterclockwise':'Clockwise'}>{number(state['direction'])===-1?'↶':'↷'}</div>
    <div className="local-hand" aria-label="Your hand">{hand.map((card,i)=><ColorCard key={word(card['id'])||i} card={card} playable={actions.some(a=>a.type==='play'&&a.payload['cardId']===card['id'])} onClick={actions.some(a=>a.type==='play'&&a.payload['cardId']===card['id'])?()=>play(word(card['id'])):undefined}/>)}</div>
    {wildChoice&&<div className="color-choice" role="dialog" aria-label="Choose a color"><strong>CHOOSE COLOR</strong><div>{COLORS.map(color=><button key={color} className={`color-choice-${color}`} aria-label={color} onClick={()=>{const a=actions.find(a=>a.type==='play'&&a.payload['cardId']===wildChoice&&a.payload['chosenColor']===color);if(a)onAction(a);setWildChoice(null);}}/>)}</div><button className="button ghost" onClick={()=>setWildChoice(null)}>×</button></div>}
  </div>;
}

function ChessCenter({state,actions,onAction}:{state:JsonObject;actions:readonly GameAction[];onAction:(a:GameAction)=>void}) {
  const [selected,setSelected]=useState<number|null>(null);
  const board=list(state['board']);
  const targets=actions.filter(a=>a.type==='move'&&a.payload['from']===selected).map(a=>number(a.payload['to']));
  const click=(index:number)=>{
    if(selected!==null){const action=actions.find(a=>a.type==='move'&&a.payload['from']===selected&&a.payload['to']===index&&(!a.payload['promotion']||a.payload['promotion']==='queen'));
      if(action){onAction(action);setSelected(null);return;}}
    if(actions.some(a=>a.type==='move'&&a.payload['from']===index))setSelected(index);else setSelected(null);
  };
  return <div className="party-chess-board" role="grid" aria-label="Chess board">{Array.from({length:64},(_,visual)=>{const row=Math.floor(visual/8),col=visual%8,index=(7-row)*8+col,piece=object(board[index]);
    const token=PIECES[`${word(piece['color'])}-${word(piece['kind'])}`]??'';
    return <button key={index} role="gridcell" className={`chess-square ${(row+col)%2?'dark':'light'} ${selected===index?'selected':''} ${targets.includes(index)?'target':''}`} onClick={()=>click(index)} aria-label={`${'abcdefgh'[col]}${8-row} ${word(piece['color'])} ${word(piece['kind'])}`}><span className={`chess-piece ${word(piece['color'])}`}>{token}</span></button>;})}</div>;
}

function XiangqiCenter({state,actions,onAction}:{state:JsonObject;actions:readonly GameAction[];onAction:(a:GameAction)=>void}) {
  const [selected,setSelected]=useState<string|null>(null);
  const pieces=list(state['pieces']).map(object);
  const targets=actions.filter(a=>a.type==='move'&&a.payload['pieceId']===selected);
  const grid=Array.from({length:90},(_,index)=>{const x=index%9,y=Math.floor(index/9),piece=pieces.find(p=>p['x']===x&&p['y']===y);
    return <button key={index} role="gridcell" className={`xiangqi-point ${(y===4||y===5)?'river-edge':''} ${piece?.['id']===selected?'selected':''} ${targets.some(a=>a.payload['toX']===x&&a.payload['toY']===y)?'target':''}`} onClick={()=>{
      const move=targets.find(a=>a.payload['toX']===x&&a.payload['toY']===y);if(move){onAction(move);setSelected(null);return;}
      if(piece&&actions.some(a=>a.payload['pieceId']===piece['id']))setSelected(word(piece['id']));else setSelected(null);
    }} aria-label={`${x},${y} ${word(piece?.['type'])}`}><span className={`xiangqi-piece ${piece?.['player']==='p1'?'red-side':'blue-side'}`}>{piece?XIANGQI[word(piece['type'])]??'?':''}</span></button>});
  return <div className="xiangqi-board" role="grid" aria-label="Xiangqi board">{grid}<span className="river-name">楚 河　　漢 界</span></div>;
}

function LudoCenter({state,actions,onAction}:{state:JsonObject;actions:readonly GameAction[];onAction:(a:GameAction)=>void}) {
  const players=list(state['players']).map(object);
  return <div className="ludo-scene"><div className="ludo-track">{Array.from({length:32},(_,i)=><span key={i} className={`track-dot dot-${i%4}`} style={{transform:`rotate(${i*11.25}deg) translateY(-155px)`}}/>)}</div><div className="ludo-core"><span>🎲</span><b>{state['pendingRoll']===null?'ROLL':String(state['pendingRoll'])}</b><small>{number(state['turnNumber'])} / 2000</small></div><div className="ludo-pawns">{players.map((player,index)=><div key={word(player['id'])} className={`ludo-player pawn-${index}`}><strong>{word(player['id']).toUpperCase()}</strong>{list(player['pawns']).map((progress,pawn)=><button key={pawn} className="ludo-pawn" disabled={!actions.some(a=>a.type==='move'&&a.payload['pawn']===pawn)} onClick={()=>{const a=actions.find(a=>a.type==='move'&&a.payload['pawn']===pawn);if(a)onAction(a);}} title={`Pawn ${pawn+1}: ${progress}`}><span>♟</span><small>{number(progress)<0?'YARD':number(progress)===57?'HOME':String(progress)}</small></button>)}</div>)}</div></div>;
}

function BlackjackCenter({state}:{state:JsonObject}) {
  const dealer=list(state['dealer']).map(object),hands=list(state['hands']).map(object),showDealer=state['phase']==='completed';
  return <div className="blackjack-scene"><div className="dealer-hand"><PartyBadge tone="gold">DEALER</PartyBadge><div className="playing-fan">{dealer.map((card,i)=><PlayingCard key={i} card={card} hidden={!showDealer&&i>0}/>)}</div></div><div className="blackjack-middle">21 <small>BLACKJACK</small></div><div className="blackjack-hands">{hands.map((hand,i)=><div key={i} className={`blackjack-hand ${i===number(state['activeHand'])?'current':''}`}><div className="playing-fan">{list(hand['cards']).map((card,j)=><PlayingCard key={j} card={object(card)}/>)}</div><span>◈ {number(hand['wager'])} {word(hand['result'])}</span></div>)}</div></div>;
}

function SlotsCenter({state}:{state:JsonObject}) {
  const reels=list(state['reels']);
  return <div className="slots-scene"><div className="slots-header">✦ NEON REELS ✦</div><div className="slots-reels">{reels.map((reel,i)=><div className="slot-reel" key={i}><span>{SYMBOLS[word(reel)]??String(reel)}</span><small>{word(reel).toUpperCase()}</small></div>)}</div><div className="slots-readout"><span>CREDITS <b>{number(state['credits'])}</b></span><span>WIN <b>+{number(state['lastWin'])}</b></span><span>SPINS <b>{number(state['spins'])}/20</b></span></div></div>;
}

export function TableScene({gameId,category,title,state,actions,active,mode,locale,playerName,onAction,children}:Props) {
  const solo=gameId==='blackjack'||gameId==='slots';
  const viewer:PlayerId=mode==='hotseat'&&active?active:'p1';
  const opponent:PlayerId=viewer==='p1'?'p2':'p1';
  const cardCount=(id:PlayerId)=>list(object(state['hands'])[id]).length;
  const stat=(id:PlayerId)=>gameId==='uno'?cardCount(id):gameId==='blackjack'?number(state['balance']):gameId==='slots'?number(state['credits']):gameId==='ludo'?list(object(list(state['players']).find(p=>object(p)['id']===id))['pawns']).filter(p=>p===57).length:undefined;
  const opponentName=mode==='bot'?'BOT BUDDY':'PLAYER 2';
  return <section className={`table-scene theme-${category}`} aria-label={`${title} table`}>
    <div className="table-rays"/><div className="table-bokeh"/><div className="table-rim"><div className="table-felt"/></div>
    <div className="table-hud"><PartyBadge tone="gold">{title.toUpperCase()}</PartyBadge><span className="turn-badge">{active?(active===viewer?(locale==='vi'?'LƯỢT CỦA BẠN':'YOUR TURN'):(locale==='vi'?'LƯỢT ĐỐI THỦ':'OPPONENT TURN')):(locale==='vi'?'KẾT THÚC':'FINISHED')}</span></div>
    {!solo&&<PlayerSeat name={opponent==='p1'?playerName:opponentName} avatarId={opponent==='p1'?'comet':'crown'} stat={stat(opponent)} active={active===opponent} side="top" label={mode==='bot'?'BOT':'LOCAL'}/>}
    <div className="table-center">
      {children??(gameId==='uno'?<ColorCenter state={state} actions={actions} onAction={onAction} viewer={viewer} opponent={opponent}/>:
       gameId==='chess'?<ChessCenter state={state} actions={actions} onAction={onAction}/>:
       gameId==='xiangqi'?<XiangqiCenter state={state} actions={actions} onAction={onAction}/>:
       gameId==='ludo'?<LudoCenter state={state} actions={actions} onAction={onAction}/>:
       gameId==='blackjack'?<BlackjackCenter state={state}/>:
       gameId==='slots'?<SlotsCenter state={state}/>:<div className="table-placeholder">✦</div>)}
    </div>
    <PlayerSeat name={viewer==='p1'?playerName:opponentName} avatarId={viewer==='p1'?'comet':'crown'} stat={stat(viewer)} active={active===viewer} side="bottom" label={viewer==='p1'?'LOCAL':'HOTSEAT'}/>
  </section>;
}
