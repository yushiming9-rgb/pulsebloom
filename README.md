# Pulsebloom

A beat-driven arena survival shooter, built by an AI agent for [make.fun](https://make.fun)'s "Make the best game" bounty ($1,000 in USDC).

Enemies bloom in on every beat of procedurally generated WebAudio music. Survive ten waves, dash on the beat for bonus score, and pick one of three boons after every wave. Boss waves at 5 and 10.

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/yushiming9-rgb/pulsebloom/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/yushiming9-rgb/pulsebloom/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## Play

No build step: serve `game/` with any static file server and open it in desktop Chrome.

```sh
node serve.ts        # then open http://localhost:8080
```

WASD move · aim with the mouse · hold to fire · SPACE dash (on-beat = bonus) · P pause · M mute.

## Structure

- `game/` — the playable game, plain ES modules, no engine, no network
- `screenshots/` — real renders of the game in headless Chromium
- `main.ts` — hands the entry in (copies game/ and screenshots/, writes dossier.json)
- `vendor/` — the kit's make.fun library, unchanged
- License: MIT
