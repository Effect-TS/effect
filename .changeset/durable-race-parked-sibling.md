---
"effect": patch
---

Fix `DurableDeferred.raceAll` and `DurableDeferred.into` so a workflow branch continues after its result is recorded instead of stalling until a concurrently parked sibling is woken. The effect passed to `DurableDeferred.into` now counts as in-flight work, so a parked sibling no longer suspends the run while it runs.
