import { ageOf, changeRep, type Reputation } from './state';
import type { GameState } from './types';
import type { Rng } from './random';
import { say } from './writer/writer';
export interface Title { id: string; name: string; rep: Reputation; reward: number; when: (s: GameState) => boolean }
export const TITLES: Title[] = [
  { id: "riverside", name: "Pride of Riverside", rep: "streetCred", reward: 3, when: s => s.character.district === 'Riverside Docks' && s.character.streetCred >= 60 },
  { id: "bureau", name: "The Bureau\u2019s Problem", rep: "infamy", reward: 3, when: s => s.date.year >= 1962 && s.character.infamy >= 70 },
  { id: "brand", name: "Brand Hero", rep: "fame", reward: 3, when: s => s.date.year >= 1951 && s.character.org?.id === 'aurelian' && s.character.org.rank >= 3 },
  { id: "valedictorian", name: "Valedictorian", rep: "fame", reward: 3, when: s => ageOf(s) === 18 && (s.character.gpa ?? 0) >= 3.9 },
  { id: "lungs", name: "Iron Lungs", rep: "fame", reward: 3, when: s => ageOf(s) >= 90 },
  { id: "fixer", name: "Fixer", rep: "streetCred", reward: 3, when: s => s.date.year >= 1990 && s.character.org?.id === 'choir' && s.character.org.rank >= 4 },
  { id: "decorated", name: "Decorated", rep: "fame", reward: 3, when: s => s.character.fame >= 80 },
  { id: "fame20", name: "Known Face", rep: "fame", reward: 1, when: s => s.character.fame >= 20 },
  { id: "fame40", name: "Local Name", rep: "fame", reward: 1, when: s => s.character.fame >= 40 },
  { id: "fame60", name: "Public Property", rep: "fame", reward: 1, when: s => s.character.fame >= 60 },
  { id: "infamy20", name: "Bad Company", rep: "infamy", reward: 1, when: s => s.character.infamy >= 20 },
  { id: "infamy40", name: "Wanted Poster", rep: "infamy", reward: 1, when: s => s.character.infamy >= 40 },
  { id: "infamy60", name: "Household Warning", rep: "infamy", reward: 1, when: s => s.character.infamy >= 60 },
  { id: "streetCred20", name: "Corner Regular", rep: "streetCred", reward: 1, when: s => s.character.streetCred >= 20 },
  { id: "streetCred40", name: "Street Witness", rep: "streetCred", reward: 1, when: s => s.character.streetCred >= 40 },
  { id: "streetCred60", name: "City Fixture", rep: "streetCred", reward: 1, when: s => s.character.streetCred >= 60 },
  { id: "Ashgrove", name: "Garden Wall", rep: "streetCred", reward: 2, when: s => s.character.district === 'Ashgrove' && ageOf(s) >= 40 && s.character.streetCred >= 30 },
  { id: "The Spire", name: "Glass Ceiling", rep: "streetCred", reward: 2, when: s => s.character.district === 'The Spire' && ageOf(s) >= 40 && s.character.streetCred >= 30 },
  { id: "Saint Bryce", name: "Parish Fixture", rep: "streetCred", reward: 2, when: s => s.character.district === 'Saint Bryce' && ageOf(s) >= 40 && s.character.streetCred >= 30 },
  { id: "Kesler Heights", name: "Uphill Regular", rep: "streetCred", reward: 2, when: s => s.character.district === 'Kesler Heights' && ageOf(s) >= 40 && s.character.streetCred >= 30 },
  { id: "Old Foundry", name: "Foundry Survivor", rep: "streetCred", reward: 2, when: s => s.character.district === 'Old Foundry' && ageOf(s) >= 40 && s.character.streetCred >= 30 },
  { id: "body", name: "Hard Labor", rep: "fame", reward: 2, when: s => s.character.body >= 9 },
  { id: "mind", name: "Sharp Instrument", rep: "fame", reward: 2, when: s => s.character.mind >= 9 },
  { id: "charm", name: "Silver Tongue", rep: "fame", reward: 2, when: s => s.character.charm >= 9 },
  { id: "nerve", name: "Steady Hands", rep: "fame", reward: 2, when: s => s.character.nerve >= 9 },
  { id: "age50", name: "Half Century", rep: "fame", reward: 2, when: s => ageOf(s) >= 50 },
  { id: "age70", name: "Long Service", rep: "fame", reward: 2, when: s => ageOf(s) >= 70 },
  { id: "age100", name: "Last Witness", rep: "fame", reward: 2, when: s => ageOf(s) >= 100 },
  { id: "degree", name: "Paper Armor", rep: "fame", reward: 2, when: s => s.character.education === 'college' },
  { id: "parent", name: "Next of Kin", rep: "fame", reward: 1, when: s => (s.character.people ?? []).some(p => p.relation === 'child' && p.alive && s.date.year - p.born >= 18) },
  { id: "married", name: "Joint Liability", rep: "fame", reward: 1, when: s => (s.character.people ?? []).some(p => p.relation === 'spouse' && p.alive) },
  { id: "wealth", name: "Private Entrance", rep: "fame", reward: 2, when: s => s.character.money >= 1000000 },
  { id: "convicted", name: "On File", rep: "infamy", reward: 1, when: s => s.character.record.length >= 3 },
  { id: "licensed", name: "Stamped and Filed", rep: "fame", reward: 2, when: s => s.character.license === 'Strategic' },
];
export function checkTitles(s: GameState, rng: Rng) {
  const c = s.character;
  c.highestOrgRank = Math.max(c.highestOrgRank ?? 0, c.org?.rank ?? 0);
  if (!c.alive) return;
  const earned = c.titles ??= [];
  // Snapshot eligibility before rewards so one title cannot trigger another in this pass.
  const fresh = TITLES.filter(t => !earned.includes(t.id) && t.when(s));
  for (const t of fresh) { earned.push(t.id); changeRep(c, t.rep, t.reward); say(s, rng, 'life', t.id === 'bureau' ? 'title.bureau' : 'title.earned', { title: t.name }); }
}
export function selectTitle(state: GameState, id: string | null): GameState {
  if (id !== null && !(state.character.titles ?? []).includes(id)) throw new Error('Title not earned');
  const s = structuredClone(state); s.character.displayedTitle = id; return s;
}
export const titleName = (id?: string | null) => TITLES.find(t => t.id === id)?.name;
