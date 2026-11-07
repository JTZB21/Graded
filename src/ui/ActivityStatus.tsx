import type { ActionView } from '../engine/actions';
import { dollars, JOBS } from '../engine/economy';
import { currentCareer } from '../engine/life';
import { COLLEGES, currentSchool, yearlyTuition } from '../engine/school';
import { ageOf } from '../engine/state';
import type { GameState } from '../engine/types';

const money = (amount: number) => `$${amount.toLocaleString('en-US')}`;

export function SchoolStatus({ state }: { state: GameState }) {
  const school = currentSchool(state);
  const { college, gpa, credentials, education } = state.character;
  return (
    <div className="card activity-status">
      <p className="eyebrow">Report card</p>
      <h4>{school?.label ?? 'Education and skills'}</h4>
      {school ? <p><strong>{gpa?.toFixed(2) ?? '—'} GPA</strong> · 4.00 scale. Study and spend time with classmates to improve your grades.</p>
        : <p className="muted">{education === 'none' ? 'No diploma yet.' : `Completed ${education}.`}</p>}
      {college && (
        <div className="activity-progress">
          <label>Program progress <progress value={college.months} max={COLLEGES[college.kind].months} /></label>
          <p>{college.months} of {COLLEGES[college.kind].months} months · {college.scholarship ? 'Scholarship' : `${money(yearlyTuition(state, college.kind, false))} tuition per year`}</p>
        </div>
      )}
      {!!credentials?.length && <p>Credentials · {credentials.join(', ')}</p>}
    </div>
  );
}

export function WorkStatus({ state, openings, onApply }: {
  state: GameState;
  openings: ActionView[];
  onApply: (id: string) => void;
}) {
  const { job } = state.character;
  const career = currentCareer(state);
  const retired = !job && career.retired;
  // When energy runs out every opening shares the same reason; say it once instead of under each job.
  const outOfEnergy = openings.length > 0 && openings.every(action => action.disabled === 'Not enough energy this year');
  return (
    <div className="card activity-status">
      <p className="eyebrow">Career</p>
      <h4>{job?.title ?? (retired ? 'Retired' : ageOf(state) >= 16 ? 'Looking for work' : 'No job yet')}</h4>
      {job && (
        <>
          <p>{money(job.salary)} / year · Level {career.level} · {career.experience} months in role</p>
          <div className="activity-progress">
            <label>Performance <progress value={career.performance} max={100} /></label>
            <p>{career.performance}/100 · Career focus and coaching help prepare you for promotion.</p>
          </div>
        </>
      )}
      {retired && <p>{money(career.pension)} annual pension</p>}
      {openings.length > 0 && (
        <details className="job-board" open={!job && !retired}>
          <summary>Job board · {openings.length} eligible {openings.length === 1 ? 'role' : 'roles'}</summary>
          <p className="muted">Apply directly for 1 energy. A successful application starts the new role immediately.</p>
          {retired && <p className="warn">Taking a job ends your pension.</p>}
          {outOfEnergy && <p className="warn">Not enough energy this year. Age up to apply.</p>}
          <ul className="job-list">
            {openings.map(action => {
              const opening = JOBS.find(spec => `apply-${spec.id}` === action.id)!;
              return (
                <li key={action.id}>
                  <div><strong>{opening.title}</strong><small>{money(dollars(opening.salary2026, state.date.year))} / year{opening.license ? ` · ${opening.license} license` : ''}</small></div>
                  <button className="pill small" disabled={!!action.disabled} aria-label={`Apply for ${opening.title}`} onClick={() => onApply(action.id)}>Apply</button>
                  {action.disabled && !outOfEnergy && <small className="warn job-reason">{action.disabled}</small>}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
