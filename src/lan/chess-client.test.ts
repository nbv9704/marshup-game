import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'node:net';
import { ChessLanTcpServer } from './chess-tcp';
import { ChessLanTcpClient } from './chess-client';

const servers: ChessLanTcpServer[] = [];
const clients: ChessLanTcpClient[] = [];
afterEach(async () => {
  clients.splice(0).forEach(client => client.close());
  await Promise.all(servers.splice(0).map(server => server.close()));
});

describe('direct-IP Chess LAN client', () => {
  it('joins, receives host snapshots, submits a move and rejoins the reserved seat', async () => {
    const server = new ChessLanTcpServer();
    servers.push(server);
    const endpoint = await server.listen('127.0.0.1', 0);
    const client = await ChessLanTcpClient.connectDirect(endpoint);
    clients.push(client);
    expect(client.view).toMatchObject({ rulesetId: 'chess-standard', revision: 0, guest: 'connected' });
    const token = client.rejoinToken;
    const updates: number[] = [];
    client.onSnapshot(view => updates.push(view.revision));
    expect(server.hostMove({ requestId: 'host-1', baseRevision: 0, from: 12, to: 28 })).toMatchObject({ ok: true, revision: 1 });
    await vi.waitFor(() => expect(updates).toEqual([1]));
    expect(await client.move({ requestId: 'guest-1', baseRevision: 1, from: 52, to: 36 })).toMatchObject({ ok: true, revision: 2 });
    await vi.waitFor(() => expect(client.view.revision).toBe(2));
    // Simulate a dropped connection, not the explicit leave protocol.
    (client as unknown as { socket: Socket }).socket.destroy();
    await vi.waitFor(() => expect(server.session.view().guest).toBe('disconnected'));
    const resumed = await ChessLanTcpClient.connectDirect({ ...endpoint, rejoinToken: token });
    clients.push(resumed);
    expect(resumed.view).toMatchObject({ revision: 2, guest: 'connected' });
    expect(resumed.rejoinToken).not.toBe(token);
  });

  it('validates direct-IP endpoint before opening a socket', async () => {
    await expect(ChessLanTcpClient.connectDirect({ address: 'example.com', port: 47831 })).rejects.toThrow('IPv4');
    await expect(ChessLanTcpClient.connectDirect({ address: '127.0.0.1', port: 0 })).rejects.toThrow('port');
  });
});
