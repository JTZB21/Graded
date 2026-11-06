// Character creation, following the card's creation questions. Anything left out is rolled.

import { ensureLife } from './life';
import { addPerson, makeFamily, surname } from './people';
import { firstSchool, startGpa } from './school';
import { dollars, eligibleJobs, hire, jobLicense } from './economy';
import { kindle } from './powers';
import { Rng, newSeed } from './random';
import { type Category, type Rank } from './rules';
import { changeAttr, changeRep, GRADE_STEP_MONTHS, nextGrade } from './state';
import type { Background, Character, District, GameState, Gender, Leaning } from './types';
import { say } from './writer/writer';

export type StartAge = 'newborn' | 'child' | 'teen' | 'young adult' | 'adult' | 'veteran';

export const START_AGES: Record<StartAge, [number, number]> = {
  newborn: [0, 0],
  child: [8, 11],
  teen: [14, 17],
  'young adult': [18, 25],
  adult: [26, 44],
  veteran: [45, 60],
};

export const BACKGROUNDS: Background[] = ['wealthy', 'working class', 'graded family', 'foster system', 'street', 'military'];

/** 'roll' rolls the Kindling, 'baseline' has no powers. Characters too young to have Kindled get a latent Kindling. */
export type Powered = 'roll' | 'baseline' | { category?: Category; rank?: Rank; description?: string };

export interface CreationOptions {
  name?: string;
  gender?: Gender;
  startAge?: StartAge;
  /** Exact age, overriding startAge. */
  age?: number;
  startYear?: number;
  background?: Background;
  powered?: Powered;
  leaning?: Leaning;
  seed?: number;
}

const HOME: Record<Background, District> = {
  wealthy: 'Ashgrove',
  'working class': 'Kesler Heights',
  'graded family': 'Old Foundry',
  'foster system': 'Old Foundry',
  street: 'Riverside Docks',
  military: 'Kesler Heights',
};

// Savings for someone starting as an adult, 2026 dollars.
const SAVINGS: Record<Background, number> = {
  wealthy: 60000,
  'working class': 4000,
  'graded family': 1500,
  'foster system': 300,
  street: 150,
  military: 9000,
};

const FIRST = ['Wendell', 'Odalys', 'Thaddeus', 'Marisol', 'Bernadette', 'Delphine', 'Emeka', 'Fidelia', 'Hollis', 'Imelda', 'Jolene', 'Kofi', 'Lorraine', 'Mateus', 'Noreen', 'Quentin', 'Sunil', 'Tamsin', 'Verna', 'Waylon', 'Yusuf', 'Keziah', 'Lamar', 'Mavis', 'Orla', 'Seamus', 'Tuyet', 'Cormac', 'Ines', 'Kimiko'];
const LAST = ['Grabowski', 'Lindqvist', 'Pruitt', 'Quintanilla', 'Varga', 'Mbatha', 'Haverford', 'Brannigan', 'Castellanos', 'Dufresne', 'Gallo', 'Iwasaki', 'Lachance', 'Mulcahy', 'Oyelaran', 'Rasmussen', 'Tolliver', 'Vukovic', 'Yeboah', 'Zielinski', 'Coughlin', 'Esposito', 'Ibekwe', 'Kilbride', 'Marchetti', 'Pavlenko', 'Quigley', 'Thibodeaux', 'Whitcomb', 'Zamora'];

/** 1 + 2d3: 3-7, centred on the card's average human 4-5. */
const rollAttr = (rng: Rng) => 1 + rng.int(1, 3) + rng.int(1, 3);

