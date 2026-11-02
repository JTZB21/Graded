// Mini games for a few actions. They only measure how well the player did (a score from 0 to 1);
// the engine turns that score into odds and rolls the result. Layout randomness here is cosmetic.

import { useEffect, useRef, useState } from 'react';

export type MiniGameKind = 'memory' | 'lockpick' | 'timing';

const TITLES: Record<MiniGameKind, { title: string; how: string }> = {
  memory: { title: 'Study session', how: 'Watch the squares light up, then tap them in the same order.' },
  lockpick: { title: 'Pick the lock', how: 'Tap "Set pin" while the marker is inside the green zone. Three pins.' },
  timing: { title: 'In the ring', how: 'Wait for STRIKE, then tap as fast as you can. Tap early and you get hit. Three rounds.' },
};

export function MiniGame({ kind, onDone, onCancel }: { kind: MiniGameKind; onDone: (score: number) => void; onCancel: () => void }) {
  const [score, setScore] = useState<number | null>(null);
  const t = TITLES[kind];
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label={t.title}>
      <section className="sheet-panel minigame">
        <h2>{t.title}</h2>
        <p className="muted">{t.how}</p>
        {score === null ? (
          <>
            {kind === 'memory' && <Memory onEnd={setScore} />}
            {kind === 'lockpick' && <Lockpick onEnd={setScore} />}
            {kind === 'timing' && <Timing onEnd={setScore} />}
            <button className="link" onClick={onCancel}>← Back</button>
            <button className="link" onClick={() => onDone(0.5)}>Skip the game (average result)</button>
          </>
        ) : (
          <>
            <p className="mg-score">{score >= 0.8 ? 'Excellent' : score >= 0.5 ? 'Decent' : score > 0 ? 'Rough' : 'Disaster'} · {Math.round(score * 100)}%</p>
            <button className="age-up" onClick={() => onDone(score)}>See what happens</button>
          </>
        )}
      </section>
    </div>
  );
}

const LENGTH = 5;

function Memory({ onEnd }: { onEnd: (score: number) => void }) {
  const [seq] = useState(() => Array.from({ length: LENGTH }, () => Math.floor(Math.random() * 9)));
  const [lit, setLit] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    let i = 0;
    const timers: number[] = [];
    const step = () => {
      if (i >= seq.length) {
        setLit(null);
        setShowing(false);
        return;
      }
      setLit(seq[i]);
      timers.push(window.setTimeout(() => setLit(null), 450));
      i++;
      timers.push(window.setTimeout(step, 700));
    };
    timers.push(window.setTimeout(step, 600));
    return () => timers.forEach(clearTimeout);
  }, [seq]);

  function tap(n: number) {
    if (showing) return;
    if (n !== seq[pos]) return onEnd(pos / LENGTH);
    setLit(n);
    window.setTimeout(() => setLit(null), 150);
    if (pos + 1 === LENGTH) onEnd(1);
    else setPos(pos + 1);
  }

  return (
    <>
      <p className="mg-status" aria-live="polite">{showing ? 'Watch…' : `Your turn: ${pos} of ${LENGTH}`}</p>
      <div className="mg-grid">
        {Array.from({ length: 9 }, (_, n) => (
          <button key={n} className={`mg-cell${lit === n ? ' lit' : ''}`} onClick={() => tap(n)} disabled={showing} aria-label={`Square ${n + 1}`} />
        ))}
      </div>
    </>
  );
}

const PINS = 3;

function Lockpick({ onEnd }: { onEnd: (score: number) => void }) {
  const [pin, setPin] = useState(0);
  const [hits, setHits] = useState(0);
  const [zone, setZone] = useState(() => newZone(0));
  const [marker, setMarker] = useState(0);
  const pos = useRef(0);
  const dir = useRef(1);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = 55 + pin * 25; // percent per second
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      pos.current += dir.current * speed * dt;
      if (pos.current >= 100) { pos.current = 100; dir.current = -1; }
      if (pos.current <= 0) { pos.current = 0; dir.current = 1; }
      setMarker(pos.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pin]);

  function set() {
    const hit = pos.current >= zone.from && pos.current <= zone.from + zone.width;
    const total = hits + (hit ? 1 : 0);
    if (pin + 1 >= PINS) return onEnd(total / PINS);
    setHits(total);
    setPin(pin + 1);
    setZone(newZone(pin + 1));
  }

  return (
    <>
      <p className="mg-status">Pin {pin + 1} of {PINS} · {hits} set</p>
      <div className="mg-track" aria-hidden>
        <div className="mg-zone" style={{ left: `${zone.from}%`, width: `${zone.width}%` }} />
        <div className="mg-marker" style={{ left: `${marker}%` }} />
      </div>
      <button className="pill" onClick={set}>Set pin</button>
    </>
  );
}

function newZone(pin: number) {
  const width = 22 - pin * 5;
  return { from: 5 + Math.random() * (90 - width), width };
}

const ROUNDS = 3;

function Timing({ onEnd }: { onEnd: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'wait' | 'go' | 'result'>('wait');
  const [scores, setScores] = useState<number[]>([]);
  const [last, setLast] = useState('');
  const goAt = useRef(0);

  useEffect(() => {
    if (phase !== 'wait') return;
    const id = window.setTimeout(() => {
      goAt.current = performance.now();
      setPhase('go');
    }, 900 + Math.random() * 1800);
    return () => clearTimeout(id);
  }, [phase, round]);

  function tap() {
    let s = 0;
    if (phase === 'wait') {
      setLast('Too early. You eat a jab.');
    } else if (phase === 'go') {
      const ms = performance.now() - goAt.current;
      s = Math.max(0, Math.min(1, (800 - ms) / 500));
      setLast(`${Math.round(ms)} ms`);
    } else return;
    const next = [...scores, s];
    setScores(next);
    if (next.length >= ROUNDS) return onEnd(next.reduce((a, b) => a + b, 0) / ROUNDS);
    setPhase('result');
    window.setTimeout(() => { setRound(round + 1); setPhase('wait'); }, 900);
  }

  return (
    <>
      <p className="mg-status" aria-live="polite">Round {Math.min(round + 1, ROUNDS)} of {ROUNDS}{last ? ` · ${last}` : ''}</p>
      <button className={`mg-strike${phase === 'go' ? ' go' : ''}`} onPointerDown={tap} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } }}>
        {phase === 'go' ? 'STRIKE!' : phase === 'wait' ? 'Wait…' : '…'}
      </button>
    </>
  );
}
