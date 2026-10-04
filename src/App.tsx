import { useState } from 'react';
import { SettingsScreen } from './narrator/SettingsScreen';
import lore from './data/lore.json';
import timeline from './data/timeline.json';
import { d100, kindlingRank, powerCount, RANK_INFO, secondaryRank, type Rank } from './engine/rules';

type Kindling = { primary: Rank; extras: Rank[] };

function rollKindling(): Kindling {
  const roll = () => d100();
  const primary = kindlingRank(roll);
  const count = powerCount(roll);
  const extras = Array.from({ length: count - 1 }, () => secondaryRank(primary, roll));
  return { primary, extras };
}

// Milestone 1 placeholder screen: proves the lore import and rule tables load. The real game UI comes next.
export default function App() {
  const [kindling, setKindling] = useState<Kindling | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (settingsOpen) return <main><SettingsScreen onClose={() => setSettingsOpen(false)} /></main>;

  return (
    <main>
      <img className="cover" src="/cover.png" alt="GRADED cover art" />
      <h1>GRADED</h1>
      <button onClick={() => setSettingsOpen(true)}>Narrator settings</button>
      <p>
        {lore.length} lore entries and {timeline.length} timeline events loaded.
      </p>
      <button onClick={() => setKindling(rollKindling())}>Roll a Kindling</button>
      {kindling && (
        <p>
          Primary power: {kindling.primary}-Rank ({RANK_INFO[kindling.primary].name})
          {kindling.extras.length > 0 && <>, plus {kindling.extras.map((r) => `${r}-Rank`).join(', ')}</>}
        </p>
      )}
    </main>
  );
}
