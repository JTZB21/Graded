import { useState } from 'react';
import type { GameState } from './engine/types';
import { CreateScreen } from './ui/CreateScreen';
import { PlayScreen } from './ui/PlayScreen';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);

  return (
    <main>
      <header>
        <h1>G R A D E D</h1>
        <p className="tagline">One in five thousand people has powers. The world ranks every one of them, then decides what they're worth.</p>
      </header>
      {game ? <PlayScreen state={game} onChange={setGame} onNew={() => setGame(null)} /> : <CreateScreen onStart={setGame} />}
    </main>
  );
}
