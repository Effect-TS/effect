---
"effect": patch
---

Interrupt losers in `Effect.race`, `Effect.raceFirst`, `Effect.raceAll` and `Effect.raceAllFirst` when the race settles or is interrupted while other effects are still starting.
