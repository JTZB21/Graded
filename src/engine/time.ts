// Time skips: the engine ticks month by month, applies the focus, and rolls events.

import timeline from '../data/timeline.json';
import { ENERGY } from './actions';
import lore from '../data/lore.json';
import { crimePay, dollars, eligibleJobs, hire, jobLicense, livingCost, prisonName, RENT, sentence } from './economy';
import { offer } from './decisions';
import { EVENT_CHANCE, EVENTS, TEXTURE_CHANCE, TEXTURE_EVENTS } from './events';
import { birthdayChecks, kindle, practice } from './powers';
import { Rng } from './random';
import { addMonths, ageOf, before, changeAttr, changeRep, log } from './state';
import type { Focus, GameState } from './types';
import { say } from './writer/writer';

export interface SkipResult {
  state: GameState;
  monthsPassed: number;
  /** Why the skip stopped early, if it did. 'decision' means a choice was already waiting. */
  stoppedBy?: 'event' | 'kindling' | 'death' | 'decision';
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
// Decade summaries ("1990 the Foundry Riots (1992)...") start lower-case and would leak later years early.
const worldHistory = timeline.filter((t) => !regionalSources.has(t.source) && !/^[a-z]/.test(t.text));

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
  // Time waits for the player: answer the pending decision with choose() first.
  if (state.pending) return { state, monthsPassed: 0, stoppedBy: 'decision' };
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
      say(s, rng, 'life', 'life.birthday');
      birthdayChecks(s, rng);
      if (age === 18 && c.education === 'none' && focus !== 'crime') {
        c.education = 'high school';
        say(s, rng, 'life', 'life.graduate-high-school');
      }
      if (age === 19 && c.livesWithFamily) {
        c.livesWithFamily = false;
        say(s, rng, 'life', 'life.move-out');
      }
      if (c.kindleAge !== null && age >= c.kindleAge) {
        say(s, rng, 'power', 'power.kindling-moment');
        kindle(s, rng, c.pendingPower ?? {});
        offer(s, rng, 'kindling');
        stoppedBy = 'kindling';
      }
    }

    const imprisoned = c.inPrisonUntil && before(s.date, c.inPrisonUntil);
    if (c.inPrisonUntil && !imprisoned) {
      c.inPrisonUntil = null;
      say(s, rng, 'law', 'law.released');
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
          c.district = 'Old Foundry';
          say(s, rng, 'money', 'money.evicted');
        }
      }
    }
    if (c.graded) practice(s, rng, focus === 'train' && !imprisoned);

    c.health = Math.min(100, c.health + (focus === 'rest' ? 12 : 4));
    c.strain = focus === 'train' && c.graded && !c.powersGone ? 15 : 0;

    const ctx = { age, focus, year: s.date.year };
    if (!imprisoned && !stoppedBy && rng.chance(EVENT_CHANCE)) {
      const ev = rng.weighted(EVENTS.map((e) => ({ item: e, weight: e.weight(c, ctx) })));
      if (ev?.run(s, rng, ctx)?.pause) stoppedBy = 'event';
    } else if (!imprisoned && !stoppedBy && rng.chance(TEXTURE_CHANCE)) {
      rng.weighted(TEXTURE_EVENTS.map((e) => ({ item: e, weight: e.weight(c, ctx) })))?.run(s, rng, ctx);
    } else if (imprisoned && rng.chance(0.1)) {
      // Inside: the yard, the Quell schedule, the hierarchy.
      const rank = c.graded && !c.powersGone ? c.powers[0].rank : undefined;
      if (rng.chance(0.3)) {
        c.health = Math.max(0, c.health - rng.int(5, 20));
        changeRep(c, 'streetCred', 2);
        say(s, rng, 'law', 'law.prison-fight', { prison: prisonName(rank, s.date.year) });
      } else say(s, rng, 'law', 'law.prison-day', { prison: prisonName(rank, s.date.year) });
    }

    if (c.health <= 0 || rng.chance(mortality(age) / 12)) {
      c.alive = false;
      say(s, rng, 'death', c.health <= 0 ? 'death.injuries' : 'death.natural');
      s.pending = null;
      stoppedBy = 'death';
    }
  }

  if (tally.crimeJobs) {
    say(s, rng, 'money', tally.crimeJobs > 1 ? 'money.crime-summary' : 'money.crime-summary-one', { jobs: tally.crimeJobs, money: tally.crimeTake });
  }
  if (passed >= 6 && c.money !== startMoney) {
    const delta = c.money - startMoney;
    log(s, 'money', `Over ${passed} months your money ${delta >= 0 ? 'grew' : 'fell'} by $${Math.abs(delta).toLocaleString('en-US')}.`);
  }
  if (passed > 0) s.energy = ENERGY;
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
          say(s, rng, 'life', 'life.graduate-college');
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
          say(s, rng, 'money', lic ? 'money.hired-licensed' : 'money.hired', { job: c.job.title, salary: c.job.salary, license: lic ?? '' });
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
        let months = sentence(rng.int(6, 30), rank);
        if ((c.ties ?? []).includes('the Choir')) months = Math.round(months * 0.75); // Choir lawyers
        c.record.push({ year: s.date.year, offense: rank ? 'Unlicensed power use in a felony' : 'Armed robbery', sentenceMonths: months });
        c.inPrisonUntil = addMonths(s.date, months);
        c.job = null;
        if (c.license === 'Vigilance' || c.license === 'Utility') c.license = 'Civilian';
        say(s, rng, 'law', 'law.arrested', { months, prison: prisonName(rank, s.date.year) });
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
