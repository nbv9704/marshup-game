import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanController } from './lan-controller';

const controllers: LanController[] = [];
const events: { channel:string; payload:unknown }[] = [];
function controller(): LanController {
  const value = new LanController((channel, payload) => events.push({ channel, payload }));
  controllers.push(value);
  return value;
}
afterEach(async () => {
  await Promise.all(controllers.splice(0).map(value => value.shutdown()));
  events.length = 0;
});

describe('Electron-main LAN controller', () => {
  it('hosts a loopback game and joins through a second controller without exposing socket tokens', async () => {
    const host = controller(), guest = controller();
    const endpoint = await host.startHost({ adapterAddress: '127.0.0.1', port: 0, roomName: 'Chess friends' });
    expect(endpoint.discoveryAvailable).toBe(false); // loopback has no broadcast; direct IP still works
    expect(endpoint).not.toHaveProperty('token');
    expect(await guest.joinDirect(endpoint)).toMatchObject({ guest: 'connected', revision: 0 });
    expect(host.hostView()?.guest).toBe('connected');
    expect(host.hostView()?.state).not.toHaveProperty('positionCounts');
    expect(() => host.hostMove({ requestId: 'forged', baseRevision: 0, from: 12, to: 28, actor: 'p2' })).toThrow();
    expect(host.hostMove({ requestId: 'host-1', baseRevision: 0, from: 12, to: 28 })).toMatchObject({ ok: true, revision: 1 });
    await vi.waitFor(() => expect(guest.guestView()?.revision).toBe(1));
    expect(await guest.guestMove({ requestId: 'guest-1', baseRevision: 1, from: 52, to: 36 })).toMatchObject({ ok: true, revision: 2 });
    await vi.waitFor(() => expect(host.hostView()?.revision).toBe(2));
    expect(events.some(event => event.channel === 'lan:host-view')).toBe(true);
    expect(events.some(event => event.channel === 'lan:guest-view')).toBe(true);
    await host.stopHost();
    await vi.waitFor(() => expect(events.some(event => event.channel === 'lan:guest-closed')).toBe(true));
  });

  it('validates room settings and never opens a broad listener implicitly', async () => {
    const host = controller();
    await expect(host.startHost({ adapterAddress: '0.0.0.0', port: 0, roomName: 'Bad' })).rejects.toThrow();
    await expect(host.startHost({ adapterAddress: '127.0.0.1', port: 0, roomName: '' })).rejects.toThrow();
    expect(host.hostView()).toBeNull();
  });

  it('lets a friend replace the bot after solo play has already started', async () => {
    const host = controller(), guest = controller();
    const endpoint = await host.startHost({ adapterAddress: '127.0.0.1', port: 0, roomName: 'Join later' });
    expect(host.hostMove({ requestId: 'solo-1', baseRevision: 0, from: 12, to: 28 })).toMatchObject({ ok: true, revision: 1 });
    expect(host.hostBotTurn('easy')).toMatchObject({ ok: true, revision: 2 });
    expect(await guest.joinDirect(endpoint)).toMatchObject({ guest: 'connected', revision: 2 });
    expect(host.hostView()?.guest).toBe('connected');
    expect(host.hostBotTurn('easy')).toMatchObject({ ok: false, error: 'game.not-your-turn' });
    guest.leaveGuest();
    await vi.waitFor(() => expect(host.hostView()?.guest).toBe('bot'));
    const another = controller();
    expect(await another.joinDirect(endpoint)).toMatchObject({ guest: 'connected', revision: 2 });
  });
});
