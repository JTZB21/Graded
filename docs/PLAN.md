# Build plan

Full plan with diagrams and decisions: https://claude.ai/code/artifact/780a087b-7253-481e-941e-f233691a7499

## Core loop
- **Time skip:** you set a focus (train, work, school, crime, family), the engine ticks aging, Grade growth, money and rolled events, the in-app writer describes them from templates and lore, and big events pause the skip for a decision.
- **Actions:** between skips, spend the month's energy on actions; each one changes stats, money, reputation or legal state.
- **No AI API.** All text is written in the app and works offline (decided 2026-10-04).

## Milestones
1. [x] **Lore import.** Card and lorebook converted into `src/data/` (118 entries, timeline events, narrator rules). Core rule tables in `src/engine/rules.ts` with tests.
2. [x] **Engine without AI.** Character creation with real rolls, character sheet, and time skips (1 month to 5 years) with aging, Kindling, Grade growth, the Fade, jobs, money, crime and prison, world history, and random events that pause a skip. Balance checked by simulating 1,200 lives.
3. [x] **In-app event writer and choices.** Template-based event text (about 300 lines, era-aware, Port Harlan lore, seeded so a save always reads the same) and 8 decisions with engine-applied effects: Kindling, Aurelian, Low Kings, the Choir, Flatline threats, Rush, Ashgrove, near-death.
3b. [x] **Actions and activities.** 20 things to do each month between skips, with 3 energy a month: work out, study, rest, doctor, BIO healer, practise or push your power (Strain and Burnout), show off, patrol (licensed or rogue), extra work, job hunt, raise, quit, family, nights out, volunteering, moving district, stealing, fight clubs, crew jobs, and prison hustles. About 150 lines of district- and era-aware text.
4. [ ] **Saves and legacy.** Save slots, autosave, yearly life log, continuing as a child or heir.
5. [ ] **Polish.** Status panel and Grade Card UI, news feed, cover art and dossier styling.
