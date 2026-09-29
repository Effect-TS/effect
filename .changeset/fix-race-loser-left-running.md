---
"effect": patch
---

Fix `Effect.race`, `Effect.raceFirst`, `Effect.raceAll` and `Effect.raceAllFirst` leaving a losing effect running. This happened when an effect settled the race, or the racing fiber was interrupted, while later effects were still starting.
