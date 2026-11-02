// Choices. A pausing event offers a decision; time stops until the player picks an option.
// Every effect of every option is applied here, by the engine. The writer only describes them.

import { crimePay, dollars, eligibleJobs, hire, jobLicense, prisonName, RENT, sentence } from './economy';
import { kindle } from './powers';
import { Rng } from './random';
import { addMonths, ageOf, changeAttr, changeRep } from './state';
import type { Character, District, GameState, LogEntry } from './types';
import { say, write, type Vars } from './writer/writer';

interface OptionSpec {
  id: string;
  label: string;
  /** Whether the option is offered right now. */
  when?: (s: GameState) => boolean;
  apply: (s: GameState, rng: Rng) => void;
}

interface DecisionSpec {
  kind: LogEntry['kind'];
  options: OptionSpec[];
}

const tie = (c: Character, group: string) => {
  c.ties = [...new Set([...(c.ties ?? []), group])];
};
const tied = (c: Character, group: string) => (c.ties ?? []).includes(group);
const crew = (c: Character) => tied(c, 'Low Kings') || tied(c, 'the Choir');
const hurt = (c: Character, by: number) => { c.health = Math.max(0, c.health - by); };
const rankOf = (c: Character) => (c.graded && !c.powersGone ? c.powers[0].rank : undefined);

export function arrest(s: GameState, rng: Rng, offense: string, base: [number, number]) {
  const c = s.character;
  const rank = rankOf(c);
  let months = sentence(rng.int(base[0], base[1]), rank);
  if (tied(c, 'the Choir')) months = Math.round(months * 0.75); // the Choir pays for lawyers
  c.record.push({ year: s.date.year, offense, sentenceMonths: months });
  c.inPrisonUntil = addMonths(s.date, months);
  c.job = null;
  if (c.license === 'Vigilance' || c.license === 'Utility') c.license = 'Civilian';
  return { months, prison: prisonName(rank, s.date.year) };
}

