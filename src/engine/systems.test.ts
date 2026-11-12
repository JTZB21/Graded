// Organisations, gear, health over a lifetime and soft stat caps.
import { describe, expect, it } from 'vitest';
import { act, availableActions } from './actions';
import { createGame } from './creation';
import { choose, offer } from './decisions';
import { effective, GUARD, injure, TOP_TIER } from './gear';
import { ORGS, STANDING_NEEDED } from './orgs';
import { Rng } from './random';
import { sheetRows } from './sheet';
import { ageHealth, changeAttr, changeRep, healthCap, monthlyRegen } from './state';
import { ageUp } from './time';
import { migrate } from '../save';
import type { GameState } from './types';

const adult = (seed = 21, extra: Partial<GameState['character']> = {}, year = 2026) => {
  const s = createGame({ seed, startYear: year, age: 25 });
  Object.assign(s.character, { inPrisonUntil: null, health: 80, money: 50000, record: [] }, extra);
  s.pending = null;
  return s;
};
const ids = (s: GameState) => availableActions(s).map((a) => a.id);
const view = (s: GameState, id: string) => availableActions(s).find((a) => a.id === id);

describe('health over a lifetime', () => {
  it('stays full to 50, then falls 1 a year and 2 after 70, never below 25', () => {
    expect(healthCap(30)).toBe(100);
    expect(healthCap(50)).toBe(100);
    expect(healthCap(60)).toBe(90);
    expect(healthCap(70)).toBe(80);
    expect(healthCap(80)).toBe(60);
    expect(healthCap(120)).toBe(25);
  });

  it('trims health to the cap on a birthday and heals more slowly with age', () => {
    const s = adult();
    s.character.health = 100;
    ageHealth(s.character, 75);
    expect(s.character.maxHealth).toBe(70);
    expect(s.character.health).toBe(70);
    expect(monthlyRegen(30, false)).toBeGreaterThan(monthlyRegen(75, false));
    expect(monthlyRegen(30, true)).toBe(monthlyRegen(30, false) * 3);
  });

  it('starts an older character below full health', () => {
    const s = createGame({ seed: 3, startYear: 2026, age: 72 });
    expect(s.character.maxHealth).toBe(healthCap(72));
    expect(s.character.health).toBeLessThanOrEqual(healthCap(72));
  });
});

describe('soft caps', () => {
  it('makes each reputation point past 90 take two gains', () => {
    const c = adult().character;
    c.fame = 90;
    changeRep(c, 'fame', 1);
    expect(c.fame).toBe(90);
    changeRep(c, 'fame', 1);
    expect(c.fame).toBe(91);
    changeRep(c, 'fame', -5);
    expect(c.fame).toBe(86);
    c.infamy = -95;
    changeRep(c, 'infamy', -2);
    expect(c.infamy).toBe(-96);
  });

  it('makes the last attribute point take two gains', () => {
    const c = adult().character;
    c.body = 8;
    changeAttr(c, 'body', 1);
    expect(c.body).toBe(9);
    changeAttr(c, 'body', 1);
    expect(c.body).toBe(9);
    changeAttr(c, 'body', 1);
    expect(c.body).toBe(10);
  });
});

describe('gear', () => {
  it('buys tiers in order and adds to rolls, not to the stat', () => {
    let s = adult(21, { charm: 5 });
    expect(view(s, 'gear-style')?.label).toMatch(/^Buy /);
    s = act(s, 'gear-style');
    expect(s.character.gear?.style).toBe(1);
    expect(s.character.charm).toBe(5);
    expect(effective(s.character, 'charm')).toBe(6);
    expect(view(s, 'gear-style')?.label).toMatch(/^Upgrade to /);
    expect(s.log.at(-1)?.text).toBeTruthy();
  });

  it('keeps the top tiers for licensed heroes and ranked members', () => {
    const s = adult(21, { gear: { armor: 4 }, license: 'Civilian' });
    expect(view(s, 'gear-armor')?.disabled).toMatch(/license/);
    s.character.license = 'Vigilance';
    expect(view(s, 'gear-armor')?.disabled).toBeUndefined();
    s.character.gear = { armor: TOP_TIER };
    expect(ids(s)).not.toContain('gear-armor');
  });

  it('armor turns part of every injury aside, and each tier does more', () => {
    for (let t = 2; t < GUARD.length; t++) expect(GUARD[t] / GUARD[t - 1]).toBeGreaterThan(1.3);
    const c = adult(21, { health: 100, gear: { armor: 6 } }).character;
    injure(c, 50);
    expect(c.health).toBe(70);
  });

  it('loses the weapon to an arrest', () => {
    const s = adult(21, { gear: { weapon: 3, armor: 2 } });
    s.character.inPrisonUntil = null;
    // Steal until caught (the dice are seeded, so this ends).
    let t = s;
    for (let i = 0; i < 300 && !t.character.inPrisonUntil; i++) {
      t.energy = 6;
      t = act(t, 'steal', 0);
    }
    expect(t.character.inPrisonUntil).toBeTruthy();
    expect(t.character.gear?.weapon).toBeUndefined();
    expect(t.character.gear?.armor).toBe(2);
  });
});

