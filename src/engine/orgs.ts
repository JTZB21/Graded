// Organisations: a second ladder next to your power Rank. You belong to one at a time, earn standing
// by putting in work, and ask for promotion once your standing is full and you meet the rank's bar.
// Each rank pays a yearly stipend and adds perks the engine applies elsewhere (crime pay, sentences).

import { dollars } from './economy';
import { RANKS, type Rank } from './rules';
import type { Rng } from './random';
import type { Character, GameState, OrgId } from './types';
import { say } from './writer/writer';

export interface RankBar {
  /** Plain words for what the rank needs, shown when a promotion is refused. */
  needs: string;
  ok: (c: Character) => boolean;
}

export interface OrgSpec {
  id: OrgId;
  name: string;
  /** The group name in Character.ties that older code and templates check. */
  tie: string;
  /** First year it exists. */
  founded: number;
  ranks: [string, string, string, string, string];
  /** What it takes to join, or undefined if you can. */
  joinBlock: (c: Character, age: number) => string | undefined;
  /** Bar for reaching each rank (index 1-4). */
  bars: [null, RankBar, RankBar, RankBar, RankBar];
  /** Yearly stipend in 2026 dollars by rank. */
  stipend: [number, number, number, number, number];
  /** Label of the work action. */
  work: string;
  /** Rival group you cannot be tied to when you join. */
  rival?: string;
}

const powered = (c: Character) => c.graded && !c.powersGone && c.powers.length > 0;
const atLeast = (c: Character, r: Rank) => powered(c) && RANKS.indexOf(c.powers[0].rank) >= RANKS.indexOf(r);
const felon = (c: Character) => c.record.length > 0;

export const ORGS: Record<OrgId, OrgSpec> = {
  aurelian: {
    id: 'aurelian',
    name: 'Aurelian Hero Development',
    tie: 'Aurelian',
    founded: 1951,
    ranks: ['Prospect', 'Trainee', 'Regional talent', 'Brand hero', 'Flagship hero'],
    joinBlock: (c, age) =>
      !powered(c) ? 'Only takes the Graded'
        : age < 14 ? 'From age 14'
          : felon(c) ? 'Will not sign anyone with a record'
            : c.infamy >= 30 ? 'Your Infamy is bad for the brand' : undefined,
    bars: [
      null,
      { needs: 'Fame 10', ok: (c) => c.fame >= 10 },
      { needs: 'C-Rank or higher and Fame 25', ok: (c) => atLeast(c, 'C') && c.fame >= 25 },
      { needs: 'B-Rank or higher and Fame 45', ok: (c) => atLeast(c, 'B') && c.fame >= 45 },
      { needs: 'A-Rank or higher and Fame 70', ok: (c) => atLeast(c, 'A') && c.fame >= 70 },
    ],
    stipend: [0, 3000, 12000, 40000, 120000],
    work: 'Do brand appearances',
  },
  'low-kings': {
    id: 'low-kings',
    name: 'Low Kings',
    tie: 'Low Kings',
    founded: 2011,
    ranks: ['Hanger-on', 'Ring', 'Soldier', 'Lieutenant', "Dez's right hand"],
    joinBlock: (c, age) =>
      age < 14 ? 'From age 14'
        : !(c.district === 'Riverside Docks' || c.district === 'Old Foundry' || c.streetCred >= 10) ? 'Recruits from Riverside and the Foundry (or Street Cred 10)'
          : undefined,
    bars: [
      null,
      { needs: 'Street Cred 10', ok: (c) => c.streetCred >= 10 },
      { needs: 'Street Cred 25 and Nerve 4', ok: (c) => c.streetCred >= 25 && c.nerve >= 4 },
      { needs: 'Street Cred 45 and Nerve 5', ok: (c) => c.streetCred >= 45 && c.nerve >= 5 },
      { needs: 'Street Cred 70 and Nerve 6', ok: (c) => c.streetCred >= 70 && c.nerve >= 6 },
    ],
    stipend: [0, 1000, 3000, 8000, 20000],
    work: 'Work the blocks for the Low Kings',
    rival: 'the Choir',
  },
  choir: {
    id: 'choir',
    name: 'the Choir',
    tie: 'the Choir',
    founded: 1990,
    ranks: ['Errand runner', 'Voice', 'Chorus lead', 'Soloist', "The Cantor's hand"],
    joinBlock: (c, age) =>
      age < 16 ? 'From age 16'
        : c.infamy < 5 && c.streetCred < 15 ? 'Needs Infamy 5 or Street Cred 15 to get noticed'
          : undefined,
    bars: [
      null,
      { needs: 'Infamy 10', ok: (c) => c.infamy >= 10 },
      { needs: 'Infamy 25', ok: (c) => c.infamy >= 25 },
      { needs: 'Infamy 45 and Mind 5', ok: (c) => c.infamy >= 45 && c.mind >= 5 },
      { needs: 'Infamy 70 and Mind 6', ok: (c) => c.infamy >= 70 && c.mind >= 6 },
    ],
    stipend: [0, 4000, 15000, 50000, 150000],
    work: 'Take work from the Choir',
    rival: 'Low Kings',
  },
  'equal-ground': {
    id: 'equal-ground',
    name: 'Equal Ground',
    tie: 'Equal Ground',
    founded: 2000,
    ranks: ['Volunteer', 'Organizer', 'Field lead', 'Regional director', 'National board'],
    joinBlock: (_c, age) => (age < 14 ? 'From age 14' : undefined),
    bars: [
      null,
      { needs: 'Charm 4', ok: (c) => c.charm >= 4 },
      { needs: 'Charm 5 and Fame 10', ok: (c) => c.charm >= 5 && c.fame >= 10 },
      { needs: 'Charm 6 and Fame 25', ok: (c) => c.charm >= 6 && c.fame >= 25 },
      { needs: 'Charm 7, Fame 40 and a degree', ok: (c) => c.charm >= 7 && c.fame >= 40 && c.education === 'college' },
    ],
    stipend: [0, 0, 2000, 8000, 25000],
    work: 'Organise for Equal Ground',
  },
};

