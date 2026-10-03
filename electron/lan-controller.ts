import { ChessLanTcpClient } from '../src/lan/chess-client';
import { ChessLanTcpServer } from '../src/lan/chess-tcp';
import { LanRoomAdvertiser, LanRoomBrowser, localLanAdapters } from '../src/lan/discovery';
import type { ChessLanIntent, ChessLanResult, ChessLanView } from '../src/lan/chess-session';

type LanEvent = 'lan:host-view' | 'lan:guest-view' | 'lan:guest-closed';
type GuestEndpoint = { address: string; port: number; rejoinToken: string };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function parseIntent(value: unknown): ChessLanIntent {
  if (!record(value) || !Object.keys(value).every(key =>
    ['requestId', 'baseRevision', 'from', 'to', 'promotion'].includes(key)) ||
    typeof value.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value.requestId) ||
    !Number.isSafeInteger(value.baseRevision) || !Number.isInteger(value.from) || !Number.isInteger(value.to) ||
    (value.promotion !== undefined && !['queen', 'rook', 'bishop', 'knight'].includes(String(value.promotion))))
    throw new TypeError('Invalid LAN Chess move intent');
  return value as unknown as ChessLanIntent;
}

/** Electron-main owner for LAN sockets; no raw socket or rejoin token crosses preload. */
export class LanController {
  private host: ChessLanTcpServer | null = null;
  private hostUnsubscribe: (() => void) | null = null;
  private advertiser: LanRoomAdvertiser | null = null;
  private browser: LanRoomBrowser | null = null;
  private guest: ChessLanTcpClient | null = null;
  private guestEndpoint: GuestEndpoint | null = null;

  constructor(private readonly emit: (event: LanEvent, payload: unknown) => void) {}

  listAdapters() { return localLanAdapters(); }

  async startHost(input: unknown): Promise<{ address: string; port: number; roomEpoch: string; discoveryAvailable: boolean }> {
    if (this.host) throw new Error('A LAN Chess room is already open');
    if (!record(input) || typeof input.adapterAddress !== 'string' || typeof input.roomName !== 'string' ||
      !Number.isInteger(input.port) || (input.port as number) < 0 || (input.port as number) > 65_535 ||
      input.roomName.trim().length < 1 || input.roomName.length > 32 || /[\u0000-\u001f\u007f]/.test(input.roomName))
      throw new TypeError('Invalid LAN room settings');
    const host = new ChessLanTcpServer();
    const endpoint = await host.listen(input.adapterAddress, input.port as number);
    this.host = host;
    const roomName = input.roomName.trim();
    this.hostUnsubscribe = host.onView(view => {
      this.emit('lan:host-view', view);
      if (this.advertiser) {
        try { this.advertiser.update({ roomEpoch: view.roomEpoch, roomName, port: endpoint.port,
          humanSeats: view.guest === 'connected' ? 2 : 1 }); }
        catch { /* Discovery failure cannot close a direct-IP game. */ }
      }
    });
    let discoveryAvailable = false;
    if (localLanAdapters().some(adapter => adapter.address === endpoint.address)) {
      const advertiser = new LanRoomAdvertiser();
      try {
        await advertiser.start(endpoint.address, { roomEpoch: host.session.roomEpoch, roomName,
          port: endpoint.port, humanSeats: 1 });
        this.advertiser = advertiser;
        discoveryAvailable = true;
      } catch { advertiser.stop(); }
    }
    return { ...endpoint, roomEpoch: host.session.roomEpoch, discoveryAvailable };
  }

  hostView(): ChessLanView | null { return this.host?.session.view() ?? null; }
  hostMove(input: unknown): ChessLanResult {
    if (!this.host) throw new Error('No LAN Chess room is open');
    return this.host.hostMove(parseIntent(input));
  }
  hostBotTurn(difficulty: unknown): ChessLanResult {
    if (!this.host) throw new Error('No LAN Chess room is open');
    if (difficulty !== 'easy' && difficulty !== 'normal' && difficulty !== 'hard') throw new TypeError('Invalid bot difficulty');
    return this.host.botTurn(difficulty);
  }
  async stopHost(): Promise<void> {
    this.advertiser?.stop();
    this.advertiser = null;
    this.hostUnsubscribe?.();
    this.hostUnsubscribe = null;
    const host = this.host;
    this.host = null;
    if (host) await host.close();
  }

  async startBrowsing(): Promise<void> {
    if (this.browser) return;
    const browser = new LanRoomBrowser();
    await browser.start();
    this.browser = browser;
  }
  discoveredRooms() { return this.browser?.list() ?? []; }
  stopBrowsing(): void { this.browser?.stop(); this.browser = null; }

  async joinDirect(input: unknown): Promise<ChessLanView> {
    if (!record(input) || typeof input.address !== 'string' || !Number.isInteger(input.port))
      throw new TypeError('Invalid LAN address');
    this.leaveGuest();
    const address = input.address, port = input.port as number;
    const client = await ChessLanTcpClient.connectDirect({ address, port });
    this.attachGuest(client, address, port);
    return client.view;
  }
  async rejoin(): Promise<ChessLanView> {
    if (this.guest) throw new Error('Already connected');
    const previous = this.guestEndpoint;
    if (!previous) throw new Error('No LAN seat to rejoin');
    const client = await ChessLanTcpClient.connectDirect(previous);
    this.attachGuest(client, previous.address, previous.port);
    return client.view;
  }
  guestView(): ChessLanView | null { return this.guest?.view ?? null; }
  guestMove(input: unknown): Promise<ChessLanResult> {
    if (!this.guest) throw new Error('Not connected to a LAN Chess room');
    return this.guest.move(parseIntent(input));
  }
  requestGuestSnapshot(): void {
    if (!this.guest) throw new Error('Not connected to a LAN Chess room');
    this.guest.requestSnapshot();
  }
  leaveGuest(): void {
    this.guestEndpoint = null;
    const guest = this.guest;
    this.guest = null;
    guest?.close();
  }

  async shutdown(): Promise<void> {
    this.stopBrowsing();
    this.leaveGuest();
    await this.stopHost();
  }

  private attachGuest(client: ChessLanTcpClient, address: string, port: number): void {
    this.guest = client;
    this.guestEndpoint = { address, port, rejoinToken: client.rejoinToken };
    client.onSnapshot(view => this.emit('lan:guest-view', view));
    client.onClosed(error => {
      if (this.guest === client) {
        this.guest = null;
        this.emit('lan:guest-closed', error.message);
      }
    });
  }
}
