import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createGame } from '../engine/creation';
import { ensureLife } from '../engine/life';
import { LifePanel } from './LifePanel';
import { PlayScreen } from './PlayScreen';

it('renders the financial ledger, old-save defaults and escaped names', () => {
  const s = createGame({ age: 30, seed: 44, powered: 'baseline' });
  ensureLife(s).savings = 1234;
  s.character.people = [{ id: 'heir', name: '<script>Child</script>', relation: 'child', alive: true, born: 2020, bond: 80, moments: 0 }];
  const html = renderToStaticMarkup(<LifePanel state={s} onChange={() => {}} />);
  expect(html).toContain('$1,234'); expect(html).toContain('Estate beneficiary');
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>Child');
  delete s.character.life;
  expect(renderToStaticMarkup(<LifePanel state={s} onChange={() => {}} />)).toContain('Credit score');
});

it('renders wellbeing on Home and offers legacy only after death', () => {
  const s = createGame({ age: 30, seed: 44, powered: 'baseline' });
  const render = () => renderToStaticMarkup(<PlayScreen state={s} onChange={() => {}} onNew={() => {}} />);
  expect(render()).toContain('Happiness'); expect(render()).toContain('Stress');
  s.character.people = [{ id: 'heir', name: 'Test Child', relation: 'child', alive: true, born: 2020, bond: 80, moments: 0 }];
  expect(render()).not.toContain('Continue as Test Child');
  s.character.alive = false; expect(render()).toContain('Continue as Test Child');
});
