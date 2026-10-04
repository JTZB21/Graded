// Time skips: the engine ticks month by month, applies the focus, and rolls events.

import timeline from '../data/timeline.json';
import lore from '../data/lore.json';
import { crimePay, dollars, eligibleJobs, hire, jobLicense, livingCost, prisonName, RENT, sentence } from './economy';
import { EVENT_CHANCE, EVENTS } from './events';
import { birthdayChecks, kindle, practice } from './powers';
import { Rng } from './random';
import { addMonths, ageOf, before, changeAttr, changeRep, log } from './state';
import type { Focus, GameState } from './types';

export interface SkipResult {
  state: GameState;
  monthsPassed: number;
  /** Why the skip stopped early, if it did. */
  stoppedBy?: 'event' | 'kindling' | 'death';
}

export const FOCUS_LABELS: Record<Focus, string> = {
  school: 'School and study',
  work: 'Work and career',
  train: 'Train your power',
  crime: 'Crime',
  family: 'Family and friends',
  rest: 'Rest and recover',
};

/** Focuses that make sense at this age. Under-16s cannot work; only the Graded train powers. */
export function availableFocuses(s: GameState): Focus[] {
  const age = ageOf(s);
  if (age < 5) return ['family'];
  const out: Focus[] = ['school', 'family', 'rest'];
  if (age >= 16) out.push('work');
  if (s.character.graded && !s.character.powersGone) out.push('train');
  else if (age >= 12) out.push('train'); // baseline training builds Body and Nerve
  if (age >= 12) out.push('crime');
  return out;
}

const regionalSources = new Set(lore.filter((e) => e.kind === 'region' && e.title !== 'World Overview').map((e) => e.title));
const worldHistory = timeline.filter((t) => !regionalSources.has(t.source));

// Annual chance of dying of natural causes by age.
function mortality(age: number): number {
  if (age < 40) return 0.001;
  if (age < 60) return 0.005;
  if (age < 70) return 0.015;
  if (age < 80) return 0.04;
  if (age < 90) return 0.1;
  return 0.2;
}

export function advance(state: GameState, months: number, focus: Focus): SkipResult {
  const s: GameState = structuredClone(state);
  const c = s.character;
  const rng = new Rng(s.rngState);
  let passed = 0;
  let stoppedBy: SkipResult['stoppedBy'];
  const startMoney = c.money;
  const tally = { crimeJobs: 0, crimeTake: 0 };

  while (passed < months && c.alive && !stoppedBy) {
    s.date = addMonths(s.date, 1);
    passed++;
    const age = ageOf(s);

    if (s.date.month === 1) {
      for (const h of worldHistory.filter((t) => t.year === s.date.year)) log(s, 'world', h.text);
    }

    if (s.date.month === c.born.month) {
      log(s, 'life', `You turn ${age}.`);
      birthdayChecks(s, rng);
      if (age === 18 && c.education === 'none' && focus !== 'crime') {
        c.education = 'high school';
        log(s, 'life', 'You graduate high school.');
      }
      if (age === 19 && c.livesWithFamily) {
        c.livesWithFamily = false;
        log(s, 'life', `You move out and rent your own place in ${c.district}.`);
      }
      if (c.kindleAge !== null && age >= c.kindleAge) {
        log(s, 'power', 'Something comes out of you that should not have. The school sends you home; the Bureau sends a car.');
        kindle(s, rng, c.pendingPower ?? {});
        stoppedBy = 'kindling';
      }
    }

    const imprisoned = c.inPrisonUntil && before(s.date, c.inPrisonUntil);
    if (c.inPrisonUntil && !imprisoned) {
      c.inPrisonUntil = null;
      log(s, 'law', 'You are released. The bus ticket home is the last thing the state pays for.');
    }

    if (!imprisoned) {
      applyFocus(s, rng, focus, age, tally);
      // Take-home pay after a flat 25% for tax.
      if (c.job) c.money += Math.round((c.job.salary * 0.75) / 12);
      if (c.job?.id === 'regional-hero' || c.job?.id === 'national-hero') {
        if (rng.chance(0.5)) changeRep(c, 'fame', 1);
      }
      if (!c.livesWithFamily) {
        c.money -= dollars(RENT[c.district] + livingCost(c.graded), s.date.year);
        if (c.money < -dollars(RENT[c.district] * 3, s.date.year) && c.district !== 'Old Foundry') {
          log(s, 'money', `Three months behind on rent, you are evicted and end up in a room in the Old Foundry.`);
          c.district = 'Old Foundry';
        }
      }
    }
    if (c.graded) practice(s, focus === 'train' && !imprisoned);

    c.health = Math.min(100, c.health + (focus === 'rest' ? 12 : 4));
    c.strain = focus === 'train' && c.graded && !c.powersGone ? 15 : 0;

    if (!imprisoned && rng.chance(EVENT_CHANCE)) {
      const ctx = { age, focus };
      const ev = rng.weighted(EVENTS.map((e) => ({ item: e, weight: e.weight(c, ctx) })));
      if (ev?.run(s, rng, ctx)?.pause) stoppedBy = 'event';
    }

    if (c.health <= 0 || rng.chance(mortality(age) / 12)) {
      c.alive = false;
      log(s, 'death', c.health <= 0 ? `You die of your injuries at ${age}.` : `You die at ${age}.`);
      stoppedBy = 'death';
    }
  }

  if (tally.crimeJobs) {
    log(s, 'money', `${tally.crimeJobs} job${tally.crimeJobs > 1 ? 's' : ''} went off clean, for $${tally.crimeTake.toLocaleString()} in total.`);
  }
  if (passed >= 6) {
    const delta = c.money - startMoney;
    log(s, 'money', `Over ${passed} months your money ${delta >= 0 ? 'grew' : 'fell'} by $${Math.abs(delta).toLocaleString()}.`);
  }
  s.rngState = rng.state;
  return { state: s, monthsPassed: passed, stoppedBy };
}

