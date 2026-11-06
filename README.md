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

Milestones 1 to 3 are done: you can create a character in Port Harlan, live their life through time skips, and make the big choices when the game stops to ask. Everyday life now includes wellbeing, skills, banking, debt, property, career progression, businesses, retirement and legacy play. See [the everyday-life guide](docs/EVERYDAY_LIFE.md) and [docs/PLAN.md](docs/PLAN.md).

## Android

The app is wrapped with [Capacitor](https://capacitorjs.com/) (`android/`). Every push and pull request runs the **Android APK** GitHub Action, which builds a debug APK and attaches it to the run as the `GRADED-apk` artifact. The APK is signed with a fixed debug key (`android/app/debug.keystore`) so new builds install over old ones without losing saves.

To rebuild locally with Android Studio: `npm run android:sync`, then open `android/` in Android Studio.

## Appearance

Use the Light/Dark button in the top bar, or **Settings → Appearance** for Light, Dark, or Device mode. Device mode follows your system's color scheme. The choice is stored separately from saves and remains in place when starting or loading another life. The Home dashboard links to your accounts and relationships; the Act screen has a category directory.
