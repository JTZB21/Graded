import { Icon, type IconName } from './Icon';
import { useMemo, useState } from 'react';
import { act, ACTION_GROUPS, availableActions, ENERGY, energyOf, type ActionGroup, type ActionView } from '../engine/actions';
import { choose } from '../engine/decisions';
import { CATEGORIES, RANK_INFO, strainBand } from '../engine/rules';
import { changes, formatDate, sheetRows } from '../engine/sheet';
import { ageOf, notation, stageOf } from '../engine/state';
import { advance, availableFocuses, FOCUS_LABELS } from '../engine/time';
import type { Focus, GameState, LogEntry } from '../engine/types';

type Tab = 'home' | 'act' | 'log' | 'self' | 'more';
type Result = { lines: string[]; changes: string[] };

const SKIPS: [string, number][] = [['6 months', 6], ['1 year', 12], ['5 years', 60]];

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'act', label: 'Act', icon: 'bolt' },
  { id: 'log', label: 'Log', icon: 'log' },
  { id: 'self', label: 'Character', icon: 'id' },
  { id: 'more', label: 'More', icon: 'more' },
];

// Display only: which picture goes on which tile. The engine decides everything else.
const ACTION_ICONS: Record<string, IconName> = {
  gym: 'body', study: 'book', rest: 'rest', clinic: 'clinic', healer: 'spark', practice: 'target', push: 'bolt', 'show-off': 'camera',
  patrol: 'shield', 'odd-job': 'tools', 'job-hunt': 'briefcase', raise: 'trend', quit: 'door', family: 'home', 'night-out': 'glass',
  volunteer: 'people', move: 'box', steal: 'hand', fight: 'fight', 'crew-job': 'mask', hustle: 'dice',
};
const GROUP_META: Record<ActionGroup, { icon: IconName; dot: string }> = {
  'Body and mind': { icon: 'body', dot: 'var(--c-body)' },
  Powers: { icon: 'bolt', dot: 'var(--c-mind)' },
  Money: { icon: 'money', dot: 'var(--c-money)' },
  'People and places': { icon: 'people', dot: 'var(--c-charm)' },
  Underworld: { icon: 'mask', dot: 'var(--c-infamy)' },
  Inside: { icon: 'lock', dot: 'var(--c-cred)' },
};
const KIND_LABELS: Record<LogEntry['kind'], string> = {
  life: 'Life', power: 'Powers', money: 'Money', law: 'Law', world: 'World', event: 'Events', death: 'Death',
};

