import { SchoolStatus, WorkStatus } from './ActivityStatus';
import { ThemeSettings } from './ThemeSettings';
import { netWorth } from '../engine/life';
import { LifePanel } from './LifePanel';
import { lifeOf } from '../engine/life';
import { continueAsHeir, heirsOf } from '../engine/legacy';
import { Icon, type IconName } from './Icon';
import { useMemo, useState } from 'react';
import { act, ACTION_GROUPS, availableActions, ENERGY, energyOf, MINIGAMES, type ActionGroup, type ActionView } from '../engine/actions';
import { interact } from '../engine/people';
import { anySlots, deleteSlot, exportCode, importCode, loadSlot, saveSlot, slotInfo, SLOTS, type Slot } from '../save';
import { MiniGame } from './MiniGames';
import { PeopleTab } from './PeopleTab';
import { choose } from '../engine/decisions';
import { CATEGORIES, RANK_INFO, strainBand } from '../engine/rules';
import { changes, formatDate, sheetRows } from '../engine/sheet';
import { COLLEGES, schoolName } from '../engine/school';
import { ageOf, notation, stageOf } from '../engine/state';
import { ageUp, availableFocuses, FOCUS_LABELS, monthsToBirthday } from '../engine/time';
import type { Focus, GameState, LogEntry } from '../engine/types';

type Tab = 'home' | 'act' | 'people' | 'log' | 'self' | 'more';
type Result = { lines: string[]; changes: string[]; personId?: string };
const FOCUS_SHORT: Record<Focus, string> = { school: 'School', work: 'Career', train: 'Training', crime: 'Crime', family: 'Family', rest: 'Recovery' };

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'act', label: 'Act', icon: 'bolt' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'log', label: 'Log', icon: 'log' },
  { id: 'self', label: 'Character', icon: 'id' },
  { id: 'more', label: 'Settings', icon: 'more' },
];

