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
export function changeRep(c: Character, stat: Reputation, by: number) {
  c[stat] = clamp(c[stat] + by, REPUTATION_MIN, REPUTATION_MAX);
}

export type Attribute = 'body' | 'mind' | 'charm' | 'nerve';
export function changeAttr(c: Character, stat: Attribute, by: number) {
  c[stat] = clamp(c[stat] + by, 1, 10);
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
