import { useState } from 'react';
import { interactionsWith, knownPeople, personAge, RELATION_LABELS } from '../engine/people';
import type { GameState, Person } from '../engine/types';
import { Icon, type IconName } from './Icon';

const ICONS: Record<string, IconName> = {
  talk: 'chat', call: 'chat', gift: 'seed', dinner: 'glass', visit: 'home', 'give-money': 'money', 'ask-money': 'hand',
};

const bondWord = (b: number) => (b >= 85 ? 'Very close' : b >= 65 ? 'Close' : b >= 45 ? 'Friendly' : b >= 25 ? 'Distant' : 'Strained');
const ORDER = ['mother', 'father', 'guardian', 'sibling', 'friend'];
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export function PeopleTab({ state, friendAction, onMakeFriend, onInteract }: {
  state: GameState;
  /** The "Make a new friend" action, if it is on offer, and why it is greyed out. */
  friendAction?: { disabled?: string };
  onMakeFriend: () => void;
  onInteract: (personId: string, id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const people = knownPeople(state).sort((a, b) => Number(b.alive) - Number(a.alive) || ORDER.indexOf(a.relation) - ORDER.indexOf(b.relation));
  const selected = people.find((p) => p.id === open);

  return (
    <>
      <div className="page-head">
        <h2>Family and friends</h2>
        <p className="muted">Time together builds a bond. Leave people alone and it fades. Two visits per person each year.</p>
      </div>
      {friendAction && (
        <button className="pill page-note" disabled={!!friendAction.disabled} onClick={onMakeFriend} title={friendAction.disabled}>
          <Icon name="people" /> Make a new friend · 1 energy{friendAction.disabled ? ` · ${friendAction.disabled}` : ''}
        </button>
      )}
      <section className="card people-list">
        {people.length === 0 && <p className="muted">Nobody yet.</p>}
        {people.map((p) => (
          <button key={p.id} className={`person-row${p.alive ? '' : ' gone'}`} onClick={() => p.alive && setOpen(p.id)} disabled={!p.alive}>
            <span className="avatar small">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <span className="person-text">
              <strong>{p.name}</strong>
              <small>{RELATION_LABELS[p.relation]} · {p.alive ? `age ${personAge(state, p)}` : 'died'}</small>
              {p.alive && <span className="bar" aria-hidden><span style={{ width: `${p.bond}%`, background: 'var(--c-charm)' }} /></span>}
            </span>
            {p.alive && <span className="person-bond">{p.bond}<small>{bondWord(p.bond)}</small></span>}
          </button>
        ))}
      </section>
      {selected && <PersonSheet state={state} p={selected} onClose={() => setOpen(null)} onInteract={(id) => onInteract(selected.id, id)} />}
    </>
  );
}

function PersonSheet({ state, p, onClose, onInteract }: { state: GameState; p: Person; onClose: () => void; onInteract: (id: string) => void }) {
  const options = interactionsWith(state, p.id);
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label={p.name} onClick={onClose}>
      <section className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="profile-head">
          <div className="avatar">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
          <div className="who">
            <h2>{p.name}</h2>
            <p>{RELATION_LABELS[p.relation]} · age {personAge(state, p)}</p>
            {p.wealth !== undefined && <p className="muted">Household wealth: {money(p.wealth)} (2026)</p>}
          </div>
        </div>
        <div className="stat" style={{ marginTop: 14 }}>
          <div className="stat-label"><Icon name="health" /> Bond · {bondWord(p.bond)}</div>
          <div className="stat-value">{p.bond}/100</div>
          <div className="bar"><div style={{ width: `${p.bond}%`, background: 'var(--c-charm)' }} /></div>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Moments together: {p.moments}</p>
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
