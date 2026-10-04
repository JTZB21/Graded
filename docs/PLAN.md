# Build plan

Full plan with diagrams and decisions: https://claude.ai/code/artifact/780a087b-7253-481e-941e-f233691a7499

## Core loop
- **Scene mode:** you act, the engine rolls Fate and World d100s against Rank, Grade and stats, the AI narrates with matched lore, the engine applies checked stat changes.
- **Time skip:** you set a focus (train, work, school, crime, family), the engine ticks aging, Grade growth, money, NPCs and rolled events, the AI summarizes, and big events pause the skip for a decision.

## Milestones
1. [x] **Lore import.** Card and lorebook converted into `src/data/` (118 entries, timeline events, narrator rules). Core rule tables in `src/engine/rules.ts` with tests.
2. [ ] **Engine without AI.** Character creation with real rolls, character sheet, year-by-year time skips with aging, Grade growth, money and random events.
3. [ ] **AI narrator.** Provider settings (NanoGPT, Claude), scene mode, lore matched by keywords, structured stat proposals validated by the engine.
   - [x] Provider interface, NanoGPT/Claude implementations, and browser-stored keys/settings screen.
   - [ ] Scene mode, lore matching, and engine-validated stat proposals.
4. [ ] **Saves and legacy.** Save slots, autosave, yearly life log, continuing as a child or heir.
5. [ ] **Polish.** Status panel and Grade Card UI, news feed, cover art and dossier styling.
