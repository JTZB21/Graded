// The in-app event writer. It turns an engine event (a template key plus the numbers the engine
// already decided) into a line of prose. No network, no AI: templates live in ./templates.ts.
//
// The writer never changes state and never draws from the game's dice. Its own picks come from a
// separate generator seeded from the game's dice state, so the same save always reads the same,
// and adding or editing templates never changes what happens in a life.

import narrator from '../../data/narrator.json';
import { CATEGORIES, RANKS, type Rank } from '../rules';
import { Rng } from '../random';
import { ageOf, log, notation } from '../state';
import type { Background, District, Focus, GameState, LogEntry } from '../types';
import { KEY_FROM, TEMPLATES } from './templates';

/** When a template variant may be used. Every field is optional; all given fields must hold. */
export interface Cond {
  /** First and last calendar year the line fits. */
  from?: number;
  until?: number;
  minAge?: number;
  maxAge?: number;
  graded?: boolean;
  /** Old Foundry or Riverside Docks. */
  rough?: boolean;
  districts?: District[];
  focus?: Focus[];
  minRank?: Rank;
  maxRank?: Rank;
  backgrounds?: Background[];
  family?: boolean;
  minFame?: number;
  minInfamy?: number;
  minStreetCred?: number;
  /** The character belongs to this group (see Character.ties). */
  tie?: string;
}

export type Variant = string | { t: string; when: Cond };
export type Vars = Record<string, string | number>;

/** Institutions and names that only exist from a given year ("Era Rule: Who Exists When"). */
export const ERA_WORDS: Record<string, number> = {
  'Grade Card': 1978,
  // Ashgrove is also the hills district, which predates the school.
  'Ashgrove Academy': 1979,
  Ladder: 1979,
  Pinnacle: 1983,
  Choir: 1990,
  Ascension: 1997,
  Bulwark: 1998,
  // The lore gives no founding year for Equal Ground; 2000 is a safe floor (Imani Brooks is 44 in 2026).
  'Equal Ground': 2000,
  Meridian: 2006,
  Sump: 1986,
  'Aurelian Tower': 1994,
  Spotlight: 1996,
  Quell: 2003,
  'Low Kings': 2011,
  GradeWatch: 2013,
  Rush: 2014,
  RankMatch: 2015,
  Flatline: 2017,
  'hush band': 2019,
  Choirsong: 2025,
};

// Pinnacle members on the roster by year ("The Pinnacle Through the Years"). Echo stays off camera.
const PINNACLE: { name: string; from: number; until: number }[] = [
  { name: 'Paragon', from: 1983, until: 1991 },
  { name: 'Lady Volt', from: 1983, until: 1994 },
  { name: 'Mirage', from: 1983, until: 1986 },
  { name: 'Tidewater', from: 1983, until: 2001 },
  { name: 'Longshot', from: 1983, until: 1988 },
  { name: 'Ghostline', from: 1983, until: 1995 },
  { name: 'Bulwark', from: 1998, until: 9999 },
  { name: 'Meridian', from: 2006, until: 9999 },
  { name: 'Saint Cecile', from: 2018, until: 9999 },
  { name: 'Jackknife', from: 2020, until: 9999 },
  { name: 'Gridlock', from: 2024, until: 9999 },
];

const CARD_COLOR: Partial<Record<Rank, string>> = {
  F: 'gray', E: 'gray-and-white', D: 'green', C: 'blue', B: 'purple', A: 'red', S: 'black-and-gold',
};

// The card's banned names: never use them for anyone the game invents.
const BANNED = new Set([
  'Elara', 'Lyra', 'Kael', 'Marcus', 'Elias', 'Aria', 'Seraphina', 'Luna', 'Nova', 'Kai', 'Zara', 'Silas', 'Ezra',
  'Rowan', 'Finn', 'Jax', 'Mira', 'Orion', 'Damien', 'Viktor', 'Liam', 'Ethan', 'Vale', 'Thorne', 'Hale', 'Voss',
  'Vance', 'Blackwood', 'Sterling', 'Cross', 'Steele', 'Reyes', 'Chen', 'Morrow', 'Kane', 'Ashford',
]);
export const FIRST_NAMES = narrator.defaultNameSeeds.first.filter((n) => !BANNED.has(n));
export const LAST_NAMES = narrator.defaultNameSeeds.last.filter((n) => !BANNED.has(n));

const rough = (d: District) => d === 'Old Foundry' || d === 'Riverside Docks';
const rankIndex = (r: Rank) => RANKS.indexOf(r);

export function fits(s: GameState, when: Cond, focus?: Focus): boolean {
  const c = s.character;
  const year = s.date.year;
  const age = ageOf(s);
  const rank = c.graded && !c.powersGone ? c.powers[0]?.rank : undefined;
  if (when.from !== undefined && year < when.from) return false;
  if (when.until !== undefined && year > when.until) return false;
  if (when.minAge !== undefined && age < when.minAge) return false;
  if (when.maxAge !== undefined && age > when.maxAge) return false;
  if (when.graded !== undefined && c.graded !== when.graded) return false;
  if (when.rough !== undefined && rough(c.district) !== when.rough) return false;
  if (when.districts && !when.districts.includes(c.district)) return false;
  if (when.focus && !(focus && when.focus.includes(focus))) return false;
  if (when.minRank && !(rank && rankIndex(rank) >= rankIndex(when.minRank))) return false;
  if (when.maxRank && !(rank && rankIndex(rank) <= rankIndex(when.maxRank))) return false;
  if (when.backgrounds && !when.backgrounds.includes(c.background)) return false;
  if (when.family !== undefined && c.livesWithFamily !== when.family) return false;
  if (when.minFame !== undefined && c.fame < when.minFame) return false;
  if (when.minInfamy !== undefined && c.infamy < when.minInfamy) return false;
  if (when.minStreetCred !== undefined && c.streetCred < when.minStreetCred) return false;
  if (when.tie && !(c.ties ?? []).includes(when.tie)) return false;
  return true;
}