describe('organisations', () => {
  it('offers only groups that exist in the year', () => {
    expect(ids(adult(21, {}, 2026))).toContain('org-join-equal-ground');
    const early = adult(21, {}, 1995);
    expect(ids(early)).not.toContain('org-join-low-kings');
    expect(ids(early)).toContain('org-join-choir');
  });

  it('joins at the bottom, earns standing, and is promoted only past the bar', () => {
    let s = adult(21, { charm: 3, fame: 0 });
    s = act(s, 'org-join-equal-ground');
    expect(s.character.org).toMatchObject({ id: 'equal-ground', rank: 0, standing: 0 });
    expect(s.character.ties).toContain('Equal Ground');
    expect(view(s, 'org-promote')?.disabled).toMatch(/Standing/);
    for (let i = 0; i < 6 && s.character.org!.standing < STANDING_NEEDED[0]; i++) {
      s.energy = 6;
      s = act(s, 'org-work');
    }
    expect(s.character.org!.standing).toBe(STANDING_NEEDED[0]);
    s.character.charm = 3;
    expect(view(s, 'org-promote')?.disabled).toMatch(/Charm 4/);
    s.character.charm = 4;
    s = act(s, 'org-promote');
    expect(s.character.org).toMatchObject({ rank: 1, standing: 0 });
    expect(sheetRows(s).find((r) => r.label === 'Organisation')?.value).toContain(ORGS['equal-ground'].ranks[1]);
  });

  it('keeps rivals apart and allows one group at a time', () => {
    const s = adult(21, { ties: ['Low Kings'], infamy: 20 });
    expect(view(s, 'org-join-choir')?.disabled).toMatch(/Low Kings/);
    const t = act(adult(21, { district: 'Riverside Docks' }), 'org-join-low-kings');
    expect(ids(t).filter((id) => id.startsWith('org-join'))).toEqual([]);
  });

  it('pays the stipend for a rank on the birthday and drifts standing when idle', () => {
    const s = adult(21, { org: { id: 'choir', rank: 2, standing: 40, since: 2020 }, ties: ['the Choir'] });
    const before = s.character.money;
    const after = ageUp(s, 'rest').state;
    expect(after.log.some((e) => e.text.includes('Choir'))).toBe(true);
    expect(after.character.org!.standing).toBeLessThan(40);
    expect(after.character.money).toBeGreaterThan(before - 100000);
  });

  it('walking away ends the tie', () => {
    let s = adult(21, { org: { id: 'aurelian', rank: 1, standing: 0, since: 2020 }, ties: ['Aurelian'], graded: true });
    s = act(s, 'org-leave');
    expect(s.character.org).toBeNull();
    expect(s.character.ties).not.toContain('Aurelian');
  });

  it('joining through a choice starts a membership', () => {
    const s = adult(21, { district: 'Riverside Docks' });
    offer(s, new Rng(1), 'low-kings', 'event.low-kings');
    const after = choose(s, 'join');
    expect(after.character.org?.id).toBe('low-kings');
  });

  it('upgrades an old save: a tie becomes a membership and health gets its cap', () => {
    const s = adult(21, { ties: ['the Choir'] });
    delete s.character.org;
    delete s.character.maxHealth;
    const m = migrate(s);
    expect(m.character.org).toMatchObject({ id: 'choir', rank: 0 });
    expect(m.character.maxHealth).toBe(100);
  });
});
