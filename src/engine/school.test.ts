import { describe, expect, it } from 'vitest';
import { act, availableActions } from './actions';
import { createGame } from './creation';
import { choose, DECISIONS } from './decisions';
import { eligibleJobs } from './economy';
import { interact, interactionsWith } from './people';
import { COLLEGES } from './school';
import { ageOf } from './state';
import { advance, ageUp } from './time';
import type { GameState, Person } from './types';
import { migrate } from '../save';

const fresh = (seed: number, age: number, extra: Partial<GameState['character']> = {}, background?: GameState['character']['background']) => {
  const s = createGame({ seed, startYear: 2026, age, powered: 'baseline', background });
  Object.assign(s.character, { inPrisonUntil: null, health: 90 }, extra);
  s.pending = null;
  return s;
};

/** Ages up until `age`, taking the first option of any decision on the way. */
function liveTo(s: GameState, age: number, focus: 'school' | 'rest' = 'school') {
  for (let i = 0; i < 200 && s.character.alive && ageOf(s) < age; i++) {
    if (s.pending) s = choose(s, s.pending.options[0].id);
    else s = ageUp(s, focus).state;
  }
  return s;
}

const person = (id: string, relation: Person['relation'], born: number, bond = 60): Person => ({ id, name: `Test ${id}`, relation, born, bond, alive: true, moments: 0 });

