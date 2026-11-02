// Schools. Port Harlan's schools follow its class lines: where you grow up decides where you study,
// and where you study decides who you know at eighteen. The engine owns every number here (GPA,
// tuition, months of study); the writer only names the place and describes it.

import { dollars } from './economy';
import { Rng } from './random';
import { clamp } from './rules';
import { ageOf, changeAttr, changeRep } from './state';
import type { Character, CollegeKind, District, Focus, GameState, SchoolKind } from './types';
import { say } from './writer/writer';

const rough = (d: District) => d === 'Old Foundry' || d === 'Riverside Docks';
const tie = (c: Character, group: string) => { c.ties = [...new Set([...(c.ties ?? []), group])]; };
export const tied = (c: Character, group: string) => (c.ties ?? []).includes(group);
const has = (c: Character, flag: string) => (c.done ?? []).includes(flag);
export const mark = (c: Character, flag: string) => { c.done = [...new Set([...(c.done ?? []), flag])]; };
export const marked = has;

// ---------- School, 6 to 17 ----------

export const SCHOOL_LABELS: Record<SchoolKind, string> = {
  'underfunded-public': 'Underfunded public school',
  'standard-public': 'Public school',
  'parochial-charter': 'Parish or charter school',
  'stem-magnet': 'Magnet school',
  'elite-prep': 'Private prep school',
  'ashgrove-academy': 'Graded boarding school',
};

/** The name of the school, which changes as you move from grade school to high school. */
export function schoolName(c: Character, age: number): string {
  const kind = c.school ?? 'standard-public';
  const high = age >= 14;
  switch (kind) {
    case 'underfunded-public':
      if (!high) return c.district === 'Riverside Docks' ? 'Pier Street Elementary' : 'Foundry Row Elementary';
      return c.district === 'Riverside Docks' ? 'Docks Comprehensive' : 'Old Foundry High';
    case 'standard-public':
      if (!high) return c.district === 'Saint Bryce' ? 'Saint Bryce Elementary' : 'Kesler Heights Elementary';
      return c.district === 'Saint Bryce' ? 'Saint Bryce Unified' : 'Kesler Heights High';
    case 'parochial-charter':
      return c.background === 'military' ? 'Harbor Charter' : "St. Jude's Parish Academy";
    case 'stem-magnet':
      return 'Harlan Technical and Magnet Institute';
    case 'elite-prep':
      return 'Vanguard Prep';
    case 'ashgrove-academy':
      return 'Ashgrove Academy';
  }
}

/** Where a child starts school, by family and neighbourhood. */
export function firstSchool(c: Character): SchoolKind {
  if (c.background === 'wealthy') return 'elite-prep';
  if (c.background === 'military') return 'parochial-charter';
  if (c.background === 'foster system' || c.background === 'street') return 'underfunded-public';
  return rough(c.district) ? 'underfunded-public' : 'standard-public';
}

export const startGpa = (c: Character) => Math.round(clamp(2.2 + (c.mind - 4) * 0.25, 0.8, 3.8) * 100) / 100;

export function changeGpa(c: Character, by: number) {
  c.gpa = Math.round(clamp((c.gpa ?? startGpa(c)) + by, 0, 4) * 100) / 100;
}

/** Puts a child in school (age 6, or a save or a start that skipped it). */
export function enrollSchool(c: Character) {
  c.school ??= firstSchool(c);
  c.gpa ??= startGpa(c);
}

// GPA drift for a year, by focus.
const FOCUS_GPA: Record<Focus, number> = { school: 0.3, work: -0.15, train: -0.05, crime: -0.35, family: 0, rest: -0.05 };

/** On each birthday from 7 to 18, for a child in school: the year's grades. */
export function schoolYear(s: GameState, rng: Rng, focus: Focus) {
  const c = s.character;
  if (!c.school) return;
  const before = c.gpa ?? startGpa(c);
  let by = FOCUS_GPA[focus] + (c.mind - 5) * 0.04 + rng.int(-10, 10) / 100;
  if (c.school === 'parochial-charter') by += 0.05;
  if (c.school === 'underfunded-public' && before >= 3) by -= 0.08; // hard to stay on top without books
  changeGpa(c, by);
  // The magnet's workload is relentless.
  if (c.school === 'stem-magnet') c.health = Math.max(1, c.health - 2);
  const after = c.gpa!;
  const vars = { school: schoolName(c, ageOf(s)), gpa: after.toFixed(1) };
  if (before < 3.5 && after >= 3.5) say(s, rng, 'life', 'school.honor-roll', vars);
  else if (before >= 1.5 && after < 1.5) say(s, rng, 'life', 'school.failing', vars);
}

