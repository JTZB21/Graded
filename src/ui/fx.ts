// Display only: turns a move the engine already made into visual effects. Nothing here changes game state.
import { changes } from '../engine/sheet';
import { ageOf } from '../engine/state';
import type { GameState } from '../engine/types';

export type EffectsLevel = 'full' | 'calm' | 'off';
export const EFFECTS_KEY = 'graded.effects';
export const effectsLevel = (value: string | null): EffectsLevel | null => (value === 'full' || value === 'calm' || value === 'off' ? value : null);

/** Saved choice, else calm when the device asks for less motion, else full. */
export function readEffects(): EffectsLevel {
  let saved: EffectsLevel | null = null;
  try { saved = effectsLevel(localStorage.getItem(EFFECTS_KEY)); } catch { /* storage blocked */ }
  if (saved) return saved;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full';
}
export function saveEffects(level: EffectsLevel): boolean {
  try { localStorage.setItem(EFFECTS_KEY, level); return true; } catch { return false; }
}

export type Tone = 'good' | 'bad' | 'neutral';
// Going up is bad for these.
const BAD_WHEN_UP = /^(Stress|Strain|Infamy)\b/;

/** Reads one line from `changes()` ("Body +1", "-$200", "Prison until ...") as good, bad or neutral. */
export function toneOf(change: string): Tone {
  if (/^(Dead|No job|Prison until|Release moved)/.test(change)) return 'bad';
  if (/^(New job|Grade |Moved to)/.test(change)) return 'neutral';
  if (/^-\$/.test(change)) return 'bad';
  if (/^\+\$/.test(change)) return 'good';
  const m = change.match(/ ([+-])\d/);
  if (!m) return 'neutral';
  const up = m[1] === '+';
  return BAD_WHEN_UP.test(change) === up ? 'bad' : 'good';
}

export type Moment =
  | { kind: 'birthday'; age: number; year: number }
  | { kind: 'awaken' }
  | { kind: 'grade'; grade: string }
  | { kind: 'arrest' }
  | { kind: 'death' }
  | { kind: 'coins'; amount: number }
  | { kind: 'burst'; tone: Tone }
  | { kind: 'float'; text: string; tone: Tone };

/** Every effect a move earns, biggest first. Pure, so it is tested without a browser. */
export function momentsFor(before: GameState, after: GameState): Moment[] {
  const a = before.character, b = after.character;
  const out: Moment[] = [];
  if (a.alive && !b.alive) return [{ kind: 'death' }];
  if (!a.graded && b.graded) out.push({ kind: 'awaken' });
  else if (b.grade && a.grade !== b.grade) out.push({ kind: 'grade', grade: b.grade });
  if (!a.inPrisonUntil && b.inPrisonUntil) out.push({ kind: 'arrest' });
  if (ageOf(after) > ageOf(before)) out.push({ kind: 'birthday', age: ageOf(after), year: after.date.year });
  if (b.money > a.money) out.push({ kind: 'coins', amount: b.money - a.money });

  const list = changes(before, after);
  const tones = list.map(toneOf);
  const good = tones.filter(t => t === 'good').length, bad = tones.filter(t => t === 'bad').length;
  if (good || bad) out.push({ kind: 'burst', tone: good > bad ? 'good' : bad > good ? 'bad' : 'neutral' });
  // A year can change a dozen numbers; float only the first few so the screen stays readable.
  list.slice(0, 4).forEach((text, i) => out.push({ kind: 'float', text, tone: tones[i] }));
  return out;
}

type Listener = (moments: Moment[], origin: { x: number; y: number } | null) => void;
const listeners = new Set<Listener>();
export function onFx(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }

/** Plays effects from the centre of the control the player just pressed, if any. */
export function playFx(moments: Moment[], from?: Element | null) {
  if (!moments.length) return;
  const el = from ?? (typeof document !== 'undefined' ? document.activeElement : null);
  let origin: { x: number; y: number } | null = null;
  if (el && el !== document.body && 'getBoundingClientRect' in el) {
    const r = el.getBoundingClientRect();
    if (r.width && r.bottom > 0 && r.top < window.innerHeight) origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  listeners.forEach(l => l(moments, origin));
}
