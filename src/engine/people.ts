// Family and friends. Everyone you know has a bond (0-100) that you build by spending time with them
// and that fades if you don't. The engine decides every number here; the writer describes it.

import { dollars } from './economy';
import { Rng } from './random';
import { clamp } from './rules';
import { ageOf, changeAttr, changeRep, heal } from './state';
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
  rival: 'Rival',
  partner: 'Partner',
  spouse: 'Spouse',
  child: 'Child',
  protege: 'Protégé',
};

export const isParent = (p: Person) => p.relation === 'mother' || p.relation === 'father' || p.relation === 'guardian';
/** Blood, marriage and the people who raised you. */
export const isFamily = (p: Person) => isParent(p) || p.relation === 'sibling' || p.relation === 'spouse' || p.relation === 'child';
export const isFriend = (p: Person) => p.relation === 'friend';
export const isLover = (p: Person) => p.relation === 'partner' || p.relation === 'spouse';

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
  // A street kid's parent is out of the picture; a Graded family has at least one Graded parent.
  if (c.background === 'street') out[0].estranged = true;
  if (c.background === 'graded family') out[0].graded = true;
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

const ROLE_WORDS: Record<Person['relation'], string> = {
  mother: 'your mother', father: 'your father', guardian: 'your foster carer', sibling: 'your sibling', friend: 'your friend',
  rival: 'your rival', partner: 'your partner', spouse: 'your spouse', child: 'your child', protege: 'your protégé',
};
const roleWord = (p: Person) => ROLE_WORDS[p.relation];
/** Template vars for a line about someone: {person} {personFirst} {rel}. */
export const vars = (p: Person, extra: Record<string, string | number> = {}) => ({ person: p.name, personFirst: p.name.split(' ')[0], rel: roleWord(p), ...extra });

/** Adds someone new to your life. `age` is their age now. */
export function addPerson(s: GameState, rng: Rng, relation: Person['relation'], bond: number, age: number, last?: string): Person {
  const c = s.character;
  const p: Person = {
    id: newId(rng, peopleOf(s)),
    name: newName(rng, last, [c.name, ...peopleOf(s).map((q) => q.name)]),
    relation,
    born: s.date.year - age,
    bond: clamp(bond, 0, 100),
    alive: true,
    moments: 0,
  };
  (c.people ??= []).push(p);
  return p;
}

/** Living, present people who match. */
export const around = (s: GameState, test: (p: Person) => boolean) => knownPeople(s).filter((p) => p.alive && test(p));
/** Changes the bond with everyone who matches. */
export function bondAll(s: GameState, test: (p: Person) => boolean, by: number) {
  for (const p of around(s, test)) if (!p.estranged) p.bond = clamp(p.bond + by, 0, 100);
}
/** Repeated time in the same setting builds on an existing relationship. */
export function spendTimeWithPeer(s: GameState, rng: Rng, metAt: NonNullable<Person['metAt']>): Person {
  const peer = around(s, p => p.relation === 'friend' && !p.estranged &&
    p.metAt?.kind === metAt.kind && p.metAt.key === metAt.key)[0];
  const age = ageOf(s);
  const contact = peer ?? addPerson(s, rng, 'friend', 36, metAt.kind === 'school'
    ? Math.max(6, age + rng.int(-1, 1))
    : Math.max(16, age + rng.int(-4, 8)));
  if (peer) bond(contact, 6);
  contact.metAt = metAt;
  contact.moments++;
  const turn = s.turn ?? 0;
  if (contact.usedTurn !== turn) contact.usedCount = 0;
  contact.usedTurn = turn;
  return contact;
}

export const lover = (s: GameState) => around(s, isLover)[0];
export { surname };

// ---------- Interactions ----------

