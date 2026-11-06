// Original everyday-life mechanics. All balances are in current-year dollars.
import { dollars, RENT } from './economy';
import { clamp } from './rules';
import { ageOf } from './state';
import type { Rng } from './random';
import type { Focus, GameState, District } from './types';
import { say } from './writer/writer';

export interface Life {
  happiness: number;
  stress: number;
  savings: number;
  investments: number;
  debt: number;
  credit: number;
  home: { district: District; value: number; mortgage: number; payment: number } | null;
  career: { jobId: string | null; experience: number; performance: number; level: number; retired: boolean; pension: number };
  business: { level: number; reputation: number; profit: number } | null;
  skills: { creative: number; technical: number; enterprise: number };
  will: string | null;
  used: Record<string, number>;
}

export function lifeOf(s: GameState): Life {
  return s.character.life ?? {
    happiness: 65, stress: 15, savings: 0, investments: 0, debt: 0, credit: 600,
    home: null, career: { jobId: null, experience: 0, performance: 50, level: 1, retired: false, pension: 0 },
    business: null, skills: { creative: 0, technical: 0, enterprise: 0 }, will: null, used: {},
  };
}

/** Additive save migration. Reading a sheet never mutates the save. */
export function ensureLife(s: GameState): Life {
  return s.character.life ??= lifeOf(s);
}

export const homePrice = (s: GameState) => dollars(RENT[s.character.district] * 180, s.date.year);
export const bankLot = (s: GameState) => Math.max(1, dollars(1000, s.date.year));
export const netWorth = (s: GameState) => {
  const l = lifeOf(s);
  return s.character.money + l.savings + l.investments + (l.home ? l.home.value - l.home.mortgage : 0) - l.debt;
};

/** Cost replacing rent only when this is the home the character actually occupies. */
export function housingCost(s: GameState, share: number): number {
  const l = lifeOf(s);
  if (l.home?.district === s.character.district) return l.home.payment + Math.round(l.home.value * 0.015 / 12);
  return dollars(RENT[s.character.district] * share, s.date.year);
}

export function lifeMonth(s: GameState, rng: Rng, focus: Focus, imprisoned: boolean) {
  const l = ensureLife(s);
  const c = s.character;
  const age = ageOf(s);
  // Interest, mortgages and debt continue while imprisoned; work does not.
  l.savings += Math.round(l.savings * 0.025 / 12);
  if (l.investments > 0) l.investments = Math.max(0, Math.round(l.investments * (1 + rng.int(-6, 7) / 100)));
  if (l.debt > 0) {
    l.debt += Math.round(l.debt * 0.12 / 12);
    const due = Math.min(l.debt, Math.max(dollars(25, s.date.year), Math.round(l.debt * 0.02)));
    if (c.money >= due) { c.money -= due; l.debt -= due; l.credit = clamp(l.credit + 1, 300, 850); }
    else { l.credit = clamp(l.credit - 5, 300, 850); l.stress += 2; }
  }
  if (l.home) {
    const h = l.home;
    if (imprisoned || c.livesWithFamily || c.district !== h.district) c.money -= h.payment + Math.round(h.value * 0.015 / 12);
    const interest = Math.round(h.mortgage * 0.05 / 12);
    h.mortgage = Math.max(0, h.mortgage + interest - h.payment);
    if (h.mortgage === 0) h.payment = 0;
    if (c.money < -dollars(RENT[h.district] * 6, s.date.year)) {
      c.money += Math.round(h.value * 0.9) - h.mortgage;
      l.home = null; l.credit = clamp(l.credit - 100, 300, 850);
      say(s, rng, 'money', 'life.home-lost');
    }
  }
  if (!imprisoned && l.business) {
    const b = l.business;
    const gross = dollars(b.level * (100 + l.skills.enterprise * 12), s.date.year);
    b.profit = rng.chance(0.15) ? -dollars(300 * b.level, s.date.year) : Math.round(gross * b.reputation / 50);
    c.money += b.profit; l.stress += 1;
  } else if (l.business) l.business.profit = 0;
  if (!imprisoned && c.job) {
    if (l.career.jobId !== c.job.id || l.career.retired) {
      l.career = { jobId: c.job.id, experience: 0, performance: 50, level: 1, retired: false, pension: 0 };
    }
    l.career.experience++;
    l.career.performance = clamp(l.career.performance + (focus === 'work' ? 2 : -1) - (l.stress >= 80 ? 2 : 0) - (l.happiness < 25 ? 1 : 0), 0, 100);
    l.stress += focus === 'work' ? 2 : 1;
  }
  if (!imprisoned && l.career.retired) c.money += Math.round(l.career.pension / 12);
  l.stress += focus === 'rest' ? -5 : focus === 'family' ? -2 : focus === 'crime' ? 2 : 0;
  if (c.money < 0 && age >= 18) l.stress += 2;
  l.stress = clamp(l.stress, 0, 100);
  l.happiness = clamp(l.happiness + (focus === 'family' || focus === 'rest' ? 1 : 0) - (l.stress >= 75 ? 2 : 0), 0, 100);
  if (l.stress >= 85) c.health = Math.max(0, c.health - 5);
}

export function lifeBirthday(s: GameState, rng: Rng) {
  const l = ensureLife(s);
  if (l.home) l.home.value = Math.round(l.home.value * (1 + rng.int(-3, 6) / 100));
  if (l.stress >= 75) say(s, rng, 'life', 'life.burnout');
  if (ageOf(s) >= 18) say(s, rng, 'money', 'life.accounts', { savings: l.savings, investments: l.investments, debt: l.debt });
}
