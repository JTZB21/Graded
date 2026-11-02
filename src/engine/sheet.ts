// The status panel and character sheet, in the card's format.

import { CATEGORIES, RANK_INFO, strainBand } from './rules';
import { COLLEGES, schoolName } from './school';
import { ageOf, notation, stageOf } from './state';
import type { GameState } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (d: { year: number; month: number }) => `${MONTHS[d.month - 1]} ${d.year}`;
const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function statusPanel(s: GameState): string {
  const c = s.character;
  const power = c.graded
    ? `${notation(c)}${c.powersGone ? ' (gone dark)' : ''} · ${c.powers.map((p) => p.description || `${p.rank} ${CATEGORIES[p.category]}`).join(', ')}`
    : c.kindleAge !== null ? 'Baseline (marker-positive)' : 'Baseline';
  const legal = c.inPrisonUntil ? `in prison until ${formatDate(c.inPrisonUntil)}` : c.record.length ? `${c.record.length} conviction${c.record.length > 1 ? 's' : ''}` : 'clean';
  return [
    `📅 ${formatDate(s.date)} | 📍 ${c.district}, ${s.city}`,
    `👤 ${c.name} · Age ${ageOf(s)} (${stageOf(s)})${c.alive ? '' : ' · deceased'}`,
    `⚡ ${power}`,
    `❤️ ${c.health}/100 | 🔥 Strain ${c.strain}% (${strainBand(c.strain)}) | 💵 ${money(c.money)}`,
    `🪪 ${c.license === 'none' ? 'no license' : `${c.license} License`} | ⚖️ ${legal}`,
    `⭐ Fame ${signed(c.fame)} | ☠️ Infamy ${signed(c.infamy)} | 🕶️ Street Cred ${signed(c.streetCred)}`,
  ].join('\n');
}

export interface SheetRow {
  label: string;
  value: string;
}

export function sheetRows(s: GameState): SheetRow[] {
  const c = s.character;
  const rows: SheetRow[] = [
    { label: 'Born', value: `${formatDate(c.born)} · ${c.gender} · ${c.background} background` },
    { label: 'Attributes', value: `Body ${c.body} · Mind ${c.mind} · Charm ${c.charm} · Nerve ${c.nerve}` },
    { label: 'Education', value: [c.education, ...(c.credentials ?? [])].join(' · ') },
    { label: 'Job', value: c.job ? `${c.job.title} (${money(c.job.salary)}/yr)` : 'none' },
    { label: 'Home', value: c.livesWithFamily ? `with family in ${c.district}` : `renting in ${c.district}` },
    { label: 'Leaning', value: c.leaning },
  ];
  const age = ageOf(s);
  if (c.school && age >= 6) {
    const where = schoolName(c, Math.min(age, 17));
    rows.splice(3, 0, { label: c.education === 'none' && age < 18 ? 'School' : 'High school', value: `${where}${c.gpa !== undefined && (c.education === 'none' || c.college) ? ` · GPA ${c.gpa.toFixed(1)}` : ''}` });
  }
  if (c.college) {
    const spec = COLLEGES[c.college.kind];
    rows.splice(4, 0, { label: 'College', value: `${spec.name} · year ${Math.floor(c.college.months / 12) + 1} of ${Math.ceil(spec.months / 12)}${c.college.scholarship ? ' · scholarship' : ''}${c.gpa !== undefined ? ` · GPA ${c.gpa.toFixed(1)}` : ''}` });
  }
  if (c.pet) rows.push({ label: 'Pet', value: `${c.pet.name}, a ${c.pet.kind}` });
  if (c.car) rows.push({ label: 'Car', value: c.car === 'beater' ? 'an old beater' : 'a reliable used car' });
  if (c.graded) {
    c.powers.forEach((p, i) =>
      rows.push({ label: i === 0 ? 'Primary power' : `Power ${i + 1}`, value: `${p.rank}-Rank ${RANK_INFO[p.rank].name}, ${p.category} (${CATEGORIES[p.category]})${p.description ? `: ${p.description}` : ''}` }),
    );
  }
  for (const r of c.record) rows.push({ label: `Record ${r.year}`, value: `${r.offense}, ${r.sentenceMonths} months` });
  return rows;
}

/** What changed between two states, as short labels ("Body +1", "$-300", "Moved to Saint Bryce"). */
export function changes(before: GameState, after: GameState): string[] {
  const a = before.character;
  const b = after.character;
  const out: string[] = [];
  const num = (label: string, x: number, y: number, unit = '') => {
    if (x !== y) out.push(`${label} ${signed(y - x)}${unit}`);
  };
  num('Body', a.body, b.body);
  num('Mind', a.mind, b.mind);
  num('Charm', a.charm, b.charm);
  num('Nerve', a.nerve, b.nerve);
  num('Health', a.health, b.health);
  num('Strain', a.strain, b.strain, '%');
  if (a.money !== b.money) out.push(`${b.money > a.money ? '+' : '-'}${money(Math.abs(b.money - a.money))}`);
  num('Fame', a.fame, b.fame);
  num('Infamy', a.infamy, b.infamy);
  num('Street Cred', a.streetCred, b.streetCred);
  if (a.grade !== b.grade && b.grade) out.push(`Grade ${b.grade}`);
  if (a.district !== b.district) out.push(`Moved to ${b.district}`);
  if (a.job?.title !== b.job?.title) out.push(b.job ? `New job: ${b.job.title}` : 'No job');
  if (a.job && b.job && a.job.title === b.job.title && a.job.salary !== b.job.salary) out.push(`Salary ${money(b.job.salary)}`);
  if (a.license !== b.license) out.push(`${b.license === 'none' ? 'No' : b.license} license`);
  if (!a.inPrisonUntil && b.inPrisonUntil) out.push(`Prison until ${formatDate(b.inPrisonUntil)}`);
  else if (a.inPrisonUntil && b.inPrisonUntil && formatDate(a.inPrisonUntil) !== formatDate(b.inPrisonUntil)) out.push(`Release moved to ${formatDate(b.inPrisonUntil)}`);
  if (a.alive && !b.alive) out.push('Dead');
  return out;
}
