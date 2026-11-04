---
"effect": patch
---

Fix `Effect.race`, `Effect.raceFirst`, `Effect.raceAll`, `Effect.raceAllFirst` and `Effect.timeoutOption` sometimes letting a loser finish after the race settled, which could drop its result, such as an item taken from a `Queue`.
