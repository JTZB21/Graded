// Random life events, drawn with the World roll during time skips.
// Weights depend on age, year, district, focus, Rank, reputation and ties. The engine decides every
// number here; the writer (./writer) turns each outcome into prose. Events that need the player
// offer a decision (./decisions) and stop the skip.

import { offer } from './decisions';
import { dollars } from './economy';
import { addPerson, around, bondAll, isFamily, isParent, vars as personVars } from './people';
import { RANKS } from './rules';
import type { Rng } from './random';
import { changeGpa, enrollSchool, mark, marked, schoolName } from './school';
import { ageOf, changeAttr, changeRep, heal as healBy } from './state';
import type { Character, District, Focus, GameState, Person } from './types';
import { say } from './writer/writer';

export interface EventContext {
  age: number;
  focus: Focus;
  year: number;
  /** 1-12 */
  month: number;
}

export interface LifeEvent {
  id: string;
  weight: (c: Character, ctx: EventContext) => number;
  run: (s: GameState, rng: Rng, ctx: EventContext) => { pause?: boolean } | void;
}

const rough = (d: District) => d === 'Old Foundry' || d === 'Riverside Docks';
const rankAtLeast = (c: Character, r: (typeof RANKS)[number]) =>
  c.graded && !c.powersGone && RANKS.indexOf(c.powers[0].rank) >= RANKS.indexOf(r);
const lowRank = (c: Character) => c.graded && RANKS.indexOf(c.powers[0].rank) <= 1;
const tied = (c: Character, group: string) => (c.ties ?? []).includes(group);

function hurt(s: GameState, amount: number) {
  s.character.health = Math.max(0, s.character.health - amount);
}
function pay(s: GameState, amount2026: number) {
  const cost = dollars(amount2026, s.date.year);
  s.character.money -= cost;
  return cost;
}

