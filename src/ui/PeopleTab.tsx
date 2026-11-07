import { useEffect, useState } from 'react';
import { interactionsWith, isFamily, isLover, knownPeople, personAge, RELATION_LABELS } from '../engine/people';
import type { ActionView } from '../engine/actions';
import type { GameState, Person } from '../engine/types';
import { Icon, type IconName } from './Icon';

const ICONS: Record<string, IconName> = {
  talk: 'chat', call: 'chat', gift: 'seed', dinner: 'glass', visit: 'home', 'give-money': 'money', 'ask-money': 'hand',
  chores: 'tools', date: 'glass', 'move-in': 'home', propose: 'star', 'try-child': 'seed', play: 'star', mentor: 'book',
  'break-up': 'door', reconcile: 'chat', confront: 'fight', 'make-peace': 'hand',
};

const bondWord = (p: Person) => {
  if (p.estranged) return 'Not speaking';
  const b = p.bond;
  if (p.relation === 'rival') return b >= 50 ? 'Grudging respect' : b >= 25 ? 'Bad blood' : 'Enemies';
  return b >= 85 ? 'Very close' : b >= 65 ? 'Close' : b >= 45 ? 'Friendly' : b >= 25 ? 'Distant' : 'Strained';
};
const ORDER = ['spouse', 'partner', 'child', 'mother', 'father', 'guardian', 'sibling', 'friend', 'protege', 'rival'];
const tags = (p: Person) => [p.livesWithYou ? 'lives with you' : '', p.graded ? 'Graded' : ''].filter(Boolean).map((t) => ` · ${t}`).join('');
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const FILTERS = ['All', 'Family', 'Friends', 'School', 'Work', 'Memorial'] as const;
type Filter = typeof FILTERS[number];
type Outcome = { personId: string; lines: string[]; changes: string[] };

function matches(p: Person, filter: Filter) {
  if (filter === 'Memorial') return !p.alive;
  if (!p.alive) return false;
  if (filter === 'Family') return isFamily(p) || isLover(p);
  if (filter === 'Friends') return !isFamily(p) && !isLover(p);
  if (filter === 'School') return p.metAt?.kind === 'school';
  if (filter === 'Work') return p.metAt?.kind === 'work';
  return true;
}

export function PeopleTab({ state, socialActions, onAct, onInteract, result }: {
  state: GameState;
  socialActions: ActionView[];
  onAct: (id: string) => void;
  onInteract: (personId: string, id: string) => void;
  result?: Outcome;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const people = knownPeople(state).sort((a, b) => ORDER.indexOf(a.relation) - ORDER.indexOf(b.relation));
  const visible = people.filter(p => matches(p, filter));
  const selected = people.find(p => p.id === open && p.alive);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <>
      <div className="page-head">
        <h2>People</h2>
        <p className="muted">Open a person to see your bond and spend time together. You can interact twice per person per turn.</p>
      </div>
      {socialActions.length > 0 && <div className="people-actions">
        {socialActions.map(action => (
          <button key={action.id} className="pill" disabled={!!action.disabled} onClick={() => { setFilter('All'); onAct(action.id); }}>
            {action.label} · {action.cost} energy{action.price ? ` · ${money(action.price)}` : ''}
            {action.disabled && <small> · {action.disabled}</small>}
          </button>
        ))}
      </div>}
      <div className="filter-row" role="group" aria-label="Relationship filters">
        {FILTERS.map(value => (
          <button key={value} className={`pill small${filter === value ? ' active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>
        ))}
      </div>
      <section className="card people-list">
        {visible.length === 0 && <p className="people-empty muted">{filter === 'School' ? 'Study with a classmate from Act → School to meet someone.' : filter === 'Work' ? 'Ask a coworker for coaching from Act → Work to meet someone.' : 'Nobody in this group yet.'}</p>}
        {visible.map((p) => (
          <button key={p.id} className={`person-row${p.alive ? '' : ' gone'}`} onClick={() => p.alive && setOpen(p.id)} disabled={!p.alive}>
            <span className="avatar small">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <span className="person-text">
              <strong>{p.name}</strong>
              <small>{RELATION_LABELS[p.relation]} · {p.alive ? `age ${personAge(state, p)}` : 'died'}{p.alive ? tags(p) : ''}{p.metAt ? ` · ${p.metAt.kind === 'school' ? 'Classmate' : 'Coworker'}` : ''}</small>
              {p.alive && <span className="bar" aria-hidden><span style={{ width: `${p.bond}%`, background: 'var(--c-charm)' }} /></span>}
            </span>
            {p.alive && <span className="person-bond">{p.bond}<small>{bondWord(p)}</small></span>}
          </button>
        ))}
      </section>
      {selected && <PersonSheet result={result?.personId === selected.id ? result : undefined} state={state} p={selected} onClose={() => setOpen(null)} onInteract={(id) => onInteract(selected.id, id)} />}
    </>
  );
}

function PersonSheet({ state, p, onClose, onInteract, result }: { state: GameState; p: Person; onClose: () => void; onInteract: (id: string) => void; result?: Outcome }) {
  const options = interactionsWith(state, p.id);
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label={p.name} onClick={onClose}>
      <section className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <div className="avatar">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
          <div className="who">
            <h2>{p.name}</h2>
            <p>{RELATION_LABELS[p.relation]} · age {personAge(state, p)}{tags(p)}</p>
            {p.metAt && <p className="muted">Met through {p.metAt.label}</p>}
            {p.wealth !== undefined && <p className="muted">Household wealth: {money(p.wealth)} (2026)</p>}
          </div>
        </div>
        <div className="stat" style={{ marginTop: 14 }}>
          <div className="stat-label"><Icon name="health" /> Bond · {bondWord(p)}</div>
          <div className="stat-value">{p.bond}/100</div>
          <div className="bar"><div style={{ width: `${p.bond}%`, background: 'var(--c-charm)' }} /></div>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Moments together: {p.moments}</p>
        {result && <div className="card result person-result" role="status">
          {result.lines.map((line, index) => <p key={index}>{line}</p>)}
          {result.changes.length > 0 && <small>{result.changes.join(' · ')}</small>}
        </div>}
        <div className="option-list" style={{ marginTop: 12 }}>
          {options.map((o) => (
            <button key={o.id} className="pill" disabled={!!o.disabled} onClick={() => onInteract(o.id)} title={o.disabled}>
              <Icon name={ICONS[o.id] ?? 'chat'} /> {o.label}{o.price ? ` · ${money(o.price)}` : ''}
              {o.disabled && <small className="why"> · {o.disabled}</small>}
            </button>
          ))}
          {options.length === 0 && <p className="muted">Nothing to do with them right now.</p>}
        </div>
        <button className="link" onClick={onClose}>← Close</button>
      </section>
    </div>
  );
}
