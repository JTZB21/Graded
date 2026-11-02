// Family and friends. Everyone you know has a bond (0-100) that you build by spending time with them
// and that fades if you don't. The engine decides every number here; the writer describes it.

import { dollars } from './economy';
import { Rng } from './random';
import { clamp } from './rules';
import { ageOf, changeAttr } from './state';
import type { Background, Character, GameState, Person, Relation } from './types';
import { FIRST_NAMES, LAST_NAMES, say } from './writer/writer';

/** Interactions allowed with one person per turn (one Age up). */
export const PER_TURN = 2;

/** Household wealth by background, 2026 dollars. */
const WEALTH: Record<Background, number> = {
  wealthy: 2_000_000,
  'working class': 60_000,
  'graded family': 150_000,
  'foster system': 40_000,
  street: 5_000,
  military: 90_000,
};

export const RELATION_LABELS: Record<Relation, string> = {
  mother: 'Mother',
  father: 'Father',
  guardian: 'Foster carer',
  sibling: 'Sibling',
  friend: 'Friend',
};

const surname = (c: Character) => c.name.trim().split(/\s+/).slice(1).join(' ') || c.name;

function newName(rng: Rng, last?: string, avoid: string[] = []) {
  let first = rng.pick(FIRST_NAMES);
  for (let i = 0; i < 6 && avoid.some((a) => a.startsWith(first + ' ') || a === first); i++) first = rng.pick(FIRST_NAMES);
  return `${first} ${last ?? rng.pick(LAST_NAMES)}`;
}

function newId(rng: Rng, taken: Person[]) {
  let id = `p${rng.int(0, 1e9).toString(36)}`;
  while (taken.some((p) => p.id === id)) id = `p${rng.int(0, 1e9).toString(36)}`;
  return id;
}

/** The family a character is born into. Uses the given dice (the game's at creation). */
export function makeFamily(c: Character, rng: Rng): Person[] {
  const out: Person[] = [];
  const last = surname(c);
  const birth = c.born.year;
  const names = () => [c.name, ...out.map((p) => p.name)];
  const wealth = WEALTH[c.background];
  const parentBond = c.background === 'street' ? rng.int(5, 25) : c.background === 'foster system' ? rng.int(30, 55) : rng.int(60, 90);
  if (c.background === 'foster system') {
    out.push({ id: newId(rng, out), name: newName(rng, undefined, names()), relation: 'guardian', born: birth - rng.int(30, 55), bond: parentBond, alive: true, wealth, moments: 0 });
  } else {
    out.push({ id: newId(rng, out), name: newName(rng, last, names()), relation: 'mother', born: birth - rng.int(19, 38), bond: parentBond, alive: true, wealth, moments: 0 });
    // Some fathers are not around.
    if (rng.chance(c.background === 'street' ? 0.4 : 0.85)) {
      out.push({ id: newId(rng, out), name: newName(rng, last, names()), relation: 'father', born: birth - rng.int(20, 42), bond: clamp(parentBond + rng.int(-15, 10), 0, 100), alive: true, wealth, moments: 0 });
    }
  }
  const siblings = rng.weighted([{ item: 0, weight: 3 }, { item: 1, weight: 4 }, { item: 2, weight: 2 }, { item: 3, weight: 1 }])!;
  for (let i = 0; i < siblings; i++) {
    out.push({ id: newId(rng, out), name: newName(rng, last, names()), relation: 'sibling', born: birth + rng.pick([-6, -4, -3, -2, -1, 1, 2, 3, 5]), bond: rng.int(40, 75), alive: true, moments: 0 });
  }
  return out;
}

/** Gives a save from before the family system its family, without touching the game's dice. */
export function ensurePeople(s: GameState) {
  if (s.character.people) return;
  const rng = new Rng((s.rngState ^ 0x5eed5eed) | 0);
  s.character.people = makeFamily(s.character, rng);
  // Parents who would be implausibly old by now have died.
  for (const p of s.character.people) if (p.relation !== 'sibling' && s.date.year - p.born > 85) p.alive = false;
}

export const peopleOf = (s: GameState): Person[] => s.character.people ?? [];
/** People who exist yet: siblings born in a later year have not arrived. */
export const knownPeople = (s: GameState) => peopleOf(s).filter((p) => p.born <= s.date.year);
export const personAge = (s: GameState, p: Person) => s.date.year - p.born;

