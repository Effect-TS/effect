---
"effect": patch
---

Fix `Effect.raceAll` and `Effect.raceAllFirst` not interrupting a loser that settles the race during its own first synchronous step.
