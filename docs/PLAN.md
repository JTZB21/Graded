# Build plan

Full plan with diagrams and decisions: https://claude.ai/code/artifact/780a087b-7253-481e-941e-f233691a7499

## Core loop
- **Age up:** one button moves time to your next birthday (decided 2026-11-02; the 1 month / 6 months / 5 years skips were removed). You set a focus (train, work, school, crime, family), the engine ticks aging, Grade growth, money and rolled events, the in-app writer describes them from templates and lore, and big events pause the skip for a decision.
- **Actions:** between Age ups, spend the year's 6 energy on actions (study, steal and fight have optional mini games whose score nudges the odds); each one changes stats, money, reputation or legal state.
- **No AI API.** All text is written in the app and works offline (decided 2026-10-04).

## Milestones
1. [x] **Lore import.** Card and lorebook converted into `src/data/` (118 entries, timeline events, narrator rules). Core rule tables in `src/engine/rules.ts` with tests.
2. [x] **Engine without AI.** Character creation with real rolls, character sheet, and time skips (1 month to 5 years) with aging, Kindling, Grade growth, the Fade, jobs, money, crime and prison, world history, and random events that pause a skip. Balance checked by simulating 1,200 lives.
3. [x] **In-app event writer and choices.** Template-based event text (about 300 lines, era-aware, Port Harlan lore, seeded so a save always reads the same) and 8 decisions with engine-applied effects: Kindling, Aurelian, Low Kings, the Choir, Flatline threats, Rush, Ashgrove, near-death.
3b. [x] **Actions and activities.** 20 things to do each month between skips, with 3 energy a month: work out, study, rest, doctor, BIO healer, practise or push your power (Strain and Burnout), show off, patrol (licensed or rogue), extra work, job hunt, raise, quit, family, nights out, volunteering, moving district, stealing, fight clubs, crew jobs, and prison hustles. About 150 lines of district- and era-aware text.
3c. [x] **Ideas doc (2026-11-02).** Yearly Age up only, stats-then-log Home screen, money balance for children, family and friends (bonds, Talk/Call/Gift/Dinner/Visit/Give or ask for money, friends drifting, relatives dying), and three mini games.
3d. [x] **Everyday life and school (2026-11-02).** School tiers by class and neighbourhood (GPA, a placement choice at 13, a plan at 17), college and trade school (Harlan Vocational, Port Harlan CC, Harlan State, Spire University, Ashgrove's upper school) with tuition, scholarships and new jobs; a birthday milestone every year from 4 to 17; partners, marriage, children, rivals, estranged family and protégés in the People tab; 23 new choices from a schoolyard bully to a pension buyout; ordinary-life events (strikes, burst pipes, jury duty, pets, cars).
4. [x] **Saves and legacy.** Autosave, three save slots, save codes, a will, estate settlement and continuing as a living child.
5. [ ] **Polish.** Done: status panel, cover art, dossier styling, refreshed life dashboard and activity directory, persistent Light/Dark/Device appearance setting (2026-11-06). Still to do: expanded news feed and further Grade Card polish.

6. [x] **Everyday life expansion (2026-11-06).** Wellbeing and burnout, creative/technical/enterprise skills, freelance commissions, savings and investments, personal loans and credit, mortgages and home ownership, career performance/promotions/retirement, service businesses, and a Character ledger. Original mechanics informed by the categories visible in the supplied Verdant Life APK; retains the yearly loop and six energy. See `docs/EVERYDAY_LIFE.md` for rules and limitations.

- **People, Work and School** — Added context contacts, relationship filters, a job board, career reviews, and a school report card. Study groups and workplace coaching carry over into People.

7. [x] **Ladders, gear and aging (2026-11-12).** Original mechanics informed by the systems in the Manhua Life APK (no text or art taken): organisations with five ranks each (Aurelian Hero Development, the Low Kings, the Choir, Equal Ground) with standing, promotion bars, yearly stipends and perks (`src/engine/orgs.ts`); gear in four slots and six tiers, each about 1.45 times stronger (`src/engine/gear.ts`); most health falls 1 a year after 50 and 2 after 70 (never below 25), healing slows with age, and low health doubles natural death; soft caps make each point past 90% of a stat take two gains.

8. [x] **Romance, exams and family legacy (2026-11-12).** Shared annual romance caps, adult birthday proposals, annual school exams, legacy points and capped heir purchases, returning family contacts, and 34 earned titles.
