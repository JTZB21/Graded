// Actions: things the player does between turns (each Age up is a turn). Each turn gives a little
// energy; every action spends some and may cost money. The engine decides every effect and roll
// here; the writer (./writer) only describes the outcome.

import { LIFE_ACTIONS } from './lifeActions';
import { arrest, offer } from './decisions';
import { crimePay, dollars, eligibleJobs, hire, jobLicense, RENT } from './economy';
import { addPerson, around, bondAll, isFamily, isLover, isParent, peopleOf, tryMakeFriend, vars as personVars } from './people';
import { changeGpa, COLLEGES, mark, marked } from './school';
import { ageRate, gainProgress } from './powers';
import { Rng } from './random';
import { GRADES, RANKS, type Rank } from './rules';
import { addMonths, ageOf, changeAttr, changeRep, type Attribute } from './state';
import type { Character, District, GameState } from './types';
import { say } from './writer/writer';

/** Energy per turn (one Age up, about a year). Moving time refills it. */
export const ENERGY = 6;

export type ActionGroup = 'Body and mind' | 'School' | 'Powers' | 'Money' | 'People and places' | 'Underworld' | 'Inside';
export const ACTION_GROUPS: ActionGroup[] = ['Body and mind', 'School', 'Powers', 'Money', 'People and places', 'Underworld', 'Inside'];

interface Ctx {
  s: GameState;
  c: Character;
  age: number;
  year: number;
  imprisoned: boolean;
  /** How well the player did in the action's mini game, 0-1. 0.5 is an average result (or no game played). */
  skill: number;
}

/** Actions that come with a mini game. Its score nudges the odds; the engine still rolls the result. */
export const MINIGAMES: Record<string, 'memory' | 'lockpick' | 'timing'> = {
  study: 'memory',
  steal: 'lockpick',
  fight: 'timing',
};

export interface ActionSpec {
  id: string;
  label: string;
  group: ActionGroup;
  /** Energy spent. */
  cost: number;
  /** Price in 2026 dollars, scaled to the current year. */
  price?: (x: Ctx) => number;
  /** Exact price already in current-year dollars (balances, down payments). */
  actualPrice?: (x: Ctx) => number;
  /** Whether the action shows at all right now. */
  when: (x: Ctx) => boolean;
  /** Why a shown action cannot be taken right now (shown greyed out), if any. */
  blocked?: (x: Ctx) => string | undefined;
  apply: (s: GameState, rng: Rng, x: Ctx) => void;
}

/** What the UI needs to show an action button. */
export interface ActionView {
  id: string;
  label: string;
  group: ActionGroup;
  cost: number;
  price: number;
  /** Why it cannot be taken right now, or undefined if it can. */
  disabled?: string;
}

const rough = (d: District) => d === 'Old Foundry' || d === 'Riverside Docks';
const tied = (c: Character, group: string) => (c.ties ?? []).includes(group);
const powered = (c: Character) => c.graded && !c.powersGone && c.powers.length > 0;
const rankOf = (c: Character): Rank | undefined => (powered(c) ? c.powers[0].rank : undefined);
const rankIdx = (c: Character) => (powered(c) ? RANKS.indexOf(c.powers[0].rank) : -1);
const gradeIdx = (c: Character) => (c.grade ? GRADES.indexOf(c.grade) : 0);
const hurt = (c: Character, by: number) => { c.health = Math.max(0, c.health - by); };
const heal = (c: Character, by: number) => { c.health = Math.min(100, c.health + by); };
const free = (x: Ctx) => !x.imprisoned;
/** In school (6-17) or enrolled in college. */
const student = (x: Ctx) => (x.age >= 6 && x.age < 18 && !!x.c.school && x.c.education === 'none') || !!x.c.college;
const inSchool = (x: Ctx) => x.age >= 6 && x.age < 18 && !!x.c.school && x.c.education === 'none';

/** A chance to raise an attribute; harder the higher it already is. */
function improve(c: Character, rng: Rng, stat: Attribute, base: number) {
  if (c[stat] < 10 && rng.chance(base * (11 - c[stat]) / 10)) {
    changeAttr(c, stat, 1);
    return true;
  }
  return false;
}