/** What graduating from each school gives you. Returns a template key, if there is anything to say. */
export function graduationPerks(c: Character): string | undefined {
  if (c.school === 'stem-magnet') { changeAttr(c, 'mind', 1); return 'school.graduate.magnet'; }
  if (c.school === 'elite-prep') { changeAttr(c, 'mind', 1); changeAttr(c, 'charm', 1); tie(c, 'Spire Network'); return 'school.graduate.prep'; }
  if (c.school === 'parochial-charter') return 'school.graduate.parish';
  return undefined;
}

/** An arrest ends a place at a parish school, and any college enrollment. */
export function expel(s: GameState, rng: Rng) {
  const c = s.character;
  if (c.college) {
    const name = COLLEGES[c.college.kind].name;
    c.college = null;
    say(s, rng, 'life', 'school.expelled.college', { school: name });
  }
  if (ageOf(s) < 18 && c.school === 'parochial-charter') {
    const name = schoolName(c, ageOf(s));
    c.school = rough(c.district) ? 'underfunded-public' : 'standard-public';
    say(s, rng, 'life', 'school.expelled', { school: name, next: schoolName(c, ageOf(s)) });
  }
}

// ---------- After 18 ----------

interface CollegeSpec {
  name: string;
  /** Length of the program in months. */
  months: number;
  /** Tuition per year, 2026 dollars. */
  tuition: number;
  /** Paid to you per year, 2026 dollars (Ashgrove's contract stipend). */
  stipend?: number;
}

export const COLLEGES: Record<CollegeKind, CollegeSpec> = {
  trade: { name: 'Harlan Vocational and Trade Institute', months: 12, tuition: 4800 },
  community: { name: 'Port Harlan Community College', months: 24, tuition: 4200 },
  state: { name: 'Harlan State University', months: 48, tuition: 11500 },
  spire: { name: 'Spire University', months: 48, tuition: 62000 },
  ashgrove: { name: "Ashgrove Academy's upper school", months: 36, tuition: 0, stipend: 18000 },
};

/** Who can get in, right now. */
export function admits(s: GameState, kind: CollegeKind): boolean {
  const c = s.character;
  const age = ageOf(s);
  const gpa = c.gpa ?? startGpa(c);
  if (age < 17 || c.college) return false;
  switch (kind) {
    case 'trade': return c.education !== 'none' && !(c.credentials ?? []).includes('trade certificate');
    case 'community': return !(c.credentials ?? []).includes('associate degree') && c.education !== 'college';
    case 'state': return c.education !== 'college' && (c.education === 'high school' || age === 17) && (c.mind >= 4 || gpa >= 2.5);
    case 'spire': return c.education !== 'college' && (c.education === 'high school' || age === 17) && (c.mind >= 7 || c.school === 'elite-prep' || c.background === 'wealthy');
    case 'ashgrove': {
      const rank = c.graded && !c.powersGone ? c.powers[0]?.rank : undefined;
      return s.date.year >= 1979 && age <= 21 && c.education !== 'college' && !!rank && (tied(c, 'Ashgrove Academy') || ['B', 'A', 'S', 'SS', 'Ω', 'X'].includes(rank));
    }
  }
}

/** Whether tuition is waived on admission (merit scholarships and fellowships). */
export function scholarshipFor(c: Character, kind: CollegeKind): boolean {
  const gpa = c.gpa ?? startGpa(c);
  if (kind === 'state') return gpa >= 3.5 || c.mind >= 8;
  if (kind === 'spire') return c.mind >= 8 && gpa >= 3.7;
  return kind === 'ashgrove';
}