export const DECISIONS: Record<string, DecisionSpec> = {
  'aurelian-recruiter': {
    kind: 'event',
    options: [
      {
        id: 'sign',
        label: 'Sign with Aurelian',
        apply: (s, rng) => {
          const c = s.character;
          tie(c, 'Aurelian');
          if (c.leaning === 'undecided') c.leaning = 'hero';
          if (ageOf(s) < 18) {
            const bonus = dollars(5000, s.date.year);
            c.money += bonus;
            changeRep(c, 'fame', 3);
            say(s, rng, 'event', 'choice.aurelian.sign-minor', { money: bonus });
            return;
          }
          const spec = eligibleJobs(c, ageOf(s)).find((j) => j.id === 'national-hero' || j.id === 'regional-hero')
            ?? eligibleJobs(c, ageOf(s)).find((j) => j.id === 'security');
          changeRep(c, 'fame', 5);
          if (spec) {
            c.job = hire(spec, s.date.year);
            c.license = jobLicense(spec.id) ?? c.license;
            say(s, rng, 'event', spec.id === 'security' ? 'choice.aurelian.sign-security' : 'choice.aurelian.sign-hero', { job: c.job.title, salary: c.job.salary, license: c.license });
          } else say(s, rng, 'event', 'choice.aurelian.sign-minor', { money: 0 });
        },
      },
      { id: 'wait', label: 'Ask for time to think', apply: (s, rng) => say(s, rng, 'event', 'choice.aurelian.wait') },
      {
        id: 'refuse',
        label: 'Turn them down',
        apply: (s, rng) => { changeRep(s.character, 'streetCred', 2); say(s, rng, 'event', 'choice.aurelian.refuse'); },
      },
    ],
  },

  'low-kings': {
    kind: 'event',
    options: [
      {
        id: 'join',
        label: 'Take the steel ring',
        apply: (s, rng) => {
          const c = s.character;
          tie(c, 'Low Kings');
          changeRep(c, 'streetCred', 8);
          changeRep(c, 'infamy', 3);
          say(s, rng, 'event', 'choice.lowkings.join');
        },
      },
      {
        id: 'help',
        label: 'Help at the soup kitchen, nothing more',
        apply: (s, rng) => { changeRep(s.character, 'streetCred', 3); say(s, rng, 'event', 'choice.lowkings.help'); },
      },
      { id: 'refuse', label: 'Say no', apply: (s, rng) => say(s, rng, 'event', 'choice.lowkings.refuse') },
    ],
  },

  'choir-offer': {
    kind: 'event',
    options: [
      {
        id: 'join',
        label: 'Become a voice',
        when: (s) => !tied(s.character, 'Low Kings'),
        apply: (s, rng) => {
          const c = s.character;
          tie(c, 'the Choir');
          const [lo, hi] = crimePay(rankOf(c));
          const pay = dollars(rng.int(lo, hi), s.date.year);
          c.money += pay;
          changeRep(c, 'infamy', 5);
          changeRep(c, 'streetCred', 5);
          if (c.leaning === 'undecided') c.leaning = 'villain';
          say(s, rng, 'event', 'choice.choir.join', { money: pay });
        },
      },
      {
        id: 'once',
        label: 'Do one job and walk away',
        apply: (s, rng) => {
          const c = s.character;
          if (rng.chance(0.12)) {
            const { months, prison } = arrest(s, rng, 'Conspiracy (Choir courier job)', [6, 24]);
            say(s, rng, 'law', 'choice.choir.once-caught', { months, prison });
            return;
          }
          const [lo, hi] = crimePay(rankOf(c));
          const pay = dollars(rng.int(lo, hi), s.date.year);
          c.money += pay;
          changeRep(c, 'infamy', 2);
          say(s, rng, 'money', 'choice.choir.once', { money: pay });
        },
      },
      { id: 'refuse', label: 'Decline politely', apply: (s, rng) => say(s, rng, 'event', 'choice.choir.refuse') },
    ],
  },

  'flatline-threat': {
    kind: 'event',
    options: [
      {
        id: 'move',
        label: 'Move to another district',
        apply: (s, rng) => {
          const c = s.character;
          const cost = dollars(3000, s.date.year);
          c.money -= cost;
          const to: District = c.district === 'Saint Bryce' ? 'Kesler Heights' : 'Saint Bryce';
          c.district = to;
          c.livesWithFamily = false;
          say(s, rng, 'event', 'choice.threat.move', { money: cost, to });
        },
      },
      {
        id: 'security',
        label: 'Pay for private security',
        when: (s) => s.character.money > 0,
        apply: (s, rng) => {
          const cost = dollars(8000, s.date.year);
          s.character.money -= cost;
          say(s, rng, 'event', 'choice.threat.security', { money: cost });
        },
      },
      {
        id: 'public',
        label: 'Go on camera about it',
        apply: (s, rng) => {
          const c = s.character;
          changeRep(c, 'fame', 5);
          if (rng.chance(0.3)) {
            const by = rng.int(20, 40);
            hurt(c, by);
            say(s, rng, 'event', 'choice.threat.attacked');
          } else say(s, rng, 'event', 'choice.threat.public');
        },
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        apply: (s, rng) => {
          if (rng.chance(0.4)) {
            hurt(s.character, rng.int(25, 60));
            say(s, rng, 'event', 'choice.threat.attacked');
          } else say(s, rng, 'event', 'choice.threat.ignore');
        },
      },
    ],
  },

  'near-death': {
    kind: 'event',
    options: [
      {
        id: 'police',
        label: 'Give the police a statement',
        apply: (s, rng) => {
          const c = s.character;
          changeRep(c, 'streetCred', -8);
          changeRep(c, 'fame', 1);
          if (rng.chance(0.2)) hurt(c, 10);
          say(s, rng, 'law', 'choice.neardeath.police');
        },
      },
      {
        id: 'silent',
        label: 'Say you saw nothing',
        apply: (s, rng) => { changeRep(s.character, 'streetCred', 4); say(s, rng, 'event', 'choice.neardeath.silent'); },
      },
      {
        id: 'crew',
        label: 'Let your people handle it',
        when: (s) => crew(s.character),
        apply: (s, rng) => {
          const c = s.character;
          c.health = Math.min(100, c.health + 15);
          changeRep(c, 'streetCred', 2);
          changeRep(c, 'infamy', 1);
          say(s, rng, 'event', 'choice.neardeath.crew');
        },
      },
    ],
  },

  kindling: {
    kind: 'power',
    options: [
      {
        id: 'family',
        label: 'Tell your family everything',
        apply: (s, rng) => {
          const c = s.character;
          changeAttr(c, c.livesWithFamily ? 'charm' : 'nerve', 1);
          say(s, rng, 'life', 'choice.kindling.family');
        },
      },
      {
        id: 'train',
        label: 'Practise in secret',
        apply: (s, rng) => {
          const c = s.character;
          c.gradeProgress += 3;
          hurt(c, 5);
          say(s, rng, 'power', 'choice.kindling.train');
        },
      },
      {
        id: 'show',
        label: 'Show it off',
        apply: (s, rng) => {
          const c = s.character;
          changeRep(c, 'fame', 3);
          if (c.powers[0] && ['F', 'E'].includes(c.powers[0].rank)) changeRep(c, 'fame', -4);
          say(s, rng, 'event', 'choice.kindling.show');
        },
      },
    ],
  },

  'rush-offer': {
    kind: 'event',
    options: [
      {
        id: 'try',
        label: 'Try it',
        apply: (s, rng) => {
          const c = s.character;
          const rush = s.date.year >= 2014;
          if (rush && !c.graded && rng.chance(1 / 200)) {
            say(s, rng, 'power', 'choice.rush.kindle');
            kindle(s, rng, {});
            return;
          }
          if (rng.chance(0.05)) {
            hurt(c, rng.int(30, 50));
            say(s, rng, 'event', rush ? 'choice.rush.overdose' : 'choice.burn.overdose');
            return;
          }
          hurt(c, rng.int(5, 15));
          changeRep(c, 'streetCred', 1);
          if (!rush) say(s, rng, 'event', 'choice.burn.try');
          else if (c.graded) say(s, rng, 'power', 'choice.rush.try-graded');
          else say(s, rng, 'event', rng.chance(0.4) ? 'choice.rush.try-flash' : 'choice.rush.try-nothing');
        },
      },
      { id: 'walk', label: 'Walk away', apply: (s, rng) => say(s, rng, 'event', 'choice.rush.walk') },
      {
        id: 'sell',
        label: 'Ask about selling it',
        when: (s) => ageOf(s) >= 16,
        apply: (s, rng) => {
          const c = s.character;
          const pay = dollars(rng.int(1000, 4000), s.date.year);
          c.money += pay;
          changeRep(c, 'infamy', 2);
          if (tied(c, 'Low Kings')) changeRep(c, 'streetCred', -10); // the Low Kings' first rule
          say(s, rng, 'money', 'choice.rush.sell', { money: pay });
        },
      },
    ],
  },

  'ashgrove-offer': {
    kind: 'event',
    options: [
      {
        id: 'accept',
        label: 'Go to Ashgrove',
        apply: (s, rng) => {
          const c = s.character;
          tie(c, 'Ashgrove Academy');
          changeAttr(c, 'mind', 1);
          c.gradeProgress += 6;
          changeRep(c, 'fame', 2);
          say(s, rng, 'life', 'choice.ashgrove.accept');
        },
      },
      { id: 'decline', label: 'Stay where you are', apply: (s, rng) => { changeAttr(s.character, 'nerve', 1); say(s, rng, 'life', 'choice.ashgrove.decline'); } },
    ],
  },

  // Offered by the "Move to another district" action. Landlords take the first month up front.
  move: {
    kind: 'life',
    options: [
      ...([
        ['Old Foundry', 'The Old Foundry (cheapest)'],
        ['Riverside Docks', 'Riverside Docks'],
        ['Kesler Heights', 'Kesler Heights'],
        ['Saint Bryce', 'Saint Bryce'],
        ['The Spire', 'The Spire'],
        ['Ashgrove', 'The Ashgrove hills (dearest)'],
      ] as [District, string][]).map(([district, label]): OptionSpec => ({
        id: district,
        label,
        when: (s) => s.character.district !== district && s.character.money >= dollars(RENT[district], s.date.year),
        apply: (s, rng) => {
          const c = s.character;
          const deposit = dollars(RENT[district], s.date.year);
          c.money -= deposit;
          c.district = district;
          c.livesWithFamily = false;
          say(s, rng, 'life', 'act.move.done', { money: deposit, rent: deposit });
        },
      })),
      { id: 'stay', label: 'Stay where you are', apply: (s, rng) => say(s, rng, 'life', 'act.move.stay') },
    ],
  },
};