// Display only: which picture goes on which tile. The engine decides everything else.
const ACTION_ICONS: Record<string, IconName> = {
  gym: 'body', study: 'book', rest: 'rest', clinic: 'clinic', healer: 'spark', practice: 'target', push: 'bolt', 'show-off': 'camera',
  patrol: 'shield', 'odd-job': 'tools', 'job-hunt': 'briefcase', raise: 'trend', quit: 'door', family: 'home', 'night-out': 'glass',
  volunteer: 'people', 'make-friend': 'people', move: 'box', steal: 'hand', fight: 'fight', 'crew-job': 'mask', hustle: 'dice',
  club: 'star', 'skip-class': 'door', enroll: 'book', 'drop-out': 'door', 'part-time': 'briefcase', 'buy-car': 'pin', roam: 'pin', date: 'health',
};
const GROUP_META: Record<ActionGroup, { icon: IconName; dot: string }> = {
  'Body and mind': { icon: 'body', dot: 'var(--c-body)' },
  School: { icon: 'book', dot: 'var(--c-mind)' },
  Work: { icon: 'briefcase', dot: 'var(--c-money)' },
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
  const [playing, setPlaying] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const focuses = availableFocuses(state);
  const [chosen, setChosen] = useState<Focus>(focuses.includes('work') ? 'work' : focuses.includes('school') ? 'school' : focuses[0]);
  const focus = focuses.includes(chosen) ? chosen : focuses[0];
  const c = state.character;
  const actions = availableActions(state);
  const energy = energyOf(state);

  const resultOf = (next: GameState): Result => ({ lines: next.log.slice(state.log.length).map((e) => e.text), changes: changes(state, next) });

  function skip() {
    const r = ageUp(state, focus);
    onChange(r.state);
    setResult(null);
    if (r.stoppedBy === 'event' || r.stoppedBy === 'kindling') {
      setNotice(`Something came up ${r.monthsPassed} month${r.monthsPassed === 1 ? '' : 's'} in. Age up again to finish the year.`);
    } else setNotice(null);
    go('home');
  }

  function decide(optionId: string) {
    const next = choose(state, optionId);
    onChange(next);
    setResult(resultOf(next));
    setNotice(null);
  }

  function doAction(id: string, skill?: number) {
    if (skill === undefined && MINIGAMES[id]) {
      setPlaying(id);
      return;
    }
    setPlaying(null);
    const next = act(state, id, skill);
    onChange(next);
    setResult(resultOf(next));
    setNotice(null);
    if (tab === 'act') requestAnimationFrame(() => document.getElementById(next.pending ? 'pending-choice' : 'action-result')?.scrollIntoView({ block: 'start' }));
  }

  function doInteract(personId: string, id: string) {
    const next = interact(state, personId, id);
    onChange(next);
    setResult({ ...resultOf(next), personId });
    setNotice(null);
  }

  const monthsLeft = monthsToBirthday(state);

  function go(next: Tab, anchor?: string) {
    setTab(next);
    requestAnimationFrame(() => {
      if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      else window.scrollTo({ top: 0 });
    });
  }

  const decision = c.alive && state.pending && (
    <section className="card decision" id="pending-choice">
      <p className="eyebrow">Your call</p>
      {notice && <p className="muted">{notice}</p>}
      <p className="decision-text">{state.pending.text}</p>
      <div className="option-list">
        {state.pending.options.map((o) => <button key={o.id} className="pill" onClick={() => decide(o.id)}>{o.label}</button>)}
      </div>
    </section>
  );

  const resultCard = result && (result.lines.length > 0 || result.changes.length > 0) && (
    <section className="card result" id="action-result">
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
          <div className="home-heading"><p className="eyebrow">Your story, one year at a time</p><h1>Life in Port Harlan</h1></div>
          <ProfileCard state={state} energy={energy} />
          <section className="life-overview" aria-label="Life overview">
            <button onClick={() => go('self')}><span>Net worth</span><strong>{compactMoney(netWorth(state))}</strong><small>Accounts &amp; property ↗</small></button>
            <button onClick={() => go('people')}><span>Your circle</span><strong>{(c.people ?? []).filter(p => p.alive && p.born <= state.date.year).length} people</strong><small>Family &amp; relationships ↗</small></button>
          </section>
          {c.alive && !state.pending && <div className="home-shortcuts"><button className="pill" onClick={() => go('act')}>Explore activities <span aria-hidden="true">→</span></button><button className="link" onClick={() => go('self')}>View your life ledger</button></div>}
          {decision}
          {resultCard}
          {notice && !state.pending && <p className="warn page-note">{notice}</p>}
          {!c.alive && (
            <section className="card">
              <p className="warn">{c.name} has died. Continue the family story as a living child, or start a new life.</p>
              {heirsOf(state).map(p => <button className="pill" key={p.id} onClick={() => { onChange(continueAsHeir(state, p.id)); setResult(null); setNotice(null); }}>Continue as {p.name}</button>)}
              <button className="age-up" onClick={onNew}>Start a new life</button>
            </section>
          )}
          <LogCard entries={state.log.slice(-15).reverse()} title="Life log" onMore={() => go('log')} />
          {c.alive && !state.pending && (
            <div className="age-dock">
              <label className="dock-focus">
                <span className="sr-only">Focus for this year</span>
                <select value={focus} onChange={(e) => setChosen(e.target.value as Focus)} aria-label="Focus for this year">
                  {focuses.map((f) => <option key={f} value={f} title={FOCUS_LABELS[f]}>{FOCUS_SHORT[f]}</option>)}
                </select>
              </label>
              <button className="age-up" onClick={skip}>
                Age up +1 year{monthsLeft < 12 ? <small>{monthsLeft} mo to birthday</small> : null}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'act' && (
        <>
          {resultCard}
          <ActTab state={state} actions={actions} energy={energy} onAct={doAction} />
        </>
      )}

      {tab === 'people' && (
        <>
          {!result?.personId && resultCard}
          <PeopleTab
            state={state}
            socialActions={actions.filter(a => a.id === 'make-friend' || a.id === 'date')}
            onAct={doAction}
            result={result?.personId ? { personId: result.personId, lines: result.lines, changes: result.changes } : undefined}
            onInteract={doInteract}
          />
        </>
      )}
      {tab === 'log' && <LogTab log={state.log} />}
      {tab === 'self' && <><SelfTab state={state} /><LifePanel state={state} onChange={onChange} /></>}
      {tab === 'more' && <MoreTab state={state} onLoad={(g) => { onChange(g); setResult(null); setNotice(null); go('home'); }} onNew={onNew} />}
      {playing && MINIGAMES[playing] && (
        <MiniGame kind={MINIGAMES[playing]} onDone={(score) => doAction(playing, score)} onCancel={() => setPlaying(null)} />
      )}

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
  const age = ageOf(state);
  const school = c.college
    ? `${COLLEGES[c.college.kind].name}${c.gpa !== undefined ? ` · GPA ${c.gpa.toFixed(1)}` : ''}`
    : c.school && age >= 6 && age < 18 && c.education === 'none'
      ? `${schoolName(c, age)}${c.gpa !== undefined ? ` · GPA ${c.gpa.toFixed(1)}` : ''}`
      : null;

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
        {school && <span className="badge"><Icon name="book" /> {school}</span>}
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
      <div className="stat-grid attributes wellbeing">
        <Stat icon="health" label="Happiness" value={lifeOf(state).happiness} bar={lifeOf(state).happiness} color="var(--c-health)" />
        <Stat icon="warning" label="Stress" value={lifeOf(state).stress} bar={lifeOf(state).stress} color="var(--c-infamy)" hint="Sustained stress of 85 or more damages health. Take time for yourself in Act." />
      </div>
      <p className="muted">Accounts, skills, property and your will: Character → Everyday life.</p>
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

function ActTab({ state, actions, energy, onAct }: { state: GameState; actions: ActionView[]; energy: number; onAct: (id: string) => void }) {
  if (!state.character.alive) return <section className="card"><p className="muted">Nothing left to do in this life.</p></section>;
  if (state.pending) return <section className="card"><p className="muted">Answer the choice above first.</p></section>;
  return (
    <>
      <div className="page-head">
        <h2>This year</h2>
        <p className="muted">Activities cost energy; account transfers are free. Energy refills when you age up. Actions marked with a game let you play for better odds.</p>
      </div>
      {energy === 0 && actions.length > 0 && <p className="warn page-note">You are out of energy for activities this year. Account transfers remain available. Age up from Home to refill.</p>}
      <div className="activity-index" aria-label="Activity categories">{ACTION_GROUPS.filter(g => actions.some(a => a.group === g)).map(g => <a href={`#group-${g.replaceAll(' ', '-')}`} key={g}>{g}</a>)}</div>
      {ACTION_GROUPS.map((g) => {
        const list = actions.filter((a) => a.group === g);
        const openings = g === 'Work' ? list.filter(a => a.id.startsWith('apply-')) : [];
        const tiles = g === 'Work' ? list.filter(a => !a.id.startsWith('apply-') && (openings.length === 0 || a.id !== 'job-hunt')) : list;
        if (!list.length) return null;
        return (
          <section key={g} id={`group-${g.replaceAll(' ', '-')}`} className="tile-section">
            <h3 className="section-title"><i style={{ background: GROUP_META[g].dot }} />{g}</h3>
            {g === 'School' && <SchoolStatus state={state} />}
            {g === 'Work' && <WorkStatus state={state} openings={openings} onApply={onAct} />}
            <div className="tile-grid">
              {tiles.map((a) => (
                <button key={a.id} className="tile" disabled={!!a.disabled} title={a.disabled} onClick={() => onAct(a.id)}>
                  <span className="tile-icon" aria-hidden><Icon name={ACTION_ICONS[a.id] ?? GROUP_META[g].icon} /></span>
                  <span className="tile-label">{a.label}</span>
                  <small>{a.cost} energy{a.price ? ` · ${compactMoney(a.price)}` : ''}{MINIGAMES[a.id] ? ' · game' : ''}</small>
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

function MoreTab({ state, onLoad, onNew }: { state: GameState; onLoad: (g: GameState) => void; onNew: () => void }) {
  const [, refresh] = useState(0);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  function save(n: Slot) {
    if (slotInfo(n) && !confirm(`Overwrite slot ${n}?`)) return;
    setMsg(saveSlot(n, state) ? `Saved to slot ${n}.` : 'Could not save. Storage may be full or blocked.');
    refresh((x) => x + 1);
  }
  function load(n: Slot) {
    const g = loadSlot(n);
    if (!g) return setMsg('That save could not be read.');
    if (confirm(`Load slot ${n}? Unsaved progress in this life is lost.`)) onLoad(g);
  }
  function remove(n: Slot) {
    if (!confirm(`Delete slot ${n}?`)) return;
    deleteSlot(n);
    refresh((x) => x + 1);
  }
  async function copy() {
    const text = exportCode(state);
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Save code copied. Paste it into a note to keep it safe.');
    } catch {
      setCode(text);
      setMsg('Copy failed, so the code is in the box below. Select it and copy it by hand.');
    }
  }
  function paste() {
    const g = importCode(code);
    if (!g) return setMsg('That is not a GRADED save code.');
    if (confirm(`Load ${g.character.name}? Unsaved progress in this life is lost.`)) onLoad(g);
  }

  return (
    <>
      <div className="page-head">
        <h2>Settings &amp; saves</h2>
        <p className="muted">Saves and this life. The game also saves itself after every move.</p>
        <p className="build-tag">{__BUILD__}</p>
      </div>
      <ThemeSettings />
      <section className="card">
        <h3>Save slots</h3>
        <p className="hint">Saves stay on this device.</p>
        <div className="slot-list">
          {SLOTS.map((n) => {
            const info = slotInfo(n);
            return (
              <div key={n} className="slot">
                <div>
                  <strong>Slot {n}</strong>
                  <p className="muted">{info ? `${info.summary} · saved ${new Date(info.savedAt).toLocaleString()}` : 'Empty'}</p>
                </div>
                <div className="slot-buttons">
                  <button className="pill small" onClick={() => save(n)}>Save</button>
                  {info && <button className="pill small" onClick={() => load(n)}>Load</button>}
                  {info && <button className="pill small" onClick={() => remove(n)} aria-label={`Delete slot ${n}`}>Delete</button>}
                </div>
              </div>
            );
          })}
        </div>
        {msg && <p className="warn" role="status">{msg}</p>}
      </section>
      <section className="card">
        <h3>Back up or move a save</h3>
        <p className="hint">Copy a save code to keep it somewhere safe, or paste one to load it (for example, from your PC to your phone).</p>
        <button className="pill" onClick={copy}><Icon name="log" /> Copy save code</button>
        <label className="field" style={{ marginTop: 12 }}>
          <span>Paste a save code</span>
          <textarea className="code-box" value={code} onChange={(e) => setCode(e.target.value)} rows={3} placeholder="GRADED1:..." />
        </label>
        <button className="pill" onClick={paste} disabled={!code.trim()} style={{ marginTop: 8 }}>Load from code</button>
      </section>
      <section className="card">
        <h3>Start a new life</h3>
        <p className="hint">Starting over replaces your current character. Save to a slot first to keep them{anySlots() ? '' : ' (you have no saves yet)'}.</p>
        <button className="pill" onClick={() => { if (confirm('Start a new life? Unsaved progress in this one is lost.')) onNew(); }}>
          <Icon name="seed" /> New life
        </button>
      </section>
    </>
  );
}
