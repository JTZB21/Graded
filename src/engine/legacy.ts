import { dollars } from './economy';
import { addPerson, vars } from './people';
import { enlist, ORGS } from './orgs';
import type { Attribute } from './state';
import { createGame } from './creation';
import { ensureLife, lifeOf, netWorth } from './life';
import { ageOf } from './state';
import type { GameState } from './types';
import { Rng } from './random';
import { say } from './writer/writer';

export const heirsOf = (s: GameState) => (s.character.people ?? []).filter(p => p.alive && p.relation === 'child' && p.born <= s.date.year);

/** A will is reversible, but cannot be rewritten after death or during a decision. */
export function setHeir(state: GameState, id: string | null): GameState {
  if (!state.character.alive || state.pending) throw new Error('Cannot change this will now');
  if (id !== null && !heirsOf(state).some(p => p.id === id)) throw new Error('Choose a living child');
  const s = structuredClone(state);
  ensureLife(s).will = id;
  return s;
}

/** Settle assets and debts once, then start a new playable generation on the same date. */
export function continueAsHeir(state: GameState, id: string): GameState {
  if (state.character.alive) throw new Error('Legacy begins after death');
  const heir = heirsOf(state).find(p => p.id === id);
  if (!heir) throw new Error('Choose a living child');
  state = structuredClone(state);
  settleLegacy(state);
  const l = lifeOf(state);
  const named = heirsOf(state).find(p => p.id === l.will);
  const estate = Math.max(0, netWorth(state));
  const inheritance = named ? (named.id === id ? estate : 0) : Math.floor(estate / heirsOf(state).length);
  const s = createGame({ seed: state.rngState, name: heir.name, age: state.date.year - heir.born,
    startYear: state.date.year, background: state.character.graded ? 'graded family' : state.character.background,
    powered: heir.graded ? 'roll' : 'baseline', });
  s.legacyPoints = state.legacyPoints;
  s.returningPeople = structuredClone(state.returningPeople ?? []);
  s.legacyStart = { open: true, attributes: 0, money: false, standing: false, org: state.character.org?.id };
  s.date = { ...state.date };
  // Birth month is not stored for NPCs: use this month so the displayed age is exact.
  s.character.born = { year: heir.born, month: state.date.month };
  s.character.district = state.character.district;
  s.character.money = inheritance;
  s.character.job = null;
  s.character.people = (state.character.people ?? []).filter(p => p.id !== id && (p.relation === 'child' || p.relation === 'spouse' || p.relation === 'partner')).map(p => ({
    ...p, relation: p.relation === 'child' ? 'sibling' as const : 'guardian' as const,
    usedTurn: undefined, usedCount: undefined, livesWithYou: false,
  }));
  s.character.people.push({ id: `ancestor-${state.character.born.year}-${state.turn ?? 0}`, name: state.character.name,
    relation: 'guardian', born: state.character.born.year, alive: false, bond: heir.bond, moments: heir.moments });
  s.character.livesWithFamily = ageOf(s) < 18;
  s.log = structuredClone(state.log);
  s.turn = (state.turn ?? 0) + 1;
  const rng = new Rng(s.rngState);
  say(s, rng, 'life', 'life.heir', { ancestor: state.character.name, money: inheritance });
  return s;
}

/** At most 42 points per life; ordinary lives earn roughly 10-20. */
export function legacyReward(s: GameState): number {
  const c = s.character;
  return ((c.highestOrgRank ?? c.org?.rank ?? 0) >= 4 ? 10 : 0)
    + (c.fame > 50 ? 5 : 0) + (c.infamy > 50 ? 5 : 0)
    + (c.education === 'college' || c.credentials?.includes('associate degree') ? 5 : 0)
    + Math.min(9, (c.people ?? []).filter(p => p.relation === 'child' && s.date.year - p.born >= 18 && p.bond >= 40).length * 3)
    + Math.min(8, Math.floor(ageOf(s) / 10));
}
export function settleLegacy(s: GameState) {
  const c = s.character;
  if (c.alive || c.legacyAwarded) return;
  s.legacyPoints = (s.legacyPoints ?? 0) + legacyReward(s);
  c.legacyAwarded = true;
  s.returningPeople = structuredClone((c.people ?? []).filter(p => p.alive && p.born <= s.date.year).sort((a,b) => b.bond - a.bond).slice(0,3));
}
export function returningYear(s: GameState, rng: Rng) {
  s.returningPeople = (s.returningPeople ?? []).filter(old => {
    if (!rng.chance(0.08)) return true;
    const p = addPerson(s, rng, 'friend', 60, Math.max(18, ageOf(s) + rng.int(0, 15)));
    say(s, rng, 'life', 'legacy.return', vars(p, { ancestor: old.name }));
    return false;
  });
}
export const LEGACY_COST = { attribute: 8, money: 5, standing: 5 };
export type LegacyPurchase = Attribute | 'money' | 'standing';
export function legacyBlock(s: GameState, item: LegacyPurchase): string | undefined {
  const h = s.legacyStart;
  if (!h?.open || !s.character.alive || s.pending) return 'Head starts are closed';
  const attr = item !== 'money' && item !== 'standing';
  if ((s.legacyPoints ?? 0) < LEGACY_COST[attr ? 'attribute' : item]) return 'Not enough legacy points';
  if (attr && (h.attributes >= 2 || s.character[item] >= 10)) return 'Attribute cap reached';
  if (item === 'money' && h.money) return 'Money already purchased';
  if (item === 'standing') {
    if (h.standing) return 'Standing already purchased';
    if (!h.org) return 'No parent organisation';
    if (s.character.org && s.character.org.id !== h.org) return 'Already in another organisation';
    if (ORGS[h.org].rival && s.character.ties?.includes(ORGS[h.org].rival!)) return 'Rival organisation tie';
    const o = ORGS[h.org];
    if (s.date.year < o.founded || o.joinBlock(s.character, ageOf(s))) return 'Organisation entry requirements not met';
  }
}
export function buyLegacy(state: GameState, item: LegacyPurchase): GameState {
  if (!['body','mind','charm','nerve','money','standing'].includes(item)) throw new Error('Unknown head start');
  const blocked = legacyBlock(state, item); if (blocked) throw new Error(blocked);
  const s = structuredClone(state), h = s.legacyStart!, c = s.character;
  if (item === 'money') { c.money += dollars(2000, s.date.year); h.money = true; s.legacyPoints! -= 5; }
  else if (item === 'standing') { enlist(s, h.org!); c.org!.standing = Math.min(100, c.org!.standing + 20); h.standing = true; s.legacyPoints! -= 5; }
  else { c[item]++; h.attributes++; s.legacyPoints! -= 8; }
  return s;
}
export function finishLegacy(state: GameState): GameState {
  const s = structuredClone(state); if (s.legacyStart) s.legacyStart.open = false; return s;
}
