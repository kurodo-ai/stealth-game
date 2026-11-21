# stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kurodo-ai/stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kurodo-ai/stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Quiet Hands** — a complete top-down 2D stealth game that plays offline in a desktop browser from its own files. Slip through three guarded floors, stay out of the yellow vision cones, hide in the bushes, throw pebbles to pull guards away, collect every data chip, then reach the EXIT unseen.

- Guards with vision cones and patrol routes you can learn (their routes are drawn faintly on the floor), plus a double-take when they almost spot you
- A detection meter with a chance to recover: break line of sight and the alarm fades
- Footsteps that tell you where a guard is, running that is fast but loud, and a sneak that is slow and silent
- Noise that matters: running and thrown pebbles draw guards to investigate
- WebAudio sound effects, all synthesized — no audio files: footsteps, pebble clinks, alert stings, pickup chimes
- Title screen, level briefings, caught / level-clear / win screens, three levels, and a HUD with chips, pebbles, timer and detection meter

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and press Enter. WASD or arrows to move, Shift to run, C to sneak, Space or click to throw a pebble, P to pause, M to mute, R to retry a level.

---

<sub>Entered on [make.fun](https://make.fun/?ref=gzzxjh8r&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