const roleWord = (p: Person) => (p.relation === 'mother' ? 'your mother' : p.relation === 'father' ? 'your father' : p.relation === 'guardian' ? 'your foster carer' : p.relation === 'sibling' ? 'your sibling' : 'your friend');
const vars = (p: Person, extra: Record<string, string | number> = {}) => ({ person: p.name, personFirst: p.name.split(' ')[0], rel: roleWord(p), ...extra });

// ---------- Interactions ----------

interface Ctx {
  s: GameState;
  c: Character;
  p: Person;
  age: number;
  pAge: number;
  imprisoned: boolean;
  parent: boolean;
}

interface InteractionSpec {
  id: string;
  label: string;
  /** Price in 2026 dollars. */
  price?: (x: Ctx) => number;
  when: (x: Ctx) => boolean;
  apply: (s: GameState, rng: Rng, x: Ctx) => void;
}

export interface InteractionView {
  id: string;
  label: string;
  price: number;
  disabled?: string;
}

const bond = (p: Person, by: number) => { p.bond = clamp(p.bond + by, 0, 100); };

export const INTERACTIONS: InteractionSpec[] = [
  {
    id: 'talk',
    label: 'Talk',
    when: (x) => x.age >= 3 && (!x.imprisoned || x.parent),
    apply: (s, rng, x) => {
      // Low bonds turn into arguments more often.
      if (rng.chance(x.p.bond < 30 ? 0.35 : 0.08)) {
        bond(x.p, -rng.int(3, 8));
        say(s, rng, 'life', 'people.argue', vars(x.p));
        return;
      }
      bond(x.p, rng.int(2, 7));
      say(s, rng, 'life', 'people.talk', vars(x.p));
    },
  },
  {
    id: 'call',
    label: 'Call them',
    when: (x) => x.age >= 10 && !(x.parent && x.c.livesWithFamily),
    apply: (s, rng, x) => {
      bond(x.p, rng.int(1, 5));
      say(s, rng, 'life', x.imprisoned ? 'people.call.prison' : 'people.call', vars(x.p));
    },
  },
  {
    id: 'gift',
    label: 'Buy them a gift',
    price: () => 60,
    when: (x) => x.age >= 8 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(4, 10));
      say(s, rng, 'life', 'people.gift', vars(x.p));
    },
  },
  {
    id: 'dinner',
    label: 'Take them to dinner',
    price: () => 90,
    when: (x) => x.age >= 16 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(6, 13));
      if (rng.chance(0.06)) changeAttr(x.c, 'charm', 1);
      say(s, rng, 'life', 'people.dinner', vars(x.p));
    },
  },
  {
    id: 'visit',
    label: 'Visit them',
    when: (x) => x.age >= 12 && !x.imprisoned && !(x.parent && x.c.livesWithFamily),
    apply: (s, rng, x) => {
      bond(x.p, rng.int(4, 9));
      x.c.health = Math.min(100, x.c.health + 2);
      say(s, rng, 'life', 'people.visit', vars(x.p));
    },
  },
  {
    id: 'give-money',
    label: 'Give them money',
    price: () => 500,
    when: (x) => x.age >= 16 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(7, 14));
      say(s, rng, 'money', 'people.give-money', vars(x.p, { money: dollars(500, s.date.year) }));
    },
  },
  {
    id: 'ask-money',
    label: 'Ask for money',
    when: (x) => x.parent && x.age >= 6,
    apply: (s, rng, x) => {
      const p = x.p;
      // Closer parents with more money say yes more often, and give more.
      const yes = p.bond >= 25 && rng.chance(Math.min(0.85, p.bond / 140 + (p.wealth ?? 0) / 4_000_000));
      if (!yes) {
        bond(p, -rng.int(1, 4));
        say(s, rng, 'money', 'people.ask-money.no', vars(p));
        return;
      }
      const base = x.age < 13 ? rng.int(5, 25) : x.age < 18 ? rng.int(20, 120) : Math.min((p.wealth ?? 0) * 0.01, rng.int(200, 2000));
      const scale = x.age < 18 ? Math.max(0.5, Math.min(4, (p.wealth ?? 0) / 150_000)) : 1;
      const gift = dollars(Math.max(5, Math.round(base * scale)), s.date.year);
      x.c.money += gift;
      bond(p, -1);
      say(s, rng, 'money', 'people.ask-money.yes', vars(p, { money: gift }));
    },
  },
];

