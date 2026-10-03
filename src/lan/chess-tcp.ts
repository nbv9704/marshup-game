import { createServer, type Server, type Socket } from 'node:net';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { descriptor } from '../games/chess/descriptor';
import { ChessLanHostSession, CHESS_LAN_GRACE_MS, type ChessLanIntent, type ChessLanResult, type ChessLanView } from './chess-session';

const PROTOCOL_MAJOR = 1;
const MAX_LINE_BYTES = 16 * 1024;
const MAX_MESSAGES_PER_SECOND = 40;

type WireResponse =
  | { type: 'hello.accept'; protocolMajor: number; token: string; view: ChessLanView }
  | { type: 'hello.reject'; error: string }
  | { type: 'game.result'; requestId: string | null; result: ChessLanResult }
  | { type: 'game.snapshot'; view: ChessLanView }
  | { type: 'room.closed' }
  | { type: 'pong' }
  | { type: 'protocol.error'; error: string };

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord => value !== null && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value: JsonRecord, allowed: readonly string[]): boolean => Object.keys(value).every(k => allowed.includes(k));
const send = (socket: Socket, message: WireResponse): void => {
  if (!socket.destroyed && socket.writable) socket.write(`${JSON.stringify(message)}\n`);
};

/** Addresses the host can explicitly select. Never bind 0.0.0.0 or an invented interface. */
export function bindableIpv4Addresses(): readonly { adapter: string; address: string; internal: boolean }[] {
  const found: { adapter: string; address: string; internal: boolean }[] = [];
  for (const [adapter, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && isIP(entry.address) === 4 && entry.address !== '0.0.0.0')
        found.push({ adapter, address: entry.address, internal: entry.internal });
    }
  }
  return found;
}

/** A single-room Chess LAN listener. The local host controls p1; one remote guest controls p2. */
export class ChessLanTcpServer {
  readonly session = new ChessLanHostSession();
  private server: Server | null = null;
  private guestSocket: Socket | null = null;
  private listening = false;
  private readonly viewListeners = new Set<(view: ChessLanView) => void>();

  onView(listener: (view: ChessLanView) => void): () => void {
    this.viewListeners.add(listener);
    return () => this.viewListeners.delete(listener);
  }

