import { once } from 'node:events';
import { connect, type Socket } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChessLanTcpServer, bindableIpv4Addresses } from './chess-tcp';

class LinePeer {
  private buffer = '';
  private readonly messages: Record<string, unknown>[] = [];
  private readonly waiters: ((message: Record<string, unknown>) => void)[] = [];
  constructor(readonly socket: Socket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      this.buffer += chunk;
      let end: number;
      while ((end = this.buffer.indexOf('\n')) >= 0) {
        const message = JSON.parse(this.buffer.slice(0, end)) as Record<string, unknown>;
        this.buffer = this.buffer.slice(end + 1);
        const waiter = this.waiters.shift();
        if (waiter) waiter(message);
        else this.messages.push(message);
      }
    });
  }
  send(message: unknown): void { this.socket.write(`${JSON.stringify(message)}\n`); }
  next(): Promise<Record<string, unknown>> {
    const ready = this.messages.shift();
    if (ready) return Promise.resolve(ready);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for TCP message')), 3_000);
      this.waiters.push(message => { clearTimeout(timeout); resolve(message); });
    });
  }
  close(): void { this.socket.destroy(); }
}

const hello = (rejoinToken?: string, rulesetVersion = '1.0.0') => ({
  type: 'hello', protocolMajor: 1, rulesetId: 'chess-standard', rulesetVersion,
  ...(rejoinToken ? { rejoinToken } : {})
});
const move = (requestId: string, baseRevision: number, from: number, to: number) => ({
  type: 'game.intent', intent: { requestId, baseRevision, from, to }
});

const activeServers: ChessLanTcpServer[] = [];
const activePeers: LinePeer[] = [];
async function start(): Promise<{ server: ChessLanTcpServer; port: number }> {
  const server = new ChessLanTcpServer();
  activeServers.push(server);
  const endpoint = await server.listen('127.0.0.1', 0);
  return { server, port: endpoint.port };
}
async function peer(port: number): Promise<LinePeer> {
  const socket = connect({ host: '127.0.0.1', port });
  await once(socket, 'connect');
  const result = new LinePeer(socket);
  activePeers.push(result);
  return result;
}
afterEach(async () => {
  activePeers.splice(0).forEach(p => p.close());
  await Promise.all(activeServers.splice(0).map(s => s.close()));
});

describe('Chess TCP LAN listener on loopback', () => {
  it('requires an explicit local adapter address', async () => {
    expect(bindableIpv4Addresses().some(a => a.address === '127.0.0.1')).toBe(true);
    const server = new ChessLanTcpServer();
    await expect(server.listen('0.0.0.0', 0)).rejects.toThrow('Select an IPv4 address');
    await expect(server.listen('8.8.8.8', 0)).rejects.toThrow('Select an IPv4 address');
  });

  it('plays a full short match through host API and guest TCP, rejecting illegal and duplicate moves', async () => {
    const { server, port } = await start();
    const guest = await peer(port);
    guest.send(hello());
    expect(await guest.next()).toMatchObject({ type: 'hello.accept', protocolMajor: 1, view: { revision: 0 } });

    guest.send(move('out-of-turn', 0, 52, 36));
    expect(await guest.next()).toMatchObject({ type: 'game.result', result: { ok: false, error: 'game.not-your-turn' } });
    expect(server.hostMove({ requestId: 'host-1', baseRevision: 0, from: 13, to: 21 })).toMatchObject({ ok: true, revision: 1 });
    expect(await guest.next()).toMatchObject({ type: 'game.snapshot', view: { revision: 1 } });

    guest.send(move('illegal', 1, 52, 35));
    expect(await guest.next()).toMatchObject({ type: 'game.result', result: { ok: false, error: 'game.illegal-move' } });
    guest.send(move('guest-1', 1, 52, 36));
    expect(await guest.next()).toMatchObject({ type: 'game.result', result: { ok: true, revision: 2 } });
    expect(await guest.next()).toMatchObject({ type: 'game.snapshot', view: { revision: 2 } });
    // The same request is idempotent even if TCP delivery/reply is retried.
    guest.send(move('guest-1', 1, 52, 36));
    expect(await guest.next()).toMatchObject({ type: 'game.result', result: { ok: true, revision: 2 } });
    expect(server.session.view().revision).toBe(2);

    expect(server.hostMove({ requestId: 'host-2', baseRevision: 2, from: 14, to: 30 })).toMatchObject({ ok: true, revision: 3 });
    expect(await guest.next()).toMatchObject({ type: 'game.snapshot', view: { revision: 3 } });
    guest.send(move('mate', 3, 59, 31));
    expect(await guest.next()).toMatchObject({ type: 'game.result', result: { ok: true, revision: 4 } });
    expect(await guest.next()).toMatchObject({ type: 'game.snapshot', view: { state: { winner: 'p2', resultReason: 'checkmate' } } });
  });

  it('rejects bad versions and client-supplied actor fields', async () => {
    const { server, port } = await start();
    const bad = await peer(port);
    bad.send(hello(undefined, '9.0.0'));
    expect(await bad.next()).toEqual({ type: 'hello.reject', error: 'version.unsupported' });
    const guest = await peer(port);
    guest.send(hello());
    expect(await guest.next()).toMatchObject({ type: 'hello.accept' });
    guest.send({ type: 'game.intent', intent: { requestId: 'forge', baseRevision: 0, from: 12, to: 28, actor: 'p1' } });
    expect(await guest.next()).toMatchObject({ type: 'game.result', result: { ok: false, error: 'game.invalid-intent' } });
    expect(server.session.view().revision).toBe(0);
  });

  it('pauses after disconnect, restores a snapshot on rejoin, and rotates the token', async () => {
    const { server, port } = await start();
    const first = await peer(port);
    first.send(hello());
    const accepted = await first.next();
    const token = accepted.token as string;
    first.close();
    await vi.waitFor(() => expect(server.session.view().guest).toBe('disconnected'));
    expect(server.hostMove({ requestId: 'paused', baseRevision: 0, from: 12, to: 28 })).toMatchObject({ ok: false, error: 'game.paused' });
    const second = await peer(port);
    second.send(hello(token));
    const rejoined = await second.next();
    expect(rejoined).toMatchObject({ type: 'hello.accept', view: { revision: 0, guest: 'connected' } });
    expect(rejoined.token).not.toBe(token);
    expect(server.hostMove({ requestId: 'resumed', baseRevision: 0, from: 12, to: 28 })).toMatchObject({ ok: true, revision: 1 });
    expect(await second.next()).toMatchObject({ type: 'game.snapshot', view: { revision: 1 } });
  });

  it('bounds untrusted packets and closes guest sessions when the host quits', async () => {
    const { server, port } = await start();
    const oversized = await peer(port);
    oversized.socket.write('x'.repeat(16 * 1024 + 1));
    expect(await oversized.next()).toEqual({ type: 'protocol.error', error: 'message.too-large' });
    const guest = await peer(port);
    guest.send(hello());
    expect(await guest.next()).toMatchObject({ type: 'hello.accept' });
    guest.send({ type: 'game.snapshot.request' });
    expect(await guest.next()).toMatchObject({ type: 'game.snapshot', view: { revision: 0 } });
    guest.send({ type: 'ping' });
    expect(await guest.next()).toEqual({ type: 'pong' });
    const closed = server.close();
    expect(await guest.next()).toEqual({ type: 'room.closed' });
    await closed;
  });
});
