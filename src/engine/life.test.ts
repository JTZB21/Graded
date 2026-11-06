import { describe, expect, it } from 'vitest';
import { act, availableActions } from './actions';
import { createGame } from './creation';
import { dollars, hire, JOBS } from './economy';
import { continueAsHeir, setHeir } from './legacy';
import { bankLot, ensureLife, homePrice, housingCost, lifeMonth, lifeOf, netWorth } from './life';
import { Rng } from './random';
import { advance } from './time';
import { migrate, exportCode, importCode } from '../save';
import type { GameState } from './types';

function adult(year = 2026) {
  const s = createGame({ seed: 44, age: 30, startYear: year, powered: 'baseline' });
  s.character.money = dollars(100000, year);
  s.character.job = hire(JOBS.find(j => j.id === 'office')!, year);
  s.character.district = 'Old Foundry'; s.character.livesWithFamily = false;
  s.pending = null; s.energy = 6;
  return s;
}
const view = (s: GameState, id: string) => availableActions(s).find(a => a.id === id)!;

describe('everyday life', () => {
  it('a working adult does not burn out on the default Work focus', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let s = adult(); s.rngState = seed;
      for (let year = 0; year < 15 && s.character.alive; year++) {
        s.pending = null;
        s = advance(s, 12, 'work').state;
      }
      expect(lifeOf(s).stress).toBeLessThan(50);
    }
  });
  it('stress alone never kills', () => {
    const s = adult(); const l = ensureLife(s); l.stress = 100; s.character.health = 30;
    for (let m = 0; m < 24; m++) { l.stress = 100; lifeMonth(s, new Rng(m), 'crime', false); }
    expect(s.character.health).toBeGreaterThanOrEqual(25);
  });
  it('writes money with a dollar sign', () => {
    const s = act(adult(), 'save-money');
    expect(s.log.at(-1)!.text).toMatch(/\$\d/);
  });
  it('migrates old saves without changing cash or consuming dice', () => {
    const s = adult(); delete s.character.life;
    const before = structuredClone(s); const next = migrate(s);
    expect(next.character.life?.credit).toBe(600);
    expect(next.character.money).toBe(s.character.money);
    expect(next.rngState).toBe(s.rngState); expect(s).toEqual(before);
  });
  it('round-trips all new balances and the will', () => {
    const s = adult(); const l = ensureLife(s); l.savings = 1234; l.debt = 456; l.skills.technical = 4;
    expect(importCode(exportCode(s))?.character.life).toEqual(l);
  });
  it.each([1950, 1980, 2026])('conserves transfers and exact debt repayments in %i', year => {
    let s = adult(year); const original = s.character.money;
    s = act(s, 'save-money'); expect(lifeOf(s).savings).toBe(bankLot(s));
    s = act(s, 'withdraw-savings'); expect(s.character.money).toBe(original);
    s = act(s, 'invest-money'); s = act(s, 'sell-investments'); expect(s.character.money).toBe(original);
    ensureLife(s).debt = 17; const cash = s.character.money;
    expect(view(s, 'repay-loan').price).toBe(17);
    s = act(s, 'repay-loan'); expect(lifeOf(s).debt).toBe(0); expect(s.character.money).toBe(cash - 17);
  });
  it('prevents loans being repeated after same-turn repayment', () => {
    let s = act(adult(), 'personal-loan');
    for (let i = 0; i < 5; i++) s = act(s, 'repay-loan');
    expect(view(s, 'personal-loan').disabled).toBe('One loan per turn');
    expect(() => act(s, 'personal-loan')).toThrow();
  });
  it('charges interest, minimum payments and credit penalties monthly', () => {
    const s = adult(); const l = ensureLife(s); l.debt = 5000; l.savings = 12000;
    const cash = s.character.money; lifeMonth(s, new Rng(1), 'rest', false);
    expect(l.savings).toBe(12025); expect(l.debt).toBe(4949); expect(s.character.money).toBe(cash - 101);
    s.character.money = 0; const credit = l.credit;
    lifeMonth(s, new Rng(1), 'rest', false); expect(l.credit).toBe(credit - 5);
  });
  it('uses deterministic investment changes and never negative balances', () => {
    const a = adult(); ensureLife(a).investments = 10000; const b = structuredClone(a);
    lifeMonth(a, new Rng(21), 'family', false); lifeMonth(b, new Rng(21), 'family', false);
    expect(a).toEqual(b); expect(lifeOf(a).investments).toBeGreaterThanOrEqual(0);
  });
  it('gates business on skill and charges energy before opening', () => {
    let s = adult(); expect(view(s, 'start-business').disabled).toContain('enterprise');
    s = act(act(s, 'learn-enterprise'), 'learn-enterprise');
    const before = s.character.money; s = act(s, 'start-business');
    expect(s.energy).toBe(2); expect(s.character.money).toBe(before - 3000);
    expect(lifeOf(s).business?.level).toBe(1);
    lifeMonth(s, new Rng(1), 'family', true); expect(lifeOf(s).business?.profit).toBe(0);
  });
  it('blocks unaffordable actions and all actions during decisions or after death', () => {
    const s = adult(); s.character.money = 0; expect(() => act(s, 'save-money')).toThrow();
    s.pending = { id: 'test', text: 'test', options: [] }; expect(availableActions(s)).toEqual([]);
    s.pending = null; s.character.alive = false; expect(availableActions(s)).toEqual([]);
  });
  it('recovers wellbeing with an action without moving time or changing input', () => {
    const s = adult(); ensureLife(s).stress = 90; const before = structuredClone(s);
    const next = act(s, 'unwind'); expect(lifeOf(next).stress).toBe(65);
    expect(next.date).toEqual(s.date); expect(s).toEqual(before);
  });
  it('sustained stress damages health even during monthly recovery', () => {
    const s = adult(); ensureLife(s).stress = 90; s.character.health = 100;
    const r = advance(s, 1, 'school').state;
    expect(r.character.health).toBeLessThan(100);
  });
  it('requires tenure and performance for promotions and caps repeat promotion', () => {
    let s = adult(); const l = ensureLife(s); l.career.jobId = s.character.job!.id;
    expect(view(s, 'promotion').disabled).toContain('12 months');
    l.career.experience = 12; l.career.performance = 90;
    const salary = s.character.job!.salary; s = act(s, 'promotion');
    expect(s.character.job!.salary).toBe(Math.round(salary * 1.15));
    expect(view(s, 'promotion').disabled).toBe('Already promoted this turn');
  });
  it.each([1950, 2026])('charges exact down payment and replaces rent with ownership costs in %i', year => {
    let s = adult(year); ensureLife(s).credit = 700;
    const cash = s.character.money; const price = homePrice(s);
    s = act(s, 'buy-home'); const h = lifeOf(s).home!;
    expect(s.character.money).toBe(cash - Math.round(price * 0.2));
    expect(h.mortgage).toBe(Math.round(price * 0.8));
    expect(housingCost(s, 1)).toBe(h.payment + Math.round(h.value * 0.015 / 12));
    const debt = h.mortgage; lifeMonth(s, new Rng(1), 'rest', false);
    expect(h.mortgage).toBeLessThan(debt);
    const money = s.character.money; const proceeds = Math.round(h.value * 0.95) - h.mortgage;
    s = act(s, 'sell-home'); expect(s.character.money).toBe(money + proceeds); expect(lifeOf(s).home).toBeNull();
  });
  it('counts home equity and personal debt in net worth', () => {
    const s = adult(); const l = ensureLife(s); l.savings = 1000; l.debt = 2000;
    l.home = { district: 'Old Foundry', value: 100000, mortgage: 80000, payment: 500 };
    expect(netWorth(s)).toBe(s.character.money + 19000);
  });
  it('retirement pays a pension without automatic rehiring by work focus', () => {
    let s = adult(); s.character.born = { year: s.date.year - 65, month: s.date.month };
    const pension = Math.round(s.character.job!.salary * 0.35); s = act(s, 'retire');
    expect(s.character.job).toBeNull(); expect(lifeOf(s).career.pension).toBe(pension);
    const next = advance(s, 1, 'work').state; expect(next.character.job).toBeNull();
  });
});

