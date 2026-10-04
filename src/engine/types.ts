import type { Category, Grade, Rank } from './rules';

export type Gender = 'male' | 'female' | 'nonbinary';
export type Background = 'wealthy' | 'working class' | 'graded family' | 'foster system' | 'street' | 'military';
export type Leaning = 'hero' | 'villain' | 'neutral' | 'undecided';
export type District = 'Ashgrove' | 'The Spire' | 'Saint Bryce' | 'Kesler Heights' | 'Riverside Docks' | 'Old Foundry';
export type Focus = 'school' | 'work' | 'train' | 'crime' | 'family' | 'rest';
export type License = 'none' | 'Civilian' | 'Utility' | 'Vigilance' | 'Strategic';
export type Education = 'none' | 'high school' | 'college';

export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

export interface Power {
  rank: Rank;
  category: Category;
  /** Player-written description; the engine never invents one. */
  description: string;
}

export interface Job {
  id: string;
  title: string;
  /** Yearly pay in the money of the current year. */
  salary: number;
}

export interface Offense {
  year: number;
  offense: string;
  sentenceMonths: number;
}

export interface Character {
  name: string;
  gender: Gender;
  born: YearMonth;
  background: Background;
  leaning: Leaning;
  district: District;
  livesWithFamily: boolean;

  /** Graded once Kindled; baselines have no powers. */
  graded: boolean;
  /** Age at which a latent Kindling will happen, if any. */
  kindleAge: number | null;
  /** The player's chosen power for a Kindling that has not happened yet. */
  pendingPower?: { category?: Category; rank?: Rank; description?: string };
  powers: Power[];
  grade: Grade | null;
  /** Months of practice toward the next Grade. */
  gradeProgress: number;
  /** Whether Grade V is reachable at all (about 5% of the Graded get there). */
  masteryPotential: boolean;
  powersGone: boolean;

  body: number;
  mind: number;
  charm: number;
  nerve: number;

  health: number;
  strain: number;
  money: number;
  job: Job | null;
  education: Education;
  /** Months spent studying after 18; 36 earns a degree. */
  collegeMonths: number;
  license: License;
  record: Offense[];
  inPrisonUntil: YearMonth | null;

  fame: number;
  infamy: number;
  streetCred: number;

  alive: boolean;
}

export interface LogEntry {
  date: YearMonth;
  kind: 'life' | 'power' | 'money' | 'law' | 'world' | 'event' | 'death';
  text: string;
}

export interface GameState {
  version: 1;
  rngState: number;
  date: YearMonth;
  city: 'Port Harlan';
  character: Character;
  log: LogEntry[];
}
