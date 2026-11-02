import type { Category, Grade, Rank } from './rules';

export type Gender = 'male' | 'female' | 'nonbinary';
export type Background = 'wealthy' | 'working class' | 'graded family' | 'foster system' | 'street' | 'military';
export type Leaning = 'hero' | 'villain' | 'neutral' | 'undecided';
export type District = 'Ashgrove' | 'The Spire' | 'Saint Bryce' | 'Kesler Heights' | 'Riverside Docks' | 'Old Foundry';
export type Focus = 'school' | 'work' | 'train' | 'crime' | 'family' | 'rest';
export type License = 'none' | 'Civilian' | 'Utility' | 'Vigilance' | 'Strategic';
export type Education = 'none' | 'high school' | 'college';
/** Kinds of school from 6 to 17 (see school.ts). */
export type SchoolKind = 'underfunded-public' | 'standard-public' | 'parochial-charter' | 'stem-magnet' | 'elite-prep' | 'ashgrove-academy';
/** Kinds of study after 18 (see school.ts). */
export type CollegeKind = 'trade' | 'community' | 'state' | 'spire' | 'ashgrove';

export interface Enrollment {
  kind: CollegeKind;
  /** Months done in this program. */
  months: number;
  /** Tuition waived. */
  scholarship: boolean;
}

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
  /** Groups the character has joined or signed with (Aurelian, Low Kings, the Choir, Ashgrove Academy). */
  ties?: string[];
  /** Calendar year of the last time the character asked for a raise (once a year). */
  raiseAskedYear?: number;

  alive: boolean;
  /** Family and friends (see people.ts). Missing on saves from before the family system. */
  people?: Person[];

  /** The school you go to (or last went to) between 6 and 17. Missing before school age. */
  school?: SchoolKind | null;
  /** Grade point average, 0-4, at school and college. */
  gpa?: number;
  /** College or trade school you are enrolled in now. */
  college?: Enrollment | null;
  /** Certificates and degrees short of a full degree ('trade certificate', 'associate degree'). */
  credentials?: string[];
  pet?: { kind: string; name: string; since: number } | null;
  car?: 'beater' | 'reliable' | null;
  /** One-off life moments that already happened (milestones, once-in-a-life choices). */
  done?: string[];
}

export type Relation = 'mother' | 'father' | 'guardian' | 'sibling' | 'friend' | 'rival' | 'partner' | 'spouse' | 'child' | 'protege';

export interface Person {
  id: string;
  name: string;
  relation: Relation;
  /** Birth year. A sibling born after the current year has not arrived yet. */
  born: number;
  /** How close you are, 0-100. */
  bond: number;
  alive: boolean;
  /** Household wealth in 2026 dollars (parents and guardians). */
  wealth?: number;
  /** Times you have spent with them. */
  moments: number;
  /** Not speaking to you. Only reaching out can fix it. */
  estranged?: boolean;
  /** Kindled (a Graded parent, or a sibling who Kindles). */
  graded?: boolean;
  /** A partner or spouse who shares your home (splits the rent). */
  livesWithYou?: boolean;
  /** Turn number and count of the last interactions, to limit them per turn. */
  usedTurn?: number;
  usedCount?: number;
}

export interface LogEntry {
  date: YearMonth;
  kind: 'life' | 'power' | 'money' | 'law' | 'world' | 'event' | 'death';
  text: string;
}

export interface DecisionOption {
  id: string;
  label: string;
}

/** A choice the game is waiting on. Time does not move until the player picks an option. */
export interface Decision {
  id: string;
  text: string;
  options: DecisionOption[];
  /** The person the choice is about (a Person id), if any. */
  about?: string;
}

export interface GameState {
  version: 1;
  rngState: number;
  date: YearMonth;
  city: 'Port Harlan';
  character: Character;
  log: LogEntry[];
  pending?: Decision | null;
  /** Energy left for actions this month (see actions.ts). Refills when time moves. Missing means full. */
  energy?: number;
  /** Counts time skips (turns). Used to limit interactions per turn. */
  turn?: number;
}
