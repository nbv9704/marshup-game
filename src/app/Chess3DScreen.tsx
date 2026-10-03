import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveDocument, SavedMatch } from '../contracts/persistence';
import type { ChessMove } from '../games/chess/rules';
import { descriptor } from '../games/chess/descriptor';
import { ChessRoom3D } from '../graphics/ChessRoom3D';
import { ChessLanHostSession, type ChessLanView } from '../lan/chess-session';
import type { DiscoveredLanRoom } from '../lan/discovery';

type Mode = 'setup' | 'solo' | 'host' | 'guest';
type Adapter = { name: string; address: string; netmask: string; broadcast: string };
interface Props {
  doc: SaveDocument;
  update: (fn: (current: SaveDocument) => SaveDocument) => void;
  onLibrary: () => void;
  onHome: () => void;
}
const describe = (error: unknown) => error instanceof Error ? error.message : String(error);

/** Shared 3D Chess presentation; the local session or Electron-main host owns the rules. */
export function Chess3DScreen({ doc, update, onLibrary, onHome }: Props) {
  const bridge = window.arena;
  const playerName = doc.profile.displayName, difficulty = doc.settings.botDifficulty;
  const reducedMotion = doc.settings.accessibility.reducedMotion;
  const savedSolo = doc.savedMatches.find(match => match.gameId === 'chess-3d-solo');
  const solo = useRef<ChessLanHostSession | null>(null);
  const soloAwarded = useRef(false);
  const [mode, setMode] = useState<Mode>('setup');
  const [view, setView] = useState<ChessLanView | null>(null);
  const [adapters, setAdapters] = useState<readonly Adapter[]>([]);
  const [adapter, setAdapter] = useState('');
  const [roomName, setRoomName] = useState(`${playerName.slice(0, 18)}'s Chess`);
  const [port, setPort] = useState('47831');
  const [address, setAddress] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [rooms, setRooms] = useState<readonly DiscoveredLanRoom[]>([]);
  const [guestConnected, setGuestConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const persistSolo = useCallback((session: ChessLanHostSession) => {
    const state = session.snapshotForLocalSave();
    const completed = session.view().state.phase === 'completed';
    const award = completed && !soloAwarded.current;
    if (award) soloAwarded.current = true;
    const saved: SavedMatch = {
      id: session.roomEpoch, gameId: 'chess-3d-solo', fusionRecipeId: null,
      gameRulesetVersion: descriptor.rulesetVersion, fusionRecipeVersion: null,
      rngSnapshot: { seed: session.roomEpoch }, snapshot: { state, awarded: soloAwarded.current },
      commandSequence: session.view().revision, updatedAt: new Date().toISOString()
    };
    update(current => {
      const xp = current.profile.xp + (award ? 40 : 0);
      return { ...current,
        profile: award ? { ...current.profile, xp, level: Math.floor(xp / 150) + 1,
          virtualChips: current.profile.virtualChips + 15 } : current.profile,
        history: award ? [{ gameId: 'chess-3d-solo', result: session.view().state.winner,
          mode: 'bot', date: new Date().toISOString() }, ...current.history].slice(0, 200) : current.history,
        savedMatches: [...current.savedMatches.filter(match => match.gameId !== 'chess-3d-solo'), saved].slice(-4)
      };
    });
  }, [update]);

  useEffect(() => {
    if (!bridge) return;
    let live = true;
    const offHost = bridge.onLanHostView(next => { if (live && modeRef.current === 'host') setView(next); });
    const offGuest = bridge.onLanGuestView(next => { if (live && modeRef.current === 'guest') setView(next); });
    const offClosed = bridge.onLanGuestClosed(message => {
      if (live && modeRef.current === 'guest') {
        setGuestConnected(false);
        setNotice(`Mất kết nối: ${message}. Ghế được giữ tối đa 90 giây; thử kết nối lại.`);
      }
    });
    void bridge.lanListAdapters().then(values => {
      if (live) { setAdapters(values); setAdapter(values[0]?.address ?? ''); }
    }).catch(error => { if (live) setNotice(describe(error)); });
    return () => {
      live = false;
      offHost(); offGuest(); offClosed();
      void bridge.lanStopBrowsing().catch(() => undefined);
      void bridge.lanLeaveGuest().catch(() => undefined);
      void bridge.lanStopHost().catch(() => undefined);
    };
  }, [bridge]);

  useEffect(() => {
    if (!bridge || mode !== 'setup') return;
    let live = true;
    void bridge.lanStartBrowsing().catch(() => {
      if (live) setNotice('Không tìm thấy phòng tự động. Vẫn có thể nhập IP của bạn bè.');
    });
    const timer = setInterval(() => {
      void bridge.lanDiscoveredRooms().then(values => { if (live) setRooms(values); }).catch(() => undefined);
    }, 1_200);
    return () => { live = false; clearInterval(timer); void bridge.lanStopBrowsing().catch(() => undefined); };
  }, [bridge, mode]);

  useEffect(() => {
    if (!view || busy || view.state.phase !== 'playing' || view.state.activePlayer !== 'p2' ||
      view.guest !== 'bot' || (mode !== 'solo' && mode !== 'host')) return;
    const timer = setTimeout(() => {
      if (mode === 'solo') {
        const result = solo.current?.botTurn(difficulty);
        if (result?.ok) { setView(solo.current!.view()); persistSolo(solo.current!); }
        else if (result) setNotice(result.error);
      } else if (bridge) {
        void bridge.lanHostBotTurn(difficulty).then(result => {
          if (!result.ok) setNotice(result.error);
        }).catch(error => setNotice(describe(error)));
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [view, busy, mode, difficulty, bridge, persistSolo]);

  const startSolo = () => {
    const session = new ChessLanHostSession();
    solo.current = session;
    soloAwarded.current = false;
    persistSolo(session);
    setView(session.view());
    setMode('solo');
    setNotice('');
  };
  const resumeSolo = () => {
    if (!savedSolo || savedSolo.gameRulesetVersion !== descriptor.rulesetVersion) {
      setNotice('Bản lưu không tương thích với luật cờ hiện tại.'); return;
    }
    try {
      const session = ChessLanHostSession.restoreLocalSave(savedSolo.snapshot['state']);
      solo.current = session;
      soloAwarded.current = savedSolo.snapshot['awarded'] === true;
      setView(session.view()); setMode('solo'); setNotice('Đã khôi phục ván cờ solo.');
    } catch (error) { setNotice(`Không đọc được bản lưu: ${describe(error)}`); }
  };
  const startHost = async () => {
    if (!bridge || !adapter) return;
    setBusy(true); setNotice('');
    try {
      const bound = await bridge.lanStartHost({ adapterAddress: adapter, port: Number(port), roomName });
      setEndpoint(`${bound.address}:${bound.port}`);
      setView(await bridge.lanHostView());
      setMode('host');
      if (!bound.discoveryAvailable) setNotice('Discovery không sẵn. Gửi IP:port ở trên cho bạn bè để tham gia.');
    } catch (error) { setNotice(describe(error)); }
    finally { setBusy(false); }
  };
  const join = async (ip: string, remotePort: number) => {
    if (!bridge) return;
    setBusy(true); setNotice('');
    try {
      const next = await bridge.lanJoinDirect({ address: ip, port: remotePort });
      setEndpoint(`${ip}:${remotePort}`);
      setView(next);
      setGuestConnected(true);
      setMode('guest');
    } catch (error) { setNotice(describe(error)); }
    finally { setBusy(false); }
  };
  const joinTyped = () => {
    const match = /^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/.exec(address.trim());
    if (!match) { setNotice('Nhập IPv4:port, ví dụ 192.168.1.24:47831.'); return; }
    void join(match[1]!, Number(match[2]));
  };
  const leaveRoom = useCallback(async () => {
    if (mode === 'host') await bridge?.lanStopHost();
    if (mode === 'guest') await bridge?.lanLeaveGuest();
    solo.current = null;
    setMode('setup'); setView(null); setEndpoint(''); setGuestConnected(false);
  }, [mode, bridge]);
  const navigate = async (target: 'home' | 'library') => {
    if (mode !== 'solo' && view?.state.phase === 'playing' &&
      !window.confirm('Rời phòng ngay? Đối thủ sẽ mất kết nối hoặc ghế sẽ chuyển lại cho bot.')) return;
    try { await leaveRoom(); target === 'home' ? onHome() : onLibrary(); }
    catch (error) { setNotice(describe(error)); }
  };
  const move = async (action: ChessMove) => {
    if (!view || busy) return;
    setBusy(true); setNotice('');
    const intent = { requestId: crypto.randomUUID(), baseRevision: view.revision, ...action };
    try {
      const result = mode === 'solo' ? solo.current!.submit(solo.current!.hostToken, intent)
        : mode === 'host' ? await bridge!.lanHostMove(intent) : await bridge!.lanGuestMove(intent);
      if (!result.ok) setNotice(`Nước đi không hợp lệ: ${result.error}`);
      if (mode === 'solo') {
        setView(solo.current!.view());
        if (result.ok) persistSolo(solo.current!);
      }
    } catch (error) { setNotice(describe(error)); }
    finally { setBusy(false); }
  };
  const rejoin = async () => {
    if (!bridge) return;
    setBusy(true);
    try { setView(await bridge.lanRejoin()); setGuestConnected(true); setNotice('Đã kết nối lại và đồng bộ bàn cờ.'); }
    catch (error) { setNotice(describe(error)); }
    finally { setBusy(false); }
  };
  const result = view?.state.phase === 'completed' ? view.state.winner === 'draw' ? 'HÒA'
    : view.state.winner === (mode === 'guest' ? 'p2' : 'p1') ? 'CHIẾN THẮNG' : 'THẤT BẠI' : null;

  return <main className="page chess3d-room">
    <div className="section-heading"><div><span className="eyebrow">BOARD HALL / CHESS 3D</span><h1>CỜ VUA 3D</h1>
      <p>Chơi một mình với bot hoặc mở phòng LAN. Luật cờ do cùng một bộ kiểm tra xác nhận.</p></div>
      <button className="button ghost" onClick={() => void navigate('library')}>← CHỌN GAME</button></div>
    {mode === 'setup' ? <div className="chess3d-setup">
      <section className="panel"><h2>Chơi một mình</h2><p>Vào phòng 3D ngay. Bot tự đi ở ghế còn lại; ván được lưu trên máy.</p>
        {savedSolo?.snapshot['state'] && <button className="button outline" onClick={resumeSolo}>TIẾP TỤC VÁN ĐÃ LƯU</button>}
        <button className="button primary" onClick={startSolo}>VÁN MỚI VỚI BOT</button></section>
      <section className="panel"><h2>Open to LAN · BETA</h2><p>Chọn đúng mạng Wi-Fi, Ethernet hoặc Radmin. Chỉ mở cổng khi bạn bấm nút; chưa kiểm thử trên hai máy.</p>
        <label>Địa chỉ mạng<select value={adapter} onChange={event => setAdapter(event.target.value)}>{adapters.map(item =>
          <option key={`${item.name}:${item.address}`} value={item.address}>{item.name} · {item.address}</option>)}</select></label>
        <label>Tên phòng<input maxLength={32} value={roomName} onChange={event => setRoomName(event.target.value)} /></label>
        <label>Cổng TCP<input inputMode="numeric" value={port} onChange={event => setPort(event.target.value)} /></label>
        <button className="button primary" disabled={!bridge || !adapter || busy} onClick={() => void startHost()}>MỞ PHÒNG LAN</button></section>
      <section className="panel"><h2>Join LAN · BETA</h2><p>Chọn phòng tìm thấy hoặc nhập IP:port của chủ phòng. Chỉ chơi trên mạng tin cậy.</p>
        <div className="lan-room-list">{rooms.map(room => <button className="button outline" key={`${room.roomEpoch}:${room.address}`}
          disabled={busy || room.humanSeats >= room.maxSeats} onClick={() => void join(room.address, room.port)}>
          {room.roomName} · {room.address}:{room.port}</button>)}</div>
        <label>IPv4:port<input value={address} placeholder="192.168.1.24:47831" onChange={event => setAddress(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') joinTyped(); }}/></label>
        <button className="button primary" disabled={!bridge || busy} onClick={joinTyped}>THAM GIA</button></section>
    </div> : view && <><div className="panel chess3d-room-bar"><span><b>{mode === 'solo' ? 'SOLO' : mode === 'host' ? 'HOST' : 'GUEST'}</b> · {mode === 'solo' ? 'Bot' : endpoint}
      <small> · {view.guest === 'connected' ? '2 người' : view.guest === 'disconnected' ? 'Khách mất kết nối — giữ ghế 90 giây' : 'Ghế bot'}</small></span>
      <div className="button-row">{mode === 'guest' && !guestConnected && <button className="button primary" disabled={busy} onClick={() => void rejoin()}>KẾT NỐI LẠI</button>}
        <button className="button outline" onClick={() => void leaveRoom()}>RỜI PHÒNG</button></div></div>
      <ChessRoom3D view={view} seat={mode === 'guest' ? 'p2' : 'p1'} canMove={!busy && (mode !== 'guest' || guestConnected)}
        reducedMotion={reducedMotion} onMove={action => void move(action)}/>
      {result && <div className="chess3d-result"><div className="panel" role="dialog" aria-modal="true"><span className="eyebrow">MATCH RESULT</span><h2>{result}</h2>
        <p>{view.state.resultReason ?? 'Ván cờ kết thúc.'}</p><div className="button-row">
          {mode === 'solo' && <button className="button primary" onClick={startSolo}>CHƠI LẠI</button>}
          <button className="button outline" onClick={() => void navigate('library')}>CHỌN GAME</button>
          <button className="button outline" onClick={() => void navigate('home')}>VỀ HOME</button></div></div></div>}
    </>}
    {notice && <div className="toast error" role="status">{notice}</div>}
  </main>;
}
