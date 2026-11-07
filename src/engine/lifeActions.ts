import type { ActionSpec } from './actions';
import { dollars } from './economy';
import { currentCareer, bankLot, ensureLife, homePrice, lifeOf } from './life';
import { clamp } from './rules';
import { say } from './writer/writer';

export const LIFE_ACTIONS: ActionSpec[] = [
  {
    id: 'unwind', label: 'Take time for yourself', group: 'Body and mind', cost: 1,
    when: x => x.age >= 6,
    apply: (s, rng) => { const l = ensureLife(s); l.stress = Math.max(0, l.stress - 25); l.happiness = Math.min(100, l.happiness + 10); say(s, rng, 'life', 'act.life.unwind'); },
  },
  ...(['creative', 'technical', 'enterprise'] as const).map((skill): ActionSpec => ({
    id: `learn-${skill}`, label: `Develop ${skill} skills`, group: 'School', cost: 1,
    when: x => x.age >= 12,
    blocked: x => lifeOf(x.s).skills[skill] >= 10 ? 'Skill mastered' : undefined,
    apply: (s, rng) => { const l = ensureLife(s); l.skills[skill]++; l.happiness = Math.min(100, l.happiness + 2); say(s, rng, 'life', 'act.life.learn', { skill, level: l.skills[skill] }); },
  })),
  {
    id: 'freelance', label: 'Take freelance commissions', group: 'Work', cost: 1,
    when: x => !x.imprisoned && x.age >= 16,
    blocked: x => Math.max(lifeOf(x.s).skills.creative, lifeOf(x.s).skills.technical) < 1 ? 'Learn a creative or technical skill first' : undefined,
    apply: (s, rng) => { const l = ensureLife(s); const pay = dollars(rng.int(100, 300) * Math.max(l.skills.creative, l.skills.technical), s.date.year); s.character.money += pay; l.stress = Math.min(100, l.stress + 8); say(s, rng, 'money', 'act.life.freelance', { money: pay }); },
  },
  {
    id: 'save-money', label: 'Deposit $1,000 in savings (2026 value)', group: 'Money', cost: 0, price: () => 1000,
    when: x => !x.imprisoned && x.age >= 18,
    apply: (s, rng) => { ensureLife(s).savings += bankLot(s); say(s, rng, 'money', 'act.life.deposit', { money: bankLot(s) }); },
  },
  {
    id: 'withdraw-savings', label: 'Withdraw up to $1,000 from savings (2026 value)', group: 'Money', cost: 0,
    when: x => !x.imprisoned && x.age >= 18 && lifeOf(x.s).savings > 0,
    apply: (s, rng) => { const l = ensureLife(s); const money = Math.min(l.savings, bankLot(s)); l.savings -= money; s.character.money += money; say(s, rng, 'money', 'act.life.withdraw', { money }); },
  },
  {
    id: 'invest-money', label: 'Invest $1,000 (2026 value)', group: 'Money', cost: 0, price: () => 1000,
    when: x => !x.imprisoned && x.age >= 18,
    apply: (s, rng) => { ensureLife(s).investments += bankLot(s); say(s, rng, 'money', 'act.life.invest', { money: bankLot(s) }); },
  },
  {
    id: 'sell-investments', label: 'Sell up to $1,000 of investments (2026 value)', group: 'Money', cost: 0,
    when: x => !x.imprisoned && x.age >= 18 && lifeOf(x.s).investments > 0,
    apply: (s, rng) => { const l = ensureLife(s); const money = Math.min(l.investments, bankLot(s)); l.investments -= money; s.character.money += money; say(s, rng, 'money', 'act.life.sell-investments', { money }); },
  },
  {
    id: 'personal-loan', label: 'Borrow $5,000 at 12% APR (2026 value)', group: 'Money', cost: 0,
    when: x => !x.imprisoned && x.age >= 18,
    blocked: x => lifeOf(x.s).credit < 580 ? 'Credit score below 580' : lifeOf(x.s).debt > 0 ? 'Repay your existing loan first' : lifeOf(x.s).used.loan === (x.s.turn ?? 0) ? 'One loan per turn' : undefined,
    apply: (s, rng) => { const l = ensureLife(s); const money = dollars(5000, s.date.year); l.debt = money; s.character.money += money; l.used.loan = s.turn ?? 0; say(s, rng, 'money', 'act.life.loan', { money }); },
  },
  {
    id: 'repay-loan', label: 'Repay up to $1,000 of debt (2026 value)', group: 'Money', cost: 0,
    when: x => !x.imprisoned && x.age >= 18 && lifeOf(x.s).debt > 0,
    actualPrice: x => Math.min(bankLot(x.s), lifeOf(x.s).debt),
    apply: (s, rng) => { const l = ensureLife(s); const paid = Math.min(l.debt, bankLot(s)); l.debt -= paid; l.credit = clamp(l.credit + (l.debt === 0 ? 10 : 0), 300, 850); say(s, rng, 'money', 'act.life.repay', { money: paid }); },
  },
  {
    id: 'career-development', label: 'Build your career performance', group: 'Work', cost: 1,
    when: x => !x.imprisoned && !!x.c.job,
    apply: (s, rng) => { const l = ensureLife(s); l.career = currentCareer(s); l.career.performance = Math.min(100, l.career.performance + 20); l.stress = Math.min(100, l.stress + 10); say(s, rng, 'money', 'act.life.career'); },
  },
  {
    id: 'promotion', label: 'Apply for promotion (+15% salary)', group: 'Work', cost: 1,
    when: x => !x.imprisoned && !!x.c.job,
    blocked: x => { const c = lifeOf(x.s).career; return c.jobId !== x.c.job?.id || c.experience < 12 ? 'Need 12 months in this job' : c.performance < 70 ? 'Need 70 career performance' : c.level >= 5 ? 'At the top of this career' : lifeOf(x.s).used.promotion === (x.s.turn ?? 0) ? 'Already promoted this turn' : undefined; },
    apply: (s, rng) => { const l = ensureLife(s); s.character.job!.salary = Math.round(s.character.job!.salary * 1.15); l.career.level++; l.career.performance -= 20; l.used.promotion = s.turn ?? 0; say(s, rng, 'money', 'act.life.promotion', { level: l.career.level, salary: s.character.job!.salary }); },
  },
  {
    id: 'buy-home', label: 'Buy a home: 20% down, 30-year mortgage at 5%', group: 'Money', cost: 1,
    actualPrice: x => Math.round(homePrice(x.s) * 0.2),
    when: x => !x.imprisoned && x.age >= 18 && !lifeOf(x.s).home,
    blocked: x => lifeOf(x.s).credit < 620 ? 'Need credit score 620' : !x.c.job || x.c.job.salary < homePrice(x.s) / 5 ? 'Need annual salary of at least one fifth of the home price' : undefined,
    apply: (s, rng) => { const l = ensureLife(s); const value = homePrice(s); const mortgage = Math.round(value * 0.8); const rate = 0.05 / 12; const payment = Math.ceil(mortgage * rate / (1 - (1 + rate) ** -360)); l.home = { district: s.character.district, value, mortgage, payment }; s.character.livesWithFamily = false; say(s, rng, 'money', 'act.life.home', { money: value, payment }); },
  },
  {
    id: 'sell-home', label: 'Sell your home (5% selling costs)', group: 'Money', cost: 1,
    when: x => !x.imprisoned && x.age >= 18 && !!lifeOf(x.s).home,
    apply: (s, rng) => { const l = ensureLife(s); const money = Math.round(l.home!.value * 0.95) - l.home!.mortgage; s.character.money += money; l.home = null; say(s, rng, 'money', money >= 0 ? 'act.life.sell-home' : 'act.life.sell-home-short', { money: Math.abs(money) }); },
  },
  {
    id: 'start-business', label: 'Start a service business', group: 'Money', cost: 2, price: () => 3000,
    when: x => !x.imprisoned && x.age >= 18 && !lifeOf(x.s).business,
    blocked: x => lifeOf(x.s).skills.enterprise < 2 ? 'Need enterprise skill 2' : undefined,
    apply: (s, rng) => { ensureLife(s).business = { level: 1, reputation: 40, profit: 0 }; say(s, rng, 'money', 'act.life.business'); },
  },
  {
    id: 'grow-business', label: 'Invest in your business', group: 'Money', cost: 1,
    price: x => 1000 * (lifeOf(x.s).business?.level ?? 1),
    when: x => !x.imprisoned && !!lifeOf(x.s).business,
    blocked: x => lifeOf(x.s).business!.level >= 5 ? 'Business fully expanded' : undefined,
    apply: (s, rng) => { const b = ensureLife(s).business!; b.level++; b.reputation = Math.min(100, b.reputation + 10); say(s, rng, 'money', 'act.life.expand', { level: b.level }); },
  },
  {
    id: 'close-business', label: 'Close your business', group: 'Money', cost: 0,
    when: x => !x.imprisoned && !!lifeOf(x.s).business,
    apply: (s, rng) => { ensureLife(s).business = null; say(s, rng, 'money', 'act.life.close-business'); },
  },
  {
    id: 'retire', label: 'Retire (pension: 35% of current salary)', group: 'Work', cost: 1,
    when: x => !x.imprisoned && x.age >= 65 && !!x.c.job,
    apply: (s, rng) => { const l = ensureLife(s); l.career.pension = Math.round(s.character.job!.salary * 0.35); l.career.retired = true; s.character.job = null; say(s, rng, 'money', 'act.life.retire', { salary: l.career.pension }); },
  },
];