/** Strain from deliberate power use. Grade IV and V use about half the Strain of Grade II; Grade I more. */
function addStrain(c: Character, amount: number) {
  const g = c.grade ?? 'I';
  const mult = g === 'I' ? 1.3 : g === 'II' ? 1 : g === 'III' ? 0.8 : 0.5;
  c.strain = Math.min(100, Math.round(c.strain + amount * mult));
}

/** Over 70% Strain the body starts to fail ("Strain, Burnout, and Flares"). */
function strainCheck(s: GameState, rng: Rng) {
  const c = s.character;
  if (c.strain > 90 && rng.chance(0.6)) {
    hurt(c, rng.int(20, 40));
    c.strain = 30;
    say(s, rng, 'power', 'act.strain.critical');
  } else if (c.strain > 70 && rng.chance(0.35)) {
    hurt(c, rng.int(6, 15));
    say(s, rng, 'power', 'act.strain.danger');
  }
}

const NIGHT_OUT: Record<District, number> = {
  'Old Foundry': 30, 'Riverside Docks': 40, 'Kesler Heights': 60, 'Saint Bryce': 80, 'The Spire': 250, Ashgrove: 300,
};

export const ACTIONS: ActionSpec[] = [
  ...LIFE_ACTIONS,
  // ---------- Body and mind ----------
  {
    id: 'gym',
    label: 'Work out',
    group: 'Body and mind',
    cost: 1,
    when: (x) => x.age >= 12,
    blocked: (x) => (x.c.health < 15 ? 'Too hurt' : undefined),
    apply: (s, rng, x) => {
      const up = improve(x.c, rng, 'body', 0.07);
      heal(x.c, 2);
      if (x.imprisoned) say(s, rng, 'life', up ? 'act.gym.prison-up' : 'act.gym.prison');
      else say(s, rng, 'life', up ? 'act.gym.up' : 'act.gym');
    },
  },
  {
    id: 'study',
    label: 'Study',
    group: 'Body and mind',
    cost: 1,
    when: (x) => x.age >= 6,
    apply: (s, rng, x) => {
      // Homework counts toward grades for anyone in school or college.
      if (student(x)) changeGpa(x.c, 0.04 + x.skill * 0.08);
      const up = improve(x.c, rng, 'mind', 0.07 * (0.5 + x.skill));
      if (x.imprisoned) say(s, rng, 'life', up ? 'act.study.prison-up' : 'act.study.prison');
      else say(s, rng, 'life', up ? 'act.study.up' : 'act.study');
    },
  },
  {
    id: 'rest',
    label: 'Eat and sleep it off',
    group: 'Body and mind',
    cost: 1,
    when: (x) => x.c.strain > 0 || x.c.health < 100,
    apply: (s, rng, x) => {
      const strained = x.c.strain > 0;
      x.c.strain = Math.max(0, x.c.strain - 40);
      heal(x.c, 6);
      say(s, rng, 'life', strained ? 'act.rest.strain' : 'act.rest');
    },
  },
  {
    id: 'clinic',
    label: 'See a doctor',
    group: 'Body and mind',
    cost: 1,
    // Insurers add a Graded surcharge of 30-200%.
    price: (x) => (x.c.graded ? 300 : 200),
    when: (x) => free(x) && (x.c.health < 90 || x.c.strain > 40),
    apply: (s, rng, x) => {
      heal(x.c, 25);
      const ward = x.c.graded && x.c.strain > 40;
      if (ward) x.c.strain = Math.max(0, x.c.strain - 50);
      say(s, rng, 'life', ward ? 'act.clinic.strain-ward' : 'act.clinic');
    },
  },
  {
    id: 'healer',
    label: 'Pay a BIO healer',
    group: 'Body and mind',
    cost: 1,
    // Healer sessions run $5-50k.
    price: () => 15000,
    when: (x) => free(x) && x.c.health < 60,
    apply: (s, rng, x) => {
      x.c.health = 100;
      say(s, rng, 'life', 'act.healer');
    },
  },

  // ---------- School ----------
  {
    id: 'club',
    label: 'Join a club or team after school',
    group: 'School',
    cost: 1,
    when: (x) => free(x) && inSchool(x) && x.age >= 8,
    apply: (s, rng, x) => {
      const stat = rng.chance(0.5) ? 'charm' : 'body';
      const up = improve(x.c, rng, stat, 0.08);
      heal(x.c, 2);
      if (rng.chance(0.2)) {
        const f = addPerson(s, rng, 'friend', 45, Math.max(6, x.age + rng.int(-1, 1)));
        say(s, rng, 'life', 'act.club.friend', personVars(f));
        return;
      }
      say(s, rng, 'life', up ? `act.club.up-${stat}` : 'act.club');
    },
  },
  {
    id: 'skip-class',
    label: 'Cut class',
    group: 'School',
    cost: 1,
    when: (x) => free(x) && inSchool(x) && x.age >= 12,
    apply: (s, rng, x) => {
      const c = x.c;
      changeGpa(c, -0.15);
      heal(c, 2);
      if (rng.chance(0.25)) {
        bondAll(s, isParent, -6);
        say(s, rng, 'life', 'act.skip-class.caught');
        return;
      }
      changeRep(c, 'streetCred', 2);
      improve(c, rng, 'nerve', 0.05);
      say(s, rng, 'life', 'act.skip-class');
    },
  },
  {
    id: 'enroll',
    label: 'Apply to college or trade school',
    group: 'School',
    cost: 1,
    when: (x) => free(x) && x.age >= 18 && !x.c.college && x.c.education !== 'college',
    apply: (s, rng) => offer(s, rng, 'enroll', 'act.enroll.ask'),
  },
  {
    id: 'drop-out',
    label: 'Drop out of college',
    group: 'School',
    cost: 1,
    when: (x) => !!x.c.college,
    apply: (s, rng, x) => {
      const school = COLLEGES[x.c.college!.kind].name;
      x.c.college = null;
      say(s, rng, 'life', 'act.drop-out', { school });
    },
  },

  // ---------- Powers ----------
  {
    id: 'practice',
    label: 'Practise in private',
    group: 'Powers',
    cost: 1,
    when: (x) => powered(x.c),
    apply: (s, rng, x) => {
      addStrain(x.c, 20);
      const before = x.c.grade;
      gainProgress(s, rng, 0.5 * ageRate(x.age));
      if (x.c.grade === before) say(s, rng, 'power', x.imprisoned ? 'act.practice.prison' : 'act.practice');
      strainCheck(s, rng);
    },
  },
  {
    id: 'push',
    label: 'Push your limits',
    group: 'Powers',
    cost: 2,
    when: (x) => powered(x.c) && x.age >= 14,
    blocked: (x) => (x.c.health < 25 ? 'Too hurt' : undefined),
    apply: (s, rng, x) => {
      addStrain(x.c, 45);
      const before = x.c.grade;
      // Street experience is fast and can get you killed.
      gainProgress(s, rng, 2.5 * ageRate(x.age));
      if (x.c.grade === before) say(s, rng, 'power', 'act.push');
      strainCheck(s, rng);
    },
  },
  {
    id: 'show-off',
    label: 'Use your power in public',
    group: 'Powers',
    cost: 1,
    when: (x) => free(x) && powered(x.c) && x.age >= 10,
    apply: (s, rng, x) => {
      const c = x.c;
      addStrain(c, 10);
      const licensed = c.license === 'Utility' || c.license === 'Vigilance' || c.license === 'Strategic';
      // Public use on a Civilian license is illegal; most of the time nobody official sees.
      if (!licensed && rng.chance(0.25)) {
        const fine = dollars(500, x.year);
        c.money -= fine;
        changeRep(c, 'infamy', 2);
        say(s, rng, 'law', 'act.show-off.cited', { money: fine });
        return;
      }
      const viral = x.year >= 2008 && rng.chance(0.15 + rankIdx(c) * 0.03);
      changeRep(c, 'fame', viral ? rng.int(2, 5) : rng.chance(0.5) ? 1 : 0);
      say(s, rng, 'event', viral ? 'act.show-off.viral' : 'act.show-off');
    },
  },
  {
    id: 'patrol',
    label: 'Patrol the streets',
    group: 'Powers',
    cost: 2,
    when: (x) => free(x) && powered(x.c) && x.age >= 16,
    blocked: (x) => (x.c.health < 30 ? 'Too hurt' : undefined),
    apply: (s, rng, x) => {
      const c = x.c;
      addStrain(c, 25);
      const licensed = c.license === 'Vigilance';
      const roll = rng.int(1, 10) + c.nerve + c.body / 2 + rankIdx(c) + gradeIdx(c);
      if (!licensed && rng.chance(Math.max(0.03, 0.12 + c.infamy / 500 - c.nerve * 0.005))) {
        // Unlicensed heroics are vigilantism, a felony.
        changeRep(c, 'fame', 1);
        const { months, prison } = arrest(s, rng, 'Unlicensed vigilantism', [6, 18]);
        say(s, rng, 'law', 'act.patrol.arrested', { months, prison });
        return;
      }
      if (roll < 10) {
        hurt(c, rng.int(10, 30));
        say(s, rng, 'event', 'act.patrol.hurt');
      } else if (licensed) {
        changeRep(c, 'fame', rng.int(1, 3));
        say(s, rng, 'event', 'act.patrol.licensed');
      } else {
        changeRep(c, 'fame', 1);
        changeRep(c, 'streetCred', rng.int(1, 3));
        changeRep(c, 'infamy', 1);
        say(s, rng, 'event', 'act.patrol.rogue');
      }
      strainCheck(s, rng);
    },
  },

  // ---------- Money ----------
  {
    id: 'part-time',
    label: 'Work an after-school job',
    group: 'Money',
    cost: 2,
    when: (x) => free(x) && x.age >= 14 && x.age < 18 && !x.c.job,
    blocked: (x) => (x.c.health < 15 ? 'Too hurt' : undefined),
    apply: (s, rng, x) => {
      // A season of shifts.
      const pay = dollars(rng.int(800, 1800), x.year);
      x.c.money += pay;
      if (inSchool(x) && rng.chance(0.3)) changeGpa(x.c, -0.1);
      say(s, rng, 'money', 'act.part-time', { money: pay });
    },
  },
  {
    id: 'buy-car',
    label: 'Buy a used car',
    group: 'Money',
    cost: 1,
    price: () => 3000,
    when: (x) => free(x) && x.age >= 17 && !x.c.car,
    apply: (s, rng, x) => {
      x.c.car = 'beater';
      mark(x.c, 'drivers-license');
      say(s, rng, 'money', 'act.buy-car', { money: dollars(3000, x.year) });
    },
  },
  {
    id: 'odd-job',
    label: 'Pick up extra work',
    group: 'Money',
    cost: 1,
    when: (x) => free(x) && x.age >= 12,
    blocked: (x) => (x.c.health < 15 ? 'Too hurt' : undefined),
    apply: (s, rng, x) => {
      const c = x.c;
      hurt(c, 2);
      if (c.job) {
        // About a week of overtime, after tax.
        const pay = Math.round((c.job.salary * 0.75) / 52);
        c.money += pay;
        say(s, rng, 'money', 'act.odd-job.overtime', { money: pay, job: c.job.title });
        return;
      }
      const pay = dollars(x.age < 16 ? rng.int(40, 150) : rng.int(120, 400), x.year);
      c.money += pay;
      say(s, rng, 'money', x.age < 16 ? 'act.odd-job.kid' : 'act.odd-job', { money: pay });
    },
  },
  {
    id: 'job-hunt',
    label: 'Look for a job',
    group: 'Money',
    cost: 1,
    when: (x) => free(x) && x.age >= 16 && !x.c.job,
    apply: (s, rng, x) => {
      const c = x.c;
      const jobs = eligibleJobs(c, x.age);
      if (!jobs.length || !rng.chance(0.25 + c.charm * 0.04 + (c.education === 'college' ? 0.1 : 0))) {
        say(s, rng, 'money', 'act.job-hunt.none');
        return;
      }
      const spec = rng.pick(jobs.slice(0, 3));
      c.job = hire(spec, x.year);
      const lic = jobLicense(spec.id);
      if (lic) c.license = lic;
      say(s, rng, 'money', lic ? 'money.hired-licensed' : 'money.hired', { job: c.job.title, salary: c.job.salary, license: lic ?? '' });
    },
  },
  {
    id: 'raise',
    label: 'Ask for a raise',
    group: 'Money',
    cost: 1,
    when: (x) => free(x) && !!x.c.job,
    blocked: (x) => (x.c.raiseAskedYear === x.year ? 'Already asked this year' : undefined),
    apply: (s, rng, x) => {
      const c = x.c;
      const job = c.job!;
      c.raiseAskedYear = x.year;
      if (rng.chance(0.2 + (c.charm + c.mind) * 0.025)) {
        const pct = rng.int(4, 12);
        job.salary = Math.round((job.salary * (100 + pct)) / 100 / 100) * 100;
        say(s, rng, 'money', 'act.raise.yes', { pct, salary: job.salary, job: job.title });
      } else if (rng.chance(0.08)) {
        c.job = null;
        say(s, rng, 'money', 'act.raise.fired', { job: job.title });
      } else say(s, rng, 'money', 'act.raise.no', { job: job.title });
    },
  },
  {
    id: 'quit',
    label: 'Quit your job',
    group: 'Money',
    cost: 1,
    when: (x) => free(x) && !!x.c.job,
    apply: (s, rng, x) => {
      const title = x.c.job!.title;
      x.c.job = null;
      if (x.c.license === 'Utility' || x.c.license === 'Vigilance') x.c.license = 'Civilian';
      say(s, rng, 'money', 'act.quit', { job: title });
    },
  },

  // ---------- People and places ----------
  {
    id: 'family',
    label: 'Spend time with family',
    group: 'People and places',
    cost: 1,
    when: (x) => free(x) && (x.c.livesWithFamily || x.age < 40),
    apply: (s, rng, x) => {
      const c = x.c;
      heal(c, 3);
      bondAll(s, (p) => isFamily(p) && p.relation !== 'child', rng.int(3, 6));
      const up = improve(c, rng, 'charm', 0.06);
      if (c.background === 'wealthy' && x.age >= 16 && rng.chance(0.25)) {
        const gift = dollars(rng.int(200, 1000), x.year);
        c.money += gift;
        say(s, rng, 'life', 'act.family.money', { money: gift });
      } else say(s, rng, 'life', up ? 'act.family.up' : 'act.family');
    },
  },
  {
    id: 'roam',
    label: 'Roam the neighbourhood',
    group: 'People and places',
    cost: 1,
    when: (x) => free(x) && x.age >= 6 && x.age <= 14,
    apply: (s, rng, x) => {
      const c = x.c;
      const friend = around(s, (p) => p.relation === 'friend' && !p.estranged)[0];
      // The corner store, with a friend who has an idea.
      if (friend && x.age >= 8 && x.age <= 12 && !marked(c, 'm:dare') && rng.chance(0.3)) {
        mark(c, 'm:dare');
        offer(s, rng, 'corner-store-dare', 'event.corner-store-dare', {}, friend);
        return;
      }
      improve(c, rng, 'nerve', 0.06);
      if (rough(c.district) && rng.chance(0.15)) changeRep(c, 'streetCred', 2);
      if (friend) friend.bond = Math.min(100, friend.bond + rng.int(2, 5));
      say(s, rng, 'life', 'act.roam');
    },
  },
  {
    id: 'date',
    label: 'Go on a date',
    group: 'People and places',
    cost: 1,
    price: () => 50,
    when: (x) => free(x) && x.age >= 16 && !peopleOf(x.s).some((p) => p.alive && isLover(p)),
    apply: (s, rng, x) => {
      const c = x.c;
      if (rng.chance(Math.min(0.8, 0.2 + c.charm * 0.05 + (c.fame > 20 ? 0.1 : 0)))) {
        const p = addPerson(s, rng, 'partner', rng.int(40, 55), Math.max(16, x.age + rng.int(-4, 4)));
        say(s, rng, 'life', 'act.date.match', personVars(p));
      } else say(s, rng, 'life', 'act.date.none');
    },
  },
  {
    id: 'make-friend',
    label: 'Make a new friend',
    group: 'People and places',
    cost: 1,
    when: (x) => free(x) && x.age >= 4,
    apply: (s, rng) => {
      const f = tryMakeFriend(s, rng);
      if (f) say(s, rng, 'life', 'people.new-friend', { person: f.name, personFirst: f.name.split(' ')[0] });
      else say(s, rng, 'life', 'people.new-friend.none');
    },
  },
  {
    id: 'night-out',
    label: 'Go out tonight',
    group: 'People and places',
    cost: 1,
    price: (x) => NIGHT_OUT[x.c.district],
    when: (x) => free(x) && x.age >= 16,
    apply: (s, rng, x) => {
      const c = x.c;
      improve(c, rng, 'charm', 0.05);
      bondAll(s, (p) => p.relation === 'friend', rng.int(2, 5));
      if (c.graded && x.year >= 1978 && rng.chance(rough(c.district) ? 0.2 : 0.08)) {
        if (c.infamy >= 25) changeRep(c, 'infamy', 1);
        say(s, rng, 'law', c.infamy >= 25 ? 'law.card-check.held' : 'law.card-check');
        return;
      }
      if (rng.chance(0.15)) {
        say(s, rng, 'life', 'life.met-someone');
        return;
      }
      if (rough(c.district)) changeRep(c, 'streetCred', 1);
      if (c.district === 'The Spire' && rankIdx(c) >= RANKS.indexOf('B')) changeRep(c, 'fame', 1);
      say(s, rng, 'life', 'act.night-out');
    },
  },
  {
    id: 'volunteer',
    label: 'Volunteer',
    group: 'People and places',
    cost: 1,
    when: (x) => free(x) && x.age >= 12,
    apply: (s, rng, x) => {
      const c = x.c;
      if (rng.chance(0.5)) changeRep(c, 'fame', 1);
      if (rough(c.district)) changeRep(c, 'streetCred', 1);
      say(s, rng, 'life', 'act.volunteer');
    },
  },
  {
    id: 'move',
    label: 'Move to another district',
    group: 'People and places',
    cost: 1,
    when: (x) => free(x) && x.age >= 18,
    apply: (s, rng, x) => offer(s, rng, 'move', 'act.move.ask', {
      low: dollars(RENT['Old Foundry'], x.year),
      high: dollars(RENT.Ashgrove, x.year),
    }),
  },

  // ---------- Underworld ----------
  {
    id: 'steal',
    label: 'Steal something',
    group: 'Underworld',
    cost: 1,
    when: (x) => free(x) && x.age >= 10,
    apply: (s, rng, x) => {
      const c = x.c;
      if (rng.chance(Math.max(0.02, (0.14 - c.nerve * 0.008 + c.infamy / 1000) * (1.5 - x.skill)))) {
        changeRep(c, 'infamy', 1);
        if (x.age < 16) {
          say(s, rng, 'law', 'act.steal.caught-minor');
          return;
        }
        const { months, prison } = arrest(s, rng, 'Theft', [1, 6]);
        say(s, rng, 'law', 'act.steal.caught', { months, prison });
        return;
      }
      const take = dollars(rng.int(20, 300) * (x.age < 16 ? 1 : 2), x.year);
      c.money += take;
      changeRep(c, 'streetCred', rng.chance(0.4) ? 1 : 0);
      say(s, rng, 'money', 'act.steal', { money: take });
    },
  },
  {
    id: 'fight',
    label: 'Fight for money',
    group: 'Underworld',
    cost: 2,
    when: (x) => free(x) && x.age >= 16,
    blocked: (x) => (x.c.health < 35 ? 'Too hurt' : undefined),
    apply: (s, rng, x) => {
      const c = x.c;
      if (powered(c)) addStrain(c, 20);
      const you = c.body + c.nerve + (powered(c) ? (rankIdx(c) + 1) * 2 + gradeIdx(c) : 0) + rng.int(1, 10) + Math.round((x.skill - 0.5) * 6);
      // Promoters match you near your weight class, with a thumb on the scale.
      const them = c.body + c.nerve + (powered(c) ? (rankIdx(c) + 1) * 2 : 0) + rng.int(2, 10);
      if (you >= them) {
        const purse = dollars(rng.int(300, 1500) * (1 + Math.max(0, rankIdx(c))), x.year);
        c.money += purse;
        hurt(c, rng.int(3, 12));
        changeRep(c, 'streetCred', rng.int(2, 4));
        say(s, rng, 'money', 'act.fight.win', { money: purse });
      } else {
        hurt(c, rng.int(12, 30));
        changeRep(c, 'streetCred', 1);
        say(s, rng, 'event', 'act.fight.lose');
      }
      if (powered(c)) strainCheck(s, rng);
    },
  },
  {
    id: 'crew-job',
    label: 'Run a job for the crew',
    group: 'Underworld',
    cost: 2,
    when: (x) => free(x) && x.age >= 14 && (tied(x.c, 'Low Kings') || tied(x.c, 'the Choir')),
    apply: (s, rng, x) => {
      const c = x.c;
      const choir = tied(c, 'the Choir');
      if (rng.chance(Math.max(0.02, 0.07 - c.nerve * 0.004 + c.infamy / 1500))) {
        const { months, prison } = arrest(s, rng, choir ? 'Trafficking (Choir shipment)' : 'Receiving stolen goods', [6, 30]);
        say(s, rng, 'law', 'act.crew-job.caught', { months, prison });
        return;
      }
      const [lo, hi] = crimePay(rankOf(c));
      const pay = dollars(Math.round(rng.int(lo, hi) / 2), x.year);
      c.money += pay;
      if (choir) changeRep(c, 'infamy', 2);
      else changeRep(c, 'streetCred', rng.int(2, 3));
      say(s, rng, 'money', choir ? 'act.crew-job.choir' : 'act.crew-job.lowkings', { money: pay });
    },
  },

  // ---------- Inside ----------
  {
    id: 'hustle',
    label: 'Run a hustle on the block',
    group: 'Inside',
    cost: 1,
    when: (x) => x.imprisoned,
    apply: (s, rng, x) => {
      const c = x.c;
      if (rng.chance(0.15)) {
        hurt(c, rng.int(5, 15));
        const extra = rng.int(1, 3);
        c.inPrisonUntil = addMonths(c.inPrisonUntil!, extra);
        say(s, rng, 'law', 'act.hustle.caught', { months: extra });
        return;
      }
      const take = dollars(rng.int(50, 400), x.year);
      c.money += take;
      changeRep(c, 'streetCred', 1);
      say(s, rng, 'money', 'act.hustle', { money: take });
    },
  },
];

