// Display only: particles, banners and floating numbers on top of the game. The engine never sees any of it.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EFFECTS_KEY, effectsLevel, onFx, playFx, readEffects, saveEffects, type EffectsLevel, type Moment, type Tone } from './fx';

// ---- Effects level: one small store shared by the layer, the settings card and CSS (html[data-effects]).
let level: EffectsLevel = typeof window === 'undefined' ? 'full' : readEffects();
const subs = new Set<() => void>();
function setLevel(next: EffectsLevel) {
  level = next;
  if (typeof document !== 'undefined') document.documentElement.dataset.effects = next;
  subs.forEach(s => s());
}
if (typeof document !== 'undefined') document.documentElement.dataset.effects = level;
const useLevel = () => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => level, () => 'full' as EffectsLevel);

// ---- Canvas particles.
type Shape = 'spark' | 'coin' | 'ring' | 'bolt' | 'ember';
type P = { shape: Shape; x: number; y: number; vx: number; vy: number; t: number; life: number; size: number; color: string; spin: number; pts?: number[] };
const MAX_PARTICLES = 140;

const token = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function lightning(x: number, y: number, angle: number, length: number): number[] {
  const pts = [x, y];
  const steps = 7;
  for (let i = 1; i <= steps; i++) {
    const d = (length * i) / steps;
    const jitter = i === steps ? 0 : rand(-14, 14);
    pts.push(x + Math.cos(angle) * d + Math.cos(angle + Math.PI / 2) * jitter, y + Math.sin(angle) * d + Math.sin(angle + Math.PI / 2) * jitter);
  }
  return pts;
}

type Banner = { id: number; kind: 'birthday' | 'awaken' | 'grade' | 'arrest' | 'death'; title: string; sub?: string };
type Float = { id: number; text: string; tone: Tone; x: number; y: number; delay: number };
type Screen = { id: number; kind: 'flash-power' | 'flash-bad' | 'siren' | 'dim' };

let nextId = 1;