function applyFocus(s: GameState, rng: Rng, focus: Focus, age: number, tally: { crimeJobs: number; crimeTake: number }) {
  const c = s.character;
  switch (focus) {
    case 'school':
      if (rng.chance(0.02)) changeAttr(c, 'mind', 1);
      if (age >= 18 && c.education !== 'college') {
        c.collegeMonths++;
        if (c.background !== 'wealthy') c.money -= dollars(900, s.date.year);
        if (c.collegeMonths >= 36) {
          c.education = 'college';
          log(s, 'life', 'You graduate from Harlan State University.');
        }
      }
      break;
    case 'work':
      if (!c.job && age >= 16 && rng.chance(0.2 + c.charm * 0.03)) {
        const jobs = eligibleJobs(c, age);
        if (jobs.length) {
          const spec = rng.pick(jobs.slice(0, 2));
          c.job = hire(spec, s.date.year);
          const lic = jobLicense(spec.id);
          if (lic) c.license = lic;
          log(s, 'money', `You are hired: ${c.job.title}, $${c.job.salary.toLocaleString()} a year.${lic ? ` The Bureau issues a ${lic} License.` : ''}`);
        }
      }
      break;
    case 'train':
      if (!c.graded && rng.chance(0.02)) changeAttr(c, rng.chance(0.5) ? 'body' : 'nerve', 1);
      break;
    case 'crime': {
      if (!rng.chance(0.5)) break;
      const rank = c.graded && !c.powersGone ? c.powers[0].rank : undefined;
      const [lo, hi] = crimePay(rank);
      const take = dollars(rng.int(lo, hi), s.date.year);
      c.money += take;
      changeRep(c, 'streetCred', rng.int(1, 3));
      changeRep(c, 'infamy', 1);
      // Arrest odds rise with Infamy and fall with Nerve.
      if (rng.chance(Math.max(0.01, 0.05 + c.infamy / 1000 - c.nerve * 0.003))) {
        const months = sentence(rng.int(6, 30), rank);
        c.record.push({ year: s.date.year, offense: rank ? 'Unlicensed power use in a felony' : 'Armed robbery', sentenceMonths: months });
        c.inPrisonUntil = addMonths(s.date, months);
        c.job = null;
        if (c.license === 'Vigilance' || c.license === 'Utility') c.license = 'Civilian';
        log(s, 'law', `Arrested. You are sentenced to ${months} months in ${prisonName(rank, s.date.year)}.`);
      } else {
        tally.crimeJobs++;
        tally.crimeTake += take;
      }
      break;
    }
    case 'family':
      if (rng.chance(0.015)) changeAttr(c, 'charm', 1);
      break;
    case 'rest':
      break;
  }
}
