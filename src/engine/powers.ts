// Kindling, Grade growth, reassessment and the Fade.

import { kindlingRank, powerCount, secondaryRank, type Category, type Rank } from './rules';
import type { Rng } from './random';
import { ageOf, GRADE_STEP_MONTHS, nextGrade, rollCategory } from './state';
import type { GameState } from './types';
import { say } from './writer/writer';

export interface KindleOptions {
  category?: Category;
  /** Player-chosen primary rank; skips the Kindling roll. */
  rank?: Rank;
  description?: string;
}

/** The Kindling: roll Rank (Fate) and power count (World), issue Grade I and a Civilian license. */
export function kindle(s: GameState, rng: Rng, opts: KindleOptions = {}) {
  const c = s.character;
  const rank = opts.rank ?? kindlingRank(rng.d100);
  const count = powerCount(rng.d100);
  const category = opts.category ?? rollCategory(rng);
  c.graded = true;
  c.kindleAge = null;
  delete c.pendingPower;
  c.grade = 'I';
  c.gradeProgress = 0;
  c.masteryPotential = rng.chance(0.12);
  c.license = 'Civilian';
  c.powers = [{ rank, category, description: opts.description ?? '' }];
  for (let i = 1; i < count; i++) {
    c.powers.push({ rank: secondaryRank(rank, rng.d100), category: rollCategory(rng), description: '' });
  }
  const extra = c.powers.length > 1 ? ` with ${c.powers.length - 1} secondary power${c.powers.length > 2 ? 's' : ''} (${c.powers.slice(1).map((p) => `${p.rank} ${p.category}`).join(', ')})` : '';
  say(s, rng, 'power', 'power.assessed', { extra });
  if (rank === 'S' || rank === 'SS' || rank === 'Ω') say(s, rng, 'power', 'power.strategic');
}

/** Monthly practice. `training` is true when the month's focus is training. */
export function practice(s: GameState, rng: Rng, training: boolean) {
  const c = s.character;
  if (!c.graded || !c.grade || c.powersGone) return;
  gainProgress(s, rng, (training ? 1 : 0.1) * ageRate(ageOf(s)));
}

/** Age multiplier on practice: the young learn fast, the old slowly. */
export function ageRate(age: number): number {
  return age < 18 ? 1 : age <= 30 ? 1.5 : age <= 44 ? 1 : age <= 59 ? 0.5 : 0.25;
}

/** Adds months of practice and raises the Grade when the step is complete. */
export function gainProgress(s: GameState, rng: Rng, months: number) {
  const c = s.character;
  if (!c.graded || !c.grade || c.powersGone) return;
  c.gradeProgress += months;
  const next = nextGrade(c.grade);
  if (!next || c.gradeProgress < GRADE_STEP_MONTHS[c.grade]) return;
  if (next === 'V' && !c.masteryPotential) return;
  c.grade = next;
  c.gradeProgress = 0;
  say(s, rng, 'power', `power.grade-${next}`);
}

/** Yearly checks on the character's birthday month: reassessment, the Fade, going dark. */
export function birthdayChecks(s: GameState, rng: Rng) {
  const c = s.character;
  const age = ageOf(s);
  if (c.graded && !c.powersGone) {
    if (age <= 25 || age % 3 === 0) say(s, rng, 'power', 'power.reassessment');
    const fadeCategory = c.powers[0].category === 'COR' || c.powers[0].category === 'KIN';
    // The Fade: COR and KIN lose roughly one effective Grade every 7-10 years from 45.
    if (age >= 45 && fadeCategory && c.grade !== 'I' && rng.chance(0.12)) {
      c.grade = c.grade === 'II' ? 'I' : c.grade === 'III' ? 'II' : c.grade === 'IV' ? 'III' : 'IV';
      say(s, rng, 'power', 'power.fade-drop');
    }
    if (age === 45) say(s, rng, 'power', fadeCategory ? 'power.fade-begins' : 'power.fade-spared');
    // About 40% of Graded over 60 go dark; ~2% a year compounds to that by the mid-80s.
    if (age >= 60 && rng.chance(0.02)) {
      c.powersGone = true;
      c.license = 'none';
      say(s, rng, 'power', 'power.go-dark');
    }
  }
  // School screenings at 12, 15 and 18 (mandatory since 1981).
  if ((age === 12 || age === 15 || age === 18) && s.date.year >= 1981 && !c.graded) {
    say(s, rng, 'life', c.kindleAge !== null ? 'life.screening-positive' : 'life.screening-negative');
  }
}
