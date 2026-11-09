// Time skips: the engine ticks month by month, applies the focus, and rolls events.

import { housingCost, lifeMonth, lifeBirthday, lifeOf } from './life';
import timeline from '../data/timeline.json';
import { ENERGY } from './actions';
import lore from '../data/lore.json';
import { crimePay, dollars, eligibleJobs, hire, jobLicense, livingCost, prisonName, RENT, sentence } from './economy';
import { offer } from './decisions';
import { birthdayMilestone, EVENT_CHANCE, EVENTS, MUNDANE_CHANCE, MUNDANE_EVENTS, petYear, TEXTURE_CHANCE, TEXTURE_EVENTS } from './events';
import { around, bondAll, isFamily, isLover, peopleBirthday } from './people';
import { admits, collegeMonth, collegeYear, COLLEGES, enroll, expel, graduationPerks, marked, schoolName, schoolYear } from './school';
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
      peopleBirthday(s, rng);
      if (focus === 'family' && !imprisonedNow(s)) bondAll(s, p => isFamily(p) || isLover(p), 4);
      petYear(s, rng);
      lifeBirthday(s, rng);
      if (age >= 7 && age <= 18 && c.school && c.education === 'none' && !imprisonedNow(s)) schoolYear(s, rng, focus);
      collegeYear(s, rng, focus);
      if (age === 18 && c.education === 'none') {
        const gpa = c.gpa ?? 2;
        const school = schoolName(c, 17);
        if (marked(c, 'plan:street') || gpa < 1 || (focus === 'crime' && gpa < 2)) {
          say(s, rng, 'life', 'school.dropout', { school });
        } else {
          c.education = 'high school';
          say(s, rng, 'life', 'life.graduate-high-school');
          const perk = graduationPerks(c);
          if (perk) say(s, rng, 'life', perk, { school });
          // The plan made in senior year.
          if (marked(c, 'plan:trade') && admits(s, 'trade')) {
            enroll(s, 'trade');
            say(s, rng, 'life', 'choice.enroll.trade', { school: COLLEGES.trade.name });
          } else if (marked(c, 'plan:work') && !c.job) {
            const jobs = eligibleJobs(c, age);
            if (jobs.length) {
              const spec = rng.pick(jobs.slice(-2));
              c.job = hire(spec, s.date.year);
              say(s, rng, 'money', 'money.hired', { job: c.job.title, salary: c.job.salary });
            }
          } else if (marked(c, 'plan:college') && !s.pending && !stoppedBy) {
            offer(s, rng, 'enroll', 'event.enroll.letters');
            stoppedBy = 'event';
          }
        }
      }
      if (age === 19 && c.livesWithFamily) {
        c.livesWithFamily = false;
        say(s, rng, 'life', 'life.move-out');
      }
      // Inside the Kindling Window, stress, injury and hard training can bring a Kindling forward (card: "often
      // triggered by stress, injury, or terror"). Without a trigger it still comes on the drawn birthday, 21 at the latest.
      if (c.kindleAge !== null && age >= 12 && age < c.kindleAge && !imprisonedNow(s)) {
        const early = 0.1 + (lifeOf(s).stress >= 60 ? 0.15 : 0) + (c.health < 60 ? 0.15 : 0) + (focus === 'train' ? 0.1 : 0);
        if (rng.chance(early)) c.kindleAge = age;
      }
      if (c.kindleAge !== null && age >= c.kindleAge) {
        say(s, rng, 'power', 'power.kindling-moment');
        kindle(s, rng, c.pendingPower ?? {});
        offer(s, rng, 'kindling');
        stoppedBy = 'kindling';
      }
      if (!imprisonedNow(s) && birthdayMilestone(s, rng, age) && !stoppedBy) stoppedBy = 'event';
    }

    const imprisoned = c.inPrisonUntil && before(s.date, c.inPrisonUntil);
    if (c.inPrisonUntil && !imprisoned) {
      c.inPrisonUntil = null;
      say(s, rng, 'law', 'law.released');
    }
    // Prison ends a place at college or at a parish school.
    if (imprisoned && (c.college || (age < 18 && c.school === 'parochial-charter'))) expel(s, rng);

    if (!imprisoned) {
      applyFocus(s, rng, focus, age, tally);
      collegeMonth(s, rng, focus);
      // Take-home pay after a flat 25% for tax.
      if (c.job) c.money += Math.round((c.job.salary * 0.75) / 12);
      if (c.job?.id === 'regional-hero' || c.job?.id === 'national-hero') {
        if (rng.chance(0.5)) changeRep(c, 'fame', 1);
      }
      // Minors on their own (street kids) get by in squats and shelters; bills start at 18.
      if (!c.livesWithFamily && age >= 18) {
        // A partner who lives with you pays their share of the rent.
        const share = around(s, (p) => isLover(p) && !!p.livesWithYou).length ? 0.65 : 1;
        c.money -= housingCost(s, share) + dollars(livingCost(c.graded), s.date.year);
        if (c.life?.home?.district !== c.district && c.money < -dollars(RENT[c.district] * 3, s.date.year) && c.district !== 'Old Foundry') {
          c.district = 'Old Foundry';
          say(s, rng, 'money', 'money.evicted');
        }
      }
    }
    if (c.graded) practice(s, rng, focus === 'train' && !imprisoned);

    c.health = Math.min(100, c.health + (focus === 'rest' ? 12 : 4));
    c.strain = focus === 'train' && c.graded && !c.powersGone ? 15 : 0;

    lifeMonth(s, rng, focus, !!imprisoned);

    const ctx = { age, focus, year: s.date.year, month: s.date.month };
    if (!imprisoned && !stoppedBy && rng.chance(EVENT_CHANCE)) {
      const ev = rng.weighted(EVENTS.map((e) => ({ item: e, weight: e.weight(c, ctx) })));
      if (ev?.run(s, rng, ctx)?.pause) stoppedBy = 'event';
    } else if (!imprisoned && !stoppedBy && rng.chance(MUNDANE_CHANCE)) {
      const ev = rng.weighted(MUNDANE_EVENTS.map((e) => ({ item: e, weight: e.weight(c, ctx) })));
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
    log(s, 'money', `${passed >= 12 ? 'This year' : `Over ${passed} months`} your money ${delta >= 0 ? 'grew' : 'fell'} by $${Math.abs(delta).toLocaleString('en-US')}.`);
  }
  if (passed > 0) {
    s.energy = ENERGY;
    s.turn = (s.turn ?? 0) + 1;
  }
  s.rngState = rng.state;
  return { state: s, monthsPassed: passed, stoppedBy };
}

const imprisonedNow = (s: GameState) => !!s.character.inPrisonUntil && before(s.date, s.character.inPrisonUntil);

/** Months until the next birthday (1-12). Age up always lands on a birthday. */
export function monthsToBirthday(s: GameState): number {
  const m = (s.character.born.month - s.date.month + 12) % 12;
  return m === 0 ? 12 : m;
}

/** The game's only way to move time: live until the next birthday (stopping early for big events). */
export function ageUp(state: GameState, focus: Focus): SkipResult {
  return advance(state, monthsToBirthday(state), focus);
}

function applyFocus(s: GameState, rng: Rng, focus: Focus, age: number, tally: { crimeJobs: number; crimeTake: number }) {
  const c = s.character;
  switch (focus) {
    case 'school':
      // Credit toward a degree comes from enrolling (see school.ts); studying alone sharpens the mind.
      if (rng.chance(0.02)) changeAttr(c, 'mind', 1);
      break;
    case 'work':
      if (!c.job && !c.life?.career.retired && age >= 16 && rng.chance(0.2 + c.charm * 0.03)) {
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