/** FNV-1a, for mixing a template key into the writer's seed. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Names of a few people the line can mention, fixed per line so {npc} and {npcFirst} agree. */
function invent(r: Rng, avoid: Set<string>) {
  const pickFrom = (list: string[]) => {
    for (let i = 0; i < 8; i++) {
      const n = r.pick(list);
      if (!avoid.has(n)) return n;
    }
    return r.pick(list);
  };
  const first = pickFrom(FIRST_NAMES);
  avoid.add(first);
  return { first, full: `${first} ${pickFrom(LAST_NAMES)}` };
}

function builtins(s: GameState, r: Rng): Record<string, () => string> {
  const c = s.character;
  const year = s.date.year;
  const [first, ...rest] = c.name.split(' ');
  const avoid = new Set([first, ...rest]);
  let npc: ReturnType<typeof invent> | undefined;
  let npc2: ReturnType<typeof invent> | undefined;
  const one = () => (npc ??= invent(r, avoid));
  const two = () => { one(); return (npc2 ??= invent(r, avoid)); };
  const power = c.powers[0];
  const onRoster = PINNACLE.filter((p) => year >= p.from && year <= p.until);
  return {
    name: () => c.name,
    first: () => first,
    age: () => String(ageOf(s)),
    year: () => String(year),
    district: () => c.district,
    rank: () => power?.rank ?? 'baseline',
    grade: () => c.grade ?? '',
    notation: () => notation(c),
    category: () => power?.category ?? '',
    power: () => (power ? CATEGORIES[power.category].toLowerCase() : 'nothing'),
    cardColor: () => (power && CARD_COLOR[power.rank]) || 'plain',
    npc: () => one().full,
    npcFirst: () => one().first,
    npc2: () => two().full,
    npc2First: () => two().first,
    hero: () => (onRoster.length ? r.pick(onRoster).name : 'a costumed vigilante'),
    card: () => (year >= 1978 ? 'Grade Card' : 'Bureau papers'),
    news: () => (year >= 1996 ? 'Spotlight' : 'the evening news'),
    gossip: () => (year >= 2013 ? 'GradeWatch commenters' : year >= 1998 ? 'fan forum posters' : 'tabloid columnists'),
    phone: () => (year >= 2008 ? 'phone' : year >= 1995 ? 'pager' : 'answering machine'),
    screen: () => (year >= 2010 ? 'phone screens' : 'television sets'),
  };
}

const TOKEN = /\{(\w+)\}/g;

/** Fills a template's {tokens}. Caller vars win over built-ins; a capitalised token capitalises its value. */
export function fill(s: GameState, r: Rng, text: string, vars: Vars = {}): string {
  const b = builtins(s, r);
  return text.replace(TOKEN, (whole, token: string) => {
    const lower = token[0].toLowerCase() + token.slice(1);
    const raw = token in vars ? vars[token] : lower in vars ? vars[lower] : b[lower]?.();
    if (raw === undefined) return whole; // left visible so tests catch it
    const value = typeof raw === 'number' ? raw.toLocaleString('en-US') : raw;
    return token[0] !== lower[0] ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  });
}

/** The first year a key may be used (see KEY_FROM). */
export function keyFrom(key: string): number {
  let year = 0;
  for (const [prefix, from] of Object.entries(KEY_FROM)) if (key.startsWith(prefix)) year = Math.max(year, from);
  return year;
}

/** Variants of `key` that fit the current moment. Falls back to unconditioned variants. */
export function eligible(s: GameState, key: string, focus?: Focus): string[] {
  const variants = TEMPLATES[key];
  if (!variants) throw new Error(`No template for "${key}"`);
  if (s.date.year < keyFrom(key)) throw new Error(`Template "${key}" is used before ${keyFrom(key)}`);
  const ok = variants.filter((v) => typeof v === 'string' || fits(s, v.when, focus)).map((v) => (typeof v === 'string' ? v : v.t));
  return ok.length ? ok : variants.filter((v) => typeof v === 'string') as string[];
}

/**
 * Writes one line for `key`. `rng` is the game's dice; the writer only reads its state for a seed.
 * `vars` carries the numbers the engine decided (money, months, prison, job...).
 */
export function write(s: GameState, rng: Rng, key: string, vars: Vars = {}, focus?: Focus): string {
  const r = new Rng((rng.state ^ hash(key) ^ Math.imul(s.log.length + 1, 0x9e3779b1)) | 0);
  const options = eligible(s, key, focus);
  if (!options.length) throw new Error(`Template "${key}" has no variant for this moment`);
  return fill(s, r, r.pick(options), vars);
}

/** Writes a line and adds it to the life log. */
export function say(s: GameState, rng: Rng, kind: LogEntry['kind'], key: string, vars: Vars = {}, focus?: Focus) {
  log(s, kind, write(s, rng, key, vars, focus));
}