export const EVENTS: LifeEvent[] = [
  {
    id: 'hero-fight',
    weight: (c) => (rough(c.district) ? 4 : 1.5),
    run: (s, rng) => {
      if (rng.chance(0.3)) {
        hurt(s, rng.int(10, 30));
        say(s, rng, 'event', 'event.hero-fight.hurt');
      } else say(s, rng, 'event', 'event.hero-fight');
    },
  },
  {
    id: 'card-check',
    weight: (c, ctx) => (c.graded && ctx.age >= 12 && ctx.year >= 1962 ? (rough(c.district) ? 3 : 1) : 0),
    run: (s, rng) => {
      const c = s.character;
      if (c.infamy >= 25) {
        changeRep(c, 'infamy', 2);
        say(s, rng, 'law', 'law.card-check.held');
      } else say(s, rng, 'law', 'law.card-check');
    },
  },
  {
    id: 'rush-offer',
    // Rush from 2014; before that, Burn (the 1980s Strain amphetamine) fills the same corner.
    weight: (c, ctx) => (ctx.age >= 14 && ctx.year >= 1980 && rough(c.district) ? 1 : 0),
    run: (s, rng) => {
      offer(s, rng, 'rush-offer', s.date.year >= 2014 ? 'event.rush-offer' : 'event.burn-offer');
      return { pause: true };
    },
  },
  {
    id: 'promotion',
    weight: (c, ctx) => (c.job && ctx.focus === 'work' ? 2 + c.mind / 3 : 0),
    run: (s, rng) => {
      const job = s.character.job!;
      job.salary = Math.round((job.salary * 1.12) / 100) * 100;
      say(s, rng, 'money', 'money.promotion', { job: job.title, salary: job.salary });
    },
  },
  {
    id: 'laid-off',
    weight: (c) => (c.job && c.job.id !== 'strategic' ? 1 : 0),
    run: (s, rng) => {
      say(s, rng, 'money', 'money.laid-off', { job: s.character.job!.title });
      s.character.job = null;
    },
  },
  {
    id: 'illness',
    weight: () => 1.5,
    run: (s, rng, ctx) => {
      hurt(s, rng.int(10, 25));
      const graded = s.character.graded;
      // A child's bills go to the parents; a kid on the street ends up at the free clinic.
      if (ctx.age < 18) {
        say(s, rng, 'event', s.character.livesWithFamily ? 'event.illness.child' : 'event.illness.street-kid');
        return;
      }
      const cost = pay(s, rng.int(400, 3000) * (graded ? 2 : 1));
      say(s, rng, 'event', graded ? 'event.illness.graded' : 'event.illness', { money: cost });
    },
  },
  {
    id: 'mugged',
    // Nobody in Riverside robs a Low King.
    weight: (c, ctx) => (ctx.age >= 14 && rough(c.district) && !rankAtLeast(c, 'C') && !tied(c, 'Low Kings') ? 2 : 0),
    run: (s, rng) => {
      const cost = Math.min(Math.max(0, s.character.money), dollars(rng.int(50, 400), s.date.year));
      s.character.money -= cost;
      hurt(s, rng.int(0, 10));
      say(s, rng, 'event', 'event.mugged', { money: cost });
    },
  },
  {
    id: 'windfall',
    // Babies find nothing; kids find pocket money; adults find real money.
    weight: (_c, ctx) => (ctx.age >= 6 ? 0.8 : 0),
    run: (s, rng, ctx) => {
      if (ctx.age < 16) {
        const found = dollars(rng.int(5, 60), s.date.year);
        s.character.money += found;
        say(s, rng, 'money', 'money.windfall.kid', { money: found });
        return;
      }
      const gain = dollars(rng.int(200, 2500), s.date.year);
      s.character.money += gain;
      say(s, rng, 'money', 'money.windfall', { money: gain });
    },
  },
  {
    id: 'viral',
    weight: (c, ctx) => (ctx.age >= 13 ? (c.graded ? 1.5 : 0.5) : 0),
    run: (s, rng) => {
      changeRep(s.character, 'fame', rng.int(3, 10));
      say(s, rng, 'event', s.character.graded ? 'event.viral.graded' : 'event.viral');
    },
  },
  {
    id: 'bullied',
    weight: (c, ctx) => (ctx.age >= 10 && ctx.age <= 18 && (lowRank(c) || (!c.graded && c.charm <= 4)) ? 2.5 : 0),
    run: (s, rng) => {
      const c = s.character;
      say(s, rng, 'event', lowRank(c) ? 'event.bullied.dud' : 'event.bullied');
      if (rng.chance(0.4)) changeAttr(c, 'nerve', 1);
    },
  },
  {
    id: 'school-fight',
    weight: (_c, ctx) => (ctx.age >= 11 && ctx.age <= 18 ? 1 : 0),
    run: (s, rng) => {
      const c = s.character;
      if (c.graded && rng.chance(0.5)) {
        changeRep(c, 'infamy', 3);
        say(s, rng, 'law', 'law.school-fight.power');
      } else {
        hurt(s, 5);
        say(s, rng, 'event', 'event.school-fight');
      }
    },
  },
  {
    id: 'strain-episode',
    weight: (c, ctx) => (c.graded && !c.powersGone && ctx.focus === 'train' ? (c.grade === 'I' ? 3 : 1) : 0),
    run: (s, rng) => {
      hurt(s, rng.int(10, 30));
      say(s, rng, 'power', 'power.strain-episode');
    },
  },
  {
    id: 'aurelian-recruiter',
    weight: (c, ctx) =>
      rankAtLeast(c, 'C') && ctx.year >= 1972 && ctx.age >= 16 && ctx.age <= 35 && c.record.length === 0 && !tied(c, 'Aurelian')
        ? 1 + c.fame / 20 + (tied(c, 'Ashgrove Academy') ? 2 : 0)
        : 0,
    run: (s, rng) => {
      offer(s, rng, 'aurelian-recruiter');
      return { pause: true };
    },
  },
  {
    id: 'low-kings',
    weight: (c, ctx) =>
      ctx.year >= 2011 && ctx.age >= 15 && rough(c.district) && !tied(c, 'Low Kings') && !tied(c, 'the Choir') && (c.streetCred >= 5 || ctx.focus === 'crime') ? 1.5 : 0,
    run: (s, rng) => {
      offer(s, rng, 'low-kings');
      return { pause: true };
    },
  },
  {
    id: 'choir-offer',
    weight: (c, ctx) =>
      ctx.year >= 1990 && ctx.age >= 16 && !tied(c, 'the Choir') && (rough(c.district) || ctx.focus === 'crime') ? (rankAtLeast(c, 'D') ? 1.2 : 0.6) : 0,
    run: (s, rng) => {
      offer(s, rng, 'choir-offer');
      return { pause: true };
    },
  },
  {
    id: 'flatline-threat',
    weight: (c) => (c.graded && c.fame >= 20 ? 1 : 0),
    run: (s, rng) => {
      offer(s, rng, 'flatline-threat', s.date.year >= 2017 ? 'event.flatline-threat' : 'event.hate-threat');
      return { pause: true };
    },
  },
  {
    id: 'ashgrove-offer',
    weight: (c, ctx) => (ctx.year >= 1979 && ctx.age >= 13 && ctx.age <= 17 && rankAtLeast(c, 'C') && !tied(c, 'Ashgrove Academy') ? 2 : 0),
    run: (s, rng) => {
      offer(s, rng, 'ashgrove-offer');
      return { pause: true };
    },
  },
  {
    id: 'rent-hike',
    // A child on the street is not anybody's tenant.
    weight: (c, ctx) => (c.livesWithFamily || ctx.age < 16 ? 0 : 1),
    run: (s, rng) => {
      const cost = pay(s, 600);
      say(s, rng, 'money', 'money.rent-hike', { money: cost });
    },
  },
  {
    id: 'met-someone',
    weight: (_c, ctx) => (ctx.age >= 16 && ctx.age <= 60 ? 1 + (ctx.focus === 'family' ? 2 : 0) : 0),
    run: (s, rng, ctx) => say(s, rng, 'life', 'life.met-someone', {}, ctx.focus),
  },
  {
    id: 'near-death',
    weight: (c, ctx) => (ctx.age >= 14 && (ctx.focus === 'crime' || rough(c.district)) ? 0.4 : 0),
    run: (s, rng, ctx) => {
      const c = s.character;
      hurt(s, rng.int(40, 70));
      offer(s, rng, 'near-death');
      // A Breakthrough: rare, almost always before 30, triggered by near-death, and it always costs something.
      if (c.graded && !c.powersGone && ctx.age < 30 && rng.chance(0.15)) {
        const i = RANKS.indexOf(c.powers[0].rank);
        if (i < RANKS.indexOf('S')) {
          c.powers[0].rank = RANKS[i + 1];
          changeAttr(c, 'body', -1);
          say(s, rng, 'power', 'power.breakthrough');
        }
      }
      return { pause: true };
    },
  },
];