/**
 * Offers a decision: writes the situation into the log and sets it as pending.
 * `situation` is the template key for the opening line (defaults to `event.<id>`).
 */
export function offer(s: GameState, rng: Rng, id: string, situation = `event.${id}`, vars: Vars = {}) {
  const spec = DECISIONS[id];
  if (!spec) throw new Error(`Unknown decision "${id}"`);
  const text = write(s, rng, situation, vars);
  s.log.push({ date: { ...s.date }, kind: spec.kind, text });
  s.pending = {
    id,
    text,
    options: spec.options.filter((o) => !o.when || o.when(s)).map((o) => ({ id: o.id, label: o.label })),
  };
}

/** Applies the player's choice. Returns a new state; the input is never changed. */
export function choose(state: GameState, optionId: string): GameState {
  if (!state.pending) throw new Error('No decision is pending');
  const s: GameState = structuredClone(state);
  const pending = s.pending!;
  const option = DECISIONS[pending.id]?.options.find((o) => o.id === optionId);
  if (!option || !pending.options.some((o) => o.id === optionId)) throw new Error(`"${optionId}" is not an option for ${pending.id}`);
  const rng = new Rng(s.rngState);
  s.pending = null;
  option.apply(s, rng);
  if (s.character.health <= 0) {
    s.character.alive = false;
    say(s, rng, 'death', 'death.injuries');
  }
  s.rngState = rng.state;
  return s;
}