const compactMoney = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e4 ? `${Math.round(a / 1e3)}K` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K` : a.toLocaleString('en-US');
  return `${n < 0 ? '-' : ''}$${s}`;
};
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function PlayScreen({ state, onChange, onNew }: { state: GameState; onChange: (s: GameState) => void; onNew: () => void }) {
  const [tab, setTab] = useState<Tab>('home');
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const focuses = availableFocuses(state);
  const [chosen, setChosen] = useState<Focus>(focuses.includes('work') ? 'work' : focuses.includes('school') ? 'school' : focuses[0]);
  const focus = focuses.includes(chosen) ? chosen : focuses[0];
  const c = state.character;
  const actions = availableActions(state);
  const energy = energyOf(state);

  const resultOf = (next: GameState): Result => ({ lines: next.log.slice(state.log.length).map((e) => e.text), changes: changes(state, next) });

  function skip(months: number) {
    const r = advance(state, months, focus);
    onChange(r.state);
    setResult(null);
    if (r.stoppedBy === 'event' || r.stoppedBy === 'kindling') {
      setNotice(`The skip stopped after ${r.monthsPassed} month${r.monthsPassed === 1 ? '' : 's'}.`);
    } else setNotice(null);
    setTab('home');
  }

  function decide(optionId: string) {
    const next = choose(state, optionId);
    onChange(next);
    setResult(resultOf(next));
    setNotice(null);
  }

  function doAction(id: string) {
    const next = act(state, id);
    onChange(next);
    setResult(resultOf(next));
    setNotice(null);
  }

  function go(next: Tab, anchor?: string) {
    setTab(next);
    requestAnimationFrame(() => {
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      else window.scrollTo({ top: 0 });
    });
  }

  const decision = c.alive && state.pending && (
    <section className="card decision">
      <p className="eyebrow">Your call</p>
      {notice && <p className="muted">{notice}</p>}
      <p className="decision-text">{state.pending.text}</p>
      <div className="option-list">
        {state.pending.options.map((o) => <button key={o.id} className="pill" onClick={() => decide(o.id)}>{o.label}</button>)}
      </div>
    </section>
  );

  const resultCard = result && (result.lines.length > 0 || result.changes.length > 0) && (
    <section className="card result">
      {result.lines.map((l, i) => <p key={i}>{l}</p>)}
      {result.changes.length > 0 && (
        <div className="change-chips">{result.changes.map((ch) => <span key={ch} className="change">{ch}</span>)}</div>
      )}
    </section>
  );

  return (
    <div className="play">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{result ? [...result.lines, ...result.changes].join('. ') : notice ?? ''}</div>
      {tab !== 'home' && <TopBar state={state} energy={energy} />}
      {tab !== 'home' && decision}

      {tab === 'home' && (
        <>
          <ProfileCard state={state} energy={energy} />
          {decision}
          {resultCard}
          {c.alive && !state.pending && (
            <section className="card time">
              <label className="field">
                <span>Focus</span>
                <select value={focus} onChange={(e) => setChosen(e.target.value as Focus)}>
                  {focuses.map((f) => <option key={f} value={f}>{FOCUS_LABELS[f]}</option>)}
                </select>
              </label>
              <button className="age-up" onClick={() => skip(1)}>Next month <span aria-hidden>»</span></button>
              <div className="skip-row">
                {SKIPS.map(([label, m]) => <button key={label} className="pill small" onClick={() => skip(m)}>{label}</button>)}
              </div>
              {notice && <p className="warn">{notice}</p>}
              {actions.length > 0 && (
                <button className="link" onClick={() => go('act')}>
                  {energy > 0 ? `${energy} energy left this month · see what you can do ›` : 'Out of energy this month'}
                </button>
              )}
            </section>
          )}
          {!c.alive && (
            <section className="card">
              <p className="warn">{c.name} has died. Legacy play (continuing as a child or heir) arrives with saves.</p>
              <button className="age-up" onClick={onNew}>Start a new life</button>
            </section>
          )}
          <LogCard entries={state.log.slice(-6).reverse()} title="Latest" onMore={() => go('log')} />
        </>
      )}

      {tab === 'act' && (
        <>
          {resultCard}
          <ActTab actions={actions} energy={energy} alive={c.alive} pending={!!state.pending} onAct={doAction} />
        </>
      )}

      {tab === 'log' && <LogTab log={state.log} />}
      {tab === 'self' && <SelfTab state={state} />}
      {tab === 'more' && <MoreTab onNew={onNew} />}

      <nav className="bottom-nav" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <span className="nav-icon" aria-hidden><Icon name={t.icon} /></span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Energy({ energy }: { energy: number }) {
  return (
    <span className="energy" role="img" aria-label={`${energy} of ${ENERGY} energy remaining. Refills when time moves.`} title="Energy refills when time moves">
      {Array.from({ length: Math.max(ENERGY, energy) }, (_, i) => <i key={i} className={i < energy ? 'on' : ''} />)}
    </span>
  );
}

function TopBar({ state, energy }: { state: GameState; energy: number }) {
  const c = state.character;
  return (
    <header className="topbar">
      <div className="avatar small">{initials(c.name)}</div>
      <div className="topbar-text">
        <strong>{c.name}</strong>
        <span>Age {ageOf(state)} · {formatDate(state.date)}</span>
      </div>
      {c.alive && <Energy energy={energy} />}
    </header>
  );
}

function ProfileCard({ state, energy }: { state: GameState; energy: number }) {
  const c = state.character;
  const legal = c.inPrisonUntil ? `Prison until ${formatDate(c.inPrisonUntil)}` : c.record.length ? `${c.record.length} conviction${c.record.length > 1 ? 's' : ''}` : 'Clean record';
  const power = c.graded ? `${notation(c)}${c.powersGone ? ' · gone dark' : ''}` : c.kindleAge !== null ? 'Baseline · marker+' : 'Baseline';
  const band = strainBand(c.strain);

  return (
    <section className="card profile">
      <div className="profile-head">
        <div className={`avatar${c.graded ? ' graded' : ''}`}>{initials(c.name)}</div>
        <div className="who">
          <h2>{c.name}</h2>
          <p>{formatDate(state.date)} · {c.district}</p>
          <p className="muted">{stageOf(state)}{c.alive ? '' : ' · deceased'}</p>
        </div>
        <div className="age">
          <span className="age-num">{ageOf(state)}</span>
          <span className="age-label">age</span>
        </div>
      </div>
      <div className="badge-row">
        <span className={`badge${c.graded ? ' power' : ''}`}><Icon name="bolt" /> {power}</span>
        {c.job && <span className="badge"><Icon name="briefcase" /> {c.job.title}</span>}
        {c.alive && <Energy energy={energy} />}
      </div>

      <p className="eyebrow">Vitals</p>
      <div className="stat-grid vitals">
        <Stat icon="health" label="Health" value={c.health} bar={c.health} color="var(--c-health)" />
        <Stat icon="strain" label="Strain" value={`${c.strain}%`} bar={c.strain} color={band === 'fine' ? 'var(--c-money)' : 'var(--c-infamy)'} hint={band} />
        <Stat icon="money" label="Money" value={compactMoney(c.money)} color="var(--c-money)" />
      </div>
      <p className="eyebrow">Attributes</p>
      <div className="stat-grid attributes">
        <Stat icon="body" label="Body" value={c.body} bar={c.body * 10} color="var(--c-body)" />
        <Stat icon="mind" label="Mind" value={c.mind} bar={c.mind * 10} color="var(--c-mind)" />
        <Stat icon="chat" label="Charm" value={c.charm} bar={c.charm * 10} color="var(--c-charm)" />
        <Stat icon="shield" label="Nerve" value={c.nerve} bar={c.nerve * 10} color="var(--c-nerve)" />
      </div>
      <p className="eyebrow">Reputation</p>
      <div className="stat-grid reputation">
        <Stat icon="star" label="Fame" value={signed(c.fame)} bar={c.fame} bipolar color="var(--c-fame)" />
        <Stat icon="warning" label="Infamy" value={signed(c.infamy)} bar={c.infamy} bipolar color="var(--c-infamy)" />
        <Stat icon="mask" label="Cred" value={signed(c.streetCred)} bar={c.streetCred} bipolar color="var(--c-cred)" />
      </div>

      <div className="chip-row">
        <span className="chip"><i style={{ background: 'var(--c-mind)' }} /><Icon name="pin" /> {c.district}</span>
        <span className="chip"><i style={{ background: 'var(--c-fame)' }} /><Icon name="id" /> {c.license === 'none' ? 'No license' : `${c.license} License`}</span>
        <span className="chip"><i style={{ background: c.inPrisonUntil || c.record.length ? 'var(--c-infamy)' : 'var(--c-health)' }} /><Icon name="scales" /> {legal}</span>
        {(c.ties ?? []).map((t) => <span key={t} className="chip"><i style={{ background: 'var(--c-charm)' }} /><Icon name="people" /> {t}</span>)}
      </div>
    </section>
  );
}

function Stat({ icon, label, value, bar, color, hint, bipolar = false }: { icon: IconName; label: string; value: string | number; bar?: number; color: string; hint?: string; bipolar?: boolean }) {
  return (
    <div className="stat" title={hint ? `${label}: ${hint}` : label}>
      <div className="stat-label"><span aria-hidden><Icon name={icon} /></span>{label}</div>
      <div className="stat-value">{value}</div>
      {bar !== undefined && <div className={bipolar ? 'bar bipolar' : 'bar'} aria-hidden="true"><div style={{ width: `${bipolar ? Math.min(100, Math.abs(bar)) / 2 : Math.max(0, Math.min(100, bar))}%`, left: bipolar ? `${bar < 0 ? 50 - Math.min(100, Math.abs(bar)) / 2 : 50}%` : undefined, background: color }} /></div>}
      {bipolar && <span className="meter-caption">−100 · 0 · +100</span>}
    </div>
  );
}

function LogCard({ entries, title, onMore }: { entries: LogEntry[]; title: string; onMore: () => void }) {
  if (!entries.length) return null;
  return (
    <section className="card">
      <div className="card-head">
        <p className="eyebrow">{title}</p>
        <button className="link" onClick={onMore}>Full log ›</button>
      </div>
      <ul className="log">
        {entries.map((e, i) => <LogItem key={i} e={e} />)}
      </ul>
    </section>
  );
}

function LogItem({ e }: { e: LogEntry }) {
  return (
    <li className={`log-item log-${e.kind}`}>
      <span className="when">{formatDate(e.date)}</span>
      <p>{e.text}</p>
    </li>
  );
}

function ActTab({ actions, energy, alive, pending, onAct }: { actions: ActionView[]; energy: number; alive: boolean; pending: boolean; onAct: (id: string) => void }) {
  if (!alive) return <section className="card"><p className="muted">Nothing left to do in this life.</p></section>;
  if (pending) return <section className="card"><p className="muted">Answer the choice above first.</p></section>;
  return (
    <>
      <div className="page-head">
        <h2>This month</h2>
        <p className="muted">Each action costs energy. Energy refills when time moves.</p>
      </div>
      {energy === 0 && actions.length > 0 && <p className="warn page-note">You are out of energy for this month. Skip ahead from Home to keep going.</p>}
      {ACTION_GROUPS.map((g) => {
        const list = actions.filter((a) => a.group === g);
        if (!list.length) return null;
        return (
          <section key={g} id={`group-${g}`} className="tile-section">
            <h3 className="section-title"><i style={{ background: GROUP_META[g].dot }} />{g}</h3>
            <div className="tile-grid">
              {list.map((a) => (
                <button key={a.id} className="tile" disabled={!!a.disabled} title={a.disabled} onClick={() => onAct(a.id)}>
                  <span className="tile-icon" aria-hidden><Icon name={ACTION_ICONS[a.id] ?? GROUP_META[g].icon} /></span>
                  <span className="tile-label">{a.label}</span>
                  <small>{a.cost} energy{a.price ? ` · ${compactMoney(a.price)}` : ''}</small>
                  {a.disabled && <small className="why">{a.disabled}</small>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {actions.length === 0 && <section className="card"><p className="muted">Nothing to do right now.</p></section>}
    </>
  );
}

function LogTab({ log }: { log: LogEntry[] }) {
  const [filter, setFilter] = useState<LogEntry['kind'] | 'all'>('all');
  const kinds = useMemo(() => (Object.keys(KIND_LABELS) as LogEntry['kind'][]).filter((k) => log.some((e) => e.kind === k)), [log]);
  // Newest year first; within a year, oldest first.
  const years = useMemo(() => {
    const groups = new Map<number, LogEntry[]>();
    for (const e of log) if (filter === 'all' || e.kind === filter) groups.set(e.date.year, [...(groups.get(e.date.year) ?? []), e]);
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [log, filter]);

  return (
    <>
      <div className="page-head"><h2>Life log</h2></div>
      <div className="filter-row">
        <button className={`pill small${filter === 'all' ? ' active' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        {kinds.map((k) => <button key={k} className={`pill small${filter === k ? ' active' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>{KIND_LABELS[k]}</button>)}
      </div>
      <section className="card">
        {years.map(([year, entries]) => (
          <div key={year}>
            <h3 className="year">{year}</h3>
            <ul className="log">{entries.map((e, i) => <LogItem key={i} e={e} />)}</ul>
          </div>
        ))}
      </section>
    </>
  );
}

function SelfTab({ state }: { state: GameState }) {
  const c = state.character;
  return (
    <>
      <div className="page-head"><h2>Character</h2></div>
      <section className="card">
        <dl className="sheet">
          {sheetRows(state).map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
        </dl>
      </section>
      {c.graded && c.powers.length > 0 && (
        <section className="card">
          <p className="eyebrow">Powers</p>
          {c.powers.map((p, i) => (
            <div key={i} className="power-row">
              <span className="rank">{p.rank}</span>
              <div>
                <strong>{RANK_INFO[p.rank].name} · {CATEGORIES[p.category]}</strong>
                {p.description && <p className="muted">{p.description}</p>}
                <p className="muted">Grade {c.grade ?? 'I'}{c.powersGone ? ' · gone dark' : ''}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function MoreTab({ onNew }: { onNew: () => void }) {
  return (
    <>
      <div className="page-head">
        <h2>More</h2>
        <p className="muted">Manage this life.</p>
      </div>
      <section className="card">
        <h3>Start a new life</h3>
        <p className="hint">Starting over replaces your current character and their history.</p>
        <button className="pill" onClick={() => { if (confirm('Start a new life? This one will be lost.')) onNew(); }}>
          <Icon name="seed" /> New life
        </button>
      </section>
    </>
  );
}
