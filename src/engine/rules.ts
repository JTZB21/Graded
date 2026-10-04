// Core rule tables, transcribed from the GRADED card (data/source/card.json, data.description).
// The engine owns these numbers; the narrator only describes outcomes.

export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'Ω', 'X'] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_INFO: Record<Rank, { name: string; worldwide: string }> = {
  F: { name: 'Null', worldwide: '~500,000' },
  E: { name: 'Trivial', worldwide: '~420,000' },
  D: { name: 'Minor', worldwide: '~340,000' },
  C: { name: 'Moderate', worldwide: '~210,000' },
  B: { name: 'Major', worldwide: '~95,000' },
  A: { name: 'Severe', worldwide: '~24,000' },
  S: { name: 'Strategic', worldwide: '~310' },
  SS: { name: 'Cataclysmic', worldwide: '9 confirmed' },
  'Ω': { name: 'Omega', worldwide: '2 confirmed' },
  X: { name: 'Unbounded', worldwide: 'none confirmed' },
};

export const GRADES = ['I', 'II', 'III', 'IV', 'V'] as const;
export type Grade = (typeof GRADES)[number];

export const CATEGORIES = {
  COR: 'Corporeal',
  KIN: 'Kinetic',
  MAT: 'Material',
  PSI: 'Psionic',
  SPA: 'Spatial',
  BIO: 'Biological',
  TEC: 'Technopathic',
  PER: 'Perceptive',
  CAU: 'Causal',
  ANO: 'Anomalous',
} as const;
export type Category = keyof typeof CATEGORIES;

export type LifeStage = 'Latent' | 'Kindling Window' | 'Rising' | 'Prime' | 'Waning' | 'Twilight';

// The card's stages overlap at 18-21 (Kindling Window and Rising); Rising wins once a character is ranked.
export function lifeStage(age: number, ranked = false): LifeStage {
  if (age <= 11) return 'Latent';
  if (age <= 21 && !(ranked && age >= 18)) return 'Kindling Window';
  if (age <= 30) return 'Rising';
  if (age <= 44) return 'Prime';
  if (age <= 59) return 'Waning';
  return 'Twilight';
}

export type StrainBand = 'fine' | 'symptoms' | 'danger' | 'critical';

export function strainBand(strain: number): StrainBand {
  if (strain <= 40) return 'fine';
  if (strain <= 70) return 'symptoms';
  if (strain <= 90) return 'danger';
  return 'critical';
}

/** Reputation stats (Fame, Infamy, Street Cred) each run from -100 to 100. */
export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type Roller = () => number;

/** A d100 roll, 1-100. Pass a seeded roller in tests. */
export const d100 = (rand: () => number = Math.random): number => Math.floor(rand() * 100) + 1;

/** Kindling table: 1-30 F, 31-55 E, 56-75 D, 76-88 C, 89-95 B, 96-99 A, 100 rolls again: 1-90 S, 91-99 SS, 100 Ω. */
export function kindlingRank(roll: Roller): Rank {
  const r = roll();
  if (r <= 30) return 'F';
  if (r <= 55) return 'E';
  if (r <= 75) return 'D';
  if (r <= 88) return 'C';
  if (r <= 95) return 'B';
  if (r <= 99) return 'A';
  const again = roll();
  if (again <= 90) return 'S';
  if (again <= 99) return 'SS';
  return 'Ω';
}

/** Power count table: 1-80 one, 81-93 two, 94-98 three, 99 four, 100 five. */
export function powerCount(roll: Roller): number {
  const r = roll();
  if (r <= 80) return 1;
  if (r <= 93) return 2;
  if (r <= 98) return 3;
  if (r === 99) return 4;
  return 5;
}

/** Each extra power is 1-3 ranks below the primary, minimum F. */
export function secondaryRank(primary: Rank, roll: Roller): Rank {
  const drop = Math.floor(((roll() - 1) / 100) * 3) + 1;
  return RANKS[Math.max(0, RANKS.indexOf(primary) - drop)];
}
