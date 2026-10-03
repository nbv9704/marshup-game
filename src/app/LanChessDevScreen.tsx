import { useEffect, useMemo, useState } from 'react';
import { legalMoves, type ChessMove, type ChessPiece, type ChessState } from '../games/chess/rules';
import type { ChessLanView } from '../lan/chess-session';
import type { DiscoveredLanRoom } from '../lan/discovery';

type Adapter = { name:string; address:string; netmask:string; broadcast:string };
type Mode = 'choose' | 'host' | 'guest';
const PIECE: Record<string,string> = {
  'white-king':'♔','white-queen':'♕','white-rook':'♖','white-bishop':'♗','white-knight':'♘','white-pawn':'♙',
  'black-king':'♚','black-queen':'♛','black-rook':'♜','black-bishop':'♝','black-knight':'♞','black-pawn':'♟'
};
const describeError = (error: unknown): string => error instanceof Error ? error.message : String(error);

export function LanChessDevScreen({onBack}:{onBack:()=>void}) {
  const [mode,setMode]=useState<Mode>('choose');
  const [adapters,setAdapters]=useState<readonly Adapter[]>([]);
  const [adapter,setAdapter]=useState('');
  const [roomName,setRoomName]=useState('Bàn cờ bạn bè');
  const [port,setPort]=useState('47831');
  const [address,setAddress]=useState('');
  const [endpoint,setEndpoint]=useState('');
  const [rooms,setRooms]=useState<readonly DiscoveredLanRoom[]>([]);
  const [view,setView]=useState<ChessLanView|null>(null);
  const [connected,setConnected]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const arena=window.arena;

  useEffect(()=>{
    if(!arena)return;
    let live=true;
    const offHost=arena.onLanHostView(value=>{if(live)setView(value);});
    const offGuest=arena.onLanGuestView(value=>{if(live)setView(value);});
    const offClosed=arena.onLanGuestClosed(message=>{if(live){setConnected(false);setNotice(`Mất kết nối: ${message}. Có thể thử kết nối lại trong 90 giây.`);}});
    void arena.lanListAdapters().then(values=>{if(live){setAdapters(values);setAdapter(values[0]?.address??'127.0.0.1');}}).catch(error=>setNotice(describeError(error)));
    return()=>{
      live=false;offHost();offGuest();offClosed();
      void arena.lanStopBrowsing().catch(()=>undefined);
      void arena.lanLeaveGuest().catch(()=>undefined);
      void arena.lanStopHost().catch(()=>undefined);
    };
  },[arena]);

  useEffect(()=>{
    if(!arena||mode!=='choose')return;
    let live=true;
    void arena.lanStartBrowsing().catch(error=>{if(live)setNotice(`Không tìm được phòng tự động: ${describeError(error)}. Vẫn có thể nhập IP.`);});
    const timer=setInterval(()=>{void arena.lanDiscoveredRooms().then(items=>{if(live)setRooms(items);}).catch(()=>undefined);},1_000);
    return()=>{live=false;clearInterval(timer);void arena.lanStopBrowsing().catch(()=>undefined);};
  },[arena,mode]);

  useEffect(()=>{setSelected(null);},[view?.revision]);

  useEffect(()=>{
    if(!arena||mode!=='host'||busy||view?.guest!=='bot'||view.state.phase!=='playing'||view.state.activePlayer!=='p2')return;
    const timer=setTimeout(()=>{
      void arena.lanHostBotTurn('normal').then(result=>{if(!result.ok)setNotice(`Bot: ${result.error}`);}).catch(error=>setNotice(describeError(error)));
    },450);
    return()=>clearTimeout(timer);
  },[arena,mode,busy,view]);

  const ownSeat=mode==='host'?'p1':'p2';
  const legal=useMemo<readonly ChessMove[]>(()=>{
    if(!view||view.state.activePlayer!==ownSeat)return[];
    // Repetition bookkeeping is host-only; legalMoves does not use it for move generation.
    return legalMoves({...view.state,positionCounts:{}} as ChessState);
  },[view,ownSeat]);
  const targets=selected===null?[]:legal.filter(item=>item.from===selected).map(item=>item.to);

  const host=async()=>{
    if(!arena)return;
    setBusy(true);setNotice('');
    try {
      const result=await arena.lanStartHost({adapterAddress:adapter,port:Number(port),roomName});
      setEndpoint(`${result.address}:${result.port}`);
      setNotice(result.discoveryAvailable?'Phòng đang quảng bá trên LAN.':'Phòng đã mở; discovery không sẵn, bạn bè hãy nhập IP thủ công.');
      setView(await arena.lanHostView());setMode('host');
    } catch(error) {setNotice(describeError(error));}
    finally {setBusy(false);}
  };
  const join=async(hostAddress:string,hostPort:number)=>{
    if(!arena)return;
    setBusy(true);setNotice('');
    try {setView(await arena.lanJoinDirect({address:hostAddress,port:hostPort}));setConnected(true);setEndpoint(`${hostAddress}:${hostPort}`);setMode('guest');}
    catch(error){setNotice(describeError(error));}
    finally {setBusy(false);}
  };
  const joinTyped=()=>{
    const match=/^(.+):(\d{1,5})$/.exec(address.trim());
    if(!match){setNotice('Nhập địa chỉ dạng IP:port, ví dụ 192.168.1.24:47831.');return;}
    void join(match[1]!,Number(match[2]));
  };
  const play=async(move:ChessMove)=>{
    if(!arena||!view)return;
    setBusy(true);setNotice('');
    const intent={requestId:crypto.randomUUID(),baseRevision:view.revision,...move};
    try {
      const result=mode==='host'?await arena.lanHostMove(intent):await arena.lanGuestMove(intent);
      if(!result.ok)setNotice(`Nước đi bị từ chối: ${result.error}.`);
    } catch(error){setNotice(describeError(error));}
    finally {setSelected(null);setBusy(false);}
  };
  const clickSquare=(square:number)=>{
    if(busy)return;
    if(selected!==null){
      const move=legal.find(item=>item.from===selected&&item.to===square&&(!item.promotion||item.promotion==='queen'));
      if(move){void play(move);return;}
    }
    setSelected(legal.some(item=>item.from===square)?square:null);
  };
  const leave=async()=>{
    if(!arena)return;
    setBusy(true);
    try {if(mode==='host')await arena.lanStopHost();else await arena.lanLeaveGuest();setMode('choose');setConnected(false);setView(null);setEndpoint('');setNotice('Đã rời phòng.');}
    catch(error){setNotice(describeError(error));}
    finally{setBusy(false);}
  };

  if(!arena)return <main className="page narrow-page"><h1>LAN LAB · DEV</h1><p>Mở bằng Electron dev build để kiểm tra LAN; trình duyệt web không có quyền mở socket.</p><button className="button outline" onClick={onBack}>← Home</button></main>;
  return <main className="page match-page party-match lan-lab">
    <div className="section-heading"><div><span className="eyebrow">CHỈ BẢN PHÁT TRIỂN · CHƯA PHẢI PHÒNG 3D</span><h1>LAN CHESS LAB</h1><p>Đường truyền thật, bàn cờ 2D dùng để kiểm chứng. Không xuất hiện trong EXE phát hành.</p></div><button className="button ghost" onClick={onBack}>← HOME</button></div>
    {mode==='choose'?<div className="lan-lab-grid">
      <section className="panel lan-lab-panel"><h2>Mở phòng</h2><p>Chọn đúng adapter của Wi-Fi/Ethernet/Radmin. Windows Firewall có thể cần cho phép kết nối mạng riêng.</p>
        <label>Adapter<select value={adapter} onChange={event=>setAdapter(event.target.value)}>{adapters.map(item=><option key={`${item.name}:${item.address}`} value={item.address}>{item.name} · {item.address}</option>)}<option value="127.0.0.1">Loopback · 127.0.0.1 (test)</option></select></label>
        <label>Tên phòng<input maxLength={32} value={roomName} onChange={event=>setRoomName(event.target.value)}/></label>
        <label>Cổng TCP<input inputMode="numeric" value={port} onChange={event=>setPort(event.target.value)}/></label>
        <button className="button primary" disabled={busy} onClick={()=>void host()}>OPEN TO LAN</button></section>
      <section className="panel lan-lab-panel"><h2>Join LAN</h2><p>Phòng tìm được chỉ là gợi ý; luôn có thể nhập IP của host, đặc biệt khi VPN không chuyển broadcast.</p>
        <div className="lan-room-list">{rooms.length?rooms.map(item=><button className="button outline" key={`${item.roomEpoch}:${item.address}`} disabled={busy||item.humanSeats>=item.maxSeats} onClick={()=>void join(item.address,item.port)}>{item.roomName} · {item.address}:{item.port} · {item.humanSeats}/{item.maxSeats}</button>):<p>Chưa thấy phòng nào. Hãy thử IP thủ công.</p>}</div>
        <label>IP:port<input value={address} placeholder="192.168.1.24:47831" onChange={event=>setAddress(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')joinTyped();}}/></label>
        <button className="button primary" disabled={busy} onClick={joinTyped}>KẾT NỐI</button></section>
    </div>:<><div className="lan-lab-status panel"><span><b>{mode==='host'?'HOST':'GUEST'}</b> · {endpoint} · revision {view?.revision??0}</span><span>{view?.guest==='connected'?'● Khách đã kết nối':view?.guest==='disconnected'?'◌ Khách rớt mạng · giữ ghế 90s':'◈ Ghế bot'}</span><button className="button ghost" onClick={()=>void leave()}>RỜI PHÒNG</button></div>
      {view&&<div className="lan-lab-game"><section className="panel"><h2>{view.state.phase==='completed'?'Kết quả: '+(view.state.winner??'hòa'):'Lượt: '+(view.state.activePlayer??'—')}</h2><div className="party-chess-board" role="grid" aria-label="Chess LAN development board">{Array.from({length:64},(_,visual)=>{
        const row=Math.floor(visual/8),col=visual%8,index=(7-row)*8+col,piece=view.state.board[index] as ChessPiece|null;
        return <button key={index} role="gridcell" className={`chess-square ${(row+col)%2?'dark':'light'} ${selected===index?'selected':''} ${targets.includes(index)?'target':''}`} disabled={busy||(mode==='guest'&&!connected)||view.state.activePlayer!==ownSeat} onClick={()=>clickSquare(index)} aria-label={`${'abcdefgh'[col]}${8-row} ${piece?.color??''} ${piece?.kind??''}`}><span className={`chess-piece ${piece?.color??''}`}>{piece?PIECE[`${piece.color}-${piece.kind}`]:''}</span></button>;
      })}</div></section><aside className="panel lan-lab-panel"><h2>Trạng thái phiên</h2><p>Luật và nước đi do host xác nhận. Nếu mất gói hoặc vừa kết nối lại, lấy snapshot mới.</p><button className="button outline" onClick={()=>void (mode==='host'?arena.lanHostView().then(setView):arena.lanRequestGuestSnapshot())}>ĐỒNG BỘ BÀN CỜ</button>
        {mode==='host'&&view.guest==='bot'&&<p className="small">Ghế thứ hai do bot điều khiển tự động; bạn bè có thể vào thay bot sau một nước đi.</p>}
        {mode==='guest'&&!connected&&<button className="button outline" disabled={busy} onClick={()=>void arena.lanRejoin().then(next=>{setView(next);setConnected(true);setNotice('Đã kết nối lại và đồng bộ bàn cờ.');}).catch(error=>setNotice(describeError(error)))}>THỬ REJOIN</button>}
        <p className="small">Mã phòng: {view.roomEpoch.slice(0,8)} · ruleset {view.rulesetVersion}</p></aside></div>}
    </>}
    {notice&&<div className="toast error" role="status">{notice}</div>}
  </main>;
}
