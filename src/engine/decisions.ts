// Choices. A pausing event offers a decision; time stops until the player picks an option.
// Every effect of every option is applied here, by the engine. The writer only describes them.

import { settleLegacy } from './legacy';
import { checkTitles } from './titles';
import { crimePay, dollars, eligibleJobs, hire, jobLicense, prisonName, RENT, sentence } from './economy';
import { addPerson, around, bondAll, isFamily, isParent, peopleOf, vars as personVars } from './people';
import { kindle } from './powers';
import { confiscate } from './gear';
import { enlist, lawyerDiscount, orgForTie } from './orgs';
import { Rng } from './random';
import { clamp } from './rules';
import { admits, changeGpa, COLLEGES, enroll, mark, scholarshipFor, schoolName, yearlyTuition } from './school';
import { addMonths, ageOf, changeAttr, changeRep, heal } from './state';
import type { Character, CollegeKind, District, GameState, LogEntry, Person, SchoolKind } from './types';
import { say, write, type Vars } from './writer/writer';

interface OptionSpec {
  id: string;
  /** Fixed text, or text that shows today's prices. */
  label: string | ((s: GameState) => string);
  /** Whether the option is offered right now. `who` is the person the decision is about, if any. */
  when?: (s: GameState, who?: Person) => boolean;
  apply: (s: GameState, rng: Rng, who?: Person) => void;
}

interface DecisionSpec {
  kind: LogEntry['kind'];
  options: OptionSpec[];
}

const tie = (c: Character, group: string) => {
  c.ties = [...new Set([...(c.ties ?? []), group])];
};
/** Joins a group through a choice: an organisation (see orgs.ts) also starts a membership, if there is none. */
const join = (s: GameState, group: string) => {
  const id = orgForTie(group);
  if (id && !s.character.org) enlist(s, id);
  else tie(s.character, group);
};
const tied = (c: Character, group: string) => (c.ties ?? []).includes(group);
const crew = (c: Character) => tied(c, 'Low Kings') || tied(c, 'the Choir');
const hurt = (c: Character, by: number) => { c.health = Math.max(0, c.health - by); };
const rankOf = (c: Character) => (c.graded && !c.powersGone ? c.powers[0].rank : undefined);

const bond = (p: Person | undefined, by: number) => { if (p) p.bond = clamp(p.bond + by, 0, 100); };
const money = (s: GameState, amount2026: number) => dollars(amount2026, s.date.year);
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
/** A chance at +1, like the actions use. */
const maybe = (c: Character, rng: Rng, stat: 'body' | 'mind' | 'charm' | 'nerve', chance: number) => {
  if (rng.chance(chance)) { changeAttr(c, stat, 1); return true; }
  return false;
};
const near = (s: GameState, rng: Rng, spread = 2) => Math.max(4, ageOf(s) + rng.int(-spread, spread));
const localSchool = (c: Character): SchoolKind => (c.district === 'Old Foundry' || c.district === 'Riverside Docks' ? 'underfunded-public' : 'standard-public');
const COLLEGE_ORDER: CollegeKind[] = ['trade', 'community', 'state', 'spire', 'ashgrove'];
const YEARS: Record<CollegeKind, string> = { trade: '1 year', community: '2 years', state: '4 years', spire: '4 years', ashgrove: '3 years' };

export function arrest(s: GameState, rng: Rng, offense: string, base: [number, number]) {
  const c = s.character;
  const rank = rankOf(c);
  let months = sentence(rng.int(base[0], base[1]), rank);
  if (tied(c, 'the Choir')) months = Math.round(months * 0.75); // the Choir pays for lawyers
  months = Math.max(1, Math.round(months * lawyerDiscount(c)));
  confiscate(c);
  c.record.push({ year: s.date.year, offense, sentenceMonths: months });
  c.inPrisonUntil = addMonths(s.date, months);
  c.job = null;
  if (c.license === 'Vigilance' || c.license === 'Utility') c.license = 'Civilian';
  return { months, prison: prisonName(rank, s.date.year) };
}