/** About one notable event every six months. */
export const EVENT_CHANCE = 0.17;

// Texture: no numbers change, but the city keeps talking. Rolled separately so it never crowds out
// the events above (and never shifts their balance).
export const TEXTURE_EVENTS: LifeEvent[] = [
  { id: 'city-news', weight: (_c, ctx) => (ctx.age >= 8 ? 1.5 : 0), run: (s, rng) => say(s, rng, 'world', 'world.news') },
  { id: 'childhood', weight: (_c, ctx) => (ctx.age >= 4 && ctx.age <= 11 ? 4 : 0), run: (s, rng) => say(s, rng, 'life', 'life.childhood') },
  { id: 'teen-life', weight: (_c, ctx) => (ctx.age >= 12 && ctx.age <= 17 ? 1.5 : 0), run: (s, rng) => say(s, rng, 'life', 'life.teen') },
  { id: 'work-day', weight: (c) => (c.job ? 1.2 : 0), run: (s, rng) => say(s, rng, 'event', 'event.work', { job: s.character.job!.title }) },
  {
    id: 'prejudice',
    weight: (c, ctx) => (c.graded && ctx.age >= 14 ? (c.district === 'Kesler Heights' ? 2 : 1) : 0),
    run: (s, rng) => say(s, rng, 'event', 'event.prejudice'),
  },
  {
    id: 'family-moment',
    weight: (c, ctx) => (ctx.focus === 'family' ? 2 : c.livesWithFamily ? 0.8 : 0),
    run: (s, rng, ctx) => say(s, rng, 'life', 'life.family', {}, ctx.focus),
  },
];

/** About one texture line every eight months. */
export const TEXTURE_CHANCE = 0.12;

// ---------- Growing up: one milestone on each birthday from 4 to 17 ----------
// Some ages always bring the same moment (first day of school at 6, high
// school placement at 13, the road test at 16, senior year at 17); the rest draw one moment from
// the pool below that has not happened yet. Each happens once in a life.

interface Milestone {
  id: string;
  ages: [number, number];
  /** Fixed milestones always happen at their age; the rest are drawn. */
  fixed?: boolean;
  /** Offers a decision (skipped when another decision is already waiting). */
  decision?: boolean;
  when?: (s: GameState) => boolean;
  run: (s: GameState, rng: Rng) => void;
}

