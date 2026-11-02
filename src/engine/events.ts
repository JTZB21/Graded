// Random life events, drawn with the World roll during time skips.
// Weights depend on age, year, district, focus, Rank, reputation and ties. The engine decides every
// number here; the writer (./writer) turns each outcome into prose. Events that need the player
// offer a decision (./decisions) and stop the skip.

import { offer } from './decisions';
import { dollars } from './economy';
import { RANKS } from './rules';
import type { Rng } from './random';
import { changeAttr, changeRep } from './state';
import type { Character, District, Focus, GameState } from './types';
import { say } from './writer/writer';

export interface EventContext {
  age: number;
  focus: Focus;
  year: number;
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
      // A child's bills go to the parents.
      if (ctx.age < 18 && s.character.livesWithFamily) {
        say(s, rng, 'event', 'event.illness.child');
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
    weight: (c) => (c.livesWithFamily ? 0 : 1),
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
