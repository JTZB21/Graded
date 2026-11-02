import { useMemo, useState } from 'react';
import { choose } from '../engine/decisions';
import { formatDate, sheetRows, statusPanel } from '../engine/sheet';
import { advance, availableFocuses, FOCUS_LABELS } from '../engine/time';
import type { Focus, GameState, LogEntry } from '../engine/types';

const SKIPS: [string, number][] = [['1 month', 1], ['6 months', 6], ['1 year', 12], ['5 years', 60]];

export function PlayScreen({ state, onChange, onNew }: { state: GameState; onChange: (s: GameState) => void; onNew: () => void }) {
  const focuses = availableFocuses(state);
  const [chosen, setChosen] = useState<Focus>(focuses.includes('work') ? 'work' : focuses.includes('school') ? 'school' : focuses[0]);
  const focus = focuses.includes(chosen) ? chosen : focuses[0];
  const [notice, setNotice] = useState<string | null>(null);
  const c = state.character;

  function skip(months: number) {
    const r = advance(state, months, focus);
    onChange(r.state);
    if (r.stoppedBy === 'event' || r.stoppedBy === 'kindling') {
      setNotice(`The skip stopped after ${r.monthsPassed} month${r.monthsPassed === 1 ? '' : 's'}.`);
    } else setNotice(null);
  }

  function decide(optionId: string) {
    onChange(choose(state, optionId));
    setNotice(null);
  }

  // Newest year first; within a year, oldest first.
  const years = useMemo(() => {
    const groups = new Map<number, LogEntry[]>();
    for (const e of state.log) groups.set(e.date.year, [...(groups.get(e.date.year) ?? []), e]);
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [state.log]);

  return (
    <div className="play">
      <section className="panel">
        <pre className="status">{statusPanel(state)}</pre>
        <dl className="sheet">
          {sheetRows(state).map((r) => (
            <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
      </section>

      <section className="panel">
        {c.alive && state.pending ? (
          <div className="decision">
            {notice && <p className="muted">{notice}</p>}
            <p>{state.pending.text}</p>
            <div className="actions">
              {state.pending.options.map((o) => <button key={o.id} onClick={() => decide(o.id)}>{o.label}</button>)}
            </div>
          </div>
        ) : c.alive ? (
          <>
            <label className="focus">
              Focus
              <select value={focus} onChange={(e) => setChosen(e.target.value as Focus)}>
                {focuses.map((f) => <option key={f} value={f}>{FOCUS_LABELS[f]}</option>)}
              </select>
            </label>
            <div className="actions">
              {SKIPS.map(([label, m]) => <button key={label} onClick={() => skip(m)}>Skip {label}</button>)}
            </div>
            {notice && <p className="warn">{notice}</p>}
          </>
        ) : (
          <p className="warn">{c.name} has died. Legacy play (continuing as a child or heir) arrives with saves.</p>
        )}
        <button className="secondary" onClick={onNew}>New life</button>
      </section>

      <section className="panel log">
        <h2>Life log</h2>
        {years.map(([year, entries]) => (
          <div key={year}>
            <h3>{year}</h3>
            <ul>
              {entries.map((e, i) => (
                <li key={i} className={`log-${e.kind}`}><span className="when">{formatDate(e.date)}</span> {e.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
