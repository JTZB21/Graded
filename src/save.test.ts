import { describe, expect, it } from 'vitest';
import { createGame } from './engine/creation';
import { exportCode, importCode } from './save';

describe('save codes', () => {
  it('round-trip a game, names with accents included', () => {
    const s = createGame({ seed: 2, name: 'Zoë Ibekwe', age: 20 });
    const back = importCode(exportCode(s));
    expect(back?.character.name).toBe('Zoë Ibekwe');
    expect(back?.log).toEqual(s.log);
  });
  it('rejects junk', () => {
    expect(importCode('hello')).toBeNull();
    expect(importCode('GRADED1:!!!')).toBeNull();
  });
});