const ctxOf = (s: GameState, skill = 0.5): Ctx => {
  const c = s.character;
  const imprisoned = !!c.inPrisonUntil && c.inPrisonUntil.year * 12 + c.inPrisonUntil.month > s.date.year * 12 + s.date.month;
  return { s, c, age: ageOf(s), year: s.date.year, imprisoned, skill: Math.max(0, Math.min(1, skill)) };
};

const priceOf = (spec: ActionSpec, x: Ctx) => spec.actualPrice ? spec.actualPrice(x) : spec.price ? dollars(spec.price(x), x.year) : 0;

export const energyOf = (s: GameState) => s.energy ?? ENERGY;

/** Actions shown right now, with prices and the reason any of them is greyed out. */
export function availableActions(s: GameState): ActionView[] {
  if (!s.character.alive || s.pending) return [];
  const x = ctxOf(s);
  const energy = energyOf(s);
  return ACTIONS.filter((a) => a.when(x)).map((a) => {
    const price = priceOf(a, x);
    const disabled = a.blocked?.(x)
      ?? (energy < a.cost ? 'Not enough energy this year' : undefined)
      ?? (price > 0 && x.c.money < price ? 'Cannot afford it' : undefined);
    return { id: a.id, label: a.label, group: a.group, cost: a.cost, price, disabled };
  });
}

/**
 * Takes an action this turn. Returns a new state; the input is never changed.
 * `skill` is the mini game score (0-1) for actions in MINIGAMES; leave it out for an average result.
 */
export function act(state: GameState, id: string, skill = 0.5): GameState {
  const view = availableActions(state).find((a) => a.id === id);
  if (!view) throw new Error(`"${id}" is not available right now`);
  if (view.disabled) throw new Error(`"${id}": ${view.disabled}`);
  const s: GameState = structuredClone(state);
  const spec = ACTIONS.find((a) => a.id === id)!;
  const x = ctxOf(s, skill);
  const rng = new Rng(s.rngState);
  s.energy = energyOf(s) - spec.cost;
  s.character.money -= view.price;
  spec.apply(s, rng, x);
  if (s.character.health <= 0) {
    s.character.alive = false;
    s.pending = null;
    say(s, rng, 'death', 'death.injuries');
  }
  s.rngState = rng.state;
  return s;
}