export const ORG_IDS = Object.keys(ORGS) as OrgId[];
/** Standing needed to ask for each next rank (from rank 0, 1, 2, 3). */
export const STANDING_NEEDED = [30, 50, 75, 100];
/** Standing lost on a birthday after a year with no work put in. */
export const DRIFT = 10;

export const orgOf = (c: Character) => (c.org ? ORGS[c.org.id] : null);
export const rankTitle = (c: Character) => (c.org ? ORGS[c.org.id].ranks[c.org.rank] : null);
export const topRank = (c: Character) => !!c.org && c.org.rank >= 4;
export const standingNeeded = (c: Character) => (c.org && !topRank(c) ? STANDING_NEEDED[c.org.rank] : Infinity);

const tie = (c: Character, group: string) => {
  c.ties = [...new Set([...(c.ties ?? []), group])];
};

/** Why you cannot join, or undefined if you can. */
export function joinBlock(s: GameState, id: OrgId, age: number): string | undefined {
  const c = s.character;
  const o = ORGS[id];
  if (s.date.year < o.founded) return 'Does not exist yet';
  if (c.org) return `Already with ${ORGS[c.org.id].name}`;
  if (o.rival && (c.ties ?? []).includes(o.rival)) return `Not while tied to ${o.rival}`;
  return o.joinBlock(c, age);
}

/** Puts the character in an organisation at the bottom rank (or does nothing if they are in one). */
export function enlist(s: GameState, id: OrgId) {
  const c = s.character;
  tie(c, ORGS[id].tie);
  if (c.org) return;
  c.org = { id, rank: 0, standing: 0, since: s.date.year };
}

/** Membership for a group name from Character.ties, if one matches. */
export const orgForTie = (group: string): OrgId | undefined => ORG_IDS.find((id) => ORGS[id].tie === group);

/** Adds standing toward the next rank (capped at what the next rank needs). */
export function gainStanding(s: GameState, by: number) {
  const m = s.character.org;
  if (!m) return;
  m.standing = Math.min(standingNeeded(s.character) === Infinity ? 100 : standingNeeded(s.character), m.standing + by);
  m.workedTurn = s.turn ?? 0;
}

/** Why a promotion would be refused now, or undefined if it would go through. */
export function promotionBlock(c: Character): string | undefined {
  const m = c.org;
  if (!m) return 'Not in an organisation';
  if (topRank(c)) return 'Already at the top';
  if (m.standing < STANDING_NEEDED[m.rank]) return `Standing ${m.standing}/${STANDING_NEEDED[m.rank]}`;
  const bar = ORGS[m.id].bars[m.rank + 1]!;
  return bar.ok(c) ? undefined : `Needs ${bar.needs}`;
}

export function promote(c: Character) {
  c.org!.rank++;
  c.highestOrgRank = Math.max(c.highestOrgRank ?? 0, c.org!.rank);
  c.org!.standing = 0;
}

/** Leaves the organisation; the tie goes with it. */
export function leave(c: Character) {
  if (!c.org) return;
  const o = ORGS[c.org.id];
  c.ties = (c.ties ?? []).filter((t) => t !== o.tie);
  c.org = null;
}

/** Crime pay multiplier from rank in a crew (Choir and Low Kings). */
export function crewPayBonus(c: Character): number {
  if (!c.org || (c.org.id !== 'choir' && c.org.id !== 'low-kings')) return 1;
  return 1 + c.org.rank * (c.org.id === 'choir' ? 0.15 : 0.08);
}

/** Sentence multiplier from organisation lawyers (the Choir's are better than Equal Ground's). */
export function lawyerDiscount(c: Character): number {
  if (!c.org) return 1;
  if (c.org.id === 'choir') return 1 - 0.04 * c.org.rank;
  if (c.org.id === 'equal-ground') return 1 - 0.05 * c.org.rank;
  return 1;
}

/** Arrest chance change from Low Kings lookouts (a share point per rank). */
export const lookoutCover = (c: Character) => (c.org?.id === 'low-kings' ? c.org.rank * 0.005 : 0);

/** Each birthday: the stipend for your rank, and standing drifts if you did nothing for a year. */
export function orgYear(s: GameState, rng: Rng, imprisoned: boolean) {
  const c = s.character;
  const m = c.org;
  if (!m) return;
  const o = ORGS[m.id];
  const idle = (s.turn ?? 0) - (m.workedTurn ?? -Infinity) >= 1;
  if (idle && m.standing > 0) m.standing = Math.max(0, m.standing - DRIFT);
  // Aurelian drops talent who pick up a record; nobody else cares.
  if (m.id === 'aurelian' && c.record.some((r) => r.year >= m.since)) {
    leave(c);
    say(s, rng, 'life', 'org.aurelian.dropped');
    return;
  }
  const pay = o.stipend[m.rank] && !imprisoned ? dollars(o.stipend[m.rank], s.date.year) : 0;
  if (pay) {
    c.money += pay;
    say(s, rng, 'money', `org.${m.id}.stipend`, { money: pay, title: o.ranks[m.rank] });
  }
}
