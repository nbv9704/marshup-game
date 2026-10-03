import { describe, expect, it } from 'vitest';
import { ChessLanHostSession, type ChessLanIntent } from './chess-session';

const intent = (requestId: string, baseRevision: number, from: number, to: number): ChessLanIntent =>
  ({ requestId, baseRevision, from, to });

describe('host-authoritative Chess LAN session core', () => {
  it('keeps solo bot seat by default and accepts only matching ruleset', () => {
    const host = new ChessLanHostSession();
    expect(host.view().guest).toBe('bot');
    expect(host.view().state).not.toHaveProperty('positionCounts');
    expect(host.join('wrong')).toEqual({ ok: false, error: 'version.unsupported' });
    const guest = host.join('1.0.0');
    expect(guest.ok).toBe(true);
    expect(host.view().guest).toBe('connected');
    expect(host.join('1.0.0')).toEqual({ ok: false, error: 'seat.unavailable' });
  });

  it('rejects illegal, forged, out-of-turn and stale moves without changing state', () => {
    const host = new ChessLanHostSession();
    const guest = host.join('1.0.0');
    if (!guest.ok) throw new Error('join failed');
    expect(host.submit('forged', intent('a', 0, 12, 28))).toMatchObject({ ok: false, error: 'session.invalid' });
    expect(host.submit(guest.token, intent('b', 0, 52, 36))).toMatchObject({ ok: false, error: 'game.not-your-turn' });
    expect(host.submit(host.hostToken, intent('c', 0, 12, 44))).toMatchObject({ ok: false, error: 'game.illegal-move' });
    expect(host.view().revision).toBe(0);
    expect(host.submit(host.hostToken, intent('d', 0, 13, 21))).toMatchObject({ ok: true, revision: 1 });
    expect(host.submit(guest.token, intent('e', 0, 52, 36))).toMatchObject({ ok: false, error: 'game.stale-revision' });
    expect(host.view().revision).toBe(1);
  });

  it('plays Fool’s Mate and deduplicates retry without applying twice', () => {
    const host = new ChessLanHostSession();
    const guest = host.join('1.0.0');
    if (!guest.ok) throw new Error('join failed');
    const first = host.submit(host.hostToken, intent('one', 0, 13, 21));
    expect(first).toMatchObject({ ok: true, revision: 1 });
    expect(host.submit(host.hostToken, intent('one', 0, 13, 21))).toEqual(first);
    expect(host.submit(host.hostToken, intent('one', 0, 12, 28))).toMatchObject({ ok: false, error: 'game.invalid-intent' });
    expect(host.submit(guest.token, intent('two', 1, 52, 36))).toMatchObject({ ok: true, revision: 2 });
    expect(host.submit(host.hostToken, intent('three', 2, 14, 30))).toMatchObject({ ok: true, revision: 3 });
    expect(host.submit(guest.token, intent('four', 3, 59, 31))).toMatchObject({ ok: true, revision: 4 });
    expect(host.view().state).toMatchObject({ phase: 'completed', winner: 'p2', resultReason: 'checkmate' });
  });

  it('reserves a disconnected seat for 90 seconds and restores the same snapshot', () => {
    const host = new ChessLanHostSession();
    const guest = host.join('1.0.0');
    if (!guest.ok) throw new Error('join failed');
    expect(host.disconnect(guest.token, 1_000)).toBe(true);
    expect(host.view().guest).toBe('disconnected');
    expect(host.submit(guest.token, intent('x', 0, 52, 36))).toMatchObject({ ok: false, error: 'session.disconnected' });
    expect(host.submit(host.hostToken, intent('host-while-paused', 0, 12, 28))).toMatchObject({ ok: false, error: 'game.paused' });
    expect(host.rejoin(guest.token, 'wrong', 50_000)).toBeNull();
    const rejoined = host.rejoin(guest.token, '1.0.0', 91_000);
    expect(rejoined).toMatchObject({ view: { revision: 0, guest: 'connected' } });
    if (!rejoined) throw new Error('rejoin failed');
    expect(rejoined.token).not.toBe(guest.token);
    expect(host.disconnect(guest.token, 100_000)).toBe(false);
    expect(host.disconnect(rejoined.token, 100_000)).toBe(true);
    expect(host.rejoin(rejoined.token, '1.0.0', 190_001)).toBeNull();
    expect(host.expire(190_001)).toBe(true);
    expect(host.view().guest).toBe('bot');
  });

  it('frees a deliberately vacated seat without waiting for reconnect grace', () => {
    const host = new ChessLanHostSession();
    const guest = host.join('1.0.0');
    if (!guest.ok) throw new Error('join failed');
    expect(host.leave('forged')).toBe(false);
    expect(host.leave(guest.token)).toBe(true);
    expect(host.view().guest).toBe('bot');
    expect(host.join('1.0.0')).toMatchObject({ ok: true, view: { guest: 'connected' } });
  });

  it('lets a local bot fill an empty seat without exposing bot control to guests', () => {
    const host = new ChessLanHostSession();
    expect(host.botTurn()).toMatchObject({ ok: false, error: 'game.not-your-turn' });
    expect(host.submit(host.hostToken, intent('white', 0, 12, 28))).toMatchObject({ ok: true, revision: 1 });
    expect(host.botTurn('easy')).toMatchObject({ ok: true, revision: 2 });
    expect(host.view().state.activePlayer).toBe('p1');
  });

  it('round-trips a full solo save including repetition bookkeeping', () => {
    const host = new ChessLanHostSession();
    expect(host.submit(host.hostToken, intent('saved', 0, 12, 28))).toMatchObject({ ok: true, revision: 1 });
    const saved = host.snapshotForLocalSave();
    expect(saved).toHaveProperty('positionCounts');
    expect(host.view().state).not.toHaveProperty('positionCounts');
    const resumed = ChessLanHostSession.restoreLocalSave(saved);
    expect(resumed.view().revision).toBe(1);
    expect(resumed.botTurn('easy')).toMatchObject({ ok: true, revision: 2 });
    expect(() => ChessLanHostSession.restoreLocalSave({ board: [] })).toThrow();
  });

  it('allows a friend to take the bot seat at a committed turn boundary', () => {
    const host = new ChessLanHostSession();
    expect(host.submit(host.hostToken, intent('solo-white', 0, 12, 28))).toMatchObject({ ok: true, revision: 1 });
    expect(host.botTurn('easy')).toMatchObject({ ok: true, revision: 2 });
    const guest = host.join('1.0.0');
    expect(guest).toMatchObject({ ok: true, view: { revision: 2, guest: 'connected' } });
    if (!guest.ok) throw new Error('join failed');
    expect(host.submit(host.hostToken, intent('friend-white', 2, 11, 27))).toMatchObject({ ok: true, revision: 3 });
    expect(host.botTurn()).toMatchObject({ ok: false, error: 'game.not-your-turn' });
    expect(host.view().state.activePlayer).toBe('p2');
  });

  it('rejects all actions after host closes the room', () => {
    const host = new ChessLanHostSession();
    host.close();
    expect(host.join('1.0.0')).toEqual({ ok: false, error: 'room.closed' });
    expect(host.submit(host.hostToken, intent('x', 0, 12, 28))).toMatchObject({ ok: false, error: 'room.closed' });
  });
});