export function createGame(opts: CreationOptions = {}): GameState {
  const seed = opts.seed ?? newSeed();
  const rng = new Rng(seed);
  const startYear = Math.max(1947, opts.startYear ?? 2026);
  const startAge = opts.startAge ?? rng.pick(Object.keys(START_AGES) as StartAge[]);
  const [lo, hi] = START_AGES[startAge];
  const age = opts.age ?? rng.int(lo, hi);
  const month = rng.int(1, 12);
  const background = opts.background ?? rng.pick(BACKGROUNDS);
  // The game starts in January, so anyone with a later birthday was born a year earlier.
  const born = { year: startYear - age - (month > 1 ? 1 : 0), month };
  const powered = opts.powered ?? 'roll';

  const c: Character = {
    name: opts.name?.trim() || `${rng.pick(FIRST)} ${rng.pick(LAST)}`,
    gender: opts.gender ?? rng.pick(['male', 'female'] as const),
    born,
    background,
    leaning: opts.leaning ?? 'undecided',
    district: HOME[background],
    livesWithFamily: age < 18 && background !== 'street',
    graded: false,
    kindleAge: null,
    powers: [],
    grade: null,
    gradeProgress: 0,
    masteryPotential: false,
    powersGone: false,
    body: rollAttr(rng),
    mind: rollAttr(rng),
    charm: rollAttr(rng),
    nerve: rollAttr(rng),
    health: 100,
    strain: 0,
    money: 0,
    job: null,
    education: age >= 18 ? 'high school' : 'none',
    collegeMonths: 0,
    license: 'none',
    record: [],
    inPrisonUntil: null,
    fame: 0,
    infamy: 0,
    streetCred: 0,
    alive: true,
  };

  // Background shapes the starting stats.
  if (background === 'wealthy') { changeAttr(c, 'charm', 1); changeAttr(c, 'mind', 1); }
  if (background === 'military') { changeAttr(c, 'body', 1); changeAttr(c, 'nerve', 1); }
  if (background === 'street') { changeAttr(c, 'nerve', 1); changeRep(c, 'streetCred', 10); }
  if (background === 'foster system') changeAttr(c, 'nerve', 1);
  if (age >= 22 && (background === 'wealthy' || c.mind >= 7)) c.education = 'college';
  if (age >= 18) c.money = dollars(SAVINGS[background] * Math.min(1, 0.3 + (age - 18) / 20), startYear);

  c.people = makeFamily(c, rng);
  // Older characters may have lost parents already.
  for (const p of c.people) if (p.relation !== 'sibling' && startYear - p.born > 80 && rng.chance(0.7)) p.alive = false;

  const s: GameState = { version: 1, rngState: rng.state, date: { year: startYear, month: 1 }, city: 'Port Harlan', character: c, log: [] };
  startingLife(s, rng, age);
  say(s, rng, 'life', 'start.intro', { background });

  if (powered !== 'baseline') {
    const choice = powered === 'roll' ? {} : powered;
    // 85% of Kindlings land between 12 and 21.
    const kindleAge = rng.int(12, 21);
    if (age >= 12 && (age >= kindleAge || age >= 14)) {
      kindle(s, rng, choice);
      // Older characters start with an age-appropriate Grade.
      const years = age - Math.min(age, kindleAge);
      let practice = years * 12 * 0.6;
      while (c.grade && nextGrade(c.grade) && practice >= GRADE_STEP_MONTHS[c.grade] && !(nextGrade(c.grade) === 'V' && !c.masteryPotential)) {
        practice -= GRADE_STEP_MONTHS[c.grade];
        c.grade = nextGrade(c.grade)!;
      }
      if (years > 0) say(s, rng, 'power', 'start.kindled-earlier', { kindledAt: age - years });
    } else {
      c.kindleAge = Math.max(kindleAge, age + 1);
      if (choice.category || choice.rank || choice.description) c.pendingPower = choice;
    }
  } else if (background === 'graded family' && rng.chance(1 / 40)) {
    // A child with one Graded parent has about 1-in-40 odds of Kindling.
    c.kindleAge = Math.max(rng.int(12, 21), age + 1);
  }

  // Adults start with a job when one fits.
  if (age >= 26) {
    const jobs = eligibleJobs(c, age);
    if (jobs.length) {
      const spec = rng.pick(jobs.slice(0, 3));
      c.job = hire(spec, startYear);
      const lic = jobLicense(spec.id);
      if (lic) c.license = lic;
      say(s, rng, 'money', 'start.job', { job: c.job.title, salary: c.job.salary });
    }
  }

  ensureLife(s);
  s.rngState = rng.state;
  return s;
}

/**
 * School, friends and a partner for a character who starts past childhood. Uses its own dice,
 * seeded from the game's, so the rest of creation rolls exactly as before.
 */
function startingLife(s: GameState, game: Rng, age: number) {
  const rng = new Rng((game.state ^ 0x5c4001) | 0);
  const c = s.character;
  if (age >= 6) {
    c.school = firstSchool(c);
    // Bright kids from ordinary homes test into the magnet school at 13.
    if (age >= 13 && c.mind >= 6 && c.school !== 'elite-prep' && rng.chance(0.5)) c.school = 'stem-magnet';
    c.gpa = startGpa(c);
  }
  // A street kid has someone who watches their back.
  if (c.background === 'street' && age >= 6) addPerson(s, rng, 'friend', 75, Math.max(6, age + rng.int(-1, 2)));
  if (age >= 10) for (let i = rng.int(0, 2); i > 0; i--) addPerson(s, rng, 'friend', rng.int(35, 65), Math.max(6, age + rng.int(-3, 3)));
  if (age >= 24 && rng.chance(0.5)) {
    const married = age >= 27 && rng.chance(0.55);
    const p = addPerson(s, rng, married ? 'spouse' : 'partner', rng.int(55, 80), Math.max(18, age + rng.int(-5, 5)));
    p.livesWithYou = married || rng.chance(0.4);
    if (married && age >= 29) {
      for (let i = rng.int(0, 2); i > 0; i--) addPerson(s, rng, 'child', rng.int(60, 85), rng.int(0, Math.min(17, age - 22)), surname(c));
    }
  }
}
