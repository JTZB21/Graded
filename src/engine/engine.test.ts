import { describe, expect, it } from 'vitest';
import { createGame } from './creation';
import { priceLevel } from './economy';
import { ageOf } from './state';
import { advance, availableFocuses } from './time';
import type { Focus, GameState } from './types';

/** Skips month by month until `months` pass, continuing through pauses (but not death). */
function live(s: GameState, months: number, focus: Focus): GameState {
  let left = months;
  while (left > 0 && s.character.alive) {
    const r = advance(s, left, focus);
    s = r.state;
    left -= r.monthsPassed;
  }
  return s;
}

describe('createGame', () => {
  it('is deterministic for a seed', () => {
    const a = createGame({ seed: 42 });
    const b = createGame({ seed: 42 });
    expect(a).toEqual(b);
  });

  it('respects the chosen start', () => {
    const s = createGame({ seed: 1, name: 'Test Person', startAge: 'young adult', background: 'street', powered: 'baseline' });
    expect(s.character.name).toBe('Test Person');
    expect(ageOf(s)).toBeGreaterThanOrEqual(18);
    expect(ageOf(s)).toBeLessThanOrEqual(25);
    expect(s.character.graded).toBe(false);
    expect(s.character.district).toBe('Riverside Docks');
    expect(s.character.streetCred).toBe(10);
    expect(s.date.year).toBe(2026);
  });

  it('kindles teens and older at creation, with Grade growing with age', () => {
    const teen = createGame({ seed: 3, age: 15, powered: { category: 'KIN', rank: 'B' } });
    expect(teen.character.graded).toBe(true);
    expect(teen.character.powers[0]).toMatchObject({ rank: 'B', category: 'KIN' });
    const veteran = createGame({ seed: 3, age: 50, powered: { category: 'KIN', rank: 'B' } });
    expect(['III', 'IV', 'V']).toContain(veteran.character.grade);
  });

  it('gives powered children a latent Kindling with the chosen power', () => {
    const s = createGame({ seed: 5, age: 9, powered: { category: 'PSI' } });
    expect(s.character.graded).toBe(false);
    expect(s.character.kindleAge).toBeGreaterThanOrEqual(12);
    expect(s.character.pendingPower).toEqual({ category: 'PSI' });
  });

  it('starts in any year from 1947', () => {
    const s = createGame({ seed: 7, startYear: 1975, age: 20, powered: 'baseline' });
    expect(s.date.year).toBe(1975);
    expect(ageOf(s)).toBe(20);
  });
});

describe('advance', () => {
  it('ages the character a year in twelve months', () => {
    const s = createGame({ seed: 11, age: 30, powered: 'baseline' });
    const after = live(s, 12, 'rest');
    if (after.character.alive) expect(ageOf(after)).toBe(31);
    expect(after.date.year).toBe(2027);
  });

  it('does not mutate the input state', () => {
    const s = createGame({ seed: 12, age: 20 });
    const copy = structuredClone(s);
    advance(s, 24, 'work');
    expect(s).toEqual(copy);
  });

  it('kindles a latent child in the Kindling window and stops the skip', () => {
    const s = createGame({ seed: 13, age: 11, powered: { category: 'BIO', rank: 'C' } });
    const r = advance(s, 12 * 12, 'school');
    expect(r.stoppedBy === 'kindling' || r.stoppedBy === 'event' || r.stoppedBy === 'death').toBe(true);
    const after = live(s, 12 * 11, 'school');
    if (after.character.alive) {
      expect(after.character.graded).toBe(true);
      expect(after.character.powers[0]).toMatchObject({ category: 'BIO', rank: 'C' });
    }
  });

  it('grows Grade faster when training', () => {
    const base = createGame({ seed: 21, age: 18, powered: { category: 'COR', rank: 'C' } });
    const trained = live(base, 36, 'train');
    const idle = live(base, 36, 'rest');
    const order = ['I', 'II', 'III', 'IV', 'V'];
    expect(order.indexOf(trained.character.grade!)).toBeGreaterThan(order.indexOf(idle.character.grade!));
  });

  it('keeps reputation between -100 and 100', () => {
    let s = createGame({ seed: 31, age: 20, background: 'street', powered: { rank: 'C' } });
    s = live(s, 12 * 20, 'crime');
    for (const k of ['fame', 'infamy', 'streetCred'] as const) {
      expect(s.character[k]).toBeGreaterThanOrEqual(-100);
      expect(s.character[k]).toBeLessThanOrEqual(100);
    }
  });

  it('logs world history as the years pass', () => {
    const s = createGame({ seed: 41, startYear: 1976, age: 20, powered: 'baseline' });
    const after = live(s, 24, 'work');
    expect(after.log.some((e) => e.kind === 'world' && e.text.includes('Blackout'))).toBe(true);
  });

  it('only offers focuses that fit the age', () => {
    expect(availableFocuses(createGame({ seed: 1, age: 2 }))).toEqual(['family']);
    expect(availableFocuses(createGame({ seed: 1, age: 10, powered: 'baseline' }))).not.toContain('work');
    expect(availableFocuses(createGame({ seed: 1, age: 30 }))).toContain('work');
  });
});

describe('priceLevel', () => {
  it('scales money to the era', () => {
    expect(priceLevel(2026)).toBe(1);
    expect(priceLevel(1980)).toBeCloseTo(0.27);
    expect(priceLevel(1975)).toBeGreaterThan(priceLevel(1970));
  });
});
