// Converts the SillyTavern card and lorebook in data/source/ into the game data in src/data/.
// Re-run with `npm run import-lore` whenever the source files change. Never edit src/data/*.json by hand.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const card = JSON.parse(readFileSync('data/source/card.json', 'utf8')).data;
const book = JSON.parse(readFileSync('data/source/lorebook.json', 'utf8'));
mkdirSync('src/data', { recursive: true });

const REGIONS = new Set([
  'World Overview', 'Nigeria', 'Nigeria History', 'Lagos', 'Lagos Factions and People', 'Ghana',
  'Senegal and Francophone West Africa', 'Liberia and Sierra Leone Wars', 'France', 'France History', 'Paris',
  'Paris Factions and People', 'Marseille', 'United Kingdom', 'Germany and Central Europe',
  'Russia and the Former USSR', 'China', 'Japan and South Korea', 'India and South Asia',
  'Brazil and Latin America', 'Middle East and North Africa', 'East and Southern Africa',
]);
const EVENTS = new Set([
  'The Saigon Burn', "The Blackout of '77", 'The Ferris Hit and Graded Sports', 'The Psi Panic',
  'Operation Eagle Claw', 'Chernobyl and Graphite', 'Black Monday and the Wall Street Jinx',
  'The Gulf War and Paragon', 'The Foundry Riots and Calvin Merritt', 'The Hollow Creek Siege',
  'The Ghostline Trial', 'The Chicago Flare and Y2K',
]);

function kindOf(title) {
  if (REGIONS.has(title)) return 'region';
  if (EVENTS.has(title)) return 'event';
  if (title.startsWith('Era ') || title.startsWith('Contemporaries') || title.endsWith('Through the Years') ||
      title.endsWith('Through the Decades') || title === 'History Timeline' || title === 'Current Events 2026') return 'era';
  if (/Rank|Grades|Breakthrough|Kindling|Strain|Multiple Powers|Aging|Genetics|^Category /.test(title)) return 'rules';
  return 'world';
}

// {{random::a::b::c}} macros become name-seed lists the engine samples from.
const RANDOM = /\{\{random::([^}]*)\}\}/g;
function extractSeeds(text) {
  const lists = [...text.matchAll(RANDOM)].map((m) => m[1].split('::'));
  const unique = [];
  for (const l of lists) if (!unique.some((u) => u.join() === l.join())) unique.push(l);
  return unique;
}

const entries = Object.values(book.entries)
  .sort((a, b) => a.uid - b.uid)
  .map((e) => {
    const seeds = extractSeeds(e.content);
    return {
      id: e.uid,
      title: e.comment,
      kind: kindOf(e.comment),
      keys: e.key,
      secondaryKeys: e.keysecondary ?? [],
      content: e.content.replace(/Name seeds:.*$/ms, '').replace(RANDOM, '').trim(),
      ...(seeds.length ? { nameSeeds: { first: seeds[0], last: seeds[1] ?? [] } } : {}),
    };
  });

// Timeline lines look like "- 1971: text" or "1971: text"; ranges like "1950s:" keep the decade start.
const timeline = [];
for (const e of entries) {
  if (e.kind !== 'era' && e.kind !== 'region') continue;
  for (const line of e.content.split('\n')) {
    const m = line.match(/^\s*-?\s*(\d{4})s?(?:\s*[-–]\s*\d{2,4})?:\s*(.+)$/);
    if (m) timeline.push({ year: Number(m[1]), text: m[2].trim(), source: e.title });
  }
}
timeline.sort((a, b) => a.year - b.year);

const usSeeds = extractSeeds(card.description);
const narrator = {
  rules: card.description.replace(/- Name seeds for the US[\s\S]*?(?=\n {2}These are inspiration)/, '- Name seeds: supplied by the engine for the current region.'),
  reminder: card.post_history_instructions,
  creation: card.first_mes,
  openings: card.alternate_greetings,
  defaultNameSeeds: { first: usSeeds[0], last: usSeeds[1] },
};

const write = (name, data) => writeFileSync(`src/data/${name}`, JSON.stringify(data, null, 1) + '\n');
write('lore.json', entries);
write('timeline.json', timeline);
write('narrator.json', narrator);
const counts = entries.reduce((c, e) => ({ ...c, [e.kind]: (c[e.kind] ?? 0) + 1 }), {});
console.log(`lore entries: ${entries.length}`, counts, `timeline events: ${timeline.length}`);
