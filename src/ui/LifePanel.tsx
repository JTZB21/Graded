import { bankLot, homePrice, lifeOf, netWorth } from '../engine/life';
import { heirsOf, setHeir } from '../engine/legacy';
import { ageOf } from '../engine/state';
import type { GameState } from '../engine/types';

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US')}`;
export function LifePanel({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const l = lifeOf(state);
  const heirs = heirsOf(state);
  // Loans, credit and home buying open at 18; a child's tab should not read like a mortgage offer.
  const adult = ageOf(state) >= 18;
  return <section className="card life-panel">
    <p className="eyebrow">Everyday life</p>
    <dl className="life-ledger">
      <div><dt>Happiness</dt><dd>{l.happiness}/100</dd></div>
      <div><dt>Stress</dt><dd>{l.stress}/100</dd></div>
      <div><dt>Savings</dt><dd>{money(l.savings)}</dd></div>
      <div><dt>Investments</dt><dd>{money(l.investments)}</dd></div>
      {(adult || l.debt > 0) && <div><dt>Personal debt</dt><dd>{money(l.debt)}</dd></div>}
      {adult && <div><dt>Credit score</dt><dd>{l.credit}</dd></div>}
      <div><dt>Net worth</dt><dd>{money(netWorth(state))}</dd></div>
    </dl>
    <p className="muted">Savings earn 2.5% annually. Investments can lose value.{adult && <> Loans accrue 12% annual interest, with monthly payments of 2% of the balance (minimum $25 in 2026 money).</>}</p>
    <p className="muted">Money actions transfer {money(bankLot(state))} at this year's prices. Find them in Act → Money; each button shows the actual cost.</p>
    <p className="eyebrow">Home</p>
    {l.home ? <p>{l.home.district} · value {money(l.home.value)} · mortgage {money(l.home.mortgage)} · payment {money(l.home.payment)}/month, plus upkeep. {l.home.district !== state.character.district && 'You live elsewhere and still pay for this home.'}</p>
      : !adult ? <p className="muted">{state.character.livesWithFamily ? 'You live with your family.' : 'You have no place of your own.'} You can buy a home from age 18.</p>
      : <p>Home in {state.character.district}: {money(homePrice(state))}, with {money(Math.round(homePrice(state) * 0.2))} down. Mortgage at 5% over 30 years. Upkeep is 1.5% of home value annually.</p>}
    <p className="eyebrow">Career and skills</p>
    <p>{l.career.retired ? `Retired · pension ${money(l.career.pension)}/year` : state.character.job ? `${state.character.job.title} · level ${l.career.jobId === state.character.job.id ? l.career.level : 1} · performance ${l.career.jobId === state.character.job.id ? l.career.performance : 50}/100 · ${l.career.jobId === state.character.job.id ? l.career.experience : 0} months' experience` : 'No current job'}</p>
    <p>Creative {l.skills.creative}/10 · Technical {l.skills.technical}/10 · Enterprise {l.skills.enterprise}/10</p>
    <p className="eyebrow">Business</p>
    <p>{l.business ? `Service business · level ${l.business.level}/5 · reputation ${l.business.reputation}/100 · last month's net ${money(l.business.profit)}` : 'Develop enterprise skill to level 2 to open a service business. Results and losses are applied monthly.'}</p>
    <p className="eyebrow">Will and legacy</p>
    <p className="muted">After death, continue as a living child. Assets are sold and debts settled. A named heir receives the estate; otherwise it is divided equally among living children. Powers are not transferred.</p>
    {heirs.length > 0 ? <label>Estate beneficiary <select aria-label="Estate beneficiary" value={l.will ?? ''} disabled={!state.character.alive || !!state.pending} onChange={e => onChange(setHeir(state, e.target.value || null))}>
      <option value="">Split equally among children</option>
      {heirs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label> : <p>No living children to inherit yet.</p>}
  </section>;
}
