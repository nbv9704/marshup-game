import { connect, isIP, type Socket } from 'node:net';
import { descriptor } from '../games/chess/descriptor';
import { restoreChessState } from '../games/chess/rules';
import type { ChessLanError, ChessLanIntent, ChessLanPublicState, ChessLanResult, ChessLanView } from './chess-session';

const MAX_SERVER_LINE_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const publicState = (value: unknown): ChessLanPublicState | null => {
  if (!record(value)) return null;
  try {
    const restored = restoreChessState({ ...value, positionCounts: { networkProjection: 1 } });
    const { positionCounts: _hostOnly, ...visible } = restored;
    return visible;
  } catch { return null; }
};
const parseView = (value: unknown): ChessLanView | null => {
  if (!record(value) || typeof value.roomEpoch !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(value.roomEpoch) || value.rulesetId !== descriptor.rulesetId ||
    value.rulesetVersion !== descriptor.rulesetVersion || !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 || !['bot', 'connected', 'disconnected'].includes(String(value.guest))) return null;
  const state = publicState(value.state);
  if (!state || state.revision !== value.revision) return null;
  return { roomEpoch: value.roomEpoch, rulesetId: descriptor.rulesetId,
    rulesetVersion: descriptor.rulesetVersion, revision: value.revision as number,
    guest: value.guest as ChessLanView['guest'], state };
};
const parseResult = (value: unknown): ChessLanResult | null => {
  if (!record(value) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) return null;
  if (value.ok === true) {
    const state = publicState(value.state);
    return state && state.revision === value.revision ? { ok: true, revision: value.revision as number, state } : null;
  }
  if (value.ok === false && typeof value.error === 'string' &&
    ['room.closed', 'seat.unavailable', 'version.unsupported', 'session.invalid', 'session.disconnected',
      'game.paused', 'game.not-your-turn', 'game.stale-revision', 'game.illegal-move', 'game.invalid-intent'].includes(value.error))
    return { ok: false, revision: value.revision as number, error: value.error as ChessLanError };
  return null;
};

export interface ChessLanConnectOptions {
  readonly address: string;
  readonly port: number;
  readonly rejoinToken?: string;
}

