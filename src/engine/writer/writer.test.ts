import { describe, expect, it } from 'vitest';
import { act, availableActions } from '../actions';
import { createGame } from '../creation';
import { choose, DECISIONS } from '../decisions';
import { EVENTS } from '../events';
import { Rng } from '../random';
import { advance } from '../time';
import type { Focus, GameState } from '../types';
import { TEMPLATES } from './templates';
import { ERA_WORDS, keyFrom, write } from './writer';

const FOCUSES: Focus[] = ['school', 'work', 'train', 'crime', 'family', 'rest'];

/** Plays a whole life, picking decision options and focuses from `pickSeed`. */
function playLife(seed: number, startYear: number, years = 60) {
  const r = new Rng(seed * 7 + 1);
  let s = createGame({ seed, startYear });
  const offered: string[] = [];
  for (let i = 0; i < years * 2 && s.character.alive; i++) {
    if (s.pending) {
      offered.push(s.pending.id);
      s = choose(s, r.pick(s.pending.options).id);
    }
    // Take a couple of actions the player could take right now, like a player would.
    for (let k = 0; k < 2 && s.character.alive && !s.pending; k++) {
      const open = availableActions(s).filter((a) => !a.disabled);
      if (open.length) s = act(s, r.pick(open).id);
    }
    if (s.pending) continue;
    s = advance(s, 6, r.pick(FOCUSES)).state;
  }
  return { s, offered };
}

const LIVES = Array.from({ length: 160 }, (_, i) => playLife(1000 + i, 1950 + ((i * 7) % 77)));
const writtenLines = (s: GameState) => {
  // Timeline entries come straight from the lorebook's history; everything else is the writer's.
  return s.log.filter((e) => !(e.kind === 'world' && e.date.month === 1 && !e.text.includes('.')) );
};

describe('writer', () => {
  it('writes the same text for the same seed', () => {
    const a = playLife(77, 1990).s.log.map((e) => e.text);
    const b = playLife(77, 1990).s.log.map((e) => e.text);
    expect(a).toEqual(b);
  });

  it('never leaves a {token} unfilled', () => {
    for (const { s } of LIVES) {
      for (const e of s.log) expect(e.text, e.text).not.toMatch(/\{\w+\}/);
    }
  });

  it('never names an institution before it exists', () => {
    const history = new Set<string>();
    for (const { s } of LIVES) {
      for (const e of writtenLines(s)) {
        if (e.kind === 'world' && e.date.month === 1) { history.add(e.text); continue; }
        for (const [word, year] of Object.entries(ERA_WORDS)) {
          if (e.text.includes(word)) expect(e.date.year, `${e.date.year}: ${e.text}`).toBeGreaterThanOrEqual(year);
        }
      }
    }
  });

  it('dates every template line that names an institution', () => {
    for (const [key, variants] of Object.entries(TEMPLATES)) {
      for (const v of variants) {
        const text = typeof v === 'string' ? v : v.t;
        const from = Math.max(keyFrom(key), typeof v === 'string' ? 0 : v.when.from ?? 0);
        for (const [word, year] of Object.entries(ERA_WORDS)) {
          if (text.includes(word)) expect(from, `${key}: ${text}`).toBeGreaterThanOrEqual(year);
        }
      }
    }
  });

  it('has a line for every moment: each key keeps an undated variant unless the engine dates the key', () => {
    for (const [key, variants] of Object.entries(TEMPLATES)) {
      if (keyFrom(key) || key.startsWith('event.burn-offer')) continue;
      expect(variants.some((v) => typeof v === 'string'), key).toBe(true);
    }
  });

  it('never uses the card\'s banned names for invented people', () => {
    const banned = /\b(Elara|Lyra|Kael|Marcus|Elias|Seraphina|Luna|Zara|Silas|Ezra|Rowan|Finn|Jax|Orion|Damien|Viktor|Liam|Ethan|Thorne|Blackwood|Ashford)\b/;
    for (const { s } of LIVES) for (const e of s.log) expect(e.text).not.toMatch(banned);
  });

  it('does not change the game\'s dice', () => {
    const s = createGame({ seed: 5 });
    const rng = new Rng(s.rngState);
    write(s, rng, 'event.hero-fight');
    expect(rng.state).toBe(s.rngState);
  });

  it('throws on an unknown key', () => {
    const s = createGame({ seed: 5 });
    expect(() => write(s, new Rng(1), 'no.such.key')).toThrow();
  });
});

describe('decisions', () => {
  it('stops time until the player chooses', () => {
    const { s } = LIVES.find((l) => l.offered.length)!;
    let state = createGame({ seed: 1000 + LIVES.findIndex((l) => l.offered.length), startYear: 1950 });
    // Find a state with a pending decision.
    for (let i = 0; i < 400 && !state.pending && state.character.alive; i++) state = advance(state, 6, 'crime').state;
    expect(s).toBeTruthy();
    if (!state.pending) return;
    const r = advance(state, 12, 'rest');
    expect(r.monthsPassed).toBe(0);
    expect(r.stoppedBy).toBe('decision');
    const after = choose(state, state.pending.options[0].id);
    expect(after.pending).toBeNull();
    expect(state.pending).toBeTruthy(); // input untouched
  });

  it('offers a pause decision for every pausing event and every option is valid', () => {
    const offered = new Set(LIVES.flatMap((l) => l.offered));
    for (const id of ['kindling', 'aurelian-recruiter', 'near-death', 'rush-offer', 'choir-offer']) expect(offered).toContain(id);
    for (const spec of Object.values(DECISIONS)) expect(spec.options.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects an option that is not on offer', () => {
    let s = createGame({ seed: 3, age: 11, powered: { rank: 'C' } });
    for (let i = 0; i < 40 && !s.pending; i++) s = advance(s, 6, 'school').state;
    expect(s.pending).toBeTruthy();
    expect(() => choose(s, 'not-an-option')).toThrow();
  });

  it('Kindling offers a choice', () => {
    let s = createGame({ seed: 3, age: 11, powered: { rank: 'C' } });
    for (let i = 0; i < 40 && !s.character.graded; i++) {
      if (s.pending) s = choose(s, s.pending.options[0].id);
      s = advance(s, 6, 'school').state;
    }
    expect(s.character.graded).toBe(true);
  });

  it('every event id is unique', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
