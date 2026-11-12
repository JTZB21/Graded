// Local saves: an autosave plus three slots, kept in the browser's storage on this device
// (localStorage, which the Android app keeps too). Saves can also be copied out as text and pasted back.

import { ensureLife } from './engine/life';
import { ensurePeople } from './engine/people';
import { ensureSchool } from './engine/school';
import { orgForTie } from './engine/orgs';
import { ageHealth, ageOf } from './engine/state';
import { formatDate } from './engine/sheet';
import type { GameState } from './engine/types';

export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];

const AUTO = 'graded.autosave';
const slotKey = (n: Slot) => `graded.slot.${n}`;

export interface SaveInfo {
  savedAt: string;
  summary: string;
}

interface SaveFile extends SaveInfo {
  game: GameState;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const summary = (g: GameState) => `${g.character.name}, age ${ageOf(g)} · ${formatDate(g.date)}${g.character.alive ? '' : ' · deceased'}`;

/** Brings a save from an older version of the game up to date. */
export function migrate(g: GameState): GameState {
  const s = structuredClone(g);
  ensurePeople(s);
  ensureSchool(s);
  ensureLife(s);
  s.turn ??= 0;
  // Health over a lifetime: older saves had no age-based most health.
  if (s.character.maxHealth === undefined) ageHealth(s.character, ageOf(s));
  // Organisations: a save that already joined the Low Kings, the Choir or Aurelian through a choice starts at the bottom rank.
  if (s.character.org === undefined) {
    const id = (s.character.ties ?? []).map(orgForTie).find((x) => x);
    s.character.org = id ? { id, rank: 0, standing: 0, since: s.date.year } : null;
  }
  s.character.romanceGifts ??= 0;
  s.character.romanceActivities ??= 0;
  s.character.exam ??= null;
  s.character.examScholarship ??= false;
  s.character.titles ??= [];
  s.character.displayedTitle ??= null;
  s.character.highestOrgRank ??= s.character.org?.rank ?? 0;
  s.character.legacyAwarded ??= false;
  s.legacyPoints ??= 0;
  s.returningPeople ??= [];
  s.legacyStart ??= null;
  return s;
}

function isGame(x: unknown): x is GameState {
  const g = x as GameState;
  return !!g && typeof g === 'object' && g.version === 1 && !!g.character && !!g.date && Array.isArray(g.log);
}

function read(key: string): SaveFile | null {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    const f = JSON.parse(raw) as SaveFile;
    return isGame(f.game) ? { ...f, game: migrate(f.game) } : null;
  } catch {
    return null;
  }
}

function write(key: string, game: GameState): boolean {
  try {
    const f: SaveFile = { savedAt: new Date().toISOString(), summary: summary(game), game };
    storage()?.setItem(key, JSON.stringify(f));
    return true;
  } catch {
    return false;
  }
}

export const autosave = (game: GameState) => write(AUTO, game);
export const loadAutosave = () => read(AUTO)?.game ?? null;
export const clearAutosave = () => { try { storage()?.removeItem(AUTO); } catch { /* ignore */ } };

export const saveSlot = (n: Slot, game: GameState) => write(slotKey(n), game);
export const loadSlot = (n: Slot) => read(slotKey(n))?.game ?? null;
export const deleteSlot = (n: Slot) => { try { storage()?.removeItem(slotKey(n)); } catch { /* ignore */ } };
export function slotInfo(n: Slot): SaveInfo | null {
  const f = read(slotKey(n));
  return f ? { savedAt: f.savedAt, summary: f.summary } : null;
}
export const anySlots = () => SLOTS.some((n) => slotInfo(n));

/** A save as a block of text you can copy somewhere safe. */
export function exportCode(game: GameState): string {
  let bin = '';
  for (const b of new TextEncoder().encode(JSON.stringify(game))) bin += String.fromCharCode(b);
  return `GRADED1:${btoa(bin)}`;
}

/** Reads a save code (or a raw JSON save). Returns null if it is not a GRADED save. */
export function importCode(text: string): GameState | null {
  try {
    const t = text.trim();
    const json = t.startsWith('GRADED1:')
      ? new TextDecoder().decode(Uint8Array.from(atob(t.slice(8).replace(/\s+/g, '')), (ch) => ch.charCodeAt(0)))
      : t;
    const g = JSON.parse(json);
    return isGame(g) ? migrate(g) : null;
  } catch {
    return null;
  }
}
