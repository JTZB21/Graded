// Money, jobs, housing and sentencing. Figures are 2026 US dollars from the lorebook
// ("Rank in Daily Life", "Hero Business", "Era 2020s", "Underworld Economy"), scaled to the current year.

import { RANKS, type Rank } from './rules';
import type { Character, District, Job } from './types';

// Rough price level relative to 2026 (1.0). Interpolated between points.
const PRICE_LEVEL: [number, number][] = [
  [1947, 0.068], [1960, 0.096], [1970, 0.126], [1980, 0.27], [1990, 0.425],
  [2000, 0.56], [2010, 0.71], [2020, 0.84], [2026, 1],
];

export function priceLevel(year: number): number {
  if (year >= 2026) return 1;
  for (let i = 1; i < PRICE_LEVEL.length; i++) {
    const [y1, p1] = PRICE_LEVEL[i - 1];
    const [y2, p2] = PRICE_LEVEL[i];
    if (year <= y2) return p1 + ((p2 - p1) * (Math.max(year, y1) - y1)) / (y2 - y1);
  }
  return 1;
}

/** Converts a 2026 dollar amount to the money of `year`, rounded to something a price tag would show. */
export function dollars(amount2026: number, year: number): number {
  const v = amount2026 * priceLevel(year);
  return v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v);
}

/** Monthly rent in 2026 dollars ("rent in Port Harlan $1,800-2,600" for an ordinary flat). */
export const RENT: Record<District, number> = {
  'Old Foundry': 950,
  'Riverside Docks': 1300,
  'Saint Bryce': 1900,
  'Kesler Heights': 2200,
  'The Spire': 3800,
  Ashgrove: 7000,
};

/** Food and everything else, 2026 dollars a month. Graded burn 2-5x the calories. */
export const livingCost = (graded: boolean) => (graded ? 1300 : 900);

interface JobSpec {
  id: string;
  title: string;
  salary2026: number;
  minAge: number;
  /** Power rank needed, if the job uses powers. */
  minRank?: Rank;
  qualifies?: (c: Character) => boolean;
  license?: 'Utility' | 'Vigilance' | 'Strategic';
}

const atLeast = (rank: Rank, min: Rank) => RANKS.indexOf(rank) >= RANKS.indexOf(min);
const cleanRecord = (c: Character) => c.record.length === 0;

export const JOBS: JobSpec[] = [
  { id: 'retail', title: 'Retail clerk', salary2026: 31000, minAge: 16 },
  { id: 'warehouse', title: 'Warehouse worker', salary2026: 38000, minAge: 18, qualifies: (c) => c.body >= 4 },
  { id: 'office', title: 'Office worker', salary2026: 56000, minAge: 18, qualifies: (c) => c.mind >= 6 && c.education !== 'none' },
  { id: 'paramedic', title: 'Paramedic', salary2026: 52000, minAge: 20, qualifies: (c) => c.mind >= 5 && c.nerve >= 5 && c.education !== 'none' },
  { id: 'police', title: 'Police officer', salary2026: 68000, minAge: 21, qualifies: (c) => c.body >= 5 && c.nerve >= 5 && cleanRecord(c) },
  { id: 'utility', title: 'Utility Graded (construction, demolition, couriers)', salary2026: 45000, minAge: 18, minRank: 'D', license: 'Utility' },
  { id: 'security', title: 'Graded security contractor', salary2026: 90000, minAge: 18, minRank: 'C', license: 'Utility' },
  { id: 'eru', title: 'Police Enhanced Response Unit', salary2026: 120000, minAge: 21, minRank: 'C', license: 'Utility', qualifies: (c) => cleanRecord(c) && c.grade !== 'I' },
  {
    id: 'regional-hero', title: 'Regional sponsored hero', salary2026: 180000, minAge: 18, minRank: 'C', license: 'Vigilance',
    // Vigilance needs B-Rank or above, or C with Grade III+, and a clean record.
    qualifies: (c) => cleanRecord(c) && (atLeast(c.powers[0].rank, 'B') || ['III', 'IV', 'V'].includes(c.grade ?? '')),
  },
  { id: 'national-hero', title: 'National brand hero', salary2026: 2500000, minAge: 18, minRank: 'A', license: 'Vigilance', qualifies: (c) => cleanRecord(c) && c.fame >= 20 },
  { id: 'strategic', title: 'Strategic asset (state-owned)', salary2026: 400000, minAge: 18, minRank: 'S', license: 'Strategic' },
];

/** Jobs the character could get right now, best paid first. Powered jobs need working powers. */
export function eligibleJobs(c: Character, age: number): JobSpec[] {
  const rank = c.graded && !c.powersGone ? c.powers[0]?.rank : undefined;
  return JOBS.filter((j) => {
    if (age < j.minAge) return false;
    if (j.minRank && !(rank && atLeast(rank, j.minRank))) return false;
    if (rank && atLeast(rank, 'S') && j.id !== 'strategic') return false; // S and above are owned
    return j.qualifies ? j.qualifies(c) : true;
  }).sort((a, b) => b.salary2026 - a.salary2026);
}

export function hire(spec: JobSpec, year: number): Job {
  return { id: spec.id, title: spec.title, salary: dollars(spec.salary2026, year) };
}

export function jobLicense(id: string): JobSpec['license'] | undefined {
  return JOBS.find((j) => j.id === id)?.license;
}

/** Underworld pay per job by rank (2026 dollars), baselines paid like D-Rank muscle at best. */
export function crimePay(rank: Rank | undefined): [number, number] {
  switch (rank) {
    case 'C': return [10000, 40000];
    case 'B': return [50000, 250000];
    case 'A': case 'S': case 'SS': case 'Ω': case 'X': return [500000, 1000000];
    case 'D': return [2000, 5000];
    default: return [500, 4000];
  }
}

/** Sentences scale with Rank. B-Rank and above go to the Sump (opened 1986; Fort Lowell before that). */
export function sentence(baseMonths: number, rank: Rank | undefined): number {
  const mult = rank ? 1 + Math.max(0, RANKS.indexOf(rank) - 2) * 0.5 : 1;
  return Math.round(baseMonths * mult);
}

export function prisonName(rank: Rank | undefined, year: number): string {
  if (rank && atLeast(rank, 'B')) return year >= 1986 ? 'the Sump' : 'Fort Lowell';
  return 'Harlan County Correctional';
}
