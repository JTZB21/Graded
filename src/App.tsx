import { ThemeToggle, ThemeSettings } from './ui/ThemeSettings';
import { useEffect, useState } from 'react';
import type { GameState } from './engine/types';
import { autosave, clearAutosave, loadAutosave, loadSlot, slotInfo, SLOTS } from './save';
import { CreateScreen } from './ui/CreateScreen';
import { PlayScreen } from './ui/PlayScreen';
import { FxLayer } from './ui/Effects';

export default function App() {
  const [game, setGame] = useState<GameState | null>(() => loadAutosave());

  // Save after every move, so closing the app never loses progress.
  useEffect(() => {
    if (game) autosave(game);
  }, [game]);

  // Starting, loading or ending a life swaps the whole screen: open the new one at the top.
  const playing = game !== null;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [playing]);

  const saved = SLOTS.map((n) => ({ n, info: slotInfo(n) })).filter((x) => x.info);

  return (
    <main className={game ? 'with-nav' : ''}>
      <div className="app-masthead">{game ? <span className="app-wordmark">GRADED<span>A Port Harlan life</span></span> : <span />}<ThemeToggle /></div>
      {!game && (
        <header className="brand">
          <h1>GRADED</h1>
          <p className="tagline">One in five thousand people has powers. The world ranks every one of them, then decides what they're worth.</p>
        </header>
      )}
      {!game && saved.length > 0 && (
        <section className="card">
          <p className="eyebrow">Continue a saved life</p>
          <div className="option-list">
            {saved.map(({ n, info }) => (
              <button key={n} className="pill" onClick={() => setGame(loadSlot(n))}>Slot {n}: {info!.summary}</button>
            ))}
          </div>
        </section>
      )}
      {game ? (
        <PlayScreen state={game} onChange={setGame} onNew={() => { clearAutosave(); setGame(null); }} />
      ) : (
        <><CreateScreen onStart={setGame} /><ThemeSettings /></>
      )}
      <FxLayer />
    </main>
  );
}