function ctxOf(s: GameState, p: Person): Ctx {
  const c = s.character;
  const imprisoned = !!c.inPrisonUntil && c.inPrisonUntil.year * 12 + c.inPrisonUntil.month > s.date.year * 12 + s.date.month;
  return { s, c, p, age: ageOf(s), pAge: personAge(s, p), imprisoned, parent: p.relation === 'mother' || p.relation === 'father' || p.relation === 'guardian' };
}

const usedThisTurn = (s: GameState, p: Person) => (p.usedTurn === (s.turn ?? 0) ? p.usedCount ?? 0 : 0);

/** What you can do with someone right now. */
export function interactionsWith(s: GameState, personId: string): InteractionView[] {
  const p = peopleOf(s).find((q) => q.id === personId);
  if (!p || !p.alive || !s.character.alive || s.pending) return [];
  const x = ctxOf(s, p);
  const tired = usedThisTurn(s, p) >= PER_TURN;
  return INTERACTIONS.filter((i) => i.when(x)).map((i) => {
    const price = i.price ? dollars(i.price(x), s.date.year) : 0;
    const disabled = tired ? 'Already spent time together this year' : price > 0 && s.character.money < price ? 'Cannot afford it' : undefined;
    return { id: i.id, label: i.label, price, disabled };
  });
}

/** Does something with someone. Returns a new state; the input is never changed. */
export function interact(state: GameState, personId: string, id: string): GameState {
  const view = interactionsWith(state, personId).find((i) => i.id === id);
  if (!view) throw new Error(`"${id}" is not available with this person`);
  if (view.disabled) throw new Error(`"${id}": ${view.disabled}`);
  const s: GameState = structuredClone(state);
  const p = peopleOf(s).find((q) => q.id === personId)!;
  const rng = new Rng(s.rngState);
  const turn = s.turn ?? 0;
  p.usedCount = (p.usedTurn === turn ? p.usedCount ?? 0 : 0) + 1;
  p.usedTurn = turn;
  p.moments++;
  s.character.money -= view.price;
  INTERACTIONS.find((i) => i.id === id)!.apply(s, rng, ctxOf(s, p));
  s.rngState = rng.state;
  return s;
}

/** Tries to make a friend. Returns the new friend, or null. Used by the "Make a friend" action. */
export function tryMakeFriend(s: GameState, rng: Rng): Person | null {
  const c = s.character;
  if (!rng.chance(Math.min(0.9, 0.35 + c.charm * 0.05))) return null;
  const age = ageOf(s);
  const friend: Person = {
    id: newId(rng, peopleOf(s)),
    name: newName(rng, undefined, [c.name, ...peopleOf(s).map((p) => p.name)]),
    relation: 'friend',
    born: s.date.year - Math.max(3, age + rng.int(-2, 2)),
    bond: rng.int(30, 55),
    alive: true,
    moments: 0,
  };
  (c.people ??= []).push(friend);
  return friend;
}

/** Annual chance of dying of natural causes by age (same table as the player). */
function mortality(age: number): number {
  if (age < 40) return 0.001;
  if (age < 60) return 0.005;
  if (age < 70) return 0.015;
  if (age < 80) return 0.04;
  if (age < 90) return 0.1;
  return 0.2;
}

/** Once a year, on the player's birthday: bonds fade, siblings arrive, people age and die, friends drift. */
export function peopleBirthday(s: GameState, rng: Rng) {
  const c = s.character;
  if (!c.people) return;
  const year = s.date.year;
  for (const p of [...c.people]) {
    if (!p.alive) continue;
    if (p.born === year && p.relation === 'sibling') {
      say(s, rng, 'life', 'people.sibling-born', vars(p));
      continue;
    }
    if (p.born > year) continue;
    const seen = p.usedTurn !== undefined && (s.turn ?? 0) - p.usedTurn <= 1;
    const living = c.livesWithFamily && p.relation !== 'friend';
    bond(p, seen || living ? -rng.int(0, 3) : -rng.int(3, p.relation === 'friend' ? 10 : 6));
    if (rng.chance(mortality(year - p.born))) {
      p.alive = false;
      say(s, rng, 'death', p.relation === 'friend' ? 'people.died.friend' : 'people.died.family', vars(p, { age: year - p.born }));
      continue;
    }
    if (p.relation === 'friend' && p.bond < 10) {
      c.people.splice(c.people.indexOf(p), 1);
      say(s, rng, 'life', 'people.drift', vars(p));
    }
  }
}
