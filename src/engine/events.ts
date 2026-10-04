// Random life events, drawn with the World roll during time skips.
// Weights depend on age, district, focus, Rank and reputation. `pause` events stop a skip for a decision.

import { dollars } from './economy';
import { RANKS } from './rules';
import type { Rng } from './random';
import { changeAttr, changeRep, log } from './state';
import type { Character, District, Focus, GameState } from './types';

export interface EventContext {
  age: number;
  focus: Focus;
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
        log(s, 'event', 'Two Highgrades take a disagreement through your block. A slab of facade catches you on the way down. The sponsor\'s statement calls it "minimal collateral."');
      } else {
        log(s, 'event', 'A hero fight shuts down your street for a day. The H-Line is out again, and the cleanup bill goes to the city.');
      }
    },
  },
  {
    id: 'card-check',
    weight: (c, ctx) => (c.graded && ctx.age >= 12 ? (rough(c.district) ? 3 : 1) : 0),
    run: (s) => {
      const c = s.character;
      if (c.infamy >= 25) {
        log(s, 'law', 'A card check turns into a night in a holding cell. Someone recognized your name.');
        changeRep(c, 'infamy', 2);
      } else {
        log(s, 'law', 'Police stop you for a card check on the way home. It takes forty minutes and they are not polite about it.');
      }
    },
  },
  {
    id: 'rush-offer',
    weight: (c, ctx) => (ctx.age >= 14 && rough(c.district) ? 2 : 0),
    run: (s) => log(s, 'event', 'Someone on the corner offers you Rush. "Ten minutes of being an A-Rank," he says. You keep walking, this time.'),
  },
  {
    id: 'promotion',
    weight: (c, ctx) => (c.job && ctx.focus === 'work' ? 2 + c.mind / 3 : 0),
    run: (s) => {
      const job = s.character.job!;
      job.salary = Math.round((job.salary * 1.12) / 100) * 100;
      log(s, 'money', `You get a raise. ${job.title} now pays $${job.salary.toLocaleString()} a year.`);
    },
  },
  {
    id: 'laid-off',
    weight: (c) => (c.job && c.job.id !== 'strategic' ? 1 : 0),
    run: (s) => {
      log(s, 'money', `You are let go from your job as ${s.character.job!.title}. The letter mentions "restructuring."`);
      s.character.job = null;
    },
  },
  {
    id: 'illness',
    weight: () => 1.5,
    run: (s, rng) => {
      hurt(s, rng.int(10, 25));
      const surcharge = s.character.graded ? 2 : 1;
      const cost = pay(s, rng.int(400, 3000) * surcharge);
      log(s, 'event', `You get badly sick. Saint Bryce bills you $${cost.toLocaleString()}${surcharge > 1 ? ', Graded surcharge included' : ''}.`);
    },
  },
  {
    id: 'mugged',
    weight: (c, ctx) => (ctx.age >= 14 && rough(c.district) && !rankAtLeast(c, 'C') ? 2 : 0),
    run: (s, rng) => {
      const cost = Math.min(Math.max(0, s.character.money), dollars(rng.int(50, 400), s.date.year));
      s.character.money -= cost;
      hurt(s, rng.int(0, 10));
      log(s, 'event', `You are mugged two blocks from home and lose $${cost.toLocaleString()}.`);
    },
  },
  {
    id: 'windfall',
    weight: () => 0.8,
    run: (s, rng) => {
      const gain = dollars(rng.int(200, 2500), s.date.year);
      s.character.money += gain;
      log(s, 'money', `A lucky break brings in $${gain.toLocaleString()}.`);
    },
  },
  {
    id: 'viral',
    weight: (c, ctx) => (ctx.age >= 13 ? (c.graded ? 1.5 : 0.5) : 0),
    run: (s, rng) => {
      const by = rng.int(3, 10);
      changeRep(s.character, 'fame', by);
      log(s, 'event', s.character.graded
        ? 'A clip of you using your power goes viral. GradeWatch commenters argue about your real Rank.'
        : 'A video of you goes viral for a week. Strangers recognize you at the bodega.');
    },
  },
  {
    id: 'bullied',
    weight: (c, ctx) => (ctx.age >= 10 && ctx.age <= 18 && (lowRank(c) || (!c.graded && c.charm <= 4)) ? 2.5 : 0),
    run: (s, rng) => {
      const c = s.character;
      if (lowRank(c)) log(s, 'event', '"Dud." It is written on your locker in marker. Everyone knows who did it; nobody says.');
      else log(s, 'event', 'A Graded kid makes you their project for the semester. The school calls it "a conflict."');
      if (rng.chance(0.4)) changeAttr(c, 'nerve', 1);
    },
  },
  {
    id: 'school-fight',
    weight: (_c, ctx) => (ctx.age >= 11 && ctx.age <= 18 ? 1 : 0),
    run: (s, rng) => {
      const c = s.character;
      if (c.graded && rng.chance(0.5)) {
        log(s, 'law', 'A schoolyard fight goes wrong when your power slips. Expulsion hearing, a police report, and a note on your Bureau file.');
        changeRep(c, 'infamy', 3);
      } else {
        log(s, 'event', 'You get into a fight at school and come out of it with a split lip and a week of detention.');
        hurt(s, 5);
      }
    },
  },
  {
    id: 'strain-episode',
    weight: (c, ctx) => (c.graded && !c.powersGone && ctx.focus === 'train' ? (c.grade === 'I' ? 3 : 1) : 0),
    run: (s, rng) => {
      hurt(s, rng.int(10, 30));
      log(s, 'power', 'You push too hard in training. Nosebleed, then the floor. You wake up in Saint Bryce\'s Strain Ward on a cooling bed.');
    },
  },
  {
    id: 'aurelian-recruiter',
    weight: (c, ctx) => (rankAtLeast(c, 'C') && ctx.age >= 16 && ctx.age <= 35 && c.record.length === 0 ? 1 + c.fame / 20 : 0),
    run: (s) => {
      log(s, 'event', 'An Aurelian Group talent scout leaves a card with your mother, then with you. "We\'d love to talk about your future." A sponsorship would mean a Vigilance License and a contract with an image clause.');
      return { pause: true };
    },
  },
  {
    id: 'low-kings',
    weight: (c, ctx) => (ctx.age >= 15 && rough(c.district) && (c.streetCred >= 5 || ctx.focus === 'crime') ? 1.5 : 0),
    run: (s) => {
      log(s, 'event', 'A Low Kings lieutenant buys you a coffee at Cal\'s. They could use someone like you on Mercer Street. They will want an answer.');
      return { pause: true };
    },
  },
  {
    id: 'flatline-threat',
    weight: (c) => (c.graded && c.fame >= 20 ? 1 : 0),
    run: (s) => {
      log(s, 'event', 'Flatline posts your home address on a forum, with your Grade Card photo and the word "next."');
      return { pause: true };
    },
  },
  {
    id: 'rent-hike',
    weight: (c) => (c.livesWithFamily ? 0 : 1),
    run: (s) => {
      const cost = pay(s, 600);
      log(s, 'money', `Your landlord adds a "risk deposit" and a rent increase. It costs you $${cost.toLocaleString()} up front.`);
    },
  },
  {
    id: 'met-someone',
    weight: (_c, ctx) => (ctx.age >= 16 && ctx.age <= 60 ? 1 + (ctx.focus === 'family' ? 2 : 0) : 0),
    run: (s) => log(s, 'life', 'You meet someone who makes you laugh. It might go somewhere.'),
  },
  {
    id: 'near-death',
    weight: (c, ctx) => (ctx.age >= 14 && (ctx.focus === 'crime' || rough(c.district)) ? 0.4 : 0),
    run: (s, rng, ctx) => {
      const c = s.character;
      hurt(s, rng.int(40, 70));
      log(s, 'event', 'You are caught in a Rush-fuelled shootout on Pier 9. You lose a lot of blood before the ambulance comes.');
      // A Breakthrough: rare, almost always before 30, triggered by near-death, and it always costs something.
      if (c.graded && !c.powersGone && ctx.age < 30 && rng.chance(0.15)) {
        const i = RANKS.indexOf(c.powers[0].rank);
        if (i < RANKS.indexOf('S')) {
          c.powers[0].rank = RANKS[i + 1];
          changeAttr(c, 'body', -1);
          log(s, 'power', `Breakthrough. Something tears open as you nearly die, and the Bureau reranks you ${c.powers[0].rank}-Rank. The scarring never fades and your body never quite recovers.`);
        }
      }
      return { pause: true };
    },
  },
];

/** About one notable event every six months. */
export const EVENT_CHANCE = 0.17;