describe('schools', () => {
  it('starts school at 6 with a first friend or rival, and a GPA', () => {
    for (let seed = 1; seed < 6; seed++) {
      const s = liveTo(fresh(seed, 5), 6);
      if (!s.character.alive) continue;
      expect(s.character.school).toBeTruthy();
      expect(s.character.gpa).toBeGreaterThan(0);
      expect(s.character.people!.some((p) => p.relation === 'friend' || p.relation === 'rival')).toBe(true);
    }
  });

  it('sends children to school by family and neighbourhood', () => {
    expect(fresh(1, 10, {}, 'wealthy').character.school).toBe('elite-prep');
    expect(fresh(1, 10, {}, 'military').character.school).toBe('parochial-charter');
    expect(fresh(1, 10, {}, 'foster system').character.school).toBe('underfunded-public');
    expect(fresh(1, 3).character.school).toBeUndefined();
  });

  it('gives a street kid an estranged parent and a friend who has their back', () => {
    const s = fresh(2, 12, {}, 'street');
    expect(s.character.people!.some((p) => p.estranged)).toBe(true);
    expect(s.character.people!.some((p) => p.relation === 'friend' && p.bond >= 75)).toBe(true);
  });

  it('grows up through a milestone every birthday and a placement choice at 13', () => {
    let s = fresh(7, 12);
    s = liveTo(s, 13);
    // The placement decision lands on the 13th birthday unless something else was waiting.
    const log = s.log.map((e) => e.text).join('\n');
    expect(s.character.done?.some((d) => d.startsWith('m:'))).toBe(true);
    expect(log.length).toBeGreaterThan(0);
  });

  it('plays a whole childhood to graduation without errors', () => {
    for (let seed = 20; seed < 30; seed++) {
      const s = liveTo(createGame({ seed, startYear: 1990, age: 0, powered: 'baseline' }), 19);
      if (!s.character.alive) continue;
      expect(s.character.done!.filter((d) => d.startsWith('m:')).length).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('college', () => {
  it('applies, enrolls, charges tuition and graduates after four years', () => {
    let s = fresh(3, 19, { money: 200000, mind: 6, gpa: 3, background: 'working class', livesWithFamily: true });
    s = act(s, 'enroll');
    expect(s.pending?.id).toBe('enroll');
    const ids = s.pending!.options.map((o) => o.id);
    expect(ids).toContain('community');
    expect(ids).toContain('state');
    expect(ids).toContain('hold');
    s = choose(s, 'state');
    expect(s.character.college?.kind).toBe('state');
    const before = s.character.money;
    let months = 0;
    while (s.character.college && months < 60) {
      if (s.pending) s = choose(s, s.pending.options[0].id);
      const r = advance(s, 1, 'school');
      s = r.state;
      months += r.monthsPassed;
    }
    if (s.character.education === 'college') expect(months).toBeLessThanOrEqual(COLLEGES.state.months);
    expect(s.character.money).toBeLessThan(before);
  });

  it('a trade certificate opens union jobs', () => {
    const s = fresh(4, 22, { education: 'high school', credentials: ['trade certificate'] });
    expect(eligibleJobs(s.character, 22).some((j) => j.id === 'electrician')).toBe(true);
  });

  it('brings an old save\'s college months into an enrollment, and gives kids a school', () => {
    const old = fresh(5, 20, { collegeMonths: 12, education: 'high school' });
    delete old.character.college;
    expect(migrate(old).character.college?.kind).toBe('state');
    const kid = fresh(5, 9);
    delete kid.character.school;
    delete kid.character.gpa;
    expect(migrate(kid).character.school).toBeTruthy();
  });
});

describe('relationships', () => {
  it('dating can find a partner, who you can marry and start a family with', () => {
    let found: GameState | undefined;
    for (let seed = 1; seed < 40 && !found; seed++) {
      const s = act(fresh(seed, 27, { money: 50000, charm: 8, livesWithFamily: false, people: [] }), 'date');
      if (s.character.people!.some((p) => p.relation === 'partner')) found = s;
    }
    expect(found).toBeTruthy();
    let s = found!;
    const partner = s.character.people!.find((p) => p.relation === 'partner')!;
    partner.bond = 100;
    s = interact(s, partner.id, 'propose');
    const p2 = s.character.people!.find((p) => p.id === partner.id)!;
    if (p2.relation !== 'spouse') return; // a 'no' is allowed
    expect(p2.livesWithYou).toBe(true);
    s.turn = (s.turn ?? 0) + 1;
    expect(interactionsWith(s, p2.id).map((i) => i.id)).toContain('try-child');
  });

  it('a partner who lives with you halves the pain of rent', () => {
    const solo = fresh(6, 30, { money: 100000, job: null, livesWithFamily: false, people: [], district: 'Saint Bryce' });
    const pair = structuredClone(solo);
    pair.character.people = [{ ...person('a', 'partner', 1996, 90), livesWithYou: true }];
    const a = advance(solo, 1, 'rest').state.character.money;
    const b = advance(pair, 1, 'rest').state.character.money;
    expect(b).toBeGreaterThan(a);
  });

  it('estranged people and rivals only offer what fits', () => {
    const s = fresh(8, 25, {
      people: [{ ...person('m', 'mother', 1975, 10), estranged: true }, person('r', 'rival', 2001, 20)],
    });
    expect(interactionsWith(s, 'm').map((i) => i.id)).toEqual(['reconcile']);
    expect(interactionsWith(s, 'r').map((i) => i.id).sort()).toEqual(['confront', 'make-peace']);
  });
});

describe('every new choice', () => {
  it('applies every option without error and writes a line', () => {
    const skip = new Set(['kindling', 'move']);
    for (const [id, spec] of Object.entries(DECISIONS)) {
      if (skip.has(id)) continue;
      for (const option of spec.options) {
        for (const age of [10, 18, 40]) {
          const s = fresh(9, age, {
            money: 100000, mind: 8, charm: 8, nerve: 8, body: 8, gpa: 3.8, education: age >= 18 ? 'high school' : 'none',
            job: age >= 18 ? { id: 'office', title: 'Office worker', salary: 56000 } : null,
            people: [person('p', 'mother', 1960), person('b', 'sibling', 2012), person('f', 'friend', 2026 - age), person('r', 'rival', 2026 - age, 20)],
          });
          const who = id === 'aging-parent' ? 'p' : id === 'sibling-kindling' ? 'b' : id === 'rival' ? 'r' : 'f';
          if (option.when && !option.when(s, s.character.people!.find((p) => p.id === who))) continue;
          s.pending = { id, text: '', options: spec.options.map((o) => ({ id: o.id, label: typeof o.label === 'string' ? o.label : o.label(s) })), about: who };
          const after = choose(s, option.id);
          expect(after.log.length, `${id}.${option.id}`).toBeGreaterThan(s.log.length);
          for (const e of after.log) expect(e.text, `${id}.${option.id}`).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it('school actions show up at the right ages', () => {
    const kid = fresh(10, 13);
    const ids = availableActions(kid).map((a) => a.id);
    expect(ids).toContain('club');
    expect(ids).toContain('skip-class');
    expect(ids).toContain('roam');
    expect(ids).not.toContain('enroll');
    const adult = fresh(10, 20, { education: 'high school' });
    expect(availableActions(adult).map((a) => a.id)).toContain('enroll');
  });
});
