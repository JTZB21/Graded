# GRADED

A dark, grounded superpowered life simulation for the browser. One in five thousand people has powers, every one of them is ranked, and Rank decides almost everything. You live one life, from any age, in Port Harlan and beyond.

The game started as a SillyTavern character card and lorebook (kept in `data/source/`). This app turns it into a real game: code owns the rules, dice and stats, and the game writes its own story text from the lore. No AI service or internet connection is needed.

## Run it

```sh
npm install
npm run dev        # play at http://localhost:5173
npm test           # rules engine tests
npm run build      # typecheck and production build
```

## Status

Milestones 1 to 3 are done: you can create a character in Port Harlan, live their life through time skips, and make the big choices when the game stops to ask. See [docs/PLAN.md](docs/PLAN.md) for the full plan and what comes next.