/** Tuition for this year in today's money, after scholarships and family money. */
export function yearlyTuition(s: GameState, kind: CollegeKind, scholarship: boolean): number {
  const c = s.character;
  if (scholarship) return 0;
  // Wealthy families pay tuition.
  if (c.background === 'wealthy') return 0;
  return dollars(COLLEGES[kind].tuition, s.date.year);
}

export function enroll(s: GameState, kind: CollegeKind) {
  const c = s.character;
  const scholarship = scholarshipFor(c, kind);
  // An associate degree transfers into the third year of a four-year degree.
  const transfer = (kind === 'state' || kind === 'spire') && (c.credentials ?? []).includes('associate degree') ? 24 : 0;
  c.college = { kind, months: transfer, scholarship };
  c.gpa ??= startGpa(c);
  return scholarship;
}

/** Each month enrolled and free: a month of credit, tuition, and graduating at the end. */
export function collegeMonth(s: GameState, rng: Rng, focus: Focus) {
  const c = s.character;
  const e = c.college;
  if (!e) return;
  const spec = COLLEGES[e.kind];
  e.months++;
  c.collegeMonths++;
  c.money -= Math.round(yearlyTuition(s, e.kind, e.scholarship) / 12);
  if (spec.stipend) c.money += Math.round(dollars(spec.stipend, s.date.year) / 12);
  if (focus === 'school' && rng.chance(0.015)) changeAttr(c, 'mind', 1);
  if (e.kind === 'ashgrove' && focus === 'train') c.gradeProgress += 0.5;
  if (e.months >= spec.months) graduate(s, rng);
}

function graduate(s: GameState, rng: Rng) {
  const c = s.character;
  const kind = c.college!.kind;
  const vars = { school: COLLEGES[kind].name };
  c.college = null;
  const creds = (c.credentials ??= []);
  switch (kind) {
    case 'trade':
      creds.push('trade certificate');
      say(s, rng, 'life', 'school.graduate.trade', vars);
      return;
    case 'community':
      creds.push('associate degree');
      say(s, rng, 'life', 'school.graduate.community', vars);
      return;
    case 'spire':
      c.education = 'college';
      changeAttr(c, 'charm', 1);
      changeRep(c, 'fame', 5);
      tie(c, 'Spire Network');
      say(s, rng, 'life', 'school.graduate.spire', vars);
      return;
    case 'ashgrove':
      c.education = 'college';
      changeRep(c, 'fame', 3);
      tie(c, 'Ashgrove Academy');
      say(s, rng, 'life', 'school.graduate.ashgrove', vars);
      return;
    case 'state':
      c.education = 'college';
      say(s, rng, 'life', 'life.graduate-college');
  }
}

/** On each birthday, for a college student: grades, and losing a scholarship or a place for bad ones. */
export function collegeYear(s: GameState, rng: Rng, focus: Focus) {
  const c = s.character;
  const e = c.college;
  if (!e) return;
  changeGpa(c, FOCUS_GPA[focus] + (c.mind - 5) * 0.04 + rng.int(-10, 10) / 100);
  const gpa = c.gpa!;
  const vars = { school: COLLEGES[e.kind].name, gpa: gpa.toFixed(1) };
  if (gpa < 1.2) {
    c.college = null;
    say(s, rng, 'life', 'school.dismissed', vars);
  } else if (e.scholarship && e.kind !== 'ashgrove' && gpa < 3) {
    e.scholarship = false;
    say(s, rng, 'money', 'school.scholarship-lost', vars);
  }
}

/** Gives a save from before schools its school, GPA and any college in progress. */
export function ensureSchool(s: GameState) {
  const c = s.character;
  const age = ageOf(s);
  if (age >= 6 && age < 18 && c.school === undefined) {
    c.school = tied(c, 'Ashgrove Academy') ? 'ashgrove-academy' : firstSchool(c);
  }
  if (age >= 6 && c.gpa === undefined) c.gpa = startGpa(c);
  // The old college: months of study toward a 36-month degree at Harlan State.
  if (c.college === undefined) {
    c.college = age >= 18 && c.collegeMonths > 0 && c.education !== 'college' ? { kind: 'state', months: Math.round(c.collegeMonths * 4 / 3), scholarship: false } : null;
  }
}
