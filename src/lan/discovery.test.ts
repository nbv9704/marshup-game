import { createSocket } from 'node:dgram';
import { describe, expect, it, vi } from 'vitest';
import { LanRoomBrowser, directedBroadcast, encodeLanAdvertisement, parseLanAdvertisement } from './discovery';

const advert = () => ({ roomEpoch: crypto.randomUUID(), roomName: 'Bàn cờ của Comet', port: 47_831, humanSeats: 1 });

describe('best-effort LAN discovery', () => {
  it('computes directed broadcast for physical and virtual LAN masks', () => {
    expect(directedBroadcast('192.168.1.24', '255.255.255.0')).toBe('192.168.1.255');
    expect(directedBroadcast('26.42.18.7', '255.0.0.0')).toBe('26.255.255.255');
    expect(() => directedBroadcast('not-ip', '255.255.255.0')).toThrow();
  });

  it('encodes only bounded, known Chess advertisements', () => {
    const bytes = encodeLanAdvertisement(advert());
    expect(parseLanAdvertisement(bytes)).toMatchObject({ roomName: 'Bàn cờ của Comet', gameId: 'chess', port: 47_831 });
    expect(parseLanAdvertisement(Buffer.from('{broken'))).toBeNull();
    expect(parseLanAdvertisement(Buffer.alloc(1_025))).toBeNull();
    expect(() => encodeLanAdvertisement({ ...advert(), roomName: 'x'.repeat(33) })).toThrow();
    const forged = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    forged['rulesetVersion'] = 'other';
    expect(parseLanAdvertisement(Buffer.from(JSON.stringify(forged)))).toBeNull();
    forged['rulesetVersion'] = '1.0.0';
    forged['unexpected'] = 'ignored?';
    expect(parseLanAdvertisement(Buffer.from(JSON.stringify(forged)))).toBeNull();
  });

  it('discovers a UDP advertisement without auto-joining and expires stale entries', async () => {
    const browser = new LanRoomBrowser();
    const port = await browser.start(0);
    const socket = createSocket('udp4');
    try {
      const bytes = encodeLanAdvertisement(advert());
      await new Promise<void>((resolve, reject) => socket.send(bytes, port, '127.0.0.1', error => error ? reject(error) : resolve()));
      await vi.waitFor(() => expect(browser.list()).toHaveLength(1));
      const [room] = browser.list();
      expect(room).toMatchObject({ address: '127.0.0.1', port: 47_831, humanSeats: 1 });
      expect(browser.list(room!.lastSeen + 7_001)).toHaveLength(0);
    } finally { socket.close(); browser.stop(); }
  });
});
