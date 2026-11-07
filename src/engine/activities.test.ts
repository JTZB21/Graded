import { describe, expect, it } from 'vitest';
import { act, availableActions } from './actions';
import { createGame } from './creation';
import { currentCareer, ensureLife } from './life';
import { Rng } from './random';

describe('connected school, work and relationships', () => {
  it('raises grades and keeps the same classmate across later study groups', () => {
    const state = createGame({ age: 15, seed: 44, powered: 'baseline' });
    state.character.gpa = 2;
    const studied = act(state, 'study-group');
    const classmate = studied.character.people!.find(person => person.metAt?.kind === 'school')!;
    expect(studied.character.gpa).toBe(2.12);
    expect(classmate.moments).toBe(1);
    expect(availableActions(studied).find(action => action.id === 'study-group')?.disabled).toBeTruthy();
    expect(state.character.people?.some(person => person.metAt)).toBeFalsy();
    studied.turn = (studied.turn ?? 0) + 1;
    const again = act(studied, 'study-group');
    const contacts = again.character.people!.filter(person => person.metAt?.kind === 'school');
    expect(contacts.map(person => person.id)).toEqual([classmate.id]);
    expect(contacts[0].bond).toBeGreaterThan(classmate.bond);
  });

  it('keeps a job and career on a rejected application, then starts the chosen role on success', () => {
    const state = createGame({ age: 30, seed: 44, powered: 'baseline' });
    state.character.job = { id: 'warehouse', title: 'Warehouse worker', salary: 38000 };
    ensureLife(state).career = { jobId: 'warehouse', experience: 18, performance: 82, level: 2, retired: false, pension: 0 };
    state.character.charm = 5;
    const seeds = Array.from({ length: 32 }, (_, index) => index + 1);
    state.rngState = seeds.find(seed => new Rng(seed).next() > 0.6)!;
    const refused = act(state, 'apply-retail');
    expect(refused.character.job).toEqual(state.character.job);
    expect(currentCareer(refused)).toEqual(currentCareer(state));
    expect(availableActions(refused).find(action => action.id === 'apply-retail')?.disabled).toBeTruthy();
    state.rngState = seeds.find(seed => new Rng(seed).next() < 0.4)!;
    const hired = act(state, 'apply-retail');
    expect(hired.character.job?.id).toBe('retail');
    expect(currentCareer(hired)).toMatchObject({ jobId: 'retail', level: 1, experience: 0, performance: 50 });
    expect(availableActions(hired).some(action => action.id === 'apply-national-hero')).toBe(false);
  });

  it('coaching builds performance and adds a contact from the current job', () => {
    const state = createGame({ age: 30, seed: 44, powered: 'baseline' });
    state.character.job = { id: 'retail', title: 'Retail clerk', salary: 31000 };
    const coached = act(state, 'work-mentor');
    expect(currentCareer(coached).performance).toBe(62);
    expect(coached.character.people?.some(person => person.metAt?.kind === 'work' && person.metAt.key === 'retail')).toBe(true);
  });
});