/** Node-side direct-IP guest transport; Electron main exposes only narrow preload methods. */
export class ChessLanTcpClient {
  private buffer = Buffer.alloc(0);
  private readonly pending = new Map<string, { resolve: (result: ChessLanResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private readonly snapshotListeners = new Set<(view: ChessLanView) => void>();
  private readonly closeListeners = new Set<(error: Error) => void>();
  private handshake: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private tokenValue = '';
  private viewValue: ChessLanView | null = null;

  private constructor(private readonly socket: Socket) {
    socket.on('data', (chunk: Buffer) => this.read(chunk));
    socket.on('close', () => this.fail(new Error('LAN connection closed')));
    socket.on('error', error => this.fail(error));
  }

  static async connectDirect(options: ChessLanConnectOptions): Promise<ChessLanTcpClient> {
    if (isIP(options.address) !== 4 || !Number.isInteger(options.port) || options.port < 1 || options.port > 65_535)
      throw new TypeError('Enter an IPv4 address and valid port');
    if (options.rejoinToken !== undefined && (typeof options.rejoinToken !== 'string' || options.rejoinToken.length > 128))
      throw new TypeError('Invalid rejoin token');
    const socket = connect({ host: options.address, port: options.port });
    socket.setNoDelay(true);
    const client = new ChessLanTcpClient(socket);
    const handshakePromise = new Promise<void>((resolve, reject) => { client.handshake = { resolve, reject }; });
    const timeout = setTimeout(() => client.fail(new Error('LAN connection timed out')), REQUEST_TIMEOUT_MS);
    socket.once('connect', () => {
      socket.write(`${JSON.stringify({ type: 'hello', protocolMajor: 1,
        rulesetId: descriptor.rulesetId, rulesetVersion: descriptor.rulesetVersion,
        ...(options.rejoinToken ? { rejoinToken: options.rejoinToken } : {}) })}\n`);
    });
    try { await handshakePromise; return client; }
    catch (cause) { socket.destroy(); throw cause; }
    finally { clearTimeout(timeout); }
  }

  get rejoinToken(): string { return this.tokenValue; }
  get view(): ChessLanView {
    if (!this.viewValue) throw new Error('Not connected to a Chess LAN room');
    return this.viewValue;
  }

  onSnapshot(listener: (view: ChessLanView) => void): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  onClosed(listener: (error: Error) => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  async move(intent: ChessLanIntent): Promise<ChessLanResult> {
    if (this.closed || !this.viewValue) throw new Error('LAN connection is closed');
    if (this.pending.has(intent.requestId)) throw new Error('Request ID already pending');
    return new Promise<ChessLanResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(intent.requestId);
        reject(new Error('Move response timed out; request a snapshot before retrying'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(intent.requestId, { resolve, reject, timer });
      this.socket.write(`${JSON.stringify({ type: 'game.intent', intent })}\n`);
    });
  }

  requestSnapshot(): void {
    if (this.closed) throw new Error('LAN connection is closed');
    this.socket.write('{"type":"game.snapshot.request"}\n');
  }

  close(): void {
    if (this.closed) return;
    this.socket.end('{"type":"room.leave"}\n');
    this.fail(new Error('LAN connection closed by client'), false);
  }

  private read(chunk: Buffer): void {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let newline: number;
    while ((newline = this.buffer.indexOf(10)) >= 0) {
      const line = this.buffer.subarray(0, newline);
      this.buffer = this.buffer.subarray(newline + 1);
      if (line.length > MAX_SERVER_LINE_BYTES) { this.fail(new Error('LAN server message too large')); return; }
      let message: unknown;
      try { message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)); }
      catch { this.fail(new Error('Invalid LAN server message')); return; }
      this.handle(message);
      if (this.closed) return;
    }
    if (this.buffer.length > MAX_SERVER_LINE_BYTES) this.fail(new Error('LAN server message too large'));
  }

  private handle(message: unknown): void {
    if (!record(message) || typeof message.type !== 'string') { this.fail(new Error('Invalid LAN server message')); return; }
    if (message.type === 'hello.accept' && this.handshake) {
      const view = parseView(message.view);
      if (message.protocolMajor !== 1 || typeof message.token !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(message.token) || !view) {
        this.fail(new Error('Invalid LAN handshake')); return;
      }
      this.tokenValue = message.token;
      this.viewValue = view;
      this.heartbeat = setInterval(() => {
        if (!this.closed) this.socket.write('{"type":"ping"}\n');
      }, 10_000);
      this.heartbeat.unref();
      this.handshake.resolve();
      this.handshake = null;
    } else if (message.type === 'hello.reject' && this.handshake) {
      this.fail(new Error(typeof message.error === 'string' ? message.error : 'LAN join rejected'));
    } else if (message.type === 'game.result') {
      const requestId = message.requestId;
      if (typeof requestId !== 'string') return;
      const request = this.pending.get(requestId);
      if (!request) return;
      const result = parseResult(message.result);
      if (!result) { this.fail(new Error('Invalid LAN move result')); return; }
      this.pending.delete(requestId);
      clearTimeout(request.timer);
      request.resolve(result);
    } else if (message.type === 'game.snapshot') {
      const view = parseView(message.view);
      if (!view) {
        this.fail(new Error('Invalid LAN snapshot')); return;
      }
      if (!this.viewValue || view.roomEpoch !== this.viewValue.roomEpoch || view.revision < this.viewValue.revision) {
        this.fail(new Error('LAN snapshot is from another room or an older revision')); return;
      }
      this.viewValue = view;
      for (const listener of this.snapshotListeners) {
        try { listener(view); } catch { /* A UI callback must not tear down the network parser. */ }
      }
    } else if (message.type === 'room.closed') {
      this.fail(new Error('Host closed the LAN room'));
    } else if (message.type === 'pong') {
      // Heartbeat reply; RTT tracking is added with the Electron UI layer.
    } else {
      this.fail(new Error('Unknown LAN server message'));
    }
  }

  private fail(error: Error, destroySocket = true): void {
    if (this.closed) return;
    this.closed = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (destroySocket) this.socket.destroy();
    this.handshake?.reject(error);
    this.handshake = null;
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(error); }
    this.pending.clear();
    for (const listener of this.closeListeners) {
      try { listener(error); } catch { /* A UI callback must not escape a socket event. */ }
    }
    this.closeListeners.clear();
  }
}
