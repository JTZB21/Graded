import { useState } from 'react';
import { BACKGROUNDS, createGame, START_AGES, type Powered, type StartAge } from '../engine/creation';
import { CATEGORIES, RANKS, type Category, type Rank } from '../engine/rules';
import type { Background, GameState, Gender, Leaning } from '../engine/types';

const ROLL = 'roll';

export function CreateScreen({ onStart }: { onStart: (s: GameState) => void }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | typeof ROLL>(ROLL);
  const [startAge, setStartAge] = useState<StartAge | typeof ROLL>(ROLL);
  const [startYear, setStartYear] = useState(2026);
  const [background, setBackground] = useState<Background | typeof ROLL>(ROLL);
  const [powered, setPowered] = useState<'roll' | 'baseline' | 'choose'>('roll');
  const [category, setCategory] = useState<Category | typeof ROLL>(ROLL);
  const [rank, setRank] = useState<Rank | typeof ROLL>(ROLL);
  const [description, setDescription] = useState('');
  const [leaning, setLeaning] = useState<Leaning>('undecided');

  function start() {
    let p: Powered = powered === 'choose' ? {} : powered;
    if (powered === 'choose') {
      p = {
        ...(category !== ROLL && { category }),
        ...(rank !== ROLL && { rank }),
        ...(description.trim() && { description: description.trim() }),
      };
    }
    onStart(
      createGame({
        name,
        gender: gender === ROLL ? undefined : gender,
        startAge: startAge === ROLL ? undefined : startAge,
        startYear,
        background: background === ROLL ? undefined : background,
        powered: p,
        leaning,
      }),
    );
  }

  const strategic = powered === 'choose' && (rank === 'S' || rank === 'SS' || rank === 'Ω' || rank === 'X');

  return (
    <section className="card create">
      <img className="cover" src="/cover.png" alt="" />
      <h2>Build your character</h2>
      <p className="hint">Anything left on "roll" is rolled for you. You start in Port Harlan.</p>
      <div className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="roll" />
        </label>
        <label>
          Gender
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <option value={ROLL}>roll</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="nonbinary">nonbinary</option>
          </select>
        </label>
        <label>
          Starting age
          <select value={startAge} onChange={(e) => setStartAge(e.target.value as StartAge)}>
            <option value={ROLL}>roll</option>
            {Object.entries(START_AGES).map(([k, [lo, hi]]) => (
              <option key={k} value={k}>{k} ({lo === hi ? lo : `${lo}-${hi}`})</option>
            ))}
          </select>
        </label>
        <label>
          Starting year
          <input type="number" min={1947} max={2026} value={startYear} onChange={(e) => setStartYear(Number(e.target.value) || 2026)} />
        </label>
        <label>
          Background
          <select value={background} onChange={(e) => setBackground(e.target.value as Background)}>
            <option value={ROLL}>roll</option>
            {BACKGROUNDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label>
          Powers
          <select value={powered} onChange={(e) => setPowered(e.target.value as typeof powered)}>
            <option value="roll">roll the Kindling</option>
            <option value="choose">choose my power</option>
            <option value="baseline">baseline (no powers)</option>
          </select>
        </label>
        {powered === 'choose' && (
          <>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value={ROLL}>roll</option>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
              </select>
            </label>
            <label>
              Rank
              <select value={rank} onChange={(e) => setRank(e.target.value as Rank)}>
                <option value={ROLL}>roll</option>
                {RANKS.filter((r) => r !== 'X').map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="wide">
              Describe the power
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. turns sound into kinetic force" />
            </label>
          </>
        )}
        <label>
          Leaning
          <select value={leaning} onChange={(e) => setLeaning(e.target.value as Leaning)}>
            {(['undecided', 'hero', 'villain', 'neutral'] as const).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>
      {strategic && <p className="warn">The world will treat you as a strategic asset from day one: owned, watched, and tracked by treaty.</p>}
      <div className="create-actions">
        <button className="age-up" onClick={start}>Begin</button>
        <button className="pill" onClick={() => onStart(createGame())}>Roll everything</button>
      </div>
    </section>
  );
}
