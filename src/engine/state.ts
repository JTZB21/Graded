import { CATEGORIES, clamp, GRADES, lifeStage, REPUTATION_MAX, REPUTATION_MIN, type Category, type Grade } from './rules';
import type { Rng } from './random';
import type { Character, GameState, LogEntry, YearMonth } from './types';

export function ageAt(born: YearMonth, date: YearMonth): number {
  return date.year - born.year - (date.month < born.month ? 1 : 0);
}

export const ageOf = (s: GameState) => ageAt(s.character.born, s.date);
export const stageOf = (s: GameState) => lifeStage(ageOf(s), s.character.graded);

export function log(s: GameState, kind: LogEntry['kind'], text: string) {
  s.log.push({ date: { ...s.date }, kind, text });
}

export function addMonths(d: YearMonth, months: number): YearMonth {
  const total = d.year * 12 + (d.month - 1) + months;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export const before = (a: YearMonth, b: YearMonth) => a.year * 12 + a.month < b.year * 12 + b.month;

export type Reputation = 'fame' | 'infamy' | 'streetCred';
export type Attribute = 'body' | 'mind' | 'charm' | 'nerve';

/** Past this share of a stat's limit, every further point outward takes two gains (soft cap). */
export const SOFT_CAP = 0.9;

/**
 * Moves a stat by whole points. A point that carries it further past 90% of its limit (away from 0)
 * counts half: the half is banked on the character and pays out on the next gain, so stats stay whole.
 */
function soften(c: Character, stat: Reputation | Attribute, cur: number, by: number, max: number): number {
  const steps = Math.round(by);
  if (!steps) return cur;
  const sign = Math.sign(steps);
  const limit = max * SOFT_CAP;
  let v = cur;
  for (let i = 0; i < Math.abs(steps); i++) {
    if (sign * v >= limit && sign * v < max) {
      const soft = (c.soft ??= {});
      const banked = (soft[stat] ?? 0) + 0.5;
      if (banked >= 1) {
        v += sign;
        soft[stat] = banked - 1;
      } else soft[stat] = banked;
    } else v += sign;
  }
  return v;
}

export function changeRep(c: Character, stat: Reputation, by: number) {
  c[stat] = clamp(soften(c, stat, c[stat], by, REPUTATION_MAX), REPUTATION_MIN, REPUTATION_MAX);
}

export function changeAttr(c: Character, stat: Attribute, by: number) {
  c[stat] = clamp(soften(c, stat, c[stat], by, 10), 1, 10);
}

/**
 * Most health you can have at an age: full until 50, then 1 less a year, 2 less a year after 70,
 * never below 25.
 */
export function healthCap(age: number): number {
  return Math.max(25, 100 - Math.max(0, age - 50) - Math.max(0, age - 70));
}

/** Health below this is low: natural death is twice as likely. */
export const LOW_HEALTH = 30;

export const maxHealth = (c: Character) => c.maxHealth ?? 100;

/** Raises health, never past the character's current most. */
export function heal(c: Character, by: number) {
  c.health = Math.max(0, Math.min(maxHealth(c), c.health + by));
}

/** Health regained each month: 4 until 50, 3 until 70, 2 after (three times that when resting). */
export function monthlyRegen(age: number, resting: boolean): number {
  const base = age < 50 ? 4 : age < 70 ? 3 : 2;
  return resting ? base * 3 : base;
}

/** Sets the most health for the character's age and trims health to it (each birthday). */
export function ageHealth(c: Character, age: number) {
  c.maxHealth = healthCap(age);
  c.health = Math.min(c.health, c.maxHealth);
}

/** Months of practice needed to leave each Grade: I->II months, II->III 1-3 years, III->IV 3-6 years, IV->V a decade+. */
export const GRADE_STEP_MONTHS: Record<Grade, number> = { I: 6, II: 24, III: 54, IV: 120, V: Infinity };

export const nextGrade = (g: Grade): Grade | null => GRADES[GRADES.indexOf(g) + 1] ?? null;

/** CAU is the rarest category; everything else is roughly even. */
export function rollCategory(rng: Rng): Category {
  const keys = Object.keys(CATEGORIES) as Category[];
  return rng.weighted(keys.map((k) => ({ item: k, weight: k === 'CAU' ? 2 : k === 'ANO' ? 5 : 12 })))!;
}

export const notation = (c: Character) =>
  c.graded && c.powers.length ? `${c.powers[0].rank}-${c.grade} ${c.powers[0].category}` : 'Baseline';
