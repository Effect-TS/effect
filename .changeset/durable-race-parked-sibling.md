---
"effect": patch
---

Fix `DurableDeferred.raceAll` so a workflow branch continues after its race winner is recorded instead of stalling until a concurrently parked sibling is woken.