function family() {
  const s = adult(); s.character.people = [
    { id: 'child-1', name: 'First Child', relation: 'child', born: 2010, alive: true, bond: 70, moments: 3 },
    { id: 'child-2', name: 'Second Child', relation: 'child', born: 2015, alive: true, bond: 60, moments: 2 },
  ];
  return s;
}
describe('legacy', () => {
  it('requires death and a living child', () => {
    const s = family(); expect(() => continueAsHeir(s, 'child-1')).toThrow();
    s.character.alive = false; expect(() => continueAsHeir(s, 'missing')).toThrow();
    expect(() => setHeir(s, 'child-1')).toThrow();
  });
  it('splits the net estate, preserves history and resets powers and financial accounts', () => {
    const s = family(); ensureLife(s).savings = 2000; ensureLife(s).debt = 1000;
    s.character.alive = false; const before = structuredClone(s);
    const next = continueAsHeir(s, 'child-1');
    expect(next.character.money).toBe(Math.floor(netWorth(s) / 2));
    expect(next.character.name).toBe('First Child'); expect(next.character.alive).toBe(true);
    expect(next.character.life?.savings).toBe(0); expect(next.character.powers).toEqual([]);
    expect(next.log.slice(0, s.log.length)).toEqual(s.log); expect(s).toEqual(before);
    expect(next.character.people?.find(p => p.id === 'child-2')?.relation).toBe('sibling');
  });
  it('honours a named heir; a different child receives no estate', () => {
    const s = setHeir(family(), 'child-2'); s.character.alive = false;
    expect(continueAsHeir(s, 'child-1').character.money).toBe(0);
    expect(continueAsHeir(s, 'child-2').character.money).toBe(netWorth(s));
  });
  it('falls back to equal shares when the named heir dies and never inherits debt', () => {
    const s = setHeir(family(), 'child-2'); s.character.people![1].alive = false;
    s.character.money = -1; ensureLife(s).debt = 10000; s.character.alive = false;
    expect(continueAsHeir(s, 'child-1').character.money).toBe(0);
  });
});

describe('property obligations and career transitions', () => {
  it('charges an unoccupied home during prison and settles foreclosure once', () => {
    const s = adult(); const l = ensureLife(s);
    l.home = { district: 'Old Foundry', value: 100000, mortgage: 80000, payment: 500 };
    const cash = s.character.money;
    lifeMonth(s, new Rng(3), 'rest', true);
    expect(s.character.money).toBe(cash - 625);
    s.character.money = -100000; const credit = l.credit;
    lifeMonth(s, new Rng(3), 'rest', true);
    expect(l.home).toBeNull(); expect(l.credit).toBe(credit - 100);
    const after = s.character.money; lifeMonth(s, new Rng(3), 'rest', true);
    expect(s.character.money).toBe(after);
  });
  it('ends retirement when deliberately returning to the same job', () => {
    const s = adult(); const l = ensureLife(s);
    l.career.jobId = s.character.job!.id; l.career.retired = true; l.career.pension = 10000;
    const cash = s.character.money; lifeMonth(s, new Rng(2), 'work', false);
    expect(l.career.retired).toBe(false); expect(l.career.pension).toBe(0);
    expect(s.character.money).toBe(cash);
  });
});
