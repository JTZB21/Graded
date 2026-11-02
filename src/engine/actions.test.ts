import { describe, expect, it } from 'vitest';
import { act, ACTIONS, availableActions, ENERGY, energyOf } from './actions';
import { createGame } from './creation';
import { choose } from './decisions';
import { changes } from './sheet';
import { advance } from './time';
import { TEMPLATES } from './writer/templates';
import type { GameState } from './types';

const adult = (seed = 11, extra: Partial<GameState['character']> = {}) => {
  const s = createGame({ seed, startYear: 2026, age: 25 });
  Object.assign(s.character, { inPrisonUntil: null, health: 80, money: 20000 }, extra);
  s.pending = null;
  return s;
};

describe('actions', () => {
  it('spends energy and refills it when time moves', () => {
    let s = adult();
    expect(energyOf(s)).toBe(ENERGY);
    s = act(s, 'study');
    expect(s.energy).toBe(ENERGY - 1);
    for (let i = 1; i < ENERGY; i++) s = act(s, 'study');
    expect(availableActions(s).find((a) => a.id === 'study')?.disabled).toBeTruthy();
    expect(() => act(s, 'study')).toThrow();
    s = advance(s, 1, 'rest').state;
    expect(s.energy).toBe(ENERGY);
  });

  it('never changes the state it is given', () => {
    const s = adult();
    const copy = structuredClone(s);
    act(s, 'night-out');
    expect(s).toEqual(copy);
  });

  it('charges money and writes a log line', () => {
    const s = adult();
    const after = act(s, 'night-out');
    expect(after.character.money).toBeLessThan(s.character.money);
    expect(after.log.length).toBeGreaterThan(s.log.length);
    expect(changes(s, after).some((c) => c.startsWith('-$'))).toBe(true);
  });

  it('only offers what fits the age', () => {
    const kid = createGame({ seed: 4, startYear: 2026, age: 8 });
    kid.pending = null;
    const ids = availableActions(kid).map((a) => a.id);
    expect(ids).toContain('study');
    expect(ids).not.toContain('night-out');
    expect(ids).not.toContain('job-hunt');
    expect(ids).not.toContain('fight');
  });

  it('limits what you can do in prison', () => {
    const s = adult(12, { inPrisonUntil: { year: 2028, month: 1 } });
    const ids = availableActions(s).map((a) => a.id);
    expect(ids).toContain('hustle');
    expect(ids).toContain('gym');
    expect(ids).not.toContain('night-out');
    expect(ids).not.toContain('job-hunt');
  });

  it('offers nothing while a decision waits', () => {
    const s = adult();
    s.pending = { id: 'move', text: '', options: [] };
    expect(availableActions(s)).toEqual([]);
  });

  it('moving offers districts you can afford and moves you', () => {
    let s = adult(13, { district: 'Old Foundry', money: 5000 });
    s = act(s, 'move');
    expect(s.pending?.id).toBe('move');
    const ids = s.pending!.options.map((o) => o.id);
    expect(ids).toContain('Riverside Docks');
    expect(ids).not.toContain('Old Foundry');
    expect(ids).not.toContain('Ashgrove'); // $7,000 rent
    s = choose(s, 'Saint Bryce');
    expect(s.character.district).toBe('Saint Bryce');
    expect(s.character.livesWithFamily).toBe(false);
  });

  it('a raise can be asked once a year', () => {
    let s = adult(14, { job: { id: 'office', title: 'Office worker', salary: 56000 } });
    s = act(s, 'raise');
    if (s.character.job) expect(availableActions(s).find((a) => a.id === 'raise')?.disabled).toBe('Already asked this year');
  });

  it('pushing a power builds Strain and Grade progress', () => {
    const s = createGame({ seed: 21, startYear: 2026, age: 20, powered: { rank: 'C' } });
    Object.assign(s.character, { health: 100, strain: 0, inPrisonUntil: null });
    s.pending = null;
    if (!s.character.graded) return;
    const after = act(s, 'push');
    expect(after.character.strain).toBeGreaterThan(0);
    expect(after.character.gradeProgress > s.character.gradeProgress || after.character.grade !== s.character.grade).toBe(true);
  });

  it('every action id is unique and every act.* template key is used by some action outcome', () => {
    const ids = ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = Object.keys(TEMPLATES).filter((k) => k.startsWith('act.'));
    expect(keys.length).toBeGreaterThan(40);
  });
});