export function FxLayer() {
  const lvl = useLevel();
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const frame = useRef(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    addEventListener('resize', resize);

    let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const list = parts.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.t += dt;
        if (p.t >= p.life) { list.splice(i, 1); continue; }
        const k = p.t / p.life;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.shape === 'spark' || p.shape === 'coin') { p.vy += 900 * dt * (p.shape === 'coin' ? 1 : 0.6); p.vx *= 0.985; }
        if (p.shape === 'ember') { p.vy -= 30 * dt; p.vx *= 0.97; }
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.strokeStyle = ctx.fillStyle = p.color;
        if (p.shape === 'spark') {
          ctx.lineWidth = p.size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
        } else if (p.shape === 'ember') {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === 'coin') {
          const w = Math.abs(Math.cos(p.t * p.spin)) * p.size;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, w), p.size, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha *= 0.45; ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(p.x - w * 0.3, p.y - p.size * 0.3, Math.max(0.5, w * 0.3), p.size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === 'ring') {
          ctx.lineWidth = Math.max(0.5, p.size * (1 - k));
          ctx.beginPath(); ctx.arc(p.x, p.y, 10 + k * p.vx, 0, Math.PI * 2); ctx.stroke();
        } else if (p.shape === 'bolt' && p.pts) {
          if (Math.random() < 0.25) continue; // flicker
          ctx.lineWidth = p.size; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(p.pts[0], p.pts[1]);
          for (let j = 2; j < p.pts.length; j += 2) ctx.lineTo(p.pts[j], p.pts[j + 1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // Stop drawing when nothing is moving, so idle screens cost no battery.
      frame.current = list.length ? requestAnimationFrame(tick) : 0;
      if (!list.length) { last = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    const kick = () => { if (!frame.current) frame.current = requestAnimationFrame(tick); };
    (cv as HTMLCanvasElement & { kick?: () => void }).kick = kick;
    return () => { removeEventListener('resize', resize); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, []);

  useEffect(() => onFx((moments, origin) => {
    if (level === 'off') return;
    const full = level === 'full';
    const cx = innerWidth / 2, cy = innerHeight * 0.42;
    const o = origin ?? { x: cx, y: cy };
    const add = (p: Omit<P, 't'>) => { if (parts.current.length < MAX_PARTICLES) parts.current.push({ ...p, t: 0 }); };
    const banner = (b: Omit<Banner, 'id'>, ms: number) => {
      const id = nextId++;
      setBanners(list => [...list.filter(x => x.kind !== b.kind), { ...b, id }]);
      setTimeout(() => setBanners(list => list.filter(x => x.id !== id)), ms);
    };
    const screen = (kind: Screen['kind'], ms: number) => {
      if (!full && kind !== 'dim') return; // calm keeps the slow fade on death, drops flashes
      const id = nextId++;
      setScreens(list => [...list, { id, kind }]);
      setTimeout(() => setScreens(list => list.filter(x => x.id !== id)), ms);
    };

    const sparks = (x: number, y: number, n: number, colors: string[], speed = 420) => {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), s = rand(speed * 0.4, speed);
        add({ shape: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160, life: rand(0.5, 0.9), size: rand(1.5, 3), color: colors[i % colors.length], spin: 0 });
      }
    };

    let delay = 0;
    for (const m of moments) {
      if (m.kind === 'death') {
        banner({ kind: 'death', title: '†', sub: 'A life ends' }, 3200);
        screen('dim', 3200);
        if (full) for (let i = 0; i < 26; i++) add({ shape: 'ember', x: rand(0, innerWidth), y: rand(innerHeight * 0.6, innerHeight), vx: rand(-10, 10), vy: rand(-60, -20), life: rand(2, 3.2), size: rand(1.5, 3), color: token('--muted', '#888'), spin: 0 });
      } else if (m.kind === 'awaken') {
        banner({ kind: 'awaken', title: 'GRADED', sub: 'Something wakes up in you' }, 2800);
        screen('flash-power', 900);
        if (full) {
          const c = [token('--c-nerve', '#8f78d6'), token('--c-mind', '#5b8fd0'), '#ffffff'];
          for (let i = 0; i < 3; i++) add({ shape: 'ring', x: cx, y: cy, vx: Math.max(innerWidth, innerHeight) * (0.5 + i * 0.25), vy: 0, life: 0.9 + i * 0.25, size: 6 - i, color: c[i % 2], spin: 0 });
          for (let i = 0; i < 9; i++) add({ shape: 'bolt', x: cx, y: cy, vx: 0, vy: 0, life: rand(0.25, 0.6), size: rand(1.5, 2.5), color: c[i % 3], spin: 0, pts: lightning(cx, cy, rand(0, Math.PI * 2), rand(90, 220)) });
          sparks(cx, cy, 40, c, 600);
        }
      } else if (m.kind === 'grade') {
        banner({ kind: 'grade', title: `Grade ${m.grade}`, sub: 'The registry updates your file' }, 2200);
        if (full) {
          const c = token('--c-nerve', '#8f78d6');
          add({ shape: 'ring', x: cx, y: cy, vx: 260, vy: 0, life: 0.8, size: 4, color: c, spin: 0 });
          for (let i = 0; i < 5; i++) add({ shape: 'bolt', x: cx, y: cy, vx: 0, vy: 0, life: rand(0.2, 0.45), size: 2, color: c, spin: 0, pts: lightning(cx, cy, rand(0, Math.PI * 2), rand(70, 150)) });
        }
      } else if (m.kind === 'arrest') {
        banner({ kind: 'arrest', title: 'Booked', sub: 'Taken into custody' }, 2400);
        screen('siren', 2000);
      } else if (m.kind === 'birthday') {
        banner({ kind: 'birthday', title: String(m.age), sub: `Age ${m.age} · ${m.year}` }, 2000);
        if (full) sparks(cx, cy, 34, [token('--c-fame', '#e0b13c'), token('--accent-btn', '#79c39b'), token('--c-charm', '#d9778f'), token('--c-mind', '#5b8fd0')], 520);
      } else if (m.kind === 'coins') {
        if (full) {
          const n = Math.min(18, 3 + Math.round(Math.log10(Math.max(10, m.amount)) * 3));
          const gold = token('--c-money', '#d4a63a');
          for (let i = 0; i < n; i++) add({ shape: 'coin', x: o.x, y: o.y, vx: rand(-200, 200), vy: rand(-560, -300), life: rand(0.9, 1.3), size: rand(5, 8), color: gold, spin: rand(6, 12) });
        }
      } else if (m.kind === 'burst') {
        if (m.tone === 'good' && full) sparks(o.x, o.y, 16, [token('--c-health', '#4fae84'), token('--accent-btn', '#79c39b')], 340);
        if (m.tone === 'bad') {
          screen('flash-bad', 600);
          if (full) requestAnimationFrame(() => document.getElementById('action-result')?.animate?.(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
            { duration: 360, easing: 'ease-out' }));
        }
      } else if (m.kind === 'float') {
        const id = nextId++;
        const f: Float = { id, text: m.text, tone: m.tone, x: Math.max(70, Math.min(innerWidth - 70, o.x + rand(-16, 16))), y: o.y - 10 - (delay / 180) * 40, delay };
        delay += 180;
        setFloats(list => [...list.slice(-7), f]);
        setTimeout(() => setFloats(list => list.filter(x => x.id !== id)), 1500 + f.delay);
      }
    }
    if (parts.current.length) (canvas.current as (HTMLCanvasElement & { kick?: () => void }) | null)?.kick?.();
  }), []);

  if (lvl === 'off') return null;
  return (
    <div className="fx-layer" aria-hidden="true">
      {screens.map(s => <div key={s.id} className={`fx-screen fx-${s.kind}`} />)}
      <canvas ref={canvas} className="fx-canvas" />
      {floats.map(f => <span key={f.id} className={`fx-float ${f.tone}`} style={{ left: f.x, top: f.y, animationDelay: `${f.delay}ms` }}>{f.text}</span>)}
      {banners.map(b => (
        <div key={b.id} className={`fx-banner fx-banner-${b.kind}`}>
          <strong>{b.kind === 'awaken' ? [...b.title].map((ch, i) => <span key={i} style={{ animationDelay: `${i * 70}ms` }}>{ch}</span>) : b.title}</strong>
          {b.sub && <small>{b.sub}</small>}
        </div>
      ))}
    </div>
  );
}

// ---- Settings card.
const LABELS: Record<EffectsLevel, { name: string; hint: string }> = {
  full: { name: 'Full', hint: 'Particles, flashes and banners' },
  calm: { name: 'Calm', hint: 'Gentle fades, no flashing' },
  off: { name: 'Off', hint: 'No animation' },
};
const PREVIEW: Moment[][] = [
  [{ kind: 'birthday', age: 18, year: 2031 }, { kind: 'float', text: 'Body +1', tone: 'good' }, { kind: 'float', text: 'Stress +4', tone: 'bad' }],
  [{ kind: 'coins', amount: 2500 }, { kind: 'burst', tone: 'good' }, { kind: 'float', text: '+$2,500', tone: 'good' }],
  [{ kind: 'awaken' }],
  [{ kind: 'arrest' }, { kind: 'burst', tone: 'bad' }],
];

export function EffectsSettings() {
  const lvl = useLevel();
  const [saved, setSaved] = useState(true);
  const [preview, setPreview] = useState(0);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === EFFECTS_KEY) setLevel(effectsLevel(e.newValue) ?? readEffects()); };
    addEventListener('storage', sync);
    return () => removeEventListener('storage', sync);
  }, []);
  return (
    <section className="card appearance">
      <h3>Animations</h3>
      <p className="muted">Effects for birthdays, money, powers, arrests and stat changes. Calm is easier on the eyes and the battery.</p>
      <div className="theme-options" role="group" aria-label="Animation level">
        {(['full', 'calm', 'off'] as const).map(v => (
          <button key={v} className={`theme-choice fx-choice${lvl === v ? ' selected' : ''}`} aria-pressed={lvl === v} onClick={() => { setLevel(v); setSaved(saveEffects(v)); }}>
            {LABELS[v].name}<small>{LABELS[v].hint}</small>
          </button>
        ))}
      </div>
      <button className="pill small fx-preview" disabled={lvl === 'off'} onClick={(e) => { playFx(PREVIEW[preview], e.currentTarget); setPreview((preview + 1) % PREVIEW.length); }}>
        Preview an effect
      </button>
      {!saved && <p className="hint" role="status">Changed for this session. Device storage is unavailable, so it could not be saved.</p>}
    </section>
  );
}
