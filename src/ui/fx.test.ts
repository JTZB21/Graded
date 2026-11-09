import { describe, expect, it } from 'vitest';
import { createGame } from '../engine/creation';
import { momentsFor, toneOf } from './fx';

describe('effects', () => {
  it('reads change lines as good or bad', () => {
    expect(toneOf('Body +1')).toBe('good');
    expect(toneOf('Health -5')).toBe('bad');
    expect(toneOf('Stress +4')).toBe('bad');
    expect(toneOf('Strain -10%')).toBe('good');
    expect(toneOf('Infamy +3')).toBe('bad');
    expect(toneOf('+$1,200')).toBe('good');
    expect(toneOf('-$40')).toBe('bad');
    expect(toneOf('Prison until Mar 2031')).toBe('bad');
    expect(toneOf('Moved to Docks')).toBe('neutral');
  });

  it('picks the big moments from a move without touching state', () => {
    const before = createGame({ age: 20, seed: 7, powered: 'baseline' });
    const after = structuredClone(before);
    after.character.money += 500;
    after.character.body += 1;
    after.date = { ...after.date, year: after.date.year + 1 };
    const snapshot = JSON.stringify(after);
    const kinds = momentsFor(before, after).map(m => m.kind);
    expect(kinds).toContain('birthday');
    expect(kinds).toContain('coins');
    expect(kinds).toContain('float');
    expect(JSON.stringify(after)).toBe(snapshot);

    const dead = structuredClone(before);
    dead.character.alive = false;
    expect(momentsFor(before, dead)).toEqual([{ kind: 'death' }]);

    const woke = structuredClone(before);
    woke.character.graded = true;
    expect(momentsFor(before, woke)[0]).toEqual({ kind: 'awaken' });
  });
});
