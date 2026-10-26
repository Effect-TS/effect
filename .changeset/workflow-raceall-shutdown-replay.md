---
"effect": patch
---

Replay a workflow on the next runner when shutdown interrupts an activity in a `DurableDeferred.raceAll` whose other branches are parked. Before, the run was stored as `Suspended` and never resumed.
