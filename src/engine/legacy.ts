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
  const l = lifeOf(state);
  const named = heirsOf(state).find(p => p.id === l.will);
  const estate = Math.max(0, netWorth(state));
  const inheritance = named ? (named.id === id ? estate : 0) : Math.floor(estate / heirsOf(state).length);
  const s = createGame({ seed: state.rngState, name: heir.name, age: state.date.year - heir.born,
    startYear: state.date.year, background: state.character.graded ? 'graded family' : state.character.background,
    powered: heir.graded ? 'roll' : 'baseline', });
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