const friendOf = (s: GameState) => around(s, (p) => p.relation === 'friend' && !p.estranged).sort((a, b) => b.bond - a.bond)[0];
const near = (s: GameState, rng: Rng) => Math.max(4, ageOf(s) + rng.int(-1, 1));
const heal = (s: GameState, by: number) => healBy(s.character, by);

export const MILESTONES: Milestone[] = [
  {
    id: 'first-day',
    ages: [6, 6],
    fixed: true,
    run: (s, rng) => {
      const c = s.character;
      enrollSchool(c);
      const school = schoolName(c, 6);
      if (rng.chance(0.65)) {
        const p = addPerson(s, rng, 'friend', 55, near(s, rng));
        say(s, rng, 'life', 'milestone.first-day.friend', personVars(p, { school }));
      } else {
        const p = addPerson(s, rng, 'rival', 25, near(s, rng));
        say(s, rng, 'life', 'milestone.first-day.rival', personVars(p, { school }));
      }
    },
  },
  {
    id: 'track',
    ages: [13, 13],
    fixed: true,
    decision: true,
    when: (s) => s.character.school !== 'ashgrove-academy',
    run: (s, rng) => offer(s, rng, 'school-track', 'event.school-track'),
  },
  {
    id: 'road-test',
    ages: [16, 16],
    fixed: true,
    run: (s, rng) => {
      const c = s.character;
      if (c.mind + c.nerve + rng.int(0, 3) < 10) {
        say(s, rng, 'life', 'milestone.road-test.fail');
        return;
      }
      mark(c, 'drivers-license');
      if (c.background === 'wealthy') {
        c.car = 'reliable';
        say(s, rng, 'life', 'milestone.road-test.car-gift');
      } else if (c.money >= dollars(1500, s.date.year)) {
        const cost = dollars(1500, s.date.year);
        c.money -= cost;
        c.car = 'beater';
        say(s, rng, 'money', 'milestone.road-test.beater', { money: cost });
      } else say(s, rng, 'life', 'milestone.road-test.pass');
    },
  },
  {
    id: 'senior',
    ages: [17, 17],
    fixed: true,
    decision: true,
    when: (s) => s.character.education === 'none',
    run: (s, rng) => offer(s, rng, 'senior-year', 'event.senior-year'),
  },

  // The pool.
  {
    id: 'temperament',
    ages: [4, 5],
    run: (s, rng) => {
      const stat = rng.pick(['body', 'mind', 'charm', 'nerve'] as const);
      changeAttr(s.character, stat, 1);
      say(s, rng, 'life', `milestone.temperament.${stat}`);
    },
  },
  {
    id: 'summer',
    ages: [7, 11],
    run: (s, rng) => {
      const c = s.character;
      if (rough(c.district)) {
        if (rng.chance(0.5)) { changeAttr(c, 'nerve', 1); say(s, rng, 'life', 'milestone.summer.street'); }
        else { hurt(s, 3); say(s, rng, 'life', 'milestone.summer.scrape'); }
      } else {
        const stat = rng.chance(0.5) ? 'body' : 'charm';
        changeAttr(c, stat, 1);
        say(s, rng, 'life', `milestone.summer.camp-${stat}`);
      }
    },
  },
  {
    id: 'science-fair',
    ages: [8, 12],
    run: (s, rng) => {
      const c = s.character;
      if (c.mind >= 5 || (c.gpa ?? 0) >= 3) {
        changeAttr(c, 'mind', 1);
        changeGpa(c, 0.2);
        bondAll(s, isParent, 5);
        say(s, rng, 'life', 'milestone.science-fair.ribbon');
      } else say(s, rng, 'life', 'milestone.science-fair.volcano');
    },
  },
  {
    id: 'wipeout',
    ages: [9, 12],
    run: (s, rng) => {
      const c = s.character;
      if (c.body + rng.int(1, 6) >= 8) {
        if (rng.chance(0.5)) changeAttr(c, 'body', 1);
        else changeAttr(c, 'nerve', 1);
        say(s, rng, 'life', 'milestone.wipeout.clean');
      } else {
        hurt(s, 6);
        say(s, rng, 'life', 'milestone.wipeout.crash');
      }
    },
  },
  { id: 'bully', ages: [7, 11], decision: true, run: (s, rng) => offer(s, rng, 'schoolyard-bully', 'event.schoolyard-bully') },
  {
    id: 'dare',
    ages: [8, 12],
    decision: true,
    when: (s) => !!friendOf(s),
    run: (s, rng) => offer(s, rng, 'corner-store-dare', 'event.corner-store-dare', {}, friendOf(s)),
  },
  {
    id: 'growth-spurt',
    ages: [13, 15],
    run: (s, rng) => {
      const c = s.character;
      const stat = rng.chance(0.5) ? 'body' : 'charm';
      changeAttr(c, stat, 1);
      say(s, rng, 'life', c.livesWithFamily && (c.background === 'working class' || c.background === 'foster system') ? 'milestone.growth.tight' : `milestone.growth.${stat}`);
    },
  },
  {
    id: 'hallways',
    ages: [14, 17],
    run: (s, rng) => {
      const c = s.character;
      const roll = c.charm + c.nerve + rng.int(-2, 3);
      if (roll >= 11) {
        const p = addPerson(s, rng, 'friend', 60, near(s, rng));
        say(s, rng, 'life', 'milestone.hallways.friend', personVars(p));
      } else if (roll >= 8) {
        const p = addPerson(s, rng, 'rival', 20, near(s, rng));
        say(s, rng, 'life', 'milestone.hallways.rival', personVars(p));
      } else {
        changeRep(c, 'streetCred', 2);
        if (rng.chance(0.4)) changeAttr(c, 'nerve', 1);
        say(s, rng, 'life', 'milestone.hallways.scene');
      }
    },
  },
  {
    id: 'joyride',
    ages: [15, 17],
    decision: true,
    when: (s) => !!friendOf(s),
    run: (s, rng) => offer(s, rng, 'joyride', 'event.joyride', {}, friendOf(s)),
  },
  {
    id: 'summer-job',
    ages: [15, 17],
    run: (s, rng) => {
      const c = s.character;
      const pay = dollars(rng.int(900, 2200), s.date.year);
      c.money += pay;
      if (rng.chance(0.4)) changeAttr(c, rng.chance(0.5) ? 'nerve' : 'body', 1);
      say(s, rng, 'money', 'milestone.summer-job', { money: pay });
    },
  },
];

