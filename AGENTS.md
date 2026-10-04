# Notes for AI agents working on GRADED

Read this before changing anything. It applies to every agent (Claude, Codex, others).

## What this is
A browser life-sim built from an existing SillyTavern card. The design is already written: `data/source/card.json` (`data.description` is the full rulebook) and `data/source/lorebook.json` (118 lore entries). Build on that design; do not invent a new setting or new core rules without the owner asking.

## Architecture rule: the engine owns every number
- All stats, dice, time, aging, Strain, money, reputation and legal state live in typed code under `src/engine/`.
- The AI narrator only writes prose. It may *propose* stat changes in a structured block; the engine validates and applies them.
- Never let model output set state directly.

## Decisions already made by the owner
- Standalone browser app (TypeScript, React, Vite), not a SillyTavern extension. Browser first; phone later.
- The AI narrates events and scenes. Providers: NanoGPT (OpenAI-compatible API) and the Claude API, chosen in settings with the user's own keys. Tune prompts for DeepSeek 3.2 and GLM 4.6 first. Use plain structured output, not provider-specific tool calling.
- Port Harlan (USA) is the first playable start; other cities and eras come later.
- Fame, Infamy and Street Cred each run from -100 to 100.

## Data pipeline
- `npm run import-lore` regenerates `src/data/lore.json`, `timeline.json` and `narrator.json` from `data/source/`. Never hand-edit `src/data/*.json`; change the source or the script.

## Before you push
Run `npm run build` and `npm test`; both must pass.

## Plan
`docs/PLAN.md` lists the milestones. Update its status line when you finish one.
