import { createSocket, type Socket as UdpSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import { isIP } from 'node:net';
import { descriptor } from '../games/chess/descriptor';

export const LAN_DISCOVERY_PORT = 47_832;
const MAGIC = 'MASHUP_ARENA_LAN';
const PROTOCOL_MAJOR = 1;
const MAX_DATAGRAM_BYTES = 1_024;
const ROOM_TTL_MS = 7_000;
const ADVERTISE_MS = 2_000;

export interface LanRoomAdvertisement {
  readonly magic: typeof MAGIC;
  readonly protocolMajor: typeof PROTOCOL_MAJOR;
  readonly roomEpoch: string;
  readonly roomName: string;
  readonly gameId: 'chess';
  readonly rulesetVersion: string;
  readonly port: number;
  readonly humanSeats: number;
  readonly maxSeats: 2;
}
export interface DiscoveredLanRoom extends LanRoomAdvertisement {
  readonly address: string;
  readonly lastSeen: number;
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const safeRoomName = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 1 && value.length <= 32 && !/[\u0000-\u001f\u007f]/.test(value);

export function parseLanAdvertisement(bytes: Uint8Array): LanRoomAdvertisement | null {
  if (bytes.byteLength > MAX_DATAGRAM_BYTES) return null;
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { return null; }
  if (!record(value) || Object.keys(value).length !== 9 ||
    !Object.keys(value).every(k => ['magic', 'protocolMajor', 'roomEpoch', 'roomName', 'gameId',
      'rulesetVersion', 'port', 'humanSeats', 'maxSeats'].includes(k))) return null;
  if (value.magic !== MAGIC || value.protocolMajor !== PROTOCOL_MAJOR ||
    typeof value.roomEpoch !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.roomEpoch) ||
    !safeRoomName(value.roomName) || value.gameId !== 'chess' ||
    value.rulesetVersion !== descriptor.rulesetVersion || !Number.isInteger(value.port) ||
    (value.port as number) < 1 || (value.port as number) > 65_535 ||
    !Number.isInteger(value.humanSeats) || (value.humanSeats as number) < 1 ||
    (value.humanSeats as number) > 2 || value.maxSeats !== 2) return null;
  return value as unknown as LanRoomAdvertisement;
}

export function encodeLanAdvertisement(input: Omit<LanRoomAdvertisement, 'magic' | 'protocolMajor' | 'gameId' | 'rulesetVersion' | 'maxSeats'>): Buffer {
  const payload: LanRoomAdvertisement = { magic: MAGIC, protocolMajor: PROTOCOL_MAJOR,
    gameId: 'chess', rulesetVersion: descriptor.rulesetVersion, maxSeats: 2, ...input };
  const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
  if (!parseLanAdvertisement(bytes)) throw new TypeError('Invalid LAN room advertisement');
  return bytes;
}

/** Directed broadcast for a selected IPv4 interface; not a NAT traversal mechanism. */
export function directedBroadcast(address: string, netmask: string): string {
  if (isIP(address) !== 4 || isIP(netmask) !== 4) throw new TypeError('IPv4 address/netmask required');
  const ip = address.split('.').map(Number), mask = netmask.split('.').map(Number);
  return ip.map((octet, index) => ((octet | (~mask[index]! & 255)) & 255)).join('.');
}

export function localLanAdapters(): readonly { name: string; address: string; netmask: string; broadcast: string }[] {
  const adapters: { name: string; address: string; netmask: string; broadcast: string }[] = [];
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && isIP(entry.address) === 4 && isIP(entry.netmask) === 4)
        adapters.push({ name, address: entry.address, netmask: entry.netmask,
          broadcast: directedBroadcast(entry.address, entry.netmask) });
    }
  }
  return adapters;
}

/** Host starts this only after Open to LAN; Windows firewall may still block broadcast. */
export class LanRoomAdvertiser {
  private socket: UdpSocket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  async start(adapterAddress: string, room: Omit<LanRoomAdvertisement,
    'magic' | 'protocolMajor' | 'gameId' | 'rulesetVersion' | 'maxSeats'>,
  discoveryPort = LAN_DISCOVERY_PORT): Promise<void> {
    if (this.socket) throw new Error('Already advertising');
    if (!Number.isInteger(discoveryPort) || discoveryPort < 1 || discoveryPort > 65_535) throw new RangeError('Invalid discovery port');
    const adapter = localLanAdapters().find(a => a.address === adapterAddress);
    if (!adapter) throw new Error('Select an active non-loopback LAN adapter');
    const bytes = encodeLanAdvertisement(room);
    const socket = createSocket('udp4');
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('error', reject);
        socket.bind(0, adapterAddress, () => { socket.off('error', reject); resolve(); });
      });
      socket.setBroadcast(true);
      socket.on('error', () => this.stop());
      this.socket = socket;
      const advertise = () => socket.send(bytes, discoveryPort, adapter.broadcast, () => undefined);
      advertise();
      this.timer = setInterval(advertise, ADVERTISE_MS);
      this.timer.unref();
    } catch (cause) { socket.close(); throw cause; }
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.socket?.close();
    this.socket = null;
  }
}

/** Browser listens only while the Join LAN screen is open; discovery never auto-joins. */
export class LanRoomBrowser {
  private socket: UdpSocket | null = null;
  private readonly rooms = new Map<string, DiscoveredLanRoom>();
  async start(port = LAN_DISCOVERY_PORT): Promise<number> {
    if (this.socket) throw new Error('Already browsing');
    if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new RangeError('Invalid discovery port');
    const socket = createSocket({ type: 'udp4', reuseAddr: true });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('error', reject);
        socket.bind(port, '0.0.0.0', () => { socket.off('error', reject); resolve(); });
      });
      socket.on('message', (bytes, remote) => {
        const advert = parseLanAdvertisement(bytes);
        if (!advert || isIP(remote.address) !== 4) return;
        const key = `${remote.address}:${advert.port}:${advert.roomEpoch}`;
        this.rooms.set(key, { ...advert, address: remote.address, lastSeen: Date.now() });
      });
      socket.on('error', () => { /* browser UI can continue with manual IP */ });
      this.socket = socket;
      const address = socket.address();
      return typeof address === 'string' ? port : address.port;
    } catch (cause) { socket.close(); throw cause; }
  }
  list(now = Date.now()): readonly DiscoveredLanRoom[] {
    for (const [key, room] of this.rooms) if (now - room.lastSeen > ROOM_TTL_MS) this.rooms.delete(key);
    return [...this.rooms.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }
  stop(): void {
    this.socket?.close();
    this.socket = null;
    this.rooms.clear();
  }
}
