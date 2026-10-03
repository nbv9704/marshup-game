import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const htmlPath = fileURLToPath(new URL('../design/online-3d/prototype.html', import.meta.url));
const html = readFileSync(htmlPath, 'utf8');

describe('offline-first LAN design prototype', () => {
  it('contains the agreed flow and no mandatory account form', () => {
    const screens = new Set([...html.matchAll(/<section[^>]*data-screen="([^"]+)"/g)].map(match => match[1]));
    expect(screens).toEqual(new Set(['profile', 'home', 'select', 'setup', 'join', 'lobby', 'room']));
    for (const [, target] of html.matchAll(/data-go="([^"]+)"/g)) expect(screens.has(target)).toBe(true);
    expect(html).toContain('OPEN TO LAN');
    expect(html).toContain('IP:port');
    expect(html).toContain('FOCUS BOARD');
    expect(html).not.toMatch(/type="password"|autocomplete="email"|data-screen="auth"/);
  });

  it('has syntactically valid inline interactions and no network request', () => {
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    expect(() => new Script(script!)).not.toThrow();
    expect(script).not.toMatch(/\bfetch\s*\(|\bWebSocket\s*\(|\bXMLHttpRequest\b/);
  });
});