/** On each birthday from 4 to 17: one milestone (see MILESTONES). Returns true if it offered a decision. */
export function birthdayMilestone(s: GameState, rng: Rng, age: number): boolean {
  const c = s.character;
  if (age < 4 || age > 17) return false;
  const busy = !!s.pending;
  const ok = (m: Milestone) => age >= m.ages[0] && age <= m.ages[1] && !marked(c, `m:${m.id}`) && (!m.decision || !busy) && (!m.when || m.when(s));
  const fixed = MILESTONES.find((m) => m.fixed && ok(m));
  // A teen who missed earlier moments (a late start) can still draw them while the age fits.
  const pick = fixed ?? rng.weighted(MILESTONES.filter((m) => !m.fixed && ok(m)).map((m) => ({ item: m, weight: 1 })));
  if (!pick) return false;
  mark(c, `m:${pick.id}`);
  pick.run(s, rng);
  return !!s.pending && !busy;
}

/** A pet's year, on your birthday: upkeep, a little calm, and old age. */
export function petYear(s: GameState, rng: Rng) {
  const pet = s.character.pet;
  if (!pet) return;
  if (!s.character.livesWithFamily && ageOf(s) >= 18) s.character.money -= dollars(300, s.date.year);
  heal(s, 3);
  if (s.date.year - pet.since >= 10 && rng.chance(0.15)) {
    s.character.pet = null;
    say(s, rng, 'life', 'life.pet-died', { pet: pet.kind, petName: pet.name });
  }
}

// ---------- Ordinary life: rolled on their own so they never crowd out the events above ----------

const hasJob = (c: Character) => !!c.job;
const once = (c: Character, id: string) => !marked(c, `e:${id}`);
const offerOnce = (s: GameState, rng: Rng, id: string, who?: Person) => {
  mark(s.character, `e:${id}`);
  offer(s, rng, id, `event.${id}`, {}, who);
  return { pause: true };
};
const familyOf = (s: GameState) => around(s, (p) => isFamily(p) && !p.estranged && p.relation !== 'child');

