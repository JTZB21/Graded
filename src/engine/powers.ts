// Kindling, Grade growth, reassessment and the Fade.

import { kindlingRank, powerCount, secondaryRank, type Category, type Rank } from './rules';
import type { Rng } from './random';
import { ageOf, GRADE_STEP_MONTHS, log, nextGrade, notation, rollCategory } from './state';
import type { GameState } from './types';

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
  log(s, 'power', `Kindling. Bureau Assessment ranks you ${notation(c)}${extra}.${s.date.year >= 1978 ? ' A Grade Card is issued.' : ''}`);
  if (rank === 'S' || rank === 'SS' || rank === 'Ω') {
    log(s, 'power', 'The Halden Commission is notified. From today you are a strategic asset, tracked by treaty.');
  }
}

/** Monthly practice. `training` is true when the month's focus is training. */
export function practice(s: GameState, training: boolean) {
  const c = s.character;
  if (!c.graded || !c.grade || c.powersGone) return;
  const age = ageOf(s);
  const ageRate = age < 18 ? 1 : age <= 30 ? 1.5 : age <= 44 ? 1 : age <= 59 ? 0.5 : 0.25;
  c.gradeProgress += (training ? 1 : 0.1) * ageRate;
  const next = nextGrade(c.grade);
  if (!next || c.gradeProgress < GRADE_STEP_MONTHS[c.grade]) return;
  if (next === 'V' && !c.masteryPotential) return;
  c.grade = next;
  c.gradeProgress = 0;
  log(s, 'power', `Your control improves. You are now Grade ${next} (${notation(c)}).`);
  if (c.grade === 'II') log(s, 'power', 'You can now hold a Utility job without hurting anyone.');
}

/** Yearly checks on the character's birthday month: reassessment, the Fade, going dark. */
export function birthdayChecks(s: GameState, rng: Rng) {
  const c = s.character;
  const age = ageOf(s);
  if (c.graded && !c.powersGone) {
    if (age <= 25 || age % 3 === 0) log(s, 'power', `Bureau reassessment: ${notation(c)} confirmed.`);
    const fadeCategory = c.powers[0].category === 'COR' || c.powers[0].category === 'KIN';
    // The Fade: COR and KIN lose roughly one effective Grade every 7-10 years from 45.
    if (age >= 45 && fadeCategory && c.grade !== 'I' && rng.chance(0.12)) {
      c.grade = c.grade === 'II' ? 'I' : c.grade === 'III' ? 'II' : c.grade === 'IV' ? 'III' : 'IV';
      log(s, 'power', `The Fade. Your output drops; the Bureau marks you down to ${notation(c)}.`);
    }
    if (age === 45) log(s, 'power', 'You notice it first in recovery: Strain lingers longer than it used to. The Fade has begun.');
    // About 40% of Graded over 60 go dark; ~2% a year compounds to that by the mid-80s.
    if (age >= 60 && rng.chance(0.02)) {
      c.powersGone = true;
      c.license = 'none';
      log(s, 'power', 'You go dark. One morning the power simply is not there, and it does not come back.');
    }
  }
  // School screenings at 12, 15 and 18 (mandatory since 1981).
  if ((age === 12 || age === 15 || age === 18) && s.date.year >= 1981 && !c.graded) {
    log(s, 'life', `Age ${age} school Kindle Marker screening: ${c.kindleAge !== null ? 'marker-positive. Teachers start watching you.' : 'standard odds.'}`);
  }
}