export const DECISIONS: Record<string, DecisionSpec> = {
  'partner-proposal': { kind: 'life', options: [
    { id: 'accept', label: 'Accept', when: (s, p) => !!p && p.alive && p.relation === 'partner' && ageOf(s) >= 18 && s.date.year - p.born >= 18,
      apply: (s, rng, p) => {
        if (!p || !p.alive || p.relation !== 'partner' || ageOf(s) < 18 || s.date.year - p.born < 18) throw new Error('Both partners must be adults');
        p.relation = 'spouse'; p.livesWithYou = !s.character.livesWithFamily; bond(p, 10);
        say(s, rng, 'life', 'people.proposal.accept', personVars(p));
      } },
    { id: 'time', label: 'Ask for time', apply: (s, rng, p) => { say(s, rng, 'life', 'people.proposal.time', p ? personVars(p) : {}); } },
    { id: 'no', label: 'Say no', apply: (s, rng, p) => { bond(p, -10); say(s, rng, 'life', 'people.proposal.no', p ? personVars(p) : {}); } },
  ] },
  'aurelian-recruiter': {
    kind: 'event',
    options: [
      {
        id: 'sign',
        label: 'Sign with Aurelian',
        apply: (s, rng) => {
          const c = s.character;
          join(s, 'Aurelian');
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
          join(s, 'Low Kings');
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
          join(s, 'the Choir');
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
          heal(c, 15);
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
          if (ageOf(s) < 18) c.school = 'ashgrove-academy';
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

  // ---------- Childhood (6-12) ----------

  // A dare at the corner store, from a friend. `who` is the friend.
  'corner-store-dare': {
    kind: 'life',
    options: [
      {
        id: 'swipe',
        label: 'Slide it into your jacket',
        apply: (s, rng, who) => {
          const c = s.character;
          if (rng.chance(clamp(0.35 + c.nerve * 0.06, 0.4, 0.85))) {
            maybe(c, rng, 'nerve', 0.5);
            changeRep(c, 'streetCred', 3);
            bond(who, 10);
            say(s, rng, 'life', 'choice.dare.swipe', personVars(who!));
          } else {
            bondAll(s, isParent, -10);
            say(s, rng, 'life', 'choice.dare.caught', personVars(who!));
          }
        },
      },
      {
        id: 'pay',
        label: 'Pay for it with your saved-up change',
        when: (s) => s.character.money >= money(s, 5) || s.character.background === 'wealthy',
        apply: (s, rng, who) => {
          const c = s.character;
          if (c.background !== 'wealthy') c.money -= money(s, 5);
          maybe(c, rng, 'charm', 0.5);
          changeRep(c, 'streetCred', 1);
          say(s, rng, 'life', 'choice.dare.pay', personVars(who!));
        },
      },
      {
        id: 'refuse',
        label: 'Say it is a dumb way to get banned',
        apply: (s, rng, who) => {
          maybe(s.character, rng, 'mind', 0.5);
          bond(who, -5);
          say(s, rng, 'life', 'choice.dare.refuse', personVars(who!));
        },
      },
    ],
  },

  'schoolyard-bully': {
    kind: 'life',
    options: [
      {
        id: 'step-in',
        label: 'Step between them and swing first',
        apply: (s, rng) => {
          const c = s.character;
          changeAttr(c, 'nerve', 1);
          maybe(c, rng, 'body', 0.4);
          hurt(c, 5);
          const f = addPerson(s, rng, 'friend', 70, near(s, rng, 1));
          say(s, rng, 'life', 'choice.bully.step-in', personVars(f));
        },
      },
      {
        id: 'joke',
        label: 'Make a joke loud enough for the yard teacher to hear',
        when: (s) => s.character.charm >= 5 || s.character.mind >= 5,
        apply: (s, rng) => {
          maybe(s.character, rng, 'charm', 0.6);
          const f = addPerson(s, rng, 'friend', 60, near(s, rng, 1));
          say(s, rng, 'life', 'choice.bully.joke', personVars(f));
        },
      },
      { id: 'walk', label: 'Keep your head down and walk past', apply: (s, rng) => say(s, rng, 'life', 'choice.bully.walk') },
    ],
  },

  // ---------- Teens (13-17) ----------

  // High school placement, at 13.
  'school-track': {
    kind: 'life',
    options: [
      {
        id: 'magnet',
        label: 'Sit the entrance exam for Harlan Technical',
        when: (s) => s.character.mind >= 5,
        apply: (s, rng) => {
          const c = s.character;
          if (c.mind >= 6 || rng.chance(0.5)) {
            c.school = 'stem-magnet';
            changeAttr(c, 'mind', 1);
            c.gpa = Math.max(c.gpa ?? 0, 3);
            say(s, rng, 'life', 'choice.track.magnet', { school: schoolName(c, 14) });
          } else {
            c.school = localSchool(c);
            say(s, rng, 'life', 'choice.track.magnet-fail', { school: schoolName(c, 14) });
          }
        },
      },
      {
        id: 'prep',
        label: (s) => (s.character.background === 'wealthy' ? 'Stay on at Vanguard Prep' : 'Apply for a Vanguard Prep scholarship'),
        when: (s) => s.character.mind >= 7 || s.character.body >= 7 || s.character.background === 'wealthy',
        apply: (s, rng) => {
          const c = s.character;
          c.school = 'elite-prep';
          maybe(c, rng, 'charm', 0.6);
          say(s, rng, 'life', c.background === 'wealthy' ? 'choice.track.prep-paid' : 'choice.track.prep-scholarship', { school: schoolName(c, 14) });
        },
      },
      {
        id: 'parish',
        label: 'Enroll at the parish or charter school',
        when: (s) => s.character.record.length === 0 && s.character.background !== 'street',
        apply: (s, rng) => {
          const c = s.character;
          c.school = 'parochial-charter';
          changeGpa(c, 0.2);
          say(s, rng, 'life', 'choice.track.parish', { school: schoolName(c, 14) });
        },
      },
      {
        id: 'local',
        label: 'Go to the neighbourhood high school with your friends',
        apply: (s, rng) => {
          const c = s.character;
          c.school = localSchool(c);
          bondAll(s, (p) => p.relation === 'friend', 10);
          say(s, rng, 'life', 'choice.track.local', { school: schoolName(c, 14) });
        },
      },
    ],
  },

  // A midnight drive with a friend. `who` is the friend.
  joyride: {
    kind: 'life',
    options: [
      {
        id: 'ride',
        label: 'Climb into the passenger seat',
        apply: (s, rng, who) => {
          const c = s.character;
          heal(c, 4);
          maybe(c, rng, 'charm', 0.4);
          bond(who, 12);
          if (rng.chance(0.15)) {
            changeAttr(c, 'nerve', 1);
            say(s, rng, 'law', 'choice.joyride.busted', personVars(who!));
          } else say(s, rng, 'life', 'choice.joyride.ride', personVars(who!));
        },
      },
      {
        id: 'drive',
        label: 'Offer to drive so nobody wrecks it',
        when: (s) => s.character.nerve >= 5 && s.character.mind >= 5,
        apply: (s, rng, who) => {
          const c = s.character;
          changeAttr(c, 'nerve', 1);
          changeRep(c, 'streetCred', 4);
          bond(who, 15);
          say(s, rng, 'life', 'choice.joyride.drive', personVars(who!));
        },
      },
      {
        id: 'stay',
        label: 'Say you have an exam in the morning',
        apply: (s, rng, who) => {
          changeGpa(s.character, 0.1);
          bond(who, -5);
          say(s, rng, 'life', 'choice.joyride.stay', personVars(who!));
        },
      },
    ],
  },

  // Senior year, at 17. The plan plays out on the 18th birthday (time.ts).
  'senior-year': {
    kind: 'life',
    options: [
      {
        id: 'college',
        label: 'Study for the college entrance exams',
        apply: (s, rng) => {
          const c = s.character;
          changeGpa(c, 0.3);
          maybe(c, rng, 'mind', 0.4);
          mark(c, 'plan:college');
          say(s, rng, 'life', 'choice.senior.college');
        },
      },
      {
        id: 'trade',
        label: 'Sign up for trade school',
        apply: (s, rng) => { mark(s.character, 'plan:trade'); say(s, rng, 'life', 'choice.senior.trade'); },
      },
      {
        id: 'work',
        label: 'Line up full-time work for after graduation',
        apply: (s, rng) => { mark(s.character, 'plan:work'); say(s, rng, 'life', 'choice.senior.work'); },
      },
      {
        id: 'street',
        label: 'Quit school and make money on the street',
        apply: (s, rng) => {
          const c = s.character;
          changeRep(c, 'streetCred', 5);
          changeAttr(c, 'nerve', 1);
          changeGpa(c, -0.5);
          mark(c, 'plan:street');
          say(s, rng, 'life', 'choice.senior.street');
        },
      },
    ],
  },

  // Applying for study after school. Offered by the "Apply to college" action and on the 18th birthday.
  enroll: {
    kind: 'life',
    options: [
      ...COLLEGE_ORDER.map((kind): OptionSpec => ({
        id: kind,
        label: (s) => {
          const fee = yearlyTuition(s, kind, scholarshipFor(s.character, kind));
          const pay = kind === 'ashgrove' ? 'free, with a stipend' : fee === 0 ? (scholarshipFor(s.character, kind) ? 'scholarship' : 'family pays') : `${usd(fee)} a year`;
          return `${COLLEGES[kind].name} · ${YEARS[kind]} · ${pay}`;
        },
        when: (s) => admits(s, kind),
        apply: (s, rng) => {
          const scholarship = enroll(s, kind);
          say(s, rng, 'life', scholarship && kind !== 'ashgrove' ? 'choice.enroll.scholarship' : `choice.enroll.${kind}`, { school: COLLEGES[kind].name });
        },
      })),
      { id: 'hold', label: 'Put school on hold for now', apply: (s, rng) => say(s, rng, 'life', 'choice.enroll.hold') },
    ],
  },

  // ---------- Family and friends ----------

  'family-shortfall': {
    kind: 'money',
    options: [
      {
        id: 'cover',
        label: (s) => `Cover the ${usd(money(s, 450))} yourself`,
        when: (s) => s.character.money >= money(s, 450),
        apply: (s, rng) => {
          const c = s.character;
          c.money -= money(s, 450);
          bondAll(s, isFamily, 15);
          maybe(c, rng, 'nerve', 0.5);
          say(s, rng, 'money', 'choice.shortfall.cover', { money: money(s, 450) });
        },
      },
      {
        id: 'shifts',
        label: 'Pick up extra shifts together',
        apply: (s, rng) => {
          const c = s.character;
          c.money -= Math.min(Math.max(0, c.money), money(s, 150));
          hurt(c, 3);
          bondAll(s, isFamily, 8);
          say(s, rng, 'money', 'choice.shortfall.shifts');
        },
      },
      {
        id: 'no',
        label: 'Tell them you do not have it',
        apply: (s, rng) => { bondAll(s, isFamily, -12); say(s, rng, 'life', 'choice.shortfall.no'); },
      },
    ],
  },

  // A friend or sibling in a holding cell. `who` is them.
  'bail-call': {
    kind: 'law',
    options: [
      {
        id: 'post',
        label: (s) => `Post the ${usd(money(s, 500))} bail`,
        when: (s) => s.character.money >= money(s, 500),
        apply: (s, rng, who) => {
          s.character.money -= money(s, 500);
          bond(who, 20);
          changeRep(s.character, 'streetCred', 3);
          say(s, rng, 'law', 'choice.bail.post', personVars(who!, { money: money(s, 500) }));
        },
      },
      {
        id: 'talk',
        label: 'Talk the desk sergeant down',
        when: (s) => s.character.charm >= 7 || tied(s.character, 'Aurelian'),
        apply: (s, rng, who) => {
          bond(who, 20);
          changeRep(s.character, 'fame', 1);
          say(s, rng, 'law', 'choice.bail.talk', personVars(who!));
        },
      },
      {
        id: 'leave',
        label: 'Let them sit in holding overnight',
        apply: (s, rng, who) => { bond(who, -25); say(s, rng, 'life', 'choice.bail.leave', personVars(who!)); },
      },
    ],
  },

  // A brother or sister Kindles at home. `who` is the sibling.
  'sibling-kindling': {
    kind: 'power',
    options: [
      {
        id: 'register',
        label: 'Walk them into the Bureau office yourself',
        apply: (s, rng, who) => {
          if (who) who.graded = true;
          bond(who, 10);
          say(s, rng, 'power', 'choice.sibling.register', personVars(who!));
        },
      },
      {
        id: 'hide',
        label: 'Hide it and teach them to hold it in',
        when: (s) => s.character.graded || s.character.nerve >= 6,
        apply: (s, rng, who) => {
          const c = s.character;
          if (who) who.graded = true;
          bond(who, 15);
          hurt(c, 3);
          // Hiding a Kindling is a crime for the Graded person and for whoever covers for them.
          if (ageOf(s) >= 18 && rng.chance(0.12)) {
            const { months, prison } = arrest(s, rng, 'Concealing a Kindling', [2, 8]);
            say(s, rng, 'law', 'choice.sibling.caught', personVars(who!, { months, prison }));
            return;
          }
          say(s, rng, 'power', 'choice.sibling.hide', personVars(who!));
        },
      },
      {
        id: 'contact',
        label: 'Call your people for help',
        when: (s) => tied(s.character, 'Aurelian') || crew(s.character),
        apply: (s, rng, who) => {
          if (who) who.graded = true;
          bond(who, 5);
          say(s, rng, 'power', 'choice.sibling.contact', personVars(who!));
        },
      },
    ],
  },

  // A partner asks to share a lease. `who` is the partner.
  'move-in': {
    kind: 'life',
    options: [
      {
        id: 'yes',
        label: 'Put both names on the lease',
        apply: (s, rng, who) => {
          if (who) who.livesWithYou = true;
          bond(who, 5);
          say(s, rng, 'life', 'choice.move-in.yes', personVars(who!));
        },
      },
      {
        id: 'not-yet',
        label: 'Say you are not ready',
        apply: (s, rng, who) => { bond(who, -6); say(s, rng, 'life', 'choice.move-in.no', personVars(who!)); },
      },
    ],
  },

  // Old bad blood in public. `who` is the rival.
  rival: {
    kind: 'event',
    options: [
      {
        id: 'fight',
        label: 'Stand your ground',
        when: (s) => s.character.body >= 6 || s.character.nerve >= 6,
        apply: (s, rng, who) => {
          const c = s.character;
          changeRep(c, 'streetCred', 5);
          maybe(c, rng, 'nerve', 0.4);
          bond(who, 5);
          if (rng.chance(0.3)) hurt(c, 5);
          say(s, rng, 'event', 'choice.rival.fight', personVars(who!));
        },
      },
      {
        id: 'words',
        label: 'Take them apart with words',
        when: (s) => s.character.charm >= 6 || s.character.mind >= 6,
        apply: (s, rng, who) => {
          maybe(s.character, rng, 'charm', 0.5);
          changeRep(s.character, 'streetCred', 2);
          say(s, rng, 'event', 'choice.rival.words', personVars(who!));
        },
      },
      {
        id: 'drink',
        label: 'Offer to bury it over a drink',
        when: (s) => s.character.charm >= 5,
        apply: (s, rng, who) => {
          if (who) { who.relation = 'friend'; who.bond = Math.max(who.bond, 25); }
          say(s, rng, 'life', 'choice.rival.drink', personVars(who!));
        },
      },
      {
        id: 'walk',
        label: 'Walk away',
        apply: (s, rng, who) => { changeRep(s.character, 'streetCred', -2); say(s, rng, 'event', 'choice.rival.walk', personVars(who!)); },
      },
    ],
  },

  // ---------- Young adults (18-29) ----------

  'first-lease': {
    kind: 'money',
    options: [
      {
        id: 'basement',
        label: 'Take the damp basement studio',
        apply: (s, rng) => {
          const c = s.character;
          const saved = money(s, 2000);
          c.money += saved;
          hurt(c, 3);
          maybe(c, rng, 'nerve', 0.5);
          say(s, rng, 'money', 'choice.lease.basement', { money: saved });
        },
      },
      {
        id: 'share',
        label: 'Split a three-bedroom with two strangers',
        apply: (s, rng) => {
          const c = s.character;
          const saved = money(s, 1200);
          c.money += saved;
          const friendly = rng.chance(0.5);
          const p = addPerson(s, rng, friendly ? 'friend' : 'rival', friendly ? 50 : 20, near(s, rng, 3));
          say(s, rng, 'money', friendly ? 'choice.lease.share-friend' : 'choice.lease.share-rival', personVars(p, { money: saved }));
        },
      },
      {
        id: 'clean',
        label: (s) => `Sign for the clean one-bedroom (${usd(money(s, 2400))} deposit)`,
        when: (s) => s.character.money >= money(s, 2400),
        apply: (s, rng) => {
          const c = s.character;
          c.money -= money(s, 2400);
          heal(c, 6);
          maybe(c, rng, 'charm', 0.5);
          say(s, rng, 'money', 'choice.lease.clean', { money: money(s, 2400) });
        },
      },
    ],
  },

  scapegoat: {
    kind: 'money',
    options: [
      {
        id: 'receipts',
        label: 'Pull the timestamped logs and clear your name',
        when: (s) => s.character.mind >= 6,
        apply: (s, rng) => {
          const c = s.character;
          if (c.job) c.job.salary += money(s, 4000);
          const bonus = money(s, 500);
          c.money += bonus;
          maybe(c, rng, 'mind', 0.5);
          say(s, rng, 'money', 'choice.scapegoat.receipts', { money: bonus, salary: c.job?.salary ?? 0 });
        },
      },
      {
        id: 'fall',
        label: 'Take the write-up for cash under the table',
        apply: (s, rng) => {
          const c = s.character;
          const cash = money(s, 800);
          c.money += cash;
          changeRep(c, 'streetCred', 3);
          c.raiseAskedYear = s.date.year; // nobody is giving you a raise this year
          say(s, rng, 'money', 'choice.scapegoat.fall', { money: cash });
        },
      },
      {
        id: 'quit',
        label: 'Walk out on the spot',
        apply: (s, rng) => {
          const c = s.character;
          const job = c.job?.title ?? 'job';
          c.job = null;
          changeAttr(c, 'nerve', 1);
          heal(c, 4);
          say(s, rng, 'money', 'choice.scapegoat.quit', { job });
        },
      },
    ],
  },

  // ---------- Midlife (30-49) ----------

  // A parent can no longer manage alone. `who` is the parent.
  'aging-parent': {
    kind: 'life',
    options: [
      {
        id: 'pay',
        label: (s) => `Pay ${usd(money(s, 6000))} toward a ground-floor assisted apartment`,
        when: (s) => s.character.money >= money(s, 6000),
        apply: (s, rng, who) => {
          s.character.money -= money(s, 6000);
          bond(who, 20);
          say(s, rng, 'money', 'choice.parent.pay', personVars(who!, { money: money(s, 6000) }));
        },
      },
      {
        id: 'move-in',
        label: 'Clear out a room and move them in',
        apply: (s, rng, who) => {
          const c = s.character;
          if (who) who.livesWithYou = true;
          bond(who, 25);
          hurt(c, 5);
          changeAttr(c, 'nerve', 1);
          say(s, rng, 'life', 'choice.parent.move-in', personVars(who!));
        },
      },
      {
        id: 'siblings',
        label: 'Split the costs and the schedule with your sibling',
        when: (s) => around(s, (p) => p.relation === 'sibling' && !p.estranged && s.date.year - p.born >= 18).length > 0,
        apply: (s, rng, who) => {
          const c = s.character;
          c.money -= Math.min(Math.max(0, c.money), money(s, 2000));
          bond(who, 8);
          bondAll(s, (p) => p.relation === 'sibling', 10);
          say(s, rng, 'life', 'choice.parent.siblings', personVars(who!));
        },
      },
      {
        id: 'social-worker',
        label: 'Leave it to the hospital social worker',
        apply: (s, rng, who) => { bond(who, -15); say(s, rng, 'life', 'choice.parent.leave', personVars(who!)); },
      },
    ],
  },

  midlife: {
    kind: 'money',
    options: [
      {
        id: 'buy-in',
        label: (s) => `Put ${usd(money(s, 25000))} into the business as co-owner`,
        when: (s) => s.character.money >= money(s, 25000),
        apply: (s, rng) => {
          const c = s.character;
          c.money -= money(s, 25000);
          c.job = { id: 'shop-owner', title: 'Co-owner of a corner business', salary: money(s, 52000) };
          changeRep(c, 'fame', 3);
          changeRep(c, 'streetCred', 5);
          heal(c, 6);
          say(s, rng, 'money', 'choice.midlife.buy-in', { money: money(s, 25000), salary: c.job.salary });
        },
      },
      {
        id: 'career',
        label: 'Pass, and push for a senior role where you are',
        when: (s) => !!s.character.job,
        apply: (s, rng) => {
          const c = s.character;
          const job = c.job!;
          job.salary = Math.round((job.salary * 1.08) / 100) * 100;
          hurt(c, 3);
          say(s, rng, 'money', 'choice.midlife.career', { job: job.title, salary: job.salary });
        },
      },
      {
        id: 'sabbatical',
        label: 'Take a month off to breathe',
        apply: (s, rng) => {
          const c = s.character;
          const cost = money(s, 2500);
          c.money -= cost;
          heal(c, 12);
          bondAll(s, (p) => p.relation !== 'rival', 3);
          say(s, rng, 'life', 'choice.midlife.sabbatical', { money: cost });
        },
      },
    ],
  },

  // ---------- Later life (50+) ----------

  torch: {
    kind: 'life',
    options: [
      {
        id: 'protege',
        label: 'Take them on and teach them everything',
        apply: (s, rng) => {
          const c = s.character;
          const p = addPerson(s, rng, 'protege', 75, 19);
          maybe(c, rng, 'charm', 0.5);
          heal(c, 4);
          say(s, rng, 'life', 'choice.torch.protege', personVars(p));
        },
      },
      {
        id: 'tough-love',
        label: (s) => `Give them ${usd(money(s, 200))} and one hard truth`,
        when: (s) => s.character.money >= money(s, 200),
        apply: (s, rng) => {
          const c = s.character;
          c.money -= money(s, 200);
          maybe(c, rng, 'nerve', 0.5);
          changeRep(c, 'streetCred', 4);
          say(s, rng, 'life', 'choice.torch.tough-love', { money: money(s, 200) });
        },
      },
      { id: 'no', label: 'Tell them you are retired from other people', apply: (s, rng) => say(s, rng, 'life', 'choice.torch.no') },
    ],
  },

  pension: {
    kind: 'money',
    options: [
      {
        id: 'lump-sum',
        label: (s) => `Take the ${usd(money(s, 40000))} buyout and retire`,
        apply: (s, rng) => {
          const c = s.character;
          const pay = money(s, 40000);
          c.money += pay;
          c.job = null;
          heal(c, 8);
          say(s, rng, 'money', 'choice.pension.lump-sum', { money: pay });
        },
      },
      {
        id: 'fight',
        label: 'Organise the retirees and fight the cut',
        when: (s) => s.character.nerve >= 6 || s.character.charm >= 6,
        apply: (s, rng) => {
          const c = s.character;
          if (rng.chance(0.6 + (c.charm + c.nerve - 12) * 0.03)) {
            const pay = money(s, 55000);
            c.money += pay;
            changeRep(c, 'fame', 5);
            maybe(c, rng, 'nerve', 0.5);
            say(s, rng, 'money', 'choice.pension.won', { money: pay });
          } else {
            const pay = money(s, 25000);
            c.money += pay;
            hurt(c, 3);
            say(s, rng, 'money', 'choice.pension.lost', { money: pay });
          }
        },
      },
      {
        id: 'advisor',
        label: 'Switch to a part-time advisory role',
        apply: (s, rng) => {
          const c = s.character;
          c.job = { id: 'senior-advisor', title: 'Senior consultant (part-time)', salary: money(s, 41000) };
          heal(c, 5);
          say(s, rng, 'money', 'choice.pension.advisor', { salary: c.job.salary });
        },
      },
    ],
  },

  // ---------- Ordinary trouble ----------

  'union-drive': {
    kind: 'money',
    options: [
      {
        id: 'sign',
        label: 'Sign the card',
        apply: (s, rng) => {
          const c = s.character;
          changeRep(c, 'streetCred', 2);
          const job = c.job;
          if (job && rng.chance(0.15)) {
            c.job = null;
            say(s, rng, 'money', 'choice.union.fired', { job: job.title });
          } else if (job && rng.chance(0.55)) {
            job.salary = Math.round((job.salary * 1.07) / 100) * 100;
            say(s, rng, 'money', 'choice.union.won', { job: job.title, salary: job.salary });
          } else say(s, rng, 'money', 'choice.union.lost');
        },
      },
      { id: 'quiet', label: 'Keep your head down', apply: (s, rng) => say(s, rng, 'money', 'choice.union.quiet') },
      {
        id: 'snitch',
        label: 'Give management the names',
        apply: (s, rng) => {
          const c = s.character;
          const pay = money(s, 500);
          c.money += pay;
          changeRep(c, 'streetCred', -6);
          say(s, rng, 'money', 'choice.union.snitch', { money: pay });
        },
      },
    ],
  },

  'stray-pet': {
    kind: 'life',
    options: [
      {
        id: 'keep',
        label: 'Take it in',
        apply: (s, rng) => {
          const kind = rng.pick(['dog', 'cat']);
          const name = rng.pick(kind === 'dog' ? ['Biscuit', 'Tank', 'Rooster', 'Pepper', 'Mooch', 'Duke'] : ['Smudge', 'Olive', 'Pickles', 'Socks', 'Mister', 'Ash']);
          s.character.pet = { kind, name, since: s.date.year };
          say(s, rng, 'life', 'choice.pet.keep', { pet: kind, petName: name });
        },
      },
      { id: 'shelter', label: 'Walk it to the shelter', apply: (s, rng) => say(s, rng, 'life', 'choice.pet.shelter') },
    ],
  },

  'car-trouble': {
    kind: 'money',
    options: [
      {
        id: 'fix',
        label: (s) => `Pay ${usd(money(s, 350))} to keep it running`,
        apply: (s, rng) => { s.character.money -= money(s, 350); say(s, rng, 'money', 'choice.car.fix', { money: money(s, 350) }); },
      },
      {
        id: 'upgrade',
        label: (s) => `Trade up to something reliable (${usd(money(s, 6000))})`,
        when: (s) => s.character.money >= money(s, 6000),
        apply: (s, rng) => {
          s.character.money -= money(s, 6000);
          s.character.car = 'reliable';
          say(s, rng, 'money', 'choice.car.upgrade', { money: money(s, 6000) });
        },
      },
      {
        id: 'scrap',
        label: 'Scrap it and take the bus',
        apply: (s, rng) => {
          s.character.money += money(s, 200);
          s.character.car = null;
          say(s, rng, 'money', 'choice.car.scrap', { money: money(s, 200) });
        },
      },
    ],
  },

  dental: {
    kind: 'life',
    options: [
      {
        id: 'clinic',
        label: (s) => `Pay ${usd(money(s, 600))} at the urgent dental clinic`,
        apply: (s, rng) => { s.character.money -= money(s, 600); say(s, rng, 'money', 'choice.dental.clinic', { money: money(s, 600) }); },
      },
      {
        id: 'tough',
        label: 'Tough it out with clove oil',
        apply: (s, rng) => { hurt(s.character, 8); say(s, rng, 'life', 'choice.dental.tough'); },
      },
    ],
  },

  // A skimmer has already taken the money (see events.ts); calling the bank gets it back.
  skimmer: {
    kind: 'money',
    options: [
      {
        id: 'call',
        label: 'Spend an afternoon on hold with the bank · 1 energy',
        when: (s) => (s.energy ?? 6) >= 1,
        apply: (s, rng) => {
          s.energy = (s.energy ?? 6) - 1;
          const back = money(s, 180);
          s.character.money += back;
          say(s, rng, 'money', 'choice.skimmer.call', { money: back });
        },
      },
      { id: 'eat', label: 'Eat the loss', apply: (s, rng) => say(s, rng, 'money', 'choice.skimmer.eat') },
    ],
  },
};

/**
 * Offers a decision: writes the situation into the log and sets it as pending.
 * `situation` is the template key for the opening line (defaults to `event.<id>`).
 * `who` is the person the decision is about, if any: their name fills {person} and {personFirst}.
 */
export function offer(s: GameState, rng: Rng, id: string, situation = `event.${id}`, vars: Vars = {}, who?: Person) {
  const spec = DECISIONS[id];
  if (!spec) throw new Error(`Unknown decision "${id}"`);
  const text = write(s, rng, situation, who ? { ...personVars(who), ...vars } : vars);
  s.log.push({ date: { ...s.date }, kind: spec.kind, text });
  s.pending = {
    id,
    text,
    options: spec.options.filter((o) => !o.when || o.when(s, who)).map((o) => ({ id: o.id, label: typeof o.label === 'string' ? o.label : o.label(s) })),
    ...(who ? { about: who.id } : {}),
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
  const who = pending.about ? peopleOf(s).find((p) => p.id === pending.about) : undefined;
  s.pending = null;
  option.apply(s, rng, who);
  if (s.character.health <= 0) {
    s.character.alive = false;
    say(s, rng, 'death', 'death.injuries');
  }
  checkTitles(s, rng);
  settleLegacy(s);
  s.rngState = rng.state;
  return s;
}