  async listen(bindAddress: string, port: number): Promise<{ address: string; port: number }> {
    if (this.server) throw new Error('LAN listener already started');
    if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new RangeError('Invalid LAN port');
    if (isIP(bindAddress) !== 4 || !bindableIpv4Addresses().some(a => a.address === bindAddress))
      throw new Error('Select an IPv4 address from a local network adapter');
    const server = createServer(socket => this.accept(socket));
    server.maxConnections = 4;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, bindAddress, () => { server.off('error', reject); resolve(); });
      });
      this.server = server;
      this.listening = true;
      server.on('error', () => {
        this.listening = false;
        this.guestSocket?.destroy();
      });
      const bound = server.address();
      if (!bound || typeof bound === 'string') throw new Error('Expected an IPv4 listener');
      return { address: bound.address, port: bound.port };
    } catch (cause) {
      server.close();
      throw cause;
    }
  }

  hostMove(intent: ChessLanIntent): ChessLanResult {
    const before = this.session.view().revision;
    const result = this.session.submit(this.session.hostToken, intent);
    if (result.ok && result.revision > before) this.broadcastSnapshot();
    return result;
  }

  botTurn(difficulty: 'easy' | 'normal' | 'hard' = 'normal'): ChessLanResult {
    const result = this.session.botTurn(difficulty);
    if (result.ok) this.broadcastSnapshot();
    return result;
  }

  /** Called by the disconnect timer or host lifecycle at grace expiry. */
  expireSeats(now = Date.now()): boolean {
    const expired = this.session.expire(now);
    if (expired) this.emitView();
    return expired;
  }

  async close(): Promise<void> {
    this.session.close();
    if (this.guestSocket) {
      send(this.guestSocket, { type: 'room.closed' });
      this.guestSocket.end();
      this.guestSocket = null;
    }
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    this.listening = false;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  private broadcastSnapshot(): void {
    const view = this.session.view();
    if (this.guestSocket) send(this.guestSocket, { type: 'game.snapshot', view });
    this.emitView(view);
  }

  private emitView(view = this.session.view()): void {
    for (const listener of this.viewListeners) {
      try { listener(view); } catch { /* UI observers cannot disrupt host rules. */ }
    }
  }

  private accept(socket: Socket): void {
    if (!this.listening) { socket.destroy(); return; }
    socket.setNoDelay(true);
    socket.setTimeout(30_000, () => socket.destroy());
    let buffer = Buffer.alloc(0);
    let token: string | null = null;
    let rateWindow = Date.now();
    let rateCount = 0;
    const handshakeTimer = setTimeout(() => socket.destroy(), 5_000);
    handshakeTimer.unref();
    socket.on('data', chunk => {
      if (socket.destroyed) return;
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length > MAX_LINE_BYTES && !buffer.includes(10)) { send(socket, { type: 'protocol.error', error: 'message.too-large' }); socket.end(); return; }
      let newline: number;
      while ((newline = buffer.indexOf(10)) >= 0) {
        const line = buffer.subarray(0, newline);
        buffer = buffer.subarray(newline + 1);
        if (line.length > MAX_LINE_BYTES || buffer.length > MAX_LINE_BYTES * 2) {
          send(socket, { type: 'protocol.error', error: 'message.too-large' }); socket.end(); return;
        }
        const now = Date.now();
        if (now - rateWindow >= 1_000) { rateWindow = now; rateCount = 0; }
        if (++rateCount > MAX_MESSAGES_PER_SECOND) {
          send(socket, { type: 'protocol.error', error: 'rate.limit' }); socket.end(); return;
        }
        let message: unknown;
        try { message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)); }
        catch { send(socket, { type: 'protocol.error', error: 'message.invalid-json' }); socket.end(); return; }
        if (!record(message) || typeof message.type !== 'string') {
          send(socket, { type: 'protocol.error', error: 'message.invalid-shape' }); socket.end(); return;
        }
        if (!token) {
          const joined = this.hello(message);
          if (!joined.ok) { send(socket, { type: 'hello.reject', error: joined.error }); socket.end(); return; }
          token = joined.token;
          this.guestSocket = socket;
          clearTimeout(handshakeTimer);
          send(socket, { type: 'hello.accept', protocolMajor: PROTOCOL_MAJOR, token, view: joined.view });
          this.emitView(joined.view);
        } else if (message.type === 'game.intent') {
          if (!onlyKeys(message, ['type', 'intent']) || !record(message.intent) ||
            !onlyKeys(message.intent, ['requestId', 'baseRevision', 'from', 'to', 'promotion'])) {
            send(socket, { type: 'game.result', requestId: null,
              result: { ok: false, error: 'game.invalid-intent', revision: this.session.view().revision } });
            continue;
          }
          const requestId = typeof message.intent.requestId === 'string' ? message.intent.requestId : null;
          const before = this.session.view().revision;
          const result = this.session.submit(token, message.intent as unknown as ChessLanIntent);
          send(socket, { type: 'game.result', requestId, result });
          if (result.ok && result.revision > before) this.broadcastSnapshot();
        } else if (message.type === 'game.snapshot.request' && onlyKeys(message, ['type'])) {
          send(socket, { type: 'game.snapshot', view: this.session.view() });
        } else if (message.type === 'room.leave' && onlyKeys(message, ['type'])) {
          if (this.session.leave(token)) {
            this.guestSocket = null;
            this.emitView();
          }
          socket.end();
          return;
        } else if (message.type === 'ping' && onlyKeys(message, ['type'])) {
          send(socket, { type: 'pong' });
        } else {
          send(socket, { type: 'protocol.error', error: 'message.unknown-type' });
        }
      }
      if (buffer.length > MAX_LINE_BYTES) { send(socket, { type: 'protocol.error', error: 'message.too-large' }); socket.end(); }
    });
    socket.on('close', () => {
      clearTimeout(handshakeTimer);
      if (this.guestSocket === socket) this.guestSocket = null;
      if (token && this.session.disconnect(token)) {
        this.emitView();
        const expiry = setTimeout(() => this.expireSeats(), CHESS_LAN_GRACE_MS + 1);
        expiry.unref();
      }
    });
    socket.on('error', () => { /* close event performs seat cleanup */ });
  }

  private hello(message: JsonRecord):
    | { ok: true; token: string; view: ChessLanView }
    | { ok: false; error: string } {
    if (message.type !== 'hello' || !onlyKeys(message,
      ['type', 'protocolMajor', 'rulesetId', 'rulesetVersion', 'rejoinToken']))
      return { ok: false, error: 'message.invalid-hello' };
    if (message.protocolMajor !== PROTOCOL_MAJOR || message.rulesetId !== descriptor.rulesetId ||
      message.rulesetVersion !== descriptor.rulesetVersion)
      return { ok: false, error: 'version.unsupported' };
    if (message.rejoinToken !== undefined) {
      if (typeof message.rejoinToken !== 'string' || message.rejoinToken.length > 128)
        return { ok: false, error: 'session.invalid' };
      const joined = this.session.rejoin(message.rejoinToken, descriptor.rulesetVersion);
      return joined ? { ok: true, ...joined } : { ok: false, error: 'session.invalid' };
    }
    return this.session.join(descriptor.rulesetVersion);
  }
}