interface Ctx {
  s: GameState;
  c: Character;
  p: Person;
  age: number;
  pAge: number;
  imprisoned: boolean;
  parent: boolean;
  /** Not speaking to you, or a rival: only some things are on the table. */
  cold: boolean;
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
    when: (x) => !x.cold && x.age >= 3 && (!x.imprisoned || x.parent),
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
    when: (x) => !x.cold && x.age >= 10 && !(x.parent && x.c.livesWithFamily) && !x.p.livesWithYou,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(1, 5));
      say(s, rng, 'life', x.imprisoned ? 'people.call.prison' : 'people.call', vars(x.p));
    },
  },
  {
    id: 'gift',
    label: 'Buy them a gift',
    price: () => 60,
    when: (x) => !x.cold && x.age >= 8 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(4, 10));
      say(s, rng, 'life', 'people.gift', vars(x.p));
    },
  },
  {
    id: 'dinner',
    label: 'Take them to dinner',
    price: () => 90,
    when: (x) => !x.cold && x.age >= 16 && !x.imprisoned && !isLover(x.p),
    apply: (s, rng, x) => {
      bond(x.p, rng.int(6, 13));
      if (rng.chance(0.06)) changeAttr(x.c, 'charm', 1);
      say(s, rng, 'life', 'people.dinner', vars(x.p));
    },
  },
  {
    id: 'visit',
    label: 'Visit them',
    when: (x) => !x.cold && x.age >= 12 && !x.imprisoned && !(x.parent && x.c.livesWithFamily) && !x.p.livesWithYou && !(x.p.relation === 'child' && x.pAge < 18),
    apply: (s, rng, x) => {
      bond(x.p, rng.int(4, 9));
      heal(x.c, 2);
      say(s, rng, 'life', 'people.visit', vars(x.p));
    },
  },
  {
    id: 'give-money',
    label: 'Give them money',
    price: () => 500,
    when: (x) => !x.cold && x.age >= 16 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(7, 14));
      say(s, rng, 'money', 'people.give-money', vars(x.p, { money: dollars(500, s.date.year) }));
    },
  },
  {
    id: 'ask-money',
    label: 'Ask for money',
    when: (x) => !x.cold && x.parent && x.age >= 6,
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
  {
    id: 'chores',
    label: 'Help around the house',
    when: (x) => x.parent && !x.cold && x.c.livesWithFamily && x.age >= 5 && x.age < 18 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(3, 8));
      // Pocket money, if the house has any to spare.
      if ((x.p.wealth ?? 0) >= 20_000 && rng.chance(0.6)) {
        const pay = dollars(rng.int(5, 20) * (x.age < 12 ? 1 : 2), s.date.year);
        x.c.money += pay;
        say(s, rng, 'money', 'people.chores.paid', vars(x.p, { money: pay }));
      } else say(s, rng, 'life', 'people.chores', vars(x.p));
    },
  },
  {
    id: 'date',
    label: 'Take them out',
    price: () => 80,
    when: (x) => isLover(x.p) && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(7, 14));
      heal(x.c, 3);
      say(s, rng, 'life', 'people.date', vars(x.p));
    },
  },
  {
    id: 'move-in',
    label: 'Ask them to move in',
    when: (x) => x.p.relation === 'partner' && !x.p.livesWithYou && !x.c.livesWithFamily && x.age >= 18 && !x.imprisoned && x.p.bond >= 55,
    apply: (s, rng, x) => {
      if (rng.chance(x.p.bond / 110)) {
        x.p.livesWithYou = true;
        bond(x.p, 5);
        say(s, rng, 'life', 'people.move-in.yes', vars(x.p));
      } else {
        bond(x.p, -3);
        say(s, rng, 'life', 'people.move-in.no', vars(x.p));
      }
    },
  },
  {
    id: 'propose',
    label: 'Propose',
    price: () => 2500,
    when: (x) => x.p.relation === 'partner' && x.age >= 18 && x.pAge >= 18 && !x.imprisoned && x.p.bond >= 65,
    apply: (s, rng, x) => {
      if (rng.chance(Math.min(0.95, (x.p.bond - 40) / 55))) {
        x.p.relation = 'spouse';
        x.p.livesWithYou = !x.c.livesWithFamily;
        bond(x.p, 10);
        say(s, rng, 'life', 'people.propose.yes', vars(x.p));
      } else {
        bond(x.p, -12);
        say(s, rng, 'life', 'people.propose.no', vars(x.p));
      }
    },
  },
  {
    id: 'try-child',
    label: 'Try for a baby',
    when: (x) => isLover(x.p) && !!x.p.livesWithYou && x.age >= 18 && x.age <= 45 && x.pAge <= 45 && !x.imprisoned
      && !peopleOf(x.s).some((q) => q.relation === 'child' && q.born > x.s.date.year),
    apply: (s, rng, x) => {
      if (rng.chance(0.35)) {
        // Born within the year: the baby arrives on your next birthday.
        const kid = addPerson(s, rng, 'child', rng.int(70, 90), -1, surname(x.c));
        say(s, rng, 'life', 'people.expecting', vars(x.p, { baby: kid.name.split(' ')[0] }));
      } else say(s, rng, 'life', 'people.not-expecting', vars(x.p));
    },
  },
  {
    id: 'play',
    label: 'Spend the weekend with them',
    price: () => 40,
    when: (x) => x.p.relation === 'child' && x.pAge >= 1 && x.pAge < 18 && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(8, 14));
      heal(x.c, 2);
      say(s, rng, 'life', 'people.play', vars(x.p));
    },
  },
  {
    id: 'mentor',
    label: 'Teach them the city',
    when: (x) => x.p.relation === 'protege' && !x.imprisoned,
    apply: (s, rng, x) => {
      bond(x.p, rng.int(5, 10));
      say(s, rng, 'life', 'people.mentor', vars(x.p));
    },
  },
  {
    id: 'break-up',
    label: 'End it',
    price: (x) => (x.p.relation === 'spouse' ? 3000 : 0),
    when: (x) => isLover(x.p),
    apply: (s, rng, x) => {
      const married = x.p.relation === 'spouse';
      x.c.people!.splice(x.c.people!.indexOf(x.p), 1);
      say(s, rng, 'life', married ? 'people.divorce' : 'people.break-up', vars(x.p));
    },
  },
  {
    id: 'reconcile',
    label: 'Reach out',
    when: (x) => x.age >= 12 && !x.imprisoned && x.p.relation !== 'rival' && (!!x.p.estranged || x.p.bond < 15),
    apply: (s, rng, x) => {
      if (rng.chance(Math.min(0.85, 0.2 + (x.c.charm + x.c.nerve) * 0.035))) {
        x.p.estranged = false;
        bond(x.p, 25);
        say(s, rng, 'life', 'people.reconcile.yes', vars(x.p));
      } else say(s, rng, 'life', 'people.reconcile.no', vars(x.p));
    },
  },
  {
    id: 'confront',
    label: 'Settle it',
    when: (x) => x.p.relation === 'rival' && x.age >= 8 && !x.imprisoned,
    apply: (s, rng, x) => {
      const c = x.c;
      if (c.body + c.nerve + rng.int(1, 8) >= 13) {
        changeRep(c, 'streetCred', rng.int(2, 4));
        if (rng.chance(0.25)) changeAttr(c, 'nerve', 1);
        bond(x.p, 5); // grudging respect
        say(s, rng, 'event', 'people.confront.win', vars(x.p));
      } else {
        c.health = Math.max(0, c.health - rng.int(4, 12));
        bond(x.p, -5);
        say(s, rng, 'event', 'people.confront.lose', vars(x.p));
      }
    },
  },
  {
    id: 'make-peace',
    label: 'Bury the hatchet',
    when: (x) => x.p.relation === 'rival' && x.age >= 8 && !x.imprisoned,
    apply: (s, rng, x) => {
      if (rng.chance(Math.min(0.8, 0.1 + x.c.charm * 0.06 + x.p.bond / 200))) {
        x.p.relation = 'friend';
        x.p.bond = Math.max(x.p.bond, 30);
        say(s, rng, 'life', 'people.make-peace.yes', vars(x.p));
      } else {
        bond(x.p, -4);
        say(s, rng, 'life', 'people.make-peace.no', vars(x.p));
      }
    },
  },
];

