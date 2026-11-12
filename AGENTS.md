# Notes for AI agents working on GRADED

Read this before changing anything. It applies to every agent (Claude, Codex, others).

## What this is
A browser life-sim built from an existing SillyTavern card. The design is already written: `data/source/card.json` (`data.description` is the full rulebook) and `data/source/lorebook.json` (118 lore entries). Build on that design; do not invent a new setting or new core rules without the owner asking.

## Architecture rule: the engine owns every number
- All stats, dice, time, aging, Strain, money, reputation and legal state live in typed code under `src/engine/`.
- The event writer (`src/engine/writer/`) only writes prose. It reads state and the numbers the engine already decided; it never changes state and never draws from the game's dice.
- Choices are engine code too: every option's effect lives in `src/engine/decisions.ts`.
- Time moves only by Age up (`ageUp` in `src/engine/time.ts`), which lands on the next birthday. Energy (6) is per turn, not per month.
- Actions the player takes between turns (work out, study, patrol, fight, move...) live in `src/engine/actions.ts`: each has an energy cost, an optional price, and engine-applied effects. Their text keys start with `act.`. Mini games (`src/ui/MiniGames.tsx`) only report a 0-1 score; the engine turns it into odds (`MINIGAMES` and `skill` in actions.ts).
- Organisations (a rank ladder beside power Rank, one at a time) live in `src/engine/orgs.ts` (text keys `org.`); gear tiers in `src/engine/gear.ts` (text keys `gear.`). Use `effective()` for an attribute in a roll so gear counts, `injure()` for an outside injury so armor counts, and `heal()` so health respects the age cap.
- Family and friends live in `src/engine/people.ts` (text keys `people.`). Saves live in `src/save.ts` (localStorage); add a step to `migrate()` when the save shape changes.

## Decisions already made by the owner
- Standalone browser app (TypeScript, React, Vite), not a SillyTavern extension. Browser first; phone later.
- No AI API (owner's decision, 2026-10-04, replacing the earlier NanoGPT/Claude narrator plan). The game writes its own event text from templates in `src/engine/writer/templates.ts`, filled from game state and lore, and works offline. Do not add network calls or model providers.
- Port Harlan (USA) is the first playable start; other cities and eras come later.
- Fame, Infamy and Street Cred each run from -100 to 100.

## Writing events
- Add text in `src/engine/writer/templates.ts`: one key per engine moment, several variants each, optional conditions (year, age, district, Rank, focus, ties).
- Follow the card's tone: dark, grounded, satirical, second person, present tense. Never write what the player thinks or feels. Invented people use `{npc}` names (the card's banned names are filtered out).
- A line naming an institution (Rush, Flatline, the Sump...) needs a `from` year at or after its founding (`ERA_WORDS` in `writer.ts`); `npm test` checks this.

## Data pipeline
- `npm run import-lore` regenerates `src/data/lore.json`, `timeline.json` and `narrator.json` from `data/source/`. Never hand-edit `src/data/*.json`; change the source or the script.

## Before you push
Run `npm run build` and `npm test`; both must pass.

## Plan
`docs/PLAN.md` lists the milestones. Update its status line when you finish one.

- Earned titles live in `src/engine/titles.ts` (`title.`). Legacy rewards and head starts live in `legacy.ts` (`legacy.`). Exams use `school.exam.`; incoming proposals use `people.proposal`.