export const MUNDANE_EVENTS: LifeEvent[] = [
  {
    id: 'transit-strike',
    weight: (c, ctx) => (ctx.age >= 14 && !c.car && ctx.year >= 1960 ? 1 : 0),
    run: (s, rng) => {
      if (s.character.money > dollars(85, s.date.year) && rng.chance(0.6)) {
        const cost = pay(s, 85);
        say(s, rng, 'money', 'mundane.transit-strike.cab', { money: cost });
      } else {
        hurt(s, 2);
        say(s, rng, 'life', 'mundane.transit-strike.walk');
      }
    },
  },
  {
    id: 'pipe-burst',
    weight: (c, ctx) => (!c.livesWithFamily && ctx.age >= 18 ? (rough(c.district) ? 1.5 : 0.7) : 0),
    run: (s, rng) => {
      if (s.character.money > 0) {
        const cost = pay(s, 220);
        say(s, rng, 'money', 'mundane.pipe-burst', { money: cost });
      } else {
        hurt(s, 3);
        say(s, rng, 'life', 'mundane.pipe-burst.broke');
      }
    },
  },
  {
    id: 'tax-refund',
    weight: (c, ctx) => (ctx.age >= 19 && hasJob(c) ? 0.8 : 0),
    run: (s, rng) => {
      const gain = dollars(rng.int(380, 950), s.date.year);
      s.character.money += gain;
      say(s, rng, 'money', 'mundane.tax-refund', { money: gain });
    },
  },
  {
    id: 'jury-duty',
    weight: (c, ctx) => (ctx.age >= 20 && c.record.length === 0 ? 0.6 : 0),
    run: (s, rng) => {
      const c = s.character;
      const gain = dollars(120, s.date.year);
      c.money += gain;
      if (rng.chance(0.25)) changeAttr(c, 'mind', 1);
      say(s, rng, 'life', 'mundane.jury-duty', { money: gain });
    },
  },
  {
    id: 'block-party',
    weight: (_c, ctx) => (ctx.month === 7 || ctx.month === 8 ? 4 : 0),
    run: (s, rng) => {
      heal(s, 4);
      if (rng.chance(0.2)) changeAttr(s.character, 'charm', 1);
      say(s, rng, 'life', 'mundane.block-party');
    },
  },
  {
    id: 'workplace-audit',
    weight: (c, ctx) => (hasJob(c) && ctx.age >= 21 ? 0.7 : 0),
    run: (s, rng) => {
      const c = s.character;
      if (c.mind >= 6 || c.charm >= 6) {
        const bonus = dollars(300, s.date.year);
        c.money += bonus;
        c.job!.salary += dollars(1800, s.date.year);
        say(s, rng, 'money', 'mundane.audit.impressed', { money: bonus, job: c.job!.title, salary: c.job!.salary });
      } else {
        hurt(s, 3);
        say(s, rng, 'money', 'mundane.audit', { job: c.job!.title });
      }
    },
  },
  {
    id: 'amateur-league',
    weight: (c, ctx) => (ctx.age >= 18 && ctx.age <= 45 && c.body >= 5 ? 0.6 : 0),
    run: (s, rng) => {
      if (rng.chance(0.3)) changeAttr(s.character, 'body', 1);
      heal(s, 3);
      const p = addPerson(s, rng, 'friend', 50, ageOf(s) + rng.int(-6, 6));
      say(s, rng, 'life', 'mundane.league', personVars(p));
    },
  },
  {
    id: 'skimmer',
    weight: (c, ctx) => (ctx.year >= 2002 && ctx.age >= 18 && c.money >= dollars(300, ctx.year) ? 0.5 : 0),
    run: (s, rng) => {
      pay(s, 180);
      offer(s, rng, 'skimmer', 'event.skimmer', { money: dollars(180, s.date.year) });
      return { pause: true };
    },
  },
  {
    id: 'dental',
    weight: (_c, ctx) => (ctx.age >= 18 ? 0.6 : 0),
    run: (s, rng) => { offer(s, rng, 'dental'); return { pause: true }; },
  },
  {
    id: 'stray-pet',
    weight: (c, ctx) => (ctx.age >= 8 && !c.pet ? 0.5 : 0),
    run: (s, rng) => { offer(s, rng, 'stray-pet'); return { pause: true }; },
  },
  {
    id: 'car-trouble',
    weight: (c) => (c.car === 'beater' ? 1 : 0),
    run: (s, rng) => { offer(s, rng, 'car-trouble'); return { pause: true }; },
  },
  {
    id: 'union-drive',
    weight: (c, ctx) => (hasJob(c) && rough(c.district) && ctx.year >= 1950 && once(c, 'union-drive') ? 0.8 : 0),
    run: (s, rng) => offerOnce(s, rng, 'union-drive'),
  },
  {
    id: 'family-shortfall',
    weight: (c, ctx) =>
      ctx.age >= 15 && (c.background === 'working class' || c.background === 'graded family' || c.background === 'foster system') ? 0.6 : 0,
    run: (s, rng) => {
      if (!familyOf(s).some(isParent)) return;
      offer(s, rng, 'family-shortfall');
      return { pause: true };
    },
  },
  {
    id: 'bail-call',
    weight: (_c, ctx) => (ctx.age >= 16 ? 0.4 : 0),
    run: (s, rng) => {
      const who = around(s, (p) => (p.relation === 'friend' || p.relation === 'sibling') && !p.estranged && p.bond >= 40 && s.date.year - p.born >= 16)[0];
      if (!who) return;
      offer(s, rng, 'bail-call', 'event.bail-call', { money: dollars(500, s.date.year) }, who);
      return { pause: true };
    },
  },
  {
    id: 'sibling-kindling',
    weight: (c) => (c.background === 'graded family' ? 0.5 : 0.15),
    run: (s, rng) => {
      const who = around(s, (p) => p.relation === 'sibling' && !p.graded && s.date.year - p.born >= 10 && s.date.year - p.born <= 22)[0];
      if (!who) return;
      offer(s, rng, 'sibling-kindling', 'event.sibling-kindling', {}, who);
      return { pause: true };
    },
  },
  {
    id: 'move-in',
    weight: (c, ctx) => (ctx.age >= 20 && !c.livesWithFamily ? 0.8 : 0),
    run: (s, rng) => {
      const who = around(s, (p) => p.relation === 'partner' && !p.livesWithYou && p.bond >= 75)[0];
      if (!who) return;
      offer(s, rng, 'move-in', 'event.move-in', {}, who);
      return { pause: true };
    },
  },
  {
    id: 'rival',
    weight: (_c, ctx) => (ctx.age >= 12 ? 0.8 : 0),
    run: (s, rng) => {
      const who = around(s, (p) => p.relation === 'rival' && p.bond <= 35)[0];
      if (!who) return;
      offer(s, rng, 'rival', 'event.rival', {}, who);
      return { pause: true };
    },
  },
  {
    id: 'first-lease',
    weight: (c, ctx) => (ctx.age >= 18 && ctx.age <= 23 && !c.livesWithFamily && once(c, 'first-lease') ? 6 : 0),
    run: (s, rng) => offerOnce(s, rng, 'first-lease'),
  },
  {
    id: 'scapegoat',
    weight: (c, ctx) => (ctx.age >= 21 && ctx.age <= 29 && hasJob(c) && once(c, 'scapegoat') ? 0.8 : 0),
    run: (s, rng) => offerOnce(s, rng, 'scapegoat'),
  },
  {
    id: 'aging-parent',
    weight: (c, ctx) => (ctx.age >= 32 && ctx.age <= 48 && once(c, 'aging-parent') ? 1 : 0),
    run: (s, rng) => {
      const who = around(s, (p) => isParent(p) && !p.estranged && s.date.year - p.born >= 62)[0];
      if (!who) return;
      return offerOnce(s, rng, 'aging-parent', who);
    },
  },
  {
    id: 'midlife',
    weight: (c, ctx) => (ctx.age >= 35 && ctx.age <= 49 && once(c, 'midlife') ? 1 : 0),
    run: (s, rng) => offerOnce(s, rng, 'midlife'),
  },
  {
    id: 'torch',
    weight: (c, ctx) => (ctx.age >= 50 && ctx.age <= 68 && once(c, 'torch') ? 1 : 0),
    run: (s, rng) => offerOnce(s, rng, 'torch'),
  },
  {
    id: 'pension',
    weight: (c, ctx) => (ctx.age >= 55 && hasJob(c) && c.job!.id !== 'senior-advisor' && once(c, 'pension') ? 1 : 0),
    run: (s, rng) => offerOnce(s, rng, 'pension'),
  },
];

/** About one ordinary-life event a year. */
export const MUNDANE_CHANCE = 0.08;