function ctxOf(s: GameState, p: Person): Ctx {
  const c = s.character;
  const imprisoned = !!c.inPrisonUntil && c.inPrisonUntil.year * 12 + c.inPrisonUntil.month > s.date.year * 12 + s.date.month;
  return { s, c, p, age: ageOf(s), pAge: personAge(s, p), imprisoned, parent: isParent(p), cold: !!p.estranged || p.relation === 'rival' };
}

const usedThisTurn = (s: GameState, p: Person) => (p.usedTurn === (s.turn ?? 0) ? p.usedCount ?? 0 : 0);

/** What you can do with someone right now. */
export function interactionsWith(s: GameState, personId: string): InteractionView[] {
  const p = peopleOf(s).find((q) => q.id === personId);
  if (!p || !p.alive || p.born > s.date.year || !s.character.alive || s.pending) return [];
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
    if (p.born === year && (p.relation === 'sibling' || p.relation === 'child')) {
      say(s, rng, 'life', p.relation === 'child' ? 'people.child-born' : 'people.sibling-born', vars(p));
      continue;
    }
    if (p.born > year) continue;
    const seen = p.usedTurn !== undefined && (s.turn ?? 0) - p.usedTurn <= 1;
    const living = (c.livesWithFamily && (isParent(p) || p.relation === 'sibling')) || !!p.livesWithYou || (p.relation === 'child' && year - p.born < 18);
    // Estranged people and rivals stay where they are; nobody is working on those.
    // Small children cannot keep up a relationship, so family bonds hold until 5 and fade gently until 18.
    const age = year - c.born.year;
    const childhood = age < 18 && (isParent(p) || p.relation === 'sibling');
    const fade = childhood ? (age < 5 ? 0 : rng.int(0, 2)) : seen || living ? rng.int(0, 3) : rng.int(3, p.relation === 'friend' || p.relation === 'partner' ? 10 : 6);
    if (!p.estranged && p.relation !== 'rival') bond(p, -fade);
    if (rng.chance(mortality(year - p.born))) {
      p.alive = false;
      say(s, rng, 'death', isFamily(p) || isLover(p) ? 'people.died.family' : 'people.died.friend', vars(p, { age: year - p.born }));
      continue;
    }
    if ((p.relation === 'friend' || p.relation === 'protege') && p.bond < 10) {
      c.people.splice(c.people.indexOf(p), 1);
      say(s, rng, 'life', 'people.drift', vars(p));
    } else if (isLover(p) && p.bond < 10) {
      c.people.splice(c.people.indexOf(p), 1);
      say(s, rng, 'life', p.relation === 'spouse' ? 'people.left.spouse' : 'people.left.partner', vars(p));
    } else if (p.relation === 'rival' && rng.chance(0.08)) {
      // People move, change schools, get jobs across the river.
      c.people.splice(c.people.indexOf(p), 1);
      say(s, rng, 'life', 'people.rival-gone', vars(p));
    }
  }
}
