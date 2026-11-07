import type { ActionView } from '../engine/actions';
import { dollars, JOBS } from '../engine/economy';
import { currentCareer } from '../engine/life';
import { COLLEGES, currentSchool, yearlyTuition } from '../engine/school';
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
  return (
    <div className="card activity-status">
      <p className="eyebrow">Career</p>
      <h4>{job?.title ?? (career.retired ? 'Retired' : 'Looking for work')}</h4>
      {job && (
        <>
          <p>{money(job.salary)} / year · Level {career.level} · {career.experience} months in role</p>
          <div className="activity-progress">
            <label>Performance <progress value={career.performance} max={100} /></label>
            <p>{career.performance}/100 · Career focus and coaching help prepare you for promotion.</p>
          </div>
        </>
      )}
      {!job && career.retired && <p>{money(career.pension)} annual pension</p>}
      {openings.length > 0 && (
        <details className="job-board" open={!job}>
          <summary>Job board · {openings.length} eligible {openings.length === 1 ? 'role' : 'roles'}</summary>
          <p className="muted">Apply directly for 1 energy. A successful application starts the new role immediately.</p>
          <ul className="job-list">
            {openings.map(action => {
              const opening = JOBS.find(spec => `apply-${spec.id}` === action.id)!;
              return (
                <li key={action.id}>
                  <div><strong>{opening.title}</strong><small>{money(dollars(opening.salary2026, state.date.year))} / year{opening.license ? ` · ${opening.license} license` : ''}</small></div>
                  <button className="pill small" disabled={!!action.disabled} aria-label={`Apply for ${opening.title}`} onClick={() => onApply(action.id)}>Apply</button>
                  {action.disabled && <small className="warn job-reason">{action.disabled}</small>}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
