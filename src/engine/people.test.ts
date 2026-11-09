import { describe, expect, it } from 'vitest';
import { act } from './actions';
import { createGame } from './creation';
import { choose } from './decisions';
import { ensurePeople, interact, interactionsWith, knownPeople, PER_TURN } from './people';
import { ageOf } from './state';
import { ageUp, monthsToBirthday } from './time';
import type { GameState } from './types';

const fresh = (seed: number, age: number, extra: Partial<GameState['character']> = {}) => {
  const s = createGame({ seed, startYear: 2026, age, powered: 'baseline' });
  Object.assign(s.character, { inPrisonUntil: null, health: 90 }, extra);
  s.pending = null;
  return s;
};

describe('family and friends', () => {
  it('gives every new character a family', () => {
    for (let seed = 1; seed < 20; seed++) {
      const s = fresh(seed, 5);
      const parents = knownPeople(s).filter((p) => p.relation !== 'sibling' && p.relation !== 'friend');
      expect(parents.length).toBeGreaterThan(0);
      for (const p of s.character.people!) expect(p.bond).toBeGreaterThanOrEqual(0);
    }
  });

  it('builds a bond by spending time, a limited number of times per turn', () => {
    let s = fresh(3, 20, { money: 5000 });
    const mom = s.character.people!.find((p) => p.alive && p.relation !== 'sibling')!;
    const before = mom.bond;
    const orig = s;
    const copy = structuredClone(s);
    s = interact(s, mom.id, 'gift');
    expect(orig).toEqual(copy); // input untouched
    expect(s.character.money).toBeLessThan(5000);
    for (let i = 1; i < PER_TURN; i++) s = interact(s, mom.id, 'call');
    expect(interactionsWith(s, mom.id).every((v) => v.disabled)).toBe(true);
    const after = s.character.people!.find((p) => p.id === mom.id)!;
    expect(after.moments).toBe(PER_TURN);
    expect(after.bond).not.toBe(before);
    s = ageUp(s, 'rest').state;
    if (s.pending) s = choose(s, s.pending.options[0].id);
    expect(interactionsWith(s, mom.id).some((v) => !v.disabled)).toBe(true);
  });

  it('can make a friend', () => {
    let s = fresh(4, 15);
    const n = s.character.people!.length;
    for (let i = 0; i < 4; i++) s = act(s, 'make-friend');
    expect(s.character.people!.length).toBeGreaterThan(n);
  });

  it('gives old saves a family without changing the dice', () => {
    const s = fresh(5, 30);
    delete s.character.people;
    const rng = s.rngState;
    ensurePeople(s);
    expect(s.character.people!.length).toBeGreaterThan(0);
    expect(s.rngState).toBe(rng);
  });
});

describe('age up', () => {
  it('always lands on a birthday and adds a year of age', () => {
    let s = fresh(6, 10);
    for (let i = 0; i < 5 && s.character.alive; i++) {
      const age = ageOf(s);
      const r = ageUp(s, 'school');
      s = r.state;
      if (r.stoppedBy) {
        if (s.pending) s = choose(s, s.pending.options[0].id);
        continue;
      }
      expect(s.date.month).toBe(s.character.born.month);
      expect(ageOf(s)).toBe(age + 1);
      expect(monthsToBirthday(s)).toBe(12);
    }
  });
});

describe('money for young children', () => {
  it('a toddler does not pile up money', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createGame({ seed, startYear: 2026, age: 0, powered: 'baseline' });
      for (let i = 0; i < 4 && s.character.alive; i++) {
        if (s.pending) s = choose(s, s.pending.options[0].id);
        s = ageUp(s, 'family').state;
      }
      expect(s.character.money).toBeLessThanOrEqual(0);
    }
  });
});

describe('street kids', () => {
  it('do not pay rent before 18', () => {
    let s = createGame({ seed: 9, startYear: 2026, age: 11, background: 'street', powered: 'baseline' });
    for (let i = 0; i < 5 && s.character.alive; i++) {
      if (s.pending) s = choose(s, s.pending.options[0].id);
      s = ageUp(s, 'school').state;
    }
    expect(s.character.money).toBeGreaterThan(-2000);
  });
});

describe('mini game skill', () => {
  it('a better score wins more fights', () => {
    const wins = [0, 0];
    for (let seed = 1; seed <= 80; seed++) {
      [0, 1].forEach((skill) => {
        const s = fresh(seed, 22, { health: 100, money: 0 });
        const after = act(s, 'fight', skill);
        if (after.character.money > 0) wins[skill]++;
      });
    }
    expect(wins[1]).toBeGreaterThan(wins[0]);
  });
});

describe('young children (playtest fixes, 2026-11-07)', () => {
  it('parent bonds hold while a baby cannot interact', () => {
    let s = createGame({ age: 0, seed: 21, background: 'working class' });
    const parents = () => knownPeople(s).filter((p) => p.relation === 'mother' || p.relation === 'father');
    const start = parents().map((p) => p.bond);
    for (let i = 0; i < 4; i++) {
      if (s.pending) s = choose(s, s.pending.options[0].id);
      s = ageUp(s, 'family').state;
    }
    parents().forEach((p, i) => expect(p.bond).toBeGreaterThanOrEqual(start[i]));
  });

  it('never has an old friend call a child with no friends', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let s = createGame({ age: 0, seed });
      for (let i = 0; i < 6 && s.character.alive; i++) {
        if (s.pending) s = choose(s, s.pending.options[0].id);
        s = ageUp(s, 'family').state;
      }
      expect(s.log.some((e) => e.text.includes('An old friend calls'))).toBe(false);
    }
  });
});
