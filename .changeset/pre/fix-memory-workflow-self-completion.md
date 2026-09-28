---
"effect": patch
---

Fix a deadlock in the memory workflow engine when a durable deferred is completed from a finalizer in the workflow awaiting it, including `DurableDeferred.into` inside `DurableDeferred.raceAll`.
