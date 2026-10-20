import { afterEach, describe, expect, it, vi } from 'vitest';
import { webOrigins } from './cors.js';

afterEach(() => vi.unstubAllEnvs());
describe('browser origin configuration', () => {
  it('keeps local development usable without configuration', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('WEB_ORIGIN', '');
    expect(webOrigins()).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });
  it('requires explicit origins in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => webOrigins('')).toThrow('WEB_ORIGIN');
  });
  it('accepts distinct exact origins and removes duplicates', () => {
    expect(
      webOrigins(
        'https://app.example.com, https://preview.example.com,https://app.example.com',
      ),
    ).toEqual(['https://app.example.com', 'https://preview.example.com']);
  });
  it.each([
    '*',
    'null',
    'https://app.example.com/',
    'https://app.example.com/path',
    'https://user:password@app.example.com',
    'ftp://app.example.com',
    'https://app.example.com,',
  ])('rejects unsafe or malformed configuration: %s', (value) => {
    expect(() => webOrigins(value)).toThrow('WEB_ORIGIN');
  });
});
